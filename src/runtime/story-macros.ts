export interface StoryMacroEnvironment {
 values:Record<string,string>; variables:Map<string,string>;
 globalVariables?:ReadonlyMap<string,string>;
 fail:(code:string,message:string)=>never;
 random?:()=>number; onRandom?:()=>void; literal?:(text:string)=>string;
}
type Token={start:number;end:number;name:string;args:string[];preserve:boolean};
const scoped=(token:Token)=>token.name==='if'||(['setvar','addvar'].includes(token.name)&&token.args.length===1);
const trimScope=(text:string)=>{
 const lines=text.replace(/\r\n/g,'\n').split('\n');
 const indent=lines.find(line=>line.trim())?.match(/^[ \t]*/)?.[0]??'';
 return lines.map(line=>line.startsWith(indent)?line.slice(indent.length):line).join('\n').trim();
};

function macroTokens(text:string,fail:StoryMacroEnvironment['fail'],budget:(size:number)=>void):Token[] {
  const output:Token[]=[];let index=0;
  while(index<text.length){
   if(text.startsWith('}}',index))fail('macro-syntax','模块宏括号没有对应开头');
   if(!text.startsWith('{{',index)){index++;continue;}
   const start=index;index+=2;const bodyStart=index;let level=1;
   while(index<text.length&&level){
    if(text.startsWith('{{',index)){if(++level>64)fail('macro-depth','宏嵌套过深');index+=2;}
    else if(text.startsWith('}}',index)){level--;index+=2;}else index++;
   }
   if(level)fail('macro-syntax','模块宏括号未闭合');
   let body=text.slice(bodyStart,index-2).trim();const preserve=body.startsWith('#');if(preserve)body=body.slice(1).trimStart();
   if(body.startsWith('//')){output.push({start,end:index,name:'//',args:[],preserve});continue;}
   const match=/^([^\s:]+)([\s\S]*)$/.exec(body);if(!match)fail('macro-syntax','宏名称为空');
   const name=match![1].toLowerCase();let rest=match![2].trimStart(),args:string[]=[];
   if(rest){if(rest.startsWith('::'))rest=rest.slice(2);else if(rest.startsWith(':'))rest=rest.slice(1);
    let from=0,nesting=0;
    for(let i=0;i<rest.length;i++){
     if(rest.startsWith('{{',i)){nesting++;i++;}else if(rest.startsWith('}}',i)){nesting--;i++;}
     else if(!nesting&&rest.startsWith('::',i)){args.push(rest.slice(from,i).trim());from=i+2;i++;}
    }
    args.push(rest.slice(from).trim());
   }
   output.push({start,end:index,name,args,preserve});budget(output.length);
  }
  return output;
 }

