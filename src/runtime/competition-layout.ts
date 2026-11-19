export interface BracketNode {id:string;x:number;y:number;width:number;height:number;match:any}
export const BRACKET_METRICS={width:248,height:168,border:1,label:30,row:68,columnGap:40,rowGap:24,padding:24,heading:70,headingRail:64} as const;
export const bracketSlotY=(slot:number)=>BRACKET_METRICS.border+BRACKET_METRICS.label+BRACKET_METRICS.row*(slot+.5);
export function competitionLayout(rounds:any[],mobile=false) {
  const {width,height,padding,heading}=BRACKET_METRICS;
  const stepX=width+BRACKET_METRICS.columnGap,stepY=height+BRACKET_METRICS.rowGap;
  const nodes:BracketNode[]=rounds.flatMap((round:any,r:number)=>round.matches.map((match:any,i:number)=>{
    if(mobile)return {id:match.id,x:padding+r*stepX,y:heading+((2**r-1)/2+i*2**r)*stepY,width,height,match};
    const side=r<3&&i>=round.matches.length/2?'right':'left',local=r<3?i%(round.matches.length/2):0;
    return {id:match.id,x:padding+(r===3?3:side==='left'?r:6-r)*stepX,
      y:heading+((2**r-1)/2+local*2**r)*stepY-(r===3?stepY*2:0),width,height,match};
  }));
  const edges=nodes.flatMap(node=>{
    const next=nodes.find(item=>item.id===node.match.next?.id);if(!next)return [];
    const right=next.x>node.x,fromX=right?node.x+width:node.x,toX=right?next.x:next.x+width;
    const winnerSlot=node.match.players.findIndex((p:any)=>p.won),fromY=node.y+(winnerSlot<0?height/2:bracketSlotY(winnerSlot));
    const toY=next.y+bracketSlotY(node.match.next.slot),bend=(fromX+toX)/2;
    return [{id:node.id,to:next.id,slot:node.match.next.slot,fromX,fromY,toX,toY,
      path:`M${fromX},${fromY}H${bend}V${toY}H${toX}`,resolved:node.match.resolved,
      player:node.match.players.some((p:any)=>p.isPlayer&&p.won)}];
  });
  return {width:padding*2+width+stepX*(mobile?3:6),height:heading+(mobile?7:3)*stepY+height+padding,nodes,edges,
    headings:Array.from({length:mobile?4:7},(_,i)=>({x:padding+i*stepX,label:mobile?rounds[i]?.label:['十六强','八强','半决赛','决赛','半决赛','八强','十六强'][i]}))};
}
