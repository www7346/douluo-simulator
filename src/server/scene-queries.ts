import {captivityFacts} from '../runtime/story-captivity';
import {rules} from '../rules';
import {CloudError} from '../cloud/protocol';
import {locationScene,locationLandscape} from '../web/scene-view';
import {characterView,characterSummary,competitionView,destinationView,endgameRecordView,historicalCharacterView} from '../runtime/arena-view';
import {captureBattleView} from '../runtime/player-presentation';
import {playerText} from '../runtime/player-text';
import {playSceneKind} from '../runtime/play-scene';
import {portraitCanonicalId} from '../runtime/visual-identity';
import {openingSceneFacts} from './opening-presentation';
import {custodyPresentation} from './custody-presentation';
import {competitionRewards} from './competition-rewards';
import {selfStatusPresentation} from './self-status-presentation';

const venues=()=>Object.values(rules.arena.COMPETITION_VENUES).map((v:any)=>({id:v.id,name:v.name,locationId:v.locationId,description:v.description}));
const modes=()=>Object.fromEntries(Object.entries(rules.world.PATH_MODES).map(([id,v]:[string,any])=>[id,{name:v.name}]));
function dungeonOptions(dungeons:any[]){return dungeons.map((d:any)=>({id:d.id,name:d.name,summary:d.summary,locationId:d.locationId,difficultyIds:d.difficultyIds,
    difficulties:Object.fromEntries(d.difficultyIds.map((id:string)=>{const v=rules.expedition.DIFFICULTIES[id];return [id,{id,name:v.name,recommendedLevelMin:v.recommendedLevelMin,recommendedLevelMax:v.recommendedLevelMax,routeLayers:v.routeLayers}];}))}));}
function visibleScene(state:any,id:string) {
  const scene=locationScene(state,id);
  return {...scene,shops:scene.shops.map((v:any)=>({id:v.id,name:v.name})),service:scene.service?{id:scene.service.id,name:scene.service.name}:null,dungeons:dungeonOptions(scene.dungeons),
    venues:venues().filter(v=>v.locationId===id)};
}
function people(state:any,locationId?:string) {
  const canonical=(Object.values(rules.arena.CHARACTER_CATALOG) as any[]).filter(p=>!rules.arena.persistentCharacterConflict(state,p.id)&&(!p.sourcePolicy||rules.canonicalGrowth.enabled(state,p.sourcePolicy.sourceId))),ids=new Set(canonical.map(p=>rules.arena.worldCharacterIdentityId(p.id)));
  return [...canonical,...(Object.values(state?.人物?.列表??{}) as any[]).filter(p=>{
    const source=portraitCanonicalId({...p,canonicalId:state?.战斗单位?.列表?.[p.combatantId??p.id]?.扩展?.角色库ID});
    return p.id!==state?.角色?.主控单位ID&&p.status!=='dead'&&(!source||!ids.has(rules.arena.worldCharacterIdentityId(source)));
  })].filter(p=>{const actual=state.人物.列表[p.id]??state.人物.列表[rules.arena.persistentCharacterId(p.id)];return !actual||!rules.interiorSpaces.membership(state,actual.id)&&(!locationId||state.人物.列表[state.角色.主控单位ID]?.locationId!==locationId||rules.actions.colocated(state,state.角色.主控单位ID,actual.id));}).filter(p=>!locationId||(rules.arena.worldCharacterRecord(p.id,state)?rules.arena.worldCharacterLocation(state,p.id):p.locationId)===locationId).map(p=>characterSummary(state,p.id)).filter(Boolean);
}

