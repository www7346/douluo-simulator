import {playerDescription} from '../runtime/player-copy';
import {personAgePresentation} from '../shared/person-age-presentation';
import {useState} from 'react';
import {Button,Modal,Panel} from './components';
import {useServerQuery} from './use-game-query';

export function CanonPickerList({people,search,disabled,onSearch,onPreview,onChoose}:any){
 const visible=people.filter((person:any)=>person.name.includes(search.trim()));
 return <><label>搜索姓名<input value={search} onChange={event=>onSearch(event.target.value)}/></label>
  <div className="opening-canon-list">{visible.map((person:any)=><article key={person.id} data-character-id={person.id}>
   <strong>{person.name}</strong><p>{person.periodLabel} · {person.level}级</p>
   {person.blockedReason?<p>{person.blockedReason}</p>:<div className="field-actions">
    <Button disabled={disabled} aria-label={`选择${person.name}`} onClick={()=>onChoose(person.id)}>选择此人物</Button>
    <Button variant="secondary" disabled={disabled} aria-label={`查看${person.name}完整档案`} onClick={()=>onPreview(person.id)}>查看完整档案</Button>
   </div>}
  </article>)}</div>{!visible.length&&<p role="status">没有找到这位人物，试试其他姓名。</p>}</>;
}

export function CanonPickerPreview({person,query}:any){
 if(query.loading)return <p role="status">正在读取{person.name}的完整档案…</p>;
 if(query.error)return <><p role="alert">{query.error}</p><Button variant="secondary" onClick={query.retry}>重新读取档案</Button></>;
 if(query.data?.characterId!==person.id)return <p role="status">正在核对所选人物…</p>;
 return <Panel title={person.name+' · 完整档案'}><p>{person.periodLabel} · {query.data.level}级</p><CanonDetails value={query.data}/></Panel>;
}

export function CanonPickerActions({person,query,disabled,onBack,onChoose}:any){
 const ready=!disabled&&!person.blockedReason&&!query.loading&&!query.error&&query.data?.characterId===person.id;
 return <><Button variant="secondary" onClick={onBack}>返回人物列表</Button><Button disabled={!ready} onClick={()=>onChoose(person.id)}>采用{person.name}完整档案</Button></>;
}

export default function OpeningCanonPicker({people,disabled,error,onChoose,onClose}:any){
 const [search,setSearch]=useState(''),[previewId,setPreviewId]=useState('');
 const person=people.find((value:any)=>value.id===previewId&&!value.blockedReason);
 const query=useServerQuery<any>('creation.canon',{characterId:previewId},{enabled:!!person});
 const choose=(id:string)=>{if(disabled||!people.some((value:any)=>value.id===id&&!value.blockedReason))return;onChoose(id);};
 // A fresh view starts at its own top, with adoption always outside the long dossier.
 return <Modal key={person?.id??'list'} open title={person?'查看原著人物':'选择原著人物'} className="opening-canon-picker" onClose={onClose}
  actions={person?<CanonPickerActions person={person} query={query} disabled={disabled} onBack={()=>setPreviewId('')} onChoose={choose}/>:undefined}>
  {error&&<p role="alert">{error}</p>}
  {person?<CanonPickerPreview person={person} query={query}/>:<CanonPickerList people={people} search={search} disabled={disabled} onSearch={(value:string)=>{setSearch(value);setPreviewId('');}} onPreview={setPreviewId} onChoose={choose}/>}
 </Modal>;
}

export function CanonDetails({value}:any){return <div><p>{personAgePresentation(value.draft,value.characterId).label} · {value.draft.gender} · {value.level}级</p><p>{playerDescription(value.draft.appearance)}</p>{Object.entries({biography:'小传',values:'性格与立场',speech:'言谈习惯',shortTermGoal:'眼前目标',longTermGoal:'长远目标'}).map(([key,label])=>value.profile[key]&&<div key={key}><strong>{label}</strong><p>{value.profile[key]}</p></div>)}{value.rings.map((rings:any[],i:number)=><div key={i}><strong>{value.draft.martialSoulDrafts[i].name}</strong>{rings.length?rings.map((ring,j)=><p key={j}>第{j+1}环 · {ring.color&&`${ring.color}色 · `}{ring.years}年 · {ring.skills.join('、')}</p>):value.nativeAbilities?.length?null:<p>尚无魂环</p>}</div>)}{!!value.nativeAbilities?.length&&<div><h4>本源能力</h4>{value.nativeAbilities.map((skill:any)=><div key={skill.name}><strong>{skill.name}</strong><p>{playerDescription(skill.description)}</p></div>)}</div>}<p>原有钱包：{value.wallet}金</p><h4>魂骨</h4>{value.soulBones.length?value.soulBones.map((bone:any,i:number)=><p key={i}>{bone.name} · {bone.slot} · {bone.years}年</p>):<p>无已融合魂骨</p>}<h4>装备与行囊</h4>{value.equipment.length?value.equipment.map((item:any)=><p key={item.id}>{item.name}</p>):<p>无额外装备</p>}</div>;}
