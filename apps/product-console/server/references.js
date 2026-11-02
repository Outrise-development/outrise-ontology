import { fail } from './errors.js';

const object = value => value && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const entities = new Set(['brand', 'product_line', 'spu', 'sku', 'strategy', 'asset', 'listing']);
const uniqueRows = (rows, field) => {
  if (!Array.isArray(rows) || rows.some(row => !object(row) || !nonempty(row.id)) || new Set(rows.map(row => row.id)).size !== rows.length) fail('INVALID_SEMANTIC_DATA', { field });
};

export function validateSemantics(document, { fieldNames = [] } = {}) {
  const meta = document.meta;
  if (meta.refs !== undefined) {
    uniqueRows(meta.refs, 'refs');
    for (const ref of meta.refs) {
      if (!nonempty(ref.documentId) || (ref.field && ref.blockId) || ['field', 'blockId', 'usedBy', 'note'].some(key => ref[key] !== undefined && typeof ref[key] !== 'string')) fail('INVALID_INTERNAL_REFERENCE', { id: ref.id });
      if (ref.usedBy && !Object.hasOwn(meta.fields ?? {}, ref.usedBy) && !fieldNames.includes(ref.usedBy) && !document.blocks.some(block => block.id === ref.usedBy) && !(meta.selling_points ?? []).some(point => point.id === ref.usedBy)) fail('REFERENCE_USAGE_MISSING', { id: ref.id, usedBy: ref.usedBy });
    }
  }
  if (meta.selling_points !== undefined) {
    if (meta.kind !== 'strategy') fail('INVALID_SEMANTIC_DATA', { field: 'selling_points' });
    uniqueRows(meta.selling_points, 'selling_points');
    for (const point of meta.selling_points) {
      if (point.priority !== undefined && (!Number.isFinite(point.priority) || point.priority < 0)) fail('INVALID_SEMANTIC_DATA', { field: 'selling_points', id: point.id });
      if (point.blockId && !document.blocks.some(block => block.id === point.blockId)) fail('SEMANTIC_BLOCK_MISSING', { id: point.id, blockId: point.blockId });
      if (['feature', 'advantage', 'benefit'].some(key => point[key] !== undefined && typeof point[key] !== 'string')) fail('INVALID_SEMANTIC_DATA', { field: 'selling_points', id: point.id });
      if (point.evidence !== undefined && (!Array.isArray(point.evidence) || point.evidence.some(id => !(meta.refs ?? []).some(ref => ref.id === id)))) fail('INVALID_SEMANTIC_EVIDENCE', { id: point.id });
    }
  }
  if (meta.asset_stage !== undefined && (meta.kind !== 'asset' || !['source', 'final'].includes(meta.asset_stage))) fail('INVALID_ASSET_STAGE');
  if (meta.source_assets !== undefined && (meta.kind !== 'asset' || !Array.isArray(meta.source_assets) || meta.source_assets.some(id => !nonempty(id) || id === meta.id) || new Set(meta.source_assets).size !== meta.source_assets.length)) fail('INVALID_ASSET_SOURCES');
  if (meta.issues !== undefined) {
    uniqueRows(meta.issues, 'issues');
    for (const issue of meta.issues) if (!nonempty(issue.code) || !nonempty(issue.message) || !['open', 'resolved'].includes(issue.status)) fail('INVALID_SEMANTIC_DATA', { field: 'issues', id: issue.id });
  }
}

export function resolveReferences(document, documents, effective) {
  const refs = [...(document.meta.refs ?? [])];
  for (const id of document.meta.source_assets ?? []) refs.push({ id: `asset-source:${id}`, documentId: id, expectedKind: 'asset' });
  return refs.map(ref => {
    const target = ref.documentId === document.meta.id ? document : documents.get(ref.documentId);
    const output = { ...ref, source: { documentId: document.meta.id, usedBy: ref.usedBy }, valid: false };
    if (!target || !entities.has(target.meta.kind)) return { ...output, code: 'REFERENCE_TARGET_MISSING' };
    if (target.meta.archived) return { ...output, code: 'REFERENCE_TARGET_ARCHIVED' };
    if (ref.expectedKind && target.meta.kind !== ref.expectedKind) return { ...output, code: 'INVALID_ASSET_SOURCES' };
    const details = { id: target.meta.id, name: target.meta.name, kind: target.meta.kind, revision: target.revision };
    if (ref.field) {
      const fields = effective(target);
      if (!Object.hasOwn(fields.values, ref.field)) return { ...output, target: details, code: 'REFERENCE_FIELD_MISSING' };
      Object.assign(details, { field: ref.field, value: fields.values[ref.field], origin: fields.sources[ref.field] });
    }
    if (ref.blockId) {
      const block = target.blocks.find(item => item.id === ref.blockId);
      if (!block || block.type === 'unknown') return { ...output, target: details, code: 'REFERENCE_BLOCK_MISSING' };
      Object.assign(details, { blockId: block.id, title: block.attrs?.title, titleKey: block.attrs?.title_key, content: block.content, type: block.type });
    }
    return { ...output, valid: true, target: details };
  });
}

/** Traversal records each document once; same-document field references are not dependency cycles. */
export function referenceDependencies(document, documents, effective, { strict = true } = {}) {
  const collected = new Map();
  const active = new Set();
  const issues = [];
  const visit = current => {
    if (active.has(current.meta.id)) { issues.push({ code: 'REFERENCE_CYCLE', documentId: current.meta.id }); return; }
    if (collected.has(current.meta.id)) return;
    active.add(current.meta.id);
    // Effective SKU facts depend on the SPU, including the SPU's own evidence graph.
    // Adding only the parent hash later would omit its transitive sources and media.
    if (current.meta.kind === 'sku') {
      const parent = documents.get(current.meta.parent);
      if (!parent || parent.meta.kind !== 'spu') issues.push({ code: 'REFERENCE_TARGET_MISSING', documentId: current.meta.id, referenceId: 'parent' });
      else if (parent.meta.archived) issues.push({ code: 'REFERENCE_TARGET_ARCHIVED', documentId: current.meta.id, referenceId: 'parent' });
      else visit(parent);
    }
    for (const ref of resolveReferences(current, documents, effective)) {
      if (!ref.valid) { issues.push({ code: ref.code, documentId: current.meta.id, referenceId: ref.id, usedBy: ref.usedBy }); continue; }
      if (ref.documentId !== current.meta.id) visit(documents.get(ref.documentId));
    }
    active.delete(current.meta.id);
    collected.set(current.meta.id, current);
  };
  visit(document);
  if (strict && issues.length) fail('INVALID_INTERNAL_REFERENCE', { issues });
  return { documents: [...collected.values()], issues };
}
