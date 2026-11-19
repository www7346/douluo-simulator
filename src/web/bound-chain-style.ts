export const BOUND_CHAIN_STYLES=[
 {id:'none',name:'原锁环'},
 {id:'cage',name:'垂链囚笼',minimum:0,maximum:19},
 {id:'asymmetric',name:'不对称重链',minimum:20,maximum:39},
 {id:'four-way',name:'四向牵引',minimum:40,maximum:59},
 {id:'spiral',name:'螺旋环绕',minimum:60,maximum:100},
] as const;
export type BoundChainStyle=typeof BOUND_CHAIN_STYLES[number]['id'];
export function chainStyleForObedience(value:number|null):BoundChainStyle{
 if(value===null||!Number.isInteger(value))return 'none';
 return BOUND_CHAIN_STYLES.find(s=>'minimum'in s&&value>=s.minimum&&value<=s.maximum)?.id??'none';
}
