import { useTranslate, useLocale } from './locale.js';
import { Slider } from './forms.js';
import { Accordion } from './layout.js';
import { Fragment, useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';

export interface ChartDatum { id?: string; label: string; value: number; color?: string }
export interface ChartSeries { id?: string; name: string; values: number[]; color?: string }
export interface SlopeDatum { label: string; before: number; after: number; color?: string }
export interface ActivityDatum { date: string; value: number }
export interface ChartBaseProps { label: string; height?: number; className?: string; animate?: boolean }
const palette = /* @__PURE__ */ Array.from({ length: 8 }, (_, index) => `var(--cap-chart-series-${index + 1})`);
const finite = (n: number) => Number.isFinite(n) ? n : 0;
function useChartFormat() { const locale = useLocale(); return (n: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(finite(n)); }
function ChartDataTable({ label, rows }: { label: string; rows: ReadonlyArray<readonly string[]> }) { const t = useTranslate(); return <Accordion title={t('Показать таблицу данных', 'View data table')} className="cap-chart-data"><table><caption>{label}</caption><thead><tr><th scope="col">{t('Категория', 'Category')}</th><th scope="col">{t('Серия', 'Series')}</th><th scope="col">{t('Значение', 'Value')}</th></tr></thead><tbody>{rows.map(([a,b,c],i)=><tr key={`${a}-${b}-${i}`}><th scope="row">{a}</th><td>{b}</td><td>{c}</td></tr>)}</tbody></table></Accordion>; }
function Frame({label,height=220,className='',animate=true,children,rows=[],svgRef}:{label:string;height?:number;className?:string;animate?:boolean;children:ReactNode;rows?:ReadonlyArray<readonly string[]>;svgRef?:React.Ref<SVGSVGElement>}) {
  const [node,setNode]=useState<SVGSVGElement|null>(null),[textScale,setTextScale]=useState(1);
  useLayoutEffect(()=>{
    if(!node)return;
    const measure=()=>{const renderedHeight=node.getBoundingClientRect().height;if(renderedHeight>0)setTextScale(Math.max(1,Math.min(4,height/renderedHeight)));};
    measure();
    if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect();}
    window.addEventListener('resize',measure);return()=>window.removeEventListener('resize',measure);
  },[node,height]);
  const setRefs=(element:SVGSVGElement|null)=>{setNode(element);if(typeof svgRef==='function')svgRef(element);else if(svgRef)svgRef.current=element;};
  return <figure className={`cap-chart ${className}`} style={{'--cap-chart-height':`${height}px`,'--cap-chart-motion':animate?'1':'0','--cap-chart-text-scale':textScale} as CSSProperties}><svg ref={setRefs} role="group" aria-label={label} viewBox={`0 0 640 ${height}`} preserveAspectRatio="xMidYMid meet">{children}</svg>{<ChartDataTable label={label} rows={rows}/>}</figure>;
}
/** Retargetable SVG geometry interpolation. Values are keyed so reordering a series never transfers its motion to a neighbor. */
function useAnimatedValues(keys:string[],values:number[],enabled=true,duration=180,seeds?:Map<string,number>):number[]{
  const signature=JSON.stringify([keys,values,seeds?[...seeds]:null]),targets=useMemo(()=>values.map(finite),[signature]),keyList=useMemo(()=>keys.slice(),[signature]);
  const current=useRef(new Map<string,number>()),[shown,setShown]=useState<Map<string,number>>(()=>new Map());
  useLayoutEffect(()=>{
    const from=targets.map((value,index)=>current.current.get(keyList[index])??seeds?.get(keyList[index])??value),toMap=new Map(keyList.map((key,index)=>[key,targets[index]])),fromMap=new Map(keyList.map((key,index)=>[key,from[index]]));
    const reduced=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if(!enabled||reduced||typeof requestAnimationFrame==='undefined'||targets.every((value,index)=>value===from[index])){
      current.current=toMap;setShown(toMap);return;
    }
    setShown(fromMap);let frame=0,started:number|null=null,cancelled=false;
    const tick=(time:number)=>{if(cancelled)return;if(started===null)started=time;const progress=Math.min(1,(time-started)/duration),eased=1-Math.pow(1-progress,3),next=targets.map((value,index)=>from[index]+(value-from[index])*eased),nextMap=new Map(keyList.map((key,index)=>[key,next[index]]));current.current=nextMap;setShown(nextMap);if(progress<1)frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);const media=typeof window!=='undefined'?window.matchMedia?.('(prefers-reduced-motion: reduce)'):undefined,onPreference=()=>{if(media?.matches){cancelled=true;if(typeof cancelAnimationFrame!=='undefined')cancelAnimationFrame(frame);current.current=toMap;setShown(toMap);}};media?.addEventListener?.('change',onPreference);return()=>{cancelled=true;if(typeof cancelAnimationFrame!=='undefined')cancelAnimationFrame(frame);media?.removeEventListener?.('change',onPreference);};
  },[signature,enabled,duration]);
  return keyList.map((key,index)=>shown.get(key)??targets[index]);
}
function parseCssRgb(value:string):[number,number,number,number]|null {
  const hex=value.trim().match(/^#([0-9a-f]{3,8})$/i);
  if(hex){const raw=hex[1],expanded=raw.length===3||raw.length===4?[...raw].map(c=>c+c).join(''):raw;return [parseInt(expanded.slice(0,2),16),parseInt(expanded.slice(2,4),16),parseInt(expanded.slice(4,6),16),expanded.length===8?parseInt(expanded.slice(6,8),16)/255:1];}
  const channel=(part:string)=>part.endsWith('%')?Math.max(0,Math.min(1,Number(part.slice(0,-1))/100))*255:Number(part);
  const rgb=value.match(/rgba?\(([^)]+)\)/i);if(rgb){const parts=rgb[1].split(/[ ,/]+/).filter(Boolean);return parts.length>=3?[channel(parts[0]),channel(parts[1]),channel(parts[2]),parts[3]?.endsWith('%')?Number(parts[3].slice(0,-1))/100:Number(parts[3]??1)]:null;}
  const srgb=value.match(/^color\(\s*srgb(-linear)?\s+([^)]*)\)$/i);if(srgb){const parts=srgb[2].trim().split(/[\s/]+/).filter(Boolean);if(parts.length<3)return null;const raw=parts.slice(0,3).map(part=>part.endsWith('%')?Number(part.slice(0,-1))/100:Number(part)),linear=srgb[1]?raw:raw.map(value=>value<=.04045?value/12.92:Math.pow((value+.055)/1.055,2)),encoded=linear.map(value=>(value<=.0031308?12.92*value:1.055*Math.pow(value,1/2.4)-.055)*255);return [encoded[0],encoded[1],encoded[2],parts[3]?.endsWith('%')?Number(parts[3].slice(0,-1))/100:Number(parts[3]??1)];}
  const oklch=value.match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)(deg|rad|turn)?(?:\s*\/\s*([\d.]+%?))?\s*\)$/i);if(oklch){const L=oklch[1].endsWith('%')?Number(oklch[1].slice(0,-1))/100:Number(oklch[1]),C=oklch[2].endsWith('%')?Number(oklch[2].slice(0,-1))*.004:Number(oklch[2]),angle=Number(oklch[3])*(oklch[4]?.toLowerCase()==='rad'?180/Math.PI:oklch[4]?.toLowerCase()==='turn'?360:1)*Math.PI/180,a=C*Math.cos(angle),b=C*Math.sin(angle),l=Math.pow(L+.3963377774*a+.2158037573*b,3),m=Math.pow(L-.1055613458*a-.0638541728*b,3),s=Math.pow(L-.0894841775*a-1.291485548*b,3),linear=[4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s],encoded=linear.map(value=>Math.max(0,Math.min(1,value<=.0031308?12.92*value:1.055*Math.pow(value,1/2.4)-.055))*255),alpha=oklch[5]?.endsWith('%')?Number(oklch[5].slice(0,-1))/100:Number(oklch[5]??1);return [encoded[0],encoded[1],encoded[2],alpha];}
  return null;
}
function luminance(color:[number,number,number,number]){const channel=(value:number)=>{const linear=value/255;return linear<=.04045?linear/12.92:Math.pow((linear+.055)/1.055,2);};return .2126*channel(color[0])+.7152*channel(color[1])+.0722*channel(color[2]);}

