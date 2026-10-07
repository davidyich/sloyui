import { readFileSync } from 'node:fs';
import { createRef } from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Button, IconButton } from '../src/components/primitives.js';

afterEach(cleanup);

it('keeps primary neutral and leaves both accent pairs available for Button and IconButton', () => {
  const style = document.createElement('style');
  style.textContent = readFileSync('src/styles/states.css', 'utf8');
  document.head.append(style);
  try {
    for (const theme of ['light', 'dark']) for (const accent of ['neutral', 'blue', 'rose']) {
      const ref = createRef<HTMLButtonElement>();
      const { unmount } = render(<div data-theme={theme} data-accent={accent}>
        <Button variant="primary">Save</Button>
        <IconButton ref={ref} variant="primary" label="Publish" icon="check"/>
        <Button variant="accent">Color primary</Button>
        <IconButton variant="accent-secondary" label="Color secondary" icon="plus"/>
      </div>);
      for (const name of ['Save', 'Publish']) {
        const button = screen.getByRole('button', { name });
        const css = getComputedStyle(button);
        for (const state of ['normal', 'hover', 'pressed', 'text']) expect(css.getPropertyValue(`--cap-state-${state}`).trim()).toBe(`var(--cap-action-${state})`);
        expect(button).not.toHaveAttribute('data-accent');
      }
      expect(ref.current).toBe(screen.getByRole('button', { name: 'Publish' }));
      for (const [name, pair] of [['Color primary', 'accent-solid'], ['Color secondary', 'accent']]) {
        const css = getComputedStyle(screen.getByRole('button', { name }));
        for (const state of ['normal', 'hover', 'pressed', 'text']) expect(css.getPropertyValue(`--cap-state-${state}`).trim()).toBe(`var(--cap-${pair}-${state})`);
      }
      unmount();
    }
  } finally { style.remove(); }
});