/** Parse only template syntax. Substituted values are opaque strings, never evaluated again. */
export function expandStoryMacros(source:string,environment:StoryMacroEnvironment):string {
 const {fail,values,variables}=environment;let operations=0;
 const literal=(text:string)=>{const unescaped=text.replace(/\\([{}])/g,'$1');return environment.literal?environment.literal(unescaped):unescaped;};
 const randomIndex=(length:number)=>{
  const value=(environment.random??Math.random)();
  if(!Number.isFinite(value)||value<0||value>=1)fail('macro-random','随机来源必须返回 0 到 1 之间的数（不含 1）');
  environment.onRandom?.();return Math.floor(value*length);
 };
 const budget=(size:number)=>{if(size>1_000_000||++operations>20000)fail('macro-budget','宏展开超过单模块容量或操作上限');};

 const render=(text:string,depth=0):string=>{
  if(depth>64)fail('macro-depth','宏嵌套过深');budget(text.length);
  const list=macroTokens(text,fail,budget);let result='',cursor=0;
  for(let i=0;i<list.length;i++){
   const token=list[i];result+=literal(text.slice(cursor,token.start));cursor=token.end;
   if(token.name==='//')continue;
   if(token.name.startsWith('/')||token.name==='else')fail('macro-block','存在没有对应起始块的结束标签或 else');
   let body:string|undefined,alternative:string|undefined;
   if(scoped(token)){
    const stack=[token.name];let end=-1,split:Token|undefined;
    for(let j=i+1;j<list.length;j++){
     const next=list[j];
     if(scoped(next)){stack.push(next.name);if(stack.length>64)fail('macro-depth','宏嵌套过深');}
     else if(next.name.startsWith('/')){
      if(next.name.slice(1)!==stack.pop())fail('macro-block','宏块结束标签与起始标签不一致');
      if(!stack.length){end=j;break;}
     }else if(next.name==='else'&&stack.length===1){if(token.name!=='if'||split)fail('macro-block','else 只能在同一条件块中出现一次');split=next;}
    }
    if(end<0)fail('macro-block',`宏块 ${token.name} 缺少结束标签`);
    body=text.slice(token.end,split?.start??list[end].start);
    if(split)alternative=text.slice(split.end,list[end].start);
    cursor=list[end].end;i=end;
    if(!token.preserve){body=trimScope(body);if(alternative!==undefined)alternative=trimScope(alternative);}
   }
   let rawArgs=token.args;
   if(token.name==='random'&&rawArgs.length===1){
    // Split source syntax before expansion; delimiters inside nested macros or values are opaque.
    const raw=rawArgs[0],items:string[]=[];let current='',nested=0;
    for(let index=0;index<raw.length;index++){
     if(!nested&&raw.startsWith('\\,',index)){current+=',';index++;}
     else if(raw.startsWith('{{',index)){nested++;current+='{{';index++;}
     else if(raw.startsWith('}}',index)){nested--;current+='}}';index++;}
     else if(raw[index]===','&&!nested){items.push(current.trim());current='';}
     else current+=raw[index];
    }
    items.push(current.trim());rawArgs=items;
   }
   const args=rawArgs.map(arg=>render(arg,depth+1));
   if(token.name==='if'){
    if(args.length!==1)fail('macro-arguments','if 需要一个条件');
    let condition=args[0].trim(),invert=false;if(condition.startsWith('!')){invert=true;condition=condition.slice(1).trim();}
    if(Object.hasOwn(values,condition.toLowerCase()))condition=values[condition.toLowerCase()];
    const truthy=!['','false','0','off','no'].includes(condition.trim().toLowerCase());
    result+=render(truthy!==invert?body!:alternative??'',depth+1);
   }else if(token.name==='getglobalvar'){
    if(args.length!==1||!args[0])fail('variable','全局变量读取需要一个名称');
    if(!environment.globalVariables?.has(args[0]))fail('missing-global-variable',`全局变量“${args[0]}”尚未填写，请在模块设置中提供文本值`);
    result+=environment.globalVariables!.get(args[0])!;
   }else if(['setvar','addvar','getvar','hasvar','deletevar'].includes(token.name)){
    const key=args[0];if(!key)fail('variable','变量名缺失');
    if(['getvar','hasvar','deletevar'].includes(token.name)){
     if(args.length!==1)fail('variable','变量操作参数无法识别');
     if(token.name==='hasvar')result+=String(variables.has(key));
     else if(token.name==='deletevar')variables.delete(key);
     else{if(!variables.has(key))fail('missing-variable',`变量“${key}”尚未赋值，请选择其依赖模块或填写内容`);result+=variables.get(key)!;}
    }else{
     if(body===undefined&&args.length<2)fail('variable','变量赋值内容缺失');
     const value=body===undefined?args.slice(1).join('::'):render(body,depth+1);
     if(token.name==='setvar')variables.set(key,value);
     else{
      // SillyTavern addvar creates missing locals, appends array items, otherwise adds or concatenates.
      // Keep this temporary prompt environment isolated from saved configuration and game data.
      const prior=variables.get(key)??'',number=Number(prior);
      const current=(prior.trim()!==''&&!Number.isNaN(number)?number:prior)||0;
      let array:unknown;try{array=JSON.parse(String(current));}catch{/* ordinary text */}
      let next:string;
      if(Array.isArray(array))next=JSON.stringify([...array,value]);
      else if(Number.isNaN(Number(current))||Number.isNaN(Number(value)))next=String(current||'')+value;
      else{const total=Number(current)+Number(value);if(Number.isNaN(total))continue;next=String(total);}
      budget(next.length);variables.set(key,next);
     }
    }
   }else if(token.name==='random'){
    if(!args.length)fail('macro-arguments','random 至少需要一个候选值');
    result+=args[randomIndex(args.length)];
   }else if(token.name==='roll'){
    if(args.length!==1)fail('macro-arguments','roll 需要一个掷骰表达式');
    const formula=/^\d+$/.test(args[0])?`1d${args[0]}`:args[0];
    const match=/^(\d*)d(\d+)([+-]\d+)?$/i.exec(formula);
    if(!match)fail('macro-arguments','roll 支持 NdM、NdM+N、NdM-N 或面数，复杂表达式尚未支持');
    const count=Number(match![1]||1),sides=Number(match![2]),modifier=Number(match![3]||0);
    if(!Number.isSafeInteger(count)||count<1||count>1000||!Number.isSafeInteger(sides)||sides<1||sides>1_000_000||!Number.isSafeInteger(modifier)||!Number.isSafeInteger(count*sides+Math.abs(modifier)))fail('macro-arguments','roll 骰数需为1到1000、面数为1到1000000，结果需为安全整数');
    let total=modifier;for(let die=0;die<count;die++)total+=randomIndex(sides)+1;
    result+=String(total);
   }else if(token.name==='trim'&&!args.length){
    result=result.replace(/(?:\r?\n)+$/,'');const following=/^(?:\r?\n)+/.exec(text.slice(cursor));if(following)cursor+=following[0].length;
   }else if(token.name==='noop'&&!args.length){/* explicitly empty */}
   else if(['newline','space'].includes(token.name)){
    const count=args.length?Number(args[0]):1;if(args.length>1||!Number.isSafeInteger(count)||count<0||count>10000)fail('macro-arguments','空白宏数量需为 0 到 10000 的整数');result+=(token.name==='newline'?'\n':' ').repeat(count);
   }else if(Object.hasOwn(values,token.name)&&!args.length)result+=values[token.name];
   else fail('unsupported-macro',`尚未支持的宏：${token.name}`);
   budget(result.length);
  }
  result+=literal(text.slice(cursor));budget(result.length);return result;
 };
 return render(source);
}

