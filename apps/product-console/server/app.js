import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore } from './store.js';
import { StoreError } from './errors.js';

const appRoot = fileURLToPath(new URL('../', import.meta.url));
const allowedOrigins = new Set([4317, 4318, 5173].flatMap(port => [`http://127.0.0.1:${port}`, `http://localhost:${port}`, `http://[::1]:${port}`]));

function localRequest(req, res, next) {
  const address = req.socket.remoteAddress;
  if (address && !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)) return next(new StoreError('LOOPBACK_ONLY', {}, 403));
  const hostname = req.hostname?.toLowerCase();
  if (hostname && !['127.0.0.1', 'localhost', '[::1]', '::1'].includes(hostname)) return next(new StoreError('INVALID_HOST', {}, 403));
  const origin = req.get('origin');
  if (origin && !allowedOrigins.has(origin)) return next(new StoreError('ORIGIN_DENIED', {}, 403));
  if (req.get('sec-fetch-site') === 'cross-site') return next(new StoreError('ORIGIN_DENIED', {}, 403));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  next();
}

export async function createApp({ workspace = path.join(appRoot, '.local/workspace'), watch = true, seed = true, demo } = {}) {
  const store = await openStore({ workspace, watch, seed, ...(demo ? { demo } : {}) });
  const app = express();
  app.disable('x-powered-by');
  app.use(localRequest);
  app.use(express.json({ limit: '3mb', strict: true }));
  app.use('/api', (req, res, next) => {
    if (['POST', 'PATCH', 'PUT'].includes(req.method) && !req.path.startsWith('/assets') && !req.is('application/json')) return next(new StoreError('JSON_REQUIRED', {}, 415));
    next();
  });

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.get('/api/bootstrap', (req, res) => res.json(store.bootstrap()));
  app.get('/api/catalog', (req, res) => {
    const data = store.list({ kind: req.query.kind, parent: req.query.parent, q: req.query.q, includeArchived: req.query.archived === 'true' });
    res.json({ data, total: data.length });
  });
  app.get('/api/documents/:id', (req, res) => res.json(store.publicDocument(store.get(req.params.id))));
  app.get('/api/entities/:id/resolved', async (req, res) => res.json(await store.resolved(req.params.id)));
  app.post('/api/entities', async (req, res) => res.status(201).json(await store.create(req.body.meta ?? req.body)));
  app.patch('/api/documents/:id', async (req, res) => res.json(await store.patch(req.params.id, req.body)));
  app.post('/api/documents/:id/confirm', async (req, res) => res.json(await store.confirm(req.params.id, req.body.expectedRevision)));
  app.get('/api/documents/:id/history', async (req, res) => { store.get(req.params.id); res.json({ data: await store.history(req.params.id) }); });
  app.get('/api/listings/:id/context', async (req, res) => res.json(await store.context(req.params.id)));
  app.post('/api/listings/:id/proposals', async (req, res) => res.status(201).json(await store.propose(req.params.id, req.body)));
  app.get('/api/proposals/:id', async (req, res) => res.json(await store.proposal(req.params.id)));
  app.post('/api/proposals/:id/adopt', async (req, res) => res.json(await store.adopt(req.params.id, req.body.expectedRevision)));
  app.get('/api/listings/:id/export', async (req, res) => {
    const format = req.query.format ?? 'md';
    const result = await store.export(req.params.id, format);
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.id}.${format === 'json' ? 'json' : 'md'}"`);
    if (format === 'json') res.json(result);
    else res.type('text/markdown').send(result);
  });

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, files: 1, fields: 10 } });
  app.post('/api/assets', upload.single('file'), async (req, res) => {
    if (!req.file) throw new StoreError('FILE_REQUIRED');
    let scopes;
    try { scopes = req.body.scopes ? JSON.parse(req.body.scopes) : []; } catch { throw new StoreError('INVALID_SCOPES'); }
    if (!Array.isArray(scopes) || scopes.some(item => typeof item !== 'string')) throw new StoreError('INVALID_SCOPES');
    res.status(201).json(await store.upload({ buffer: req.file.buffer, originalName: req.file.originalname, mime: req.file.mimetype, name: req.body.name, scopes }));
  });

  app.get('/api/media/*key', async (req, res) => {
    const segments = req.params.key;
    const key = Array.isArray(segments) ? segments.join('/') : segments;
    if (typeof key !== 'string' || !key.startsWith('media/')) throw new StoreError('NOT_FOUND', {}, 404);
    // Resolve only registered asset objects; never expose arbitrary workspace files.
    const asset = [...store.documents.values()].find(document => document.meta.kind === 'asset' && !document.meta.archived && document.meta.media?.key === key);
    if (!asset) throw new StoreError('NOT_FOUND', {}, 404);
    const physical = await store.safePath(key, { mustExist: true });
    res.setHeader('Content-Type', asset.meta.media.mime || 'application/octet-stream');
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'");
    res.sendFile(physical, { dotfiles: 'deny' });
  });

  const clients = new Set();
  app.get('/api/events', (req, res) => {
    res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.flushHeaders();
    res.write(`event: ready\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
    clients.add(res);
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20_000);
    heartbeat.unref();
    req.on('close', () => { clearInterval(heartbeat); clients.delete(res); });
  });
  const broadcast = data => {
    for (const response of clients) response.write(`event: change\ndata: ${JSON.stringify(data)}\n\n`);
  };
  store.on('change', broadcast);
  store.on('diagnostic', broadcast);

  app.use('/api', (req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', details: {} } }));
  const dist = path.join(appRoot, 'dist');
  if (await fs.stat(dist).then(stat => stat.isDirectory()).catch(() => false)) {
    app.use(express.static(dist));
    app.get('/{*path}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status ?? (error.code === 'LIMIT_FILE_SIZE' ? 413 : error instanceof SyntaxError ? 400 : error.code === 'ENOENT' ? 404 : 500);
    const code = error.code ?? (status === 400 ? 'INVALID_JSON' : 'INTERNAL_ERROR');
    const details = error.details ?? (status < 500 ? {} : { message: error.message });
    res.status(status).json({ error: { code, details } });
  });

  return { app, store, close: async () => { for (const response of clients) response.end(); await store.close(); } };
}
