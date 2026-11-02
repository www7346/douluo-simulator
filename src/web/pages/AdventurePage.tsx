import LongActionPlans from '../components/LongActionPlans';
import {useRef,useState} from 'react';
import {Button,EmptyState,Modal} from '../components';
import CompanionPanel from '../components/CompanionPanel';
import {ExpeditionRiskSummary} from '../components/ExpeditionRisk';
import {playerText} from '../../runtime/player-text';
import {useGame} from '../game-context';
import type {PageId} from '../App';
import {WorldAtlas} from '../WorldAtlas';
import TravelQuote from '../components/TravelQuote';
import {useActionFeedback} from '../use-action-feedback';


export default function AdventurePage({onNavigate,onSelectPerson,mapOpen=false,practiceOpen=false,dailyOpen=false,slaughterLocationId,onCloseMap=()=>{},onClosePractice=()=>{},onCloseDaily=()=>{}}:{onNavigate:(page:PageId)=>void;onSelectPerson?:(id:string,dungeonId?:string)=>void;mapOpen?:boolean;practiceOpen?:boolean;dailyOpen?:boolean;slaughterLocationId?:string;onCloseMap?:()=>void;onClosePractice?:()=>void;onCloseDaily?:()=>void}) {
  const {controller,state,view}=useGame();
  const [travelMode,setTravelMode]=useState('balanced');
  const [inspecting,setInspecting]=useState(false),inspection=useRef(0);
  const planning=useRef(0);
 const entryFeedback=useActionFeedback(),travelFeedback=useActionFeedback();
  const [travelPlan,setTravelPlan]=useState<any>(null),[dungeon,setDungeon]=useState<any>(null),[risk,setRisk]=useState<any>(null);
  if(!state.角色?.主控单位ID)return <EmptyState title="旅程尚未开始" action={<Button onClick={()=>onNavigate('creation')}>前往觉醒</Button>}>先建立你的魂师。</EmptyState>;
  const inspect=async(difficultyId:string)=>{
    const request=++inspection.current,epoch=view.sessionId,revision=view.snapshot.revision;setInspecting(true);
    try{
      const preview=await controller.previewExpeditionRisk(dungeon.id,difficultyId);
      const travelRequired=state.地图.当前地点ID!==dungeon.locationId;
      const travel=travelRequired?await controller.previewWorldIntent({type:'travel',destinationId:dungeon.locationId,mode:travelMode}):null;
      const current=controller.getView();
      if(request===inspection.current&&current.sessionId===epoch&&current.snapshot.revision===revision&&preview)setRisk({...preview,travelRequired,travel});
    }catch(error){if(request===inspection.current)controller.notify((error as Error).message,'danger');}
    finally{if(request===inspection.current)setInspecting(false);}
  };
  const plan=async(destination:any,stayBehind:string[]=[])=>{
    const request=++planning.current,epoch=view.sessionId,revision=view.snapshot.revision;
    try{const quote=await controller.previewWorldIntent({type:'travel',destinationId:destination.id,mode:travelMode,stayBehind});
      if(request===planning.current&&controller.getView().sessionId===epoch&&controller.getView().snapshot.revision===revision){if(quote){travelFeedback.dismiss();setTravelPlan({...quote,stayBehind});}else controller.notify('当前无法前往该地点','danger');}
    }catch(error){if(request===planning.current)controller.notify((error as Error).message,'danger');}
  };
  const enter=async()=>{const selected=risk;setRisk(null);setDungeon(null);await entryFeedback.run(()=>controller.startExpedition(selected.dungeonId,selected.difficultyId,travelMode));};
  return <div className="adventure-page">
    <Modal open={dailyOpen} keepMounted title="日常与安排" className="play-practice-dialog" onClose={onCloseDaily}><LongActionPlans mode="notices" active={dailyOpen}/></Modal>
    <Modal open={Boolean(entryFeedback.error)} title="未能进入探索" onClose={entryFeedback.dismiss} actions={<Button onClick={entryFeedback.dismiss}>知道了</Button>}><p role="alert">{entryFeedback.error}</p><p>处理提示中的问题后，可重新选择地图入口。已经走过的路程会保留。</p></Modal>
    <Modal open={practiceOpen} keepMounted title="安排修炼" className="play-practice-dialog" onClose={onClosePractice}><LongActionPlans mode="cultivation" active={practiceOpen}/></Modal>
    <Modal open={mapOpen} keepMounted title="大陆地图" className="play-map-dialog" onClose={onCloseMap}><WorldAtlas active={mapOpen} travelMode={travelMode} onTravelMode={setTravelMode} onDungeon={setDungeon} onPlan={plan} slaughterLocationId={slaughterLocationId} onSlaughter={()=>{onCloseMap();onNavigate('slaughter');}}/></Modal>
    <Modal open={Boolean(travelPlan)} title={`前往${travelPlan?.destination?.name??''}`} onClose={()=>setTravelPlan(null)} actions={<Button disabled={view.busy||!travelPlan?.affordable} onClick={async()=>{if(await travelFeedback.run(()=>controller.dispatch(travelPlan.resumeActionId?'world.resume-long-action':'world.intent',travelPlan.resumeActionId?{actionId:travelPlan.resumeActionId}:{type:'travel',destinationId:travelPlan.destinationId,mode:travelMode,stayBehind:travelPlan.stayBehind})))setTravelPlan(null);}}>{travelPlan?.resumeActionId?'继续原行程':'确认出发'}</Button>}><TravelQuote quote={travelPlan}/>{travelFeedback.error&&<p role="alert">{playerText(travelFeedback.error,state)}</p>}</Modal>
    <Modal open={Boolean(dungeon)&&!risk} title={dungeon?.name??'猎魂之地'} onClose={()=>{inspection.current++;setInspecting(false);setDungeon(null);}}><p>{playerText(dungeon?.summary,state)}</p>{inspecting&&<p role="status">正在查看风险与路程…</p>}<div className="choice-list">{dungeon?.difficultyIds.map((id:string)=>{const difficulty=dungeon.difficulties[id];return <button key={id} disabled={inspecting} onClick={()=>void inspect(id)}><b>{difficulty.name}</b><span>{difficulty.id==='outer'?'10级初次猎魂':'建议 '+difficulty.recommendedLevelMin+'–'+difficulty.recommendedLevelMax+' 级'} · {difficulty.routeLayers}层</span><small>每次探索的魂兽与路线均会变化</small></button>;})}</div></Modal>
    <Modal open={Boolean(risk)} title={`${risk?.dungeonName??''} · ${risk?.difficultyName??''}`} onClose={()=>setRisk(null)} actions={<><Button variant="ghost" onClick={()=>setRisk(null)}>重新选择</Button><Button disabled={view.busy||(risk?.travelRequired&&!risk?.travel?.affordable)} onClick={()=>void enter()}>{risk?.travelRequired?'前往入口并进入':'进入探索'}</Button></>}>
      <div className="risk-sheet"><CompanionPanel dungeonId={risk?.dungeonId} label="雇佣／管理同伴" onSelectPerson={(id,targetDungeon)=>{setRisk(null);setDungeon(null);onSelectPerson?.(id,targetDungeon);}}/><p>初期没有魂技时，可以先寻找合适的魂环或雇佣伙伴。学院学生还可请大师护航；探索时留意自己的伤势与补给。</p>{risk&&<ExpeditionRiskSummary risk={risk}/>}<ul>{risk?.reasons?.map((reason:string)=><li key={reason}>{playerText(risk?.difficultyId==='outer'&&/等级.*建议/.test(reason)?'初次猎魂可先熟悉沿途房间，不必挑战最终首领。':reason,state)}</li>)}</ul><p>组队后即可进入，无需提前确认收获分配。共同收获返程后自动结算。需要恢复时，可使用主界面快捷栏的“休整恢复”。吸收魂环前，请查看年限和承载要求。</p>{risk?.travelRequired&&<><h3>前往入口</h3>{risk.travel?<TravelQuote quote={risk.travel}/>:<p>暂不能前往，请先查看地图的通行条件。</p>}</>}</div>
    </Modal>
  </div>;
}
