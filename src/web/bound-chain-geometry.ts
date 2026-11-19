import type {BoundChainStyle} from './bound-chain-style';
type Point={x:number;y:number};
type Curve=[Point,Point,Point,Point];
export type ChainRun={phase:'back'|'front';curves:Curve[];scale?:number;opacity?:number};
export type ChainLink={x:number;y:number;angle:number;edge:boolean;scale:number;accent:boolean};
export function chainRuns(style:BoundChainStyle,w:number,h:number,cx:number,cy:number,rx:number):ChainRun[]{
 const p=(x:number,y:number)=>({x:cx+x*w,y:y*h}),a=rx/w*.97,y=cy/h+.025;
 const run=(phase:ChainRun['phase'],rows:number[][],scale=1,opacity=1):ChainRun=>({phase,scale,opacity,curves:rows.map(v=>[p(v[0],v[1]),p(v[2],v[3]),p(v[4],v[5]),p(v[6],v[7])])});
 if(style==='four-way')return [
  run('back',[[-a,y,-.39,.25,-.48,.12,-.64,-.08]]),run('back',[[a,y,.39,.25,.48,.12,.64,-.08]]),
  run('front',[[-a,y,-.39,.52,-.52,.66,-.66,.75]]),run('front',[[a,y,.39,.52,.52,.66,.66,.75]])];
 if(style==='spiral')return [
  run('back',[[-a,y,-.46,.31,-.52,.23,-.42,.16],[-.42,.16,-.18,.02,.57,.13,.47,.28],[.47,.28,.48,.33,.4,.36,a,y]],.94,.82),
  run('front',[[-a,y,-.7,.46,-.31,.51,.39,.65]],1.1),
  run('back',[[.39,.65,.7,.75,.25,.79,-.37,.67]],.92,.72),
  run('front',[[-.37,.67,-.62,.77,.54,.88,.64,1.08]],1.16)];
 if(style==='cage')return [
  run('back',[[-.28,-.08,-.31,.3,-.3,.72,-.32,1.08]],.72,.58),run('back',[[.28,-.08,.31,.3,.3,.72,.32,1.08]],.72,.58),
  run('front',[[-.45,-.08,-.5,.25,-.47,.66,-.38,.83],[-.38,.83,-.26,1.02,.29,1.02,.4,.82],[.4,.82,.48,.62,.46,.18,.48,-.08]],1.08),
  run('front',[[-a,y,-.35,y,-.43,y,-.47,y]],.88),run('front',[[a,y,.35,y,.43,y,.47,y]],.88)];
 if(style==='asymmetric')return [
  run('back',[[-a,y,-.4,.3,-.49,.15,-.6,-.07]],1.1),
  run('back',[[a,y,.34,.3,.54,.21,.66,.19]],.8,.6),
  run('front',[[a,y,.3,.73,.63,.72,.49,.4],[.49,.4,.46,.23,.5,.06,.55,-.09]],1.15),
  run('front',[[-.72,.84,-.5,.88,-.38,1.01,-.14,1.1]],1.65,.8)];
 return [];
}
function at(c:Curve,t:number):Point{const u=1-t;return {x:u*u*u*c[0].x+3*u*u*t*c[1].x+3*u*t*t*c[2].x+t*t*t*c[3].x,y:u*u*u*c[0].y+3*u*u*t*c[1].y+3*u*t*t*c[2].y+t*t*t*c[3].y};}
/** Uniform arc-length spacing keeps links interlocked on tight curves as well as straight runs. */
export function chainLinks(run:ChainRun,w:number):ChainLink[]{
 const points=run.curves.flatMap((c,index)=>Array.from({length:101},(_,i)=>({point:at(c,i/100),skip:!!index&&i===0})).filter(v=>!v.skip).map(v=>v.point));
 const scale=w/1000*(run.scale??1),step=22*scale,result:ChainLink[]=[];let travelled=0,next=0;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.y-a.y);if(!length)continue;
  while(next<=travelled+length){const t=(next-travelled)/length,index=result.length;result.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI,edge:!!(index%2),scale,accent:index%12===0});next+=step;}
  travelled+=length;
 }
 return result;
}
