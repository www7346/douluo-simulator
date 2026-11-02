import {jsonrepair} from 'jsonrepair';

/** Unparsed model text is an unadopted candidate, never a rule result. */
export interface UnparsedDesignAdvice {kind:'design-advice-unparsed-json';version:1;raw:string}
export function isUnparsedDesignAdvice(value:unknown):value is UnparsedDesignAdvice {
 const v=value as any;return !!v&&v.kind==='design-advice-unparsed-json'&&v.version===1&&typeof v.raw==='string';
}
/** Keep invalid JSON in the same server-owned workflow, so recovery never calls a
 * different formatting model or loses the original reply before one repair. */
export function parseDesignAdviceWire(source:string):{value:unknown;normalizations?:string[]}{
 try{return {value:JSON.parse(source)};}catch{}
 // Some providers append redundant closing braces after a complete root object.
 // Only remove this exact suffix; never repair strings, keys, values or truncation.
 const raw=source.trim(),stack:string[]=[];let quoted=false,escaped=false,end=-1;
 if(raw[0]==='{')for(let index=0;index<raw.length;index++){
  const char=raw[index];
  if(quoted){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')quoted=false;continue;}
  if(char==='"'){quoted=true;continue;}
  if(char==='{'||char==='[')stack.push(char);
  else if(char==='}'||char===']'){
   const expected=char==='}'?'{':'[';if(stack.pop()!==expected)break;
   if(!stack.length){end=index+1;break;}
  }
 }
 if(end>0&&/^[}\s]+$/.test(raw.slice(end))&&raw.slice(end).includes('}')){
  try{return {value:JSON.parse(raw.slice(0,end)),normalizations:['已移除完整根JSON对象后的冗余右花括号；未修改任何键或值。']};}catch{}
 }
 return {value:{kind:'design-advice-unparsed-json',version:1,raw:source},normalizations:['答复格式尚未完整，已原样保留；未转交格式修复模型。']};
}
/** Tolerant parsing is used only to protect already stated values against a
 * later repair. This projection can reject a replacement, never authorize it. */
export function designAdviceIntentValue(value:unknown):any {
 if(!isUnparsedDesignAdvice(value))return value;
 try{return JSON.parse(jsonrepair(value.raw));}catch{return value;}
}
