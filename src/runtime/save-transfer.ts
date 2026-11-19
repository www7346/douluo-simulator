import { rules } from '../rules';
import type { GameSnapshot,JsonValue } from './contracts';
import {normalizePlayerWorkspace} from './player-workspace';
import {validateCurrentState} from './current-state';

import {exportFullSave,readFullSaveBundle,type FullSaveBundle} from '../shared/save-bundle';
export {exportFullSave};
export type {FullSaveBundle};

export function importFullSaveBundle(input:string):FullSaveBundle {
  const bundle=readFullSaveBundle(input);
  bundle.snapshot.state=validateCurrentState(bundle.snapshot.state);
  bundle.workspace=normalizePlayerWorkspace(bundle.workspace,bundle.snapshot.state);
  if(bundle.battleReplay){
    bundle.battleReplay.snapshot.state=validateCurrentState(bundle.battleReplay.snapshot.state);
    bundle.battleReplay.workspace=normalizePlayerWorkspace(bundle.battleReplay.workspace,bundle.battleReplay.snapshot.state);
  }
  return bundle;
}

export function importFullSave(input: string): GameSnapshot {
  return importFullSaveBundle(input).snapshot;
}

export function exportCharacterConfig(draft: Record<string, unknown>): string {
  return rules.transfer.stringifyEnvelope(rules.transfer.createCharacterCreationConfig(draft, {
    rulesetVersion: rules.foundation.VERSION,
  }));
}

export function importCharacterConfig(input: string): Record<string, unknown> {
  const payload=rules.transfer.parseEnvelope(input, {
    expectedKinds: [rules.transfer.KINDS.character],
    rulesetVersion: rules.foundation.VERSION,
  }).payload;
  for(const soul of payload.martialSoulDrafts??[])checkImportedSoul(soul);
  const validation=rules.world.validateCreationDraft(payload);
  if(!validation.pass)throw new Error(validation.errors.join('；'));
  return payload;
}

export function exportMartialSoulConfig(soul: Record<string, unknown>): string {
  return rules.transfer.stringifyEnvelope(rules.transfer.createMartialSoulConfig(soul, {
    rulesetVersion: rules.foundation.VERSION,
  }));
}

export function importMartialSoulConfig(input: string): Record<string, unknown> {
  const soul=rules.transfer.parseEnvelope(input, {
    expectedKinds: [rules.transfer.KINDS.martialSoul],
    rulesetVersion: rules.foundation.VERSION,
  }).payload;
  checkImportedSoul(soul);
  return soul;
}

function checkImportedSoul(soul:any){
  if(soul?.baseAction?.mode==='disguise'&&!soul.baseAction.disguise?.伪装模板){
    throw new Error('这份武魂方案缺少伪装外貌设置，请从原角色重新导出武魂后再导入');
  }
}
