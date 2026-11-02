import {GENERIC_HUMAN_ART} from '../shared/generic-human-art';
import canonicalFigureUpgrades from '../shared/canonical-figure-upgrades.json';
/** Approved adult artwork only. Stage IDs prevent adult art leaking into childhood records. */
export const ADULT_BATTLE_FIGURES:Readonly<Record<string,string>>=Object.freeze({
 'tang-san-title':'tang-san',
 'xiao-wu-title':'xiao-wu',
 'dai-mubai-title':'dai-mubai',
 'zhu-zhuqing-title':'zhu-zhuqing',
 'oscar-title':'oscar',
 'ning-rongrong-sect':'ning-rongrong',
 'ma-hongjun-title':'ma-hongjun',
 'qian-renxue-spirit':'qian-renxue',
 'qian-renxue-mortal-peak':'qian-renxue',
 'bibi-dong-pope':'bi-bi-dong',
 'bibi-dong-mortal-peak':'bi-bi-dong',
 'hu-liena-slaughter':'hu-lie-na',
});

export function adultBattleFigure(state:any,id:string):string|null {
 const recordId=state.战斗单位?.列表?.[id]?.扩展?.角色库ID??state.人物?.列表?.[id]?.扩展?.角色库ID;
 const file=ADULT_BATTLE_FIGURES[String(recordId??'')];
 return file?(canonicalFigureUpgrades[String(recordId) as keyof typeof canonicalFigureUpgrades]?.src??`/art/adult-figures-v1/${file}.png`):null;
}

export function isHumanBattleFigure(figure:unknown):boolean {
 return typeof figure==='string'&&(GENERIC_HUMAN_ART.some(a=>a.src===figure)||figure==='/art/xuanjian/li-chijing.webp'||figure.startsWith('blob:')||figure.includes('/adult-figures-v1/')||figure.includes('/character-figures-v2/')||figure.includes('/human-')||figure.includes('/player-travelers-v3/')||figure.includes('/player-women-v4/')||figure.includes('/opening-figures-v2/'));
}
