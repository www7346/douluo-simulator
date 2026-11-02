(function attach(root,factory){
  const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulEquipmentAffixes=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SIX_KEYS=Object.freeze(['力量','身法','体魄','悟性','感知','意志']);
  const SIX_LIMITS=Object.freeze({perAttribute:4,perItem:6,totalPerAttribute:6});
  function attributeCost(value){
    if(!Number.isInteger(value)||value<0||value>SIX_LIMITS.perAttribute)throw new Error('单件装备每项六维加成必须为 0 至 4 点');
    return 120*value*value;
  }
  function priceAttributes(values={}){
    let points=0,cost=0;
    for(const [key,value] of Object.entries(values)){
      if(!SIX_KEYS.includes(key))throw new Error('未登记的六维属性：'+key);
      cost+=attributeCost(value);points+=value;
    }
    if(points>SIX_LIMITS.perItem)throw new Error('单件装备六维加成合计不能超过 6 点');
    return cost;
  }
  function attributeAllowance(budget){let n=0;for(let i=1;i<=SIX_LIMITS.perAttribute&&attributeCost(i)<=budget;i++)n=i;return n;}
  function attributeTotals(raw={}){
    const values={},excess={};
    for(const key of SIX_KEYS){const n=Number(raw[key]??0);values[key]=Math.min(SIX_LIMITS.totalPerAttribute,n);if(n>values[key])excess[key]=n-values[key];}
    return {raw:{...raw},values,excess};
  }
  // Aggregate only unconditional equipment affixes. Active skills and timed statuses
  // retain their own execution order and are never combined by this helper.
  function mergedEquipmentNodes(graph){
    const nodes=[],byKey=new Map();
    for(const node of graph?.nodes??[]){
      const key=node.effectId==='passive.equipment_stat'?node.effectId+':'+node.params.属性:node.effectId==='passive.element_amplify'?node.effectId+':'+node.params.类型:null;
      if(!key){nodes.push(node);continue;}
      if(byKey.has(key))byKey.get(key).params.数值+=node.params.数值;
      else {const copy={...node,params:{...node.params}};byKey.set(key,copy);nodes.push(copy);}
    }
    return nodes;
  }
  const definition=(role,kind,unitCost,max,totalCap,attributes,channels,quadratic=0)=>Object.freeze({role,kind,unitCost,max,totalCap,attributes,channels,quadratic});
  // Prices are permanent ownership prices, not timed status.buff prices.
  const REGISTRY=Object.freeze({
    物理防御:definition('armor','防具',90,6,6,['金','土','物理'],['shield','buff'],50),
    魂技防御:definition('mind-guard','防具',90,6,6,['灵魂','光','精神','阴'],['shield','buff','status-guard'],50),
    生命上限:definition('vitality','防具',12,400,800,['生命','木','水'],['heal','buff']),
    魂力上限:definition('soul-capacity','饰品',12,300,600,['灵魂','光','生命','水'],['resource','drain','heal','buff']),
    普通攻击命中:definition('accuracy','武器',120,6,6,['物理','金','风'],['melee','projectile','buff'],30),
    魂技攻击命中:definition('soul-accuracy','武器',120,6,6,['火','雷','冰','光','精神','灵魂','空间','阳','淫'],['projectile','buff'],30),
    普通攻击伤害:definition('strike','武器',50,40,60,['物理','金','火','雷','毁灭','阳'],['melee','projectile','buff']),
    固定减伤:definition('reduction','防具',90,12,18,['土','金','物理'],['shield'],15),
    先攻:definition('initiative','饰品',60,6,10,['风','雷','空间'],['movement','buff','teleport']),
    移动区:definition('mobility','饰品',180,2,3,['风','雷','时间'],['movement','buff']),
    开战护盾:definition('opening-shield','防具',5,200,400,['土','金','木','生命','阴'],['shield'])
  });
  const ROLE_LABELS=Object.freeze({'attribute-build':'六维强化','element-amplify':'属性伤害增幅',armor:'护甲强化','mind-guard':'魂技防御',vitality:'生命储备','soul-capacity':'魂力储备',accuracy:'精准攻击','soul-accuracy':'魂技命中',strike:'普通攻击强化',reduction:'伤害减免',initiative:'抢占先机',mobility:'步法强化','opening-shield':'开战护盾','element-defense':'属性防护','status-defense':'状态防护'});
  const FORMS=Object.freeze([
    {id:'soul-gun',bodyGroup:'hand',bodyLabel:'手持',name:'魂导枪',kind:'武器',aliases:['魂导枪','枪']},
    {id:'soul-cannon',bodyGroup:'hand',bodyLabel:'手持',name:'魂导炮',kind:'武器',aliases:['魂导炮','炮']},
    {id:'attack-bracer',bodyGroup:'arm',bodyLabel:'臂腕',name:'攻击护腕',kind:'武器',aliases:['攻击护腕']},
    {id:'guard-pendant',bodyGroup:'neck',bodyLabel:'颈部',name:'防御挂坠',kind:'防具',aliases:['防御挂坠']},
    {id:'dagger',bodyGroup:'hand',bodyLabel:'手持',name:'短刀',kind:'武器',aliases:['刀','刃']},
    {id:'robe',bodyGroup:'chest',bodyLabel:'胸背',name:'护身衣',kind:'防具',aliases:['衣','袍']},
    {id:'sword',bodyGroup:'hand',bodyLabel:'手持',name:'长剑',kind:'武器',aliases:['剑','刀','武器']},
    {id:'spear',bodyGroup:'hand',bodyLabel:'手持',name:'长枪',kind:'武器',aliases:['长枪','龙枪','矛']},
    {id:'armor',bodyGroup:'chest',bodyLabel:'胸背',name:'战甲',kind:'防具',aliases:['斗铠','战甲','铠甲']},
    {id:'staff',bodyGroup:'hand',bodyLabel:'手持',name:'短杖',kind:'武器',aliases:['杖']},
    {id:'bracer',bodyGroup:'arm',bodyLabel:'臂腕',name:'护腕',kind:'防具',aliases:['护腕','臂甲']},
    {id:'breastplate',bodyGroup:'chest',bodyLabel:'胸背',name:'护心镜',kind:'防具',aliases:['护心镜','胸甲','铠甲','防具']},
    {id:'helm',bodyGroup:'head',bodyLabel:'头部',name:'战盔',kind:'防具',aliases:['头盔','战盔']},
    {id:'pendant',bodyGroup:'waist',bodyLabel:'腰间',name:'腰佩',kind:'饰品',aliases:['腰佩','玉佩','腰带']},
    {id:'boots',bodyGroup:'feet',bodyLabel:'足部',name:'轻履',kind:'饰品',aliases:['靴','鞋','履']},
    {id:'crown',bodyGroup:'head',bodyLabel:'头部',name:'额冠',kind:'饰品',aliases:['额冠','发簪','头饰']},
    {id:'necklace',bodyGroup:'neck',bodyLabel:'颈部',name:'项链',kind:'饰品',aliases:['项链','颈饰','饰品']},
    {id:'gloves',bodyGroup:'hands',bodyLabel:'双手',name:'手套',kind:'手套',aliases:['手套','拳套']},
    {id:'bracelet',bodyGroup:'arm',bodyLabel:'臂腕',name:'手环',kind:'饰品',aliases:['手环','手镯','指环','戒指']}
  ]);
  const channelsOf=channels=>channels.map(x=>String(x));
  function permitted(key,attributes,channels,catalog){
    const d=REGISTRY[key];if(!d)return false;
    const ids=channelsOf(channels).map(token=>Object.values(catalog).find(c=>c.id===token||c.name===token)?.id??token);
    return d.attributes.some(a=>attributes.includes(a))&&d.channels.some(c=>ids.includes('channel.'+c));
  }
  const ELEMENT_LIMITS=Object.freeze({step:5,perItem:30,total:60});
  function elementPrice(percent){
    if(!Number.isInteger(percent)||percent<5||percent>30||percent%5)throw new Error('单件属性伤害增幅必须为 5% 至 30%，每档 5%');
    const k=percent/5;return 90*k+30*k*k;
  }
  function elementPermitted(type,attributes,channels,catalog){
    return attributes.includes(type)&&channels.some(token=>{
      const c=Object.values(catalog).find(c=>c.id===token||c.name===token);
      return c&&(c.id==='channel.buff'||c.effectIds.some(id=>['payload.damage','payload.drain'].includes(id))||type==='火'&&c.effectIds.includes('status.burn')||type==='毒蚀'&&c.effectIds.includes('status.poison'));
    });
  }
  function elementsFromGraph(graph){
    const values={};for(const node of mergedEquipmentNodes(graph))if(node.effectId==='passive.element_amplify'){elementPrice(node.params.数值);values[node.params.类型]=node.params.数值;}return values;
  }
  function price(key,value){
    const d=REGISTRY[key];
    if(!d||!Number.isInteger(value)||value<1||value>d.max)throw new Error('装备词条参数超出范围：'+key);
    return d.unitCost*value+d.quadratic*value*value;
  }
  function allowance(key,budget){let n=0;for(let i=1;i<=REGISTRY[key].max&&price(key,i)<=budget;i++)n=i;return n;}
  function totals(raw={}){
    const values={},excess={};
    for(const [key,d] of Object.entries(REGISTRY)){values[key]=Math.max(0,Math.min(d.totalCap,Number(raw[key]??0)));if(Number(raw[key])>d.totalCap)excess[key]=Number(raw[key])-d.totalCap;}
    return {values,excess};
  }
  function valuesFromGraph(graph){const values={};for(const node of mergedEquipmentNodes(graph))if(node.effectId==='passive.equipment_stat'){const k=node.params?.属性;price(k,node.params?.数值);values[k]=node.params.数值;}return values;}
  function classes(candidate,costForNode){
    const attributes=priceAttributes(candidate.modifiers?.attributes??{});
    if(candidate.sourceKind==='soul-device'){
      const nodes=candidate.effectGraph?.nodes??[],attack=nodes.some(n=>['payload.damage','payload.drain'].includes(n.effectId)),defense=nodes.some(n=>['payload.shield','status.resistance_shift','status.status_guard'].includes(n.effectId));
      const total=attributes+nodes.reduce((n,node)=>n+costForNode(node.effectId,node.params,{activation:'active'}),0);
      return {total,attack:attack?total:0,defense:defense?total:0,attributes,elementCore:0,kinds:attack?['武器']:defense?['防具','饰品']:['饰品']};
    }
    let total=attributes,attack=0,defense=0,elementCore=0,battleResource=0;
    for(const node of mergedEquipmentNodes(candidate.effectGraph)){const cost=costForNode(node.effectId,node.params,{activation:'passive'});total+=cost;
      const kind=node.effectId==='passive.equipment_stat'?REGISTRY[node.params.属性]?.kind:['status.resistance_shift','status.status_guard'].includes(node.effectId)?'防具':'';
      if(kind==='武器')attack+=cost;if(kind==='防具')defense+=cost;
      if(node.effectId==='passive.element_amplify'||node.effectId==='status.resistance_shift'&&node.params.模式!=='易伤')elementCore+=cost;
      if(node.effectId==='status.battle_resource')battleResource+=cost;
    }
    const balanced=attack>0&&defense>0&&attack+defense>=total*.8&&Math.min(attack,defense)>=(attack+defense)*.4;
    return {total,attack,defense,attributes,elementCore,kinds:[...(attack>0&&attack>=total*.6?['武器']:[]),...(defense>0&&defense>=total*.6?['防具']:[]),...(elementCore>0&&elementCore>=total*.5||battleResource>0&&battleResource>=total*.6?['饰品']:[]),...(balanced?['手套']:[])]};
  }
  function formsFor(candidate,costForNode){
    const types=classes(candidate,costForNode).kinds,requested=candidate.equipmentKind??'自动';
    // A qualified offensive/defensive work is presented as that class in auto mode.
    const kinds=requested==='自动'?(types.length>1?types.filter(k=>k!=='饰品'):types):types.filter(k=>k===requested);
    return FORMS.filter(f=>kinds.includes(f.kind)&&(candidate.sourceKind==='soul-device'||!['soul-gun','soul-cannon'].includes(f.id)));
  }
  function assignForms(candidates,excluded=[],costForNode,concept='',seed=0){
    const group=(c,f)=>`${c.sourceKind==='soul-device'?'active:':''}${f.bodyGroup}`,kind=(c,f)=>`${c.sourceKind==='soul-device'?'active:':''}${f.kind}`;
    const used=new Set(excluded.filter(c=>c.fixedForm).map(c=>group(c,c.fixedForm))),kinds=new Set(excluded.filter(c=>c.fixedForm).map(c=>kind(c,c.fixedForm))),ids=new Set(excluded.map(c=>c.fixedForm?.id).filter(Boolean)),result=[];
    function visit(i){if(i===candidates.length)return true;
      const forms=formsFor(candidates[i],costForNode).filter(f=>!['attack-bracer','guard-pendant'].includes(f.id)).sort((a,b)=>Number(b.aliases.some(x=>concept.includes(x)))-Number(a.aliases.some(x=>concept.includes(x))));
      const preferred=forms.filter(f=>f.aliases.some(x=>concept.includes(x))),rest=forms.filter(f=>!preferred.includes(f));
      const rotated=rest.length?[...rest.slice(seed%rest.length),...rest.slice(0,seed%rest.length)]:[];
      for(const f of [...preferred,...rotated])if(!used.has(group(candidates[i],f))&&!kinds.has(kind(candidates[i],f))&&!ids.has(f.id)){used.add(group(candidates[i],f));kinds.add(kind(candidates[i],f));ids.add(f.id);result[i]={...candidates[i],equipmentKind:f.kind,fixedForm:{id:f.id,bodyGroup:f.bodyGroup,bodyLabel:f.bodyLabel,name:f.name,kind:f.kind}};
        if(visit(i+1))return true;used.delete(group(candidates[i],f));kinds.delete(kind(candidates[i],f));ids.delete(f.id);
      }return false;
    }return visit(0)?result:null;
  }
  function validateForm(candidate,costForNode){
    const f=candidate.fixedForm;
    try{return Boolean(f&&formsFor(candidate,costForNode).some(x=>x.id===f.id&&x.kind===f.kind&&x.name===f.name&&x.bodyGroup===f.bodyGroup));}catch{return false;}
  }
  function describe(key,value){return key==='固定减伤'?'每次受到伤害时抵消 '+value+' 点，同一行动共用减免额度':key==='开战护盾'?'每场战斗开始时获得 '+value+' 点护盾':key+' +'+value;}
  function meaning(key,value){
    const scope={物理防御:'提高敌方物理攻击命中自己的门槛；命中后的伤害不因此降低',魂技防御:'提高敌方魂技攻击命中自己的门槛；不提供属性抗性或控制免疫',生命上限:'增加能容纳的生命总量；穿戴本身不恢复生命，也不自动治疗',魂力上限:'增加能容纳的魂力总量；穿戴本身不恢复魂力，也不自动回魂',普通攻击命中:'仅提高徒手普通攻击和武魂基础动作的命中；不提高魂技或暗器的命中',魂技攻击命中:'仅提高需要攻击命中检定的魂技命中率；不影响普通攻击、武魂基础动作、暗器，以及让对手抵抗的魂技难度；不是每次攻击都更精准',普通攻击伤害:'仅增加徒手普通攻击和武魂基础动作的伤害；不增加魂技、暗器或持续伤害',固定减伤:'属性抗性之后、护盾之前扣减实际受到的伤害；同一行动对同一人的多段伤害共用一次额度',先攻:'提高战斗开始时争取先行动的机会；不是必定先手或额外回合',移动区:'增加实际可移动距离；不是瞬移、飞行或闪避加值',开战护盾:'每场战斗开始时获得一次护盾；不是常驻免疫、每回合刷新或主动施放'}[key];
    return describe(key,value)+'。'+scope+'。装备时自然生效，卸下失效，无需启动器具或额外注入魂力。';
  }
  return Object.freeze({ELEMENT_LIMITS,elementPrice,elementPermitted,elementsFromGraph,SIX_KEYS,SIX_LIMITS,attributeCost,priceAttributes,attributeAllowance,attributeTotals,mergedEquipmentNodes,REGISTRY,ROLE_LABELS,FORMS,permitted,price,allowance,totals,valuesFromGraph,classes,formsFor,assignForms,validateForm,describe,meaning});
});
