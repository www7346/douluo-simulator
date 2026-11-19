import {artwork} from './art-catalog';
import type {AvatarRecord} from './storage';

export type SoulImageRef = {kind:'preset';key:string} | {kind:'upload';assetId:string};
export type SoulImageInput = {kind:'preset';key:string} | {kind:'upload';image:AvatarRecord};
export type SoulImageRefs = Record<string,SoulImageRef>;
export type SoulImageInputs = Record<string,SoulImageInput>;

// Creation and the permanent growth record use the same ordered 1–3 soul slots.
// Names, draft IDs, active soul and model proposals must not change this binding.
export function assertSoulImageSlot(slot:string):void {
  if(!/^[123]$/.test(slot))throw new Error('请选择第一、第二或第三武魂');
}
export const ringSkillImageSlot=(id:string)=>'skill:'+id;
export function assertCharacterImageSlot(slot:string):void{
  if(/^skill:[^\u0000-\u001f\u007f]{1,600}$/u.test(slot))return;
  assertSoulImageSlot(slot);
}
export function playerSoulImageSlot(state:any,soulId:string):string {
  const ids=state?.成长?.列表?.[state?.角色?.主控单位ID]?.武魂ID列表??[];
  const index=ids.indexOf(soulId);
  return index>=0&&index<3?String(index+1):'';
}
export function normalizeSoulImageRefs(input:unknown):SoulImageRefs {
  if(input===undefined||input===null)return {};
  if(typeof input!=='object'||Array.isArray(input))throw new Error('武魂图片配置不完整');
  const output:SoulImageRefs={};
  for(const [slot,entry] of Object.entries(input)){
    assertCharacterImageSlot(slot);
    if(entry?.kind==='preset'&&typeof entry.key==='string'&&artwork(entry.key).key!=='unknown')output[slot]={kind:'preset',key:entry.key};
    else if(entry?.kind==='upload'&&typeof entry.assetId==='string'&&/^(portrait-[a-f0-9]{64}|soul-image-[A-F0-9]{8}-\d{1,7})$/.test(entry.assetId))output[slot]={kind:'upload',assetId:entry.assetId};
    else throw new Error('武魂图片已失效，请重新选择图片');
  }
  return output;
}
