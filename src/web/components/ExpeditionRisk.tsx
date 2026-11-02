import {StatTile} from '../components';

type Range={minimum:number;maximum:number};
type Reference={years:Range;levels:Range;referenceOnly:boolean};
type Readiness={id:string;name:string;hp:{current:number;maximum:number};sp:{current:number;maximum:number};skills:{name:string;cost:number;lock:number;available:boolean;reason:string}[]};
type Risk={difficultyId:string;routeLayers:number;player:{level:number;recommendedLevel:Range};roomReferences:{normal:Reference;elite?:Reference;boss:Reference};endurance?:{exploration:string;bossChallenge:string;guaranteedCamp:boolean;noCamp:boolean;readiness?:Readiness[];team:{name:string;level:number;hp:{current:number;maximum:number}|null;sp:{current:number;maximum:number}|null;startsRested?:boolean}[]}};
const rangeText=(range:Range)=>range.minimum===range.maximum?String(range.minimum):`${range.minimum}–${range.maximum}`;

function TeamReadiness({members=[]}:{members?:Readiness[]}) {
  if(!members.length)return null;
  return <details className="expedition-risk-team"><summary>查看当前队员与关键魂技</summary><p>查看队员的治疗、回魂、控制与武魂真身。每场使用次数在下一战重置，施放时还需满足距离与目标条件。</p>{members.map(member=><section key={member.id}><strong>{member.name} · 生命 {member.hp.current}/{member.hp.maximum} · 魂力 {member.sp.current}/{member.sp.maximum}</strong>{member.skills.length?<ul>{member.skills.map((skill,index)=><li key={index}>{skill.name}：消耗 {skill.cost} 魂力{skill.lock>0?`，另锁定 ${skill.lock}`:''}；{skill.available?'当前可用':skill.reason}</li>)}</ul>:<p>当前没有这几类主动魂技，请留意恢复道具与同行搭配。</p>}</section>)}</details>;
}

export function ExpeditionRiskSummary({risk}:{risk:Risk}) {
  return <>

    <div className="stat-row"><StatTile label="建议等级" value={risk.difficultyId==='outer'?'10级初次猎魂':rangeText(risk.player.recommendedLevel)}/><StatTile label="路线层数" value={risk.routeLayers}/><StatTile label="你当前的等级" value={risk.player.level}/></div>
    <div className="expedition-risk-references">{(['normal','elite','boss'] as const).map(kind=>{const reference=risk.roomReferences[kind];if(!reference)return null;return <section key={kind} className={kind==='boss'?'is-boss':''}><h3>{kind==='boss'?'最终首领':kind==='elite'?'精英魂兽':'沿途魂兽'}</h3><strong>{rangeText(reference.years)} 年</strong><p>年限对应成长等级：{rangeText(reference.levels)} 级</p></section>;})}</div>
    {risk.endurance&&<section className="expedition-risk-team"><h3>同行与续航</h3><p>{risk.endurance.exploration}；{risk.endurance.bossChallenge}。</p><ul>{risk.endurance.team.map((member,index)=><li key={index}>{member.name} · {member.level}级 · {member.hp&&member.sp?`生命 ${member.hp.current}/${member.hp.maximum}，魂力 ${member.sp.current}/${member.sp.maximum}`:member.startsRested?'出发时状态完好':'请检查状态'}</li>)}</ul><p>{risk.endurance.noCamp?'途中没有火堆，请备足恢复补给。':risk.endurance.guaranteedCamp?'首领前有可达的火堆分支，可恢复存活队员三成生命与魂力；请留意路线。':'沿途有机会遇到火堆，建议为连续战斗留好补给。'}</p></section>}
    <TeamReadiness members={risk.endurance?.readiness}/>

  </>;
}

export function ExpeditionBossWarning({roster,playerLevel,readiness}:{roster:{unitId:string;years:number;effectiveLevel:number}[];playerLevel:number;readiness?:Readiness[]}) {
  return <aside className="expedition-risk-warning dungeon-next-risk" role="note" aria-label="前方首领风险">
    <strong>前方是首领房 · {roster.length}只魂兽 · 你当前{playerLevel}级</strong>
    <p>{roster.map(beast=>`${beast.years}年（成长${beast.effectiveLevel}级）`).join('、')}。进入即将开战；请检查状态与补给，也可安全撤离。</p>
    <TeamReadiness members={readiness}/>
  </aside>;
}
