import type {StoryTurn} from '../runtime/story-turns';
import {storyPersonObservations,storyTurnPeople} from './story-event-context';
export interface WritingChange {subjectId:string;subjectName:string;field:string;before:unknown;after:unknown;delta?:number;statement:string}
const copy=<T>(value:T):T=>structuredClone(value);

export function storyResourceChanges(turn:StoryTurn):WritingChange[]{
 const changes:WritingChange[]=[];
 const add=(p:any,field:string,b:unknown,a:unknown)=>{
  if(b===undefined||a===undefined||JSON.stringify(b)===JSON.stringify(a))return;
  const numeric=typeof b==='number'&&typeof a==='number';changes.push({subjectId:p.id,subjectName:p.name??p.id,field,before:copy(b),after:copy(a),...(numeric?{delta:a-b}:{}),statement:`${p.name??p.id}的${field}：${String(b)} → ${String(a)}`});
 };
 const observations=storyPersonObservations(turn);
 for(const {person:p} of storyTurnPeople(turn)){
  const before=observations.find(o=>o.person.id===p.id&&o.source.snapshot==='before')?.person;if(!before)continue;
  for(const [key,label] of [['gold','金币'],['level','等级'],['lifeStatus','存活状态'],['locationId','所在地点'],['relationshipScore','关系数值']])add(p,label,before[key],p[key]);
  for(const resource of Object.keys(p.resources??{}))for(const part of ['当前','最大','临时','锁定','持续消耗'])add(p,`${resource}.${part}`,before.resources?.[resource]?.[part],p.resources[resource][part]);
  const priorControl=before.actionState?.influence?.controlSources,currentControl=p.actionState?.influence?.controlSources;
  if(Array.isArray(priorControl)&&Array.isArray(currentControl)){
   const ended=priorControl.filter(source=>!currentControl.some(current=>current.statusId===source.statusId));
   if(ended.length){
    const label=(source:any)=>source.kind==='status.mind_control'?'精神控制':source.kind==='status.soul_control'?'灵魂控制':'控制';
    changes.push({subjectId:p.id,subjectName:p.name??p.id,field:'控制命令来源',before:copy(priorControl),after:copy(currentControl),
     statement:`${p.name??p.id}在本轮最后一次实际观察中，原${ended.map(source=>`${label(source)}来源〔${source.statusId}〕`).join('、')}已不再有效。${currentControl.length?`仍有${currentControl.length}项有效控制来源，命令权须按各自来源、命令域和距离判断。`:'当前没有精神或灵魂控制命令来源，不能继续依据已结束来源强制服从命令。'}命令来源结束本身不表示已拆除器具、解除看管或改变已完成认知；这些分别按实际状态读取。`});
   }
  }
 }
 const player=turn.after?.player;
 if(player){
  const b=turn.before?.growth,a=turn.after?.growth;if(b&&a){add(player,'可用属性点',b.availablePoints,a.availablePoints);for(const key of Object.keys(a.baseAttributes??{}))add(player,`基础${key}`,b.baseAttributes?.[key],a.baseAttributes[key]);}
  const quantities=(label:string,before:any[],after:any[],key:string)=>{
   const ids=new Set([...before,...after].map(row=>row[key]));
   for(const id of ids){const b=before.find(row=>row[key]===id),a=after.find(row=>row[key]===id);if(!id||b&&typeof b.quantity!=='number'||a&&typeof a.quantity!=='number')continue;
    const storage=(a??b).storage;
    add(player,`${label}：${(a??b).name??id}（${id}）`,b?.quantity??0,a?.quantity??0);
    if(b&&a&&Object.hasOwn(a,'carried')&&Object.hasOwn(b,'carried'))add(player,`携带状态：${a.name??id}（${id}）`,b.carried,a.carried);
   }
  };
  if(Array.isArray(turn.before?.inventory)&&Array.isArray(turn.after?.inventory))quantities('物品数量',turn.before.inventory,turn.after.inventory,'id');
  for(const compartment of ['permanent','expeditionCargo']){const b=turn.before?.materials?.[compartment],a=turn.after?.materials?.[compartment];if(Array.isArray(b)&&Array.isArray(a))quantities(compartment==='permanent'?'永久材料':'远征暂存材料',b,a,'fingerprint');}
 }
 return changes;
}
