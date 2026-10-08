import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastStack, type ToastStackProps } from '../src/components/messages';

const items = [{ id: 'first', title: 'First', duration: Infinity }, { id: 'second', title: 'Second', duration: Infinity }];

describe('ToastStack context', () => {
  it.each(['inline', 'container', 'viewport'] as const)('preserves independent context axes and live changes in %s placement', async placement => {
    const position: ToastStackProps['position'] = placement === 'inline' ? 'inline' : 'bottom-center';
    const { container } = render(<section data-theme="dark" data-accent="teal" data-borders="off" data-radius="compact" data-shadow="compact" data-surface="canvas"><ToastStack position={position} scope={placement === 'viewport' ? 'viewport' : 'container'} items={items} onDismiss={() => {}} /></section>);
    const parent = container.querySelector('section')!;
    const stack = screen.getByRole('region');
    expect(stack).toHaveAttribute('data-shape', 'rounded');
    const assertContext = (radius: string, theme: string, accent: string, borders: string, shadow: string) => {
      for (const node of [stack, screen.getByRole('button', { name: 'Развернуть уведомления' }), ...stack.querySelectorAll('.cap-toast')]) {
        for (const [axis, value] of Object.entries({ radius, theme, accent, borders, shadow })) expect(node.closest(`[data-${axis}]`)).toHaveAttribute(`data-${axis}`, value);
        expect(node.closest('[data-surface]')).toHaveAttribute('data-surface', placement === 'inline' ? 'canvas' : 'floating');
      }
    };
    assertContext('compact', 'dark', 'teal', 'off', 'compact');
    await act(async () => {
      parent.setAttribute('data-radius', 'rounded');
      parent.setAttribute('data-theme', 'light');
      parent.setAttribute('data-accent', 'rose');
      parent.setAttribute('data-borders', 'on');
      parent.setAttribute('data-shadow', 'soft');
    });
    assertContext('rounded', 'light', 'rose', 'on', 'soft');
  });

  it('permits an explicit capsule without changing the inherited radius context', () => {
    const { container } = render(<section data-radius="compact"><ToastStack position="inline" shape="pill" items={items} onDismiss={() => {}} /></section>);
    expect(screen.getByRole('region')).toHaveAttribute('data-shape', 'pill');
    expect(container.querySelector('.cap-toast')!.closest('[data-radius]')).toHaveAttribute('data-radius', 'compact');
  });
});
