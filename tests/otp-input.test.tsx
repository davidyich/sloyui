import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { OTPInput } from '../src/components/otp-input';
afterEach(cleanup);
function Form({ onSubmit = () => {}, readOnly = false, disabled = false }: { onSubmit?: (code: FormDataEntryValue | null) => void; readOnly?: boolean; disabled?: boolean }) {
 const [value,setValue]=useState('');
 return <form onSubmit={event=>{event.preventDefault();onSubmit(new FormData(event.currentTarget).get('code'));}}><OTPInput name="code" label="Verification code" value={value} onValueChange={setValue} readOnly={readOnly} disabled={disabled} required/><button type="submit">Verify</button><button type="button" onClick={()=>setValue('')}>Clear</button></form>;
}
describe('OTPInput native input contract',()=>{
 it('uses one labeled native input, six decorative slots, a native ref and shared descriptions',()=>{
  const ref=createRef<HTMLInputElement>();const {container}=render(<><span id="additional">Additional</span><OTPInput ref={ref} id="otp" label="Code" hint="From your app" value="012345" onValueChange={()=>{}} aria-describedby="additional"/></>);
  expect(container.querySelectorAll('input')).toHaveLength(1);expect(container.querySelectorAll('.cap-otp-slot')).toHaveLength(6);
  const input=screen.getByRole('textbox',{name:'Code'});expect(ref.current).toBe(input);expect(input).toHaveValue('012345');expect(input).toHaveAttribute('type','text');expect(input).toHaveAttribute('inputmode','numeric');expect(input).toHaveAttribute('autocomplete','one-time-code');expect(input).toHaveAccessibleDescription('Additional From your app');expect(container.querySelector('.cap-otp-slots')).toHaveAttribute('aria-hidden','true');
 });
 it('keeps leading zeroes through formatted paste, replacement and native Enter submission',async()=>{
  const user=userEvent.setup(),submit=vi.fn();render(<Form onSubmit={submit}/>);
  const input=screen.getByRole('textbox') as HTMLInputElement;await user.click(input);await user.paste('012 345');expect(input).toHaveValue('012345');expect(submit).not.toHaveBeenCalled();
  input.setSelectionRange(2,4);fireEvent.select(input);await user.keyboard('9');expect(input).toHaveValue('01945');await user.keyboard('6');expect(input).toHaveValue('019645');
  await user.keyboard('{Enter}');expect(submit).toHaveBeenCalledWith('019645');await user.click(screen.getByRole('button',{name:'Clear'}));expect(input).toHaveValue('');
 });
 it('normalizes full autofill input, limits digits and retains the edited selection after filtering',()=>{
  const {container}=render(<Form/>);const input=screen.getByRole('textbox') as HTMLInputElement;fireEvent.focus(input);
  fireEvent.change(input,{target:{value:'001234567'}});expect(input).toHaveValue('001234');
  input.setSelectionRange(2,2);fireEvent.change(input,{target:{value:'00x1234',selectionStart:3,selectionEnd:3}});expect(input).toHaveValue('001234');expect(input.selectionStart).toBe(2);expect(container.querySelector('.cap-otp-caret')).toHaveAttribute('data-position','before');
 });
 it('associates errors and excludes disabled codes from forms while readOnly stays focusable',async()=>{
  const user=userEvent.setup(),change=vi.fn();const {rerender,container}=render(<form><OTPInput label="Code" name="code" value="012345" onValueChange={change} error="Invalid code" readOnly/></form>);
  let input=screen.getByRole('textbox');expect(input).toHaveAccessibleDescription('Invalid code');expect(input).toHaveAttribute('aria-invalid','true');expect(screen.getByRole('alert')).toHaveTextContent('Invalid code');await user.click(input);await user.keyboard('9');expect(change).not.toHaveBeenCalled();expect(input).toHaveFocus();expect(new FormData(container.querySelector('form')!).get('code')).toBe('012345');
  rerender(<form><OTPInput label="Code" name="code" value="012345" onValueChange={change} disabled/></form>);input=screen.getByRole('textbox');expect(input).toBeDisabled();expect(new FormData(container.querySelector('form')!).has('code')).toBe(false);
 });
 it('validates exact length natively and preserves forwarded keyboard/select handlers',async()=>{
  const user=userEvent.setup(),keydown=vi.fn(),select=vi.fn();const {rerender}=render(<OTPInput label="Code" length={4} value="012" onValueChange={()=>{}} required onKeyDown={keydown} onSelect={select}/>);
  const input=screen.getByRole('textbox') as HTMLInputElement;expect(input.checkValidity()).toBe(false);input.focus();await user.keyboard('{ArrowLeft}');expect(keydown).toHaveBeenCalled();expect(select).toHaveBeenCalled();
  rerender(<OTPInput label="Code" length={4} value="0123" onValueChange={()=>{}} required/>);expect(input.checkValidity()).toBe(true);
 });
});
