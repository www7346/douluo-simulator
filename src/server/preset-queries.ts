import {rules} from '../rules';
import {playerDescription} from '../runtime/player-copy';
import {CloudError} from '../cloud/protocol';
import {artwork} from '../runtime/art-catalog';
import {itemArtwork,martialSoulArtwork,skillArtwork,beastArtwork} from '../runtime/generated-art';

const RESEARCH_CATEGORIES=['丹药','毒药','魂导器','暗器','拘束器'];
export function presetPresentation(entry:any){
 const registered=artwork(entry.artId);
 const template=rules.world.ITEM_TEMPLATES[entry.recipe.templateId];
 const art=registered.key!=='unknown'?registered:entry.category==='武魂'?martialSoulArtwork(entry.recipe.draft):entry.category==='魂兽'?beastArtwork(entry.recipe.profile):['魂技','魂骨'].includes(entry.category)?skillArtwork(entry.recipe.rawRecipe??entry.recipe):entry.category==='拘束器'?itemArtwork({...template,templateId:entry.recipe.templateId,fixedForm:{id:'rope'}},entry.category):itemArtwork({...template,templateId:entry.recipe.templateId},entry.category==='毒药'?'丹药':entry.category);
 return {id:entry.id,category:entry.category,productType:template?.type??entry.category,name:entry.name,description:playerDescription(entry.description),appearance:entry.appearance,artId:entry.artId,artPath:entry.artPath,art,catalogKind:entry.catalogKind,era:entry.era,source:entry.source,tags:entry.tags,gates:rules.presets.gates(entry.id)};
}
export function presetQuery(state:any,name:string,input:Record<string,any>){
 if(name==='preset.list'){
  if(Object.keys(input).some(key=>!['category','catalogKind','era','sourceKind','query'].includes(key)))throw new CloudError('invalid-query','精品目录查询包含未开放的条件');
  if(input.category!==undefined&&!rules.presets.CATEGORIES.includes(input.category))throw new CloudError('invalid-query','请选择目录中的一种类别。');
  return {categories:rules.presets.CATEGORIES,entries:rules.presets.list(input).map(presetPresentation)};
 }
 if(name==='preset.preview'){
  if(Object.keys(input).some(key=>!['presetId','category','concept','materials','budget','martialSoulId','beastProfileId'].includes(key)))throw new CloudError('invalid-query','精品预览包含未开放的条件');
  const entry=rules.presets.get(input.presetId);
  if(!entry)throw new CloudError('invalid-query','精品预设不存在');
  if(input.category!==undefined&&input.category!==entry.category)throw new CloudError('invalid-query','精品预设与所选类别不一致');
  if(RESEARCH_CATEGORIES.includes(entry.category)){
   const access=rules.expedition.previewWorkshopAccess(state);
   try{return {entry:presetPresentation(entry),...rules.expedition.previewResearch(state,{category:entry.category,concept:input.concept??entry.description,materials:input.materials??[],presetId:entry.id}),serviceReason:access.reason};}
   catch(error){return {entry:presetPresentation(entry),pass:false,reason:String((error as Error).message),serviceReason:access.reason};}
  }
  if(input.budget!==undefined&&(!Number.isFinite(input.budget)||input.budget<0))throw new CloudError('invalid-query','精品预览预算须为非负数');
  const soul=state.武魂?.列表?.[input.martialSoulId],beast=state.魂兽档案?.列表?.[input.beastProfileId];
  if(soul&&soul.持有者单位ID!==state.角色.主控单位ID)throw new CloudError('invalid-query','请选择本人持有的武魂');
  const quote=rules.presets.compile(entry.id,{budget:input.budget,...(soul?{martialSoul:soul,ringOrdinal:(soul.魂环ID列表?.length??0)+1}:{}),...(beast?{beastProfile:beast,years:beast.年限}:{} )});
  return {entry:presetPresentation(entry),pass:quote.pass,reason:quote.reason,errors:quote.errors,value:quote.value,gates:quote.gates};
 }
 throw new CloudError('invalid-query','不支持这项精品查看操作');
}
