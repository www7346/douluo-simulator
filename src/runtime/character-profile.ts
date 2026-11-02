export const CHARACTER_PROFILE_FIELDS=['biography','values','speech','shortTermGoal','longTermGoal'] as const;
export type CharacterProfile=Record<typeof CHARACTER_PROFILE_FIELDS[number],string>;

/** Durable characterization. Aspirations are not evidence that an action happened. */
export function validateCharacterProfile(value:unknown):CharacterProfile {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('人物小传、性格取向、表达习惯和长短期目标须完整填写');
 const input=value as Record<string,unknown>;
 if(Object.keys(input).some(k=>!CHARACTER_PROFILE_FIELDS.includes(k as any)))throw Error('人物档案包含未开放的字段');
 for(const key of CHARACTER_PROFILE_FIELDS){const text=input[key];if(typeof text!=='string'||!text.trim()||text.length>(key==='biography'?800:240))throw Error(`人物档案${key}为空或过长`);}
 return Object.fromEntries(CHARACTER_PROFILE_FIELDS.map(k=>[k,(input[k] as string).trim()])) as CharacterProfile;
}

export function validateCharacterProfiles(state:any){
 for(const person of Object.values(state.人物?.列表??{}) as any[]){
  const record=person.扩展?.characterProfile;
  if(record!==undefined){
   validateCharacterProfile(record.data);
   if(record.version!==1||!['rules-draft','llm','preset','ability-rewrite'].includes(record.source)||!['draft','complete'].includes(record.status)||record.status==='complete'&&record.source==='rules-draft')throw Error('人物档案来源或完成状态无效');
  }
 }
}
