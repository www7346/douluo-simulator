import {validateStoryInlinePresentation,type StoryInlineCard,type StoryInlinePresentation} from '../shared/story-inline-cards';
import {storyReviewProse} from './story-review-prose';
import type {StoryUnitReading} from './story-writing-units';

export const STORY_INLINE_REVIEW_VERSION=1;
export interface StoryReviewPresentation {cards:StoryInlineCard[];presentation?:StoryInlinePresentation;reading?:StoryUnitReading;completeBattle?:true}
const cardReading=(card:StoryInlineCard)=>({marker:`[[card:${card.id}]]`,type:card.kind,title:card.title,source:card.source,data:card.data});

/** Read the actual presentation separately from prose. Card positions and frozen
 * contents are code-owned; neither a marker's validity nor increasing sequence
 * numbers prove that the adjoining novel describes the same event. */
export function storyReviewPresentation(prose:string,input?:StoryReviewPresentation){
 if(!input)return;
 validateStoryInlinePresentation(prose,input.presentation,input.cards);
 if(!input.presentation?.placements.length)return;
 const spans=[...storyReviewProse(prose).spans],cards=new Map(input.cards.map(card=>[card.id,card]));
 return {version:STORY_INLINE_REVIEW_VERSION,cards:input.presentation.placements.map(({offset,cardId})=>({
  ...cardReading(cards.get(cardId)!),position:{offset,
   precedingPassageId:spans.filter(([,span])=>span.end<=offset).at(-1)?.[0]??null,
   followingPassageId:spans.find(([,span])=>span.start>=offset)?.[0]??null}
 }))};
}

/** Capacity only: the largest six permitted cards plus bounded position labels.
 * Never sent as actual placement, and never trims game or narrative records. */
export function storyReviewPresentationReserve(cards:StoryInlineCard[]){
 if(!cards.length)return;
 const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length;
 const selected=cards.map(cardReading).sort((a,b)=>bytes(b)-bytes(a)).slice(0,6);
 return {version:STORY_INLINE_REVIEW_VERSION,cards:selected.map(card=>({...card,position:{offset:24000,precedingPassageId:'p2-ffffffffffffffff.24000',followingPassageId:'p2-ffffffffffffffff.24000'}}))};
}
