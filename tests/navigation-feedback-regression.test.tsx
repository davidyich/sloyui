import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { Breadcrumbs } from '../src/components/layout';
import { MovingHighlight } from '../src/components/moving-highlight';
import { SegmentedControl } from '../src/components/forms';
import { FloatingActionBar } from '../src/components/workbench';
import { ToastStack } from '../src/components/messages';
import { TreeView } from '../src/components/tree-view';
import { LocaleProvider } from '../src/components/locale';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('keeps pointer ownership when keyboard focus leaves or moves to another action', async () => {
  function Scope() {
    const root = useRef<HTMLDivElement>(null);
    return <div ref={root} className="cap-shared-hover" data-testid="scope"><MovingHighlight root={root} hover/><button>First</button><button>Second</button></div>;
  }
  const { container } = render(<Scope/>);
  await act(async () => {});
  const first = screen.getByRole('button', { name: 'First' }), second = screen.getByRole('button', { name: 'Second' });
  const layer = container.querySelector('.cap-moving-highlight')!;
  act(() => first.focus());
  fireEvent.pointerOver(second);
  expect(second).toHaveAttribute('data-shared-hover-target');
  fireEvent.focusOut(first, { relatedTarget: document.body });
  expect(layer).toHaveAttribute('data-visible');
  expect(second).toHaveAttribute('data-shared-hover-target');
  fireEvent.focusIn(first);
  expect(second).toHaveAttribute('data-shared-hover-target');
  fireEvent.pointerLeave(screen.getByTestId('scope'));
  expect(first).toHaveAttribute('data-shared-hover-target');
  expect(second).not.toHaveAttribute('data-shared-hover-target');
});

it('fades on pointer leave instead of returning to stale mouse focus, then reenters continuously', async () => {
  function Scope() { const root=useRef<HTMLDivElement>(null); return <div ref={root} className="cap-shared-hover" data-testid="scope"><MovingHighlight root={root} hover/><button>Mouse focus</button><button>Hovered</button><button>Next</button></div>; }
  const {container}=render(<Scope/>);
  await act(async () => {});
  const first=screen.getByRole('button',{name:'Mouse focus'}), hovered=screen.getByRole('button',{name:'Hovered'}), next=screen.getByRole('button',{name:'Next'});
  const layer=container.querySelector<HTMLElement>('.cap-moving-highlight')!;
  const nativeMatches=first.matches.bind(first);
  vi.spyOn(first,'matches').mockImplementation(selector=>selector===':focus-visible'?false:nativeMatches(selector));
  act(()=>first.focus());
  expect(layer).not.toHaveAttribute('data-visible');
  fireEvent.pointerOver(hovered);
  expect(hovered).toHaveAttribute('data-shared-hover-target');
  fireEvent.pointerLeave(screen.getByTestId('scope'));
  expect(layer).not.toHaveAttribute('data-visible');
  expect(first).not.toHaveAttribute('data-shared-hover-target');
  expect(document.activeElement).toBe(first);
  fireEvent.pointerOver(next);
  expect(layer).toHaveAttribute('data-visible');
  expect(next).toHaveAttribute('data-shared-hover-target');
});

it('gives nested segments their own hover scope without borrowing the dock layer', async () => {
  const { container } = render(<FloatingActionBar label="View tools"><SegmentedControl label="View" value="one" onValueChange={() => {}} options={[{ value:'one',label:'One' }, { value:'two',label:'Two' }, { value:'locked',label:'Locked',disabled:true }]}/></FloatingActionBar>);
  await act(async () => {});
  const dock = container.querySelector('.cap-floating-items > .cap-moving-highlight')!;
  const segmentHover = container.querySelector('.cap-segmented > .cap-moving-highlight[data-kind="hover"]')!;
  const selection = container.querySelector('.cap-segmented > .cap-moving-highlight[data-kind="selection"]')!;
  fireEvent.pointerOver(screen.getByText('Two'));
  expect(segmentHover).toHaveAttribute('data-visible');
  expect(selection).toHaveAttribute('data-visible');
  expect(dock).not.toHaveAttribute('data-visible');
  fireEvent.pointerOver(screen.getByText('Locked'));
  expect(segmentHover).not.toHaveAttribute('data-visible');
});

it('shows an ellipsis with the full accessible breadcrumb destination', () => {
  render(<Breadcrumbs items={[{ label:'Home',href:'/' },{ label:'Workspace and projects',href:'/projects',collapsed:true },{ label:'Current document' }]}/>);
  const destination = screen.getByRole('link', { name:'Workspace and projects' });
  expect(destination).toHaveTextContent('…');
  expect(destination).toHaveAttribute('href','/projects');
  expect(destination).toHaveAttribute('title','Workspace and projects');
  expect(screen.getByText('Current document')).toHaveAttribute('aria-current','page');
});

