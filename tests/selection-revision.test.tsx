import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from '../src/components/chip.js';
import { Slider } from '../src/components/forms.js';
import { ColorPicker, MultiSelect } from '../src/components/selection.js';

describe('selection revision', () => {
  it('keeps Chip actions as sibling buttons and respects static/disabled states', () => {
    const toggle = vi.fn(), remove = vi.fn();
    const { container, rerender } = render(<Chip selected onClick={toggle} onRemove={remove}>Research</Chip>);
    expect(container.querySelector('button button')).toBeNull();
    const main = screen.getByRole('button', { name: 'Research' });
    expect(main).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(main); fireEvent.click(screen.getByRole('button', { name: 'Удалить Research' }));
    expect(toggle).toHaveBeenCalledOnce(); expect(remove).toHaveBeenCalledOnce();
    rerender(<Chip disabled onClick={toggle} onRemove={remove}>Research</Chip>);
    screen.getAllByRole('button').forEach(button => expect(button).toBeDisabled());
    rerender(<Chip interactive={false} onClick={toggle} onRemove={remove}>Research</Chip>);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('uses labelled groups and semantic dots while filtering and keyboard navigation skip disabled rows', () => {
    const changed = vi.fn();
    const { container } = render(<MultiSelect label="Teams" options={[
      { value:'locked', label:'Locked', disabled:true, group:'Product' },
      { value:'design', label:'Design', color:'purple', group:'Product' },
      { value:'ops', label:'Operations', group:'Business' },
    ]} onValueChange={changed} />);
    const input = screen.getByRole('combobox', { name:'Teams: поиск' });
    fireEvent.focus(input);
    expect(within(screen.getByRole('group', { name:'Product' })).getByRole('option', { name:'Design' })).toBeInTheDocument();
    expect(container.querySelector('.cap-selection-color-dot')).toBeNull(); // The dot belongs to the portal.
    expect(document.querySelector('.cap-selection-color-dot')).toHaveAttribute('data-accent', 'purple');
    fireEvent.keyDown(input, { key:'Home' }); fireEvent.keyDown(input, { key:'Enter' });
    expect(changed).toHaveBeenLastCalledWith(['design']);
    fireEvent.change(input, { target:{ value:'Business' } }); fireEvent.keyDown(input, { key:'Enter' });
    expect(changed).toHaveBeenLastCalledWith(['design', 'ops']);
    expect(screen.queryByRole('option', { name:'Locked' })).toBeNull();
    fireEvent.keyDown(input, { key:'Escape' }); expect(input).toHaveAttribute('aria-expanded','false');
    expect(container.querySelectorAll('.cap-chip')).toHaveLength(2);
  });

  it('protects locked choices during chip removal, Backspace and bulk clear', () => {
    const changed = vi.fn();
    render(<MultiSelect label="Topics" defaultValue={['a','b']} options={[{value:'a',label:'Alpha'},{value:'b',label:'Locked',disabled:true}]} onValueChange={changed} />);
    expect(screen.getByRole('button', { name:'Удалить Locked' })).toBeDisabled();
    const input=screen.getByRole('combobox', {name:'Topics: поиск'});
    fireEvent.keyDown(input, {key:'Backspace'});
    expect(changed).toHaveBeenLastCalledWith(['b']);
    expect(screen.queryByRole('button', {name:'Очистить все: Topics'})).toBeNull();
  });

  it('omits preset/saved colors by default and records deduplicated recent choices only after close', () => {
    const changed = vi.fn();
    const { rerender }=render(<ColorPicker label="Tint" defaultValue="#112233" />);
    fireEvent.click(screen.getByRole('button', {name:'Tint'}));
    expect(screen.queryByRole('radiogroup', {name:'Цветовая палитра'})).toBeNull();
    expect(document.querySelector('.cap-color-saved')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name:'Готово'}));
    rerender(<ColorPicker label="Tint" defaultValue="#112233" showRecent onSwatchesChange={changed} />);
    fireEvent.click(screen.getByRole('button', {name:'Tint'}));
    const input=screen.getByRole('textbox', {name:'Tint, формат HEX'});
    fireEvent.change(input, {target:{value:'#445566'}}); fireEvent.blur(input);
    expect(changed).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name:'Готово'}));
    expect(changed).toHaveBeenLastCalledWith([expect.objectContaining({color:'#445566'})]);
    fireEvent.click(screen.getByRole('button', {name:'Tint'})); fireEvent.click(screen.getByRole('button', {name:'Готово'}));
    expect(changed.mock.calls.at(-1)?.[0]).toHaveLength(1);
  });

  it('keeps native Slider form values and emits numeric change/commit with an accessible formatted value', () => {
    const changed=vi.fn(), committed=vi.fn();
    const {container}=render(<form><Slider id="density" label="Density" name="density" min={0} max={1} step={0.1} defaultValue={0.2} formatValue={value=>`${Math.round(value*100)}%`} onValueChange={changed} onValueCommit={committed}/></form>);
    const slider=screen.getByRole('slider', {name:'Density'});
    expect(slider).toHaveAttribute('id','density'); expect(slider).toHaveAttribute('aria-valuetext','20%');
    fireEvent.change(slider,{target:{value:'0.7'}}); fireEvent.keyUp(slider,{key:'ArrowRight'});
    expect(changed).toHaveBeenLastCalledWith(0.7); expect(committed).toHaveBeenLastCalledWith(0.7);
    expect(slider).toHaveAttribute('aria-valuetext','70%');
    expect(new FormData(container.querySelector('form')!).get('density')).toBe('0.7');
    expect(container.querySelector('.cap-slider-rail')).toHaveAttribute('aria-hidden','true');
  });
});
