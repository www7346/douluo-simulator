(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulDisplayNames=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
  const stableHash = value => {
    let hash = 2166136261;
    for (const char of String(value ?? '')) { hash ^= char.codePointAt(0); hash = Math.imul(hash, 16777619); }
    return hash >>> 0;
  };
  const words=text=>Object.freeze([...new Set(text.split(/\s+/u).filter(Boolean))]);
  const characters=text=>Object.freeze([...new Set([...text])]);
  const PERSONAL_NAME_PARTS=Object.freeze({
    surnames:characters('赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦许何吕施张孔曹严华金魏陶姜谢邹喻苏潘葛范彭郎鲁韦马苗方俞任袁柳鲍史唐费岑薛雷贺倪汤殷罗毕郝邬安常于傅顾孟黄萧尹姚邵汪毛戴宋庞熊纪舒屈项董梁杜阮蓝闵季贾江郭林陆程叶白温洛宁裴楚池莫黎夏闻燕凌徐段齐'),
    compoundSurnames:words('欧阳 上官 司马 诸葛 公孙 慕容 南宫 东方'),
    neutral:Object.freeze({single:characters('安和言竹澄溪禾白岑晨夏秋'),double:words('清和 怀瑾 知行 景行 云舒 明霁 时雨 望舒 予安 以宁 闻溪 书言 若竹 亦安 清禾 听澜 星河 知夏 临溪 怀音 映川 云岑 书白 景初'),first:characters('清怀知景云明时望予以闻书若亦'),last:characters('宁安和言竹澄溪禾白岑晨夏秋棠')}),
    male:Object.freeze({single:characters('衡川朗岳峰舟渊松柏辰铮翊琛佑勋昊廉霄硕淮毅砚峥修'),double:words('远山 承安 长风 照野 明川 知衡 修远 景辰 云舟 怀璟 靖川 砚舟 绍衡 允谦 维钧 秉文 启明 昭庭 守正 敬之 元铮 廷岳 凌霄 弘毅'),first:characters('承景绍允维秉修崇启祁昭靖守宗继敬元廷振凌恒砚弘远'),last:characters('衡川远泽朗轩峰岳舟渊松柏辰铮翊琛佑勋昊廉霄硕淮毅')}),
    female:Object.freeze({single:characters('宁岚瑶薇蘅棠音月雪霜璃兰蕊荷琬玥璇纾嫣萱芸彤菱卿'),double:words('芷宁 若兰 语棠 诗音 静姝 婉清 沐瑶 依岚 舒窈 映雪 昕禾 采薇 梦溪 令仪 初晴 沁月 锦书 素蘅 佩兰 念慈 芸汐 韵宁 晴岚 予棠'),first:characters('芷若语诗静婉沐依舒映昕采梦令初沁锦素佩念芸韵晴予'),last:characters('宁岚瑶薇蘅棠音月雪霜璃兰蕊荷琬玥璇纾嫣萱芸彤菱卿')})
  });
  const combinations=parts=>parts.first.flatMap(first=>parts.last.filter(last=>first!==last).map(last=>first+last));
  const givenPools=Object.freeze(Object.fromEntries(['male','female','neutral'].map(gender=>{
    const own=PERSONAL_NAME_PARTS[gender],shared=PERSONAL_NAME_PARTS.neutral;
    return [gender,Object.freeze([...new Set([...own.single,...own.double,...combinations(own),...(gender==='neutral'?[]:[...shared.single,...shared.double,...combinations(shared)])])])];
  })));
  const allSurnames=Object.freeze([...PERSONAL_NAME_PARTS.surnames,...PERSONAL_NAME_PARTS.compoundSurnames]);
  const genderKey=value=>['男','male'].includes(value)?'male':['女','female'].includes(value)?'female':'neutral';
  const nameKey=value=>String(value??'').normalize('NFKC').replace(/\s/gu,'');
  const validName=(surname,given)=>!surname.endsWith(given[0])?surname+given:null;
  function personalNameCapacity(gender){
    return allSurnames.reduce((sum,surname)=>sum+givenPools[genderKey(gender)].filter(given=>validName(surname,given)).length,0);
  }
  function generatePersonalName({seed,gender,usedNames=[]}={}){
    const key=String(seed??''),kind=genderKey(gender),shared=kind!=='neutral'&&stableHash(key+':shared')%5===0;
    const parts=PERSONAL_NAME_PARTS[shared?'neutral':kind],shape=stableHash(key+':shape')%100;
    const given=shape<18?parts.single:shape<48?parts.double:combinations(parts);
    const surnames=stableHash(key+':compound')%20===0?PERSONAL_NAME_PARTS.compoundSurnames:PERSONAL_NAME_PARTS.surnames;
    const preferred=validName(surnames[stableHash(key+':surname')%surnames.length],given[stableHash(key+':given')%given.length]);
    const used=new Set(Array.from(usedNames,nameKey));
    if(preferred&&!used.has(nameKey(preferred)))return preferred;
    const pool=givenPools[kind],size=allSurnames.length*pool.length,offset=stableHash(key+':collision')%size;
    const gcd=(a,b)=>b?gcd(b,a%b):a;
    let step=stableHash(key+':step')%size||1;while(gcd(step,size)!==1)step++;
    for(let index=0;index<size;index++){
      const ordinal=(offset+index*step)%size,value=validName(allSurnames[Math.floor(ordinal/pool.length)],pool[ordinal%pool.length]);
      if(value&&!used.has(nameKey(value)))return value;
    }
    throw new Error('可用的人物姓名已用尽');
  }
  function presentGeneratedNames(input) {
    const surnames=['陆','程','沈','顾','洛','温','叶','林','许','白','秦','苏','江','凌','韩'];
    const given=['星澈','闻川','清岚','景和','云舒','疏影','知遥','风眠','明霁','临溪','照夜','听澜','时雨','问舟','望川'];
    const name=(scope,index)=>{const offset=stableHash(scope),ordinal=Math.max(0,Number(index)-1);return surnames[(offset+ordinal)%surnames.length]+given[(Math.floor(offset/surnames.length)+ordinal)%given.length];};
    return String(input??'').replace(/(索托|蓝霸|史莱克|皇家|七宝|蓝电|瀚海|武魂城|昊天)临时魂师·(\d{2})/gu,(_,venue,index)=>name(venue,index))
      .replace(/堕落魂师·(\d{2})(\d{2})/gu,(_,bout,index)=>name(`杀戮场${bout}`,index));
  }

return {stableHash,presentGeneratedNames,generatePersonalName,personalNameCapacity,PERSONAL_NAME_PARTS};
});
