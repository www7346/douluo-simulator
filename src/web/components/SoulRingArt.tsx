import React, {useId} from 'react';

// Original ornamental geometry; age tiers affect presentation only.
export default function SoulRingArt({tier}: {tier:string}) {
  const id=useId().replace(/:/g,'');
  const count=({十年:4,百年:6,千年:10,万年:8,十万年:12,百万年:12} as Record<string,number>)[tier]??4;
  const dark=tier==='万年',divine=tier==='百万年';
  return <svg className="soul-ring-art" data-ring-tier={tier} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-band`} x1="0" y1="0" x2=".7" y2="1" gradientUnits="objectBoundingBox">
        <stop stopColor="var(--ring-color)"/>
        <stop offset=".42" stopColor="var(--ring-shadow)"/>
        <stop offset=".65" stopColor="var(--ring-color)"/>
        <stop offset="1" stopColor={divine?'var(--ring-edge)':'var(--ring-color)'}/>
      </linearGradient>
      <radialGradient id={`${id}-mist`}>
        <stop offset=".65" stopColor="var(--ring-glow)" stopOpacity="0"/>
        <stop offset=".76" stopColor="var(--ring-glow)" stopOpacity=".16"/>
        <stop offset=".85" stopColor="var(--ring-glow)" stopOpacity=".10"/>
        <stop offset="1" stopColor="var(--ring-glow)" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <circle className="ring-sigil__mist" cx="128" cy="128" r="124" fill={`url(#${id}-mist)`}/>
    <circle className="ring-sigil__contour" cx="128" cy="128" r="101" fill="none" stroke="var(--ring-outline)" strokeWidth="1.5"/>
    <circle className="ring-sigil__band" cx="128" cy="128" r="94" fill="none" stroke={`url(#${id}-band)`} strokeWidth={divine?13:dark?12:10}/>
    <g className="ring-sigil__rims" fill="none" stroke="var(--ring-edge)">
      <circle cx="128" cy="128" r="100" strokeWidth={dark?1:1.4}/>
      <circle cx="128" cy="128" r="88" strokeWidth={dark?1:1.2} opacity=".8"/>
      <circle className="ring-sigil__detail" cx="128" cy="128" r="106" strokeWidth=".9" strokeDasharray={divine?'42 14 2 14':'56 28'} opacity=".5"/>
    </g>
    <g className="ring-sigil__runes ring-sigil__detail" fill="none" stroke="var(--ring-glyph)" strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round">
      {Array.from({length:count},(_,i)=><g key={i} transform={`rotate(${i*360/count} 128 128)`}>
        <path d={i%2===0?'M122 34 L127 31 L133 34 L128 38 Z M128 31 L128 27 M128 38 L128 42':'M122 32 Q128 38 134 32 M125 29 L128 33 L131 29 M128 35 L128 40'}/>
      </g>)}
    </g>
    {divine&&<g className="ring-sigil__crowns" fill={`url(#${id}-band)`} stroke="var(--ring-edge)" strokeWidth="1.3" strokeLinejoin="round">
      {Array.from({length:4},(_,i)=><g key={i} transform={`rotate(${i*90} 128 128)`}>
        <path d="M112 29 L115 15 L123 22 L128 4 L133 22 L141 15 L144 29 L136 35 L128 32 L120 35 Z"/>
        <path className="ring-sigil__detail" d="M118 26 L128 29 L138 26 M128 14 L128 24" fill="none"/>
      </g>)}
    </g>}
    {divine&&<g className="ring-sigil__corona" fill="var(--ring-color)" stroke="var(--ring-edge)" strokeWidth="1">
      {Array.from({length:4},(_,i)=><path key={i} transform={`rotate(${i*90+45} 128 128)`} d="M128 11 L131 20 L140 23 L131 26 L128 35 L125 26 L116 23 L125 20 Z"/>)}
    </g>}
    <g className="ring-sigil__sparks ring-sigil__detail" fill="var(--ring-edge)">
      {[[-1,0],[0,1],[1,-1]].map(([x,y],i)=><path key={i} transform={`translate(${128+x*109} ${128+y*111}) scale(${i===1?1:.7})`} d="M0 -5 L1 -1 L5 0 L1 1 L0 5 L-1 1 L-5 0 L-1 -1 Z"/>)}
    </g>
  </svg>;
}
