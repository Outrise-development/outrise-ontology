import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import YAML from 'yaml';
import { openStore } from '../server/store.js';
import { importWorkspace } from '../scripts/import-workspace.js';

const brandId = 'brand_import_test';
const brand = { format: 'outrise/1', id: brandId, kind: 'brand', name: '真实品牌测试', schema: 'schema_basic', template: 'template_brand', policy: 'policy_default', fields: { description: '可追溯资料，待核实。' } };
const markdown = (meta, body = '') => `---\n${YAML.stringify(meta)}---\n${body}`;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'outrise-import-test-'));
  const workspace = path.join(directory, 'workspace');
  const source = path.join(directory, 'pack');
  await fs.mkdir(path.join(source, 'entities'), { recursive: true });
  await fs.mkdir(path.join(source, 'media'), { recursive: true });
  const store = await openStore({ workspace, watch: false });
  await store.close();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const write = (name, meta, body) => fs.writeFile(path.join(source, 'entities', name), markdown(meta, body));
  await write('brand.md', brand, '\n:::richtext{#origin region="notes" policy="local-edit" title="来源"}\n测试来源说明 🧭\n:::\n');
  return { workspace, source, write };
}

async function asset(fixture, { bytes = Buffer.from('actual media bytes'), ...overrides } = {}) {
  const meta = { format: 'outrise/1', id: 'asset_import_test', kind: 'asset', name: '测试素材', schema: 'schema_asset', template: 'template_asset', policy: 'policy_default', scopes: [brandId], media: { key: 'media/test.bin', mime: 'application/octet-stream', size: bytes.length, sha256: sha256(bytes), originalName: 'test.bin', ...overrides }, fields: { synthetic: false, rights: 'Local testing only' } };
  await fs.writeFile(path.join(fixture.source, 'media/test.bin'), bytes);
  await fixture.write('asset.md', meta);
  return meta;
}

test('import adds a complete graph and real media without changing fixtures; repeated import preserves later edits', async t => {
  const f = await fixture(t);
  await asset(f);
  const previous = await fs.readFile(path.join(f.workspace, 'entities/brand-orbit.md'));
  const first = await importWorkspace(f);
  assert.deepEqual(new Set(first.created), new Set([brandId, 'asset_import_test']));
  assert.deepEqual(first.mediaCreated, ['media/test.bin']);
  assert.equal(first.confirmed, false);
  assert.deepEqual(await fs.readFile(path.join(f.workspace, 'entities/brand-orbit.md')), previous);
  const repeated = await importWorkspace(f);
  assert.equal(repeated.created.length, 0);
  assert.ok(repeated.skipped.every(item => item.reason === 'already_present'));
  const store = await openStore({ workspace: f.workspace, watch: false, seed: false });
  const document = store.get(brandId);
  await store.patch(brandId, { operation: 'fields', changes: { description: '用户修改，必须保留' }, expectedRevision: document.revision });
  const changed = store.get(brandId).raw;
  assert.equal((await store.review(store.get(brandId))).state, 'awaiting');
  await store.close();
  const afterEdit = await importWorkspace(f);
  assert.equal(afterEdit.skipped.find(item => item.id === brandId).reason, 'existing_content_preserved');
  assert.equal(await fs.readFile(path.join(f.workspace, 'entities/brand.md'), 'utf8'), changed);
});

test('duplicate pack identities fail before adding documents or media', async t => {
  const f = await fixture(t);
  await f.write('duplicate.md', brand);
  await assert.rejects(() => importWorkspace(f), error => error.code === 'DUPLICATE_DOCUMENT_ID');
  await assert.rejects(() => fs.access(path.join(f.workspace, 'entities/brand.md')));
});

test('broken references fail the entire preflight including otherwise valid documents', async t => {
  const f = await fixture(t);
  await f.write('line.md', { ...brand, id: 'line_import_test', kind: 'product_line', template: 'template_product_line', parent: 'brand_missing' });
  await assert.rejects(() => importWorkspace(f), error => error.code === 'NOT_FOUND');
  await assert.rejects(() => fs.access(path.join(f.workspace, 'entities/brand.md')));
});

test('asset bytes must match their size and digest before any record is created', async t => {
  const f = await fixture(t);
  await asset(f, { sha256: '0'.repeat(64) });
  await assert.rejects(() => importWorkspace(f), error => error.code === 'MEDIA_INTEGRITY_MISMATCH');
  await assert.rejects(() => fs.access(path.join(f.workspace, 'entities/brand.md')));
  await assert.rejects(() => fs.access(path.join(f.workspace, 'media/test.bin')));
});

test('a media key collision with different bytes preserves the existing file and aborts the batch', async t => {
  const f = await fixture(t);
  await asset(f);
  const existing = Buffer.from('existing user media');
  await fs.writeFile(path.join(f.workspace, 'media/test.bin'), existing);
  await assert.rejects(() => importWorkspace(f), error => error.code === 'MEDIA_KEY_COLLISION');
  assert.deepEqual(await fs.readFile(path.join(f.workspace, 'media/test.bin')), existing);
  await assert.rejects(() => fs.access(path.join(f.workspace, 'entities/brand.md')));
});

