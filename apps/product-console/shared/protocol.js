import { parseDocument as parseYaml } from 'yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';

export class ProtocolError extends Error {
  constructor(code, details = []) {
    super(code);
    this.code = code;
    this.details = Array.isArray(details) ? details : [details];
    this.status = 422;
  }
}

const parser = unified().use(remarkParse).use(remarkDirective);
const knownTypes = new Set(['fields', 'richtext', 'gallery', 'listing', 'notice', 'region', 'asset', 'relations']);
const eolOf = (raw) => raw.includes('\r\n') ? '\r\n' : '\n';

function frontmatter(raw) {
  const match = /^(\uFEFF?)---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  if (!match) throw new ProtocolError('invalid_frontmatter', [{ line: 1 }]);
  const yaml = parseYaml(match[2], { keepSourceTokens: true, uniqueKeys: true });
  if (yaml.errors.length) throw new ProtocolError('invalid_yaml', yaml.errors.map((error) => ({ message: error.message, line: (error.linePos?.[0]?.line ?? 0) + 1 })));
  const meta = yaml.toJS();
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw new ProtocolError('invalid_frontmatter');
  if (meta.format !== 'outrise/1' || !meta.id || !meta.kind) throw new ProtocolError('invalid_identity');
  return { yaml, meta, bodyOffset: match[0].length, bom: match[1], match };
}

/** Source offsets are UTF-16 string offsets, never UTF-8 byte offsets. */
export function parseDocument(raw) {
  const { meta, bodyOffset } = frontmatter(raw);
  const body = raw.slice(bodyOffset);
  const ast = parser.parse(body);
  const blocks = [];
  const diagnostics = [];
  const ids = new Set();
  for (const node of ast.children) {
    const start = bodyOffset + node.position.start.offset;
    const end = bodyOffset + node.position.end.offset;
    const source = raw.slice(start, end);
    if (!['containerDirective', 'leafDirective'].includes(node.type)) {
      if (/^\s*:::[A-Za-z]/m.test(source)) throw new ProtocolError('invalid_directive', [{ line: node.position.start.line }]);
      blocks.push({ id: `unknown-${start}`, type: 'unknown', attrs: {}, content: source, raw: source, start, end, contentStart: start, contentEnd: end });
      diagnostics.push({ code: 'unknown_content', severity: 'warning', line: node.position.start.line });
      continue;
    }
    const attrs = { ...(node.attributes || {}) };
    const id = attrs.id;
    if (!id || ids.has(id)) throw new ProtocolError(id ? 'duplicate_block_id' : 'missing_block_id', [{ id, line: node.position.start.line }]);
    ids.add(id);
    let contentStart = end;
    let contentEnd = end;
    if (node.type === 'containerDirective') {
      const openingEnd = source.indexOf('\n');
      const closing = /(?:\r?\n)[ \t]*:{3,}[ \t]*$/.exec(source);
      if (openingEnd === -1 || !closing) throw new ProtocolError('unclosed_directive', [{ id, line: node.position.start.line }]);
      if (node.children?.some((child) => ['containerDirective', 'leafDirective'].includes(child.type))) throw new ProtocolError('nested_business_block', [{ id }]);
      contentStart = start + openingEnd + 1;
      contentEnd = start + closing.index;
    }
    blocks.push({ id, type: node.name, attrs, content: raw.slice(contentStart, contentEnd), raw: source, start, end, contentStart, contentEnd });
    if (!knownTypes.has(node.name)) diagnostics.push({ code: 'unknown_block', blockId: id, severity: 'warning' });
  }
  return { meta, blocks, raw, bodyOffset, diagnostics };
}

function mutateMeta(raw, mutate) {
  const info = frontmatter(raw);
  mutate(info.yaml);
  const eol = eolOf(raw);
  const head = info.yaml.toString({ lineWidth: 0 }).replace(/\r?\n/g, eol).replace(/(?:\r?\n)+$/, '');
  return `${info.bom}---${eol}${head}${eol}---${eol}${raw.slice(info.bodyOffset)}`;
}

