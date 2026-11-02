import {saveCodec} from './save-codec';

const OPEN='{"format":"douluo-world-sections","version":1,"sections":[\n';
const REPLAY='],"battleReplay":\n';
export const MAX_SECTIONED_SAVE_BYTES=256*1024*1024;
const MAX_ENTRIES=100_000;
const MAX_HISTORY_NODES=8_000_000;
export function isSectionedSave(text:string){return text.startsWith(OPEN);}

function hash(text:string){
  let result=0x811c9dc5;
  for(let i=0;i<text.length;i++)result=Math.imul(result^text.charCodeAt(i),0x01000193);
  return (result>>>0).toString(16).padStart(8,'0');
}
function boundedBytes(text:string,limit:number){
  if(text.length>limit)throw Error('存档分块超过读取上限');
  let size=0;
  const encoder=new TextEncoder();
  for(let start=0;start<text.length;){
    let end=Math.min(start+65536,text.length);
    if(end<text.length&&text.charCodeAt(end-1)>=0xd800&&text.charCodeAt(end-1)<=0xdbff)end--;
    size+=encoder.encode(text.slice(start,end)).length;
    if(size>limit)throw Error('存档分块超过读取上限');
    start=end;
  }
  return size;
}

export function writeSaveSections(state:unknown,options:{rulesetVersion:string;summary:any;attachments?:unknown[]},history:unknown[],replay:string|null){
  if(history.length>MAX_ENTRIES)throw Error('存档的历史段数超过读取上限');
  let nodes=0,bytes=0;
  const chunks=history.map(entry=>{
    nodes+=saveCodec.inspectJsonShape(entry,saveCodec.MAX_FULL_SAVE_NODES);
    if(nodes>MAX_HISTORY_NODES)throw Error('存档的历史内容超过读取上限');
    const text=JSON.stringify(entry);
    bytes+=boundedBytes(text,saveCodec.MAX_FULL_SAVE_BYTES)+2;
    if(bytes>MAX_SECTIONED_SAVE_BYTES)throw Error('完整存档超过分块存储上限');
    return text;
  });
  const replayText=replay?.trimEnd()??'null';
  const envelope=saveCodec.createFullSave(state,{...options,summary:{...options.summary,transferSections:{history:chunks.map(hash),replay:hash(replayText)}}});
  const core=saveCodec.stringifyEnvelope(envelope).trimEnd();
  bytes+=boundedBytes(core,saveCodec.MAX_FULL_SAVE_BYTES)+boundedBytes(replayText,MAX_SECTIONED_SAVE_BYTES)+OPEN.length+REPLAY.length+8;
  if(bytes>MAX_SECTIONED_SAVE_BYTES)throw Error('完整存档超过分块存储上限');
  return OPEN+[core,...chunks].join(',\n')+'\n'+REPLAY+replayText+'\n}\n';
}

export function readSaveSections(text:string,allowReplay:boolean){
  boundedBytes(text,MAX_SECTIONED_SAVE_BYTES);
  let start=OPEN.length;
  function next(){
    const end=text.indexOf('\n',start);
    if(end<start||end-start>saveCodec.MAX_FULL_SAVE_BYTES)throw Error('存档分块不完整或超过上限');
    const more=text[end-1]===',',line=text.slice(start,more?end-1:end);
    start=end+1;
    boundedBytes(line,saveCodec.MAX_FULL_SAVE_BYTES);
    return {line,more};
  }
  const core=next();
  const envelope=saveCodec.parseEnvelope(core.line,{expectedKinds:[saveCodec.KINDS.save],rulesetVersion:saveCodec.VERSION});
  const manifest=envelope.summary?.transferSections;
  if(!Array.isArray(manifest?.history)||manifest.history.length>MAX_ENTRIES||!manifest.history.every((s:unknown)=>typeof s==='string'&&/^[a-f0-9]{8}$/.test(s))||typeof manifest.replay!=='string'||core.more!==(manifest.history.length>0)||envelope.summary.storyHistory!==undefined||envelope.summary.battleReplay!==undefined)throw Error('存档的分块目录无效');
  const history=[];
  let nodes=0;
  for(let i=0;i<manifest.history.length;i++){
    const {line,more}=next();
    if(hash(line)!==manifest.history[i]||more!==(i+1<manifest.history.length))throw Error('故事历史分块缺失或校验失败');
    const entry=JSON.parse(line);
    nodes+=saveCodec.inspectJsonShape(entry,saveCodec.MAX_FULL_SAVE_NODES);
    if(nodes>MAX_HISTORY_NODES)throw Error('存档的历史内容超过读取上限');
    history.push(entry);
  }
  const trimmed=text.trimEnd();
  if(!trimmed.startsWith(REPLAY,start)||!trimmed.endsWith('\n}'))throw Error('战前记录分块不完整');
  const replay=trimmed.slice(start+REPLAY.length,-2);
  if(hash(replay)!==manifest.replay||!allowReplay&&replay!=='null')throw Error('战前记录分块校验失败');
  return {envelope,history,replay:replay==='null'?null:replay};
}
