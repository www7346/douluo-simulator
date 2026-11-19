import type {PromptSource} from '../../shared/prompt-source';
export function promptSourceName(preset:string){
 if(preset.includes('梦鲸')||preset.includes('梦境思客'))return '梦境思客';
 if(preset.includes('小猫之神'))return '小猫之神';
 return preset;
}
export default function PromptSourceNote({source}:{source?:PromptSource}){
 return source?<aside className="prompt-source"><p>来自：{promptSourceName(source.preset)}</p></aside>:null;
}
