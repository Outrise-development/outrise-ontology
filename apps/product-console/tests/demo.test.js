import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseDocument } from '../shared/protocol.js';

const demo = fileURLToPath(new URL('../demo/', import.meta.url));

test('canonical demo references, UI labels and binary asset descriptors remain coherent', async () => {
  const docs = new Map();
  for (const file of await fs.readdir(demo, { recursive: true })) {
    if (!file.endsWith('.md')) continue;
    const doc = parseDocument(await fs.readFile(path.join(demo, file), 'utf8'));
    assert.ok(!docs.has(doc.meta.id), `duplicate document identity ${doc.meta.id}`);
    docs.set(doc.meta.id, doc);
  }
  const messages = docs.get('ui_zh_cn').meta.messages;
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (['label_key', 'title_key'].includes(key)) assert.equal(typeof messages[item], 'string', `missing UI key ${item}`);
      else visit(item);
    }
  };
  for (const doc of docs.values()) {
    visit(doc.meta);
    for (const block of doc.blocks) visit(block.attrs);
    for (const key of ['schema', 'template', 'parent', 'policy', 'spu', 'target']) {
      const ref = doc.meta[key];
      if (ref && key !== 'target') assert.ok(docs.has(ref), `${doc.meta.id}.${key} -> ${ref}`);
    }
    for (const key of ['scopes', 'skus', 'strategies', 'assets']) for (const ref of doc.meta[key] || []) assert.ok(docs.has(ref), `${doc.meta.id}.${key} -> ${ref}`);
    if (doc.meta.kind === 'asset') {
      const media = doc.meta.media;
      const bytes = await fs.readFile(path.join(demo, media.key));
      assert.equal(bytes.length, media.size);
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), media.sha256);
    }
    if (doc.meta.kind === 'listing') {
      const targets = docs.get('sales_targets').meta.targets;
      assert.ok(targets.some((target) => target.id === doc.meta.target && target.platform === doc.meta.platform));
      assert.ok(doc.meta.demo, 'synthetic listing must be labelled demo');
    }
  }
  assert.equal([...docs.values()].filter((doc) => doc.meta.kind === 'sku').length, 3);
  assert.equal([...docs.values()].filter((doc) => doc.meta.kind === 'listing').length, 3);
});
