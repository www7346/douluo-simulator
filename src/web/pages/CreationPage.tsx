import {personAgePresentation} from '../../shared/person-age-presentation';
import OpeningActions from '../OpeningActions';
import OpeningWorkshop from '../OpeningWorkshop';
import OpeningActorCards from '../OpeningActorCards';
import {BackgroundChooser,CustomContacts,SubjectFigureChooser,HistoricalRings,BackgroundSummary} from '../BackgroundCreation';
import CreationItems from '../CreationItems';
import CreationQuickStart from '../CreationQuickStart';
import DiagnosticExportButton from '../components/DiagnosticExportButton';
import {CreationSituationSummary} from '../CreationSituations';
import {assetUrl} from '../asset-delivery';
import RangeInput from '../components/RangeInput';
import AppearanceEditor from '../components/AppearanceEditor';
import {useEffect,useRef,useState} from 'react';
import {CreationCatalog,useCreationCatalog,useCreationPreview} from '../creation-context';
import {useGameQuery} from '../use-game-query';
import {creationRequest} from '../creation-request';
import {creationReason,applyOpeningRingConfig,type CreationWorkspace} from '../../shared/creation-draft';
import {Button,Panel,Modal,LoadingPanel} from '../components';

import {useGame} from '../game-context';
import {useCreationWorkspace} from '../use-creation-workspace';
import {CreationTalents} from '../CreationTalents';
import {CreationSoulWorkbench} from '../CreationSoulWorkbench';
import {CreationCharacterAdvisor} from '../CreationCharacterAdvisor';
import {creationFigure} from '../character-figures';
import type {PageId} from '../App';
import GradeBadge from '../components/GradeBadge';
import {downloadPlainJson} from '../file-transfer';


const STEPS=['选择背景','武魂回声','能力配置','启程之前'];

