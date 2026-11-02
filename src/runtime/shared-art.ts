import '../shared/nine-court-skills.js';
import type {Artwork} from './art-catalog';
import {ADULT_WOMAN_FIGURES} from './player-figure-options';
import {GENERIC_HUMAN_ART,GENERIC_HUMAN_VARIANTS} from '../shared/generic-human-art';
import canonicalFigureUpgrades from '../shared/canonical-figure-upgrades.json';
import '../shared/begonia-content-core.js';
import '../shared/royal-swan-content-core.js';
import '../shared/yuehua-cat-content.js';
import '../shared/canonical-women-support-content.js';
import '../shared/canonical-women-elements-content.js';
import '../shared/canonical-women-beasts-content.js';
import '../shared/canonical-women-content-core.js';
/** New standalone illustrations are registered here once for all player image pickers. */
export const SHARED_ART:readonly Artwork[] = [
  ...(globalThis as any).SoulNineCourts.courts.map((court:{name:string;artId:string},i:number)=>({key:court.artId,domain:'skill' as const,label:'九美图·'+court.name,src:'/art/jiumeitu/nine-courts.webp',cell:i,columns:3,rows:3})),
  {key:'preset.soul.canonical-snake',domain:'spirit',label:'蛇·青鳞本相（原图）',src:'/art/canonical-women-v1/canonical-snake.webp',cell:0,columns:3,rows:4,inset:.035},
  ...['青鳞毒牙','游蛇步','缠骨蛇信','盘鳞护体','蚀鳞吻','蛇影惊心','灵蛇真身','百鳞归壳','碧牙穿心'].map((name,i)=>({key:'skill.canonical-women.canonical-snake.'+(i+1),domain:'skill',label:'蛇·'+name+'（原图）',src:'/art/canonical-women-v1/canonical-snake.webp',cell:i+1,columns:3,rows:4,inset:.035})),
  {key:'skill.canonical-women.wish-ring.3',domain:'skill',label:'如意环·止戈一瞬（原图）',src:'/art/yuehua-cat-v1/wish-ring-skills.webp',cell:2,columns:3,rows:3,inset:.035},
  {key:'skill.canonical-women.ice-phoenix.8',domain:'skill',label:'冰凤凰·冰冠守望',src:'/art/canonical-women-v1/ice-phoenix.webp',cell:8,columns:3,rows:4,inset:.035},
  ...globalThis.SoulCanonicalWomenContent.PROFILES.flatMap((p:any)=>[
    {key:p.SOUL.artId,domain:'spirit',label:p.SOUL.name+'·传承本相',src:p.SOUL.artPath,cell:0,columns:p.skillArtPath?1:p.NODES.length?3:1,rows:p.skillArtPath?1:p.NODES.length?4:1,inset:.035},
    ...p.NODES.map((n:any)=>({key:n.artId,domain:'skill',label:p.SOUL.name+'·'+n.name,src:n.artPath,cell:n.artCell,columns:n.artColumns??p.artColumns??3,rows:n.artRows??p.artRows??4,inset:.035}))
  ]),
  ...globalThis.SoulCanonicalWomenContent.BEASTS.flatMap((p:any)=>[
    {key:p.artId,domain:'beast',label:p.name+'·本体',src:p.artPath,cell:0,columns:3,rows:2,inset:.035},
    ...p.NODES.map((n:any)=>({key:n.artId,domain:'skill',label:p.name+'·'+n.name,src:n.artPath,cell:n.artCell,columns:3,rows:2,inset:.035}))
  ]),
  {key:'preset.soul.royal-swan',domain:'spirit',label:'天鹅·白羽承锋',src:'/art/royal-swan-v1/martial-soul.webp',cell:0,columns:1,rows:1},
  ...globalThis.SoulRoyalSwanContent.NODES.map((node:any)=>({key:node.artId,domain:'skill',label:'天斗天鹅·'+node.name,src:node.artPath,cell:node.artCell,columns:3,rows:3,inset:.04})),
  {key:'preset.soul.nine-heart-begonia',domain:'spirit',label:'九心海棠·碧心凝露',src:'/art/begonia-v1/martial-soul.webp',cell:0,columns:1,rows:1},
  {key:'skill.begonia.jade-mending',domain:'skill',label:'九心海棠·玉瓣扶伤（原图）',src:'/art/begonia-v1/skills.webp',cell:3,columns:3,rows:3,inset:.025},
  ...globalThis.SoulBegoniaContent.NODES.map((node:any)=>({key:node.artId,domain:'skill',label:'九心海棠·'+node.name,src:node.artPath,cell:node.artCell,columns:node.artColumns??3,rows:node.artRows??3,inset:.025})),
  {key:'item.intimate.chastity-belt',domain:'item',label:'贞操带',src:'/art/intimate-devices-v1/chastity-belt.webp',cell:0,columns:1,rows:1},
  {key:'item.intimate.vibrator-egg',domain:'item',label:'灵振跳蛋',src:'/art/intimate-devices-v1/vibrator-egg.webp',cell:0,columns:1,rows:1},
  {key:'item.intimate.anal-plug',domain:'item',label:'后庭塞',src:'/art/intimate-devices-v1/anal-plug.webp',cell:0,columns:1,rows:1},
  {key:'item.intimate.nipple-ring',domain:'item',label:'乳环',src:'/art/intimate-devices-v1/nipple-ring.webp',cell:0,columns:1,rows:1},
  {key:'item.intimate.clit-ring',domain:'item',label:'阴蒂环',src:'/art/intimate-devices-v1/clit-ring.webp',cell:0,columns:1,rows:1},
  {key:'item.intimate.urethral-lock',domain:'item',label:'尿道锁',src:'/art/intimate-devices-v1/urethral-lock.webp',cell:0,columns:1,rows:1},
  {key:'item.intimate.ball-gag',domain:'item',label:'口球',src:'/art/intimate-devices-v1/ball-gag.webp',cell:0,columns:1,rows:1},
  {key:'item.intimate.collar',domain:'item',label:'铃铛项圈',src:'/art/intimate-devices-v1/collar.webp',cell:0,columns:1,rows:1},
  {key:'item.intimate.blindfold',domain:'item',label:'眼罩',src:'/art/intimate-devices-v1/blindfold.webp',cell:0,columns:1,rows:1},

  ...Object.entries(canonicalFigureUpgrades).map(([id,entry])=>({key:'character.upgrade.'+id,domain:'character',label:entry.name,src:entry.src,cell:0,columns:1,rows:1})),
  {key:'preset.soul.jiumeitu',domain:'spirit',label:'九美图·九庭长卷',src:'/art/jiumeitu/jiumeitu-scroll-v2.webp',cell:0,columns:1,rows:1},
  {key:'spirit.taiyin-bili',domain:'spirit',label:'薜荔·太阴月剑',src:'/art/xuanjian/taiyin-bili.webp',cell:0,columns:1,rows:1},
  {key:'character.li-chijing',domain:'character',label:'李尺泾·太阴剑修',src:'/art/xuanjian/li-chijing.webp',cell:0,columns:1,rows:1},
  {key:'character.gu-yuena-adult',domain:'character',label:'古月娜·成年银龙王',src:'/art/character-figures-v2/gu-yuena-adult.webp',cell:0,columns:1,rows:1},
  {key:'opening.figure.cat',domain:'character',label:'猫女·浅绿短发',src:'/art/opening-figures-v2/cat-free.webp',cell:0,columns:1,rows:1},
  {key:'opening.figure.cat-bound',domain:'character',label:'猫女·锁扣绳具',src:'/art/opening-figures-v2/cat-bound.webp',cell:0,columns:1,rows:1},
  ...['wen','gu','qi','jiang'].map((id,index)=>({key:'opening.figure.'+id,domain:'character',label:['闻景行·商宅主人','顾晏廷·伯爵','祁玄策·驻殿高层','沉稳男魂师'][index],src:'/art/opening-figures/'+id+'.webp',cell:0,columns:1,rows:1})),
  ...ADULT_WOMAN_FIGURES.map(option=>({key:'player.woman.v4.'+option.number,domain:'character',label:String(option.number).padStart(2,'0')+' · '+option.name,src:option.src,cell:0,columns:1,rows:1})),
  ...GENERIC_HUMAN_ART.filter(option=>!option.variant&&option.src.startsWith('/art/generic-refresh-v1/')).map(option=>({key:option.id,domain:'character',label:option.label!,src:option.src,cell:0,columns:1,rows:1})),
  ...GENERIC_HUMAN_VARIANTS.map(option=>({key:option.id,domain:'character',label:option.label!,src:option.src,cell:0,columns:1,rows:1})),
  {key:'item.seal-platform.closed',domain:'item',label:'封神台·封存',src:'/art/opening-devices/seal-platform-closed.webp',cell:0,columns:1,rows:1},
  {key:'item.seal-platform.open',domain:'item',label:'封神台·开启',src:'/art/opening-devices/seal-platform-open.webp',cell:0,columns:1,rows:1},
  {key:'preset.restraint.seal-platform',domain:'item',label:'封神台式囚锁',src:'/art/opening-devices/seal-platform-lock.webp',cell:0,columns:1,rows:1},
  {key:'preset.water-pouch',domain:'item',label:'软皮水囊',src:'/art/presets-v26/towers-and-water.webp',cell:2,columns:3,rows:1,inset:.012},
  ...['comb-tail-serpent','glass-wing-moth','ice-crane','tide-gull','clear-water-lotus','soul-lantern-spirit','granite-puppet','thunder-cloud-spirit','mirror-mist-spirit','dawn-crystal-spirit','wind-falcon','ink-octopus'].map((id,cell)=>({key:'preset.beast.'+id,domain:'beast',label:['梳尾羽蛇','琉翼蛾','冰羽鹤','潮汐鸥','清潭水莲','魂灯灵','花岗岩傀儡','雷云灵','镜雾灵','晨曦晶灵','逐风隼','墨涡八腕'][cell],src:'/art/presets-v26/beasts.webp',cell,columns:4,rows:3,inset:.012})),
  ...['ankles','sinking-wrists','quicksand-ankles','tether','net','cuffs','gag'].map((id,cell)=>({key:'preset.restraint.'+id,domain:'item',label:['短链足铐','沉星腕环','流沙足环','扣腕牵绳','钢环束网','玄铁拘束铐','禁声束具'][cell],src:'/art/presets-v26/restraints.webp',cell,columns:4,rows:2,inset:.012})),
  {key:'preset.restraint.slime-suit',domain:'item',label:'绝望女神套装·衣装示意',src:'/art/fantasy-v4/equipment-b.png',cell:1,columns:2,rows:2,inset:.025},
  ...['frost-jaw','wind-falcon','iron-horn','moon-antler','stone-bear','shadow-panther','thunder-beetle','water-lotus','silver-fox','ink-octopus','soul-serpent','gold-horse'].map((id,cell)=>({key:'preset.bone.'+id,domain:'item',label:['霜颚海鲨右臂骨','逐风隼左腿骨','铁角荒牛右腿骨','月角灵鹿头骨','石背棕熊躯干骨','影斑夜豹左臂骨','雷纹甲虫右臂骨','清潭水莲躯干骨','银耳心狐头骨','墨涡八腕外附骨','银蜕魂蛇左臂骨','金鬃风驹右腿骨'][cell],src:'/art/presets-v26/bones.webp',cell,columns:4,rows:3,inset:.012})),
  ...['ice-jade-scorpion','light-goddess-butterfly','shackle-chain','woodland-bow','patrol-shield','clear-wave-lotus','healing-staff','trail-hound','forge-hammer','iron-spear','sea-bird','moon-mirror'].map((id,cell)=>({key:'preset.soul.'+id,domain:'spirit',label:['冰碧帝皇蝎','光明女神蝶','缚星锁链','林野长弓','巡卫盾','清波莲','愈伤杖','寻踪灵犬','锻造锤','铁锋枪','海翎鸟','月镜'][cell],src:'/art/presets-v26/souls-2.webp',cell,columns:4,rows:3,inset:.012})),
    ...['blue-silver-grass','blue-silver-emperor','clear-sky-hammer','white-tiger','nether-cat','soft-bone-rabbit','evil-fire-phoenix','six-winged-angel','blue-lightning-dragon','seven-treasure-tower','nine-treasure-tower','sausage','nine-heart-begonia','jade-phosphor-snake','luo-san-pao','spirit-eyes'].map((id,cell)=>({key:'preset.soul.'+id,domain:'spirit',label:['蓝银草','蓝银皇','昊天锤','白虎','幽冥灵猫','柔骨兔','邪火凤凰','六翼天使','蓝电霸王龙','七宝琉璃塔','九宝琉璃塔','香肠','九心海棠','碧磷蛇','罗三炮','灵眸'][cell],src:'/art/presets-v26/souls-1.webp',cell,columns:4,rows:4,inset:.012})).filter(entry=>entry.key!=='preset.soul.nine-heart-begonia'&&!globalThis.SoulCanonicalWomenContent.PROFILES.some((p:any)=>p.SOUL.artId===entry.key)),
  ...['arc-launcher','penetrator','tide-projector','soul-suppressor'].map((id,cell)=>({key:'preset.'+id,domain:'item',label:['玄弧魂导枪','玄钢破阵炮','潮弧魂导枪','锁脉魂导扣'][cell],src:'/art/presets-v26/devices.webp',cell,columns:2,rows:2,inset:.006})),
  {key:'preset.soul-sealing-collar',domain:'item',label:'禁魂项圈',src:'/art/presets-v26/soul-sealing-collar.webp',cell:0,columns:1,rows:1},
  {key:'player.traveler-female-teen-v3',domain:'character',label:'启程少女',src:'/art/player-travelers-v3/female-teen-proportions-v2.webp',cell:0,columns:1,rows:1},
  {key:'player.traveler-male-teen-v3',domain:'character',label:'启程少年',src:'/art/player-travelers-v3/male-teen.webp',cell:0,columns:1,rows:1},
  {key:'player.child-male-v1',domain:'character',label:'青衫男童',src:'/art/player-children-v1/male.webp',cell:0,columns:1,rows:1},
  {key:'player.child-female-v1',domain:'character',label:'蓝衫女童',src:'/art/player-children-v1/female.webp',cell:0,columns:1,rows:1},
  {
    "key": "opening.asura",
    "domain": "opening",
    "label": "修罗神恩赐",
    "src": "/art/opening-boons/asura.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.rakshasa",
    "domain": "opening",
    "label": "罗刹神恩赐",
    "src": "/art/opening-boons/rakshasa.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.sea",
    "domain": "opening",
    "label": "海神恩赐",
    "src": "/art/opening-boons/sea.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.angel",
    "domain": "opening",
    "label": "天使神恩赐",
    "src": "/art/opening-boons/angel.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.nine-color",
    "domain": "opening",
    "label": "九彩玄女恩赐",
    "src": "/art/opening-boons/nine-color.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.food",
    "domain": "opening",
    "label": "食神恩赐",
    "src": "/art/opening-boons/food.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.azure-python",
    "domain": "opening",
    "label": "大明·天青牛蟒恩赐",
    "src": "/art/opening-boons/azure-python.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.titan-ape",
    "domain": "opening",
    "label": "二明·泰坦巨猿恩赐",
    "src": "/art/opening-boons/titan-ape.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.soft-rabbit",
    "domain": "opening",
    "label": "柔骨兔恩赐",
    "src": "/art/opening-boons/soft-rabbit.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.blue-silver-emperor",
    "domain": "opening",
    "label": "蓝银皇恩赐",
    "src": "/art/opening-boons/blue-silver-emperor.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.dream-iceworm",
    "domain": "opening",
    "label": "天梦冰蚕恩赐",
    "src": "/art/opening-boons/dream-iceworm.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.deep-sea-whale",
    "domain": "opening",
    "label": "深海魔鲸王恩赐",
    "src": "/art/opening-boons/deep-sea-whale.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.bone-asura",
    "domain": "opening",
    "label": "修罗神恩赐魂骨",
    "src": "/art/opening-boons/bone-asura.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.bone-rakshasa",
    "domain": "opening",
    "label": "罗刹神恩赐魂骨",
    "src": "/art/opening-boons/bone-rakshasa.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.bone-sea",
    "domain": "opening",
    "label": "海神恩赐魂骨",
    "src": "/art/opening-boons/bone-sea.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.bone-angel",
    "domain": "opening",
    "label": "天使神恩赐魂骨",
    "src": "/art/opening-boons/bone-angel.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.bone-nine-color",
    "domain": "opening",
    "label": "九彩玄女恩赐魂骨",
    "src": "/art/opening-boons/bone-nine-color.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.bone-food",
    "domain": "opening",
    "label": "食神恩赐魂骨",
    "src": "/art/opening-boons/bone-food.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.bone-azure-python",
    "domain": "opening",
    "label": "大明·天青牛蟒恩赐魂骨",
    "src": "/art/opening-boons/bone-azure-python.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.bone-titan-ape",
    "domain": "opening",
    "label": "二明·泰坦巨猿恩赐魂骨",
    "src": "/art/opening-boons/bone-titan-ape.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.bone-soft-rabbit",
    "domain": "opening",
    "label": "柔骨兔恩赐魂骨",
    "src": "/art/opening-boons/bone-soft-rabbit.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.bone-blue-silver-emperor",
    "domain": "opening",
    "label": "蓝银皇恩赐魂骨",
    "src": "/art/opening-boons/bone-blue-silver-emperor.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.bone-dream-iceworm",
    "domain": "opening",
    "label": "天梦冰蚕恩赐魂骨",
    "src": "/art/opening-boons/bone-dream-iceworm.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.bone-deep-sea-whale",
    "domain": "opening",
    "label": "深海魔鲸王恩赐魂骨",
    "src": "/art/opening-boons/bone-deep-sea-whale.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.boon-ring",
    "domain": "opening",
    "label": "恩赐魂环",
    "src": "/art/opening-boons/boon-ring.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.boon-bone",
    "domain": "opening",
    "label": "恩赐魂骨",
    "src": "/art/opening-boons/boon-bone.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.starter-supplies",
    "domain": "opening",
    "label": "启程补给",
    "src": "/art/opening-boons/starter-supplies.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.attack",
    "domain": "opening",
    "label": "铜纹护腕",
    "src": "/art/opening-boons/attack.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.defense",
    "domain": "opening",
    "label": "青玉坠",
    "src": "/art/opening-boons/defense.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.strength",
    "domain": "opening",
    "label": "劲力丹",
    "src": "/art/opening-boons/strength.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.agility",
    "domain": "opening",
    "label": "轻身丹",
    "src": "/art/opening-boons/agility.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  },
  {
    "key": "opening.vitality",
    "domain": "opening",
    "label": "固元丹",
    "src": "/art/opening-boons/vitality.webp",
    "cell": 0,
    "columns": 1,
    "rows": 1
  }
];
