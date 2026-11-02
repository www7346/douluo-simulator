import {rules} from '../rules';

/** Worn intimate devices, hosts and physiology for the writer; values come from the same rules as the UI. */
export function compileIntimateFacts(state:any){
 const core=rules.intimate;if(!core)return null;
 const people=Object.values(state?.人物?.列表??{}).map((person:any)=>{
  const worn=core.worn(state,person.id),physiology=core.read(state,person.id),hosts=(rules.host.hostItems(state,person.id)??[]).map((item:any)=>{const projection=rules.host.project(state,item);return {name:item.name,...projection.facts};});
  const active=worn.length>0||hosts.length>0||physiology.快感>0||physiology.尿意>0||physiology.不应期至!==null;
  if(!active)return null;
  const hostReading=hosts.map((host:any)=>`${host.name}${host.appearance?`（外观：${host.appearance}）`:''}${host.suppression?`，禁魔 ${host.suppression}%`:''}${host.forms?.length?`，拟态：${host.forms.map((form:any)=>`${form.slot}-${form.name}${form.level>0?` ${form.level}档`:''}`).join('、')}`:''}`).join('；');
  return {personId:person.id,name:person.name,
   worn:worn.map((entry:any)=>({name:entry.name,slot:entry.slot,level:entry.level,forced:entry.forced,controller:entry.controller,concealment:entry.concealment})),
   hosts,
   urineLocked:core.urineLocked(state,person.id),
   arousal:physiology.快感,bladder:physiology.尿意,sensitivity:physiology.敏感,
   refractory:physiology.不应期至!==null,
   reading:`${person.name}${worn.length?`佩戴${worn.map((v:any)=>`${v.name}${v.level>0?`（${v.level}档）`:''}`).join('、')}`:''}${hostReading?`${worn.length?'；':''}${hostReading}`:''}${physiology.快感>0?`，快感${physiology.快感}/100`:''}${physiology.尿意>0?`，尿意${physiology.尿意}/100`:''}${core.urineLocked(state,person.id)?'，排尿被尿道锁封闭':''}`};
 }).filter(Boolean);
 return people.length?{people,meaning:'这里只是当前穿戴、宿主能力与生理数值，正文据此描写，不额外发明未登记的器具。'}:null;
}
