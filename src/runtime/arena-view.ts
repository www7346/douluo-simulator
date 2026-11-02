import {rules} from '../rules';
import {playerText,skillName} from './player-text';
import {personVisualIdentity} from './visual-identity';

const PLACEMENTS:Record<string,string>={champion:'冠军',runner_up:'亚军',semifinalist:'四强',quarterfinalist:'八强',round_of_16:'十六强'};
const STATUS:Record<string,string>={ready:'待开赛','in-match':'对局进行中','between-rounds':'等待下一轮',completed:'本届已结束',failed:'本届已结束'};
const names=(items:any[],state:any)=>(items??[]).map(item=>playerText(typeof item==='string'?item:item.name,state,'')).filter(Boolean);

/** Existing duel receipts in reverse play order; reading never settles or awards anything. */
export function endgameRecordView(state:any,characterId:string) {
  const canonicalId=rules.arena.canonicalIdentityId(characterId);
  const history=(state?.终局挑战?.历史??[]).filter((entry:any)=>rules.arena.canonicalIdentityId(entry.characterId)===canonicalId)
    .map((entry:any,index:number)=>({id:entry.id,attempt:index+1,won:Boolean(entry.won),round:entry.round>0?entry.round:null})).reverse();
  const achievement=state?.终局挑战?.成就?.[canonicalId];
  return {history,latest:history[0]??null,bestRound:achievement?.bestRound>0?achievement.bestRound:null};
}

/** Read-only player views. Generation, eligibility, prizes and settlement stay in rules. */
export function competitionView(state:any,competition:any=state?.比赛?.当前) {
  if(!competition)return null;
  const participants=new Map<string,any>((competition.participants??[]).map((item:any)=>[item.id,item]));
  const sourceRounds=competition.bracket?.rounds??[];
  const rounds=sourceRounds.map((round:any,roundIndex:number)=>({
    id:round.id,label:playerText(round.label,state,'下一轮'),matches:(round.matches??[]).map((match:any,index:number)=>{
      const number=sourceRounds.slice(0,roundIndex).reduce((n:number,r:any)=>n+r.matches.length,0)+index+1;
      const nextMatch=sourceRounds[roundIndex+1]?.matches[Math.floor(index/2)];
      return {id:match.id,number,index,roundIndex,roundLabel:playerText(round.label,state),winnerId:match.winnerId,
        current:match.id===competition.activePlayerMatchId,resolved:match.status==='completed',
        status:match.status==='completed'?'已结束':competition.match?.bracketMatchId===match.id?'比赛中':'待开赛',
        next:nextMatch?{id:nextMatch.id,slot:index%2}:null,
        players:(match.participantIds??[]).map((id:string,slot:number)=>{
          const participant=participants.get(id),source=sourceRounds[roundIndex-1]?.matches[index*2+slot];
          const person=state?.人物?.列表?.[participant?.personId??participant?.characterId]??state?.人物?.列表?.[participant?.unitId]??(participant?.temporaryRecord?.worldPersona?{id:participant.temporaryRecord.id,...participant.temporaryRecord.worldPersona,扩展:participant.temporaryRecord.visualIdentity}:null);
          const sourceNumber=source?sourceRounds.slice(0,roundIndex-1).reduce((n:number,r:any)=>n+r.matches.length,0)+index*2+slot+1:null;
          return {id,name:id?playerText(participant?.name,state,'参赛魂师'):source?.status==='completed'?'无人晋级':'TBD 待定',level:participant?.level??null,
            kind:participant?.kind??'',characterId:participant?.characterId??'',archetype:participant?.archetype??'',temporaryRecordId:participant?.temporaryRecord?.id??'',
            ...(person?{gender:person.gender,age:person.age,occupation:person.occupation,扩展:personVisualIdentity(person)}:{}),
            soul:playerText(participant?.martialSoulName,state,''),waiting:!id,sourceMatchId:source?.id??'',sourceLabel:sourceNumber?`第${sourceNumber}场胜者`:'等待抽签',
            isPlayer:id==='participant-player',won:Boolean(id&&id===match.winnerId),lost:Boolean(id&&match.status==='completed'&&id!==match.winnerId)};
        })};
    }),
  }));
  const current=rounds.flatMap((round:any)=>round.matches.map((match:any)=>({...match,roundLabel:round.label}))).find((match:any)=>match.current);
  const reward=competition.reward;
  return {id:competition.id,name:playerText(competition.venueName,state,'斗魂赛'),division:playerText(competition.division?.label,state,'当前等级组'),
    status:STATUS[competition.status]??'等待赛事安排',complete:['completed','failed'].includes(competition.status),
    canContinue:['ready','between-rounds'].includes(competition.status),inMatch:Boolean(competition.match),wins:competition.wins??0,
    placement:PLACEMENTS[competition.placement]??'尚未决出名次',champion:playerText(participants.get(competition.championParticipantId)?.name,state,competition.status==='completed'?'冠军空缺':'TBD 待定'),rounds,current,
    rewardPreviews:Object.entries(competition.rewardPools??{}).map(([placement,pool]:[string,any])=>({...rules.arena.competitionRewardAmounts(state,competition,placement,pool.previousClaimedFactor),placement:PLACEMENTS[placement]??placement,
      newReward:pool.factor>0,items:(pool.draws??[]).map((draw:any)=>({kind:draw.kind,name:playerText(draw.label,state).replace('魂环源凭证','魂环'),years:draw.kind==='ring-source'||draw.kind==='soul-bone'?pool.ringYears:null}))})),
    reward:reward?{gold:reward.gold??0,experience:reward.experience??0,newBest:Boolean(reward.newBest),
      items:(reward.itemIds??[]).map((id:string)=>({id,name:playerText(state?.物品?.实例?.[id]?.name??state?.物品?.实例?.[id]?.名称,state,'赛事奖品')})),
      materialKinds:(reward.materialBatches??[]).length}:null};
}

