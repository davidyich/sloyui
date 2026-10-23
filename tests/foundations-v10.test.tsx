import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '../src';
import ColorsV2 from '../demo/ColorsV2';
import Typography from '../demo/Typography';

describe('foundation catalogue interactions', () => {
  it('defers the complete accent and palette matrices and disconnects observers', () => {
    const observers: { callback: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }[] = [];
    vi.stubGlobal('IntersectionObserver', class {
      disconnect = vi.fn(); observe = vi.fn(); unobserve = vi.fn();
      constructor(callback: IntersectionObserverCallback) { observers.push({ callback, disconnect: this.disconnect }); }
    });
    try {
      const copy=vi.fn();
      const { container, unmount } = render(<ColorsV2 accent="blue" copy={copy}/>);
      expect(container.querySelectorAll('.tag-matrix-row')).toHaveLength(0);
      expect(container.querySelectorAll('.cap-v2-palette-swatch')).toHaveLength(0);
      expect(observers).toHaveLength(2);
      act(() => observers.forEach(observer => observer.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)));
      expect(container.querySelectorAll('.tag-matrix-row')).toHaveLength(7);
      expect(container.querySelectorAll('.cap-v2-palette-swatch')).toHaveLength(287);
      const blue=container.querySelector('[data-palette="blue"]')!;
      expect([...blue.querySelectorAll('.cap-v2-palette-swatch strong')].map(step=>step.textContent)).toEqual(Array.from({length:41},(_,index)=>String(index+1).padStart(2,'0')));
      act(()=>blue.querySelector<HTMLButtonElement>('.cap-v2-palette-swatch')!.click());
      expect(copy).toHaveBeenLastCalledWith('var(--cap-v4-palette-blue-01)');
      unmount();
      expect(observers.every(observer => observer.disconnect.mock.calls.length > 0)).toBe(true);
    } finally { vi.unstubAllGlobals(); }
  });
  it('preserves wrap choices and shows canonical v4 contexts on actual secondary components', async () => {
    const user = userEvent.setup();
    const copy = vi.fn();
    const { container } = render(<LocaleProvider locale="en"><ColorsV2 accent="neutral" copy={copy}/></LocaleProvider>);
    await user.click(screen.getByRole('switch', { name: 'Wrap' }));
    await user.click(screen.getByRole('radio', { name: 'Columns' }));
    expect(screen.getByRole('switch', { name: 'Wrap' })).not.toBeChecked();
    expect(container.querySelector('.cap-v2-palettes')).toHaveAttribute('data-wrap', 'false');
    await user.click(screen.getByRole('switch', { name: 'Wrap' }));
    await user.click(screen.getByRole('radio', { name: 'Rows' }));
    expect(screen.getByRole('switch', { name: 'Wrap' })).toBeChecked();
    await user.click(screen.getByRole('tab', { name: 'Overlay' }));
    expect(container.querySelector('.cap-foundation-active-surface > section')).toHaveAttribute('data-surface', 'overlay');
    expect(container.querySelectorAll('.tag-matrix-row')).toHaveLength(7);
    const surfaces = container.querySelectorAll('.cap-v4-surface-grid .cap-v4-surface');
    for (const surface of surfaces) expect([...surface.querySelectorAll('.cap-v4-accent-comparison .cap-tag')].map(tag => tag.getAttribute('data-color'))).toEqual(['neutral', 'blue', 'purple']);
    expect([...surfaces].map(surface => surface.getAttribute('data-surface'))).toEqual(['shell', 'workspace', 'content', 'invert', 'glass', 'overlay']);
    await user.click(surfaces[0].querySelector<HTMLButtonElement>('.cap-button')!);
    expect(copy).toHaveBeenLastCalledWith('var(--cap-control-normal)');
  });
  it('uses all four role families and source typography values while changing the prose rhythm', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(<LocaleProvider locale="en"><Typography/></LocaleProvider>);
    expect([...container.querySelectorAll('[data-font-role]')].map(element => element.getAttribute('data-font-role'))).toEqual(['base', 'heading', 'pair', 'code']);
    expect(screen.getByText('Primitives/font/size/body')).toBeInTheDocument();
    const body = screen.getByText('Primitives/font/size/body').closest('.cap-typography-row')!;
    expect(body.querySelector('p')).toHaveStyle({ fontSize: '14px', lineHeight: '20px' });
    await user.click(screen.getByRole('radio', { name: 'Prose' }));
    expect(body.querySelector('p')).toHaveStyle({ fontSize: '14px', lineHeight: '24px' });
    expect(screen.getByText('A longer reading sample')).toBeInTheDocument();
    rerender(<LocaleProvider locale="ru"><Typography/></LocaleProvider>);
    expect(screen.getByText('Пример длинного текста')).toBeInTheDocument();
  });
});
