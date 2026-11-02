import React, { useEffect, useState } from 'react';
import { App, Button, Form, Input, Modal, Select, Space } from 'antd';
import { CheckOutlined, SaveOutlined } from '@ant-design/icons';
import { useConsole, useDirty } from '../context';
import { canHuman, labelOf } from '../api';
import { ErrorNotice, Status } from './Common';
import { useSemanticSave } from './SemanticRelations';

export function ConfirmButton({ resolved, onSaved, size = 'small' }) {
  const { t, bootstrap, confirmDocument, hasDirty } = useConsole();
  const { modal } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const document = resolved.document;
  return <><Button icon={<CheckOutlined />} size={size} loading={busy} disabled={!canHuman(bootstrap, document, 'confirm') || hasDirty || resolved.review?.state === 'confirmed' && !resolved.review?.changedSinceConfirmation && !resolved.stale?.stale} onClick={() => modal.confirm({ title: t('dialogs.confirm_title'), content: <><p>{t('dialogs.confirm_body')}</p><strong>{t(`kinds.${document.meta.kind}`)} · {labelOf(document)}</strong></>, okText: t('actions.confirm'), cancelText: t('actions.cancel'), onOk: async () => { setBusy(true); setError(null); try { await confirmDocument(document.meta.id, document.revision); await onSaved?.(); } catch (failure) { setError(failure); throw failure; } finally { setBusy(false); } } })}>{t('actions.confirm')}</Button>{error && <ErrorNotice error={error} />}</>;
}

export function ScopeEditor({ resolved, onSaved }) {
  const { t, catalog } = useConsole();
  const document = resolved.document;
  const [scopes, setScopes] = useState(document.meta.scopes || []);
  const [dirty, setDirty] = useState(false);
  const save = useSemanticSave(resolved, onSaved);
  useEffect(() => { setScopes(document.meta.scopes || []); setDirty(false); }, [document.meta.id]);
  useEffect(() => { if (!dirty) setScopes(document.meta.scopes || []); }, [document.revision]);
  useDirty(`scopes-${document.meta.id}`, dirty);
  return <><div className="scope-editor"><label>{t('fields.scopes')}</label><Select mode="multiple" optionFilterProp="label" aria-label={t('fields.scopes')} value={scopes} onChange={(value) => { setScopes(value); setDirty(true); }} options={catalog.filter((item) => ['brand', 'product_line', 'line', 'spu', 'sku'].includes(item.kind) && !item.archived).map((item) => ({ value: item.id, label: labelOf(item) }))} /><Button size="small" disabled={!dirty} loading={save.busy} icon={<SaveOutlined />} onClick={() => save.perform({ operation: 'metadata', changes: { scopes } }, () => setDirty(false))}>{t('actions.save')}</Button><ErrorNotice error={save.error} /></div>{save.comparisonDialog}</>;
}

export function RecordHeader({ resolved, onSaved, extra }) {
  const { t } = useConsole();
  return <div className="record-header"><div><span className="eyebrow">{t(`kinds.${resolved.document.meta.kind}`)}</span><h2>{labelOf(resolved.document)}</h2></div><Space wrap><Status state={resolved.review?.state || 'draft'} />{extra}<ConfirmButton resolved={resolved} onSaved={onSaved} /></Space></div>;
}
