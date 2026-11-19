import StoryWithdrawal from './StoryWithdrawal';
import {beginInteraction,settleInteraction,interactionErrorOutcome,leaveInteraction,interactionScope,routeInteraction} from '../ui-interaction-timing';
import {useUiInteractionTiming} from '../use-ui-interaction-timing';
import CommercialMessages from './CommercialMessages';
import QueryStatus from './QueryStatus';
import {useServerQuery,useSceneQuery} from '../use-game-query';
import PrivateMessages from './PrivateMessages';
import StoryProse from './StoryProse';
import {CustodyTradeResponse} from './CustodyTradePanel';
import {pendingStoryCustodyTrades,pendingStoryCustodyAuctions} from '../../shared/story-custody-market';
import {GiftResponse} from './ControlledGiftPanel';
import StoryActionChoices from './StoryActionChoices';
import {storyActionOptions} from '../../shared/story-action-options';
import PartyChat from './PartyChat';
import ConversationRooms from './ConversationRooms';
import './conversation-rooms.css';
import PersonInteractions from './PersonInteractions';
import {isPartyTurn,partyMessages,PARTY_CONVERSATION_ID} from '../../shared/story-party-chat';
import {conversationEntries,conversationPeople} from '../story-conversations';
import CharacterPortrait from './CharacterPortrait';
import CommunicationWindow from './CommunicationWindow';
import UiIcon from './UiIcon';
import StoryActionResults from './StoryActionResults';
import {pendingStoryBeliefs} from '../../shared/story-person-knowledge';
import {pendingStoryExtraction} from '../../shared/story-extraction';
import {nextStoryBattle,storyBattleTimeline,unboundStoryBattleReports} from '../../shared/story-battles';
import {useEffect,useLayoutEffect,useRef,useState,useId,type RefObject} from 'react';
import {useGame} from '../game-context';
import {Avatar,Button,Panel,Modal} from '../components';
import type {StoryArchiveRecord} from '../../shared/story-archive';
import type {SaveSlotRecord} from '../../runtime/storage';
import './story-chat.css';
import StoryBattleReport,{StoryBattleReports} from './StoryBattleReport';
import StoryOutcomeChanges from './StoryOutcomeChanges';
import StoryChecks from './StoryChecks';
import {useStoryDraft} from '../use-story-draft';
import {sendMessageOnEnter} from '../message-enter';
import {appendStoryDraft} from '../story-draft';
import {scenePlace} from '../scene-place';
import {retainedStoryProse} from '../story-pending-prose';
import PersonRewritePanel from './PersonRewritePanel';
import {useReadingScroll} from '../use-reading-scroll';
import type {StoryResponses} from '../../shared/story-responses';

