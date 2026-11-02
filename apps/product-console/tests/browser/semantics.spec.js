import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../../server/app.js';
import { parseDocument, patchFields, patchMetadata } from '../../shared/protocol.js';

let runtime;
let server;
let workspace;
const origin = 'http://127.0.0.1:5173';
const read = async (request, id) => (await (await request.get(`${origin}/api/documents/${id}`)).json());
const choose = async (page, control, label) => {
  await control.focus();
  await control.press('ArrowDown');
  const option = page.locator('.ant-select-dropdown:visible').getByText(label, { exact: true });
  // Searchable document selectors virtualize long option lists. Keyboard focus
  // also avoids clicking the selected-value overlay of a single Select.
  if (!await option.count() && await control.getAttribute('readonly') === null) await control.fill(label);
  await option.click();
};

test.beforeAll(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'outrise-semantic-e2e-'));
  runtime = await createApp({ workspace, watch: true });
  server = await new Promise((resolve, reject) => {
    const listener = runtime.app.listen(5173, '127.0.0.1', () => resolve(listener));
    listener.once('error', reject);
  });
});

test.afterAll(async () => {
  await runtime?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  const resolved = workspace && path.resolve(workspace);
  if (resolved && path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('outrise-semantic-e2e-')) await fs.rm(resolved, { recursive: true, force: true });
});

