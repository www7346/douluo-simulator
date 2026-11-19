(function(root,factory){if(typeof module!=='undefined'&&module.exports)module.exports=factory;if(root)root.SoulMengYiranContent=factory;})(typeof globalThis!=='undefined'?globalThis:this,function(h){
 'use strict';
 const {profile,E}=h,art='/art/meng-yiran-wuzhu/';
 const one=(range,faction,...nodes)=>[E('release.projectile',{距离区:range}),E('target.single',{阵营规则:faction,选择模式:'主目标'}),...nodes];
 const will=(dc=0)=>E('check.save',{属性:'意志',难度加值:dc,成功效果:'伤害减半'});
 const fixed=(id,p,fee)=>E(id,{...p,定额发动:true,发动魂力:fee});
 const damage=(dice,faces,add,fee)=>fixed('payload.damage',{类型:'精神',骰数:dice,骰面:faces,加值:add},fee);
 const buff=(attribute,value,turns)=>E('status.buff',{属性:attribute,数值:value,持续回合:turns});
 const group=(range,...nodes)=>[E('release.projectile',{距离区:range}),E('target.allies',{距离区:range,阵营规则:'友方'}),...nodes];
 const amp=(metric,value,extra={})=>E('status.amplify',{指标:metric,数值:value,作用范围:'同源武魂',持续方式:'来源维持',...extra});
 const rite=(dice,add,max,penalty,turns,fee)=>[E('release.projectile',{距离区:3}),E('target.burst',{半径区:2,最大目标:max,阵营规则:'敌方',选择模式:'全部合法'}),will(2),damage(dice,10,add,fee),buff('攻击检定',-penalty,turns)];
 const rows=[
  ['蛇信厄言','巫咒','蛇信入魄','杖首银蛇微张蛇吻，铜铃随杖尖轻轻一振。幽紫咒音绕过兵刃直抵心神，凝聚的攻势随一圈圈余音散乱。','3区单敌，2d6+4精神伤害；意志抵抗成功半伤，失败另攻击检定−1，持续目标2次行动。8魂力，冷却1回合。','enemy',one(3,'敌方',will(),damage(2,6,4,8),buff('攻击检定',-1,2))],
  ['盘蛇缚影','灵蛇','盘影锁步','孟依然转腕压下杖尖，脚边蛇影倏然伸长，盘住对手的腰腿与持械手臂。收紧的魂鳞间渗出碧色毒息，迫使敌人在挣脱与迎战之间作出选择。','3区单敌，力量抵抗失败则束缚2次行动，可用行动挣脱；同时中毒，每次行动开始1d4毒伤，共2次。成功免除全部效果。11魂力，冷却2回合。','enemy',one(3,'敌方',E('check.save',{属性:'力量',难度加值:0,成功效果:'无'}),E('status.bind',{持续回合:2,挣脱属性:'力量'}),E('status.poison',{骰数:1,骰面:4,持续回合:2}))],
  ['白鳞接脉','医祝','引毒续脉','蛇口白玉泛起温光，一条细小白蛇沿杖端游向伤者。片片银鳞贴住伤处，浊绿毒息被牵入玉光，柔和的生机随之接上紊乱的气息。','3区单友或自己，清除1项毒素，恢复2d8+6生命，另计悟性。12魂力，冷却2回合。','ally',one(3,'友方',fixed('payload.cleanse',{类别:'毒素',最大数量:1},12),E('payload.heal',{骰数:2,骰面:8,加值:6}))],
  ['巫纹护身','医祝','银鳞承厄','杖身巫纹依次亮起，银蛇衔玉绕出数道金白光环。光环落向选定同伴，细鳞结为弧面护盾，清稳铃音仍留在耳畔，护住出手时的心神。','3区自选同伴，每人2d8+10护盾、意志+2，均持续本人2次行动。每人7魂力，冷却2回合。','ally',[E('release.projectile',{距离区:3}),E('target.allies',{距离区:3,阵营规则:'友方',每目标魂力:7}),E('payload.shield',{骰数:2,骰面:8,加值:10,护盾回合:2}),buff('意志',2,2)]],
  ['蚀魄烛蛇','巫咒','烛影蚀甲','幽紫魂火沿银鳞无声燃起，凝成一条张口前掠的烛蛇。蛇影穿过护身魂光，细密裂纹自接触处蔓延，余焰仍在目标的魂力防线间游动。','4区单敌，意志抵抗难度+1，5d8+16精神伤害；成功半伤，失败另魂技防御−2，持续目标2次行动。22魂力，冷却3回合。','enemy',one(4,'敌方',will(1),damage(5,8,16,22),buff('魂技防御',-2,2))],
  ['灵蛇祝坛','医祝','立杖成坛','孟依然顿杖立仪，金白蛇纹沿地面盘成一座光坛。细小白蛇循着阵纹游向同伴，行动前为伤处接续生机；低回的铜铃声稳住众人，令迎面而来的侵扰更难得逞。','原地固定半径1区巫坛：选定同伴豁免检定+1，本人每次行动开始恢复1d8+8生命。每人启动5、每回合3，共占用8魂力；离坛解除并减费，结束后冷却2回合。','ally',group(1,E('domain.field',{半径区:1,持续回合:1,跟随施术者:false,领域强度:1,触发时机:'回合开始',阵营规则:'友方',持续方式:'来源维持'}),E('payload.heal',{骰数:1,骰面:8,加值:8,附加悟性:false,领域触发:'回合开始',领域阵营:'友方'}),E('status.buff',{属性:'豁免检定',数值:1,持续回合:2,领域阵营:'友方'}),E('sustain.maintain',{锁定魂力:8,每回合魂力:3,计费方式:'逐目标',启动魂力:5,维持距离区:1,定额发动:true,发动魂力:5,冷却起点:'结束'}))],
  ['灵蛇巫祝真身','巫咒','银蛇临仪','杖首银蛇昂起，庞大的灵蛇虚影自孟依然身后盘旋而上。幽紫咒轮与玉白祝纹沿鳞脊交替流转，蛇杖每一次点落，都引来更凝练的咒力与护生灵光。','持续真身：同源精神伤害+40%、治疗与持续恢复+30%、护盾+30%、抵抗难度+2，自身双防+2。启动20、每回合5、占用12魂力，每场一次。','self',[E('target.self'),fixed('transform.martial_avatar',{持续方式:'本场战斗',持续回合:2,属性增幅档:0,身心防御加值:2,基础动作增幅:0,同源魂技增幅:0,同源难度加值:2,锁定魂力:12,每回合魂力:5,禁用其他武魂:true,冷却起点:'结束'},20),amp('属性伤害',40,{伤害属性:'精神'}),amp('治疗',30),amp('护盾',30),E('sustain.maintain',{锁定魂力:0,每回合魂力:0})]],
  ['蜕鳞护命','医祝','灵蜕承生','一层透亮灵蜕从蛇杖上舒展开来，轻轻裹住伤者。缠身浊息被玉光剥离，温润生机沿伤处流入；舒展的白金鳞片又在身外合拢，替尚未稳住气息的人承下后续冲击。','4区单友或自己，净化最多2项可驱散负面，恢复4d10+20生命（另计悟性），获得3d8+12护盾、持续本人2次行动。30魂力，冷却4回合。','ally',one(4,'友方',fixed('payload.cleanse',{类别:'负面',最大数量:2},30),E('payload.heal',{骰数:4,骰面:10,加值:20}),E('payload.shield',{骰数:3,骰面:8,加值:12,护盾回合:2}))],
  ['天蛇降仪','巫咒','天蛇镇厄','孟依然凝神举杖引铃，低声诵咒，天蛇图腾在敌阵上方缓缓显形。巨大的咒轮随蛇影压下，幽紫涟漪穿过层层兵刃；心神失守者攻势散乱，举起的锋芒在余咒中迟迟难以凝聚。','3区落点半径2区、最多8敌，意志抵抗难度+2；6d10+24精神伤害，成功半伤，失败另攻击检定−3、持续目标3次行动。42魂力，需凝神吟咒，每场一次。','enemy',rite(6,24,8,3,3,42)]
 ];
 const p=profile('witch-serpent-staff','蛇杖',['meng-yiran'],'墨玉蛇杖以巫纹传咒、以铃声祈祝：咒蛇扰敌心神，盘影缚住进退，白鳞引毒扶伤。九环渐成，立杖可成护生之坛，举杖可降镇厄之仪。','墨玉长杖顶端盘着银鳞灵蛇，蛇口衔一枚乳白玉珠，杖身嵌有细金巫纹，颈下垂着两枚小铜铃。','巫祝控制与医疗援护',['staff','serpent'],[['mind',4],['life',2],['toxic-corrosion',1],['physical',1]],['melee','projectile','entangle','poison','buff','heal','cleanse','shield'],{巫咒:'咒音削势，烛蛇破防，天蛇镇厄',灵蛇:'盘影缚敌，杖法周旋',医祝:'白鳞解毒，巫纹护身，立坛续生'},rows,{artPath:art+'martial-soul.webp',artColumns:1,artRows:1,soulArtColumns:1,soulArtRows:1,baseAction:{mode:'melee',powerTier:1,attributeId:'attribute.physical'},years:[423,790,1800,4800,16000,24000,45000,65000,90000],sourceAttributes:['精神','生命','毒蚀','物理'],sourceNames:['铃音咒蛇','缠藤毒蟒','白鳞药蛇','护纹灵蛇','噬魄烛蛇','盘玉灵蟒','玄仪蛇王','蜕玉灵蛇','祭灵天蛇'],sourceNote:'用户确认的孟依然蛇杖巫祝路线；九环名称、魂兽来源与数值均为本游戏设计。',tagline:'蛇信传咒 · 白鳞扶生 · 立杖成坛',combo:'蛇信厄言削弱攻势，盘蛇缚影限制进退；烛蛇破防帮助队友集火，祝坛支持持久战，白鳞与灵蜕救护伤者。天蛇降仪压制敌阵。'});
 const names=['serpent-whisper','coiling-shadow','white-scale-mending','ritual-aegis','soul-devouring-serpent','serpent-blessing-altar','witch-priest-avatar','life-guarding-molt','heavenly-serpent-rite'];
 const cooldowns=[1,2,2,2,3,2,0,4,4];
 p.NODES.forEach((node,i)=>Object.assign(node,{artPath:art+String(i+1).padStart(2,'0')+'-'+names[i]+'.webp',artCell:0,artColumns:1,artRows:1,minimumYears:i===6?10000:i>=2?1000:100,cooldownTurns:cooldowns[i],resourceCosts:[],autoAllocate:false}));
 p.get(7).usageRules={perBattleLimit:1};
 Object.assign(p.get(9),{minimumYears:90000,maximumYears:99999,requirements:['gesture','martial-soul','focus','voice'],usageRules:{perBattleLimit:1},ageVariants:[
  {presetSuffix:'30000',minimumYears:30000,maximumYears:59999,effects:rite(4,16,6,2,2,34),summary:'3万年：半径2区、最多6敌，4d10+16精神伤害，意志抵抗成功半伤；失败攻击检定−2、持续2次行动。34魂力，每场一次。'},
  {presetSuffix:'60000',minimumYears:60000,maximumYears:89999,effects:rite(5,20,8,2,2,38),summary:'6万年：半径2区、最多8敌，5d10+20精神伤害，意志抵抗成功半伤；失败攻击检定−2、持续2次行动。38魂力，每场一次。'}]});
 p.sources=Object.fromEntries(p.NODES.map(node=>[node.ordinal,{类别标签:['蛇类'],种族特征:['精神','生命','毒液','长体','鳞甲','守护','净化','增幅','近战打击','远程投射','缠绕拘束','毒蚀传递','属性增幅','生命治疗','净化驱散','护盾守护','引导','能量','蛇','缠绕',...(node.ordinal===6?['领域','再生']:[]),...(node.ordinal===7?['本源','真身']:[]),...(node.ordinal===9?['威压','范围']:[])],解剖标签:['鸣囊','鳞甲','毒囊','长体'],属性偏向:{力量:2,身法:3,体魄:4,悟性:5,感知:4,意志:5}}]));
});