function interactive(e:KeyboardEvent<SVGElement>,activate:()=>void){if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}}
function safeSeries(series:ChartSeries[],labels?:string[]){return series.map(s=>({...s,values:s.values.map(finite),name:s.name, labels:labels??s.values.map((_,i)=>String(i+1))}));}
function xy(values:number[],i:number,count:number,height:number,min:number,max:number){const x=76+(count<=1?0:i*(528/(count-1))); const y=height-24-((values[i]-min)/(max-min||1))*(height-48);return [x,y] as const;}
function pathFor(points:ReadonlyArray<readonly [number,number]>,curve:'linear'|'smooth'){if(!points.length)return '';if(points.length===1)return `M ${points[0][0]} ${points[0][1]}`;if(curve==='linear')return `M ${points[0][0]} ${points[0][1]} ${points.slice(1).map(([x,y])=>`L ${x} ${y}`).join(' ')}`;let path=`M ${points[0][0]} ${points[0][1]}`;for(let i=0;i<points.length-1;i++){const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)],c1:[number,number]=[p1[0]+(p2[0]-p0[0])/6,p1[1]+(p2[1]-p0[1])/6],c2:[number,number]=[p2[0]-(p3[0]-p1[0])/6,p2[1]-(p3[1]-p1[1])/6];path+=` C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;}return path;}

export interface LineChartProps extends ChartBaseProps {
  series: ChartSeries[]; labels?: string[]; onPointSelect?: (series:string,index:number)=>void;
  hiddenSeries?: string[]; defaultHiddenSeries?: string[]; onHiddenSeriesChange?: (ids:string[])=>void;
  area?: boolean; dashed?: boolean; curve?:'linear'|'smooth'; loading?: boolean; emptyLabel?: string; formatValue?: (value:number)=>string; formatTick?: (value:number)=>string;
}
export function LineChart({ label, series, labels, onPointSelect, hiddenSeries, defaultHiddenSeries = [], onHiddenSeriesChange, area = false, dashed = false, curve='smooth', loading = false, emptyLabel: suppliedEmptyLabel, formatValue: suppliedFormatValue, formatTick: suppliedFormatTick, height = 220, ...props }: LineChartProps) {
  const chartLocale = useLocale();
  const fmt = useChartFormat();
  const formatValue = suppliedFormatValue ?? fmt;
  const formatTick = suppliedFormatTick ?? ((value: number) => new Intl.NumberFormat(chartLocale, { notation: 'compact', maximumFractionDigits: 1 }).format(value));

  const t = useTranslate();
  const emptyLabel = suppliedEmptyLabel === undefined ? (t("Нет данных", "No data")) : suppliedEmptyLabel;

  const s = safeSeries(series, labels);
  const ids = s.map((ser, index) => ser.id ?? `${ser.name}:${index}`);
  const allKeys = s.flatMap((ser, si) => ser.values.map((_, i) => `${ids[si]}:${i}`));
  const allValues = s.flatMap(ser => ser.values);
  const animated = useAnimatedValues(allKeys, allValues, props.animate !== false);
  const animatedSeries = s.map((ser, si) => {
    const start = s.slice(0, si).reduce((sum, item) => sum + item.values.length, 0);
    return { ...ser, values: animated.slice(start, start + ser.values.length) };
  });
  const [ownHidden, setOwnHidden] = useState<string[]>(defaultHiddenSeries);
  const hidden = hiddenSeries ?? ownHidden;
  const [active, setActive] = useState<[number, number] | null>(null);
  const effectiveHidden = hidden.length >= s.length ? [] : hidden;
  const visible = animatedSeries.filter((_, i) => !effectiveHidden.includes(ids[i]));
  const visibleSource = s.filter((_, i) => !effectiveHidden.includes(ids[i]));
  const vals = visible.flatMap(item => item.values);
  const min = Math.min(0, ...vals), max = Math.max(0, ...vals);
  const count = Math.max(1, ...visible.map(item => item.values.length));
  const axisIndexes=labels?.length?labels.flatMap((value,index)=>value?[index]:[]):[];
  const axisStride=Math.max(1,Math.ceil(axisIndexes.length/6));
  const axisTicks=axisIndexes.filter((_,index)=>index%axisStride===0||index===axisIndexes.length-1);
  const activeSeries = active && visible.includes(animatedSeries[active[0]]) ? animatedSeries[active[0]] : null;
  const activeDatum = activeSeries && active ? activeSeries.values[active[1]] : undefined;
  const defaultPoint:[number,number]=[visible.length?animatedSeries.indexOf(visible[0]):0,0],focusedPoint=active&&visible.includes(animatedSeries[active[0]])?active:defaultPoint;
  const movePoint=(event:KeyboardEvent<SVGCircleElement>,seriesIndex:number,index:number)=>{const choices=visible.map(item=>animatedSeries.indexOf(item));let nextSeries=seriesIndex,nextIndex=index;if(event.key==='Home')nextIndex=0;else if(event.key==='End')nextIndex=Math.max(0,animatedSeries[seriesIndex]?.values.length-1);else if(event.key==='ArrowLeft')nextIndex=Math.max(0,index-1);else if(event.key==='ArrowRight')nextIndex=Math.min(Math.max(0,animatedSeries[seriesIndex]?.values.length-1),index+1);else if(event.key==='ArrowUp'||event.key==='ArrowDown'){const at=choices.indexOf(seriesIndex),pos=Math.max(0,Math.min(choices.length-1,at+(event.key==='ArrowDown'?1:-1)));nextSeries=choices[pos]??seriesIndex;nextIndex=Math.min(index,Math.max(0,animatedSeries[nextSeries]?.values.length-1));}else return;event.preventDefault();setActive([nextSeries,nextIndex]);event.currentTarget.ownerSVGElement?.querySelector<SVGCircleElement>(`[data-series-index="${nextSeries}"][data-point-index="${nextIndex}"]`)?.focus();};
  const toggle = (id: string) => {
    const next = hidden.includes(id) ? hidden.filter(item => item !== id) : hidden.length < s.length - 1 ? [...hidden, id] : hidden;
    if (hiddenSeries === undefined) setOwnHidden(next);
    onHiddenSeriesChange?.(next);
  };
  return (
    <div className="cap-chart-interactive">
      <Frame label={label} height={height} rows={visibleSource.flatMap(x => x.values.map((v, i) => [x.labels[i] ?? String(i + 1), x.name, formatValue(v)]))} {...props}>
        {[0, .25, .5, .75, 1].map((r, i) => {const y=24+r*(height-48),value=max-r*(max-min);return <g key={i}><line className="cap-chart-grid" x1="72" x2="620" y1={y} y2={y}/><text className="cap-chart-axis-label" x="66" y={y+4} textAnchor="end">{formatTick(value)}</text></g>;})}
        {axisTicks.map(index=>{const x=76+(count<=1?0:index*528/(count-1));return <text key={`axis:${index}`} className="cap-chart-axis-label cap-chart-x-label" x={x} y={height-4} textAnchor={index===0?'start':index===count-1?'end':'middle'}>{labels?.[index]}</text>;})}
        {loading ? <text className="cap-chart-axis-label" x="320" y={height / 2} textAnchor="middle">{t("Загрузка…", "Loading…")}</text> : !visible.length || !visible.some(ser => ser.values.length) ? <text className="cap-chart-axis-label" x="320" y={height / 2} textAnchor="middle">{emptyLabel}</text> : visible.map(ser => {
          const si = animatedSeries.indexOf(ser), color = ser.color ?? palette[si % palette.length];
          const points = ser.values.map((_, i) => xy(ser.values, i, count, height, min, max));
          const linePoints = points.map(point => point.join(',')).join(' '),path=pathFor(points,curve);
          const areaPath = points.length > 1 ? `${path} L ${points.at(-1)?.[0]} ${height-24} L ${points[0][0]} ${height-24} Z` : '';
          return <g key={ids[si]} data-series={ser.name}>
            {area && areaPath && <path className="cap-chart-line-area" d={areaPath} fill={color} />}
            {curve==='smooth'?<path className="cap-chart-line" data-dashed={dashed || undefined} fill="none" stroke={color} d={path}/>:<polyline className="cap-chart-line" data-dashed={dashed || undefined} fill="none" stroke={color} points={linePoints}/ >}
            {ser.values.map((v, i) => {
              const [x, y] = points[i], selected = active?.[0] === si && active[1] === i;
              return <circle key={i} className="cap-chart-point" cx={x} cy={y} r={selected ? 6 : 4} fill={color} data-series-index={si} data-point-index={i} tabIndex={focusedPoint[0]===si&&focusedPoint[1]===i?0:-1} role="button" aria-label={`${ser.name}, ${ser.labels[i] ?? i + 1}: ${formatValue(v)}`} onFocus={() => setActive([si, i])} onMouseEnter={() => setActive([si, i])} onClick={() => { setActive([si, i]); onPointSelect?.(ser.name, i); }} onKeyDown={e => {if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))movePoint(e,si,i);else interactive(e, () => { setActive([si, i]); onPointSelect?.(ser.name, i); });}} />;
            })}
          </g>;
        })}
        {active && activeSeries && activeDatum !== undefined && (() => {
          const [x] = xy(activeSeries.values, active[1], count, height, min, max);
          return <g className="cap-chart-crosshair" aria-hidden="true"><line x1={x} x2={x} y1="24" y2={height - 24} /><text x={Math.max(40, Math.min(520, x + 8))} y="16">{activeSeries.labels[active[1]] ?? active[1] + 1} · {activeSeries.name}: {formatValue(activeDatum)}</text></g>;
        })()}
      </Frame>
      <div className="cap-chart-legend" aria-label={`${label}${t(" серий", " series")}`}>
        {s.map((item, index) => <button type="button" key={ids[index]} data-hidden={effectiveHidden.includes(ids[index]) || undefined} aria-pressed={!effectiveHidden.includes(ids[index])} onClick={() => toggle(ids[index])}><span className="cap-chart-legend-swatch" style={{ '--cap-series-color': item.color ?? palette[index % palette.length] } as CSSProperties} />{item.name}</button>)}
      </div>
    </div>
  );
}

export interface BarChartProps extends ChartBaseProps { data: ChartDatum[]; showAverage?: boolean; averageLabel?: string; formatValue?: (value:number)=>string; onSelect?: (datum:ChartDatum,index:number)=>void; onActiveChange?: (datum:ChartDatum|null,index:number|null)=>void }
export function BarChart({label,data,onSelect,onActiveChange,showAverage=true,averageLabel: suppliedAverageLabel,formatValue: suppliedFormatValue,height=220,...props}:BarChartProps){
  const chartLocale = useLocale();
  const fmt = useChartFormat();
  const formatValue = suppliedFormatValue ?? fmt;

  const t = useTranslate();
  const averageLabel = suppliedAverageLabel === undefined ? (t("Среднее", "Average")) : suppliedAverageLabel;
const targetRows=data.map(d=>({...d,value:finite(d.value)})),animatedValues=useAnimatedValues(targetRows.map((d,i)=>d.id??`${d.label}:${i}`),targetRows.map(d=>d.value),props.animate!==false),rows=targetRows.map((d,i)=>({...d,value:animatedValues[i]})),[active,setActive]=useState<number|null>(null),average=rows.length?rows.reduce((sum,d)=>sum+d.value,0)/rows.length:0,rawMin=Math.min(0,...rows.map(d=>d.value)),rawMax=Math.max(0,...rows.map(d=>d.value)),emptyOrZero=rawMin===0&&rawMax===0,domainMin=rawMin,domainMax=emptyOrZero?1:rawMax,span=domainMax-domainMin||1,plotTop=24,plotHeight=Math.max(1,height-48),y=(v:number)=>plotTop+(domainMax-v)/span*plotHeight,zero=y(0),activate=(index:number|null)=>{setActive(index);onActiveChange?.(index===null?null:rows[index]??null,index)};return <div className="cap-bar-chart"><p className="cap-chart-range" aria-live="polite">{active===null?`${averageLabel}: ${formatValue(average)}`:`${rows[active]?.label}: ${formatValue(rows[active]?.value??0)}`}</p><Frame label={label} height={height} rows={rows.map(d=>[d.label,t("Значение", "Value"),formatValue(d.value)])} {...props}>{[0,.25,.5,.75,1].map((r,i)=><line key={i} className="cap-chart-grid" x1="32" x2="620" y1={plotTop+r*plotHeight} y2={plotTop+r*plotHeight}/>)}<line className="cap-chart-zero" x1="32" x2="620" y1={zero} y2={zero}/>{showAverage&&rows.length>0&&<g className="cap-chart-average" aria-hidden="true"><line x1="32" x2="620" y1={y(average)} y2={y(average)}/></g>}{rows.map((d,i)=>{const slot=588/Math.max(rows.length,1),w=Math.min(44,slot*.66),x=36+i*slot+(slot-w)/2,barY=d.value>0?y(d.value):d.value<0?zero:Math.max(plotTop,zero-.5),barHeight=Math.abs(y(d.value)-zero);return <rect key={d.id??`${d.label}:${i}`} className="cap-chart-bar" x={x} y={barY} width={w} height={Math.max(1,barHeight)} rx="5" fill={d.color??'var(--cap-accent-solid-normal)'} tabIndex={active===i||active===null&&i===0?0:-1} role="button" aria-label={`${d.label}: ${formatValue(d.value)}`} onFocus={()=>activate(i)} onMouseEnter={()=>activate(i)} onMouseLeave={e=>{if(document.activeElement!==e.currentTarget)activate(null)}} onBlur={e=>{if(!e.currentTarget.matches(':hover'))activate(null)}} onClick={()=>onSelect?.(d,i)} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'||e.key==='Home'||e.key==='End'){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?rows.length-1:Math.max(0,Math.min(rows.length-1,i+(e.key==='ArrowRight'?1:-1)));activate(next);(e.currentTarget.parentElement?.querySelectorAll<SVGRectElement>('.cap-chart-bar')[next])?.focus();return;}interactive(e,()=>onSelect?.(d,i))}}><title>{d.label}: {formatValue(d.value)}</title></rect>})}</Frame></div>}

export interface DonutChartProps extends ChartBaseProps {
  data: ChartDatum[]; totalLabel?: string; onSelect?: (datum:ChartDatum,index:number)=>void;
  activeKey?: string|null; defaultActiveKey?: string|null; onActiveChange?: (key:string|null)=>void;
  hiddenKeys?: string[]; defaultHiddenKeys?: string[]; onHiddenKeysChange?: (keys:string[])=>void;
  legend?: boolean; legendAction?: 'toggle'|'select'; emptyLabel?: string;
}
export function DonutChart({label,data,totalLabel: suppliedTotalLabel,onSelect,activeKey,defaultActiveKey=null,onActiveChange,hiddenKeys,defaultHiddenKeys=[],onHiddenKeysChange,legend=true,legendAction='select',emptyLabel: suppliedEmptyLabel,height=250,...props}:DonutChartProps){
  const chartLocale = useLocale();
  const fmt = useChartFormat();

  const t = useTranslate();
  const totalLabel = suppliedTotalLabel === undefined ? (t("Всего", "Total")) : suppliedTotalLabel;
  const emptyLabel = suppliedEmptyLabel === undefined ? (t("Нет данных", "No data")) : suppliedEmptyLabel;

  const targetRows=data.map((d,i)=>({...d,value:Math.max(0,finite(d.value)),id:d.id??`${d.label}:${i}`}));
  const animatedValues=useAnimatedValues(targetRows.map(row=>row.id),targetRows.map(row=>row.value),props.animate!==false),rows=targetRows.map((row,index)=>({...row,value:animatedValues[index]}));
  const [ownActive,setOwnActive]=useState<string|null>(defaultActiveKey),active=activeKey===undefined?ownActive:activeKey;
  const [ownHidden,setOwnHidden]=useState<string[]>(defaultHiddenKeys),hidden=hiddenKeys??ownHidden;
  const activeIndex=rows.findIndex((row,index)=>row.id===active&&row.value>0&&!hidden.includes(row.id));
  const visible=rows.filter(row=>row.value>0&&!hidden.includes(row.id)),sum=visible.reduce((a,d)=>a+d.value,0),activeDatum=activeIndex>=0?rows[activeIndex]:null;
  const setActive=(key:string|null)=>{if(activeKey===undefined)setOwnActive(key);onActiveChange?.(key);};
  const toggleHidden=(key:string)=>{const next=hidden.includes(key)?hidden.filter(item=>item!==key):[...hidden,key];if(hiddenKeys===undefined)setOwnHidden(next);onHiddenKeysChange?.(next);};
  let offset=0;const cx=320,cy=height/2,r=Math.max(24,Math.min(92,height/2-16)),circ=2*Math.PI*r;
  const centerValue=activeDatum?.value??sum,centerLabel=activeDatum?.label??totalLabel,focusIndex=activeIndex>=0?activeIndex:rows.findIndex(row=>row.value>0&&!hidden.includes(row.id));
  return <div className="cap-donut-chart"><Frame label={label} height={height} rows={rows.map(d=>[d.label,t("Значение", "Value"),fmt(d.value)])} {...props}><g transform={`rotate(-90 ${cx} ${cy})`}><circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--cap-control-bg)" strokeWidth="28"/>{visible.map(d=>{const i=rows.indexOf(d),len=d.value/sum*circ,start=offset;offset+=len;return <circle key={d.id} className={`cap-chart-arc${active===d.id?' is-active':''}`} cx={cx} cy={cy} r={r} fill="none" stroke={d.color??palette[i%palette.length]} strokeWidth={active===d.id?'32':'28'} strokeDasharray={`${len} ${circ-len}`} strokeDashoffset={-start} tabIndex={focusIndex===i?0:-1} role="button" aria-label={`${d.label}: ${fmt(d.value)}`} aria-pressed={active===d.id} onFocus={()=>setActive(d.id)} onMouseEnter={()=>setActive(d.id)} onMouseLeave={e=>{if(document.activeElement!==e.currentTarget)setActive(null)}} onBlur={e=>{if(!e.currentTarget.matches(':hover'))setActive(null)}} onClick={()=>{setActive(d.id);onSelect?.(d,i)}} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const eligible=visible.map(item=>rows.indexOf(item)),at=eligible.indexOf(i),next=eligible[Math.max(0,Math.min(eligible.length-1,at+(e.key==='ArrowRight'?1:-1)))];setActive(rows[next]?.id??null);(e.currentTarget.parentElement?.querySelectorAll<SVGCircleElement>('.cap-chart-arc')[Math.max(0,at+(e.key==='ArrowRight'?1:-1))])?.focus();return;}interactive(e,()=>onSelect?.(d,i))}}><title>{d.label}: {fmt(d.value)}</title></circle>})}</g>{sum>0?<><text className="cap-chart-center-value" x={cx} y={cy-2} textAnchor="middle">{fmt(centerValue)}</text><text className="cap-chart-center-label" x={cx} y={cy+18} textAnchor="middle">{centerLabel}</text></>:<text className="cap-chart-center-label" x={cx} y={cy} textAnchor="middle">{emptyLabel}</text>}</Frame>{legend&&rows.length>0&&<div className="cap-chart-legend" aria-label={`${label}${t(" категорий", " categories")}`}>{rows.map((item,index)=>{const isHidden=hidden.includes(item.id),isActive=active===item.id;return <button type="button" key={item.id} aria-pressed={legendAction==='toggle'?!isHidden:isActive} data-hidden={isHidden||undefined} onMouseEnter={()=>!isHidden&&setActive(item.id)} onFocus={()=>!isHidden&&setActive(item.id)} onClick={()=>legendAction==='toggle'?toggleHidden(item.id):(setActive(item.id),onSelect?.(item,index))}><span className="cap-chart-legend-swatch" style={{'--cap-series-color':item.color??palette[index%palette.length]} as CSSProperties}/>{item.label}</button>})}</div>}</div>;
}

export interface StreamgraphProps extends ChartBaseProps {
  series: ChartSeries[]; labels?: string[]; onLayerSelect?: (name:string,index:number)=>void;
  offset?: 'wiggle'|'silhouette'|'zero'; hiddenSeries?: string[]; defaultHiddenSeries?: string[];
  onHiddenSeriesChange?: (hidden:string[])=>void; onActiveChange?: (index:number|null,series:string|null)=>void;
  legend?: boolean; directLabels?: boolean;
}
export function Streamgraph({label,series,labels,onLayerSelect,offset='wiggle',hiddenSeries,defaultHiddenSeries=[],onHiddenSeriesChange,onActiveChange,legend=true,directLabels=true,height=240,...props}:StreamgraphProps){
  const chartLocale = useLocale();
  const fmt = useChartFormat();

  const t = useTranslate();

  const targets=safeSeries(series,labels),seriesIds=targets.map((item,index)=>item.id??`${item.name}:${index}`),keys=targets.flatMap((item,si)=>item.values.map((_,i)=>`${seriesIds[si]}:${i}`)),rawValues=targets.flatMap(item=>item.values),animated=useAnimatedValues(keys,rawValues,props.animate!==false),s=targets.map((item,si)=>{const start=targets.slice(0,si).reduce((sum,row)=>sum+row.values.length,0);return {...item,values:animated.slice(start,start+item.values.length)};}),count=Math.max(1,...s.map(item=>item.values.length));
  const [ownHidden,setOwnHidden]=useState<string[]>(defaultHiddenSeries),[isolated,setIsolated]=useState<string|null>(null),[active,setActive]=useState<{index:number;series:number}|null>(null);
  const seriesKey=(item:ChartSeries)=>item.id??item.name;
  const hidden=hiddenSeries??ownHidden,visible=s.map((item,index)=>({item,index})).filter(({item})=>!hidden.includes(seriesKey(item)));
  const positiveTotals=Array.from({length:count},(_,i)=>visible.reduce((sum,{item})=>sum+Math.max(0,item.values[i]??0),0));
  const negativeTotals=Array.from({length:count},(_,i)=>visible.reduce((sum,{item})=>sum+Math.min(0,item.values[i]??0),0));
  const baseline=Array(count).fill(0) as number[];
  if(offset==='silhouette') for(let i=0;i<count;i++) baseline[i]=-positiveTotals[i]/2;
  if(offset==='wiggle'&&visible.length>1){for(let i=1;i<count;i++){let weightedSlope=0;for(let j=0;j<visible.length;j++){const now=Math.max(0,visible[j].item.values[i]??0),before=Math.max(0,visible[j].item.values[i-1]??0);weightedSlope+=(now-before)*(visible.length-j-.5);}baseline[i]=baseline[i-1]-weightedSlope/(positiveTotals[i]||1);}const minBase=Math.min(...baseline),maxTop=Math.max(...baseline.map((value,i)=>value+positiveTotals[i]));const shift=-(minBase+maxTop)/2;for(let i=0;i<count;i++)baseline[i]+=shift;}
  const rawDomainMin=Math.min(0,...baseline.map((value,i)=>value+negativeTotals[i])),rawDomainMax=Math.max(0,...baseline.map((value,i)=>value+positiveTotals[i])),allZero=rawDomainMin===0&&rawDomainMax===0,domainMin=allZero?-1:rawDomainMin,domainMax=allZero?1:rawDomainMax,span=domainMax-domainMin||1,top=24,plotHeight=Math.max(1,height-48),y=(value:number)=>top+(domainMax-value)/span*plotHeight,xAt=(i:number)=>36+i*456/Math.max(1,count-1);
  let positive=baseline.slice(),negative=baseline.slice();
  const layers=visible.map(({item:ser,index:si})=>{
    const lowerPos=positive,lowerNeg=negative,values=Array.from({length:count},(_,i)=>ser.values[i]??0);
    const upperPos=lowerPos.map((v,i)=>v+Math.max(0,values[i])),upperNeg=lowerNeg.map((v,i)=>v+Math.min(0,values[i]));
    const lower=values.map((value,i)=>value<0?lowerNeg[i]:lowerPos[i]),upper=values.map((value,i)=>value<0?upperNeg[i]:upperPos[i]);
    const points=`${upper.map((v,i)=>`${xAt(i)},${y(v)}`).join(' ')} ${lower.map((v,i)=>`${xAt(i)},${y(v)}`).reverse().join(' ')}`;
    positive=upperPos;negative=upperNeg;
    return {ser,si,color:ser.color??palette[si%palette.length],points,center:upper.map((v,i)=>(v+lower[i])/2)};
  });
  const toggle=(key:string)=>{const next=hidden.includes(key)?hidden.filter(item=>item!==key):[...hidden,key];if(hiddenSeries===undefined)setOwnHidden(next);if(isolated===key)setIsolated(null);onHiddenSeriesChange?.(next);};
  const activeValue=active?layers.find(layer=>layer.si===active.series)?.ser.values[active.index]:undefined;
  const activeText=active&&activeValue!==undefined?`${labels?.[active.index]??active.index+1} · ${s[active.series]?.name}: ${fmt(activeValue)}`:null;
  const activateAt=(event:ReactPointerEvent<SVGGElement>,si:number)=>{const svg=event.currentTarget.ownerSVGElement;if(!svg)return;const rect=svg.getBoundingClientRect(),ratio=rect.width?(event.clientX-rect.left)/rect.width:0,index=Math.max(0,Math.min(count-1,Math.round(((ratio*640-36)/456)*Math.max(1,count-1))));setActive({index,series:si});onActiveChange?.(index,s[si]?.name??null);};
  const clearActive=()=>{setActive(null);onActiveChange?.(null,null);};
  const labelRows=layers.map(layer=>({name:layer.ser.name,color:layer.color,y:y(layer.center[count-1]??0)})).sort((a,b)=>a.y-b.y);
  const labelGap=15,labelMax=height-24,labelMin=24;
  const labelPositions=labelRows.length<=Math.floor((labelMax-labelMin)/labelGap)+1?labelRows.reduce<number[]>((positions,item)=>[...positions,Math.max(item.y,positions.length?positions.at(-1)!+labelGap:labelMin)],[]):[];
  if(labelPositions.length){const overflow=labelPositions.at(-1)!-labelMax;if(overflow>0)for(let i=0;i<labelPositions.length;i++)labelPositions[i]-=overflow;}
  return <div className="cap-chart-interactive"><Frame label={label} height={height} rows={visible.flatMap(({item:x})=>x.values.map((v,i)=>[x.labels[i]??String(i+1),x.name,fmt(v)]))} {...props}><line className="cap-chart-zero" x1="32" x2="500" y1={y(0)} y2={y(0)}/>{layers.map(({ser,si,color,points,center})=>{const focused=active?.series===si,key=seriesKey(ser),isIsolated=isolated===key;return <g key={key} className="cap-chart-layer" data-series={ser.name} opacity={isolated===null||isIsolated?1:.18} role="button" tabIndex={0} aria-label={`${t('Фокус ', 'Focus ')}${ser.name}`} aria-pressed={isIsolated} onPointerMove={event=>activateAt(event,si)} onPointerLeave={event=>{if(document.activeElement!==event.currentTarget)clearActive()}} onFocus={()=>{setActive({index:0,series:si});onActiveChange?.(0,key)}} onBlur={clearActive} onClick={()=>{setIsolated(isIsolated?null:key);onLayerSelect?.(ser.name,si)}} onKeyDown={e=>interactive(e,()=>{setIsolated(isIsolated?null:key);onLayerSelect?.(ser.name,si)})}><polygon className="cap-chart-area" points={points} fill={color}/>{focused&&active&&activeValue!==undefined&&<circle className="cap-stream-active-point" cx={xAt(active.index)} cy={y(center[active.index])} r="4" fill={color}/>}</g>})}{directLabels&&labelPositions.length>0&&<g className="cap-stream-labels" aria-hidden="true">{labelRows.map((item,index)=><g key={`${item.name}:${index}`}><line className="cap-stream-label-leader" x1="498" x2="508" y1={item.y} y2={labelPositions[index]}/><text className="cap-stream-label" x="512" y={labelPositions[index]+4} textAnchor="start">{item.name}</text></g>)}</g>}{active&&<g className="cap-chart-crosshair" aria-hidden="true"><line x1={xAt(active.index)} x2={xAt(active.index)} y1="24" y2={height-24}/>{activeText&&<text x={Math.max(36,Math.min(520,xAt(active.index)+8))} y="16">{activeText}</text>}</g>}</Frame>{legend&&<div className="cap-chart-legend" aria-label={`${label}${t(" слоёв", " layers")}`}>{s.map((item,index)=>{const key=seriesKey(item),isHidden=hidden.includes(key);return <button type="button" key={key} aria-pressed={!isHidden} data-hidden={isHidden||undefined} onClick={()=>toggle(key)}><span className="cap-chart-legend-swatch" style={{'--cap-series-color':item.color??palette[index%palette.length]} as CSSProperties}/>{item.name}</button>})}</div>}</div>;
}

export interface ChartEvent { index:number; label:string; color?:string }
export interface BrushChartProps extends ChartBaseProps {
  series: ChartSeries[]; labels?: string[]; initialRange?: [number,number]; range?: [number,number];
  onRangeChange?: (range:[number,number])=>void; annotations?: ChartEvent[];
  formatRange?: (start:string,end:string)=>string;
}
export function BrushChart({label,series,labels,initialRange,range,onRangeChange,annotations=[],formatRange=(start,end)=>`${start}–${end}`,height=260,...props}:BrushChartProps){
  const chartLocale = useLocale();
  const fmt = useChartFormat();

  const t = useTranslate();

  const s=safeSeries(series,labels),n=Math.max(1,...s.map(x=>x.values.length));
  const [ownRange,setOwnRange]=useState<[number,number]>(initialRange??[0,Math.max(0,n-1)]),drag=useRef<{mode:'start'|'end'|'window'|'track';x:number;range:[number,number]}|null>(null);
  const sourceRange=range??ownRange;
  const safeRange:[number,number]=[Math.max(0,Math.min(n-1,Math.min(Math.round(sourceRange[0]),Math.round(sourceRange[1])))),Math.max(0,Math.min(n-1,Math.max(Math.round(sourceRange[0]),Math.round(sourceRange[1]))))];
  const rangeLabel=formatRange(labels?.[safeRange[0]]??String(safeRange[0]+1),labels?.[safeRange[1]]??String(safeRange[1]+1));
  const vals=s.flatMap(x=>x.values),min=Math.min(0,...vals),max=Math.max(0,...vals),span=max-min||1,plotY=(v:number)=>50-((v-min)/span)*40,xAt=(i:number)=>24+i*592/Math.max(n-1,1);
  const indexAt=(svg:SVGSVGElement,clientX:number)=>{const rect=svg.getBoundingClientRect(),x=Number.isFinite(clientX)?clientX:rect.left;if(!rect.width)return 0;return Math.max(0,Math.min(n-1,Math.round((((x-rect.left)/rect.width)*640-24)*Math.max(n-1,1)/592)));};
  const update=(next:[number,number])=>{const normalized:[number,number]=[Math.max(0,Math.min(n-1,Math.round(next[0]))),Math.max(0,Math.min(n-1,Math.round(next[1])))];if(range===undefined)setOwnRange(normalized);onRangeChange?.(normalized);};
  const moveHandle=(which:'start'|'end',next:number)=>which==='start'?update([Math.min(next,safeRange[1]),safeRange[1]]):update([safeRange[0],Math.max(next,safeRange[0])]);
  const pointerDown=(e:ReactPointerEvent<SVGSVGElement>)=>{const svg=e.currentTarget,target=e.target as SVGElement,mode=(target.dataset.mode as 'start'|'end'|'window'|'track'|undefined)??'track',index=indexAt(svg,e.clientX);drag.current={mode,x:index,range:safeRange};try{svg.setPointerCapture?.(e.pointerId);}catch{}if(mode==='track'){const dStart=Math.abs(index-safeRange[0]),dEnd=Math.abs(index-safeRange[1]);moveHandle(dStart<=dEnd?'start':'end',index);drag.current=null;}};
  const pointerMove=(e:ReactPointerEvent<SVGSVGElement>)=>{if(!drag.current)return;const info=drag.current,index=indexAt(e.currentTarget,e.clientX);if(info.mode==='window'){const delta=index-info.x,length=info.range[1]-info.range[0],start=Math.max(0,Math.min(n-1-length,info.range[0]+delta));update([start,start+length]);}else if(info.mode==='start'||info.mode==='end')moveHandle(info.mode,index);};
  const pointerUp=(e:ReactPointerEvent<SVGSVGElement>)=>{drag.current=null;try{e.currentTarget.releasePointerCapture?.(e.pointerId);}catch{}};
  const startX=xAt(safeRange[0]),endX=xAt(safeRange[1]),selectedWidth=Math.max(8,endX-startX);
  return <div className="cap-brush-chart"><p className="cap-chart-range" aria-live="polite">{t("Выбранный период:", "Selected range:")} {rangeLabel}</p><div className="cap-brush-main"><LineChart label={label} series={s.map(x=>({...x,values:x.values.slice(safeRange[0],safeRange[1]+1)}))} labels={labels?.slice(safeRange[0],safeRange[1]+1)} height={height-50} {...props}/></div><div className="cap-brush-overview"><svg role="group" aria-label={`${label}${t(" обзор с границами периода", " overview with range handles")}`} viewBox="0 0 640 58" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onPointerLeave={pointerUp}><rect className="cap-brush-track" data-mode="track" x="24" y="6" width="592" height="46" rx="4"/>{s.map((ser,si)=><polyline key={ser.id??`${ser.name}:${si}`} pointerEvents="none" fill="none" stroke={ser.color??palette[si%palette.length]} strokeWidth="2" points={ser.values.map((v,i)=>`${xAt(i)},${plotY(v)}`).join(' ')}/>)}{annotations.filter(item=>item.index>=0&&item.index<n).map((item,index)=><g key={`${item.index}:${index}`} className="cap-brush-event"><line x1={xAt(item.index)} x2={xAt(item.index)} y1="3" y2="55" stroke={item.color??'var(--cap-accent-solid-normal)'}/><circle cx={xAt(item.index)} cy="8" r="3" fill={item.color??'var(--cap-accent-solid-normal)'}/><title>{item.label}</title></g>)}<rect className="cap-brush-selection" data-mode="window" x={startX} y="7" width={selectedWidth} height="44" rx="4"/><rect className="cap-brush-handle" data-mode="start" x={startX-5} y="5" width="10" height="48" rx="3" aria-hidden="true" tabIndex={-1}/><rect className="cap-brush-handle" data-mode="end" x={endX-5} y="5" width="10" height="48" rx="3" aria-hidden="true" tabIndex={-1}/></svg><div className="cap-brush-controls"><Slider label={t("Начало периода", "Range start")} min={0} max={safeRange[1]} value={safeRange[0]} onChange={e=>update([Number(e.target.value),safeRange[1]])}/><Slider label={t("Конец периода", "Range end")} min={safeRange[0]} max={n-1} value={safeRange[1]} onChange={e=>update([safeRange[0],Number(e.target.value)])}/></div></div></div>;
}

export interface WaffleChartProps extends ChartBaseProps {
  data: ChartDatum[]; columns?: number; rows?: number; decimals?: number; activeKey?:string|null; defaultActiveKey?:string|null;
  onActiveChange?:(id:string|null)=>void; onSelect?: (datum:ChartDatum)=>void; accentKey?:string;
}
export function WaffleChart({label,data,columns=10,rows:rowCount,decimals=2,activeKey,defaultActiveKey=null,onActiveChange,onSelect,accentKey,...props}:WaffleChartProps){
  const chartLocale = useLocale();
  const fmt = useChartFormat();

  const t = useTranslate();

  const cols=Math.max(1,Math.min(20,Math.floor(columns)||10)),rowsCount=Math.max(1,Math.min(20,Math.floor(rowCount??Math.ceil(100/cols))||10)),cellCount=rowCount===undefined?100:cols*rowsCount;
  const clean=data.map((d,i)=>({...d,id:d.id??`${d.label}:${i}`,value:Math.max(0,finite(d.value))})),total=clean.reduce((a,d)=>a+d.value,0),quotas=clean.map(d=>total?d.value/total*cellCount:0),counts=quotas.map(Math.floor);
  let remaining=total>0?cellCount-counts.reduce((a,n)=>a+n,0):0;quotas.map((q,i)=>({i,remainder:q-counts[i]})).sort((a,b)=>b.remainder-a.remainder).slice(0,remaining).forEach(({i})=>counts[i]++);
  const assigned=clean.flatMap((datum,di)=>Array.from({length:counts[di]},(_,position)=>({d:datum,di,key:`${datum.id}:${position}`}))),cells:Array<{d:typeof clean[number]|null;di:number;key:string}>=[...assigned,...Array.from({length:Math.max(0,cellCount-assigned.length)},(_,i)=>({d:null,di:-1,key:`unassigned:${i}`}))].slice(0,cellCount);
  const cellW=588/cols,[ownActive,setOwnActive]=useState<string|null>(defaultActiveKey),active=activeKey===undefined?ownActive:activeKey,activeItem=clean.find(d=>d.id===active)??null;
  const setActive=(key:string|null)=>{if(activeKey===undefined)setOwnActive(key);onActiveChange?.(key);};
  const formatPercent=(value:number)=>`${new Intl.NumberFormat(chartLocale,{minimumFractionDigits:0,maximumFractionDigits:Math.max(0,Math.min(4,decimals))}).format(value)}%`;
  const tableRows=clean.map((d,i)=>[d.label,t("Процент", "Percent"),formatPercent(total?d.value/total*100:0)]);
  const onKey=(e:KeyboardEvent<SVGRectElement>,index:number)=>{let next=index;if(e.key==='ArrowRight')next=Math.min(cellCount-1,index+1);else if(e.key==='ArrowLeft')next=Math.max(0,index-1);else if(e.key==='ArrowDown')next=Math.min(cellCount-1,index+cols);else if(e.key==='ArrowUp')next=Math.max(0,index-cols);else if(e.key==='Home')next=Math.floor(index/cols)*cols;else if(e.key==='End')next=Math.min(cellCount-1,Math.floor(index/cols)*cols+cols-1);else if(e.key==='Enter'||e.key===' '){interactive(e,()=>{const cell=cells[index];if(cell.d){setActive(cell.d.id);onSelect?.(data[cell.di]);}});return;}else return;e.preventDefault();const target=cells[next];if(target?.d)setActive(target.d.id);(e.currentTarget.parentElement?.children[next] as SVGRectElement|undefined)?.focus();};
  const coords=cells.flatMap((_,index)=>[28+(index%cols)*cellW+2,2+Math.floor(index/cols)*cellW+2]),coordKeys=cells.flatMap(cell=>[`${cell.key}:x`,`${cell.key}:y`]),animatedCoords=useAnimatedValues(coordKeys,coords,props.animate!==false),selectedCell=cells.findIndex(cell=>cell.d?.id===active);
  return <div className="cap-waffle-chart">{activeItem&&<p className="cap-chart-range" aria-live="polite">{activeItem.label}: {formatPercent(total?activeItem.value/total*100:0)}</p>}<Frame label={label} height={Math.ceil(cellCount/cols)*cellW} rows={tableRows} {...props}><g role="group" aria-label={`${label}${t(" ячеек", " cells")}`}>{cells.map((cell,index)=><rect key={cell.key} className="cap-chart-cell" data-active={cell.d?.id===active||undefined} x={animatedCoords[index*2]} y={animatedCoords[index*2+1]} width={cellW-4} height={cellW-4} rx="3" fill={!cell.d?'var(--cap-surface-raised)':cell.d.id===accentKey?'var(--cap-accent-solid-normal)':cell.d.color??palette[cell.di%palette.length]} opacity={!cell.d?.id?'.62':active&&cell.d?.id!==active?'.32':1} tabIndex={cell.d?(selectedCell>=0?index===selectedCell?0:-1:index===0?0:-1):-1} role={cell.d?'button':undefined} aria-hidden={!cell.d||undefined} aria-label={cell.d?`${cell.d.label}: ${fmt(cell.d.value)} (${formatPercent(total?cell.d.value/total*100:0)})`:undefined} onFocus={()=>cell.d&&setActive(cell.d.id)} onMouseEnter={()=>cell.d&&setActive(cell.d.id)} onClick={()=>{if(cell.d){setActive(cell.d.id);onSelect?.(data[cell.di]);}}} onKeyDown={cell.d?e=>onKey(e,index):undefined}/>)}</g></Frame><div className="cap-chart-legend" aria-label={`${label}${t(" категорий", " categories")}`}>{clean.map((item,index)=><button type="button" key={item.id} aria-pressed={active===item.id} onClick={()=>setActive(active===item.id?null:item.id)}><span className="cap-chart-legend-swatch" style={{'--cap-series-color':item.id===accentKey?'var(--cap-accent-solid-normal)':item.color??palette[index%palette.length]} as CSSProperties}/>{item.label} <span>{formatPercent(total?item.value/total*100:0)}</span></button>)}</div></div>;
}

function BoundedChartText({ maxWidth, children, ...props }: React.SVGProps<SVGTextElement> & { maxWidth: number }) {
  const ref = useRef<SVGTextElement>(null);
  useLayoutEffect(() => {
    const node = ref.current, svg = node?.ownerSVGElement;
    if (!node || !svg) return;
    const fit = () => {
      node.removeAttribute('textLength');
      const length = node.getComputedTextLength?.() ?? 0;
      if (length > maxWidth) node.setAttribute('textLength', String(maxWidth));
    };
    fit();
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit);
    resize?.observe(svg);
    const observer = new MutationObserver(fit);
    if (svg.parentElement) observer.observe(svg.parentElement, { attributes: true, attributeFilter: ['style'] });
    return () => { resize?.disconnect(); observer.disconnect(); };
  }, [children, maxWidth]);
  return <text {...props} ref={ref} lengthAdjust="spacingAndGlyphs">{children}</text>;
}

export interface SlopeChartProps extends ChartBaseProps { data: SlopeDatum[]; beforeLabel?: string; afterLabel?: string; ranks?: boolean; onSelect?: (datum:SlopeDatum)=>void; onActiveChange?: (datum:SlopeDatum|null,index:number|null)=>void }
export function SlopeChart({label,data,beforeLabel: suppliedBeforeLabel,afterLabel: suppliedAfterLabel,ranks=true,onSelect,onActiveChange,height=240,...props}:SlopeChartProps){
  const chartLocale = useLocale();
  const fmt = useChartFormat();

  const t = useTranslate();
  const beforeLabel = suppliedBeforeLabel === undefined ? (t("До", "Before")) : suppliedBeforeLabel;
  const afterLabel = suppliedAfterLabel === undefined ? (t("После", "After")) : suppliedAfterLabel;

  const targetRows=data.map(d=>({...d,before:finite(d.before),after:finite(d.after)})),animated=useAnimatedValues(targetRows.flatMap((d,i)=>[`${d.label}:${i}:before`,`${d.label}:${i}:after`]),targetRows.flatMap(d=>[d.before,d.after]),props.animate!==false),rows=targetRows.map((d,i)=>({...d,before:animated[i*2],after:animated[i*2+1]})),values=rows.flatMap(d=>[d.before,d.after]),min=Math.min(0,...values),max=Math.max(0,...values),span=max-min||1,y=(v:number)=>height-32-(v-min)/span*(height-64),[active,setActive]=useState<number|null>(null);
  const rankBefore=[...rows.keys()].sort((a,b)=>rows[b].before-rows[a].before),rankAfter=[...rows.keys()].sort((a,b)=>rows[b].after-rows[a].after),r0=new Map(rankBefore.map((index,rank)=>[index,rank+1])),r1=new Map(rankAfter.map((index,rank)=>[index,rank+1]));
  const activate=(index:number|null)=>{setActive(index);onActiveChange?.(index===null?null:rows[index]??null,index)};
  const focusIndex=active??0;
  return <div className="cap-slope-chart"><Frame label={label} height={height} rows={rows.flatMap(d=>[[beforeLabel,d.label,fmt(d.before)],[afterLabel,d.label,fmt(d.after)]])} {...props}><text className="cap-chart-axis-label" x="170" y="18" textAnchor="end">{beforeLabel}</text><text className="cap-chart-axis-label" x="470" y="18">{afterLabel}</text>{rows.map((d,i)=>{const color=d.color??palette[i%palette.length],selected=active===i;return <g key={`${d.label}-${i}`} className="cap-chart-slope" data-active={selected||undefined} tabIndex={focusIndex===i?0:-1} role="button" aria-label={`${d.label}: ${fmt(d.before)}${t(' → ', ' to ')}${fmt(d.after)}${ranks?`${t(", позиция ", ", rank ")}${r0.get(i)}${t(' → ', ' to ')}${r1.get(i)}`:''}`} onFocus={()=>activate(i)} onMouseEnter={()=>activate(i)} onMouseLeave={e=>{if(document.activeElement!==e.currentTarget)activate(null)}} onBlur={e=>{if(!e.currentTarget.matches(':hover'))activate(null)}} onClick={()=>onSelect?.(d)} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='Home'||e.key==='End'){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?rows.length-1:Math.max(0,Math.min(rows.length-1,i+(e.key==='ArrowDown'?1:-1)));activate(next);(e.currentTarget.parentElement?.querySelectorAll<SVGGElement>('.cap-chart-slope')[next])?.focus();return;}interactive(e,()=>onSelect?.(d))}}><line x1="180" x2="460" y1={y(d.before)} y2={y(d.after)} stroke={color}/><circle cx="180" cy={y(d.before)} r={selected?5:4} fill={color}/><circle cx="460" cy={y(d.after)} r={selected?5:4} fill={color}/><BoundedChartText maxWidth={160} className="cap-chart-slope-label" x="172" y={y(d.before)+4} textAnchor="end">{ranks?`#${r0.get(i)} `:''}{d.label} {fmt(d.before)}</BoundedChartText><BoundedChartText maxWidth={160} className="cap-chart-slope-label" x="468" y={y(d.after)+4}>{ranks?`#${r1.get(i)} `:''}{fmt(d.after)}</BoundedChartText></g>})}</Frame>{active!==null&&<p className="cap-chart-range" aria-live="polite">{rows[active]?.label}: {beforeLabel} {fmt(rows[active]?.before??0)} → {afterLabel} {fmt(rows[active]?.after??0)}{ranks?` · #${r0.get(active)} → #${r1.get(active)}`:''}</p>}</div>
}

