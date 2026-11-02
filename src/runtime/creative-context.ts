/** Deliberate, bounded projections of saved identity. Never send entire saves or model settings. */
const text=(value:unknown,max=240)=>typeof value==='string'?value.trim().slice(0,max):'';
const strings=(value:unknown)=>Array.isArray(value)?value.filter(v=>typeof v==='string').slice(0,12):[];
export function materialWritingContext(snapshot:any[]=[]){
 return snapshot.slice(0,16).map(material=>{
  const profile=material.profile??material;
  return {name:text(material.name??profile.name??profile.displayName),description:text(material.description??profile.description),
   categories:strings(profile.categories),attributes:profile.attributeSpectrum,traits:strings(profile.traits),
   part:text(profile.appearancePart||profile.categories?.[0])};
 });
}
export function soulWritingContext(soul:any){
 const compiled=soul?.扩展?.结构化武魂??soul?.结构化武魂,definition=compiled?.definition;
 return {name:text(soul?.名称),concept:text(definition?.concept),form:text(definition?.form),
  attributes:compiled?.attributes?.map((item:any)=>item.name),description:text(soul?.描述??soul?.扩展?.描述)};
}
export function beastWritingContext(profile:any){
 return {name:text(profile?.扩展?.机缘叙事?.name??profile?.名称),description:text(profile?.扩展?.机缘叙事?.description??profile?.扩展?.描述),
  appearance:text(profile?.扩展?.机缘叙事?.appearance??profile?.扩展?.外形),categories:strings(profile?.类别标签),traits:strings(beastWritingTraits(profile?.种族特征))};
}
export function beastWritingTraits(traits:unknown){
 return Array.isArray(traits)?traits.filter(v=>typeof v==='string'&&!v.startsWith('bridge.')):[];
}

/** Only established names may anchor a new draft; local placeholders are not creative instructions. */
export function establishedName(source:unknown,name:unknown){return source==='llm-frozen-mechanics-narrative'?text(name,32):undefined;}
