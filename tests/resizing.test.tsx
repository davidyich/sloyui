import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContentLayout } from '../src/components/content-layout.js';
import { ResizableCard } from '../src/components/resizable-card.js';
import { CardStack, ToastStack } from '../src/components/messages.js';

class TestPointerEvent extends MouseEvent { pointerId: number; constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 0; } }
const dimensions = (width: () => number, height = 620) => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(width);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(height);
};
const frames = () => {
  const callbacks = new Map<number, FrameRequestCallback>(); let id = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callbacks.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (key: number) => callbacks.delete(key));
  return () => act(() => { const next = [...callbacks.values()]; callbacks.clear(); next.forEach(callback => callback(0)); });
};
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('resizing surfaces', () => {
  it('reserves main content and clamps separator keyboard bounds to the container', () => {
    dimensions(() => 650);
    render(<ContentLayout collapseAt={0} minContentSize={220} left={{ label: 'Outline', content: 'Links', defaultWidth:180 }} right={{ label: 'Details', content: 'Properties', defaultWidth:180 }}>Main</ContentLayout>);
    const left = screen.getByRole('separator', { name:'Ширина: Outline' });
    expect(left).toHaveAttribute('aria-valuemax','226');
    fireEvent.keyDown(left, { key:'End' }); expect(left).toHaveAttribute('aria-valuenow','226');
    fireEvent.keyDown(left, { key:'ArrowRight' }); expect(left).toHaveAttribute('aria-valuenow','226');
    expect(screen.getByRole('region',{name:'Контент'})).toBeInTheDocument();
  });
  it('responds to observed parent width without discarding independent dimensions', () => {
    let width = 650; dimensions(() => width);
    const observers: (() => void)[] = [];
    vi.stubGlobal('ResizeObserver', class { constructor(cb: () => void) { observers.push(cb); } observe() {} disconnect() {} });
    const { container, rerender } = render(<ContentLayout left={{label:'Outline',content:'Links',defaultWidth:180}}>Main</ContentLayout>);
    expect(container.firstChild).toHaveAttribute('data-collapsed');
    width=900; act(()=>observers.forEach(cb=>cb())); expect(container.firstChild).not.toHaveAttribute('data-collapsed');
    fireEvent.keyDown(screen.getByRole('separator'),{key:'ArrowRight'});
    rerender(<ContentLayout orientation="vertical" style={{height:620}} left={{label:'Outline',content:'Links',defaultHeight:200}}>Main</ContentLayout>);
    fireEvent.keyDown(screen.getByRole('separator'),{key:'ArrowDown'}); expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow','210');
    rerender(<ContentLayout collapseAt={0} left={{label:'Outline',content:'Links'}}>Main</ContentLayout>);
    expect(screen.getByRole('separator')).toHaveAttribute('aria-valuenow','190');
  });
  it('coalesces pointer updates, flushes on release, and cancels pending frames when a pane closes', () => {
    vi.stubGlobal('PointerEvent',TestPointerEvent); const runFrame=frames(), changed=vi.fn(); dimensions(()=>900);
    const pane={label:'Outline',content:'Links',defaultWidth:180,onWidthChange:changed};
    const {rerender,container}=render(<ContentLayout collapseAt={0} left={pane}>Main</ContentLayout>);
    let handle=screen.getByRole('separator');
    fireEvent.pointerDown(handle,{button:0,pointerId:1,clientX:100});
    fireEvent.pointerMove(handle,{pointerId:1,clientX:120}); fireEvent.pointerMove(handle,{pointerId:1,clientX:140});
    expect(changed).not.toHaveBeenCalled(); runFrame(); expect(changed).toHaveBeenCalledExactlyOnceWith(220);
    fireEvent.pointerMove(handle,{pointerId:1,clientX:150}); fireEvent.pointerUp(handle,{pointerId:1,clientX:150}); expect(changed).toHaveBeenLastCalledWith(230);
    fireEvent.pointerDown(handle,{button:0,pointerId:2,clientX:100}); fireEvent.pointerMove(handle,{pointerId:2,clientX:180});
    rerender(<ContentLayout collapseAt={0} left={{...pane,open:false}}>Main</ContentLayout>); runFrame(); expect(changed).toHaveBeenCalledTimes(2); expect(container.firstChild).not.toHaveAttribute('data-resizing');
    rerender(<ContentLayout collapseAt={0} left={pane}>Main</ContentLayout>); handle=screen.getByRole('separator'); fireEvent.pointerDown(handle,{button:0,pointerId:3,clientX:100}); fireEvent.pointerMove(handle,{pointerId:3,clientX:110}); fireEvent.pointerUp(handle,{pointerId:3}); expect(changed).toHaveBeenLastCalledWith(240);
  });
  it('supports controlled Card size, keyboard bounds and a structural Card boundary', () => {
    dimensions(()=>500); const commit=vi.fn();
    function Example(){const [size,setSize]=useState({width:320,height:200}); return <ResizableCard label="Draft" size={size} onSizeChange={setSize} onSizeCommit={commit} minWidth={200} maxWidth={450} minHeight={150} maxHeight={350} data-theme="dark" data-borders="off"><input aria-label="Body" defaultValue="Keep"/></ResizableCard>;}
    const {container}=render(<Example/>), handle=screen.getByRole('button',{name:'Изменить размер: Draft'}), card=screen.getByRole('group',{name:'Draft'});
    expect(card).toHaveClass('cap-surface-boundary'); expect(card).toHaveAttribute('data-theme','dark'); expect(container.firstChild).not.toHaveAttribute('data-theme');
    fireEvent.keyDown(handle,{key:'ArrowRight',shiftKey:true}); expect(card).toHaveStyle({width:'360px',height:'200px'}); expect(commit).toHaveBeenLastCalledWith({width:360,height:200});
    fireEvent.keyDown(handle,{key:'Home'}); expect(card).toHaveStyle({width:'200px',height:'150px'});
    fireEvent.keyDown(handle,{key:'End'}); expect(card).toHaveStyle({width:'450px',height:'350px'}); expect(screen.getByRole('textbox',{name:'Body'})).toHaveValue('Keep');
  });
  it('fits a smaller parent below minWidth and restores desired size when space returns', () => {
    let width=400; dimensions(()=>width); const observers:(()=>void)[]=[];
    vi.stubGlobal('ResizeObserver',class { constructor(cb:()=>void){observers.push(cb);} observe(){} disconnect(){} });
    render(<ResizableCard defaultSize={{width:360,height:240}} minWidth={200}>Body</ResizableCard>);
    const card=screen.getByRole('group',{name:'Карточка'}); width=140; act(()=>observers.forEach(cb=>cb())); expect(card).toHaveStyle({width:'140px'});
    width=400; act(()=>observers.forEach(cb=>cb())); expect(card).toHaveStyle({width:'360px'});
  });
  it('flushes Card drag on release and restores initial size on Escape without a commit', () => {
    vi.stubGlobal('PointerEvent',TestPointerEvent); const runFrame=frames(), commit=vi.fn(); dimensions(()=>500);
    render(<ResizableCard label="Draft" defaultSize={{width:300,height:200}} onSizeCommit={commit}>Body</ResizableCard>);
    const handle=screen.getByRole('button',{name:'Изменить размер: Draft'}), card=screen.getByRole('group',{name:'Draft'});
    fireEvent.pointerDown(handle,{button:0,pointerId:1,clientX:100,clientY:100}); fireEvent.pointerMove(handle,{pointerId:1,clientX:150,clientY:160}); runFrame(); expect(card).toHaveStyle({width:'350px',height:'260px'});
    fireEvent.keyDown(handle,{key:'Escape'}); expect(card).toHaveStyle({width:'300px',height:'200px'}); expect(commit).not.toHaveBeenCalled();
    fireEvent.pointerDown(handle,{button:0,pointerId:2,clientX:100,clientY:100}); fireEvent.pointerMove(handle,{pointerId:2,clientX:140,clientY:120}); fireEvent.pointerUp(handle,{pointerId:2}); expect(card).toHaveStyle({width:'340px',height:'220px'}); expect(commit).toHaveBeenCalledExactlyOnceWith({width:340,height:220});
  });
  it('disables resizing for a controlled Card without a change callback', () => {
    render(<ResizableCard size={{width:320,height:200}}><button>Action</button></ResizableCard>);
    expect(screen.getByRole('button',{name:'Изменить размер: Карточка'})).toBeDisabled(); expect(screen.getByRole('button',{name:'Action'})).toBeEnabled();
  });
});

