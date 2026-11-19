import labels from './display-labels.json';
// Colour lookup only; no growth tier budgets or conversion multipliers are public.
export function ringDisplay(years:number,color?:string){
  const value=Number.isFinite(years)?Math.max(1,Math.round(years)):1;
  const tier=labels.ringTiers.find(v=>value>=v.minimum&&value<=v.maximum)??labels.ringTiers.at(-1)!;
  return {名称:tier.name,颜色:color||tier.color};
}
