import {rules} from '../rules';
import {customSoulDraft} from '../shared/creation-draft';
import {openingChannelAdditions,type RingRequirement} from './ring-design-requirements';

/** Preview a purchased extension of the chosen opening actor's first soul.
 * Never edits the incoming draft or any live world/soul. */
export function completeOpeningRingSoul(config:any,side:string,context:any,requirements:RingRequirement[]):any{
 const core=rules.martialSoul,original=context.actor.draft.martialSoulDrafts[0],draft=core.normalizeDraft(original);
 const addedChannels=openingChannelAdditions(draft.channels,requirements);draft.channels.push(...addedChannels);
 const addedAttributes:string[]=[];
 const compiled=context.soul.扩展?.结构化武魂??context.soul.结构化武魂;
 const expression=()=>({...compiled,channels:draft.channels.map((id:string)=>core.CHANNEL_REGISTRY[id]),attributes:draft.attributes});
 for(const row of requirements){
  if(core.allowsEffect(expression(),row.effectId,row.params))continue;
  const candidates=(Object.values(core.ATTRIBUTE_REGISTRY) as any[]).filter(a=>!draft.attributes.some((owned:any)=>owned.id===a.id)&&core.allowsEffect({...expression(),attributes:[...draft.attributes,{id:a.id,investment:a.minimumInvestment}]},row.effectId,row.params));
  candidates.sort((a,b)=>a.minimumInvestment-b.minimumInvestment||a.id.localeCompare(b.id));
  if(!candidates.length)continue; // The ordinary exact diagnostic retains an unsupported gap.
  const chosen=candidates[0];draft.attributes.push({id:chosen.id,investment:chosen.minimumInvestment});addedAttributes.push(chosen.id);
 }
 // Later additions can cover earlier alternatives (mind also covers charm).
 // Remove redundant new attributes without touching any original investment.
 for(let i=addedAttributes.length-1;i>=0;i--){
  const id=addedAttributes[i],kept=draft.attributes.filter((a:any)=>a.id!==id);
  if(requirements.every(row=>core.allowsEffect({...expression(),attributes:kept},row.effectId,row.params))){draft.attributes=kept;addedAttributes.splice(i,1);}
 }
 if(!addedChannels.length&&!addedAttributes.length)return {changed:false};
 const soul=customSoulDraft(original,{channels:draft.channels,attributes:draft.attributes,playerConfirmed:true});
 const next=rules.backgrounds.capture(structuredClone(config)),actorDraft={...structuredClone(context.actor.draft),martialSoulDrafts:[soul,...structuredClone(context.actor.draft.martialSoulDrafts.slice(1))]};
 if(side==='main')Object.assign(next,actorDraft);
 else{next.background.actors={...next.background.actors,[side]:{...next.background.actors?.[side],config:actorDraft,ringChoices:[]}};if(next.background.perspective===side)Object.assign(next,actorDraft);}
 if(side==='main'||next.background.perspective===side)next.background.ringChoices=[];
 const view=side==='main'||next.background.perspective===side?next:rules.backgrounds.selectDraft(next,{...next.background,perspective:side});
 const ledger=rules.world.creationPointLedger(view),available=Math.max(0,ledger.soulBudget-(ledger.costs.martialSouls-(ledger.soulCosts[0]??0)))+(ledger.preservedSoulCosts?.[0]??0);
 const inspection=core.inspectDraft(soul,{budget:available});
 if(!inspection.accepted||ledger.overBudget)throw Error(`开局武魂补齐后需要${inspection.pricing.total}点，当前第一武魂可用${available}点；${[...inspection.missing,...inspection.conflicts,...inspection.unsupported].map((d:any)=>d.reason).join('；')||'请调整创建点数安排'}。原效果未被降低，也未改动其他武魂。`);
 const gradeErrors=rules.world.validateCreationDraft(view).errors.filter((message:string)=>/同一角色的多个武魂必须保持相同品级/.test(message));
 if(gradeErrors.length)throw Error(`开局武魂补齐后：${gradeErrors.join('；')}。其他武魂未被自动改动，请调整创建安排。`);
 core.finalizeDraft(soul,{budget:available,id:'opening-completed-soul'});
 return {changed:true,config:next,adjustment:{addedChannels,addedAttributes,beforeCost:core.componentCost(core.normalizeDraft(original)).total,cost:inspection.pricing.total,available,clearsRingChoices:true}};
}
