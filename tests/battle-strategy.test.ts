import test from 'node:test';
import assert from 'node:assert/strict';
import {rules} from '../src/rules';
import {setBattleStrategy} from '../src/runtime/battle-strategy';
import {validateStoryPlan} from '../src/runtime/story-turns';
function arena(){
 let state=rules.foundation.makeDefaultState();
 for(const [id,side,x] of [['a','A',35],['d','A',35],['b','B',55],['c','B',55]] as const){state.战斗单位.列表[id]=rules.foundation.normalizeCombatant({id,名称:id,阵营:side,单位种类:'魂师NPC',六维:{基础:{力量:12,身法:12,体魄:12,悟性:12,感知:12,意志:12}},位置:{距离区:'近距',战场坐标:{x,y:50}},能力:{技能ID:[]},成长:{类型:'魂师',魂力等级:20}},{id,kind:'魂师NPC',level:20});}
 state.角色.主控单位ID='a';state=rules.combat.startBattle(state,{id:'strategy-arena',participantIds:['a','d','b','c'],participantConfigs:{a:{sideId:'A',controller:'player'},d:{sideId:'A',controller:'ai'},b:{sideId:'B',controller:'ai'},c:{sideId:'B',controller:'ai'}},force:true,seed:21}).state;
 state.战斗.当前行动单位ID='a';for(const [id,x] of [['a',35],['d',35],['b',55],['c',55]] as const)state.战斗单位.列表[id].位置.战场坐标={x,y:50};return state;
}
const strategy=(s:any,patch:any={})=>setBattleStrategy(s,{focusTargetId:'none',protectTargetId:'none',reservePercent:0,retreatPercent:0,...patch});
const decision=(intent:any)=>{const copy=structuredClone(intent);if(copy.aiDecision?.planning){delete copy.aiDecision.planning.overallElapsedMs;delete copy.aiDecision.planning.elapsedMs;}return copy;};
test('战术只改变合法目标偏好，敌方不继承玩家指令，思考不修改状态',()=>{
 const s=arena(),baseline=rules.combat.chooseAiIntent(s,'a','decision');assert.equal(baseline.targetIds[0],'b');
 strategy(s);assert.deepEqual(decision(rules.combat.chooseAiIntent(s,'a','decision')),decision(baseline));
 strategy(s,{focusTargetId:'c'});const before=JSON.stringify(s),intent=rules.combat.chooseAiIntent(s,'a','decision');assert.equal(intent.targetIds[0],'c');assert.equal(rules.combat.previewAction(s,intent).ready,true);assert.equal(JSON.stringify(s),before);
 s.战斗.当前行动单位ID='b';const enemy=rules.combat.chooseAiIntent(s,'b','enemy');delete s.战斗.扩展.strategy;assert.deepEqual(decision(rules.combat.chooseAiIntent(s,'b','enemy')),decision(enemy));
});
test('保留魂力排除越过保留线的施法，仍可普通攻击',()=>{
 const s=arena(),a=s.战斗单位.列表.a;
 s.技能.列表.blast={id:'blast',name:'爆发',持有者单位ID:'a',sourceKind:'martial-skill',soulPowerCost:1,effectGraph:rules.effects.makeLinearGraph([['release.projectile',{距离区:3}],['target.single',{阵营规则:'敌方'}],['payload.damage',{骰数:3,骰面:6,加值:10,伤害类型:'火'}]])};a.能力.技能ID.push('blast');
 assert.equal(rules.combat.chooseAiIntent(s,'a','before').skillId,'blast');strategy(s,{reservePercent:100});const intent=rules.combat.chooseAiIntent(s,'a','after');assert.equal(intent.skillId,'ordinary.attack');assert.equal(rules.combat.previewAction(s,intent).ready,true);
});
test('优先保护只提高合法治疗目标收益，不制造治疗效果',()=>{
 const s=arena();for(const id of ['a','d'])s.战斗单位.列表[id].资源.生命.当前=Math.floor(s.战斗单位.列表[id].资源.生命.最大/2);
 s.技能.列表.heal={id:'heal',name:'援护',持有者单位ID:'a',sourceKind:'martial-skill',soulPowerCost:0,effectGraph:rules.effects.makeLinearGraph([['release.projectile',{距离区:3}],['target.single',{阵营规则:'友方'}],['payload.heal',{骰数:2,骰面:6,加值:10}]])};s.战斗单位.列表.a.能力.技能ID.push('heal');
 strategy(s,{protectTargetId:'d'});const before=JSON.stringify(s),intent=rules.combat.chooseAiIntent(s,'a','heal');assert.equal(intent.skillId,'heal');assert.deepEqual(intent.targetIds,['d']);assert.equal(JSON.stringify(s),before);
});
test('低血撤离遵守场景许可，第一次撤离行动开始准备',()=>{
 const s=arena(),a=s.战斗单位.列表.a;a.资源.生命.当前=Math.floor(a.资源.生命.最大*.4);s.战斗.扩展.成员.a.morale=100;s.战斗.扩展.成员.a.canFlee=true;strategy(s,{retreatPercent:50});
 const intent=rules.combat.chooseAiIntent(s,'a','retreat');assert.equal(intent.type,'逃跑');const result=rules.combat.settleAction(s,intent);assert.equal(result.receipt.escape.preparing,true);assert.equal(result.receipt.escape.preparation,1);assert.equal(result.receipt.escape.die,undefined);
 s.战斗.扩展.成员.a.canFlee=false;assert.notEqual(rules.combat.chooseAiIntent(s,'a','stay').type,'逃跑');
});
test('非法阵营/不存在目标/比例不写入战术，故事协议只接受有限参数',()=>{
 const s=arena(),before=JSON.stringify(s);
 for(const patch of [{focusTargetId:'d'},{protectTargetId:'b'},{focusTargetId:'missing'},{reservePercent:101},{retreatPercent:-1}]){assert.throws(()=>strategy(s,patch));assert.equal(JSON.stringify(s),before);}
 const action={kind:'battle-strategy',focusTargetId:'c',protectTargetId:'a',reservePercent:30,retreatPercent:25};assert.doesNotThrow(()=>validateStoryPlan({segments:[{source:'调整战术',action}]},'调整战术'));
 assert.throws(()=>validateStoryPlan({segments:[{source:'调整战术',action:{...action,damage:999}}]},'调整战术'));
});
