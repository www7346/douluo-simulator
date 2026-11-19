import {BoundFigure,type CollarAppearance} from './components/BoundPortrait';
import {assetUrl} from './asset-delivery';
import {useEffect,useId,useRef,useState,type MouseEvent} from 'react';
import type {BattleViewFrame} from '../runtime/player-presentation';
import type {GameEvent} from '../runtime/contracts';
import {battleMarkerLayers,battleMarkerGroups,battleMarkerPoint,projectBattlePoint,inactiveMarker,battlePointerChoices,type BattlePointerRegion} from './battle-marker-layer';
import {Modal} from './components';
import {beastPortrait} from '../runtime/visual-identity';
import type {PortraitArt} from '../runtime/visual-identity';
import {BattlePortrait,PortraitImage} from './components/PortraitArt';
import {battleImpacts} from './game-feedback';
import {isHumanBattleFigure} from './adult-battle-figures';
import {humanFigureHeight} from './character-figures';

type Point={x:number;y:number};
type Unit=BattleViewFrame['units'][number];
const point=(unit?:Unit):Point=>unit?battleMarkerPoint(unit):{x:50,y:50};
const project=projectBattlePoint;
const ratio=(n:number,max:number)=>Math.max(0,Math.min(1,n/Math.max(1,max)));

/** Projection and decoration only. Affected units and geometry come from the rule preview. */
function AimShape({origin,aim,branch,targetIds,units}:{origin:Point;aim?:Point;branch:any;targetIds:string[];units:Unit[]}) {
  if(!branch) return null;
  const geometry=branch.geometry ?? {};
  const angle=aim ? Math.atan2(aim.y-origin.y,aim.x-origin.x) : 0;
  const degrees=angle*180/Math.PI;
  const length=Number(geometry.length ?? geometry.range ?? 0);
  const half=Number(geometry.coneDegrees ?? 0)*Math.PI/360;
  const coneEnd=[{x:Math.cos(angle-half)*length,y:Math.sin(angle-half)*length},{x:Math.cos(angle+half)*length,y:Math.sin(angle+half)*length}];
  const chain=targetIds.map(id=>units.find(unit=>unit.id===id)).filter(Boolean).map(unit=>point(unit));
  return <g transform="translate(80 100) scale(10.4 4.3)" className="combat-aim" pointerEvents="none">
    {(branch.needsAim||branch.needsPrimaryTarget) && <circle className="combat-aim__reach" cx={origin.x} cy={origin.y} r={geometry.maxTargetDistance ?? geometry.aimRange ?? geometry.range} />}
    {aim && branch.effectId === 'target.burst' && <circle className="combat-aim__area" cx={aim.x} cy={aim.y} r={geometry.radius} />}
    {aim && branch.effectId === 'target.line' && <rect className="combat-aim__area" x={0} y={-geometry.lineHalfWidth} width={length} height={geometry.lineHalfWidth*2} transform={`translate(${origin.x} ${origin.y}) rotate(${degrees})`} />}
    {aim && branch.effectId === 'target.cone' && <path className="combat-aim__area" transform={`translate(${origin.x} ${origin.y})`} d={`M0,0 L${coneEnd[0].x},${coneEnd[0].y} A${length},${length} 0 0 1 ${coneEnd[1].x},${coneEnd[1].y} Z`} />}
    {branch.effectId === 'target.chain' && chain.length>1 && <polyline className="combat-aim__chain" points={chain.map(p=>`${p.x},${p.y}`).join(' ')} />}
    {aim && <><path className="combat-aim__ray" d={`M${origin.x},${origin.y} L${aim.x},${aim.y}`} /><circle className="combat-aim__point" cx={aim.x} cy={aim.y} r={2}/></>}
  </g>;
}

