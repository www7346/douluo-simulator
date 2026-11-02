import {playerDescription} from '../runtime/player-copy';
import {ModelObservationDetachedError} from '../runtime/model-task';
import {assetUrl} from './asset-delivery';
import {jsonEqual} from '../shared/json-identity';
import SpiritIllustration from './components/SpiritIllustration';
import SoulImageEditor from './components/SoulImageEditor';
import {PortraitImage} from './components/PortraitArt';
import {martialSoulArtwork} from '../runtime/generated-art';
import {useEffect,useRef,useState} from 'react';
import {creationRequest,withCreationCancellation} from './creation-request';
import {useCreationCatalog,useCreationPreview} from './creation-context';
import {useServerQuery} from './use-game-query';
import {creationReason,rememberManualSoul,rememberSoulAdvice,replaceWorkspaceSoul,customSoulDraft,type CreationWorkspace} from '../shared/creation-draft';
import {Button,Modal,LoadingPanel,Panel} from './components';
import {SoulEditor} from './SoulEditor';
import GradeBadge from './components/GradeBadge';
import {useGame} from './game-context';

type Props={workspace:CreationWorkspace;change:(update:CreationWorkspace|((current:CreationWorkspace)=>CreationWorkspace))=>void;flush:()=>Promise<void>;current:()=>CreationWorkspace;onSettings:()=>void;onWorking:(value:boolean)=>void;scoped?:boolean;adviceTarget?:{side:'buyer'|'captive';actorKey:string}};


