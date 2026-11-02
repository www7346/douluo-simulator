const STOP=new Set(['什么','之前','记得','我们','你们','一个','这个','那个','然后','现在','继续','怎么','是否','一下','当时']);
export function storySearchTerms(text:string){
 const found:{term:string;at:number}[]=[];
 for(const m of text.matchAll(/[\p{Script=Han}]+|[a-zA-Z0-9_]+/gu)){
  if(/^[\p{Script=Han}]/u.test(m[0])){
   for(let i=0;i<m[0].length-1;i++){const term=m[0].slice(i,i+2);if(!STOP.has(term))found.push({term,at:m.index!+i});}
  }else if(m[0].length>1)found.push({term:m[0].toLowerCase(),at:m.index!});
 }
 return found;
}
