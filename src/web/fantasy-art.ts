import {originalPersonId} from '../shared/person-identity';
import {beastArtwork,materialArtwork} from '../runtime/generated-art';
import {illustratedArt} from './illustration-catalog';
import {unitPortrait,type PortraitArt} from '../runtime/visual-identity';
import {humanUnitFigure} from './character-figures';
import {recordedSubjectFigure} from './background-figures';
import {hasChangedHumanBody} from '../shared/generic-human-art';

export function unitBattleFigure(state:any,id:string,customFigure=''):string|PortraitArt|null {
 const single=unitFigure(state,id,customFigure);
 if(single)return single;
 const unit=state.战斗单位?.列表?.[id],beast=state.魂兽档案?.列表?.[unit?.扩展?.魂兽档案ID];
 if(unit?.扩展?.角色库ID&&String(unit.单位种类).includes('魂兽'))return unitPortrait(state,id);
 if(!beast)return null;
 const art=illustratedArt(beastArtwork(beast));return art.src.startsWith('/art/fantasy-v4/beasts-')?art:null;
}

/** Illustration coverage is explicit: prose and names never grant a different species or element. */
export function beastFigure(beast:any):string|null {
  const figures:Record<string,string>={'beast.deer.fire':'deer-fire','beast.serpent.poison':'serpent-poison','beast.wolf.neutral':'wolf-neutral'};
  const file=figures[beastArtwork(beast).key];
  return file?'/art/fantasy-v4/'+file+'.png':null;
}
export function materialFigure(material:any):string|null {
  const art=materialArtwork(material);
  return art.columns===1&&art.rows===1?art.src:null;
}
export function unitFigure(state:any,id:string,customFigure=''):string|null {
  const original=originalPersonId(state,id);if(original!==id)return unitFigure(state,original,customFigure);
  const person=state.人物?.列表?.[id];
  if(person?.扩展?.currentFigure)return person.扩展.currentFigure;
  const changed=hasChangedHumanBody(person);
  if(customFigure&&id===state.角色?.主控单位ID&&!changed)return customFigure;
  const subject=!changed&&recordedSubjectFigure(state,id);if(subject)return subject;
  if(!changed&&id==='captive-cat-liu'&&person?.gender==='女'&&person.age>=18)return '/art/opening-figures-v2/cat-free.webp';
  const unit=state.战斗单位?.列表?.[id];
  const profile=state.魂兽档案?.列表?.[unit?.扩展?.魂兽档案ID];
  if(profile)return beastFigure(profile);
  return humanUnitFigure(state,id);
}
