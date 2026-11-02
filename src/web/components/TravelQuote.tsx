export default function TravelQuote({quote}:{quote:any}) {
  if(!quote)return null;
  const returning=quote.returnTrip;
  return <div className="action-preview"><dl>
    <div><dt>出行方式</dt><dd>{quote.modeName}</dd></div>
    <div><dt>预计耗时</dt><dd>{quote.path.totalMinutes}分钟</dd></div>
    <div><dt>去程旅费</dt><dd>{quote.currencyText}</dd></div>
    {returning?.available&&<div><dt>返程预留 · {returning.destinationName}</dt><dd>{returning.currencyText}</dd></div>}
  </dl>
  {returning?.available&&<p className="muted">返程按当前可通行的省钱路线估算，不含途中消耗。</p>}
  {!quote.affordable?<p className="danger-text">当前金币不足以支付去程旅费。</p>:returning?.available&&!returning.affordable?<p className="danger-text">出发后将不足以支付返程旅费，往返还需准备 {returning.shortfallGold} 金币。可以先出售闲置物资。</p>:null}
  {returning&&!returning.available&&<p className="danger-text">{returning.reason}</p>}
  </div>;
}
