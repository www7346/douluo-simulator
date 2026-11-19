import '../shared/tangmen-item-art.js';
import {artwork, type Artwork} from './art-catalog';
import '../shared/opening-workshop-image-core.js';
import '../shared/realm-equipment-visuals.js';

/** These selectors read mechanical identity. Names, prose, RNG and budgets are deliberately absent. */
const elements:Record<string,string> = {火:'fire',冰:'ice',雷:'lightning',thunder:'lightning',木:'wood',暗:'dark',水:'water',毒:'poison',毒蚀:'poison','toxic-corrosion':'poison',生命:'life',光:'light',风:'wind',土:'earth',金:'metal',灵魂:'soul',精神:'psychic',死亡:'death',毁灭:'destruction',空间:'space',时间:'time',物理:'physical'};
function element(value:unknown):string {const id=String(value??'').replace(/^attribute\./,'');return elements[id]??id;}
const families:Array<[RegExp,string]> = [
 [/蜈蚣|centipede/,'centipede'],[/蜘蛛|蛛形|arachnid|spider/,'spider'],[/蝎|scorpion/,'scorpion'],
 [/章鱼|头足|软体水族|octopus|cephalopod/,'octopus'],[/甲壳水族|甲壳纲|蟹|crustacean/,'crab'],
 [/蜗牛|腹足|snail/,'snail'],[/蠕虫|worm/,'worm'],[/鳐|ray/,'ray'],
 [/鲸|whale/,'whale'],[/鲨|shark/,'shark'],[/龟|turtle/,'turtle'],[/蜥|lizard/,'lizard'],
 [/蛇|蟒|serpent/,'serpent'],[/龙|dragon/,'dragon'],[/鱼|fish/,'fish'],
 [/蝙蝠|翼手|bat/,'bat'],[/猫头鹰|鸮|owl/,'owl'],[/鹰|eagle/,'eagle'],
 [/兔|rabbit/,'rabbit'],[/野猪|猪|boar/,'boar'],[/鹿|deer/,'deer'],[/猿|猩|ape/,'ape'],[/牛类|bovine/,'bovine'],[/马类|equine/,'equine'],
 [/豹|leopard/,'leopard'],[/獾|badger/,'badger'],[/狸|civet/,'civet'],[/狐|fox/,'fox'],[/狮|lion/,'lion'],[/虎|tiger/,'tiger'],[/狼|wolf/,'wolf'],[/熊|bear/,'bear'],
 [/菌|fungus/,'fungus'],[/藤|vine/,'vine'],[/花卉|花|flower/,'flower'],[/树|木本|tree/,'tree'],
 // Broad categories use an explicitly representative silhouette. Unrecognised families use a sigil.
 [/昆虫|甲虫|insect|beetle/,'beetle'],[/鸟类|鸟|翼禽|avian/,'eagle'],[/犬科|canine/,'wolf'],[/猫科|feline/,'feline'],
];
export function beastArtwork(beast:any):Artwork {
 const presetArt=beast?.artId??beast?.扩展?.artId??(beast?.presetId?globalThis.SoulPresetCatalog?.get(beast.presetId)?.artId:null);
 if(presetArt&&artwork(presetArt).key!=='unknown')return artwork(presetArt);
 const categories=beast?.categoryTags??beast?.类别标签??[];
 const anatomy=beast?.anatomyTags??beast?.解剖标签??[];
 const definition=beast?.lineage?.definition??beast?.血脉?.definition;
 // speciesTraits also contains combat channel labels (for example dragon intimidation).
 // Those permissions cannot change an animal's anatomy.
 const species=String(beast?.speciesId??beast?.物种ID??'');
 // A confirmed concept can name the anatomy while form only lists fur/colour.
 // Accept explicit shape declarations, never display names or skill metaphors.
 const declaredShape=String(definition?.concept??'').match(/狐形|狼形|虎形|狮形|豹形|猫头鹰形|鹰形/)?.[0]??'';
 const form=String(definition?.form??beast?.form??'')+' '+declaredShape;
 const texts=[[species],categories,anatomy,definition?.categories??[]].map(list=>Array.isArray(list)?list.join('、'):'');
 // Only a confirmed form may refine a broad family; skill names/prose cannot.
 const formFamily:Array<[RegExp,RegExp,string]>=[[/犬科|canine/,/狐/,'fox'],[/犬科|canine/,/狼/,'wolf'],[/猫科|feline/,/虎/,'tiger'],[/猫科|feline/,/狮/,'lion'],[/猫科|feline/,/豹/,'leopard'],[/鸟|avian/,/猫头鹰|鸮/,'owl'],[/鸟|avian/,/鹰/,'eagle']];
 const confirmedFamily=formFamily.find(([category,shape])=>category.test(texts.join('、'))&&shape.test(form))?.[2];
 const specific=families.slice(0,-4),broad=families.slice(-4);
 const family=confirmedFamily??texts.map(text=>specific.find(([pattern])=>pattern.test(text))?.[1]).find(Boolean)
  ??texts.map(text=>broad.filter(([,family])=>family!=='wolf').find(([pattern])=>pattern.test(text))?.[1]).find(Boolean);
 if(!family){
  const fallback:Array<[RegExp,string]>=[[/食肉植物|carnivorous-plant/,'carnivorous-plant'],[/水生植物|aquatic-plant/,'aquatic-plant'],[/植物|plant|草本|grass|根茎|root|果实种子|seed-fruit|苔藓|bryophyte/,'plant'],[/人形|humanoid/,'humanoid'],[/软体|mollusk/,'mollusk'],[/水生|aquatic/,'aquatic']];
  const group=fallback.find(([pattern])=>pattern.test(texts.join('、')));
  return artwork(group?'category.'+group[1]:'unknown');
 }
 const spectrum=beast?.affinitySpectrum??beast?.属性谱;
 const candidates=(spectrum?.主属性??definition?.attributes?.filter((a:any)=>Number(a.investment)>0).map((a:any)=>a.id)??[]).map(element);
 // Unsupported elements keep a neutral portrait; they never gain a different element's visual.
 for(const candidate of candidates){const art=artwork('beast.'+family+'.'+candidate);if(art.key!=='unknown')return art;}
 return artwork('beast.'+family+'.neutral');
}

