import React, { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Select, Space, Tabs, Tag, Upload } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, CheckOutlined, CloudUploadOutlined, CodeOutlined, CopyOutlined, DownloadOutlined, ExportOutlined, FileTextOutlined, PlusOutlined, SaveOutlined, SwapOutlined } from '@ant-design/icons';
import { useConsole, useDirty, useDocument } from '../context';
import { download, labelOf, listOf, metaOf, request, summaryOf, textValue } from '../api';
import { EmptyState, ErrorNotice, Loading, SectionHeader, Status } from './Common';
import BlockCanvas from './BlockCanvas';
import FieldsPanel from './FieldsPanel';
import { RecordHeader } from './DocumentTools';
import { MediaPreview } from './AssetsPane';
import DiffView from './DiffView';
import DocumentCanvas from './DocumentCanvas';
import { parseDocument } from '../../shared/protocol';

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
  return <section className="panel"><SectionHeader title={t('tabs.inputs')} subtitle={t('listing.inputs_hint')} extra={<Button type="primary" size="small" icon={<SaveOutlined />} disabled={!dirty} loading={busy} onClick={async () => { setBusy(true); setError(null); try { await mutate(document.meta.id, document.revision, { operation: 'metadata', changes: values }); setDirty(false); await onSaved(); } catch (failure) { setError(failure); } finally { setBusy(false); } }}>{t('actions.save')}</Button>} /><ErrorNotice error={error} /><div className="input-bindings">{selectors.map(([key, multiple, options]) => <div className="binding-field" key={key}><label>{t(`listing.${key}`)}</label><Select mode={multiple ? 'multiple' : undefined} value={values[key]} onChange={(value) => choose(key, value)} options={options} placeholder={t('ui.select')} showSearch optionFilterProp="label" /></div>)}</div><div className="input-version-box"><h4>{t('listing.input_versions')}</h4><pre>{textValue(document.meta.inputs || [])}</pre></div></section>;
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
  return <section className="panel"><SectionHeader title={t('tabs.variants')} subtitle={t('listing.override_hint')} extra={<Button type="primary" size="small" icon={<SaveOutlined />} loading={busy} disabled={!dirty} onClick={async () => { setBusy(true); setError(null); try { await mutate(document.meta.id, document.revision, { operation: 'metadata', changes: { variant_fields: variants } }); setDirty(false); onSaved(); } catch (failure) { setError(failure); } finally { setBusy(false); } }}>{t('actions.save')}</Button>} /><ErrorNotice error={error} /><Select className="variant-selector" value={selected} onChange={setSelected} options={document.meta.skus.map((id) => ({ value: id, label: labelOf(catalog.find((item) => item.id === id)) || id }))} />{keys.map((key) => <div className="variant-field" key={key}><label>{t(`fields.${key}`)}</label><div>{Array.isArray(document.meta.fields?.[key]) ? <Select mode="tags" value={variants[selected]?.[key] || document.meta.fields[key]} onChange={(value) => set(key, value)} /> : <Input value={variants[selected]?.[key] ?? document.meta.fields?.[key] ?? ''} onChange={(event) => set(key, event.target.value)} />}<span className="field-help">{Object.hasOwn(variants[selected] || {}, key) ? t('fields.override') : t('fields.inherited')}</span></div><Button size="small" type="text" disabled={!Object.hasOwn(variants[selected] || {}, key)} onClick={() => { setVariants((current) => { const next = { ...current, [selected]: { ...current[selected] } }; delete next[selected][key]; return next; }); setDirty(true); }}>{t('actions.restore')}</Button></div>)}</section>;
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
  return <section className="panel"><SectionHeader title={t('tabs.media')} subtitle={t('listing.media_hint')} extra={<Button type="primary" size="small" icon={<SaveOutlined />} disabled={!dirty} loading={busy} onClick={async () => { setBusy(true); try { await mutate(document.meta.id, document.revision, { operation: 'metadata', changes: { assets: ids } }); setDirty(false); onSaved(); } catch (failure) { setError(failure); } finally { setBusy(false); } }}>{t('actions.save')}</Button>} /><ErrorNotice error={error} /><Select mode="multiple" value={ids} options={catalog.filter((item) => item.kind === 'asset').map((item) => ({ value: item.id, label: labelOf(item) }))} onChange={(value) => { setIds(value); setDirty(true); }} className="media-selection" /><div className="ordered-media">{ids.map((id, index) => { const asset = catalog.find((item) => item.id === id) || { id }; return <div className="ordered-media-row" key={id}><span className="media-order">{String(index + 1).padStart(2, '0')}</span><MediaPreview asset={asset} small /><div className="ordered-media-name"><strong>{labelOf(asset)}</strong><code>{id}</code></div><Space><Button size="small" title={t('actions.move_up')} icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => move(index, -1)} /><Button size="small" title={t('actions.move_down')} icon={<ArrowDownOutlined />} disabled={index === ids.length - 1} onClick={() => move(index, 1)} /></Space></div>; })}</div></section>;
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
  const { t, notify } = useConsole();
  const document = resolved.document;
  const [raw, setRaw] = useState('');
  const [importing, setImporting] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [baseRevision, setBaseRevision] = useState('');
  const [baseInputs, setBaseInputs] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const items = resolved.related?.proposals || [];
  return <section className="panel"><SectionHeader title={t('tabs.proposals')} subtitle={t('listing.proposal_hint')} icon={<SwapOutlined />} extra={<Button icon={<CloudUploadOutlined />} onClick={() => { setImporting(true); setError(null); }}>{t('actions.import_proposal')}</Button>} /><ErrorNotice error={error} />{!items.length ? <EmptyState label="proposals.empty" /> : <div className="proposal-list">{items.map((item) => <div className="proposal-row" key={item.id}><FileTextOutlined /><div><strong>{item.name || item.id}</strong><code>{item.baseRevision?.slice(0, 12)}</code></div><Button size="small" onClick={async () => { try { setProposal(await request(`/api/proposals/${encodeURIComponent(item.id)}`)); setError(null); } catch (failure) { setError(failure); } }}>{t('proposals.review')}</Button></div>)}</div>}
    <Modal title={t('proposals.import_title')} open={importing} width={800} onCancel={() => setImporting(false)} okText={t('actions.import_proposal')} cancelText={t('actions.cancel')} confirmLoading={busy} onOk={async () => { setBusy(true); try { const candidate = parseDocument(raw); const actualBase = candidate.meta.base_listing_revision || baseRevision.trim(); if (!actualBase) throw { code: 'PROPOSAL_BASE_REQUIRED', details: t('proposals.base_missing') }; const inputs = candidate.meta.inputs || (baseInputs.trim() ? JSON.parse(baseInputs) : undefined); if (!inputs) throw { code: 'PROPOSAL_INPUTS_REQUIRED' }; const result = await request(`/api/listings/${encodeURIComponent(document.meta.id)}/proposals`, { method: 'POST', body: { raw, baseRevision: actualBase, inputs } }); setImporting(false); setRaw(''); setBaseRevision(''); setBaseInputs(''); onSaved(); setProposal(await request(`/api/proposals/${encodeURIComponent(result.id)}`)); } catch (failure) { setError(failure.code ? failure : { code: 'INVALID_FIELDS', details: failure.message }); } finally { setBusy(false); } }}><Alert type="info" showIcon message={t('proposals.provenance_hint')} /><ErrorNotice error={error} /><Upload beforeUpload={async (file) => { setRaw(await file.text()); return false; }} showUploadList={false} accept=".md"><Button icon={<CloudUploadOutlined />}>{t('actions.upload')}</Button></Upload><Input.TextArea className="proposal-input code-input" rows={14} value={raw} onChange={(event) => setRaw(event.target.value)} placeholder={t('proposals.raw')} /><div className="modal-form"><label htmlFor="proposal-base-revision">{t('proposals.base_revision')}</label><Input id="proposal-base-revision" value={baseRevision} onChange={(event) => setBaseRevision(event.target.value)} /><label htmlFor="proposal-base-inputs">{t('proposals.inputs')}</label><Input.TextArea id="proposal-base-inputs" className="code-input" rows={3} value={baseInputs} onChange={(event) => setBaseInputs(event.target.value)} /></div></Modal>
    <Modal title={t('proposals.review')} open={Boolean(proposal)} width={1180} onCancel={() => setProposal(null)} okText={t('actions.adopt')} cancelText={t('actions.cancel')} confirmLoading={busy} okButtonProps={{ disabled: proposal?.baseMatches === false }} onOk={async () => { setBusy(true); try { await request(`/api/proposals/${encodeURIComponent(proposal.id)}/adopt`, { method: 'POST', body: { expectedRevision: document.revision } }); setProposal(null); notify('app.adopted'); onSaved(); } catch (failure) { setError(failure); } finally { setBusy(false); } }}>{proposal && <><Alert type={proposal.baseMatches === false ? 'warning' : 'info'} showIcon message={t(proposal.baseMatches === false ? 'proposals.base_changed' : 'proposals.ready')} /><ErrorNotice error={error} /><DiffView before={proposal.beforeRaw || document.raw} after={proposal.afterRaw || proposal.raw} /></>}</Modal>
  </section>;
}

