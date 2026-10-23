import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button, Icon, IconButton, Tooltip, Dialog, Tag, NumberField, ComboBox } from '../src';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('automatic icon action tooltips', () => {
  it('waits 350ms, keeps the native button/ref/layout, preserves handlers and updates its action name', () => {
    vi.useFakeTimers();
    const ref = createRef<HTMLButtonElement>(), click = vi.fn(), enter = vi.fn();
    const { container, rerender } = render(<div className="actions"><IconButton ref={ref} label="Copy" icon="copy" title="Duplicate native hint" onClick={click} onPointerEnter={enter} aria-describedby="help"/><span id="help">Existing help</span></div>);
    const button = screen.getByRole('button', { name: 'Copy' });
    expect(ref.current).toBe(button); expect(container.querySelector('.actions')?.firstElementChild).toBe(button);
    expect(button).not.toHaveAttribute('title');
    fireEvent.pointerEnter(button); expect(enter).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(349)); expect(screen.queryByRole('tooltip')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    const tip = screen.getByRole('tooltip'); expect(tip).toHaveTextContent('Copy'); expect(tip).toHaveAttribute('data-compact', 'true');
    expect(button.getAttribute('aria-describedby')?.split(' ')).toEqual(['help', tip.id]);
    rerender(<div className="actions"><IconButton ref={ref} label="Copied" icon="check" aria-describedby="help" onClick={click}/><span id="help">Existing help</span></div>);
    expect(tip).toHaveTextContent('Copied'); expect(ref.current).toBe(button);
    fireEvent.click(button); expect(click).toHaveBeenCalledTimes(1);
    fireEvent.pointerDown(button); expect(screen.queryByRole('tooltip')).toBeNull(); expect(button).toHaveAttribute('aria-describedby', 'help');
  });

  it('shows on focus, closes with Escape, and suppresses automatic hints inside explicit rich Tooltip', () => {
    const { rerender } = render(<IconButton label="Settings" icon="settings"/>);
    act(() => screen.getByRole('button').focus()); expect(screen.getByRole('tooltip')).toHaveTextContent('Settings');
    fireEvent.keyDown(document, { key: 'Escape' }); expect(screen.queryByRole('tooltip')).toBeNull();
    rerender(<><p id="other-help">Original description</p><Tooltip content="Settings action" description="Choose the workspace settings."><IconButton label="Settings" icon="settings" aria-describedby="other-help"/></Tooltip></>);
    const button = screen.getByRole('button'); act(() => button.focus());
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('tooltip')).not.toHaveAttribute('data-compact');
    expect(button).toHaveAccessibleDescription('Original description Settings action Choose the workspace settings.');
  });

  it('supports disabled hover without activation, and skips named text buttons', () => {
    vi.useFakeTimers(); const click = vi.fn();
    render(<><Button disabled aria-label="Delete" onClick={click}><Icon name="trash"/></Button><Button aria-label="Save project" title="Save the current project">Save</Button></>);
    const disabled = screen.getByRole('button', { name: 'Delete' });
    fireEvent.pointerEnter(disabled); act(() => vi.advanceTimersByTime(350));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Delete'); expect(disabled).toBeDisabled();
    fireEvent.click(disabled); expect(click).not.toHaveBeenCalled();
    fireEvent.pointerLeave(disabled); act(() => vi.advanceTimersByTime(100));
    fireEvent.focus(screen.getByRole('button', { name: 'Save project' })); expect(screen.queryByRole('tooltip')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save project' })).toHaveAttribute('title', 'Save the current project');
  });

  it('does not reopen on pointer focus and retains the forwarded ref across state updates', () => {
    const ref = vi.fn(); render(<IconButton ref={ref} label="Settings" icon="settings"/>);
    const button = screen.getByRole('button'), matches = button.matches.bind(button);
    const match = vi.spyOn(button, 'matches').mockImplementation(selector => selector === ':focus-visible' ? false : matches(selector));
    fireEvent.pointerDown(button); act(() => button.focus()); expect(screen.queryByRole('tooltip')).toBeNull();
    act(() => button.blur()); match.mockRestore(); act(() => button.focus());
    expect(screen.getByRole('tooltip')).toHaveTextContent('Settings'); expect(ref).toHaveBeenCalledTimes(1); expect(ref).toHaveBeenLastCalledWith(button);
    fireEvent.keyDown(document, { key: 'Escape' }); expect(screen.queryByRole('tooltip')).toBeNull(); expect(document.activeElement).toBe(button);
  });

  it('preserves labelledby precedence, local portal axes, modal ownership and reduced motion removal', () => {
    vi.useFakeTimers(); vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    const { container } = render(<div data-theme="dark" data-radius="compact" data-accent="rose"><Dialog open onOpenChange={() => {}} title="Inspector"><span id="action-name">Reset value</span><Button aria-labelledby="action-name" aria-label="Fallback"><Icon name="close"/></Button></Dialog></div>);
    const button = screen.getByRole('button', { name: 'Reset value' }); act(() => button.focus());
    const tip = screen.getByRole('tooltip'); expect(tip).toHaveTextContent('Reset value');
    expect(tip).toHaveAttribute('data-theme', 'dark'); expect(tip).toHaveAttribute('data-accent', 'rose'); expect(tip).toHaveAttribute('data-radius', 'compact');
    expect(tip.closest('.cap-modal-layer')).toBe(button.closest('.cap-modal-layer')); expect(container.contains(tip)).toBe(false);
    fireEvent.keyDown(document, { key: 'Escape' }); act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole('tooltip', { hidden: true })).toBeNull();
  });

  it('covers native tag remove, numeric steps and field clear without changing their behavior', () => {
    const remove = vi.fn(), change = vi.fn();
    render(<><Tag onRemove={remove}>Project</Tag><NumberField label="Width" defaultValue={4} onValueChange={change}/><ComboBox label="Project" clearable defaultValue="one" options={[{ value:'one', label:'One' }]}/></>);
    const removeButton = screen.getByRole('button', { name: /Remove tag|Удалить тег/ }); act(() => removeButton.focus());
    expect(screen.getByRole('tooltip')).toHaveTextContent(removeButton.getAttribute('aria-label')!); fireEvent.click(removeButton); expect(remove).toHaveBeenCalledTimes(1);
    fireEvent.blur(removeButton);
    const increase = screen.getByRole('button', { name: /Increase: Width|Увеличить: Width/ }); act(() => increase.focus()); expect(screen.getByRole('tooltip')).toHaveTextContent(increase.getAttribute('aria-label')!);
    fireEvent.click(increase); expect(change).toHaveBeenLastCalledWith(5); fireEvent.blur(increase);
    const clear = screen.getByRole('button', { name: /Clear Project|Очистить Project/ }); act(() => clear.focus()); expect(screen.getByRole('tooltip')).toHaveTextContent(clear.getAttribute('aria-label')!);
  });
});