it('ends an ancestor spine at its last direct child instead of prolonging it through descendants', () => {
  const { container } = render(<TreeView label="Files" showGuides defaultExpandedIds={['root','last']} nodes={[{id:'root',label:'Root',children:[{id:'first',label:'First'},{id:'last',label:'Last',children:[{id:'nested',label:'Nested'}]}]}]}/>);
  const first = screen.getByRole('treeitem',{name:'First'}).closest('.cap-tree-entry')!;
  const last = screen.getByRole('treeitem',{name:'Last'}).closest('.cap-tree-entry')!;
  const nested = screen.getByRole('treeitem',{name:'Nested'}).closest('.cap-tree-entry')!;
  expect(first.querySelector('.cap-tree-guide')).toHaveAttribute('data-continues');
  expect(last.querySelector('.cap-tree-guide')).not.toHaveAttribute('data-continues');
  expect(nested.querySelectorAll('.cap-tree-guide')).toHaveLength(1);
  expect(container.querySelectorAll('.cap-tree-child-guide')).toHaveLength(2);
});

it('keeps touch expansion without a separate chevron or visible hint and preserves actions', () => {
  render(<LocaleProvider locale="en"><ToastStack showExpandHint={false} position="inline" items={[{id:'rear',title:'Archived',duration:Infinity,action:{label:'Undo',onAction:()=>{}}},{id:'front',title:'Saved',duration:Infinity}]} onDismiss={()=>{}}/></LocaleProvider>);
  const control = screen.getByRole('button',{name:'Expand notifications'});
  expect(control.querySelector('svg')).toBeNull();
  expect(control).toHaveTextContent('2 notifications');
  expect(screen.queryByRole('button',{name:'Undo'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Saved'));
  expect(screen.getByRole('button',{name:'Undo'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Collapse notifications'}));
  expect(screen.queryByRole('button',{name:'Undo'})).not.toBeInTheDocument();
});

it('animates upward stack expansion from measured pixels and respects reduced motion', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype,'animate');
  const animate = vi.fn((_frames: Keyframe[], _options: KeyframeAnimationOptions) => ({ cancel:vi.fn(),onfinish:null }));
  Object.defineProperty(Element.prototype,'animate',{configurable:true,value:animate});
  const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype,'offsetHeight');
  Object.defineProperty(HTMLElement.prototype,'offsetHeight',{configurable:true,get(this:HTMLElement){return this.classList.contains('cap-toast') ? (this.parentElement?.dataset.toastId==='rear'?160:80) : parseFloat(this.style.height)||0;}});
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
    if(!this.classList.contains('cap-toast-stack-item')) return new DOMRect(0,0,320,400);
    const expanded=this.closest('.cap-toast-stack')!.hasAttribute('data-expanded'),scale=expanded?1:1-Number(this.dataset.depth)*.025;
    const width=parseFloat(this.style.width)||320,height=parseFloat(this.style.height)||80,y=parseFloat(this.style.getPropertyValue('--cap-toast-y'))||0;
    const listHeight=parseFloat((this.parentElement as HTMLElement).style.height)||0;
    return new DOMRect(width*(1-scale)/2,500-listHeight+y+height*(1-scale)/2,width*scale,height*scale);
  });
  const media = vi.fn().mockReturnValue({matches:false} as MediaQueryList);
  vi.stubGlobal('matchMedia',media);
  try {
    const { container }=render(<ToastStack position="inline" expandDirection="up" items={[{id:'rear',title:'Long notice',duration:Infinity},{id:'front',title:'Saved',duration:Infinity}]} onDismiss={()=>{}}/>);
    fireEvent.mouseEnter(container.querySelector('.cap-toast-stack')!);
    expect(animate).toHaveBeenCalled();
    expect(animate.mock.calls.some(call=>call[1].duration===220)).toBe(true);
    expect(container.querySelector('[data-toast-id="rear"]')).toHaveStyle({height:'160px'});
    animate.mockClear();
    media.mockReturnValue({matches:true} as MediaQueryList);
    fireEvent.mouseLeave(container.querySelector('.cap-toast-stack')!);
    expect(animate).not.toHaveBeenCalled();
  } finally {
    if(descriptor)Object.defineProperty(Element.prototype,'animate',descriptor);else delete (Element.prototype as {animate?:unknown}).animate;
    if(heightDescriptor)Object.defineProperty(HTMLElement.prototype,'offsetHeight',heightDescriptor);else delete (HTMLElement.prototype as {offsetHeight?:number}).offsetHeight;
  }
});
