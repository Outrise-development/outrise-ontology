import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../server/app.js';
import { patchMetadata, updateBlock } from '../shared/protocol.js';

const spuId = 'spu_commuter_demo';
const skuIds = ['sku_commuter_black', 'sku_commuter_olive', 'sku_commuter_sand'];
const strategyIds = ['strategy_brand_demo', 'strategy_commuter_demo'];
const listingId = 'listing_amazon_demo';

async function fixture(t, { watch = false } = {}) {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'outrise-console-test-'));
  const instance = await createApp({ workspace, watch });
  t.after(async () => { await instance.close(); await fs.rm(workspace, { recursive: true, force: true }); });
  return { ...instance, workspace, api: request(instance.app) };
}

async function confirm(store, id) {
  const document = store.get(id);
  return store.confirm(id, document.revision);
}

async function capture(store, id = listingId) {
  return store.patch(id, { operation: 'captureInputs', expectedRevision: store.get(id).revision });
}

test('demo bootstrap, SKU effective fields, explicit override and reset share one file-backed model', async t => {
  const { store, api } = await fixture(t);
  const bootstrap = await api.get('/api/bootstrap').expect(200);
  assert.equal(bootstrap.body.targets.length, 3);
  assert.ok(Object.keys(bootstrap.body.messages).length > 20);
  const resolved = await api.get(`/api/entities/${skuIds[0]}/resolved`).expect(200);
  assert.equal(resolved.body.fields.volume.value, 16);
  assert.equal(resolved.body.sources.material.documentId, spuId);
  const initial = store.get(skuIds[0]);
  const changed = await api.patch(`/api/documents/${skuIds[0]}`).send({ expectedRevision: initial.revision, operation: 'fields', changes: { volume: { value: 18, unit: 'L' } } }).expect(200);
  assert.equal((await store.resolved(skuIds[0])).fields.volume.value, 18);
  assert.equal(store.get(spuId).meta.fields.volume.value, 16);
  await api.patch(`/api/documents/${skuIds[0]}`).send({ expectedRevision: initial.revision, operation: 'fields', changes: { color: 'Blue' } }).expect(409);
  await api.patch(`/api/documents/${skuIds[0]}`).send({ expectedRevision: changed.body.revision, operation: 'fields', changes: { material: 'Invalid override' } }).expect(422);
  await api.patch(`/api/documents/${skuIds[0]}`).send({ expectedRevision: changed.body.revision, operation: 'fields', changes: { volume: 'not a quantity' } }).expect(422);
  await api.patch(`/api/documents/${skuIds[0]}`).send({ expectedRevision: changed.body.revision, operation: 'fields', unset: ['volume'] }).expect(200);
  assert.equal((await store.resolved(skuIds[0])).fields.volume.value, 16);
});

test('full source confirmation and Listing confirmation survive restart, preserve effective SKU evidence, then stale on business change', async t => {
  const { store, workspace } = await fixture(t);
  await assert.rejects(() => store.confirm(listingId, store.get(listingId).revision), error => error.code === 'STALE_LISTING');
  await capture(store);
  await assert.rejects(() => store.confirm(listingId, store.get(listingId).revision), error => error.code === 'UNCONFIRMED_SOURCE');
  await confirm(store, spuId);
  for (const id of skuIds) await confirm(store, id);
  for (const id of strategyIds) await confirm(store, id);
  await capture(store);
  const confirmed = await confirm(store, listingId);
  assert.equal(confirmed.review.state, 'confirmed');
  const skuSnapshot = (await store.history(skuIds[0]))[0];
  assert.equal(skuSnapshot.resolvedFields.values.volume.value, 16);
  assert.equal(skuSnapshot.sourceVersions[0].id, spuId);
  const oldListingRaw = store.get(listingId).raw;
  const historyBefore = await store.history(listingId);
  assert.equal(historyBefore.length, 1);
  assert.match(historyBefore[0].raw, /ORBIT DEMO/);
  const restarted = await createApp({ workspace, watch: false });
  t.after(() => restarted.close());
  assert.equal((await restarted.store.review(restarted.store.get(listingId))).state, 'confirmed');
  assert.equal((await restarted.store.staleness(restarted.store.get(listingId))).stale, false);
  const spu = store.get(spuId);
  await store.patch(spuId, { operation: 'fields', expectedRevision: spu.revision, changes: { weight: { value: 0.8, unit: 'kg' } } });
  assert.equal(store.get(listingId).raw, oldListingRaw);
  assert.equal((await store.staleness(store.get(listingId))).stale, true);
  assert.equal((await store.review(store.get(skuIds[0]))).state, 'awaiting');
  await assert.rejects(() => store.confirm(listingId, store.get(listingId).revision), error => error.code === 'STALE_LISTING');
  assert.equal((await store.history(listingId))[0].raw, historyBefore[0].raw);
  await confirm(store, spuId);
  for (const id of skuIds) await confirm(store, id);
  await capture(store);
  assert.equal((await store.staleness(store.get(listingId))).stale, false);
  assert.equal((await store.review(store.get(listingId))).state, 'draft', 'recapturing new inputs must not inherit historical approval');
});

