import {playerDescription} from '../runtime/player-copy';
import {useState} from 'react';
import {useCreationCatalog} from './creation-context';
import {useServerQuery} from './use-game-query';
import {ActionSection,Button,Modal,Panel} from './components';
import type {CreationWorkspace} from '../shared/creation-draft';
import CreationItemAdvisor from './CreationItemAdvisor';

const KINDS=[['ordinary','普通攻击'],['martial-base','武魂基础'],['soul-ring','魂环魂技'],['martial-skill','其他魂技'],['soul-bone','魂骨'],['soul-device','魂导器'],['consumable','丹药与消耗品'],['hidden-weapon','暗器'],['domain','领域'],['restraint','拘束器']];
export function CreationItemTemplateSelect({templates,wearerLevel,index,value,disabled,onChange}:{templates:any[];wearerLevel?:number;index:number;value:string;disabled:boolean;onChange:(templateId:string)=>void}){
 const ready=Number.isInteger(wearerLevel);
 return <label>器具制式<select disabled={disabled||!ready} aria-label={`第${index+1}件器具制式`} data-testid={`creation-item-template-${index}`} value={value} onChange={e=>onChange(e.target.value)}>{templates.map(t=><option key={t.id} value={t.id} disabled={!ready||t.maxLevel<wearerLevel!}>{t.name} · 最高{t.maxLevel}级</option>)}</select></label>;
}
export function CreationItemsSummary({draft}:{draft:any}){
 const query=useServerQuery<any>('creation.items',{config:draft},{enabled:['prince-cat','sealed-titled'].includes(draft.background.id)});
 if(!['prince-cat','sealed-titled'].includes(draft.background.id))return null;
 const q=query.data;
 return <section data-testid="creation-items-summary"><h3>开局拘束器</h3>{!q?<p>{query.error??'正在核对器具…'}</p>:<><p>束具总价：{q.total}金</p>{q.items.map((item:any)=><article key={item.index}><h4>{item.definition.name}</h4><p>{playerDescription(item.definition.description)}</p><p>{playerDescription(item.definition.appearance)}</p><p>{item.modes.find((m:any)=>m.id===item.definition.mode)?.name} · 最高{item.device.maxLevel}级{item.definition.binding?` · ${item.activeBinding?'当前束缚：':'仅锁定时：'}${item.definition.binding.pose}${item.definition.binding.part} · ${item.definition.binding.layers}层 · 挣脱难度${item.device.breakDifficulty}＋${item.definition.binding.difficultyBonus}`:''}</p>{item.definition.limits&&<p>魂力开放{item.definition.limits.soulPowerPercent}%{item.definition.limits.damagePercent!==undefined?` · 伤害输出${item.definition.limits.damagePercent}%`:''} · 最高许可第{item.definition.limits.permission?.maxCastRank??9}环</p>}</article>)}{q.errors?.map((e:string)=><p key={e} role="alert">{e}</p>)}</>}</section>;
}
export default function CreationItems({workspace,change,disabled,flush,current,onWorking,onSettings}:{workspace:CreationWorkspace;change:(value:any)=>void;disabled:boolean;flush:()=>Promise<void>;current:()=>CreationWorkspace;onWorking:(v:boolean)=>void;onSettings:()=>void}){
 const [open,setOpen]=useState(false),[mode,setMode]=useState<'host'|'manual'>('host'),[selected,setSelected]=useState(0),catalog=useCreationCatalog(),draft=workspace.config,b=draft.background;
 const query=useServerQuery<any>('creation.items',{config:draft},{enabled:['prince-cat','sealed-titled'].includes(b.id)});
 if(!['prince-cat','sealed-titled'].includes(b.id))return null;
 const templates=catalog.restraintTemplates as any[],q=query.data,wearerLevel=query.loading?undefined:q?.wearerLevel;
 const rows=b.creationItems??[templates.find(t=>t.id===(b.id==='sealed-titled'?'restraint-seal-platform':'rope')).draft];
 const set=(rows:any[])=>change((value:CreationWorkspace)=>({...value,config:{...value.config,background:{...value.config.background,creationItems:rows}}}));
 const edit=(index:number,patch:any)=>set(rows.map((row:any,i:number)=>i===index?{...row,...patch}:row));
 const used=new Set(rows.map((r:any)=>templates.find(t=>t.id===r.templateId)?.part)),available=Number.isInteger(wearerLevel)?templates.find(t=>t.maxLevel>=wearerLevel&&!used.has(t.part)):undefined;
 const limitsFor=(row:any,t:any)=>row.limits??{soulPowerPercent:0,...(t.supportsDamage?{damagePercent:0}:{}),permission:{allowedKinds:['ordinary'],maxCastRank:0}};
 return <>
  <Button variant="secondary" disabled={disabled} data-testid="creation-items-open" onClick={()=>setOpen(true)}>创建道具 · 拘束器</Button>
  <Modal open={open} title="创建道具 · 开局拘束器" className="creation-items-modal" onClose={()=>setOpen(false)}>
   <p>被囚者{wearerLevel!==undefined?`（${wearerLevel}级）`:''}在开场时佩戴怎样的束具？从名字、外形到束缚方式，都可以在这里设计。</p>
   
   <nav className="creation-item-tabs" aria-label="道具设计方式"><Button variant={mode==='host'?'primary':'secondary'} disabled={disabled} onClick={()=>setMode('host')} aria-pressed={mode==='host'}>主持人帮助</Button><Button data-testid="creation-item-manual" variant={mode==='manual'?'primary':'secondary'} disabled={disabled} onClick={()=>setMode('manual')} aria-pressed={mode==='manual'}>手工调整</Button></nav>
   {mode==='host'?<CreationItemAdvisor workspace={workspace} change={change} current={current} flush={flush} disabled={disabled} onWorking={onWorking} onSettings={onSettings}/>:<>
   <nav className="creation-item-tabs" aria-label="选择要修改的器具">{rows.map((row:any,index:number)=><Button key={index} variant={Math.min(selected,rows.length-1)===index?'primary':'secondary'} disabled={disabled} onClick={()=>setSelected(index)} aria-pressed={Math.min(selected,rows.length-1)===index}>{row.name||`器具${index+1}`}</Button>)}</nav>
   {rows.map((row:any,index:number)=>{if(index!==Math.min(selected,rows.length-1))return null;const t=templates.find(t=>t.id===row.templateId),binding=row.binding,limits=limitsFor(row,t);return <Panel key={index} title={`拘束器 ${index+1}`}>
    <fieldset disabled={disabled} data-testid={`creation-item-${index}`}>
     <CreationItemTemplateSelect templates={templates} wearerLevel={wearerLevel} index={index} value={row.templateId} disabled={disabled} onChange={templateId=>{const template=templates.find(t=>t.id===templateId);edit(index,{...structuredClone(template.draft),limits:undefined,binding:structuredClone(template.draft.binding)});}}/>
     <label>道具名称<input data-testid={`creation-item-name-${index}`} value={row.name} maxLength={40} onChange={e=>edit(index,{name:e.target.value})}/></label>
     <label>介绍<textarea data-testid={`creation-item-description-${index}`} value={row.description} maxLength={500} onChange={e=>edit(index,{description:e.target.value})}/></label>
     <label>构造与外观<textarea data-testid={`creation-item-appearance-${index}`} value={row.appearance} maxLength={500} onChange={e=>edit(index,{appearance:e.target.value})}/></label>
     <label>初始模式<select aria-label={`第${index+1}件初始模式`} data-testid={`creation-item-mode-${index}`} value={row.mode} onChange={e=>edit(index,{mode:e.target.value,limits:e.target.value==='limited'&&t.supportsFineLimits?limitsFor(row,t):undefined})}>{t.modes.map((m:any)=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
     {binding&&<ActionSection title={<>肢体拘束 · {binding.pose}{binding.part} · {binding.layers}层</>} className="creation-item-details"><div className="creation-items-grid">
      <label>拘束部位<select data-testid={`creation-item-part-${index}`} value={binding.part} onChange={e=>edit(index,{binding:{...binding,part:e.target.value}})}>{t.parts.map((v:string)=><option key={v}>{v}</option>)}</select></label>
      <label>拘束姿态<select data-testid={`creation-item-pose-${index}`} value={binding.pose} onChange={e=>edit(index,{binding:{...binding,pose:e.target.value}})}><option>身前</option><option>身后</option></select></label>
      <label>拘束层数<input data-testid={`creation-item-layers-${index}`} type="number" min={1} max={6} value={binding.layers} onChange={e=>edit(index,{binding:{...binding,layers:Number(e.target.value)}})}/></label>
      <label>挣脱难度加值<input data-testid={`creation-item-dc-${index}`} type="number" min={0} max={6} value={binding.difficultyBonus} onChange={e=>edit(index,{binding:{...binding,difficultyBonus:Number(e.target.value)}})}/></label>
      {t.modes.some((m:any)=>m.id==='limited')&&<label className="creation-items-checkbox"><input data-testid={`creation-item-retain-${index}`} type="checkbox" checked={binding.retainInLimited} onChange={e=>edit(index,{binding:{...binding,retainInLimited:e.target.checked}})}/>受限活动时保留肢体拘束</label>}
     </div></ActionSection>}
     {row.mode==='limited'&&t.supportsFineLimits&&<ActionSection title={<>魂力、伤害与能力许可</>} className="creation-item-details">
      <div className="creation-items-grid"><label>魂力开放比例（%）<input data-testid={`creation-item-soul-${index}`} type="number" min={0} max={100} value={limits.soulPowerPercent} onChange={e=>edit(index,{limits:{...limits,soulPowerPercent:Number(e.target.value)}})}/></label>
      {t.supportsDamage&&<label>伤害输出比例（%）<input data-testid={`creation-item-damage-${index}`} type="number" min={0} max={100} value={limits.damagePercent} onChange={e=>edit(index,{limits:{...limits,damagePercent:Number(e.target.value)}})}/></label>}
      <label>最高许可魂环阶<input data-testid={`creation-item-rank-${index}`} type="number" min={0} max={9} value={limits.permission?.maxCastRank??0} onChange={e=>edit(index,{limits:{...limits,permission:{...limits.permission,maxCastRank:Number(e.target.value)}}})}/></label></div>
      <fieldset><legend>允许使用的能力类别</legend><div className="creation-items-grid">{KINDS.map(([id,name])=><label className="creation-items-checkbox" key={id}><input data-testid={`creation-item-kind-${index}-${id}`} type="checkbox" checked={(limits.permission?.allowedKinds??[]).includes(id)} onChange={e=>edit(index,{limits:{...limits,permission:{...limits.permission,allowedKinds:e.target.checked?[...(limits.permission?.allowedKinds??[]),id]:(limits.permission?.allowedKinds??[]).filter((v:string)=>v!==id)}}})}/>{name}</label>)}</div></fieldset>
     </ActionSection>}
     {rows.length>1&&<Button variant="ghost" onClick={()=>set(rows.filter((_:any,i:number)=>i!==index))}>移除这件器具</Button>}
    </fieldset>
    {q?.items?.find((v:any)=>v.index===index)&&<p data-testid={`creation-item-quote-${index}`}>估价 {q.items.find((v:any)=>v.index===index).priceGold} 金 · 最高适用于{t.maxLevel}级 · 基础挣脱难度{t.breakDifficulty}{binding?`＋${binding.difficultyBonus} · ${binding.layers}层 · ${binding.pose}${binding.part}`:''}</p>}
   </Panel>;})}
   <Button disabled={disabled||rows.length>=6||!available} onClick={()=>{if(available){set([...rows,structuredClone(available.draft)]);setSelected(rows.length);}}} data-testid="creation-items-add">添加拘束器</Button>
   {query.loading&&<p role="status">正在核对器具配置…</p>}{query.error&&<p role="alert">{query.error}</p>}
   {q&&<div data-testid="creation-items-preview"><p>器具额度：{q.total} / {q.maximum}金</p>{q.errors?.map((v:string,i:number)=><p role="alert" key={i}>{v}</p>)}{q.pass&&<p>这套束具已准备好。</p>}</div>}
   </>}
   <Button disabled={disabled} onClick={()=>setOpen(false)}>返回角色创建</Button>
  </Modal>
 </>;
}
