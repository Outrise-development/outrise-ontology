#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openStore, WorkspaceStore } from '../server/store.js';
import { parseDocument } from '../shared/protocol.js';
import { fail } from '../server/errors.js';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const kinds = new Set(['brand', 'product_line', 'spu', 'sku', 'strategy', 'asset', 'listing']);
const reservedDirectories = new Set(['.history', '.proposals', '.tmp', '.locks', '.git', 'node_modules']);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const exists = async file => fs.stat(file).then(() => true).catch(error => { if (error.code === 'ENOENT') return false; throw error; });

async function filesUnder(root, folder) {
  const files = [];
  const visit = async directory => {
    if (!(await exists(directory))) return;
    if ((await fs.lstat(directory)).isSymbolicLink()) fail('SYMLINK_DENIED', { path: directory }, 403);
    for (const entry of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) fail('SYMLINK_DENIED', { path: file }, 403);
      if (entry.isDirectory() && reservedDirectories.has(entry.name)) fail('IMPORT_RESERVED_PATH', { path: file });
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) files.push({ file, key: path.relative(root, file).split(path.sep).join('/') });
    }
  };
  await visit(path.join(root, folder));
  return files;
}

function validateNewDocument(store, document) {
  if (typeof document.meta.schema !== 'string' || !document.meta.schema) fail('INVALID_SCHEMA', { id: document.meta.id });
  if (typeof document.meta.template !== 'string' || !document.meta.template) fail('INVALID_TEMPLATE', { id: document.meta.id });
  store.validateDocument(document);
  store.assertKnownFields(document, document.meta.fields ?? {});
  for (const fields of Object.values(document.meta.variant_fields ?? {})) store.assertKnownFields(document, fields);
  store.permission(document, 'agent', 'metadata');
  if (Object.keys(document.meta.fields ?? {}).length) store.permission(document, 'agent', 'fields');
  const template = document.meta.template ? store.get(document.meta.template) : undefined;
  const regions = template?.meta.regions ?? {};
  for (const block of document.blocks) {
    // Ordinary Markdown is preserved as an explicitly read-only unknown block.
    if (block.type === 'unknown') continue;
    store.permission(document, 'agent', 'blocks', block);
    const region = block.attrs?.region;
    if (!regions[region]?.can_add) fail('REGION_ADD_DENIED', { id: document.meta.id, region }, 403);
    if (!regions[region].allowed_types?.includes(block.type)) fail('BLOCK_TYPE_NOT_ALLOWED', { id: document.meta.id, region, type: block.type }, 403);
    if (template.blocks.some(item => item.id === block.id)) fail('FIXED_BLOCK', { id: document.meta.id, blockId: block.id }, 403);
  }
  for (const [region, config] of Object.entries(regions)) {
    if (document.blocks.filter(block => block.attrs?.region === region).length > (config.max_blocks ?? Infinity)) fail('REGION_CAPACITY', { id: document.meta.id, region });
  }
}