export interface SparklineProps { values:number[]; label:string; width?:number; height?:number; color?:string; animate?:boolean; labels?:string[]; interactive?:boolean; area?:boolean; formatValue?:(value:number,index:number)=>string; onActiveChange?:(value:number|null,index:number|null)=>void }
export function Sparkline({values,label,width=120,height=32,color=palette[0],animate=true,labels,interactive=true,area=true,formatValue: suppliedFormatValue,onActiveChange}:SparklineProps){
  const chartLocale = useLocale();
  const fmt = useChartFormat();
  const formatValue = suppliedFormatValue ?? fmt;

  const targets=values.map(finite),vals=useAnimatedValues(targets.map((_,index)=>`point:${index}`),targets,animate),min=Math.min(0,...vals),max=Math.max(0,...vals),scale=max-min||1,plotHeight=Math.max(1,height-4),xAt=(i:number)=>vals.length<=1?width/2:i*(width/(vals.length-1)),yAt=(v:number)=>height-2-((v-min)/scale)*plotHeight,points=vals.map((v,i)=>`${xAt(i)},${yAt(v)}`).join(' '),[active,setActive]=useState<number|null>(null),index=active??Math.max(0,vals.length-1),value=vals[index];
  const activate=(next:number|null)=>{setActive(next);onActiveChange?.(next===null?null:vals[next]??null,next)};
  const pointer=(event:ReactPointerEvent<SVGSVGElement>)=>{const rect=event.currentTarget.getBoundingClientRect(),x=rect.width?(event.clientX-rect.left)/rect.width*width:0,next=vals.length?Math.max(0,Math.min(vals.length-1,Math.round(x/width*Math.max(1,vals.length-1)))):null;activate(next);};
  const role=interactive?'group':'img';
  return <span className="cap-sparkline-wrap" style={{'--cap-chart-motion':animate?'1':'0'} as CSSProperties}><svg className="cap-sparkline" role={role} aria-label={`${label}${vals.length?`: ${vals.map((v,i)=>`${labels?.[i]??i+1} ${formatValue(v,i)}`).join(', ')}`:''}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} tabIndex={interactive&&vals.length?0:undefined} onPointerMove={interactive?pointer:undefined} onPointerLeave={e=>{if(!e.currentTarget.matches(':focus'))activate(null)}} onFocus={()=>interactive&&vals.length&&activate(Math.max(0,vals.length-1))} onBlur={()=>activate(null)} onKeyDown={e=>{if(!interactive||!vals.length)return;let next=index;if(e.key==='ArrowRight')next=Math.min(vals.length-1,index+1);else if(e.key==='ArrowLeft')next=Math.max(0,index-1);else if(e.key==='Home')next=0;else if(e.key==='End')next=vals.length-1;else return;e.preventDefault();activate(next);}}><title>{label}</title>{area&&vals.length>1&&<polygon className="cap-sparkline-area" points={`${xAt(0)},${height-2} ${points} ${xAt(vals.length-1)},${height-2}`} fill={color}/>}<polyline points={points} fill="none" stroke={color}/>{vals.length===1&&<circle cx={xAt(0)} cy={yAt(vals[0])} r="2.5" fill={color}/ >}{active!==null&&value!==undefined&&<circle className="cap-sparkline-active" cx={xAt(active)} cy={yAt(value)} r="3.5" fill={color}/>}</svg>{interactive&&active!==null&&value!==undefined&&<output className="cap-sparkline-readout" aria-live="polite">{labels?.[active]??active+1}: {formatValue(value,active)}</output>}</span>
}

export type GaugeTone='accent'|'success'|'warning'|'danger';
export interface GaugeThreshold { from:number; tone:GaugeTone; label:string }
export interface GaugeProps extends ChartBaseProps { value:number; min?:number; max?:number; valueLabel?:string; detail?:string; tone?:GaugeTone; thresholds?:GaugeThreshold[]; onValueChange?:(value:number)=>void }
export function Gauge({label,value,min=0,max=100,valueLabel='',detail, tone='accent',thresholds=[],onValueChange,height=210,...props}:GaugeProps){
  const chartLocale = useLocale();
  const fmt = useChartFormat();

  const t = useTranslate();

  const lo=finite(min),hi=Math.max(lo+1,finite(max)),target=Math.min(hi,Math.max(lo,finite(value))),[v]=useAnimatedValues(['gauge'],[target],props.animate!==false),ratio=(v-lo)/(hi-lo),cx=320,cy=height/2+16,r=Math.min(112,Math.max(24,height*.42)),length=1.5*Math.PI*r,interactive=!!onValueChange;
  const point=(angle:number)=>`${(cx+r*Math.sin(angle*Math.PI/180)).toFixed(3)} ${(cy-r*Math.cos(angle*Math.PI/180)).toFixed(3)}`,path=`M ${point(-135)} A ${r} ${r} 0 1 1 ${point(135)}`;
  const threshold=[...thresholds].filter(item=>v>=item.from).sort((a,b)=>a.from-b.from).at(-1),resolvedTone=threshold?.tone??tone,toneColor=resolvedTone==='accent'?'var(--cap-accent-solid-normal)':`var(--cap-status-${resolvedTone}-text)`,thresholdLabel=threshold?.label;
  const updateFromPointer=(event:ReactPointerEvent<SVGRectElement>)=>{if(!onValueChange)return;const svg=event.currentTarget.ownerSVGElement,rect=svg?.getBoundingClientRect();if(!rect?.width||!rect.height)return;const x=(event.clientX-rect.left)/rect.width*640,y=(event.clientY-rect.top)/rect.height*height,angle=Math.atan2(x-cx,cy-y)*180/Math.PI,progress=Math.max(0,Math.min(270,(angle+135+360)%360));onValueChange(lo+(progress/270)*(hi-lo));};
  const accessibleThreshold=[...thresholds].sort((a,b)=>a.from-b.from).filter(item=>target>=item.from).at(-1)?.label;
  return <Frame label={`${label}: ${fmt(v)}${valueLabel}${t(' из ', ' of ')}${fmt(hi)}${thresholdLabel?`, ${thresholdLabel}`:''}`} height={height} rows={[[label,t("Значение", "Value"),`${fmt(v)}${valueLabel}`],[label,t("Минимум", "Minimum"),fmt(lo)],[label,t("Максимум", "Maximum"),fmt(hi)],...(detail?[[label,t("Подробности", "Detail"),detail]]:[]),...(thresholdLabel?[[label,t("Статус", "Status"),thresholdLabel]]:[])]} {...props}><path className="cap-gauge-track" d={path} fill="none" strokeWidth="16" strokeLinecap="round" pathLength={length}/><path className={`cap-chart-gauge cap-gauge-${resolvedTone}`} d={path} fill="none" stroke={toneColor} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${length*ratio} ${length}`} pathLength={length}/><text className="cap-chart-center-value" x={cx} y={cy+3} textAnchor="middle">{fmt(v)}{valueLabel}</text><text className="cap-chart-center-label" x={cx} y={cy+23} textAnchor="middle">{thresholdLabel??detail??`${fmt(lo)} — ${fmt(hi)}`}</text><rect className="cap-gauge-control" x="180" y="0" width="280" height={height} fill="transparent" tabIndex={interactive?0:undefined} role={interactive?'slider':'group'} aria-label={label} aria-valuemin={interactive?lo:undefined} aria-valuemax={interactive?hi:undefined} aria-valuenow={interactive?target:undefined} aria-valuetext={interactive?`${fmt(target)}${valueLabel}${accessibleThreshold?`, ${accessibleThreshold}`:''}`:undefined} onPointerDown={interactive?event=>{event.currentTarget.setPointerCapture?.(event.pointerId);updateFromPointer(event)}:undefined} onPointerMove={interactive?event=>{if(event.buttons)updateFromPointer(event)}:undefined} onKeyDown={e=>{if(!onValueChange)return;let next=target;if(e.key==='ArrowRight'||e.key==='ArrowUp')next=Math.min(hi,target+(hi-lo)/20);else if(e.key==='ArrowLeft'||e.key==='ArrowDown')next=Math.max(lo,target-(hi-lo)/20);else if(e.key==='Home')next=lo;else if(e.key==='End')next=hi;else return;e.preventDefault();onValueChange(next)}}/></Frame>
}

