#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore } from '../server/store.js';
import { resolveTemplate } from '../shared/templates.js';

const args = process.argv.slice(2);
function option(name) {
  const index = args.indexOf(`--${name}`);
  if (index < 0) return undefined;
  const value = args[index + 1];
  args.splice(index, value?.startsWith('--') ? 1 : 2);
  return value;
}
const workspace = path.resolve(option('workspace') ?? fileURLToPath(new URL('../.local/workspace/', import.meta.url)));
const bodyFile = option('file');
const expectedRevision = option('revision') ?? option('base');
const contextFile = option('context-file');
const jsonInput = option('json');
const [command = 'help', id] = args;
const parseJson = raw => JSON.parse(raw.replace(/^\uFEFF/, ''));
let store;
try {
  if (command === 'help' || command === '--help') {
    process.stdout.write('Usage: npm run agent -- <read|resolved|validate|context|patch|write|submit|template-source|template-preview|template-create|template-history|template-restore> [id] [--workspace path] [--file path] [--revision sha256]\npatch reads a JSON operation from --file or --json. write replaces an existing MD document through the cooperative lease, identity checks and CAS; template writes validate their affected graph and activate immediately. template-create/preview read Markdown from --file; template-restore reads {historyId} from --json or --file. submit reads candidate Markdown plus --context-file; --base aliases --revision. Agent actions cannot confirm content.\n');
  } else {
    store = await openStore({ workspace, watch: false });
    let result;
    if (command === 'read') result = store.publicDocument(store.get(id));
    else if (command === 'validate') {
      const validation = [...store.diagnostics];
      for (const document of store.documents.values()) {
        if (document.meta.kind === 'template') {
          try { resolveTemplate(document.meta.id, store.documents); } catch (error) { validation.push({ id: document.meta.id, code: error.code, details: error.details }); }
          continue;
        }
        if (!['brand', 'product_line', 'spu', 'sku', 'strategy', 'asset', 'listing'].includes(document.meta.kind)) continue;
        try { store.validateDocument(document); } catch (error) { validation.push({ id: document.meta.id, code: error.code, details: error.details }); }
      }
      result = { ok: validation.length === 0, documents: store.documents.size, diagnostics: validation };
      if (validation.length) process.exitCode = 1;
    } else if (command === 'resolved') result = await store.resolved(id);
    else if (command === 'template-source') result = await store.templateSource(id);
    else if (command === 'template-history') result = { data: await store.templateHistory(id) };
    else if (command === 'template-preview') result = await store.previewTemplate(id, await fs.readFile(path.resolve(bodyFile), 'utf8'), expectedRevision);
    else if (command === 'template-create') result = await store.createTemplate(await fs.readFile(path.resolve(bodyFile), 'utf8'), { actor: 'agent' });
    else if (command === 'template-restore') {
      const body = parseJson(bodyFile ? await fs.readFile(path.resolve(bodyFile), 'utf8') : jsonInput ?? '{}');
      result = await store.restoreTemplate(id, body.historyId, expectedRevision ?? body.expectedRevision, { actor: 'agent' });
    } else if (command === 'context') result = await store.context(id);
    else if (command === 'patch') {
      const body = parseJson(bodyFile ? await fs.readFile(path.resolve(bodyFile), 'utf8') : jsonInput ?? '{}');
      result = await store.patch(id, { ...body, ...(expectedRevision ? { expectedRevision } : {}) }, { actor: 'agent' });
    } else if (command === 'submit') {
      if (!bodyFile) throw Object.assign(new Error('FILE_REQUIRED'), { code: 'FILE_REQUIRED' });
      const context = contextFile ? parseJson(await fs.readFile(path.resolve(contextFile), 'utf8')) : jsonInput ? parseJson(jsonInput) : {};
      result = await store.propose(id, { raw: await fs.readFile(path.resolve(bodyFile), 'utf8'), baseRevision: expectedRevision ?? context.baseRevision, inputs: context.inputs }, { actor: 'agent' });
    } else if (command === 'write') {
      if (!bodyFile || !expectedRevision) throw Object.assign(new Error('FILE_AND_REVISION_REQUIRED'), { code: 'FILE_AND_REVISION_REQUIRED' });
      result = await store.writeRaw(id, await fs.readFile(path.resolve(bodyFile), 'utf8'), expectedRevision, { actor: 'agent' });
    } else throw Object.assign(new Error('UNKNOWN_COMMAND'), { code: 'UNKNOWN_COMMAND' });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
} catch (error) {
  process.stderr.write(`${JSON.stringify({ error: { code: error.code ?? 'CLI_ERROR', details: error.details ?? { message: error.message } } })}\n`);
  process.exitCode = 1;
} finally { await store?.close(); }