export default function CreationPage({onNavigate}:{onNavigate:(page:PageId)=>void}) {
  const {controller,view}=useGame();
  const bootstrap=useGameQuery<any>('creation-bootstrap',signal=>creationRequest(controller,'creation.bootstrap',{workspace:view.creationWorkspace},signal));
  if(bootstrap.error)return <Panel title="觉醒资料暂未读取"><p role="alert">{bootstrap.error}</p><Button onClick={bootstrap.retry}>重试读取</Button><Button onClick={()=>onNavigate('saves')}>返回存档</Button></Panel>;
  if(!bootstrap.data)return <LoadingPanel label="正在展开觉醒卷册…"/>;
  return <CreationCatalog value={bootstrap.data.catalog}><CreationEditor key={`${view.sessionId}:${view.soulAdviceAppliedId??''}`} initial={view.soulAdviceAppliedId&&view.creationWorkspace?view.creationWorkspace as unknown as CreationWorkspace:bootstrap.data.workspace} onNavigate={onNavigate}/></CreationCatalog>;
}
function CreationEditor({initial,onNavigate}:{initial:CreationWorkspace;onNavigate:(page:PageId)=>void}) {
  const {controller,state,view}=useGame();
  const catalog=useCreationCatalog();
  const workbench=useCreationWorkspace(initial),{workspace,change,saveState,flush}=workbench;
  const [working,setWorking]=useState(false),[consulting,setConsulting]=useState(false);
  const [advisorOpen,setAdvisorOpen]=useState(false),[workshopOpen,setWorkshopOpen]=useState(false);
  const [error,setError]=useState(''),[appearanceOpen,setAppearanceOpen]=useState(false);
  const submission=useRef(false);
  const draft=workspace.config,previewQuery=useCreationPreview(draft),preview=previewQuery.data,ledger=preview?.ledger;
  const defaultFigure=creationFigure(draft)!;
  const step=workspace.step,locked=working||consulting;
  useEffect(()=>{window.scrollTo({top:0});document.querySelector('.page-stage')?.scrollTo({top:0});document.querySelector('.awakening__body')?.scrollTo({top:0});},[workspace.creationFlow,step]);
  const isReadonly=false;
  const identity=preview?.identity,policy=preview?.background?{...preview.background,readonly:isReadonly}:undefined;
  const update=(patch:Record<string,any>)=>change(value=>{const config={...value.config,...patch,...(patch.attributes?{background:{...value.config.background,ringChoices:[]}}:{})};return patch.martialSoulDrafts?applyOpeningRingConfig(value,config):{...value,config};});
  const submit=async()=>{
    if(submission.current)return;
    const sessionId=view.sessionId;submission.current=true;setWorking(true);setError('');
    try {
      await flush();
      if(controller.getView().sessionId!==sessionId)return;
      const latest=workbench.current().config;
      const reviewed=await creationRequest(controller,'creation.preview',{config:latest});
      if(!reviewed.pass)throw new Error(reviewed.errors.join('；'));
      await controller.createPlayer(latest);
      if(controller.getView().sessionId===sessionId)onNavigate('adventure');
    }catch(problem){setError(creationReason((problem as Error).message));}
    finally {submission.current=false;setWorking(false);}
  };
  const importCharacter=async(file:File)=>{
    if(submission.current)return;
    const sessionId=view.sessionId;submission.current=true;setWorking(true);
    try {
      await flush();
      const serialized=await file.text(),imported=await controller.importCharacterDraft(serialized);
      const importedWorkspace=await creationRequest(controller,'creation.import',{config:imported});
      if(controller.getView().sessionId!==sessionId)return;
      await controller.applyCharacterDraftImport(serialized,importedWorkspace);
      if(controller.getView().sessionId!==sessionId)return;
      change(importedWorkspace);setError('');
      controller.notify('角色方案已导入，请查看启程前的完整预览','success');
    }catch(problem){controller.notify(creationReason((problem as Error).message),'danger');}
    finally{submission.current=false;setWorking(false);}
  };
  const exportConfig=async(soulIndex?:number)=>{
    try {
      if(soulIndex===undefined){await flush();await downloadPlainJson(await controller.exportCharacterDraft(workbench.current().config),`斗罗大陆-${draft.name||'角色方案'}.json`);}
      else {const soul=draft.martialSoulDrafts[soulIndex];await downloadPlainJson(await controller.exportMartialSoul(soul),`武魂-${soul.name||soulIndex+1}.json`);}
    }catch(problem){controller.notify(creationReason((problem as Error).message),'danger');}
  };

  if(state?.角色?.已建立)return <Panel title="觉醒已经完成"><p>这位魂师的旅程将保留，你可以另建一位魂师。</p><Button onClick={()=>void controller.createProfile().then(()=>onNavigate('creation')).catch(()=>undefined)}>新建角色档案</Button><Button variant="ghost" onClick={()=>onNavigate('character')}>查看角色</Button></Panel>;

  if(!preview)return previewQuery.error?<Panel title="造化点暂未核对"><p role="alert">{previewQuery.error}</p><Button onClick={previewQuery.retry}>重试核对</Button><Button variant="ghost" onClick={()=>void controller.reconnect()}>重新连接</Button></Panel>:<LoadingPanel label="服务器正在核对造化点…"/>;
  if(workspace.creationFlow==='quick')return <><Modal open={workshopOpen} title="创意工坊" onClose={()=>setWorkshopOpen(false)}><OpeningWorkshop {...workbench} disabled={locked} onWorking={setConsulting} onSettings={()=>onNavigate('system')}/></Modal><CreationQuickStart workbench={workbench} preview={preview} locked={locked} validating={previewQuery.loading} previewError={previewQuery.error??''} onWorking={setConsulting} onCustomize={step=>change(value=>({...value,creationFlow:'detailed',step}))} onSubmit={()=>void submit()} error={error||previewQuery.error||''} working={working} onSettings={()=>onNavigate('system')} onOpenWorkshop={()=>setWorkshopOpen(true)}/></>;
  return <div className="creation-detailed"><OpeningActions workbench={workbench} preview={preview} disabled={locked} onCustomize={()=>{if(draft.background.id==='sealed-titled')document.querySelector<HTMLButtonElement>(`[data-testid="opening-${draft.background.perspective}-customize"]`)?.click();else change(v=>({...v,step:1}));}} onEditSouls={()=>{if(draft.background.id==='sealed-titled')document.querySelector<HTMLButtonElement>(`[data-testid="opening-${draft.background.perspective}-souls"]`)?.click();else change(v=>({...v,step:2}));}} onOpenWorkshop={()=>setWorkshopOpen(true)}/><OpeningActorCards compact workbench={workbench} disabled={locked} onWorking={setConsulting} onSettings={()=>onNavigate('system')}/><Modal open={workshopOpen} title="创意工坊" onClose={()=>setWorkshopOpen(false)}><OpeningWorkshop {...workbench} disabled={locked} onWorking={setConsulting} onSettings={()=>onNavigate('system')}/></Modal><Button variant="secondary" disabled={locked} data-testid="creation-advanced-close" onClick={()=>change(value=>({...value,creationFlow:'quick'}))}>返回快速开始</Button><div className={`awakening awakening--step-${step}`} >
    <Modal open={advisorOpen&&!isReadonly} title="与角色顾问讨论" onClose={()=>setAdvisorOpen(false)}><CreationCharacterAdvisor workspace={workspace} change={change} current={workbench.current} flush={flush} disabled={locked||isReadonly} onWorking={setConsulting}/></Modal>
    <Modal open={appearanceOpen} title="头像与立绘" className="appearance-modal" onClose={()=>setAppearanceOpen(false)}><AppearanceEditor defaultFigure={defaultFigure}/></Modal>
    <header className="awakening__heading"><div><span className="eyebrow">AWAKENING · YOUR SOUL, YOUR STORY</span><h1>角色创建</h1></div><p>在旅途开始之前，写下你是谁，以及你想拥有的力量。</p></header>
    <nav className="awakening__steps" aria-label="觉醒步骤">{STEPS.map((label,index)=><button key={label} aria-current={step===index+1?'step':undefined} disabled={locked} onClick={()=>change(value=>({...value,step:index+1}))}><span>{['壹','贰','叁','肆'][index]}</span><div><small>0{index+1}</small><strong>{label}</strong></div></button>)}</nav>
    <aside className="awakening__sidebar">{step===3&&<div className="awakening-guide" aria-hidden="true"><img src={assetUrl("/art/fantasy-v4/guide.png")} alt=""/></div>}
      <section className="awakening-budget" aria-label="造化点分配"><span className="eyebrow">THE GIFT OF FATE</span><h2>造化点</h2><div className={ledger.remaining<0?'awakening-budget__number is-over':'awakening-budget__number'}><strong>{ledger.remaining}</strong><span>/ {ledger.total}<br/>可用</span></div><dl>{[['基础素质',ledger.costs.attributes],['出身行囊',ledger.costs.identity],['武魂数量',ledger.costs.extraSoulSlots],['武魂能力',ledger.costs.martialSouls],['天赋',ledger.costs.talents],['机缘',ledger.costs.opportunities],['属性返还',`+${ledger.attributeRefund}`],['处境补偿',`+${ledger.situationBonus??0}`]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>{ledger.overBudget?`还需减少 ${ledger.overBudget} 点消耗。你可以调整六维、武魂、天赋或机缘。`:'每一种出身与力量都有取舍。所有选择会在觉醒前完整呈现。'}</p></section>
      <div className="awakening-save"><span role="status">{saveState}</span>{saveState.startsWith('尚未保存')&&<Button variant="ghost" onClick={()=>void workbench.retry().catch(()=>undefined)}>重试保存</Button>}<small>草稿与讨论自动保存在当前世界，下次可从“读取存档”进入。</small></div>
    </aside>
    <div className="awakening__body">
      {!!draft.situations?.length&&<Panel title="开局处境暂时停用"><p>这份草稿含已停用的开局选择。请移除后再调整角色方案。</p><CreationSituationSummary selection={draft.situations}/><Button disabled={locked} onClick={()=>update({situations:[]})}>移除暂停的处境选择</Button></Panel>}
      {step===1&&!policy.readonly&&<Button variant="secondary" onClick={()=>setAdvisorOpen(true)}>与角色顾问讨论{consulting?' · 正在构思':''}</Button>}
      {step===1&&<BackgroundChooser workspace={workbench.workspace} draft={draft} change={change} disabled={locked} onWorking={setWorking} flow="detailed"/>}
      {step<4&&['prince-cat','sealed-titled'].includes(draft.background.id)&&<CreationItems {...workbench} disabled={locked} onWorking={setConsulting} onSettings={()=>onNavigate('system')}/>}
      {step===1&&policy.readonly&&<p role="status">雪崩皇子的姓名、经历、武魂和实力已确定；仍可设计开场束具。</p>}
      {step===1&&<div className="awakening-origin"><figure className={view.figureUrl?'awakening-portrait is-custom':'awakening-portrait'}><img src={assetUrl(view.figureUrl||defaultFigure)} alt={view.figureUrl?'已保存的角色立绘':'旅者形象插画'}/><div className="traveler-orbit"/><figcaption><small>{view.figureUrl?'你的角色立绘':'旅者形象插画'}</small><strong>{draft.name||'未名的旅者'}</strong><Button variant="secondary" disabled={policy.readonly} onClick={()=>setAppearanceOpen(true)}>选择头像与立绘</Button></figcaption></figure><div className="awakening-origin__form">
        <fieldset disabled={locked||policy.readonly}><legend>你的名字，将从这里被记住</legend><div className="awakening-fields"><label>姓名<input value={draft.name??''} onChange={event=>update({name:event.target.value})} maxLength={20} data-testid="creation-name"/></label><label>年龄{personAgePresentation(draft).apparentAge&&<small>{personAgePresentation(draft).label}；实际年龄未载</small>}<input type="number" min={6} max={policy.ageMaximum} value={personAgePresentation(draft).apparentAge?'':draft.age??12} placeholder={personAgePresentation(draft).apparentAge?personAgePresentation(draft).label:undefined} onChange={event=>update({age:Number(event.target.value)})}/></label><label>性别<select value={draft.gender} onChange={event=>update({gender:event.target.value})}><option>女</option><option>男</option>{draft.gender==='未知'&&<option>未知</option>}</select></label><label>家乡<input value={draft.origin??''} onChange={event=>update({origin:event.target.value})}/></label><label className="is-wide">外貌<textarea value={draft.appearance??''} onChange={event=>update({appearance:event.target.value})}/></label></div></fieldset>
        <fieldset className="awakening-attributes" disabled={locked||policy.readonly}><legend>先天素质</legend><p>{draft.difficulty==='unlimited'?'六项基础素质使用同一9999点总池；低素质不增加总额。':policy.canonical?'保留原著既有基础，只计算本次增加的部分。':'免费基准为8，降低基础素质可以换取更多造化点。'}</p><div>{ledger.attributeRows.map((attribute:any)=><label key={attribute.key}><span>{attribute.key}</span><RangeInput type="range" min={policy.attributeMinimum} max={policy.attributeMaximum} step="1" value={draft.attributes[attribute.key]} onChange={event=>update({attributes:{...draft.attributes,[attribute.key]:Number(event.target.value)}})}/><b>{draft.attributes[attribute.key]}</b><small>{attribute.cost<0?`返还 ${-attribute.cost} 点`:`消耗 ${attribute.cost} 点`}</small></label>)}</div></fieldset>
        <label className="awakening-import">从已有角色方案继续<input type="file" accept="application/json,.json" disabled={locked} data-testid="import-character-config" onChange={event=>{const file=event.target.files?.[0];if(file)void importCharacter(file);event.target.value='';}}/><small>载入已保存的背景、六维、天赋、机缘、武魂设计与人物形象。</small></label>
      </div></div>}
      {step===1&&draft.background.id==='sealed-titled'&&draft.background.perspective==='captive'&&<SubjectFigureChooser draft={draft} change={change} disabled={locked}/>}
      {step===1&&draft.background.id==='custom'&&<CustomContacts draft={draft} update={update} disabled={locked}/>}
      {step===2&&policy.readonly?<BackgroundSummary draft={draft} policy={policy} currency={identity?.currency}/>:step===2&&<><CreationSoulWorkbench {...workbench} onSettings={()=>onNavigate('system')} onWorking={setConsulting}/></>}
      {step===3&&policy.ordinary&&<CreationTalents sourcePreferences={workspace.sourcePreferences} onSourceChange={(kind,sourceId)=>change(value=>({...value,sourcePreferences:{...value.sourcePreferences,[kind]:sourceId},config:{...value.config,opening:{...value.config.opening,opportunities:value.config.opening.opportunities.map((item:any)=>item.kind===kind?{...item,sourceId}:item)}}}))} souls={draft.martialSoulDrafts} selection={draft.opening} onChange={opening=>update({opening})} disabled={locked}/>}
      {step===3&&['jiumeitu-heir','custom'].includes(draft.background.id)&&<HistoricalRings draft={draft} update={update} disabled={locked} onEditSoul={()=>change(value=>({...value,step:2}))}/>}
      {step===3&&!policy.ordinary&&(draft.background.id==='sealed-titled'?<HistoricalRings draft={draft} update={update} disabled={locked} onEditSoul={()=>change(value=>({...value,step:2}))}/>:<BackgroundSummary draft={draft} policy={policy} currency={identity?.currency}/>)}
      {step===4&&<BackgroundSummary draft={draft} policy={policy} currency={identity?.currency}/>}
      {step===4&&<section className="awakening-confirm"><div className="awakening-confirm__portrait"><img src={assetUrl(view.figureUrl||defaultFigure)} alt={view.figureUrl?'角色立绘':'旅者形象插画'}/><div><span className="eyebrow">A JOURNEY TO REMEMBER</span><h2>{draft.name||'未名的旅者'}</h2><p>{personAgePresentation(draft).label} · {draft.gender} · {draft.origin}</p><blockquote>{draft.appearance}</blockquote></div></div><div className="awakening-confirm__facts"><div><small>出身</small><strong>{identity?.name||'待选择'}</strong></div><div><small>起始等级</small><strong>{ledger.level} 级{policy.ordinary&&policy.level===10?' · 经验已满':''}</strong></div><div><small>初始盘缠</small><strong>{identity?.currency??'待选择'}</strong></div><div><small>造化点消耗</small><strong>{ledger.spent} / {ledger.total}</strong></div></div><dl className="awakening-confirm__attributes">{ledger.attributeRows.map((attribute:any)=><div key={attribute.key}><dt>{attribute.key}</dt><dd>{draft.attributes[attribute.key]}</dd></div>)}</dl><section className="opening-summary"><h3>天赋与机缘</h3>{!draft.opening.talentIds.length&&!draft.opening.opportunities.length?<p>不选天赋与机缘，把力量留给自己。</p>:<ul>{draft.opening.talentIds.map((id:string)=><li key={id}>{catalog.talents[id].name}</li>)}{preview.opportunities.map((item:any)=><li key={item.kind}>{item.name} · {item.tier} · 收入行囊</li>)}</ul>}</section><CreationSituationSummary selection={draft.situations??[]}/><div className="awakening-confirm__souls">{draft.martialSoulDrafts.map((soul:any,index:number)=><article key={index} data-grade={preview.souls[index].inspection.quality.id}><small>第 {index+1} 武魂 · <GradeBadge grade={preview.souls[index].inspection.quality}/></small><h3 className="grade-name">{creationReason(soul.name||'尚未命名')}</h3><p>{creationReason(soul.form)}</p><span>{creationReason(soul.role)} · {preview.souls[index].inspection.pricing.total} 造化点</span><Button variant="ghost" disabled={locked} onClick={()=>change(value=>({...value,step:2,activeSoul:index}))}>继续完善</Button></article>)}</div><div className={preview.pass?'awakening-readiness is-ready':'awakening-readiness'} role="status"><h3>{preview.pass?'一切就绪，属于你的旅程即将开始':'启程前，还有一些选择需要完善'}</h3>{preview.pass?<p>{policy.ordinary&&policy.level===10?'旅程将从寻找第一枚魂环开始。':'一切准备就绪，可以进入这段故事了。'}</p>:<ul>{preview.errors.map((message:string,index:number)=><li key={index}>{message}</li>)}</ul>}</div><div className="awakening-export"><Button variant="secondary" onClick={()=>exportConfig()} data-testid="export-character-config">导出角色方案</Button>{draft.martialSoulDrafts.map((_:any,index:number)=><Button key={index} variant="ghost" onClick={()=>exportConfig(index)}>导出第 {index+1} 武魂</Button>)}</div></section>}
      {previewQuery.loading&&<p role="status">正在核对最新造化点…</p>}{previewQuery.error&&<p role="alert">{previewQuery.error}</p>}
      {error&&<><p className="awakening-error" role="alert">{error}</p><DiagnosticExportButton/></>}
      {working&&<div className="field-actions"><p role="status">{view.modelTask?.phase??view.modelTask?.label??'正在核对并保存角色方案'}…</p><Button variant="ghost" onClick={()=>controller.cancelModelTask()}>取消本次生成</Button><DiagnosticExportButton/></div>}
      <footer className="awakening__actions"><Button variant="ghost" disabled={step===1||locked} onClick={()=>change(value=>({...value,step:value.step-1}))}>返回上一步</Button><span>{step===4?`${draft.martialSoulCount} 武魂 · ${ledger.level} 级`:'你的每个选择都可以在觉醒前调整'}</span>{step<4?<Button disabled={locked} onClick={()=>change(value=>({...value,step:value.step+1}))}>{step===1?'聆听武魂 →':step===2?'配置能力 →':'查看启程预览 →'}</Button>:<Button disabled={locked||previewQuery.loading||Boolean(previewQuery.error)||!preview.pass||saveState.startsWith('尚未保存')} onClick={()=>void submit()} data-testid="confirm-creation">{working?'正在开启旅程…':error?'重试创建':'开始旅程'}</Button>}</footer>
    </div>
  </div></div>;
}
