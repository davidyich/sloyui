import { LocaleProvider } from '../src/components/locale';
import { useState } from 'react';
import { act, fireEvent, render as baseRender, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Toast } from '../src/components/overlays';
import { Alert, StatusBar } from '../src/components/workbench';
import { ToastStack, CardStack, TextShimmer, AnnouncementBar } from '../src/components/messages';
import { stackLayout } from '../src/components/stack-layout';

describe('measured directional stack layout',()=>{
 it.each(['up','down','left','right'] as const)('reserves complete variable-size bounds when expanded %s', direction=>{
  const sizes=[{width:220,height:80},{width:220,height:130},{width:220,height:90}],collapsed=stackLayout(sizes,direction,false),expanded=stackLayout(sizes,direction,true);
  expect(expanded.positions.every(item=>item.x>=0&&item.y>=0)).toBe(true);
  if(direction==='left'||direction==='right'){expect(expanded.width).toBe(676);expect(expanded.height).toBe(130);expect(expanded.width).toBeGreaterThan(collapsed.width)}else{expect(expanded.height).toBe(316);expect(expanded.width).toBe(220);expect(expanded.height).toBeGreaterThan(collapsed.height)}
  const a=expanded.positions[0],b=expanded.positions[1];expect(direction==='up'?a.y>b.y:direction==='left'?a.x>b.x:direction==='down'?a.y<b.y:a.x<b.x).toBe(true);
 });
 it('can expand the inline toast stack through its touch/keyboard control',()=>{
  render(<ToastStack position="inline" expandDirection="left" items={[{id:'a',title:'First',duration:Infinity},{id:'b',title:'Second',duration:Infinity}]} onDismiss={()=>{}}/>);
  const region=screen.getByRole('region',{name:'Notifications'}),button=screen.getByRole('button',{name:'Expand notifications'});
  fireEvent.focus(button);fireEvent.click(button);expect(region).toHaveAttribute('data-expanded');expect(region).toHaveAttribute('data-direction','left');
  fireEvent.click(screen.getByRole('button',{name:'Collapse notifications'}));expect(region).not.toHaveAttribute('data-expanded');
 });
 it('keeps controlled expansion under the consumer and uses the specified direction',()=>{
  const changed=vi.fn();const view=render(<ToastStack position="inline" expandDirection="right" expanded={false} onExpandedChange={changed} items={[{id:'a',title:'First',duration:Infinity},{id:'b',title:'Second',duration:Infinity}]} onDismiss={()=>{}}/>);
  fireEvent.click(screen.getByRole('button',{name:'Expand notifications'}));expect(changed).toHaveBeenCalledWith(true);expect(screen.getByRole('region',{name:'Notifications'})).not.toHaveAttribute('data-expanded');
  view.rerender(<ToastStack position="inline" expandDirection="right" expanded items={[{id:'a',title:'First',duration:Infinity},{id:'b',title:'Second',duration:Infinity}]} onDismiss={()=>{}}/>);expect(screen.getByRole('region',{name:'Notifications'})).toHaveAttribute('data-expanded');
 });
 it('keeps controlled expansion pinned across pointer/mouse exit and emits changes only for explicit actions',()=>{
  const changed=vi.fn();
  function Controlled(){const [expanded,setExpanded]=useState(false);return <ToastStack position="inline" expanded={expanded} onExpandedChange={next=>{changed(next);setExpanded(next)}} items={[{id:'a',title:'First',duration:Infinity},{id:'b',title:'Second',duration:Infinity}]} onDismiss={()=>{}}/>}
  render(<Controlled/>);
  const region=screen.getByRole('region',{name:'Notifications'});
  fireEvent.mouseEnter(region);fireEvent.pointerEnter(region,{pointerType:'mouse'});
  expect(region).not.toHaveAttribute('data-expanded');expect(changed).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Expand notifications'}));
  expect(region).toHaveAttribute('data-expanded');expect(changed).toHaveBeenCalledExactlyOnceWith(true);
  fireEvent.mouseLeave(region);fireEvent.pointerLeave(region,{pointerType:'mouse'});
  expect(region).toHaveAttribute('data-expanded');expect(changed).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button',{name:'Collapse notifications'}));
  expect(region).not.toHaveAttribute('data-expanded');expect(changed.mock.calls).toEqual([[true],[false]]);
  fireEvent.mouseEnter(region);fireEvent.mouseLeave(region);
  expect(region).not.toHaveAttribute('data-expanded');expect(changed).toHaveBeenCalledTimes(2);
 });
 it('keeps uncontrolled explicit expansion pinned and permits temporary hover after an explicit collapse',()=>{
  render(<ToastStack position="inline" items={[{id:'a',title:'First',duration:Infinity},{id:'b',title:'Second',duration:Infinity}]} onDismiss={()=>{}}/>);
  const region=screen.getByRole('region',{name:'Notifications'});
  fireEvent.click(screen.getByRole('button',{name:'Expand notifications'}));
  fireEvent.mouseEnter(region);fireEvent.mouseLeave(region);
  expect(region).toHaveAttribute('data-expanded');
  fireEvent.click(screen.getByRole('button',{name:'Collapse notifications'}));
  expect(region).not.toHaveAttribute('data-expanded');
  fireEvent.mouseEnter(region);expect(region).not.toHaveAttribute('data-expanded');
  fireEvent.mouseLeave(region);fireEvent.mouseEnter(region);expect(region).toHaveAttribute('data-expanded');
  fireEvent.mouseLeave(region);expect(region).not.toHaveAttribute('data-expanded');
 });
 it('expands a review deck without consuming a card and retains decision/undo controls',()=>{
  const decide=vi.fn();render(<CardStack review expandDirection="up" items={['A','B']} renderCard={item=><div style={{padding:20}}>{item}</div>} onDecide={decide}/>);
  fireEvent.click(screen.getByRole('button',{name:'Expand cards'}));expect(screen.getByRole('region',{name:'Card review'})).toHaveAttribute('data-expanded');expect(decide).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Keep'}));expect(decide).toHaveBeenCalledWith('A','right');fireEvent.click(screen.getByRole('button',{name:'Undo'}));expect(screen.getByText('A')).toBeInTheDocument();
 });
});

