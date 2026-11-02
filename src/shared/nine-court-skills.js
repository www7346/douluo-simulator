(function(root){
 const courts=[
  ['柳门初照','柳影落在展开的素绢上，第一庭的月门亮起。'],
  ['双铃引渡','檐下两只铜铃相和，第二庭的青瓦门楼应声开启。'],
  ['鹤衔明月','白鹤从绢上衔起月珠，银光沿水面铺到第三庭。'],
  ['灯河照影','四盏朱灯在水中燃起，倒影接成通往第四庭的长廊。'],
  ['金鹿渡桥','金鹿踏过墨河，蹄下的桥纹接通第五庭。'],
  ['碧莲开境','碧莲从卷心水墨中层层舒展，第六庭浮出水面。'],
  ['星枢临阁','星光落入浑天仪，第七庭的楼阁随斗柄转到眼前。'],
  ['凤巡八屏','金羽掠过八扇折屏，第八庭随最后一扇屏风显现。'],
  ['九阙同辉','卷中九重金阙依次洞开，第九庭立在云阶尽头。']
 ].map(([name,scene],i)=>Object.freeze({name,description:scene+'召来第'+(i+1)+'席人物的投影。',artId:'skill.jiumeitu.court-'+(i+1)}));
 function ofSkill(skill){
  if(skill?.sourceKind!=='soul-ring')return undefined;
  const node=skill?.effectGraph?.nodes?.find(n=>n.effectId==='realm.deploy');
  return node?courts[Number(node.params?.席位)-1]:undefined;
 }
 const api=Object.freeze({courts:Object.freeze(courts),ofSkill});root.SoulNineCourts=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
