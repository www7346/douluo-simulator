(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulBattlePreferences=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DEFAULTS=Object.freeze({version:1,defaultMode:'auto',reportMode:'manual',consumables:'never',reservePercent:0,retreatPercent:0});
function validate(value){
 if(value===undefined)return {...DEFAULTS};
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!Object.hasOwn(DEFAULTS,k))||Object.keys(DEFAULTS).some(k=>!Object.hasOwn(value,k))||value.version!==1||!['auto','manual'].includes(value.defaultMode)||!['manual','boss','all'].includes(value.reportMode)||!['never','recovery','all'].includes(value.consumables)||!['reservePercent','retreatPercent'].every(k=>Number.isInteger(value[k])&&value[k]>=0&&value[k]<=100))throw Error('战斗设置无效');
 return {...value};
}
function read(state){return validate(state?.扩展?.battlePreferences);}
function effective(state){return validate(state?.战斗?.扩展?.automation?.preferences??state?.扩展?.battlePreferences);}
const RESTORATIVE=new Set(['payload.heal','payload.restore','payload.soul_restore','payload.cleanse']);
function restorative(skill){
 const nodes=skill?.effectGraph?.nodes;if(!Array.isArray(nodes)||!nodes.length)return false;
 const effects=nodes.map(n=>n.effectId).filter(id=>!(/^(target|release|check|trigger|activation|cost)\./u.test(id)));
 return effects.length>0&&effects.every(id=>RESTORATIVE.has(id));
}
function permitsAutomaticItem(state,actor,skill){
 if(actor?.id!==state?.角色?.主控单位ID||!['consumable','hidden-weapon'].includes(skill?.sourceKind))return true;
 const policy=effective(state).consumables;
 return policy==='all'||policy==='recovery'&&restorative(skill);
}
// Saved reportMode values remain data; prose requests now require an explicit player click.
function shouldNarrate(state,report){return false;}
return Object.freeze({DEFAULTS,validate,read,effective,restorative,permitsAutomaticItem,shouldNarrate});
});
