import BatchTradeDialog from '../components/BatchTradeDialog';
import LootAllocations from '../components/LootAllocations';
import {useEffect,useRef,useState} from 'react';
import {readWorkspaceView,saveWorkspaceView} from '../workspace-view-memory';
import {useSceneQuery,useServerQuery} from '../use-game-query';
import QueryStatus from '../components/QueryStatus';
import QuerySurface from '../components/QuerySurface';

import {materialName,playerText} from '../../runtime/player-text';
import {Button,EmptyState,Modal,SoulRingHalo,ModalActions} from '../components';
import {useGame} from '../game-context';
import EconomyDialog,{type EconomySelection} from '../components/EconomyDialog';
import Workshop from '../components/Workshop';
import RingItemDialog from '../components/RingItemDialog';
import {RingChoices} from '../components/RingWorkbench';
import {DefenseDetails} from '../components/AbilityDetails';
import ItemDetails,{ItemActionDialog,MedicineStatePanel} from '../components/ItemDetails';
import InventoryServices from '../components/InventoryServices';
import RelicIllustration from '../components/RelicIllustration';
import GradeBadge from '../components/GradeBadge';
import MaterialFacts from '../components/MaterialFacts';
import FieldItemUse,{PrebattlePillUse} from '../components/FieldItemUse';
import PreparedPills from '../components/PreparedPills';
import {PersonWornRestraints} from '../components/WornRestraints';
import {PortraitImage} from '../components/PortraitArt';
function InventoryRingArt({item}:{item:any}){const source=item.payload.ringSource;return <div className="inventory-ring-art"><SoulRingHalo years={source.years}/>{source.kind==='boon-ring'&&<PortraitImage art={{src:`/art/opening-boons/${source.sourceId}.webp`,cell:0,columns:1,rows:1}} name="恩赐来源" className="inventory-ring-art__source"/>}</div>;}

function SelectedItemUse({item}:{item:any}){
 const {state}=useGame(),query=useServerQuery<any>('inventory.selected-use',{itemId:item.id}),f=query.data;
 if(!f)return <QueryStatus query={query}/>;
 if(f.direct)return null;
 if(state.战斗.状态==='进行中')return <a className="button button--secondary" href={`#/battle?item=${encodeURIComponent(item.id)}`}>在战斗中使用</a>;
 if(f.preparation?.supported)return <PrebattlePillUse itemId={item.id} facts={f.preparation}/>;
 if(f.restoration&&!/战外只能|不能在战外/.test(f.restoration.reason??''))return <FieldItemUse itemId={item.id} facts={f.restoration}/>;
 return <p className="muted">进入战斗后，从行动栏选择此物品使用。</p>;
}

function SelectedItemSale({item,shopId,onSelect}:{item:any;shopId?:string;onSelect:(selection:EconomySelection)=>void}){
 const {state,view}=useGame();
 const selection:EconomySelection=shopId?{type:'sell',shopId,itemId:item.id,name:playerText(item.name,state)}:{type:'item.sell',itemId:item.id,name:playerText(item.name,state)};
 const query=useServerQuery<any>('inventory.economy',{...selection,quantity:1}),quote=query.data;
 return <section className="item-sale-action" aria-label="出售这件物品"><Button variant="ghost" disabled={view.busy||!quote?.pass} onClick={()=>onSelect(selection)}>出售这件物品</Button>{!quote?<QueryStatus query={query}/>:<p className="muted">{quote.pass?`预计回收：${quote.totalCurrency??`${quote.totalGold??0}金币`}`:playerText(quote.message,state,'此物品目前无法出售')}</p>}</section>;
}

