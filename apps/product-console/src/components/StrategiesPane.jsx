import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { AimOutlined, PlusOutlined } from '@ant-design/icons';
import { useConsole, useDocument } from '../context';
import { labelOf, summaryOf } from '../api';
import { EmptyState, ErrorNotice, Loading, SectionHeader, Status } from './Common';
import { RecordHeader, ScopeEditor } from './DocumentTools';
import DocumentCanvas from './DocumentCanvas';
import SellingPoints from './SellingPoints';
import SemanticRelations from './SemanticRelations';
import BriefsPane from './BriefsPane';

function StrategyRecord({ resolved, standalone }) {
  const { t, refresh } = useConsole();
  const body = { ...resolved, layout: { ...resolved.layout, regions: (resolved.layout?.regions || []).map(region => ({ ...region, blocks: region.blocks.filter(block => block.type !== 'brief' && block.attrs?.purpose !== 'brief') })).filter(region => region.blocks.length || region.id !== 'briefs') } };
  const panels = {
    selling_points: <SellingPoints resolved={resolved} onSaved={refresh} />,
    document: <DocumentCanvas resolved={body} onSaved={refresh} />,
    references: <SemanticRelations resolved={resolved} onSaved={refresh} />,
    briefs: <BriefsPane resolved={resolved} onSaved={refresh} />,
    scope: <details className="advanced-source"><summary>{t('strategies.applicability')}</summary><ScopeEditor resolved={resolved} onSaved={refresh} /></details>,
  };
  return <div className="record-editor">{!standalone && <RecordHeader resolved={resolved} onSaved={refresh} />}{(resolved.template?.meta?.panels || Object.keys(panels)).map(key => panels[key] ? <React.Fragment key={key}>{panels[key]}</React.Fragment> : null)}</div>;
}

export default function StrategiesPane({ resolved }) {
  const { t, guard, tick, refresh, setInspected, createRecord } = useConsole();
  const self = resolved.document.meta.kind === 'strategy';
  const records = (self ? [resolved.document] : resolved.related?.strategies || []).map(summaryOf);
  const [selected, setSelected] = useState(records[0]?.id);
  useEffect(() => { if (!records.some((item) => item.id === selected)) setSelected(records[0]?.id); }, [resolved.document.meta.id, records.map((item) => item.id).join(',')]);
  const { data: fetched, loading, error } = useDocument(self ? null : selected, tick);
  const data = self ? resolved : fetched?.document.meta.id === selected ? fetched : null;
  useEffect(() => { if (data) setInspected(data); }, [data, setInspected]);
  return <div className="related-workspace">{!self && <SectionHeader title={t('strategies.title')} subtitle={t('strategies.scope_hint')} icon={<AimOutlined />} extra={<Button icon={<PlusOutlined />} onClick={() => guard(() => createRecord('strategy', { scopes: [resolved.document.meta.id] }))}>{t('actions.new_strategy')}</Button>} />}
    {!records.length ? <EmptyState label="strategies.empty" /> : <>{!self && <div className="related-record-tabs">{records.map((item) => <button key={item.id} className={`record-pill ${selected === item.id ? 'active' : ''}`} onClick={() => guard(() => setSelected(item.id))}><AimOutlined /><span>{labelOf(item)}</span><Status state={item.review?.state || 'draft'} compact /></button>)}</div>}<ErrorNotice error={error} />{loading && !data ? <Loading /> : data && <StrategyRecord key={data.document.meta.id} resolved={data} standalone={self} />}</>}
  </div>;
}
