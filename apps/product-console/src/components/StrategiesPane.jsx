import React, { useEffect, useState } from 'react';
import { Button, Select, Space } from 'antd';
import { AimOutlined, PlusOutlined } from '@ant-design/icons';
import { useConsole, useDocument } from '../context';
import { labelOf, summaryOf } from '../api';
import { EmptyState, ErrorNotice, Loading, SectionHeader, Status } from './Common';
import BlockCanvas from './BlockCanvas';
import FieldsPanel from './FieldsPanel';
import { RecordHeader, ScopeEditor } from './DocumentTools';
import DocumentCanvas from './DocumentCanvas';

export default function StrategiesPane({ resolved }) {
  const { t, catalog, guard, tick, refresh, setInspected, createRecord } = useConsole();
  const records = (resolved.related?.strategies || []).map(summaryOf);
  const [selected, setSelected] = useState(records[0]?.id);
  useEffect(() => { if (!records.some((item) => item.id === selected)) setSelected(records[0]?.id); }, [resolved.document.meta.id, records.map((item) => item.id).join(',')]);
  const { data, loading, error } = useDocument(selected, tick);
  useEffect(() => { if (data) setInspected(data); }, [data, setInspected]);
  return <div className="related-workspace"><SectionHeader title={t('strategies.title')} subtitle={t('strategies.scope_hint')} icon={<AimOutlined />} extra={<Button icon={<PlusOutlined />} onClick={() => guard(() => createRecord('strategy', { scopes: [resolved.document.meta.id] }))}>{t('actions.new_strategy')}</Button>} />
    {!records.length ? <EmptyState label="strategies.empty" /> : <><div className="related-record-tabs">{records.map((item) => <button key={item.id} className={`record-pill ${selected === item.id ? 'active' : ''}`} onClick={() => guard(() => setSelected(item.id))}><AimOutlined /><span>{labelOf(item)}</span><Status state={item.review?.state || 'draft'} compact /></button>)}</div><ErrorNotice error={error} />{loading && !data ? <Loading /> : data && <div className="record-editor"><RecordHeader resolved={data} onSaved={refresh} /><ScopeEditor resolved={data} onSaved={refresh} /><DocumentCanvas resolved={data} onSaved={refresh} /></div>}</>}
  </div>;
}