export function patchMetadata(raw, changes) {
  return mutateMeta(raw, (yaml) => {
    for (const [key, value] of Object.entries(changes || {})) {
      if (value === undefined) yaml.delete(key);
      else yaml.set(key, value);
    }
  });
}

export function patchFields(raw, changes, unset = []) {
  return mutateMeta(raw, (yaml) => {
    if (!yaml.has('fields')) yaml.set('fields', {});
    for (const [key, value] of Object.entries(changes || {})) yaml.setIn(['fields', key], value);
    for (const key of unset) yaml.deleteIn(['fields', key]);
  });
}

function getBlock(raw, id) {
  const block = parseDocument(raw).blocks.find((item) => item.id === id);
  if (!block) throw new ProtocolError('block_not_found', [{ id }]);
  return block;
}

export function updateBlock(raw, id, content) {
  const original = parseDocument(raw);
  const block = getBlock(raw, id);
  if (block.contentStart === block.end || block.type === 'unknown') throw new ProtocolError('block_not_editable', [{ id }]);
  const normalized = String(content).replace(/\r?\n/g, eolOf(raw));
  const candidate = raw.slice(0, block.contentStart) + normalized + raw.slice(block.contentEnd);
  const parsed = parseDocument(candidate);
  const edited = parsed.blocks.find((item) => item.id === id);
  // A rich-text save cannot close its wrapper and smuggle new business blocks.
  if (parsed.blocks.length !== original.blocks.length || edited?.content !== normalized || parsed.blocks.some((item, index) => item.id !== id && item.raw !== original.blocks[index].raw)) throw new ProtocolError('invalid_block_content', [{ id }]);
  return candidate;
}

function directiveAttrs(attrs) {
  return Object.entries(attrs).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => {
    if (!/^[\w-]+$/.test(key)) throw new ProtocolError('invalid_attribute', [{ key }]);
    return `${key}=${JSON.stringify(String(value))}`;
  }).join(' ');
}

export function addBlock(raw, { id, type = 'richtext', attrs = {}, content = '' }) {
  if (!/^[A-Za-z0-9_-]+$/.test(id || '') || !/^[A-Za-z][\w-]*$/.test(type)) throw new ProtocolError('invalid_block');
  const eol = eolOf(raw);
  const attributes = directiveAttrs({ ...attrs, id });
  const suffix = raw.endsWith(eol + eol) ? '' : raw.endsWith(eol) ? eol : eol + eol;
  const normalized = String(content).replace(/\r?\n/g, eol);
  const candidate = `${raw}${suffix}:::${type}{${attributes}}${eol}${normalized}${eol}:::${eol}`;
  const parsed = parseDocument(candidate);
  if (parsed.blocks.length !== parseDocument(raw).blocks.length + 1 || parsed.blocks.at(-1)?.id !== id || parsed.blocks.at(-1)?.content !== normalized) throw new ProtocolError('invalid_block_content', [{ id }]);
  return candidate;
}

export function removeBlock(raw, id) {
  const block = getBlock(raw, id);
  return raw.slice(0, block.start) + raw.slice(block.end);
}

export function moveBlock(raw, id, { region, beforeId } = {}) {
  const block = getBlock(raw, id);
  let fragment = block.raw;
  if (region !== undefined && region !== block.attrs.region) {
    const lineEnd = fragment.search(/\r?\n/);
    const opening = fragment.startsWith(':::') ? ':::' : '::';
    fragment = `${opening}${block.type}{${directiveAttrs({ ...block.attrs, region })}}${lineEnd === -1 ? '' : fragment.slice(lineEnd)}`;
  }
  const removed = removeBlock(raw, id);
  const anchor = beforeId && beforeId !== id ? getBlock(removed, beforeId).start : removed.length;
  const eol = eolOf(raw);
  const candidate = `${removed.slice(0, anchor)}${eol}${fragment}${eol}${removed.slice(anchor)}`;
  parseDocument(candidate);
  return candidate;
}