export interface StoryMacroReferences {
 reads:Array<{name:string;optional:boolean;scope?:'global'}>; writes:string[]; dynamic:boolean; errors:string[]; unsupported:string[];
}
const builtinMacroNames=new Set(['if','else','/if','setvar','/setvar','addvar','/addvar','getvar','hasvar','deletevar','getglobalvar','trim','random','roll','noop','newline','space']);
export const STORY_MACRO_VALUE_NAMES=['user','char','charifnotgroup','lastusermessage','lastcharmessage','lastmessage'] as const;
/** Candidate references only: inspect every branch without executing assignments or player text. */
export function inspectStoryMacroReferences(source:string,valueNames:readonly string[]=STORY_MACRO_VALUE_NAMES):StoryMacroReferences {
 const result:StoryMacroReferences={reads:[],writes:[],dynamic:false,errors:[],unsupported:[]};
 const knownValues=new Set(valueNames.map(name=>name.toLowerCase()));
 let operations=0;
 const fail:StoryMacroEnvironment['fail']=(_code,message)=>{throw Error(message);};
 const budget=(size:number)=>{if(size>1_000_000||++operations>20000)fail('macro-budget','宏检查超过容量或操作上限');};
 const visit=(text:string,depth=0)=>{
  if(depth>64)fail('macro-depth','宏嵌套过深');budget(text.length);
  const blocks:Array<{name:string;elseSeen:boolean}>=[];
  for(const token of macroTokens(text,fail,budget)){
   if(token.name==='//')continue;
   if(!builtinMacroNames.has(token.name)&&!knownValues.has(token.name)&&!result.unsupported.includes(token.name))result.unsupported.push(token.name);
   if(scoped(token))blocks.push({name:token.name,elseSeen:false});
   else if(token.name.startsWith('/')){
    if(token.name.slice(1)!==blocks.pop()?.name)result.errors.push('宏块结束标签与起始标签不一致');
   }else if(token.name==='else'){
    const current=blocks.at(-1);
    if(!current||current.name!=='if'||current.elseSeen)result.errors.push('else 只能在同一条件块中出现一次');
    if(current)current.elseSeen=true;
   }
   if(['getvar','hasvar','addvar','setvar','deletevar','getglobalvar'].includes(token.name)){
    const key=token.args[0];
    if(!key)result.errors.push('变量名缺失');
    else if(key.includes('{{')||key.includes('\\'))result.dynamic=true;
    else{
     if(['setvar','addvar'].includes(token.name)&&!result.writes.includes(key))result.writes.push(key);
     if(['getvar','hasvar','addvar','getglobalvar'].includes(token.name)){
      const optional=['hasvar','addvar'].includes(token.name),scope=token.name==='getglobalvar'?'global':undefined;const prior=result.reads.find(r=>r.name===key&&r.scope===scope);
      if(prior)prior.optional=prior.optional&&optional;else result.reads.push({name:key,optional,...(scope?{scope}: {})});
     }
    }
   }
   for(const arg of token.args)visit(arg,depth+1);
  }
  if(blocks.length)result.errors.push(`宏块 ${blocks.at(-1)!.name} 缺少结束标签`);
 };
 try{visit(source);}catch(error){result.errors.push((error as Error).message);}
 return result;
}
