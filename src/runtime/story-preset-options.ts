import {rules} from '../rules';
import {storySearchTerms} from '../shared/story-search';

/** Relevant public catalog references for the host, never an action decision. */
export function storyPresetOptions(input:string){
 const text=input.toLowerCase(),terms=[...new Set(storySearchTerms(input).map(v=>v.term))];
 const ranked=rules.presets.list().map((entry:any)=>{
  const exact=text.includes(entry.id.toLowerCase())||text.includes(entry.name.toLowerCase());
  const name=[entry.name,...entry.tags].join(' ').toLowerCase(),description=entry.description.toLowerCase();
  const score=(exact?10000:0)+terms.reduce((n,term)=>n+(name.includes(term)?3:description.includes(term)?1:0),0);
  return {entry,score,exact};
 }).filter((v:any)=>v.score>0).sort((a:any,b:any)=>Number(b.exact)-Number(a.exact)||b.score-a.score||a.entry.id.localeCompare(b.entry.id));
 const selected=ranked.slice(0,8);
 return {total:ranked.length,omitted:Math.max(0,ranked.length-selected.length),entries:selected.map(({entry}:any)=>{
  const q=rules.presets.quote(entry.id);
  return {id:entry.id,category:entry.category,name:entry.name,description:entry.description,minimumValue:q.minimumValue??q.value??null,gates:q.gates??rules.presets.gates(entry.id)};
 }),qualification:'目录报价不是取得许可；实际制作和吸环继续检查本人材料、来源、武魂、通道和预算'};
}
