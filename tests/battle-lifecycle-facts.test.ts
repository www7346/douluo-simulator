import test from 'node:test';
import assert from 'node:assert/strict';
import {rules} from '../src/rules';
import {compileBattleLifecycle,compileBattleStatusEvent} from '../src/runtime/battle-lifecycle-facts';
import {compileStoryBattleFacts} from '../src/runtime/story-battle-facts';
import {compileStoryBattleNarrative} from '../src/runtime/story-battle-narrative';
import {captureBattleView} from '../src/runtime/player-presentation';
import {retainBattleReport} from '../src/runtime/battle-reports';
import {battleLifecycleReading} from '../src/runtime/story-battle-lifecycle-reading';
import {GameEngine} from '../src/runtime/engine';
import {createStoryWritingPackage} from '../src/server/story-writing-package';
import {selectStoryWritingView} from '../src/server/story-writing-view';
import {storyReviewEvidence} from '../src/server/story-review-evidence';
import {storyReviewProse} from '../src/server/story-review-prose';
import {validateStoryFactReview} from '../src/server/story-fact-review';

function setup(seed=17,ids=['source','subject','third']){
 let state=rules.foundation.makeDefaultState();
 for(const id of ids)state.战斗单位.列表[id]=rules.foundation.normalizeCombatant({id,名称:'同名人物',阵营:id,单位种类:'魂师NPC',六维:{基础:{力量:10,身法:10,体魄:10,悟性:10,感知:10,意志:10}},能力:{技能ID:[]},成长:{类型:'魂师',魂力等级:80}},{id,kind:'魂师NPC',level:80});
 state=rules.combat.startBattle(state,{id:'lifecycle',participantIds:ids,participantConfigs:Object.fromEntries(ids.map(id=>[id,{sideId:id,controller:'player',canFlee:true}])),positions:Object.fromEntries(ids.map((id,index)=>[id,{距离区:'近距',战场坐标:{x:40+index*2,y:50}}])),seed,force:true}).state;
 state.战斗.扩展.先攻顺序=ids;state.战斗.当前行动单位ID=ids[0];return state;
}
function grant(state:any,owner:string,id:string,specs:any[]){
 state.技能.列表[id]={id,name:'任意命名',持有者单位ID:owner,soulPowerCost:0,ageTier:'十万年',mechanismCap:'规则',effectGraph:rules.effects.makeLinearGraph([['release.projectile',{距离区:4}],['target.single',{阵营规则:'任意'}],...specs])};
 state.战斗单位.列表[owner].能力.技能ID.push(id);
}
function cast(state:any,actorId:string,skillId:string,targetId:string){state.战斗.当前行动单位ID=actorId;return rules.combat.settleAction(state,{id:`cast-${state.系统.revision}`,actorId,type:'技能',skillId,targetIds:[targetId]});}
function pass(state:any,actorId:string){state.战斗.当前行动单位ID=actorId;return rules.combat.settleAction(state,{id:`pass-${state.系统.revision}`,actorId,type:'放弃行动'});}
function compiled(state:any,result:any){return compileStoryBattleFacts({id:'lifecycle',status:result.state.战斗.状态,outcome:result.state.战斗.扩展.结果,completeFromStart:true,opening:captureBattleView(state),closing:captureBattleView(result.state),actions:[{sequence:1,round:state.战斗.回合,receipt:result.receipt}]}).actions[0].execution;}

test('生命周期中文表达保持真实共同事件顺序、解除前快照、参数与来源，未知资料不删',()=>{
 for(const specs of [
  [['status.bind',{持续回合:4}],['payload.cleanse',{类别:'控制',最大数量:3}]],
  [['status.buff',{属性:'身法',数值:2,持续回合:2}],['zone.wall',{持续回合:1}]],
  [['status.invisibility',{攻击后解除:true,持续回合:2}]],
  [['domain.field',{半径区:3,持续回合:4,触发时机:'回合开始',阵营规则:'敌方'}],['payload.damage',{领域阵营:'敌方',骰数:1,骰面:4}]],
 ]){
  const state=setup();grant(state,'source','reading',specs);const result=cast(state,'source','reading','subject');
  const original=compileBattleLifecycle(result.receipt),before=structuredClone(original),reading=battleLifecycleReading(original,id=>`同名人物（${id}）`)!;
  assert.ok(reading?.length);assert.deepEqual(reading.map(e=>e.order),[...original.statusLifecycle,...original.fieldLifecycle].map(e=>e.order).sort((a,b)=>a-b));
  for(const entry of original.statusLifecycle){
   const row=reading.find(r=>r.order===entry.order),s=entry.status;
   assert.equal(row.subjectId,entry.subjectId);assert.equal(row.event,entry.event);assert.equal(row.instanceId,s.instanceId);
   assert.ok(row.statement.includes(`同名人物（${entry.subjectId}）`));assert.ok(row.statement.includes(entry.event));
   assert.ok(row.snapshotReading.includes(`剩余回合记录${s.remainingRounds}`));assert.ok(row.snapshotReading.includes(`状态标记${s.state}`));
   assert.equal(row.source.sourceReceiptId,s.sourceReceiptId);assert.equal(row.source.reason,entry.reason);
   for(const [key,value] of Object.entries(s.params))assert.ok(row.snapshotReading.includes(`${key}：${typeof value==='string'?value:typeof value==='boolean'?value?'是':'否':JSON.stringify(value)}`));
   if(entry.event==='状态解除')assert.match(row.statement,/状态解除/);
  }
  for(const entry of original.fieldLifecycle){
   const row=reading.find(r=>r.order===entry.order);assert.equal(row.instanceId,entry.field.id);assert.equal(row.event,entry.event);
   for(const [key,value] of Object.entries(entry.field.source))assert.deepEqual(row.source[key],value);
   if(entry.field.kind==='domain'){assert.deepEqual(row.memberIds,entry.field.memberIds);assert.deepEqual(row.suppressorIds,entry.field.suppressorIds);}
  }
  assert.deepEqual(original,before);
  const unknown=structuredClone(original);
  if(unknown.statusLifecycle.length)unknown.statusLifecycle[0].status.extra='未映射快照字段';
  else unknown.fieldLifecycle[0].field.extra='未映射区域字段';
  assert.equal(battleLifecycleReading(unknown,id=>id),null);
  const duplicated=structuredClone(original),event=duplicated.statusLifecycle[0]??duplicated.fieldLifecycle[0];
  if(duplicated.statusLifecycle.length)duplicated.statusLifecycle.push(structuredClone(event));else duplicated.fieldLifecycle.push(structuredClone(event));
  assert.equal(battleLifecycleReading(duplicated,id=>id),null);
 }
});

