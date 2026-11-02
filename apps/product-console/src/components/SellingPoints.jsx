import React, { useState } from 'react';
import { Button, Input, InputNumber, Modal, Select, Space, Tag } from 'antd';
import { AimOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useConsole, useDirty } from '../context';
import { canHuman } from '../api';
import { EmptyState, ErrorNotice, SectionHeader } from './Common';
import { ReferenceList, useSemanticSave } from './SemanticRelations';

export default function SellingPoints({ resolved, onSaved }) {
  const { t, bootstrap, guard } = useConsole();
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const document = resolved.document;
  const points = [...(document.meta.selling_points || [])].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
  const save = useSemanticSave(resolved, onSaved);
  const editable = canHuman(bootstrap, document, 'metadata');
  useDirty(`selling-points-${document.meta.id}`, dirty);
  const close = () => { setDraft(null); setDirty(false); };
  const change = (key, value) => { setDraft(current => ({ ...current, [key]: value })); setDirty(true); };
  return <section className="panel selling-points"><SectionHeader title={t('selling.title')} subtitle={t('selling.hint')} icon={<AimOutlined />} extra={editable && <Button aria-label={t('selling.add')} size="small" icon={<PlusOutlined />} onClick={() => guard(() => { setDraft({ id: `point_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`, priority: points.length + 1, feature: '', advantage: '', benefit: '', evidence: [] }); setDirty(false); })}>{t('selling.add')}</Button>} /><ErrorNotice error={save.error} />
    {!points.length ? <EmptyState label="selling.empty" /> : <><div className="core-benefit-grid">{points.slice(0, 3).map(point => <article key={point.id}><Tag>{t('selling.priority')} {point.priority}</Tag><h4>{point.benefit || point.feature}</h4><p>{point.advantage}</p><ReferenceList resolved={resolved} ids={point.evidence || []} empty={false} /></article>)}</div><div className="semantic-table-wrap"><table className="semantic-table fabe-table"><thead><tr>{['feature', 'advantage', 'benefit', 'evidence'].map(key => <th key={key}>{t(`selling.${key}`)}</th>)}{editable && <th>{t('selling.actions')}</th>}</tr></thead><tbody>{points.map(point => <tr key={point.id}><td><span className="priority-number">{point.priority}</span>{point.feature}{point.blockId && <small>{t('selling.details')} · {document.blocks?.find(block => block.id === point.blockId)?.attrs?.title || point.blockId}</small>}</td><td>{point.advantage}</td><td>{point.benefit}</td><td><ReferenceList resolved={resolved} ids={point.evidence || []} /></td>{editable && <td><Space><Button size="small" aria-label={t('actions.edit')} icon={<EditOutlined />} onClick={() => guard(() => { setDraft({ ...point }); setDirty(false); })} /><Button size="small" danger aria-label={t('actions.delete')} icon={<DeleteOutlined />} onClick={() => guard(() => save.perform({ operation: 'metadata', changes: { selling_points: (document.meta.selling_points || []).filter(item => item.id !== point.id) } }))} /></Space></td>}</tr>)}</tbody></table></div></>}
    <Modal open={Boolean(draft)} width={720} title={t('selling.edit')} okText={t('actions.save')} cancelText={t('actions.cancel')} confirmLoading={save.busy} okButtonProps={{ disabled: !draft?.feature?.trim() }} onCancel={() => guard(close)} onOk={() => {
      const existing = document.meta.selling_points || [];
      const next = existing.some(point => point.id === draft.id) ? existing.map(point => point.id === draft.id ? draft : point) : [...existing, draft];
      save.perform({ operation: 'metadata', changes: { selling_points: next } }, close);
    }}>{draft && <div className="semantic-form"><ErrorNotice error={save.error} /><label>{t('selling.priority')}<InputNumber aria-label={t('selling.priority')} min={1} value={draft.priority} onChange={value => change('priority', value ?? 1)} /></label>{['feature', 'advantage', 'benefit'].map(key => <label key={key}>{t(`selling.${key}`)}<Input.TextArea aria-label={t(`selling.${key}`)} rows={3} value={draft[key] || ''} onChange={event => change(key, event.target.value)} /></label>)}<label>{t('selling.evidence')}<Select aria-label={t('selling.evidence')} mode="multiple" optionFilterProp="label" value={draft.evidence || []} onChange={value => change('evidence', value)} options={(document.meta.refs || []).map(ref => ({ value: ref.id, label: ref.note || `${ref.documentId}${ref.field ? ` · ${t(`fields.${ref.field}`)}` : ''}` }))} /></label><label>{t('selling.details')}<Select aria-label={t('selling.details')} allowClear value={draft.blockId} onChange={value => change('blockId', value)} options={(document.blocks || []).map(block => ({ value: block.id, label: block.attrs?.title || block.id }))} /></label><p className="quiet-note">{t('selling.evidence_hint')}</p></div>}</Modal>{save.comparisonDialog}
  </section>;
}
