import {chainLinks,chainRuns} from '../bound-chain-geometry';
import type {BoundChainStyle} from '../bound-chain-style';
export function ChainMetalDefs({id}:{id:string}){
 const oval='M-9-12H9A12 12 0 0 1 9 12H-9A12 12 0 0 1-9-12Z',edge='M-12-3H12A3 3 0 0 1 12 3H-12A3 3 0 0 1-12-3Z';
 return <><linearGradient id={`${id}-wire`} x1="-15" y1="-12" x2="10" y2="13" gradientUnits="userSpaceOnUse"><stop stopColor="#fff7df"/><stop offset=".17" stopColor="#d5cbb7"/><stop offset=".3" stopColor="#66616b"/><stop offset=".46" stopColor="#27242d"/><stop offset=".61" stopColor="#c8c3c3"/><stop offset=".75" stopColor="#ece3cd"/><stop offset="1" stopColor="#453d48"/></linearGradient>
  {[['face',oval],['edge',edge]].map(([name,d])=><g id={`${id}-${name}`} key={name}><path d={d} fill="none" stroke="#15121b" strokeWidth="10.4"/><path d={d} fill="none" stroke={`url(#${id}-wire)`} strokeWidth="7.8"/><path d={d} transform="translate(-.6 -.8)" fill="none" stroke="#f4e8cc" strokeWidth=".8" opacity=".8"/>{name==='face'&&<><path d="M-12-10l4-2M10 11l4-2" stroke="#bd9f67" strokeWidth="1.6"/><path d="M-12-5l-3 4M10 6l3-3" stroke="#3e3546" strokeWidth="1"/></>}</g>)}
 </>;
}
export default function BoundChains({id,style,phase,w,h,cx,cy,rx}:{id:string;style:BoundChainStyle;phase:'back'|'front';w:number;h:number;cx:number;cy:number;rx:number}){
 const runs=chainRuns(style,w,h,cx,cy,rx).filter(r=>r.phase===phase);
 if(!runs.length)return null;
 return <g className={`bound-chains bound-chains--${phase}`} data-chain-layer={phase} pointerEvents="none" filter={`url(#${id}-color)`}>{runs.map((run,index)=>{
  const links=chainLinks(run,w);return <g key={index} opacity={run.opacity??1} data-chain-run={index}>
   {[true,false].map(edge=>links.filter(link=>link.edge===edge).map((link,i)=><g key={`${edge}-${i}`} transform={`translate(${link.x.toFixed(2)} ${link.y.toFixed(2)}) rotate(${link.angle.toFixed(2)}) scale(${link.scale.toFixed(4)})`}><use href={`#${id}-${edge?'edge':'face'}`}/>{link.accent&&!edge&&<path d="M0-5 4 0 0 5-4 0Z" fill="#8d43bb" stroke="#d4b17b" strokeWidth=".8"/>}</g>))}
  </g>;
 })}</g>;
}
