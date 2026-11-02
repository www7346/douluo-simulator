import {useEffect,useRef,useState} from 'react';
import {useGame} from '../game-context';
import {ActionSection,Button,Panel} from '../components';
import type {StoryPromptConfig} from '../../runtime/story-prompts';
import {isPartyTurn} from '../../shared/story-party-chat';
import StoryPromptEditor from './StoryPromptEditor';
import StoryContextBudget from './StoryContextBudget';
import {useStoryDraft} from '../use-story-draft';
import {conversationPeople} from '../story-conversations';
import {useServerQuery} from '../use-game-query';
import './story-chat.css';

export default function StorySettings({prompts,setPrompts,promptsReady}:{prompts:StoryPromptConfig;setPrompts:(value:StoryPromptConfig)=>void;promptsReady:boolean}){
 const {controller,view,state}=useGame(),ledger=state.扩展?.story,active=ledger?.active;
 const [error,setError]=useState(''),[privatePersonId,setPrivatePersonId]=useState('');
 const contacts=useServerQuery<any>('presentation.conversations'),people=conversationPeople(state,[],contacts.data?.contacts??[]);
 const headId=controller.runtime.storyHeadId;
 const draftState=useStoryDraft({profileId:view.profileId,branchId:ledger?.branchId??'initial',turn:ledger?.nextTurn??1,historyHeadId:headId,personId:privatePersonId});
 const draft=draftState.value,pending=active&&active.status!=='complete';
 const [autoMemory,setAutoMemory]=useState(false),[memoryReady,setMemoryReady]=useState(false),[memorySaving,setMemorySaving]=useState(false);
 const [messagePreview,setMessagePreview]=useState(''),[previewBusy,setPreviewBusy]=useState(false),[previewCheck,setPreviewCheck]=useState('');
 const previewVersion=useRef(0),busy=view.busy||!!view.modelTask;
 useEffect(()=>{previewVersion.current++;setMessagePreview('');setPreviewCheck('');},[draft,prompts,privatePersonId,view.snapshot.revision,view.sessionId,view.modelProfile]);
 useEffect(()=>{let current=true;setMemoryReady(false);void controller.storyMemorySettings().then(value=>{if(current){setAutoMemory(value.autoSummarize);setMemoryReady(true);}}).catch(e=>{if(current)setError(e.message);});return()=>{current=false;};},[controller]);
 useEffect(()=>{setError('');setPrivatePersonId('');},[view.profileId,view.sessionId]);
  return <Panel title="故事与记忆设置" className="story-chat story-chat__tools"><label>交谈范围<select value={privatePersonId} onChange={e=>setPrivatePersonId(e.target.value)}><option value="">主线故事</option>{people.map(person=><option key={person.id} value={person.id}>{person.name}的私聊</option>)}</select></label>{error&&<p role="alert">{error}</p>}  {active?.status==='complete'&&!isPartyTurn(active)&&(active.privatePersonId??'')===privatePersonId&&<Button variant="secondary" disabled={busy||!view.modelEnabled} onClick={async()=>{setError('');try{await controller.summarizeCurrentStory();}catch(e){setError((e as Error).message);}}}>整理第 {active.number} 段记忆</Button>}
  {active?.status==='complete'&&!isPartyTurn(active)&&(active.privatePersonId??'')===privatePersonId&&<Button variant="secondary" disabled={busy||!view.modelEnabled} onClick={async()=>{setError('');try{await controller.summarizeStoryStage(privatePersonId||undefined);}catch(e){setError((e as Error).message);}}}>整理近期阶段记忆</Button>}
  {!!ledger?.stageSummaries?.length&&<details><summary>阶段记忆</summary><p className="muted">每次整理当前交谈范围最近最多八段原文，可随故事推进再次整理。</p>{ledger.stageSummaries.filter((stage:any)=>stage.sources[0].source.privatePersonId===(privatePersonId||undefined)).map((stage:any,index:number)=><section key={index}><h4>{stage.title}</h4>{stage.sources.map((s:any)=><div key={s.source.turn}><strong>第 {s.source.turn} 段</strong>{s.items.map((item:any,i:number)=><p key={i}><strong>{({event:'叙事',statement:'人物说法',thought:'内心想法',unobserved:'对方未感知',uncertain:'尚未证实'} as Record<string,string>)[item.kind]}</strong> · {item.text}<br/><small>原文：{item.quote.text}</small></p>)}</div>)}</section>)}</details>}
  {!!ledger?.summaries?.length&&<details><summary>已整理的故事记忆</summary><p className="muted">按当前交谈范围显示记忆摘要及对应原文。</p>{ledger.summaries.filter((s:any)=>s.source.privatePersonId===(privatePersonId||undefined)).map((s:any)=><section key={`${s.source.branchId}:${s.source.turn}`}><h4>第 {s.source.turn} 段</h4>{s.items.map((item:any,index:number)=><p key={index}><strong>{({event:'叙事',statement:'人物说法',thought:'内心想法',unobserved:'对方未感知',uncertain:'尚未证实'} as Record<string,string>)[item.kind]}</strong> · {item.text}<br/><small>原文（{item.quote.field==='input'?'玩家输入':'小说'}）：{item.quote.text}</small></p>)}</section>)}</details>}
  <ActionSection title={<>故事记忆设置</>}>
   <label><input type="checkbox" checked={autoMemory} disabled={busy||!memoryReady||memorySaving} onChange={async e=>{const enabled=e.target.checked,previous=autoMemory;setAutoMemory(enabled);setMemorySaving(true);try{await controller.saveStoryMemorySettings({version:1,autoSummarize:enabled});}catch(error){setAutoMemory(previous);setError((error as Error).message);}finally{setMemorySaving(false);}}}/>每段完成后自动整理记忆</label>
   <p className="muted">开启后，每段故事完成时整理一次记忆，原文仍保留。私聊分别整理；整理中断后可以重试。设置会立即保存。</p>
  </ActionSection>
  <ActionSection title={<>高级提示词与消息结构</>} className="story-chat__settings">
   <fieldset disabled={busy||!promptsReady}>
   <StoryPromptEditor value={prompts} onChange={setPrompts} disabled={busy||!promptsReady}/>
   <Button variant="secondary" disabled={busy||previewBusy||(!pending&&!draft.trim())} onClick={async()=>{const version=previewVersion.current;setPreviewBusy(true);setError('');setPreviewCheck('');setMessagePreview('');try{const result=await controller.previewStoryMessages(draft,prompts,privatePersonId||undefined);if(version===previewVersion.current){setMessagePreview(JSON.stringify(result,null,2));setPreviewCheck(result.validation.status==='passed'?`本阶段的结构与容量检查通过。输入保守估算 ${result.validation.budget.estimatedInput}，输出预留 ${result.validation.budget.outputReserve}，总容量 ${result.validation.budget.capacity}。连接状态可在“模型与用途”中测试。`:`本阶段检查未通过：${result.validation.error}`);}}catch(e){if(version===previewVersion.current)setError((e as Error).message);}finally{setPreviewBusy(false);}}}>预览本回合消息</Button>
   <p className="muted">按当前编辑的设置预览本回合消息，无需调用模型。行动结束后可预览小说写作消息。点击“保存设置”后用于后续生成。</p>
   {previewCheck&&<p role="status">{previewCheck}</p>}
   {messagePreview&&<><StoryContextBudget budget={JSON.parse(messagePreview).contextBudget}/><details><summary>本回合消息编排</summary><pre className="story-chat__preview">{messagePreview}</pre></details></>}
   <p className="muted">修改后点击页面上方“保存设置”。</p>
   </fieldset>
  </ActionSection>
</Panel>;

}
