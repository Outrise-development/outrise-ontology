import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { parseDocument, patchMetadata, removeBlock, businessContent } from '../shared/protocol.js';
import { resolveTemplate } from '../shared/templates.js';

const md = (meta, body = '') => `---\n${YAML.stringify({ format: 'outrise/1', ...meta })}---\n${body}`;
const spu = 'spu_commuter_demo';
const listing = 'listing_amazon_demo';
const strategy = 'strategy_commuter_demo';
const baseMeta = {
  id: 'template_test_base', kind: 'template', name: 'Shared standard', applies_to: ['spu'],
  regions: { notes: { allowed_types: ['richtext', 'brief'], can_add: true, can_edit: true, can_delete: true, can_move: true } },
  sections: [{ key: 'overview', label_key: 'tabs.overview' }, { key: 'facts', label_key: 'tabs.facts' }],
  layout_permissions: { blocks: { facts: { can_hide: true, can_move: true } }, sections: { overview: { can_hide: true, can_move: true } } },
};
const baseRaw = md(baseMeta, '\n::fields{#facts}\n\n::region{#notes}\n');
const childRaw = md({ id: 'template_test_child', kind: 'template', name: 'Child standard', extends: baseMeta.id, applies_to: ['spu'], regions: { notes: { can_add: true } } });

async function fixture(t) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'outrise-workbench-'));
  const instance = await createApp({ workspace, watch: false });
  t.after(async () => { await instance.close(); await fs.rm(workspace, { recursive: true, force: true }); });
  return { ...instance, workspace, api: request(instance.app) };
}
async function templates(store) {
  await store.createTemplate(baseRaw, { actor: 'agent' });
  await store.createTemplate(childRaw, { actor: 'human' });
  const product = store.get(spu);
  await store.create({ ...product.meta, id: 'spu_template_test', name: 'Template test', template: 'template_test_child' });
  return 'spu_template_test';
}
async function patch(store, id, operation) { return store.patch(id, { expectedRevision: store.get(id).revision, ...operation }); }

test('template chains have explicit overrides, type validation and cycle detection', () => {
  const documents = new Map([baseRaw, childRaw].map(raw => { const doc = parseDocument(raw); return [doc.meta.id, doc]; }));
  assert.deepEqual(resolveTemplate('template_test_child', documents).chain.map(item => item.id), ['template_test_base', 'template_test_child']);
  documents.set('template_test_child', parseDocument(md({ id: 'template_test_child', kind: 'template', extends: 'template_test_base' }, '\n::fields{#facts}\n')));
  assert.throws(() => resolveTemplate('template_test_child', documents), error => error.code === 'TEMPLATE_EXPLICIT_OVERRIDE_REQUIRED');
  documents.set('template_test_child', parseDocument(md({ id: 'template_test_child', kind: 'template', extends: 'missing' })));
  assert.throws(() => resolveTemplate('template_test_child', documents), error => error.code === 'INVALID_TEMPLATE');
  documents.set('template_test_child', parseDocument(md({ id: 'template_test_child', kind: 'template', extends: 'template_test_child' })));
  assert.throws(() => resolveTemplate('template_test_child', documents), error => error.code === 'TEMPLATE_CYCLE');
});

