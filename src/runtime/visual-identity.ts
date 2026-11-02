import {originalPersonId} from '../shared/person-identity';
import {beastArtwork} from './generated-art';
import displayLabels from '../shared/display-labels.json';
import {genericHumanArt,genericFigurePortrait,hasChangedHumanBody,type GenericVisual} from '../shared/generic-human-art';
const cataloguePeople:Record<string,{name:string}>=displayLabels.people;
const persistentPeople:Record<string,string>=displayLabels.persistentPeople;
import {personPresentation} from '../shared/person-presentation';
import canonicalFigureUpgrades from '../shared/canonical-figure-upgrades.json';
export interface PortraitArt {src:string;cell:number;columns:number;rows:number;inset?:number;sourceAspect?:number;crop?:{x:number;y:number;width:number;height:number}}
export interface PortraitPerson {id?:string;canonicalId?:string;name?:string;kind?:string;gender?:string;age?:number;archetype?:string;occupation?:string;soul?:string;扩展?:{角色库ID?:string;archetypeId?:string;genericVisual?:GenericVisual;currentFigure?:string;currentAvatar?:string;disguisePresentation?:{gender?:string;martialSoul?:string;identity?:string;kind?:string};bodyIdentity?:{gender:string;band?:string}}}
/** Resolve the existing catalogue/persistent identity, independently of display names. */
export function portraitCanonicalId(person:PortraitPerson):string|undefined {
 const explicit=person.canonicalId??person.扩展?.角色库ID;
 if(explicit&&cataloguePeople[explicit])return explicit;
 if(person.id&&cataloguePeople[person.id])return person.id;
 return person.id?persistentPeople[person.id]:undefined;
}
/** Copy only display data into summaries and frozen story moments. */
export function personVisualIdentity(person:PortraitPerson):NonNullable<PortraitPerson['扩展']>{
 const e=person.扩展??{},art=!portraitCanonicalId(person)||hasChangedHumanBody(person)?genericHumanArt(person):null;
 return {...(e.角色库ID?{角色库ID:e.角色库ID}:{}),...(e.archetypeId||person.archetype?{archetypeId:e.archetypeId??person.archetype}:{}),
  ...(art?{genericVisual:{assetId:art.id,gender:art.gender,band:art.band}}:{}),
  ...(e.currentFigure?{currentFigure:e.currentFigure}:{}),...(e.currentAvatar?{currentAvatar:e.currentAvatar}:{}),...(e.disguisePresentation?{disguisePresentation:structuredClone(e.disguisePresentation)}:{}),...(e.bodyIdentity?{bodyIdentity:structuredClone(e.bodyIdentity)}:{})};
}
export const beastPortrait=beastArtwork;

export function unitPortrait(state:any,id:string):PortraitArt|null {
 const original=originalPersonId(state,id);
 const unit=state?.战斗单位?.列表?.[id];
 const actualPerson=state?.人物?.列表?.[original]??(Object.values(state?.人物?.列表??{}) as any[]).find(p=>p.combatantId===id),person=personPresentation.viewCarrier(state,id,state?.角色?.主控单位ID)??(actualPerson?personPresentation.viewPerson(state,actualPerson,state?.角色?.主控单位ID):null);
 if(!unit)return person?characterPortrait({...person,id:person.id??id,kind:'resident'}):null;
 if(unit.扩展?.角色库ID&&String(unit.单位种类).includes('魂兽'))return characterPortrait({id:unit.扩展.角色库ID,name:unit.名称,kind:'soul-beast'});
 if(!String(unit.单位种类).includes('魂兽')){
  const current=person;
  if(current?.扩展?.currentAvatar||current?.扩展?.currentFigure)return characterPortrait(current);
  if(hasChangedHumanBody(current))return residentPortrait(current);
  if(unit.扩展?.角色库ID)return characterPortrait({...current,id:current?.id??id,canonicalId:unit.扩展.角色库ID,name:unit.名称});
  if(id===state?.角色?.主控单位ID)return null;
  return residentPortrait({...person,id:person?.id??id,kind:'resident'});
 }
 const profile=state?.魂兽档案?.列表?.[unit.扩展?.魂兽档案ID];
 return beastPortrait(profile??{name:unit.名称});
}

