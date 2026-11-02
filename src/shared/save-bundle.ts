import {assertCurrentSnapshot,SNAPSHOT_SCHEMA_VERSION} from './snapshot-version';
import {latestReplayBattleId} from './story-battles';
import {saveCodec} from './save-codec';
import {isSectionedSave,readSaveSections,writeSaveSections} from './save-sections';
import {workspaceFormat} from './workspace-format';
import {normalizeSoulImageRefs,type SoulImageRefs} from '../runtime/soul-images';
import type {GameSnapshot,JsonValue} from '../runtime/contracts';
import {checkedStoryHistory,type StoryArchiveEntry} from './story-archive';
import {encodeStoryArchiveFrames,decodeStoryArchiveFrames,inspectExpandedStoryArchiveEnvelope} from './story-archive-transport';

export interface FullSaveBundle {
  snapshot:GameSnapshot;
  attachments:Array<Record<string,any>>;
  workspace:JsonValue|null;
  soulImages:SoulImageRefs;
  storyHistory:StoryArchiveEntry[];
  battleReplay:FullSaveBundle|null;
}
function checkedSoulImages(value:unknown,attachments:any[]):SoulImageRefs {
  const refs=normalizeSoulImageRefs(value);
  for(const entry of Object.values(refs))if(entry.kind==='upload'&&!attachments.some(a=>a.kind==='soul-image'&&a.assetId===entry.assetId))throw new Error('存档缺少引用的武魂图片');
  return refs;
}
/** Entirely local: a saved world remains exportable while the API is unavailable. */
export function exportFullSave(snapshot:GameSnapshot,options:{playerName?:string;attachments?:unknown[];workspace?:JsonValue|null;soulImages?:SoulImageRefs;storyHistory?:StoryArchiveEntry[];battleReplay?:string|null}={}):string {
  assertCurrentSnapshot(snapshot);
  const workspace=workspaceFormat(options.workspace,snapshot.state);
  if(options.battleReplay)checkReplay(snapshot,readFullSaveBundle(options.battleReplay,false));
  const history=checkedStoryHistory(snapshot,options.storyHistory??[]);
  const base={rulesetVersion:snapshot.rulesetVersion,attachments:options.attachments,summary:{playerName:options.playerName??'未命名魂师',revision:snapshot.revision,savedAt:snapshot.savedAt,...(workspace?{playerWorkspace:workspace}:{}),soulImages:checkedSoulImages(options.soulImages,options.attachments??[])}};
  let estimated=options.battleReplay?.length??0;
  for(const entry of history){if(estimated>4*1024*1024)break;estimated+=JSON.stringify(entry).length;}
  if(estimated>4*1024*1024||isSectionedSave(options.battleReplay??''))return writeSaveSections(snapshot.state,base,history,options.battleReplay??null);
  const envelope=saveCodec.createFullSave(snapshot.state,{...base,summary:{...base.summary,storyHistory:encodeStoryArchiveFrames(history),battleReplay:options.battleReplay??null}});
  inspectExpandedStoryArchiveEnvelope(envelope);
  return saveCodec.stringifyEnvelope(envelope);
}
/** Decodes data only; callers must validate it remotely before activating/replacing a world. */
export function readFullSaveBundle(input:string,allowReplay=true):FullSaveBundle {
  const parts=isSectionedSave(input)?readSaveSections(input,allowReplay):null;
  const envelope=parts?.envelope??saveCodec.parseEnvelope(input,{expectedKinds:[saveCodec.KINDS.save],rulesetVersion:saveCodec.VERSION});
  if(!parts&&envelope.summary?.transferSections)throw Error('完整存档缺少后续分块');
  const state=envelope.payload;
  if(state?.系统?.schema_version!==saveCodec.VERSION||state.系统.ruleset_version!==saveCodec.VERSION||!Number.isSafeInteger(state.系统.revision)||state.系统.revision<0)throw new Error('这份存档格式不受支持，请使用当前版本的存档');
  const replay=parts?parts.replay:envelope.summary?.battleReplay;
  if(replay!=null&&(!allowReplay||typeof replay!=='string'))throw new Error('战前检查点格式无效或发生递归嵌套');
  const bundle:FullSaveBundle={
    snapshot:{schemaVersion:SNAPSHOT_SCHEMA_VERSION,rulesetVersion:saveCodec.VERSION,revision:state.系统.revision,savedAt:typeof envelope.summary?.savedAt==='string'&&Number.isFinite(Date.parse(envelope.summary.savedAt))?envelope.summary.savedAt:new Date().toISOString(),state},
    attachments:structuredClone(envelope.attachments??[]),workspace:workspaceFormat(envelope.summary?.playerWorkspace,state),
    soulImages:checkedSoulImages(envelope.summary?.soulImages,envelope.attachments??[]),
    storyHistory:checkedStoryHistory({state} as GameSnapshot,parts?.history??decodeStoryArchiveFrames(envelope)),
    battleReplay:replay==null?null:readFullSaveBundle(replay,false),
  };
  if(bundle.battleReplay)checkReplay(bundle.snapshot,bundle.battleReplay);
  return bundle;
}

function checkReplay(snapshot:GameSnapshot,replay:FullSaveBundle):void{
  const state=snapshot.state as any,opening=replay.snapshot.state as any;
  if(!latestReplayBattleId(state)||opening.战斗?.id!==latestReplayBattleId(state)||opening.战斗.状态!=='进行中'
    ||opening.角色?.主控单位ID!==state.角色?.主控单位ID||opening.世界?.seed!==state.世界?.seed
    ||replay.snapshot.revision>snapshot.revision)throw new Error('战前检查点与当前人物或遭遇不一致');
}
