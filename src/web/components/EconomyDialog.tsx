import {useState} from 'react';
import {useServerQuery} from '../use-game-query';
import QueryStatus from './QueryStatus';
import {materialName,playerText} from '../../runtime/player-text';
import {Button, Modal} from '../components';
import {useGame} from '../game-context';
import MaterialFacts from './MaterialFacts';
import QuantityPicker from './QuantityPicker';
import RelicIllustration from './RelicIllustration';
import {nativeEconomyCommand} from '../../shared/native-economy-command';

export interface EconomySelection {
  type:'blueprint.craft'|'supply.buy'|'material.sell'|'material.buy'|'item.sell'|'buy'|'sell';
  blueprintId?:string; templateId?:string; fingerprint?:string; itemId?:string; shopId?:string;
  name:string;
}

export default function EconomyDialog({selection,onClose,returnLabel='返回行囊'}:{selection:EconomySelection;onClose:()=>void;returnLabel?:string}) {
  const {controller,state,view}=useGame();
  const [quantity,setQuantity]=useState(1);
  const [submitting,setSubmitting]=useState(false);
  const [maximumRequest,setMaximumRequest]=useState<AbortSignal|null>(null);
  const [crafted,setCrafted]=useState<{name:string;kind:string;quantity:number;item:any}|null>(null);
  const craft=selection.type==='blueprint.craft';
  const selling=selection.type==='sell'||selection.type.endsWith('.sell');
  const shop=selection.type==='buy'||selection.type==='sell';
  const [maximumQuote,setMaximumQuote]=useState<{world:number;revision:number;id:string;quantity:number;quote:any}|null>(null);
  const reusable=maximumQuote&&maximumQuote.world===view.sessionId&&maximumQuote.revision===view.snapshot.revision&&maximumQuote.id===selection.blueprintId&&maximumQuote.quantity===quantity?maximumQuote.quote:null;
  const query=useServerQuery<any>('inventory.economy',{...selection,quantity},{delay:craft?0:150,enabled:!crafted&&!reusable});
  const quote=reusable??query.data??{pass:false,pending:true,message:query.error??'正在核对本次用料与价格…'};
  const confirm=async()=>{
    if(submitting||maximumRequest||!quote.pass)return;
    setSubmitting(true);
    try {
      const {type,name,...identifiers}=selection;
      if(craft){
        const events=await controller.dispatch('blueprint.craft',{blueprintId:selection.blueprintId,request:{quantity,materials:quote.allocations,includeMaximum:false}});
        const receipt=events.find(event=>event.type==='blueprint-crafted')?.payload;
        if(receipt){const current:any=controller.getView().snapshot.state,item=current.物品.实例[String(receipt.itemId)];setCrafted({item,name:playerText(item?.name,current,'新作品'),kind:item?.type??'魂导器',quantity:Number(receipt.quantity)});return;}
      }
      else if(type==='material.buy'||type==='material.sell')await controller.dispatch('world.intent',{type:'trade-commerce-material',direction:selling?'sell':'buy',...identifiers,shopId:selection.shopId??quote.shopId,quantity,quoteVersion:quote.quoteVersion,accountId:quote.accountId,...(!selling?{maximumGold:quote.totalGold}:{})});
      else if(shop)await controller.dispatch('world.intent',{type,...identifiers,quantity,quoteVersion:quote.quoteVersion,accountId:quote.accountId,...(!selling?{maximumGold:quote.totalGold}:{})});
      else {const command=nativeEconomyCommand(type,identifiers,quantity,quote.totalGold);await controller.dispatch(command.type,command.payload);}
      onClose();
    } catch {} finally {setSubmitting(false)}
  };
  const verb=craft?'制造':selling?'出售':'购买';
  const text=(value:unknown,fallback='材料')=>playerText(value,state,fallback);
  if(crafted)return <Modal open dismissOnBackdrop={false} title="作品制造完成" onClose={onClose} actions={<Button onClick={onClose}>{returnLabel}</Button>}><div className="craft-reward" role="status"><RelicIllustration item={crafted.item} kind={crafted.kind} name={crafted.name} large/><span className="eyebrow">已收入行囊</span><h2>{crafted.name}</h2><strong>× {crafted.quantity}</strong><p>可在行囊中查看、装备或使用。</p></div></Modal>;
  return <Modal open dismissOnBackdrop={false} title={`${verb} · ${text(selection.name,'作品')}`} onClose={onClose} actions={<><Button variant="ghost" onClick={onClose} disabled={submitting}>返回</Button><Button onClick={()=>void confirm()} disabled={!quote.pass||view.busy||submitting||Boolean(maximumRequest)}> {verb} {Number.isInteger(quantity)&&quantity>0?quantity:''} 件</Button></>}>
    <div className="economy-quote"><QueryStatus query={query}/>
      <label>{verb}数量</label><QuantityPicker label={`${verb}数量`} min={1} value={quantity} disabled={submitting||view.busy} onChange={setQuantity} onMaximum={async signal=>{
        setMaximumRequest(signal);
        try{
          const result=await controller.query('inventory.economy-maximum',{...selection,...(craft?{includeQuote:true}:{})},signal);
          signal.throwIfAborted();
          const current=controller.getView();if(current.sessionId!==view.sessionId||current.snapshot.revision!==view.snapshot.revision)throw Error('材料或存档已变化，请重新核对');
          if(craft&&result.quote)setMaximumQuote({world:view.sessionId,revision:view.snapshot.revision,id:selection.blueprintId!,quantity:result.maximum,quote:result.quote});
          return result.maximum;
        }finally{setMaximumRequest(current=>current===signal?null:current);}
      }}/>
      {craft&&Number.isInteger(quote.maximumCraftable)&&<p className="muted">当前材料最多可制 {quote.maximumCraftable} 件。每件成品分别配料。</p>}
      {craft&&quote.bridgeClauses?.length>0&&<details><summary>可替换的材料特性</summary><p className="muted">每件成品都需要下列特性，可由一种或多种材料共同提供。</p><ul>{quote.bridgeClauses.map((clause:any,index:number)=><li key={index}>{clause.anyOf.map((name:string)=>text(name,'适配特性')).join(' 或 ')}</li>)}</ul></details>}
      {craft&&quote.allocations?.length>0&&<><h3>本次用料</h3><div className="record-list">{quote.allocations.map((entry:any)=>{
        const material=state.材料库.永久[entry.fingerprint];
        const remaining=quote.remainingMaterials?.find((item:any)=>item.fingerprint===entry.fingerprint)?.quantity??0;
        return <article key={entry.fingerprint}><span><b>{materialName(material,state)}</b>{material&&<MaterialFacts material={material} facts={quote.materialDetails?.[entry.fingerprint]}/>}<small>制作后剩余 {remaining} 件</small></span><strong>× {entry.quantity}</strong></article>;
      })}</div><p>完成后获得 {quantity} 件「{text(selection.name,'作品')}」。</p></>}
      {!craft&&quote.totalGold!==undefined&&<div className="economy-quote__total"><span>{selling?'获得钱币':'支付钱币'}</span><strong>{quote.totalCurrency}</strong>{quote.remainingGold!==undefined&&<small>交易后持有 {quote.remainingCurrency}</small>}{quote.remainingQuantity!==undefined&&<small>交易后剩余 {quote.remainingQuantity} 件</small>}</div>}
      {!craft&&(quote.segments??quote.parts?.flatMap((p:any)=>p.segments)??[]).some((s:any)=>s.kind==='agreement')&&<p className="muted">{(quote.segments??quote.parts.flatMap((p:any)=>p.segments)).map((s:any,i:number)=><span key={i}>{i?'；':''}{s.kind==='agreement'?'约定价':'原价'} {s.unitPrice} 金币 × {s.quantity}</span>)}</p>}
      {quote.placement&&quote.placement.freeSlots!==Number.MAX_SAFE_INTEGER&&<p className="muted">需要 {quote.placement.requiredSlots} 个新空位 · 当前可用 {quote.placement.freeSlots} 个</p>}
      {!quote.pass&&<p role="status" className={quote.pending?'muted':'economy-quote__reason'}>{text(quote.message,'当前条件不足，请调整数量或整理行囊')}</p>}
    </div>
  </Modal>;
}
