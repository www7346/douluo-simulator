import './effect-display-data.js';
const projection=(globalThis as any).SoulEffectDisplay as {effectNames:Record<string,string>;equipmentAffixTemplates:Record<string,string>};

/** Static presentation projection. Calculation code is never imported by the client. */
export const effectDisplayNames:Record<string,string>=projection.effectNames;
export function equipmentAffixDescription(key:string,value:unknown):string{
 const template=(projection.equipmentAffixTemplates as Record<string,string>)[key]??`${key} +{value}`;
 return template.replaceAll('{value}',String(value));
}
