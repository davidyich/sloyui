import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Button,ContentLayout,ResizableHandle,ResizablePanel,ResizablePanelGroup,LocaleProvider} from '../../src';
import '../../src/styles/styles.css';
const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
function Fixture(){
 const [result,setResult]=useState<unknown>(null);
 async function run(){const rows=[];for(const density of ['default','compact'])for(const radius of ['none','default','rounded']){
 document.documentElement.dataset.density=density;document.documentElement.dataset.radius=radius;await frame();
 for(const h of document.querySelectorAll<HTMLElement>('[role=separator]')){const a=h.previousElementSibling!.getBoundingClientRect(),b=h.nextElementSibling!.getBoundingClientRect(),vertical=h.getAttribute('aria-orientation')==='horizontal',gap=vertical?b.top-a.bottom:b.left-a.right,box=h.getBoundingClientRect(),cx=box.x+box.width/2,cy=box.y+box.height/2,hit=document.elementFromPoint(cx,cy),target=hit===h||h.contains(hit);rows.push({density,radius,name:h.getAttribute('aria-label'),gap,hit:target,passed:Math.abs(gap)<1&&target});}}
 setResult({cases:rows.length,failures:rows.filter(row=>!row.passed),rows});}
 return <LocaleProvider locale="en"><main style={{padding:24,maxWidth:1100,margin:'auto'}}><h1>Shared boundary separators</h1><Button onClick={run}>Run boundary checks</Button><div style={{height:160,marginBlock:20}}><ResizablePanelGroup><ResizablePanel label="Navigation">Navigation</ResizablePanel><ResizableHandle label="Horizontal boundary"/><ResizablePanel label="Content">Content</ResizablePanel></ResizablePanelGroup></div><div style={{height:180,marginBlock:20}}><ResizablePanelGroup orientation="vertical"><ResizablePanel label="Top">Top</ResizablePanel><ResizableHandle label="Vertical boundary"/><ResizablePanel label="Bottom">Bottom</ResizablePanel></ResizablePanelGroup></div><ContentLayout collapseAt={0} minContentSize={120} style={{height:180}} left={{label:'Outline',defaultWidth:120,minWidth:80,content:'Outline'}}>Document</ContentLayout><pre id="boundary-result">{JSON.stringify(result)}</pre></main></LocaleProvider>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
