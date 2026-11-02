/** Citations prove provenance and full coverage, independently of execution order.
 * An instruction and a later qualifier can justify an earlier preparation action.
 * Keep exact input/citations/actions; this neither inserts text nor reorders actions.
 */
function citationSeparators(input:string):Uint8Array{
 const optional=new Uint8Array(input.length),quotes: string[]=[];
 const closing:Record<string,string>={'“':'”','‘':'’','「':'」','『':'』','"':'"',"'":"'",'`':'`'};
 for(let i=0;i<input.length;i++){
  const char=input[i],quote=quotes.at(-1);
  if(quote){
   // Escaped characters and punctuation within a quotation remain required.
   if(char==='\\'){i++;continue;}
   if(char===quote)quotes.pop();
   else if(closing[char]&&char!=='"'&&char!=="'"&&char!=='`')quotes.push(closing[char]);
  }else if(closing[char])quotes.push(closing[char]);
  else if(/[\s，。；、]/u.test(char))optional[i]=1;
 }
 // Separators between digits may be numeric notation; never discard them.
 for(let i=0;i<input.length;i++)if(optional[i]){
  const start=i;while(i<input.length&&optional[i])i++;
  if(/[0-9０-９]/u.test(input[start-1]??'')&&/[0-9０-９]/u.test(input[i]??''))optional.fill(0,start,i);
 }
 return optional;
}
export function storySourcesCoverInput(input:string,sources:readonly string[]):boolean{
 return storySourceInputStarts(input,sources)!==null;
}
/** Locate exact citations in the input, independently of action execution order.
 * Reconstruct the same coverage allocation used by validation; overlapping and
 * macro-expanded citations may share a span, repeated input can use distinct spans.
 */
export function storySourceInputStarts(input:string,sources:readonly string[]):number[]|null{
 if(!sources.length||sources.some(source=>!source||!input.includes(source)))return null;
 const starts=sources.map(source=>input.indexOf(source));
 const counts=new Map<string,number>();for(const source of sources)counts.set(source,(counts.get(source)??0)+1);
 if(counts.has(input))return starts;
 const separators=citationSeparators(input);
 // Each citation can select one exact occurrence. Count equal citations together so
 // repeated words and macro-expanded duplicate sources do not create factorial work.
 let total=1;const groups=[...counts].map(([source,count])=>{const stride=total;total*=count+1;return {source,count,stride};});
 const reach=new Int32Array(total);reach.fill(-1);reach[0]=0;
 const previous=new Int32Array(total),chosenGroup=new Int32Array(total),chosenStart=new Int32Array(total);
 for(let mask=0;mask<total;mask++){
  let end=reach[mask];if(end<0)continue;
  while(end<input.length&&separators[end])end++;
  if(end===input.length){
   const allocated=groups.map(()=>[] as number[]);
   for(let at=mask;at;at=previous[at])allocated[chosenGroup[at]].push(chosenStart[at]);
   for(const [index,{source}] of groups.entries()){
    const positions=allocated[index].sort((a,b)=>a-b);let occurrence=0;
    for(const [sourceIndex,value] of sources.entries())if(value===source&&positions.length)starts[sourceIndex]=positions[Math.min(occurrence++,positions.length-1)];
   }
   return starts;
  }
  for(const [groupIndex,{source,count,stride}] of groups.entries()){
   if(Math.floor(mask/stride)%(count+1)===count)continue;
   const start=input.lastIndexOf(source,end);
   if(start<0||start+source.length<=end)continue;
   const next=mask+stride;
   if(start+source.length>reach[next]){reach[next]=start+source.length;previous[next]=mask;chosenGroup[next]=groupIndex;chosenStart[next]=start;}
  }
 }
 return null;
}

/** Diagnostic evidence only. Union coverage proves definite gaps, not valid allocation
 * of repeated quotations; storySourcesCoverInput remains the execution authority. */
export function storySourceCoverageEvidence(input:string,sources:readonly string[]){
 const covered=citationSeparators(input),unmatchedSourceIndexes:number[]=[];
 for(const [index,source] of sources.entries()){
  if(!source||!input.includes(source)){unmatchedSourceIndexes.push(index);continue;}
  for(let at=input.indexOf(source);at>=0;at=input.indexOf(source,at+1))covered.fill(1,at,at+source.length);
 }
 const uncoveredInput:{start:number;end:number;text:string}[]=[];
 for(let i=0;i<input.length;i++)if(!covered[i]){const start=i;while(i<input.length&&!covered[i])i++;uncoveredInput.push({start,end:i,text:input.slice(start,i)});}
 return {uncoveredInput,unmatchedSourceIndexes};
}
