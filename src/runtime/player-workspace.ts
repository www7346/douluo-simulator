import type {JsonValue} from './contracts';
import {workspaceFormat} from '../shared/workspace-format';
import {validateCreationWorkspace} from './creation-workbench';

/** Server validation adds rule checks to the shared, current file format. */
export function normalizePlayerWorkspace(input:any,state:any):JsonValue|null {
  const formatted=workspaceFormat(input,state) as any;
  return !formatted||formatted.kind==='player-workbenches'?formatted:validateCreationWorkspace(formatted) as JsonValue;
}
