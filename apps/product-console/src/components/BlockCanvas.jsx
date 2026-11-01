import React, { useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Input, Modal, Select, Space, Tag, Tooltip } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, LockOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import { useConsole, useDirty } from '../context';
import { canHuman, labelOf } from '../api';
import { ErrorNotice, Markdown, SectionHeader } from './Common';

function ProseEditor({ value, onChange, reader, onInput }) {
  const root = useRef(null);
  const [error, setError] = useState(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    let destroyed = false;
    let ready = false;
    let editor;
    import('@milkdown/crepe').then(async ({ Crepe }) => {
      if (destroyed) return;
      editor = new Crepe({ root: root.current, defaultValue: value || '', features: { [Crepe.Feature.ImageBlock]: false, [Crepe.Feature.CodeMirror]: false, [Crepe.Feature.Latex]: false, [Crepe.Feature.Table]: false, [Crepe.Feature.BlockEdit]: false, [Crepe.Feature.Toolbar]: false, [Crepe.Feature.LinkTooltip]: false, [Crepe.Feature.Placeholder]: false } });
      editor.on((listener) => listener.markdownUpdated((_ctx, markdown) => { if (ready && !destroyed) onChangeRef.current(markdown); }));
      await editor.create(); ready = true;
      reader.current = () => editor.getMarkdown();
      if (destroyed) editor.destroy();
    }).catch((failure) => { if (!destroyed) setError({ code: 'EDITOR_ERROR', details: failure.message }); });
    return () => { destroyed = true; reader.current = null; if (ready) editor?.destroy(); };
  }, []);
  return <><ErrorNotice error={error} /><div className="prose-editor" ref={root} onInputCapture={onInput} /></>;
}

function EditableBlock({ block, document, region, index, count, disabled, onSaved }) {
  const { t, bootstrap, catalog, mutate, guard } = useConsole();
  const { modal } = App.useApp();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(block.content || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);
  const reader = useRef(null);
  const dirty = editing && (touched || content !== (block.content || ''));
  useDirty(`block-${document.meta.id}-${block.id}`, dirty);
  const attrs = block.attrs || {};
  const locked = disabled || !canHuman(bootstrap, document, 'blocks', block) || attrs.editable === 'false' || attrs.readonly === 'true' || block.readOnly;
  const known = ['richtext', 'markdown', 'prose', 'note', 'gallery'].includes(block.type);
  const execute = async (payload) => {
    setBusy(true); setError(null);
    try { await mutate(document.meta.id, document.revision, payload); setEditing(false); await onSaved?.(); } catch (failure) { setError(failure); } finally { setBusy(false); }
  };
  const remove = () => modal.confirm({ title: t('dialogs.delete_title'), content: t('blocks.delete_confirm'), okText: t('actions.delete'), cancelText: t('actions.cancel'), okButtonProps: { danger: true }, onOk: () => execute({ operation: 'removeBlock', blockId: block.id }) });
  return <section className={`content-block ${locked ? 'content-block-readonly' : ''}`} data-block-id={block.id}>
    <header className="block-header"><div><span className="block-handle">⋮⋮</span><h4>{attrs.title_key ? t(attrs.title_key) : attrs.title || t(`blocks.${block.type}`)}</h4>{(locked || !known) && <Tooltip title={t('blocks.readonly')}><LockOutlined /></Tooltip>}</div><Space size={2}>
      {!editing && known && !locked && <Button type="text" size="small" title={t('actions.edit')} icon={<EditOutlined />} onClick={() => { setContent(block.content || ''); setTouched(false); setEditing(true); }} />}
      {region?.config?.can_move !== false && !locked && <><Button type="text" size="small" aria-label={t('actions.move_up')} title={t('actions.move_up')} disabled={index === 0 || editing} icon={<ArrowUpOutlined />} onClick={() => guard(() => execute({ operation: 'moveBlock', blockId: block.id, region: region.id, beforeId: region.blocks[index - 1].id }))} /><Button type="text" size="small" aria-label={t('actions.move_down')} title={t('actions.move_down')} disabled={index === count - 1 || editing} icon={<ArrowDownOutlined />} onClick={() => guard(() => execute({ operation: 'moveBlock', blockId: block.id, region: region.id, beforeId: region.blocks[index + 2]?.id || null }))} /></>}
      {region?.config?.can_delete !== false && !locked && known && <Button type="text" size="small" danger aria-label={t('actions.delete')} title={t('actions.delete')} icon={<DeleteOutlined />} onClick={() => guard(remove)} />}
    </Space></header>
    <ErrorNotice error={error} />
    {editing ? <>{block.type === 'gallery' ? <div className="gallery-select"><Select mode="multiple" aria-label={t('listing.assets')} value={content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)} onChange={(ids) => setContent(ids.join('\n'))} options={catalog.filter((item) => item.kind === 'asset').map((item) => ({ value: item.id, label: labelOf(item) }))} /></div> : <ProseEditor value={content} onChange={setContent} reader={reader} onInput={() => setTouched(true)} />}<div className="block-save-bar"><span>{dirty ? t('app.unsaved') : ''}</span><Space><Button size="small" onClick={() => { setEditing(false); setContent(block.content || ''); }}>{t('actions.cancel')}</Button><Button type="primary" size="small" icon={<SaveOutlined />} loading={busy} onClick={() => execute({ operation: 'updateBlock', blockId: block.id, content: block.type === 'gallery' ? content : reader.current?.() ?? content })}>{t('actions.save')}</Button></Space></div></> : <div className="block-content">{block.type === 'gallery' ? <GalleryContent ids={(block.content || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)} /> : block.content ? <Markdown>{block.content}</Markdown> : <span className="empty-prose">{t('blocks.empty')}</span>}{!known && <pre className="source-code">{block.raw || block.content}</pre>}</div>}
  </section>;
}