test('live inherited template and instance layout preserve data, hash and old defaults', async t => {
  const { store } = await fixture(t);
  const id = await templates(store);
  await patch(store, id, { operation: 'addBlock', block: { id: 'note', type: 'richtext', attrs: { region: 'notes', policy: 'local-edit' }, content: '中文 😀\n\nPreserved text' } });
  const original = store.get(id);
  const hash = store.businessHash(original);
  await patch(store, id, { operation: 'layout', changes: { blocks: { facts: { hidden: true } }, sections: { overview: { order: 2 } } } });
  assert.equal(store.businessHash(store.get(id)), hash);
  let resolved = await store.resolved(id);
  assert.equal(resolved.layout.fixed.length, 0);
  assert.deepEqual(resolved.template.meta.sections.map(item => item.key), ['facts', 'overview']);
  const parent = store.get(baseMeta.id);
  const next = patchMetadata(parent.raw, { layout_permissions: { blocks: { facts: { can_hide: false, can_move: true } }, sections: { overview: { can_hide: true, can_move: true } } } });
  const preview = await store.previewTemplate(parent.meta.id, next, parent.revision);
  assert.ok(preview.affected.some(item => item.id === id && item.suppressed.some(issue => issue.code === 'LAYOUT_PERMISSION_DENIED')));
  await store.writeTemplate(parent.meta.id, next, parent.revision);
  resolved = await store.resolved(id);
  assert.equal(resolved.layout.fixed[0].id, 'facts');
  assert.equal(store.get(id).meta.layout_overrides.blocks.facts.hidden, true, 'suppressed local preference is preserved');
  assert.equal(store.businessHash(store.get(id)), hash);
  await assert.rejects(() => patch(store, id, { operation: 'layout', changes: { blocks: { facts: { hidden: true } } } }), error => error.status === 403);
  const current = store.get(baseMeta.id);
  await store.writeTemplate(baseMeta.id, removeBlock(current.raw, 'notes'), current.revision);
  resolved = await store.resolved(id);
  assert.equal(resolved.layout.unplaced[0].block.id, 'note');
  assert.equal(resolved.layout.unplaced[0].block.content, '中文 😀\n\nPreserved text');
});

test('parent locks constrain child template, API-style patch and raw Agent writes independently of position', async t => {
  const { store } = await fixture(t);
  const id = await templates(store);
  await patch(store, id, { operation: 'addBlock', block: { id: 'note', type: 'richtext', attrs: { region: 'notes' }, content: 'A' } });
  const parent = store.get(baseMeta.id);
  await store.writeTemplate(baseMeta.id, patchMetadata(parent.raw, { regions: { notes: { ...baseMeta.regions.notes, can_add: false, can_edit: false, can_delete: false } } }), parent.revision, { actor: 'agent' });
  const child = store.get('template_test_child');
  assert.ok(store.templateFor(store.get(id)).diagnostics.some(issue => issue.rule === 'can_add'));
  await assert.rejects(() => store.writeTemplate(child.meta.id, child.raw, child.revision), error => error.status === 403);
  await assert.rejects(() => patch(store, id, { operation: 'updateBlock', blockId: 'note', content: 'B' }), error => error.code === 'BLOCK_CONTENT_READONLY');
  await assert.rejects(() => patch(store, id, { operation: 'removeBlock', blockId: 'note' }), error => error.code === 'REGION_DELETE_DENIED');
  const document = store.get(id);
  await assert.rejects(() => store.writeRaw(id, document.raw.replace('\nA\n', '\nB\n'), document.revision), error => error.code === 'BLOCK_CONTENT_READONLY');
  await assert.rejects(() => store.writeRaw(id, patchMetadata(document.raw, { template: 'template_spu' }), document.revision), error => error.code === 'TEMPLATE_ROOT_CHANGE_DENIED');
  await patch(store, id, { operation: 'moveBlock', blockId: 'note', region: 'notes' });
});

test('template history is independent of confirmation; restore validates and creates a new audit revision', async t => {
  const { store, workspace } = await fixture(t);
  await templates(store);
  const initial = store.get(baseMeta.id);
  const beforeHistory = await store.templateHistory(baseMeta.id);
  await store.writeTemplate(baseMeta.id, patchMetadata(initial.raw, { name: 'Renamed standard' }), initial.revision);
  await assert.rejects(() => store.writeTemplate(baseMeta.id, initial.raw, initial.revision), error => error.status === 409);
  await store.restoreTemplate(baseMeta.id, beforeHistory[0].id, store.get(baseMeta.id).revision);
  assert.equal(store.get(baseMeta.id).raw, initial.raw);
  assert.equal((await store.templateHistory(baseMeta.id)).length, 3);
  assert.equal((await store.history('spu_template_test')).length, 0);
  const restarted = await createApp({ workspace, watch: false });
  t.after(() => restarted.close());
  assert.equal((await restarted.store.templateHistory(baseMeta.id)).length, 3);
  assert.equal(restarted.store.templateFor(restarted.store.get('spu_template_test')).chain.length, 2);
});

