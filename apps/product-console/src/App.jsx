import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useList } from '@refinedev/core';
import { Alert, App, Breadcrumb, Button, Dropdown, Form, Input, Modal, Select, Space, Spin, Switch, Tabs, Tag, Tree } from 'antd';
import { AimOutlined, ApartmentOutlined, AppstoreOutlined, DatabaseOutlined, EllipsisOutlined, FileImageOutlined, FileTextOutlined, FolderOutlined, MenuFoldOutlined, MenuUnfoldOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, ShoppingOutlined } from '@ant-design/icons';
import { ConsoleContext, useDocument } from './context';
import { labelOf, listOf, metaOf, request, summaryOf } from './api';
import { EmptyState, ErrorNotice, Loading, Status } from './components/Common';
import StrategiesPane from './components/StrategiesPane';
import AssetsPane from './components/AssetsPane';
import ListingsPane from './components/ListingsPane';
import Inspector from './components/Inspector';
import { ConfirmButton } from './components/DocumentTools';
import DocumentCanvas from './components/DocumentCanvas';
import OverviewPane from './components/OverviewPane';
import SkuMatrix from './components/SkuMatrix';
import TemplateTools from './components/TemplateTools';

const PRODUCT_KINDS = ['brand', 'product_line', 'line', 'spu', 'sku'];
const kindIcon = (kind) => ({ brand: <ApartmentOutlined />, product_line: <FolderOutlined />, line: <FolderOutlined />, spu: <ShoppingOutlined />, sku: <AppstoreOutlined /> }[kind] || <FileTextOutlined />);

function CreateDialog({ config, onClose, onCreated, catalog, bootstrap, t }) {
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const kind = Form.useWatch('kind', form) || config?.kind || 'spu';
  const platform = Form.useWatch('platform', form) || 'amazon';
  const selectedSpu = Form.useWatch('spu', form);
  useEffect(() => {
    if (config) { form.resetFields(); form.setFieldsValue({ kind: config.kind || 'spu', name: '', platform: 'amazon', ...config.defaults }); setError(null); }
  }, [config, form]);
  useEffect(() => { if (kind === 'listing' && selectedSpu && !(form.getFieldValue('skus') || []).length) form.setFieldValue('skus', catalog.filter((item) => item.kind === 'sku' && item.parent === selectedSpu && !item.archived).map((item) => item.id)); }, [selectedSpu, kind, form]);
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const values = await form.validateFields();
      const templates = listOf(bootstrap.templates);
      const template = templates.find((item) => metaOf(item).entity_kind === values.kind && (!metaOf(item).platform || metaOf(item).platform === values.platform)) || templates.find((item) => metaOf(item).id === `template_${values.kind === 'line' ? 'product_line' : values.kind}${values.kind === 'listing' ? `_${values.platform}` : ''}`);
      const templateMeta = metaOf(template);
      const meta = { ...config.defaults, ...values, ...(templateMeta.id ? { template: templateMeta.id } : {}), schema: templateMeta.schema || (values.kind === 'strategy' ? 'schema_strategy' : values.kind === 'listing' ? 'schema_listing' : ['brand', 'product_line', 'line'].includes(values.kind) ? 'schema_basic' : 'schema_product'), fields: {} };
      if (values.kind === 'listing') { delete meta.parent; meta.target = values.target || listOf(bootstrap.targets).find((item) => item.platform === values.platform)?.id; }
      const result = await request('/api/entities', { method: 'POST', body: meta });
      onCreated(result); onClose();
    } catch (failure) { if (!failure.errorFields) setError(failure); } finally { setBusy(false); }
  };
  return <Modal open={Boolean(config)} title={t('dialogs.create_title')} onCancel={onClose} onOk={submit} okText={t('actions.create')} cancelText={t('actions.cancel')} confirmLoading={busy} destroyOnClose><ErrorNotice error={error} /><Form layout="vertical" form={form} preserve={false}><Form.Item name="kind" label={t('fields.kind')} rules={[{ required: true }]}><Select disabled={['strategy', 'listing'].includes(config?.kind)} options={(config?.kind === 'strategy' ? ['strategy'] : config?.kind === 'listing' ? ['listing'] : PRODUCT_KINDS.filter((item) => item !== 'line')).map((value) => ({ value, label: t(`kinds.${value}`) }))} /></Form.Item><Form.Item name="name" label={t('fields.name')} rules={[{ required: true }]}><Input autoFocus /></Form.Item>{PRODUCT_KINDS.includes(kind) && kind !== 'brand' && <Form.Item name="parent" label={t('fields.parent')} rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={catalog.filter((item) => ({ product_line: ['brand'], line: ['brand'], spu: ['product_line', 'line'], sku: ['spu'] }[kind] || []).includes(item.kind) && !item.archived).map((item) => ({ value: item.id, label: labelOf(item) }))} /></Form.Item>}{kind === 'strategy' && <Form.Item name="scopes" label={t('fields.scopes')}><Select mode="multiple" options={catalog.filter((item) => PRODUCT_KINDS.includes(item.kind)).map((item) => ({ value: item.id, label: labelOf(item) }))} /></Form.Item>}{kind === 'listing' && <><Form.Item name="platform" label={t('listing.platform')}><Select options={['amazon', 'shopify', 'tiktok'].map((value) => ({ value, label: t(`platforms.${value}`) }))} /></Form.Item><Form.Item name="target" label={t('listing.target')}><Select options={listOf(bootstrap.targets).filter((item) => item.platform === platform).map((item) => ({ value: item.id, label: item.name }))} /></Form.Item><Form.Item name="spu" label={t('listing.spu')} rules={[{ required: true }]}><Select onChange={() => form.setFieldValue('skus', [])} options={catalog.filter((item) => item.kind === 'spu').map((item) => ({ value: item.id, label: labelOf(item) }))} /></Form.Item><Form.Item name="skus" label={t('listing.skus')} rules={[{ required: true }]}><Select mode="multiple" options={catalog.filter((item) => item.kind === 'sku' && item.parent === selectedSpu && !item.archived).map((item) => ({ value: item.id, label: labelOf(item) }))} /></Form.Item></>}</Form></Modal>;
}

