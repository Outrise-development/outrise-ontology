import React from 'react';
import { Button, Space, Tag } from 'antd';
import { useConsole } from '../context';
import { canHuman } from '../api';
import { ErrorNotice, SectionHeader } from './Common';
import { useSemanticSave } from './SemanticRelations';

/** Issue resolution is an explicit human edit, never inferred from free-form copy. */
export default function IssuePanel({ resolved }) {
  const { t, bootstrap, guard, refresh, openSource } = useConsole();
  const save = useSemanticSave(resolved, refresh);
  const issues = resolved.document.meta.issues || [];
  if (!issues.length) return null;
  const editable = canHuman(bootstrap, resolved.document, 'metadata');
  return <section className="panel business-issues"><SectionHeader title={t('issues.title')} subtitle={t('issues.hint')} /><ErrorNotice error={save.error} />{issues.map(issue => <div className="reference-editor-row" key={issue.id}><div><Tag color={issue.status === 'open' ? 'orange' : 'default'}>{t(`issues.${issue.status}`)}</Tag><span>{issue.message}</span></div><Space><Button size="small" onClick={() => openSource({ documentId: resolved.document.meta.id, field: issue.field, blockId: issue.blockId })}>{t('inspector.source')}</Button>{editable && <Button size="small" loading={save.busy} onClick={() => guard(() => save.perform({ operation: 'metadata', changes: { issues: issues.map(item => item.id === issue.id ? { ...item, status: item.status === 'open' ? 'resolved' : 'open' } : item) } }))}>{t(issue.status === 'open' ? 'issues.resolve' : 'issues.reopen')}</Button>}</Space></div>)}{save.comparisonDialog}</section>;
}
