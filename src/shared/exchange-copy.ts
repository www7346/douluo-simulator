export const exchangeModeCopy:Record<string,{title:string;choice:string;description:string}>={
 condition:{title:'已有受限时增强',choice:'已有所选限制时增强',description:'所选限制已生效时获得强化。限制解除或不再满足要求时，持续强化结束。'},
 linked:{title:'限制与强化联动',choice:'发动时承担限制，与持续强化联动',description:'发动时施加所选限制。限制解除时，持续强化结束；持续强化全部结束时，对应限制也会解除。'},
 fixed:{title:'承担固定时长',choice:'发动时承担限制，持续到固定期限',description:'发动时施加所选限制。即使强化提前结束，限制仍会保留到约定时间。'}
};

export type ExchangeCopyOptions={mode?:string;durationMinutes?:number;state?:any;defaults?:Record<string,any>};
const names:Record<string,string>={'status.mute':'禁声（无法发声）','status.limb_bind':'肢体拘束','status.blind':'失明','status.slow':'减速','status.buff':'六维削弱','status.resistance_shift':'属性易伤','status.desire':'欲火','ability.lock':'封锁其他能力'};
const numeric=(value:any):value is number=>typeof value==='number'&&Number.isFinite(value);

/** Presentation of supplied values only; this module has no rule or server dependencies. */
export function exchangeBurdenText(b:any,{mode='condition',durationMinutes,state={},defaults={}}:ExchangeCopyOptions={}){
 const declared=b.params??{},p={...defaults,...declared},atLeast=mode==='condition'?'至少 ':'';
 let text=names[b.effectId]??'所选限制';
 if(b.effectId==='status.limb_bind'){
  const position=p.部位&&p.姿态?`${p.部位}在${p.姿态}受缚`:p.部位?`${p.部位}受缚`:'肢体受缚';
  const layers=numeric(p.层数)?`${atLeast}${p.层数} 层`:'按所选层数';
  const difficulty=numeric(p.挣脱难度加值)?`挣脱难度加值${atLeast?`至少 ${p.挣脱难度加值}`:` +${p.挣脱难度加值}`}`:'按所选挣脱难度';
  text=`${position} · ${layers} · ${difficulty}`;
 }
 if(b.effectId==='status.slow')text=numeric(p.数值)?`速度降低${atLeast?`至少 ${p.数值}`:` ${p.数值}`}`:'速度降低';
 if(b.effectId==='status.buff')text=numeric(p.数值)?`${p.属性??'所选属性'}降低${atLeast?`至少 ${Math.abs(p.数值)}`:` ${Math.abs(p.数值)}`}`:`${p.属性??'所选属性'}削弱`;
 if(b.effectId==='status.desire')text=numeric(p.强度)?`欲火 ${atLeast}${p.强度} 级`:'欲火';
 if(b.effectId==='status.resistance_shift')text=p.类型?`${p.类型}属性易伤（受到该属性伤害翻倍）`:'所选属性易伤';
 if(b.effectId==='ability.lock'){
  const snapshots=b.lockedAbilities??[],ids=b.lockedSkillIds??snapshots.map((s:any)=>s.id);
  text=`封锁能力：${ids.map((id:string)=>state.技能?.列表?.[id]?.name??snapshots.find((s:any)=>s.id===id)?.name??'所选能力').join('、')||'所选能力'}`;
 }
 if(mode==='condition')return text;
 let duration='按限制本身的期限',bounded=false;
 if(mode==='fixed'||declared.持续方式===undefined){if(numeric(durationMinutes)){duration=`${durationMinutes} 分钟`;bounded=true;}}
 else if(p.持续方式==='世界分钟'&&numeric(p.持续分钟)){duration=`${p.持续分钟} 分钟`;bounded=true;}
 else if(p.持续方式==='回合'&&numeric(p.持续回合)){duration=`${p.持续回合} 回合`;bounded=true;}
 else if(p.持续方式==='来源有效')duration='维持期间';
 return `${text}（${mode==='linked'&&bounded?'最多 ':''}${duration}）`;
}
