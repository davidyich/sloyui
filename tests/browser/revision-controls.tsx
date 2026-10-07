import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import * as UI from '../../src';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
const sizes=['xs','sm','md','lg','xl'] as const;
function Audit(){const [mode,setMode]=useState({theme:'light',surface:'base',radius:'default',accent:'blue',borders:'off'}),[result,setResult]=useState<unknown>(null),[wrap,setWrap]=useState(true),[clipboard,setClipboard]=useState('');
 const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
 async function run(){const cases=[];await document.fonts.ready;
 for(const theme of ['light','dark'])for(const surface of ['base','canvas','raised','floating'])for(const radius of ['compact','default','rounded'])for(const accent of ['blue','cyan','rose','neutral'])for(const borders of ['off','on']){
  flushSync(()=>setMode({theme,surface,radius,accent,borders}));await frame();const region=document.querySelector('#samples')!,primary=region.querySelector<HTMLElement>('[data-variant=primary]')!,neutral=region.querySelector<HTMLElement>('.neutral [data-variant=primary]')!;
  const chipChecks=sizes.map(size=>{const tag=region.querySelector<HTMLElement>(`.cap-tag[data-size=${size}]`)!,chip=region.querySelector<HTMLElement>(`.cap-chip[data-size=${size}]`)!;const chipHeight=chip.getBoundingClientRect().height,tagHeight=tag.getBoundingClientRect().height,r=parseFloat(getComputedStyle(chip).borderTopLeftRadius);return {size,chipHeight,tagHeight,radius:r,passed:Math.abs(chipHeight-tagHeight-4)<1&&(radius!=='rounded'||Math.abs(r-chipHeight/2)<1)};});
  const primaryNeutral=getComputedStyle(primary).backgroundColor===getComputedStyle(neutral).backgroundColor&&getComputedStyle(primary).color===getComputedStyle(neutral).color;
  cases.push({...mode,theme,surface,radius,accent,borders,primaryNeutral,chipChecks,passed:primaryNeutral&&chipChecks.every(check=>check.passed)});
 }
 setResult({cases:cases.length,failures:cases.filter(c=>!c.passed),results:cases});}
 return <div style={{padding:20,fontFamily:'var(--cap-font-sans)'}}><UI.Button onClick={()=>void run()}>Run control contracts</UI.Button><details><summary>Result</summary><pre id="revision-controls-result">{JSON.stringify(result)}</pre></details><section id="samples" data-theme={mode.theme} data-surface={mode.surface} data-radius={mode.radius} data-accent={mode.accent} data-borders={mode.borders} style={{padding:24,background:'var(--cap-surface-current)',color:'var(--cap-content-primary)'}}><UI.Button variant="primary">Primary</UI.Button><UI.Button variant="accent">Accent</UI.Button><UI.Button variant="accent-secondary">Accent secondary</UI.Button><div className="neutral" data-accent="neutral"><UI.Button variant="primary">Neutral reference</UI.Button></div>{sizes.map(size=><div key={size} style={{display:'flex',gap:16,alignItems:'center',marginBlock:12}}><UI.Tag size={size}>Tag</UI.Tag><UI.Chip size={size} onRemove={()=>{}}>Chip</UI.Chip></div>)}<UI.CodeBlock filename="example.tsx" lineNumbers wrap={wrap} onWrapChange={setWrap} variant="filled-outline" language="tsx">{'// A deliberately long line that wraps in a narrow container.\nexport const message = "Источник копируется без номеров строк и без изменений";\n'}</UI.CodeBlock><UI.Button onClick={async()=>{try{setClipboard(await navigator.clipboard.readText())}catch{setClipboard('Clipboard read unavailable')}}}>Inspect copied source</UI.Button><pre id="clipboard-source">{clipboard}</pre></section></div>;
}
createRoot(document.getElementById('root')!).render(<Audit/>);
