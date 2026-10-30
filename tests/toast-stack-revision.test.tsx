import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ToastStack } from '../src/components/messages';
import { Toast } from '../src/components/overlays';
import { LocaleProvider } from '../src/components/locale';

afterEach(() => vi.useRealTimers());
const notices = [{ id: 'rear', title: 'Earlier', duration: Infinity }, { id: 'front', title: 'Latest', duration: Infinity }];

it('keeps peek independent from the expanded gap and normalizes geometry inputs', () => {
  const view = render(<ToastStack position="inline" items={notices} onDismiss={() => {}} peek={6} gap={17} corner={17}/>);
  const list = () => view.container.querySelector<HTMLElement>('.cap-toast-stack-list')!;
  expect(list().style.height).toBe('86px');
  fireEvent.mouseEnter(view.container.querySelector('.cap-toast-stack')!);
  expect(list().style.height).toBe('177px');
  view.rerender(<ToastStack position="inline" items={notices} onDismiss={() => {}} expanded={false} peek={-10} gap={NaN} corner={17.4}/>);
  expect(list().style.height).toBe('80px');
  expect(view.container.querySelector<HTMLElement>('.cap-toast-stack')!.style.getPropertyValue('--cap-toast-corner')).toBe('17px');
});

it('starts a full updated duration when a pending notice completes under the same id', () => {
  vi.useFakeTimers();
  const dismiss = vi.fn();
  const view = render(<ToastStack position="inline" items={[{ id: 'job', title: 'Working', loading: true, duration: Infinity }]} onDismiss={dismiss}/>);
  act(() => vi.advanceTimersByTime(10000));
  view.rerender(<ToastStack position="inline" items={[{ id: 'job', title: 'Complete', duration: 1000 }]} onDismiss={dismiss}/>);
  expect(screen.getByText('Complete')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(999));
  expect(dismiss).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(dismiss).toHaveBeenCalledExactlyOnceWith('job');
});

it('preserves remaining time across callback changes and hover pause/resume', () => {
  vi.useFakeTimers();
  const dismiss = vi.fn(), stale = vi.fn();
  const items = [{ id: 'notice', title: 'Saved', duration: 1000 }];
  const view = render(<ToastStack position="inline" items={items} onDismiss={stale}/>);
  act(() => vi.advanceTimersByTime(400));
  fireEvent.mouseEnter(screen.getByRole('region'));
  act(() => vi.advanceTimersByTime(5000));
  view.rerender(<ToastStack position="inline" items={items} onDismiss={dismiss}/>);
  fireEvent.mouseLeave(screen.getByRole('region'));
  act(() => vi.advanceTimersByTime(599));
  expect(dismiss).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(dismiss).toHaveBeenCalledExactlyOnceWith('notice');
  expect(stale).not.toHaveBeenCalled();
  fireEvent.mouseEnter(screen.getByRole('region'));
  fireEvent.mouseLeave(screen.getByRole('region'));
  act(() => vi.advanceTimersByTime(1000));
  expect(dismiss).toHaveBeenCalledOnce();
});

it('collapses with Escape and moves rear focus to the retained toggle', () => {
  render(<LocaleProvider locale="en"><ToastStack position="inline" items={[{ ...notices[0], action: { label: 'Undo', onAction() {} } }, notices[1]]} onDismiss={() => {}} showExpandHint={false}/></LocaleProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Expand notifications' }));
  const undo = screen.getByRole('button', { name: 'Undo' });
  undo.focus();
  fireEvent.keyDown(undo, { key: 'Escape' });
  expect(screen.getByRole('region')).not.toHaveAttribute('data-expanded');
  expect(screen.getByRole('button', { name: 'Expand notifications' })).toHaveFocus();
});

it('removes an empty viewport stack and does not reserve an icon column when icon is false', () => {
  const view = render(<ToastStack items={[]} onDismiss={() => {}}/>);
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  view.rerender(<Toast title="Copied" icon={false}/>);
  expect(screen.getByRole('status')).toHaveAttribute('data-without-icon');
  expect(view.container.querySelector('.cap-feedback-icon')).not.toBeInTheDocument();
});
