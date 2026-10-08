import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Button } from '../../src/components/primitives.js';
import { ScrollArea } from '../../src/components/workbench.js';
import { ResizableHandle,ResizablePanel,ResizablePanelGroup } from '../../src/components/resizable-group.js';
import { LocaleProvider } from '../../src/components/locale.js';
import '../../src/styles/styles.css';
import '../../src/styles/resizable-group.css';
import '../../src/styles/fonts.css';
import './scroll-resizable.css';
const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve())),settle=async()=>{await frame();await frame()};
const near=(a:number,b:number)=>Math.abs(a-b)<1;
function Fixture(){
 const [vertical,setVertical]=useState(false),[disabled,setDisabled]=useState(false),[locale,setLocale]=useState<'ru'|'en'>('ru'),[layout,setLayout]=useState([35,65]),[fade,setFade]=useState(true),[status,setStatus]=useState('Готово'),[result,setResult]=useState<unknown>(null),[running,setRunning]=useState(false);
 const run=async()=>{
  setRunning(true);const failures:unknown[]=[];let checks=0;
  for(const direction of ['ltr','rtl'] as const){
   const viewport=document.querySelector<HTMLElement>('[aria-label="Horizontal fade"]')!;viewport.style.direction=direction;const maximum=viewport.scrollWidth-viewport.clientWidth;
   for(const phase of ['start','middle','end'] as const){viewport.scrollLeft=(direction==='rtl'?-1:1)*(phase==='start'?0:phase==='middle'?maximum/2:maximum);viewport.dispatchEvent(new Event('scroll',{bubbles:true}));await settle();const left=Number(viewport.style.getPropertyValue('--cap-scroll-fade-left-progress')),right=Number(viewport.style.getPropertyValue('--cap-scroll-fade-right-progress'));checks++;
    const start=direction==='rtl'?right:left,end=direction==='rtl'?left:right;if(phase==='start'&&(start!==0||end<=0)||phase==='middle'&&(start<=0||end<=0)||phase==='end'&&(start<=0||end!==0))failures.push({kind:'horizontal fade',direction,phase,left,right});
   }
  }
  const viewport=document.querySelector<HTMLElement>('[aria-label="Vertical fade"]')!;
  for(const phase of ['start','middle','end'] as const){viewport.scrollTop=phase==='start'?0:phase==='middle'?(viewport.scrollHeight-viewport.clientHeight)/2:viewport.scrollHeight;viewport.dispatchEvent(new Event('scroll',{bubbles:true}));await settle();const top=Number(viewport.style.getPropertyValue('--cap-scroll-fade-top-progress')),bottom=Number(viewport.style.getPropertyValue('--cap-scroll-fade-bottom-progress'));checks++;if(phase==='start'&&(top!==0||bottom<=0)||phase==='middle'&&(top<=0||bottom<=0)||phase==='end'&&(top<=0||bottom!==0))failures.push({kind:'vertical fade',phase,top,bottom});}
  checks++;if(getComputedStyle(viewport.parentElement!).maskImage!=='none'||getComputedStyle(document.querySelector('.cap-scroll-floating')!).maskImage!=='none')failures.push({kind:'masked boundary/floating'});
  const crisp=document.querySelector<HTMLElement>('[aria-label="No overflow"]')!;checks++;if(['top','right','bottom','left'].some(edge=>Number(crisp.style.getPropertyValue(`--cap-scroll-fade-${edge}-progress`))!==0))failures.push({kind:'no overflow faded'});
  for(const orientation of ['horizontal','vertical'] as const){flushSync(()=>{setVertical(orientation==='vertical');setDisabled(false);setLayout([35,65])});await settle();const group=document.querySelector<HTMLElement>('[aria-label="Outer group"]')!,handle=document.querySelector<HTMLElement>('[aria-label="Outer handle"]')!;
   for(const key of ['Home','End','ArrowRight','ArrowDown']){handle.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));await settle();const value=Number(handle.getAttribute('aria-valuenow')),min=Number(handle.getAttribute('aria-valuemin')),max=Number(handle.getAttribute('aria-valuemax'));checks++;if(value<min-.01||value>max+.01)failures.push({kind:'bounds',orientation,key,value,min,max});
    const items=Array.from(group.children).filter(node=>node.classList.contains('cap-resizable-panel')||node.classList.contains('cap-resizable-handle')),total=items.reduce((sum,node)=>sum+(orientation==='horizontal'?node.getBoundingClientRect().width:node.getBoundingClientRect().height),0),size=orientation==='horizontal'?group.clientWidth:group.clientHeight;checks++;if(!near(total,size))failures.push({kind:'parent fit',orientation,total,size});
   }
  }
  checks++;if(document.documentElement.scrollWidth>window.innerWidth+1)failures.push({kind:'document overflow',width:document.documentElement.scrollWidth});
  flushSync(()=>{setVertical(false);setLayout([35,65])});setResult({checks,failures});setStatus(failures.length?`${failures.length} failures / ${checks}`:`PASS: ${checks} checks`);setRunning(false);
 };
 return <LocaleProvider locale={locale}><main className="scroll-resize-audit"><h1>Scroll fade / compound resize</h1><div className="scroll-resize-controls"><Button variant="secondary" onClick={()=>setLocale(v=>v==='ru'?'en':'ru')}>Locale: {locale}</Button><Button variant="secondary" onClick={()=>setFade(v=>!v)}>Fade: {fade?'On':'Off'}</Button></div>
 <section className="scroll-resize-section"><h2>Vertical fade + floating action</h2><div className="scroll-resize-frame cap-surface-boundary" data-surface="raised"><ScrollArea label="Vertical fade" fade={fade?'vertical':false} fadeReveal={96} style={{height:260}} floating={<Button size="sm" onClick={()=>setStatus('Floating action работает')}>Сохранить</Button>}><div className="scroll-resize-fade-list">{Array.from({length:10},(_,i)=><div key={i}>Заметка {i+1}: текст, край и тень.</div>)}</div></ScrollArea></div></section>
 <section className="scroll-resize-section"><h2>Horizontal / RTL</h2><div className="scroll-resize-frame"><ScrollArea label="Horizontal fade" axis="horizontal" fade={fade?'horizontal':false} fadeReveal={96} style={{height:100}}><div className="scroll-resize-inline">{Array.from({length:8},(_,i)=><div key={i}>Коллекция {i+1}</div>)}</div></ScrollArea></div><ScrollArea label="No overflow" fade="both" style={{height:60}}><p>Короткий текст остаётся без fade.</p></ScrollArea></section>
 <section className="scroll-resize-section"><h2>Nested resizable group</h2><div className="scroll-resize-controls"><Button variant="secondary" onClick={()=>setVertical(v=>!v)}>{vertical?'Vertical':'Horizontal'}</Button><Button variant="secondary" onClick={()=>setDisabled(v=>!v)}>Resize: {disabled?'Off':'On'}</Button><span>{layout.map(value=>value.toFixed(1)).join(' / ')}%</span></div><div style={{height:420,minWidth:0}}><ResizablePanelGroup label="Outer group" orientation={vertical?'vertical':'horizontal'} layout={layout} onLayoutChange={setLayout} disabled={disabled}><ResizablePanel label="Navigation" minSize={20} maxSize={60} surface="canvas"><div className="scroll-resize-panel-copy"><h3>Навигация</h3><p>Drag разделителя или Tab + стрелки. Home/End ограничены min/max соседней пары.</p><Button size="sm">Вложенное действие</Button></div></ResizablePanel><ResizableHandle label="Outer handle" withHandle/><ResizablePanel label="Workspace" minSize={40} surface="raised"><ResizablePanelGroup orientation="vertical" label="Inner group"><ResizablePanel minSize={25}><div className="scroll-resize-panel-copy"><h3>Документ</h3><p>Вложенная группа сохраняет независимую ось.</p></div></ResizablePanel><ResizableHandle withHandle/><ResizablePanel minSize={25}><div className="scroll-resize-panel-copy"><h3>Свойства</h3><p>Surface/radius/borders продолжают наследоваться.</p></div></ResizablePanel></ResizablePanelGroup></ResizablePanel></ResizablePanelGroup></div></section>
 <div className="scroll-resize-controls"><Button onClick={run} disabled={running||!fade}>Run scroll/resize checks</Button><span role="status" id="scroll-resize-status">{status}</span></div><details><summary>JSON result</summary><pre id="scroll-resize-result">{JSON.stringify(result,null,2)}</pre></details></main></LocaleProvider>
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
