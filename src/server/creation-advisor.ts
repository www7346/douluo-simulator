import {jsonMatchesText} from '../shared/json-identity';
import {promptMessage} from '../runtime/model-prompt-templates';

export {CREATION_ADVICE_CONTRACT} from '../shared/model-prompt-defaults';
import {validateCreationDiscussion,type CreationDiscussion} from '../shared/creation-discussion';
import {rules} from '../rules';
import {creationPreview,validateCreationWorkspace,createWorkspace,setSoulCount} from '../runtime/creation-workbench';
import type {ModelGateway} from '../runtime/model-gateway';
import {checkedDesign,reviewDesignAuthority} from '../runtime/model-design-authority';
import {martialSoulDesignAuthority} from '../runtime/martial-soul-writing';

const fields=['name','age','gender','origin','appearance','attributes','situations','opening','soulRequests','martialSoulCount','level'];
function object(value:any){return value&&typeof value==='object'&&!Array.isArray(value);}
function text(value:any,max:number){return typeof value==='string'&&!!value.trim()&&value===value.trim()&&value.length<=max;}

/** A proposal never commits the character, changes a soul, or silently balances its cost. */
export function inspectCreationAdvice(current:Record<string,any>,value:any,reserveSouls?:Record<string,any>[]){
 validateCreationWorkspace({version:5,config:current});
 if(rules.backgrounds.policy(current.background,current.difficulty).readonly)throw Error('雪崩皇子档案只读');
 if(!object(value)||Object.keys(value).some(k=>!['mode','reply','patch'].includes(k))||!['question','proposal'].includes(value.mode)||!text(value.reply,2000)||!object(value.patch))throw Error('角色顾问需返回 mode、reply 和 patch');
 const policy=rules.backgrounds.policy(current.background,current.difficulty);
 const patch=value.patch;
 if(Object.keys(patch).some(k=>!fields.includes(k)))throw Error('角色顾问只能修改允许的人物字段，不能更改余额、物品或创建模式');
 if(value.mode==='question'&&Object.keys(patch).length)throw Error('追问不能同时更改角色草稿');
 if(value.mode==='proposal'&&!Object.keys(patch).length)throw Error('角色提案没有填写任何修改');
 for(const [key,max] of Object.entries({name:20,origin:100,appearance:2000}))if(Object.hasOwn(patch,key)&&!text(patch[key],max))throw Error(`${key}需为1至${max}字，不能含首尾空白`);
 if(Object.hasOwn(patch,'age')&&(!Number.isSafeInteger(patch.age)||(patch.age<(policy.canonical?0:6)||policy.canonical&&patch.age>0&&patch.age<6)||patch.age>policy.ageMaximum))throw Error('年龄超出当前背景允许范围');
 if(Object.hasOwn(patch,'gender')&&!['男','女'].includes(patch.gender))throw Error('性别只能选择男或女');
 if(Object.hasOwn(patch,'attributes')){
  const limits={attributeMinimum:policy.attributeMinimum,attributeMaximum:policy.attributeMaximum};
  if(!object(patch.attributes)||!Object.keys(patch.attributes).length||Object.entries(patch.attributes).some(([k,v])=>!rules.foundation.ATTRIBUTE_KEYS.includes(k)||!Number.isSafeInteger(v)||Number(v)<limits.attributeMinimum||Number(v)>limits.attributeMaximum))throw Error('六项属性须使用已有名称及允许的整数范围');
 }
 if(Object.hasOwn(patch,'situations')&&(!Array.isArray(patch.situations)||patch.situations.length))throw Error('开局处境暂时停用，只能移除旧选择');
 if(Object.hasOwn(patch,'opening')){
  if(!policy.ordinary&&(patch.opening?.talentIds?.length||patch.opening?.opportunities?.length))throw Error('特殊背景不额外购买天赋与机缘');
  if(!object(patch.opening)||!Object.keys(patch.opening).length||Object.keys(patch.opening).some(k=>!['talentIds','opportunities'].includes(k)))throw Error('天赋机缘提案只允许修改天赋或机缘列表');
  const checked=rules.talents.inspectSelection({...current.opening,...patch.opening});
  if(!checked.pass)throw Error(checked.errors.join('；'));
 }
 const sized=Object.hasOwn(patch,'martialSoulCount')?setSoulCount(createWorkspace(current,{version:5,config:current,reserveSouls}),patch.martialSoulCount).config:current;
 if(Object.hasOwn(patch,'soulRequests')){
  if(!Array.isArray(patch.soulRequests)||patch.soulRequests.length>3||new Set(patch.soulRequests.map((r:any)=>r?.index)).size!==patch.soulRequests.length||patch.soulRequests.some((r:any)=>!object(r)||Object.keys(r).some(k=>!['index','description'].includes(k))||!Number.isSafeInteger(r.index)||r.index<0||!sized.martialSoulDrafts[r.index]||!text(r.description,4000)))throw Error('武魂构想须指定已有且不重复的武魂位置及1至4000字描述');
 }
 if(Object.hasOwn(patch,'level')&&(current.background.id!=='sealed-titled'||!Number.isInteger(patch.level)||patch.level<1||patch.level>99))throw Error('此背景开局等级须为1至99的整数');
 const {soulRequests,level,...configPatch}=patch;
 const config=structuredClone({...sized,...configPatch,attributes:{...current.attributes,...patch.attributes},opening:{...current.opening,...patch.opening}});
 if(level!==undefined){const side=config.background.perspective;config.background={...config.background,actors:{...config.background.actors,[side]:{...config.background.actors?.[side],source:config.background.actors?.[side]?.source??'default',level}}};}
 if(patch.attributes||patch.martialSoulCount||level!==undefined)config.background={...config.background,ringChoices:[]};
 return {mode:value.mode,reply:value.reply,patch:structuredClone(patch),config,preview:creationPreview(config)};
}

