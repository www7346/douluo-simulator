import type {StoryPlan,StoryStepResult} from './story-turns';
import {StoryPlanValidationError} from './story-plan-validation-error';
import {STORY_BATTLE_OUTCOMES} from '../shared/story-battles';

/** These existing operations require worldActionBlockReason's idle expedition gate.
 * This is plan preflight metadata, never a simulated world, RNG preview or save field.
 * Sources: expedition-engine chooseFreeGuide/companionRoster/dismissCompanion;
 * expedition-loot.propose. Ordinary conversation and inventory reads are not preparation.
 */
const preparation=new Set(['choose-guide','hire','dismiss','bargain-hire','accept-hire-offer','propose-loot']);
type Path={departure:number|null;statuses:StoryStepResult['status'][];predicates:Record<string,string>};

/** Reject a plan-created activity conflict before any action settles. Explore success
 * and failure paths without predicting outcomes. Existing activity is checked at execution.
 * Entering a room or requesting extraction ends our proof: either can defer and settle
 * outside this plan. We do not assume that extraction has actually been accepted.
 */
export function validateStoryPlanActivityOrder(plan:StoryPlan){
 if(!plan.segments.some(s=>s.action.kind==='start-expedition')||!plan.segments.some(s=>preparation.has(s.action.kind)))return;
 let paths:Path[]=[{departure:null,statuses:[],predicates:{}}];
 for(const [index,segment] of plan.segments.entries()){
  const next:Path[]=[],kind=segment.action.kind;
  for(const path of paths){
   const when=segment.when;let candidates:Array<{path:Path;run:boolean}>;
   if(!when)candidates=[{path,run:!['failed','skipped','clarify'].includes(path.statuses.at(-1)!)}];
   else if(when.status)candidates=[{path,run:path.statuses[when.step]===when.status}];
   else {
    const field=when.agreementStatus!==undefined?'agreementStatus':when.marketStatus!==undefined?'marketStatus':when.belief!==undefined?'belief':'outcome',expected=String(when.agreementStatus??when.marketStatus??when.belief??when.outcome),key=`${when.step}:${field}`;
    // An unexecuted/failed action cannot supply a belief assessment or battle outcome.
    if(path.statuses[when.step]!=='succeeded')candidates=[{path,run:false}];
    else if(path.predicates[key]!==undefined)candidates=[{path,run:path.predicates[key]===expected}];
    else candidates=(field==='agreementStatus'?['proposed','active','rejected','fulfilled','breached','ended']:field==='marketStatus'?['pending','open','completed','rejected','cancelled','expired','invalidated','unsold']:field==='belief'?['believes','doubts','uncertain']:STORY_BATTLE_OUTCOMES).map(value=>({path:{...path,predicates:{...path.predicates,[key]:value}},run:value===expected}));
   }
   for(const {path:p,run} of candidates){
    const append=(status:StoryStepResult['status'],departure=p.departure)=>next.push({...p,departure,statuses:[...p.statuses,status],predicates:Object.fromEntries(Object.entries(p.predicates).filter(([key,value])=>status!=='succeeded'||!(key.endsWith(':marketStatus')&&['pending','open'].includes(value)||key.endsWith(':agreementStatus')&&['proposed','active'].includes(value))))});
    if(!run){append('skipped');continue;}
    if(preparation.has(kind)&&p.departure!==null)throw new StoryPlanValidationError('本计划出发成功后仍安排了仅限出发前的准备；尚未执行任何行动',{
     instancePath:`/segments/${index}/action/kind`,keyword:'activity-order',submitted:kind,
     reference:{instancePath:`/segments/${p.departure}/action/kind`,value:{kind:'start-expedition',required:'准备在出发前完成，或以出发失败为条件；规则原有远征活动限制'}},
    });
    if(kind==='describe'){append('described');continue;}
    if(kind==='clarify'){append('clarify');continue;}
    if(kind==='start-expedition'){
     if(p.departure===null)append('succeeded',index);
     append('failed');continue;
    }
    if(kind==='enter-room'||kind==='extract-expedition'){
     append('succeeded',null);append('failed');continue;
    }
    append('succeeded');append('failed');
   }
  }
  paths=next;
 }
}