/** Only rendered facts cross this boundary; access, movement and eligibility use the original rules. */
export function sceneQuery(state:any,name:string,input:Record<string,any>):unknown {
  const currentId=state?.地图?.当前地点ID,playerId=state?.角色?.主控单位ID;
  switch(name) {
    case 'scene.opening':return openingSceneFacts(state);
    case 'scene.daily':return {captivity:captivityFacts(state),npcRequests:rules.world.npcRequestOptions(state),cultivation:rules.world.cultivationFacts(state),longActions:rules.world.longActionFacts(state)};
    case 'scene.control-options':{
      if(typeof input.executorId!=='string'||!input.executorId||typeof input.actionType!=='string')throw new CloudError('invalid-query','请选择执行者与行动');
      return rules.world.fieldControlOptions(state,playerId,{selectedExecutorId:input.executorId,includeDestinations:input.actionType==='travel'});
    }
    case 'scene.custody':{if(input.scope!==undefined)return custodyPresentation(state,input);if(!Number.isInteger(input.section)||input.section<0||input.section>5||input.selectedPersonId!==undefined&&typeof input.selectedPersonId!=='string')throw new CloudError('invalid-query','请选择囚禁页面');return rules.world.custodyFacts(state,playerId,{section:input.section,selectedPersonId:input.selectedPersonId});}
    case 'scene.atlas':{
      const locations=Object.values(state?.地图?.地点??rules.world.LOCATION_TEMPLATES) as any[];
      const known=locations.filter(v=>rules.world.isLocationKnown(state,v.id));
      const mapOnly=input.scope==='map';
      return {...(mapOnly?{}:{captivity:captivityFacts(state),npcRequests:rules.world.npcRequestOptions(state),cultivation:rules.world.cultivationFacts(state),longActions:rules.world.longActionFacts(state)}),travelMembers:rules.world.partyMembers(state).filter((p:any)=>p.present&&p.allowTravel!==false).map((p:any)=>({id:p.personId,name:p.name,optional:p.basis==='voluntary'})),knownIds:known.map(v=>v.id),access:Object.fromEntries(known.map(v=>[v.id,rules.world.locationAccess(state,v.id)])),
        scenes:Object.fromEntries(known.map(v=>{
          if(!mapOnly)return [v.id,visibleScene(state,v.id)];
          const place=locationLandscape(state,v.id);return [v.id,{description:place.description,dungeons:dungeonOptions(place.dungeons)}];
        })),
        routePass:Object.fromEntries((Object.values(state?.地图?.路线??{}) as any[]).map(v=>[v.id,rules.world.routeAccess(state,v,v.to).pass])),
        block:rules.world.worldActionBlockReason(state),modes:modes()};
    }
    case 'scene.person':return input.scope==='historical-projection'?historicalCharacterView(state,String(input.characterId??'')):characterView(state,String(input.characterId??''));
    case 'scene.people':return {people:input.includePeople===false?[]:people(state,input.localOnly===true?currentId:undefined),block:rules.world.worldActionBlockReason(state),modes:modes(),slaughterLocationId:rules.arena.SLAUGHTER_ARENA.locationId};
    case 'scene.destination':return destinationView(state,String(input.locationId??''),String(input.mode??'balanced'));
    case 'scene.competition':{
      const allVenues=venues(),local=allVenues.find(v=>v.locationId===currentId),current=state?.比赛?.当前,history=state?.比赛?.历史??[];
      const active=current&&!['completed','failed'].includes(current.status);
      const entry=input.historyId?history.find((v:any)=>v.id===input.historyId):current&&(active||current.venueId===local?.id)?current:null;
      return {venues:allVenues,modes:modes(),local,entry,tournament:competitionView(state,entry??null),history:history.map((v:any)=>competitionView(state,v)),
        division:rules.arena.competitionDivisionForPlayer(state?.成长?.列表?.[playerId]?.魂力等级??0),block:rules.world.worldActionBlockReason(state),
        dossiers:Object.fromEntries((entry?.participants??[]).filter((p:any)=>p.kind==='canon'||p.kind==='resident').map((p:any)=>[p.characterId,characterView(state,p.characterId)]))};
    }
    case 'scene.competition-rewards':{
      const current=state?.比赛?.当前,history=state?.比赛?.历史??[];
      const entry=input.historyId?history.find((v:any)=>v.id===input.historyId):current;
      return competitionRewards(state,entry);
    }
    case 'scene.endgame':return rules.arena.ENDGAME_IDS.map((id:string)=>({id,preview:rules.arena.previewEndgameChallenge(state,id),person:historicalCharacterView(state,id),record:endgameRecordView(state,id)}));
    case 'scene.expedition':return {actions:rules.expedition.previewRoomActions(state),difficultyName:rules.expedition.DIFFICULTIES[state?.远征?.当前?.difficultyId]?.name??''};
    case 'scene.battle':{
      const actor=state?.战斗单位?.列表?.[state?.战斗?.当前行动单位ID];
      return {frame:captureBattleView(state),zones:rules.combat.ZONES,point:actor?rules.combat.unitPoint(actor):null,
        movement:actor?{walk:rules.combat.movementAllowance(state,actor,false).coordinateRadius,dash:rules.combat.movementAllowance(state,actor,true).coordinateRadius}:{walk:0,dash:0}};
    }
    case 'scene.play':{
      const dailyPendingCount=Number(!!rules.world.activeCaptivity(state))+rules.world.npcRequestFacts(state).filter((r:any)=>r.knownStatus==='open'&&!r.deadlinePassed).length+(state.世界.longActions??[]).filter((a:any)=>a.ownerId===playerId&&a.status==='interrupted').length;
      const stage=playSceneKind(state),room=state?.远征?.当前?.currentRoom,position=playerId?rules.actions.positionOf(state,playerId):null;
      let scene=visibleScene(state,currentId);
      if(stage==='world')scene={...scene,people:scene.people.filter(p=>!state.人物.列表[p.id]||rules.actions.communicationColocated(state,p.id,playerId)&&rules.actions.perception(state,playerId,p.id))};
      if(stage==='world'&&(position?.kind==='transit'||position?.sceneId))scene={...scene,location:{...scene.location,id:'',name:position.kind==='contained'?'封神台内':position.kind==='transit'?'旅途途中':'当前房间'},description:state.场景.地点,people:(Object.values(state.人物.列表) as any[]).filter(p=>p.id!==playerId&&rules.actions.communicationColocated(state,p.id,playerId)&&rules.actions.perception(state,playerId,p.id)).map(p=>{const record=characterSummary(state,p.id)!;return {id:p.id,name:record.name,detail:record.occupation||record.identity||record.faction,canonical:false};}),shops:[],service:null,dungeons:[],venues:[],canRest:false};
      const frame=stage==='battle'?captureBattleView(state):null,side=frame?.units.find(v=>v.id===playerId)?.sideId;
      const actors=['world','competition','slaughter'].includes(stage)?scene.people.map(p=>({...p,record:characterSummary(state,p.id),beast:null})):
        (frame?frame.units.filter(v=>v.sideId!==side):room?.roster??[]).map((v:any)=>{const id=v.unitId??v.id,beast=room?.roster?.find((b:any)=>b.unitId===id);
          return {id,name:playerText(v.name,state,'魂兽'),detail:beast?`${beast.lineage.grade.name}血脉 · ${beast.years}年 · ${beast.affinitySpectrum?.主属性?.join('、')??''}`:'当前对手',record:characterSummary(state,state.战斗单位.列表[id]?.扩展?.角色库ID??id),beast};});
      if(stage==='dungeon')for(const companion of state?.远征?.当前?.companions??[])if(companion.active)actors.unshift({id:companion.unitId,name:companion.name,detail:companion.kind==='guide'?'首次猎魂护航':'雇佣同伴',record:characterSummary(state,companion.characterId),beast:null});
      return {dailyPendingCount,scene,actors,selfStatus:selfStatusPresentation(state),custodyPendingCount:Object.values(rules.custody.table(state).defeats).filter((d:any)=>d.status==='pending'&&(d.targetId===playerId||d.eligibleActorIds.includes(playerId))).length,localEvents:stage==='world'&&position?.kind==='location'&&!position.sceneId?rules.world.listWorldEvents(state):[],block:rules.world.worldActionBlockReason(state),slaughterLocationId:rules.arena.SLAUGHTER_ARENA.locationId};
    }
    default:throw new CloudError('invalid-query','不支持这项场景查看操作');
  }
}
