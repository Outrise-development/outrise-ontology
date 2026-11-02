import React, { useState } from 'react';
import { Button, Input, Modal } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useConsole, useDirty } from '../context';
import { canHuman } from '../api';
import { EmptyState, ErrorNotice, SectionHeader } from './Common';
import BlockCanvas from './BlockCanvas';
import { ReferenceList, useSemanticSave } from './SemanticRelations';

export default function BriefsPane({ resolved, onSaved }) {
  const { t, bootstrap, guard } = useConsole();
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const save = useSemanticSave(resolved, onSaved);
  const document = resolved.document;
  const regions = (resolved.layout?.regions || []).map(region => ({ ...region, blocks: region.blocks.filter(block => block.type === 'brief' || block.attrs?.purpose === 'brief') })).filter(region => region.blocks.length);
  const target = (resolved.layout?.regions || []).find(region => region.id === 'briefs' && region.config.can_add !== false && region.config.allowed_types?.includes('richtext')) || (resolved.layout?.regions || []).find(region => region.config.can_add !== false && region.config.allowed_types?.includes('richtext'));
  const editable = target && canHuman(bootstrap, document, 'blocks');
  useDirty(`brief-create-${document.meta.id}`, dirty);
  const close = () => { setDraft(null); setDirty(false); };
  const fields = ['headline', 'supporting', 'visual', 'materials', 'evidence', 'boundaries'];
  const create = () => save.perform({ operation: 'addBlock', region: target.id, block: { id: `brief_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`, type: 'richtext', attrs: { region: target.id, purpose: 'brief', title: draft.title }, content: fields.filter(key => draft[key]?.trim()).map(key => `## ${t(`briefs.${key}`)}\n\n${draft[key]}`).join('\n\n') } }, close);
  return <section className="panel briefs-pane"><SectionHeader title={t('briefs.title')} subtitle={t('briefs.hint')} extra={editable && <Button aria-label={t('briefs.add')} size="small" icon={<PlusOutlined />} onClick={() => guard(() => { setDraft({}); setDirty(false); })}>{t('briefs.add')}</Button>} /><ErrorNotice error={save.error} />
    {regions.length ? <>{regions.map(region => <div key={region.id}><BlockCanvas resolved={{ ...resolved, layout: { ...resolved.layout, regions: [region], unplaced: [] } }} onSaved={onSaved} hideHeader showUnplaced={false} />{region.blocks.map(block => <div key={block.id} className="brief-evidence"><strong>{block.attrs?.title}</strong><ReferenceList resolved={resolved} usedBy={block.id} empty={false} /></div>)}</div>)}</> : <EmptyState label="briefs.empty" />}
    <Modal open={Boolean(draft)} width={760} title={t('briefs.add')} okText={t('actions.create')} cancelText={t('actions.cancel')} confirmLoading={save.busy} okButtonProps={{ disabled: !draft?.title?.trim() }} onCancel={() => guard(close)} onOk={create}>{draft && <div className="semantic-form"><ErrorNotice error={save.error} /><label>{t('blocks.title')}<Input aria-label={t('blocks.title')} value={draft.title || ''} onChange={event => { setDraft(current => ({ ...current, title: event.target.value })); setDirty(true); }} /></label>{fields.map(key => <label key={key}>{t(`briefs.${key}`)}<Input.TextArea aria-label={t(`briefs.${key}`)} rows={2} value={draft[key] || ''} onChange={event => { setDraft(current => ({ ...current, [key]: event.target.value })); setDirty(true); }} /></label>)}</div>}</Modal>{save.comparisonDialog}
  </section>;
}