function ListingEditor({ resolved }) {
  const { t, refresh, guard, reportError } = useConsole();
  const [tab, setTab] = useState('content');
  const document = resolved.document;
  const exportFile = async (format) => { try { const result = await request(`/api/listings/${encodeURIComponent(document.meta.id)}/export?format=${format}`); download(typeof result === 'string' ? result : JSON.stringify(result, null, 2), `${document.meta.id}.${format}`, format === 'json' ? 'application/json' : undefined); } catch (failure) { reportError(failure); } };
  return <div className="record-editor"><RecordHeader resolved={resolved} onSaved={refresh} extra={<><Button size="small" icon={<ExportOutlined />} onClick={() => exportFile('md')}>{t('actions.export_md')}</Button><Button size="small" icon={<CodeOutlined />} onClick={() => exportFile('json')}>{t('actions.export_json')}</Button></>} />{resolved.stale?.stale && <Alert type="warning" showIcon message={t('listing.stale')} description={(resolved.stale.reasons || []).map((reason) => typeof reason === 'string' ? reason : textValue(reason)).join(' · ')} />}
    <Tabs className="detail-tabs" activeKey={tab} onChange={(key) => guard(() => setTab(key))} items={['content', 'inputs', 'variants', 'media', 'context', 'proposals'].map((key) => ({ key, label: t(`tabs.${key}`) }))} />
    {tab === 'content' && <DocumentCanvas resolved={resolved} onSaved={refresh} />}
    {tab === 'inputs' && <ListingInputs resolved={resolved} onSaved={refresh} />}{tab === 'variants' && <VariantFields resolved={resolved} onSaved={refresh} />}{tab === 'media' && <OrderedMedia resolved={resolved} onSaved={refresh} />}{tab === 'context' && <AgentContext resolved={resolved} onSaved={refresh} />}{tab === 'proposals' && <Proposals resolved={resolved} onSaved={refresh} />}
  </div>;
}

