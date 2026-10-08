import { createRef, useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentCard, EmptyState, Input, Select, Textarea, ReorderableList } from '../src';
afterEach(()=>{cleanup();vi.restoreAllMocks();});

it('keeps custom block state keyed when hidden properties or order change, with independent card actions',async()=>{
 const opened=vi.fn(),selected=vi.fn();
 const props={title:'Project',description:'Description',onOpen:opened,onSelectedChange:selected,blocks:[{id:'note',content:<Input aria-label="Draft" defaultValue="Keep me"/>},{id:'words',kind:'metadata' as const,content:'256 words'}]};
 const view=render(<ContentCard {...props} blockOrder={['title','note','description','words']}/>);
 await userEvent.type(screen.getByRole('textbox',{name:'Draft'}),'!');
 view.rerender(<ContentCard {...props} blockOrder={['words','note','title']} hiddenBlocks={['description']}/>);
 expect(Array.from(view.container.querySelectorAll('[data-card-block]')).map(el=>el.getAttribute('data-card-block'))).toEqual(['words','note','title']);
 expect(screen.getByRole('textbox')).toHaveValue('Keep me!');expect(screen.queryByText('Description')).not.toBeInTheDocument();
 await userEvent.click(screen.getByRole('checkbox'));expect(selected).toHaveBeenCalledWith(true);expect(opened).not.toHaveBeenCalled();
 await userEvent.click(screen.getByRole('button',{name:'Project'}));expect(opened).toHaveBeenCalledOnce();
});
it('reorders a cover inline and omits hidden custom blocks without empty placeholders',()=>{
 const view=render(<ContentCard title="Project" cover="Image" blockOrder={['title','cover']} blocks={[{id:'hidden',content:'Never',hidden:true}]}/>);
 expect(view.container.querySelector('.cap-content-card-body > [data-card-block="cover"]')).toHaveTextContent('Image');expect(screen.queryByText('Never')).not.toBeInTheDocument();
});
it.each(['inside','outside'] as const)('shares %s labels, errors, required state, native refs, form values and reset across all fields',async labelPlacement=>{
 const inputRef=createRef<HTMLInputElement>(),selectRef=createRef<HTMLSelectElement>(),areaRef=createRef<HTMLTextAreaElement>();
 const {container}=render(<form><Input ref={inputRef} label="Name" name="name" labelPlacement={labelPlacement} defaultValue="Garden" required hint="Unique name"/><Select ref={selectRef} label="Type" name="type" labelPlacement={labelPlacement} defaultValue="note" options={[{value:'note',label:'Note'},{value:'project',label:'Project'}]}/><Textarea ref={areaRef} label="Description" name="description" labelPlacement={labelPlacement} defaultValue="Draft" error="More detail"/><button type="reset">Reset</button></form>);
 expect(screen.getByRole('textbox',{name:'Name'})).toBeRequired();expect(inputRef.current).toHaveAccessibleDescription('Unique name');expect(areaRef.current).toHaveAccessibleDescription('More detail');expect(areaRef.current).toHaveAttribute('aria-invalid','true');
 await userEvent.clear(inputRef.current!);await userEvent.type(inputRef.current!,'New');
 await userEvent.click(screen.getByRole('combobox',{name:'Type'}));await userEvent.click(screen.getByRole('option',{name:'Project'}));
 const form=container.querySelector('form')!;expect(new FormData(form).get('name')).toBe('New');expect(selectRef.current).toHaveValue('project');expect(new FormData(form).get('description')).toBe('Draft');
 await userEvent.click(screen.getByRole('button',{name:'Reset'}));await waitFor(()=>expect(screen.getByRole('combobox')).toHaveTextContent('Note'));expect(inputRef.current).toHaveValue('Garden');
});
it('uses neutral decorative EmptyState icons and can omit them',()=>{
 const view=render(<div data-accent="pink"><EmptyState title="Nothing"/></div>);expect(view.container.querySelector('.cap-empty [data-color]')).toHaveAttribute('data-color','neutral');expect(view.container.querySelector('.cap-empty-icon')).toHaveAttribute('aria-hidden','true');
 view.rerender(<EmptyState title="Nothing" icon={false}/>);expect(view.container.querySelector('svg')).toBeNull();
});
const initial=[{id:'a',title:'Alpha'},{id:'b',title:'Beta'},{id:'c',title:'Gamma'}];
function Sorter({disabled=false}:{disabled?:boolean}) {const [items,setItems]=useState(initial);return <ReorderableList label="Order" items={items} onOrderChange={setItems} disabled={disabled} getItemLabel={item=>item.title} renderItem={item=><Input aria-label={item.title} defaultValue={item.title}/>}/>;}
it('moves by keyboard and buttons while preserving keyed input state and focus',async()=>{
 render(<Sorter/>);await userEvent.type(screen.getByRole('textbox',{name:'Alpha'}),' edited');
 const handle=screen.getByRole('button',{name:'Переместить: Alpha'});handle.focus();await userEvent.keyboard('{ArrowDown}');
 const order=()=>within(screen.getByRole('list',{name:'Order'})).getAllByRole('textbox').map(el=>el.getAttribute('aria-label'));
 expect(order()).toEqual(['Beta','Alpha','Gamma']);expect(screen.getByRole('textbox',{name:'Alpha'})).toHaveValue('Alpha edited');expect(screen.getByRole('status')).toHaveTextContent('Позиция 2 из 3');
 await waitFor(()=>expect(handle).toHaveFocus());await userEvent.keyboard('{End}');expect(order()).toEqual(['Beta','Gamma','Alpha']);
 await userEvent.click(handle);await userEvent.click(screen.getByRole('button',{name:'Переместить вверх'}));expect(order()).toEqual(['Beta','Alpha','Gamma']);
});
it('commits pointer moves only on drop and supports pointer cancellation',()=>{
 const changed=vi.fn();const {container}=render(<ReorderableList label="Order" items={initial} onOrderChange={changed} getItemLabel={item=>item.title} renderItem={item=>item.title}/>);
 const rows=Array.from(container.querySelectorAll('li'));rows.forEach((row,i)=>vi.spyOn(row,'getBoundingClientRect').mockReturnValue({top:i*60,height:50,bottom:i*60+50,left:0,right:300,width:300,x:0,y:i*60,toJSON:()=>({})}));
 const handle=screen.getByRole('button',{name:'Переместить: Alpha'});handle.setPointerCapture=vi.fn();
 // jsdom has no PointerEvent; a MouseEvent with the pointer event name provides coordinates.
 const pointer=(name:string,y:number)=>fireEvent(handle,new MouseEvent(name,{bubbles:true,button:0,clientX:10,clientY:y}));
 pointer('pointerdown',25);pointer('pointermove',145);expect(changed).not.toHaveBeenCalled();pointer('pointercancel',145);expect(changed).not.toHaveBeenCalled();
 pointer('pointerdown',25);pointer('pointermove',145);pointer('pointerup',145);expect(changed.mock.calls[0][0].map((item:{id:string})=>item.id)).toEqual(['b','c','a']);
});
it('does not expose reorder handles when disabled',()=>{render(<Sorter disabled/>);expect(screen.queryByRole('button')).not.toBeInTheDocument();expect(screen.getAllByRole('textbox')).toHaveLength(3);});
