import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Accordion, SidebarItem, Tabs } from '../src/components/layout';
import { MovingHighlight } from '../src/components/moving-highlight';

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
});

describe('overflow tabs', () => {
  it('shows meaningful edge controls, reveals controlled selection inside only its viewport and keeps disabled tabs out of arrow navigation', async () => {
    const user = userEvent.setup(), scrollBy = vi.fn();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
      if (this.getAttribute('role') === 'tab') return rect(this.textContent === 'Last' ? 240 : 0, 0, 80, 32);
      return rect(0, 0, 160, 32);
    });
    const frames: ResizeObserverCallback[] = [];
    vi.stubGlobal('ResizeObserver', class { constructor(callback: ResizeObserverCallback) { frames.push(callback); } observe() {} disconnect() {} });
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
