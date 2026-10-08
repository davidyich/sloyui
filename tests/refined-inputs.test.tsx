import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ChangeEvent } from 'react';
import { Checkbox, Input, Radio, Select, Slider, Switch, Textarea } from '../src/components/forms';
import { ComboBox, ColorPicker, MultiSelect, NumberField, TagInput } from '../src/components/selection';
import { FloatingField } from '../src/components/workbench';
afterEach(cleanup);
describe('Refined native choice controls',()=>{
 it('retains keyboard selection, mixed state and disabled behavior across sizes',async()=>{
  const change=vi.fn();render(<><Checkbox label="All" size="lg" indeterminate/><Checkbox label="Locked" size="xs" disabled onChange={change}/><Radio label="One" name="choice" size="sm" defaultChecked/><Radio label="Two" name="choice" size="md"/></>);
  const all=screen.getByRole('checkbox',{name:'All'}) as HTMLInputElement;expect(all.indeterminate).toBe(true);all.focus();await userEvent.keyboard(' ');expect(all).toBeChecked();
  await userEvent.click(screen.getByRole('checkbox',{name:'Locked'}));expect(change).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('radio',{name:'Two'}));expect(screen.getByRole('radio',{name:'Two'})).toBeChecked();expect(screen.getByRole('radio',{name:'One'})).not.toBeChecked();
 });
 it('keeps range progress, output and form reset in sync for nonzero bounds',async()=>{
  const change=vi.fn();const {container}=render(<form><Slider label="Density" name="density" size="sm" min={20} max={60} defaultValue={30} onChange={change}/></form>);
  const input=screen.getByRole('slider');expect(input.style.getPropertyValue('--cap-slider-progress')).toBe('25%');
  fireEvent.change(input,{target:{value:'50'}});expect(change).toHaveBeenCalledOnce();expect(input.style.getPropertyValue('--cap-slider-progress')).toBe('75%');expect(container.querySelector('output')).toHaveTextContent('50');
  (container.querySelector('form') as HTMLFormElement).reset();await waitFor(()=>expect(input.style.getPropertyValue('--cap-slider-progress')).toBe('25%'));
  expect(new FormData(container.querySelector('form')!).get('density')).toBe('30');
 });
 it('follows controlled changes and normalizes initial values to the native range',()=>{
  const {rerender,container}=render(<Slider label="Scale" min={0} max={10} value={2} onChange={()=>{}}/>);
  rerender(<Slider label="Scale" min={0} max={10} value={8} onChange={()=>{}}/>);expect(screen.getByRole('slider').style.getPropertyValue('--cap-slider-progress')).toBe('80%');expect(container.querySelector('output')).toHaveTextContent('8');
  rerender(<Slider key="uncontrolled" label="Scale" max={1}/>);expect(container.querySelector('output')).toHaveTextContent('1');
 });
});

