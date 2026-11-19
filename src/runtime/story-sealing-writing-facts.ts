import type {StoryTurn,StoryStepResult} from './story-turns';
import type {StoryEventNames} from './story-event-names';

const FIELDS:Record<string,string[]>={
 'seal-permission':['permissionId'],
 'seal-permission-revoked':[],
 'person-sealed':['targetId','itemId','sealId','lock','sourceEventId','mode'],
 'seal-awakened':['targetId','itemId','sealId','position','mode','sourceEventId'],
 'seal-opened':['targetId','itemId','sealId','position','sourceEventId','previousMode'],
 'seal-device-struck':['itemId','actorId','battleId','position','strength','modifier','defense','die','hit','damageDie','damage','before','after','rescueId','contact','release','insideSealId'],
 'seal-device-seized':['itemId'],
 'seal-control-transferred':['itemId','targetId'],
 'seal-world-wait':['targetId','minutes','stillSealed','mode'],
};
export const SEALING_RECEIPT_TYPES=Object.freeze(Object.keys(FIELDS));
const copy=<T>(v:T):T=>structuredClone(v);

/** Only completed receipts and the frozen permission observation are consumed. */
export function compileSealingReceipt(turn:StoryTurn,result:StoryStepResult):any{
 const c=result.receipt!,allowed=FIELDS[c.type];
 if(!allowed)throw Error(`封存回执缺少编译：${c.type}`);
 const unknown=Object.keys(c).filter(k=>!['type','id','transactionType','summary',...allowed].includes(k));
 if(unknown.length)throw Error(`封存回执缺少字段编译：${c.type}/${unknown.join(',')}`);
 const actorId=c.actorId??turn.after?.player?.id??turn.before?.player?.id;
 const facts:any={actorId,...Object.fromEntries(allowed.filter(k=>k!=='release'&&Object.hasOwn(c,k)).map(k=>[k,copy(c[k])]))};
 if(c.type==='seal-permission'||c.type==='seal-permission-revoked'){
  const permissionId=c.permissionId??result.action.permissionId;
  const p=turn.after?.custody?.sealing?.permissions?.find((p:any)=>p.id===permissionId);
  if(!p)throw Error('封存许可缺少已结算的冻结记录');
  facts.permission={id:p.id,targetId:p.targetId,operatorId:p.operatorId,itemId:p.itemId,status:p.status,releaseAfterMinutes:p.releaseAfterMinutes,mode:p.mode??'stasis'};
 }
 if(c.release)facts.release=compileSealingReceipt(turn,{...result,receipt:c.release});
 return facts;
}
export function sealingEventAccount(type:string,f:any,n:StoryEventNames):string{
 const actor=n.person(f.actorId),item=n.item(f.itemId??f.permission?.itemId);
 if(type==='seal-permission')return `${actor}同意由${n.person(f.permission.operatorId)}使用${item}${f.permission.mode==='awake'?'闭罩清醒收容':'静滞封存'}本人一次，约定入台${f.permission.releaseAfterMinutes}分钟后自动开罩。`;
 if(type==='seal-permission-revoked')return `${actor}撤回了尚未使用的封存许可。`;
 if(type==='person-sealed')return `${actor}将${n.person(f.targetId)}收进${item}并合上封罩，占用台内人物${f.lock}魂力；${f.mode==='awake'?'对方仍然清醒，个人时间正常推进，可以观察和交流，但尚未离开封罩。':'对方进入静滞，个人时间暂停。'}`;
 if(type==='seal-awakened')return `${actor}唤醒了${item}内的${n.person(f.targetId)}。封罩保持关闭，人物仍在台内，个人时间恢复推进，可以观察和交流；原有魂力占用与拘束保留。`;
 if(type==='seal-opened')return `${n.person(f.targetId)}已从${item}的封罩内移出台外，${f.previousMode==='awake'?'个人时间继续正常推进':'个人时间恢复推进'}；其余拘束按当前状态保留。`;
 if(type==='seal-device-struck')return `${actor}${f.insideSealId?'从封罩内尝试破坏':'定向攻击'}${item}，命中检定${f.die}+${f.modifier}对${f.defense}，${f.hit?`造成${f.damage}点耐久损失`:'未命中'}，耐久${f.before}→${f.after}。${f.release?sealingEventAccount('seal-opened',f.release,n):''}`;
 if(type==='seal-device-seized')return `${actor}已在现场夺取${item}，开关仍按现有器具控制权操作。`;
 if(type==='seal-control-transferred')return `${actor}将${item}的控制权交给${n.person(f.targetId)}。`;
 return `${actor}等待了${f.minutes}分钟，${f.stillSealed?(f.mode==='awake'?'仍被关在封罩内':'仍在静滞封存中'):'已经离开封罩'}；${f.mode==='awake'?'清醒期间个人时间正常推进':'静滞区间内个人时间暂停'}。`;
}
