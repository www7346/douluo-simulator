import {applyListChange,validListChange,worldJournalLists,type JournalChange} from './world-journal-delta';
/** The optional entry map is anchored to a fixed game schema. Wire data cannot select an arbitrary path. */
export const sectionTables:Readonly<Record<string,string|null>>=Object.freeze({
  世界:null,远征:null,研发:null,战斗:null,地图:null,容器:'列表',人物:'列表',战斗单位:'列表',武魂:'列表',魂环:'列表',
  技能:'列表',魂兽档案:'列表',遭遇:'列表',状态实例:'列表',物品:'实例'
});
export type FieldChanges={replace:Record<string,unknown>;remove:string[]};
export type SectionChange={fields:FieldChanges;entries?:FieldChanges;entryOrder?:string[];journals?:Record<string,JournalChange>};
const forbidden=new Set(['__proto__','constructor','prototype']);
export function isRecord(value:unknown):value is Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const proto=Object.getPrototypeOf(value);
  return proto===Object.prototype||proto===null;
}
export function validDeltaFields(fields:FieldChanges):boolean {
  return Boolean(fields&&isRecord(fields.replace)&&Array.isArray(fields.remove)&&
    fields.remove.every(key=>typeof key==='string'&&!forbidden.has(key)&&!Object.hasOwn(fields.replace,key))&&
    new Set(fields.remove).size===fields.remove.length&&Object.keys(fields.replace).every(key=>!forbidden.has(key)));
}
function exactChanges(value:unknown):value is FieldChanges{
  return isRecord(value)&&Object.keys(value).length===2&&Object.hasOwn(value,'replace')&&Object.hasOwn(value,'remove')&&validDeltaFields(value as FieldChanges);
}
function validJournals(journals:unknown,fields:FieldChanges){
  if(!isRecord(journals))return false;
  return Object.entries(journals).every(([key,change])=>{
    if(!Object.hasOwn(worldJournalLists,key)||Object.hasOwn(fields.replace,key)||fields.remove.includes(key)||!isRecord(change)||!isRecord(change.lists))return false;
    const lists=worldJournalLists[key];
    if(lists===null)return Object.keys(change).length===1&&Object.keys(change.lists).length===1&&validListChange(change.lists.items);
    if(Object.keys(change).length!==2||!exactChanges(change.fields))return false;
    const patch=change.fields;
    return Object.entries(change.lists).every(([name,edits])=>lists.includes(name)&&!Object.hasOwn(patch.replace,name)&&!patch.remove.includes(name)&&validListChange(edits));
  });
}
export function validSectionChanges(sections:unknown,root:FieldChanges):sections is Record<string,SectionChange>{
  if(!isRecord(sections))return false;
  return Object.entries(sections).every(([name,change])=>{
    if(!Object.hasOwn(sectionTables,name)||Object.hasOwn(root.replace,name)||root.remove.includes(name)||!isRecord(change)||
      !exactChanges(change.fields)||Object.keys(change).some(key=>!['fields','entries','entryOrder','journals'].includes(key)))return false;
    if(Object.hasOwn(change,'journals')&&(name!=='世界'||!validJournals(change.journals,change.fields)))return false;
    if(Object.hasOwn(change,'entryOrder')&&(!Object.hasOwn(change,'entries')||!Array.isArray(change.entryOrder)||!change.entryOrder.every(key=>typeof key==='string'&&!forbidden.has(key))||new Set(change.entryOrder).size!==change.entryOrder.length))return false;
    const table=sectionTables[name];
    return !Object.hasOwn(change,'entries')||Boolean(table&&exactChanges(change.entries)&&!Object.hasOwn(change.fields.replace,table)&&!change.fields.remove.includes(table));
  });
}
export function patchJournals(section:Record<string,unknown>,journals:Record<string,JournalChange>){
  for(const [key,change] of Object.entries(journals)){
    const base=section[key];
    if(worldJournalLists[key]===null){section[key]=applyListChange(base,change.lists.items);continue;}
    if(!isRecord(base)||!change.fields)throw Error('世界账本与当前进度不匹配');
    const journal=patchFields(base,change.fields);
    for(const [field,edits] of Object.entries(change.lists))journal[field]=applyListChange(base[field],edits);
    section[key]=journal;
  }
}
export function patchFields(source:Record<string,unknown>,changes:FieldChanges):Record<string,unknown>{
  const result={...source,...changes.replace};
  for(const key of changes.remove)delete result[key];
  return result;
}
