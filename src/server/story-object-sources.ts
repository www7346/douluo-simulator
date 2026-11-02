import type {StoryPlan,StoryTurn} from '../runtime/story-turns';
import type {StoryRecent,StoryRecall} from '../shared/story-recall';
import {StoryPlanValidationError} from '../runtime/story-plan-validation-error';

/** Validate against the same bounded archive supplied to the host, before signing any action. */
export function attestStoryObjectSources(plan:StoryPlan,turn:StoryTurn,history:StoryRecent[],recall:StoryRecall[]){
 if(!Array.isArray(plan?.segments)||!plan.segments.length||plan.segments.length>12)throw Error('主持人需给出1到12个有序片段');
 for(const [index,{action}] of plan.segments.entries()){
  if(action?.kind!=='remember-object')continue;
  // A verbatim quote can identify its unique supplied source even if the model omits the redundant turn pointer.
  if(!action.from&&Array.isArray(action.details)&&action.details.some((d:any)=>d?.basis==='observed')){
   if(typeof action.quote!=='string'||!action.quote.trim())throw Error('观察资料须提供正文原句');
   const quote=action.quote,matches=new Set<number>();
   for(const e of history)if(e.number<turn.number&&e.privatePersonId===turn.privatePersonId&&e.prose.includes(quote))matches.add(e.number);
   for(const e of recall)if(e.source.turn<turn.number&&e.privatePersonId===turn.privatePersonId&&e.passages.some(p=>p.field==='prose'&&p.text.includes(quote)))matches.add(e.source.turn);
   if(matches.size!==1)throw Error('观察资料须逐字引用已提供的唯一历史正文；请填写from:{turn:原回合号,field:"prose"}和该正文原句，不能将玩家当前自述登记为观察事实');
   action.from={turn:[...matches][0],field:'prose'};
  }
  if(!action.from)continue;
  const from=action.from as {turn:number;field:'input'|'prose'},quote=String(action.quote);
  if(from.turn>=turn.number)throw new StoryPlanValidationError('对象引用必须来自已完成的历史回合',{instancePath:`/segments/${index}/action/from`,keyword:'historical-source',submitted:from,reference:{instancePath:'/visibleHistory',value:{currentInput:{from:'omit',basis:'reported'},completedTurns:[...new Set([...history.map(entry=>entry.number),...recall.map(entry=>entry.source.turn)].filter(number=>number<turn.number))]}}});
  const recent=history.find(e=>e.number===from.turn&&e.privatePersonId===turn.privatePersonId);
  const recalled=recall.find(e=>e.source.turn===from.turn&&e.privatePersonId===turn.privatePersonId);
  const passage=recalled?.passages.find(p=>p.field===from.field),original=recent?.[from.field]??passage?.text;
  if(original===undefined)throw Error('对象引用不在当前可见的历史原文中');
  const offset=original.indexOf(quote);
  if(offset<0||offset!==original.lastIndexOf(quote))throw Error('对象引文必须与指定历史中的唯一原句一致');
  const start=(recent?0:passage!.start)+offset;
  action.evidence={turn:from.turn,field:from.field,start,end:start+quote.length,quote,
   ...(turn.privatePersonId?{privatePersonId:turn.privatePersonId}:{}),
   ...(!recent&&recalled?{archiveId:recalled.source.id,branchId:recalled.source.branchId,revision:recalled.source.revision}:{})};
 }
 return plan;
}

/** Invalid direct gift references are a proposal error, not proof that a narrated keepsake vanished. */
export function validateStoryGiftReferences(state:any,plan:any){
 const playerId=state.角色?.主控单位ID;
 for(const [index,segment] of plan.segments.entries()){
  const a=segment.action;if(!['promise-item','give-item'].includes(a.kind)||a.itemStep!==undefined)continue;
  const item=state.物品?.实例?.[a.itemId];
  const acquiredEarlier=plan.segments.slice(0,index).some((s:any)=>s.action.kind==='loot-item'&&s.action.actorId===playerId&&s.action.itemId===a.itemId);
  if(!item||item.ownerEntityId!==playerId&&!acquiredEarlier)throw Error(`赠物引用${a.itemId}不是玩家的实际物品编号；这属于提案引用错误，不能认定原文所指物品丢失。有来源但未登记的纪念物须先remember-object/instantiate-item，再用itemStep引用；已有实物须从玩家物品选择。`);
 }
}
