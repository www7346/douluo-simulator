/** Only actual operations, never a template or a possible ability outcome. */
export function compileDisguiseOperation(receipt:any){
 const allowed=['type','id','transactionType','summary','actorId','targetId','statusId','method','contact','detected','check','name','requestHash'];
 if(!['dismiss-disguise','inspect-disguise','disclose-identity'].includes(receipt?.type)||Object.keys(receipt).some(k=>!allowed.includes(k)))throw Error('伪装操作缺少结果编译');
 const facts:any={actorId:receipt.actorId,operation:receipt.type,stage:receipt.type==='dismiss-disguise'?'这次伪装已解除，其他来源和实际身体保持现状':receipt.type==='disclose-identity'?'已向实际可交流的人说明身份':receipt.detected?'本次检查已察觉伪装，来源仍然生效，真实姓名未因此获知':'本次检查未发现足以识破伪装的线索'};
 for(const key of ['targetId','statusId','method','contact','detected','check','name'])if(Object.hasOwn(receipt,key))facts[key]=structuredClone(receipt[key]);
 return facts;
}
