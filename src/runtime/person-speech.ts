import {rules} from '../rules';

/** The original delivered statement determines the NPC; callers cannot supply a listener. */
export function assessNpcSpeech(state:any,input:any,sourceId:string){
 if(!input||Object.keys(input).some(k=>!['statementId','decision'].includes(k)))throw Error('听闻判断只接受原话编号与本人判断');
 const statement=rules.social.speechTable(state).statements.find((r:any)=>r.id===input.statementId);
 if(!statement||statement.listenerId===state.角色.主控单位ID)throw Error('没有可由NPC判断的实际听闻；主控须亲自决定');
 return rules.world.settleIntent(state,{id:sourceId,type:'assess-person-speech',actorId:statement.listenerId,statementId:statement.id,decision:input.decision});
}
