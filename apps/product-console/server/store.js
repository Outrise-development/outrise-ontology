import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import lockfile from 'proper-lockfile';
import chokidar from 'chokidar';
import YAML from 'yaml';
import {
  parseDocument, patchFields, patchMetadata, updateBlock, addBlock, removeBlock,
  moveBlock, composeTemplate, resolveFields, businessContent,
} from '../shared/protocol.js';
import { fail, StoreError } from './errors.js';
import { LocalFileStorage } from './storage.js';

const businessKinds = new Set(['brand', 'product_line', 'spu', 'sku', 'strategy', 'asset', 'listing']);
const factKinds = new Set(['brand', 'product_line', 'spu', 'sku']);
const systemKinds = new Set(['ui', 'config', 'view', 'template', 'schema', 'policy']);
const expectedParents = { product_line: 'brand', spu: 'product_line', sku: 'spu' };
const hiddenDirs = new Set(['.history', '.proposals', '.tmp', '.locks', '.git', 'node_modules']);
const mutableMetadata = new Set(['name', 'parent', 'scopes', 'tags', 'spu', 'skus', 'strategies', 'assets', 'platform', 'target', 'variant_fields']);
const defaultDemo = fileURLToPath(new URL('../demo/', import.meta.url));
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,119}$/;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

function serialize(meta, body = '') {
  return `---\n${YAML.stringify(meta, { lineWidth: 0 })}---\n${body ? `\n${body.replace(/^\n+/, '')}` : ''}`;
}

