import {useEffect,useId,useState} from 'react';
import {assetUrl} from '../asset-delivery';
import type {BoundChainStyle} from '../bound-chain-style';
import BoundChains,{ChainMetalDefs} from './BoundChains';
export type CollarAppearance={personId:string;color:string;ordinal:number;obedience:number|null;chainStyle?:BoundChainStyle};
import {originalPersonId} from '../../shared/person-identity';
export function collarAppearance(state:any,id:string):CollarAppearance|null{
 const personId=originalPersonId(state,id);for(const r of state?.扩展?.residentRealms?.records??[]){const slot=r.slots.find((s:any)=>s.personId===personId),ring=state?.魂环?.列表?.[state?.武魂?.列表?.[r.soulId]?.魂环ID列表?.[slot?.index-1]];if(slot&&ring&&state?.人物?.列表?.[r.ownerId]?.status!=='dead'){const obedience=state?.扩展?.obedience?.records?.find((o:any)=>o.subjectId===personId&&o.authorityId===r.ownerId)?.value??null;const fixed=(Object.values(state?.物品?.实例??{}) as any[]).find(item=>item.payload?.realmEquipment?.personId===personId&&item.payload.realmEquipment.group==='fixture'&&item.attachment?.wearerId===personId&&item.durability>0);const chainStyle:BoundChainStyle=({cross:'four-way',suspended:'asymmetric',cage:'cage'} as Record<string,BoundChainStyle>)[fixed?.payload.realmEquipment.choice]??'none';return {personId,color:ring.颜色,ordinal:slot.index,obedience,chainStyle};}}return null;
}
const reviewed:Record<string,{size:number[];cx:number;cy:number;rx:number}>={
 'bi-bi-dong':{size:[936,1465],cx:508,cy:535,rx:280},'bo-saixi':{size:[892,1484],cx:493,cy:550,rx:275},'liu-erlong':{size:[775,1501],cx:425,cy:485,rx:280}
};
const matrices:Record<string,string>={
 '黄':'.4 -.2 .8 0 0 .8 -.2 .4 0 0 -.1 1.1 0 0 0 0 0 0 1 0',
 '红':'1 -.7 .7 0 0 .1 .9 0 0 0 -.1 1.1 0 0 0 0 0 0 1 0',
 '金':'.5 -.3 .8 0 0 .5 -.2 .7 0 0 .3 .2 .5 0 0 0 0 0 1 0'
};
export function BoundFigure({figure,name,appearance,x,y,width='100%',height='100%',className=''}:{figure:string;name:string;appearance:CollarAppearance;x?:number;y?:number;width?:number|string;height?:number|string;className?:string}){
 const id=useId().replace(/:/g,''),profile=Object.entries(reviewed).find(([key])=>figure.includes(key))?.[1],src=assetUrl(figure),[loaded,setLoaded]=useState<{src:string;size:number[]}|null>(null);
 useEffect(()=>{let active=true;const im=new Image();im.onload=()=>{if(active)setLoaded({src,size:[im.naturalWidth,im.naturalHeight]});};im.src=src;return()=>{active=false;};},[src]);
 const chainStyle=appearance.chainStyle??'none',withChains=chainStyle!=='none';
 const [w,h]=profile?.size??(loaded?.src===src?loaded.size:[1024,1536]),cx=profile?.cx??w*.53,cy=profile?.cy??h*.36,rx=profile?.rx??w*.32,k=rx/605,box=withChains?[cx-w*.53,0,w*1.06,h]:[cx-w*.38,0,w*.76,h];
 const color=appearance.color,matrix=matrices[color],grey=color==='白'||color==='黑',gain=color==='白'?1.65:color==='黑'?.53:color==='黄'?1.1:1,metal=assetUrl('/art/overlays/jiumeitu-metal-collar-ornate.webp');
 const layer=(part:string)=><g className={`bound-collar__${part}`} pointerEvents="none" transform={`translate(${cx-887*k} ${cy-365*k}) scale(${k})`}><g clipPath={withChains?`url(#${id}-ring-only)`:undefined}><g clipPath={`url(#${id}-${part})`}><image href={metal} width={1774} height={887} filter={`url(#${id}-color)`}/></g></g></g>;
 return <svg data-collar-slot={appearance.ordinal} data-chain-style={chainStyle} className={`bound-figure ${className}`} x={x} y={y} width={width} height={height} viewBox={box.join(' ')} role="img" aria-label={`${name}，第${appearance.ordinal}魂环项圈`} preserveAspectRatio="xMidYMid meet"><defs><clipPath id={`${id}-back`}><rect x={320} y={0} width={1134} height={375}/></clipPath><clipPath id={`${id}-front`}><path d="M0 0H1774V887H0Z M320 0V375H1454V0Z" clipRule="evenodd"/></clipPath><clipPath id={`${id}-ring-only`}><ellipse cx={887} cy={375} rx={635} ry={225}/><rect x={570} y={375} width={634} height={512}/></clipPath><ChainMetalDefs id={id}/><filter id={`${id}-color`} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">{matrix?<feColorMatrix type="matrix" values={matrix}/>:<feColorMatrix type="saturate" values={grey?'0':'1'}/>}<feComponentTransfer>{(['R','G','B'] as const).map(c=>c==='R'?<feFuncR key={c} type="linear" slope={gain}/>:c==='G'?<feFuncG key={c} type="linear" slope={gain}/>:<feFuncB key={c} type="linear" slope={gain}/>)}</feComponentTransfer></filter></defs><BoundChains id={id} style={chainStyle} phase="back" w={w} h={h} cx={cx} cy={cy} rx={rx}/>{layer('back')}<image data-person-layer="original" href={src} x={0} y={0} width={w} height={h}/>{layer('front')}<BoundChains id={id} style={chainStyle} phase="front" w={w} h={h} cx={cx} cy={cy} rx={rx}/></svg>;
}
export function CollarMark({appearance}:{appearance:CollarAppearance}){return <span className="bound-collar-mark" data-color={appearance.color} title={`第${appearance.ordinal}魂环项圈`} aria-label={`第${appearance.ordinal}魂环项圈`}>◆</span>;}
