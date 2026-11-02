import type {StoryPlan,StoryTurn} from '../runtime/story-turns';
import {StoryPlanValidationError} from '../runtime/story-plan-validation-error';

export type StoryHostChannel='current'|'party';
/** Interpreter output metadata, consumed before the existing rule plan. This is
 * not a new conversation state, and never guesses a channel from player text. */
export function readStoryHostChannel(value:unknown):{channel:StoryHostChannel;proposal:unknown}{
 const raw=value as any,channel=raw?.channel;
 if(channel!=='current'&&channel!=='party')throw new StoryPlanValidationError('主持提案须选择本轮渠道channel',{
  instancePath:'/channel',keyword:'enum',submitted:channel??null,
  reference:{instancePath:'/channelOptions',value:['current','party']},
 });
 const {channel:_channel,...proposal}=raw;
 return {channel,proposal};
}

export function storyHostChannelScope(plan:StoryPlan,channel:StoryHostChannel,scope:Pick<StoryTurn,'partyChat'|'privatePersonId'|'battleId'>){
 if(channel==='party'){
  if(scope.privatePersonId||scope.battleId||plan.privateTo)throw Error('当前私聊或战报不能改投队伍群');
  return {...scope,partyChat:true as const};
 }
 if(!scope.partyChat&&plan.segments.some(s=>s.action.kind==='tell-party'))throw Error('发送动作与声明的会话渠道不同');
 return scope;
}
