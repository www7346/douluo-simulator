import {rules} from '../rules';
import {buildCreationDraft} from './creation-defaults';

/** Authored starting choices, compiled by the same current creation rules. */
export function starterDraft(config:Record<string,any>,background:Record<string,any>){
 const result=rules.backgrounds.selectDraft(config,background),policy=rules.backgrounds.policy(result.background);
 if(policy.ordinary&&!(result.background.id==='custom'&&config.background?.id==='custom')){
  const reserved=['江暮衡',rules.backgrounds.defaultTitled().name,'柳青葭','雪崩',...Object.values(rules.backgrounds.BUYERS).map((p:any)=>p.name)];
  if(reserved.includes(result.name))result.name='星璃';
  if(!policy.coreSoulId)result.martialSoulDrafts=[rules.backgrounds.soulDraft(result.background.id==='shrek-student'?'preset:patrol-shield':'green-vine')];
  const identities:Record<string,any>={
   custom:{age:18,origin:'圣魂村',appearance:'眉目清朗，穿着青灰色便装，腰间系着一只旧布袋。'},
   'shrek-student':{age:18,origin:'天斗城',appearance:'穿史莱克学员的便装，衣袖收束，身上带着新领到的学员徽记。'},
   'seven-treasure':{age:18,origin:'七宝琉璃宗',appearance:'衣襟缀着小巧的琉璃纹饰，随身带着宗门修习手札。'},
   'clear-sky':{age:18,origin:'昊天宗',appearance:'身着耐磨的深色短装，肩背挺直，掌心留有练锤磨出的薄茧。'},
   'blue-dragon':{age:18,origin:'蓝电霸王龙宗',appearance:'穿绣有龙纹的修习衣，袖口利落，举止带着初次外出历练的精神。'},
  };
  Object.assign(result,identities[result.background.id]);
 }
 if(['prince-cat','sealed-titled'].includes(result.background.id)&&result.background.creationItems===undefined){
  result.background.creationItems=[rules.backgroundRestraints.defaults(result.background.id==='sealed-titled'?'restraint-seal-platform':'rope')];
  if(result.background.id==='prince-cat')Object.assign(result.background.creationItems[0],{name:'锁扣绳具',description:'麻绳沿躯干与四肢收束，绳结穿过颈圈的连接环。腕前的短链扣住绳头，锁扣可用于调整绳索松紧。',appearance:'浅褐麻绳配深色锁扣颈圈，圈前留有小巧连接环；腕部绳结、躯干束绳与踝间绳扣彼此相连，金属短链垂在腕前。'});
 }
 if(result.background.id==='custom'){
  try{return completeStarterHistory(result);}catch{return result;}
 }
 return completeStarterHistory(result);
}

/** An explicit delegation fills only unchosen rings; invalid selections are never discarded. */
export function completeStarterHistory(config:Record<string,any>){
 const result=structuredClone(config),b=rules.backgrounds.selection(result.background);
 if(b.id==='sealed-titled'){
  result.background=b;
  for(const side of ['buyer','captive']){
   const actor=rules.backgrounds.resolveActor(result,side);
   if(actor.source==='canon')continue;
   const history=rules.backgroundHistory.prepareDraft(actor.draft,{level:actor.level,manual:false,selectedIds:actor.ringChoices,budget:actor.budget,designs:actor.ringDesigns});
   if(!history.complete)throw Error('当前武魂不能完成历史魂环，请在详细定制中调整');
   if(side===b.perspective)result.background.ringChoices=history.selectedIds;
   result.background.actors={...result.background.actors,[side]:{...result.background.actors?.[side],source:actor.source,ringChoices:history.selectedIds}};
  }
 }
 if(b.id==='jiumeitu-heir'||b.id==='custom'&&rules.backgrounds.policy(b).level>10){
  const actor=rules.backgrounds.resolveActor(result,'main'),history=rules.backgroundHistory.prepareDraft(actor.draft,{level:actor.level,manual:false,selectedIds:actor.ringChoices,budget:actor.budget,designs:actor.ringDesigns});
  if(!history.complete)throw Error('当前武魂不能完成开局魂环，请在详细定制中调整');
  result.background={...b,ringChoices:history.selectedIds};
 }


 return result;
}

export function defaultStarterDraft(){
 const base=buildCreationDraft({name:'星璃',age:18,gender:'女',origin:'圣魂村',appearance:'眉目清朗，穿着青灰色便装。',soulCount:1,soulIds:['blue-silver-grass']});
 return starterDraft({...base,background:undefined},{id:'custom'});
}
