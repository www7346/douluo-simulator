export const RESEARCH_CATEGORIES=['魂导器','丹药','毒药','暗器','拘束器'] as const;
export interface ResearchDraft {ownedOnly?:boolean;goal?:'purpose'|'value';category:string;concept:string;presetId:string;selection:Record<string,number>;hostDesign?:Record<string,any>;confirmedDesign?:Record<string,any>}
export interface ResearchWorkspace extends ResearchDraft {version:1;categoryDrafts?:Record<string,ResearchDraft>}
export function researchWorkspace(input?:any):ResearchWorkspace {
  if(!input)return {version:1,category:'魂导器',concept:'把猎获材料制成可靠的随身装备',presetId:'',selection:{}};
  if(input.version!==1||!['魂导器','丹药','毒药','暗器','拘束器'].includes(input.category)||typeof input.concept!=='string'||input.concept.length>4000)throw new Error('工坊草稿格式不完整');
  if(input.ownedOnly!==undefined&&typeof input.ownedOnly!=='boolean'||input.goal!==undefined&&!['purpose','value'].includes(input.goal))throw Error('请选择有效的工坊设计条件');
  const presetId=input.presetId??'';
  if(typeof presetId!=='string'||presetId.length>100||presetId&&!/^(?:preset|shop):[a-z0-9-]+$/.test(presetId))throw new Error('请选择已登记的精品配方');
  const selection:Record<string,number>={};
  for(const [key,value] of Object.entries(input.selection??{})) {
    if(key.length>100||!Number.isSafeInteger(value)||Number(value)<0)throw new Error('请使用整数填写材料数量');
    if(Number(value)>0)selection[key]=Number(value);
  }
  let hostDesign:Record<string,any>|undefined;
  if(input.hostDesign!==undefined){
    const value=input.hostDesign;
    if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1||!['魂导器','拘束器'].includes(input.category)||typeof value.carrierTemplateId!=='string'||!value.carrierTemplateId||!value.definition||typeof value.definition!=='object'||Array.isArray(value.definition)||JSON.stringify(value).length>100000||Object.keys(value).some(key=>!['version','carrierTemplateId','definition'].includes(key)))throw Error('宿主设计草稿不完整');
    if(presetId)throw Error('自选宿主设计不能同时指定精品配方');
    hostDesign=structuredClone(value);
  }
  let confirmedDesign:Record<string,any>|undefined;
  if(input.confirmedDesign!==undefined){
    const value=input.confirmedDesign;
    if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1||value.category!==input.category||typeof value.name!=='string'||!value.name.trim()||value.name.length>80||typeof value.description!=='string'||value.description.length>2000||typeof value.appearance!=='string'||value.appearance.length>2000||!value.definition||typeof value.definition!=='object'||Array.isArray(value.definition)||Object.keys(value).some(k=>!['version','category','name','description','appearance','definition','carrierTemplateId'].includes(k))||JSON.stringify(value).length>100000)throw Error('主持人作品设计草稿不完整');
    if(presetId||hostDesign)throw Error('主持人设计不能同时选择另一份配方或宿主设计');
    confirmedDesign=structuredClone(value);
  }
  let categoryDrafts:Record<string,ResearchDraft>|undefined;
  if(input.categoryDrafts!==undefined){
    if(!input.categoryDrafts||typeof input.categoryDrafts!=='object'||Array.isArray(input.categoryDrafts)||Object.keys(input.categoryDrafts).some(k=>!RESEARCH_CATEGORIES.includes(k as any)))throw Error('各品类工坊草稿不完整');
    categoryDrafts={};
    for(const [category,entry]of Object.entries(input.categoryDrafts) as [string,any][]){
      if(entry?.category!==category||entry.categoryDrafts!==undefined)throw Error('工坊品类草稿不匹配');
      const {version,...draft}=researchWorkspace({...entry,version:1});categoryDrafts[category]=draft;
    }
  }
  return {version:1,category:input.category,concept:input.concept,presetId,selection,...(input.ownedOnly!==undefined?{ownedOnly:input.ownedOnly}:{}),...(input.goal?{goal:input.goal}:{}),...(hostDesign?{hostDesign}:{}),...(confirmedDesign?{confirmedDesign}:{}),...(categoryDrafts?{categoryDrafts}:{})};
}

export function switchResearchCategory(current:ResearchWorkspace,category:string):ResearchWorkspace {
 if(!RESEARCH_CATEGORIES.includes(category as any))throw Error('请选择已有的工坊品类');
 if(category===current.category)return researchWorkspace(current);
 const normalized=researchWorkspace(current),{version,categoryDrafts,...active}=normalized;
 const next=categoryDrafts?.[category]??{category,concept:'',presetId:'',selection:{}};
 return researchWorkspace({...next,version:1,categoryDrafts:{...categoryDrafts,[active.category]:active}});
}
