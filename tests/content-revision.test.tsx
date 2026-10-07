import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ContentCard, KanbanBoard, KanbanColumn, TaskCard } from '../src/components/content.js';
import { ContentLayout } from '../src/components/content-layout.js';
import { DataTable } from '../src/components/data-table.js';
import { ReorderableList } from '../src/components/reorderable-list.js';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('content revision', () => {
  it('requires an explicit selection opt-in and keeps completion independent', () => {
    const selected=vi.fn(), completed=vi.fn();
    const {container, rerender}=render(<ContentCard title="Project" selected/>);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(container.querySelector('[data-selected]')).toBeNull();
    expect(container.querySelector('article')).toHaveClass('cap-surface-boundary');
    rerender(<ContentCard title="Project" selectable/>);
    const checkbox=screen.getByRole('checkbox',{name:'Выбрать Project'});
    fireEvent.click(checkbox); expect(checkbox).toBeChecked();
    rerender(<ContentCard title="Project" selectable={false} selected onSelectedChange={selected}/>);
    expect(screen.queryByRole('checkbox')).toBeNull(); expect(container.querySelector('[data-selected]')).toBeNull();
    rerender(<TaskCard title="Plan" selectable onSelectedChange={selected} onCompletedChange={completed}/>);
    const completion=screen.getByRole('checkbox',{name:'Завершить: Plan'});
    fireEvent.click(completion); expect(completed).toHaveBeenCalledWith(true); expect(selected).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox',{name:'Выбрать Plan'}));
    expect(selected).toHaveBeenCalledWith(true); expect(completed).toHaveBeenCalledOnce();
  });

  it('keeps a Kanban count in its heading capsule and limits the accent to that capsule', () => {
    const {container,rerender}=render(<KanbanColumn title="Active" color="blue" count={2}><p>Tasks</p></KanbanColumn>);
    const heading=screen.getByRole('heading');
    expect(within(heading).getByText('2')).toHaveClass('cap-counter');
    expect(heading).toHaveAttribute('data-accent','blue');
    expect(container.querySelector('section')).not.toHaveAttribute('data-accent');
    rerender(<KanbanBoard label="Board" columns={[{id:'active',title:'Active',color:'teal'}]} items={[]}/>);
    expect(screen.getByRole('heading')).toHaveAttribute('data-accent','teal');
    expect(screen.getByText('Пока нет задач')).toBeInTheDocument();
  });

  it('keeps resize controls working without a visible divider, with independent dimensions on both axes', () => {
    const width=vi.fn(),height=vi.fn();
    const {rerender,container}=render(<ContentLayout divider="none" left={{label:'Outline',content:'Links',defaultWidth:200,onWidthChange:width,defaultHeight:180,onHeightChange:height}}>Main</ContentLayout>);
    const horizontal=screen.getByRole('separator',{name:'Ширина: Outline'});
    expect(horizontal).toHaveAttribute('aria-orientation','vertical'); fireEvent.keyDown(horizontal,{key:'ArrowRight'});
    expect(width).toHaveBeenCalledWith(210); expect(height).not.toHaveBeenCalled();
    expect(container.querySelector('.cap-content-layout')).toHaveAttribute('data-divider','none');
    rerender(<ContentLayout orientation="vertical" divider="always" left={{label:'Outline',content:'Links',defaultWidth:200,onWidthChange:width,defaultHeight:180,onHeightChange:height}}>Main</ContentLayout>);
    const vertical=screen.getByRole('separator',{name:'Высота: Outline'});
    expect(vertical).toHaveAttribute('aria-orientation','horizontal'); fireEvent.keyDown(vertical,{key:'ArrowDown'});
    expect(height).toHaveBeenCalledWith(190); expect(width).toHaveBeenCalledOnce();
    fireEvent.keyDown(vertical,{key:'Home'}); expect(vertical).toHaveAttribute('aria-valuenow','100');
    rerender(<ContentLayout left={{label:'Outline',content:'Links',defaultWidth:200}} >Main</ContentLayout>);
    expect(screen.getByRole('separator',{name:'Ширина: Outline'})).toHaveAttribute('aria-valuenow','210');
  });

  it('honors an explicit DataTable surface while sorting and selected rows stay controlled', () => {
    const {container}=render(<DataTable surface="floating" label="Table" rows={[{id:'a',value:2},{id:'b',value:1}]} rowId={row=>row.id} columns={[{id:'value',header:'Value',value:row=>row.value}]} selectable selectedIds={['a']}/>);
    expect(container.querySelector('.cap-data-table')).toHaveAttribute('data-surface','floating');
    fireEvent.click(screen.getByRole('button',{name:'Value'}));
    expect(container.querySelector('tbody tr')?.querySelector('td:last-child')).toHaveTextContent('1');
    expect(screen.getByRole('checkbox',{name:'Выбрать строку a'})).toBeChecked();
  });

  it.each([false,true])('animates keyed keyboard reorders with FLIP unless reduced motion=%s', reduced => {
    const media={matches:reduced,addEventListener:vi.fn(),removeEventListener:vi.fn()};
    vi.stubGlobal('matchMedia',vi.fn(()=>media));
    const cancel=vi.fn(),animate=vi.fn((..._args:unknown[])=>({cancel,finished:Promise.resolve()} as unknown as Animation));
    const position=vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
      const index=this.tagName==='LI'?Array.from(this.parentElement?.children??[]).indexOf(this):0;
      return {top:index*60,y:index*60,left:0,x:0,width:300,right:300,height:50,bottom:index*60+50,toJSON:()=>({})};
    });
    Object.defineProperty(HTMLElement.prototype,'animate',{configurable:true,value:animate});
    function Example(){const [items,setItems]=useState([{id:'a',label:'Alpha'},{id:'b',label:'Beta'}]);return <ReorderableList label="Order" items={items} onOrderChange={setItems} getItemLabel={item=>item.label} renderItem={item=><input aria-label={item.label} defaultValue="Draft"/>}/>;}
    const {unmount}=render(<Example/>);
    fireEvent.change(screen.getByRole('textbox',{name:'Alpha'}),{target:{value:'Keep'}});
    fireEvent.keyDown(screen.getByRole('button',{name:'Переместить: Alpha'}),{key:'ArrowDown'});
    expect(within(screen.getByRole('list')).getAllByRole('textbox').map(input=>input.getAttribute('aria-label'))).toEqual(['Beta','Alpha']);
    expect(screen.getByRole('textbox',{name:'Alpha'})).toHaveValue('Keep');
    if(reduced) expect(animate).not.toHaveBeenCalled();
    else { expect(animate).toHaveBeenCalledTimes(2); expect(animate).toHaveBeenCalledWith([{transform:'translate(0px, -60px)'},{transform:'translate(0px, 0px)'}],{duration:240,easing:'cubic-bezier(.2,.7,.2,1)'}); }
    unmount(); position.mockRestore(); delete (HTMLElement.prototype as {animate?:unknown}).animate;
  });
});