function snapshotBody(raw) {
  const longest = Math.max(3, ...[...raw.matchAll(/^(`+)/gm)].map(match => match[1].length));
  const fence = '`'.repeat(longest + 1);
  return `${fence}markdown\n${raw}\n${fence}\n`;
}

function parseEnvelope(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) fail('INVALID_INTERNAL_DOCUMENT');
  return YAML.parse(match[1]);
}

async function walk(directory, { internal = false } = {}) {
  let entries;
  try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const output = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (!internal && hiddenDirs.has(entry.name)) continue;
      output.push(...await walk(path.join(directory, entry.name), { internal }));
    } else if (entry.isFile() && entry.name.endsWith('.md')) output.push(path.join(directory, entry.name));
  }
  return output;
}

export class WorkspaceStore extends EventEmitter {
  constructor({ workspace, watch = true, demo = defaultDemo, seed = true, storage } = {}) {
    super();
    if (!workspace) fail('WORKSPACE_REQUIRED');
    this.workspace = path.resolve(workspace);
    this.storage = storage ?? new LocalFileStorage({ root: this.workspace });
    this.watchEnabled = watch;
    this.demo = demo;
    this.seed = seed;
    this.documents = new Map();
    this.diagnostics = [];
    this.confirmations = new Map();
    this.queue = Promise.resolve();
    this.closed = false;
  }

  async open() {
    await fs.mkdir(this.workspace, { recursive: true });
    if (this.seed && this.demo) await this.seedDemo(this.demo);
    await this.reload();
    if (this.watchEnabled) {
      this.watcher = chokidar.watch(this.workspace, {
        ignoreInitial: true,
        ignored: file => path.relative(this.workspace, file).split(path.sep).some(part => hiddenDirs.has(part)),
        awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 40 },
      });
      this.watcher.on('all', () => {
        clearTimeout(this.reloadTimer);
        this.reloadTimer = setTimeout(() => this.enqueue(() => this.reload()).catch(error => this.emit('diagnostic', { code: error.code ?? 'WATCH_ERROR' })), 50);
      });
      this.watcher.on('error', error => this.emit('diagnostic', { code: 'WATCH_ERROR', details: { message: error.message } }));
    }
    return this;
  }

  async close() {
    this.closed = true;
    clearTimeout(this.reloadTimer);
    await this.watcher?.close();
    await this.queue.catch(() => {});
    this.removeAllListeners();
  }

  enqueue(callback) {
    const next = this.queue.then(callback, callback);
    this.queue = next.catch(() => {});
    return next;
  }

  async seedDemo(source) {
    let entries;
    try { entries = await fs.readdir(source, { withFileTypes: true }); } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    const copy = async (from, to, entry) => {
      await this.safePath(path.relative(this.workspace, to));
      if (entry.isSymbolicLink()) return;
      if (entry.isDirectory()) {
        if (hiddenDirs.has(entry.name)) return;
        await fs.mkdir(to, { recursive: true });
        for (const child of await fs.readdir(from, { withFileTypes: true })) await copy(path.join(from, child.name), path.join(to, child.name), child);
      } else if (entry.isFile()) {
        try { await fs.copyFile(from, to, fs.constants.COPYFILE_EXCL); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      }
    };
    for (const entry of entries) await copy(path.join(source, entry.name), path.join(this.workspace, entry.name), entry);
  }

  async reload() {
    const keys = await this.storage.listDocuments();
    const previous = this.documents;
    const next = new Map();
    const candidates = new Map();
    const diagnostics = [];
    for (const relative of keys) {
      const file = await this.storage.resolve(relative);
      try {
        const { raw } = await this.storage.read(relative);
        const document = parseDocument(raw);
        if (!document.meta?.id || !idPattern.test(document.meta.id)) fail('INVALID_ID', { id: document.meta?.id });
        this.validateSystemDocument(document);
        const item = { ...document, raw, file, relative, revision: sha256(raw), diagnostics: document.diagnostics ?? [] };
        const list = candidates.get(document.meta.id) ?? [];
        list.push(item);
        candidates.set(document.meta.id, list);
      } catch (error) {
        diagnostics.push({ code: error.code ?? 'INVALID_DOCUMENT', file: relative, details: error.details ?? { message: error.message } });
        const old = [...previous.values()].find(item => item.file === file);
        if (old) next.set(old.meta.id, old);
      }
    }
    for (const [id, list] of candidates) {
      if (list.length > 1) {
        diagnostics.push({ code: 'DUPLICATE_DOCUMENT_ID', details: { id, files: list.map(item => item.relative) } });
        const old = previous.get(id);
        if (old) next.set(id, old);
      } else next.set(id, list[0]);
    }
    this.documents = next;
    this.diagnostics = diagnostics;
    this.confirmations = new Map(await Promise.all([...next.keys()].map(async id => [id, (await this.history(id))[0]])));
    const changed = [...new Set([...previous.keys(), ...next.keys()])].filter(id => previous.get(id)?.revision !== next.get(id)?.revision);
    if (changed.length || JSON.stringify(this.lastDiagnostics) !== JSON.stringify(diagnostics)) {
      this.emit('change', { ids: changed, diagnostics, at: new Date().toISOString() });
      this.lastDiagnostics = clone(diagnostics);
    }
    return { documents: next.size, diagnostics };
  }

  get(id, { includeArchived = true } = {}) {
    const document = this.documents.get(id);
    if (!document || (!includeArchived && document.meta.archived)) fail('NOT_FOUND', { id }, 404);
    return document;
  }

  publicDocument(document) {
    return { id: document.meta.id, meta: clone(document.meta), blocks: clone(document.blocks), raw: document.raw, revision: document.revision, diagnostics: clone(document.diagnostics ?? []), ...(document.meta.media?.key ? { mediaUrl: this.storage.assetUrl(document.meta.media.key) } : {}) };
  }

  summary(document) {
    const snapshot = this.confirmations.get(document.meta.id);
    const matches = snapshot?.businessHash === this.businessHash(document);
    return { id: document.meta.id, kind: document.meta.kind, name: document.meta.name ?? document.meta.id, parent: document.meta.parent, scopes: document.meta.scopes, platform: document.meta.platform, target: document.meta.target, spu: document.meta.spu, skus: document.meta.skus, archived: Boolean(document.meta.archived), revision: document.revision, review: { state: matches ? 'confirmed' : this.initialState(document.meta.kind), snapshot: snapshot?.id, confirmedAt: snapshot?.confirmedAt, changedSinceConfirmation: Boolean(snapshot && !matches) }, ...(document.meta.kind === 'asset' ? { media: clone(document.meta.media ?? {}), tags: clone(document.meta.tags ?? []), mediaUrl: document.meta.media?.key ? this.storage.assetUrl(document.meta.media.key) : undefined } : {}) };
  }

  initialState(kind) { return factKinds.has(kind) ? 'awaiting' : 'draft'; }

  list({ kind, parent, q, includeArchived = false } = {}) {
    return [...this.documents.values()].filter(document => businessKinds.has(document.meta.kind) && (includeArchived || !document.meta.archived) && (!kind || document.meta.kind === kind) && (!parent || document.meta.parent === parent) && (!q || `${document.meta.id} ${document.meta.name ?? ''}`.toLowerCase().includes(q.toLowerCase()))).map(document => this.summary(document));
  }

  bootstrap() {
    const documents = [...this.documents.values()];
    const all = kinds => documents.filter(document => kinds.includes(document.meta.kind)).map(document => this.publicDocument(document));
    const messages = Object.assign({}, ...documents.map(document => document.meta.messages ?? {}));
    const targets = documents.flatMap(document => Array.isArray(document.meta.targets) ? document.meta.targets : []);
    return { messages, views: all(['view']), templates: all(['template']), schemas: all(['schema']), policies: all(['policy']), targets, diagnostics: clone(this.diagnostics) };
  }

  businessHash(document) {
    let content = businessContent(document);
    if (document.meta.kind === 'sku') {
      const parent = this.documents.get(document.meta.parent);
      content = { own: content, inherited: parent?.meta.kind === 'spu' ? { id: parent.meta.id, businessHash: this.businessHash(parent), fields: parent.meta.fields ?? {} } : { id: document.meta.parent, missing: true } };
    }
    if (document.meta.kind === 'listing') {
      const inputs = document.meta.inputs;
      content = { own: content, provenance: inputs ? { target: inputs.target, salesTarget: inputs.salesTarget, subject: inputs.subject, sources: (inputs.sources ?? []).map(source => ({ id: source.id, businessHash: source.businessHash })).sort((a, b) => a.id.localeCompare(b.id)), assets: inputs.assets ?? [] } : null };
    }
    return sha256(JSON.stringify(stable(content)));
  }

  schema(document) {
    if (!document.meta.schema) return { meta: { fields: {} } };
    return this.get(document.meta.schema);
  }

  ancestors(document) {
    const result = [];
    const seen = new Set([document.meta.id]);
    let current = document;
    while (current.meta.parent) {
      if (seen.has(current.meta.parent)) fail('PARENT_CYCLE', { id: document.meta.id });
      seen.add(current.meta.parent);
      current = this.get(current.meta.parent);
      result.unshift(current);
    }
    return result;
  }

  effective(document) {
    const parent = document.meta.parent ? this.get(document.meta.parent) : undefined;
    return resolveFields(document, parent, this.schema(document));
  }

  async resolved(id) {
    const document = this.get(id);
    let fields = { values: document.meta.fields ?? {}, sources: {}, overrides: [] };
    const diagnostics = [...(document.diagnostics ?? [])];
    try { this.validateDocument(document); } catch (error) { diagnostics.push({ code: error.code ?? 'VALIDATION_ERROR', details: error.details }); }
    let layout = { fixed: [], regions: [], unplaced: document.blocks.map(block => ({ block, reason: 'NO_TEMPLATE' })) };
    let ancestors = [];
    try { fields = this.effective(document); } catch (error) { diagnostics.push({ code: error.code ?? 'RESOLVE_ERROR', details: error.details }); }
    try { ancestors = this.ancestors(document); } catch (error) { diagnostics.push({ code: error.code ?? 'PARENT_ERROR', details: error.details }); }
    if (document.meta.template) {
      try { layout = composeTemplate(document, this.get(document.meta.template)); } catch (error) { diagnostics.push({ code: error.code ?? 'TEMPLATE_ERROR', details: error.details }); }
    }
    const scopeIds = new Set([...ancestors.map(item => item.meta.id), id]);
    if (document.meta.kind === 'listing') {
      for (const scope of [document.meta.spu, ...(document.meta.skus ?? [])]) scopeIds.add(scope);
      const product = this.documents.get(document.meta.spu);
      if (product) for (const ancestor of this.ancestors(product)) scopeIds.add(ancestor.meta.id);
    }
    const relevant = kind => [...this.documents.values()].filter(item => item.meta.kind === kind && !item.meta.archived && ((document.meta[kind === 'asset' ? 'assets' : 'strategies'] ?? []).includes(item.meta.id) || (item.meta.scopes ?? []).some(scope => scopeIds.has(typeof scope === 'string' ? scope : scope.id))));
    const review = await this.review(document);
    return {
      document: this.publicDocument(document), revision: document.revision,
      fields: fields.values, sources: fields.sources, overrides: fields.overrides, layout,
      review, stale: document.meta.kind === 'listing' ? await this.staleness(document) : { stale: review.changedSinceConfirmation, reasons: review.changedSinceConfirmation ? [{ code: 'CONTENT_CHANGED', id }] : [] },
      diagnostics,
      related: {
        ancestors: ancestors.map(item => this.summary(item)),
        children: this.list({ parent: id }), strategies: relevant('strategy').map(item => this.summary(item)),
        assets: relevant('asset').map(item => this.summary(item)),
        listings: this.list({ kind: 'listing' }).filter(item => item.spu === id || item.skus?.includes(id)),
        proposals: await this.proposalsFor(id),
      },
    };
  }

  async safePath(relative, { mustExist = false } = {}) {
    return this.storage.resolve(relative, { mustExist });
  }

  async atomicWrite(relative, raw, options = {}) {
    return this.storage.write(relative, raw, options);
  }

  async transaction(callback) {
    return this.enqueue(async () => {
      let release;
      try {
        release = await lockfile.lock(this.workspace, { realpath: true, retries: { retries: 5, minTimeout: 50, maxTimeout: 250 }, stale: 30_000, update: 10_000 });
      } catch (error) { if (error.code === 'ELOCKED') fail('WORKSPACE_LOCKED', {}, 409); throw error; }
      try {
        await this.reload();
        return await callback();
      } finally {
        await release();
        await this.reload();
      }
    });
  }

  checkRevision(document, expectedRevision) {
    if (typeof expectedRevision !== 'string' || expectedRevision !== document.revision) fail('REVISION_CONFLICT', { id: document.meta.id, expectedRevision, currentRevision: document.revision }, 409);
  }

  assertCurrentValid(document) {
    const currentError = this.diagnostics.find(item => item.file === document.relative || item.details?.files?.includes(document.relative));
    if (currentError) fail('SOURCE_INVALID', { id: document.meta.id, diagnostic: currentError }, 409);
  }

  permission(document, actor, action, block) {
    if (systemKinds.has(document.meta.kind)) fail('SYSTEM_DOCUMENT_READONLY', { id: document.meta.id }, 403);
    if (!['human', 'agent'].includes(actor)) fail('INVALID_ACTOR', {}, 403);
    if (action === 'confirm' && actor !== 'human') fail('AGENT_CANNOT_CONFIRM', {}, 403);
    const fallback = document.meta.schema ? this.documents.get(document.meta.schema)?.meta.policy : undefined;
    const sourcePolicy = document.meta.policy ?? fallback ?? (this.documents.has('local-edit') ? 'local-edit' : undefined);
    for (const policyId of [sourcePolicy, block?.attrs?.policy].filter(Boolean)) {
      const policy = this.get(policyId);
      this.assertCurrentValid(policy);
      if (policy.meta.kind !== 'policy') fail('INVALID_POLICY', { id: policyId }, 403);
      const rules = policy.meta.actors?.[actor] ?? policy.meta[actor];
      if (!rules || rules[action] !== true) fail('SOURCE_READONLY', { id: document.meta.id, blockId: block?.id, policy: policyId, action }, 403);
    }
    if (block?.attrs?.editable === false || block?.attrs?.editable === 'false') fail('SOURCE_READONLY', { id: document.meta.id, blockId: block.id }, 403);
  }

  validateFields(document) {
    const schema = this.schema(document);
    const descriptors = schema.meta.fields ?? {};
    const own = document.meta.fields ?? {};
    if (typeof own !== 'object' || own === null || Array.isArray(own)) fail('INVALID_FIELDS');
    for (const [key, value] of Object.entries(own)) {
      const descriptor = descriptors[key];
      // Unknown fields are retained, but API writes cannot invent fields outside the schema.
      if (!descriptor) continue;
      if (value === null) { if (!descriptor.nullable) fail('FIELD_NOT_NULLABLE', { field: key }); continue; }
      const type = descriptor.type ?? 'string';
      const valid = type === 'string' ? typeof value === 'string' : type === 'number' ? typeof value === 'number' && Number.isFinite(value) : type === 'integer' ? Number.isInteger(value) : type === 'boolean' ? typeof value === 'boolean' : type === 'quantity' ? value && typeof value === 'object' && typeof value.value === 'number' && Number.isFinite(value.value) && typeof value.unit === 'string' && value.unit.length > 0 : type === 'array' ? Array.isArray(value) : type === 'object' ? value && typeof value === 'object' && !Array.isArray(value) : type === 'enum' ? (descriptor.options ?? descriptor.values ?? []).includes(value) : false;
      if (!valid) fail('INVALID_FIELD_TYPE', { field: key, type });
      if (descriptor.options && !descriptor.options.includes(value)) fail('INVALID_FIELD_OPTION', { field: key });
      if (document.meta.kind === 'sku' && descriptor.scope === 'spu') fail('SPU_FIELD_ONLY', { field: key });
      if (document.meta.kind === 'spu' && descriptor.scope === 'sku') fail('SKU_FIELD_ONLY', { field: key });
      if (document.meta.kind === 'sku' && descriptor.overridable === false && this.get(document.meta.parent).meta.fields?.[key] !== undefined) fail('FIELD_NOT_OVERRIDABLE', { field: key });
    }
  }

  validateSystemDocument(document) {
    const object = value => value && typeof value === 'object' && !Array.isArray(value);
    if (document.meta.kind === 'template') {
      if (document.meta.regions !== undefined && !object(document.meta.regions)) fail('INVALID_TEMPLATE_REGIONS');
      for (const [id, config] of Object.entries(document.meta.regions ?? {})) {
        if (!object(config) || !Array.isArray(config.allowed_types) || config.allowed_types.some(type => typeof type !== 'string')) fail('INVALID_TEMPLATE_REGION', { id });
        for (const action of ['can_add', 'can_delete', 'can_move']) if (config[action] !== undefined && typeof config[action] !== 'boolean') fail('INVALID_TEMPLATE_REGION', { id, field: action });
        if (config.max_blocks !== undefined && (!Number.isInteger(config.max_blocks) || config.max_blocks < 0)) fail('INVALID_TEMPLATE_REGION', { id, field: 'max_blocks' });
      }
    }
    if (document.meta.kind === 'schema') {
      if (!object(document.meta.fields)) fail('INVALID_SCHEMA_FIELDS');
      for (const [key, descriptor] of Object.entries(document.meta.fields)) {
        if (!object(descriptor) || !['string', 'number', 'integer', 'boolean', 'quantity', 'array', 'object', 'enum'].includes(descriptor.type)) fail('INVALID_SCHEMA_FIELD', { field: key });
        if (descriptor.scope !== undefined && !['shared', 'spu', 'sku'].includes(descriptor.scope)) fail('INVALID_SCHEMA_SCOPE', { field: key });
      }
    }
    if (document.meta.kind === 'policy') {
      if (!object(document.meta.actors)) fail('INVALID_POLICY');
      for (const [actor, rules] of Object.entries(document.meta.actors)) if (!object(rules) || Object.values(rules).some(value => typeof value !== 'boolean')) fail('INVALID_POLICY_ACTOR', { actor });
    }
    if (document.meta.messages !== undefined && (!object(document.meta.messages) || Object.values(document.meta.messages).some(value => typeof value !== 'string'))) fail('INVALID_UI_MESSAGES');
    if (document.meta.targets !== undefined) {
      if (!Array.isArray(document.meta.targets)) fail('INVALID_TARGETS');
      const ids = new Set();
      for (const target of document.meta.targets) {
        if (!object(target) || ![target.id, target.account, target.market, target.locale].every(value => typeof value === 'string' && value.trim()) || !['amazon', 'shopify', 'tiktok'].includes(target.platform) || ids.has(target.id)) fail('INVALID_TARGET', { id: target?.id });
        ids.add(target.id);
      }
    }
  }

  validateDocument(document, { confirming = false } = {}) {
    if (document.meta.format !== 'outrise/1') fail('INVALID_FORMAT');
    if (!idPattern.test(document.meta.id ?? '')) fail('INVALID_ID');
    if (!businessKinds.has(document.meta.kind)) fail('INVALID_ENTITY_KIND', { kind: document.meta.kind });
    if (typeof document.meta.name !== 'string' || !document.meta.name.trim()) fail('NAME_REQUIRED');
    for (const key of ['tags', 'scopes', 'skus', 'strategies', 'assets']) {
      if (document.meta[key] !== undefined && (!Array.isArray(document.meta[key]) || document.meta[key].some(value => typeof value !== 'string') || new Set(document.meta[key]).size !== document.meta[key].length)) fail('INVALID_REFERENCE_LIST', { field: key });
    }
    const parentKind = expectedParents[document.meta.kind];
    if (parentKind && this.get(document.meta.parent, { includeArchived: false }).meta.kind !== parentKind) fail('INVALID_PARENT', { expected: parentKind });
    this.ancestors(document);
    if (document.meta.template && this.get(document.meta.template).meta.kind !== 'template') fail('INVALID_TEMPLATE');
    if (document.meta.schema && this.get(document.meta.schema).meta.kind !== 'schema') fail('INVALID_SCHEMA');
    this.validateFields(document);
    for (const scope of document.meta.scopes ?? []) this.get(typeof scope === 'string' ? scope : scope.id, { includeArchived: false });
    for (const block of document.blocks.filter(item => item.type === 'gallery')) {
      const assets = block.content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (new Set(assets).size !== assets.length) fail('DUPLICATE_ASSET_REFERENCE', { blockId: block.id });
      for (const assetId of assets) {
        const asset = this.documents.get(assetId);
        if (!asset || asset.meta.kind !== 'asset' || asset.meta.archived) fail('INVALID_ASSET_REFERENCE', { blockId: block.id, id: assetId });
      }
    }
    if (document.meta.kind === 'listing') {
      const spu = this.get(document.meta.spu, { includeArchived: false });
      if (spu.meta.kind !== 'spu') fail('INVALID_LISTING_SPU');
      if (!Array.isArray(document.meta.skus) || !document.meta.skus.length) fail('LISTING_SKUS_REQUIRED');
      if (new Set(document.meta.skus).size !== document.meta.skus.length) fail('DUPLICATE_SKU');
      for (const id of document.meta.skus) {
        const sku = this.get(id, { includeArchived: false });
        if (sku.meta.kind !== 'sku' || sku.meta.parent !== spu.meta.id) fail('SKU_OUTSIDE_SPU', { id });
      }
      if (!['amazon', 'shopify', 'tiktok'].includes(document.meta.platform)) fail('INVALID_PLATFORM');
      const targets = this.bootstrap().targets;
      const target = targets.find(item => item.id === document.meta.target);
      if (!target || target.platform !== document.meta.platform) fail('INVALID_TARGET');
      if (![target.account, target.market, target.locale].every(value => typeof value === 'string' && value.trim())) fail('INCOMPLETE_SALES_TARGET', { target: target.id });
      const targetKey = item => JSON.stringify([item?.platform, item?.account, item?.market?.toUpperCase(), item?.locale?.toLowerCase()]);
      for (const [key, kind] of [['strategies', 'strategy'], ['assets', 'asset']]) for (const id of document.meta[key] ?? []) if (this.get(id, { includeArchived: false }).meta.kind !== kind) fail('INVALID_REFERENCE', { field: key, id });
      const duplicate = [...this.documents.values()].find(other => other.meta.id !== document.meta.id && !other.meta.archived && other.meta.kind === 'listing' && other.meta.spu === document.meta.spu && targetKey(targets.find(item => item.id === other.meta.target)) === targetKey(target));
      if (duplicate) fail('DUPLICATE_LISTING', { id: duplicate.meta.id }, 409);
      if (document.meta.variant_fields !== undefined && (!document.meta.variant_fields || typeof document.meta.variant_fields !== 'object' || Array.isArray(document.meta.variant_fields))) fail('INVALID_VARIANT_FIELDS');
      for (const [skuId, fields] of Object.entries(document.meta.variant_fields ?? {})) {
        if (!document.meta.skus.includes(skuId)) fail('VARIANT_OUTSIDE_SELECTION', { id: skuId });
        this.validateFields({ ...document, meta: { ...document.meta, fields } });
      }
    }
    if (confirming) {
      const effective = this.effective(document).values;
      for (const [key, descriptor] of Object.entries(this.schema(document).meta.fields ?? {})) {
        if (document.meta.kind !== 'sku' && descriptor.scope === 'sku') continue;
        if (document.meta.kind === 'sku' && descriptor.scope === 'spu') continue;
        if (descriptor.required && (effective[key] === undefined || effective[key] === null || effective[key] === '')) fail('REQUIRED_FIELD', { field: key });
      }
    }
  }

  async create(meta, { actor = 'human' } = {}) {
    return this.transaction(async () => {
      const id = meta.id ?? `${meta.kind}_${crypto.randomUUID()}`;
      if (this.documents.has(id)) fail('DUPLICATE_DOCUMENT_ID', { id }, 409);
      const clean = { ...clone(meta), format: 'outrise/1', id, review: { state: this.initialState(meta.kind) } };
      delete clean.inputs;
      if (!clean.policy && this.documents.has('policy_default')) clean.policy = 'policy_default';
      const document = parseDocument(serialize(clean));
      this.assertKnownFields(document, document.meta.fields ?? {});
      for (const fields of Object.values(document.meta.variant_fields ?? {})) this.assertKnownFields(document, fields);
      this.validateDocument(document);
      this.permission(document, actor, 'metadata');
      await this.atomicWrite(`entities/${id}.md`, document.raw ?? serialize(clean), { exclusive: true });
      await this.reload();
      return this.publicDocument(this.get(id));
    });
  }

  blockRegion(document, block) {
    if (!document.meta.template) fail('NO_TEMPLATE', {}, 403);
    const template = this.get(document.meta.template);
    if (template.blocks.some(item => item.id === block?.id && item.type !== 'region')) fail('FIXED_BLOCK', { blockId: block.id }, 403);
    return { template, configs: template.meta.regions ?? {} };
  }

  assertKnownFields(document, fields, original = {}) {
    const descriptors = this.schema(document).meta.fields ?? {};
    for (const [key, value] of Object.entries(fields ?? {})) if (!Object.hasOwn(descriptors, key) && (!Object.hasOwn(original, key) || JSON.stringify(value) !== JSON.stringify(original[key]))) fail('UNKNOWN_FIELD', { field: key });
  }

  validateCandidateDelta(document, candidate, actor) {
    const equal = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
    const descriptors = this.schema(document).meta.fields ?? {};
    const fieldsDelta = (before = {}, after = {}) => {
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) if (!equal(before[key], after[key])) {
        this.permission(document, actor, 'fields');
        if (!Object.hasOwn(descriptors, key)) fail('UNKNOWN_FIELD', { field: key });
        if (descriptors[key].editable === false) fail('FIELD_READONLY', { field: key }, 403);
      }
    };
    fieldsDelta(document.meta.fields, candidate.meta.fields);
    for (const sku of new Set([...Object.keys(document.meta.variant_fields ?? {}), ...Object.keys(candidate.meta.variant_fields ?? {})])) fieldsDelta(document.meta.variant_fields?.[sku], candidate.meta.variant_fields?.[sku]);
    const unknownBefore = document.blocks.filter(block => block.type === 'unknown').map(block => block.raw).sort();
    const unknownAfter = candidate.blocks.filter(block => block.type === 'unknown').map(block => block.raw).sort();
    if (!equal(unknownBefore, unknownAfter)) fail('UNKNOWN_CONTENT_READONLY', {}, 403);
    const before = new Map(document.blocks.filter(block => block.type !== 'unknown').map(block => [block.id, block]));
    const after = new Map(candidate.blocks.filter(block => block.type !== 'unknown').map(block => [block.id, block]));
    const template = document.meta.template ? this.get(document.meta.template) : undefined;
    const configs = template?.meta.regions ?? {};
    const checkNew = block => {
      this.permission(document, actor, 'blocks', block);
      const region = block.attrs?.region;
      if (template?.blocks.some(item => item.id === block.id && item.type !== 'region')) fail('FIXED_BLOCK', { blockId: block.id }, 403);
      if (!configs[region]?.can_add) fail('REGION_ADD_DENIED', { region }, 403);
      if (!configs[region].allowed_types?.includes(block.type)) fail('BLOCK_TYPE_NOT_ALLOWED', { region, type: block.type }, 403);
    };
    const checkRemove = block => {
      this.permission(document, actor, 'blocks', block);
      this.blockRegion(document, block);
      if (configs[block.attrs?.region] && !configs[block.attrs.region].can_delete) fail('REGION_DELETE_DENIED', { region: block.attrs.region }, 403);
    };
    const checkMove = (original, changed) => {
      this.permission(document, actor, 'blocks', original);
      this.blockRegion(document, original);
      const from = original.attrs?.region;
      const to = changed.attrs?.region;
      if (!configs[to]?.can_move || (configs[from] && !configs[from].can_move)) fail('REGION_MOVE_DENIED', { region: to }, 403);
      if (!configs[to].allowed_types?.includes(changed.type)) fail('BLOCK_TYPE_NOT_ALLOWED', { region: to, type: changed.type }, 403);
    };
    for (const [id, original] of before) {
      const changed = after.get(id);
      if (!changed) { checkRemove(original); continue; }
      const originalAttrs = { ...original.attrs }; delete originalAttrs.region;
      const changedAttrs = { ...changed.attrs }; delete changedAttrs.region;
      if (!equal(originalAttrs, changedAttrs)) fail('PROPOSAL_BLOCK_DEFINITION_CHANGE', { blockId: id }, 403);
      if (original.type !== changed.type) { checkRemove(original); checkNew(changed); }
      if (original.content !== changed.content) {
        this.permission(document, actor, 'blocks', original);
        if (!['richtext', 'gallery'].includes(original.type)) fail('BLOCK_CONTENT_READONLY', { blockId: id }, 403);
      }
      if (original.attrs?.region !== changed.attrs?.region) checkMove(original, changed);
    }
    for (const [id, changed] of after) if (!before.has(id)) checkNew(changed);
    for (const region of Object.keys(configs)) {
      const commonBefore = [...before.values()].filter(block => block.attrs?.region === region && after.get(block.id)?.attrs?.region === region).map(block => block.id);
      const commonAfter = [...after.values()].filter(block => block.attrs?.region === region && before.get(block.id)?.attrs?.region === region).map(block => block.id);
      if (!equal(commonBefore, commonAfter)) for (const id of commonAfter) checkMove(before.get(id), after.get(id));
      const oldCount = document.blocks.filter(block => block.attrs?.region === region).length;
      const newCount = candidate.blocks.filter(block => block.attrs?.region === region).length;
      if (newCount > oldCount && newCount > (configs[region].max_blocks ?? Infinity)) fail('REGION_CAPACITY', { region });
    }
  }

  async patch(id, body, { actor = 'human' } = {}) {
    return this.transaction(async () => {
      const document = this.get(id);
      if (document.meta.archived && body.operation !== 'archive') fail('ARCHIVED_READONLY', { id }, 403);
      this.assertCurrentValid(document);
      this.checkRevision(document, body.expectedRevision);
      let raw;
      const operation = body.operation;
      if (operation === 'fields') {
        this.permission(document, actor, 'fields');
        const descriptors = this.schema(document).meta.fields ?? {};
        for (const key of [...Object.keys(body.changes ?? {}), ...(body.unset ?? [])]) {
          if (!descriptors[key]) fail('UNKNOWN_FIELD', { field: key });
          if (descriptors[key].editable === false) fail('FIELD_READONLY', { field: key }, 403);
        }
        raw = patchFields(document.raw, body.changes ?? {}, body.unset ?? []);
      } else if (operation === 'metadata') {
        this.permission(document, actor, 'metadata');
        for (const key of Object.keys(body.changes ?? {})) if (!mutableMetadata.has(key)) fail('METADATA_READONLY', { field: key }, 403);
        for (const [skuId, fields] of Object.entries(body.changes?.variant_fields ?? {})) this.assertKnownFields(document, fields, document.meta.variant_fields?.[skuId]);
        raw = patchMetadata(document.raw, body.changes ?? {});
      } else if (operation === 'archive') {
        this.permission(document, actor, 'metadata');
        raw = patchMetadata(document.raw, { archived: true });
      } else if (operation === 'captureInputs') {
        this.permission(document, actor, 'metadata');
        if (document.meta.kind !== 'listing') fail('NOT_A_LISTING');
        raw = patchMetadata(document.raw, { inputs: await this.buildInputs(document) });
      } else {
        const block = document.blocks.find(item => item.id === body.blockId);
        this.permission(document, actor, 'blocks', block);
        if (operation === 'updateBlock') {
          if (!block) fail('BLOCK_NOT_FOUND', { id: body.blockId }, 404);
          if (!['richtext', 'gallery'].includes(block.type)) fail('BLOCK_CONTENT_READONLY', { blockId: block.id }, 403);
          raw = updateBlock(document.raw, block.id, body.content ?? '');
        } else if (operation === 'addBlock') {
          const proposed = body.block ?? {};
          const { configs, template } = this.blockRegion(document, proposed);
          const region = proposed.attrs?.region ?? body.region;
          const config = configs[region];
          if (!config?.can_add) fail('REGION_ADD_DENIED', { region }, 403);
          if (!config.allowed_types?.includes(proposed.type)) fail('BLOCK_TYPE_NOT_ALLOWED', { region, type: proposed.type }, 403);
          if (document.blocks.filter(item => item.attrs.region === region).length >= (config.max_blocks ?? Infinity)) fail('REGION_CAPACITY', { region });
          if (template.blocks.some(item => item.id === proposed.id)) fail('DUPLICATE_BLOCK_ID', { id: proposed.id });
          raw = addBlock(document.raw, { ...proposed, attrs: { ...(proposed.attrs ?? {}), region } });
        } else if (operation === 'removeBlock' || operation === 'moveBlock') {
          if (!block) fail('BLOCK_NOT_FOUND', { id: body.blockId }, 404);
          const { configs } = this.blockRegion(document, block);
          const oldRegion = block.attrs?.region;
          if (operation === 'removeBlock') {
            if (configs[oldRegion] && !configs[oldRegion].can_delete) fail('REGION_DELETE_DENIED', { region: oldRegion }, 403);
            raw = removeBlock(document.raw, block.id);
          } else {
            const region = body.region ?? oldRegion;
            if (!configs[region]?.can_move || (configs[oldRegion] && !configs[oldRegion].can_move)) fail('REGION_MOVE_DENIED', { region }, 403);
            if (!configs[region].allowed_types?.includes(block.type)) fail('BLOCK_TYPE_NOT_ALLOWED', { region, type: block.type }, 403);
            if (region !== oldRegion && document.blocks.filter(item => item.attrs.region === region).length >= (configs[region].max_blocks ?? Infinity)) fail('REGION_CAPACITY', { region });
            if (body.beforeId) {
              const before = document.blocks.find(item => item.id === body.beforeId);
              if (!before || before.attrs?.region !== region) fail('INVALID_MOVE_TARGET', { beforeId: body.beforeId });
            }
            raw = moveBlock(document.raw, block.id, { region, beforeId: body.beforeId });
          }
        } else fail('UNKNOWN_OPERATION', { operation });
      }
      let next = parseDocument(raw);
      this.validateDocument(next);
      if (this.businessHash(next) !== this.businessHash(document)) {
        raw = patchMetadata(raw, { review: { ...(document.meta.review ?? {}), state: this.initialState(document.meta.kind) } });
        next = parseDocument(raw);
      }
      await this.atomicWrite(document.relative, raw, { expectedRevision: document.revision });
      await this.reload();
      return this.publicDocument(this.get(id));
    });
  }

  async writeRaw(id, raw, expectedRevision, { actor = 'agent' } = {}) {
    return this.transaction(async () => {
      const document = this.get(id);
      this.assertCurrentValid(document);
      this.checkRevision(document, expectedRevision);
      let candidate = parseDocument(raw);
      if (candidate.meta.id !== id || candidate.meta.kind !== document.meta.kind) fail('IDENTITY_CHANGE_DENIED', { id }, 403);
      if (systemKinds.has(document.meta.kind)) this.validateSystemDocument(candidate);
      else {
        this.permission(document, actor, 'metadata');
        this.validateDocument(candidate);
        this.validateCandidateDelta(document, candidate, actor);
        const review = await this.review(document);
        raw = patchMetadata(raw, { review: { ...(document.meta.review ?? {}), state: this.businessHash(candidate) === this.businessHash(document) ? review.state : this.initialState(document.meta.kind) } });
        candidate = parseDocument(raw);
      }
      await this.atomicWrite(document.relative, raw, { expectedRevision: document.revision });
      await this.reload();
      return this.publicDocument(this.get(id));
    });
  }

  async history(id) {
    if (!idPattern.test(id)) fail('INVALID_ID');
    const files = await walk(await this.safePath(`.history/${id}`), { internal: true });
    const records = [];
    for (const file of files) {
      try {
        const raw = await fs.readFile(file, 'utf8');
        const meta = parseEnvelope(raw);
        if (meta.document === id && meta.kind === 'confirmation') records.push({ id: meta.id, confirmedAt: meta.confirmed_at, businessHash: meta.business_hash, sourceRevision: meta.source_revision, raw: meta.source_raw, inputs: meta.inputs, resolvedFields: meta.resolved_fields, sourceVersions: meta.source_versions, writtenAt: (await fs.stat(file)).mtimeMs });
      } catch { /* An invalid internal snapshot cannot confer confirmation. */ }
    }
    return records.sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt) || b.writtenAt - a.writtenAt);
  }

  async review(document) {
    const history = await this.history(document.meta.id);
    const snapshot = history[0];
    const businessHash = this.businessHash(document);
    const matches = Boolean(snapshot && snapshot.businessHash === businessHash);
    return { state: matches ? 'confirmed' : this.initialState(document.meta.kind), snapshot: snapshot?.id, confirmedAt: snapshot?.confirmedAt, businessHash, confirmedBusinessHash: snapshot?.businessHash, changedSinceConfirmation: Boolean(snapshot && !matches), hasConfirmation: Boolean(snapshot) };
  }

  async buildInputs(listing) {
    if (listing.meta.kind !== 'listing') fail('NOT_A_LISTING');
    this.validateDocument(listing);
    const ids = [...new Set([listing.meta.spu, ...(listing.meta.skus ?? []), ...(listing.meta.strategies ?? []), ...(listing.meta.assets ?? [])])];
    const sources = [];
    const assets = [];
    for (const id of ids) {
      const document = this.get(id, { includeArchived: false });
      this.assertCurrentValid(document);
      this.validateDocument(document);
      if (document.meta.schema) this.assertCurrentValid(this.get(document.meta.schema));
      const review = await this.review(document);
      sources.push({ id, kind: document.meta.kind, revision: document.revision, businessHash: this.businessHash(document), ...(review.snapshot ? { confirmedSnapshot: review.snapshot } : {}) });
      if (document.meta.kind === 'asset') {
        const media = document.meta.media;
        if (!media?.key) fail('ASSET_MEDIA_REQUIRED', { id });
        const physical = await this.safePath(media.key, { mustExist: true }).catch(() => fail('MEDIA_MISSING', { id }));
        const actualHash = sha256(await fs.readFile(physical));
        assets.push({ id, key: media.key, sha256: actualHash });
      }
    }
    const target = this.bootstrap().targets.find(item => item.id === listing.meta.target);
    return { format: 'outrise.inputs/1', target: listing.meta.target, salesTarget: { id: target.id, platform: target.platform, account: target.account, market: target.market, locale: target.locale }, subject: { spu: listing.meta.spu, skus: [...listing.meta.skus] }, sources, assets, capturedAt: new Date().toISOString() };
  }

  async staleness(listing) {
    const inputs = listing.meta.inputs;
    if (!inputs) return { stale: true, reasons: [{ code: 'INPUTS_NOT_CAPTURED' }] };
    const reasons = [];
    let current;
    try { current = await this.buildInputs(listing); } catch (error) { return { stale: true, reasons: [{ code: error.code ?? 'INPUT_INVALID', details: error.details }] }; }
    if (JSON.stringify(stable(inputs.subject)) !== JSON.stringify(stable(current.subject)) || inputs.target !== current.target) reasons.push({ code: 'LISTING_SCOPE_CHANGED' });
    if (JSON.stringify(stable(inputs.salesTarget)) !== JSON.stringify(stable(current.salesTarget))) reasons.push({ code: 'SALES_TARGET_CHANGED' });
    const oldSources = new Map((inputs.sources ?? []).map(source => [source.id, source]));
    if (oldSources.size !== current.sources.length || current.sources.some(source => !oldSources.has(source.id))) reasons.push({ code: 'SOURCE_SELECTION_CHANGED' });
    for (const source of current.sources) if (oldSources.get(source.id)?.businessHash !== source.businessHash) reasons.push({ code: 'SOURCE_CHANGED', id: source.id });
    for (const asset of current.assets) if (!(inputs.assets ?? []).some(old => old.id === asset.id && old.sha256 === asset.sha256 && old.key === asset.key)) reasons.push({ code: 'MEDIA_CHANGED', id: asset.id });
    return { stale: reasons.length > 0, reasons };
  }

  async confirm(id, expectedRevision, { actor = 'human' } = {}) {
    return this.transaction(async () => {
      const document = this.get(id, { includeArchived: false });
      this.assertCurrentValid(document);
      this.checkRevision(document, expectedRevision);
      this.permission(document, actor, 'confirm');
      if (document.meta.schema) this.assertCurrentValid(this.get(document.meta.schema));
      this.validateDocument(document, { confirming: true });
      if (document.meta.kind === 'sku' && (await this.review(this.get(document.meta.parent))).state !== 'confirmed') fail('UNCONFIRMED_SOURCE', { id: document.meta.parent });
      const confirmedInputs = document.meta.inputs ? clone(document.meta.inputs) : undefined;
      if (document.meta.kind === 'listing') {
        const stale = await this.staleness(document);
        if (stale.stale) fail('STALE_LISTING', { reasons: stale.reasons });
        for (const source of confirmedInputs.sources ?? []) {
          const current = this.get(source.id, { includeArchived: false });
          if (factKinds.has(current.meta.kind) || current.meta.kind === 'strategy') {
            this.validateDocument(current, { confirming: true });
            const sourceReview = await this.review(current);
            if (sourceReview.state !== 'confirmed') fail('UNCONFIRMED_SOURCE', { id: source.id });
            source.confirmedSnapshot = sourceReview.snapshot;
          } else delete source.confirmedSnapshot;
        }
      }
      const confirmedAt = new Date().toISOString();
      const snapshot = `confirmation_${crypto.randomUUID()}`;
      const approvedRaw = confirmedInputs ? patchMetadata(document.raw, { inputs: confirmedInputs }) : document.raw;
      const approvedDocument = parseDocument(approvedRaw);
      const businessHash = this.businessHash(approvedDocument);
      const sourceVersions = document.meta.kind === 'sku' ? [{ id: document.meta.parent, revision: this.get(document.meta.parent).revision, businessHash: this.businessHash(this.get(document.meta.parent)), confirmedSnapshot: (await this.review(this.get(document.meta.parent))).snapshot }] : confirmedInputs?.sources ?? [];
      const snapshotMeta = { format: 'outrise/1', id: snapshot, kind: 'confirmation', document: id, confirmed_at: confirmedAt, source_revision: sha256(approvedRaw), business_hash: businessHash, source_raw: approvedRaw, resolved_fields: this.effective(approvedDocument), source_versions: sourceVersions, ...(confirmedInputs ? { inputs: confirmedInputs } : {}) };
      await this.atomicWrite(`.history/${id}/${snapshot}.md`, serialize(snapshotMeta, snapshotBody(approvedRaw)), { exclusive: true });
      const raw = patchMetadata(approvedRaw, { review: { state: 'confirmed', snapshot, businessHash, confirmedAt } });
      await this.atomicWrite(document.relative, raw, { expectedRevision: document.revision });
      await this.reload();
      return { ...this.publicDocument(this.get(id)), review: await this.review(this.get(id)) };
    });
  }

  async context(id) {
    const listing = this.get(id);
    const inputs = await this.buildInputs(listing);
    const messages = this.bootstrap().messages;
    const label = key => messages[`agent.context.${key}`] ?? `agent.context.${key}`;
    const sections = [`# ${label('title')} · ${listing.meta.name}`, `Listing: ${id}`, `${label('platform')}: ${listing.meta.platform}\n${label('target')}: ${listing.meta.target}`, `## ${label('working_agreement')}\n${label('instructions')}`, `## ${label('current_listing')}\n${listing.raw}`];
    for (const source of inputs.sources) {
      const document = this.get(source.id);
      const review = await this.review(document);
      sections.push(`## ${label('source')} · ${source.kind}: ${source.id}\n${label('review')}: ${review.state}\n${label('business_hash')}: ${source.businessHash}\n${document.raw}`);
      if (source.kind === 'sku') sections.push(`### ${label('effective_fields')}\n\n${JSON.stringify(this.effective(document), null, 2)}`);
    }
    const markdown = serialize({ format: 'outrise/1', id: `context_${id}_${listing.revision.slice(0, 12)}`, kind: 'context', listing: id, base_listing_revision: listing.revision, inputs }, sections.join('\n\n'));
    return { markdown, inputs, baseRevision: listing.revision };
  }

  async propose(id, { raw, baseRevision, inputs }, { actor = 'agent' } = {}) {
    return this.transaction(async () => {
      const listing = this.get(id);
      if (listing.meta.kind !== 'listing') fail('NOT_A_LISTING');
      this.permission(listing, actor, 'metadata');
      if (typeof raw !== 'string' || raw.length > 2_000_000) fail('INVALID_PROPOSAL');
      const parsed = parseDocument(raw);
      if (parsed.meta.id !== id || parsed.meta.kind !== 'listing') fail('PROPOSAL_TARGET_MISMATCH');
      const suppliedBase = baseRevision ?? parsed.meta.base_listing_revision;
      if (typeof suppliedBase !== 'string' || !/^[a-f0-9]{64}$/.test(suppliedBase)) fail('PROPOSAL_BASE_REQUIRED');
      if (baseRevision && parsed.meta.base_listing_revision && baseRevision !== parsed.meta.base_listing_revision) fail('PROPOSAL_BASE_MISMATCH');
      const suppliedInputs = inputs ?? parsed.meta.inputs;
      if (!suppliedInputs || suppliedInputs.format !== 'outrise.inputs/1' || !suppliedInputs.subject || !Array.isArray(suppliedInputs.sources) || suppliedInputs.sources.some(source => typeof source.id !== 'string' || !/^[a-f0-9]{64}$/.test(source.businessHash ?? ''))) fail('PROPOSAL_INPUTS_REQUIRED');
      if (inputs && parsed.meta.inputs && JSON.stringify(stable(inputs)) !== JSON.stringify(stable(parsed.meta.inputs))) fail('PROPOSAL_INPUTS_MISMATCH');
      this.assertKnownFields(listing, parsed.meta.fields ?? {}, listing.meta.fields ?? {});
      for (const [skuId, fields] of Object.entries(parsed.meta.variant_fields ?? {})) this.assertKnownFields(listing, fields, listing.meta.variant_fields?.[skuId]);
      // Import copy, never accept a generated change to source identity or editing policy.
      const candidateKeys = new Set(['name', 'fields', 'variant_fields', 'review', 'inputs', 'base_listing_revision']);
      const protectedMeta = Object.fromEntries(Object.entries(listing.meta).filter(([key]) => !candidateKeys.has(key)));
      for (const key of Object.keys(parsed.meta)) if (!candidateKeys.has(key) && !Object.hasOwn(protectedMeta, key)) protectedMeta[key] = undefined;
      const safeMeta = { ...parsed.meta, ...protectedMeta, review: { state: 'draft' }, inputs: suppliedInputs };
      let candidateRaw = patchMetadata(raw, { ...protectedMeta, review: safeMeta.review, inputs: safeMeta.inputs, base_listing_revision: suppliedBase });
      this.permission(listing, actor, 'fields');
      for (const original of listing.blocks) {
        const changed = parsed.blocks.find(block => block.id === original.id);
        if (!changed || changed.content !== original.content || changed.type !== original.type) this.permission(listing, actor, 'blocks', original);
        if (changed && changed.attrs?.policy !== original.attrs?.policy) fail('PROPOSAL_POLICY_CHANGE', { blockId: original.id }, 403);
      }
      const candidate = parseDocument(candidateRaw);
      this.validateDocument(candidate);
      this.validateCandidateDelta(listing, candidate, actor);
      const proposalId = `proposal_${crypto.randomUUID()}`;
      const meta = { format: 'outrise/1', id: proposalId, kind: 'proposal', target: id, base_revision: suppliedBase, created_at: new Date().toISOString(), candidate_raw: candidateRaw, inputs: safeMeta.inputs, state: 'draft' };
      await this.atomicWrite(`.proposals/${proposalId}.md`, serialize(meta, snapshotBody(candidateRaw)), { exclusive: true });
      this.emit('change', { ids: [id], proposal: proposalId });
      return { id: proposalId, target: id, baseRevision: meta.base_revision, createdAt: meta.created_at, raw: candidateRaw, inputs: meta.inputs, state: 'draft' };
    });
  }

  async proposal(id) {
    if (!idPattern.test(id)) fail('INVALID_ID');
    let raw;
    try { raw = await fs.readFile(await this.safePath(`.proposals/${id}.md`, { mustExist: true }), 'utf8'); } catch (error) { if (error.code === 'ENOENT') fail('NOT_FOUND', { id }, 404); throw error; }
    const meta = parseEnvelope(raw);
    const target = this.get(meta.target);
    return { id, target: meta.target, baseRevision: meta.base_revision, createdAt: meta.created_at, raw: meta.candidate_raw, inputs: meta.inputs, state: meta.state, beforeRaw: target.raw, afterRaw: meta.candidate_raw, baseMatches: meta.base_revision === target.revision };
  }

  async proposalsFor(id) {
    const output = [];
    for (const file of await walk(await this.safePath('.proposals'), { internal: true })) {
      try {
        const meta = parseEnvelope(await fs.readFile(file, 'utf8'));
        if (meta.target === id) output.push({ id: meta.id, target: id, createdAt: meta.created_at, state: meta.state, baseRevision: meta.base_revision });
      } catch { /* Invalid external proposals are not imported. */ }
    }
    return output.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async adopt(id, expectedRevision, { actor = 'human' } = {}) {
    return this.transaction(async () => {
      if (actor !== 'human') fail('AGENT_CANNOT_ADOPT', {}, 403);
      const proposal = await this.proposal(id);
      const document = this.get(proposal.target);
      this.assertCurrentValid(document);
      this.checkRevision(document, expectedRevision);
      if (proposal.baseRevision !== document.revision) fail('PROPOSAL_BASE_CONFLICT', { baseRevision: proposal.baseRevision, currentRevision: document.revision }, 409);
      this.permission(document, actor, 'metadata');
      const candidate = parseDocument(proposal.raw);
      this.validateDocument(candidate);
      this.validateCandidateDelta(document, candidate, actor);
      // Keep a recoverable copy of manual work before an explicit replacement.
      await this.atomicWrite(`.history/${document.meta.id}/adoption_${crypto.randomUUID()}.md`, serialize({ format: 'outrise/1', id: `adoption_${crypto.randomUUID()}`, kind: 'adoption_backup', document: document.meta.id, source_revision: document.revision, source_raw: document.raw, created_at: new Date().toISOString() }), { exclusive: true });
      await this.atomicWrite(document.relative, proposal.raw, { expectedRevision: document.revision });
      const proposalFile = await this.safePath(`.proposals/${id}.md`, { mustExist: true });
      const envelope = parseEnvelope(await fs.readFile(proposalFile, 'utf8'));
      envelope.state = 'adopted';
      await this.atomicWrite(`.proposals/${id}.md`, serialize(envelope, snapshotBody(envelope.candidate_raw)));
      await this.reload();
      return this.publicDocument(this.get(document.meta.id));
    });
  }

  async export(id, format = 'md') {
    const document = this.get(id);
    if (document.meta.kind !== 'listing') fail('NOT_A_LISTING');
    const warning = this.bootstrap().messages['export.warning'] ?? 'export.warning';
    if (format === 'md') return patchMetadata(document.raw, { export: { publicationValidated: false, warning } });
    if (format !== 'json') fail('INVALID_EXPORT_FORMAT');
    return { id, publicationValidated: false, warning, platform: document.meta.platform, target: document.meta.target, spu: document.meta.spu, skus: document.meta.skus, fields: document.meta.fields ?? {}, variant_fields: document.meta.variant_fields ?? {}, blocks: document.blocks.map(({ id: blockId, type, attrs, content }) => ({ id: blockId, type, attrs, content })), inputs: document.meta.inputs ?? null, review: await this.review(document), stale: await this.staleness(document) };
  }

  async upload({ buffer, originalName, mime, name, scopes = [] }, { actor = 'human' } = {}) {
    return this.transaction(async () => {
      if (!Buffer.isBuffer(buffer) || !buffer.length) fail('EMPTY_FILE');
      for (const id of scopes) this.get(id, { includeArchived: false });
      const id = `asset_${crypto.randomUUID()}`;
      const extension = path.extname(originalName ?? '').toLowerCase();
      const safeExtension = /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : '.bin';
      const key = `media/${id}${safeExtension}`;
      const meta = { format: 'outrise/1', id, kind: 'asset', name: name || originalName || id, scopes, media: { key, mime: mime || 'application/octet-stream', size: buffer.length, sha256: sha256(buffer), originalName: path.basename(originalName || 'upload') }, review: { state: 'draft' }, ...(this.documents.has('policy_default') ? { policy: 'policy_default' } : {}) };
      const document = parseDocument(serialize(meta));
      this.permission(document, actor, 'metadata');
      this.validateDocument(document);
      await this.storage.writeAsset(key, buffer);
      try { await this.atomicWrite(`entities/${id}.md`, serialize(meta), { exclusive: true }); } catch (error) { await fs.unlink(await this.safePath(key)).catch(() => {}); throw error; }
      await this.reload();
      return this.publicDocument(this.get(id));
    });
  }
}

export async function openStore(options) { return new WorkspaceStore(options).open(); }
export { StoreError, sha256 };
