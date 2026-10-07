import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ComboBox, ColorPicker, MultiSelect, NumberField, RadioGroup, TagInput } from '../src/components/selection.js';
import { ValueScrubber } from '../src/components/value-scrubber.js';

describe('selection controls', () => {
  const openColorPicker = (label: string) => fireEvent.click(screen.getByRole('button', { name: label }));
  it('filters ComboBox options by aliases and submits the selected native value', () => {
    const { container } = render(<form><ComboBox label="Project" name="project" options={[{ value:'one', label:'One', aliases:['first'] }, { value:'two', label:'Two' }]} /></form>);
    const input = screen.getByRole('combobox', { name:'Project' });
    fireEvent.focus(input); fireEvent.change(input, { target:{ value:'first' } });
    const popup=screen.getByRole('region', { name:'Варианты: Project' });
    expect(within(popup).getByRole('listbox', { name:'Project' })).toBeVisible();
    fireEvent.click(screen.getByRole('option', { name:'One' }));
    expect((container.querySelector('select[name="project"]') as HTMLSelectElement).value).toBe('one');
  });
  it('exposes ComboBox input ref, description and clear action with focus restoration', () => {
    let inputRef: HTMLInputElement | null = null;
    render(<ComboBox ref={node=>{inputRef=node;}} label="Project" description="Find a project" defaultValue="one" options={[{value:'one',label:'One'}]} />);
    const input=screen.getByRole('combobox',{name:'Project'});
    expect(input).toHaveAttribute('aria-describedby',expect.stringContaining('description'));
    expect(inputRef).toBe(input);
    fireEvent.click(screen.getByRole('button',{name:'Очистить Project'}));
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('placeholder','Поиск…');
  });
  it('reopens ComboBox after Escape by click or ArrowDown without requiring refocus', () => {
    render(<ComboBox label="Project" options={[{value:'one',label:'One'}]} />);
    const input=screen.getByRole('combobox',{name:'Project'});
    fireEvent.focus(input);
    fireEvent.keyDown(input,{key:'Escape'});
    expect(input).toHaveAttribute('aria-expanded','false');
    fireEvent.click(input);
    expect(input).toHaveAttribute('aria-expanded','true');
    fireEvent.keyDown(input,{key:'Escape'});
    fireEvent.keyDown(input,{key:'ArrowDown'});
    expect(input).toHaveAttribute('aria-expanded','true');
    expect(screen.getByRole('option',{name:'One'})).toBeVisible();
  });
  it('adds/removes MultiSelect values and emits updates', () => {
    const onValueChange = vi.fn();
    render(<MultiSelect label="Topics" options={[{ value:'a',label:'Alpha' }]} onValueChange={onValueChange} />);
    fireEvent.focus(screen.getByRole('combobox', { name:'Topics: поиск' })); fireEvent.click(screen.getByRole('option', { name:'Alpha' }));
    expect(onValueChange).toHaveBeenLastCalledWith(['a']);
    fireEvent.click(screen.getByRole('button', { name:'Удалить Alpha' })); expect(onValueChange).toHaveBeenLastCalledWith([]);
  });
  it('keeps selected MultiSelect options checked, clears all, and returns focus to search', () => {
    const onValueChange = vi.fn();
    const { container } = render(<MultiSelect label="Topics" description="Choose topics" defaultValue={['a']} options={[{value:'a',label:'Alpha'},{value:'b',label:'Beta'}]} onValueChange={onValueChange} />);
    const input = screen.getByRole('combobox', {name:'Topics: поиск'});
    expect(screen.getByText('Choose topics')).toBeInTheDocument();
    fireEvent.focus(input);
    expect(screen.getByRole('option',{name:'Alpha'})).toHaveAttribute('aria-selected','true');
    fireEvent.click(screen.getByRole('button',{name:'Очистить все: Topics'}));
    expect(onValueChange).toHaveBeenLastCalledWith([]);
    expect(input).toHaveFocus();
    expect(container.querySelector('.cap-selection-chip-wrap')).toBeNull();
  });
  it('reopens MultiSelect after Escape and submits every selected value past the chip limit', () => {
    const { container } = render(<form><MultiSelect label="Topics" name="topics" maxVisible={2} defaultValue={['a','b','c']} options={[{value:'a',label:'Alpha'},{value:'b',label:'Beta'},{value:'c',label:'Gamma'}]} /></form>);
    const input=screen.getByRole('combobox',{name:'Topics: поиск'});
    expect(container.querySelectorAll('input[type="hidden"][name="topics"]')).toHaveLength(3);
    expect(container.querySelectorAll('.cap-selection-chip-wrap > .cap-chip')).toHaveLength(3);
    fireEvent.focus(input);
    fireEvent.keyDown(input,{key:'Escape'});
    expect(input).toHaveAttribute('aria-expanded','false');
    fireEvent.click(input);
    expect(input).toHaveAttribute('aria-expanded','true');
    fireEvent.keyDown(input,{key:'Escape'});
    fireEvent.keyDown(input,{key:'ArrowDown'});
    expect(input).toHaveAttribute('aria-expanded','true');
    expect(screen.getByRole('option',{name:/Alpha/})).toBeVisible();
  });
  it('closes an open MultiSelect and disables every option when the field becomes disabled', () => {
    const props={label:'Topics',options:[{value:'a',label:'Alpha'},{value:'b',label:'Beta'}]};
    const { rerender, container }=render(<MultiSelect {...props}/>);
    const input=screen.getByRole('combobox',{name:'Topics: поиск'});
    fireEvent.focus(input);
    expect(screen.getByRole('option',{name:'Alpha'})).toBeEnabled();
    rerender(<MultiSelect {...props} disabled/>);
    expect(input).toBeDisabled();
    expect(screen.queryByRole('option',{name:'Alpha'})).not.toBeInTheDocument();
    expect(container.querySelector('input[aria-expanded="true"]')).toBeNull();
  });
  it('commits and removes free-form tags with keyboard input', () => {
    const onValueChange = vi.fn();
    render(<TagInput label="Tags" onValueChange={onValueChange} />);
    const input = screen.getByLabelText('Tags'); fireEvent.change(input,{target:{value:'design'}}); fireEvent.keyDown(input,{key:'Enter'});
    expect(onValueChange).toHaveBeenLastCalledWith(['design']);
    fireEvent.click(screen.getByRole('button',{name:'Удалить design'})); expect(onValueChange).toHaveBeenLastCalledWith([]);
  });
  it('lets keyboard users pick, move across, and remove tags with announcements', () => {
    const { container } = render(<TagInput label="Tags" description="A short list" defaultValue={['Alpha','Beta']} />);
    const input = screen.getByLabelText('Tags');
    expect(input).toHaveAttribute('aria-describedby', expect.stringContaining('description'));
    fireEvent.keyDown(input,{key:'Backspace'});
    expect(container.querySelector('[data-picked="true"]')).toHaveTextContent('Beta');
    expect(screen.getByText(/Выбрана метка «Beta»/)).toBeInTheDocument();
    fireEvent.keyDown(input,{key:'ArrowLeft'});
    expect(container.querySelector('[data-picked="true"]')).toHaveTextContent('Alpha');
    fireEvent.keyDown(input,{key:'Delete'});
    expect(screen.queryByText('Alpha',{selector:'.cap-tag-text'})).not.toBeInTheDocument();
  });
  it('uses one named native radio group and updates selection', () => {
    render(<RadioGroup label="Layout" name="layout" defaultValue="grid" options={[{value:'grid',label:'Grid'},{value:'list',label:'List'}]} />);
    expect(screen.getByRole('radio',{name:'Grid'})).toBeChecked(); fireEvent.click(screen.getByRole('radio',{name:'List'})); expect(screen.getByRole('radio',{name:'List'})).toBeChecked();
  });
  it('keeps card labels and descriptions aligned with or without decorative icons', () => {
    const { container } = render(<RadioGroup label="Plan" variant="cards" options={[{value:'icon',label:'Long option name',description:'Supporting copy',icon:'check'},{value:'plain',label:'Plain option',description:'Second supporting line'}]} />);
    const cards = [...container.querySelectorAll('.cap-radio-option')];
    expect(cards).toHaveLength(2);
    expect(cards[0].querySelector('.cap-radio-heading')?.textContent).toContain('Long option name');
    expect(cards[0].querySelector('.cap-radio-description')).toHaveTextContent('Supporting copy');
    expect(cards[1].querySelector('.cap-radio-heading svg')).toBeNull();
    expect(cards[1].querySelector('.cap-radio-description')).toHaveTextContent('Second supporting line');
  });
  it('supports grid cards, meta labels and disabled reasons in RadioGroup', () => {
    const { container } = render(<RadioGroup label="Plan" variant="cards" layout="grid" options={[{value:'basic',label:'Basic',meta:'Free'},{value:'pro',label:'Pro',disabled:true,disabledReason:'Requires an account'}]} />);
    expect(container.querySelector('.cap-radio-group')).toHaveAttribute('data-layout','grid');
    expect(container.querySelector('.cap-radio-meta')).toHaveTextContent('Free');
    expect(screen.getByText('Requires an account')).toBeInTheDocument();
    expect(screen.getByRole('radio',{name:/Pro/})).toBeDisabled();
  });
  it('accepts custom color formats and increments within bounds', () => {
    const colorChange = vi.fn(), numberChange = vi.fn();
    render(<><ColorPicker label="Accent" onValueChange={colorChange} /><NumberField label="Zoom" defaultValue={95} min={50} max={100} step={10} suffix="%" onValueChange={numberChange} /></>);
    openColorPicker('Accent');
    const colorInput = screen.getByRole('textbox',{name:'Accent, формат HEX'}); fireEvent.change(colorInput,{target:{value:'#112233'}}); fireEvent.blur(colorInput); expect(colorChange).toHaveBeenCalledWith('#112233');
    fireEvent.click(screen.getByRole('button',{name:'Увеличить: Zoom'})); expect(numberChange).toHaveBeenCalledWith(100); expect(screen.getByRole('button',{name:'Увеличить: Zoom'})).toBeDisabled();
  });
  it('supports NumberField prefix, PageUp/PageDown and large steps', () => {
    const onValueChange=vi.fn();
    render(<NumberField label="Scale" defaultValue={10} min={0} max={100} step={1} largeStep={25} prefix="$" onValueChange={onValueChange} />);
    const input=screen.getByRole('spinbutton',{name:'Scale'});
    expect(screen.getByText('$')).toBeInTheDocument();
    fireEvent.keyDown(input,{key:'PageUp'});
    expect(onValueChange).toHaveBeenLastCalledWith(35);
    fireEvent.keyDown(input,{key:'PageDown'});
    expect(onValueChange).toHaveBeenLastCalledWith(10);
  });
  it('repeats NumberField steps while held and stops on release', () => {
    vi.useFakeTimers();
    try {
      const onValueChange=vi.fn();
      render(<NumberField label="Count" defaultValue={0} onValueChange={onValueChange} />);
      const button=screen.getByRole('button',{name:'Увеличить: Count'});
      fireEvent.pointerDown(button,{button:0,pointerId:7});
      act(()=>{vi.advanceTimersByTime(650);});
      expect(onValueChange.mock.calls.length).toBeGreaterThan(2);
      fireEvent.pointerUp(button,{pointerId:7});
      fireEvent.click(button);
      const callsAtRelease=onValueChange.mock.calls.length;
      act(()=>{vi.advanceTimersByTime(500);});
      expect(onValueChange).toHaveBeenCalledTimes(callsAtRelease);
    } finally { vi.useRealTimers(); }
  });
  it('stops held NumberField repeat at the bound without duplicate callbacks', () => {
    vi.useFakeTimers();
    try {
      const onValueChange=vi.fn();
      render(<NumberField label="Count" defaultValue={0} min={0} max={2} onValueChange={onValueChange} />);
      const button=screen.getByRole('button',{name:'Увеличить: Count'});
      fireEvent.pointerDown(button,{button:0,pointerId:9});
      act(()=>{vi.advanceTimersByTime(1400);});
      expect(onValueChange.mock.calls.map(([value])=>value)).toEqual([1,2]);
      fireEvent.pointerUp(button,{pointerId:9});
      fireEvent.click(button);
      expect(onValueChange).toHaveBeenCalledTimes(2);
    } finally { vi.useRealTimers(); }
  });
  it('does not turn unbounded Home/End into infinite slider values', () => {
    const onValueChange=vi.fn();
    render(<ValueScrubber label="Unbounded" value={5} min={-Infinity} max={Infinity} onValueChange={onValueChange} />);
    const slider=screen.getByRole('slider',{name:'Unbounded'});
    fireEvent.keyDown(slider,{key:'Home'});
    fireEvent.keyDown(slider,{key:'End'});
    expect(onValueChange).not.toHaveBeenCalled();
  });
  it('converts HSL and RGB formats in both directions and rejects invalid colors accessibly', () => {
    const onValueChange = vi.fn();
    render(<ColorPicker label="Accent" defaultValue="#FF0000" format="hsl" name="accent" onValueChange={onValueChange} />);
    openColorPicker('Accent');
    const input = screen.getByRole('textbox',{name:'Accent, формат HSL'});
    expect(input).toHaveValue('hsl(0, 100%, 50%)');
    fireEvent.change(input,{target:{value:'hsl(120, 100%, 50%)'}}); fireEvent.blur(input);
    expect(onValueChange).toHaveBeenLastCalledWith('hsl(120, 100%, 50%)');
    expect(document.querySelector('input[name="accent"]')).toHaveValue('#00FF00');
    fireEvent.click(screen.getByRole('combobox',{name:'Формат цвета'}));
    fireEvent.click(screen.getByRole('option',{name:'RGB'}));
    expect(screen.getByRole('textbox',{name:'Accent, формат RGB'})).toHaveValue('rgb(0, 255, 0)');
    const rgbInput = screen.getByRole('textbox',{name:'Accent, формат RGB'});
    fireEvent.change(rgbInput,{target:{value:'rgb(0, 0, 255)'}}); fireEvent.blur(rgbInput);
    expect(onValueChange).toHaveBeenLastCalledWith('rgb(0, 0, 255)');
    expect(document.querySelector('input[name="accent"]')).toHaveValue('#0000FF');
    fireEvent.change(rgbInput,{target:{value:'rgb(999, 0, 0)'}}); fireEvent.blur(rgbInput);
    expect(screen.getByRole('alert')).toHaveTextContent('корректный цвет RGB'); expect(rgbInput).toHaveAttribute('aria-invalid','true');
    expect(onValueChange).toHaveBeenCalledTimes(2);
  });
  it('round-trips OKLCH through sRGB and rejects out-of-range channel values', () => {
    const onValueChange = vi.fn();
    render(<ColorPicker label="Color" defaultValue="#FF0000" format="oklch" onValueChange={onValueChange} />);
    openColorPicker('Color');
    const input = screen.getByRole('textbox', {name:'Color, формат OKLCH'});
    expect(input).toHaveValue('oklch(62.8% 0.258 29.2)');
    fireEvent.change(input,{target:{value:'oklch(62.8% 0.258 29.2)'}}); fireEvent.blur(input);
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.change(input,{target:{value:'oklch(120% 0.258 29.2)'}}); fireEvent.blur(input);
    expect(screen.getByRole('alert')).toHaveTextContent(/oklch/i);
    expect(input).toHaveAttribute('aria-invalid','true');
  });
  it('does not emit a color change when focus leaves an unchanged value and respects disabled state', () => {
    const onValueChange = vi.fn();
    render(<ColorPicker label="Accent" defaultValue="#abc" onValueChange={onValueChange} />);
    openColorPicker('Accent');
    const input = screen.getByRole('textbox',{name:'Accent, формат HEX'}); fireEvent.focus(input); fireEvent.blur(input);
    expect(onValueChange).not.toHaveBeenCalled();
    render(<ColorPicker label="Disabled accent" defaultValue="#112233" disabled onValueChange={onValueChange} palette={['#000000','#FFFFFF']} />);
    expect(screen.getByRole('button',{name:'Disabled accent'})).toBeDisabled();
    expect(onValueChange).not.toHaveBeenCalled();
  });
  it('closes an open ColorPicker if disabled changes while it is open', () => {
    const { rerender }=render(<ColorPicker label="Tint" defaultSwatches={[{id:'saved',color:'#00FF00'}]}/>);
    fireEvent.click(screen.getByRole('button',{name:'Tint'}));
    expect(screen.getByRole('dialog',{name:'Tint: цвет'})).toBeInTheDocument();
    rerender(<ColorPicker label="Tint" defaultSwatches={[{id:'saved',color:'#00FF00'}]} disabled/>);
    expect(screen.getByRole('button',{name:'Tint'})).toBeDisabled();
    expect(screen.queryByRole('dialog',{name:'Tint: цвет'})).not.toBeInTheDocument();
  });
  it('announces ColorPicker errors while the popover is closed', () => {
    render(<ColorPicker label="Tint" description="Pick a valid color" error="Color is required"/>);
    const trigger=screen.getByRole('button',{name:'Tint'});
    expect(trigger).toHaveAttribute('aria-invalid','true');
    expect(trigger).toHaveAttribute('aria-describedby',expect.stringContaining('description'));
    expect(trigger).toHaveAttribute('aria-describedby',expect.stringContaining('error'));
    expect(screen.getByRole('alert')).toHaveTextContent('Color is required');
  });
  it('uses kit color and format controls without opening browser picker UI', () => {
    const { container } = render(<ColorPicker label="Accent" defaultValue="#112233" />);
    expect(container.querySelector('input[type="color"], select')).toBeNull();
    openColorPicker('Accent');
    const format = screen.getByRole('combobox',{name:'Формат цвета'});
    expect(format).toHaveTextContent('HEX');
    fireEvent.keyDown(format,{key:'ArrowDown'});
    fireEvent.keyDown(format,{key:'ArrowDown'});
    fireEvent.keyDown(format,{key:'Enter'});
    expect(format).toHaveTextContent('RGB');
    expect(screen.getByRole('textbox',{name:'Accent, формат RGB'})).toHaveValue('rgb(17, 34, 51)');
  });
  it('supports keyboard HSV and opacity changes and a controlled saved palette', () => {
    const onValueChange=vi.fn(), onSwatchesChange=vi.fn();
    render(<ColorPicker label="Tint" defaultValue="#FF0000" onValueChange={onValueChange} defaultSwatches={[{id:'saved',color:'#00FF00'}]} onSwatchesChange={onSwatchesChange} />);
    openColorPicker('Tint');
    const hue=screen.getByRole('slider',{name:'Оттенок'});
    fireEvent.keyDown(hue,{key:'ArrowRight'});
    expect(onValueChange).toHaveBeenCalledWith(expect.stringMatching(/^#[\da-f]{6}$/i));
    const alpha=screen.getByRole('slider',{name:'Непрозрачность'});
    fireEvent.keyDown(alpha,{key:'ArrowLeft'});
    expect(screen.getByRole('textbox',{name:'Tint, формат HEX'}).getAttribute('value') ?? (screen.getByRole('textbox',{name:'Tint, формат HEX'}) as HTMLInputElement).value).toMatch(/FC$/i);
    fireEvent.click(screen.getByRole('button',{name:'Применить цвет #00FF00'}));
    expect(onValueChange).toHaveBeenLastCalledWith('#00FF00');
    fireEvent.click(screen.getByRole('button',{name:/Сохранить/}));
    expect(onSwatchesChange).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({color:'#00FF00'})]));
  });
  it('shows a contrast readout when a background color is supplied', () => {
    render(<ColorPicker label="Text color" defaultValue="#777777" background="#FFFFFF" />);
    openColorPicker('Text color');
    expect(screen.getByText(/^Контраст \d+\.\d{2}:1$/)).toBeInTheDocument();
  });
  it('closes the color popover on Escape and restores trigger focus', () => {
    render(<ColorPicker label="Tint" />);
    const trigger=screen.getByRole('button',{name:'Tint'});
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('slider',{name:'Насыщенность и яркость'}),{key:'Escape'});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('chooses a contrasting check glyph for bright palette colors and a neutral selected ring', () => {
    const { container } = render(<ColorPicker label="Accent" defaultValue="#F5A623" palette={['#F5A623','#3E63DD']} />);
    openColorPicker('Accent');
    const yellow = screen.getByRole('radio',{name:'Цвет #F5A623'});
    expect(yellow).toHaveStyle({'--cap-swatch-ink':'#000000'});
    expect(yellow).toHaveAttribute('aria-checked','true');
    expect(document.querySelector('.cap-color-swatch[aria-checked="true"]')).toHaveClass('cap-color-swatch');
  });
  it('exposes ghost variants on the analogous field controls and omits disabled values from forms', () => {
    const { container } = render(<form>
      <ComboBox variant="ghost" label="Project" name="project" options={[{value:'a',label:'A'}]} defaultValue="a" disabled />
      <MultiSelect variant="ghost" label="Topics" name="topic" options={[{value:'a',label:'A'}]} defaultValue={['a']} disabled />
      <TagInput variant="ghost" label="Tags" name="tag" defaultValue={['a']} disabled />
      <RadioGroup variant="ghost" label="View" name="view" options={[{value:'grid',label:'Grid'}]} />
      <ColorPicker variant="ghost" label="Tint" name="tint" defaultValue="#112233" disabled />
      <NumberField variant="ghost" label="Zoom" name="zoom" defaultValue={100} />
    </form>);
    expect(container.querySelectorAll('[data-variant="ghost"]')).toHaveLength(6);
    expect(container.querySelector('select[name="project"]')).toBeDisabled();
    expect(container.querySelector('input[name="topic"]')).toBeDisabled();
    expect(container.querySelector('input[name="tag"]')).toBeDisabled();
    expect(container.querySelector('input[name="tint"]')).toBeDisabled();
    expect(screen.getByRole('radio',{name:'Grid'})).toBeEnabled();
  });
  it('keeps chips present across focus/hover and leaves the search input frameless', () => {
    const { container } = render(<MultiSelect label="Topics" defaultValue={['a']} options={[{value:'a',label:'Alpha'}]} />);
    const box = container.querySelector('.cap-multiselect-box') as HTMLElement;
    const input = screen.getByRole('combobox', {name:'Topics: поиск'});
    fireEvent.mouseOver(box); fireEvent.focus(input);
    expect(container.querySelector('.cap-selection-chip-wrap')).toHaveTextContent('Alpha');
    expect(input).not.toHaveClass('cap-input');
    expect(input).toHaveClass('cap-multiselect-search');
  });
});
