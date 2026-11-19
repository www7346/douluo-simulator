import {useRef,useState} from 'react';
import {Button,Modal} from '../components';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import {playerDescription} from '../../runtime/player-copy';
import {playerText} from '../../runtime/player-text';
import {useActionFeedback} from '../use-action-feedback';
import ActionError from './ActionError';
import EconomyDialog,{type EconomySelection} from './EconomyDialog';
import QueryStatus from './QueryStatus';
import RelicIllustration from './RelicIllustration';
import AbilityDetails from './AbilityDetails';
import ItemDetails from './ItemDetails';

export type WorkshopIndexQuery=ReturnType<typeof useServerQuery<any>>;

export default function WorkshopBlueprints({index,category,selected,onSelect,design=false,onAdopt,onShowAll}:{index:WorkshopIndexQuery;category:string;selected:string;onSelect:(id:string)=>void;design?:boolean;onAdopt:(id:string)=>void;onShowAll:()=>void}){
 const {state,view,controller}=useGame(),feedback=useActionFeedback();
 const [search,setSearch]=useState(''),[craft,setCraft]=useState<EconomySelection|null>(null),[deviceConfirm,setDeviceConfirm]=useState<any>(null),[completed,setCompleted]=useState('');
 const crafting=useRef(false),deviceQuote=useServerQuery<any>('world.preview',{type:'intimate-craft',templateId:deviceConfirm?.id??''},{enabled:!!deviceConfirm});
 const self=state.角色.主控单位ID,text=(value:unknown,fallback='图纸')=>playerText(value,state,fallback);
 const blueprints=[...Object.values(state.研发?.蓝图??{}).filter((entry:any)=>entry.ownerId===self),...(index.data?.keyBlueprints??[]),...(index.data?.presetBlueprints??[])].map((entry:any)=>({...entry,kind:entry.category}));
 const templates=(index.data?.deviceTemplates??[]).map((entry:any)=>({...entry,kind:'情具',template:true}));
 const entries:any[]=(design?templates:[...blueprints,...templates]).filter((entry:any)=>(category==='全部'||entry.kind===category)&&text(entry.name).includes(search.trim()));
 const current=entries.find(entry=>entry.id===selected)??entries[0];
 const produce=async()=>{
  if(!deviceConfirm||crafting.current||view.busy||deviceQuote.loading||!deviceQuote.data?.available)return;
  crafting.current=true;
  const name=deviceConfirm.name;
  try{const result=await feedback.run(()=>controller.dispatch('world.intent',{type:'intimate-craft',templateId:deviceConfirm.id}));
   if(result){setDeviceConfirm(null);setCompleted(name);}
  }finally{crafting.current=false;}
 };
 return <div className="workshop-blueprints">
  <header><div><h2>{design?'情具通用图纸':'选择制作图纸'}</h2><p>{design?'现有制式可以直接采用，选定后到“按图制作”核对消耗。':'选择一张图纸，查看效果和用料，再确认制作。'}</p></div><div className="workshop-blueprint-filters">{!design&&<Button variant="ghost" aria-pressed={category==='全部'} onClick={onShowAll}>全部图纸</Button>}<input aria-label="寻找工坊图纸" placeholder="按图纸名称寻找…" value={search} onChange={event=>setSearch(event.target.value)}/></div></header>
  <QueryStatus query={index}/><ActionError message={feedback.error} onDismiss={feedback.dismiss}/>
  {completed&&<p role="status">「{completed}」已制作完成，收入行囊。</p>}
  <div className="workshop-blueprints-layout"><section className="workshop-blueprint-list" aria-label="工坊图纸列表">{entries.map(entry=><button key={entry.id} aria-pressed={current?.id===entry.id} className={current?.id===entry.id?'is-selected':''} onClick={()=>onSelect(entry.id)}><RelicIllustration item={entry.template?{templateId:entry.id}:entry} kind={entry.template?'情具':'图纸'} name={text(entry.name)}/><span><strong>{text(entry.name)}</strong><small>{entry.kind}{entry.template?' · 通用图纸':entry.knowledgeOrigin?.access==='public'?' · 基础开放':' · 已掌握'}</small></span></button>)}{!entries.length&&!index.loading&&<p>这个类别还没有已掌握的图纸。基础图纸会直接开放，高级图纸可到城市商店或拍卖行购买并学习，也可自行研发。</p>}</section>
  {current&&<aside className="workshop-blueprint-details" aria-label="图纸详情"><h2>{text(current.name)}</h2><RelicIllustration item={current.template?{templateId:current.id}:current} kind={current.template?'情具':'图纸'} name={text(current.name)} large/>
   {current.template?<ItemDetails item={{templateId:current.id,name:current.name,type:'情具',quantity:1}} catalog/>:<><p>{text(playerDescription(current.description),'已定稿的制作图纸。')}</p>{current.productKind!=='device-key'&&<AbilityDetails skill={current.mechanics} showName={false}/>}<h3>用料要求</h3><ul>{(current.bridgeClauses??[]).map((clause:any,i:number)=><li key={i}>{clause.anyOf.map((entry:string)=>text(entry,'材料特性')).join(' 或 ')}</li>)}</ul></>}
   {current.template&&<p className="workshop-blueprint-cost">制作消耗：{current.price} 金币 · 5 分钟</p>}
   <div className="workshop-blueprint-action"><Button disabled={view.busy||index.loading||!!index.error} onClick={()=>design?onAdopt(current.id):current.template?setDeviceConfirm(current):setCraft({type:'blueprint.craft',blueprintId:current.id,name:text(current.name)})}>{design?'采用图纸并前往制作':current.template?'核对费用并制作':'核对材料并制作'}</Button></div>
  </aside>}</div>
  {craft&&<EconomyDialog selection={craft} onClose={()=>setCraft(null)} returnLabel="返回工坊"/>}
  <Modal open={!!deviceConfirm} dismissOnBackdrop={false} title="确认按图制作" onClose={()=>setDeviceConfirm(null)} actions={<><Button variant="ghost" disabled={view.busy} onClick={()=>setDeviceConfirm(null)}>返回修改</Button><Button disabled={view.busy||deviceQuote.loading||!!deviceQuote.error||!deviceQuote.data?.available} onClick={()=>void produce()}>确认制作</Button></>}><p>{deviceConfirm?.name}</p><p>消耗 {deviceConfirm?.price} 金币，用时 5 分钟，获得 1 件成品。</p><p>持有 {index.data?.gold??'—'} 金币</p><QueryStatus query={deviceQuote}/>{deviceQuote.data&&!deviceQuote.data.available&&<p role="status">{text(deviceQuote.data.reason,'当前不能制作')}</p>}<ActionError message={feedback.error} onDismiss={feedback.dismiss}/></Modal>
 </div>;
}
