import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from '../src/components/forms';
import { NumberField } from '../src/components/selection';
import { ValueScrubber } from '../src/components/value-scrubber';

describe('ValueScrubber', () => {
  const pointer = (target: Element, type: string, x: number, y = 0, options: Record<string, unknown> = {}) => {
    const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0, ...options });
    Object.defineProperty(event, 'pointerId', { value: 7 });
    target.dispatchEvent(event);
  };

  it('scrubs horizontal values in steps, keeps fractional precision and clamps bounds', () => {
    const change = vi.fn(), { container } = render(<ValueScrubber label="Zoom" value={2.5} min={1} max={3} step={.25} onValueChange={change}/>);
    const slider = screen.getByRole('slider', { name: 'Zoom' });
    pointer(slider, 'pointerdown', 20, 0, { altKey: true }); pointer(slider, 'pointermove', 52); pointer(slider, 'pointerup', 52);
    expect(change).toHaveBeenLastCalledWith(3);
    expect(container.innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('uses vertical direction and optional shift precision', () => {
    const change = vi.fn();
    const { rerender } = render(<ValueScrubber label="Vertical" value={.5} min={0} max={1} step={.1} orientation="vertical" onValueChange={change}/>);
    const slider = screen.getByRole('slider', { name: 'Vertical' });
    pointer(slider, 'pointerdown', 0, 100, { altKey: true }); pointer(slider, 'pointermove', 0, 84); pointer(slider, 'pointerup', 0, 84);
    expect(change).toHaveBeenLastCalledWith(.7);
    change.mockClear(); rerender(<ValueScrubber label="Fine" value={.5} min={0} max={1} step={.25} onValueChange={change}/>);
    const fine = screen.getByRole('slider', { name: 'Fine' });
    fireEvent.keyDown(fine, { key: 'ArrowRight', shiftKey: true });
    expect(change).toHaveBeenCalledWith(.525);
    change.mockClear();
    pointer(fine, 'pointerdown', 0, 0, { altKey: true }); pointer(fine, 'pointermove', 80, 0, { altKey: true, shiftKey: true }); pointer(fine, 'pointerup', 80);
    expect(change).toHaveBeenLastCalledWith(.75);
  });

  it('rolls back on pointer cancellation and prevents a drag from becoming a click', () => {
    const change = vi.fn(), { container } = render(<ValueScrubber label="Value" value={4} min={0} max={10} onValueChange={change}/>);
    const slider = screen.getByRole('slider', { name: 'Value' });
    pointer(slider, 'pointerdown', 0, 0, { altKey: true }); pointer(slider, 'pointermove', 24); pointer(slider, 'pointercancel', 24);
    expect(change.mock.calls.map(([value]) => value)).toEqual([7,4]);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true }); slider.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(container.querySelector('[aria-valuenow="4"]')).toBeInTheDocument();
  });

  it('supports arrows, Home/End, disabled state and does not activate on ordinary clicks', () => {
    const change = vi.fn(); render(<ValueScrubber label="Keyboard" value={5} min={1} max={8} step={.5} disabled={false} onValueChange={change}/>);
    const slider = screen.getByRole('slider', { name: 'Keyboard' });
    fireEvent.keyDown(slider, { key: 'ArrowUp' }); fireEvent.keyDown(slider, { key: 'End' });
    expect(change.mock.calls.map(([value]) => value)).toEqual([5.5,8]);
    fireEvent.click(slider); expect(change).toHaveBeenCalledTimes(2);
    const disabled = vi.fn(); render(<ValueScrubber label="Locked" value={2} disabled onValueChange={disabled}/>);
    expect(screen.getByRole('slider', { name: 'Locked' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('slider', { name: 'Locked' })).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Locked' }), { key: 'ArrowUp' });
    expect(disabled).not.toHaveBeenCalled();
  });

  it('updates the Alt-scrub cursor affordance on modifier keydown/up without pointer movement', () => {
    const { rerender } = render(<ValueScrubber label="Scrub" value={5} onValueChange={() => {}} />);
    const slider = screen.getByRole('slider', {name:'Scrub'});
    fireEvent.keyDown(window, {key:'Alt', altKey:true});
    expect(slider).toHaveAttribute('data-scrub-alt','true');
    fireEvent.keyUp(window, {key:'Alt', altKey:false});
    expect(slider).not.toHaveAttribute('data-scrub-alt');
    rerender(<ValueScrubber label="Locked scrub" value={5} disabled onValueChange={() => {}} />);
    fireEvent.keyDown(window, {key:'Alt', altKey:true});
    expect(screen.getByRole('slider', {name:'Locked scrub'})).not.toHaveAttribute('data-scrub-alt');
  });

  it('scrubs NumberField by default while leaving ordinary Select clicks intact', () => {
    const change = vi.fn();
    render(<><NumberField label="Number" value={2} min={0} max={5} onValueChange={change}/><Select label="Period" scrubbable value="day" options={[{value:'day',label:'Day'},{value:'week',label:'Week',disabled:true},{value:'month',label:'Month'},{value:'year',label:'Year'}]} onValueChange={change}/></>);
    const number = screen.getByRole('spinbutton', { name: 'Number' });
    pointer(number, 'pointerdown', 0, 0, { altKey: true }); pointer(number, 'pointermove', 16); pointer(number, 'pointerup', 16);
    expect(change).toHaveBeenLastCalledWith(4);
    const select = screen.getByRole('combobox', { name: 'Period' });
    pointer(select, 'pointerdown', 0, 100, { altKey: true }); pointer(select, 'pointermove', 0, 92); pointer(select, 'pointerup', 0, 92);
    fireEvent.click(select);
    expect(change).toHaveBeenLastCalledWith('month');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(select); expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(select, { key: 'ArrowUp', altKey: true });
    expect(change).toHaveBeenLastCalledWith('month');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('exposes immediate modifier cursor state to enabled integrations and hides it when locked', () => {
    const { rerender } = render(<><NumberField label="Number" value={2} onValueChange={() => {}} /><Select label="Period" scrubbable value="day" options={[{value:'day',label:'Day'},{value:'month',label:'Month'}]} /></>);
    const number = screen.getByRole('spinbutton', {name:'Number'}), select = screen.getByRole('combobox', {name:'Period'});
    fireEvent.keyDown(window, {key:'Alt', altKey:true});
    expect(number).toHaveAttribute('data-scrub-alt','true');
    expect(select).toHaveAttribute('data-scrub-alt','true');
    rerender(<><NumberField label="Number" value={2} readOnly onValueChange={() => {}} /><Select label="Period" scrubbable disabled value="day" options={[{value:'day',label:'Day'},{value:'month',label:'Month'}]} /></>);
    expect(screen.getByRole('spinbutton', {name:'Number'})).not.toHaveAttribute('data-scrub-alt');
    expect(screen.getByRole('combobox', {name:'Period'})).not.toHaveAttribute('data-scrub-alt');
  });
});
