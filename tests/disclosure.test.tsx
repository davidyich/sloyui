import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { Accordion } from '../src/components/layout';
import { Alert } from '../src/components/workbench';
import { TreeView } from '../src/components/tree-view';
import { useDisclosurePresence } from '../src/components/disclosure';
import { JsonViewer } from '../src/components/data-table';
import { ToastStack } from '../src/components/messages';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('prevents the browser default from toggling an uncontrolled native accordion a second time', async () => {
  vi.stubGlobal('CSS', { supports: () => true });
  const user=userEvent.setup(),changed=vi.fn();
  const {container}=render(<Accordion title={<span>Native title</span>} onOpenChange={changed}><button>Native action</button></Accordion>);
  const details=container.querySelector('details')!;
  expect(details).not.toHaveAttribute('data-fallback');
  await user.click(screen.getByText('Native title'));
  expect(details).toHaveAttribute('open');
  expect(details).toHaveAttribute('data-expanded','true');
  expect(changed).toHaveBeenLastCalledWith(true);
  await user.click(screen.getByText('Native title'));
  expect(details).not.toHaveAttribute('open');
  expect(details).toHaveAttribute('data-expanded','false');
  expect(changed.mock.calls).toEqual([[true],[false]]);
});

it('keeps native accordion keyboard behavior and hides closing content before the fallback transition ends', async () => {
  const user = userEvent.setup();
  const { container } = render(<Accordion title="Details"><button type="button">Inner action</button></Accordion>);
  const details = container.querySelector('details')!;
  const summary = screen.getByText('Details').closest('summary')!;
  await waitFor(() => expect(details).toHaveAttribute('data-fallback'));
  summary.focus();
  await user.keyboard('{Enter}');
  expect(details).toHaveAttribute('open');
  expect(details.querySelector('.cap-accordion-body')).not.toHaveAttribute('inert');
  await user.keyboard('{Enter}');
  expect(summary).toHaveAttribute('aria-expanded', 'false');
  expect(details.querySelector('.cap-accordion-body')).toHaveAttribute('inert');
  expect(details).toHaveAttribute('open');
  await waitFor(() => expect(details).not.toHaveAttribute('open'));
});

it('reverses an accordion close without a stale timer hiding reopened content', async () => {
  const user = userEvent.setup();
  const { container } = render(<Accordion title="Notes" open><p>Content</p></Accordion>);
  const details = container.querySelector('details')!;
  const summary = screen.getByText('Notes').closest('summary')!;
  await waitFor(() => expect(details).toHaveAttribute('data-fallback'));
  await user.click(summary);
  expect(details.querySelector('.cap-accordion-body')).toHaveAttribute('inert');
  await user.click(summary);
  expect(details.querySelector('.cap-accordion-body')).not.toHaveAttribute('inert');
  await new Promise(resolve => setTimeout(resolve, 260));
  expect(details).toHaveAttribute('open');
});

it('preserves the details onToggle contract for a controlled accordion', async () => {
  const user = userEvent.setup();
  function Controlled() {
    const [open, setOpen] = useState(false);
    return <Accordion title="Controlled details" open={open} onToggle={event => setOpen(event.currentTarget.open)}>Body</Accordion>;
  }
  const { container } = render(<Controlled/>);
  const details = container.querySelector('details')!;
  const summary = screen.getByText('Controlled details').closest('summary')!;
  await user.click(summary);
  await waitFor(() => expect(details).toHaveAttribute('open'));
  await user.click(summary);
  expect(summary).toHaveAttribute('aria-expanded', 'false');
  await waitFor(() => expect(details).not.toHaveAttribute('open'));
});

it('keeps collapsed alert actions outside keyboard focus', async () => {
  const user = userEvent.setup();
  render(<Alert title="Update" expandable><button type="button">Read update</button></Alert>);
  const trigger = screen.getByRole('button', { name: 'Update' });
  const body = screen.getByText('Read update').closest('.cap-alert-body')!;
  expect(body).toHaveAttribute('inert');
  await user.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(body).not.toHaveAttribute('inert');
  await user.click(trigger);
  expect(body).toHaveAttribute('inert');
});

it('returns focus to an alert trigger when controlled content closes', () => {
  const { rerender } = render(<Alert title="Controlled" expandable expanded><button type="button">Inside alert</button></Alert>);
  screen.getByRole('button', { name: 'Inside alert' }).focus();
  rerender(<Alert title="Controlled" expandable expanded={false}><button type="button">Inside alert</button></Alert>);
  expect(screen.getByRole('button', { name: 'Controlled' })).toHaveFocus();
  expect(screen.getByText('Inside alert').closest('.cap-alert-body')).toHaveAttribute('inert');
});