const TABS=['随身珍藏','猎获材料','工艺图纸','研制新作','补给商店','地点寄存'];
const TAB_KEYS=['items','materials','blueprints','research','services','stored'];
const TOP_LEVEL=[0,1,3,4,5];
function InventoryNavigation({tab,counts,onSelect}:{tab:string;counts:Record<string,number>;onSelect:(tab:string)=>void}){
 return <nav className="relic-navigation" aria-label="行囊分类">{TOP_LEVEL.map(index=>{
  const entry=TABS[index],active=index===3?[TABS[2],TABS[3]].includes(tab):tab===entry;
  const count=counts[entry]??counts[index===3?'blueprints':TAB_KEYS[index]];
  return <button key={entry} className={active?'is-active':''} aria-current={active?'page':undefined} onClick={()=>{if(!active)onSelect(entry);}}><span>{index===3?'工坊':entry}</span>{Boolean(count)&&<small>{count}</small>}</button>;
 })}</nav>;
}
function routeTab(){const key=new URLSearchParams(location.hash.split('?')[1]??'').get('tab')??'';return TABS[Math.max(0,TAB_KEYS.indexOf(key))]}
const FILTERS=['全部','魂环','魂导器','魂骨','消耗品','毒药','拘束器','情具','暗器','工具','其他'];