test('真实同动作控制再解除送入作者和审阅，按实际对象与原动作绑定，投影可重建',()=>{
 const state=setup();grant(state,'source','reading',[['status.bind',{持续回合:4}],['payload.cleanse',{类别:'控制',最大数量:3}]]);
 const result=cast(state,'source','reading','subject'),report={id:'lifecycle',status:result.state.战斗.状态,outcome:result.state.战斗.扩展.结果,completeFromStart:true,opening:captureBattleView(state),closing:captureBattleView(result.state),actions:[{sequence:1,round:state.战斗.回合,receipt:result.receipt}]};
 const snapshot=new GameEngine('lifecycle-reading').getSnapshot() as any,turn:any={number:1,status:'resolved',input:'交锋',results:[{step:0,source:'交锋',action:{kind:'battle-report',battleId:report.id},status:'succeeded',receipt:{type:'battle-report',report}}],before:{},after:{}};
 snapshot.state.扩展.story={branchId:'initial',active:turn};const p=createStoryWritingPackage(snapshot,'reading-world',turn),before=structuredClone(p),view=selectStoryWritingView(p);
 const event=view.facts.events[0].facts.battle.account.passages[0].event;
 assert.deepEqual(event.lifecycleReading.map((r:any)=>r.event),['状态生效','状态解除']);assert.equal(event.statusLifecycle,undefined);
 const prose='这个状态在同一次行动里先发生，再解除。',passageId=[...storyReviewProse(prose).spans.keys()][0],map=storyReviewEvidence(p);
 for(const [id,path] of map.paths)if(/\/lifecycleReading\/\d+$/.test(path)){
  const review=validateStoryFactReview({findings:[{severity:'major',passageId,evidenceIds:[id],reason:'检查真实生命周期来源',impact:'状态持续'}]},prose,p);
  assert.equal(review.unverified.length,0);assert.equal(review.conflicts[0].references[0].subjectId,'subject');assert.deepEqual(review.conflicts[0].references[0].source!.actionSequences,[1]);
 }
 const rebuilt=structuredClone(p.facts) as any;
 for(const row of view.selection.filter(r=>!r.retained)){const parts=row.sourcePath.slice(1).split('/'),key=parts.pop()!;delete parts.reduce((v:any,k)=>v[k],rebuilt)[key];}
 assert.deepEqual(rebuilt,view.facts);assert.deepEqual(p,before);
 const unknown=structuredClone(p);unknown.facts.events[0].facts.battle.account.passages[0].event.statusLifecycle[0].status.extra='原样保留';
 const fallback=selectStoryWritingView(unknown).facts.events[0].facts.battle.account.passages[0].event;
 assert.equal(fallback.lifecycleReading,undefined);assert.equal(fallback.statusLifecycle[0].status.extra,'原样保留');
});

test('状态与区域的效果、持续及解除共用同一可读实例名，原快照可完整还原',()=>{
 for(const specs of [
  [['status.bind',{持续回合:4}],['payload.cleanse',{类别:'控制',最大数量:3}]],
  [['zone.wall',{持续回合:1}]],
  [['domain.field',{半径区:3,持续回合:4,触发时机:'回合开始',阵营规则:'敌方'}],['payload.damage',{领域阵营:'敌方',骰数:1,骰面:4}]],
 ]){
  const state=setup();grant(state,'source','instance-check',specs);
  const result=cast(state,'source','instance-check','subject');
  const report={id:'lifecycle',status:result.state.战斗.状态,outcome:result.state.战斗.扩展.结果,completeFromStart:true,opening:captureBattleView(state),closing:captureBattleView(result.state),actions:[{sequence:1,round:state.战斗.回合,receipt:result.receipt}]};
  const before=JSON.stringify(report),compiled=compileStoryBattleNarrative(report);
  const aliases=new Map(compiled.sources.instances.map((v:any)=>[v.id,v.label]));
  const reverse=new Map([...aliases].map(([id,label])=>[label,id]));
  reverse.set('动作1',result.receipt.id);
  const decode=(v:any):any=>typeof v==='string'?reverse.get(v)??v:Array.isArray(v)?v.map(decode):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,decode(x)])):v;
  const original=compileBattleLifecycle(result.receipt),row=compiled.facts.actions[0];
  let instances=0;
  for(const [key,field,idKey] of [['statusLifecycle','status','instanceId'],['fieldLifecycle','field','id']]){
   for(const [i,event] of original[key].entries()){
    const rawId=event[field][idKey];assert.ok(aliases.has(rawId));
    assert.equal(row[key][i][field][idKey],aliases.get(rawId));
    assert.deepEqual(decode(row[key][i]),event);instances++;
    assert.equal(JSON.stringify(compiled.facts).includes(rawId),false);
   }
  }
  assert.ok(instances>0);assert.equal(JSON.stringify(report),before);
 }
});

