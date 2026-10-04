import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../src/components/primitives';
import { Select, Field, Input } from '../src/components/forms';
import { Dialog, Drawer, Menu, Popover, Tooltip } from '../src/components/overlays';
import axe from 'axe-core';

describe('Custom overlay contracts', () => {
  it('navigates custom select choices, skips disabled values and submits a native form value', async () => {
    const onChange = vi.fn(), onValueChange = vi.fn();
    render(<form aria-label="Preferences"><Field label="Priority">{props => <Select {...props} name="priority" defaultValue="normal" onChange={onChange} onValueChange={onValueChange}><option value="normal">Normal</option><option value="locked" disabled>Locked</option><option value="high">High</option></Select>}</Field></form>);
    const control = screen.getByRole('combobox', { name: 'Priority' });
    await userEvent.click(control); expect(screen.getByRole('listbox')).toBeInTheDocument();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(control).toHaveTextContent('High'); expect(control).toHaveFocus(); expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledTimes(1); expect(onValueChange).toHaveBeenCalledWith('high');
    expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('priority')).toBe('high');
    (screen.getByRole('form') as HTMLFormElement).reset(); await waitFor(() => expect(control).toHaveTextContent('Normal'));
  });
  it('supports typeahead and controlled select values without opening an OS picker', async () => {
    function Example() { const [value, setValue] = useState('a'); return <Select aria-label="Object type" value={value} onValueChange={setValue} options={[{ value: 'a', label: 'Article' }, { value: 'b', label: 'Book' }, { value: 'c', label: 'Calendar' }]} />; }
    render(<Example />); const control = screen.getByRole('combobox'); control.focus();
    await userEvent.keyboard('ca{Enter}'); expect(control).toHaveTextContent('Calendar'); expect(control.tagName).toBe('BUTTON');
    await userEvent.click(control); await userEvent.keyboard('{Escape}'); expect(screen.queryByRole('listbox')).not.toBeInTheDocument(); expect(control).toHaveFocus();
  });
  it('ports menu appearance and accent out of clipped containers and supports multi-character typeahead', async () => {
    render(<div data-theme="dark" data-accent="rose" style={{ overflow: 'hidden' }}><Menu label="Actions" items={[{ id: 'copy', label: 'Copy' }, { id: 'create', label: 'Create' }, { id: 'delete', label: 'Delete', danger: true, separator: true }]} /></div>);
    const trigger = screen.getByRole('button', { name: 'Actions' }); await userEvent.click(trigger);
    const menu = screen.getByRole('menu'); expect(menu.parentElement).toBe(document.body); expect(menu).toHaveAttribute('data-theme', 'dark'); expect(menu).toHaveAttribute('data-accent', 'rose');
    await userEvent.keyboard('cr'); expect(screen.getByRole('menuitem', { name: 'Create' })).toHaveFocus();
    await userEvent.keyboard('{Escape}'); expect(trigger).toHaveFocus();
  });
  it('traps focus in a custom modal, dims/inerts its background and restores body and focus', async () => {
    function Example() { const [open, setOpen] = useState(false); return <><Button onClick={() => setOpen(true)}>Open</Button><Dialog open={open} onOpenChange={setOpen} title="Edit" footer={<Button>Save</Button>}><Input aria-label="Name" /></Dialog></>; }
    const { container } = render(<Example />); const opener = screen.getByRole('button', { name: 'Open' }); await userEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Edit' }); expect(dialog.tagName).toBe('DIV'); expect(container.inert).toBe(true); expect(document.body.style.overflow).toBe('hidden');
    screen.getByRole('button', { name: 'Save' }).focus(); await userEvent.tab(); expect(screen.getByRole('button', { name: 'Закрыть' })).toHaveFocus();
    await userEvent.tab({ shift: true }); expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    await userEvent.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(container.inert).not.toBe(true); expect(document.body.style.overflow).toBe(''); expect(opener).toHaveFocus();
  });
  it('keeps nested Select and nested Drawer interactive and closes only the top surface on Escape', async () => {
    function Example() { const [drawer, setDrawer] = useState(false); return <Dialog open onOpenChange={() => {}} title="Parent"><Select aria-label="Color" defaultValue="blue"><option value="blue">Blue</option><option value="rose">Rose</option></Select><Button onClick={() => setDrawer(true)}>Details</Button><Drawer open={drawer} onOpenChange={setDrawer} title="Details drawer"><Input aria-label="Detail" /></Drawer></Dialog>; }
    render(<Example />); await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox').closest('.cap-modal-layer')).not.toBeNull();
    await userEvent.keyboard('{Escape}'); expect(screen.queryByRole('listbox')).not.toBeInTheDocument(); expect(screen.getByRole('dialog', { name: 'Parent' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Details' })); expect(screen.getByRole('dialog', { name: 'Details drawer' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}'); expect(screen.queryByRole('dialog', { name: 'Details drawer' })).not.toBeInTheDocument(); expect(screen.getByRole('dialog', { name: 'Parent' })).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Details' })).toHaveFocus();
  });
  it('supports a controlled custom Popover and restores focus on Escape', async () => {
    function Example() { const [open, setOpen] = useState(false); return <Popover label="Filters" open={open} onOpenChange={setOpen}><Input aria-label="Filter" /></Popover>; }
    render(<Example />); await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const panel = screen.getByRole('dialog', { name: 'Filters' }); expect(panel).not.toHaveAttribute('popover'); expect(within(panel).getByRole('textbox')).toHaveFocus();
    await userEvent.keyboard('{Escape}'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Filters' })).toHaveFocus();
  });
  it('exposes tooltip descriptions for focused triggers and dismisses them with Escape', async () => {
    render(<Tooltip content="Enter focus mode" shortcut={['⇧', '⌘', 'M']}><Button>Focus</Button></Tooltip>);
    await userEvent.tab(); expect(screen.getByRole('tooltip')).toHaveTextContent('Enter focus mode'); expect(screen.getByRole('button')).toHaveAccessibleDescription('Enter focus mode ⇧ ⌘ M');
    await userEvent.keyboard('{Escape}'); expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(); expect(screen.getByRole('button')).not.toHaveAttribute('aria-describedby');
  });
  it('restores the opener when modal children use autoFocus', async () => {
    function Example() { const [open, setOpen] = useState(false); return <><Button onClick={() => setOpen(true)}>Search</Button><Dialog open={open} onOpenChange={setOpen} title="Search dialog"><Input autoFocus aria-label="Query" /></Dialog></>; }
    render(<Example />); const trigger = screen.getByRole('button', { name: 'Search' }); await userEvent.click(trigger); expect(screen.getByRole('textbox')).toHaveFocus();
    await userEvent.keyboard('{Escape}'); expect(trigger).toHaveFocus();
  });
  it('keeps a menu inside a popover open and restores focus after controlled selection', async () => {
    function Example() { const [open, setOpen] = useState(false); return <Popover label="Parent popover" open={open} onOpenChange={setOpen}><Menu label="Nested actions" items={[{ id: 'save', label: 'Save', onSelect: () => setOpen(false) }]} /></Popover>; }
    render(<Example />); const trigger = screen.getByRole('button', { name: 'Parent popover' }); await userEvent.click(trigger); await userEvent.click(screen.getByRole('button', { name: 'Nested actions' }));
    expect(screen.getByRole('dialog', { name: 'Parent popover' })).toBeInTheDocument(); expect(screen.getByRole('menuitem', { name: 'Save' })).toHaveFocus();
    await userEvent.keyboard('{Enter}'); expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(trigger).toHaveFocus();
  });
  it('reopens a modal during its exit animation without leaving the active layer inert', async () => {
    function Example() { const [open, setOpen] = useState(false); return <><Button onClick={() => setOpen(true)}>Reopen</Button><Dialog open={open} onOpenChange={setOpen} title="Rapid dialog"><Input aria-label="Name" /></Dialog></>; }
    render(<Example />); const trigger = screen.getByRole('button', { name: 'Reopen' }); await userEvent.click(trigger); await userEvent.keyboard('{Escape}'); await userEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Rapid dialog' }); expect((dialog.closest('.cap-modal-layer') as HTMLElement).inert).not.toBe(true); expect(screen.getByRole('textbox')).toHaveFocus();
  });
  it('keeps controlled form submission consistent after a native form reset', async () => {
    render(<form aria-label="Controlled form"><Select aria-label="State" name="state" value="b" options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} /></form>);
    const form = screen.getByRole('form') as HTMLFormElement; act(() => form.reset());
    await waitFor(() => expect(new FormData(form).get('state')).toBe('b'));
    expect(screen.getByRole('combobox')).toHaveTextContent('B');
  });
  it('uses the first enabled option for an uncontrolled select without an explicit default', async () => {
    render(<form aria-label="Default form"><Select aria-label="Available" name="choice" options={[{ value: 'locked', label: 'Locked', disabled: true }, { value: 'ready', label: 'Ready' }]} /></form>);
    expect(screen.getByRole('combobox')).toHaveTextContent('Ready'); expect(new FormData(screen.getByRole('form') as HTMLFormElement).get('choice')).toBe('ready');
  });
  it('focuses an enabled control when the first modal field is disabled', () => {
    render(<Dialog open onOpenChange={() => {}} title="Disabled field"><Select aria-label="Locked select" disabled options={[{ value: 'x', label: 'X' }]} /></Dialog>);
    expect(screen.getByRole('button', { name: 'Закрыть' })).toHaveFocus();
  });
  it('uses the nearest accent alias and updates a live portal when that scope changes', async () => {
    const items = [{ id: 'copy', label: 'Copy' }];
    const { rerender } = render(<div data-accent="blue" data-theme="dark"><div data-color="rose"><Menu label="Scoped menu" items={items} /></div></div>);
    await userEvent.click(screen.getByRole('button')); expect(screen.getByRole('menu')).toHaveAttribute('data-color', 'rose'); expect(screen.getByRole('menu')).not.toHaveAttribute('data-accent');
    rerender(<div data-accent="blue" data-theme="light"><div data-color="teal"><Menu label="Scoped menu" items={items} /></div></div>);
    await waitFor(() => expect(screen.getByRole('menu')).toHaveAttribute('data-color', 'teal')); expect(screen.getByRole('menu')).toHaveAttribute('data-theme', 'light');
  });
  it('keeps the deepest modal active when nested modals mount already open', () => {
    render(<Dialog open onOpenChange={() => {}} title="Initially open parent"><Drawer open onOpenChange={() => {}} title="Initially open child"><Input aria-label="Child field" /></Drawer></Dialog>);
    expect(screen.getByRole('dialog', { name: 'Initially open child' })).toBeInTheDocument(); expect(screen.getByRole('textbox', { name: 'Child field' })).toHaveFocus();
    expect(screen.queryByRole('dialog', { name: 'Initially open parent' })).not.toBeInTheDocument();
  });
  it('clamps and flips an anchored popup within a mobile viewport', async () => {
    const width = Object.getOwnPropertyDescriptor(window, 'innerWidth')!, height = Object.getOwnPropertyDescriptor(window, 'innerHeight')!;
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true }); Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
    const bounds = (left: number, top: number, width: number, height: number) => ({ x: left, y: top, left, top, right: left + width, bottom: top + height, width, height, toJSON() {} });
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) { return this.classList.contains('cap-popover-v2') ? bounds(0, 0, 240, 300) : bounds(340, 560, 45, 36); });
    try {
      render(<Popover label="Mobile popup"><Input aria-label="Inside" /></Popover>); await userEvent.click(screen.getByRole('button', { name: 'Mobile popup' }));
      const popup = screen.getByRole('dialog', { name: 'Mobile popup' });
      expect(parseFloat(popup.style.left)).toBe(138); expect(parseFloat(popup.style.top)).toBe(254); expect(parseFloat(popup.style.maxHeight)).toBeLessThanOrEqual(576);
      expect(popup.style.transformOrigin).toBe('bottom center');
    } finally { rect.mockRestore(); Object.defineProperty(window, 'innerWidth', width); Object.defineProperty(window, 'innerHeight', height); }
  });
  it.each(['menu', 'popover', 'select', 'tooltip', 'dialog'] as const)('preserves local border mode and establishes a raised %s surface in its portal', async kind => {
    const contents = {
      menu: <Menu label="Surface trigger" items={[{ id: 'copy', label: 'Copy' }]} />,
      popover: <Popover label="Surface trigger"><Input aria-label="Inside popup" /></Popover>,
      select: <Select aria-label="Surface trigger" options={[{ value: 'a', label: 'A' }]} />,
      tooltip: <Tooltip content="Surface tooltip"><Button>Surface trigger</Button></Tooltip>,
      dialog: <Dialog open onOpenChange={() => {}} title="Surface dialog"><Input aria-label="Inside dialog" /></Dialog>,
    };
    render(<div data-theme="dark" data-accent="blue" data-borders="on" data-surface="canvas"><div data-borders="off">{contents[kind]}</div></div>);
    if (kind === 'tooltip') await userEvent.tab();
    else if (kind !== 'dialog') await userEvent.click(screen.getByRole(kind === 'select' ? 'combobox' : 'button', { name: 'Surface trigger' }));
    const role = kind === 'select' ? 'listbox' : kind === 'popover' || kind === 'dialog' ? 'dialog' : kind;
    const surface = screen.getByRole(role);
    expect(surface).toHaveAttribute('data-surface', 'raised');
    expect(surface.closest('[data-borders]')).toHaveAttribute('data-borders', 'off');
    expect(surface.closest('[data-theme]')).toHaveAttribute('data-theme', 'dark');
    expect(surface.closest('[data-accent]')).toHaveAttribute('data-accent', 'blue');
  });
  it('updates an open portal after the nearest border mode changes without inheriting canvas surface', async () => {
    const content = <Popover label="Border switch"><Input aria-label="Popover field" /></Popover>;
    const { rerender } = render(<div data-borders="off" data-surface="canvas">{content}</div>);
    await userEvent.click(screen.getByRole('button', { name: 'Border switch' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('data-borders', 'off');
    rerender(<div data-borders="on" data-surface="base">{content}</div>);
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveAttribute('data-borders', 'on'));
    expect(screen.getByRole('dialog')).toHaveAttribute('data-surface', 'raised');
    expect(screen.getByRole('textbox')).toHaveFocus();
  });
  it('has no serious semantic accessibility issues for custom Select inside a modal', async () => {
    render(<Dialog open onOpenChange={() => {}} title="Settings"><Field label="Accent">{props => <Select {...props} options={[{ value: 'blue', label: 'Blue' }, { value: 'rose', label: 'Rose' }]} />}</Field></Dialog>);
    await userEvent.click(screen.getByRole('combobox'));
    const result = await axe.run(screen.getByRole('dialog').closest('.cap-modal-layer')!, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.filter(item => ['serious', 'critical'].includes(item.impact ?? ''))).toEqual([]);
  });
});
