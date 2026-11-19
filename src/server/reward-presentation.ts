import {rules} from '../rules';
import {competitionDisplayText} from '../shared/competition-display';
const prose:Record<string,string>={
 asura:'修罗神赐下的一缕杀意凝成此环。猩红光纹如剑锋游走，唤醒武魂中直面强敌、破开防御的锋芒。',
 rakshasa:'来自罗刹神的幽暗恩赐。紫黑雾气缠绕环身，邪念在低语中侵蚀敌人的心神，将恐惧与衰弱带入战局。',
 sea:'海神将一缕潮汐之力留在此环中。碧波随魂力起伏，既可化为奔涌的冲击，也可织成护身的水幕。',
 angel:'天使神赐下的光明凝成一轮金环。温暖的圣辉照亮武魂深处，炽热的火光随之苏醒，指引净化与守护之力。',
 'nine-color':'九彩玄女的祝福化作交映的彩辉。光芒流过武魂时，力量仿佛被轻轻托起，蕴藏着增幅与庇护的可能。',
 food:'食神将温润的生命气息封入此环。魂力如暖汤般徐徐散开，为疲惫的身躯带来滋养，也为恢复与净化留下契机。',
 'azure-python':'大明赠予的一缕雷息，凝聚着天青牛蟒的沉稳威势。青色电光缓缓盘旋，蕴藏迟滞敌人、击破防御的力量。',
 'titan-ape':'二明的馈赠沉厚如山。泰坦巨猿的力量随土色光纹震荡，将近身搏击的劲道与撼动大地的威势留给后来者。',
 'soft-rabbit':'柔骨兔赠出的魂力轻盈而绵长。环上微光如足尖掠过草叶，柔韧的身法与贴身发力的诀窍藏在其中。',
 'blue-silver-emperor':'蓝银皇将一缕生机交付于你。细密的蓝银纹路在环中舒展，既有藤蔓缠绕的韧性，也有草木复苏的温柔。',
 'dream-iceworm':'天梦冰蚕留下一缕带着寒意的精神气息。冰蓝光点如梦浮沉，牵引感知，也蕴藏扰乱心神与寒冰封阻的可能。',
 'deep-sea-whale':'深海魔鲸王的馈赠回荡着海渊的低鸣。水流与雷光在环中交汇，蕴藏猛烈的冲击与厚重的护身之力。'
};
const master:Record<string,string>={
 'attuned-100':'玉小刚交给你的第一份礼物。灵兽自愿献出的百年魂环气息温和，会随你选定的武魂显露相应属性。大师希望你稳稳踏出成为魂师的第一步。',
 'bamboo-10':'玉小刚从猎魂森林中为你挑选的孤竹魂环，年限只有十年，却是他验证武魂理论的一次尝试。竹性坚韧，能否让平凡武魂走出另一条路？大师看向它时，仍笃信自己的判断。',
 'bamboo-423':'玉小刚赠予的孤竹魂环，恰好四百二十三年。他将这枚魂环视为验证第一魂环承受极限的理想样本；年限达到了他的设想，孤竹是否适合你的武魂，仍要由你决定。'
};
export function rewardName(item:any):string {
 const source=item?.payload?.ringSource;
 if(source&&source.kind!=='competition')return rules.talents.ringItemName(source);
 if(item?.payload?.boonSourceId)return rules.talents.ringItemName({kind:'boon-bone',sourceId:item.payload.boonSourceId});
 if(item?.provenance?.type==='opening-selection'||item?.payload?.openingArt){const name=({attack:'铜纹护腕',defense:'青玉坠'} as Record<string,string>)[item.payload?.openingArt];if(name)return name;}
 return competitionDisplayText(item?.name??'',source?.venueId??item?.payload?.venueId??item?.provenance?.venueId);
}
function channelLabels(ids:string[]=[]){return [...new Set(ids)].map(id=>rules.martialSoul.CHANNEL_REGISTRY[id]?.name??(Object.values(rules.martialSoul.CHANNEL_REGISTRY) as any[]).find(v=>v.name===id)?.name).filter(Boolean);}
export function ringLore(item:any,profile?:any){
 const source=item?.payload?.ringSource,theme=source?rules.talents.sourceDetails(source):null;
 const gift=source?.kind==='master-gift'?rules.talents.MASTER_GIFTS[source.sourceId]:null;
 const attributes=profile?[...new Set([...(profile.属性谱?.主属性??[]),...(profile.属性谱?.副属性??[])])]:theme?.attributes??(gift&&!gift.attuned?['木']:source?.attributes??[]);
 const channels=theme?.channels??source?.channels??(gift&&!gift.attuned?['channel.shield','channel.armor_break']:profile?.血脉?.definition?.channels??[]);
 const origin=gift?'玉小刚赠予 · '+(gift.attuned?'灵兽献祭':'猎魂森林孤竹'):theme?.name??(source?.kind==='divine'?rules.talents.GODS[source.sourceId]:source?.kind==='competition'?competitionDisplayText(source.venueName??'魂师赛事',source.venueId):profile?.名称??'灵兽献祭');
 const description=gift?master[source.sourceId]:source?.kind==='boon-ring'?prose[source.sourceId]:item?.payload?.narrative?.description??(profile?`${profile.名称}留下的魂环，凝聚着它漫长岁月中积蓄的魂力。生前的属性与本能仍在环中回响，等待与你的武魂相遇。`:'一枚凝聚灵兽力量的魂环。环上的光纹随魂力缓缓流转，等待新的归宿。');
 return {name:item?rewardName(item):`${profile?.名称??'魂兽'}魂环`,origin,description,years:source?.years??profile?.年限,attributes,channels:channelLabels(channels),attuned:!!gift?.attuned||['sacrifice','attuned-423'].includes(source?.kind)};
}

export function rewardDescription(item:any):string|undefined {
 const sourceId=item?.payload?.boonSourceId;
 if(sourceId){const source=rules.talents.BOON_SOURCES[sourceId];return source?source.name+'赠予的一块魂骨，'+source.slot+'中封存着'+source.skillName+'的力量。与身体融合后，这份馈赠将伴你一同成长。':undefined;}
 return ({attack:'铜片沿护腕交叠，细密纹路将魂力引向拳锋。握拳时，腕间便传来一阵沉稳的震鸣。',defense:'一枚温润的青玉坠，金丝绕着玉心结成护纹。魂力注入时，薄薄的光晕贴身展开，为旅人挡下迎面的冲击。',strength:'朱红丹丸藏着一股燥热药力。服下后气血涌动，短时间内出手更有力。',agility:'淡青丹丸带着清凉草香。药力散开，步履便轻快起来。',vitality:'土黄丹丸药性温厚。服下后筋骨渐暖，可在短时间内增强体魄。'} as Record<string,string>)[item?.payload?.openingArt];
}
