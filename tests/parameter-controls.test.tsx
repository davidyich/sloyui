import { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ParameterSlider, Slider2D, Select } from '../src';

class TestPointerEvent extends MouseEvent { pointerId:number; constructor(type:string,init:PointerEventInit={}){super(type,init);this.pointerId=init.pointerId??1;} }
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('ParameterSlider',()=>{
  it('keeps native forms and optional visual values independent, with one accessible label',()=>{
    const {container,rerender}=render(<form><ParameterSlider label="Corner" name="corner" defaultValue={16} max={32} suffix="px" showHandle icon={<span>*</span>}/></form>);
    const slider=screen.getByRole('slider',{name:'Corner'});
    expect(container.querySelector('.cap-parameter-handle-layer')).toHaveAttribute('aria-hidden','true');
    expect(container.querySelector('.cap-parameter-slider')).toHaveAttribute('data-with-handle','true');
    expect(slider).toHaveValue('16');expect(slider).toHaveAttribute('aria-valuetext','16px');
    fireEvent.change(slider,{target:{value:'24'}});expect(new FormData(container.querySelector('form')!).get('corner')).toBe('24');
    act(()=>container.querySelector('form')!.reset());expect(slider).toHaveValue('16');
    rerender(<ParameterSlider label="Intensity" defaultValue={35} showValue={false}/>);
    expect(container.querySelector('.cap-parameter-handle')).toBeNull();
    expect(container.querySelector('output')).toBeNull();expect(screen.getByRole('slider',{name:'Intensity'})).toBeInTheDocument();
  });
  it('drags the moving boundary grip relatively without jumping, snaps to steps, and cancels or commits the gesture',()=>{
    vi.stubGlobal('PointerEvent',TestPointerEvent);
    const change=vi.fn(),commit=vi.fn();
    const {container}=render(<ParameterSlider label="Dark saturation" defaultValue={70} min={20} max={117} step={5} showHandle onValueChange={change} onValueCommit={commit}/>);
    const slider=screen.getByRole('slider',{name:'Dark saturation'});
    const slot=container.querySelector<HTMLElement>('.cap-parameter-handle-slot')!;
    const slotBounds=vi.spyOn(slot,'getBoundingClientRect').mockReturnValue({left:240,right:256,top:28,bottom:52,width:16,height:24,x:240,y:28,toJSON:()=>({})});
    const track=container.querySelector('.cap-parameter-handle-layer')!;
    expect(container.querySelector('.cap-parameter-track')).toBeNull();expect(container.querySelector('.cap-parameter-rail')).toBeNull();expect(track).toContainElement(slot);
    const trackBounds=vi.spyOn(track,'getBoundingClientRect').mockReturnValue({left:124,right:364,top:40,bottom:48,width:240,height:8,x:124,y:40,toJSON:()=>({})});
    const inputBounds=vi.spyOn(slider,'getBoundingClientRect').mockReturnValue({left:0,right:400,top:0,bottom:52,width:400,height:52,x:0,y:0,toJSON:()=>({})});
    expect(fireEvent.pointerDown(slider,{button:0,pointerId:2,clientX:248,clientY:40})).toBe(false);
    expect(slider).toHaveValue('70');expect(change).not.toHaveBeenCalled();
    slotBounds.mockClear();trackBounds.mockClear();inputBounds.mockClear();
    fireEvent.pointerMove(slider,{pointerId:2,clientX:272,clientY:40});
    expect(slider).toHaveValue('80');expect(change).toHaveBeenLastCalledWith(80);expect(commit).not.toHaveBeenCalled();
    expect(slotBounds).not.toHaveBeenCalled();expect(trackBounds).not.toHaveBeenCalled();expect(inputBounds).not.toHaveBeenCalled();
    fireEvent.keyDown(slider,{key:'Escape'});expect(slider).toHaveValue('70');expect(commit).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider,{pointerId:2,clientX:272,clientY:40});expect(commit).not.toHaveBeenCalled();
    fireEvent.pointerDown(slider,{button:0,pointerId:3,clientX:248,clientY:40});
    fireEvent.pointerMove(slider,{pointerId:3,clientX:1000,clientY:40});expect(slider).toHaveValue('115');
    fireEvent.pointerUp(slider,{pointerId:3,clientX:1000,clientY:40});expect(commit).toHaveBeenLastCalledWith(115);
    fireEvent.pointerDown(slider,{button:0,pointerId:4,clientX:248,clientY:40});
    fireEvent.pointerMove(slider,{pointerId:4,clientX:-500,clientY:40});expect(slider).toHaveValue('20');
    fireEvent.pointerCancel(slider,{pointerId:4});expect(slider).toHaveValue('115');expect(commit).toHaveBeenCalledTimes(1);
    // The text row retains the browser's normal range interaction.
    expect(fireEvent.pointerDown(slider,{button:0,pointerId:5,clientX:80,clientY:10})).toBe(true);
    fireEvent.change(slider,{target:{value:'45'}});fireEvent.pointerUp(slider,{pointerId:5,clientX:80,clientY:10});
    expect(slider).toHaveValue('45');expect(commit).toHaveBeenLastCalledWith(45);
  });
  it('keeps the boundary grip unmasked beneath text without measuring or repainting text as values change',()=>{
    const bounds=vi.spyOn(HTMLElement.prototype,'getBoundingClientRect');
    const {container,rerender}=render(<ParameterSlider label="Smoothing" value={25} showHandle/>);
    const layer=container.querySelector<HTMLElement>('.cap-parameter-handle-layer')!;
    expect(layer.style.clipPath).toBe('');
    for (const value of [10,50,90,100]) {
      rerender(<ParameterSlider label="Smoothing" value={value} showHandle/>);
      expect(layer).toContainElement(container.querySelector('.cap-parameter-handle'));
      expect(layer.style.clipPath).toBe('');
      expect(screen.getByRole('slider')).toHaveValue(String(value));
    }
    expect(bounds).not.toHaveBeenCalled();
    expect(container.querySelector('.cap-parameter-label-ink')).not.toHaveAttribute('style');
  });
  it('keeps compact row composition, endpoint states and full accessible long values with the optional grip',()=>{
    const {container,rerender}=render(<ParameterSlider label="A very long parameter label" value={0} showHandle formatValue={()=>'A long formatted value'} suffix=" units"/>);
    const row=container.querySelector('.cap-parameter-slider')!;
    expect(row).toHaveAttribute('data-handle-position','start');expect(container.querySelector('.cap-parameter-rail')).toBeNull();
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext','A long formatted value units');
    rerender(<ParameterSlider label="A very long parameter label" value={100} showHandle disabled/>);
    expect(row).toHaveAttribute('data-handle-position','end');expect(screen.getByRole('slider')).toBeDisabled();
    expect(container.querySelector('.cap-parameter-label-ink')).toHaveTextContent('A very long parameter label');
  });
  it('rolls back cancelled gestures and commits only final pointer/key values',()=>{
    vi.stubGlobal('PointerEvent',TestPointerEvent);const commit=vi.fn();
    render(<ParameterSlider label="Opacity" defaultValue={50} onValueCommit={commit}/>);const slider=screen.getByRole('slider',{name:'Opacity'});
    fireEvent.pointerDown(slider,{button:0});fireEvent.change(slider,{target:{value:'78'}});fireEvent.keyDown(slider,{key:'Escape'});
    expect(slider).toHaveValue('50');expect(commit).not.toHaveBeenCalled();
    fireEvent.pointerDown(slider,{button:0});fireEvent.change(slider,{target:{value:'82'}});fireEvent.pointerUp(slider);
    expect(commit).toHaveBeenLastCalledWith(82);
    fireEvent.change(slider,{target:{value:'83'}});fireEvent.keyUp(slider,{key:'ArrowRight'});expect(commit).toHaveBeenLastCalledWith(83);
  });
});

