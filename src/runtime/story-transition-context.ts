/** Lossless prompt projection only. Frozen turn snapshots and receipts remain complete. */
export function storyTransitionContext(before:Record<string,any>|undefined,after:Record<string,any>|undefined){
 if(!before||!after)throw Error('正文缺少完整的行动前后事实');
 const retained:[string,unknown][]=[],beforeUnchangedFromAfter:string[]=[];
 for(const [key,value] of Object.entries(before)){
  const encoded=JSON.stringify(value);
  // Compare complete JSON values, including array order, IDs, nulls and exact text.
  if(Object.hasOwn(after,key)&&encoded===JSON.stringify(after[key])&&encoded.length>JSON.stringify(key).length+2)beforeUnchangedFromAfter.push(key);
  else retained.push([key,structuredClone(value)]);
 }
 return {before:Object.fromEntries(retained),after:structuredClone(after),beforeUnchangedFromAfter};
}

export const STORY_TRANSITION_GUIDANCE='after 是本轮完整的结算后事实。before 保存结算前的旧值；beforeUnchangedFromAfter 列出的字段在行动前后逐字相同，其结算前值直接读取 after 的同名完整字段。将这些字段与 before 合并即可还原完整的结算前事实。没有列入复用清单的缺失字段不能假设相同；空数组、null、零值和删除必须按原资料理解。此引用只是去除重复资料，不意味着没有发生行动；每一步仍以 results 的实际回执为准。';
