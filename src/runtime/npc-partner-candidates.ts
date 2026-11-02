import {rules} from '../rules';
/** Only actual colocated people can receive an in-person proposal; no catalogue spawning. */
export function npcPartnerCandidates(state:any,ownerId:string){
 const owner=state.人物.列表[ownerId];if(!owner)return [];
 return (Object.values(state.人物.列表) as any[]).filter(p=>p.id!==ownerId&&p.id!==state.角色.主控单位ID&&rules.actions.colocated(state,ownerId,p.id)&&p.status!=='dead'&&(!state.战斗单位.列表[p.id]||(state.战斗单位.列表[p.id].存活状态==='存活'&&state.战斗单位.列表[p.id].资源.生命.当前>0)))
 .map(p=>({id:p.id,name:p.name,occupation:p.occupation,meaning:'当前同地的实际人物；尚未答应合作，仍需其独立回应。'}));
}
