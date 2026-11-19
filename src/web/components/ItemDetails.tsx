import {medicineCopy,playerDescription} from '../../runtime/player-copy';
import RingLore from './RingLore';
import RestraintDetails from './RestraintDetails';
import RelicIllustration from './RelicIllustration';
import {useMemo,useRef,useState} from 'react';
import {useServerQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
import {ringDisplay} from '../../shared/ring-display';
import {playerText} from '../../runtime/player-text';
import {ActionSection,Button,Modal} from '../components';
import {useGame} from '../game-context';
import GradeBadge from './GradeBadge';
import AbilityDetails,{PassiveDetails} from './AbilityDetails';
import PersonalFieldAbilities from './PersonalFieldAbilities';
import {useActionFeedback} from '../use-action-feedback';
import ActionError from './ActionError';

export default function ItemDetails({item,catalog=false,wearing=false}:{item:any;catalog?:boolean;wearing?:boolean}) {
  const {state}=useGame();
  const query=useServerQuery<any>('inventory.item',{item},{enabled:Boolean(item)});
  const details=query.data;
  if(!item)return null;
  if(!details)return <QueryStatus query={query}/>;
  return <div className="item-details">
    {!details.ring&&!wearing&&<div className="item-details__art"><RelicIllustration item={{...item,fixedForm:details.fixedForm,effectGraph:details.passiveEffectGraph}} kind={details.type} name={details.name}/></div>}
    {details.description&&<p>{playerText(playerDescription(details.description),state,'')}</p>}
    {details.intimate&&<section aria-label="器具能力"><h3>器具能力</h3><dl className="relic-facts"><div><dt>佩戴部位</dt><dd>{details.intimate.slots.join('、')}</dd></div>{details.intimate.covers.length>0&&<div><dt>覆盖部位</dt><dd>{details.intimate.covers.join('、')}</dd></div>}<div><dt>调节档位</dt><dd>{details.intimate.maxStimLevel>0?`关闭至 ${details.intimate.maxStimLevel} 档`:'无调节档位'}</dd></div><div><dt>遥控</dt><dd>{details.intimate.remote?'支持专用遥控':'不支持'}</dd></div><div><dt>锁具</dt><dd>{details.intimate.needsKey?'需要对应钥匙解除':'无制式钥匙要求'}</dd></div><div><dt>破坏难度</dt><dd>{details.intimate.breakDifficulty}</dd></div></dl>{details.intimate.effects.length>0&&<p>佩戴状态：{details.intimate.effects.join('、')}</p>}<p className="muted">穿戴、调节和拆卸按当前实际操作权限及器具状态判断。</p></section>}
    {details.form&&!details.fixedForm&&<p className="muted">{playerText(details.form,state,'')}</p>}
    {details.fixedForm&&<p className="muted">{[...new Set([details.fixedForm.kind,details.fixedForm.name,item.payload?.choiceRole?.label])].filter(Boolean).join(' · ')}</p>}
    <dl className="relic-facts"><div><dt>{details.grade?'品级':'品质'}</dt><dd>{details.grade?<GradeBadge grade={details.grade}/>:playerText(details.quality,state,'普通')}</dd></div><div><dt>{catalog?'展示数量':wearing?'佩戴数量':'持有数量'}</dt><dd>{details.quantity}</dd></div>
      {details.consumable&&<div><dt>药性</dt><dd className="danger-text">{details.consumable.classification}</dd></div>}
      {details.consumable?.medicine&&<><div><dt>剂型／途径</dt><dd>{details.consumable.formLabel} · {details.consumable.routeLabel}</dd></div><div><dt>剂量</dt><dd>每件 {details.consumable.doses} 剂</dd></div>{details.consumable.sourceDurationMinutes>0&&<div><dt>外部毒源期限</dt><dd>{details.consumable.sourceDurationMinutes} 分钟</dd></div>}</>}
      {details.equippedSlot&&<div><dt>装备位置</dt><dd>{details.equippedSlot}</dd></div>}
      {['暗器','丹药'].includes(item.type)&&<div><dt>使用方式</dt><dd>每次使用消耗一件</dd></div>}
      {item.type==='魂导器'&&<div><dt>生效方式</dt><dd>{details.skills.some((skill:any)=>skill.displayInfo?.activation!=='passive')?(details.passiveEffectGraph?'装备效果在装备期间生效，主动能力须另行施用':'主动能力须另行施用，按详情支付费用'):'装备时生效，卸下失效'}</dd></div>}
      {item.payload?.slot&&<div><dt>魂骨部位</dt><dd>{playerText(item.payload.slot,state,'魂骨')}</dd></div>}
      {!details.ring&&(item.payload?.ringSource?.years??item.payload?.years)>0&&<div><dt>年限</dt><dd>{item.payload.ringSource?.years??item.payload.years} 年</dd></div>}
      {details.expiresAtDay!==null&&<div><dt>保质期限</dt><dd className={details.expired?'danger-text':''}>{details.expired?'已过期':`可用至第 ${details.expiresAtDay} 日`}</dd></div>}
      {details.cooldownRemaining>0&&<div><dt>当前冷却</dt><dd>{details.cooldownRemaining} 回合</dd></div>}
    </dl>
    {details.consumable?.warning&&<p className="danger-text">{medicineCopy(details.consumable)}</p>}
    {!catalog&&details.medicineOptions&&<MedicineActions itemId={item.id} options={details.medicineOptions}/>}
    {!catalog&&details.fieldUse&&<PersonalFieldAbilities sourceItemId={item.id} foodPresentation={details.type==='辅助食品'}/>}
    {details.ring&&<div className="ring-item-facts"><RingLore lore={details.lore}/><p>{details.ring.bypassCapacity?'吸收不受身体承载年限限制，仍需满足等级、经验和环位要求。':details.ring.kind==='competition'?`适用于${details.ring.divisionLevel}级、第${details.ring.ringOrdinal}魂环，仍需满足经验和承载要求。`:'吸收仍需满足等级、经验、环位与身体承载要求。'}</p></div>}
    {details.temporary&&<p className="economy-quote__reason">尚未带离险地。安全完成本次探索或赛事后，才能收入永久行囊。</p>}
    {details.bound&&<p className="muted">已与魂师绑定。</p>}
    {details.restraint&&<RestraintDetails device={details.restraint}/>}
    {details.blueprintBook&&<PresetBlueprintStudy itemId={item.id} book={details.blueprintBook} catalog={catalog}/>}
    <PassiveDetails modifiers={details.modifiers} passive={details.passiveCombat}/>
    {details.passiveEffectGraph&&<AbilityDetails skill={{id:`item-defense:${item.id}`,name:item.type==='魂骨'?'魂骨庇护':'装备被动',category:item.type,sourceItemId:item.id,effectGraph:details.passiveEffectGraph}} presentation={details.passiveInfo}/>}
    {details.skills.map((skill:any)=><AbilityDetails key={skill.id} skill={skill}/>)}

    {!details.restraint?.realm&&!details.skills.length&&['消耗品','工具','材料'].includes(item.type)&&<p className="muted">随身携带，可在相应探索与交易中使用。</p>}
  </div>;
}

function PresetBlueprintStudy({itemId,book,catalog}:{itemId:string;book:any;catalog:boolean}){
 const {controller,view}=useGame(),feedback=useActionFeedback();
 return <section aria-label="学习制作图纸"><p>成品品级：{book.grade.name}。学习后可在工坊按图制作，仍需准备相应材料。</p>{book.known?<p role="status">已经掌握这份制作图纸。</p>:catalog?<p>购买后可从行囊学习这张图纸。</p>:<><Button disabled={view.busy||!book.study.available} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',{type:'learn-preset-blueprint',itemId}))}>学习这张图纸</Button>{book.study.reason&&<p role="status">{book.study.reason}</p>}</>}<ActionError message={feedback.error} onDismiss={feedback.dismiss}/></section>;
}

const MEDICINE_OPERATIONS:Record<string,string>={'prepare-poisoned-serving':'混入一份食物','offer-disguised-drug':'伪装用途给药','coat-item':'涂覆一件物品','apply-contact-drug':'接触施药','direct-spray':'直接喷洒','release-toxic-cloud':'释放毒雾','touch-coated-item':'用涂层物品接触'};
export function MedicineActions({itemId,options,fixedTargetId}:{itemId:string;options:any;fixedTargetId?:string}){
 const {controller,state,view}=useGame(),[operation,setOperation]=useState(options.operations[0]),[chosenTargetId,setTarget]=useState(''),[carrierItemId,setCarrier]=useState(''),[claim,setClaim]=useState(''),[covert,setCovert]=useState(false),[pending,setPending]=useState(false);
 const targetId=fixedTargetId??chosenTargetId;
 const feedback=useActionFeedback();
 const request=useMemo(()=>({type:operation,itemId,...(['offer-disguised-drug','apply-contact-drug','direct-spray','touch-coated-item'].includes(operation)?{targetId}:{}),...(['prepare-poisoned-serving','coat-item'].includes(operation)?{carrierItemId}:{}),...(operation==='offer-disguised-drug'?{claim,covert}:{})}),[operation,itemId,targetId,carrierItemId,claim,covert]);
 const query=useServerQuery<any>('inventory.action',request),preview=query.data;
 const execute=async()=>{if(pending||!preview?.available)return;setPending(true);try{await feedback.run(async()=>{if(options.battleId){const {type,...params}=request;await controller.dispatch('battle.action',{...params,actorId:state.角色.主控单位ID,type:'药剂施用',operation:type});}else await controller.dispatch('world.intent',request);});}finally{setPending(false);}};
 return <div className="medicine-actions"><label>施用操作<select value={operation} onChange={e=>setOperation(e.target.value)}>{options.operations.map((id:string)=><option key={id} value={id}>{MEDICINE_OPERATIONS[id]}</option>)}</select></label>
 {['offer-disguised-drug','apply-contact-drug','direct-spray','touch-coated-item'].includes(operation)&&(fixedTargetId?<p>施用对象：{options.targets.find((p:any)=>p.id===fixedTargetId)?.name??'当前人物'}{!options.targets.some((p:any)=>p.id===fixedTargetId)&&'（当前不在可施用范围）'}</p>:<label>施用对象<select value={targetId} onChange={e=>setTarget(e.target.value)}><option value="">选择同场对象</option>{options.targets.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>)}
 {['prepare-poisoned-serving','coat-item'].includes(operation)&&<label>施药载体<select value={carrierItemId} onChange={e=>setCarrier(e.target.value)}><option value="">选择持有的载体</option>{options.carriers.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
 {operation==='offer-disguised-drug'&&<><label>对方听到的用途宣称<input value={claim} onChange={e=>setClaim(e.target.value)} maxLength={1000}/></label><label><input type="checkbox" checked={covert} onChange={e=>setCovert(e.target.checked)}/>尝试暗中递药（使用身法检定）</label></>}
 <QueryStatus query={query}/><ActionError message={feedback.error} onDismiss={feedback.dismiss}/>{preview?.reason&&<p className="danger-text">{playerText(preview.reason,state)}</p>}<Button disabled={pending||view.busy||!preview?.available} onClick={()=>void execute()}>{MEDICINE_OPERATIONS[operation]}</Button>
 {options.sources.map((source:any,index:number)=><p className="muted" key={source.id}>药剂 {index+1}：余量 {source.remainingDoses} 剂{source.expiresAt!==null?`，第${Math.floor(source.expiresAt/1440)}日 ${Math.floor(source.expiresAt%1440/60)}:${String(source.expiresAt%60).padStart(2,'0')}到期`:''}，{({active:'生效中',expired:'已到期',depleted:'已用尽',exhausted:'已用尽',removed:'已清除',ended:'已结束'} as Record<string,string>)[source.status]??'等待处理'}</p>)}</div>;
}

export function ItemActionDialog({intent,onClose}:{intent:Record<string,any>;onClose:()=>void}) {
  const {state,controller,view}=useGame();
  const [slot,setSlot]=useState(intent.slot??'');
  const [quantity,setQuantity]=useState(1);
  const [submitting,setSubmitting]=useState(false);
  const feedback=useActionFeedback();
  const pending=useRef(false);
  const request=useMemo(()=>({...intent,...(slot?{slot}:{}),...(intent.type==='equip'&&slot?{replace:true}:{}),...(intent.type==='create-support-consumable'?{quantity}:{})}),[intent,slot,quantity]);
  const query=useServerQuery<any>('inventory.action',request);
  const quote=query.data??{available:false};
  const type=intent.type;
  const verb=type==='equip'?'装备':type==='unequip'?'卸下':type==='fuse-soul-bone'?'融合魂骨':'制造食品';
  const confirm=async()=>{if(pending.current||query.loading||!quote.available)return;pending.current=true;setSubmitting(true);try{if(await feedback.run(()=>controller.dispatch('world.intent',request)))onClose()}finally{pending.current=false;setSubmitting(false)}};
  return <Modal open title={`确认${verb}`} onClose={onClose} actions={<><Button variant="ghost" disabled={submitting} onClick={onClose}>返回</Button><Button variant={type==='fuse-soul-bone'?'danger':'primary'} disabled={!quote.available||query.loading||view.busy||submitting} onClick={()=>void confirm()}>{type==='fuse-soul-bone'?'确认永久融合':`确认${verb}`}</Button></>}>
    <QueryStatus query={query}/><ActionError message={feedback.error} onDismiss={feedback.dismiss}/>{type==='create-support-consumable'&&<label>制作份数<input aria-label="制作份数" type="number" min="1" max="99" step="1" value={quantity||''} onChange={e=>setQuantity(Number(e.target.value))}/></label>}{type==='equip'&&<label>装入位置（有装备时直接替换）<select value={slot} onChange={event=>setSlot(event.target.value)}><option value="">使用空槽</option>{(quote.equipmentSlots??[]).map((entry:string)=><option key={entry}>{entry}</option>)}</select></label>}
    {quote.available?<><h3>{playerText(quote.name,state,'所选物品')}</h3>{quote.slot&&<p>位置：{playerText(quote.slot,state,'装备槽')}</p>}
      {type==='fuse-soul-bone'&&<p className="economy-quote__reason">融合后将与身体永久结合，无法卸下或替换。</p>}
      {type==='create-support-consumable'&&<p>消耗 {quote.soulPowerCost} 点魂力 · 预计剩余 {quote.estimatedRemainingSoulPower} 点 · 可用至第 {quote.expiresAtDay} 日</p>}
      {quote.modifierQuote&&<div className="economy-quote__reason"><p>附加增幅：{playerText(quote.modifierQuote.name,state,'增幅能力')} · 已计入总消耗</p>{quote.modifierQuote.sourceItem?.sourceKind==='consumable'&&<p>增幅来源：{playerText(state.物品.实例[quote.modifierQuote.sourceItem.itemId]?.name,state,'增幅食品')}</p>}{(quote.modifierQuote.payment?.items??[]).map((fee:any)=><p key={fee.itemId}>同时消耗 {fee.quantity} 份{playerText(state.物品.实例[fee.itemId]?.name,state,'所需物品')}</p>)}{quote.modifierQuote.usage?.dailyRemaining!==null&&quote.modifierQuote.usage?.dailyRemaining!==undefined&&<p>该增幅今日尚可使用 {quote.modifierQuote.usage.dailyRemaining} 次</p>}{quote.modifierQuote.payment?.totals?.health>0&&<p>同时消耗 {quote.modifierQuote.payment.totals.health} 点生命</p>}{quote.modifierQuote.payment?.totals?.lifespan>0&&<p>同时消耗 {quote.modifierQuote.payment.totals.lifespan} 分钟寿命</p>}{state.技能.列表[quote.modifierQuote.skillId]&&<details><summary>查看增幅与代价</summary><AbilityDetails skill={state.技能.列表[quote.modifierQuote.skillId]}/></details>}</div>}
       {quote.production?.activeSkill&&<AbilityDetails skill={{...quote.production.activeSkill,name:quote.name}}/>}
       {quote.modifierActivation&&<div className="economy-quote__reason"><p>附加增幅：{playerText(quote.modifierActivation.name,state,'增幅能力')} · 已计入总消耗</p>
        {quote.modifierActivation.sourceItem?.sourceKind==='consumable'&&<p>同时消耗 1 份{playerText(state.物品.实例[quote.modifierActivation.sourceItem.itemId]?.name,state,'增幅食品')}</p>}
        {quote.modifierActivation.usageLedger?.dailyRemaining!==null&&quote.modifierActivation.usageLedger?.dailyRemaining!==undefined&&<p>使用后，该增幅今日剩余 {quote.modifierActivation.usageLedger.dailyRemaining} 次</p>}
        {quote.modifierActivation.sourceItem?.cooldownRemaining>0&&<p>增幅来源进入 {quote.modifierActivation.sourceItem.cooldownRemaining} 回合冷却</p>}
      </div>}
      <PassiveDetails modifiers={quote.item?.modifiers} passive={quote.item?.passiveCombat}/>
      {quote.item?.passiveEffectGraph&&<AbilityDetails skill={{name:'装备被动',category:quote.item.type,effectGraph:quote.item.passiveEffectGraph}}/>}
      {quote.item?.skills.map((skill:any)=><AbilityDetails key={skill.id} skill={skill}/>)}</>:<p role="status" className="economy-quote__reason">{quote.reason}</p>}
  </Modal>;
}

export function MedicineBattlePanel(){
 const {state,view}=useGame(),query=useServerQuery<any>('inventory.medicine',{}),[itemId,setItemId]=useState(''),items=query.data?.medicines??[];
 if(!items.length)return null;
 return <ActionSection title={<>使用药剂或涂层物品 · 消耗一次主行动</>}><label>使用物品<select disabled={view.busy} value={itemId} onChange={e=>setItemId(e.target.value)}><option value="">选择药剂或涂层物品</option>{items.map((v:any)=><option key={v.id} value={v.id}>{v.name}{v.coated?'（接触涂层）':''}</option>)}</select></label>{itemId&&state.物品.实例[itemId]&&<ItemDetails item={state.物品.实例[itemId]}/>}</ActionSection>;
}

export function MedicineStatePanel(){
 const {controller,state,view}=useGame(),query=useServerQuery<any>('inventory.medicine',{}),[pending,setPending]=useState(false),facts=query.data;
 const feedback=useActionFeedback();
 const execute=async(request:any)=>{if(pending)return;setPending(true);try{await feedback.run(async()=>{if(facts.medicineBattleId){const {type,...params}=request;await controller.dispatch('battle.action',{...params,actorId:state.角色.主控单位ID,type:'药剂施用',operation:type});}else await controller.dispatch('world.intent',request);});}finally{setPending(false);}};
 if(!facts)return <QueryStatus query={query}/>;
 const offers=(facts.poisonFacts?.offers??[]).filter((o:any)=>o.targetId===state.角色.主控单位ID&&['pending','accepted'].includes(o.status));
 return <section aria-label="食用与药物回应"><ActionError message={feedback.error} onDismiss={feedback.dismiss}/>{offers.map((o:any)=><div key={o.id}><p>用途宣称：{o.claim}。{o.knownWarning}</p>{o.status==='pending'?['accept','refuse','inspect'].map((decision,i)=><Button key={decision} disabled={pending||view.busy} onClick={()=>void execute({type:'respond-disguised-drug',offerId:o.id,decision})}>{['接受','拒绝','查验'][i]}</Button>):<Button disabled={pending||view.busy} onClick={()=>void execute({type:'consume-food-drink',offerId:o.id})}>服用</Button>}</div>)}
 {(facts.foods??[]).map((food:any)=><Button key={food.id} disabled={pending||view.busy} onClick={()=>void execute({type:'consume-food-drink',itemId:food.id})}>食用 {food.name}</Button>)}
 {(facts.poisonFacts?.sources??[]).filter((r:any)=>r.status==='active').map((r:any)=><p className="muted" key={r.id}>药剂余量：{r.remainingDoses} 剂{r.expiresAt!==null?`，第${Math.floor(r.expiresAt/1440)}日 ${Math.floor(r.expiresAt%1440/60)}:${String(r.expiresAt%60).padStart(2,'0')}到期`:''}</p>)}</section>;
}
