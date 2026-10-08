import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Checkbox, CommandPalette, Dialog, Field, Input, Menu, Radio, SegmentedControl, Switch, Tabs } from '../src';
import axe from 'axe-core';
describe('Interaction contracts', () => {
  it('prevents repeated actions while loading and preserves button type', async () => {
    const click = vi.fn(); render(<form><Button loading onClick={click}>Save</Button></form>);
    const button = screen.getByRole('button');
    await userEvent.click(button); expect(click).not.toHaveBeenCalled(); expect(button).toHaveAttribute('type', 'button'); expect(button).toHaveAttribute('aria-busy', 'true');
  });
  it('connects field labels, hints, and validation errors', () => {
    render(<Field label="Name" error="Required" required>{p => <Input {...p} />}</Field>);
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveAccessibleDescription('Required');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true'); expect(screen.getByRole('textbox')).toBeRequired();
  });
  it('supports native keyboard toggling, disabled state and indeterminate checkbox', async () => {
    render(<><Checkbox label="Select all" indeterminate /><Switch label="Sync" /><Switch label="Disabled" disabled /></>);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement; expect(checkbox.indeterminate).toBe(true);
    await userEvent.click(screen.getByRole('switch', { name: 'Sync' })); expect(screen.getByRole('switch', { name: 'Sync' })).toBeChecked();
    await userEvent.click(screen.getByRole('switch', { name: 'Disabled' })); expect(screen.getByRole('switch', { name: 'Disabled' })).not.toBeChecked();
  });
  it('shares the Primary default without losing checkbox, radio, or switch keyboard semantics', async () => {
    const user = userEvent.setup();
    render(<><Checkbox label="Primary selection"/><Radio label="Private" name="access" defaultChecked/><Radio label="Team" name="access"/><Switch label="Sync"/><Switch label="Locked" disabled/><Checkbox label="Soft selection" contrast={false}/><Radio label="Soft radio" name="soft" contrast={false}/><Switch label="Soft switch" contrast={false}/></>);
    for (const name of ['Primary selection','Private','Team','Sync']) expect(screen.getByLabelText(name).closest('label')).toHaveAttribute('data-contrast','true');
    for (const name of ['Soft selection','Soft radio','Soft switch']) expect(screen.getByLabelText(name).closest('label')).toHaveAttribute('data-contrast','false');
    await user.tab(); await user.keyboard(' ');
    expect(screen.getByRole('checkbox',{name:'Primary selection'})).toBeChecked();
    await user.tab(); await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio',{name:'Team'})).toBeChecked();
    expect(screen.getByRole('radio',{name:'Private'})).not.toBeChecked();
    await user.tab(); await user.keyboard(' ');
    expect(screen.getByRole('switch',{name:'Sync'})).toBeChecked();
    await user.tab(); expect(screen.getByRole('checkbox',{name:'Soft selection'})).toHaveFocus();
    expect(screen.getByRole('switch',{name:'Locked'})).not.toBeChecked();
  });
  it('moves between enabled tabs with arrows, Home and End and reveals the right panel', async () => {
    function Example() { const [v, set] = useState('a'); return <Tabs label="Example" value={v} onValueChange={set} items={[{ value: 'a', label: 'One', content: 'First panel' }, { value: 'b', label: 'Locked', content: 'Locked panel', disabled: true }, { value: 'c', label: 'Three', content: 'Third panel' }]} />; }
    render(<Example />); screen.getByRole('tab', { name: 'One' }).focus(); await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Three' })).toHaveFocus(); expect(screen.getByRole('tabpanel')).toHaveTextContent('Third panel');
    await userEvent.keyboard('{Home}'); expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{End}'); expect(screen.getByRole('tab', { name: 'Three' })).toHaveFocus();
  });
  it('exposes segmented choices as one named radio group', async () => {
    function Example() { const [v, set] = useState('list'); return <SegmentedControl value={v} onValueChange={set} label="View" options={[{ value: 'list', label: 'List' }, { value: 'grid', label: 'Grid' }]} />; }
    render(<Example />); await userEvent.click(screen.getByRole('radio', { name: 'Grid' })); expect(screen.getByRole('radio', { name: 'Grid' })).toBeChecked(); expect(screen.getByRole('radio', { name: 'List' })).not.toBeChecked();
  });
  it('skips disabled menu entries and restores trigger focus on Escape', async () => {
    const select = vi.fn(); render(<Menu label="Actions" items={[{ id: 'a', label: 'Open', onSelect: select }, { id: 'b', label: 'Locked', disabled: true }, { id: 'c', label: 'Copy' }]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions' })); expect(screen.getByRole('menuitem', { name: 'Open' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}'); expect(screen.getByRole('menuitem', { name: 'Copy' })).toHaveFocus();
    await userEvent.keyboard('{Escape}'); expect(screen.queryByRole('menu')).not.toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{Enter}'); expect(select).toHaveBeenCalledTimes(1);
  });
  it('keeps controlled dialog state and returns focus to its opener', async () => {
    function Example() { const [open, set] = useState(false); return <><Button onClick={() => set(true)}>Open modal</Button><Dialog open={open} onOpenChange={set} title="Create"><Input aria-label="Title" /></Dialog></>; }
    render(<Example />); const opener = screen.getByRole('button', { name: 'Open modal' }); await userEvent.click(opener);
    expect(screen.getByRole('dialog', { name: 'Create' })).toBeInTheDocument();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(opener).toHaveFocus();
  });
  it('filters commands, selects with Enter, and handles zero results', async () => {
    const select = vi.fn(), change = vi.fn(); render(<CommandPalette open onOpenChange={change} items={[{ id: 'first', label: 'Settings', onSelect: select }, { id: 'second', label: 'Calendar', onSelect: vi.fn() }]} />);
    const input = screen.getByRole('combobox'); await userEvent.type(input, 'missing'); expect(screen.getByRole('status')).toHaveTextContent('Ничего не найдено'); await userEvent.keyboard('{Enter}'); expect(select).not.toHaveBeenCalled();
    await userEvent.clear(input); await userEvent.type(input, 'Sett'); expect(screen.getAllByRole('option')).toHaveLength(1); await userEvent.keyboard('{Enter}'); expect(select).toHaveBeenCalledTimes(1); expect(change).toHaveBeenCalledWith(false);
  });
  it('has no serious or critical semantic accessibility violations for an open command palette', async () => {
    render(<CommandPalette open onOpenChange={() => {}} items={[{ id: 'x', label: 'Settings', onSelect: () => {} }]} />);
    const result = await axe.run(screen.getByRole('dialog'), { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.filter(x => ['serious', 'critical'].includes(x.impact ?? ''))).toEqual([]);
  });
});
