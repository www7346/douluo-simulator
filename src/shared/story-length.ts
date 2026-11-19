export const MAX_STORY_TARGET_CHARS=24000;

export function storyTargetChars(config:{writerTargetChars?:number}):number|undefined{
 const value=config.writerTargetChars;
 if(value!==undefined&&(!Number.isSafeInteger(value)||value<1||value>MAX_STORY_TARGET_CHARS))throw Error(`正文字数请填写1至${MAX_STORY_TARGET_CHARS}的整数，或留空使用自动篇幅`);
 return value;
}
