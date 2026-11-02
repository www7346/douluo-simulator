import {storySourceInput} from '../shared/story-source-input';
import {contactStoryPerson} from './story-communication';
import {storySearchTerms} from '../shared/story-search';
import {rules} from '../rules';
import {validateCommunicationSource} from '../shared/story-communication';
import {remembersStoryTurn} from '../shared/cognition-view';

const same=(a:any,b:any):boolean=>a===b||!!a&&!!b&&typeof a==='object'&&typeof b==='object'&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));
export function recordStoryAddress(state:any,characterId:string,intent:string,source:any){
 const turn=state.扩展.story.active;
 if(typeof intent!=='string'||!intent.trim()||intent.length>2000||!Number.isSafeInteger(source.inputStart)||source.inputStart<0||!Number.isSafeInteger(source.inputEnd)||source.inputEnd>storySourceInput(turn).length||storySourceInput(turn).slice(source.inputStart,source.inputEnd)!==intent)throw Error('交谈意图须逐字保留玩家输入中的相应片段');
 const met=contactStoryPerson(state,characterId);state=met.state;
 const person=state.人物.列表[met.receipt.personId];person.扩展.交谈意图??=[];
 const record={id:`address:${source.branchId}:${source.turn}:${source.step}`,speakerId:state.角色.主控单位ID,listenerId:person.id,intent,
  source:structuredClone(source),...(turn.privatePersonId?{privatePersonId:turn.privatePersonId}:{}),time:structuredClone(state.世界.时间),locationId:state.地图.当前地点ID,...(met.receipt.channel?{channel:met.receipt.channel}:{})};
 const prior=person.扩展.交谈意图.find((r:any)=>r.id===record.id);
 if(prior){if(!same(prior,record))throw Error('该交谈意图已登记，不能改写');}else person.扩展.交谈意图.push(record);
 return {state,receipt:{type:'person-addressed',personId:person.id,address:structuredClone(prior??record),summary:`已向${person.name}表达交谈意图；该片段是动作概述，不是逐字对白，不自动成立约定或改变关系。`}};
}
export function personAddresses(state:any,personId:string,query=''){
 const all=(state.人物?.列表?.[personId]?.扩展?.交谈意图??[]).filter((r:any)=>r.speakerId===state.角色.主控单位ID&&r.listenerId===personId&&remembersStoryTurn(state,personId,r.source.turn));
 const terms=storySearchTerms(query).map(t=>t.term);
 const ranked=all.map((r:any,i:number)=>({r,i,score:terms.filter(t=>r.intent.includes(t)).length})).sort((a:any,b:any)=>b.score-a.score||b.i-a.i).slice(0,8).sort((a:any,b:any)=>a.i-b.i);
 return {total:all.length,selected:structuredClone(ranked.map((v:any)=>v.r)),meaning:'这是玩家向本人的交谈意图，不是逐字对白或已经答应的请求；只能证明这次交往发生。未选中不代表从未交谈，不向其他人物传授内容。'};
}
export function validateStoryAddresses(state:any){
 for(const person of Object.values(state.人物?.列表??{}) as any[]){
  const records=person.扩展?.交谈意图;if(records===undefined)continue;if(!Array.isArray(records))throw Error('交谈意图记录无效');const ids=new Set<string>();
  for(const r of records){const s=r?.source,t=r?.time,story=state.扩展.story;
   if(!r||Object.keys(r).some(k=>!['id','speakerId','listenerId','intent','source','privatePersonId','time','locationId','channel'].includes(k))||r.listenerId!==person.id||r.speakerId!==state.角色.主控单位ID||r.listenerId===r.speakerId||typeof r.intent!=='string'||!r.intent.trim()||r.intent.length>2000||!state.地图.地点[r.locationId]||r.privatePersonId!==undefined&&r.privatePersonId!==r.listenerId)throw Error('交谈意图人物、范围或内容无效');
   if(!s||Object.keys(s).some(k=>!['branchId','turn','step','inputStart','inputEnd'].includes(k))||typeof s.branchId!=='string'||!s.branchId||s.branchId.length>160||!Number.isSafeInteger(s.turn)||s.turn<1||s.turn>=story.nextTurn||!Number.isSafeInteger(s.step)||s.step<0||s.step>11||!Number.isSafeInteger(s.inputStart)||s.inputStart<0||!Number.isSafeInteger(s.inputEnd)||s.inputEnd>8000||s.inputEnd-s.inputStart!==r.intent.length||r.id!==`address:${s.branchId}:${s.turn}:${s.step}`||ids.has(r.id))throw Error('交谈意图来源无效');ids.add(r.id);
   if(!t||Object.keys(t).some(k=>!['day','hour','minute'].includes(k))||!Number.isSafeInteger(t.day)||t.day<1||!Number.isInteger(t.hour)||t.hour<0||t.hour>23||!Number.isInteger(t.minute)||t.minute<0||t.minute>59)throw Error('交谈意图时间无效');
   validateCommunicationSource(state,person.id,r.channel,r.time);
   const turn=story.active;if(turn?.number===s.turn){const result=turn.results[s.step];
    const raw=result?.action?.characterStep===undefined?result?.action?.characterId:turn.results[result.action.characterStep]?.receipt?.personId;
    const expected=rules.arena.CHARACTER_CATALOG[raw]?rules.arena.persistentCharacterId(raw):raw;
    const addressed=result?.action?.kind==='address-person'&&result.receipt?.type==='person-addressed'||result?.action?.kind==='consider-person-goal'&&['npc-goal-requested','npc-goal-existing'].includes(result.receipt?.type);
    if(expected!==person.id||result?.status!=='succeeded'||!addressed||result.action.intent!==r.intent||result.receipt.personId!==person.id||!same(result.receipt.address,r)||storySourceInput(turn).slice(s.inputStart,s.inputEnd)!==r.intent||turn.privatePersonId!==r.privatePersonId)throw Error('交谈意图与当前回合不一致');
   }
  }
 }
 const turn=state.扩展?.story?.active;
 for(const result of turn?.results??[])if(result.receipt?.type==='person-addressed'||result.action?.kind==='consider-person-goal'&&result.action.intent!==undefined&&result.status==='succeeded'){
  const r=result.receipt.address;if(!state.人物?.列表?.[r?.listenerId]?.扩展?.交谈意图?.some((saved:any)=>same(saved,r)))throw Error('交谈意图回执缺少持久记录');
 }
}
