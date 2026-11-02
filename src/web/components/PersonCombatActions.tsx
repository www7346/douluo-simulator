import {useRef,useState} from 'react';
import {Button,Modal} from '../components';
import {useGame} from '../game-context';
import {useActionFeedback} from '../use-action-feedback';
import ActionFeedback from './ActionFeedback';

export default function PersonCombatActions({characterId,personId,name,combat,onOpen}:{characterId:string;personId:string;name:string;combat:any;onOpen?:()=>void}){
 const {controller,view}=useGame(),[kind,setKind]=useState<'spar'|'duel'|null>(null),pending=useRef(false),feedback=useActionFeedback();
 const current=kind==='spar'?combat.spar:combat.duel;
 const execute=async()=>{
  if(!kind||pending.current||!current?.available)return;
  pending.current=true;
  try{if(await feedback.run(()=>kind==='spar'?controller.dispatch('arena.spar',{characterId}):controller.dispatch('world.intent',{type:'person-duel',targetId:personId}))){setKind(null);onOpen?.();location.hash='/battle';}}
  finally{pending.current=false;}
 };
 return <section aria-label="切磋与战斗"><h3>切磋与战斗</h3><div className="field-actions">
  <Button variant="secondary" disabled={view.busy||!!view.modelTask||!combat.spar?.available} onClick={()=>setKind('spar')}>邀请切磋</Button>
  <Button variant="secondary" disabled={view.busy||!!view.modelTask||!combat.duel?.available} onClick={()=>setKind('duel')}>发起死斗</Button>
 </div>{!combat.spar?.available&&<p className="muted">切磋：{combat.spar?.reason||'目前无法切磋'}</p>}{!combat.duel?.available&&<p className="muted">死斗：{combat.duel?.reason||'目前无法交战'}</p>}
 <Modal open={!!kind} title={`${kind==='spar'?'与':'向'}${name}${kind==='spar'?'切磋':'发起死斗'}`} onClose={()=>setKind(null)} actions={<Button disabled={view.busy||!!view.modelTask||!current?.available} onClick={()=>void execute()}>{kind==='spar'?'开始切磋':'确认发起死斗'}</Button>}>
  <p>{kind==='spar'?`一对一切磋，胜利可获得${combat.experience??0}点经验，失败或认输不获得经验。结束后恢复战前状态，不获得掉落奖励。`:'死斗保留真实伤势，双方仍可按实际判定撤退或认输。对手逃离不产生战后抓捕资格；击败或使其认输后，还须准备实际可用的拘束工具与压制条件，才能办理抓捕。'}</p><ActionFeedback feedback={feedback}/>
 </Modal></section>;
}
