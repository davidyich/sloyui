import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Ramps } from '../figma/color-system-v2/editor/Views';
import { PaletteOverrides } from '../figma/color-system-v2/editor/PaletteOverrides';
import { createAccent, defaultRules, generatePalette, toHex } from '../figma/color-system-v2/editor/model.mjs';

const accent = createAccent('yellow', '#FFE500');

describe('Palette color inspection and selection', () => {
  it('copies the exact swatch without submitting an enclosing form or losing keyboard focus', () => {
    const onCopy = vi.fn(), onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const scales = generatePalette(accent);
    render(<form onSubmit={onSubmit}><Ramps scales={scales} contexts={[]} onCopy={onCopy}/></form>);
    const step = scales[0].steps[7];
    const button = screen.getByRole('button', { name: `${step.name} ${toHex(step.value)}` });
    const paint = button.style.background;
    button.focus();
    fireEvent.click(button);
    expect(onCopy).toHaveBeenCalledWith(toHex(step.value));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(button).toHaveFocus();
    expect(button.style.background).toBe(paint);
  });

  it('retains an explicit selected step while inspection preserves its exact authored paint', () => {
    const onChange = vi.fn();
    render(<PaletteOverrides accent={accent} rules={defaultRules} onChange={onChange}/>);
    const first = screen.getByRole('button', { name: 'Редактировать ступень 1' });
    const next = screen.getByRole('button', { name: 'Редактировать ступень 8' });
    const paint = next.style.background;
    next.focus();
    fireEvent.click(next);
    expect(first).toHaveAttribute('aria-pressed', 'false');
    expect(next).toHaveAttribute('aria-pressed', 'true');
    expect(next).toHaveFocus();
    expect(next.style.background).toBe(paint);
    expect(onChange).not.toHaveBeenCalled();
  });
});
