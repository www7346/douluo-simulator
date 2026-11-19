import {communicationAvailability} from '../shared/story-communication';
import {rules} from '../rules';
import {personVisualIdentity} from '../runtime/visual-identity';
import {wornRestraintsPresentation} from '../runtime/worn-restraints-presentation';
import {REALM_THEMES} from '../shared/realm-environments';
import {assertWorldCommandActor} from '../runtime/world-command-actor';

/** Stable summaries for all residents; expensive action previews only for the selected person. */
export function residentRealmPresentation(state:any,input:{selectedPersonId?:string;scope?:'gallery'|'overview'|'management'}={}){
 const actorId=state.角色.主控单位ID;
 const owned=rules.residentRealms.facts(state,actorId).filter((r:any)=>r.ownerId===actorId&&r.endedAt===undefined);
 if(input.selectedPersonId&&!owned.some((r:any)=>r.slots.some((s:any)=>s.personId===input.selectedPersonId)))throw Error('请选择自己空间内的实际人物');
 const selected=input.selectedPersonId??owned.flatMap((r:any)=>r.slots)[0]?.personId;
 if(!owned.length)return {actorId,realms:[],themes:REALM_THEMES};
 const catalogSlot=(slot:any)=>{
   const p=state.人物.列表[slot.personId];
   return {id:slot.id,index:slot.index,personId:p.id,name:p.name,level:rules.people.levelOf(state,p.id),
     obedience:rules.obedience.value(state,p.id,actorId),ringLink:rules.residentRealms.ringLink(state,p.id),
     person:{id:p.id,name:p.name,gender:p.gender,age:p.age,kind:'resident',archetype:p.扩展?.archetypeId,occupation:p.occupation,扩展:personVisualIdentity(p)},
     equipment:wornRestraintsPresentation(state,p.id).map((item:any)=>({id:item.itemId,name:item.name,part:item.part,modeLabel:item.modeLabel,effects:item.effects.map((e:any)=>({name:e.name,lines:e.lines}))}))};
 };
 if(input.scope==='gallery')return {actorId,realms:owned.map((r:any)=>({id:r.id,soulId:r.soulId,slots:r.slots.map(catalogSlot)}))};
 const full=input.scope!=='overview';
 const quoteIntent=rules.world.intentPreviewer(state);
 const realms=owned.map((r:any)=>{
  let reason='';try{rules.residentRealms.assertManagement(state,r.id,actorId);}catch(error){reason=(error as Error).message;}
  const preview=(type:string,extra:any={})=>{try{const intent={type,realmId:r.id,...extra};assertWorldCommandActor(state,intent);return quoteIntent(intent);}catch(error){return {available:false,reason:(error as Error).message};}};
  const regions=r.space.regions.map((region:any)=>({...region,reshape:reason?{available:false,reason}:preview('reshape-realm',{regionId:region.id,environment:region.environment})}));
  const guests=Object.values(r.space.members).filter((m:any)=>rules.residentRealms.guestRecord(state,r.id,m.unitId)).map((m:any)=>({id:m.unitId,name:state.人物.列表[m.unitId].name,regionId:m.regionId}));
  const invitees=r.profile.permanent?Object.values(state.人物.列表).filter((p:any)=>!rules.residentRealms.guestAvailability(state,actorId,p.id,r.id,'common')).map((p:any)=>({id:p.id,name:p.name})):[];
  return {guests,invitees,detailScope:full?'management':'overview',profileId:r.profileId,ownerId:actorId,permanent:r.profile.permanent,expiresAt:r.expiresAt??null,treatments:r.profile.permanent?structuredClone(rules.residentRealms.TREATMENTS):{},dailyPositiveLimit:rules.obedience.POLICY.dailyPositiveLimit,id:r.id,soulId:r.soulId,name:r.name,unlocked:r.unlocked,maximum:r.profile.maxSlots,canManage:!reason,reason,regions,
   slots:r.slots.map((slot:any)=>{
    const p=state.人物.列表[slot.personId],unit=state.战斗单位.列表[slot.personId],member=r.space.members[slot.personId];
    const arrangement=rules.realmArrangements.facts(state,p.id);
    const details=slot.personId===selected;
    const action=(type:string,extra:any={})=>preview(type,{targetId:p.id,...extra});
    const options=details?{
     ...(full?{moveOptions:regions.map((region:any)=>({regionId:region.id,name:region.name,...action('arrange-realm-resident',{regionId:region.id})})),
     arrangementOptions:r.profile.permanent?Object.fromEntries(Object.entries(rules.realmArrangements.CHOICES).map(([group,choices]:any)=>[group,choices.map((id:string)=>({id,label:rules.realmArrangements.LABELS[group][id],...rules.realmArrangements.preview(state,{actorId,realmId:r.id,targetId:p.id,[group]:id})}))])):{},
     permissionOptions:rules.interiorSpaces.LIMIT_KEYS.map((key:string)=>({key,label:({movement:'自由移动',gesture:'手部活动',voice:'可以发声',soulPower:'使用魂力',training:'自行训练'} as any)[key],value:member?.limits[key]??false,...action('set-resident-permissions',{permissions:{[key]:!member?.limits[key]}})})),
     treatmentOptions:r.profile.permanent?Object.entries(rules.residentRealms.TREATMENTS).flatMap(([kind,entries]:any)=>Object.entries(entries).map(([method,definition]:any)=>({kind,method,label:definition.name,cost:definition.cost,...action(kind==='reward'?'reward-resident':'punish-resident',{method})}))):[],
     shock:action('punish-resident',{method:'shock'}),tactics:action('discuss-resident-tactics',{text:'根据各自能力自主战斗，保留部分魂力应对变故。',reservePercent:10})}:{}),
     recovery:action('safe-point-recover'),recall:action('recall-resident'),
     deployOptions:['projection','body'].filter(mode=>r.profile.permanent||(mode==='projection'?r.profile.projectionPercent>0:r.profile.allowBody)).map(mode=>({mode,...action('deploy-resident',{mode})})),
    }:{};
    const deployment=rules.combatDeployments.active(state).find((d:any)=>d.prototypeId===slot.personId);
    const projectionPolicy=deployment?.proof?.projectionPolicy??rules.combatDeployments.projectionTerms(state,{realm:rules.residentRealms.get(state,r.id),slot});
    const changes=rules.obedience.table(state).events.filter((e:any)=>e.subjectId===p.id&&e.authorityId===actorId);
    const today=Math.floor((globalThis as any).SoulPersonCore.now(state)/1440);
    const gainedToday=changes.filter((e:any)=>Math.floor(e.at/1440)===today).reduce((n:number,e:any)=>n+Math.max(0,e.delta??0),0);
    const kindness=(p.扩展?.善意往来??[]).filter((e:any)=>e.playerId===actorId).slice(-3);
    const recentCare=r.events.filter((e:any)=>e.targetId===p.id&&e.result?.attitude).at(-1);
    return {...catalogSlot(slot),...options,kindness,gainedToday,lastObedience:changes.at(-1),recentCare:recentCare?{name:recentCare.result.name,...recentCare.result.attitude}:null,arrangement,effectiveRestrictions:Object.keys(rules.controls.restrictions(state,p.id).blocked),shame:{value:rules.personShame.value(state,p.id)},deployment:structuredClone(deployment??null),communication:communicationAvailability(state,p.id),projectionPolicy,projectionPercent:projectionPolicy?.percent??r.profile.projectionPercent,agreements:details?rules.performanceAgreements.facts(state,actorId).filter((a:any)=>a.subjectId===slot.personId).map((a:any)=>({...a,responseReason:rules.performanceAgreements.responseReason(state,a)})):[],attitude:p.relationship?.player??0,realBodyThreshold:r.profile.realBodyThreshold,gender:p.gender,dead:p.status==='dead',regionId:member?.regionId??'',permissions:member?.limits??null,health:unit?.资源.生命,soulPower:unit?.资源.魂力};
   })};
 });
 // Realm management projects its own residents. Outside capture targets remain
 // in the actual scene/person interface, never in an interior room's roster.
 return {actorId,realms,themes:REALM_THEMES};
}
