import {join,dirname} from 'node:path';
import {createCloudServer} from './app';
import {ServerDiagnostics} from './server-diagnostics';
import {defaultModelRecoveryDirectory} from './model-recovery-store';

const journal=new ServerDiagnostics(process.env.DOULUO_DIAGNOSTIC_DIR??join(dirname(defaultModelRecoveryDirectory()),'diagnostics'),process.env.DOULUO_BUILD_ID??'');
process.on('uncaughtExceptionMonitor',error=>journal.record({event:'service.crashed',error}));

void (async()=>{
  if(!process.env.DOULUO_WORKFLOW_SECRET||process.env.DOULUO_WORKFLOW_SECRET.length<64)throw new Error('需要配置生成结果签名密钥');
  const app=await createCloudServer({workerPath:join(__dirname,'calculation-worker.cjs'),
    modelWorkerPath:join(__dirname,'model-worker.cjs'),workflowSecret:process.env.DOULUO_WORKFLOW_SECRET,
    origins:(process.env.DOULUO_ORIGINS??'').split(',').filter(Boolean),buildId:process.env.DOULUO_BUILD_ID??'',
    workers:Number(process.env.DOULUO_WORKERS??1),diagnostics:journal.record});
  app.server.listen(Number(process.env.PORT??4180),'127.0.0.1');
  const stop=()=>void app.close().then(()=>process.exit(0));process.once('SIGTERM',stop);process.once('SIGINT',stop);
})().catch(error=>{journal.record({event:'service.start-failed',error});process.stderr.write('计算服务启动失败，请检查发布配置。\n');process.exitCode=1;});
