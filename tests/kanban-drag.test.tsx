import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanBoard, TaskCard, type KanbanTask } from '../src';

afterEach(()=>{cleanup();vi.restoreAllMocks();});
const columns=[{id:'todo',title:'Todo'},{id:'done',title:'Done'}];
const initial:KanbanTask[]=[{id:'a',columnId:'todo',title:'Alpha'},{id:'b',columnId:'todo',title:'Beta'},{id:'c',columnId:'todo',title:'Gamma'}];
function geometry(container:HTMLElement) {
 const box=(left:number,top:number,width:number,height:number)=>({left,top,right:left+width,bottom:top+height,width,height,x:left,y:top,toJSON:()=>({})});
 vi.spyOn(container.querySelector('.cap-kanban-board')!,'getBoundingClientRect').mockReturnValue(box(0,0,600,350));
 container.querySelectorAll('[data-kanban-column]').forEach((lane,i)=>{
  vi.spyOn(lane,'getBoundingClientRect').mockReturnValue(box(i*300,0,280,330));
  vi.spyOn(lane.querySelector('.cap-kanban-column-body')!,'getBoundingClientRect').mockReturnValue(box(i*300,40,280,290));
  lane.querySelectorAll('[data-kanban-task]').forEach((row,j)=>vi.spyOn(row,'getBoundingClientRect').mockReturnValue(box(i*300,40+j*80,280,70)));
 });
}
function pointer(element:Element,name:string,x:number,y:number,id=1) {
 const event=new MouseEvent(name,{bubbles:true,button:0,clientX:x,clientY:y});Object.defineProperty(event,'pointerId',{value:id});fireEvent(element,event);
}
function Controlled(){
 const [items,setItems]=useState(initial);
 return <KanbanBoard label="Board" columns={columns} items={items} onMove={(id,columnId,index)=>setItems(current=>{
  const item=current.find(item=>item.id===id)!;const next=current.filter(item=>item.id!==id),target=next.filter(item=>item.columnId===columnId);
  const before=target[index],position=before?next.indexOf(before):target.length?next.indexOf(target[target.length-1])+1:next.length;
  next.splice(position,0,{...item,columnId});return next;
 })}/>;
}
it('previews insertion into an empty column without mutating controlled input and commits only on release',()=>{
 const move=vi.fn(),snapshot=JSON.stringify(initial);const {container}=render(<KanbanBoard label="Board" columns={columns} items={initial} onMove={move}/>);geometry(container);
 const handle=screen.getByLabelText('Переместить: Alpha');
 pointer(handle,'pointerdown',20,65);pointer(document.body,'pointermove',330,85);
 expect(container.querySelector('[data-kanban-column="done"] .cap-kanban-drop-placeholder')).toBeInTheDocument();expect(container.querySelector('[data-kanban-task="a"]')).toHaveAttribute('data-dragging','true');
 expect(move).not.toHaveBeenCalled();expect(JSON.stringify(initial)).toBe(snapshot);
 pointer(document.body,'pointerup',330,85);expect(move).toHaveBeenCalledExactlyOnceWith('a','done',0);expect(container.querySelector('.cap-kanban-drop-placeholder')).toBeNull();
 // A consumer that has not yet applied onMove still owns the displayed lane.
 expect(container.querySelector('[data-kanban-column="todo"] [data-kanban-task="a"]')).toBeInTheDocument();
});
it('computes same-column insertion after excluding the dragged task',()=>{
 const move=vi.fn();const {container}=render(<KanbanBoard label="Board" columns={columns} items={initial} onMove={move}/>);geometry(container);
 const handle=screen.getByLabelText('Переместить: Alpha');pointer(handle,'pointerdown',20,65);pointer(handle,'pointermove',20,275);pointer(handle,'pointerup',20,275);
 expect(move).toHaveBeenCalledExactlyOnceWith('a','todo',2);
});
it.each(['Escape','pointercancel','outside'] as const)('cancels %s without committing or leaving a placeholder',mode=>{
 const move=vi.fn();const {container}=render(<KanbanBoard label="Board" columns={columns} items={initial} onMove={move}/>);geometry(container);
 const handle=screen.getByLabelText('Переместить: Alpha');pointer(handle,'pointerdown',20,65);pointer(handle,'pointermove',330,85);
 if(mode==='Escape')fireEvent.keyDown(document,{key:'Escape'});else if(mode==='pointercancel')pointer(document.body,'pointercancel',330,85);else pointer(handle,'pointermove',900,85);
 pointer(document.body,'pointerup',mode==='outside'?900:330,85);
 expect(move).not.toHaveBeenCalled();expect(container.querySelector('.cap-kanban-drop-placeholder')).toBeNull();expect(container.querySelector('.cap-kanban-drag-preview')).toBeNull();
});
it('ignores other pointers and click-sized handle movements',()=>{
 const move=vi.fn();const {container}=render(<KanbanBoard label="Board" columns={columns} items={initial} onMove={move}/>);geometry(container);
 const handle=screen.getByLabelText('Переместить: Alpha');pointer(handle,'pointerdown',20,65);pointer(document.body,'pointermove',330,85,2);pointer(document.body,'pointerup',330,85,2);expect(container.querySelector('.cap-kanban-drop-placeholder')).toBeNull();
 pointer(handle,'pointerup',23,65);expect(move).not.toHaveBeenCalled();
});
it('supports controlled keyboard order and column moves, keeps focus, and exposes equivalent menu actions',async()=>{
 const {container}=render(<Controlled/>);const handle=screen.getByLabelText('Переместить: Alpha');handle.focus();await userEvent.keyboard('{ArrowDown}');
 const order=(column:string)=>Array.from(container.querySelectorAll(`[data-kanban-column="${column}"] [data-kanban-task]`)).map(row=>row.getAttribute('data-kanban-task'));
 expect(order('todo')).toEqual(['b','a','c']);await waitFor(()=>expect(screen.getByLabelText('Переместить: Alpha')).toHaveFocus());
 await userEvent.keyboard('{ArrowRight}');expect(order('todo')).toEqual(['b','c']);expect(order('done')).toEqual(['a']);
 await waitFor(()=>expect(screen.getByLabelText('Переместить: Alpha')).toHaveFocus());expect(screen.getByRole('status')).toHaveTextContent('Alpha. Done. Позиция 1.');
 await userEvent.click(screen.getByRole('button',{name:'Действия: Alpha'}));await userEvent.click(screen.getByRole('menuitem',{name:'В Todo'}));expect(order('todo')).toEqual(['b','c','a']);
 await userEvent.click(screen.getByRole('button',{name:'Действия: Alpha'}));await userEvent.click(screen.getByRole('menuitem',{name:'Переместить вверх'}));expect(order('todo')).toEqual(['b','a','c']);
});
it('preserves card open and completion clicks and supports custom card slots',async()=>{
 const move=vi.fn(),open=vi.fn(),complete=vi.fn();const {container}=render(<KanbanBoard label="Board" columns={columns} items={initial} onMove={move} dragActivation="handle" handlePlacement="custom" renderCard={(item,{handle,menuItems})=><TaskCard title={item.title} dragHandle={handle} menuItems={menuItems} onOpen={()=>open(item.id)} onCompletedChange={value=>complete(item.id,value)}/>}/>);
 await userEvent.click(screen.getByRole('button',{name:'Alpha'}));await userEvent.click(screen.getByRole('checkbox',{name:'Завершить: Alpha'}));expect(open).toHaveBeenCalledExactlyOnceWith('a');expect(complete).toHaveBeenCalledExactlyOnceWith('a',true);expect(move).not.toHaveBeenCalled();
 expect(container.querySelector('[data-kanban-task="a"] .cap-content-card-header .cap-kanban-drag-handle')).toBeInTheDocument();
});
it('cancels an active drag when external item membership changes and disables motion controls',()=>{
 const move=vi.fn(),view=render(<KanbanBoard label="Board" columns={columns} items={initial} onMove={move}/>);geometry(view.container);
 const handle=screen.getByLabelText('Переместить: Alpha');pointer(handle,'pointerdown',20,65);pointer(handle,'pointermove',330,85);
 view.rerender(<KanbanBoard label="Board" columns={columns} items={initial.slice(1)} onMove={move}/>);pointer(document.body,'pointerup',330,85);expect(move).not.toHaveBeenCalled();expect(view.container.querySelector('.cap-kanban-drop-placeholder')).toBeNull();
 view.rerender(<KanbanBoard label="Board" columns={columns} items={initial} onMove={move} disabled/>);expect(screen.queryByLabelText(/Переместить:/)).toBeNull();expect(screen.queryByRole('button',{name:/Действия:/})).toBeNull();
});