test('a human links a precise fact, writes FABE, and reads the saved evidence after refresh', async ({ page, request }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/#entity=strategy_commuter_demo`);
  await page.getByRole('button', { name: '关联依据', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await choose(page, dialog.getByRole('combobox', { name: '来源文档', exact: true }), 'Commuter 16 演示通勤包');
  await choose(page, dialog.getByRole('combobox', { name: '引用位置', exact: true }), '具体字段');
  await choose(page, dialog.getByRole('combobox', { name: '具体字段', exact: true }), '容量');
  await dialog.getByLabel('内部依据说明', { exact: true }).fill('QA capacity evidence from the shared product fact');
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(async () => (await read(request, 'strategy_commuter_demo')).meta.refs.some(ref => ref.field === 'volume' && ref.note === 'QA capacity evidence from the shared product fact')).toBe(true);

  await page.getByRole('button', { name: '新增卖点', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('产品特点 · Feature', { exact: true }).fill('QA shared capacity');
  await dialog.getByLabel('特点优势 · Advantage', { exact: true }).fill('QA plan the load with a known volume');
  await dialog.getByLabel('用户利益 · Benefit', { exact: true }).fill('QA choose the right everyday carry');
  await choose(page, dialog.getByRole('combobox', { name: '证明依据 · Evidence', exact: true }), 'QA capacity evidence from the shared product fact');
  await page.keyboard.press('Escape');
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  let point;
  await expect.poll(async () => {
    const doc = await read(request, 'strategy_commuter_demo');
    point = doc.meta.selling_points.find(item => item.feature === 'QA shared capacity');
    return Boolean(point?.id && point.evidence?.length === 1 && doc.meta.refs.some(ref => ref.id === point.evidence[0] && ref.documentId === 'spu_commuter_demo' && ref.field === 'volume'));
  }).toBe(true);
  const pointId = point.id;
  await page.reload();
  const row = page.locator('.fabe-table tbody tr').filter({ hasText: 'QA shared capacity' });
  await expect(row).toContainText('QA choose the right everyday carry');
  await row.getByRole('button', { name: '编辑', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('用户利益 · Benefit', { exact: true }).fill('QA revised everyday carry benefit');
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect.poll(async () => (await read(request, 'strategy_commuter_demo')).meta.selling_points.find(item => item.id === pointId)?.benefit).toBe('QA revised everyday carry benefit');
  await page.reload();
  await expect(row).toContainText('QA revised everyday carry benefit');
  await row.getByRole('button', { name: /Commuter 16 演示通勤包.*容量/ }).click();
  await expect(page.locator('.ant-drawer-content')).toBeVisible();
  await expect(page).toHaveURL(/source=spu_commuter_demo/);
  await expect(page).toHaveURL(/sourceField=volume/);
  await page.locator('.ant-drawer-close').click();
  await expect(row).toContainText('QA revised everyday carry benefit');
  expect(errors).toEqual([]);
});

test('asset stages and original-source links persist and drive the product media filters', async ({ page, request }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/#entity=asset_shared_demo`);
  await choose(page, page.getByRole('combobox', { name: '素材阶段', exact: true }), '原始素材');
  await page.locator('.asset-detail-summary').getByRole('button', { name: '保存', exact: true }).click();
  await expect.poll(async () => (await read(request, 'asset_shared_demo')).meta.asset_stage).toBe('source');
  await page.goto(`${origin}/#entity=spu_commuter_demo&section=assets`);
  await page.getByText('原始素材', { exact: true }).first().click();
  await expect(page.locator('.asset-card')).toHaveCount(1);
  await expect(page.locator('.asset-card')).toContainText('Commuter 16 — product illustration');

  await page.goto(`${origin}/#entity=asset_shared_demo`);
  await choose(page, page.getByRole('combobox', { name: '素材阶段', exact: true }), '交付成品');
  await choose(page, page.getByRole('combobox', { name: '来源素材', exact: true }), 'Commuter 16 — Black');
  await page.keyboard.press('Escape');
  await page.locator('.asset-detail-summary').getByRole('button', { name: '保存', exact: true }).click();
  await expect.poll(async () => {
    const doc = await read(request, 'asset_shared_demo');
    return doc.meta.asset_stage === 'final' && doc.meta.source_assets?.includes('asset_black_demo');
  }).toBe(true);
  await page.reload();
  await expect(page.locator('.asset-detail-summary')).toContainText('交付成品');
  await expect(page.locator('.asset-usage-list').first()).toContainText('Commuter 16 — Black');
  await page.goto(`${origin}/#entity=spu_commuter_demo&section=assets`);
  await page.getByText('交付成品', { exact: true }).first().click();
  await expect(page.locator('.asset-card')).toHaveCount(1);
  await expect(page.locator('.asset-card')).toContainText('Commuter 16 — product illustration');
  await page.getByText('原始素材', { exact: true }).first().click();
  await expect(page.locator('.asset-card')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('Listing copy guards unsaved changes and creative plans and media order survive reload', async ({ page, request }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/#entity=listing_amazon_demo&panel=content`);
  const title = page.locator('.listing-copy-table tr[data-field="title"]');
  await title.getByRole('button', { name: '编辑', exact: true }).click();
  await title.locator('textarea').fill('QA carefully reviewed platform title');
  await page.getByRole('tab', { name: '审核与交付', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
  await expect(title.locator('textarea')).toHaveValue('QA carefully reviewed platform title');
  await title.getByRole('button', { name: '保存', exact: true }).click();
  await expect.poll(async () => (await read(request, 'listing_amazon_demo')).meta.fields.title).toBe('QA carefully reviewed platform title');
  await page.getByRole('tab', { name: '图片与详情', exact: true }).click();
  await page.getByRole('button', { name: '新增制作方案', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('块标题', { exact: true }).fill('QA organization image brief');
  await dialog.getByLabel('标题文案', { exact: true }).fill('Everything has its place');
  await dialog.getByLabel('画面与动作', { exact: true }).fill('Show the organizer pocket with daily objects.');
  await dialog.getByLabel('执行与表达边界', { exact: true }).fill('Synthetic demo; do not imply a real product certification.');
  await dialog.getByRole('button', { name: '新建', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  let briefId;
  await expect.poll(async () => {
    const brief = (await read(request, 'listing_amazon_demo')).blocks.find(block => block.attrs?.title === 'QA organization image brief');
    briefId = brief?.id;
    return Boolean(brief?.attrs.purpose === 'brief' && brief.content.includes('Everything has its place'));
  }).toBe(true);
  await expect(page.locator(`[data-block-id="${briefId}"]`)).toContainText('Show the organizer pocket');
  const before = (await read(request, 'listing_amazon_demo')).meta.assets;
  const orderedPanel = page.locator('section.panel').filter({ has: page.locator('.ordered-media') });
  await orderedPanel.locator('.ordered-media-row').first().getByTitle('下移', { exact: true }).click();
  await orderedPanel.getByRole('button', { name: '保存', exact: true }).click();
  const expected = [before[1], before[0], ...before.slice(2)];
  await expect.poll(async () => (await read(request, 'listing_amazon_demo')).meta.assets).toEqual(expected);
  await page.reload();
  await expect(page.getByRole('tab', { name: '图片与详情', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator(`[data-block-id="${briefId}"]`)).toContainText('Everything has its place');
  await expect(page.locator('.ordered-media-row').first()).toContainText('Commuter 16 — Black');
  const persisted = await read(request, 'listing_amazon_demo');
  expect(persisted.meta.fields.title).toBe('QA carefully reviewed platform title');
  expect(persisted.blocks.find(block => block.id === briefId)?.content).toContain('Synthetic demo');
  expect(errors).toEqual([]);
});

for (const platform of ['amazon', 'shopify', 'tiktok']) {
  test(`${platform} completes human copy, media selection, candidate review, confirmation and UI export`, async ({ page, request }) => {
    test.setTimeout(60_000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const id = `listing_${platform}_demo`;
    const humanTitle = `QA ${platform} human-reviewed title`;
    const adoptedTitle = `QA ${platform} accepted candidate title`;
    let listing = await read(request, id);
    // Start with no selected media so this test proves selection through the UI,
    // independently of fixture media and previous tests in this temporary store.
    const reset = await request.patch(`${origin}/api/documents/${id}`, { data: { expectedRevision: listing.revision, operation: 'metadata', changes: { assets: [] } } });
    expect(reset.ok(), await reset.text()).toBe(true);
    await page.goto(`${origin}/#entity=${id}&panel=content`);
    const titleRow = page.locator('.listing-copy-table tr[data-field="title"]');
    await titleRow.getByRole('button', { name: '编辑', exact: true }).click();
    await titleRow.locator('textarea').fill(humanTitle);
    await titleRow.getByRole('button', { name: '保存', exact: true }).click();
    await expect.poll(async () => (await read(request, id)).meta.fields.title).toBe(humanTitle);

    await page.getByRole('tab', { name: '图片与详情', exact: true }).click();
    const mediaPanel = page.locator('section.panel').filter({ has: page.locator('.ordered-media') });
    for (const label of ['Commuter 16 — product illustration', 'Commuter 16 — Black', 'Commuter 16 — Olive']) {
      await choose(page, mediaPanel.locator('.media-selection').getByRole('combobox'), label);
      await page.keyboard.press('Escape');
    }
    await expect(mediaPanel.locator('.ordered-media-row')).toHaveCount(3);
    await mediaPanel.locator('.ordered-media-row').first().getByTitle('下移', { exact: true }).click();
    await mediaPanel.getByRole('button', { name: '保存', exact: true }).click();
    const orderedAssets = ['asset_black_demo', 'asset_shared_demo', 'asset_olive_demo'];
    await expect.poll(async () => (await read(request, id)).meta.assets).toEqual(orderedAssets);

    // Source approval and candidate generation are API setup; the operator
    // reviews, adopts and confirms the resulting platform draft in the UI.
    let contextResponse = await request.get(`${origin}/api/listings/${id}/context`);
    expect(contextResponse.ok(), await contextResponse.text()).toBe(true);
    let context = await contextResponse.json();
    const kindOrder = ['brand', 'product_line', 'spu', 'sku', 'strategy'];
    const sources = context.inputs.sources.filter(source => kindOrder.includes(source.kind)).sort((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind));
    for (const source of sources) {
      const document = await read(request, source.id);
      const confirmation = await request.post(`${origin}/api/documents/${source.id}/confirm`, { data: { expectedRevision: document.revision } });
      expect(confirmation.ok(), await confirmation.text()).toBe(true);
    }
    listing = await read(request, id);
    const captured = await request.patch(`${origin}/api/documents/${id}`, { data: { expectedRevision: listing.revision, operation: 'captureInputs' } });
    expect(captured.ok(), await captured.text()).toBe(true);
    contextResponse = await request.get(`${origin}/api/listings/${id}/context`);
    expect(contextResponse.ok(), await contextResponse.text()).toBe(true);
    context = await contextResponse.json();
    listing = await read(request, id);
    const raw = patchMetadata(patchFields(listing.raw, { title: adoptedTitle }), { inputs: context.inputs, base_listing_revision: context.baseRevision });
    const proposalResponse = await request.post(`${origin}/api/listings/${id}/proposals`, { data: { raw, baseRevision: context.baseRevision, inputs: context.inputs } });
    expect(proposalResponse.ok(), await proposalResponse.text()).toBe(true);
    const proposal = await proposalResponse.json();

    await page.getByRole('tab', { name: '审核与交付', exact: true }).click();
    await page.locator('.proposal-row').filter({ hasText: proposal.id }).getByRole('button', { name: '审阅建议', exact: true }).click();
    const review = page.getByRole('dialog');
    await expect(review.locator('.proposal-field-diff')).toContainText(humanTitle);
    await expect(review.locator('.proposal-field-diff')).toContainText(adoptedTitle);
    await review.getByRole('button', { name: '采纳建议', exact: true }).click();
    await expect.poll(async () => (await read(request, id)).meta.fields.title).toBe(adoptedTitle);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.locator('.page-toolbar').getByRole('button', { name: /确认当前版本$/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: '确认当前版本', exact: true }).click();
    await expect(page.locator('.page-heading')).toContainText('已确认');
    await expect.poll(async () => (await (await request.get(`${origin}/api/entities/${id}/resolved`)).json()).review.state).toBe('confirmed');

    for (const format of ['json', 'md']) {
      const name = format === 'json' ? /导出 JSON 快照$/ : /导出 Markdown$/;
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.semantic-actions').getByRole('button', { name }).click()]);
      expect(download.suggestedFilename()).toBe(`${id}.${format}`);
      const content = await fs.readFile(await download.path(), 'utf8');
      if (format === 'json') {
        const exported = JSON.parse(content);
        expect(exported.platform).toBe(platform);
        expect(exported.fields.title).toBe(adoptedTitle);
        expect(exported.review.state).toBe('confirmed');
        expect(exported.publicationValidated).toBe(false);
        expect(exported.stale.stale).toBe(false);
      } else {
        const exported = parseDocument(content);
        expect(exported.meta.fields.title).toBe(adoptedTitle);
        expect(exported.meta.assets).toEqual(orderedAssets);
        expect(exported.meta.export.publicationValidated).toBe(false);
      }
    }
    expect(errors).toEqual([]);
  });
}
