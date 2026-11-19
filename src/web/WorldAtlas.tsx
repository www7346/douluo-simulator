import {assetUrl} from './asset-delivery';
import {useEffect, useMemo, useRef, useState, type PointerEvent} from 'react';
import {useSceneQuery} from './use-game-query';
import QueryStatus from './components/QueryStatus';
import QuerySurface from './components/QuerySurface';

import {playerText} from '../runtime/player-text';
import {Button,ModalActions} from './components';
import {useGame} from './game-context';
import {worldParentId} from './scene-navigation';
import RegionalTerrain,{PlaceSymbol} from './components/RegionalTerrain';
import {useGameQuery} from './use-game-query';

type Camera={x:number;y:number;width:number;height:number};
const OVERVIEW:Camera={x:0,y:0,width:900,height:600};
const LANDMARKS=new Set(['loc-holy-soul-village','loc-notting-city','loc-heaven-dou-city','loc-star-luo-city','loc-sea-breeze-city','loc-spirit-city','loc-sea-god-island','loc-gengxin-city','loc-soto-city','loc-star-lake']);

export function WorldAtlas({travelMode,onTravelMode,onPlan,onDungeon,active=true,slaughterLocationId,onSlaughter}: {active?:boolean;travelMode:string;onTravelMode:(mode:string)=>void;onPlan:(location:any,stayBehind?:string[])=>void;onDungeon:(dungeon:any)=>void;slaughterLocationId?:string;onSlaughter?:()=>void}) {
  const {state,view,controller}=useGame();
  const locations=state?.地图?.地点 ?? {};
  const currentId=state?.地图?.当前地点ID;
  const facts=useSceneQuery('scene.atlas',{scope:'map'},currentId,{enabled:active});
  const [selectedId,setSelectedId]=useState(currentId);
  const [regionId,setRegionId]=useState('');
  const [camera,setCamera]=useState<Camera>(OVERVIEW);
  const [regionFrame,setRegionFrame]=useState<Camera>(OVERVIEW);
  const [query,setQuery]=useState('');
  const [stayBehind,setStayBehind]=useState<string[]>([]);
  const [hoveredId,setHoveredId]=useState('');
  const [surface,setSurface]=useState({width:900,height:600});
  const openingFocused=useRef(false);
  const svgRef=useRef<SVGSVGElement>(null);
  const drag=useRef<{pointerId:number;x:number;y:number;camera:Camera}|null>(null);
  const selected=locations[selectedId] ?? locations[currentId];
  const scene=facts.data?.scenes[selected?.id]??{dungeons:[],description:''};
  const access=facts.data?.access[selected?.id]??{pass:false,reasons:[]};
  const currentRoot=worldParentId(state,currentId);
  const allLocations=Object.values(locations) as any[];
  const known=allLocations.filter(location => facts.data?.knownIds.includes(location.id));
  const nodes=known.filter(location => regionId ? worldParentId(state,location.id) === regionId : location.mapLevel === 'world');
  const nodeIds=new Set(nodes.map(node=>node.id));
  const routes=(Object.values(state?.地图?.路线 ?? {}) as any[]).filter(route=>nodeIds.has(route.from) && nodeIds.has(route.to));
  const routeQuery=useGameQuery(`route:${selected?.id}:${travelMode}:${stayBehind.join(',')}`,signal=>controller.previewWorldIntent({type:'travel',destinationId:selected?.id,mode:travelMode,stayBehind},signal),{enabled:active&&selected?.id!==currentId&&access.pass});
  const routePreview=routeQuery.data;
  const routeIds=new Set<string>(routePreview?.path?.routeIds ?? []);
  const block=facts.data?.block;
  const atSelected=selected?.id === currentId;
  const selectedRoot=worldParentId(state,selected?.id);
  const hasRegion=known.some(node=>node.parentId && worldParentId(state,node.id)===selectedRoot);
  const scale=Math.max(camera.width/surface.width,camera.height/surface.height);

  const focusRegion=(id:string) => {
    const root=worldParentId(state,id);
    const points=known.filter(node=>worldParentId(state,node.id)===root).map(node=>node.map);
    if (!points.length) return;
    const centerX=points.reduce((sum,point)=>sum+point.x,0)/points.length;
    const centerY=points.reduce((sum,point)=>sum+point.y,0)/points.length;
    const width=Math.max(125,...points.map(point=>Math.abs(point.x-centerX)*3.6),...points.map(point=>Math.abs(point.y-centerY)*5.4));
    const frame={x:centerX-width/2,y:centerY-width/3,width,height:width*2/3};
    setRegionId(root);setRegionFrame(frame);setCamera(frame);
  };
  const focusLocation=(id:string) => {
    setSelectedId(id);
    if (locations[id]?.mapLevel==='local') focusRegion(id);
    else {setRegionId(''); const point=locations[id]?.map; if(point)setCamera({x:point.x-250,y:point.y-166.67,width:500,height:333.33});}
  };
  useEffect(()=>{
    if(openingFocused.current||!facts.data)return;
    openingFocused.current=true;
    if(currentId==='loc-hunting-forest'&&state.世界?.opening?.guidance)focusRegion(currentId);
  },[Boolean(facts.data),currentId]);
  useEffect(()=>{setSelectedId(currentId);},[currentId]);
  useEffect(()=>{
    const svg=svgRef.current;if(!svg)return;
    const resize=new ResizeObserver(()=>setSurface({width:Math.max(1,svg.clientWidth),height:Math.max(1,svg.clientHeight)}));
    resize.observe(svg);return ()=>resize.disconnect();
  },[]);
  const zoom=(factor:number,anchor={x:.5,y:.5}) => setCamera(old=>{
    const width=Math.min(1200,Math.max(75,old.width*factor));
    const height=width*2/3;
    return {x:old.x+(old.width-width)*anchor.x,y:old.y+(old.height-height)*anchor.y,width,height};
  });
  useEffect(()=>{
    const svg=svgRef.current;if(!svg)return;
    const wheel=(event:WheelEvent)=>{
      event.preventDefault();
      const matrix=svg.getScreenCTM()?.inverse();if(!matrix)return;
      const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix);
      const box=svg.viewBox.baseVal;
      zoom(event.deltaY>0?1.16:1/1.16,{x:(point.x-box.x)/box.width,y:(point.y-box.y)/box.height});
    };
    svg.addEventListener('wheel',wheel,{passive:false});
    return ()=>svg.removeEventListener('wheel',wheel);
  },[]);
  const point=(event:PointerEvent<SVGSVGElement>)=>{
    const matrix=svgRef.current?.getScreenCTM()?.inverse();
    return matrix?new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix):null;
  };
  const beginDrag=(event:PointerEvent<SVGSVGElement>)=>{
    if(event.button!==0 || (event.target as Element).closest('[data-map-node]'))return;
    const p=point(event);if(!p)return;
    drag.current={pointerId:event.pointerId,x:p.x,y:p.y,camera};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag=(event:PointerEvent<SVGSVGElement>)=>{
    const started=drag.current;if(!started || started.pointerId!==event.pointerId)return;
    const p=point(event);if(!p)return;
    setCamera(old=>({...old,x:old.x+started.x-p.x,y:old.y+started.y-p.y}));
  };
  const endDrag=()=>{drag.current=null;};
  const reset=()=>{setRegionId('');setCamera(OVERVIEW);};
  const selectNode=(id:string)=>{setSelectedId(id);const dungeons=facts.data?.scenes[id]?.dungeons??[];if(dungeons.length===1&&facts.data?.access[id]?.pass)onDungeon(dungeons[0]);};
  const playerNodeId=regionId ? currentId : currentRoot;
  if(!facts.data)return <QueryStatus query={facts}/>;
  return <QuerySurface query={facts}><section className="atlas" aria-label="大陆地图">
    <div className="atlas__canvas">
      <svg ref={svgRef} className="atlas__terrain" viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} role="group" aria-label="可缩放的地点与道路">
        {regionId?<RegionalTerrain frame={regionFrame} location={locations[regionId]}/>:<><image href={assetUrl("/art/fantasy-v3/map.png")} x="0" y="0" width="900" height="600" preserveAspectRatio="none" /><rect x="0" y="0" width="900" height="600" fill="#fff3bd" opacity=".04" pointerEvents="none" /></>}
        {routes.map(route=>{const from=locations[route.from].map,to=locations[route.to].map;const pass=facts.data.routePass[route.id];return <line key={route.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className={`atlas-route${routeIds.has(route.id)?' is-planned':''}${pass?'':' is-locked'}`} vectorEffect="non-scaling-stroke" />;})}
        {nodes.map(node=>{
          const isPlayer=node.id===playerNodeId,active=node.id===selectedId || (!regionId && node.id===selectedRoot);
          const accessible=facts.data.access[node.id]?.pass;
          const named=regionId || active || isPlayer || hoveredId===node.id || camera.width<550 || LANDMARKS.has(node.id);
          return <g key={node.id} data-map-node={node.id} role="button" tabIndex={0} aria-label={`${node.name}${isPlayer?'，当前所在':''}${accessible?'':'，暂不可通行'}`} aria-pressed={active} transform={`translate(${node.map.x} ${node.map.y})`} className={`atlas-pin${active?' is-selected':''}${isPlayer?' is-player':''}${accessible?'':' is-locked'}`} onMouseEnter={()=>setHoveredId(node.id)} onMouseLeave={()=>setHoveredId('')} onClick={()=>selectNode(node.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectNode(node.id);}}}>
            <title>{node.name}</title><circle className="atlas-pin__hit" r={(regionId?35:14)*scale} fill="transparent" />
            {regionId&&<g transform={`translate(0 ${-25*scale}) scale(${scale})`}><PlaceSymbol type={node.type}/></g>}
            {isPlayer && <circle className="atlas-player-halo" r={11*scale} />}
            <path d={`M 0 ${-7*scale} ${6*scale} 0 0 ${7*scale} ${-6*scale} 0 Z`} />
            <circle r={2*scale} />
            {named && <text x={0} y={(regionId?23:-15)*scale} fontSize={(regionId?14:11)*scale} textAnchor="middle">{node.name}</text>}
          </g>;
        })}
      </svg>
      <header className="atlas__heading"><span className="eyebrow">大陆纪行</span><h1>{regionId ? locations[regionId]?.name : '斗罗大陆'}</h1><p>{regionId ? '地区地图' : '群山与海，皆有回响'}</p></header>
      <div className="atlas__search"><label><span className="sr-only">寻找已知地点</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="寻找地点…" /></label>{query.trim() && <div className="atlas-search-results">{known.filter(node=>`${node.name}${node.region}`.includes(query.trim())).slice(0,12).map(node=><button key={node.id} onClick={()=>{focusLocation(node.id);setQuery('');}}>{node.name}<small>{node.region}</small></button>)}</div>}</div>
      <div className="atlas__tools"><button onClick={()=>zoom(1/1.4)} aria-label="放大地图"><UiIcon name="plus"/></button><button onClick={()=>zoom(1.4)} aria-label="缩小地图"><UiIcon name="minus"/></button><button onClick={()=>focusLocation(currentId)} aria-label="定位当前位置">⌖</button><button onClick={reset} aria-label="查看大陆全图">◇</button></div>
      <footer className="atlas__legend"><span><i /> 当前所在</span><span>◇ 可探访</span><span className="muted">虚线 · 尚不可通行</span><span className="atlas__drag-hint">拖动地图 · 滚轮缩放</span></footer>
    </div>
    <aside className="atlas__details" aria-label="地点详情">
      <span className="eyebrow">{selected?.region} · {selected?.type}</span><h2>{selected?.name}</h2><p>{scene.description}</p>
      <div className="atlas-place-status"><span>{atSelected?'当前所在':access.pass?'道路已知':'尚需准备'}</span></div>
      {hasRegion && <button className="text-link" onClick={()=>regionId?reset():focusRegion(selectedRoot)}>{regionId?'返回大陆地图':'展开地区地图'} <span>↗</span></button>}
      <div className="atlas__departure">{atSelected ? <p className="muted">你在这里。人物与服务见两侧栏。</p> : <>

        {!!facts.data?.travelMembers?.length&&<fieldset><legend>随行队友</legend>{facts.data.travelMembers.map((p:any)=><label key={p.id}><input type="checkbox" checked={!stayBehind.includes(p.id)} disabled={!p.optional} onChange={e=>{const checked=e.target.checked;setStayBehind(prev=>checked?prev.filter(id=>id!==p.id):[...prev,p.id]);}}/>{p.name} · {stayBehind.includes(p.id)?'留在此地':'同行'}</label>)}</fieldset>}
        {!access.pass && <p className="muted">{access.reasons.map((reason:string)=>playerText(reason,state)).join('；')}</p>}
        {access.guidance?.map((item:any)=><p className="atlas-guidance" key={item.name}>{playerText(item.description ?? item.hint ?? item.name,state,'向当地居民打听道路')}</p>)}
        {block && <p className="muted">{playerText(block,state)}</p>}
        {routePreview && <p className="atlas-travel-cost">{routePreview.path.totalMinutes} 分钟</p>}
        {routeQuery.loading&&<p role="status">正在查看路程…</p>}
        {routeQuery.error&&<p role="alert">{routeQuery.error}</p>}

      </>}</div>

    </aside>
    <ModalActions disabled={facts.loading||Boolean(facts.error)}><strong className="atlas-action-place">{selected?.name}</strong>{!atSelected&&<><label className="atlas-action-mode">出行方式<select value={travelMode} onChange={event=>onTravelMode(event.target.value)}>{Object.entries(facts.data.modes).map(([id,mode]:[string,any])=><option key={id} value={id}>{mode.name}</option>)}</select></label><Button disabled={!routePreview||routeQuery.loading||Boolean(routeQuery.error)} onClick={()=>onPlan(selected,stayBehind)}>查看路线并出发 →</Button></>}{atSelected&&selected.id===slaughterLocationId&&onSlaughter&&<Button disabled={Boolean(block)||!access.pass} onClick={onSlaughter}>进入地狱杀戮场</Button>}{scene.dungeons.length>0&&<div className="atlas__services">{scene.dungeons.map((dungeon:any)=><Button key={dungeon.id} disabled={!access.pass} onClick={()=>onDungeon(dungeon)}>进入{dungeon.name} ↗</Button>)}</div>}</ModalActions>
  </section></QuerySurface>;
}
import UiIcon from './components/UiIcon';
