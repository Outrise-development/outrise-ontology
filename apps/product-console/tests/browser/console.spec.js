import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../../server/app.js';
import { patchMetadata, patchFields, parseDocument } from '../../shared/protocol.js';

let runtime;
let server;
let workspace;
const origin = 'http://127.0.0.1:4318';
const field = (page, key) => page.locator('.field-row').filter({ has: page.locator('.field-label code', { hasText: new RegExp(`^${key}$`) }) });

test.beforeAll(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'outrise-e2e-'));
  runtime = await createApp({ workspace, watch: true });
  server = await new Promise((resolve, reject) => { const listener = runtime.app.listen(4318, '127.0.0.1', () => resolve(listener)); listener.once('error', reject); });
});

test.afterAll(async () => {
  await runtime?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  if (workspace && path.dirname(workspace) === path.resolve(os.tmpdir()) && path.basename(workspace).startsWith('outrise-e2e-')) await fs.rm(workspace, { recursive: true, force: true });
});

test('SKU field save, inheritance and unsaved navigation work in the real console', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/#entity=sku_commuter_black`);
  await expect(page.getByRole('heading', { name: 'Commuter 16 / Black', exact: true })).toBeVisible();
  await expect(field(page, 'material').locator('input')).toBeDisabled();
  await expect(field(page, 'material')).toContainText('继承自 SPU');
  await field(page, 'color').locator('input').fill('Graphite QA');
  await page.getByRole('tab', { name: '营销策略', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(field(page, 'color').locator('input')).toHaveValue('Graphite QA');
  await page.getByRole('button', { name: /保存$/ }).first().click();
  await expect.poll(async () => (await (await request.get(`${origin}/api/documents/sku_commuter_black`)).json()).meta.fields.color).toBe('Graphite QA');
  await page.reload();
  await expect(field(page, 'color').locator('input')).toHaveValue('Graphite QA');
  await page.screenshot({ path: 'output/playwright/console-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('source edits cannot silently overwrite a dirty human form', async ({ page, request }) => {
  await page.goto(`${origin}/#entity=sku_commuter_black`);
  await field(page, 'color').locator('input').fill('Human unsaved');
  const doc = await (await request.get(`${origin}/api/documents/sku_commuter_black`)).json();
  const response = await request.patch(`${origin}/api/documents/sku_commuter_black`, { data: { expectedRevision: doc.revision, operation: 'fields', changes: { color: 'Agent saved' } } });
  expect(response.ok()).toBeTruthy();
  await expect(page.getByText('源文件已更新，请重新加载后编辑', { exact: true })).toBeVisible();
  await expect(field(page, 'color').locator('input')).toHaveValue('Human unsaved');
  await page.getByRole('button', { name: /保存$/ }).first().click();
  await expect(page.locator('.operation-error')).toBeVisible();
  await expect(field(page, 'color').locator('input')).toHaveValue('Human unsaved');
  const latest = await (await request.get(`${origin}/api/documents/sku_commuter_black`)).json();
  expect(latest.meta.fields.color).toBe('Agent saved');
  await expect(page.getByRole('dialog')).toContainText('Human unsaved');
  await page.getByRole('dialog').getByRole('button', { name: '按比较结果保存', exact: true }).click();
  await expect.poll(async () => (await (await request.get(`${origin}/api/documents/sku_commuter_black`)).json()).meta.fields.color).toBe('Human unsaved');
});

test('three channel editors, task context and internal JSON exports are reachable', async ({ page, request }) => {
  await page.goto(`${origin}/#entity=spu_commuter_demo`);
  await page.getByRole('tab', { name: 'Listing', exact: true }).click();
  for (const platform of ['amazon', 'shopify', 'tiktok']) {
    await page.locator(`.platform-record .platform-${platform}`).click();
    await expect(page.locator('.record-header h2')).toBeVisible();
    const response = await request.get(`${origin}/api/listings/listing_${platform}_demo/export?format=json`);
    expect(response.ok()).toBeTruthy();
    expect((await response.json()).publicationValidated).toBe(false);
  }
  await page.getByRole('tab', { name: 'Agent 上下文', exact: true }).click();
  await page.getByRole('button', { name: /准备 Agent 上下文$/ }).click();
  await expect(page.locator('.context-source')).toContainText('base_listing_revision');
  await expect(page.locator('.context-source')).toContainText('strategy_commuter_demo');
  await page.screenshot({ path: 'output/playwright/console-listing.png', fullPage: true });
});

test('media upload and association are usable without leaving the console', async ({ page, request }) => {
  await page.goto(`${origin}/#entity=spu_commuter_demo`);
  await page.getByRole('tab', { name: '素材', exact: true }).click();
  await expect(page.locator('.asset-card')).toHaveCount(1);
  await expect(page.locator('.asset-card img')).toBeVisible();
  await page.getByRole('button', { name: /上传素材$/ }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: 'qa-note.txt', mimeType: 'text/plain', buffer: Buffer.from('QA attachment') });
  await page.getByRole('dialog').getByRole('button', { name: /上传素材$/ }).click();
  await expect(page.locator('.asset-card')).toHaveCount(2);
  const assets = (await (await request.get(`${origin}/api/catalog?kind=asset`)).json()).data;
  expect(assets.some((asset) => asset.media.originalName === 'qa-note.txt' && asset.scopes.includes('spu_commuter_demo'))).toBe(true);
});

test('a new optional Markdown block is edited by Milkdown, reordered and removed', async ({ page, request }) => {
  await page.goto(`${origin}/#entity=sku_commuter_sand`);
  await page.getByRole('button', { name: /添加内容块$/ }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input').first().fill('QA optional block');
  await dialog.getByRole('button', { name: '新建', exact: true }).click();
  const block = page.locator('.content-block').filter({ has: page.getByRole('heading', { name: 'QA optional block', exact: true }) });
  await expect(block).toBeVisible();
  await block.getByTitle('编辑', { exact: true }).click();
  await block.locator('[contenteditable="true"]').fill('Human edited prose 😀');
  await block.getByRole('button', { name: /保存$/ }).click();
  await expect(block.locator('.prose-editor')).toHaveCount(0);
  await expect(block).toContainText('Human edited prose 😀');
  const before = await (await request.get(`${origin}/api/documents/sku_commuter_sand`)).json();
  const custom = before.blocks.find((item) => item.attrs.title === 'QA optional block');
  expect(custom.content).toContain('Human edited prose 😀');
  await block.getByTitle('上移', { exact: true }).click();
  await expect.poll(async () => (await (await request.get(`${origin}/api/documents/sku_commuter_sand`)).json()).blocks[0].id).toBe(custom.id);
  await expect(page.locator('.block-region .content-block').first()).toHaveAttribute('data-block-id', custom.id);
  await block.getByTitle('删除', { exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '删除', exact: true }).click();
  await expect(block).toHaveCount(0);
});

test('a fresh Agent candidate is compared, adopted and confirmed, then source changes flag the approved copy', async ({ page, request }) => {
  for (const id of ['spu_commuter_demo', 'sku_commuter_black', 'sku_commuter_olive', 'sku_commuter_sand', 'strategy_brand_demo', 'strategy_commuter_demo']) {
    const doc = await (await request.get(`${origin}/api/documents/${id}`)).json();
    const confirmed = await request.post(`${origin}/api/documents/${id}/confirm`, { data: { expectedRevision: doc.revision } });
    expect(confirmed.ok(), await confirmed.text()).toBeTruthy();
  }
  let listing = await (await request.get(`${origin}/api/documents/listing_amazon_demo`)).json();
  const captured = await request.patch(`${origin}/api/documents/listing_amazon_demo`, { data: { expectedRevision: listing.revision, operation: 'captureInputs' } });
  expect(captured.ok()).toBeTruthy();
  const context = await (await request.get(`${origin}/api/listings/listing_amazon_demo/context`)).json();
  listing = await (await request.get(`${origin}/api/documents/listing_amazon_demo`)).json();
  const raw = patchMetadata(patchFields(listing.raw, { title: 'QA reviewed commuter listing' }), { inputs: context.inputs, base_listing_revision: context.baseRevision });
  const candidate = await request.post(`${origin}/api/listings/listing_amazon_demo/proposals`, { data: { raw, baseRevision: context.baseRevision, inputs: context.inputs } });
  expect(candidate.ok(), await candidate.text()).toBeTruthy();
  await page.goto(`${origin}/#entity=spu_commuter_demo`);
  await page.getByRole('tab', { name: 'Listing', exact: true }).click();
  await page.locator('.platform-record .platform-amazon').click();
  await page.getByRole('tab', { name: 'Agent 建议', exact: true }).click();
  await page.getByRole('button', { name: '审阅建议', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('QA reviewed commuter listing');
  await page.getByRole('dialog').getByRole('button', { name: '采纳建议', exact: true }).click();
  await page.locator('.record-header').getByRole('button', { name: /确认当前版本$/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: '确认当前版本', exact: true }).click();
  await expect(page.locator('.record-header')).toContainText('已确认');
  const source = await (await request.get(`${origin}/api/documents/spu_commuter_demo`)).json();
  const changed = await request.patch(`${origin}/api/documents/spu_commuter_demo`, { data: { expectedRevision: source.revision, operation: 'fields', changes: { weight: { value: 0.75, unit: 'kg' } } } });
  expect(changed.ok()).toBeTruthy();
  await expect(page.locator('.record-editor .ant-alert-warning')).toBeVisible();
  expect((await (await request.get(`${origin}/api/documents/listing_amazon_demo`)).json()).meta.fields.title).toBe('QA reviewed commuter listing');
});

test('new product and Listing creation exposes empty platform fields for real editing', async ({ page, request }) => {
  await page.goto(`${origin}/#entity=spu_commuter_demo`);
  await page.getByRole('button', { name: '新建产品记录', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('名称', { exact: true }).fill('QA new product');
  await dialog.getByRole('button', { name: '新建', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'QA new product', exact: true })).toBeVisible();
  const products = (await (await request.get(`${origin}/api/catalog?kind=spu`)).json()).data;
  const product = products.find((item) => item.name === 'QA new product');
  const skuResponse = await request.post(`${origin}/api/entities`, { data: { kind: 'sku', name: 'QA new variant', parent: product.id, schema: 'schema_product', template: 'template_sku', fields: { sku_code: 'QA-NEW', color: 'Black' } } });
  expect(skuResponse.ok()).toBeTruthy();
  await page.reload();
  await page.getByRole('tab', { name: 'Listing', exact: true }).click();
  await page.getByRole('button', { name: /新建 Listing 草稿$/ }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('名称', { exact: true }).fill('QA new channel listing');
  await dialog.getByRole('button', { name: '新建', exact: true }).click();
  await expect(page.locator('.record-header h2')).toHaveText('QA new channel listing');
  await expect(field(page, 'bullet_points')).toBeVisible();
  await field(page, 'title').locator('input').fill('QA new Amazon title');
  await page.locator('.fields-panel').getByRole('button', { name: /保存$/ }).click();
  await expect.poll(async () => {
    const records = (await (await request.get(`${origin}/api/catalog?kind=listing`)).json()).data;
    const record = records.find((item) => item.name === 'QA new channel listing');
    return record && (await (await request.get(`${origin}/api/documents/${record.id}`)).json()).meta.fields.title;
  }).toBe('QA new Amazon title');
});

test('live template changes retain content in unplaced area and UI copy reloads from MD', async ({ page }) => {
  await page.goto(`${origin}/#entity=sku_commuter_olive`);
  await expect(page.locator('[data-block-id="demo-note"]')).toBeVisible();
  const templateFile = path.join(workspace, 'templates', 'sku.md');
  const original = await fs.readFile(templateFile, 'utf8');
  await fs.writeFile(templateFile, original.replace(/::region\{#notes\}/, ''), 'utf8');
  await expect(page.locator('.unplaced-region')).toBeVisible();
  expect((await runtime.store.resolved('sku_commuter_olive')).layout.unplaced.some((item) => item.block.id === 'demo-note')).toBe(true);
  const uiFile = path.join(workspace, 'ui', 'zh-CN.md');
  const ui = await fs.readFile(uiFile, 'utf8');
  const messages = { ...parseDocument(ui).meta.messages, 'app.name': 'Outrise QA 工作台' };
  await fs.writeFile(uiFile, patchMetadata(ui, { messages }), 'utf8');
  await expect(page.locator('.brand-header strong')).toHaveText('Outrise QA 工作台');
  await fs.writeFile(templateFile, original, 'utf8');
  await fs.writeFile(uiFile, ui, 'utf8');
});
