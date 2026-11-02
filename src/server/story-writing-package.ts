import {createHash} from 'node:crypto';
import {storyBoundBattleView} from '../shared/story-bound-battle';
import type {GameSnapshot} from '../runtime/contracts';
import {compileStoryWritingFacts} from '../runtime/story-writing-facts';
import {compileIntimateFacts} from './intimate-writing-facts';
import {stateFingerprint} from './workflow-ticket';
import type {StoryTurn} from '../runtime/story-turns';
import type {compileStoryBattleNarrative} from '../runtime/story-battle-narrative';
export const STORY_FACT_COMPILER_VERSION='story-facts-85';
/** A writing selection over one frozen battle, never a new game state. */
export interface StoryWritingSectionOrigin {
 sourcePackageId:string;sourceEventIndex:number;battleId:string;
 firstPassage:number;lastPassage:number;firstPhase:number;lastPhase:number;
 firstSequence:number;lastSequence:number;includesOpening:boolean;includesEnding:boolean;
}
function canonical(v:any):string {if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v);}
const hash=(v:any)=>createHash('sha256').update(canonical(v)).digest('hex');
function freeze<T>(v:T):T {if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
/** One generation's immutable source. Review and repair receive this object, never a fresh world query. */
export function createStoryWritingPackage(snapshot:GameSnapshot,worldId:string|null,turn:StoryTurn,archived=false){
 const ledger=(snapshot.state as any).扩展?.story;
 if(!ledger?.active||(!archived&&(ledger.active.number!==turn.number||hash(ledger.active)!==hash(turn))))throw Error('写作事实与当前回合来源不一致');
 if(worldId!==null&&(typeof worldId!=='string'||!worldId.trim()))throw Error('写作事实缺少真实世界标识');
 turn=storyBoundBattleView(turn);
 const battleSources:({step:number}&ReturnType<typeof compileStoryBattleNarrative>['sources'])[]=[];
 const facts=compileStoryWritingFacts(turn,undefined,(step,sources)=>battleSources.push({step,...sources}));
 const intimate=archived?null:compileIntimateFacts(snapshot.state);
 if(intimate)facts.continuity.intimate=intimate;
 const origin={...(archived?{archived:true}:{}),worldId,branchId:ledger.branchId,turn:turn.number,battleId:turn.battleId??null,snapshotRevision:snapshot.revision,rulesetVersion:snapshot.rulesetVersion,stateFingerprint:stateFingerprint(snapshot),compilerVersion:STORY_FACT_COMPILER_VERSION,
  audience:turn.privatePersonId?{kind:'private',personId:turn.privatePersonId}:turn.partyChat||turn.results.some(r=>r.action.kind==='tell-party')?{kind:'party'}:{kind:'public'}};
 const factsHash=hash(facts),sourcesHash=hash(battleSources),id=hash({origin,factsHash,sourcesHash});
 return freeze({id,origin:origin as typeof origin & {writingSection?:StoryWritingSectionOrigin},factsHash,sourcesHash,facts,battleSources});
}
export type StoryWritingPackage=ReturnType<typeof createStoryWritingPackage>;
/** Same frozen world, separate author/cache identity for one actual group speaker. */
export function derivePartySpeakerPackage(source:StoryWritingPackage,speakerId:string,facts:StoryWritingPackage['facts']):StoryWritingPackage{
 if(source.origin.audience.kind!=='party')throw Error('只有群聊可建立本人回复来源');
 const origin={...source.origin,replyPersonId:speakerId},factsHash=hash(facts);
 return freeze({id:hash({origin,factsHash,sourcesHash:source.sourcesHash}),origin,factsHash,sourcesHash:source.sourcesHash,facts:structuredClone(facts),battleSources:source.battleSources});
}
/** Retain the parent identity and all receipts alongside this bounded writing selection. */
export function deriveStoryWritingSection(source:StoryWritingPackage,facts:StoryWritingPackage['facts'],writingSection:StoryWritingSectionOrigin):StoryWritingPackage{
 if(source.origin.writingSection||writingSection.sourcePackageId!==source.id)throw Error('写作阶段须直接来自完整冻结资料');
 const origin={...source.origin,writingSection:structuredClone(writingSection)},factsHash=hash(facts),sourcesHash=source.sourcesHash;
 return freeze({id:hash({origin,factsHash,sourcesHash}),origin,factsHash,sourcesHash,facts:structuredClone(facts),battleSources:source.battleSources});
}
export function assertStoryWritingPackageCurrent(p:StoryWritingPackage,snapshot:GameSnapshot,worldId:string){
 if(p.origin.worldId!==worldId||p.origin.stateFingerprint!==stateFingerprint(snapshot))throw Error('写作来源已变化，原稿没有写入当前进度');
 if(p.factsHash!==hash(p.facts)||p.sourcesHash!==hash(p.battleSources)||p.id!==hash({origin:p.origin,factsHash:p.factsHash,sourcesHash:p.sourcesHash}))throw Error('写作事实包已被修改');
}
/** JSON-pointer paths identify facts inside this package, not arbitrary external messages. */
export function writingFactAt(p:StoryWritingPackage,path:string):unknown{
 if(typeof path!=='string'||!path.startsWith('/')||path.length>1200)throw Error('事实引用须为当前资料中的路径');
 let value:any=p.facts;
 for(const raw of path.slice(1).split('/')){if(/~(?:[^01]|$)/.test(raw))throw Error('事实引用转义无效');const key=raw.replace(/~1/g,'/').replace(/~0/g,'~');if(!value||typeof value!=='object'||!Object.hasOwn(value,key))throw Error('引用的事实不存在');value=value[key];}
 return value;
}
