import type {PortraitArt as Art} from '../../runtime/visual-identity';
import {useId,useEffect,useRef,useState} from 'react';
import {illustratedArt} from '../illustration-catalog';
import {portraitGeometry} from '../portrait-geometry';
import {assetUrl,portraitAsset} from '../asset-delivery';

export function PortraitImage({art,name,className='',fit='meet'}:{art:Art;name:string;className?:string;fit?:'meet'|'slice'}) {
 art=illustratedArt(art);
 const element=useRef<SVGSVGElement>(null),[visible,setVisible]=useState(typeof IntersectionObserver==='undefined');
 useEffect(()=>{if(visible||!element.current)return;const observer=new IntersectionObserver(rows=>{if(rows.some(r=>r.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'240px'});observer.observe(element.current);return()=>observer.disconnect();},[visible]);
 const clip=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const geometry=portraitGeometry(art);
 const cropped=portraitAsset(art);
 return <svg ref={element} className={`portrait-art ${className}`} preserveAspectRatio={`xMidYMid ${fit}`} data-art={`${art.src}#${art.cell}`} viewBox={geometry.viewBox} role="img" aria-label={name} overflow="hidden"><defs><clipPath id={`portrait-${clip}`}><rect {...geometry.clip}/></clipPath></defs><g clipPath={`url(#portrait-${clip})`}><image href={visible?(cropped??assetUrl(art.src)):undefined} {...(cropped?geometry.clip:geometry.image)} preserveAspectRatio="none"/></g></svg>;
}

export function BattlePortrait({art,clipPath}:{art:Art;clipPath:string}) {
 art=illustratedArt(art);
 return <g clipPath={clipPath}><svg x={-32} y={-32} width={64} height={64} overflow="hidden" aria-hidden="true"><PortraitImage art={art} name=""/></svg></g>;
}
