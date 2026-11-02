import './material-appearance-core.js';
declare global {var SoulMaterialAppearance:{part:(value:unknown,humanize:(value:string,fallback:string)=>string)=>string};}
export const materialAppearance=globalThis.SoulMaterialAppearance;
