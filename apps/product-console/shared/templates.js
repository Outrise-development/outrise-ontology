import { ProtocolError } from './protocol.js';

const copy = value => structuredClone(value);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const denied = (code, details) => { const error = new ProtocolError(code, details); error.status = 403; throw error; };
const booleanRules = ['can_add', 'can_delete', 'can_move', 'can_edit', 'can_hide'];
const sectionComponents = new Set(['overview', 'facts', 'strategies', 'assets', 'listings']);

/** A template is a live, single-parent projection. No inherited blocks are copied into entities. */
export function resolveTemplate(id, documents, { strictId } = {}) {
  const chain = [];
  const visiting = new Set();
  const visit = current => {
    if (visiting.has(current)) throw new ProtocolError('TEMPLATE_CYCLE', { id: current });
    const document = documents.get(current);
    if (!document || document.meta.kind !== 'template' || document.meta.archived) throw new ProtocolError('INVALID_TEMPLATE', { id: current });
    visiting.add(current);
    if (document.meta.extends) visit(document.meta.extends);
    chain.push(document);
    visiting.delete(current);
  };
  visit(id);
  const diagnostics = [];
  const warn = (owner, code, details) => {
    const issue = { code, templateId: owner.meta.id, ...details };
    if (owner.meta.id === strictId) denied(code, issue);
    diagnostics.push(issue);
  };
  const constrain = (parent = {}, own = {}, owner, context = {}) => {
    const result = { ...copy(parent), ...copy(own) };
    for (const key of booleanRules) if (parent[key] === false) {
      if (own[key] === true) warn(owner, 'TEMPLATE_PERMISSION_DENIED', { ...context, rule: key });
      result[key] = false;
    }
    if (parent.allowed_types) {
      if (own.allowed_types?.some(type => !parent.allowed_types.includes(type))) warn(owner, 'TEMPLATE_PERMISSION_DENIED', { ...context, rule: 'allowed_types' });
      result.allowed_types = own.allowed_types ? own.allowed_types.filter(type => parent.allowed_types.includes(type)) : [...parent.allowed_types];
    }
    if (parent.max_blocks !== undefined) {
      if (own.max_blocks > parent.max_blocks) warn(owner, 'TEMPLATE_PERMISSION_DENIED', { ...context, rule: 'max_blocks' });
      result.max_blocks = Math.min(parent.max_blocks, own.max_blocks ?? Infinity);
    }
    return result;
  };
  let meta = { regions: {}, sections: [], layout_permissions: { blocks: {}, sections: {} } };
  const blocks = new Map();
  for (const document of chain) {
    const own = document.meta;
    const parent = meta;
    if (own.layout_permissions !== undefined && (!object(own.layout_permissions) || Object.keys(own.layout_permissions).some(key => !['blocks', 'sections'].includes(key)) || Object.values(own.layout_permissions).some(value => !object(value)))) throw new ProtocolError('INVALID_LAYOUT_PERMISSION', { id: own.id });
    const applies = own.applies_to ?? (own.entity_kind ? [own.entity_kind] : undefined);
    if (applies && (!Array.isArray(applies) || applies.some(kind => typeof kind !== 'string'))) throw new ProtocolError('INVALID_TEMPLATE_APPLICABILITY', { id: own.id });
    if (parent.applies_to && applies?.some(kind => !parent.applies_to.includes(kind))) throw new ProtocolError('TEMPLATE_KIND_MISMATCH', { id: own.id });
    meta = { ...copy(parent), ...copy(own), applies_to: applies ?? parent.applies_to, regions: copy(parent.regions), sections: copy(parent.sections), layout_permissions: copy(parent.layout_permissions) };
    for (const [region, config] of Object.entries(own.regions ?? {})) meta.regions[region] = constrain(parent.regions[region], config, document, { region });
    for (const category of ['blocks', 'sections']) {
      for (const [target, rules] of Object.entries(own.layout_permissions?.[category] ?? {})) {
        if (!object(rules) || Object.keys(rules).some(key => !booleanRules.includes(key)) || Object.values(rules).some(value => typeof value !== 'boolean')) throw new ProtocolError('INVALID_LAYOUT_PERMISSION', { id: own.id, target });
        meta.layout_permissions[category][target] = constrain(parent.layout_permissions[category]?.[target], rules, document, { target });
      }
    }
    if (own.sections !== undefined && (!Array.isArray(own.sections) || own.sections.some(section => !object(section) || typeof section.key !== 'string') || new Set(own.sections.map(section => section.key)).size !== own.sections.length)) throw new ProtocolError('INVALID_TEMPLATE_SECTIONS', { id: own.id });
    for (const section of own.sections ?? []) {
      if (!sectionComponents.has(section.component ?? section.key)) throw new ProtocolError('INVALID_TEMPLATE_SECTION_COMPONENT', { id: own.id, section: section.key, component: section.component ?? section.key });
      if ((section.hidden !== undefined && typeof section.hidden !== 'boolean') || (section.order !== undefined && (!Number.isFinite(section.order) || section.order < 0))) throw new ProtocolError('INVALID_TEMPLATE_SECTIONS', { id: own.id, section: section.key });
      const index = meta.sections.findIndex(item => item.key === section.key);
      if (index >= 0) {
        const changes = copy(section);
        const rules = parent.layout_permissions.sections[section.key] ?? {};
        if (changes.component !== undefined && changes.component !== (meta.sections[index].component ?? section.key) && rules.can_edit !== true) { warn(document, 'TEMPLATE_PERMISSION_DENIED', { section: section.key, rule: 'can_edit' }); delete changes.component; }
        if (changes.hidden !== undefined && rules.can_hide !== true) { warn(document, 'TEMPLATE_PERMISSION_DENIED', { section: section.key, rule: 'can_hide' }); delete changes.hidden; }
        if (changes.order !== undefined && rules.can_move !== true) { warn(document, 'TEMPLATE_PERMISSION_DENIED', { section: section.key, rule: 'can_move' }); delete changes.order; }
        meta.sections[index] = { ...meta.sections[index], ...changes };
      }
      else if (parent.extendable === false) warn(document, 'TEMPLATE_EXTENSION_DENIED', { section: section.key });
      else meta.sections.push(copy(section));
    }
    for (const block of document.blocks) {
      if (blocks.has(block.id)) throw new ProtocolError('TEMPLATE_EXPLICIT_OVERRIDE_REQUIRED', { id: own.id, blockId: block.id });
      if (parent.extendable === false) { warn(document, 'TEMPLATE_EXTENSION_DENIED', { blockId: block.id }); continue; }
      blocks.set(block.id, { ...copy(block), sourceTemplate: own.id, sourcePolicies: block.attrs.policy ? [block.attrs.policy] : [] });
    }
    if (own.overrides !== undefined && !object(own.overrides)) throw new ProtocolError('INVALID_TEMPLATE_OVERRIDES', { id: own.id });
    for (const [blockId, change] of Object.entries(own.overrides ?? {})) {
      const original = blocks.get(blockId);
      if (!original || !object(change)) { warn(document, 'TEMPLATE_OVERRIDE_TARGET_MISSING', { blockId }); continue; }
      if (Object.keys(change).some(key => !['attrs', 'content', 'remove'].includes(key))) throw new ProtocolError('INVALID_TEMPLATE_OVERRIDE', { blockId });
      const rules = parent.layout_permissions.blocks[blockId] ?? {};
      if (change.remove) {
        if (rules.can_delete !== true) warn(document, 'TEMPLATE_PERMISSION_DENIED', { blockId, rule: 'can_delete' });
        else blocks.delete(blockId);
        continue;
      }
      if (change.attrs !== undefined && !object(change.attrs)) throw new ProtocolError('INVALID_TEMPLATE_OVERRIDE', { blockId });
      const attrs = { ...original.attrs, ...copy(change.attrs ?? {}) };
      if (change.attrs?.id && change.attrs.id !== blockId) throw new ProtocolError('INVALID_TEMPLATE_OVERRIDE', { blockId });
      if (change.attrs?.bind !== undefined && change.attrs.bind !== original.attrs.bind && (rules.can_edit !== true || [false, 'false'].includes(original.attrs.editable))) {
        warn(document, 'TEMPLATE_PERMISSION_DENIED', { blockId, rule: 'can_edit' });
        if (original.attrs.bind === undefined) delete attrs.bind; else attrs.bind = original.attrs.bind;
      }
      for (const key of ['editable', 'can_move', 'can_delete']) if (original.attrs[key] === false || original.attrs[key] === 'false') {
        if (change.attrs?.[key] === true || change.attrs?.[key] === 'true') warn(document, 'TEMPLATE_PERMISSION_DENIED', { blockId, rule: key });
        attrs[key] = original.attrs[key];
      }
      for (const [attribute, permission] of [['hidden', 'can_hide'], ['order', 'can_move']]) if (change.attrs?.[attribute] !== undefined && rules[permission] !== true) {
        warn(document, 'TEMPLATE_PERMISSION_DENIED', { blockId, rule: permission });
        if (original.attrs[attribute] === undefined) delete attrs[attribute]; else attrs[attribute] = original.attrs[attribute];
      }
      let content = original.content;
      if (change.content !== undefined) {
        if (rules.can_edit !== true || original.attrs.editable === 'false' || original.attrs.editable === false) warn(document, 'TEMPLATE_PERMISSION_DENIED', { blockId, rule: 'can_edit' });
        else content = String(change.content);
      }
      blocks.set(blockId, { ...original, attrs, content, sourcePolicies: [...new Set([...(original.sourcePolicies ?? []), attrs.policy].filter(Boolean))], overriddenBy: own.id });
    }
    if (parent.extendable === false) meta.extendable = false;
  }
  for (const block of blocks.values()) {
    // An unconfigured region is intentionally closed: composeTemplate retains its content as unplaced.
    if (block.attrs.bind && !/^(fields(?:\.[\w.-]+)?|document(?:\.[\w.-]+)?|related\.(assets|strategies|listings|children)|sources)$/.test(block.attrs.bind)) throw new ProtocolError('INVALID_TEMPLATE_BINDING', { id, blockId: block.id });
    for (const policyId of block.sourcePolicies ?? []) if (documents.get(policyId)?.meta.kind !== 'policy') throw new ProtocolError('INVALID_POLICY', { id: policyId, template: id, blockId: block.id });
  }
  for (const document of chain) if (document.meta.policy && documents.get(document.meta.policy)?.meta.kind !== 'policy') throw new ProtocolError('INVALID_POLICY', { id: document.meta.policy, template: document.meta.id });
  return { meta, blocks: [...blocks.values()], policies: [...new Set(chain.map(item => item.meta.policy).filter(Boolean))], chain: chain.map(item => ({ id: item.meta.id, name: item.meta.name, revision: item.revision })), diagnostics };
}

