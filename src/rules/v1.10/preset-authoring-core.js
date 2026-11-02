(function(root,factory){const art=root?.SoulPresetArt??(typeof require==='function'?require('./preset-art-core.js'):null);const api=factory(art);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulPresetAuthoring=api;})(typeof globalThis!=='undefined'?globalThis:this,function(art){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v));
 const damage=(type='物理',dice=1,faces=6,bonus=0)=>['payload.damage',{类型:type,骰数:dice,骰面:faces,加值:bonus}];
 const self=nodes=>[['target.self',{}],...nodes];
 const melee=nodes=>[['release.melee',{}],['target.single',{阵营规则:'敌方'}],['check.physical_attack',{}],...nodes];
 const shot=nodes=>[['release.projectile',{距离区:3}],['target.single',{阵营规则:'敌方'}],['check.soul_attack',{}],...nodes];
 const save=(nodes,attribute='意志',release='release.projectile')=>[[release,release==='release.projectile'?{距离区:3}:{}],['target.single',{阵营规则:'敌方'}],['check.save',{属性:attribute,难度加值:0,成功效果:'无'}],...nodes];
 const area=(target,nodes,attribute='体魄',params={})=>[['release.projectile',{距离区:3}],[target,{阵营规则:'敌方',...params}],['check.save',{属性:attribute,难度加值:0,成功效果:'无'}],...nodes];
 const stat=(attribute,amount=1)=>['passive.equipment_stat',{属性:attribute,数值:amount}];
 const amplify=(type,amount=5)=>['passive.element_amplify',{类型:type,数值:amount}];
 const buff=(attribute,amount=1,turns=2)=>['status.buff',{属性:attribute,数值:amount,持续回合:turns}];
 const resistance=(type,mode='抗性',turns=2)=>['status.resistance_shift',{类型:type,模式:mode,...(turns?{持续回合:turns}:{})}];
 function entry(category,id,name,description,appearance,recipe,options={}){
  const canon=options.canonName,binding=art?.get(`preset:${id}`);if(!binding)throw Error(`精品预设缺少明确图像登记：preset:${id}`);
  return {id:`preset:${id}`,category,name,description,appearance,imagePrompt:`斗罗玄幻游戏精品插画；${appearance}；画面体现${description}；清晰轮廓，无文字，无现代UI。`,artId:binding.artId,artPath:binding.artPath,
   ...(options.identitySuffix?{identitySuffix:options.identitySuffix}:{}),catalogKind:'foundation',era:options.era??'斗罗大陆第一部时期',source:{kind:canon?'canon-adaptation':'original',reference:canon?(options.reference??'项目canon-arena-engine.js名称登记；官方系列人物目录对照'): '本项目原创登记配方',references:canon?[{url:options.reference??(canon==='九心海棠'?'https://dl.qidian.com/index.php/NewHome/dldl/strategy/id/220':canon==='冰碧帝皇蝎'?'https://dl.qidian.com/index.php/NewHome/dldl/strategy/id/133':canon==='邪火凤凰'?'https://dl.qidian.com/index.php/home/home/index.html':'https://dl.qidian.com/index.php/home/dldl/role'),scope:'核对原著名词或系列人物背景；不把授权手游的数值和技能规则当成小说原文。'}]:[],canonName:canon??null,adaptation:canon?'按本项目现有预算、年限和表达通道适配，不声称逐字复刻原著。':'原创机制与美术设计，不伪称原著。',note:options.sourceNote??'数值由正式编译器重新计价，名称与表现不赋予未登记权限。'},
   tags:[category,...(options.tags??[])],gates:{minimumYears:options.minimumYears??1,minimumRingOrdinal:options.minimumRingOrdinal??1,requiredAttributes:options.requiredAttributes??[],requiredChannels:options.requiredChannels??[],rarity:options.rarity??'常规'},recipe:clone(recipe)};
 }
 return Object.freeze({clone,damage,self,melee,shot,save,area,stat,amplify,buff,resistance,entry});
});
