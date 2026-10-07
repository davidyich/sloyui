import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollFadeProgress } from '../src/components/scroll-fade.js';
import { ScrollArea } from '../src/components/workbench.js';
import { LocaleProvider } from '../src/components/locale.js';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../src/components/resizable-group.js';

class TestPointerEvent extends MouseEvent { pointerId:number;constructor(type:string,init:PointerEventInit={}){super(type,init);this.pointerId=init.pointerId??0;} }
const progress=(node:HTMLElement,edge:string)=>Number(node.style.getPropertyValue(`--cap-scroll-fade-${edge}-progress`));
const frames=()=>{const callbacks=new Map<number,FrameRequestCallback>();let id=0;vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{callbacks.set(++id,cb);return id});vi.stubGlobal('cancelAnimationFrame',(key:number)=>callbacks.delete(key));return()=>act(()=>{const pending=[...callbacks.values()];callbacks.clear();pending.forEach(cb=>cb(0))});};
const measureGroup=(width=1000,height=600)=>{vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockReturnValue(width);vi.spyOn(HTMLElement.prototype,'clientHeight','get').mockReturnValue(height);vi.spyOn(HTMLElement.prototype,'offsetWidth','get').mockImplementation(function(this:HTMLElement){return this.classList.contains('cap-resizable-handle')?12:0});vi.spyOn(HTMLElement.prototype,'offsetHeight','get').mockImplementation(function(this:HTMLElement){return this.classList.contains('cap-resizable-handle')?12:0});};
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()});

describe('scroll-aware fades',()=>{
  it('gradually reveals start/middle/end masks and clears them when overflow disappears',()=>{
    render(<ScrollArea label="Notes" fade="vertical" fadeReveal={100} fadeSize="15%">Content</ScrollArea>);
    const viewport=screen.getByRole('region',{name:'Notes'});let height=400;
    Object.defineProperties(viewport,{scrollHeight:{configurable:true,get:()=>height},clientHeight:{configurable:true,value:100}});
    fireEvent.scroll(viewport);expect(progress(viewport,'top')).toBe(0);expect(progress(viewport,'bottom')).toBe(1);
    viewport.scrollTop=25;fireEvent.scroll(viewport);expect(progress(viewport,'top')).toBe(.156);expect(progress(viewport,'bottom')).toBe(1);
    viewport.scrollTop=150;fireEvent.scroll(viewport);expect(progress(viewport,'top')).toBe(1);expect(progress(viewport,'bottom')).toBe(1);
    viewport.scrollTop=280;fireEvent.scroll(viewport);expect(progress(viewport,'bottom')).toBe(.104);
    viewport.scrollTop=300;fireEvent.scroll(viewport);expect(progress(viewport,'bottom')).toBe(0);
    height=100;viewport.scrollTop=0;fireEvent.scroll(viewport);expect(progress(viewport,'top')).toBe(0);expect(progress(viewport,'bottom')).toBe(0);
    expect(viewport.parentElement?.style.getPropertyValue('--cap-scroll-fade-size')).toBe('15%');
  });
  it('lets explicit fade override legacy shadows while the floating slot stays outside the viewport',()=>{
    const {rerender}=render(<ScrollArea label="Notes" shadows fade={false} floating={<button>Save</button>}>Content</ScrollArea>),viewport=screen.getByRole('region',{name:'Notes'});
    Object.defineProperties(viewport,{scrollHeight:{configurable:true,value:400},clientHeight:{configurable:true,value:100}});fireEvent.scroll(viewport);
    expect(viewport.parentElement).toHaveAttribute('data-fade','none');expect(progress(viewport,'bottom')).toBe(0);expect(viewport).not.toContainElement(screen.getByRole('button',{name:'Save'}));
    rerender(<ScrollArea label="Notes" shadows={false} fade="bottom" fadeReveal={0}>Content</ScrollArea>);expect(progress(viewport,'bottom')).toBe(1);expect(progress(viewport,'top')).toBe(0);
    rerender(<ScrollArea label="Notes" shadows={false}>Content</ScrollArea>);expect(viewport.parentElement).toHaveAttribute('data-fade','none');expect(progress(viewport,'bottom')).toBe(0);
  });
  it('mirrors logical start/end in RTL and clamps elastic overscroll',()=>{
    const {rerender}=render(<ScrollArea label="RTL" axis="horizontal" fade="end" fadeReveal={100} viewportProps={{dir:'rtl',style:{direction:'rtl'}}}>Content</ScrollArea>),viewport=screen.getByRole('region',{name:'RTL'});
    Object.defineProperties(viewport,{scrollWidth:{configurable:true,value:400},clientWidth:{configurable:true,value:100}});fireEvent.scroll(viewport);expect(progress(viewport,'left')).toBe(1);expect(progress(viewport,'right')).toBe(0);
    viewport.scrollLeft=-300;fireEvent.scroll(viewport);expect(progress(viewport,'left')).toBe(0);
    rerender(<ScrollArea label="RTL" axis="horizontal" fade="start" fadeReveal={100} viewportProps={{style:{direction:'rtl'}}}>Content</ScrollArea>);expect(progress(viewport,'right')).toBe(1);expect(progress(viewport,'left')).toBe(0);
    viewport.scrollLeft=-500;fireEvent.scroll(viewport);expect(progress(viewport,'right')).toBe(1);expect(progress(viewport,'left')).toBe(0);
  });
  it('uses the spacing token for the default reveal distance and leaves a non-overflowing axis crisp',()=>{
    render(<ScrollArea label="Tokens" axis="both" viewportProps={{style:{'--cap-space-12':'20px'} as React.CSSProperties}}>Content</ScrollArea>);const viewport=screen.getByRole('region',{name:'Tokens'});
    Object.defineProperties(viewport,{scrollHeight:{configurable:true,value:300},clientHeight:{configurable:true,value:100},scrollWidth:{configurable:true,value:100},clientWidth:{configurable:true,value:100}});
    viewport.scrollTop=20;fireEvent.scroll(viewport);expect(progress(viewport,'top')).toBe(.5);expect(progress(viewport,'left')).toBe(0);expect(progress(viewport,'right')).toBe(0);
  });
});

