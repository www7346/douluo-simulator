import {join} from 'node:path';
import {createCloudServer} from '../src/server/app';
import {ServerDiagnostics} from '../src/server/server-diagnostics';

async function start() {
  const origin=process.env.DOULUO_DESKTOP_ORIGIN, buildId=process.env.DOULUO_BUILD_ID;
  const workflowSecret=process.env.DOULUO_WORKFLOW_SECRET, directory=process.env.DOULUO_DIAGNOSTIC_DIR;
  if (!process.send || !origin || !buildId || !workflowSecret || !directory) throw Error('缺少桌面启动参数');
  const journal=new ServerDiagnostics(directory,buildId);
  const game=await createCloudServer({buildId, localDesktop:true, workflowSecret, origins:[origin], diagnostics:journal.record,
    workerPath:join(__dirname,'calculation-worker.cjs'), modelWorkerPath:join(__dirname,'model-worker.cjs'),workers:1});
  process.once('disconnect',()=>void game.close().finally(()=>process.exit(0)));
  game.server.listen(0,'127.0.0.1',()=>{
    const address=game.server.address();
    if (address && typeof address==='object') process.send?.({port:address.port});
  });
}
start().catch(()=>process.exit(1));
