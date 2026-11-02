import React, { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Select, Space, Tag } from 'antd';
import { DeleteOutlined, EditOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons';
import { useConsole, useDirty, useDocument } from '../context';
import { canHuman, labelOf, request } from '../api';
import { patchFields, patchMetadata } from '../../shared/protocol';
import { EmptyState, ErrorNotice, SectionHeader } from './Common';
import DiffView from './DiffView';
import './semantics.css';

export function useSemanticSave(resolved, onSaved) {
  const { t, mutate } = useConsole();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [comparison, setComparison] = useState(null);
  const perform = async (operation, done, revision = resolved.document.revision) => {
    setBusy(true); setError(null);
    try {
      await mutate(resolved.document.meta.id, revision, operation);
      setComparison(null); done?.(); await onSaved?.();
    } catch (failure) {
      setError(failure);
      if (failure.code === 'REVISION_CONFLICT' && ['metadata', 'fields'].includes(operation.operation)) {
        try {
          const latest = await request(`/api/documents/${encodeURIComponent(resolved.document.meta.id)}`);
          const proposed = operation.operation === 'fields' ? patchFields(latest.raw, operation.changes, operation.unset) : patchMetadata(latest.raw, operation.changes);
          setComparison({ latest, proposed, operation, done });
        } catch (problem) { setError(problem); }
      }
    } finally { setBusy(false); }
  };
  return { busy, error, perform, comparisonDialog: <Modal open={Boolean(comparison)} width={1100} title={t('dialogs.conflict_title')} okText={t('actions.save_compared')} cancelText={t('actions.cancel')} confirmLoading={busy} onCancel={() => setComparison(null)} onOk={() => perform(comparison.operation, comparison.done, comparison.latest.revision)}>{comparison && <><p>{t('dialogs.conflict_body')}</p><DiffView before={comparison.latest.raw} after={comparison.proposed} beforeLabel={t('history.latest')} afterLabel={t('history.proposed')} /></>}</Modal> };
}

export function ReferenceList({ resolved, usedBy, ids, empty = true }) {
  const { t, openSource, catalog } = useConsole();
  const references = (resolved.document.meta.refs || []).map(ref => ({ ...ref, ...(resolved.references || []).find(item => item.id === ref.id) }));
  const visible = references.filter(ref => (usedBy === undefined || ref.usedBy === usedBy) && (!ids || ids.includes(ref.id)));
  if (!visible.length) return empty ? <span className="quiet-note">{t('references.none')}</span> : null;
  return <div className="reference-list">{visible.map(ref => <div className="reference-item" key={ref.id}>
    <Button type="link" size="small" icon={<LinkOutlined />} onClick={() => openSource?.({ documentId: ref.documentId, field: ref.field, blockId: ref.blockId })}>{ref.target?.name || labelOf(catalog.find(item => item.id === ref.documentId)) || ref.documentId}{ref.field ? ` · ${t(`fields.${ref.field}`)}` : ref.blockId ? ` · ${ref.target?.title || ref.target?.content?.split('\n').find(line => line.trim())?.replace(/^#+\s*/, '').slice(0, 48) || t('references.block')}` : ''}</Button>
    {ref.valid === false && <Tag color="warning">{t('references.unavailable')}</Tag>}{ref.note && <p>{ref.note}</p>}
  </div>)}</div>;
}

function ReferenceForm({ value, onChange, onValidityChange, owner }) {
  const { t, catalog, tick } = useConsole();
  const { data, loading } = useDocument(value.documentId, tick);
  const pointer = value.field ? 'field' : value.blockId ? 'block' : 'document';
  const [type, setType] = useState(pointer);
  useEffect(() => setType(pointer), [value.id]);
  useEffect(() => onValidityChange(Boolean(value.documentId && (type === 'document' || type === 'field' && value.field || type === 'block' && value.blockId))), [value.documentId, value.field, value.blockId, type, onValidityChange]);
  const targets = data?.document.meta.id === value.documentId ? data : null;
  const sourceOptions = [...Object.keys(owner.meta.fields || {}).map(key => ({ value: key, label: t(`fields.${key}`) })), ...(owner.blocks || []).map(block => ({ value: block.id, label: block.attrs?.title || block.id }))];
  return <div className="semantic-form">
    <label>{t('references.document')}<Select aria-label={t('references.document')} showSearch optionFilterProp="label" value={value.documentId || undefined} onChange={documentId => onChange({ ...value, documentId, field: undefined, blockId: undefined })} options={catalog.filter(item => !item.archived).map(item => ({ value: item.id, label: labelOf(item) }))} /></label>
    <label>{t('references.target')}<Select aria-label={t('references.target')} value={type} onChange={next => { setType(next); onChange({ ...value, field: undefined, blockId: undefined }); }} options={['document', 'field', 'block'].map(key => ({ value: key, label: t(`references.${key}`) }))} /></label>
    {type === 'field' && <label>{t('references.field')}<Select aria-label={t('references.field')} showSearch optionFilterProp="label" loading={loading} value={value.field} onChange={field => onChange({ ...value, field, blockId: undefined })} options={Object.keys(targets?.fields || targets?.document.meta.fields || {}).map(key => ({ value: key, label: t(`fields.${key}`) }))} /></label>}
    {type === 'block' && <label>{t('references.block')}<Select aria-label={t('references.block')} showSearch optionFilterProp="label" loading={loading} value={value.blockId} onChange={blockId => onChange({ ...value, field: undefined, blockId })} options={(targets?.document.blocks || []).map(block => ({ value: block.id, label: block.attrs?.title || block.id }))} /></label>}
    <label>{t('references.used_by')}<Select aria-label={t('references.used_by')} allowClear value={value.usedBy} onChange={usedBy => onChange({ ...value, usedBy })} options={sourceOptions} /></label>
    <label>{t('references.note')}<Input.TextArea aria-label={t('references.note')} rows={3} value={value.note || ''} onChange={event => onChange({ ...value, note: event.target.value })} /></label>
  </div>;
}

export default function SemanticRelations({ resolved, onSaved }) {
  const { t, bootstrap, guard } = useConsole();
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [valid, setValid] = useState(false);
  const save = useSemanticSave(resolved, onSaved);
  const document = resolved.document;
  const references = document.meta.refs || [];
  const editable = canHuman(bootstrap, document, 'metadata');
  useDirty(`references-${document.meta.id}`, editing && Boolean(draft));
  const change = value => { setDraft(value); setEditing(true); };
  const close = () => { setDraft(null); setEditing(false); };
  const submit = () => {
    if (!valid) return;
    const next = references.some(ref => ref.id === draft.id) ? references.map(ref => ref.id === draft.id ? draft : ref) : [...references, draft];
    save.perform({ operation: 'metadata', changes: { refs: next } }, close);
  };
  return <section className="panel semantic-relations"><SectionHeader title={t('references.title')} subtitle={t('references.hint')} icon={<LinkOutlined />} extra={editable && <Button aria-label={t('references.add')} size="small" icon={<PlusOutlined />} onClick={() => guard(() => { setDraft({ id: `ref_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`, documentId: '' }); setEditing(false); })}>{t('references.add')}</Button>} />
    <ErrorNotice error={save.error} />{!references.length ? <EmptyState label="references.none" /> : references.map(ref => <div className="reference-editor-row" key={ref.id}><div><ReferenceList resolved={resolved} ids={[ref.id]} />{ref.usedBy && <small>{t('references.used_by')} · {t(`fields.${ref.usedBy}`) === `fields.${ref.usedBy}` ? document.blocks?.find(block => block.id === ref.usedBy)?.attrs?.title || ref.usedBy : t(`fields.${ref.usedBy}`)}</small>}</div>{editable && <Space><Button size="small" aria-label={t('actions.edit')} icon={<EditOutlined />} onClick={() => guard(() => { setDraft({ ...ref }); setEditing(false); })} /><Button size="small" danger aria-label={t('actions.delete')} icon={<DeleteOutlined />} onClick={() => guard(() => save.perform({ operation: 'metadata', changes: { refs: references.filter(item => item.id !== ref.id) } }))} /></Space>}</div>)}
    <Modal open={Boolean(draft)} title={t('references.edit')} okText={t('actions.save')} cancelText={t('actions.cancel')} okButtonProps={{ disabled: !valid }} confirmLoading={save.busy} onCancel={() => guard(close)} onOk={submit}>{draft && <><Alert type="info" showIcon message={t('references.internal_note')} /><ErrorNotice error={save.error} /><ReferenceForm value={draft} onChange={change} onValidityChange={setValid} owner={document} /></>}</Modal>{save.comparisonDialog}
  </section>;
}
