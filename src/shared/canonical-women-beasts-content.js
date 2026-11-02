(function(root,factory){if(typeof module!=='undefined'&&module.exports)module.exports=factory;if(root)root.SoulCanonicalWomenBeasts=factory;})(typeof globalThis!=='undefined'?globalThis:this,function(h){
 'use strict';const {E,self,enemy,melee,area,ally,dmg,buff,bind,slow,shield,heal,regen,field}=h;
 const specs=[
  {id:'ah-yin-blue-silver-emperor',name:'蓝银皇·阿银',artId:'beast.canonical-women.blue-silver-emperor',artPath:'/art/canonical-women-v1/blue-silver-emperor-body.webp',categories:['植物','蓝银草'],anatomy:['根系','叶脉'],attributes:['木','生命'],appearance:'蓝金长草长成一座茂盛草冠，金色根脉穿过泥土，细叶在柔光中舒展。',rows:[
   ['蓝银领域','self',field(regen(1,2)),'蓝金根网向四周舒展，温润生息留在草叶之间。身处根网中的同伴在行动前获得续疗护持。'],
   ['野火烧不尽，春风吹又生','self',self(heal(3),regen(2,3)),'蓝银皇受损的草叶逐次抽芽，破开的根脉被新生金纹连接。聚集的生机先修补伤处，再继续滋养本体。'],
   ['皇藤缚阵','enemy',area('力量',bind(2)),'粗韧皇藤从地面交错生长，缠住敌人关节。金色叶脉收紧，被困者须用力量挣开。'],
   ['万叶护生','ally',ally(heal(3),shield(2)),'万片蓝金草叶将柔光送往同伴身边。生机扶起伤处，余下叶光结成护持的薄屏。'],
   ['皇叶破锋','enemy',enemy(dmg('木',3,8,3)),'修长皇叶并成一束蓝金锋线，沿根网指向的方向飞出。叶缘的光芒在命中处合拢。']
  ]},
  {id:'xiao-bai',name:'魔魂大白鲨之王',artId:'beast.canonical-women.great-white-shark',artPath:'/art/canonical-women-v1/great-white-shark-body.webp',categories:['水族','鲨类'],anatomy:['鳍','锯齿','流线躯干'],attributes:['水','生命'],appearance:'巨大的银白鲨王破开深蓝海水，背鳍如利刃，额部与两侧泛着海蓝魂纹。',rows:[
   ['魔鲨领域','self',field(slow(1,1),'敌方'),'银白鲨影带起一片沉重潮水，海蓝魂纹随本体移动。进入其中的敌人行动时受到潮压迟滞。'],
   ['魔鲨之牙','enemy',melee(dmg('物理',3,8,3)),'锯齿般的鲨牙光影随冲刺合拢，所有咬合力集中在近身一处。海水在牙锋两侧急速分开。'],
   ['魔鲨腾海','enemy',melee(dmg('水',3,8,2),E('move.knockback',{距离区:2})),'银白巨鲨从海浪中跃出，沉重身体带着整片潮头压向对手。落下的水势把敌人冲离原位。'],
   ['海鸣探踪','self',self(buff('感知',3,3)),'细小海鸣沿水流传回，鲨王的海蓝纹路逐一亮起。对周围动静的感知在专注中变得敏锐。'],
   ['怒涛啸海','enemy',area('力量',dmg('水',4,8,4)),'鲨王长尾猛烈摆动，数层巨浪在身前汇成白色锋墙。轰鸣水势一齐卷入敌阵。']
  ]}
 ];
 return specs.map(b=>({...b,NODES:b.rows.map(([name,targetPolicy,effects,description],i)=>({ordinal:i+1,name,targetPolicy,effects,description,artId:b.artId+'.skill.'+(i+1),artPath:b.artPath,artCell:i+1})),skills:b.rows.map(([name,targetPolicy,effects,description],i)=>({name,description,evidence:'authored-canonical-women-beast',artId:b.artId+'.skill.'+(i+1),strictEffects:true,requestedBranches:[{id:'primary',activation:'active',optional:false,targetPolicy,requestedEffects:effects}]}))}));
});
