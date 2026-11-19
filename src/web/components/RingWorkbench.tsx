import RingLore from './RingLore';
import {useRef,useState} from 'react';
import {useServerQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
import {ringDisplay} from '../../shared/ring-display';
import {playerText} from '../../runtime/player-text';
import {useGame} from '../game-context';
import {Button,Modal,SoulRingHalo} from '../components';
import CandidateSelectionScene from './CandidateSelectionScene';
import RingExchangeEditor from './RingExchangeEditor';
import RingDesignAdvisor from './RingDesignAdvisor';
import AbilityDetails from './AbilityDetails';
import PartyRingAllocation from './PartyRingAllocation';

export function RingInspection({beastUnitId,onClose}:{beastUnitId:string;onClose:()=>void}) {
  const {state,controller,view}=useGame();
  const playerId=state.角色.主控单位ID;
  const souls=(state.成长.列表[playerId]?.武魂ID列表??[]).map((id:string)=>state.武魂.列表[id]).filter(Boolean);
  const [soulId,setSoulId]=useState(state.成长.列表[playerId]?.激活武魂ID??souls[0]?.id??'');
  const [working,setWorking]=useState(false),[message,setMessage]=useState('');
  const [requestedSkills,setRequestedSkills]=useState<any[]|undefined>();
  const [designValid,setDesignValid]=useState(true);
  const [advised,setAdvised]=useState<any>(null),[discuss,setDiscuss]=useState(false);
  const guard=useRef(false);
  const activePending=useRef('');
  const query=useServerQuery<any>('ring.beast',{beastUnitId,martialSoulId:soulId});
  const quote=query.data??{pass:false,reasons:[]};
  if(working&&quote.pendingId)activePending.current=quote.pendingId;
  const run=async()=>{
    if(guard.current)return;guard.current=true;setWorking(true);setMessage('');
    try {if(advised){const review=await controller.query('ring.design-review',{target:{kind:'beast',beastUnitId,martialSoulId:soulId},proposal:advised.proposal});if(!review.pass)throw Error(review.reasons.join('；'));}activePending.current=await controller.prepareRingFromBeast({beastUnitId,martialSoulId:soulId,...(requestedSkills?{requestedSkills}:{}),...(advised?.evolutionTarget?{evolutionTarget:advised.evolutionTarget}:{})});}
    catch(error) {setMessage(playerText((error as Error).message,state));} finally {guard.current=false;setWorking(false);}
  };
  if(activePending.current)return <RingChoiceScene pendingId={activePending.current} onClose={onClose}/>;
  return <Modal open title="聆听魂环的回响" onClose={onClose} actions={<><Button variant="ghost" onClick={onClose}>暂且保留</Button><Button disabled={!quote.pass||view.busy||working||!designValid} onClick={()=>void run()} data-testid="prepare-ring-from-beast">{quote.pendingId?'继续选择魂技':working?'魂环正在共鸣':'凝聚并领悟魂技'}</Button></>}>
    <PartyRingAllocation beastUnitId={beastUnitId}/><QueryStatus query={query}/>{message&&<p role="alert" className="danger-text">{message}</p>}<div className="ring-inspection">
      <SoulRingHalo years={quote.years}/>
      <div><span className="eyebrow">魂兽的遗赠</span><h3>{playerText(quote.beastName,state,'魂兽魂环')}</h3><p>{quote.ageTier??'查看可用条件'} · {quote.condensed?'魂环已凝聚':'等待凝聚'}</p>
        <label>归属武魂<select value={soulId} onChange={event=>{setSoulId(event.target.value);setRequestedSkills(undefined);setDesignValid(true);setAdvised(null);setDiscuss(false);}}>{souls.map((soul:any)=><option key={soul.id} value={soul.id}>{soul.名称} · 已有{soul.魂环ID列表.length}环</option>)}</select></label>
        {quote.pendingMartialSoulId&&quote.pendingMartialSoulId!==soulId&&<Button variant="secondary" onClick={()=>{setSoulId(quote.pendingMartialSoulId);setRequestedSkills(undefined);}}>返回已保留的武魂方案</Button>}
      </div>
    </div>
    <RingLore lore={quote.lore}/>{quote.eligibility&&<dl className="ring-qualification"><div><dt>这次成长</dt><dd>第{quote.ordinal}魂环 · {quote.eligibility.mode}</dd></div><div><dt>当前经验</dt><dd>{quote.eligibility.experience} / {quote.eligibility.requirement}</dd></div><div><dt>魂环压力 / 承载</dt><dd>{quote.gates.承载.压力} / {quote.gates.承载.上限}</dd></div><div><dt>武魂契合</dt><dd>{Math.round(Number(quote.compatibility.ratio)*100)}%</dd></div></dl>}
    {quote.reasons.map((reason:string)=><p className="danger-text" key={reason}>{playerText(reason,state)}</p>)}
    {quote.pass&&<p>最多可领悟 {quote.choiceCount} 套魂技方案，本次可选数量见候选列表。方案会保存，选定后才吸收魂环。</p>}
    {!quote.pendingId&&<><Button variant="secondary" disabled={!quote.pass||view.busy||working} onClick={()=>setDiscuss(v=>!v)}>{discuss?'收起主持人讨论':'和主持人讨论魂技方向'}</Button>{discuss&&<RingDesignAdvisor key={'advisor:'+soulId} target={{kind:'beast',beastUnitId,martialSoulId:soulId}} disabled={working||view.busy} onAdopt={plan=>{setAdvised(plan);setRequestedSkills(plan.requestedSkills);setDesignValid(true);setDiscuss(false);}}/>}
    {advised?<section className="ring-adopted-design"><h3>已选：{advised.name}</h3><p>来源与年限不变，确认领悟后生成这套魂技。</p>{advised.evolutionPreview&&<p>同时将武魂变化为{advised.evolutionPreview.name}：{advised.evolutionPreview.form}。所需成长投入已从本次魂环中支付。</p>}{advised.skills.map((skill:any,i:number)=><AbilityDetails key={i} skill={skill} showAvailability={false}/>)}<Button variant="secondary" onClick={()=>{setAdvised(null);setRequestedSkills(undefined);setDesignValid(true);setAdvised(null);setDiscuss(false);}}>取消此设计，改用自动领悟</Button></section>:<RingExchangeEditor key={'exchange:'+soulId} source={{beastUnitId,martialSoulId:soulId}} onChange={setRequestedSkills} onValidity={setDesignValid}/>}</>}
    {quote.pendingId&&<p>这枚魂环已有保留方案，请继续选择原方案。</p>}
    <p className="muted">这枚现场魂环无法放入行囊。离开当前房间前，请完成吸收；继续探索时尚未吸收的魂环将消散。</p>
  </Modal>;
}

export function RingChoiceScene({pendingId,onClose}:{pendingId:string;onClose:()=>void}) {
  const {state,controller,view}=useGame();
  const saved=useRef<any>(null);
  const current=state.魂环?.待选择?.[pendingId];
  // Keep the completed choice visible during the receipt-to-success transition.
  const query=useServerQuery<any>('ring.choices',{pendingId},{enabled:Boolean(current)});
  if(current&&query.data)saved.current=query.data;
  const pending=saved.current;
  if(!pending)return <QueryStatus query={query}/>;
  const tier=ringDisplay(pending.years).名称;
  const sourceItem=state.物品.实例[pending.sourceSettlement?.itemIds?.[0]];
  const isItem=pending.sourceSettlement?.kind==='ring-item';
  return <CandidateSelectionScene title="选择你的魂技" subtitle={`${tier}魂环 · ${state.武魂.列表[pending.martialSoulId]?.名称??'武魂共鸣'}`} tier={tier} onClose={onClose} closeLabel="暂不吸收" successCloseLabel={isItem?'返回行囊':'返回收获'} confirmLabel="吸收这套魂技" confirmTestId="confirm-ring-absorption" successLink={{href:'#/character?tab=武魂与技能',label:'查看武魂与技能'}}
    requestedCount={pending.choiceRule.finalCount} explainAvailability={()=>controller.query('ring.explain',{pendingId})}
    ringYears={pending.years}
    options={pending.candidates.map((candidate:any,i:number)=>({id:candidate.id,revision:JSON.stringify(candidate.skills.map((skill:any)=>[skill.effectGraph,skill.soulPowerCost,skill.cooldownTurns])),title:playerText(candidate.skills.length===1?((globalThis as any).SoulNineCourts?.ofSkill(candidate.skills[0])?.name??candidate.skills[0].name):candidate.title,state,'魂技组合'),description:playerText((globalThis as any).SoulNineCourts?.ofSkill(candidate.skills[0])?.description??candidate.description,state,''),skills:candidate.skills.map((skill:any)=>({...skill,sourceMartialSoulId:pending.martialSoulId})),choiceRole:candidate.choiceRole,kind:'魂技',canReplacePreset:Boolean(candidate.presetId&&!pending.freeReplacements?.[candidate.slotId]),growthSummary:candidate.expressionGrowth?`能力成长 ${candidate.expressionGrowth.cost} + 魂技 ${candidate.budget.spent} / ${candidate.budget.available}`:undefined,testId:`choose-ring-${i}`}))}
    sourceDetails={<>{pending.presetFailures?.length>0&&<div><h3>传承条件</h3>{pending.presetFailures.map((reason:string)=><p key={reason}>{playerText(reason,state,'此传承暂不符合当前魂环条件')}</p>)}</div>}<SoulRingHalo years={pending.years}/><h3>{pending.lore?.name??sourceItem?.name??`${tier}魂环`}</h3><RingLore lore={pending.lore}/><p>{isItem?'暂不吸收时，魂环物品与当前方案保留在行囊。':'这枚现场魂环无法放入行囊。离开当前房间时，未吸收的魂环及方案将消散。'}</p></>}
    onName={view.modelEnabled?()=>controller.nameRingSkillChoices(pendingId,true):undefined}
    blockedReason={!current?'这枚魂环已处理':query.error??(query.loading?'正在核对魂环…':undefined)} rerollUsed={pending.reroll?.used}
    onReplacePreset={option=>controller.replacePresetRingSkillChoice({pendingId,candidateId:option.id})}
    onReroll={pending.canReroll?option=>controller.rerollRingSkillChoice({pendingId,candidateId:option.id}):undefined}
    onConfirm={async option=>{await controller.dispatch('ring.confirm-choice',{pendingId,candidateId:option.id});}}/>;
}

export function RingChoices(){
  const {state}=useGame();
  const [active,setActive]=useState('');
  const pendingList=(Object.values(state.魂环?.待选择??{}) as any[]).filter(item=>item.playerId===state.角色.主控单位ID&&item.status==='pending'&&item.sourceSettlement?.kind!=='ring-item');
  return <>{pendingList.map(item=><section className="choice-resume" key={item.id}><span aria-hidden="true">◈</span><div><h3>{ringDisplay(item.years).名称}魂环 · 待领悟</h3><p>{item.candidates.length} 套魂技方案等待你的选择</p></div><Button onClick={()=>setActive(item.id)}>继续选择魂技</Button></section>)}{active&&<RingChoiceScene key={active} pendingId={active} onClose={()=>setActive('')}/>}</>;
}
