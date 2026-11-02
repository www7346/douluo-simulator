export default function QueryStatus({query,label='正在读取…'}:{query:{error?:string;loading:boolean;retry:()=>void};label?:string}) {
  return query.error?<p role="alert" className="danger-text">{query.error} <button className="text-link" onClick={query.retry}>重新读取</button></p>:query.loading?<p role="status" className="muted">{label}</p>:null;
}
