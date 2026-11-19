import {rules} from '../rules';

/** Read-only quotes for named destinations, using the same travel rules as the UI. */
export function storyTravelOptions(state:any,input:string){
 const destinations=(Object.values(state.地图?.地点??{}) as any[]).filter(p=>
  p.id!==state.地图?.当前地点ID&&rules.world.isLocationKnown(state,p.id)&&p.name&&input.includes(p.name));
 if(!destinations.length)return null;
 let preview:((intent:Record<string,string>)=>any)|undefined;
 return {
  meaning:'这是输入中具名地点的旅行预览，不是已执行结果。travel抵达地图地点，结算实际路程时间和途中事件，不开始远征。找人可先旅行，到达后再用同一人物ID相遇；人物是否在场由该步执行时检查。预览未覆盖别名或未具名目的地，缺项不表示不可到达。',
  destinations:destinations.map(p=>{
   try{
    preview??=rules.world.intentPreviewer(state);
    const quote=preview!({type:'travel',destinationId:p.id,mode:'balanced'});
    return {destinationId:p.id,name:p.name,mode:'balanced',available:true,affordable:quote.affordable,minutes:quote.path.totalMinutes,costGold:quote.path.totalCostGold};
   }catch(error){return {destinationId:p.id,name:p.name,mode:'balanced',available:false,reason:(error as Error).message};}
  }),
 };
}
