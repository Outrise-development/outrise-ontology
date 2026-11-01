export class ApiError extends Error {
  constructor(code, details, status) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export async function request(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(path, { ...options, headers, body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body });
  } catch (error) {
    throw new ApiError('NETWORK_ERROR', error.message, 0);
  }
  const type = response.headers.get('content-type') || '';
  const data = type.includes('json') ? await response.json() : await response.text();
  if (!response.ok) throw new ApiError(data?.error?.code || `HTTP_${response.status}`, data?.error?.details || data, response.status);
  return data;
}

export const listOf = (value) => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [];
export const metaOf = (value) => value?.meta || value || {};
export const summaryOf = (value) => ({ ...metaOf(value), id: value?.id || metaOf(value).id });
export const labelOf = (value) => metaOf(value).name || metaOf(value).title || value?.name || value?.id || '';
export const kindOf = (value) => metaOf(value).kind;
export const idOf = (value) => typeof value === 'string' ? value : value?.id || value?.entityId || value?.entity_id || '';

export function canHuman(bootstrap, document, operation, block) {
  if (document.meta.archived) return false;
  const schema = listOf(bootstrap.schemas).find((item) => metaOf(item).id === document.meta.schema);
  const ids = [document.meta.policy || metaOf(schema).policy || 'local-edit', block?.attrs?.policy].filter(Boolean);
  return ids.every((id) => {
    const policy = listOf(bootstrap.policies).find((item) => metaOf(item).id === id);
    return policy ? metaOf(policy).actors?.human?.[operation] === true : !['readonly', 'read-only'].includes(id);
  });
}

export function textValue(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function download(content, name, mime = 'text/markdown;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createDataProvider() {
  return {
    getList: async ({ resource }) => {
      const result = await request('/api/catalog?archived=true');
      const data = listOf(result.data || result).map(summaryOf).filter((row) => resource === 'catalog' || row.kind === resource);
      return { data, total: data.length };
    },
    getOne: async ({ id }) => ({ data: await request(`/api/documents/${encodeURIComponent(id)}`) }),
    create: async ({ variables }) => ({ data: await request('/api/entities', { method: 'POST', body: variables }) }),
    update: async ({ id, variables }) => ({ data: await request(`/api/documents/${encodeURIComponent(id)}`, { method: 'PATCH', body: variables }) }),
    deleteOne: async ({ id, variables }) => ({ data: await request(`/api/documents/${encodeURIComponent(id)}`, { method: 'PATCH', body: { ...variables, operation: 'archive' } }) }),
    getApiUrl: () => '/api',
    custom: async ({ url, method = 'get', payload }) => ({ data: await request(url, { method: method.toUpperCase(), body: payload }) }),
  };
}
