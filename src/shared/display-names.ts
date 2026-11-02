import './display-names-core.js';
declare global {var SoulDisplayNames:{stableHash:(input:unknown)=>number;presentGeneratedNames:(input:unknown)=>string;generatePersonalName:(options:{seed:unknown;gender?:string;usedNames?:Iterable<string>})=>string;personalNameCapacity:(gender?:string)=>number;PERSONAL_NAME_PARTS:Record<string,any>};}
export const displayNames=globalThis.SoulDisplayNames;
