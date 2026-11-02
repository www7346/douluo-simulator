import {playerCopy} from '../../runtime/player-copy';
const labels:Record<string,string>={queued:'等待排期',scheduled:'预展已定',open:'正在竞拍',paused:'拍卖暂停',completed:'已成交待领',unsold:'流拍留仓',cancelled:'已撤回',invalidated:'已终止',reconsigned:'已重新寄售'};
export default function CustodyAuctionPanel({facts,onOpen}:{facts:any;active?:boolean;onOpen:()=>void}){
 const url=(auctionId?:string)=>`#/inventory?tab=services&auction=1&${auctionId?'auctionId='+encodeURIComponent(auctionId):'personId='+encodeURIComponent(facts.selectedPersonId)}`;
 if(!facts.auctions?.length&&!facts.canManageRelease)return null;
 return <section className="captivity__task"><h4>奴隶拍卖</h4>{facts.auctions.map((r:any)=><article key={r.id}><p><strong>{playerCopy(r.name)}</strong> · {r.collectedAt!==null?'已接走':labels[r.status]??r.status}</p><a className="button button--ghost" href={url(r.id)} onClick={onOpen}>查看这件拍品</a></article>)}{facts.canManageRelease&&<><p>到天斗拍卖中心办理奴隶寄售，查看场次与接人安排。</p><a className="button button--secondary" href={url()} onClick={onOpen}>前往奴隶拍卖</a></>}</section>;
}
