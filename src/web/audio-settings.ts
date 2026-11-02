export interface SoundSettings {master:number;music:number;effects:number;muted:boolean}
export const DEFAULT_SOUND:Readonly<SoundSettings>={master:70,music:0,effects:70,muted:false};
export function validateSound(value:SoundSettings):SoundSettings {
  if(!value||typeof value.muted!=='boolean'||['master','music','effects'].some(k=>!Number.isFinite(value[k as keyof SoundSettings])||Number(value[k as keyof SoundSettings])<0||Number(value[k as keyof SoundSettings])>100))throw new Error('音量需要在 0～100 之间');
  return {master:value.master,music:value.music,effects:value.effects,muted:value.muted};
}
export const MUSIC={cultivation:{url:'/audio/cultivation.mp3',label:'觉醒与修炼'},forest:{url:'/audio/forest.mp3',label:'森林猎魂'},battle:{url:'/audio/battle.ogg',label:'魂师对战'}} as const;
export type MusicScene=keyof typeof MUSIC;
export const CUES=['tap','back','select','reject','reveal','reroll','hit','miss','shield','heal','fall','victory','defeat','pickup','ascend','craft'] as const;
export type SoundCue=typeof CUES[number];
