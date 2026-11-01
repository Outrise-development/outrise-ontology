import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument, patchFields, patchMetadata, updateBlock, addBlock, moveBlock, composeTemplate, resolveFields, businessContent } from '../shared/protocol.js';

const raw = '\uFEFF---\r\nformat: outrise/1\r\nid: sku_test\r\nkind: sku\r\n# keep comment\r\nunknown: 保留\r\nfields:\r\n  color: 黑色\r\n---\r\n\r\n:::richtext{#notes region="notes" future="保留😀"}\r\n中文 😀\r\n::: \r\n\r\n:::future{#future region="notes" extra="x"}\r\nDo not rewrite me.\r\n:::\r\n';
test('UTF-16 offsets, BOM, CRLF and unknown blocks survive a targeted edit', () => {
  const initial = parseDocument(raw);
  assert.equal(initial.blocks[0].content, '中文 😀');
  const changed = updateBlock(raw, 'notes', '已编辑 😀');
  assert.equal(parseDocument(changed).blocks[1].raw, initial.blocks[1].raw);
  const fields = patchFields(changed, { color: '橄榄绿', weight: { value: 720, unit: 'g' } });
  assert.match(fields, /# keep comment/);
  assert.match(fields, /unknown: 保留/);
  assert.equal(parseDocument(fields).meta.fields.weight.value, 720);
  assert.equal(fields.slice(parseDocument(fields).bodyOffset), changed.slice(parseDocument(changed).bodyOffset));
});
test('duplicate IDs, malformed frontmatter and unclosed blocks fail explicitly', () => {
  assert.throws(() => parseDocument(raw.replace('#future', '#notes')), /duplicate_block_id/);
  assert.throws(() => parseDocument(raw.replace('kind: sku', 'kind: sku\r\nkind: spu')), /invalid_yaml/);
  assert.throws(() => parseDocument(raw.replace(/:::\r\n$/, '')), /unclosed_directive|invalid_directive/);
});
test('rich text cannot inject blocks by closing its directive wrapper', () => {
  const escaped = 'safe\n:::\n\n:::richtext{#injected region="notes" policy="readonly"}\nunsafe';
  assert.throws(() => updateBlock(raw, 'notes', escaped), /invalid_block_content/);
  assert.throws(() => addBlock(raw, { id: 'add', attrs: { region: 'notes' }, content: escaped }), /invalid_block_content/);
});
test('live template regions preserve removed and unknown content as unplaced', () => {
  const template = parseDocument('---\nformat: outrise/1\nid: template\nkind: template\nregions:\n  notes:\n    allowed_types: [richtext]\n---\n::fields{#facts}\n\n::region{#notes}\n');
  const layout = composeTemplate(parseDocument(raw), template);
  assert.equal(layout.fixed[0].id, 'facts');
  assert.equal(layout.regions[0].blocks[0].id, 'notes');
  assert.equal(layout.unplaced[0].block.id, 'future');
  const removed = { ...template, blocks: template.blocks.filter((block) => block.type !== 'region') };
  assert.equal(composeTemplate(parseDocument(raw), removed).unplaced.length, 2);
});
test('block moves retain IDs and unknown metadata; pure layout changes do not change business content', () => {
  const expanded = addBlock(raw, { id: 'second', attrs: { region: 'notes' }, content: '第二块' });
  const moved = moveBlock(expanded, 'second', { region: 'other', beforeId: 'notes' });
  assert.equal(parseDocument(moved).blocks[0].id, 'second');
  assert.deepEqual(businessContent(parseDocument(moved)), businessContent(parseDocument(expanded)));
});
test('SKU inheritance, explicit overrides and removal restore source provenance', () => {
  const doc = parseDocument(raw);
  const parent = { meta: { id: 'spu_test', kind: 'spu', fields: { material: 'nylon', color: '默认' } } };
  let resolved = resolveFields(doc, parent);
  assert.equal(resolved.values.material, 'nylon');
  assert.equal(resolved.sources.material.documentId, 'spu_test');
  assert.deepEqual(resolved.overrides, ['color']);
  resolved = resolveFields(parseDocument(patchFields(raw, {}, ['color'])), parent);
  assert.equal(resolved.values.color, '默认');
  assert.equal(resolved.sources.color.inherited, true);
});
test('review metadata length cannot change the business identity of preserved ordinary Markdown', () => {
  const withHeading = raw.replace(':::richtext', '# 普通标题 😀\r\n\r\n:::richtext');
  const reviewed = patchMetadata(withHeading, { review: { snapshot: 'confirmation_very_long_identity', confirmedAt: '2026-11-01T00:00:00Z' } });
  assert.deepEqual(businessContent(parseDocument(reviewed)), businessContent(parseDocument(withHeading)));
});