test('subtemplate section visibility and order apply, tightened parent permissions suppress them, base slots remain available', async t => {
  const { store } = await fixture(t);
  const id = await templates(store);
  let child = store.get('template_test_child');
  await store.writeTemplate(child.meta.id, patchMetadata(child.raw, { sections: [{ key: 'overview', hidden: true, order: 9 }] }), child.revision);
  let resolved = await store.resolved(id);
  assert.deepEqual(resolved.template.meta.sections.map(section => section.key), ['facts']);
  assert.equal(resolved.baseTemplate.meta.sections.find(section => section.key === 'overview').hidden, true);
  await patch(store, id, { operation: 'layout', changes: { sections: { overview: { hidden: false } } } });
  resolved = await store.resolved(id);
  assert.deepEqual(resolved.template.meta.sections.map(section => section.key), ['facts', 'overview']);
  await patch(store, id, { operation: 'layout', changes: {} });
  const parent = store.get(baseMeta.id);
  await store.writeTemplate(baseMeta.id, patchMetadata(parent.raw, { layout_permissions: { ...baseMeta.layout_permissions, sections: { overview: { can_hide: false, can_move: false } } } }), parent.revision);
  resolved = await store.resolved(id);
  assert.deepEqual(resolved.template.meta.sections.map(section => section.key), ['overview', 'facts']);
  assert.ok(resolved.templateDiagnostics.some(issue => issue.section === 'overview' && issue.rule === 'can_hide'));
  child = store.get('template_test_child');
  await assert.rejects(() => store.writeTemplate(child.meta.id, child.raw, child.revision), error => error.status === 403);
});

test('invalid external template blocks dependent writes but maintenance can repair actual source with CAS', async t => {
  const { store } = await fixture(t);
  const id = await templates(store);
  const initial = store.get(baseMeta.id);
  const badRaw = patchMetadata(initial.raw, { extends: 'missing_template' });
  await fs.writeFile(initial.file, badRaw, 'utf8');
  await store.reload();
  assert.equal(store.get(baseMeta.id).raw, initial.raw);
  await assert.rejects(() => patch(store, id, { operation: 'fields', changes: { model: 'X' } }), error => error.code === 'SOURCE_INVALID');
  const source = await store.templateSource(baseMeta.id);
  assert.equal(source.raw, badRaw);
  await assert.rejects(() => store.writeTemplate(baseMeta.id, initial.raw, initial.revision), error => error.status === 409);
  await store.writeTemplate(baseMeta.id, initial.raw, source.revision);
  assert.equal(store.diagnostics.length, 0);
  await patch(store, id, { operation: 'fields', changes: { model: 'Repaired' } });
});

test('field and block references resolve and preserve semantic IDs through writes and restart', async t => {
  const { store, workspace } = await fixture(t);
  const sourceBlock = store.get(spu).blocks.find(block => block.type === 'richtext');
  const refs = [{ id: 'capacity-proof', documentId: spu, field: 'volume', usedBy: 'capacity' }, { id: 'structure-proof', documentId: spu, blockId: sourceBlock.id }];
  const points = [{ id: 'capacity', priority: 1, feature: '16 L', advantage: 'Organized', benefit: 'Daily carry', evidence: ['capacity-proof'] }];
  await patch(store, strategy, { operation: 'metadata', changes: { refs, selling_points: points } });
  const resolved = await store.resolved(strategy);
  assert.equal(resolved.references[0].target.value.value, 16);
  assert.equal(resolved.references[1].target.content, sourceBlock.content);
  const restarted = await createApp({ workspace, watch: false });
  t.after(() => restarted.close());
  assert.deepEqual(restarted.store.get(strategy).meta.refs, refs);
  assert.deepEqual(restarted.store.get(strategy).meta.selling_points, points);
  await assert.rejects(() => patch(store, strategy, { operation: 'metadata', changes: { refs: [{ id: 'bad', documentId: spu, field: 'missing' }], selling_points: [] } }), error => error.code === 'INVALID_INTERNAL_REFERENCE');
});

