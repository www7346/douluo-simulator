import {rules} from '../rules';

export function validateHarvestTargets(value:unknown):asserts value is string[]{
 if(!Array.isArray(value)||value.length<1||value.length>12||value.some(id=>typeof id!=='string'||!id.trim()||id.length>160)||new Set(value).size!==value.length)throw Error('采集目标须为1至12个不重复的魂兽编号');
}
/** One requested group is atomic; each yield still uses the existing single-beast rule. */
export function harvestStoryBeasts(state:any,targets:unknown,sourceId:string){
 validateHarvestTargets(targets);
 let current=structuredClone(state);const results:Record<string,any>[]=[];
 for(const [index,beastUnitId] of targets.entries()){
  const settled=rules.expedition.harvestBeast(current,beastUnitId,{},`${sourceId}:beast:${index}`);
  current=settled.state;results.push(settled.receipt);
 }
 return {state:current,receipt:{type:'expedition-beasts-harvested',beastUnitIds:[...targets],results,
  summary:results.map(r=>r.summary).join('；')}};
}
