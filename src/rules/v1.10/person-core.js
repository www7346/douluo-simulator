(function attachPersonCore(root,factory){
  const context=root?.SoulExpeditionContext??(typeof require==='function'?require('../../shared/expedition-context-core.js'):null);
  const api=factory(context);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulPersonCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function createPersonCore(context){
  'use strict';
  let deathSettlement=null;
  function bindDeathSettlement(fn){deathSettlement=fn;}
  const MINUTES_PER_YEAR=360*1440;
  // Game balance, not a claim about canonical ages or immortality.
  const LIFESPAN_TIERS=Object.freeze([
    [0,100],[10,120],[30,150],[50,200],[70,300],[91,500],[95,800],[99,1200]
  ].map(([level,years])=>Object.freeze({level,years})));
  const UNKNOWN_AGE_YEARS=18;
  const integer=(value,label,min=0)=>{
    if(!Number.isSafeInteger(value)||value<min)throw Error(`${label}必须为有效整数`);
    return value;
  };
  function now(state){
    const time=state.世界?.时间;
    if(!time)throw Error('缺少世界时钟');
    integer(time.day,'世界日',1);integer(time.hour,'小时');integer(time.minute,'分钟');
    if(time.hour>23||time.minute>59)throw Error('世界时钟无效');
    return integer(time.day*1440+time.hour*60+time.minute,'世界分钟');
  }
  function personalNow(state,id,at=now(state)){return globalThis.SoulSealingCore?.personalNow(state,id,at)??at;}
  function levelOf(state,id){
    return Math.max(0,Math.min(99,Number(state.成长?.列表?.[id]?.魂力等级??state.战斗单位?.列表?.[id]?.成长?.魂力等级??0)));
  }
  function baseYears(level){
    integer(level,'历史最高魂力等级');
    if(level>99)throw Error('历史最高魂力等级超出本版范围');
    return LIFESPAN_TIERS.filter(tier=>tier.level<=level).at(-1).years;
  }
  function personAt(state,id){
    const person=state.人物?.列表?.[id];
    if(!person)throw Error('人物不存在');
    return person;
  }
  /** Creation only. Existing people with missing records are rejected on load. */
  function initialize(state,id,options={}){
    const person=personAt(state,id);
    if(person.life)throw Error('人物已有寿命记录，不能重新初始化');
    const ageKnown=Number.isSafeInteger(person.age)&&person.age>0;
    const basis=options.lifeBasis;
    const age=integer(options.ageYears??basis?.ageYears??(ageKnown?person.age:UNKNOWN_AGE_YEARS),'初始年龄');
    const level=integer(options.level??levelOf(state,id),'初始等级');
    const lifespan=basis?integer(basis.baseLifespanYears,'本源寿命',1):baseYears(level);
    if(basis&&(!basis.kind||!basis.evidence))throw Error('非人寿命缺少本源依据');
    if(age>=lifespan)throw Error('初始年龄不能达到或超过当前修为的总寿命');
    person.life={version:1,bornAt:now(state)-age*MINUTES_PER_YEAR,ageKnown,
      ageSource:options.source??(ageKnown?'character-creation':'game-balance-unknown-age'),
      highestLevel:level,adjustments:[],death:null,...(basis?{origin:JSON.parse(JSON.stringify(basis))}:{})};
    return person.life;
  }
  function syncGrowth(state,id){
    const life=personAt(state,id).life;
    if(!life)throw Error('人物缺少寿命记录');
    life.highestLevel=Math.max(life.highestLevel,levelOf(state,id));
  }
  function facts(state,id,at=now(state)){
    const person=personAt(state,id),life=person.life;
    if(!life)throw Error('人物缺少寿命记录');
    const currentPeak=Math.max(life.highestLevel,levelOf(state,id));
    const origin=globalThis.SoulCommerceProvenance?.origin(state,id);
    const baseMinutes=(life.origin?.baseLifespanYears??origin?.humanLifespanYears??baseYears(currentPeak))*MINUTES_PER_YEAR;
    const paidMinutes=life.adjustments.filter(a=>a.kind==='cost').reduce((sum,a)=>sum+a.minutes,0);
    const addedMinutes=life.adjustments.filter(a=>a.kind==='extension').reduce((sum,a)=>sum+a.minutes,0);
    const paused=globalThis.SoulSealingCore?.pausedMinutes(state,id,at)??0;
    const expiresAt=life.bornAt+baseMinutes+addedMinutes-paidMinutes+paused;
    return {personId:id,at,bornAt:life.bornAt,ageYears:Math.floor((personalNow(state,id,life.death?.at??at)-life.bornAt)/MINUTES_PER_YEAR),
      ageKnown:life.ageKnown,ageSource:life.ageSource,highestLevel:currentPeak,baseMinutes,paidMinutes,addedMinutes,
      expiresAt,remainingMinutes:life.death?0:Math.max(0,expiresAt-at),death:life.death};
  }
  function isDead(state,id){
    const person=personAt(state,id),unit=state.战斗单位?.列表?.[person.combatantId||id];
    return !!person.life?.death||person.status==='dead'||unit?.存活状态==='死亡';
  }
  function assertAlive(state,id){
    if(isDead(state,id)||facts(state,id).remainingMinutes<=0)throw Error('人物已经死亡或寿命耗尽，无法行动');
  }
  function checkPayment(state,id,minutes,options={}){
    integer(minutes,'消耗寿命分钟',1);assertAlive(state,id);
    const remaining=facts(state,id).remainingMinutes;
    if(minutes>remaining)throw Error('剩余寿命不足');
    if(minutes===remaining&&!options.sacrificial)throw Error('只有明确的献祭能力可以耗尽寿命');
    return {minutes,remainingAfter:remaining-minutes,exhausts:minutes===remaining};
  }
  function adjustment(state,id,kind,minutes,sourceId,eventId,options={}){
    const person=personAt(state,id),life=person.life;
    if(!life)throw Error('人物缺少寿命记录');
    if(typeof sourceId!=='string'||!sourceId||typeof eventId!=='string'||!eventId)throw Error('寿命变更缺少实际来源或事务编号');
    integer(minutes,'寿命变更分钟',1);
    const prior=life.adjustments.find(a=>a.id===eventId);
    if(prior){
      if(prior.kind!==kind||prior.minutes!==minutes||prior.sourceId!==sourceId)throw Error('同一寿命事务不能改换内容');
      return {entry:prior,idempotent:true};
    }
    if(kind==='cost')checkPayment(state,id,minutes,options);else assertAlive(state,id);
    const entry={id:eventId,kind,minutes,sourceId,at:now(state),sacrificial:kind==='cost'&&!!options.sacrificial};
    life.adjustments.push(entry);
    return {entry,idempotent:false};
  }
  function pay(state,id,minutes,sourceId,eventId,options={}){
    return adjustment(state,id,'cost',minutes,sourceId,eventId,options);
  }
  function extend(state,id,minutes,sourceId,eventId){
    return adjustment(state,id,'extension',minutes,sourceId,eventId);
  }
  function die(state,id,cause,sourceId,at=now(state)){
    const person=personAt(state,id),life=person.life;
    if(!life)throw Error('人物缺少寿命记录');
    if(life.death)return life.death;
    const death={id:`death:${id}:${sourceId}`,at,cause,sourceId};
    const expedition=context.forActor(state,id,{presentOnly:false});
    if(!globalThis.SoulInteriorSpaces?.membership(state,id)&&expedition&&(expedition.leaderId===id||expedition.companions.some(c=>c.unitId===id&&c.active))){death.position={kind:'location',locationId:person.locationId,sceneId:`expedition:${expedition.id}:${expedition.currentNodeId}`};person.spaceId=death.position.sceneId;}
    life.death=death;person.status='dead';
    const unit=state.战斗单位?.列表?.[person.combatantId||id];
    if(unit){unit.存活状态='死亡';unit.资源.生命.当前=0;}
    globalThis.SoulSealingCore?.onDeath(state,id,death);globalThis.SoulResidentRealms?.reconcile(state);globalThis.SoulCombatDeployments?.reconcile(state);globalThis.SoulPerformanceAgreements?.advanceAt(state);
    globalThis.SoulCombatEngine?.settleWorldStatusesAt(state,at);
    globalThis.SoulWorldEngine?.settlePersonDeath(state,id);
    deathSettlement?.(state,id,death);
    globalThis.SoulCustodyCore?.reconcileDeaths(state);globalThis.SoulCustodyMarket?.reconcileDeaths(state);globalThis.SoulCustodyAuction?.reconcileDeaths(state);globalThis.SoulWorldSocial?.ingest(state);
    globalThis.SoulCooperationCore?.reconcile(state);globalThis.SoulCooperationPreparation?.reconcile(state);
    globalThis.SoulCommerceAuction?.advanceAt(state);
    state.历史??=[];state.历史.push({type:'person-death',personId:id,...death});
    return death;
  }
  /** Called before due actions and after paid effects, never before a sacrifice's effect. */
  function settleAt(state,at=now(state)){
    const deaths=[];
    for(const id of Object.keys(state.人物?.列表??{}).sort()){
      const person=personAt(state,id);syncGrowth(state,id);
      const current=facts(state,id,at);
      if(person.life.ageKnown&&person.age!==current.ageYears){const before={...person,扩展:JSON.parse(JSON.stringify(person.扩展??{}))};person.age=current.ageYears;(globalThis.SoulGenericVisuals??(typeof require==='function'?require('../../shared/generic-human-art-core.js'):null))?.assignBody(state,person,before);}
      if(person.life.death)continue;
      if(isDead(state,id))deaths.push(die(state,id,'已成立的死亡','confirmed-death',at));
      else if(current.expiresAt<=at)deaths.push(die(state,id,'寿命耗尽','lifespan',current.expiresAt));
    }
    return deaths;
  }
  function nextExpiry(state,through){
    const current=now(state),due=[];
    for(const person of Object.values(state.人物?.列表??{})){
      if(isDead(state,person.id)||globalThis.SoulSealingCore?.isStasis(state,person.id))continue;
      const at=Math.max(current,facts(state,person.id).expiresAt);
      if(at<=through)due.push(at);
    }
    return due.length?Math.min(...due):null;
  }
  function validate(state){
    const errors=[],at=now(state);
    for(const person of Object.values(state.人物?.列表??{})){
      try{
        const life=person.life;
        if(!life||life.version!==1||!Number.isSafeInteger(life.bornAt)||life.bornAt>at||typeof life.ageKnown!=='boolean'||typeof life.ageSource!=='string'||!life.ageSource||!Array.isArray(life.adjustments))throw Error('基础记录无效');
        baseYears(life.highestLevel);
        if(life.origin){const expected=globalThis.SoulCanonicalGrowth?.lifeBasisFor(person.扩展?.角色库ID);if(!expected||JSON.stringify(expected)!==JSON.stringify(life.origin))throw Error('非人寿命与本源档案不符');}
        const ids=new Set();
        for(const a of life.adjustments){
          if(!a.id||ids.has(a.id)||!['cost','extension'].includes(a.kind)||!a.sourceId||!Number.isSafeInteger(a.at)||a.at>at||typeof a.sacrificial!=='boolean')throw Error('寿命账本无效');
          integer(a.minutes,'寿命变更',1);ids.add(a.id);
        }
        const current=facts(state,person.id);
        if(!Number.isSafeInteger(current.expiresAt)||!Number.isSafeInteger(current.paidMinutes)||!Number.isSafeInteger(current.addedMinutes))throw Error('寿命数值越界');
        const unit=state.战斗单位?.列表?.[person.combatantId||person.id];
        if(life.death&&(!life.death.id||!life.death.cause||!life.death.sourceId||!Number.isSafeInteger(life.death.at)||life.death.at>at||person.status!=='dead'||unit&&(unit.存活状态!=='死亡'||unit.资源.生命.当前!==0)))throw Error('死亡记录无效');
        if(life.death?.position){const p=life.death.position;if(p.kind!=='location'||typeof p.locationId!=='string'||!p.locationId||state.地图&&!state.地图.地点?.[p.locationId]||typeof p.sceneId!=='string'||!p.sceneId.startsWith('expedition:')||person.locationId!==p.locationId||person.spaceId!==p.sceneId||person.transit)throw Error('远征死亡现场与遗体位置不一致');}
        if(!life.death&&current.expiresAt<=at)throw Error('寿命已经耗尽但没有死亡记录');
      }catch(error){errors.push(`人物${person.id}：${error.message}`);}
    }
    return errors;
  }
  function nextEventOrder(state){state.扩展??={};const n=Number(state.扩展.personEventSequence??0)+1;if(!Number.isSafeInteger(n))throw Error('人物事件顺序超限');state.扩展.personEventSequence=n;return n;}
  return Object.freeze({MINUTES_PER_YEAR,LIFESPAN_TIERS,UNKNOWN_AGE_YEARS,bindDeathSettlement,nextEventOrder,now,personalNow,levelOf,baseYears,initialize,syncGrowth,facts,isDead,assertAlive,checkPayment,pay,extend,die,settleAt,nextExpiry,validate});
});
