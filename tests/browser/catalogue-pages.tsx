import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Button} from '../../src';
import {componentCatalog,componentNames} from '../../demo/catalog';
import {Playground} from '../../demo/Playground';
import {ComponentReference} from '../../demo/ComponentReference';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
import '../../demo/catalog.css';
import '../../demo/reference.css';
import './catalogue-pages.css';
const root=createRoot(document.getElementById('root')!);
const nextFrame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
function Audit(){const [status,setStatus]=useState('idle'),[result,setResult]=useState<unknown>(null);
 async function run(){setStatus('running');const results=[];await document.fonts.ready;
 for(const theme of ['light','dark']){document.documentElement.dataset.theme=theme;for(const name of componentNames){const Story=componentCatalog[name].render;flushSync(()=>root.render(<main key={`${theme}:${name}`} className="catalog-page" data-surface="base"><Playground name={name} notify={()=>{}} surface="base"/><div className="catalog-preview"><Story notify={()=>{}}/></div><ComponentReference name={name}/></main>));await nextFrame();const page=document.querySelector<HTMLElement>('.catalog-page')!;const playground=document.querySelector<HTMLElement>('.playground-preview')!;const story=document.querySelector<HTMLElement>('.catalog-preview')!;const reference=document.querySelector<HTMLElement>('.catalog-api-table-wrap')!;const previewRect=playground.getBoundingClientRect(),children=[...playground.children].filter(element=>getComputedStyle(element).position!=='absolute'&&element.getBoundingClientRect().width>1&&element.getBoundingClientRect().height>1),childRects=children.map(element=>element.getBoundingClientRect()),previewCenterOffset=childRects.length?Math.abs((Math.min(...childRects.map(rect=>rect.left))+Math.max(...childRects.map(rect=>rect.right)))/2-(previewRect.left+previewRect.right)/2):0;const row={name,theme,viewport:innerWidth,previewCenterOffset:Math.round(previewCenterOffset*100)/100,pageOverflow:page.scrollWidth-page.clientWidth,previewOverflow:playground.scrollWidth-playground.clientWidth,storyOverflow:story.scrollWidth-story.clientWidth,apiOverflow:reference.scrollWidth-reference.clientWidth};results.push({...row,passed:row.pageOverflow<=1&&row.previewOverflow<=1&&row.storyOverflow<=1&&row.apiOverflow<=1&&row.previewCenterOffset<=2});setStatus(`${theme} ${name} · ${results.length}/${componentNames.length*2}`);}}
 root.render(<p>Audit complete.</p>);setResult({cases:results.length,failures:results.filter(result=>!result.passed),results});setStatus(`done: ${results.length} cases at ${innerWidth}px; ${results.filter(result=>!result.passed).length} failures`);}
 return <div><Button onClick={()=>void run()} disabled={status!=='idle'&&!status.startsWith('done:')}>Run catalogue pages</Button><span id="catalogue-pages-status">{status}</span><details><summary>Result</summary><pre id="catalogue-pages-result">{JSON.stringify(result)}</pre></details></div>}
createRoot(document.getElementById('controls')!).render(<Audit/>);
