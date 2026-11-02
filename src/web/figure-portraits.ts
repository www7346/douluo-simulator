import type {PortraitArt} from '../runtime/visual-identity';
import {ADULT_WOMAN_FIGURES} from '../runtime/player-figure-options';
import {genericFigurePortrait} from '../shared/generic-human-art';
import canonicalFigureUpgrades from '../shared/canonical-figure-upgrades.json';

// Reviewed head-and-shoulder windows in original image pixels: width, height, x, y, side.
// Weapons, ponytails and cloaks do not determine the horizontal centre of a face.
export const FIGURE_HEADS:Record<string,readonly [number,number,number,number,number]>={
 'generic-guard-female-adult':[631,1495,180,100,300],
 'generic-guard-female-mature':[679,1507,128,0,332],
 'generic-guard-male-adult':[607,1508,130,100,294],
 'generic-guard-male-mature':[727,1495,175,12,336],
 'generic-hunter-female-adult':[557,1522,80,10,330],
 'generic-hunter-female-mature':[573,1517,81,5,336],
 'generic-hunter-male-adult':[602,1506,115,55,302],
 'generic-hunter-male-mature':[621,1501,106,5,326],
 'generic-merchant-female-adult':[664,1500,153,7,316],
 'generic-merchant-female-mature':[602,1493,134,4,334],
 'generic-merchant-male-adult':[624,1498,157,3,332],
 'generic-merchant-male-mature':[591,1485,170,0,330],
 'generic-traveler-female-adult':[1024,1536,300,0,400],
 'generic-traveler-female-child':[456,1484,30,0,420],
 'generic-traveler-female-mature':[601,1506,126,0,324],
 'generic-traveler-female-teen':[1024,1536,315,10,400],
 'generic-traveler-male-adult':[669,1509,166,0,286],
 'generic-traveler-male-child':[478,1454,10,0,420],
 'generic-traveler-male-mature':[575,1511,142,0,316],
 'generic-traveler-male-teen':[1024,1536,340,0,380],
};

// Named endgame figures use the same reviewed source in lists, order bars and dossiers.
export const ENDGAME_FIGURE_HEADS:Record<string,readonly [number,number,number,number,number]>={
 ...Object.fromEntries(Object.values(canonicalFigureUpgrades).map(entry=>[entry.src,entry.head])),
 '/art/disguise-figures-v1/xue-qinghe.webp':[956,1530,365,25,300],
 '/art/disguise-figures-v1/qian-renxue.webp':[830,1514,265,15,330],
 '/art/xuanjian/li-chijing.webp':[1024,1536,350,20,320],
 '/art/character-figures-v2/gu-yuena-adult.webp':[1024,1536,310,60,270],
 ...Object.fromEntries(ADULT_WOMAN_FIGURES.map(option=>[option.src,[1024,1536,300,0,400] as const])),
 '/art/player-women-v4/10.webp':[1024,1536,300,0,400],
 '/art/player-women-v4/10-proportions-v2.webp':[1024,1536,365,0,340],
 '/art/opening-figures-v2/cat-free.webp':[966,1628,320,0,350],
 '/art/opening-figures-v2/cat-bound.webp':[1024,1536,340,0,360],
 '/art/player-travelers-v3/female-teen.webp':[1024,1536,315,10,400],
 '/art/player-travelers-v3/female-teen-proportions-v2.webp':[1024,1536,340,10,350],
 '/art/player-travelers-v3/male-teen.webp':[1024,1536,340,0,380],
 '/art/character-figures-v2/qian-daoliu.png':[1026,1525,400,80,330],
 '/art/character-figures-v2/tang-chen.png':[1029,1514,370,0,320],
 '/art/character-figures-v2/bo-saixi.png':[892,1484,280,75,350],
 '/art/adult-figures-v1/bi-bi-dong.png':[936,1465,280,75,360],
 '/art/adult-figures-v1/qian-renxue.png':[830,1514,265,15,330],
};

export function figurePortrait(src:string):PortraitArt|null {
 const generic=genericFigurePortrait(src);if(generic)return generic;
 const head=ENDGAME_FIGURE_HEADS[src]??(src.startsWith('/art/character-figures-v2/')?FIGURE_HEADS[src.slice('/art/character-figures-v2/'.length).replace(/\.png$/,'')]:null);
 if(!head)return null;
 const [width,height,x,y,side]=head;
 return {src,cell:0,columns:1,rows:1,sourceAspect:width/height,crop:{x:x/width,y:y/height,width:side/width,height:side/height}};
}

/** Existing editor controls, initialized to the same reviewed crop as the game. */
export function figureAvatarControls(src:string) {
 const art=figurePortrait(src),c=art?.crop;if(!art||!c)return {zoom:1,x:50,y:0};
 const aspect=art.sourceAspect!,side=c.height;
 return {zoom:Math.min(aspect,1)/side,x:aspect>side?c.x*aspect/(aspect-side)*100:50,y:side<1?c.y/(1-side)*100:0};
}
