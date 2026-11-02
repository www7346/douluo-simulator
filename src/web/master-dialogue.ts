/** Authored presentation only. Rewards and availability come from the rules query. */
export interface MasterFacts {
  academy?:boolean;
  guidance:{status:string;giftStatus:string;giftId:string;itemId:string;tutorialSkipped:boolean}|null;
  gifts:{id:string;name:string;years:number;attuned:boolean;description:string}[];
  giftItem:{id:string;name:string;years:number}|null;
  hasRing:boolean;freeGuide:boolean;reason:string;
}
export interface MasterLine {speaker:'narrator'|'master'|'player';text:string}
export interface MasterScene {kind:'intro'|'choices'|'quick-choices'|'gift'|'received'|'deferred'|'farewell'|'revisit';index:number;giftId?:string}
const master=(text:string):MasterLine=>({speaker:'master',text});
const player=(text:string):MasterLine=>({speaker:'player',text});
const narration=(text:string):MasterLine=>({speaker:'narrator',text});
export function masterOpeningScene(facts:MasterFacts):MasterScene {
  return {kind:facts.guidance?.giftStatus==='claimed'?'revisit':facts.guidance?.tutorialSkipped?'quick-choices':facts.guidance?.status==='pending'?'intro':'choices',index:0};
}
export function resumeMasterScene(cursor:unknown,facts:MasterFacts):MasterScene {
  const value=cursor as MasterScene|undefined;
  if(!value||!['intro','choices','gift','received','deferred','farewell','revisit'].includes(value.kind)||!Number.isSafeInteger(value.index)||value.index<0)return {kind:'intro',index:0};
  if(facts.guidance?.giftStatus==='claimed'&&['choices','gift'].includes(value.kind))return {kind:'received',index:0,giftId:facts.guidance.giftId};
  if(value.kind==='gift'&&!facts.gifts.some(g=>g.id===value.giftId))return {kind:'choices',index:0};
  return {...value,index:Math.min(value.index,masterLines(value,facts).length-1)};
}
const giftLines:Record<string,MasterLine[]>={
  'attuned-100':[player('这一枚有什么不同？'),master('这是献祭留下的魂环，百年修为。它的力量能够与你的武魂相合。'),master('年限虽然不高，却很适合你。选它，我放心。')],
  'bamboo-10':[player('这枚白色的呢？'),master('十年孤竹。它的长处是坚韧，只是年限浅了些。'),master('若你看重这一点，可以留下。先想想你要让武魂往哪条路走。')],
  'bamboo-423':[player('这枚也是孤竹？'),master('不错，四百二十三年。'),narration('说到这个数字，大师的语气笃定了几分。'),master('我推算第一魂环的年限时，最接近理想的就是这个数。'),master('但年限合适，未必就适合你的武魂。你若看中了它，先留着，吸收前还得仔细检查。')],
};
export function masterLines(scene:MasterScene,facts:MasterFacts):MasterLine[] {
  switch(scene.kind){
    case 'intro':return [narration(facts.academy?'学院授课处，大师合上手中的笔记。罗三炮绕过长椅，回到他身旁。':'树影下，大师停住脚步。罗三炮在林边嗅了嗅，又跑回他身旁。'),
      master(facts.freeGuide?'就在这里歇一会儿。进林子以后，跟紧我。':'就在这里歇一会儿。出发前，先把该准备的东西准备好。'),
      player('大师，我们先找什么样的魂兽？'),master('先看你的武魂需要什么，再找魂兽。只盯着年限，很容易选错。'),
      master(facts.freeGuide?'遇到合适的，我会帮你制住它。你先看清楚，再动手。':'遇到魂兽，先看清它的习性。拿不准的，就先避开。'),
      narration(facts.academy?'大师在长椅旁坐下，示意你走近些。':'大师在树根旁坐下，示意你走近些。'),master(facts.academy?'作为入学见面礼，这里有三枚魂环，你挑一枚。':'这趟出来，我也给你备了一份见面礼。这里有三枚魂环，你挑一枚。')];
    case 'quick-choices':return [narration('选择一枚魂环收入行囊，随后即可自由行动。')];
    case 'choices':return [master('想好要哪一枚了？先看看，不用急着决定。')];
    case 'gift':return giftLines[scene.giftId??'']??[master('你再仔细看看。')];
    case 'received':return [master('好，就这一枚。先收好，等准备妥当再吸收。')];
    case 'deferred':return [master(facts.hasRing?'不急，我替你留着。选魂环的事，值得多想一会儿。':'不急，我替你留着。第一枚魂环，值得多想一会儿。')];
    case 'farewell':return [master(facts.hasRing?'魂环有了，接下来要学的是怎么用它。遇上魂兽，先看清它的动作，别急着出手。':facts.freeGuide?'还没有魂技，碰上魂兽就别逞强。今天有我跟着；以后进林子，最好找人结伴。':'还没有魂技，就别独自往深处闯。找人结伴，彼此也有个照应。'),master('打不过就退。能平安回来，才有下一次。')];
    case 'revisit':return [master(facts.giftItem?'那枚魂环还收着？不急，准备好了再吸收。':facts.hasRing?'接下来，多熟悉自己的魂技。林子里的魂兽，可不会等你慢慢想。':'进林子前，把准备做足。遇到应付不了的魂兽，就先退回来。')];
  }
}
/** Advancing dialogue cannot grant a gift. Confirmation is a separate server command. */
export function advanceMasterScene(scene:MasterScene,facts:MasterFacts):MasterScene {
  if(scene.index<masterLines(scene,facts).length-1)return {...scene,index:scene.index+1};
  if(scene.kind==='intro')return {kind:'choices',index:0};
  if(scene.kind==='deferred'||scene.kind==='received')return {kind:'farewell',index:0};
  return scene;
}