export default function StoryChat({deferBattleNarration=false,allowInput=true,arrangementRequest,onArrangementConsumed,onCommunicationOpenChange}:{deferBattleNarration?:boolean;allowInput?:boolean;arrangementRequest?:{key:string;text?:string}|null;onArrangementConsumed?:()=>void;onCommunicationOpenChange?:(open:boolean)=>void}={}){
 const {controller,view,state}=useGame(),ledger=state.扩展?.story,active=ledger?.active;
 const responseQuery=useServerQuery<StoryResponses>('story.responses',{revision:view.snapshot.revision},{enabled:active?.status==='resolved'});
 const controlledGifts=responseQuery.data?.controlledGifts??[],commitments=responseQuery.data?.commitments??[],canRetryProse=responseQuery.data?.canRetryProse??false;
 const locationName=scenePlace(state);
 const unboundReports=unboundStoryBattleReports(state);
 const [error,setError]=useState(''),[loading,setLoading]=useState(false);
  const [pendingProse,setPendingProse]=useState('');
 const [closing,setClosing]=useState<{session:number;branch:string;turn:number;name:string}|null>(null);
 const [commercialOpen,setCommercialOpen]=useState(false),[conversationSearch,setConversationSearch]=useState(''),[partyVisited,setPartyVisited]=useState(false);
 const [roomsOpen,setRoomsOpen]=useState(false);
 const roomInbox=useServerQuery<any>('presentation.conversations');
 const [roomsReadOrder,setRoomsReadOrder]=useState(0);
 const [partyOpen,setPartyOpen]=useState(false),[groupRead,setGroupRead]=useState('');
 const [privatePersonId,setPrivatePersonId]=useState(''),[communications,setCommunications]=useState(false),[relationshipOpen,setRelationshipOpen]=useState(false);
 useEffect(()=>{
  if(!communications||!onCommunicationOpenChange)return;
  onCommunicationOpenChange(true);
  return ()=>onCommunicationOpenChange(false);
 },[communications,onCommunicationOpenChange]);
 const commercialVisible=commercialOpen&&communications&&!partyOpen&&!privatePersonId&&!roomsOpen;
 const commercial=useSceneQuery<any>('inventory.messages',{},'commercial-messages',{enabled:commercialVisible});
 const commercialCount=useServerQuery<any>('inventory.message-count',{},{enabled:!commercialVisible});
 const commercialUnread=(commercialVisible?commercial.data:commercialCount.data)?.unread??0;
 const [seenMessages,setSeenMessages]=useState<Set<string>>(()=>new Set());
 const readScope=`douluo:conversation-read:${view.profileId??''}`;
 const receivedRoomMessages=(roomInbox.data?.rooms??[]).flatMap((r:any)=>r.messages).filter((m:any)=>m.speakerId!==state.角色.主控单位ID),roomUnread=receivedRoomMessages.filter((m:any)=>m.order>roomsReadOrder).length;
 useEffect(()=>{try{setRoomsReadOrder(Number(sessionStorage.getItem(readScope+':rooms')??0));}catch{setRoomsReadOrder(0);}},[readScope]);
 useEffect(()=>{if(!roomsOpen||!communications)return;const order=Math.max(0,...receivedRoomMessages.map((m:any)=>m.order));if(order>roomsReadOrder){setRoomsReadOrder(order);try{sessionStorage.setItem(readScope+':rooms',String(order));}catch{}}},[roomsOpen,communications,roomInbox.data,roomsReadOrder]);
 const lastGroup=partyMessages(state).at(-1),groupKey=lastGroup?`${lastGroup.id}:${lastGroup.responses?.revision??'pending'}`:'',groupUnread=!!groupKey&&groupRead!==groupKey;
 useEffect(()=>{try{setGroupRead(sessionStorage.getItem(readScope+':party')??'');}catch{setGroupRead('');}},[readScope]);
 const markGroupRead=(id:string)=>{setGroupRead(id);try{sessionStorage.setItem(readScope+':party',id);}catch{}};
 useEffect(()=>{try{const ids=JSON.parse(sessionStorage.getItem(readScope)??'[]');setSeenMessages(new Set(Array.isArray(ids)?ids.filter((id:any)=>typeof id==='string'):[]));}catch{setSeenMessages(new Set());}},[readScope]);
 const headId=controller.runtime.storyHeadId;
 const draftScope={profileId:view.profileId,branchId:ledger?.branchId??'initial',turn:ledger?.nextTurn??1,historyHeadId:headId};
 const publicDraft=useStoryDraft({...draftScope,personId:''});
 const privateDraft=useStoryDraft({...draftScope,personId:privatePersonId||'$phone'});
 const [entries,setEntries]=useState<StoryArchiveRecord[]>([]),[nextId,setNextId]=useState<string|null>(null),[captured,setCaptured]=useState<Pick<SaveSlotRecord,'profileId'|'storyHeadId'>|null>(null);
 const loadingOlder=useRef(false);
 const requestedStoryView=useRef<{turn:number;head:string|null}|null>(null);
 const presentedBody=useRef<{scope:string;key:string}|null>(null);
 const [showLatest,setShowLatest]=useState(false);
 const publicInputRef=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{if(!arrangementRequest)return;setCommunications(false);setPartyOpen(false);setRoomsOpen(false);setCommercialOpen(false);try{if(arrangementRequest.text)publicDraft.setValue(appendStoryDraft(publicDraft.value,arrangementRequest.text));}catch(e){setError((e as Error).message);}onArrangementConsumed?.();requestAnimationFrame(()=>{publicInputRef.current?.focus();publicInputRef.current?.scrollIntoView({block:'nearest'});});},[arrangementRequest?.key]);
 const archiveScope=useRef(''),archiveEntries=useRef<StoryArchiveRecord[]>([]);
 archiveEntries.current=entries;
 const historyRef=useRef<HTMLDivElement>(null),privateHistoryRef=useRef<HTMLDivElement>(null);
 const timingOwner=useId();
 const submittedPublicTurn=useRef<number|null>(null),interaction=useRef<string|null>(null);
 const nextBattle=nextStoryBattle(state);

 useEffect(()=>{submittedPublicTurn.current=null;},[controller,view.profileId,view.sessionId]);

 useEffect(()=>{
  let current=true;const record=controller.runtime.getSlotHead(),scope=`${view.profileId}:${view.sessionId}:${ledger?.branchId}`;const reset=archiveScope.current!==scope;archiveScope.current=scope;setCaptured(record);if(reset){setEntries([]);setNextId(null);}setLoading(true);
  if(!record){setLoading(false);return;}
  const rewritten=view.events.some(event=>event.type==='story-archived-rewritten'&&event.revision===view.snapshot.revision);
  void (async()=>{
   let page=await controller.database.storyPage(record),loaded=[...page.entries],next=page.nextId;
   if(rewritten&&!reset)while(next&&loaded.length<archiveEntries.current.length){page=await controller.database.storyPage(record,{nextId:next,limit:25});loaded.push(...page.entries);next=page.nextId;}
   if(current){const prior=reset||rewritten?[]:archiveEntries.current,turns=new Set(loaded.map(entry=>`${entry.branchId}:${entry.turn.number}`));setEntries([...loaded,...prior.filter(entry=>!turns.has(`${entry.branchId}:${entry.turn.number}`))]);if(reset||rewritten||prior.length<=loaded.length)setNextId(next);}
  })().catch(e=>{if(current)setError(e.message);}).finally(()=>{if(current)setLoading(false);});
  return()=>{current=false;};
 },[controller,headId,view.profileId,view.sessionId,ledger?.branchId]);
 useEffect(()=>{requestedStoryView.current=null;setShowLatest(false);setError('');setClosing(null);setCommercialOpen(false);setRoomsOpen(false);setPartyOpen(false);setPrivatePersonId('');setCommunications(false);setRelationshipOpen(false);setConversationSearch('');setPartyVisited(false);},[view.profileId,view.sessionId]);
 const people=conversationPeople(state,entries,roomInbox.data?.contacts??[]),visiblePrivateEntries=conversationEntries(entries,privatePersonId);
 useEffect(()=>{if(partyOpen)setPartyVisited(true);},[partyOpen]);
 const backToConversations=()=>{leavePartyTiming();setPrivatePersonId('');setPartyOpen(false);setCommercialOpen(false);setRoomsOpen(false);setRelationshipOpen(false);};
 const unread=people.filter(p=>p.communication.mode!=='in-person'&&p.latest&&!seenMessages.has(p.latest.id));
 useEffect(()=>{
  if(!communications||partyOpen||commercialOpen||!privatePersonId||!visiblePrivateEntries.some(e=>!seenMessages.has(e.id)))return;
  const next=new Set(seenMessages);for(const entry of visiblePrivateEntries)next.add(entry.id);
  setSeenMessages(next);try{sessionStorage.setItem(readScope,JSON.stringify([...next].slice(-500)));}catch{/* Read markers are optional; story and drafts use their own storage. */}
 },[communications,partyOpen,privatePersonId,commercialOpen,entries,seenMessages,readScope]);
 useEffect(()=>{if(submittedPublicTurn.current===active?.number&&isPartyTurn(active)){setCommercialOpen(false);setRoomsOpen(false);setPartyOpen(true);setCommunications(true);submittedPublicTurn.current=null;return;}if(submittedPublicTurn.current===active?.number&&active?.privateRoute&&active.privatePersonId){setCommercialOpen(false);setRoomsOpen(false);setPartyOpen(false);setPrivatePersonId(active.privatePersonId);setCommunications(true);submittedPublicTurn.current=null;}},[active?.number,active?.privatePersonId,active?.privateRoute,active?.partyChat]);
 const requestedConversation=view.storyConversationRequest;
 const conversationActivation=useRef('');if(requestedConversation)conversationActivation.current=requestedConversation.key;
 useEffect(()=>{if(!requestedConversation)return;setCommercialOpen(false);setRoomsOpen(false);setPartyOpen(false);setPrivatePersonId(requestedConversation.personId);setCommunications(true);setRelationshipOpen(false);},[requestedConversation?.key]);
 useEffect(()=>{if(!requestedConversation||partyOpen||privatePersonId!==requestedConversation.personId)return;
  if(requestedConversation.draft){const combined=[privateDraft.value,requestedConversation.draft].filter(Boolean).join('\n');if(combined.length>8000){setError('现有草稿较长，请先整理后再添加快捷互动。');}else privateDraft.setValue(combined);}
  controller.consumeStoryConversation(requestedConversation.key);
 },[requestedConversation?.key,privatePersonId,partyOpen]);
 const leavePartyTiming=()=>{const id=interaction.current,scope=id?interactionScope(id):undefined;if(id&&(scope?.personId===PARTY_CONVERSATION_ID||scope?.branchId===ledger.branchId&&scope?.turn===active?.number&&isPartyTurn(active))){leaveInteraction(id);interaction.current=null;}};
 const openConversation=(id:string)=>{leavePartyTiming();setCommercialOpen(false);setRoomsOpen(false);setPartyOpen(false);setPrivatePersonId(id);setCommunications(true);setRelationshipOpen(false);};
 const returnToStory=()=>{leavePartyTiming();setCommunications(false);};
 const openPending=()=>{if(isPartyTurn(active)){setCommercialOpen(false);setRoomsOpen(false);setPartyOpen(true);setCommunications(true);}else if(active?.privatePersonId)openConversation(active.privatePersonId);else returnToStory();};
 const publicHistoryKey=conversationEntries(entries,'').map(entry=>entry.id).join('|');
 const privateHistoryKey=visiblePrivateEntries.map(entry=>entry.id).join('|');
 const publicActive=active&&!isPartyTurn(active)&&!active.privatePersonId?active:undefined;
 const scrollScope=`${view.profileId}:${view.sessionId}:${ledger?.branchId}`;
 const publicScroll=useReadingScroll(historyRef,{scope:scrollScope,contentKey:`${publicHistoryKey}:${publicActive?.number}:${publicActive?.status}:${unboundReports.map(report=>report.id).join('|')}`,onFollowChange:following=>setShowLatest(!following)});
 const privateScroll=useReadingScroll(privateHistoryRef,{scope:scrollScope,conversation:privatePersonId,contentKey:`${privateHistoryKey}:${active?.number}:${active?.status}`,enabled:communications&&!partyOpen&&!commercialOpen&&!!privatePersonId});
  useEffect(()=>{
   if(publicActive?.status!=='resolved'){setPendingProse('');return;}
   let current=true;const runtime=controller.runtime;
   void runtime.modelEvidence().then(evidence=>{if(current)setPendingProse(retainedStoryProse(evidence,{worldId:runtime.slotId,branchId:ledger.branchId,turn:publicActive.number,revision:view.snapshot.revision}));}).catch(()=>{if(current)setPendingProse('');});
   return()=>{current=false;};
  },[controller,view.profileId,view.sessionId,ledger?.branchId,publicActive?.number,publicActive?.status,view.snapshot.revision,view.modelTask?.phase,view.modelLogs]);
  useEffect(()=>{if(active?.status==='complete')setError('');},[ledger?.branchId,active?.number,active?.status,headId]);
 useLayoutEffect(()=>{
  const history=historyRef.current;if(!history||publicActive?.status!=='complete')return;
  const body=[...history.querySelectorAll<HTMLElement>(`article[data-story-turn="${publicActive.number}"] .story-chat__prose`)].find(node=>node.textContent?.trim());
  if(!body)return;
  const key=body.closest('[data-story-body]')?.getAttribute('data-story-body')??`${publicActive.number}:${headId}`;
  const requested=requestedStoryView.current,published=requested&&requested.turn===publicActive?.number&&publicActive?.status==='complete'&&requested.head!==headId;
  const unseen=presentedBody.current?.scope!==scrollScope||presentedBody.current.key!==key;
  if(published||unseen&&publicScroll.following)publicScroll.reveal(body);
  presentedBody.current={scope:scrollScope,key};if(published)requestedStoryView.current=null;
 },[publicHistoryKey,publicActive?.number,publicActive?.status,headId,scrollScope,publicScroll]);
 const latest=()=>publicScroll.latest();
 const extraction=pendingStoryExtraction(state);
 const pending=active&&active.status!=='complete',busy=view.busy||!!view.modelTask;
 const workflowError=pending&&view.storyError?.sessionId===view.sessionId&&view.storyError.branchId===ledger.branchId&&view.storyError.turn===active.number?view.storyError.message:'';
 const localContinuation=useServerQuery<{available:boolean;reason:string|null}>('story.local-continuation-preview',{revision:view.snapshot.revision,branchId:ledger?.branchId,turn:active?.number},{enabled:!busy&&active?.status==='resolved'&&!active.privatePersonId&&!isPartyTurn(active)});
 const privateClose=useServerQuery<{available:boolean;reason:string|null}>('story.private-close-preview',{revision:view.snapshot.revision,branchId:ledger?.branchId,turn:active?.number},{enabled:!busy&&!!pending&&!!active.privatePersonId});
 const closeControls=()=>active?.privatePersonId&&<div className="field-actions"><Button variant="secondary" disabled={busy||privateClose.loading||!privateClose.data?.available} onClick={()=>setClosing({session:view.sessionId,branch:ledger.branchId,turn:active.number,name:state.人物.列表[active.privatePersonId]?.name??'对方'})}>结束本次会话</Button>{(privateClose.error||privateClose.data?.reason)&&<><p role="status">{privateClose.error||privateClose.data?.reason}</p><Button variant="ghost" disabled={busy||privateClose.loading} onClick={privateClose.retry}>重新查看</Button></>}</div>;
 const closeConversation=async()=>{
  if(!closing)return;
  const current=controller.getView(),story=(current.snapshot.state as any).扩展?.story;
  if(current.sessionId!==closing.session||story?.branchId!==closing.branch||story?.active?.number!==closing.turn){setClosing(null);setError('会话已变化，请重新查看。');return;}
  setError('');try{await controller.closePrivateStory();setClosing(null);returnToStory();}catch(e){setError((e as Error).message);setClosing(null);}
 };
 const timedScope=interaction.current?interactionScope(interaction.current):undefined,timedPerson=timedScope?.personId;
 const partyTiming=timedPerson===PARTY_CONVERSATION_ID||!!timedScope&&timedScope.branchId===ledger.branchId&&timedScope.turn===active?.number&&isPartyTurn(active);
 useUiInteractionTiming(interaction,allowInput&&!ledger?.deferredBattle&&!busy&&!pending&&(!timedPerson||!!people.find(p=>p.id===timedPerson)?.available),entries,view.sessionId,timingOwner,`${communications}:${partyOpen}:${privatePersonId}:${commercialOpen}`,{enabled:!partyTiming});
 const run=async(person='',resume=false)=>{
  const source=person?privateDraft:publicDraft;
  const runtime=controller.runtime,session=view.sessionId,input=source.value,branch=ledger?.branchId,turn=ledger?.nextTurn;
  if(!person)requestedStoryView.current={turn:resume?active!.number:turn,head:headId};
  if(interaction.current)leaveInteraction(interaction.current);
  const timing=beginInteraction({worldId:runtime.slotId,sessionId:session,revision:view.snapshot.revision,branchId:branch,turn:resume?active?.number:turn,personId:person,kind:'story'},controller.database);interaction.current=timing;
  setError('');if(!person)latest();
  try{if(!resume&&!person)submittedPublicTurn.current=turn;if(resume)await controller.retryStoryStep();else await controller.continueStory(resume?undefined:input,person||undefined);}
  catch(e){settleInteraction(timing,interactionErrorOutcome(e));if(controller.runtime===runtime&&controller.getView().sessionId===session)setError((e as Error).message);}
  finally{
   const story=(runtime.getSnapshot().state as any).扩展?.story;
   const same=story?.branchId===branch&&story?.active?.number===(resume?active?.number:turn);
   if(same)routeInteraction(timing,isPartyTurn(story.active)?PARTY_CONVERSATION_ID:story.active.privatePersonId??person);
   settleInteraction(timing,same&&story.active.status==='complete'?'complete':'waiting-for-input');
   // Acceptance already persists the original input, even if later model generation fails.
   if(!resume&&story?.branchId===branch&&story.active?.number===turn&&story.active.input===input&&((story.active.privatePersonId??'')===person||!person&&story.active.privateRoute))source.clearSubmitted(input);
  }
 };
 const regenerate=async()=>{
  const runtime=controller.runtime,session=view.sessionId;setError('');requestedStoryView.current={turn:active!.number,head:headId};latest();
  try{if(canRetryProse)await controller.retryStoryProse();else await controller.rewriteCurrentStory();}
  catch(e){if(controller.runtime===runtime&&controller.getView().sessionId===session)setError((e as Error).message);}
 };
 const more=async()=>{if(!captured||!nextId||loading||loadingOlder.current)return;loadingOlder.current=true;const runtime=controller.runtime;setLoading(true);try{const page=await controller.database.storyPage(captured,{nextId});if(controller.runtime!==runtime||runtime.storyHeadId!==(captured.storyHeadId??null))return;publicScroll.capture();privateScroll.capture();setEntries(old=>{const ids=new Set(old.map(entry=>entry.id));return [...old,...page.entries.filter(entry=>!ids.has(entry.id))];});setNextId(page.nextId);}catch(e){if(controller.runtime===runtime)setError((e as Error).message);}finally{loadingOlder.current=false;if(controller.runtime===runtime)setLoading(false);}};

 const renderThread=(personId:string,ref:RefObject<HTMLDivElement|null>)=>{
  const selected=people.find(p=>p.id===personId),phone=!!personId;
  const {value:draft,setValue:setDraft,storageFailed}=phone?privateDraft:publicDraft;
  const visibleEntries=conversationEntries(entries,personId);
  const actionOptions=!phone&&allowInput&&!ledger?.deferredBattle?storyActionOptions(visibleEntries[0]?.turn.prose??''):[];
  const selectedAction=actionOptions.indexOf(draft);
  const chooseAction=(text:string)=>{setDraft(text);requestAnimationFrame(()=>{const input=publicInputRef.current;if(input){input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);input.scrollIntoView({block:'nearest'});}});};
  const currentPending=active&&active.status!=='complete'&&!isPartyTurn(active)&&(active.privatePersonId??'')===personId;
  const displayedError=error||(currentPending?workflowError:'');
  const player=state.人物.列表[state.角色.主控单位ID],playerName=player?.name??'你';
  const playerMessage=(turn:any)=><div className="story-message story-message--player">{view.avatarUrl?<Avatar name={playerName} imageUrl={view.avatarUrl}/>:<span className="avatar" aria-label={`${playerName}头像`}><CharacterPortrait state={state} figureUrl={view.figureUrl} person={{...player,id:state.角色.主控单位ID}}/></span>}<div><header><strong>{playerName}</strong><small>{turn.battleId?'战斗记录':'你的行动'} · 第 {turn.number} 段</small></header><p className="story-chat__input">{turn.input}</p></div></div>;
  return <div className={phone?'conversation-thread':'story-thread'}>
   {phone&&selected&&<header className="conversation-thread__head"><Button variant="ghost" className="conversation-back" onClick={()=>{backToConversations();}}>‹ 会话列表</Button><button className="conversation-person" aria-label={`${selected.name}的互动菜单`} onClick={()=>setRelationshipOpen(v=>!v)}><span className="conversation-avatar"><CharacterPortrait state={state} figureUrl={view.figureUrl} person={{...selected.person,kind:state.战斗单位.列表[selected.id]?.扩展?.角色库ID?'character':'resident'}}/></span><span><strong>{selected.name}</strong><small>{selected.available?(selected.communication.label):selected.communication.reason}</small></span></button></header>}
   {phone&&relationshipOpen&&<div className="conversation-interactions"><header><strong>人物互动</strong><Button variant="ghost" onClick={()=>setRelationshipOpen(false)}>收起</Button></header><PersonInteractions characterId={personId} onOpen={()=>setRelationshipOpen(false)}/></div>}
   {pending&&!currentPending&&<div className="conversation-pending" role="status">{isPartyTurn(active)?'队伍群聊尚未完成':active.privatePersonId?`${state.人物.列表[active.privatePersonId]?.name??'对方'}的会话尚未完成`:'故事中的行动尚未完成'}<Button variant="ghost" onClick={openPending}>返回处理中会话</Button>{closeControls()}</div>}
   <div className="story-history-frame">
   <div ref={ref} className="story-chat__history" aria-label={phone?`${selected?.name??'人物'}的私聊记录`:'故事记录'} aria-busy={loading} onScroll={phone?()=>privateScroll.onScroll():event=>{publicScroll.onScroll();if(event.currentTarget.scrollTop<16&&!publicScroll.following)void more();}}>
    <div className="story-chat__messages">
    {nextId&&<Button variant="ghost" disabled={loading} onClick={()=>void more()}>读取更早的故事</Button>}
    {!visibleEntries.length&&!currentPending&&<div className="story-chat__empty"><span aria-hidden="true">◇</span><p>{phone?'你们的私聊将保留在这里。':'写下你的行动，让故事从这里继续。'}</p></div>}
    {(phone?[...visibleEntries].reverse().map(entry=>({kind:'story' as const,entry})):storyBattleTimeline(state,visibleEntries,!nextId)).map(row=>row.kind==='battle'?<article key={`battle:${row.report.id}`} data-reading-key={`battle:${row.report.id}`}><header><strong>{row.report.status==='已结束'?'战斗结果':'正在交战'}</strong></header><StoryBattleReport report={row.report} expanded/>{row.report.status==='已结束'&&<Button disabled={busy||deferBattleNarration||!view.modelEnabled} onClick={()=>{setError('');void controller.narrateBattle(row.report.id).catch(e=>setError(e.message));}}>生成这场战报正文</Button>}<p className="muted">{row.report.status==='已结束'?'战斗已结算，可直接查看记录或继续行动。正文可按需生成。':'战况会在这里更新，战斗结束后可补写正文。'}</p></article>:(entry=><article key={entry.id} data-reading-key={entry.id} data-story-turn={entry.turn.number}>{phone?<PrivateMessages turn={entry.turn} bodyMarker={{'data-story-body':entry.id,'data-story-owner':timingOwner,'data-story-world':view.profileId,'data-story-session':view.sessionId}}/>:<>{playerMessage(entry.turn)}<div className="story-message story-message--narrator"><span className="story-message__emblem" aria-hidden="true">◇</span><div><header><strong>故事</strong><small>第 {entry.turn.number} 段</small></header><div data-story-body={entry.id} data-story-owner={timingOwner} data-story-world={view.profileId} data-story-session={view.sessionId}><StoryProse state={state} figureUrl={view.figureUrl} turn={entry.turn} actionChoices={entry.id===visibleEntries[0]?.id&&actionOptions.length===4?<StoryActionChoices options={actionOptions} draft={draft} disabled={busy||!!pending} onChoose={chooseAction}/>:undefined}/></div>{entry.turn.number===active?.number&&active.status==='complete'&&!isPartyTurn(active)&&!active.privatePersonId&&<Button variant="ghost" className="story-chat__regenerate" disabled={busy||!view.modelEnabled} onClick={()=>void regenerate()}>生成／重写正文</Button>}<StoryActionResults results={entry.turn.results} expanded={entry.id===visibleEntries[0]?.id}/><StoryOutcomeChanges turn={entry.turn} state={state}/><StoryChecks results={entry.turn.results}/><StoryBattleReports results={entry.turn.results} battleId={entry.turn.battleId}/></div></div></>}{!phone&&entry.turn.number<active?.number&&<><Button variant="ghost" disabled={busy||!view.modelEnabled||active?.status!=='complete'} onClick={async()=>{setError('');try{await controller.rewriteArchivedStory(entry.turn.number);}catch(e){setError((e as Error).message);}}}>生成／重写本段正文</Button><Button variant="ghost" className="story-chat__memory-action" disabled={busy||!view.modelEnabled} onClick={async()=>{setError('');try{await controller.summarizeArchivedStory(entry.id);}catch(error){setError((error as Error).message);}}}>{ledger.summaries?.some((s:any)=>s.source.turn===entry.turn.number)?'重新整理':'补整理'}第 {entry.turn.number} 段记忆</Button></>}<StoryWithdrawal branchId={entry.branchId} turn={entry.turn.number} input={entry.turn.input}/></article>)(row.entry))}
    {currentPending&&<article>{phone?<PrivateMessages turn={active}/>:playerMessage(active)}<StoryWithdrawal branchId={ledger.branchId} turn={active.number} input={active.input}/><div className="story-pending-turn">{active.status==='resolved'&&<QueryStatus query={responseQuery}/>}<p role="status">{active.hostProgress?.status==='waiting'?'请补充下面的选择。':active.hostProgress?.status==='ready'?'正在继续剩余安排。':active.status==='planning'?'正在回应你的行动。':extraction?'请确认下面的撤离损失，后续行动尚未执行。':pendingStoryCustodyTrades(state).length?'等待买主答复报价。':pendingStoryCustodyAuctions(state).length?'等待现场人物决定竞拍或放弃，后续行动已保留。':controlledGifts.length?'等待接收人回应赠物承诺。':pendingStoryBeliefs(state).length?'等待人物判断刚听到的话，后续行动已保留。':commitments.length?(active.continuation?'等待人物回应约定，已保存后续行动。':'等待人物回应约定。'):active.continuation?'已保存行动顺序，等待继续执行。':phone?'事项已处理，等待对方回复。':'行动已经结算，等待写下故事。'}</p>
     {pendingStoryCustodyTrades(state).map(r=><section key={r.id}><p>{state.人物.列表[r.sellerId]?.name}{r.gold>0?`提出以${r.gold}金魂币出售`:'提出无偿转交'}{state.人物.列表[r.personId]?.name}。{r.deviceTerms.length?'随同交付的拘束器见报价详情。':'拘束器仍归原主。'}</p>{r.buyerId===state.角色.主控单位ID?<CustodyTradeResponse offerId={r.id} continueStory/>:<p>等待买主答复。</p>}</section>)}
     {controlledGifts.map(r=><section key={r.id}><p>{state.人物.列表[r.playerId]?.name}提出赠送{r.itemName} ×{r.quantity}，期限第{r.dueDay}日。</p>{r.personId===state.角色.主控单位ID?<GiftResponse commitmentId={r.id} continueStory/>:<p>等待接收人回应，后续行动已保留。</p>}</section>)}
     <StoryBattleReports results={active.results??[]} battleId={active.battleId}/><StoryChecks results={active.results??[]}/><StoryActionResults results={active.results??[]} expanded/><StoryOutcomeChanges turn={active} state={state}/>
      {!phone&&pendingProse&&<section aria-label="已保留的正文" data-testid="retained-story-prose"><h3>已保留的正文</h3><div className="story-chat__prose">{pendingProse}</div></section>}
     {active.hostProgress&&['waiting','ready'].includes(active.hostProgress.status)?<StoryClarification turn={active}/>:extraction?<section aria-label="撤离损失确认"><p>现在撤离将放弃：</p><ul>{extraction.losses.map((loss:any,index:number)=><li key={index}>{({materials:'未采集材料',ring:'未吸收魂环',camp:'未使用火堆',chest:'未开启宝箱'} as Record<string,string>)[loss.kind]??'未处理收获'} · {loss.name}{loss.years?`（${loss.years}年）`:''}</li>)}</ul><Button disabled={busy} onClick={async()=>{setError('');try{await controller.resolveStoryExtraction(true);}catch(e){setError((e as Error).message);}}}>确认放弃并撤离</Button><Button variant="secondary" disabled={busy} onClick={async()=>{setError('');try{await controller.resolveStoryExtraction(false);}catch(e){setError((e as Error).message);}}}>留下处理收获</Button></section>:<Button disabled={busy} onClick={()=>void run(personId,true)}>{canRetryProse?'重试生成':'重试当前步骤'}</Button>}
      {!phone&&canRetryProse&&<Button variant="ghost" disabled={busy||!view.modelEnabled} onClick={()=>void regenerate()}>生成／重写正文</Button>}
      {phone&&closeControls()}
      {!phone&&active.status==='resolved'&&!isPartyTurn(active)&&!['waiting','ready'].includes(active.hostProgress?.status)&&<div className="field-actions"><Button variant="secondary" disabled={busy||localContinuation.loading||!localContinuation.data?.available} onClick={async()=>{setError('');const runtime=controller.runtime,session=view.sessionId;try{await controller.continueStoryLocally();}catch(e){if(controller.runtime===runtime&&controller.getView().sessionId===session)setError((e as Error).message);}}}>先继续旅程</Button>{(localContinuation.error||localContinuation.data?.reason)&&<><p role="status">{localContinuation.error||localContinuation.data?.reason}</p><Button variant="ghost" disabled={busy||localContinuation.loading} onClick={localContinuation.retry}>重新查看</Button></>}</div>}
     </div></article>}
    </div>
   </div>
   {!phone&&showLatest&&<Button variant="secondary" className="story-chat__latest" onClick={latest}>回到最新消息 ↓</Button>}
   </div>
   {displayedError&&<p className="story-chat__error" role="alert">{displayedError}</p>}
   {!phone&&nextBattle&&!unboundReports.some(report=>report.id===nextBattle)&&<Button disabled={busy||deferBattleNarration||!view.modelEnabled} onClick={()=>{setError('');void controller.narrateBattle(nextBattle).catch(e=>setError(e.message));}}>生成战报正文</Button>}
   {!phone&&ledger?.deferredBattle&&<p role="status">战后行动已保存，战斗结束后继续。</p>}
   {allowInput&&!ledger?.deferredBattle&&<form className="story-composer" onSubmit={event=>{event.preventDefault();if(!busy&&!pending&&draft.trim()&&(!phone||selected?.available))void run(personId);}}>
    <label htmlFor={phone?'private-chat-input':'story-input'}>{phone?`发送给 ${selected?.name??'人物'}`:'你想做什么？'}</label>
    <textarea ref={phone?undefined:publicInputRef} id={phone?'private-chat-input':'story-input'} value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={sendMessageOnEnter} enterKeyHint="send" maxLength={8000} rows={phone?2:3} placeholder={phone?`对${selected?.name??'对方'}说些什么…`:'写下行动或对白，继续你的故事…'}/>
    <div className="story-composer__actions"><small role="status">{storageFailed?'草稿暂时无法保存，请先复制。':!phone&&selectedAction>=0?`已填入选项 ${selectedAction+1}，可编辑后继续故事。`:'Enter 发送 · Shift+Enter 换行'}</small><Button type="submit" disabled={busy||!!pending||!draft.trim()||phone&&!selected?.available}>{phone?'发送':'继续故事'}</Button></div>
    {phone&&!selected?.available&&<p className="muted">{selected?.communication.reason||'暂时不能交谈'}</p>}
    {!view.modelEnabled&&<p className="muted">请先在设置中启用创作顾问并完成连接。</p>}
   </form>}
  </div>;
 };
 return <>
  <PersonRewritePanel covered={communications}/>
  <Modal open={!!closing} title="结束本次会话" onClose={()=>{if(!busy)setClosing(null);}} actions={<><Button variant="ghost" disabled={busy} onClick={()=>setClosing(null)}>保留会话</Button><Button variant="secondary" disabled={busy} onClick={()=>void closeConversation()}>确认结束</Button></>}><p>结束与{closing?.name}的这次交谈。已完成的行动会保留，其余安排到此结束。之后可以继续主线或发起新交谈。</p></Modal>
  <Panel title="你的故事" className="story-chat story-chat--tavern" actions={<div className="story-chat__navigation"><span>{state.场景?.时间} · {locationName}</span></div>}>{renderThread('',historyRef)}</Panel>
  <CommunicationWindow open={communications} activationKey={conversationActivation.current} unread={unread.length+Number(groupUnread)+commercialUnread+roomUnread} onOpen={()=>setCommunications(true)} onClose={returnToStory}>
   <div className={`communication-layout${privatePersonId||partyOpen||commercialOpen||roomsOpen?' communication-layout--selected':''}`}>
    <aside className="communication-sidebar" aria-label="联系人与会话">
     <label className="communication-search"><UiIcon name="person"/><input aria-label="寻找联系人" placeholder="寻找联系人…" value={conversationSearch} onChange={e=>setConversationSearch(e.target.value)}/></label>
     <nav className="communication-pinned" aria-label="常用会话"><button aria-label="打开人物私信与群组" aria-pressed={roomsOpen} onClick={()=>{leavePartyTiming();setPrivatePersonId('');setPartyOpen(false);setCommercialOpen(false);setRoomsOpen(true);setRelationshipOpen(false);}}><span className="communication-tile"><UiIcon name="group"/></span><span><strong>人物私信与群组</strong><small>{roomUnread?`${roomUnread}条新消息`:'居民交流与主动私信'}</small></span>{roomUnread>0&&<b className="communication-count">{roomUnread}</b>}</button>
      <button aria-label="打开队伍群聊" aria-pressed={partyOpen} onClick={()=>{leavePartyTiming();setPrivatePersonId('');setCommercialOpen(false);setRoomsOpen(false);setPartyOpen(true);setRelationshipOpen(false);}}><span className="communication-tile"><UiIcon name="group"/></span><span><strong>队伍群聊</strong><small>{lastGroup?.responses?.items.at(-1)?.text??lastGroup?.text??'和同伴说说话'}</small></span>{groupUnread&&<i className="conversation-unread" aria-label="新消息"/>}</button>
      <button aria-label="打开商家留言" aria-pressed={commercialOpen} onClick={()=>{leavePartyTiming();setPrivatePersonId('');setPartyOpen(false);setCommercialOpen(true);setRoomsOpen(false);setRelationshipOpen(false);}}><span className="communication-tile communication-tile--merchant"><UiIcon name="store"/></span><span><strong>商家留言</strong><small>{commercialUnread?`${commercialUnread}条未读通知`:'拍卖邀请、拍品册与新货'}</small></span>{commercialUnread>0&&<b className="communication-count">{commercialUnread}</b>}</button>
     </nav>
     <div className="communication-list-label">联系人</div><QueryStatus query={roomInbox} label="正在读取联系人…"/>
     <nav className="communication-contacts" aria-label="人物会话">{people.filter(p=>(p.communication.contactId||p.communication.mode!=='soul-device'||p.latest)&&p.name.includes(conversationSearch.trim())).map(person=><button key={person.id} className="conversation-contact" aria-pressed={privatePersonId===person.id} aria-label={`打开${person.name}的会话${person.latest&&!seenMessages.has(person.latest.id)?' · 新消息':''}`} onClick={()=>openConversation(person.id)}><span className="conversation-avatar"><CharacterPortrait state={state} figureUrl={view.figureUrl} person={{...person.person,kind:state.战斗单位.列表[person.id]?.扩展?.角色库ID?'character':'resident'}}/></span><span className="conversation-contact__text"><strong>{person.name}</strong><small>{person.available?person.communication.label:person.communication.reason}</small><span>{person.preview}</span></span>{person.latest&&!seenMessages.has(person.latest.id)&&<i className="conversation-unread" aria-label="新消息"/>}</button>)}{!people.some(p=>(p.communication.contactId||p.communication.mode!=='soul-device'||p.latest)&&p.name.includes(conversationSearch.trim()))&&<p className="muted">{conversationSearch?'没有找到这位联系人。':'还没有可联络的熟人。'}</p>}{nextId&&<Button variant="ghost" disabled={loading} onClick={()=>void more()}>查找更早的会话</Button>}</nav>
    </aside>
    <main className="communication-content">{roomsOpen&&<div className="communication-view"><QueryStatus query={roomInbox}/><ConversationRooms facts={roomInbox.data} onBack={backToConversations}/></div>}
     {!privatePersonId&&!partyOpen&&!commercialOpen&&!roomsOpen&&<div className="communication-welcome"><UiIcon name="chat"/><h3>选择一段交谈</h3><p>联系熟人，或看看队伍与商家有什么新消息。</p></div>}
     {privatePersonId&&renderThread(privatePersonId,privateHistoryRef)}
     {(partyOpen||partyVisited)&&<div className="communication-view" hidden={!partyOpen}><header className="communication-view__head"><Button variant="ghost" className="conversation-back" onClick={backToConversations}>‹ 会话列表</Button><strong>队伍群聊</strong></header><PartyChat visible={communications&&partyOpen} timingRef={interaction} timingOwner={timingOwner} entries={entries} loadOlder={nextId?()=>void more():undefined} loadingOlder={loading} onRead={markGroupRead} onBack={backToConversations} onPerson={openConversation}/></div>}
     {(commercialOpen||commercial.data)&&<div className="communication-view" hidden={!commercialOpen}>{!commercial.data&&<header className="communication-view__head"><Button variant="ghost" className="conversation-back" onClick={backToConversations}>‹ 会话列表</Button><strong>商家留言</strong></header>}<QueryStatus query={commercial}/>{commercial.data&&<CommercialMessages onNavigate={returnToStory} active={commercialVisible} facts={commercial.data} onBack={backToConversations}/>}</div>}
    </main>
   </div>
  </CommunicationWindow>
 </>;
}

