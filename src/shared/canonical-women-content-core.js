(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulCanonicalWomenContent=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),PROFILES=[];let BEASTS=[];
 const E=(id,p={})=>[id,p],self=(...v)=>[E('target.self'),...v];
 const enemy=(...v)=>[E('release.projectile',{距离区:3}),E('target.single',{阵营规则:'敌方'}),E('check.soul_attack'),...v];
 const melee=(...v)=>[E('release.melee'),E('target.single',{阵营规则:'敌方'}),E('check.physical_attack'),...v];
 const save=(attr,...v)=>[E('release.projectile',{距离区:2}),E('target.single',{阵营规则:'敌方'}),E('check.save',{属性:attr,难度加值:0,成功效果:'无'}),...v];
 const area=(attr,...v)=>[E('release.projectile',{距离区:1}),E('target.burst',{半径区:0,最大目标:2,阵营规则:'敌方'}),E('check.save',{属性:attr,难度加值:0,成功效果:'无'}),...v];
 const ally=(...v)=>[E('release.projectile',{距离区:2}),E('target.cluster',{最大目标:2,阵营规则:'友方',选择模式:'自动最低生命'}),...v];
 const oneAlly=(...v)=>[E('release.projectile',{距离区:2}),E('target.single',{阵营规则:'友方',选择模式:'自动最低生命'}),...v];
 const dmg=(type,n=1,s=6,a=0)=>E('payload.damage',{类型:type,骰数:n,骰面:s,加值:a});
 const buff=(attr,n=1,t=2)=>E('status.buff',{属性:attr,数值:n,持续回合:t});
 const poison=(n=1,t=2)=>E('status.poison',{持续回合:t,骰数:n,骰面:4});
 const bind=(t=2)=>E('status.bind',{持续回合:t,挣脱属性:'力量'});
 const slow=(n=1,t=2)=>E('status.slow',{数值:n,持续回合:t});
 const shield=(n=1)=>E('payload.shield',{骰数:n,骰面:6,加值:2});
 const heal=(n=1)=>E('payload.heal',{骰数:n,骰面:8,加值:2});
 const regen=(n=1,t=2)=>E('status.regeneration',{持续回合:t,骰数:n,骰面:4,加值:0});
 const avatar=(name)=>[name,'真身','本源贯通','武魂的本源形态凝实，魂纹随呼吸亮起。维持真身时，同源魂技得到强化，魂力也随之持续消耗。','开启真身，强化同源魂技与防御。','self',self(E('transform.martial_avatar',{持续回合:2,属性增幅档:1,身心防御加值:1,基础动作增幅:0,同源魂技增幅:1,锁定魂力:8,每回合魂力:2,禁用其他武魂:true}))];
 const field=(payload,faction='友方')=>self(E('domain.field',{半径区:1,持续回合:2,跟随施术者:true,领域强度:1,触发时机:'回合开始',阵营规则:faction}),E(payload[0],{...payload[1],领域阵营:faction}));
 // Rows are authored compositions of public effects. No executor or free authority lives here.
 function profile(id,name,recordIds,description,appearance,role,categories,attributes,channels,branches,rows,options={}){
  // Initial expression and later ring growth remain separately priced. Ordinary
  // species do not buy a free high-order channel merely because a future node exists.
  const adjust={
   'blue-silver-emperor':{remove:['regeneration'],add:['shield']},
   'canonical-snake':{remove:['transform']},
   'soft-bone-rabbit':{attributes:{space:2}},
   'serpent-staff':{remove:['burst']},
   'jade-phosphor-snake':{remove:['burst','transform']},
   'fox-spirit':{add:['paralyze']},
   'needle-tailed-swift':{remove:['transform'],add:['projectile','burst']},
   'nine-treasure-tower':{remove:['reflection'],add:['counter']},
   'healing-scepter':{remove:['regeneration','domain']},
   'jade-dolphin':{attributes:{water:4},remove:['transform','burst']},
   'snow-dance':{remove:['transform','domain'],add:['entangle']},
   'ice-phoenix':{attributes:{ice:6,wind:1},remove:['transform','movement'],add:['entangle']},
   'death-spider-empress':{attributes:{'toxic-corrosion':5,death:3},remove:['burst'],add:['heal']},
   'soul-devouring-spider-empress':{attributes:{death:4,mind:3},remove:['burst']},
   'spirit-kite':{remove:['transform','burst']},
   'sea-snake':{remove:['transform','burst']},
   'sea-god':{attributes:{water:4,light:5}}
  }[id]??{};
  channels=[...new Set([...channels.filter(c=>!adjust.remove?.includes(c)),...(adjust.add??[])])];attributes=attributes.map(([a,v])=>[a,adjust.attributes?.[a]??v]);if(id==='soul-devouring-spider-empress')attributes.push(['space',2]);if(id==='death-spider-empress')attributes.push(['life',2]);
  const soulId='preset:'+id,artPath=options.artPath??('/art/canonical-women-v1/'+id+'.webp');
  const draft={name,concept:description,form:appearance,role,attributeVersion:3,categories:categories.map(x=>'category.'+x),attributes:attributes.map(([id,investment])=>({id:'attribute.'+id,investment})),channels:channels.map(x=>'channel.'+x),traits:options.traits??[],weaknesses:[],exchangeContracts:[],baseAction:options.baseAction??{mode:options.mode??'ranged',powerTier:options.powerTier??0,attributeId:'attribute.'+attributes[0][0]},playerConfirmed:true};
  const SOUL={id:soulId,name,description,appearance,draft,artId:'preset.soul.'+id,artPath};
  const NODES=rows.map(([name,branch,subtitle,description,summary,targetPolicy,effects],i)=>({id:id+'-'+(i+1),ordinal:i+1,name,branch:Object.hasOwn(branches,branch)?branch:Object.keys(branches).at(-1),subtitle,description,summary,targetPolicy,effects,artId:'skill.canonical-women.'+id+'.'+(i+1),artPath:options.skillArtPath??artPath,artCell:options.skillArtPath?i:i+1,minimumYears:effects.some(([id])=>id==='transform.martial_avatar')?10000:effects.some(([id])=>['move.teleport','status.invisibility','status.regeneration','domain.field','status.invulnerable','summon.entity','status.eternal_wound'].includes(id))?1000:i>1?1000:1,presetId:`canonical:${options.presetNamespace??recordIds[0]}:1:${i+1}`,sourceNote:options.sourceNote??'沿用原著武魂与已知招式名称；未详述的环位、来源、组合和数值由本游戏设计。'}));
  const isRecord=id=>recordIds.includes(id),isSoul=soul=>{const d=soul?.扩展?.expressionBase?.definition??soul?.扩展?.结构化武魂?.definition??soul?.definition??{},binding=soul?.扩展?.canonicalGrowth;return soul?.presetId===soulId||d.presetId===soulId||(binding?.mode==='martial-preset'&&binding.presetId===soulId)||!!(binding&&isRecord(binding.recordId)&&binding.slot===(options.slot??1)&&['canonical','projection'].includes(binding.mode));};
  const matches=(node,skill)=>{const actual=skill?.effectGraph?.nodes??skill?.效果图?.nodes??[];return [node,...(node.ageVariants??[])].some(variant=>actual.length===variant.effects.length&&variant.effects.every(([id,p],i)=>actual[i]?.effectId===id&&Object.entries(p).every(([key,value])=>typeof value==='number'?typeof actual[i].params?.[key]==='number'&&(value<0?actual[i].params[key]<=value:actual[i].params[key]>=value):typeof value==='object'?JSON.stringify(actual[i].params?.[key])===JSON.stringify(value):actual[i].params?.[key]===value)));};
  const ownsPreset=(node,skill)=>(options.presetNamespace?[options.presetNamespace]:recordIds).some(id=>[node,...(node.ageVariants??[])].some(v=>skill?.presetId===`canonical:${id}:${options.slot??1}:${node.ordinal}${v.presetSuffix?':'+v.presetSuffix:''}`));
  const content={SOUL,NODES,recordIds,slot:options.slot??1,isRecord,isSoul,matches,ownsPreset,get:ordinal=>NODES.find(n=>n.ordinal===ordinal),TREE:{tagline:options.tagline??Object.keys(branches).join(' · '),description:options.combo??description,note:'已获魂环由实际经历决定；这里展示可追寻的传承方向。',branches},...options};PROFILES.push(content);return content;
 }
 /* Control, close combat and scouting. Exact novel names are retained where known;
    the remaining complete route is explicitly this game's authored continuation. */
 profile('blue-silver-emperor','蓝银皇',['ah-yin-human'],
  '蓝金草脉连成坚韧的根网，以缠绕守住战线，以生机照拂同伴。草叶受损后仍会抽生新芽，根网与护持相互延续。','蓝金长草层叠成冠，叶心透亮，细根与金色叶脉相接。','控制护生',['vine'],[['wood',4],['life',6]],['entangle','projectile','heal','buff','transform','burst','domain','regeneration'],{根网:'缠束与牵制',生机:'救护与再生',真身:'根网与群落相连'},[
  ['蓝银缠绕','根网','草脉结索','蓝金草叶贴地急长，交错缠向对手的四肢。绷紧的叶脉限制移动，目标仍可凭力量挣脱。','远程缠绕单个敌人。','enemy',save('力量',bind(2))],
  ['蓝银寄生','根网','新芽潜伏','细小草种顺着叶索落下，在对手身周抽出新根。根丝勒紧关节，刺入的叶缘带来木属性伤害。','命中后造成木伤并缠绕。','enemy',enemy(dmg('木',1,4),bind(1))],
  ['野火烧不尽，春风吹又生','生机','枯荣续生','草冠低垂，一缕明亮生机落入伤处；裂开的叶片重新舒展，余下的草息逐次修补伤势。','先治疗一名同伴，随后持续恢复。','ally',oneAlly(heal(1),regen(1,2))],
  ['蓝银囚笼','根网','群根合围','蓝金根须从足下破土，在敌人周围交叉成笼。根笼逐一勒紧，被困者须各自挣脱。','范围缠绕敌人。','enemy',area('力量',bind(2))],
  ['蓝银霸王枪','根网','皇叶化枪','草叶沿一点层叠压实，凝成蓝金长枪。枪锋越过根网直刺远敌，金色叶脉在撞击时骤亮。','远程木属性攻击。','enemy',enemy(dmg('木',2,8,3))],
  ['万叶归生','生机','根脉回护','根网吸纳四周生息，万片草叶将柔光送向并肩之人。微小伤口依次闭合，风中只余清新的草香。','为附近同伴提供持续治疗。','ally',ally(regen(2,3))],avatar('蓝银皇真身'),
  ['皇藤护阵','生机','金脉承锋','粗韧皇藤在同伴身侧盘旋，蓝金叶片一层层朝外展开。受击时藤叶折断，内侧仍保有柔和生息。','为同伴提供较强护盾。','ally',ally(shield(3))],
  ['万川归叶','真身','皇脉成庭','蓝金根网随魂师铺开，枝叶在同伴足下轻轻舒展。停留在草庭中的人于每次行动前获得新的生机。','展开随身治疗领域。','self',field(heal(2))]
 ],{mode:'touch',combo:'先以缠绕或囚笼限制移动，再用霸王枪攻击；受压时以护阵承击，草庭和续生接力恢复。'});
 const snakeFee=(id,p,fee)=>E(id,{...p,定额发动:true,发动魂力:fee});
 const snakeStrike=(range,type,dice,faces,add,fee,...extra)=>[E(range?'release.projectile':'release.touch',range?{距离区:range}:{}),E('target.single',{阵营规则:'敌方'}),E('check.soul_attack',{命中加值:2}),snakeFee('payload.damage',{类型:type,骰数:dice,骰面:faces,加值:add},fee),...extra];
 const snake=profile('canonical-snake','银脊蚀骨蛇',['silver-spine-serpent'],'青鳞蛇影随魂力游走，银纹鳞片护住要害。毒牙先破开伤口，碧毒随后侵蚀；蛇信牵制追击，盘鳞为近身缠斗留下转圜。','纤长青碧灵蛇，银缘细鳞沿背脊相扣，翠色竖瞳清亮，双牙悬着碧色毒珠，魂光如薄绸环绕蛇身。','毒系输出与副前排',['serpent'],[['toxic-corrosion',3],['life',2]],['touch','projectile','poison','debuff','buff','step','sustain','transform'],{蛇牙:'破伤注毒与定点爆发',蛇影:'牵制走位与虚实切入',盘鳞:'护身承击与本源真身'},[
  ['青鳞毒牙','蛇牙','银牙注碧','青鳞蛇影从腕间弹起，银亮双牙在魂力牵引下切入破绽。咬击先撕开伤口，细小碧毒随后渗入，在接下来的行动间逐次发作。','近身魂技命中+2，2d6+4物理伤害；命中后每回合1d4毒伤，持续2回合。7魂力，冷却1回合。','enemy',snakeStrike(0,'物理',2,6,4,7,poison(1,2))],
  ['游鳞护身','蛇影','错步避锋','薄薄蛇影贴着足下游过，身形沿它的弧线滑开一步。银纹细鳞随转身合拢在肩背，既能穿过逼近的锋芒，也能承住随后追来的魂光。','立即挪步最多1区，物理防御+2、魂技防御+1，持续3回合。7魂力，冷却3回合。','self',self(snakeFee('move.step',{距离区:1},7),buff('物理防御',2,3),buff('魂技防御',1,3))],
  ['缠骨蛇信','蛇影','蛇信牵踝','一线碧色蛇信越过近处的交锋，绕上对手膝踝。毒息在命中处荡开，绵长蛇影牵住步幅，让追击和转向都变得迟滞。','3区单敌，命中+2，2d8+6毒蚀伤害；移动降低1区，持续2回合。12魂力，冷却2回合。','enemy',snakeStrike(3,'毒蚀',2,8,6,12,slow(1,2))],
  ['盘鳞护体','盘鳞','银鳞成垒','灵蛇沿肩背盘紧，银缘鳞片逐一扣成弧盾。魂力不断填入鳞纹，托住身体与魂息；外层鳞盾承击碎落后，仍有盘身之力护住要害。','获得2d8+10护盾，维持期间双防+3。启动12、每回合3、占用8；停止后冷却2回合。护盾只在开启时获得。','self',self(snakeFee('payload.shield',{骰数:2,骰面:8,加值:10},12),E('status.amplify',{指标:'物理防御',数值:3,持续方式:'来源维持'}),E('status.amplify',{指标:'魂技防御',数值:3,持续方式:'来源维持'}),E('sustain.maintain',{锁定魂力:8,每回合魂力:3,冷却起点:'结束'}))],
  ['蚀鳞吻','蛇牙','碧吻蚀甲','碧色蛇吻在远处凝出轮廓，双牙落下时，腐蚀细线随魂力渗入护具与防护魂光。外壳裂开细小缺口，为并肩作战的人留下一线进攻之隙。','3区单敌，命中+2，4d8+12毒蚀伤害；物理及魂技防御各−2，持续2回合。20魂力，冷却2回合。','enemy',snakeStrike(3,'毒蚀',4,8,12,20,buff('物理防御',-2,2),buff('魂技防御',-2,2))],
  ['蛇影惊心','蛇影','三影归牙','数道半透明蛇影从两侧交错掠过，银牙冷光让对手难辨落点。真正的蛇影在最后一瞬撞入正面，击碎架势，也扰乱接下来的出手。','3区单敌，命中+2，6d8+16物理伤害；攻击检定−2，持续2回合。26魂力，冷却3回合。','enemy',snakeStrike(3,'物理',6,8,16,26,buff('攻击检定',-2,2))],
  ['银脊蚀骨真身','盘鳞','青鳞临世','巨大的青碧灵蛇在身后昂起，银色鳞脉随呼吸一层层点亮。凝练的魂息贯通蛇牙与毒囊，咬击更沉，碧毒更烈，盘绕身周的蛇身也越发坚实。','持续真身：同源物理与毒蚀伤害+40%（含对应毒伤），魂技命中+2，自身双防+2。启动20、每回合5、占用12，每场一次。','self',self(E('transform.martial_avatar',{持续方式:'本场战斗',持续回合:2,属性增幅档:0,身心防御加值:2,基础动作增幅:0,同源魂技增幅:0,同源命中加值:2,同源难度加值:0,锁定魂力:12,每回合魂力:5,禁用其他武魂:true,定额发动:true,发动魂力:20,冷却起点:'结束'}),E('status.amplify',{指标:'属性伤害',数值:40,伤害属性:'物理',作用范围:'同源武魂',持续方式:'来源维持'}),E('status.amplify',{指标:'属性伤害',数值:40,伤害属性:'毒蚀',作用范围:'同源武魂',持续方式:'来源维持'}),E('sustain.maintain',{锁定魂力:0,每回合魂力:0}))],
  ['百鳞归壳','盘鳞','千鳞守命','银碧鳞片向内收拢，在躯干之外结成厚重鳞壳。外来的锋刃先撞上层层鳞盾，盘紧的蛇身继续分散冲击，为重压下的魂师争出重新出手的余地。','获得6d10+24护盾，受到的物理伤害降低30%，持续3回合。28魂力，冷却4回合。','self',self(snakeFee('payload.shield',{骰数:6,骰面:10,加值:24},28),E('status.resistance_shift',{类型:'物理',模式:'抗性',减免百分比:30,持续回合:3}))],
  ['碧牙穿心','蛇牙','一牙贯阵','蛇影骤然绷直，层层银鳞将魂光推向一枚修长毒牙。凝实锋芒直贯对手的防线，随后炸开的碧毒沿伤处蔓开，每次发作都牵动深处的创痛。','3区单敌，命中+2，一次判定造成10d10+30物理伤害；命中后每回合4d8毒伤，持续3回合。42魂力，冷却4回合，每场2次。','enemy',snakeStrike(3,'物理',10,10,30,42,E('status.poison',{骰数:4,骰面:8,持续回合:3}))]
 ],{mode:'touch',artPath:'/art/sisi-v2/martial-soul.webp',skillArtPath:'/art/sisi-v2/skills.webp',artColumns:3,artRows:3,years:[380,650,1800,5000,12500,26000,50000,80000,90000],growthPriority:['悟性','体魄','身法','意志','感知','力量'],combo:'毒牙建立毒伤，护身调整位置；蛇信减速、蚀鳞吻破防后衔接惊心。真身贯通咬击与毒息，归壳承受爆发，穿心完成定点击杀。',presetNamespace:'si-si',reference:{id:'silver-spine-serpent',name:'银脊蚀骨蛇',level:99,locationId:'loc-nuoding-city',faction:'旅人',soul:'银脊蚀骨蛇',archetype:'poison',skills:[],bones:[],equipment:[],periodLabel:'稀有蛇武魂传承',kind:'soul-master'},npcFamily:'beast',sourceNote:'本游戏原创稀有兽武魂。银背盘鳞护身，双牙破甲注毒。'});
 snake.SOUL.artId='preset.soul.canonical-snake.v2';
 const snakeCooldowns=[1,3,2,2,2,3,0,4,4];
 for(const node of snake.NODES){Object.assign(node,{autoAllocate:false,resourceCosts:[],cooldownTurns:snakeCooldowns[node.ordinal-1],artId:'skill.canonical-women.canonical-snake.v2.'+node.ordinal});if([1,2].includes(node.ordinal))node.minimumYears=100;}
 snake.get(9).minimumYears=90000;snake.get(9).maximumYears=99999;snake.get(9).usageRules={perBattleLimit:2};
 snake.get(9).ageVariants=[
  {presetSuffix:'30000',minimumYears:30000,maximumYears:59999,effects:snakeStrike(3,'物理',6,10,18,30,E('status.poison',{骰数:2,骰面:6,持续回合:3})),summary:'3万年：6d10+18物理伤害；每回合2d6毒伤，持续3回合。30魂力。'},
  {presetSuffix:'60000',minimumYears:60000,maximumYears:89999,effects:snakeStrike(3,'物理',8,10,24,36,E('status.poison',{骰数:3,骰面:6,持续回合:3})),summary:'6万年：8d10+24物理伤害；每回合3d6毒伤，持续3回合。36魂力。'},
  {presetSuffix:'100000',minimumYears:100000,effects:snakeStrike(3,'物理',12,10,36,48,E('status.poison',{骰数:4,骰面:8,持续回合:4})),summary:'十万年：12d10+36物理伤害；每回合4d8毒伤，持续4回合。48魂力。'}];
 snake.sourceAttributes=['毒蚀','物理','生命'];snake.sourceNames=['青鳞毒蛇','银纹游蛇','缠骨青蛇','盘甲灵蟒','蚀甲碧蛇','幻鳞灵蛇','青鳞蛇王','银冠盘鳞蟒','碧牙王蛇'];
 snake.sources=Object.fromEntries(snake.NODES.map(node=>[node.ordinal,{类别标签:['蛇类'],种族特征:['毒液','生命','长体','鳞甲',...([2,3,6].includes(node.ordinal)?['速度','步法']:[]),...([4,8].includes(node.ordinal)?['守护','甲壳']:[]),...(node.ordinal===7?['本源','真身']:[])],解剖标签:['毒牙','毒囊','鳞甲','长体'],属性偏向:{力量:2,身法:4,体魄:4,悟性:5,感知:3,意志:3}}]));
 const ribbonStrike=(range,hit,fee,dice,faces,bonus,extra={})=>[
  E('release.projectile',{距离区:range}),E('target.single',{阵营规则:'敌方'}),
  E('check.soul_attack',{命中加值:hit}),E('payload.damage',{类型:'物理',骰数:dice,骰面:faces,加值:bonus,定额发动:true,发动魂力:fee,...extra})
 ];
 const ribbonShield=(dice,faces,bonus,turns,fee)=>E('payload.shield',{骰数:dice,骰面:faces,加值:bonus,护盾回合:turns,定额发动:true,发动魂力:fee});
 const ribbon=profile('silver-shuttle-silk','银梭绫',['si-si'],'孔雀青窄绫系着一枚银梭，松绫能绕腕接人，绷紧的银边能隔空裁开皮甲。','细银梭斜穿一圈青绫，梭眼系着银线，两缘在转折处亮如刀口。','中距输出与牵引援护',['textile','metal'],[['physical',3],['metal',2]],['projectile','entangle','shield','buff','movement'],{梭锋:'直刺、贯线与裁甲',回绫:'牵人离险与织锦护阵',织势:'锁步、错剪与收锋'},[
  ['飞梭回绫','梭锋','一放一收','银梭从腕边飞出。丝丝勾指收线，绫边贴着梭尖划开的口子回割。','2区单敌，命中+2，去回合计2d8+6物理伤害。7魂力，冷却1回合。','enemy',ribbonStrike(2,2,7,2,8,6)],
  ['回风挽袖','回绫','系腕引归','青绫在同伴腰侧打了个活结。丝丝收臂将人带近，余下几折绫叠在身前承住来击。','2区单友，拉近1区，获得2d6+5护盾，持续2回合。相邻、固定或对自己施放时原地得盾。9魂力，冷却3回合。','ally',[E('release.projectile',{距离区:2}),E('target.single',{阵营规则:'友方',选择模式:'主目标'}),E('move.pull',{距离区:1,援护牵引:true}),ribbonShield(2,6,5,2,9)]],
  ['双梭锁步','织势','交梭钉影','另一枚银梭在绫尾凝成。双梭擦过目标脚踝钉入地面，把下一步的去路绷成一个交叉。','3区单敌，命中+2，2d8+5物理伤害。力量抵抗失败则束缚2回合，可挣脱。13魂力，冷却3回合。','enemy',[...ribbonStrike(3,2,13,2,8,5),E('status.bind',{持续回合:2,挣脱属性:'力量',命中后抵抗:true,抵抗属性:'力量'})]],
  ['穿花引线','梭锋','一绫贯阵','银梭贴着第一道身影掠过。沿途每一点银光都牵紧身后的青绫，一条笔直的绫刃在敌阵间抖开。','3区直线最多3敌，逐人判定，命中各受3d8+7物理伤害。16魂力，冷却2回合。','enemy',[E('release.projectile',{距离区:3}),E('target.line',{最大目标:3,阵营规则:'敌方'}),E('check.soul_attack'),E('payload.damage',{类型:'物理',骰数:3,骰面:8,加值:7,定额发动:true,发动魂力:16})]],
  ['挑金拆甲','梭锋','循缝挑鳞','银梭侧锋插进甲片的搭口，随指尖轻挑掀开一线破绽。青绫随即勒紧，使护身魂光也难以合拢。','3区单敌，命中+3，4d8+10物理伤害；目标双防−2，持续2回合。20魂力，冷却3回合。','enemy',[...ribbonStrike(3,3,20,4,8,10),buff('物理防御',-2,2),buff('魂技防御',-2,2)]],
  ['错综剪','织势','双刃合剪','两枚银梭在猎物两侧错身，拉紧的绫边随双腕交剪。对手脚步一滞，第二重绫锋便能贴进同一道伤口。','3区单敌，命中+3，6d8+16物理伤害。目标已减速或束缚时追加2d8+4。26魂力，冷却3回合。','enemy',ribbonStrike(3,3,26,6,8,16,{加骰条件:'减速或束缚',追加骰数:2,追加骰面:8,追加加值:4})],
  ['银梭真身','织势','十指分经','双梭悬在左右肩外，十指各牵一道银线。进时诸线同张成刃，守时折回织成贴身的云锦。','维持期间，同源魂技命中+2，物理伤害+30%，护盾量+25%。启动20，占用12，每回合5魂力，每场1次。','self',self(E('transform.martial_avatar',{持续方式:'本场战斗',持续回合:2,属性增幅档:0,身心防御加值:0,基础动作增幅:0,同源魂技增幅:0,同源命中加值:2,同源难度加值:0,锁定魂力:12,每回合魂力:5,禁用其他武魂:true,定额发动:true,发动魂力:20}),E('status.amplify',{指标:'属性伤害',伤害属性:'物理',数值:30,作用范围:'同源武魂',持续方式:'来源维持'}),E('status.amplify',{指标:'护盾',数值:25,作用范围:'同源武魂',持续方式:'来源维持'}),E('sustain.maintain',{锁定魂力:0,每回合魂力:0}))],
  ['云锦护阵','回绫','群梭成锦','一梭自同伴肩侧穿过，另一梭从腰后迎回。青绫在几人之间铺成伞状云锦，每人身前都留下一幅能挡刀的折锦。','选2区内友方，以其为中心1区内最多4名友方各得4d8+16护盾3回合、双防+2持续2回合。34魂力，冷却4回合。','ally',[E('release.projectile',{距离区:2}),E('target.burst',{半径区:1,最大目标:4,阵营规则:'友方',以友方为中心:true,选择模式:'主目标'}),ribbonShield(4,8,16,3,34),buff('物理防御',2,2),buff('魂技防御',2,2)]],
  ['一线裁天','织势','万缕归锋','纵横的青绫在目标身后突然收尽。双梭回到腕边时，半空仅余一道银线，沿着同一处破口裁下。','4区单敌，命中+4，10d10+30物理伤害。命中前生命不高于40%时追加4d8。42魂力，冷却4回合，每场2次。','enemy',ribbonStrike(4,4,42,10,10,30,{加骰条件:'生命比例',生命阈值:40,追加骰数:4,追加骰面:8,追加加值:0})]
 ],{presetNamespace:'silver-shuttle-silk',artPath:'/art/silver-shuttle-silk/atlas.webp',years:[380,650,1800,5000,12500,26000,50000,80000,90000],sourceAttributes:['物理','金','生命'],sourceNames:['银梭燕','回风绢蛾','双尾织蛛','穿花剑蜂','挑金穿山兽','剪翅银螳','天青织灵蚕','云锦灵蛾','裁天银翼皇'],growthPriority:['悟性','身法','意志','感知','体魄','力量'],tagline:'飞梭作刃 · 回绫为援',combo:'双梭锁步可接错综剪。对阵重甲先以挑金拆甲打开缺口，敌人并肩时以穿花引线贯穿前排；同伴陷入近战时用回风挽袖接应。',sourceNote:'丝丝的银梭绫及九环传承为本游戏原创。'});
 const ribbonBeasts=[
  ['鸟类',['速度','穿刺'],['翼','羽毛','长喙']],['昆虫',['丝网','守护'],['绢丝','翅']],
  ['蛛形',['丝网','缠绕'],['双尾','丝囊']],['昆虫',['穿刺','速度'],['蜂针','翅']],
  ['兽类',['甲壳','穿透'],['鳞甲','利爪']],['昆虫',['切割','猎杀'],['镰足','薄翅']],
  ['昆虫',['本源','真身','丝网'],['丝囊','蚕茧']],['昆虫',['群体','守护','丝网','柔韧','缠绕','防御'],['绢丝','鳞翅']],
  ['鸟类',['猎杀','穿透','速度','金属','坚固'],['银翼','刃羽','利爪']]
 ];
 ribbon.sources=Object.fromEntries(ribbonBeasts.map(([category,traits,anatomy],i)=>[i+1,{类别标签:[category],种族特征:traits,解剖标签:anatomy}]));
 for(const [i,node] of ribbon.NODES.entries()){
  Object.assign(node,{autoAllocate:false,resourceCosts:[],cooldownTurns:[1,3,3,2,3,3,0,4,4][i]});
 }
 ribbon.get(1).minimumYears=100;
 ribbon.get(1).ageVariants=[{presetSuffix:'ten-year',minimumYears:1,maximumYears:99,effects:ribbonStrike(2,2,7,2,6,4),summary:'十年环：2区单敌，命中+2，2d6+4物理伤害。7魂力，冷却1回合。'}];
 ribbon.get(7).usageRules={perBattleLimit:1};ribbon.get(9).usageRules={perBattleLimit:2};
 profile('soft-bone-rabbit','柔骨兔',['xiao-wu-notting','xiao-wu-shrek','xiao-wu-tournament','xiao-wu-title'],'柔韧腰腿把贴身缠斗化作连续摔击；魅惑制造短暂破绽，瞬移抢占位置，金身留住关键一瞬。','粉白兔耳与长腿光影清晰，柔软毛缘泛着淡金色光。','贴身连击',['humanoid'],[['life',4],['mind',3],['space',1]],['melee','movement','charm','teleport','invulnerability','entangle','buff','transform'],{柔技:'腰弓与锁技',心步:'魅惑与瞬移',护身:'金身与真身'},[
  ['腰弓','柔技','借腰翻摔','长腿贴近对手，腰背绷成柔韧的弓。借转身与蹬踏发力，把对手摔离原来的站位。','近身伤害并击退。','enemy',melee(dmg('物理',1,8,1),E('move.knockback',{距离区:1}))],
  ['魅惑','心步','目光牵心','眼中粉光轻闪，短暂牵住对手的注意。意志未能抵抗者陷入魅惑，为随后的接近留下空隙。','目标意志抵抗失败后受到魅惑。','enemy',save('意志',E('status.charm',{持续回合:1}))],
  ['瞬移','心步','一步折光','粉白身影在原地淡去，下一瞬已落在新的站位。短促的空间涟漪收拢，不留下持续的传送通道。','短距离瞬移自己。','self',self(E('move.teleport',{距离区:2,目的:'指定站位'}))],
  ['无敌金身','护身','金光护骨','金光沿四肢亮起，柔骨化作短暂而坚固的防护。强行接下的一击震起细碎金屑，护光很快消退。','获得短时金身保护，每场使用次数有限。','self',self(E('status.invulnerable',{持续回合:1,次数:99,最大攻击魂技序号:0,最大攻击者等级:99,每日次数:0}))],
  ['柔骨锁','柔技','缠身制动','柔韧的手脚交错锁住对手，重心随关节变化而收紧。目标须以力量挣脱，才能重新自由移动。','近身攻击并束缚。','enemy',melee(dmg('物理',1,8,2),bind(2))],
  ['虚无','护身','身影轻散','身体的轮廓像薄雾一样散开，来袭的锋芒穿过淡影。一次冲击之后，身形重新凝实。','以短暂虚化抵消一次攻击。','self',self(E('status.invulnerable',{持续回合:1,次数:1,最大攻击魂技序号:0,最大攻击者等级:0,每日次数:0}))],avatar('柔骨兔真身'),
  ['柔骨回旋踢','柔技','回身连势','身形绕过敌人的正面，回旋长腿接连切入。腰弓的发力延续到踢击中，把对手再次逼离原位。','强力近身攻击并击退。','enemy',melee(dmg('物理',3,8,3),E('move.knockback',{距离区:2}))],
  ['月影柔舞','心步','柔影落月','粉白魂光沿腿侧收束，柔韧身形在极短距离内变换角度。落下的最后一击像月弧合拢，随后顺势收身。','重击近身目标。','enemy',melee(dmg('物理',4,8,4))]
 ],{mode:'melee',combo:'魅惑干扰，瞬移贴身，柔骨锁封住移动后接腰弓；金身与虚无分别用于承受连击和一次关键攻击。'});
 profile('serpent-staff','蛇杖',['chao-tianxiang'],'蛇首长杖引导毒息，杖刃与蛇形魂光交替压迫敌人；毒雾逼退追击，缠杖封住近身退路。','墨绿长杖顶端盘着银鳞蛇首，杖口含一枚窄刃，绿雾贴着杖身流转。','器魂毒控',['staff','serpent'],[['toxic-corrosion',4],['metal',2]],['melee','projectile','poison','entangle','burst','buff','transform'],{杖刃:'毒刃直击',蛇缚:'杖影缠困',毒雾:'封路与持续毒伤'},[
  ['蛇刃','杖刃','蛇口吐刃','蛇首杖口吐出一道窄刃，刃光贴着地面飞旋。绿痕在锋缘亮起，毒刃切开目标的防线。','远程毒蚀攻击。','enemy',enemy(dmg('毒蚀',1,6,1))],
  ['蛇身','蛇缚','杖影化蛇','蛇杖的光影骤然伸长，绕向敌人的腰腿。被收紧的杖影捆住关节，迫使目标用力量挣脱。','束缚单个敌人。','enemy',save('力量',bind(2))],
  ['蛇牙连刺','杖刃','杖尖破隙','杖尖连点，蛇牙般的银刃从守势间探出。每一次刺入都带着凝练的毒息。','近身毒属性攻击。','enemy',melee(dmg('毒蚀',2,6,2))],
  ['蛇雾迷途','毒雾','绿雾蔽路','蛇首吐出一片浓绿薄雾，卷向选定的对手。抵抗失败者吸入毒息，生命受到持续侵蚀。','对单个敌人施加中毒。','enemy',save('体魄',poison(1,2))],
  ['盘蛇守杖','蛇缚','杖圈守身','长杖横转，蛇形魂光盘成紧密圆环。每一次架挡都带起层叠蛇鳞般的光影。','提高自身物理防御。','self',self(buff('物理防御',3,3))],
  ['碧鳞封径','蛇缚','毒索封路','蛇影从杖端分流，绕过敌群的脚踝与手腕。毒索同时收紧，把逃离的动作卡在原地。','范围缠绕敌人。','enemy',area('力量',bind(2))],avatar('蛇杖真身'),
  ['千蛇咬影','杖刃','刃雨归锋','无数细窄蛇刃聚成一束，顺着杖尖指向的轨迹落下。刃雨划开防线，余毒在伤处扩散。','强力远程毒伤并中毒。','enemy',enemy(dmg('毒蚀',3,8,3),poison(2,2))],
  ['蛇杖镇渊','毒雾','蛇雾锁阵','巨大的蛇杖光影插入地面，绿雾沿蛇鳞纹路向外扩散。敌群每一次呼吸都要承受毒息侵蚀。','范围毒伤并附加持续中毒。','enemy',area('体魄',dmg('毒蚀',3,8,3),poison(2,3))]
 ],{mode:'melee',combo:'蛇刃远处试探，蛇身或封径阻止敌人脱离；盘蛇守杖抵挡近战，以毒雾与持续毒伤消磨。龙蛇合击仍需双方实际协作。'});
 profile('nether-cat','幽冥灵猫',['zhu-zhuqing-shrek','zhu-zhuqing-tournament','zhu-zhuqing-title','zhu-zhuyun'],'暗紫猫影擅长从侧翼切入，利爪、疾步与分身相互掩护；控制一瞬距离，再把锋芒集中于薄弱处。','深紫灵猫伏低身形，银色瞳孔锐利，四爪边缘泛着冷紫光。','暗影敏攻',['feline','shadow'],[['dark',5],['wind',3]],['melee','movement','stealth','buff','summon','transform','projectile'],{疾袭:'接近与爪击',幽影:'隐匿与分身',真身:'本源与终击'},[
  ['幽冥突刺','疾袭','暗爪突进','身形压成一道紫影，利爪沿敌人防线的缝隙刺出。出手短促而集中，不在正面久留。','近身物理攻击。','enemy',melee(dmg('物理',1,8,2))],
  ['幽冥百爪','疾袭','爪影叠落','双爪快速交替，冷紫爪影层层掠过同一处。连续的锋芒在极短时间内汇成一击。','较强近身物理攻击。','enemy',melee(dmg('物理',2,6,2))],
  ['幽冥斩','疾袭','爪刃合锋','暗色魂力沿双爪压成两道窄刃，交错斩落。最后一道紫线在命中后才缓缓散开。','强化近身斩击。','enemy',melee(dmg('暗',2,8,2))],
  ['幽冥影分身','幽影','一影分行','猫影在脚下错开，一具与本身动作相近的分身踏出暗处。它拥有独立的生命与行动，破灭时化回紫雾。','召唤一具有限时间的分身。','self',self(E('summon.entity',{模板:'分身',数量:1,生命百分比:20,持续回合:2,继承能力:true,属性继承百分比:50,魂力继承百分比:25,技能继承数量:1,技能效果倍率:50,排除魂骨:true,排除领域:true}))],
  ['幽冥影相连','幽影','猫步连影','暗影沿落脚点逐一相接，身体在阴影间变得轻捷。转身与追击都留有余地，爪锋随步法更易切入。','增加移动与攻击检定。','self',self(buff('移动区',1,3),buff('攻击检定',2,3))],
  ['幽冥附体','幽影','暗影敛息','深紫猫影贴合躯干，轮廓隐入周围的阴影。未出手前，暗影替她遮住行踪。','短时隐匿，攻击后解除。','self',self(E('status.invisibility',{持续回合:2,攻击后解除:true}))],avatar('幽冥灵猫真身'),
  ['幽冥摄魂','真身','冷瞳锁隙','冷紫眼光追住敌人的动作，一线暗刃随之飞出。对手的攻击节奏在刺骨的寒意中被压低。','远程暗伤，并降低攻击检定。','enemy',enemy(dmg('暗',3,6,2),buff('攻击检定',-2,2))],
  ['幽冥归刃','真身','万影一锋','散开的猫影骤然回收，所有锋芒凝在最后一爪。暗光在近身处划出狭长弧线，攻势结束后身形随即收稳。','强力近身暗属性攻击。','enemy',melee(dmg('暗',4,8,4))]
 ],{mode:'melee',combo:'连影增加走位与命中，分身牵制，附体寻找切入时机，再用突刺和幽冥斩集中攻击。'});
 profile('jade-phosphor-snake','碧磷蛇',['dugu-yan'],'碧鳞蛇息以不同毒雾干扰身心，青鳞护持自身，紫毒负责侵蚀；强毒与控制各有抵抗和持续时间。','通体翡翠色蛇影昂首，紫色毒雾从口中逸出，鳞片如薄玉。','毒雾控制',['serpent','poison'],[['toxic-corrosion',6]],['poison','projectile','burst','buff','debuff','entangle','transform'],{毒息:'碧磷三毒',碧鳞:'护身与缠束',蛇皇:'真身与剧毒'},[
  ['碧磷红毒','毒息','亢奋蛇息','淡红蛇息缠上同伴的手臂，沉滞的气血被迅速催动。力量随毒息提高，红雾散去后增幅也一并消失。','短时提高同伴力量。','ally',oneAlly(buff('力量',2,2))],
  ['碧磷蓝毒','毒息','静鳞护脉','幽蓝雾气沿同伴的衣甲凝成薄层，呼吸和筋骨逐渐稳住。蓝光在承击时轻轻闪动。','短时提高同伴体魄。','ally',oneAlly(buff('体魄',2,2))],
  ['碧磷紫毒','毒息','紫雾蚀骨','碧磷蛇吐出浓紫毒雾，向敌人的站位漫开。体魄不足以抵挡者被毒息侵入，随后持续失去生命。','范围施加中毒。','enemy',area('体魄',poison(1,1))],
  ['碧鳞缠影','碧鳞','蛇索合围','碧玉色蛇影绕住目标，鳞片一节节收紧。挣脱的动作牵动毒牙，绿痕沿束缚处亮起。','缠绕单个敌人。','enemy',save('力量',bind(2))],
  ['蚀玉毒牙','蛇皇','毒牙透隙','紫毒压进蛇牙，在一瞬间集中喷出。伤处留下细密的翡翠裂纹，毒息继续侵蚀血肉。','远程毒伤并中毒。','enemy',enemy(dmg('毒蚀',2,8,2),poison(1,2))],
  ['碧鳞镇息','碧鳞','盘身藏锋','碧鳞蛇绕身盘紧，把散乱的魂力收回体表。沉凝的鳞光稳住守势，避免被一击打乱节奏。','提高自身双防。','self',self(buff('物理防御',2,3),buff('魂技防御',2,3))],avatar('碧磷蛇真身'),
  ['紫瘴封途','毒息','寸步留毒','紫雾在敌人脚下翻涌，毒息随每次迈步缠上肌肤。脚步越来越沉，离开毒势也需要时间。','范围减速并中毒。','enemy',area('体魄',slow(2,2),poison(2,2))],
  ['碧磷归墟','蛇皇','紫毒尽放','翡翠蛇影张开毒牙，深紫雾潮一层层压向敌阵。毒息凝而不散，在体内留下持续发作的伤害。','强力范围毒伤并持续中毒。','enemy',area('体魄',dmg('毒蚀',3,8),poison(2,3))]
 ],{combo:'红毒和蓝毒用于协助同伴，紫毒迫使敌人承受持续损耗；缠影与封途延缓撤离，守势不足时以碧鳞镇息维持。'});
 profile('fox-spirit','妖狐',['hu-liena-tournament','hu-liena-slaughter'],'妖狐以目光、狐鸣和幻影干扰意志，精神冲击击穿破绽；尾影遮蔽行迹，近身爪锋收住机会。','金粉色妖狐有修长耳尖与蓬松尾影，瞳孔澄金，细雾沿尾毛散开。','精神控制',['canine','mind'],[['mind',6],['dark',2]],['charm','projectile','melee','debuff','stealth','buff','transform','burst'],{惑心:'魅惑与压制',狐影:'闪避与近袭',魂鸣:'精神冲击'},[
  ['狐魅','惑心','眼波牵意','金粉光芒在眼底一闪，妖狐的目光牵住对手心神。意志失守者陷入短暂魅惑，难以维持原本敌意。','意志抵抗失败后受到魅惑。','enemy',save('意志',E('status.charm',{持续回合:1}))],
  ['狐火惑神','魂鸣','狐鸣刺念','细小狐火沿目光飞出，撞入对手的精神防线。火光没有灼热，只留下尖锐的心神刺痛。','远程精神攻击。','enemy',enemy(dmg('精神',1,8,1))],
  ['幻境迷心','惑心','幻影蔽念','金粉雾气在对手眼前折出相互矛盾的影像。心神受到冲击，出手的判断也随之偏移。','精神伤害并降低攻击检定。','enemy',enemy(dmg('精神',1,6,1),buff('攻击检定',-2,2))],
  ['狐影潜形','狐影','尾雾藏身','妖狐尾影从身后扫过，细雾抹去清晰的轮廓。隐匿在出手时破开，露出真正的爪锋。','短时隐匿，攻击后解除。','self',self(E('status.invisibility',{持续回合:2,攻击后解除:true}))],
  ['心灵震慑','惑心','一鸣失措','尖锐狐鸣直刺心神，金色眼瞳牢牢追住对手。意志抵抗失败者在惊惧中短暂停住动作。','目标抵抗失败后短时眩晕。','enemy',save('意志',E('status.stun',{持续回合:1}))],
  ['狐尾裂影','狐影','虚实交锋','蓬松尾影掩住上身的微动，双爪从侧面交错切入。锋芒与幻影错开半拍，让人难辨落点。','近身暗属性攻击。','enemy',melee(dmg('暗',3,6,3))],avatar('妖狐真身'),
  ['千幻狐鸣','魂鸣','群念回响','狐鸣化为一圈圈金粉涟漪，在敌群耳边重叠。精神痛楚逐个落下，扰乱彼此的行动节奏。','范围精神攻击。','enemy',area('意志',dmg('精神',3,8,2))],
  ['摄心天狐','惑心','九尾压心','巨大的天狐尾影在身后合拢，金光笼住敌人的视线。意志未能守住者被魅惑牵制，余下的狐鸣仍在心头回荡。','范围魅惑，目标各自进行意志抵抗。','enemy',area('意志',E('status.charm',{持续回合:2}))]
 ],{combo:'以狐魅或震慑创造行动空隙，幻境压低反击命中；潜形接近后用裂影攻击。妖魅仍属于实际多人协作。'});
 profile('needle-tailed-swift','尖尾雨燕',['bai-chenxiang'],'尖尾雨燕以轻翼、长尾与敏锐感知穿行战线，擅长找出目标、传递视野并迅速脱离，攻击依靠俯冲而非爪击硬拼。','纤细雨燕有刀剪般的长尾，青灰羽背，白色腹羽，翼缘一线青光。','飞行侦察',['avian'],[['wind',4],['life',2]],['flight','sensory','movement','buff','melee','transform'],{轻翼:'飞行与转向',望风:'侦察与追踪',掠影:'俯冲与脱离'},[
  ['轻羽乘风','轻翼','贴风轻行','青灰燕影沿脚下掠过，细风托住每一次转身。轻捷步法连贯起来，尾羽般的风纹在身后划出细线。','短时提高移动能力。','self',self(buff('移动区',1,2))],
  ['燕目望远','望风','一眼寻迹','燕瞳映出远处细小的动静，风声中的杂音逐渐退去。感知随专注提高，便于发现战场变化。','短时提高自身感知。','self',self(buff('感知',2,3))],
  ['雨燕留痕','望风','风痕指路','一枚细小风羽追住目标，在其周围留下清晰风痕。标记维持时，燕目更容易追上对方的移动。','标记敌人，保持短时追踪。','enemy',save('感知',E('status.mark',{持续回合:4,追踪距离区:4,不可隐藏:true}))],
  ['穿云疾返','轻翼','借翼折返','雨燕展翼迎风升起，长尾一摆又迅速折回。低空飞行留下清晰弧线，便于越过地面障碍。','获得短时低空飞行。','self',self(E('move.flight',{持续回合:3,高度:'低空'}))],
  ['掠风点翎','掠影','俯冲一线','燕翼压窄成一道青线，顺着俯冲的势头掠过目标。出手之后，细羽在风中散开。','近身风属性攻击。','enemy',melee(dmg('风',2,6,2))],
  ['群翼传讯','望风','风声共知','数枚青羽落在同伴肩头，细风把周围的动静送近。每个人都更容易察觉逼来的攻击。','短时提高同伴感知。','ally',ally(buff('感知',2,2))],avatar('尖尾雨燕真身'),
  ['九转回风','掠影','转翼避锋','燕翼在狭小空间内连续变向，长尾勾出九道细弧。灵活步法提高身法，也让防守更加从容。','提高身法与物理防御。','self',self(buff('身法',2,3),buff('物理防御',2,3))],
  ['极目长空','轻翼','高天巡望','雨燕迎着长风向高处升去，青白翼光清晰铺开。更高的视角与稳定的飞行让战场尽收眼底。','获得高空飞行并提高感知。','self',self(E('move.flight',{持续回合:4,高度:'高空'}),buff('感知',3,4))]
 ],{mode:'melee',combo:'轻羽飞行，燕目寻找目标，留痕追踪；疾返与回风用于脱离，群翼传讯支援队伍，不用敏攻猫爪冒充鸟类本领。'});
 profile('clear-sky-hammer','昊天锤',['tang-tiantian'],'沉黑巨锤将重量压在一点，破开防线、击退来敌；稳住重心蓄起锤势，再以真身承受正面交锋。','短柄沉黑巨锤，锤面如山岩，暗银雷纹沿锤脊收束。','重器强攻',['hammer','metal'],[['metal',6],['earth',3]],['melee','armor_break','movement','shield','buff','transform','burst'],{重锤:'破甲重击',定岳:'守势与蓄力',震阵:'击退与范围压制'},[
  ['沉岳击','重锤','重锋落点','锤面沿最短弧线砸下，沉凝力量集中于落点。余震传到手臂，脚下重心却稳稳不动。','近身重击。','enemy',melee(dmg('物理',1,8,2))],
  ['碎甲锤','重锤','锤锋裂甲','锤脊压入防线，金属魂光在撞击处骤然收束。破开的护甲在短时间内难以完全复位。','近身伤害并降低防御。','enemy',melee(dmg('物理',1,6,0),E('status.armor_break',{数值:1,持续回合:2}))],
  ['镇岳架','定岳','立锤如山','巨锤横在身前，沉黑锤影与双臂相接。凝实的护盾抵住来势，为下一次挥锤争取时间。','获得自身护盾。','self',self(shield(2))],
  ['回峰震','震阵','重锤退敌','锤面由下而上翻起，重击带着一层震荡。目标被撞离站位，余势在地面掀起碎尘。','近身伤害并击退。','enemy',melee(dmg('物理',2,8,2),E('move.knockback',{距离区:2}))],
  ['叠岳蓄锋','定岳','锤势内敛','魂力一层层压入锤身，锤纹从散乱火星凝成暗银直线。下一轮近战的力道在沉默中积起。','短时提高力量与伤害加值。','self',self(buff('力量',2,3),buff('伤害加值',2,3))],
  ['震地开山','震阵','山纹崩裂','巨锤猛然顿地，震荡沿裂开的石纹奔向敌群。每个落点都掀起沉重的冲击。','范围物理攻击。','enemy',area('力量',dmg('物理',3,8,2))],avatar('昊天锤真身'),
  ['孤峰破阵','重锤','一锤定锋','所有锤势压进正面一击，锤头暗纹瞬间亮如白银。敌人的防线被沉重冲击撕开。','强力伤害并破甲。','enemy',melee(dmg('物理',3,8,3),E('status.armor_break',{数值:2,持续回合:2}))],
  ['千钧归岳','重锤','重岳归一','巨锤高举，沉黑山影与锤面重叠。下落的一瞬，周围尘埃被压成圆环，再猛然迸散。','极强近身物理攻击。','enemy',melee(dmg('物理',4,10,5))]
 ],{mode:'melee',powerTier:2,combo:'镇岳护住蓄势，碎甲后接重击；回峰击退争取距离，震地对付聚集敌人。此路线沿用项目既有人物，不授予宗门秘法或炸环。'});
 // Additional packs register through this private authoring surface, then the
 // exported API is frozen by finish(). Runtime consumers only receive content.
 function finish(){
  const isRecord=id=>PROFILES.some(p=>p.isRecord(id));
  const forRecord=(id,name)=>PROFILES.find(p=>p.isRecord(id)&&p.SOUL.name===name);
  const forSoul=soul=>PROFILES.find(p=>p.isSoul(soul));
  const authored=(skill,state)=>{
   const source=state?.武魂?.列表?.[skill?.sourceMartialSoulId??skill?.来源武魂ID];
   const p=source?forSoul(source):state?null:PROFILES.find(p=>p.NODES.some(n=>p.ownsPreset(n,skill)));
   const node=p?.NODES.find(n=>n.name===(skill?.name??skill?.名称)&&p.matches(n,skill));if(node)return node.description;
   const recordId=state?.战斗单位?.列表?.[skill?.持有者单位ID]?.扩展?.角色库ID??skill?.扩展?.recordId;
   const b=BEASTS.find(b=>b.id===recordId);return b?.NODES.find(n=>n.name===(skill?.name??skill?.名称)&&PROFILES[0].matches(n,skill))?.description??null;
  };
  const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
  return freeze({PROFILES,BEASTS,beast:id=>BEASTS.find(b=>b.id===id),isRecord,forRecord,forSoul,authored});
 }
 const helpers={profile,E,self,enemy,melee,save,area,ally,oneAlly,dmg,buff,poison,bind,slow,shield,heal,regen,avatar,field};
 if(typeof module!=='undefined'&&module.exports){require('./canonical-women-support-content.js')(helpers);require('./canonical-women-elements-content.js')(helpers);BEASTS=require('./canonical-women-beasts-content.js')(helpers);}else{globalThis.SoulCanonicalWomenSupport(helpers);globalThis.SoulCanonicalWomenElements(helpers);BEASTS=globalThis.SoulCanonicalWomenBeasts(helpers);}
 return finish();
});
