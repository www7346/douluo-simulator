import {createHash} from 'node:crypto';

export const STORY_REVIEW_PROSE_VERSION=2;

/** Review-only source spans. The novel and saved presentation are never modified. */
export function storyReviewProse(prose:string){
 const version=createHash('sha256').update(prose).digest('hex').slice(0,16),spans=new Map<string,{text:string;start:number;end:number}>();
 let ordinal=0;
 for(const match of prose.matchAll(/[^\r\n]+(?:\r?\n(?!\r?\n)[^\r\n]+)*/g)){
  let start=match.index!,end=start+match[0].length;
  while(start<end){
   let boundary=Math.min(end,start+1200);
   if(boundary<end&&/[\uD800-\uDBFF]/.test(prose[boundary-1]))boundary--;
   // Decimal paragraph ordinals match how readers refer to a numbered passage.
   // The protocol prefix prevents an old base-36 ordinal from addressing a
   // different paragraph of otherwise identical prose (old .10 meant 36).
   const id=`p${STORY_REVIEW_PROSE_VERSION}-${version}.${++ordinal}`,text=prose.slice(start,boundary);
   spans.set(id,{text,start,end:boundary});start=boundary;
  }
 }
 let text=prose;for(const [id,span] of [...spans].reverse())text=text.slice(0,span.start)+`[${id}]\n`+text.slice(span.start);
 return {text,spans};
}