describe('compound resizable groups',()=>{
  it('normalizes controlled layout within all panel limits and keeps the complete parent allocation',()=>{
    const {container}=render(<ResizablePanelGroup layout={[90,5,5]} onLayoutChange={()=>{}}><ResizablePanel label="A" minSize={20} maxSize={80}>A</ResizablePanel><ResizableHandle/><ResizablePanel label="B" minSize={20}>B</ResizablePanel><ResizableHandle/><ResizablePanel label="C" minSize={20}>C</ResizablePanel></ResizablePanelGroup>);
    const sizes=[...container.querySelectorAll<HTMLElement>('.cap-resizable-panel')].map(node=>Number(node.style.getPropertyValue('--cap-resizable-panel-size')));expect(sizes).toEqual([60,20,20]);expect(sizes.reduce((sum,value)=>sum+value,0)).toBe(100);
    expect(screen.getAllByRole('separator')[0]).toHaveAttribute('aria-valuemax','60');
  });
  it('resizes only the adjacent pair with keyboard bounds while nested groups keep an independent axis',()=>{
    render(<ResizablePanelGroup defaultLayout={[30,70]}><ResizablePanel label="Navigation" minSize={20} maxSize={60}>Nav</ResizablePanel><ResizableHandle label="Outer" withHandle/><ResizablePanel label="Main" minSize={40} maxSize={80}><ResizablePanelGroup orientation="vertical" defaultLayout={[40,60]}><ResizablePanel label="Header" minSize={25} maxSize={75}>Header</ResizablePanel><ResizableHandle label="Inner"/><ResizablePanel label="Body" minSize={25}>Body</ResizablePanel></ResizablePanelGroup></ResizablePanel></ResizablePanelGroup>);
    const outer=screen.getByRole('separator',{name:'Outer'}),inner=screen.getByRole('separator',{name:'Inner'});
    fireEvent.keyDown(outer,{key:'ArrowRight'});expect(outer).toHaveAttribute('aria-valuenow','31');expect(inner).toHaveAttribute('aria-valuenow','40');
    fireEvent.keyDown(inner,{key:'ArrowDown',shiftKey:true});expect(inner).toHaveAttribute('aria-valuenow','50');expect(outer).toHaveAttribute('aria-valuenow','31');
    fireEvent.keyDown(outer,{key:'End'});expect(outer).toHaveAttribute('aria-valuenow','60');fireEvent.keyDown(outer,{key:'Home'});expect(outer).toHaveAttribute('aria-valuenow','20');expect(inner).toHaveAttribute('aria-orientation','horizontal');
  });
  it('coalesces pointer writes, checks pointer IDs, commits on release and restores on Escape',()=>{
    measureGroup();vi.stubGlobal('PointerEvent',TestPointerEvent);const runFrame=frames(),changed=vi.fn(),commit=vi.fn();
    const {container}=render(<ResizablePanelGroup defaultLayout={[50,50]} onLayoutChange={changed} onLayoutCommit={commit}><ResizablePanel minSize={20}>A</ResizablePanel><ResizableHandle label="Handle"/><ResizablePanel minSize={20}>B</ResizablePanel></ResizablePanelGroup>),handle=screen.getByRole('separator');
    fireEvent.pointerDown(handle,{pointerId:1,button:0,clientX:100});fireEvent.pointerMove(handle,{pointerId:1,clientX:149.4});fireEvent.pointerMove(handle,{pointerId:1,clientX:198.8});expect(changed).not.toHaveBeenCalled();
    fireEvent.pointerUp(handle,{pointerId:2});expect(commit).not.toHaveBeenCalled();expect(container.firstChild).toHaveAttribute('data-resizing');
    fireEvent.pointerUp(handle,{pointerId:1});expect(changed).toHaveBeenCalledExactlyOnceWith([60,40]);expect(commit).toHaveBeenCalledExactlyOnceWith([60,40]);expect(container.firstChild).not.toHaveAttribute('data-resizing');
    fireEvent.pointerDown(handle,{pointerId:3,button:0,clientX:100});fireEvent.pointerMove(handle,{pointerId:3,clientX:1.2});runFrame();expect(handle).toHaveAttribute('aria-valuenow','50');fireEvent.keyDown(handle,{key:'Escape'});expect(handle).toHaveAttribute('aria-valuenow','60');expect(commit).toHaveBeenCalledOnce();
  });
  it('remeasures usable parent space after resize, excluding handles, and mirrors horizontal RTL keys',()=>{
    let width=1000;measureGroup();vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockImplementation(()=>width);vi.stubGlobal('PointerEvent',TestPointerEvent);frames();const observers:(()=>void)[]=[];vi.stubGlobal('ResizeObserver',class{constructor(cb:()=>void){observers.push(cb)}observe(){}disconnect(){}});
    render(<ResizablePanelGroup dir="rtl" style={{direction:'rtl'}} defaultLayout={[50,50]}><ResizablePanel>A</ResizablePanel><ResizableHandle/><ResizablePanel>B</ResizablePanel></ResizablePanelGroup>);const handle=screen.getByRole('separator');
    fireEvent.keyDown(handle,{key:'ArrowLeft'});expect(handle).toHaveAttribute('aria-valuenow','51');
    width=500;act(()=>observers.forEach(cb=>cb()));fireEvent.pointerDown(handle,{pointerId:1,button:0,clientX:100});fireEvent.pointerMove(handle,{pointerId:1,clientX:51.2});fireEvent.pointerUp(handle,{pointerId:1});expect(handle).toHaveAttribute('aria-valuenow','61');
  });
  it('clears a removed handle during drag and permits a new drag after it returns',()=>{
    measureGroup();vi.stubGlobal('PointerEvent',TestPointerEvent);const runFrame=frames(),changed=vi.fn();
    const body=(show:boolean)=><ResizablePanelGroup onLayoutChange={changed}><ResizablePanel>A</ResizablePanel>{show&&<ResizableHandle/>}<ResizablePanel>B</ResizablePanel></ResizablePanelGroup>;
    const {rerender,container}=render(body(true));let handle=screen.getByRole('separator');fireEvent.pointerDown(handle,{pointerId:1,button:0,clientX:100});fireEvent.pointerMove(handle,{pointerId:1,clientX:200});rerender(body(false));runFrame();expect(changed).not.toHaveBeenCalled();expect(container.firstChild).not.toHaveAttribute('data-resizing');
    rerender(body(true));handle=screen.getByRole('separator');fireEvent.pointerDown(handle,{pointerId:2,button:0,clientX:100});fireEvent.pointerMove(handle,{pointerId:2,clientX:198.8});fireEvent.pointerUp(handle,{pointerId:2});expect(changed).toHaveBeenCalledWith([60,40]);
  });
  it('keeps controlled read-only/disabled handles out of Tab while panel content remains interactive',()=>{
    const {rerender}=render(<ResizablePanelGroup layout={[40,60]}><ResizablePanel><button>Action</button></ResizablePanel><ResizableHandle/><ResizablePanel>B</ResizablePanel></ResizablePanelGroup>);expect(screen.getByRole('separator')).toHaveAttribute('aria-disabled','true');expect(screen.getByRole('separator')).toHaveAttribute('tabindex','-1');expect(screen.getByRole('button',{name:'Action'})).toBeEnabled();
    function Controlled(){const [layout,setLayout]=useState([40,60]);return <ResizablePanelGroup layout={layout} onLayoutChange={setLayout}><ResizablePanel>A</ResizablePanel><ResizableHandle/><ResizablePanel>B</ResizablePanel></ResizablePanelGroup>}
    rerender(<Controlled/>);fireEvent.keyDown(screen.getByRole('separator'),{key:'ArrowRight'});expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow','41');
  });
  it('fits impossible minimums to the parent and makes a zero-sized panel inert',()=>{
    const {rerender}=render(<ResizablePanelGroup><ResizablePanel minSize={70}>A</ResizablePanel><ResizableHandle/><ResizablePanel minSize={70}>B</ResizablePanel></ResizablePanelGroup>);expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow','50');
    rerender(<ResizablePanelGroup layout={[0,100]} onLayoutChange={()=>{}}><ResizablePanel id="zero"><button>Hidden</button></ResizablePanel><ResizableHandle/><ResizablePanel>B</ResizablePanel></ResizablePanelGroup>);expect(document.getElementById('zero')).toHaveAttribute('inert');expect(document.getElementById('zero')).toHaveAttribute('aria-hidden','true');
  });
  it('localizes only built-in interface text and keeps explicit labels and context intact',()=>{
    const {rerender}=render(<LocaleProvider locale="en"><ResizablePanelGroup data-theme="dark" data-radius="rounded" data-borders="off"><ResizablePanel surface="raised">A</ResizablePanel><ResizableHandle/><ResizablePanel label="Custom">B</ResizablePanel></ResizablePanelGroup></LocaleProvider>);
    expect(screen.getByRole('group',{name:'Resizable panels'})).toHaveAttribute('data-radius','rounded');expect(screen.getByRole('separator',{name:'Resize panels'})).toHaveAccessibleDescription(/Drag the separator/);expect(screen.getByRole('group',{name:'Panel 1'})).toHaveAttribute('data-surface','raised');expect(screen.getByRole('group',{name:'Custom'})).toBeInTheDocument();
    rerender(<LocaleProvider locale="ru"><ResizablePanelGroup><ResizablePanel>A</ResizablePanel><ResizableHandle/><ResizablePanel>B</ResizablePanel></ResizablePanelGroup></LocaleProvider>);expect(screen.getByRole('separator',{name:'Изменить размер панелей'})).toHaveAccessibleDescription(/Перетащите разделитель/);
  });
});


