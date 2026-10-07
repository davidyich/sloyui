import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { componentCatalog, componentNames } from '../../demo/catalog';
import * as UI from '../../src';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
import './context-modes.css';

type Name = typeof componentNames[number];
type Sample = { path: string; classes: string; tag: string; variant: string | null; disabled: boolean; invalid: boolean; label: string; radius: string; border: string; width: number; height: number };
type Mode = { theme: string; surface: string; radius: string; borders: string };
type Profile = { mode: Mode; nodes: Sample[] };
const noOp = () => {};
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
function path(element: Element, root: Element) {
  const result: string[] = [];
  for (let current: Element | null = element; current && current !== root; current = current.parentElement) result.unshift(`${current.tagName.toLowerCase()}:${Array.from(current.parentElement!.children).indexOf(current)}`);
  return result.join('/');
}
function sample(root: HTMLElement): Sample[] {
  return Array.from(root.querySelectorAll<HTMLElement | SVGRectElement>('[class*="cap-"]')).filter(element => (element instanceof HTMLElement || element instanceof SVGRectElement) && !element.classList.contains('cap-sr-only')).flatMap(element => {
    const style = getComputedStyle(element), rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height || style.visibility === 'hidden' || style.display === 'none' || style.clipPath === 'inset(50%)') return [];
    return [{ path: path(element, root), classes: element.getAttribute('class') ?? '', tag: element.tagName, variant: element.getAttribute('data-variant'), disabled:element.matches(':disabled,[aria-disabled=true]'),invalid:element.matches('[aria-invalid=true]'),label:(element.getAttribute('aria-label')??element.textContent??'').trim().slice(0,60),radius: element instanceof SVGRectElement ? style.rx : style.borderRadius, border: [style.borderTopWidth,style.borderRightWidth,style.borderBottomWidth,style.borderLeftWidth,style.borderTopColor,style.borderRightColor,style.borderBottomColor,style.borderLeftColor].join('|'), width:rect.width, height:rect.height }];
  });
}
function inspect(profiles: Profile[], theme='light', surface='base') {
  const representative = profiles.filter(p => p.mode.theme === theme && p.mode.surface === surface);
  const compact = representative.find(p => p.mode.radius === 'compact' && p.mode.borders === 'off')!;
  const rounded = representative.find(p => p.mode.radius === 'rounded' && p.mode.borders === 'off')!;
  const borders = representative.find(p => p.mode.radius === 'compact' && p.mode.borders === 'on')!;
  const byPath = (profile: Profile) => new Map(profile.nodes.map(node => [node.path,node]));
  const roundMap=byPath(rounded), borderMap=byPath(borders);
  const radiusChanged: Sample[] = [], staticCorners: Sample[] = [], bordersChanged: Sample[] = [], staticBorders: Sample[] = [];
  for (const node of compact.nodes) {
    const round = roundMap.get(node.path), outlined = borderMap.get(node.path);
    if (round && node.radius !== round.radius) radiusChanged.push(node);
    else if (round && parseFloat(node.radius)>0 && !node.radius.includes('%') && parseFloat(node.radius)<Math.min(node.width,node.height)/2) staticCorners.push(node);
    if (outlined && node.border!==outlined.border) bordersChanged.push(node);
    else if (outlined && node.border.split('|').slice(0,4).some((width,index)=>parseFloat(width)>0 && !/(?:\/ 0\)|, 0\)|transparent)/.test(node.border.split('|')[index+4]))) staticBorders.push(node);
  }
  return { radiusChanged, staticCorners, bordersChanged, staticBorders };
}

function Fixture() {
  const [name,setName]=useState<Name>('Button'),[running,setRunning]=useState(false),[progress,setProgress]=useState('Ready'),[result,setResult]=useState('');
  const scope=useRef<HTMLDivElement>(null);
  const [radius,setRadius]=useState('default'),[borders,setBorders]=useState('off'),[theme,setTheme]=useState('light');
  const Story=componentCatalog[name].render;
  async function run() {
    setRunning(true);setResult('');
    const components: unknown[]=[];
    try {
      for (const current of componentNames) {
        flushSync(()=>{setName(current);setProgress(`${components.length+1}/${componentNames.length} · ${current}`);});
        await frame();
        const profiles: Profile[]=[];
        for (const appearance of ['light','dark']) for (const surface of ['base','canvas','raised','floating']) for (const corner of ['compact','default','rounded']) for (const border of ['off','on']) {
          const mode={theme:appearance,surface,radius:corner,borders:border};
          for (const [axis,value] of Object.entries(mode)) scope.current!.setAttribute(`data-${axis}`,value);
          // Let inherited context observers and native selection layers settle
          // before reading pixels; a synchronous loop would sample stale layers.
          await frame();
          profiles.push({mode,nodes:sample(scope.current!)});
        }
        components.push({name:current,...inspect(profiles),contexts:['light','dark'].flatMap(appearance=>['base','canvas','raised','floating'].map(surface=>{
          const checked=inspect(profiles,appearance,surface);
          return {theme:appearance,surface,radiusChanged:checked.radiusChanged.length,bordersChanged:checked.bordersChanged.length,staticCorners:checked.staticCorners.map(node=>node.classes),staticBorders:checked.staticBorders.map(node=>node.classes)};
        })),profiles:profiles.map(profile=>({mode:profile.mode,nodeCount:profile.nodes.length}))});
      }
      setResult(JSON.stringify({date:new Date().toISOString(),components:componentNames.length,configurations:componentNames.length*48,viewport:{width:innerWidth,height:innerHeight},results:components}));
      setProgress(`Complete · ${componentNames.length} components · ${componentNames.length*48} configurations`);
    } catch(error) {setProgress(`Failed: ${String(error)}`);}
    finally {setRunning(false);scope.current!.dataset.theme=theme;scope.current!.dataset.radius=radius;scope.current!.dataset.borders=borders;scope.current!.dataset.surface='base';}
  }
  return <main>
    <h1>Component context audit</h1>
    <div className="controls"><UI.Button disabled={running} onClick={run}>Run all contexts</UI.Button><UI.Select label="Component" value={name} onValueChange={value=>setName(value as Name)} options={componentNames.map(value=>({value,label:value}))}/><UI.Select label="Radius" value={radius} onValueChange={setRadius} options={['compact','default','rounded'].map(value=>({value,label:value}))}/><UI.Select label="Borders" value={borders} onValueChange={setBorders} options={['off','on'].map(value=>({value,label:value}))}/><UI.Select label="Theme" value={theme} onValueChange={setTheme} options={['light','dark'].map(value=>({value,label:value}))}/></div>
    <p role="status" id="progress">{progress}</p>
    <div data-theme="dark" data-radius="rounded" data-borders="on"><div ref={scope} id="fixture" data-theme={theme} data-radius={radius} data-borders={borders} data-surface="base"><Story key={name} notify={noOp}/></div></div>
    <details><summary>JSON report</summary><pre id="context-result">{result}</pre></details>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
