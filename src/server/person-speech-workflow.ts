import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {storyPersona} from '../runtime/story-personas';
import {personCognition,perceivedRelations} from '../shared/cognition-view';
import {assessNpcSpeech} from '../runtime/person-speech';
import {issueWorkflowTicket} from './workflow-ticket';

export function prepareSpeechAssessment(snapshot:GameSnapshot,input:any){
 if(!input||Object.keys(input).some(k=>k!=='statementId'))throw Error('听闻判断只接受实际原话编号');
 const state=snapshot.state as any,record=rules.social.speechTable(state).statements.find((r:any)=>r.id===input.statementId);
 if(!record||record.listenerId===state.角色.主控单位ID)throw Error('主控须亲自决定；此处只处理NPC本人实际听闻');
 const reason=rules.social.speechAssessmentReason(state,record);if(reason)throw Error(reason);
 const person=state.人物.列表[record.listenerId],own=rules.social.speechFacts(state,person.id),statement=own.find((r:any)=>r.id===record.id);
 const packet={time:state.世界.时间,self:{id:person.id,name:person.name,characterization:storyPersona(state,person),cognition:personCognition(state,person.id)},statement,relatedStatements:own.filter((r:any)=>r.id!==record.id).slice(-8),knownEvents:rules.social.known(state,person.id).slice(-8),relationships:perceivedRelations(state,person.id)};
 return {record,messages:[{role:'system' as const,content:'你扮演实际听到原话的人物，只对原话作出自己的内心判断。说话不证明内容真实，也不代表你已同意、招募、入队或接受赠物；仅控制说话人不会使听者相信。只依据本人可知事实判断，相信、怀疑、不确定均可。只返回JSON {"stance":"believes"|"doubts"|"uncertain","reason":string}，理由1至300字。这是内心判断，不是向其他人说出的回复。'},{role:'user' as const,content:JSON.stringify(packet)}]};
}
export async function runSpeechAssessmentWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {record,messages}=prepareSpeechAssessment(snapshot,input);
 const decision=await gateway.structured(messages,(d:unknown)=>{assessNpcSpeech(structuredClone(snapshot.state),{statementId:record.id,decision:d},`npc-speech:${record.id}`);return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.assess-speech',payload:{statementId:record.id,decision}}),value:{stage:'person-speech-assessment',personId:record.listenerId}};
}