/** Templates are live view definitions, not copied into entity documents. */
export function composeTemplate(doc, template) {
  const fixed = [];
  const regions = [];
  const order = [];
  for (const block of template?.blocks || []) {
    if (block.type === 'region') { regions.push({ id: block.id, attrs: block.attrs, config: template.meta.regions?.[block.id] || {}, blocks: [] }); order.push({ kind: 'region', id: block.id }); }
    else { fixed.push(block); order.push({ kind: 'fixed', id: block.id }); }
  }
  const unplaced = [];
  for (const block of doc.blocks) {
    const region = regions.find((item) => item.id === block.attrs.region);
    const allowed = region?.config.allowed_types || [];
    const max = region?.config.max_blocks ?? Infinity;
    const reason = !knownTypes.has(block.type) ? 'unknown_block' : !region ? 'region_missing' : !allowed.includes(block.type) ? 'block_type_disallowed' : region.blocks.length >= max ? 'region_capacity' : null;
    if (reason) unplaced.push({ block, reason });
    else region.blocks.push(block);
  }
  return { fixed, regions, unplaced, order };
}

/** Missing SKU keys inherit. Explicit null is an ordinary override, validated by schema. */
export function resolveFields(doc, parent, schema) {
  const own = doc.meta.fields || {};
  const shared = doc.meta.kind === 'sku' ? parent?.meta.fields || {} : {};
  const values = {};
  const sources = {};
  const overrides = [];
  const definitions = schema?.meta.fields || schema?.fields || {};
  for (const key of new Set([...Object.keys(shared), ...Object.keys(own)])) {
    const hasOwn = Object.hasOwn(own, key);
    if (!hasOwn && definitions[key]?.scope === 'sku') continue;
    const source = hasOwn ? doc : parent;
    const overridden = hasOwn && Object.hasOwn(shared, key) && doc.meta.kind === 'sku';
    values[key] = hasOwn ? own[key] : shared[key];
    sources[key] = { documentId: source?.meta.id, kind: source?.meta.kind, inherited: !hasOwn, overridden };
    if (overridden) overrides.push(key);
  }
  return { values, sources, overrides };
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortObject(value[key])]));
  return value;
}

/** Stable business projection: layout and review changes do not stale downstream content. */
export function businessContent(doc) {
  const ignored = new Set(['format', 'schema', 'template', 'policy', 'review', 'inputs', 'base_listing_revision', 'created_at', 'updated_at', 'capturedAt', 'confirmedAt']);
  const meta = Object.fromEntries(Object.entries(doc.meta).filter(([key]) => !ignored.has(key)));
  let unknownIndex = 0;
  const blocks = doc.blocks.map((block) => ({
    id: block.type === 'unknown' ? `unknown-content-${unknownIndex++}` : block.id,
    type: block.type,
    content: block.content,
    attrs: Object.fromEntries(Object.entries(block.attrs).filter(([key]) => !['region', 'policy', 'title_key', 'label_key'].includes(key))),
  })).sort((a, b) => a.id.localeCompare(b.id));
  return sortObject({ meta, blocks });
}

export function fieldIssues(values, schema, { kind, forConfirmation = false } = {}) {
  const issues = [];
  const definitions = schema?.meta.fields || schema?.fields || {};
  for (const [key, definition] of Object.entries(definitions)) {
    if (kind !== 'sku' && definition.scope === 'sku') continue;
    if (kind === 'sku' && definition.scope === 'spu') continue;
    const value = values[key];
    if (value === undefined || value === '') {
      if (forConfirmation && definition.required) issues.push({ code: 'required_field', field: key });
      continue;
    }
    if (value === null) {
      if (!definition.nullable) issues.push({ code: 'field_not_nullable', field: key });
      continue;
    }
    const valid = ({
      string: () => typeof value === 'string',
      number: () => typeof value === 'number' && Number.isFinite(value),
      boolean: () => typeof value === 'boolean',
      array: () => Array.isArray(value),
      quantity: () => value && typeof value.value === 'number' && Number.isFinite(value.value) && typeof value.unit === 'string' && value.unit.length > 0,
      object: () => value && typeof value === 'object' && !Array.isArray(value),
    }[definition.type] || (() => false))();
    if (!valid) issues.push({ code: 'invalid_field_type', field: key, expected: definition.type });
    if (definition.options && !definition.options.includes(value)) issues.push({ code: 'invalid_field_option', field: key });
  }
  return issues;
}
