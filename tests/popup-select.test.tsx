import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { PopupSelect } from '../src/components/popup-select';
import { Dialog } from '../src/components/overlays';
import { PlaygroundFrame } from '../demo/PlaygroundFrame';
import { FocusColorControl } from '../demo/focus-controls';

const options = [
  { value: 'alpha', label: 'Alpha', aliases: ['first'] },
  { value: 'beta', label: 'Beta', disabled: true },
  { value: 'gamma', label: 'Gamma', description: 'Last entry' },
];
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('searches aliases and descriptions, skips disabled options and restores focus after choosing', async () => {
  const user = userEvent.setup(), onValueChange = vi.fn();
  render(<PopupSelect searchable label="Choice" options={options} defaultValue="alpha" onValueChange={onValueChange}/>);
  const trigger = screen.getByRole('button', { name: 'Choice' });
  await user.click(trigger);
  const search = screen.getByRole('combobox', { name: 'Choice: поиск' });
  expect(search).toHaveFocus();
  expect(search).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Alpha' }).id);
  await user.keyboard('{ArrowDown}');
  expect(search).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: /Gamma/ }).id);
  await user.type(search, 'first');
  expect(screen.getAllByRole('option')).toHaveLength(1);
  await user.clear(search); await user.type(search, 'last');
  expect(screen.getAllByRole('option')).toHaveLength(1);
  await user.keyboard('{Enter}');
  expect(onValueChange).toHaveBeenCalledExactlyOnceWith('gamma');
  expect(trigger).toHaveTextContent('Gamma'); expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

it('clears empty searches on Escape/reopen and lets Tab leave the control', async () => {
  const user = userEvent.setup();
  render(<><PopupSelect searchable label="Choice" options={options} defaultValue="gamma"/><button>Next</button></>);
  const trigger = screen.getByRole('button', { name: 'Choice' });
  await user.click(trigger); await user.type(screen.getByRole('combobox'), 'missing');
  expect(screen.getByRole('status')).toHaveTextContent('Ничего не найдено');
  expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-activedescendant');
  await user.keyboard('{Escape}'); expect(trigger).toHaveFocus();
  await user.keyboard('{ArrowDown}');
  const search = screen.getByRole('combobox');
  expect(search).toHaveValue('');
  expect(search).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: /Gamma/ }).id);
  await user.tab(); expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

it('preserves controlled values and resets uncontrolled native form data without firing a choice callback', async () => {
  const user = userEvent.setup(), change = vi.fn();
  const { container } = render(<form><PopupSelect searchable label="Choice" options={options} name="choice" defaultValue="alpha" onValueChange={change}/><PopupSelect label="Fixed" options={options} name="fixed" value="gamma"/></form>);
  const form = container.querySelector('form')!;
  await user.click(screen.getByRole('button', { name: 'Choice' })); await user.click(screen.getByRole('option', { name: /Gamma/ }));
  expect(new FormData(form).get('choice')).toBe('gamma');
  act(() => form.reset());
  await waitFor(() => expect(new FormData(form).get('choice')).toBe('alpha'));
  expect(new FormData(form).get('fixed')).toBe('gamma');
  expect(screen.getByRole('button', { name: 'Choice' })).toHaveTextContent('Alpha');
  expect(change).toHaveBeenCalledOnce();
});

it('routes required validation to the visible trigger and stays closed after disabling and re-enabling', async () => {
  const user = userEvent.setup();
  const props = { label: 'Choice', options, name: 'choice', required: true };
  const { container, rerender } = render(<form><PopupSelect {...props}/></form>);
  expect(container.querySelector('form')!.checkValidity()).toBe(false);
  expect(screen.getByRole('button', { name: 'Choice' })).toHaveFocus();
  await user.click(screen.getByRole('button', { name: 'Choice' }));
  rerender(<form><PopupSelect {...props} disabled/></form>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  rerender(<form><PopupSelect {...props}/></form>);
  expect(screen.getByRole('button', { name: 'Choice' })).toHaveAttribute('aria-expanded', 'false');
});

it('inherits local context into its Floating portal and follows changes while open', async () => {
  const props = { label: 'Choice', options, defaultOpen: true };
  const { rerender } = render(<div data-theme="dark" data-accent="green" data-surface="canvas" data-surface-scheme="inverted" data-radius="rounded" data-density="compact" data-borders="off"><PopupSelect {...props}/></div>);
  const panel = screen.getByRole('dialog');
  expect(panel).toHaveAttribute('data-surface', 'floating');
  for (const [key,value] of Object.entries({theme:'dark',accent:'green','surface-scheme':'inverted',radius:'rounded',density:'compact',borders:'off'})) expect(panel).toHaveAttribute(`data-${key}`,value);
  rerender(<div data-theme="light" data-radius="none" data-density="default"><PopupSelect {...props}/></div>);
  await waitFor(() => expect(panel).toHaveAttribute('data-radius', 'none'));
  expect(panel).toHaveAttribute('data-density', 'default'); expect(panel).toHaveAttribute('data-theme', 'light');
});

it('keeps a popup inside its parent dialog and closes only the top layer on Escape', async () => {
  const user=userEvent.setup(),close=vi.fn();
  render(<Dialog open onOpenChange={close} title="Parent"><PopupSelect searchable label="Choice" options={options}/></Dialog>);
  const trigger=screen.getByRole('button',{name:'Choice'});
  await user.click(trigger);
  const search=screen.getByRole('combobox'); expect(search).toHaveFocus();
  expect(search.closest('.cap-modal-layer')).toContainElement(screen.getByRole('dialog',{name:'Parent'}));
  await user.keyboard('{Escape}'); expect(trigger).toHaveFocus(); expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole('dialog',{name:'Parent'})).toBeInTheDocument();
});

