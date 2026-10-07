import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Accordion, SidebarItem, Tabs } from '../src/components/layout';
import { MovingHighlight } from '../src/components/moving-highlight';
import { FloatingActionBar, SidebarPanel } from '../src/components/workbench';
import { Button, IconButton } from '../src/components/primitives';
import { SegmentedControl, Select } from '../src/components/forms';
import { ComboBox } from '../src/components/selection';
import { Calendar } from '../src/components/content';

const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} }) as DOMRect;
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('local shared hover motion', () => {
  function Scope() {
    const root = useRef<HTMLDivElement>(null);
    return <div ref={root} className="cap-shared-hover"><MovingHighlight root={root} hover target=".cap-sidebar-item:not(:disabled):not([aria-current=page])"/><SidebarItem active>Active</SidebarItem><SidebarItem>First</SidebarItem><SidebarItem>Second</SidebarItem></div>;
  }
  it('uses hover geometry independently of the static active row and excludes touch', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      if (this.textContent === 'First') return rect(10, 40, 120, 32);
      if (this.textContent === 'Second') return rect(10, 80, 180, 32);
      return rect(10, 10, 220, 120);
    });
    const { container } = render(<Scope/>);
    await act(async () => {});
    const layer = container.querySelector<HTMLElement>('.cap-moving-highlight')!;
    expect(layer).not.toHaveAttribute('data-visible');
    fireEvent.pointerOver(screen.getByRole('button', { name: 'First' }));
    expect(layer.style.transform).toBe('translate3d(0px,30px,0)');
    fireEvent.pointerOver(screen.getByRole('button', { name: 'Second' }));
    expect(layer.style.transform).toBe('translate3d(0px,70px,0)');
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-current', 'page');
    fireEvent.pointerOver(screen.getByRole('button', { name: 'Active' }));
    expect(layer).not.toHaveAttribute('data-visible');
    const touch = new Event('pointerover', { bubbles: true });
    Object.defineProperty(touch, 'pointerType', { value: 'touch' });
    fireEvent(screen.getByRole('button', { name: 'First' }), touch);
    expect(layer).not.toHaveAttribute('data-visible');
  });
  it('morphs the measured layer with a finite transform animation, respecting reduced motion', async () => {
    const animate = vi.fn(() => ({ cancel: vi.fn() }));
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      if (this.classList.contains('cap-moving-highlight')) return rect(0, 30, 100, 32);
      if (this.textContent === 'First') return rect(0, 30, 100, 32);
      if (this.textContent === 'Second') return rect(0, 70, 200, 32);
      return rect(0, 0, 220, 120);
    });
    try {
      render(<Scope/>);
      await act(async () => {});
      fireEvent.pointerOver(screen.getByRole('button', { name: 'First' }));
      expect(animate).not.toHaveBeenCalled();
      fireEvent.pointerOver(screen.getByRole('button', { name: 'Second' }));
      expect(animate).toHaveBeenLastCalledWith([
        { transform: 'translate3d(0px,30px,0) scale(0.5,1)' },
        { transform: 'translate3d(0px,70px,0) scale(1,1)' },
      ], { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)' });
      animate.mockClear();
      vi.stubGlobal('matchMedia', () => ({ matches: true }));
      fireEvent.pointerOver(screen.getByRole('button', { name: 'First' }));
      expect(animate).not.toHaveBeenCalled();
    } finally { delete (Element.prototype as unknown as { animate?: unknown }).animate; }
  });
  function ContinuousScope({ revision = 0 }: { revision?: number }) {
    const root = useRef<HTMLDivElement>(null), nested = useRef<HTMLDivElement>(null);
    return <div ref={root} className="cap-shared-hover" data-testid="scope"><MovingHighlight root={root} hover target="button:not(:disabled)" revision={revision}/>
      <button style={{ borderRadius: '8px' }}><span>One</span><span aria-hidden="true">Icon</span></button>
      <div data-testid="gap"/>
      <div><button aria-selected="true" style={{ borderRadius: '9999px' }}>Selected</button></div>
      <button disabled>Disabled</button>
      <div ref={nested} className="cap-shared-hover" data-testid="nested"><MovingHighlight root={nested} hover/><button>Nested action</button></div>
    </div>;
  }
  function movingRects() {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      if (this.classList.contains('cap-moving-highlight')) return rect(0, 42, 130, 32);
      if (this.tagName === 'BUTTON') return rect(0, this.textContent === 'Selected' ? 70 : 30, 160, 32);
      return rect(0, 0, 220, 150);
    });
  }
  it('does not restart for nested text/icons, bridges gaps, and retains ownership through revisions', async () => {
    const animate = vi.fn(() => ({ cancel: vi.fn() }));
    Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate });
    movingRects();
    try {
      const { container, rerender } = render(<ContinuousScope/>);
      await act(async () => {});
      const layer = container.querySelector<HTMLElement>('.cap-moving-highlight')!;
      fireEvent.pointerOver(screen.getByText('One'));
      expect(layer.style.transform).toBe('translate3d(0px,30px,0)');
      expect(layer.style.borderRadius).toBe('8px');
      fireEvent.pointerOver(screen.getByText('Icon'));
      fireEvent.pointerOver(screen.getByTestId('gap'));
      expect(layer).toHaveAttribute('data-visible', 'true');
      expect(animate).not.toHaveBeenCalled();
      rerender(<ContinuousScope revision={1}/>);
      expect(layer).toHaveAttribute('data-visible', 'true');
      expect(animate).not.toHaveBeenCalled();
      fireEvent.pointerOver(screen.getByRole('button', { name: 'Selected' }));
      expect(layer.style.borderRadius).toBe('9999px');
      expect(animate).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('button', { name: 'Selected' })).toHaveAttribute('aria-selected', 'true');
    } finally { delete (Element.prototype as unknown as { animate?: unknown }).animate; }
  });
  it('freezes the current visual geometry on interruption and starts the next move there', async () => {
    const cancel = vi.fn(), animate = vi.fn(() => ({ cancel }));
    Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate });
    movingRects();
    try {
      const { container } = render(<ContinuousScope/>);
      await act(async () => {});
      const layer = container.querySelector<HTMLElement>('.cap-moving-highlight')!;
      fireEvent.pointerOver(screen.getByText('One'));
      fireEvent.pointerOver(screen.getByText('Selected'));
      fireEvent.pointerOver(screen.getByText('One'));
      expect(animate).toHaveBeenLastCalledWith([
        { transform: 'translate3d(0px,42px,0) scale(0.8125,1)' },
        { transform: 'translate3d(0px,30px,0) scale(1,1)' },
      ], { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)' });
      fireEvent.pointerLeave(screen.getByTestId('scope'));
      expect(layer).not.toHaveAttribute('data-visible');
      expect(layer.style.transform).toBe('translate3d(0px,42px,0)');
      expect(layer.style.width).toBe('130px');
      expect(cancel).toHaveBeenCalledTimes(2);
      animate.mockClear();
      fireEvent.pointerOver(screen.getByText('Selected'));
      expect(animate).not.toHaveBeenCalled();
      expect(layer.style.transform).toBe('translate3d(0px,70px,0)');
    } finally { delete (Element.prototype as unknown as { animate?: unknown }).animate; }
  });
  it('keeps nested scopes and disabled controls from borrowing the outer layer', async () => {
    const { container } = render(<ContinuousScope/>);
    await act(async () => {});
    const layers = container.querySelectorAll('.cap-moving-highlight');
    fireEvent.pointerOver(screen.getByText('One'));
    fireEvent.pointerOver(screen.getByText('Nested action'));
    expect(layers[0]).not.toHaveAttribute('data-visible');
    expect(layers[1]).toHaveAttribute('data-visible', 'true');
    fireEvent.pointerOver(screen.getByText('One'));
    fireEvent.pointerOver(screen.getByRole('button', { name: 'Disabled' }));
    expect(layers[0]).not.toHaveAttribute('data-visible');
  });
  it('hides stale hover on scroll and reacquires once without a scroll-driven animation', async () => {
    const animate = vi.fn(() => ({ cancel: vi.fn() }));
    Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate });
    movingRects();
    try {
      const { container } = render(<ContinuousScope/>);
      await act(async () => {});
      const layer = container.querySelector('.cap-moving-highlight')!;
      fireEvent.pointerOver(screen.getByText('One'));
      fireEvent.scroll(screen.getByTestId('scope'));
      expect(layer).not.toHaveAttribute('data-visible');
      fireEvent.pointerMove(screen.getByText('Selected'));
      expect(layer).toHaveAttribute('data-visible', 'true');
      expect(animate).not.toHaveBeenCalled();
    } finally { delete (Element.prototype as unknown as { animate?: unknown }).animate; }
  });
  it('remeasures a settled resize and local radius changes without animating layout', async () => {
    const callbacks: ResizeObserverCallback[] = [];
    vi.stubGlobal('ResizeObserver', class { constructor(callback: ResizeObserverCallback) { callbacks.push(callback); } observe() {} unobserve() {} disconnect() {} });
    const animate = vi.fn(() => ({ cancel: vi.fn() }));
    Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate });
    movingRects();
    try {
      const { container } = render(<ContinuousScope/>);
      await act(async () => {});
      const layer = container.querySelector<HTMLElement>('.cap-moving-highlight')!;
      fireEvent.pointerOver(screen.getByText('One'));
      const row = screen.getByRole('button', { name: 'One' });
      row.style.borderRadius = '4px';
      screen.getByTestId('scope').setAttribute('data-radius', 'compact');
      await act(async () => {});
      expect(layer.style.borderRadius).toBe('4px');
      row.style.borderRadius = '16px';
      act(() => callbacks.forEach(callback => callback([], {} as ResizeObserver)));
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 75)); });
      expect(layer.style.borderRadius).toBe('16px');
      expect(animate).not.toHaveBeenCalled();
    } finally { delete (Element.prototype as unknown as { animate?: unknown }).animate; }
  });
});

