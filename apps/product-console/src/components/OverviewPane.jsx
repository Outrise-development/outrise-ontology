import React, { useEffect, useState } from 'react';
import { Button, Space, Tag } from 'antd';
import { ArrowRightOutlined, CheckCircleOutlined, PictureOutlined } from '@ant-design/icons';
import { useConsole } from '../context';
import { labelOf, metaOf, request, summaryOf, textValue } from '../api';
import { EmptyState, ErrorNotice, Markdown, SectionHeader, Status } from './Common';
import { MediaPreview } from './AssetsPane';

function ChannelState({ summary }) {
  const { t, tick, setRoute } = useConsole();
  const [record, setRecord] = useState(null);
  useEffect(() => { let active = true; request(`/api/entities/${encodeURIComponent(summary.id)}/resolved`).then(value => { if (active) setRecord(value); }).catch(() => {}); return () => { active = false; }; }, [summary.id, tick]);
  const pending = (record?.related?.proposals || []).filter(item => item.state !== 'adopted').length;
  return <button className="channel-overview" onClick={() => setRoute({ section: 'listings', listing: summary.id, panel: record?.stale?.stale || pending ? 'review' : 'content' })}><div><strong>{t(`platforms.${summary.platform}`)}</strong><span>{labelOf(summary)}</span></div><Space wrap>{record?.stale?.stale && <Tag color="orange">{t('workbench.source_changed')}</Tag>}{pending > 0 && <Tag color="blue">{t('workbench.pending_proposals')} {pending}</Tag>}<Status state={record?.review?.state || 'draft'} /><ArrowRightOutlined /></Space></button>;
}

