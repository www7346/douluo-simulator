/** Read committed amounts without importing private effect compilation. */
export function battleResourceOutcomeReading(receipt:any,name:(id:string)=>string):string[]{
 const rows:string[]=[];
 for(const event of receipt.battleResourceEvents??[]){
  const who=name(event.ownerId);
  rows.push(event.event==='consume-all'?`${who}本次消耗了对应战斗蓄能的全部${event.amount}份。`:`${who}对应战斗蓄能由${event.before}变为${event.after}份，本次实际增加${event.gained}份。`);
 }
 for(const event of receipt.resourceEndstates??[]){
  rows.push(`${name(event.payerId)}在本次攻击与反应结束后，生命从${event.before.health}变为${event.after.health}，魂力从${event.before.soulPower}变为${event.after.soulPower}。${event.deathPreserved?'仍处于死亡状态，没有复活。':''}`);
 }
 return rows;
}
