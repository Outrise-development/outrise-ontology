#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openStore, WorkspaceStore } from '../server/store.js';
import { parseDocument, patchMetadata } from '../shared/protocol.js';
import { fail } from '../server/errors.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const baselineRoot = path.join(root, 'migrations/workbench-v2/baseline');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const read = file => fs.readFile(file, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });

// A three-way additive merge: custom values win and remain visible in the report.
function merge(before, desired, current, key, conflicts) {
  if (same(before, desired) || same(current, desired)) return current;
  if (same(before, current)) return desired;
  if (object(desired) && (object(before) || before === undefined) && object(current)) {
    const output = { ...current };
    for (const name of new Set([...Object.keys(before || {}), ...Object.keys(desired)])) {
      const next = merge(before?.[name], desired[name], current[name], key ? `${key}.${name}` : name, conflicts);
      if (next === undefined) delete output[name]; else output[name] = next;
    }
    return output;
  }
  conflicts.push(key);
  return current;
}

export function mergeUpgrade(beforeRaw, desiredRaw, currentRaw) {
  const before = parseDocument(beforeRaw), desired = parseDocument(desiredRaw), current = parseDocument(currentRaw);
  const conflicts = [];
  const merged = merge(before.meta, desired.meta, current.meta, '', conflicts);
  const changes = Object.fromEntries([...new Set([...Object.keys(current.meta), ...Object.keys(merged)])].filter(key => !same(current.meta[key], merged[key])).map(key => [key, merged[key]]));
  let raw = Object.keys(changes).length ? patchMetadata(currentRaw, changes) : currentRaw;
  const oldBody = beforeRaw.slice(before.bodyOffset), newBody = desiredRaw.slice(desired.bodyOffset), currentBody = currentRaw.slice(current.bodyOffset);
  if (newBody !== oldBody && currentBody !== newBody) {
    if (currentBody === oldBody) raw = raw.slice(0, parseDocument(raw).bodyOffset) + newBody;
    else if (newBody.startsWith(oldBody)) {
      const added = newBody.slice(oldBody.length);
      const targetIds = new Set(desired.blocks.filter(block => !before.blocks.some(old => old.id === block.id)).map(block => block.id));
      if (![...targetIds].some(id => current.blocks.some(block => block.id === id))) raw += added;
      else conflicts.push('body');
    } else conflicts.push('body');
  }
  parseDocument(raw);
  return { raw, conflicts, changedKeys: Object.keys(changes) };
}

async function definitions() {
  const output = [];
  for (const key of (await fs.readdir(baselineRoot, { recursive: true })).filter(key => key.endsWith('.md')).sort()) {
    const inuk = key.startsWith(`inuk${path.sep}`) || key.startsWith('inuk/');
    const sourceKey = inuk ? key.slice(5) : key;
    const desired = await read(path.join(root, inuk ? 'examples/inuk' : 'demo', sourceKey));
    if (!desired) continue;
    const baseline = await fs.readFile(path.join(baselineRoot, key), 'utf8');
    output.push({ key: sourceKey.split(path.sep).join('/'), desired, baseline, business: parseDocument(desired).meta.kind !== 'template' && !['view', 'ui', 'config', 'schema', 'policy'].includes(parseDocument(desired).meta.kind) });
  }
  for (const name of ['base.md', 'product.md']) output.push({ key: `templates/${name}`, desired: await fs.readFile(path.join(root, 'demo/templates', name), 'utf8'), baseline: null, business: false });
  return output;
}

