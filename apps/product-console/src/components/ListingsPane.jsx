import React, { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Select, Space, Tabs, Tag, Upload } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, CloudUploadOutlined, CodeOutlined, CopyOutlined, DownloadOutlined, EditOutlined, ExportOutlined, FileTextOutlined, PlusOutlined, SaveOutlined, SwapOutlined } from '@ant-design/icons';
import { useConsole, useDirty, useDocument } from '../context';
import { canHuman, download, labelOf, listOf, metaOf, request, summaryOf, textValue } from '../api';
import { EmptyState, ErrorNotice, Loading, SectionHeader, Status } from './Common';
import BlockCanvas from './BlockCanvas';
import { RecordHeader } from './DocumentTools';
import { MediaPreview } from './AssetsPane';
import DiffView from './DiffView';
import { parseDocument } from '../../shared/protocol';
import SemanticRelations, { ReferenceList, useSemanticSave } from './SemanticRelations';
import BriefsPane from './BriefsPane';

function InputVersions({ document }) {
  const { t, catalog, openSource } = useConsole();
  const sources = document.meta.inputs?.sources || [];
  return <div className="input-version-box"><h4>{t('listing.input_versions')}</h4>{sources.length ? <div className="semantic-table-wrap"><table className="semantic-table input-evidence-table"><thead><tr><th>{t('references.document')}</th><th>{t('listing.recorded_version')}</th><th>{t('listing.recorded_confirmation')}</th></tr></thead><tbody>{sources.map(source => <tr key={source.id}><td><Button type="link" size="small" onClick={() => openSource?.({ documentId: source.id })}>{labelOf(catalog.find(item => item.id === source.id)) || source.id}</Button></td><td><code>{(source.revision || source.sourceRevision || '').slice(0, 12)}</code></td><td>{t(source.confirmation || source.confirmedSnapshot || source.confirmationId ? 'listing.confirmation_recorded' : 'listing.confirmation_unrecorded')}</td></tr>)}</tbody></table></div> : <EmptyState label="listing.no_recorded_inputs" />}<details className="advanced-source"><summary>{t('listing.raw_manifest')}</summary><pre>{textValue(document.meta.inputs || {})}</pre></details></div>;
}

function ListingCopy({ resolved, onSaved }) {
  const { t, bootstrap, guard } = useConsole();
  const document = resolved.document;
  const schema = listOf(bootstrap.schemas).find(item => metaOf(item).id === document.meta.schema);
  const definitions = metaOf(schema).fields || {};
  const values = resolved.fields || document.meta.fields || {};
  const keys = [...new Set([...Object.keys(definitions).filter(key => !definitions[key].platforms || definitions[key].platforms.includes(document.meta.platform)), ...Object.keys(values)])];
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState('');
  const [dirty, setDirty] = useState(false);
  const save = useSemanticSave(resolved, onSaved);
  useDirty(`listing-copy-${document.meta.id}`, dirty);
  const editable = canHuman(bootstrap, document, 'fields');
  const close = () => { setEditing(null); setDirty(false); };
  const body = { ...resolved, layout: { ...resolved.layout, regions: (resolved.layout?.regions || []).map(region => ({ ...region, blocks: region.blocks.filter(block => block.type !== 'brief' && block.attrs?.purpose !== 'brief') })).filter(region => region.blocks.length || region.id !== 'briefs') } };
  return <div className="listing-stage-stack"><section className="panel"><SectionHeader title={t('listing.copy_title')} subtitle={t('listing.copy_hint')} /><ErrorNotice error={save.error} /><div className="semantic-table-wrap"><table className="semantic-table listing-copy-table"><thead><tr><th>{t('listing.field_count')}</th><th>{t('listing.current_copy')}</th><th>{t('listing.evidence_notes')}</th></tr></thead><tbody>{keys.map(key => {
    const current = values[key];
    const text = Array.isArray(current) ? current.join('\n') : textValue(current);
    const count = key === 'search_terms' ? new TextEncoder().encode(text).length : Array.from(text).length;
    return <tr key={key} data-field={key}><td><strong>{definitions[key]?.label_key ? t(definitions[key].label_key) : t(`fields.${key}`) === `fields.${key}` ? key : t(`fields.${key}`)}</strong><span className="field-count">{count} {t(key === 'search_terms' ? 'listing.bytes' : 'listing.characters')}</span></td><td>{editing === key ? <><Input.TextArea aria-label={definitions[key]?.label_key ? t(definitions[key].label_key) : key} autoSize={{ minRows: 3, maxRows: 16 }} value={value} onChange={event => { setValue(event.target.value); setDirty(true); }} />{definitions[key]?.type === 'array' && <small>{t('listing.one_per_line')}</small>}<Space><Button size="small" onClick={() => guard(close)}>{t('actions.cancel')}</Button><Button size="small" type="primary" loading={save.busy} onClick={() => save.perform({ operation: 'fields', changes: { [key]: definitions[key]?.type === 'array' ? value.split(/\r?\n/).filter(line => line.trim()) : value } }, close)}>{t('actions.save')}</Button></Space></> : <><div className="copy-value">{Array.isArray(current) ? <ul>{current.map((line, index) => <li key={index}>{textValue(line)}</li>)}</ul> : text || <span className="quiet-note">{t('listing.not_written')}</span>}</div>{editable && definitions[key] && definitions[key].editable !== false && ['string', 'array'].includes(definitions[key].type) && <Button size="small" type="text" aria-label={t('actions.edit')} icon={<EditOutlined />} onClick={() => guard(() => { setEditing(key); setValue(text); setDirty(false); })}>{t('actions.edit')}</Button>}</>}</td><td><ReferenceList resolved={resolved} usedBy={key} /></td></tr>;
  })}</tbody></table></div>{save.comparisonDialog}</section><BlockCanvas resolved={body} onSaved={onSaved} /><SemanticRelations resolved={resolved} onSaved={onSaved} /></div>;
}

