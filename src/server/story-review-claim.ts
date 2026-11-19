import {storyReviewProse} from './story-review-prose';
/** Omitted optional data cannot be converted to an explicit contradiction.
 * A stated conflict must select a literal assertion in the current candidate. */
export function readStoryReviewClaim(value:any,passageIds:string[],prose:string):{kind:'omitted'}|{kind:'asserted';quote:string}{
 if(value?.kind==='omitted'&&Object.keys(value).length===1)return {kind:'omitted'};
 if(value?.kind!=='asserted'||Object.keys(value).some(key=>!['kind','quote'].includes(key))||typeof value.quote!=='string'||!value.quote.trim()||value.quote.length>24000)throw Error('事实差异须区分正文明确主张与省略，明确主张须引用原句');
 const spans=storyReviewProse(prose).spans;
 if(!passageIds.some(id=>spans.get(id.replace(/^\[|\]$/g,''))?.text.includes(value.quote)))throw Error('事实差异所指的主张不在候选原段中');
 return {kind:'asserted',quote:value.quote};
}