test('阶段由真实控制、解除与恢复划分，同动作施加再解除不被净变化吞掉',()=>{
 let state=setup();grant(state,'source','compound',[['status.bind',{持续回合:4}],['payload.cleanse',{类别:'控制',最大数量:3}]]);
 grant(state,'third','bind',[['status.bind',{持续回合:4}]]);grant(state,'source','clear',[['payload.cleanse',{类别:'控制',最大数量:3}]]);
 const opening=captureBattleView(state),actions:any[]=[],frames:any[]=[];
 for(const [actor,skill,target] of [['source','compound','subject'],['third','bind','subject'],['source','clear','subject']]){
  const round=state.战斗.回合,result=cast(state,actor,skill,target);actions.push({sequence:actions.length+1,round,receipt:result.receipt});state=result.state;frames.push(captureBattleView(state));
 }
 const report={id:'lifecycle',status:state.战斗.状态,outcome:state.战斗.扩展.结果,completeFromStart:true,opening,closing:captureBattleView(state),actions};
 const compiled=compileStoryBattleNarrative(report),phases=compiled.sources.process.phases;
 assert.equal(phases.length,3);assert.deepEqual(phases.map((p:any)=>p.sourceSequences),[[1],[2],[3]]);
 assert.ok(phases[0].endingReasons.includes('同名人物：状态生效'));assert.ok(phases[0].endingReasons.includes('同名人物：状态解除'));
 const controlled=phases[1].closing.units.find((u:any)=>u.id==='subject').values.实际行动限制;
 assert.ok(controlled.voluntaryMovementReason);assert.equal(controlled.mainAction.reason,'');
 assert.equal(phases[2].closing.units.find((u:any)=>u.id==='subject').values.实际行动限制.voluntaryMovementReason,'');
 assert.deepEqual(phases[2].opening,phases[1].closing);
 assert.equal(compiled.facts.actions[0].statusLifecycle.length,2);
 assert.ok(compiled.facts.account.passages.every((p:any)=>p.kind==='具体经过'),'控制与解除不能在普通数值概括中消失');
});

test('实际护盾增加与提供量、实际治疗与溢出分开累计，支付取真实回执',()=>{
 let state=setup();grant(state,'source','shield',[['payload.shield',{骰数:2,骰面:4}]]);grant(state,'source','heal',[['payload.heal',{骰数:2,骰面:4}]]);
 state.技能.列表.shield.soulPowerCost=2;state.技能.列表.heal.soulPowerCost=3;
 state.战斗单位.列表.subject.资源.生命.当前-=5;
 const opening=captureBattleView(state),actions:any[]=[];
 // The compiler keeps short exchanges concrete when a summary would be longer.
 // Use enough real repetitions to exercise the aggregate accounting branch.
 for(const skill of [...Array(12).fill('shield'),...Array(12).fill('heal')]){
  const round=state.战斗.回合,result=cast(state,'source',skill,'subject');actions.push({sequence:actions.length+1,round,receipt:result.receipt});state=result.state;
 }
 const report={id:'lifecycle',status:state.战斗.状态,outcome:state.战斗.扩展.结果,completeFromStart:true,opening,closing:captureBattleView(state),actions};
 const compiledNarrative=compileStoryBattleNarrative(report).facts;
 for(const ability of compiledNarrative.usedAbilities){
  const u=ability.useSummary,targets=actions.filter(a=>u.sourceSequences.includes(a.sequence)).flatMap(a=>a.receipt.targets);
  assert.ok(u.statement.includes('作用对象同名人物（subject）'),'无命中判定的恢复/护盾也必须在可读汇总明确实际对象');
  assert.ok(u.statement.includes('未记录命中判定'),'没有命中检定不能编为命中或漏掉目标');
  assert.ok(u.statement.includes(`${targets.length}条已结算目标记录`));
  assert.ok(u.statement.startsWith('同名人物（source）'),'同名施放者与受用者可直接区分');
 }
 const passages=compiledNarrative.account.passages,ordinary=passages.filter((p:any)=>p.kind==='交锋概括');assert.ok(ordinary.length);
 for(const passage of ordinary){
  const receipts=actions.filter(a=>passage.sourceSequences.includes(a.sequence)).map(a=>a.receipt),effects=receipts.flatMap(r=>r.targets.flatMap((t:any)=>t.effects));
  const sum=(key:string)=>passage.exchanges.reduce((n:number,g:any)=>n+(g.totals[key]??0),0);
  assert.equal(sum('实际新增护盾'),effects.filter((e:any)=>e.effectId==='payload.shield').reduce((n:number,e:any)=>n+e.amount,0));
  assert.equal(sum('提供护盾'),effects.filter((e:any)=>e.effectId==='payload.shield').reduce((n:number,e:any)=>n+e.offeredAmount,0));
  assert.equal(sum('实际恢复生命'),effects.filter((e:any)=>e.effectId==='payload.heal').reduce((n:number,e:any)=>n+e.amount,0));
  assert.equal(passage.resources[0].paid,receipts.reduce((n:number,r:any)=>n+r.resources.actorSoulPower.spent,0));
 }
});

