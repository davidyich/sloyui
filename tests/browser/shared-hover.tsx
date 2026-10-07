import { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Button, IconButton } from '../../src/components/primitives';
import { TreeView, type TreeNode } from '../../src/components/tree-view';
import { NavigationMenu } from '../../src/components/navigation-menu';
import { FloatingActionBar, SidebarPanel } from '../../src/components/workbench';
import { Accordion, SidebarItem } from '../../src/components/layout';
import { Select, SegmentedControl } from '../../src/components/forms';
import { ComboBox } from '../../src/components/selection';
import { Calendar } from '../../src/components/content';
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
  const [period,setPeriod]=useState('week'),[view,setView]=useState('board'),[year,setYear]=useState('2026'),[segment,setSegment]=useState('one'),[date,setDate]=useState('2026-10-08');
  const [nativeExpanded,setNativeExpanded]=useState(false);
  const outer=useRef<HTMLDivElement>(null),sidebar=useRef<HTMLDivElement>(null);
  async function run() {
    setRunning(true);setResult('');setStatus('Running finite hover sequence');
    const record: Record<string,unknown>={viewport:{width:innerWidth,height:innerHeight},reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
    const checks: Record<string,boolean>={};
    const restored: (()=>void)[]=[];
    const originalRadius=document.documentElement.getAttribute('data-radius');
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
      async function composite(selector:string,targets:HTMLElement[],key:string) {
        const scope=document.querySelector<HTMLElement>(selector)!,localLayer=scope.querySelector<HTMLElement>(':scope > .cap-moving-highlight')!;
        pointer(scope,'pointerleave');await pause(140);
        const localMotion=instrument(localLayer);restored.push(localMotion.restore);
        const phases=[];
        for (const [index,target] of targets.entries()) {
          pointer(target);await pause(35);
          const painted=target.closest<HTMLElement>('[data-shared-hover-target]')??target;
          const count=localMotion.calls();pointer(target.querySelector('svg')??target);
          phases.push({index,name:target.getAttribute('aria-label')??target.textContent,paintedClass:painted.className,
            marked:painted.hasAttribute('data-shared-hover-target'),fill:getComputedStyle(painted).backgroundColor,
            noRestart:count===localMotion.calls(),...localMotion.sample()});
        }
        await pause(250);
        const painted=targets.at(-1)!.closest<HTMLElement>('[data-shared-hover-target]')??targets.at(-1)!;
        const difference=distance(bounds(localLayer),bounds(painted));
        record[key]={phases,finalGeometryDifference:difference};
        checks[`${key}Continuous`]=phases.every(phase=>phase.visible&&phase.marked&&phase.noRestart)&&difference<=1;
        checks[`${key}PaintOwnedByLayer`]=phases.every(phase=>phase.fill==='rgba(0, 0, 0, 0)'||phase.fill==='transparent');
        return {layer:localLayer,painted};
      }
      const mixed=document.querySelector<HTMLElement>('#composite-tools .cap-floating-items')!;
      const mixedTargets=[mixed.querySelector<HTMLElement>('[aria-label="Mixed button"]')!,mixed.querySelector<HTMLElement>('button[aria-label="First Select"]')!,mixed.querySelector<HTMLElement>('button[aria-label="Second Select"]')!,mixed.querySelector<HTMLElement>('[aria-label="Year choice"]')!];
      const mixedResult=await composite('#composite-tools .cap-floating-items',mixedTargets,'mixedControls');
      pointer(mixed.querySelector('button[aria-label="Disabled choice"]')!);
      checks.disabledCompositeClearsHover=!mixedResult.layer.hasAttribute('data-visible');
      pointer(mixedTargets[0]);
      const secondaryAccent=mixed.querySelector<HTMLElement>('[data-variant="accent-secondary"]')!;
      pointer(secondaryAccent);
      checks.secondaryAccentKeepsOwnReaction=!mixedResult.layer.hasAttribute('data-visible')&&!secondaryAccent.hasAttribute('data-shared-hover-target');
      const calendar=document.querySelector<HTMLElement>('#calendar-check .cap-calendar-period .cap-button-group-items')!;
      const calendarTargets=[calendar.querySelector<HTMLElement>('button[aria-label="Месяц"]')!,calendar.querySelector<HTMLElement>('input[aria-label="Год"]')!];
      const calendarResult=await composite('#calendar-check .cap-button-group-items',calendarTargets,'calendarPeriod');
      const panel=document.querySelector<HTMLElement>('#sidebar-check .cap-sidebar-panel-items')!;
      const sidebarTargets=[panel.querySelector<HTMLElement>('summary')!,panel.querySelector<HTMLElement>('[data-sidebar-row="neutral"]')!,panel.querySelector<HTMLElement>('[data-sidebar-row="colored"]')!];
      const sidebarResult=await composite('#sidebar-check .cap-sidebar-panel-items',sidebarTargets,'sidebarRows');
      checks.sidebarAccentPreserved=sidebarResult.layer.dataset.accent==='purple'&&sidebarResult.layer.hasAttribute('data-accented');
      const segmentRoot=document.querySelector<HTMLElement>('#segment-global .cap-segmented')!,segmentLayer=segmentRoot.querySelector<HTMLElement>('.cap-moving-highlight')!;
      const segmentPaint=segmentRoot.querySelector<HTMLElement>('.cap-segment:has(input:checked) > span')!;
      const radiusSamples=[];
      for (const radius of ['compact','default','rounded']) {
        document.documentElement.dataset.radius=radius;await frame();await frame();
        const global={radius,outer:getComputedStyle(segmentRoot).borderRadius,expected:getComputedStyle(segmentPaint).borderRadius,actual:getComputedStyle(segmentLayer).borderRadius,inline:segmentLayer.style.borderRadius};
        const local=[];
        for (const id of ['composite-tools','calendar-check','sidebar-check','segment-local']) {
          const context=document.getElementById(id)!;context.dataset.radius=radius;await frame();await frame();
          const localLayer=context.querySelector<HTMLElement>(id==='segment-local'?'.cap-segmented > .cap-moving-highlight':id==='sidebar-check'?'.cap-sidebar-panel-items > .cap-moving-highlight':id==='calendar-check'?'.cap-button-group-items > .cap-moving-highlight':'.cap-floating-items > .cap-moving-highlight')!;
          const painted=id==='segment-local'?context.querySelector<HTMLElement>('.cap-segment:has(input:checked) > span')!:id==='sidebar-check'?sidebarResult.painted:id==='calendar-check'?calendarResult.painted:mixedResult.painted;
          // Re-enter a disabled-cleared mixed scope before inspecting its radius.
          if(id==='composite-tools') pointer(mixedTargets.at(-1)!);
          local.push({id,expected:getComputedStyle(painted).borderRadius,actual:getComputedStyle(localLayer).borderRadius});
        }
        radiusSamples.push({global,local});
      }
      record.compositeRadius=radiusSamples;
      checks.segmentGlobalRadiusFollowsCSS=radiusSamples.every(sample=>sample.global.expected===sample.global.actual&&sample.global.inline==='')&&new Set(radiusSamples.map(sample=>sample.global.actual)).size===3;
      checks.compositeLocalRadiiMatch=radiusSamples.every(sample=>sample.local.every(local=>local.expected===local.actual));
      const details=document.querySelector<HTMLDetailsElement>('#native-accordion-check details')!,summary=details.querySelector<HTMLElement>('summary')!;
      if(details.open) {summary.click();await pause(250);}
      summary.querySelector<HTMLElement>('span')!.click();await pause(250);
      const nativeOpen=details.open&&details.dataset.expanded==='true';
      summary.querySelector<HTMLElement>('span')!.click();await pause(250);
      const nativeClosed=!details.open&&details.dataset.expanded==='false';
      record.nativeAccordion={fallback:details.hasAttribute('data-fallback'),nativeOpen,nativeClosed};
      checks.nativeDisclosureClickDoesNotDoubleToggle=nativeOpen&&nativeClosed;
      setResult(JSON.stringify({date:new Date().toISOString(),passed:Object.values(checks).every(Boolean),checks,record},null,2));
      setStatus(Object.values(checks).every(Boolean)?'All hover checks passed':'Hover checks need review');
    } catch(error) {setStatus(`Failed: ${String(error)}`);setResult(JSON.stringify({passed:false,error:String(error),checks,record},null,2));}
    finally {restored.forEach(restore=>restore());if(originalRadius===null)delete document.documentElement.dataset.radius;else document.documentElement.dataset.radius=originalRadius;setRunning(false);}
  }
  return <main className="hover-fixture"><h1>Shared hover verification</h1><Button disabled={running} onClick={run}>Run hover sequence</Button><p id="hover-status" role="status">{status}</p>
    <div ref={outer} className="hover-fixture-outer cap-shared-hover"><MovingHighlight root={outer} hover/>
      <div className="hover-fixture-direct"><Button variant="ghost" data-direct="one">Outer one</Button><Button variant="ghost">Outer two</Button></div>
      <div className="hover-fixture-frame" data-surface="raised"><aside ref={sidebar} className="hover-fixture-sidebar" data-radius="default"><div className="hover-fixture-scroll"><TreeView label="Catalogue navigation" nodes={nodes} selectedId={selected} onSelect={node=>setSelected(node.id)} defaultExpandedIds={['foundation','nested','components']} showGuides/></div></aside>
      <div className="hover-fixture-tools"><NavigationMenu label="Nested navigation" activeId="overview" items={[{id:'overview',label:'Overview',href:'#Overview'},{id:'activity',label:'Activity',href:'#Activity'},{id:'reports',label:'Reports',href:'#Reports'}]}/><FloatingActionBar label="Nested floating tools" position="static" variant="divided"><IconButton label="List view" icon="list"/><IconButton label="Grid view" icon="grid"/><IconButton label="Filter" icon="filter"/></FloatingActionBar></div></div>
    </div>
    <div id="composite-tools" data-radius="default"><h2>Mixed floating controls</h2><FloatingActionBar label="Mixed controls" position="static" variant="divided"><IconButton label="Mixed button" icon="list" variant="ghost"/><Select aria-label="First Select" variant="ghost" value={period} onValueChange={setPeriod} options={[{value:'week',label:'Week'},{value:'month',label:'Month'}]}/><Select aria-label="Second Select" variant="ghost" value={view} onValueChange={setView} options={[{value:'board',label:'Board'},{value:'list',label:'List'}]}/><ComboBox label="Year choice" variant="ghost" value={year} onValueChange={setYear} clearable={false} options={[{value:'2026',label:'2026'},{value:'2027',label:'2027'}]}/><Select aria-label="Disabled choice" variant="ghost" disabled options={[{value:'locked',label:'Locked'}]}/><Button variant="accent-secondary" color="purple">Colored action</Button></FloatingActionBar></div>
    <div className="hover-fixture-expanded"><div id="calendar-check" data-radius="default"><h2>Calendar period</h2><Calendar label="Calendar checks" defaultMonth="2026-10-01" today="2026-10-08" value={date} onValueChange={setDate}/></div><div id="sidebar-check" data-radius="default"><h2>Sidebar groups</h2><SidebarPanel label="Sidebar checks" header="Workspace"><Accordion title="Working group" variant="navigation" defaultOpen><SidebarItem icon="page" data-sidebar-row="neutral">Neutral row</SidebarItem><SidebarItem icon="folder" color="purple" data-sidebar-row="colored">Colored row</SidebarItem><SidebarItem active>Active static row</SidebarItem></Accordion></SidebarPanel></div></div>
    <div id="segment-global"><h2>Segmented global radius</h2><SegmentedControl label="Global segments" value={segment} onValueChange={setSegment} options={[{value:'one',label:'One'},{value:'two',label:'Two'}]}/></div><div id="segment-local" data-radius="default"><h2>Segmented local radius</h2><SegmentedControl label="Local segments" value={segment} onValueChange={setSegment} options={[{value:'one',label:'One'},{value:'two',label:'Two'}]}/></div>
    <div id="native-accordion-check"><h2>Native disclosure</h2><Accordion title="Native disclosure check" onOpenChange={setNativeExpanded}><p>Disclosure content stays open after a real browser click.</p></Accordion><p id="native-disclosure-status">{nativeExpanded?'Expanded':'Collapsed'}</p></div>
    <pre id="hover-result">{result}</pre>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
