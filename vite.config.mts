import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {webArtPlugin} from './scripts/web-art-plugin';
import {cloudDeliveryPlugin} from './scripts/cloud-delivery-plugin';

export default defineConfig(({mode,command})=>{
 const desktop=mode==='desktop';
 const android=mode==='android';
 const delivery=mode==='cloud'||mode==='art-review'||desktop||android;
 const art=delivery?webArtPlugin(process.cwd()):null;
 return {
  plugins: [react(),...(art?[art.plugin]:[]),...(mode==='cloud'||desktop||android?[{
    name:'private-rules-boundary',
    generateBundle(_options:unknown,bundle:Record<string,any>){
      const leaked=Object.values(bundle).filter(item=>item.type==='chunk').flatMap(item=>Object.keys(item.modules)).filter(id=>/[/\\]src[/\\](rules|server)[/\\]|[/\\](engine|game-model-orchestrator|model-gateway)\.ts$/.test(id));
      if(leaked.length)throw new Error('前端仍引用私有计算模块，禁止生成发布包：'+[...new Set(leaked)].join('\n'));
    },
  },...(!desktop&&!android?[cloudDeliveryPlugin(process.cwd(),process.env.DOULUO_BUILD_ID??'development')]:[])]:[])],
  ...(art&&command==='build'?{publicDir:false}:{}),
  define:{__CLOUD_BUILD_ID__:JSON.stringify(process.env.DOULUO_BUILD_ID??'development'),...(art?{__WEB_ART_MANIFEST__:JSON.stringify(art.manifest)}:{})},
  server:{proxy:{'/api':{target:process.env.DOULUO_API_TARGET??'http://127.0.0.1:4180'}}},
  preview:{proxy:{'/api':{target:process.env.DOULUO_API_TARGET??'http://127.0.0.1:4180'}}},
  build: {
    target: 'es2022',
    sourcemap: !delivery,
    ...(delivery?{outDir:desktop?'build/desktop/public':android?'build/android/assets/www':mode==='cloud'?'build/cloud/public':'build/art-review'}:{}),
  },
 };
});