export function BattleBoard({figures={},collars={},frame,playerId,avatarUrl,selectedId,onUnit,onPoint,pending,branch,branchIntent,mode,event,after,locked,movementRadius=0}:{
  movementRadius?:number;figures?:Record<string,string|PortraitArt|null>;collars?:Record<string,CollarAppearance|null>;frame:BattleViewFrame;playerId:string;avatarUrl:string;selectedId:string;onUnit:(id:string)=>void;onPoint:(point:Point)=>void;
  pending:any;branch:any;branchIntent:any;mode:'target'|'move';event?:GameEvent;after:boolean;locked:boolean;
}) {
  const svg=useRef<SVGSVGElement>(null);
  const prefix=useId().replace(/:/g,'');
  const [zoom,setZoom]=useState(false);
  const [surface,setSurface]=useState({width:1200,height:650});
  useEffect(()=>{const element=svg.current;if(!element)return;const observer=new ResizeObserver(()=>{const box=element.getBoundingClientRect();if(box.width&&box.height)setSurface({width:box.width,height:box.height});});observer.observe(element);return()=>observer.disconnect();},[]);
  const [fieldId,setFieldId]=useState('');
  const [groupIds,setGroupIds]=useState<string[]>([]);
  const crowded=frame.units.length>4;
  const groups=battleMarkerGroups(frame.units,surface,crowded).filter(group=>group.length>1);
  const representative=(group:Unit[])=>group.find(unit=>unit.id===selectedId)??group.find(unit=>unit.id===frame.actorId)??group.find(unit=>!inactiveMarker(unit))??group[0];
  const hiddenIds=new Set(groups.flatMap(group=>group.filter(unit=>unit!==representative(group)).map(unit=>unit.id)));
  const groupUnits=frame.units.filter(unit=>groupIds.includes(unit.id));
  const choosingTarget=Boolean(pending&&!locked&&mode==='target'&&(branch?.needsPrimaryTarget||branch?.needsAim));
  const eligibleIds=new Set((branch?.choices??[]).map((choice:any)=>choice.id));
  useEffect(()=>setGroupIds([]),[frame.battleId,frame.round,frame.actorId,locked,pending?.action?.id,branch?.branchId,mode]);
  const playerSide=frame.units.find(unit=>unit.id===playerId)?.sideId;
  const actor=frame.units.find(unit=>unit.id===(event?.payload.actorId ?? frame.actorId));
  const origin=pending?.preview?.movement?.to?.战场坐标 ?? point(actor);
  const chosen=frame.units.find(unit=>unit.id===branchIntent?.targetIds?.[0]);
  const aim=branchIntent?.aimPoint ?? (chosen ? point(chosen) : undefined);
  const targets=pending?.preview?.targetIds ?? [];
  const targetBranchIds=pending?.preview?.branchTargets?.[branch?.branchId]?.targetIds ?? [];
  const field=frame.fields?.find(item=>item.id===fieldId);
  const impactIds=((event?.payload as any)?.targets ?? []).map((target:any)=>target.targetId);
  const impacts=event&&after?battleImpacts(event):[];
  const clickUnitArt=(ev:MouseEvent<SVGSVGElement>)=>{
    // A movement click chooses a point even when artwork or a group covers it.
    // Capture it before the unit's own click handler can open the inspector.
    if(pending&&mode==='move'){ev.stopPropagation();clickPlane(ev);return;}
    const target=ev.target as Element;
    // The existing cluster badge has its own complete choice list.
    if(!svg.current||target.closest('.combat-marker-group'))return;
    const regions:BattlePointerRegion[]=[];
    for(const marker of svg.current.querySelectorAll<SVGGElement>('.combat-unit')){
      const matrix=marker.getScreenCTM(),id=marker.dataset.unitId;
      if(!matrix||!id)continue;
      const localPoint=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(matrix.inverse());
      const art=marker.querySelector(':scope > .combat-unit__figure');
      // Read the outer viewport, not the atlas image's unclipped descendant bounds.
      const figure=art?{x:Number(art.getAttribute('x')),y:Number(art.getAttribute('y')),width:Number(art.getAttribute('width')),height:Number(art.getAttribute('height'))}:undefined;
      regions.push({id,localPoint,figure});
    }
    const hits=battlePointerChoices(regions,target.closest<SVGGElement>('.combat-unit')?.dataset.unitId);
    const ids=[...new Set(hits.flatMap(id=>groups.find(group=>group.some(unit=>unit.id===id))?.map(unit=>unit.id)??[id]))];
    if(!ids.length)return;
    ev.stopPropagation();
    if(ids.length>1)setGroupIds(ids);
    else onUnit(ids[0]);
  };
  const clickPlane=(ev:MouseEvent<SVGSVGElement>)=>{
    if(locked || !pending || !svg.current) return;
    const matrix=svg.current.getScreenCTM();if(!matrix)return;
    const p=new DOMPoint(ev.clientX,ev.clientY).matrixTransform(matrix.inverse());
    if(p.x<80 || p.x>1120 || p.y<100 || p.y>530)return;
    onPoint({x:Math.round((p.x-80)/10.4*10)/10,y:Math.round((p.y-100)/4.3*10)/10});
  };
  return <section className={`combat-stage${pending ? ' is-planning' : ''}${event ? ' is-playing' : ''}`} aria-label="战场">
    <div className="combat-stage__top"><span>{pending ? mode === 'move' ? '点选移动落点' : branch?.needsAim ? '点选落点或方向' : branch?.needsPrimaryTarget ? '点选战场目标' : '确认施放效果' : '选择行动，掌控战局'}</span><button onClick={()=>setZoom(!zoom)} aria-pressed={zoom}>{zoom ? '总览战场' : '放大战场'}</button></div>
    <div className="combat-stage__viewport"><svg ref={svg} viewBox="0 0 1200 650" preserveAspectRatio="none" className={zoom ? 'combat-board is-zoomed' : 'combat-board'} onClickCapture={clickUnitArt} onClick={clickPlane} role="group" aria-label="单位位置与技能落点">
      {mode==='move'&&pending&&<g transform="translate(80 100) scale(10.4 4.3)" className="combat-aim" pointerEvents="none"><circle className="combat-aim__reach" cx={point(actor).x} cy={point(actor).y} r={movementRadius}/></g>}
      <defs><clipPath id={`${prefix}-plane`}><rect x={80} y={100} width={1040} height={430} rx={12}/></clipPath><clipPath id={`${prefix}-portrait`}><circle r={31}/></clipPath><radialGradient id={`${prefix}-unit`}><stop stopColor="#f4eccd"/><stop offset="1" stopColor="#879e73"/></radialGradient></defs>
      <path className="combat-board__boundary" d="M80 100H1120V530H80Z"/>
      <g clipPath={`url(#${prefix}-plane)`}>
        {[12.5,25,37.5,50,62.5,75,87.5].map(n=><g key={n} className="combat-board__grid"><path d={`M${80+n*10.4},100V530 M80,${100+n*4.3}H1120`}/></g>)}
        {pending && <AimShape origin={origin} aim={aim} branch={branch} targetIds={targetBranchIds} units={frame.units}/>}
        {pending?.intent?.movement?.战场坐标 && <g className="combat-move" transform="translate(80 100) scale(10.4 4.3)"><path d={`M${point(actor).x},${point(actor).y} L${pending.intent.movement.战场坐标.x},${pending.intent.movement.战场坐标.y}`}/><circle cx={pending.intent.movement.战场坐标.x} cy={pending.intent.movement.战场坐标.y} r={3}/></g>}
        {event && after && actor && impactIds.map((id:string)=>{const target=frame.units.find(unit=>unit.id===id),impact=impacts.find(i=>i.id===id);if(!target||!impact||impact.miss)return null;const a=project(point(actor)),b=project(point(target));return <path key={`${event.id}-${id}`} className={`combat-strike${impact.hp>0?' is-heal':impact.shield>0?' is-shield':''}`} d={`M${a.x},${a.y} Q${(a.x+b.x)/2},${Math.min(a.y,b.y)-45} ${b.x},${b.y}`}/>;})}
      </g>
      {battleMarkerLayers(frame.units,pending && !locked && mode==='target' ? branch?.choices : []).filter(unit=>!hiddenIds.has(unit.id)).map(unit=>{
        const p=project(point(unit));const ally=unit.sideId===playerSide;
        const inactive=inactiveMarker(unit);
        const before=event?.battleView?.before.units.find(item=>item.id===unit.id);
        const delta=before ? unit.hp-before.hp : 0;
        const shieldDelta=before ? unit.shield-before.shield : 0;
        const impact=impacts.find(i=>i.id===unit.id);
        const grouped=false;
        const figure=figures[unit.id];
        const human=isHumanBattleFigure(figure);
        // Keep original aspect ratio and feet on the same plane. Fit the head label
        // as well when a unit moves to the rear edge or the viewport is short.
        const figureHeight=Math.max(72,Math.min(human?Math.min(humanFigureHeight(figure),crowded?220:340):185,p.y*surface.height/520-24));
        const portrait=unit.portrait??(unit.kind?.includes('魂兽')?beastPortrait({name:unit.name}):null);
        return <g key={unit.id} data-unit-id={unit.id} role={grouped?undefined:'button'} tabIndex={grouped?undefined:0} aria-hidden={grouped?true:undefined} aria-label={grouped?undefined:`${unit.name}，${ally ? '我方' : '对手'}，生命${unit.hp}/${unit.hpMax}，${unit.distanceLabel ?? '我方站位'}`} aria-pressed={grouped?undefined:selectedId===unit.id} onClick={grouped?undefined:ev=>{ev.stopPropagation();onUnit(unit.id);}} onKeyDown={grouped?undefined:ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();onUnit(unit.id);}}} style={{transform:`translate(${p.x}px,${p.y}px) scale(${960/surface.width},${520/surface.height})`}} className={`combat-unit${figure?' has-figure':''} ${ally ? 'is-ally' : 'is-enemy'}${grouped?' is-grouped':''}${inactive ? ' is-inactive' : ''}${unit.id===(event?.payload.actorId ?? frame.actorId) ? ' is-acting' : ''}${selectedId===unit.id ? ' is-selected' : ''}${targets.includes(unit.id) ? ' is-affected' : ''}${field?.memberIds.includes(unit.id) ? ' in-field' : ''}`}>
          <circle className="combat-unit__hit" r={40} fill="transparent"/><ellipse className="combat-unit__base" rx={48} ry={17} cy={30}/><circle className="combat-unit__halo" r={40}/>{!figure&&<circle className="combat-unit__disc" r={33} fill={`url(#${prefix}-unit)`}/>}
          {figure&&typeof figure!=='string'?<svg className="combat-unit__figure" x={-125} y={36-figureHeight} width={250} height={figureHeight} viewBox="0 0 1 1" preserveAspectRatio="xMidYMax meet" overflow="hidden" pointerEvents={grouped?'none':'visiblePainted'}><PortraitImage art={figure} name={unit.name}/></svg>:figure&&collars[unit.id]?<BoundFigure figure={figure} appearance={collars[unit.id]!} name={unit.name} className="combat-unit__figure" x={-116} y={36-figureHeight} width={232} height={figureHeight}/>:figure?<image className="combat-unit__figure" href={assetUrl(figure)} x={human?-116:-145} y={36-figureHeight} width={human?232:290} height={figureHeight} preserveAspectRatio="xMidYMax meet" pointerEvents={grouped?'none':'visiblePainted'}/>:unit.id===playerId && avatarUrl ? <image href={assetUrl(avatarUrl)} x={-32} y={-32} width={64} height={64} clipPath={`url(#${prefix}-portrait)`}/> : portrait?<BattlePortrait art={portrait} clipPath={`url(#${prefix}-portrait)`}/>:<text className="combat-unit__glyph" y={9} textAnchor="middle">{unit.name.slice(0,1)}</text>}
          <text className="combat-unit__name" y={figure?15-figureHeight:-51} textAnchor="middle">{unit.name}</text><text className="combat-unit__zone" y={figure?29-figureHeight:-36} textAnchor="middle">{inactive ? unit.memberStatus==='escaped' ? '已撤离' : '已退场' : (unit.distanceLabel ?? '我方站位')}{unit.position.高度 && unit.position.高度!=='地面' ? ` · ${unit.position.高度}` : ''}</text>
          <rect className="combat-unit__track" x={-41} y={44} width={82} height={5} rx={2}/><rect className="combat-unit__hp" x={-41} y={44} width={82*ratio(unit.hp,unit.hpMax)} height={5} rx={2}/><rect className="combat-unit__sp" x={-41} y={52} width={82*ratio(unit.sp,unit.spMax)} height={3}/>
          <text className="combat-unit__numbers" y={70} textAnchor="middle">{unit.hp} / {unit.hpMax}{unit.shield ? ` +${unit.shield}盾` : ''}</text>
          {unit.statuses.length>0 && <text className="combat-unit__status" y={86} textAnchor="middle">{unit.statuses.slice(0,2).map(status=>status.name).join(' · ')}{unit.statuses.length>2 ? ` +${unit.statuses.length-2}` : ''}</text>}
          {event&&after&&impact&&<g key={event.id} className="combat-impact" aria-label={impact.miss?'未命中':impact.fell?'倒下':undefined}>
            {(delta!==0||shieldDelta!==0)&&<circle className={`combat-impact__ring ${delta>0?'is-heal':shieldDelta>0?'is-shield':''}`} r={44}/>}
            {delta!==0&&<text className={`combat-number ${delta>0?'is-heal':''}`} y={-76} textAnchor="middle">{delta>0?'+':''}{delta}</text>}
            {shieldDelta!==0&&<text className="combat-number is-shield" y={delta?-98:-76} textAnchor="middle">{shieldDelta>0?'+':''}{shieldDelta} 盾</text>}
            {impact.miss&&<text className="combat-number is-miss" y={-76-(delta!==0?22:0)-(shieldDelta!==0?22:0)} textAnchor="middle">未命中</text>}
            {impact.fell&&<text className="combat-impact__fall" y={14} textAnchor="middle">倒下</text>}
          </g>}
        </g>;
      })}
      {groups.map(group=>{
        const centers=group.map(unit=>project(point(unit)));
        const center=project(point(representative(group)));
        const open=()=>setGroupIds(group.map(unit=>unit.id));
        return <g key={group.map(unit=>unit.id).join(':')} role="button" tabIndex={0} className="combat-marker-group" aria-label={`附近有${group.length}个单位：${group.map(unit=>unit.name).join('、')}，展开选择`} onClick={ev=>{ev.stopPropagation();open();}} onKeyDown={ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();open();}}}>
          {centers.map((p,index)=><ellipse key={index} cx={p.x} cy={p.y} rx={40*960/surface.width} ry={40*520/surface.height} className="combat-marker-group__hit"/>)}
          <g transform={`translate(${center.x} ${center.y+106*520/surface.height}) scale(${960/surface.width} ${520/surface.height})`} className="combat-marker-group__badge"><rect x={-68} y={-18} width={136} height={36} rx={18}/><text textAnchor="middle" y={6}>{group.length} 个 · 展开选择</text></g>
        </g>;
      })}
    </svg></div>
    <Modal open={groupUnits.length>0} title={choosingTarget?'选择战场目标':'查看附近单位'} onClose={()=>setGroupIds([])}>
      <p>这些单位靠得很近。选中一位，查看详情或继续当前行动。</p>
      <div className="combat-group-choices">{groupUnits.map(unit=>{
        const unavailable=choosingTarget&&!eligibleIds.has(unit.id);
        const reason=(branch?.targetOptions??[]).find((choice:any)=>choice.id===unit.id)?.reason;
        return <button key={unit.id} onClick={()=>{setGroupIds([]);onUnit(unit.id);}} aria-label={`选择${unit.name}`}><span><b>{unit.name}</b><small>{unit.sideId===playerSide?'我方':'对手'} · {inactiveMarker(unit)?unit.memberStatus==='escaped'?'已撤离':'已退场':(unit.distanceLabel??'我方站位')}{unavailable?` · ${reason??'无法作为当前目标，可查看详情'}`:''}</small></span><strong>{unit.hp} / {unit.hpMax}</strong></button>;
      })}</div>
    </Modal>
    {frame.fields?.length ? <div className="combat-fields">{frame.fields.map(item=><button key={item.id} className={fieldId===item.id ? 'is-active' : ''} onClick={()=>setFieldId(fieldId===item.id ? '' : item.id)}>{item.name} · {item.status}{item.charges!==undefined?' · 余 '+item.charges+' 次触发':''}{item.maintained?' · 维持中':item.remaining!==null ? ` · ${item.remaining}${item.remainingUnit??'回合'}` : ''}</button>)}{field && <p>{field.position.距离区}{field.radius!==undefined ? `，延伸${field.radius}个距离区` : ''} · 覆盖：{field.memberIds.map(id=>frame.units.find(unit=>unit.id===id)?.name).filter(Boolean).join('、') || '暂无单位'}</p>}</div> : null}
  </section>;
}
