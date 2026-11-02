/** Validate elapsed time against the actual death ledger, not narrative text. */
export function validateActionTime(state:any,actorId:string,requested:number,before:any,after:any,interruption:any):void{
  const stamp=(t:any)=>t.day*1440+t.hour*60+t.minute,elapsed=stamp(after)-stamp(before);
  if(!interruption){if(elapsed!==requested)throw Error('行动实际耗时与计划不一致');return;}
  const death=state.人物?.列表?.[actorId]?.life?.death;
  if(!death||interruption.kind!=='life-exhausted'||interruption.personId!==actorId||interruption.deathId!==death.id||interruption.at!==death.at
    ||stamp(after)!==death.at||elapsed<0||elapsed>requested||Object.keys(interruption).some(k=>!['kind','personId','deathId','at'].includes(k)))throw Error('行动中断缺少真实死亡来源');
}
