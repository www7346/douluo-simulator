import {beginInteraction,settleInteraction,interactionErrorOutcome,leaveInteraction,interactionScope} from '../ui-interaction-timing';
import {useUiInteractionTiming} from '../use-ui-interaction-timing';
import type {StoryResponses} from '../../shared/story-responses';
import PartyProposalCard from './PartyProposalCard';
import {useServerQuery} from '../use-game-query';
import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import {useGame} from '../game-context';
import PersonDossier from './PersonDossier';
import {ActionSection,Button,Panel,Modal} from '../components';
import {useStoryDraft} from '../use-story-draft';
import type {StoryDraftScope} from '../story-draft';
import {isPartyTurn,partyMessages,PARTY_CONVERSATION_ID,type PartyRecipient,type PartyMessage} from '../../shared/story-party-chat';
import type {StoryArchiveRecord} from '../../shared/story-archive';
import CharacterPortrait from './CharacterPortrait';
import StoryActionResults from './StoryActionResults';
import QueryStatus from './QueryStatus';
import {useReadingScroll} from '../use-reading-scroll';

export default function PartyChat({onBack,onPerson,entries,onRead,loadOlder,loadingOlder,visible=true,timingRef,timingOwner}:{onBack:()=>void;onPerson:(id:string)=>void;entries:StoryArchiveRecord[];onRead:(id:string)=>void;loadOlder?:()=>void;loadingOlder:boolean;visible?:boolean;timingRef:MutableRefObject<string|null>;timingOwner:string}){
 const {controller,view,state}=useGame(),ledger=state.扩展.story,active=ledger.active,messages=partyMessages(state),pending=!!active&&active.status!=='complete',here=pending&&isPartyTurn(active),busy=view.busy||!!view.modelTask;
 const responseQuery=useServerQuery<StoryResponses>('story.responses',{revision:view.snapshot.revision},{enabled:visible&&here&&active?.status==='resolved'});
 const closeQuery=useServerQuery<any>('story.private-close-preview',{revision:view.snapshot.revision,branchId:ledger.branchId,turn:active?.number},{enabled:visible&&here&&!busy});
 const proposalQuery=useServerQuery('story.party-proposals',{},{enabled:visible}),cards:any[]=proposalQuery.data??[];
 const rosterQuery=useServerQuery<PartyRecipient[]>('story.party-chat',{},{enabled:visible}),roster=rosterQuery.data??[],ready=rosterQuery.data!==undefined&&!rosterQuery.loading&&!rosterQuery.error;
 const [interactionId,setInteractionId]=useState(''),[proposalsOpen,setProposalsOpen]=useState(false);
 const personQuery=useServerQuery<any>('scene.person',{characterId:interactionId},{enabled:!!interactionId});
 const [error,setError]=useState(''),[limit,setLimit]=useState(30),history=useRef<HTMLDivElement>(null);
 const reading=useReadingScroll(history,{scope:`${view.profileId}:${view.sessionId}:${ledger.branchId}`,contentKey:`${limit}:${entries.map(entry=>entry.id).join('|')}:${messages.map(message=>`${message.id}:${message.responses?.revision??'pending'}`).join('|')}:${active?.status}`,enabled:visible});
 useEffect(()=>{const m=messages.at(-1);if(visible&&m)onRead(`${m.id}:${m.responses?.revision??'pending'}`);},[visible,messages.at(-1)?.id,messages.at(-1)?.responses?.revision,onRead]);
 const scope=timingRef.current?interactionScope(timingRef.current):undefined;
 const currentPartyTiming=scope?.personId===PARTY_CONVERSATION_ID||!!scope&&scope.branchId===ledger.branchId&&scope.turn===active?.number&&isPartyTurn(active);
 useUiInteractionTiming(timingRef,visible&&ready&&roster.length>0&&!busy&&!pending,entries,view.sessionId,timingOwner,`party:${visible}:${ready}:${roster.length}`,{enabled:visible&&currentPartyTiming,ownsLifecycle:false});
 const run=async(input?:string,clearSubmitted?:(value:string)=>void)=>{
  const resume=input===undefined,runtime=controller.runtime,session=view.sessionId,branch=ledger.branchId,turn=resume?active?.number:ledger.nextTurn;
  if(timingRef.current)leaveInteraction(timingRef.current);
  const timing=beginInteraction({worldId:runtime.slotId,sessionId:session,revision:view.snapshot.revision,branchId:branch,turn,personId:PARTY_CONVERSATION_ID,kind:'story'},controller.database);timingRef.current=timing;
  setError('');try{if(input===undefined)await controller.retryStoryStep();else await controller.continueStory(input,undefined,undefined,true);}
  catch(e){settleInteraction(timing,interactionErrorOutcome(e));if(controller.runtime===runtime&&controller.getView().sessionId===session)setError((e as Error).message);}
  finally{const story=(runtime.readSnapshot().state as any).扩展.story,same=story.branchId===branch&&story.active?.number===turn;settleInteraction(timing,same&&story.active.status==='complete'?'complete':'waiting-for-input');if(input!==undefined&&same&&story.active.input===input&&isPartyTurn(story.active))clearSubmitted?.(input);}
 };
 const entryFor=(m:PartyMessage)=>entries.find(e=>e.branchId===m.source.branchId&&e.turn.number===m.source.turn&&e.turn.status==='complete');
 const bodyMarker=(entry?:StoryArchiveRecord)=>entry?{'data-story-body':entry.id,'data-story-owner':timingOwner,'data-story-world':view.profileId,'data-story-session':view.sessionId}:{};
 const workflowError=here&&view.storyError?.sessionId===view.sessionId&&view.storyError.turn===active.number?view.storyError.message:'';
 const portrait=(id:string)=>{const person=state.人物.列表[id];return person?<CharacterPortrait state={state} figureUrl={view.figureUrl} person={{...person,kind:state.战斗单位.列表[id]?.扩展?.角色库ID?'character':'resident'}}/>:null;};
 return <Panel title="队伍群聊" className="story-chat story-chat--communications party-chat" actions={<Button variant="secondary" onClick={onBack}>返回会话列表</Button>}>
  <QueryStatus query={rosterQuery} label="正在查看同行成员…"/>
  <header className="party-chat__head"><strong>当前队伍 · {roster.length+1}人 · 投影不占普通名额</strong><span>{state.场景?.时间}</span><ActionSection className="party-chat__roster" title="同行成员"><div className="party-chat__members">{roster.map(p=><button key={p.personId} aria-label={`${p.name}的互动菜单`} onClick={()=>setInteractionId(p.personId)}><span className="conversation-avatar">{portrait(p.personId)}</span><span>{p.name}<small>{p.delivered?(p.channel?.kind==='realm'?'画境联系':p.channel?'魂导通讯':'当面交谈'):p.reason}</small></span></button>)}</div></ActionSection>{ready&&!roster.length&&<p>当前没有同行成员。你可以回到故事中邀请相识的人。</p>}</header>
  <QueryStatus query={proposalQuery} label="正在查看队伍约定…"/>{!!cards.length&&<Button variant="ghost" onClick={()=>setProposalsOpen(true)}>查看分配约定（{cards.length}）</Button>}
  <div ref={history} onScroll={()=>reading.onScroll()} className="party-chat__history" aria-label="队伍群聊记录"><div className="party-chat__messages">
   {loadOlder&&<Button variant="ghost" disabled={loadingOlder} onClick={loadOlder}>查看更早的群聊</Button>}
   {messages.length>limit&&<Button variant="ghost" onClick={()=>setLimit(n=>n+30)}>读取更早的群消息</Button>}
   {!messages.length&&!here&&<p className="muted">队伍里的话会保留在这里。</p>}
   {messages.slice(-limit).map(m=><section key={m.id} data-reading-key={m.id} aria-label={`队伍消息 ${m.source.turn}`}>
    <div className="party-chat__bubble party-chat__bubble--self"><strong>你</strong><p>{m.text}</p><small>{m.audience.filter(a=>a.delivered).length}人收到{m.audience.some(a=>!a.delivered)?' · 有成员未接通':''}</small></div>
    {m.responses&&<div {...bodyMarker(entryFor(m))}>{m.responses.items.map(r=><div key={r.id} className="party-chat__reply"><button className="conversation-avatar" aria-label={`${state.人物.列表[r.speakerId]?.name??'人物'}的互动菜单`} onClick={()=>setInteractionId(r.speakerId)}>{portrait(r.speakerId)}</button><div className="party-chat__bubble"><strong>{state.人物.列表[r.speakerId]?.name??'人物'}</strong><p>{r.text}</p></div></div>)}
    {m.responses&&!m.responses.items.length&&<p className="muted">暂时没有新的回复。</p>}</div>}
    {!m.responses&&!(here&&m.source.turn===active.number)&&entries.find(e=>e.turn.number===m.source.turn)?.turn.prose&&<details><summary>查看这次交谈</summary><p className="story-chat__prose" {...bodyMarker(entryFor(m))}>{entries.find(e=>e.turn.number===m.source.turn)!.turn.prose}</p></details>}
    {(entryFor(m)?.turn.results??(active?.number===m.source.turn?active.results:[]))?.some((r:any)=>!['tell-party','describe','clarify'].includes(r.action.kind))&&<StoryActionResults results={entryFor(m)?.turn.results??active?.results??[]}/> }
    <details><summary>送达情况</summary><ul>{m.audience.map(a=><li key={a.personId}>{a.name} · {a.delivered?'已送达':a.reason}</li>)}</ul></details>
   </section>)}
   {entries.filter(e=>isPartyTurn(e.turn)&&!messages.some(m=>m.source.turn===e.turn.number)).reverse().map(e=><section key={e.id} data-reading-key={e.id}><strong>这条输入未发送到队伍</strong><p>{e.turn.input}</p><p {...bodyMarker(e)}>{e.turn.prose}</p></section>)}
   {here&&<div role="status">{active.status==='resolved'&&<QueryStatus query={responseQuery}/>}<p>{active.status==='planning'?'正在理解这条队伍消息。':'消息已保存，等待队伍回应。'}</p><StoryActionResults results={active.results??[]}/><Button disabled={busy} onClick={()=>void run()}>{responseQuery.data?.canRetryProse?'重试队伍回复':'重试当前步骤'}</Button>{view.modelTask?<Button variant="secondary" onClick={()=>controller.cancelModelTask()}>停止生成</Button>:<Button variant="secondary" disabled={busy||!closeQuery.data?.available} onClick={()=>void controller.closePrivateStory(true).catch(e=>setError(e.message))}>结束本次群聊</Button>}{closeQuery.data?.reason&&<p>{closeQuery.data.reason}</p>}</div>}
  </div></div>
  {(error||workflowError)&&<p role="alert">{error||workflowError}</p>}
  {pending&&!here&&<p role="status">另一段交谈尚未完成，请返回对应会话继续。</p>}
  <PartyChatComposer scope={{profileId:view.profileId,branchId:ledger.branchId,turn:ledger.nextTurn,personId:PARTY_CONVERSATION_ID,historyHeadId:controller.runtime.storyHeadId}} ready={ready} canSend={!busy&&!pending&&ready&&roster.length>0}
    send={run} proposalsOpen={proposalsOpen} onCloseProposals={()=>setProposalsOpen(false)} cards={cards}/>
 <Modal className="modal--person" open={!!interactionId} title={personQuery.data?.name??'人物资料'} onClose={()=>setInteractionId('')}><QueryStatus query={personQuery}/>{personQuery.data&&<PersonDossier key={interactionId} person={personQuery.data} state={state} onReturn={()=>setInteractionId('')} actions={<Button variant="secondary" onClick={()=>setInteractionId('')}>返回群聊</Button>}/>}</Modal>
 </Panel>;
}

