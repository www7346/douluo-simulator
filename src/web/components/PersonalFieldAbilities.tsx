import {PersonContractForm} from './PersonContracts';
import {medicineCopy} from '../../runtime/player-copy';
import {useState} from 'react';
import type {PersonalFieldAbilitiesFacts} from '../../runtime/personal-field-abilities';
import {Button,Panel} from '../components';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
import {useActionFeedback} from '../use-action-feedback';
import ActionError from './ActionError';
import {PowerLimitSummary} from './PowerLimitFields';

export default function PersonalFieldAbilities({sourceItemId,foodPresentation=false,choice:externalChoice,onChoice}:{sourceItemId?:string;foodPresentation?:boolean;choice?:Record<string,unknown>;onChoice?:(choice:Record<string,unknown>)=>void}={}){
  const {view,controller}=useGame();
  const [localChoice,setLocalChoice]=useState<Record<string,unknown>>({}),feedback=useActionFeedback();
  const choice=externalChoice??localChoice,setChoice=onChoice??setLocalChoice;
  const query=useServerQuery<PersonalFieldAbilitiesFacts>('presentation.field-abilities',{...choice,...(sourceItemId?{sourceItemId}:{})});
  const facts=query.data,selected=facts?.selected;
  const lastResult=view.events.slice().reverse().find(event=>event.revision===view.snapshot.revision&&event.payload?.type==='field-ability-used'&&(sourceItemId?(view.snapshot.state as any).技能?.列表?.[String(event.payload.skillId)]?.sourceItemId===sourceItemId:event.payload.skillId===selected?.skillId));
  const selfSelected=selected?.targetId===facts?.actorId,recipient=selected?.targets.find(t=>t.id===selected.targetId);
  const power=selected?.recipientPower,sp=power?.soulPower;
  const ordinaryFoodPower=foodPresentation&&Array.isArray(power?.sources)&&power.sources.length===0&&Array.isArray(power?.permissions)&&power.permissions.length===0&&sp?.percent===100&&sp.locked===0&&power.damagePercent===100&&power.maximumCastRank===9;
  const run=async(payload:Record<string,unknown>)=>{const succeeded=await feedback.run(()=>controller.dispatch('world.intent',payload));if(succeeded&&selected){const scope={...selected.requestScope};delete scope.materials;setChoice({skillId:selected.skillId,targetId:selected.targetId,...scope});}};
  const choose=(patch:Record<string,unknown>)=>selected&&setChoice({skillId:selected.skillId,targetId:selected.targetId,...selected.requestScope,...patch});
  const chooseItem=(id:string)=>{
    if(!selected)return;const item=selected.itemChoices.find((v:any)=>v.id===id),scope={...selected.requestScope};
    delete scope.targetItemId;delete scope.recipeId;delete scope.blueprintId;delete scope.deviceNodeId;delete scope.lockId;delete scope.knowledgeId;
    setChoice({skillId:selected.skillId,targetId:selected.targetId,...scope,...(item?.targetItemId?{targetItemId:item.targetItemId,...(item.deviceNodeId?{deviceNodeId:item.deviceNodeId}:{}),...(item.lockId?{lockId:item.lockId}:{}),...(item.knowledgeId?{knowledgeId:item.knowledgeId}:{})}:item?.recipeId?{recipeId:item.recipeId}:item?.blueprintId?{blueprintId:item.blueprintId}:{})});
  };

  return <Panel className="personal-field-abilities" title={foodPresentation?'食用这份食品':sourceItemId?'施用这件物品':'场外能力'} eyebrow={foodPresentation?'辅助食品':'施放与维持'}>
    <QueryStatus query={query}/>
    <ActionError message={feedback.error} onDismiss={feedback.dismiss}/>
    {lastResult?.summary&&<p role="status">最近结果：{lastResult.summary}</p>}
    {query.error&&<Button variant="ghost" onClick={()=>setChoice({})}>{foodPresentation?'重新查看食品':'重新选择能力'}</Button>}
    {facts&&<>
      {selected&&<div className="form-grid">
          {(!foodPresentation||facts.skills.length>1)&&<label>能力<select value={selected.skillId} disabled={view.busy} onChange={e=>setChoice({skillId:e.target.value})}>{facts.skills.map((skill:any)=><option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label>}
          {facts.skills.find((skill:any)=>skill.id===selected.skillId)?.modes.length>0&&<label>施放方式<select value={selected.modeId} disabled={view.busy} onChange={e=>choose({modeId:e.target.value})}>{facts.skills.find((skill:any)=>skill.id===selected.skillId)?.modes.map((mode:any)=><option key={mode.id} value={mode.id}>{mode.name}</option>)}</select></label>}
          {selected.branches.length>1&&<label>本次用途<select value={selected.requestScope.branchIds[0]} disabled={view.busy} onChange={e=>setChoice({skillId:selected.skillId,branchIds:[e.target.value]})}>{selected.branches.map((branch:any)=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>}
      </div>}
      {selected?.contractOath?<PersonContractForm key={selected.skillId+selected.requestScope.branchIds.join(',')} skillId={selected.skillId} branchId={selected.requestScope.branchIds[0]}/>:selected?<>
        <div className="form-grid">


          {(!foodPresentation||selected.targets.length>1||!selfSelected)&&<label>{foodPresentation?'食用者':'目标'}<select value={selected.targetId} disabled={view.busy} onChange={e=>setChoice({skillId:selected.skillId,branchIds:selected.requestScope.branchIds,...(selected.modeId?{modeId:selected.modeId}:{}),targetId:e.target.value})}>{selected.targets.map(target=><option key={target.id} value={target.id}>{target.name}{target.self?'（自己）':''}{target.available?'':` · ${target.reason}`}</option>)}</select></label>}

          {selected.reconPlaces.length>0&&<label>侦察地点<select value={selected.requestScope.reconLocationId} disabled={view.busy} onChange={e=>choose({reconLocationId:e.target.value})}>{selected.reconPlaces.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
          {selected.itemOperation&&<label>{selected.itemOperation==='payload.repair_item'?'修复物品':selected.itemOperation==='payload.fabricate'?'造物配方':'器具目标'}<select disabled={view.busy} value={selected.itemChoices.find((item:any)=>item.targetItemId===selected.requestScope.targetItemId&&item.targetItemId&&(!selected.requestScope.lockId||selected.requestScope.lockId===item.lockId)&&(!selected.requestScope.knowledgeId||selected.requestScope.knowledgeId===item.knowledgeId)||item.recipeId===selected.requestScope.recipeId&&item.recipeId||item.blueprintId===selected.requestScope.blueprintId&&item.blueprintId)?.id??''} onChange={e=>chooseItem(e.target.value)}>{!selected.itemChoices.length&&<option value="">没有符合条件的物品或配方</option>}{selected.itemChoices.map((item:any)=><option key={item.id} value={item.id}>{item.name} · {item.detail}</option>)}</select></label>}
          {selected.itemOperation==='payload.fabricate'&&<label>制作数量<input type="number" inputMode="numeric" min={1} max={selected.maximumQuantity} value={selected.requestScope.quantity??1} disabled={view.busy} onChange={e=>{const value=Number(e.target.value);if(Number.isSafeInteger(value)&&value>=1&&value<=selected.maximumQuantity)choose({quantity:value});}}/></label>}
        </div>
        {['payload.repair_item','payload.fabricate','payload.create_key'].includes(selected.itemOperation??'')&&<section className="creation-materials"><h3>{selected.itemOperation==='payload.repair_item'?'修复材料':'制作材料'}</h3><p className="muted">按预览所列数量实际消耗，剩余材料保留。</p><div className="field-actions"><Button variant="ghost" disabled={view.busy} onClick={()=>choose({materials:selected.materials.map((m:any)=>({fingerprint:m.fingerprint,quantity:m.quantity}))})}>全部选取</Button><Button variant="ghost" disabled={view.busy} onClick={()=>choose({materials:[]})}>清空选择</Button></div>{selected.materials.map((material:any)=><label key={material.fingerprint} className="creation-material-row"><span>{material.name}<small>每份价值 {material.unitValue} · 持有 {material.quantity}</small></span><input aria-label={`${material.name}投入数量`} type="number" inputMode="numeric" min={0} max={material.quantity} value={material.selected} disabled={view.busy} onChange={e=>{const value=Number(e.target.value);if(Number.isSafeInteger(value)&&value>=0&&value<=material.quantity)choose({materials:selected.materials.map((m:any)=>({fingerprint:m.fingerprint,quantity:m.fingerprint===material.fingerprint?value:m.selected})).filter((m:any)=>m.quantity>0)});}}/></label>)}{!selected.materials.length&&<p>尚无可投入的材料。</p>}</section>}
        {selected.creationQuotes.map((q:any,index:number)=><section key={index} aria-label="构造预览"><p>{q.itemName?`${q.itemName}耐久：${q.before} → ${q.after} / ${q.maximum}`:`制造${q.productName} × ${q.quantity}`}</p><p>材料消耗：{q.materials.allocations.map((a:any)=>`${selected.materials.find((m:any)=>m.fingerprint===a.fingerprint)?.name??'材料'} × ${a.quantity}`).join('、')}（价值 {q.materials.consumedValue}）</p></section>)}
        {!(foodPresentation&&selfSelected)&&<p>{foodPresentation?'喂食者':'使用者'}：{facts.actorName} · {foodPresentation?'食用者':'目标'}：{recipient?.name}</p>}
        {selected.consumable?.harmful&&<p className="danger-text">{selected.consumable.classification}：{medicineCopy(selected.consumable)}</p>}
        {!ordinaryFoodPower&&<PowerLimitSummary power={selected.recipientPower}/>}
        {selected.recoveryQuota&&<p>接受者今日场外回魂魂技：{selected.recoveryQuota.used} / {selected.recoveryQuota.total}次，其中强恢复 {selected.recoveryQuota.strongUsed} / {selected.recoveryQuota.strongTotal}次。</p>}
        <p>{foodPresentation?'食用条件':'施放条件'}：{selected.contract.requirements.join('、')||'无额外条件'}</p>
        <p>{selected.preview.available?'本次消耗':foodPresentation?'食用费用':'施放费用'}：{(selected.preview.available?selected.preview.paymentLines:selected.contract.costLines).join('、')||'无资源消耗'}</p>
        {!selected.preview.available&&selected.contract.sourceItem&&<p>{foodPresentation?'食用':'施放'}还会消耗一件{selected.contract.sourceItem}。</p>}
        {selected.preview.activationLock>0&&<p>另占用魂力 {selected.preview.activationLock}。</p>}
        {selected.preview.timingNotices.map((notice:string)=><p key={notice} role="status">{notice}</p>)}
        {selected.contract.maintenanceLines.length>0&&<p>效果持续时每分钟消耗：{selected.contract.maintenanceLines.join('、')}。</p>}
        {selected.usage.dailyLimit>0&&<p>今日剩余 {selected.usage.dailyRemaining} / {selected.usage.dailyLimit} 次。</p>}
        {selected.usage.cooldownMinutes>0&&<p>冷却剩余 {selected.usage.cooldownMinutes} 分钟。</p>}
        {!selected.preview.available&&<p role="status" className="muted">{selected.preview.reason}</p>}
        {selected.capture&&<p>{selected.captureRules}</p>}
        {selected.preview.exhaustsLife&&<p className="danger-text">本次{foodPresentation?'食用':'施放'}会耗尽剩余寿命。</p>}
        {selected.targetId!==facts.actorId&&!selected.capture&&<><label className="toggle-row"><input aria-label={foodPresentation?'强行喂食':'场外强制施用'} type="checkbox" checked={selected.force} disabled={view.busy} onChange={e=>choose({force:e.target.checked})}/><span>{selected.consumable?.oral?'实际拘束或囚禁中的人物可以强制喂服；仍能反抗时进行对抗，未吞服不消耗药物。':'强行施用前，若目标仍能反抗，需要先进入战斗。'}</span></label><Button variant="secondary" disabled={view.busy||!selected.canRequest} onClick={()=>void run({type:'request-ability-use',skillId:selected.skillId,targetId:selected.targetId,...selected.requestScope})}>{foodPresentation?'请对方接受这份食品':'请对方接受使用'}</Button>{selected.requestReason&&<p>{selected.requestReason}</p>}</>}
        <Button disabled={view.busy||!selected.preview.available} onClick={()=>void run({type:'use-field-ability',skillId:selected.skillId,targetId:selected.targetId,...selected.requestScope,force:selected.force,...(selected.permissionId?{permissionId:selected.permissionId}:{}),...(selected.modeId?{modeId:selected.modeId}:{})})}>{foodPresentation?(selected.force?'强行喂食 · 1分钟':selfSelected?'食用这份食品 · 1分钟':'喂食这份食品 · 1分钟'):selected.consumable?.oral?(selected.force?'强行喂服 · 1分钟':selected.targetId===facts.actorId?'服下此药 · 1分钟':'喂服此药 · 1分钟'):(selected.force?'尝试强行施用 · 1分钟':'尝试施放 · 1分钟')}</Button>
      </>:<p className="muted">{foodPresentation?'这份食品暂时无法食用':'尚未持有可在场外施放的能力。'}</p>}
      {!sourceItemId&&facts.requests.length>0&&<section><h3>本次施用请求</h3>{facts.requests.map((r:any)=><article key={r.id}><p>{r.actorName}请求对{r.targetName}使用{r.skillName} · {({pending:'等待本人回应',accepted:'接受一次施用',rejected:'已拒绝',used:'已使用',expired:'已到期'} as Record<string,string>)[r.status]}</p>{r.canRespond&&<div className="field-actions"><Button disabled={view.busy} onClick={()=>void run({type:'respond-ability-use',permissionId:r.id,accept:true,reason:'我同意，你用吧。'})}>接受本次施用</Button><Button variant="secondary" disabled={view.busy} onClick={()=>void run({type:'respond-ability-use',permissionId:r.id,accept:false,reason:'我拒绝本次施用。'})}>拒绝本次施用</Button></div>}</article>)}</section>}
      {!sourceItemId&&facts.disguises.length>0&&<section aria-label="当前伪装"><h3>当前伪装</h3>{facts.disguises.map((entry:any)=><article key={entry.statusId}><p>{entry.name}</p><Button variant="secondary" disabled={view.busy||!entry.available} title={entry.reason||undefined} onClick={()=>void run({type:'dismiss-disguise',statusId:entry.statusId})}>解除这次伪装 · 1分钟</Button></article>)}</section>}
      {!sourceItemId&&<><h3>正在维持</h3>
      <div className="record-list">{facts.maintenance.map(entry=><article key={entry.sourceId}><span><b>{entry.name}</b>{entry.constructs.map((c:any)=><small key={c.id}>{c.name} · 剩余 {c.minutesRemaining} 分钟 · {c.kind==='wall'?`耐久 ${c.durability}`:`生命 ${c.hp} / ${c.maxHp}`}</small>)}{entry.costLines.length>0?<small>每分钟：{entry.costLines.join('、')} · 下次消耗还需 {entry.minutesUntilNext} 分钟</small>:<small>持续期间无额外消耗</small>}{!entry.available&&<small>{entry.reason}</small>}</span><Button variant="secondary" disabled={view.busy||!entry.available} onClick={()=>void run({type:'stop-maintenance',maintenanceSourceId:entry.sourceId})}>停止维持</Button></article>)}</div>
      {!facts.maintenance.length&&<p className="muted">没有正在维持的效果。</p>}</>}
    </>}
  </Panel>;
}
