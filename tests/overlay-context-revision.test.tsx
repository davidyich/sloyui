import { useRef, useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette, OverlayPortal, Popover, useOverlayScope } from '../src/components/overlays';
import { Input, Select } from '../src/components/forms';

function ScopeProbe({ replacement = false, active = true }: { replacement?: boolean; active?: boolean }) {
  const anchor = useRef<HTMLSpanElement>(null), panel = useRef<HTMLDivElement>(null);
  const scope = useOverlayScope(anchor, active);
  return <><span ref={anchor} key={String(replacement)} data-testid="scope-anchor" />
    <OverlayPortal anchor={anchor} panel={panel}><div ref={panel} data-testid="scope-panel" {...scope} /></OverlayPortal></>;
}

describe('Live independent portal context', () => {
  it('keeps no subscriptions for closed surfaces and reuses one live connection across rerenders', () => {
    const OriginalObserver = globalThis.MutationObserver;
    const observers: MutationObserver[] = [], connections = new Set<MutationObserver>();
    class TrackedObserver extends OriginalObserver {
      constructor(callback: MutationCallback) { super(callback); observers.push(this); }
      observe(target: Node, options?: MutationObserverInit) { connections.add(this); super.observe(target, options); }
      disconnect() { connections.delete(this); super.disconnect(); }
    }
    vi.stubGlobal('MutationObserver', TrackedObserver);
    try {
      const fixture = (active: boolean, caption: string) => <div data-theme="dark"><ScopeProbe active={active}/><span>{caption}</span></div>;
      const { rerender, unmount } = render(fixture(false, 'initial'));
      expect(observers).toHaveLength(0);
      rerender(fixture(true, 'open'));
      expect(observers).toHaveLength(1); expect(connections.size).toBe(1);
      for (let index = 0; index < 20; index++) rerender(fixture(true, String(index)));
      expect(observers).toHaveLength(1); expect(connections.size).toBe(1);
      rerender(fixture(false, 'closed'));
      expect(connections.size).toBe(0);
      rerender(fixture(true, 'reopened'));
      expect(observers).toHaveLength(2); expect(connections.size).toBe(1);
      unmount(); expect(connections.size).toBe(0);
    } finally { vi.unstubAllGlobals(); }
  });

  it('mounts a large collection of closed popovers without context observers or exit timers', () => {
    const OriginalObserver=globalThis.MutationObserver, created=vi.fn();
    class TrackedObserver extends OriginalObserver { constructor(callback:MutationCallback){super(callback);created();} }
    vi.useFakeTimers(); vi.stubGlobal('MutationObserver',TrackedObserver);
    try {
      const {unmount}=render(<>{Array.from({length:200},(_,index)=><Popover key={index} label={`Options ${index}`}><button>Action</button></Popover>)}</>);
      expect(created).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
      unmount(); expect(vi.getTimerCount()).toBe(0);
    } finally {vi.useRealTimers();vi.unstubAllGlobals();}
  });
  it('reads each nearest axis independently and removes expired local overrides', async () => {
    const { container } = render(<div data-theme="dark" data-accent="rose" data-radius="rounded" data-borders="on" data-shadow="soft" data-density="default">
      <div data-theme="light" data-color="blue"><div data-borders="off" data-radius="compact" data-shadow="compact" data-accent="inherit" data-color="inherit" data-density="compact"><ScopeProbe /></div></div>
    </div>);
    const panel = screen.getByTestId('scope-panel'), inner = container.querySelector('[data-borders="off"]')!;
    expect(panel).toHaveAttribute('data-theme', 'light');
    expect(panel).toHaveAttribute('data-color', 'blue');
    expect(panel).not.toHaveAttribute('data-accent');
    expect(panel).toHaveAttribute('data-radius', 'compact');
    expect(panel).toHaveAttribute('data-density','compact');
    act(() => { inner.setAttribute('data-radius', 'none'); });
    await waitFor(() => expect(panel).toHaveAttribute('data-radius', 'none'));
    expect(panel).toHaveAttribute('data-borders', 'off');
    expect(panel).toHaveAttribute('data-shadow', 'compact');
    act(() => { inner.removeAttribute('data-radius'); inner.removeAttribute('data-borders'); inner.setAttribute('data-shadow', 'soft'); container.querySelector('[data-theme="light"]')!.removeAttribute('data-theme'); });
    await waitFor(() => expect(panel).toHaveAttribute('data-radius', 'rounded'));
    expect(panel).toHaveAttribute('data-theme', 'dark');
    expect(panel).toHaveAttribute('data-borders', 'on');
    expect(panel).toHaveAttribute('data-shadow', 'soft');
    act(()=>{inner.removeAttribute('data-density');});
    await waitFor(()=>expect(panel).toHaveAttribute('data-density','default'));
    expect(panel).toHaveAttribute('data-surface', 'floating');
  });

  it('follows a moved anchor and subscribes to its new ancestors even when modes initially match', async () => {
    const { container } = render(<><div data-testid="before" data-radius="default" data-theme="dark"><ScopeProbe /></div><div data-testid="after" data-radius="default" data-theme="dark" /></>);
    const anchor = screen.getByTestId('scope-anchor'), original = anchor.parentElement!, destination = screen.getByTestId('after'), panel = screen.getByTestId('scope-panel');
    try {
      await act(async () => { destination.append(anchor); });
      act(() => { destination.setAttribute('data-radius', 'rounded'); destination.setAttribute('data-borders', 'on'); destination.setAttribute('data-color', 'teal'); });
      await waitFor(() => expect(panel).toHaveAttribute('data-radius', 'rounded'));
      expect(panel).toHaveAttribute('data-borders', 'on');
      expect(panel).toHaveAttribute('data-color', 'teal');
      expect(panel).toHaveAttribute('data-theme', 'dark');
      expect(panel).toHaveAttribute('data-surface', 'floating');
      act(() => { container.querySelector('[data-testid="before"]')!.setAttribute('data-radius', 'compact'); });
      expect(panel).toHaveAttribute('data-radius', 'rounded');
    } finally { await act(async () => { original.append(anchor); }); }
  });

  it('captures context when an anchor ref is replaced during a commit', async () => {
    function Fixture() {
      const [replacement, setReplacement] = useState(false);
      return <div data-radius={replacement ? 'rounded' : 'compact'}><button onClick={() => setReplacement(true)}>Replace anchor</button><ScopeProbe replacement={replacement} /></div>;
    }
    render(<Fixture />);
    const oldAnchor = screen.getByTestId('scope-anchor');
    await userEvent.click(screen.getByRole('button', { name: 'Replace anchor' }));
    const anchor = screen.getByTestId('scope-anchor');
    expect(anchor).not.toBe(oldAnchor);
    act(() => { anchor.setAttribute('data-shadow', 'compact'); });
    await waitFor(() => expect(screen.getByTestId('scope-panel')).toHaveAttribute('data-shadow', 'compact'));
    expect(screen.getByTestId('scope-panel')).toHaveAttribute('data-radius', 'rounded');
  });

  it('keeps an open nested Select in the nearest surface scheme through live changes and removed overrides', async () => {
    render(<div data-testid="scheme-root" data-theme="dark" data-surface-scheme="standard">
      <div data-testid="scheme-local" data-surface-scheme="inverted">
        <Popover label="Surface options"><Select label="Nested surface choice" options={[{ value: 'one', label: 'One' }]} /></Popover>
      </div>
    </div>);
    await userEvent.click(screen.getByRole('button', { name: 'Surface options' }));
    const popover = screen.getByRole('dialog', { name: 'Surface options' });
    await userEvent.click(screen.getByRole('combobox', { name: 'Nested surface choice' }));
    const listbox = screen.getByRole('listbox'), local = screen.getByTestId('scheme-local');
    expect(popover).toHaveAttribute('data-surface-scheme', 'inverted');
    expect(listbox).toHaveAttribute('data-surface-scheme', 'inverted');
    expect(listbox).toHaveAttribute('data-surface', 'floating');
    act(() => local.setAttribute('data-surface-scheme', 'standard'));
    await waitFor(() => {
      expect(popover).toHaveAttribute('data-surface-scheme', 'standard');
      expect(listbox).toHaveAttribute('data-surface-scheme', 'standard');
    });
    act(() => screen.getByTestId('scheme-root').setAttribute('data-surface-scheme', 'inverted'));
    expect(listbox).toHaveAttribute('data-surface-scheme', 'standard');
    act(() => local.removeAttribute('data-surface-scheme'));
    await waitFor(() => {
      expect(popover).toHaveAttribute('data-surface-scheme', 'inverted');
      expect(listbox).toHaveAttribute('data-surface-scheme', 'inverted');
    });
    expect(screen.getByRole('listbox')).toBe(listbox);
    expect(listbox).toHaveAttribute('data-theme', 'dark');
    expect(listbox).toHaveAttribute('data-surface', 'floating');
  });

  it('renders an accessible icon-only Popover trigger and restores keyboard focus', async () => {
    render(<Popover label="Filter components" triggerIcon="filter" size="sm"><Input aria-label="Search filters" /></Popover>);
    const trigger = screen.getByRole('button', { name: 'Filter components' });
    expect(trigger.querySelectorAll('svg')).toHaveLength(1);
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('data-size', 'sm');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('textbox', { name: 'Search filters' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('keeps the compact command dialog named while placing search beside close and fading only results', async () => {
    const select = vi.fn();
    render(<CommandPalette open showTitle={false} onOpenChange={() => {}} items={[{id:'settings',label:'Settings',onSelect:select}]}/>);
    const dialog=screen.getByRole('dialog',{name:'Быстрый поиск'}), heading=screen.getByRole('heading',{name:'Быстрый поиск'});
    expect(heading).toHaveClass('cap-sr-only');
    expect(screen.getByRole('combobox').closest('.cap-dialog-header')).toContainElement(screen.getByRole('button',{name:'Закрыть'}));
    const results=screen.getByRole('region',{name:'Результаты поиска'});
    expect(results.parentElement).toHaveAttribute('data-fade','vertical');
    expect(results.parentElement).toHaveAttribute('data-scrollbar','hidden');
    expect(results).not.toContainElement(screen.getByRole('button',{name:'Закрыть'}));
    expect(dialog.querySelector('.cap-dialog-footer')).not.toBeNull();
    await userEvent.keyboard('{Enter}'); expect(select).toHaveBeenCalledOnce();
  });
});
