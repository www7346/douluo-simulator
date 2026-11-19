import {ART_CATALOG,artwork,type Artwork} from '../runtime/art-catalog';
import {ART_EXTENSION} from '../runtime/art-extension';
import {illustratedArt} from './illustration-catalog';
import type {PortraitArt} from '../runtime/visual-identity';

const names:Record<string,string>={
  'spirit.blood':'血液','spirit.nervous':'神经','spirit.organ':'脏器','spirit.limb':'肢体','spirit.skin':'皮肤','spirit.hair':'发丝','spirit.symbiote':'共生体','spirit.firearm':'火器','spirit.metal':'金属','spirit.stone':'磐石','spirit.fluid':'水流','spirit.gas':'云气','spirit.sun':'太阳','spirit.moon':'月亮','spirit.star':'星辰','spirit.energy':'能量',
  'spirit.spear':'长枪','spirit.bow':'弓','spirit.grimoire':'法典','spirit.cauldron':'鼎炉','spirit.seal':'印玺','spirit.formation':'阵法','spirit.instrument':'乐器','spirit.mechanism':'机关','spirit.textile':'织物','spirit.humanoid':'人形武魂','spirit.angel':'天使','spirit.grass':'蓝银草','spirit.hammer':'重锤',
  'beast.leopard.neutral':'豹','beast.badger.neutral':'獾','beast.civet.neutral':'灵猫','beast.feline.neutral':'猫','beast.bovine.neutral':'牛','beast.equine.neutral':'马',
  'category.aquatic':'水生生灵','category.mollusk':'软体生灵','category.humanoid':'人形生灵','category.plant':'植物','category.aquatic-plant':'水生植物','category.carnivorous-plant':'食肉植物',
  'skill.light':'光明','skill.life':'生命','skill.poison-damage':'毒素','skill.dark':'黑暗','skill.wood':'木','skill.death':'死亡','skill.space':'空间','skill.time':'时间','skill.psychic':'精神','skill.destruction':'毁灭','skill.dispel':'驱散','skill.wall':'屏障','skill.transformation':'变形','skill.copy':'复制','skill.domain':'领域','skill.transfer':'转移',
  'material.crystal-fire':'火晶石','material.crystal-ice':'冰晶石','material.ore':'矿石','material.crystal-poison':'毒晶石','material.blood':'血液','material.nervous':'神经组织','material.organ':'脏器','material.limb':'肢体','material.packaged':'材料包','material.herbs':'草药','material.metal':'金属','material.stone':'石材','material.feathers':'羽毛','material.leaves':'树叶','material.fruit':'果实','material.fungus':'菌类','material.tendon':'筋腱',
  'item.bone-throwingknife':'骨飞刀','item.wood-throwingknife':'木飞刀','item.bone-needles':'骨针','item.wood-needles':'木针','item.bone-dart':'骨镖','item.pill-heal':'疗伤丹','item.pill-energy':'回魂丹','item.pill-strength':'强身丹','item.pill-guard':'护体丹','item.pill-cleanse':'清灵丹','item.pill':'丹药','item.capsule':'药囊','item.dart':'飞镖','item.needles':'飞针','item.throwingknife':'飞刀',
};
export const SOUL_IMAGE_GROUPS:Record<string,string>={opening:'恩赐与启程',spirit:'武魂形态',beast:'兽类与植物',item:'器物',material:'自然与材料',skill:'元素与意象'};
// Deduplicate by the actual modern painting, using the game's calibrated crop.
export const SOUL_IMAGE_LIBRARY:readonly Artwork[]=(()=>{
  const entries=new Map([...ART_CATALOG,...ART_EXTENSION].map(a=>[a.key,artwork(a.key)]));
  const seen=new Set<string>();
  return [...entries.values()].sort((a,b)=>Object.keys(SOUL_IMAGE_GROUPS).indexOf(a.domain)-Object.keys(SOUL_IMAGE_GROUPS).indexOf(b.domain)).filter(a=>{
    const art:PortraitArt=illustratedArt(a),identity=JSON.stringify([art.src,art.cell,art.columns,art.rows,art.crop]);
    if(seen.has(identity))return false;seen.add(identity);return true;
  }).map(a=>({...a,label:names[a.key]??a.label}));
})();
