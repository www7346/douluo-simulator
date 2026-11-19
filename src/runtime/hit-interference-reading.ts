const modes:Record<string,string>={normal:'普通掷骰',advantage:'掷两次取较高值',disadvantage:'掷两次取较低值'};
const kinds:Record<string,string>={hit_advantage:'命中优势',hit_disadvantage:'命中干扰',hit_reroll:'失手重掷',evasion_reroll:'规避重掷',sure_hit:'必中',absolute_evasion:'绝对闪避',critical_guarantee:'会心保证',critical_guard:'暴击抑制',miss_graze:'失手补偿'};

/** Read only the frozen arbitration. Current statuses and ability descriptions cannot change it. */
export function hitInterferenceReading(check:any,{arithmetic=false}:{arithmetic?:boolean}={}):string[]{
 const r=check?.interference;if(r?.version!==1)return [];
 const lines:string[]=[],hit=Number(r.hitLevel??0),evasion=Number(r.evasionLevel??0);
 if(r.resolution==='sure-hit')lines.push(evasion>0?`${hit}级必中压过${evasion}级绝闪，本次直接命中，不掷命中骰。`:`${hit}级必中生效，本次直接命中，不掷命中骰。`);
 else if(r.resolution==='absolute-evasion')lines.push(hit>0?`${evasion}级绝闪压过${hit}级必中，本次攻击被完全避开，不掷命中骰。`:`${evasion}级绝闪生效，本次攻击被完全避开，不掷命中骰。`);
 else if(r.resolution==='cancelled')lines.push(`${hit}级必中与${evasion}级绝闪互相抵消，本次正常进行命中检定。`);
 const attempts=Array.isArray(r.attempts)?r.attempts:[];
 for(const a of attempts){
  const reason=a.reason==='attack-reroll'?'失手重掷':a.reason==='evasion-reroll'?'规避重掷':attempts.length>1?'首次命中检定':'本次命中检定';
  const dice=arithmetic?`，d20 ${a.rolls.join('、')}，采用${a.die}，总值${a.total}`:'';
  lines.push(`${reason}：${modes[a.mode]??'掷骰'}${dice}，${a.hit?'命中':'未命中'}${a.natural20?'（自然20）':a.natural1?'（自然1）':''}。`);
 }
 const critical=r.critical;
 if(critical?.suppressed)lines.push(`${critical.natural?'自然20原本触发重击':critical.guaranteed?'会心保证原本触发重击':'原本触发重击'}，暴击抑制生效，最终为普通命中。`);
 else if(critical?.guaranteed)lines.push(`会心保证生效，本次命中最终判为${critical.final?'重击':'普通命中'}。`);
 if(Number(r.grazePercent)>0)lines.push(`未正面命中，失手补偿仅结算${r.grazePercent}%的即时伤害；本分支的其他命中效果未生效。`);
 for(const source of r.sources??[]){
  const label=kinds[String(source.effectId).split('.')[1]]??'命中干涉',name=source.name?`「${source.name}」的${label}`:label;
  const uses=Number.isFinite(source.remainingBefore)&&Number.isFinite(source.remainingAfter)?`，剩余次数${source.remainingBefore}→${source.remainingAfter}`:'';
  lines.push(`${name}已参与本次判定${uses}。`);
 }
 return lines;
}
