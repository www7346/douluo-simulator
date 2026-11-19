const invalid=()=>new TypeError('内容不是有效的JSON数据');

function validate(value:unknown,ancestors=new Set<object>()):void {
 if(value===null||typeof value==='string'||typeof value==='boolean')return;
 if(typeof value==='number'){if(!Number.isFinite(value))throw invalid();return;}
 if(typeof value!=='object')throw invalid();
 const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
 if(!array&&prototype!==Object.prototype&&prototype!==null||ancestors.has(value))throw invalid();
 ancestors.add(value);
 try{
  if(array){for(let i=0;i<value.length;i++){if(!Object.hasOwn(value,i))throw invalid();validate(value[i],ancestors);}}
  else for(const key of Object.keys(value)){const child=(value as Record<string,unknown>)[key];if(child!==undefined)validate(child,ancestors);}
 }finally{ancestors.delete(value);}
}

function equal(a:any,b:any):boolean {
 if(a===b)return true;
 if(a===null||b===null||typeof a!==typeof b||typeof a!=='object')return false;
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value:any,index:number)=>equal(value,b[index]));
 const keys=Object.keys(a).filter(key=>a[key]!==undefined),otherKeys=Object.keys(b).filter(key=>b[key]!==undefined);
 return keys.length===otherKeys.length&&keys.every(key=>Object.hasOwn(b,key)&&b[key]!==undefined&&equal(a[key],b[key]));
}

/** JSON content identity, without sorting or serializing whole saves. Optional
 * object fields follow the wire's omission of undefined; arrays stay strict. */
export function jsonEqual(a:unknown,b:unknown):boolean {
 if(a===undefined||b===undefined){if(a!==undefined)validate(a);if(b!==undefined)validate(b);return a===b;}
 validate(a);if(a!==b)validate(b);
 return equal(a,b);
}

/** Stable encoding for short request identities, not signatures or save checksums. */
export function stableJson(value:unknown):string {
 validate(value);
 const encode=(v:any):string=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(encode).join(',')+']':'{'+Object.keys(v).filter(key=>v[key]!==undefined).sort().map(key=>JSON.stringify(key)+':'+encode(v[key])).join(',')+'}';
 return encode(value);
}

/** Read an existing JSON-text contract without changing its persisted format. */
export function jsonMatchesText(value:unknown,text:unknown):boolean {
 if(typeof text!=='string')return false;
 let parsed:unknown;try{parsed=JSON.parse(text);}catch{return false;}
 return jsonEqual(value,parsed);
}
