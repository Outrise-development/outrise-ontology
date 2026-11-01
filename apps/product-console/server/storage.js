import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fail } from './errors.js';

const excluded = new Set(['.history', '.proposals', '.tmp', '.locks', '.git', 'node_modules']);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

/**
 * Storage boundary for the MVP. Keys are workspace-relative POSIX paths.
 * A future object-store adapter implements the same list/read/write/asset methods
 * and uses native ETag/If-Match for writes. Local multi-document transactions
 * acquire the cooperative workspace lease in WorkspaceStore before calling write.
 * JSON indexes and any future Mongo projection are rebuildable, never canonical.
 */
export class LocalFileStorage {
  constructor({ root }) { this.root = path.resolve(root); }

  async resolve(key, { mustExist = false } = {}) {
    if (typeof key !== 'string' || key.includes('\0') || path.isAbsolute(key)) fail('INVALID_PATH', { path: key }, 403);
    const target = path.resolve(this.root, key);
    const relative = path.relative(this.root, target);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) fail('INVALID_PATH', { path: key }, 403);
    let current = this.root;
    for (const part of relative.split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      try {
        if ((await fs.lstat(current)).isSymbolicLink()) fail('SYMLINK_DENIED', { path: key }, 403);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (mustExist) await fs.access(target);
    return target;
  }

  async listDocuments({ prefix = '', internal = false } = {}) {
    const start = await this.resolve(prefix);
    const output = [];
    const visit = async directory => {
      let entries;
      try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.isSymbolicLink()) continue;
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          if (!internal && excluded.has(entry.name)) continue;
          await visit(file);
        } else if (entry.isFile() && entry.name.endsWith('.md')) output.push(path.relative(this.root, file).split(path.sep).join('/'));
      }
    };
    await visit(start);
    return output;
  }

  async read(key) {
    const physical = await this.resolve(key, { mustExist: true });
    const raw = await fs.readFile(physical, 'utf8');
    return { key, raw, revision: hash(raw), modifiedAt: (await fs.stat(physical)).mtimeMs };
  }

  async write(key, raw, { expectedRevision, exclusive = false } = {}) {
    const physical = await this.resolve(key);
    if (expectedRevision !== undefined) {
      const current = await this.read(key).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (current?.revision !== expectedRevision) fail('REVISION_CONFLICT', { key, expectedRevision, currentRevision: current?.revision }, 409);
    }
    await fs.mkdir(path.dirname(physical), { recursive: true });
    if (exclusive) await fs.writeFile(physical, raw, { encoding: 'utf8', flag: 'wx' });
    else {
      const temporary = path.join(path.dirname(physical), `.write-${crypto.randomUUID()}.tmp`);
      try {
        await fs.writeFile(temporary, raw, { encoding: 'utf8', flag: 'wx' });
        await fs.rename(temporary, physical);
      } finally { await fs.unlink(temporary).catch(() => {}); }
    }
    return { key, revision: hash(raw) };
  }

  async readAsset(key) {
    const buffer = await fs.readFile(await this.resolve(key, { mustExist: true }));
    return { key, buffer, revision: hash(buffer) };
  }

  async writeAsset(key, buffer) {
    const physical = await this.resolve(key);
    await fs.mkdir(path.dirname(physical), { recursive: true });
    await fs.writeFile(physical, buffer, { flag: 'wx' });
    return { key, revision: hash(buffer) };
  }

  assetUrl(key) { return `/api/media/${key.split('/').map(encodeURIComponent).join('/')}`; }
}
