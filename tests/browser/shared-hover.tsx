import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Button, IconButton } from '../../src/components/primitives';
import { TreeView, type TreeNode } from '../../src/components/tree-view';
import { NavigationMenu } from '../../src/components/navigation-menu';
import { FloatingActionBar } from '../../src/components/workbench';
import { MovingHighlight } from '../../src/components/moving-highlight';
import '../../src/styles/styles.css';
import '../../src/styles/fonts.css';
import './shared-hover.css';

const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const nodes: TreeNode[] = [{ id:'foundation',label:'Foundations',icon:'folder',children:[
  {id:'colors',label:'Colors',href:'#Colors',icon:'page'},
  {id:'spacing',label:'Spacing',href:'#Spacing',icon:'grid'},
  {id:'nested',label:'Nested group',children:[{id:'typography',label:'Typography',href:'#Typography',icon:'list'}]},
]}, {id:'components',label:'Components',children:Array.from({length:12},(_,index)=>({id:`component-${index}`,label:`Component ${index+1}`,href:`#Component-${index}`,icon:'page' as const}))}];

type Position = {x:number;y:number;width:number;height:number};
const bounds = (node: Element): Position => { const rect=node.getBoundingClientRect();return {x:rect.x,y:rect.y,width:rect.width,height:rect.height}; };
const distance = (a: Position, b: Position) => Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.width-b.width),Math.abs(a.height-b.height));
function pointer(node: Element, type='pointerover') { node.dispatchEvent(new PointerEvent(type,{bubbles:type!=='pointerleave',pointerType:'mouse'})); }
function instrument(layer: HTMLElement) {
  const animate=layer.animate.bind(layer);
  let calls=0;
  layer.animate=(keyframes,options)=>{calls++;return animate(keyframes,options);};
  return {
    calls:()=>calls,
    sample:()=>({calls,visible:layer.hasAttribute('data-visible'),position:bounds(layer),radius:getComputedStyle(layer).borderRadius,
      animations:layer.getAnimations().map(animation=>({currentTime:typeof animation.currentTime==='number'?animation.currentTime:null,playState:animation.playState,
        keyframes:animation.effect instanceof KeyframeEffect?animation.effect.getKeyframes().map(keyframe=>({transform:keyframe.transform??null,opacity:keyframe.opacity??null})):[]}))}),
    restore:()=>{layer.animate=animate;},
  };
}