test('真实束缚只限制自愿移动；攻击与强制位移沿原规则，查询不改变随机数或资源',()=>{
 let state=setup();grant(state,'source','bind',[['status.bind',{持续回合:4}]]);grant(state,'subject','heal',[['payload.heal',{}]]);grant(state,'third','pull',[['move.pull',{距离区:1}]]);
 state=cast(state,'source','bind','subject').state;state.战斗.当前行动单位ID='subject';
 const frozen=structuredClone(state),constraints=rules.combat.combatActionConstraints(state,'subject');
 assert.ok(constraints.voluntaryMovementReason);assert.equal(constraints.mainAction.reason,'');assert.equal(constraints.canAttemptBreakFree,true);
 assert.equal(rules.combat.listAvailableActions(state,'subject').find((x:any)=>x.id==='heal').available,true);
 assert.equal(rules.combat.previewAction(state,{actorId:'subject',type:'技能',skillId:'heal',targetIds:['subject']}).ready,true);
 assert.equal(rules.combat.listTacticalActions(state,'subject').find((x:any)=>x.id==='tactic:move').available,false);
 assert.deepEqual(state,frozen);
 assert.throws(()=>rules.combat.settleAction(state,{id:'bad-move',actorId:'subject',type:'放弃行动',movement:{距离区:'近距',战场坐标:{x:43,y:50}}}),/不能移动/);
 const pulled=cast(state,'third','pull','subject');assert.ok(pulled.receipt.targets[0].effects.some((e:any)=>e.movedUnitId==='subject'));
 assert.ok(rules.combat.combatActionConstraints(pulled.state,'subject').voluntaryMovementReason);
});

for(const effect of ['status.stun','status.sleep','status.paralysis'])test(`真实${effect}统一限制列表、预览与施放结果，失去行动不会伪装成施法`,()=>{
 let state=setup();grant(state,'source','control',[[effect,{持续回合:4,...(effect==='status.paralysis'?{层数:3,阈值:3}:{})}]]);grant(state,'subject','heal',[['payload.heal',{}]]);
 state=cast(state,'source','control','subject').state;state.战斗.当前行动单位ID='subject';
 const before=structuredClone(state),constraints=rules.combat.combatActionConstraints(state,'subject');assert.ok(constraints.mainAction.reason);
 assert.ok(rules.combat.listAvailableActions(state,'subject').every((a:any)=>!a.available));
 assert.throws(()=>rules.combat.previewAction(state,{actorId:'subject',type:'技能',skillId:'heal',targetIds:['subject']}),/无法采取主行动/);
 const result=cast(state,'subject','heal','subject');assert.equal(result.receipt.skill,null);assert.deepEqual(result.receipt.actionStateBefore,constraints);
 const facts=compiled(before,result);assert.equal(facts.executedSkill,null);assert.equal(facts.actionStateBefore.mainAction.reason,constraints.mainAction.reason);
});

test('麻痹未达阈值不会捏造完全不能行动，叠层触发和解除由规则决定',()=>{
 let state=setup();grant(state,'source','low',[['status.paralysis',{持续回合:4,层数:1,阈值:3}]]);grant(state,'third','high',[['status.paralysis',{持续回合:4,层数:2,阈值:3}]]);grant(state,'source','cleanse',[['payload.cleanse',{类别:'控制',最大数量:8}]]);
 state=cast(state,'source','low','subject').state;assert.equal(rules.combat.combatActionConstraints(state,'subject').mainAction.reason,'');
 state=cast(state,'third','high','subject').state;assert.equal(rules.combat.combatActionConstraints(state,'subject').mainAction.reason,'麻痹');
 const result=cast(state,'source','cleanse','subject');assert.equal(rules.combat.combatActionConstraints(result.state,'subject').mainAction.reason,'');
 assert.equal(result.receipt.statusLifecycle.filter((e:any)=>e.event==='removed'&&e.reason==='cleansed').length,2);
 const facts=compiled(state,result);assert.equal(facts.statusLifecycle.filter((e:any)=>e.event==='状态解除').length,2);
 assert.ok(facts.stateChanges.some((e:any)=>e.subjectId==='subject'&&e.field==='实际行动限制'&&e.before.mainAction.reason==='麻痹'&&e.after.mainAction.reason===''));
});

