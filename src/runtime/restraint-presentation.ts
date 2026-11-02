import {rules} from '../rules';
import {effectProse} from './effect-prose';

/** Wording for worn devices; the supplied parameters still come from the rules. */
export function restraintEffectLines(id:string,p:Record<string,any>,state:any={}):string[]{
  if(id==='status.limb_bind'){
    const part=p.部位??'全身',pose=p.姿态&&part!=='全身'?`（${p.姿态}）`:'',layers=p.层数??1;
    const action=part==='双手'?'无法做手部动作或操作物品':part==='双腿'?'无法自行行走':'无法做手部动作或自行行走';
    return [`${part}被束缚${pose}，${action}`,`共${layers}层，可用${p.挣脱属性??'力量'}尝试挣脱，每次成功解除一层${Number(p.挣脱难度加值)>0?`；后续挣脱难度增加${p.挣脱难度加值}`:''}`];
  }
  if(id==='status.mute')return ['无法发声，也无法使用需要发声的能力'];
  if(id==='status.power_seal'){
    if(p.封印对象!=='精细'||!p.限制)return [({魂力:'无法使用魂力',武魂:'无法使用武魂',魂技:'无法施放魂技'} as Record<string,string>)[p.封印对象]??`封印${p.封印对象}`,p.范围==='当前武魂'?'只限制施加时的武魂':'限制全部对应能力'];
    const l=p.限制,permission=l.permission,rows:string[]=[];
    if(l.soulPowerPercent!==undefined)rows.push(`魂力开放 ${l.soulPowerPercent}%`);
    if(l.soulPowerPercent===0)rows.push('魂力完全封印，无法使用魂力');
    if(l.damagePercent!==undefined&&l.damagePercent<100)rows.push(`造成的伤害最多为原来的${l.damagePercent}%`);
    if(permission){
      const names:Record<string,string>={ordinary:'普通动作','martial-base':'武魂基础动作','soul-ring':'魂环能力','martial-skill':'武魂技能','soul-bone':'魂骨能力','native-origin':'天生能力',domain:'领域','soul-device':'魂导器能力',restraint:'拘束器能力',consumable:'消耗品','hidden-weapon':'暗器'};
      if(permission.allowedKinds)rows.push(permission.allowedKinds.length?`仅可使用${permission.allowedKinds.map((kind:string)=>names[kind]??'指定能力').join('、')}`:'所有能力均被封禁');
      if(permission.maxCastRank!==undefined&&permission.maxCastRank<9&&permission.allowedKinds?.includes('soul-ring')!==false)rows.push(permission.maxCastRank===0?'不能施放魂环能力':`魂环能力最高可施放至${permission.maxCastRank}环强度`);
      for(const [key,label,table,nameKey] of [['soulIds','武魂','武魂','名称'],['ringIds','魂环','魂环','序号'],['skillIds','技能','技能','name']] as const){
        if(permission[key]!==undefined){const ids=permission[key],found=ids.map((key:string)=>state?.[table]?.列表?.[key]?.[nameKey]);rows.push(ids.length?`限用${label}：${found.every(Boolean)?found.map((name:any)=>label==='魂环'?`第${name}环`:name).join('、'):`已选${ids.length}项`}`:`不能使用${label}`);}
      }
    }
    if(l.denyOrigins?.length)rows.push(`另有${l.denyOrigins.length}项指定能力被禁用`);
    return rows;
  }
  if(id==='status.buff')return [`${p.属性}${Number(p.数值)>0?' +':' '}${p.数值}`];
  if(id==='status.slow')return [`移动速度降低${p.数值}`];
  return effectProse(id,p,'',state);
}

export function restraintPresentation(contract:any,item?:any){
  // Preview and the real item share the current authored definition. Registered
  // catalogue references remain a separate, verified source.
  const authored=item?.payload?.backgroundRestraint??(contract?.version===2?contract:null);
  let actual=item;
  if(authored){
    const compiled=rules.backgroundRestraints.compile(authored.definition);
    if(rules.abilities.hash(compiled.contract)!==rules.abilities.hash(authored))throw Error('拘束器的制作设定与实际器具不一致');
    if(item&&item.templateId!==compiled.definition.templateId)throw Error('拘束器的制式与实际器具不一致');
    actual=item??{templateId:compiled.definition.templateId,payload:{backgroundRestraint:authored}};
  }else{
    const registered=rules.custody.DEVICES[contract?.templateId];
    if(!registered||contract.kind!=='registered-restraint'||contract.contractHash!==rules.abilities.hash(registered))throw Error('拘束器与登记制式不一致');
    actual=item??{templateId:contract.templateId};
  }
  const device=rules.custody.resolveDevice(actual),binding=actual.payload?.backgroundRestraint?.definition?.binding;
  const labels:Record<string,string>={locked:'锁定',escort:'押送',released:'解放',limited:'受限活动'};
  return {name:device.name,maxLevel:device.maxLevel,breakDifficulty:device.breakDifficulty+(binding?.difficultyBonus??0),capture:device.capture,autoRelock:!!device.autoRelock,
    modes:Object.keys(device.modes).map(id=>{
      const modeItem={...actual,attachment:{...actual.attachment,mode:id,...(id==='limited'?{limits:actual.attachment?.limits??authored?.definition?.limits}:{} )}};
      let specs=rules.custody.effectSpecs(modeItem,id);
      if(rules.host.definition(actual).capabilities.suppression&&id!=='released'){
        specs=specs.filter(([effectId]:any)=>effectId!=='status.power_seal');
        specs.push(['status.power_seal',{封印对象:'精细',范围:'全部',限制:rules.host.suppressionLimits(modeItem),持续方式:'来源有效',来源依赖:'道具有效'}]);
      }
      return {id,name:labels[id]??id,effects:[...new Set<string>(specs.map(([effectId,params]:any)=>restraintEffectLines(effectId,{...rules.effects.EFFECT_REGISTRY[effectId].parameterDefaults,...params}).join('；')))]};
    }),
    conditions:'佩戴且器具有效时，以下限制按当前模式生效。控制者靠近佩戴者后，可以调节模式。'};
}
