import {rules} from '../rules';
import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {storyPersona} from '../runtime/story-personas';
import {residentNarrativeContext} from '../runtime/resident-narrative';
import {issueWorkflowTicket} from './workflow-ticket';
export function preparePersonGrowth(snapshot:GameSnapshot,input:any){
 if(!input||Object.keys(input).join(',')!=='requestId')throw Error('人物成长只读取原请求');
 const state:any=snapshot.state,request=rules.personGrowth.pending(state).find((r:any)=>r.id===input.requestId);if(!request)throw Error('没有本人当前可回应的成长安排');
 const person=state.人物.列表[request.personId],packet={time:state.世界.时间,self:{id:person.id,name:person.name,characterization:storyPersona(state,person)},residentContext:residentNarrativeContext(state,person.id),request:{id:request.id,from:state.人物.列表[request.actorId].name,source:request.source},actualOptions:rules.personGrowth.quote(state,request)};
 return {request,messages:[{role:'system' as const,content:'扮演受邀人物，根据自己的处境、关系、经历和实际可行选项独立决定接受或拒绝成长安排。只返回JSON {"accept":boolean,"reason":string,"martialSoulId":string|null}。理由1至600字；拒绝或修炼时martialSoulId必须null，接受吸环时只能选actualOptions中available的本人的武魂ID。修炼只按实际时间获得经验；吸环仍须真实来源与本人承载、瓶颈，未结算前不能声称已升级或获得魂技。'},{role:'user' as const,content:JSON.stringify(packet)}]};
}
export async function runPersonGrowthWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const responseSchema={type:'object',additionalProperties:false,required:['accept','reason','martialSoulId'],properties:{accept:{type:'boolean'},reason:{type:'string',minLength:1,maxLength:600},martialSoulId:{type:['string','null']}}};
 const {request,messages}=preparePersonGrowth(snapshot,input),decision=await gateway.structured(messages,(d:any)=>{rules.personGrowth.previewResponse(snapshot.state,{requestId:request.id,decision:d});return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true},responseSchema});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.respond-growth',payload:{requestId:request.id,decision}}),value:{stage:'person-growth',personId:request.personId}};
}

export function preparePersonGrowthAllocation(snapshot:GameSnapshot,input:any){
 const state:any=snapshot.state;if(!input||Object.keys(input).sort().join(',')!=='key,personId'||!rules.personGrowth.pendingAllocations(state).some((r:any)=>r.key===input.key&&r.personId===input.personId))throw Error('没有本人当前可自主分配的属性点');
 const person=state.人物.列表[input.personId],unit=state.战斗单位.列表[person.id];
 const cultivationFocus=(state.成长.列表[person.id]?.武魂ID列表??[]).flatMap((id:string)=>globalThis.SoulCanonicalWomenContent.forSoul(state.武魂.列表[id])?.growthPriority??[]);
 const packet={self:{id:person.id,name:person.name,characterization:storyPersona(state,person)},residentContext:residentNarrativeContext(state,person.id),growth:state.成长.列表[person.id],...(cultivationFocus.length?{cultivationFocus:[...new Set(cultivationFocus)]}:{}),attributes:rules.foundation.battleAttributeView(state,unit),skills:unit.能力.技能ID.map((id:string)=>state.技能.列表[id]).filter(Boolean),actualOptions:rules.personGrowth.allocationOptions(state,person.id)};
 return {messages:[{role:'system' as const,content:'扮演此人物，依据自己的武魂、技能、定位、性格和实际成长，独立分配已有自由属性点。只返回JSON {"allocations":[{"attribute":string,"steps":integer}],"reason":string}。attribute只能取actualOptions中的属性，steps为实际提升次数1至99，各属性最多一次，按实际可用点数与成本完整分配能使用的点数。理由1至600字。不能改变等级、制造属性点或操作主角。'},{role:'user' as const,content:JSON.stringify(packet)}]};
}
export async function runPersonGrowthAllocationWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {messages}=preparePersonGrowthAllocation(snapshot,input),responseSchema={type:'object',additionalProperties:false,required:['allocations','reason'],properties:{allocations:{type:'array',minItems:1,maxItems:6,items:{type:'object',additionalProperties:false,required:['attribute','steps'],properties:{attribute:{type:'string',enum:rules.foundation.ATTRIBUTE_KEYS},steps:{type:'integer',minimum:1,maximum:99}}}},reason:{type:'string',minLength:1,maxLength:600}}};
 const decision=await gateway.structured(messages,(decision:any)=>{rules.personGrowth.previewAllocation(snapshot.state,{...input,decision});return decision;},{task:'npc-autonomy',signal,promptStructure:{strict:true},responseSchema});signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.allocate-growth',payload:{...input,decision}}),value:{stage:'person-growth-allocation',personId:input.personId}};
}
