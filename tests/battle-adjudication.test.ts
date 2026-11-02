import assert from 'node:assert/strict';
import test from 'node:test';
import {rules} from '../src/rules';
import {battleAdjudication} from '../src/runtime/battle-adjudication';

const named={战斗单位:{列表:{a:{名称:'试炼魂师'},b:{名称:'追击魂兽'}}}};
const prose=(receipt:any,state:any=named)=>battleAdjudication(receipt,state).map(section=>`${section.title}\n${section.lines.join('\n')}`).join('\n');

test('真实命中与伤害回执展开保留骰点及加值来源，修改当前属性不会重算历史',()=>{
  let state=rules.foundation.makeDefaultState();
  for(const id of ['a','b'])state.战斗单位.列表[id]=rules.foundation.normalizeCombatant({id,名称:named.战斗单位.列表[id].名称,阵营:id,单位种类:'魂师NPC',六维:{基础:{力量:10,身法:10,体魄:10,悟性:10,感知:10,意志:10}},能力:{技能ID:[]},位置:{距离区:'近距'},成长:{类型:'魂师',魂力等级:20}},{id,kind:'魂师NPC',level:20});
  const base=structuredClone(state);
  let hits=0,misses=0;
  for(let index=0;index<30;index++){
    state=rules.combat.startBattle(base,{id:`dice-${index}`,participantIds:['a','b'],participantConfigs:{a:{sideId:'a',controller:'player'},b:{sideId:'b',controller:'ai'}},seed:index+1,force:true}).state;
    state.战斗.当前行动单位ID='a';
    state.战斗单位.列表.a.位置.战场坐标={x:40,y:50};state.战斗单位.列表.b.位置.战场坐标={x:60,y:50};
    const result=rules.combat.settleAction(state,{id:`receipt-${index}`,actorId:'a',type:'技能',skillId:'ordinary.attack',targetIds:['b']});
    const check=result.receipt.targets[0].check;
    const output=prose(result.receipt,state);
    assert.ok(output.includes(`${check.die} ${check.modifier<0?'−':'+'} ${Math.abs(check.modifier)} = ${check.total}`));
    assert.ok(output.includes(`防御 ${check.defense}`));
    assert.equal(check.modifierSources.reduce((sum:any,source:any)=>sum+source.value,0),check.modifier);
    if(check.hit){hits++;const damage=result.receipt.targets[0].effects.find((effect:any)=>effect.hpDamage!==undefined);assert.ok(output.includes(`生命伤害：${damage.hpDamage}`));assert.equal(typeof damage.baseBonus,'number');}
    else {misses++;assert.match(output,/未命中/);}
    const edited=structuredClone(state);edited.战斗单位.列表.a.六维.基础.力量=200;
    assert.equal(prose(result.receipt,edited),output);
  }
  assert.ok(hits&&misses);
});

test('优势、自然1/20、豁免与撤离都展示真实成功条件',()=>{
  const save={type:'save',attribute:'身法',die:20,rolls:[4,20],mode:'advantage',modifier:-2,total:18,dc:30,saved:true,successEffect:'伤害减半',natural20:true};
  let text=prose({targets:[{targetId:'a',check:save,effects:[]}]});
  assert.match(text,/优势，取较高值/);assert.match(text,/4、20/);assert.match(text,/难度 30 → 成功/);assert.match(text,/自然20/);assert.match(text,/伤害减半/);
  text=prose({escape:{die:1,modifier:12,total:13,dc:10,success:false,pursuerId:'b',zoneModifier:-2,engagedPenalty:0,routeModifier:1,assistBonus:2,traitBonus:0}});
  assert.match(text,/难度 10 → 失败/);assert.match(text,/自然1/);assert.match(text,/追击魂兽/);assert.match(text,/距离修正 − 2/);
});

test('增伤、抗性、固定减伤、护盾、免疫、持续伤害与反伤逐项显示且不重复领域伤害',()=>{
  const damage={effectId:'payload.damage',dice:{count:2,sides:6,rolls:[4,6],total:10},baseBonus:10,rawAmount:30,elementAmplification:{damageType:'火',percent:50,before:20,amount:30,gain:10,sources:[{name:'赤焰佩'}]},resistance:{type:'火',mode:'抗性',rawAmount:30,finalAmount:15,sources:[{name:'护火甲'}]},equipmentReduction:2,shieldUsed:3,hpDamage:10,remainingHp:45,reflection:{reflectedRaw:5,resistance:{type:'火',mode:'免疫',rawAmount:5,finalAmount:0},hpDamage:0}};
  const receipt={actorId:'a',targets:[{targetId:'b',effects:[damage]}],statusEvents:[{event:'domain-trigger',targetId:'b',effects:[damage]},{event:'burn',targetId:'b',dice:{count:1,sides:4,rolls:[3],total:3},rawAmount:3,resistance:{type:'火',mode:'正常',rawAmount:3,finalAmount:3},hpDamage:3,remainingHp:42}]};
  const text=prose(receipt);
  for(const expected of ['4、6','20 → 30','赤焰佩','30 → 15','护火甲','装备固定减伤：2','护盾抵扣：3','生命伤害：10','反伤','免疫：5 → 0','烧伤','生命伤害：3'])assert.ok(text.includes(expected),expected);
  assert.equal(text.split('20 → 30').length-1,1);
  assert.doesNotMatch(text,/payload\.|undefined|NaN/);
});

test('友方增益、免疫控制、反制与零骰行动不伪造检定',()=>{
  assert.match(prose({targets:[{targetId:'a',check:{type:'automatic-beneficial'},effects:[]}]}),/无需命中或豁免/);
  assert.match(prose({targets:[{targetId:'a',effects:[{effectId:'status.bind',prevented:'状态免疫'}]}]}),/状态免疫/);
  assert.match(prose({targets:[{targetId:'a',counter:{die:18,modifier:3,total:21,dc:20,success:true},effects:[{effectId:'reaction.counter',counteredSkillId:'x'}]}]}),/反制成功/);
  assert.match(prose({}),/没有命中、豁免或伤害掷骰/);
});
