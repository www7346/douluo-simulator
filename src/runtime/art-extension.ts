import {SHARED_ART} from './shared-art';
import type {Artwork} from './art-catalog';

/** Original illustrated identities added after the random-content audit. */
const sheet=(name:string,keys:string[],columns=4,rows=4):Artwork[]=>keys.map((key,cell)=>({key,domain:key.startsWith('category.')?'beast':key.split('.')[0],label:key,src:`/art/fantasy-v4/${name}.png`,cell,columns,rows,inset:.006}));
export const ART_EXTENSION:readonly Artwork[]=[
 ...SHARED_ART,
 ...sheet('organic-craft-v1',['item.bone-throwingknife','item.wood-throwingknife','item.bone-needles','item.wood-needles','item.bone-dart','material.tendon'],3,2),
 ...sheet('materials-g',['material.crystal-fire','material.crystal-ice','material.ore','material.crystal-poison'],2,2),
 ...sheet('beasts-f',['beast.leopard.neutral','beast.badger.neutral','beast.civet.neutral','beast.feline.neutral'],2,2),
 ...sheet('beasts-e',['beast.bovine.neutral','beast.equine.neutral','category.aquatic','category.mollusk','category.humanoid','category.plant','category.aquatic-plant','category.carnivorous-plant'],4,2),
 ...sheet('supplies-e',['material.blood','material.nervous','material.organ','material.limb','material.packaged','material.herbs','material.metal','material.stone','item.pill-heal','item.pill-energy','item.pill-strength','item.pill-guard','item.pill-cleanse','item.pill','item.capsule','item.dart']),
 ...sheet('skills-e',['skill.light','skill.life','skill.poison-damage','skill.dark','skill.wood','skill.death','skill.space','skill.time','skill.psychic','skill.destruction','skill.dispel','skill.wall','skill.transformation','skill.copy','skill.domain','skill.transfer']),
 ...sheet('spirits-essence',['spirit.blood','spirit.nervous','spirit.organ','spirit.limb','spirit.skin','spirit.hair','spirit.symbiote','spirit.firearm','spirit.metal','spirit.stone','spirit.fluid','spirit.gas','spirit.sun','spirit.moon','spirit.star','spirit.energy']),
 ...sheet('spirits-objects',['spirit.spear','spirit.bow','spirit.grimoire','spirit.cauldron','spirit.seal','spirit.formation','spirit.instrument','spirit.mechanism','spirit.textile'],3,3),
 ...sheet('spirits-body',['spirit.humanoid','spirit.angel','spirit.grass','spirit.hammer'],2,2),
 ...sheet('hidden-e',['item.needles','item.throwingknife'],2,1),
 ...sheet('materials-f',['material.feathers','material.leaves','material.fruit','material.fungus'],2,2),
 {key:'skill.sleep',domain:'skill',label:'沉睡',src:'/art/fantasy-v4/skills-d.png',cell:14,columns:4,rows:4,inset:.006},
];
