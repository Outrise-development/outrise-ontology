import React, { useEffect, useState } from 'react';
import { Button, Drawer, Modal, Select, Space, Tabs, Tag } from 'antd';
import { AuditOutlined, CheckCircleOutlined, ClockCircleOutlined, CodeOutlined, CopyOutlined, DownloadOutlined, FileTextOutlined, LinkOutlined } from '@ant-design/icons';
import { useConsole } from '../context';
import { download, labelOf, listOf, request, textValue } from '../api';
import { DiagnosticList, ErrorNotice, Status } from './Common';
import DiffView from './DiffView';

export default function Inspector({ resolved }) {
  const { t, catalog, tick, navigate, notify, reportError } = useConsole();
  const [tab, setTab] = useState('source');
  const [rawOpen, setRawOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const document = resolved?.document;
  useEffect(() => {
    let active = true;
    setHistory([]); setError(null);
    if (document?.meta.id) request(`/api/documents/${encodeURIComponent(document.meta.id)}/history`).then((result) => { if (active) setHistory(listOf(result.data || result)); }).catch((failure) => { if (active) setError(failure); });
    return () => { active = false; };
  }, [document?.meta.id, document?.revision, tick]);
  if (!document) return <aside className="inspector"><div className="inspector-heading"><AuditOutlined />{t('inspector.title')}</div></aside>;
  const sources = resolved.sources || {};
  const sourceEntries = Object.entries(sources);
  const date = (value) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : t('fields.unspecified');
  return <aside className="inspector"><div className="inspector-heading"><AuditOutlined /><span>{t('inspector.title')}</span><Button size="small" type="text" title={t('inspector.raw')} icon={<CodeOutlined />} onClick={() => setRawOpen(true)} /></div>
    <div className="inspector-summary"><span className="eyebrow">{t(`kinds.${document.meta.kind}`)}</span><strong>{labelOf(document)}</strong><code>{document.meta.id}</code><div className="inspector-status"><Status state={resolved.review?.state || 'waiting'} /><span>{t('inspector.version')} <code>{document.revision?.slice(0, 8)}</code></span></div></div>
    <Tabs size="small" className="inspector-tabs" activeKey={tab} onChange={setTab} items={['source', 'history'].map((key) => ({ key, label: t(`inspector.${key}`) }))} />
    <div className="inspector-scroll">{tab === 'source' ? <><section className="inspector-section"><h4>{t('inspector.source')}</h4>{sourceEntries.length ? sourceEntries.map(([field, source]) => <div className="source-entry" key={field}><div><span>{t(`fields.${field}`) === `fields.${field}` ? field : t(`fields.${field}`)}</span><Tag className="micro-tag">{t(source.inherited ? 'fields.inherited' : source.overridden ? 'fields.override' : 'fields.local')}</Tag></div><button onClick={() => navigate(source.documentId)}><LinkOutlined />{labelOf(catalog.find((item) => item.id === source.documentId)) || source.documentId}</button></div>) : <div className="quiet-note">{t('inspector.unknown_source')}</div>}</section><section className="inspector-section"><h4>{t('inspector.references')}</h4><dl className="reference-list"><dt>{t('fields.template')}</dt><dd>{document.meta.template || t('fields.unspecified')}</dd><dt>{t('fields.schema')}</dt><dd>{document.meta.schema || t('fields.unspecified')}</dd></dl></section><section className="inspector-section"><h4>{t('inspector.diagnostics')}{Boolean(resolved.diagnostics?.length) && <Tag>{resolved.diagnostics.length}</Tag>}</h4><DiagnosticList diagnostics={resolved.diagnostics} /></section></> : <section className="inspector-section"><h4>{t('inspector.confirmation')}</h4><p className="quiet-note">{t('dialogs.confirmation_note')}</p><ErrorNotice error={error} />{history.length ? <div className="history-timeline">{history.map((snapshot, index) => <button className="history-item" key={snapshot.id || index} onClick={() => setSelected(snapshot)}><span className="timeline-dot"><CheckCircleOutlined /></span><strong>{date(snapshot.confirmedAt || snapshot.confirmed_at)}</strong><code>{snapshot.id || snapshot.businessHash?.slice(0, 12)}</code><span>{t('history.compare')}</span></button>)}</div> : <div className="quiet-note">{t('inspector.no_history')}</div>}</section>}</div>
    <div className="inspector-footer"><span className="small-dot" />{t('app.local')}<Button type="text" size="small" icon={<FileTextOutlined />} onClick={() => setRawOpen(true)}>{t('inspector.raw')}</Button></div>
    <Drawer open={rawOpen} width={780} title={t('inspector.raw')} onClose={() => setRawOpen(false)} extra={<Space><Button icon={<CopyOutlined />} onClick={async () => { try { await navigator.clipboard.writeText(document.raw); notify('app.copied'); } catch (failure) { reportError({ code: 'clipboard', details: failure.message }); } }}>{t('actions.copy')}</Button><Button icon={<DownloadOutlined />} onClick={() => download(document.raw, `${document.meta.id}.md`)}>{t('actions.download')}</Button></Space>}><pre className="raw-source">{document.raw}</pre></Drawer>
    <Modal open={Boolean(selected)} title={t('history.diff')} width={1180} footer={<Button onClick={() => setSelected(null)}>{t('actions.close')}</Button>} onCancel={() => setSelected(null)}>{selected && <><div className="history-compare-toolbar"><Select value={selected.id} options={history.map((item) => ({ value: item.id, label: date(item.confirmedAt || item.confirmed_at) }))} onChange={(id) => setSelected(history.find((item) => item.id === id))} /><span>{t('inspector.current')} · {document.revision?.slice(0, 12)}</span></div><DiffView before={selected.raw || ''} after={document.raw} beforeLabel={t('history.snapshot')} afterLabel={t('inspector.current')} /></>}</Modal>
  </aside>;
}
