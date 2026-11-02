import {storySourceInput} from '../shared/story-source-input';
import {contactStoryPerson} from './story-communication';
import type {HeardStatement} from '../shared/story-person-knowledge';
export {validateStoryKnowledge,personHeardStatements} from '../shared/story-person-knowledge';

/** Saying something establishes exposure, not truth, agreement, belief or a mechanical consequence. */
export function recordStoryStatement(state:any,characterId:unknown,text:string,source:HeardStatement['source'],id:string){
 const input=storySourceInput(state.扩展.story.active);
 if(typeof text!=='string'||!text.trim()||text.length>2000||!Number.isSafeInteger(source.inputStart)||source.inputStart<0||!Number.isSafeInteger(source.inputEnd)||source.inputEnd>input.length||input.slice(source.inputStart,source.inputEnd)!==text)throw Error('人物听闻须逐字保留玩家输入中的相应片段');
 const met=contactStoryPerson(state,characterId);state=met.state;
 const person=state.人物.列表[met.receipt.personId];
 const record:HeardStatement={id,kind:'heard',speakerId:state.角色.主控单位ID,listenerId:person.id,text,truth:'unverified',source:structuredClone(source),locationId:state.地图.当前地点ID,time:structuredClone(state.世界.时间),...(met.receipt.channel?{channel:met.receipt.channel}:{})};
 person.扩展.听闻记录??=[];person.扩展.听闻记录.push(record);
 return {state,receipt:{type:'person-heard-statement',personId:person.id,statement:structuredClone(record),summary:`${person.name}听到了玩家这句话。`}};
}
