import {storySourceInput} from './story-source-input';
import type {StoryTurn} from '../runtime/story-turns';

export interface PrivateRouteRequest {name:string;source:string}
export interface PrivateStoryRoute extends PrivateRouteRequest {personId:string;inputStart:number;inputEnd:number;blockedReason?:string}
export function checkPrivateRouteRequest(value:any,input:string):PrivateRouteRequest{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['name','source'].includes(k))||typeof value.name!=='string'||!value.name.trim()||value.name.length>160||typeof value.source!=='string'||!value.source.trim()||value.source.length>8000||!value.source.includes(value.name)||!input.includes(value.source))throw Error('私聊路由须引用玩家本轮原话及其中明确的人物称呼');
 return {name:value.name,source:value.source};
}
export function validatePrivateStoryRoute(turn:StoryTurn){
 const r=turn.privateRoute;if(r===undefined)return;
 if(!r||Object.keys(r).some(k=>!['name','source','personId','inputStart','inputEnd','blockedReason'].includes(k)))throw Error('私聊路由来源无效');
 checkPrivateRouteRequest({name:r.name,source:r.source},storySourceInput(turn));
 if(!Number.isInteger(r.inputStart)||r.inputStart<0||r.inputEnd!==r.inputStart+r.source.length||storySourceInput(turn).slice(r.inputStart,r.inputEnd)!==r.source||r.personId!==turn.privatePersonId||!r.personId||turn.battleId||turn.status==='planning'||turn.before?.people?.[0]?.id!==r.personId||turn.after?.people?.[0]?.id!==r.personId)throw Error('私聊路由与原话、对象或冻结事实不一致');
 if(r.blockedReason!==undefined&&(typeof r.blockedReason!=='string'||!r.blockedReason||turn.results.some(s=>s.status!=='failed'||s.reason!==r.blockedReason)||turn.before?.communication?.available!==false))throw Error('未送达的私聊不能包含已执行行动或听闻');
}