async function prepare(store, definitionsList) {
  const entries = [], conflicts = [], skipped = [];
  for (const definition of definitionsList) {
    const desired = parseDocument(definition.desired);
    const current = store.documents.get(desired.meta.id);
    if (!current) {
      if (definition.business) { skipped.push({ id: desired.meta.id, reason: 'not_installed' }); continue; }
      if (await read(await store.safePath(definition.key)) !== null) fail('UPGRADE_PATH_COLLISION', { key: definition.key }, 409);
      entries.push({ id: desired.meta.id, key: definition.key, raw: definition.desired, before: null, revision: null, changedKeys: ['new_document'] });
      continue;
    }
    store.assertCurrentValid(current);
    if (!definition.baseline) {
      if (current.raw !== definition.desired) conflicts.push({ id: desired.meta.id, keys: ['existing_template_preserved'] });
      continue;
    }
    const result = mergeUpgrade(definition.baseline, definition.desired, current.raw);
    if (result.conflicts.length) conflicts.push({ id: desired.meta.id, keys: result.conflicts });
    if (result.raw !== current.raw) entries.push({ id: current.meta.id, key: current.relative, raw: result.raw, before: current.raw, revision: current.revision, changedKeys: result.changedKeys });
  }
  const staging = new WorkspaceStore({ workspace: store.workspace, watch: false, seed: false, storage: store.storage });
  staging.documents = new Map(store.documents);
  for (const entry of entries) staging.documents.set(entry.id, { ...parseDocument(entry.raw), relative: entry.key, revision: hash(entry.raw) });
  for (const document of staging.documents.values()) {
    if (['template', 'schema', 'ui', 'view', 'policy', 'config'].includes(document.meta.kind)) staging.validateSystemDocument(document);
    else staging.validateDocument(document);
  }
  return { entries, conflicts, skipped };
}

/** Apply only known-baseline changes under the same workspace lease as API/CLI. */
export async function upgradeWorkbench({ workspace = path.join(root, '.local/workspace'), apply = false, expectedPlan } = {}) {
  const store = await openStore({ workspace, watch: false, seed: false });
  try {
    const configs = await definitions();
    return await store.transaction(async () => {
      if (store.diagnostics.length) fail('WORKSPACE_INVALID', { diagnostics: store.diagnostics });
      const plan = await prepare(store, configs);
      const signature = hash(JSON.stringify(plan.entries.map(({ id, raw, revision }) => ({ id, raw, revision }))));
      if (expectedPlan && expectedPlan !== signature) fail('UPGRADE_PLAN_CHANGED', {}, 409);
      const summary = { applied: apply, planRevision: signature, changes: plan.entries.map(({ id, key, revision, changedKeys }) => ({ id, key, revision, changedKeys })), conflicts: plan.conflicts, skipped: plan.skipped };
      if (!apply || !plan.entries.length) return summary;
      const backup = `.history/config-upgrades/${crypto.randomUUID()}`;
      for (const entry of plan.entries) if (entry.before !== null) await store.atomicWrite(`${backup}/${entry.key}`, entry.before, { exclusive: true });
      const written = [];
      try {
        for (const entry of plan.entries) {
          await store.atomicWrite(entry.key, entry.raw, entry.before === null ? { exclusive: true } : { expectedRevision: entry.revision });
          written.push(entry);
        }
      } catch (error) {
        const retained = [];
        for (const entry of written.reverse()) {
          try {
            const current = await store.storage.read(entry.key);
            if (current.revision !== hash(entry.raw)) { retained.push(entry.key); continue; }
            if (entry.before !== null) await store.atomicWrite(entry.key, entry.before, { expectedRevision: current.revision });
            else await fs.unlink(await store.safePath(entry.key));
          } catch { retained.push(entry.key); }
        }
        error.details = { ...error.details, backup, rollbackRetained: retained };
        throw error;
      }
      return { ...summary, backup };
    });
  } finally { await store.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), options = {};
    for (let index = 0; index < args.length; index++) {
      if (args[index] === '--apply') options.apply = true;
      else if (args[index] === '--workspace') options.workspace = args[++index];
      else if (args[index] === '--expected-plan') options.expectedPlan = args[++index];
      else fail('INVALID_ARGUMENT', { argument: args[index] });
    }
    process.stdout.write(`${JSON.stringify(await upgradeWorkbench(options), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ error: { code: error.code || 'UPGRADE_ERROR', details: error.details || { message: error.message } } })}\n`);
    process.exitCode = 1;
  }
}