test('import honors document, block and template creation restrictions', async t => {
  const f = await fixture(t);
  await f.write('brand.md', { ...brand, policy: 'readonly' });
  await assert.rejects(() => importWorkspace(f), error => error.code === 'SOURCE_READONLY');
  await f.write('brand.md', brand, '\n:::richtext{#origin region="notes" policy="readonly"}\nlocked\n:::\n');
  await assert.rejects(() => importWorkspace(f), error => error.code === 'SOURCE_READONLY');
  await f.write('brand.md', brand, '\n:::richtext{#origin region="missing" policy="local-edit"}\ninvalid region\n:::\n');
  await assert.rejects(() => importWorkspace(f), error => error.code === 'REGION_ADD_DENIED');
  await assert.rejects(() => fs.access(path.join(f.workspace, 'entities/brand.md')));
});

test('pack cannot self-confirm or supply an unverified captured-input manifest', async t => {
  const f = await fixture(t);
  await f.write('brand.md', { ...brand, review: { state: 'confirmed' } });
  await assert.rejects(() => importWorkspace(f), error => error.code === 'IMPORT_WORKFLOW_METADATA_DENIED');
  await f.write('brand.md', { ...brand, inputs: { sources: [] } });
  await assert.rejects(() => importWorkspace(f), error => error.code === 'IMPORT_WORKFLOW_METADATA_DENIED');
});

test('stable string IDs and actual schema/template references are required for imported records', async t => {
  const f = await fixture(t);
  await f.write('brand.md', { ...brand, id: 123 });
  await assert.rejects(() => importWorkspace(f), error => error.code === 'INVALID_ID');
  const noSchema = { ...brand }; delete noSchema.schema;
  await f.write('brand.md', noSchema);
  await assert.rejects(() => importWorkspace(f), error => error.code === 'INVALID_SCHEMA');
  const noTemplate = { ...brand }; delete noTemplate.template;
  await f.write('brand.md', noTemplate);
  await assert.rejects(() => importWorkspace(f), error => error.code === 'INVALID_TEMPLATE');
  await f.write('brand.md', { ...brand, schema: 'template_brand' });
  await assert.rejects(() => importWorkspace(f), error => error.code === 'INVALID_SCHEMA');
  await f.write('brand.md', { ...brand, template: 'schema_basic' });
  await assert.rejects(() => importWorkspace(f), error => error.code === 'INVALID_TEMPLATE');
  await assert.rejects(() => fs.access(path.join(f.workspace, 'entities/brand.md')));
});

test('a new identity cannot replace another document at its path or be hidden in a reserved directory', async t => {
  const f = await fixture(t);
  const target = path.join(f.workspace, 'entities/brand.md');
  const existing = markdown({ ...brand, id: 'brand_existing_user' });
  await fs.writeFile(target, existing, { flag: 'wx' });
  await assert.rejects(() => importWorkspace(f), error => error.code === 'IMPORT_PATH_COLLISION');
  assert.equal(await fs.readFile(target, 'utf8'), existing);
  const reserved = path.join(f.source, 'entities/.history');
  await fs.mkdir(reserved);
  await fs.rename(path.join(f.source, 'entities/brand.md'), path.join(reserved, 'brand.md'));
  await assert.rejects(() => importWorkspace(f), error => error.code === 'IMPORT_RESERVED_PATH');
});

test('a gallery reference validates existing asset bytes as well as the asset document', async t => {
  const f = await fixture(t);
  await f.write('brand.md', brand, '\n:::gallery{#images region="notes" policy="local-edit"}\nasset_shared_demo\n:::\n');
  const media = path.join(f.workspace, 'media/orbit-shared.svg');
  await fs.unlink(media);
  await assert.rejects(() => importWorkspace(f), error => error.code === 'MEDIA_MISSING');
  await fs.writeFile(media, 'corrupted bytes');
  await assert.rejects(() => importWorkspace(f), error => error.code === 'MEDIA_INTEGRITY_MISMATCH');
  await assert.rejects(() => fs.access(path.join(f.workspace, 'entities/brand.md')));
});

test('a publication failure rolls back only newly published files', async t => {
  const f = await fixture(t);
  await asset(f);
  const original = fs.link.bind(fs);
  let calls = 0;
  t.mock.method(fs, 'link', async (...args) => {
    calls += 1;
    if (calls === 2) throw Object.assign(new Error('simulated disk failure'), { code: 'EIO' });
    return original(...args);
  });
  await assert.rejects(() => importWorkspace(f), error => error.code === 'EIO' && error.details.rollbackRetained.length === 0);
  await assert.rejects(() => fs.access(path.join(f.workspace, 'media/test.bin')));
  await assert.rejects(() => fs.access(path.join(f.workspace, 'entities/brand.md')));
  await fs.access(path.join(f.workspace, 'entities/brand-orbit.md'));
});
