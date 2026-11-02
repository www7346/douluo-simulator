import {rules} from '../rules';

/** Pure paid-design inspection. It never consumes materials, gold or model tokens. */
export function inspectPaidDesign(state:any,request:any,options:{actorId?:string}={}){
 const core=(globalThis as any).SoulPaidDesign,e=rules.expedition;
 const q=core.quote(request.category,request.confirmedDesign),confirmedDesign=q.design;
 const timing=rules.effects.designActionTimingErrors(q.payload.activeSkill);if(timing.length)throw Error(timing.join('；'));
 const base={category:request.category,concept:request.concept??confirmedDesign.description,confirmedDesign};
 let recommendation:any;try{recommendation=e.recommendResearchMaterials(state,base,options);}catch(error){recommendation={found:false,materials:[],message:(error as Error).message};}
 let materials=Array.isArray(request.materials)&&request.materials.length?request.materials:recommendation.found?recommendation.materials:[];
 let preview:any=null;try{if(materials.length)preview=e.previewResearch(state,{...base,materials},options);}catch(error){preview={pass:false,reason:(error as Error).message,mechanicsHash:''};}
 if(request.ownedOnly===true&&preview?.pass!==true&&recommendation.found){materials=recommendation.materials;try{preview=e.previewResearch(state,{...base,materials},options);}catch(error){preview={pass:false,reason:(error as Error).message,mechanicsHash:''};}}
 const designQuote={version:q.version,policy:q.policy,designHash:q.designHash,templateId:q.templateId,valueGold:q.valueGold,materialValue:q.materialValue,bridgeClauses:q.bridgeClauses,activeSkill:q.payload.activeSkill??null,passiveEffectGraph:q.payload.passiveEffectGraph??null,modifiers:q.payload.modifiers??null};
 return {confirmedDesign,designHash:q.designHash,designQuote,preview,recommendation,materials,pass:preview?.pass===true&&e.previewWorkshopAccess(state,options).available,reasons:[...(preview?.pass?[]:[preview?.reason??recommendation.message]),...(e.previewWorkshopAccess(state,options).reason?[e.previewWorkshopAccess(state,options).reason]:[])]};
}
