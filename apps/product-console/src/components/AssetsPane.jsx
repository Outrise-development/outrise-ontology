import React, { useEffect, useState } from 'react';
import { Button, Drawer, Input, Modal, Segmented, Select, Space, Tag, Upload } from 'antd';
import { CloudUploadOutlined, FileOutlined, FileImageOutlined, PlayCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { useConsole, useDirty, useDocument } from '../context';
import { canHuman, labelOf, request, summaryOf, textValue } from '../api';
import { EmptyState, ErrorNotice, Loading, SectionHeader } from './Common';
import BlockCanvas from './BlockCanvas';
import { RecordHeader, ScopeEditor } from './DocumentTools';
import FieldsPanel from './FieldsPanel';
import SemanticRelations, { useSemanticSave } from './SemanticRelations';
import BriefsPane from './BriefsPane';

export function mediaUrl(item) {
  const meta = item?.meta || item || {};
  const key = meta.media?.key;
  return key ? `/api/media/${key.split('/').map(encodeURIComponent).join('/')}` : null;
}

export function MediaPreview({ asset, small = false }) {
  const { t } = useConsole();
  const meta = asset?.meta || asset || {};
  const src = mediaUrl(asset);
  const mime = meta.media?.mime || '';
  return <div className={`media-preview ${small ? 'media-preview-small' : ''}`}>{src && mime.startsWith('image/') ? <img src={src} alt={labelOf(asset)} /> : src && mime.startsWith('video/') ? small ? <PlayCircleOutlined /> : <video src={src} controls preload="metadata" /> : <div className="media-file"><FileOutlined /><span>{meta.media?.originalName || labelOf(asset) || t('assets.no_preview')}</span>{src && !small && <a href={src} target="_blank" rel="noopener noreferrer" download={meta.media?.originalName || undefined}>{t('actions.download')}</a>}</div>}</div>;
}

function AssetRecord({ resolved }) {
  const { t, bootstrap, catalog, refresh, openSource, navigate } = useConsole();
  const document = resolved.document;
  const initial = () => ({ tags: document.meta.tags || [], asset_stage: document.meta.asset_stage || '', source_assets: document.meta.source_assets || [] });
  const [values, setValues] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const save = useSemanticSave(resolved, refresh);
  const editable = canHuman(bootstrap, document, 'metadata');
  useEffect(() => { if (!dirty) setValues(initial()); }, [document.revision]);
  useDirty(`asset-metadata-${document.meta.id}`, dirty);
  const change = (key, value) => { setValues(current => ({ ...current, [key]: value })); setDirty(true); };
  const usage = catalog.filter(item => item.id !== document.meta.id && ((item.assets || []).includes(document.meta.id) || (item.source_assets || []).includes(document.meta.id) || (item.refs || []).some(ref => ref.documentId === document.meta.id)));
  const panels = {
    preview: <div className="asset-detail-summary"><MediaPreview asset={document} /><section><SectionHeader title={t('assets.classification')} extra={editable && <Button aria-label={t('actions.save')} size="small" icon={<SaveOutlined />} disabled={!dirty} loading={save.busy} onClick={() => save.perform({ operation: 'metadata', changes: { tags: values.tags, source_assets: values.source_assets, ...(values.asset_stage ? { asset_stage: values.asset_stage } : {}) } }, () => setDirty(false))}>{t('actions.save')}</Button>} /><ErrorNotice error={save.error} /><div className="semantic-form"><label>{t('assets.stage')}<Select aria-label={t('assets.stage')} disabled={!editable} value={values.asset_stage || undefined} placeholder={t('assets.unclassified')} onChange={value => change('asset_stage', value)} options={['source', 'final'].map(value => ({ value, label: t(`assets.stage_${value}`) }))} /></label><label>{t('fields.tags')}<Select aria-label={t('fields.tags')} mode="tags" disabled={!editable} value={values.tags} onChange={value => change('tags', value)} /></label><label>{t('assets.source_assets')}<Select aria-label={t('assets.source_assets')} mode="multiple" optionFilterProp="label" disabled={!editable} value={values.source_assets} onChange={value => change('source_assets', value)} options={catalog.filter(item => item.kind === 'asset' && item.id !== document.meta.id && !item.archived).map(item => ({ value: item.id, label: labelOf(item) }))} /></label></div><div className="asset-usage-list">{values.source_assets.map(id => <Button size="small" key={id} onClick={() => openSource?.({ documentId: id })}>{labelOf(catalog.find(item => item.id === id)) || id}</Button>)}</div></section></div>,
    fields: <FieldsPanel resolved={resolved} onSaved={refresh} titleKey="assets.description" />,
    usage: <section className="panel"><SectionHeader title={t('assets.used_in')} />{usage.length ? <div className="asset-usage-list">{usage.map(item => <Button key={item.id} onClick={() => navigate(item.id)}>{labelOf(item)}</Button>)}</div> : <EmptyState label="assets.unused" />}</section>,
    references: <SemanticRelations resolved={resolved} onSaved={refresh} />,
    document: <BlockCanvas resolved={resolved} onSaved={refresh} />,
    scope: <details className="advanced-source"><summary>{t('assets.associations')}</summary><ScopeEditor resolved={resolved} onSaved={refresh} /></details>,
    technical: <details className="advanced-source"><summary>{t('assets.file_details')}</summary><dl className="asset-metadata">{Object.entries(document.meta.media || {}).map(([key, value]) => <React.Fragment key={key}><dt>{t(`assets.${({ originalName: 'original_name', sha256: 'hash' }[key] || key)}`)}</dt><dd>{textValue(value)}</dd></React.Fragment>)}</dl></details>,
  };
  return <div className="asset-details-inline">{(resolved.template?.meta?.panels || Object.keys(panels)).map(key => panels[key] ? <React.Fragment key={key}>{panels[key]}</React.Fragment> : null)}{save.comparisonDialog}</div>;
}

function AssetDetails({ id, onClose }) {
  const { t, tick, refresh, setInspected } = useConsole();
  const { data, loading, error } = useDocument(id, tick);
  useEffect(() => { if (data) setInspected(data); }, [data, setInspected]);
  return <Drawer open={Boolean(id)} title={t('assets.metadata')} width={960} onClose={onClose} destroyOnClose><ErrorNotice error={error} />{loading && !data ? <Loading /> : data && <><RecordHeader resolved={data} onSaved={refresh} /><AssetRecord key={data.document.meta.id} resolved={data} /></>}</Drawer>;
}

function ProductionRecord({ id }) {
  const { tick, refresh, navigate } = useConsole();
  const { data, loading, error } = useDocument(id, tick);
  if (!data) return error ? <ErrorNotice error={error} /> : loading ? <Loading /> : null;
  return <div className="production-record"><Button type="link" onClick={() => navigate(id)}>{labelOf(data.document)}</Button><BriefsPane resolved={data} onSaved={refresh} /></div>;
}

export default function AssetsPane({ resolved }) {
  const { t, catalog, guard, refresh, notify } = useConsole();
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState([resolved.document.meta.id]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [stage, setStage] = useState('all');
  const [uploadStage, setUploadStage] = useState('source');
  const self = resolved.document.meta.kind === 'asset';
  const records = (resolved.related?.assets || []).map(summaryOf);
  const visible = records.filter(asset => stage === 'all' || (asset.asset_stage || 'unclassified') === stage);
  const production = [...(resolved.related?.listings || []), ...(resolved.related?.strategies || [])].map(summaryOf);
  useDirty(`asset-upload-${resolved.document.meta.id}`, uploading && Boolean(files.length || name));
  const upload = async () => {
    if (!files.length) { setError({ code: 'no_file' }); return; }
    setBusy(true); setError(null);
    try {
      for (const file of files) {
        const form = new FormData(); form.append('file', file.originFileObj || file); form.append('name', name || file.name); form.append('scopes', JSON.stringify(scopes)); form.append('asset_stage', uploadStage);
        await request('/api/assets', { method: 'POST', body: form });
      }
      notify('app.uploaded'); setUploading(false); setFiles([]); setName(''); refresh();
    } catch (problem) { setError(problem); } finally { setBusy(false); }
  };
  if (self) return <AssetRecord resolved={resolved} />;
  return <div><SectionHeader title={t('assets.title')} subtitle={t('assets.workflow_hint')} icon={<FileImageOutlined />} extra={<Button icon={<CloudUploadOutlined />} onClick={() => guard(() => { setScopes([resolved.document.meta.id]); setUploading(true); setError(null); })}>{t('actions.upload')}</Button>} />
    <div className="asset-stage-toolbar"><Segmented value={stage} onChange={value => guard(() => setStage(value))} options={['all', 'source', 'plans', 'final', 'unclassified'].map(value => ({ value, label: t(`assets.stage_${value}`) }))} /></div>
    {stage === 'plans' ? production.length ? production.map(item => <ProductionRecord key={item.id} id={item.id} />) : <EmptyState label="briefs.empty" /> : !visible.length ? <EmptyState label="assets.empty" /> : <div className="asset-grid">{visible.map((asset) => <button className="asset-card" key={asset.id} onClick={() => guard(() => setSelected(asset.id))}><MediaPreview asset={asset} /><div className="asset-card-caption"><strong>{labelOf(asset)}</strong><div className="asset-stage-label"><Tag>{t(`assets.stage_${asset.asset_stage || 'unclassified'}`)}</Tag><span>{asset.fields?.role || ''}</span></div><Space size={3} wrap>{(asset.tags || []).slice(0, 3).map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space></div></button>)}</div>}
    <AssetDetails id={selected} onClose={() => guard(() => setSelected(null))} />
    <Modal title={t('assets.upload_title')} open={uploading} onCancel={() => guard(() => { setUploading(false); setFiles([]); setName(''); })} okText={t('actions.upload')} cancelText={t('actions.cancel')} onOk={upload} confirmLoading={busy}><ErrorNotice error={error} /><Upload.Dragger multiple beforeUpload={() => false} fileList={files} onChange={({ fileList }) => setFiles(fileList)}><p className="upload-icon"><CloudUploadOutlined /></p><p>{t('assets.upload_hint')}</p></Upload.Dragger><div className="modal-form"><label>{t('fields.name')}</label><Input value={name} onChange={(event) => setName(event.target.value)} /><label>{t('assets.stage')}</label><Select aria-label={t('assets.stage')} value={uploadStage} onChange={setUploadStage} options={['source', 'final'].map(value => ({ value, label: t(`assets.stage_${value}`) }))} /><label>{t('fields.scopes')}</label><Select mode="multiple" value={scopes} onChange={setScopes} options={catalog.filter((item) => ['brand', 'product_line', 'line', 'spu', 'sku'].includes(item.kind)).map((item) => ({ value: item.id, label: labelOf(item) }))} /></div></Modal>
  </div>;
}