it('removes closed tree rows immediately when reduced motion is requested', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  const user = userEvent.setup();
  const { container } = render(<TreeView label="Reduced tree" defaultExpandedIds={['root']} nodes={[{id:'root',label:'Root',children:[{id:'child',label:'Child'}]}]}/>);
  await user.click(screen.getByRole('treeitem', { name: 'Root' }));
  expect(container.querySelector('[aria-label="Child"]')).not.toBeInTheDocument();
});

it('does not restart an earlier exit deadline when a second group closes', () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(({ ids }) => useDisclosurePresence(ids, id => id), { initialProps: { ids: ['a', 'b', 'c'] } });
  rerender({ ids: ['b', 'c'] });
  act(() => vi.advanceTimersByTime(100));
  rerender({ ids: ['c'] });
  act(() => vi.advanceTimersByTime(80));
  expect(result.current.map(item => [item.key, item.phase])).toEqual([['b', 'exit'], ['c', 'open']]);
  act(() => vi.advanceTimersByTime(100));
  expect(result.current.map(item => item.key)).toEqual(['c']);
});

it('cancels a stale exit when a row reopens, and starts a fresh deadline on its next close', () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(({ ids }) => useDisclosurePresence(ids, id => id), { initialProps: { ids: ['a'] } });
  rerender({ ids: [] });
  act(() => vi.advanceTimersByTime(80));
  rerender({ ids: ['a'] });
  act(() => vi.advanceTimersByTime(20));
  rerender({ ids: [] });
  act(() => vi.advanceTimersByTime(100));
  expect(result.current[0]?.phase).toBe('exit');
  act(() => vi.advanceTimersByTime(80));
  expect(result.current).toEqual([]);
});

it.each([false, true])('restores focused tree descendants to the surviving ancestor (reduced motion: %s)', reduced => {
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }));
  const nodes = [{ id: 'root', label: 'Root', children: [{ id: 'child', label: 'Child' }] }];
  const { rerender } = render(<TreeView label="Focus tree" nodes={nodes} expandedIds={['root']} showGuides/>);
  act(() => screen.getByRole('treeitem', { name: 'Child' }).focus());
  rerender(<TreeView label="Focus tree" nodes={nodes} expandedIds={[]} showGuides/>);
  expect(screen.getByRole('treeitem', { name: 'Root' })).toHaveFocus();
  expect(screen.queryByRole('treeitem', { name: 'Child' })).not.toBeInTheDocument();
});

it('labels navigation groups by the requested action and keeps their state independent', async () => {
  const user = userEvent.setup();
  render(<><Accordion title="Work" variant="navigation" expandLabel="Expand work" collapseLabel="Collapse work"><button>Project</button></Accordion><Accordion title="Archive" variant="navigation"><button>Archived</button></Accordion></>);
  const summary = screen.getByLabelText('Expand work');
  summary.focus();
  await user.keyboard(' ');
  expect(screen.getByLabelText('Collapse work')).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('Archive').closest('summary')).toHaveAttribute('aria-expanded', 'false');
  await user.keyboard('{Enter}');
  expect(screen.getByLabelText('Expand work')).toHaveFocus();
  expect(screen.queryByRole('button', {name:'Project'})).not.toBeInTheDocument();
});

it('closes fallback details immediately with reduced motion and restores focus', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  const { container, rerender } = render(<Accordion title="Reduced details" open><button>Inside reduced details</button></Accordion>);
  screen.getByRole('button', {name:'Inside reduced details'}).focus();
  rerender(<Accordion title="Reduced details" open={false}><button>Inside reduced details</button></Accordion>);
  expect(container.querySelector('details')).not.toHaveAttribute('open');
  expect(screen.getByText('Reduced details').closest('summary')).toHaveFocus();
});

it('restores JSON focus before removing reduced-motion descendants', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  const { rerender } = render(<JsonViewer label="Reduced JSON" data={{items:['one']}} expanded={['root','root.items']}/>);
  act(() => screen.getByRole('treeitem', {name:/0 : "one"/}).focus());
  rerender(<JsonViewer label="Reduced JSON" data={{items:['one']}} expanded={['root']}/>);
  expect(screen.queryByRole('treeitem', {name:/0 : "one"/})).not.toBeInTheDocument();
  expect(screen.getByRole('treeitem', {name:/items/})).toHaveFocus();
});

it('removes closing toast-stack messages immediately with reduced motion', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  const dismiss = vi.fn();
  const { container, rerender } = render(<ToastStack position="inline" items={[{id:'one',title:'Saved',duration:Infinity}]} onDismiss={dismiss}/>);
  rerender(<ToastStack position="inline" items={[]} onDismiss={dismiss}/>);
  expect(container.querySelector('[data-toast-id]')).not.toBeInTheDocument();
});