export default function InventoryPage() {
  const {controller,state,view}=useGame();
  const scope=`${view.profileId}:${state.扩展?.story?.branchId??''}`;
  const [tab,setTab]=useState(routeTab);
  const [category,setCategory]=useState(()=>readWorkspaceView(scope,routeTab()).category);
  const [search,setSearch]=useState(()=>readWorkspaceView(scope,routeTab()).search);
  const [selected,setSelected]=useState(()=>readWorkspaceView(scope,routeTab()).selected);
  const [page,setPage]=useState(()=>readWorkspaceView(scope,routeTab()).page);
  const scrollReady=useRef(false),remembered=useRef({category,search,selected,page});remembered.current={category,search,selected,page};
  const [transaction,setTransactionState]=useState<EconomySelection|null>(null);
  const [bulkSell,setBulkSell]=useState(false);
  const [action,setActionState]=useState<Record<string,any>|null>(null);
  const [ringItemId,setRingItemId]=useState('');
  const [mobileDetails,setMobileDetails]=useState(false);
  // Keep this breakpoint aligned with the single-column relic library in fantasy-interiors.css.
  const [narrow,setNarrow]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width:800px)').matches);
  useEffect(()=>{const query=window.matchMedia('(max-width:800px)');const update=()=>setNarrow(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);
  useEffect(()=>{const update=()=>{const nextTab=routeTab();if(nextTab===tab)return;const saved=readWorkspaceView(scope,nextTab);scrollReady.current=false;setTab(nextTab);setCategory(saved.category);setSearch(saved.search);setSelected(saved.selected);setPage(saved.page);setMobileDetails(false)};window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update)},[scope,tab]);
  const setTransaction=(next:EconomySelection|null)=>{setMobileDetails(false);setTransactionState(next)};
  const setAction=(next:Record<string,any>|null)=>{setMobileDetails(false);setActionState(next)};
  const id=state.角色?.主控单位ID;
  const workshop=[TABS[2],TABS[3]].includes(tab);
  const query=useSceneQuery<any>('inventory.index',{section:workshop?'blueprints':tab===TABS[4]?'summary':TAB_KEYS[TABS.indexOf(tab)]},id??'');
  useEffect(()=>{const save=()=>{if(scrollReady.current)saveWorkspaceView(scope,tab,{...remembered.current,scroll:window.scrollY});};window.addEventListener('scroll',save,{passive:true});return()=>{save();window.removeEventListener('scroll',save);};},[scope,tab]);
  useEffect(()=>{if(!scrollReady.current)return;const previous=readWorkspaceView(scope,tab);saveWorkspaceView(scope,tab,{category,search,selected,page,scroll:previous.scroll});},[scope,tab,category,search,selected,page]);
  useEffect(()=>{if(scrollReady.current||!query.data&&tab!==TABS[3])return;const task=requestAnimationFrame(()=>{window.scrollTo({top:readWorkspaceView(scope,tab).scroll,behavior:'instant'});scrollReady.current=true;});return()=>cancelAnimationFrame(task);},[scope,tab,query.data]);
  if(!id)return <EmptyState title="行囊尚未开启">完成觉醒后，物品、材料、图纸和制造记录会汇集于此。</EmptyState>;
  const selectTab=(next:string)=>{saveWorkspaceView(scope,tab,{...remembered.current,scroll:window.scrollY});setMobileDetails(false);const query=new URLSearchParams(location.hash.split('?')[1]??'');query.set('tab',TAB_KEYS[TABS.indexOf(next)]);location.hash=`/inventory?${query}`};
  // Crafting has its own queries; an inventory refresh must not unmount pending choices.
  if(workshop)return <div className="relic-archive relic-archive--workshop"><header className="relic-archive__heading"><div><span className="eyebrow">大陆纪行 · 珍藏卷</span><h1>工坊</h1><p>设计图纸，按图制作</p></div><div className="relic-wallet"><span>随身钱币</span><strong>{query.data?.currency??'读取中…'}</strong></div></header><div className="relic-archive__body"><InventoryNavigation tab={tab} counts={query.data?.counts??{}} onSelect={selectTab}/><Workshop index={query} key={`${view.profileId}:${view.sessionId}`} mode={tab===TABS[2]?'craft':'design'} onMode={mode=>selectTab(TABS[mode==='craft'?2:3])}/></div></div>;
  if(!query.data)return <QueryStatus query={query}/>;
  const facts=query.data;
  const person=state.人物.列表[id];
  const container=state.容器.列表[person.inventoryContainerId];
  const items=(container.itemIds as string[]).map(itemId=>state.物品.实例[itemId]).filter(item=>item&&facts.ownedIds.includes(item.id));
  const materials=(Object.values(state.材料库?.永久??{}) as any[]).filter(stack=>stack.quantity>0);
  const stored=facts.stored;
  const equipment=state.装备.配置[id];
  const locationId=state.地图.当前地点ID;
  const localService=facts.service;
  const shops=(Object.values(state.商店?.列表??{}) as any[]).filter(shop=>shop.locationId===locationId&&shop.status==='open'&&!shop.infinite);
  const text=(value:unknown,fallback='珍藏物品')=>playerText(value,state,fallback);
  const kind=(item:any)=>{const type=facts.itemKinds[item.id]??item.type;return ['辅助食品','丹药','消耗品'].includes(type)?'消耗品':FILTERS.includes(type)?type:'其他'};
  const isMaterials=tab===TABS[1];
  const itemGroups=new Map<string,{id:string;memberIds:string[];totalQuantity:number}>();
  for(const group of facts.itemGroups??[])for(const memberId of group.memberIds)itemGroups.set(memberId,group);
  const groupOf=(entry:any)=>itemGroups.get(entry.id)??{id:entry.id,memberIds:[entry.id],totalQuantity:entry.quantity??1};
  const entries=isMaterials?materials:items.filter(item=>groupOf(item).id===item.id).filter(item=>category==='全部'||kind(item)===category);
  const grade=(entry:any)=>isMaterials?null:facts.itemGrades[entry.id];
  const name=(entry:any)=>isMaterials?materialName(entry,state):text(facts.itemNames?.[entry.id]??entry.name,'工坊作品');
  const key=(entry:any)=>entry.fingerprint??entry.id;
  const shown=entries.filter(entry=>{
    if(!isMaterials)return name(entry).includes(search.trim());
    const materialInfo=facts.materials[entry.fingerprint];
    if(!materialInfo)return name(entry).includes(search.trim());
    return materialInfo.searchText.includes(search.trim());
  });
  const pageCount=Math.max(1,Math.ceil(shown.length/30)),pageIndex=Math.min(page,pageCount-1),visible=shown.slice(pageIndex*30,pageIndex*30+30);
  const selectedEntry=shown.find(entry=>isMaterials?key(entry)===selected:groupOf(entry).memberIds.includes(selected))??visible[0];
  const current=!isMaterials&&selectedEntry&&groupOf(selectedEntry).memberIds.includes(selected)?state.物品.实例[selected]:selectedEntry;
  const inventoryTab=[TABS[0],TABS[1]].includes(tab);
  const run=async(type:string,payload:Record<string,unknown>)=>{try{await controller.dispatch(type,payload)}catch{}};
  const slotOf=(itemId:string)=>Object.entries(equipment.slots).find(([,value])=>value===itemId)?.[0];
  const counts:Record<string,number>={[TABS[0]]:items.length,[TABS[1]]:materials.length,[TABS[3]]:facts.counts.blueprints,[TABS[5]]:facts.counts.stored};


  const detail=current ? <aside className="relic-inspection" aria-label="所选珍藏详情" key={`${tab}:${key(current)}`}>
              <div className="relic-inspection__hero" data-grade={grade(current)?.id}>{facts.ringIds.includes(current.id)?<InventoryRingArt item={current}/>:<RelicIllustration item={current} kind={isMaterials?'材料':current.type} name={name(current)} large/>}<span className="eyebrow">{isMaterials?'猎获材料':text(current.type,'珍藏')}</span><h2>{name(current)}</h2></div>
                {isMaterials?<><MaterialFacts material={current}/><p className="muted">可用于研制新作，或按图纸制造。工艺价值用于比较用料，出售所得请查看报价。</p><ModalActions disabled={query.loading||Boolean(query.error)}><strong>{name(current)}</strong><Button onClick={()=>selectTab(TABS[3])}>前往工坊选材</Button>{localService&&<Button variant="ghost" onClick={()=>setBulkSell(true)}>选择材料统一回收</Button>}</ModalActions></>
                :<>{groupOf(current).memberIds.length>1&&<label>同款物品 · {groupOf(current).totalQuantity}件<select aria-label="选择同款物品" value={current.id} onChange={event=>setSelected(event.target.value)}>{groupOf(current).memberIds.map((memberId:string,index:number)=><option key={memberId} value={memberId}>第{index+1}件</option>)}</select><small>本次操作针对选中的这一件。</small></label>}<ItemDetails item={current}/><ModalActions disabled={query.loading||Boolean(query.error)}><strong>{name(current)}</strong>
                  {current.type==='魂导器'&&facts.itemKinds?.[current.id]!=='拘束器'&&!slotOf(current.id)&&<Button onClick={()=>setAction({type:'equip',entityId:id,itemId:current.id})} data-testid={`equip-${current.id}`}>查看装备位置</Button>}
                  {current.type==='魂骨'&&!current.扩展?.integrated&&<Button variant="secondary" onClick={()=>setAction({type:'fuse-soul-bone',entityId:id,itemId:current.id})}>查看融合效果</Button>}
                  {current.type==='拘束器'&&<Button variant="secondary" data-testid={`wear-${current.id}`} onClick={()=>void run('world.intent',{type:'attach-restraint',itemId:current.id,targetId:id})}>穿戴在自己身上</Button>}
                  {(['暗器','丹药','毒药','辅助食品','消耗品'].includes(current.type)||current.templateId==='travel-water')&&<SelectedItemUse key={current.id} item={current}/>}
                  <SelectedItemSale key={current.id} item={current} shopId={localService?undefined:shops[0]?.id} onSelect={setTransaction}/>
                  {facts.ringIds.includes(current.id)&&<Button variant="secondary" disabled={view.busy} onClick={()=>{setMobileDetails(false);setRingItemId(current.id)}}>{current.payload.ringPreparation?'继续选择魂技':'使用魂环'}</Button>}
                </ModalActions></>}
            </aside> : null;

  return <div className="relic-archive">{tab===TABS[0]&&<MedicineStatePanel/>}
    {isMaterials&&<LootAllocations/>}
    <QuerySurface query={query}>
    <header className="relic-archive__heading"><div><span className="eyebrow">大陆纪行 · 珍藏卷</span><h1>{isMaterials?'猎获材料':tab===TABS[4]?'补给商店':tab===TABS[5]?'地点寄存':'行囊'}</h1><p>{text(state.地图.地点[locationId]?.name,'旅途中')} · 每一件收获，都是下一程的底气</p></div><div className="relic-wallet"><span>随身钱币</span><strong>{facts.currency}</strong><small>随身 {items.reduce((sum,item)=>sum+(item.quantity??1),0)} 件 · 占用 {items.length} 格</small></div></header>
    <div className="relic-archive__body">
      <InventoryNavigation tab={tab} counts={counts} onSelect={selectTab}/>
      <div className="relic-archive__content">
        {tab===TABS[0]&&<PreparedPills entries={facts.preparedPills}/>}
        {tab===TABS[0]&&<PersonWornRestraints personId={id}/>}
        {inventoryTab&&<>
          <div className="relic-library">{tab===TABS[0]&&<aside className="relic-loadout" aria-label="当前装备"><h2>当前装备</h2>{Object.entries(equipment.slots).map(([slot,itemId],index)=>{const item=state.物品.实例[itemId as string];return <section key={slot}><button className="relic-loadout__item" disabled={!item} onClick={()=>{setCategory('全部');setSearch('');setSelected(item?.id??'');setMobileDetails(true)}} data-grade={facts.itemGrades[item?.id]?.id}>{item?<RelicIllustration item={item} kind={item.type} name={name(item)}/>:<span className="empty-equipment">◇</span>}</button><div><small>装备 {index+1}</small><b>{item?name(item):'空装备槽'}</b>{item&&<Button variant="ghost" disabled={view.busy} onClick={()=>void run('world.intent',{type:'unequip',entityId:id,slot})} data-testid={`unequip-${slot}`}>卸下</Button>}</div></section>})}<h3>装备效果</h3><DefenseDetails unitId={id} state={state}/><p className="relic-loadout__note">选择随身装备，为下一段旅途整备。</p></aside>}
            <section className="relic-collection" aria-label={tab}>
              <div className="relic-collection__tools"><h2>{tab}<small>{shown.length} 项</small></h2><label><input aria-label={`寻找${tab}`} value={search} onChange={event=>{setSearch(event.target.value);setPage(0);}} placeholder={isMaterials?'按名称、属性、用途或来源寻找…':'按名称寻找…'}/></label></div>
              {tab===TABS[0]&&<nav className="relic-filters" aria-label="物品类别">{FILTERS.map(entry=><button key={entry} className={category===entry?'is-active':''} aria-pressed={category===entry} onClick={()=>{setCategory(entry);setSelected('');setPage(0)}}>{entry}</button>)}</nav>}
              <div className="relic-grid">{visible.map(entry=><button className={`relic-card${current&&(isMaterials?key(current)===key(entry):groupOf(entry).memberIds.includes(current.id))?' is-selected':''}`} aria-pressed={current&&(isMaterials?key(current)===key(entry):groupOf(entry).memberIds.includes(current.id))} data-grade={grade(entry)?.id} key={key(entry)} onClick={()=>{setSelected(!isMaterials&&groupOf(entry).memberIds.includes(selected)?selected:key(entry));setMobileDetails(true)}}>
                {!isMaterials&&facts.ringIds.includes(entry.id)?<InventoryRingArt item={entry}/>:<RelicIllustration item={entry} kind={isMaterials?'材料':entry.type} name={name(entry)}/>}<span title={name(entry)} className="relic-card__name">{name(entry)}</span>{isMaterials?<MaterialFacts material={entry} summary={facts.materials[entry.fingerprint]} compact/>:<small>{grade(entry)?<GradeBadge grade={grade(entry)}/>:text(entry.quality,'普通')}</small>}{<b className="relic-card__quantity">× {isMaterials?entry.quantity??1:groupOf(entry).totalQuantity}</b>}{!isMaterials&&slotOf(entry.id)&&<span className="relic-card__equipped">已装备</span>}
              </button>)}{Array.from({length:visible.length?Math.max(0,Math.ceil(visible.length/5)*5-visible.length):0},(_,i)=><div className="relic-empty-cell" key={`empty-${i}`} aria-hidden="true">✧</div>)}</div>
              {pageCount>1&&<nav className="card-actions" aria-label="珍藏翻页"><Button variant="ghost" disabled={pageIndex===0} onClick={()=>{setPage(pageIndex-1);setSelected('')}}>上一页</Button><span>{pageIndex+1} / {pageCount}</span><Button variant="ghost" disabled={pageIndex+1>=pageCount} onClick={()=>{setPage(pageIndex+1);setSelected('')}}>下一页</Button></nav>}
              {!shown.length&&<div className="archive-empty"><RelicIllustration kind={isMaterials?'材料':'魂导器'}/><h3>{search?'没有找到这件珍藏':'此页尚无珍藏'}</h3><p>{isMaterials?'安全撤离后，猎获的材料会收入这里。':'继续探索，收集旅途中的物品。'}</p></div>}
            </section>
            {narrow?<Modal open={mobileDetails&&Boolean(current)} title="藏品详情" className="inventory-detail-modal" onClose={()=>setMobileDetails(false)}><QuerySurface query={query}>{detail}</QuerySurface></Modal>:detail}
          </div>
          <RingChoices/>
        </>}
        {tab===TABS[4]&&<InventoryServices onTrade={setTransaction}/>}
        {tab===TABS[5]&&<section className="relic-stored"><span className="eyebrow">暂留此地 · 等你归来</span><h2>地点寄存</h2><p className="muted">寄存的物品需要回到原来的公共区域或房间领取。</p>{stored.length?<div className="stored-catalog">{stored.map((entry:any)=><article key={entry.itemId} data-grade={facts.itemGrades[entry.itemId]?.id}><RelicIllustration item={state.物品.实例[entry.itemId]} kind={state.物品.实例[entry.itemId]?.type??'魂导器'} name={text(facts.itemNames?.[entry.itemId]??entry.name)}/><div><h3>{text(facts.itemNames?.[entry.itemId]??entry.name)} × {entry.quantity}</h3><GradeBadge grade={facts.itemGrades[entry.itemId]}/><p>{text(entry.positionLabel??entry.locationName,'寄存地点')}</p>{!entry.pass&&<p className="muted">{text(entry.reason,'暂不可领取')}</p>}</div><Button variant="secondary" disabled={!entry.pass||view.busy} onClick={()=>void run('inventory.claim-stored',{itemId:entry.itemId})}>领取</Button></article>)}</div>:<div className="archive-empty"><h3>没有待领取的物品</h3><p>当前收获均已妥善安放。</p></div>}</section>}
      </div>
    </div>
    </QuerySurface>
    {ringItemId&&<RingItemDialog key={ringItemId} itemId={ringItemId} onClose={()=>setRingItemId('')}/>}
    {bulkSell&&localService&&<BatchTradeDialog direction="sell" shopId={localService.id} rows={materials.map(m=>({kind:'material',fingerprint:m.fingerprint,name:materialName(m,state),quantity:m.quantity}))} initialKey={current?.fingerprint?'material:'+current.fingerprint:undefined} onClose={()=>setBulkSell(false)}/>}{transaction&&<EconomyDialog key={JSON.stringify(transaction)} selection={transaction} onClose={()=>setTransaction(null)}/>}
    {action&&<ItemActionDialog key={JSON.stringify(action)} intent={action} onClose={()=>setAction(null)}/>}
  </div>;
}
