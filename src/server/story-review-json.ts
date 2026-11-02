import {jsonrepair} from 'jsonrepair';

/** The reviewer is read-only. Accept only added quote escapes in its explanatory
 * strings; never repair decisions, identities, references, numbers or structure.
 * Original provider output remains in the gateway's candidate evidence. */
export function parseStoryReviewJson(source:string):{value:unknown;normalizations?:string[]}{
 try{return {value:JSON.parse(source)};}catch{/* Inspect a syntax-only candidate below. */}
 const repaired=jsonrepair(source),insertions:number[]=[];let j=0;
 for(let i=0;i<repaired.length;i++){
  if(repaired[i]===source[j]){j++;continue;}
  if(repaired[i]==='\\'&&repaired[i+1]==='"'&&source[j]==='"'){insertions.push(i);continue;}
  throw Error('审阅JSON包含非引号转义变化');
 }
 if(j!==source.length||!insertions.length)throw Error('审阅JSON不完整');
 const ranges:Array<{start:number;end:number}>=[];let prior:RegExpExecArray|null=null;
 const tokens=/"(?:[^"\\]|\\.)*"/g;let token:RegExpExecArray|null;
 while((token=tokens.exec(repaired))){
  if(prior&&repaired.slice(prior.index+prior[0].length,token.index).trim()===':'&&['reason','impact'].includes(JSON.parse(prior[0])))
   ranges.push({start:token.index+1,end:token.index+token[0].length-1});
  prior=token;
 }
 if(insertions.some(at=>!ranges.some(range=>at>=range.start&&at<range.end)))throw Error('仅审阅解释文本允许补引号转义');
 return {value:JSON.parse(repaired),normalizations:[`审阅解释文本补齐${insertions.length}处引号转义；原始响应保留`]};
}
