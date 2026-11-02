import {saveCodec} from './save-codec';
import type {GameSnapshot} from '../runtime/contracts';

export const SNAPSHOT_SCHEMA_VERSION = 19 as const;
export const READ_ONLY_SAVE_MESSAGE = '这是旧版本存档，仅可查看和导出备份。请开启新的 2.10.0 故事';

/** Check every version stamp before normalization, session creation or any write. */
export function isCurrentSnapshot(input:unknown):input is GameSnapshot {
  const snapshot=input as any,state=snapshot?.state;
  return snapshot?.schemaVersion===SNAPSHOT_SCHEMA_VERSION
    &&snapshot.rulesetVersion===saveCodec.VERSION
    &&state?.系统?.schema_version===saveCodec.VERSION
    &&state.系统.ruleset_version===saveCodec.VERSION;
}

export function assertCurrentSnapshot(input:unknown):asserts input is GameSnapshot {
  if(!isCurrentSnapshot(input))throw new Error(READ_ONLY_SAVE_MESSAGE);
}