test('同一主行动施加再解除仍保留顺序与来源，不能被净状态差吞掉',()=>{
 for(const seed of [2,19,83])for(const names of [['source','subject','third'],['renamed-a','renamed-b','renamed-c']]){
  const state=setup(seed,names),[source,subject]=names;grant(state,source,'compound',[['status.bind',{持续回合:4}],['payload.cleanse',{类别:'控制',最大数量:3}]]);
  const result=cast(state,source,'compound',subject),facts=compiled(state,result);
  const events=facts.statusLifecycle.filter((e:any)=>e.status.effectId==='status.bind');assert.deepEqual(events.map((e:any)=>e.event),['状态生效','状态解除']);
  assert.ok(events.every((e:any)=>e.subjectId===subject&&e.status.sourceUnitId===source));assert.equal(events[0].status.instanceId,events[1].status.instanceId);
  assert.equal(rules.combat.activeStatuses(result.state,subject,'status.bind').length,0);
 }
});

test('状态到期记录当时完整来源；重试不再计时，之后删除状态不改变冻结事实',()=>{
 let state=setup();grant(state,'source','bind',[['status.bind',{持续回合:1}]]);state=cast(state,'source','bind','subject').state;
 const before=structuredClone(state),result=pass(state,'subject'),raw=structuredClone(result.receipt),facts=compiled(before,result);
 assert.ok(facts.statusLifecycle.some((e:any)=>e.event==='状态解除'&&e.reason==='expired'&&e.status.effectId==='status.bind'));
 const again=rules.combat.settleAction(result.state,{id:result.receipt.actionId,actorId:'subject',type:'放弃行动'});assert.equal(again.idempotent,true);assert.deepEqual(again.receipt,raw);
 result.state.状态实例.列表={};assert.deepEqual(compiled(before,result),facts);
});

test('回合交接的持续伤害与主行动分开；实际生命前后值不由过量伤害反推',()=>{
 const state=setup();grant(state,'source','poison',[['status.poison',{持续回合:4,骰数:1,骰面:4}]]);
 state.战斗单位.列表.subject.资源.生命.当前=1;
 const result=cast(state,'source','poison','subject'),facts=compiled(state,result);
 const tick=facts.statusEvents.find((e:any)=>e.event==='tick');assert.ok(tick);assert.equal(tick.source.sourceUnitId,'source');
 const loss=facts.stateChanges.find((e:any)=>e.subjectId==='subject'&&e.field==='生命');assert.equal(loss.phase,'本次行动后的回合结算');assert.equal(loss.before,1);assert.equal(loss.after,0);
});

test('战斗终结清理也保留状态来源而不只留下终局空状态',()=>{
 let state=setup(17,['source','subject']);grant(state,'source','buff',[['status.haste',{持续回合:4}]]);grant(state,'source','finish',[['payload.damage',{骰数:1,骰面:4,加值:999}]]);
 state=cast(state,'source','buff','source').state;const result=cast(state,'source','finish','subject');
 assert.equal(result.state.战斗.状态,'已结束');
 assert.ok(result.receipt.statusLifecycle.some((e:any)=>e.reason==='battle-ended'&&e.status.effectId==='status.haste'));
 assert.ok(compiled(state,result).statusLifecycle.some((e:any)=>e.reason==='battle-ended'));
});

test('另一人的行动触发领域时，效果属于领域施术者，不归给当前行动人',()=>{
 let state=setup();grant(state,'source','field',[['domain.field',{半径区:3,持续回合:4,触发时机:'回合开始',阵营规则:'敌方'}],['payload.damage',{领域阵营:'敌方',骰数:1,骰面:4}]]);
 state=cast(state,'source','field','subject').state;
 const result=pass(state,'subject'),facts=compiled(state,result);
 const triggers=facts.statusEvents.filter((e:any)=>e.event==='domain-trigger');assert.ok(triggers.length);
 assert.ok(triggers.every((e:any)=>e.source.sourceUnitId==='source'&&e.outcome.effects.every((effect:any)=>effect.actorId==='source')));
 const domainTargets=facts.targetResults.filter((t:any)=>t.domainId);assert.ok(domainTargets.length);assert.ok(domainTargets.every((t:any)=>t.effects.every((effect:any)=>effect.actorId==='source')));
});

test('复制技能的取得和到期移除有真实技能清单变化，维持扣费有真实前后值',()=>{
 let state=setup();grant(state,'subject','original',[['payload.heal',{}]]);grant(state,'source','copy',[['copy.skillset',{持续回合:1,复制比例:100}]]);
 state.战斗.当前行动单位ID='source';
 const copied=rules.combat.settleAction(state,{id:'copy',actorId:'source',type:'技能',skillId:'copy',targetIds:['subject'],copySourceUnitId:'subject'});
 const gained=compiled(state,copied).stateChanges.find((e:any)=>e.subjectId==='source'&&e.field==='持有技能');assert.ok(gained);assert.equal(gained.after.length,gained.before.length+1);
 const expired=pass(copied.state,'source'),lost=compileBattleLifecycle(expired.receipt).stateChanges.find((e:any)=>e.subjectId==='source'&&e.field==='持有技能');assert.ok(lost);assert.deepEqual(lost.after,gained.before);
 state=setup();grant(state,'source','maintain',[['payload.shield',{}],['sustain.maintain',{锁定魂力:1,每回合魂力:2}]]);
 state=cast(state,'source','maintain','source').state;
 const paid=pass(state,'third'),payment=compileBattleLifecycle(paid.receipt).statusEvents.find((e:any)=>e.event==='maintenance-paid');assert.ok(payment);
 assert.equal(payment.outcome.soulPowerBefore-payment.outcome.remainingSoulPower,payment.outcome.amount);
});