export function artEffectNodes(skill:any):any[] {
 const graph=skill?.effectGraph??skill?.graph??skill?.passiveEffectGraph;
 if(Array.isArray(graph?.nodes))return graph.nodes;
 return (skill?.frozenEffectSpecs??skill?.effectSpecs??[]).map(([effectId,params]:[string,any])=>({effectId,params}));
}
function skillFromNodes(nodes:any[]):Artwork {
 const find=(id:string)=>nodes.find(n=>n.effectId===id);
 const has=(id:string)=>Boolean(find(id));
 const pick=(key:string)=>artwork('skill.'+key);
 if(has('contract.oath'))return pick('bind');
 if(has('trigger.contract'))return pick('domain');
 if(has('payload.death'))return pick('death');
 const damage=find('payload.damage')??find('payload.residual')??find('zone.hazard')??find('payload.drain');
 if(damage){
  const attr=element(damage.params?.类型);
  const shape=has('target.cone')?'cone':nodes.some(n=>/^target\.(cluster|burst|aura)/.test(n.effectId))?'burst':has('release.projectile')?'projectile':'slash';
  if(['fire','ice'].includes(attr)){
   const exact=pick(attr+'-'+shape);return exact.key!=='unknown'?exact:pick(attr+'-projectile');
  }
  if(['lightning','water','wind','earth','metal'].includes(attr))return pick(attr);
  if(['light','life','dark','wood','death','space','time','psychic','destruction'].includes(attr))return pick(attr);
  if(attr==='poison')return pick('poison-damage');
  if(attr==='soul')return pick('soul-damage');
  if(['阴','阳','yin','yang'].includes(attr))return pick('domain');
  if(['淫','lust'].includes(attr))return pick('charm');
  return pick(shape==='projectile'?'arrow':shape);
 }
 if(has('payload.soul_damage'))return pick('soul-damage');
 if(has('payload.revive'))return pick('revive');
 if(has('payload.restore')&&!has('payload.heal'))return pick(find('payload.restore').params?.生命模式==='无'?'soul-restore':'heal');
 if(has('payload.heal'))return pick('heal');
 if(has('status.regeneration'))return pick('regeneration');
 if(has('payload.soul_restore'))return pick('soul-restore');
 const shield=find('payload.shield');
 if(shield){const attr=element(shield.params?.类型);return pick(['fire','ice','light'].includes(attr)?attr+'-shield':'shield');}
 const amp=find('passive.element_amplify');
 if(amp){const attr=element(amp.params?.类型);return pick(['fire','ice','lightning'].includes(attr)?attr+'-amplify':'enhance');}
 const guard=find('status.resistance_shift');
 if(guard){
  const mode=guard.params?.模式,attr=element(guard.params?.类型);
  if(mode==='吸收')return pick('absorption');
  if(mode==='易伤')return pick('bleed');
  const key=mode==='免疫'?'immunity':'resistance',specific=pick(attr+'-'+key);
  return specific.key==='unknown'?pick(key):specific;
 }
 const control:Array<[string,string]>=[
  ['status.status_guard','status-guard'],['status.invulnerable','immunity'],['reaction.reflect','reflection'],
  ['payload.cleanse','cleanse'],['status.bind','bind'],['status.slow','slow'],['status.paralysis','stun'],['status.stun','stun'],
  ['payload.dispel','dispel'],['zone.wall','wall'],['zone.obscure','blind'],['domain.field','domain'],
  ['copy.skillset','copy'],['realm.store','space'],['realm.deploy','summon'],
  ['transform.disguise','transformation'],['transform.form','transformation'],['transform.martial_avatar','transformation'],['transform.sex','transformation'],['status.sleep','sleep'],['status.invisibility','dark'],['status.mark','accuracy'],['status.armor_break','reduction'],
  ['status.silence','silence'],['status.charm','charm'],['status.desire','burn'],['status.fear','fear'],['status.blind','blind'],
  ['status.mind_control','charm'],['status.soul_control','silence'],['status.cognition_shift','charm'],['status.mute','silence'],['status.limb_bind','bind'],['status.power_seal','silence'],
  ['status.eternal_wound','bleed'],['status.burn','burn'],['status.poison','poison'],['status.haste','speed'],
  ['move.knockback','knockback'],['move.pull','pull'],['move.teleport','teleport'],['move.flight','flight'],
  ['summon.entity','summon'],['status.buff','attribute-buff'],['status.amplify','attribute-buff'],['modifier.next_skill','enhance'],['reaction.counter','multiattack'],
  ['status.damage_over_time','bleed'],['reaction.interpose','shield'],['payload.recon','accuracy'],
  ['status.limited_followup','multiattack'],['payload.stack_confluence','multiattack'],
  ['status.next_check_penalty','reduction'],['status.battle_resource','enhance'],
  ['payload.resource_damage','slash'],['payload.resource_endstate','soul-restore'],['payload.zone_dispel','dispel'],
  ['status.hit_advantage','accuracy'],['modifier.hit_advantage','accuracy'],['status.hit_disadvantage','blind'],
  ['status.hit_reroll','accuracy'],['modifier.hit_reroll','accuracy'],['status.evasion_reroll','speed'],
  ['status.sure_hit','accuracy'],['modifier.sure_hit','accuracy'],['status.absolute_evasion','speed'],
  ['status.critical_guarantee','enhance'],['modifier.critical_guarantee','enhance'],['status.critical_guard','reduction'],
  ['status.miss_graze','slash'],['modifier.miss_graze','slash'],
  ['payload.arcane_lock','bind'],['payload.unlock','dispel'],['payload.suppress_lock','silence'],
  ['payload.rule_break','dispel'],['payload.analyze_lock','accuracy'],['payload.create_key','space'],
  ['payload.repair_item','regeneration'],['realm.capture','space'],['payload.fabricate','enhance'],
  ['intimate.stimulate','charm'],['intimate.climax','charm'],
 ];
 for(const [id,key]of control)if(has(id))return pick(key);
 const stat=find('passive.equipment_stat')?.params?.属性;
 if(stat){return pick(/减伤|防御|AC/.test(stat)?'reduction':/生命/.test(stat)?'heal':/魂力/.test(stat)?'soul-restore':/移动|先攻/.test(stat)?'speed':/命中/.test(stat)?'accuracy':/伤害/.test(stat)?'slash':'attribute-buff');}
 if(nodes.some(n=>/^move\./.test(n.effectId)))return pick('movement');
 if(has('modifier.world_duration'))return pick('time');
 return artwork('unknown');
}
export function skillArtwork(skill:any):Artwork {
 const court=(globalThis as any).SoulNineCourts?.ofSkill(skill);if(court)return artwork(court.artId);
 const presetArt=skill?.artId??(skill?.presetId?globalThis.SoulPresetCatalog?.get(skill.presetId)?.artId:null);
 if(presetArt&&artwork(presetArt).key!=='unknown')return artwork(presetArt);
 const art=skillFromNodes(artEffectNodes(skill));
 if(art.key==='unknown'&&Object.keys(skill?.modifiers?.attributes??{}).length)return artwork('skill.attribute-buff');
 return art;
}

