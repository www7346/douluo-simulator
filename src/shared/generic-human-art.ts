import './generic-human-art-core.js';
export interface GenericVisual {assetId:string;gender:string;band:string;bodyChoices?:Record<string,{assetId:string;gender:string;band:string}>}
export interface GenericHumanArt {id:string;src:string;label?:string;role:string;gender:string;band:string;variant?:boolean;head:readonly [number,number,number,number,number]}
export interface GenericVisualPerson {id?:string;gender?:string;age?:number;archetype?:string;occupation?:string;扩展?:{archetypeId?:string;genericVisual?:GenericVisual}}
const api=(globalThis as any).SoulGenericVisuals as {
 assets:readonly GenericHumanArt[];
 resolve:(person:GenericVisualPerson)=>GenericHumanArt|null;
 choose:(person:GenericVisualPerson)=>GenericHumanArt|null;
 assign:(state:any,person:any)=>GenericHumanArt|null;
 assignBody:(state:any,person:any,before:any)=>GenericHumanArt|null;
 changed:(person:any)=>boolean;
 portrait:(src:string)=>import('../runtime/visual-identity').PortraitArt|null;
};
export const GENERIC_HUMAN_ART=api.assets;
export const GENERIC_HUMAN_VARIANTS=api.assets.filter(a=>a.variant);
export const genericHumanArt=api.resolve;
export const chooseGenericHumanArt=api.choose;
export const assignGenericHumanArt=api.assign;
export const assignBodyGenericHumanArt=api.assignBody;
export const hasChangedHumanBody=api.changed;
export const genericFigurePortrait=api.portrait;
