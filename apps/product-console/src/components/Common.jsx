import React from 'react';
import { Alert, Empty, Spin, Tag, Typography } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, InboxOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { useConsole } from '../context';
import { textValue } from '../api';

export function Status({ state = 'draft', compact = false }) {
  const { t } = useConsole();
  return <Tag className={`status-tag state-${state}`} icon={state === 'confirmed' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}>{!compact && t(`states.${state}`)}</Tag>;
}

export function Markdown({ children = '' }) {
  return <div className="markdown"><ReactMarkdown skipHtml components={{ a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />, img: ({ node, ...props }) => <img {...props} loading="lazy" alt={props.alt || ''} /> }}>{String(children)}</ReactMarkdown></div>;
}

export function ErrorNotice({ error, onReload }) {
  const { t } = useConsole();
  if (!error) return null;
  const code = error.code || error.error?.code || 'UNKNOWN_ERROR';
  const translated = t(`errors.${code}`);
  return <Alert className="operation-error" type="error" showIcon message={translated === `errors.${code}` ? code : translated} description={error.details ? <pre>{textValue(error.details)}</pre> : null} />;
}

export function Loading({ children }) {
  return <div className="section-loading"><Spin />{children}</div>;
}

export function EmptyState({ label, action, icon }) {
  const { t } = useConsole();
  return <div className="empty-state"><div className="empty-state-icon">{icon || <InboxOutlined />}</div><Typography.Text type="secondary">{t(label || 'ui.empty')}</Typography.Text>{action}</div>;
}

export function SectionHeader({ title, subtitle, extra, icon = <FileTextOutlined /> }) {
  return <div className="section-heading"><div className="section-heading-main"><span className="section-icon">{icon}</span><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div></div>{extra && <div className="section-heading-actions">{extra}</div>}</div>;
}

export function DiagnosticList({ diagnostics = [] }) {
  const { t } = useConsole();
  if (!diagnostics.length) return <div className="quiet-note">{t('inspector.no_diagnostics')}</div>;
  const label = (item) => { if (item.message_key) return t(item.message_key); for (const prefix of ['diagnostics', 'errors']) { const key = `${prefix}.${item.code || item.reason}`; if (t(key) !== key) return t(key); } return item.message || item.code || item.reason || textValue(item); };
  return <div className="diagnostic-list">{diagnostics.map((item, index) => <div key={`${item.code || item.reason}-${index}`} className="diagnostic"><span className="diagnostic-dot" /><div><strong>{label(item)}</strong>{item.path && <code>{item.path}</code>}{item.line && <small>{item.line}{item.column ? `:${item.column}` : ''}</small>}</div></div>)}</div>;
}
