(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.SoulIntimateCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // 2026-10-21 玩家确认的条目：快感满值强制高潮；尿意满值强制失禁；尿道锁内继续累积并渗漏。
  const VERSION='intimate-v1';
  const AROUSAL_MAX=100,BLADDER_MAX=100,BLADDER_LOCK_CAP=200,BLADDER_LOCK_LEAK=40;
  const REFRACTORY_MINUTES=3,OVERSTIM_WINDOW=10,SENSITIVE_MINUTES=10,PRESSURE_CHECK_MINUTES=30;
  const AROUSAL_DECAY=3,REFRACTORY_DECAY=6,BLADDER_PER_MINUTE=8/60,BLADDER_LOCK_RATE=.5;
  const LEVEL_GAIN=Object.freeze([0,2,4,7,11,16]);
  const PART_FACTOR=Object.freeze({阴蒂:1.5,尿道:1.3,下体前:1.2,乳头:1,后庭:.9,口腔:.8});
  const DEFAULTS=Object.freeze({快感:0,尿意:0,敏感:0,敏感至:null,不应期至:null,连续高潮:0,上次高潮:null,憋尿检查至:null});
  const INCAPACITATING=Object.freeze(['status.paralysis','status.bind','status.limb_bind','status.sleep','status.stun']);
  const CONTROLLING=Object.freeze(['status.mind_control','status.soul_control','status.cognition_shift']);
  const round=value=>Math.round(Number(value)||0);
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,round(value)));
  const alive=status=>status&&status.状态!=='已结束';
  function person(state,id){return state?.人物?.列表?.[id]??null;}
  function read(state,id){
    const result={...DEFAULTS},raw=person(state,id)?.扩展?.生理;
    if(raw&&typeof raw==='object')for(const key of Object.keys(DEFAULTS))if(raw[key]!==undefined)result[key]=raw[key];
    return result;
  }
  function write(state,id,next){
    const target=person(state,id);if(!target)return null;
    target.扩展??={};
    const value={
      快感:clamp(next.快感,0,AROUSAL_MAX),
      尿意:clamp(next.尿意,0,BLADDER_LOCK_CAP),
      敏感:clamp(next.敏感,0,3),
      敏感至:next.敏感至??null,
      不应期至:next.不应期至??null,
      连续高潮:clamp(next.连续高潮,0,99),
      上次高潮:next.上次高潮??null,
      憋尿检查至:next.憋尿检查至??null
    };
    target.扩展.生理=value;
    return value;
  }
  function statusIds(state,id){return Object.values(state?.状态实例?.列表??{}).filter(status=>alive(status)&&status.目标单位ID===id).map(status=>status.模板ID);}
  function stimuli(state,id){
    return Object.values(state?.状态实例?.列表??{}).filter(status=>alive(status)&&status.目标单位ID===id&&status.模板ID==='status.device_stimulus').map(status=>{
      const params=status.快照?.参数??{};
      return {档位:clamp(params.档位,0,5),部位:String(params.部位??'下体前'),设备ID:String(params.设备ID??'')};
    });
  }
  function gainPerMinute(entries,sensitivity){
    let base=0;
    for(const entry of entries)base+=(LEVEL_GAIN[clamp(entry.档位,0,5)]??0)*(PART_FACTOR[entry.部位]??1);
    return base*sensitivity;
  }
  /** Pure结算：只返回下一份生理值与事件，不写 state。 */
  function plan(state,id,minutes,options={}){
    const now=Number.isFinite(options.now)?round(options.now):0,current=read(state,id),events=[];
    const entries=options.stimuli??stimuli(state,id),refractory=current.不应期至!==null&&now<current.不应期至;
    if(current.敏感至!==null&&now>current.敏感至){current.敏感=0;current.敏感至=null;}
    const sensitivity=1+.15*clamp(current.敏感,0,3);
    let rate=gainPerMinute(entries,sensitivity);
    if(rate>0){
      if(options.desireStrength>=3)rate*=1.2;
      if(options.battle)rate*=0.8;
      if(refractory)rate*=.5;
    }
    const span=Math.max(0,Number(minutes)||0);
    let arousal=rate>0?current.快感+rate*span:Math.max(0,current.快感-(refractory?REFRACTORY_DECAY:AROUSAL_DECAY)*span);
    if(arousal>=AROUSAL_MAX){
      const overflow=arousal-AROUSAL_MAX,repeated=current.上次高潮!==null&&now-current.上次高潮<=OVERSTIM_WINDOW;
      events.push({type:'climax',forced:true,overflow:Math.round(overflow),at:now,source:entries.map(entry=>entry.设备ID).filter(Boolean),repeated});
      arousal=0;
      current.连续高潮=repeated?clamp(current.连续高潮+1,1,99):1;
      if(overflow>=20&&current.敏感<3){current.敏感=clamp(current.敏感+1,0,3);current.敏感至=now+SENSITIVE_MINUTES;}
      current.不应期至=now+REFRACTORY_MINUTES;
      current.上次高潮=now;
    }
    const locked=!!options.locked;
    let bladder=current.尿意+BLADDER_PER_MINUTE*span*(locked?BLADDER_LOCK_RATE:1)+(Number(options.drinks)||0)*10;
    if(locked&&bladder>=BLADDER_LOCK_CAP){
      bladder=BLADDER_LOCK_CAP-BLADDER_LOCK_LEAK;
      events.push({type:'incontinence',reason:'lock-overflow',forced:true,at:now});
    }else if(!locked&&bladder>=BLADDER_MAX){
      bladder=0;
      events.push({type:'incontinence',reason:'full',forced:true,at:now});
    }
    if(locked&&bladder>=120&&(current.憋尿检查至===null||now>=current.憋尿检查至)){
      events.push({type:'urine-pressure',at:now});
      current.憋尿检查至=now+PRESSURE_CHECK_MINUTES;
    }
    current.快感=clamp(arousal,0,AROUSAL_MAX);
    current.尿意=clamp(bladder,0,BLADDER_LOCK_CAP);
    return {生理:current,events};
  }
  /** 按十分钟一段结算，避免大段时间跳跃一次跳过阈值。 */
  function tick(state,id,minutes,options={}){
    let remaining=Math.max(0,Number(minutes)||0),events=[],next=read(state,id);
    while(remaining>0){
      const span=Math.min(10,remaining);
      const result=plan(state,id,span,{...options,now:(options.now??0)+((minutes-remaining)||0)});
      next=result.生理;events=events.concat(result.events);remaining-=span;
    }
    write(state,id,next);
    return {生理:next,events};
  }
  function urinate(state,id,options={}){
    if(options.locked)return {ok:false,reason:'尿道锁阻止排尿',生理:read(state,id)};
    const next=read(state,id);next.尿意=0;write(state,id,next);
    return {ok:true,reason:'',生理:next};
  }
  /** 无反抗能力：失能状态、精神/灵魂/认知控制，或调用方给出的关押、战败证据。 */
  function defenseless(state,id,evidence={}){
    const ids=statusIds(state,id);
    if(ids.some(value=>INCAPACITATING.includes(value)))return {ok:true,reason:'incapacitated'};
    if(ids.some(value=>CONTROLLING.includes(value)))return {ok:true,reason:'controlled'};
    if(evidence.custody)return {ok:true,reason:'custody'};
    if(evidence.defeat)return {ok:true,reason:'defeat'};
    if(evidence.incapacitated)return {ok:true,reason:'incapacitated'};
    return {ok:false,reason:''};
  }
  function describe(state,id){
    const value=read(state,id),parts=[];
    if(value.快感>0)parts.push(`快感 ${value.快感}/100`);
    if(value.尿意>0)parts.push(`尿意 ${value.尿意}/100`);
    if(value.敏感>0)parts.push(`敏感 +${value.敏感} 层`);
    if(id&&value.不应期至!==null)parts.push('不应期中');
    return parts.join(' · ');
  }
  // 情具：走 attachment，槽位独立于拘束器的 part，不占魂导器槽。
  const DEVICES=Object.freeze({
    'intimate-chastity-belt':{name:'贞操带',icon:'🔒',kind:'chastity',slots:['下体前','阴蒂','后庭'],covers:['下体前','阴蒂','后庭'],maxLevel:99,price:760,breakDifficulty:28,capture:true,concealment:0,needsKey:true,maxStimLevel:0,effects:['status.chastity']},
    'intimate-vibrator-egg':{name:'灵振跳蛋',icon:'🥚',kind:'vibrator',slots:['下体前'],covers:[],maxLevel:99,price:260,breakDifficulty:12,capture:false,concealment:3,needsKey:false,remote:true,maxStimLevel:5,effects:[]},
    'intimate-anal-plug':{name:'后庭塞',icon:'🔻',kind:'plug',slots:['后庭'],covers:[],maxLevel:99,price:220,breakDifficulty:14,capture:false,concealment:3,needsKey:false,remote:false,maxStimLevel:3,effects:[]},
    'intimate-nipple-ring':{name:'乳环',icon:'⭕',kind:'ring',slots:['乳头左','乳头右'],covers:[],maxLevel:99,price:180,breakDifficulty:10,capture:false,concealment:1,needsKey:false,remote:false,maxStimLevel:2,effects:['status.sensitive']},
    'intimate-clit-ring':{name:'阴蒂环',icon:'💍',kind:'ring',slots:['阴蒂'],covers:[],maxLevel:99,price:200,breakDifficulty:12,capture:false,concealment:2,needsKey:false,remote:false,maxStimLevel:3,effects:['status.sensitive']},
    'intimate-urethral-lock':{name:'尿道锁',icon:'🔑',kind:'urethral',slots:['尿道'],covers:[],maxLevel:99,price:480,breakDifficulty:26,capture:true,concealment:3,needsKey:true,remote:false,maxStimLevel:1,blocksUrine:true,effects:['status.urine_lock']},
    'intimate-ball-gag':{name:'口球',icon:'🟡',kind:'gag',slots:['口腔'],covers:[],maxLevel:99,price:120,breakDifficulty:16,capture:false,concealment:1,needsKey:false,remote:false,maxStimLevel:0,effects:['status.mute']},
    'intimate-collar':{name:'铃铛项圈',icon:'📿',kind:'collar',slots:['颈部'],covers:[],maxLevel:99,price:160,breakDifficulty:24,capture:false,concealment:1,needsKey:false,remote:false,maxStimLevel:0,effects:['status.collared']},
    'intimate-blindfold':{name:'眼罩',icon:'🕶️',kind:'blindfold',slots:['眼部'],covers:[],maxLevel:99,price:80,breakDifficulty:10,capture:false,concealment:0,needsKey:false,remote:false,maxStimLevel:0,effects:['status.blind']}
  });
  const DEVICE_DESCRIPTIONS=Object.freeze({"intimate-chastity-belt":"金属护带带有覆盖结构与锁扣，佩戴后按器具规则限制对应部位。","intimate-vibrator-egg":"卵形小型振动器具，可调节档位，支持专用遥控。","intimate-anal-plug":"带宽底座的塞形器具，可按登记档位调节。","intimate-nipple-ring":"一对小型环饰，佩戴后形成对应的敏感状态。","intimate-clit-ring":"小型开口环饰，可调节档位，并形成对应的敏感状态。","intimate-urethral-lock":"带锁的小型器具，锁定后按专用规则限制排尿。","intimate-ball-gag":"球体与可调节束带组成的口部器具，佩戴后限制完整发声与吞服。","intimate-collar":"带铃铛的颈部环带，佩戴后记录项圈状态。","intimate-blindfold":"遮光软垫与调节束带组成的眼罩，佩戴后限制视觉。"});
  const ITEM_TEMPLATES=Object.freeze(Object.fromEntries(Object.entries(DEVICES).map(([id,d])=>[id,{name:d.name,description:DEVICE_DESCRIPTIONS[id],type:'情具',basePrice:d.price,stackable:false,maxDurability:100,tags:['情具'],intimate:true}])));
  function deviceOf(item){return item?DEVICES[item.templateId]??null:null;}
  function wornItems(state,id,candidates=Object.values(state?.物品?.实例??{})){return candidates.filter(item=>item?.attachment?.wearerId===id&&DEVICES[item.templateId]&&!globalThis.SoulWearableCore?.registered(item));}
  function slotsInUse(state,id){return new Set([...wornItems(state,id).flatMap(item=>{const device=DEVICES[item.templateId];return [item.attachment.slot,...(device.covers??[])];}),...(globalThis.SoulWearableCore?.wornItems(state,id)??[]).map(item=>item.attachment.slot)]);}
  function stimuliFromItems(state,id){
    const base=wornItems(state,id).flatMap(item=>{
      const device=DEVICES[item.templateId],level=clamp(item.attachment?.level,0,device.maxStimLevel??0);
      return level>0?[{档位:level,部位:device.slots[0],设备ID:item.id}]:[];
    });
    const hosts=globalThis.SoulHostCore?.hostItems?.(state,id)??[];
    return [...base,...hosts.flatMap(item=>globalThis.SoulHostCore.project(state,item).stimuli)];
  }
  function urineLocked(state,id){
    if(wornItems(state,id).some(item=>DEVICES[item.templateId].blocksUrine))return true;
    return (globalThis.SoulHostCore?.hostItems?.(state,id)??[]).some(item=>globalThis.SoulHostCore.project(state,item).urineLocked);
  }
  function nowOf(state){return Number(state?.世界?.时间?.totalMinutes??state?.系统?.clockMinutes??0);}
  function logEvent(state,payload){
    const list=state.扩展.intimateEvents??=[];const event={id:`intimate:${list.length+1}`,...payload};
    list.push(event);return event;
  }
  function placeItem(state,actorId,item){
    const container=state.容器?.列表?.[item.containerId];
    if(container)container.itemIds=container.itemIds.filter(value=>value!==item.id);
    const containerId=`container-restraints-${item.attachment.wearerId}`;
    if(!state.容器.列表[containerId])state.容器.列表[containerId]={id:containerId,type:'restraints',ownerEntityId:'',locationId:state.人物.列表[item.attachment.wearerId]?.locationId??'',itemIds:[],capacity:{slots:6},status:'active',扩展:{wearerId:item.attachment.wearerId}};
    item.containerId=containerId;
    const target=state.容器.列表[containerId];
    target.itemIds.push(item.id);target.ownerEntityId='';
  }
  function equip(state,request={}){
    const neutral=globalThis.SoulWearableCore;if(neutral?.registered(state.物品?.实例?.[request.itemId]))return neutral.equip(state,request,request.sourceId??('wearable-direct:equip:'+request.itemId+':'+((state.扩展?.wearables?.events?.length??0)+1)));
    const {actorId,targetId,itemId,slot,level=0,forced=false,evidence={}}=request;
    const item=state.物品?.实例?.[itemId],device=deviceOf(item),target=state.人物?.列表?.[targetId],actor=state.人物?.列表?.[actorId];
    if(!item||!device)throw Error('这不是已登记的情具');
    if(!target||!actor)throw Error('装配需要真实的操作者与佩戴者');
    if(item.attachment)throw Error('这件器具已经装配在别人身上');
    if(item.ownerEntityId!==actorId&&actorId!==targetId)throw Error('装配者必须实际持有这件器具');
    if(item.quantity!==1||item.durability<=0)throw Error('器具必须完好且为单独一件');
    const wearSlot=slot??device.slots[0];
    if(!device.slots.includes(wearSlot))throw Error('该器具不能装在这个部位');
    const used=slotsInUse(state,targetId);
    if(used.has(wearSlot))throw Error('该部位已经佩戴其他器具');
    if((device.covers??[]).some(value=>used.has(value)))throw Error('目标身上已有器具覆盖这些部位');
    if(wornItems(state,targetId).some(other=>(DEVICES[other.templateId].covers??[]).includes(wearSlot)))throw Error('该部位被已佩戴的器具覆盖');
    if(!forced&&actorId!==targetId)throw Error('强制佩戴前需要确认对方没有反抗能力');
    if(forced&&actorId!==targetId&&!defenseless(state,targetId,evidence).ok)throw Error('目标仍有反抗能力，不能强制佩戴');
    item.attachment={wearerId:targetId,slot:wearSlot,level:clamp(level,0,device.maxStimLevel??0),controllers:[actorId],sourceId:request.sourceId??`intimate:${itemId}:${nowOf(state)}`,forced:forced||actorId!==targetId,attachedAt:nowOf(state)};
    placeItem(state,actorId,item);
    logEvent(state,{type:'device-attached',at:nowOf(state),actorId,targetId,itemId,slot:wearSlot,forced:item.attachment.forced,templateId:item.templateId});
    return {itemId,weapon:item.name,slot:wearSlot,level:item.attachment.level,forced:item.attachment.forced};
  }
  function detach(state,request={}){
    const neutral=globalThis.SoulWearableCore;if(neutral?.registered(state.物品?.实例?.[request.itemId]))return neutral.detach(state,request,request.sourceId??('wearable-direct:detach:'+request.itemId+':'+((state.扩展?.wearables?.events?.length??0)+1)));
    const {actorId,itemId}=request,item=state.物品?.实例?.[itemId];
    if(!item?.attachment)throw Error('这件器具当前没有装配');
    const attachment=item.attachment,device=deviceOf(item);
    if(!attachment.controllers.includes(actorId)&&attachment.wearerId!==actorId&&!defenseless(state,attachment.wearerId,{custody:true}).ok)throw Error('没有解除这件器具的权限');
    if(device.needsKey&&!attachment.controllers.includes(actorId))throw Error('需要钥匙才能解除');
    delete item.attachment;
    logEvent(state,{type:'device-detached',at:nowOf(state),actorId,targetId:attachment.wearerId,itemId,slot:attachment.slot});
    return {itemId,worn:false};
  }
  function setLevel(state,request={}){
    const neutral=globalThis.SoulWearableCore;if(neutral?.registered(state.物品?.实例?.[request.itemId]))return neutral.setLevel(state,request);
    const {actorId,itemId,level}=request,item=state.物品?.实例?.[itemId],device=deviceOf(item),attachment=item?.attachment;
    if(!device||!attachment)throw Error('这件器具当前没有装配');
    if(!attachment.controllers.includes(actorId))throw Error('只有控制者能调节档位');
    if(!device.maxStimLevel)throw Error('这件器具没有振动档位');
    attachment.level=clamp(level,0,device.maxStimLevel);
    logEvent(state,{type:'device-level-changed',at:nowOf(state),actorId,targetId:attachment.wearerId,itemId,level:attachment.level});
    return {itemId,level:attachment.level};
  }
  /** 魂技/魂导器直接给予的刺激量；到顶立即高潮。 */
  function applyStimulus(state,id,amount,options={}){
    const now=Number.isFinite(options.at)?round(options.at):nowOf(state),next=read(state,id),events=[];
    next.快感=clamp(next.快感+Math.max(0,Number(amount)||0),0,AROUSAL_MAX);
    if(next.快感>=AROUSAL_MAX){
      const overflow=next.快感-AROUSAL_MAX,repeated=next.上次高潮!==null&&now-next.上次高潮<=OVERSTIM_WINDOW;
      events.push({type:'climax',forced:true,overflow:Math.round(overflow),at:now,repeated,source:['skill']});
      next.快感=0;next.连续高潮=repeated?clamp(next.连续高潮+1,1,99):1;
      if(overflow>=20&&next.敏感<3){next.敏感=clamp(next.敏感+1,0,3);next.敏感至=now+SENSITIVE_MINUTES;}
      next.不应期至=now+REFRACTORY_MINUTES;next.上次高潮=now;
    }
    write(state,id,next);
    return {生理:next,events};
  }
  function climaxNow(state,id,options={}){return applyStimulus(state,id,AROUSAL_MAX,options);}
  function worn(state,id){    return wornItems(state,id).map(item=>{const device=DEVICES[item.templateId];return {id:item.id,name:item.name,icon:device.icon??'',templateId:item.templateId,slot:item.attachment.slot,level:item.attachment.level,forced:!!item.attachment.forced,concealment:device.concealment,controller:item.attachment.controllers[0]??''};});
  }
  /** 佩戴中的器具带来的硬限制，供 control-core 的 restrictions 合并。 */
  function wornEffects(state,id,equipment){
    const result={mute:false,vision:false,ingest:false,release:false,insert:false,aimPenalty:0,names:[]};
    for(const item of wornItems(state,id,equipment?.attached)){
      const device=DEVICES[item.templateId];if(!device)continue;
      const kind=device.kind;result.names.push(item.name);
      if(kind==='gag'){result.mute=true;result.ingest=true;}
      if(kind==='blindfold')result.vision=true;
      if(kind==='urethral')result.release=true;
      if(kind==='chastity')result.insert=true;
      const level=clamp(item.attachment?.level,0,5);
      if(level>=3)result.aimPenalty=Math.max(result.aimPenalty,level>=5?3:level>=4?2:1);
    }
    for(const item of equipment?.hosts??globalThis.SoulHostCore?.hostItems?.(state,id)??[]){
      const projection=globalThis.SoulHostCore.project(state,item);
      result.names.push(item.name);
      if(projection.restrictions.voice||projection.restrictions.ingest)result.mute=true;
      if(projection.restrictions.ingest)result.ingest=true;
      if(projection.restrictions.vision)result.vision=true;
      if(projection.restrictions.release)result.release=true;
      if(projection.restrictions.insert)result.insert=true;
      result.aimPenalty=Math.max(result.aimPenalty,projection.aimPenalty);
    }
    return result;
  }
  return Object.freeze({
    VERSION,AROUSAL_MAX,BLADDER_MAX,BLADDER_LOCK_CAP,LEVEL_GAIN,PART_FACTOR,DEFAULTS,DEVICES,ITEM_TEMPLATES,
    read,write,plan,tick,urinate,defenseless,stimuli,stimuliFromItems,describe,statusIds,
    deviceOf,wornItems,worn,wornEffects,urineLocked,equip,detach,setLevel,applyStimulus,climaxNow
  });
});

