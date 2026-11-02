import {artwork,type Artwork} from '../runtime/art-catalog';
import type {PortraitArt} from '../runtime/visual-identity';
const itemForms=['sword','dagger','staff','shield','breastplate','robe','gloves','boots','bracer','crown','necklace','ring','pendant','needles','throwingknife','pill'];
const utility=['potion','gourd','bandage','food','rope','blueprint','bone','device','helm','bracelet','throwingknife','needles'];
// These indices describe the painted sheet, not the order of the old icon catalog.
const materialCells:Record<string,number>={antler:0,bone:1,hide:2,scales:3,fang:4,claw:5,wood:6,vine:7,flower:8,crystal:10,shell:11,gland:12};
const beasts=['wolf','fox','tiger','lion','bear','rabbit','deer','boar','ape','dragon','serpent','lizard','turtle','fish','shark','whale','eagle','owl','bat','beetle','spider','scorpion','centipede','worm','octopus','ray','crab','snail','tree','vine','flower','fungus'];
const skills=[
 ['fire-projectile','fire-cone','fire-burst','fire-slash','ice-projectile','ice-cone','ice-burst','ice-slash','lightning','water','wind','earth','metal','soul-damage','arrow','slash'],
 ['shield','fire-shield','ice-shield','light-shield','resistance','fire-resistance','ice-resistance','lightning-resistance','immunity','fire-immunity','poison-immunity','status-guard','absorption','reflection','reduction','cleanse'],
 ['heal','regeneration','soul-restore','revive','fire-amplify','ice-amplify','lightning-amplify','speed','movement','flight','teleport','accuracy','attribute-buff','multiattack','summon'],
 ['bind','vine-bind','ice-bind','web-bind','stun','knockback','pull','silence','charm','fear','blind','bleed','burn','poison','sleep','soul-damage']
];
const aspects:Record<string,number>={'spirit-fox':1086/1448,'serpent-poison':1.5,'wolf-neutral':1.5,'antler-fire':1230/1278,'antler-neutral':1.5};
function calibrated<T extends PortraitArt>(source:T):T {
 const name=source.src.split('/').pop()?.replace('.png','')??'';
 const rows:Record<string,number[]>={'spirits-objects':[0,.315,.616,1],'utility-items':[0,.25,.49,.74,1],'supplies-e':[0,.25,.505,.735,1],'skills-a':[0,.24,.475,.718,1],'skills-b':[0,.242,.485,.722,1],'skills-c':[0,.249,.5,.738,1]};
 const boundaries=rows[name];
 const aspect=aspects[name]??source.columns/source.rows;
 if(!boundaries)return {...source,sourceAspect:aspect};
 const row=Math.floor(source.cell/source.columns),pad=.003;
 if(name==='skills-c'&&source.cell>=12){
  const cols=[0,.249,.621,1],i=source.cell-12;
  return {...source,sourceAspect:1,crop:{x:cols[i]+pad,y:.738+pad,width:cols[i+1]-cols[i]-pad*2,height:1-.738-pad*2}};
 }
 return {...source,sourceAspect:aspect,crop:{x:(source.cell%source.columns)/source.columns+pad,y:boundaries[row]+pad,width:1/source.columns-pad*2,height:boundaries[row+1]-boundaries[row]-pad*2}};
}
export const atlas=(name:string,cell:number,columns=4,rows=4,inset=.015):PortraitArt=>calibrated({src:'/art/fantasy-v4/'+name+'.png',cell,columns,rows,inset});
/** Presentation only. Keys come from mechanical identity, never generated prose. */
export function illustratedArt<T extends PortraitArt>(source:T):T {
 if(source.src.startsWith('/art/fantasy-v4/'))return calibrated(source);
 if(source.src==='/art/characters-residents-v1.png')return {...source,src:'/art/fantasy-v4/residents.png'};
 if(source.src==='/art/characters-young-v1.png')return {...source,src:'/art/fantasy-v4/people-young.png'};
 const art=source as T&Partial<Artwork>;if(!art.key)return source;const key=art.key;
 const resolved=artwork(key);if(resolved.src.startsWith('/art/fantasy-v4/'))return {...source,...calibrated(resolved)};
 if(key.startsWith('beast.')){
  const single:Record<string,string>={'beast.deer.fire':'deer-fire','beast.serpent.poison':'serpent-poison','beast.wolf.neutral':'wolf-neutral','beast.fox.fire':'spirit-fox'};
  if(single[key])return {...source,...atlas(single[key],0,1,1,0)};
  const i=beasts.indexOf(key.split('.')[1]);if(i>=0)return {...source,...atlas('beasts-'+['a','b','c','d'][Math.floor(i/8)],i%8,4,2,0)};
 }
 if(key.startsWith('item.')){
  const form=key.slice(5).replace(/^(fire|ice|lightning|life|light|dark|wood|soul)-/,'');
  const i=itemForms.indexOf(form);if(i>=0)return {...source,...atlas('equipment-'+['a','b','c','d'][Math.floor(i/4)],i%4,2,2,.025)};
  const u=utility.indexOf(form);if(u>=0)return {...source,...atlas('utility-items',u)};
 }
 if(key.startsWith('material.')){const i=materialCells[key.slice(9)];if(i!==undefined)return {...source,...atlas('materials',i)};}
 if(key.startsWith('skill.')){
  const raw=key.slice(6),skill=raw==='enhance'?'attribute-buff':raw==='slow'?'web-bind':raw;
  if(skill==='cone'||skill==='burst')return {...source,...atlas('utility-items',skill==='cone'?12:13)};
  for(let s=0;s<skills.length;s++){const i=skills[s].indexOf(skill);if(i>=0)return {...source,...atlas('skills-'+['a','b','c','d'][s],i)};}
 }
 return source;
}
