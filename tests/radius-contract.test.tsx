import { readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Select } from '../src/components/forms';

const foundation = JSON.parse(readFileSync('source/foundation.json', 'utf8'));
const css = readFileSync('src/styles/tokens.css', 'utf8');

it('publishes whole-pixel radii for every context with base radii 0, 4, 8 and 16', () => {
  const expected = { none: 0, compact: 4, default: 8, rounded: 16 };
  for (const [mode, base] of Object.entries(expected)) {
    const body = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([,selectors]) => selectors.includes(`[data-radius="${mode}"]`) && !selectors.includes('[data-theme]'))![2];
    expect(body).toContain(`--cap-number-radius-lg:${base}px`);
    expect(body).toContain(`--cap-radius-enabled:${mode==='none'?0:1}`);
    for (const [name, value] of Object.entries(foundation.scalars.radius)) {
      if (name === 'full') continue;
      const scaled = Math.round(Number(value) * foundation.radiusContexts[mode].scale);
      expect(Number.isInteger(scaled)).toBe(true);
      expect(body).toContain(`--cap-number-radius-${name}:${scaled}px`);
    }
  }
  expect(css).not.toContain('--cap-number-radius-compact: 4.8px');
  expect(css).not.toMatch(/--cap-number-radius-[\w-]+:\s*calc/);
  expect(css).toContain('--cap-number-radius-full: 9999px');
  expect(css).toContain(':root:not([data-radius]), [data-radius="default"]');
  expect(foundation.radiusContexts.none.inset).toBe(0);
});

it('keeps all exported Figma corner-radius primitives integral', () => {
  const graph = JSON.parse(readFileSync('src/tokens/figma-modes.json', 'utf8'));
  const radii = Object.entries(graph.metadata).filter(([,meta]: [string, any]) => meta.scopes?.includes('CORNER_RADIUS'));
  expect(radii.length).toBeGreaterThan(0);
  for (const [path] of radii) {
    const [name, ...parts] = path.split('/');
    const collection = graph.collections.find((entry: any) => entry.name === name);
    for (const values of Object.values(collection.modes) as any[]) {
      const value = values[parts.join('/')];
      if (typeof value === 'number') expect(Number.isInteger(value), path).toBe(true);
    }
  }
});

it('shows option names and right-hand values while keeping the compact trigger and native form value', () => {
  const change = vi.fn();
  const { container } = render(<form><Select name="radius" aria-label="Radius" defaultValue="compact" onValueChange={change} options={[
    { value:'none', label:'Square', meta:'0 px', triggerLabel:'0 px' },
    { value:'compact', label:'Small', meta:'4 px', triggerLabel:'4 px' },
    { value:'default', label:'Medium', meta:'8 px', triggerLabel:'8 px' },
    { value:'rounded', label:'Maximum', meta:'16 px', triggerLabel:'16 px' },
  ]}/></form>);
  const trigger = screen.getByRole('combobox', { name:'Radius' });
  expect(trigger).toHaveTextContent('4 px');
  fireEvent.click(trigger);
  const option = screen.getByRole('option', { name:'Maximum 16 px' });
  expect(option.querySelector('.cap-select-option-meta')).toHaveTextContent('16 px');
  expect(container.querySelector('.cap-select-group')).toBeNull();
  fireEvent.click(option);
  expect(trigger).toHaveTextContent('16 px');
  expect(trigger).not.toHaveTextContent('Maximum');
  expect(change).toHaveBeenCalledWith('rounded');
  expect(new FormData(container.querySelector('form')!).get('radius')).toBe('rounded');
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('option', { name:'Square 0 px' }));
  expect(trigger).toHaveTextContent('0 px');
  expect(new FormData(container.querySelector('form')!).get('radius')).toBe('none');
});
