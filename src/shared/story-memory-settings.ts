export interface StoryMemorySettings {version:1;autoSummarize:boolean}
export function storyMemorySettings(value:unknown):StoryMemorySettings {
 if(value===undefined)return {version:1,autoSummarize:false};
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['version','autoSummarize'].includes(k)))throw Error('故事记忆设置无效');
 const v=value as StoryMemorySettings;
 if(v.version!==1||typeof v.autoSummarize!=='boolean')throw Error('故事记忆设置无效');
 return {version:1,autoSummarize:v.autoSummarize};
}
