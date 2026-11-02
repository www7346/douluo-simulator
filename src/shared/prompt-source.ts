export interface PromptSource {preset:string;entry:string;adaptation?:string}
export function validatePromptSource(source:PromptSource|undefined):void{
 if(source===undefined)return;
 if(!source||typeof source!=='object'||typeof source.preset!=='string'||!source.preset.trim()||source.preset.length>160||typeof source.entry!=='string'||!source.entry.trim()||source.entry.length>160||(source.adaptation!==undefined&&(typeof source.adaptation!=='string'||source.adaptation.length>500)))throw Error('提示词来源信息无效');
}