export interface ActivityHeatmapProps extends ChartBaseProps {
  data:ActivityDatum[]; year?:number; dateRange?:[string,string]; weekStart?:0|1|2|3|4|5|6; thresholds?:number[];
  selectedDate?:string|null; defaultSelectedDate?:string|null; onSelectedDateChange?:(date:string|null)=>void;
  onSelect?:(datum:ActivityDatum)=>void;
}
const dateKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const parseLocalDate=(key:string)=>{const [year,month,day]=key.split('-').map(Number);if(!year||!month||!day)return null;const date=new Date(year,month-1,day);return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?date:null;};
export function ActivityHeatmap({label,data,year,dateRange,weekStart=1,thresholds,selectedDate,defaultSelectedDate=null,onSelectedDateChange,onSelect,...props}:ActivityHeatmapProps){
  const chartLocale = useLocale();
  const fmt = useChartFormat();

  const t = useTranslate();

  const svgRef=useRef<SVGSVGElement>(null),[renderedWidth,setRenderedWidth]=useState(640);
  useLayoutEffect(()=>{const svg=svgRef.current;if(!svg)return;const measure=()=>{const width=svg.getBoundingClientRect().width;if(width>0)setRenderedWidth(width);};measure();if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(measure);observer.observe(svg);return()=>observer.disconnect();}window.addEventListener('resize',measure);return()=>window.removeEventListener('resize',measure);},[]);
  const items=useMemo(()=>new Map(data.flatMap(item=>{const date=parseLocalDate(item.date);return date?[[dateKey(date),Math.max(0,finite(item.value))] as const]:[];})),[data]);
  const validDates=data.map(d=>parseLocalDate(d.date)).filter((d):d is Date=>!!d),resolvedYear=Number.isFinite(year)?Math.floor(year!):(dateRange?.[0]?parseLocalDate(dateRange[0])?.getFullYear():validDates[0]?.getFullYear())??new Date().getFullYear();
  const start=dateRange?.[0]?parseLocalDate(dateRange[0])??new Date(resolvedYear,0,1):new Date(resolvedYear,0,1),end=dateRange?.[1]?parseLocalDate(dateRange[1])??new Date(resolvedYear,11,31):new Date(resolvedYear,11,31);
  const first=start<=end?start:end,last=start<=end?end:start,totalDays=Math.min(3660,Math.floor((Date.UTC(last.getFullYear(),last.getMonth(),last.getDate())-Date.UTC(first.getFullYear(),first.getMonth(),first.getDate()))/86400000)+1);
  const targetDays=Array.from({length:Math.max(0,totalDays)},(_,i)=>{const date=new Date(first.getFullYear(),first.getMonth(),first.getDate()+i),key=dateKey(date);return {date,key,value:items.get(key)??0};}),heatValues=useAnimatedValues(targetDays.map(day=>day.key),targetDays.map(day=>day.value),props.animate!==false),days=targetDays.map((day,index)=>({...day,value:heatValues[index]}));
  const max=Math.max(1,...days.map(day=>day.value)),levels=(thresholds?.length?[...thresholds].map(finite).sort((a,b)=>a-b):[.25,.5,.75,1].map(r=>max*r));
  const offset=(first.getDay()-weekStart+7)%7,weekCount=Math.max(1,Math.ceil((days.length+offset)/7));
  const [ownSelected,setOwnSelected]=useState<string|null>(defaultSelectedDate),selected=selectedDate===undefined?ownSelected:selectedDate,[active,setActive]=useState<string|null>(null);
  const setSelection=(key:string|null)=>{if(selectedDate===undefined)setOwnSelected(key);onSelectedDateChange?.(key);if(key){const value=items.get(key)??0;onSelect?.({date:key,value});}};
  const selectedIndex=days.findIndex(day=>day.key===selected),activeIndex=days.findIndex(day=>day.key===active),focusIndex=activeIndex>=0?activeIndex:selectedIndex>=0?selectedIndex:0,activeDay=days.find(day=>day.key===active),selectedDay=days.find(day=>day.key===selected);
  const handleKey=(e:KeyboardEvent<SVGRectElement>,index:number)=>{let next=index;if(e.key==='ArrowUp')next=Math.max(0,index-1);else if(e.key==='ArrowDown')next=Math.min(days.length-1,index+1);else if(e.key==='ArrowLeft')next=Math.max(0,index-7);else if(e.key==='ArrowRight')next=Math.min(days.length-1,index+7);else if(e.key==='Home')next=Math.max(0,Math.floor((index+offset)/7)*7-offset);else if(e.key==='End')next=Math.min(days.length-1,Math.floor((index+offset)/7)*7+6-offset);else if(e.key==='PageUp'||e.key==='PageDown'){const from=days[index]?.date;if(!from)return;const month=from.getMonth()+(e.key==='PageDown'?1:-1),target=new Date(from.getFullYear(),month,Math.min(from.getDate(),new Date(from.getFullYear(),month+1,0).getDate()));next=Math.max(0,Math.min(days.length-1,Math.round((target.getTime()-first.getTime())/86400000)));}else if(e.key==='Enter'||e.key===' '){interactive(e,()=>setSelection(days[index]?.key??null));return;}else return;e.preventDefault();setActive(days[next]?.key??null);(e.currentTarget.parentElement?.children[next] as SVGRectElement|undefined)?.focus();};
  const monthLabels=days.flatMap((day,index)=>index===0||day.date.getMonth()!==days[index-1].date.getMonth()?[{date:day.date,week:Math.floor((index+offset)/7)}]:[]);
  let lastVisibleMonthWeek=-Infinity;
  const visibleMonthLabels=monthLabels.filter(({week})=>{const spaced=lastVisibleMonthWeek===-Infinity||(week-lastVisibleMonthWeek)*11*renderedWidth/640>=34;if(spaced)lastVisibleMonthWeek=week;return spaced;});
  const tableRows=days.map(day=>[day.key,t("Активность", "Activity"),fmt(day.value)]);
  return <div className="cap-activity-heatmap">{(activeDay||selectedDay)&&<p className="cap-chart-range" aria-live="polite">{(activeDay??selectedDay)?.key}: {fmt((activeDay??selectedDay)?.value??0)} {t(" действий", " activities")}</p>}<Frame label={label} height={148} rows={tableRows} svgRef={svgRef} {...props}><g className="cap-heatmap-months" aria-hidden="true">{visibleMonthLabels.map(({date,week})=><text key={`${date.getFullYear()}-${date.getMonth()}`} className="cap-chart-axis-label" x={28+week*11} y="10">{new Intl.DateTimeFormat(chartLocale,{month:'short'}).format(date)}</text>)}</g><g role="group" aria-label={dateRange?`${label}, ${first.getFullYear()}–${last.getFullYear()}${t(" календарь", " calendar")}`:`${label}, ${resolvedYear}${t(" дней", " days")}`} data-week-start={weekStart}>{days.map((day,index)=>{const weekday=(day.date.getDay()-weekStart+7)%7,week=Math.floor((index+offset)/7),level=day.value>0?Math.min(4,levels.filter(threshold=>day.value>=threshold).length||1):0,x=28+week*11,ypos=18+weekday*12,selectedDay=day.key===selected;return <rect key={day.key} x={x} y={ypos} width="8" height="8" rx="2" className={`cap-heatmap-level-${level}`} data-selected={selectedDay||undefined} tabIndex={focusIndex===index?0:-1} role="button" aria-label={`${day.key}: ${fmt(day.value)}${t(" действий", " activities")}`} aria-pressed={selectedDay} onFocus={()=>setActive(day.key)} onBlur={()=>setActive(null)} onMouseEnter={()=>setActive(day.key)} onMouseLeave={()=>setActive(null)} onClick={()=>setSelection(day.key)} onKeyDown={e=>handleKey(e,index)}><title>{day.key}: {fmt(day.value)}</title></rect>;})}</g></Frame></div>;
}

