import {playerText,materialName,skillName,receiptSummary} from './player-text';
export {playerText,materialName,skillName,receiptSummary} from './player-text';
import {rules} from '../rules';
import {unitPortrait,type PortraitArt} from './visual-identity';

export interface BattleViewFrame {
  battleId: string;
  round: number;
  actorId: string;
  status: string;
  units: Array<{id:string;name:string;sideId:string;point?:{x:number;y:number};kind?:string;portrait?:PortraitArt|null;memberStatus?:string;consciousPersonId?:string;distanceLabel?:string;position:Record<string,any>;hp:number;hpMax:number;shield:number;sp:number;spMax:number;life:string;resources?:Array<{slot:number;name:string;current:number;maximum:number;sourceMartialSoulId?:string}>;statuses:Array<{id:string;effectId?:string;name:string;remaining:number|null;level?:number;usesRemaining?:number;maintained?:boolean}>}>;
  fields?: Array<{id:string;name:string;kind:string;sourceId:string;position:Record<string,any>;memberIds:string[];remaining:number|null;remainingUnit?:string;maintained?:boolean;status:string;radius?:number}>;
}

export interface BattleTurnView {
  before: BattleViewFrame;
  after: BattleViewFrame;
  receipt: Record<string,any>;
}

/** Comparable facts from the recorded batch; never expose its fingerprint or invent an origin. */
export function materialFacts(material:any,state:any,journeys?:Map<string,any>) {
  const evidence=rules.expedition.materialBridgeEvidence(material);
  const attributes:Array<{name:string;strength:number}>=evidence.attributes.map((name:string)=>({name:playerText(name,state,'属性'),strength:Number(material.attributeSpectrum?.[name]??0)}));
  const uses:string[]=evidence.channels.map((name:string)=>playerText(name,state,'工艺特性'));
  const sources=[...new Set<string>((material.provenance??[]).flatMap((source:any)=>{
    if(source.type==='solo-competition-structured-material'&&rules.arena.COMPETITION_VENUES[source.venueId])return [rules.arena.COMPETITION_VENUES[source.venueId].name];
    const beast=state.战斗单位?.列表?.[source.beastUnitId];
    if(beast)return [playerText(beast.名称,state,'魂兽采集')];
    const journey=journeys?journeys.get(source.expeditionId):source.expeditionId&&state.远征?.当前?.id===source.expeditionId?state.远征.当前:(state.远征?.历史??[]).find((entry:any)=>entry.id===source.expeditionId);
    const dungeon=rules.expedition.DUNGEON_PROFILES[journey?.dungeonId];
    return dungeon?[playerText(dungeon.name,state,'秘境探索')]:[];
  }))];
  return {name:materialName(material,state),quality:playerText(material.quality,state,'普通'),quantity:Number(material.quantity??0),value:Number(material.unitValue??0),attributes,uses,sources};
}

export type MaterialSummary=Pick<ReturnType<typeof materialFacts>,'name'|'quality'|'quantity'|'value'|'attributes'>&{searchText:string};
export function materialSummaries(materials:any[],state:any):Record<string,MaterialSummary> {
  const journeys=new Map<string,any>((state.远征?.历史??[]).map((entry:any)=>[entry.id,entry]));
  if(state.远征?.当前)journeys.set(state.远征.当前.id,state.远征.当前);
  return Object.fromEntries(materials.map(material=>{
    const facts=materialFacts(material,state,journeys),{name,quality,quantity,value,attributes}=facts;
    return [material.fingerprint,{name,quality,quantity,value,attributes,searchText:[name,quality,...attributes.map(a=>a.name),...facts.uses,...facts.sources].join(' ')}];
  }));
}