it('preserves the neutral shell accent and colors only its status icon on every feedback component',()=>{
 const {container}=render(<div data-theme="dark" data-accent="rose" data-surface="canvas" data-borders="off"><Toast title="Saved" tone="success" color="violet" contrast surface="inherit"/><Alert title="Attention" tone="warning" color="blue" contrast/><StatusBar tone="danger" color="orange" contrast variant="surface">Disconnected</StatusBar></div>);
 for(const shell of container.querySelectorAll('.cap-feedback')){expect(shell).not.toHaveAttribute('data-accent');expect(shell).not.toHaveAttribute('data-color');expect(shell).not.toHaveAttribute('data-surface');expect(shell.querySelector('.cap-feedback-icon')).toHaveAttribute('data-accent');expect(shell.querySelector('.cap-feedback-icon')).toHaveAttribute('data-contrast')}
});

it('supports explicit colored surfaces, high contrast, an action slot and ordinary dismissal',()=>{
 const dismiss=vi.fn(),action=vi.fn();render(<Toast title="Failed" tone="danger" color="violet" appearance="solid" contrast surface="raised" action={<button onClick={action}>Retry</button>} onDismiss={dismiss}/>);
 const shell=screen.getByRole('status');expect(shell).toHaveAttribute('data-accent','violet');expect(shell).toHaveAttribute('data-surface','raised');expect(shell).toHaveAttribute('data-feedback-appearance','solid');
 fireEvent.click(screen.getByRole('button',{name:'Retry'}));expect(action).toHaveBeenCalledOnce();fireEvent.click(screen.getByRole('button',{name:'Dismiss notification'}));expect(dismiss).toHaveBeenCalledOnce();
});

it('reobserves shimmer after a tag change and pauses without removing its visual treatment',()=>{
 const callbacks:Array<IntersectionObserverCallback>=[],targets:Element[]=[],disconnect=vi.fn();
 class Observer {constructor(callback:IntersectionObserverCallback){callbacks.push(callback)}observe(target:Element){targets.push(target)}disconnect=disconnect;unobserve(){}takeRecords(){return []}root=null;rootMargin='';thresholds=[]}
 vi.stubGlobal('IntersectionObserver',Observer);
 try{const view=render(<TextShimmer as="span">Working</TextShimmer>);const first=screen.getByText('Working');act(()=>callbacks[0]([{target:first,isIntersecting:false} as unknown as IntersectionObserverEntry],{} as IntersectionObserver));expect(first).toHaveAttribute('data-active');expect(first).toHaveAttribute('data-paused');
 view.rerender(<TextShimmer as="p">Working</TextShimmer>);const second=screen.getByText('Working');expect(second.tagName).toBe('P');expect(targets).toContain(second);expect(disconnect).toHaveBeenCalled();act(()=>callbacks.at(-1)!([{target:second,isIntersecting:true} as unknown as IntersectionObserverEntry],{} as IntersectionObserver));expect(second).not.toHaveAttribute('data-paused');
 }finally{vi.unstubAllGlobals()}
});

it('keeps announcement action and dismiss independent with long arbitrary content',()=>{
 const action=vi.fn();function Example(){const [open,setOpen]=useState(true);return <AnnouncementBar surface="raised" open={open} onOpenChange={setOpen} autoPlay={false} messages={[{id:'a',message:<span>{'Long text '.repeat(30)}</span>,action:{label:'Read details',onClick:action}}]}/>}
 render(<Example/>);const shell=screen.getByRole('region',{name:'Announcement'});expect(shell).toHaveAttribute('data-surface','raised');fireEvent.click(screen.getByRole('button',{name:'Read details'}));expect(action).toHaveBeenCalledOnce();expect(shell).toHaveAttribute('data-state','open');fireEvent.click(screen.getByRole('button',{name:'Dismiss announcement'}));expect(shell).toHaveAttribute('inert');
});

const render = (ui: React.ReactNode, options?: import('@testing-library/react').RenderOptions) => baseRender(ui, { wrapper: ({ children }) => <LocaleProvider locale="en">{children}</LocaleProvider>, ...options });
