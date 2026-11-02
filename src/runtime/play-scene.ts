import {pendingBattleAftermath} from './journey-status';

/** Looking at a detail panel never changes the underlying gameplay scene. */
export function playSceneKind(state:any):'world'|'dungeon'|'battle'|'competition'|'slaughter' {
  if(state?.战斗?.状态==='进行中'||pendingBattleAftermath(state))return 'battle';
  if(state?.远征?.当前?.status==='active')return 'dungeon';
  if(state?.杀戮场?.当前&&!['completed','failed'].includes(state.杀戮场.当前.status))return 'slaughter';
  return state?.比赛?.当前&&!['completed','failed'].includes(state.比赛.当前.status)?'competition':'world';
}

/** Closing a detail is navigation, not permission to leave an ongoing activity. */
export function playReturnPage(state:any,origin=''):'adventure'|'battle'|'competition'|'slaughter' {
  const scene=playSceneKind(state);
  if(scene==='battle'||scene==='competition'||scene==='slaughter')return scene;
  if(scene==='world'&&(origin==='competition'||origin==='slaughter'))return origin;
  return 'adventure';
}

export function playReturnRoute(state:any,hash=''):string {
  const [page,query]=hash.replace(/^#\/?/,'').split('?'),params=new URLSearchParams(query);
  const target=playReturnPage(state,['competition','slaughter'].includes(page)?page:params.get('from')??'');
  return `/${target}${target==='competition'&&params.get('history')?'?history='+encodeURIComponent(params.get('history')!):''}`;
}

export function pendingExpeditionEscape(state:any):boolean {
  return state?.远征?.当前?.phase==='combat'&&state?.战斗?.状态==='已结束'&&
    state.战斗.扩展?.成员?.[state.角色?.主控单位ID]?.status==='escaped';
}
