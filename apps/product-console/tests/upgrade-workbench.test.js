import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { mergeUpgrade, upgradeWorkbench } from '../scripts/upgrade-workbench.js';
import { openStore } from '../server/store.js';
import { parseDocument, patchMetadata, patchFields } from '../shared/protocol.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const baseline = key => fs.readFile(path.join(root, 'migrations/workbench-v2/baseline', key), 'utf8');

test('upgrade three-way merge preserves custom labels, unknown metadata and prose', async () => {
  const before = await baseline('ui/zh-CN.md');
  const desired = patchMetadata(before, { messages: { ...parseDocument(before).meta.messages, 'app.name': 'New standard', 'workbench.overview': '总览' } });
  const current = patchMetadata(before, { messages: { ...parseDocument(before).meta.messages, 'app.name': 'My custom console' }, custom_annotation: { keep: '😀' } });
  const result = mergeUpgrade(before, desired, current);
  assert.equal(parseDocument(result.raw).meta.messages['app.name'], 'My custom console');
  assert.equal(parseDocument(result.raw).meta.messages['workbench.overview'], '总览');
  assert.deepEqual(parseDocument(result.raw).meta.custom_annotation, { keep: '😀' });
  assert.ok(result.conflicts.includes('messages.app.name'));
});

test('business enrichment retains current fields, inputs and existing edited blocks', async () => {
  const key = 'inuk/entities/listing_inuk_navi_amazon.md';
  const before = await baseline(key);
  const desired = await fs.readFile(path.join(root, 'examples', key), 'utf8');
  let current = patchMetadata(patchFields(before, { title: 'Human copy 😀' }), { inputs: { capturedAt: 'kept' }, unknown_property: 7 });
  current = current.replace('A short escape should leave you free to explore.', 'Human description remains.');
  const result = mergeUpgrade(before, desired, current);
  const parsed = parseDocument(result.raw);
  assert.equal(parsed.meta.fields.title, 'Human copy 😀');
  assert.deepEqual(parsed.meta.inputs, { capturedAt: 'kept' });
  assert.equal(parsed.meta.unknown_property, 7);
  assert.match(result.raw, /Human description remains/);
  assert.ok(parsed.blocks.some(block => block.id === 'brief-storage'));
  assert.equal(mergeUpgrade(before, desired, result.raw).raw, result.raw);
});

test('configuration upgrade previews, detects changed plan, backs up and is idempotent', async t => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'outrise-upgrade-'));
  t.after(async () => { if (path.dirname(workspace) === path.resolve(os.tmpdir()) && path.basename(workspace).startsWith('outrise-upgrade-')) await fs.rm(workspace, { recursive: true, force: true }); });
  let store = await openStore({ workspace, watch: false });
  await store.close();
  const key = 'templates/spu.md', file = path.join(workspace, key), before = await baseline(key);
  await fs.writeFile(file, before);
  const preview = await upgradeWorkbench({ workspace });
  assert.equal(await fs.readFile(file, 'utf8'), before);
  assert.ok(preview.changes.some(item => item.id === 'template_spu'));
  await fs.writeFile(file, patchMetadata(before, { name: 'Custom title' }));
  await assert.rejects(upgradeWorkbench({ workspace, apply: true, expectedPlan: preview.planRevision }), { code: 'UPGRADE_PLAN_CHANGED' });
  const result = await upgradeWorkbench({ workspace, apply: true });
  assert.ok(result.backup);
  assert.equal(parseDocument(await fs.readFile(file, 'utf8')).meta.name, 'Custom title');
  assert.equal(parseDocument(await fs.readFile(file, 'utf8')).meta.extends, 'template_product');
  assert.equal(parseDocument(await fs.readFile(path.join(workspace, result.backup, key), 'utf8')).meta.extends, undefined);
  assert.equal((await upgradeWorkbench({ workspace, apply: true })).changes.length, 0);
  store = await openStore({ workspace, watch: false });
  assert.equal(store.diagnostics.length, 0);
  await store.close();
});
