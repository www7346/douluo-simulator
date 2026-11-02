import {descriptionProse} from '../shared/description-prose';
import {CREATIVE_TASK_INSTRUCTIONS} from './model-prompts';

const descriptiveFields=new Set(['description','appearance','concept','form','reply']);
const creativeChildren=new Set(['abilities','candidates','skills','items','source','proposals','design','patch','beast','beasts','materials']);

// The gateway keeps the provider reply for diagnostics. Only authored presentation fields
// in a creative answer enter this projection; validators still check the complete proposal.
export function creativeDescription(task:string,value:unknown):unknown {
 if(!Object.hasOwn(CREATIVE_TASK_INSTRUCTIONS,task))return value;
 function project(node:unknown):unknown {
  if(Array.isArray(node))return node.map(project);
  if(!node||typeof node!=='object')return node;
  const record=node as Record<string,unknown>,result={...record};
  for(const [key,field] of Object.entries(record)){
   if(typeof field==='string'&&descriptiveFields.has(key)){
    if(key!=='reply'||record.mode==='proposal')result[key]=descriptionProse(field);
   }else if(creativeChildren.has(key)){
    result[key]=project(field);
   }
  }
  return result;
 }
 return project(value);
}
