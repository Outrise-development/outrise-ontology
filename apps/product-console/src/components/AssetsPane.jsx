import React, { useEffect, useState } from 'react';
import { Button, Drawer, Input, Modal, Select, Space, Tag, Upload } from 'antd';
import { CloudUploadOutlined, FileOutlined, FileImageOutlined, PlayCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { useConsole, useDirty, useDocument } from '../context';
import { labelOf, request, summaryOf, textValue } from '../api';
import { EmptyState, ErrorNotice, Loading, SectionHeader } from './Common';
import BlockCanvas from './BlockCanvas';
import { RecordHeader, ScopeEditor } from './DocumentTools';

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

function AssetDetails({ id, onClose }) {
  const { t, tick, refresh, mutate, setInspected } = useConsole();
  const { data, loading, error } = useDocument(id, tick);
  const [tags, setTags] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);
  useEffect(() => { if (data) { setInspected(data); if (!dirty) setTags(data.document.meta.tags || []); } }, [data, setInspected]);
  useEffect(() => { setDirty(false); }, [id]);
  useDirty(`asset-${id}`, dirty);
  return <Drawer open={Boolean(id)} title={t('assets.metadata')} width={680} onClose={onClose} destroyOnClose>{error && <ErrorNotice error={error} />}{loading && !data ? <Loading /> : data && <><RecordHeader resolved={data} onSaved={refresh} /><MediaPreview asset={data.document} /><ScopeEditor resolved={data} onSaved={refresh} /><div className="metadata-line"><label>{t('fields.tags')}</label><Select mode="tags" value={tags} onChange={(value) => { setTags(value); setDirty(true); }} /><Button size="small" disabled={!dirty} loading={busy} icon={<SaveOutlined />} onClick={async () => { setBusy(true); try { await mutate(id, data.document.revision, { operation: 'metadata', changes: { tags } }); setDirty(false); refresh(); } catch (problem) { setFailure(problem); } finally { setBusy(false); } }}>{t('actions.save')}</Button></div><ErrorNotice error={failure} /><dl className="asset-metadata">{Object.entries(data.document.meta.media || {}).map(([key, value]) => <React.Fragment key={key}><dt>{t(`assets.${({ originalName: 'original_name', sha256: 'hash' }[key] || key)}`)}</dt><dd>{textValue(value)}</dd></React.Fragment>)}</dl><BlockCanvas resolved={data} onSaved={refresh} /></>}</Drawer>;
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
  const records = (resolved.related?.assets || []).map(summaryOf);
  const upload = async () => {
    if (!files.length) { setError({ code: 'no_file' }); return; }
    setBusy(true); setError(null);
    try {
      for (const file of files) {
        const form = new FormData(); form.append('file', file.originFileObj || file); form.append('name', name || file.name); form.append('scopes', JSON.stringify(scopes));
        await request('/api/assets', { method: 'POST', body: form });
      }
      notify('app.uploaded'); setUploading(false); setFiles([]); setName(''); refresh();
    } catch (problem) { setError(problem); } finally { setBusy(false); }
  };
  return <div><SectionHeader title={t('assets.title')} subtitle={t('assets.associations')} icon={<FileImageOutlined />} extra={<Button icon={<CloudUploadOutlined />} onClick={() => { setScopes([resolved.document.meta.id]); setUploading(true); setError(null); }}>{t('actions.upload')}</Button>} />
    {!records.length ? <EmptyState label="assets.empty" /> : <div className="asset-grid">{records.map((asset) => <button className="asset-card" key={asset.id} onClick={() => guard(() => setSelected(asset.id))}><MediaPreview asset={asset} /><div className="asset-card-caption"><strong>{labelOf(asset)}</strong><div><span>{asset.media?.mime || t('assets.file')}</span>{asset.media?.size && <span>{Math.ceil(asset.media.size / 1024)} KB</span>}</div><Space size={3} wrap>{(asset.tags || []).slice(0, 3).map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space></div></button>)}</div>}
    <AssetDetails id={selected} onClose={() => guard(() => setSelected(null))} />
    <Modal title={t('assets.upload_title')} open={uploading} onCancel={() => setUploading(false)} okText={t('actions.upload')} cancelText={t('actions.cancel')} onOk={upload} confirmLoading={busy}><ErrorNotice error={error} /><Upload.Dragger multiple beforeUpload={() => false} fileList={files} onChange={({ fileList }) => setFiles(fileList)}><p className="upload-icon"><CloudUploadOutlined /></p><p>{t('assets.upload_hint')}</p></Upload.Dragger><div className="modal-form"><label>{t('fields.name')}</label><Input value={name} onChange={(event) => setName(event.target.value)} /><label>{t('fields.scopes')}</label><Select mode="multiple" value={scopes} onChange={setScopes} options={catalog.filter((item) => ['brand', 'product_line', 'line', 'spu', 'sku'].includes(item.kind)).map((item) => ({ value: item.id, label: labelOf(item) }))} /></div></Modal>
  </div>;
}