describe('Field clear and focus-ring contracts',()=>{
 it.each(['number','checkbox','radio','switch','slider'] as const)('shares direct runtime contexts with the %s shell and retains native actions',kind=>{
  const changed=vi.fn(),focused=vi.fn();
  const axes={'data-theme':'dark','data-accent':'purple','data-color':'purple','data-surface':'canvas','data-borders':'on','data-radius':'rounded','data-shadow':'compact'} as const;
  const common={...axes,'aria-describedby':'extra',onFocus:focused};
  const element=kind==='number'?<NumberField {...common} label="Local" defaultValue={1} onValueChange={changed}/> : kind==='checkbox'?<Checkbox {...common} label="Local" onChange={changed}/> : kind==='radio'?<Radio {...common} label="Local" name="choice" onChange={changed}/> : kind==='switch'?<Switch {...common} label="Local" onChange={changed}/> : <Slider {...common} label="Local" defaultValue={1} onChange={changed}/>;
  render(<div data-theme="light" data-accent="green" data-color="green" data-surface="base" data-borders="off" data-radius="compact" data-shadow="soft"><span id="extra">Description</span>{element}</div>);
  const role=kind==='number'?'spinbutton':kind==='slider'?'slider':kind==='radio'?'radio':kind==='switch'?'switch':'checkbox';
  const native=screen.getByRole(role,{name:'Local'}),shell=native.closest(kind==='number'?'.cap-selection-field':kind==='slider'?'.cap-slider-field':'label')!;
  for(const [axis,value] of Object.entries(axes)){expect(shell).toHaveAttribute(axis,value);expect(native).toHaveAttribute(axis,value);}
  expect(native).toHaveAttribute('aria-describedby','extra');expect(shell).not.toHaveAttribute('aria-describedby');expect(shell).not.toHaveAttribute('id');
  fireEvent.focus(native);expect(focused).toHaveBeenCalledOnce();
  if(kind==='number'||kind==='slider')fireEvent.change(native,{target:{value:'7'}});else fireEvent.click(native);
  expect(changed).toHaveBeenCalledOnce();
  if(kind==='number')expect(changed).toHaveBeenLastCalledWith(7);else if(kind!=='slider')expect(native).toBeChecked();
 });
 it('preserves explicit Switch color and neutral variant over native context attributes',()=>{
  const {rerender}=render(<Switch label="Local" color="green" data-accent="purple" data-color="orange" variant="neutral"/>);
  const native=screen.getByRole('switch',{name:'Local'}),shell=native.closest('label')!;
  expect(shell).toHaveAttribute('data-color','green');expect(shell).not.toHaveAttribute('data-accent');expect(shell).toHaveAttribute('data-variant','neutral');
  expect(native).toHaveAttribute('data-accent','purple');expect(native).toHaveAttribute('data-color','orange');
  rerender(<Switch label="Local" data-accent="purple" data-color="purple"/>);
  expect(shell).toHaveAttribute('data-accent','purple');expect(shell).toHaveAttribute('data-color','purple');expect(shell).toHaveAttribute('data-variant','accent');
 });
 it.each(['input','textarea','select','floating'] as const)('shares direct runtime contexts with the %s label wrapper without duplicating native wiring',kind=>{
  const changed=vi.fn(),ref=createRef<HTMLInputElement>();
  const axes={'data-theme':'dark','data-accent':'purple','data-color':'purple','data-surface':'canvas','data-borders':'on','data-radius':'rounded','data-shadow':'compact'} as const;
  const element=kind==='input'?<Input {...axes} ref={ref} id="local-field" label="Local" labelPlacement="inside" aria-describedby="extra" onChange={changed}/> : kind==='textarea'?<Textarea {...axes} id="local-field" label="Local" labelPlacement="inside" size="xs" aria-describedby="extra" onChange={changed}/> : kind==='select'?<Select {...axes} id="local-field" label="Local" labelPlacement="inside" aria-describedby="extra" onChange={changed} options={[{value:'a',label:'A'},{value:'b',label:'B'}]}/> : <FloatingField {...axes} ref={ref} id="local-field" label="Local" aria-describedby="extra" onChange={changed}/>;
  const {container}=render(<div data-theme="light" data-borders="off" data-radius="compact"><span id="extra">Description</span>{element}</div>);
  const field=screen.getByLabelText('Local'),wrapper=field.closest('.cap-labeled-field')!;
  const native=kind==='select'?wrapper.querySelector('select')!:field;
  for(const [axis,value] of Object.entries(axes)){expect(wrapper).toHaveAttribute(axis,value);expect(native).toHaveAttribute(axis,value);}
  expect(field).toHaveAttribute('aria-describedby','extra');
  expect(wrapper).not.toHaveAttribute('id'); expect(wrapper).not.toHaveAttribute('aria-describedby');
  expect(container.querySelectorAll('#local-field')).toHaveLength(1);
  expect(wrapper.querySelector('label')).toHaveAttribute('for','local-field');
  fireEvent.change(native,{target:{value:kind==='select'?'b':'updated'}});
  expect(changed).toHaveBeenCalledOnce();
  if(kind==='input'||kind==='floating')expect(ref.current).toBe(native);
 });
 it('keeps a Select context with no ControlField wrapper and forwards it to the floating panel',async()=>{
  const {container,rerender}=render(<Select aria-label="Local select" data-theme="dark" data-borders="on" data-radius="rounded" options={[{value:'a',label:'A'}]}/>);
  expect(container.querySelector('.cap-labeled-field')).toBeNull();
  const trigger=screen.getByRole('combobox',{name:'Local select'});
  expect(trigger.closest('[data-radius]')).toHaveAttribute('data-radius','rounded');
  fireEvent.click(trigger);
  const panel=screen.getByRole('listbox');
  expect(panel).toHaveAttribute('data-theme','dark');expect(panel).toHaveAttribute('data-borders','on');expect(panel).toHaveAttribute('data-radius','rounded');
  rerender(<Select aria-label="Local select" data-theme="light" data-borders="off" data-radius="compact" options={[{value:'a',label:'A'}]}/>);
  await waitFor(()=>{expect(panel).toHaveAttribute('data-theme','light');expect(panel).toHaveAttribute('data-borders','off');expect(panel).toHaveAttribute('data-radius','compact');});
 });
 it('clears uncontrolled search through input events, keeps its ref/form value and resets to its default',async()=>{
  const user=userEvent.setup(), ref=createRef<HTMLInputElement>(), seenValues:string[]=[], changed=vi.fn((event:ChangeEvent<HTMLInputElement>)=>seenValues.push(event.currentTarget.value));
  const {container}=render(<form><Input ref={ref} type="search" name="query" defaultValue="design systems" onChange={changed}/></form>);
  const input=screen.getByRole('searchbox');
  expect(ref.current).toBe(input); expect(new FormData(container.querySelector('form')!).get('query')).toBe('design systems');
  await user.click(screen.getByRole('button',{name:'Очистить поиск'}));
  await waitFor(()=>expect(input).toHaveValue(''));
  expect(changed).toHaveBeenCalledTimes(1); expect(seenValues).toEqual(['']);
  expect((input as HTMLInputElement).name).toBe('query'); expect((input as HTMLInputElement).value).toBe('');
  (container.querySelector('form') as HTMLFormElement).reset();
  await waitFor(()=>expect(input).toHaveValue('design systems'));
 });
 it('notifies controlled search clearing and keeps the controlled value authoritative',async()=>{
  const user=userEvent.setup(), seenValues:string[]=[], changed=vi.fn((event:ChangeEvent<HTMLInputElement>)=>seenValues.push(event.currentTarget.value));
  render(<Input type="search" aria-label="Query" value="draft" onChange={changed}/>);
  await user.click(screen.getByRole('button',{name:'Очистить поиск'}));
  expect(changed).toHaveBeenCalledTimes(1); expect(seenValues).toEqual(['']);
  expect(screen.getByRole('searchbox',{name:'Query'})).toHaveValue('draft');
 });
 it('applies configurable focus width and offset to native and composite fields',()=>{
  const {container}=render(<><Input label="Search" type="search" focusRing={{width:3,offset:0}}/><Textarea label="Notes" focusRing={{width:2,offset:4}}/><Select label="Status" focusRing={{width:2,offset:0}} options={[{value:'open',label:'Open'}]}/><ComboBox label="Project" focusRing={{width:2,offset:3}} options={[{value:'a',label:'A'}]}/><MultiSelect label="Topics" focusRing={{width:2,offset:3}} options={[]}/><TagInput label="Tags" focusRing={{width:2,offset:3}}/><NumberField label="Zoom" focusRing={{width:2,offset:3}}/><ColorPicker label="Tint" focusRing={{width:2,offset:3}}/></>);
  expect(screen.getByRole('searchbox').style.getPropertyValue('--cap-field-focus-width')).toBe('3px');
  expect(screen.getByLabelText('Notes').style.getPropertyValue('--cap-field-focus-offset')).toBe('4px');
  expect(screen.getByRole('combobox',{name:'Status'}).style.getPropertyValue('--cap-field-focus-offset')).toBe('0px');
  expect(container.querySelector('.cap-combobox-wrap')?.parentElement).toHaveStyle({'--cap-field-focus-width':'2px','--cap-field-focus-offset':'3px'});
  expect(container.querySelector('.cap-multiselect-box')?.parentElement).toHaveStyle({'--cap-field-focus-width':'2px','--cap-field-focus-offset':'3px'});
  expect(container.querySelector('.cap-tag-input-box')?.parentElement).toHaveStyle({'--cap-field-focus-width':'2px','--cap-field-focus-offset':'3px'});
  expect(container.querySelector('.cap-number-field')?.parentElement).toHaveStyle({'--cap-field-focus-width':'2px','--cap-field-focus-offset':'3px'});
  expect(container.querySelector('.cap-color-picker')).toHaveStyle({'--cap-field-focus-width':'2px','--cap-field-focus-offset':'3px'});
 });
 it('preserves Select focus after pointer selection and keyboard selection',async()=>{
  const user=userEvent.setup();
  render(<div data-borders="off"><Select label="View" defaultValue="grid" options={[{value:'grid',label:'Grid'},{value:'list',label:'List'}]}/></div>);
  const trigger=screen.getByRole('combobox',{name:'View'}) as HTMLButtonElement;
  await user.click(trigger);
  expect(trigger).toHaveAttribute('data-pointer-focus');
  await user.keyboard('{Escape}');
  expect(trigger).not.toHaveAttribute('data-pointer-focus');
  trigger.blur();
  await user.tab(); expect(trigger).toHaveFocus(); expect(trigger.matches(':focus-visible')).toBe(true);
  await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
  expect(trigger).toHaveFocus(); expect(trigger).toHaveTextContent('List'); expect(trigger.matches(':focus-visible')).toBe(true);
  trigger.blur();
  await user.click(trigger);
  const focusSpy=vi.spyOn(trigger,'focus');
  await user.click(screen.getByRole('option',{name:'Grid'}));
  expect(trigger).toHaveFocus(); expect(focusSpy).not.toHaveBeenCalled(); expect(trigger).toHaveTextContent('Grid');
 });
});
it('keeps an accent switch native, controlled and disabled through keyboard input',async()=>{
 const user=userEvent.setup(),change=vi.fn();const view=render(<Switch label="Notifications" color="purple" size="lg" checked onChange={change}/>);
 const control=screen.getByRole('switch',{name:'Notifications'});control.focus();await user.keyboard(' ');expect(change).toHaveBeenCalledTimes(1);expect(control).toBeChecked();
 view.rerender(<Switch label="Notifications" color="green" checked disabled onChange={change}/>);await user.click(control);expect(change).toHaveBeenCalledTimes(1);expect(control).toBeDisabled();
});
