import type {StoryTurn} from './story-turns';

export interface StoryRepetitionConflict {priorTurn:number;characters:number;source:'earlier-turn'|'current-turn'}
/** Compare only the selected, same-audience recent history. No fuzzy semantic judgment. */
export function storyRepetitionConflicts(turn:StoryTurn,prose:string,history:{number:number;prose:string;privatePersonId?:string}[],continuing=false):StoryRepetitionConflict[]{
 const text=prose.trim();if(text.length<256)return [];
 const prior=history.find(entry=>entry.number<turn.number&&entry.privatePersonId===turn.privatePersonId&&entry.prose.trim()===text);
 if(prior)return [{priorTurn:prior.number,characters:text.length,source:'earlier-turn'}];
 if(continuing&&turn.prose?.trim()===text)return [{priorTurn:turn.number,characters:text.length,source:'current-turn'}];
 return [];
}