function StoryClarification({turn}:{turn:any}){
 const {controller,view,state}=useGame(),h=turn.hostProgress;
 const draft=useStoryDraft({profileId:view.profileId,branchId:state.扩展.story.branchId,turn:turn.number,historyHeadId:controller.runtime.storyHeadId,personId:`$answer:${h.requestId}`});
 const [error,setError]=useState(''),[working,setWorking]=useState(false),busy=working||view.busy||!!view.modelTask;
 const act=async(cancel=false)=>{setError('');setWorking(true);try{if(cancel)await controller.cancelRemainingStory(h.requestId);else if(h.status==='waiting'){const value=draft.value.trim();await controller.answerStory(h.requestId,value);draft.clearSubmitted(value);}else await controller.continueStory();}catch(e){setError((e as Error).message);}finally{setWorking(false);}};
 return <form className="story-composer story-clarification" aria-label="补充安排" onSubmit={e=>{e.preventDefault();if(!busy)void act();}}>
  {h.question&&<label htmlFor={`story-answer-${turn.number}`}>{h.question}</label>}
  {h.answer&&<p>你的补充：{h.answer}</p>}
  {h.status==='waiting'&&<textarea id={`story-answer-${turn.number}`} aria-label="补充你的选择" rows={2} maxLength={Math.max(0,7999-turn.input.length)} value={draft.value} onChange={e=>draft.setValue(e.target.value)} onKeyDown={sendMessageOnEnter} enterKeyHint="send" placeholder="告诉主持人你的选择…"/>}
  <div className="field-actions"><Button type="submit" disabled={busy||h.status==='waiting'&&!draft.value.trim()}>继续安排</Button><Button type="button" variant="secondary" disabled={busy} onClick={()=>void act(true)}>先不做了</Button></div>
  {error&&<p role="alert">{error}</p>}{draft.storageFailed&&<p role="status">补充内容暂时无法保存，请先复制。</p>}
 </form>;
}
