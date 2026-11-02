import {descriptionProse} from '../shared/description-prose';
import authoredCopy from '../shared/player-copy.json';
import descriptionFragments from '../shared/player-description-fragments.json';
import {competitionDisplayText} from '../shared/competition-display';

/** Curated presentation of authored descriptions; saved recipes and effects stay untouched. */
export function playerCopy(text:string):string {
 const copy=text==='独院看管所'?'独院囚牢':Object.hasOwn(authoredCopy,text)?(authoredCopy as Record<string,string>)[text]:text;
 return competitionDisplayText(copy.replace(/的看管(?:及拘束器)?权益/gu,'').replaceAll('人物权益','奴隶').replaceAll('看管室','囚室'));
}

/** Catalog descriptions can combine several registered paragraphs. */
export function authoredDescription(text:unknown):string {
 if(typeof text!=='string')return '';
 let result=playerCopy(text);
 for(const [before,after] of Object.entries(descriptionFragments))result=result.replaceAll(before,after);
 return result;
}

/** Display text for skill, martial soul and item descriptions, including legacy saves. */
export function playerDescription(text:unknown):string {
 return descriptionProse(authoredDescription(text));
}

export function medicineCopy(disposition:any):string {
 if(!disposition?.harmful)return '';
 const route=disposition.medicine?.route;
 const use=route==='contact'?'接触':route==='inhaled'?'吸入':'吞服';
 return `有害药效通过${use}生效。${use==='吞服'?'强行喂服前需制服目标。':''}`;
}