function Fixture() {
  const [selected,setSelected]=useState('colors'),[running,setRunning]=useState(false),[result,setResult]=useState(''),[status,setStatus]=useState('Ready');
  const outer=useRef<HTMLDivElement>(null),sidebar=useRef<HTMLDivElement>(null);
  async function run() {
    setRunning(true);setResult('');setStatus('Running finite hover sequence');
    const record: Record<string,unknown>={viewport:{width:innerWidth,height:innerHeight},reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
    const checks: Record<string,boolean>={};
    const restored: (()=>void)[]=[];
    try {
      const tree=sidebar.current!.querySelector<HTMLElement>('.cap-tree')!,scroll=sidebar.current!.querySelector<HTMLElement>('.hover-fixture-scroll')!;
      scroll.scrollTop=0; flushSync(()=>setSelected('colors'));
      await pause(300);
      const row=(label:string)=>tree.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
      const layer=tree.querySelector<HTMLElement>(':scope > .cap-moving-highlight')!;
      const motion=instrument(layer);restored.push(motion.restore);
      const active=tree.querySelector<HTMLElement>('.cap-tree-selection-indicator')!,guide=tree.querySelector<HTMLElement>('.cap-tree-active-guide-indicator')!;
      pointer(tree,'pointerleave');await pause(140);
      pointer(row('Spacing'));
      record.firstEntry=motion.sample();checks.firstEntryNoAnimate=motion.calls()===0;
      const selectedBefore={selection:active.style.transform,guide:guide.style.transform};
      pointer(row('Typography')); await pause(40);
      const identicalBefore=motion.calls();
      pointer(row('Typography').querySelector('svg')!);
      pointer(row('Typography').querySelector('.cap-tree-label')!);
      record.identicalTarget=motion.sample();checks.identicalTargetNoRestart=motion.calls()===identicalBefore;
      pointer(tree);record.gap=motion.sample();checks.gapVisible=layer.hasAttribute('data-visible');
      const before=bounds(layer);pointer(row('Spacing'));const after=bounds(layer);
      record.interruption={before,after,difference:distance(before,after),...motion.sample()};
      checks.interruptionWithinOnePixel=distance(before,after)<=1;
      await pause(35);
      const exitBefore=bounds(layer);pointer(tree,'pointerleave');const exitAfter=bounds(layer);
      record.exit={before:exitBefore,after:exitAfter,difference:distance(exitBefore,exitAfter),...motion.sample()};
      checks.exitNoSnap=distance(exitBefore,exitAfter)<=1 && !layer.hasAttribute('data-visible');
      await pause(140);
      pointer(row('Colors'));record.selectedHover=motion.sample();
      checks.selectedRowInHoverPath=layer.hasAttribute('data-visible');
      checks.activeMarkersDoNotTravel=active.style.transform===selectedBefore.selection&&guide.style.transform===selectedBefore.guide&&active.getAnimations().length===0&&guide.getAnimations().length===0;
      flushSync(()=>setSelected('spacing'));await frame();
      record.activeSelection={selection:active.style.transform,guide:guide.style.transform,animations:active.getAnimations().length+guide.getAnimations().length};
      checks.selectionChangeStatic=active.getAnimations().length===0&&guide.getAnimations().length===0;
      const modes=[];
      for(const radius of ['compact','default','rounded']) {
        sidebar.current!.dataset.radius=radius;await frame();await frame();
        const expected=getComputedStyle(row('Colors')).borderRadius,actual=getComputedStyle(layer).borderRadius;
        modes.push({radius,expected,actual,matches:expected===actual});
      }
      record.localRadius=modes;checks.localRadiusMatches=modes.every(mode=>mode.matches);
      const beforeScroll=motion.calls();scroll.scrollTop=90;scroll.dispatchEvent(new Event('scroll'));await frame();
      record.scroll=motion.sample();checks.scrollClearsStaleHover=!layer.hasAttribute('data-visible')&&motion.calls()===beforeScroll;
      pointer(row('Component 3'),'pointermove');record.scrollReacquire=motion.sample();
      checks.scrollReacquireNoAnimation=layer.hasAttribute('data-visible')&&motion.calls()===beforeScroll;
      pointer(tree,'pointerleave');await pause(140);
      row('Component 3').dispatchEvent(new FocusEvent('focusin',{bubbles:true}));
      checks.keyboardFocusVisible=layer.hasAttribute('data-visible');
      row('Component 3').dispatchEvent(new FocusEvent('focusout',{bubbles:true,relatedTarget:row('Component 4')}));
      checks.keyboardTransferVisible=layer.hasAttribute('data-visible');
      pointer(tree,'pointerleave');
      // Verify independent local ownership in real nested component scopes.
      const outerLayer=outer.current!.querySelector<HTMLElement>(':scope > .cap-moving-highlight')!;
      const scopes=[];
      for (const selector of ['.cap-navigation-items','.cap-floating-items']) {
        const scope=outer.current!.querySelector<HTMLElement>(selector)!,localLayer=scope.querySelector<HTMLElement>(':scope > .cap-moving-highlight')!;
        const localMotion=instrument(localLayer);restored.push(localMotion.restore);
        const buttons=scope.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)');
        pointer(outer.current!.querySelector('[data-direct="one"]')!);
        pointer(buttons[0]);
        const entered=localLayer.hasAttribute('data-visible'),outerHidden=!outerLayer.hasAttribute('data-visible');
        pointer(buttons[1]);await pause(35);const count=localMotion.calls();
        pointer(buttons[1].querySelector('svg')??buttons[1]);
        scopes.push({selector,entered,outerHidden,noNestedRestart:localMotion.calls()===count,...localMotion.sample()});
        pointer(scope,'pointerleave');
      }
      record.nestedScopes=scopes;checks.nestedScopesOwnTheirMotion=scopes.every(scope=>scope.entered&&scope.outerHidden&&scope.noNestedRestart);
      setResult(JSON.stringify({date:new Date().toISOString(),passed:Object.values(checks).every(Boolean),checks,record},null,2));
      setStatus(Object.values(checks).every(Boolean)?'All hover checks passed':'Hover checks need review');
    } catch(error) {setStatus(`Failed: ${String(error)}`);setResult(JSON.stringify({passed:false,error:String(error),checks,record},null,2));}
    finally {restored.forEach(restore=>restore());setRunning(false);}
  }
  return <main className="hover-fixture"><h1>Shared hover verification</h1><Button disabled={running} onClick={run}>Run hover sequence</Button><p id="hover-status" role="status">{status}</p>
    <div ref={outer} className="hover-fixture-outer cap-shared-hover"><MovingHighlight root={outer} hover/>
      <div className="hover-fixture-direct"><Button variant="ghost" data-direct="one">Outer one</Button><Button variant="ghost">Outer two</Button></div>
      <div className="hover-fixture-frame" data-surface="raised"><aside ref={sidebar} className="hover-fixture-sidebar" data-radius="default"><div className="hover-fixture-scroll"><TreeView label="Catalogue navigation" nodes={nodes} selectedId={selected} onSelect={node=>setSelected(node.id)} defaultExpandedIds={['foundation','nested','components']} showGuides/></div></aside>
      <div className="hover-fixture-tools"><NavigationMenu label="Nested navigation" activeId="overview" items={[{id:'overview',label:'Overview',href:'#Overview'},{id:'activity',label:'Activity',href:'#Activity'},{id:'reports',label:'Reports',href:'#Reports'}]}/><FloatingActionBar label="Nested floating tools" position="static" variant="divided"><IconButton label="List view" icon="list"/><IconButton label="Grid view" icon="grid"/><IconButton label="Filter" icon="filter"/></FloatingActionBar></div></div>
    </div><pre id="hover-result">{result}</pre>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