function EditDialog({ document, onClose, onSaved, mutate, catalog, t }) {
  const [name, setName] = useState(''); const [error, setError] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { setName(document?.meta.name || ''); setError(null); }, [document?.meta.id]);
  return <Modal open={Boolean(document)} title={t('dialogs.edit_title')} onCancel={onClose} okText={t('actions.save')} cancelText={t('actions.cancel')} confirmLoading={busy} onOk={async () => { setBusy(true); try { if (!name.trim()) throw { code: 'REQUIRED' }; await mutate(document.meta.id, document.revision, { operation: 'metadata', changes: { name } }); onClose(); onSaved(); } catch (failure) { setError(failure); } finally { setBusy(false); } }}><ErrorNotice error={error} /><div className="modal-form"><label htmlFor="record-name">{t('fields.name')}</label><Input id="record-name" value={name} onChange={(event) => setName(event.target.value)} /></div></Modal>;
}

const SECTION_COMPONENTS = { overview: OverviewPane, facts: DocumentCanvas, strategies: StrategiesPane, assets: AssetsPane, listings: ListingsPane };
const readRoute = () => Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
const routeHash = route => new URLSearchParams(Object.entries(route).filter(([, value]) => value !== undefined && value !== null && value !== '')).toString();

function Workspace({ id, tick, viewMeta, route, setRoute, onResolved, refresh, t, catalog, createRecord, guard, edit, archive, openSource }) {
  const { data, loading, error } = useDocument(id, tick);
  useEffect(() => { if (data) onResolved(data); }, [data, onResolved]);
  const configured = data?.template?.meta?.sections || viewMeta.tabs || [];
  const sections = configured.filter(item => SECTION_COMPONENTS[item.component || item.key]).map(item => ({ ...item, key: item.key === 'strategy' ? 'strategies' : item.key, label: t(item.label_key || `tabs.${item.key}`) }));
  const globalKey = route.mode && route.mode !== 'catalog' ? route.mode : null;
  const active = globalKey || (sections.some(item => item.key === route.section) ? route.section : sections[0]?.key);
  useEffect(() => { if (data && !globalKey && active && active !== route.section) setRoute({ section: active }, { replace: true, guarded: false }); }, [data?.document.meta.id, active, route.section, globalKey]);
  if (!id) return <main className="workspace"><EmptyState label="app.empty_catalog" action={<Button type="primary" onClick={() => createRecord('brand')}>{t('actions.create')}</Button>} /></main>;
  if (!data) return <main className="workspace">{error ? <ErrorNotice error={error} /> : <Loading />}</main>;
  const renderData = globalKey ? { ...data, related: { ...data.related, strategies: catalog.filter(item => item.kind === 'strategy' && !item.archived), assets: catalog.filter(item => item.kind === 'asset' && !item.archived), listings: catalog.filter(item => item.kind === 'listing' && !item.archived) } } : data;
  const meta = data.document.meta;
  const ancestors = (data.related?.ancestors || []).map(summaryOf);
  const section = sections.find(item => item.key === active);
  const Component = SECTION_COMPONENTS[globalKey || section?.component || active];
  return <main className="workspace"><div className="workspace-breadcrumb"><Breadcrumb items={globalKey ? [{ title: t('navigation.overview') }, { title: t(`tabs.${globalKey}`) }] : [...ancestors, summaryOf(data.document)].map(item => ({ title: <button className="breadcrumb-button" onClick={() => setRoute({ entity: item.id, section: undefined, sku: undefined, listing: undefined, panel: undefined })}>{labelOf(item)}</button> }))} /><span className="workspace-location"><span className="workspace-marker" />{t('app.local')}</span></div>
    <header className="page-heading"><div><div className="page-title-line"><span className={`entity-icon entity-${meta.kind}`}>{kindIcon(meta.kind)}</span><h1>{globalKey ? t(`tabs.${globalKey}`) : labelOf(data.document)}</h1>{!globalKey && <Status state={data.review?.state || 'waiting'} />}</div><div className="entity-subtitle"><Tag bordered={false}>{t(`kinds.${meta.kind}`)}</Tag>{loading && <Spin size="small" />}</div></div>{!globalKey && <div className="page-toolbar"><Button onClick={() => openSource({ documentId: meta.id })}>{t('inspector.title')}</Button><TemplateTools resolved={data} /><ConfirmButton resolved={data} onSaved={refresh} size="middle" /><Dropdown menu={{ items: [{ key: 'edit', label: t('actions.edit') }, { key: 'archive', label: t('actions.archive'), danger: true }], onClick: ({ key }) => guard(() => key === 'edit' ? edit(data.document) : archive(data)) }}><Button icon={<EllipsisOutlined />} aria-label={t('actions.edit')} /></Dropdown></div>}</header>
    {!globalKey && <Tabs className="workspace-tabs" activeKey={active} onChange={key => setRoute({ section: key, panel: undefined })} items={sections.map(({key,label}) => ({key,label}))} />}
    <div className="workspace-content"><ErrorNotice error={error} />{Component ? <Component key={`${globalKey || meta.id}-${active}`} resolved={renderData} onSaved={refresh} /> : <EmptyState label="workbench.no_sections" />}{active === 'facts' && meta.kind === 'spu' && <SkuMatrix resolved={data} />}</div>
  </main>;
}

