import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';

export { createApp } from './app.js';

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const workspaceIndex = process.argv.indexOf('--workspace');
  const options = workspaceIndex >= 0 ? { workspace: path.resolve(process.argv[workspaceIndex + 1]) } : {};
  const { app, close } = await createApp(options);
  const server = app.listen(4318, '127.0.0.1', () => process.stdout.write('Outrise product console API: http://127.0.0.1:4318\n'));
  const shutdown = () => server.close(async () => { await close(); process.exit(0); });
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
