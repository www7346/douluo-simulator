import type {GameCommand} from './contracts';
import {rules} from '../rules';
import {communicationAvailability} from '../shared/story-communication';
import {hasGeneratedName} from './generation-completion';
import {storyActionCapabilities} from './story-action-capabilities';
// Item synchronization can grant actions; unknown naming sources retain projection.
function namedItemActions(state:any,action:any):boolean{
 if(!state)return false;
 if(action.kind==='supply-buy')return false;
 const item=state.物品?.实例?.[action.itemId];if(!item)return false;
 try{return rules.world.inspectItem(state,item).skills.every((skill:any)=>hasGeneratedName(skill)||!!rules.world.ITEM_TEMPLATES[item.templateId]?.activeSkill&&!item.payload?.activeSkill&&!item.payload?.activeSkills);}catch{return false;}
}
const noGenerationCommands=new Set(['person.resolve-conversation','conversation.create','conversation.send','person.apply-rewrite','person.resolve-rewrite','person.resolve-change-reaction','story.close-private','story.close-party','story.finish','story.rewrite-prose','story.rewrite-archived-prose','story.record-summary','story.record-stage-summary']);
export function commandCannotGenerate(command:GameCommand,state?:any):boolean{
 if(noGenerationCommands.has(command.type))return true;
 const p=command.payload as any;if(!['story.execute','story.supplement'].includes(command.type)||p.plan?.privateTo||!Array.isArray(p.plan?.segments)||!p.plan.segments.length)return false;
 const checked=new Map<string,boolean>();
 const segments=command.type==='story.supplement'?p.plan.segments.slice(state?.扩展?.story?.active?.hostProgress?.baseStep??0):p.plan.segments;
 // A single message to an existing remote contact records the address only.
 // In-person contact can initialize a catalogue loadout. A preceding action can change location.
 const action=segments.length===1?segments[0].action:null;
 const recipient=state?.扩展?.story?.active?.privatePersonId;
 if(command.type==='story.execute'&&action?.kind==='address-person'&&recipient&&action.characterId===recipient&&action.characterStep===undefined&&state.人物?.列表?.[recipient]){
  const contact=communicationAvailability(state,recipient,{receiving:true});
  if(contact.available&&contact.channel?.kind==='soul-device')return true;
 }
 return segments.every((segment:any)=>{const a=segment.action,c=storyActionCapabilities(a?.kind);if(c.generation==='never')return true;if(c.generation!=='existing-items')return false;const key=a.kind==='supply-buy'?`template:${a.templateId}`:String(a.itemId);if(!checked.has(key))checked.set(key,namedItemActions(state,a));return checked.get(key);});
}