function ProposalChanges({ before, after }) {
  const { t, catalog } = useConsole();
  let a, b;
  try { a = parseDocument(before); b = parseDocument(after); } catch { return <Alert type="warning" showIcon message={t('proposals.diff_unavailable')} />; }
  const rows = [];
  for (const field of new Set([...Object.keys(a.meta.fields || {}), ...Object.keys(b.meta.fields || {})])) {
    if (JSON.stringify(a.meta.fields?.[field]) !== JSON.stringify(b.meta.fields?.[field])) rows.push({ id: `field:${field}`, label: t(`fields.${field}`), before: textValue(a.meta.fields?.[field]), after: textValue(b.meta.fields?.[field]) });
  }
  for (const key of ['assets', 'skus', 'strategies', 'refs', 'variant_fields']) {
    if (JSON.stringify(a.meta[key]) === JSON.stringify(b.meta[key])) continue;
    const format = value => ['assets', 'skus', 'strategies'].includes(key) ? (value || []).map(id => labelOf(catalog.find(item => item.id === id)) || id).join('\n') : textValue(value);
    rows.push({ id: key, label: t(`listing.${key}`), before: format(a.meta[key]), after: format(b.meta[key]) });
  }
  for (const id of new Set([...a.blocks.map(block => block.id), ...b.blocks.map(block => block.id)])) {
    const left = a.blocks.find(block => block.id === id), right = b.blocks.find(block => block.id === id);
    if (left?.content !== right?.content) rows.push({ id: `block:${id}`, label: right?.attrs?.title || left?.attrs?.title || id, before: left?.content || '', after: right?.content || '' });
  }
  return rows.length ? <div className="semantic-table-wrap"><table className="semantic-table proposal-field-diff"><thead><tr><th>{t('proposals.changed_part')}</th><th>{t('proposals.current')}</th><th>{t('proposals.candidate')}</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.label}</td><td className="changed-before">{row.before}</td><td className="changed-after">{row.after}</td></tr>)}</tbody></table></div> : <EmptyState label="proposals.no_business_diff" />;
}

