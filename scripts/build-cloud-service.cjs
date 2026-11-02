const path=require('node:path');
const fs=require('node:fs/promises');
const {build}=require('esbuild');
async function main(){
  const output=path.resolve(__dirname,'../build/cloud/service');
  await fs.mkdir(output,{recursive:true});
  const root=path.resolve(__dirname,'..');
  const wasm=await fs.readFile(require.resolve('highs/runtime'));
  const license=await fs.readFile(path.join(path.dirname(require.resolve('highs/runtime')),'..','LICENSE'),'utf8');
  const result=await build({banner:{js:'/*! HiGHS-WASM\n'+license.replaceAll('*/','* /')+'\n*/'},define:{__DOULUO_BLUEPRINT_WASM__:JSON.stringify(wasm.toString('base64'))},absWorkingDir:root,entryPoints:['src/server/main.ts','src/server/calculation-worker.ts','src/server/model-worker.ts'].map(file=>path.join(root,file)),tsconfig:path.join(root,'tsconfig.app.json'),outdir:output,outExtension:{'.js':'.cjs'},bundle:true,platform:'node',target:'node24',format:'cjs',sourcemap:false,metafile:true,logLevel:'warning'});
  await fs.copyFile(path.join(path.dirname(require.resolve('highs/runtime')),'..','LICENSE'),path.join(output,'HiGHS-LICENSE'));
  await fs.writeFile(path.join(output,'dependency-audit.json'),JSON.stringify(result.metafile,null,2)+'\n');
  process.stdout.write('Private calculation service built. No public frontend has been packaged.\n');
}
module.exports={buildCloudService:main};
if(require.main===module)main().catch(error=>{process.stderr.write(String(error.message)+'\n');process.exitCode=1;});
