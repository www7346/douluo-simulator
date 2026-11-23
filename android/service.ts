import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createCloudServer } from '../src/server/app';
import { ServerDiagnostics } from '../src/server/server-diagnostics';

async function start() {
  const [directory, deviceKey] = process.argv.slice(2);
  if (!directory || !/^[0-9a-f]{64}$/.test(deviceKey ?? '')) throw Error('缺少 Android 启动参数');
  const {id, port} = JSON.parse(await readFile(join(__dirname, 'version.json'), 'utf8'));
  const keyFile = join(directory, 'workflow-key');
  let workflowSecret: string;
  try {
    workflowSecret = await readFile(keyFile, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    workflowSecret = randomBytes(32).toString('hex');
    await writeFile(keyFile, workflowSecret, {flag: 'wx', mode: 0o600});
  }
  const recovery = join(directory, 'model-recovery');
  await mkdir(recovery, {recursive: true});
  process.env.DOULUO_MODEL_RECOVERY_DIR = recovery;
  const journal = new ServerDiagnostics(join(directory, 'diagnostics'), id);
  const {server, close} = await createCloudServer({
    buildId: id, localDesktop: true, workflowSecret, deviceKey,
    origins: [`http://127.0.0.1:${port}`], diagnostics: journal.record,
    workerPath: join(__dirname, 'calculation-worker.cjs'),
    modelWorkerPath: join(__dirname, 'model-worker.cjs'),
    workers: 1, maxSessions: 4,
  });
  server.once('error', () => { void close().catch(() => {}); });
  server.listen(port, '127.0.0.1');
}

void start().catch(() => { process.exitCode = 1; });
