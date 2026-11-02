import {rules} from '../rules';

/** Host-only reference attestation. Native UI registration keeps its own defaults. */
export function validateStoryCompetitionReferences(state:any,plan:any,answer=''){
 const venues=Object.values(rules.arena.COMPETITION_VENUES) as any[];
 for(const segment of plan.segments){
  const action=segment.action;if(action.kind!=='register-competition')continue;
  const source=segment.source+'\n'+answer;
  const matches=(text:string)=>venues.filter(v=>[v.name,v.shortName,v.id].some(name=>typeof name==='string'&&name.length>=2&&text.includes(name)));
  const answered=matches(answer),named=answered.length?answered:matches(segment.source);
  if(named.length===1&&(!action.venueId||action.venueId===named[0].id)){
   action.venueId=named[0].id;continue;
  }
  const namedPlace=Object.values(state.地图?.地点??{}).some((p:any)=>p.name&&source.includes(p.name));
  if(!action.venueId&&!named.length&&!namedPlace)continue;
  throw Error('参赛地点尚未与玩家选择对应。只能报名原话或本次补充回答明确选择的正式赛事，不能把同城赛事当作所点名的场馆；请用clarify说明当前可选赛事并确认。未点名具体地点的当地报名可省略venueId。');
 }
}
