import {personPresentation} from '../shared/person-presentation';
import {CHARACTER_FIGURES,GENERIC_FIGURES} from './character-figure-catalog';
import type {PortraitPerson} from '../runtime/visual-identity';
import {portraitCanonicalId} from '../runtime/visual-identity';
import {ADULT_WOMAN_FIGURES} from '../runtime/player-figure-options';
import {genericHumanArt,GENERIC_HUMAN_ART,hasChangedHumanBody} from '../shared/generic-human-art';
import {backgroundSubjectFigure} from './background-figures';

export function characterFigure(person:PortraitPerson):string|null {
 if(person.kind==='soul-beast')return null;
 if(person.扩展?.currentFigure)return person.扩展.currentFigure;
 if(person.扩展?.disguisePresentation)return null;
 const known=CHARACTER_FIGURES[(portraitCanonicalId(person)??person.id) as keyof typeof CHARACTER_FIGURES];
 if(known&&!hasChangedHumanBody(person))return known.src;
 if(!hasChangedHumanBody(person)&&(portraitCanonicalId(person)??person.id)==='captive-cat-liu'&&['女','female'].includes(person.gender??'')&&Number(person.age)>=18)return '/art/opening-figures-v2/cat-free.webp';
 return genericHumanArt(person)?.src??null;
}

export function creationFigure(config:{gender?:string;age?:number;background?:{id?:string;perspective?:string;subjectFigureKey?:string;canonicalPlayer?:{characterId:string};actors?:Record<string,{source?:string;characterId?:string}>}}):string|null{
 if(config.background?.id==='sealed-titled'&&config.background.perspective==='captive'&&config.background.subjectFigureKey){const selected=backgroundSubjectFigure(config.background,config);if(selected)return selected;}
 if(config.background?.canonicalPlayer)return characterFigure({id:config.background.canonicalPlayer.characterId,gender:config.gender,age:config.age});
 const actor=config.background?.actors?.[config.background.perspective??''];
 if(actor?.source==='canon'&&actor.characterId)return characterFigure({id:actor.characterId,gender:config.gender,age:config.age});
 if(config.background?.id==='sealed-titled'&&config.background.perspective==='captive'){
  const subject=backgroundSubjectFigure(config.background,config);if(subject)return subject;
 }
 if(config.background?.id==='prince-cat'&&config.background.perspective==='buyer')return characterFigure({id:'xue-beng'});
 if(config.background?.id==='prince-cat'&&config.background.perspective==='captive'&&config.gender==='女'&&Number(config.age)>=18)return '/art/opening-figures-v2/cat-free.webp';
 return characterFigure({gender:config.gender,age:config.age});
}

/** Shared by the bracket, dossier and battle. The key selects illustration only. */
export function temporaryHumanFigure(recordId:string,level:number,person:PortraitPerson={}):string|null {
 return characterFigure({...person,id:recordId});
}

/** Resolve identity from explicit metadata; a display name or imported avatar never changes the body. */
export function humanUnitFigure(state:any,id:string):string|null {
 const unit=state.战斗单位?.列表?.[id];
 if(String(unit?.单位种类??'').includes('魂兽'))return null;
 const actual=state.人物?.列表?.[id]??(Object.values(state.人物?.列表??{}) as any[]).find(p=>p.combatantId===id),person=personPresentation.viewCarrier(state,id,state.角色?.主控单位ID)??actual;
 if(!unit&&!person)return null;
 const canonicalId=unit?.扩展?.角色库ID??person?.扩展?.角色库ID;
 // Temporary arena records already have immutable IDs, even when no person record
 // was created. Use those records for stable art, never a name or a combat roll.
 const temporary=[...(state.杀戮场?.当前?.match?.participants??[]),...(state.比赛?.当前?.participants??[])].find((entry:any)=>entry.kind==='temporary'&&(entry.temporaryRecord?.id===canonicalId||entry.unitId===id||entry.temporaryRecord?.id===id));
 const changed=hasChangedHumanBody(person);
 const metadata={id:id===state.角色?.主控单位ID&&!changed?undefined:person?.id??id,canonicalId,gender:person?.gender??person?.性别,age:person?.age??person?.年龄,archetype:person?.扩展?.archetypeId,occupation:person?.occupation,扩展:person?.扩展};
 if(temporary){const record=temporary.temporaryRecord;return temporaryHumanFigure(record.id,temporary.level,{...record.worldPersona,...metadata,gender:metadata.gender??record.worldPersona?.gender,age:metadata.age??record.worldPersona?.age,扩展:{...record.visualIdentity,...metadata.扩展}});}
 return characterFigure(metadata);
}

const figureBands=new Map<string,string>([...Object.values(CHARACTER_FIGURES),...Object.values(GENERIC_FIGURES),...GENERIC_HUMAN_ART,...ADULT_WOMAN_FIGURES.map(option=>({...option,band:'adult'}))].map(entry=>[entry.src,entry.band]));
export function humanFigureHeight(src:unknown):number {
 const band=typeof src==='string'?figureBands.get(src):undefined;
 return band==='child'?235:band==='teen'?305:340;
}
