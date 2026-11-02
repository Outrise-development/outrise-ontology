import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Refine } from '@refinedev/core';
import { App as AntApp, ConfigProvider, Spin } from 'antd';
import { createDataProvider, request } from './api';
import ConsoleApp from './App';
import './styles.css';

const dataProvider = createDataProvider();

function Boot() {
  const [bootstrap, setBootstrap] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    request('/api/bootstrap').then(setBootstrap).catch(setError);
  }, []);
  if (!bootstrap) return <div className="boot-screen">{error ? <div role="alert"><code>{error.code || 'NETWORK_ERROR'}</code><pre>{String(error.details || '')}</pre></div> : <Spin size="large" />}</div>;
  const t = (key, params = {}) => {
    let value = bootstrap.messages?.[key] ?? key;
    Object.entries(params).forEach(([name, replacement]) => { value = value.replaceAll(`{${name}}`, String(replacement)); });
    return value;
  };
  const locale = {
    locale: 'zh-cn',
    global: { close: t('actions.close') },
    Empty: { description: t('ui.empty') },
    Modal: { okText: t('ui.ok'), cancelText: t('actions.cancel'), justOkText: t('ui.ok') },
    Popconfirm: { okText: t('ui.ok'), cancelText: t('actions.cancel') },
    Select: { notFoundContent: t('ui.empty') },
    Upload: { uploading: t('app.loading'), removeFile: t('ui.upload_remove'), uploadError: t('errors.SAVE_FAILED'), previewFile: t('ui.upload_preview'), downloadFile: t('ui.upload_download') },
    Pagination: { items_per_page: t('ui.items'), jump_to: t('ui.pagination_jump'), jump_to_confirm: t('ui.ok'), page: t('ui.pagination_page'), prev_page: t('ui.pagination_previous'), next_page: t('ui.pagination_next') },
    Form: { defaultValidateMessages: { required: t('dialogs.required'), types: { number: t('errors.INVALID_FIELDS') } } },
  };
  return <ConfigProvider button={{ autoInsertSpace: false }} locale={locale} theme={{ token: { colorPrimary: '#345e9b', colorText: '#242b35', colorTextSecondary: '#78818f', colorBgLayout: '#f5f6f8', colorBorder: '#e2e6ec', borderRadius: 6, fontSize: 13, fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif', controlHeight: 34 }, components: { Button: { primaryShadow: 'none' }, Tabs: { horizontalItemGutter: 28 }, Tree: { nodeHoverBg: '#ffffff0c', nodeSelectedBg: '#ffffff14', colorText: '#c5cbd5', colorBgContainer: 'transparent' } } }}>
    <AntApp><Refine dataProvider={dataProvider} i18nProvider={{ translate: t, changeLocale: async () => {}, getLocale: () => 'zh-CN' }} resources={['catalog', 'brand', 'line', 'spu', 'sku', 'strategy', 'asset', 'listing'].map((name) => ({ name, meta: { label: t(`kinds.${name}`) } }))} options={{ disableTelemetry: true }}><ConsoleApp bootstrap={bootstrap} onBootstrap={setBootstrap} t={t} /></Refine></AntApp>
  </ConfigProvider>;
}

createRoot(document.getElementById('root')).render(<Boot />);