export default function OverviewPane({ resolved }) {
  const { t, catalog, tick, navigate, setRoute, openSource } = useConsole();
  const meta = resolved.document.meta;
  const children = (resolved.related?.children || []).map(summaryOf).filter(item => !item.archived);
  const localScopes = new Set([meta.id, ...children.map(item => item.id)]);
  const isImage = item => item && !item.archived && item.media?.mime?.startsWith('image/');
  const scopedAssets = catalog.filter(item => item.kind === 'asset' && isImage(item) && item.scopes?.some(scope => localScopes.has(typeof scope === 'string' ? scope : scope.id)));
  const assets = [...new Map([...scopedAssets, ...(resolved.related?.assets || []).map(summaryOf).filter(isImage)].map(item => [item.id, item])).values()];
  const roles = resolved.template?.meta?.hero_roles || [];
  const preferred = items => roles.map(role => items.find(item => item.fields?.role === role)).find(Boolean);
  const explicitHero = catalog.find(item => item.id === meta.hero_asset);
  const hero = isImage(explicitHero) ? explicitHero : preferred(scopedAssets) || scopedAssets[0] || preferred(assets) || assets[0];
  const strategies = (resolved.related?.strategies || []).map(summaryOf);
  const [strategyDocs, setStrategyDocs] = useState([]);
  useEffect(() => { let active = true; Promise.all(strategies.map(item => request(`/api/documents/${encodeURIComponent(item.id)}`))).then(values => { if (active) setStrategyDocs(values); }).catch(() => {}); return () => { active = false; }; }, [strategies.map(item => item.id).join(','), tick]);
  const localStrategy = strategyDocs.find(item => item.meta.scopes?.includes(meta.id)) || strategyDocs[0];
  const expression = resolved.fields?.positioning || localStrategy?.meta.fields?.positioning || localStrategy?.meta.fields?.core_message || resolved.fields?.description;
  const keys = resolved.template?.meta?.overview_fields || Object.keys(resolved.fields || {}).filter(key => !['description', 'features', 'positioning'].includes(key)).slice(0, 6);
  const points = strategyDocs.flatMap(doc => (doc.meta.selling_points || []).map(point => ({ ...point, documentId: doc.meta.id }))).sort((a,b) => (a.priority ?? 999) - (b.priority ?? 999)).slice(0, 5);
  const issues = [...(resolved.issues || meta.issues || []).filter(issue => issue.status !== 'resolved'), ...(resolved.diagnostics || []).map((issue,index) => ({ ...issue, id: `diagnostic-${index}` }))];
  const display = value => value === undefined || value === '' ? t('fields.unspecified') : typeof value === 'boolean' ? t(value ? 'ui.yes' : 'ui.no') : Array.isArray(value) ? value.join(' · ') : value && typeof value === 'object' && 'value' in value ? `${value.value} ${value.unit || ''}` : textValue(value);
  const panels = {
    hero: <section className="product-overview panel"><div className="overview-image">{hero ? <MediaPreview asset={hero} /> : <div className="overview-no-image"><PictureOutlined /><span>{t('workbench.no_product_image')}</span></div>}</div><div className="overview-introduction"><span className="eyebrow">{t(`kinds.${meta.kind}`)}</span><h2>{labelOf(resolved.document)}</h2>{expression ? <p className="core-expression">{display(expression)}</p> : <p className="quiet-note">{t('workbench.positioning_missing')}</p>}<dl className="overview-facts">{keys.filter(key => key in (resolved.fields || {})).map(key => <div key={key}><dt>{t(`fields.${key}`) === `fields.${key}` ? key : t(`fields.${key}`)}</dt><dd>{display(resolved.fields[key])}</dd></div>)}</dl><Button type="link" onClick={() => setRoute({ section: 'facts' })}>{t('workbench.view_details')}<ArrowRightOutlined /></Button></div></section>,
    issues: !!issues.length && <section className="panel workbench-tasks"><SectionHeader title={t('workbench.attention')} />{issues.map((issue,index) => <button key={issue.id || index} onClick={() => openSource({ documentId: issue.documentId || meta.id, field: issue.field, blockId: issue.blockId })}><span className="task-dot" /><span>{issue.message || (t(`errors.${issue.code}`) !== `errors.${issue.code}` ? t(`errors.${issue.code}`) : issue.code)}</span><ArrowRightOutlined /></button>)}</section>,
    children: !!children.length && <section className="panel"><SectionHeader title={t(meta.kind === 'spu' ? 'workbench.sku_matrix' : meta.kind === 'brand' ? 'workbench.product_lines' : 'workbench.products')} /><div className="product-child-grid">{children.map(item => <button key={item.id} className="product-child" onClick={() => item.kind === 'sku' ? setRoute({ section: 'facts', sku: item.id }) : navigate(item.id)}><span className="eyebrow">{t(`kinds.${item.kind}`)}</span><strong>{labelOf(item)}</strong><span>{item.fields?.color || item.fields?.sku_code || t('workbench.view_details')}</span><ArrowRightOutlined /></button>)}</div></section>,
    selling_points: <section className="panel"><SectionHeader title={t('workbench.core_points')} extra={<Button type="link" onClick={() => setRoute({ section: 'strategies' })}>{t('workbench.view_details')}</Button>} />{points.length ? points.map(point => <button className="overview-point" key={`${point.documentId}-${point.id}`} onClick={() => openSource({ documentId: point.documentId, blockId: point.blockId })}><CheckCircleOutlined /><div><strong>{point.benefit || point.feature}</strong><span>{point.advantage}</span></div></button>) : <p className="quiet-note">{t('workbench.core_points_missing')}</p>}</section>,
    channels: <section className="panel"><SectionHeader title={t('workbench.channel_status')} />{(resolved.related?.listings || []).length ? resolved.related.listings.map(item => <ChannelState key={item.id} summary={summaryOf(item)} />) : <p className="quiet-note">{t('workbench.no_channels')}</p>}</section>,
  };
  const sequence = resolved.template?.meta?.overview_panels || Object.keys(panels);
  return <div className="overview-pane">{sequence.map(key => panels[key] ? <div className={`overview-panel overview-panel-${key}`} key={key}>{panels[key]}</div> : null)}</div>;
}
