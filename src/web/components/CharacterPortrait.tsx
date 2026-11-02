import {BoundFigure,CollarMark,collarAppearance} from './BoundPortrait';
import {assetUrl} from '../asset-delivery';
import {characterPortrait} from '../../runtime/visual-identity';
import type {PortraitPerson} from '../../runtime/visual-identity';
import {PortraitImage} from './PortraitArt';
import RelicIllustration from './RelicIllustration';
import {characterFigure} from '../character-figures';
import {unitFigure} from '../fantasy-art';
import {figurePortrait} from '../figure-portraits';
import {originalPersonId} from '../../shared/person-identity';
import {personPresentation} from '../../shared/person-presentation';

export default function CharacterPortrait({person,large=false,state,figureUrl='',frozen=false,showBinding=true}:{showBinding?:boolean;person:PortraitPerson;large?:boolean;state?:any;figureUrl?:string;frozen?:boolean}) {
 const id=person.id&&!frozen?originalPersonId(state,person.id):person.id;
 const current=!frozen&&id&&(personPresentation.viewCarrier(state,person.id!,state?.角色?.主控单位ID)??state?.人物?.列表?.[id]??(Object.values(state?.人物?.列表??{}) as any[]).find(p=>p.combatantId===id));
 if(current)person={...person,...current,id:current.id??id,archetype:current.扩展?.archetypeId??current.archetype??person.archetype,扩展:{...person.扩展,...current.扩展}};
 if(current)person=personPresentation.viewPerson(state,person,state?.角色?.主控单位ID);
 const record=state?.世界?.opening?.background,subject=person.id&&record?.config?.background?.id==='sealed-titled'&&record.subjectId===person.id;
 const figure=(!large&&person.扩展?.currentAvatar)||person.扩展?.currentFigure||(!frozen&&(subject||person.id===state?.角色?.主控单位ID)?unitFigure(state,person.id!,figureUrl):characterFigure(person));
 const avatar=figure&&(figurePortrait(figure)??(!person.扩展?.currentAvatar&&!person.扩展?.currentFigure?characterPortrait(person):null));
 const appearance=showBinding&&!frozen&&person.id&&collarAppearance(state,person.id);
 if(figure&&large&&appearance)return <BoundFigure figure={figure} name={person.name??'人物'} appearance={appearance} className="npc-portrait-art npc-portrait-art--figure"/>;
 if(figure&&!large&&appearance)return <span className="bound-avatar">{avatar?<PortraitImage art={avatar} name={person.name??'人物'} className="npc-portrait-art" fit="slice"/>:<img className="npc-portrait-art" src={assetUrl(figure)} alt={person.name}/>}<CollarMark appearance={appearance}/></span>;
 if(figure&&!large)return avatar?<PortraitImage art={avatar} name={person.name??'人物'} className="npc-portrait-art" fit="slice"/>:<img className="npc-portrait-art" src={assetUrl(figure)} alt={person.name}/>;
 if(figure)return <img className="npc-portrait-art npc-portrait-art--figure" src={assetUrl(figure)} alt={person.name}/>;
 const art=characterPortrait({...person,kind:person.kind??(person.id?'resident':undefined)});
 return art?<PortraitImage art={art} name={person.name??'人物'} className="npc-portrait-art" fit={large?'meet':'slice'}/>:<RelicIllustration large={large} kind={person.kind==='soul-beast'?'材料':'魂导器'} name={person.soul??''}/>;
}
