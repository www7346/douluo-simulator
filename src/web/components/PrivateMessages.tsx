import {personAgePresentation} from '../../shared/person-age-presentation';
import {useState} from 'react';
import {useGame} from '../game-context';
import {Modal} from '../components';
import CharacterPortrait from './CharacterPortrait';
import {PortraitImage} from './PortraitArt';
import {unitFigure} from '../fantasy-art';
import {figurePortrait} from '../figure-portraits';
import {assetUrl} from '../asset-delivery';
import CharacterCombatArchive from './CharacterCombatArchive';
import PersonInteractions from './PersonInteractions';
import StoryActionResults from './StoryActionResults';
import StoryChecks from './StoryChecks';
import type {StoryTurn} from '../../runtime/story-turns';
import {receiptSummary} from '../../runtime/player-text';
export default function PrivateMessages({turn,bodyMarker}:{turn:StoryTurn;bodyMarker?:Record<string,string|number>}){
 const {state,view}=useGame(),[personId,setPersonId]=useState('');
 const player=state.人物.列表[state.角色.主控单位ID],npc=state.人物.列表[turn.privatePersonId!],figure=unitFigure(state,state.角色.主控单位ID,view.figureUrl),avatar=figure&&figurePortrait(figure);
 const meaningfulResults=turn.results.some(r=>r.status==='failed'||r.receipt?.summary&&!['person-addressed','story-statement-recorded','npc-goal-requested','npc-goal-existing'].includes(r.receipt.type));
 return <section className="private-messages" aria-label="私聊消息">
 <div className="private-message private-message--self"><button className="private-message__avatar" aria-label="查看我的资料" onClick={()=>setPersonId(state.角色.主控单位ID)}>{view.avatarUrl?<img src={assetUrl(view.avatarUrl)} alt="你的头像"/>:avatar?<PortraitImage art={avatar} name="你的头像"/>:<CharacterPortrait state={state} figureUrl={view.figureUrl} person={player}/>}</button><div className="private-message__bubble">{turn.input}</div></div>
 {turn.status!=='complete'?null:turn.privateMessages?turn.privateMessages.map((text,index)=><div key={index} className="private-message"><button className="private-message__avatar" aria-label={`查看${npc?.name??'对方'}的资料`} onClick={()=>setPersonId(turn.privatePersonId!)}><CharacterPortrait state={state} figureUrl={view.figureUrl} person={{...npc,id:turn.privatePersonId}}/></button><div className="private-message__bubble" {...(index===0?bodyMarker:{})}>{text}</div></div>):<details className="private-message__legacy"><summary>查看旧版私聊原文</summary><div style={{whiteSpace:'pre-wrap'}}>{turn.prose}</div></details>}
 {turn.status==='complete'&&turn.privateMessages?.length===0&&<p className="muted" role="status">{turn.prose}</p>}
 {turn.status==='complete'&&meaningfulResults&&<details className="private-message__system"><summary>{turn.results.filter(r=>r.status==='succeeded'&&r.receipt?.summary&&!['person-addressed','story-statement-recorded','npc-goal-requested','npc-goal-existing'].includes(r.receipt.type)).map(r=>receiptSummary('',r.receipt!,state)).join('；')||(turn.results.some(r=>r.status==='failed')?'部分事项未完成':'本轮处理结果')} · 展开详情</summary><StoryActionResults results={turn.results}/><StoryChecks results={turn.results}/></details>}
 <Modal open={!!personId} title={state.人物.列表[personId]?.name??'人物资料'} onClose={()=>setPersonId('')}><CharacterPortrait state={state} figureUrl={view.figureUrl} person={{...state.人物.列表[personId],id:personId}}/><p>{state.人物.列表[personId]?.appearance}</p><p>{personAgePresentation(state.人物.列表[personId]).label} · {state.人物.列表[personId]?.gender} · {state.人物.列表[personId]?.occupation}</p>{personId&&personId!==state.角色.主控单位ID&&<><PersonInteractions characterId={personId} onOpen={()=>setPersonId('')}/><CharacterCombatArchive characterId={personId} state={state}/></>}</Modal>
 </section>;
}
