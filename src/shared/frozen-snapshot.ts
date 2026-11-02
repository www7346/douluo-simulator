// A private field is an object-local mark. It also works on frozen records,
// cannot be copied by reflection and disappears on JSON/structured-clone transfer.
class MarkTarget {
  constructor(target:object){return target;}
}

export function createObjectMark(){
  class Mark extends MarkTarget {
    #present=true;
    static has(value:object){return #present in value;}
  }
  return {has:Mark.has,add(value:object){
    // Verify the brand on the returned object. The optimized renderer must
    // preserve the constructor call even though it returns its argument.
    if(!Mark.has(value)&&!Mark.has(new Mark(value)))throw Error('未能记录本机存档校验结果');
  }};
}

const owned=createObjectMark();
export function isSealedValue(value:unknown):boolean{return !!value&&typeof value==='object'&&owned.has(value);}
export function sealOwned<T>(value:T):T{
  if(!value||typeof value!=='object'||owned.has(value))return value;
  const pending:object[]=[],seen=new WeakSet<object>();
  function visit(node:object){
    if(owned.has(node)||seen.has(node))return;
    Object.freeze(node);seen.add(node);pending.push(node);
    for(const child of Object.values(node))if(child&&typeof child==='object')visit(child);
  }
  visit(value);
  for(const node of pending)owned.add(node);
  return value;
}
// Most game snapshots contain only plain records and arrays. Copy their mutable
// containers once, retaining shared references without serializing long strings.
export function mutableSnapshotCopy<T>(value:T):T {
 if(!isSealedValue(value))return structuredClone(value);
 const copies=new Map<object,any>(),unsupported=Symbol();
 function copy(node:any,depth:number):any {
  if(node===null||typeof node!=='object'){
   if(typeof node==='function'||typeof node==='symbol')throw unsupported;
   return node;
  }
  if(copies.has(node))return copies.get(node);
  const array=Array.isArray(node),proto=Object.getPrototypeOf(node);
  if(depth>128||!array&&proto!==Object.prototype&&proto!==null)throw unsupported;
  const result:any=array?new Array(node.length):{};
  copies.set(node,result);
  for(const key of Object.keys(node)){
   const child=copy(node[key],depth+1);
   if(key==='__proto__')Object.defineProperty(result,key,{value:child,enumerable:true,configurable:true,writable:true});
   else result[key]=child;
  }
  return result;
 }
 try{return copy(value,0);}
 catch(error){if(error!==unsupported)throw error;return structuredClone(value);}
}

export function detachedRead<T>(value:T):T{return isSealedValue(value)?value:sealOwned(structuredClone(value));}