export interface AnimatedCounterProps { value:number; label?:string; locale?:string; prefix?:string; suffix?:string; decimals?:number; format?:(value:number)=>string; animate?:boolean; animateOnView?:boolean; className?:string }
function CounterDigit({digit,direction}:{digit:number;direction:1|-1}) {
  const previousDigit=useRef(digit),position=useRef(10+digit),target=(()=>{if(previousDigit.current===digit)return position.current;const candidates=Array.from({length:4},(_,turn)=>digit+turn*10),valid=candidates.filter(index=>direction>0?index>position.current:index<position.current);return valid.length?(direction>0?Math.min(...valid):Math.max(...valid)):10+digit;})();
  useLayoutEffect(()=>{previousDigit.current=digit;position.current=target;},[digit,target]);
  return <span className="cap-counter-digit" aria-hidden="true"><span className="cap-counter-wheel" style={{transform:`translateY(-${target}em)`}}>{Array.from({length:40},(_,index)=><span key={index}>{index%10}</span>)}</span></span>;
}
function CounterGlyph({char,direction}:{char:string;direction:1|-1}) { return /\d/.test(char)?<CounterDigit digit={Number(char)} direction={direction}/>:<span className="cap-counter-static" aria-hidden="true">{char}</span>; }
export function AnimatedCounter({value,label,locale,prefix='',suffix='',decimals=0,format,animate=true,animateOnView=false,className=''}:AnimatedCounterProps){
  const chartLocale = useLocale();
  const fmt = useChartFormat();

  const node=useRef<HTMLSpanElement>(null),previousValue=useRef(finite(value)),[visible,setVisible]=useState(!animateOnView),n=finite(value),direction:1|-1=n>=previousValue.current?1:-1,number=format?format(n):new Intl.NumberFormat(locale ?? chartLocale,{minimumFractionDigits:Math.max(0,decimals),maximumFractionDigits:Math.max(0,decimals)}).format(n),text=`${prefix}${number}${suffix}`;
  useLayoutEffect(()=>{previousValue.current=n;},[n]);
  useEffect(()=>{if(!animateOnView)return;const element=node.current;if(!element||typeof IntersectionObserver==='undefined'){setVisible(true);return;}const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{threshold:.2});observer.observe(element);return()=>observer.disconnect();},[animateOnView]);
  return <span ref={node} className={`cap-animated-counter ${className}`} role="img" aria-label={label?`${label}: ${text}`:text} aria-live="polite" style={{'--cap-chart-motion':animate&&visible?'1':'0','--cap-counter-width':`${text.length}ch`} as CSSProperties}><span className="cap-animated-counter-value" aria-hidden="true">{Array.from(text,(char,index)=><CounterGlyph key={index} char={char} direction={direction}/>)}</span></span>
}

