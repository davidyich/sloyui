import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CommandPalette } from '../src/components/overlays';

const items = ['First', 'Second', 'Third'].map(label => ({ id: label, label, onSelect: vi.fn() }));
const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
afterEach(() => {
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate);
  else delete (Element.prototype as unknown as { animate?: unknown }).animate;
});

async function palette(reduced = false) {
  const cancel = vi.fn(), animate = vi.fn(() => ({ cancel }));
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: animate });
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
    if (this.classList.contains('cap-command-item')) return new DOMRect(0, 24 + items.findIndex(item => item.label === this.textContent) * 44, 220, 40);
    if (this.classList.contains('cap-moving-highlight')) {
      const y = Number(this.style.transform.match(/translate3d\([^,]+,([\d.]+)px/)?.[1] ?? 24);
      return new DOMRect(0, y, 220, 40);
    }
    return new DOMRect(0, 0, 220, 140);
  });
  render(<CommandPalette open onOpenChange={() => {}} items={items}/>);
  await act(async () => {});
  animate.mockClear(); cancel.mockClear();
  const list = screen.getByRole('listbox'), layer = list.querySelector<HTMLElement>('.cap-moving-highlight')!;
  return { animate, cancel, list, layer, input: screen.getByRole('combobox'), viewport: screen.getByRole('region', { name: 'Результаты поиска' }) };
}

it('animates pointer selection without restarting within a row or scrolling it out from under the pointer', async () => {
  const { animate, layer, viewport } = await palette();
  fireEvent.pointerMove(screen.getByRole('option', { name: 'Third' }));
  expect(screen.getByRole('option', { name: 'Third' })).toHaveAttribute('aria-selected', 'true');
  expect(layer.style.transform).toBe('translate3d(0px,112px,0)');
  expect(animate).toHaveBeenCalledOnce();
  expect(viewport.scrollTop).toBe(0);
  fireEvent.pointerMove(screen.getByText('Third'));
  expect(animate).toHaveBeenCalledOnce();
});

it('hands the same animated highlight from pointer selection back to keyboard selection', async () => {
  const { animate, layer, input } = await palette();
  const second = screen.getByRole('option', { name: 'Second' });
  fireEvent.pointerOver(second); fireEvent.pointerMove(second);
  animate.mockClear();
  fireEvent.keyDown(input, { key: 'ArrowUp' });
  expect(screen.getByRole('option', { name: 'First' })).toHaveAttribute('aria-selected', 'true');
  expect(input).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'First' }).id);
  expect(layer.style.transform).toBe('translate3d(0px,24px,0)');
  expect(animate).toHaveBeenCalledOnce();
});

it('retains keyboard reveal and removes the highlight when filtering has no results', async () => {
  const { layer, input, viewport } = await palette();
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(viewport.scrollTop).toBeGreaterThan(0);
  fireEvent.change(input, { target: { value: 'Missing' } });
  expect(layer).not.toHaveAttribute('data-visible');
  expect(input).not.toHaveAttribute('aria-activedescendant');
  expect(screen.getByText('Ничего не найдено')).toBeVisible();
});

it('respects reduced motion and ignores touch movement while retaining explicit activation', async () => {
  const { animate, input, layer } = await palette(true);
  const touch = new Event('pointermove', { bubbles: true });
  Object.defineProperty(touch, 'pointerType', { value: 'touch' });
  fireEvent(screen.getByRole('option', { name: 'Second' }), touch);
  expect(screen.getByRole('option', { name: 'First' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  expect(layer.style.transform).toBe('translate3d(0px,68px,0)');
  expect(animate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('option', { name: 'Second' }));
  expect(items[1].onSelect).toHaveBeenCalledOnce();
});


it('uses the catalogue search header by default and retains the optional visible title', async () => {
  const {rerender} = render(<CommandPalette open onOpenChange={() => {}} items={items}/>);
  const input = screen.getByRole('combobox');
  expect(input.closest('.cap-dialog-header')).not.toBeNull();
  expect(screen.getByRole('heading', {name:'Быстрый поиск'})).toHaveClass('cap-sr-only');
  rerender(<CommandPalette open showTitle onOpenChange={() => {}} items={items}/>);
  expect(screen.getByRole('combobox').closest('.cap-dialog-body')).not.toBeNull();
  expect(screen.getByRole('heading', {name:'Быстрый поиск'})).not.toHaveClass('cap-sr-only');
});
