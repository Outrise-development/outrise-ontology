import React from 'react';
import { Alert, Button, Tag } from 'antd';
import { useConsole } from '../context';
import { labelOf, listOf, metaOf } from '../api';
import BlockCanvas, { GalleryContent } from './BlockCanvas';
import FieldsPanel from './FieldsPanel';
import { Markdown, SectionHeader } from './Common';
import { MediaPreview } from './AssetsPane';

function FixedBlock({ block, resolved, onSaved }) {
  const { t, catalog, navigate } = useConsole();
  const meta = resolved.document.meta;
  if (block.type === 'fields') return <FieldsPanel resolved={resolved} titleKey={meta.kind === 'listing' ? 'fields.attributes' : 'tabs.facts'} onSaved={onSaved} />;
  if (block.type === 'notice') return <Alert className="template-notice" showIcon type="info" message={block.attrs?.title_key ? t(block.attrs.title_key) : t(meta.kind === 'listing' ? 'listing.internal_draft' : 'app.local')} description={block.content ? <Markdown>{block.content}</Markdown> : meta.kind === 'listing' ? t('listing.pending_validation') : undefined} />;
  if (block.type === 'gallery') {
    const ids = meta.assets || (resolved.related?.assets || []).map((item) => item.id || item.meta?.id);
    return <section className="panel fixed-gallery"><SectionHeader title={t('tabs.media')} /><GalleryContent ids={ids} /></section>;
  }
  if (block.type === 'asset') return <MediaPreview asset={resolved.document} />;
  if (block.type === 'listing') return <div className="channel-summary"><div><span>{t('listing.platform')}</span><strong>{t(`platforms.${meta.platform}`)}</strong></div><div><span>{t('listing.target')}</span><strong>{meta.target || t('fields.unspecified')}</strong></div><div><span>{t('listing.skus')}</span><strong>{meta.skus?.length || 0}</strong></div></div>;
  if (block.type === 'relations') return <div className="related-links">{(resolved.related?.children || []).map((item) => <Button key={item.id} onClick={() => navigate(item.id)}>{labelOf(item)}</Button>)}</div>;
  return <section className="content-block content-block-readonly"><div className="block-content"><Markdown>{block.content || ''}</Markdown>{!['richtext', 'markdown'].includes(block.type) && <pre>{block.raw}</pre>}</div></section>;
}

export default function DocumentCanvas({ resolved, onSaved }) {
  const { bootstrap } = useConsole();
  const template = listOf(bootstrap.templates).find((item) => metaOf(item).id === resolved.document.meta.template);
  const layout = resolved.layout || { fixed: [], regions: [], unplaced: [] };
  const order = layout.order || template?.blocks?.map((block) => ({ kind: block.type === 'region' ? 'region' : 'fixed', id: block.id })) || [...layout.fixed.map((block) => ({ kind: 'fixed', id: block.id })), ...layout.regions.map((region) => ({ kind: 'region', id: region.id }))];
  return <div className="document-canvas">{order.map((entry) => {
    const region = layout.regions.find((item) => item.id === entry.id);
    if (entry.kind === 'region' || entry.type === 'region' || region) return <BlockCanvas key={`region-${entry.id}`} resolved={resolved} onSaved={onSaved} regionId={entry.id} showUnplaced={false} />;
    const block = layout.fixed.find((item) => item.id === entry.id);
    return block ? <FixedBlock key={`fixed-${entry.id}`} block={block} resolved={resolved} onSaved={onSaved} /> : null;
  })}{Boolean(layout.unplaced.length) && <BlockCanvas resolved={resolved} onSaved={onSaved} regionId="__unplaced_only__" />}</div>;
}
