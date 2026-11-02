import {playerDescription} from '../../runtime/player-copy';
import {useEffect,useRef,useState} from 'react';
import {Button,Modal} from '../components';
import {useGame} from '../game-context';
import {useSceneQuery} from '../use-game-query';
import {advanceMasterScene,masterLines,masterOpeningScene,resumeMasterScene,type MasterFacts,type MasterScene} from '../master-dialogue';
import OpeningStage from './OpeningStage';
import RingItemDialog from './RingItemDialog';

export function MasterStage({facts,scene,playerName,disabled,error,onNext,onPreview,onBack,onClaim,onDefer,onLeave,onInspect,onSkip,replay=false}: {
 facts:MasterFacts;scene:MasterScene;playerName:string;disabled:boolean;error:string;replay?:boolean;
 onNext:()=>void;onPreview:(id:string)=>void;onBack:()=>void;onClaim:()=>void;onDefer:()=>void;onLeave:()=>void;onInspect:()=>void;onSkip:()=>void;
}){
 const lines=masterLines(scene,facts),line=lines[Math.min(scene.index,lines.length-1)],last=scene.index>=lines.length-1,gift=facts.gifts.find(g=>g.id===scene.giftId);
 const canInspect=!replay&&Boolean(facts.giftItem)&&['received','revisit'].includes(scene.kind);
 const upper=['choices','quick-choices'].includes(scene.kind)?<div className="master-gifts" aria-label="大师的见面礼">{facts.gifts.map(item=><button type="button" className="master-gift" key={item.id} disabled={disabled||!!facts.reason} onClick={()=>onPreview(item.id)}><span className={'master-gift__halo'+(item.years===10?' is-white':'')} aria-hidden="true"/><span><strong>{item.name}</strong><small>{playerDescription(item.description)}</small></span><span>›</span></button>)}</div>:scene.kind==='gift'&&gift?<div className="master-gift-caption"><span>{gift.years}年</span><strong>{gift.name}</strong><p>{playerDescription(gift.description)}</p></div>:undefined;
 const advance=['intro','deferred','received'].includes(scene.kind)||['gift','farewell'].includes(scene.kind)&&!last?onNext:scene.kind==='farewell'&&last?onLeave:undefined;
 return <OpeningStage chapter={facts.academy?'入学初课':'林间初课'} location={facts.academy?'史莱克学院 · 天斗校区':'猎魂森林'} background={facts.academy?'/art/opening-scenes/academy.webp':'/art/fantasy-v3/forest.png'} figure="/art/story/yu-xiaogang-guide.png" name={line.speaker==='master'?'玉小刚':line.speaker==='player'?playerName:'旁白'} text={line.text} upper={upper} error={error} onAdvance={disabled?undefined:advance} replay={replay}
 actions={<><Button variant="ghost" disabled={disabled} onClick={onSkip}>{replay?'结束回顾':'跳过开场'}</Button><div>
 {scene.kind==='quick-choices'?<Button variant="secondary" disabled={disabled} onClick={onLeave}>暂不领取</Button>:scene.kind==='choices'?<Button variant="secondary" disabled={disabled} onClick={onDefer}>稍后领取，开始故事</Button>:scene.kind==='gift'?<><Button variant="secondary" disabled={disabled} onClick={onBack}>再看看</Button><Button disabled={disabled||!!facts.reason} onClick={last?onClaim:onNext}>{last?'就选这一枚':'继续 ›'}</Button></>:canInspect?<><Button variant="secondary" disabled={disabled} onClick={onNext}>先收好</Button><Button disabled={disabled} onClick={onInspect}>查看魂环</Button></>:scene.kind==='revisit'||scene.kind==='farewell'&&last?<Button disabled={disabled} onClick={onLeave}>{replay?'结束回顾':'开始故事'}</Button>:<Button disabled={disabled} onClick={onNext}>{scene.kind==='intro'&&last&&!replay?'看看见面礼':'继续 ›'}</Button>}
 </div></>}/>;
}
export default function OpeningGuidance({onFinish,automatic=false,presentation}:{onFinish?:()=>void;automatic?:boolean;presentation?:{key:string;replay:boolean;onClose:()=>void}}) {
  const {state,view,controller}=useGame();
  const query=useSceneQuery<MasterFacts>('opening.guidance');
  const [open,setOpen]=useState(false),[itemId,setItemId]=useState('');
  const [scene,setScene]=useState<MasterScene>({kind:'intro',index:0});
  const [working,setWorking]=useState(false),[error,setError]=useState('');
  const guard=useRef(false),shown=useRef(false);
  const data=query.data;
  useEffect(()=>{shown.current=false;setOpen(false);setItemId('');setError('');},[view.sessionId]);
  useEffect(()=>{if(automatic&&!shown.current&&data?.guidance&&!query.loading&&(presentation||data.guidance.status==='pending'&&!data.reason)){shown.current=true;const saved=presentation&&!presentation.replay?controller.preferences.get<any>(presentation.key,null):null;setScene(presentation?resumeMasterScene(saved?.scene,data):masterOpeningScene(data));setOpen(true);}},[automatic,data,query.loading,presentation?.key]);
  useEffect(()=>{if(open&&presentation&&!presentation.replay)controller.preferences.set(presentation.key,{status:'reading',scene:{kind:scene.kind,index:scene.index,...(scene.giftId?{giftId:scene.giftId}:{})}});},[open,scene,presentation?.key,presentation?.replay]);
  const finish=()=>{setOpen(false);presentation?.onClose();onFinish?.();};
  if(!data?.guidance)return presentation?<Modal open title="入学初课" className="modal--opening" onClose={finish}><OpeningStage chapter="入学初课" location="史莱克学院" background="/art/opening-scenes/academy.webp" name="旁白" text={query.error?'初课暂时未能打开，你可以稍后再来。':'大师正在准备今天的初课……'} error={query.error??''} actions={<Button onClick={finish}>先进入故事</Button>}/></Modal>:null;
  const disabled=view.busy||working||query.loading;
  const presented=presentation?.replay?{...data,reason:'',hasRing:false,freeGuide:false,giftItem:null}:data;
  const run=async(action:()=>Promise<void>)=>{
    if(guard.current||view.busy||query.loading)return;
    guard.current=true;setWorking(true);setError('');
    try{await action();}catch(cause){setError(cause instanceof Error?cause.message:'暂时未能完成，请再试一次。');}
    finally{guard.current=false;setWorking(false);}
  };
  const settle=async()=>{if(data.guidance?.status==='pending')await controller.dispatch('opening.guidance',{action:'defer'});};
  const leave=()=>void run(async()=>{if(!presentation?.replay)await settle();finish();});
  const claim=(giftId=scene.giftId,quick=false)=>void run(async()=>{
    if(data.guidance?.giftStatus!=='available'||!data.gifts.some(gift=>gift.id===giftId))return;
    await controller.dispatch('opening.guidance',{action:'claim',giftId});
    if(quick)finish();else setScene({kind:'received',index:0,giftId});
  });
  return <>{!automatic&&data.guidance.giftStatus==='available'&&<Button variant="secondary" disabled={disabled} onClick={()=>{setScene({kind:'quick-choices',index:0});setError('');setOpen(true);}}>领取大师的见面礼</Button>}
    <Modal open={open} title={data.academy?'入学初课':'林间初课'} className="modal--opening" onClose={leave}>
      <MasterStage facts={presented} scene={scene} playerName={state.人物.列表[state.角色.主控单位ID]?.姓名??state.人物.列表[state.角色.主控单位ID]?.name??'你'} disabled={disabled} error={error||(presentation?.replay?'':data.reason)||query.error||''}
        replay={presentation?.replay} onNext={()=>{let next=scene.kind==='revisit'?{kind:'farewell' as const,index:0}:advanceMasterScene(scene,data);if(presentation?.replay&&next.kind==='choices')next={kind:'farewell',index:0};setScene(next);}}
        onPreview={giftId=>{if(scene.kind==='quick-choices')claim(giftId,true);else{setError('');setScene({kind:'gift',index:0,giftId});}}}
        onBack={()=>{setError('');setScene({kind:'choices',index:0});}} onClaim={()=>claim()}
        onSkip={()=>void run(async()=>{if(!presentation?.replay)await controller.dispatch('opening.guidance',{action:'skip'});finish();})}
        onDefer={()=>void run(async()=>{await settle();finish();})} onLeave={leave}
        onInspect={()=>{if(data.giftItem){setOpen(false);setItemId(data.giftItem.id);}}}/>
    </Modal>
    {itemId&&<RingItemDialog itemId={itemId} onClose={()=>{setItemId('');if(presentation)finish();}}/>}
  </>;
}