test('区域施加、到期、驱散和领域替换各有来源，不从最终空列表猜过程',()=>{
 let state=setup();grant(state,'source','zone',[['zone.wall',{持续回合:1}]]);grant(state,'subject','dispel',[['payload.dispel',{最大数量:3}]]);
 const created=cast(state,'source','zone','subject');assert.ok(compileBattleLifecycle(created.receipt).fieldLifecycle.some((e:any)=>e.event==='状态生效'));
 const expired=pass(created.state,'source');assert.ok(expired.receipt.fieldLifecycle.some((e:any)=>e.event==='removed'&&e.reason==='expired'&&e.field.source.单位ID==='source'));
 const removed=cast(created.state,'subject','dispel','source');assert.ok(removed.receipt.fieldLifecycle.some((e:any)=>e.event==='removed'&&e.reason==='dispelled'));
 state=setup();grant(state,'source','field',[['domain.field',{半径区:3,持续回合:4,触发时机:'回合开始',阵营规则:'敌方'}],['payload.damage',{领域阵营:'敌方',骰数:1,骰面:4}]]);
 state=cast(state,'source','field','subject').state;const oldId=Object.keys(state.战斗.扩展.领域实例)[0],next=cast(state,'source','field','subject');
 const events=compileBattleLifecycle(next.receipt).fieldLifecycle;
 assert.ok(events.some((e:any)=>e.event==='状态解除'&&e.reason==='source-domain-replaced'&&e.field.id===oldId));
 assert.ok(events.some((e:any)=>e.event==='状态生效'&&e.field.id!==oldId));
 assert.equal(new Set([...next.receipt.statusLifecycle,...next.receipt.fieldLifecycle].map((e:any)=>e.order)).size,next.receipt.statusLifecycle.length+next.receipt.fieldLifecycle.length);
});

test('首回合开始的持续伤害可以直接结束战斗，开战回执仍进入正式战报',()=>{
 let state=setup(17,['source','subject']);grant(state,'source','poison',[['status.poison',{持续回合:4,骰数:1,骰面:4}]]);state=cast(state,'source','poison','subject').state;
 grant(state,'subject','opening-buff',[['status.buff',{属性:'力量',数值:1,持续回合:2}]]);state=cast(state,'subject','opening-buff','subject').state;
 state.战斗.状态='已结束';state.战斗单位.列表.subject.资源.生命.当前=1;
 let ended:any;
 for(let seed=1;seed<=30;seed++){
  const result=rules.combat.startBattle(state,{id:'new-start',participantIds:['source','subject'],participantConfigs:{source:{sideId:'a'},subject:{sideId:'b'}},force:true,seed});
  if(result.state.战斗.状态==='已结束'){ended=result;break;}
 }
 assert.ok(ended,'预设种子集合需覆盖中毒人物先行动的分支');
 const before=structuredClone(state);retainBattleReport(state,ended.state,[],'start-command');assert.deepEqual(state,before);
 const report=ended.state.扩展.battleReports['new-start'],facts=compileStoryBattleFacts(report);
 assert.equal(facts.actions.length,0);assert.ok(facts.openingSettlement);
 assert.ok(facts.openingSettlement!.statusEvents.some((e:any)=>e.event==='tick'&&e.source.targetId==='subject'));
 assert.ok(facts.openingSettlement!.stateChanges.some((e:any)=>e.field==='生命'&&e.subjectId==='subject'&&e.before===1&&e.after===0));
 const narrative=compileStoryBattleNarrative(report),opening=narrative.facts.openingSettlement;
 assert.ok(opening.lifecycleReading?.length,'开战终结的清理也需要真实生命周期表达');
 assert.deepEqual(opening.lifecycleReading,battleLifecycleReading(opening,id=>`同名人物（${id}）`));
 const snapshot=new GameEngine('opening-reading').getSnapshot() as any,turn:any={number:1,status:'resolved',battleId:report.id,input:'开战经过',results:[{step:0,source:'开战经过',action:{kind:'battle-report',battleId:report.id},status:'succeeded',receipt:{type:'battle-report',report}}],before:{},after:{}};
 snapshot.state.扩展.story={branchId:'initial',active:turn};const p=createStoryWritingPackage(snapshot,'opening-reading-world',turn),view=selectStoryWritingView(p);
 assert.equal(view.facts.events[0].facts.battle.openingSettlement.statusLifecycle,undefined);
 const map=storyReviewEvidence(p),prose='开战时状态已经结束。',passageId=[...storyReviewProse(prose).spans.keys()][0];let references=0;
 for(const [id,path] of map.paths)if(/\/openingSettlement\/lifecycleReading\/\d+$/.test(path)){
  const review=validateStoryFactReview({findings:[{severity:'major',passageId,evidenceIds:[id],reason:'实际开战事件',impact:'状态存在时间'}]},prose,p);
  assert.equal(review.unverified.length,0);assert.equal(review.conflicts[0].references[0].source!.receiptId,report.openingReceipt.id);references++;
 }
 assert.ok(references>0);
});

