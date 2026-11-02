import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../../server/app.js';
import { patchMetadata } from '../../shared/protocol.js';

const origin = 'http://127.0.0.1:5173';
let runtime;
let server;
let workspace;

test.beforeEach(async () => {
  workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'outrise-template-ui-'));
  runtime = await createApp({ workspace, watch: true });
  server = await new Promise((resolve, reject) => {
    const listener = runtime.app.listen(5173, '127.0.0.1', () => resolve(listener));
    listener.once('error', reject);
  });
});

test.afterEach(async () => {
  await runtime?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  const target = path.resolve(workspace);
  if (path.dirname(target) === path.resolve(os.tmpdir()) && path.basename(target).startsWith('outrise-template-ui-')) await fs.rm(target, { recursive: true, force: true });
  runtime = null;
  server = null;
});

const settings = page => page.getByRole('dialog', { name: '页面结构与公共模板', exact: true });
const openSettings = async page => {
  await page.locator('.page-toolbar').getByRole('button', { name: /调整页面$/ }).click();
  await expect(settings(page)).toBeVisible();
};
const closeSettings = async page => {
  await settings(page).locator('.ant-drawer-close').click();
  await expect(settings(page)).toHaveCount(0);
};

test('page layout controls hide and restore permitted blocks without copying product data', async ({ page, request }) => {
  const initial = await (await request.get(`${origin}/api/documents/spu_commuter_demo`)).json();
  await page.goto(`${origin}/#entity=spu_commuter_demo&section=facts`);
  await expect(page.locator('.workspace-content > .document-canvas .template-notice')).toBeVisible();
  await openSettings(page);
  const drawer = settings(page);
  const noticeVisibility = drawer.getByRole('switch', { name: '显示 demo', exact: true });
  await expect(noticeVisibility).toBeChecked();
  // The standard keeps the fact section and its fixed field block locked.
  const locked = drawer.getByRole('switch', { name: '显示 facts', exact: true });
  await expect(locked).toHaveCount(2);
  await expect(locked.nth(0)).toBeDisabled();
  await expect(locked.nth(1)).toBeDisabled();
  await noticeVisibility.click();
  await drawer.getByRole('switch', { name: '显示 assets', exact: true }).click();
  await drawer.getByRole('button', { name: /保存$/ }).click();
  await expect(drawer.getByRole('button', { name: /保存$/ })).toBeDisabled();
  await closeSettings(page);
  await expect(page.locator('.workspace-content > .document-canvas .template-notice')).toHaveCount(0);
  await expect(page.locator('.workspace-tabs').getByRole('tab', { name: '素材与制作', exact: true })).toHaveCount(0);
  await expect(page.locator('[data-block-id="source-note"]')).toContainText('此块演示来源只读策略');

  await openSettings(page);
  // Hidden slots remain in the settings list, so an individual override can be undone.
  await expect(noticeVisibility).not.toBeChecked();
  await noticeVisibility.click();
  await drawer.getByRole('switch', { name: '显示 assets', exact: true }).click();
  await drawer.getByRole('button', { name: /保存$/ }).click();
  await expect(drawer.getByRole('button', { name: /保存$/ })).toBeDisabled();
  await closeSettings(page);
  await expect(page.locator('.workspace-content > .document-canvas .template-notice')).toBeVisible();
  await expect(page.locator('.workspace-tabs').getByRole('tab', { name: '素材与制作', exact: true })).toBeVisible();
  const saved = await (await request.get(`${origin}/api/documents/spu_commuter_demo`)).json();
  expect(saved.meta.fields).toEqual(initial.meta.fields);
  expect(saved.blocks.map(block => block.raw)).toEqual(initial.blocks.map(block => block.raw));
});

test('a child template binds through the UI and upstream edits preview impact before activation', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${origin}/#entity=spu_commuter_demo`);
  await expect(page.locator('.overview-panel-selling_points')).toBeVisible();
  await openSettings(page);
  const drawer = settings(page);
  await drawer.getByRole('tab', { name: '维护公共模板', exact: true }).click();
  await drawer.getByRole('button', { name: '创建当前页面的子模板', exact: true }).click();
  const creation = page.getByRole('dialog', { name: '创建当前页面的子模板', exact: true });
  await creation.locator('.modal-form input').nth(0).fill('QA 产品子模板');
  await creation.locator('.modal-form input').nth(1).fill('template_qa_product_child');
  await creation.getByRole('button', { name: '新建', exact: true }).click();
  await expect(creation).toHaveCount(0);
  await drawer.getByRole('button', { name: '应用子模板到当前页面', exact: true }).click();
  await expect.poll(async () => (await (await request.get(`${origin}/api/documents/spu_commuter_demo`)).json()).meta.template).toBe('template_qa_product_child');
  await expect(drawer.getByRole('button', { name: '应用子模板到当前页面', exact: true })).toHaveCount(0);

  // The public ancestor remains editable after binding a local child.
  await drawer.locator('.ant-select-selector').click();
  await page.locator('.ant-select-item-option').filter({ hasText: /^通用产品页面标准$/ }).click();
  await drawer.getByRole('button', { name: /高级：编辑模板 Markdown/ }).click();
  const editor = drawer.getByRole('textbox', { name: '高级：编辑模板 Markdown', exact: true });
  await expect(editor).toHaveValue(/id: template_product/);
  const original = await editor.inputValue();
  const modified = patchMetadata(original, { overview_panels: ['hero', 'children', 'channels'] });
  await editor.fill(modified);
  const save = drawer.getByRole('button', { name: '保存并立即生效', exact: true });
  await expect(save).toBeDisabled();
  await drawer.getByRole('button', { name: '预览影响范围', exact: true }).click();
  await expect(drawer.locator('.template-impact')).toContainText('Commuter 16 演示通勤包');
  await expect(drawer.locator('.template-impact')).toContainText('ORBIT DEMO');
  await expect(save).toBeEnabled();

  // A preview is only valid for exactly the draft the user inspected.
  const finalRaw = patchMetadata(modified, { overview_panels: ['hero', 'channels', 'children'] });
  await editor.fill(finalRaw);
  await expect(save).toBeDisabled();
  await expect(drawer.locator('.template-impact')).toHaveCount(0);
  await drawer.getByRole('button', { name: '预览影响范围', exact: true }).click();
  await expect(save).toBeEnabled();
  const savedResponse = page.waitForResponse(response => response.request().method() === 'PUT' && response.url().endsWith('/api/templates/template_product'));
  await save.click();
  expect((await savedResponse).ok()).toBeTruthy();
  await expect(save).toBeDisabled();
  await expect(save).not.toHaveClass(/ant-btn-loading/);
  await closeSettings(page);
  await expect(page.locator('.overview-panel-selling_points')).toHaveCount(0);
  await expect(page.locator('.overview-panel-hero')).toBeVisible();
  await page.goto(`${origin}/#entity=brand_orbit_demo`);
  await expect(page.locator('.overview-panel-selling_points')).toHaveCount(0);
  await expect(page.locator('.overview-panel-hero')).toBeVisible();

  await page.goto(`${origin}/#entity=spu_commuter_demo`);
  await openSettings(page);
  await drawer.getByRole('tab', { name: '维护公共模板', exact: true }).click();
  await drawer.locator('.ant-select-selector').click();
  await page.locator('.ant-select-item-option').filter({ hasText: /^通用产品页面标准$/ }).click();
  await drawer.getByRole('button', { name: /模板修订记录/ }).click();
  await expect.poll(() => drawer.locator('.template-history-row').count()).toBeGreaterThanOrEqual(2);
  expect(errors).toEqual([]);
});
