(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulRealmEquipmentVisuals=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 // Public presentation identities. The rules separately validate ownership and effects.
 const VISUALS=Object.freeze({
  'collar:bound':{artId:'item.realm.collar',description:'金属项圈环身嵌着魂环色泽的宝石，与画中人物的永久席位相连，由画主管理。'},
  'fixture:cage':{artId:'item.realm.cage',description:'金属栅栏围成独立笼室，带锁的笼门合拢后，将人物留在当前画境区域内。'},
  'fixture:cross':{artId:'item.realm.cross',description:'竖架与横梁呈十字相交，四端的锁环固定四肢，使人物留在架上，限制手部动作与行走。'},
  'fixture:suspended':{artId:'item.realm.suspended',description:'悬链从上方垂下，锁环收住四肢，将人物悬置在当前画境区域，限制手部动作与行走。'},
  'hands:front':{artId:'preset.restraint.cuffs',description:'两枚金属腕铐以短链相连，将双手固定在身前，限制手部动作与物品操作。'},
  'hands:back':{artId:'preset.restraint.cuffs',description:'金属腕铐在背后合拢，以短链将双手固定在身后，限制手部动作与物品操作。'},
  'legs:limited':{artId:'preset.restraint.ankles',description:'一对金属脚镣由短链连接双踝，收窄迈步幅度，使移动速度降低1。'},
  'legs:locked':{artId:'preset.restraint.ankles',description:'金属脚镣收紧双腿间的连链，将双腿固定，使人物无法自行行走。'},
  'footwear:heels':{artId:'item.realm.heels',description:'细跟鞋以踝带固定足部，抬高脚跟并改变站姿，使移动速度降低1。'},
  'mouth:gag':{artId:'item.intimate.ball-gag',description:'口球由两侧束带固定在口部，使人物无法发声，也无法使用需要发声的能力。'}
 });
 function get(item){const d=item?.payload?.realmEquipment;if(d?.version!==1)return null;const visual=VISUALS[d.group+':'+d.choice];return visual?{...visual,group:d.group,choice:d.choice,permanent:d.group==='collar'}:null;}
 return Object.freeze({get});
});
