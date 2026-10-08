import { createRef, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, IconButton, type Size } from '../src/components/primitives';
import { ActionBar, Alert, ButtonGroup, FloatingField, ScrollArea, SplitButton } from '../src/components/workbench';

afterEach(() => vi.unstubAllGlobals());

describe('Workbench interaction contracts', () => {
  it('tracks only hidden scroll edges, reacts to resizing and exposes the scrolling ref', () => {
    let resized: (() => void) | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resized = callback; }
      observe = vi.fn(); disconnect = disconnect;
    });
    const ref = createRef<HTMLDivElement>(), edges = vi.fn();
    const { unmount } = render(<ScrollArea label="Notes" axis="both" ref={ref} onEdgesChange={edges}><div>Content</div></ScrollArea>);
    const viewport = screen.getByRole('region', { name: 'Notes' });
    expect(viewport).toBe(ref.current); expect(viewport).toHaveAttribute('tabindex', '0');
    let height = 400, width = 500;
    Object.defineProperties(viewport, {
      scrollHeight: { configurable: true, get: () => height }, clientHeight: { configurable: true, value: 100 },
      scrollWidth: { configurable: true, get: () => width }, clientWidth: { configurable: true, value: 200 },
    });
    act(() => resized?.());
    expect(edges).toHaveBeenLastCalledWith({ top: false, left: false, right: true, bottom: true });
    viewport.scrollTop = 150; viewport.scrollLeft = 150; fireEvent.scroll(viewport);
    expect(edges).toHaveBeenLastCalledWith({ top: true, left: true, right: true, bottom: true });
    viewport.scrollTop = 300; viewport.scrollLeft = 300; fireEvent.scroll(viewport);
    expect(edges).toHaveBeenLastCalledWith({ top: true, left: true, right: false, bottom: false });
    height = 100; width = 200; viewport.scrollTop = 0; viewport.scrollLeft = 0; act(() => resized?.());
    expect(edges).toHaveBeenLastCalledWith({ top: false, left: false, right: false, bottom: false });
    unmount(); expect(disconnect).toHaveBeenCalledOnce();
  });

  it('keeps split actions separate and disables both while loading', async () => {
    const primary = vi.fn(), secondary = vi.fn();
    const { rerender } = render(<SplitButton label="Create" menuLabel="More create actions" onClick={primary} items={[{ id: 'note', label: 'Create note', onSelect: secondary }]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(primary).toHaveBeenCalledOnce(); expect(secondary).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'More create actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Create note' }));
    expect(secondary).toHaveBeenCalledOnce(); expect(primary).toHaveBeenCalledOnce();
    rerender(<SplitButton label="Create" loading items={[{ id: 'note', label: 'Create note', onSelect: secondary }]} />);
    const buttons = within(screen.getByRole('group', { name: 'Create' })).getAllByRole('button');
    expect(buttons).toHaveLength(2); buttons.forEach(button => expect(button).toBeDisabled());
  });

  it('preserves native scrolling and focus when changing horizontal scrollbar visibility', () => {
    const ref = createRef<HTMLDivElement>(), onScroll = vi.fn(), onEdgesChange = vi.fn();
    const { rerender } = render(<ScrollArea label="Categories" axis="horizontal" ref={ref} viewportProps={{ onScroll }} onEdgesChange={onEdgesChange}><Button>Category</Button></ScrollArea>);
    const viewport = screen.getByRole('region', { name: 'Categories' });
    Object.defineProperties(viewport, { scrollWidth: { configurable: true, value: 400 }, clientWidth: { configurable: true, value: 100 } });
    viewport.focus(); viewport.scrollLeft = 90; fireEvent.scroll(viewport);
    expect(onScroll).toHaveBeenCalledOnce();
    expect(onEdgesChange).toHaveBeenLastCalledWith({ top: false, bottom: false, left: true, right: true });
    rerender(<ScrollArea label="Categories" axis="horizontal" scrollbar="auto" ref={ref} viewportProps={{ onScroll }} onEdgesChange={onEdgesChange}><Button>Category</Button></ScrollArea>);
    expect(ref.current).toBe(viewport); expect(viewport).toHaveFocus(); expect(viewport.scrollLeft).toBe(90);
    const arrow = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    const wheel = new WheelEvent('wheel', { deltaX: 40, bubbles: true, cancelable: true });
    viewport.dispatchEvent(arrow); viewport.dispatchEvent(wheel);
    expect(arrow.defaultPrevented).toBe(false); expect(wheel.defaultPrevented).toBe(false);
  });

  it('tracks physical overflow edges in a right-to-left horizontal viewport', () => {
    const changes = vi.fn();
    render(<ScrollArea label="RTL categories" axis="horizontal" onEdgesChange={changes} viewportProps={{ style: { direction: 'rtl' } }}>Content</ScrollArea>);
    const viewport = screen.getByRole('region', { name: 'RTL categories' });
    Object.defineProperties(viewport, { scrollWidth: { configurable: true, value: 400 }, clientWidth: { configurable: true, value: 100 } });
    fireEvent.scroll(viewport);
    expect(changes).toHaveBeenLastCalledWith({ top: false, bottom: false, left: true, right: false });
    viewport.scrollLeft = -300; fireEvent.scroll(viewport);
    expect(changes).toHaveBeenLastCalledWith({ top: false, bottom: false, left: false, right: true });
  });

  it('uses one tab stop and arrow navigation in the toolbar, skipping disabled actions', async () => {
    render(<ActionBar label="Editor"><Button>First</Button><Button disabled>Locked</Button><Button>Last</Button></ActionBar>);
    const first = screen.getByRole('button', { name: 'First' }), last = screen.getByRole('button', { name: 'Last' });
    expect(first).toHaveAttribute('tabindex', '0'); expect(last).toHaveAttribute('tabindex', '-1');
    first.focus(); await userEvent.keyboard('{ArrowRight}'); expect(last).toHaveFocus();
    expect(first).toHaveAttribute('tabindex', '-1'); expect(last).toHaveAttribute('tabindex', '0');
    await userEvent.keyboard('{ArrowRight}'); expect(first).toHaveFocus();
    await userEvent.keyboard('{End}'); expect(last).toHaveFocus();
    await userEvent.keyboard('{Home}'); expect(first).toHaveFocus();
  });

  it('keeps nested actions and menu keyboard behavior intact when toolbar size changes', async () => {
    const create = vi.fn();
    function Example({ size }: { size: Size }) {
      return <ActionBar label="Collection actions" size={size}>
        <ButtonGroup label="View"><IconButton label="List" icon="list" /><IconButton label="Grid" icon="grid" /></ButtonGroup>
        <SplitButton label="Create" menuLabel="More actions" onClick={create} items={[{ id: 'note', label: 'New note', onSelect: create }]} />
      </ActionBar>;
    }
    const { rerender } = render(<Example size="sm" />);
    screen.getByRole('button', { name: 'List' }).focus(); await userEvent.keyboard('{ArrowRight}');
    const grid = screen.getByRole('button', { name: 'Grid' }); expect(grid).toHaveFocus();
    rerender(<Example size="lg" />); expect(grid).toHaveFocus();
    await userEvent.keyboard('{End}{ArrowDown}'); expect(screen.getByRole('menuitem', { name: 'New note' })).toHaveFocus();
    await userEvent.keyboard('{Escape}'); expect(screen.getByRole('button', { name: 'More actions' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}{Enter}'); expect(create).toHaveBeenCalledOnce();
  });

  it('preserves field labels, external help, required validation and disabled semantics', async () => {
    const { rerender } = render(<><span id="context">Visible to your team.</span><FloatingField id="collection" label="Collection" hint="Choose a short name." aria-describedby="context" required /></>);
    const input = screen.getByRole('textbox', { name: 'Collection' });
    expect(input).toHaveAccessibleDescription('Visible to your team. Choose a short name.'); expect(input).toBeRequired();
    await userEvent.type(input, 'Ideas'); expect(input).toHaveValue('Ideas');
    rerender(<FloatingField id="collection" label="Collection" error="This name is already used." disabled />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox')).toHaveAccessibleDescription('This name is already used.');
    expect(screen.getByRole('textbox')).toBeDisabled(); expect(screen.getByRole('alert')).toHaveTextContent('This name is already used.');
  });

  it('reveals alert details accessibly and keeps dismissal separate from expansion', async () => {
    function Example() {
      const [visible, setVisible] = useState(true);
      return visible ? <Alert title="Saved" tone="success" expandable onDismiss={() => setVisible(false)}><Button>Read details</Button></Alert> : <p>Dismissed</p>;
    }
    render(<Example />);
    const toggle = screen.getByRole('button', { name: 'Saved' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false'); expect(screen.queryByRole('button', { name: 'Read details' })).not.toBeInTheDocument();
    await userEvent.click(toggle); expect(toggle).toHaveAttribute('aria-expanded', 'true'); expect(screen.getByRole('button', { name: 'Read details' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Закрыть уведомление' })); expect(screen.getByText('Dismissed')).toBeInTheDocument();
  });

  it('leaves controlled alert expansion with the consumer', async () => {
    const change = vi.fn();
    const { rerender } = render(<Alert title="Sync" expandable expanded={false} onExpandedChange={change}>Details</Alert>);
    await userEvent.click(screen.getByRole('button', { name: 'Sync' }));
    expect(change).toHaveBeenCalledWith(true); expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
    rerender(<Alert title="Sync" expandable expanded onExpandedChange={change}>Details</Alert>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });
});
