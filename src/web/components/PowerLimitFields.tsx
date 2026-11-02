import {ActionSection} from '../components';
export const RESTRAINT_MODE_LABELS:Record<string,string>={locked:'锁定',escort:'押送模式',released:'暂时解放',limited:'受限活动'};

export function PowerLimitSummary({power}:{power:any}){
 if(!power)return null;
 const sp=power.soulPower;
 return <div className="power-limit-summary"><p>魂力 {sp.current} / {sp.maximum} · 开放 {sp.percent}% · 当前可用 {sp.available} · 占用魂力 {sp.locked}</p><p>伤害输出上限 {power.damagePercent}% · {sp.percent===0?'魂力已被完全封印':power.maximumCastRank===0?'魂环魂技全部封禁':`最高施放强度：${power.maximumCastRank}环`}</p>{power.sources?.length>0&&<p>当前封印来源：{[...new Set(power.sources.map((s:any)=>s.name))].join('、')}</p>}</div>;
}

/** Options come from the rules; this form only submits one complete source configuration. */
export default function PowerLimitFields({limits,choices,supportsDamage,disabled,onChange}:{limits:any;choices:any;supportsDamage:boolean;disabled?:boolean;onChange:(limits:any)=>void}){
 const p=limits.permission??{};
 const changePermission=(key:string,value:any)=>{const next={...p};if(value===undefined)delete next[key];else next[key]=value;onChange({...limits,permission:next});};
 const groups=[['soulIds','许可武魂',choices.souls],['ringIds','许可魂环',choices.rings],['skillIds','许可技能',choices.skills],['allowedKinds','许可能力类别',choices.kinds]] as const;
 return <fieldset disabled={disabled} className="power-limit-fields"><legend>本器具的完整配置</legend>
  <label>快捷配置<select aria-label="精细限制快捷配置" value="" onChange={e=>{const preset=choices.presets.find((p:any)=>p.id===e.target.value);if(preset)onChange(structuredClone(preset.limits));}}><option value="">选择后仍可调整</option>{choices.presets.map((preset:any)=><option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label>
  <p>{choices.coverage} 本次只调节这件器具。</p>
  <div className="form-grid"><label>魂力开放比例（%）<input aria-label="魂力开放比例" type="number" min="0" max="100" step="1" value={limits.soulPowerPercent??100} onChange={e=>onChange({...limits,soulPowerPercent:Number(e.target.value)})}/></label>{supportsDamage&&<label>伤害输出比例（%）<input aria-label="伤害输出比例" type="number" min="0" max="100" step="1" value={limits.damagePercent??100} onChange={e=>onChange({...limits,damagePercent:Number(e.target.value)})}/></label>}</div>
  <ActionSection title={<>武魂、魂环与技能许可</>}><p>开启名单后，只允许勾选的武魂、魂环或技能；不勾选任何项表示全部禁止。</p>
   <label className="toggle-row"><input type="checkbox" checked={p.maxCastRank!==undefined} onChange={e=>changePermission('maxCastRank',e.target.checked?1:undefined)}/>限制最高施放强度</label>{p.maxCastRank!==undefined&&<label>最高施放强度<select aria-label="最高施放环阶" value={p.maxCastRank} onChange={e=>changePermission('maxCastRank',Number(e.target.value))}>{Array.from({length:10},(_,i)=><option key={i} value={i}>{i===0?'禁用魂环魂技':`${i}环`}</option>)}</select><small>高于此环的魂技和升环施放都不可用。</small></label>}
   {groups.map(([key,label,options])=><fieldset key={key}><legend><label><input type="checkbox" checked={p[key]!==undefined} onChange={e=>changePermission(key,e.target.checked?[]:undefined)}/>{label}</label></legend>{p[key]!==undefined&&<div className="choice-list">{options.map((option:any)=><label key={option.id}><input type="checkbox" checked={p[key].includes(option.id)} onChange={e=>changePermission(key,e.target.checked?[...p[key],option.id]:p[key].filter((id:string)=>id!==option.id))}/>{option.name}</label>)}{!options.length&&<p>当前没有可选项。</p>}</div>}</fieldset>)}
  </ActionSection><p>解除封魂后，已消耗的魂力仍需恢复；可用魂力还受其他封印和维持效果影响。</p>
 </fieldset>;
}
