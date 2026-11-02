import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {storyPersona} from '../runtime/story-personas';
import {personCognition,perceivedRelations} from '../shared/cognition-view';
import {respondNpcCustodyTrade} from '../runtime/person-custody-trade';
import {issueWorkflowTicket} from './workflow-ticket';
export function prepareCustodyTradeResponse(snapshot:GameSnapshot,input:any){
 if(!input||Object.keys(input).some(k=>k!=='offerId'))throw Error('只接受原交接报价编号');
 const state=snapshot.state as any,r=rules.custodyMarket.offer(state,input.offerId);
 if(!r||r.buyerId===state.角色.主控单位ID)throw Error('主控须亲自回应');
 const reason=rules.custodyMarket.responseReason(state,r);if(reason)throw Error(reason);
 const person=state.人物.列表[r.buyerId],proposal=rules.custodyMarket.facts(state,person.id).find((v:any)=>v.id===r.id);
 const packet={time:state.世界.时间,self:{id:person.id,name:person.name,characterization:storyPersona(state,person),cognition:personCognition(state,person.id),gold:state.钱包.列表[person.walletId].gold},proposal,relationships:perceivedRelations(state,person.id)};
 return {record:r,messages:[{role:'system' as const,content:'你扮演实际收到看管交接报价的人物，依据本人意愿、责任和实际资金独立决定。只返回JSON {"accept":boolean,"reason":string}，理由1至600字。接受会立即按原条款支付价款并接收看管；只有明确列出的装置权益随同交接。羁押不代表归顺或招募，也不取得他人的精神控制来源。拒绝不付款。仅使用本人可知资料。'},{role:'user' as const,content:JSON.stringify(packet)}]};
}
export async function runCustodyTradeResponseWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {record,messages}=prepareCustodyTradeResponse(snapshot,input);
 const decision=await gateway.structured(messages,(d:unknown)=>{respondNpcCustodyTrade(structuredClone(snapshot.state),{offerId:record.id,decision:d},`npc-custody-trade:${record.id}`);return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.respond-custody-trade',payload:{offerId:record.id,decision}}),value:{stage:'person-custody-trade',personId:record.buyerId}};
}
