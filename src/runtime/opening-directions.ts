import {rules} from '../rules';

export interface OpeningDirection {id:string;label:string;detail:string;input:string;personId?:string;locationId?:string}

/** Read-only, player-visible suggestions. Every route and target comes from current rules. */
export function openingDirections(state:any) {
 const playerId=state.角色?.主控单位ID,locationId=state.地图?.当前地点ID;
 const situations=rules.world.openingSituationFacts(state);
 const result:{locationName:string;directions:OpeningDirection[];situations:any[];blocked:string}={
  locationName:state.地图?.地点?.[locationId]?.name??state.场景?.地点??'',directions:[],situations,
  blocked:rules.world.worldActionBlockReason(state)||(state.远征?.当前?'先处理当前探索，再安排外面的行程。':'')};
 if(!playerId||result.blocked)return result;
 const guidance=rules.world.openingGuidance(state);
 if(guidance.guidance&&!guidance.reason&&guidance.guidance.giftStatus==='available')result.directions.push({
  id:'first-guidance',label:'向大师了解出发准备',detail:'玉小刚在此地。可先问武魂和魂环，不必先答应猎魂或选见面礼。',
  input:'我找玉小刚了解自己的武魂和出发准备，先听听他的建议，暂不领取见面礼或约定出发。',personId:'yu-xiaogang-notting',locationId});
 const routes=rules.world.makeNarrativeProjection(state).nearbyRoutes;
 for(const route of routes){
  if(!route.available)continue;
  try{
   const quote=rules.world.previewIntent(state,{type:'travel',destinationId:route.destinationId});
   if(!quote.affordable)continue;
   result.directions.push({id:`route:${route.destinationId}`,label:`去${route.destinationName}看看`,
    detail:`当前路线约${quote.path.totalMinutes}分钟，路费${quote.currencyText}；可在草稿中改为先问路线。`,
    input:`我准备沿当前路线前往${route.destinationName}，支付约定路费；暂不接受新的任务。`,locationId:route.destinationId});
   break;
  }catch{/* A route becoming unavailable is not an actionable suggestion. */}
 }
 result.directions.push({id:'own-supplies',label:'整理自己的行囊',detail:'查看已有装备、药品与魂环；尚未选择时不购买、不吸收。',input:'我先检查随身补给和装备，看看自己已经有什么、接下来缺什么；先不购买或使用。'});
 if(rules.world.SAFE_RECOVERY_LOCATION_IDS.includes(locationId))result.directions.push({id:'quiet-rest',label:'先在此处休整',detail:'这里可安全休整。可以暂不接受新的邀约。',input:'我先在这里休整恢复，暂不接受新的机会。'});
 return result;
}