function ListingInputs({ resolved, onSaved }) {
  const { t, bootstrap, catalog, mutate } = useConsole();
  const document = resolved.document;
  const initial = () => Object.fromEntries(['spu', 'skus', 'strategies', 'assets', 'target'].map((key) => [key, document.meta[key] ?? (['skus', 'strategies', 'assets'].includes(key) ? [] : '')]));
  const [values, setValues] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { if (!dirty) setValues(initial()); }, [document.revision]);
  useDirty(`listing-inputs-${document.meta.id}`, dirty);
  const choose = (key, value) => { setValues((current) => ({ ...current, [key]: value, ...(key === 'spu' ? { skus: [] } : {}) })); setDirty(true); };
  const opts = (kind) => catalog.filter((item) => item.kind === kind && !item.archived).map((item) => ({ value: item.id, label: labelOf(item) }));
  const selectors = [
    ['spu', false, opts('spu')],
    ['skus', true, catalog.filter((item) => item.kind === 'sku' && item.parent === values.spu && !item.archived).map((item) => ({ value: item.id, label: labelOf(item) }))],
    ['strategies', true, opts('strategy')],
    ['assets', true, opts('asset')],
    ['target', false, listOf(bootstrap.targets).filter((item) => item.platform === document.meta.platform).map((item) => ({ value: item.id, label: item.name }))],
  ];
  return <section className="panel"><SectionHeader title={t('tabs.inputs')} subtitle={t('listing.inputs_hint')} extra={<Button type="primary" size="small" aria-label={t('actions.save')} icon={<SaveOutlined />} disabled={!dirty} loading={busy} onClick={async () => { setBusy(true); setError(null); try { await mutate(document.meta.id, document.revision, { operation: 'metadata', changes: values }); setDirty(false); await onSaved(); } catch (failure) { setError(failure); } finally { setBusy(false); } }}>{t('actions.save')}</Button>} /><ErrorNotice error={error} /><div className="input-bindings">{selectors.map(([key, multiple, options]) => <div className="binding-field" key={key}><label>{t(`listing.${key}`)}</label><Select mode={multiple ? 'multiple' : undefined} value={values[key]} onChange={(value) => choose(key, value)} options={options} placeholder={t('ui.select')} showSearch optionFilterProp="label" /></div>)}</div><InputVersions document={document} /></section>;
}

function VariantFields({ resolved, onSaved }) {
  const { t, catalog, mutate } = useConsole();
  const document = resolved.document;
  const [variants, setVariants] = useState(document.meta.variant_fields || {});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(document.meta.skus?.[0]);
  useDirty(`variants-${document.meta.id}`, dirty);
  useEffect(() => { if (!dirty) setVariants(document.meta.variant_fields || {}); }, [document.revision]);
  const keys = [...new Set(['title', ...Object.keys(document.meta.fields || {}), ...Object.keys(variants[selected] || {})])];
  const set = (key, value) => { setVariants((current) => ({ ...current, [selected]: { ...current[selected], [key]: value } })); setDirty(true); };
  if (!document.meta.skus?.length) return <EmptyState label="listing.no_variant" />;
  return <section className="panel"><SectionHeader title={t('tabs.variants')} subtitle={t('listing.override_hint')} extra={<Button type="primary" size="small" aria-label={t('actions.save')} icon={<SaveOutlined />} loading={busy} disabled={!dirty} onClick={async () => { setBusy(true); setError(null); try { await mutate(document.meta.id, document.revision, { operation: 'metadata', changes: { variant_fields: variants } }); setDirty(false); onSaved(); } catch (failure) { setError(failure); } finally { setBusy(false); } }}>{t('actions.save')}</Button>} /><ErrorNotice error={error} /><Select className="variant-selector" value={selected} onChange={setSelected} options={document.meta.skus.map((id) => ({ value: id, label: labelOf(catalog.find((item) => item.id === id)) || id }))} />{keys.map((key) => <div className="variant-field" key={key}><label>{t(`fields.${key}`)}</label><div>{Array.isArray(document.meta.fields?.[key]) ? <Select mode="tags" value={variants[selected]?.[key] || document.meta.fields[key]} onChange={(value) => set(key, value)} /> : <Input value={variants[selected]?.[key] ?? document.meta.fields?.[key] ?? ''} onChange={(event) => set(key, event.target.value)} />}<span className="field-help">{Object.hasOwn(variants[selected] || {}, key) ? t('fields.override') : t('fields.inherited')}</span></div><Button size="small" type="text" disabled={!Object.hasOwn(variants[selected] || {}, key)} onClick={() => { setVariants((current) => { const next = { ...current, [selected]: { ...current[selected] } }; delete next[selected][key]; return next; }); setDirty(true); }}>{t('actions.restore')}</Button></div>)}</section>;
}

