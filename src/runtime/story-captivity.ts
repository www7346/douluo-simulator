import {rules} from '../rules';
import {meetStoryPerson} from './story-people';
import {storyBackgroundContext} from './story-personas';

const minute=(t:any)=>t.day*1440+t.hour*60+t.minute;
const records=(s:any)=>{const db=rules.custody.table(s);return [...Object.values(db.byPerson),...db.history] as any[];};
const body=(r:any)=>{const {id,transactionType,...value}=r;return value;};

/** Story and interface share the physical custody rules. */
export function captivityFacts(state:any){
 const current=rules.world.activeCaptivity(state);if(!current)return null;
 const guard=state.人物.列表[current.custodianId];
 return {...current,custodianName:guard?.name??'当前看守',captorName:state.人物.列表[current.captorId]?.name??'原捕获者',captorRole:'原捕获者',custodianRelationship:storyBackgroundContext(state,current.custodianId)?.relationship??null,choices:rules.world.escapeOptions(state,current.personId),attemptMinutes:10,
  text:`目前由${guard?.name??'原看守'}关押。`,meaning:'挣脱成功时解除一层所选束缚。想逃离囚禁，还需能自由移动，并避开看守；其他封印须另行解除。',
  devices:rules.custody.attached(state,current.personId).map((i:any)=>({itemId:i.id,name:i.name,mode:i.attachment.mode}))};
}
export function releaseFacts(state:any,personId?:string){return structuredClone((state.扩展?.storyReleases??[]).filter((r:any)=>!personId||r.captorId===personId));}
export function requestRelease(state:any,input:any,sourceId:string){
 const source=input.source,turn=state.扩展?.story?.active;
 if(!source||sourceId!==`story:${source.branchId}:${source.turn}:${source.step}`||source.branchId!==state.扩展.story.branchId||source.turn!==turn?.number||!turn.input.includes(source.input)||typeof input.text!=='string'||!input.text.trim()||input.text.length>2000||!source.input.includes(input.text))throw Error('放行请求须保留本轮原话及来源');
 const current=rules.world.activeCaptivity(state);if(!current||current.custodianId!==input.characterId)throw Error('只能向当前实际看守请求解除限制');
 rules.actions.resolve(state,{actorId:current.personId,battleId:null,targetIds:[current.custodianId],requirements:['voice'],containmentAction:'communication'});
 state=meetStoryPerson(state,current.custodianId).state;
 if((state.世界.npcDecisions??[]).some((j:any)=>j.kind==='release-response'&&j.captivityId===current.id&&j.branchId===source.branchId&&j.turn===source.turn))throw Error('这一回合已向看守请求放行，请先听取回应');
 (state.世界.npcDecisions??=[]).push({id:sourceId,kind:'release-response',ownerId:current.custodianId,captivityId:current.id,custodyAuthority:rules.custody.authorityRef(current),createdOrder:rules.people.nextEventOrder(state),text:input.text,source:structuredClone(source),branchId:source.branchId,turn:source.turn,createdAt:structuredClone(state.世界.时间),status:'pending'});
 return {state,receipt:{type:'npc-goal-requested',requestId:sourceId,personId:current.custodianId,summary:'已当面提出放行请求，等待对方按自身判断回应；尚未解除限制。'}};
}
export function decideRelease(state:any,job:any,decision:any,sourceId:string,deferred=false){
 if(!decision||typeof decision!=='object'||Array.isArray(decision)||Object.keys(decision).some(k=>!['release','motive'].includes(k))||typeof decision.release!=='boolean'||typeof decision.motive!=='string'||!decision.motive.trim()||decision.motive.length>400)throw Error('看守须独立决定是否放行并说明理由');
 const current=rules.world.activeCaptivity(state);if(job.status!=='pending'||!current||current.id!==job.captivityId||!rules.custody.hasAuthority(state,job.ownerId,job.custodyAuthority))throw Error('原放行请求已失效');
 if(deferred)rules.social.communicate(state,job.ownerId,current.personId);else state=meetStoryPerson(state,job.ownerId).state;
 const decisionOrder=rules.people.nextEventOrder(state);
 if(decision.release)state=rules.world.settleIntent(state,{id:sourceId,type:'release-captive',actorId:job.ownerId,targetId:current.personId}).state;
 const record={id:`release:${job.id}`,requestId:job.id,captivityId:current.id,captorId:job.ownerId,custodyAuthority:structuredClone(job.custodyAuthority),decisionOrder,playerId:state.角色.主控单位ID,requestText:job.text,source:structuredClone(job.source),decisionSourceId:sourceId,release:decision.release,reason:decision.motive.trim(),time:structuredClone(state.世界.时间)};
 (state.扩展.storyReleases??=[]).push(record);const stored=state.世界.npcDecisions.find((j:any)=>j.id===job.id);stored.status='decided';delete stored.invalidatedBy;stored.releaseId=record.id;
 const summary=decision.release?'对方已实际放行并解除本次关押，并拆下其有权限操作的拘束器；伤势与其他来源限制按实际状态保留。':'对方未同意放行，实际关押与拘束保持不变。';
 const turn=state.扩展.story.active,original=turn?.status!=='complete'?turn?.results.find((r:any)=>r.receipt?.requestId===job.id):null;if(original){original.receipt.releaseDecision=structuredClone(record);original.receipt.summary=summary;}
 (state.人物.列表[job.ownerId].扩展.共同见闻??=[]).push({id:record.id,kind:'custody-response',playerId:record.playerId,participants:[record.playerId,job.ownerId],time:structuredClone(record.time),releaseId:record.id,release:record.release,reason:record.reason});
 return {state,receipt:{type:'custody-response',releaseDecision:structuredClone(record),summary}};
}
export function escapeCaptivity(state:any,input:any,sourceId:string){
 if(!input||Object.keys(input).some(k=>k!=='statusId')||typeof input.statusId!=='string')throw Error('脱困须选择当前实际束缚，空标识表示避开看守');
 return rules.world.escapeCaptivity(state,input,sourceId);
}
export function validateCaptivity(state:any){
 if((state.扩展?.storyEscapes??[]).length||(state.扩展?.storyFreeActions??[]).some((r:any)=>(r.effects??[]).some((e:any)=>e.kind==='captivity')))throw Error('当前版本不接受剧情直接生成的俘获或脱困');
 const captures=new Map(records(state).map(r=>[r.id,r])),events=rules.custody.table(state).events;
 const releases=state.扩展?.storyReleases??[];if(!Array.isArray(releases))throw Error('放行记录无效');
 const releaseIds=new Set(),accepted=new Set();let last=-1;
 for(const r of releases){
  const capture=captures.get(r.captivityId),job=(state.世界.npcDecisions??[]).find((j:any)=>j.id===r.requestId),at=minute(r.time);
  if(!capture||!job||job.kind!=='release-response'||job.status!=='decided'||job.releaseId!==r.id||r.id!==`release:${job.id}`||releaseIds.has(r.id)||!rules.custody.sameAuthority(r.custodyAuthority,job.custodyAuthority)||!rules.custody.authorityAt(state,r.custodyAuthority,r.captorId,at,r.decisionOrder)||r.decisionOrder<=job.createdOrder||r.decisionOrder>state.扩展.personEventSequence||r.captorId!==job.ownerId||r.playerId!==capture.personId||r.playerId!==state.角色.主控单位ID||r.requestText!==job.text||JSON.stringify(r.source)!==JSON.stringify(job.source)||typeof r.release!=='boolean'||typeof r.reason!=='string'||!r.reason.trim()||r.reason.length>400||typeof r.decisionSourceId!=='string'||!r.decisionSourceId||!Number.isSafeInteger(at)||at<minute(job.createdAt)||at<capture.since||at<last||at>minute(state.世界.时间)||accepted.has(r.captivityId))throw Error('放行回应缺少请求、人物或时间来源');
  if(r.custodyAuthority.personId!==capture.personId||r.custodyAuthority.custodyId!==capture.id)throw Error('放行回应借用其他关押权限');
  if(r.release){if(!events.some((e:any)=>e.type==='released'&&e.sourceId===r.decisionSourceId&&e.custodyId===r.captivityId&&e.actorId===r.captorId&&e.targetId===r.playerId&&e.at===at))throw Error('同意放行尚未执行实际规则');accepted.add(r.captivityId);}
  releaseIds.add(r.id);last=at;
 }
 for(const job of state.世界?.npcDecisions??[])if(job.kind==='release-response'){
  const capture=captures.get(job.captivityId),source=job.source,at=minute(job.createdAt);
  if(!capture||!rules.custody.authorityAt(state,job.custodyAuthority,job.ownerId,at,job.createdOrder)||job.custodyAuthority.custodyId!==capture.id||job.custodyAuthority.personId!==capture.personId||job.createdOrder>state.扩展.personEventSequence||typeof job.text!=='string'||!job.text.trim()||job.text.length>2000||!source||job.id!==`story:${source.branchId}:${source.turn}:${source.step}`||source.branchId!==job.branchId||source.turn!==job.turn||!Number.isSafeInteger(source.step)||source.step<0||source.step>11||typeof source.input!=='string'||!source.input.includes(job.text)||!Number.isSafeInteger(at)||at<capture.since||at>minute(state.世界.时间)||job.status==='decided'&&!releaseIds.has(job.releaseId)||job.status==='pending'&&releases.some((r:any)=>r.requestId===job.id))throw Error('放行请求来源无效');
 }
 for(const job of state.世界?.npcDecisions??[])if(job.kind==='release-response'){
  const endings=events.filter((e:any)=>e.custodyId===job.captivityId&&e.order>job.createdOrder&&['custody-transferred','released','escaped','custody-death'].includes(e.type)),first=endings[0];
  if(job.status==='invalidated'?!first||job.invalidatedBy!==first.id||job.releaseId!==undefined:job.invalidatedBy!==undefined||job.status==='pending'&&first)throw Error('放行请求终止缺少原关押变化来源');
 }
 for(const result of state.扩展?.story?.active?.results??[])if(result.action.kind==='escape-captivity'){
  const expected=`story:${state.扩展.story.branchId}:${state.扩展.story.active.number}:${result.step}`;
  const stored=events.find((e:any)=>e.type==='escape-attempt'&&(e.sourceId===result.executionSourceId||e.sourceId===expected))?.receipt;
  if(!stored&&!result.receipt&&['failed','skipped'].includes(result.status))continue;
  if(!stored||stored.sourceId!==result.executionSourceId||!result.receipt||result.receipt.type!=='captivity-escape'||JSON.stringify(stored)!==JSON.stringify(body(result.receipt))||result.action.kind!=='escape-captivity'||result.action.statusId!==stored.statusId||result.status!==(['escaped','restraint-broken','restraint-layer-broken','door-broken'].includes(stored.result)?'succeeded':'failed'))throw Error('脱困回执与实际行动记录不一致');
 }
 for(const result of state.扩展?.story?.active?.results??[])if(result.action.kind==='ask-release'&&result.receipt){
  const job=(state.世界.npcDecisions??[]).find((j:any)=>j.id===result.receipt.requestId);
  if(!job||job.text!==result.action.text||job.source.input!==result.source||!(state.扩展.story.active.status==='complete'&&!result.receipt.releaseDecision)&&JSON.stringify(result.receipt.releaseDecision??null)!==JSON.stringify(releases.find((r:any)=>r.requestId===job.id)??null))throw Error('放行请求回执与实际记录不一致');
 }
}