describe('composite shared surfaces', () => {
  it('preserves filled secondary accent reactions instead of borrowing the neutral moving layer', async () => {
    const {container}=render(<FloatingActionBar label="Mixed accents" position="static"><IconButton label="Neutral tool" icon="list" variant="ghost"/><Button variant="accent-secondary" color="purple">Colored action</Button></FloatingActionBar>);
    await act(async()=>{});
    const layer=container.querySelector('.cap-moving-highlight')!;
    fireEvent.pointerOver(screen.getByRole('button',{name:'Neutral tool'}));
    expect(layer).toHaveAttribute('data-visible','true');
    const colored=screen.getByRole('button',{name:'Colored action'});
    fireEvent.pointerOver(colored);
    expect(layer).not.toHaveAttribute('data-visible');
    expect(colored).not.toHaveAttribute('data-shared-hover-target');
    expect(colored).toHaveAttribute('data-variant','accent-secondary');
  });
  it('moves one floating layer from a button through two Selects and the painted ComboBox wrapper', async () => {
    const animate = vi.fn(() => ({ cancel: vi.fn() }));
    Object.defineProperty(Element.prototype, 'animate', { configurable:true,value:animate });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      return rect(this.getAttribute('aria-label') === 'First choice' ? 40 : this.getAttribute('aria-label') === 'Second choice' ? 140 : this.classList.contains('cap-combobox-input-wrap') ? 240 : 0, 0, 100, 32);
    });
    try {
      const options=[{value:'one',label:'One'},{value:'two',label:'Two'}];
      const {container}=render(<FloatingActionBar label="Mixed tools" position="static" variant="divided"><IconButton label="Tool" icon="list" variant="ghost"/><Select aria-label="First choice" variant="ghost" options={options}/><Select aria-label="Second choice" variant="ghost" options={options}/><ComboBox label="Third choice" variant="ghost" options={options}/></FloatingActionBar>);
      await act(async()=>{});
      const layer=container.querySelector<HTMLElement>('.cap-floating-items > .cap-moving-highlight')!;
      fireEvent.pointerOver(screen.getByRole('button',{name:'Tool'}));
      for(const name of ['First choice','Second choice']) {
        const trigger=screen.getByRole('combobox',{name});
        fireEvent.pointerOver(trigger.querySelector('span')!);
        expect(trigger).toHaveAttribute('data-shared-hover-target','true');
        expect(layer).toHaveAttribute('data-visible','true');
      }
      const input=screen.getByRole('combobox',{name:'Third choice'}),painted=input.closest('.cap-combobox-input-wrap')!;
      fireEvent.pointerOver(input);
      expect(painted).toHaveAttribute('data-shared-hover-target','true');
      expect(layer.style.transform).toBe('translate3d(240px,0px,0)');
      expect(animate).toHaveBeenCalledTimes(3);
      fireEvent.pointerOver(painted.querySelector('svg')!);
      expect(animate).toHaveBeenCalledTimes(3);
    } finally { delete (Element.prototype as unknown as {animate?:unknown}).animate; }
  });
  it('lets calendar month/year controls share their period layer', async () => {
    const {container}=render(<Calendar label="Calendar" defaultMonth="2026-10-01" onValueChange={()=>{}}/>);
    await act(async()=>{});
    const layer=container.querySelector<HTMLElement>('.cap-calendar-period .cap-moving-highlight')!;
    const month=screen.getByRole('combobox',{name:'Месяц'}),year=screen.getByRole('combobox',{name:'Год'});
    fireEvent.pointerOver(month);
    expect(layer).toHaveAttribute('data-visible','true');
    fireEvent.pointerOver(year);
    expect(layer).toHaveAttribute('data-visible','true');
    expect(year.closest('.cap-combobox-input-wrap')).toHaveAttribute('data-shared-hover-target','true');
  });
  it('preserves one sidebar layer across summaries and secondary colored rows without freezing an inherited accent', async () => {
    const {container}=render(<div data-accent="blue"><SidebarPanel label="Space"><Accordion title="Work" variant="navigation" defaultOpen><SidebarItem icon="page">Notes</SidebarItem><SidebarItem color="purple">Projects</SidebarItem><SidebarItem color="inherit">Inherited</SidebarItem></Accordion></SidebarPanel></div>);
    await act(async()=>{});
    const layer=container.querySelector<HTMLElement>('.cap-sidebar-panel-items > .cap-moving-highlight')!;
    fireEvent.pointerOver(screen.getByText('Work'));
    expect(screen.getByText('Work').closest('summary')).toHaveAttribute('data-shared-hover-target','true');
    fireEvent.pointerOver(screen.getByText('Projects'));
    expect(layer).toHaveAttribute('data-visible','true');
    expect(layer).toHaveAttribute('data-accent','purple');
    fireEvent.pointerOver(screen.getByText('Inherited'));
    expect(layer).toHaveAttribute('data-accented');
    expect(layer).not.toHaveAttribute('data-accent');
    fireEvent.pointerOver(screen.getByText('Notes'));
    expect(layer).not.toHaveAttribute('data-accented');
  });
  it('keeps the selected segment radius in CSS so global radius changes cannot leave a frozen inline corner', async () => {
    const {container}=render(<SegmentedControl label="View" value="one" onValueChange={()=>{}} options={[{value:'one',label:'One'},{value:'two',label:'Two'}]}/>);
    await act(async()=>{});
    const layer=container.querySelector<HTMLElement>('.cap-moving-highlight')!;
    expect(layer.style.borderRadius).toBe('');
    document.documentElement.dataset.radius='rounded';
    await act(async()=>{});
    expect(layer.style.borderRadius).toBe('');
    delete document.documentElement.dataset.radius;
  });
});