describe('Slider2D',()=>{
  const axes={x:{label:'Chroma',min:0,max:100,step:5,fineStep:1},y:{label:'Density',min:10,max:90,step:5,fineStep:1,reversed:true}};
  it('bounds independent axes, reverses the vertical direction and provides fine keyboard adjustment',()=>{
    const commit=vi.fn();render(<Slider2D label="Character" {...axes} defaultValue={{x:50,y:50}} onValueCommit={commit}/>);
    const pad=screen.getByRole('group',{name:/Character/});
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    fireEvent.keyDown(pad,{key:'ArrowRight'});expect(screen.getByRole('slider',{name:'Chroma'})).toHaveValue('55');
    fireEvent.keyDown(pad,{key:'ArrowDown',shiftKey:true});expect(screen.getByRole('slider',{name:'Density'})).toHaveValue('51');
    fireEvent.keyDown(pad,{key:'End'});expect(screen.getByRole('slider',{name:'Chroma'})).toHaveValue('100');expect(screen.getByRole('slider',{name:'Density'})).toHaveValue('90');
    fireEvent.keyDown(pad,{key:'ArrowRight'});expect(commit).toHaveBeenLastCalledWith({x:100,y:90});
    fireEvent.keyDown(pad,{key:'Home'});expect(commit).toHaveBeenLastCalledWith({x:0,y:10});
  });
  it('coalesces pointer frames, commits the final coordinate, and cancels queued movement without a late overwrite',()=>{
    vi.stubGlobal('PointerEvent',TestPointerEvent);const callbacks=new Map<number,FrameRequestCallback>();let nextId=0;
    vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{callbacks.set(++nextId,cb);return nextId;});vi.stubGlobal('cancelAnimationFrame',(id:number)=>callbacks.delete(id));
    const change=vi.fn(),commit=vi.fn();
    function Example(){const[value,setValue]=useState({x:50,y:50});return <Slider2D label="Character" {...axes} value={value} onValueChange={v=>{setValue(v);change(v);}} onValueCommit={commit}/>;}
    render(<Example/>);const pad=screen.getByRole('group',{name:/Character/});
    vi.spyOn(pad,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:248,height:248,right:248,bottom:248,x:0,y:0,toJSON:()=>({})});
    fireEvent.pointerDown(pad,{button:0,pointerId:3,clientX:124,clientY:124});change.mockClear();
    fireEvent.pointerMove(pad,{pointerId:3,clientX:180,clientY:100});fireEvent.pointerMove(pad,{pointerId:3,clientX:200,clientY:90});expect(change).not.toHaveBeenCalled();expect(callbacks.size).toBe(1);
    fireEvent.pointerUp(pad,{pointerId:3,clientX:224,clientY:224});expect(commit).toHaveBeenLastCalledWith({x:100,y:90});expect(callbacks.size).toBe(0);
    fireEvent.pointerDown(pad,{button:0,pointerId:4,clientX:24,clientY:24});fireEvent.pointerMove(pad,{pointerId:4,clientX:80,clientY:80});fireEvent.keyDown(pad,{key:'Escape'});
    expect(screen.getByRole('slider',{name:'Chroma'})).toHaveValue('100');expect(screen.getByRole('slider',{name:'Density'})).toHaveValue('90');expect(callbacks.size).toBe(0);expect(commit).toHaveBeenCalledTimes(1);
  });
  it('keeps exact fields as independent labelled numeric controls and makes disabled pads inert',()=>{
    const change=vi.fn();const{rerender}=render(<Slider2D label="Character" {...axes} defaultValue={{x:50,y:50}} showFields onValueChange={change}/>);
    fireEvent.change(screen.getByRole('spinbutton',{name:'Chroma'}),{target:{value:'63'}});expect(change).toHaveBeenLastCalledWith({x:63,y:50});
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    rerender(<Slider2D label="Character" {...axes} disabled showFields onValueChange={change}/>);const count=change.mock.calls.length;
    fireEvent.keyDown(screen.getByRole('group',{name:/Character/}),{key:'ArrowRight'});expect(change).toHaveBeenCalledTimes(count);expect(screen.getByRole('spinbutton',{name:'Chroma'})).toBeDisabled();
  });
});

it('parameter Select has one trigger label, retains keyboard selection, and submits its selected value',async()=>{
  const user=userEvent.setup();const{container}=render(<form><Select appearance="parameter" label="Interface" name="theme" defaultValue="light" options={[{value:'light',label:'Light'},{value:'dark',label:'Dark'}]}/></form>);
  const select=screen.getByRole('combobox',{name:'Interface'});expect(select).toHaveTextContent('InterfaceLight');expect(select).toHaveAttribute('data-appearance','parameter');
  expect(container.querySelectorAll('#'+CSS.escape(select.getAttribute('aria-labelledby')!))).toHaveLength(1);
  await user.click(select);await user.keyboard('{End}{Enter}');expect(select).toHaveTextContent('Dark');expect(new FormData(container.querySelector('form')!).get('theme')).toBe('dark');
});
