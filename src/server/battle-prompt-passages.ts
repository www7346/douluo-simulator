/** Preserve each resolved action and its order while sharing repeated prose in the outbound prompt. */
export function compactBattlePassages<T extends {events:any[]}>(facts:T):T {
  let changed=false;
  const events=facts.events.map(event=>{
    const battle=event.facts?.battle, account=battle?.account, passages=account?.passages;
    if(!Array.isArray(passages)||passages.length<8)return event;
    const patterns=new Map<string,{count:number;id:number}>();
    const rows=passages.map((passage:any)=>{
      if(Object.keys(passage).some(k=>k!=='kind'&&k!=='statement')||passage.kind!=='具体经过'||typeof passage.statement!=='string'||passage.statement.includes('〈数〉'))return null;
      const match=/^第(\d+)回合，按发生顺序第(\d+)项：(.+)$/s.exec(passage.statement);
      if(!match)return null;
      const values:string[]=[];
      const pattern=match[3].replace(/\d+/g,n=>{values.push(n);return '〈数〉';});
      const group=patterns.get(pattern)??{count:0,id:0};group.count++;patterns.set(pattern,group);
      return {round:match[1],sequence:match[2],pattern,values,group};
    });
    const phrases:string[]=[];
    for(const [pattern,group] of patterns)if(group.count>1)group.id=phrases.push(pattern);
    if(!phrases.length)return event;
    const concise={...account,passageFormat:'按原行动顺序。数组依次是回合、行动序号、句式编号（从1起）和代入各个〈数〉的原值。独立文字直接阅读。',phrases,
      passages:rows.map((row,index)=>row?.group.id?[row.round,row.sequence,row.group.id,...row.values]:passages[index])};
    if(Buffer.byteLength(JSON.stringify(concise))>=Buffer.byteLength(JSON.stringify(account)))return event;
    changed=true;
    return {...event,facts:{...event.facts,battle:{...battle,account:concise}}};
  });
  return changed?{...facts,events}:facts;
}