function OrderedMedia({ resolved, onSaved }) {
  const { t, catalog, mutate } = useConsole();
  const document = resolved.document;
  const [ids, setIds] = useState(document.meta.assets || []);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useDirty(`media-${document.meta.id}`, dirty);
  useEffect(() => { if (!dirty) setIds(document.meta.assets || []); }, [document.revision]);
  const move = (index, offset) => { setIds((current) => { const next = [...current]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; }); setDirty(true); };
  return <section className="panel"><SectionHeader title={t('tabs.media')} subtitle={t('listing.media_hint')} extra={<Button type="primary" size="small" aria-label={t('actions.save')} icon={<SaveOutlined />} disabled={!dirty} loading={busy} onClick={async () => { setBusy(true); try { await mutate(document.meta.id, document.revision, { operation: 'metadata', changes: { assets: ids } }); setDirty(false); onSaved(); } catch (failure) { setError(failure); } finally { setBusy(false); } }}>{t('actions.save')}</Button>} /><ErrorNotice error={error} /><Select mode="multiple" optionFilterProp="label" value={ids} options={catalog.filter((item) => item.kind === 'asset').map((item) => ({ value: item.id, label: labelOf(item) }))} onChange={(value) => { setIds(value); setDirty(true); }} className="media-selection" /><div className="ordered-media">{ids.map((id, index) => { const asset = catalog.find((item) => item.id === id) || { id }; return <div className="ordered-media-row" key={id}><span className="media-order">{String(index + 1).padStart(2, '0')}</span><MediaPreview asset={asset} small /><div className="ordered-media-name"><strong>{labelOf(asset)}</strong><code>{id}</code></div><Space><Button size="small" title={t('actions.move_up')} icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => move(index, -1)} /><Button size="small" title={t('actions.move_down')} icon={<ArrowDownOutlined />} disabled={index === ids.length - 1} onClick={() => move(index, 1)} /></Space></div>; })}</div></section>;
}

function AgentContext({ resolved, onSaved }) {
  const { t, mutate, notify, reportError, hasDirty } = useConsole();
  const document = resolved.document;
  const [context, setContext] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const prepare = async () => { setBusy(true); setError(null); try { setContext(await request(`/api/listings/${encodeURIComponent(document.meta.id)}/context`)); } catch (failure) { setError(failure); } finally { setBusy(false); } };
  return <section className="panel"><SectionHeader title={t('listing.prepared_context')} subtitle={t('listing.context_hint')} icon={<CodeOutlined />} /><Alert type="info" showIcon message={t('listing.internal_draft')} description={t('listing.pending_validation')} /><ErrorNotice error={error} /><div className="context-actions"><Button type="primary" icon={<CodeOutlined />} loading={busy} disabled={hasDirty} onClick={prepare}>{t('actions.prepare_context')}</Button><Button icon={<SaveOutlined />} disabled={hasDirty} onClick={async () => { try { await mutate(document.meta.id, document.revision, { operation: 'captureInputs' }); onSaved(); } catch (failure) { setError(failure); } }}>{t('actions.capture_inputs')}</Button>{context && <><Button icon={<CopyOutlined />} onClick={async () => { try { await navigator.clipboard.writeText(context.markdown); notify('app.copied'); } catch (failure) { reportError({ code: 'clipboard', details: failure.message }); } }}>{t('actions.copy')}</Button><Button icon={<DownloadOutlined />} onClick={() => download(context.markdown, `${document.meta.id}-context.md`)}>{t('actions.download')}</Button></>}</div>{context ? <pre className="context-source">{context.markdown}</pre> : <EmptyState label="listing.generate_context_first" icon={<CodeOutlined />} />}</section>;
}