test('approval cannot be forged by source metadata or imported Agent output; proposals never overwrite manual text', async t => {
  const { store, api } = await fixture(t);
  const document = store.get(spuId);
  const forged = patchMetadata(document.raw, { review: { state: 'confirmed', snapshot: 'imaginary', businessHash: store.businessHash(document) } });
  await fs.writeFile(document.file, forged);
  await store.reload();
  assert.equal((await store.review(store.get(spuId))).state, 'awaiting');
  assert.equal(store.list({ kind: 'spu' })[0].review.state, 'awaiting');
  const listing = store.get(listingId);
  const context = await store.context(listingId);
  const candidate = patchMetadata(updateBlock(listing.raw, 'description', 'Agent draft: uses supplied material.'), { review: { state: 'confirmed' }, policy: 'readonly' });
  const proposal = await api.post(`/api/listings/${listingId}/proposals`).send({ raw: candidate, baseRevision: context.baseRevision, inputs: context.inputs }).expect(201);
  assert.equal(store.get(listingId).raw, listing.raw);
  assert.doesNotMatch(proposal.body.raw, /policy: readonly/);
  assert.equal(proposal.body.state, 'draft');
  const current = await store.patch(listingId, { expectedRevision: listing.revision, operation: 'fields', changes: { title: 'Manually reviewed title' } });
  await api.post(`/api/proposals/${proposal.body.id}/adopt`).send({ expectedRevision: listing.revision }).expect(409);
  assert.equal(store.get(listingId).meta.fields.title, 'Manually reviewed title');
  const review = await api.get(`/api/proposals/${proposal.body.id}`).expect(200);
  assert.equal(review.body.baseMatches, false);
  assert.match(review.body.beforeRaw, /Manually reviewed title/);
  await api.post(`/api/proposals/${proposal.body.id}/adopt`).send({ expectedRevision: current.revision }).expect(409);
  const newContext = await store.context(listingId);
  const replacement = await store.propose(listingId, { raw: updateBlock(store.get(listingId).raw, 'description', 'A fresh draft based on the manual edit.'), baseRevision: newContext.baseRevision, inputs: newContext.inputs });
  await api.post(`/api/proposals/${replacement.id}/adopt`).send({ expectedRevision: current.revision }).expect(200);
  assert.equal((await store.review(store.get(listingId))).state, 'draft');
  await assert.rejects(() => store.confirm(spuId, store.get(spuId).revision, { actor: 'agent' }), error => error.code === 'AGENT_CANNOT_CONFIRM');
});

test('source policies and region restrictions are enforced on server; template removal retains unplaced content', async t => {
  const { store, api } = await fixture(t);
  let document = store.get(spuId);
  await api.patch(`/api/documents/${spuId}`).send({ expectedRevision: document.revision, operation: 'updateBlock', blockId: 'source-note', content: 'bypass' }).expect(403);
  await api.patch(`/api/documents/${spuId}`).send({ expectedRevision: document.revision, operation: 'addBlock', block: { id: 'extra', type: 'listing', attrs: { region: 'notes' }, content: 'wrong type' } }).expect(403);
  const added = await api.patch(`/api/documents/${spuId}`).send({ expectedRevision: document.revision, operation: 'addBlock', block: { id: 'extra', type: 'richtext', attrs: { region: 'notes', policy: 'local-edit' }, content: 'Keep this local text' } }).expect(200);
  document = store.get(spuId);
  assert.equal(added.body.blocks.some(item => item.id === 'extra'), true);
  const template = store.get('template_spu');
  await fs.writeFile(template.file, patchMetadata(template.raw, { regions: {} }));
  await store.reload();
  // The marker exists, but its region now allows no block types. Local content remains untouched.
  const resolved = await store.resolved(spuId);
  assert.ok(resolved.layout.unplaced.some(item => item.block.id === 'extra'));
  assert.match(store.get(spuId).raw, /Keep this local text/);
  await api.patch(`/api/documents/${spuId}`).send({ expectedRevision: document.revision, operation: 'addBlock', block: { id: 'another', type: 'richtext', attrs: { region: 'notes' }, content: '' } }).expect(403);
  await api.patch('/api/documents/template_spu').send({ expectedRevision: template.revision, operation: 'metadata', changes: { name: 'No' } }).expect(409);
});

