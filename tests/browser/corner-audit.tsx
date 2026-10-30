import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from '../../src';
import {componentNames} from '../../demo/catalog';
import {Playground} from '../../demo/Playground';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
import '../../demo/catalog.css';
import '../../demo/reference.css';
import '../../demo/catalog-appearance.css';

const root=createRoot(document.getElementById('root')!);
const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
const circular='[data-shape="pill"],[data-shape="circle"],.cap-radio,.cap-switch,.cap-switch-thumb,.cap-slider-thumb,.cap-range-thumb,.cap-avatar[data-shape="circle"],.cap-counter[data-shape="round"],.cap-tab-list[data-variant="pills"]';
const number=(value:string)=>Number.parseFloat(value)||0;
function inspect(radius:string,shape:string){
 const failures:{kind:string;node:string;actual:string;expected?:string}[]=[];
 let paintedCorners=0,headingChecks=0;
 const sample=document.getElementById('root')!;
 for(const e of sample.querySelectorAll<HTMLElement>('*')){
  const rect=e.getBoundingClientRect(),s=getComputedStyle(e);
  if(rect.width<2||rect.height<2||s.visibility==='hidden'||s.display==='none'||number(s.opacity)===0||e.closest('[inert]'))continue;
  const r=Math.max(...[s.borderTopLeftRadius,s.borderTopRightRadius,s.borderBottomLeftRadius,s.borderBottomRightRadius].map(number));
  if(r===0)continue;
  const background=s.backgroundColor,border=number(s.borderTopWidth)>0&&s.borderTopStyle!=='none';
  if((background==='rgba(0, 0, 0, 0)'||background==='transparent')&&!border&&s.boxShadow==='none')continue;
  const node=`${e.tagName.toLowerCase()}.${String(e.className).trim().replace(/\s+/g,'.')}`;
  const corner=s.getPropertyValue('corner-shape').trim();
  if(e.closest(circular)){if(!['round','superellipse(1)'].includes(corner))failures.push({kind:'circle-shape',node,actual:corner,expected:'superellipse(1)'});continue;}
  if(r>=Math.min(rect.width,rect.height)/2-.5)continue;
  paintedCorners++;
  const authored=e.style.borderRadius&&!e.style.borderRadius.includes('var(');
  if(radius==='none'&&!authored)failures.push({kind:'square-radius',node,actual:s.borderRadius,expected:'0px'});
  const expected=shape==='squircle'&&CSS.supports('corner-shape:squircle')?'superellipse(2)':'superellipse(1)';
  if(![expected,expected==='superellipse(2)'?'squircle':'round'].includes(corner))failures.push({kind:'corner-shape',node,actual:corner,expected});
 }
 const panel=sample.querySelector<HTMLElement>('.playground-settings');
 if(panel){const header=panel.querySelector<HTMLElement>('header');if(header){const s=getComputedStyle(header),p=getComputedStyle(panel),inset=number(p.getPropertyValue('--cap-radius-inset'));if(number(s.paddingTop)+.1<number(p.getPropertyValue('--cap-space-3'))+inset||number(s.paddingLeft)+.1<number(p.getPropertyValue('--cap-space-4'))+inset)failures.push({kind:'header-clearance',node:'.playground-settings > header',actual:`${s.paddingTop} ${s.paddingLeft}`,expected:`base + ${inset}px`});}}
 const preview=sample.querySelector<HTMLElement>('.playground-preview');
 if(preview&&preview.scrollWidth-preview.clientWidth>1)failures.push({kind:'preview-overflow',node:'.playground-preview',actual:String(preview.scrollWidth-preview.clientWidth)});
 // Check actual text boxes against the curved edge, including legacy raw headers.
 const headings=sample.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6,header strong,.cap-accordion-title,.cap-code-label');
 for(const heading of headings){
  const outerText=heading.getBoundingClientRect();
  if(outerText.width<2||outerText.height<2||heading.closest('[inert]')||!heading.textContent?.trim())continue;
  const range=document.createRange();range.selectNodeContents(heading);const text=range.getBoundingClientRect();
  if(text.width<2||text.height<2)continue;
  for(let shell=heading.parentElement;shell&&shell!==sample;shell=shell.parentElement){
   const s=getComputedStyle(shell),box=shell.getBoundingClientRect();
   const r=Math.min(number(s.borderTopLeftRadius),box.width/2,box.height/2);
   if(r===0||(s.backgroundColor==='rgba(0, 0, 0, 0)'&&number(s.borderTopWidth)===0))continue;
   const scale=box.width/Math.max(1,shell.offsetWidth),radius=r*scale;
   const x=text.left-box.left,y=text.top-box.top;
   if(x>=radius||y>=radius)break;
   headingChecks++;
   const exponent=s.getPropertyValue('corner-shape').includes('(2)')?4:2;
   const intrusion=(offset:number)=>offset>=radius?0:radius*(1-Math.pow(Math.max(0,1-Math.pow(1-Math.max(0,offset)/radius,exponent)),1/exponent));
   const clearance=Math.min(x-intrusion(y),y-intrusion(x));
   const required=Math.min(number(s.getPropertyValue('--cap-space-4'))*scale,radius/2);
   if(clearance+1<required)failures.push({kind:'heading-curved-clearance',node:`${heading.tagName.toLowerCase()}.${heading.className} in ${shell.className}`,actual:`${clearance.toFixed(2)}px`,expected:`${required.toFixed(2)}px`});
   break;
  }
 }
 return {paintedCorners,headingChecks,failures};
}
function Audit(){
 const [status,setStatus]=useState('idle'),[result,setResult]=useState<unknown>();
 async function run(){
  setStatus('running');const cases=[];await document.fonts.ready;
  for(const theme of ['light','dark'])for(const density of ['default','compact'])for(const radius of ['default','rounded','none'])for(const shape of radius==='none'?['round']:['round','squircle']){
   Object.assign(document.documentElement.dataset,{theme,density,radius,cornerShape:shape});
   for(const name of componentNames){
    flushSync(()=>root.render(<main className="catalog-page" key={`${theme}:${density}:${radius}:${shape}:${name}`} data-surface="content"><Playground name={name} surface="content" notify={()=>{}}/></main>));
    await frame();const checked=inspect(radius,shape);cases.push({name,theme,density,radius,shape,...checked});setStatus(`${cases.length}: ${name} · ${theme}/${density}/${radius}/${shape}`);
   }
  }
  const summary={width:innerWidth,cases:cases.length,components:componentNames.length,paintedCorners:cases.reduce((sum,item)=>sum+item.paintedCorners,0),headingChecks:cases.reduce((sum,item)=>sum+item.headingChecks,0),failures:cases.filter(item=>item.failures.length)};
  root.render(<p>Audit complete.</p>);setResult(summary);setStatus(`done: ${summary.cases} cases, ${summary.paintedCorners} painted corners, ${summary.headingChecks} headings, ${summary.failures.length} failing cases at ${innerWidth}px`);
 }
 return <div><Button onClick={()=>void run()} disabled={status!=='idle'&&!status.startsWith('done:')}>Run corner audit</Button><p role="status" id="corner-audit-status">{status}</p><details><summary>Results</summary><pre id="corner-audit-result">{JSON.stringify(result)}</pre></details></div>;
}
createRoot(document.getElementById('controls')!).render(<Audit/>);
