import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from '../src/components/chip.js';
import { Select, Slider } from '../src/components/forms.js';
import { ColorPicker, ComboBox, MultiSelect, NumberField, TagInput } from '../src/components/selection.js';
import { ValueScrubber } from '../src/components/value-scrubber.js';
import { Calendar } from '../src/components/content.js';

describe('selection revision', () => {
  it('uses neutral calendar navigation that follows decorative border mode', () => {
    const {rerender}=render(<div data-borders="off"><Calendar value="2026-10-07" onValueChange={()=>{}}/></div>);
    for (const label of ['Предыдущий месяц','Следующий месяц']) expect(screen.getByRole('button',{name:label})).toHaveAttribute('data-variant','secondary');
    fireEvent.click(screen.getByRole('button',{name:'Следующий месяц'}));
    expect(screen.getByRole('combobox',{name:'Месяц'})).toHaveTextContent('ноябрь');
    rerender(<div data-borders="on"><Calendar value="2026-10-07" onValueChange={()=>{}}/></div>);
    expect(screen.getByRole('button',{name:'Предыдущий месяц'})).toHaveAttribute('data-variant','secondary');
  });
  it.each(['select', 'combo', 'multi', 'color'] as const)('preserves the nearest border/radius contexts in the %s portal, including live changes', async kind => {
    const options = [{ value:'one', label:'One' }];
    const control = kind === 'select' ? <Select label="Context" options={options}/> : kind === 'combo' ? <ComboBox label="Context" options={options}/> : kind === 'multi' ? <MultiSelect label="Context" options={options}/> : <ColorPicker label="Context"/>;
    const view = (borders:'off'|'on', radius:'compact'|'default'|'rounded') => <div data-borders="on" data-radius="rounded"><div data-borders={borders} data-radius={radius}>{control}</div></div>;
    const { rerender } = render(view('off','compact'));
    const trigger = kind === 'color' ? screen.getByRole('button',{name:'Context'}) : screen.getByRole('combobox',{name:kind === 'multi' ? 'Context: поиск' : 'Context'});
    if (kind === 'combo' || kind === 'multi') fireEvent.focus(trigger); else fireEvent.click(trigger);
    const panel = kind === 'select' ? document.querySelector('.cap-select-popup') : kind === 'color' ? screen.getByRole('dialog',{name:'Context: цвет'}) : screen.getByRole('region',{name:'Варианты: Context'});
    expect(panel).toHaveAttribute('data-borders','off'); expect(panel).toHaveAttribute('data-radius','compact');
    rerender(view('on','default'));
    await waitFor(() => { expect(panel).toHaveAttribute('data-borders','on'); expect(panel).toHaveAttribute('data-radius','default'); });
    rerender(view('off','rounded'));
    await waitFor(() => { expect(panel).toHaveAttribute('data-borders','off'); expect(panel).toHaveAttribute('data-radius','rounded'); });
  });

  it('keeps errors associated with composite controls and disables their complete interactive surface', () => {
    const changed=vi.fn();
    const {container,rerender}=render(<div data-borders="off" data-radius="compact"><MultiSelect label="Topics" options={[]} error="Choose a topic"/><TagInput label="Tags" error="Required"/><NumberField label="Count" error="Too low"/><ColorPicker label="Tint" error="Invalid color"/></div>);
    for (const field of [screen.getByRole('combobox',{name:'Topics: поиск'}),screen.getByLabelText('Tags'),screen.getByRole('spinbutton',{name:'Count'}),screen.getByRole('button',{name:'Tint'})]) {
      expect(field).toHaveAttribute('aria-invalid','true');
      const error = document.getElementById(field.getAttribute('aria-describedby')!);
      expect(error).toHaveAttribute('role','alert');
    }
    rerender(<div data-borders="off" data-radius="rounded"><MultiSelect label="Topics" options={[{value:'one',label:'One'}]} defaultValue={['one']} disabled variant="ghost"/><TagInput label="Tags" defaultValue={['One']} disabled variant="ghost"/><NumberField label="Count" disabled variant="ghost" onValueChange={changed}/><ColorPicker label="Tint" disabled variant="ghost"/><ValueScrubber label="Scale" value={1} disabled onValueChange={changed}/></div>);
    for (const selector of ['.cap-multiselect-box','.cap-tag-input-box','.cap-number-field']) expect(container.querySelector(selector)).toHaveAttribute('data-disabled');
    screen.getAllByRole('button').forEach(button=>expect(button).toBeDisabled());
    expect(screen.getByRole('slider',{name:'Scale'})).toHaveAttribute('tabindex','-1');
    fireEvent.keyDown(screen.getByRole('slider',{name:'Scale'}),{key:'ArrowUp'});
    expect(changed).not.toHaveBeenCalled();
  });
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