function Proposals({ resolved, onSaved }) {
  const { t, notify, guard, hasDirty } = useConsole();
  const document = resolved.document;
  const [raw, setRaw] = useState('');
  const [importing, setImporting] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [baseRevision, setBaseRevision] = useState('');
  const [baseInputs, setBaseInputs] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const items = resolved.related?.proposals || [];
  useDirty(`proposal-import-${document.meta.id}`, importing && Boolean(raw || baseRevision || baseInputs));
  return <section className="panel"><SectionHeader title={t('tabs.proposals')} subtitle={t('listing.proposal_hint')} icon={<SwapOutlined />} extra={<Button icon={<CloudUploadOutlined />} onClick={() => { setImporting(true); setError(null); }}>{t('actions.import_proposal')}</Button>} /><ErrorNotice error={error} />{!items.length ? <EmptyState label="proposals.empty" /> : <div className="proposal-list">{items.map((item) => <div className="proposal-row" key={item.id}><FileTextOutlined /><div><strong>{item.name || item.id}</strong><code>{item.baseRevision?.slice(0, 12)}</code></div><Button size="small" onClick={async () => { try { setProposal(await request(`/api/proposals/${encodeURIComponent(item.id)}`)); setError(null); } catch (failure) { setError(failure); } }}>{t('proposals.review')}</Button></div>)}</div>}
    <Modal title={t('proposals.import_title')} open={importing} width={800} onCancel={() => guard(() => { setImporting(false); setRaw(''); setBaseRevision(''); setBaseInputs(''); })} okText={t('actions.import_proposal')} cancelText={t('actions.cancel')} confirmLoading={busy} onOk={async () => { setBusy(true); try { const candidate = parseDocument(raw); const actualBase = candidate.meta.base_listing_revision || baseRevision.trim(); if (!actualBase) throw { code: 'PROPOSAL_BASE_REQUIRED', details: t('proposals.base_missing') }; const inputs = candidate.meta.inputs || (baseInputs.trim() ? JSON.parse(baseInputs) : undefined); if (!inputs) throw { code: 'PROPOSAL_INPUTS_REQUIRED' }; const result = await request(`/api/listings/${encodeURIComponent(document.meta.id)}/proposals`, { method: 'POST', body: { raw, baseRevision: actualBase, inputs } }); setImporting(false); setRaw(''); setBaseRevision(''); setBaseInputs(''); onSaved(); setProposal(await request(`/api/proposals/${encodeURIComponent(result.id)}`)); } catch (failure) { setError(failure.code ? failure : { code: 'INVALID_FIELDS', details: failure.message }); } finally { setBusy(false); } }}><Alert type="info" showIcon message={t('proposals.provenance_hint')} /><ErrorNotice error={error} /><Upload beforeUpload={async (file) => { setRaw(await file.text()); return false; }} showUploadList={false} accept=".md"><Button icon={<CloudUploadOutlined />}>{t('actions.upload')}</Button></Upload><Input.TextArea className="proposal-input code-input" rows={14} value={raw} onChange={(event) => setRaw(event.target.value)} placeholder={t('proposals.raw')} /><div className="modal-form"><label htmlFor="proposal-base-revision">{t('proposals.base_revision')}</label><Input id="proposal-base-revision" value={baseRevision} onChange={(event) => setBaseRevision(event.target.value)} /><label htmlFor="proposal-base-inputs">{t('proposals.inputs')}</label><Input.TextArea id="proposal-base-inputs" className="code-input" rows={3} value={baseInputs} onChange={(event) => setBaseInputs(event.target.value)} /></div></Modal>
    <Modal title={t('proposals.review')} open={Boolean(proposal)} width={1180} onCancel={() => setProposal(null)} okText={t('actions.adopt')} cancelText={t('actions.cancel')} confirmLoading={busy} okButtonProps={{ disabled: proposal?.baseMatches === false || hasDirty }} onOk={async () => { setBusy(true); try { await request(`/api/proposals/${encodeURIComponent(proposal.id)}/adopt`, { method: 'POST', body: { expectedRevision: document.revision } }); setProposal(null); notify('app.adopted'); onSaved(); } catch (failure) { setError(failure); } finally { setBusy(false); } }}>{proposal && <><Alert type={proposal.baseMatches === false ? 'warning' : 'info'} showIcon message={t(proposal.baseMatches === false ? 'proposals.base_changed' : 'proposals.ready')} /><ErrorNotice error={error} /><ProposalChanges before={proposal.beforeRaw || document.raw} after={proposal.afterRaw || proposal.raw} /><details className="advanced-source"><summary>{t('proposals.raw_diff')}</summary><DiffView before={proposal.beforeRaw || document.raw} after={proposal.afterRaw || proposal.raw} /></details></>}</Modal>
  </section>;
}