export interface RidgelineProps extends ChartBaseProps { series:ChartSeries[]; labels?:string[]; domain?:[number,number]; overlap?:number; bandwidth?:number; tint?:boolean; active?:string|null; defaultActive?:string|null; onActiveChange?:(key:string|null)=>void; onLayerSelect?:(name:string)=>void }
const quantile=(values:number[],q:number)=>{const sorted=[...values].sort((a,b)=>a-b);if(!sorted.length)return 0;const position=(sorted.length-1)*q,lo=Math.floor(position),hi=Math.ceil(position);return sorted[lo]+(sorted[hi]-sorted[lo])*(position-lo)};
export function Ridgeline({label,series,labels,domain,overlap=2.4,bandwidth,tint=true,active,defaultActive=null,onActiveChange,onLayerSelect,height=260,...props}:RidgelineProps){
  const chartLocale = useLocale();
  const fmt = useChartFormat();

  const t = useTranslate();

  const targets=safeSeries(series,labels),seriesIds=targets.map((item,index)=>item.id??`${item.name}:${index}`),keys=targets.flatMap((item,si)=>item.values.map((_,i)=>`${seriesIds[si]}:${i}`)),animated=useAnimatedValues(keys,targets.flatMap(item=>item.values),props.animate!==false),s=targets.map((item,si)=>{const start=targets.slice(0,si).reduce((sum,row)=>sum+row.values.length,0);return {...item,values:animated.slice(start,start+item.values.length)};}),all=s.flatMap(x=>x.values),rawMin=Math.min(0,...all),rawMax=Math.max(0,...all),spread=rawMax-rawMin||1,domainMin=domain?.[0]??rawMin-spread*.12,domainMax=domain?.[1]??rawMax+spread*.12,domainSpan=domainMax-domainMin||1,lane=Math.max(1,(height-40)/Math.max(1,s.length)),plotX=128,plotWidth=480,samples=48,stats=s.map(ser=>({q1:quantile(ser.values,.25),median:quantile(ser.values,.5),q3:quantile(ser.values,.75)})),rows=s.flatMap((ser,i)=>[[ser.name,'Q1',fmt(stats[i].q1)],[ser.name,t("Медиана", "Median"),fmt(stats[i].median)],[ser.name,'Q3',fmt(stats[i].q3)]]),[ownActive,setOwnActive]=useState<string|null>(defaultActive),activeKey=active===undefined?ownActive:active;
  const setActive=(key:string|null)=>{if(active===undefined)setOwnActive(key);onActiveChange?.(key);};
  const valueX=(value:number)=>Math.max(plotX,Math.min(plotX+plotWidth,plotX+(value-domainMin)/domainSpan*plotWidth));
  return <Frame label={label} height={height} rows={rows} {...props}>{s.map((ser,si)=>{const key=ser.id??ser.name,base=24+(si+1)*lane,band=Math.max(bandwidth??spread*.08,Number.EPSILON),density=Array.from({length:samples},(_,i)=>{const x=domainMin+i*domainSpan/(samples-1);return ser.values.reduce((sum,v)=>sum+Math.exp(-.5*((x-v)/band)**2),0)/(ser.values.length||1)}),maxDensity=Math.max(...density,1e-9),peak=lane*.64*Math.max(.5,Math.min(1.2,overlap/2.4)),points=density.map((d,i)=>`${plotX+i*plotWidth/(samples-1)},${base-d/maxDensity*peak}`).join(' '),area=`${plotX},${base} ${points} ${plotX+plotWidth},${base}`,color=ser.color??palette[si%palette.length],{q1,median,q3}=stats[si],selected=activeKey===key,anyActive=activeKey!==null;return <g key={key} className="cap-chart-ridge" data-active={selected||undefined} opacity={!anyActive||selected?1:.56} tabIndex={0} role="button" aria-pressed={selected} aria-label={`${ser.name}${t(": нижний квартиль ", ": lower quartile ")}${fmt(q1)}${t(", медиана ", ", median ")}${fmt(median)}${t(", верхний квартиль ", ", upper quartile ")}${fmt(q3)}`} onMouseEnter={()=>setActive(key)} onMouseLeave={e=>{if(document.activeElement!==e.currentTarget)setActive(null)}} onFocus={()=>setActive(key)} onBlur={e=>{if(!e.currentTarget.matches(':hover'))setActive(null)}} onClick={()=>{setActive(selected?null:key);onLayerSelect?.(ser.name)}} onKeyDown={e=>interactive(e,()=>{setActive(selected?null:key);onLayerSelect?.(ser.name)})}><line className="cap-chart-grid" x1={plotX} x2={plotX+plotWidth} y1={base} y2={base}/><polygon className="cap-chart-ridge-area" points={area} fill={tint?color:'var(--cap-content-muted)'} stroke={color}/><line className="cap-chart-ridge-quartile" x1={valueX(q1)} x2={valueX(q1)} y1={base-lane*.55} y2={base}/><line className="cap-chart-ridge-median" x1={valueX(median)} x2={valueX(median)} y1={base-lane*.65} y2={base}/><line className="cap-chart-ridge-quartile" x1={valueX(q3)} x2={valueX(q3)} y1={base-lane*.55} y2={base}/><text className="cap-chart-slope-label" x="8" y={base-4}>{ser.name}</text><text className="cap-chart-ridge-readout" x="130" y={base-lane*.7}>Q1 {fmt(q1)} {t(" · Медиана ", " · Median ")}{fmt(median)} · Q3 {fmt(q3)}</text></g>})}</Frame>
}

