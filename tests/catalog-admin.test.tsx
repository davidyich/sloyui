import {act,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {useAdminHold} from '../demo/use-admin-hold';
import {Menu,Tag} from '../src';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function Logo({held,clicked}:{held:()=>void;clicked:()=>void}){return <button {...useAdminHold(held,clicked)}>Logo</button>;}
describe('admin logo hold',()=>{
 it('requires one uninterrupted five-second press',()=>{
  vi.useFakeTimers();vi.stubGlobal('PointerEvent',MouseEvent);const held=vi.fn(),clicked=vi.fn();render(<Logo held={held} clicked={clicked}/>);const logo=screen.getByRole('button');
  fireEvent.pointerDown(logo,{button:0});act(()=>vi.advanceTimersByTime(4999));expect(held).not.toHaveBeenCalled();
  fireEvent.pointerUp(logo);fireEvent.click(logo);expect(clicked).toHaveBeenCalledOnce();
  fireEvent.pointerDown(logo,{button:0});act(()=>vi.advanceTimersByTime(5000));expect(held).toHaveBeenCalledOnce();
  fireEvent.pointerUp(logo);fireEvent.click(logo);expect(clicked).toHaveBeenCalledOnce();
 });
 it('cancels when the pointer leaves, the window loses focus or the component unmounts',()=>{
  vi.useFakeTimers();vi.stubGlobal('PointerEvent',MouseEvent);const held=vi.fn();const view=render(<Logo held={held} clicked={()=>{}}/>);const logo=screen.getByRole('button');
  fireEvent.pointerDown(logo,{button:0});act(()=>vi.advanceTimersByTime(3000));fireEvent.pointerLeave(logo);act(()=>vi.advanceTimersByTime(5000));
  fireEvent.pointerDown(logo,{button:0});fireEvent(window,new Event('blur'));act(()=>vi.advanceTimersByTime(5000));
  fireEvent.pointerDown(logo,{button:0});view.unmount();act(()=>vi.advanceTimersByTime(5000));expect(held).not.toHaveBeenCalled();
 });
 it('supports holding Space without restarting on keyboard repeat',()=>{
  vi.useFakeTimers();vi.stubGlobal('PointerEvent',MouseEvent);const held=vi.fn(),clicked=vi.fn();render(<Logo held={held} clicked={clicked}/>);const logo=screen.getByRole('button');
  fireEvent.keyDown(logo,{key:' '});act(()=>vi.advanceTimersByTime(3000));fireEvent.keyDown(logo,{key:' ',repeat:true});act(()=>vi.advanceTimersByTime(2000));fireEvent.keyUp(logo,{key:' '});expect(held).toHaveBeenCalledOnce();expect(clicked).not.toHaveBeenCalled();
 });
});
it('opens a status tag menu with keyboard and restores focus on selection',async()=>{
 const selected=vi.fn();render(<Menu label="Component status" triggerContent={<Tag interactive={false}>Review</Tag>} items={[{id:'ready',label:'Ready',onSelect:selected}]}/>);
 const trigger=screen.getByRole('button',{name:'Component status'});fireEvent.keyDown(trigger,{key:'ArrowDown'});
 const option=await screen.findByRole('menuitem',{name:'Ready'});fireEvent.click(option);expect(selected).toHaveBeenCalledOnce();expect(trigger).toHaveFocus();expect(trigger).toHaveAttribute('aria-expanded','false');expect(trigger.querySelector('button')).toBeNull();
});