test('invalid direct MD edits retain last valid render, block overwrite, and make downstream sources invalid', async t => {
  const { store, api } = await fixture(t);
  await capture(store);
  const source = store.get(spuId);
  await fs.writeFile(source.file, '---\ninvalid: [\n---\n');
  await store.reload();
  assert.equal(store.get(spuId).revision, source.revision);
  assert.ok(store.diagnostics.some(item => item.file === source.relative));
  await api.patch(`/api/documents/${spuId}`).send({ expectedRevision: source.revision, operation: 'fields', changes: { weight: { value: 1, unit: 'kg' } } }).expect(409);
  assert.equal((await store.staleness(store.get(listingId))).stale, true);
  assert.match(await fs.readFile(source.file, 'utf8'), /invalid: \[/);
  await fs.writeFile(source.file, source.raw);
  await store.reload();
  assert.equal(store.diagnostics.some(item => item.file === source.relative), false);
  await fs.unlink(source.file);
  await store.reload();
  assert.equal((await store.staleness(store.get(listingId))).stale, true);
});

test('media upload stays local, cannot expose arbitrary files, and archive never physically deletes referenced media', async t => {
  const { store, api, workspace } = await fixture(t);
  const uploaded = await api.post('/api/assets').field('name', 'Small test asset').field('scopes', JSON.stringify([spuId])).attach('file', Buffer.from('test media'), { filename: 'test.txt', contentType: 'text/plain' }).expect(201);
  const asset = uploaded.body;
  const response = await api.get(`/api/media/${asset.meta.media.key}`).expect(200);
  assert.equal(response.text, 'test media');
  await api.get('/api/media/entities/spu-commuter.md').expect(404);
  await assert.rejects(() => store.safePath('../escape.md'), error => error.code === 'INVALID_PATH');
  await store.patch(asset.id, { operation: 'archive', expectedRevision: asset.revision });
  assert.equal(await fs.readFile(path.join(workspace, asset.meta.media.key), 'utf8'), 'test media');
  await api.get(`/api/media/${asset.meta.media.key}`).expect(404);
});

test('local-only API denies cross-origin requests and protects schema, target uniqueness, and structured input', async t => {
  const { store, api } = await fixture(t);
  await api.get('/api/bootstrap').set('Origin', 'https://attacker.example').expect(403);
  await api.get('/api/bootstrap').set('Host', 'attacker.example').expect(403);
  await api.post('/api/entities').type('form').send({ kind: 'brand', name: 'CSRF' }).expect(415);
  const document = store.get(spuId);
  await api.patch(`/api/documents/${spuId}`).send({ expectedRevision: document.revision, operation: 'metadata', changes: { review: { state: 'confirmed' } } }).expect(403);
  const listing = store.get(listingId);
  await api.post('/api/entities').send({ ...listing.meta, id: 'listing_duplicate', name: 'Duplicate' }).expect(409);
  await api.patch(`/api/documents/${listingId}`).send({ expectedRevision: listing.revision, operation: 'metadata', changes: { variant_fields: { foreign_sku: { title: 'invalid' } } } }).expect(422);
  const exported = await api.get(`/api/listings/${listingId}/export?format=json`).expect(200);
  assert.equal(exported.body.publicationValidated, false);
  const markdown = await api.get(`/api/listings/${listingId}/export?format=md`).expect(200);
  assert.match(markdown.text, /publicationValidated: false/);
  assert.equal(store.get(listingId).raw, listing.raw, 'export marker is derived and does not mutate canonical content');
});

test('proposals recheck field and source placement policies, including policies tightened after draft generation', async t => {
  const { store, api } = await fixture(t);
  let listing = store.get(listingId);
  let context = await store.context(listingId);
  await api.post(`/api/listings/${listingId}/proposals`).send({ raw: listing.raw, inputs: context.inputs }).expect(422);
  const schema = store.get('schema_listing');
  const originalSchema = schema.raw;
  const acceptedRaw = patchMetadata(listing.raw, { fields: { ...listing.meta.fields, title: 'A proposed replacement title' } });
  const proposal = await store.propose(listingId, { raw: acceptedRaw, baseRevision: listing.revision, inputs: context.inputs });
  await fs.writeFile(schema.file, patchMetadata(schema.raw, { fields: { ...schema.meta.fields, title: { ...schema.meta.fields.title, editable: false } } }));
  await store.reload();
  await api.patch(`/api/documents/${listingId}`).send({ operation: 'fields', expectedRevision: listing.revision, changes: { title: 'bypass' } }).expect(403);
  await api.post(`/api/listings/${listingId}/proposals`).send({ raw: acceptedRaw, baseRevision: listing.revision, inputs: context.inputs }).expect(403);
  await api.post(`/api/proposals/${proposal.id}/adopt`).send({ expectedRevision: listing.revision }).expect(403);
  assert.equal(store.get(listingId).meta.fields.title, listing.meta.fields.title);
  await fs.writeFile(schema.file, originalSchema);
  const readonlyRaw = listing.raw.replace('policy="local-edit"', 'policy="readonly"');
  await fs.writeFile(listing.file, readonlyRaw);
  await store.reload();
  listing = store.get(listingId);
  context = await store.context(listingId);
  const relocated = listing.raw.replace('region="content"', 'region="notes"');
  await api.post(`/api/listings/${listingId}/proposals`).send({ raw: relocated, baseRevision: listing.revision, inputs: context.inputs }).expect(403);
  assert.equal(store.get(listingId).raw, readonlyRaw);
});

test('direct watcher changes arrive and malformed source is reported without replacing valid document', async t => {
  const { store } = await fixture(t, { watch: true });
  const document = store.get(spuId);
  await new Promise(resolve => setTimeout(resolve, 250));
  const event = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('watcher did not report changed document')), 5000);
    const listener = change => { if (change.ids.includes(spuId)) { clearTimeout(timer); store.off('change', listener); resolve(change); } };
    store.on('change', listener);
  });
  await fs.writeFile(document.file, patchMetadata(document.raw, { name: 'Direct Agent update' }));
  await event;
  assert.equal(store.get(spuId).meta.name, 'Direct Agent update');
});

