(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulPersonTools=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),hash=v=>globalThis.SoulAbilityContract.hash(v);
 function definitions(){
  const effects=globalThis.SoulEffectCompiler,base=[['release.touch',{}],['target.single',{阵营规则:'任意'}],['check.save',{属性:'意志',难度加值:0}]];
  const common={持续方式:'世界分钟',持续分钟:60,来源依赖:'独立',强度:6};
  return [{key:'sexChange',name:'两仪镜',description:'接触真实目标并通过意志抵抗后，反转其当前身体性别。变化长期保留；再次成功使用可以逆转。不改变武魂、财物或人设。',form:'掌心大小的双面银镜',effect:['transform.sex',{...common,目标性别:'反转',变化保留:'保留'}],cost:2},
   {key:'personaRewrite',name:'照心印',description:'接触真实目标并通过意志抵抗后，取得一次人设、认知、形象和现实关系编辑授权。玩家手动设定，NPC自动形成设定；已完成修改长期保留。',form:'刻有环纹的小巧玉印',effect:['status.cognition_shift',{...common,认知方向:'自由改造',关系作用域:'认知与现实',认知保留:'保留',改造方式:'立即',改造分钟:1}],cost:3}].map(d=>({...d,templateId:'crafted-soul-device-support',activeSkill:{name:d.name,description:d.description,namingSource:'preset',sourceKind:'soul-device',soulPowerCost:d.cost,durabilityCost:1,requirements:['gesture','contact'],ageTier:'十万年',mechanismCap:'规则',effectGraph:effects.makeLinearGraph([...base,d.effect])}}));
 }
 function grant(s,config,sourceId){
  if(config.background?.id!=='sealed-titled')return [];
  const chosen=config.background.starterTools??{},opening=s.世界?.opening?.background,buyerId=opening?.buyerId;
  if(!buyerId||!s.人物?.列表?.[buyerId])throw Error('开局器具需要真实买主人物');
  sourceId=opening.sourceId??sourceId;const selected=definitions().filter(d=>chosen[d.key]);if(!selected.length)return [];
  const existing=s.扩展?.personTools;if(existing){if(existing.sourceId!==sourceId||existing.buyerId!==buyerId)throw Error('开局器具来源已经改变');return existing.grants.map(g=>g.itemId);}
  const world=globalThis.SoulWorldEngine,owner=s.人物.列表[buyerId],grants=[];
  for(const d of selected){
   const item=world.createItem(s,d.templateId,buyerId,owner.inventoryContainerId,{id:'opening-tool-'+d.key+'-'+hash([sourceId,buyerId]).slice(0,16),name:d.name,forceUnique:true,payload:{activeSkill:clone(d.activeSkill),description:d.description,form:d.form,deviceCategory:'辅助',equipmentKind:'饰品',modifiers:{attributes:{}}},provenance:{type:'opening-person-tool',sourceId,toolKey:d.key},扩展:{描述:d.description,形态:d.form,命名来源:'preset'}});
   grants.push({key:d.key,itemId:item.id,definitionHash:item.扩展.abilityDefinitionHash});
  }
  const record={version:1,sourceId,buyerId,grants};s.扩展.personTools={...record,hash:hash(record)};return grants.map(g=>g.itemId);
 }
 function validate(s){
  const r=s.扩展?.personTools,opening=s.世界?.opening?.background,config=opening?.config?.background;
  const expected=config?.id==='sealed-titled'?definitions().filter(d=>config.starterTools?.[d.key]):[];
  if(!r)return expected.length?['开局勾选的改造器具尚未实际发放']:[];
  const {hash:h,...body}=r,errors=[];
  if(r.version!==1||h!==hash(body)||r.sourceId!==opening?.sourceId||r.buyerId!==opening?.buyerId||hash(r.grants.map(g=>g.key).sort())!==hash(expected.map(d=>d.key).sort())||new Set(r.grants.map(g=>g.itemId)).size!==r.grants.length)return ['开局改造器具来源无效'];
  for(const g of r.grants){const item=s.物品?.实例?.[g.itemId];if(item&&(item.provenance?.type!=='opening-person-tool'||item.provenance.sourceId!==r.sourceId||item.provenance.toolKey!==g.key||item.扩展?.abilityDefinitionHash!==g.definitionHash))errors.push('开局改造器具'+g.itemId+'合同已改变');}
  return errors;
 }
 return Object.freeze({definitions,grant,validate});
});
