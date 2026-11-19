import {playerText} from './player-text';
import {effectDisplayNames,equipmentAffixDescription} from '../shared/effect-display';

/** Player explanations of registered mechanics. This never computes outcomes. */
export function effectProse(id:string,p:Record<string,any>,formula:string,state:any):string[] {
  if(id==='realm.capture')return ['战斗及必要结算结束后，主动将符合对象条件的人物收入所属独立空间；收入会绑定永久席位，不能换人。'];
  if(id==='realm.deploy')return [`召唤第${p.席位}席已经绑定的人物；选择投影或真身出战，空席不能施放。投影承载本人的意识，按画境规定的比例战斗，没有固定持续时间；真身须达到服从要求并占用普通队伍名额。`];
  const rows:string[]=[];
  const add=(text:string|false|null|undefined)=>{if(text)rows.push(text)};
  const n=(key:string)=>Number(p[key]??0);
  const label=(key:string)=>playerText(p[key],state,'特殊');
  const signed=(value:number)=>`${value>0?'+':''}${value}`;
  const maxSkill=()=>add(n('最大攻击魂技序号')>0&&`仅对第 ${n('最大攻击魂技序号')} 魂技及以下生效`);
  const hitRule:Record<string,string>={
    hit_advantage:'命中检定掷两次取较高值；与命中劣势互相抵消，不重复叠加',
    hit_disadvantage:'使受术者的命中检定掷两次取较低值；与命中优势互相抵消，不重复叠加',
    hit_reroll:'首次未命中时重新进行一次命中检定，采用重掷结果',
    evasion_reroll:'对方命中时，令对方重新进行一次命中检定，采用重掷结果',
    sure_hit:`${n('等级')}级必中；高于目标绝闪等级时直接命中，同级互相抵消后正常掷骰，低于目标绝闪等级时被避开；必中本身不保证重击`,
    absolute_evasion:`${n('等级')}级绝闪；高于对方必中等级时完全避开攻击，同级互相抵消后正常掷骰，低于对方必中等级时被命中；绝闪生效时不承受失手补偿的擦伤`,
    critical_guarantee:'命中且含可重击伤害时保证重击；不会保证命中，仍可被暴击抑制',
    critical_guard:'将本次原本发生的重击抑制为普通命中；不会取消命中或免除普通伤害',
    miss_graze:`未命中时仍造成${n('擦伤比例')}%的即时伤害；只执行伤害段，不附带其他命中效果，不能突破生效的绝闪`
  };
  if(/^(status|modifier)\./u.test(id)&&hitRule[id.split('.')[1]]){
    add(id.startsWith('modifier.')?'仅作用于本次攻击的命中检定':'获得对应命中干涉');
    add(hitRule[id.split('.')[1]]);
    if(id.startsWith('status.'))add(`最多触发 ${n('次数')} 次，仅消耗本次实际参与判定的最高适用来源`);
  }else if(id.startsWith('target.')){
    if(id==='target.allies'){add(`选择 ${n('距离区')} 区内任意数量友方，包括自身与投影；按实际人数供魂`);if(p.每目标魂力)add(`每人消耗 ${n('每目标魂力')} 魂力`);}
    if(id==='target.single'&&p.沿用首目标)add('沿用第一段的同一目标，无需再次选择');
    const targetCount=n('最大目标')||n('目标数');
    add(targetCount>1&&!p.覆盖全部&&`最多 ${targetCount} 名目标`);
    if(id==='target.aura')add(`周围 ${n('距离区')} 区`);
    if(id==='target.cone')add(`向前延伸 ${n('距离区')} 区`);
    if(id==='target.burst'){if(p.以友方为中心)add('以选定同伴为中心');add(`半径 ${n('半径区')} 区`);}
    if(id==='target.chain')add(`每次跳跃不超过 ${n('跳跃区')} 区`);
    if(p.阵营规则&&p.阵营规则!=='自动')add(`可作用于${label('阵营规则')}`);
    if(p.选择模式&&p.选择模式!=='主目标')add(`依${label('选择模式')}选择目标`);
  }else switch(id){
    case 'status.amplify':add(`${p.指标==='属性伤害'?p.伤害属性??'':''}${label('指标')} +${n('数值')}${['物理伤害','魂技伤害','治疗','护盾','攻击伤害','属性伤害','伤害减免'].includes(p.指标)?'%':''}`);if(p.成长序列)add(`随同源实际魂环数成长：${p.成长序列.join(' / ')}`);add(p.作用范围==='同源武魂'&&'仅作用于来源武魂的能力');add(p.叠加方式==='同源相加'?'由施术者持续维持；不同技能来源相加，同一技能不重复叠加':'由施术者持续维持；同指标取最高，不同伤害增幅相加');if(p.指标==='伤害减免')add('持续减伤合计最多75%，不能叠加成完全免伤；免疫与有次数限制的无敌另行结算');break;
    case 'passive.equipment_stat':add(equipmentAffixDescription(p.属性,p.数值));break;
    case 'passive.element_amplify':add(`${label('类型')}属性伤害 +${n('数值')}%`);add('包括对应持续伤害');break;
    case 'release.projectile':add(`最远 ${n('距离区')} 区`);break;
    case 'release.melee':case 'release.touch':add('须先靠近至接触距离，远处目标不能直接选中；可先移动再施放');break;
    case 'check.physical_attack':add(n('护甲穿透')!==0&&`护甲穿透 ${signed(n('护甲穿透'))}`);
    // Physical and soul attacks share the displayed accuracy adjustment.
    case 'check.soul_attack':add(n('命中加值')!==0&&`命中 ${signed(n('命中加值'))}`);break;
    case 'check.save':add(`以${label('属性')}抵抗`);add(p.成功效果==='无'?'抵抗成功则免受此效果':`抵抗成功：${label('成功效果')}`);add(n('难度加值')!==0&&`抵抗难度 ${signed(n('难度加值'))}`);break;
    case 'payload.damage':case 'payload.drain':add(formula);add(`${label('类型')}伤害`);add(n('穿透档')>0&&'忽略伤害抗性');if(p.加骰条件)add(`目标${p.加骰条件==='生命比例'?'生命≤'+p.生命阈值+'%':'已减速或束缚'}时追加 ${p.追加骰数}d${p.追加骰面}${p.追加加值?'+'+p.追加加值:''}`);if(p.引爆状态){add(`仅在目标存在${p.状态来源==='自身与所属召唤'?'本人或本人召唤体':'本人'}施加的${p.引爆状态}时追加`);add(p.消耗状态&&`消耗一份最强${p.引爆状态}；未命中不消耗`);}if(id==='payload.drain')add(`伤害的 ${n('转化百分比')}% 转为自身生命`);break;
    case 'payload.residual':add(`${n('数值')} 点${label('类型')}伤害`);break;
    case 'payload.shield':case 'payload.heal':add(formula);if(p.护盾回合)add(`持续 ${p.护盾回合} 回合`);if(p.附加悟性===false)add('按基础数值恢复');if(p.领域触发==='回合开始')add('受益者行动开始时结算');break;
    case 'payload.repair_item':add(`修复实际携带物品最多 ${n('修复量')} 点耐久，物品价值不超过 ${n('价值上限')} 点`);add('消耗适合的真实材料，不改变品质、能力、绑定或冷却');break;
    case 'payload.fabricate':add(`按本人图纸或普通配方制造永久物品，单件价值最多 ${n('价值上限')} 点，每次最多 ${n('最大数量')} 件`);add('消耗满足配方价值和特性的真实材料，成品放入本人行囊');break;
    case 'payload.unlock':add(`对实际选中的一处锁尝试解锁，最高支持品级 ${n('最高品级')}，强度 ${n('强度')}`);add('不毁坏器体，不自动脱下装备或解除其他封印；规则锁仍须匹配对应凭据或正式压制条件');break;
    case 'payload.arcane_lock':add(`向实际器具施加独立魔法锁，品级 ${n('最高品级')}，锁难度 ${n('锁难度')}，持续 ${n('持续分钟')} 分钟`);add('保留原有机械锁，须分别处理仍有效的锁层；到期不将已脱下器具重新穿戴');break;
    case 'payload.suppress_lock':add(`对指定魔法或规则锁尝试暂时抑制，最高支持品级 ${n('最高品级')}，强度 ${n('强度')}，成功后持续 ${n('持续分钟')} 分钟`);add('到期恢复仍适用的原锁效，已脱下的器具不会重新穿戴');break;
    case 'payload.rule_break':add(`尝试按登记的毁灭规则破坏器体，最高支持品级 ${n('最高品级')}，强度 ${n('强度')}`);add('须匹配器体冻结的克制条件；绝对不可破坏器体不因此变为可破坏');break;
    case 'payload.analyze_lock':add(`分析实际锁结构，最高支持品级 ${n('最高品级')}，强度 ${n('强度')}`);add('成功取得对应结构知识，不直接开锁或取得控制权');break;
    case 'payload.create_key':add(`依据实际对应结构知识创造实体钥匙，最高支持品级 ${n('最高品级')}，单把价值上限 ${n('价值上限')}`);add('钥匙按实例或登记图纸范围匹配，不凭名称或公开锁号通用');break;
    case 'payload.soul_damage':add(`削减 ${n('数值')} 点魂力`);break;
    case 'payload.soul_restore':add(`恢复 ${n('数值')} 点魂力`);break;
    case 'payload.restore':
      for(const resource of ['生命','魂力'])if(p[`${resource}模式`]!=='无'&&n(`${resource}数值`)>0)add(p[`${resource}模式`]==='缺失比例'?`恢复已损失${resource}的 ${n(`${resource}数值`)}%`:`恢复 ${n(`${resource}数值`)} 点${resource}`);
      add(n('每日次数')>0&&`每日最多 ${n('每日次数')} 次`);add(n('世界日冷却')>0&&`使用后等待 ${n('世界日冷却')} 日`);break;
    case 'payload.cleanse':add(`移除最多 ${n('最大数量')} 项${label('类别')}状态`);break;
    case 'payload.dispel':add(`驱散最多 ${n('最大数量')} 项状态或区域效果`);add('不能驱散灼烧与中毒');break;
    case 'payload.revive':add(`恢复倒地或死亡的目标，拥有 ${n('生命百分比')}% 生命并重新行动，场外也可对同场人物使用；死者需保有完整遗体及剩余寿命，已消散的投影与召唤不能恢复`);break;
    case 'status.bind':add(`可用${label('挣脱属性')}尝试挣脱`);break;
    case 'status.mute':add('无法发声，不能施放要求发声的能力；无声能力仍可施放');break;
    case 'status.limb_bind':add(`${label('部位')}在${p.姿态??'身前'}受到 ${p.层数??1} 层拘束`);add(p.部位==='双手'?'不能完成手部施法和物品操作':p.部位==='双腿'?'不能自主移动':'不能完成手部动作或自主移动');add(`用${label('挣脱属性')}挣脱成功解除一层，后续挣脱难度 +${p.挣脱难度加值??0}`);break;
    case 'status.desire':add(`欲火 ${p.强度??1} 级，攻击与主动悟性／感知检定 −${p.强度??1}`);add(`意志自控难度 ${[0,10,15,20][p.强度??1]}，每五分钟检定（封存期间暂停）；发作时惩罚再增加1，二／三级发作阻止专注行动`);add('主动克制消耗主行动或五分钟；成功后基础负担仍保留');break;
    case 'status.power_seal':
      if(p.封印对象==='精细'&&p.限制){
        if(p.限制.soulPowerPercent!==undefined)add(`魂力开放 ${p.限制.soulPowerPercent}%`);
        if(p.限制.damagePercent!==undefined)add(`伤害输出上限 ${p.限制.damagePercent}%`);
        if(p.限制.permission?.maxCastRank!==undefined)add(`最高施放强度 ${p.限制.permission.maxCastRank} 环`);
        add('能力使用仍须符合此来源的许可');
      }else {add(`封印${label('封印对象')}`);add(p.范围==='当前武魂'?'绑定施加时的目标武魂，切换武魂不会转移封印':'作用于目标全部对应能力');}
      break;
    case 'status.mind_control':case 'status.soul_control':add(`${id==='status.mind_control'?'精神':'灵魂'}控制，强度 ${n('强度')}`);add(`可下达${label('命令域')}命令，范围${label('控制距离')}`);add('行动费用由受控者支付');break;
    case 'status.cognition_shift':add(label('认知方向'));add(p.改造方式==='立即'?'立即改变认知':`持续改造 ${n('改造分钟')} 分钟后改变认知`);if(p.认知方向==='自由改造')add(p.关系作用域==='认知与现实'?'可改写主观设定及对应现实关系':'可改写主观设定，现实关系保持不变');add(p.认知保留==='保留'?'来源解除后保留已完成的认知改变':'认知改变随来源解除');break;
    case 'status.paralysis':add(`叠加 ${n('层数')} 层，达到 ${n('阈值')} 层时麻痹`);break;
    case 'status.burn':case 'status.poison':add(`每回合造成 ${formula} 生命伤害`);add(p.同施术者取最高&&'同一施术者的灼烧取较强值，重复施加刷新期限');break;
    case 'status.regeneration':add(`每${p.持续方式==='世界分钟'?'分钟':'回合'}恢复 ${formula} 生命`);break;
    case 'status.armor_break':add(`物理防御 −${n('数值')}`);break;
    case 'status.buff':add(`${label('属性')} ${signed(n('数值'))}`);break;
    case 'status.slow':add(`速度 −${n('数值')}`);break;
    case 'status.haste':add(`速度 +${n('数值')}`);break;
    case 'status.invisibility':add(p.攻击后解除?'攻击后解除隐身':'攻击不会解除隐身');break;
    case 'status.invulnerable':if(p.高阶抵挡次数){add(`普通及前${n('最大攻击魂技序号')}环攻击免伤；更高阶攻击另可抵挡${n('高阶抵挡次数')}次`);add(`低阶被挡伤害的${n('低阶转盾百分比')}%转为临时护盾，上限最大生命${n('护盾上限百分比')}%`);}else{add(p.持续方式==='来源下回合'?'期间免疫普通伤害':`可抵挡 ${n('次数')} 次`);maxSkill();}add(n('最大攻击者等级')>0&&`仅抵挡 ${n('最大攻击者等级')} 级及以下攻击者`);add(n('每日次数')>0&&`每日最多 ${n('每日次数')} 次`);break;
    case 'status.resistance_shift':add(({抗性:p.减免百分比!==undefined?`受到的${label('类型')}伤害减少 ${n('减免百分比')}%`:`受到的${label('类型')}伤害减半`,免疫:`免疫${label('类型')}伤害`,易伤:`受到的${label('类型')}伤害翻倍`,吸收:`免疫${label('类型')}伤害，并转为临时护盾（取较高值）`} as Record<string,string>)[p.模式]);break;
    case 'status.status_guard':{const name=({'status.buff':'属性削弱','status.resistance_shift':'属性易伤','status.eternal_wound':'持续创伤'} as Record<string,string>)[p.防护对象]??playerText(effectDisplayNames[p.防护对象],state,'负面状态');add(p.模式==='免疫'?`免疫新施加的${name}，不清除已有状态`:`抵抗${name}时获得豁免优势；无豁免检定时无效`);break;}
    case 'status.mark':add(`追踪距离 ${n('追踪距离区')} 区`);add(p.不可隐藏&&'目标隐身后仍可追踪');break;
    case 'status.eternal_wound':add(`每回合 ${formula} 伤害`);add(`受到的治疗减少 ${n('治疗削减百分比')}%`);add(`每回合消耗 ${n('每回合魂力')} 点魂力`);add(`维持时每缺少1点魂力，额外受到${n('魂力耗尽倍率')}点伤害`);add(p.战斗后保留&&'战后仍保留创伤');break;
    case 'copy.skillset':add('受术者借用另一名选定人物的技能，受术者与复制来源分别选择');add(`最多复制 ${n('最大技能数')} 个技能`);add(`复制效果为原技能的 ${n('复制比例')}%`);add(p.排除魂骨&&'不能复制魂骨技能');add(p.排除领域&&'不能复制领域');break;
    case 'modifier.next_skill':
      for(const [key,name] of [['效果倍率','下次技能效果'],['魂力消耗倍率','下次技能魂力消耗'],['制造速度倍率','制造速度'],['成品效果倍率','制造成品效果']])if(p[key]!==undefined&&n(key)!==100)add(`${name}为原来的 ${n(key)}%`);
      add(`可用 ${n('次数')} 次`);break;
    case 'move.knockback':add(`击退 ${n('距离区')} 区`);break;
    case 'move.pull':if(p.援护牵引)add('援护同伴');add(`拉近 ${n('距离区')} 区`);break;
    case 'move.teleport':add(`${label('目的')}，最多 ${n('距离区')} 区`);break;
    case 'move.flight':add(`${label('高度')}飞行`);break;
    case 'move.pursuit':add(`追击距离 ${n('距离区')} 区`);add(p.需要自身标记&&'须先由自己标记目标');break;
    case 'move.approach':add(`施放前接近 ${n('距离区')} 区`);add('先付清代价，再接近并检查触及与命中');break;
    case 'zone.hazard':add(n('骰数')>0&&`${formula} ${label('类型')}伤害`);add(n('移动修正')!==0&&`区域内移动 ${signed(n('移动修正'))}`);break;
    case 'zone.wall':add('阻挡路径，可被攻击破坏；世界时间墙体在原场景保留');add(`耐久 ${n('耐久')}`);add(`阻挡${label('阻挡')}`);break;
    case 'zone.obscure':add(`遮蔽强度 ${n('强度')}`);break;
    case 'domain.field':if(p.触发次数)add('全场共可触发 '+n('触发次数')+' 次，每名目标每回合至多一次');add(`半径 ${n('半径区')} 区`);add(`领域强度 ${n('领域强度')}`);add(p.跟随施术者?'随施术者移动':'固定在施展位置');add(`${label('触发时机')}时触发`);if(p.阵营规则&&p.阵营规则!=='自动')add(`作用于${label('阵营规则')}`);break;
    case 'summon.entity':if(p.天生招式)add('天生招式 · '+p.天生招式.map((s:any)=>s.名称).join('、'));if(p.接受指令)add('可单独下达指令');add(`召唤 ${n('数量')} 个${label('模板')}`);add(`生命为${p.继承能力?'自身':'召唤物基础值'}的 ${n('生命百分比')}%`);if(p.继承能力){add(n('属性继承百分比')>0&&`继承自身 ${n('属性继承百分比')}% 属性`);add(n('魂力继承百分比')>0&&`继承自身 ${n('魂力继承百分比')}% 魂力`);if(n('技能继承数量')>0){add(`${p.固定继承?'固定继承':'继承最多'} ${n('技能继承数量')} 个技能，效果为 ${n('技能效果倍率')}%`);add(p.继承环序上限&&`仅限${p.同源继承?'本武魂':''}前 ${n('继承环序上限')} 环`);add(p.魂力分配!==undefined&&`由本体实际划拨0—${n('魂力分配')}魂力，分身按正常费用施法`);add(p.最大同时存在&&`最多同时存在 ${n('最大同时存在')} 具`);add(n('范围减伤百分比')>0&&`召唤体受到直接范围伤害减少 ${n('范围减伤百分比')}%`);add(`持续自身 ${n('持续回合')} 次行动`);add(p.排除魂骨&&'不继承魂骨技能');add(p.排除领域&&'不继承领域');}}break;
    case 'transform.sex':add(p.目标性别==='反转'?'在男性与女性身体形态之间转换':p.目标性别==='原始'?'恢复原始身体性别':`身体改为${p.目标性别==='女'?'女性':'男性'}形态`);add(`变化强度 ${n('强度')}`);add(p.变化保留==='保留'?'效果结束后仍保留身体形态':'效果结束后恢复，其他有效的身体变化仍然保留');break;
    case 'transform.form':add(label('形态'));add(n('属性加值')!==0&&`形态强化幅度 ${n('属性加值')}`);break;
    case 'transform.martial_avatar':add(n('同源启动减耗百分比')>0&&`同武魂持续加持启动消耗降低 ${n('同源启动减耗百分比')}%`);add(n('同源维持减耗百分比')>0&&`同武魂持续加持维持消耗降低 ${n('同源维持减耗百分比')}%，合计后向上取整`);add(n('属性增幅档')>0&&`六维属性各 +${n('属性增幅档')*2}`);add(n('同源范围增幅')>0&&`第${n('范围魂环序号')}魂技半径增加 ${n('同源范围增幅')} 区`);add(n('身心防御加值')>0&&`物理与魂技防御 +${n('身心防御加值')}`);add(n('基础动作增幅')>0&&`本能动作增幅 ${n('基础动作增幅')} 档`);add(n('同源魂技增幅')>0&&`同武魂魂技增幅 ${n('同源魂技增幅')} 档`);add(n('同源伤害增幅百分比')>0&&`同武魂伤害提高 ${n('同源伤害增幅百分比')}%`);add(n('同源射程增幅')>0&&`同武魂远程能力射程增加 ${n('同源射程增幅')} 区`);add(n('召唤技能效果倍率')>0&&`同源化身的继承技能数值效果提高到原技能的 ${n('召唤技能效果倍率')}%`);add(n('精神防护加值')>0&&`抵御精神类攻击与控制的相应防御、抵抗 +${n('精神防护加值')}`);add(`占用 ${n('锁定魂力')} 点魂力，每回合消耗 ${n('每回合魂力')} 点`);add(p.禁用其他武魂&&'维持期间不能切换其他武魂');break;
    case 'status.limited_followup':add(`获得 ${n('层数')} 次追击，每回合最多触发 ${n('每回合上限')} 次`);add(`同武魂攻击命中后，消耗一次追击，追加 ${formula} ${label('类型')}伤害；未命中不消耗`);add('追击可被驱散，合流使用后不能再次追击');break;
    case 'payload.stack_confluence':add(`一次收束同武魂至多 ${n('最大数量')} 次剩余追击，按其实际伤害加入本次单体攻击`);add('出剑时消耗，未命中不退回；本次不再另触发日常追击');break;
    case 'status.next_check_penalty':add(`下一次${label('检定')}检定 ${signed(n('数值'))}，最多生效 ${n('次数')} 次`);add(p.命中后抵抗&&`命中后仍可进行${label('抵抗属性')}抵抗，成功则免受干扰`);break;
    case 'status.battle_resource':add(`本场积累${p.名称??'战斗蓄能'}，最多 ${n('容量')} 份`);add(p.归属==='本体'?'本体与合法化身的对应贡献汇入本体':'由实际施术者持有');for(const rule of p.事件规则??[]){const event=({'charges-created':'对应追击凝成或刷新时','action-hit':'对应招式每次实际命中一名敌人时','action-release':'对应招式出手时','confluence':'对应追击合流时'} as Record<string,string>)[rule.事件]??'对应动作发生时';add(`${event}，${rule.数量==='实际'?'按实际数量增加':`增加 ${rule.数量} 份`}`);}add('战斗结束清空');break;
    case 'payload.resource_damage':add(`消耗本场全部对应蓄能，基础 ${formula} ${label('类型')}伤害`);add(`每份额外 ${n('每层骰数')}d${n('骰面')}${n('每层加值')?signed(n('每层加值')):''}，最多计入 ${n('最大计入层数')} 份`);add(`至少需要 ${n('最低层数')} 份；按一次正常攻击命中与防护结算`);break;
    case 'payload.resource_endstate':add(`发动后${p.承担者==='本体'?'本体':'施术者'}生命至多保留 ${n('生命终值')} 点，魂力至多保留 ${n('魂力终值')} 点`);add('无论命中与否均承担，已死亡者不会因此复活');break;
    case 'payload.zone_dispel':add(`驱散自身 ${n('半径区')} 区内最多 ${n('最大数量')} 处可驱散的${label('类别')}区域`);break;
    case 'reaction.counter':add(`可反制 ${n('次数')} 次，强度 ${n('强度')}`);break;
    case 'reaction.interpose':add('代挡 '+n('距离区')+' 区内一名友方受到的单体攻击，由守护者接受命中检定和伤害');add('可代挡 '+n('次数')+' 次');break;
    case 'payload.recon':add((n('道路距离')?'巡查所在地点或相邻地点':'巡查所在地点')+'，最多回报 '+n('最大情报')+' 条见闻');break;
    case 'reaction.reflect':add(`可生效 ${n('次数')} 次`);add(`反射 ${n('反射百分比')}% 伤害，最远 ${n('最大距离区')} 区`);maxSkill();add(n('吸收转护盾百分比')>0&&`所受生命伤害的 ${n('吸收转护盾百分比')}% 转为护盾`);add(n('吸收转魂力百分比')>0&&`所受生命伤害的 ${n('吸收转魂力百分比')}% 转为魂力`);break;
    case 'sustain.maintain':add(n('锁定魂力')>0&&`本层占用 ${n('锁定魂力')} 点魂力`);if(p.计费方式==='逐目标'){add(`每人启动 ${n('启动魂力')} 魂力，每人每回合 ${n('每回合魂力')} 魂力`);add(`离开 ${n('维持距离区')} 区加持范围后结束`);}else add(n('每回合魂力')>0&&`每回合消耗 ${n('每回合魂力')} 点魂力`);break;
  }
  if(id==='summon.entity'&&p.魂力分配!==undefined&&!p.固定继承)add(`从自身实际分配至多 ${n('魂力分配')} 点魂力；可选择第 ${n('继承环序上限')} 环及以前已掌握的技能`);
  if(p.覆盖全部)add('覆盖范围内全部合法目标');
  if(p.命中后抵抗)add(`命中后另以${label('抵抗属性')}抵抗此效果，不影响已造成的伤害`);
  if(p.领域触发)add(p.领域触发==='范围内'?'仅在领域内持续生效，离开后移除':`仅在领域${p.领域触发}时结算`);
  if(p.冷却起点==='结束')add('停止维持后开始冷却');
  if(p.同源命中加值)add(`同源魂技命中 +${n('同源命中加值')}`);
  if(p.同源难度加值)add(`同源魂技抵抗难度 +${n('同源难度加值')}`);
  if(id==='transform.martial_avatar')add('维持至本场战斗结束；供魂不足、失能或主动结束时解除');
  else if(p.持续方式==='来源维持')add('持续至停止供魂、失能、离场或战斗结束');
  else if(p.持续方式==='来源下回合')add('持续至施术者下次行动');
  else if(p.持续方式==='世界分钟')add(`持续 ${n('持续分钟')} 分钟，战斗结束后继续计时`);
  else if(p.持续方式==='来源有效')add('维持期间持续生效');
  else if(n('持续回合')>0&&p.领域触发!=='范围内'&&!(id==='summon.entity'&&p.继承能力))add(`持续 ${n('持续回合')} 回合`);
  if(p.来源依赖&&p.来源依赖!=='独立')add(`依赖${p.来源依赖}`);
  if(['zone.wall','summon.entity'].includes(id)&&p.持续方式==='世界分钟')add(`持续 ${n('持续分钟')} 分钟，可主动解除，施术者死亡时消散`);
  return rows;
}
