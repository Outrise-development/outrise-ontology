import React, { useEffect, useState } from 'react';
import { Button, Collapse, Drawer, Modal, Select, Space, Tabs, Tag } from 'antd';
import { CheckCircleOutlined, CodeOutlined, CopyOutlined, DownloadOutlined, LinkOutlined } from '@ant-design/icons';
import { useConsole, useDocument } from '../context';
import { download, labelOf, listOf, textValue } from '../api';
import { request } from '../api';
import { DiagnosticList, ErrorNotice, Loading, Markdown, Status } from './Common';
import DiffView from './DiffView';

export default function Inspector({ resolved }) {
  const { t, catalog, tick, navigate, notify, reportError, route, setRoute, openSource } = useConsole();
  const { data: fetched, loading, error: fetchError } = useDocument(route.source, tick);
  const current = fetched || (resolved?.document.meta.id === route.source ? resolved : null);
  const [tab, setTab] = useState('source');
  const [rawOpen, setRawOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const document = current?.document;
  useEffect(() => { let active = true; setHistory([]); setError(null); if (document?.meta.id) request(`/api/documents/${encodeURIComponent(document.meta.id)}/history`).then(result => { if (active) setHistory(listOf(result.data || result)); }).catch(failure => { if (active) setError(failure); }); return () => { active = false; }; }, [document?.meta.id, document?.revision, tick]);
  useEffect(() => { setSelected(null); setRawOpen(false); setTab('source'); }, [route.source]);
  const sources = current?.sources || {};
  const sourceEntries = Object.entries(sources).filter(([field]) => !route.sourceField || field === route.sourceField);
  const block = document?.blocks?.find(item => item.id === route.sourceBlock);
  const references = (current?.references || []).filter(ref => !route.sourceField && !route.sourceBlock || ref.usedBy === route.sourceField || ref.usedBy === route.sourceBlock);
  const date = value => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : t('fields.unspecified');
  const close = () => setRoute({ source: undefined, sourceField: undefined, sourceBlock: undefined }, { guarded: false });
  return <><Drawer open={Boolean(route.source)} width={560} title={t('inspector.title')} onClose={close} className="source-drawer" destroyOnClose>{!document ? fetchError ? <ErrorNotice error={fetchError} /> : <Loading /> : <><div className="inspector-summary"><span className="eyebrow">{t(`kinds.${document.meta.kind}`)}</span><strong>{labelOf(document)}</strong><div className="inspector-status"><Status state={current.review?.state || 'waiting'} /><Button size="small" onClick={() => navigate(document.meta.id, { section: route.sourceField || route.sourceBlock ? 'facts' : undefined })}>{t('workbench.open_record')}</Button></div></div>
    <Tabs size="small" activeKey={tab} onChange={setTab} items={['source', 'history'].map(key => ({ key, label: t(`inspector.${key}`) }))} />
    {tab === 'source' ? <><section className="inspector-section"><h4>{t('inspector.source')}</h4>{sourceEntries.length ? sourceEntries.map(([field, source]) => <div className="source-entry" key={field}><div><strong>{t(`fields.${field}`) === `fields.${field}` ? field : t(`fields.${field}`)}</strong><Tag>{t(source.inherited ? 'fields.inherited' : source.overridden ? 'fields.override' : 'fields.local')}</Tag></div><p>{textValue(current.fields?.[field])}</p><button onClick={() => openSource({ documentId: source.documentId, field })}><LinkOutlined />{labelOf(catalog.find(item => item.id === source.documentId)) || source.documentId}</button></div>) : !block && <div className="quiet-note">{t('inspector.unknown_source')}</div>}{block && <div className="source-block"><h4>{block.attrs.title_key ? t(block.attrs.title_key) : block.attrs.title || block.id}</h4><Markdown>{block.content}</Markdown></div>}</section>
    {!!references.length && <section className="inspector-section"><h4>{t('inspector.references')}</h4>{references.map((ref,index) => <div className="source-entry" key={ref.id || index}><Button type="link" disabled={!ref.valid} onClick={() => openSource({ documentId: ref.documentId, field: ref.field, blockId: ref.blockId })}>{ref.target?.name || ref.documentId}</Button>{ref.note && <p>{ref.note}</p>}{!ref.valid && <Tag color="orange">{t(`errors.${ref.code}`) === `errors.${ref.code}` ? ref.code : t(`errors.${ref.code}`)}</Tag>}</div>)}</section>}
    <section className="inspector-section"><h4>{t('inspector.diagnostics')}</h4><DiagnosticList diagnostics={[...(current.diagnostics || []), ...(current.templateDiagnostics || [])]} />{(current.issues || document.meta.issues || []).filter(issue => issue.status !== 'resolved').map(issue => <p className="issue-note" key={issue.id}>{issue.message || issue.code}</p>)}</section>
    <Collapse ghost items={[{ key: 'advanced', label: t('workbench.advanced'), children: <><dl className="reference-list"><dt>{t('workbench.record_id')}</dt><dd>{document.meta.id}</dd><dt>{t('inspector.version')}</dt><dd>{document.revision}</dd><dt>{t('fields.template')}</dt><dd>{document.meta.template}</dd><dt>{t('fields.schema')}</dt><dd>{document.meta.schema}</dd></dl><p className="quiet-note">{(current.templateChain || []).map(item => item.name || item.id).join(' → ')}</p><Button icon={<CodeOutlined />} onClick={() => setRawOpen(true)}>{t('inspector.raw')}</Button></> }]} />
    </> : <section className="inspector-section"><h4>{t('inspector.confirmation')}</h4><p className="quiet-note">{t('dialogs.confirmation_note')}</p><ErrorNotice error={error} />{history.length ? <div className="history-timeline">{history.map((snapshot,index) => <button className="history-item" key={snapshot.id || index} onClick={() => setSelected(snapshot)}><span className="timeline-dot"><CheckCircleOutlined /></span><strong>{date(snapshot.confirmedAt || snapshot.confirmed_at)}</strong><span>{t('history.compare')}</span></button>)}</div> : <div className="quiet-note">{t('inspector.no_history')}</div>}</section>}</>}
  </Drawer>
  <Drawer open={rawOpen && Boolean(document)} width={780} title={t('inspector.raw')} onClose={() => setRawOpen(false)} extra={<Space><Button icon={<CopyOutlined />} onClick={async () => { try { await navigator.clipboard.writeText(document.raw); notify('app.copied'); } catch (failure) { reportError({code:'clipboard',details:failure.message}); } }}>{t('actions.copy')}</Button><Button icon={<DownloadOutlined />} onClick={() => download(document.raw, `${document.meta.id}.md`)}>{t('actions.download')}</Button></Space>}><pre className="raw-source">{document?.raw}</pre></Drawer>
  <Modal open={Boolean(selected && document)} title={t('history.diff')} width={1180} footer={<Button onClick={() => setSelected(null)}>{t('actions.close')}</Button>} onCancel={() => setSelected(null)}>{selected && document && <><div className="history-compare-toolbar"><Select value={selected.id} options={history.map(item => ({value:item.id,label:date(item.confirmedAt || item.confirmed_at)}))} onChange={id => setSelected(history.find(item => item.id === id))} /></div><DiffView before={selected.raw || ''} after={document.raw} beforeLabel={t('history.snapshot')} afterLabel={t('inspector.current')} /></>}</Modal></>;
}