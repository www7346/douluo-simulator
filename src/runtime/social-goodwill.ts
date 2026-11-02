// Only a settled, accepted gift or fulfilled promise calls this boundary.
export function recordGoodwill(state:any,targetId:string,sourceId:string,kind:'gift'|'promise'){
 const person=state.人物.列表[targetId],playerId=state.角色.主控单位ID;
 if(!person||targetId===playerId)return;
 const day=state.世界.时间.day,history=(person.扩展.善意往来??=[]);
 if(history.some((e:any)=>e.sourceId===sourceId||e.playerId===playerId&&e.day===day&&e.kind===kind))return;
 const before=person.relationship?.player??0,after=Math.min(100,before+2);
 (person.relationship??={}).player=after;
 history.push({day,playerId,sourceId,kind,before,after,name:kind==='gift'?'收下赠礼':'兑现承诺',turn:state.扩展?.story?.active?.number});
}
