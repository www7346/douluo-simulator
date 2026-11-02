import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import type {GameSnapshot} from '../runtime/contracts';
import {CloudError} from '../cloud/protocol';

function canonical(value:any):string {
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
  return JSON.stringify(value);
}
export const stateFingerprint=(snapshot:GameSnapshot)=>createHash('sha256').update(canonical({rulesetVersion:snapshot.rulesetVersion,revision:snapshot.revision,state:snapshot.state})).digest('hex');
const commands=new Set(['generation.apply','battle.action','expedition.resolve-narrative','person.resolve-room','person.name-ring','person.choose-ring','person.name-research','person.choose-research','person.assess-speech','person.respond-gift','person.respond-custody-trade','person.decide-custody-auction','person.decide-defeat','person.decide-custody-disposition','person.decide-restraint-permission','person.respond-ability-use','ring.name-choices','ring.item.name-source','research.resolve','title.register','story.execute','story.supplement','story.respond-commitment','story.resolve-npc-goal','person.respond-cooperation','person.respond-loot','story.respond-belief','story.finish','story.rewrite-prose','story.rewrite-archived-prose','story.record-summary','story.record-stage-summary']);
commands.add('person.respond-performance-agreement');commands.add('person.respond-rescue');commands.add('person.respond-drug-offer');
commands.add('person.resolve-rewrite');
commands.add('person.resolve-change-reaction');
commands.add('story.respond-immediate-gift');
commands.add('person.respond-growth');
commands.add('person.allocate-growth');
commands.add('person.respond-contract');commands.add('person.respond-contract-order');
commands.add('person.resolve-conversation');
export const supportsWorkflowCommand=(type:string)=>commands.has(type);
/** Persist only a validated result, never the provider profile or its secret. */
export function issueWorkflowTicket(secret:string,worldId:string,snapshot:GameSnapshot,command:{type:string;payload:Record<string,any>}) {
  if(!commands.has(command.type))throw new Error('Unsupported internal workflow');
  const data={version:1,worldId,stateHash:stateFingerprint(snapshot),command};
  return {data,signature:createHmac('sha256',secret).update(canonical(data)).digest('hex')};
}
export function verifyWorkflowTicket(secret:string,worldId:string,snapshot:GameSnapshot,ticket:any):{type:string;payload:Record<string,any>} {
  if(!secret||!ticket?.data||typeof ticket.signature!=='string'||!/^[a-f0-9]{64}$/.test(ticket.signature))throw new CloudError('invalid-workflow','生成结果凭据无效，已保存的方案仍保留',422);
  const expected=createHmac('sha256',secret).update(canonical(ticket.data)).digest();
  if(!timingSafeEqual(expected,Buffer.from(ticket.signature,'hex'))||ticket.data.version!==1||ticket.data.worldId!==worldId||!commands.has(ticket.data.command?.type))throw new CloudError('invalid-workflow','生成结果凭据无效，已保存的方案仍保留',422);
  if(ticket.data.stateHash!==stateFingerprint(snapshot))throw new CloudError('stale-workflow','生成期间旅程已经变化，这份结果没有写入当前进度',409);
  return structuredClone(ticket.data.command);
}
