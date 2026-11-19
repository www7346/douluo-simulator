import {compileContractOrderSettlement} from './story-contract-writing-facts';
import {rules} from '../rules';

const current=(record:any)=>record.versions.at(-1);
const plain=(v:any)=>!!v&&typeof v==='object'&&!Array.isArray(v);
export const CONTRACT_STATUS_LABELS:Record<string,string>={proposed:'等待回应',accepted:'双方已同意',sourceUnavailable:'等待来源恢复',active:'已生效',rejected:'已拒绝',ended:'已结束'};
export function contractPenaltyLabel(p:any){
 if(!p)return '无超自然惩罚';if(p.components?.length)return '组合处罚：'+p.components.map((c:any)=>contractPenaltyLabel({...c,params:p.params?.[c.nodeId]??c.params??c.defaultParams})).join(' ＋ ');const v=p.params;
 if(p.effectId==='payload.damage')return `${v.类型}伤害 ${v.骰数}d${v.骰面}${v.加值?`+${v.加值}`:''}`;
 if(p.effectId==='payload.death')return '死亡';
 if(p.effectId==='status.power_seal')return v.封印对象==='武魂'?'封印全部武魂':'封印魂力';
 if(p.effectId==='payload.soul_damage')return `损失当前魂力 ${v.数值} 点`;
 if(p.effectId==='status.buff')return `${v.属性}降低 ${Math.abs(v.数值)} 点`;
 return '无法说话';
}
export const contractDuration=(n:number|null)=>n===null?'随实际控制来源持续':n%518400===0?`${n/518400} 年`:n%1440===0?`${n/1440} 天`:`${n} 分钟`;
export function contractClauseLabel(c:any,name:(id:string)=>string){
 const a=name(c.obligorId),b=name(c.beneficiaryId);
 if(c.kind==='no-attack')return `${a}不主动攻击${b}`;
 if(c.kind==='obey-domain')return `${a}接受${b}在${c.domain}方面的具体要求`;
 if(c.kind==='master-slave')return `${a}与${b}建立主奴身份，${b}为主人`;
 if(c.kind==='delivery')return `${a}按原赠物约定向${b}交付`;
 if(c.kind==='performance')return `${a}履行与${b}已有的服务约定`;
 return `${b}在指定商店${c.direction==='buy'?'购买':'出售'}指定商品，约定单价 ${c.unitPrice}，最多 ${c.pieces} 件`;
}
/** Current known contract views only. The selected punishment is an agreement until a real event fires. */
export function personContractFacts(state:any,viewerId=state.角色?.主控单位ID){
 const name=(id:string)=>id==='unknown-controller'?'契约另一方身份未明':state.人物?.列表?.[id]?.name??'当事人';
 return rules.personContracts.facts(state,viewerId).map((r:any)=>({...r,events:r.events.map((e:any)=>{const original=e.type==='order-responded'&&(!r.forced||r.controllerKnown)?rules.personContracts.table(state).events.find((v:any)=>v.id===e.id):null;return original?.settlement?{...e,execution:compileContractOrderSettlement(original.settlement)}:e;}),statusLabel:CONTRACT_STATUS_LABELS[r.status]??r.status,clauseLabels:r.terms.clauses.map((c:any)=>contractClauseLabel(c,name)),durationLabel:contractDuration(r.terms.durationMinutes),penaltyLabel:contractPenaltyLabel(r.selectedPenalty),penaltyDuration:r.selectedPenalty?.params.持续分钟?contractDuration(r.selectedPenalty.params.持续分钟):null}));
}
export const knowsCurrentContractVersion=(view:any)=>!!view?.events?.some((e:any)=>e.versionHash===view.versionHash&&['proposed','countered'].includes(e.type));
export function pendingPersonContractResponses(state:any,ids?:ReadonlySet<string>){
 const pc=state.角色?.主控单位ID;
 return rules.personContracts.table(state).records.flatMap((record:any)=>{
  if(record.status!=='proposed'||record.forcedSourceStatusId||ids&&!ids.has(record.id))return [];
  const v=current(record),personId=record.parties.find((id:string)=>record.acceptances[id]!==v.hash);
  if(!personId||personId===pc||!state.人物?.列表?.[personId]||rules.personContracts.responseReason(state,record.id,personId))return [];const known=personContractFacts(state,personId).find((r:any)=>r.id===record.id);if(!knowsCurrentContractVersion(known))return [];
  return [{contractId:record.id,versionHash:v.hash,personId}];
 });
}
export function pendingPersonContractOrders(state:any,ids?:ReadonlySet<string>){
 const pc=state.角色?.主控单位ID;
 return rules.personContracts.table(state).orders.flatMap((o:any)=>{
  if(ids&&!ids.has(o.contractId))return [];const checked=rules.personContracts.orderExecution(state,o.id);
  if(!checked.available||!checked.forced&&o.subjectId===pc)return [];const viewerId=checked.forced?o.issuerId:o.subjectId,known=personContractFacts(state,viewerId).find((r:any)=>r.id===o.contractId);if(!checked.forced&&!knowsCurrentContractVersion(known)||!known?.events.some((e:any)=>e.type==='ordered'&&e.orderId===o.id&&e.versionHash===o.versionHash))return [];
  return [{orderId:o.id,versionHash:o.versionHash,orderRef:checked.orderRef,personId:checked.forced?o.issuerId:o.subjectId,forced:checked.forced}];
 });
}
/** Internal signed response: NPC identity is selected from the original unaccepted version. */
export function respondNpcContract(state:any,input:any,sourceId:string){
 if(!plain(input)||Object.keys(input).some(k=>!['contractId','versionHash','decision'].includes(k)))throw Error('契约回应只接受原契约与完整版本');
 const job=pendingPersonContractResponses(state).find((j:any)=>j.contractId===input.contractId&&j.versionHash===input.versionHash),d=input.decision;
 if(!job)throw Error('没有该人物可回应的当前版本');
 if(!plain(d)||Object.keys(d).some(k=>!['decision','reason','terms','penaltyParams'].includes(k))||!['accept','reject','counter'].includes(d.decision)||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>600)throw Error('人物须明确同意、拒绝或反提，并给出本人理由');
 if(d.decision!=='counter'&&(d.terms!==undefined||d.penaltyParams!==undefined))throw Error('同意或拒绝不能夹带新条款');
 const record=rules.personContracts.get(state,job.contractId),v=current(record),source=d.penaltyParams===undefined?undefined:{...v.source,selection:{nodeId:v.source?.selection.nodeId,params:d.penaltyParams}};if(source)delete source.sourceHash;
 if(d.penaltyParams!==undefined&&(!record.source||!plain(d.penaltyParams)))throw Error('普通契约不能反提超自然处罚');
 return rules.world.settleIntent(state,{id:sourceId,type:'respond-person-contract',actorId:job.personId,contractId:job.contractId,versionHash:job.versionHash,decision:d.decision,reason:d.reason,...(d.decision==='counter'?{terms:d.terms,...(source?{source}:{})}:{})});
}
export function respondNpcContractOrder(state:any,input:any,sourceId:string){
 if(!plain(input)||Object.keys(input).some(k=>!['orderId','versionHash','orderRef','decision'].includes(k)))throw Error('契约履行只接受原订单');
 const job=pendingPersonContractOrders(state).find((j:any)=>j.orderId===input.orderId&&j.versionHash===input.versionHash),d=input.decision;
 if(!job||!rules.personContracts.validateOrderRef(state,input.orderRef))throw Error('原版本订单或实际回合已经变化');
 if(!plain(d)||Object.keys(d).some(k=>!['decision','reason'].includes(k))||!['execute','decline'].includes(d.decision)||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>600||job.forced&&d.decision!=='execute')throw Error('本人订单回应无效');
 const record=rules.personContracts.get(state,rules.personContracts.table(state).orders.find((o:any)=>o.id===job.orderId).contractId),q={actorId:job.personId,orderId:job.orderId,versionHash:job.versionHash,...d};
 const result=d.decision==='execute'?rules.personContracts.executeOrder(state,q,sourceId+':action'):rules.world.settleIntent(state,{id:sourceId+':action',type:'decline-person-contract-order',actorId:job.personId,contractId:record.id,orderId:job.orderId,versionHash:job.versionHash});
 return rules.personContracts.recordOrderResponse(result.state,q,sourceId,result.receipt);
}
