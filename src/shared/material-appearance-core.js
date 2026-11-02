(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulMaterialAppearance=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const forms={serpent:'蛇鳞',dragon:'龙鳞',avian:'翎羽',feline:'兽皮',canine:'兽皮',bear:'兽皮',bovine:'角骨',equine:'兽骨',aquatic:'鳍骨',mollusk:'软骨',crustacean:'甲壳',insect:'甲壳',arachnid:'甲壳',humanoid:'骨片',tree:'木髓',grass:'草茎',flower:'花瓣',root:'根芯','seed-fruit':'种核','aquatic-plant':'叶脉','parasitic-plant':'藤芯','carnivorous-plant':'根芯',bryophyte:'苔纤维','other-plant':'植芯',plant:'植芯',vine:'藤芯',fungus:'菌盖'};
 const classes={'蛇类':'serpent','龙类':'dragon','鸟类':'avian','猫科':'feline','犬科':'canine','熊类':'bear','牛类':'bovine','马类':'equine','水生':'aquatic','甲壳水族':'crustacean','昆虫':'insect','蛛形':'arachnid','类人':'humanoid','木本':'tree','草本':'grass','花卉':'flower','根茎':'root','果实种子':'seed-fruit','水生植物':'aquatic-plant','寄生植物':'parasitic-plant','食肉植物':'carnivorous-plant','苔藓蕨类':'bryophyte','其他植物':'other-plant','植物':'plant','菌类':'fungus'};
 function part(value,humanize){const token=String(value??'').trim();if(token.startsWith('category.')&&forms[token.slice(9)])return forms[token.slice(9)];if(classes[token])return forms[classes[token]];if(token==='动物')return '兽骨片';return humanize(token,'魂质结晶')||'魂质结晶';}
 return Object.freeze({part});
});