test('Listing inputs collect transitive reference and source-asset dependencies; business change stales, layout does not', async t => {
  const { store } = await fixture(t);
  const sourceAsset = store.list({ kind: 'asset' })[0].id;
  const extra = await store.create({ kind: 'strategy', name: 'Evidence strategy', schema: 'schema_strategy', template: 'template_strategy', fields: {}, refs: [{ id: 'photo', documentId: sourceAsset }] });
  await patch(store, strategy, { operation: 'metadata', changes: { refs: [{ id: 'evidence', documentId: extra.id }], selling_points: [] } });
  await patch(store, listing, { operation: 'captureInputs' });
  assert.ok(store.get(listing).meta.inputs.sources.some(item => item.id === extra.id));
  assert.equal((await store.staleness(store.get(listing))).stale, false);
  const template = store.get('template_strategy');
  await store.writeTemplate(template.meta.id, patchMetadata(template.raw, { name: 'Presentation only' }), template.revision);
  assert.equal((await store.staleness(store.get(listing))).stale, false);
  await patch(store, extra.id, { operation: 'metadata', changes: { name: 'Changed evidence' } });
  assert.ok((await store.staleness(store.get(listing))).reasons.some(reason => reason.id === extra.id));
  await patch(store, extra.id, { operation: 'archive' });
  assert.equal((await store.resolved(strategy)).references[0].code, 'REFERENCE_TARGET_ARCHIVED');
  await assert.rejects(() => store.confirm(listing, store.get(listing).revision), error => error.code === 'STALE_LISTING');
});

test('reference cycles and explicit open issues block confirmation without guessing from prose', async t => {
  const { store } = await fixture(t);
  const other = 'strategy_brand_demo';
  await patch(store, strategy, { operation: 'metadata', changes: { refs: [{ id: 'brand', documentId: other }], selling_points: [] } });
  await patch(store, other, { operation: 'metadata', changes: { refs: [{ id: 'product', documentId: strategy }] } });
  await assert.rejects(() => store.buildInputs(store.get(listing)), error => error.code === 'INVALID_INTERNAL_REFERENCE' && error.details.issues.some(issue => issue.code === 'REFERENCE_CYCLE'));
  await patch(store, other, { operation: 'metadata', changes: { refs: [] } });
  await patch(store, spu, { operation: 'metadata', changes: { issues: [{ id: 'fit', code: 'SOURCE_CONFLICT', message: 'Laptop fit needs verification', status: 'open' }] } });
  await assert.rejects(() => store.confirm(spu, store.get(spu).revision), error => error.code === 'OPEN_BUSINESS_ISSUES');
  await patch(store, spu, { operation: 'metadata', changes: { issues: [{ id: 'fit', code: 'SOURCE_CONFLICT', message: 'Verified', status: 'resolved' }] } });
  await store.confirm(spu, store.get(spu).revision);
});

test('a strategy reference to another product SKU collects inherited SPU evidence transitively', async t => {
  const { store } = await fixture(t);
  const evidence = await store.create({ kind: 'strategy', name: 'Remote specification evidence', schema: 'schema_strategy', template: 'template_strategy', fields: {} });
  const otherSpu = await store.create({ ...store.get(spu).meta, id: 'spu_reference_other', name: 'Other product', fields: { ...store.get(spu).meta.fields, volume: { value: 22, unit: 'L' } }, refs: [{ id: 'spec-evidence', documentId: evidence.id }] });
  const otherSku = await store.create({ ...store.get('sku_commuter_black').meta, id: 'sku_reference_other', name: 'Other product black', parent: otherSpu.id });
  await patch(store, strategy, { operation: 'metadata', changes: { selling_points: [], refs: [{ id: 'other-capacity', documentId: otherSku.id, field: 'volume' }] } });
  const referenced = (await store.resolved(strategy)).references[0];
  assert.equal(referenced.target.origin.documentId, otherSpu.id);
  assert.equal(referenced.target.value.value, 22);
  await patch(store, listing, { operation: 'captureInputs' });
  const ids = store.get(listing).meta.inputs.sources.map(source => source.id);
  for (const id of [otherSku.id, otherSpu.id, evidence.id]) assert.ok(ids.includes(id), `missing transitive source ${id}`);
  assert.equal((await store.staleness(store.get(listing))).stale, false);
  await patch(store, evidence.id, { operation: 'metadata', changes: { name: 'Changed upstream evidence' } });
  assert.ok((await store.staleness(store.get(listing))).reasons.some(reason => reason.id === evidence.id));
});

