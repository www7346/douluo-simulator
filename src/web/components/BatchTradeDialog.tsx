import {useEffect,useRef,useState} from 'react';
import QuantityPicker from './QuantityPicker';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import {Button,Modal} from '../components';

export interface BatchTradeRow {kind:'item'|'material';itemId?:string;fingerprint?:string;name:string;quantity:number}
const rowKey=(r:BatchTradeRow)=>r.kind+':'+(r.itemId??r.fingerprint);
const identity=(r:BatchTradeRow)=>({kind:r.kind,...(r.itemId?{itemId:r.itemId}:{fingerprint:r.fingerprint})});

export default function BatchTradeDialog({direction,shopId,rows,initialKey,onClose}:{direction:'buy'|'sell';shopId:string;rows:BatchTradeRow[];initialKey?:string;onClose:()=>void}){
  const {view,controller}=useGame();
  const [quantities,setQuantities]=useState<Record<string,number>>(()=>initialKey?{[initialKey]:1}:{});
  const [working,setWorking]=useState(false),[error,setError]=useState('');
  const [checking,setChecking]=useState<AbortSignal|null>(null);
  const allRequest=useRef<AbortController|null>(null);
  useEffect(()=>()=>allRequest.current?.abort(),[]);
  const lines=rows.filter(r=>(quantities[rowKey(r)]??0)>0).map(r=>({...identity(r),quantity:quantities[rowKey(r)]}));
  const request={direction,shopId,lines},query=useServerQuery<any>('inventory.trade-batch',request,{enabled:lines.length>0,delay:150}),q=query.data;
  const liveRequest=useRef(request);liveRequest.current=request;
  const verb=direction==='buy'?'采购':'回收';

  async function maximum(input:Record<string,unknown>,signal:AbortSignal){
    const basis=JSON.stringify(request);
    setChecking(signal);
    try{
      const result=await controller.query('inventory.trade-maximum',input,signal);
      signal.throwIfAborted();
      const current=controller.getView();
      if(current.sessionId!==view.sessionId||current.snapshot.revision!==view.snapshot.revision||JSON.stringify(liveRequest.current)!==basis)throw Error('数量或库存已改变，请重新核对。');
      return result;
    }finally{setChecking(current=>current===signal?null:current);}
  }
  async function sellAll(){
    if(working||checking||allRequest.current)return;
    const current=new AbortController();allRequest.current=current;
    setError('');
    try{
      const result=await maximum({direction,shopId,all:rows.map(identity)},current.signal);
      if(!current.signal.aborted)setQuantities(Object.fromEntries(result.lines.map((r:BatchTradeRow)=>[rowKey(r),r.quantity])));
    }catch(failure){if(!current.signal.aborted)setError((failure as Error).message);}
    finally{if(allRequest.current===current)allRequest.current=null;}
  }
  async function confirm(){
    if(working||checking||!q?.pass)return;
    setWorking(true);setError('');
    try{await controller.dispatch('world.intent',{type:'trade-batch',...request,quoteVersion:q.quoteVersion});onClose();}
    catch(failure){setError((failure as Error).message);}
    finally{setWorking(false);}
  }
  const locked=working||Boolean(checking)||view.busy;
  return <Modal open dismissOnBackdrop={false} title={'本次'+verb} onClose={()=>{if(!working)onClose();}} actions={<>
    <Button variant="ghost" disabled={working} onClick={onClose}>返回</Button>
    <Button disabled={locked||query.loading||!lines.length||!q?.pass} onClick={()=>void confirm()}>{working?'正在结算…':`一次${verb}${lines.length}种 · ${q?.pass?q.totalGold+'金币':'待报价'}`}</Button>
  </>}>
    <p>{rows.length===1?'调整这件商品的数量后确认结算。':'选择数量后统一结算，未选择的物资保留。'}</p>
    <div className="field-actions">{direction==='sell'&&(checking&&checking===allRequest.current?.signal?
      <Button variant="ghost" onClick={()=>allRequest.current?.abort()}>取消核对</Button>:
      <Button variant="secondary" disabled={locked} onClick={()=>void sellAll()}>全部可卖</Button>)}
      <Button variant="ghost" disabled={locked} onClick={()=>setQuantities({})}>清空数量</Button>
    </div>
    <div className="record-list trade-rows">{rows.map(r=><div className="trade-row" key={rowKey(r)}>
      <span>{r.name}<small> · {direction==='buy'?'库存':'持有'}{r.quantity}份</small></span>
      <QuantityPicker label={verb+r.name+'数量'} value={quantities[rowKey(r)]??0} max={Math.min(999,r.quantity)} disabled={locked}
        onChange={quantity=>setQuantities(current=>({...current,[rowKey(r)]:quantity}))}
        onMaximum={async signal=>(await maximum({...request,target:identity(r)},signal)).maximum}/>
    </div>)}</div>
    {lines.length>0&&<p role="status">{query.loading?'正在核对总价…':q?.pass?`${direction==='buy'?'支付':'获得'}${q.totalGold}金币，结算后持有${q.remainingGold}金币`:query.error??q?.message}</p>}
    {error&&<p role="alert">{error}</p>}
  </Modal>;
}
