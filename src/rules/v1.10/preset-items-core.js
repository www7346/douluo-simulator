(function(root,factory){const api=factory(root?.SoulPresetAuthoring??(typeof require==='function'?require('./preset-authoring-core.js'):null));if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulPresetItems=api;})(typeof globalThis!=='undefined'?globalThis:this,function(h){
 'use strict';const ENTRIES=[],T=h.stat,E=h.amplify,R=h.resistance,B=h.buff,D=h.damage,S=h.self;
 const later={era:'斗罗大陆第二部技术的稀有渠道',rarity:'跨时代稀有',sourceNote:'本项目原创后期魂导技术配方，通过稀有来源供给；不当作第一部普通商店常备物。'};
 function device(id,name,description,appearance,form,kind,nodes,attributes={},options={}){ENTRIES.push(h.entry('魂导器',id,name,description,appearance,{templateId:options.templateId??`preset-item-${id}`,passiveNodes:nodes,modifiers:{attributes},fixedForm:form,equipmentKind:kind,maxDurability:options.maxDurability??100},options));}
 function activeDevice(id,name,description,appearance,form,kind,specs,cost=3,durability=1,options={}){ENTRIES.push(h.entry('魂导器',id,name,description,appearance,{templateId:options.templateId??`preset-item-${id}`,effectSpecs:specs,modifiers:{attributes:{}},fixedForm:form,equipmentKind:kind,maxDurability:options.maxDurability??80,soulPowerCost:cost,durabilityCost:durability,cooldownTurns:options.cooldownTurns??1,requirements:options.requirements??['gesture'],deviceCategory:options.deviceCategory??'攻击'}, {...later,...options}));}
 device('leaf-heart','叠叶护心衣','增加二十点生命上限并减去一份固定伤害，防护来自实际装备。','墨绿软甲内缝着叠叶薄片，弯折处露出浅金叶脉。','robe','防具',[T('生命上限',20),T('固定减伤',1)],{},{templateId:'device-leaf-heart'});
 device('echo-bracer','玄壁回纹护腕','开战获得三十点护盾并提高一档物防，离开装备来源便结束对应被动。','深灰护腕内侧回纹首尾扣合，腕前留着可展开的薄壁。','bracer','防具',[T('开战护盾',30),T('物理防御',1)],{},{templateId:'device-xuanbi-echo'});
 device('steady-dagger','正风短刃','普通攻击命中加一、伤害加二，适合魂力不足时稳定近战。','厚脊短刃微偏锋线，柄端绕着磨旧的青绳。','dagger','武器',[T('普通攻击命中',1),T('普通攻击伤害',2)],{},{templateId:'device-zhengfeng'});
 device('tide-pendant','潮生佩','体魄加一并抵抗水伤，属性和抗性分别计价。','旧银环抱着青蓝石芯，石面像浅水缓缓泛纹。','pendant','饰品',[R('水','抗性',0)],{体魄:1},{templateId:'device-chaosheng'});
 device('bastion-bracer','玄壁魂导护腕','每场开战获得二十七点护盾，护盾用尽不会自行补满。','玄铁护腕有一块窄盾形晶面，晶边嵌着三枚铜钉。','bracer','防具',[T('开战护盾',27)],{},{templateId:'device-bastion-bracer',maxDurability:80});
 device('vital-lotus','生息莲魂导器','悟性和意志各加一，附带生命抗性；不直接治疗或补魂。','一朵青玉小莲藏在银底座里，莲蕊如温绿灯点。','pendant','饰品',[R('生命','抗性',0)],{悟性:1,意志:1},{templateId:'device-vital-lotus',maxDurability:64});
 device('wind-boots','流风魂导靴','身法加一、风伤提高一成、移动区加一，实际移动仍消耗行动。','软底长靴踝侧有细风纹，靴底边缘露出淡青晶线。','boots','饰品',[E('风',10),T('移动区',1)],{身法:1},{templateId:'device-windstep-boots',maxDurability:70});
 device('soul-lens','照魂镜片','感知加一、灵魂伤害提高一成、先攻加一，不赋予精神控制。','小银镜框托着透明晶片，片内冷白魂纹排列得很齐。','crown','饰品',[E('灵魂',10),T('先攻',1)],{感知:1},{templateId:'device-soul-lens',maxDurability:90});
 device('moon-drape','月荫护帷','魂技防御和先攻各加一，以轻防护维持行动先机。','腕边薄帷有暗紫月纹，展开时只遮住身前窄窄一段。','bracer','防具',[T('魂技防御',1),T('先攻',1)],{},{templateId:'device-yueyin'});
 device('gold-sand-armor','金沙守脊甲','物防加一并在开战时获得十点小盾，轻甲没有永久叠盾。','灰金软甲背脊缝着细砂晶粒，肩片保留宽大活动缝。','robe','防具',[T('物理防御',1),T('开战护盾',10)],{},{templateId:'device-jinsha'});
 device('sea-scale-charm','海鳞避潮坠','抵抗水属性并增加十点生命上限，适合潮湿路线护身。','蓝银坠饰外缘像三片叠鳞，中央石芯带着潮纹。','pendant','饰品',[R('水','抗性',0),T('生命上限',10)],{},{templateId:'device-hailin'});
 activeDevice('mind-inspector','照神鉴','接触命中后尝试二档物品域精神控制，十分钟内依赖器具有效来源。','小银鉴内有两道错开的眉形回路，镜面映着淡金术纹。','pendant','饰品',[['release.touch',{}],['target.single',{阵营规则:'任意'}],['check.save',{属性:'意志',难度加值:0,成功效果:'无'}],['status.mind_control',{持续方式:'世界分钟',持续分钟:10,来源依赖:'道具有效',强度:2,命令域:'物品',控制距离:'同场'}]],6,1,{templateId:'device-zhaoshen',requirements:['gesture','contact'],deviceCategory:'辅助'});
 device('ember-ring','余烬护戒','火伤增幅百分之五并抵抗火伤，增幅与抗性独立结算。','黑铜戒环裹住一枚暗红余烬石，内侧没有锐缘。','bracelet','饰品',[E('火',5),R('火','抗性',0)]);
 device('frost-helm','霜棱护额','提高物防并抵抗冰伤，护额不提供冰属性攻击能力。','冰白额甲中央有一条碧色窄棱，两端用软带固定。','helm','防具',[T('物理防御',1),R('冰','抗性',0)]);
 device('wind-eaves','听风冠','提高先攻与魂技命中，已有风属性伤害提高一成；侦察仍按真实检定执行。','青银小冠两侧挂着轻薄羽片，羽片只随真实气流轻动。','crown','饰品',[T('先攻',1),T('魂技攻击命中',1),E('风',10)]);
 device('iron-striker','定脊玄刀','普通攻击命中加一、伤害加三，刀锋保持窄实形态。','玄刀刀脊稍厚，刀尖有短短一段银色亮面。','sword','武器',[T('普通攻击命中',1),T('普通攻击伤害',3)]);
 device('wayfarer-mantle','远途护衣','增加十五点生命上限并减少一份固定伤害，以较轻容量护持远行。','灰绿长衣衬里缝着细骨片，衣摆留有防雨暗边。','robe','防具',[T('生命上限',15),T('固定减伤',1)]);
 device('two-mind-ward','双境宁神坠','分别抵抗精神和灵魂伤害，二者没有合并为同一种属性。','双层银坠上分别嵌着淡蓝和冷白两颗细晶。','pendant','饰品',[R('精神','抗性',0),R('灵魂','抗性',0)]);
 device('heartplate','榆心薄甲','物防加一并增加十五点生命上限，容量增加不自动治疗。','白榆片甲护住胸口，叶状金纹沿甲边一层层排开。','breastplate','防具',[T('物理防御',1),T('生命上限',15)]);
 device('deepwell-charm','深泉纳息佩','增加八点魂力容量和一点悟性，并抵抗水伤；扩容不自动恢复魂力。','深蓝石佩像一口小井，井缘银线向内盘绕。','necklace','饰品',[T('魂力上限',8),R('水','抗性',0)],{悟性:1});
 device('moonstep-boots','照月巡踪靴','移动区和感知各加一，并抵抗光伤；巡踪仍需要正式感知检定。','墨蓝短靴有月牙银扣，鞋底嵌着极浅的星纹。','boots','饰品',[T('移动区',1),R('光','抗性',0)],{感知:1});
 device('thunder-gloves','鎏纹格斗手套','普通攻击伤害加二、物理防御加一，护拳的厚甲兼顾击打与格挡。','黑铁手套内有软革衬垫，鎏蓝护纹绕过指节，两侧宽甲便于格挡。','gloves','手套',[T('普通攻击伤害',2),T('物理防御',1)]);
 activeDevice('arc-launcher','玄弧魂导枪','消耗三魂力和一耐久发射金属性短弧，和仅加普通攻击的木杖形成不同用途。','单手短枪前端金属弧叉抱住窄晶芯，扳机前有护环，弧内亮起金线。','soul-gun','武器',h.shot([D('金',1,6,1)]),3,1,{templateId:'device-arc-launcher',maxDurability:72});
 activeDevice('penetrator','玄钢破阵炮','双手稳定炮身后投射物理伤害和一档穿透，每次支付四魂力和一耐久。','厚重短炮有双手握柄和宽炮口，两排玄钢回路沿炮筒收束。','soul-cannon','武器',h.shot([['payload.damage',{类型:'物理',骰数:2,骰面:6,加值:1,穿透档:1}]]),4,1,{templateId:'device-penetrator-cannon',maxDurability:56});
 activeDevice('tide-projector','潮弧魂导枪','投射水属性短束，魂力与器具耐久共同付款；水束不额外携带未定价控制。','铜银短枪有单手握柄和潮纹晶环，窄枪口收着浅蓝光束。','soul-gun','武器',h.shot([D('水',1,8,2)]),4,1);
 device('bind-projector','韧丝护腕','力量提高一点并强化木伤百分之五，韧丝只提供实际属性支撑，不伪装成自动拘束技能。','青木腕环里编着银灰韧丝，环背贴着一枚小叶晶。','bracelet','饰品',[E('木',5)],{力量:1});
 device('guard-lantern','守灯魂导护腕','开战提供十八点护盾并提高魂技防御一档，盾用尽后不自行填满。','腕甲上的灯形黄玉窗围着一圈薄回路，窗内暖光集中在身前。','bracer','防具',[T('开战护盾',18),T('魂技防御',1)]);
 device('clear-pulse','清脉玉佩','佩戴后生命上限增加10点，并获得毒蚀抗性。','椭圆玉佩镜缘刻着叶脉，清光在浅绿石芯里缓慢转动。','pendant','饰品',[T('生命上限',10),R('毒蚀','抗性',0)]);
 device('mist-dispenser','暮烟护目镜','感知提高一点并抵抗精神伤害，镜片没有未经计价的制造雾区能力。','暗银镜框托着浅紫晶片，片缘有一圈短短的防护纹。','crown','饰品',[R('精神','抗性',0)],{感知:1});
 device('marking-sight','定星准镜','魂技攻击命中与感知各加一，并抵抗精神伤害；瞄准辅助不能探明未知目标。','折叠晶镜后有细小星槽，镜面留着一枚收窄的蓝星。','crown','饰品',[T('魂技攻击命中',1),R('精神','抗性',0)],{感知:1});
 activeDevice('silence-chime','念弦魂导铃','接触后尝试一档言语域精神控制，五分钟同场有效；控制解除即失去来源权限。','银蓝小铃内固定着薄晶片，铃缘魂纹像一圈收窄的琴弦。','pendant','饰品',h.save([['status.mind_control',{强度:1,命令域:'言语',控制距离:'同场',持续方式:'世界分钟',持续分钟:5,来源依赖:'道具有效'}]],'意志','release.touch'),3,1,{requirements:['gesture','contact'],deviceCategory:'辅助'});
 activeDevice('soul-suppressor','锁脉魂导扣','接触后仅限制魂力容量至五成，持续五分钟并依赖器具有效来源。','黑铜小扣内侧三道回路围着浅灰晶点，闭合时纹路首尾相连。','bracelet','饰品',h.save([['status.power_seal',{封印对象:'精细',限制:{soulPowerPercent:50},持续方式:'世界分钟',持续分钟:5,来源依赖:'道具有效'}]],'意志','release.touch'),5,1,{requirements:['gesture','contact'],deviceCategory:'辅助'});
 function hidden(id,name,description,appearance,nodes,options={}){const specs=[['release.projectile',{距离区:options.range??3}],[options.target??'target.single',{阵营规则:'敌方',...(options.targetParams??{})}],['check.physical_attack',{命中加值:options.hit??0}],...nodes];ENTRIES.push(h.entry('暗器',id,name,description,appearance,{templateId:id,effectSpecs:specs,requirements:['gesture'],soulPowerCost:0,cooldownTurns:0,subtype:'一次性暗器'}, {...options,sourceNote:'项目唐门登记工坊原创款式；不是按名称臆造的原著秘器。',tags:['一次性','唐门登记工坊']}));}
 hidden('tang-qingfeng','清锋针','一份细针提高命中三点，命中后造成一骰四面物理伤害。','青钢细针三枚收在同一蜡纸格内，针尖映着一线淡青光。',[D('物理',1,4)],{hit:3});
 hidden('tang-yanwei','燕尾镖','较远投射造成一骰六面加二物理伤害，一次消耗整份镖。','燕尾镖的两片短翼向后折起，镖腹有一条稳重的铅线。',[D('物理',1,6,2)],{range:4});
 hidden('tang-zhuiji','锥脊钉','钉入甲缝造成小额物伤并降低护甲两回合。','短钉脊背有细密锥齿，钉尖外包一层薄蜡。',[D('物理',1,4),['status.armor_break',{数值:1,持续回合:2}]]);
 hidden('tang-biwei','碧尾针','命中后造成小额物伤并附两回合毒素，毒伤不当作即时全部爆发。','碧尾细针针根有一粒毒绿小封珠，蜡纸上有醒目毒记。',[D('物理',1,4),['status.poison',{骰数:1,骰面:4,持续回合:2}]]);
 hidden('tang-ningshuang','凝霜镖','冰伤与一级减速共同牵制，无法自动冻结全部动作。','乳白飞镖两翼薄如冰片，镖心是一颗浅蓝晶粒。',[D('冰',1,4),['status.slow',{数值:1,持续回合:2}]]);
 hidden('tang-zhenyu','震羽飞锥','一骰六面物伤后尝试击退一格，实际站位决定可移动落点。','重心靠前的黑钢飞锥有两片短银尾羽。',[D('物理',1,6),['move.knockback',{距离区:1}]]);
 hidden('tang-chanzhi','缠枝针囊','近距投出细丝造成一回合普通束缚，力量检定可以挣脱。','扁平针囊里绕着几圈韧丝，囊口两枚银针交叉合扣。',[['status.bind',{持续回合:1,挣脱属性:'力量'}]],{range:2});
 hidden('tang-zhelei','蛰雷针','雷伤并积累一层麻痹，三层阈值前不会直接眩晕。','细针中段嵌着蓝紫雷晶粉，尾端铜线绕成短节。',[D('雷',1,4),['status.paralysis',{层数:1,阈值:3,持续回合:2}]]);
 hidden('tang-shikai','蚀铠散珠','小额物伤后令目标两回合物理易伤，保护和抵抗正常检查。','灰黑散珠表面有环形蚀纹，整份封在一只短纸筒中。',[D('物理',1,4),R('物理','易伤',2)]);
 hidden('tang-yindu','引毒梅针','毒蚀直伤后附毒蚀易伤，为后续毒系攻击创造有限窗口。','梅花形尾片托着一根黑针，针身有短短一段暗绿纹。',[D('毒蚀',1,4),R('毒蚀','易伤',2)]);
 hidden('tang-chuanlin','穿林双梭','沿直线攻击最多两人，一份双梭一次耗尽，目标独立判定命中。','两枚棱形银梭叠在长盒内，梭尾都系着短青丝。',[D('物理',1,6)],{target:'target.line',targetParams:{最大目标:2}});
 hidden('tang-sanxing','散星针囊','近距锥形攻击最多三人，一份针囊整体结算。','半圆小囊分出三排星状针槽，外皮带着旧黑布纹。',[D('物理',1,4)],{range:1,target:'target.cone',targetParams:{距离区:1,最大目标:3}});

 // Canon names and visible forms; battle values use this game's finite-use item contract.
 function canonHidden(id,name,appearance,nodes,options={}){
  const specs=[['release.projectile',{距离区:options.range??3}],[options.target??'target.single',{阵营规则:'敌方',...(options.targetParams??{})}],['check.physical_attack',{命中加值:options.hit??0}],...nodes];
  ENTRIES.push(h.entry('暗器','tang-canon-'+id,name,options.description,appearance,{templateId:'tang-canon-'+id,effectSpecs:specs,requirements:['gesture'],soulPowerCost:0,cooldownTurns:0,subtype:'原著暗器击发份'},
   {canonName:name,reference:'https://www.37.com/dldl/xinwen/20160629-37/',sourceNote:'名称与外观参照斗罗大陆原著暗器及授权资料；游戏按一次完整投射或击发用量制作和消耗一份，数值、命中、范围与伤害均以本项目合同结算。',tags:['原著暗器','一次击发用量']}));
 }
 canonHidden('sleeve-arrow','无声袖箭','深色袖筒以铜饰收边，短箭收在腕侧，外壳有细密云纹。',[D('物理',1,6,2)],{hit:1,description:'藏于袖侧的机括箭具，近中距离投射。一次消耗一份完整击发用量，命中后造成1d6+2物理伤害。'});
 canonHidden('boot-blade','靴间飞刃','两枚银灰短刃贴着靴侧收拢，尾部配有深蓝革质固定片。',[D('物理',1,4,2)],{range:1,hit:1,description:'藏在靴侧的短刃，适合近距离突袭。一次消耗一份，命中后造成1d4+2物理伤害。'});
 canonHidden('dragon-whisker','龙须针','金色细丝凝成纤细长针，针身微卷，旁侧留着发晶般的金光。',[D('物理',1,4,2),['status.bind',{持续回合:2,挣脱属性:'力量'}]],{hit:2,description:'金色细针命中后卷曲牵制目标，造成1d4+2物理伤害并施加2回合可挣脱束缚。一次消耗一份，不追加未结算的永久伤残。'});
 canonHidden('sand-shadow','含沙射影','扁圆铜盒边缘展开细密针孔，深色金属表面有流沙般的细纹。',[D('物理',1,6),['status.poison',{骰数:1,骰面:4,持续回合:2}]],{range:1,target:'target.cone',targetParams:{距离区:1,最大目标:3},description:'近距离扇形散射细针，最多作用3名敌人，各自判定命中，造成1d6物理伤害并附2回合毒素。一次消耗一份击发用量。'});
 canonHidden('zhuge-crossbow','诸葛神弩','黑色长匣前端横着短弩臂，铜饰贴合匣身，箭槽有序排列。',[['payload.damage',{类型:'物理',骰数:3,骰面:6,加值:4,穿透档:1}]],{range:4,hit:2,target:'target.line',targetParams:{最大目标:3},description:'匣式机括沿直线齐射，最多攻击3名敌人，命中后造成3d6+4物理伤害并带1档穿透。每次消耗一份已装填的齐射用量。'});
 canonHidden('twin-soul-balls','子母追魂夺命胆','一大一小两枚乌金圆胆互相映照，表面环纹收拢，隐现幽绿光泽。',[D('物理',3,6,4),['status.poison',{骰数:2,骰面:4,持续回合:3}]],{range:3,target:'target.burst',targetParams:{半径区:1,最大目标:5},description:'成对子母胆在落点散开，半径1区内最多作用5名敌人，造成3d6+4物理伤害并附3回合毒素，各目标独立判定。一次消耗一份。'});
 canonHidden('peacock-plume','孔雀翎','青金机括筒外缘展开孔雀翎状饰片，筒口针阵在冷光中泛出五彩。',[['payload.damage',{类型:'物理',骰数:6,骰面:8,加值:12,穿透档:1}]],{range:2,hit:3,target:'target.cone',targetParams:{距离区:2,最大目标:6},description:'机括针阵以孔雀开屏之势覆盖扇形，最多攻击6名敌人，命中后造成6d8+12物理伤害并带1档穿透。一次消耗一份完整击发用量。'});
 canonHidden('rain-pear-needles','暴雨梨花针','银白短筒环着细密梨花纹，针尖如一簇雨线聚拢，外壳泛着冷银光。',[['payload.damage',{类型:'物理',骰数:12,骰面:10,加值:20,穿透档:1}]],{range:4,hit:4,description:'密集银针聚向同一目标，命中后造成12d10+20物理伤害并带1档穿透。一次消耗一份完整击发用量，仍按实际命中、防护和抵抗结算。'});
 canonHidden('buddha-lotus','佛怒唐莲','暗金金属莲花层层收拢，莲心透出赤金微光，花瓣边缘排列精密。',[['payload.damage',{类型:'物理',骰数:12,骰面:12,加值:40,穿透档:1}]],{range:3,hit:3,target:'target.burst',targetParams:{半径区:2,最大目标:10},description:'金属唐莲在落点绽放，半径2区内最多攻击10名敌人，命中后造成12d12+40物理伤害并带1档穿透，各目标分别结算。一次消耗整份唐莲。'});
 function pill(id,name,description,appearance,nodes,options={}){ENTRIES.push(h.entry('丹药',id,name,description,appearance,{templateId:id,effectSpecs:S(nodes),requirements:options.external?['gesture']:['gesture','ingest'],soulPowerCost:0,cooldownTurns:0,subtype:options.external?'外敷药剂':'口服丹药',productPurpose:'beneficial'},options));}
 pill('pill-qingzhi','青芝续络丸','一次恢复二骰六面加四生命，并获得两回合物防加一。','苦绿色芝粉薄壳包着浅褐丹芯，丸面有细小草脉。',[['payload.heal',{骰数:2,骰面:6,加值:4}],B('物理防御',1,2)]);
 pill('pill-mingyu','鸣玉清瘴丸','清除一项毒素并抵抗毒蚀两回合，不能补回已经失去的血。','白玉碎纹沉在淡青丸芯中，瓷瓶上有清瘴药记。',[['payload.cleanse',{类别:'毒素',最大数量:1}],R('毒蚀','抗性',2)]);
 pill('pill-huixi','回息丹','恢复十二点魂力并提高两回合豁免检定，不扩张被封印容量。','薄桂色丸衣上压着一道回旋纹，药芯温润透亮。',[['payload.soul_restore',{数值:12}],B('豁免检定',1,2)]);
 pill('pill-chengxin','澄心丸','两回合灵魂抗性与恐惧抗性，服用者仍自主决定行为。','白榆色小丸装在窄竹筒中，丸面有淡淡银光。',[R('灵魂','抗性',2),['status.status_guard',{防护对象:'status.fear',模式:'抗性',持续回合:2}]]);
 pill('pill-songlu','松露敛血散','外敷恢复一骰四面加一生命并清除一项负面，不能吞服代替包扎。','灰白药粉盛在蜡纸中，纸角折成方便倾倒的短嘴。',[['payload.heal',{骰数:1,骰面:4,加值:1}],['payload.cleanse',{类别:'负面',最大数量:1}]],{external:true});
 pill('pill-lanwen','蓝纹暖脉露','小额生命恢复和两回合冰抗，温暖药力不会永久改变体质。','琥珀药露中浮着两条蓝纹，细颈瓶塞着淡木色软塞。',[['payload.heal',{骰数:1,骰面:6,加值:2}],R('冰','抗性',2)]);
 pill('pill-shalu','砂露护肺丸','清除一项负面并抵抗火伤两回合，适合火尘环境的短时整备。','沙黄丸衣包着淡薄荷药芯，丸面有细砂状亮点。',[['payload.cleanse',{类别:'负面',最大数量:1}],R('火','抗性',2)]);
 pill('pill-luoyan','落雁轻身丸','身法与移动区各提升一点两回合，移动仍需消耗行动。','青褐药丸被包在轻薄纸羽里，表面有浅浅弧纹。',[B('身法',1,2),B('移动区',1,2)]);
 pill('pill-huijin','灰金坚肤膏','外敷提供一骰四面加十二护盾和两回合物防加一，不能当作永久盔甲。','灰金膏盛在扁陶盒中，膏面闪着稀疏矿粉。',[['payload.shield',{骰数:1,骰面:4,加值:12}],B('物理防御',1,2)],{external:true});
 pill('pill-bizhou','碧舟回潮饮','恢复六点魂力并抵抗两回合水伤，药瓶一次饮尽。','浅碧药液装在带旧银圈的小瓶中，瓶口有海盐纹。',[['payload.soul_restore',{数值:6}],R('水','抗性',2)]);
 pill('pill-yingxue','映雪缓生丸','两回合逐次恢复生命并提高体魄，药效不提前发放所有治疗。','白丸银纹不规则地铺开，丸芯像一滴未化的雪水。',[['status.regeneration',{骰数:1,骰面:4,持续回合:2}],B('体魄',1,2)]);
 pill('pill-zhumeng','竹梦定心丸','睡眠和恐惧抗性维持两回合，不赋予对外精神控制。','青色药衣压着竹节纹，窄竹盒内衬一层温白纸。',[['status.status_guard',{防护对象:'status.sleep',模式:'抗性',持续回合:2}],['status.status_guard',{防护对象:'status.fear',模式:'抗性',持续回合:2}]]);
 function poison(id,name,description,appearance,nodes,route='oral',options={}){const medicine={version:1,form:route==='oral'?'丸':route==='contact'?'液':'雾',route,doses:1,sourceDurationMinutes:route==='oral'?0:5,sourceRadius:route==='inhaled'?10:0};ENTRIES.push(h.entry('毒药',id,name,description,appearance,{templateId:id.startsWith('pill-')?id:`preset-item-${id}`,effectSpecs:[['release.touch',{}],['target.single',{阵营规则:'任意'}],['check.save',{属性:options.saveAttribute??'体魄',难度加值:0,成功效果:'无'}],...nodes],medicine,requirements:route==='oral'?['gesture','ingest']:['gesture'],soulPowerCost:0,cooldownTurns:0,subtype:'有害药剂',productPurpose:'harmful'},{...options,tags:['有害',route==='oral'?'实际吞服':route==='contact'?'接触暴露':'吸入暴露'],sourceNote:'毒药只在真实吞服、接触或吸入成立后施效；命中、抵抗、免疫与有限剂量全部保留。'}));}
 const minutes=(n=10)=>({持续方式:'世界分钟',持续分钟:n,来源依赖:'独立'});
 poison('pill-suoyuan','禁灵丹','吞服抵抗失败后封禁约七成魂力容量十五分钟，未开放的容量仍不可使用。','铅灰丹丸缠着暗金细纹，封蜡上压有药匠的毒丹印记。',[['status.power_seal',{...minutes(15),封印对象:'精细',限制:{soulPowerPercent:30}}]],'oral',{saveAttribute:'意志'});
 poison('pill-guinian','惑心丹','吞服抵抗失败后形成一档物品域精神控制，十分钟同场有效，不永久改写关系。','乌紫丹丸上有断续银斑，短瓷瓶外绑着清楚的毒记。',[['status.mind_control',{...minutes(10),强度:1,命令域:'物品',控制距离:'同场'}]],'oral',{saveAttribute:'意志'});
 poison('pill-ningpo','摄魂丹','二档战斗域灵魂控制维持三十分钟，灵魂和精神抗性分别判断。','墨黑丹丸中隐着冷白细纹，重蜡封口留有银灰毒印。',[['status.soul_control',{...minutes(30),强度:2,命令域:'战斗',控制距离:'同场'}]],'oral',{saveAttribute:'意志',minimumYears:10000});
 poison('soft-sinew','酥筋散','实际接触后力量降低一点并减速一级，效果十分钟；不会凭叙述自动下毒成功。','淡黄药液在细陶管内摇动，管口蜡封带有双筋形毒印。',[['status.buff',{...minutes(),属性:'力量',数值:-1}],['status.slow',{...minutes(),数值:1}]],'contact');
 poison('heavy-step','沉步露','接触后身法降低两点并减速一级，服药外观不能代替实际暴露。','灰蓝浓露挂在小瓶壁上，瓶底留着一圈细砂。',[['status.buff',{...minutes(),属性:'身法',数值:-2}],['status.slow',{...minutes(),数值:1}]],'contact');
 poison('mute-seed','缄声丸','吞服后禁声十分钟并削弱感知，不能阻止所有无声行动。','哑白丸面有黑色断环，纸封角上印着喉形毒记。',[['status.mute',minutes()],['status.buff',{...minutes(),属性:'感知',数值:-1}]]);
 poison('blind-mist','迷目烟','实际吸入雾区后致盲五分钟并削弱感知，雾区消散和已中负面分开计时。','灰紫雾药封在短喷瓶内，瓶嘴外有一圈防漏细网。',[['status.blind',minutes(5)],['status.buff',{...minutes(5),属性:'感知',数值:-2}]],'inhaled');
 poison('sleep-pollen','酣梦雾','实际吸入后尝试睡眠五分钟，受伤唤醒与普通解除规则继续有效。','浅蓝药雾像细粉一样沉在玻璃短筒底部。',[['status.sleep',minutes(5)],['status.slow',{...minutes(5),数值:1}]],'inhaled',{saveAttribute:'意志'});
 poison('frail-blood','薄血丹','吞服后体魄降低两点并对物理易伤十分钟，容量下降按正常资源限制执行。','暗红小丸有一圈苍白药膜，瓶上画着两道断开的血纹。',[['status.buff',{...minutes(),属性:'体魄',数值:-2}],['status.resistance_shift',{...minutes(),类型:'物理',模式:'易伤'}]]);
 poison('desire-ember','绮焰露','接触后一级欲火维持十分钟并削弱悟性，自控失败限制专注，不替人物执行冲动。','紫红药液内有金色细沉点，窄瓶蜡封刻着醒目的心焰毒记。',[['status.desire',{...minutes(),强度:1}],['status.buff',{...minutes(),属性:'悟性',数值:-1}]],'contact',{saveAttribute:'意志'});
 poison('soul-frost','凝魄霜','接触后意志降低两点并灵魂易伤十分钟，精神抗性不冒充灵魂防護。','冷白药液带着细灰晶粉，玻璃瓶被黑布包住大半。',[['status.buff',{...minutes(),属性:'意志',数值:-2}],['status.resistance_shift',{...minutes(),类型:'灵魂',模式:'易伤'}]],'contact',{saveAttribute:'意志'});
 poison('leaden-cloud','铅息烟','吸入后减速两级并力量降低一点五分钟，外部雾源仅有一剂真实容量。','铅灰药雾沉在铜制小罐里，罐缘有窄窄的黄铜喷口。',[['status.slow',{...minutes(5),数值:2}],['status.buff',{...minutes(5),属性:'力量',数值:-1}]],'inhaled');
 const restraints=[
 ['restraint-ankles','短链足铐','限制双腿和行走，锁具按原始挣脱强度执行。','两只黑铁足环之间接着一截短粗链。'],
 ['restraint-sinking-wrists','沉星腕环','保留原腕部拘束、力量削弱等已登记负担，不把削弱重复当作额外封印。','暗银腕环外缘嵌着四点沉黑星石。'],
 ['restraint-quicksand-ankles','流沙足环','保留原双腿拘束与减速合同，移动受真实状态限制。','沙金足环内侧封着会缓慢流动的浅灰晶砂。'],
 ['restraint-tether','扣腕牵绳','扣腕与牵绳保留原押送使用方式，绳具不自动改写控制关系。','软韧绳尾连着两只小铁腕扣，结头打磨得很平。'],
 ['restraint-net','钢环束网','全身网具的限制与解除继续按实际器械合同执行。','钢环与韧线编成可收拢的粗网，四角有厚布握片。'],
 ['rope','十米麻绳','保留真实捆缚、调整部位与押送规则，不当作只有文字的装饰工具。','粗麻绞股夹着韧丝，绳头平整，卷绳外绕着旧布带。'],
 ['restraint-cuffs','玄铁拘束铐','双手拘束阻止手势，挣脱、拆除与同意装配按正式规则执行。','厚重玄铁双铐用短铰链相连，内缘打磨光滑。'],
 ['restraint-gag','禁声束具','限制发声与吞服，移动和其他能力仍按对应真实限制判断。','短锁扣藏在束带颊侧，内垫柔软，外扣坚实。'],
 ['restraint-seal-collar','禁魂项圈','保留原魂力和能力封禁档位、适用等级及挣脱规则，精修名称与视觉不改变机制。','深黑项圈内缘光滑，外缘金属封魂纹厚实连续，锁芯泛出暗金细光。'],
 ['restraint-seal-platform','封神台式囚锁','保留原全身与能力限制合同，区分真实封神台活体静滞器的独立机制。','沉黑分层囚锁上有交错回路，主环两侧伸出短锁臂。']];
 for(const [templateId,name,description,appearance]of restraints)ENTRIES.push(h.entry('拘束器',`restraint-${templateId}`,name,description,appearance,{templateId,registeredTemplate:true},{artId:templateId==='restraint-seal-collar'?'preset.soul-sealing-collar':`preset-${templateId}`,artPath:templateId==='restraint-seal-collar'?'/art/presets-v26/soul-sealing-collar.webp':null,tags:['原机制保留']}));
 return Object.freeze({ENTRIES});
});
