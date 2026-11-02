import {useEffect,useState} from 'react';
import {useGame} from '../game-context';
import {useSceneQuery} from '../use-game-query';
import {ActionSection,Button,Modal} from '../components';
import {openingPlaybackKey,openingScript,type OpeningSceneFacts} from '../../runtime/opening-scene';
import {unitFigure} from '../fantasy-art';
import {openingCatFigure} from '../../runtime/opening-art';
import OpeningStage from './OpeningStage';
import OpeningGuidance from './OpeningGuidance';

export default function BackgroundPrologue({onOpenChange}:{onOpenChange:(open:boolean)=>void}){
 const {controller,state,view}=useGame(),record=state.世界?.opening?.background;
 const key=record?openingPlaybackKey(view.profileId??'',record.sourceId):'';
 const [open,setOpen]=useState(false),[replay,setReplay]=useState(false),[index,setIndex]=useState(0);
 useEffect(()=>{
  const progress=key?controller.preferences.get<any>(key,null):null;
  setOpen(progress?.status==='reading');setReplay(false);setIndex(Number.isSafeInteger(progress?.index)?Math.max(0,progress.index):0);
 },[controller,key,view.sessionId]);
 useEffect(()=>{onOpenChange(open);return()=>onOpenChange(false);},[open,onOpenChange]);
 useEffect(()=>{const listener=(event:Event)=>{const request=(event as CustomEvent).detail;if(!record||request?.profileId!==view.profileId||request.sourceId!==record.sourceId)return;setReplay(true);setIndex(0);setOpen(true);};window.addEventListener('douluo:opening-replay',listener);return()=>window.removeEventListener('douluo:opening-replay',listener);},[key,view.profileId]);
 const query=useSceneQuery<OpeningSceneFacts|null>('scene.opening',{},key,{enabled:open&&!!record});
 const close=()=>{if(key&&!replay)controller.preferences.set(key,{status:'done'});setOpen(false);};
 if(!open||!record)return null;
 if(!query.data)return <Modal open title={replay?'开场回顾':'故事即将开始'} className="modal--opening" onClose={close}><OpeningStage chapter="故事即将开始" location="斗罗大陆" background="/art/opening-scenes/academy.webp" name="旁白" text={query.error?'开场暂时未能打开，你可以重试，或先进入故事。':'正在拉开故事的帷幕……'} error={query.error??''} actions={<><Button variant="ghost" onClick={close}>进入故事</Button>{query.error&&<Button onClick={query.retry}>重试</Button>}</>}/></Modal>;
 if(query.data.backgroundId==='shrek-student')return <OpeningGuidance automatic presentation={{key,replay,onClose:close}}/>;
 const facts=query.data,script=openingScript(facts),cursor=Math.min(index,script.lines.length-1),line=script.lines[cursor];
 const speaker=facts.people.find(p=>p.id===line.speakerId),figurePerson=line.platform||facts.backgroundId==='prince-cat'&&!speaker?facts.people.find(p=>p.id===facts.subjectId):speaker??facts.people.find(p=>p.id===(facts.perspective==='captive'?facts.buyerId:facts.subjectId))??facts.people.find(p=>p.id===facts.guideId);
 let figure=figurePerson?unitFigure(state,figurePerson.id,view.figureUrl):null;
 if(figurePerson&&!(figurePerson.id===facts.playerId&&view.figureUrl)){
  const special:Record<string,string>={'captive-cat-liu':'cat','background-buyer-wen':'wen','background-buyer-gu':'gu','background-buyer-qi':'qi'};
  if(special[figurePerson.id]&&figurePerson.age>=18&&(figurePerson.id==='captive-cat-liu'?figurePerson.gender==='女':figurePerson.gender==='男'))figure='/art/opening-figures/'+special[figurePerson.id]+'.webp';
  if(figurePerson.id==='captive-cat-liu'&&figurePerson.age>=18&&figurePerson.gender==='女')figure=openingCatFigure(facts);
 }
 const next=()=>{if(cursor===script.lines.length-1){close();return;}const value=cursor+1;setIndex(value);if(!replay)controller.preferences.set(key,{status:'reading',index:value});};
 return <Modal open title={replay?'开场回顾':script.chapter} className="modal--opening" onClose={close}>
  <OpeningStage chapter={script.chapter} location={facts.title} replay={replay} platform={line.platform} background={facts.backgroundId==='custom'?'/art/fantasy-v3/garden.png':'/art/opening-scenes/'+script.scene+'.webp'} figure={figure} name={speaker?speaker.name+(line.memory?' · 临行回忆':''):'旁白'} text={line.text} onAdvance={next}
   actions={<><Button variant="ghost" onClick={close}>{replay?'结束回顾':'跳过开场'}</Button><Button onClick={next}>{cursor===script.lines.length-1?(replay?'结束回顾':'开始故事'):'继续 ›'}</Button></>}/>
 </Modal>;
}

export function OpeningRecall(){
 const {state,view}=useGame(),record=state.世界?.opening?.background;if(!record)return null;
 return <ActionSection title={<>背景往事</>} className="opening-recall"><p>回顾这段旅程最初的相遇。</p><Button variant="ghost" onClick={()=>{const detail={profileId:view.profileId,sourceId:record.sourceId};location.hash='/adventure';window.setTimeout(()=>window.dispatchEvent(new CustomEvent('douluo:opening-replay',{detail})),0);}}>回看开场</Button></ActionSection>;
}
