import {playerDescription} from '../../runtime/player-copy';
import {useState} from 'react';
import QuerySurface from './QuerySurface';
import {useServerQuery,useSceneQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
import {playerText} from '../../runtime/player-text';
import {Button,Modal,Panel} from '../components';
import {useGame} from '../game-context';
import type {EconomySelection} from './EconomyDialog';
import ItemDetails,{ItemActionDialog} from './ItemDetails';
import GradeBadge from './GradeBadge';
import RelicIllustration from './RelicIllustration';
import AuctionHouse from './AuctionHouse';
import ActionError from './ActionError';
import {useActionFeedback} from '../use-action-feedback';
import BatchTradeDialog,{type BatchTradeRow} from './BatchTradeDialog';

function AuctionEntry(){
 const params=new URLSearchParams(location.hash.split('?')[1]??''),initialOpen=params.get('auction')==='1',personId=params.get('personId')??'',auctionId=params.get('auctionId')??'',sessionId=params.get('sessionId')??'';
 const [open,setOpen]=useState(initialOpen),[visited,setVisited]=useState(initialOpen),[includeCatalog,setCatalog]=useState(false),[includeConsign,setConsign]=useState(Boolean(personId)),query=useServerQuery<any>('inventory.auction',{includeCatalog,includeConsign},{enabled:open,keepPrevious:true});
 return <section><Button variant="secondary" aria-expanded={open} onClick={()=>{setVisited(true);setOpen(value=>!value);}}>{open?'收起拍卖中心':'查看拍卖与委托'}</Button>{visited&&<div hidden={!open}><QuerySurface query={query}>{query.data&&<AuctionHouse initialSessionId={sessionId} initialPersonId={personId} initialAuctionId={auctionId} facts={query.data.auction} items={query.data.auctionItems??[]} onCatalogToggle={setCatalog} onConsignToggle={setConsign}/>}</QuerySurface></div>}</section>;
}

export default function InventoryServices({onTrade}:{onTrade:(value:EconomySelection)=>void}) {
  const {state,controller,view}=useGame();
  const restockFeedback = useActionFeedback();
  const [inspect,setInspect]=useState<any>(null);
  const [buying,setBuying]=useState<{shopId:string;initialKey?:string}|null>(null);
  const [action,setAction]=useState<Record<string,any>|null>(null);
  const [modifier,setModifier]=useState(''),[page,setPage]=useState(0),[stockFilter,setStockFilter]=useState('全部');
  const id=state.角色.主控单位ID;
  const unit=state.战斗单位.列表[id];
  const locationId=state.地图.当前地点ID;
  const shops=(Object.values(state.商店?.列表??{}) as any[]).filter(shop=>shop.locationId===locationId&&shop.status==='open'&&!shop.infinite&&!shop.扩展?.regional);
  const query=useServerQuery<any>('inventory.services');
  if(!query.data)return <QueryStatus query={query}/>;
  const facts=query.data,service=facts.service,supplies=facts.supplies.filter((entry:any)=>stockFilter==='全部'||(stockFilter==='设计图纸'?entry.type==='图纸':entry.type!=='图纸')),pageCount=Math.max(1,Math.ceil(supplies.length/30)),pageIndex=Math.min(page,pageCount-1),visibleSupplies=supplies.slice(pageIndex*30,pageIndex*30+30);
  const food=Boolean(unit?.扩展?.辅助能力?.食品制造||unit?.标签?.includes('食物系'));
  const modifiers=(unit.能力.技能ID as string[]).map(skillId=>state.技能.列表[skillId]).filter(skill=>skill?.effectGraph?.nodes?.some((node:any)=>node.effectId==='modifier.next_skill'));
  const selectedModifier=modifiers.some(skill=>skill.id===modifier)?modifier:'';
  const restock = (shopId: string) => restockFeedback.run(() => controller.dispatch('world.intent', {type: 'restock-shop', shopId}));
  return <div className="inventory-services">
    <ActionError message={restockFeedback.error} onDismiss={restockFeedback.dismiss}/>
    {restockFeedback.success && <p role="status">{restockFeedback.success}</p>}
    <AuctionEntry/>
    {(service||shops.length>0)&&<div className="card-actions"><a className="button button--secondary" href="#/inventory?tab=items">出售随身物品／丹药</a></div>}
    {service&&<Panel title={service.name} eyebrow={state.地图.地点[locationId]?.name} actions={<Button variant="secondary" onClick={()=>setBuying({shopId:service.id})}>批量采购</Button>}><p className="muted">通常按估价的48%回收物品和材料，协议价以当前报价为准。制式货品每三日补货，已付款的订单一日后到货。</p><div className="card-actions"><a className="button button--ghost" href="#/inventory?tab=materials">出售猎获材料</a><a className="button button--ghost" href="#/inventory?tab=research">前往{service.workshopName??'当地工坊'}</a></div>{facts.supplyOrders?.map((o:any)=><p key={o.id}>在途补货：{o.lines.map((l:any)=>`${l.name}×${l.quantity}`).join('、')} · 第{Math.floor(o.arrivesAt/1440)}日 {Math.floor(o.arrivesAt%1440/60)}:{String(o.arrivesAt%60).padStart(2,'0')}到货</p>)}{pageCount>1&&<div className="field-actions"><Button variant="ghost" disabled={pageIndex===0} onClick={()=>setPage(pageIndex-1)}>上一页</Button><span>{pageIndex+1} / {pageCount}</span><Button variant="ghost" disabled={pageIndex+1>=pageCount} onClick={()=>setPage(pageIndex+1)}>下一页</Button></div>}<nav className="card-actions" aria-label="商店商品分类">{['全部','设计图纸','其他商品'].map(label=><Button key={label} variant={stockFilter===label?'primary':'ghost'} aria-pressed={stockFilter===label} onClick={()=>{setStockFilter(label);setPage(0);}}>{label}</Button>)}</nav>{['设计图纸','制式','精品','回收精选','材料'].map(category=>{const rows=visibleSupplies.filter((v:any)=>v.category===category);return rows.length>0&&<section key={category}><h3>{category}</h3><div className="supply-catalog">{rows.map((entry:any)=><article key={entry.kind+':'+(entry.fingerprint??entry.itemIds[0]??entry.templateId)} data-grade={entry.grade?.id}><RelicIllustration item={entry.item??entry} kind={entry.type??'消耗品'} name={entry.name}/><div><h3>{entry.name}</h3>{entry.grade&&<GradeBadge grade={entry.grade}/>}<p>{entry.value.toLocaleString()}金币/份 · 库存 {entry.quantity}</p><p>{playerDescription(entry.description)}</p>{entry.material&&<small>{entry.material.quality} · 材料</small>}</div><div className="card-actions">{entry.kind==='item'&&<Button variant="ghost" onClick={()=>setInspect(entry.item??{templateId:entry.templateId,name:entry.name,type:entry.type,quantity:1,quality:'普通'})}>查看能力</Button>}<Button variant="secondary" disabled={view.busy||entry.quantity<1} onClick={()=>entry.kind==='item'?onTrade({type:'supply.buy',templateId:entry.templateId,shopId:entry.shopId??service.id,name:entry.name}):setBuying({shopId:entry.shopId??service.id,initialKey:'material:'+entry.fingerprint})}>购买</Button></div></article>)}</div></section>})}</Panel>}
    {shops.map(shop=><Panel key={shop.id} title={playerText(shop.name,state,'当地商店')} eyebrow="当前地点" actions={<><Button variant="secondary" onClick={()=>setBuying({shopId:shop.id})}>批量采购</Button>{state.世界.时间.day>=shop.restockDay&&<Button variant="ghost" disabled={view.busy} onClick={()=>void restock(shop.id)}>到期补货</Button>}</>}><div className="supply-catalog">{(state.容器.列表[shop.stockContainerId]?.itemIds??[]).map((itemId:string)=>{const item=state.物品.实例[itemId];if(!item)return null;const quote=facts.quotations[shop.id+':'+item.id];return <article key={item.id} data-grade={facts.grades[item.id]?.id}><RelicIllustration item={item} kind={item.type} name={item.name}/><div><h3>{playerText(item.name,state,'商店货品')}</h3><GradeBadge grade={facts.grades[item.id]}/><p>{playerText(item.type,state,'物品')} · {quote?.currencyText??'暂不可报价'}</p></div><div className="card-actions"><Button variant="ghost" onClick={()=>setInspect(item)}>查看能力</Button><Button variant="secondary" disabled={!quote} onClick={()=>setBuying({shopId:shop.id,initialKey:'item:'+item.id})}>购买</Button></div></article>})}</div></Panel>)}
    {!service&&!shops.length&&<div className="archive-empty"><h2>{facts.cityBusiness?.currentBusiness==='unattended'?'商行暂歇':facts.cityBusiness?.currentBusiness==='closed'?'商行已停业':'此地暂无商店'}</h2><p>{facts.cityBusiness?.currentBusiness==='unattended'?'掌柜目前不在店内，补给、回收与工坊服务暂停。可以查看当地公告、安排其他事情，或前往别处的商行。':facts.cityBusiness?.currentBusiness==='closed'?'此处商行已无法提供服务，可以前往其他城镇准备补给。':'前往有人烟的城镇，或到猎魂森林入口准备补给。地图上的商行也提供材料回收与工坊服务。'}</p><a className="button button--secondary" href="#/adventure">查看地图</a></div>}
    {food&&<Panel title="食物系工艺" eyebrow="随身制作"><p className="muted">以魂力制作辅助食品。每种配方分别限制使用次数，并有自己的等待时间。</p>{modifiers.length>0&&<label>制造增幅<select value={selectedModifier} onChange={event=>setModifier(event.target.value)}><option value="">不附加增幅</option>{modifiers.map(skill=><option key={skill.id} value={skill.id}>{playerText(skill.name,state,'增幅能力')}</option>)}</select></label>}<div className="supply-catalog">{Object.entries(facts.recipes).map(([recipeId,recipe]:[string,any])=><article key={recipeId}><RelicIllustration kind="辅助食品" name={recipe.name}/><div><h3>{recipe.name}</h3><p>魂力 {recipe.soulPowerCost} · 保质 {recipe.shelfLifeDays} 日</p>{recipe.dailyLimit>0&&<p>每日 {recipe.dailyLimit} 次</p>}{recipe.worldCooldownDays>0&&<p>制造后等待 {recipe.worldCooldownDays} 日</p>}</div><Button variant="secondary" disabled={view.busy} onClick={()=>setAction({type:'create-support-consumable',entityId:id,recipeId,...(selectedModifier?{modifierSkillId:selectedModifier}:{})})}>查看并制造</Button></article>)}</div></Panel>}
    {buying&&<BatchTradeDialog direction="buy" shopId={buying.shopId} initialKey={buying.initialKey} rows={([...(facts.supplies??[]).filter((e:any)=>(e.shopId??service?.id)===buying.shopId&&e.kind==='material').map((e:any)=>({kind:'material',fingerprint:e.fingerprint,name:e.name,quantity:e.quantity})),...(state.容器.列表[state.商店.列表[buying.shopId]?.stockContainerId]?.itemIds??[]).map((itemId:string)=>state.物品.实例[itemId]).filter(Boolean).map((item:any)=>({kind:'item',itemId:item.id,name:playerText(item.name,state),quantity:item.quantity}))] as BatchTradeRow[]).filter(row=>!buying.initialKey||row.kind+':'+(row.itemId??row.fingerprint)===buying.initialKey)} onClose={()=>setBuying(null)}/>}{inspect&&<Modal open dismissOnBackdrop={false} title={playerText(inspect.name,state,'物品详情')} onClose={()=>setInspect(null)}><ItemDetails item={inspect} catalog/></Modal>}
    {action&&<ItemActionDialog intent={action} onClose={()=>setAction(null)}/>}
  </div>;
}
