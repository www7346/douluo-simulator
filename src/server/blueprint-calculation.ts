import {readFileSync} from 'node:fs';
import type {LegacyHighs} from 'highs';
import {optimizeBlueprint} from '../rules/blueprint-optimizer';
declare const __DOULUO_BLUEPRINT_WASM__:string;
let loading:Promise<void>|undefined;

export function prepareBlueprintCalculation(){
  return loading??=(async()=>{
    const load=require('highs') as (settings:{instantiateWasm:(imports:WebAssembly.Imports,receive:(instance:WebAssembly.Instance)=>void)=>void})=>Promise<LegacyHighs>;
    const bytes=typeof __DOULUO_BLUEPRINT_WASM__==='string'?Buffer.from(__DOULUO_BLUEPRINT_WASM__,'base64'):
      readFileSync(require.resolve('highs/runtime',{paths:[process.cwd()]}));
    const module=await WebAssembly.compile(new Uint8Array(bytes));
    const solver=await load({instantiateWasm:(imports,receive)=>receive(new WebAssembly.Instance(module,imports))});
    (globalThis as any).SoulBlueprintBatchOptimizer=optimizeBlueprint.bind(null,solver);
  })().catch(error=>{loading=undefined;throw error;});
}
