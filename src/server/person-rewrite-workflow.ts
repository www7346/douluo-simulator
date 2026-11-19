import type {GameSnapshot} from '../runtime/contracts';
import type {ModelGateway} from '../runtime/model-gateway';
import {rules} from '../rules';
import {storyPersona} from '../runtime/story-personas';
import {promptMessage} from '../runtime/model-prompt-templates';
import {beastWritingTraits} from '../runtime/creative-context';
import {issueWorkflowTicket} from './workflow-ticket';

function rewriteOperator(state:any,actorId:string){
 const person=state.人物?.列表?.[actorId];
 if(person)return {id:person.id,name:person.name,characterization:storyPersona(state,person)};
 const unit=state.战斗单位?.列表?.[actorId];
 if(!unit)throw Error('人物改造的施术单位资料不存在');
 const beast=(Object.values(state.魂兽档案?.列表??{}) as any[]).find(profile=>profile.单位ID===actorId);
 return {id:unit.id,name:unit.名称,kind:unit.单位种类,
  ...(beast?{beast:{id:beast.id,name:beast.名称,years:beast.年限,categories:beast.类别标签,traits:beastWritingTraits(beast.种族特征),anatomy:beast.解剖标签,attributes:beast.属性谱}}:{})};
}

/** Complete an already paid NPC effect; retries never cast or charge it again. */
export async function runPersonRewriteWorkflow(snapshot:GameSnapshot,worldId:string,input:any,gateway:ModelGateway,secret:string,signal:AbortSignal){
 if(!input||Object.keys(input).some(k=>k!=='grantId')||typeof input.grantId!=='string')throw Error('人物改造只接受已完成的授权编号');
 const state=snapshot.state as any,a=rules.personRewrite.grant(state,input.grantId);
 if(a.actorId===state.角色.主控单位ID||a.status!=='pending')throw Error('没有待自动完成的NPC改造');
 const current=rules.personRewrite.preview(state,a.id,a.actorId);
 const packet={grant:current.grant,operator:rewriteOperator(state,a.actorId),target:current.person,people:current.people,relationships:current.relations,relationTypes:rules.social.RELATIONSHIPS,art:globalThis.SoulPersonaArt.paths,currentTurn:Math.max(0,(state.扩展?.story?.nextTurn??1)-1),source:state.扩展.cognitionChanges[a.cognitionId].contract};
 const base={grantId:a.id,actorId:a.actorId,patchId:'rewrite:'+rules.abilities.hash(a.id),expectedToken:current.token};
 const patch=await gateway.structured([promptMessage('person-rewrite'),{role:'user',content:JSON.stringify(packet)}],(value:any)=>{
  if(!value||Object.keys(value).some(k=>k!=='patch'))throw Error('请返回这次授权的人物设定');
  const candidate=rules.personRewrite.validatePatch(value.patch,{allowReality:a.allowReality,allowUpload:false});
  rules.personRewrite.apply(structuredClone(state),{...base,patch:candidate,allowUpload:false});return candidate;
 },{task:'person-rewrite',signal,repairValidation:true});
 // Validate every affected domain on a scratch state before issuing a signed command.
 const payload={...base,patch};
 rules.personRewrite.apply(structuredClone(state),{...payload,allowUpload:false});
 signal.throwIfAborted();return {ticket:issueWorkflowTicket(secret,worldId,snapshot,{type:'person.resolve-rewrite',payload}),value:{stage:'person-rewrite',personId:a.targetId}};
}