/** Only explicitly granted presentation adjustments are applied. Stale overrides remain in source MD. */
export function applyLayoutOverrides(template, overrides = {}, { strict = false } = {}) {
  if (!object(overrides) || Object.keys(overrides).some(key => !['blocks', 'sections'].includes(key))) throw new ProtocolError('INVALID_LAYOUT_OVERRIDES');
  const result = copy(template);
  result.diagnostics = [...(result.diagnostics ?? [])];
  const apply = (category, items, keyName) => {
    const changes = overrides[category] ?? {};
    if (!object(changes)) throw new ProtocolError('INVALID_LAYOUT_OVERRIDES');
    const adjusted = items.map((item, index) => {
      const configuredOrder = category === 'blocks' ? item.attrs?.order : item.order;
      const configuredHidden = category === 'blocks' ? item.attrs?.hidden : item.hidden;
      return { ...item, _order: configuredOrder !== undefined && Number.isFinite(Number(configuredOrder)) ? Number(configuredOrder) : index, _hidden: configuredHidden === true || configuredHidden === 'true' };
    });
    for (const [id, change] of Object.entries(changes)) {
      const item = adjusted.find(candidate => candidate[keyName] === id);
      const rules = result.meta.layout_permissions?.[category]?.[id] ?? {};
      let code;
      if (!object(change) || Object.keys(change).some(key => !['hidden', 'order'].includes(key)) || (change.hidden !== undefined && typeof change.hidden !== 'boolean') || (change.order !== undefined && (!Number.isFinite(change.order) || change.order < 0))) throw new ProtocolError('INVALID_LAYOUT_OVERRIDES', { id });
      if (!item) code = 'LAYOUT_TARGET_MISSING';
      else if ((change.hidden !== undefined && (!rules.can_hide || [false, 'false'].includes(item.attrs?.can_hide))) || (change.order !== undefined && (!rules.can_move || [false, 'false'].includes(item.attrs?.can_move)))) code = 'LAYOUT_PERMISSION_DENIED';
      if (code) {
        if (strict) denied(code, { id, category });
        result.diagnostics.push({ code, id, category });
      } else { if (change.hidden !== undefined) item._hidden = change.hidden; if (change.order !== undefined) item._order = change.order; }
    }
    return adjusted.filter(item => !item._hidden).sort((a, b) => a._order - b._order).map(({ _order, _hidden, ...item }) => item);
  };
  result.blocks = apply('blocks', result.blocks, 'id');
  result.meta.sections = apply('sections', result.meta.sections ?? [], 'key');
  return result;
}
