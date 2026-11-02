import {rules} from '../rules';
import {restraintPresentation,restraintEffectLines} from './restraint-presentation';
import {playerText} from './player-text';

const PARTS:Record<string,string>={hands:'双手',legs:'双腿',body:'躯干与四肢',mouth:'口部',neck:'颈部'};
const MODES:Record<string,string>={locked:'锁定',escort:'押送',released:'解放',limited:'受限活动'};

/** Worn equipment belongs to the wearer view, independently of property rights. */
export function wornRestraintsPresentation(state:any,wearerId:string,viewerId=state.角色?.主控单位ID){
 const devices=rules.custody.attached(state,wearerId);
 if(!devices.length)return [];
 const battle=rules.actions.battleOf(state,viewerId);
 const power=rules.controls.powerFacts(state,wearerId),powerSources=new Set(power.sources.map((source:any)=>source.statusId));
 return devices.map((item:any)=>{
  const device=rules.custody.resolveDevice(item),attachment=item.attachment;
  const contract=item.payload?.backgroundRestraint??item.payload?.restraint??{kind:'registered-restraint',templateId:item.templateId,contractHash:rules.abilities.hash(rules.custody.DEVICES[item.templateId])};
  const details=restraintPresentation(contract,item);
  const active=rules.controls.active(state,wearerId).filter((s:any)=>s.来源?.物品ID===item.id&&(s.模板ID!=='status.power_seal'||powerSources.has(s.id)));
  const effects=active.map((s:any)=>{
   const params={...s.快照?.参数,...(s.模板ID==='status.limb_bind'?{层数:s.层数}:{} )};
   let dc:number|null=null;if(s.模板ID==='status.limb_bind')try{dc=rules.combat.breakFreeProfile(state,wearerId,s.id).dc;}catch{}
   return {statusId:s.id,name:rules.effects.EFFECT_REGISTRY[s.模板ID]?.displayName??'限制',effectId:s.模板ID,layers:s.层数,params,dc,
    lines:restraintEffectLines(s.模板ID,params,state),canBreak:viewerId===wearerId&&rules.controls.breakable(state,wearerId).some((v:any)=>v.id===s.id)};
  });
  const hostPower=power.sources.find((source:any)=>source.itemId===item.id);
  if(hostPower){const params={封印对象:'精细',范围:'全部',限制:hostPower.limits};effects.push({statusId:hostPower.statusId,name:'精细封印',effectId:'status.power_seal',layers:1,params,dc:null,lines:restraintEffectLines('status.power_seal',params,state),canBreak:false});}
  let controlReason='',detachReason='';
  try{rules.custody.controlDevice(state,viewerId,item.id,battle?.id??null);}catch(error){controlReason=(error as Error).message;}
  try{rules.custody.detachQuote(state,{actorId:viewerId,itemId:item.id});}catch(error){detachReason=(error as Error).message;}
  const bind=effects.find((e:any)=>e.effectId==='status.limb_bind');
  return {itemId:item.id,name:playerText(item.name,state,'拘束器'),part:bind?.params.部位??PARTS[attachment.part]??'佩戴处',mode:attachment.mode,modeLabel:MODES[attachment.mode],
   durability:item.durability,broken:item.durability<=0,expired:Number(state.世界.时间.day)>Number(item.payload?.expiresAtDay??Number.MAX_SAFE_INTEGER),effects,details,
   canControl:!controlReason,reason:controlReason,canDetach:!detachReason,detachReason,battleId:battle?.id??null,
   modes:Object.keys(device.modes),limits:structuredClone(attachment.mode==='limited'&&rules.host.definition(item).capabilities.suppression?rules.host.suppressionLimits(item):attachment.limits??null),supportsFineLimits:['restraint-seal-collar','restraint-seal-platform','restraint-slime-suit'].includes(item.templateId),supportsDamage:item.templateId==='restraint-seal-platform',
   choices:rules.controls.limitChoices(state,wearerId,{supportsDamage:item.templateId==='restraint-seal-platform'}),autoRelock:!!device.autoRelock,
   timer:structuredClone((rules.custody.table(state).deviceTimers??[]).find((t:any)=>t.itemId===item.id&&t.status==='pending')??null)};
 });
}
