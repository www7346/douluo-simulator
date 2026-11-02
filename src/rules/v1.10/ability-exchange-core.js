(function attach(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulAbilityExchange=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='2.10.0',ATTRIBUTES=['力量','身法','体魄','悟性','感知','意志'];
  const MODES=Object.freeze(['condition','linked','fixed']);
  const REGISTRY=Object.freeze({
    'status.mute':{points:3,rate:.05},'status.limb_bind':{points:5,rate:.10},
    'status.blind':{points:5,rate:.10},'status.slow':{points:2,rate:.04},
    'status.buff':{points:1,rate:.025},'status.resistance_shift':{points:4,rate:.08},
    'status.desire':{points:3,rate:.05},'ability.lock':{points:0,rate:0}
  });
  const clone=x=>JSON.parse(JSON.stringify(x));
  const integer=(x,a,b,label)=>{if(!Number.isSafeInteger(x)||x<a||x>b)throw Error(`${label}必须为${a}—${b}的整数`);return x;};
  function keys(x,allowed,label){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!allowed.includes(k)))throw Error(`${label}含未知字段或格式无效`);}
  function ids(x,label){if(!Array.isArray(x)||x.length>32||x.some(v=>typeof v!=='string'||!v)||new Set(x).size!==x.length)throw Error(`${label}无效或重复`);return [...x];}
  function normalize(input=[],kind='skill'){
    if(!Array.isArray(input)||input.length>8)throw Error('交换合同必须为至多八份的数组');
    const names=new Set(),claims=[],components=new Set();
    return input.map(c=>{
      keys(c,['id','mode','payer','burdens','benefits','durationMinutes','sourceKinds','castModeIds'],'交换合同');
      if(typeof c.id!=='string'||!c.id||names.has(c.id))throw Error('交换合同编号缺失或重复');names.add(c.id);
      if(!MODES.includes(c.mode)||c.payer!=='self')throw Error('交换模式或承担者无效');
      const durationMinutes=integer(c.durationMinutes??(c.mode==='fixed'?5:2),1,10080,'交换个人期限');
      if(!Array.isArray(c.burdens)||!c.burdens.length||c.burdens.length>16)throw Error('交换合同缺少真实负担');
      keys(c.benefits,['branchIds','componentIds'],'交换收益');
      const benefits={branchIds:ids(c.benefits.branchIds??[],'收益分支'),componentIds:ids(c.benefits.componentIds??[],'收益组件')};
      if(kind==='martialSoul'?(!benefits.componentIds.length||benefits.branchIds.length):(!benefits.branchIds.length||benefits.componentIds.length))throw Error('交换必须明确绑定对应能力收益');
      for(const id of benefits.componentIds){if(components.has(id))throw Error('同一收益组件不能重复领取交换返还');components.add(id);}
      const sourceKinds=ids(c.sourceKinds??[],'交换负面来源');
      const castModeIds=ids(c.castModeIds??[],'交换费用模式');
      if(kind==='martialSoul'&&castModeIds.length)throw Error('武魂状态交换不登记资源费用模式');
      if(sourceKinds.some(x=>!['self','person','item'].includes(x)))throw Error('交换来源种类无效');
      const burdens=c.burdens.map(b=>{
        keys(b,['effectId','params','lockedAbilities'],'交换负担');
        if(!REGISTRY[b.effectId])throw Error('该负面不能作为预算代价');
        const p=clone(b.params??{}),common=['持续方式','持续分钟','持续回合','来源依赖'];
        const own=({'status.mute':[],'status.blind':[],'status.limb_bind':['部位','姿态','层数','挣脱属性','挣脱难度加值'],'status.slow':['数值'],'status.buff':['属性','数值'],'status.resistance_shift':['类型','模式'],'status.desire':['强度'],'ability.lock':[]})[b.effectId];
        keys(p,[...common,...own],'交换负担参数');
        if(p.持续回合!==undefined)integer(p.持续回合,1,6,'负担回合');
        if(p.持续分钟!==undefined)integer(p.持续分钟,1,10080,'负担分钟');
        if(c.mode==='fixed'){if(p.持续方式!==undefined&&p.持续方式!=='世界分钟'||p.持续分钟!==undefined&&p.持续分钟!==durationMinutes||p.来源依赖!==undefined&&p.来源依赖!=='独立')throw Error('固定期限负担必须与合同个人期限一致且独立');p.持续方式='世界分钟';p.持续分钟=durationMinutes;p.来源依赖='独立';}
        if(p.持续方式!==undefined&&!['回合','世界分钟','来源有效'].includes(p.持续方式))throw Error('负担期限方式无效');
        if(p.来源依赖!==undefined&&!['独立','施术者清醒','施术武魂','道具有效'].includes(p.来源依赖))throw Error('负担来源依赖无效');
        if(b.effectId==='status.limb_bind'){
          if(!['双手','双腿','全身'].includes(p.部位))throw Error('自缚必须登记真实部位');
          p.姿态=p.姿态??'身前';if(!['身前','身后'].includes(p.姿态))throw Error('自缚姿态无效');
          p.层数=integer(p.层数??1,1,6,'拘束层数');p.挣脱难度加值=integer(p.挣脱难度加值??0,0,6,'挣脱加值');
          p.挣脱属性=p.挣脱属性??'力量';if(!['力量','身法'].includes(p.挣脱属性))throw Error('挣脱属性无效');
        }
        if(b.effectId==='status.slow')integer(p.数值,1,3,'减速强度');
        if(b.effectId==='status.buff'){if(!ATTRIBUTES.includes(p.属性))throw Error('只能抵押六维属性削弱');integer(p.数值,-6,-1,'属性削弱');}
        if(b.effectId==='status.resistance_shift'){
          if(p.模式!=='易伤'||!globalThis.SoulCombatFoundation?.DAMAGE_TYPES?.includes(p.类型))throw Error('易伤必须指定登记伤害类型');
        }
        if(b.effectId==='status.desire')integer(p.强度,1,3,'欲火强度');
        let lockedAbilities;
        if(b.effectId==='ability.lock'){
          if(!Array.isArray(b.lockedAbilities)||!b.lockedAbilities.length||b.lockedAbilities.length>32)throw Error('封锁代价必须冻结已拥有的原始能力');
          lockedAbilities=b.lockedAbilities.map(s=>{
            if(!globalThis.SoulAbilityContract?.verify(s).pass)throw Error('被封能力的原始合同无效');
            if(s.exchangeContracts?.length)throw Error('不能抵押含交换义务的能力');
            return clone(s);
          });
        }else if(b.lockedAbilities!==undefined)throw Error('只有能力封锁可以登记被封能力');
        return {effectId:b.effectId,params:p,...(lockedAbilities?{lockedAbilities}:{})};
      });
      const groups=new Set(burdens.map(burdenGroup));
      if(groups.has('bind:全身')){groups.add('bind:双手');groups.add('bind:双腿');}
      for(const claim of claims)if((!castModeIds.length||!claim.castModeIds.length||castModeIds.some(id=>claim.castModeIds.includes(id)))&&[...groups].some(g=>claim.groups.has(g)))throw Error('同一实际限制不能重复资助多份交换合同');
      claims.push({groups,castModeIds});
      return {id:c.id,mode:c.mode,payer:'self',burdens,benefits,durationMinutes,sourceKinds,castModeIds};
    });
  }
  function origin(s){return s.扩展?.copyOrigin?.source?origin(s.扩展.copyOrigin.source):s.usageKey||s.id;}
  function burdenGroup(b){return b.effectId==='status.limb_bind'?`bind:${b.params.部位}`:b.effectId==='status.buff'?`stat:${b.params.属性}`:b.effectId==='status.resistance_shift'?`vulnerable:${b.params.类型}`:b.effectId;}
  function basePrice(b,mode,minutes){
    const r=REGISTRY[b.effectId],p=b.params;let points=r.points,rate=r.rate;
    if(b.effectId==='status.limb_bind'){
      [points,rate]=({双手:[5,.10],双腿:[4,.08],全身:[7,.15]})[p.部位];
      if(mode!=='fixed'){points+=Math.min(2,p.层数-1)+Math.min(3,Math.floor(p.挣脱难度加值/2));rate+=Math.min(.04,(p.层数-1)*.02)+Math.min(.06,Math.floor(p.挣脱难度加值/2)*.02);}
    }
    if(b.effectId==='status.slow'){points*=p.数值;rate*=p.数值;}
    if(b.effectId==='status.buff'){points*=Math.abs(p.数值);rate=Math.min(.15,rate*Math.abs(p.数值));}
    if(b.effectId==='status.desire'){points=[0,3,5,7][p.强度];rate=p.强度*.05;}
    const duration=mode==='fixed'?minutes:p.持续方式==='来源有效'?2:p.持续方式==='回合'?p.持续回合??minutes:p.持续分钟??minutes;
    const factor=(mode==='linked'?.5:1)*(mode!=='condition'&&duration<2?.5:1);
    return {points:points*factor,rate:rate*factor};
  }
  function quoteContracts(input,kind,rows=[]){
    const contracts=normalize(input,kind),result=[];
    for(const c of contracts){
      const bound=rows.filter(r=>kind==='martialSoul'?c.benefits.componentIds.includes(r.id):c.benefits.branchIds.includes(r.branchId));
      if(kind==='martialSoul'&&bound.some(r=>r.kind!=='trait'))throw Error('交换只能资助额外正面组件');
      if(c.mode!=='condition'&&bound.some(r=>r.activation==='passive'))throw Error('一次付款不能资助永久被动');
      if(c.castModeIds.length&&bound.some(r=>r.activation==='passive'))throw Error('永久被动交换不能绑定本次施放费用模式');
      if(c.benefits[kind==='martialSoul'?'componentIds':'branchIds'].some(id=>!bound.some(r=>kind==='martialSoul'?r.id===id:r.branchId===id)))throw Error('交换收益引用不存在');
      const raw=bound.reduce((s,r)=>s+(r.rawValue??Math.max(0,r.cost)),0);let points=0,rate=0,lockRaw=0;
      const negatives=new Map(),locked=new Map();
      for(const b of c.burdens){
        if(b.effectId==='ability.lock'){
          const unique=new Map(b.lockedAbilities.map(s=>[origin(s),s]));
          for(const [key,s] of unique)locked.set(key,s);continue;
        }
        if(b.effectId==='status.limb_bind'&&b.params.部位!=='全身'&&c.burdens.some(x=>x.effectId==='status.limb_bind'&&x.params.部位==='全身'))continue;
        const key=burdenGroup(b),value=basePrice(b,c.mode,c.durationMinutes),prev=negatives.get(key);
        if(!prev||prev.rate<value.rate)negatives.set(key,{...value,burden:b});
      }
      for(const value of negatives.values()){
        if(value.burden.effectId==='status.buff'){
          const attr=value.burden.params.属性;
          const positive=bound.filter(r=>r.attribute===attr&&r.amount>0).reduce((max,r)=>Math.max(max,r.amount),0);
          const loss=Math.max(0,-value.burden.params.数值-positive),ratio=loss/-value.burden.params.数值;
          value.points*=ratio;value.rate*=ratio;
        }
        points+=value.points;rate+=value.rate;
      }
      const concurrent=contracts.filter(other=>!c.castModeIds.length||!other.castModeIds.length||c.castModeIds.some(id=>other.castModeIds.includes(id)));
      const blockedRequirements=new Set(concurrent.flatMap(other=>other.burdens).flatMap(b=>b.effectId==='status.mute'?['voice']:b.effectId==='status.limb_bind'?(b.params.部位==='双手'?['gesture']:b.params.部位==='双腿'?['movement']:['gesture','movement']):[]));
      lockRaw=[...locked.values()].reduce((sum,s)=>{
        const original=s.扩展?.copyOrigin?.source??s,basis=globalThis.SoulEffectCompiler.rawAbilityValue(original.effectGraph),modes=original.castModes?.length?original.castModes:[{}];
        const covered=modes.every(mode=>[...(original.requirements??[]),...(mode.requirements??[])].some(requirement=>blockedRequirements.has(requirement)));
        return sum+(covered?0:basis.rawActiveValue)+basis.rawPassiveValue;
      },0);
      const factor=(c.mode==='linked'?.5:1)*(c.mode!=='condition'&&c.durationMinutes<2?.5:1);
      const lockReduction=Math.min(raw*.2,lockRaw*.2)*factor;
      points+=Math.min(7,Math.floor(lockRaw/80))*factor;
      result.push({contract:c,rawValue:raw,points:Math.min(raw,points),activeRate:rate,passiveRate:c.mode==='condition'?Math.min(.25,rate/2):0,lockReduction,lockedRawValue:lockRaw});
    }
    return result;
  }
  function describe(input,kind='skill'){
    return normalize(input,kind).map(c=>({id:c.id,mode:c.mode,modeLabel:({condition:'条件交换',linked:'联动解除',fixed:'固定期限代价'})[c.mode],payer:'本人',durationMinutes:c.durationMinutes,benefits:c.benefits,burdens:c.burdens.map(b=>({effectId:b.effectId,params:clone(b.params),...(b.lockedAbilities?{lockedSkillIds:b.lockedAbilities.map(s=>s.id)}:{})}))}));
  }
  const states=(s,id)=>globalThis.SoulControlCore.active(s,id);
  const worldNow=s=>globalThis.SoulPersonCore.now(s);
  const personalNow=(s,id,at=worldNow(s))=>globalThis.SoulSealingCore?.personalNow(s,id,at)??at;
  const hash=x=>globalThis.SoulAbilityContract.hash(x);
  function desireFacts(s,id){
    const sources=states(s,id).filter(v=>v.模板ID==='status.desire'),strength=Math.max(0,...sources.map(v=>v.快照.参数.强度));
    const clock=s.扩展?.desireClocks?.[id],flare=strength>0&&clock?.flare===true;
    return {strength,flare,penalty:strength?-(strength+(flare?1:0)):0,focusBlocked:flare&&strength>=2,sourceIds:sources.map(v=>v.id),nextAt:strength?clock?.nextAt??null:null};
  }
  function activeCheckPenalty(s,id,attribute){return ['attack','悟性','感知'].includes(attribute)?desireFacts(s,id).penalty:0;}
  function selfControl(s,id,kind,operationId,at=worldNow(s),paymentProof=null){
    const facts=desireFacts(s,id);if(!facts.strength)throw Error('当前没有需要克制的欲火');
    if(kind==='restrain'&&(!paymentProof||paymentProof.actorId!==id||paymentProof.operationId!==operationId||paymentProof.kind==='world'&&(paymentProof.endedAt!==at||personalNow(s,id,at)-personalNow(s,id,paymentProof.startedAt)!==5)||paymentProof.kind==='battle'&&(paymentProof.battleId!==s.战斗.id||paymentProof.actionType!=='克制'||s.战斗.当前行动单位ID!==id)||!['world','battle'].includes(paymentProof.kind)))throw Error('主动克制缺少实际时间或主行动付款');
    const clock=s.扩展.desireClocks[id],sequence=clock.checks+1;
    const modifier=globalThis.SoulCombatEngine.attributeModifier(s,s.战斗单位.列表[id],'意志');
    const die=globalThis.SoulCombatEngine.makeRng(`${s.世界.seed}:desire:${clock.id}:${sequence}:${operationId}`).die(20),dc=[0,10,15,20][facts.strength],success=die+modifier>=dc;
    clock.checks=sequence;clock.flare=!success;
    const soul=s.武魂?.列表?.[s.成长?.列表?.[id]?.激活武魂ID];
    const equipmentConfig=clone(s.装备?.配置?.[id]??{slots:{},soulBoneSlots:{}}),equipmentIds=[...Object.values(equipmentConfig.slots??{}),...Object.values(equipmentConfig.soulBoneSlots??{})].filter(Boolean);
    const checkProof={actor:clone(s.战斗单位.列表[id]),equipmentConfig,equipmentProofs:equipmentIds.map(itemId=>clone(s.物品.实例[itemId])),soulId:soul?.id??'',soul:soul?clone(soul.扩展.结构化武魂):null,abilityHooks:soul?clone(hooks(s,id,soul).filter(h=>h.type==='abilityScore')):[],statuses:clone(states(s,id).filter(v=>['status.desire','status.buff','transform.form','transform.martial_avatar',...Object.keys(REGISTRY),'status.power_seal'].includes(v.模板ID)))};
    const events=s.扩展.desireEvents??=[],event={id:`${clock.id}:${sequence}`,clockId:clock.id,actorId:id,sequence,kind,operationId,at,personalAt:personalNow(s,id,at),strength:facts.strength,sourceIds:facts.sourceIds,checkProof,paymentProof:clone(paymentProof),modifier,die,dc,total:die+modifier,success,previousHash:events.at(-1)?.hash??null};
    event.hash=hash(event);events.push(event);clock.lastEventHash=event.hash;
    if(!success&&facts.strength>=2)globalThis.SoulCombatEngine?.pruneMaintenance(s);
    return clone(event);
  }
  function onDesireApplied(s,id){
    s.扩展.desireClocks??={};const clock=s.扩展.desireClocks[id],facts=desireFacts(s,id);
    if(clock?.sourceIds?.some(sourceId=>s.状态实例.列表[sourceId])){clock.sourceIds=facts.sourceIds;return;}
    const at=personalNow(s,id);
    s.扩展.desireClocks[id]={version:1,id:`desire:${facts.sourceIds[0]}`,actorId:id,startedAt:at,nextAt:at+5,checks:0,flare:false,sourceIds:facts.sourceIds};
    selfControl(s,id,'initial',facts.sourceIds[0]);
  }
  function nextDesireAt(s,through=Number.MAX_SAFE_INTEGER){
    const now=worldNow(s),due=Object.values(s.扩展?.desireClocks??{}).filter(c=>desireFacts(s,c.actorId).strength&&!globalThis.SoulSealingCore?.isStasis(s,c.actorId)).map(c=>now+Math.max(0,c.nextAt-personalNow(s,c.actorId))).filter(at=>at<=through);
    return due.length?Math.min(...due):null;
  }
  function advanceDesireAt(s,at=worldNow(s)){
    for(const clock of Object.values(s.扩展?.desireClocks??{})){
      if(globalThis.SoulSealingCore?.isStasis(s,clock.actorId)||!desireFacts(s,clock.actorId).strength)continue;
      while(clock.nextAt<=personalNow(s,clock.actorId,at)){const boundary=clock.nextAt;clock.nextAt+=5;selfControl(s,clock.actorId,'periodic',`boundary:${boundary}`,at);}
    }
  }
  function validateDesire(s){
    const errors=[],events=s.扩展?.desireEvents??[];let previousHash=null,previousAt=-1;const counts=new Map(),boundaries=new Map();
    for(const e of events)try{
      const {hash:stamp,...body}=e,die=globalThis.SoulCombatEngine.makeRng(`${s.世界.seed}:desire:${e.clockId}:${e.sequence}:${e.operationId}`).die(20);
      const frame=e.checkProof,proofState={状态实例:{列表:Object.fromEntries(frame.statuses.map(v=>[v.id,v]))}},sources=frame.statuses.filter(v=>v.模板ID==='status.desire');
      const normalizedActor=globalThis.SoulCombatFoundation.normalizeCombatant(frame.actor);
      const actual=s.战斗单位.列表[e.actorId],residual=globalThis.SoulCombatFoundation.stripMartialSoulCombatModifiers(clone(actual)).六维.临时加成;
      const itemIds=[...Object.values(frame.equipmentConfig.slots??{}),...Object.values(frame.equipmentConfig.soulBoneSlots??{})].filter(Boolean);
      if(hash(itemIds)!==hash(frame.equipmentProofs.map(v=>v.id))||frame.equipmentProofs.some(v=>{const live=s.物品?.实例?.[v.id];return !live||v.ownerEntityId!==e.actorId||v.quantity<1||v.templateId!==live.templateId||hash(v.payload?.modifiers??{})!==hash(live.payload?.modifiers??{});}))throw Error('自控装备属性来源无效');
      const world=globalThis.SoulWorldEngine,historicalEquipment=world?world.equipmentSummary({装备:{配置:{[e.actorId]:frame.equipmentConfig}},物品:{实例:Object.fromEntries(frame.equipmentProofs.map(v=>[v.id,v]))}},e.actorId).attributes:{},currentEquipment=world?world.equipmentSummary(s,e.actorId).attributes:{};
      if(frame.soul){globalThis.SoulMartialSoulCore.normalizeCompiledAttributes(frame.soul);const soul=s.武魂?.列表?.[frame.soulId];if(!soul||soul.持有者单位ID!==e.actorId||hash(frame.soul)!==hash(soul.扩展.结构化武魂))throw Error('自控武魂来源无效');}
      for(const hook of frame.abilityHooks??[]){if(!frame.soul?.mechanicalHooks.some(h=>hash(h)===hash(hook)))throw Error('自控属性特性来源无效');if(hook.exchangeId){const c=frame.soul.exchangeContracts.find(c=>c.id===hook.exchangeId);if(!c||!c.burdens.every(b=>frame.statuses.some(v=>v.模板ID===b.effectId&&(b.effectId==='status.buff'?v.快照.参数.属性===b.params.属性&&v.快照.参数.数值<=b.params.数值:b.effectId==='status.limb_bind'?(v.快照.参数.部位===b.params.部位||v.快照.参数.部位==='全身')&&v.层数>=b.params.层数:b.effectId==='status.desire'?v.快照.参数.强度>=b.params.强度:true))))throw Error('自控交换特性没有真实负担');}}
      if(ATTRIBUTES.some(k=>frame.actor.六维.基础[k]>actual.六维.基础[k]||frame.actor.六维.永久加成[k]>actual.六维.永久加成[k]||frame.actor.六维.临时加成[k]!==Number(residual[k]??0)-Number(currentEquipment[k]??0)+Number(historicalEquipment[k]??0)+(frame.abilityHooks??[]).filter(h=>h.parameter===k).reduce((n,h)=>n+h.level,0))||e.at<previousAt)throw Error('自控属性或时间缺少真实人物依据');
      if(hash(normalizedActor.六维)!==hash(frame.actor.六维)||frame.actor.id!==e.actorId||e.personalAt!==personalNow(s,e.actorId,e.at)||e.modifier!==globalThis.SoulCombatEngine.attributeModifier(proofState,frame.actor,'意志')||hash(e.sourceIds)!==hash(sources.map(v=>v.id))||!sources.length||e.strength!==Math.max(...sources.map(v=>v.快照.参数.强度))||frame.statuses.some(v=>!globalThis.SoulCombatEngine.validateControlSourceProof(v,e.actorId,globalThis.SoulSealingCore.statusTime(s,v,e.at))))throw Error('自控真实属性或欲火来源无效');
      if(!['initial','periodic','restrain'].includes(e.kind)||e.kind==='initial'&&(e.sequence!==1||e.operationId!==sources[0].id)||e.kind==='periodic'&&e.operationId!==`boundary:${e.personalAt}`)throw Error('自控检定边界无效');
      if(e.kind==='initial')boundaries.set(e.clockId,e.personalAt+5);
      if(e.kind==='periodic'){if(e.personalAt!==boundaries.get(e.clockId))throw Error('自控检定不在下一固定边界');boundaries.set(e.clockId,e.personalAt+5);}
      if(e.kind==='restrain'){
        const p=e.paymentProof;if(!p||p.actorId!==e.actorId||p.operationId!==e.operationId||!['world','battle'].includes(p.kind))throw Error('克制缺少真实付款');
        const paid=s.扩展?.desireActionPayments?.[e.operationId];if(!paid||paid.checkId!==e.id||hash(paid.proof)!==hash(p))throw Error('克制缺少正式行动付款记录');
        if(p.kind==='world'&&(p.endedAt!==e.at||personalNow(s,e.actorId,p.endedAt)-personalNow(s,e.actorId,p.startedAt)!==5))throw Error('克制未支付五个人分钟');
        if(p.kind==='battle'){const battle=[s.战斗,...Object.values(s.世界?.backgroundBattles??{})].find(b=>b.id===p.battleId),r=Object.values(battle?.扩展?.已结算行动??{}).find(r=>r.id===e.operationId);if(p.actionType!=='克制'||r&&(r.actorId!==e.actorId||r.actionType!=='克制'||r.round!==p.round||r.desireCheck?.id!==e.id))throw Error('克制主行动证据无效');}
      }else if(e.paymentProof!==null)throw Error('自动自控不能包含主动付款');
      if(stamp!==hash(body)||e.previousHash!==previousHash||e.sequence!==(counts.get(e.clockId)??0)+1||die!==e.die||e.dc!==[0,10,15,20][e.strength]||e.total!==e.die+e.modifier||e.success!==(e.total>=e.dc)||e.at>worldNow(s))throw Error('自控回执无效');
      counts.set(e.clockId,e.sequence);previousHash=stamp;previousAt=e.at;
    }catch(error){errors.push(`欲火${e.id}：${error.message}`);}
    for(const clock of Object.values(s.扩展?.desireClocks??{})){
      const rows=events.filter(e=>e.clockId===clock.id),last=rows.at(-1);
      if(clock.version!==1||clock.startedAt!==rows[0]?.personalAt||rows[0]?.kind!=='initial'||clock.id!==`desire:${rows[0]?.sourceIds[0]}`||clock.checks!==rows.length||clock.lastEventHash!==last?.hash||clock.flare===last?.success||clock.nextAt!==clock.startedAt+5*(1+rows.filter(e=>e.kind==='periodic').length))errors.push('欲火时钟与自控回执不一致');
    }
    for(const id of Object.keys(s.战斗单位.列表))if(desireFacts(s,id).strength&&!s.扩展?.desireClocks?.[id])errors.push('欲火状态缺少自控时钟');
    return errors;
  }
  const records=s=>Object.values(s.扩展?.abilityExchanges??{});
  const sourceName=source=>source?.name||source?.名称||'另一项能力';
  const sourceKindLabel=kind=>({self:'自身能力',person:'他人能力',item:'道具'})[kind];
  function burdenText(b,status=null){
    const p=b.params??{},level=status?.层数??p.层数??1;
    if(b.effectId==='status.limb_bind')return `${p.部位}拘束（${p.姿态??'身前'}、${level}层、挣脱难度加值${p.挣脱难度加值??0}）`;
    if(b.effectId==='status.buff')return `${p.属性}${p.数值}`;
    if(b.effectId==='status.resistance_shift')return `${p.类型}易伤`;
    if(b.effectId==='status.slow')return `${p.数值}级减速`;
    if(b.effectId==='status.desire')return `${p.强度}级欲火`;
    if(b.effectId==='ability.lock')return `封锁${(b.lockedAbilities??[]).map(sourceName).map(n=>`「${n}」`).join('、')}`;
    return ({'status.mute':'禁言','status.blind':'失明'})[b.effectId]??'所需限制';
  }
  function statusText(v){
    if(v.模板ID==='status.power_seal')return '能力封印';
    return burdenText({effectId:v.模板ID,params:v.快照.参数},v);
  }
  function exchangeFailure(code,b,current,extra={}){
    const required=burdenText(b),details={code,required,current,...extra};
    let message;
    if(code==='EXCHANGE_OCCUPIED')message=`无法发动：所需${required}已用于「${extra.occupyingAbility}」的持续强化。请先结束该强化再试。`;
    else if(code==='EXCHANGE_SOURCE_UNAVAILABLE')message=`无法发动：${extra.reason}。需要已处于${required}。`;
    else if(code==='EXCHANGE_CONDITION_SOURCE')message=`无法发动：需要${extra.requiredSources.join('或')}造成的${required}；当前：${current}。`;
    else if(code==='EXCHANGE_CONDITION_INVALID')message=`无法发动：现有${required}已失效，或没有有效的施加来源。请先获得有效的限制再试。`;
    else if(code==='EXCHANGE_IMMUNE')message=`无法发动：你免疫${required}，无法承担这项限制来换取强化。`;
    else if(code==='EXCHANGE_NO_NEW_BURDEN')message=`无法发动：当前已有${current}，再次施加${required}不能产生新的实际负担。请先解除现有限制再试。`;
    else message=`无法发动：需要已处于${required}；当前：${current}。`;
    const error=Error(message);error.code=code;error.exchangeFailure=details;return error;
  }
  function matchingParameters(v,b){
    const p=v.快照.参数,required=b.params;
    if(b.effectId==='ability.lock')return b.lockedAbilities.every(a=>(p.限制?.denyOrigins??[]).includes(origin(a)));
    if(b.effectId==='status.limb_bind')return (p.部位===required.部位||p.部位==='全身')&&p.姿态===required.姿态&&v.层数>=required.层数&&(p.挣脱难度加值??0)>=required.挣脱难度加值;
    if(b.effectId==='status.buff')return p.属性===required.属性&&p.数值<=required.数值;
    if(b.effectId==='status.resistance_shift')return p.类型===required.类型&&p.模式==='易伤';
    if(b.effectId==='status.slow')return p.数值>=required.数值;
    if(b.effectId==='status.desire')return p.强度>=required.强度;
    return true;
  }
  const statusKind=(v,id)=>v.来源?.物品ID?'item':v.来源?.单位ID===id?'self':'person';
  const validSupport=(s,id,v)=>!globalThis.SoulControlCore.sourceInvalidReason(s,v)&&globalThis.SoulCombatEngine.validateControlSourceProof(v,id,globalThis.SoulSealingCore?.statusTime(s,v)??worldNow(s));
  function matches(s,id,b,c){
    return states(s,id).filter(v=>{
      return v.模板ID===(b.effectId==='ability.lock'?'status.power_seal':b.effectId)&&validSupport(s,id,v)&&(!c.sourceKinds.length||c.sourceKinds.includes(statusKind(v,id)))&&matchingParameters(v,b);
    });
  }
  function branchActive(s,id,ability,branchId){return normalize(ability.exchangeContracts??[]).filter(c=>c.benefits.branchIds.includes(branchId)).every(c=>contractActive(s,id,ability,c));}
  function nativeSoul(s,id,ability){
    const soulId=ability.sourceMartialSoulId||ability.来源武魂ID;
    return soulId&&s.成长?.列表?.[id]?.激活武魂ID===soulId&&!['copied','summoned-copy','exchange-cost'].includes(ability.sourceKind)&&!ability.sourceItemId?s.武魂?.列表?.[soulId]:null;
  }
  function contractActive(s,id,source,c){
    if(c.mode==='condition')return conditionSupport(s,id,source,c)!==null;
    return records(s).some(r=>r.status==='active'&&r.actorId===id&&r.sourceId===source.id&&r.contract.id===c.id&&r.selfStatusIds.every(id=>s.状态实例.列表[id]));
  }
  function conditionSupport(s,id,source,c){return conditionAssessment(s,id,source,c).statusIds;}
  function conditionAssessment(s,id,source,c){
    const soul=s.武魂?.列表?.[s.成长?.列表?.[id]?.激活武魂ID]?.扩展?.结构化武魂,owners=[];
    if(soul)for(const contract of soul.exchangeContracts??[])if(contract.mode==='condition')owners.push({source:soul,contract});
    for(const skillId of s.战斗单位.列表[id]?.能力?.技能ID??[]){const skill=s.技能.列表[skillId];if(!skill)continue;const passive=globalThis.SoulEffectCompiler.graphBranches(skill.effectGraph).filter(b=>b.activation==='passive').map(b=>b.id);for(const contract of normalize(skill.exchangeContracts??[]))if(contract.mode==='condition'&&contract.benefits.branchIds.some(b=>passive.includes(b)))owners.push({source:skill,contract});}
    if(!owners.some(o=>o.source.id===source.id&&o.contract.id===c.id))owners.push({source,contract:c});
    const occupied=new Map(),groups=new Map(),overlaps=(a,b)=>a===b||a.startsWith('bind:')&&b.startsWith('bind:')&&(a==='bind:全身'||b==='bind:全身');
    for(const owner of owners){
      const requested=owner.source.id===source.id&&owner.contract.id===c.id;
      if(owner.source.id!==soul?.id){const skill=owner.source,unit=s.战斗单位.列表[id],sourceSoulId=skill.sourceMartialSoulId||skill.来源武魂ID,copied=['copied','summoned-copy'].includes(skill.sourceKind),item=s.物品?.实例?.[skill.sourceItemId],equipment=s.装备?.配置?.[id];
        const battleLocked=[s.战斗,...Object.values(s.世界?.backgroundBattles??{})].some(b=>b?.状态==='进行中'&&b.扩展?.成员?.[id]?.status==='active'&&b.扩展?.规则?.soulSkillsLocked)&&(skill.类型==='魂技'||skill.来源魂环ID||skill.sourceRingId||skill.sourceKind==='soul-ring');
        const unavailable=globalThis.SoulCombatFoundation.intrinsicSoulSkillBlockReason(unit,skill)||battleLocked||globalThis.SoulControlCore.passiveReason(s,id,skill)||!copied&&sourceSoulId&&sourceSoulId!==soul?.id||!copied&&skill.sourceItemId&&(!item||item.ownerEntityId!==id||item.quantity<=0||![...Object.values(equipment?.slots??{}),...Object.values(equipment?.soulBoneSlots??{})].includes(item.id))||skill.sourceKind==='copied'&&!states(s,id).some(v=>v.扩展?.复制技能ID列表?.includes(skill.id))||skill.sourceKind==='summoned-copy'&&!(unit.扩展?.召唤?.constructId?unit.扩展.召唤.expiresAt>worldNow(s):unit.扩展?.召唤?.剩余回合>0);
        if(unavailable){if(requested)return {statusIds:null,error:exchangeFailure('EXCHANGE_SOURCE_UNAVAILABLE',c.burdens[0],'能力来源不可用',{reason:'这项能力的武魂、装备或使用条件当前不可用'})};continue;}
      }
      const found=owner.contract.burdens.map(b=>matches(s,id,b,owner.contract).find(v=>!occupied.has(v.id)&&!records(s).some(r=>r.status==='active'&&r.actorId===id&&(r.sourceId!==owner.source.id||r.contract.id!==owner.contract.id)&&[...r.selfStatusIds,...r.supportingStatusIds].includes(v.id))));
      const valid=found.every(Boolean)&&owner.contract.burdens.every(b=>![...groups.keys()].some(g=>overlaps(g,burdenGroup(b))));
      if(requested){
        if(valid)return {statusIds:found.map(v=>v.id),error:null};
        for(const [index,b] of c.burdens.entries()){
          const candidates=matches(s,id,b,c),groupOwner=[...groups].find(([g])=>overlaps(g,burdenGroup(b)))?.[1];
          const statusOwner=candidates.map(v=>occupied.get(v.id)||records(s).find(r=>r.status==='active'&&r.actorId===id&&(r.sourceId!==source.id||r.contract.id!==c.id)&&[...r.selfStatusIds,...r.supportingStatusIds].includes(v.id))?.sourceSnapshot).find(Boolean);
          if(groupOwner||!found[index]&&statusOwner)return {statusIds:null,error:exchangeFailure('EXCHANGE_OCCUPIED',b,candidates.map(statusText).join('、'),{occupyingAbility:sourceName(groupOwner||statusOwner)})};
          if(found[index])continue;
          const sameType=states(s,id).filter(v=>v.模板ID===(b.effectId==='ability.lock'?'status.power_seal':b.effectId)),current=sameType.length?sameType.map(statusText).join('、'):'没有这项限制';
          const usable=sameType.filter(v=>validSupport(s,id,v));
          if(sameType.length&&!usable.length)return {statusIds:null,error:exchangeFailure('EXCHANGE_CONDITION_INVALID',b,current)};
          if(usable.some(v=>matchingParameters(v,b))&&c.sourceKinds.length)return {statusIds:null,error:exchangeFailure('EXCHANGE_CONDITION_SOURCE',b,usable.map(v=>`${statusText(v)}（来自${sourceKindLabel(statusKind(v,id))}）`).join('、'),{requiredSources:c.sourceKinds.map(sourceKindLabel)})};
          return {statusIds:null,error:exchangeFailure(sameType.length?'EXCHANGE_CONDITION_MISMATCH':'EXCHANGE_CONDITION_MISSING',b,current)};
        }
      }
      if(valid){for(const v of found){occupied.set(v.id,owner.source);groups.set(burdenGroup({effectId:v.模板ID,params:v.快照.参数}),owner.source);}for(const b of owner.contract.burdens)groups.set(burdenGroup(b),owner.source);}
    }
    return {statusIds:null,error:exchangeFailure('EXCHANGE_SOURCE_UNAVAILABLE',c.burdens[0],'能力来源不可用',{reason:'这项能力当前不可用'})};
  }
  function pledgedAbilityAvailable(s,id,skill){
    const unit=s.战斗单位.列表[id],foundation=globalThis.SoulCombatFoundation,combat=globalThis.SoulCombatEngine;
    if(foundation.intrinsicSoulSkillBlockReason(unit,skill)||globalThis.SoulControlCore.passiveReason(s,id,skill))return false;
    if([s.战斗,...Object.values(s.世界?.backgroundBattles??{})].some(b=>b?.状态==='进行中'&&b.扩展?.成员?.[id]?.status==='active'&&b.扩展?.规则?.soulSkillsLocked)&&(skill.类型==='魂技'||skill.sourceKind==='soul-ring'||skill.来源魂环ID||skill.sourceRingId))return false;
    if(globalThis.SoulEffectCompiler.skillActivation(skill.effectGraph)==='passive')return foundation.passiveSkillState(s,skill).active;
    const modes=skill.castModes?.length?skill.castModes.map(m=>m.id):[undefined];
    const fieldUse=!globalThis.SoulActionContext.battleOf(s,id);
    return modes.some(modeId=>{if(!fieldUse)return combat.skillCastAvailability(s,unit,skill,{modeId}).available;try{combat.quoteSkillUse(s,unit,skill,{modeId,fieldUse});return true;}catch{return false;}});
  }
  function hooks(s,id,soul){
    const compiled=soul?.扩展?.结构化武魂??soul;
    return (compiled?.mechanicalHooks??[]).filter(h=>!globalThis.SoulControlCore.adultReason(s,id,h)&&(!h.exchangeId||contractActive(s,id,compiled,(compiled.exchangeContracts??[]).find(c=>c.id===h.exchangeId))));
  }
  function sourceScale(s,id,ability){const soul=nativeSoul(s,id,ability);return soul?1+Math.max(0,...hooks(s,id,soul).filter(h=>h.type==='sourcePower').map(h=>h.level*.05)):1;}
  function applyBacklash(s,id,ability,operationId){
    const soul=nativeSoul(s,id,ability);if(!soul||!hooks(s,id,soul).some(h=>h.type==='desireBacklash'))return null;
    const c={id:'desire-backlash',mode:'linked',durationMinutes:10},b={effectId:'status.desire',params:{强度:Math.min(3,desireFacts(s,id).strength+1),持续方式:'世界分钟',持续分钟:10,来源依赖:'独立'}};
    const cost=costAbility(id,ability,c,b,0,`backlash:${soul.id}`);
    return globalThis.SoulCombatEngine.applyStatus(s,s.战斗单位.列表[id],s.战斗单位.列表[id],cost.effectGraph.nodes[1],`${operationId}:backlash`,{skillId:cost.id,effects:[]},{...cost,_fieldUse:!globalThis.SoulActionContext.battleOf(s,id)});
  }
  function controlBonus(s,id,ability){const soul=nativeSoul(s,id,ability);return soul&&hooks(s,id,soul).some(h=>h.type==='sourceControl')?1:0;}
  function claimOwner(s,id,b,sourceId,contractId){
    const group=burdenGroup(b),overlaps=x=>burdenGroup(x)===group||group.startsWith('bind:')&&burdenGroup(x).startsWith('bind:')&&(group==='bind:全身'||burdenGroup(x)==='bind:全身');
    const record=records(s).find(r=>r.actorId===id&&r.status==='active'&&(r.sourceId!==sourceId||r.contract.id!==contractId)&&r.contract.burdens.some(overlaps));if(record)return record.sourceSnapshot;
    const soul=s.武魂?.列表?.[s.成长?.列表?.[id]?.激活武魂ID],compiled=soul?.扩展?.结构化武魂;
    return (compiled?.exchangeContracts??[]).some(c=>c.mode==='condition'&&(compiled.id!==sourceId||c.id!==contractId)&&contractActive(s,id,compiled,c)&&c.burdens.some(overlaps))?compiled:null;
  }
  function costAbility(actorId,source,c,b,index,operationId){
    const params={...b.params};
    if(c.mode==='fixed'||params.持续方式===undefined){params.持续方式='世界分钟';params.持续分钟=c.durationMinutes;params.来源依赖='独立';}
    let effectId=b.effectId;
    if(effectId==='ability.lock'){effectId='status.power_seal';Object.assign(params,{封印对象:'精细',范围:'全部',限制:{denyOrigins:[...new Set(b.lockedAbilities.map(origin))]}});}
    const graph=globalThis.SoulEffectCompiler.makeLinearGraph([['target.self',{}],[effectId,params]]);
    const soulId=source.sourceMartialSoulId||source.来源武魂ID||(source.mechanicalHooks?source.id:'');
    return globalThis.SoulAbilityContract.seal({id:`exchange-cost:${operationId}:${c.id}:${index}`,name:'交换自身负担',持有者单位ID:actorId,sourceKind:'exchange-cost',...(params.来源依赖==='施术武魂'&&soulId?{sourceMartialSoulId:soulId}:{}),...(params.来源依赖==='道具有效'&&source.sourceItemId?{sourceItemId:source.sourceItemId}:{}),soulPowerCost:0,effectGraph:graph});
  }
  function preview(s,id,source,options={}){
    const kind=options.kind??'skill',contracts=normalize(source.exchangeContracts??[],kind).filter(c=>!c.castModeIds.length||c.castModeIds.includes(options.modeId??source.defaultCastMode));
    const selected=contracts.filter(c=>(!options.paidOnly||c.mode!=='condition')&&(kind==='martialSoul'||!options.branchIds||c.benefits.branchIds.some(id=>options.branchIds.includes(id)))),plans=[];
    for(const c of selected){
      const supportingStatusIds=[];
      for(const [index,b] of c.burdens.entries()){
        const occupying=claimOwner(s,id,b,source.id,c.id);if(occupying)throw exchangeFailure('EXCHANGE_OCCUPIED',b,'限制正在使用中',{occupyingAbility:sourceName(occupying)});
        if(c.mode==='condition'){
          const assessment=conditionAssessment(s,id,source,c);if(!assessment.statusIds)throw assessment.error;supportingStatusIds.push(assessment.statusIds[index]);continue;
        }
        const cost=costAbility(id,source,c,b,index,'preview'),node=cost.effectGraph.nodes[1];
        if(node.params.来源依赖==='施术武魂'&&!cost.sourceMartialSoulId||node.params.来源依赖==='道具有效'&&!cost.sourceItemId)throw Error('交换负担缺少真实武魂或道具来源');
        const invalid=globalThis.SoulControlCore.sourceInvalidReason(s,{来源:{单位ID:id,武魂ID:cost.sourceMartialSoulId??'',物品ID:cost.sourceItemId??''},快照:{参数:node.params}});
        if(invalid)throw Error(`交换负担来源不可用：${invalid}`);
        if(globalThis.SoulCombatEngine.statusImmunityReasons(s,id,node).length)throw exchangeFailure('EXCHANGE_IMMUNE',b,'免疫这项限制');
        if(b.effectId==='ability.lock'){
          for(const original of b.lockedAbilities){
            const actual=Object.values(s.技能.列表).find(v=>(s.战斗单位.列表[id].能力.技能ID??[]).includes(v.id)&&origin(v)===origin(original));
            if(!actual||globalThis.SoulAbilityContract.fingerprint(actual)!==globalThis.SoulAbilityContract.fingerprint(original)||actual.id===source.id||!pledgedAbilityAvailable(s,id,actual))throw Error('被封能力必须实际已拥有、来源有效且原本可用，次数或冷却耗尽不能抵押');
          }
        }else{
          const existing=states(s,id).filter(v=>v.模板ID===b.effectId);
          const noLoss=b.effectId==='status.limb_bind'?existing.some(v=>v.快照.参数.部位==='全身'||v.快照.参数.部位===b.params.部位):b.effectId==='status.buff'?existing.some(v=>v.快照.参数.属性===b.params.属性&&v.快照.参数.数值<=b.params.数值):b.effectId==='status.slow'?existing.some(v=>v.快照.参数.数值>=b.params.数值):b.effectId==='status.desire'?desireFacts(s,id).strength>=b.params.强度:b.effectId==='status.resistance_shift'?existing.some(v=>v.快照.参数.类型===b.params.类型&&v.快照.参数.模式==='易伤'):existing.length>0;
          if(noLoss)throw exchangeFailure('EXCHANGE_NO_NEW_BURDEN',b,existing.map(statusText).join('、'));
          if(b.effectId==='status.resistance_shift'){
            const defenses=globalThis.SoulCombatFoundation.defenseSources(s,s.战斗单位.列表[id]).filter(v=>globalThis.SoulCombatFoundation.resistanceMatches([v.params.类型],b.params.类型));
            if(defenses.some(v=>v.params.模式==='易伤'))throw Error('既有易伤已造成相同损失，不能重复支付交换代价');
            if(defenses.some(v=>['抗性','免疫','吸收'].includes(v.params.模式)))throw Error('易伤被防护抵消，无法承担交换代价');
          }
        }
      }
      plans.push({contract:c,supportingStatusIds});
    }
    return {kind,actorId:id,sourceId:source.id,plans};
  }
  const stamp=r=>{delete r.hash;r.hash=hash(r);return r;};
  function pay(s,id,source,operationId,payment,options={}){
    // Resource and quota payment can itself make a pledged ability unavailable.
    // Eligibility is sampled by the final complete quote immediately before payment.
    const plan=payment?.exchangePlan??preview(s,id,source,options);
    const expected=normalize(source.exchangeContracts??[],options.kind??'skill').filter(c=>(!c.castModeIds.length||c.castModeIds.includes(options.modeId??source.defaultCastMode))&&(!(options.paidOnly)||c.mode!=='condition')&&((options.kind??'skill')==='martialSoul'||!options.branchIds||c.benefits.branchIds.some(id=>options.branchIds.includes(id))));
    if(plan.actorId!==id||plan.sourceId!==source.id||plan.kind!==(options.kind??'skill')||hash(plan.plans.map(v=>v.contract))!==hash(expected))throw Error('交换付款前计划与实际合同不一致');
    s.扩展.abilityExchanges??={};const ids=[];
    for(const item of plan.plans){
      const c=item.contract,recordId=`exchange:${operationId}:${c.id}`;
      if(s.扩展.abilityExchanges[recordId])throw Error('交换义务已提交');
      const record={version:1,id:recordId,actorId:id,sourceId:source.id,kind:plan.kind,sourceSnapshot:clone(source),contract:c,operationId,payment:clone(payment??{operationId}),paymentEvidence:clone(options.paymentEvidence??null),startedAt:worldNow(s),status:'active',supportingStatusIds:item.supportingStatusIds,selfStatusIds:[],selfStatusProofs:[],benefitRefs:[],hadBenefits:false};
      s.扩展.abilityExchanges[recordId]=record;
      if(c.mode!=='condition')for(const [index,b] of c.burdens.entries()){
        const cost=costAbility(id,source,c,b,index,operationId),row={skillId:cost.id,effects:[]};
        const status=globalThis.SoulCombatEngine.applyStatus(s,s.战斗单位.列表[id],s.战斗单位.列表[id],cost.effectGraph.nodes[1],`${operationId}:cost:${c.id}:${index}`,row,{...cost,_fieldUse:!globalThis.SoulActionContext.battleOf(s,id),_exchangeRecordId:recordId,_fixedExchange:c.mode==='fixed'});
        if(!status)throw Error('自身负面无法实际成立');record.selfStatusIds.push(status.id);record.selfStatusProofs.push(clone(status));
      }
      stamp(record);ids.push(recordId);
    }
    return ids;
  }
  function complete(s,operationId,receipt){
    for(const r of records(s).filter(r=>r.operationId===operationId&&r.status==='active')){
      const refs=[];
      for(const target of receipt.targets??[])if(r.contract.benefits.branchIds.includes(target.branchId??'branch-main'))for(const e of target.effects??[]){
        if(e.statusId&&s.状态实例.列表[e.statusId])refs.push({kind:'status',id:e.statusId});
        if(e.effectId==='payload.shield'&&s.战斗单位.列表[target.targetId]?.扩展?.temporaryHealthSource===operationId)refs.push({kind:'shield',id:target.targetId});
        for(const [key,kind] of [['domainId','domain'],['zoneId','zone']])if(e[key])refs.push({kind,id:e[key],battleId:s.战斗.id});
        for(const id of e.summonedUnitIds??[])refs.push({kind:'summon',id,battleId:s.战斗.id});
      }
      r.benefitRefs=refs;r.hadBenefits=refs.length>0;stamp(r);
    }
    reconcile(s,receipt);
  }
  function refActive(s,r,ref){
    if(ref.kind==='status')return !!s.状态实例.列表[ref.id];
    if(ref.kind==='shield')return s.战斗单位.列表[ref.id]?.扩展?.temporaryHealthSource===r.operationId&&s.战斗单位.列表[ref.id].资源.生命.临时>0;
    if(ref.kind==='summon')return s.战斗单位.列表[ref.id]?.存活状态==='存活';
    return [s.战斗,...Object.values(s.世界?.backgroundBattles??{})].some(b=>ref.kind==='domain'?b.扩展?.领域实例?.[ref.id]:b.扩展?.区域效果?.[ref.id]);
  }
  function end(s,r,reason,receipt){
    r.status='ended';r.endedAt=worldNow(s);r.endReason=reason;stamp(r);
    if(r.contract.mode!=='fixed')for(const ref of r.benefitRefs){
      if(ref.kind==='status')globalThis.SoulCombatEngine.removeStatus(s,ref.id,'exchange-ended',receipt);
      if(ref.kind==='shield'&&refActive(s,r,ref))globalThis.SoulCombatFoundation.clearTemporaryHealth(s.战斗单位.列表[ref.id]);
      if(['domain','zone','summon'].includes(ref.kind))globalThis.SoulCombatEngine.endExchangeReference(s,ref,receipt);
    }
    if(r.contract.mode==='linked')for(const id of r.selfStatusIds)globalThis.SoulCombatEngine.removeStatus(s,id,'exchange-ended',receipt);
    receipt?.exchangeEvents?.push({id:r.id,reason,endedAt:r.endedAt});
  }
  const reconciling=new WeakSet();
  function reconcile(s,receipt=null){
    if(reconciling.has(s))return;reconciling.add(s);
    try{
      for(const r of records(s).filter(r=>r.status==='active')){
        const dead=s.人物?.列表?.[r.actorId]?.status==='dead';
        const invalid=r.contract.mode==='condition'?!r.contract.burdens.every(b=>matches(s,r.actorId,b,r.contract).length):!r.selfStatusIds.every(id=>s.状态实例.列表[id]);
        const switched=r.kind==='martialSoul'&&s.成长?.列表?.[r.actorId]?.激活武魂ID!==r.sourceId;
        if(dead){for(const id of r.selfStatusIds)globalThis.SoulCombatEngine.removeStatus(s,id,'real-person-dead',receipt);end(s,r,'real-person-dead',receipt);}
        else if(invalid)end(s,r,r.contract.mode==='fixed'?'term-completed':'burden-ended',receipt);
        else if(r.contract.mode!=='fixed'&&(switched||r.hadBenefits&&!r.benefitRefs.some(ref=>refActive(s,r,ref))))end(s,r,switched?'martial-soul-retracted':'benefits-ended',receipt);
      }
      for(const id of Object.keys(s.成长?.列表??{}).filter(id=>records(s).some(r=>r.actorId===id)||s.武魂?.列表?.[s.成长.列表[id].激活武魂ID]?.扩展?.结构化武魂?.exchangeContracts?.length))if(s.战斗单位.列表[id])globalThis.SoulCombatFoundation.refreshActiveMartialSoul(s,id,{inPlace:true});
    }finally{reconciling.delete(s);}
  }
  function validate(s){
    const errors=validateDesire(s);
    for(const [id,r] of Object.entries(s.扩展?.abilityExchanges??{}))if(id!==r?.id)errors.push('交换记录索引与真实回执不一致');
    for(const r of s.扩展?.dailyBreakAttempts??[])try{
      const {hash:proof,...body}=r,die=globalThis.SoulCombatEngine.makeRng(`${s.世界.seed}:daily-break:${r.id}`).die(20);
      if(proof!==hash(body)||r.actorProof.id!==r.actorId||r.statusProof.id!==r.statusId||!globalThis.SoulCombatEngine.validateBreakFreeSource(r.statusProof,r.actorId,globalThis.SoulSealingCore.statusTime(s,r.statusProof,r.startedAt))||r.die!==die||r.passed!==(die===20||die!==1&&die+r.profile.modifier>=r.profile.dc)||r.endedAt>worldNow(s)||r.endedAt-r.startedAt>10||!r.interruption&&r.endedAt-r.startedAt!==10)throw Error('日常挣脱真实来源、检定或时间证据');
      if(r.profile.method==='soul')globalThis.SoulDeviceOperations.validateSoulBreakReceipt(r);
      else{if(r.profile.method!==undefined&&r.profile.method!=='physical')throw Error('日常挣脱方法无效');
      const expected=globalThis.SoulCombatEngine.attributeModifier({状态实例:{列表:Object.fromEntries((r.attributeStatuses??[]).map(v=>[v.id,v]))}},r.actorProof,r.profile.attribute)+r.actorProof.派生.熟练加值+r.profile.traitBonus;
      if(r.profile.modifier!==expected||r.profile.dc<r.statusProof.快照.施加者DC+Number(r.statusProof.快照.参数.挣脱难度加值??0))throw Error('日常挣脱难度或属性证据');}
      if(r.profile.dc<r.statusProof.快照.施加者DC+Number(r.statusProof.快照.参数.挣脱难度加值??0))throw Error('日常挣脱难度低于真实来源');
    }catch(error){errors.push(`日常挣脱${r.id}：${error.message}`);}
    for(const r of records(s))try{
      const {hash:proof,...body}=r;if(proof!==hash(body)||r.version!==1||r.id!==`exchange:${r.operationId}:${r.contract.id}`||r.sourceId!==r.sourceSnapshot.id||!s.战斗单位.列表[r.actorId])throw Error('交换回执、来源或承担者');
      if(r.kind==='skill'){if(!globalThis.SoulAbilityContract.verify(r.sourceSnapshot).pass)throw Error('能力完整合同');}
      else globalThis.SoulMartialSoulCore.normalizeCompiledAttributes(r.sourceSnapshot);
      const c=normalize(r.sourceSnapshot.exchangeContracts,r.kind).find(c=>c.id===r.contract.id);if(hash(c)!==hash(r.contract)||r.payment.operationId!==r.operationId)throw Error('交换合同或支付关联');
      if(c.mode!=='condition'){
        if(r.selfStatusProofs?.length!==c.burdens.length||r.selfStatusIds.length!==c.burdens.length)throw Error('初始自付证据数量');
        for(const [index,proof] of r.selfStatusProofs.entries()){
          const cost=costAbility(r.actorId,r.sourceSnapshot,c,c.burdens[index],index,r.operationId);
          if(proof.id!==r.selfStatusIds[index]||proof.扩展?.施加分钟!==r.startedAt||hash(proof.扩展.持续来源合同)!==hash(cost)||!globalThis.SoulCombatEngine.validateControlSourceProof(proof,r.actorId,r.startedAt))throw Error('初始自付负担或开始时点');
        }
      }
      if(r.kind==='skill'){
        const e=r.paymentEvidence,k=r.sourceSnapshot,p=r.payment;if(!e||e.actor.id!==r.actorId||p.actorId!==r.actorId||p.skillId!==k.id||p.sourceId!==(k.usageKey??k.usageRules?.worldUsageGroup??k.id)||hash(e.actor.六维)!==hash(globalThis.SoulCombatFoundation.normalizeCombatant(e.actor).六维))throw Error('付款原始能力或承担者');
        const plan=p.exchangePlan;keys(plan,['kind','actorId','sourceId','plans'],'交换付款前计划');
        const peers=records(s).filter(v=>v.operationId===r.operationId&&v.kind==='skill');
        if(plan.kind!=='skill'||plan.actorId!==r.actorId||plan.sourceId!==r.sourceId||!Array.isArray(plan.plans)||plan.plans.length!==peers.length||peers.some(v=>v.actorId!==r.actorId||v.sourceId!==r.sourceId))throw Error('交换付款前计划身份或数量');
        for(const item of plan.plans)keys(item,['contract','supportingStatusIds'],'交换付款前合同计划');
        ids(plan.plans.map(item=>item.contract?.id),'交换付款前合同集合');
        const ordered=entries=>entries.map(v=>({contract:v.contract,supportingStatusIds:v.supportingStatusIds})).sort((a,b)=>a.contract.id.localeCompare(b.contract.id));
        if(hash(ordered(plan.plans))!==hash(ordered(peers)))throw Error('交换付款前计划与实际合同或支持来源不一致');
        const cast=Boolean(k.sourceKind==='soul-ring'||k.来源魂环ID||k.sourceRingId),native=Math.max(1,Math.min(9,Math.round(k.nativeCastRank??k.minimumCastRank??k.ringOrdinal??1))),rank=e.castRank;
        if(cast&&(!Number.isInteger(rank)||rank<native||rank>9))throw Error('实际付款环阶');
        let base=cast?Math.max(1,Number(k.soulPowerCost))+globalThis.SoulEffectCompiler.SOUL_RING_CAST_COST[rank]-globalThis.SoulEffectCompiler.SOUL_RING_CAST_COST[native]:Math.max(0,k.soulPowerCostRate>0?Math.ceil(e.actor.资源.魂力.最大*k.soulPowerCostRate):Math.round(k.soulPowerCost??0));
        if(base&&k.id!=='ordinary.attack'&&!['soul-device','soul-bone','consumable'].includes(k.sourceKind)){const m=e.actor.扩展?.武魂战斗修正??{};base=Math.max(1,Math.ceil(base*Math.min(3,Math.max(1,m.魂力消耗倍率??1))*(1-Math.min(.3,Math.max(0,m.魂力折扣??0)))));}
        if(e.modifier){if(e.fieldUse||!globalThis.SoulCombatEngine.validateControlSourceProof(e.modifier,r.actorId,r.startedAt))throw Error('实际费用修正来源');base=Math.ceil(base*Number(e.modifier.快照.参数.魂力消耗倍率??100)/100);}
        if(hash(p.contract)!==hash(globalThis.SoulAbilityContract.describe(k,{modeId:p.contract.modeId,soulPowerCost:base})))throw Error('支付合同与原始能力实际费用不一致');
        if(p.resources.before.soulPower!==e.actor.资源.魂力.当前||p.resources.before.health!==e.actor.资源.生命.当前)throw Error('支付前资源基准');
        const totals={soulPower:0,health:0,lifespan:0};for(const fee of r.payment.contract.costs??[])if(fee.kind in totals)totals[fee.kind]+=fee.amount;
        if(hash(totals)!==hash(r.payment.totals)||['health','soulPower'].some(k=>r.payment.resources.before[k]-r.payment.resources.after[k]!==totals[k]))throw Error('支付数额与费用合同不一致');
        const command=s.世界?.processedTransactions?.[r.operationId]??[s.战斗,...Object.values(s.世界?.backgroundBattles??{})].flatMap(b=>Object.values(b.扩展?.已结算行动??{})).find(receipt=>receipt.id===r.operationId);
        const paid=command?.payment??command?.ability?.payment??command?.result?.receipt?.payment;
        if(paid&&hash(paid)!==hash(r.payment))throw Error('支付回执与正式命令不一致');
        const life=s.人物?.列表?.[r.actorId]?.life?.adjustments?.find(e=>e.id===`${r.operationId}:lifespan`);if(totals.lifespan?(!life||life.kind!=='cost'||life.minutes!==totals.lifespan||life.at!==r.startedAt||life.sourceId!==p.sourceId||life.sacrificial!==p.sacrificial):!!life)throw Error('实际寿命费用');
        const stock=new Map(e.paidItems.map(i=>[i.id,i])),reserved=new Map();for(const fee of p.items){const item=stock.get(fee.itemId);if(!item||item.ownerEntityId!==r.actorId||item.quantity!==fee.quantityBefore||fee.quantityAfter!==fee.quantityBefore-fee.quantity||fee.quantity<1||fee.quantityAfter<0||reserved.has(fee.itemId))throw Error('实际物品付款');reserved.set(fee.itemId,fee.quantity);}
        const itemCosts=p.contract.costs.filter(f=>f.kind==='item');if(['consumable','hidden-weapon'].includes(k.sourceKind)&&!e.preserveOralDose)itemCosts.push({kind:'item',itemId:k.sourceItemId,quantity:1});
        for(const fee of itemCosts.sort((a,b)=>Number(!!b.itemId)-Number(!!a.itemId))){let needed=fee.quantity;for(const [id,n] of reserved){if(fee.itemId?id!==fee.itemId:stock.get(id).templateId!==fee.templateId)continue;const paid=Math.min(needed,n);needed-=paid;reserved.set(id,n-paid);}if(needed)throw Error('物品费用数量');}if([...reserved.values()].some(n=>n))throw Error('额外物品费用');
        if(!e.usageBefore?.available||hash(e.usageBefore.rules)!==hash(globalThis.SoulAbilityContract.skillUsageRules(k)))throw Error('原始使用额度');
        const usage=e.usageBefore.rules,ledger=e.usageLedger;
        if((usage.dailyLimit||usage.worldCooldownDays)&&(!ledger||ledger.dailyUsed!==e.usageBefore.dailyUsed+1))throw Error('实际每日次数付款');
        if(!e.fieldUse&&usage.perBattleLimit&&(!ledger||ledger.perBattleUsed!==e.usageBefore.perBattleUsed+1))throw Error('实际本场次数付款');
        if(!e.fieldUse&&usage.perBattleGroupLimit&&(!ledger||ledger.perBattleGroupUsed!==e.usageBefore.perBattleGroupUsed+1))throw Error('实际同组次数付款');
      }
      if(r.status==='active'&&c.mode!=='condition')for(const [index,id] of r.selfStatusIds.entries()){
        const status=s.状态实例.列表[id],cost=costAbility(r.actorId,r.sourceSnapshot,c,c.burdens[index],index,r.operationId);
        if(!status||status.目标单位ID!==r.actorId||status.扩展?.exchangeRecordId!==r.id||hash(status.扩展.持续来源合同)!==hash(cost)||!!status.扩展.固定交换义务!==(c.mode==='fixed'))throw Error('实际自付状态与来源');
      }
      if(r.status==='active'&&c.mode==='fixed'&&r.selfStatusIds.length!==c.burdens.length)throw Error('固定义务数量');
      if(!Number.isSafeInteger(r.startedAt)||r.startedAt>worldNow(s)||!['active','ended'].includes(r.status)||r.status==='ended'&&(!Number.isSafeInteger(r.endedAt)||r.endedAt<r.startedAt||r.endedAt>worldNow(s)||!r.endReason))throw Error('结束证据');
      if(r.status==='ended'&&c.mode==='fixed'){
        if(r.endReason==='term-completed'&&personalNow(s,r.actorId,r.endedAt)<personalNow(s,r.actorId,r.startedAt)+c.durationMinutes)throw Error('固定期限尚未履行');
        if(r.endReason==='real-person-dead'&&(s.人物?.列表?.[r.actorId]?.status!=='dead'||s.人物.列表[r.actorId].life?.death?.at!==r.endedAt))throw Error('缺少真实死亡证据');
        if(!['term-completed','real-person-dead'].includes(r.endReason))throw Error('固定期限结束原因无效');
      }
    }catch(error){errors.push(`交换${r.id}：${error.message}`);}
    for(const v of Object.values(s.状态实例?.列表??{}))if(v.扩展?.exchangeRecordId&&!s.扩展?.abilityExchanges?.[v.扩展.exchangeRecordId]?.selfStatusIds.includes(v.id))errors.push('自付状态缺少真实交换回执');
    return errors;
  }
  return Object.freeze({VERSION,MODES,REGISTRY,ATTRIBUTES,normalize,quoteContracts,describe,origin,burdenGroup,desireFacts,activeCheckPenalty,selfControl,onDesireApplied,nextDesireAt,advanceDesireAt,validateDesire,preview,pay,complete,reconcile,validate,matches,contractActive,branchActive,hooks,sourceScale,controlBonus,applyBacklash});
});