/** Lightweight identity list; detailed equipment, skills and duel quotes are requested separately. */
function publicCharacter(state:any,view:any,unitId:string,record?:any){
 if(!view)return view;
 const viewer=state.角色?.主控单位ID,p=state.人物?.列表?.[unitId],r=p?rules.disguise.winner(state,unitId):null;
 const template=r?.template??(!p?record?.worldDisguise?.params?.伪装模板:null);
 if(unitId===viewer)return view;
 const appearance=p?rules.disguise.presentation(state,unitId,viewer):null,look=p?rules.disguise.viewPerson(state,p,viewer):null;
 if(!template)return appearance?{...view,name:appearance.name}:view;
 return {...view,...(appearance?.detected?{disguiseDetected:true}:{}),name:appearance?.name??template.公开名??view.name,gender:appearance?.gender??(template.公开性别==='不变'?view.gender:template.公开性别??view.gender),soul:appearance?.martialSoul??template.武魂表象??'尚未显露',identity:template.公开身份??view.identity,
  ...(appearance?.auraHidden||!p&&record?.worldDisguise?.params?.掩饰魂息?{level:null}:{}),ringSummary:null,skills:[],bones:[],equipment:[],扩展:look?personVisualIdentity(look):{...view.扩展,...(template.立绘?{currentFigure:template.立绘,currentAvatar:template.头像??template.立绘}:{})}};
}

export function characterSummary(state:any,id:string) {
  const unit=state?.战斗单位?.列表?.[id];
  const source=unit?.扩展?.持久人物&&rules.arena.persistentCharacterId(unit.扩展.角色库ID)===id?unit.扩展.角色库ID:null;
  const record=rules.arena.worldCharacterRecord(id,state)??rules.arena.worldCharacterRecord(source,state);
  const persistent=record&&state?.人物?.列表?.[rules.arena.persistentCharacterId(record.id)];
  const person=persistent??(record?{...record,locationId:rules.arena.worldCharacterLocation(state,record.id)}:state?.人物?.列表?.[id]);
  if(!person)return null;
  const unitId=person.combatantId||person.unitId||person.id,growth=state?.成长?.列表?.[unitId];
  const souls=persistent||!record?(growth?.武魂ID列表??[]).map((soulId:string)=>state?.武魂?.列表?.[soulId]?.名称).filter(Boolean):record.martialSouls??[];
  return publicCharacter(state,{id,canonicalId:record?.id??unit?.扩展?.角色库ID??person.扩展?.角色库ID,canonical:Boolean(record),kind:record?.kind??'resident',
    name:playerText(person.name,state,'此地旅人'),locationId:person.locationId,locationName:rules.interiorSpaces.membership(state,person.id)?.space.name??playerText(state?.地图?.地点?.[person.locationId]?.name,state,'尚未发现的地点'),
    period:playerText(record?.periodLabel,state,record?'斗罗纪行':'此地居民'),level:persistent||!record?growth?.魂力等级??state?.战斗单位?.列表?.[unitId]?.派生?.有效等级??0:record.level,
    faction:playerText(person.faction??person.occupation??person.identity,state,'旅人'),gender:person.gender,age:person.age,archetype:person.扩展?.archetypeId,occupation:person.occupation,扩展:personVisualIdentity(person),
    soul:names(souls,state).join(' / ')||playerText(record?.soul,state,record?.kind==='soul-beast'?'魂兽':'尚无武魂记载')},unitId,record);
}

