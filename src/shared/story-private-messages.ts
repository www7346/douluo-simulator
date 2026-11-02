export {PRIVATE_MESSAGE_CONTRACT} from './model-prompt-defaults';
import {MAX_STORY_PROSE_LENGTH,MAX_STORY_MESSAGE_COUNT} from './story-prose';

export const PRIVATE_MESSAGES_SCHEMA={type:'object',properties:{messages:{type:'array',minItems:1,maxItems:MAX_STORY_MESSAGE_COUNT,items:{type:'string',minLength:1,maxLength:MAX_STORY_PROSE_LENGTH}}},required:['messages'],additionalProperties:false};

export function validatePrivateMessages(value:any,allowEmpty=false):string[]{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>k!=='messages')||!Array.isArray(value.messages)||value.messages.length<(allowEmpty?0:1)||value.messages.length>MAX_STORY_MESSAGE_COUNT)throw Error('私聊消息格式不完整');
 const messages=value.messages.map((text:any)=>{if(typeof text!=='string'||!text.trim()||text!==text.trim()||text.length>MAX_STORY_PROSE_LENGTH)throw Error('私聊没有可保存的回复');return text;});
 if(messages.join('\n\n').length>MAX_STORY_PROSE_LENGTH)throw Error('回复超过单次保存容量，原稿仍可导出');
 return messages;
}
export const PRIVATE_CONVERSATION_ENDED='本次会话已结束，暂未收到回复。';
export const privateMessageProse=(messages:string[],ended=false)=>messages.join('\n\n')||(ended?PRIVATE_CONVERSATION_ENDED:'消息未送达，暂时没有回复。');
