import {jsonEqual} from './json-identity';
import type {StoryTurn} from '../runtime/story-turns';
/** The original request stays intact; one saved answer can extend its source text. */
export function storySourceInput(turn:Pick<StoryTurn,'input'|'hostProgress'>):string {
 return turn.hostProgress?.answer ? turn.input+'\n'+turn.hostProgress.answer : turn.input;
}

/** Archive checks keep the same saved answer and frozen execution prefix. */
export function validateStoryHostSource(turn:StoryTurn):void {
 const h=turn.hostProgress;if(!h)return;
 if(!h||typeof h.requestId!=='string'||!h.requestId||!Number.isSafeInteger(h.baseStep)||h.baseStep<1||h.baseStep>turn.results.length||!['waiting','ready','used','cancelled'].includes(h.status)||!['clarification','scene-refresh','query-refresh'].includes(h.reason)||!Array.isArray(h.plan?.segments)||storySourceInput(turn).length>8000)throw Error('故事的补充安排记录不完整');
 if(h.answer!==undefined&&(typeof h.answer!=='string'||!h.answer.trim())||h.status==='used'&&h.reason==='clarification'&&!h.answer)throw Error('故事缺少当时的补充选择');
 for(let i=0;i<h.baseStep;i++){const a=h.plan.segments[i],b=turn.results[i];if(!a||a.source!==b.source||!jsonEqual(a.action,b.action))throw Error('故事的已执行安排不一致');}
 if(h.status==='used'){
  if(!h.acceptedPlan?.segments?.length||h.acceptedPlan.segments.length>12)throw Error('故事缺少已接受的后续安排');
  for(const [i,r] of turn.results.entries()){const segment=h.acceptedPlan.segments[i];if(!segment||segment.source!==r.source||!jsonEqual(segment.action,r.action)||!storySourceInput(turn).includes(r.source))throw Error('故事的补充原话与执行安排不一致');}
 }
 if(turn.status==='complete'&&['waiting','ready'].includes(h.status))throw Error('待补充的安排尚不能归档');
}
