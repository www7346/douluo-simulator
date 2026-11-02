import {useState} from 'react';
import {ActionSection,Panel,Button} from '../components';
import {useGame} from '../game-context';
import {useServerQuery} from '../use-game-query';

export default function CharacterRepairPanel(){
 const {controller,view}=useGame();
 const audit=useServerQuery<any[]>('generation.audit');
 const services=useServerQuery<any[]>('generation.service-rebuild-audit');
 const [selected,setSelected]=useState<string[]>([]),[message,setMessage]=useState<string>(controller.preferences.get<string>('character-repair-status:'+view.profileId,'')),[working,setWorking]=useState(false);
 const [rebuildIds,setRebuildIds]=useState<string[]>([]);
 const report=(text:string)=>{controller.preferences.set('character-repair-status:'+controller.runtime.slotId,text);setMessage(text);controller.notify(text,'info');};
 const run=async()=>{
  setWorking(true);setMessage('正在准备人物补全副本…');
  try{
   if(!controller.isCharacterRepairCopy())await controller.copyWorldForCharacterRepair();
   const result=await controller.completeCharacterDetails(selected);
   report(`已补全 ${result.completed} 项资料与名称。人物能力、关系、约定和历史正文保持原记录。`);setSelected([]);
  }catch(error){report((error as Error).message);}finally{setWorking(false);}
 };
 return <Panel title="旧档人物补全">
  <p>当前世界：{view.profileLabel}。选择需要补全资料的人物，为其补充小传、目标和技能名称。修改会写入新副本，原世界保留。</p>
  {audit.error&&<p role="alert">{String(audit.error)}</p>}
  {audit.data?.length===0&&<p>当前人物资料与技能名称均已补全。</p>}
  <div className="character-repair-list">{audit.data?.map(person=><label key={person.id} style={{display:'block',margin:'8px 0'}}>
   <input type="checkbox" checked={selected.includes(person.id)} disabled={working||!selected.includes(person.id)&&selected.length>=12} onChange={e=>setSelected(ids=>e.target.checked?[...ids,person.id]:ids.filter(id=>id!==person.id))}/>
   {person.name} · {person.occupation} · {person.profile?'补全人物资料；':''}{person.personalName?'补全个人姓名；':''}{person.abilities.length} 项能力命名
  </label>)}</div>
  <Button disabled={working||view.busy||!selected.length} onClick={()=>void run()}>{controller.isCharacterRepairCopy()?'继续补全副本中的已选人物':'在副本中补全已选人物'}</Button>
  <p role="status">{controller.preferences.get('character-repair-status:'+view.profileId,message)}</p>
  <ActionSection title={<>职业服务人员的武魂重建</>}><p>复制一份当前世界，重新搭配武魂、六维和魂技；姓名、财产、关系、约定与历史保留，原能力也会留档。</p>
   {services.data?.map(person=><label key={person.id} style={{display:'block',margin:'8px 0'}}><input type="checkbox" checked={rebuildIds.includes(person.id)} disabled={working||!rebuildIds.includes(person.id)&&rebuildIds.length>=12} onChange={e=>setRebuildIds(ids=>e.target.checked?[...ids,person.id]:ids.filter(id=>id!==person.id))}/>{person.name} · {person.occupation} · {person.level}级 · {person.souls.join('、')} → 按职业生成武魂；预算 {person.budget.martialSoul} 点</label>)}
   <Button disabled={working||view.busy||!rebuildIds.length} onClick={()=>void (async()=>{setWorking(true);try{if(!controller.isCharacterRepairCopy())await controller.copyWorldForCharacterRepair();const result=await controller.rebuildServiceCharacterDetails(rebuildIds);report(`职业重建完成，共 ${result.completed} 项人物及能力。`);setRebuildIds([]);}catch(error){report((error as Error).message);}finally{setWorking(false);}})()}>在副本中按职业重建已选人物</Button>
  </ActionSection>
 </Panel>;
}
