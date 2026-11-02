type Frame={x:number;y:number;width:number;height:number};

/** Decorative vector terrain; travel still uses the unchanged world coordinates and roads. */
export default function RegionalTerrain({frame,location}:{frame:Frame;location:any}) {
  const sea=/海|岛|港/u.test(`${location?.type}${location?.name}`),dark=/杀戮|地狱/u.test(location?.name??'');
  const ground=dark?'#d6cfbd':sea?'#acd0cf':'#d4deb7';
  const ridge=dark?'#b6aa9e':sea?'#c4e2df':'#e7ecd0';
  const contours=Array.from({length:11},(_,i)=>{const d=i*26;return `M ${-170+d} -90 C ${140+d} ${70+d/3},${-80+d} ${195+d/2},${160+d} ${288+d/2} S ${620+d} ${225+d/2},${1090+d} ${640+d}`});
  return <g aria-hidden="true" pointerEvents="none">
    <defs>
      <radialGradient id="region-light"><stop stopColor={ridge}/><stop offset="1" stopColor={ground}/></radialGradient>
      <pattern id="region-grain" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".55" fill="#d5dcbb" opacity=".16"/></pattern>
      <pattern id="region-trees" width="65" height="57" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)"><path d={sea?'M9 23q9-6 18 0t18 0 M9 30q9-6 18 0t18 0':'M21 10l-9 15h5l-10 15h28L25 25h5z M21 40v7 M49 39l-6 10h13z'} fill="none" stroke="#708252" strokeWidth=".7" opacity=".24"/></pattern>
    </defs>
    <rect x="-1000" y="-1000" width="3000" height="3000" fill={ground}/>
    <g transform={`translate(${frame.x} ${frame.y}) scale(${frame.width/900} ${frame.height/600})`}>
      <rect x="-450" y="-300" width="1800" height="1200" fill="url(#region-light)"/>
      <path d="M-80 32Q70 130 83 262T226 663L-80 670Z" fill="#81aa9c" opacity=".75"/>
      <path d="M610-70Q523 79 672 163T819 363Q849 483 1020 567L1100-70Z" fill="#90ab78" opacity=".65"/>
      <g fill="none" stroke="#80946c" strokeWidth="1" opacity=".2">{contours.map((d,i)=><path key={i} d={d}/>)}</g>
      <path d="M-20 26Q104 134 102 263T248 645" fill="none" stroke="#769f8a" strokeWidth="2" opacity=".25"/>
      <path d="M619-70Q540 83 688 159T838 374Q870 489 1030 576" fill="none" stroke="#6a8a63" strokeWidth="2" opacity=".18"/>
      <path d="M-180-80H340L164 184 338 328 184 640H-180Z M649-80H1100V680H787L848 473 670 297 827 159Z" fill="url(#region-trees)"/>
      <rect x="-450" y="-300" width="1800" height="1200" fill="url(#region-grain)"/>
      <g transform="translate(750 475)" fill="none" stroke="#92793f" opacity=".4"><circle r="34"/><circle r="40" strokeDasharray="1 8"/><path d="M0-51L8-9 0 0-8-9Z M0 51L8 9 0 0-8 9Z M-51 0L-9-8 0 0-9 8Z M51 0L9-8 0 0 9 8Z"/><text y="-61" textAnchor="middle" fill="#746238" stroke="none" fontSize="12">北</text></g>
    </g>
  </g>;
}

export function PlaceSymbol({type}:{type:string}) {
  const wild=/森林|猎场|山|荒|湖|海|岛|路/u.test(type),ceremony=/仪式|宫|殿|学院|宗|塔/u.test(type);
  return <g className="atlas-place-symbol" aria-hidden="true" pointerEvents="none">
    <ellipse cy="9" rx="23" ry="10" fill="#697a4140"/>
    {wild?<><path d="M-13-19l-10 15h6l-10 15h28L-9-4h6z M10-27L-2-8h6L-7 9h34L14-8h7z"/><path d="M10 9v8M-13 11v4"/></>:ceremony?<><path d="M-25-4L0-23 25-4Z M-20-4v23h40V-4 M-8-4v23M8-4v23 M-25 19h50 M-17-25h34"/><path d="M0-36v13"/></>:<><path d="M-22-3L0-21 23-3 0-8Z M-18-4v23h36V-4 M-5 19V3H5v16 M-13 1v5M13 1v5"/><path d="M9-12v-9h6v15"/></>}
  </g>;
}
