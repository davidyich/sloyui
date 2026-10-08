import { useCatalogText, localizeCatalogueFixture } from './catalog-locale';
import { useState } from 'react';
import { Button } from '../src';
import { ActivityHeatmap, AnimatedCounter, BarChart, BrushChart, DonutChart, Gauge, LineChart, Ridgeline, SlopeChart, Sparkline, Streamgraph, Treemap, WaffleChart } from '../src/components/charts';
import { Sample, StorySection } from './stories-controls';
const labels=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const sales=[{name:'This week',values:[4,7,5,10,8,13,11],color:'var(--cap-accent-solid-normal)'},{name:'Last week',values:[3,6,7,8,6,9,10]}];
export function LineChartStory(){
 const ct=useCatalogText();
return <StorySection><LineChart label="Weekly activity" labels={labels} series={sales}/></StorySection>}
export function BarChartStory(){
 const ct=useCatalogText();
return <StorySection><BarChart label="Daily tasks" data={labels.map((label,i)=>({label,value:[4,7,-2,10,8,3,11][i]}))}/></StorySection>}
export function DonutChartStory(){
 const ct=useCatalogText();
return <StorySection><DonutChart label="Work distribution" legendAction="toggle" data={[{id:'design',label:'Design',value:42},{id:'research',label:'Research',value:28},{id:'planning',label:'Planning',value:18},{id:'other',label:'Other',value:12}]}/></StorySection>}
export function StreamgraphStory(){
 const ct=useCatalogText();
return <StorySection><Streamgraph label="Weekly mix" labels={labels} series={[{name:'Notes',values:[3,6,5,8,7,10,8]},{name:'Tasks',values:[4,3,6,4,7,5,8]},{name:'Projects',values:[2,4,3,5,3,6,5]}]}/></StorySection>}
export function BrushChartStory(){
 const ct=useCatalogText();
return <StorySection><BrushChart label="Long range activity" labels={Array.from({length:30},(_,i)=>`Day ${i+1}`)} series={[{name:'Activity',values:Array.from({length:30},(_,i)=>Math.round(8+6*Math.sin(i/3)+i%4))}]}/></StorySection>}
export function WaffleChartStory(){
 const ct=useCatalogText();
return <StorySection><WaffleChart label="Time allocation" data={[{label:'Making',value:42},{label:'Learning',value:30},{label:'Rest',value:18},{label:'Other',value:10}]}/></StorySection>}
export function SlopeChartStory(){
 const ct=useCatalogText();
return <StorySection><SlopeChart label="Before and after" beforeLabel="Q1" afterLabel="Q2" data={[{label:'Notes',before:8,after:12},{label:'Tasks',before:14,after:9},{label:'Projects',before:4,after:7}]}/></StorySection>}
export function SparklineStory(){
 const ct=useCatalogText();
return <StorySection><div className="catalog-row"><Sample label="Steady"><Sparkline label="Notes created" values={[2,3,3,5,4,7,8]}/></Sample><Sample label="Declining"><Sparkline label="Open tasks" values={[9,8,7,6,5,3,2]} color="var(--cap-content-muted)"/></Sample></div></StorySection>}
export function GaugeStory(){
 const ct=useCatalogText();
return <StorySection><Gauge label="Weekly goal progress" value={68} valueLabel="%" detail="4 days left" thresholds={[{from:55,tone:'success',label:'On track'},{from:85,tone:'warning',label:'Almost there'},{from:100,tone:'danger',label:'Complete'}]}/></StorySection>}
export function ActivityHeatmapStory(){
 const ct=useCatalogText();
const data=Array.from({length:365},(_,i)=>{const date=new Date(2026,0,i+1);return {date:`2026-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,value:(i*7)%11}});return <StorySection><ActivityHeatmap label="Daily activity in 2026" year={2026} data={data}/></StorySection>}
export function AnimatedCounterStory(){
 const ct=useCatalogText();
const [value,setValue]=useState(1248);return <StorySection><div className="catalog-row"><Button size="sm" onClick={()=>setValue(v=>v+17)}>Add activity</Button><AnimatedCounter label="Completed notes" value={value}/><Sparkline label="Recent change" values={[3,5,4,7,6,9]}/></div></StorySection>}
export function RidgelineStory(){
 const ct=useCatalogText();
return <StorySection><Ridgeline label="Workload by weekday" labels={labels} series={[{name:'Writing',values:[2,4,8,9,5,3,2]},{name:'Planning',values:[3,5,6,8,7,4,3]},{name:'Review',values:[1,2,5,7,8,4,2]}]}/></StorySection>}
export function TreemapStory(){
 const ct=useCatalogText();
return <StorySection><Treemap label="Project space usage" colorLabel="Growth" formatColor={value=>`${value}%`} data={[{id:'work',label:'Work',value:0,children:[{id:'research',label:'Research',value:42,colorValue:12},{id:'design',label:'Design',value:28,colorValue:-3}]},{id:'personal',label:'Personal',value:0,children:[{id:'journal',label:'Journal',value:18,colorValue:6},{id:'reading',label:'Reading',value:12,colorValue:2}]}]}/></StorySection>}
