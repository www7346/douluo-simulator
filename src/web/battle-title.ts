/** Use the recorded battle kind, including ordinary person duels outside the arena. */
export function battleSceneTitle(battle:any):string {
  const competitive=battle?.扩展?.竞技;
  if(competitive?.mode==='endgame')return '终局之战';
  if(competitive?.mode==='slaughter-city')return '地狱死斗';
  if(competitive?.mode==='solo-competition')return '斗魂赛';
  if(battle?.扩展?.battleKind==='lethal')return '死斗';
  if(battle?.扩展?.battleKind==='sparring')return '切磋';
  if(battle?.扩展?.battleKind==='competition')return '斗魂赛';
  return competitive?'魂师对决':'遭遇交锋';
}
