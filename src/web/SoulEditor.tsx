import {playerCopy} from '../runtime/player-copy';
import {useGame} from './game-context';
import {useServerQuery} from './use-game-query';
import UiIcon from './components/UiIcon';
import RangeInput from './components/RangeInput';
import {useState,type ReactNode} from 'react';
import {useCreationCatalog} from './creation-context';
import {Button} from './components';
import {creationReason} from '../shared/creation-draft';
import ExchangeBuilder from './components/ExchangeBuilder';
import DisguiseBaseEditor from './components/DisguiseBaseEditor';

type Entry={id:string;name:string;[key:string]:any};
const entries=(value:any):Entry[]=>Object.values(value);

function ChoiceAdder({label,options,onAdd}:{label:string;options:Entry[];onAdd:(id:string)=>void}) {
  const [selection,setSelection]=useState('');
  return <div className="soul-editor__adder"><select aria-label={`选择${label}`} value={selection} onChange={event=>setSelection(event.target.value)}><option value="">选择{label}</option>{options.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><Button variant="secondary" disabled={!selection} onClick={()=>{onAdd(selection);setSelection('');}}>加入</Button></div>;
}
function TraitAdder({onAdd,templates,soul,group='traits'}:{onAdd:(value:any)=>void;templates:Entry[];soul:any;group?:'traits'|'weaknesses'}) {
  const catalog=useCreationCatalog(),{controller}=useGame(),friendly=(id:string)=>catalog.labels[id]??id;
  const [id,setId]=useState(''),[parameter,setParameter]=useState(''),[level,setLevel]=useState(1);
  const selected=soul[group]??[],parametersFor=(item:Entry)=>(catalog.soul.PARAMETER_OPTIONS[item.parameters]??[]).filter((value:string)=>
    (item.id!=='trait.attribute-mastery'||soul.attributes.some((entry:any)=>entry.id===value))&&
    (item.id!=='trait.channel-mastery'||soul.channels.includes(value))&&
    !selected.some((entry:any)=>entry.templateId===item.id&&entry.parameter===value));
  const canChoose=(item:Entry)=>item.parameters==='none'?!selected.some((entry:any)=>entry.templateId===item.id):parametersFor(item).length>0;
  const template=templates.find(item=>item.id===id),parameters=template?parametersFor(template):[];
  const ready=!!template&&canChoose(template)&&(template.parameters==='none'||parameters.includes(parameter)),value={templateId:id,parameter,level};
  const review=useServerQuery<any>('creation.trait-preview',{soul,group,value},{enabled:ready,delay:100});
  const addedConflicts=review.data?.addedConflicts??[];
  return <div className="soul-editor__trait-adder"><select aria-label={group==='traits'?'选择先天特性':'选择限制'} value={id} onChange={event=>{setId(event.target.value);setParameter('');setLevel(1);}}><option value="">{group==='traits'?'选择先天特性':'选择限制'}</option>{templates.map(item=><option key={item.id} value={item.id} disabled={!canChoose(item)}>{item.name}</option>)}</select>{template?.parameters!=='none'&&template&&<select aria-label="特性作用对象" value={parameter} onChange={event=>setParameter(event.target.value)}><option value="">选择作用对象</option>{parameters.map((v:string)=><option key={v} value={v}>{friendly(v)}</option>)}</select>}
  {template&&Number(template.maxLevel)>1&&<label>特性档位<select aria-label="特性档位" value={Math.min(level,template.maxLevel)} onChange={e=>setLevel(Number(e.target.value))}>{Array.from({length:template.maxLevel},(_,i)=><option key={i} value={i+1}>{i+1} 档</option>)}</select></label>}
  {template&&<div className="soul-trait-description"><strong>{template.name} · {group==='traits'?'先天特性':'武魂限制'}</strong><p>作用对象：{parameter?friendly(parameter):template.parameters==='none'?'自身／对应武魂':'待选择'}</p><p>{template.parameterMeanings[parameter]??template.meaning}</p><small>{template.timing}</small>{ready&&(review.data?<p>{review.data.cost<0?`返还 ${-review.data.cost}`:`消耗 ${review.data.cost}`} 造化点</p>:<p>{review.error??'正在计算点数…'}</p>)}</div>}
  {ready&&addedConflicts.map((entry:any,index:number)=><p key={index} role="alert">{creationReason(entry.reason)}</p>)}
  <Button variant="secondary" disabled={!ready||!review.data||!!review.error||addedConflicts.length>0} onClick={()=>{onAdd(value);setId('');setParameter('');setLevel(1);}}>加入</Button></div>;
}
function SelectedTrait({entry,index,group,price,onRemove}:{entry:any;index:number;group:'traits'|'weaknesses';price:any;onRemove:()=>void}){
 const catalog=useCreationCatalog(),template=catalog.soul[group==='traits'?'TRAIT_TEMPLATES':'WEAKNESS_TEMPLATES'].find((v:any)=>v.id===entry.templateId),row=price.ledger.find((v:any)=>v.id===`${entry.templateId}:${index}`);
 return <article className="soul-trait-description"><strong>{template?.name??entry.templateId} · {entry.level??1}档{entry.templateId==='trait.source-power'?`（${entry.level*5}%）`:''} · {group==='traits'?'先天特性':'武魂限制'}</strong><p>作用对象：{entry.parameter?catalog.labels[entry.parameter]??entry.parameter:'自身／对应武魂'}</p><p>{template?.parameterMeanings[entry.parameter]??template?.meaning}</p><p>{row?.cost<0?`返还 ${-row.cost}`:`消耗 ${row?.cost??0}`} 造化点</p><small>{template?.timing}</small><Button variant="ghost" onClick={onRemove}>移除{template?.name}</Button></article>;
}

export function SoulEditor({soul,inspection,problems,onText,onEdit,onReplaceEntry,disabled=false,illustration}:{illustration?:ReactNode;soul:any;inspection:any;problems:string[];onText:(field:string,value:string)=>void;onEdit:(operation:any)=>void;onReplaceEntry:(group:'attributes'|'baseAction',index:number,value:any)=>void;disabled?:boolean}) {
  const catalog=useCreationCatalog(),core=catalog.soul,friendly=(id:string)=>catalog.labels[id]??id;
  const normalized=soul;
  const price=inspection.pricing;
  return <fieldset className="soul-editor" disabled={disabled}>
    <div className="soul-editor__introduction">{illustration&&<div className="awakening-spirit-art">{illustration}</div>}<div className="soul-editor__identity"><label>武魂名称<input value={soul.name ?? ''} maxLength={30} onChange={event=>onText('name',event.target.value)}/></label><label>战斗定位<input value={soul.role ?? ''} onChange={event=>onText('role',event.target.value)} placeholder="例如：控制与守护"/></label><label>显化形态<textarea value={soul.form ?? ''} onChange={event=>onText('form',event.target.value)} placeholder="它出现时是什么模样？"/></label><label>核心概念<textarea value={playerCopy(soul.concept ?? '')} onChange={event=>onText('concept',event.target.value)} placeholder="它通过什么方式影响世界？"/></label></div></div>
    <section className="soul-editor__section"><h3>武魂类别</h3><div className="soul-editor__chips">{normalized.categories.map((id:string,index:number)=><button key={id} onClick={()=>onEdit({action:'remove',group:'categories',index})} title="移除此类别">{friendly(id)} ×</button>)}</div><ChoiceAdder label="类别" options={entries(core.CATEGORY_REGISTRY).filter(item=>item.selectable!==false&&!normalized.categories.includes(item.id))} onAdd={id=>onEdit({action:'add',group:'categories',value:id})}/></section>
    <section className="soul-editor__section"><h3>本源属性</h3><p>投入造化点，让今后获得的魂技更偏向这一属性。具体结果还取决于魂兽提供的属性。</p>{normalized.attributes.map((attribute:any,index:number)=>{
      const definition=core.ATTRIBUTE_REGISTRY[attribute.id],name=friendly(attribute.id);
      const update=(investment:number)=>onReplaceEntry('attributes',index,{id:attribute.id,investment});
      return <div className="soul-editor__investment" key={attribute.id}>
        <div className="soul-editor__investment-heading"><label htmlFor={`investment-${attribute.id}`}>{name}<small>投入造化点</small></label><b>{attribute.investment}<span> / {definition.maximumInvestment} 点</span></b><button className="icon-button" aria-label={`移除${name}属性`} onClick={()=>onEdit({action:'remove',group:'attributes',index})}>×</button></div>
        <div className="soul-editor__investment-control"><button aria-label={`减少${name}投入`} disabled={disabled||attribute.investment<=definition.minimumInvestment} onClick={()=>update(attribute.investment-1)}><UiIcon name="minus"/></button><RangeInput id={`investment-${attribute.id}`} type="range" min={definition.minimumInvestment} max={definition.maximumInvestment} step="1" value={attribute.investment} aria-label={`${name}投入造化点`} aria-valuetext={`${attribute.investment} 造化点`} onChange={event=>update(Number(event.target.value))}/><button aria-label={`增加${name}投入`} disabled={disabled||attribute.investment>=definition.maximumInvestment} onClick={()=>update(attribute.investment+1)}><UiIcon name="plus"/></button></div>
        <small className="soul-editor__investment-note">{definition.minimumInvestment} 点起选 · 每次增加 1 点投入{attribute.investment===definition.maximumInvestment?' · 已达上限':''}</small>
      </div>;
    })}<ChoiceAdder label="属性" options={entries(core.ATTRIBUTE_REGISTRY).filter(item=>!normalized.attributes.some((entry:any)=>entry.id===item.id)).map(item=>({...item,name:`${item.name} · ${item.minimumInvestment} 点起`}))} onAdd={id=>onEdit({action:'add',group:'attributes',value:{id,investment:core.ATTRIBUTE_REGISTRY[id].minimumInvestment}})}/></section>
    <section className="soul-editor__section"><h3>能力方向</h3><p>这些方向决定你的武魂能成长出怎样的魂技。</p><div className="soul-editor__chips">{normalized.channels.map((id:string,index:number)=><button key={id} onClick={()=>onEdit({action:'remove',group:'channels',index})}>{friendly(id)} ×</button>)}</div><ChoiceAdder label="能力方向" options={entries(core.CHANNEL_REGISTRY).filter(item=>!normalized.channels.includes(item.id))} onAdd={id=>onEdit({action:'add',group:'channels',value:id})}/></section>
    <section className="soul-editor__section"><h3>本能动作</h3><p>尚未获得魂环时，也能使用武魂本能参与战斗。</p><div className="soul-editor__base"><label>方式<select value={normalized.baseAction.mode} onChange={event=>onReplaceEntry('baseAction',0,{...normalized.baseAction,mode:event.target.value})}><option value="">选择方式</option>{entries(core.BASE_ACTION_MODES).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>使用属性<select value={normalized.baseAction.attributeId} onChange={event=>onReplaceEntry('baseAction',0,{...normalized.baseAction,attributeId:event.target.value})}><option value="">选择已有属性</option>{normalized.attributes.map((item:any)=><option key={item.id} value={item.id}>{friendly(item.id)}</option>)}</select></label>{!['disguise','aura'].includes(normalized.baseAction.mode)&&<label>威力<select value={normalized.baseAction.powerTier} onChange={event=>onReplaceEntry('baseAction',0,{...normalized.baseAction,powerTier:Number(event.target.value)})}><option value="0">基础</option><option value="1">增强</option><option value="2">强力</option></select></label>}</div>{normalized.baseAction.mode==='disguise'&&<DisguiseBaseEditor value={normalized.baseAction.disguise} disabled={disabled} onChange={disguise=>onReplaceEntry('baseAction',0,{...normalized.baseAction,disguise})}/>}</section>
    <details className="soul-editor__section"><summary>先天特性与限制</summary><p>每项特性与限制分别列出触发和结束时机；本源属性与能力方向会影响今后领悟的魂技。</p>{(['traits','weaknesses'] as const).map(group=><section key={group}><h4>{group==='traits'?'先天特性':'武魂限制'}</h4>{normalized[group].map((entry:any,index:number)=><SelectedTrait key={`${entry.templateId}:${index}`} entry={entry} index={index} group={group} price={price} onRemove={()=>onEdit({action:'remove',group,index})}/>)}<TraitAdder soul={soul} group={group} templates={core[group==='traits'?'TRAIT_TEMPLATES':'WEAKNESS_TEMPLATES']} onAdd={value=>onEdit({action:'add',group,value})}/></section>)}<p>这些限制可返还 {price.refunds} 造化点，当前最多返还 {price.refundCap} 点，已返还 {price.appliedRefund} 点。超出上限时，请减少部分限制后继续。</p></details>
    <ExchangeBuilder contracts={normalized.exchangeContracts??[]} components={normalized.traits.map((t:any,i:number)=>({id:`${t.templateId}:${i}`,name:friendly(t.templateId)}))} onAdd={value=>onEdit({action:'add',group:'exchangeContracts',value})} onRemove={index=>onEdit({action:'remove',group:'exchangeContracts',index})}/>
    <div className="soul-editor__verdict"><span>{inspection.quality?.name ?? '待定'} · {price.total} 造化点</span>{problems.length ? <ul>{problems.map((problem,index)=><li key={index}>{creationReason(problem)}</li>)}</ul> : <p>这份武魂设定已完整，可以继续讨论或进入觉醒预览。</p>}</div>
  </fieldset>;
}
