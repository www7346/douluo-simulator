import {validateStoryCheckReceipt,validateStoryOpposedReceipt} from './story-checks';

const select=(value:any,keys:string[])=>Object.fromEntries(keys.filter(key=>Object.hasOwn(value,key)).map(key=>[key,structuredClone(value[key])]));
const CHECK_FIELDS=['type','sourceId','actorId','attribute','difficulty','reason','die','modifier','bonus','total','passed','summary'];
const OPPOSED_FIELDS=['type','sourceId','actorId','characterId','reason','attribute','die','modifier','bonus','total','defender','passed','summary'];
const FREE_FIELDS=['type','sourceId','source','plan','scope','before','after','check','passed','effects','summary','interruption'];
function assertFields(receipt:any,allowed:string[]){
 const unknown=Object.keys(receipt).filter(key=>!allowed.includes(key));
 if(unknown.length)throw Error(`行动结果缺少字段编译：${receipt.type}/${unknown.join(',')}`);
}
function minute(time:any){return time.day*1440+time.hour*60+time.minute;}

/** Only the selected, committed branch is an outcome; proposed alternatives remain in the save. */
export function compileStoryCheckReceipt(receipt:any):Record<string,any>{
 if(receipt.type==='story-free-action'){
  assertFields(receipt,FREE_FIELDS);
  const actorId=receipt.plan.actorId,elapsed=minute(receipt.after)-minute(receipt.before);
  const interrupted=receipt.interruption!==undefined;
  if(interrupted){
   const stop=receipt.interruption;
   if(stop.kind!=='life-exhausted'||stop.personId!==actorId||stop.at!==minute(receipt.after)||elapsed<0||elapsed>receipt.plan.minutes||receipt.passed!==false||receipt.effects.length!==0)throw Error('自由行动中断与实际耗时或后果不一致');
  }else if(elapsed!==receipt.plan.minutes||receipt.passed!==(receipt.check?.passed??true))throw Error('自由行动事实与实际耗时或检定分支不一致');
  if(receipt.check&&receipt.check.actorId!==actorId)throw Error('自由行动检定与行动人不一致');
  const states:Record<string,string>={discovered:'已发现',confirmed:'已确认',available:'可用',used:'已使用',closed:'已关闭',started:'已开始',advanced:'已推进',resolved:'已解决'};
  const kinds:Record<string,string>={clue:'线索',opportunity:'机会',event:'局部事件'};
  const effects=receipt.effects.map((effect:any)=>{
   assertFields(effect,['id','kind','status','text','captorId']);
   if(!kinds[effect.kind]||!states[effect.status])throw Error('自由行动后果缺少语义编译');
   return {recordId:effect.id,subjectId:actorId,kind:kinds[effect.kind],state:states[effect.status],description:effect.text,...(effect.captorId?{captorId:effect.captorId}:{}),scope:structuredClone(receipt.scope)};
  });
  return {stage:'局部行动已结算',authority:{kind:'local-narrative',scope:'本回执结算耗时、骰点和局部记录。committedEffects仅为现场叙事后果，不是物品、资源、能力、身份、位置、关系、权限或任务变更的回执；这些以对应专用行动和人物现状为准。'},actorId,intent:structuredClone(receipt.plan.intent),objective:receipt.plan.objective,result:interrupted?'中断':receipt.passed?'成功':'失败',...(interrupted?{interruption:structuredClone(receipt.interruption)}:{}),
   time:{before:structuredClone(receipt.before),after:structuredClone(receipt.after),elapsedMinutes:elapsed},
   check:receipt.check?compileStoryCheckReceipt(receipt.check):null,committedEffects:effects,
   source:select(receipt,['sourceId','source'])};
 }
 const opposed=receipt.type==='story-opposed-check';
 if(!opposed&&receipt.type!=='story-attribute-check')throw Error(`缺少检定编译：${receipt.type}`);
 assertFields(receipt,opposed?OPPOSED_FIELDS:CHECK_FIELDS);
 if(opposed)validateStoryOpposedReceipt(receipt);else validateStoryCheckReceipt(receipt);
 return {stage:'检定已结算',actorId:receipt.actorId,objective:receipt.reason,attribute:receipt.attribute,
  outcome:receipt.passed?'通过':'未通过',draw:{die:receipt.die,modifier:receipt.modifier,total:receipt.total},
  ...(opposed?{opponent:select(receipt.defender,['actorId','attribute','die','modifier','total']),tieWinner:'防守方'}:{difficulty:receipt.difficulty}),
  sourceId:receipt.sourceId};
}

export const STORY_CHECK_RECEIPT_FIELDS=Object.freeze({'story-attribute-check':CHECK_FIELDS,'story-opposed-check':OPPOSED_FIELDS,'story-free-action':FREE_FIELDS});