test('child policy replacement cannot relax inherited readonly fields; rebinding and unknown sections are rejected', async t => {
  const { store } = await fixture(t);
  await store.createTemplate(md(baseMeta, '\n::fields{#facts policy="readonly" bind="fields"}\n\n::region{#notes}\n'));
  await store.createTemplate(md({ id: 'template_test_child', kind: 'template', name: 'Child', extends: baseMeta.id, overrides: { facts: { attrs: { policy: 'local-edit' } } } }));
  const product = await store.create({ ...store.get(spu).meta, id: 'spu_policy_test', name: 'Policy test', template: 'template_test_child' });
  await assert.rejects(() => patch(store, product.id, { operation: 'fields', changes: { model: 'Must not write' } }), error => error.code === 'SOURCE_READONLY');
  const current = store.get(product.id);
  await assert.rejects(() => store.writeRaw(product.id, patchMetadata(current.raw, { fields: { ...current.meta.fields, model: 'Must not write' } }), current.revision), error => error.code === 'SOURCE_READONLY');
  const child = store.get('template_test_child');
  await assert.rejects(() => store.writeTemplate(child.meta.id, patchMetadata(child.raw, { overrides: { facts: { attrs: { bind: 'fields.volume' } } } }), child.revision), error => error.code === 'TEMPLATE_PERMISSION_DENIED');
  await assert.rejects(() => store.writeTemplate(child.meta.id, patchMetadata(child.raw, { sections: [{ key: 'facts', component: 'assets' }] }), child.revision), error => error.code === 'TEMPLATE_PERMISSION_DENIED');
  const base = store.get(baseMeta.id);
  const invalid = patchMetadata(base.raw, { sections: [{ key: 'overview', component: 'unsupported_custom_javascript' }] });
  await assert.rejects(() => store.writeTemplate(base.meta.id, invalid, base.revision), error => error.code === 'INVALID_TEMPLATE_SECTION_COMPONENT');
  await fs.writeFile(base.file, invalid);
  await store.reload();
  assert.equal(store.get(base.meta.id).raw, base.raw, 'invalid external section keeps last valid layout');
  assert.ok(store.diagnostics.some(issue => issue.code === 'INVALID_TEMPLATE_SECTION_COMPONENT'));
});

test('template API previews impact, creates descendants, saves with CAS and exposes repair source', async t => {
  const { store, api } = await fixture(t);
  await api.post('/api/templates').send({ raw: baseRaw }).expect(201);
  const current = store.get(baseMeta.id);
  const raw = patchMetadata(current.raw, { name: 'API updated' });
  const preview = await api.post(`/api/templates/${baseMeta.id}/preview`).send({ raw, expectedRevision: current.revision }).expect(200);
  assert.ok(Array.isArray(preview.body.affected));
  await api.put(`/api/templates/${baseMeta.id}`).send({ raw, expectedRevision: current.revision }).expect(200);
  await api.put(`/api/templates/${baseMeta.id}`).send({ raw, expectedRevision: current.revision }).expect(409);
  const source = await api.get(`/api/templates/${baseMeta.id}/source`).expect(200);
  assert.equal(source.body.raw, raw);
  const history = await api.get(`/api/templates/${baseMeta.id}/history`).expect(200);
  assert.equal(history.body.data.length, 2);
});

test('layout metadata does not alter semantic content while selling point priority does', () => {
  const doc = parseDocument(md({ id: 'strategy_x', kind: 'strategy', selling_points: [{ id: 'x', priority: 1 }] }));
  assert.deepEqual(businessContent(doc), businessContent(parseDocument(patchMetadata(doc.raw, { layout_overrides: { sections: { facts: { hidden: true } } } }))));
  assert.notDeepEqual(businessContent(doc), businessContent(parseDocument(patchMetadata(doc.raw, { selling_points: [{ id: 'x', priority: 2 }] }))));
});
