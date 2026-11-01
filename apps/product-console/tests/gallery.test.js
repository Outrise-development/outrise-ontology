import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.js';

test('editable gallery content stores reusable asset IDs and rejects broken references without overwriting', async (t) => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'outrise-gallery-'));
  const runtime = await createApp({ workspace, watch: false });
  t.after(async () => {
    await runtime.close();
    if (path.dirname(workspace) === path.resolve(os.tmpdir()) && path.basename(workspace).startsWith('outrise-gallery-')) await fs.rm(workspace, { recursive: true, force: true });
  });
  const { store } = runtime;
  const id = 'sku_commuter_sand';
  let doc = store.get(id);
  await store.patch(id, { expectedRevision: doc.revision, operation: 'addBlock', block: { id: 'qa_gallery', type: 'gallery', attrs: { region: 'notes', policy: 'local-edit' }, content: '' } });
  doc = store.get(id);
  await store.patch(id, { expectedRevision: doc.revision, operation: 'updateBlock', blockId: 'qa_gallery', content: 'asset_shared_demo\nasset_black_demo' });
  doc = store.get(id);
  assert.equal(doc.blocks.find((block) => block.id === 'qa_gallery').content, 'asset_shared_demo\nasset_black_demo');
  await assert.rejects(() => store.patch(id, { expectedRevision: doc.revision, operation: 'updateBlock', blockId: 'qa_gallery', content: 'asset_missing' }), (error) => error.code === 'INVALID_ASSET_REFERENCE');
  assert.equal(store.get(id).revision, doc.revision);
});