describe('stack viewport bounds',()=>{
  it.each(['CardStack','ToastStack'])('fits collapsed horizontal %s and aligns the expanded front including padding',family=>{
    dimensions(()=>400,300); vi.spyOn(window,'getComputedStyle').mockImplementation(()=>({paddingLeft:'32px',paddingRight:'32px',paddingTop:'32px',paddingBottom:'32px'} as CSSStyleDeclaration));
    const props={expandDirection:'left' as const};
    const {container,rerender}=family==='CardStack'?render(<CardStack {...props} expanded={false} items={['A','B','C']} renderCard={item=><p>{item}</p>}/>):render(<ToastStack {...props} expanded={false} position="inline" items={['A','B','C'].map(id=>({id,title:id,duration:Infinity}))} onDismiss={()=>{}}/>);
    const viewport=container.querySelector<HTMLDivElement>('[class$="stack-viewport"]')!,stage=viewport.firstElementChild as HTMLElement;
    expect(parseFloat(stage.style.width)).toBeLessThanOrEqual(336);
    if(family==='CardStack')rerender(<CardStack {...props} expanded items={['A','B','C']} renderCard={item=><p>{item}</p>}/>);
    else rerender(<ToastStack {...props} expanded position="inline" items={['A','B','C'].map(id=>({id,title:id,duration:Infinity}))} onDismiss={()=>{}}/>);
    expect(viewport.scrollLeft).toBe(parseFloat(stage.style.width)-336);
    const front=viewport.querySelector<HTMLElement>('[data-depth="0"]')!;
    const x=parseFloat(front.style.getPropertyValue(family==='CardStack'?'--cap-card-x':'--cap-toast-x'));
    expect(x-viewport.scrollLeft).toBe(0);
  });
  it('pauses controlled-collapsed toasts on hover without changing the expansion prop',()=>{
    vi.useFakeTimers(); const dismiss=vi.fn(),expand=vi.fn();
    render(<ToastStack expanded={false} onExpandedChange={expand} position="inline" items={[{id:'a',title:'A',duration:1000}]} onDismiss={dismiss}/>);
    const region=screen.getByRole('region',{name:'Notifications'}); fireEvent.mouseEnter(region); act(()=>vi.advanceTimersByTime(1500)); expect(dismiss).not.toHaveBeenCalled(); expect(expand).not.toHaveBeenCalled(); expect(region).not.toHaveAttribute('data-expanded');
    fireEvent.mouseLeave(region); act(()=>vi.advanceTimersByTime(1000)); expect(dismiss).toHaveBeenCalledWith('a');
  });
});
