export function inventoryDetailReading(details:any[],comparison?:any):string{
 const rows=details.map(d=>`${d.name}：${[d.description,d.passiveMeaning,...(d.passiveStats??[]),...d.skills.map((s:any)=>`${s.name}：${s.meaning}`)].filter(Boolean).join('；')||'没有额外效果'}`);
 if(comparison)for(const c of comparison.candidates){
  if(!c.available){rows.push(`${c.name}：暂不能装备，${c.reason}`);continue;}
  const changes=[...Object.entries(c.after.derived).filter(([key,v])=>typeof v==='number'&&/防御|命中|先攻|移动|减伤|魂技DC|抗打断/.test(key)&&v!==c.before.derived[key]).map(([key,v])=>`${key}${c.before.derived[key]}→${v}`),...Object.entries(c.after.resources).filter(([key,v]:[string,any])=>v.最大!==c.before.resources[key]?.最大).map(([key,v]:[string,any])=>`${key}上限${c.before.resources[key]?.最大}→${v.最大}`)];
  const equipmentChanges=Object.entries(c.after.equipment??{}).filter(([key,v])=>v!==c.before.equipment?.[key]&&!changes.some(line=>line.startsWith(key))).map(([key,v])=>`${key}${c.before.equipment?.[key]??0}→${v}`);
  rows.push(`${c.name}（${c.slot}${c.replacingItemId?'，需先卸下当前装备':''}）：${[...changes,...equipmentChanges].join('；')||'数值不变'}`);
 }
 if(comparison?.requiresChoice)rows.push('这些装备各有所长，请选择更看重的防护。');
 return rows.join('\n');
}
