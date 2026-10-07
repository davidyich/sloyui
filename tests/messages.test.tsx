import { LocaleProvider } from '../src/components/locale';
import { fireEvent, render as baseRender, screen, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementBar, CardStack, TextShimmer, ToastStack, clearAnnouncementDismissal } from '../src/components/messages';

if(!window.PointerEvent)Object.defineProperty(window,'PointerEvent',{value:MouseEvent});
afterEach(()=>vi.useRealTimers());
describe('message components',()=>{
  it('pauses toast expiry while hovered and never auto-dismisses actionable toasts',()=>{
    vi.useFakeTimers();const dismiss=vi.fn(),action=vi.fn();const items=[{id:'short',title:'Saved',duration:1000},{id:'actionable',title:'Archived',duration:1000,action:{label:'Undo',onAction:action}}];
    render(<ToastStack items={items} onDismiss={dismiss} position="inline"/>);
    const region=screen.getByLabelText('Notifications');fireEvent.mouseEnter(region);act(()=>vi.advanceTimersByTime(1500));expect(dismiss).not.toHaveBeenCalled();fireEvent.mouseLeave(region);act(()=>vi.advanceTimersByTime(1000));expect(dismiss).toHaveBeenCalledWith('short');expect(dismiss).not.toHaveBeenCalledWith('actionable');
    fireEvent.click(screen.getByRole('button',{name:'Undo'}));expect(action).toHaveBeenCalledOnce();
  });
  it('keeps toast timers paused while keyboard focus remains after hover ends',()=>{
    vi.useFakeTimers();const dismiss=vi.fn(),items=[{id:'short',title:'Saved',duration:1000},{id:'action',title:'Archived',action:{label:'Undo',onAction:()=>{}}}];render(<ToastStack items={items} onDismiss={dismiss} position="inline"/>);const region=screen.getByLabelText('Notifications');fireEvent.mouseEnter(region);fireEvent.focus(screen.getByRole('button',{name:'Undo'}));fireEvent.mouseLeave(region);act(()=>vi.advanceTimersByTime(1400));expect(dismiss).not.toHaveBeenCalled();fireEvent.blur(region);act(()=>vi.advanceTimersByTime(1000));expect(dismiss).toHaveBeenCalledWith('short');
  });
  it('makes a dismissed toast inert during exit and can restore the same id',()=>{
    vi.useFakeTimers();
    const item={id:'notice',title:'Saved',duration:Infinity};
    const {rerender}=render(<ToastStack items={[item]} onDismiss={()=>{}} position="inline"/>);
    const toast=document.querySelector('.cap-toast-stack-item')!;
    rerender(<ToastStack items={[]} onDismiss={()=>{}} position="inline"/>);
    expect(toast).toHaveAttribute('data-phase','exit');
    expect(toast).toHaveAttribute('inert');
    expect(toast).toHaveAttribute('aria-hidden','true');
    rerender(<ToastStack items={[item]} onDismiss={()=>{}} position="inline"/>);
    expect(toast).toHaveAttribute('data-phase','open');
    act(()=>vi.advanceTimersByTime(200));
    expect(toast).toBeInTheDocument();
  });
  it('reserves measured inline space for the layered and expanded toast stack',()=>{
    const descriptor=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'offsetHeight');
    Object.defineProperty(HTMLElement.prototype,'offsetHeight',{configurable:true,get(){return this.classList.contains('cap-toast-stack-item')?80:0}});
    try {
      const items=[{id:'one',title:'One',duration:Infinity},{id:'two',title:'Two',duration:Infinity}];
      render(<ToastStack items={items} onDismiss={()=>{}} position="inline"/>);
      const region=screen.getByRole('region',{name:'Notifications'}),list=region.querySelector<HTMLOListElement>('.cap-toast-stack-list')!;
      const collapsed=parseFloat(list.style.getPropertyValue('--cap-toast-inline-clearance'));
      expect(collapsed).toBeGreaterThan(80);
      expect(list.querySelectorAll('.cap-toast-stack-item')).toHaveLength(2);
      fireEvent.mouseEnter(region);
      const expanded=parseFloat(list.style.getPropertyValue('--cap-toast-inline-clearance'));
      expect(expanded).toBeGreaterThanOrEqual(168);
    } finally {if(descriptor)Object.defineProperty(HTMLElement.prototype,'offsetHeight',descriptor);else delete (HTMLElement.prototype as {offsetHeight?:number}).offsetHeight}
  });

  it('rotates announcements with a controlled index and pauses on focus',()=>{
    vi.useFakeTimers();const changed=vi.fn();render(<AnnouncementBar messages={[{id:'one',message:'First notice'},{id:'two',message:'Second notice'}]} interval={1200} index={0} onIndexChange={changed} dismissible={false}/>);
    const region=screen.getByRole('region',{name:'Announcement'});fireEvent.focus(region);act(()=>vi.advanceTimersByTime(1500));expect(changed).not.toHaveBeenCalled();fireEvent.blur(region);act(()=>vi.advanceTimersByTime(1200));expect(changed).toHaveBeenCalledWith(1);
  });
  it('keeps an explicit announcement pause after the pointer and focus leave',()=>{
    vi.useFakeTimers();const changed=vi.fn();render(<AnnouncementBar messages={[{id:'one',message:'First notice'},{id:'two',message:'Second notice'}]} interval={1200} index={0} onIndexChange={changed} controls dismissible={false}/>);fireEvent.click(screen.getByRole('button',{name:'Pause announcements'}));fireEvent.blur(screen.getByRole('region',{name:'Announcement'}));act(()=>vi.advanceTimersByTime(1800));expect(changed).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Resume announcements'}));act(()=>vi.advanceTimersByTime(1200));expect(changed).toHaveBeenCalledWith(1);
  });
  it('collapses a dismissed announcement while making its controls inert',()=>{
    vi.useFakeTimers();
    render(<AnnouncementBar messages={[{id:'one',message:'Important notice'}]}/>);
    const region=screen.getByRole('region',{name:'Announcement'});
    fireEvent.click(screen.getByRole('button',{name:'Dismiss announcement'}));
    expect(region).toHaveAttribute('data-state','closed');
    expect(region).toHaveAttribute('inert');
    expect(region).toHaveAttribute('aria-hidden','true');
    act(()=>vi.advanceTimersByTime(200));
    expect(region).not.toBeInTheDocument();
  });
  it('remembers an announcement dismissal by id and reports its action',()=>{
    const original=Object.getOwnPropertyDescriptor(window,'localStorage');
    const saved=new Map<string,string>();
    Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>{saved.set(key,value)},removeItem:(key:string)=>{saved.delete(key)}}});
    try {
    const onAction=vi.fn(),id='autumn-news';
    clearAnnouncementDismissal(id);
    const message={id:'one',message:'Autumn update',action:{label:'Read',onClick:vi.fn()}};
    const first=render(<AnnouncementBar id={id} messages={[message]} onAction={onAction}/>);
    fireEvent.click(screen.getByRole('button',{name:'Read'}));
    expect(onAction).toHaveBeenCalledWith(message);
    fireEvent.click(screen.getByRole('button',{name:'Dismiss announcement'}));
    first.unmount();
    render(<AnnouncementBar id={id} messages={[message]}/>);
    expect(screen.queryByRole('region',{name:'Announcement'})).not.toBeInTheDocument();
    clearAnnouncementDismissal(id);
    } finally {if(original)Object.defineProperty(window,'localStorage',original)}
  });

  it('supports card keyboard navigation, undo and swipe threshold',()=>{
    const onDecision=vi.fn(),onUndo=vi.fn();render(<CardStack items={['A','B','C']} renderCard={item=><p>{item}</p>} onDecision={onDecision} onUndo={onUndo}/>);
    const stage=screen.getByRole('group',{name:'Card review'});expect(stage.querySelectorAll('.cap-card-stack-card')).toHaveLength(3);fireEvent.keyDown(stage,{key:'ArrowRight'});expect(screen.getByText('B')).toBeInTheDocument();expect(onDecision).toHaveBeenCalledWith('A','next');fireEvent.click(screen.getByRole('button',{name:'Undo'}));expect(screen.getByText('A')).toBeInTheDocument();expect(onUndo).toHaveBeenCalledWith('A','next');
    fireEvent.pointerDown(stage,{clientX:150,pointerId:1,button:0});fireEvent.pointerMove(stage,{clientX:70,pointerId:1});fireEvent.pointerUp(stage,{clientX:70,pointerId:1});expect(screen.getByText('B')).toBeInTheDocument();
  });
  it('cancels an incomplete swipe and leaves embedded controls alone',()=>{
    const decide=vi.fn(),click=vi.fn();render(<CardStack items={['A','B']} onDecision={decide} renderCard={item=><button type="button" onClick={click}>{item}</button>}/>);const stage=screen.getByRole('group',{name:'Card review'});fireEvent.pointerDown(stage,{clientX:180,pointerId:1,button:0});fireEvent.pointerMove(stage,{clientX:80,pointerId:1});fireEvent.pointerCancel(stage,{clientX:80,pointerId:1});expect(screen.getByRole('button',{name:'A'})).toBeInTheDocument();expect(decide).not.toHaveBeenCalled();fireEvent.keyDown(screen.getByRole('button',{name:'A'}),{key:'ArrowRight'});fireEvent.click(screen.getByRole('button',{name:'A'}));expect(decide).not.toHaveBeenCalled();expect(click).toHaveBeenCalledOnce();
  });

  it('reviews the final card, exposes a reset state, and restores a decision',()=>{
    vi.useFakeTimers();
    const decide=vi.fn(),undo=vi.fn(),reset=vi.fn();
    render(<CardStack review items={[{id:'a',name:'Idea A'},{id:'b',name:'Idea B'}]} getKey={item=>item.id} getLabel={item=>item.name} renderCard={item=><p>{item.name}</p>} labels={{left:'Pass',right:'Keep'}} onDecide={decide} onUndo={undo} onReset={reset} renderEmpty={start=><button type="button" onClick={start}>Start again</button>}/>);
    const stage=screen.getByRole('group',{name:'Card review'});
    fireEvent.keyDown(stage,{key:'ArrowLeft'});
    expect(decide).toHaveBeenCalledWith({id:'a',name:'Idea A'},'left');
    fireEvent.click(screen.getByRole('button',{name:'Keep'}));
    expect(decide).toHaveBeenCalledWith({id:'b',name:'Idea B'},'right');
    expect(screen.getByRole('button',{name:'Keep'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Undo'}));
    expect(undo).toHaveBeenCalledWith({id:'b',name:'Idea B'},'right');
    expect(screen.getByRole('button',{name:'Keep'})).toBeEnabled();
    fireEvent.click(screen.getByRole('button',{name:'Keep'}));
    act(()=>vi.advanceTimersByTime(220));
    fireEvent.click(screen.getByRole('button',{name:'Start again'}));
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByText('Idea A')).toBeInTheDocument();
  });

  it('exposes active busy status and pauses shimmer offscreen',()=>{
    const {rerender}=render(<TextShimmer active>Working</TextShimmer>);const status=screen.getByText('Working');expect(status).toHaveAttribute('aria-busy','true');expect(status).toHaveAttribute('data-active');rerender(<TextShimmer active={false}>Working</TextShimmer>);expect(status).not.toHaveAttribute('data-active');expect(status).toHaveAttribute('aria-busy','false');
  });
});

const render = (ui: React.ReactNode, options?: import('@testing-library/react').RenderOptions) => baseRender(ui, { wrapper: ({ children }) => <LocaleProvider locale="en">{children}</LocaleProvider>, ...options });
