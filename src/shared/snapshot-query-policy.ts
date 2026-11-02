export const CHARACTER_SHEET_SECTIONS = ['status', 'abilities', 'bones', 'equipment', 'title', 'talents'] as const;
export type CharacterSheetSection = typeof CHARACTER_SHEET_SECTIONS[number];
export function isCharacterSheetSection(value: unknown): value is CharacterSheetSection {
 return CHARACTER_SHEET_SECTIONS.some(section => section === value);
}

/** Explicit, bounded, engine-free queries over one committed snapshot. Adding
 * an entry requires frozen-input, audience and pending-receipt purity tests. */
export function concurrentSnapshotQuery(name:unknown,input:unknown):boolean {
 if(!input||typeof input!=='object'||Array.isArray(input))return false;
 const prototype=Object.getPrototypeOf(input);if(prototype!==Object.prototype&&prototype!==null)return false;
 const fields=Reflect.ownKeys(input);if(fields.some(key=>typeof key!=='string'||!Object.hasOwn(Object.getOwnPropertyDescriptor(input,key)??{},'value')))return false;
 const value=input as Record<string,unknown>;
 switch(name){
  case 'presentation.character':return fields.length === 0 || (fields.length === 1 && fields[0] === 'section' && isCharacterSheetSection(value.section));
  case 'world.people-work':return fields.every(key=>key==='revision'||key==='scope')&&Number.isSafeInteger(value.revision)&&Number(value.revision)>=0&&(value.scope===undefined||value.scope==='story');
  case 'battle.action-index':return fields.every(key=>key==='actorId')&&(value.actorId===undefined||typeof value.actorId==='string'&&value.actorId.length>0&&value.actorId.length<=200);
  case 'inventory.index':return fields.length===1&&fields[0]==='section'&&value.section==='summary';
  default:return false;
 }
}
