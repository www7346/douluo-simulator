import {useEffect,useRef,useState} from 'react';
import {Button} from '../components';

interface QuantityPickerProps {
  label:string;
  value:number;
  onChange:(value:number)=>void;
  onMaximum:(signal:AbortSignal)=>Promise<number>;
  min?:number;
  max?:number;
  disabled?:boolean;
}

export default function QuantityPicker({label,value,onChange,onMaximum,min=0,max=999,disabled=false}:QuantityPickerProps){
  const request=useRef<AbortController|null>(null);
  const [working,setWorking]=useState(false),[error,setError]=useState('');
  useEffect(()=>()=>{request.current?.abort();request.current=null;},[]);

  function cancel(){
    request.current?.abort();
    request.current=null;
    setWorking(false);
  }
  async function chooseMaximum(){
    if(request.current||disabled)return;
    const current=new AbortController();
    request.current=current;
    setWorking(true);
    setError('');
    try{
      const quantity=await onMaximum(current.signal);
      if(current.signal.aborted)return;
      if(quantity>=min)onChange(quantity);
      else setError('当前可用数量不足，请查看清单。');
    }catch(failure){
      if(!current.signal.aborted)setError((failure as Error).message);
    }finally{
      if(request.current===current){request.current=null;setWorking(false);}
    }
  }

  return <div className="quantity-picker"><div>
    <Button variant="ghost" aria-label={label+'减少'} disabled={disabled||working||value<=min} onClick={()=>onChange(Math.max(min,value-1))}>−</Button>
    <input aria-label={label} type="number" min={min} max={max} step="1" value={Number.isNaN(value)?'':value} disabled={disabled||working} onChange={event=>onChange(event.target.valueAsNumber)}/>
    <Button variant="ghost" aria-label={label+'增加'} disabled={disabled||working||value>=max} onClick={()=>onChange(Math.min(max,value+1))}>＋</Button>
    {working?<Button variant="ghost" onClick={cancel}>取消核对</Button>:<Button variant="secondary" disabled={disabled} onClick={()=>void chooseMaximum()}>最大</Button>}
    {min===0&&<Button variant="ghost" disabled={disabled||working||value===0} onClick={()=>onChange(0)}>清零</Button>}
  </div>{error&&<small role="status">{error}</small>}</div>;
}