export function characterView(state:any,id:string) {
  const unit=state?.战斗单位?.列表?.[id];
  const source=unit?.扩展?.持久人物&&rules.arena.persistentCharacterId(unit.扩展.角色库ID)===id?unit.扩展.角色库ID:null;
  const record=rules.arena.worldCharacterRecord(id,state)??rules.arena.worldCharacterRecord(source,state);
  const persistent=record&&state?.人物?.列表?.[rules.arena.persistentCharacterId(record.id)];
  const live=characterRecordView(state,persistent?.id??id);
  if(!live)return null;
  const view=persistent?{...live,id,canonical:true,period:playerText(record.periodLabel,state,'斗罗纪行'),identity:playerText(record.identity?.relationLabel,state,''),spar:Boolean(rules.arena.sparCharacterRecord(state,id)?.sparEligible),sparExperience:rules.arena.previewSparExperience(state,id),endgame:Boolean(record.endgame),endgameId:record.endgameEntryId??'',kind:record.kind}:live;
  return publicCharacter(state,{...view,sparAvailability:rules.arena.previewSparAvailability(state,id)},persistent?.id??id,record);
}
export function historicalCharacterView(state:any,id:string) {
 const view=characterRecordView(state,id,true);
 return view?{...view,historical:true,spar:false,locationName:'历史投影',sparAvailability:{available:false,reason:null}}:null;
}
function characterRecordView(state:any,id:string,historical=false) {
  const record=historical?rules.arena.CHARACTER_CATALOG[id]:rules.arena.worldCharacterRecord(id,state);
  const person=record?{...record,locationId:historical?record.locationId:rules.arena.worldCharacterLocation(state,id)}:state?.人物?.列表?.[id];
  if(!person)return null;
  const unitId=person.combatantId||person.unitId||id,unit=state?.战斗单位?.列表?.[unitId];
  const souls=!record?(Object.values(state?.武魂?.列表??{}) as any[]).filter(soul=>soul.持有者单位ID===unitId):[];
  const skills=!record?(Object.values(state?.技能?.列表??{}) as any[]).filter(skill=>skill.持有者单位ID===unitId):[];
  const carried=!record?(Object.values(state?.物品?.实例??{}) as any[]).filter(item=>rules.world.isCarriedItem(state,item,id)):[];
  const integratedBoneIds=Object.values(state?.装备?.配置?.[unitId]?.soulBoneSlots??{});
  const bones=!record?(Object.values(state?.物品?.实例??{}) as any[]).filter(item=>item.type==='魂骨'&&(carried.includes(item)||item.ownerEntityId===unitId&&item.boundToEntityId===unitId&&item.扩展?.integrated&&integratedBoneIds.includes(item.id))):[];
  return {id,canonicalId:record?.id??unit?.扩展?.角色库ID??person.扩展?.角色库ID,name:playerText(person.name,state,'此地旅人'),locationId:person.locationId,
    locationName:rules.interiorSpaces.membership(state,person.id)?.space.name??playerText(state?.地图?.地点?.[person.locationId]?.name,state,'尚未发现的地点'),
    period:playerText(record?.periodLabel,state,record?'斗罗纪行':'此地居民'),level:record?.level??state?.成长?.列表?.[unitId]?.魂力等级??unit?.派生?.有效等级??0,
    gender:person.gender,age:person.age,archetype:person.扩展?.archetypeId,occupation:person.occupation,扩展:personVisualIdentity(person),battleCapable:record?Boolean(record.battleCapable):Boolean(unit),
    faction:playerText(person.faction??person.occupation??person.identity,state,'旅人'),
    ringSummary:!record?souls.map(soul=>({name:soul.名称,count:soul.魂环ID列表.filter((id:string)=>!!state.魂环.列表[id]).length})):null,
    soul:names(record?.martialSouls??souls.map(soul=>soul.名称),state).join(' / ')||playerText(record?.soul,state,record?.kind==='soul-beast'?'魂兽':'尚无武魂记载'),
    skills:names(record?.knownSkillNames??skills.filter(skill=>skill.来源魂环ID).map(skill=>skillName(skill,state)),state),bones:names(record?.soulBones??bones,state),equipment:names(record?.equipment??carried.filter(item=>item.type!=='魂骨'),state),
    identity:playerText(record?.identity?.relationLabel,state,''),spar:Boolean(rules.arena.sparCharacterRecord(state,id)?.sparEligible),sparExperience:rules.arena.previewSparExperience(state,id),endgame:Boolean(record?.endgame),
    endgameId:record?.endgameEntryId??'',canonical:Boolean(record),kind:record?.kind??'resident'};
}

export function destinationView(state:any,locationId:string,mode='balanced') {
  const location=state?.地图?.地点?.[locationId]??rules.world.LOCATION_TEMPLATES[locationId];
  const access=rules.world.locationAccess(state,locationId);
  const atLocation=state?.地图?.当前地点ID===locationId;
  const block=rules.world.worldActionBlockReason(state);
  let quote:any=null,error='';
  if(!atLocation&&access.pass&&!block){try{quote=rules.world.previewIntent(state,{type:'travel',destinationId:locationId,mode});}catch(cause){error=playerText((cause as Error).message,state,'当前无法规划前往此地的路线');}}
  const guidance=(access.guidance??[]).flatMap((entry:any)=>(entry.sources??[]).filter((source:any)=>source.eventId).map((source:any)=>({
    locationId:source.locationId,eventId:source.eventId,locationName:playerText(state?.地图?.地点?.[source.locationId]?.name,state,'线索地点'),
    eventName:playerText(rules.world.previewWorldEvent(state,source.eventId)?.name,state,'探访当地见闻'),
  })));
  return {locationId,name:playerText(location?.name,state,'目的地'),atLocation,quote,guidance,
    reasons:[...(block?[playerText(block,state)]:[]),...access.reasons.map((reason:string)=>playerText(reason,state)),...(error?[error]:[])],
    canTravel:!atLocation&&!block&&access.pass&&Boolean(quote?.affordable)};
}