test('safe raw write supports live configuration with identity/CAS checks and semantic last-valid template recovery', async t => {
  const { store } = await fixture(t);
  const template = store.get('template_spu');
  const changedRaw = patchMetadata(template.raw, { regions: { notes: { ...template.meta.regions.notes, can_add: false } } });
  await store.writeRaw(template.meta.id, changedRaw, template.revision);
  assert.equal((await store.resolved(spuId)).layout.regions.find(region => region.id === 'notes').config.can_add, false);
  await assert.rejects(() => store.writeRaw(template.meta.id, template.raw, template.revision), error => error.code === 'REVISION_CONFLICT');
  const current = store.get(template.meta.id);
  await assert.rejects(() => store.writeRaw(template.meta.id, patchMetadata(current.raw, { id: 'other' }), current.revision), error => error.code === 'IDENTITY_CHANGE_DENIED');
  await assert.rejects(() => store.writeRaw(template.meta.id, patchMetadata(current.raw, { regions: 'invalid' }), current.revision), error => error.code === 'INVALID_TEMPLATE_REGIONS');
  await fs.writeFile(current.file, patchMetadata(current.raw, { regions: 'invalid direct edit' }));
  await store.reload();
  assert.equal(store.get(template.meta.id).revision, current.revision);
  assert.ok(store.diagnostics.some(diagnostic => diagnostic.code === 'INVALID_TEMPLATE_REGIONS'));
});

test('independent server and CLI stores serialize writes and reject stale revision after acquiring the shared lease', async t => {
  const { store, workspace } = await fixture(t);
  const second = await createApp({ workspace, watch: false });
  t.after(() => second.close());
  const revision = store.get(spuId).revision;
  const mutations = await Promise.allSettled([
    store.patch(spuId, { operation: 'fields', expectedRevision: revision, changes: { dimensions: 'First concurrent update' } }),
    second.store.patch(spuId, { operation: 'fields', expectedRevision: revision, changes: { dimensions: 'Second concurrent update' } }, { actor: 'agent' }),
  ]);
  assert.equal(mutations.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(mutations.find(result => result.status === 'rejected').reason.code, 'REVISION_CONFLICT');
});