// The hard link publishes complete bytes without replacing an existing path.
// The staged file and destination are on the same local filesystem (Windows NTFS included).
async function publishExclusive(store, key, bytes) {
  const target = await store.safePath(key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = path.join(path.dirname(target), `.import-${crypto.randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporary, bytes, { flag: 'wx' });
    await fs.link(temporary, target);
  } finally {
    await fs.unlink(temporary).catch(() => {});
  }
}

/** Import a business data pack. Existing identities and paths are never overwritten. */
export async function importWorkspace({ source, workspace = path.join(appRoot, '.local/workspace') } = {}) {
  if (!source) fail('SOURCE_REQUIRED');
  source = path.resolve(source);
  workspace = path.resolve(workspace);
  if (source === workspace) fail('SOURCE_IS_WORKSPACE');
  if (!(await exists(source))) fail('SOURCE_NOT_FOUND', { source }, 404);
  const sourceDocuments = await filesUnder(source, 'entities');
  const sourceMedia = await filesUnder(source, 'media');
  const records = [];
  const ids = new Set();
  for (const item of sourceDocuments) {
    if (!item.key.endsWith('.md')) fail('NON_MARKDOWN_ENTITY', { key: item.key });
    const raw = await fs.readFile(item.file, 'utf8');
    const document = { ...parseDocument(raw), raw, revision: hash(raw), relative: item.key };
    if (typeof document.meta.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,119}$/.test(document.meta.id)) fail('INVALID_ID', { id: document.meta.id });
    if (!kinds.has(document.meta.kind)) fail('IMPORT_BUSINESS_DOCUMENTS_ONLY', { id: document.meta.id });
    if (ids.has(document.meta.id)) fail('DUPLICATE_DOCUMENT_ID', { id: document.meta.id }, 409);
    if (document.meta.inputs !== undefined || document.meta.review !== undefined) fail('IMPORT_WORKFLOW_METADATA_DENIED', { id: document.meta.id });
    ids.add(document.meta.id);
    records.push(document);
  }
  if (!records.length) fail('EMPTY_IMPORT');
  const media = new Map(await Promise.all(sourceMedia.map(async item => [item.key, { ...item, bytes: await fs.readFile(item.file) }])));
  const store = await openStore({ workspace, watch: false, seed: false });
  try {
    return await store.transaction(async () => {
      if (store.diagnostics.length) fail('WORKSPACE_INVALID', { diagnostics: store.diagnostics });
      const added = [];
      const skipped = [];
      for (const document of records) {
        const current = store.documents.get(document.meta.id);
        if (current) {
          skipped.push({ id: document.meta.id, reason: current.revision === document.revision ? 'already_present' : 'existing_content_preserved' });
        } else {
          if (await exists(await store.safePath(document.relative))) fail('IMPORT_PATH_COLLISION', { key: document.relative }, 409);
          added.push(document);
        }
      }
      // Validate the complete proposed graph before publishing any new bytes.
      const staging = new WorkspaceStore({ workspace, watch: false, seed: false, storage: store.storage });
      staging.documents = new Map(store.documents);
      staging.diagnostics = [...store.diagnostics];
      for (const document of added) staging.documents.set(document.meta.id, document);
      for (const document of added) validateNewDocument(staging, document);

      const newMedia = [];
      const retainedMedia = [];
      for (const [key, item] of media) {
        const target = await store.safePath(key);
        if (await exists(target)) {
          if (hash(await fs.readFile(target)) !== hash(item.bytes)) fail('MEDIA_KEY_COLLISION', { key }, 409);
          retainedMedia.push(key);
        } else newMedia.push(item);
      }
      const validateMedia = async document => {
        const descriptor = document.meta.media;
        if (typeof descriptor?.key !== 'string' || !descriptor.key.startsWith('media/') || descriptor.key.includes('\\') || path.posix.normalize(descriptor.key) !== descriptor.key || typeof descriptor.mime !== 'string' || !/^[\w.+-]+\/[\w.+-]+$/.test(descriptor.mime) || !Number.isInteger(descriptor.size) || descriptor.size < 1 || !/^[a-f0-9]{64}$/.test(descriptor.sha256 ?? '')) fail('INVALID_MEDIA_DESCRIPTOR', { id: document.meta.id });
        await store.safePath(descriptor.key);
        const bytes = media.get(descriptor.key)?.bytes ?? await fs.readFile(await store.safePath(descriptor.key)).catch(error => { if (error.code === 'ENOENT') fail('MEDIA_MISSING', { id: document.meta.id, key: descriptor.key }); throw error; });
        if (bytes.length !== descriptor.size || hash(bytes) !== descriptor.sha256) fail('MEDIA_INTEGRITY_MISMATCH', { id: document.meta.id, key: descriptor.key });
      };
      // Check package descriptors even for skipped entities: a corrupted package must not import silently.
      for (const document of records.filter(item => item.meta.kind === 'asset')) await validateMedia(document);
      // Validate actual selected asset records too, including preserved existing records and gallery media.
      const referencedAssets = new Set();
      for (const document of added) {
        if (document.meta.kind === 'listing') for (const id of document.meta.assets ?? []) referencedAssets.add(id);
        for (const block of document.blocks.filter(item => item.type === 'gallery')) {
          for (const id of block.content.split(/\r?\n/).map(line => line.trim()).filter(Boolean)) referencedAssets.add(id);
        }
      }
      for (const id of referencedAssets) await validateMedia(staging.get(id));

      const written = [];
      try {
        for (const item of newMedia) {
          await publishExclusive(store, item.key, item.bytes);
          written.push({ key: item.key, hash: hash(item.bytes) });
        }
        for (const document of added) {
          const bytes = Buffer.from(document.raw, 'utf8');
          await publishExclusive(store, document.relative, bytes);
          written.push({ key: document.relative, hash: hash(bytes) });
        }
      } catch (error) {
        const rollbackRetained = [];
        for (const item of written.reverse()) {
          try {
            const file = await store.safePath(item.key);
            // Preserve any uncooperative external edit made since publication.
            if (hash(await fs.readFile(file)) !== item.hash) { rollbackRetained.push(item.key); continue; }
            await fs.unlink(file);
          } catch { rollbackRetained.push(item.key); }
        }
        error.details = { ...(error.details ?? {}), rollbackRetained };
        throw error;
      }
      return { ok: true, source, workspace, created: added.map(document => document.meta.id), skipped, mediaCreated: newMedia.map(item => item.key), mediaAlreadyPresent: retainedMedia, confirmed: false };
    });
  } finally { await store.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.includes('--help')) {
      process.stdout.write('Usage: node scripts/import-workspace.js --source examples/inuk [--workspace .local/workspace]\nImports entities/**/*.md and media/**. Existing records are preserved; workflow metadata and confirmation are not imported.\n');
    } else {
      const options = {};
      for (let index = 0; index < args.length; index += 2) {
        const key = args[index];
        if (!['--source', '--workspace'].includes(key) || !args[index + 1] || args[index + 1].startsWith('--')) fail('INVALID_ARGUMENT', { argument: key });
        options[key.slice(2)] = args[index + 1];
      }
      process.stdout.write(`${JSON.stringify(await importWorkspace(options), null, 2)}\n`);
    }
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ error: { code: error.code ?? 'IMPORT_ERROR', details: error.details ?? { message: error.message } } })}\n`);
    process.exitCode = 1;
  }
}
