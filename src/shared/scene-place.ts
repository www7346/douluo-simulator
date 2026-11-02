import './expedition-context-core.js';
import './scene-position-core.js';

/** Display the person's actual position without changing the world map or save. */
export function scenePlace(state:any,personId=state?.角色?.主控单位ID):string{
 const mapName=state?.地图?.地点?.[state?.地图?.当前地点ID]?.name;
 if(!personId||!state?.人物?.列表?.[personId])return mapName||'未知地点';
 try{
  const position=globalThis.SoulScenePosition.positionOf(state,personId);
  if(position.kind==='contained')return '封神台内';
  if(position.kind==='transit')return '旅途途中';
  if(position.kind==='location')return state?.地图?.地点?.[position.locationId]?.name||'未知地点';
 }catch{/* Old or incomplete display data must not break the save list. */}
 return '未知地点';
}
