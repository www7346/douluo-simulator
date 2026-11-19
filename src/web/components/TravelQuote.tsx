export default function TravelQuote({quote}:{quote:any}) {
  if(!quote)return null;
  return <div className="action-preview"><dl>
    <div><dt>路线偏好</dt><dd>{quote.modeName}</dd></div>
    <div><dt>预计耗时</dt><dd>{quote.path.totalMinutes}分钟</dd></div>
  </dl></div>;
}
