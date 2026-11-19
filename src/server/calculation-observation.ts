import {WORLD_INTENT_TYPES} from './world-intent-types';
// Diagnostic labels only. Unknown player-controlled strings never enter logs.
const intents:ReadonlySet<string>=new Set(WORLD_INTENT_TYPES);
export const CALCULATION_STAGES=['command.prepare','command.execute','command.settle','command.follow-up','command.validation','command.receipt','command.snapshot','command.generation-check','command.delta','command.commit'] as const;
export type CalculationStage=typeof CALCULATION_STAGES[number];
const numberKeys=['prepareMs','executeMs','generationCheckMs','deltaMs','totalMs','snapshotBytes','unitCount','skillCount','beastCount','itemCount','restoreMs','restoreCacheHit','readCacheHit','generationProbeCacheHit','generationProbeBytes','baseRetentionCheckMs','baseRetained','sliceInspectMs','sliceDecodeMs','sliceEncodeMs','sliceHashMs'];
export function calculationNumbers(value:any):Record<string,number>{
 const out:Record<string,number>={};
 for(const key of numberKeys)if(typeof value?.[key]==='number'&&Number.isFinite(value[key])&&value[key]>=0&&value[key]<=Number.MAX_SAFE_INTEGER)out[key]=value[key];
 return out;
}
export function worldIntentLabel(type:unknown):string|undefined{return typeof type==='string'&&intents.has(type)?type:undefined;}
