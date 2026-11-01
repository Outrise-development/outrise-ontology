import React, { useEffect, useState } from 'react';
import { App, Button, Form, Input, Modal, Select, Space } from 'antd';
import { CheckOutlined, SaveOutlined } from '@ant-design/icons';
import { useConsole, useDirty } from '../context';
import { canHuman, labelOf } from '../api';
import { ErrorNotice, Status } from './Common';

export function ConfirmButton({ resolved, onSaved, size = 'small' }) {
  const { t, bootstrap, confirmDocument, hasDirty } = useConsole();
  const { modal } = App.useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const document = resolved.document;
  return <><Button icon={<CheckOutlined />} size={size} loading={busy} disabled={!canHuman(bootstrap, document, 'confirm') || hasDirty || resolved.review?.state === 'confirmed' && !resolved.review?.changedSinceConfirmation && !resolved.stale?.stale} onClick={() => modal.confirm({ title: t('dialogs.confirm_title'), content: t('dialogs.confirm_body'), okText: t('actions.confirm'), cancelText: t('actions.cancel'), onOk: async () => { setBusy(true); setError(null); try { await confirmDocument(document.meta.id, document.revision); await onSaved?.(); } catch (failure) { setError(failure); throw failure; } finally { setBusy(false); } } })}>{t('actions.confirm')}</Button>{error && <ErrorNotice error={error} />}</>;
}

export function ScopeEditor({ resolved, onSaved }) {
  const { t, catalog, mutate } = useConsole();
  const document = resolved.document;
  const [scopes, setScopes] = useState(document.meta.scopes || []);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { setScopes(document.meta.scopes || []); setDirty(false); }, [document.meta.id]);
  useDirty(`scopes-${document.meta.id}`, dirty);
  return <div className="scope-editor"><label>{t('fields.scopes')}</label><Select mode="multiple" value={scopes} onChange={(value) => { setScopes(value); setDirty(true); }} options={catalog.filter((item) => ['brand', 'product_line', 'line', 'spu', 'sku'].includes(item.kind) && !item.archived).map((item) => ({ value: item.id, label: labelOf(item) }))} /><Button size="small" disabled={!dirty} loading={busy} icon={<SaveOutlined />} onClick={async () => { setBusy(true); setError(null); try { await mutate(document.meta.id, document.revision, { operation: 'metadata', changes: { scopes } }); setDirty(false); await onSaved?.(); } catch (failure) { setError(failure); } finally { setBusy(false); } }}>{t('actions.save')}</Button><ErrorNotice error={error} /></div>;
}

export function RecordHeader({ resolved, onSaved, extra }) {
  const { t } = useConsole();
  return <div className="record-header"><div><span className="eyebrow">{t(`kinds.${resolved.document.meta.kind}`)}</span><h2>{labelOf(resolved.document)}</h2><code>{resolved.document.meta.id}</code></div><Space wrap><Status state={resolved.review?.state || 'draft'} />{extra}<ConfirmButton resolved={resolved} onSaved={onSaved} /></Space></div>;
}
