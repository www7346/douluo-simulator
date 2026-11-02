import {playerDescription} from '../runtime/player-copy';
import {creationRequest} from './creation-request';
import OpeningActions from './OpeningActions';
import OpeningActorCards from './OpeningActorCards';
import {BackgroundChooser,SubjectFigureChooser} from './BackgroundCreation';
import CreationItems from './CreationItems';
import {Button,Panel} from './components';
import {useCreationCatalog} from './creation-context';
import {useGame} from './game-context';
import {useServerQuery} from './use-game-query';
import {assetUrl} from './asset-delivery';
import {creationFigure} from './character-figures';

export default function CreationQuickStart({workbench,preview,locked,onWorking,onCustomize,onSubmit,error,working,onSettings,validating,previewError,onOpenWorkshop}:{workbench:any;preview:any;locked:boolean;onWorking:(v:boolean)=>void;onCustomize:(step:number)=>void;onSubmit:()=>void;error:string;working:boolean;onSettings:()=>void;validating:boolean;previewError:string;onOpenWorkshop:()=>void}){
 const {controller,view}=useGame(),catalog=useCreationCatalog(),draft=workbench.workspace.config,b=draft.background,p=preview.background;
 const readonly=false;
 const history=useServerQuery<any>('creation.history',{config:draft},{enabled:['sealed-titled','jiumeitu-heir'].includes(b.id),delay:200});
 const activeHistory=b.id==='jiumeitu-heir'?history.data?.main:history.data?.captive;
 const relationQuery=useServerQuery<any>('creation.relations',{config:draft});const relations=relationQuery.data?.summary??[];
 const delegate=async()=>{onWorking(true);try{const result=await creationRequest(controller,'creation.complete-history',{config:workbench.current().config});workbench.change((v:any)=>({...v,config:result.config}));}catch(e){controller.notify((e as Error).message,'danger');}finally{onWorking(false);}};
 const changeName=(name:string)=>workbench.change((v:any)=>({...v,config:{...v.config,name}}));
 return <div className="creation-quick" data-testid="creation-quick">
  <header className="creation-quick-heading"><span className="eyebrow">YOUR STORY BEGINS</span><h1>选择你的开场</h1><p>选一段故事，为主角写下姓名。武魂与行囊已经备好，随时可以启程。</p></header>
  <OpeningActions workbench={workbench} preview={preview} disabled={locked} onCustomize={()=>{if(b.id==='sealed-titled')document.querySelector<HTMLButtonElement>(`[data-testid="opening-${b.perspective}-customize"]`)?.click();else onCustomize(1);}} onEditSouls={()=>{if(b.id==='sealed-titled')document.querySelector<HTMLButtonElement>(`[data-testid="opening-${b.perspective}-souls"]`)?.click();else onCustomize(2);}} onOpenWorkshop={onOpenWorkshop}/>
   <footer className="creation-quick-launch"><Button data-testid="confirm-creation" disabled={locked||validating||!!previewError||!preview.pass||workbench.saveState.startsWith('尚未保存')} onClick={onSubmit}>{working?'正在开启旅程…':'开始旅程'}</Button><span role="status">{validating?'正在核对开局…':previewError||(!preview.pass?preview.errors[0]:'')||workbench.saveState}</span>{error&&<p role="alert">{error}</p>}</footer>
  <OpeningActorCards workbench={workbench} disabled={locked} onWorking={onWorking} onSettings={onSettings}/>
  <BackgroundChooser workspace={workbench.workspace} draft={draft} change={workbench.change} disabled={locked} onWorking={onWorking}/>
  <section className="creation-quick-ready">
   <div className="creation-quick-identity"><img src={assetUrl(view.figureUrl||creationFigure(draft)!)} alt=""/><div><small>{p.definition.name}</small><h2>从这里，开始你的故事</h2><label>姓名<input data-testid="creation-name" value={draft.name} maxLength={20} disabled={locked||readonly} onChange={e=>changeName(e.target.value)}/></label>{readonly&&<p className="muted">你将以雪崩皇子的身份启程。想改变开场的束具，可以在下方设计。</p>}</div></div>
   <p className="creation-quick-story">{playerDescription(p.definition.description)}</p><dl className="creation-quick-facts"><div><dt>实力</dt><dd>{p.level}级 · {draft.martialSoulDrafts.map((s:any)=>s.name).join('、')}</dd></div><div><dt>起点</dt><dd>{b.id==='sealed-titled'?'天斗城 · 买主宅邸':b.id==='prince-cat'?'天斗城 · 皇子府':b.id==='custom'?'圣魂村':b.id==='jiumeitu-heir'?'诺丁城':p.definition.name}</dd></div><div><dt>开场关系</dt><dd>{b.id==='prince-cat'&&b.perspective==='captive'?'雪崩 · 主人':`${relations.length}人 · ${relations.filter((row:any)=>row.contact).length}位可联络`}</dd></div><div><dt>资产</dt><dd>{preview.identity?.currency??`${p.wallet}金`} · 随身行囊</dd></div></dl>
   {['prince-cat','sealed-titled'].includes(b.id)&&<p className="creation-quick-notice">{b.perspective==='buyer'?(b.acquisitionKind==='found'?'你发现的封神台已带回自宅。':'你已将人带回府中。'):(b.acquisitionKind==='found'?'发现封神台的人将你带回了宅邸。':'你已被带进买主的宅邸。')}开场束具：{preview.creationItems?.items?.map((item:any)=>`${item.definition.name} · ${item.modes.find((m:any)=>m.id===item.definition.mode)?.name}`).join('；')}。</p>}
   {['sealed-titled','jiumeitu-heir'].includes(b.id)&&<div data-testid="history-preset-summary"><p>{history.data?`${history.data.title?'封号：'+history.data.title+' · ':''}${activeHistory.selected.length}枚魂环已配好`:history.error?'魂环配置需调整':'正在整理魂环…'}</p>{history.error&&<p role="alert">{history.error}</p>}{history.data&&<details><summary>查看历史魂环</summary>{activeHistory.selected.map((row:any)=><p key={row.ordinal}>第{row.ordinal}环 · {row.profile.年限}年 · {row.candidate.title}</p>)}</details>}</div>}
   {!preview.pass&&<div role="status"><p>启程前，还有几处设定需要补全：</p><ul>{preview.errors.map((message:string,i:number)=><li key={i}>{message}</li>)}</ul>{['sealed-titled','jiumeitu-heir'].includes(b.id)&&<Button disabled={locked} variant="secondary" onClick={()=>void delegate()}>请主持人配齐剩余魂环</Button>}</div>}
   {b.id==='sealed-titled'&&<SubjectFigureChooser draft={draft} change={workbench.change} disabled={locked}/>}
  </section>
  <Panel title="想按自己的想法调整？" className="creation-quick-options"><p>预设可以直接使用，下面的修改都是可选的。</p><div className="creation-quick-option-buttons"><Button variant="secondary" data-testid="creation-advanced-open" disabled={locked} onClick={()=>onCustomize(1)}>人物与背景</Button><Button variant="secondary" disabled={locked||readonly} onClick={()=>onCustomize(2)}>武魂与天赋</Button>{['sealed-titled','jiumeitu-heir'].includes(b.id)&&<Button variant="secondary" disabled={locked} onClick={()=>onCustomize(3)}>手选历史魂环</Button>}<CreationItems {...workbench} disabled={locked} onWorking={onWorking} onSettings={onSettings}/><Button variant="ghost" disabled={locked} onClick={()=>onCustomize(4)}>查看完整方案</Button></div></Panel>
 </div>;
}