export default function ConsoleApp({ bootstrap, onBootstrap, t }) {
  const { message, modal } = App.useApp();
  const listing = useList({ resource: 'catalog', pagination: { mode: 'off' } });
  const catalog = (listing.result?.data || listing.data?.data || []).map(summaryOf);
  const [route, updateRoute] = useState(readRoute);
  const routeRef = useRef(route); routeRef.current = route;
  const historyIndex = useRef(window.history.state?.outriseIndex ?? 0);
  const revertingHistory = useRef(null);
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [create, setCreate] = useState(null);
  const [editing, setEditing] = useState(null);
  const [inspected, setInspected] = useState(null);
  const [connected, setConnected] = useState(false);
  const [remoteChanged, setRemoteChanged] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [dirtyMap, setDirtyMap] = useState({});
  const [discardEpoch, setDiscardEpoch] = useState(0);
  const dirtyRef = useRef(false);
  const hasDirty = Object.values(dirtyMap).some(Boolean); dirtyRef.current = hasDirty;
  const setDirty = useCallback((key, dirty) => setDirtyMap(current => current[key] === dirty ? current : { ...current, [key]: dirty }), []);
  const notify = useCallback(key => message.success(t(key)), [message, t]);
  const reportError = useCallback(failure => { const code = failure.code || 'UNKNOWN_ERROR'; const key = `errors.${code}`; message.error(t(key) === key ? code : t(key)); }, [message, t]);
  const guard = useCallback(action => {
    if (!dirtyRef.current) return action();
    modal.confirm({ title: t('dialogs.unsaved_title'), content: t('dialogs.unsaved_body'), okText: t('actions.discard'), cancelText: t('actions.cancel'), onOk: () => { setDirtyMap({}); dirtyRef.current = false; setDiscardEpoch(value => value + 1); action(); } });
  }, [modal, t]);
  const setRoute = useCallback((changes, { replace = false, guarded = true } = {}) => {
    const apply = () => {
      const next = { ...routeRef.current, ...changes };
      for (const key of Object.keys(next)) if (next[key] === undefined || next[key] === null || next[key] === '') delete next[key];
      const hash = routeHash(next);
      if (hash === routeHash(routeRef.current)) return;
      const url = `${location.pathname}${location.search}${hash ? `#${hash}` : ''}`;
      if (!replace) historyIndex.current += 1;
      window.history[replace ? 'replaceState' : 'pushState']({ ...window.history.state, outriseIndex: historyIndex.current }, '', url);
      routeRef.current = next; updateRoute(next);
    };
    return guarded ? guard(apply) : apply();
  }, [guard]);
  const navigate = useCallback((id, opts = {}) => { if (id) setRoute({ entity: id, brand: undefined, mode: undefined, section: undefined, sku: undefined, listing: undefined, panel: undefined, source: undefined, sourceField: undefined, sourceBlock: undefined, ...opts }); }, [setRoute]);
  const openSource = useCallback(ref => setRoute({ source: ref.documentId || routeRef.current.entity, sourceField: ref.field, sourceBlock: ref.blockId }, { guarded: false }), [setRoute]);
  useEffect(() => {
    if (window.history.state?.outriseIndex === undefined) window.history.replaceState({ ...window.history.state, outriseIndex: historyIndex.current }, '', location.href);
    const changed = () => {
      const next = readRoute();
      let nextIndex = window.history.state?.outriseIndex;
      if (revertingHistory.current) {
        if (nextIndex !== historyIndex.current) return;
        const pending = revertingHistory.current;
        revertingHistory.current = null;
        guard(() => window.history.go(pending.delta));
        return;
      }
      if (routeHash(next) === routeHash(routeRef.current)) { if (typeof nextIndex === 'number') historyIndex.current = nextIndex; return; }
      // An in-page hash link creates an unmarked history entry. Give it the same
      // index contract as routes created by the Console.
      if (typeof nextIndex !== 'number') {
        nextIndex = historyIndex.current + 1;
        window.history.replaceState({ ...window.history.state, outriseIndex: nextIndex }, '', location.href);
      }
      const previous = routeRef.current;
      const affectsEditor = ['entity','section','sku','listing','panel','mode'].some(key => next[key] !== previous[key]);
      if (dirtyRef.current && affectsEditor) {
        const delta = nextIndex - historyIndex.current;
        if (delta) { revertingHistory.current = { delta }; window.history.go(-delta); }
        else { window.history.replaceState({ ...window.history.state, outriseIndex: historyIndex.current }, '', `${location.pathname}${location.search}#${routeHash(previous)}`); guard(() => setRoute(next, { guarded: false })); }
      } else { historyIndex.current = nextIndex; routeRef.current = next; updateRoute(next); }
    };
    window.addEventListener('popstate', changed); window.addEventListener('hashchange', changed);
    return () => { window.removeEventListener('popstate', changed); window.removeEventListener('hashchange', changed); };
  }, [guard, setRoute]);
  const refresh = useCallback(() => { setTick(value => value + 1); setRemoteChanged(false); listing.query?.refetch?.(); listing.refetch?.(); }, [listing.query?.refetch, listing.refetch]);
  const refreshRef = useRef(refresh); refreshRef.current = refresh;
  const mutating = useRef(0);
  const mutate = useCallback(async (id, revision, operation) => {
    mutating.current++;
    try { const result = await request(`/api/documents/${encodeURIComponent(id)}`, { method: 'PATCH', body: { expectedRevision: revision, ...operation } }); notify('app.saved'); return result; } finally { mutating.current--; }
  }, [notify]);
  const confirmDocument = useCallback(async (id, revision) => {
    mutating.current++;
    try { const result = await request(`/api/documents/${encodeURIComponent(id)}/confirm`, { method: 'POST', body: { expectedRevision: revision } }); notify('app.confirmed'); return result; } finally { mutating.current--; }
  }, [notify]);
  const createRecord = useCallback((kind, defaults = {}) => guard(() => setCreate({ kind, defaults })), [guard]);
  useEffect(() => { document.title = t('app.name'); }, [t]);
  useEffect(() => {
    if (!catalog.length) return;
    const selected = catalog.find(item => item.id === route.entity);
    if (!route.entity) navigate(catalog.find(item => item.kind === 'brand')?.id || catalog[0]?.id);
    else if (selected?.kind === 'sku' && selected.parent) setRoute({ entity: selected.parent, section: 'facts', sku: selected.id }, { replace: true, guarded: false });
  }, [catalog, route.entity, navigate, setRoute]);
  useEffect(() => { const beforeUnload = event => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', beforeUnload); return () => window.removeEventListener('beforeunload', beforeUnload); }, []);
  useEffect(() => {
    const stream = new EventSource('/api/events');
    const changed = () => {
      if (mutating.current) return;
      if (dirtyRef.current) setRemoteChanged(true); else { refreshRef.current(); request('/api/bootstrap').then(onBootstrap).catch(() => {}); }
    };
    stream.onopen = () => setConnected(true); stream.onerror = () => setConnected(false); stream.onmessage = changed;
    stream.addEventListener('change', changed); stream.addEventListener('updated', changed); stream.addEventListener('document', changed);
    return () => stream.close();
  }, [onBootstrap]);
  const view = listOf(bootstrap.views).find(item => metaOf(item).id === 'view_catalog') || listOf(bootstrap.views)[0];
  const viewMeta = metaOf(view);
  const catalogKinds = viewMeta.navigation?.find(item => item.key === 'catalog')?.kinds || PRODUCT_KINDS;
  const brands = catalog.filter(item => item.kind === 'brand' && (showArchived || !item.archived));
  const ancestorBrand = item => { const seen = new Set(); while (item && item.kind !== 'brand' && !seen.has(item.id)) { seen.add(item.id); item = catalog.find(candidate => candidate.id === item.parent || candidate.id === item.spu); } return item?.kind === 'brand' ? item.id : undefined; };
  const selectedBrand = route.brand === 'all' ? undefined : route.brand || ancestorBrand(catalog.find(item => item.id === route.entity));
  const filtered = catalog.filter(item => catalogKinds.includes(item.kind) && (showArchived || !item.archived) && (!selectedBrand || ancestorBrand(item) === selectedBrand));
  const visibleIds = new Set(filtered.filter(item => !search || `${labelOf(item)} ${item.id}`.toLowerCase().includes(search.toLowerCase())).map(item => item.id));
  for (const id of [...visibleIds]) { let current = filtered.find(item => item.id === id); const seen = new Set(); while (current?.parent && !seen.has(current.id)) { seen.add(current.id); visibleIds.add(current.parent); current = filtered.find(item => item.id === current.parent); } }
  const treeNodes = parent => filtered.filter(item => (item.parent || null) === parent && visibleIds.has(item.id)).map(item => ({ key: item.id, icon: kindIcon(item.kind), title: <div className="catalog-node"><span>{labelOf(item)}</span><small>{t(`kinds.${item.kind}`)}</small></div>, children: treeNodes(item.id) }));
  const archive = resolved => modal.confirm({ title: t('dialogs.archive_title'), content: t('dialogs.archive_body'), okText: t('actions.archive'), cancelText: t('actions.cancel'), okButtonProps: { danger: true }, onOk: async () => { try { await mutate(resolved.document.meta.id, resolved.document.revision, { operation: 'archive' }); refresh(); } catch (failure) { reportError(failure); throw failure; } } });
  const context = { t, bootstrap, catalog, tick, refresh, mutate, confirmDocument, navigate, route, setRoute, openSource, guard, setDirty, hasDirty, notify, reportError, setInspected, createRecord };
  return <ConsoleContext.Provider value={context}><div className={`console-shell ${collapsed ? 'sidebar-collapsed' : ''}`}><aside className="catalog-sidebar"><div className="brand-header"><div className="brand-symbol"><ApartmentOutlined /></div><div><strong>{t('app.name')}</strong><span>{t('app.subtitle')}</span></div></div><div className="brand-selector"><label>{t('workbench.brand_selector')}</label><Select aria-label={t('workbench.brand_selector')} value={selectedBrand} placeholder={t('workbench.all_brands')} allowClear options={brands.map(item => ({value:item.id,label:labelOf(item)}))} onChange={value => value ? navigate(value, { brand: value }) : setRoute({brand: 'all'}, {guarded:false})} /></div>
    <nav className="module-nav">{(viewMeta.navigation || []).map(item => <button key={item.key} className={(route.mode || 'catalog') === item.key ? 'active' : ''} onClick={() => setRoute({ mode: item.key === 'catalog' ? undefined : item.key, section: item.key === 'catalog' ? undefined : item.key, sku: undefined, listing: undefined, panel: undefined })}>{item.key === 'catalog' ? <DatabaseOutlined /> : item.key === 'strategies' ? <AimOutlined /> : item.key === 'assets' ? <FileImageOutlined /> : <FileTextOutlined />}<span>{t(item.label_key)}</span></button>)}</nav>
    <div className="sidebar-section-title"><span>{t('navigation.catalog')}</span><Space size={0}><Dropdown trigger={['click']} menu={{ items: [{ key: 'archived', label: <Space><span>{t('navigation.show_archived')}</span><Switch size="small" checked={showArchived} onChange={setShowArchived} /></Space> }] }}><Button size="small" type="text" icon={<EllipsisOutlined />} aria-label={t('navigation.show_archived')} /></Dropdown><Button size="small" type="text" icon={<PlusOutlined />} aria-label={t('actions.new_product')} onClick={() => createRecord('spu', { parent: filtered.find(item => ['product_line','line'].includes(item.kind))?.id })} /></Space></div><div className="catalog-search"><Input aria-label={t('navigation.search')} prefix={<SearchOutlined />} placeholder={t('navigation.search')} value={search} onChange={event => setSearch(event.target.value)} allowClear /></div><div className="catalog-tree"><Tree showIcon blockNode defaultExpandedKeys={filtered.filter(item => item.kind === 'brand' || item.kind === 'product_line' || search).map(item => item.id)} key={`tree-${selectedBrand}-${catalog.length}-${Boolean(search)}`} treeData={treeNodes(null)} selectedKeys={route.mode ? [] : [route.sku || route.entity].filter(Boolean)} onSelect={keys => keys[0] && navigate(keys[0], {brand: route.brand === 'all' ? 'all' : selectedBrand})} /></div><div className="sidebar-footer"><div><span className={`connection-dot ${connected ? 'live' : ''}`} />{t(connected ? 'app.connection_live' : 'app.connection_offline')}</div><Button type="text" icon={<MenuFoldOutlined />} title={t('ui.collapse')} onClick={() => setCollapsed(true)} /></div></aside>
    {collapsed && <button className="sidebar-expand" aria-label={t('ui.expand')} onClick={() => setCollapsed(false)}><MenuUnfoldOutlined /></button>}
    <div className="main-layout">{remoteChanged && <Alert className="remote-alert" type="warning" banner message={t('app.remote_changed')} action={<Button size="small" onClick={() => guard(() => { refresh(); request('/api/bootstrap').then(onBootstrap).catch(reportError); })} icon={<ReloadOutlined />}>{t('actions.reload')}</Button>} />}<Workspace key={`${route.entity}-${discardEpoch}`} id={route.entity} tick={tick} viewMeta={viewMeta} route={route} setRoute={setRoute} onResolved={setInspected} refresh={refresh} t={t} catalog={catalog} createRecord={createRecord} guard={guard} edit={setEditing} archive={archive} openSource={openSource} /><Inspector resolved={inspected} /></div>
    <CreateDialog config={create} onClose={() => guard(() => setCreate(null))} catalog={catalog} bootstrap={bootstrap} t={t} onCreated={result => { notify('app.created'); refresh(); const doc = result.document || result; const id = doc.id || doc.meta?.id; if (id) navigate(id); }} /><EditDialog document={editing} onClose={() => setEditing(null)} onSaved={refresh} mutate={mutate} catalog={catalog} t={t} />
  </div></ConsoleContext.Provider>;
}
