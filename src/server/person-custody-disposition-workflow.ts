import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {storyPersona} from '../runtime/story-personas';
import {personCognition,perceivedRelations} from '../shared/cognition-view';
import {decideNpcCustodyDisposition} from '../runtime/person-custody-disposition';
import {issueWorkflowTicket} from './workflow-ticket';
export function prepareCustodyDisposition(snapshot:GameSnapshot,input:any){
 if(!input||Object.keys(input).some(k=>k!=='decisionKey'))throw Error('只接受原实际看管处置编号');
 const state=snapshot.state as any,r=rules.custodyMarket.dispositionOptions(state,input.decisionKey),person=state.人物.列表[r.ownerId];
 const packet={time:state.世界.时间,self:{id:person.id,name:person.name,characterization:storyPersona(state,person),cognition:personCognition(state,person.id),gold:state.钱包.列表[person.walletId].gold},
  custody:rules.custody.facts(state,person.id),target:{id:r.personId,name:state.人物.列表[r.personId].name},location:r.position.kind==='transit'?'实际押送路段':state.地图.地点[r.position.locationId].name,
  relationships:perceivedRelations(state,person.id),cooperation:rules.cooperation.facts(state,person.id).filter((a:any)=>a.memberId===r.personId),preparations:rules.preparations.facts(state,person.id).filter((a:any)=>a.memberId===r.personId),options:{retain:true,buyers:r.buyers,devices:r.devices,canAuction:r.canAuction,businessActions:r.businessActions,businessContext:r.businessContext}};
 return {record:r,messages:[{role:'system' as const,content:'你扮演当前实际看管者，只依据本人可知资料独立决定。仅返回JSON。继续看管：{"kind":"retain","reason":"本人理由"}；向实际在场的人提出报价：{"kind":"offer","reason":"本人理由","buyerId":"可选人物ID","gold":整数0至1000000000,"expiresInMinutes":整数1至1440,"deviceTerms":[]}；仅在实际拍卖场开拍：{"kind":"auction","reason":"本人理由","reserveGold":整数0至1000000000,"durationMinutes":整数1至1440,"deviceTerms":[]}。每条附属条款为{"itemId":"实际装置ID","transferOwnership":boolean,"transferControl":boolean}，须至少转移一项实际有权转移的权益；可明确不附带装置。也可以从 options.businessActions 原样选择一项实际业务，只添加 reason：escort 为押送，release 为解除当前看管，house 为置办场所并入监，care 为修整房门或调整看守，treat 为用本人药品实际治疗；按给出的选项合法采购一份药品、进入原牢房并恢复原房门和值守，escort-operation 为暂停押送的续行或取消，withdraw-and-escort 为实际出监后押送。押送只启动真实行程，不代表已到达；释放不移动人物，不替本人接受任何合作。不得发明行动字段、人物ID、目的地或装置模式。propose-cooperation 明确提出合作并等待对方独立回应；impose-cooperation 仅可依现有精神或灵魂来源控制。设施内这两种行动会先结束本人值守、实际开门出监到公共位置再当面提出。renew-cooperation 处理原暂停合作，end-cooperation 结束原合作；prepare 实际解放或拆下选中器具，recover 尝试原约定复锁（失败仍保留），close-preparation 结束收束而不恢复器具。绝不可代替受邀者接受、给出装配许可或签署分物。理由1至600字，属于本人私有思考。报价与开拍不代表买方接受、成交或被押者归顺，不能代替其他人物决定。'}, {role:'user' as const,content:JSON.stringify(packet)}]};
}
export async function runCustodyDispositionWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 const {record,messages}=prepareCustodyDisposition(snapshot,input);
 const decision=await gateway.structured(messages,(d:unknown)=>{decideNpcCustodyDisposition(structuredClone(snapshot.state),{decisionKey:record.key,decision:d},`npc-custody-disposition:${record.key}`);return d;},{task:'npc-autonomy',signal,promptStructure:{strict:true}});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.decide-custody-disposition',payload:{decisionKey:record.key,decision}}),value:{stage:'person-custody-disposition',personId:record.ownerId}};
}
