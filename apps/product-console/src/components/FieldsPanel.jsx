import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, InputNumber, Modal, Select, Space, Switch, Tag, Tooltip } from 'antd';
import { ArrowUpOutlined, EditOutlined, FileDoneOutlined, LinkOutlined, RollbackOutlined, SaveOutlined } from '@ant-design/icons';
import { useConsole, useDirty } from '../context';
import { canHuman, labelOf, listOf, metaOf, request, textValue } from '../api';
import { EmptyState, ErrorNotice, SectionHeader } from './Common';
import DiffView from './DiffView';
import { patchFields } from '../../shared/protocol';

function FieldInput({ definition, value, onChange, disabled, id }) {
  const { t } = useConsole();
  if (definition.options) return <Select id={id} disabled={disabled} value={value} allowClear onChange={onChange} options={definition.options.map((option) => ({ label: String(option), value: option }))} />;
  if (definition.type === 'boolean') return <Switch id={id} disabled={disabled} checked={Boolean(value)} checkedChildren={t('ui.yes')} unCheckedChildren={t('ui.no')} onChange={onChange} />;
  if (definition.type === 'number') return <InputNumber id={id} disabled={disabled} value={value} onChange={onChange} style={{ width: '100%' }} />;
  if (definition.type === 'quantity') return <Space.Compact className="quantity-input"><InputNumber id={id} disabled={disabled} value={value?.value} onChange={(number) => onChange({ ...value, value: number })} /><Input aria-label={t('fields.unit')} disabled={disabled} value={value?.unit || ''} onChange={(event) => onChange({ ...value, unit: event.target.value })} /></Space.Compact>;
  if (definition.type === 'array') return <Select id={id} mode="tags" disabled={disabled} value={Array.isArray(value) ? value : []} onChange={onChange} tokenSeparators={[';']} placeholder={t('ui.select')} />;
  if (definition.type === 'object') return <Input.TextArea id={id} disabled={disabled} rows={3} value={typeof value === 'string' ? value : textValue(value)} onChange={(event) => onChange(event.target.value)} className="code-input" />;
  return <Input id={id} disabled={disabled} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />;
}

