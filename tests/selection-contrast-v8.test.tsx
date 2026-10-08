import { readFileSync } from 'node:fs';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox, Radio, Slider, Switch } from '../src/components/forms';
import { RadioGroup } from '../src/components/selection';
import { arcPlaygrounds } from '../demo/PlaygroundArc';
import graph from '../src/tokens/figma-modes.json';

type Color = { components: number[] };
type Token = Color | { alias: string } | string | number;
const collections = graph.collections as unknown as { name: string; modes: Record<string, Record<string, Token>> }[];
function color(path: string, context: string): Color {
  const [collection, ...name] = path.split('/'), [theme, surface] = context.split(' · ');
  const tokens = collections.find(item => item.name === collection)!;
  const mode = collection === 'Primitives' ? 'Value' : collection === 'Theme' ? theme : surface;
  const value = tokens.modes[mode][name.join('/')];
  if (typeof value === 'object' && 'alias' in value) return color(value.alias, context);
  if (typeof value !== 'object' || !('components' in value)) throw new Error(`Missing color ${path}`);
  return value;
}
function luminance(value: Color) {
  return value.components.reduce((sum, channel, index) => sum + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][index], 0);
}
function ratio(a: Color, b: Color) {
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}

describe('Primary selection contrast', () => {
  it('retains explicit contrast and native choice behavior when a selection changes appearance', async () => {
    const changed = vi.fn();
    const content = (contrast?: boolean) => <form>
      <Checkbox label="Checkbox" contrast={contrast} defaultChecked />
      <Radio label="Radio" name="radio" contrast={contrast} defaultChecked />
      <Switch label="Switch" contrast={contrast} defaultChecked />
      <Slider label="Slider" contrast={contrast} defaultValue={30} />
      <RadioGroup label="Group" name="choice" contrast={contrast} defaultValue="a" onValueChange={changed} options={[{ value: 'a', label: 'One' }, { value: 'b', label: 'Two' }, { value: 'c', label: 'Locked', disabled: true }]} />
    </form>;
    const { container, rerender } = render(content());
    const shells = () => [...container.querySelectorAll('.cap-check-label,.cap-switch-label,.cap-slider-field,.cap-radio-group')];
    expect(shells().map(shell => shell.getAttribute('data-contrast'))).toEqual(['true', 'true', 'true', 'false', 'true']);
    rerender(content(false));
    expect(shells().every(shell => shell.getAttribute('data-contrast') === 'false')).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: 'Two' }));
    expect(changed).toHaveBeenLastCalledWith('b');
    expect(new FormData(container.querySelector('form')!).get('choice')).toBe('b');
    await userEvent.click(screen.getByRole('radio', { name: 'Locked' }));
    expect(changed).toHaveBeenCalledOnce();
    rerender(content(true));
    expect(shells().every(shell => shell.getAttribute('data-contrast') === 'true')).toBe(true);
    expect(screen.getByRole('radio', { name: 'Two' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Checkbox' })).toBeChecked();
    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByRole('slider')).toHaveValue('30');
  });

  it('exposes the RadioGroup contrast control directly after size with the component default', () => {
    const spec = arcPlaygrounds.RadioGroup;
    expect(spec.controls.slice(0, 2).map(control => control.key)).toEqual(['size', 'contrast']);
    expect(spec.controls.find(control => control.key === 'contrast')?.initial).toBe(true);
    const values = Object.fromEntries(spec.controls.map(control => [control.key, control.initial]));
    const context = { set: vi.fn(), notify: vi.fn(), t: (text: string) => text };
    const { container, rerender } = render(spec.render(values, context));
    expect(container.querySelector('.cap-radio-group')).toHaveAttribute('data-contrast', 'true');
    rerender(spec.render({ ...values, contrast: false }, context));
    expect(container.querySelector('.cap-radio-group')).toHaveAttribute('data-contrast', 'false');
  });

  it('maps Primary to neutral action roles and soft selection to local accent roles, including group radios', () => {
    const css = readFileSync('src/styles/forms-refined.css', 'utf8');
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
    const selection = rules.filter(([, , body]) => body.includes('--cap-selection-normal:'));
    const [soft, primary] = selection;
    expect(soft[1]).toContain('.cap-radio-group');
    expect(primary[1]).toContain('[data-contrast=true]');
    for (const state of ['normal', 'hover', 'pressed', 'text']) {
      expect(soft[2]).toContain(`--cap-selection-${state}:var(--cap-accent-${state})`);
      expect(primary[2]).toContain(`--cap-selection-${state}:var(--cap-action-${state})`);
    }
    const radioCss = readFileSync('src/styles/selection.css', 'utf8');
    for (const state of ['normal', 'hover', 'pressed', 'text']) expect(radioCss).toContain(`var(--cap-selection-${state})`);
    expect(radioCss).not.toContain('box-shadow:inset 0 0 0 4px var(--cap-surface-raised)');
  });

  it.each(Object.keys(graph.contexts))('%s keeps both choices visibly distinct and their paired marks readable for every accent', context => {
    const primaryInk = color('Semantic/action/neutral/text', context);
    for (const hue of graph.modes) {
      const softInk = color(`Semantic/element/${hue}/text`, context);
      for (const state of ['normal', 'hover', 'pressed']) {
        const primary = color(`Semantic/action/neutral/${state}`, context);
        const soft = color(`Semantic/element/${hue}/${state}`, context);
        expect(soft, `${hue}/${state} must differ from neutral Primary`).not.toEqual(primary);
        expect(ratio(primary, primaryInk), `Primary/${state}`).toBeGreaterThanOrEqual(4.5);
        expect(ratio(soft, softInk), `${hue}/${state}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
