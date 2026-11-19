export const cooperationBases:Record<string,string>={voluntary:'自愿合作',coerced:'迫于处境暂时配合',controlled:'精神／灵魂控制参与','resident-body':'画境真身出战'};

export function restraintChoiceLabel(device:any,devices:any[]){
  const sources:Record<string,string>={'research-prototype':'研发原型','blueprint-craft':'按图纸制成'};
  const source=sources[device.sourceType]??'随身器具';
  const same=devices.filter(d=>d.name===device.name&&d.sourceType===device.sourceType);
  return `${device.name} · ${source}${same.length>1?` · 同款第${same.findIndex(d=>(d.id??d.itemId)===(device.id??device.itemId))+1}件`:''}`;
}
