import type {ReactNode} from 'react';
import {useEffect,useRef} from 'react';
import {assetUrl} from '../asset-delivery';

export default function OpeningStage({chapter,location,background,figure,name,text,actions,upper,error='',onAdvance,replay=false,platform}:{chapter:string;location:string;background:string;figure?:string|null;name:string;text:string;actions:ReactNode;upper?:ReactNode;error?:string;onAdvance?:()=>void;replay?:boolean;platform?:'closed'|'open'}){
 const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const frame=requestAnimationFrame(()=>ref.current?.focus({preventScroll:true}));return()=>cancelAnimationFrame(frame);},[chapter]);
 return <div ref={ref} tabIndex={0} className="opening-stage" data-testid="opening-stage" onKeyDown={e=>{if(e.target!==e.currentTarget||e.repeat||!['Enter',' '].includes(e.key))return;e.preventDefault();onAdvance?.();}}>
  <img className="opening-stage__background" src={assetUrl(background)} alt=""/>
  <div className="opening-stage__shade"/>
  <header className="opening-stage__chapter"><span>{replay?'开场回顾':location}</span><h2>{chapter}</h2></header>
  {platform?<div className={'opening-stage__assembly is-'+platform} aria-label={platform==='closed'?'封锁罩关闭的封神台':'封神台开启后的情景'}>
   <img className="opening-stage__device" src={assetUrl('/art/opening-devices/seal-platform-'+platform+'.webp')} alt=""/>
   {figure&&<img key={figure} className="opening-stage__contained" src={assetUrl(figure)} alt="封神台内的人物"/>}
  </div>:figure&&<img key={figure} className="opening-stage__figure" src={assetUrl(figure)} alt={`${name}立绘`}/>}
  {upper&&<div className="opening-stage__upper">{upper}</div>}
  <section className="opening-stage__dialogue" aria-label="开场对白">
   <strong className="opening-stage__speaker">{name}</strong>
   <button type="button" className="opening-stage__line" onClick={onAdvance} disabled={!onAdvance} aria-label="继续对白"><span aria-live="polite" aria-atomic="true">{text}</span></button>
   {error&&<p className="opening-stage__error" role="alert">{error}</p>}
   <div className="opening-stage__actions">{actions}</div>
  </section>
 </div>;
}
