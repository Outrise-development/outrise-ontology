import React, { useEffect, useState } from 'react';
import { Button, Space, Table, Tag } from 'antd';
import { useConsole, useDocument } from '../context';
import { labelOf, listOf, metaOf, request, summaryOf, textValue } from '../api';
import { EmptyState, ErrorNotice, Loading, SectionHeader, Status } from './Common';
import DocumentCanvas from './DocumentCanvas';
import { ConfirmButton } from './DocumentTools';

function SkuDetails({ id }) {
  const { tick, refresh, t, setRoute, openSource } = useConsole();
  const { data, loading, error } = useDocument(id, tick);
  if (!data) return error ? <ErrorNotice error={error} /> : <Loading />;
  return <section className="sku-details"><div className="sku-detail-heading"><div><span className="eyebrow">{t('workbench.sku_details')}</span><h3>{labelOf(data.document)}</h3></div><Space><Status state={data.review?.state} /><ConfirmButton resolved={data} onSaved={refresh} /><Button onClick={() => openSource({ documentId: id })}>{t('inspector.title')}</Button><Button onClick={() => setRoute({ sku: undefined })}>{t('actions.close')}</Button></Space></div><DocumentCanvas resolved={data} onSaved={refresh} /></section>;
}

export default function SkuMatrix({ resolved, compact = false }) {
  const { t, bootstrap, tick, route, setRoute, createRecord } = useConsole();
  const children = (resolved.related?.children || []).map(summaryOf).filter(item => item.kind === 'sku' && !item.archived);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState(null);
  useEffect(() => {
    let active = true;
    setError(null);
    Promise.all(children.map(item => request(`/api/entities/${encodeURIComponent(item.id)}/resolved`))).then(items => { if (active) setRecords(items); }).catch(failure => { if (active) setError(failure); });
    return () => { active = false; };
  }, [children.map(item => item.id).join(','), tick]);
  const schema = listOf(bootstrap.schemas).find(item => metaOf(item).id === resolved.document.meta.schema);
  const definitions = metaOf(schema).fields || {};
  const configured = resolved.template?.meta?.sku_columns;
  const keys = configured || Object.keys(definitions).filter(key => definitions[key].scope === 'sku' || definitions[key].overridable);
  const columns = [{ key: 'name', title: t('fields.name'), fixed: 'left', width: 220, render: (_, item) => <Button type="link" onClick={() => setRoute({ section: 'facts', sku: item.document.meta.id })}>{labelOf(item.document)}</Button> }, ...keys.map(key => ({ key, title: t(definitions[key]?.label_key || `fields.${key}`), render: (_, item) => { const value = item.fields?.[key]; const source = item.sources?.[key]; return <div className="sku-value"><span>{value === undefined ? t('fields.unspecified') : typeof value === 'boolean' ? t(value ? 'ui.yes' : 'ui.no') : value && typeof value === 'object' && 'value' in value ? `${value.value} ${value.unit || ''}` : Array.isArray(value) ? value.join(' · ') : textValue(value)}</span>{source && <Tag bordered={false}>{t(source.inherited ? 'fields.inherited' : source.overridden ? 'fields.override' : 'fields.local')}</Tag>}</div>; } }))];
  return <section className="sku-matrix panel"><SectionHeader title={t('workbench.sku_matrix')} subtitle={t('workbench.sku_matrix_hint')} extra={<Button onClick={() => createRecord('sku', { parent: resolved.document.meta.id })}>{t('workbench.new_sku')}</Button>} /><ErrorNotice error={error} />{children.length ? <Table size="small" pagination={false} rowKey={item => item.document.meta.id} dataSource={records} columns={columns} scroll={{ x: 'max-content' }} rowClassName={item => item.document.meta.id === route.sku ? 'sku-selected' : ''} /> : <EmptyState label="workbench.no_skus" />}{!compact && route.sku && children.some(item => item.id === route.sku) && <SkuDetails key={route.sku} id={route.sku} />}</section>;
}