const PRIMARY_PEOPLE=['唐三','小舞','戴沐白','朱竹清','宁荣荣','奥斯卡','马红俊','玉小刚','唐昊','柳二龙','弗兰德','赵无极'];
const ENDGAME_PEOPLE=['千道流','比比东','千仞雪','唐晨','波赛西','杀戮之王'];
const ACADEMY_PEOPLE=['素云涛','丝丝','马修诺','秦明','李郁松','卢奇斌','邵鑫','孟蜀','朝天香','孟依然','绛珠','阿银'];
const ROYAL_PEOPLE=['玉天恒','独孤雁','叶泠泠','奥斯罗','御风','石墨','石磨','宁风致','尘心','古榕','唐月华','独孤博'];
const TOURNAMENT_PEOPLE=['火无双','火舞','火云','火雨','风笑天','水冰儿','水月儿','雪舞','玉天心','雷天','雷动','呼延力'];
const COURT_PEOPLE=['泰隆','黄远','京灵','梦神机','白宝山','智林','雪星亲王','雪崩','雪珂','雪清河','时年','叶知秋'];
const CLAN_PEOPLE=['唐啸','唐龙','唐虎','唐天','唐玉','唐甜甜','泰坦','泰诺','泰兴','牛皋','牛奔','白鹤'];
const TEMPLE_PEOPLE=['胡列娜','邪月','焱','千寻疾','金鳄斗罗','月关','鬼魅','蛇矛斗罗','刺豚斗罗','鬼豹斗罗','魔熊斗罗','灵鸢斗罗'];
const ELDER_PEOPLE=['拓跋希','萨拉斯','洛尔迪亚拉','呼延震','迈尔斯','戈龙','白沉香','杨无敌','杨无双','玉元震','玉罗冕','楼高'];
const WANDERER_PEOPLE=['霍雨浩','不乐','鹅考','天涯','戴维斯','朱竹云','戴天','思龙','思迪','思雨','思凯','恐怖骑士斯科特'];
const OCEAN_PEOPLE=['紫珍珠','海德尔','吉祥','海龙斗罗','海矛斗罗','海幻斗罗','海星斗罗','海鬼斗罗','欧亚','海女斗罗'];
const YOUNG_PEOPLE:Record<string,number>={'tang-san-awakening':0,'xiao-wu-notting':1,'wang-sheng':2,'xiao-chenyu':3,'ling-feng-notting':4,'liu-long-notting':5,'tang-san-shrek':6,'xiao-wu-shrek':7,'dai-mubai-shrek':8,'ning-rongrong-shrek':9,'oscar-shrek':10,'zhu-zhuqing-shrek':11};
/** Original visual interpretation shared by the dossier and combatant identity. */
export function residentPortrait(person:PortraitPerson):PortraitArt {
 const art=genericHumanArt(person);if(art)return genericFigurePortrait(art.src)!;
 // An unknown body stays unknown. This neutral illustration is only a fallback.
 return{src:'/art/characters-residents-v1.png',cell:12,columns:4,rows:4};
}
export function characterPortrait(person:PortraitPerson):PortraitArt|null {
 const override=person.扩展?.currentAvatar||person.扩展?.currentFigure;if(override)return {src:override,cell:0,columns:1,rows:1};
 if(person.扩展?.disguisePresentation)return null;
 if(hasChangedHumanBody(person))return residentPortrait(person);
 const canonicalId=portraitCanonicalId(person),name=String((canonicalId?cataloguePeople[canonicalId]?.name:null)??person.name??'');
 const upgraded=canonicalFigureUpgrades[canonicalId as keyof typeof canonicalFigureUpgrades];
 if(upgraded){const [w,h,x,y,side]=upgraded.head;return {src:upgraded.src,cell:0,columns:1,rows:1,sourceAspect:w/h,crop:{x:x/w,y:y/h,width:side/w,height:side/h}};}
 if(canonicalId==='li-chijing')return {src:'/art/xuanjian/li-chijing.webp',cell:0,columns:1,rows:1,sourceAspect:1024/1536,crop:{x:350/1024,y:20/1536,width:320/1024,height:320/1536}};
 if(canonicalId==='gu-yuena-adult')return {src:'/art/character-figures-v2/gu-yuena-adult.webp',cell:0,columns:1,rows:1,sourceAspect:1024/1536,crop:{x:310/1024,y:60/1536,width:270/1024,height:270/1536}};
 if(person.id==='captive-cat-liu'&&person.gender==='女'&&Number(person.age)>=18)return {src:'/art/opening-figures-v2/cat-free.webp',cell:0,columns:1,rows:1,sourceAspect:966/1628,crop:{x:320/966,y:0,width:350/966,height:350/1628}};
 if(person.kind==='soul-beast'){const fixed=[['泰坦巨猿',0],['天青牛蟒',1],['暗魔邪神虎',2],['魔魂大白鲨',3],['邪魔虎鲸',4],['深海魔鲸',5],['蓝银王',6],['蓝银皇',7]] as const;const entry=fixed.find(([label])=>name.includes(label));return entry?{src:'/art/soul-beasts-legendary-v1.png',cell:entry[1],columns:4,rows:3,inset:.01}:beastPortrait({});}
 if(!canonicalId&&(person.kind==='resident'||person.id))return residentPortrait(person);
 const young=YOUNG_PEOPLE[canonicalId??person.id??''];
 if(young!==undefined)return{src:'/art/characters-young-v1.png',cell:young,columns:4,rows:3,inset:.02};
 const endgame=ENDGAME_PEOPLE.findIndex(label=>name.startsWith(label));
 if(endgame>=0)return{src:'/art/characters-endgame-v1.png',cell:endgame,columns:3,rows:2,inset:.02};
 for(const [atlas,names] of [['academy',ACADEMY_PEOPLE],['royal',ROYAL_PEOPLE],['tournament',TOURNAMENT_PEOPLE],['court',COURT_PEOPLE],['clans',CLAN_PEOPLE],['temple',TEMPLE_PEOPLE],['elders',ELDER_PEOPLE],['wanderers',WANDERER_PEOPLE],['ocean',OCEAN_PEOPLE]] as const){const index=names.findIndex(label=>name.startsWith(label));if(index>=0)return{src:`/art/characters-${atlas}-v1.png`,cell:index,columns:4,rows:3,inset:.02};}
 const primary=PRIMARY_PEOPLE.findIndex(label=>name.startsWith(label));
 return primary>=0?{src:'/art/characters-primary-v1.png',cell:primary,columns:4,rows:3,inset:.02}:null;
}
