(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulGenericVisuals=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 // Cosmetic identities only. No game RNG, derived mechanics, or read-time state writes.
 const refreshedDefaults=[
  ["guard-female-adult","成年女守卫·青金裙甲","13-female-guard-adult-v3.webp",355,0,360],
  ["guard-female-mature","成熟女守卫","16-female-guard-mature.webp",340,15,350],
  ["guard-male-adult","成年男守卫","05-male-guard-adult.webp",355,10,340],
  ["guard-male-mature","成熟男守卫","09-male-guard-mature.webp",325,0,340],
  ["hunter-female-adult","成年女猎手","14-female-hunter-adult.webp",335,0,340],
  ["hunter-female-mature","成熟女猎手","17-female-hunter-mature.webp",340,0,360],
  ["hunter-male-adult","成年男猎手","06-male-hunter-adult.webp",295,0,340],
  ["hunter-male-mature","成熟男猎手","10-male-hunter-mature.webp",355,0,340],
  ["merchant-female-adult","成年女商人·绯玉锦裙","15-female-merchant-adult-v3.webp",355,0,350],
  ["merchant-female-mature","成熟女商人","18-female-merchant-mature.webp",285,0,360],
  ["merchant-male-adult","成年男商人","07-male-merchant-adult.webp",330,0,340],
  ["merchant-male-mature","成熟男商人","11-male-merchant-mature.webp",300,0,360],
  ["traveler-female-mature","成熟女旅者·碧羽行裙","19-female-traveler-mature-v3.webp",375,0,350],
  ["traveler-male-adult","成年男旅者","08-male-traveler-adult.webp",310,0,340],
  ["traveler-male-mature","成熟男旅者","12-male-traveler-mature.webp",390,0,350],
 ];
 const assets=[];
 for(const [key,label,file,x,y,side] of refreshedDefaults){const [role,gender,band]=key.split('-');assets.push({id:'generic-'+key,label,src:'/art/generic-refresh-v1/'+file,role,gender,band,head:[1024,1536,x,y,side]});}
 for(const gender of ['male','female']){
  assets.push({id:'generic-traveler-'+gender+'-child',src:'/art/player-children-v1/'+gender+'.webp',role:'traveler',gender,band:'child',head:gender==='male'?[1024,1536,335,5,345]:[1024,1536,340,10,350]});
  assets.push({id:'generic-traveler-'+gender+'-teen',src:'/art/player-travelers-v3/'+gender+'-teen'+(gender==='female'?'-proportions-v2':'')+'.webp',role:'traveler',gender,band:'teen',head:gender==='male'?[1024,1536,340,0,380]:[1024,1536,340,10,350]});
 }
 for(const number of [1,2,5,6,9,10])assets.push({id:'woman-v4-'+number,src:'/art/player-women-v4/'+String(number).padStart(2,'0')+(number===10?'-proportions-v2':'')+'.webp',role:'traveler',gender:'female',band:'adult',head:number===10?[1024,1536,365,0,340]:[1024,1536,300,0,400]});
 assets.push({id:'mature-man-jiang',src:'/art/opening-figures/jiang.webp',role:'traveler',gender:'male',band:'mature',head:[853,1280,330,0,250]});
 const maleVariants=[
  ['adult-01','清朗书生','adult','traveler',305,0,340],
  ['adult-02','刚毅武者','adult','guard',365,10,330],
  ['adult-03','爽朗旅者','adult','traveler',335,0,340],
  ['adult-04','冷峻剑客','adult','traveler',390,0,310],
  ['adult-05','温厚工匠','adult','merchant',405,0,300],
  ['adult-06','敏锐猎手','adult','hunter',415,0,300],
  ['teen-01','春野少年','teen','traveler',350,0,340],
  ['teen-02','青衿少年','teen','traveler',390,0,310],
  ['teen-03','赤发少年','teen','traveler',390,0,320],
  ['child-01','暖衫男童','child','traveler',320,0,380],
 ];
 for(const [key,label,band,role,x,y,side] of maleVariants)assets.push({id:'generic-man-'+key,label,src:'/art/generic-men-v1/'+key+'.webp',role,gender:'male',band,variant:true,head:[1024,1536,x,y,side]});
 assets.push({id:'generic-woman-seiso-cape',label:'银雾·披肩长裙',src:'/art/generic-women-v1/seiso-cape.webp',role:'traveler',gender:'female',band:'adult',variant:true,head:[1024,1536,330,0,360]});
 const femaleVariants=[
  ['jirai-check','白夜·露肩格纹',355,0,340],
  ['jirai-pink','莓粉·心扣领结',355,0,340],
  ['jirai-black','墨羽·白蕾背带裙',355,0,340],
  ['jk-grey','雾灰·蕾领格裙',365,0,330],
  ['lolita-sky','天蓝·花庭茶会',350,0,350],
  ['victorian-walnut','胡桃·格领套装',350,0,350],
  ['firefly','流萤·明朗招手',345,0,360],
  ['alice-checker','爱丽丝·纸牌花边',420,110,390],
  ['kikurihime-red-parasol','菊里媛·绯伞原色',405,270,350],
  ['lolita-ivory-twintail','奶白·花绣双马尾',365,0,360],
  ['keqing-classic','刻晴·经典紫装',395,40,300],
  ['keqing-opulent-splendor','刻晴·霓裾翩跹',350,15,340],
 ];
 for(const [key,label,x,y,side] of femaleVariants)assets.push({id:'generic-woman-'+key,label,src:'/art/generic-women-v1/'+key+'.webp',role:'traveler',gender:'female',band:'adult',variant:true,head:[1024,1536,x,y,side]});
 const approvedVariants=[
  ["generic-man-child-02","浅金发男童","01-boy.webp","male","child",280,5,430],
  ["generic-woman-child-02","双辫粉裙女童","02-girl.webp","female","child",320,0,420],
  ["generic-woman-teen-02","栗发红披肩少女","03-teen-girl.webp","female","teen",310,0,360],
  ["generic-man-teen-04","青衣少年","04-teen-boy.webp","male","teen",320,0,340],
  ["generic-woman-mature-lady","绛夜·成熟御姐","20-mature-lady-v3.webp","female","mature",360,0,330],
  ["generic-woman-gentle-lady","花语·温柔淑女","21-gentle-lady.webp","female","adult",325,0,350],
  ["generic-woman-court-noblewoman","琉璃·宫廷贵女","22-court-noblewoman.webp","female","adult",310,0,350],
 ];
 for(const [id,label,file,gender,band,x,y,side] of approvedVariants)assets.push({id,label,src:'/art/generic-refresh-v1/'+file,role:'traveler',gender,band,variant:true,head:[1024,1536,x,y,side]});
 assets.forEach(a=>{Object.freeze(a.head);Object.freeze(a);});Object.freeze(assets);
 const byId=new Map(assets.map(a=>[a.id,a])),bySrc=new Map(assets.map(a=>[a.src,a]));
 function hash(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
 function body(person){
  const gender=['男','male'].includes(person?.gender)?'male':['女','female'].includes(person?.gender)?'female':null;
  const age=person?.age;if(!gender||typeof age!=='number'||!Number.isFinite(age)||age<=0)return null;
  return {gender,band:age<12?'child':age<18?'teen':age>=36?'mature':'adult'};
 }
 function role(person){
  const a=person?.archetype??person?.扩展?.archetypeId;
  if(['guard','mercenary','spirit-hall-worker','imperial-patrol','sect-retainer'].includes(a))return 'guard';
  if(['hunter','merchant'].includes(a))return a;
  const job=person?.occupation??'';
  return /守卫|卫兵|巡防|佣兵|护卫/.test(job)?'guard':/猎人|猎魂/.test(job)?'hunter':/商|店主|掌柜/.test(job)?'merchant':'traveler';
 }
 function candidates(person){const b=body(person);return b?assets.filter(a=>a.gender===b.gender&&a.band===b.band):[];}
 function pick(person,pool){
  if(!pool.length)return null;
  const preferred=pool.filter(a=>a.role===role(person));
  if(!person.id)return preferred.find(a=>a.id==='woman-v4-10')??preferred[0]??pool[0];
  const weighted=[...pool,...preferred];return weighted[hash(person.id)%weighted.length];
 }
 function choose(person){return pick(person,candidates(person));}
 function resolve(person){
  const pool=candidates(person);if(!pool.length)return null;
  const saved=byId.get(person?.扩展?.genericVisual?.assetId);if(saved&&pool.includes(saved))return saved;
  // Additional variants join saved creation choices. Keep the established default
  // set stable so expanding the catalogue does not redraw unassigned NPCs.
  // A profession is a preference; it must not make a whole district share one face.
  return pick(person,pool.filter(a=>!a.variant));
 }
 const bodyKey=p=>{const b=body(p);return b?b.gender+':'+b.band:null;};
 function changed(person){const original=person?.扩展?.bodyIdentity,b=body(person);return !!original&&(person.gender!==original.gender||!!original.band&&b?.band!==original.band);}
 function fixed(state,p){return !changed(p)&&(p.id===state?.角色?.主控单位ID||p.扩展?.角色库ID||p.canonicalId||p.id==='captive-cat-liu');}
 const choice=a=>({assetId:a.id,gender:a.gender,band:a.band});
 function leastUsed(state,person){
  const pool=candidates(person);if(!pool.length)return null;
  const usage=new Map(pool.map(a=>[a.id,0]));
  for(const other of Object.values(state?.人物?.列表??{})){
   if(other.id===person.id||other.status==='dead'||other.locationId!==person.locationId||other.spaceId!==person.spaceId||!changed(other)&&(other.扩展?.角色库ID||other.canonicalId||other.id==='captive-cat-liu')||other.扩展?.currentFigure||other.扩展?.currentAvatar)continue;
   const art=resolve(other.id===state?.角色?.主控单位ID&&!changed(other)?{...other,id:undefined}:other);if(art&&usage.has(art.id))usage.set(art.id,usage.get(art.id)+1);
  }
  const preferred=role(person),rank=a=>hash(person.id+':'+a.id);
  return [...pool].sort((a,b)=>usage.get(a.id)-usage.get(b.id)||Number(b.role===preferred)-Number(a.role===preferred)||rank(a)-rank(b))[0];
 }
 function assign(state,person){
  if(!person||fixed(state,person)||person.扩展?.currentFigure||person.扩展?.currentAvatar)return null;
  const saved=byId.get(person.扩展?.genericVisual?.assetId);if(saved&&candidates(person).includes(saved))return saved;
  const chosen=leastUsed(state,person);if(!chosen)return null;
  person.扩展??={};person.扩展.genericVisual={...choice(chosen),...(person.扩展.genericVisual?.bodyChoices?{bodyChoices:person.扩展.genericVisual.bodyChoices}:{})};return chosen;
 }
 /** A real write boundary owns a body choice. Reading never creates history. */
 function assignBody(state,person,before){
  const priorKey=bodyKey(before),key=bodyKey(person);if(!key||key===priorKey)return null;
  person.扩展??={};const priorBody=body(before);person.扩展.bodyIdentity??={gender:before.gender,...(priorBody?{band:priorBody.band}:{})};
  if(priorBody&&!person.扩展.bodyIdentity.band&&person.扩展.bodyIdentity.gender===before.gender)person.扩展.bodyIdentity.band=priorBody.band;
  if(person.扩展.currentFigure||person.扩展.currentAvatar)return null;
  const stored=person.扩展.genericVisual,history={...(stored?.bodyChoices??{})};
  if(priorKey&&!fixed(state,before)){const previous=resolve(before);if(previous)history[priorKey]=choice(previous);}
  const remembered=byId.get(history[key]?.assetId),chosen=remembered&&candidates(person).includes(remembered)?remembered:fixed(state,person)?null:leastUsed(state,person);
  if(chosen){history[key]=choice(chosen);person.扩展.genericVisual={...choice(chosen),bodyChoices:history};}
  else if(stored)person.扩展.genericVisual={assetId:stored.assetId,gender:stored.gender,band:stored.band,bodyChoices:history};
  return chosen;
 }
 function portrait(src){const a=bySrc.get(src);if(!a)return null;const [w,h,x,y,side]=a.head;return {src,cell:0,columns:1,rows:1,sourceAspect:w/h,crop:{x:x/w,y:y/h,width:side/w,height:side/h}};}
 return Object.freeze({assets,body,bodyKey,changed,role,candidates,choose,resolve,assign,assignBody,portrait});
});
