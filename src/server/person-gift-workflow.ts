import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {storyPersona} from '../runtime/story-personas';
import {personCognition,perceivedRelations} from '../shared/cognition-view';
import {respondNpcGift} from '../runtime/person-gift';
import {issueWorkflowTicket} from './workflow-ticket';
export function prepareGiftResponse(snapshot:GameSnapshot,input:any){
 if(!input||Object.keys(input).some(k=>k!=='commitmentId'))throw Error('赠物回应只接受原承诺编号');
 const state=snapshot.state as any,record=rules.gifts.record(state,input.commitmentId);
 if(!record||record.personId===state.角色.主控单位ID)throw Error('主控须亲自回应；这里只处理NPC实际收到的提议');
 const reason=rules.gifts.responseReason(state,record);if(reason)throw Error(reason);
 const person=state.人物.列表[record.personId],proposal=rules.gifts.facts(state,person.id).find((r:any)=>r.id===record.id);
 const packet={time:state.世界.时间,self:{id:person.id,name:person.name,characterization:storyPersona(state,person),cognition:personCognition(state,person.id)},proposal,worldSpeech:rules.social.speechFacts(state,person.id).slice(-8),relationships:perceivedRelations(state,person.id)};
 return {record,messages:[{role:'system' as const,content:'你扮演实际收到赠物提议的人物，独立决定是否接受此版赠物承诺。只返回JSON {"accept":boolean,"reason":string}，理由1至600字。接受仅确认承诺，物品尚未交付；不改变忠诚、关系或合作。赠送者提出承诺不代表你已经同意。只使用本人可知资料，不推测幕后控制。'},{role:'user' as const,content:JSON.stringify(packet)}]};
}
export async function runGiftResponseWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {record,messages}=prepareGiftResponse(snapshot,input);
 const decision=await gateway.structured(messages,(d:unknown)=>{respondNpcGift(structuredClone(snapshot.state),{commitmentId:record.id,decision:d},`npc-gift:${record.id}`);return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.respond-gift',payload:{commitmentId:record.id,decision}}),value:{stage:'person-gift',personId:record.personId}};
}