function PartyChatComposer({scope,ready,canSend,send,proposalsOpen,onCloseProposals,cards}:{
 scope:StoryDraftScope;ready:boolean;canSend:boolean;send:(input:string,clear:(value:string)=>void)=>Promise<void>;
 proposalsOpen:boolean;onCloseProposals:()=>void;cards:any[];
}){
 const {value:draft,setValue:setDraft,clearSubmitted,storageFailed}=useStoryDraft(scope);
 return <>
  <form onSubmit={e=>{e.preventDefault();if(canSend&&draft.trim())void send(draft,clearSubmitted);}}><label htmlFor="party-chat-input">发送给当前队伍</label><textarea id="party-chat-input" rows={3} maxLength={2000} value={draft} disabled={!ready} placeholder="对大家说些什么…" onChange={e=>setDraft(e.target.value)}/>{draft&&storageFailed&&<small>草稿暂时无法保存，离开前请复制。</small>}<Button type="submit" disabled={!canSend||!draft.trim()}>发送到队伍</Button></form>
 <Modal open={proposalsOpen} title="队伍分配约定" onClose={onCloseProposals}>{proposalsOpen&&cards.map(c=><PartyProposalCard key={c.key} card={c} onDiscuss={text=>{if(!draft)setDraft(text);onCloseProposals();requestAnimationFrame(()=>document.getElementById('party-chat-input')?.focus());}}/>)}</Modal>
 </>;
}