export default function ListingsPane({ resolved }) {
  const { t, guard, tick, setInspected, createRecord } = useConsole();
  const records = (resolved.related?.listings || []).map(summaryOf);
  const [selected, setSelected] = useState(records[0]?.id);
  useEffect(() => { if (!records.some((item) => item.id === selected)) setSelected(records[0]?.id); }, [resolved.document.meta.id, records.map((item) => item.id).join(',')]);
  const { data, loading, error } = useDocument(selected, tick);
  useEffect(() => { if (data) setInspected(data); }, [data, setInspected]);
  return <div><SectionHeader title={t('listing.title')} subtitle={t('listing.internal_draft')} extra={<Button icon={<PlusOutlined />} onClick={() => guard(() => createRecord('listing', { spu: resolved.document.meta.kind === 'sku' ? resolved.document.meta.parent : resolved.document.meta.id, skus: resolved.document.meta.kind === 'sku' ? [resolved.document.meta.id] : [] }))}>{t('actions.new_listing')}</Button>} />{!records.length ? <EmptyState label="listing.empty" /> : <><div className="platform-records">{records.map((item) => <button key={item.id} className={`platform-record ${selected === item.id ? 'active' : ''}`} onClick={() => guard(() => setSelected(item.id))}><span className={`platform-mark platform-${item.platform}`}><FileTextOutlined /></span><div><strong>{t(`platforms.${item.platform}`)}</strong><span>{labelOf(item)}</span></div><Status state={item.review?.state || 'draft'} compact /></button>)}</div><ErrorNotice error={error} />{loading && !data ? <Loading /> : data && <ListingEditor key={data.document.meta.id} resolved={data} />}</>}</div>;
}