export function captureBattleView(state: any): BattleViewFrame {
  const battle=state?.战斗 ?? {};
  return {
    battleId:String(battle.id ?? ''),round:Number(battle.回合 ?? 0),actorId:String(battle.当前行动单位ID ?? ''),status:String(battle.状态 ?? ''),
    fields:[
      ...Object.values(battle.扩展?.领域实例 ?? {}).map((domain:any) => ({id:domain.id,name:playerText(state.技能?.列表?.[domain.来源?.技能ID]?.name,state,'领域'),kind:'domain',sourceId:String(domain.来源?.单位ID ?? ''),position:structuredClone(rules.combat.domainCenter(state,domain) ?? {}),memberIds:domain.状态 === '生效' ? (battle.参与者ID列表 ?? []).filter((id:string) => rules.combat.domainContains(state,domain,state.战斗单位.列表[id])) : [],remaining:domain.参数?.持续方式==='来源维持'?null:domain.剩余回合 ?? null,maintained:domain.参数?.持续方式==='来源维持',status:domain.状态,radius:Number(domain.参数?.半径区 ?? 0)})),
      ...rules.combat.activeZones(state).map((zone:any) => ({id:zone.id,name:playerText(state.技能?.列表?.[zone.来源?.技能ID]?.name,state,zone.类型 === 'wall' ? '屏障' : '持续区域'),kind:zone.类型,sourceId:String(zone.来源?.单位ID ?? ''),position:{距离区:zone.距离区,站位簇:zone.站位簇,战场坐标:zone.战场坐标},memberIds:(battle.参与者ID列表 ?? []).filter((id:string) => rules.combat.zoneContains(zone,state.战斗单位.列表[id])),remaining:zone.constructId?Math.max(0,(rules.creation.constructs(state).find((r:any)=>r.id===zone.constructId)?.expiresAt??rules.people.now(state))-rules.people.now(state)):zone.剩余回合 ?? null,...(zone.constructId?{remainingUnit:'分钟'}:{}),status:zone.状态 ?? '生效'})),
    ],
    units:(battle.参与者ID列表 ?? []).flatMap((id: string) => {
      const unit=state.战斗单位?.列表?.[id];
      if (!unit) return [];
      const playerId=state.角色?.主控单位ID,player=state.战斗单位?.列表?.[playerId];
      const distanceLabel=player&&id!==playerId?rules.combat.ZONES[Math.min(4,Math.ceil(rules.combat.combatDistance(player,unit)))]:undefined;
      return [{id,name:playerText(unit.名称,state,'魂师'),sideId:String(battle.扩展?.成员?.[id]?.sideId ?? ''),position:structuredClone(unit.位置 ?? {}),...(distanceLabel===undefined?{}:{distanceLabel}),
        point:rules.combat.unitPoint(unit),kind:unit.单位种类 ?? '',portrait:unitPortrait(state,id),memberStatus:battle.扩展?.成员?.[id]?.status ?? '',
        hp:Number(unit.资源?.生命?.当前 ?? 0),hpMax:Number(unit.资源?.生命?.最大 ?? 0),shield:Number(unit.资源?.生命?.临时 ?? 0),
        sp:Number(unit.资源?.魂力?.当前 ?? 0),spMax:Number(unit.资源?.魂力?.最大 ?? 0),life:String(unit.存活状态 ?? ''),
        resources:rules.combat.battleResourceView?.(state,id)??[],
        ...(rules.consciousness.personForCarrier(state,id)?{consciousPersonId:rules.consciousness.personForCarrier(state,id).personId}:{}),
        statuses:rules.combat.activeStatuses(state,id).map((status: any) => ({
          effectId:status.模板ID,
          ...(rules.effects.EFFECT_REGISTRY[status.模板ID]?.hitRule?{usesRemaining:Number(status.扩展?.剩余次数??0),...(status.快照?.参数?.等级?{level:Number(status.快照.参数.等级)}:{})}:{}),
          ...(status.模板ID==='status.limited_followup'?{usesRemaining:Number(status.层数??0)}:{}),
          ...(['来源维持','来源下回合'].includes(status.持续?.模式)||status.模板ID==='transform.martial_avatar'||status.快照?.参数?.领域触发==='范围内'?{maintained:true}:{}),
          id:status.id,name:status.模板ID==='status.buff'&&status.快照?.参数?.属性?[status.快照.参数.属性,(Number(status.快照.参数.数值)>=0?'+':'')+status.快照.参数.数值].join(' '):playerText(status.模板ID==='status.limited_followup'?state.技能?.列表?.[status.来源?.技能ID]?.name:rules.effects.EFFECT_REGISTRY[status.模板ID]?.displayName ?? status.名称,state,'状态'),remaining:status.模板ID==='transform.martial_avatar'?null:status.持续?.剩余回合 ?? null,
          source: [state.战斗单位?.列表?.[status.来源?.单位ID]?.名称,state.技能?.列表?.[status.来源?.技能ID]?.name].filter(Boolean).map(name=>playerText(name,state)).join(' · '),
        })),
      }];
    }),
  };
}
