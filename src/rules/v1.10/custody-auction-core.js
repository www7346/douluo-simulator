(function(root,factory){
 const get=(name,file)=>root?.[name]??(typeof require==='function'?require(file):null);
 const api=factory(get('SoulPersonCore','./person-core.js'),get('SoulAbilityContract','./ability-contract-core.js'));
 if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.SoulCustodyAuction=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(people,abilities){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>a===undefined||b===undefined?a===b:abilities.hash(a)===abilities.hash(b),now=s=>people.now(s);
 const VENUE='loc-heaven-auction',ESCROW='wallet-custody-auction-escrow';
 const INTENTS=Object.freeze(['start-custody-auction','bid-custody-auction','pass-custody-auction','cancel-custody-auction']);
 const auction=()=>globalThis.SoulCommerceAuction;
 const table=s=>auction().table(s),lot=(s,id)=>auction().lot(s,id),activeFor=(s,id)=>table(s).lots.find(r=>r.personId===id&&['queued','scheduled','open','paused'].includes(r.status));
 function personalWallet(s,id){const p=s.人物.列表[id],w=s.钱包.列表[p?.walletId];if(!w||w.id===ESCROW||w.ownerEntityId!==id)throw Error('缺少本人的实际钱包');return w;}
 function escrow(s){return s.钱包.列表[ESCROW]??={id:ESCROW,ownerEntityId:'custody-auction-escrow',gold:0,扩展:{type:'custody-auction-escrow'}};}
 function payment(s,r,kind,bid,sourceId){
  const payer=bid.actorId,recipient=kind==='release'?r.sellerId:payer,remains=kind==='refund'&&s.人物.列表[recipient].life?.death?s.战利品.遗骸列表[`remains-${recipient}`]:null;
  if(remains&&(remains.type!=='human-corpse'||remains.unitId!==recipient||remains.ownerEntityId!==recipient))throw Error('退款遗骸并非原竞买者财产');
  const accounts=globalThis.SoulCommerceAssets,original=bid.accountId?accounts.account(s,payer,bid.accountId):personalWallet(s,payer),seller=r.sellerAccountId?accounts.account(s,r.sellerId,r.sellerAccountId):personalWallet(s,r.sellerId);
  const from=kind==='deposit'?original:escrow(s),to=kind==='deposit'?escrow(s):kind==='release'?seller:bid.accountId?original:remains??personalWallet(s,recipient),key=to===remains?'coinGold':'gold',gold=bid.gold;
  if(!Number.isSafeInteger(gold)||gold<0||![from.gold,to[key],to[key]+gold].every(v=>Number.isSafeInteger(v)&&v>=0)||from===to||from.gold<gold)throw Error('竞拍资金不足或余额超限');
  const p={id:`auction-payment:${sourceId}:${kind}:${bid.id}`,kind,bidId:bid.id,payerId:payer,recipientId:recipient,gold,fromWalletId:from.id,toWalletId:to===remains?null:to.id,toRemainsId:to===remains?remains.id:null,before:{from:from.gold,to:to[key]},after:{from:from.gold-gold,to:to[key]+gold}};
  from.gold=p.after.from;to[key]=p.after.to;
  const entry={...clone(p),auctionId:r.id,sourceId,order:people.nextEventOrder(s),at:now(s)};entry.hash=abilities.hash(entry);(s.世界.auctionPayments??=[]).push(entry);return p;
 }
 function validateCash(s){
  const errors=[],seen=new Set();let balance=0,order=0;
  const refs=(s.世界.commerceAuctions?.events??[]).flatMap(e=>(e.payments??[]).map(p=>({p,e})));
  for(const entry of s.世界.auctionPayments??[])try{const {hash,auctionId,sourceId,order:n,at,...p}=entry;
   if(hash!==abilities.hash({...p,auctionId,sourceId,order:n,at})||seen.has(p.id)||n<=order||!Number.isSafeInteger(n)||n>s.扩展.personEventSequence||at>now(s)||refs.filter(v=>v.p.id===p.id&&v.e.auctionId===auctionId&&v.e.sourceId===sourceId&&same(v.p,p)).length!==1)throw Error('共同拍卖付款缺少原永久成交来源');
   if((p.kind==='deposit'?p.before.to:p.before.from)!==balance||p.before.from-p.after.from!==p.gold||p.after.to-p.before.to!==p.gold)throw Error('共同拍卖托管余额链不守恒');balance+=p.kind==='deposit'?p.gold:-p.gold;seen.add(p.id);order=n;
  }catch(e){errors.push(e.message);}
  const held=(s.世界.commerceAuctions?.lots??[]).filter(r=>['open','paused'].includes(r.status)).reduce((n,r)=>n+(r.highestBid?.gold??0),0),wallet=s.钱包?.列表?.[ESCROW];
  if(refs.length!==seen.size||balance!==held||(wallet?.gold??0)!==balance||wallet&&(wallet.ownerEntityId!=='custody-auction-escrow'||Object.values(s.人物.列表).some(p=>p.walletId===ESCROW)))errors.push('共同拍卖托管与所有未结束出价不符');return errors;
 }
 function execute(s,q,sourceId){
  if(q.type==='pass-custody-auction')throw Error('旁观不需要提交竞价；人物拍卖使用统一日历');
  const type={'start-custody-auction':'start-asset-auction','bid-custody-auction':'bid-asset-auction','cancel-custody-auction':'cancel-asset-auction'}[q.type];if(!type)throw Error('未知人物拍卖动作');
  const request={...q,type,...(q.type==='start-custody-auction'?{assetKind:'person'}:{})};delete request.durationMinutes;
  return auction().execute(s,request,sourceId);
 }
 // Current saves have one periodic ledger. NPC bidding uses independent commerce work.
 const validate=s=>s.世界.custodyAuctions!==undefined?['新档不接受即时人物拍卖账本']:[];
 return Object.freeze({INTENTS,VENUE,ESCROW,table,lot,activeFor,execute,pending:()=>[],facts:()=>[],nextAt:()=>null,advanceAt:()=>{},reconcileDeaths:()=>{},validate,validateTransfer:()=>false,validateDeviceTransfer:()=>false,payment,personalWallet,escrow,validateCash});
});
