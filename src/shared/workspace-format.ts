import {saveCodec} from './save-codec';
import type {JsonValue} from '../runtime/contracts';
import {researchWorkspace} from '../runtime/research-workbench';
import {assertNoSecretShape} from '../runtime/storage';

const plain=(value:any)=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
/** Transport validation preserves unfinished choices; mechanical checks belong to the server. */
export function workspaceFormat(input:any,state:any):JsonValue|null {
  if(input===undefined||input===null)return null;
  if(!plain(input)||input.version!==(input.kind==='player-workbenches'?1:5))throw new Error('存档中的构想格式不受支持');
  if(JSON.stringify(input).length>8000000)throw new Error('存档中的构想超过保存容量，请精简后再保存');
  saveCodec.inspectJsonShape(input);assertNoSecretShape(input);
  if(input.kind==='player-workbenches'){
    if(!state?.角色?.已建立||!plain(input.drafts)||Object.keys(input.drafts).some(key=>key!=='research'))throw new Error('存档中的工坊构想与当前旅程不一致');
    const drafts:Record<string,any>={};
    if(input.drafts.research!==undefined){
      if(!plain(input.drafts.research)||!plain(input.drafts.research.selection))throw new Error('工坊选材记录不完整');
      drafts.research=researchWorkspace(input.drafts.research);
    }
    return {kind:'player-workbenches',version:1,drafts};
  }
  if(input.kind!==undefined||state?.角色?.已建立||![1,2,3,4].includes(input.step)||!plain(input.config))throw new Error('存档中的觉醒构想与当前旅程不一致');
  if(input.activeSoul!==undefined&&(!Number.isInteger(input.activeSoul)||input.activeSoul<0||input.activeSoul>2))throw new Error('觉醒编辑位置不完整');
  if(input.reserveSouls!==undefined&&(!Array.isArray(input.reserveSouls)||input.reserveSouls.length>3||!input.reserveSouls.every(plain)))throw new Error('预留武魂记录不完整');
  if(input.advisors!==undefined&&!plain(input.advisors))throw new Error('顾问讨论记录不完整');
  if(input.requests!==undefined&&(!plain(input.requests)||Object.values(input.requests).some(value=>typeof value!=='string')))throw new Error('顾问提问记录不完整');
  return structuredClone(input);
}