it('clamps RTL elastic overscroll before calculating physical fades and reporting edges', () => {
 const { container } = render(<ScrollArea label="RTL content" axis="horizontal" fade="both" fadeReveal={100} viewportProps={{ dir: 'rtl', style: { direction: 'rtl' } }}>Content</ScrollArea>);
 const viewport = screen.getByRole('region', { name: 'RTL content' });
 Object.defineProperties(viewport, { scrollWidth: { configurable: true, value: 300 }, clientWidth: { configurable: true, value: 100 }, scrollHeight: { configurable: true, value: 100 }, clientHeight: { configurable: true, value: 100 } });
 viewport.scrollLeft = 25; fireEvent.scroll(viewport);
 expect(scrollFadeProgress(viewport, 'horizontal', 'both', 100, true)).toEqual({ top: 0, bottom: 0, left: 1, right: 0 });
 expect(progress(viewport, 'right')).toBe(0);
 expect(container.firstChild).not.toHaveAttribute('data-scroll-right');
 expect(container.firstChild).toHaveAttribute('data-scroll-left');
 viewport.scrollLeft = -225; fireEvent.scroll(viewport);
 expect(scrollFadeProgress(viewport, 'horizontal', 'both', 100, true)).toEqual({ top: 0, bottom: 0, left: 0, right: 1 });
 expect(progress(viewport, 'left')).toBe(0);
 expect(container.firstChild).not.toHaveAttribute('data-scroll-left');
 expect(container.firstChild).toHaveAttribute('data-scroll-right');
 viewport.scrollLeft = -100; fireEvent.scroll(viewport);
 expect(progress(viewport, 'left')).toBe(1); expect(progress(viewport, 'right')).toBe(1);
});