export default function FieldsPanel({ resolved, onSaved, titleKey = 'tabs.facts', readOnly = false }) {
  const { t, bootstrap, catalog, mutate, navigate, openSource, guard } = useConsole();
  const document = resolved.document;
  const meta = document.meta;
  const schema = listOf(bootstrap.schemas).find((item) => metaOf(item).id === meta.schema);
  const descriptors = metaOf(schema).fields || {};
  const values = resolved.fields || meta.fields || {};
  const sources = resolved.sources || {};
  const [changes, setChanges] = useState({});
  const [unset, setUnset] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [editing, setEditing] = useState(false);
  useDirty(`fields-${meta.id}`, Boolean(Object.keys(changes).length || unset.length));
  useEffect(() => { setChanges({}); setUnset([]); setError(null); setComparison(null); setEditing(false); }, [meta.id]);
  const entries = Object.entries(descriptors).filter(([key, definition]) => {
    if (meta.kind !== 'sku' && definition.scope === 'sku') return false;
    if (meta.kind === 'sku' && definition.scope === 'spu' && !(key in values)) return false;
    if (meta.kind === 'listing' && definition.platforms) return definition.platforms.includes(meta.platform);
    return true;
  });
  const unknownEntries = Object.entries(values).filter(([key]) => !descriptors[key]);
  const changeField = (key, value) => { setChanges((current) => ({ ...current, [key]: value })); setUnset((current) => current.filter((item) => item !== key)); };
  const parsedChanges = () => Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, descriptors[key]?.type === 'object' && typeof value === 'string' ? JSON.parse(value) : value]));
  const compareConflict = async (failure) => {
    setError(failure.code ? failure : { code: 'INVALID_FIELDS', details: failure.message });
    if (failure.code === 'REVISION_CONFLICT') {
      try {
        const latest = await request(`/api/documents/${encodeURIComponent(meta.id)}`);
        setComparison({ latest, proposed: patchFields(latest.raw, parsedChanges(), unset) });
      } catch (problem) { setError(problem); }
    }
  };
  const save = async () => {
    setError(null); setBusy(true);
    try {
      const parsed = parsedChanges();
      await mutate(meta.id, document.revision, { operation: 'fields', changes: parsed, unset });
      setChanges({}); setUnset([]); setEditing(false); await onSaved?.();
    } catch (failure) { await compareConflict(failure); } finally { setBusy(false); }
  };
  const displayValue = (value) => value === undefined || value === null || value === '' ? t('fields.unspecified') : typeof value === 'boolean' ? t(value ? 'ui.yes' : 'ui.no') : Array.isArray(value) ? value.join(' · ') : typeof value === 'object' && 'value' in value ? `${value.value} ${value.unit || ''}` : textValue(value);
  return <section className="panel fields-panel"><SectionHeader title={t(titleKey)} subtitle={t('fields.attributes')} icon={<FileDoneOutlined />} extra={editing ? <Space><Button size="small" onClick={() => guard(() => { setEditing(false); setChanges({}); setUnset([]); })}>{t('actions.cancel')}</Button><Button type="primary" size="small" icon={<SaveOutlined />} loading={busy} disabled={readOnly || !Object.keys(changes).length && !unset.length} onClick={save}>{t('actions.save')}</Button></Space> : !readOnly && canHuman(bootstrap, document, 'fields') && <Button size="small" aria-label={t('workbench.edit_section')} icon={<EditOutlined />} onClick={() => setEditing(true)}>{t('workbench.edit_section')}</Button>} />
    <ErrorNotice error={error} />
    {!entries.length && !unknownEntries.length && <EmptyState label="fields.no_fields" />}
    {!editing && <dl className="facts-reading">{entries.map(([key, definition]) => { const source = sources[key] || {}; return <div key={key} data-field={key}><dt>{definition.label_key ? t(definition.label_key) : key}</dt><dd><span className={values[key] === undefined ? 'value-missing' : ''}>{displayValue(values[key])}</span><button className="fact-source" onClick={() => openSource({ documentId: meta.id, field: key })} title={t('inspector.source')}><LinkOutlined />{t(source.inherited ? 'fields.inherited' : source.overridden ? 'fields.override' : 'fields.local')}</button></dd></div>; })}</dl>}
    {editing && <div className="fields-grid">{entries.map(([key, definition]) => {
      const source = sources[key] || {};
      const inherited = source.inherited && !Object.hasOwn(changes, key);
      const resetting = unset.includes(key);
      const canOverride = meta.kind === 'sku' && definition.overridable && definition.scope !== 'spu' && definition.editable !== false;
      const overridden = source.overridden || Object.hasOwn(changes, key) && source.inherited;
      const own = Object.hasOwn(meta.fields || {}, key);
      const disabled = definition.editable === false || !canHuman(bootstrap, document, 'fields') || resetting || Boolean(inherited && !canOverride || meta.kind === 'sku' && definition.scope === 'spu');
      const sourceEntity = catalog.find((item) => item.id === source.documentId);
      return <div className={`field-row ${inherited ? 'field-inherited' : ''}`} key={key} data-field={key}>
        <div className="field-label"><label htmlFor={`field-${meta.id}-${key}`}>{definition.label_key ? t(definition.label_key) : key}{definition.required && <span className="required-dot" />}</label><code>{key}</code></div>
        <div className="field-control"><FieldInput id={`field-${meta.id}-${key}`} definition={definition} value={Object.hasOwn(changes, key) ? changes[key] : values[key]} disabled={disabled || inherited} onChange={(value) => changeField(key, value)} /></div>
        <div className="field-provenance">{resetting ? <Tag>{t('fields.pending_restore')}</Tag> : inherited ? <Tag className="inherit-tag" icon={<LinkOutlined />}>{t('fields.inherited')}</Tag> : overridden ? <Tag color="blue">{t('fields.override')}</Tag> : <Tag className="local-tag">{t('fields.local')}</Tag>}
          {inherited && source.documentId && <Button type="link" size="small" className="source-link" onClick={() => navigate(source.documentId)}>{labelOf(sourceEntity) || source.documentId}<ArrowUpOutlined /></Button>}
          {inherited && canOverride && !resetting && <Button type="text" size="small" onClick={() => changeField(key, values[key])}>{t('actions.override')}</Button>}
          {(own && source.overridden || Object.hasOwn(changes, key) && source.inherited) && canOverride && <Tooltip title={t('actions.restore')}><Button aria-label={t('actions.restore')} type="text" size="small" icon={<RollbackOutlined />} onClick={() => { setChanges((current) => { const next = { ...current }; delete next[key]; return next; }); if (own) setUnset((current) => [...new Set([...current, key])]); }} /></Tooltip>}
        </div>
      </div>;
    })}</div>}
    {!!unknownEntries.length && <div className="additional-fields"><h4>{t('fields.additional')}</h4>{unknownEntries.map(([key, value]) => <div className="additional-field" key={key}><code>{key}</code><span>{textValue(value)}</span></div>)}</div>}
    <Modal open={Boolean(comparison)} width={1100} title={t('dialogs.conflict_title')} okText={t('actions.save_compared')} cancelText={t('actions.cancel')} confirmLoading={busy} onCancel={() => setComparison(null)} onOk={async () => {
      setBusy(true);
      try {
        await mutate(meta.id, comparison.latest.revision, { operation: 'fields', changes: parsedChanges(), unset });
        setComparison(null); setError(null); setChanges({}); setUnset([]); setEditing(false); await onSaved?.();
      } catch (failure) { await compareConflict(failure); } finally { setBusy(false); }
    }}>{comparison && <><p>{t('dialogs.conflict_body')}</p><DiffView before={comparison.latest.raw} after={comparison.proposed} beforeLabel={t('history.latest')} afterLabel={t('history.proposed')} /></>}</Modal>
  </section>;
}
