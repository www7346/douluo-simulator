(function attachSoulExpeditionEngine(root, factory) {
  const foundation = root?.SoulCombatFoundation ?? (typeof require === 'function' ? require('./foundation-core.js') : null);
  const effects = root?.SoulEffectCompiler ?? (typeof require === 'function' ? require('./effects-core.js') : null);
  const combat = root?.SoulCombatEngine ?? (typeof require === 'function' ? require('./combat-engine.js') : null);
  const cycle = root?.SoulCycleEngine ?? (typeof require === 'function' ? require('./cycle-engine.js') : null);
  const world = root?.SoulWorldEngine ?? (typeof require === 'function' ? require('./world-engine.js') : null);
  const arena = root?.SoulCanonArenaEngine ?? (typeof require === 'function' ? require('./canon-arena-engine.js') : null);
  const talents = root?.SoulTalentCore ?? (typeof require === 'function' ? require('./talent-core.js') : null);
  const narrative = root?.SoulNarrative ?? (typeof require === 'function' ? require('./narrative-core.js') : null);
  const loot = root?.SoulExpeditionLoot ?? (typeof require === 'function' ? require('./expedition-loot.js') : null);
  const abilities = root?.SoulAbilityContract ?? (typeof require === 'function' ? require('./ability-contract-core.js') : null);
  const controls=root?.SoulControlCore??(typeof require==='function'?require('./control-core.js'):null);
  const positions=root?.SoulScenePosition??(typeof require==='function'?require('../../shared/scene-position-core.js'):null);
  const logistics=root?.SoulCustodyLogistics??(typeof require==='function'?require('./custody-logistics-core.js'):null);
  const expeditions=root?.SoulExpeditionContext??(typeof require==='function'?require('../../shared/expedition-context-core.js'):null);
  const people=root?.SoulPersonCore??(typeof require==='function'?require('./person-core.js'):null);
  const social=root?.SoulWorldSocial??(typeof require==='function'?require('./world-social-core.js'):null);
  const custody=root?.SoulCustodyCore??(typeof require==='function'?require('./custody-core.js'):null);
  const api = factory(foundation, effects, combat, cycle, world, arena, talents, narrative, loot, abilities, controls,positions,logistics,expeditions,people,social,custody);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SoulExpeditionEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSoulExpeditionEngine(foundation, effects, combat, cycle, world, arena, talents, narrative, loot, abilities, controls,positions,logistics,expeditions,people,social,custody) {
  'use strict';

  if (!foundation || !effects || !combat || !cycle || !world) throw new Error('SoulExpeditionEngine requires the complete v1.10 engine stack');

  function canonArena() {
    const resolved = arena ?? (typeof globalThis !== 'undefined' ? globalThis.SoulCanonArenaEngine : null);
    if (!resolved) throw new Error('原著人物引擎尚未加载，无法建立本次护航');
    return resolved;
  }

  const VERSION = '2.2.0';
  const blueprintMaterials=globalThis.SoulBlueprintMaterials??(typeof require==='function'?require('./blueprint-material-allocation.js'):null);
  const presets=globalThis.SoulPresetCatalog??(typeof require==='function'?require('./preset-catalog-core.js'):null);
  const DUNGEON_ID = 'hunting-forest-expedition';
  const ENTRANCE_LOCATION_ID = 'loc-hunting-forest';
  const SHOP_ID = 'shop-hunting-supply';
  const WORKSHOP_ID = 'workshop-hunting-basic';
  const SERVICE_LOCATION_IDS = Object.freeze([ENTRANCE_LOCATION_ID, ...Object.values(world.LOCATION_TEMPLATES).filter(location => location.slots?.some(slot => slot.archetype === 'merchant' && slot.service !== false)).map(location => location.id)]);
  const LAYER_WIDTHS = Object.freeze([1, 2, 3, 3, 2, 1]);
  const LAYER_FACTORS = Object.freeze([1, 1.05, 1.10, 1.15, 1.20, 1.25]);
  const ROOM_FACTORS = Object.freeze({普通战斗: 1, 精英战斗: 1.5, 首领战斗: 2.25});
  const DIFFICULTIES = Object.freeze({
    outer: Object.freeze({id:'outer',dungeonId:DUNGEON_ID,name:'林缘猎区',baseRoomBudget:520,recommendedLevelMin:1,recommendedLevelMax:9,recommendedLevel:5,routeLayers:4}),
    inner: Object.freeze({id:'inner',dungeonId:DUNGEON_ID,name:'深林猎区',baseRoomBudget:980,recommendedLevelMin:10,recommendedLevelMax:29,recommendedLevel:19,routeLayers:6}),
    'star-outer-edge': Object.freeze({id:'star-outer-edge',dungeonId:'star-dou-outer-expedition',name:'外围兽径',baseRoomBudget:1450,recommendedLevelMin:20,recommendedLevelMax:34,recommendedLevel:27,routeLayers:6}),
    'star-outer-deep': Object.freeze({id:'star-outer-deep',dungeonId:'star-dou-outer-expedition',name:'外围深林',baseRoomBudget:2150,recommendedLevelMin:35,recommendedLevelMax:49,recommendedLevel:42,routeLayers:8}),
    'sunset-toxic': Object.freeze({id:'sunset-toxic',dungeonId:'sunset-forest-expedition',name:'毒雾林带',baseRoomBudget:2450,recommendedLevelMin:35,recommendedLevelMax:49,recommendedLevel:42,routeLayers:8}),
    'sunset-deep': Object.freeze({id:'sunset-deep',dungeonId:'sunset-forest-expedition',name:'落日深处',baseRoomBudget:3300,recommendedLevelMin:50,recommendedLevelMax:69,recommendedLevel:59,routeLayers:8}),
    'blue-silver-growth': Object.freeze({id:'blue-silver-growth',dungeonId:'blue-silver-forest-expedition',name:'繁茂林带',baseRoomBudget:3200,recommendedLevelMin:50,recommendedLevelMax:69,recommendedLevel:59,routeLayers:9}),
    'blue-silver-ancient': Object.freeze({id:'blue-silver-ancient',dungeonId:'blue-silver-forest-expedition',name:'王者林地',baseRoomBudget:4400,recommendedLevelMin:70,recommendedLevelMax:84,recommendedLevel:77,routeLayers:10}),
    'star-inner-hunt': Object.freeze({id:'star-inner-hunt',dungeonId:'star-dou-inner-expedition',name:'密林猎区',baseRoomBudget:3900,recommendedLevelMin:55,recommendedLevelMax:74,recommendedLevel:64,routeLayers:10}),
    'star-inner-apex': Object.freeze({id:'star-inner-apex',dungeonId:'star-dou-inner-expedition',name:'捕食者腹地',baseRoomBudget:5250,recommendedLevelMin:75,recommendedLevelMax:94,recommendedLevel:84,routeLayers:11}),
    'hell-road': Object.freeze({id:'hell-road',dungeonId:'hell-road-expedition',name:'地狱路',baseRoomBudget:4300,recommendedLevelMin:60,recommendedLevelMax:89,recommendedLevel:74,routeLayers:9}),
    'ring-sea-current': Object.freeze({id:'ring-sea-current',dungeonId:'ring-sea-expedition',name:'环海潮线',baseRoomBudget:4200,recommendedLevelMin:65,recommendedLevelMax:79,recommendedLevel:72,routeLayers:10}),
    'ring-sea-deep': Object.freeze({id:'ring-sea-deep',dungeonId:'ring-sea-expedition',name:'深潮环域',baseRoomBudget:5450,recommendedLevelMin:80,recommendedLevelMax:94,recommendedLevel:87,routeLayers:11}),
    'star-lake-core': Object.freeze({id:'star-lake-core',dungeonId:'star-lake-expedition',name:'核心湖岸',baseRoomBudget:5750,recommendedLevelMin:85,recommendedLevelMax:99,recommendedLevel:92,routeLayers:12}),
    'orca-pack': Object.freeze({id:'orca-pack',dungeonId:'evil-orca-sea-expedition',name:'虎鲸猎群',baseRoomBudget:5700,recommendedLevelMin:85,recommendedLevelMax:92,recommendedLevel:88,routeLayers:12}),
    'orca-abyss': Object.freeze({id:'orca-abyss',dungeonId:'evil-orca-sea-expedition',name:'虎鲸深猎区',baseRoomBudget:6900,recommendedLevelMin:93,recommendedLevelMax:99,recommendedLevel:96,routeLayers:12}),
    'demon-whale-deep': Object.freeze({id:'demon-whale-deep',dungeonId:'demon-whale-sea-expedition',name:'魔鲸深海',baseRoomBudget:7800,recommendedLevelMin:95,recommendedLevelMax:99,recommendedLevel:97,routeLayers:14})
  });
  // Ecology is selected before construction allowance; party wealth never scales enemies.
  const ENCOUNTER_ECOLOGY = Object.freeze({
    'outer': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([10,100]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([100,250]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([250,600]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'inner': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([100,500]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([500,1500]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([1500,5000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'star-outer-edge': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([300,1200]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([1200,3000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([3000,7000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'star-outer-deep': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([1500,5000]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([5000,10000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([10000,18000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'sunset-toxic': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([1500,4500]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([4500,9000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([9000,16000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'sunset-deep': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([5000,14000]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([14000,25000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([25000,40000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'blue-silver-growth': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([4000,12000]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([12000,22000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([22000,35000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'blue-silver-ancient': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([20000,40000]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([40000,65000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([65000,100000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'star-inner-hunt': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([8000,18000]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([18000,32000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([32000,50000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'star-inner-apex': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([25000,50000]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([50000,80000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([80000,120000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'hell-road': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([10000,25000]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([25000,45000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([45000,70000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'ring-sea-current': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([12000,28000]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([28000,50000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([50000,80000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'ring-sea-deep': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([30000,60000]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([60000,90000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([90000,140000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'star-lake-core': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([40000,75000]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([75000,110000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([110000,180000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'orca-pack': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([40000,70000]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([70000,100000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([100000,150000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'orca-abyss': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([70000,110000]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([110000,160000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([160000,250000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
    'demon-whale-deep': Object.freeze({'普通战斗':Object.freeze({years:Object.freeze([100000,180000]),count:Object.freeze([1,2]),maxBloodlinePoints:30}),'精英战斗':Object.freeze({years:Object.freeze([180000,350000]),count:Object.freeze([1,2]),maxBloodlinePoints:45}),'首领战斗':Object.freeze({years:Object.freeze([350000,900000]),count:Object.freeze([1,1]),maxBloodlinePoints:60})}),
  });
  const WILD_CHANNELS=Object.freeze(['channel.melee','channel.projectile','channel.breath','channel.entangle','channel.poison','channel.burn','channel.freeze','channel.armor_break','channel.shield','channel.heal','channel.buff','channel.movement','channel.sensory','channel.area-shaping','channel.summon','channel.repair','channel.fabricate','channel.hit-interference','channel.resistance','channel.absorption','channel.status-guard']);
  const ECOLOGY_PROFILES = Object.freeze({
    hunting:Object.freeze({
      biologicalCategoryIds:Object.freeze(['category.serpent','category.canine','category.feline','category.avian','category.insect','category.grass','category.vine','category.tree']),
      anatomyCategoryIds:Object.freeze(['category.skin','category.hair','category.limb','category.organ','category.bone']),
      attributeIds:Object.freeze(['attribute.wind','attribute.wood','attribute.toxic-corrosion','attribute.life','attribute.earth','attribute.yin','attribute.yang','attribute.lust']),
      ecologyTags:Object.freeze(['圈养林地','灌木层','林间空地','浅水洼'])
    }),
    starOuter:Object.freeze({
      biologicalCategoryIds:Object.freeze(['category.serpent','category.arachnid','category.feline','category.canine','category.avian','category.bear','category.insect','category.tree','category.vine']),
      anatomyCategoryIds:Object.freeze(['category.skin','category.hair','category.limb','category.nervous','category.organ','category.bone']),
      attributeIds:Object.freeze(['attribute.wind','attribute.toxic-corrosion','attribute.dark','attribute.earth','attribute.life','attribute.wood','attribute.yin','attribute.lust']),
      ecologyTags:Object.freeze(['复合森林','林冠层','腐殖层','兽径'])
    }),
    sunset:Object.freeze({
      biologicalCategoryIds:Object.freeze(['category.serpent','category.insect','category.arachnid','category.crustacean','category.fungus','category.carnivorous-plant']),
      anatomyCategoryIds:Object.freeze(['category.skin','category.organ','category.nervous','category.blood','category.bone']),
      attributeIds:Object.freeze(['attribute.toxic-corrosion','attribute.fire','attribute.earth','attribute.dark','attribute.life','attribute.yin','attribute.yang']),
      ecologyTags:Object.freeze(['毒雾林带','温热地脉','腐殖湿地','毒材共生'])
    }),
    blueSilver:Object.freeze({
      biologicalCategoryIds:Object.freeze(['category.grass','category.vine','category.tree','category.root','category.flower','category.aquatic-plant','category.parasitic-plant','category.fungus']),
      anatomyCategoryIds:Object.freeze(['category.skin','category.organ','category.symbiote','category.blood','category.bone']),
      attributeIds:Object.freeze(['attribute.wood','attribute.life','attribute.toxic-corrosion','attribute.earth','attribute.mind','attribute.soul','attribute.yang','attribute.lust']),
      ecologyTags:Object.freeze(['蓝银群落','根网层','林下共生','湿润草甸'])
    }),
    starInner:Object.freeze({
      biologicalCategoryIds:Object.freeze(['category.arachnid','category.feline','category.canine','category.bear','category.dragon','category.serpent','category.humanoid']),
      anatomyCategoryIds:Object.freeze(['category.skin','category.hair','category.limb','category.nervous','category.organ','category.bone']),
      attributeIds:Object.freeze(['attribute.dark','attribute.toxic-corrosion','attribute.earth','attribute.destruction','attribute.wind','attribute.mind','attribute.soul','attribute.yin']),
      ecologyTags:Object.freeze(['高阶捕食区','密林阴影','领地争夺','古木断层'])
    }),
    hellRoad:Object.freeze({
      biologicalCategoryIds:Object.freeze(['category.avian','category.serpent','category.insect','category.arachnid']),
      anatomyCategoryIds:Object.freeze(['category.skin','category.blood','category.organ','category.bone','category.nervous']),
      attributeIds:Object.freeze(['attribute.dark','attribute.fire','attribute.death','attribute.toxic-corrosion','attribute.yin','attribute.yang']),
      ecologyTags:Object.freeze(['地下险路','血池蒸汽','狭窄岩桥','高温洞窟'])
    }),
    ringSea:Object.freeze({
      biologicalCategoryIds:Object.freeze(['category.aquatic','category.mollusk','category.crustacean','category.serpent','category.aquatic-plant']),
      anatomyCategoryIds:Object.freeze(['category.skin','category.limb','category.organ','category.bone','category.nervous']),
      attributeIds:Object.freeze(['attribute.water','attribute.wind','attribute.mind','attribute.soul','attribute.dark','attribute.ice','attribute.yin','attribute.lust']),
      ecologyTags:Object.freeze(['环岛海域','潮汐带','珊瑚坡','深水环流'])
    }),
    starLake:Object.freeze({
      biologicalCategoryIds:Object.freeze(['category.aquatic','category.serpent','category.bear','category.humanoid','category.tree','category.aquatic-plant']),
      anatomyCategoryIds:Object.freeze(['category.skin','category.hair','category.limb','category.organ','category.bone']),
      attributeIds:Object.freeze(['attribute.water','attribute.life','attribute.earth','attribute.wood','attribute.mind','attribute.soul','attribute.yang','attribute.lust']),
      ecologyTags:Object.freeze(['核心湖岸','古木水岸','高密度生命场','湖底断层'])
    }),
    evilOrca:Object.freeze({
      biologicalCategoryIds:Object.freeze(['category.aquatic','category.serpent','category.crustacean']),
      anatomyCategoryIds:Object.freeze(['category.skin','category.organ','category.blood','category.bone','category.nervous']),
      attributeIds:Object.freeze(['attribute.water','attribute.dark','attribute.destruction','attribute.wind','attribute.yin']),
      ecologyTags:Object.freeze(['猎群海域','血腥洋流','深水包围','掠食迁徙'])
    }),
    demonWhale:Object.freeze({
      biologicalCategoryIds:Object.freeze(['category.aquatic','category.mollusk','category.crustacean','category.dragon']),
      anatomyCategoryIds:Object.freeze(['category.skin','category.organ','category.blood','category.bone','category.nervous']),
      attributeIds:Object.freeze(['attribute.water','attribute.dark','attribute.destruction','attribute.mind','attribute.soul','attribute.space','attribute.yin','attribute.yang']),
      ecologyTags:Object.freeze(['极深海域','深海重压','无光层','巨兽迁徙带'])
    })
  });

  const DUNGEON_PROFILES = Object.freeze({
    [DUNGEON_ID]: Object.freeze({id:DUNGEON_ID,name:'猎魂森林',locationId:'loc-hunting-forest',theme:'verdant',regionLabel:'圈养林地',summary:'围栏与巡守者守护着这片猎区，初次猎魂的旅人常从林间小径启程。',environmentName:'林地遮蔽',environmentDescription:'路线较短，沿途有较多休整机会，适合熟悉战斗与采集。',rewardAttributes:['木','毒蚀','生命'],ecologyProfileId:'hunting',difficultyIds:['outer','inner'],combatRatio:.58,eliteRate:.12,campRate:.22,chestRate:.20,battlefield:{enemyX:76,spreadY:18,cover:'灌木'}}),
    'star-dou-outer-expedition': Object.freeze({id:'star-dou-outer-expedition',name:'星斗大森林外围',locationId:'loc-star-dou-outer',theme:'star-forest',regionLabel:'复合森林',summary:'生态种类丰富的广阔森林外围。',environmentName:'混合兽群',environmentDescription:'同一房间更容易出现不同属性和体型的魂兽，路线分支较多。',rewardAttributes:['风','毒蚀','物理'],ecologyProfileId:'starOuter',difficultyIds:['star-outer-edge','star-outer-deep'],combatRatio:.64,eliteRate:.18,campRate:.16,chestRate:.20,battlefield:{enemyX:78,spreadY:22,cover:'林木'}}),
    'sunset-forest-expedition': Object.freeze({id:'sunset-forest-expedition',name:'落日森林',locationId:'loc-sunset-forest',theme:'toxic',regionLabel:'毒雾森林',summary:'落日染红树梢，林下却终日弥漫薄雾。珍贵毒材与危险的猎食者藏在同一片阴影里。',environmentName:'林下毒雾',environmentDescription:'毒属性魂兽与毒材较常见，也能寻到火、土材料；休整地点稀少，出发前宜备足补给。',rewardAttributes:['毒蚀','火','土'],ecologyProfileId:'sunset',difficultyIds:['sunset-toxic','sunset-deep'],combatRatio:.68,eliteRate:.22,campRate:.10,chestRate:.18,battlefield:{enemyX:74,spreadY:25,cover:'毒雾'}}),
    'blue-silver-forest-expedition': Object.freeze({id:'blue-silver-forest-expedition',name:'蓝银森林',locationId:'loc-blue-silver-forest',theme:'blue-silver',regionLabel:'植物魂兽林',summary:'植物生态主导，木与生命材料稳定，缠绕型敌人密集。',environmentName:'蓝银繁茂',environmentDescription:'植物、缠绕与生命属性占主导；敌群偏耐久，路线中的材料房更多。',rewardAttributes:['木','生命','毒蚀'],ecologyProfileId:'blueSilver',difficultyIds:['blue-silver-growth','blue-silver-ancient'],combatRatio:.62,eliteRate:.20,campRate:.14,chestRate:.24,battlefield:{enemyX:72,spreadY:20,cover:'蓝银草丛'}}),
    'star-dou-inner-expedition': Object.freeze({id:'star-dou-inner-expedition',name:'星斗大森林混合区',locationId:'loc-star-dou-inner',theme:'predator',regionLabel:'高阶捕食区',summary:'万年魂兽在古木深处划分领地，踏入密林便可能成为更强猎手的目标。',environmentName:'捕食者腹地',environmentDescription:'强敌出没频繁，营地稀少；应留足应对连续战斗的生命与魂力。',rewardAttributes:['暗','毒蚀','土'],ecologyProfileId:'starInner',difficultyIds:['star-inner-hunt','star-inner-apex'],combatRatio:.74,eliteRate:.34,campRate:.07,chestRate:.14,battlefield:{enemyX:70,spreadY:28,cover:'密林阴影'}}),
    'hell-road-expedition': Object.freeze({id:'hell-road-expedition',name:'杀戮之都·地狱路',locationId:'loc-hell-road',theme:'hell-road',regionLabel:'地下险路',summary:'炽热的地下险路悬在血色深渊之上，振翼声与蛇鳞摩擦声从黑暗里逼近。',environmentName:'狭路高温',environmentDescription:'沿途没有营地，战斗接踵而至；必须依靠随身补给坚持到最后的守关之战。',rewardAttributes:['暗','火','生命'],ecologyProfileId:'hellRoad',difficultyIds:['hell-road'],combatRatio:.86,eliteRate:.38,campRate:0,chestRate:.10,battlefield:{enemyX:68,spreadY:14,cover:'无'}}),
    'ring-sea-expedition': Object.freeze({id:'ring-sea-expedition',name:'海神岛·环形海',locationId:'loc-ring-sea',theme:'ring-sea',regionLabel:'环岛海域',summary:'湛蓝潮水环抱海神岛，万年海兽循着洋流游弋，礁影间潜藏着试炼与收获。',environmentName:'潮汐站位',environmentDescription:'敌群站位分散，施放范围能力前应仔细确认落点与波及目标。',rewardAttributes:['水','风','灵魂'],ecologyProfileId:'ringSea',difficultyIds:['ring-sea-current','ring-sea-deep'],combatRatio:.70,eliteRate:.28,campRate:.08,chestRate:.16,battlefield:{enemyX:72,spreadY:31,cover:'海浪'}}),
    'star-lake-expedition': Object.freeze({id:'star-lake-expedition',name:'生命之湖',locationId:'loc-star-lake',theme:'life-lake',regionLabel:'核心湖岸',summary:'古老森林在湖边敞开，平静水面下流淌着浓郁生机，魂兽守望着这片核心之地。',environmentName:'水岸双域',environmentDescription:'水陆强敌交错出没，路线漫长，沿途休整机会很少。',rewardAttributes:['水','生命','土'],ecologyProfileId:'starLake',difficultyIds:['star-lake-core'],combatRatio:.76,eliteRate:.36,campRate:.06,chestRate:.12,battlefield:{enemyX:69,spreadY:27,cover:'湖岸林木'}}),
    'evil-orca-sea-expedition': Object.freeze({id:'evil-orca-sea-expedition',name:'邪魔虎鲸海域',locationId:'loc-evil-orca-sea',theme:'orca-sea',regionLabel:'虎鲸猎场',summary:'巨浪下的猎群始终保持着默契，万年海兽从不同方向截断闯入者的退路。',environmentName:'猎群包围',environmentDescription:'海洋魂兽可能结群出没；留意包围与集火，谨慎决定是否继续深入。',rewardAttributes:['水','暗','毁灭'],ecologyProfileId:'evilOrca',difficultyIds:['orca-pack','orca-abyss'],combatRatio:.80,eliteRate:.32,campRate:.04,chestRate:.10,battlefield:{enemyX:66,spreadY:34,cover:'巨浪'}}),
    'demon-whale-sea-expedition': Object.freeze({id:'demon-whale-sea-expedition',name:'魔鲸海域',locationId:'loc-demon-whale-sea',theme:'demon-whale',regionLabel:'极深海域',summary:'阳光无法穿透幽深海水，深海魂兽缓缓掠过，庞大的阴影足以遮蔽整片视野。',environmentName:'深海重压',environmentDescription:'深处可能出现巨型魂兽，航程漫长；高价值收获伴随着极高风险。',rewardAttributes:['水','暗','毁灭'],ecologyProfileId:'demonWhale',difficultyIds:['demon-whale-deep'],combatRatio:.82,eliteRate:.42,campRate:.03,chestRate:.08,battlefield:{enemyX:64,spreadY:38,cover:'深海暗流'}})
  });
  const LOCATION_DUNGEON_INDEX = Object.freeze(Object.fromEntries(Object.values(DUNGEON_PROFILES).map(profile => [profile.locationId, Object.freeze([profile.id])])));
  const SHOP_CATALOG = Object.freeze({
    ...Object.fromEntries([...new Set(Object.keys(globalThis.SoulCommerceDesigns.REGIONS).flatMap(loc=>globalThis.SoulCommerceDesigns.stockAt(loc).map(v=>v[0])))].map(templateId=>[templateId,Object.freeze({templateId,name:world.ITEM_TEMPLATES[templateId].name,value:world.calculateItemValue(templateId)})])),
    // The expedition API is attached after this factory returns, so stockAt cannot add its books yet.
    ...Object.fromEntries(Object.entries(world.ITEM_TEMPLATES).filter(([,template])=>template.payload?.blueprintBook).map(([templateId,template])=>[templateId,Object.freeze({templateId,name:template.name,value:world.calculateItemValue(templateId)})])),
    bandage: Object.freeze({templateId: 'bandage', name: '止血绷带', value: 45}),
    'basic-soul-tonic': Object.freeze({templateId: 'basic-soul-tonic', name: '基础回魂露', value: 80}),
    rope: Object.freeze({templateId: 'rope', name: '麻绳', value: 90}),
    'antidote-pill': Object.freeze({templateId: 'antidote-pill', name: '解毒丸', value: 120}),
    'dagger-hunting': Object.freeze({templateId: 'dagger-hunting', name: '短猎刀', value: 520})
  });
  const PRODUCT_CATEGORIES = Object.freeze(['丹药', '毒药', '暗器', '魂导器', '拘束器']);
  const RESEARCH_CHOICE_RULES = Object.freeze({baseCount: 2, minimum: 2, maximum: 4});
  const QUALITY_MULTIPLIERS = Object.freeze({受损: 0.65, 普通: 1, 优良: 1.35});
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  const clean = (value, fallback = '') => String(value ?? '').trim() || fallback;
  const plain = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const clamp = (value, minimum, maximum) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : minimum;
  };
  const integer = (value, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) => Math.round(clamp(value, minimum, maximum));
  const unique = values => [...new Set((Array.isArray(values) ? values : []).map(item => clean(item)).filter(Boolean))];

  function difficultyProfile(difficultyId) {
    const difficulty = DIFFICULTIES[clean(difficultyId)];
    if (!difficulty) throw new Error('未知副本难度');
    return difficulty;
  }

  function dungeonProfile(dungeonId) {
    const dungeon = DUNGEON_PROFILES[clean(dungeonId)];
    if (!dungeon) throw new Error('未知地图副本');
    return dungeon;
  }

  function dungeonsAtLocation(locationId) {
    return (LOCATION_DUNGEON_INDEX[clean(locationId)] ?? []).map(id => DUNGEON_PROFILES[id]);
  }

  function layerWidthsFor(totalLayersInput) {
    const totalLayers = integer(totalLayersInput, 4, 14);
    return Object.freeze(Array.from({length: totalLayers}, (_, index) => {
      if (index === 0 || index === totalLayers - 1) return 1;
      return index % 3 === 2 ? 3 : 2;
    }));
  }

  function layerFactor(layerInput, totalLayersInput) {
    const totalLayers = integer(totalLayersInput, 4, 14);
    const layer = integer(layerInput, 1, totalLayers);
    return Number((1 + (layer - 1) / Math.max(1, totalLayers - 1) * 0.25).toFixed(4));
  }

  function weightedPick(rng, values, weightKey = 'weight') {
    const source = Array.isArray(values) ? values.filter(Boolean) : [];
    if (!source.length) return undefined;
    const total = source.reduce((sum, item) => sum + Math.max(0, Number(item?.[weightKey] ?? 1)), 0);
    if (total <= 0) return rng.pick(source);
    let cursor = rng.next() * total;
    for (const item of source) {
      cursor -= Math.max(0, Number(item?.[weightKey] ?? 1));
      if (cursor <= 0) return item;
    }
    return source.at(-1);
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value ?? '')) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function makeRng(seed) {
    let state = stableHash(seed) || 0x9e3779b9;
    return {
      next() {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ value >>> 15, value | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
      },
      int(minimum, maximum) { return minimum + Math.floor(this.next() * (maximum - minimum + 1)); },
      pick(values) { return values?.length ? values[Math.floor(this.next() * values.length)] : undefined; },
      shuffle(values) {
        const output = [...values];
        for (let index = output.length - 1; index > 0; index -= 1) {
          const target = this.int(0, index);
          [output[index], output[target]] = [output[target], output[index]];
        }
        return output;
      }
    };
  }

  const attributeNames = Object.freeze(Object.values(foundation.MARTIAL_SOUL_CORE.ATTRIBUTE_REGISTRY).map(item => item.name));
  const categoryNames = Object.freeze(Object.values(foundation.MARTIAL_SOUL_CORE.CATEGORY_REGISTRY).filter(item => item.selectable !== false).map(item => item.name));
  const channelNames = Object.freeze(Object.values(foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY).map(item => item.name));

  const FIRST_HUNTING_ESCORT_DEFAULTS=Object.freeze({status:'unused',characterId:'yu-xiaogang-notting',consumedExpeditionId:'',rescueUsed:false});

  function emptyExpeditionCollections() {
    return {
      远征: {
        当前: null,
        sessions: {},
        companionContracts: [],
        历史: [],
        counters: {session: 0, batch: 0, blueprint: 0, research: 0},
        processedTransactions: {},
        配置: {
          dungeonIds: Object.keys(DUNGEON_PROFILES), locationDungeonIndex: clone(LOCATION_DUNGEON_INDEX), workshopId: WORKSHOP_ID,
          firstHuntingEscort:{...FIRST_HUNTING_ESCORT_DEFAULTS}
        }
      },
      材料库: {永久: {}, 入口暂存物品ID列表: []},
      研发: {蓝图: {}, 待处理: {}, 历史: []}
    };
  }

  function closeExpeditionEncounter(state, encounterIdInput, outcome = '战斗结束') {
    const encounterId = clean(encounterIdInput);
    if (!encounterId) return null;
    const encounter = state.遭遇?.列表?.[encounterId];
    if (!encounter) return null;
    cycle.reconcileEncounterBattle(state,encounter.battleId);
    encounter.状态 = '已结束';
    encounter.扩展 = plain(encounter.扩展) ? encounter.扩展 : {};
    encounter.扩展.结果 = {
      outcome:clean(outcome,'战斗结束'),
      battleId:clean(encounter.battleId),
      resolvedBy:'expedition-engine'
    };
    if (state.遭遇.当前遭遇ID === encounterId) state.遭遇.当前遭遇ID = '';
    return encounter;
  }

  function normalizeState(rawState) {
    let state = world.normalizeState(rawState);
    const defaults = emptyExpeditionCollections();
    state.远征 = plain(state.远征) ? state.远征 : defaults.远征;
    state.远征.当前 = plain(state.远征.当前) ? state.远征.当前 : null;
    state.远征.companionContracts = Array.isArray(state.远征.companionContracts) ? state.远征.companionContracts : [];
    state.远征.历史 = Array.isArray(state.远征.历史) ? state.远征.历史.slice(-30) : [];
    state.远征.counters = {...defaults.远征.counters, ...(plain(state.远征.counters) ? state.远征.counters : {})};
    state.远征.processedTransactions = plain(state.远征.processedTransactions) ? state.远征.processedTransactions : {};
    state.远征.配置 = {...defaults.远征.配置, ...(plain(state.远征.配置) ? state.远征.配置 : {})};
    state.远征.配置.firstHuntingEscort = {
      ...defaults.远征.配置.firstHuntingEscort,
      ...(plain(state.远征.配置.firstHuntingEscort) ? state.远征.配置.firstHuntingEscort : {})
    };
    state.材料库 = plain(state.材料库) ? state.材料库 : defaults.材料库;
    state.材料库.永久 = plain(state.材料库.永久) ? state.材料库.永久 : {};
    state.材料库.入口暂存物品ID列表 = unique(state.材料库.入口暂存物品ID列表);
    // Older saves kept overflow in the expedition container. Recover the actual entrance
    // from its extraction record; persist the location on the item before history ages out.
    for (const itemId of state.材料库.入口暂存物品ID列表) {
      const item = state.物品.实例[itemId];
      if (!item || item.payload?.storedAtLocationId) continue;
      const history = state.远征.历史.find(record => (record.stashedItemIds ?? []).includes(itemId));
      const sourceLocationId = state.容器.列表[item.containerId]?.locationId;
      const locationId = clean(history?.entranceLocationId,DUNGEON_PROFILES[history?.dungeonId]?.locationId ?? (world.LOCATION_TEMPLATES[sourceLocationId] ? sourceLocationId : ENTRANCE_LOCATION_ID));
      world.storeItem(state,itemId,state.角色.主控单位ID,locationId);
      if (item.payload?.safelyExtracted) item.legalOwnerEntityId = state.角色.主控单位ID;
    }
    state.研发 = plain(state.研发) ? state.研发 : defaults.研发;
    state.研发.蓝图 = plain(state.研发.蓝图) ? state.研发.蓝图 : {};
    state.研发.待处理 = plain(state.研发.待处理) ? state.研发.待处理 : {};
    state.研发.历史 = Array.isArray(state.研发.历史) ? state.研发.历史.slice(-50) : [];
    const danglingEncounterId = clean(state.遭遇?.当前遭遇ID);
    if (!state.远征.当前 && state.战斗?.状态 === '已结束' && danglingEncounterId.startsWith('encounter-expedition-')) {
      closeExpeditionEncounter(state,danglingEncounterId,state.战斗.扩展?.结果?.outcome || '战斗结束');
    }
    for (const wallet of Object.values(state.钱包.列表)) {
      wallet.gold = integer(wallet.gold ?? 0, 0);
    }
    return state;
  }

  function nextCounter(state, key) {
    state.远征.counters[key] = integer(state.远征.counters[key], 0) + 1;
    return state.远征.counters[key];
  }

  function beginTransaction(rawState, transactionId, type,request=null) {
    const invalid=validateExpeditionRecords(rawState);if(invalid.length)throw Error(invalid.join('；'));
    const state = normalizeState(rawState);
    if(typeof transactionId!=='string')throw Error('远征事务编号须为字符串');
    const id = clean(transactionId);
    if (!id) throw new Error(`${type}缺少唯一事务ID`);
    const prior = state.远征.processedTransactions[id];
    state.远征.commandRequests??={};
    const source=state.远征.commandRequests[id],requestHash=abilities.hash(request);
    if(prior&&(!source||source.type!==type||source.requestHash!==requestHash))throw Error('远征事务编号不能用于不同请求或实例');
    if(source&&!prior)throw Error('远征永久请求缺少原结算，不能复用编号');
    if(!prior)state.远征.commandRequests[id]={type,request:clone(request),requestHash};
    return prior ? {state, id, duplicate: true, receipt: clone(prior)} : {state, id, duplicate: false};
  }

  function isResearchReceipt(receipt){return ['research-materials-consumed','research-candidate-rerolled','research-naming-status','research-candidates-resolved','research-blueprint-created','blueprint-crafted'].includes(receipt?.type);}
  function commit(state, transactionId, type, receipt) {
    const finalReceipt = {...clone(receipt), id: transactionId, transactionType: type};
    state.远征.processedTransactions[transactionId] = clone(finalReceipt);
    if(isResearchReceipt(finalReceipt)){
      const person=state.人物.列表[finalReceipt.actorId],source=state.远征.commandRequests[transactionId];
      (person.扩展.研发事务??=[]).push({id:transactionId,requestHash:source.requestHash});
    }
    if(finalReceipt.blueprintId&&state.研发?.蓝图?.[finalReceipt.blueprintId]?.mechanics?.confirmedDesign&&['research-blueprint-created','blueprint-crafted'].includes(finalReceipt.type))world.refreshItemActions(state);
    state.系统.revision = integer(state.系统.revision, 0) + 1;
    state.系统.last_transaction_id = transactionId;
    state.事务 = {id: transactionId, 类型: foundation.TRANSACTION_TYPES.includes(type) ? type : '无', 状态: '已结算', 请求提交: false, 提案: {}, 结算: clone(finalReceipt)};
    state.历史.push({type: 'expedition-transaction', transactionId, transactionType: type, summary: clean(finalReceipt.summary)});
    state.历史 = state.历史.slice(-50);
    return {state, receipt: finalReceipt, idempotent: false};
  }

  function settleLootCommand(rawState,input,transactionId,kind){
    const actorId=input.actorId??rawState.角色.主控单位ID,request={...input,actorId},type=`expedition-loot-${kind}`;
    const tx=beginTransaction(rawState,transactionId,type,request);if(tx.duplicate)return {state:tx.state,receipt:tx.receipt,idempotent:true};
    const state=tx.state;
    if(kind==='loot'&&!DUNGEON_PROFILES[input.dungeonId])throw Error('请选择实际远征目的地');
    const receipt=kind==='respond'?loot.respondForActor(state,request,transactionId):kind==='collect'?{type:'loot-collected',actorId,lootDelivery:loot.completeResolution(state,input.resolutionId,transactionId,false,actorId)}:loot.proposeForActor(state,request,transactionId,kind);
    const errors=loot.validate(state);if(errors.length)throw Error(errors.join('；'));
    return commit(state,transactionId,type,receipt);
  }
  const proposeLootAgreement=(s,r,id)=>settleLootCommand(s,r,id,'loot');
  function distributeLoot(rawState,input,transactionId){
    const request={...input,actorId:input.actorId??rawState.角色.主控单位ID},type='expedition-loot-distribute',tx=beginTransaction(rawState,transactionId,type,request);
    if(tx.duplicate)return {state:tx.state,receipt:tx.receipt,idempotent:true};
    const delivery=loot.distribute(tx.state,request,transactionId),result=commit(tx.state,transactionId,type,{type:'loot-distributed',actorId:request.actorId,delivery,summary:'本次收获已按所选数量与归属分配。'});
    const errors=loot.validate(result.state);if(errors.length)throw Error(errors.join('；'));return result;
  }
  function settleReturnedLoot(result){
    const allocationId=result.receipt.allocation?.id,plan=allocationId&&loot.automaticPlan(result.state,allocationId);
    if(!plan||!plan.materials.length&&!plan.items.length)return result;
    const settled=distributeLoot(result.state,{...plan,returnId:result.receipt.id},`${result.receipt.id}:loot`);
    return {...result,state:settled.state,receipt:{...result.receipt,settledAllocation:clone(settled.state.远征.扩展.lootAllocations.find(a=>a.id===allocationId))}};
  }
  const proposeLootResolution=(s,r,id)=>settleLootCommand(s,r,id,'loot-resolution');
  const respondLoot=(s,r,id)=>settleLootCommand(s,r,id,'respond');
  function collectReturnedLoot(rawState,input,transactionId){
    const state=normalizeState(rawState),allocationId=String(input.allocationId??''),plan=loot.automaticPlan(state,allocationId);
    if(!plan||plan.actorId!==state.角色.主控单位ID)throw Error('没有本次可以收取的共同收获');
    const source=Object.values(state.远征.processedTransactions).find(r=>['expedition-cleared','expedition-safely-extracted','expedition-escort-rescue'].includes(r.type)&&r.allocation?.id===allocationId);
    if(!source)throw Error('没有找到本次返程收获');
    if(!plan.materials.length&&!plan.items.length)return {state,idempotent:true,receipt:{type:'loot-already-settled',summary:'本次收获已自动结算'}};
    return distributeLoot(state,{...plan,returnId:source.id},transactionId);
  }
  const collectLoot=(s,r,id)=>settleLootCommand(s,r,id,'collect');

  function roomBudget(difficultyId, layer, roomType) {
    difficultyProfile(difficultyId);
    const ecological=ENCOUNTER_ECOLOGY[difficultyId]?.[roomType];
    if(!ecological)return 0;
    return ecological.count[1]*(ecological.maxBloodlinePoints*20+foundation.BEAST_VALUE.growthQuote(ecological.years[1]).total);
  }

  function dangerGrade(budget) {
    if (budget <= 520) return '安稳';
    if (budget <= 950) return '警戒';
    if (budget <= 1650) return '危险';
    if (budget <= 2600) return '凶险';
    return '极危';
  }

  function roomIsCombat(type) { return ['普通战斗', '精英战斗', '首领战斗'].includes(type); }
  function roomIsRest(type) { return ['火堆', '宝箱'].includes(type); }

  function validateMap(map) {
    const errors = [];
    const difficulty = DIFFICULTIES[map?.difficultyId];
    const dungeon = DUNGEON_PROFILES[map?.dungeonId ?? difficulty?.dungeonId];
    if (!difficulty) errors.push('地图难度不存在');
    if (!dungeon) errors.push('地图副本不存在');
    const expectedLayers = difficulty?.routeLayers ?? 0;
    const widths = layerWidthsFor(Math.max(4, expectedLayers || 4));
    if (!map || map.layers?.length !== expectedLayers) errors.push(`地图必须有${expectedLayers}层`);
    const nodes = Object.values(map?.nodes ?? {});
    if(!nodes.some(node=>node.type==='宝箱'))errors.push('副本缺少可达宝箱房');
    const expectedNodes = widths.reduce((sum, width) => sum + width, 0);
    if (nodes.length !== expectedNodes) errors.push(`地图房间数必须为${expectedNodes}`);
    for (let layer = 1; layer <= expectedLayers; layer += 1) {
      const layerNodes = nodes.filter(node => node.layer === layer);
      if (layerNodes.length !== widths[layer - 1]) errors.push(`第${layer}层宽度错误`);
    }
    const first = nodes.find(node => node.layer === 1);
    const boss = nodes.find(node => node.layer === expectedLayers);
    if (first?.type !== '普通战斗') errors.push('第一层必须是普通战斗');
    if (boss?.type !== '首领战斗') errors.push(`第${expectedLayers}层必须是首领战斗`);
    for (let layer = 1; layer <= expectedLayers; layer += 1) if (!nodes.some(node => node.layer === layer && roomIsCombat(node.type))) errors.push(`第${layer}层缺少战斗房`);
    if (dungeon?.campRate === 0 && nodes.some(node => node.type === '火堆')) errors.push('该地域不允许生成火堆');
    for (const edge of map?.edges ?? []) {
      const from = map.nodes[edge.from];
      const to = map.nodes[edge.to];
      if (!from || !to || to.layer !== from.layer + 1) errors.push(`路线${edge.from}>${edge.to}不是相邻层`);
      if (from && to && roomIsRest(from.type) && roomIsRest(to.type)) errors.push(`路线${edge.from}>${edge.to}连接了连续休整房`);
    }
    for (const node of nodes) {
      if (node.layer > 1 && !(map.edges ?? []).some(edge => edge.to === node.id)) errors.push(`${node.id}不可到达`);
      if (node.layer < expectedLayers && !(map.edges ?? []).some(edge => edge.from === node.id)) errors.push(`${node.id}不能通向首领`);
    }
    if (first && boss) {
      const minimumCombatByNode = {[first.id]: 1};
      for (let layer = 2; layer <= expectedLayers; layer += 1) {
        for (const node of nodes.filter(item => item.layer === layer)) {
          const incoming = (map.edges ?? []).filter(edge => edge.to === node.id).map(edge => minimumCombatByNode[edge.from]).filter(Number.isFinite);
          if (!incoming.length) continue;
          minimumCombatByNode[node.id] = Math.min(...incoming) + (roomIsCombat(node.type) && node.type !== '首领战斗' ? 1 : 0);
        }
      }
      if ((minimumCombatByNode[boss.id] ?? 0) < 2) errors.push('存在少于两场战斗的首领路线');
    }
    return {pass: errors.length === 0, errors: unique(errors)};
  }

  function branchEdges(fromNodes,toNodes,rng) {
    const possibilities=[];
    function choose(index,edges){
      if(index===fromNodes.length){
        if(toNodes.some(to=>!edges.some(edge=>edge.to===to.id)))return;
        const crossing=edges.reduce((n,a,i)=>n+edges.slice(i+1).filter(b=>(a.fi-b.fi)*(a.ti-b.ti)<0).length,0);
        possibilities.push({edges,score:edges.length+crossing*4+rng.next()*.8});return;
      }
      const from=fromNodes[index],targets=toNodes.filter(to=>!(roomIsRest(from.type)&&roomIsRest(to.type)));
      for(let a=0;a<targets.length;a++){
        const edge=to=>({from:from.id,to:to.id,fi:from.index??1,ti:to.index??1});
        choose(index+1,[...edges,edge(targets[a])]);
        for(let b=a+1;b<targets.length;b++)choose(index+1,[...edges,edge(targets[a]),edge(targets[b])]);
      }
    }
    choose(0,[]);
    possibilities.sort((a,b)=>a.score-b.score);
    return possibilities[0]?.edges.map(({from,to})=>({from,to}))??[];
  }

  function generateMap(seed, difficultyId) {
    const difficulty = difficultyProfile(difficultyId);
    const dungeon = dungeonProfile(difficulty.dungeonId);
    const widths = layerWidthsFor(difficulty.routeLayers);
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const rng = makeRng(`${seed}:map:${attempt}`);
      const nodes = {
        'L1-N1': {id: 'L1-N1', layer: 1, index: 1, type: '普通战斗'},
        [`L${difficulty.routeLayers}-N1`]: {id: `L${difficulty.routeLayers}-N1`, layer: difficulty.routeLayers, index: 1, type: '首领战斗'}
      };
      for (let layer = 2; layer < difficulty.routeLayers; layer += 1) {
        const width = widths[layer - 1];
        for (let index = 1; index <= width; index += 1) {
          const id = `L${layer}-N${index}`;
          let type;
          if (index === 1) type = rng.next() < dungeon.eliteRate ? '精英战斗' : '普通战斗';
          else {
            const roll = rng.next();
            if (roll < dungeon.combatRatio) type = rng.next() < dungeon.eliteRate ? '精英战斗' : '普通战斗';
            else {
              const restTotal = Math.max(0.0001, dungeon.campRate + dungeon.chestRate);
              type = dungeon.campRate > 0 && rng.next() < dungeon.campRate / restTotal ? '火堆' : '宝箱';
            }
          }
          nodes[id] = {id, layer, index, type};
        }
      }
      if(['outer','inner'].includes(difficultyId))nodes[`L${difficulty.routeLayers-1}-N2`].type='火堆';
      if(!Object.values(nodes).some(node=>node.type==='宝箱'))nodes['L2-N2'].type='宝箱';
      for (const node of Object.values(nodes)) {
        node.seed = `${seed}:${node.id}`;
        node.budget = roomIsCombat(node.type) ? roomBudget(difficultyId, node.layer, node.type) : 0;
        node.danger = node.type==='首领战斗'?'极危':node.type==='精英战斗'?'危险':node.type==='普通战斗'?'警戒':'安稳';
        node.status = 'unvisited';
      }
      const edges = [];
      for (let layer = 1; layer < difficulty.routeLayers; layer += 1) {
        const fromNodes = Object.values(nodes).filter(node => node.layer === layer);
        const toNodes = Object.values(nodes).filter(node => node.layer === layer + 1);
        edges.push(...branchEdges(fromNodes,toNodes,rng));
      }
      const map = {seed, dungeonId:dungeon.id, difficultyId, totalLayers:difficulty.routeLayers, layers: widths.map((width, index) => ({layer: index + 1, nodeIds: Array.from({length: width}, (_, item) => `L${index + 1}-N${item + 1}`)})), nodes, edges};
      const validation = validateMap(map);
      if (validation.pass) return map;
    }
    throw new Error('同一种子下无法生成合法远征地图');
  }

  function ecologyProfile(dungeon) {
    const profile = ECOLOGY_PROFILES[dungeon.ecologyProfileId];
    if (!profile) throw new Error(`${dungeon.name}缺少地域生态组合配置`);
    return profile;
  }

  function ecologyBlueprint(seed,dungeon,difficulty,targetBudget,index,ecological) {
    const ecology=ecologyProfile(dungeon),value=foundation.BEAST_VALUE;
    const route=presets.routeFor(seed,'ecology',index);
    let presetFallback='';
    if(route==='preset'){
      const years=makeRng(`${seed}:${index}:age`).int(...ecological.years),unitId=`exp-${stableHash(`${seed}:${index}`).toString(16)}`,profileId=`profile-${unitId}`,skillSeed=`${seed}:${index}:preset`;
      const authored=presets.list({category:'魂兽'}).filter(e=>e.gates.minimumYears<=years).sort((a,b)=>stableHash(`${seed}:${index}:${a.id}`)-stableHash(`${seed}:${index}:${b.id}`));
      for(const entry of authored){
        const result=presets.compile(entry.id,{years,seed:skillSeed,id:profileId});if(!result.pass)continue;
        const {lineage,compilation}=result.mechanics,profile=foundation.normalizeSoulBeastProfile(result.mechanics.profile,unitId),compiled=lineage.compiled,quote=value.quote(lineage,years);
        if(lineage.points>ecological.maxBloodlinePoints||!lineage.definition.categories.some(id=>ecology.biologicalCategoryIds.includes(id))||lineage.definition.attributes.some(a=>!ecology.attributeIds.includes(a.id)))continue;
        const monsterValue=lineage.value+quote.growth.chassis+compilation.budget.spent;if(monsterValue>targetBudget)continue;
        return {unitId,profileId,years,lineage,compilation,speciesGrade:lineage.grade.value,effectiveLevel:quote.growth.level,monsterValue,presetId:entry.id,presetContractHash:abilities.hash({category:entry.category,recipe:entry.recipe}),artId:entry.artId,
          generation:{source:'精品付费血脉结构',presetId:entry.id,baseCategoryId:lineage.definition.categories[0],attributeIds:lineage.definition.attributes.map(a=>a.id)},speciesId:entry.recipe.speciesId,name:entry.name,description:entry.description,appearance:entry.appearance,ecology:entry.recipe.ecology??entry.description,skillSeed,
          categoryTags:profile.类别标签,anatomyTags:profile.解剖标签,speciesTraits:effects.sourceTraitsWithBridges(profile,compilation),mutations:[],integrity:1,affinitySpectrum:profile.属性谱,
          regionalOrigin:{dungeonId:dungeon.id,locationId:dungeon.locationId,regionLabel:dungeon.regionLabel,ecologyProfileId:dungeon.ecologyProfileId},
          valueBreakdown:{allocated:targetBudget,bloodline:lineage.value,bodyAndBaseAttack:quote.growth.chassis,baseAttackGraph:compilation.baselineCost,enhancementAllocated:quote.growth.enhancement,enhancementSpent:compilation.budget.spent,spent:monsterValue,unallocated:targetBudget-monsterValue}};
      }
      presetFallback='当前地域、年限及构造额度没有完整符合的精品魂兽，使用随机生态方案。';
    }
    let lastError;
    for(let attempt=0;attempt<16;attempt++){
      try{
        const lineage=value.generateLineage({seed:`${seed}:${index}:${attempt}`,categoryIds:ecology.biologicalCategoryIds,attributeIds:ecology.attributeIds,maxPoints:ecological.maxBloodlinePoints,channelIds:ecology.attributeIds.includes('attribute.lust')?[...WILD_CHANNELS,'channel.charm']:WILD_CHANNELS,includeTraits:false,...(attempt===15?{targetPoints:0}:{})});
        const ageRng=makeRng(`${seed}:${index}:age`);
        const years=ageRng.int(...ecological.years),quote=value.quote(lineage,years);
        const unitId=`exp-${stableHash(`${seed}:${index}`).toString(16)}`,profileId=`profile-${unitId}`;
        const nativeProfile={id:profileId,物种ID:lineage.definition.categories[0],年限:years,血脉:lineage,技能种子:`${seed}:${index}:${attempt}`};
        const compilation=effects.compileSoulBeastSkills(nativeProfile,effects.sourceBeastOptions(nativeProfile));
        const monsterValue=lineage.value+quote.growth.chassis+compilation.budget.spent;
        if(monsterValue>targetBudget)throw new Error('魂兽能力超出生态构造额度');
        const compiled=lineage.compiled;
        const primary=compiled.attributes[0].name;
        const anatomy=ecology.anatomyCategoryIds?.map(id=>foundation.MARTIAL_SOUL_CORE.CATEGORY_REGISTRY[id]?.name).filter(Boolean)??['血肉'];
        return {unitId,profileId,years,lineage,compilation,speciesGrade:lineage.grade.value,effectiveLevel:quote.growth.level,monsterValue,
          generation:{source:'付费血脉结构',...(presetFallback?{presetFallback}:{}),baseCategoryId:lineage.definition.categories[0],attributeIds:lineage.definition.attributes.map(item=>item.id)},speciesId:lineage.definition.categories[0],name:`待命名魂兽-${stableHash(unitId).toString(16)}`,skillSeed:`${seed}:${index}:${attempt}`,
          categoryTags:compiled.categories.map(item=>item.name),anatomyTags:[anatomy[stableHash(unitId)%anatomy.length]],speciesTraits:effects.sourceTraitsWithBridges({id:profileId,血脉:lineage,年限:years,技能种子:`${seed}:${index}:${attempt}`,种族特征:compiled.semanticTags},compilation),mutations:[],integrity:1,
          affinitySpectrum:{主属性:[primary],副属性:compiled.attributes.slice(1).map(item=>item.name),强度:Object.fromEntries(compiled.attributes.map(item=>[item.name,foundation.MARTIAL_SOUL_CORE.attributeStrength(item)]))},
          regionalOrigin:{dungeonId:dungeon.id,locationId:dungeon.locationId,regionLabel:dungeon.regionLabel,ecologyProfileId:dungeon.ecologyProfileId},
          valueBreakdown:{allocated:targetBudget,bloodline:lineage.value,bodyAndBaseAttack:quote.growth.chassis,baseAttackGraph:compilation.baselineCost,enhancementAllocated:quote.growth.enhancement,enhancementSpent:compilation.budget.spent,spent:monsterValue,unallocated:targetBudget-monsterValue}};
      }catch(error){lastError=error;}
    }
    throw new Error(`当前地域无法形成合法魂兽：${lastError?.message??'生成失败'}`);
  }

  function validateEcologyPresetBlueprint(beast,context=null){
    if(!beast.presetId){if(beast.presetContractHash||beast.generation?.presetId)throw Error('精品生态魂兽缺少原预设编号');return;}
    const entry=presets.get(beast.presetId),hash=entry&&abilities.hash({category:entry.category,recipe:entry.recipe});
    if(!entry||entry.category!=='魂兽'||beast.presetContractHash!==hash||beast.artId!==entry.artId||beast.speciesId!==entry.recipe.speciesId||beast.generation?.presetId!==entry.id)throw Error('精品生态魂兽与登记来源不符');
    const expected=cycle.matchSavedBeastPreset(entry.id,{years:beast.years,seed:beast.skillSeed,id:beast.profileId},cycle.beastCompilationHash(beast.compilation));
    if(!expected||abilities.hash(beast.lineage)!==abilities.hash(expected.mechanics.lineage))throw Error('精品生态魂兽未保留完整登记血脉与能力');
    const quote=foundation.BEAST_VALUE.quote(beast.lineage,beast.years),value=beast.lineage.value+quote.growth.chassis+beast.compilation.budget.spent;
    if(beast.monsterValue!==value||beast.valueBreakdown?.spent!==value||beast.valueBreakdown.allocated<value)throw Error('精品生态魂兽超出房间构造额度');
    const declared=foundation.normalizeSoulBeastProfile(expected.mechanics.profile,beast.unitId);
    if(abilities.hash(beast.categoryTags)!==abilities.hash(declared.类别标签)||!effects.sourceTraitsMatch({...declared,种族特征:beast.speciesTraits},declared.种族特征,expected.mechanics.compilation)||abilities.hash(beast.anatomyTags)!==abilities.hash(declared.解剖标签)||abilities.hash(beast.affinitySpectrum)!==abilities.hash(declared.属性谱))throw Error('精品生态魂兽标签或实际属性谱已改变');
    if(context){
      const {active,node,index}=context,difficulty=difficultyProfile(active.difficultyId),dungeon=dungeonProfile(difficulty.dungeonId),ecological=ENCOUNTER_ECOLOGY[active.difficultyId]?.[node.type],ecology=ecologyProfile(dungeon),seed=active.seed+':'+node.id,allocation=ecological&&Math.floor(roomBudget(active.difficultyId,node.layer,node.type)/ecological.count[1]);
      if(!ecological||presets.routeFor(seed,'ecology',index+1)!=='preset'||beast.years!==makeRng(seed+':'+(index+1)+':age').int(...ecological.years)||beast.lineage.points>ecological.maxBloodlinePoints||!beast.lineage.definition.categories.some(id=>ecology.biologicalCategoryIds.includes(id))||beast.lineage.definition.attributes.some(a=>!ecology.attributeIds.includes(a.id))||beast.valueBreakdown.allocated!==allocation)throw Error('精品生态魂兽与原地域、年限或房间额度不符');
    }
  }

  function channelForAttribute(attribute) {
    const hints = {火: '燃烧附着', 毒蚀: '毒蚀传递', 木: '缠绕拘束', 生命: '生命治疗', 雷: '神经麻痹', 冰: '冻结塑形', 空间: '空间跃迁', 灵魂: '灵魂干涉', 光: '净化驱散', 土: '护盾守护'};
    const hinted = hints[attribute];
    return channelNames.includes(hinted) ? hinted : channelNames.find(name => name.includes(attribute)) ?? '近战打击';
  }

  function freezeMaterialProfiles(beast, seed) {
    return world.beastMaterialProfiles({id:beast.unitId??'beast',名称:beast.name,血脉:beast.lineage,属性谱:beast.affinitySpectrum,类别标签:beast.categoryTags,解剖标签:beast.anatomyTags},seed);
  }

  function generatePreparedMap(seed,difficultyId) {
    const difficulty=difficultyProfile(difficultyId),dungeon=dungeonProfile(difficulty.dungeonId);
    const map=generateMap(seed,difficultyId);
    for(const node of Object.values(map.nodes)){
      if(roomIsCombat(node.type))node.encounter=generateRoster(node,difficultyId,seed);
      if(node.type==='宝箱')node.chest=chestProfiles({seed,difficultyId,dungeonId:dungeon.id},{nodeId:node.id,layer:node.layer});
    }
    const validation=validateMap(map);if(!validation.pass)throw new Error(validation.errors.join('；'));
    return map;
  }

  function previewBeastSkillSlots(beast) {
    return beast.compilation.skills.map((skill,index)=>({id:skill.id,index,kind:index===0?'ordinary':'skill',name:skill.name,effectIds:skill.effectGraph.nodes.map(node=>node.effectId),effectGraph:clone(skill.effectGraph),effectParams:skill.effectGraph.nodes.map(node=>({effectId:node.effectId,params:clone(node.params)})),outputScale:1,soulPowerCost:skill.soulPowerCost,soulPowerCostRate:skill.soulPowerCostRate,immutableHash:skill.immutableHash}));
  }

  function roomNarrativeRequest(active, node, generated) {
    const dungeon = dungeonProfile(active.dungeonId);
    const beasts = generated.roster.map(beast => ({
      unitId:beast.unitId,...(beast.presetId?{presetId:beast.presetId}:{}),years:beast.years,bloodline:clone(beast.lineage.grade),lineageDefinition:clone(beast.lineage.definition),speciesGrade:beast.speciesGrade,effectiveLevel:beast.effectiveLevel,
      categoryTags:clone(beast.categoryTags),anatomyTags:clone(beast.anatomyTags),speciesTraits:beast.speciesTraits.filter(tag=>!tag.startsWith('bridge.')),
      affinitySpectrum:clone(beast.affinitySpectrum),regionalOrigin:clone(beast.regionalOrigin),skills:clone(beast.skillSlots),materials:clone(beast.materialProfiles)
    }));
    return {
      type:'procedural-ecology-narrative',version:1,expeditionId:active.id,nodeId:node.id,roomType:node.type,
      region:{dungeonId:dungeon.id,name:dungeon.name,label:dungeon.regionLabel,environment:dungeon.environmentDescription},
      constraints:{sceneTitleLength:[2,24],sceneDescriptionLength:[12,160],beastNameLength:[2,12],skillNameLength:[2,16],skillDescriptionLength:[8,narrative.SKILL_DESCRIPTION_LIMIT],descriptionLength:[12,120],uniqueNames:true,mechanicsImmutable:true},
      beasts,mechanicsHash:stableHash(JSON.stringify(beasts)).toString(16)
    };
  }

  function narrativeText(value,label,minimum,maximum) {
    const text = clean(value).replace(/\s+/gu,' ');
    if (text.length < minimum || text.length > maximum) throw new Error(`${label}长度必须为${minimum}至${maximum}字`);
    if (/[<>`]|\[[^\]]*\]\([^)]*\)/u.test(text)) throw new Error(`${label}不能包含代码、标签或链接`);
    return text;
  }

  function validateRoomNarrative(request, rawNarrative) {
    const entries = Array.isArray(rawNarrative?.beasts) ? rawNarrative.beasts : [];
    if (entries.length !== request.beasts.length) throw new Error('魂兽命名结果数量与冻结机械槽不一致');
    const byId = new Map(entries.map(item => [clean(item?.unitId),item]));
    const normalized = [];
    for (const frozen of request.beasts) {
      let item = byId.get(frozen.unitId);
      if (!item) throw new Error(`魂兽命名结果缺少单位${frozen.unitId}`);
      if(frozen.presetId){
        const entry=presets.get(frozen.presetId);
        item={...item,name:entry.name,description:entry.description,appearance:entry.appearance,ecology:entry.recipe.ecology??entry.description,skills:frozen.skills.map(slot=>({skillId:slot.id,name:slot.name,description:narrative.skillNarrative({effectGraph:{nodes:slot.effectParams}},entry.name).description}))};
      }
      const skillEntries = Array.isArray(item.skills) ? item.skills : [];
      if (skillEntries.length !== frozen.skills.length) throw new Error(`${frozen.unitId}的技能命名数量与冻结机械槽不一致`);
      const skillById = new Map(skillEntries.map(skill => [clean(skill?.skillId),skill]));
      const skills = frozen.skills.map(slot => {
        const skill = skillById.get(slot.id);
        if (!skill) throw new Error(`${frozen.unitId}缺少技能槽${slot.id}的命名`);
        return {
          skillId:slot.id,name:narrativeText(skill.name,'魂兽技能名',2,16),
          description:effects.validateDefenseNarrative(slot.effectParams,narrativeText(skill.description,'魂兽技能说明',8,narrative.SKILL_DESCRIPTION_LIMIT))
        };
      });
      let materials;
      if (Array.isArray(frozen.materials)) {
        const materialEntries=Array.isArray(item.materials)?item.materials:[];
        if (materialEntries.length!==frozen.materials.length) throw new Error('材料命名结果数量不一致');
        const materialById=new Map(materialEntries.map(material=>[clean(material?.materialId),material]));
        materials=frozen.materials.map(profile=>{
          const material=materialById.get(profile.id);
          if(!material)throw new Error(`材料命名结果缺少${profile.id}`);
          return {materialId:profile.id,name:narrativeText(material.name,'材料名',2,20),description:narrativeText(material.description,'材料介绍',8,80)};
        });
      }
      normalized.push({
        unitId:frozen.unitId,name:narrativeText(item.name,'魂兽名',2,12),
        description:narrativeText(item.description,'魂兽介绍',12,120),
        appearance:narrativeText(item.appearance,'魂兽外形',8,100),
        ecology:narrativeText(item.ecology,'魂兽生态',8,100),skills,...(materials?{materials}:{})
      });
    }
    if (new Set(normalized.filter(item=>!request.beasts.find(b=>b.unitId===item.unitId)?.presetId).map(item => item.name)).size !== normalized.filter(item=>!request.beasts.find(b=>b.unitId===item.unitId)?.presetId).length) throw new Error('同一房间的随机魂兽名称不能重复');
    return {
      type:'procedural-ecology-narrative',mechanicsHash:request.mechanicsHash,
      sceneTitle:narrativeText(rawNarrative?.sceneTitle,'房间标题',2,24),
      sceneDescription:narrativeText(rawNarrative?.sceneDescription,'房间叙事',12,160),
      beasts:normalized
    };
  }

  function deterministicNarrativeFixture(request) {
    const prefixes = {物理:'铁纹',金:'鎏锋',木:'青岚',水:'碧澜',火:'赤焰',土:'岩甲',风:'流岚',雷:'紫霆',冰:'霜华',光:'曜辉',暗:'幽影',毒蚀:'蚀雾',生命:'翠灵',死亡:'冥息',毁灭:'烬渊',灵魂:'灵瞳',精神:'心映',阴:'玄阴',阳:'曜阳',淫:'绯念',空间:'隙影',时间:'流光'};
    const forms = [['犬科','狼'],['猫科','豹'],['鸟','翼禽'],['鲸','巨鲸'],['鲨','鲨'],['蛇','灵蛇'],['蜥','岩蜥'],['龟','甲龟'],['虫','甲虫'],['鱼','鳞鱼'],['木本','灵木'],['树','灵木'],['藤','灵藤'],['植物','灵植']];
    const outlines = {狼:'低伏的身形与锐利的目光显出警觉',豹:'流畅的身形掩在明暗交界处',翼禽:'层叠的羽翼沿背脊收拢',巨鲸:'庞大的身躯带着水流留下的纹理',鲨:'流线般的身躯透出锋锐的轮廓',灵蛇:'修长的身躯盘绕成弧，鳞面明暗交错',岩蜥:'粗粝的背部与低伏的四肢贴近地面',甲龟:'厚重甲壳的纹路彼此交织',甲虫:'分节的甲壳折出细碎光泽',鳞鱼:'细密鳞片随身体起伏闪烁',灵木:'木质躯干向外舒展，根系交织成坚实的轮廓',灵藤:'柔韧的长藤彼此交错，末梢随动静轻颤',灵植:'枝叶舒展成层叠的轮廓'};
    const variants = ['苍','银','玄','赤'];
    const names = new Set();
    return {
      sceneTitle:`${request.region.label}·${request.roomType === '首领战斗' ? '深处的守望' : request.roomType === '精英战斗' ? '潜藏的凶影' : '兽息渐近'}`,
      sceneDescription:`深入${request.region.label}，若隐若现的魂力波动让你停下脚步。前方${request.beasts.length === 1 ? '一道身影逐渐清晰，它' : '数道身影彼此呼应，它们'}正注视着踏入这里的来客。`,
      beasts:request.beasts.map((beast,index) => {
        const primary = beast.affinitySpectrum?.主属性?.[0] ?? '物理';
        const tags = [...beast.categoryTags,...beast.anatomyTags,...beast.speciesTraits].join('、');
        const form = forms.find(([tag]) => tags.includes(tag))?.[1] ?? '灵兽';
        const baseName = `${prefixes[primary] ?? '斑纹'}${form}`;
        const name = names.has(baseName) ? `${variants[index % variants.length]}${baseName}` : baseName;
        names.add(name);
        const skillNames=new Set();
        return {unitId:beast.unitId,name,
          ...(Array.isArray(beast.materials)?{materials:beast.materials.map(profile=>{const part=foundation.MARTIAL_SOUL_CORE.materialAppearancePart(profile.appearancePart??profile.categories[0]);return {materialId:profile.id,name:`${name}·${part}`.slice(0,20),description:`来自${name}的${part}，保留着${primary}属性魂力留下的自然纹理。`.slice(0,80)};})}:{}),
          description:`栖居于${request.region.label}的${beast.years}年魂兽，体内流转着${primary}属性魂力。${outlines[form] ?? '它的气息随周围的动静起伏'}。`,
          appearance:`${outlines[form] ?? '身躯的纹理显出自然生长的痕迹'}，姿态随着来客的脚步轻轻调整。`,
          ecology:`出没于${request.region.label}，与周围环境相伴成长。靠近时可感到${primary}属性魂力的波动，观察它的姿态有助于判断下一步行动。`,
          skills:beast.skills.map(skill => {
            const label=narrative.skillNarrative({effectGraph:{nodes:skill.effectParams}},name);
            return {skillId:skill.id,name:narrative.distinctName(label.name,label.names,skillNames,16),description:label.description};
          })};
      })
    };
  }

  function generateRoster(node,difficultyId,sessionSeed,options={}) {
    const difficulty=difficultyProfile(difficultyId),dungeon=dungeonProfile(difficulty.dungeonId);
    const ecological=ENCOUNTER_ECOLOGY[difficultyId][node.type];
    if(!ecological)throw new Error('该房间没有战斗生态');
    const rng=makeRng(sessionSeed+':'+node.id+':roster');
    const count=rng.int(...ecological.count),budget=roomBudget(difficultyId,node.layer,node.type);
    const allocation=Math.floor(budget/ecological.count[1]);
    const roster=Array.from({length:count},(_,index)=>{
      const beast=ecologyBlueprint(sessionSeed+':'+node.id,dungeon,difficulty,allocation,index+1,ecological);
      beast.skillSlots=previewBeastSkillSlots(beast);beast.materialProfiles=freezeMaterialProfiles(beast,sessionSeed+':'+node.id+':'+index);
      return beast;
    });
    const spent=roster.reduce((sum,beast)=>sum+beast.monsterValue,0);
    return {budget,spent,residual:budget-spent,roster,ecology:clone(ecological)};
  }

  function playerContext(state,playerId=state.角色.主控单位ID) {
    const person = state.人物.列表[playerId];
    if (!playerId || !person) throw new Error('请先建立玩家角色');
    return {playerId, person, wallet: state.钱包.列表[person.walletId], inventory: state.容器.列表[person.inventoryContainerId], unit: state.战斗单位.列表[playerId]};
  }

  function activeExpedition(state,options={}) {
    const active=options.expeditionId?expeditions.byId(state,options.expeditionId):expeditions.forActor(state,options.actorId??state.角色.主控单位ID,{presentOnly:false});
    if(!active)throw Error('没有指定人物实际参与的远征');
    if(options.actorId!==undefined&&!expeditions.participantIds(active).includes(options.actorId))throw Error('行动者不属于指定远征');
    return active;
  }
  const expeditionOptions=active=>({expeditionId:active.id,actorId:active.leaderId});
  const expeditionBattle=(state,active)=>state.战斗?.id===active.currentRoom?.battleId?state.战斗:state.世界.backgroundBattles?.[active.currentRoom?.battleId];
  const foregroundExpedition=(state,active)=>expeditions.participantIds(active,{presentOnly:true}).includes(state.角色.主控单位ID);
  function assertExpeditionActor(state,active,actorId=active.leaderId,requirements=[]){
    people.assertAlive(state,actorId);
    const u=state.战斗单位.列表[actorId];
    if(!u||u.存活状态!=='存活'||u.资源.生命.当前<=0||expeditions.forActor(state,actorId)!==active)throw Error('人物已经失能或不在本次远征现场');
    const p=positions.positionOf(state,actorId);if(p.kind!=='location'||p.locationId!==active.entranceLocationId||p.sceneId!==`expedition:${active.id}:${active.currentNodeId}`)throw Error('人物不在本次远征实际房间');
    controls.assertAction(state,actorId,'requirements',{requirements});
  }
  function removeExpedition(state,active){if(state.远征.当前?.id===active.id)state.远征.当前=null;else delete state.远征.sessions[active.id];}
  function requireDungeonEntrance(state, dungeon,actorId=state.角色.主控单位ID) {
    const {person} = playerContext(state,actorId);
    const position=positions.positionOf(state,person.id);if(position.kind!=='location'||position.sceneId)throw Error('须先实际回到公共通道再进入副本');
    if (person.locationId !== dungeon.locationId) throw new Error(`必须位于${dungeon.name}入口地点`);
  }

  // Preview the same local services before and after a merchant's first trade.
  // Reading the map must not spawn people, stock or any other persistent state.
  function serviceAtLocation(state, locationId = state?.地图?.当前地点ID) {
    if (!SERVICE_LOCATION_IDS.includes(locationId)) return null;
    if(arguments.length<2){const id=state?.角色?.主控单位ID;if(!id)return null;const pos=positions.positionOf(state,id);if(pos.kind!=='location'||pos.sceneId||pos.locationId!==locationId)return null;}
    const accessible=person=>!person||person.status!=='dead'&&positions.positionOf(state,person.id).kind==='location'&&!positions.positionOf(state,person.id).sceneId&&person.locationId===locationId&&!world.personalActionBlockReason(state,{actorId:person.id})&&!logistics.busyReason(state,person.id)&&!globalThis.SoulRescueCore?.busyReason(state,person.id);
    if(locationId===ENTRANCE_LOCATION_ID&&!accessible(state.人物?.列表?.['merchant-hunting-supply']))return null;
    const location = world.LOCATION_TEMPLATES[locationId];
    if(locationId==='loc-tang-heaven-dou'){const shop=state.商店.列表['shop-tang-heaven-dou'];if(!shop||shop.status!=='open'||!accessible(state.人物.列表[shop.merchantId])||!accessible(state.人物.列表['tang-artisan-wei']))return null;return {...shop,workshopId:'workshop-loc-tang-heaven-dou',workshopName:'唐门天斗分号·暗器工坊',artisanId:'tang-artisan-wei'};}
    if (locationId === ENTRANCE_LOCATION_ID) return {id:SHOP_ID,name:'猎魂森林入口·猎魂补给铺',locationId,merchantId:'merchant-hunting-supply',workshopId:WORKSHOP_ID,workshopName:'猎魂森林入口·工坊',infinite:false};
    const slot = location.slots.find(entry => entry.archetype === 'merchant');
    const slotKey = `${locationId}:${slot.id}`;
    const merchant = Object.values(state?.人物?.列表 ?? {}).find(person => person.扩展?.slotKey === slotKey);
    const id = `shop-traveler-${locationId}`;
    const registered = state?.商店?.列表?.[id];
    if (!accessible(merchant)) return null;
    if (registered && registered.status !== 'open') return null;
    return {id,name:`${location.name}·旅人商行`,locationId,merchantId:merchant?.id ?? '',slotKey,workshopId:`workshop-${locationId}`,workshopName:`${location.name}·工坊`,infinite:false};
  }

  function requireLocalService(state, serviceName = '商行服务',actorId=state.角色.主控单位ID) {
    const block = world.worldActionBlockReason(state,{actorId});
    if (block) throw new Error(block);
    const {person} = playerContext(state,actorId);
    const service = serviceAtLocation(state,person.locationId);
    const position=positions.positionOf(state,person.id);if(position.kind!=='location'||position.sceneId)throw Error('须先实际回到公共通道再使用商行或工坊服务');
    if(actorId===state.角色.主控单位ID&&position.locationId!==state.地图.当前地点ID)throw Error('人物与当前实际地点不一致');
    if (!service || person.locationId !== service.locationId) throw new Error(`此地暂不能使用${serviceName}，请前往附近城镇或猎魂森林入口`);
    return service;
  }

  function ensureLocalService(state, serviceName,actorId=state.角色.主控单位ID) {
    const service=requireLocalService(state,serviceName,actorId);
    if(!state.商店.列表[service.id])throw Error('当地商店缺少初始库存档案');
    return service;
  }
  function supplyOffers(state,actorId=state.角色.主控单位ID){const loc=state.人物?.列表?.[actorId]?.locationId;return globalThis.SoulRegionalStock.offers(state,loc,world,actorId);}

  function pendingRingLoot(state,actorId=state.角色.主控单位ID) {
    const position=positions.positionOf(state,actorId);
    const active=expeditions.forActor(state,actorId);
    return Object.values(state.战利品.列表 ?? {}).find(loot => loot?.类型 === '魂环胚胎' && loot?.状态 === '待吸收' && !['opening-opportunity','ring-item'].includes(loot.扩展?.sourceSettlement?.kind)&&abilities.hash(loot.扩展?.origin?.position)===abilities.hash(position)&&(loot.扩展.condensedBy===actorId||active&&active.id===loot.扩展.origin.expeditionId||Object.values(state.魂环.待选择).some(p=>p.sourceLootId===loot.id&&p.playerId===actorId))) ?? null;
  }

  function availableNextIds(active) {
    if (!active.completedNodeIds.length) return ['L1-N1'];
    const last = active.completedNodeIds.at(-1);
    return active.map.edges.filter(edge => edge.from === last).map(edge => edge.to).filter(id => !active.completedNodeIds.includes(id));
  }

  const riskYearSamples=new Map();
  function teamReadiness(state,actorId=state.角色.主控单位ID) {
    const ids=[actorId,...(expeditions.forActor(state,actorId)?.companions??[]).filter(member=>member.active!==false).map(member=>member.unitId)];
    return ids.map(id=>{
      const unit=state.战斗单位.列表[id];
      if(!unit)return null;
      const sp=unit.资源.魂力;
      const skills=combat.listAvailableActions(state,id).filter(action=>action.effectSpecs?.some(([effect])=>['payload.heal','status.regeneration','payload.soul_restore','transform.martial_avatar','status.bind','status.stun'].includes(effect))).map(action=>({name:action.name,cost:action.soulPowerCost,lock:action.activationLock,available:action.available,reason:action.reason}));
      return {id,name:unit.名称,hp:{current:unit.资源.生命.当前,maximum:unit.资源.生命.最大},sp:{current:sp.当前,maximum:sp.最大},skills};
    }).filter(Boolean);
  }

  function previewExpeditionRisk(rawState, dungeonIdInput, difficultyIdInput,options={}) {
    const state = normalizeState(rawState);
    const difficulty = difficultyProfile(difficultyIdInput);
    const dungeon = dungeonProfile(clean(dungeonIdInput,difficulty.dungeonId));
    if (difficulty.dungeonId !== dungeon.id) throw new Error('所选难度不属于当前副本');
    const {playerId,person,unit} = playerContext(state,options.actorId);
    if(!unit||person.combatantId!==playerId)throw Error('远征领队需要本人的实际战斗单位');
    const level = integer(state.成长.列表[playerId]?.魂力等级 ?? unit?.派生?.有效等级 ?? 1,1,99);
    const martialSoulIds = state.成长.列表[playerId]?.武魂ID列表 ?? [];
    const ringCount = martialSoulIds.reduce((sum,id) => sum + (state.武魂.列表[id]?.魂环ID列表?.length ?? 0),0);
    const ringRange = {
      minimum:Math.max(0,Math.ceil(difficulty.recommendedLevelMin/10)-1),
      maximum:Math.max(0,Math.ceil(difficulty.recommendedLevelMax/10)-1)
    };
    const hp = {current:Number(unit?.资源?.生命?.当前 ?? 0),maximum:Math.max(1,Number(unit?.资源?.生命?.最大 ?? 1))};
    const sp = {current:Number(unit?.资源?.魂力?.当前 ?? 0),maximum:Math.max(1,Number(unit?.资源?.魂力?.最大 ?? 1))};
    const capacity = Math.max(0,Math.round(Number(unit?.派生?.魂环承载上限 ?? 0)));
    const equippedIds = Object.values(state.装备.配置[playerId]?.slots ?? {}).filter(Boolean).slice(0,world.EQUIPMENT_SLOTS.length);
    const equippedDevices = equippedIds.map(id => ({id,name:state.物品.实例[id]?.name ?? id,durability:state.物品.实例[id]?.durability ?? 0}));
    const middleLayer = Math.max(1,Math.ceil(difficulty.routeLayers/2));
    const budgets = {
      first:roomBudget(difficulty.id,1,'普通战斗'),
      normal:roomBudget(difficulty.id,middleLayer,'普通战斗'),
      boss:roomBudget(difficulty.id,difficulty.routeLayers,'首领战斗')
    };
    const range=values=>({minimum:values[0],maximum:values[1]});
    const roomReferences=Object.fromEntries([['normal','普通战斗'],['elite','精英战斗'],['boss','首领战斗']].map(([key,type])=>{
      const config=ENCOUNTER_ECOLOGY[difficulty.id][type];
      return [key,{years:range(config.years),levels:range(config.years.map(foundation.BEAST_VALUE.yearsLevel)),count:range(config.count),referenceOnly:false}];
    }));
    const ringYears={minimum:roomReferences.normal.years.minimum,maximum:roomReferences.boss.years.maximum,referenceOnly:false};
    const companionIds=expeditions.forActor(state,playerId)?.companions?.map(item=>item.unitId)??[];
    const team=[{name:unit.名称,level,hp,sp},...companionIds.map(id=>state.战斗单位.列表[id]).filter(Boolean).map(member=>({name:member.名称,level:member.派生.有效等级,hp:{current:member.资源.生命.当前,maximum:member.资源.生命.最大},sp:{current:member.资源.魂力.当前,maximum:member.资源.魂力.最大}}))];
    if(!expeditions.forActor(state,playerId)){
      const contracted=(state.远征.companionContracts??[]).filter(c=>(c.leaderId??state.角色.主控单位ID)===playerId);
      const entries=[...(playerId===state.角色.主控单位ID&&freeGuideAvailable(state,dungeon.id)?[{characterId:'yu-xiaogang-notting'}]:[]),...contracted.filter(item=>item.dungeonId===dungeon.id),...world.partyMembers(state,playerId).filter(p=>p.present&&(p.cooperationId?(p.allowTravel&&globalThis.SoulCooperationCore.permits(state,playerId,p.personId,'combat',dungeon.id)):(p.membership==='long-term'||p.dungeonId===dungeon.id))).map(p=>({characterId:p.personId}))];
      for(const item of entries){
        const record=canonArena().CHARACTER_CATALOG[item.characterId],id=companionUnitId(item.characterId),member=state.战斗单位.列表[id];
        if(member)team.push({name:state.人物.列表[id]?.name??member.名称,level:state.成长.列表[id]?.魂力等级??member.派生.有效等级,hp:{current:member.资源.生命.当前,maximum:member.资源.生命.最大},sp:{current:member.资源.魂力.当前,maximum:member.资源.魂力.最大},startsRested:false});
        else if(record)team.push({name:record.name,level:record.level,hp:null,sp:null,startsRested:true});
      }
    }
    const strongest=Math.max(...team.map(member=>member.level));
    const exploration=level<roomReferences.normal.levels.minimum&&team.length===1?'建议结伴探索':'谨慎探索，逐房判断';
    const bossChallenge=strongest<roomReferences.boss.levels.maximum?'首领危险，建议补强队伍':'具备挑战基础，仍需保留魂力';
    const endurance={guaranteedCamp:['outer','inner'].includes(difficulty.id),noCamp:dungeon.campRate===0,team,exploration,bossChallenge,readiness:teamReadiness(state,playerId)};
    const reasons = [];
    let score = 0;
    if (level < difficulty.recommendedLevelMin) { score += 3; reasons.push(`等级低于建议下限${difficulty.recommendedLevelMin}`); }
    else if (level > difficulty.recommendedLevelMax) reasons.push('等级高于本区域建议范围');
    else reasons.push('等级处于建议范围');
    if (capacity < ringYears.minimum) { reasons.push('常见魂环年限可能超过当前承载，请谨慎选择'); }
    else if (capacity < ringYears.maximum) { reasons.push('较强魂兽的魂环可能超过当前承载'); }
    else reasons.push('当前承载高于参考年限，吸收前仍需查看实际魂环');
    const hpRatio = hp.current/hp.maximum;
    const spRatio = sp.current/sp.maximum;
    if (hpRatio < .4) { score += 2; reasons.push('当前生命不足四成'); }
    else if (hpRatio < .75) { score += 1; reasons.push('当前生命未满四分之三'); }
    if (spRatio < .4) { score += 2; reasons.push('当前魂力不足四成'); }
    else if (spRatio < .75) { score += 1; reasons.push('当前魂力未满四分之三'); }
    if (!equippedDevices.length && difficulty.recommendedLevelMin >= 20) { score += 1; reasons.push('未装备永久魂导器'); }
    const riskBand = score >= 5 ? '高危' : strongest<roomReferences.boss.levels.maximum||score>=2 ? '谨慎深入' : '可探索';
    return {
      dungeonId:dungeon.id,dungeonName:dungeon.name,difficultyId:difficulty.id,difficultyName:difficulty.name,riskBand,reasons,
      player:{level,ringCount,recommendedLevel:{minimum:difficulty.recommendedLevelMin,maximum:difficulty.recommendedLevelMax},recommendedRingCount:ringRange,capacity,hp,sp},
      routeLayers:difficulty.routeLayers,equippedDevices,equipmentSlotsMaximum:world.EQUIPMENT_SLOTS.length,
      ringYears,roomReferences,budgets,endurance,blocking:false
    };
  }

  function firstEscort(active) { return active?.companions?.find(item => item.kind==='guide' && item.active); }
  const companionUnitId=characterId=>canonArena().CHARACTER_CATALOG[characterId]?canonArena().persistentCharacterId(characterId):characterId;
  function personalHireQuote(state,personId,actorId,dungeonId='') {
    const offer=state.人物.列表[personId]?.扩展?.雇佣议价?.[actorId];
    if(!offer||offer.source!=='personal'||offer.playerId!==actorId||offer.personId!==personId||offer.characterId!==personId
      ||dungeonId&&offer.dungeonId!==dungeonId||!DUNGEON_PROFILES[offer.dungeonId]||!Number.isSafeInteger(offer.fee)||offer.fee<1||offer.baseFee!==offer.fee)return null;
    const contracted=offer.status==='used'&&(state.远征.companionContracts??[]).some(c=>c.leaderId===actorId&&c.unitId===personId&&c.quoteId===offer.id);
    return contracted||offer.status==='offered'&&offer.day===state.世界.时间.day&&offer.locationId===positions.positionOf(state,actorId).locationId?offer:null;
  }
  function generatedHireEntry(state,personId,actorId=state.角色.主控单位ID,dungeonId='') {
    const person=state.人物.列表[personId],unit=state.战斗单位.列表[personId],level=state.成长.列表[personId]?.魂力等级;
    const service=world.NPC_ARCHETYPES[person?.扩展?.archetypeId]?.escort;
    if(person?.tier!=='full'||person.combatantId!==personId||unit?.单位种类!=='魂师NPC'||!Number.isSafeInteger(level)||level<1||level>99)return null;
    if(!service){const offer=personalHireQuote(state,personId,actorId,dungeonId);return offer?{characterId:personId,fee:offer.fee,role:'本次有偿同行',personalOfferId:offer.id}:null;}
    const referral=actorId===state.角色.主控单位ID?(state.世界.opening?.situations??[]).find(r=>r.id===person.扩展?.openingReferralId):null;
    const discount=referral?.status==='available'&&referral.benefit==='story'?referral.discountGold:0;
    return {characterId:personId,fee:service.fee-discount,role:service.role,...(referral?{referralId:referral.id,referralReason:referral.status==='active'?'请先履行开局约见':null}:{} )};
  }
  function ensureCompanion(state,characterId,actorId=state.角色.主控单位ID,dungeonId='') {
    if(canonArena().CHARACTER_CATALOG[characterId])return canonArena().ensurePersistentCharacter(state,characterId);
    if(!generatedHireEntry(state,characterId,actorId,dungeonId))throw new Error('同行人物缺少已登记的雇佣服务或完整档案');
    return {state,unitId:characterId};
  }
  function currentHireOffer(state,entry,dungeonId,playerId=state.角色.主控单位ID) {
    const personId=companionUnitId(entry.characterId);
    const offer=state.人物.列表[personId]?.扩展?.雇佣议价?.[playerId];
    if(entry.personalOfferId){const personal=personalHireQuote(state,personId,playerId,dungeonId);return personal?.status==='offered'&&personal.id===entry.personalOfferId?personal:null;}
    return offer&&offer.playerId===playerId&&offer.personId===personId&&offer.characterId===entry.characterId
      &&offer.status==='offered'&&offer.day===state.世界.时间.day&&offer.locationId===positions.positionOf(state,playerId).locationId
      &&offer.dungeonId===dungeonId&&offer.baseFee===entry.fee&&Number.isSafeInteger(offer.fee)
      &&offer.fee>=Math.max(1,Math.ceil(entry.fee*.9))&&offer.fee<=entry.fee?offer:null;
  }
  function freeGuideAvailable(state,dungeonId) {
    const stored=state.远征?.配置?.firstHuntingEscort,escort={...FIRST_HUNTING_ESCORT_DEFAULTS,...(plain(stored)?stored:{})};
    const guideId=companionUnitId('yu-xiaogang-notting'),guide=state.战斗单位.列表[guideId],person=state.人物.列表[guideId];
    if(person){const pos=positions.positionOf(state,guideId);if(pos.kind!=='location'||pos.sceneId||world.personalActionBlockReason(state,{actorId:guideId})||logistics.busyReason(state,guideId)||globalThis.SoulRescueCore?.busyReason(state,guideId))return false;}
    if((person?positions.positionOf(state,guideId).locationId:canonArena().worldCharacterLocation(state,'yu-xiaogang-notting'))!==DUNGEON_PROFILES[dungeonId]?.locationId||world.partyLeadersOf(state,guideId).length||world.occupiedCompanionIds(state,guideId).length)return false;
    return (!state.世界.opening?.background||state.世界.opening.background.config.background.id==='shrek-student')&&dungeonId===DUNGEON_ID && escort.status==='unused' && escort.enabled!==false
      && !canonArena().persistentCharacterConflict(state,'yu-xiaogang-notting')
      && (!guide||(guide.存活状态==='存活'&&guide.资源.生命.当前>0))
      && !world.occupiedCompanionIds(state).includes(companionUnitId('yu-xiaogang-notting'));
  }
  function chooseFreeGuide(rawState,options={},transactionId='choose-free-guide') {
    const guard=beginTransaction(rawState,transactionId,'选择首次护航');if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,block=world.worldActionBlockReason(state);if(block)throw new Error(block);
    if(state.世界.opening?.background&&state.世界.opening.background.config.background.id!=='shrek-student')throw Error('此背景没有大师首次护航资格');
    if(typeof options.enabled!=='boolean'||state.远征.配置.firstHuntingEscort.status!=='unused')throw new Error('首次护航已使用或选择无效');
    if(options.enabled&&world.occupiedCompanionIds(state).length>=3&&!world.occupiedCompanionIds(state).includes(companionUnitId('yu-xiaogang-notting')))throw new Error('队伍已满，不能另加免费护航');
    state.远征.配置.firstHuntingEscort.enabled=options.enabled;
    return commit(state,transactionId,'选择首次护航',{type:'guide-choice',enabled:options.enabled,summary:options.enabled?'启用首次猎魂免费护航；实际出发仍需大师可同行并有名额。':'已暂停首次免费护航；未消耗机会，可在使用前重新启用。'});
  }
  function hireActorReason(state,actorId){
    const position=positions.positionOf(state,actorId);
    return world.worldActionBlockReason(state,{actorId})||(position.kind!=='location'||position.sceneId?'请实际抵达公共雇佣服务处':'');
  }
  function hireMemberReason(state,actorId,memberId){
    const person=state.人物.列表[memberId],unit=state.战斗单位.列表[memberId];
    if(memberId===actorId)return '不能雇佣本人';
    if(!person||!positions.colocated(state,actorId,memberId))return '这位人物不在当前地点';
    if(person.status==='dead'||!unit||unit.存活状态!=='存活'||unit.资源.生命.当前<=0)return '这位同伴当前无法同行';
    return world.personalActionBlockReason(state,{actorId:memberId})||logistics.busyReason(state,memberId)||globalThis.SoulRescueCore?.busyReason(state,memberId)|| (expeditions.forActor(state,memberId,{presentOnly:false})?'对方仍有未结束的远征':(state.世界.npcPlans??[]).some(p=>p.ownerId===memberId&&['scheduled','travelling','waiting'].includes(p.status))?'对方另有未结束的行程':'');
  }
  function personalHireAvailability(state,personId,dungeonId,actorId=state.角色.主控单位ID){
    const person=state.人物.列表[personId],unit=state.战斗单位.列表[personId],level=state.成长.列表[personId]?.魂力等级;
    let reason=!DUNGEON_PROFILES[dungeonId]?'请选择实际猎魂目的地':hireActorReason(state,actorId)||hireMemberReason(state,actorId,personId);
    if(!reason&&(person?.tier!=='full'||person.combatantId!==personId||unit?.单位种类!=='魂师NPC'||!Number.isSafeInteger(level)||level<1||level>99))reason='对方尚无可用于同行的完整魂师档案';
    if(!reason)reason=globalThis.SoulInfluenceCore.voluntaryReason(state,personId)||world.partyOwnershipReason(state,actorId,personId);
    const occupied=world.occupiedCompanionIds(state,actorId),free=actorId===state.角色.主控单位ID&&freeGuideAvailable(state,dungeonId);
    if(!reason)reason=occupied.includes(personId)?'已在队伍中':unique([...occupied,...(free?[companionUnitId('yu-xiaogang-notting')]:[])]).length>=3?'队伍已满（最多三名同伴）':'';
    return {available:!reason,reason};
  }
  function personalOfferSource(state,offer){
    const record=state.人物.列表[offer.personId]?.扩展?.社交约定?.find(r=>r.id===offer.commitmentId);
    const answer=record?.events?.find(e=>e.status==='accepted'&&e.sourceId===offer.id);
    return record?.kind==='hire'&&record.personId===offer.personId&&record.playerId===offer.playerId&&record.dungeonId===offer.dungeonId
      &&record.locationId===offer.locationId&&record.dueDay===offer.day&&answer?.fee===offer.fee&&answer.quoteId===offer.id;
  }
  /** An independently accepted inquiry creates only a priced offer. Payment is a later player command. */
  function offerPersonalCompanion(rawState,options={},transactionId='personal-companion-offer'){
    const actorId=options.actorId??rawState.角色.主控单位ID,request={...options,actorId},guard=beginTransaction(rawState,transactionId,'本人同行报价',request);
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,person=state.人物.列表[options.personId],record=person?.扩展?.社交约定?.find(r=>r.id===options.commitmentId);
    const offer={id:transactionId,source:'personal',commitmentId:options.commitmentId,playerId:actorId,personId:options.personId,characterId:options.personId,
      dungeonId:record?.dungeonId,locationId:positions.positionOf(state,actorId).locationId,day:state.世界.时间.day,
      baseFee:options.fee,offeredFee:options.fee,fee:options.fee,currency:'gold',accepted:true,status:'offered',
      at:people.now(state),order:0,revision:state.系统.revision,time:clone(state.世界.时间)};
    if(!Number.isSafeInteger(offer.fee)||offer.fee<1||!personalOfferSource(state,offer))throw Error('本人报价须有对应询价和独立回应来源');
    const availability=personalHireAvailability(state,person.id,offer.dungeonId,actorId);if(!availability.available)throw Error(availability.reason);
    offer.order=people.nextEventOrder(state);person.扩展.雇佣议价??={};person.扩展.雇佣议价[actorId]=offer;
    (person.扩展.议价历史??=[]).push(clone(offer));
    return commit(state,transactionId,'本人同行报价',{type:'hire-negotiated',...clone(offer),summary:`${person.name}提出本次前往${dungeonProfile(offer.dungeonId).name}同行${offer.fee}金魂币的报价；当日原地点有效，尚未付款或入队。`});
  }
  function companionRoster(rawState,dungeonIdInput='',options={}) {
    const state=normalizeState(rawState);
    const actorId=options.actorId??state.角色.主控单位ID;
    const dungeonId=clean(dungeonIdInput,dungeonsAtLocation(positions.positionOf(state,actorId).locationId)[0]?.id??DUNGEON_ID);
    dungeonProfile(dungeonId);
    const person=state.人物.列表[actorId];
    const gold=Number(state.钱包.列表[person?.walletId]?.gold ?? 0);
    const contracts=state.远征.companionContracts.filter(c=>c.leaderId===actorId);
    const freeGuide=actorId===state.角色.主控单位ID&&freeGuideAvailable(state,dungeonId);
    const reason=hireActorReason(state,actorId);
    const members=world.partyMembers(state,actorId),occupied=world.occupiedCompanionIds(state,actorId),slots=unique([...occupied,...(freeGuide?[companionUnitId('yu-xiaogang-notting')]:[])]).map(id=>({id,name:state.人物.列表[id]?.name??'玉小刚',present:!!state.人物.列表[id]&&positions.colocated(state,id,actorId)}));
    return {actorId,gold,dungeonId,dungeonName:dungeonProfile(dungeonId).name,reason,freeGuide,guideChoice:actorId===state.角色.主控单位ID?clone(state.远征.配置.firstHuntingEscort):null,members,slots,contracts:clone(contracts),active:clone(expeditions.forActor(state,actorId)?.companions ?? []),maximum:3,
      roster:Object.values(state.人物.列表).filter(person=>positions.colocated(state,person.id,actorId)||contracts.some(c=>c.characterId===person.id)).map(person=>generatedHireEntry(state,person.id,actorId,dungeonId)).filter(Boolean).map(entry=>{
        const record=canonArena().worldCharacterRecord(entry.characterId)??state.人物.列表[entry.characterId];
        const hired=contracts.some(item=>item.characterId===entry.characterId);
        const unitId=companionUnitId(entry.characterId),unit=state.战斗单位.列表[unitId];
        const free=freeGuide && entry.characterId==='yu-xiaogang-notting';
        const locationId=state.人物.列表[unitId]?.locationId??record.locationId;
        const offer=currentHireOffer(state,entry,dungeonId,actorId);
        const blocked=reason || world.partyOwnershipReason(state,actorId,unitId) || entry.referralReason || hireMemberReason(state,actorId,unitId) || canonArena().persistentCharacterBlockReason(state,entry.characterId) || (hired||occupied.includes(unitId)?'已在队伍中':free?'本次首次猎魂免费同行':slots.length>=3?'队伍已满（最多三名同伴）':gold<(offer?.fee??entry.fee)?'金魂币不足':'');
        const souls=unit?Object.values(state.武魂.列表).filter(soul=>soul.持有者单位ID===unitId).map(soul=>soul.名称):(record.martialSouls??[]).map(soul=>typeof soul==='string'?soul:soul.name);
        const visual=record.扩展?.genericVisual;
        return {...entry,portrait:{id:record.id,name:record.name,kind:'resident',gender:record.gender,age:record.age,occupation:record.occupation,archetype:record.扩展?.archetypeId,扩展:{genericVisual:visual?{assetId:visual.assetId,gender:visual.gender,band:visual.band}:undefined,currentFigure:record.扩展?.currentFigure,currentAvatar:record.扩展?.currentAvatar,bodyIdentity:clone(record.扩展?.bodyIdentity)}},offer:offer?clone(offer):null,unitId:unit?unitId:null,name:state.人物.列表[unitId]?.name??record.name,level:state.成长.列表[unitId]?.魂力等级??record.level,soul:souls.filter(Boolean).join(' / '),hired,free,reason:blocked};
      })};
  }
  function prepareCompanionRoster(rawState,options={},transactionId='prepare-companion-roster') {
    const actorId=options.actorId??rawState.角色.主控单位ID,guard=beginTransaction(rawState,transactionId,'查看当地雇佣服务',{...options,actorId});
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,reason=hireActorReason(state,actorId);
    if(reason)throw new Error(reason);
    const personIds=world.ensureLocationCast(state,positions.positionOf(state,actorId).locationId,{includeRecruitment:true}).filter(id=>generatedHireEntry(state,id,actorId));
    return commit(state,transactionId,'查看当地雇佣服务',{type:'companion-roster-prepared',actorId,personIds,summary:'已找到当地可雇佣的向导。'});
  }
  function recordCompanionAgreement(state, companion, status, details={}) {
    const person=state.人物.列表[companion.unitId];
    if(!person)throw new Error('同行人物档案缺失');
    person.扩展??={};person.扩展.同行约定??=[];
    let agreement=person.扩展.同行约定.find(item=>item.id===companion.agreementId);
    if(!agreement){
      if(!['accepted','active'].includes(status))throw new Error('同行约定记录缺失');
      if(!state.人物.列表[companion.leaderId])throw Error('同行约定缺少实际领队');
      agreement={id:companion.agreementId,playerId:companion.leaderId,personId:person.id,characterId:companion.characterId,dungeonId:companion.dungeonId,fee:companion.fee,events:[]};
      person.扩展.同行约定.push(agreement);
    }
    agreement.status=status;
    agreement.events.push({status,revision:state.系统.revision,time:clone(state.世界.时间),...clone(details)});
    return agreement;
  }
  function detachAbilityCompanion(state,unitId,leaderId,departureRef,position,sourceId){for(const active of expeditions.instances(state).filter(a=>a.leaderId===leaderId)){const c=active.companions.find(c=>c.unitId===unitId&&c.active);if(!c)continue;c.active=false;recordCompanionAgreement(state,c,'departed',{expeditionId:active.id,position:clone(position),departureRef:clone(departureRef),sourceId,order:people.nextEventOrder(state)});}}
  function restoreAbilityCompanion(state,unitId,leaderId,arrivalRef,sourceId){const active=expeditions.forActor(state,leaderId),c=active?.companions.find(c=>c.unitId===unitId&&!c.active);if(!c)return;const record=state.人物.列表[unitId].扩展.同行约定.find(r=>r.id===c.agreementId),departed=record?.events.at(-1);globalThis.SoulCooperationCore.departureProof(state,unitId,c.agreementId,departed);if(departed.departureRef?.provider!==arrivalRef.provider)throw Error('原离场方式不能由本次能力恢复');const position=clone(positions.positionOf(state,leaderId));c.active=true;delete state.人物.列表[unitId].spaceId;c.bodyOutingRef=clone(arrivalRef);const event={expeditionId:active.id,position,arrivalRef:clone(arrivalRef),sourceId,order:people.nextEventOrder(state)};globalThis.SoulCombatDeployments.rejoinProof(state,unitId,leaderId,event,departed);recordCompanionAgreement(state,c,'active',event);}

  const HIRE_ESCROW_WALLET='wallet-expedition-hire-escrow';
  function settleHirePayment(state,contract,kind,sourceId,deathTrigger=null){
    const events=state.远征.hirePayments??=[],prior=events.filter(e=>e.agreementId===contract.agreementId);
    if(kind==='deposit'?prior.length:prior.length!==1||prior[0].kind!=='deposit')throw Error('雇佣预付款已经处理或缺少原付款');
    const payerId=contract.leaderId,payeeId=contract.unitId,amount=contract.fee;
    state.钱包.列表[HIRE_ESCROW_WALLET]??={id:HIRE_ESCROW_WALLET,ownerEntityId:'expedition-hire-escrow',gold:0,扩展:{type:'hire-escrow'}};
    const remains=kind==='refund'&&state.人物.列表[payerId].status==='dead'?state.战利品.遗骸列表[`remains-${payerId}`]:null;
    if(remains&&(remains.type!=='human-corpse'||remains.unitId!==payerId||remains.ownerEntityId!==payerId))throw Error('退款遗骸并非原雇主实际财产');
    const from=state.钱包.列表[kind==='deposit'?state.人物.列表[payerId].walletId:HIRE_ESCROW_WALLET],to=remains??state.钱包.列表[kind==='deposit'?HIRE_ESCROW_WALLET:state.人物.列表[kind==='release'?payeeId:payerId].walletId],toKey=remains?'coinGold':'gold';
    if(!Number.isSafeInteger(amount)||amount<=0||!from||!to||from.gold<amount||!Number.isSafeInteger(to[toKey]+amount))throw Error('实际雇佣付款不足或钱包无效');
    const event={id:`hire-payment:${sourceId}:${kind}:${contract.agreementId}`,sourceId,agreementId:contract.agreementId,kind,payerId,payeeId,amount,fromWalletId:from.id,toWalletId:remains?null:to.id,toRemainsId:remains?.id??null,fromBefore:from.gold,fromAfter:from.gold-amount,toBefore:to[toKey],toAfter:to[toKey]+amount,at:people.now(state),order:people.nextEventOrder(state),deathTrigger:clone(deathTrigger),...(kind==='deposit'?{contract:clone(contract)}:{})};
    from.gold-=amount;to[toKey]+=amount;events.push(event);return clone(event);
  }
  function reconcileHireDeath(state,personId,death){
    for(const c of [...(state.远征?.companionContracts??[])].filter(c=>[c.leaderId,c.unitId].includes(personId))){
      const sourceId=`hire-death:${death.id}:${c.agreementId}`,payment=settleHirePayment(state,c,'refund',sourceId,{personId,deathId:death.id});
      state.远征.companionContracts=state.远征.companionContracts.filter(r=>r.agreementId!==c.agreementId);
      recordCompanionAgreement(state,c,'cancelled',{refund:c.fee,sourceId,paymentId:payment.id,deathId:death.id});
    }
  }

  function validateHireOffers(state){
    const errors=[],seen=new Set();
    for(const p of Object.values(state.人物?.列表??{}))try{
      const history=p.扩展?.议价历史??[],current=p.扩展?.雇佣议价??{},latest=new Map();
      if(!Array.isArray(history)||!plain(current))throw Error('报价表');
      let lastOrder=0;
      for(const q of history){
        const source=state.远征?.commandRequests?.[q.id],receipt=state.远征?.processedTransactions?.[q.id],request=source?.request;
        if(seen.has(q.id)||q.personId!==p.id||q.characterId!==p.id||!state.人物.列表[q.playerId]||receipt?.type!=='hire-negotiated'||request?.actorId!==q.playerId||q.status!=='offered')throw Error('原报价事务');
        if(q.source==='personal'){
          if(source?.type!=='本人同行报价'||request.personId!==p.id||request.commitmentId!==q.commitmentId||request.fee!==q.fee||!personalOfferSource(state,q))throw Error('本人报价独立来源');
          if(!Number.isSafeInteger(q.fee)||q.fee<1||q.baseFee!==q.fee||q.offeredFee!==q.fee||q.accepted!==true)throw Error('本人实际报价');
        }else{
          if(q.source!==undefined||q.commitmentId!==undefined||source?.type!=='商议雇佣价格'||request.characterId!==p.id||request.offeredFee!==q.offeredFee||request.dungeonId!==undefined&&request.dungeonId!==q.dungeonId)throw Error('原议价事务');
          if(!Number.isSafeInteger(q.baseFee)||q.baseFee<1||!Number.isSafeInteger(q.offeredFee)||q.offeredFee<0||q.offeredFee>q.baseFee||q.fee!==Math.max(Math.ceil(q.baseFee*.9),q.offeredFee)||q.accepted!==(q.offeredFee>=Math.ceil(q.baseFee*.9)))throw Error('实际还价结果');
        }
        if(!Number.isSafeInteger(q.order)||q.order<=lastOrder||q.order>state.扩展.personEventSequence||!Number.isSafeInteger(q.at)||q.at>people.now(state)||q.day!==Math.floor(q.at/1440)||q.at!==q.time?.day*1440+q.time?.hour*60+q.time?.minute)throw Error('报价时序');
        if(q.source!==receipt.source||q.commitmentId!==receipt.commitmentId)throw Error('报价历史与永久来源');
        for(const key of ['id','playerId','personId','characterId','dungeonId','locationId','day','baseFee','offeredFee','fee','currency','accepted','status','at','order','revision','time'])if(abilities.hash(q[key])!==abilities.hash(receipt[key]))throw Error('报价历史与永久回执');
        seen.add(q.id);latest.set(q.playerId,q);lastOrder=q.order;
      }
      if(Object.keys(current).length!==latest.size)throw Error('当前报价与历史数量');
      for(const [payerId,q] of latest){const c=current[payerId],used=(state.远征?.hirePayments??[]).some(e=>e.kind==='deposit'&&e.contract.quoteId===q.id);if(!c||c.status!==(used?'used':'offered'))throw Error('报价使用阶段');if(q.source!==c.source||q.commitmentId!==c.commitmentId)throw Error('当前报价来源被改写');for(const key of ['id','playerId','personId','characterId','dungeonId','locationId','day','baseFee','offeredFee','fee','currency','accepted','at','order','revision','time'])if(abilities.hash(q[key])!==abilities.hash(c[key]))throw Error('当前报价被改写');}
    }catch(error){errors.push(`雇佣报价${p.id}无效：${error.message}`);}
    for(const r of Object.values(state.远征?.processedTransactions??{}))if(r.type==='hire-negotiated'&&!seen.has(r.id))errors.push('永久议价事务缺少实际报价历史');
    return errors;
  }
  function validateHirePayments(state,pendingId=''){
    const events=state.远征?.hirePayments??[],contracts=state.远征?.companionContracts??[],wallet=state.钱包?.列表?.[HIRE_ESCROW_WALLET],errors=validateHireOffers(state),seen=new Set(),deposits=new Map(),settled=new Set();let balance=0,lastOrder=0;
    if(!Array.isArray(events)||!Array.isArray(contracts))return ['雇佣付款账本无效'];
    for(const e of events)try{
      if(!['deposit','release','refund'].includes(e.kind)||seen.has(e.id)||e.id!==`hire-payment:${e.sourceId}:${e.kind}:${e.agreementId}`||!Number.isSafeInteger(e.amount)||e.amount<=0||!Number.isSafeInteger(e.order)||e.order<=lastOrder||e.order>state.扩展.personEventSequence||!Number.isSafeInteger(e.at)||e.at>people.now(state))throw Error('付款身份或时序');seen.add(e.id);lastOrder=e.order;
      const payer=state.人物.列表[e.payerId],payee=state.人物.列表[e.payeeId];if(!payer||!payee||payer.id===payee.id)throw Error('付款双方');
      if(![e.fromBefore,e.fromAfter,e.toBefore,e.toAfter].every(n=>Number.isSafeInteger(n)&&n>=0)||e.fromBefore-e.fromAfter!==e.amount||e.toAfter-e.toBefore!==e.amount)throw Error('款项不守恒');
      if(e.fromWalletId!==(e.kind==='deposit'?payer.walletId:HIRE_ESCROW_WALLET))throw Error('付款钱包');
      if(e.toRemainsId){const remains=state.战利品.遗骸列表[e.toRemainsId];if(e.kind!=='refund'||!payer.life.death||payer.life.death.at>e.at||remains?.type!=='human-corpse'||remains.unitId!==payer.id||remains.ownerEntityId!==payer.id||e.toWalletId!==null)throw Error('原雇主遗产');}
      else if(e.toWalletId!==(e.kind==='deposit'?HIRE_ESCROW_WALLET:e.kind==='release'?payee.walletId:payer.walletId))throw Error('收款钱包');
      if((e.kind==='deposit'?e.toBefore:e.fromBefore)!==balance)throw Error('托管余额链');balance+=e.kind==='deposit'?e.amount:-e.amount;
      const receipt=state.远征.processedTransactions[e.sourceId],request=state.远征.commandRequests?.[e.sourceId]?.request;
      const agreement=payee.扩展?.同行约定?.find(a=>a.id===e.agreementId),history=agreement?.events.filter(h=>h.paymentId===e.id)??[];
      if(!agreement||agreement.playerId!==payer.id||agreement.personId!==payee.id||agreement.fee!==e.amount||history.length!==1||history[0].sourceId!==e.sourceId||history[0].status!==({deposit:'accepted',release:'active',refund:'cancelled'})[e.kind])throw Error('付款与同行历史不符');
      if(e.kind==='deposit'){
        const c=e.contract,service=world.NPC_ARCHETYPES[payee.扩展?.archetypeId]?.escort,quote=c?.quoteId?payee.扩展?.议价历史?.find(q=>q.id===c.quoteId):null,personal=quote?.source==='personal';
        if(deposits.has(e.agreementId)||!c||c.agreementId!==`hire:${e.sourceId}`||c.agreementId!==e.agreementId||c.leaderId!==payer.id||c.unitId!==payee.id||c.characterId!==payee.id||c.fee!==e.amount||c.dungeonId!==agreement.dungeonId||!DUNGEON_PROFILES[c.dungeonId]||!state.地图.地点[c.locationId]||!Number.isSafeInteger(c.day)||!service&&!personal)throw Error('原雇佣合同');
        const referral=(state.世界.opening?.situations??[]).find(r=>r.id===c.referralId),discount=referral?.events?.some(v=>v.type==='used'&&v.sourceId===e.sourceId)?referral.discountGold:0;
        if(personal?c.referralId!==undefined||c.baseFee!==quote.fee||c.fee!==quote.fee:discount&&payer.id!==state.角色.主控单位ID||c.baseFee!==service.fee-discount||c.fee<Math.max(1,Math.ceil(c.baseFee*.9))||c.fee>c.baseFee)throw Error('原服务价格');
        if(c.quoteId){if(!quote||quote.playerId!==payer.id||quote.personId!==payee.id||quote.dungeonId!==c.dungeonId||quote.baseFee!==c.baseFee||quote.fee!==c.fee||quote.locationId!==c.locationId||quote.day!==c.day||request?.quoteId!==c.quoteId)throw Error('原议价来源');}else if(c.fee!==c.baseFee)throw Error('无报价的费用');
        if(request?.actorId!==payer.id||request.characterId!==c.characterId||request.dungeonId!==undefined&&request.dungeonId!==c.dungeonId||receipt?.type!=='companion-hired'||receipt.actorId!==payer.id||receipt.personId!==payee.id||abilities.hash(receipt.hirePayment)!==abilities.hash(e)||abilities.hash(receipt.agreement.events[0])!==abilities.hash(history[0]))throw Error('原签约事务');
        deposits.set(e.agreementId,e);
      }else{
        const original=deposits.get(e.agreementId);if(!original||settled.has(e.agreementId)||original.payerId!==payer.id||original.payeeId!==payee.id||original.amount!==e.amount)throw Error('重复支付或退款');settled.add(e.agreementId);
        if(e.deathTrigger){const death=state.人物.列表[e.deathTrigger.personId]?.life?.death;if(e.kind!=='refund'||![payer.id,payee.id].includes(e.deathTrigger.personId)||death?.id!==e.deathTrigger.deathId||death.at!==e.at||e.sourceId!==`hire-death:${death.id}:${e.agreementId}`||history[0].deathId!==death.id)throw Error('死亡退款来源');}
        else if(e.sourceId!==pendingId){
          if(e.kind==='release'){if(receipt?.type!=='expedition-started'||receipt.leaderId!==payer.id||!receipt.companions.some(c=>c.agreementId===e.agreementId&&c.unitId===payee.id&&c.kind==='hired')||abilities.hash(receipt.hirePayments?.find(p=>p.id===e.id))!==abilities.hash(e)||history[0].expeditionId!==receipt.expeditionId)throw Error('出发支付来源');}
          else if(receipt?.type!=='companion-dismissed'||request?.actorId!==payer.id||request.agreementId!==e.agreementId||abilities.hash(receipt.hirePayment)!==abilities.hash(e))throw Error('取消退款来源');
        }
      }
    }catch(error){errors.push(`雇佣付款${e?.id??''}无效：${error.message}`);}
    const pending=new Set();
    for(const c of contracts){const deposit=deposits.get(c.agreementId),p=state.人物?.列表?.[c.unitId],a=p?.扩展?.同行约定?.find(a=>a.id===c.agreementId);if(pending.has(c.unitId)||!deposit||settled.has(c.agreementId)||abilities.hash(c)!==abilities.hash(deposit.contract)||a?.status!=='accepted'||a.events.at(-1)?.status!=='accepted'||[c.leaderId,c.unitId].some(id=>state.人物.列表[id]?.status==='dead'))errors.push('待发合同与实际预付款或人物不符');pending.add(c.unitId);}
    for(const [id,d] of deposits)try{
      if(!settled.has(id)&&!contracts.some(c=>c.agreementId===id))throw Error('托管款缺少待发合同');
      const a=state.人物.列表[d.payeeId].扩展.同行约定.find(a=>a.id===id),payment=events.find(e=>e.agreementId===id&&e.kind!=='deposit');
      if(a.status!==a.events.at(-1)?.status||a.events[0].status!=='accepted')throw Error('合同当前阶段');
      const stages=a.events.map(e=>e.status).join(',');
      if(!payment?stages!=='accepted':payment.kind==='refund'?stages!=='accepted,cancelled':!/^accepted,active(,departed)?(,completed)?$/.test(stages))throw Error('合同阶段顺序');
      if(payment?.kind==='release'){
        const start=state.远征.processedTransactions[payment.sourceId],active=expeditions.instances(state).find(e=>e.id===start?.expeditionId),c=active?.companions.find(c=>c.agreementId===id&&c.unitId===d.payeeId);
        if(a.status==='completed'){const last=a.events.at(-1),receipt=state.远征.processedTransactions[last.settlementId];if(!receipt||!['expedition-failed','expedition-escort-rescue','expedition-cleared','expedition-safely-extracted'].includes(receipt.type)||receipt.expeditionId!==start.expeditionId||!receipt.companions?.some(c=>c.agreementId===id&&c.unitId===d.payeeId))throw Error('合同返程来源');}
        else if(payment.sourceId!==pendingId&&(!c||c.kind!=='hired'||c.active!==(a.status==='active')))throw Error('合同与实际在途人员');
      }
    }catch(error){errors.push(`付费同行${id}无效：${error.message}`);}
    for(const p of Object.values(state.人物?.列表??{}))for(const a of p.扩展?.同行约定??[])if(a.id.startsWith('hire:')&&!deposits.has(a.id))errors.push('付费同行缺少原付款来源');
    for(const r of Object.values(state.远征?.processedTransactions??{})){
      const payments=['companion-hired','companion-dismissed'].includes(r.type)?[r.hirePayment]:r.type==='expedition-started'?r.hirePayments:[];
      if(!Array.isArray(payments)||payments.some(p=>!p||!seen.has(p.id)||abilities.hash(events.find(e=>e.id===p.id))!==abilities.hash(p)))errors.push('雇佣永久事务缺少对应实际付款记录');
    }
    if(balance<0||(wallet?.gold??0)!==balance||events.length&&(!wallet||wallet.id!==HIRE_ESCROW_WALLET||wallet.ownerEntityId!=='expedition-hire-escrow'))errors.push('托管余额与永久付款账不符');
    if(Object.values(state.人物?.列表??{}).some(p=>p.walletId===HIRE_ESCROW_WALLET))errors.push('雇佣托管钱包不能作为人物钱包');
    return errors;
  }

  function negotiateCompanion(rawState,options={},transactionId='negotiate-companion') {
    const actorId=options.actorId??rawState.角色.主控单位ID,guard=beginTransaction(rawState,transactionId,'商议雇佣价格',{...options,actorId});
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    let state=guard.state;
    const preview=companionRoster(state,options.dungeonId,{actorId});
    const entry=preview.roster.find(item=>item.characterId===options.characterId||item.unitId===options.characterId);
    if(!entry)throw new Error('这位人物没有提供雇佣服务');
    if(entry.personalOfferId)throw new Error('本次报价由对方自行决定；请明确接受或暂不雇佣，不能直接改写金额');
    if(entry.free)throw new Error('本次同行免费，无需还价');
    if(entry.reason&&entry.reason!=='金魂币不足')throw new Error(entry.reason);
    const offeredFee=options.offeredFee;
    if(!Number.isSafeInteger(offeredFee)||offeredFee<0||offeredFee>entry.fee)throw new Error('还价须为不高于原价的非负整数');
    const persistent=ensureCompanion(state,entry.characterId,actorId,preview.dungeonId);state=persistent.state;
    const person=state.人物.列表[persistent.unitId],playerId=actorId;
    // Initial paid escort policy: up to ten percent off, never a free escort.
    const minimumFee=Math.max(1,Math.ceil(entry.fee*.9)),fee=Math.max(minimumFee,offeredFee);
    const offer={id:transactionId,playerId,personId:person.id,characterId:entry.characterId,dungeonId:preview.dungeonId,
      locationId:positions.positionOf(state,actorId).locationId,day:state.世界.时间.day,baseFee:entry.fee,offeredFee,fee,currency:'gold',
      accepted:offeredFee>=minimumFee,status:'offered',at:people.now(state),order:people.nextEventOrder(state),revision:state.系统.revision,time:clone(state.世界.时间)};
    person.扩展??={};person.扩展.雇佣议价??={};person.扩展.雇佣议价[playerId]=offer;
    person.扩展.议价历史??=[];
    person.扩展.议价历史.push(clone(offer));
    return commit(state,transactionId,'商议雇佣价格',{type:'hire-negotiated',...clone(offer),
      summary:offer.accepted?`${person.name}愿意按${fee}金魂币同行；当日原地点有效，尚未付款或入队。`:`${person.name}没有接受${offeredFee}金魂币，提出${fee}金魂币的新报价；当日原地点有效，尚未付款或入队。`});
  }

  function hireCompanion(rawState,options={},transactionId='hire-companion') {
    const actorId=options.actorId??rawState.角色.主控单位ID,guard=beginTransaction(rawState,transactionId,'雇佣同伴',{...options,actorId});
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    let state=guard.state;
    const preview=companionRoster(state,options.dungeonId,{actorId});
    const entry=preview.roster.find(item=>item.characterId===options.characterId||item.unitId&&item.unitId===options.characterId);
    if(!entry)throw new Error('该角色当前不能被雇佣');
    const pendingOffer=currentHireOffer(state,entry,preview.dungeonId,actorId);
    if(entry.personalOfferId&&options.quoteId===undefined)throw new Error('本次本人报价须由你明确接受，不能直接雇佣');
    if(options.quoteId===undefined&&pendingOffer)throw new Error('已有议价报价，请明确接受该报价后再雇佣');
    const offer=options.quoteId===undefined?null:pendingOffer;
    if(options.quoteId!==undefined&&(!offer||offer.id!==options.quoteId))throw new Error('议价报价已失效，请重新询问');
    const fee=offer?offer.fee:entry.fee;
    if(entry.reason&&!(offer&&entry.reason==='金魂币不足'))throw new Error(entry.reason);
    if(preview.gold<fee)throw new Error('金魂币不足');
    const persistent=ensureCompanion(state,entry.characterId,actorId,preview.dungeonId);state=persistent.state;
    const person=state.人物.列表[actorId];
    const goldBefore=state.钱包.列表[person.walletId].gold;
    const dungeon=dungeonProfile(preview.dungeonId);
    if(offer)state.人物.列表[persistent.unitId].扩展.雇佣议价[actorId].status='used';
    const contract={leaderId:person.id,agreementId:`hire:${transactionId}`,characterId:entry.characterId,unitId:persistent.unitId,name:entry.name,fee,baseFee:entry.fee,locationId:positions.positionOf(state,actorId).locationId,day:state.世界.时间.day,dungeonId:dungeon.id,dungeonName:dungeon.name,...(offer?{quoteId:offer.id}:{}),...(entry.referralId?{referralId:entry.referralId}:{})};
    if(entry.referralId){const referral=(state.世界.opening?.situations??[]).find(r=>r.id===entry.referralId);if(referral?.status==='available'){referral.status='used';referral.events.push({type:'used',time:clone(state.世界.时间),sourceId:transactionId,paid:fee});}}
    const hirePayment=settleHirePayment(state,contract,'deposit',transactionId);state.远征.companionContracts.push(contract);
    const agreement=recordCompanionAgreement(state,contract,'accepted',{paid:fee,sourceId:transactionId,paymentId:hirePayment.id});
    return commit(state,transactionId,'雇佣同伴',{type:'companion-hired',actorId,characterId:entry.characterId,personId:persistent.unitId,fee,dungeonId:dungeon.id,dungeonName:dungeon.name,agreement:clone(agreement),hirePayment,payment:{playerId:person.id,before:goldBefore,after:state.钱包.列表[person.walletId].gold},summary:`已雇佣${entry.name}前往${dungeon.name}，预付${fee}金魂币；出发后支付雇员，出发前取消全额退还。`});
  }
  function dismissCompanion(rawState,options={},transactionId='dismiss-companion') {
    const actorId=options.actorId??rawState.角色.主控单位ID,guard=beginTransaction(rawState,transactionId,'取消雇佣',{...options,actorId});
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,block=world.worldActionBlockReason(state,{actorId});
    if(block)throw new Error(block);
    const index=state.远征.companionContracts.findIndex(item=>item.leaderId===actorId&&item.agreementId===options.agreementId);
    if(index<0)throw new Error('没有该角色的待出发雇佣');
    const [contract]=state.远征.companionContracts.splice(index,1);
    const person=state.人物.列表[actorId];
    const goldBefore=state.钱包.列表[person.walletId].gold;
    const hirePayment=settleHirePayment(state,contract,'refund',transactionId);
    const agreement=recordCompanionAgreement(state,contract,'cancelled',{refund:contract.fee,sourceId:transactionId,paymentId:hirePayment.id});
    return commit(state,transactionId,'取消雇佣',{type:'companion-dismissed',actorId,personId:contract.unitId,agreement:clone(agreement),hirePayment,payment:{playerId:person.id,before:goldBefore,after:state.钱包.列表[person.walletId].gold},refund:contract.fee,summary:`已取消${contract.name}的雇佣，退还${contract.fee}金魂币。`});
  }

  function assertExpeditionMovement(state,ids,options={}){
    if(!ids){const active=activeExpedition(state,options);assertExpeditionActor(state,active,options.actorId??active.leaderId);assertTripPermission(state,active,'travel');}
    const participants=ids??expeditions.participantIds(activeExpedition(state,options),{presentOnly:true}).filter(id=>state.人物.列表[id]?.status!=='dead');
    for(const id of unique(participants)){people.assertAlive(state,id);controls.assertAction(state,id,'move');}
  }
  function assertTripPermission(state,active,domain){
    for(const companion of active.companions.filter(c=>c.active&&state.人物.列表[c.unitId]?.status!=='dead')){
      const permission=globalThis.SoulCooperationCore.tripPermission(state,active,companion,domain);
      if(!permission.available)throw Error(`${companion.name}的原远征合作已经失效：${permission.reason}，请在原现场重新确认安排`);
    }
  }

  function startExpedition(rawState, options = {}, transactionId = 'start-expedition') {
    const guard = beginTransaction(rawState, transactionId, '开始远征',options);
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    let state = guard.state;
    const leaderId=options.actorId??state.角色.主控单位ID;
    if (expeditions.forActor(state,leaderId,{presentOnly:false})) throw new Error('已经存在进行中的远征');
    assertExpeditionMovement(state,[leaderId]);
    const block = world.worldActionBlockReason(state,{actorId:leaderId});
    if (block) throw new Error(block);
    const difficulty = difficultyProfile(options.difficultyId);
    const requestedDungeonId = clean(options.dungeonId, difficulty.dungeonId);
    const dungeon = dungeonProfile(requestedDungeonId);
    if (difficulty.dungeonId !== dungeon.id || !dungeon.difficultyIds.includes(difficulty.id)) throw new Error('所选难度不属于当前副本');
    requireDungeonEntrance(state, dungeon,leaderId);
    const contracts=clone(state.远征.companionContracts.filter(c=>c.leaderId===leaderId));
    const mismatched=contracts.find(item=>item.dungeonId!==dungeon.id);
    if(mismatched)throw new Error(`${mismatched.name}的雇佣约定不包含${dungeon.name}，请先取消原雇佣再重新约定`);
    const riskPreview = previewExpeditionRisk(state,dungeon.id,difficulty.id,{actorId:leaderId});
    if (pendingRingLoot(state,leaderId)||leaderId===state.角色.主控单位ID&&state.场景.强制现场绑定) throw new Error('当前还有待处理魂环，请先吸收或放弃魂环后再进入副本');
    if (state.世界.seed === 'douluo-martial-soul-v1.10') {
      state.世界.seed = `douluo-world-${stableHash(`${transactionId}:${state.角色.主控单位ID}:${state.系统.revision}`).toString(16)}`;
      state.世界.扩展 = {...(plain(state.世界.扩展) ? state.世界.扩展 : {}),运行存档种子已初始化:true};
    }
    const sessionNumber = nextCounter(state, 'session');
    const seed = `${clean(options.seed, `${state.世界.seed}:departure:${transactionId}`)}:expedition:${sessionNumber}`;
    const map = generatePreparedMap(seed, difficulty.id);
    const freeGuide=leaderId===state.角色.主控单位ID&&freeGuideAvailable(state,dungeon.id);
    const members=world.partyMembers(state,leaderId);
    const unavailable=members.find(p=>p.cooperationId?(p.allowCombat&&(!p.allowTravel||!globalThis.SoulCooperationCore.permits(state,leaderId,p.personId,'combat',dungeon.id))):p.membership==='temporary'&&(!p.present||p.dungeonId&&p.dungeonId!==dungeon.id));
    if(unavailable)throw new Error(`${unavailable.name}的${unavailable.membership==='temporary'?'临时':''}同行约定不包含本次出发，请先调整约定`);
    if(unique([...world.occupiedCompanionIds(state,leaderId),...(freeGuide?[companionUnitId('yu-xiaogang-notting')]:[])]).length>3)throw new Error('首次护航的大师占一席，队伍超过四人；请先调整队伍或暂停免费护航');
    const companions=[],hirePayments=[];
    const requests=[...(freeGuide?[{agreementId:`guide:${transactionId}`,characterId:'yu-xiaogang-notting',dungeonId:dungeon.id,fee:0,kind:'guide'}]:[]),...contracts.map(item=>({...item,kind:'hired'})),...members.filter(p=>p.present&&p.allowCombat!==false).map(p=>({...p,characterId:p.personId,kind:'party',fee:0,dungeonId:dungeon.id,agreementId:`party-trip:${transactionId}:${p.personId}`}))];
    for(const request of requests){
      if(request.kind==='hired'&&!generatedHireEntry(state,request.characterId,leaderId,dungeon.id)&&!canonArena().CHARACTER_CATALOG[request.characterId])throw new Error('雇佣名单不合法');
      const instantiated=request.kind==='party'?{state,unitId:request.unitId,generated:{unitIds:[request.unitId]}}:ensureCompanion(state,request.characterId,leaderId,dungeon.id);
      state=normalizeState(instantiated.state);
      const unit=state.战斗单位.列表[instantiated.unitId];
      assertExpeditionMovement(state,[instantiated.unitId]);
      const actualPosition=positions.positionOf(state,instantiated.unitId);if(actualPosition.kind!=='location'||actualPosition.sceneId||world.personalActionBlockReason(state,{actorId:instantiated.unitId,allowCaptivity:!!globalThis.SoulCooperationCore?.permits(state,leaderId,instantiated.unitId,'combat',dungeon.id)})||logistics.busyReason(state,instantiated.unitId)||globalThis.SoulRescueCore?.busyReason(state,instantiated.unitId))throw Error('同行者须先实际回到公共通道并结束看管或其他安排');
      if(state.人物.列表[instantiated.unitId]?.status==='dead'||unit&&(unit.存活状态!=='存活'||unit.资源.生命.当前<=0))throw new Error('同行人物已无法出发，请先调整队伍');
      if(state.人物.列表[instantiated.unitId]?.locationId!==dungeon.locationId)throw new Error('同行人物不在当前地点，不能直接带入远征');
      if((state.世界.npcPlans??[]).some(p=>p.ownerId===instantiated.unitId&&['scheduled','travelling','waiting'].includes(p.status)))throw new Error('同行人物已有独立行程，请先处理原安排');
      if(unit)unit.扩展.护航身份=request.kind==='guide'?'首次猎魂森林新手护航':'';
      companions.push({...request,leaderId,active:true,unitId:instantiated.unitId,name:state.人物.列表[instantiated.unitId].name,
        ...(globalThis.SoulCombatDeployments.bodyOuting(state,leaderId,instantiated.unitId)?{bodyOutingRef:{provider:'resident-body',deploymentId:globalThis.SoulCombatDeployments.bodyOuting(state,leaderId,instantiated.unitId).id}}:{}),
        ...(instantiated.generated?{generated:clone(instantiated.generated)}:{}),rescueUsed:false,firstCombatPrepared:false});
      const payment=request.kind==='hired'?settleHirePayment(state,request,'release',transactionId):null;if(payment)hirePayments.push(payment);
      recordCompanionAgreement(state,companions[companions.length-1],'active',{expeditionId:`expedition-${String(sessionNumber).padStart(4,'0')}`,sourceId:transactionId,...(companions.at(-1).bodyOutingRef?{bodyOutingRef:clone(companions.at(-1).bodyOutingRef)}:{}),...(payment?{paymentId:payment.id}:{})});
      const person=state.人物.列表[instantiated.unitId];
      if(person){positions.placePerson(state,person.id,{locationId:dungeon.locationId,spaceId:''});}
    }
    state.远征.companionContracts=state.远征.companionContracts.filter(c=>!contracts.some(own=>own.agreementId===c.agreementId));
    if(freeGuide)state.远征.配置.firstHuntingEscort={...state.远征.配置.firstHuntingEscort,status:'active',activeExpeditionId:`expedition-${String(sessionNumber).padStart(4,'0')}`,rescueUsed:false};
    const active = {
      id: `expedition-${String(sessionNumber).padStart(4, '0')}`, leaderId, dungeonId: dungeon.id, dungeonName: dungeon.name,
      entranceLocationId: dungeon.locationId, theme:dungeon.theme, regionLabel:dungeon.regionLabel,
      environment:{name:dungeon.environmentName,description:dungeon.environmentDescription}, totalLayers:difficulty.routeLayers,
      difficultyId: difficulty.id, difficultyName: difficulty.name, seed, status: 'active', phase: 'awaiting-room',
      map, completedNodeIds: [], currentNodeId: '', currentRoom: null, tempMaterials: {}, tempItemIds: [],
      acquiredBaseValue: 0, expectedShopAcquisition: 0, startedRevision: state.系统.revision + 1, lastResolvedNodeId: '',
      companions
    };
    active.lootAgreement=loot.freeze(state,active,transactionId);
    if(foregroundExpedition(state,active)){if(state.远征.当前)throw Error('玩家已经参与另一远征');state.远征.当前=active;}else{state.远征.sessions??={};state.远征.sessions[active.id]=active;}
    if(foregroundExpedition(state,active))state.场景.状态 = `${dungeon.name}副本`;
    return commit(state, transactionId, '开始远征', {
      type: 'expedition-started', expeditionId:active.id,leaderId, dungeon:clone(dungeon), difficulty: clone(difficulty), mapSeed: seed,
      availableNodeIds: ['L1-N1'],companions:companions.map(({characterId,unitId,name,kind,agreementId,membershipId})=>({characterId,unitId,name,kind,agreementId,...(membershipId?{membershipId}:{})})),hirePayments,riskPreview,...(loot.postTrip(active.lootAgreement)?{lootAgreement:clone(active.lootAgreement)}:{}),
      summary: `进入${dungeon.name}·${difficulty.name}${freeGuide ? '；首次猎魂由玉小刚全程护航' : ''}；同行${companions.length}人`
    });
  }

  function regionalBattlefieldPositions(state, active, roster) {
    const dungeon = dungeonProfile(active.dungeonId);
    const playerId = active.leaderId;
    const positions = {[playerId]: {战场坐标:{x:20,y:50},距离区:'近距',站位簇:'player'}};
    for(const [index,companion] of (active.companions??[]).entries()) {
      positions[companion.unitId]={战场坐标:{x:30,y:18+index*32},距离区:'近距',站位簇:'companions'};
    }
    const spread = Number(dungeon.battlefield?.spreadY ?? 20);
    const x = Number(dungeon.battlefield?.enemyX ?? 78);
    for (const [index, beast] of roster.entries()) {
      const y = 50 + (index - (roster.length - 1) / 2) * Math.min(spread, 62 / Math.max(1, roster.length - 1));
      positions[beast.unitId] = {战场坐标:{x,y:clamp(y,8,92)},距离区:'近距',站位簇:active.dungeonId};
    }
    return positions;
  }

  function materializeCombat(state, active, node, transactionId, generated, narrative) {
    assertTripPermission(state,active,'combat');
    const labels = new Map(narrative.beasts.map(item => [item.unitId,item]));
    generated.roster = generated.roster.map(beast => {
      const named = labels.get(beast.unitId);
      const ordinary = named.skills.find(item => item.skillId === beast.skillSlots.find(slot => slot.kind === 'ordinary')?.id);
      const activeSkills = beast.skillSlots.filter(slot => slot.kind !== 'ordinary').map(slot => named.skills.find(item => item.skillId === slot.id));
      const renamed = {
        ...beast,name:named.name,description:named.description,appearance:named.appearance,ecology:named.ecology,
        naturalAttackName:ordinary?.name ?? `${named.name}·本能攻击`,skillNarratives:activeSkills
      };
      renamed.materialProfiles = beast.materialProfiles.map(profile => {
        const label=named.materials?.find(material=>material.materialId===profile.id);
        return {...clone(profile),displayName:label?.name??`${renamed.name}·${foundation.MARTIAL_SOUL_CORE.materialAppearancePart(profile.appearancePart??profile.categories[0])}`,description:label?.description??''};
      });
      return renamed;
    });
    const dungeon = dungeonProfile(active.dungeonId);
    const encounterId = `encounter-${active.id}-${node.id}`;
    const members = generated.roster.map(beast => ({
      ...clone(beast), kind: 'beast', unitId: beast.unitId, profileId: beast.profileId, controller: 'ai',
      sideId: 'beasts', sideName: '魂兽群', canFlee: false, morale: 100, seed: `${node.seed}:${beast.unitId}`,
      cluster:dungeon.id, terrainTags:[dungeon.regionLabel,dungeon.environmentName], cover:dungeon.battlefield?.cover ?? '无'
    }));
    for(const companion of active.companions??[]) if(companion.active && state.战斗单位.列表[companion.unitId]?.存活状态==='存活' && state.战斗单位.列表[companion.unitId].资源.生命.当前>0) members.push({
      kind:'existing',existingUnitId:companion.unitId,controller:'ai',sideId:'hunters',sideName:'猎魂小队',
      canFlee:false,morale:100,cluster:'hunting-escort',terrainTags:[dungeon.regionLabel,dungeon.environmentName],cover:dungeon.battlefield?.cover ?? '无'
    });
    const created = cycle.createEncounter(state, {
      encounterId,actorId:active.leaderId,expeditionId:active.id,nodeId:node.id,locationId:active.entranceLocationId, location: dungeon.name, danger: node.danger, seed: node.seed,
      sceneSignals: ['敌对遭遇', '主动攻击'],
      members
    }, `${transactionId}:encounter`);
    state = normalizeState(created.state);
    const judged = cycle.judgeHuntScene(state, {...expeditionOptions(active),encounterId,signals: ['敌对遭遇', '主动攻击']}, `${transactionId}:judge`);
    state = normalizeState(judged.state);
    const positions = regionalBattlefieldPositions(state, active, generated.roster);
    const started = cycle.startHuntBattle(state, {...expeditionOptions(active),encounterId,battleId: `battle-${active.id}-${node.id}`, seed: stableHash(node.seed), positions, objective: '击败魂兽或战斗撤离'}, `${transactionId}:battle`);
    state = normalizeState(started.state);
    expeditions.byId(state,active.id).currentRoom = {
      nodeId: node.id, type: node.type, layer: node.layer, danger: node.danger, budget: generated.budget,
      spent: generated.spent, residual: generated.residual, roster: generated.roster, encounterId, battleId:started.receipt.battleId,
      remainsIds: [], harvestedUnitIds: [], handledRingUnitIds: [], opened: false, campUsed: false,
      environment:{name:dungeon.environmentName,description:dungeon.environmentDescription},narrative:clone(narrative),narrativeRequest:null
    };
    expeditions.byId(state,active.id).phase = 'combat';
    return state;
  }

  function enterRoom(rawState, nodeIdInput, transactionId = 'enter-expedition-room', options = {}) {
    const guard = beginTransaction(rawState, transactionId, '进入远征房间',{...options,nodeId:nodeIdInput});
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    let state = guard.state;
    const selected=activeExpedition(state,options);
    if((options.actorId??state.角色.主控单位ID)!==selected.leaderId)throw Error('只有实际领队可以选择远征路线');
    assertExpeditionMovement(state,undefined,options);
    if(['postcombat','interaction'].includes(activeExpedition(state,options)?.phase)){
      const preview=previewRoomActions(state,options);
      if(!preview.availableNodeIds.includes(clean(nodeIdInput)))throw new Error('房间不在当前可选路线中');
      if(preview.finish.losses.length&&!options.confirmAbandon)throw new Error('仍有未处理的收获，请先确认放弃内容');
      closeCurrentRoom(state,options);
    }
    const active = activeExpedition(state,options);
    if (!active || active.status !== 'active' || active.phase !== 'awaiting-room') throw new Error('当前不能进入新房间');
    const nodeId = clean(nodeIdInput);
    const available = availableNextIds(active);
    if (!available.includes(nodeId)) throw new Error('房间不在当前可选路线中');
    const node = active.map.nodes[nodeId];
    active.currentNodeId = nodeId;
    node.status = 'entered';
    if (roomIsCombat(node.type)) {
      const tutorial = Boolean(firstEscort(active) && !firstEscort(active).firstCombatPrepared);
      const generated = clone(node.encounter);
      if(!generated)throw new Error('该房间缺少已经验证的魂兽组合');
      const request = roomNarrativeRequest(active,node,generated);
      activeExpedition(state,options).phase = 'awaiting-narrative';
      activeExpedition(state,options).currentRoom = {
        nodeId,type:node.type,layer:node.layer,danger:node.danger,budget:generated.budget,spent:generated.spent,residual:generated.residual,
        roster:generated.roster,encounterId:'',battleId:'',remainsIds:[],harvestedUnitIds:[],handledRingUnitIds:[],opened:false,campUsed:false,
        environment:{name:dungeonProfile(active.dungeonId).environmentName,description:dungeonProfile(active.dungeonId).environmentDescription},
        narrative:null,narrativeRequest:request,tutorial
      };
      if (tutorial) firstEscort(activeExpedition(state,options)).firstCombatPrepared = true;
    } else {
      activeExpedition(state,options).phase = 'interaction';
      activeExpedition(state,options).currentRoom = {nodeId, type: node.type, layer: node.layer, danger: node.danger, opened: false, campUsed: false, roster: [], remainsIds: [], harvestedUnitIds: [], handledRingUnitIds: []};
    }
    const current = activeExpedition(state,options);
    const receipt = roomIsCombat(node.type)
      ? {type: 'expedition-narrative-required',expeditionId:active.id,actorId:active.leaderId, nodeId, roomType: node.type, danger: node.danger, enemyCount: current.currentRoom.roster.length, namingRequest:clone(current.currentRoom.narrativeRequest),tutorial:current.currentRoom.tutorial,summary: `第${node.layer}层已准备好，正在补全附近${current.currentRoom.roster.length}只魂兽的介绍`}
      : {type: 'expedition-interaction-entered',expeditionId:active.id,actorId:active.leaderId, nodeId, roomType: node.type, danger: node.danger, summary: `进入第${node.layer}层${node.type}`};
    return commit(state, transactionId, '进入远征房间', receipt);
  }

  function resolveRoomNarrative(rawState, rawNarrative, transactionId = 'resolve-expedition-narrative',options={}) {
    const guard = beginTransaction(rawState,transactionId,'登记远征生成文案',{...options,narrative:rawNarrative});
    if (guard.duplicate) return {state:guard.state,receipt:guard.receipt,idempotent:true};
    let state = guard.state;
    const active = activeExpedition(state,options);
    const room = active?.currentRoom;
    if (!active || active.phase !== 'awaiting-narrative' || !room?.narrativeRequest) throw new Error('当前没有等待命名的远征战斗房');
    if(options.nodeId!==undefined&&options.nodeId!==room.nodeId||options.mechanicsHash!==undefined&&options.mechanicsHash!==room.narrativeRequest.mechanicsHash)throw Error('命名回应属于另一房间或已过期');
    const narrative = validateRoomNarrative(room.narrativeRequest,rawNarrative);
    const node = active.map.nodes[room.nodeId];
    const generated = {budget:room.budget,spent:room.spent,residual:room.residual,roster:clone(room.roster)};
    state = materializeCombat(state,active,node,transactionId,generated,narrative);
    const current = activeExpedition(state,options).currentRoom;
    return commit(state,transactionId,'登记远征生成文案',{
      type:'expedition-combat-entered',expeditionId:active.id,actorId:active.leaderId,nodeId:current.nodeId,roomType:current.type,danger:current.danger,
      enemyCount:current.roster.length,enemies:current.roster.map(beast => ({unitId:beast.unitId,name:beast.name,years:beast.years,monsterValue:beast.monsterValue,description:beast.description})),
      roomBudget:current.budget,spent:current.spent,residual:current.residual,narrativeMechanicsHash:narrative.mechanicsHash,
      companions:(active.companions??[]).filter(c=>c.active).map(({unitId,name,kind})=>({unitId,name,kind})),
      summary:`进入第${current.layer}层${current.type}，遭遇${current.roster.length}只由地域生态生成的魂兽`
    });
  }

  function autoResolveCurrentCombat(rawState, options = {}) {
    let state = normalizeState(rawState);
    const active = activeExpedition(state,options);
    if (!active || active.phase !== 'combat' || expeditionBattle(state,active).状态 !== '进行中') throw new Error('当前没有可自动结算的远征战斗');
    const maximumActions = integer(options.maximumActions ?? 600, 1, 5000);
    const receipts = [];
    for (let index = 0; index < maximumActions && expeditionBattle(state,active).状态 === '进行中'; index += 1) {
      const background=expeditionBattle(state,active);
      if(background.扩展?.clock?.mode==='background'){
        const previousIds=new Set(Object.keys(background.扩展.已结算行动??{}));
        world.advanceTime(state,Math.max(1,(background.扩展.clock.nextAt??people.now(state)+1)-people.now(state)));
        for(const [id,receipt] of Object.entries(expeditionBattle(state,active).扩展.已结算行动??{}))if(!previousIds.has(id))receipts.push(clone(receipt));
        if(receipts.length>maximumActions)throw new Error(`战斗超过${maximumActions}个行动仍未结束`);
        continue;
      }
      const actorId = expeditionBattle(state,active).当前行动单位ID;
      let intent;
      try { intent = combat.chooseBattleAiIntent(state,active.currentRoom.battleId, actorId, `auto-${active.id}-${active.currentNodeId}-${index + 1}`); }
      catch (_) { intent = {id: `auto-${active.id}-${active.currentNodeId}-${index + 1}`, actorId, type: '技能', skillId: 'ordinary.attack', targetIds: []}; }
      try {
        const result = cycle.settleCombatAction(state, intent,{battleId:active.currentRoom.battleId});
        state = normalizeState(result.state);
        receipts.push(result.receipt);
      } catch (error) {
        const fallback = combat.chooseBattleAiIntent(state,active.currentRoom.battleId, actorId, `fallback-${active.id}-${active.currentNodeId}-${index + 1}`);
        const result = cycle.settleCombatAction(state, {...fallback, id: `fallback-${active.id}-${active.currentNodeId}-${index + 1}`},{battleId:active.currentRoom.battleId});
        state = normalizeState(result.state);
        receipts.push(result.receipt);
      }
    }
    if (expeditionBattle(state,active).状态 === '进行中') throw new Error(`战斗超过${maximumActions}个行动仍未结束`);
    return {state, receipts, outcome: expeditionBattle(state,active).扩展?.结果?.outcome, actions: receipts.length};
  }

  function consumeCompanions(state, active, rescueUsed = false, outcome = 'failed',settlementId='') {
    const summaries=[];
    for(const companion of active?.companions??[]) {
    const wasPresent=companion.active;
    const summary = {
      characterId: companion.characterId,
      unitId: companion.unitId,
      agreementId:companion.agreementId,
      name: companion.name,
      rescueUsed: Boolean(companion.kind==='guide' && (rescueUsed || companion.rescueUsed))
    };
    const escortUnitId = companion.unitId;
    const persistent=state.战斗单位.列表[escortUnitId];
    if(!state.人物.列表[escortUnitId]||state.人物.列表[escortUnitId].combatantId&&!persistent)throw new Error('同行人物缺少持久记录');
    if(persistent)persistent.扩展.护航身份='';
    const person=state.人物.列表[escortUnitId];
    const battle=expeditionBattle(state,active),member=battle?.扩展?.成员?.[escortUnitId];
    const withdrew=member&&['escaped','removed'].includes(member.status);
    const travelPermission=globalThis.SoulCooperationCore.tripPermission(state,active,companion,'travel');
    if(person&&person.status!=='dead'){
      if(!wasPresent){summary.leftAt=clone(person.扩展.同行约定.find(r=>r.id===companion.agreementId)?.events.findLast(e=>e.status==='departed')?.position??positions.positionOf(state,escortUnitId));summary.leftReason='departed';}
      else{
        if(globalThis.SoulInteriorSpaces?.membership(state,person.id))throw Error('人物已在独立空间内，不能由旧远征位置覆盖');
        positions.placePerson(state,person.id,{locationId:active.entranceLocationId,spaceId:withdrew||!travelPermission.available?'expedition:'+active.id+':'+active.currentNodeId:''});
        if(withdrew||!travelPermission.available){person.spaceId=`expedition:${active.id}:${active.currentNodeId}`;summary.leftAt=clone(positions.positionOf(state,escortUnitId));summary.leftReason=withdrew?'battle-withdrawal':'permission-lost';summary.encounterId=active.currentRoom?.encounterId;if(!withdrew)summary.permissionEventId=travelPermission.sourceEventId;}else delete person.spaceId;
        state.容器.列表[person.inventoryContainerId].locationId=active.entranceLocationId;
      }
    }
    companion.active = false;
    companion.rescueUsed = summary.rescueUsed;
    recordCompanionAgreement(state,companion,'completed',{expeditionId:active.id,settlementId,outcome,rescueUsed:summary.rescueUsed,...(summary.leftAt?{leftAt:summary.leftAt}:{})});
    if(companion.cooperationId)globalThis.SoulCooperationCore.completeTrip(state,globalThis.SoulCooperationCore.tripAgreement(state,active,companion).id,active.id);
    else if(companion.kind==='party'&&companion.membership==='temporary'&&world.partyMembers(state,active.leaderId).some(p=>p.membershipId===companion.membershipId))world.endPartyMembership(state,escortUnitId,companion.membershipId,`party-return:${active.id}:${escortUnitId}`,active.leaderId,'本次约定远征已经结束，临时同行结束；原人物与经历保留');
    if(companion.kind==='guide') state.远征.配置.firstHuntingEscort = {
      ...state.远征.配置.firstHuntingEscort,
      status:companion.firstCombatPrepared?'consumed':'unused',characterId:'yu-xiaogang-notting',consumedExpeditionId:companion.firstCombatPrepared?active.id:'',
      rescueUsed:summary.rescueUsed,activeExpeditionId:''
    };
    summaries.push({...summary,kind:companion.kind});
    }
    return summaries;
  }

  function loseTemporaryLoot(state, reason, options = {},settlementId='') {
    const active = activeExpedition(state,options);
    if (!active) return {lostMaterialValue: 0, lostItemIds: []};
    const lostMaterialValue = Object.values(active.tempMaterials).reduce((sum, stack) => sum + stack.unitValue * stack.quantity, 0);
    const lostItemIds = [...active.tempItemIds];
    for (const itemId of lostItemIds) {
      const item = state.物品.实例[itemId];
      const container = item && state.容器.列表[item.containerId];
      if (container) container.itemIds = container.itemIds.filter(id => id !== itemId);
      if (item) delete state.物品.实例[itemId];
    }
    for (const loot of Object.values(state.战利品.列表)) {
      if (loot?.类型 !== '魂环胚胎' || loot?.状态 !== '待吸收' || loot.扩展?.sourceSettlement?.kind==='opening-opportunity') continue;
      if (clean(loot.扩展?.originExpeditionId) !== active.id) continue;
      loot.状态 = '消散';
      const profile = state.魂兽档案.列表[loot.来源魂兽档案ID];
      if (profile?.魂环状态 === '待吸收') profile.魂环状态 = '消散';
      for (const [pendingId,pending] of Object.entries(state.魂环?.待选择 ?? {})) {
        if (pending?.sourceLootId === loot.id) delete state.魂环.待选择[pendingId];
      }
    }
    if(foregroundExpedition(state,active)){state.场景.强制现场绑定=false;state.场景.当前魂兽ID='';}
    const companions = consumeCompanions(state,active,Boolean(options.rescueUsed),'failed',settlementId);
    const summary = {id: active.id,leaderId:active.leaderId,participantIds:expeditions.participantIds(active), dungeonId:active.dungeonId, dungeonName:active.dungeonName, difficultyId: active.difficultyId, result: 'failed', reason, battleOutcome:expeditionBattle(state,active)?.扩展?.结果?.outcome??'', completedNodeIds: [...active.completedNodeIds], lostMaterialValue, lostItemIds, companions};
    state.远征.历史.push(summary);
    state.远征.历史 = state.远征.历史.slice(-30);
    removeExpedition(state,active);
    if(foregroundExpedition(state,active)){state.地图.当前地点ID=state.人物.列表[state.角色.主控单位ID].locationId;state.场景.状态=reason;}
    return {expeditionId:active.id,leaderId:active.leaderId,battleId:expeditionBattle(state,active)?.id,entranceLocationId:active.entranceLocationId,lostMaterialValue, lostItemIds, companions};
  }

  function resolveCurrentBattle(rawState, transactionId = 'resolve-expedition-battle',options={}) {
    const guard = beginTransaction(rawState, transactionId, '结算远征战斗',options);
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    let state = guard.state;
    const active = activeExpedition(state,options);
    const battle=expeditionBattle(state,active);
    if (!active || active.phase !== 'combat' || battle.状态 !== '已结束') throw new Error('远征战斗尚未结束');
    const outcome = battle.扩展?.结果?.outcome;
    closeExpeditionEncounter(state, active.currentRoom?.encounterId, outcome || '战斗结束');
    const player = state.战斗单位.列表[active.leaderId];
    const won=battle.扩展?.结果?.winnerSideId===battle.扩展?.成员?.[active.leaderId]?.sideId;
    const escaped = battle.扩展?.成员?.[player?.id]?.status==='escaped';
    const encounter=state.遭遇.列表[active.currentRoom.encounterId];
    if(encounter.battleId!==battle.id||encounter.expeditionId!==active.id||encounter.nodeId!==active.currentRoom.nodeId||encounter.expeditionReward)throw Error('远征战果来源不一致或已经奖励');
    const sideId=battle.扩展.成员[player.id].sideId;
    const kills=(battle.扩展.击杀记录??[]).filter(k=>active.currentRoom.roster.some(b=>b.unitId===k.targetId)&&state.战斗单位.列表[k.targetId]?.存活状态==='死亡'&&battle.扩展.成员[k.targetId]?.sideId!==sideId&&battle.扩展.成员[k.killerId]?.sideId===sideId);
    const defeatedIds=unique(kills.map(k=>k.targetId)),dead=people.isDead(state,player.id)||people.facts(state,player.id).remainingMinutes<=0;
    const status=dead?'skipped-dead':!state.成长.列表[player.id]?'no-growth':'paid';
    const reward={expeditionId:active.id,nodeId:active.currentRoom.nodeId,battleId:battle.id,transactionId,recipientId:player.id,status,recipientLevel:state.成长.列表[player.id]?.魂力等级??null,kills:clone(kills),defeatedIds,at:people.now(state)};
    const experienceResult=status==='paid'?cycle.applyCombatExperience(state,{unitId:player.id,defeatedUnitIds:defeatedIds}):{state,receipt:{type:'combat-experience-skipped',unitId:player.id,defeatedUnitIds:defeatedIds,experienceGained:0,levelsGained:0,reason:status}};
    state=normalizeState(experienceResult.state);
    state.遭遇.列表[encounter.id].expeditionReward={...reward,receipt:clone(experienceResult.receipt)};
    const companionExperience=[];
    for(const companion of active.companions??[]){
      const id=companion.unitId;if(!companion.active||id===player.id||!battle.参与者ID列表.includes(id)||battle.扩展.成员[id]?.sideId!==sideId)continue;
      const g=state.成长.列表[id],dead=people.isDead(state,id)||people.facts(state,id).remainingMinutes<=0,status=dead?'skipped-dead':!g?'no-growth':'paid';
      const reward={expeditionId:active.id,nodeId:active.currentRoom.nodeId,battleId:battle.id,transactionId,recipientId:id,status,recipientLevel:g?.魂力等级??null,kills:clone(kills),defeatedIds,at:people.now(state)};
      const result=status==='paid'?cycle.applyCombatExperience(state,{unitId:id,defeatedUnitIds:defeatedIds}):{state,receipt:{type:'combat-experience-skipped',unitId:id,defeatedUnitIds:defeatedIds,experienceGained:0,levelsGained:0,reason:status}};
      state=normalizeState(result.state);companionExperience.push({...reward,receipt:clone(result.receipt)});
    }
    state.遭遇.列表[encounter.id].expeditionReward.companions=companionExperience;
    const currentPlayer=state.战斗单位.列表[player.id];
    if(escaped){
      const lost=loseTemporaryLoot(state,'战斗撤离',options,transactionId);
      return commit(state,transactionId,'结算远征战斗',{type:'expedition-failed',outcome,battleOutcome:outcome,reason:'战斗撤离',experience:experienceResult.receipt,companionExperience:companionExperience.map(r=>r.receipt),...lost,summary:'你已脱离战场，本次远征结束；临时收获遗失。'});
    }
    if(won && (currentPlayer.存活状态!=='存活'||currentPlayer.资源.生命.当前<=0)){
      const guide=firstEscort(activeExpedition(state,options));
      if(guide&&!dead){
        currentPlayer.存活状态='存活';currentPlayer.资源.生命.当前=Math.max(1,Math.ceil(currentPlayer.资源.生命.最大*.25));currentPlayer.资源.生命.临时=0;
        guide.rescueUsed=true;
        const history=completeExtraction(state,'victory-escort',options,transactionId);
        history.battleOutcome=outcome;
        state.远征.历史.at(-1).battleOutcome=outcome;
        return settleReturnedLoot(commit(state,transactionId,'结算远征战斗',{type:'expedition-escort-rescue',outcome,battleOutcome:outcome,experience:experienceResult.receipt,companionExperience:companionExperience.map(r=>r.receipt),...history,summary:'同伴赢下了战斗。大师将你护送回入口，已收集的物资一并带回；本房尚未采集的遗材与魂环留在原地。'}));
      }
      const lost=loseTemporaryLoot(state,'领队死亡而终止',options,transactionId);
      return commit(state,transactionId,'结算远征战斗',{type:'expedition-failed',outcome,battleOutcome:outcome,reason:'主角死亡而终止',experience:experienceResult.receipt,companionExperience:companionExperience.map(r=>r.receipt),...lost,summary:'同伴赢下了战斗，但你已失去生命；本次旅程终止。'});
    }
    if (!dead&&firstEscort(active) && (!player || player.存活状态 !== '存活' || player.资源.生命.当前 <= 0)) {
      if (currentPlayer) {
        currentPlayer.存活状态 = '存活';
        currentPlayer.资源.生命.当前 = Math.max(1,Math.ceil(currentPlayer.资源.生命.最大 * 0.25));
        currentPlayer.资源.生命.临时 = 0;
      }
      firstEscort(activeExpedition(state,options)).rescueUsed = true;
      const lost = loseTemporaryLoot(state,'玉小刚救援撤离',{...options,rescueUsed:true},transactionId);
      return commit(state, transactionId, '结算远征战斗', {
        type:'expedition-escort-rescue',outcome:'救援撤离',...lost,
        restoredHp:currentPlayer?.资源.生命.当前 ?? 0,
        summary:'你失去战斗能力后，玉小刚将你救回猎魂森林入口；本次临时战利品全部遗失，新手护航已使用。'
      });
    }
    if (!won) {
      const lost = loseTemporaryLoot(state, outcome || '战斗失败',options,transactionId);
      return commit(state, transactionId, '结算远征战斗', {type: 'expedition-failed', outcome, ...lost, summary: `远征因${outcome || '失败'}结束，临时战利品全部遗失`});
    }
    const reconciled = world.reconcileAftermath(state, battle.最近结算单 ?? {}, {});
    state = normalizeState(reconciled.state);
    let current = activeExpedition(state,options).currentRoom;
    current.remainsIds = Object.keys(state.战利品.遗骸列表).filter(id => current.roster.some(beast => beast.unitId === state.战利品.遗骸列表[id]?.unitId));
    for (const remainsId of current.remainsIds) {
      const itemId = state.战利品.遗骸列表[remainsId]?.soulBoneItemId;
      if (itemId) {
        state.物品.实例[itemId].payload.expeditionTemporary = true;
        current.roster.find(beast => beast.unitId === state.战利品.遗骸列表[remainsId].unitId).soulBoneItemId = itemId;
        activeExpedition(state,options).tempItemIds.push(itemId);
      }
    }
    activeExpedition(state,options).tempItemIds = unique(activeExpedition(state,options).tempItemIds);
    const discoveredSoulBones = activeExpedition(state,options).tempItemIds.map(itemId => state.物品.实例[itemId]).filter(item => item?.type === '魂骨').map(item => ({
      itemId:item.id,name:item.name,slot:item.payload?.slot ?? '',years:item.payload?.years ?? 0,ageTier:item.payload?.ageTier ?? item.quality ?? '',
      activeSkills:clone(item.payload?.activeSkills ?? []),temporary:true
    }));
    const experience = experienceResult;
    current = activeExpedition(state,options).currentRoom;
    activeExpedition(state,options).phase = 'postcombat';
    const departures=retainDepartedCompanions(state,activeExpedition(state,options),transactionId);
    const result=commit(state, transactionId, '结算远征战斗', {
      type: 'expedition-combat-won',expeditionId:active.id,actorId:active.leaderId,battleId:battle.id, outcome, nodeId: current.nodeId, remainsIds: current.remainsIds,
      soulBoneItemIds: current.roster.map(beast => beast.soulBoneItemId).filter(Boolean),
      soulBones: discoveredSoulBones,
      experience: experience.receipt,companionExperience:companionExperience.map(r=>r.receipt),departures,
      summary: `完成${current.type}，获得${experience.receipt.experienceGained}点战斗经验${companionExperience.length?`；${companionExperience.map(r=>`${state.人物.列表[r.recipientId]?.name??'同伴'}获得${r.receipt.experienceGained}经验${r.receipt.levelsGained?`，升至${r.receipt.level}级`:''}`).join('；')}`:''}${discoveredSoulBones.length ? `，发现${discoveredSoulBones.length}块临时魂骨（安全撤离后才能融合）` : ''}，进入战后处理`
    });
    let collected=result.state;
    const harvestActors=expeditions.participantIds(activeExpedition(collected,options),{presentOnly:true}).filter(actorId=>{try{assertExpeditionActor(collected,activeExpedition(collected,options),actorId,['gesture']);return true;}catch{return false;}});
    if(harvestActors.length)for(const beast of current.roster)if(collected.战斗单位.列表[beast.unitId]?.存活状态==='死亡'&&!activeExpedition(collected,options).currentRoom.harvestedUnitIds.includes(beast.unitId)){
      collected=harvestBeast(collected,beast.unitId,{...options,actorId:harvestActors[0]},`${transactionId}:harvest:${beast.unitId}`).state;
    }
    return {...result,state:collected};
  }

  function materialFingerprint(profile, quality) {
    return stableHash(JSON.stringify({sourceGroup: profile.sourceGroup, categories: [...profile.categories].sort(), attributeSpectrum: profile.attributeSpectrum, channels: [...profile.channels].sort(), quality})).toString(16).padStart(8, '0');
  }

  function addTempMaterial(state, profile, quality, quantity, provenance,active) {
    const fingerprint = materialFingerprint(profile, quality);
    const unitValue = Math.max(1, Math.floor(profile.structureCost * 10 * QUALITY_MULTIPLIERS[quality]));
    active.tempMaterials[fingerprint] ??= {
      fingerprint, displayName: profile.displayName, description:profile.description??'', appearancePart:profile.appearancePart, sourceGroup: profile.sourceGroup, categories: clone(profile.categories),
      attributeSpectrum: clone(profile.attributeSpectrum), channels: clone(profile.channels), traits: clone(profile.traits), weaknesses: clone(profile.weaknesses),
      quality, structureCost: profile.structureCost, unitValue, quantity: 0, provenance: []
    };
    active.tempMaterials[fingerprint].quantity += quantity;
    active.tempMaterials[fingerprint].provenance.push(clone(provenance));
    return active.tempMaterials[fingerprint];
  }

  function harvestBeast(rawState, beastUnitIdInput, options = {}, transactionId = 'harvest-expedition-beast') {
    const guard = beginTransaction(rawState, transactionId, '采集远征魂兽',{...options,beastUnitId:beastUnitIdInput});
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    const active = activeExpedition(state,options),actorId=options.actorId??active.leaderId;
    assertExpeditionActor(state,active,actorId,['gesture']);
    const room = active?.currentRoom;
    if (!active || active.phase !== 'postcombat' || !room) throw new Error('当前不在远征战后处理阶段');
    const beastUnitId = clean(beastUnitIdInput);
    const beast = room.roster.find(item => item.unitId === beastUnitId);
    if (!beast || state.战斗单位.列表[beastUnitId]?.存活状态 !== '死亡') throw new Error('目标不是本房间已击杀魂兽');
    if (room.harvestedUnitIds.includes(beastUnitId)) throw new Error('该魂兽已经采集');
    const remains = Object.values(state.战利品.遗骸列表).find(item => item.unitId === beastUnitId);
    if(!remains || remains.扩展?.expeditionId!==active.id || remains.扩展?.roomId!==room.nodeId)throw Error('采集缺少本房间的实际遗骸');
    const integrity = clamp(remains.integrity, 0, 1);
    if(options.integrity!==undefined && Number(options.integrity)!==integrity)throw Error('不能改写实际遗骸完整度');
    const efficiency = integrity;
    const harvestBudget = Math.floor(beast.monsterValue * 0.60 * efficiency);
    const quality = integrity >= 0.85 ? '优良' : integrity >= 0.55 ? '普通' : '受损';
    const batches = [];
    const pricedProfiles = beast.materialProfiles.map((profile,index) => ({...clone(profile),key:clean(profile.id,`harvest-${index + 1}`),unitValue:Math.max(1,Math.floor(profile.structureCost * 10 * QUALITY_MULTIPLIERS[quality]))}));
    const allocation = world.allocateWholeUnitBudget(harvestBudget,pricedProfiles,{seed:`${active.id}:${room.nodeId}:${beastUnitId}:harvest`});
    for (const row of allocation.allocations) {
      const profile = row.entry;
      const stack = addTempMaterial(state, profile, quality, row.quantity, {expeditionId: active.id, nodeId: room.nodeId, beastUnitId, remainsId: remains?.id ?? ''},active);
      batches.push({fingerprint: stack.fingerprint, displayName: stack.displayName, quantity:row.quantity, unitValue:row.unitValue, value:row.value, quality});
    }
    room.harvestedUnitIds.push(beastUnitId);
    if (remains) {remains.harvested = true;remains.harvestedBy = actorId;remains.harvestReceiptId = transactionId;}
    active.acquiredBaseValue += batches.reduce((sum, batch) => sum + batch.value, 0);
    active.expectedShopAcquisition = estimateMaterialSaleGold(active.tempMaterials);
    return commit(state, transactionId, '采集远征魂兽', {type: 'expedition-beast-harvested',expeditionId:active.id,nodeId:room.nodeId,actorId, beastUnitId, monsterValue: beast.monsterValue, integrity, efficiency, harvestBudget, harvestedValue: allocation.spent, unconvertedRemainder: allocation.remainder, batches, summary: `采集${beast.name}获得${batches.length}批材料，基准价值${allocation.spent}金币，未折算余值${allocation.remainder}`});
  }

  function chestProfiles(active, room) {
    const rng = makeRng(`${active.seed}:${room.nodeId}:chest`);
    const difficulty = difficultyProfile(active.difficultyId);
    const dungeon = dungeonProfile(active.dungeonId);
    const count = rng.int(2, 3);
    const normalMaterialExpectation = Math.floor(difficulty.baseRoomBudget * layerFactor(room.layer, difficulty.routeLayers) * 0.60);
    const budget = Math.floor(normalMaterialExpectation * 0.75);
    const profiles = [];
    for (let index = 0; index < count; index += 1) {
      const attribute = rng.pick(dungeon.rewardAttributes.filter(name => attributeNames.includes(name))) ?? rng.pick(attributeNames.filter(name => name !== '物理')) ?? '生命';
      const spectrum = Object.fromEntries(attributeNames.map(name => [name, name === attribute ? rng.int(25, 65) : 0]));
      const ecology = ecologyProfile(dungeon);
      const registeredCategories = [...(ecology.biologicalCategoryIds ?? []),...(ecology.anatomyCategoryIds ?? [])]
        .map(id => foundation.MARTIAL_SOUL_CORE.CATEGORY_REGISTRY[id]?.name).filter(name => categoryNames.includes(name));
      const category = rng.pick(registeredCategories) ?? rng.pick(categoryNames) ?? '晶体';
      profiles.push({
        id: `${room.nodeId}-chest-${index + 1}`, displayName: `${dungeon.regionLabel}·${attribute}${category}素材`, sourceGroup: `${dungeon.id}-chest-${active.difficultyId}`,
        categories: [category], attributeSpectrum: spectrum, channels: [channelForAttribute(attribute)], traits: ['地域封存'], weaknesses: [], structureCost: 3 + Math.ceil(spectrum[attribute] / 35)
      });
    }
    return {budget, profiles};
  }

  function openChest(rawState, transactionId = 'open-expedition-chest',options={}) {
    const guard = beginTransaction(rawState, transactionId, '开启远征宝箱',options);
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    const active = activeExpedition(state,options);
    assertExpeditionActor(state,active,options.actorId??active.leaderId,['gesture']);
    const room = active?.currentRoom;
    if (!active || active.phase !== 'interaction' || room?.type !== '宝箱' || room.opened) throw new Error('当前没有可开启宝箱');
    const generated = clone(active.map.nodes[room.nodeId]?.chest);
    if(!generated)throw new Error('宝箱内容缺失，请检查本次探索');
    const batches = [];
    const pricedProfiles = generated.profiles.map((profile,index) => {
      const quality = index === 0 ? '优良' : '普通';
      return {...clone(profile),key:clean(profile.id,`chest-${index + 1}`),quality,unitValue:Math.floor(profile.structureCost * 10 * QUALITY_MULTIPLIERS[quality])};
    });
    const allocation = world.allocateWholeUnitBudget(generated.budget,pricedProfiles,{seed:`${active.id}:${room.nodeId}:chest-allocation`});
    for (const row of allocation.allocations) {
      const profile = row.entry;
      const stack = addTempMaterial(state, profile, profile.quality, row.quantity, {expeditionId: active.id, nodeId: room.nodeId, source: 'chest'},active);
      batches.push({fingerprint: stack.fingerprint, displayName: stack.displayName, quality:profile.quality, quantity:row.quantity, unitValue:row.unitValue, value:row.value});
    }
    room.opened = true;
    active.acquiredBaseValue += batches.reduce((sum, batch) => sum + batch.value, 0);
    active.expectedShopAcquisition = estimateMaterialSaleGold(active.tempMaterials);
    return commit(state, transactionId, '开启远征宝箱', {type: 'expedition-chest-opened',expeditionId:active.id,actorId:options.actorId??active.leaderId, nodeId: room.nodeId, chestBudget: generated.budget, acquiredValue: allocation.spent, unconvertedRemainder: allocation.remainder, batches, summary: `宝箱中取得${batches.length}批材料，未折算余值${allocation.remainder}`});
  }

  function useCampfire(rawState, transactionId = 'use-expedition-campfire',options={}) {
    const guard = beginTransaction(rawState, transactionId, '使用远征火堆',options);
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    const active = activeExpedition(state,options);
    assertExpeditionActor(state,active,options.actorId??active.leaderId);
    const room = active?.currentRoom;
    if (!active || active.phase !== 'interaction' || room?.type !== '火堆' || room.campUsed) throw new Error('当前没有可用火堆');
    const {unit} = playerContext(state,active.leaderId);
    if(unit.存活状态!=='存活'||unit.资源.生命.当前<=0)throw Error('领队当前无法使用火堆');
    const before = {health: unit.资源.生命.当前, soulPower: unit.资源.魂力.当前};
    const restorations=[];
    const healthRestore = Math.floor(unit.资源.生命.最大 * 0.30);
    const soulRestore = Math.floor(unit.资源.魂力.最大 * 0.30);
    unit.资源.生命.当前 = Math.min(unit.资源.生命.最大, unit.资源.生命.当前 + healthRestore);
    unit.资源.魂力.当前 = Math.min(unit.资源.魂力.最大, unit.资源.魂力.当前 + soulRestore);
    restorations.push({unitId:unit.id,before,after:{health:unit.资源.生命.当前,soulPower:unit.资源.魂力.当前}});
    for(const companion of active.companions??[]) {
      const ally=state.战斗单位.列表[companion.unitId];
      if(!companion.active || !ally || ally.存活状态!=='存活' || ally.资源.生命.当前<=0)continue;
      const allyBefore={health:ally.资源.生命.当前,soulPower:ally.资源.魂力.当前};
      for(const key of ['生命','魂力'])ally.资源[key].当前=Math.min(ally.资源[key].最大,ally.资源[key].当前+Math.floor(ally.资源[key].最大*0.3));
      restorations.push({unitId:ally.id,before:allyBefore,after:{health:ally.资源.生命.当前,soulPower:ally.资源.魂力.当前}});
    }
    room.campUsed = true;
    return commit(state, transactionId, '使用远征火堆', {type: 'expedition-campfire-used', nodeId: room.nodeId, before, after: {health: unit.资源.生命.当前, soulPower: unit.资源.魂力.当前}, restorations, summary: '火堆为存活队员恢复30%最大生命与30%最大魂力' });
  }

  function condenseCurrentRing(rawState, beastUnitId, transactionId = 'condense-expedition-ring',options={}) {
    const state = normalizeState(rawState);
    const actorId=options.actorId??state.角色.主控单位ID;
    const prior=state.魂环.operations?.[transactionId];
    if(prior)return cycle.condenseRing(state,{...options,actorId,beastUnitId},transactionId);
    const active = activeExpedition(state,options);
    if (!active || active.phase !== 'postcombat' || !active.currentRoom?.roster.some(beast => beast.unitId === beastUnitId)) throw new Error('只能处理当前房间魂兽的魂环');
    assertExpeditionActor(state,active,actorId);
    return cycle.condenseRing(state,{...options,actorId,beastUnitId},transactionId);
  }

  function absorbCurrentRing(rawState, proposal, transactionId = 'absorb-expedition-ring') {
    const state = normalizeState(rawState);
    const active = activeExpedition(state,proposal);
    if (!active || active.phase !== 'postcombat') throw new Error('只能在战后处理阶段吸收魂环');
    const result = cycle.absorbRing(state, proposal, transactionId);
    return {state: normalizeState(result.state), receipt: result.receipt, idempotent: result.idempotent};
  }

  function previewRingChoice(rawState, proposal = {}) {
    const state = normalizeState(rawState);
    const actorId=proposal.actorId??state.角色.主控单位ID;
    const quote = cycle.previewRingAbsorption(state,proposal);
    const reasons = [...quote.reasons];
    const block = world.worldActionBlockReason(state,{actorId,allowActivities:['expedition']});
    if (block) reasons.unshift(block);
    const active = expeditions.forActor(state,actorId);
    if(proposal.expeditionId&&proposal.expeditionId!==active?.id)reasons.push('指定远征与实际人物不符');
    if (active) {
      if (active.phase !== 'postcombat' || !active.currentRoom?.roster.some(beast => beast.unitId === quote.beastUnitId)) reasons.push('只能在战后处理当前房间的魂环');
    } else {
      const remains = Object.values(state.战利品.遗骸列表).find(item => item.unitId === quote.beastUnitId);
      if (!remains || remains.locationId !== positions.positionOf(state,actorId).locationId||positions.positionOf(state,actorId).sceneId) reasons.push('请回到这只魂兽的遗骸所在地点');
      else if (world.isExpeditionRemains(state,remains)) reasons.push('这枚魂环留在已经离开的副本房间，无法在入口吸收');
    }
    return {...quote,pass:!reasons.length,reasons:unique(reasons)};
  }

  function prepareRingChoice(rawState, proposal = {}, transactionId = 'prepare-ring-from-beast') {
    const guard = beginTransaction(rawState,transactionId,'准备魂环吸收',proposal);
    if (guard.duplicate) return {state:guard.state,receipt:guard.receipt,idempotent:true};
    let state = guard.state;
    const quote = previewRingChoice(state,proposal);
    if (!quote.pass) throw new Error(quote.reasons.join('；'));
    if (quote.pendingId) {
      cycle.prepareRingSkillChoice(state,{...proposal,lootId:quote.lootId,martialSoulId:quote.martialSoulId},`${transactionId}:check-retained`);
      return {...commit(state,transactionId,'准备魂环吸收',{type:'ring-skill-choice-prepared',pendingId:quote.pendingId,lootId:quote.lootId,summary:'魂技方案已经保留，可以继续选择'}),idempotent:true};
    }
    if (!quote.condensed) {
      const result = expeditions.forActor(state,proposal.actorId??state.角色.主控单位ID)
        ? condenseCurrentRing(state,quote.beastUnitId,`${transactionId}:condense`,proposal)
        : cycle.condenseRing(state,{...proposal,beastUnitId:quote.beastUnitId},`${transactionId}:condense`);
      state = result.state;
    }
    const result=cycle.prepareRingSkillChoice(state,{...proposal,lootId:quote.lootId,martialSoulId:quote.martialSoulId},transactionId);
    return commit(normalizeState(result.state),transactionId,'准备魂环吸收',result.receipt);
  }

  function transferMaterialStacks(state, source, destination) {
    for (const [fingerprint, stack] of Object.entries(source)) {
      destination[fingerprint] ??= {...clone(stack), quantity: 0, provenance: []};
      destination[fingerprint].quantity += stack.quantity;
      destination[fingerprint].provenance.push(...clone(stack.provenance ?? []));
    }
  }

  function moveTemporaryItemsToSafety(state, active) {
    const {playerId, inventory} = playerContext(state,active.leaderId);
    const moved = [];
    const stashed = [];
    for (const itemId of active.tempItemIds) {
      const item = state.物品.实例[itemId];
      if (!item) continue;
      const placement = world.previewItemPlacement(state,inventory.id,{templateId:item.templateId,transferItemId:item.id});
      if (placement.pass) {
        world.transferItem(state, itemId, inventory.id, item.quantity);
        item.ownerEntityId = playerId;
        item.legalOwnerEntityId = playerId;
        delete item.payload.expeditionTemporary;
        item.payload.safelyExtracted = true;
        moved.push(itemId);
      } else {
        const locationId = clean(active.entranceLocationId,DUNGEON_PROFILES[active.dungeonId]?.locationId ?? ENTRANCE_LOCATION_ID);
        world.storeItem(state,itemId,playerId,locationId);
        item.legalOwnerEntityId = playerId;
        state.材料库.入口暂存物品ID列表.push(itemId);
        delete item.payload.expeditionTemporary;
        item.payload.safelyExtracted = true;
        item.payload.entranceStash = true;
        stashed.push(itemId);
      }
    }
    state.材料库.入口暂存物品ID列表 = unique(state.材料库.入口暂存物品ID列表);
    return {moved, stashed};
  }

  // Reading another person's stock never creates a material account.
  function personMaterials(state,id=state.角色?.主控单位ID){return id===state.角色?.主控单位ID?state.材料库?.永久??{}:state.材料库?.人物?.[id]??{};}
  function researchActor(state,options={}){const actorId=options.actorId??state.角色?.主控单位ID;playerContext(state,actorId);return actorId;}
  function assertResearchOwner(state,pending,actorId){if(!pending||pending.actorId!==actorId||!state.人物?.列表?.[actorId])throw Error('只能查看和操作本人的研发项目');return pending;}
  function assertBlueprintOwner(state,blueprint,actorId){if(!blueprint||blueprint.ownerId!==actorId||!state.人物?.列表?.[actorId])throw Error('只能使用本人掌握的研发图纸');return blueprint;}
  function researchRequest(state,options,fields){
    if(fields.request&&['actorId','entityId','recipientId','ownerId','decisionOrigin','decisionReason'].some(key=>Object.hasOwn(fields.request,key)))throw Error('研发请求不能指定其他主体或决定来源');
    return {actorId:researchActor(state,options),...clone(fields),...(options.decisionOrigin?{decisionOrigin:clone(options.decisionOrigin)}:{}),...(options.decisionReason!==undefined?{decisionReason:options.decisionReason}:{})};
  }
  function requireResearchAction(state,actorId){controls.assertAction(state,actorId,'requirements',{requirements:['gesture','focus']});return requireLocalService(state,'基础工坊',actorId);}
  function materialsForPerson(state,id){return id===state.角色.主控单位ID?state.材料库.永久:((state.材料库.人物??={})[id]??={});}
  function assertTemporaryItem(state,active,id){
    const item=state.物品.实例[id],remains=state.战利品.遗骸列表[item?.payload?.provenance?.remainsId];
    const roomId=remains?.扩展?.roomId,node=active.map.nodes[roomId];
    if(!item||!remains||remains.扩展?.expeditionId!==active.id||remains.soulBoneItemId!==id||item.type!=='魂骨'||item.payload?.expeditionTemporary!==true||item.containerId!==remains.containerId||item.ownerEntityId||item.boundToEntityId||!node?.encounter?.roster.some(b=>b.unitId===remains.unitId&&b.profileId===remains.profileId))throw Error('临时物品缺少本次远征的实际遗骸与掉落来源');
  }
  function validateExpeditionRecords(state,pendingId=''){
    const errors=[...loot.validate(state),...validateHirePayments(state,pendingId),...validateNpcExpeditionGoals(state),...validateSupplyPurchases(state)],records=state.远征?.processedTransactions??{},sources=state.远征?.commandRequests??{},itemIds=new Set();
    for(const id of new Set([...Object.keys(records),...Object.keys(sources)]))try{
      const r=records[id],s=sources[id];if(id===pendingId&&!r&&s&&s.requestHash===abilities.hash(s.request))continue;
      if(!r||!s||r.id!==id||r.transactionType!==s.type||s.requestHash!==abilities.hash(s.request))throw Error(`远征永久事务请求与结算不一致：${id}`);
      if(r.type==='expedition-combat-won'){
        if(!Array.isArray(r.departures)||new Set(r.departures.map(d=>d.unitId)).size!==r.departures.length)throw Error('战后离场登记无效');
        const encounter=Object.values(state.遭遇?.列表??{}).find(e=>e.battleId===r.battleId),start=Object.values(records).find(v=>v.type==='expedition-started'&&v.expeditionId===r.expeditionId);
        const expected=(start?.companions??[]).filter(c=>['escaped','removed'].includes(encounter?.terminal?.memberStatuses?.[c.unitId])).map(c=>c.unitId).sort();
        if(!encounter||!start||abilities.hash(expected)!==abilities.hash(r.departures.map(d=>d.unitId).sort()))throw Error('离场登记与原出发及战斗终局不符');
        for(const departure of r.departures){
          const agreement=state.人物?.列表?.[departure.unitId]?.扩展?.同行约定?.find(a=>a.id===departure.agreementId),events=agreement?.events.filter(e=>e.status==='departed'&&e.settlementId===id)??[];
          if(events.length!==1)throw Error('永久战果缺少对应离场历史');
          globalThis.SoulCooperationCore.departureProof(state,departure.unitId,departure.agreementId,events[0]);
        }
      }
      if(r.type==='expedition-person-withdrawn'){
        const agreement=state.人物?.列表?.[r.actorId]?.扩展?.同行约定?.find(a=>a.id===r.agreementId),event=agreement?.events[r.originEventIndex],dungeon=DUNGEON_PROFILES[agreement?.dungeonId];
        if(s.request.actorId!==r.actorId||s.request.agreementId!==r.agreementId||agreement?.personId!==r.actorId||!['departed','completed'].includes(event?.status)||event.expeditionId!==r.expeditionId||!agreement.events.some(e=>e.status==='active'&&e.expeditionId===r.expeditionId)||abilities.hash(event.position??event.leftAt)!==abilities.hash(r.from)||!dungeon||r.destinationId!==dungeon.locationId||r.from.locationId!==dungeon.locationId||!r.from.sceneId.startsWith(`expedition:${r.expeditionId}:`)||r.to.kind!=='location'||r.to.sceneId!==''||r.to.locationId!==dungeon.locationId||r.available!==true||r.reason!=='')throw Error('个人撤出缺少本人原现场与出发来源');
        personalWithdrawalOrigin(state,agreement,event);
      }
    }catch(e){errors.push(e.message);}
    for(const active of expeditions.instances(state))try{
      errors.push(...validateMap(active.map).errors);
      for(const c of active.companions){
        globalThis.SoulCooperationCore.tripAgreement(state,active,c);
        const p=state.人物.列表[c.unitId],record=p?.扩展?.同行约定?.find(r=>r.id===c.agreementId),event=record?.events.at(-1);
        if(!record||record.playerId!==active.leaderId||record.personId!==c.unitId||record.dungeonId!==active.dungeonId||!record.events.some(e=>e.status==='active'&&e.expeditionId===active.id))throw Error('远征成员缺少原出发记录');
        const outing=record.events.findLast(e=>e.status==='active'&&e.expeditionId===active.id),outingRef=outing.arrivalRef??outing.bodyOutingRef??null;if(abilities.hash(c.bodyOutingRef??null)!==abilities.hash(outingRef))throw Error('同行席位的真身来源被替换');if(outingRef)globalThis.SoulCombatDeployments.outingRefProof(state,outingRef,c.unitId,active.leaderId);
        if(c.active){
          if(record.status!=='active'||event?.status!=='active'||event.expeditionId!==active.id)throw Error('在场成员与原同行事件不符');
          const departed=record.events.findLast(e=>e.status==='departed');
          if(departed){
            globalThis.SoulCooperationCore.departureProof(state,c.unitId,c.agreementId,departed);
            if(event.arrivalRef){globalThis.SoulCombatDeployments.rejoinProof(state,c.unitId,active.leaderId,event,departed);continue;}
            const authority=globalThis.SoulCooperationCore.table(state).events.find(e=>e.id===event.authorityEventId);
            if(!authority||authority.sourceId!==event.sourceId||authority.agreementId!==event.cooperationId||authority.record.status!=='active'||authority.record.memberId!==c.unitId||authority.record.leaderId!==active.leaderId||!['accepted','imposed','renewed'].includes(authority.kind)||event.order!==authority.order||!Number.isSafeInteger(departed.order)||authority.order<=departed.order||abilities.hash(authority.positions?.[c.unitId])!==abilities.hash(departed.position)||abilities.hash(authority.positions?.[active.leaderId])!==abilities.hash(departed.position))throw Error('恢复席位缺少本人原现场的真实合作来源');
          }
        }
        else{
          if(record.status!=='departed'||event?.expeditionId!==active.id)throw Error('离场成员与原同行事件不符');
          const departure=globalThis.SoulCooperationCore.departureProof(state,c.unitId,c.agreementId,event);
          const returned=Object.values(records).some(r=>r.type==='expedition-person-withdrawn'&&r.actorId===c.unitId&&r.agreementId===c.agreementId&&r.expeditionId===active.id);
          if(!returned&&abilities.hash(positions.positionOf(state,c.unitId))!==abilities.hash(departure.destination??event.position))throw Error('离场人物无正式撤出记录而离开原现场');
        }
      }
      if(!Array.isArray(active.tempItemIds)||!plain(active.tempMaterials))throw Error('远征临时收获表无效');
      for(const id of active.tempItemIds){if(itemIds.has(id))throw Error('临时物品同时属于不同远征');itemIds.add(id);assertTemporaryItem(state,active,id);}
      const sums={};
      for(const r of Object.values(records).filter(r=>r.expeditionId===active.id&&['expedition-beast-harvested','expedition-chest-opened'].includes(r.type)))for(const b of r.batches){const row=sums[b.fingerprint]??={quantity:0,unitValue:b.unitValue};if(row.unitValue!==b.unitValue)throw Error('临时材料单价不一致');row.quantity+=b.quantity;}
      if(Object.keys(sums).length!==Object.keys(active.tempMaterials).length)throw Error('临时材料缺少本次采集或开箱结算');
      let value=0;
      for(const [key,stack] of Object.entries(active.tempMaterials)){
        if(key!==materialFingerprint(stack,stack.quality)||stack.fingerprint!==key||!Number.isSafeInteger(stack.quantity)||stack.quantity<=0||sums[key]?.quantity!==stack.quantity||sums[key]?.unitValue!==stack.unitValue)throw Error('临时材料与本次实际收获不一致');value+=stack.quantity*stack.unitValue;
      }
      if(value!==active.acquiredBaseValue||active.expectedShopAcquisition!==estimateMaterialSaleGold(active.tempMaterials))throw Error('临时材料价值汇总不一致');
    }catch(e){errors.push(e.message);}
    return unique(errors);
  }

  function completeExtraction(state, reason,options={},transactionId='') {
    const active = activeExpedition(state,options);
    if (!active) throw new Error('没有进行中的远征');
    const invalid=validateExpeditionRecords(state,transactionId);if(invalid.length)throw Error(invalid.join('；'));
    const {person} = playerContext(state,active.leaderId);
    const entranceLocationId = clean(active.entranceLocationId, DUNGEON_PROFILES[active.dungeonId]?.locationId ?? ENTRANCE_LOCATION_ID);
    if(foregroundExpedition(state,active))state.地图.当前地点ID = entranceLocationId;
    if(person.status!=='dead'){positions.placePerson(state,person.id,{locationId:entranceLocationId,spaceId:''});}
    const companions = consumeCompanions(state,active,false,reason==='boss-cleared'?'cleared':'extracted',transactionId);
    removeExpedition(state,active);
    const materialValue = Object.values(active.tempMaterials).reduce((sum, stack) => sum + stack.unitValue * stack.quantity, 0);
    const allocation=loot.settleMaterials(state,active);
    if(!allocation)transferMaterialStacks(state, active.tempMaterials, materialsForPerson(state,active.leaderId));
    const items=allocation?{moved:[],stashed:[]}:moveTemporaryItemsToSafety(state,active);
    if(allocation)for(const id of active.tempItemIds){const item=state.物品.实例[id];if(!item)continue;loot.settleItem(state,active,allocation,item);
      const entry=allocation.items.at(-1);if(entry.personId===active.lootAgreement.playerId){if(state.容器.列表[item.containerId].type==='location-stash')items.stashed.push(id);else items.moved.push(id);}
    }
    const history = {id: active.id,leaderId:active.leaderId,participantIds:expeditions.participantIds(active), dungeonId:active.dungeonId, dungeonName:active.dungeonName, entranceLocationId, difficultyId: active.difficultyId, result: reason === 'boss-cleared' ? 'cleared' : 'extracted', reason, completedNodeIds: [...active.completedNodeIds], materialValue, movedItemIds: items.moved, stashedItemIds: items.stashed, companions,allocationId:allocation?.id??null};
    state.远征.扩展 ??= {};
    state.远征.扩展.completedDungeons ??= {};
    if (active.leaderId===state.角色.主控单位ID&&active.completedNodeIds.length) state.远征.扩展.completedDungeons[active.dungeonId] = {firstExpeditionId:state.远征.扩展.completedDungeons[active.dungeonId]?.firstExpeditionId ?? active.id,latestDifficultyId:active.difficultyId};
    state.远征.历史.push(history);
    state.远征.历史 = state.远征.历史.slice(-30);
    if(foregroundExpedition(state,active)){state.场景.强制现场绑定=false;state.场景.当前魂兽ID='';state.场景.状态=reason==='boss-cleared'?'首领击破并安全撤离':'主动安全撤离';}
    return {...history, expeditionId:active.id, allocation:clone(allocation), materialStackCount: Object.keys(materialsForPerson(state,active.leaderId)).length};
  }

  function roomCompletionContext(state,options={}) {
    const active = activeExpedition(state,options);
    const room = active?.currentRoom;
    if (!active || !room || !['postcombat', 'interaction'].includes(active.phase)) throw new Error('当前房间尚不能结束');
    return {active,room};
  }

  function extractionContext(state,options={}) {
    const active = activeExpedition(state,options);
    if (!active || !['awaiting-room','postcombat','interaction'].includes(active.phase) || expeditionBattle(state,active)?.状态==='进行中') throw new Error('当前房间尚在准备或战斗中，暂不能安全撤离');
    if((options.actorId??state.角色.主控单位ID)!==active.leaderId)throw Error('只有实际领队可以决定远征撤离');
    assertExpeditionMovement(state,undefined,options);
    return active;
  }

  function previewRoomActions(rawState,options={}) {
    const state = normalizeState(rawState);
    let active;try{active=activeExpedition(state,options);}catch{}
    const finish = {available:false,reasons:[],losses:[],boss:false};
    const extract = {available:false,reasons:[],losses:[]};
    try {
      const {room} = roomCompletionContext(state,options);
      finish.available = true;
      finish.boss = room.type === '首领战斗';
      for (const beast of room.roster ?? []) {
        if (state.战斗单位.列表[beast.unitId]?.存活状态 !== '死亡') continue;
        if (!room.harvestedUnitIds.includes(beast.unitId)) finish.losses.push({kind:'materials',beastUnitId:beast.unitId,name:beast.name});
        const profile = state.魂兽档案.列表[beast.profileId];
        if (profile && ['无','待吸收'].includes(profile.魂环状态)) {
          const pending = Object.values(state.魂环.待选择).find(item => item.status === 'pending' && item.beastProfileId === profile.id);
          const condensed=Object.values(state.战利品.列表??{}).some(loot=>loot?.类型==='魂环胚胎'&&loot.状态==='待吸收'&&loot.来源魂兽档案ID===profile.id);
          const usable=Boolean(pending)||condensed||expeditions.participantIds(active,{presentOnly:true}).some(actorId=>(state.成长.列表[actorId]?.武魂ID列表??[]).some(martialSoulId=>cycle.ringAdvancementEligibility(state,actorId,martialSoulId).pass&&previewRingChoice(state,{actorId,unitId:actorId,martialSoulId,beastUnitId:beast.unitId}).pass));
          if(usable)finish.losses.push({kind:'ring',beastUnitId:beast.unitId,name:profile.名称,years:profile.年限,pendingId:pending?.id ?? ''});
        }
      }
      if (room.type === '火堆' && !room.campUsed) finish.losses.push({kind:'camp',name:'尚未使用的火堆'});
      if (room.type === '宝箱' && !room.opened) finish.losses.push({kind:'chest',name:'尚未开启的宝箱'});
    } catch (error) { finish.reasons.push(String(error.message)); }
    try { extractionContext(state,options); extract.available = true; extract.losses=clone(finish.losses); }
    catch (error) { extract.reasons.push(String(error.message)); }
    const movement={available:true,reasons:[]};
    try{assertExpeditionMovement(state,undefined,options);}catch(error){movement.available=false;movement.reasons.push(String(error.message));}
    if(!movement.available){finish.available=false;finish.reasons.push(...movement.reasons);}
    const availableNodeIds=!movement.available?[]:active?.phase === 'awaiting-room' ? availableNextIds(active) : finish.available&&!finish.boss ? active.map.edges.filter(edge=>edge.from===active.currentNodeId).map(edge=>edge.to) : [];
    const bossAhead=availableNodeIds.some(id=>active.map.nodes[id]?.type==='首领战斗');
    return {finish,extract,movement,availableNodeIds,readiness:bossAhead?teamReadiness(state,active.leaderId):[]};
  }

  function retainDepartedCompanions(state,active,settlementId) {
    const battle=expeditionBattle(state,active),departures=[];
    for(const companion of active.companions)if(companion.active&&['escaped','removed'].includes(battle?.扩展?.成员?.[companion.unitId]?.status)){
      const position=clone(positions.positionOf(state,companion.unitId));positions.placePerson(state,companion.unitId,{locationId:position.locationId,spaceId:position.sceneId});companion.active=false;
      const battleStatus=battle.扩展.成员[companion.unitId].status;
      recordCompanionAgreement(state,companion,'departed',{expeditionId:active.id,battleId:battle.id,encounterId:active.currentRoom.encounterId,position,battleStatus,settlementId,order:people.nextEventOrder(state)});
      departures.push({unitId:companion.unitId,agreementId:companion.agreementId,position,battleStatus});
    }
    if(state.远征.当前===active&&!foregroundExpedition(state,active)){state.远征.sessions[active.id]=active;state.远征.当前=null;}
    return departures;
  }

  function closeCurrentRoom(state,options={}) {
    const {active,room} = roomCompletionContext(state,options);
    const abandoned = previewRoomActions(state,options).finish.losses;
    for (const loot of Object.values(state.战利品.列表)) {
      if (loot?.类型 !== '魂环胚胎' || loot?.状态 !== '待吸收') continue;
      const profile = state.魂兽档案.列表[loot.来源魂兽档案ID];
      if (room.roster.some(beast => beast.profileId === profile?.id)) {
        loot.状态 = '消散';
        profile.魂环状态 = '消散';
        for (const [pendingId,pending] of Object.entries(state.魂环?.待选择 ?? {})) {
          if (pending?.sourceLootId === loot.id) delete state.魂环.待选择[pendingId];
        }
      }
    }
    for (const beast of room.roster ?? []) {
      const profile = state.魂兽档案.列表[beast.profileId];
      if (profile?.魂环状态 === '无') profile.魂环状态 = '消散';
    }
    if(foregroundExpedition(state,active)){state.场景.强制现场绑定 = Boolean(pendingRingLoot(state));
    state.场景.当前魂兽ID = '';
    if (!state.场景.强制现场绑定) state.场景.状态 = '房间探索完成';}
    active.map.nodes[room.nodeId].status = 'completed';
    active.completedNodeIds.push(room.nodeId);
    active.lastResolvedNodeId = room.nodeId;
    const wasBoss = room.type === '首领战斗';
    active.currentNodeId = '';
    active.currentRoom = null;
    active.phase = 'awaiting-room';
    if(state.远征.当前===active&&!foregroundExpedition(state,active)){state.远征.sessions[active.id]=active;state.远征.当前=null;}
    return {active,room,abandoned,wasBoss};
  }

  function finishRoom(rawState, transactionId = 'finish-expedition-room',options={}) {
    const guard = beginTransaction(rawState, transactionId, '完成远征房间',options);
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    assertExpeditionActor(state,activeExpedition(state,options),options.actorId??state.角色.主控单位ID);
    assertExpeditionMovement(state,undefined,options);
    if(previewRoomActions(state,options).finish.losses.length&&!options.confirmAbandon)throw new Error('仍有未处理的收获，请先确认放弃内容');
    const {active,room,abandoned,wasBoss}=closeCurrentRoom(state,options);
    if (wasBoss) {
      const extraction = completeExtraction(state, 'boss-cleared',options,transactionId);
      return settleReturnedLoot(commit(state, transactionId, '完成远征房间', {type: 'expedition-cleared', ...extraction, abandoned, summary: '首领战后处理完成，全部战利品已安全带回并自动结算'}));
    }
    return commit(state, transactionId, '完成远征房间', {type: 'expedition-room-finished', nodeId: room.nodeId, roomType: room.type, availableNodeIds: availableNextIds(active), acquiredBaseValue: active.acquiredBaseValue, expectedShopAcquisition: active.expectedShopAcquisition, abandoned, summary: `完成${room.type}，可选择下一路线或安全撤离`});
  }

  function extractSafely(rawState, transactionId = 'extract-expedition-safely', options = {}) {
    const guard = beginTransaction(rawState, transactionId, '远征安全撤离',options);
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    const active=extractionContext(state,options);
    const abandoned=previewRoomActions(state,options).extract.losses;
    if(abandoned.length&&!options.confirmAbandon)throw new Error('仍有未处理的收获，请先确认放弃内容');
    const boss=active.currentRoom?.type==='首领战斗';
    if(active.currentRoom)closeCurrentRoom(state,options);
    const extraction = completeExtraction(state, boss?'boss-cleared':'safe-extract',options,transactionId);
    return settleReturnedLoot(commit(state, transactionId, '远征安全撤离', {type: 'expedition-safely-extracted', ...extraction, abandoned, summary: `安全撤离并带回收获，基准价值${extraction.materialValue}金币，已自动结算` }));
  }

  function personalWithdrawalOrigin(state,agreement,event){
    const personId=agreement.personId;
    if(event.status==='departed')return globalThis.SoulCooperationCore.departureProof(state,personId,agreement.id,event);
    const receipt=state.远征?.processedTransactions?.[event.settlementId],summary=receipt?.companions?.find(c=>c.unitId===personId&&c.agreementId===agreement.id);
    if(event.status!=='completed'||!['expedition-failed','expedition-escort-rescue','expedition-cleared','expedition-safely-extracted'].includes(receipt?.type)||receipt.expeditionId!==event.expeditionId||receipt.leaderId!==agreement.playerId||!summary?.leftAt||abilities.hash(summary.leftAt)!==abilities.hash(event.leftAt))throw Error('个人撤出缺少原返程结算与离场位置');
    if(summary.leftReason==='departed'){
      const prior=agreement.events.find(e=>e.status==='departed'&&e.expeditionId===event.expeditionId&&abilities.hash(e.position)===abilities.hash(event.leftAt));
      return globalThis.SoulCooperationCore.departureProof(state,personId,agreement.id,prior);
    }
    const encounter=state.遭遇?.列表?.[summary.encounterId];
    if(encounter?.expeditionId!==event.expeditionId||encounter.expeditionReward?.transactionId!==event.settlementId||abilities.hash(encounter.position)!==abilities.hash(event.leftAt)||!encounter.terminal?.participantIds.includes(personId))throw Error('个人撤出缺少原房间终局来源');
    if(summary.leftReason==='battle-withdrawal'){
      if(!['escaped','removed'].includes(encounter.terminal.memberStatuses?.[personId]))throw Error('个人撤出缺少实际退出战斗来源');
    }else if(summary.leftReason==='permission-lost'){
      const permission=globalThis.SoulCooperationCore.table(state).events.find(e=>e.id===summary.permissionEventId)?.record;
      if(!permission||permission.memberId!==personId||permission.leaderId!==agreement.playerId||permission.status==='active')throw Error('个人撤出缺少原合作失效来源');
    }else throw Error('个人撤出离场依据无效');
    return summary;
  }
  function personalWithdrawal(state,actorId=state.角色.主控单位ID){
    const person=state.人物?.列表?.[actorId];if(!person)return null;
    const position=positions.positionOf(state,actorId);if(position.kind!=='location'||!position.sceneId.startsWith('expedition:'))return null;
    const origin=(person.扩展?.同行约定??[]).flatMap(r=>r.events.map((e,index)=>({agreement:r,event:e,index}))).findLast(({agreement:r,event:e})=>r.personId===actorId&&e.expeditionId&&position.sceneId.startsWith(`expedition:${e.expeditionId}:`)&&(e.position??e.leftAt)&&abilities.hash(e.position??e.leftAt)===abilities.hash(position)&&['departed','completed'].includes(e.status));
    if(!origin)return null;
    const active=expeditions.forActor(state,actorId,{presentOnly:false}),dungeon=DUNGEON_PROFILES[origin.agreement.dungeonId];let reason='';
    try{
      personalWithdrawalOrigin(state,origin.agreement,origin.event);
      const block=world.worldActionBlockReason(state,{actorId,allowActivities:['expedition','encounter']});if(block)throw Error(block);
      controls.assertAction(state,actorId,'move');
      if(controls.active(state,actorId).some(st=>['status.sleep','status.stun'].includes(st.模板ID)))throw Error('本人无法清醒撤出');
      if(!dungeon||position.locationId!==dungeon.locationId||active?.companions.some(c=>c.unitId===actorId&&c.active))throw Error('本人尚未实际离开原队伍');
      const companion=active?.companions.find(c=>c.unitId===actorId),r=companion&&globalThis.SoulCooperationCore.tripAgreement(state,active,companion);
      if(r?.basis==='controlled'&&!globalThis.SoulCooperationCore.invalidReason(state,r))throw Error('原强制合作仍有效，须先实际解除或抵抗');
    }catch(error){reason=error.message;}
    return {actorId,expeditionId:origin.event.expeditionId,agreementId:origin.agreement.id,originEventIndex:origin.index,from:clone(position),destinationId:dungeon?.locationId,available:!reason,reason};
  }
  function withdrawPersonally(rawState,input={},transactionId='personal-expedition-withdrawal'){
    const actorId=input.actorId??rawState.角色.主控单位ID,request={actorId,agreementId:input.agreementId},tx=beginTransaction(rawState,transactionId,'个人撤出远征',request);
    if(tx.duplicate)return {state:tx.state,receipt:tx.receipt,idempotent:true};
    const state=tx.state,q=personalWithdrawal(state,actorId);if(!q||q.agreementId!==request.agreementId)throw Error('没有本人在原远征现场的退出记录');if(!q.available)throw Error(q.reason);
    const active=expeditions.forActor(state,actorId,{presentOnly:false}),companion=active?.companions.find(c=>c.unitId===actorId),r=companion&&globalThis.SoulCooperationCore.tripAgreement(state,active,companion);
    if(r&&['active','proposed','suspended'].includes(r.status))globalThis.SoulCooperationCore.execute(state,{type:'end-person-cooperation',actorId,cooperationId:r.id,reason:'本人撤出原远征现场'},transactionId,{});
    const person=state.人物.列表[actorId];positions.placePerson(state,actorId,{locationId:q.destinationId,spaceId:''});
    if(actorId===state.角色.主控单位ID)state.地图.当前地点ID=q.destinationId;
    return commit(state,transactionId,'个人撤出远征',{type:'expedition-person-withdrawn',...q,to:clone(positions.positionOf(state,actorId)),summary:`${person.name}已自行返回入口，原队伍的保留席位和财物记录继续保留。`});
  }

  function walletForPlayer(state) { return playerContext(state).wallet; }

  function listStoredItems(rawState) {
    const state = normalizeState(rawState);
    const {playerId} = playerContext(state);
    return Object.values(state.容器.列表).filter(container => container.type === 'location-stash' && container.ownerEntityId === playerId)
      .flatMap(container => container.itemIds.map(id => state.物品.实例[id]).filter(Boolean).map(item => {
        const quote=world.itemStorageAvailability(state,{actorId:playerId,itemId:item.id,quantity:item.quantity},true),position=world.itemStoragePosition(state,item.id);
        return {itemId:item.id,name:item.name,quantity:item.quantity,position,...world.storagePositionFacts(state,position),pass:quote.available,reason:quote.reason};
      }));
  }

  function claimStoredItem(rawState, itemIdInput, transactionId = 'claim-stored-item') {
    const guard = beginTransaction(rawState,transactionId,'领取暂存物品');
    if (guard.duplicate) return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state = guard.state;
    const quote = listStoredItems(state).find(entry => entry.itemId === clean(itemIdInput));
    if (!quote) throw new Error('没有这件待领取物品');
    if (!quote.pass) throw new Error(quote.reason);
    const {inventory} = playerContext(state);
    const item = world.transferItem(state,quote.itemId,inventory.id);
    delete item.payload.storedAtLocationId;
    delete item.payload.entranceStash;
    state.材料库.入口暂存物品ID列表 = state.材料库.入口暂存物品ID列表.filter(id => id !== item.id);
    return commit(state,transactionId,'领取暂存物品',{type:'stored-item-claimed',itemId:item.id,quantity:item.quantity,position:quote.position,...world.storagePositionFacts(state,quote.position),summary:`已从${quote.positionLabel}将${item.name}×${item.quantity}收入行囊`});
  }

  function supplyActor(state,actorId){
    const context=playerContext(state,actorId);
    const proof=social.communicationProof(state,actorId);
    if(!social.validCommunicationProof(state,proof,actorId))throw Error('本人当前不能清醒采购');
    controls.assertAction(state,actorId,'requirements',{requirements:['gesture']});
    if(context.wallet?.ownerEntityId!==actorId||context.inventory?.ownerEntityId!==actorId)throw Error('采购须使用本人的钱包与行囊');
    return {...context,proof};
  }
  function buySupply(rawState, templateIdInput, quantityInput, transactionId = 'buy-supply',options={}) {
    const actorId=options.actorId??rawState.角色.主控单位ID;
    const request={actorId,templateId:clean(templateIdInput),quantity:quantityInput??1,decisionOrigin:clone(options.decisionOrigin??null),...(options.maximumGold===undefined?{}:{maximumGold:options.maximumGold})};
    const guard = beginTransaction(rawState, transactionId, '补给铺购买',request);
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    if(request.decisionOrigin){
      const o=request.decisionOrigin,job=state.世界.npcDecisions?.find(j=>j.id===o.requestId);
      if(actorId===state.角色.主控单位ID||job?.ownerId!==actorId||job.status!=='pending'||job.branchId!==o.branchId||job.turn!==o.turn||o.decision?.kind!=='purchase'||o.decision.templateId!==request.templateId||o.decision.quantity!==request.quantity||transactionId!==`npc-purchase:${o.sourceId}`)throw Error('采购缺少原人物独立决定');
    }else if(transactionId.startsWith('npc-purchase:'))throw Error('人物采购编号须有原独立决定');
    const service = ensureLocalService(state, '补给铺',actorId);
    const entry = SHOP_CATALOG[request.templateId];
    if (!entry) throw new Error('此地区不出售该物品');
    const quote=previewEconomy(state,{type:'supply.buy',templateId:entry.templateId,quantity:request.quantity,actorId,maximumGold:request.maximumGold}),{quantity,totalGold}=quote;
    const {playerId,inventory,wallet,proof}=supplyActor(state,actorId),goldBefore=wallet.gold,shop=state.商店.列表[service.id],supplier=state.钱包.列表[shop.businessWalletId],supplierBefore=supplier.gold;
    const previous=new Map(inventory.itemIds.map(id=>[id,state.物品.实例[id].quantity]));
    const transfers=quote.parts.map((part,i)=>world.executeTrade(state,{actorId,shopId:service.id,itemId:part.itemId,quantity:part.quantity,maximumGold:request.maximumGold},`${transactionId}:part:${i}`,'buy',false));
    const items=[...new Set(transfers.map(v=>v.transferredItemId))].map(id=>state.物品.实例[id]);
    const item=items[0];
    const ledger = {id: transactionId, type: 'buy', buyerId: playerId, day: state.世界.时间.day, name: entry.name, shopId: service.id, templateId: entry.templateId, quantity, unitValue: quote.unitValue, totalGold};
    state.交易流水.列表.push(ledger);
    state.交易流水.列表 = state.交易流水.列表.slice(-100);
    const receipt={...ledger,id:transactionId,transactionType:'补给铺购买',type:'supply-bought',itemId:item.id,itemIds:items.map(i=>i.id),locationId:service.locationId,at:people.now(state),proof,
      deliveries:items.map(i=>({itemId:i.id,templateId:i.templateId,containerId:inventory.id,ownerId:actorId,legalOwnerId:i.legalOwnerEntityId,before:previous.get(i.id)??0,after:i.quantity})),
      supplierWallet:{walletId:shop.businessWalletId,before:supplierBefore,after:supplier.gold},transfers,
      wallet:{before:goldBefore,after:wallet.gold},summary:`购买${entry.name}×${quantity}，支付${totalGold}金币`};
    receipt.hash=abilities.hash(receipt);
    (state.人物.列表[actorId].扩展.supplyPurchases??=[]).push({transactionId,hash:receipt.hash});
    return commit(state, transactionId, '补给铺购买',receipt);
  }

  function validateSupplyPurchases(state){
    const errors=[],records=state.远征?.processedTransactions??{},sources=state.远征?.commandRequests??{};
    for(const r of Object.values(records).filter(r=>r.type==='supply-bought'))try{
      const {hash,...body}=r,q=sources[r.id]?.request,entry=SHOP_CATALOG[r.templateId],p=state.人物?.列表?.[r.buyerId],anchors=p?.扩展?.supplyPurchases?.filter(a=>a.transactionId===r.id)??[];
      globalThis.SoulCommerceAssets.maximumGold({direction:'buy',maximumGold:q?.maximumGold},r.totalGold);
      if(!q||q.actorId!==r.buyerId||q.templateId!==r.templateId||q.quantity!==r.quantity||hash!==abilities.hash(body)||anchors.length!==1||anchors[0].hash!==hash)throw Error('采购永久请求、付款与人物来源不符');
      if(!entry||!Number.isSafeInteger(r.quantity)||r.quantity<1||r.quantity>999||r.name!==entry.name||!Number.isSafeInteger(r.unitValue)||r.unitValue<0||r.unitValue!==r.transfers?.[0]?.unitPrice||!Number.isSafeInteger(r.wallet?.before)||!Number.isSafeInteger(r.wallet?.after)||r.wallet.after<0||r.wallet.before-r.wallet.after!==r.totalGold)throw Error('采购数量或实际付款无效');
      if(!r.supplierWallet||r.supplierWallet.after-r.supplierWallet.before!==r.totalGold||!Array.isArray(r.transfers)||r.transfers.reduce((n,v)=>n+v.quantity,0)!==r.quantity||r.transfers.reduce((n,v)=>n+v.totalGold,0)!==r.totalGold||r.transfers.some((v,i)=>!globalThis.SoulRegionalStock.table(state).events.some(e=>e.type==='trade'&&e.sourceId===`${r.id}:part:${i}`&&e.actorId===r.buyerId&&e.transferredItemId===v.transferredItemId&&e.totalGold===v.totalGold)))throw Error('采购缺少原库存交付和商店实际收款');
      if(!social.validCommunicationProof(state,r.proof,r.buyerId)||r.proof.position.kind!=='location'||r.proof.position.sceneId||r.proof.position.locationId!==r.locationId||!SERVICE_LOCATION_IDS.includes(r.locationId)||r.shopId!==(r.locationId===ENTRANCE_LOCATION_ID?SHOP_ID:`shop-traveler-${r.locationId}`)||!Number.isSafeInteger(r.at)||r.at>people.now(state)||Math.floor(r.at/1440)!==r.day)throw Error('采购缺少原实际公共店铺与清醒来源');
      const individual=world.ITEM_TEMPLATES[r.templateId].stackable===false;
      if(!Array.isArray(r.itemIds)||new Set(r.itemIds).size!==r.itemIds.length||r.itemIds.length!==(individual?r.quantity:1)||r.itemId!==r.itemIds[0]||!Array.isArray(r.deliveries)||r.deliveries.length!==r.itemIds.length)throw Error('采购逐件交付无效');
      let received=0;
      r.deliveries.forEach((d,i)=>{if(d.itemId!==r.itemIds[i]||d.templateId!==r.templateId||d.ownerId!==r.buyerId||d.legalOwnerId!==r.buyerId||d.containerId!==p.inventoryContainerId||!Number.isSafeInteger(d.before)||d.before<0||!Number.isSafeInteger(d.after)||d.after<=d.before||individual&&(d.before!==0||d.after!==1))throw Error('采购原交付数量或归属无效');received+=d.after-d.before;});
      if(received!==r.quantity)throw Error('采购原交付数量不守恒');
    }catch(e){errors.push(e.message);}
    for(const p of Object.values(state.人物?.列表??{}))for(const a of p.扩展?.supplyPurchases??[]){const r=records[a.transactionId];if(r?.type!=='supply-bought'||r.buyerId!==p.id||r.hash!==a.hash)errors.push('人物采购历史缺少原永久结算');}
    return errors;
  }

  function currentItemValue(item) {return world.currentItemValue(item);}

  function estimateMaterialSaleGold(stocks) { return Object.values(stocks).reduce((sum,stack)=>sum+Math.floor(stack.unitValue*0.48)*stack.quantity,0); }
  function quoteMaterialSale(rawState, fingerprintInput, quantityInput) {
    const state = normalizeState(rawState);
    const stack = state.材料库.永久[clean(fingerprintInput)];
    if (!stack) throw new Error('永久材料库中没有该材料');
    const quantity = integer(quantityInput, 1, stack.quantity);
    const currentUnitValue = stack.unitValue;
    const acquisitionUnitValue=Math.floor(currentUnitValue*.48);
    return {kind: 'material', fingerprint: stack.fingerprint, name: stack.displayName, quantity, currentUnitValue, acquisitionUnitValue, totalGold: acquisitionUnitValue * quantity};
  }

  function sellMaterial(rawState,fingerprint,quantity,transactionId='sell-material',options={}) {
    const actorId=options.actorId??rawState.角色.主控单位ID,service=requireLocalService(rawState,'材料回收',actorId);
    return world.settleIntent(rawState,{type:'trade-commerce-material',actorId,direction:'sell',shopId:service.id,fingerprint,quantity:quantity??1,...options,id:transactionId});
  }

  function itemSaleRestriction(state,item){const actorId=state.角色.主控单位ID;return globalThis.SoulCommerceAssets.itemReason(state,item,actorId)||(!world.isCarriedItem(state,item,actorId)?'只能出售自己行囊中的物品':'');}

  function quoteItemSale(rawState, itemIdInput, quantityInput) {
    const state = normalizeState(rawState);
    const item = state.物品.实例[clean(itemIdInput)];
    if (world.ITEM_TEMPLATES[item?.templateId]?.unpriced) throw new Error('这件物品尚无鉴定价格，不能按叙述兑换钱币');
    const restriction = itemSaleRestriction(state, item);
    if (restriction) throw new Error(restriction);
    const quantity = integer(quantityInput, 1, item.quantity);
    const currentUnitValue = currentItemValue(item);
    const service=requireLocalService(state,'物品回收'),quote=world.quotePrice(state,service.id,item.id,'sell',quantity),acquisitionUnitValue=quote.unitPrice;
    return {...quote,kind:'item',name:item.name,currentUnitValue,acquisitionUnitValue};
  }

  function sellItem(rawState, itemId, quantity, transactionId = 'sell-item') {
    const guard = beginTransaction(rawState, transactionId, '补给铺出售');
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    const service = ensureLocalService(state, '物品回收');
    if (state.远征.当前) throw new Error('远征中不能出售物品');
    const quote = previewEconomy(state,{type:'item.sell',itemId,quantity:quantity ?? 1});
    const item = state.物品.实例[quote.itemId];
    const wallet = walletForPlayer(state), goldBefore = wallet.gold;
    const transfer=world.executeTrade(state,{shopId:service.id,itemId:item.id,quantity:quote.quantity},transactionId,'sell');
    return commit(state, transactionId, '补给铺出售', {type: 'item-sold', ...quote,transfer,wallet: {before: goldBefore, after: wallet.gold}, summary: `出售${quote.name}×${quote.quantity}，获得${quote.totalGold}金币`});
  }

  function npcPurchaseOptions(rawState, actorId) {
    if (actorId === rawState.角色.主控单位ID || !rawState.人物.列表[actorId]) return [];
    const templateIds = supplyOffers(rawState, actorId).map(entry => entry.templateId).filter(Boolean);
    if (!templateIds.length) return [];
    try {
      const state = normalizeState(rawState);
      const service = requireLocalService(state, '补给铺', actorId);
      supplyActor(state, actorId);
      return world.previewSinglePurchases(state, service.id, templateIds, actorId);
    } catch {
      // A closed shop or a buyer who cannot act has no available purchases.
      return [];
    }
  }

  function previewEconomy(rawState,request = {}) {
    const state = normalizeState(rawState);
    const actorId=request.actorId??state.角色.主控单位ID;
    if(request.type!=='supply.buy'&&actorId!==state.角色.主控单位ID)throw Error('此回收入口只处理本人物资');
    requireLocalService(state,request.type === 'supply.buy' ? '补给铺' : '材料与物品回收',actorId);
    const {playerId,inventory,wallet} = request.type==='supply.buy'?supplyActor(state,actorId):playerContext(state);
    const quantity = request.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error('数量须为正整数');
    if(request.type==='material.sell'||request.type==='material.buy'){
      const service=requireLocalService(state,'材料交易',actorId),direction=request.type==='material.buy'?'buy':'sell';
      const result=world.previewIntent(state,{type:'trade-commerce-material',actorId,direction,shopId:request.shopId??service.id,fingerprint:request.fingerprint,quantity,accountId:request.accountId,maximumGold:request.maximumGold}).receipt;
      const ref=direction==='buy'?{store:'shop',shopId:service.id}:{store:'personal',holderId:actorId},available=globalThis.SoulCommerceAssets.materialStore(state,ref)[request.fingerprint]?.quantity??0;
      return {...result,pass:true,remainingQuantity:direction==='buy'?available-quantity:available-quantity,remainingGold:globalThis.SoulCommerceAssets.account(state,actorId,result.accountId).gold+(direction==='sell'?result.totalGold:-result.totalGold)};
    }
    if (request.type === 'supply.buy') {
      const service=requireLocalService(state,'商行',actorId);
      return world.previewShopPurchase(state,service.id,clean(request.templateId),quantity,actorId,{maximumGold:request.maximumGold});
    }

    const available = request.type === 'material.sell' ? state.材料库.永久[request.fingerprint]?.quantity : state.物品.实例[request.itemId]?.quantity;
    if (quantity > (available ?? 0)) throw new Error('所选数量超过当前持有数量');
    const quote = request.type === 'material.sell' ? quoteMaterialSale(state,request.fingerprint,quantity)
      : request.type === 'item.sell' ? quoteItemSale(state,request.itemId,quantity) : null;
    if (!quote) throw new Error('请选择购买或出售的物品');
    const service=requireLocalService(state,'回收'),shop=state.商店.列表[service.id],business=state.钱包.列表[shop?.businessWalletId];
    if(!business||business.gold<quote.totalGold)throw Error('商店经营本钱不足，无法回收');
    if(request.type==='item.sell')world.previewTrade(state,{shopId:shop.id,itemId:request.itemId,quantity},'sell');
    return {...quote,remainingQuantity:available-quantity,remainingGold:wallet.gold+quote.totalGold};
  }

  const EFFECT_EVIDENCE = Object.freeze({
    'contract.oath':['灵魂'],'trigger.contract':['灵魂'],'payload.death':['死亡'],'modifier.world_duration':['时间'],
    'status.limited_followup':foundation.DAMAGE_TYPES,'payload.stack_confluence':foundation.DAMAGE_TYPES,'payload.resource_damage':foundation.DAMAGE_TYPES,
    'status.next_check_penalty':['阴','精神','灵魂'],'status.battle_resource':['阴','阳','灵魂','精神'],'payload.resource_endstate':['阴','阳','灵魂','精神'],'payload.zone_dispel':['阴','阳','生命','光','空间'],
    ...Object.fromEntries(effects.HIT_RULE_IDS.map(id=>[id,[...foundation.DAMAGE_TYPES]])),
    'realm.store':['空间'],'payload.arcane_lock':['灵魂','空间'],'payload.unlock':['金','灵魂','空间'],'payload.suppress_lock':['灵魂','空间'],'payload.rule_break':['毁灭'],'payload.analyze_lock':['金','灵魂','空间'],'payload.create_key':['金','木','土'],
    'payload.repair_item':['金','木','土'],'payload.fabricate':['金','木','土'],'zone.wall':['土','冰','金','木'],'summon.entity':['生命','灵魂','土','冰','金','木'],
    'status.limb_bind':['生命','毒蚀','木','金','物理'], 'status.mute':['生命','毒蚀','木','金','物理','灵魂','暗'], 'status.power_seal':['生命','毒蚀','灵魂','空间','暗'],'status.mind_control':['精神'],'status.soul_control':['灵魂'],
    'payload.heal': ['生命'], 'payload.soul_restore': ['灵魂', '生命'], 'payload.cleanse': ['生命', '光', '毒蚀'],
    'payload.damage': foundation.DAMAGE_TYPES.filter(type=>type!=='生命'), 'payload.shield': ['土', '金', '冰','阴'],
    'status.poison': ['生命','毒蚀'], 'status.burn': ['火'], 'status.bind': ['木'], 'status.paralysis': ['雷', '毒蚀'], 'status.slow': ['生命','毒蚀','冰', '水', '时间'], 'status.armor_break': ['金', '土', '物理'],
    'status.desire':['精神','淫'],'status.regeneration':['生命'],'status.fear':['精神'],'status.charm':['精神','淫'],'status.sleep':['精神'],'status.blind':['生命','毒蚀','光','暗'],'status.silence':['生命','毒蚀','灵魂','暗'],'status.cognition_shift':['精神'],'transform.sex':['生命','阴','阳'],
    'status.buff': ['生命', '光', '风','阳'], 'status.resistance_shift': [...foundation.DAMAGE_TYPES], 'status.status_guard': [...foundation.DAMAGE_TYPES],
    'move.knockback': ['物理', '风'], 'move.teleport': ['空间'], 'status.haste': ['风', '雷', '时间']
  });
  const ACTIVE_DEVICE_EFFECT_IDS = Object.freeze(['realm.store',...effects.HIT_RULE_IDS,'status.limited_followup','payload.stack_confluence','status.next_check_penalty','payload.resource_damage','payload.resource_endstate','payload.zone_dispel','payload.arcane_lock','payload.unlock','payload.suppress_lock','payload.rule_break','payload.analyze_lock','payload.create_key','payload.repair_item','payload.fabricate','payload.heal','payload.cleanse','status.regeneration','zone.wall','summon.entity','status.mind_control','status.soul_control','status.power_seal','status.cognition_shift','transform.sex']);
  const CATEGORY_ALLOWED = Object.freeze({
    丹药: new Set(['status.regeneration','payload.shield','payload.heal', 'payload.soul_restore', 'payload.cleanse', 'status.buff', 'status.resistance_shift', 'status.status_guard','status.mind_control','status.soul_control','status.power_seal','status.limb_bind','status.mute','status.cognition_shift','status.poison','status.slow','status.paralysis','status.sleep','status.blind','status.fear','status.charm','status.silence']),
    毒药: new Set(['payload.heal','payload.soul_restore','payload.cleanse','payload.damage','status.regeneration','payload.shield','status.buff','status.resistance_shift','status.status_guard','status.mind_control','status.soul_control','status.power_seal','status.limb_bind','status.mute','status.cognition_shift','status.poison','status.slow','status.paralysis','status.sleep','status.blind','status.fear','status.charm','status.silence','status.desire']),
    暗器: new Set(['status.resistance_shift', 'payload.damage', 'status.poison', 'status.bind', 'status.paralysis', 'status.armor_break', 'status.slow', 'move.knockback']),
    魂导器: new Set(['status.battle_resource','payload.damage','status.resistance_shift', 'status.status_guard','passive.equipment_stat','passive.element_amplify',...ACTIVE_DEVICE_EFFECT_IDS]),
    拘束器:new Set(['status.limb_bind','status.mute','status.power_seal','status.buff','status.slow'])
  });
  const MATERIAL_TRAIT_BRIDGE_REGISTRY = Object.freeze({});
  const MATERIAL_CHANNEL_CATALOG = Object.freeze(Object.values(foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY));
  function materialChannelRecord(value) {
    const token = clean(value);
    return MATERIAL_CHANNEL_CATALOG.find(item => item.id === token || item.name === token || item.tags?.includes(token)) ?? null;
  }

  function effectAttributeOptions(effectId, params = {}) {
    if(effectId==='status.buff'&&Number(params.数值)<0)return ['生命','毒蚀','阴',...({力量:['物理','金'],身法:['风','水'],体魄:['土'],悟性:['精神','灵魂'],感知:['精神','光'],意志:['精神','灵魂']}[params.属性]??[])];
    if(effectId==='passive.element_amplify')return params.类型?[params.类型]:[...foundation.DAMAGE_TYPES];
    if(effectId==='passive.equipment_stat')return clone(foundation.EQUIPMENT_AFFIXES.REGISTRY[params.属性]?.attributes??[]);
    if (effectId === 'status.status_guard') return clone(effects.MATERIAL_GUARD_ATTRIBUTES[params.防护对象] ?? Object.values(effects.MATERIAL_GUARD_ATTRIBUTES).flat());
    if (['payload.damage','status.limited_followup','payload.resource_damage'].includes(effectId) && attributeNames.includes(params.类型)) return [params.类型];
    if (effectId === 'status.resistance_shift' && attributeNames.includes(params.类型)) return [params.类型];
    return clone(EFFECT_EVIDENCE[effectId] ?? []);
  }

  function effectChannelOptions(effectId, params = {}) {
    if(effectId==='status.buff'&&Number(params.数值)<0)return ['属性压制','毒蚀传递'];
    if(effectId==='passive.element_amplify')return MATERIAL_CHANNEL_CATALOG.filter(c=>(params.类型?[params.类型]:foundation.DAMAGE_TYPES).some(type=>foundation.EQUIPMENT_AFFIXES.elementPermitted(type,[type],[c.id],foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY))).map(c=>c.name);
    if(effectId==='passive.equipment_stat')return MATERIAL_CHANNEL_CATALOG.filter(c=>(foundation.EQUIPMENT_AFFIXES.REGISTRY[params.属性]?.channels??[]).includes(c.id.replace('channel.',''))).map(c=>c.name);
    return MATERIAL_CHANNEL_CATALOG.filter(item => effects.channelAllowsParams(item,effectId,params)).map(item => item.name);
  }

  function materialBridgeEvidence(stack) {
    return {
      attributes:Object.entries(stack.attributeSpectrum ?? {}).filter(([,value])=>Number(value)>0).map(([name])=>name),
      channels:unique((stack.channels ?? []).map(value=>materialChannelRecord(value)?.name).filter(Boolean)),
      registeredTraits:unique((stack.traits ?? []).map(value=>MATERIAL_TRAIT_BRIDGE_REGISTRY[clean(value)]).filter(Boolean)),
      narrativeTraits:unique(stack.traits ?? [])
    };
  }

  function designQuoteSummary(q){return clone(Object.fromEntries(['version','policy','designHash','templateId','valueGold','materialValue','bridgeClauses'].map(k=>[k,q[k]])));}
  function confirmedResearchCandidate(category,context,candidateId,design){
    const q=globalThis.SoulPaidDesign.quote(category,design),p=q.payload,g=p.activeSkill?.effectGraph??p.passiveEffectGraph??null;
    const result={...(p.activeSkill?clone(p.activeSkill):{}),candidateId,category,confirmedDesign:clone(q.design),designQuote:designQuoteSummary(q),effectGraph:clone(g),effects:clone(q.effects),frozenEffectSpecs:clone(q.effectSpecs),modifiers:clone(p.modifiers??{attributes:{}}),fixedForm:clone(p.fixedForm??{id:q.templateId,name:q.design.appearance,kind:category}),equipmentKind:p.equipmentKind??category,deviceCategory:p.deviceCategory??'辅助',disposable:!['魂导器','拘束器'].includes(category),durability:['魂导器','拘束器'].includes(category)?100:1,durabilityCost:p.activeSkill?.durabilityCost??0,cooldownTurns:p.activeSkill?.cooldownTurns??0,soulPowerCost:p.activeSkill?.soulPowerCost??0,downsides:[],generationSource:'confirmed-paid-design-v1',appearanceMaterials:clone(context.appearanceMaterials??(context.stacks??[]).map(({entry,stack})=>({part:stack.appearancePart||stack.categories?.[0]||'',value:stack.unitValue*entry.quantity}))),valueLedger:{totalBudget:context.totalValue,spent:q.materialValue,remainder:context.totalValue-q.materialValue}};
    delete result.id;delete result.name;delete result.description;
    if(q.materialValue>context.totalValue)throw Error('固定设计材料价值不足：当前'+context.totalValue+'，需要'+q.materialValue);
    if(!restraintSupported(result,context))throw Error('材料不能支撑固定设计的全部实际效果、属性和施展通道');
    return result;
  }
  function validateConfirmedResearchCandidate(pending,candidate,index){
    const errors=[];let spent=Infinity;
    try{
      const expected=confirmedResearchCandidate(pending.category,{totalValue:pending.mechanicBudget,...pending.evidence,appearanceMaterials:candidate.appearanceMaterials},candidate.candidateId,candidate.confirmedDesign),ignored=new Set(['name','description','form','narrativeSource','effectSpecs','graph','spent','valueLedger']);
      const mechanics=v=>Object.fromEntries(Object.entries(v).filter(([k])=>!ignored.has(k)));
      if(abilities.hash(mechanics(candidate))!==abilities.hash(mechanics(expected)))throw Error('固定设计、完整能力、报价或载体合同已改变');
      if(candidate.name!==expected.confirmedDesign.name||candidate.description!==expected.confirmedDesign.description||candidate.form!==expected.confirmedDesign.appearance)throw Error('已确认作品的名称、说明和外观不能被后置命名改写');
      spent=expected.designQuote.materialValue;
    }catch(error){errors.push(error.message);}
    return {index,pass:!errors.length,errors,normalized:{...clone(candidate),effectSpecs:clone(candidate.frozenEffectSpecs??[]),graph:clone(candidate.effectGraph),spent,valueLedger:{budget:pending.mechanicBudget,total:spent,spent,remainder:Math.max(0,pending.mechanicBudget-spent)}}};
  }
  function hostQuoteSummary(q){return clone(Object.fromEntries(['version','policy','valueGold','materialValue','hostBudget','baseGold','baseBudget','overlapBudget','registeredAnchor','parts','bridgeClauses','envelope'].filter(k=>q[k]!==undefined).map(k=>[k,q[k]])));}
  function hostResearchCandidate(category,context,candidateId,design){
    const q=globalThis.SoulHostPricing.quoteDesign(category,design),payload=q.payload;
    const graph=payload.activeSkill?.effectGraph??payload.passiveEffectGraph??null;
    const nodes=[...(payload.activeSkill?.effectGraph?.nodes??[]),...(payload.passiveEffectGraph?.nodes??[])];
    const carrierSpecs=category==='拘束器'?Object.values(globalThis.SoulBackgroundRestraints.compile(payload.backgroundRestraint.definition).device.modes).flat().filter(([id])=>!(q.host.capabilities.suppression&&id==='status.power_seal')):[];
    const fixedForm=payload.fixedForm??{id:q.templateId,name:custody.DEVICES[q.templateId].name,kind:'拘束器'};
    const appearance=context.appearanceMaterials??(context.stacks??[]).map(({entry,stack})=>({part:stack.appearancePart||stack.categories?.[0]||'',value:stack.unitValue*entry.quantity}));
    const result={...(payload.activeSkill?clone(payload.activeSkill):{}),candidateId,category,hostDesign:clone(q.design),hostQuote:hostQuoteSummary(q),
      effectGraph:clone(graph),effects:[...nodes.filter(n=>!['release','targeting','check'].includes(effects.EFFECT_REGISTRY[n.effectId]?.family)).map(n=>({id:n.effectId,params:clone(n.params)})),...carrierSpecs.map(([id,params])=>({id,params:clone(params)}))],frozenEffectSpecs:(graph?.nodes??[]).map(n=>[n.effectId,clone(n.params)]),
      modifiers:clone(payload.modifiers??{attributes:{}}),fixedForm:clone(fixedForm),equipmentKind:payload.equipmentKind??'拘束器',deviceCategory:payload.deviceCategory??'辅助',
      ...(payload.activeSkill?{sourceKind:'soul-device'}:{}),disposable:false,durability:100,durabilityCost:payload.activeSkill?.durabilityCost??0,cooldownTurns:payload.activeSkill?.cooldownTurns??0,soulPowerCost:payload.activeSkill?.soulPowerCost??0,
      downsides:[],generationSource:'paid-host-design-v1',appearanceMaterials:clone(appearance),valueLedger:{totalBudget:context.totalValue,spent:q.materialValue,remainder:context.totalValue-q.materialValue}};
    delete result.id;delete result.name;delete result.description;
    if(q.materialValue>context.totalValue)throw Error(`宿主组合材料价值不足：当前${context.totalValue}，需要${q.materialValue}`);
    if(!restraintSupported(result,context))throw Error('材料不能支撑宿主组合的全部固定能力与施展通道');
    return result;
  }
  function validateHostResearchCandidate(pending,candidate,index){
    const errors=[];let spent=Infinity;
    try{
      const expected=hostResearchCandidate(pending.category,{totalValue:pending.mechanicBudget,...pending.evidence,appearanceMaterials:candidate.appearanceMaterials},candidate.candidateId,candidate.hostDesign);
      const ignored=new Set(['name','description','form','narrativeSource','effectSpecs','graph','spent','valueLedger']);
      const mechanical=v=>Object.fromEntries(Object.entries(v).filter(([key])=>!ignored.has(key)));
      if(abilities.hash(mechanical(candidate))!==abilities.hash(mechanical(expected)))throw Error('宿主组合与确认的固定定义、报价或载体合同不一致');
      if(!clean(candidate.name))throw Error('候选缺少名称');spent=expected.hostQuote.materialValue;
    }catch(error){errors.push(error.message);}
    return {index,pass:!errors.length,errors,normalized:{...clone(candidate),effectSpecs:clone(candidate.frozenEffectSpecs??[]),graph:clone(candidate.effectGraph),spent,valueLedger:{budget:pending.mechanicBudget,effects:spent,permanentAttributes:0,total:spent,spent,remainder:Math.max(0,pending.mechanicBudget-spent),effectCosts:(candidate.hostQuote?.parts??[]).map(p=>({name:p.capability,cost:p.budget}))}}};
  }

  function bridgeClausesForMechanics(mechanics) {
    const clauses = mechanics.confirmedDesign?clone(globalThis.SoulPaidDesign.quote(mechanics.category,mechanics.confirmedDesign).bridgeClauses):mechanics.hostDesign?clone(globalThis.SoulHostPricing.quoteDesign(mechanics.category,mechanics.hostDesign).bridgeClauses):[];
    const push = (kind,label,anyOf) => {
      const options = unique(anyOf).sort((a,b)=>a.localeCompare(b,'zh-CN'));
      if (options.length) clauses.push({kind,label,anyOf:options});
    };
    for (const entry of mechanics.effects ?? []) {
      const effectId = clean(entry?.id);
      const effectName = effects.EFFECT_REGISTRY[effectId]?.displayName ?? '成品效果';
      push('attribute',`${effectName}的属性材料`,effectAttributeOptions(effectId,entry?.params));
      push('channel',`${effectName}的机制材料`,effectChannelOptions(effectId,entry?.params));
    }
    for(const key of Object.keys(mechanics.modifiers?.attributes??{}))push('attribute',key+'加成的属性材料',world.EQUIPMENT_ATTRIBUTE_SOURCES[key]??[]);
    const release = (mechanics.effectSpecs ?? (mechanics.hostDesign||mechanics.confirmedDesign?mechanics.frozenEffectSpecs:[]) ?? []).find(([effectId])=>String(effectId).startsWith('release.'));
    if (release&&mechanics.medicine?.route!=='oral') push('channel','成品的施展方式',effectChannelOptions(release[0]));
    const seen = new Set();
    return clauses.filter(clause => {
      const key = `${clause.kind}:${clause.anyOf.join('|')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function materialSatisfiesBridge(stack, clause) {
    const evidence = materialBridgeEvidence(stack);
    const available = clause.kind === 'attribute' ? evidence.attributes : clause.kind === 'channel' ? evidence.channels : evidence.registeredTraits;
    return (clause.anyOf ?? []).some(value=>available.includes(value));
  }

  function bridgeCoverage(stacks, clauses) {
    const entries = stacks.map(item=>item.stack ?? item);
    const coverage = clauses.map((clause,index)=>({index,label:clause.label,kind:clause.kind,anyOf:clone(clause.anyOf),coveredBy:entries.filter(stack=>materialSatisfiesBridge(stack,clause)).map(stack=>stack.fingerprint)}));
    return {pass:coverage.every(item=>item.coveredBy.length>0),coverage,missing:coverage.filter(item=>!item.coveredBy.length)};
  }

  function researchEffectVariants(category,context){
    return [...CATEGORY_ALLOWED[category]].flatMap(id=>{
      let specs=['status.resistance_shift','status.status_guard'].includes(id)?effects.materialDefenseVariants(context.attributes,context.channels,category):[baseResearchEffectSpec(id,context.attributes)].filter(Boolean);
      if(id==='status.regeneration')specs=specs.flatMap(([effectId,p])=>[[effectId,p],[effectId,{...p,持续方式:'世界分钟',持续分钟:5,来源依赖:'独立'}]]);
      if(effects.EFFECT_REGISTRY[id]?.hitRule&&effects.EFFECT_REGISTRY[id].parameterBounds?.等级)specs=specs.flatMap(([effectId,p])=>[1,2,3].map(等级=>[effectId,{...p,等级}]));
      if(['丹药','毒药'].includes(category)){
        if(id==='status.buff')specs.push(...foundation.ATTRIBUTE_KEYS.map(属性=>['status.buff',{属性,数值:-1}]));
        specs=specs.map(([effectId,p])=>{const negative=effects.effectPolarity(effectId,p)==='harmful';
          if(negative&&controls.canPersist(effectId,p)){const {持续回合,...body}=p;return [effectId,{...body,持续方式:'世界分钟',持续分钟:5,来源依赖:'独立'}];}return [effectId,p];});
      }
      return specs.filter(([effectId,p])=>{
        const attrs=effectAttributeOptions(effectId,p),channels=effectChannelOptions(effectId,p);
        return (!attrs.length||attrs.some(v=>context.attributes.includes(v)))&&(!channels.length||channels.some(v=>context.channels.includes(v)));
      });
    });
  }
  function unlockedResearchEffectIds(category,context){
    if(['丹药','毒药'].includes(category))return unique(researchEffectVariants(category,context).map(([id])=>id));
    return [...CATEGORY_ALLOWED[category]].filter(id=>{const attrs=effectAttributeOptions(id),channels=effectChannelOptions(id);return (!attrs.length||attrs.some(v=>context.attributes.includes(v)))&&(!channels.length||channels.some(v=>context.channels.includes(v)));});
  }

  function selectedMaterialContext(state,selections,actorId=state.角色?.主控单位ID){return materialContextFromStore(personMaterials(state,actorId),selections);}
  function materialContextFromStore(store, selections) {
    if (!Array.isArray(selections) || !selections.length) throw new Error('研发至少需要一种材料');
    const grouped = {};
    for (const entry of selections) {
      const fingerprint = clean(entry?.fingerprint);
      if (!fingerprint) throw new Error('研发材料缺少有效标识');
      const quantity = Number(entry.quantity ?? 0);
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10) throw new Error('一次研发投入的材料总数量必须为1至10个');
      if (quantity < 1) continue;
      grouped[fingerprint] = (grouped[fingerprint] ?? 0) + quantity;
    }
    const normalized = Object.entries(grouped).map(([fingerprint,quantity])=>({fingerprint,quantity}));
    const totalUnits = normalized.reduce((sum, entry) => sum + entry.quantity, 0);
    if (totalUnits < 1 || totalUnits > 10) throw new Error('一次研发投入的材料总数量必须为1至10个');
    const stacks = normalized.map(entry => {
      const stack = store[entry.fingerprint];
      if (!stack || stack.quantity < entry.quantity) throw new Error(`材料数量不足：${stack?.displayName ?? '所选材料已耗尽'}`);
      return {entry, stack};
    });
    const materialEvidence = stacks.map(({stack})=>materialBridgeEvidence(stack));
    return {
      normalized, totalUnits, stacks,
      totalValue: stacks.reduce((sum, item) => sum + item.stack.unitValue * item.entry.quantity, 0),
      attributes: unique(materialEvidence.flatMap(item=>item.attributes)),
      channels: unique(materialEvidence.flatMap(item=>item.channels)),
      registeredTraits:unique(materialEvidence.flatMap(item=>item.registeredTraits)),
      narrativeTraits:unique(materialEvidence.flatMap(item=>item.narrativeTraits)),
      categories: unique(stacks.flatMap(item => item.stack.categories ?? []))
    };
  }

  function researchDamageType(attributes) {
    const preferred = attributes.find(name => !['生命','空间','时间'].includes(name)) ?? attributes[0] ?? '物理';
    return foundation.canonicalDamageType(preferred);
  }

  function baseResearchEffectSpec(effectId, attributes) {
    if(effectId==='realm.store')return [effectId,{容量:1,持续分钟:60,投影比例:0,真身调遣:false,来源依赖:'独立'}];
    if(effectId==='status.limited_followup')return [effectId,{...clone(effects.EFFECT_REGISTRY[effectId].parameterDefaults),类型:researchDamageType(attributes)}];
    if(effectId==='payload.stack_confluence')return [effectId,clone(effects.EFFECT_REGISTRY[effectId].parameterDefaults)];
    // These are concrete generated recipes, not defaults added to user graphs.
    // The pool and damage cap agree on the complete reachable three charges.
    if(effectId==='status.battle_resource')return [effectId,{资源槽:2,容量:3,归属:'本体',名称:'战斗蓄能',事件规则:[{事件:'action-hit',事件槽:1,数量:1}]}];
    if(effectId==='payload.resource_damage')return [effectId,{资源槽:2,类型:researchDamageType(attributes),骰数:1,骰面:6,加值:0,每层骰数:1,每层加值:0,最低层数:1,最大计入层数:3}];
    if(effectId==='payload.resource_endstate')return [effectId,clone(effects.EFFECT_REGISTRY[effectId].parameterDefaults)];
    if(['status.next_check_penalty','payload.zone_dispel'].includes(effectId))return [effectId,clone(effects.EFFECT_REGISTRY[effectId].parameterDefaults)];
    if(['payload.unlock','payload.suppress_lock','payload.rule_break','payload.analyze_lock','payload.create_key','payload.arcane_lock'].includes(effectId))return [effectId,clone(effects.EFFECT_REGISTRY[effectId].parameterDefaults)];
    if(effects.EFFECT_REGISTRY[effectId]?.hitRule)return [effectId,clone(effects.EFFECT_REGISTRY[effectId].parameterDefaults)];
    const type = researchDamageType(attributes);
    const dominant = {物理:'力量',金:'力量',木:'悟性',水:'体魄',火:'力量',土:'体魄',风:'身法',雷:'力量',冰:'悟性',光:'意志',暗:'身法',毒蚀:'悟性',生命:'体魄',灵魂:'意志',精神:'意志',阴:'意志',阳:'力量',淫:'感知',空间:'感知',时间:'悟性'}[type] ?? '意志';
    const params = {
      'payload.damage':{类型:type,骰数:1,骰面:4,加值:0,穿透档:0},'payload.shield':{骰数:1,骰面:4,加值:0},'payload.heal':{骰数:1,骰面:4,加值:0},
      'payload.repair_item':{修复量:10,价值上限:100},'payload.fabricate':{价值上限:100,最大数量:1},'zone.wall':{耐久:20,阻挡:'全部',持续方式:'世界分钟',持续分钟:10,持续回合:1},'summon.entity':{模板:'元素',数量:1,生命百分比:10,持续方式:'世界分钟',持续分钟:10,持续回合:1},'payload.soul_restore':{数值:2},'payload.cleanse':{类别:attributes.includes('毒蚀')?'毒素':'负面',最大数量:1},
      'status.mind_control':{持续方式:'世界分钟',持续分钟:5,来源依赖:'独立',强度:1,命令域:'物品',控制距离:'同场'},
      'status.soul_control':{持续方式:'世界分钟',持续分钟:5,来源依赖:'独立',强度:1,命令域:'战斗',控制距离:'同场'},
      'status.limb_bind':{部位:'双手'},'status.mute':{},'status.cognition_shift':{强度:1,改造方式:'立即',认知方向:'信任施术者',认知保留:'随来源',持续方式:'世界分钟',持续分钟:5,来源依赖:'独立'},
      'transform.sex':{强度:1,目标性别:'反转',变化保留:'随来源',持续方式:'世界分钟',持续分钟:5,来源依赖:'独立'},
      'status.desire':{强度:1,持续方式:'世界分钟',持续分钟:10,来源依赖:'独立'},'status.regeneration':{骰数:1,骰面:4,持续回合:2},'status.fear':{持续回合:1},'status.charm':{持续回合:1},'status.sleep':{持续回合:1},'status.blind':{持续回合:1},'status.silence':{持续回合:1},
      'status.power_seal':{持续方式:'世界分钟',持续分钟:5,来源依赖:'独立',封印对象:'精细',限制:{soulPowerPercent:30}},
      'status.poison':{持续回合:1,骰数:1,骰面:4},'status.burn':{持续回合:1,骰数:1,骰面:4},'status.bind':{持续回合:1,挣脱属性:'力量'},
      'status.paralysis':{层数:1,阈值:3,持续回合:1},'status.armor_break':{数值:1,持续回合:1},'status.slow':{数值:1,持续回合:1},
      'status.buff':{属性:dominant,数值:1,持续回合:1},'status.resistance_shift':{类型:type,模式:'抗性',持续回合:1},'status.haste':{数值:1,持续回合:1},
      'move.knockback':{距离区:1},'move.teleport':{距离区:1,目的:'指定站位'}
    }[effectId];
    return params ? [effectId,params] : null;
  }

  function researchShell(category, context, variant = 0) {
    if (['丹药','毒药'].includes(category)) return [['target.self',{阵营规则:'友方'}]];
    const available = new Set(context.channels.flatMap(value=>materialChannelRecord(value)?.effectIds ?? []));
    const pick = ids => {const choices=ids.filter(id=>available.has(id));return choices[variant%Math.max(1,choices.length)];};
    const releaseId = pick(['release.projectile','release.melee','release.touch']);
    const targetId = pick(['target.single','target.line','target.cone','target.cluster','target.burst','target.chain']);
    const checkId = pick(['check.physical_attack','check.soul_attack','check.save']);
    return releaseId && targetId && checkId ? [[releaseId,{距离区:releaseId === 'release.projectile'?2:1}],[targetId,{阵营规则:'敌方',选择模式:'主目标'}],[checkId,{}]] : [];
  }

  function compileBattleMechanicDevice(context,budget,seed,index=0){
    const spec=id=>baseResearchEffectSpec(id,context.attributes);
    const supported=([id,p])=>{const attrs=effectAttributeOptions(id,p),channels=effectChannelOptions(id,p);return (!attrs.length||attrs.some(a=>context.attributes.includes(a)))&&channels.some(c=>context.channels.includes(c));};
    const release=['release.projectile','release.melee','release.touch'].find(id=>supported([id,{}]));
    const check=['check.soul_attack','check.physical_attack'].find(id=>supported([id,{}]));
    if(!release||!check||!supported(['target.single',{}]))return null;
    const shot=nodes=>[[release,release==='release.projectile'?{距离区:2}:{}],['target.single',{阵营规则:'敌方'}],[check,{}],...nodes];
    const charge=spec('status.limited_followup'),confluence=spec('payload.stack_confluence');
    const pool=spec('status.battle_resource'),damage=spec('payload.resource_damage'),endstate=spec('payload.resource_endstate');
    const hit=spec('payload.damage');hit[1].事件槽=1;
    const recipes=[];
    if([charge,confluence,['target.self',{}]].every(supported))recipes.push([
      {id:'charge',activation:'active',optional:false,nodes:[['target.self',{}],charge]},
      {id:'confluence',activation:'active',optional:true,nodes:shot([confluence])}
    ]);
    if([pool,damage,endstate,hit].every(supported)){
      // Optional payoff cannot establish a random candidate's guaranteed role.
      // Buy a genuine unconditional attack large enough for the unchanged 60%
      // gate, rather than exempting this recipe or inventing free pool events.
      const requiredAttack=Math.ceil(1.5*(effects.calculateNodeCost(pool[0],pool[1],{activation:'passive'})+effects.calculateNodeCost(damage[0],damage[1])));
      while(effects.calculateNodeCost(hit[0],hit[1])<requiredAttack&&hit[1].骰数<effects.EFFECT_REGISTRY['payload.damage'].parameterBounds.骰数[1])hit[1].骰数++;
      recipes.push([
        {id:'reserve',activation:'passive',nodes:[pool]},
        {id:'charge-hit',activation:'active',optional:false,nodes:shot([hit])},
        {id:'discharge',activation:'active',optional:true,nodes:shot([damage,endstate])}
      ]);
    }
    if(!recipes.length)return null;
    const branches=recipes[Math.floor(index/4)%recipes.length],costContract={sourceKind:'soul-device',requirements:['gesture'],soulPowerCost:Math.max(1,Math.ceil(budget/100)),disposable:false};
    const graph=effects.makeBranchedGraph(branches,{provenance:{source:'workshop-research',seed}}),checked=effects.validateGraph(graph,{ageTier:'十万年',mechanismCap:'规则',budget,costContract});
    if(!checked.pass)return null;
    const equipmentKind=graph.nodes.some(n=>n.effectId==='payload.damage')?'武器':'饰品',fixedForm=clone(foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.kind===equipmentKind));
    const mechanics=graph.nodes.filter(n=>!['release','targeting','check'].includes(n.family));
    return {...costContract,abilityValue:checked.abilityValue,candidateId:`${seed}-mechanic-${index+1}`,category:'魂导器',deviceCategory:equipmentKind==='武器'?'攻击':'辅助',equipmentKind,fixedForm,
      effects:mechanics.map(n=>({id:n.effectId,params:clone(n.params)})),frozenEffectSpecs:graph.nodes.map(n=>[n.effectId,clone(n.params)]),effectGraph:graph,durability:60,durabilityCost:1,cooldownTurns:0,downsides:[],modifiers:{attributes:{}},generationSource:'shared-budgeted-battle-mechanic-compiler',valueLedger:{totalBudget:budget,costs:{activeSkill:checked.spent,permanentAttributes:0},spent:checked.spent,remainder:budget-checked.spent}};
  }

  function compileBudgetedConsumable(category, context, budget, seed, index, allocate) {
    const activeDevice=category==='魂导器',drug=['丹药','毒药'].includes(category);
    if(activeDevice&&index%4===0){const composite=compileBattleMechanicDevice(context,budget,seed,index);if(composite)return composite;}
    const unlocked=researchEffectVariants(category,context).filter(([id])=>(!activeDevice||ACTIVE_DEVICE_EFFECT_IDS.includes(id))&&!['payload.stack_confluence','payload.resource_damage','payload.resource_endstate'].includes(id));
    if(!unlocked.length)return null;
    const offset=stableHash(`${seed}:effect-order`)%unlocked.length,ordered=[...unlocked.slice(offset),...unlocked.slice(0,offset)];
    const medicineOptions=[{form:'丸',route:'oral'},{form:'液',route:'oral'}];
    const contactBridge=effectChannelOptions('release.touch').some(c=>context.channels.includes(c));
    const projectileBridge=effectChannelOptions('release.projectile').some(c=>context.channels.includes(c));
    if(contactBridge)medicineOptions.push({form:'液',route:'contact'},{form:'粉',route:'contact'});
    if(projectileBridge)medicineOptions.push({form:'粉',route:'inhaled'},{form:'雾',route:'inhaled'});
    const form=medicineOptions[index%medicineOptions.length],medicine=drug?{version:1,...form,doses:form.route==='inhaled'?[4,1,2,8][Math.floor(index/medicineOptions.length)%4]:1,sourceDurationMinutes:form.route==='oral'?0:form.route==='contact'?15:3,sourceRadius:form.route==='inhaled'?10:0}:null;
    const costContract={sourceKind:activeDevice?'soul-device':category==='暗器'?'hidden-weapon':'consumable',requirements:drug?(medicine.route==='oral'?['gesture','ingest']:['gesture']):['gesture'],...(medicine?{medicine}:{}),...(activeDevice?{soulPowerCost:Math.max(1,Math.ceil(budget/100)),disposable:false}:{})};
    const harmful=specs=>specs.some(([id,p])=>effects.effectPolarity(id,p)==='harmful');
    const shellFor=specs=>{
      if(activeDevice&&specs.some(([id])=>id==='realm.store'))return [['release.touch',{}],['target.single',{阵营规则:'任意'}]];
      if(drug){
        if(!harmful(specs))return [['target.self',{阵营规则:'友方'}]];
        const mental=specs.some(([id])=>['status.mind_control','status.cognition_shift','status.soul_control','status.sleep','status.fear','status.charm'].includes(id));
        return [[medicine.route==='inhaled'?'release.projectile':'release.touch',medicine.route==='inhaled'?{距离区:1}:{}],['target.single',{阵营规则:'任意'}],['check.save',{属性:mental?'意志':'体魄'}]];
      }
      const raw=researchShell(category,context,index);
      if(activeDevice&&!harmful(specs))return [['target.self',{阵营规则:'友方'}]];
      if(activeDevice&&specs.some(([id,p])=>id==='status.next_check_penalty'&&p.命中后抵抗))return raw;
      const saveBridge=effectChannelOptions('check.save').some(channel=>context.channels.includes(channel));
      return activeDevice?raw.map(([id,p])=>id.startsWith('check.')&&saveBridge?['check.save',{属性:'意志'}]:id.startsWith('target.')?['target.single',{阵营规则:'任意'}]:[id,p]):raw;
    };
    let chosen=[],nodes=[];
    const inline=ordered.filter(([id])=>effects.EFFECT_REGISTRY[id]?.hitRule?.inline);
    if(activeDevice&&index%3===0&&inline.length){
      const [id,p]=inline[stableHash(seed+':inline')%inline.length],available=new Set(context.channels.flatMap(value=>materialChannelRecord(value)?.effectIds??[]));
      const attack=effects.hitInterferenceAttackSpecs(id,p,{variant:index,damageType:researchDamageType(context.attributes),allowsEffect:(effectId,params)=>{const attrs=effectAttributeOptions(effectId,params);return available.has(effectId)&&effectChannelOptions(effectId,params).some(channel=>context.channels.includes(channel))&&(!attrs.length||attrs.some(attribute=>context.attributes.includes(attribute)));}});
      if(attack&&effects.validateGraph(effects.makeLinearGraph(attack),{ageTier:'十万年',mechanismCap:'规则',budget,costContract}).pass){nodes=attack;chosen=attack.filter(([effectId])=>!['release','targeting','check'].includes(effects.EFFECT_REGISTRY[effectId].family));}
    }
    if(!nodes.length)for(const spec of ordered){
      if(effects.EFFECT_REGISTRY[spec[0]]?.hitRule?.inline)continue;
      if(chosen.some(([id])=>id===spec[0])||activeDevice&&chosen.length&&harmful(chosen)!==harmful([spec]))continue;
      if(chosen.length>=1+Math.floor(index/4)%4)break;
      if(drug&&!chosen.length&&effects.effectPolarity(spec[0],spec[1])!==(category==='毒药'?'harmful':'beneficial'))continue;
      const next=[...chosen,spec],shell=shellFor(next);if(!shell.length)continue;
      const candidateNodes=[...shell,...next],graph=effects.makeLinearGraph(candidateNodes,{provenance:{source:'workshop-research',seed}});
      if(!effects.validateGraph(graph,{ageTier:'十万年',mechanismCap:'规则',budget,costContract}).pass)continue;
      chosen=next;nodes=candidateNodes;
    }
    if(!chosen.length)return null;
    const optimized=allocate(nodes,budget,['均衡','威力集中','机制丰富','精准塑形'][index%4],index,costContract);
    const graph=effects.makeLinearGraph(optimized.nodes,{provenance:{source:'workshop-research',seed}}),validation=effects.validateGraph(graph,{ageTier:'十万年',mechanismCap:'规则',budget,costContract});
    if(!validation.pass)return null;
    const mechanicEffects=optimized.nodes.filter(([id])=>['payload','status','movement','transform','zone','summon'].includes(effects.EFFECT_REGISTRY[id]?.family));
    const attackDevice=activeDevice&&optimized.nodes.some(([id])=>['payload.damage','payload.drain'].includes(id)),equipmentKind=activeDevice?(attackDevice?'武器':'饰品'):undefined;
    return {...costContract,...(drug?{productPurpose:category==='毒药'?'harmful':'beneficial'}:{}),abilityValue:validation.abilityValue,candidateId:`${seed}-mechanic-${index+1}`,category,deviceCategory:activeDevice?(attackDevice?'攻击':'辅助'):'',equipmentKind,fixedForm:activeDevice?clone(foundation.EQUIPMENT_AFFIXES.FORMS.find(f=>f.kind===equipmentKind)):undefined,disposable:!activeDevice,
      effects:mechanicEffects.map(([id,params])=>({id,params:clone(params)})),frozenEffectSpecs:clone(optimized.nodes),effectGraph:clone(graph),durability:activeDevice?60:1,durabilityCost:activeDevice?1:0,cooldownTurns:0,soulPowerCost:costContract.soulPowerCost??0,downsides:[],modifiers:{attributes:{}},generationSource:'shared-budgeted-consumable-compiler',valueLedger:{totalBudget:budget,costs:{activeSkill:validation.spent,permanentAttributes:0},spent:validation.spent,remainder:budget-validation.spent}};
  }

  function resolveResearchChoiceCount(rawState, unitId = '', options = {}) {
    return researchChoiceCountInState(normalizeState(rawState),unitId,options);
  }
  function researchChoiceCountInState(state,unitId,options){
    const resolvedUnitId = clean(unitId, state.角色.主控单位ID);
    const unit = state.战斗单位.列表[resolvedUnitId];
    if (!state.人物.列表[resolvedUnitId]) throw new Error('研发候选数量解析缺少有效角色');
    const modifiers = [
      ...(options.category==='魂导器'&&talents.has(state,'craft-choice',resolvedUnitId)?[{sourceId:'craft-choice',sourceName:'匠心巧思',delta:1}]:[]),
      ...(Array.isArray(state.扩展?.研发候选修正) ? state.扩展.研发候选修正 : []),
      ...(Array.isArray(unit?.扩展?.研发候选修正) ? unit.扩展.研发候选修正 : []),
      ...(Array.isArray(options.trustedModifiers) ? options.trustedModifiers : [])
    ].map((item,index) => ({
      sourceId:clean(item?.sourceId,`research-choice-modifier-${index + 1}`),
      sourceName:clean(item?.sourceName,'研发候选修正'),
      delta:integer(item?.delta ?? 0,-2,2)
    })).filter(item=>item.delta!==0);
    const rawCount=RESEARCH_CHOICE_RULES.baseCount+modifiers.reduce((sum,item)=>sum+item.delta,0);
    return {
      baseCount:RESEARCH_CHOICE_RULES.baseCount,modifiers,rawCount,
      finalCount:integer(rawCount,RESEARCH_CHOICE_RULES.minimum,RESEARCH_CHOICE_RULES.maximum),
      minimum:RESEARCH_CHOICE_RULES.minimum,maximum:RESEARCH_CHOICE_RULES.maximum
    };
  }

  // Devices remain registered physical objects. Research never turns their modes
  // into a free active ability or a passive equipment graph.
  function restraintCandidate(templateId,candidateId,appearanceMaterials=[]){
    const device=custody.DEVICES[templateId];if(!device)throw Error('拘束器模板未登记');
    const entries=[...new Map(Object.values(device.modes).flat().map(([id,params])=>[abilities.hash({id,params}),{id,params:clone(params)}])).values()];
    return {candidateId,category:'拘束器',restraint:{kind:'registered-restraint',templateId,contractHash:abilities.hash(device)},
      effects:entries,effectGraph:null,frozenEffectSpecs:[],modifiers:{},disposable:false,durability:100,durabilityCost:0,cooldownTurns:0,soulPowerCost:0,
      fixedForm:{id:templateId,kind:'拘束器',name:device.name,bodyGroup:device.part},choiceRole:{id:'control',name:'拘束'},appearanceMaterials:clone(appearanceMaterials)};
  }
  function restraintSupported(candidate,context){
    return bridgeClausesForMechanics(candidate).every(clause=>clause.anyOf.some(value=>(clause.kind==='attribute'?context.attributes:context.channels).includes(value)));
  }
  function restraintResearchOptions(context){
    return Object.keys(custody.DEVICES).map(id=>restraintCandidate(id,'preview')).filter(candidate=>restraintSupported(candidate,context));
  }
  function presetResearchCandidate(presetId,category,context,candidateId){
    const entry=presets?.get(presetId);
    if(!entry||entry.category!==category)throw Error('精品预设与所选制作类别不一致');
    const result=presets.compile(entry.id,{budget:context.totalValue});
    if(!result.pass)throw Error(result.reason||result.errors.join('；'));
    const templateId=entry.recipe.templateId;
    if(!world.ITEM_TEMPLATES[templateId])throw Error('精品成品模板未登记');
    const appearance=context.appearanceMaterials??(context.stacks??[]).map(({entry,stack})=>({part:stack.appearancePart||stack.categories?.[0]||'',value:stack.unitValue*entry.quantity}));
    let candidate=category==='拘束器'?restraintCandidate(templateId,candidateId,appearance):{...clone(result.mechanics),candidateId};
    if(category!=='拘束器'){
      candidate.frozenEffectSpecs=(candidate.effectGraph?.nodes??[]).map(n=>[n.effectId,clone(n.params)]);
      candidate.effects=(candidate.effectGraph?.nodes??[]).filter(n=>['payload','status','movement','zone','domain','summon','transform','reaction','passive'].includes(effects.EFFECT_REGISTRY[n.effectId]?.family)).map(n=>({id:n.effectId,params:clone(n.params)}));
      if(category==='魂导器'&&effects.skillActivation(candidate.effectGraph)==='passive'){
        delete candidate.sourceKind;
        for(const key of ['requirements','resourceCosts','maintenanceCosts','castModes','usageRules','defaultCastMode','usageKey'])delete candidate[key];
      }else if(category!=='魂导器'){
        if(entry.recipe.registeredTemplate)candidate.fixedForm={id:templateId,name:entry.name,kind:world.ITEM_TEMPLATES[templateId].type,appearance:entry.appearance};
        else candidate=narrative.assignConsumableForms([candidate],category,0)[0];
      }
    }
    const priced=category==='拘束器'?{costs:{restraint:custody.DEVICES[templateId].price/5},spent:custody.DEVICES[templateId].price/5}:
      category==='魂导器'&&effects.skillActivation(candidate.effectGraph)==='passive'?world.priceEquipment(candidate.effectGraph,candidate.modifiers):
      (()=>{const checked=effects.validateGraph(candidate.effectGraph,{costContract:candidate});if(!checked.pass)throw Error(checked.errors.join('；'));return {costs:{activeSkill:checked.spent,permanentAttributes:0},spent:checked.spent};})();
    candidate={...candidate,valueLedger:{totalBudget:context.totalValue,...priced,remainder:context.totalValue-priced.spent},presetId:entry.id,prototypeTemplateId:templateId,presetContractHash:abilities.hash({category:entry.category,recipe:entry.recipe}),artId:entry.artId,appearanceMaterials:clone(appearance)};
    if(!restraintSupported(candidate,context))throw Error('所选材料不能支撑精品预设的完整效果与施展通道');
    return candidate;
  }
  function validatePresetResearchCandidate(pending,candidate){
    if(!candidate.presetId)return [];
    try{
      const expected=presetResearchCandidate(candidate.presetId,pending.category,{totalValue:pending.mechanicBudget,...pending.evidence,appearanceMaterials:candidate.appearanceMaterials},candidate.candidateId);
      const ignored=new Set(['name','description','form','narrativeSource','effectSpecs','graph','spent','valueLedger']);
      const mechanical=v=>Object.fromEntries(Object.entries(v).filter(([key])=>!ignored.has(key)));
      if(abilities.hash(mechanical(candidate))!==abilities.hash(mechanical(expected)))throw Error('精品配方与登记的完整机制不一致');
      return [];
    }catch(error){return [error.message];}
  }
  function validateRestraintCandidate(pending,candidate,index){
    const errors=[];let expected=null,spent=Infinity;
    try{
      expected=restraintCandidate(candidate.restraint?.templateId,candidate.candidateId,candidate.appearanceMaterials??[]);
      const base=Object.fromEntries(Object.entries(candidate).filter(([key])=>!['name','description','form','narrativeSource','effectSpecs','graph','spent','valueLedger','presetId','prototypeTemplateId','presetContractHash','artId'].includes(key)));
      if(abilities.hash(base)!==abilities.hash(expected))throw Error('拘束器完整合同与登记模板不一致');
      if(!restraintSupported(expected,pending.evidence))throw Error('材料不能支撑拘束器全部模式');
      spent=custody.DEVICES[candidate.restraint.templateId].price/5;
      if(spent>pending.mechanicBudget)throw Error('拘束器材料价值不足');
    }catch(error){errors.push(error.message);}
    errors.push(...validatePresetResearchCandidate(pending,candidate));
    if(!clean(candidate.name))errors.push('候选缺少名称');
    return {index,pass:!errors.length,errors,normalized:{...clone(candidate),effectSpecs:[],graph:null,spent,valueLedger:{budget:pending.mechanicBudget,effects:spent,permanentAttributes:0,total:spent,remainder:Math.max(0,pending.mechanicBudget-spent),effectCosts:[{name:'登记拘束器',cost:spent}]}}};
  }
  function researchMinimumBudget(category, context, allocate=effects.createWorkshopAllocator()) {
    if(category==='拘束器'){const values=restraintResearchOptions(context).map(candidate=>custody.DEVICES[candidate.restraint.templateId].price/5);return values.length?Math.min(...values):null;}
    const allowedEffectIds = unlockedResearchEffectIds(category,context);
    const canCompile = budget => category === '魂导器'
      ? world.compileBudgetedSoulDevice({budget,attributes:context.attributes,channels:context.channels,allowedEffectIds,seed:'research-minimum',ageTier:'十万年',mechanismCap:'规则',source:'workshop-minimum'}).pass||Boolean(compileBudgetedConsumable(category,context,budget,'research-minimum',0,allocate))
      : Boolean(compileBudgetedConsumable(category,context,budget,'research-minimum',0,allocate));
    let high = 64;
    while (high < 65536 && !canCompile(high)) high *= 2;
    if (!canCompile(high)) return null;
    let low = 1;
    while (low < high) {
      const middle = Math.floor((low+high)/2);
      if (canCompile(middle)) high=middle;
      else low=middle+1;
    }
    return low;
  }

  function previewResearch(rawState, request = {}, options = {}) {
    const state = normalizeState(rawState),actorId=researchRequest(state,options,{request}).actorId;
    const category = clean(request.category);
    if (!PRODUCT_CATEGORIES.includes(category)) throw new Error('研发类别只能是丹药、毒药、暗器、魂导器或拘束器');
    const context = selectedMaterialContext(state,request.materials,actorId);
    if(request.confirmedDesign&&(request.hostDesign||request.presetId))throw Error('固定设计不能同时指定宿主组合或精品预设');
    if(request.hostDesign&&request.presetId)throw Error('宿主组合与精品预设不能同时指定');
    const designQuote=request.confirmedDesign?designQuoteSummary(globalThis.SoulPaidDesign.quote(category,request.confirmedDesign)):null;
    const hostQuote=request.hostDesign?hostQuoteSummary(globalThis.SoulHostPricing.quoteDesign(category,request.hostDesign)):null;
    const presetQuote=request.presetId?presets.quote(request.presetId):null;
    const minimumBudget = designQuote?designQuote.materialValue:hostQuote?hostQuote.materialValue:request.presetId?presetQuote.value:researchMinimumBudget(category,context);
    const unlockedEffects = unlockedResearchEffectIds(category,context).map(id=>({id,name:effects.EFFECT_REGISTRY[id]?.displayName ?? '已登记效果'}));
    const bridgePass = Number.isInteger(minimumBudget);
    const choiceRule=researchChoiceCountInState(state,actorId,{category});
    let mechanicPreview=null;
    let reason=!bridgePass ? '这些材料尚不能组成完整作品，请补充具有合适用途的材料' : context.totalValue < minimumBudget ? '这些材料不足以制成作品，可增加数量或换用更合适的材料' : '';
    if(!reason) {
      try {mechanicPreview=prepareResearchMechanics(state,category,context,clean(request.concept),actorId,{presetId:request.presetId,hostDesign:request.hostDesign,confirmedDesign:request.confirmedDesign})}
      catch(error) {reason=request.presetId||request.hostDesign||request.confirmedDesign?error.message:/储物/u.test(clean(request.concept)) ? '目前无法制作储物魂导器，请调整成品构想' : category==='魂导器'?'这些材料暂不能制成所选类别的作品，请调整配料':'所选材料还不能制成这类作品，请调整配料或构想'}
    }
    return {
      category,goldCost:0,maximumProductValue:mechanicPreview?Math.max(...mechanicPreview.productValues):null,totalUnits:context.totalUnits,totalMaterialValue:context.totalValue,minimumBudget,hostQuote,designQuote,
      budgetDeficit:bridgePass ? Math.max(0,minimumBudget-context.totalValue) : 0,pass:!reason,
      reason,
      evidence:{attributes:clone(context.attributes),channels:clone(context.channels),registeredTraits:clone(context.registeredTraits),categories:clone(context.categories)},
      unlockedEffects,choiceRule:mechanicPreview?.choiceRule??choiceRule,availability:mechanicPreview?.availability??null,
      mechanicsHash:mechanicPreview?stableHash(JSON.stringify(mechanicPreview.mechanicCandidates)).toString(16):'',
      plannedEffects:[...new Map((mechanicPreview?.mechanicCandidates??[]).flatMap(candidate=>candidate.effects.map(effect=>[effect.id+':'+(effect.params?.属性??''),{id:effect.id,name:effect.id==='passive.equipment_stat'?effect.params.属性:effects.EFFECT_REGISTRY[effect.id]?.displayName??'已登记效果'}]))).values()]
    };
  }

  function previewWorkshopAccess(rawState, options = {}) {
    const state=normalizeState(rawState);
    try {requireResearchAction(state,researchActor(state,options));return {available:true,reason:''}}
    catch(error) {return {available:false,reason:error.message}}
  }

  function researchPresetRequirements(presetId,category){
    const entry=presets.get(presetId);if(!entry||entry.category!==category)throw Error('精品预设与所选制作类别不一致');
    const quote=presets.quote(presetId);if(!quote.pass)throw Error(quote.reason||quote.errors.join('；'));
    const mechanics=category==='拘束器'?restraintCandidate(entry.recipe.templateId,'requirements'):quote.mechanics;
    return {presetId,name:entry.name,minimumBudget:quote.value,materialRequirements:bridgeClausesForMechanics(mechanics)};
  }
  function recommendResearchMaterials(rawState, request = {}, options = {}) {
    const state = normalizeState(rawState),actorId=researchRequest(state,options,{request}).actorId;
    const category = clean(request.category);
    if (!PRODUCT_CATEGORIES.includes(category)) throw new Error('请选择魂导器、丹药、毒药、暗器或拘束器');
    if(request.presetId){
      if(request.hostDesign||request.confirmedDesign)throw Error('宿主组合与精品预设不能同时指定');
      const access=presetBlueprintAccess(state,request.presetId,actorId);
      if(access.category!==category)throw Error('精品预设与所选制作类别不一致');
      if(!access.known)return {found:false,materials:[],message:access.reason};
    }
    const records = Object.values(personMaterials(state,actorId)).filter(stack => stack.quantity > 0).map(stack => {
      const evidence = materialBridgeEvidence(stack);
      return {stack,evidence,effectIds:new Set(evidence.channels.flatMap(channel => materialChannelRecord(channel)?.effectIds ?? []))};
    }).sort((a,b)=>a.stack.fingerprint.localeCompare(b.stack.fingerprint));
    if(request.hostDesign||request.confirmedDesign){
      const quote=request.confirmedDesign?globalThis.SoulPaidDesign.quote(category,request.confirmedDesign):globalThis.SoulHostPricing.quoteDesign(category,request.hostDesign),hostQuote=request.hostDesign?hostQuoteSummary(quote):null,designQuote=request.confirmedDesign?designQuoteSummary(quote):null;
      const skeleton=(request.confirmedDesign?confirmedResearchCandidate:hostResearchCandidate)(category,{totalValue:quote.materialValue,attributes:attributeNames,channels:channelNames,registeredTraits:[],appearanceMaterials:[]},'fixed-recommendation',request.confirmedDesign??request.hostDesign);
      const clauses=bridgeClausesForMechanics(skeleton),plans=[];
      // Bounded verified recommendations, including each universal stack and two mixed plans.
      // A missing recommendation never declares unexamined combinations impossible.
      for(const record of records)if(clauses.every(clause=>materialSatisfiesBridge(record.stack,clause))){const quantity=Math.max(1,Math.ceil(quote.materialValue/record.stack.unitValue));if(quantity<=10&&quantity<=record.stack.quantity)plans.push([{fingerprint:record.stack.fingerprint,quantity}]);}
      for(const descending of [false,true]){
        const selected=new Map(),remaining=new Set(clauses.map((_,i)=>i));let units=0,value=0;
        while(units<10&&(remaining.size||value<quote.materialValue)){
          const choices=records.filter(r=>(selected.get(r.stack.fingerprint)??0)<r.stack.quantity).map(r=>({r,covered:[...remaining].filter(i=>materialSatisfiesBridge(r.stack,clauses[i])).length})).sort((a,b)=>b.covered-a.covered||(descending?b.r.stack.unitValue-a.r.stack.unitValue:a.r.stack.unitValue-b.r.stack.unitValue));
          const choice=choices[0];if(!choice||remaining.size&&!choice.covered)break;
          const r=choice.r;selected.set(r.stack.fingerprint,(selected.get(r.stack.fingerprint)??0)+1);units++;value+=r.stack.unitValue;
          for(const i of [...remaining])if(materialSatisfiesBridge(r.stack,clauses[i]))remaining.delete(i);
        }
        if(!remaining.size&&value>=quote.materialValue)plans.push([...selected].map(([fingerprint,quantity])=>({fingerprint,quantity})));
      }
      const verified=plans.map(materials=>{try{const context=selectedMaterialContext(state,materials,actorId);prepareResearchMechanics(state,category,context,clean(request.concept),actorId,{hostDesign:request.hostDesign,confirmedDesign:request.confirmedDesign});return {materials,totalUnits:context.totalUnits,totalMaterialValue:context.totalValue};}catch{return null;}}).filter(Boolean).sort((a,b)=>a.totalMaterialValue-b.totalMaterialValue||a.totalUnits-b.totalUnits);
      return verified.length?{found:true,...clone(verified[0]),minimumBudget:quote.materialValue,hostQuote,designQuote,message:'已找到满足整件宿主固定定义与材料桥梁的配料，请确认投入'}:{found:false,materials:[],minimumBudget:quote.materialValue,hostQuote,designQuote,message:'暂未找到满足固定宿主能力和全部材料桥梁的组合，可以手动选择后预览'};
    }
    if (!records.length) return {found:false,materials:[],message:'带回一些魂兽材料后，就可以尝试研发新作品'};
    const candidates = new Map();
    const remember = plan => {
      const materials=[];
      for(let cursor=plan;cursor?.record;cursor=cursor.previous)materials.push({fingerprint:cursor.record.stack.fingerprint,quantity:cursor.quantity});
      materials.sort((a,b)=>a.fingerprint.localeCompare(b.fingerprint));
      candidates.set(JSON.stringify(materials),{materials,value:plan.value,units:plan.units});
    };
    // Each registered effect needs attribute and channel support, plus a usable
    // delivery shape. Bounded knapsack covers these requirements in at most ten
    // units. Keep cheap and high-value plans, then validate them with the actual
    // compiler. This recommends a verified plan; it does not claim global minimum
    // value or declare all unexamined combinations impossible.
    const effectVariants=['丹药','毒药'].includes(category)?researchEffectVariants(category,{attributes:attributeNames,channels:MATERIAL_CHANNEL_CATALOG.map(c=>c.name)}):[];
    for(const effectSpec of (['丹药','毒药'].includes(category)?effectVariants:[...CATEGORY_ALLOWED[category]].filter(id=>id!=='passive.equipment_stat').concat(category==='魂导器'?['equipment.attributes',...Object.keys(foundation.EQUIPMENT_AFFIXES.REGISTRY).map(key=>'equipment.stat:'+key)]:[]).map(id=>[id,{}]))) {
      const [effectId,params]=effectSpec;
      const affix=effectId.startsWith('equipment.stat:')?foundation.EQUIPMENT_AFFIXES.REGISTRY[effectId.slice(15)]:null;
      const attributes = affix?.attributes??effectAttributeOptions(effectId,params);
      const shapes = ['丹药','毒药'].includes(category) ? ['pill'] : category === '暗器' ? ['harmful'] : ['passive'];
      for(const shape of shapes) {
        const clauses = [
          record => !attributes.length || attributes.some(attribute=>record.evidence.attributes.includes(attribute)),
          record => affix?record.evidence.channels.some(token=>affix.channels.some(channel=>materialChannelRecord(token)?.id==='channel.'+channel)):effectId==='equipment.attributes'?world.equipmentAttributes(record.evidence.attributes).length>0:effectId==='passive.element_amplify'?effectChannelOptions(effectId).some(c=>record.evidence.channels.includes(c)):effectChannelOptions(effectId,params).some(c=>record.evidence.channels.includes(c))
        ];
        if(shape==='friendly')clauses.push(record=>['target.self','target.single','target.aura'].some(id=>record.effectIds.has(id)));
        if(shape==='harmful') {
          clauses.push(record=>['release.projectile','release.melee','release.touch'].some(id=>record.effectIds.has(id)));
          clauses.push(record=>['target.single','target.line','target.cone','target.cluster','target.burst','target.chain'].some(id=>record.effectIds.has(id)));
          clauses.push(record=>['check.physical_attack','check.soul_attack','check.save'].some(id=>record.effectIds.has(id)));
        }
        const fullMask=(1<<clauses.length)-1;
        const inputs=records.map(record=>({...record,mask:clauses.reduce((mask,clause,index)=>clause(record)?mask|(1<<index):mask,0)}));
        if(inputs.reduce((mask,record)=>mask|record.mask,0)!==fullMask)continue;
        for(const strategy of ['economical','strong']) {
          let plans=new Map([[0,{mask:0,units:0,value:0,record:null,previous:null}]]);
          for(const record of inputs) {
            const next=new Map(plans);
            for(const plan of plans.values())for(let quantity=1;quantity<=Math.min(record.stack.quantity,10-plan.units);quantity++) {
              const units=plan.units+quantity;
              const mask=plan.mask|record.mask;
              const value=plan.value+quantity*record.stack.unitValue;
              const key=units*32+mask;
              const prior=next.get(key);
              if(!prior || (strategy==='economical'?value<prior.value:value>prior.value))next.set(key,{mask,units,value,record,quantity,previous:plan});
            }
            plans=next;
          }
          for(const plan of plans.values())if(plan.mask===fullMask&&plan.units>0)remember(plan);
        }
      }
    }
    const minimums=new Map(),allocate=effects.createWorkshopAllocator();
    const highValue=request.goal==='value',verified=[];
    const ordered=[...candidates.values()].sort((a,b)=>(highValue?b.value-a.value:a.value-b.value)||a.units-b.units||JSON.stringify(a.materials).localeCompare(JSON.stringify(b.materials)));
    let examined=0;
    for(const plan of ordered) {
      const context=selectedMaterialContext(state,plan.materials,actorId);
      const key=JSON.stringify([context.attributes,context.channels]);
      if(!minimums.has(key))minimums.set(key,request.presetId?presets.quote(request.presetId).value:researchMinimumBudget(category,context,allocate));
      const minimum=minimums.get(key);
      if(!Number.isInteger(minimum)||context.totalValue<minimum)continue;
      // Candidate seeds can choose different allowed effects. Check the same next
      // research operation before offering any plan to the player.
      try {
        const prepared=prepareResearchMechanics(state,category,context,clean(request.concept),actorId,{presetId:request.presetId,hostDesign:request.hostDesign,confirmedDesign:request.confirmedDesign},allocate);
        const result={found:true,materials:clone(plan.materials),totalUnits:plan.units,totalMaterialValue:plan.value,minimumBudget:minimum,productValue:Math.max(...prepared.productValues),message:'已找到可用配料，请查看投入清单后确认'};
        if(!highValue)return result;
        verified.push(result);
      } catch {continue;}
      if(++examined>=64)break;
    }
    if(verified.length){verified.sort((a,b)=>b.productValue-a.productValue||a.totalMaterialValue-b.totalMaterialValue||a.totalUnits-b.totalUnits);return {...verified[0],compared:verified.length,searchScope:'本品类最多64组材料组合及各自正式成品候选',alternatives:verified.slice(0,3),message:'按实际成品估值排序，已选择本次验证候选中价值最高的配料；尚未消耗材料。'};}
    return {found:false,materials:[],message:'暂未找到合适的推荐组合，可以手动选择1至10份材料再查看结果'};
  }

  function freezeResearchMechanics(category, context, pendingId, choiceCount = RESEARCH_CHOICE_RULES.baseCount, options = {}, allocate=effects.createWorkshopAllocator()) {
    const attributes = context.attributes;
    const budget = Number.isFinite(Number(context.totalValue)) ? Number(context.totalValue) : 300;
    const resolvedChoiceCount=integer(choiceCount,1,RESEARCH_CHOICE_RULES.maximum);
    const generationSeed=clean(options.seed,pendingId);
    if(options.confirmedDesign){
      if(options.hostDesign||options.presetId)throw Error('固定设计不能同时指定其他研发方案');
      const c=confirmedResearchCandidate(category,context,`${pendingId}-mechanic-1`,options.confirmedDesign);
      if(options.availability)Object.assign(options.availability,{requestedCount:1,actualCount:1,summary:'按已确认完整设计形成一份作品',details:['实际能力、费用、材料桥梁及名称已冻结。']});
      return [c];
    }
    if(options.hostDesign){
      if(options.presetId)throw Error('宿主组合与精品预设不能同时指定');
      const candidate=hostResearchCandidate(category,context,`${pendingId}-mechanic-1`,options.hostDesign);
      if(options.availability)Object.assign(options.availability,{requestedCount:1,actualCount:1,summary:'按已确认宿主固定定义形成一份完整作品',details:['能力清单、完整可达范围和材料桥梁已经冻结；名称与外观描述不会改动能力。']});
      return [candidate];
    }
    if(options.presetId){
      const candidate=presetResearchCandidate(options.presetId,category,context,`${pendingId}-mechanic-1`);
      if(options.availability)Object.assign(options.availability,{requestedCount:1,actualCount:1,summary:'这份配方可制成一件作品。',details:['将按配方制成相应器型，并保留列出的功效。']});
      return [candidate];
    }
    const minimumBudget = researchMinimumBudget(category,context,allocate);
    if (!Number.isInteger(minimumBudget)) throw new Error(`所选材料缺少能组成完整${category}的施展、目标或效果桥梁`);
    if (budget < minimumBudget) throw new Error(`研发材料预算不足：当前${budget}，最低需要${minimumBudget}`);
    if(category==='拘束器'){
      const eligible=restraintResearchOptions(context).filter(candidate=>custody.DEVICES[candidate.restraint.templateId].price/5<=budget).sort((a,b)=>custody.DEVICES[b.restraint.templateId].price-custody.DEVICES[a.restraint.templateId].price);
      const appearance=context.appearanceMaterials??(context.stacks??[]).map(({entry,stack})=>({part:stack.appearancePart||stack.categories?.[0]||'',value:stack.unitValue*entry.quantity}));
      const result=eligible.slice(0,resolvedChoiceCount).map((candidate,index)=>{
        const id=`${pendingId}-mechanic-${index+1}`,entry=presets.list({category}).find(e=>e.recipe.templateId===candidate.restraint.templateId);
        return entry&&presets.routeFor(generationSeed,'research',index)==='preset'?presetResearchCandidate(entry.id,category,context,id):restraintCandidate(candidate.restraint.templateId,id,appearance);
      });
      if(options.availability)Object.assign(options.availability,{requestedCount:resolvedChoiceCount,actualCount:result.length,summary:`本次形成 ${result.length} / ${resolvedChoiceCount} 个可选作品`,details:[`材料必须支持每件拘束器的全部模式；本次可制成${result.map(c=>c.fixedForm.name).join('、')}。`]});
      return result;
    }

      const allowedEffectIds=unlockedResearchEffectIds(category,context),pool=[];
      const rejected={incomplete:0,duplicate:0};
      const roles=Object.keys(world.EQUIPMENT_ROLE_LABELS).sort((a,b)=>stableHash(generationSeed+':'+a)-stableHash(generationSeed+':'+b));
      const fingerprints=new Set(options.excludedFingerprints ?? []);
      let passiveAttempt=0;
      const activePool=category==='魂导器'&&allowedEffectIds.some(id=>ACTIVE_DEVICE_EFFECT_IDS.includes(id));
      for(let attempt=0;attempt<(activePool?128:64);attempt++){
        let candidate;
        if(activePool&&attempt%2===0){
          candidate=compileBudgetedConsumable(category,context,budget,pendingId+':active:'+attempt,attempt,allocate);
        }else if(category==='魂导器'){
          const variant=passiveAttempt++;
          const compiled=world.compileBudgetedSoulDevice({budget,attributes,channels:context.channels,allowedEffectIds,
            candidateRole:roles[variant%roles.length],
            seed:generationSeed+':'+variant,variantIndex:Math.floor(variant/roles.length)+stableHash(generationSeed)%97,maxEffectCount:1+Math.floor(variant/roles.length)%4,
            ageTier:'十万年',mechanismCap:'规则',source:'workshop-research'});
          if(!compiled.pass){rejected.incomplete++;continue;}
        const mechanicEffects=compiled.effectSpecs.filter(([id])=>['payload','status','movement','zone','domain','summon','transform','reaction','passive'].includes(effects.EFFECT_REGISTRY[id]?.family));
        candidate={
          candidateId:pendingId+'-mechanic-'+(attempt+1),category,equipmentKind:compiled.equipmentKind,deviceCategory:compiled.deviceCategory,disposable:false,
          effects:mechanicEffects.map(([id,params])=>({id,params:clone(params)})),frozenEffectSpecs:clone(compiled.effectSpecs),effectGraph:clone(compiled.effectGraph),
          durability:100,durabilityCost:0,cooldownTurns:0,soulPowerCost:0,
          downsides:[],modifiers:clone(compiled.modifiers),generationSource:'shared-budgeted-soul-device-compiler',valueLedger:clone(compiled.valueLedger)};
        }else candidate=compileBudgetedConsumable(category,context,budget,pendingId+':'+attempt,attempt,allocate);
        if(!candidate){rejected.incomplete++;continue;}
        if(['丹药','毒药'].includes(category))candidate=narrative.assignConsumableForms([candidate],category,stableHash(candidate.candidateId))[0];
        const fingerprint=researchCandidateFingerprint(candidate);
        if(fingerprints.has(fingerprint)){rejected.duplicate++;continue;}
        fingerprints.add(fingerprint);pool.push(candidate);
      }
      if(category==='魂导器'){
        const kinds=['防具','武器','饰品','手套'].sort((a,b)=>stableHash(generationSeed+':kind:'+a)-stableHash(generationSeed+':kind:'+b));
        pool.sort((a,b)=>kinds.indexOf(a.equipmentKind)-kinds.indexOf(b.equipmentKind)||b.valueLedger.spent-a.valueLedger.spent);
      }
      if(['丹药','毒药'].includes(category))pool.sort((a,b)=>stableHash(generationSeed+':medicine:'+a.candidateId)-stableHash(generationSeed+':medicine:'+b.candidateId));
      const eligible=options.replacedCandidate?pool.filter(candidate=>{
        const comparison=effects.compareStrongCandidates(candidate,options.replacedCandidate);
        return comparison.overlap<.5&&effects.compareCandidates(candidate,options.replacedCandidate).different;
      }):pool;
      let results=category==='魂导器'?effects.selectStrongCandidates(eligible,resolvedChoiceCount,options.excludedCandidates??[]):effects.selectDiverseCandidates(pool,resolvedChoiceCount,options.excludedCandidates??[]);
      if(category==='魂导器'&&eligible.some(c=>c.sourceKind==='soul-device')){
        const active=effects.selectStrongCandidates(eligible.filter(c=>c.sourceKind==='soul-device').sort((a,b)=>stableHash(generationSeed+':active:'+a.candidateId)-stableHash(generationSeed+':active:'+b.candidateId)),1,options.excludedCandidates??[]);
        if(active.length)results=[...active,...effects.selectStrongCandidates(eligible.filter(c=>c.sourceKind!=='soul-device').sort((a,b)=>stableHash(generationSeed+':passive-category:'+a.deviceCategory)-stableHash(generationSeed+':passive-category:'+b.deviceCategory)),resolvedChoiceCount-1,[...active,...(options.excludedCandidates??[])])];
      }
      if(!results.length)throw new Error(options.excludedCandidates?.length?'这些材料暂无其他不同方案，原作品和重抽机会已保留':'这些材料暂不能制成所选类别的作品，请调整配料');
      if(category==='魂导器')results=narrative.assignProductForms(results,clean(options.concept),options.excludedCandidates??[],stableHash(generationSeed));
      else results=narrative.assignConsumableForms(results,category,stableHash(generationSeed));
      const appearanceMaterials=context.appearanceMaterials??(context.stacks??[]).map(({entry,stack})=>({part:stack.appearancePart||stack.categories?.[0]||'',value:stack.unitValue*entry.quantity}));
      results=results.map(candidate=>({...candidate,appearanceMaterials:clone(appearanceMaterials)}));
      const presetFallbacks=[];
      if(!options.replacedCandidate){
        const authored=presets.list({category}).sort((a,b)=>stableHash(generationSeed+':preset:'+a.id)-stableHash(generationSeed+':preset:'+b.id));
        for(let index=0;index<results.length;index++){
          if(presets.routeFor(generationSeed,'research',index)!=='preset')continue;
          let replacement=null;
          for(const entry of authored){
            try{
              const candidate=presetResearchCandidate(entry.id,category,context,results[index].candidateId);
              const qualified=(c,key)=>`${effects.skillActivation(c.effectGraph)==='active'?'active:':''}${c.fixedForm?.[key]??''}`;
              if(results.some((c,i)=>i!==index&&(researchCandidateFingerprint(c)===researchCandidateFingerprint(candidate)||category==='魂导器'&&['kind','bodyGroup','id'].some(key=>qualified(c,key)===qualified(candidate,key)))))continue;
              if([...results.filter((_,i)=>i!==index),...(options.excludedCandidates??[])].some(c=>!effects.compareStrongCandidates(candidate,c).different))continue;
              const checked=validateResearchCandidate({category,concept:options.concept??'',evidence:context,mechanicBudget:budget},{...candidate,name:entry.name},index);
              if(!checked.pass)continue;
              replacement=candidate;break;
            }catch{}
          }
          if(replacement)results[index]=replacement;
          else presetFallbacks.push(`第${index+1}份候选没有完整符合当前材料、通道和预算的精品配方，使用随机方案。`);
        }
      }
      if(options.availability){
        const sourceDirections=context.channels.map(channel=>materialChannelRecord(channel)?.name).filter(Boolean);
        const details=[`本次材料工艺价值${budget}，组成一件完整作品至少需要${minimumBudget}。`, `材料属性：${context.attributes.join('、')}。`,...presetFallbacks,...(sourceDirections.length?[`材料可用方向：${[...new Set(sourceDirections)].join('、')}。`]:[])];
        const allowedNames=[...new Set(allowedEffectIds.filter(id=>!['release','targeting','check'].includes(effects.EFFECT_REGISTRY[id]?.family)).map(id=>effects.EFFECT_REGISTRY[id]?.displayName).filter(Boolean))];
        details.push(`这些材料允许的实际功效：${allowedNames.join('、')||'尚无完整功效'}。`);
        details.push(`已形成${pool.length}件符合用料要求的完整作品，合并功能重复或缺少明显取舍的方案后，留下${results.length}件。`);
        if(category==='魂导器'){
          const formed=new Set(pool.map(candidate=>candidate.equipmentKind));
          const requirements={武器:'须有足够的攻击强化',防具:'须有足够的防护强化',饰品:'至少一半功效用于属性伤害增幅或属性防护',手套:'须同时具备相当的攻击与防护强化'};
          details.push(`本次可选类别：${results.map(candidate=>candidate.equipmentKind).join('、')}。`);
          for(const kind of Object.keys(requirements))if(!formed.has(kind))details.push(`${kind}：${requirements[kind]}，本次用料未形成符合要求的作品。`);
          if(formed.size>results.length)details.push('其他作品与已列出的方案功能重叠，未作为不同选择重复列出。');
        }else{
          const effectNames=[...new Set(results.flatMap(candidate=>(candidate.effectGraph?.nodes??[]).filter(node=>!['release','targeting','check'].includes(effects.EFFECT_REGISTRY[node.effectId]?.family)).map(node=>effects.EFFECT_REGISTRY[node.effectId]?.displayName).filter(Boolean)))];
          details.push(`本次可选功效：${effectNames.join('、')}。`);
          if(pool.length>results.length)details.push('其余完整作品的实际功能重叠，无法提供足够不同的取舍。');
          if(rejected.incomplete)details.push('部分尝试在当前用料价值和可用功效下，未组成完整作品。');
          if(rejected.duplicate)details.push('相同效果的重复作品已剔除，换名或只改强弱不增加选项。');
        }
        details.push('本次尝试未找到更多合适作品。更换用途或增加用料可以重新尝试，但不保证增加选项。');
        Object.assign(options.availability,{requestedCount:resolvedChoiceCount,actualCount:results.length,summary:`本次形成 ${results.length} / ${resolvedChoiceCount} 个可选作品`,details:results.length<resolvedChoiceCount||presetFallbacks.length?details:[],diagnostics:{attempts:64,...rejected,valid:pool.length,distinct:results.length}});
      }
      return results;
  }


  function researchCandidateFingerprint(candidate) {
    if(candidate.confirmedDesign)return abilities.hash({confirmedDesign:candidate.confirmedDesign,designQuote:candidate.designQuote});
    if(candidate.hostDesign)return abilities.hash({hostDesign:candidate.hostDesign,hostQuote:candidate.hostQuote});
    if(candidate.category==='拘束器')return abilities.hash(candidate.restraint);
    const contract=abilities.mechanics(candidate);delete contract.id;
    return JSON.stringify({effects:candidate.effectGraph,modifiers:candidate.modifiers,equipmentKind:candidate.equipmentKind,fixedForm:candidate.fixedForm,
      cooldownTurns:candidate.cooldownTurns,soulPowerCost:candidate.soulPowerCost,
      disposable:candidate.disposable,durability:candidate.durability,contract});
  }

  function productMechanics(candidate) {
    const {name,description,form,narrativeSource,...mechanics}=candidate;
    return mechanics;
  }
  function assertResearchFrozen(pending) {
    if(!Array.isArray(pending.mechanicCandidates)||pending.mechanicsHash!==stableHash(JSON.stringify(pending.mechanicCandidates)).toString(16))throw new Error('研发冻结合同指纹不一致');
    for(const result of pending.candidates??[]){
      const frozen=pending.mechanicCandidates[result.index];
      if(!frozen||!result.normalized)throw new Error('研发候选缺少冻结来源');
      const named=result.normalized;
      const checked=validateResearchCandidate(pending,{...clone(frozen),name:named.name,description:named.description,form:named.form,narrativeSource:named.narrativeSource},result.index);
      if(result.pass!==checked.pass||abilities.hash(productMechanics(named))!==abilities.hash(productMechanics(checked.normalized)))throw new Error('研发命名改变了冻结合同');
    }
    const passed=(pending.candidates??[]).filter(result=>result.pass).map(result=>result.index);
    if(abilities.hash(passed)!==abilities.hash(pending.successfulIndexes??[]))throw new Error('研发候选通过列表不一致');
  }
  function blueprintFingerprint(blueprint) {
    return abilities.hash({ownerId:blueprint.ownerId,version:blueprint.version,category:blueprint.category,productKind:blueprint.productKind,subtype:blueprint.subtype,templateId:blueprint.templateId,
      requiredValue:blueprint.requiredValue,productValue:blueprint.productValue,bridgeClauses:blueprint.bridgeClauses,mechanics:productMechanics(blueprint.mechanics)});
  }

  const PRESET_BLUEPRINT_CATEGORIES=Object.freeze(['丹药','毒药','暗器','魂导器','拘束器']);
  const presetBlueprintRecipeCache=new Map();
  const presetBlueprintId=(actorId,presetId)=>`preset-blueprint:${encodeURIComponent(actorId)}:${presetId}`;
  const studyKey=(actorId,presetId)=>`${actorId}|${presetId}`;
  function presetBlueprintEntry(presetId){const entry=presets.get(presetId);if(!entry||!PRESET_BLUEPRINT_CATEGORIES.includes(entry.category))throw Error('这不是已登记的制作配方');return entry;}
  function presetBlueprintPolicy(presetId){
    const entry=presetBlueprintEntry(presetId),productValue=world.calculateItemValue(entry.recipe.templateId),grade=world.itemGradeFromValue(productValue);
    const free=grade.value<=2&&entry.gates.rarity!=='跨时代稀有';
    return {presetId:entry.id,category:entry.category,name:entry.name,productValue,grade,free,bookTemplateId:`blueprint-book:${entry.id}`,price:Math.max(100,Math.ceil(productValue*.4))};
  }
  function validPresetStudy(state,actorId,presetId){
    const row=state.研发?.图纸学习?.[studyKey(actorId,presetId)];if(!row)return null;
    const {hash,...body}=row,entry=presets.get(presetId),receipt=state.远征?.processedTransactions?.[row.id],source=state.远征?.commandRequests?.[row.id];
    const expected={actorId,request:{itemId:row.itemId}},book=world.ITEM_TEMPLATES[`blueprint-book:${presetId}`];
    if(!entry||!book||hash!==abilities.hash(body)||row.actorId!==actorId||row.presetId!==presetId||row.templateId!==`blueprint-book:${presetId}`||row.bookContractHash!==abilities.hash(book.payload.blueprintBook)||row.recipeHash!==abilities.hash({category:entry.category,recipe:entry.recipe})||row.at>people.now(state)||source?.type!=='学习预设图纸'||source.requestHash!==abilities.hash(expected)||abilities.hash(source.request)!==abilities.hash(expected)||receipt?.type!=='preset-blueprint-learned'||receipt.actorId!==actorId||receipt.presetId!==presetId||receipt.itemId!==row.itemId||receipt.studyHash!==hash||receipt.blueprintId!==presetBlueprintId(actorId,presetId))return null;
    return row;
  }
  function presetBlueprintAccess(state,presetId,actorId=state.角色?.主控单位ID){
    const policy=presetBlueprintPolicy(presetId);
    if(!state.人物?.列表?.[actorId])return {...policy,known:false,source:'unavailable',blueprintId:null};
    const researched=Object.values(state.研发?.蓝图??{}).find(b=>b.ownerId===actorId&&b.mechanics?.presetId===presetId&&!b.knowledgeOrigin&&b.createdFromResearchId);
    const studied=validPresetStudy(state,actorId,presetId),known=!!(policy.free||researched||studied);
    return {...policy,known,source:researched?'research':policy.free?'public':studied?'learned':'purchase',blueprintId:researched?.id??(known?presetBlueprintId(actorId,presetId):null),reason:known?'':'请先购买并学习这份设计图，可在城市商店或拍卖行寻找。'};
  }
  function presetBlueprintRecipe(presetId){
    const entry=presetBlueprintEntry(presetId),key=abilities.hash({category:entry.category,recipe:entry.recipe,artId:entry.artId});
    if(presetBlueprintRecipeCache.has(key))return clone(presetBlueprintRecipeCache.get(key));
    const quote=presets.quote(presetId);if(!quote.pass)throw Error(quote.reason);
    const evidence={attributes:[...attributeNames],channels:[...channelNames],registeredTraits:[],categories:[]},context={totalValue:quote.value,...evidence,appearanceMaterials:[]};
    const candidate={...presetResearchCandidate(presetId,entry.category,context,`catalogue:${presetId}`),name:entry.name,description:entry.description,form:entry.appearance,narrativeSource:'preset'},checked=validateResearchCandidate({category:entry.category,mechanicBudget:quote.value,evidence},candidate,0);
    if(!checked.pass)throw Error(checked.errors.join('；'));
    const chosen={...checked.normalized,name:entry.name,description:entry.description,form:entry.appearance,narrativeSource:'preset'},requiredValue=chosen.spent,productValue=compileProductValue(entry.category,chosen);
    const result={version:3,name:entry.name,category:entry.category,concept:entry.description,...productLifetime(entry.category,chosen),templateId:productTemplate(entry.category,chosen),requiredValue,productValue,bridgeClauses:bridgeClausesForMechanics(chosen),mechanics:chosen,description:entry.description,form:entry.appearance,createdFromResearchId:null,researchProvenance:{totalMaterialValue:quote.value,totalUnits:0,evidence,materials:[],sourceKind:'catalogue-recipe'},tradable:false,inventoryItem:false};
    presetBlueprintRecipeCache.set(key,clone(result));return result;
  }
  function cataloguePresetBlueprint(state,presetId,actorId=state.角色?.主控单位ID){
    const policy=presetBlueprintPolicy(presetId),study=validPresetStudy(state,actorId,presetId);
    if(!state.人物?.列表?.[actorId]||!policy.free&&!study)throw Error('尚未掌握这份预设图纸，请先购买并学习');
    const blueprint={...presetBlueprintRecipe(presetId),id:presetBlueprintId(actorId,presetId),ownerId:actorId,knowledgeOrigin:{kind:'preset-catalogue',presetId,access:policy.free?'public':'learned',...(policy.free?{}:{sourceId:study.id})}};
    blueprint.researchProvenance.actorId=actorId;blueprint.immutableHash=blueprintFingerprint(blueprint);return blueprint;
  }
  function catalogueBlueprintById(state,id,actorId){
    if(!String(id).startsWith(`preset-blueprint:${encodeURIComponent(actorId)}:`))return null;
    const presetId=String(id).slice(`preset-blueprint:${encodeURIComponent(actorId)}:`.length);
    return cataloguePresetBlueprint(state,presetId,actorId);
  }
  function presetBlueprints(state,actorId=state.角色?.主控单位ID){
    const owned=new Set(Object.values(state.研发?.蓝图??{}).filter(b=>b.ownerId===actorId).map(b=>b.mechanics?.presetId));
    return presets.list().filter(e=>PRESET_BLUEPRINT_CATEGORIES.includes(e.category)&&!owned.has(e.id)).flatMap(entry=>{const access=presetBlueprintAccess(state,entry.id,actorId);return access.known?[cataloguePresetBlueprint(state,entry.id,actorId)]:[];});
  }
  function presetBlueprintStock(locationId){
    const cities=['loc-notting-city','loc-soto-city','loc-heaven-dou-city','loc-longxing-city','loc-gengxin-city','loc-sea-breeze-city','loc-sea-breeze-port','loc-star-luo-city','loc-spirit-city','loc-tang-heaven-dou'];
    if(!cities.includes(locationId))return [];
    return presets.list().filter(e=>PRESET_BLUEPRINT_CATEGORIES.includes(e.category)).map(e=>presetBlueprintPolicy(e.id)).filter(p=>!p.free&&(locationId!=='loc-tang-heaven-dou'||p.category==='暗器')&&(p.grade.value<4||['loc-heaven-dou-city','loc-gengxin-city','loc-spirit-city','loc-tang-heaven-dou'].includes(locationId))).map(p=>[p.bookTemplateId,1]);
  }
  function presetBlueprintAuctionSupply(){return presets.list().filter(e=>PRESET_BLUEPRINT_CATEGORIES.includes(e.category)).map(e=>presetBlueprintPolicy(e.id)).filter(p=>!p.free&&p.price>=1000).map(p=>({kind:'item',templateId:p.bookTemplateId,supply:{unique:false}}));}
  function previewLearnPresetBlueprint(state,itemId,actorId=state.角色?.主控单位ID){
    const item=state.物品?.实例?.[itemId],book=item?.payload?.blueprintBook,template=world.ITEM_TEMPLATES[item?.templateId];
    if(!book||book.version!==1||item.type!=='图纸'||item.templateId!==`blueprint-book:${book.presetId}`||abilities.hash(book)!==abilities.hash(template?.payload?.blueprintBook))throw Error('请选择真实登记的设计图纸');
    if(!world.isCarriedItem(state,item,actorId)||item.legalOwnerEntityId!==actorId)throw Error('须实际持有并拥有这张图纸');
    globalThis.SoulActionContext.resolve(state,{actorId,battleId:null,requirements:['gesture','vision','focus']});
    const access=presetBlueprintAccess(state,book.presetId,actorId);
    return {available:!access.known,reason:access.known?'已经掌握这份图纸，无需重复学习。':'',presetId:book.presetId,blueprintId:presetBlueprintId(actorId,book.presetId),name:access.name};
  }
  function learnPresetBlueprint(rawState,request={},transactionId='learn-preset-blueprint',options={}){
    if(Object.keys(request).some(k=>k!=='itemId'))throw Error('学习图纸只接受实际物品');
    const source=researchRequest(rawState,options,{request}),actorId=source.actorId,guard=beginTransaction(rawState,transactionId,'学习预设图纸',source);
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,q=previewLearnPresetBlueprint(state,request.itemId,actorId);if(!q.available)throw Error(q.reason);
    const item=state.物品.实例[request.itemId],entry=presetBlueprintEntry(q.presetId),row={id:guard.id,actorId,presetId:entry.id,itemId:item.id,templateId:item.templateId,bookContractHash:abilities.hash(item.payload.blueprintBook),recipeHash:abilities.hash({category:entry.category,recipe:entry.recipe}),at:people.now(state)};row.hash=abilities.hash(row);
    state.研发.图纸学习??={};state.研发.图纸学习[studyKey(actorId,entry.id)]=row;
    return commit(state,guard.id,'学习预设图纸',{type:'preset-blueprint-learned',actorId,presetId:entry.id,name:entry.name,itemId:item.id,blueprintId:q.blueprintId,studyHash:row.hash,summary:`已掌握${entry.name}的制作图纸，可在工坊按图准备材料制作。`});
  }
  function validAuthoredBlueprint(state,blueprint){
    if(blueprint.knowledgeOrigin?.kind==='preset-catalogue'){try{return abilities.hash(blueprint)===abilities.hash(cataloguePresetBlueprint(state,blueprint.knowledgeOrigin.presetId,blueprint.ownerId));}catch{return false;}}
    const p=state.人物.列表[blueprint.ownerId],proof=p?.扩展?.authoredBlueprints?.find(v=>v.id===blueprint.id),origin=blueprint.knowledgeOrigin;return !!(origin?.kind==='authored-opening-knowledge'&&proof&&origin.personSeed===p.seed&&origin.sourceId===p.扩展.commerceUnique?.sourceId&&proof.hash===abilities.hash({id:blueprint.id,immutableHash:blueprint.immutableHash,origin})&&blueprint.ownerId==='captive-smith-cheng');
  }
  function registerAuthoredCommerceBlueprints(state){
    const actorId='captive-smith-cheng',p=state.人物.列表[actorId];if(!p?.扩展.commerceUnique||p.扩展.authoredBlueprints)throw Error('人工初始知识只能登记一次');state.研发??={蓝图:{},待处理:{},历史:[]};p.扩展.authoredBlueprints=[];
    for(const [key,templateId,name,category] of [['heart','device-leaf-heart','叠叶护心衣修械图','魂导器'],['tether','restraint-tether','扣腕牵绳锻制图','拘束器']]){
      const t=world.ITEM_TEMPLATES[templateId],chosen=category==='拘束器'?{...restraintCandidate(templateId,`authored-${key}`),name,description:'本人早年形成的锻制知识，须本人自由操作、实际材料和工时。',form:'纸上锻制图',narrativeSource:'authored'}:{candidateId:`authored-${key}`,category,name,description:t.description,form:t.fixedForm.name,narrativeSource:'authored',graph:clone(t.passiveEffectGraph),effectGraph:clone(t.passiveEffectGraph),modifiers:clone(t.modifiers),equipmentKind:t.equipmentKind,fixedForm:clone(t.fixedForm),deviceCategory:t.deviceCategory,disposable:false,durability:100,durabilityCost:0,cooldownTurns:0,soulPowerCost:0};
      if(category==='魂导器')chosen.effects=chosen.graph.nodes.map(v=>({id:v.effectId,params:clone(v.params)}));
      const bridgeClauses=bridgeClausesForMechanics(chosen),requiredValue=category==='拘束器'?custody.DEVICES[templateId].price/5:world.priceEquipment(chosen.graph,chosen.modifiers).spent,id=`authored-blueprint:${actorId}:${key}`,evidence={attributes:[...new Set(bridgeClauses.filter(v=>v.kind==='attribute').flatMap(v=>v.anyOf))],channels:[...new Set(bridgeClauses.filter(v=>v.kind!=='attribute').flatMap(v=>v.anyOf))]};
      const b={id,ownerId:actorId,version:3,name,category,concept:'本人在当前世界建立前完成并独立保留的工艺知识',...productLifetime(category,chosen),templateId:category==='魂导器'?'crafted-soul-device':templateId,requiredValue,productValue:requiredValue*5,bridgeClauses,mechanics:chosen,description:chosen.description,form:chosen.form,createdFromResearchId:null,researchProvenance:{actorId,totalMaterialValue:requiredValue,totalUnits:1,evidence,materials:[]},knowledgeOrigin:{kind:'authored-opening-knowledge',sourceId:p.扩展.commerceUnique.sourceId,personSeed:p.seed,templateId},tradable:false,inventoryItem:false};b.immutableHash=blueprintFingerprint(b);validateEquipmentBlueprint(b);state.研发.蓝图[id]=b;p.扩展.authoredBlueprints.push({id,hash:abilities.hash({id,immutableHash:b.immutableHash,origin:b.knowledgeOrigin})});
    }
    return p.扩展.authoredBlueprints;
  }

  function rerollResearchCandidate(rawState,request={},transactionId='reroll-research-candidate',options={}) {
    const source=researchRequest(rawState,options,{request}),actorId=source.actorId;
    const guard=beginTransaction(rawState,transactionId,'重抽魂导器方案',source);
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state;
    requireResearchAction(state,actorId);ensureLocalService(state,'基础工坊',actorId);
    if(!talents.has(state,'reroll',actorId))throw new Error('尚未拥有时来运转天赋');
    const pending=assertResearchOwner(state,state.研发.待处理[clean(request.pendingId)],actorId);
    if(!pending||pending.category!=='魂导器'||!['awaiting-llm','candidates-ready'].includes(pending.status))throw new Error('没有可重抽的魂导器方案');
    assertResearchFrozen(pending);
    if(pending.mechanicCandidates.some(c=>c.hostDesign||c.confirmedDesign))throw Error('已确认的宿主固定组合不参与随机重抽，请另行确认新设计');
    if(pending.reroll?.used)throw new Error('这次研发的重抽机会已使用');
    const index=Number(request.candidateIndex);
    if(!Number.isInteger(index)||!pending.mechanicCandidates[index])throw new Error('请选择要重抽的作品');
    const context={totalValue:pending.mechanicBudget,...clone(pending.evidence)};
    const candidate=freezeResearchMechanics('魂导器',{totalValue:pending.mechanicBudget,...clone(pending.evidence)},pending.id+':reroll:'+index,1,
      {concept:pending.concept,seed:pending.seed+':reroll:'+index,excludedFingerprints:pending.mechanicCandidates.map(researchCandidateFingerprint),excludedCandidates:pending.mechanicCandidates.filter((_,i)=>i!==index),replacedCandidate:pending.mechanicCandidates[index]})[0];
    const checked=validateResearchCandidate(pending,{...clone(candidate),name:'工坊新作'},index);
    if(!checked.pass)throw new Error('新方案暂不完整，原方案和重抽机会已保留');
    pending.mechanicCandidates[index]=candidate;pending.reroll={used:true,index};
    pending.mechanicsHash=stableHash(JSON.stringify(pending.mechanicCandidates)).toString(16);
    const local=deterministicResearchNarrativeFixture(pending).candidates;
    const labels=pending.mechanicCandidates.map((item,i)=>{
      const old=pending.candidates?.find(entry=>entry.index===i)?.normalized;
      return i===index||!old?local[i]:{candidateId:item.candidateId,name:old.name,description:old.description,form:old.form};
    });
    const previousCandidates=pending.candidates;
    pending.candidates=validateResearchNarrative(pending,{candidates:labels}).map((entry,i)=>i!==index&&previousCandidates?.[i]?clone(previousCandidates[i]):validateResearchCandidate(pending,entry,i));
    pending.successfulIndexes=pending.candidates.filter(entry=>entry.pass).map(entry=>entry.index);
    pending.pendingNamingIds=[candidate.candidateId];pending.status='candidates-ready';
    return commit(state,transactionId,'重抽魂导器方案',{type:'research-candidate-rerolled',actorId,pendingId:pending.id,candidateIndex:index,
      mechanicsHash:pending.mechanicsHash,summary:'已换成一份新的魂导器方案'});
  }

  function researchRerollAvailability(state,pending,index){
    if(pending.mechanicCandidates.some(c=>c.hostDesign||c.confirmedDesign))return {available:false,reason:'已确认的宿主固定组合不参与随机重抽'};
    if(!talents.has(state,'reroll',pending.actorId)||pending.reroll?.used)return {available:false,reason:pending.reroll?.used?'本次重抽已用完':'尚未获得重抽机会'};
    try{
      const context={totalValue:pending.mechanicBudget,...clone(pending.evidence)};
      freezeResearchMechanics(pending.category,context,pending.id+':reroll:'+index,1,{concept:pending.concept,seed:pending.seed+':reroll:'+index,excludedCandidates:pending.mechanicCandidates.filter((_,i)=>i!==index),replacedCandidate:pending.mechanicCandidates[index]});
      return {available:true,reason:''};
    }catch{return {available:false,reason:'这些材料暂无其他不同方案'};}
  }

  function researchNarrativeRequest(pending) {
    return {
      pendingId:pending.id,category:pending.category,concept:pending.concept,mechanicsHash:pending.mechanicsHash,
      candidates:pending.mechanicCandidates.map(candidate => ({
        candidateId:candidate.candidateId,...(candidate.hostDesign?{hostDesign:clone(candidate.hostDesign),hostQuote:clone(candidate.hostQuote)}:{}),deviceCategory:candidate.deviceCategory,effects:candidate.effects,modifiers:candidate.modifiers,
        medicine:candidate.medicine?clone(candidate.medicine):null,drugFacts:candidate.medicine?abilities.consumableDisposition({...candidate,sourceKind:'consumable'}):null,fixedForm:candidate.fixedForm,equipmentKind:candidate.equipmentKind,choiceRole:candidate.choiceRole,
        grade:world.itemGradeFromValue(compileProductValue(pending.category,{...candidate,graph:candidate.effectGraph,modifiers:candidate.modifiers})).name,
        facts:candidate.confirmedDesign?{definition:clone(candidate.confirmedDesign.definition),quote:clone(candidate.designQuote)}:candidate.hostDesign?{host:clone(candidate.hostDesign.definition.host),quote:clone(candidate.hostQuote)}:pending.category==='拘束器'?clone(custody.DEVICES[candidate.restraint.templateId]):effects.candidateFacts(candidate),kept:pending.pendingNamingIds?.length?!pending.pendingNamingIds.includes(candidate.candidateId):false,
        lifetime:pending.category==='拘束器'?'独立实物；实际装配后按所选模式限制佩戴者，解放、拆除、损坏及控制权限使用正常规则；没有主动技能':pending.category === '魂导器' ? candidate.sourceKind==='soul-device'?'实际装备后可主动施用，按合同支付魂力与耐久；持续结果按来源和期限核验':'装备时属性与被动常驻生效，卸下失效；没有主动技能' : '每次使用消耗一件，未命中也消耗',
        cooldownTurns:candidate.cooldownTurns,soulPowerCost:candidate.soulPowerCost
      })),
      constraints:{candidateCount:pending.mechanicCandidates.length,mechanicsImmutable:true,namingOnly:true}
    };
  }

  function validateResearchNarrative(pending, rawNarrative) {
    if(pending.category==='魂导器'&&new Set(pending.mechanicCandidates.map(c=>(c.sourceKind==='soul-device'?'active:':'')+c.fixedForm?.kind)).size!==pending.mechanicCandidates.length)throw new Error('同批装备类别不能重复');
    const entries = Array.isArray(rawNarrative) ? rawNarrative : rawNarrative?.candidates;
    if (!Array.isArray(entries) || entries.length !== pending.mechanicCandidates.length) throw new Error(`研发命名必须恰好返回${pending.mechanicCandidates.length}个冻结候选`);
    const cleanText = (value,label,minimum,maximum) => {
      const text = clean(value).replace(/\s+/gu,' ');
      if (text.length < minimum || text.length > maximum) throw new Error(`${label}应为${minimum}至${maximum}字（含标点），当前${text.length}字`);
      if (/[<>`]/u.test(text)) throw new Error(`${label}不能包含尖括号或反引号`);
      return text;
    };
    const byId = new Map(entries.map(item => [clean(item?.candidateId),item]));
    if (byId.size !== pending.mechanicCandidates.length) throw new Error('研发命名含重复候选ID');
    const narrativeSource = rawNarrative?.source === 'code-frozen-fallback' ? 'code-frozen-fallback' : 'llm-frozen-mechanics-narrative';
    const labeled=pending.mechanicCandidates.map(mechanics => {
      let label = byId.get(mechanics.candidateId);
      if (!label) throw new Error(`研发命名缺少冻结候选${mechanics.candidateId}`);
      if(mechanics.presetId){
        const entry=presets.get(mechanics.presetId);
        label={candidateId:mechanics.candidateId,name:entry.name,description:entry.description,form:mechanics.fixedForm.name};
      }
      if(pending.category==='拘束器'){if(!clean(label.form).includes(mechanics.fixedForm.name)&&!clean(label.description).includes(mechanics.fixedForm.name))throw Error(`成品形态必须明确是${mechanics.fixedForm.name}`);}else if(!presets.get(mechanics.presetId)?.recipe.registeredTemplate)narrative.validateProductForm(mechanics.fixedForm,clean(label.form),clean(label.description));
      return {...clone(mechanics),name:cleanText(label.name,'成品名',2,18),description:effects.validateDefenseNarrative(mechanics.effectGraph?.nodes,cleanText(label.description,'成品介绍',8,120),mechanics.effectGraph),form:cleanText(label.form,'成品形态',2,40),narrativeSource:mechanics.presetId?'preset':narrativeSource};
    });
    const mutable=labeled.map((_,i)=>i).filter(i=>!labeled[i].presetId&&(!pending.pendingNamingIds?.length||pending.pendingNamingIds.includes(labeled[i].candidateId)));
    const names=labeled.map((entry,i)=>mutable.includes(i)?entry.name:pending.candidates?.[i]?.normalized?.name??entry.name);
    const unique=effects.uniqueCandidateNames(names,labeled,18,mutable);
    return labeled.map((entry,i)=>({...entry,name:unique[i]}));
  }

  function deterministicResearchNarrativeFixture(pending) {
    const used=new Set(pending.mechanicCandidates.filter(c=>c.presetId).map(c=>presets.get(c.presetId).name));
    return {source:'code-frozen-fallback',candidates:pending.mechanicCandidates.map((c,index)=>{
      if(c.presetId){const entry=presets.get(c.presetId);return {candidateId:c.candidateId,name:entry.name,form:c.fixedForm.name,description:entry.description};}
      if(c.confirmedDesign)return {candidateId:c.candidateId,name:c.confirmedDesign.name,form:c.confirmedDesign.appearance,description:c.confirmedDesign.description};
      if(c.hostDesign)return {candidateId:c.candidateId,name:`构星${index+1}号`,form:c.fixedForm.name,description:`这件${c.fixedForm.name}采用已确认的宿主结构，表面纹理清晰，固定能力与控制权限按设计保留。`};
      if(pending.category==='拘束器')return {candidateId:c.candidateId,name:`束星${index+1}号`,form:c.fixedForm.name,description:`这件${c.fixedForm.name}由所投入的材料制成，纹理清晰，扣合处经过仔细打磨。`};
      return narrative.productNarrative(c,pending.category,pending.materialSnapshot,pending.concept,used);
    })};
  }

  function prepareResearchMechanics(state,category,context,concept='',actorId=state.角色.主控单位ID,options={},allocate) {
    if(options.presetId){const access=presetBlueprintAccess(state,options.presetId,actorId);if(!access.known)throw Error(access.reason);}
    if(/储物/u.test(concept))throw new Error('目前无法制作储物魂导器，请调整成品构想');
    const choiceRule=researchChoiceCountInState(state,actorId,{category});
    const pendingId=`research-${String(integer(state.远征.counters.research,0)+1).padStart(5,'0')}`;
    const availability={};
    const mechanicCandidates=freezeResearchMechanics(category,context,pendingId,choiceRule.finalCount,{concept,seed:state.世界.seed+':'+pendingId,availability,presetId:options.presetId,hostDesign:options.hostDesign,confirmedDesign:options.confirmedDesign},allocate);
    choiceRule.requestedCount=options.hostDesign||options.confirmedDesign?1:choiceRule.finalCount;
    choiceRule.finalCount=mechanicCandidates.length;
    const pending={id:pendingId,category,concept,mechanicBudget:context.totalValue,evidence:{attributes:context.attributes,channels:context.channels,registeredTraits:context.registeredTraits,categories:context.categories}};
    const checked=mechanicCandidates.map((candidate,index)=>validateResearchCandidate(pending,{...clone(candidate),name:candidate.confirmedDesign?.name??`待命名候选${index+1}`,...(candidate.confirmedDesign?{description:candidate.confirmedDesign.description,form:candidate.confirmedDesign.appearance}:{})},index));
    if(checked.some(result=>!result.pass))throw new Error(`研发候选预检失败：${checked.flatMap(result=>result.errors).join('；')}`);
    return {pendingId,choiceRule,mechanicCandidates,availability,productValues:checked.map(result=>compileProductValue(category,result.normalized))};
  }

  function explainResearchChoices(rawState,pendingId,options={}) {
    const pending=assertResearchOwner(rawState,rawState.研发?.待处理?.[clean(pendingId)],researchActor(rawState,options));
    if(!pending)throw new Error('这次试制已处理');
    if(!pending.availability)return {requestedCount:pending.choiceRule.requestedCount,actualCount:pending.mechanicCandidates.length,summary:'这次制作未记录筛选详情',details:['现有方案已保留，无法追溯当时每项组合的淘汰原因。']};
    return clone(pending.availability);
  }

  function beginResearch(rawState, request = {}, transactionId = 'begin-research', options = {}) {
    const source=researchRequest(rawState,options,{request}),actorId=source.actorId;
    const guard = beginTransaction(rawState, transactionId, '开始配方研发',source);
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    requireResearchAction(state,actorId);ensureLocalService(state,'基础工坊',actorId);
    const store=personMaterials(state,actorId);
    const category = clean(request.category);
    const concept = clean(request.concept);
    if (!PRODUCT_CATEGORIES.includes(category)) throw new Error('研发类别只能是丹药、毒药、暗器、魂导器或拘束器');
    if (concept.length < 4) throw new Error('请说明希望成品实现的构想');
    if (request.confirmed !== true) throw new Error('消耗材料前必须明确确认不可退还');
    const context = selectedMaterialContext(state, request.materials,actorId);
    const {pendingId,choiceRule,mechanicCandidates,availability}=prepareResearchMechanics(state,category,context,concept,actorId,{presetId:request.presetId,hostDesign:request.hostDesign,confirmedDesign:request.confirmedDesign});
    if(request.confirmedDesign&&!request.expectedMechanicsHash)throw Error('请先预览当前固定设计与实际配料后确认，材料尚未消耗');
    if(request.expectedMechanicsHash && request.expectedMechanicsHash!==stableHash(JSON.stringify(mechanicCandidates)).toString(16))
      throw new Error('配料或试制方案已变化，请重新查看投入后确认；材料尚未消耗');
    nextCounter(state,'research');
    const consumedMaterials=context.stacks.map(({entry,stack})=>({fingerprint:entry.fingerprint,name:stack.displayName,quantity:entry.quantity,quantityBefore:stack.quantity,unitValue:stack.unitValue}));
    for (const {entry, stack} of context.stacks) {
      stack.quantity -= entry.quantity;
      if (stack.quantity <= 0) delete store[entry.fingerprint];
    }
    const mechanicsHash = stableHash(JSON.stringify(mechanicCandidates)).toString(16);
    state.研发.待处理[pendingId] = {
      id: pendingId, actorId, status: 'awaiting-llm', category, concept, materialSelections: clone(context.normalized), materialSnapshot: context.stacks.map(({entry, stack}) => ({...clone(stack), quantity: entry.quantity})),
      totalUnits: context.totalUnits, totalMaterialValue: context.totalValue, mechanicBudget: context.totalValue,
      availability:clone(availability),
      evidence: {attributes: context.attributes, channels: context.channels, registeredTraits:context.registeredTraits, categories: context.categories,appearanceMaterials:clone(mechanicCandidates[0].appearanceMaterials)},
      choiceCount:choiceRule.finalCount,choiceRule:clone(choiceRule),mechanicCandidates,mechanicsHash,candidates: [], successfulIndexes: [], chosenIndex: null, consumedTransactionId: transactionId, seed: `${state.世界.seed}:${pendingId}`
    };
    const pending = state.研发.待处理[pendingId];
    if(request.confirmedDesign){
      const c=mechanicCandidates[0],d=c.confirmedDesign,result=validateConfirmedResearchCandidate(pending,{...clone(c),name:d.name,description:d.description,form:d.appearance,narrativeSource:'confirmed-paid-design'},0);
      if(!result.pass)throw Error(result.errors.join('；'));pending.candidates=[result];pending.successfulIndexes=[0];pending.status='candidates-ready';pending.naming={phase:'completed',reason:'',mechanicsHash};
    }
    const presetCount=mechanicCandidates.filter(candidate=>candidate.presetId).length;
    return commit(state, transactionId, '开始配方研发', {type: 'research-materials-consumed', actorId, pendingId, category, concept, consumedMaterials:consumedMaterials.map(entry=>({...entry,quantityAfter:store[entry.fingerprint]?.quantity??0})), totalUnits: context.totalUnits, totalMaterialValue: context.totalValue, mechanicBudget: context.totalValue, llmCandidatesRequired: request.confirmedDesign?0:choiceRule.finalCount,choiceRule:clone(choiceRule),mechanicsHash,namingRequest:researchNarrativeRequest(pending), summary: `投入${context.totalUnits}个材料开始${category}研发；已确定${choiceRule.finalCount}个完整候选${presetCount?`，其中${presetCount}个为精品预设`:''}${presetCount===choiceRule.finalCount?'，可直接查看设计':'，新设计的名称和说明将在完成后展示'}，材料不可退还`});
  }

  function makeProductEffectSpecs(category, candidate) {
    return clone(candidate.frozenEffectSpecs ?? []);
  }

  function validationSafeCost(node,activation) {try{return effects.calculateNodeCost(node.effectId,node.params,{activation});}catch{return 0;}}

  function validateResearchCandidate(pending, candidate, index) {
    const errors = [];
    if (!plain(candidate)) return {index, pass: false, errors: ['候选不是结构化对象']};
    if(candidate.confirmedDesign)return validateConfirmedResearchCandidate(pending,candidate,index);
    if(candidate.hostDesign)return validateHostResearchCandidate(pending,candidate,index);
    if(pending.category==='拘束器')return validateRestraintCandidate(pending,candidate,index);
    errors.push(...validatePresetResearchCandidate(pending,candidate));
    errors.push(...abilities.validate({...candidate,id:candidate.candidateId??`research-${index}`}).errors);
    const name = clean(candidate.name);
    if (!name) errors.push('候选缺少名称');
    if (clean(candidate.category, pending.category) !== pending.category) errors.push('候选类别与研发类别不一致');
    const effectEntries = Array.isArray(candidate.effects) ? candidate.effects : [];
    if (!effectEntries.length&&!(pending.category==='魂导器'&&Object.keys(candidate.modifiers?.attributes??{}).length)) errors.push('候选没有实际机械效果');
    if(['丹药','毒药'].includes(pending.category)){
      const polarities=(candidate.effectGraph?.nodes??[]).map(n=>effects.effectPolarity(n.effectId,n.params));
      const purpose=pending.category==='毒药'?'harmful':'beneficial';
      if(candidate.productPurpose!==purpose||!polarities.includes(purpose))errors.push('药剂的实际效果与冻结制作用途不一致');
    }
    const activeDevice=pending.category==='魂导器'&&candidate.sourceKind==='soul-device';
    if(activeDevice){
      if(candidate.disposable!==false||candidate.durability<1||!abilities.activeDeviceGraph(candidate.effectGraph,{fixedForm:candidate.fixedForm})||!foundation.EQUIPMENT_AFFIXES.validateForm(candidate,effects.calculateNodeCost))errors.push('主动魂导器合同越出本版支持范围');
    }else if(pending.category==='魂导器'){
      if(!foundation.EQUIPMENT_AFFIXES.validateForm(candidate,effects.calculateNodeCost))errors.push('器型与装备实际能力不符');
      const allowed=world.equipmentAttributes(pending.evidence.attributes);
      if(Object.keys(candidate.modifiers?.attributes??{}).some(key=>!allowed.includes(key)))errors.push('材料属性不能支撑装备属性加成');
      if(candidate.disposable!==false||candidate.soulPowerCost||candidate.cooldownTurns||candidate.durabilityCost||candidate.passiveCombat&&Object.keys(candidate.passiveCombat).length)errors.push('装备不能携带主动消耗或未计价加成');
      if(['requirements','resourceCosts','maintenanceCosts','castModes'].some(key=>candidate[key]?.length)||candidate.defaultCastMode||candidate.usageKey||Object.keys(candidate.usageRules??{}).length)errors.push('被动装备不能携带施放合同');
    }else {
      if(candidate.disposable!==true||candidate.durabilityCost||candidate.durability!==1)errors.push('暗器和丹药必须每件只使用一次');
      if(!presets.get(candidate.presetId)?.recipe.registeredTemplate)try{narrative.validateConsumableForm(candidate,pending.category);}catch(error){errors.push(error.message);}
    }
    for (const entry of effectEntries) {
      const effectId = clean(entry?.id);
      if(effectId==='passive.equipment_stat'&&!foundation.EQUIPMENT_AFFIXES.permitted(entry.params?.属性,pending.evidence.attributes,pending.evidence.channels,foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY))errors.push('材料不能支撑此装备词条');
      if(effectId==='passive.element_amplify'&&!foundation.EQUIPMENT_AFFIXES.elementPermitted(entry.params?.类型,pending.evidence.attributes,pending.evidence.channels,foundation.MARTIAL_SOUL_CORE.CHANNEL_REGISTRY))errors.push('材料不能支撑此属性伤害增幅');
      if (!effects.EFFECT_REGISTRY[effectId]) errors.push(`未登记效果：${effectId || '空'}`);
      if (!CATEGORY_ALLOWED[pending.category].has(effectId)) errors.push(`${pending.category}不允许效果${effectId}`);
      if (effectId === 'status.resistance_shift' && (pending.category==='暗器'?entry.params?.模式!=='易伤':pending.category==='丹药'&&entry.params?.模式==='易伤')) errors.push('该成品类别不支持此防护模式');
      if (['payload.revive', 'domain.field', 'transform.martial_avatar'].includes(effectId)) errors.push(`首版禁用效果${effectId}`);
      const evidence = effectAttributeOptions(effectId,entry?.params);
      if (evidence.length && !evidence.some(attribute => pending.evidence.attributes.includes(attribute))) errors.push(`材料属性不能支撑${effectId}，需要${evidence.join('/')}`);
      const channelEvidence = effectChannelOptions(effectId,entry?.params);
      if (channelEvidence.length && !channelEvidence.some(channel=>pending.evidence.channels.includes(channel))) errors.push(`材料机制不能支撑${effectId}，需要${channelEvidence.join('/')}`);
    }
    if (pending.category === '魂导器' && clean(candidate.deviceCategory) && !world.SOUL_DEVICE_CATEGORIES.includes(candidate.deviceCategory)) errors.push('魂导器类别必须属于攻击、防御、辅助、移动或侦测');
    if (/储物/.test(`${pending.concept}${name}${candidate.form ?? ''}`)) errors.push('首版禁止储物魂导器');
    const effectSpecs = makeProductEffectSpecs(pending.category, candidate);
    const release = effectSpecs.find(([effectId])=>String(effectId).startsWith('release.'));
    if (release) {
      const releaseChannels = effectChannelOptions(release[0]);
      if (!(['丹药','毒药'].includes(pending.category)&&candidate.medicine?.route==='oral')&&releaseChannels.length && !releaseChannels.some(channel=>pending.evidence.channels.includes(channel))) errors.push(`材料缺少可实现${effects.EFFECT_REGISTRY[release[0]]?.displayName ?? '施展方式'}的机制桥梁`);
    }
    let spent = Number.POSITIVE_INFINITY;
    let graph = null;
    try {
      graph = clone(candidate.effectGraph);
      const validation = !graph&&pending.category==='魂导器'?{pass:true,spent:0,errors:[]}:effects.validateGraph(graph, {ageTier: '十万年', mechanismCap: '规则', budget: pending.mechanicBudget,costContract:candidate});
      if(pending.category!=='魂导器')errors.push(...effects.validateAbilityValue(candidate));
      if(pending.category==='魂导器'&&!activeDevice)world.priceEquipment(graph,candidate.modifiers);
      if (pending.category!=='魂导器' && effects.skillActivation(graph)!=='active') errors.push('消耗品和暗器不能提供常驻防护');
      const frozenNodes=(graph?.nodes ?? []).filter(node=>['payload','status','movement','zone','domain','summon','transform','reaction',...(pending.category==='魂导器'?['passive']:[])].includes(effects.EFFECT_REGISTRY[node.effectId]?.family));
      if (JSON.stringify(frozenNodes.map(node=>[node.effectId,node.params]))!==JSON.stringify(effectEntries.map(entry=>[entry.id,entry.params]))) errors.push('成品效果摘要与效果图不一致');
      spent = validation.spent;
      if (!validation.pass) errors.push(...validation.errors);
    } catch (error) { errors.push(clean(error?.message, '效果图编译失败')); }
    let permanentAttributes=0;
    if(pending.category==='魂导器')try{permanentAttributes=foundation.EQUIPMENT_AFFIXES.priceAttributes(candidate.modifiers?.attributes??{});}catch(error){errors.push(error.message);}
    if (pending.category !== '魂导器' && Object.keys(candidate.modifiers?.attributes ?? {}).length) errors.push('只有永久魂导器可以提供六维属性');
    if (Number.isFinite(spent) && spent + permanentAttributes > pending.mechanicBudget) errors.push(`机械价值超预算：${spent + permanentAttributes}/${pending.mechanicBudget}`);
    const totalSpent = spent + permanentAttributes;
    const effectCosts = effects.graphBranches(graph).flatMap(branch=>branch.nodes.map(node=>({name:effects.EFFECT_REGISTRY[node.effectId]?.displayName ?? '已登记效果',cost:validationSafeCost(node,branch.activation)})));
    return {index, pass: errors.length === 0, errors: unique(errors), normalized: {...clone(candidate), name, category: pending.category, effectSpecs, graph, spent:totalSpent,valueLedger:{budget:pending.mechanicBudget,effects:spent,permanentAttributes,total:totalSpent,remainder:Number.isFinite(totalSpent)?Math.max(0,pending.mechanicBudget-totalSpent):0,effectCosts}}};
  }

  function recordResearchNaming(rawState, request, transactionId = 'research-naming-status', options = {}) {
    const source=researchRequest(rawState,options,{request}),actorId=source.actorId;
    const guard=beginTransaction(rawState,transactionId,'记录作品取名进展',source);
    if(guard.duplicate)return {state:guard.state,receipt:guard.receipt,idempotent:true};
    const state=guard.state,pending=assertResearchOwner(state,state.研发.待处理[clean(request.pendingId)],actorId);
    if(!pending||!['awaiting-llm','candidates-ready'].includes(pending.status)||pending.mechanicsHash!==request.mechanicsHash)throw new Error('作品方案已经变化，无法记录这次取名进展');
    if(!['running','cancelled','failed'].includes(request.phase))throw new Error('无效的取名阶段');
    pending.naming={phase:request.phase,reason:clean(request.reason).slice(0,280),mechanicsHash:pending.mechanicsHash};
    return commit(state,transactionId,'记录作品取名进展',{type:'research-naming-status',actorId,pendingId:pending.id,phase:request.phase,summary:'作品方案已保留'});
  }

  function resolveResearch(rawState, pendingIdInput, candidates, transactionId = 'resolve-research', options = {}) {
    const source=researchRequest(rawState,options,{pendingId:pendingIdInput,candidates}),actorId=source.actorId;
    const guard = beginTransaction(rawState, transactionId, '解析研发候选',source);
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    const state = guard.state;
    const pending = assertResearchOwner(state,state.研发.待处理[clean(pendingIdInput)],actorId);
    if (!pending || !['awaiting-llm', 'candidates-ready'].includes(pending.status)) throw new Error('研发记录不存在或已经结束');
    assertResearchFrozen(pending);
    const labeledCandidates = validateResearchNarrative(pending,candidates);
    const results = labeledCandidates.map((candidate, index) => validateResearchCandidate(pending, candidate, index));
    if(pending.pendingNamingIds?.length)for(let index=0;index<results.length;index++){
      if(!pending.pendingNamingIds.includes(pending.mechanicCandidates[index].candidateId) && pending.candidates[index])results[index]=clone(pending.candidates[index]);
    }
    pending.candidates = results;
    pending.naming={phase:'completed',reason:'',mechanicsHash:pending.mechanicsHash};
    delete pending.pendingNamingIds;
    pending.successfulIndexes = results.filter(result => result.pass).map(result => result.index);
    pending.status = pending.successfulIndexes.length ? 'candidates-ready' : 'all-failed';
    if (!pending.successfulIndexes.length) state.研发.历史.push({pendingId: pending.id, result: 'all-failed', materialValue: pending.totalMaterialValue});
    return commit(state, transactionId, '解析研发候选', {type: 'research-candidates-resolved', actorId, pendingId: pending.id, mechanicsHash:pending.mechanicsHash, successCount: pending.successfulIndexes.length, successfulIndexes: clone(pending.successfulIndexes), results: results.map(result => ({index: result.index, pass: result.pass, errors: result.errors, name: result.normalized?.name ?? ''})), materialsRefunded: false, summary: pending.successfulIndexes.length ? `${pending.successfulIndexes.length}份设计已经完成，可以选择` : `${pending.mechanicCandidates.length}份设计均未达到材料和能力要求，投入的材料已消耗`});
  }

  function compileProductValue(category, normalized) {
    if(normalized.confirmedDesign)return globalThis.SoulPaidDesign.quote(category,normalized.confirmedDesign).valueGold;
    if(normalized.hostDesign)return globalThis.SoulHostPricing.quoteDesign(category,normalized.hostDesign).valueGold;
    if(normalized.presetId)return world.calculateItemValue(normalized.prototypeTemplateId);
    if(category==='拘束器')return custody.DEVICES[normalized.restraint.templateId].price;
    if(category==='魂导器'&&normalized.sourceKind==='soul-device')return effects.validateGraph(normalized.graph??normalized.effectGraph).spent*20;
    const spent=category==='魂导器'?world.priceEquipment(normalized.graph,normalized.modifiers).spent:effects.validateGraph(normalized.graph,{costContract:normalized}).spent;
    return Math.max(1,Math.round(spent*5));
  }

  function productTemplate(category, candidate) {
    if(candidate.confirmedDesign)return globalThis.SoulPaidDesign.quote(category,candidate.confirmedDesign).templateId;
    if(candidate.hostDesign)return candidate.hostDesign.carrierTemplateId;
    if(candidate.presetId)return candidate.prototypeTemplateId;
    if(category==='拘束器')return candidate.restraint.templateId;
    if (category==='毒药') return 'crafted-poison';
    if (category==='丹药') return 'crafted-pill';
    if (category === '暗器') return 'crafted-hidden-disposable';
    const templates = {
      攻击:'crafted-soul-device-attack',
      防御:'crafted-soul-device-defense',
      辅助:'crafted-soul-device-support',
      移动:'crafted-soul-device-movement',
      侦测:'crafted-soul-device-detection'
    };
    return templates[clean(candidate.deviceCategory, '辅助')] ?? templates.辅助;
  }

  function productLifetime(category, candidate) {
    if(category==='拘束器')return {productKind:'permanent',subtype:'拘束器'};
    if (category === '魂导器') return {productKind:'permanent',subtype:`${clean(candidate.deviceCategory,'辅助')}魂导器`};
    if (['丹药','毒药'].includes(category)) return {productKind:'consumable',subtype:category};
    return {productKind:'consumable',subtype:'一次性暗器'};
  }

  function productItemSpec(blueprint) {
    const candidate = blueprint.mechanics;
    const templateId = blueprint.templateId;
    if(candidate.confirmedDesign){
      const q=globalThis.SoulPaidDesign.quote(blueprint.category,candidate.confirmedDesign),payload=clone(q.payload);
      if(payload.activeSkill)payload.activeSkill.id=undefined;
      Object.assign(payload,{blueprintId:blueprint.id,blueprintVersion:blueprint.version,category:blueprint.category,productKind:blueprint.productKind,subtype:blueprint.subtype,immutableHash:blueprint.immutableHash,description:candidate.description,form:candidate.form});
      return {name:candidate.name,type:world.ITEM_TEMPLATES[q.templateId].type,forceUnique:!world.ITEM_TEMPLATES[q.templateId].stackable,valuePoints:q.valueGold,durability:100,payload,扩展:{maxDurability:100,crafted:true,描述:candidate.description,形态:candidate.form,命名来源:candidate.narrativeSource}};
    }
    if(candidate.hostDesign){
      const q=globalThis.SoulHostPricing.quoteDesign(blueprint.category,candidate.hostDesign),payload=clone(q.payload);
      if(payload.backgroundRestraint){const d={...payload.backgroundRestraint.definition,name:candidate.name,description:candidate.description,appearance:candidate.form};payload.backgroundRestraint=globalThis.SoulBackgroundRestraints.compile(d).contract;}
      if(payload.activeSkill){payload.activeSkill.id=undefined;payload.activeSkill.name=candidate.name;payload.activeSkill.description=candidate.description;}
      Object.assign(payload,{blueprintId:blueprint.id,blueprintVersion:blueprint.version,category:blueprint.category,productKind:'permanent',subtype:blueprint.subtype,immutableHash:blueprint.immutableHash,description:candidate.description,form:candidate.form});
      return {name:candidate.name,type:world.ITEM_TEMPLATES[templateId].type,forceUnique:true,valuePoints:blueprint.productValue,durability:100,payload,扩展:{maxDurability:100,crafted:true,描述:candidate.description,形态:candidate.form,命名来源:candidate.narrativeSource}};
    }
    if(blueprint.category==='拘束器')return {name:candidate.name,forceUnique:true,valuePoints:blueprint.productValue,
      payload:{blueprintId:blueprint.id,blueprintVersion:blueprint.version,category:blueprint.category,productKind:'permanent',subtype:'拘束器',restraint:clone(candidate.restraint),immutableHash:blueprint.immutableHash,description:candidate.description,form:candidate.form,...(candidate.presetId?{presetId:candidate.presetId,artId:candidate.artId}:{})},
      扩展:{crafted:true,描述:candidate.description,形态:candidate.form,命名来源:candidate.narrativeSource}};
    const stackable = world.ITEM_TEMPLATES[templateId]?.stackable===true;
    const permanent = blueprint.productKind === 'permanent';
    const payload = {
      blueprintId: blueprint.id, blueprintVersion: blueprint.version, category: blueprint.category,productKind:blueprint.productKind,subtype:blueprint.subtype,
      ...(permanent&&candidate.sourceKind!=='soul-device'?{passiveEffectGraph:clone(candidate.graph)}:{activeSkill:{...clone(candidate),id:undefined,name:candidate.name,effectGraph:clone(candidate.graph),soulPowerCost:candidate.soulPowerCost??0,cooldownTurns:candidate.cooldownTurns??0,durabilityCost:candidate.durabilityCost??0,ageTier:'十万年',mechanismCap:'规则'}}),
      modifiers: clone(candidate.modifiers ?? {}), passiveCombat: clone(candidate.passiveCombat ?? {}), immutableHash: blueprint.immutableHash,
      description:candidate.description,form:candidate.form,equipmentKind:candidate.equipmentKind,deviceCategory:clean(candidate.deviceCategory),fixedForm:clone(candidate.fixedForm),choiceRole:clone(candidate.choiceRole),appearanceMaterials:clone(candidate.appearanceMaterials)
    };
    if(candidate.presetId)Object.assign(payload,{presetId:candidate.presetId,artId:candidate.artId});
    return {
      name: candidate.name, type: candidate.presetId?world.ITEM_TEMPLATES[templateId].type:blueprint.category, forceUnique: !stackable, valuePoints: blueprint.productValue,
      durability: stackable ? 100 : integer(candidate.durability ?? 100, 1, 100), payload,
      扩展: {maxDurability: stackable ? 100 : integer(candidate.durability ?? 100, 1, 100), crafted: true,魂导器类别:clean(candidate.deviceCategory),描述:candidate.description,形态:candidate.form,命名来源:candidate.narrativeSource}
    };
  }

  function createProductItem(state,blueprint,quantity,provenance,actorId=blueprint.ownerId){
    const {playerId,inventory}=playerContext(state,actorId);
    return world.createItem(state,blueprint.templateId,playerId,inventory.id,{...productItemSpec(blueprint),quantity,provenance});
  }
  function validateBlueprintProductItem(item,blueprint){
    try{
      validateEquipmentBlueprint(blueprint);const spec=productItemSpec(blueprint),template=world.ITEM_TEMPLATES[blueprint.templateId],payload={...clone(template.payload??{}),...(template.modifiers?{modifiers:clone(template.modifiers)}:{}),...(template.passiveEffectGraph?{passiveEffectGraph:clone(template.passiveEffectGraph)}:{}),...clone(spec.payload)};
      if(template.presetId)payload.presetId=template.presetId;
      const actual=clone(item.payload);delete actual.skillId;delete actual.skillIds;delete actual.storedAtLocationId;
      if(item.templateId!==blueprint.templateId||item.type!==(spec.type??template.type)||item.valuePoints!==spec.valuePoints||item.扩展?.maxDurability!==spec.扩展.maxDurability&&blueprint.category!=='拘束器'||abilities.hash(actual)!==abilities.hash(payload))return false;
      return true;
    }catch{return false;}
  }
  function createProductItems(state, blueprint, quantity, provenance, actorId=blueprint.ownerId) {
    const stackable = world.ITEM_TEMPLATES[blueprint.templateId]?.stackable===true;
    if (stackable) return [createProductItem(state,blueprint,quantity,provenance,actorId)];
    return Array.from({length:quantity},(_,index)=>createProductItem(state,blueprint,1,{...clone(provenance),batchIndex:index + 1},actorId));
  }

  function productPlacement(state,blueprint,quantity,actorId=blueprint.ownerId) {
    const {inventory} = playerContext(state,actorId);
    const stackable = world.ITEM_TEMPLATES[blueprint.templateId]?.stackable===true;
    return world.previewItemPlacement(state,inventory.id,{templateId:blueprint.productKind==='device-key'?'device-key':blueprint.templateId,forceUnique:!stackable,payload:{blueprintId:blueprint.id},distinctItems:stackable ? 1 : quantity});
  }

  function selectedCraftMaterialStacks(state, selections,actorId=state.角色?.主控单位ID) {
    const useAll = selections === undefined;
    const entries = useAll
      ? Object.values(personMaterials(state,actorId)).map(stack=>({fingerprint:stack.fingerprint,quantity:stack.quantity}))
      : Array.isArray(selections) ? selections : [];
    const grouped = {};
    for (const entry of entries) {
      const fingerprint = clean(entry?.fingerprint);
      if (!fingerprint) continue;
      const quantity = integer(entry.quantity,0,999999);
      if (quantity < 1) continue;
      grouped[fingerprint] = (grouped[fingerprint] ?? 0) + quantity;
    }
    return Object.entries(grouped).map(([fingerprint,quantity])=>{
      const source = personMaterials(state,actorId)[fingerprint];
      if (!source || source.quantity < quantity) throw new Error(`打造材料数量不足：${source?.displayName ?? '所选材料'}`);
      return {...clone(source),quantity};
    }).sort((a,b)=>a.fingerprint.localeCompare(b.fingerprint));
  }

  function blueprintMaterialRecords(stacks, blueprint) {
    const clauses = clone(blueprint.bridgeClauses ?? []);
    return stacks.map(stack=>({
      fingerprint:stack.fingerprint,
      quantity:integer(stack.quantity,0,999999),
      unitValue:Math.max(1,Number(stack.unitValue)||1),
      mask:clauses.reduce((result,clause,index)=>materialSatisfiesBridge(stack,clause) ? result | (1 << index) : result,0)
    })).filter(record=>record.quantity>0).sort((a,b)=>a.fingerprint.localeCompare(b.fingerprint));
  }

  function allocateBlueprintBatch(stacks,blueprint,requestedQuantity,maximumOnly=false,limit=Infinity){
    const records=blueprintMaterialRecords(stacks,blueprint);
    const requiredValue=Math.max(1,integer(blueprint.requiredValue,1,99999999));
    return blueprintMaterials.allocate(records,requiredValue,blueprint.bridgeClauses?.length??0,requestedQuantity,maximumOnly,limit);
  }

  function validateEquipmentBlueprint(blueprint) {
    if(blueprint.immutableHash!==blueprintFingerprint(blueprint))throw new Error('图纸完整合同指纹不一致');
    if(blueprint.mechanics?.confirmedDesign){
      const q=globalThis.SoulPaidDesign.quote(blueprint.category,blueprint.mechanics.confirmedDesign),check=validateConfirmedResearchCandidate({category:blueprint.category,mechanicBudget:blueprint.researchProvenance?.totalMaterialValue,evidence:blueprint.researchProvenance?.evidence},blueprint.mechanics,0);
      if(!check.pass||blueprint.templateId!==q.templateId||blueprint.requiredValue!==q.materialValue||blueprint.productValue!==q.valueGold||abilities.hash(blueprint.bridgeClauses)!==abilities.hash(bridgeClausesForMechanics(blueprint.mechanics)))throw Error('固定设计图纸完整定义、价格或材料桥梁不一致');return;
    }
    if(blueprint.mechanics?.hostDesign){
      const checked=validateHostResearchCandidate({category:blueprint.category,mechanicBudget:blueprint.researchProvenance?.totalMaterialValue,evidence:blueprint.researchProvenance?.evidence},blueprint.mechanics,0);if(!checked.pass)throw Error(checked.errors.join('；'));
      const q=globalThis.SoulHostPricing.quoteDesign(blueprint.category,blueprint.mechanics.hostDesign);
      if(blueprint.templateId!==q.templateId||blueprint.requiredValue!==q.materialValue||blueprint.productValue!==q.valueGold||abilities.hash(blueprint.bridgeClauses)!==abilities.hash(bridgeClausesForMechanics(blueprint.mechanics)))throw Error('宿主图纸价格、完整范围或材料桥梁不一致');return;
    }
    if(blueprint.mechanics?.presetId){
      const checked=validatePresetResearchCandidate({category:blueprint.category,mechanicBudget:blueprint.researchProvenance?.totalMaterialValue,evidence:blueprint.researchProvenance?.evidence},blueprint.mechanics);
      if(checked.length)throw Error(checked.join('；'));
    }
    if(blueprint.mechanics?.presetId&&blueprint.templateId!==productTemplate(blueprint.category,blueprint.mechanics))throw Error('精品图纸与登记成品模板不一致');
    if(blueprint.category==='拘束器'){
      const checked=validateRestraintCandidate({category:blueprint.category,evidence:blueprint.researchProvenance?.evidence,mechanicBudget:blueprint.researchProvenance?.totalMaterialValue},blueprint.mechanics,0);
      if(!checked.pass)throw Error(checked.errors.join('；'));
      const template=blueprint.mechanics.restraint.templateId;
      if(blueprint.templateId!==template||blueprint.requiredValue!==custody.DEVICES[template].price/5||blueprint.productValue!==custody.DEVICES[template].price||abilities.hash(blueprint.bridgeClauses)!==abilities.hash(bridgeClausesForMechanics(blueprint.mechanics)))throw Error('拘束器图纸价值或材料桥梁不一致');
      return;
    }
    if(blueprint.category!=='魂导器'){
      if(!presets.get(blueprint.mechanics.presetId)?.recipe.registeredTemplate)narrative.validateConsumableForm(blueprint.mechanics,blueprint.category);
      const shape={...blueprint.mechanics,effectGraph:blueprint.mechanics.graph},check=effects.validateGraph(shape.effectGraph,{costContract:shape});
      if(!check.pass||effects.validateAbilityValue(shape).length||check.spent!==blueprint.requiredValue||compileProductValue(blueprint.category,shape)!==blueprint.productValue||abilities.hash(blueprint.bridgeClauses)!==abilities.hash(bridgeClausesForMechanics(shape)))throw Error('消耗品图纸的完整能力、价值或材料桥梁不一致');
      const checked=validateResearchCandidate({category:blueprint.category,concept:'',evidence:blueprint.researchProvenance.evidence,mechanicBudget:blueprint.researchProvenance.totalMaterialValue},blueprint.mechanics,0);
      if(!checked.pass)throw Error(checked.errors.join('；'));
      return;
    }
    const shape={...blueprint.mechanics,effectGraph:blueprint.mechanics?.graph};
    if(!foundation.EQUIPMENT_AFFIXES.validateForm(shape,effects.calculateNodeCost))throw new Error('图纸的装备器型与实际能力不符');
    if(shape.sourceKind==='soul-device'){
      const check=effects.validateGraph(shape.effectGraph,{costContract:shape});
      if(!check.pass||check.spent!==blueprint.requiredValue||compileProductValue('魂导器',shape)!==blueprint.productValue||!abilities.activeDeviceGraph(shape.effectGraph,{fixedForm:shape.fixedForm}))throw Error('主动魂导器图纸的能力和价值合同不一致');
      return;
    }
    const spent=world.priceEquipment(shape.effectGraph,shape.modifiers).spent;
    if(spent!==blueprint.requiredValue||spent*5!==blueprint.productValue)throw new Error('图纸的价值与装备实际能力不符');
  }
  function resolveBlueprintMaterials(state, blueprint, selections, requestedQuantity, maximumOnly=false, options={}) {
    if(blueprint.productKind==='device-key')globalThis.SoulDeviceKeyManufacturing.validateBlueprint(state,blueprint,options.actorId??blueprint.ownerId);
    else{if (blueprint.version !== 3 || !Number.isInteger(blueprint.requiredValue) || !Array.isArray(blueprint.bridgeClauses)) throw new Error('图纸不是当前价值桥梁格式，请重新研发');validateEquipmentBlueprint(blueprint);}
    if((blueprint.mechanics?.presetId||blueprint.mechanics?.hostDesign||blueprint.mechanics?.confirmedDesign)&&!validAuthoredBlueprint(state,blueprint)){
      const pending=state.研发.待处理[blueprint.createdFromResearchId],chosen=pending?.candidates?.[pending.chosenIndex]?.normalized;
      if(!pending||pending.status!=='completed'||pending.blueprintId!==blueprint.id||!chosen||abilities.hash(productMechanics(chosen))!==abilities.hash(productMechanics(blueprint.mechanics))||abilities.hash({actorId:pending.actorId,researchId:pending.id,totalMaterialValue:pending.totalMaterialValue,totalUnits:pending.totalUnits,materials:pending.materialSelections,evidence:pending.evidence})!==abilities.hash(blueprint.researchProvenance))throw Error('精品图纸缺少真实研发来源');
      const receipts=Object.entries(state.远征.processedTransactions).filter(([,receipt])=>receipt.type==='research-blueprint-created'&&receipt.blueprintId===blueprint.id),entry=receipts[0],receipt=entry?.[1];
      if(receipts.length!==1||receipt.id!==entry[0]||receipt.transactionType!=='确认研发图纸'||receipt.pendingId!==pending.id||receipt.chosenIndex!==pending.chosenIndex||receipt.productValue!==blueprint.productValue||receipt.requiredValue!==blueprint.requiredValue||!clean(receipt.prototypeItemId)||abilities.hash(receipt.bridgeClauses)!==abilities.hash(blueprint.bridgeClauses))throw Error('精品图纸缺少原始选择收据');
    }
    const stacks = selectedCraftMaterialStacks(state,selections,options.actorId).map(stack=>clone(stack));
    if (!stacks.length) return {pass:false,allocations:[],batches:[],message:'请先选择用于打造的材料'};
    const coverage = bridgeCoverage(stacks,blueprint.bridgeClauses);
    if (!coverage.pass) return {pass:false,allocations:[],batches:[],coverage,message:`缺少材料特性：${coverage.missing.map(item=>item.anyOf.join('或')).join('；')}`};
    const allocation=allocateBlueprintBatch(stacks,blueprint,requestedQuantity,maximumOnly,options.limit);
    if(allocation.quantity<1)return {pass:false,allocations:[],batches:[],coverage,message:'所选材料不足，请减少数量或补充适合的材料'};
    if(maximumOnly)return {pass:true,coverage,quantity:allocation.quantity};
    const selectedValue=stacks.reduce((sum,stack)=>sum+stack.unitValue*stack.quantity,0);
    return {
      pass:true,coverage,quantity:allocation.quantity,batches:allocation.batches,allocations:allocation.allocations,
      selectedValue,consumedValue:allocation.consumedValue,requiredValue:blueprint.requiredValue*allocation.quantity,
      surplusValue:allocation.consumedValue-blueprint.requiredValue*allocation.quantity,
      remainingValue:selectedValue-allocation.consumedValue
    };
  }

  function previewBlueprintCraft(rawState, blueprintIdInput, request = {}, actorOptions = {}) {
    return previewBlueprintCraftPrepared(normalizeState(rawState),blueprintIdInput,request,actorOptions);
  }

  function ownedCraftBlueprint(state,id,actorId){
    return assertBlueprintOwner(state,state.研发.蓝图[clean(id)]??catalogueBlueprintById(state,clean(id),actorId)??globalThis.SoulDeviceLocks.keyBlueprint(state,actorId,clean(id)),actorId);
  }

  function maximumBlueprintCraftQuantity(rawState,blueprintId,limit){
    return maximumBlueprintCraftQuantityPrepared(normalizeState(rawState),blueprintId,limit);
  }
  function craftQuantityLimit(state,blueprint,actorId,limit){
    if(!Number.isSafeInteger(limit)||limit<1||limit>999999)throw Error('最大数量范围无效');
    requireResearchAction(state,actorId);
    const placement=productPlacement(state,blueprint,limit,actorId);
    return placement.pass?limit:Math.min(limit,placement.freeSlots);
  }
  function maximumBlueprintCraftQuantityPrepared(state,blueprintId,limit){
    const actorId=state.角色.主控单位ID;
    const blueprint=ownedCraftBlueprint(state,blueprintId,actorId);
    const capacity=craftQuantityLimit(state,blueprint,actorId,limit);
    if(!capacity)return 0;
    return resolveBlueprintMaterials(state,blueprint,undefined,undefined,true,{actorId,limit:capacity}).quantity??0;
  }

  function previewBlueprintCraftPrepared(state,blueprintIdInput,request,actorOptions,maximumLimit){
    const actorId=researchRequest(state,actorOptions,{request}).actorId;
    const blueprint=ownedCraftBlueprint(state,blueprintIdInput,actorId);
    const options = plain(request) ? request : {maximum:request};
    const selections = Object.hasOwn(options,'materials') ? options.materials : undefined;
    const selectedStacks = selectedCraftMaterialStacks(state,selections,actorId);
    const selectedValue = selectedStacks.reduce((sum,stack)=>sum+stack.unitValue*stack.quantity,0);
    const quantityInput = options.quantity;
    if (quantityInput !== undefined && (!Number.isInteger(quantityInput) || quantityInput < 1 || quantityInput > 999999)) throw new Error('制造数量须为1至999999的整数');
    const calculateMaximum=quantityInput===undefined||options.includeMaximum!==false;
    const limit=maximumLimit===undefined?undefined:craftQuantityLimit(state,blueprint,actorId,maximumLimit);
    const maximum = calculateMaximum?resolveBlueprintMaterials(state,blueprint,selections,undefined,quantityInput!==undefined,{actorId,limit}):null;
    const resolution = quantityInput === undefined ? maximum : resolveBlueprintMaterials(state,blueprint,selections,quantityInput,false,{actorId});
    const quantity = quantityInput ?? maximum.quantity ?? 0;
    const maximumCraftable = calculateMaximum&&maximumLimit===undefined?(maximum.quantity??0):null;
    const placement = productPlacement(state,blueprint,quantity || 1,actorId);
    let serviceReason = '';
    try { if(!actorOptions.abilityUse)requireResearchAction(state,actorId); } catch (error) { serviceReason = error.message; }
    const reason = serviceReason || (!resolution.pass ? `当前材料无法制造${quantity || 1}件：${resolution.message}` : '') || placement.message;
    const allocatedByFingerprint=Object.fromEntries((resolution.allocations??[]).map(entry=>[entry.fingerprint,entry.quantity]));
    const remainingMaterials=selectedStacks.map(stack=>({
      fingerprint:stack.fingerprint,
      displayName:stack.displayName,
      quantity:stack.quantity-(allocatedByFingerprint[stack.fingerprint]??0),
      unitValue:stack.unitValue
    })).filter(entry=>entry.quantity>0);
    return {
      blueprintId:blueprint.id,quantity,pass:!reason,maximumCraftable,placement,
      requiredValueEach:blueprint.requiredValue,requiredValueTotal:blueprint.requiredValue*quantity,
      selectedValue,
      allocations:clone(resolution.allocations ?? []),batches:clone(resolution.batches ?? []),
      remainingMaterials,
      bridgeClauses:clone(blueprint.bridgeClauses),coverage:clone(resolution.coverage ?? bridgeCoverage(selectedStacks,blueprint.bridgeClauses)),
      consumedValue:resolution.consumedValue??0,surplusValue:resolution.surplusValue??0,remainingValue:resolution.remainingValue??selectedValue,
      message:reason || (maximumCraftable!==null?`可制造${quantity}件；当前材料最多可制${maximumCraftable}件`:`可制造${quantity}件`)
    };
  }

  function chooseResearchCandidate(rawState, pendingIdInput, candidateIndexInput, transactionId = 'choose-research-candidate', options = {}) {
    const source=researchRequest(rawState,options,{pendingId:pendingIdInput,candidateIndex:candidateIndexInput}),actorId=source.actorId;
    const guard = beginTransaction(rawState, transactionId, '确认研发图纸',source);
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    let state = guard.state;
    requireResearchAction(state,actorId);ensureLocalService(state,'基础工坊',actorId);
    const pending = assertResearchOwner(state,state.研发.待处理[clean(pendingIdInput)],actorId);
    const candidateIndex = candidateIndexInput;
    if(!Number.isInteger(candidateIndex)||candidateIndex<0)throw Error('候选序号必须是非负整数');
    if (!pending || pending.status !== 'candidates-ready' || !pending.successfulIndexes.includes(candidateIndex)) throw new Error('只能从通过终审的候选中选择一个');
    assertResearchFrozen(pending);
    const chosen = pending.candidates[candidateIndex].normalized;
    const blueprintNumber = nextCounter(state, 'blueprint');
    const blueprintId = `blueprint-${String(blueprintNumber).padStart(5, '0')}`;
    const templateId = productTemplate(pending.category, chosen);
    const productValue = compileProductValue(pending.category, chosen);
    const lifetime = productLifetime(pending.category,chosen);
    const bridgeClauses = bridgeClausesForMechanics(chosen);
    const requiredValue = Math.max(1,Math.ceil(chosen.confirmedDesign?globalThis.SoulPaidDesign.quote(pending.category,chosen.confirmedDesign).materialValue:chosen.hostDesign?globalThis.SoulHostPricing.quoteDesign(pending.category,chosen.hostDesign).materialValue:pending.category==='拘束器'?custody.DEVICES[chosen.restraint.templateId].price/5:pending.category==='魂导器'&&chosen.sourceKind!=='soul-device'?world.priceEquipment(chosen.graph,chosen.modifiers).spent:effects.validateGraph(chosen.graph,{costContract:chosen}).spent));
    const blueprint = {
      id: blueprintId, ownerId:actorId, version: 3, name: chosen.name, category: pending.category, concept: pending.concept,...lifetime,
      requiredValue,bridgeClauses,
      mechanics: clone(chosen), description:chosen.description, form:chosen.form, templateId, productValue,
      researchProvenance:{actorId,researchId:pending.id,totalMaterialValue:pending.totalMaterialValue,totalUnits:pending.totalUnits,materials:clone(pending.materialSelections),evidence:clone(pending.evidence)},
      createdFromResearchId: pending.id, tradable: false, inventoryItem: false
    };
    blueprint.immutableHash=blueprintFingerprint(blueprint);
    const placement = productPlacement(state,blueprint,1);
    if (!placement.pass) throw new Error(placement.message);
    state.研发.蓝图[blueprintId] = blueprint;
    pending.status = 'completed';
    pending.chosenIndex = candidateIndex;
    pending.blueprintId = blueprintId;
    const prototype = createProductItem(state, blueprint, 1, {type: 'research-prototype', actorId,recipientId:actorId,researchId: pending.id, blueprintId});
    state = normalizeState(state);
    state.研发.历史.push({pendingId: pending.id, result: 'success', blueprintId, prototypeItemId: prototype.id, productValue});
    return commit(state, transactionId, '确认研发图纸', {type: 'research-blueprint-created', actorId,recipientId:actorId, pendingId: pending.id, chosenIndex: candidateIndex, blueprintId, prototypeItemId: prototype.id, productValue,requiredValue,bridgeClauses:clone(bridgeClauses), discardedCandidateIndexes: pending.candidates.map(candidate=>candidate.index).filter(index => index !== candidateIndex), summary: `确定图纸${blueprint.name}，获得一个原型；复刻需${requiredValue}点材料价值并满足${bridgeClauses.length}项桥梁`});
  }

  function settleBlueprintProduct(state,blueprint,materials,actorId,provenance){
    if(blueprint.productKind==='device-key')return globalThis.SoulDeviceKeyManufacturing.settleBlueprintProduct(state,blueprint,materials,actorId,provenance);
    const quantity=materials.quantity;
    for (const allocation of materials.allocations) {
      const stack = personMaterials(state,actorId)[allocation.fingerprint];
      stack.quantity -= allocation.quantity;
      if (stack.quantity <= 0) delete personMaterials(state,actorId)[allocation.fingerprint];
    }
    const priorQuantities=Object.fromEntries(Object.values(state.物品.实例).filter(item=>item.payload?.blueprintId===blueprint.id).map(item=>[item.id,item.quantity]));
    const items = createProductItems(state, blueprint, quantity, provenance);
    return {items,itemChanges:items.map(item=>({itemId:item.id,name:item.name,quantityBefore:priorQuantities[item.id]??0,quantityAfter:state.物品.实例[item.id].quantity,containerId:state.物品.实例[item.id].containerId}))};
  }

  function craftBlueprint(rawState, blueprintIdInput, requestInput, transactionId = 'craft-blueprint', options = {}) {
    const source=researchRequest(rawState,options,{blueprintId:blueprintIdInput,request:requestInput??{}}),actorId=source.actorId;
    const guard = beginTransaction(rawState, transactionId, '按图纸打造',source);
    if (guard.duplicate) return {state: guard.state, receipt: guard.receipt, idempotent: true};
    let state = guard.state;
    requireResearchAction(state,actorId);ensureLocalService(state,'基础工坊',actorId);
    const store=personMaterials(state,actorId);
    const blueprint = ownedCraftBlueprint(state,blueprintIdInput,actorId);
    if(blueprint.knowledgeOrigin?.kind==='preset-catalogue')state.研发.蓝图[blueprint.id]??=clone(blueprint);
    if (!blueprint) throw new Error('自研图纸不存在');
    const request = plain(requestInput) ? requestInput : {};
    const materials = previewBlueprintCraftPrepared(state,blueprint.id,request,{actorId});
    if (!materials.pass) throw new Error(materials.message);
    const quantity=materials.quantity;
    const {items,itemChanges}=settleBlueprintProduct(state,blueprint,materials,actorId,{type:'blueprint-craft',actorId,recipientId:actorId,blueprintId:blueprint.id,blueprintVersion:blueprint.version,transactionId});
    state = normalizeState(state);
    return commit(state, transactionId, '按图纸打造', {type: 'blueprint-crafted', actorId,recipientId:actorId, blueprintId: blueprint.id, itemId: items[0].id,itemIds:items.map(item=>item.id),itemChanges, quantity, productValueEach: blueprint.productValue,requiredValueEach:blueprint.requiredValue,bridgeClauses:clone(blueprint.bridgeClauses),materialAllocations:clone(materials.allocations),materialBatches:clone(materials.batches),consumedValue:materials.consumedValue,surplusValue:materials.surplusValue,remainingValue:materials.remainingValue, summary: `已按${blueprint.name}图纸制造${quantity}件成品`});
  }

  function validateResearchOwnership(state){
    const studyErrors=Object.values(state.物品?.实例??{}).filter(item=>item.type==='图纸'&&world.ITEM_TEMPLATES[item.templateId]?.payload?.blueprintBook).flatMap(item=>abilities.hash(item.payload?.blueprintBook)!==abilities.hash(world.ITEM_TEMPLATES[item.templateId].payload.blueprintBook)?['设计图纸与登记配方身份不一致']:[]).concat(Object.entries(state.研发?.图纸学习??{}).flatMap(([key,row])=>key!==studyKey(row.actorId,row.presetId)||!validPresetStudy(state,row.actorId,row.presetId)?['预设图纸知识缺少真实图纸及学习来源']:[]));
    const errors=[...studyErrors],transactions=state.远征?.processedTransactions??{},requests=state.远征?.commandRequests??{},projects=state.研发?.待处理??{},blueprints=state.研发?.蓝图??{};
    const anchors=new Map();
    for(const person of Object.values(state.人物?.列表??{})){
      const rows=person.扩展?.研发事务;if(rows===undefined)continue;
      if(!Array.isArray(rows)){errors.push('人物研发来源列表无效');continue;}
      for(const row of rows){
        const receipt=transactions[row?.id],source=requests[row?.id];
        if(!row||Object.keys(row).some(k=>!['id','requestHash'].includes(k))||!isResearchReceipt(receipt)||receipt.actorId!==person.id||source?.request?.actorId!==person.id||row.requestHash!==source.requestHash||row.requestHash!==abilities.hash(source.request)||anchors.has(row.id))errors.push('人物研发来源与原永久请求不符');
        else anchors.set(row.id,person.id);
      }
    }
    for(const [id,pending] of Object.entries(projects))try{
      assertResearchOwner(state,pending,pending.actorId);
      const receipt=transactions[pending.consumedTransactionId],source=requests[pending.consumedTransactionId];
      if(pending.id!==id||receipt?.type!=='research-materials-consumed'||receipt.pendingId!==id||receipt.actorId!==pending.actorId||source?.request?.actorId!==pending.actorId||source.request.request?.category!==pending.category||clean(source.request.request.concept)!==pending.concept)throw Error('研发项目缺少本人原始投入');
      const store=Object.fromEntries((pending.materialSnapshot??[]).map(stack=>[stack.fingerprint,stack]));
      const original=materialContextFromStore(store,source.request.request.materials),frozen=materialContextFromStore(store,pending.materialSelections);
      if(abilities.hash(original.normalized)!==abilities.hash(frozen.normalized)||original.totalValue!==pending.totalMaterialValue||original.totalValue!==pending.mechanicBudget||original.totalUnits!==pending.totalUnits)throw Error('研发材料与本人原始请求不符');
    }catch(error){errors.push(error.message);}
    for(const blueprint of Object.values(blueprints))try{
      assertBlueprintOwner(state,blueprint,blueprint.ownerId);
      if(blueprint.knowledgeOrigin){if(!validAuthoredBlueprint(state,blueprint))throw Error('原人物初始图纸知识来源无效');continue;}
      const pending=projects[blueprint.createdFromResearchId];
      if(!pending||pending.status!=='completed'||pending.blueprintId!==blueprint.id||pending.actorId!==blueprint.ownerId||blueprint.researchProvenance?.actorId!==blueprint.ownerId)throw Error('图纸归属与实际研发者不符');
    }catch(error){errors.push(error.message);}
    for(const [id,receipt] of Object.entries(transactions))if(isResearchReceipt(receipt))try{
      if(anchors.get(id)!==receipt.actorId)throw Error('研发收据缺少本人永久来源锚点');
      const source=requests[id]?.request,pending=projects[receipt.pendingId],blueprint=blueprints[receipt.blueprintId]??globalThis.SoulDeviceLocks.keyBlueprint(state,receipt.actorId,receipt.blueprintId);
      if(!source||!receipt.actorId||receipt.actorId!==source.actorId||!state.人物?.列表?.[receipt.actorId])throw Error('研发收据缺少原请求主体');
      if(receipt.type!=='blueprint-crafted'){
        const requestPendingId=['research-candidate-rerolled','research-naming-status'].includes(receipt.type)?source.request?.pendingId:source.pendingId;
        if(!pending||pending.id!==receipt.pendingId||pending.actorId!==receipt.actorId||(receipt.type==='research-materials-consumed'?pending.consumedTransactionId!==id:requestPendingId!==pending.id))throw Error('研发收据与本人原项目不符');
      }
      if(['research-blueprint-created','blueprint-crafted'].includes(receipt.type)&&(!blueprint||blueprint.ownerId!==receipt.actorId||receipt.recipientId!==receipt.actorId))throw Error('制造收据与图纸及收件人不符');
      if(receipt.type==='blueprint-crafted'&&(!Array.isArray(receipt.itemChanges)||!Array.isArray(receipt.itemIds)||!receipt.itemIds.length||new Set(receipt.itemIds).size!==receipt.itemIds.length||receipt.itemChanges.length!==receipt.itemIds.length||new Set(receipt.itemChanges.map(row=>row.itemId)).size!==receipt.itemChanges.length||receipt.itemChanges.some(row=>!receipt.itemIds.includes(row.itemId)||row.containerId!==state.人物.列表[receipt.recipientId].inventoryContainerId)))throw Error('制造交付必须进入原实际收件人的背包');
      if(receipt.type==='research-blueprint-created'&&(source.candidateIndex!==receipt.chosenIndex||pending.chosenIndex!==receipt.chosenIndex||pending.blueprintId!==receipt.blueprintId))throw Error('选择结果与本人原决定不符');
      if(receipt.type==='blueprint-crafted'&&source.blueprintId!==receipt.blueprintId)throw Error('制造结果与原图纸请求不符');
    }catch(error){errors.push(error.message);}
    for(const actorId of Object.keys(state.材料库?.人物??{}))if(actorId===state.角色?.主控单位ID||!state.人物?.列表?.[actorId]&&!state.战斗单位?.列表?.[actorId]?.扩展?.possessions)errors.push('实体材料库缺少实际主人');
    for(const item of Object.values(state.物品?.实例??{}))if(['research-prototype','blueprint-craft'].includes(item.provenance?.type)){
      const blueprint=blueprints[item.provenance.blueprintId];
      if(!blueprint||item.provenance.actorId!==blueprint.ownerId||item.provenance.recipientId!==blueprint.ownerId)errors.push('研发成品缺少原始主体和收件人');
    }
    return errors;
  }

  // Rebuild only a rerolled project. Original payment stays immutable; the
  // permanent reroll request identifies the sole replacement and no second fee.
  const rerollProofCache=new Map();
  function validateResearchReroll(state,pending,consumption,context){
    const rows=Object.entries(state.远征.processedTransactions).filter(([,r])=>r.type==='research-candidate-rerolled'&&r.pendingId===pending.id);
    if(!pending.reroll?.used){if(rows.length||consumption.mechanicsHash!==pending.mechanicsHash)throw Error('研发候选与原始付款来源不符');return;}
    const [id,receipt]=rows[0]??[],source=state.远征.commandRequests?.[id];
    const index=pending.reroll.index,originalRequest=state.远征.commandRequests?.[pending.consumedTransactionId]?.request?.request;
    if(rows.length!==1||pending.category!=='魂导器'||!Number.isSafeInteger(index)||!pending.mechanicCandidates[index]||receipt.id!==id||receipt.actorId!==pending.actorId||receipt.candidateIndex!==index||receipt.mechanicsHash!==pending.mechanicsHash||source?.type!=='重抽魂导器方案'||source.request?.actorId!==pending.actorId||source.request?.request?.pendingId!==pending.id||source.request.request.candidateIndex!==index||pending.seed!==state.世界.seed+':'+pending.id)throw Error('研发重抽与原永久请求不符');
    const count=consumption.choiceRule?.requestedCount??consumption.choiceRule?.finalCount;
    if(!Number.isSafeInteger(count)||count<1)throw Error('研发原始候选数量来源无效');
    const key=abilities.hash({context:pending.evidence,materials:pending.materialSnapshot,budget:pending.mechanicBudget,id:pending.id,seed:pending.seed,concept:pending.concept,count,presetId:originalRequest?.presetId,index});
    let proof=rerollProofCache.get(key);
    if(!proof){
      const original=freezeResearchMechanics(pending.category,context,pending.id,count,{concept:pending.concept,seed:pending.seed,presetId:originalRequest?.presetId});
      const originalHash=stableHash(JSON.stringify(original)).toString(16);
      const replacement=freezeResearchMechanics('魂导器',{totalValue:pending.mechanicBudget,...clone(pending.evidence)},pending.id+':reroll:'+index,1,{concept:pending.concept,seed:pending.seed+':reroll:'+index,excludedFingerprints:original.map(researchCandidateFingerprint),excludedCandidates:original.filter((_,i)=>i!==index),replacedCandidate:original[index]})[0];
      original[index]=replacement;proof={originalHash,currentHash:stableHash(JSON.stringify(original)).toString(16)};
      rerollProofCache.set(key,proof);if(rerollProofCache.size>32)rerollProofCache.delete(rerollProofCache.keys().next().value);
    }
    if(proof.originalHash!==consumption.mechanicsHash||proof.currentHash!==pending.mechanicsHash)throw Error('研发重抽未保留原付款及候选来源');
  }

  function validateStateInternal(rawState, priorRawWorld) {
    const state = normalizeState(rawState);
    const errors = [...loot.validate(state),...(priorRawWorld??world.validateState(rawState)).errors,...validateResearchOwnership(rawState)];
    // Expedition receipts are permanent; the short research history is not a source ledger.
    const transactions=state.远征.processedTransactions,prototypeReceipts=new Map();
    for(const [id,receipt] of Object.entries(transactions))if(receipt.type==='research-blueprint-created'){
      const receipts=prototypeReceipts.get(receipt.blueprintId)??[];
      receipts.push({...receipt,ledgerId:id});prototypeReceipts.set(receipt.blueprintId,receipts);
    }
    for(const pending of Object.values(rawState.研发?.待处理??{}))try{
      assertResearchFrozen(pending);
      if(['拘束器','丹药','毒药'].includes(pending.category)||(pending.mechanicCandidates??[]).some(candidate=>candidate.presetId||candidate.hostDesign||candidate.confirmedDesign)){
        if(pending.materialSnapshot.some(stack=>materialFingerprint(stack,stack.quality)!==stack.fingerprint||!Number.isSafeInteger(stack.unitValue)||stack.unitValue<1))throw Error('拘束器研发材料结构指纹无效');
        const context=materialContextFromStore(Object.fromEntries(pending.materialSnapshot.map(stack=>[stack.fingerprint,stack])),pending.materialSelections);
        if(context.totalValue!==pending.mechanicBudget||context.totalValue!==pending.totalMaterialValue||context.totalUnits!==pending.totalUnits||['attributes','channels','registeredTraits','categories'].some(key=>abilities.hash(context[key])!==abilities.hash(pending.evidence[key])))throw Error('拘束器研发材料证据不一致');
        for(const candidate of pending.mechanicCandidates){const checked=pending.category==='拘束器'&&!candidate.hostDesign&&!candidate.confirmedDesign?validateRestraintCandidate(pending,{...candidate,name:candidate.confirmedDesign?.name??'待命名',...(candidate.confirmedDesign?{description:candidate.confirmedDesign.description,form:candidate.confirmedDesign.appearance}:{})},0):validateResearchCandidate(pending,{...candidate,name:candidate.confirmedDesign?.name??'待命名',...(candidate.confirmedDesign?{description:candidate.confirmedDesign.description,form:candidate.confirmedDesign.appearance}:{})},0);if(!checked.pass)throw Error(checked.errors.join('；'));}
        const consumption=transactions[pending.consumedTransactionId],materials=consumption?.consumedMaterials;
        if(!consumption||consumption.id!==pending.consumedTransactionId||consumption.transactionType!=='开始配方研发'||consumption.type!=='research-materials-consumed'||consumption.pendingId!==pending.id||consumption.category!==pending.category||consumption.concept!==pending.concept||consumption.totalUnits!==pending.totalUnits||consumption.totalMaterialValue!==pending.totalMaterialValue||consumption.mechanicBudget!==pending.mechanicBudget||!Array.isArray(materials)||materials.length!==context.stacks.length||new Set(materials.map(row=>row.fingerprint)).size!==materials.length)throw Error('拘束器研发缺少原始材料消耗收据');
        validateResearchReroll(state,pending,consumption,context);
        if(pending.mechanicCandidates.some(c=>c.confirmedDesign)){
          const original=state.远征.commandRequests?.[pending.consumedTransactionId]?.request?.request;
          if(!original?.confirmedDesign||original.hostDesign||original.presetId||!original.expectedMechanicsHash||original.expectedMechanicsHash!==pending.mechanicsHash||pending.mechanicCandidates.length!==1||abilities.hash(globalThis.SoulPaidDesign.normalize(pending.category,original.confirmedDesign))!==abilities.hash(pending.mechanicCandidates[0].confirmedDesign))throw Error('固定设计缺少原始确认及实际预览来源');
        }
        if(pending.mechanicCandidates.some(c=>c.hostDesign)){
          const original=state.远征.commandRequests?.[pending.consumedTransactionId]?.request?.request;
          if(!original?.hostDesign||original.presetId||pending.mechanicCandidates.length!==1||abilities.hash(globalThis.SoulHostPricing.quoteDesign(pending.category,original.hostDesign).design)!==abilities.hash(pending.mechanicCandidates[0].hostDesign))throw Error('宿主研发固定定义缺少原始确认请求');
        }
        for(const {entry,stack} of context.stacks){
          const paid=materials.find(row=>row.fingerprint===entry.fingerprint);
          if(!paid||paid.quantity!==entry.quantity||paid.unitValue!==stack.unitValue||!Number.isSafeInteger(paid.quantityBefore)||!Number.isSafeInteger(paid.quantityAfter)||paid.quantityAfter<0||paid.quantityBefore-paid.quantityAfter!==entry.quantity)throw Error('拘束器研发材料与消耗收据不一致');
        }
      }
    }catch(error){errors.push(error.message);}
    const materialStores=[state.材料库.永久,...Object.values(state.材料库.人物??{}),...(state.远征.扩展?.lootAllocations??[]).map(a=>a.pendingMaterials)];
    for(const store of materialStores)for (const [fingerprint, stack] of Object.entries(store)) {
      if (stack.fingerprint !== fingerprint || !Number.isInteger(stack.quantity) || stack.quantity <= 0) errors.push(`永久材料堆${fingerprint}非法`);
      if (Object.keys(stack.attributeSpectrum ?? {}).length !== attributeNames.length || attributeNames.some(name => !Object.hasOwn(stack.attributeSpectrum ?? {}, name))) errors.push(`材料堆${fingerprint}没有完整当前属性谱`);
      if (materialFingerprint(stack, stack.quality) !== fingerprint) errors.push(`材料堆${fingerprint}结构指纹不一致`);
    }
    for (const active of expeditions.instances(state)) {
      const mapValidation = validateMap(active.map);
      errors.push(...mapValidation.errors);
      for(const node of Object.values(active.map.nodes))for(const [index,beast] of (node.encounter?.roster??[]).entries())try{validateEcologyPresetBlueprint(beast,{active,node,index});}catch(error){errors.push(error.message);}
      for(const beast of active.currentRoom?.roster??[])try{
        validateEcologyPresetBlueprint(beast);
        const frozen=active.map.nodes[active.currentRoom.nodeId]?.encounter?.roster.find(item=>item.unitId===beast.unitId);
        if((frozen?.presetId??null)!==(beast.presetId??null)||beast.presetId&&['presetContractHash','artId','years','speciesId','profileId','skillSeed'].some(key=>beast[key]!==frozen[key]))throw Error('当前精品魂兽与原房间冻结来源不符');
      }catch(error){errors.push(error.message);}
      const tempValue = Object.values(active.tempMaterials).reduce((sum, stack) => sum + stack.unitValue * stack.quantity, 0);
      if (tempValue !== active.acquiredBaseValue) errors.push('临时材料价值账与远征汇总不一致');
      if (active.expectedShopAcquisition !== estimateMaterialSaleGold(active.tempMaterials)) errors.push('预计商店收购额未按单件最小金币单位取整');
    }
    for (const blueprint of Object.values(state.研发.蓝图)) {
      try{validateEquipmentBlueprint(blueprint);}catch(error){errors.push(error.message);}
      if((['拘束器','丹药','毒药'].includes(blueprint.category)||blueprint.mechanics?.presetId||blueprint.mechanics?.hostDesign||blueprint.mechanics?.confirmedDesign)&&!validAuthoredBlueprint(state,blueprint)){
        const pending=state.研发.待处理[blueprint.createdFromResearchId],chosen=pending?.candidates?.[pending.chosenIndex]?.normalized;
        if(!pending||pending.status!=='completed'||pending.blueprintId!==blueprint.id||!chosen||abilities.hash(productMechanics(chosen))!==abilities.hash(productMechanics(blueprint.mechanics))||abilities.hash({actorId:pending.actorId,researchId:pending.id,totalMaterialValue:pending.totalMaterialValue,totalUnits:pending.totalUnits,materials:pending.materialSelections,evidence:pending.evidence})!==abilities.hash(blueprint.researchProvenance))errors.push('拘束器蓝图缺少真实研发来源');
        const receipts=prototypeReceipts.get(blueprint.id)??[],receipt=receipts[0];
        if(receipts.length!==1||receipt.id!==receipt.ledgerId||receipt.transactionType!=='确认研发图纸'||receipt.pendingId!==pending?.id||receipt.chosenIndex!==pending?.chosenIndex||receipt.productValue!==blueprint.productValue||receipt.requiredValue!==blueprint.requiredValue||!clean(receipt.prototypeItemId)||abilities.hash(receipt.bridgeClauses)!==abilities.hash(blueprint.bridgeClauses))errors.push('拘束器蓝图缺少原始选择收据');
      }
      if (blueprint.version !== 3 || !Number.isInteger(blueprint.requiredValue) || blueprint.requiredValue < 1 || !Array.isArray(blueprint.bridgeClauses)) errors.push(`图纸${blueprint.id}不是当前价值桥梁格式`);
      if (!['consumable','permanent'].includes(blueprint.productKind)) errors.push(`图纸${blueprint.id}缺少成品寿命类型`);
      if (['魂导器','拘束器'].includes(blueprint.category) && blueprint.productKind !== 'permanent') errors.push(`图纸${blueprint.id}把魂导器错误登记为消耗品`);
      if (!['魂导器','拘束器'].includes(blueprint.category) && blueprint.productKind !== 'consumable') errors.push(`图纸${blueprint.id}把消耗品错误登记为永久物品`);
      if (blueprint.tradable || blueprint.inventoryItem) errors.push(`图纸${blueprint.id}错误进入可交易物品系统`);
    }
    for(const item of Object.values(state.物品.实例)){
      const blueprint=state.研发.蓝图[item.provenance?.blueprintId??item.payload?.blueprintId];
      if(blueprint?.mechanics?.presetId&&(item.type!==world.ITEM_TEMPLATES[blueprint.templateId]?.type||item.payload?.presetId!==blueprint.mechanics.presetId||item.payload?.artId!==blueprint.mechanics.artId))errors.push(`精品成品${item.id}的类别或登记身份与原型不一致`);
      if(blueprint?.mechanics?.confirmedDesign){if(!validateBlueprintProductItem(item,blueprint)||!globalThis.SoulPaidDesign.isItemSource(state,item))errors.push('固定设计成品缺少完整蓝图及实际制造来源');continue;}
      if(['丹药','毒药'].includes(blueprint?.category)){
        const c=blueprint.mechanics,expected={...clone(c),name:c.name,effectGraph:clone(c.graph),soulPowerCost:c.soulPowerCost??0,cooldownTurns:c.cooldownTurns??0,durabilityCost:c.durabilityCost??0,ageTier:'十万年',mechanismCap:'规则'};delete expected.id;
        if(item.templateId!==productTemplate(blueprint.category,blueprint.mechanics)||item.payload?.immutableHash!==blueprint.immutableHash||item.payload?.blueprintVersion!==blueprint.version||item.valuePoints!==blueprint.productValue||abilities.hash(item.payload?.activeSkill)!==abilities.hash(expected))errors.push(`药剂成品${item.id}与实际图纸不一致`);
      }
      if(blueprint?.mechanics?.hostDesign){if(!validateBlueprintProductItem(item,blueprint)||!globalThis.SoulHostCore.sourceAllowed(state,item))errors.push(`宿主成品${item.id}与付费蓝图或实际制造来源不一致`);continue;}
      if(blueprint?.category!=='拘束器'&&!item.payload?.restraint)continue;
      if(!blueprint||blueprint.category!=='拘束器'||item.provenance?.blueprintId!==blueprint.id||item.payload?.blueprintId!==blueprint.id||item.payload?.blueprintVersion!==blueprint.version||item.payload?.immutableHash!==blueprint.immutableHash||item.templateId!==blueprint.templateId||item.type!==world.ITEM_TEMPLATES[blueprint.templateId]?.type||item.quantity!==1||item.valuePoints!==blueprint.productValue||abilities.hash(item.payload?.restraint)!==abilities.hash(blueprint.mechanics.restraint)||item.payload?.activeSkill||item.payload?.activeSkills?.length||item.payload?.passiveEffectGraph||Object.keys(item.payload?.modifiers??{}).length||Object.keys(item.payload?.passiveCombat??{}).length)errors.push(`拘束器成品${item.id}与实际蓝图不一致`);
      if(blueprint?.category==='拘束器'){
        const source=item.provenance??{};
        if(source.type==='research-prototype'){
          const receipt=prototypeReceipts.get(blueprint.id)?.[0];
          if(source.researchId!==blueprint.createdFromResearchId||receipt?.prototypeItemId!==item.id)errors.push(`拘束器原型${item.id}缺少实际交付来源`);
        }else if(source.type==='blueprint-craft'){
          const receipt=transactions[source.transactionId],index=source.batchIndex,ids=receipt?.itemIds,change=receipt?.itemChanges?.find(row=>row.itemId===item.id);
          if(!receipt||receipt.id!==source.transactionId||receipt.transactionType!=='按图纸打造'||receipt.type!=='blueprint-crafted'||receipt.blueprintId!==blueprint.id||source.blueprintVersion!==blueprint.version||!Number.isSafeInteger(index)||index<1||!Array.isArray(ids)||ids[index-1]!==item.id||new Set(ids).size!==ids.length||ids.length!==receipt.quantity||receipt.productValueEach!==blueprint.productValue||receipt.requiredValueEach!==blueprint.requiredValue||change?.quantityBefore!==0||change.quantityAfter!==1)errors.push(`拘束器成品${item.id}缺少实际制造来源`);
        }else if(source.type==='ability-creation'){const event=state.扩展?.creationEffects?.events.find(e=>e.id===source.creationId);if(!event||event.quote.blueprintId!==blueprint.id||!event.result.createdItemIds?.includes(item.id)||!validateBlueprintProductItem(item,blueprint))errors.push(`拘束器成品${item.id}缺少实际能力造物来源`);}
        else errors.push(`拘束器成品${item.id}来源类型无效`);
      }
    }
    for(const pending of Object.values(state.研发.待处理))if(!['completed','all-failed'].includes(pending.status)){
      for(const candidate of pending.mechanicCandidates??[]){
        try{
          if(candidate.confirmedDesign){const checked=validateConfirmedResearchCandidate(pending,{...candidate,name:candidate.confirmedDesign.name,description:candidate.confirmedDesign.description,form:candidate.confirmedDesign.appearance},0);if(!checked.pass)throw Error(checked.errors.join('；'));continue;}
          if(candidate.hostDesign){const checked=validateHostResearchCandidate(pending,{...candidate,name:candidate.confirmedDesign?.name??'待命名',...(candidate.confirmedDesign?{description:candidate.confirmedDesign.description,form:candidate.confirmedDesign.appearance}:{})},0);if(!checked.pass)throw Error(checked.errors.join('；'));continue;}
          if(pending.category==='拘束器'){const checked=pending.category==='拘束器'&&!candidate.hostDesign&&!candidate.confirmedDesign?validateRestraintCandidate(pending,{...candidate,name:candidate.confirmedDesign?.name??'待命名',...(candidate.confirmedDesign?{description:candidate.confirmedDesign.description,form:candidate.confirmedDesign.appearance}:{})},0):validateResearchCandidate(pending,{...candidate,name:candidate.confirmedDesign?.name??'待命名',...(candidate.confirmedDesign?{description:candidate.confirmedDesign.description,form:candidate.confirmedDesign.appearance}:{})},0);if(!checked.pass)throw Error(checked.errors.join('；'));continue;}
          if(pending.category!=='魂导器'){if(!presets.get(candidate.presetId)?.recipe.registeredTemplate)narrative.validateConsumableForm(candidate,pending.category);continue;}
          if(!foundation.EQUIPMENT_AFFIXES.validateForm(candidate,effects.calculateNodeCost))throw new Error('装备候选器型与实际能力不符');
          if(candidate.sourceKind!=='soul-device'&&world.priceEquipment(candidate.effectGraph,candidate.modifiers).spent!==candidate.valueLedger.spent)throw new Error('装备候选价值与实际能力不符');
        }catch(error){errors.push(error.message);}
      }
    }
    errors.push(...(globalThis.SoulPaidDesign?.validateTransfers(state)??[]));
    const worldValidation = world.validateState(state);
    errors.push(...worldValidation.errors);
    return {state, errors: unique(errors), pass: errors.length === 0};
  }

  function validateState(rawState){return validateStateInternal(rawState);}
  function validateCurrentRuntimeState(rawState){
    const raw=world.validateState(structuredClone(rawState));
    if(!raw.pass||!rawState.研发)return raw;
    const crafting=validateStateInternal(structuredClone(rawState),raw);
    return {state:raw.state,errors:[...raw.errors,...crafting.errors],pass:crafting.pass};
  }

  // Personal expeditions reuse their original itinerary and permanent mechanical
  // transactions. Rooms, rewards and model requests never acquire a second owner.
  function npcExpeditionOptions(state,actorId){
    if(actorId===state.角色.主控单位ID||!state.战斗单位.列表[actorId]||expeditions.forActor(state,actorId,{presentOnly:false})||world.partyLeadersOf(state,actorId).length||world.personalActionBlockReason(state,{actorId})||(state.世界.npcPlans??[]).some(p=>p.ownerId===actorId&&['scheduled','travelling','waiting'].includes(p.status)))return [];
    const person=state.人物.列表[actorId],position=positions.positionOf(state,actorId);
    if(!person||position.kind!=='location'||position.sceneId)return [];
    const planPath = world.createRoutePlanner(state);
    return Object.values(DUNGEON_PROFILES).flatMap(d=>{
      if(!world.isLocationKnown(state,d.locationId,actorId))return [];
      try{
        const path=planPath(d.locationId,'balanced',person.locationId,actorId);
        if(state.钱包.列表[person.walletId].gold<path.totalCostGold)return [];
        return d.difficultyIds.map(difficultyId=>({dungeonId:d.id,difficultyId,locationId:d.locationId,name:d.name,travelMinutes:path.totalMinutes,travelGold:path.totalCostGold,
          recommendedLevel:[DIFFICULTIES[difficultyId].recommendedLevelMin,DIFFICULTIES[difficultyId].recommendedLevelMax],ownLevel:state.成长.列表[actorId]?.魂力等级??state.战斗单位.列表[actorId].派生.有效等级}));
      }catch{return [];}
    });
  }
  const npcExpeditionStartId=g=>`npc-expedition:${g.id}:start`;
  const npcExpeditionDecisionId=g=>`npc-expedition-decision:${g.decisionSourceId}`;
  const goalMinute=t=>t.day*1440+t.hour*60+t.minute;
  function recordNpcExpeditionDecision(state,g){
    state.远征??=emptyExpeditionCollections().远征;
    const id=npcExpeditionDecisionId(g),job=state.世界.npcDecisions.find(j=>j.id===g.requestId),plan=state.世界.npcPlans.find(p=>p.id===g.planId);
    if(state.远征.processedTransactions[id]||state.远征.commandRequests?.[id])throw Error('人物远征决定来源已经登记');
    const request={actorId:g.ownerId,requestId:g.requestId,branchId:g.branchId,turn:g.turn,decision:clone(job.decision)},type='人物自主远征决定';
    state.远征.commandRequests??={};state.远征.commandRequests[id]={type,request,requestHash:abilities.hash(request)};
    state.远征.processedTransactions[id]={id,transactionType:type,type:'npc-expedition-decided',goal:clone(g),plan:clone(plan),position:clone(positions.positionOf(state,g.ownerId))};
  }
  function stopNpcExpedition(state,g,reason){
    const id=`npc-expedition-stop:${g.id}`,type='人物远征受阻',request={goalId:g.id,actorId:g.ownerId,at:people.now(state),reason};
    const receipt={id,transactionType:type,type:'npc-expedition-stopped',...request,position:clone(positions.positionOf(state,g.ownerId))};
    state.远征.commandRequests[id]={type,request,requestHash:abilities.hash(request)};state.远征.processedTransactions[id]=receipt;
    g.status='blocked';g.finishedAt=clone(state.世界.时间);g.blockedReason=reason;g.blockedSourceId=id;
  }
  function npcExpeditionOrigin(state,g){return state.远征?.processedTransactions?.[npcExpeditionStartId(g)]??null;}
  function npcExpeditionTerminal(state,g){
    const start=npcExpeditionOrigin(state,g);return start?Object.values(state.远征.processedTransactions).find(r=>r.expeditionId===start.expeditionId&&['expedition-cleared','expedition-safely-extracted','expedition-failed','expedition-escort-rescue'].includes(r.type))??null:null;
  }
  function npcExpeditionReady(state,g){
    if(g.kind!=='expedition'||g.status!=='arrived')return false;
    const start=npcExpeditionOrigin(state,g),a=start?expeditions.byId(state,start.expeditionId):null;
    if(npcExpeditionTerminal(state,g))return true;
    if(a&&foregroundExpedition(state,a)||!a&&world.partyMembers(state,g.ownerId).some(p=>p.personId===state.角色.主控单位ID&&p.present&&p.allowCombat!==false))return false;
    if(a?.phase==='combat')return expeditionBattle(state,a)?.状态==='已结束';
    if(people.isDead(state,g.ownerId))return true;
    if(a?.phase==='awaiting-narrative')return false;
    if(a&&Object.values(state.魂环.待选择).some(p=>p.status==='pending'&&expeditions.participantIds(a,{presentOnly:true}).includes(p.playerId)))return false;
    // Temporary restrictions wait for their real source to change, without a
    // per-minute retry or silent replacement of the original authority.
    try{if(a){
      const gesture=a.phase==='postcombat'&&a.currentRoom.roster.some(b=>state.战斗单位.列表[b.unitId]?.存活状态==='死亡'&&!a.currentRoom.harvestedUnitIds.includes(b.unitId))||a.phase==='interaction'&&a.currentRoom.type==='宝箱'&&!a.currentRoom.opened;
      assertExpeditionActor(state,a,g.ownerId,gesture?['gesture']:[]);assertExpeditionMovement(state,undefined,expeditionOptions(a));
    }else if(world.personalActionBlockReason(state,{actorId:g.ownerId}))return false;}catch{return false;}
    return true;
  }
  function nextNpcExpeditionAt(state,total){
    const now=people.now(state);return now<=total&&(state.世界.npcGoals??[]).some(g=>npcExpeditionReady(state,g))?now:null;
  }
  function advanceNpcExpeditionsAt(state,at){
    for(const g of [...(state.世界.npcGoals??[])].filter(g=>npcExpeditionReady(state,g)).sort((a,b)=>a.id.localeCompare(b.id))){
      const terminal=npcExpeditionTerminal(state,g);
      if(terminal){g.status='completed';g.finishedAt=clone(state.世界.时间);g.completionSourceId=terminal.id;continue;}
      const start=npcExpeditionOrigin(state,g),a=start?expeditions.byId(state,start.expeditionId):null;
      const options={actorId:g.ownerId,npcGoalId:g.id,...(a?{expeditionId:a.id}:{})};
      const id=(action,suffix='')=>`npc-expedition:${g.id}:${action}:${a?.currentNodeId??''}${suffix}`;
      try{
        let result;
        if(a?.phase==='combat')result=resolveCurrentBattle(state,id('battle'),options);
        else if(people.isDead(state,g.ownerId)){stopNpcExpedition(state,g,'本人已死亡，保留实际现场');continue;}
        else if(!start)result=startExpedition(state,{...options,dungeonId:g.dungeonId,difficultyId:g.difficultyId},npcExpeditionStartId(g));
        else if(!a)throw Error('原远征缺少当前实例与终局');
        else if(a.phase==='awaiting-room'){
          const unit=state.战斗单位.列表[g.ownerId],next=availableNextIds(a).sort()[0];
          result=!next||unit.资源.生命.当前<unit.资源.生命.最大*.35?extractSafely(state,id('extract'),options):enterRoom(state,next,id('enter',next),options);
        }else if(a.phase==='interaction'&&a.currentRoom.type==='宝箱'&&!a.currentRoom.opened)result=openChest(state,id('chest'),options);
        else if(a.phase==='interaction'&&a.currentRoom.type==='火堆'&&!a.currentRoom.campUsed)result=useCampfire(state,id('camp'),options);
        else{
          const room=a.currentRoom;
          // Only actual dead beasts and this participant's own eligibility are
          // used. Names and skill choices remain independent model decisions.
          if(a.phase==='postcombat')for(const actorId of expeditions.participantIds(a,{presentOnly:true})){
            if(result||people.isDead(state,actorId))continue;
            for(const beast of room.roster){
              if(state.战斗单位.列表[beast.unitId]?.存活状态!=='死亡')continue;
              for(const martialSoulId of state.成长.列表[actorId]?.武魂ID列表??[]){
                const proposal={...options,actorId,beastUnitId:beast.unitId,martialSoulId};
                if(previewRingChoice(state,proposal).pass){result=prepareRingChoice(state,proposal,id('ring',`:${actorId}:${beast.unitId}:${martialSoulId}`));break;}
              }
              if(result)break;
            }
          }
          if(!result){const beast=a.phase==='postcombat'&&room.roster.find(b=>state.战斗单位.列表[b.unitId]?.存活状态==='死亡'&&!room.harvestedUnitIds.includes(b.unitId));
            result=beast?harvestBeast(state,beast.unitId,options,id('harvest',`:${beast.unitId}`)):finishRoom(state,id('finish'),{...options,confirmAbandon:true});}
        }
        foundation.commitStateDraft(state,result.state);
      }catch(error){
        stopNpcExpedition(state,state.世界.npcGoals.find(row=>row.id===g.id),String(error.message));
      }
    }
  }
  function validateNpcExpeditionGoals(state){
    const errors=[],goals=(state.世界.npcGoals??[]).filter(g=>g.kind==='expedition');
    for(const g of goals)try{
      const d=DUNGEON_PROFILES[g.dungeonId],job=(state.世界.npcDecisions??[]).find(j=>j.id===g.requestId),choice=job?.decision,plan=(state.世界.npcPlans??[]).find(p=>p.id===g.planId);
      const origin=state.远征?.processedTransactions?.[npcExpeditionDecisionId(g)],originalRequest=state.远征?.commandRequests?.[npcExpeditionDecisionId(g)]?.request;
      if(origin?.type!=='npc-expedition-decided'||originalRequest?.actorId!==g.ownerId||originalRequest.requestId!==g.requestId||abilities.hash(originalRequest.decision)!==abilities.hash(choice))throw Error('缺少永久原决定');
      for(const key of ['id','ownerId','kind','motive','branchId','turn','requestId','decisionSourceId','createdAt','knownBy','reconsiderAfter','dungeonId','difficultyId','destinationId','arriveAt','planId'])if(abilities.hash(g[key])!==abilities.hash(origin.goal[key]))throw Error('目标改写了永久原决定');
      for(const key of ['id','ownerId','sourceId','acceptedSourceId','createdAt','destinationId','departAt','arrivalAt','deadline','path','personal','branchId','goal','motive','importance'])if(abilities.hash(plan?.[key])!==abilities.hash(origin.plan[key]))throw Error('行程改写了原路线安排');
      if(['scheduled','travelling'].includes(plan.status)?g.status!=='active':plan.status==='succeeded'?!['arrived','completed','blocked'].includes(g.status):!['blocked','cancelled','missed'].includes(plan.status)||g.status!==plan.status||plan.events.at(-1)?.kind!==plan.status||goalMinute(g.finishedAt)!==goalMinute(plan.events.at(-1).time))throw Error('目标阶段与实际行程终局不符');
      if(!d||!d.difficultyIds.includes(g.difficultyId)||g.destinationId!==d.locationId||!choice||choice.kind!==g.kind||choice.dungeonId!==g.dungeonId||choice.difficultyId!==g.difficultyId||choice.motive!==g.motive||choice.day!==g.arriveAt?.day||choice.hour!==g.arriveAt?.hour||choice.minute!==g.arriveAt?.minute||job.decisionSourceId!==g.decisionSourceId||!plan||!plan.personal||plan.sourceId!==g.id||plan.ownerId!==g.ownerId||g.ownerId===state.角色.主控单位ID)throw Error('目标与本人原决定或行程不符');
      const start=npcExpeditionOrigin(state,g),source=state.远征?.commandRequests?.[npcExpeditionStartId(g)]?.request,terminal=npcExpeditionTerminal(state,g);
      if(start&&(start.type!=='expedition-started'||start.leaderId!==g.ownerId||start.dungeon.id!==g.dungeonId||start.difficulty.id!==g.difficultyId||source?.npcGoalId!==g.id||source.actorId!==g.ownerId||plan.status!=='succeeded'||!expeditions.byId(state,start.expeditionId)&&!terminal))throw Error('远征缺少本人实际到场与原出发/终局');
      if(g.status==='completed'&&(!terminal||g.completionSourceId!==terminal.id)||g.completionSourceId&&g.status!=='completed')throw Error('目标完成缺少实际终局');
      if(['arrived','completed'].includes(g.status)&&plan.status!=='succeeded')throw Error('尚未实际抵达入口');
      if(g.status==='blocked'&&plan.status!=='blocked'){
        const stop=state.远征.processedTransactions[g.blockedSourceId],request=state.远征.commandRequests[g.blockedSourceId]?.request;
        if(stop?.type!=='npc-expedition-stopped'||stop.goalId!==g.id||stop.actorId!==g.ownerId||stop.reason!==g.blockedReason||stop.at!==goalMinute(g.finishedAt)||abilities.hash(request)!==abilities.hash({goalId:stop.goalId,actorId:stop.actorId,at:stop.at,reason:stop.reason}))throw Error('受阻状态缺少原失败来源');
      }
      if(plan.status==='succeeded'){
        let location=plan.path.from,at=plan.departAt,index=0;
        for(const route of plan.path.routes){const depart=plan.events[index++],arrive=plan.events[index++],to=route.from===location?route.to:route.from;
          if(depart?.kind!=='departed'||depart.routeId!==route.id||depart.locationId!==location||depart.to!==to||goalMinute(depart.time)<at||arrive?.kind!=='arrived'||arrive.routeId!==route.id||arrive.from!==location||arrive.locationId!==to||goalMinute(arrive.time)!==goalMinute(depart.time)+route.minutes)throw Error('实际路段证据不完整');location=to;at=goalMinute(arrive.time);}
        const end=plan.events[index];if(location!==g.destinationId||plan.legIndex!==plan.path.routes.length||end?.kind!=='succeeded'||end.locationId!==location||goalMinute(end.time)<at||plan.events.length!==index+1)throw Error('入口到场证据不完整');
      }
    }catch(error){errors.push(`人物远征${g.id}无效：${error.message}`);}
    for(const [id,source] of Object.entries(state.远征?.commandRequests??{}))if(source.request?.npcGoalId){
      const g=goals.find(g=>g.id===source.request.npcGoalId),start=g&&npcExpeditionOrigin(state,g);
      if(!g||!id.startsWith(`npc-expedition:${g.id}:`)||source.request.actorId!==g.ownerId&&!start?.companions.some(c=>c.unitId===source.request.actorId)||id!==npcExpeditionStartId(g)&&source.request.expeditionId!==start?.expeditionId)errors.push('自主远征事务缺少原人物目标和实际参与者');
    }
    for(const r of Object.values(state.远征?.processedTransactions??{})){
      if(r.type==='npc-expedition-decided'&&!goals.some(g=>npcExpeditionDecisionId(g)===r.id))errors.push('永久远征决定缺少原人物目标');
      if(r.type==='npc-expedition-stopped'&&!goals.some(g=>g.id===r.goalId&&g.blockedSourceId===r.id&&g.status==='blocked'))errors.push('永久远征失败缺少原受阻目标');
    }
    return errors;
  }
  world.bindExpeditionValidation(validateExpeditionRecords);
  world.bindExpeditionSchedule({nextAt:nextNpcExpeditionAt,advanceAt:advanceNpcExpeditionsAt});
  people.bindDeathSettlement(reconcileHireDeath);

  return Object.freeze({
    loot, distributeLoot, collectReturnedLoot, proposeLootAgreement, proposeLootResolution, respondLoot, collectLoot, VERSION, DUNGEON_ID, ENTRANCE_LOCATION_ID, SHOP_ID, WORKSHOP_ID, SERVICE_LOCATION_IDS, serviceAtLocation, LAYER_WIDTHS, LAYER_FACTORS, ROOM_FACTORS,
    DIFFICULTIES, ENCOUNTER_ECOLOGY, DUNGEON_PROFILES, LOCATION_DUNGEON_INDEX, ECOLOGY_PROFILES, SHOP_CATALOG, PRODUCT_CATEGORIES, RESEARCH_CHOICE_RULES, QUALITY_MULTIPLIERS, attributeNames, categoryNames, channelNames,
    stableHash, makeRng, normalizeState, difficultyProfile, dungeonProfile, ecologyProfile, dungeonsAtLocation, layerWidthsFor, layerFactor, roomBudget, dangerGrade, validateMap, generateMap, generatePreparedMap, generateRoster,
    prepareCompanionRoster, companionRoster, personalHireAvailability, offerPersonalCompanion, chooseFreeGuide, negotiateCompanion, hireCompanion, dismissCompanion,detachAbilityCompanion,restoreAbilityCompanion, previewExpeditionRisk, startExpedition, enterRoom, resolveRoomNarrative, validateRoomNarrative, deterministicNarrativeFixture, autoResolveCurrentCombat, resolveCurrentBattle, harvestBeast, openChest, useCampfire,
    condenseCurrentRing, absorbCurrentRing, finishRoom, extractSafely, personalWithdrawal, withdrawPersonally, listStoredItems, claimStoredItem,
    previewRingChoice, prepareRingChoice, previewRoomActions, npcExpeditionOptions, recordNpcExpeditionDecision,
    supplyOffers, buySupply, npcPurchaseOptions, currentItemValue, estimateMaterialSaleGold, quoteMaterialSale, sellMaterial, quoteItemSale, sellItem, previewEconomy,
    rerollResearchCandidate, researchCandidateFingerprint, researchRerollAvailability, explainResearchChoices,
    effectAttributeOptions, effectChannelOptions, assertResearchOwner, assertBlueprintOwner, selectedMaterialContext, researchMinimumBudget, resolveResearchChoiceCount, previewResearch, previewWorkshopAccess, recommendResearchMaterials, freezeResearchMechanics, researchNarrativeRequest, validateResearchNarrative, deterministicResearchNarrativeFixture, beginResearch, validateResearchCandidate, recordResearchNaming, resolveResearch, compileProductValue,
    presetBlueprintPolicy,presetBlueprintAccess,presetBlueprints,presetBlueprintStock,presetBlueprintAuctionSupply,cataloguePresetBlueprint,ownedCraftBlueprint,previewLearnPresetBlueprint,learnPresetBlueprint,registerAuthoredCommerceBlueprints,materialFingerprint, materialBridgeEvidence, bridgeClausesForMechanics, researchPresetRequirements, materialSatisfiesBridge, bridgeCoverage, allocateBlueprintBatch, resolveBlueprintMaterials, previewBlueprintCraft, previewBlueprintCraftPrepared, maximumBlueprintCraftQuantity, maximumBlueprintCraftQuantityPrepared, productItemSpec,validateBlueprintProductItem,settleBlueprintProduct, selectedCraftMaterialStacks,personMaterials,productPlacement, chooseResearchCandidate, craftBlueprint, validateState,validateCurrentRuntimeState
  });
});
