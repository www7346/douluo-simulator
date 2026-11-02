(function attachOpeningTalents(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SoulTalentCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createOpeningTalents() {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  // Experimental creation-risk prices. They do not alter existing talent/item prices.
  const SITUATION_POINT_CAP=24;
  const SITUATIONS=Object.freeze({
    estate:{id:'estate',name:'有争议的遗产',points:12,deposit:180,days:3,fee:120,reward:600,contact:'许承安',archetype:'opening-agent',identity:'遗产经办人',description:'一份遗产尚待清偿旧账。你已交出180金保证金，三日内在诺丁城支付120金即可办结；放弃或逾期失去保证金。',storyBenefit:'办结后领取600金遗产，另退保证金。',pointBenefit:'将遗产份额用于早年的资质培养，增加12点；办结只退保证金。',next:'到诺丁城找经办人处理遗产。'},
    debt:{id:'debt',name:'尚未偿还的人情债',points:6,deposit:0,days:5,fee:250,lateFee:60,advance:150,contact:'顾清禾',archetype:'opening-agent',identity:'旧日资助人',description:'你曾受人资助，尚欠250金币。请在五日内到诺丁城归还；逾期加收60金币。',storyBenefit:'现在收到150金周转资助，债务仍须归还。',pointBenefit:'资助已用于早年的资质培养，增加6点，不再领取周转金。',next:'筹备款项后到诺丁城归还债务。'},
    referral:{id:'referral',name:'附条件的同行引荐',points:6,deposit:80,days:3,discount:100,contact:'陆照野',archetype:'hunter',identity:'受引荐的猎魂向导',description:'你为一次猎魂引荐交出80金约见保证金。三日内到诺丁城见面退还保证金，之后可按原雇佣规则邀请；未赴约失去保证金。',storyBenefit:'见面后首次雇佣减免100金；仍须支付余款且占同行名额。',pointBenefit:'引荐前的训练增加6点，见面后雇佣按通常价格。',next:'去诺丁城拜访向导，或继续自己准备猎魂。'},
    delivery:{id:'delivery',name:'一件受托的随身物',points:6,deposit:100,days:4,reward:120,contact:'沈听澜',archetype:'opening-agent',identity:'受托物收件人',description:'你携带一枚封缄铜匣，所有权仍属收件人，并交出100金保证金。四日内到诺丁城交还退保证金；逾期或放弃损失保证金，物品仍须归还。',storyBenefit:'按时交付另得120金酬劳。',pointBenefit:'此前准备与磨炼增加6点，按时交付只退保证金。',next:'将铜匣送到诺丁城；可以先备好旅途用品。'}
  });
  function inspectSituations(input=[]){
    const errors=[],selection=[],ids=new Set(),names=new Set();
    if(!Array.isArray(input)||input.length>4)return {pass:false,errors:['开局处境须为至多四项的列表'],selection:[],pointBonus:0,depositTotal:0,advanceTotal:0};
    for(const value of input){
      if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['id','benefit','contactName'].includes(k))||!Object.hasOwn(SITUATIONS,value.id)||!['points','story'].includes(value.benefit)){errors.push('处境方案含有未接入的类型、收益或参数');continue;}
      const definition=SITUATIONS[value.id],name=value.contactName===undefined?definition.contact:value.contactName;
      if(typeof name!=='string'||!name.trim()||name.length>20){errors.push('处境联系人须有1至20字姓名');continue;}
      if(ids.has(value.id))errors.push('同一来源的处境负担不能重复换取收益');ids.add(value.id);
      if(names.has(name.trim()))errors.push('不同处境联系人重名，请修改姓名以免混淆');names.add(name.trim());
      selection.push({id:value.id,benefit:value.benefit,contactName:name.trim()});
    }
    const pointBonus=selection.reduce((n,v)=>n+(v.benefit==='points'?SITUATIONS[v.id].points:0),0);
    if(pointBonus>SITUATION_POINT_CAP)errors.push(`处境补偿合计${pointBonus}点，超过实验上限${SITUATION_POINT_CAP}；请改选收益，不会自动删除其他设定`);
    return {pass:errors.length===0,errors,selection,pointBonus,depositTotal:selection.reduce((n,v)=>n+SITUATIONS[v.id].deposit,0),advanceTotal:selection.reduce((n,v)=>n+(v.benefit==='story'?SITUATIONS[v.id].advance??0:0),0)};
  }
  const TALENTS = Object.freeze({
    'ring-choice': Object.freeze({id:'ring-choice',name:'灵光一现',cost:12,description:'每次吸收魂环，最多增加一套不同魂技方案；以魂环能形成的能力为准。'}),
    'craft-choice': Object.freeze({id:'craft-choice',name:'匠心巧思',cost:10,description:'每次研发魂导器，最多增加一份不同作品；以材料能形成的方案为准。'}),
    reroll: Object.freeze({id:'reroll',name:'时来运转',cost:18,description:'每次选取魂技或研发魂导器，可重抽指定方案一次。'})
  });
  const GODS = Object.freeze({asura:'修罗神',rakshasa:'罗刹神',sea:'海神',angel:'天使神',food:'食神','nine-color':'九彩神女'});
  const MILLION_SOURCES = Object.freeze({'deep-sea-whale':'深海魔鲸王','dream-iceworm':'天梦冰蚕'});
  const BOON_SOURCES = Object.freeze(Object.fromEntries([
    ['asura','修罗神',['物理','灵魂','精神'],['melee','armor_break','fear'],'右臂骨','杀意凝锋'],
    ['rakshasa','罗刹神',['暗','灵魂','精神'],['debuff','blind','fear'],'头骨','幽影侵扰'],
    ['sea','海神',['水','光'],['projectile','entangle','shield'],'躯干骨','潮汐护身'],
    ['angel','天使神',['光','火'],['projectile','burn','cleanse','shield'],'头骨','圣光净化'],
    ['nine-color','九彩玄女',['光'],['buff','shield'],'头骨','彩光增幅'],
    ['food','食神',['生命'],['heal','cleanse','buff'],'躯干骨','食气养元'],
    ['azure-python','大明·天青牛蟒',['雷'],['debuff','projectile','armor_break'],'右臂骨','迟滞雷息'],
    ['titan-ape','二明·泰坦巨猿',['物理','土'],['melee','armor_break','debuff'],'左臂骨','厚土震击'],
    ['soft-rabbit','柔骨兔',['物理'],['melee','movement','buff'],'左臂骨','轻灵柔步'],
    ['blue-silver-emperor','蓝银皇',['木','生命'],['entangle','heal','shield'],'右腿骨','生息回流'],
    ['dream-iceworm','天梦冰蚕',['精神','冰'],['sensory','debuff','sleep','freeze'],'头骨','梦息感知'],
    ['deep-sea-whale','深海魔鲸王',['水','雷'],['projectile','burst','shield'],'躯干骨','海渊屏障']
  ].map(([id,name,attributes,channels,slot,skillName])=>[id,Object.freeze({id,name,attributes,channels:channels.map(v=>'channel.'+v),tags:[name,...attributes],slot,skillName})])));
  function opportunityGold(kind){return OPPORTUNITIES[kind]?.gold??0;}
  const OPPORTUNITIES = Object.freeze({
    'boon-ring':Object.freeze({id:'boon-ring',name:'恩赐魂环',cost:10,years:423,description:'从十二份馈赠中选择一枚423年魂环，借取神祇或灵兽的一缕力量。'}),
    'boon-bone':Object.freeze({id:'boon-bone',name:'恩赐魂骨',cost:12,years:500,description:'选择一块500年魂骨，将其中的独特力量融入自身。'}),
    'starter-supplies':Object.freeze({id:'starter-supplies',name:'启程补给',cost:8,gold:1200,description:'铜纹护腕、青玉坠、九颗丹药与1200金魂币，伴你踏上猎魂之旅。'}),
    'attuned-423': Object.freeze({id:'attuned-423',name:'百年契缘（423年）',cost:5,years:423,enabled:false,hidden:true,description:'已由恩赐魂环替代。'}),
    divine: Object.freeze({id:'divine',name:'神赐机缘',cost:70,years:100000,enabled:true,description:'获得一枚100000年神赐魂环，保留两项魂技资格；按当前等级与可用环强度释放力量，七环强度可释放完整原生力量。'}),
    sacrifice: Object.freeze({id:'sacrifice',name:'十万年献祭',cost:70,years:100000,enabled:true,description:'获得一枚100000年献祭魂环，保留两项魂技资格；按当前等级与可用环强度释放力量，七环强度可释放完整原生力量。'}),
    million: Object.freeze({id:'million',name:'百万年奇遇',cost:90,years:1000000,enabled:true,description:'选择一枚1000000年魂环，保留四项魂技资格；初期可使用已掌握的弱档，随等级与魂环成长逐步释放，九环强度可释放完整原生力量。'})
  });
  const MASTER_GIFTS = Object.freeze({
    'attuned-100':Object.freeze({id:'attuned-100',name:'大师之赐',years:100,attuned:true,description:'百年 · 献祭 · 契合所选武魂'}),
    'bamboo-10':Object.freeze({id:'bamboo-10',name:'孤竹魂环·初试',years:10,attuned:false,description:'十年 · 孤竹 · 以坚韧见长'}),
    'bamboo-423':Object.freeze({id:'bamboo-423',name:'孤竹魂环·极境',years:423,attuned:false,description:'百年 · 孤竹 · 四百二十三年'})
  });
  const MILLION_DETAILS={
      'deep-sea-whale':{channels:['channel.beam', 'channel.burst', 'channel.drain', 'channel.soul-interference', 'channel.shield', 'channel.resistance'],name:'深海魔鲸王',attributes:['水','雷','灵魂'],tags:['鲸','冲击','力量','能量','精神','吞噬']},
      'dream-iceworm':{channels:['channel.freeze', 'channel.sleep', 'channel.sensory', 'channel.charm', 'channel.shield'],name:'天梦冰蚕',attributes:['冰','精神'],tags:['冰蚕','精神','梦境','感知','寒冰']}
    };
  const DIVINE_DETAILS={
      asura:{channels:['channel.armor_break', 'channel.debuff', 'channel.fear', 'channel.beam'],attributes:['毁灭','金','精神'],tags:['杀气','穿刺','力量','猎杀']},
      rakshasa:{channels:['channel.poison', 'channel.debuff', 'channel.drain', 'channel.soul-interference'],attributes:['暗','死亡','毒蚀','灵魂'],tags:['腐蚀','黑暗','灵魂','毒素']},
      sea:{channels:['channel.beam', 'channel.burst', 'channel.shield', 'channel.resistance'],attributes:['水','光'],tags:['水流','能量','冲击','守护']},
      angel:{channels:['channel.beam', 'channel.burn', 'channel.cleanse', 'channel.flight', 'channel.shield', 'channel.heal'],attributes:['光','火'],tags:['神圣','光明','净化','飞行']},
      food:{channels:['channel.heal', 'channel.cleanse', 'channel.buff'],attributes:['生命'],tags:['食物','生命','再生','恢复']},
      'nine-color':{channels:['channel.buff', 'channel.shield', 'channel.heal', 'channel.resistance'],attributes:['光','生命'],tags:['增幅','守护','生命','能量']}
    };
  function sourceDetails(item){return ['boon-ring','boon-bone'].includes(item?.kind)?clone(BOON_SOURCES[item.sourceId]??{}):item?.kind==='million'?clone(MILLION_DETAILS[item.sourceId]??{}):item?.kind==='divine'?clone(DIVINE_DETAILS[item.sourceId]??{}):null;}
  const emptySelection = () => ({version:1,talentIds:[],opportunities:[]});
  function inspectSelection(input, options={}) {
    const errors=[];
    const plain=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
    if(!plain(input)||input.version!==1)return {pass:false,errors:['天赋选择格式不受支持，请使用当前版本创建角色'],selection:emptySelection(),talentCost:0,opportunityCost:0};
    if(Object.keys(input).some(key=>!['version','talentIds','opportunities'].includes(key)))errors.push('天赋选择含有不支持的内容');
    const talentIds=Array.isArray(input.talentIds)?input.talentIds:[];
    const opportunities=Array.isArray(input.opportunities)?input.opportunities:[];
    if(!Array.isArray(input.talentIds)||!Array.isArray(input.opportunities))errors.push('请检查天赋与机缘选择');
    if(talentIds.some(id=>typeof id!=='string'||!Object.hasOwn(TALENTS,id)))errors.push('所选天赋不存在');
    if(new Set(talentIds).size!==talentIds.length)errors.push('相同天赋只能选择一次');
    const kinds=[];
    for(const item of opportunities){
      if(!plain(item)||!Object.hasOwn(OPPORTUNITIES,item.kind)){errors.push('所选机缘不存在');continue;}
      kinds.push(item.kind);
      if(options.purchase!==false&&OPPORTUNITIES[item.kind].enabled===false)errors.push(OPPORTUNITIES[item.kind].name+'暂时停用，请取消选择');
      if(['boon-ring','boon-bone'].includes(item.kind)&&!Object.hasOwn(BOON_SOURCES,item.sourceId))errors.push('请选择恩赐来源');
      if(item.kind==='starter-supplies'&&item.sourceId!==undefined)errors.push('启程补给无需选择来源');
      if(Object.keys(item).some(key=>!['kind','sourceId'].includes(key)))errors.push('机缘选择含有不支持的内容');
      if(item.kind==='divine'&&!Object.hasOwn(GODS,item.sourceId))errors.push('请选择神赐来源');
      if(item.kind==='million'&&!Object.hasOwn(MILLION_SOURCES,item.sourceId))errors.push('请选择百万年魂环来源');
      if(item.kind==='sacrifice'&&item.sourceId!==undefined)errors.push('献祭来源将在选择武魂后生成');
      if(item.kind==='attuned-423'&&item.sourceId!==undefined)errors.push('契合来源将在使用时选择武魂后生成');
    }
    if(new Set(kinds).size!==kinds.length)errors.push('相同机缘只能选择一次');
    const legalIds=[...new Set(talentIds.filter(id=>typeof id==='string'&&Object.hasOwn(TALENTS,id)))];
    const legalKinds=[...new Set(kinds)];
    return {pass:errors.length===0,errors,selection:clone(input),talentCost:legalIds.reduce((sum,id)=>sum+TALENTS[id].cost,0),opportunityCost:legalKinds.reduce((sum,id)=>sum+OPPORTUNITIES[id].cost,0)};
  }
  function grant(selection,unitId) {
    const checked=inspectSelection(selection);
    if(!checked.pass)throw new Error(checked.errors.join('；'));
    return {version:2,talentIds:clone(selection.talentIds)};
  }
  function record(state,unitId=state?.角色?.主控单位ID) {return state?.战斗单位?.列表?.[unitId]?.扩展?.openingTalents;}
  function ringItemName(item) {
    if(item.kind==='boon-ring')return (Object.hasOwn(GODS,item.sourceId)?'神赐魂环·':'灵兽之赐·')+BOON_SOURCES[item.sourceId]?.name.replace(/神$/,'');
    if(item.kind==='boon-bone')return BOON_SOURCES[item.sourceId]?.skillName+'·'+BOON_SOURCES[item.sourceId]?.slot;
    if(item.kind==='starter-supplies')return '启程补给';
    if(item.kind==='attuned-423')return '423年契合魂环';
    if(item.kind==='master-gift')return MASTER_GIFTS[item.sourceId]?.name??'大师赠环';
    const source=item.kind==='million'?MILLION_SOURCES[item.sourceId]:item.kind==='divine'?GODS[item.sourceId]:'';
    return item.kind==='divine'?source+'神赐魂环':item.kind==='million'?source+'·百万年魂环':'十万年献祭魂环';
  }
  function has(state,id,unitId=state?.角色?.主控单位ID) {return Boolean(record(state,unitId)?.talentIds?.includes(id));}
  function opportunityName(item) {
    const name=OPPORTUNITIES[item?.kind]?.name??'机缘';
    const source=item?.kind==='million'?MILLION_SOURCES[item.sourceId]:item?.kind==='divine'?GODS[item.sourceId]:'';
    return source?`${name} · ${source}`:name;
  }
  return Object.freeze({VERSION:1,SITUATIONS,SITUATION_POINT_CAP,inspectSituations,TALENTS,GODS,MILLION_SOURCES,BOON_SOURCES,OPPORTUNITIES,MASTER_GIFTS,MILLION_DETAILS,DIVINE_DETAILS,ringItemName,sourceDetails,emptySelection,opportunityGold,inspectSelection,grant,record,has,opportunityName});
});