const materialParts:Array<[RegExp,string]>=[
 [/筋|腱/,'tendon'],
 [/封装|内芯组织/,'packaged'],[/表皮纤维|细绒纤维|木髓|树皮|木质|枝|根/,'wood'],[/血/,'blood'],[/神经|纤维束/,'nervous'],[/脏器|心脏|内脏/,'organ'],[/肢体/,'limb'],[/草本|药草/,'herbs'],[/金属/,'metal'],[/岩石|石块/,'stone'],
 [/结晶|晶体|晶石/,'crystal'],[/鹿角|角髓|犄角|角/,'antler'],[/骨|骸/,'bone'],
 [/皮|毛/,'hide'],[/鳞|甲片|甲壳/,'scales'],[/羽|翎/,'feathers'],[/牙|齿/,'fang'],[/爪/,'claw'],
 [/树皮|木|枝|根/,'wood'],[/叶/,'leaves'],[/藤/,'vine'],[/花/,'flower'],[/果|种子/,'fruit'],
 [/菌|孢子/,'fungus'],[/珍珠|贝|蚌/,'shell'],[/腺|毒囊|毒液/,'gland'],
];
export function materialArtwork(material:any):Artwork {
 // The first category is the harvested part. The second describes its animal source.
 const part=String(material?.appearancePart||material?.categories?.[0]||material?.类别标签?.[0]||'');
 const match=materialParts.find(([pattern])=>pattern.test(part));
 if(match?.[1]==='crystal'){
  const spectrum=material?.attributeSpectrum??{};
  const primary=Object.entries(spectrum).sort((a,b)=>Number(b[1])-Number(a[1]))[0];
  const variant=primary&&Number(primary[1])>0?({火:'fire',冰:'ice',毒蚀:'poison',毒:'poison'} as Record<string,string>)[primary[0]]:null;
  if(variant)return artwork('material.crystal-'+variant);
 }
 if(match?.[1]==='metal'&&/矿|ore/i.test(part))return artwork('material.ore');
 if(match?.[1]==='antler')return {...artwork('material.antler'),src:'/art/fantasy-v4/'+(Number(material?.attributeSpectrum?.火)>0?'antler-fire':'antler-neutral')+'.png',cell:0,columns:1,rows:1,inset:0};
 return artwork('material.'+(match?.[1]??'packaged'));
}
// These are fixed catalogue identities, not a search through generated item names.
const templates:Record<string,string>={
 'cloth-common':'robe','boots-common':'boots','dagger-hunting':'dagger','staff-wood':'staff','amulet-calm':'necklace',
 'device-bastion-bracer':'bracer',
 'device-vital-lotus':'pendant','device-windstep-boots':'boots','device-soul-lens':'crown',
 bandage:'bandage','basic-soul-tonic':'gourd','antidote-pill':'pill-cleanse',rope:'rope',
};
const materialTemplates:Record<string,string>={'material-hide':'hide','material-scale':'scales','material-venom':'gland'};
const restraintArt:Record<string,string>={
 'restraint-ankles':'preset.restraint.ankles','restraint-sinking-wrists':'preset.restraint.sinking-wrists',
 'restraint-quicksand-ankles':'preset.restraint.quicksand-ankles','restraint-tether':'preset.restraint.tether',
 'restraint-net':'preset.restraint.net',rope:'item.rope','restraint-cuffs':'preset.restraint.cuffs',
 'restraint-gag':'preset.restraint.gag','restraint-seal-collar':'preset.soul-sealing-collar',
 'restraint-seal-platform':'preset.restraint.seal-platform','restraint-slime-suit':'preset.restraint.slime-suit',
};
export function itemArtwork(item:any,kind=String(item?.type??item?.category??'')):Artwork {
 if(kind==='图纸'){const productKind=String(item?.category??item?.mechanics?.category??'');if(['暗器','丹药','毒药','魂导器','拘束器'].includes(productKind))kind=productKind;}
 const custom=item?.customImage??item?.payload?.customImage??item?.mechanics?.customImage;
 if(globalThis.SoulOpeningWorkshopImage.valid(custom))return {key:'opening-workshop.custom',domain:'item',label:item?.name??'自定义作品',src:custom,cell:0,columns:1,rows:1};
 const realm=globalThis.SoulRealmEquipmentVisuals.get(item);
 if(realm)return artwork(realm.artId);
 const tangmen=globalThis.SoulTangmenItemArt.get(item);
 if(tangmen)return artwork(tangmen.artId);
 const explicit=item?.artId??item?.payload?.artId??item?.mechanics?.artId;
 if(explicit&&artwork(explicit).key!=='unknown')return artwork(explicit);
 if(typeof item?.templateId==='string'&&item.templateId.startsWith('intimate-')){const art=artwork('item.intimate.'+item.templateId.slice(9));if(art.key!=='unknown')return art;}
 const restraintId=item?.templateId??item?.definition?.restraint?.templateId??item?.payload?.backgroundRestraint?.definition?.templateId;
 if(restraintArt[restraintId])return artwork(restraintArt[restraintId]);
 if(item?.templateId==='seal-platform')return artwork(item?.扩展?.sealControl&&!item?.扩展?.sealedEntityId?'item.seal-platform.open':'item.seal-platform.closed');
 if(item?.templateId==='restraint-seal-platform')return artwork('preset.restraint.seal-platform');
 const preset=item?.templateId?globalThis.SoulPresetCatalog?.get(item.templateId):null;
 if(preset&&artwork(preset.artId).key!=='unknown')return artwork(preset.artId);
 const payload=item?.payload??item??{};
 const boon=payload.boonSourceId?'bone-'+payload.boonSourceId:payload.ringSource?.kind==='boon-ring'?payload.ringSource.sourceId:payload.openingArt;
 if(boon&&/^[a-z-]+$/.test(boon))return {key:'opening-boon.'+boon,domain:'item',label:item.name??'启程恩赐',src:`/art/opening-boons/${boon}.webp`,cell:0,columns:1,rows:1};
 if(materialTemplates[item?.templateId])return artwork('material.'+materialTemplates[item.templateId]);
 if(kind==='材料')return materialArtwork(item);
 // A blueprint depicts the same fixed product form, with its UI label distinguishing it from an item.
 const mechanics=item?.mechanics??payload;
 const form=mechanics.fixedForm?.id??item?.fixedForm?.id??templates[item?.templateId];
 if(form){
  const materials=mechanics.appearanceMaterials??item?.skills?.[0]?.appearanceMaterials??[];
  const totals:Record<string,number>={};
  for(const material of materials){const part=String(material.part??'');const family=/骨|角|牙|齿|爪/.test(part)?'bone':/木|枝|根|树皮/.test(part)?'wood':/金属|矿|铁|铜|钢/.test(part)?'metal':null;if(family)totals[family]=(totals[family]??0)+Math.max(0,Number(material.value)||0);}
  const substance=Object.keys(totals).sort((a,b)=>totals[b]-totals[a])[0];
  if(substance){const materialVariant=artwork(`item.${substance}-${form}`);if(materialVariant.key!=='unknown')return materialVariant;}
  const nodes=[...artEffectNodes(mechanics),...artEffectNodes(payload.activeSkill),...(payload.skills??item?.skills??[]).flatMap(artEffectNodes)];
  const attr=element(nodes.find(n=>['payload.damage','passive.element_amplify'].includes(n.effectId))?.params?.类型);
  const decorated=artwork('item.'+attr+'-'+form);
  const plain=artwork('item.'+form);
  if(decorated.key!=='unknown')return decorated;
  if(plain.key!=='unknown')return plain;
 }
 if(['丹药','毒药'].includes(kind))return artwork('item.pill');
 if(kind==='暗器')return artwork('item.needles');
 if(item?.templateId==='support-vitality-sausage'&&item?.payload?.recipeId==='vitality-sausage'||item?.templateId==='support-soul-sausage'&&item?.payload?.recipeId==='soul-sausage')return artwork('preset.soul.sausage');
 if(kind.includes('食品')||kind==='食物')return artwork('item.food');
 if(kind==='消耗品')return artwork('item.potion');
 if(kind==='魂骨')return artwork('item.bone');
 if(kind==='图纸')return artwork('item.blueprint');
 return artwork('unknown');
}
export function martialSoulArtwork(soul:any):Artwork {
 const definition=soul?.扩展?.结构化武魂?.definition??soul?.definition??soul;
 const presetId=definition?.presetId??soul?.presetId??soul?.扩展?.presetId;
 const explicitArt=artwork(soul?.artId??soul?.扩展?.artId??definition?.artId??'unknown');
 if(explicitArt.key!=='unknown')return explicitArt;
 const canonical=globalThis.SoulCanonicalWomenContent?.forSoul(soul);
 if(canonical&&artwork(canonical.SOUL.artId).key!=='unknown')return artwork(canonical.SOUL.artId);
 // The cloud frontend cannot import the private preset catalog. Resolve its
 // registered visual identity locally; never infer a preset from its name.
 const registeredKey=typeof presetId==='string'&&presetId.startsWith('preset:')?['preset.soul.','spirit.'].map(prefix=>prefix+presetId.slice(7)).find(key=>artwork(key).key!=='unknown')??'':'';
 const presetArt=registeredKey||(presetId?globalThis.SoulPresetCatalog?.get(presetId)?.artId:null);
 if(presetArt&&artwork(presetArt).key!=='unknown')return artwork(presetArt);
 const categories=(definition?.categories??[]).map((c:string)=>c.replace(/^category\./,''));
 const spiritForms:Record<string,string>={blood:'blood',nervous:'nervous',organ:'organ',heart:'organ',limb:'limb',skin:'skin',hair:'hair',symbiote:'symbiote',firearm:'firearm',metal:'metal',stone:'stone',fluid:'fluid',gas:'gas',sun:'sun',moon:'moon',star:'star',energy:'energy',spear:'spear',bow:'bow',grimoire:'grimoire',cauldron:'cauldron',seal:'seal',formation:'formation',instrument:'instrument',mechanism:'mechanism',textile:'textile',hammer:'hammer',grass:'grass',humanoid:'humanoid'};
 for(const category of categories){if(spiritForms[category]){
  const angel=category==='humanoid'&&categories.includes('light')&&(definition.channels??[]).some((c:any)=>(c.id??c)==='channel.flight');
  return artwork('spirit.'+(angel?'angel':spiritForms[category]));
 }}
 const forms:Record<string,string>={sword:'sword',blade:'dagger',staff:'staff',armor:'breastplate',bone:'bone',crystal:'crystal',wood:'wood'};
 for(const category of categories){if(forms[category])return artwork((['crystal','wood'].includes(category)?'material.':'item.')+forms[category]);}
 const beast=beastArtwork({lineage:{definition}});
 if(beast.key!=='unknown')return beast;
 const symbols:Record<string,string>={shield:'shield',chain:'bind',eye:'status-guard',flame:'fire-projectile',frost:'ice-projectile',thunder:'lightning',storm:'wind',ocean:'water',earth:'earth',mountain:'earth',shadow:'dark',light:'light',void:'space',space:'space',time:'time',gravity:'domain',dream:'psychic',sound:'wind',poison:'poison-damage',plague:'poison-damage',life:'life',death:'death',soul:'soul-damage',mind:'psychic',order:'domain',chaos:'destruction',causality:'transfer',fate:'time',memory:'copy',emotion:'psychic',boundary:'wall',creation:'summon',destruction:'destruction',devouring:'absorption',replication:'copy',transformation:'transformation',domain:'domain'};
 for(const category of categories){if(symbols[category])return artwork('skill.'+symbols[category]);}
 return artwork('unknown');
}

export function battleActionArtwork(skill:any,state:any):Artwork {
 const sourceItem=state?.物品?.实例?.[skill?.sourceItemId];
 return sourceItem?itemArtwork(sourceItem):skillArtwork(skill);
}