export function GalleryContent({ ids = [] }) {
  const { t, catalog } = useConsole();
  return ids.length ? <div className="inline-gallery">{ids.map((id) => { const asset = catalog.find((item) => item.id === id); const key = asset?.media?.key; const url = key ? `/api/media/${key.split('/').map(encodeURIComponent).join('/')}` : null; return <div key={id}>{url && asset?.media?.mime?.startsWith('image/') ? <img src={url} alt={labelOf(asset)} /> : url ? <a href={url} target="_blank" rel="noopener noreferrer">{labelOf(asset)}</a> : <code>{id}</code>}<span>{labelOf(asset) || id}</span></div>; })}</div> : <div className="quiet-note">{t('blocks.no_assets')}</div>;
}

export default function BlockCanvas({ resolved, onSaved, hideHeader = false, regionId, showUnplaced = true }) {
  const { t, bootstrap, mutate, guard } = useConsole();
  const [adding, setAdding] = useState(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('richtext');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const document = resolved.document;
  const regions = (resolved.layout?.regions || []).filter((region) => !regionId || region.id === regionId);
  const unplaced = showUnplaced ? resolved.layout?.unplaced || [] : [];
  const canAdd = canHuman(bootstrap, document, 'blocks');
  const add = async () => {
    setBusy(true); setError(null);
    try {
      await mutate(document.meta.id, document.revision, { operation: 'addBlock', region: adding.id, block: { id: `block_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`, type, attrs: { title: title || t(`blocks.${type}`), region: adding.id }, content: '' } });
      setAdding(null); setTitle(''); await onSaved?.();
    } catch (failure) { setError(failure); } finally { setBusy(false); }
  };
  return <div className="block-canvas">
    {regions.map((region) => <div className="block-region" key={region.id}>
      {!hideHeader && <SectionHeader title={t(region.config?.label_key || 'blocks.notes')} extra={canAdd && region.config?.can_add !== false && <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => guard(() => { setType(region.config?.allowed_types?.[0] || 'richtext'); setAdding(region); setError(null); })}>{t('actions.add_block')}</Button>} />}
      {!region.blocks.length && <div className="region-empty">{t('blocks.empty')}{canAdd && region.config?.can_add !== false && <Button type="link" size="small" onClick={() => { setType(region.config?.allowed_types?.[0] || 'richtext'); setAdding(region); }}>{t('actions.add_block')}</Button>}</div>}
      {region.blocks.map((block, index) => <EditableBlock key={`${document.meta.id}-${block.id}`} block={block} document={document} region={region} index={index} count={region.blocks.length} onSaved={onSaved} />)}
    </div>)}
    {!!unplaced.length && <div className="unplaced-region"><Alert showIcon type="warning" message={t('blocks.unplaced')} description={t('blocks.unplaced_description')} />{unplaced.map(({ block, reason }) => <div key={block.id}><Tag>{t(`diagnostics.${reason}`) === `diagnostics.${reason}` ? reason : t(`diagnostics.${reason}`)}</Tag><EditableBlock block={block} document={document} disabled onSaved={onSaved} /></div>)}</div>}
    <Modal open={Boolean(adding)} title={t('blocks.add_title')} okText={t('actions.create')} cancelText={t('actions.cancel')} confirmLoading={busy} onCancel={() => setAdding(null)} onOk={add}><ErrorNotice error={error} /><div className="modal-form"><label htmlFor={`block-title-${regionId || 'all'}`}>{t('blocks.title')}</label><Input id={`block-title-${regionId || 'all'}`} value={title} onChange={(event) => setTitle(event.target.value)} /><label htmlFor={`block-type-${regionId || 'all'}`}>{t('blocks.type')}</label><Select id={`block-type-${regionId || 'all'}`} value={type} onChange={setType} options={(adding?.config?.allowed_types || ['richtext']).map((value) => ({ value, label: t(`blocks.${value}`) }))} /></div></Modal>
  </div>;
}
