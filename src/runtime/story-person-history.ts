import {releaseFacts} from './story-captivity';
import {rules} from '../rules';
import {visibleNpcGoals,npcCollaborationFacts} from '../shared/npc-autonomy';
import {commitmentView,personCommitments,personRelationship,RELATIONSHIP_LABELS} from './story-commitments';

export const PERSON_HISTORY_CATEGORIES=['negotiations','agreements','shared-events','commitments','statements','addresses','goals','collaborations','requests','custody'] as const;
export type PersonHistoryCategory=typeof PERSON_HISTORY_CATEGORIES[number];

/** Shared relationship events only; looking at a catalogue entry never creates that person. */
export function readStoryRelationship(state:any,input:Record<string,any>){
 if(Object.keys(input).some(key=>!['characterId','before'].includes(key))||typeof input.characterId!=='string'||!input.characterId)throw Error('请选择要查看关系的人物');
 const canonical=rules.arena.CHARACTER_CATALOG[input.characterId],personId=canonical?rules.arena.persistentCharacterId(input.characterId):input.characterId;
 if(!state.角色?.主控单位ID||personId===state.角色.主控单位ID||(!canonical&&!state.人物?.列表?.[personId]))throw Error('没有这位人物的关系记录');
 const records=personCommitments(state,personId).filter((r:any)=>r.kind==='relationship');
 if(!Number.isSafeInteger(input.before)||input.before< -1||input.before>records.length)throw Error('关系记录页码已经失效');
 const end=input.before===-1?records.length:input.before,start=Math.max(0,end-8);
 const statuses:Record<string,string>={pending:'等待回应',accepted:'已接受',rejected:'未接受',completed:'已确认',expired:'已过期',cancelled:'已撤回',ended:'已结束'};
 const score=state.人物?.列表?.[personId]?.relationship?.player;
 const backgroundContext=rules.backgroundOpening.personContext(state,personId);
 const context=backgroundContext?Object.fromEntries(Object.entries(backgroundContext).filter(([key])=>key!=='motive')):null;
 return {personId,party:rules.world.partyMembers(state).find((member:any)=>member.personId===personId)??null,registered:!!state.人物?.列表?.[personId],score:Number.isFinite(score)?score:null,current:personRelationship(state,personId),context,total:records.length,nextBefore:start>0?start:null,
  records:records.slice(start,end).reverse().map((r:any)=>({id:r.id,label:RELATIONSHIP_LABELS[r.relationship as keyof typeof RELATIONSHIP_LABELS],status:statuses[r.status],events:r.events.map((e:any)=>({status:statuses[e.status],sourceId:e.sourceId,time:structuredClone(e.time),reason:e.reason??''}))}))};
}

function recordsFor(state:any,personId:string,category:PersonHistoryCategory):any[]{
 const playerId=state.角色?.主控单位ID,person=state.人物?.列表?.[personId];
 if(!playerId||!person||personId===playerId)throw Error('没有这位人物的交往记录');
 const ext=person.扩展??{};
 if(category==='custody')return [
  ...(rules.backgroundOpening.personContext(state,personId)?.history??[]).filter((r:any)=>['purchase','found'].includes(r.kind)).map((r:any)=>({type:r.kind==='found'?'background-found-history':'background-purchase-history',sourceId:r.sourceId,text:r.text,at:r.at})),
  ...releaseFacts(state,personId),
 ];
 if(category==='requests')return rules.world.npcRequestFacts(state,playerId,personId,true);
 if(category==='collaborations')return npcCollaborationFacts(state,playerId,personId,true);
 if(category==='goals')return visibleNpcGoals(state,personId,true);
 if(category==='addresses')return (ext.交谈意图??[]).filter((r:any)=>r.speakerId===playerId&&r.listenerId===personId);
 if(category==='statements')return (ext.听闻记录??[]).filter((r:any)=>r.speakerId===playerId&&r.listenerId===personId);
 if(category==='negotiations')return (ext.议价历史??[]).filter((r:any)=>r.playerId===playerId&&r.personId===personId);
 if(category==='agreements')return (ext.同行约定??[]).filter((r:any)=>r.playerId===playerId&&r.personId===personId);
 if(category==='commitments')return (ext.社交约定??[]).filter((r:any)=>r.playerId===playerId&&r.personId===personId).map((r:any)=>commitmentView(state,r));
 return (ext.共同见闻??[]).filter((r:any)=>r.playerId===playerId&&r.participants?.includes(personId));
}

/** Player-shared records only; statements retain their unverified contents and named listener. */
export function readStoryPersonHistory(state:any,input:Record<string,any>){
 if(Object.keys(input).some(key=>!['characterId','category','before'].includes(key)))throw Error('人物记录查询含有未支持的字段');
 if(typeof input.characterId!=='string'||!input.characterId)throw Error('请选择有记录的人物');
 if(!PERSON_HISTORY_CATEGORIES.includes(input.category))throw Error('人物记录类型无效');
 const personId=rules.arena.CHARACTER_CATALOG[input.characterId]?rules.arena.persistentCharacterId(input.characterId):input.characterId;
 const category=input.category as PersonHistoryCategory,records=recordsFor(state,personId,category);
 if(!Number.isSafeInteger(input.before)||input.before< -1||input.before>records.length)throw Error('人物记录页码已经失效');
 const end=input.before===-1?records.length:input.before,start=Math.max(0,end-8);
 return structuredClone({type:'person-history',personId,category,total:records.length,
  records:records.slice(start,end).map((record,index)=>({index:start+index,record})).reverse(),
  nextBefore:start>0?start:null,
});
}

export function storyPersonHistorySummary(state:any,personId:string){
 const agreements=recordsFor(state,personId,'agreements');
 return {counts:Object.fromEntries(PERSON_HISTORY_CATEGORIES.map(category=>[category,recordsFor(state,personId,category).length])),addressCount:recordsFor(state,personId,'addresses').length,
  unresolvedAgreements:structuredClone(agreements.filter((r:any)=>['accepted','active'].includes(r.status))),
  unresolvedCommitments:structuredClone(recordsFor(state,personId,'commitments').filter((r:any)=>['pending','accepted'].includes(r.status))),
  query:{kind:'person-history',characterId:personId,category:'agreements',before:-1}};
}