describe('overflow tabs', () => {
  it('shows meaningful edge controls, reveals controlled selection inside only its viewport and keeps disabled tabs out of arrow navigation', async () => {
    const user = userEvent.setup(), scrollBy = vi.fn();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      if (this.getAttribute('role') === 'tab') return rect(this.textContent === 'Last' ? 240 : 0, 0, 80, 32);
      return rect(0, 0, 160, 32);
    });
    const frames: ResizeObserverCallback[] = [];
    vi.stubGlobal('ResizeObserver', class { constructor(callback: ResizeObserverCallback) { frames.push(callback); } observe() {} unobserve() {} disconnect() {} });
    function Example() {
      const [value, setValue] = useState('first');
      return <Tabs label="Sections" value={value} onValueChange={setValue} items={[{value:'first',label:'First',content:'First panel'}, {value:'locked',label:'Locked',disabled:true,content:'Locked panel'}, {value:'last',label:'Last',content:'Last panel'}]}/>;
    }
    const { container } = render(<Example/>);
    const viewport = container.querySelector<HTMLElement>('.cap-tab-viewport')!;
    Object.defineProperties(viewport, { clientWidth: { configurable:true,value:160 }, scrollWidth: { configurable:true,value:320 }, scrollBy: { configurable:true,value:scrollBy } });
    act(() => frames.forEach(callback => callback([], {} as ResizeObserver)));
    expect(screen.getByRole('button', { name:'Прокрутить вкладки влево' })).toBeDisabled();
    const right = screen.getByRole('button', { name:'Прокрутить вкладки вправо' });
    await user.click(right);
    expect(scrollBy).toHaveBeenCalledWith({ left:120,behavior:'smooth' });
    screen.getByRole('tab', {name:'First'}).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', {name:'Last'})).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Last panel');
    expect(scrollBy).toHaveBeenCalledWith({ left:192,behavior:'smooth' });
    viewport.scrollLeft = 160;
    fireEvent.scroll(viewport);
    expect(screen.getByRole('button', {name:'Прокрутить вкладки вправо'})).toBeDisabled();
    expect(screen.getByRole('button', {name:'Прокрутить вкладки влево'})).not.toBeDisabled();
  });
});

describe('bouncy accordion composition', () => {
  it('supports a controlled single-open group and prevents focus entering closing content immediately', async () => {
    const user = userEvent.setup();
    function Group() {
      const [value, setValue] = useState<string | null>('brief');
      return <>{['brief','notes'].map(id => <Accordion key={id} variant="bouncy" title={id} icon="page" open={value === id} onOpenChange={open => setValue(open ? id : null)}><button>{id} action</button></Accordion>)}</>;
    }
    const { container } = render(<Group/>);
    expect(screen.getByRole('button', {name:'brief action'})).toBeInTheDocument();
    await user.click(screen.getByText('notes'));
    const details = Array.from(container.querySelectorAll('details'));
    expect(details[0]).toHaveAttribute('data-expanded','false');
    expect(details[0].querySelector('.cap-accordion-body')).toHaveAttribute('inert');
    expect(details[1]).toHaveAttribute('data-expanded','true');
    expect(screen.queryByRole('button', {name:'brief action'})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name:'notes action'})).toBeInTheDocument();
    await user.click(screen.getByText('notes'));
    expect(details[1].querySelector('.cap-accordion-body')).toHaveAttribute('inert');
  });
});
