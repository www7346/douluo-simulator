// Fixed material names; source, form, quality and numeric properties remain separate facts.
const materialNames:Record<string,Record<string,string[]>>={
  索托:{魂导余材:['玄钢细砂','百锻钢晶','风息灵髓'],赛事资源:['星纹砂','斗魂石晶','流岚精魄']},
  史莱克:{魂导余材:['赤铜焰砂','炉心赤晶','青藤玉髓'],赛事资源:['星火灵砂','朱焰晶','生息元髓']},
  皇家:{魂导余材:['澄银磨粉','澄银魂晶','岚纹灵髓'],赛事资源:['寒泉灵砂','碧澜晶','青岚精魄']},
  七宝:{魂导余材:['明辉玉粉','琉光晶核','碧生灵髓'],赛事资源:['煦光灵砂','七曜琉晶','长青精魄']},
  蓝电:{魂导余材:['雷纹铜屑','霆光晶核','震岳灵髓'],赛事资源:['震霆灵砂','蓝霆晶','龙脉精魄']},
  瀚海:{魂导余材:['潮银细砂','沧澜魂晶','乘风灵髓'],赛事资源:['潮汐灵砂','深海蓝晶','海岚精魄']},
  武魂城:{魂导余材:['圣银研粉','圣辉晶核','回生灵髓'],赛事资源:['曦光灵砂','净辉晶','祈生精魄']},
  昊天:{魂导余材:['玄铁锻砂','乌金钢晶','精金灵髓'],赛事资源:['沉岳矿粉','镇岳晶','锋金精魄']}
};
const materialForms:Record<string,number>={粉尘:0,晶核:1,精粹:2};

/** Display only: saved prize names, generated identities and material fingerprints stay unchanged. */
export function competitionDisplayText(value:string,venueId?:string):string {
  if(venueId==='arena-lanba'&&value==='蓝霸')return '史莱克';
  return value.replace(/(索托|蓝霸|史莱克|皇家|七宝|蓝电|瀚海|武魂城|昊天)(魂导余材|赛事资源)(粉尘|晶核|精粹)/gu,
    (_,venue:string,source:string,form:string)=>materialNames[venue==='蓝霸'?'史莱克':venue][source][materialForms[form]])
    .replace(/蓝霸(?=赛事资源|魂导余材|传承·|冠军魂环源)/gu,'史莱克');
}
