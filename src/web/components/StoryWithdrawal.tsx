import {useState} from 'react';
import {Button,Modal} from '../components';
import {useGame} from '../game-context';

export default function StoryWithdrawal({branchId,turn,input}:{branchId:string;turn:number;input:string}){
 const {controller}=useGame();
 const [target,setTarget]=useState<Awaited<ReturnType<typeof controller.prepareStoryWithdrawal>>|null>(null);
 const [error,setError]=useState(''),[working,setWorking]=useState(false),[open,setOpen]=useState(false);
 const prepare=async()=>{setOpen(true);setError('');setTarget(null);setWorking(true);try{setTarget(await controller.prepareStoryWithdrawal(branchId,turn));}catch(e){setError((e as Error).message);}finally{setWorking(false);}};
 const withdraw=async()=>{if(!target||working)return;setWorking(true);setError('');try{await controller.withdrawStory(target);setOpen(false);}catch(e){setError((e as Error).message);}finally{setWorking(false);}};
 return <>
  <Button variant="ghost" className="story-withdrawal" disabled={working} aria-label={`撤回第${turn}层及后续`} onClick={()=>void prepare()}>撤回本层及后续</Button>
  <Modal open={open} title={`撤回第 ${turn} 层及后续`} onClose={()=>{if(!working)setOpen(false);}}>
   <p className="story-withdrawal__input">{input.length>180?input.slice(0,180)+'…':input}</p>
   {target&&<><p>将删除从这一层起的 {target.count} 轮发言与回复，包括之后的私聊和群聊。时间、物品、消耗、战斗结果及人物记忆都会回到这句话发送前。</p><p>正在进行的生成也会停止。撤回后可直接重新发送。</p></>}
   {error&&<p role="alert">{error}</p>}
   <div className="field-actions"><Button variant="secondary" disabled={working} onClick={()=>setOpen(false)}>保留当前进度</Button>{target&&<Button disabled={working} onClick={()=>void withdraw()}>{working?'正在撤回…':'确认撤回'}</Button>}</div>
  </Modal>
 </>;
}
