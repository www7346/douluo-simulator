
import {playerText} from './player-text';

export interface AbilitySource {
  kind:string;
  group:'ring'|'other'|'item'|'basic'|'tactic';
  soulId:string; soulName:string;
  ringId:string; ordinal:number; years:number;
  itemId:string; label:string; issue:string;
  origin?:string; originNote?:string;historicalOnly?:boolean;capacityExempt?:boolean;
}
export const ABILITY_KIND_LABELS:Record<string,string>={ordinary:'普通攻击','martial-base':'武魂本能','martial-skill':'非魂环技能','soul-ring':'魂环技能','soul-bone':'魂骨能力','soul-device':'魂导器','hidden-weapon':'暗器',consumable:'消耗品',copied:'复制技能','summoned-copy':'临时能力',beast:'魂兽天赋','martial-switch':'切换武魂',tactic:'战术'};
ABILITY_KIND_LABELS['native-origin']='本源能力';
ABILITY_KIND_LABELS.domain='领域';
ABILITY_KIND_LABELS.restraint='拘束器';

/** Read-only ownership index. IDs and stored relationships are authoritative, never names or art. */
export function abilitySourceResolver(state:any,unitId:string) {
  const linked=new Map<string,any[]>();
  for(const ring of Object.values(state.魂环?.列表??{}) as any[]) {
    if(state.武魂?.列表?.[ring.武魂ID]?.持有者单位ID!==unitId)continue;
    for(const id of ring.魂技ID列表??[])linked.set(id,[...(linked.get(id)??[]),ring]);
  }
  return (skill:any):AbilitySource=>{
    const relationships=linked.get(skill.id)??[];
    const ringId=skill.sourceRingId||skill.来源魂环ID||relationships[0]?.id||'';
    const ring=state.魂环?.列表?.[ringId];
    const soulId=skill.sourceMartialSoulId||skill.来源武魂ID||ring?.武魂ID||'';
    const soul=state.武魂?.列表?.[soulId];
    const itemId=skill.sourceItemId||'',item=state.物品?.实例?.[itemId];
    const kind=skill.sourceKind||(ringId?'soul-ring':skill.id==='ordinary.attack'?'ordinary':skill.ownerKind==='魂兽'?'beast':'martial-skill');
    let issue='';
    if(relationships.length>1)issue='同一技能被多个魂环引用';
    else if(skill.sourceRingId&&skill.来源魂环ID&&skill.sourceRingId!==skill.来源魂环ID)issue='技能魂环来源不一致';
    else if(skill.sourceMartialSoulId&&skill.来源武魂ID&&skill.sourceMartialSoulId!==skill.来源武魂ID)issue='技能武魂来源不一致';
    else if(ringId&&(!ring||!ring.魂技ID列表?.includes(skill.id)||ring.武魂ID!==soulId||soul?.持有者单位ID!==unitId))issue='技能与所属武魂魂环不一致';
    else if(kind==='soul-ring'&&!ringId)issue='缺少魂环来源';
    else if(ringId&&kind!=='soul-ring')issue='技能分类与魂环归属不一致';
    else if(soulId&&soul?.持有者单位ID!==unitId)issue='武魂不属于当前人物';
    else if(itemId&&!item)issue='物品来源已失效';
    const group=kind==='martial-switch'||kind==='tactic'?'tactic':ringId||kind==='soul-ring'?'ring':['soul-device','hidden-weapon','consumable'].includes(kind)?'item':kind==='ordinary'?'basic':'other';
    const soulName=playerText(soul?.名称,state,'');
    const ordinal=Number(ring?.序号??0),years=Number(ring?.年限??0);
    const label=group==='ring'?(ring?`${soulName} · 第${ordinal}魂环`:'魂环来源待核对'):item?`${ABILITY_KIND_LABELS[kind]??'物品能力'} · ${playerText(item.name,state,'物品')}`:soulName?`${soulName} · ${ABILITY_KIND_LABELS[kind]??'其他技能'}`:ABILITY_KIND_LABELS[kind]??'其他技能';
    const history=state.魂兽档案?.列表?.[ring?.来源魂兽档案ID]?.扩展;
    const origin=ring?.扩展?.sourceOrigin??(history?.backgroundAcquisition?history.sourceOrigin:undefined),originNote=ring?.扩展?.sourceNote??history?.sourceNote;
    return {kind,group,soulId,soulName,ringId,ordinal,years,itemId,label,issue,...(origin?{origin,originNote}: {}),...(history?.backgroundAcquisition?{historicalOnly:true,capacityExempt:history.backgroundAcquisition.kind!=='hunt'}:{})};
  };
}

export function abilityPage<T>(items:T[],page:number,size:number) {
  const count=Math.max(1,Math.ceil(items.length/size)),index=Math.max(0,Math.min(page,count-1));
  return {items:items.slice(index*size,(index+1)*size),index,count,total:items.length};
}

export const MAX_RING_SKILL_DESCRIPTION=2048;
export function playerEditableRingSkill(state:any,id:string){
  const owner=state.角色?.主控单位ID,skill=state.技能?.列表?.[id];
  if(!state.角色?.已建立||!owner||!skill||skill.id!==id||(skill.ownerId??skill.持有者单位ID)!==owner)return null;
  const source=abilitySourceResolver(state,owner)(skill);
  return source.group==='ring'&&!source.issue?skill:null;
}

export function soulYearsLabel(years:number):string {
  return years===1000000?'百万年':years>=10000&&years%10000===0?`${years/10000}万年`:`${years.toLocaleString()}年`;
}

/** Describes committed facts; no preview or recalculation of a past cast. */
export function castReceiptLabel(receipt:any):string {
  const skill=receipt?.skill;
  if(!skill?.sourceRingId||!skill.sourceRingOrdinal)return '';
  const source=`${skill.sourceMartialSoulName||'武魂'} · 第${skill.sourceRingOrdinal}魂环`;
  const rank=skill.castRank===skill.nativeCastRank?`原生${skill.nativeCastRank}环强度施放`:`实际${skill.castRank}环强度施放（原生${skill.nativeCastRank}环强度）`;
  const spent=receipt.resources?.actorSoulPower?.spent??skill.soulPowerCost;
  return `${source} · ${rank}${spent!=null?` · 实耗${spent}魂力`:''}`;
}
