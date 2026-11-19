import '../shared/background-figure-keys.js';
import {SHARED_ART} from '../runtime/shared-art';
import {DEFAULT_ADULT_WOMAN_FIGURE} from '../runtime/player-figure-options';

const allowed=new Set<string>(globalThis.SoulBackgroundFigureKeys);
export const BACKGROUND_SUBJECT_FIGURES=SHARED_ART.filter(art=>allowed.has(art.key));

export function backgroundSubjectFigure(background:any,person:{gender?:string;age?:number}):string|null {
 if(background?.id!=='sealed-titled')return null;
 const selected=BACKGROUND_SUBJECT_FIGURES.find(art=>art.key===background.subjectFigureKey);
 if(selected)return selected.src;
 if(background.actors?.captive?.source==='canon')return null;
 return ['女','female'].includes(person.gender??'')&&Number(person.age)>=18?DEFAULT_ADULT_WOMAN_FIGURE:null;
}

export function recordedSubjectFigure(state:any,id:string):string|null {
 const record=state?.世界?.opening?.background;
 if(!record||record.subjectId!==id)return null;
 const person=state?.人物?.列表?.[id];
 return person?backgroundSubjectFigure(record.config?.background,person):null;
}