it('starts card-body drag by default without rendering a visible handle',()=>{
 const move=vi.fn();const {container}=render(<KanbanBoard label="Board" columns={columns} items={initial} onMove={move}/>);geometry(container);
 expect(container.querySelector('.cap-kanban-drag-handle')).toBeNull();
 const title=screen.getByText('Alpha');pointer(title,'pointerdown',20,65);pointer(document.body,'pointermove',330,85);pointer(document.body,'pointerup',330,85);expect(move).toHaveBeenCalledExactlyOnceWith('a','done',0);
});
it('excludes buttons, fields, links and editable content from card-body drag while suppressing a drop click',()=>{
 const move=vi.fn(),clicked=vi.fn();const {container}=render(<KanbanBoard label="Board" columns={columns} items={initial.slice(0,1)} onMove={move} renderCard={item=><div onClick={clicked}><span>{item.title}</span><button>Action</button><input aria-label="Draft"/><a href="#">Link</a><div contentEditable suppressContentEditableWarning>Editable</div></div>}/>);geometry(container);
 for(const element of [screen.getByRole('button',{name:'Action'}),screen.getByRole('textbox',{name:'Draft'}),screen.getByRole('link'),screen.getByText('Editable')]) {
  pointer(element,'pointerdown',20,65);pointer(document.body,'pointermove',330,85);pointer(document.body,'pointerup',330,85);
 }
 expect(move).not.toHaveBeenCalled();
 const body=screen.getByText('Alpha');pointer(body,'pointerdown',20,65);pointer(document.body,'pointermove',330,85);pointer(document.body,'pointerup',330,85);fireEvent.click(body);expect(move).toHaveBeenCalledExactlyOnceWith('a','done',0);expect(clicked).not.toHaveBeenCalled();
});
it('still offers opt-in handle dragging without starting from the card body',()=>{
 const move=vi.fn();const {container}=render(<KanbanBoard label="Board" columns={columns} items={initial} onMove={move} dragActivation="handle"/>);geometry(container);
 const body=screen.getByText('Alpha');pointer(body,'pointerdown',20,65);pointer(document.body,'pointermove',330,85);pointer(document.body,'pointerup',330,85);expect(move).not.toHaveBeenCalled();
 const handle=screen.getByRole('button',{name:'Переместить: Alpha'});pointer(handle,'pointerdown',20,65);pointer(document.body,'pointermove',330,85);pointer(document.body,'pointerup',330,85);expect(move).toHaveBeenCalledExactlyOnceWith('a','done',0);
});
