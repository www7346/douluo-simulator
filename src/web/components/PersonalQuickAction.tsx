import {useState} from 'react';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import {Button,Modal} from '../components';
export default function PersonalQuickAction(){
 const {controller,view}=useGame(),query=useServerQuery<any>('presentation.personal-quick',{}),[open,setOpen]=useState(false),[error,setError]=useState('');
 const facts=query.data;if(!facts?.hasUrineLock)return null;
 return <><button onClick={()=>setOpen(true)}><span>排尿<small>{facts.urineLocked?'锁具限制中':'查看当前条件'}</small></span></button><Modal open={open} title="排尿与锁具" dismissOnBackdrop={false} onClose={()=>setOpen(false)} actions={<><Button variant="ghost" onClick={()=>setOpen(false)}>返回</Button><a className="button button--secondary" href="#/character?tab=装备" onClick={()=>setOpen(false)}>查看装备</a>{!facts.urineLocked&&<Button disabled={view.busy} onClick={async()=>{setError('');try{await controller.dispatch('world.intent',{type:'intimate-urinate'});setOpen(false);}catch(e){setError((e as Error).message);}}}>排尿 · 5分钟</Button>}</>}><p>{facts.urineLocked?'当前尿道锁阻止排尿。请先到装备栏解除器具。':'当前没有排尿限制，可确认执行。'}</p>{error&&<p role="alert">{error}</p>}</Modal></>;
}