it('does not scroll on pointer movement and ignores touch movement', async () => {
  vi.stubGlobal('matchMedia', () => ({matches:true,addEventListener(){},removeEventListener(){}}));
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
    if(this.classList.contains('cap-popup-select-option')) { const top=this.textContent?.startsWith('Gamma')?100:0; return new DOMRect(0,top,200,32); }
    return new DOMRect(0,0,200,64);
  });
    render(<PopupSelect searchable label="Choice" options={options} defaultOpen defaultValue="alpha"/>);
    await act(async()=>{});
    const list=screen.getByRole('listbox'); expect(list.scrollTop).toBe(0);
    const highlight=list.querySelector<HTMLElement>('.cap-moving-highlight')!;
    expect(highlight).toHaveAttribute('data-visible','true');
    fireEvent.pointerMove(screen.getByRole('option', { name: /Gamma/ }));
    expect(screen.getByRole('option', { name: /Gamma/ })).toHaveAttribute('data-active', 'true');
    expect(list.scrollTop).toBe(0);
    expect(highlight.style.transform).toBe('translate3d(0px,100px,0)');
    const event = new Event('pointermove', {bubbles:true}); Object.defineProperty(event,'pointerType',{value:'touch'});
    fireEvent(screen.getByRole('option', { name: 'Alpha' }),event);
    expect(screen.getByRole('option', { name: /Gamma/ })).toHaveAttribute('data-active', 'true');
    fireEvent.keyDown(screen.getByRole('combobox'),{key:'End'}); expect(list.scrollTop).toBeGreaterThan(0);
});

it('keeps the focus-token trigger text-free while searching CSS aliases', async () => {
  const user = userEvent.setup(), change = vi.fn();
  render(<FocusColorControl label="Token" value="--cap-focus-ring" onValueChange={change}/>);
  const trigger = screen.getByRole('button', {name:'Token'});
  expect(trigger.textContent).toBe(''); expect(trigger.querySelector('.playground-focus-dot')).not.toBeNull();
  await user.click(trigger); await user.type(screen.getByRole('combobox'),'--cap-status-warning-border');
  expect(screen.getByRole('option', {name:'border/orange-normal'})).toBeInTheDocument();
  expect(change).not.toHaveBeenCalled();
  await user.keyboard('{Enter}'); expect(change).toHaveBeenCalledExactlyOnceWith('--cap-v4-theme-border-orange-normal');
});

it('keeps edited fields when resizing settings with the keyboard', async () => {
  const user = userEvent.setup();
  render(<PlaygroundFrame name="Example"><div>Preview</div><input aria-label="Parameter" defaultValue="original"/></PlaygroundFrame>);
  const input = screen.getByRole('textbox', {name:'Parameter'}),handle=screen.getByRole('separator',{name:'Изменить ширину параметров'});
  await user.clear(input); await user.type(input,'edited');
  const before = Number(handle.getAttribute('aria-valuenow'));
  fireEvent.keyDown(handle,{key:'ArrowLeft',shiftKey:true});
  expect(Number(handle.getAttribute('aria-valuenow'))).toBeLessThan(before);
  expect(input).toHaveValue('edited');
});


it('opens without search by default and supports typeahead, disabled skipping and form selection', async () => {
  const user = userEvent.setup(), change = vi.fn();
  render(<><PopupSelect label="Plain choice" options={options} defaultValue="alpha" onValueChange={change}/><button>After choice</button></>);
  const trigger = screen.getByRole('button', {name:'Plain choice'});
  await user.click(trigger);
  const list = screen.getByRole('listbox', {name:'Plain choice'});
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(list).toHaveFocus();
  await user.keyboard('{ArrowDown}');
  expect(list).toHaveAttribute('aria-activedescendant', screen.getByRole('option', {name:/Gamma/}).id);
  await user.keyboard('{Home}g{Enter}');
  expect(change).toHaveBeenCalledExactlyOnceWith('gamma');
  expect(trigger).toHaveFocus();
  await user.keyboard('{ArrowDown}{Escape}');
  expect(trigger).toHaveFocus();
  await user.keyboard('{ArrowDown}'); await user.tab();
  expect(screen.getByRole('button', {name:'After choice'})).toHaveFocus();
});

it('supports inline and separate search explicitly while leaving ordinary choices unfiltered', async () => {
  const user = userEvent.setup();
  const {rerender} = render(<PopupSelect searchable searchPlacement="separate" label="Search choice" options={options} defaultOpen/>);
  const dialog = screen.getByRole('dialog', {name:'Search choice'});
  expect(dialog).toHaveAttribute('data-search-placement', 'separate');
  expect(screen.getByRole('combobox')).toHaveAttribute('data-variant', 'surface');
  await user.type(screen.getByRole('combobox'), 'last');
  expect(screen.getAllByRole('option')).toHaveLength(1);
  rerender(<PopupSelect searchable searchPlacement="inline" label="Search choice" options={options} defaultOpen/>);
  expect(dialog).toHaveAttribute('data-search-placement', 'inline');
  expect(screen.getByRole('combobox')).toHaveAttribute('data-variant', 'ghost');
  rerender(<PopupSelect label="Search choice" options={options} defaultOpen/>);
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.getAllByRole('option')).toHaveLength(3);
  expect(screen.getByRole('listbox')).toHaveFocus();
});