test('武魂切换由原规则执行，领域撤销保留切换前实例和来源',()=>{
 const initial=rules.world.createPlayer(rules.world.makeInitialState('switch-lifecycle-v2'),{mode:'sandbox',name:'双武魂验收',level:80,age:20,primarySoulId:'blue-silver-emperor',secondarySoulId:'clear-sky-hammer',identityId:'civilian'},'create').state as any;
 const actor=initial.角色.主控单位ID;
 initial.战斗单位.列表.subject=setup().战斗单位.列表.subject;
 let state=rules.combat.startBattle(initial,{id:'switch-evidence',participantIds:[actor,'subject'],participantConfigs:{[actor]:{sideId:'a'},subject:{sideId:'b'}},force:true,seed:17}).state;
 const soul=rules.foundation.activeMartialSoulId(state,actor),other=rules.foundation.ownedMartialSoulIds(state,actor).find((id:string)=>id!==soul);
 assert.ok(other);grant(state,actor,'field',[['domain.field',{半径区:3,持续回合:4,触发时机:'回合开始',阵营规则:'友方'}],['payload.shield',{领域阵营:'友方',骰数:1,骰面:4}],['sustain.maintain',{锁定魂力:2,每回合魂力:1}]]);
 state.技能.列表.field.sourceMartialSoulId=soul;state=cast(state,actor,'field',actor).state;state.战斗.当前行动单位ID=actor;
 const id=Object.keys(state.战斗.扩展.领域实例)[0];assert.ok(id);
 const result=rules.combat.settleAction(state,{id:'switch',actorId:actor,type:'切换武魂',martialSoulId:other});
 const facts=compileBattleLifecycle(result.receipt);assert.equal(facts.martialSoulSwitch.previousSoulId,soul);assert.equal(facts.martialSoulSwitch.martialSoulId,other);
 assert.ok(facts.fieldLifecycle.some((e:any)=>e.reason==='martial-soul-switched'&&e.field.id===id&&e.field.source.武魂ID===soul));
 assert.equal(result.state.战斗.扩展.领域实例[id],undefined);
 assert.equal(result.state.战斗单位.列表[actor].资源.魂力.锁定,0,'旧领域结束必须同时释放它的维持占用');
 assert.equal(result.state.战斗单位.列表[actor].资源.魂力.持续消耗,0);
});

test('领域释放只扣自己的实际锁定和维持，替换、到期与重复清理不影响另一份消耗',()=>{
 for(const cap of [false,true])for(const [lock,upkeep] of [[2,1],[4,3]]){
  let state=setup();grant(state,'source','independent',[['payload.shield',{}],['sustain.maintain',{锁定魂力:2,每回合魂力:1}]]);
  state=cast(state,'source','independent','source').state;
  const initialLock=state.战斗单位.列表.source.资源.魂力.锁定,initialUpkeep=state.战斗单位.列表.source.资源.魂力.持续消耗;
  grant(state,'source','field',[['domain.field',{半径区:3,持续回合:1,触发时机:'回合开始',阵营规则:'友方'}],['payload.shield',{领域阵营:'友方',骰数:1,骰面:4}],['sustain.maintain',{锁定魂力:lock,每回合魂力:upkeep}]]);
  if(cap){
   state.战斗单位.列表.source.资源.魂力.当前=initialLock+1;state.战斗.当前行动单位ID='source';const before=structuredClone(state);
   assert.throws(()=>cast(state,'source','field','source'),/魂力不足/);assert.deepEqual(state,before);continue;
  }
  const result=cast(state,'source','field','source');state=result.state;
  const domain:any=Object.values(state.战斗.扩展.领域实例)[0];
  const effect=result.receipt.targets[0].effects.find((e:any)=>e.effectId==='sustain.maintain');
  assert.equal(effect.lockedSoulPower,lock);assert.equal(effect.requestedLockedSoulPower,lock);
  assert.equal(domain.维持.锁定魂力,effect.lockedSoulPower);assert.equal(domain.维持.每回合魂力,state.战斗单位.列表.source.资源.魂力.持续消耗-initialUpkeep);
  const replaced=cast(state,'source','field','source'),replacement:any=Object.values(replaced.state.战斗.扩展.领域实例)[0];
  assert.notEqual(replacement.id,domain.id);assert.equal(replaced.state.战斗单位.列表.source.资源.魂力.锁定,initialLock+replacement.维持.锁定魂力);
  const expired=pass(replaced.state,'source');assert.equal(Object.keys(expired.state.战斗.扩展.领域实例).length,0);
  assert.equal(expired.state.战斗单位.列表.source.资源.魂力.锁定,initialLock);assert.equal(expired.state.战斗单位.列表.source.资源.魂力.持续消耗,initialUpkeep);
  const released=structuredClone(replaced.state),owned=released.战斗.扩展.领域实例[replacement.id];
  rules.foundation.releaseDomainMaintenance(released,owned);
  assert.equal(released.战斗单位.列表.source.资源.魂力.锁定,initialLock);assert.equal(released.战斗单位.列表.source.资源.魂力.持续消耗,initialUpkeep);
  const afterFirst=structuredClone(released.战斗单位.列表.source.资源);
  rules.foundation.releaseDomainMaintenance(released,owned);assert.deepEqual(released.战斗单位.列表.source.资源,afterFirst);
 }
});

