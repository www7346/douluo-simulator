import {jsonMatchesText} from '../shared/json-identity';
import {rules} from '../rules';
import type {ModelGateway} from '../runtime/model-gateway';
import {creativeMessages} from '../runtime/model-prompts';
import {validateCreationWorkspace} from '../runtime/creation-workbench';
import {validateItemDiscussion,type CreationItemDiscussion} from '../shared/creation-item-discussion';

const object=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:any,max:number)=>typeof v==='string'&&!!v.trim()&&v===v.trim()&&v.length<=max;
export function inspectItemAdvice(config:Record<string,any>,value:any){
 validateCreationWorkspace({version:5,config});
 if(!rules.backgroundRestraints.eligible(config.background.id))throw Error('当前背景没有开局拘束器');
 if(!object(value)||Object.keys(value).some(k=>!['mode','reply','items'].includes(k))||!['question','proposal'].includes(value.mode)||!text(value.reply,2000))throw Error('道具主持人需返回完整的追问或提案');
 if(value.mode==='question'){
  if(Object.hasOwn(value,'items'))throw Error('追问不能同时改写器具');
  return {mode:value.mode,reply:value.reply};
 }
 if(!Array.isArray(value.items)||!value.items.length)throw Error('道具提案须保留完整的器具列表');
 const background=rules.backgrounds.selection({...config.background,creationItems:value.items}),quote=rules.backgroundRestraints.quote(background);
 for(const item of background.creationItems)rules.backgroundRestraints.compile(item);
 return {mode:value.mode,reply:value.reply,items:structuredClone(background.creationItems),quote};
}

export async function requestItemAdvice(gateway:ModelGateway,config:Record<string,any>,description:unknown,signal?:AbortSignal,exchanges:{input:string;reply:string}[]=[],proposal?:CreationItemDiscussion['proposal']){
 validateCreationWorkspace({version:5,config});
 if(!rules.backgroundRestraints.eligible(config.background.id))throw Error('当前背景没有开局拘束器');
 if(!text(description,4000))throw Error('请填写1至4000字的道具构想');
 validateItemDiscussion({request:'',exchanges});
 if(exchanges.length>=20)throw Error('本次讨论已有20轮，请清空讨论后继续；器具设计会保留');
 let editing=config;
 if(proposal){
  validateItemDiscussion({request:'',exchanges:[],proposal});
  if(!jsonMatchesText(config,proposal.base))throw Error('道具候选依据的草稿已改变，请重新讨论');
  const checked=inspectItemAdvice(config,{mode:'proposal',reply:proposal.reply,items:proposal.items});
  editing={...config,background:{...config.background,creationItems:checked.items}};
 }
 const level=rules.backgroundRestraints.quote(config.background)?.wearerLevel??9;
 const context={request:description,exchanges,pendingProposal:proposal??null,current:rules.backgroundRestraints.quote(editing.background),
  background:{id:config.background.id,perspective:config.background.perspective,wearerLevel:level,controller:'既往买主'},
  templates:rules.backgroundRestraints.catalog().filter((t:any)=>t.maxLevel>=level),
  ranges:{layers:[1,6],difficultyBonus:[0,6],pose:['身前','身后'],soulPowerPercent:[0,100],damagePercent:[0,100],maxCastRank:[0,9]},
  abilityKinds:['ordinary','martial-base','soul-ring','martial-skill','soul-bone','soul-device','consumable','hidden-weapon','domain','restraint'],
  pricing:'基价×层数＋40×层数×挣脱难度加值。每个物理装配部位各计一次，总价以当前配套额度为上限。',
  responseShape:{mode:'proposal',reply:'回应玩家的构想并介绍实际作用',items:'完整器具草案数组，字段沿用templates.draft'}
 };
 return gateway.structured(creativeMessages('creation-item-advisor',context),value=>inspectItemAdvice(config,value),{task:'creation-item-advisor',signal});
}