export function CreationSoulWorkbench({workspace,change,flush,current,onSettings,onWorking,scoped=false,adviceTarget}:Props) {
  const {controller,view}=useGame();
  const catalog=useCreationCatalog(),friendly=(value:string)=>catalog.labels[value]??'能力';
  const [operation,setOperation]=useState<{kind:'edit'|'template'|'advisor';startedAt:number}|null>(null),[advisorStage,setAdvisorStage]=useState<'budget'|'model'|'saving'>('budget'),[error,setError]=useState('');
  const working=!!operation,pending=useRef<AbortController|null>(null),mounted=useRef(true),modelSent=useRef(false),retry=useRef<null|(()=>Promise<void>)>(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;pending.current?.abort(new ModelObservationDetachedError());onWorking(false);};},[]);
  const stop=()=>{pending.current?.abort();if(modelSent.current)view.modelTask&&controller.cancelModelTask(view.modelTask.id);};
  const [imageOpen,setImageOpen]=useState(false);
  const [template,setTemplate]=useState(''),[replacement,setReplacement]=useState<Record<string,any>|null>(null);
  const activeRequest=useRef(false);
  const index=workspace.activeSoul,soul=workspace.config.martialSoulDrafts[index];
  const previewQuery=useCreationPreview(workspace.config),preview=previewQuery.data;
  const selected=preview?.souls[index],advisor=workspace.advisors[index],proposal=advisor?.proposal;
  const proposalConfig=proposal?replaceWorkspaceSoul(workspace,index,proposal).config:null;
  const proposalQuery=useServerQuery<any>('creation.preview',{config:proposalConfig},{enabled:Boolean(proposal),delay:120});
  const proposalPreview=proposalQuery.data?.souls[index];
  const request=workspace.requests[index] ?? '';
  const templateEntry=catalog.templates[template];
  const manual=(update:(value:CreationWorkspace)=>CreationWorkspace)=>change(value=>rememberManualSoul(update(value),index));
  const proposeReplacement=(value:Record<string,any>)=>setReplacement(value);
  const consult=async (answer=request):Promise<void>=>{
    if(activeRequest.current)return;
    const sessionId=view.sessionId,abort=new AbortController();pending.current=abort;
    activeRequest.current=true;setOperation({kind:'advisor',startedAt:Date.now()});setAdvisorStage('budget');onWorking(true);setError('');retry.current=()=>consult(answer);
    change(value=>({...value,requests:{...value.requests,[index]:answer}}));
    try {
      await withCreationCancellation(flush(),abort.signal);
      if(controller.getView().sessionId!==sessionId)return;
      const fresh=current(),entry=fresh.config.martialSoulDrafts[index];
      const budget=(await creationRequest(controller,'creation.preview',{config:fresh.config},abort.signal)).souls[index].available;
      abort.signal.throwIfAborted();if(controller.getView().sessionId!==sessionId)return;
      setAdvisorStage('model');modelSent.current=true;
      const advice=await controller.consultMartialSoul(answer.trim() || '请根据我的现有构想，先帮我找出需要完善的地方。',budget,entry.draftId || `creation-${index+1}`,fresh.advisors[index]?.session,entry,fresh.config.martialSoulDrafts.filter((_:any,i:number)=>i!==index),{target:{index,...adviceTarget},signal:abort.signal});
      abort.signal.throwIfAborted();if(controller.getView().sessionId!==sessionId)return;
      setAdvisorStage('saving');change(value=>rememberSoulAdvice(value,index,advice));await flush();retry.current=null;
    }catch(problem){if(mounted.current&&controller.getView().sessionId===sessionId)setError(abort.signal.aborted?'已停止这次请求，已保存的输入和候选保留':creationReason((problem as Error).message));}
    finally {if(pending.current===abort)pending.current=null;modelSent.current=false;activeRequest.current=false;if(mounted.current)setOperation(null);onWorking(false);}
  };
  const importSoul=async(file:File)=>{
    const sessionId=view.sessionId;
    try {
      const imported=await controller.importMartialSoul(await file.text());
      if(controller.getView().sessionId===sessionId)proposeReplacement(imported);
    }catch(problem){controller.notify(creationReason((problem as Error).message),'danger');}
  };
  const runManual=async(kind:'edit'|'template',apply:(signal:AbortSignal)=>Promise<void>,again:()=>Promise<void>)=>{
    if(activeRequest.current)return;
    const abort=new AbortController();pending.current=abort;activeRequest.current=true;retry.current=again;
    setOperation({kind,startedAt:Date.now()});onWorking(true);setError('');
    try{await apply(abort.signal);retry.current=null;}
    catch(problem){if(mounted.current)setError(abort.signal.aborted?'已停止等待服务器，这项修改尚未应用，可以重试':creationReason((problem as Error).message));}
    finally{if(pending.current===abort)pending.current=null;activeRequest.current=false;if(mounted.current)setOperation(null);onWorking(false);}
  };
  const remoteEdit=async(input:Record<string,any>):Promise<void>=>runManual('edit',async signal=>{
    const before=current(),sessionId=view.sessionId,result=await creationRequest(controller,'creation.edit',{...input,workspace:before,index},signal);
    signal.throwIfAborted();if(controller.getView().sessionId!==sessionId)return;
    if(!jsonEqual(current(),before))throw new Error('构想已变化，请重新应用这项选择');
    change(rememberManualSoul(result,index));
  },()=>remoteEdit(input));
  const loadTemplate=async(templateId:string):Promise<void>=>runManual('template',async signal=>{
    const sessionId=view.sessionId,result=await creationRequest(controller,'creation.template',{templateId,draftId:'creation-'+(index+1)},signal);
    signal.throwIfAborted();if(controller.getView().sessionId===sessionId)proposeReplacement(result);
  },()=>loadTemplate(templateId));
  if(!selected)return previewQuery.error?<Panel title="武魂资料暂未读取"><p role="alert">{previewQuery.error}</p><Button onClick={previewQuery.retry}>重试核对</Button></Panel>:<LoadingPanel label="服务器正在核对武魂构想…"/>;
  return <div className={`awakening-souls${scoped?' awakening-souls--scoped':''}`}>
    {operation&&operation.kind!=='advisor'&&<div className="creation-calculation" role="status" data-testid="creation-server-status"><span className="loading-ring" aria-hidden="true"/><span>{operation.kind==='edit'?'服务器正在应用武魂设定…':'服务器正在读取武魂范本…'}</span><Button variant="secondary" onClick={stop}>停止等待</Button></div>}
    {operation?.kind==='advisor'&&advisorStage==='budget'&&<div className="creation-calculation" role="status" data-testid="creation-server-status"><span className="loading-ring" aria-hidden="true"/><span>正在保存输入、核对预算，随后提交 AI 请求…</span><Button variant="secondary" onClick={stop}>停止这次请求</Button></div>}
    {error&&<div className="awakening-error" role="alert"><p>{error.replace(/[。.!！\s]+$/,'')}。你的构想与这次输入已保留。</p>{retry.current&&<Button variant="secondary" disabled={working} onClick={()=>void retry.current?.()}>重试这项操作</Button>}{!working&&<Button variant="ghost" disabled={!controller.canReconnect()} onClick={()=>void controller.reconnect()}>重新连接</Button>}</div>}
    <div className="awakening-souls__tabs"><div role="tablist" aria-label="选择武魂">{workspace.config.martialSoulDrafts.map((entry:any,soulIndex:number)=><button role="tab" aria-selected={index===soulIndex} key={soulIndex} disabled={working} onClick={()=>change(value=>({...value,activeSoul:soulIndex}))}><small>第 {soulIndex+1} 武魂</small><span>{entry.name || '未命名的回声'}</span></button>)}</div><label>武魂数量<select aria-label="武魂数量" value={workspace.config.martialSoulCount} disabled={working||Boolean(preview.background?.fixedSoulCount)} onChange={event=>void remoteEdit({kind:'count',count:Number(event.target.value)})}>{(preview.background?.fixedSoulCount?[preview.background.fixedSoulCount]:Array.from({length:preview.background?.maxSouls??3},(_,i)=>i+1)).map((count:number)=><option key={count} value={count}>{count===1?'单武魂':count===2?'双生武魂':'三武魂'}</option>)}</select></label></div>
    {preview.background?.fixedSoulCount&&<p role="status">扮演此原著人物时保留既有的{preview.background.fixedSoulCount}个武魂。若想增减数量，请先改为自定义人物。</p>}{workspace.config.martialSoulCount>1&&<p className="awakening-hint">多个武魂共享造化点，觉醒时须拥有相同品级。暂时收起的武魂会为你保留。</p>}
    <div className="awakening-workbench">
      <section className="awakening-workbench__editor" aria-label="手动设计武魂">
        <header><div><span className="eyebrow">SOUL DESIGN</span><h2>让想象拥有形态</h2></div><div><GradeBadge grade={selected.inspection.quality}/><p>本武魂可用 {selected.available} 点</p></div></header>
        <fieldset className="awakening-templates" disabled={working}><label>从范本开始<select value={template} onChange={event=>setTemplate(event.target.value)}><option value="">选择一个起点</option>{Object.entries(catalog.templates).map(([id,item]:[string,any])=><option key={id} value={id}>{item.name} · {item.grade}</option>)}</select></label><Button variant="secondary" disabled={!template} onClick={()=>void loadTemplate(template)}>载入范本</Button><Button variant="ghost" onClick={()=>void loadTemplate('')}>从空白开始</Button><label className="file-button">导入武魂<input type="file" accept="application/json,.json" data-testid={`import-soul-config-${index}`} onChange={event=>{const file=event.target.files?.[0];if(file)void importSoul(file);event.target.value='';}}/></label></fieldset>
        {templateEntry?.description&&<section className="awakening-proposal preset-soul-preview" aria-label="精品武魂介绍">{templateEntry.art&&<PortraitImage art={templateEntry.art} name={templateEntry.name}/>}<h3>{templateEntry.name}</h3><p>{playerDescription(templateEntry.description)}</p><p className="muted">{playerDescription(templateEntry.appearance)}</p><small>{templateEntry.source.kind==='canon-adaptation'?'原著适配':'原创精品'} · {templateEntry.era}</small></section>}
          <SoulEditor illustration={<>{scoped?<PortraitImage art={martialSoulArtwork(soul)} name={soul.name}/>:<SpiritIllustration soul={soul} slot={String(index+1)}/>} {!scoped&&<Button className="soul-image-launch" variant="secondary" disabled={working} onClick={()=>void flush().then(()=>setImageOpen(true)).catch(e=>controller.notify(e.message,'danger'))}>更换武魂图片</Button>}</>} key={index} soul={soul} inspection={selected.inspection} problems={selected.problems} disabled={working}
          onText={(field,value)=>manual(valueNow=>replaceWorkspaceSoul(valueNow,index,customSoulDraft(valueNow.config.martialSoulDrafts[index],{[field]:value,playerConfirmed:false})))}
          onEdit={operation=>void remoteEdit({kind:'edit',operation})}
          onReplaceEntry={(group,entryIndex,value)=>void remoteEdit({kind:'entry',group,entryIndex,value})}/>
      </section>
      {!scoped&&<aside className="awakening-advisor" aria-label="武魂顾问">
        <header><span className="awakening-advisor__seal" aria-hidden="true"><img src={assetUrl("/art/fantasy-v4/guide.png")} alt=""/></span><div><span className="eyebrow">YOUR SOUL, YOUR STORY</span><h2>一起构想你的武魂</h2></div></header>
        <p>讲讲它的模样、力量，或你想改变的地方。每次讨论都会留在这份武魂构想中。</p>
        {!view.modelEnabled&&<div className="awakening-advisor__offline"><p>连接创作顾问后，可以一起讨论。现在也可以直接编辑武魂，完成觉醒。</p><Button variant="secondary" onClick={onSettings}>设置创作顾问</Button></div>}
        {advisor?.session?.messages?.length>0&&<details className="awakening-advisor__history"><summary>此前的讨论 · {advisor.session.turn} 轮</summary>{advisor.session.messages.map((message:any,messageIndex:number)=><p key={messageIndex}><b>{message.role==='player'?'你的想法':'顾问'}</b>{creationReason(message.text)}</p>)}</details>}
        {advisor?.session?.advisorMessage&&<blockquote>{playerDescription(creationReason(advisor.session.advisorMessage))}</blockquote>}
        {advisor?.session?.question&&<div className="awakening-advisor__question"><h3>{creationReason(advisor.session.question.text)}</h3><div>{advisor.session.question.options?.map((option:string,optionIndex:number)=><Button key={optionIndex} disabled={working||!view.modelEnabled} variant="secondary" onClick={()=>void consult(option)}>{creationReason(option)}</Button>)}</div></div>}
        {proposal&&<section className="awakening-proposal" aria-label="顾问的新提案"><small>等待你的选择</small><h3>{creationReason(proposal.name||'未命名的构想')}</h3><p>{playerDescription(creationReason(proposal.form))}</p><dl><div><dt>定位</dt><dd>{creationReason(proposal.role)}</dd></div><div><dt>属性</dt><dd>{proposal.attributes.map((entry:any)=>friendly(entry.id)).join(' · ')||'尚未选择'}</dd></div><div><dt>能力</dt><dd>{proposal.channels.map(friendly).join(' · ')||'尚未选择'}</dd></div><div><dt>造化点</dt><dd>{proposalPreview?.inspection.pricing.total} · <GradeBadge grade={proposalPreview?.inspection.quality}/></dd></div></dl>{(proposalPreview?.problems.length??0)>0&&<p className="awakening-proposal__notice">尚有 {proposalPreview.problems.length} 处设定需要完善，可以采用后继续编辑。</p>}<Button disabled={working} onClick={()=>{change(value=>{const adopted=replaceWorkspaceSoul(value,index,proposal);return {...adopted,advisors:{...adopted.advisors,[index]:{...adopted.advisors[index],proposal:null}}};});controller.notify('已采用这份构想，可以继续调整','success');}}>采用这份构想</Button></section>}
        <label className="awakening-advisor__input">你的想法<textarea value={request} disabled={working} onChange={event=>change(value=>({...value,requests:{...value.requests,[index]:event.target.value}}))} placeholder="例如：一只驾驭火焰的狐狸，擅长魅惑与守护。" maxLength={1800}/></label>
                {operation?.kind==='advisor'&&advisorStage==='saving'&&<p role="status">AI 答复已收到，正在保存候选…</p>}
        <div className="awakening-advisor__actions"><Button disabled={working||!view.modelEnabled} onClick={()=>void consult()} data-testid={`consult-soul-${index}`}>{operation?.kind==='advisor'?'AI 请求处理中…':advisor?'继续讨论':'请 AI 顾问一起构思'}</Button>{operation?.kind==='advisor'&&<Button variant="ghost" onClick={stop}>停止这次请求</Button>}</div>
      </aside>}
    </div>
    <Modal open={Boolean(replacement)} title="更换这份武魂构想" onClose={()=>setReplacement(null)} actions={<><Button variant="ghost" onClick={()=>setReplacement(null)}>保留现有构想</Button><Button onClick={()=>{if(!replacement)return;manual(value=>replaceWorkspaceSoul(value,index,replacement));setReplacement(null);}}>使用这份构想</Button></>}><p>第 {index+1} 武魂将更换为「{replacement?.name || '空白构想'}」。现有讨论记录会保留，你可以从新的设定继续讨论。</p></Modal>
    <Modal open={imageOpen} className="appearance-modal" title="更换武魂图片" onClose={()=>setImageOpen(false)}>{imageOpen&&<SoulImageEditor key={`${view.sessionId}-${index}`} soul={soul} slot={String(index+1)} onSaved={()=>setImageOpen(false)}/>}</Modal>
  </div>;
}
