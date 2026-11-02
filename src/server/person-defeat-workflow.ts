import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {storyPersona} from '../runtime/story-personas';
import {personCognition,perceivedRelations} from '../shared/cognition-view';
import {decideNpcDefeat} from '../runtime/person-defeat';
import {issueWorkflowTicket} from './workflow-ticket';
export function prepareDefeatDecision(snapshot:GameSnapshot,input:any){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>k!=='decisionKey'))throw Error('只接受原实际战败处置编号');
 const state=snapshot.state as any,r=rules.custody.defeatDecisionOptions(state,input.decisionKey),person=state.人物.列表[r.ownerId];
 const packet={time:state.世界.时间,self:{id:person.id,name:person.name,characterization:storyPersona(state,person),cognition:personCognition(state,person.id)},
  defeat:rules.custody.facts(state,person.id).defeats.find((d:any)=>d.id===r.defeatId),relationships:perceivedRelations(state,person.id),
  options:{spare:true,execute:true,devices:r.devices,capturePlans:r.capturePlans}};
 return {record:r,messages:[{role:'system' as const,content:'你扮演本场人物死斗实际胜方，依据本人可知资料独立决定如何处置这名败者。仅返回JSON：放过 {"kind":"spare","reason":"本人理由"}；明确处决 {"kind":"execute","reason":"本人理由"}；捕获 {"kind":"capture","reason":"本人理由","restraintItemIds":["实际器具ID"]}。捕获须选择实际可用工具并满足固定行动与全部战斗能力压制，capturePlans给出当前最小可行组合；没有可行组合时不能凭空捕获。理由1至600字，属于本人私有思考。不得代替败者同意、招募或改变其他人的决定。'}, {role:'user' as const,content:JSON.stringify(packet)}]};
}
export async function runDefeatDecisionWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {record,messages}=prepareDefeatDecision(snapshot,input);
 const decision=await gateway.structured(messages,(d:unknown)=>{decideNpcDefeat(structuredClone(snapshot.state),{decisionKey:record.key,decision:d},`npc-defeat:${record.key}`);return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.decide-defeat',payload:{decisionKey:record.key,decision}}),value:{stage:'person-defeat',personId:record.ownerId}};
}
