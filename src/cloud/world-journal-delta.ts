// Only these rule-owned world ledgers use the compact wire format.
export const worldJournalLists:Readonly<Record<string,readonly string[]|null>>=Object.freeze({
  commerceAuctions:['lots','events','sessions'],auctionSupply:['orders','events','policies'],
  regionalCommerce:['events','orders','shipments'],processedTransactions:[],npcPlans:null
});
interface ArrayEdit {at:number;drop:number;add:unknown[]}
export interface ListChange {length:number;edits:ArrayEdit[]}
export interface JournalChange {
  fields?:{replace:Record<string,unknown>;remove:string[]};
  lists:Record<string,ListChange>;
}
const sameJson=(left:unknown,right:unknown)=>left===right||JSON.stringify(left)===JSON.stringify(right);
export function diffList(previous:unknown[],next:unknown[]):ListChange|undefined {
  const edits:ArrayEdit[]=[];
  if(previous.length===next.length){
    for(let i=0;i<previous.length;){
      if(sameJson(previous[i],next[i])){i++;continue;}
      const at=i++;
      while(i<previous.length&&!sameJson(previous[i],next[i]))i++;
      edits.push({at,drop:i-at,add:next.slice(at,i)});
    }
  }else{
    let start=0,end=0;
    const common=Math.min(previous.length,next.length);
    while(start<common&&sameJson(previous[start],next[start]))start++;
    while(end<common-start&&sameJson(previous[previous.length-end-1],next[next.length-end-1]))end++;
    edits.push({at:start,drop:previous.length-start-end,add:next.slice(start,next.length-end)});
  }
  return edits.length?{length:previous.length,edits}:undefined;
}
export function validListChange(value:unknown):value is ListChange{
  if(!value||typeof value!=='object')return false;
  const v=value as ListChange;
  if(Object.keys(v).length!==2||!Number.isSafeInteger(v.length)||v.length<0||v.length>0xffffffff||!Array.isArray(v.edits)||!v.edits.length)return false;
  let end=0,previousAt=-1,finalLength=v.length;
  for(const edit of v.edits){
    if(!edit||typeof edit!=='object'||Object.keys(edit).length!==3||!Number.isSafeInteger(edit.at)||!Number.isSafeInteger(edit.drop)||edit.at<end||edit.at===previousAt||edit.drop<0||edit.at+edit.drop>v.length||!Array.isArray(edit.add)||!edit.drop&&!edit.add.length)return false;
    previousAt=edit.at;end=edit.at+edit.drop;finalLength+=edit.add.length-edit.drop;
  }
  return finalLength>=0&&finalLength<=0xffffffff;
}
export function applyListChange(base:unknown,change:ListChange){
  if(!Array.isArray(base)||base.length!==change.length)throw Error('清单长度与当前进度不匹配');
  const result:unknown[]=[];
  let cursor=0;
  for(const {at,drop,add} of change.edits){
    while(cursor<at)result.push(base[cursor++]);
    for(const item of add)result.push(item);
    cursor=at+drop;
  }
  while(cursor<base.length)result.push(base[cursor++]);
  return result;
}
