import {PersonContractForm} from './PersonContracts';
import {useState} from 'react';
import {Button,Modal} from '../components';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';
import {useActionFeedback} from '../use-action-feedback';
import QueryStatus from './QueryStatus';
import ActionFeedback from './ActionFeedback';
export default function TargetFieldAbilities({personId,showEmpty=false,captureOnly=false,inline=false}:{personId:string;showEmpty?:boolean;captureOnly?:boolean;inline?:boolean}){
 const {controller,view}=useGame(),[open,setOpen]=useState(false),query=useServerQuery<any[]>('presentation.target-abilities',{personId}),feedback=useActionFeedback();
 const options=query.data?.filter(option=>!captureOnly||option.capture);
 if(options?.length===0)return showEmpty?<p className="muted">{captureOnly?'你当前没有可供使用的收容能力。':'你还没有能对这位人物施放的场外能力。'}</p>:null;
 const content=<><QueryStatus query={query}/><ActionFeedback feedback={feedback}/>{options?.map(option=><section key={option.id??option.skillId}><h3>{option.name}</h3><p>消耗：{option.costLines.join('、')||'无资源消耗'}</p>{option.capture&&<p>{option.captureRules}</p>}{option.contractOath?<PersonContractForm personId={personId} skillId={option.skillId} branchId={option.intent.branchIds[0]} onDone={()=>setOpen(false)}/>:<>{option.reason&&<p role="status">{option.reason}</p>}<Button disabled={view.busy||!option.available} onClick={()=>void feedback.run(()=>controller.dispatch('world.intent',option.intent)).then(ok=>{if(ok)setOpen(false);})}>{option.capture?'确认收入空间':'确认施放'}</Button></>}</section>)}</>;
 if(inline)return <div className="person-ability-page">{content}</div>;
 return <><Button variant="secondary" disabled={view.busy||!query.data} onClick={()=>setOpen(true)}>{captureOnly?'查看收容条件与操作':'使用能力'}</Button><Modal open={open} title={captureOnly?'收容条件与操作':'对这位人物使用能力'} onClose={()=>setOpen(false)}>{content}</Modal></>;
}
