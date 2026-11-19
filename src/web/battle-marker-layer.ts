import type {BattleViewFrame} from '../runtime/player-presentation';

type Unit=BattleViewFrame['units'][number];
export const inactiveMarker=(unit:Unit)=>unit.memberStatus ? unit.memberStatus!=='active' : unit.life!=='存活';

export const battleMarkerPoint=(unit:Unit)=>unit.point ?? unit.position?.战场坐标 ?? {x:50,y:50};
export const projectBattlePoint=(point:{x:number;y:number})=>({x:80+point.x*10.4,y:100+point.y*4.3});

export type BattlePointerRegion={
  id:string;
  localPoint:{x:number;y:number};
  figure?:{x:number;y:number;width:number;height:number};
};

/** Raster transparency is not a reliable SVG hit mask. Keep every overlapping
 * viewport as an explicit choice, regardless of render order or eligibility.
 * Points are converted through each marker's actual screen matrix by the view. */
export function battlePointerChoices(regions:BattlePointerRegion[],hitUnitId?:string):string[] {
  const ids=new Set<string>();
  for(const {id,localPoint:p,figure:f} of regions){
    const inFigure=f&&p.x>=f.x&&p.x<=f.x+f.width&&p.y>=f.y&&p.y<=f.y+f.height;
    if(id===hitUnitId||Math.hypot(p.x,p.y)<=40||inFigure)ids.add(id);
  }
  return [...ids];
}

/** Connected screen-space hit circles, independent of combat range or target eligibility. */
export function battleMarkerGroups(units:Unit[],surface:{width:number;height:number},crowded=false):Unit[][] {
  const centers=new Map(units.map(unit=>{const p=projectBattlePoint(battleMarkerPoint(unit));return [unit.id,{x:p.x*surface.width/1200,y:p.y*surface.height/650}];}));
  const remaining=new Set(units.map(unit=>unit.id)),groups:Unit[][]=[];
  for(const first of units){
    if(!remaining.delete(first.id))continue;
    const group=[first];
    for(let index=0;index<group.length;index++){
      const a=centers.get(group[index].id)!;
      for(const unit of units){
        if(!remaining.has(unit.id))continue;
        const b=centers.get(unit.id)!;
        // The marker transforms keep each 40-unit hit circle at a 32 CSS-pixel radius.
        const overlaps=Math.hypot(a.x-b.x,a.y-b.y)<=64 || crowded&&Math.abs(a.x-b.x)<94&&Math.abs(a.y-b.y)<156;
        if(overlaps){remaining.delete(unit.id);group.push(unit);}
      }
    }
    groups.push(group);
  }
  return groups;
}

/** Visual stacking only; valid targets are supplied by the rules, including revival targets. */
export function battleMarkerLayers(units:Unit[],choices:Array<{id:string}>=[]):Unit[] {
  const eligible=new Set(choices.map(choice=>choice.id));
  const layer=(unit:Unit)=>eligible.has(unit.id) ? 2 : inactiveMarker(unit) ? 0 : 1;
  return [...units].sort((a,b)=>layer(a)-layer(b));
}
