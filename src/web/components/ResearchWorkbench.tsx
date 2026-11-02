import {playerDescription} from '../../runtime/player-copy';
import ChoiceAvailability from './ChoiceAvailability';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useServerQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';

import {materialName,playerText} from '../../runtime/player-text';
import {ActionSection,Button,Modal,ModalActions} from '../components';
import {useGame} from '../game-context';
import CandidateSelectionScene from './CandidateSelectionScene';
import {useResearchWorkspace} from '../use-research-workspace';
import MaterialFacts from './MaterialFacts';
import {abilityEffectName} from '../../runtime/ability-text';
import HostResearchEditor,{initialHostResearchDesign} from './HostResearchEditor';
import ResearchDesignAdvisor from './ResearchDesignAdvisor';

export default function ResearchWorkbench({workspace,onBlueprint}:{workspace:ReturnType<typeof useResearchWorkspace>;onBlueprint:(id:string)=>void}) {
  const {controller,state,view}=useGame();
  const {category,concept,selection,presetId,hostDesign,confirmedDesign}=workspace.draft;
  const ownedOnly=workspace.draft.ownedOnly!==false,goal=workspace.draft.goal??'purpose';
  const [valueMatch,setValueMatch]=useState<any>(null);
  useEffect(()=>setValueMatch(null),[view.sessionId,view.snapshot.revision,category]);

  const setConcept=(value:string)=>workspace.change(current=>({...current,concept:value}));
  const setSelection=(update:Record<string,number>|((current:Record<string,number>)=>Record<string,number>))=>{
    setValueMatch(null);
    workspace.change(current=>({...current,selection:typeof update==='function'?update(current.selection):update}));
  };
  const [dialog,setDialog]=useState<'materials'|'confirm'|null>(null);
  const [search,setSearch]=useState('');
  const [materialOrder,setMaterialOrder]=useState('value');
  const [materialPage,setMaterialPage]=useState(0);
  useEffect(()=>{setMaterialPage(0);},[search,materialOrder]);
  const [planningMode,setPlanning]=useState<'value'|'recipe'|null>(null);
  const planning=planningMode!==null;
  const [message,setMessage]=useState('');
  const [active,setActive]=useState('');
  const waitingForNew=useRef<Set<string>|null>(null);
  const planner=useRef<AbortController|null>(null);
  const submitting=useRef(false);
  const text=(value:unknown,fallback='材料')=>playerText(value,state,fallback);
  const indexQuery=useServerQuery<any>('inventory.index',{section:'materials'});
  const materialIndex=indexQuery.data?.materials??{};
  const materials=(Object.values(state.材料库?.永久 ?? {}) as any[]).map(stack=>{
    const facts=materialIndex[stack.fingerprint];
    if(!facts)return {...stack,displayName:materialName(stack,state),searchText:''};
    return {...stack,displayName:facts.name,searchText:facts.searchText};
  }).sort((a,b)=>materialOrder==='value'?b.unitValue-a.unitValue:materialOrder==='quantity'?b.quantity-a.quantity:a.displayName.localeCompare(b.displayName,'zh-CN'));
  const matchingMaterials=materials.filter(stack=>stack.searchText.includes(search.trim())),materialPages=Math.max(1,Math.ceil(matchingMaterials.length/30)),materialPageIndex=Math.min(materialPage,materialPages-1),visibleMaterials=matchingMaterials.slice(materialPageIndex*30,materialPageIndex*30+30);
  const materialPagination=(label:string)=>materialPages>1?<nav className="card-actions" aria-label={label}><Button variant="ghost" disabled={materialPageIndex===0} onClick={()=>{setMaterialPage(materialPageIndex-1);}}>上一页</Button><span>{materialPageIndex+1} / {materialPages}</span><Button variant="ghost" disabled={materialPageIndex+1>=materialPages} onClick={()=>{setMaterialPage(materialPageIndex+1);}}>下一页</Button></nav>:null;
  const selected=useMemo(()=>Object.entries(selection).filter(([,quantity])=>quantity>0).map(([fingerprint,quantity])=>({fingerprint,quantity})),[selection]);
  const presetsQuery=useServerQuery<any>('preset.list',{category});
  const presets=presetsQuery.data?.entries??[];
  const chosenPreset=presets.find((entry:any)=>entry.id===presetId);
  const knownBlueprint=(Object.values(state.研发?.蓝图??{}) as any[]).find(b=>b.ownerId===state.角色.主控单位ID&&b.mechanics?.presetId===presetId);
  const setPreset=(id:string)=>{setValueMatch(null);const blueprint=(Object.values(state.研发?.蓝图??{}) as any[]).find(b=>b.ownerId===state.角色.主控单位ID&&b.mechanics?.presetId===id);if(blueprint){onBlueprint(blueprint.id);return;}workspace.change(current=>({...current,presetId:id,hostDesign:undefined,confirmedDesign:undefined}));};
  const workConcept=confirmedDesign?.description??chosenPreset?.description??(goal==='value'?'按现有材料制作高价值'+category:concept);
  const quoteQuery=useServerQuery<any>(presetId?'preset.preview':'research.preview',{category,concept:workConcept,materials:selected,...(presetId?{presetId}:{}),...(hostDesign?{hostDesign}:{}),...(confirmedDesign?{confirmedDesign}:{})},{delay:250});
  const quote=quoteQuery.data??{pass:false,serviceReason:'',reason:quoteQuery.error??'正在核对材料与构想…'};
  const pending=Object.values(state.研发?.待处理 ?? {}).filter((entry:any)=>entry.actorId===state.角色.主控单位ID&&['awaiting-llm','candidates-ready'].includes(entry.status)) as any[];
  const pendingIds=pending.map(entry=>entry.id).join('|');
  useEffect(()=>{
    if(!waitingForNew.current)return;
    const next=pending.find(entry=>!waitingForNew.current!.has(entry.id));
    if(next){waitingForNew.current=null;setDialog(null);setActive(next.id);}
  },[pendingIds]);
  const cancelPlanning=()=>{planner.current?.abort();planner.current=null;setPlanning(null)};
  useEffect(()=>{cancelPlanning();return()=>{planner.current?.abort();planner.current=null}},[state,category,concept,presetId,hostDesign,confirmedDesign]);
  const recommend=async(mode:'value'|'recipe')=>{
    cancelPlanning();setMessage('');setValueMatch(null);setPlanning(mode);
    const task=new AbortController();planner.current=task;
    const request=mode==='value'?{category,concept:'按现有材料制作高价值'+category,goal:'value'}:
      {category,concept:workConcept,...(presetId?{presetId}:{}),...(hostDesign?{hostDesign}:{}),...(confirmedDesign?{confirmedDesign}:{})};
    try{
      const result=await controller.query('research.recommend',request,task.signal);
      if(task.signal.aborted||planner.current!==task)return;
      if(result?.found){
        const selection=Object.fromEntries(result.materials.map((entry:any)=>[entry.fingerprint,entry.quantity]));
        if(mode==='value'){
          setValueMatch(result);
          workspace.change(current=>({...current,presetId:'',hostDesign:undefined,confirmedDesign:undefined,goal:'value',selection}));
          return;
        }
        setSelection(selection);
      }
      setMessage(text(result?.message,'暂未找到合适的推荐组合，可继续手动选择材料'));
    }catch(error){if(planner.current===task&&!task.signal.aborted)setMessage(text((error as Error).message,'暂时无法推荐配料，可以继续手动选择材料'));}
    finally{if(planner.current===task)cancelPlanning();}
  };
  const begin=async()=>{
    if(submitting.current||!quote.pass||quote.serviceReason)return;
    submitting.current=true;
    waitingForNew.current=new Set(pending.map(entry=>entry.id));
    try {await workspace.flush();const pendingId=await controller.beginResearch({category,concept:workConcept,materials:selected,...(presetId?{presetId}:{}),...(hostDesign?{hostDesign}:{}),...(confirmedDesign?{confirmedDesign}:{}),confirmed:true,expectedMechanicsHash:quote.mechanicsHash});if(pendingId){const current=(controller.getView().snapshot.state as any).研发.待处理[pendingId];if(current?.status==='completed'){setActive('');setMessage('图纸已定稿，一件样品已收入行囊。');}else{setActive(pendingId);setMessage('');}}setDialog(null)}
    catch {} finally {submitting.current=false;waitingForNew.current=null;workspace.refresh()}
  };
  const planningStatus=<p role="status">正在比较用料和成品估值… <Button variant="ghost" onClick={cancelPlanning}>停止匹配</Button></p>;
  const canBegin=Boolean(!knownBlueprint&&quote.pass&&!quote.serviceReason&&workConcept.trim().length>=4&&!view.busy&&!planning);
  const valueProgress=selected.length>0&&Number.isFinite(quote.minimumBudget)?<p className="research-value-progress">已选工艺价值 {quote.totalMaterialValue} · 制成作品至少需要 {quote.minimumBudget}{quote.budgetDeficit>0?`，还差 ${quote.budgetDeficit}`:'，用料价值充足'}。</p>:null;
  const possibilities=quote.plannedEffects?.length>0?<p className="research-possibilities">本次试制可形成：{quote.plannedEffects.map((effect:any)=>effect.id==='passive.equipment_stat'?effect.name:abilityEffectName(effect.id,state)).join('、')}。不同作品的搭配与强度各有差别。</p>:null;
  return <div className="research-workbench workshop-flow">
    <QueryStatus query={indexQuery}/>
    <div className="workshop-flow__columns"><section className="workshop-design-panel">
      <ResearchDesignAdvisor key={category} draft={workspace.draft} materials={selected} ownedOnly={ownedOnly} goal={goal} onOwnedOnly={ownedOnly=>workspace.change(current=>({...current,ownedOnly}))} onGoal={goal=>{setValueMatch(null);workspace.change(current=>({...current,goal}));}} flush={workspace.flush} onAdopt={(design,recommended)=>{setValueMatch(null);workspace.change(current=>({...current,category:design.category,presetId:'',hostDesign:undefined,confirmedDesign:design,...(recommended?{selection:Object.fromEntries(recommended.map((entry:any)=>[entry.fingerprint,entry.quantity]))}:{})}));}}/>
      <section className="workshop-value-match" aria-label="按现有材料匹配"><h3>也可以按材料直接匹配</h3><p>比较本品类材料组合对应的正式成品估值，选择本次验证候选中最高的方案。结果包含用途及用料，不消耗材料。</p><Button variant="secondary" disabled={!materials.length||planning||view.busy} onClick={()=>void recommend('value')}>匹配高价值方案</Button>{planningMode==='value'&&planningStatus}{valueMatch&&<p role="status">最高候选成品估值 {valueMatch.productValue} 金币 · 用料工艺价值 {valueMatch.totalMaterialValue} · 已比较 {valueMatch.compared??1} 组。{valueMatch.searchScope}。</p>}</section>
      {confirmedDesign&&<section className="workshop-confirmed" aria-label="已采用方案"><h3>已采用 · {confirmedDesign.name}</h3><p>{playerDescription(confirmedDesign.description)}</p><p className="muted">{playerDescription(confirmedDesign.appearance)}</p><Button variant="ghost" disabled={view.busy} onClick={()=>workspace.change(current=>({...current,confirmedDesign:undefined}))}>取消采用，继续修改构想</Button></section>}
      {chosenPreset&&<section aria-label="已选配方"><h3>{chosenPreset.name}</h3><p>{playerDescription(chosenPreset.description)}</p></section>}
      {knownBlueprint&&<p>这份图纸已经掌握。<Button variant="secondary" onClick={()=>onBlueprint(knownBlueprint.id)}>前往按图制作</Button></p>}
      <ActionSection title={<>高级自定义与已有配方</>} className="workshop-advanced"><p>手动选择配方、组合器具能力或自由试制。普通制作可直接使用上方方案。</p><label>选用登记配方<select aria-label="选择精品配方" value={presetId} disabled={view.busy||planning||presetsQuery.loading} onChange={event=>setPreset(event.target.value)}><option value="">不指定配方</option>{presets.map((entry:any)=><option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><QueryStatus query={presetsQuery}/>
        {!presetId&&!confirmedDesign&&<label>自行试制的用途<textarea rows={2} value={concept} onChange={event=>setConcept(event.target.value)} data-testid="research-concept"/></label>}
        {['魂导器','拘束器'].includes(category)&&<label className="workshop-option"><input type="checkbox" checked={Boolean(hostDesign)} disabled={view.busy||Boolean(presetId||confirmedDesign)} onChange={event=>workspace.change(current=>({...current,presetId:'',hostDesign:event.target.checked?initialHostResearchDesign(category):undefined}))}/>手动组合器具能力</label>}
        {hostDesign&&<HostResearchEditor value={hostDesign} category={category} disabled={view.busy||planning} onChange={hostDesign=>workspace.change(current=>({...current,hostDesign}))}/>}
      </ActionSection>
    </section><aside className="workshop-material-panel" aria-label="方案用料"><h3>核对研发用料</h3><p>当前可用 {materials.length} 种材料 · 已选 {selected.reduce((sum,item)=>sum+item.quantity,0)} / 10 份</p>
      {!materials.length&&<p role="status">尚无已带回的可用材料。{Object.keys(state.远征?.当前?.tempMaterials??{}).length?'本次探索收获仍在远征暂存，安全撤离后才能用于工坊。':'先安全带回猎获材料，或在商店购买材料。'}</p>}
      {selected.length>0?<ul className="workshop-ingredient-list">{selected.map(entry=>{const stack=state.材料库?.永久?.[entry.fingerprint];return <li key={entry.fingerprint}><strong>{stack?materialName(stack,state):'该材料已不在行囊'}</strong><span>需要 {entry.quantity} · 现有 {stack?.quantity??0} · 制作后剩余 {Math.max(0,(stack?.quantity??0)-entry.quantity)}</span>{stack&&<details><summary>查看材料</summary><MaterialFacts material={stack}/></details>}</li>;})}</ul>:<p>采用方案后在这里查看所需材料。</p>}
      <div className="field-actions"><Button variant="secondary" disabled={!materials.length||planning||view.busy} onClick={()=>void recommend('recipe')}>为当前方案配料</Button><Button variant="ghost" disabled={!materials.length||view.busy||planning} onClick={()=>setDialog('materials')}>手动调整用料</Button></div>
      <QueryStatus query={quoteQuery} label="正在核对实际制作条件…"/>{valueProgress}
      {quote.plannedEffects?.length>0&&<section><h4>当前方案实际效果</h4>{possibilities}</section>}
      {!quote.pass&&selected.length>0&&<p role="status">{text(quote.reason,'请补充或更换材料')}</p>}
      {quote.serviceReason&&<p role="status">{text(quote.serviceReason,'请到可用工坊制作')}</p>}
      {quote.pass&&<p role="status">当前方案可制作 · 本次可选 {quote.choiceRule.finalCount} 件不同作品，最终保留一件及其图纸。</p>}
      {quote.pass&&<p>本次金币手续费 {quote.goldCost??0} 金币 · 候选成品最高估值 {quote.maximumProductValue} 金币</p>}
      {quote.designQuote&&<p>成品估值 {quote.designQuote.valueGold} 金币 · 用料价值要求 {quote.designQuote.materialValue}。实际回收价格须在商店询价。</p>}
      <p className="muted">确认试制时按清单扣除材料。</p>
    </aside></div>
    <ModalActions disabled={indexQuery.loading||quoteQuery.loading||Boolean(indexQuery.error)||Boolean(quoteQuery.error)}><span role="status">{workspace.saveState}</span><Button disabled={!canBegin} onClick={()=>setDialog('confirm')} data-testid="begin-research">核对清单并研发图纸</Button></ModalActions>
    {planningMode==='recipe'&&planningStatus}{message&&<p role="status">{message}</p>}
    <Modal open={dialog==='confirm'} title="确认研发图纸" dismissOnBackdrop={false} onClose={()=>setDialog(null)} actions={<><Button variant="ghost" onClick={()=>setDialog(null)}>返回修改</Button><Button disabled={!canBegin} onClick={()=>void begin()}>确认投入并研发图纸</Button></>}><p>{confirmedDesign?.name??chosenPreset?.name??concept}</p><ul>{selected.map(entry=><li key={entry.fingerprint}>{materialName(state.材料库.永久[entry.fingerprint],state)} × {entry.quantity}</li>)}</ul><p>确认后将消耗以上材料，保留一件作品及对应图纸。</p></Modal>
    {pending.map(entry=><section className="choice-resume" key={entry.id}><span aria-hidden="true">◇</span><div><h3>{entry.category} · 待选作品</h3><p>配料已投入，试制成果已保留</p></div><Button data-testid={`resume-research-${entry.id}`} onClick={()=>setActive(entry.id)}>继续选择作品</Button></section>)}
    {active&&<ResearchChoiceScene key={active} pendingId={active} onClose={()=>setActive('')}/>}
    <Modal dismissOnBackdrop={false} open={dialog==='materials'} title="挑选试制材料" onClose={()=>setDialog(null)} actions={<Button onClick={()=>setDialog(null)}>保留选材</Button>}><div className="form-grid"><label>寻找材料<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="按名称、属性、用途或来源寻找…"/></label><label>材料排序<select value={materialOrder} onChange={event=>setMaterialOrder(event.target.value)}><option value="value">工艺价值从高到低</option><option value="quantity">持有数量从多到少</option><option value="name">材料名称</option></select></label></div><p className="muted">已选 {selected.reduce((sum,item)=>sum+item.quantity,0)} / 10 份。可搭配不同性质的材料，补足作品需要的用途。</p><div className="research-material-picker">{visibleMaterials.map(stack=><label key={stack.fingerprint}><span><b>{text(stack.displayName)}</b><MaterialFacts material={stack} summary={materialIndex[stack.fingerprint]} compact/></span><input type="number" min="0" max={Math.min(10,stack.quantity)} step="1" value={selection[stack.fingerprint]??0} aria-label={`${text(stack.displayName)}投入数量`} onChange={event=>setSelection(previous=>({...previous,[stack.fingerprint]:Number(event.target.value)}))}/></label>)}</div>{materialPagination('选材翻页')}{!quote.pass&&selected.length>0&&<p role="status">{text(quote.reason,'请检查选材数量')}</p>}</Modal>

  </div>;
}

function MaterialInspectionDetails({material}:{material:any}){
 const [open,setOpen]=useState(false);
 return <details className="atelier-material-facts" onToggle={event=>setOpen(event.currentTarget.open)}><summary>查看来源与材料特性</summary>{open&&<MaterialFacts material={material}/>}</details>;
}

function ResearchChoiceScene({pendingId,onClose}:{pendingId:string;onClose:()=>void}){
  const {state,view,controller}=useGame();
  const saved=useRef<any>(null);
  const record=state.研发?.待处理?.[pendingId],current=record?.actorId===state.角色.主控单位ID?record:null;
  const query=useServerQuery<any>('research.choices',{pendingId},{enabled:Boolean(current)&&['awaiting-llm','candidates-ready'].includes(current.status)});
  if(query.data)saved.current=query.data;
  if(current?.status==='completed')return <Modal open dismissOnBackdrop={false} title="作品已经完成" onClose={onClose} actions={<Button onClick={onClose}>返回工坊</Button>}><p>图纸已定稿，一件样品已收入行囊。</p><a className="button button--secondary" href="#/inventory?tab=blueprints" onClick={onClose}>前往按图制作</a></Modal>;
  const data=saved.current;
  if(!data)return <QueryStatus query={query}/>;
  const {pending,access}=data;
  const naming=pending.status==='awaiting-llm'||pending.pendingNamingIds?.length>0;
  const options=(pending.candidates??[]).filter((entry:any)=>entry.pass).map((entry:any)=>({id:String(entry.index),revision:pending.mechanicCandidates[entry.index].candidateId,title:playerText(entry.normalized.name,state,'试制作品'),description:playerText(entry.normalized.description,state,''),skills:[entry.normalized],grade:data.options.find((option:any)=>option.index===entry.index)?.grade,choiceRole:entry.normalized.choiceRole,fixedForm:entry.normalized.fixedForm,kind:pending.category,rerollReason:data.options.find((option:any)=>option.index===entry.index)?.rerollReason??'',testId:`research-choice-${entry.index}`}));
  return <CandidateSelectionScene title="选择你的作品" subtitle={pending.category==='魂导器'?'同批材料 · 不同类别与用途':`${pending.category} · ${playerText(pending.concept,state,'试制成果')}`} options={options} closeLabel="返回工坊" onClose={onClose} confirmLabel={options.length===1?'制作这件作品':'保留作品与图纸'} confirmTestId="confirm-research-choice" successLink={{href:'#/inventory?tab=blueprints',label:'前往按图制作'}}
    namingStatus={pending.naming} requestedCount={pending.choiceRule.requestedCount} explainAvailability={()=>controller.query('research.explain',{pendingId})}
    blockedReason={query.error??(query.loading?'正在核对作品…':access.reason?playerText(access.reason,state,'请返回工坊继续选择'):undefined)}
    onName={naming&&controller.hasNamingModel('research-narrative')&&!pending.mechanicCandidates.every((candidate:any)=>Boolean(candidate.presetId))?()=>controller.resolveResearchNaming(pendingId,false,true):undefined}
    onLocalName={naming?()=>controller.resolveResearchNaming(pendingId,true):undefined}
    emptyMessage="材料已经投入。可以等待取名，也可以采用工坊命名，继续挑选作品。"
    rerollUsed={pending.reroll?.used} onReroll={pending.category==='魂导器'&&data.canReroll?option=>controller.rerollResearchCandidate({pendingId,candidateIndex:Number(option.id)}):undefined}
    onConfirm={async option=>{await controller.dispatch('research.choose',{pendingId,candidateIndex:Number(option.id)});}}/>;
}
