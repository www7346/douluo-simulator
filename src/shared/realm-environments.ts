/** Presentation only. Themes never grant resources, comfort, or mechanical bonuses. */
export const REALM_THEMES = [
 {id:'palace',label:'宫廷',description:'明亮的宫廷厅堂，陈设整洁，廊柱之间留有宽敞的活动空间。'},
 {id:'courtyard',label:'庭院',description:'素净的庭院，备有饮水、食物与休息处。'},
 {id:'waterside',label:'水榭',description:'临水的亭榭与长廊相连，水光映入室内。'},
 {id:'bamboo',label:'竹林',description:'竹影围绕安静的居所，清风穿过敞开的廊道。'},
 {id:'library',label:'藏书',description:'书架与阅读席沿墙排开，灯光照亮安静的阅览空间。'},
 {id:'seaside',label:'海滨',description:'面向海景的明亮居所，窗外潮声平缓。'},
 {id:'snow',label:'雪阁',description:'暖阁外铺着清雪，室内保持适宜居住的环境。'},
 {id:'stars',label:'星空',description:'穹顶映着星空，柔和的光线照亮休息与交谈的空间。'},
] as const;
export const THEMES=REALM_THEMES;
export const REALM_FIXED_PRESETS=[{id:'free',label:'自由活动'},{id:'cross',label:'十字架固定'},{id:'suspended',label:'悬吊固定'},{id:'cage',label:'金属笼'}] as const;
