export const ADULT_WOMAN_FIGURES=[
 {number:1,name:'清丽古典'},{number:2,name:'冷艳仙姿'},{number:5,name:'温柔娴雅'},
 {number:6,name:'灵动短发'},{number:9,name:'清爽旅者'},{number:10,name:'精致二次元'},
].map(option=>({...option,src:option.number===10?'/art/player-women-v4/10-proportions-v2.webp':'/art/player-women-v4/'+String(option.number).padStart(2,'0')+'.webp'}));
export const DEFAULT_ADULT_WOMAN_FIGURE=ADULT_WOMAN_FIGURES.find(option=>option.number===10)!.src;

/** Stable illustration variety uses identity only; it never consumes a game roll. */
export function adultWomanFigure(personId?:string){
 if(!personId)return DEFAULT_ADULT_WOMAN_FIGURE;
 let hash=2166136261;for(const letter of personId)hash=Math.imul(hash^letter.charCodeAt(0)!,16777619);
 return ADULT_WOMAN_FIGURES[(hash>>>0)%ADULT_WOMAN_FIGURES.length].src;
}
