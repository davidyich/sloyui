export interface PanelBounds { min: number; max: number }
const finite = (value: number | undefined, fallback: number) => Number.isFinite(value) ? value! : fallback;
export function panelBounds(min: number | undefined, max: number | undefined): PanelBounds {
  const low = Math.max(0, Math.min(100, finite(min, 0)));
  return { min:low, max:Math.max(low, Math.min(100, finite(max,100))) };
}
/** Impossible configurations still fill the parent: relax limits only when their sums cannot contain 100%. */
export function feasiblePanelBounds(bounds: PanelBounds[]): PanelBounds[] {
  const minSum=bounds.reduce((sum,b)=>sum+b.min,0),maxSum=bounds.reduce((sum,b)=>sum+b.max,0);
  return bounds.map(b=>({min:minSum>100?b.min*100/minSum:b.min,max:maxSum<100?b.max+(100-maxSum)/Math.max(1,bounds.length):b.max}));
}
export function fitPanelLayout(values: number[], bounds: PanelBounds[]): number[] {
  if(!bounds.length)return [];
  const desired=bounds.map((_,i)=>Math.max(0,finite(values[i],100/bounds.length))),sum=desired.reduce((total,value)=>total+value,0);
  const result=desired.map((value,i)=>Math.max(bounds[i].min,Math.min(bounds[i].max,sum?value*100/sum:100/bounds.length)));
  for(let pass=0;pass<=bounds.length;pass++){
    const gap=100-result.reduce((total,value)=>total+value,0);if(Math.abs(gap)<1e-7)break;
    const available=result.map((value,i)=>gap>0?bounds[i].max-value:value-bounds[i].min),capacity=available.reduce((total,value)=>total+Math.max(0,value),0);
    if(capacity<=1e-7)break;
    result.forEach((value,i)=>{result[i]=value+Math.sign(gap)*Math.min(available[i],Math.abs(gap)*Math.max(0,available[i])/capacity)});
  }
  return result;
}
export function panelPairBounds(layout:number[],bounds:PanelBounds[],index:number){
  const total=layout[index]+layout[index+1];
  return {min:Math.max(bounds[index].min,total-bounds[index+1].max),max:Math.min(bounds[index].max,total-bounds[index+1].min)};
}