export async function requestCreationAdvice(gateway:ModelGateway,current:Record<string,any>,description:unknown,signal?:AbortSignal,exchanges:{input:string;reply:string}[]=[],proposal?:CreationDiscussion['proposal'],reserveSouls?:Record<string,any>[]){
 validateCreationWorkspace({version:5,config:current});
 if(rules.backgrounds.policy(current.background,current.difficulty).readonly)throw Error('雪崩皇子档案只读');
 if(!text(description,4000))throw Error('请填写1至4000字的角色构想');
 validateCreationDiscussion({request:'',exchanges});
 if(exchanges.length>=20)throw Error('本次讨论已有20轮，请清空讨论后继续；角色草稿会保留');
 let editing=current;
 if(proposal){
  validateCreationDiscussion({request:'',exchanges:[],proposal});
  if(!jsonMatchesText(current,proposal.base))throw Error('候选依据的草稿已改变，请重新讨论');
  editing=inspectCreationAdvice(current,{mode:'proposal',reply:proposal.reply,patch:proposal.patch},reserveSouls).config;
 }
 const context={current,exchanges,pendingProposal:proposal?{patch:proposal.patch,reply:proposal.reply}:null,editing,request:description,preview:creationPreview(editing),
  designAuthority:{stage:'角色创建草稿，提案待玩家采用',inputRole:'request中的背景和期待是设计意图，能力和资源由preview、openingOptions与武魂专用编译决定',writableScope:fields,selection:'根据强度诉求提出预算内的实际选项，文字来历不增加点数或授予收益'},
  background:rules.backgrounds.policy(current.background,current.difficulty),
  attributes:{names:rules.foundation.ATTRIBUTE_KEYS,minimum:rules.backgrounds.policy(current.background,current.difficulty).attributeMinimum,maximum:rules.backgrounds.policy(current.background,current.difficulty).attributeMaximum},
  openingOptions:rules.backgrounds.policy(current.background,current.difficulty).ordinary?{talents:Object.values(rules.talents.TALENTS),opportunities:Object.values(rules.talents.OPPORTUNITIES).filter((v:any)=>v.enabled!==false),sources:rules.talents.BOON_SOURCES}:{talents:[],opportunities:[],sources:{}},
  soulCount:{minimum:rules.world.CREATION_RULES.martialSoulMinimum,maximum:rules.backgrounds.policy(current.background,current.difficulty).maxSouls},
  situationOptions:{},situationPointCap:0,writableFields:fields};
 return checkedDesign(gateway,{task:'creation-advisor',messages:[
  promptMessage('creation-advisor'),
  {role:'user',content:JSON.stringify(context)},
 ],read:value=>{
  const result=inspectCreationAdvice(editing,value,reserveSouls);
  if(!proposal||result.mode==='question')return result;
  const patch={...proposal.patch,...result.patch,...(proposal.patch.attributes||result.patch.attributes?{attributes:{...proposal.patch.attributes,...result.patch.attributes}}:{}),...(proposal.patch.opening||result.patch.opening?{opening:{...proposal.patch.opening,...result.patch.opening}}:{})};
  // A nonempty request list edits named slots; only an explicit empty list clears all.
  if(result.patch.soulRequests?.length&&proposal.patch.soulRequests){
   const requests=new Map<number,{index:number;description:string}>();
   for(const request of [...proposal.patch.soulRequests,...result.patch.soulRequests])requests.set(request.index,request);
   patch.soulRequests=[...requests.values()].sort((a,b)=>a.index-b.index);
  }
  if(result.patch.martialSoulCount!==undefined&&patch.soulRequests)patch.soulRequests=patch.soulRequests.filter((r:any)=>r.index<result.patch.martialSoulCount);
  return inspectCreationAdvice(current,{mode:'proposal',reply:result.reply,patch},reserveSouls);
 },signal,review:async(result,budget)=>{
  if(result.mode!=='proposal')return [];
  return reviewDesignAuthority(gateway,{task:'creation-advisor',intent:description as string,signal,budget,
   authority:{stage:'待采用的角色草稿',preview:result.preview,background:rules.backgrounds.policy(result.config.background,result.config.difficulty),attributes:result.config.attributes,opening:result.config.opening,martialSouls:result.config.martialSoulDrafts.map(martialSoulDesignAuthority),soulRequests:result.patch.soulRequests??[]},
   texts:[{path:'/reply',text:result.reply},...['origin','appearance'].filter(key=>typeof result.patch[key]==='string').map(key=>({path:'/patch/'+key,text:result.patch[key]}))]});
 }});
}
