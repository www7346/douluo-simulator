import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {storyPersona} from '../runtime/story-personas';
import {personCognition,perceivedRelations} from '../shared/cognition-view';
import {decideNpcCustodyAuction} from '../runtime/person-custody-auction';
import {issueWorkflowTicket} from './workflow-ticket';
export function prepareCustodyAuctionDecision(snapshot:GameSnapshot,input:any){
 if(!input||Object.keys(input).some(k=>!['auctionId','personId','quoteEventId'].includes(k))||!rules.custodyAuction.pending(snapshot.state).some((r:any)=>r.auctionId===input.auctionId&&r.personId===input.personId&&r.quoteEventId===input.quoteEventId))throw Error('没有这项本人尚未评估的现场拍卖');
 const s=snapshot.state as any,p=s.人物.列表[input.personId],auction=rules.custodyAuction.facts(s,p.id).find((r:any)=>r.id===input.auctionId),packet={time:s.世界.时间,self:{id:p.id,name:p.name,characterization:storyPersona(s,p),cognition:personCognition(s,p.id),gold:s.钱包.列表[p.walletId].gold},auction,relationships:perceivedRelations(s,p.id)};
 return {messages:[{role:'system' as const,content:'你扮演实际在拍卖现场的人物。依据本人意愿、可用资金、与相关人物的关系，独立决定是否竞拍。只返回JSON {"gold":整数或null,"reason":string}。null表示本次放弃；整数须达到当前最低出价并且本人实际付得起。出价会立即托管该笔金魂币，高价超过或拍卖失效退还；截止时仍满足原现场条件才成交。本人仅评估本次拍卖一次，不必竞买。理由1至600字，仅本人可见。只使用本人可知资料。'},{role:'user' as const,content:JSON.stringify(packet)}]};
}
export async function runCustodyAuctionDecisionWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {messages}=prepareCustodyAuctionDecision(snapshot,input);
 const decision=await gateway.structured(messages,(d:unknown)=>{decideNpcCustodyAuction(structuredClone(snapshot.state),{...input,decision:d},`npc-custody-auction:${input.auctionId}:${input.personId}`);return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.decide-custody-auction',payload:{...input,decision}}),value:{stage:'person-custody-auction',personId:input.personId}};
}
