import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {storyPersona} from '../runtime/story-personas';
import {personCognition,perceivedRelations} from '../shared/cognition-view';
import {issueWorkflowTicket} from './workflow-ticket';
export async function runDrugOfferWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 if(!input||Object.keys(input).some(k=>k!=='offerId'))throw Error('伪装药物回应只接受原宣称编号');
 const s=snapshot.state as any,r=rules.poison.table(s).offers.find((r:any)=>r.id===input.offerId&&r.status==='pending');
 if(!r||r.targetId===s.角色.主控单位ID)throw Error('没有该人物当前待回应的药物宣称');
 rules.influence.assertVoluntary(s,r.targetId);
 rules.actions.resolve(s,{actorId:r.targetId,targetIds:[r.actorId]});
 const person=s.人物.列表[r.targetId],known=rules.poison.facts(s,person.id).offers.find((o:any)=>o.id===r.id);
 const packet={time:s.世界.时间,self:{id:person.id,name:person.name,characterization:storyPersona(s,person),cognition:personCognition(s,person.id),canSwallow:rules.poison.canSwallow(s,person.id),canReceiveNow:rules.poison.canConsumeOffer(s,r)},operator:{id:r.actorId,name:s.人物.列表[r.actorId].name},offer:{id:r.id,claim:known.claim,knownWarning:known.knownWarning},relationships:perceivedRelations(s,person.id)};
 const decision=await gateway.structured([{role:'system',content:'你扮演收到药物用途宣称的人物，依据本人可知事实和意愿，独立选择接受、拒绝或查验。宣称尚未证实，不得推断隐藏药性。接受和实际吞服分别决定，接受不代表药效成功。只返回JSON {"decision":"accept"|"refuse"|"inspect","swallow":boolean}；只有accept且canReceiveNow与canSwallow都为true允许swallow为true；暂时无法递药时仍可选择接受但不吞服。不得给出剂量、强度或判定结果。'},{role:'user',content:JSON.stringify(packet)}],(d:any)=>{if(!d||Object.keys(d).some(k=>!['decision','swallow'].includes(k))||!['accept','refuse','inspect'].includes(d.decision)||typeof d.swallow!=='boolean'||d.decision!=='accept'&&d.swallow||d.swallow&&(!packet.self.canSwallow||!packet.self.canReceiveNow))throw Error('本人药物回应无效');return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.respond-drug-offer',payload:{offerId:r.id,decision}}),value:{stage:'person-drug-offer',personId:r.targetId}};
}