test('复合维持无法足额锁定则原子拒绝，独立耗尽魂力仍按收尾时点释放旧锁定',()=>{
 let state=setup();grant(state,'source','independent',[['payload.shield',{}],['sustain.maintain',{锁定魂力:2,每回合魂力:1}]]);state=cast(state,'source','independent','source').state;
 const locked=state.战斗单位.列表.source.资源.魂力.锁定;
 state.战斗单位.列表.source.资源.魂力.当前=locked+4;
 grant(state,'source','compound',[['payload.soul_damage',{数值:8}],['sustain.maintain',{锁定魂力:4,每回合魂力:1}]]);
 state.战斗.当前行动单位ID='source';const before=structuredClone(state);
 assert.throws(()=>cast(state,'source','compound','source'),/足额锁定魂力/);assert.deepEqual(state,before);
 grant(state,'source','drain',[['payload.soul_damage',{数值:8}]]);
 const result=cast(state,'source','drain','source');assert.equal(result.state.战斗单位.列表.source.资源.魂力.当前,0);
 assert.equal(result.receipt.stateChanges.some((entry:any)=>entry.unitId==='source'&&entry.phase==='main-action'&&entry.changes.spLocked),false);
 const finalized=result.receipt.stateChanges.find((entry:any)=>entry.unitId==='source'&&entry.phase==='turn-boundary'&&entry.changes.spLocked);
 assert.deepEqual(finalized.changes.spLocked,{before:locked,after:0});
 assert.equal(result.state.战斗单位.列表.source.资源.魂力.锁定,0);
 assert.equal(result.receipt.targets[0].effects.some((e:any)=>e.effectId==='sustain.maintain'),false);
 assert.ok(compileBattleLifecycle(result.receipt).stateChanges.some((e:any)=>e.subjectId==='source'&&e.phase==='本次行动后的回合结算'&&e.field==='锁定魂力'&&e.before===locked&&e.after===0));
});

test('实际施术者失能解除依赖状态，独立状态保留，战报及中文资料可继续编译',()=>{
 let state=setup();
 state.战斗.扩展.规则.nonlethal=true;
 grant(state,'source','awake-mute',[['status.mute',{持续方式:'世界分钟',持续分钟:60,来源依赖:'施术者清醒'}]]);
 grant(state,'source','independent-mute',[['status.mute',{持续方式:'世界分钟',持续分钟:60,来源依赖:'独立'}]]);
 state=cast(state,'source','awake-mute','subject').state;
 state=cast(state,'source','independent-mute','third').state;
 assert.ok((Object.values(state.状态实例.列表) as any[]).some(s=>s.来源.技能ID==='awake-mute'));
 const independent=(Object.values(state.状态实例.列表) as any[]).find(s=>s.来源.技能ID==='independent-mute');assert.ok(independent);
 grant(state,'source','self-harm',[['payload.damage',{骰数:1,骰面:4,加值:999,类型:'物理'}]]);
 const result=cast(state,'source','self-harm','source');
 assert.equal(result.state.战斗单位.列表.source.资源.生命.当前,0);
 assert.equal((Object.values(result.state.状态实例.列表) as any[]).some(s=>s.来源.技能ID==='awake-mute'),false);
 assert.deepEqual(result.state.状态实例.列表[independent.id],independent);
 const lifecycle=compileBattleLifecycle(result.receipt),ended=lifecycle.statusEvents.find(e=>e.event==='source-incapacitated');
 assert.ok(ended);assert.equal(ended.source.sourceSkillId,'awake-mute');assert.equal(ended.outcome.reason,'source-incapacitated');
 assert.ok(compiled(state,result));
 const reading=battleLifecycleReading(lifecycle,id=>id)!;assert.ok(reading.some(r=>r.statement.includes('施术者失能')));
 const frozen=structuredClone(result.receipt);compileBattleLifecycle(result.receipt);assert.deepEqual(result.receipt,frozen);
});

test('持续来源的各类正式失效事件保留原对象和原因，未知字段仍拒绝',()=>{
 for(const event of ['source-incapacitated','source-dead','source-soul-unavailable','source-item-lost','source-restraint-inactive','source-restraint-removed','target-dead']){
  const raw={event,reason:event,statusId:'actual-status',targetId:'actual-target',sourceUnitId:'actual-source',sourceSkillId:'actual-skill'};
  const row=compileBattleStatusEvent(raw,7);assert.equal(row.sourceIndex,7);assert.deepEqual(row.source,{statusId:'actual-status',targetId:'actual-target',sourceUnitId:'actual-source',sourceSkillId:'actual-skill'});assert.deepEqual(row.outcome,{reason:event});
  assert.throws(()=>compileBattleStatusEvent({...raw,extra:true},7),/缺少字段/);
 }
});

test('编译无法识别的生命周期或新增机械字段明确报缺口；未知资料不推断为零',()=>{
 assert.throws(()=>compileBattleStatusEvent({event:'future-tick'},0),/缺少编译/);
 assert.throws(()=>compileBattleStatusEvent({event:'regeneration',amount:2,extraLife:10},0),/缺少字段/);
 assert.throws(()=>compileBattleLifecycle({stateChanges:[{unitId:'x',phase:'main-action',changes:{unknown:{before:0,after:1}}}]}),/缺少编译/);
 assert.equal(compileBattleLifecycle({}).actionStateBefore,null);
 const restore=compileBattleStatusEvent({event:'regeneration',targetId:'x',amount:0},0);assert.equal(restore.outcome.amount,0);assert.equal(Object.hasOwn(restore.outcome,'remainingHp'),false);
});
