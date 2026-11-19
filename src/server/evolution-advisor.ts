import {rules} from '../rules';
import {creativeMessages} from '../runtime/model-prompts';
import type {ModelGateway} from '../runtime/model-gateway';
import {designPromptCatalogue,effectCompositionRules,effectDesignEntry} from './effect-design-catalogue';

export function evolutionCatalogue(state:any,input:any){
 const actorId=input.actorId??state.角色.主控单位ID,soul=state.武魂.列表[input.soulId];
 if(!soul||soul.持有者单位ID!==actorId)throw Error('请选择本人的武魂');
 const c=rules.martialSoul;
 return {actorId,soulId:soul.id,current:rules.evolution.definition(soul),sources:rules.evolution.facts(state,input.payerId??state.角色.主控单位ID).sources.map(({id,name,quantity,unitValue,evidence}:any)=>({id,name,quantity,unitValue,evidence})),
  availableAcquisition:rules.evolutionContent.SOURCES,growthLimit:state.成长.列表[actorId]?.扩展?.evolutionLimit??null,
  ringDesign:soul.魂环ID列表.length?designPromptCatalogue({effects:Object.entries(rules.effects.EFFECT_REGISTRY).filter(([,e]:[string,any])=>e.authorable!==false).map(([id,e])=>effectDesignEntry(id,e)),compositionRules:effectCompositionRules()},false):null,
  categories:Object.values(c.CATEGORY_REGISTRY).filter((r:any)=>r.selectable!==false),attributes:Object.values(c.ATTRIBUTE_REGISTRY),channels:Object.values(c.CHANNEL_REGISTRY),traits:c.TRAIT_TEMPLATES,weaknesses:c.WEAKNESS_TEMPLATES,baseActions:c.BASE_ACTION_MODES,
  rings:soul.魂环ID列表.map((id:string)=>{const r=state.魂环.列表[id];return {ringId:id,ordinal:r.序号,years:r.年限,budget:r.价值,skills:r.魂技ID列表.map((id:string)=>{const s=state.技能.列表[id];return {name:s.name,effects:s.effectGraph.nodes.map((n:any)=>[n.effectId,n.params]),budget:s.budget};})};})};
}
export async function requestEvolutionAdvice(gateway:ModelGateway,state:any,input:any,signal?:AbortSignal){
 if(typeof input.goal!=='string'||!input.goal.trim()||input.goal.length>4000||!Array.isArray(input.exchanges??[]))throw Error('请写下想要的变化');
 const catalogue=evolutionCatalogue(state,input),selected=rules.evolution.selectSources(state,input.payerId??state.角色.主控单位ID,input.sources??[]).map(({id,name,quantity,unitValue,value,evidence}:any)=>({id,name,quantity,unitValue,value,evidence})),context={evolution:true,...catalogue,goal:input.goal,keep:input.keep??'',mode:input.mode??'goal',selectedSources:selected,exchanges:input.exchanges??[],previous:input.previous??null,
  pricing:'每增加1点结构投入需要20材料价值；类别、通道和特性按目录费用。只对新增部分计费，原有组件保持原投入不会重复收费。不得擅自提高既有属性、基础动作或增添目标没有要求的方向。每一项费用须由支持其evidence的所选材料承担，总价值不能重复使用。',
  materialRule:'按材料寻路时只能使用selectedSources所列来源的已登记evidence。属性、类别、通道、特性分别核对；有风属性不等于具有远程投射。只提出所选实际材料足以完成的方案。',
  rules:'从current修改同一个武魂，逐项按已登记来源设计。明确目标给一份提案，按材料寻路给至多三份实质不同的提案。target保留完整当前字段；未提出删除的既有能力继续保留。属性投入用整数，类别和能力取目录ID，常驻外放用trait.permanent-manifestation。跨类型阶段由代码自动生成。原魂环不适配时在rings逐环提出重构或封存；重构技能effects使用原技能实际效果格式、同档预算及新的来源支持。资料不足返回question并列出缺口。',
  ringChoiceShape:{ringId:'现有魂环ID',mode:'keep | rebuild | seal | restore',skills:[{name:'新魂技名（仅rebuild填写）',effects:[['effect.id',{parameter:'按ringDesign登记的参数与依赖填写'}]]}]},
  responseShape:{mode:'proposal',reply:'对变化、阶段与材料的简洁说明',proposals:[{name:'方案名称',target:catalogue.current,rings:[],sources:input.sources??[]}]}};
 const messages=creativeMessages('martial-soul-advisor',context);
 let value:any=await gateway.structured(messages,(v:any)=>v,{task:'martial-soul-advisor',signal,repairFormat:false,repairValidation:false});
 for(let attempt=0;attempt<2;attempt++){
 if(!value||!['proposal','question'].includes(value.mode)||typeof value.reply!=='string'||value.reply.length>2500)throw Error('进化顾问未返回完整方案，请继续原讨论');
 if(value.mode==='question')return {mode:'question',reply:value.reply};
 if(!Array.isArray(value.proposals)||value.proposals.length<1||value.proposals.length>(input.mode==='materials'?3:1))throw Error('请给出当前目标的一份方案，按材料寻路最多三份');
 const proposals=value.proposals.map((p:any)=>{
  const request={actorId:catalogue.actorId,soulId:catalogue.soulId,payerId:input.payerId??state.角色.主控单位ID,goal:input.goal,target:p.target,rings:p.rings??[],sources:input.mode==='materials'?input.sources??[]:p.sources??input.sources??[],repairLimit:p.repairLimit===true};
  const preview=rules.evolution.preview(state,request);return {name:String(p.name??p.target.name),request,preview};
 });
 if(input.mode==='materials'){
  const feasible=proposals.filter((p:any)=>p.preview.stages.every((s:any)=>s.ready));
  if(!feasible.length){
   const feedback=proposals.map((p:any)=>({name:p.name,target:p.request.target,stages:p.preview.stages.map((s:any)=>({gaps:s.allocation.gaps.map((g:any)=>({kind:g.kind,id:g.id,label:g.label,missingValue:g.missingValue})),errors:s.errors}))}));
   if(attempt===0){value=await gateway.structured([...messages,{role:'assistant',content:JSON.stringify(value)},{role:'user',content:'代码校验发现以下来源或数量缺口。请仅用所选材料修正方案：可以降低新增投入、删去没有来源的新增方向，保持原有结构，至少给一份实际可完成的变化。仍无法实现时明确返回question。校验结果：'+JSON.stringify(feedback)}],(v:any)=>v,{task:'martial-soul-advisor',signal,repairFormat:false,repairValidation:false});continue;}
   return {mode:'question',reply:'所选材料仍无法支持本轮构想：'+[...new Set(feedback.flatMap((p:any)=>p.stages.flatMap((s:any)=>[...s.gaps.map((g:any)=>g.label+'来源或数量不足'),...s.errors])))].join('；')+'。可以调整目标或补齐对应材料。'};
  }
  if(feasible.length<proposals.length)return {mode:'proposal',reply:'当前所选材料能够支持：'+feasible.map((p:any)=>p.name).join('、')+'。已排除缺少对应来源的构想。',proposals:feasible};
 }
 return {mode:'proposal',reply:value.reply,proposals};
 }
 throw Error('进化方案未完成校验');
}
export async function requestEvolutionDecision(gateway:ModelGateway,state:any,planId:string,signal?:AbortSignal){
 const plan=rules.evolution.table(state).plans.find((p:any)=>p.id===planId&&p.status==='proposed');if(!plan||plan.actorId===state.角色.主控单位ID)throw Error('没有其他人物待回应的进化方案');
 const person=state.人物.列表[plan.actorId],messages=[
  {role:'system' as const,content:'你扮演这份武魂变化方案的受益者本人，根据本人的意愿、当前关系、所需材料和具体变化，独立决定是否接受。这里只决定是否接受已有完整方案，不创作另一套武魂、不替玩家决定。只返回 JSON {"accept":true或false,"reason":"本人接受或拒绝的简短理由"}。'},
  {role:'user' as const,content:JSON.stringify({person,plan})},
 ];
 const decision:any=await gateway.structured(messages,(v:any)=>{if(typeof v?.accept!=='boolean'||typeof v.reason!=='string')throw Error('请给出本人明确的接受或拒绝');return v;},{task:'martial-soul-advisor',signal});return {planId,actorId:plan.actorId,accept:decision.accept};
}