function ListingEditor({ resolved, standalone = false }) {
  const { t, refresh, guard, reportError, route, setRoute } = useConsole();
  const [localTab, setLocalTab] = useState('content');
  const document = resolved.document;
  const registered = { preparation: () => <><ListingInputs resolved={resolved} onSaved={refresh} /><VariantFields resolved={resolved} onSaved={refresh} /></>, content: () => <ListingCopy resolved={resolved} onSaved={refresh} />, creative: () => <><OrderedMedia resolved={resolved} onSaved={refresh} /><BriefsPane resolved={resolved} onSaved={refresh} /><SemanticRelations resolved={resolved} onSaved={refresh} /></>, review: () => <><Proposals resolved={resolved} onSaved={refresh} /><AgentContext resolved={resolved} onSaved={refresh} /></> };
  const sections = (resolved.template?.meta?.listing_sections || Object.keys(registered).map(key => ({ key, label_key: `listing.stage_${key}` }))).filter(section => registered[section.component || section.key]);
  const selectedTab = route?.panel || localTab;
  const tab = sections.find(section => section.key === selectedTab)?.key || sections[0]?.key;
  const active = sections.find(section => section.key === tab);
  const exportFile = async format => { try { const result = await request(`/api/listings/${encodeURIComponent(document.meta.id)}/export?format=${format}`); download(typeof result === 'string' ? result : JSON.stringify(result, null, 2), `${document.meta.id}.${format}`, format === 'json' ? 'application/json' : undefined); } catch (failure) { reportError(failure); } };
  const exports = <><Button size="small" icon={<ExportOutlined />} onClick={() => exportFile('md')}>{t('actions.export_md')}</Button><Button size="small" icon={<CodeOutlined />} onClick={() => exportFile('json')}>{t('actions.export_json')}</Button></>;
  return <div className="record-editor">{standalone ? <div className="semantic-actions"><Space>{exports}</Space></div> : <RecordHeader resolved={resolved} onSaved={refresh} extra={exports} />}{resolved.stale?.stale && <Alert type="warning" showIcon message={t('listing.stale')} description={t('listing.stale_action')} />}
    <Tabs className="detail-tabs" activeKey={tab} onChange={key => setRoute ? setRoute({ listing: document.meta.id, panel: key }) : guard(() => setLocalTab(key))} items={sections.map(section => ({ key: section.key, label: t(section.label_key || `listing.stage_${section.key}`) }))} />
    <div className="listing-stage-stack">{active && registered[active.component || active.key]()}</div>
  </div>;
}

export default function ListingsPane({ resolved }) {
  const { t, guard, tick, setInspected, createRecord, route, setRoute } = useConsole();
  const self = resolved.document.meta.kind === 'listing';
  const records = (self ? [resolved.document] : resolved.related?.listings || []).map(summaryOf);
  const [localSelected, setLocalSelected] = useState(records[0]?.id);
  const selected = records.some(item => item.id === route?.listing) ? route.listing : records.some(item => item.id === localSelected) ? localSelected : records[0]?.id;
  const { data: fetched, loading, error } = useDocument(self ? null : selected, tick);
  const data = self ? resolved : fetched?.document.meta.id === selected ? fetched : null;
  useEffect(() => { if (data) setInspected(data); }, [data, setInspected]);
  const product = resolved.document.meta.kind === 'sku' ? resolved.document.meta.parent : resolved.document.meta.kind === 'spu' ? resolved.document.meta.id : undefined;
  return <div>{!self && <SectionHeader title={t('listing.title')} subtitle={t('listing.internal_draft')} extra={<Button icon={<PlusOutlined />} onClick={() => guard(() => createRecord('listing', { ...(product ? { spu: product } : {}), skus: resolved.document.meta.kind === 'sku' ? [resolved.document.meta.id] : [] }))}>{t('actions.new_listing')}</Button>} />}{!records.length ? <EmptyState label="listing.empty" /> : <>{!self && <div className="platform-records">{records.map(item => <button key={item.id} className={`platform-record ${selected === item.id ? 'active' : ''}`} onClick={() => setRoute ? setRoute({ listing: item.id, panel: 'content' }) : guard(() => setLocalSelected(item.id))}><span className={`platform-mark platform-${item.platform}`}><FileTextOutlined /></span><div><strong>{t(`platforms.${item.platform}`)}</strong><span>{labelOf(item)}</span></div><Status state={item.review?.state || 'draft'} compact /></button>)}</div>}<ErrorNotice error={error} />{loading && !data ? <Loading /> : data && <ListingEditor key={data.document.meta.id} resolved={data} standalone={self} />}</>}</div>;
}
