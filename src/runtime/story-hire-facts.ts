import {rules} from '../rules';
import {communicationAvailability} from '../shared/story-communication';

/** Read the ordinary service/quote rules once per destination in this observation.
 * Historical inquiries and offers belong to the two parties; they grant no service. */
export function createStoryHireFactsReader(state:any,actorId=state.角色?.主控单位ID){
 const rosters=new Map<string,any>();
 const readRoster=(dungeonId:string)=>{
  if(!rosters.has(dungeonId)){
   try{rosters.set(dungeonId,rules.expedition.companionRoster(state,dungeonId,{actorId}));}
   catch(error){rosters.set(dungeonId,{reason:(error as Error).message,roster:[]});}
  }
  return rosters.get(dungeonId);
 };
 return (personId:string,masked=false)=>{
  const person=state.人物?.列表?.[personId],service=masked?null:rules.world.NPC_ARCHETYPES[person?.扩展?.archetypeId]?.escort??null;
  const inquiry=person?.扩展?.雇佣询价?.[actorId]??null,offer=person?.扩展?.雇佣议价?.[actorId]??null;
  const requested=inquiry?.dungeonId??offer?.dungeonId,dungeonId=rules.expedition.DUNGEON_PROFILES[requested]?requested:'';
  const result=(registeredService:boolean,available:boolean,reason:string,roster?:any,entry?:any,request?:{available:boolean;reason:string})=>({
   escortService:service?structuredClone(service):null,lastHireInquiry:structuredClone(inquiry),lastHireOffer:structuredClone(offer),
   hireAvailability:{registeredService,available,reason,canRequestOffer:request?.available??false,requestOfferReason:request?.reason??reason,referenceDungeonId:roster?.dungeonId??(dungeonId||null),referenceDungeonName:roster?.dungeonName??(dungeonId?rules.expedition.DUNGEON_PROFILES[dungeonId].name:null),currentOfferId:entry?.offer?.id??null},
  });
  if(personId===actorId)return result(false,false,'不能雇佣本人');
  if(masked)return result(false,false,'当前无法确认对方是否提供雇佣服务');
  const communication=communicationAvailability(state,personId);
  // Do not inspect a remote person's current health, finances, equipment or location.
  if(communication.mode!=='in-person')return result(!!service||inquiry?.kind==='first-hunt-guide',false,'雇佣须在现场当面办理；这里只展示双方已记录的询价和报价');
  if(!communication.available)return result(!!service,false,communication.reason);
  const canonicalId=state.战斗单位?.列表?.[personId]?.扩展?.角色库ID??person?.扩展?.角色库ID;
  const roster=readRoster(dungeonId),entry=roster.roster.find((row:any)=>row.characterId===personId||row.unitId===personId);
  const freeGuide=canonicalId==='yu-xiaogang-notting'&&roster.freeGuide===true;
  const request=rules.expedition.personalHireAvailability(state,personId,roster.dungeonId,actorId);
  const reason=roster.reason||entry?.reason||(!entry&&!freeGuide?(request.available?'可以询问本人本次同行报价，尚未收到正式报价':request.reason):'');
  return result(!!service||freeGuide,!!(entry||freeGuide)&&!reason,reason,roster,entry,request);
 };
}
