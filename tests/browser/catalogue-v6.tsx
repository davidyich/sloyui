import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button,LocaleProvider} from '../../src';
import {componentNames} from '../../demo/catalog';
import {Preview} from '../../demo/Overview';
import {ComponentReference} from '../../demo/ComponentReference';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
import '../../demo/catalog.css';
import '../../demo/reference.css';
import './catalogue-pages.css';
const stage=createRoot(document.getElementById('root')!);
const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
function Audit(){const [status,setStatus]=useState('idle'),[result,setResult]=useState<unknown>();
 async function run(){setStatus('running');await document.fonts.ready;const results=[];
 for(const locale of ['ru','en'] as const)for(const theme of ['light','dark'])for(const width of [260,340])for(const name of componentNames){
  document.documentElement.dataset.theme=theme;
  flushSync(()=>stage.render(<LocaleProvider locale={locale}><div data-surface="base" style={{width,margin:24}}><Preview key={name} name={name}/></div></LocaleProvider>));await frame();
  const outer=document.querySelector<HTMLElement>('.catalog-overview-preview')!,inner=outer.querySelector<HTMLElement>('.catalog-overview-mini')!;
  const a=outer.getBoundingClientRect(),b=inner?.getBoundingClientRect();
  const visible=[...inner?.querySelectorAll<HTMLElement>('*')??[]].filter(node=>{const s=getComputedStyle(node);const closed=node.closest('details:not([open])');if(closed&&!closed.querySelector(':scope > summary')?.contains(node))return false;return s.display!=='none'&&s.visibility!=='hidden'&&s.position!=='absolute'&&s.position!=='fixed'&&node.getBoundingClientRect().width>0;});
  const overflow=visible.filter(node=>{const raw=node.getBoundingClientRect();let left=raw.left,right=raw.right,top=raw.top,bottom=raw.bottom;let parent=node.parentElement;
   while(parent&&parent!==outer){const s=getComputedStyle(parent),r=parent.getBoundingClientRect();if(/hidden|clip|auto|scroll/.test(s.overflowX)){left=Math.max(left,r.left);right=Math.min(right,r.right);}if(/hidden|clip|auto|scroll/.test(s.overflowY)){top=Math.max(top,r.top);bottom=Math.min(bottom,r.bottom);}parent=parent.parentElement;}
   return right-left>0.5&&bottom-top>0.5&&(left<a.left-1||right>a.right+1||top<a.top-1||bottom>a.bottom+1);
  }).map(node=>({tag:node.tagName,cls:typeof node.className==='string'?node.className:node.tagName}));
  const row={name,locale,theme,width,mounted:!!b,centered:!!b&&Math.abs((a.left+a.right-b.left-b.right)/2)<1&&Math.abs((a.top+a.bottom-b.top-b.bottom)/2)<1,gradient:getComputedStyle(outer).backgroundImage,mask:getComputedStyle(inner).maskImage,overflow};results.push({...row,passed:row.mounted&&row.centered&&!overflow.length&&row.gradient==='none'&&row.mask==='none'});setStatus(`${locale} ${theme} ${width} ${name}`);
 }
 const boundaries=[];for(const theme of ['light','dark'])for(const borders of ['off','on'])for(const surface of ['base','canvas','raised','floating'] as const){document.documentElement.dataset.theme=theme;document.documentElement.dataset.borders=borders;flushSync(()=>stage.render(<div data-surface="base"><ComponentReference name="Button" surface={surface}/></div>));await frame();const table=document.querySelector<HTMLElement>('.catalog-api-table-wrap')!,css=getComputedStyle(table);boundaries.push({theme,borders,surface,border:css.borderColor,width:css.borderTopWidth,passed:parseFloat(css.borderTopWidth)>0&&css.borderColor!=='rgba(0, 0, 0, 0)'});}
 stage.render(<p>Done</p>);setResult({cases:results.length,boundaries,failures:results.filter(row=>!row.passed),results});setStatus('done');
 }
 return <><Button onClick={()=>void run()}>Run overview checks</Button><span id="v6-status">{status}</span><pre id="v6-result">{JSON.stringify(result)}</pre></>;
}
createRoot(document.getElementById('controls')!).render(<Audit/>);