export interface TreeDatum extends ChartDatum { id?: string; colorValue?: number; children?: TreeDatum[] }
export interface TreemapProps extends ChartBaseProps {
  data: TreeDatum[];
  onSelect?: (datum: TreeDatum) => void;
  focus?: string;
  defaultFocus?: string;
  onFocusChange?: (id: string) => void;
  colorLabel?: string;
  formatColor?: (value: number) => string;
  colorDomain?: [number, number];
  emptyLabel?: string;
}
type TreeLevel = { id: string; label: string; items: TreeDatum[] };
function treeMetrics(items:TreeDatum[]){const metrics=new Map<TreeDatum,number>(),visit=(item:TreeDatum):number|undefined=>{if(item.colorValue!==undefined&&Number.isFinite(item.colorValue)){const value=finite(item.colorValue);metrics.set(item,value);item.children?.forEach(visit);return value;}const children=item.children??[];let weighted=0,total=0;for(const child of children){const value=visit(child),weight=treeWeight(child);if(value!==undefined&&weight>0){weighted+=value*weight;total+=weight;}}if(total){const value=weighted/total;metrics.set(item,value);return value;}return undefined;};items.forEach(visit);return metrics;}
type TreeRect = { x: number; y: number; w: number; h: number };
const treeWeight = (item: TreeDatum): number => item.children?.length ? item.children.reduce((sum, child) => sum + treeWeight(child), 0) : Math.max(0, finite(item.value));
const worstAspect = (areas: number[], side: number) => {
  if (!areas.length || side <= 0) return Infinity;
  const sum = areas.reduce((a, b) => a + b, 0), lo = Math.min(...areas), hi = Math.max(...areas);
  return Math.max((side * side * hi) / (sum * sum), (sum * sum) / (side * side * lo));
};
/** Squarify sorted areas against the current short side, closing a row when its worst aspect would grow. */
function squarify(items: TreeDatum[], box: TreeRect): Array<{ item: TreeDatum; rect: TreeRect }> {
  const ranked = items.map((item, index) => ({ item, index, value: treeWeight(item) })).filter(entry => entry.value > 0).sort((a,b) => b.value-a.value);
  const total = ranked.reduce((sum, entry) => sum + entry.value, 0), area = box.w * box.h;
  if (!total || area <= 0) return [];
  const scale = area / total, remaining = { ...box }, placed = new Map<number, TreeRect>();
  let cursor = 0;
  while (cursor < ranked.length) {
    const horizontal = remaining.w >= remaining.h, side = Math.min(remaining.w, remaining.h);
    const first = ranked[cursor].value * scale, row = [first];
    let next = cursor + 1;
    while (next < ranked.length) {
      const candidate = [...row, ranked[next].value * scale];
      if (worstAspect(candidate, side) > worstAspect(row, side)) break;
      row.push(candidate[candidate.length - 1]); next++;
    }
    const rowArea = row.reduce((sum, value) => sum + value, 0);
    if (horizontal) {
      const rowWidth = rowArea / remaining.h; let y = remaining.y;
      for (let i = cursor; i < next; i++) { const height = row[i-cursor] / rowWidth; placed.set(ranked[i].index,{x:remaining.x,y,w:rowWidth,h:height}); y += height; }
      remaining.x += rowWidth; remaining.w = Math.max(0, remaining.w-rowWidth);
    } else {
      const rowHeight = rowArea / remaining.w; let x = remaining.x;
      for (let i = cursor; i < next; i++) { const width = row[i-cursor] / rowHeight; placed.set(ranked[i].index,{x,y:remaining.y,w:width,h:rowHeight}); x += width; }
      remaining.y += rowHeight; remaining.h = Math.max(0, remaining.h-rowHeight);
    }
    cursor = next;
  }
  return [...placed].map(([index,rect])=>({item:items[index],rect}));
}
export function Treemap({label,data,onSelect,focus,defaultFocus,onFocusChange,colorLabel,formatColor: suppliedFormatColor,colorDomain,emptyLabel: suppliedEmptyLabel,height=260,...props}:TreemapProps){
  const chartLocale = useLocale();
  const fmt = useChartFormat();
  const formatColor = suppliedFormatColor ?? fmt;

  const t = useTranslate();
  const emptyLabel = suppliedEmptyLabel === undefined ? (t("Нет положительных значений", "No positive values")) : suppliedEmptyLabel;

  const svgRef=useRef<SVGSVGElement>(null),rootId = `root:${label}`, [path,setPath] = useState<TreeLevel[]>([]),[activeIndex,setActiveIndex]=useState(0),[hasNavigated,setHasNavigated]=useState(false),[morphSeed,setMorphSeed]=useState<Map<string,number>>(new Map());
  const tree = useMemo(() => { const nodes=new Map<string,TreeDatum>(),parents=new Map<string,string>(),itemIds=new Map<TreeDatum,string>(),branches=new Map<string,number>(),metrics=treeMetrics(data); const visit=(items:TreeDatum[],parent:string,branchIndex:number)=>items.forEach((item,index)=>{const id=item.id??`${parent}/${index}:${item.label}`,branch=parent===rootId?index:branchIndex; nodes.set(id,item); parents.set(id,parent); itemIds.set(item,id); branches.set(id,branch); if(item.children)visit(item.children,id,branch);}); visit(data,rootId,-1); return {nodes,parents,itemIds,branches,metrics}; },[data,rootId]);
  const allNodes=tree.nodes;
  const pathFor = (id:string) => { const chain:Array<{id:string;item:TreeDatum}>=[];let currentId=id;while(tree.parents.has(currentId)){const item=allNodes.get(currentId);if(!item)break;chain.unshift({id:currentId,item});currentId=tree.parents.get(currentId)!;}const levels:TreeLevel[]=[{id:rootId,label,items:data}];for(const entry of chain){if(entry.item.children?.length)levels.push({id:entry.id,label:entry.item.label,items:entry.item.children});else break;}return levels; };
  const effectivePath=focus!==undefined?pathFor(focus):hasNavigated?path:pathFor(defaultFocus??'');
  const level=effectivePath.at(-1),current=level?.items??data,total=current.reduce((sum,item)=>sum+treeWeight(item),0);
  const moveTo=(id:string,next:TreeLevel[])=>{ if(focus===undefined){setPath(next);setHasNavigated(true);} onFocusChange?.(id); };
  const contentX=26,contentY=12,contentW=588,contentH=Math.max(1,height-24),inset=2;
  const targetTiles=squarify(current,{x:contentX,y:contentY,w:contentW,h:contentH}),tileKeys=targetTiles.map(({item})=>tree.itemIds.get(item)??`${level?.id??rootId}/item:${item.label}`),geometryKeys=tileKeys.flatMap(id=>['x','y','w','h'].map(axis=>`${id}:${axis}`)),geometry=targetTiles.flatMap(({rect})=>[rect.x,rect.y,rect.w,rect.h]),animatedGeometry=useAnimatedValues(geometryKeys,geometry,props.animate!==false,180,morphSeed),tiles=targetTiles.map((tile,index)=>({item:tile.item,rect:{x:animatedGeometry[index*4],y:animatedGeometry[index*4+1],w:animatedGeometry[index*4+2],h:animatedGeometry[index*4+3]}}));
  const metrics=[...tree.metrics.values()],metricMin=colorDomain?.[0]??Math.min(0,...metrics),metricMax=colorDomain?.[1]??Math.max(1,...metrics),metricSpan=metricMax-metricMin||1;
  const rows=current.flatMap(item=>[[item.label,t("Значение", "Value"),fmt(treeWeight(item))],...(item.colorValue===undefined?[]:[[item.label,colorLabel??t("Показатель", "Measure"),formatColor(item.colorValue)]])]),colorSignature=tiles.map(({item},index)=>`${item.color??palette[index%palette.length]}:${item.colorValue??''}`).join('|');
  useLayoutEffect(()=>{const svg=svgRef.current;if(!svg)return;const apply=()=>{const probe=svg.querySelector<SVGRectElement>('.cap-treemap-contrast-probe'),surface=parseCssRgb(probe?getComputedStyle(probe).fill:'')??[255,255,255,1];svg.querySelectorAll<SVGGElement>('.cap-treemap-item').forEach(group=>{const rect=group.querySelector('rect.cap-chart-cell');if(!rect)return;const fill=parseCssRgb(getComputedStyle(rect).fill||rect.getAttribute('fill')||'');if(!fill){group.dataset.ink='light';return;}const alpha=Math.max(0,Math.min(1,fill[3]*Number(rect.getAttribute('fill-opacity')??1))),composite:[number,number,number,number]=[fill[0]*alpha+surface[0]*(1-alpha),fill[1]*alpha+surface[1]*(1-alpha),fill[2]*alpha+surface[2]*(1-alpha),1],light=(1.05)/(luminance(composite)+.05),dark=(luminance(composite)+.05)/.05;group.dataset.ink=light>=dark?'light':'dark';});};apply();const observers:MutationObserver[]=[];if(typeof MutationObserver!=='undefined'){for(let node:Element|null=svg.parentElement;node;node=node.parentElement){const observer=new MutationObserver(apply);observer.observe(node,{attributes:true,attributeFilter:['data-theme','data-accent','data-surface','data-borders','style']});observers.push(observer);}}return()=>observers.forEach(observer=>observer.disconnect());},[colorSignature]);
  const drill=(item:TreeDatum,origin:TreeRect)=>{ onSelect?.(item); if(item.children?.length){const id=tree.itemIds.get(item)??`${level?.id??rootId}/item:${item.label}`,seed=new Map<string,number>();item.children.forEach((child,index)=>{const childId=tree.itemIds.get(child)??`${id}/${index}:${child.label}`;seed.set(`${childId}:x`,origin.x);seed.set(`${childId}:y`,origin.y);seed.set(`${childId}:w`,origin.w);seed.set(`${childId}:h`,origin.h);});setMorphSeed(seed);moveTo(id,[...effectivePath,{id,label:item.label,items:item.children}]);} };
  const crumbs=effectivePath.slice(1),focusIndex=tiles.length?Math.min(activeIndex,tiles.length-1):0;
  const moveTile=(event:KeyboardEvent<SVGGElement>,index:number)=>{const key=event.key;if(key==='Home'||key==='End'){event.preventDefault();const next=key==='Home'?0:tiles.length-1;setActiveIndex(next);(event.currentTarget.parentElement?.querySelectorAll<SVGGElement>('.cap-treemap-item')[next])?.focus();return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key))return;const from=tiles[index]?.rect;if(!from)return;const cx=from.x+from.w/2,cy=from.y+from.h/2,choices=tiles.map(({rect},next)=>({next,dx:rect.x+rect.w/2-cx,dy:rect.y+rect.h/2-cy})).filter(point=>key==='ArrowLeft'?point.dx<-.1:key==='ArrowRight'?point.dx>.1:key==='ArrowUp'?point.dy<-.1:point.dy>.1).sort((a,b)=>{const primary=(point:{dx:number;dy:number})=>key==='ArrowLeft'||key==='ArrowRight'?Math.abs(point.dx)+Math.abs(point.dy)*2:Math.abs(point.dy)+Math.abs(point.dx)*2;return primary(a)-primary(b);});if(!choices.length)return;event.preventDefault();const next=choices[0].next;setActiveIndex(next);(event.currentTarget.parentElement?.querySelectorAll<SVGGElement>('.cap-treemap-item')[next])?.focus();};
  return <div className="cap-treemap"><nav className="cap-treemap-path" aria-label={`${label}${t(" положение", " location")}`}><button type="button" onClick={()=>moveTo(rootId,[])}>{label}</button>{crumbs.map((crumb,index)=><Fragment key={`${crumb.id}-${index}`}><span aria-hidden="true">/</span><button type="button" aria-current={index===crumbs.length-1?'page':undefined} onClick={()=>moveTo(crumb.id,effectivePath.slice(0,index+2))}>{crumb.label}</button></Fragment>)}</nav><Frame label={`${label}${crumbs.length?`: ${crumbs.map(p=>p.label).join(' / ')}`:''}`} height={height} rows={rows} svgRef={svgRef} {...props}>{tiles.length?tiles.map(({item,rect},index)=>{const x=rect.x+inset,y=rect.y+inset,w=Math.max(0,rect.w-inset*2),h=Math.max(0,rect.h-inset*2),id=tree.itemIds.get(item)??`${level?.id??rootId}/item:${item.label}`,children=item.children??[],metric=tree.metrics.get(item),branchIndex=tree.branches.get(id)??index,shade=metric===undefined?1:Math.max(.18,Math.min(1,.34+.66*(metric-metricMin)/metricSpan)),branchColor=item.color??palette[branchIndex%palette.length],hasLabel=w>78&&h>30;return <g key={id} className="cap-treemap-item" data-ink="light" tabIndex={focusIndex===index?0:-1} role="button" aria-label={`${item.label}: ${fmt(treeWeight(item))}${children.length?t(", открыть группу", ", open group"):''}${metric!==undefined&&colorLabel?`, ${colorLabel}: ${formatColor(metric)}`:''}`} onFocus={()=>setActiveIndex(index)} onClick={()=>{setActiveIndex(index);drill(item,rect)}} onKeyDown={e=>{if(e.key==='Escape'&&effectivePath.length>1){e.preventDefault();moveTo(effectivePath.at(-2)?.id??rootId,effectivePath.slice(0,-1));return;}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){moveTile(e,index);return;}interactive(e,()=>drill(item,rect));}}><rect className="cap-chart-cell" data-area={w*h} x={x} y={y} width={w} height={h} rx="3" fill={branchColor} fillOpacity={shade} stroke="var(--cap-surface-raised)" strokeWidth="2"/>{hasLabel&&<text className="cap-treemap-label" x={x+8} y={y+19}><tspan>{item.label}</tspan>{h>46&&<tspan className="cap-treemap-value" x={x+8} dy="1.35em">{fmt(treeWeight(item))}{metric!==undefined&&colorLabel?` · ${formatColor(metric)}`:''}</tspan>}</text>}</g>;}):<text className="cap-chart-slope-label" x="30" y="32">{emptyLabel}</text>}<rect className="cap-treemap-contrast-probe" width="0" height="0" fill="var(--cap-surface-current)" aria-hidden="true"/></Frame></div>;
}
