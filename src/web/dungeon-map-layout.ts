export interface DungeonLayer {layer:number;nodeIds:string[]}

/** Display coordinates only. Routes, room types and availability come from the rules. */
export function dungeonMapLayout(layers:DungeonLayer[],viewportHeight:number){
 const compact=viewportHeight>0&&viewportHeight<500;
 const spacing=compact?104:126,padding=compact?134:148,top=compact?56:64;
 const height=Math.max(260,Math.round(viewportHeight),Math.max(0,layers.length-1)*spacing+padding);
 const positions=new Map<string,{x:number;y:number}>();
 const floors=layers.map((layer,index)=>{
  const y=top+(layers.length-index-1)*(height-padding)/Math.max(1,layers.length-1);
  layer.nodeIds.forEach((id,col)=>positions.set(id,{x:12+(col+1)*80/(layer.nodeIds.length+1),y}));
  return {layer:layer.layer,y};
 });
 return {height,positions,floors};
}
