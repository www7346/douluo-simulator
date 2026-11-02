(function attachNarrative(root,factory){
 const equipment=root?.SoulEquipmentAffixes ?? (typeof require==='function'?require('./equipment-affixes.js'):null);
 const api=factory(equipment);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulNarrative=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(equipment){
 'use strict';
 const prose=globalThis.SoulSkillProse??(typeof require==='function'?require('../../shared/skill-prose-core.js'):null);
 const clean=v=>String(v??'').trim();
 const elements={物理:['劲','劲力','无色的气流'],金:['金','金芒','细密金线'],木:['木','青枝','枝叶般的纹路'],水:['水','水流','层叠水纹'],火:['炎','火焰','赤红火舌'],土:['岩','岩层','粗粝岩纹'],风:['风','疾风','卷起的细尘'],雷:['雷','雷电','细小电弧'],冰:['霜','寒霜','薄白霜痕'],光:['光','光束','明亮光斑'],暗:['影','暗影','深色影线'],毒蚀:['毒','毒雾','暗绿色痕迹'],生命:['生','生机','叶脉状细纹'],死亡:['冥','死气','灰白纹痕'],毁灭:['烬','毁灭之力','暗红裂纹'],灵魂:['魂','魂念','水波状光晕'],精神:['心','精神波动','细微的心念波纹'],阴:['阴','阴柔之息','沉静绵长的纹路'],阳:['阳','阳刚之力','明亮有力的光纹'],淫:['欲','欲念波动','柔和起伏的心绪纹光'],空间:['隙','空间波纹','交错的折光'],时间:['时','时序波纹','重叠的残影']};
 const getNodes=skill=>skill?.effectGraph?.nodes??skill?.graph?.nodes??skill?.效果图?.nodes??(skill?.frozenEffectSpecs??skill?.effectSpecs??[]).map(([effectId,params])=>({effectId,params}));
 const bodyImage=value=>{
  const s=clean(value);return /甲|铠|盾/u.test(s)?'甲':/狐|犬|狼/u.test(s)?'牙':/虎|猫|豹/u.test(s)?'爪':/蛇|蟒/u.test(s)?'牙':/羽|鸟|隼|鹰/u.test(s)?'羽':/藤|根|树|草/u.test(s)?'藤':/针/u.test(s)?'针':/剑|刀|刃/u.test(s)?'刃':/伞/u.test(s)?'伞':'魂力';
 };
 function skillNarrative(skill,identity=''){
  const nodes=getNodes(skill),powers=nodes.filter(n=>! /^(release|target|check|sustain)\./u.test(n.effectId));
  const first=powers[0]??{},p=first.params??{},attribute=p.类型??nodes.find(n=>n.params?.类型)?.params.类型??'物理';
  const [short,force,texture]=elements[attribute]??elements.物理,image=bodyImage(identity),ids=nodes.map(n=>n.effectId);
  const passive=(skill.effectGraph?.branches??skill.graph?.branches??[]).some(b=>b.activation==='passive');
  let names,description;
  switch(first.effectId){
   case 'passive.element_amplify':names=[`聚${short}纹`,`${force}凝辉`];description=`${texture}沿器身汇拢，使佩戴者施展的${force}更具威力。`;break;
   case 'passive.equipment_stat': {const theme={物理防御:'坚垒',魂技防御:'澄心',生命上限:'蕴生',魂力上限:'储元',普通攻击命中:'准锋',魂技攻击命中:'引魂',普通攻击伤害:'锐击',固定减伤:'承岳',先攻:'先觉',移动区:'逐风',开战护盾:'启障'}[p.属性];names=[theme+'纹',theme+'印'];description=equipment.describe(p.属性,p.数值)+'，随装备生效，卸下后失效。';break;}
   case 'status.resistance_shift':{
    const mode=p.模式;
    names=mode==='吸收'?[`噬${short}凝${image==='甲'?'甲':'盾'}`,`${force}归护`,`纳${short}成障`]:mode==='免疫'?[`辟${short}护身`,`拒${short}之衣`,`${force}不侵`]:mode==='易伤'?[`蚀${short}之印`,`${force}裂痕`,`破${short}刻痕`]:[`御${short}护身`,`${force}护衣`,`避${short}之息`];
    description=mode==='吸收'?`来袭的${force}贴近身侧，散成${texture}，重新凝成一层护障。`:mode==='易伤'?`${texture}在目标身上浮现，暴露出易受${force}侵袭的痕迹。`:`${texture}沿${image==='甲'?'甲面':'身侧'}铺开，${mode==='免疫'?'隔开':'缓冲'}来袭的${force}。`;break;
   }
   case 'status.status_guard':{
    const themes={'status.poison':['护脉','经脉间浮出细线，随着呼吸平稳起伏'], 'status.stun':['定神','额前显出清晰轮廓，将散乱的魂念收束'], 'status.charm':['守心','心口浮起一枚清亮印记，轮廓始终凝定'], 'status.fear':['镇魄','沉稳的气息笼住胸口，随心跳一同起落'], 'status.eternal_wound':['固元','细纹沿肌理相互扣合，宛若贴身的纹甲']};
    const [theme,look]=themes[p.防护对象]??['守正','一层细密纹路贴着身体铺开，轮廓安定而清晰'];names=[`${theme}之衣`,`${theme}印`,`凝息${theme}`];description=look+'。';break;
   }
   case 'payload.damage':case 'payload.drain':case 'payload.residual':{
    const ranged=ids.includes('release.projectile'),area=ids.some(id=>/target\.(cluster|line|cone|burst|aura)/u.test(id));
    const action=ranged?(area?'涌潮':'飞矢'):image==='牙'?'突咬':image==='爪'?'爪击':image==='刃'?'斩击':'撞击';
    names=attribute==='物理'?[`${image==='牙'?'长牙':image==='爪'?'利爪':image==='刃'?'锋刃':'凝劲'}${action}`,`疾势${action}`,`破势${action}`]:[`${short}${image==='羽'?'羽':image==='刃'?'锋':''}${action}`,`${force}破袭`,`凝${short}${ranged?'投击':'重击'}`];
    description=ranged?`${force}在身前收拢，${area?'沿着施展方向涌出':'凝成一道细长的锋芒，射向目标'}。`:image==='牙'?'压低身形，忽然探身张口，朝近处目标咬下。':`${force}随着${image==='爪'?'挥爪':image==='刃'?'刃锋':'身形'}涌出，向近处目标发起一击。`;break;
   }
   case 'payload.shield':names=[`${image==='甲'?'叠甲':image==='藤'?'藤衣':'凝壁'}护身`,'合璧之护','护心障'];description=`${image==='藤'?'柔韧的细藤':image==='甲'?'层叠的甲影':'凝聚的魂力'}在目标身侧合拢，成为一层清晰可见的护障。`;break;
   case 'payload.heal':case 'status.regeneration':names=['润脉回生','温息愈合','生机续脉'];description='柔和的暖意贴上伤处，细纹随着呼吸缓缓舒展，让受创的身体恢复生机。';break;
   case 'payload.restore':{
    const health=p.生命模式!=='无'&&Number(p.生命数值)>0,soul=p.魂力模式!=='无'&&Number(p.魂力数值)>0;
    names=health&&soul?['双息归流','凝元调息','回息']:health?['润脉回生','温息愈合','续脉']:['息海回流','归元吐纳','聚息还元'];
    description=health?'温润的魂力流过伤处，让受创的身体重新恢复生机。':'散开的魂力重新汇拢，在目标体内恢复平稳的流动。';break;
   }
   case 'payload.soul_restore':names=['息海回流','归元吐纳','聚息还元'];description='散开的魂力重新汇拢，在身前收成细细一线，回到体内。';break;
   case 'status.limb_bind':case 'status.bind':names=[...(image==='藤'&&clean(identity)?[`${clean(identity).replace(/[草藤]$/u,'')}缠绕`]:[]),`${image==='藤'?'藤丝':'魂索'}结网`,'盘索缚身','交结之缚'];description=`${image==='藤'?'细藤':'魂力细索'}交错伸展，在目标身边收紧，结成牵制动作的绳结。`;break;
   case 'status.slow':names=[attribute==='冰'?'寒意迟行':'迟行之印','凝滞之痕','缓步印'];description='魂力贴着目标散开，在动作之间留下迟滞感，拖慢其步伐。';break;
   case 'status.burn':names=['附骨余烬','焰痕不熄','火种灼身'];description='细小火种附在目标身上，散出暗红焰痕，持续灼伤其身体。';break;
   case 'status.poison':names=['蚀脉毒痕','腐毒侵身','浸毒之伤'];description='毒性沿接触处留下暗色痕迹，在目标体内继续侵蚀。';break;
   case 'payload.cleanse':names=['涤尘净身','澄息拂秽','洗脉'];description='澄净的魂力贴着身体掠过，将可清除的负面影响从身上拂去。';break;
   case 'payload.dispel':names=['散咒','破术之纹','荡除'];description='交错的魂力纹路扫过施术痕迹，拆散可以驱除的效果。';break;
   case 'move.teleport':names=['折隙移步','瞬身','换影步'];description='身形在折光中收拢，随即于另一处重新显现。';break;
   case 'move.knockback':names=['震退','推山劲','斥浪'];description='一股向外的冲力迎面展开，将目标推离原来的位置。';break;
   case 'move.pull':names=['牵引','回索','引潮'];description='魂力在身前收紧，将目标向自己所在的方向拉近。';break;
   case 'move.flight':names=['凌空','升翼','踏空'];description='身形离开地面，在魂力托举下进入空中。';break;
   case 'status.paralysis':names=['麻痹印','封脉','僵身'];description='细密的麻痹痕迹沿肢体积聚，渐渐逼近发作的临界。';break;
   case 'status.armor_break':names=['裂甲','破铠','穿甲刻痕'];description='魂力在防御表层撕开缺口，留下交错的破损痕迹。';break;
   case 'status.eternal_wound':names=['难愈之痕','蚀骨创伤','缠身恶痕'];description='深刻的伤痕迟迟无法平复，魂力在伤处紊乱地流动。';break;
   case 'status.invisibility':names=['隐形','匿身','无形衣'];description='身形的轮廓渐渐变淡，最终隐没在周围的景色中。';break;
   case 'status.invulnerable':names=['截击之障','挡锋','拒袭之护'];description='魂力在来袭方向结成护层，截住逼近的攻击。';break;
   case 'status.buff':names=['振力','强身之印','聚势'];description='魂力化成凝实的纹路，随着身体动作一道收紧。';break;
   case 'status.haste':names=['轻身疾行','逐风步','疾驰'];description='轻快的魂力裹住脚步，令动作变得迅捷。';break;
   case 'summon.entity':names=['唤灵助阵','召灵','同形之伴'];description='魂力在身旁勾出轮廓，召唤的身影随之凝实。';break;
   case 'transform.form':case 'transform.martial_avatar':names=['武魂化身','显形','真形降临'];description='武魂的轮廓沿身体展开，原本的形态逐渐被新的身影覆盖。';break;
   default:names=[`${force}印`,`${force}凝形`,`${force}纹章`];description=`${texture}顺着${image==='甲'?'甲面':image==='刃'?'刃锋':'武魂的轮廓'}显现，力量的形迹变得清晰。`;
  }
  // Names describe identity, not the RNG order. Alternate phrases only resolve collisions.
  const second=powers[1];
  if(second?.effectId==='status.poison')names.push('毒痕'+names[0]);
  if(second?.effectId==='status.burn')names.push('余烬'+names[0]);
  if(second?.effectId==='payload.shield')names.push('结壁'+names[0]);
  // More literal synonyms are available for multi-skill packages, without sequence suffixes.
  const cores=[...names];for(const prefix of ['凝魂','聚灵','魂力','凝息'])for(const name of cores)names.push(prefix+name);
  description=prose.compose(skill,identity,{intro:description});
  return {name:names[0],names,description,attribute,image,passive};
 }
 function distinctName(preferred,alternatives,used,limit=18){
  for(const raw of [preferred,...alternatives]){const name=clean(raw).slice(0,limit);if(name&&!used.has(name)){used.add(name);return name;}}
  // Same semantic names are legitimate across unrelated objects. IDs retain identity;
  // never counterfeit a different power by appending registry labels or numbers.
  return clean(preferred).slice(0,limit);
 }
 function packageNarrative(candidate,identity='',used=new Set()){
  const skills=candidate.skills.map(skill=>{const entry=skillNarrative(skill,identity);return {skillId:skill.id,name:distinctName(entry.name,entry.names,used,16),description:entry.description};});
  return {candidateId:candidate.id,title:skills.length===1?skills[0].name:skills.slice(0,2).map(s=>s.name).join(' · ').slice(0,18),description:skills.length===1?skills[0].description:`${clean(identity).slice(0,12)||'武魂'}的力量显出不同姿态，可分别施展${skills.map(s=>s.name).join('、')}。`.slice(0,120),skills};
 }
 function productNarrative(candidate,category,materials=[],identity='',used=new Set()){
  const entry=skillNarrative(candidate,identity),nodes=getNodes(candidate),p=nodes.find(n=>n.effectId==='status.resistance_shift')?.params;
  const shells=['丹药','毒药'].includes(category)?['丸','丹','药散']:category==='暗器'?['针','镖','袖箭']:['臂环','护心镜','腰佩'];
  const specified=clean(identity).match(/护腕|护心镜|臂环|腰佩|玉佩|手镯|指环|戒指|银针|飞针|袖箭|护符|项链|发簪|药丸|药散/u)?.[0];
  const form=candidate.fixedForm?.name??specified??(category==='魂导器'&&nodes.some(n=>n.effectId==='release.touch')?'护符':shells[0]);
  const stat=Object.keys(candidate.modifiers?.attributes??{})[0]??nodes.find(n=>n.effectId==='status.buff')?.params?.属性;
  const statNames={力量:'振力',身法:'轻身',体魄:'固体',悟性:'凝思',感知:'洞察',意志:'定心'};
  const theme=statNames[stat]??(p?(p.模式==='吸收'?`纳${elements[p.类型]?.[0]??p.类型}`:p.模式==='免疫'?`辟${elements[p.类型]?.[0]??p.类型}`:p.模式==='易伤'?`蚀${elements[p.类型]?.[0]??p.类型}`:`御${elements[p.类型]?.[0]??p.类型}`):entry.name.replace(/之衣|护身|之印|之伤|印$/u,''));
  const damage=nodes.find(n=>n.effectId==='payload.damage');
  const hiddenTheme=category==='暗器'&&damage?`${elements[damage.params?.类型]?.[0]??'魂'}纹`:null;
  const names=hiddenTheme?[`${hiddenTheme}${form}`,`凝${hiddenTheme}${form}`,`藏${hiddenTheme}${form}`]:[`${theme}${form}`,`${entry.names[1]}${form}`,`${entry.names[2]}${form}`];
  const named=distinctName(names[0],names,used,18),material=materials.find(m=>clean(m.displayName??m.name));
  const source=material?`取${clean(material.displayName??material.name).slice(0,16)}制成，`:'';
  const shapes=`${source}${form}${candidate.fixedForm?.appearance??({sword:'的剑脊挺直，刃线由护手向尖端收束。',dagger:'的短刃利落，柄尾留有系绳的小孔。',staff:'的杖身修长，顶端以纹饰环住核心。',gloves:'沿指节分段缝合，掌背纹理彼此呼应。',boots:'以柔韧内衬贴合足背，鞋口收束得整齐。',breastplate:'分片覆合于胸背，接缝留出活动余地。',necklace:'垂于细链末端，镶座托住中心的材料。',ring:'围成平整的指圈，戒面嵌着细小的材料。'}[candidate.fixedForm?.id]??'的纹理贴合外形，接合处打磨平整。')}`;
  return {candidateId:candidate.candidateId,name:named,description:shapes.slice(0,120),form:`${form}，${candidate.fixedForm?.kind??category}`};
 }
 const CONSUMABLE_FORMS=Object.freeze([
  {id:'pill-heal',name:'赤丸',kind:'丹药',appearance:'以赤色薄衣包住药芯，置于漆盒中，服用一枚便消耗一枚。'},
  {id:'pill-energy',name:'蓝丸',kind:'丹药',appearance:'药衣莹蓝，颗粒浑圆，收在小瓷罐中，按枚服用。'},
  {id:'pill-strength',name:'金丸',kind:'丹药',appearance:'凝成金色小粒，药衣干爽细密，锡盒护着易碎的边缘。'},
  {id:'pill-guard',name:'碧丸',kind:'丹药',appearance:'药衣呈柔和碧色，匀净的药芯收在小方盒中，按枚服用。'},
  {id:'pill-cleanse',name:'紫丸',kind:'丹药',appearance:'呈淡紫色，细密药衣包裹内芯，置于玻璃药盒中。'},
  {id:'pill',name:'素丸',kind:'丹药',appearance:'凝成乳白色圆丸，银色药盒将各枚妥善收拢。'},
  {id:'medicine-liquid',name:'药液',kind:'丹药',appearance:'澄清药液密封在瓷瓶中，按瓶施用。'},
  {id:'medicine-powder',name:'药粉',kind:'丹药',appearance:'细腻药粉封在蜡纸包中，按包施用。'},
  {id:'medicine-mist',name:'雾剂',kind:'丹药',appearance:'药剂封存在喷雾瓶中，一次释放全部所定剂量。'},
  {id:'needles',name:'飞针',kind:'暗器',appearance:'针体纤细，针尖与尾端在一条直线上，使用后不再回收。'},
  {id:'dart',name:'飞镖',kind:'暗器',appearance:'尖锋分出短翼，尾部留有小环，轻薄的轮廓适合藏携。'},
  {id:'throwingknife',name:'薄刃',kind:'暗器',appearance:'刃身短窄，握柄紧凑，锋线在尖端收拢，一次施用便耗尽。'},
  {id:'capsule',name:'散珠',kind:'暗器',appearance:'珠壳沿中线紧密扣合，将材料封在内腔，施用时一次释放。'},
 ].map(Object.freeze));
 function consumableFormOptions(candidate,category){
  const nodes=getNodes(candidate),has=id=>nodes.some(n=>n.effectId===id);
  if(category==='暗器')return (nodes.some(n=>/^target\.(cone|cluster|burst|aura)$/.test(n.effectId))?['capsule']:has('release.projectile')?(has('target.line')?['needles']:['needles','dart']):['throwingknife']).map(id=>CONSUMABLE_FORMS.find(f=>f.id===id));
  if(!['丹药','毒药'].includes(category))return [];
  if(candidate.medicine){globalThis.SoulAbilityContract.medicineContract(candidate.medicine);const form={液:'medicine-liquid',粉:'medicine-powder',雾:'medicine-mist'}[candidate.medicine.form];if(form)return [CONSUMABLE_FORMS.find(f=>f.id===form)];}
  const scored=new Map();
  for(const n of nodes){
   const id=['payload.heal','status.regeneration','payload.revive'].includes(n.effectId)?'pill-heal':n.effectId==='payload.soul_restore'?'pill-energy':n.effectId==='payload.restore'?(n.params?.生命模式==='无'?'pill-energy':'pill-heal'):['payload.cleanse','payload.dispel'].includes(n.effectId)?'pill-cleanse':['payload.shield','status.resistance_shift','status.status_guard','status.invulnerable'].includes(n.effectId)?'pill-guard':n.effectId==='status.buff'?(/防御|豁免/.test(n.params?.属性)?'pill-guard':'pill-strength'):n.effectId==='status.haste'?'pill-strength':null;
   if(id){let value=1;try{value=globalThis.SoulEffectCompiler.calculateNodeCost(n.effectId,n.params);}catch{}scored.set(id,(scored.get(id)??0)+value);}
  }
  const chosen=[...scored].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]??'pill';
  return [CONSUMABLE_FORMS.find(f=>f.id===chosen)];
 }
 function assignConsumableForms(candidates,category,seed=0){
  const used=new Set();return candidates.map((candidate,index)=>{
   const options=consumableFormOptions(candidate,category),fresh=options.filter(f=>!used.has(f.id)),pool=fresh.length?fresh:options;
   const form=pool[(Math.abs(Number(seed)) + index)%pool.length];if(!form)throw new Error('消耗品缺少适合实际用途的器型');used.add(form.id);
   return {...candidate,fixedForm:{...form}};
  });
 }
 function validateConsumableForm(candidate,category){
  const form=candidate?.fixedForm;
  if(!form||!consumableFormOptions(candidate,category).some(f=>Object.keys(f).length===Object.keys(form).length&&Object.keys(f).every(key=>f[key]===form[key])))throw new Error('丹药或暗器的固定器型与实际用途不符，请重新研发');
  return true;
 }
 const PRODUCT_FORMS=equipment.FORMS;
 function assignProductForms(candidates,concept='',excluded=[],seed=0){
   const result=equipment.assignForms(candidates,excluded,globalThis.SoulEffectCompiler.calculateNodeCost,concept,seed);
   if(!result)throw new Error('这些材料暂无其他不同方案，原作品保持不变');
   return result;
 }
 function validateProductForm(fixedForm,description,narrativeDescription=''){
  const allForms=[...PRODUCT_FORMS,...CONSUMABLE_FORMS];
  if(!allForms.some(f=>f.id===fixedForm?.id&&f.bodyGroup===fixedForm.bodyGroup&&f.name===fixedForm.name))throw new Error('成品缺少有效的固定形制');
  const namedForms=allForms.filter(form=>description.includes(form.name));
  if(namedForms.some(form=>form.id!==fixedForm.id))throw new Error(`成品形态必须保持${fixedForm.name}，不能改为其他器型`);
  if(!description.includes(fixedForm.name)&&!narrativeDescription.includes(fixedForm.name))throw new Error(`成品形态必须明确是${fixedForm.name}`);
  return description;
 }
 return Object.freeze({SKILL_DESCRIPTION_LIMIT:prose.descriptionLimit,skillNarrative,packageNarrative,productNarrative,distinctName,getNodes,bodyImage,PRODUCT_FORMS,CONSUMABLE_FORMS,consumableFormOptions,assignConsumableForms,validateConsumableForm,assignProductForms,validateProductForm});
});
