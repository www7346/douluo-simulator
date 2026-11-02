(function(root,factory){const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulNpcLoadouts=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v));
 const YEARS=[423,760,1760,4500,12000,25000,40000,65000,85000];
 const damage=(type,n=1)=>['payload.damage',{类型:type,骰数:n,骰面:6,加值:1}];
 const shield=n=>['payload.shield',{数值:n}];
 const buff=(stat,n=1)=>['status.buff',{属性:stat,数值:n,持续回合:2}];
 const shot=nodes=>[['release.projectile',{距离区:3}],['target.single',{阵营规则:'敌方'}],['check.soul_attack',{}],...nodes];
 const melee=nodes=>[['release.melee',{}],['target.single',{阵营规则:'敌方'}],['check.physical_attack',{}],...nodes];
 const self=nodes=>[['target.self',{}],...nodes];
 const ally=nodes=>[['release.touch',{}],['target.single',{阵营规则:'友方'}],...nodes];
 // Content recipes only. The ordinary martial-soul, source, ability and ring
 // compilers price and validate every instance; this catalogue grants no power.
 const FAMILIES=[
  {id:'assault',role:'近战强攻',category:'metal',attrs:[['metal',2],['earth',2]],channels:['melee','armor_break','shield','buff','movement'],type:'金',beast:'铁脊山猪',tags:['兽类','力量','甲壳'],names:['铁槊','青锋剑','乌木短棍','赤铜斧','钩镰枪','断岩锤','砂纹刀','鹿角钺'],verbs:['贯锋','格挡','裂甲','振气','退敌','连击','护身','破阵','决锋']},
  {id:'defense',role:'防御护卫',category:'stone',attrs:[['earth',3],['metal',1]],channels:['melee','shield','buff','resistance','movement'],type:'土',beast:'岩背甲蜥',tags:['兽类','甲壳','守护'],names:['岩甲龟','青铜盾','铁背蜥','灰岩犀','玄砂壁','厚甲犰狳','青石鼎','鳞纹圆盾'],verbs:['迎击','护壳','稳身','震退','岩障','沉肩','坚守','回震','厚垒']},
  {id:'archer',role:'远程侦察',category:'bow',attrs:[['wind',2],['wood',2]],channels:['projectile','sensory','buff','shield'],type:'风',beast:'逐风林隼',tags:['鸟类','风','侦察'],names:['竹节弓','赤翎弩','枫木长弓','柳梢弓','飞叶扇','风羽翎','青藤弩','碎星短弓'],verbs:['穿叶','留痕','追风','避锋','鸣弦','寻迹','羽幕','疾射','穿林']},
  {id:'beast',role:'敏攻追踪',category:'canine',attrs:[['life',2],['wind',2]],channels:['melee','sensory','movement','shield','buff'],type:'物理',beast:'追迹灰狼',tags:['兽类','追踪','迅捷'],names:['灰爪狼','赤尾狐','踏风鹿','雪纹豹','褐羽隼','长耳貂','山纹猫','黑背獾'],verbs:['扑击','嗅迹','疾步','护皮','锐爪','定息','迂回','追猎','破隙']},
  {id:'plant',role:'草木控制',category:'vine',attrs:[['wood',3],['life',2]],channels:['projectile','entangle','heal','buff'],type:'木',beast:'青络藤蛇',tags:['植物','藤蔓','缠绕','生命'],names:['青缠藤','刺叶荆棘','芦花草','石缝苔','垂露藤','碧罗网草','银丝萝','针叶蕨'],verbs:['叶击','缠足','返青','扎根','刺梢','结网','养息','蔓生','枝锁']},
  {id:'healer',role:'治疗整备',category:'flower',attrs:[['life',3],['water',2]],channels:['touch','heal','cleanse','shield','buff'],type:'生命',beast:'露华药鹿',tags:['兽类','生命','治疗','净化'],names:['露珠铃','青芽药杵','温泉莲','白露杖','百草盏','银叶铃兰','青竹笛','回春芦'],verbs:['润伤','清秽','护脉','培元','回露','洗毒','养身','青息','续生']},
  {id:'fire',role:'火系远攻',category:'flame',attrs:[['fire',3]],channels:['projectile','burn','shield','buff'],type:'火',beast:'赤尾火蜥',tags:['兽类','火','灼烧'],names:['赤炭炉','燎原雀','火舌蜥','红烛台','炽砂珠','炎纹鞭','炉心灯','焦羽鸦'],verbs:['火星','余烬','温盾','燃气','焰矢','灼痕','火衣','炭雨','穿焰']},
  {id:'water',role:'水冰支援',category:'aquatic-plant',attrs:[['water',2],['ice',2]],channels:['projectile','freeze','shield','cleanse'],type:'水',beast:'寒溪鳞鱼',tags:['鱼类','水','冰','寒冷'],names:['细浪环','霜苇','溪鳞鱼','凝露珠','寒纹蚌','清泉壶','雾绡','流霜扇'],verbs:['水矢','凝霜','水幕','清流','寒针','缓浪','雾护','洗尘','回潮']}
 ];
 const ROLES={guard:['assault','defense'],'imperial-patrol':['assault','defense'],hunter:['archer','beast'],'forest-veteran':['archer','beast'],mercenary:['assault','defense','beast','fire'],'frontier-mercenary':['assault','defense','archer','fire'],'sea-guide':['water','archer'],'ocean-mercenary':['assault','defense','water'],'spirit-hall-worker':['defense','healer'],'sect-retainer':['assault','plant','healer'],'commerce-merchant':['assault','defense'],'local-artisan':['assault'],'commerce-artisan':['assault'],'commerce-smith':['assault'],'commerce-ally':['healer'],'commerce-healer':['healer'],'auction-owner':['defense'],'auction-host':['healer']};
 const ENTRIES=FAMILIES.flatMap(f=>f.names.map((name,index)=>({id:`npc:${f.id}:${index+1}`,name,family:f.id,index,role:f.role,era:'斗罗大陆第一部时期',rarity:'常规',draft:{name,concept:`${name}以${f.role}见长，能力来自实际魂环。`,form:`魂力凝成${name}的清晰形态，光纹沿轮廓起伏。`,role:f.role,attributeVersion:3,categories:[`category.${f.category}`],attributes:f.attrs.map(([id,investment])=>({id:`attribute.${id}`,investment:Math.min(4,investment+(id===f.attrs[0][0]?index%3:(index>>1)%2))})),channels:f.channels.map(id=>`channel.${id}`),traits:[],weaknesses:[],baseAction:{mode:f.id==='healer'?'touch':['archer','plant','fire','water'].includes(f.id)?'ranged':'melee',powerTier:['assault','defense','beast'].includes(f.id)&&index>=4?1:0,attributeId:`attribute.${f.attrs[0][0]}`},playerConfirmed:true}})));
 // Common names already documented in the project's original-character catalog.
 // Their recipes below are game-authored, not copied signature soul skills.
 const COMMON_CANON=[['blue-silver-grass','蓝银草','plant','grass'],['long-staff','长棍','assault','staff'],['lone-wolf','独狼','beast','canine'],['wolf','狼','beast','canine'],['battle-tiger','战虎','beast','feline'],['snake','蛇','beast','serpent'],['skeleton','骷髅','beast','humanoid'],['healing-scepter','治疗权杖','healer','staff']];
 for(const [id,name,family,category]of COMMON_CANON){const base=clone(ENTRIES.find(e=>e.family===family&&e.index===0));base.id=`npc:canon:${id}`;base.name=base.draft.name=name;base.canonName=name;base.source='existing-canonical-character-catalog';base.draft.concept=`${name}是常见武魂类型，按${base.role}配置基础能力。`;base.draft.form=`魂力显出${name}的清晰轮廓。`;base.draft.categories=[`category.${category}`];base.draft.attributes=base.draft.attributes.map((a,i)=>({...a,investment:i?1:2}));base.draft.baseAction.powerTier=0;ENTRIES.push(base);}
 const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};freeze(ENTRIES);
 function get(id){return ENTRIES.find(e=>e.id===id);}
 const eligibleCache=new Map();
 function candidates(archetype,budget=40){const key=`${archetype}:${budget}`;if(!eligibleCache.has(key)){const allowed=ROLES[archetype],pool=ENTRIES.filter(e=>(!allowed||allowed.includes(e.family))&&(!['local-artisan','commerce-artisan','commerce-smith'].includes(archetype)||[2,3,5].includes(e.index)||e.id==='npc:canon:long-staff')&&root.SoulMartialSoulCore.inspectDraft(e.draft,{budget}).accepted);if(!pool.length)throw Error('当前人物定位没有合法的预设武魂');eligibleCache.set(key,pool);}return eligibleCache.get(key).map(e=>clone(e));}
 function select(archetype,seed,budget=40){const pool=candidates(archetype,budget);return pool[root.SoulPresetCatalog.indexFor(seed,`npc-loadout:${archetype}`,pool.length)];}
 function mechanics(f,ordinal,index){
  const n=1+Math.floor((ordinal-1)/3),slot=(ordinal-1+index%3)%9,hit=f.id==='archer'||['plant','fire','water'].includes(f.id)?shot:melee;
  if(f.id==='healer')return slot%4===0?ally([['payload.heal',{骰数:n,骰面:6,加值:3}]]):slot%4===1?ally([['payload.cleanse',{类别:'毒素',最大数量:1}]]):slot%4===2?ally([shield(6+n*3)]):ally([buff('体魄',n)]);
  if(f.id==='plant')return slot%4===0?shot([damage('木',n)]):slot%4===1?[['release.projectile',{距离区:3}],['target.single',{阵营规则:'敌方'}],['check.save',{属性:'身法',难度加值:0,成功效果:'无'}],['status.limb_bind',{部位:'双腿',姿态:'身前',层数:1,持续回合:2,挣脱难度加值:0}]]:slot%4===2?self([['payload.heal',{骰数:n,骰面:4,加值:2}]]):self([buff('体魄',n)]);
  if(f.id==='fire')return slot%4===0?shot([damage('火',n)]):slot%4===1?shot([['status.burn',{骰数:n,骰面:4,持续回合:2}]]):slot%4===2?self([shield(6+n*3)]):self([buff('力量',n)]);
  if(f.id==='water')return slot%4===0?shot([damage('水',n)]):slot%4===1?shot([['status.slow',{数值:1,持续回合:2}]]):slot%4===2?self([shield(6+n*3)]):self([['payload.cleanse',{类别:'毒素',最大数量:1}]]);
  if(['archer','beast'].includes(f.id))return slot%4===0?hit([damage(f.type,n)]):slot%4===1?hit([['status.mark',{持续回合:3,追踪距离区:2,不可隐藏:false}]]):slot%4===2?self([shield(6+n*3)]):self([buff('身法',n)]);
  return slot%5===0?melee([damage(f.type,n)]):slot%5===1?self([shield(6+n*3)]):slot%5===2?self([buff(f.id==='defense'?'物理防御':'力量',n)]):slot%5===3?melee([['move.knockback',{距离区:1}]]):f.id==='assault'?melee([damage('金',n),['status.armor_break',{数值:1,持续回合:2}]]):self([['status.resistance_shift',{类型:'物理',模式:'抗性',持续回合:2}]]);
 }
 // Authored names in actual ring order, including each entry's effect rotation.
 // These are game-authored skills, including those of common canonical souls.
 // Names describe the existing effects; they do not grant extra mechanics.
 const SKILL_NAMES={
  // 强攻：伤害、护盾、力量、击退、破甲（按各武魂的实际环序排列）。
  'npc:assault:1':['铁锋突刺','横槊铁衣','铁脊蓄劲','横杆荡敌','槊尖裂甲','寒锋直贯','铁影护身','沉锋聚力','长槊拒敌'],
  'npc:assault:2':['青锋剑围','凝锋聚劲','回锋逐客','青刃剖甲','青光直斩','剑气青屏','锋鸣振骨','逆锋荡退','寒芒递剑'],
  'npc:assault:3':['乌木沉劲','横棍逐尘','木锋裂隙','乌棍叩门','乌木护障','沉木贯力','扫棍退敌','枯木直捣','木影成垣'],
  'npc:assault:4':['铜锋劈落','赤铜护胄','怒斧聚力','横斧推山','赤刃断铠','铜光重劈','铜幕披身','赤斧振骨','斧背荡石'],
  'npc:assault:5':['钩月护身','沉枪蓄力','镰杆拒马','钩锋裂胄','镰月直刺','回镰铁障','枪脊劲涌','横镰逐阵','钩尖寒刺'],
  'npc:assault:6':['坠岩蓄劲','锤震退敌','重锤凿甲','断岩沉击','岩锤护幕','沉岳壮骨','锤风逐尘','碎石重落','磐锤成垒'],
  'npc:assault:7':['砂刃直劈','砂纹刀幕','沉砂聚劲','刀背荡退','砂锋削甲','砾光横斩','砂幕护体','砺刃振力','扬砂拒敌'],
  'npc:assault:8':['角钺护环','虬角凝力','横钺逐石','鹿角剖铠','岔锋直斩','角影成屏','双角沉劲','钺背推锋','角尖挑落'],
  // 防御：伤害、护盾、物防、击退、物理抗性。
  'npc:defense:1':['岩龟头槌','岩甲屏障','龟背固守','龟肩震退','石壳御创','沉甲撞击','磐背护身','龟息坚甲','重壳拒敌'],
  'npc:defense:2':['铜盾壁垒','青铜坚守','盾沿推敌','铜甲卸劲','铜盾叩击','铜壁护身','沉盾固防','横盾排锋','盾角重撞'],
  'npc:defense:3':['铁背绷甲','蜥尾荡退','铁鳞卸力','蜥爪沉击','铁背护障','硬鳞固身','摆尾拒敌','伏身撞石','鳞背成垒'],
  'npc:defense:4':['灰犀顶撞','灰岩甲幕','犀肩坚守','犀角推山','岩皮卸劲','沉蹄踏击','犀背石障','重岩固骨','低角逐敌'],
  'npc:defense:5':['玄砂护壁','聚砂固甲','砂壁排敌','玄砂卸力','砂岩叩击','厚砂屏障','沉砂坚守','壁震逐尘','玄砾直撞'],
  'npc:defense:6':['犰甲紧束','卷甲震退','厚甲缓冲','犰爪迎击','层甲护幕','叠甲固守','甲肩推敌','沉身扑撞','甲环成壁'],
  'npc:defense:7':['石鼎叩山','鼎纹护罩','青鼎固身','鼎足推石','鼎腹卸劲','沉鼎撞钟','青石鼎障','石纹坚守','鼎沿荡敌'],
  'npc:defense:8':['鳞盾成环','叠鳞坚甲','圆盾排浪','鳞纹卸力','盾脊撞击','密鳞屏障','鳞甲固防','旋盾拒敌','盾缘沉叩'],
  // 远程侦察：风伤、标记、护盾、身法；标记不附带追踪之外的控制。
  'npc:archer:1':['竹弦风矢','竹叶留痕','竹影护幕','竹梢轻身','穿节鸣镝','青竹寻迹','竹节风障','摇竹步影','翠弦穿叶'],
  'npc:archer:2':['赤翎烙印','翎羽护屏','赤羽轻步','翎弩破风','红羽循踪','赤翎风幕','翎骨灵身','赤羽鸣矢','红翎穿空'],
  'npc:archer:3':['枫影护罩','枫梢轻步','枫弦穿风','丹枫留印','枫叶风屏','踏枫灵身','枫镝鸣秋','枫梢贯叶','红枫寻踪'],
  'npc:archer:4':['柳弦风箭','柳丝系痕','垂柳风幕','柳梢扶身','拂柳鸣镝','柳叶寻迹','柳荫护屏','垂丝轻步','青柳穿梢'],
  'npc:archer:5':['飞叶留印','叶扇护幕','飞叶轻身','扇叶风刃','叶脉循踪','层叶风障','旋叶灵步','青叶破风','叶尖鸣风'],
  'npc:archer:6':['风羽屏障','羽落轻身','翎尖风矢','风翎留痕','叠羽护幕','扶羽灵步','长翎穿风','羽芒直射','翎光循迹'],
  'npc:archer:7':['藤弩劲矢','青藤留迹','藤叶风幕','藤梢灵身','青弩穿林','藤纹系印','藤影护屏','拂藤轻步','藤弦破风'],
  'npc:archer:8':['星屑留痕','星弦护幕','星影轻步','碎星风矢','星芒循踪','弦月风障','踏星灵身','星镝破空','碎芒直射'],
  // 敏攻追踪：近战伤害、标记、护盾、身法；身法提升并非瞬移。
  'npc:beast:1':['灰狼扑爪','狼爪猎印','灰鬃护障','伏狼灵步','裂风狼牙','灰爪循迹','狼影护身','逐猎步影','沉爪撕击'],
  'npc:beast:2':['赤狐爪印','狐尾护幕','赤尾轻步','狐牙突袭','尾痕循猎','赤绒护障','狐影灵身','赤爪掠击','折尾扑咬'],
  'npc:beast:3':['鹿角护屏','鹿蹄轻身','短角顶击','鹿印循迹','鹿纹护障','踏草灵步','沉蹄侧踢','鹿肩冲撞','蹄痕猎记'],
  'npc:beast:4':['雪豹扑击','雪爪留印','雪纹护幕','伏雪轻身','寒爪撕咬','豹痕追猎','雪斑屏障','掠雪灵步','豹牙直噬'],
  'npc:beast:5':['隼爪猎印','褐羽护障','隼影轻身','褐隼啄击','羽痕循迹','隼翎护幕','掠地灵步','利喙穿击','隼爪钩落'],
  'npc:beast:6':['貂绒护幕','长耳灵身','貂爪突击','貂痕猎印','柔绒屏障','伏貂轻步','尖牙啮咬','貂尾掠爪','耳纹循踪'],
  'npc:beast:7':['山猫利爪','猫爪留痕','山纹护障','伏猫轻身','猫牙扑袭','山纹寻迹','斑纹护幕','踏枝灵步','弯爪撕击'],
  'npc:beast:8':['獾爪猎记','黑背护障','獾步灵身','獾牙沉咬','黑爪循踪','獾皮护幕','低身敏步','掘爪扑击','厚掌重拍'],
  // 草木控制：木伤、缚腿、自疗、体魄；缠绕不冒称全身禁锢。
  'npc:plant:1':['青藤叶矢','盘藤缠足','青蔓回春','藤根固元','藤梢穿叶','绕踝青索','嫩藤续息','深根养身','翠蔓直刺'],
  'npc:plant:2':['荆棘锁踝','刺叶养伤','棘根培体','荆叶锐刺','棘蔓绊足','荆芽返青','老根壮骨','荆枝飞刺','棘尖穿风'],
  'npc:plant:3':['芦芽回生','芦根养元','芦叶轻矢','芦丝缠踝','芦心复苏','苇茎固体','芦锋穿叶','飞絮叶刃','芦绦绊足'],
  'npc:plant:4':['石苔飞屑','苔丝缠足','碧苔养伤','石根培元','苔针直射','苔络锁踝','湿苔续息','贴岩固体','青苔穿隙'],
  'npc:plant:5':['垂藤绊足','露蔓回生','垂露培体','露叶穿风','藤络缠踝','垂露疗伤','润根壮骨','垂梢飞叶','露尖直刺'],
  'npc:plant:6':['碧草复苏','罗根固元','网草叶矢','罗草缚足','碧芽养伤','网根培体','碧刃穿叶','罗叶直射','草网锁踝'],
  'npc:plant:7':['银萝飞叶','银丝绊足','萝芽回春','萝根养体','银叶直刺','丝萝缠踝','银露续息','盘萝固元','萝梢穿风'],
  'npc:plant:8':['蕨须缠足','嫩蕨养伤','蕨根培元','针蕨飞刺','针须锁踝','卷蕨返青','深蕨壮体','蕨针直射','青针穿叶'],
  // 治疗整备：友方治疗、解毒、护盾、体魄；清秽仅指现有毒素净化。
  'npc:healer:1':['铃露润伤','露铃涤毒','清铃护脉','铃音培元','珠露回生','铃泉洗毒','珠光护身','和铃养体','鸣露疗伤'],
  'npc:healer:2':['青杵祛毒','药芽护脉','药香培元','青芽润伤','杵露洗毒','药叶护幕','青杵养体','药芽续生','草杵回春'],
  'npc:healer:3':['暖莲护脉','温莲养元','莲泉润伤','莲露涤毒','莲瓣护幕','温泉培体','莲心续息','暖泉回生','净莲洗毒'],
  'npc:healer:4':['白露润脉','露杖洗毒','白露护幕','清露培元','杖露疗伤','晨露涤毒','露华护身','白露养体','晨杖回春'],
  'npc:healer:5':['百草解毒','草露护脉','百草培元','草盏润伤','青盏洗毒','百草护幕','药盏养体','盏露回生','芳草续息'],
  'npc:healer:6':['兰叶护脉','铃兰养元','兰露润伤','兰香涤毒','银兰护幕','兰根培体','兰铃回春','银叶续生','银露洗毒'],
  'npc:healer:7':['竹音润伤','清笛涤毒','竹韵护脉','和音培元','竹露续生','笛露洗毒','青音护幕','竹息养体','笛泉回春'],
  'npc:healer:8':['春芦祛毒','芦光护脉','春根培元','春露润伤','青芦洗毒','芦叶护幕','回春养体','春芦续息','芦露回生'],
  // 火系远攻：火伤、灼烧、自身护盾、力量；不额外增加范围或召唤。
  'npc:fire:1':['炭星直射','炭火灼痕','炉灰护幕','炭心聚力','赤炭飞火','炉烬附焰','炭纹护身','炉膛蓄劲','炭芒穿风'],
  'npc:fire:2':['雀焰灼痕','赤雀护幕','雀骨振力','雀喙炎矢','燎羽余焰','雀羽火障','赤羽聚劲','雀火啄击','雀翎飞焰'],
  'npc:fire:3':['火鳞护障','蜥骨蓄力','蜥舌火矢','蜥焰灼痕','赤鳞火幕','蜥脊振劲','舌焰直射','火蜥吐芒','鳞火附灼'],
  'npc:fire:4':['烛芯火矢','红烛留焰','烛光护幕','烛心蓄劲','赤烛飞芒','烛泪灼痕','红光火障','烛焰振力','烛尖穿火'],
  'npc:fire:5':['炽砂烙痕','砂珠火幕','炽珠凝力','砂火直射','灼砂余烬','砂光护障','炽核蓄劲','赤砂火矢','珠焰穿风'],
  'npc:fire:6':['炎纹护幕','炎鞭聚力','鞭梢炎矢','炎痕留火','鞭影火障','赤纹振劲','长鞭吐焰','鞭芒火箭','灼鞭余焰'],
  'npc:fire:7':['灯芯炎矢','灯火附灼','炉灯护幕','灯心振力','明焰直射','灯烬灼痕','灯光火障','炉心蓄劲','灯芒穿夜'],
  'npc:fire:8':['鸦火灼痕','焦羽护障','鸦骨凝力','鸦喙火矢','焦翎余烬','鸦影火幕','黑羽振劲','焦鸦吐焰','鸦翎飞火'],
  // 水冰支援：水伤、减速、自身护盾、自身解毒；寒意只减速不冻结。
  'npc:water:1':['细浪水矢','缓浪牵足','浪环护幕','清浪涤毒','回浪直击','叠浪迟行','环水屏障','净潮洗毒','浪尖穿流'],
  'npc:water:2':['霜苇迟步','苇霜护幕','霜露洗毒','苇尖水矢','寒苇缓行','苇影水障','苇泉涤毒','霜苇射流','苇叶穿水'],
  'npc:water:3':['溪鳞水幕','溪泉洗毒','溪鳞吐矢','冷溪迟步','鱼鳞护障','清溪涤毒','鱼吻射流','溪锋水箭','寒鳞缓行'],
  'npc:water:4':['凝露水矢','冷露迟行','露珠护幕','凝珠洗毒','露芒直射','寒珠缓步','凝露水障','澄露涤毒','珠光穿流'],
  'npc:water:5':['寒纹迟行','蚌壳水幕','蚌泉洗毒','蚌珠水矢','寒蚌缓步','蚌影护障','珠泉涤毒','寒纹射流','蚌尖水箭'],
  'npc:water:6':['清壶水幕','泉壶洗毒','壶口水矢','冷泉迟步','壶影护障','净泉涤毒','清泉直射','壶嘴射流','泉涌缓行'],
  'npc:water:7':['雾绡水矢','雾寒迟步','雾绡护幕','净雾洗毒','绡锋射流','湿绡缓行','薄雾水障','澄雾涤毒','雾丝穿水'],
  'npc:water:8':['霜扇迟行','流霜水幕','扇露洗毒','霜叶水矢','寒扇缓步','扇影护障','流泉涤毒','霜锋射流','扇芒穿水'],
  // 原著常见武魂的配套技能同样逐项编定，不使用原著人物的独门魂技。
  'npc:canon:blue-silver-grass':['蓝叶飞矢','蓝草缠足','银芽续生','蓝根固元','银叶穿风','盘草锁踝','蓝露养伤','银根培体','蓝梢直刺'],
  'npc:canon:long-staff':['平棍直捣','棍影护身','长棍蓄劲','横杆拒敌','棍锋凿甲','长杆叩石','圆棍护幕','沉棍振力','扫杆逐尘'],
  'npc:canon:lone-wolf':['孤狼突咬','孤爪猎印','独狼护障','孤影轻步','独牙撕击','孤痕循猎','孤鬃护幕','独步追风','孤爪扑击'],
  'npc:canon:wolf':['苍狼爪击','苍牙留痕','狼鬃护幕','苍爪灵步','狼牙直噬','狼痕追迹','苍毛屏障','伏爪轻身','狼肩扑撞'],
  'npc:canon:battle-tiger':['战虎重爪','虎爪猎印','虎纹护障','伏虎灵步','虎牙扑噬','战纹循猎','虎鬃护幕','踏石虎步','虎掌沉击'],
  'npc:canon:snake':['蛇牙突咬','蛇痕猎记','蛇鳞护幕','游蛇灵身','蛇颈弹击','鳞印循踪','盘鳞护障','蛇行轻步','长尾抽击'],
  'npc:canon:skeleton':['骨爪直刺','骨痕猎印','白骨护幕','骨节灵身','骸拳叩击','骨纹循踪','骨甲屏障','轻骸敏步','骨肘重击'],
  'npc:canon:healing-scepter':['权杖润伤','杖光涤毒','权杖护脉','柔光培元','杖辉续生','清辉洗毒','杖影护幕','温辉养体','杖泉回春']
 };
 const registeredNames=new Set();
 if(Object.keys(SKILL_NAMES).length!==ENTRIES.length)throw Error('预设魂技名称目录与武魂目录不一致');
 for(const e of ENTRIES){const names=SKILL_NAMES[e.id];if(!names||names.length!==9)throw Error(`预设武魂缺少正式魂技名称：${e.name}`);for(const name of names){if(typeof name!=='string'||!name.trim()||registeredNames.has(name))throw Error(`预设魂技名称缺失或重名：${e.name}`);registeredNames.add(name);}}
 freeze(SKILL_NAMES);
 function loadout(id,level){const e=get(id);if(!e)throw Error('人物配装未登记');const f=FAMILIES.find(f=>f.id===e.family),count=Math.min(9,Math.floor((level-1)/10));return {soulIndex:1,desiredCount:count,rings:Array.from({length:count},(_,i)=>({years:YEARS[i],evidence:'authored-npc-loadout',sourceOrigin:'魂兽猎杀',source:{物种ID:`npc-source:${f.id}`,名称:f.beast,类别标签:[f.tags[0]],种族特征:f.tags,属性谱:{主属性:f.attrs.map(([id])=>`attribute.${id}`),副属性:[]}},skills:[{name:SKILL_NAMES[e.id][i],requestedEffects:mechanics(f,i+1,e.index)}]}))};}
 function profile(person,location){const family=ENTRIES.find(e=>e.id===person.扩展?.npcLoadoutId)?.role??person.occupation;return {biography:`${person.name}在${location}以${person.occupation}谋生，常年积累了${family}方面的经验。${['早年随亲人往来乡镇，后来在此安家。','从学徒做起，靠守约和熟悉本地的同行维持生计。','曾离乡谋生，最终选择在熟悉的道路旁定居。','跟随长辈学习手艺，如今独立承担工作。'][root.SoulPresetCatalog.indexFor(person.seed,'npc-biography',4)]}`,values:person.personality,speech:`言语${person.personality}，习惯结合日常经历说明自己的判断。`,shortTermGoal:['完成手边的工作，攒足修缮住处的费用。','处理好最近的委托，抽空看望家人。','整理行装与工具，为下一趟出行做准备。','结清手边的账目，留出一段安稳休息的时间。'][root.SoulPresetCatalog.indexFor(person.seed,'npc-goal',4)],longTermGoal:'在自己的职业中积累稳定的生计，也保留选择今后生活的余地。'};}
 function skillRoles(archetype){return ['commerce-ally','commerce-healer','auction-host'].includes(archetype)?['recovery','defense','counter','enhance']:['guard','imperial-patrol'].includes(archetype)?['defense','damage','control']:archetype==='spirit-hall-worker'?['defense','recovery','damage']:['damage','weaken','movement','control','defense','recovery'];}
 function ordinarySoul(value){const name=String(value?.name??value?.名称??'').normalize('NFKC').replace(/\s/g,'');return !root.SoulPresetCatalog.list({category:'武魂'}).some(e=>(e.gates.rarity!=='常规')&&name.includes(e.name));}
 function assertOrdinarySoul(value){if(!ordinarySoul(value))throw Error('新建普通人物不能使用原著专属、传承或跨时代武魂，请按人物定位创建原创武魂。');}
 return Object.freeze({ENTRIES,select,candidates,get,loadout,profile,skillRoles,ordinarySoul,assertOrdinarySoul});
});
