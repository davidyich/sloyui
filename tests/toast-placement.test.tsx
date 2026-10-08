import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ToastStack } from '../src/components/messages';
import { LocaleProvider } from '../src/components/locale';

afterEach(() => vi.useRealTimers());
const items = [{ id: 'rear', title: 'Earlier', duration: 1000 }, { id: 'front', title: 'Latest', duration: 1000 }];
it('keeps the chosen anchor within a local scope and reserves geometry in both directions', () => {
  const view = render(<ToastStack items={items} onDismiss={() => {}} scope="container" position="top-center"/>);
  const region = view.container.querySelector('.cap-toast-stack')!;
  expect(region).toHaveAttribute('data-scope', 'container');
  expect(region).toHaveAttribute('data-direction', 'down');
  const front = region.querySelector<HTMLElement>('[data-toast-id="front"]')!;
  const rear = region.querySelector<HTMLElement>('[data-toast-id="rear"]')!;
  expect(parseFloat(rear.style.getPropertyValue('--cap-toast-y'))).toBeGreaterThan(parseFloat(front.style.getPropertyValue('--cap-toast-y')));
  view.rerender(<ToastStack items={items} onDismiss={() => {}} scope="container" position="bottom-center"/>);
  expect(region).toHaveAttribute('data-direction', 'up');
  expect(parseFloat(front.style.getPropertyValue('--cap-toast-y'))).toBeGreaterThan(parseFloat(rear.style.getPropertyValue('--cap-toast-y')));
});
it('does not expire unread rear items or loading messages', () => {
  vi.useFakeTimers();
  const dismiss = vi.fn();
  const view = render(<ToastStack items={items} onDismiss={dismiss} position="inline"/>);
  act(() => vi.advanceTimersByTime(1100));
  expect(dismiss).toHaveBeenCalledWith('front');
  expect(dismiss).not.toHaveBeenCalledWith('rear');
  view.rerender(<ToastStack items={[{ id: 'loading', title: 'Deploying', loading: true, duration: 1000 }]} onDismiss={dismiss} position="inline"/>);
  act(() => vi.advanceTimersByTime(2000));
  expect(dismiss).not.toHaveBeenCalledWith('loading');
  expect(screen.getByText('Deploying').closest('[role="status"]')).toHaveAttribute('aria-busy', 'true');
});
it('exposes manual keyboard/touch expansion and keeps actions usable until dismissal', () => {
  vi.useFakeTimers();
  const action = vi.fn(), dismiss = vi.fn();
  render(<LocaleProvider locale="en"><ToastStack items={[{ id: 'action', title: 'Archived', duration: 500, action: { label: 'Undo archive', onAction: action } }, { id: 'front', title: 'Saved', duration: Infinity }]} onDismiss={dismiss} position="inline" scope="container"/></LocaleProvider>);
  expect(screen.queryByRole('button', { name: 'Undo archive' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Expand notifications' }));
  const undo = screen.getByRole('button', { name: 'Undo archive' });
  fireEvent.focus(undo);
  fireEvent.click(undo);
  act(() => vi.advanceTimersByTime(3000));
  expect(action).toHaveBeenCalledOnce();
  expect(dismiss).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss notification' })[1]);
  expect(dismiss).toHaveBeenCalledWith('action');
});

it('starts the unread toast lifetime only after an actionable front leaves', () => {
  vi.useFakeTimers();
  const dismiss = vi.fn();
  const short = { id: 'short', title: 'Saved', duration: 1000 };
  const view = render(<ToastStack items={[short, { id: 'actionable', title: 'Archived', action: { label: 'Undo', onAction: () => {} } }]} onDismiss={dismiss} position="inline"/>);
  act(() => vi.advanceTimersByTime(5000));
  expect(dismiss).not.toHaveBeenCalled();
  view.rerender(<ToastStack items={[short]} onDismiss={dismiss} position="inline"/>);
  // The departing front retains its geometry until the exit completes.
  act(() => vi.advanceTimersByTime(200));
  act(() => vi.advanceTimersByTime(999));
  expect(dismiss).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(dismiss).toHaveBeenCalledWith('short');
});

it('portals viewport placement outside a transformed wrapper and preserves local context', async () => {
  const view = render(<div data-theme="dark" data-radius="rounded" data-accent="rose" data-borders="on" style={{ transform: 'translateZ(0)' }}><ToastStack items={[{ id: 'one', title: 'Viewport toast', duration: Infinity }]} onDismiss={() => {}} scope="viewport" position="top-center"/></div>);
  const region = screen.getByText('Viewport toast').closest('.cap-toast-stack')!;
  expect(view.container.contains(region)).toBe(false);
  expect(region.parentElement).toBe(document.body);
  expect(region).toHaveAttribute('data-theme', 'dark');
  expect(region).toHaveAttribute('data-radius', 'rounded');
  expect(region).toHaveAttribute('data-accent', 'rose');
  expect(region).toHaveAttribute('data-borders', 'on');
  await act(async () => { view.container.firstElementChild!.setAttribute('data-theme', 'light'); });
  expect(region).toHaveAttribute('data-theme', 'light');
});

it('bounds expanded local stacks by their measured containing block', () => {
  const parentDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
  const heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', { configurable: true, get() { return this.parentElement; } });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get() { return this.dataset.testFrame ? 180 : 0; } });
  try {
    const view = render(<div data-test-frame="true"><ToastStack items={items} expanded position="bottom-center" scope="container" onDismiss={() => {}}/></div>);
    const region = view.container.querySelector<HTMLElement>('.cap-toast-stack')!;
    expect(region.style.maxHeight).toBe('148px');
    expect(region.querySelector<HTMLElement>('.cap-toast-stack-viewport')!.style.maxHeight).toBe('116px');
  } finally {
    if (parentDescriptor) Object.defineProperty(HTMLElement.prototype, 'offsetParent', parentDescriptor);
    else delete (HTMLElement.prototype as { offsetParent?: Element }).offsetParent;
    if (heightDescriptor) Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
    else delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
  }
});

it('measures the mounted portal and remeasures after switching placement scope', () => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get() { return this.classList.contains('cap-toast-stack-viewport') ? (this.closest('[data-scope="viewport"]') ? 440 : 280) : 0; } });
  try {
    const props = { items: [{ id: 'one', title: 'Measured', duration: Infinity }], onDismiss: () => {} };
    const view = render(<ToastStack {...props} position="top-center" scope="viewport"/>);
    const width = () => screen.getByText('Measured').closest<HTMLElement>('.cap-toast-stack-item')!.style.width;
    expect(width()).toBe('440px');
    view.rerender(<ToastStack {...props} position="top-center" scope="container"/>);
    expect(width()).toBe('280px');
    view.rerender(<ToastStack {...props} position="top-center" scope="viewport"/>);
    expect(width()).toBe('440px');
  } finally {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, 'clientWidth', descriptor);
    else delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
  }
});

it('uses the front height for collapsed shells while retaining each natural expanded height', () => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return this.dataset.toastId === 'rear' ? 180 : this.dataset.toastId === 'front' ? 80 : 0; } });
  try {
    const props = { items: [{ id: 'rear', title: 'Long title', description: 'A longer multiline description', duration: Infinity }, { id: 'front', title: 'Short', duration: Infinity }], onDismiss: () => {}, position: 'inline' as const };
    const view = render(<ToastStack {...props} expanded={false}/>);
    const list = view.container.querySelector<HTMLElement>('.cap-toast-stack-list')!;
    const rear = view.container.querySelector<HTMLElement>('[data-toast-id="rear"]')!;
    expect(list.style.height).toBe('88px');
    expect(rear.style.getPropertyValue('--cap-toast-shell-height')).toBe('80px');
    view.rerender(<ToastStack {...props} expanded/>);
    expect(list.style.height).toBe('268px');
  } finally {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', descriptor);
    else delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
  }
});
