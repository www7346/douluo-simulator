import {BOUND_CHAIN_STYLES,chainStyleForObedience} from '../bound-chain-style';
export default function BoundChainStatus({obedience}:{obedience:number|null}){
 const style=BOUND_CHAIN_STYLES.find(s=>s.id===chainStyleForObedience(obedience))!;
 return <p className="bound-chain-status" aria-label="锁链样式"><strong>{style.name}</strong>{'minimum'in style&&<small>服从度 {obedience}/100 · 随服从度变化</small>}</p>;
}
