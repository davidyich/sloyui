import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { HoverPanel, NavigationMenu } from '../src/components/navigation-menu';
import { TreeView } from '../src/components/tree-view';

describe('navigation and tree interactions', () => {
  it('keeps a hover-opened panel open on its first click and restores trigger focus on Escape', async () => {
    const user = userEvent.setup();
    render(<HoverPanel label="Preview" summary="Preview"><button type="button">Open preview item</button></HoverPanel>);
    const trigger = screen.getByRole('button', { name: 'Preview' });
    fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    expect(await screen.findByRole('region', { name: 'Preview' })).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByRole('region', { name: 'Preview' })).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByRole('region', { name: 'Preview' })).not.toBeInTheDocument();
    await user.click(trigger);
    const child = screen.getByRole('button', { name: 'Open preview item' });
    child.focus(); await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Preview' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('waits for hover intent but opens immediately on keyboard focus', () => {
    vi.useFakeTimers();
    try {
      render(<HoverPanel label="Preview" summary="Preview"><a href="#more">More</a></HoverPanel>);
      const trigger=screen.getByRole('button',{name:'Preview'});
      fireEvent.pointerEnter(trigger,{pointerType:'mouse'});
      act(()=>vi.advanceTimersByTime(150));
      expect(screen.queryByRole('region',{name:'Preview'})).not.toBeInTheDocument();
      act(()=>vi.advanceTimersByTime(70));
      expect(screen.getByRole('region',{name:'Preview'})).toBeInTheDocument();
      fireEvent.pointerLeave(trigger,{pointerType:'mouse'});
      act(()=>vi.advanceTimersByTime(100));
      expect(screen.queryByRole('region',{name:'Preview'})).not.toBeInTheDocument();
      act(()=>trigger.focus());
      expect(screen.getByRole('region',{name:'Preview'})).toBeInTheDocument();
    } finally { vi.useRealTimers(); }
  });

  it('keeps a closing preview inert for its exit and reverses when reopened', () => {
    vi.useFakeTimers();
    try {
      render(<HoverPanel label="Preview" summary="Preview"><button type="button">Inside</button></HoverPanel>);
      const trigger=screen.getByRole('button',{name:'Preview'});
      fireEvent.click(trigger);
      const panel=screen.getByRole('region',{name:'Preview'});
      fireEvent.click(trigger);
      expect(panel).toHaveAttribute('data-state','closed');
      expect(panel).toHaveAttribute('inert');
      expect(panel).toHaveAttribute('aria-hidden','true');
      fireEvent.click(trigger);
      expect(panel).toHaveAttribute('data-state','open');
      act(()=>vi.advanceTimersByTime(200));
      expect(panel).toBeInTheDocument();
      fireEvent.click(trigger);
      act(()=>vi.advanceTimersByTime(200));
      expect(panel).not.toBeInTheDocument();
    } finally { vi.useRealTimers(); }
  });

  it('opens on keyboard focus, preserves focus into the portal and closes after safe pointer exit', async () => {
    vi.useFakeTimers();
    try {
      render(<HoverPanel label="Details" summary="Details"><a href="#details">Details link</a></HoverPanel>);
      const trigger = screen.getByRole('button', { name: 'Details' });
      act(() => trigger.focus());
      expect(screen.getByRole('region', { name: 'Details' })).toBeInTheDocument();
      const panel = screen.getByRole('region', { name: 'Details' });
      trigger.blur();
      fireEvent.pointerLeave(trigger, { pointerType: 'mouse' });
      fireEvent.pointerEnter(panel, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(150));
      expect(panel).toBeInTheDocument();
      fireEvent.pointerLeave(panel, { pointerType: 'mouse' });
      act(() => vi.advanceTimersByTime(150));
      expect(screen.queryByRole('region', { name: 'Details' })).not.toBeInTheDocument();
    } finally { vi.useRealTimers(); }
  });

  it('switches one shared navigation panel on hover, supports ArrowDown and dismisses outside without stealing focus', async () => {
    const user = userEvent.setup();
    render(<><NavigationMenu label="Main navigation" items={[
      { id: 'work', label: 'Работа', content: <a href="#work">Проекты</a> },
      { id: 'library', label: 'Библиотека', content: <button type="button">Заметки</button> },
    ]}/><button type="button">Outside</button></>);
    const work = screen.getByRole('button', { name: 'Работа' }), library = screen.getByRole('button', { name: 'Библиотека' });
    fireEvent.pointerEnter(work, { pointerType: 'mouse' });
    expect(screen.getByRole('region', { name: 'Работа' })).toBeInTheDocument();
    await user.click(work);
    expect(screen.getByRole('region', { name: 'Работа' })).toBeInTheDocument();
    fireEvent.pointerEnter(library, { pointerType: 'mouse' });
    expect(screen.queryByRole('region', { name: 'Работа' })).not.toBeInTheDocument();
    const panel = screen.getByRole('region', { name: 'Библиотека' });
    expect(panel).toHaveAttribute('id');
    library.focus(); await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: 'Заметки' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(library).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
  });

  it('exposes expanded hierarchy, skips disabled rows and typeaheads through enabled nodes', () => {
    render(<TreeView label="Проекты" defaultExpandedIds={['root']} nodes={[
      { id: 'root', label: 'Библиотека', children: [
        { id: 'disabled', label: 'Недоступная заметка', disabled: true },
        { id: 'alpha', label: 'Alpha' },
        { id: 'charlie', label: 'Charlie' },
      ] },
    ]}/>);
    const tree = screen.getByRole('tree', { name: 'Проекты' }), parent = within(tree).getByRole('treeitem', { name: 'Библиотека' });
    const alpha = within(tree).getByRole('treeitem', { name: 'Alpha' }), charlie = within(tree).getByRole('treeitem', { name: 'Charlie' });
    expect(parent).toHaveAttribute('aria-expanded', 'true');
    expect(parent.getAttribute('aria-owns')?.split(' ')).toContain(alpha.id);
    expect(within(tree).getByRole('treeitem', { name: 'Недоступная заметка' })).toHaveAttribute('aria-disabled', 'true');
    expect(tree.querySelectorAll('[role="treeitem"][tabindex="0"]')).toHaveLength(1);
    parent.focus(); fireEvent.keyDown(parent, { key: 'ArrowRight' });
    expect(alpha).toHaveFocus(); fireEvent.keyDown(alpha, { key: 'ArrowDown' });
    expect(charlie).toHaveFocus();
    parent.focus(); fireEvent.keyDown(parent, { key: 'c' });
    expect(charlie).toHaveFocus();
  });

  it('draws nested guide tracks and makes closing descendants inert before removal', async () => {
    render(<TreeView label="Workspace" showGuides selectedId="note" defaultExpandedIds={['workspace','research']} nodes={[
      { id:'workspace', label:'Workspace', children:[
        { id:'research', label:'Research', children:[
          { id:'note', label:'Selected note' },
          { id:'sources', label:'Sources' },
        ] },
        { id:'draft', label:'Draft' },
      ] },
    ]}/>);
    const tree=screen.getByRole('tree',{name:'Workspace'}), selected=within(tree).getByRole('treeitem',{name:'Selected note'});
    expect(selected.closest('.cap-tree-entry')).toHaveAttribute('data-guided-child','true');
    expect(selected.closest('.cap-tree-entry')?.querySelectorAll('.cap-tree-guide')).toHaveLength(2);
    const activeMarker=tree.querySelector('.cap-tree-active-guide-indicator');
    expect(activeMarker).toHaveAttribute('data-visible','true');
    expect([...selected.closest('.cap-tree-entry')!.querySelectorAll('.cap-tree-guide')].every(guide=>guide.hasAttribute('data-continues'))).toBe(true);
    const sources=within(tree).getByRole('treeitem',{name:'Sources'}).closest('.cap-tree-entry')!;
    expect(sources.querySelectorAll('.cap-tree-guide[data-continues=true]')).toHaveLength(1);
    expect(sources.querySelectorAll('.cap-tree-guide:not([data-continues])')).toHaveLength(1);
    expect(tree).toHaveAttribute('data-size','md');
    expect(tree.querySelectorAll('.cap-tree-guide-column')).toHaveLength(4);
    fireEvent.click(within(tree).getByRole('treeitem',{name:'Research'}));
    expect(within(tree).queryByRole('treeitem',{name:'Selected note'})).not.toBeInTheDocument();
    expect(selected).toHaveAttribute('aria-hidden','true');
    expect(selected).toHaveAttribute('inert');
    await waitFor(()=>expect(tree.querySelectorAll('.cap-tree-guide-column')).toHaveLength(2));
    expect(activeMarker).not.toHaveAttribute('data-visible');
    fireEvent.click(within(tree).getByRole('treeitem',{name:'Research'}));
    expect(within(tree).getByRole('treeitem',{name:'Selected note'})).toBeInTheDocument();
    expect(tree.querySelectorAll('.cap-tree-guide-column')).toHaveLength(4);
  });

  it('moves focus to the visible ancestor and reverses a closing branch', () => {
    render(<TreeView label="Notes" defaultExpandedIds={['root']} nodes={[{id:'root',label:'Root',children:[{id:'child',label:'Child'}]}]}/>);
    const root=screen.getByRole('treeitem',{name:'Root'}), child=screen.getByRole('treeitem',{name:'Child'});
    child.focus();
    fireEvent.click(root);
    expect(child).toHaveAttribute('inert');
    expect(root).toHaveFocus();
    fireEvent.click(root);
    expect(screen.getByRole('treeitem',{name:'Child'})).not.toHaveAttribute('inert');
    expect(screen.getByRole('treeitem',{name:'Child'})).toHaveAttribute('data-presence','open');
  });

  it('moves one persistent selected row and guide indicator between selected children', () => {
    const rect=(left:number,top:number,width:number,height:number)=>({left,top,right:left+width,bottom:top+height,width,height,x:left,y:top,toJSON:()=>({})});
    let treeWidth=280,rowWidth=264,resize:ResizeObserverCallback|undefined;
    const observed:Element[]=[];
    class TestResizeObserver {
      constructor(callback:ResizeObserverCallback){resize=callback;}
      observe(target:Element){observed.push(target);}
      disconnect(){}
      unobserve(){}
    }
    vi.stubGlobal('ResizeObserver',TestResizeObserver);
    vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
      if(this.getAttribute('role')==='tree')return rect(0,0,treeWidth,160) as DOMRect;
      if(this.classList.contains('cap-tree-item'))return rect(16,this.getAttribute('aria-label')==='Alpha'?10:60,rowWidth,34) as DOMRect;
      if(this.classList.contains('cap-tree-guide'))return rect(8,this.closest('.cap-tree-entry')?.querySelector('.cap-tree-item')?.getAttribute('aria-label')==='Alpha'?10:60,1,34) as DOMRect;
      return rect(0,0,0,0) as DOMRect;
    });
    function ControlledTree(){
      const [selected,setSelected]=useState('alpha');
      return <TreeView label="Files" showGuides selectedId={selected} onSelect={node=>setSelected(node.id)} defaultExpandedIds={['root']} nodes={[{id:'root',label:'Files',children:[{id:'alpha',label:'Alpha'},{id:'beta',label:'Beta'}]}]}/>;
    }
    render(<ControlledTree/>);
    const tree=screen.getByRole('tree',{name:'Files'}), rowIndicator=tree.querySelector('.cap-tree-selection-indicator'), guideIndicator=tree.querySelector('.cap-tree-active-guide-indicator');
    expect((rowIndicator as HTMLElement).style.transform).toBe('translate3d(16px,10px,0)');
    expect((guideIndicator as HTMLElement).style.transform).toBe('translate3d(8px,27px,0) translateY(-50%)');
    fireEvent.click(within(tree).getByRole('treeitem',{name:'Beta'}));
    expect(tree.querySelector('.cap-tree-selection-indicator')).toBe(rowIndicator);
    expect(tree.querySelector('.cap-tree-active-guide-indicator')).toBe(guideIndicator);
    expect((rowIndicator as HTMLElement).style.transform).toBe('translate3d(16px,60px,0)');
    expect((guideIndicator as HTMLElement).style.transform).toBe('translate3d(8px,77px,0) translateY(-50%)');
    expect(observed).toContain(tree);
    expect(observed).toContain(within(tree).getByRole('treeitem',{name:'Beta'}));
    treeWidth=220;rowWidth=204;
    act(()=>resize?.([],{} as ResizeObserver));
    expect((rowIndicator as HTMLElement).style.width).toBe('204px');
    vi.restoreAllMocks();vi.unstubAllGlobals();
  });

  it('preserves modified link clicks while invoking selection on an ordinary activation', () => {
    const onSelect = vi.fn();
    render(<TreeView label="Documents" nodes={[{ id: 'doc', label: 'Research notes', href: '#notes' }]} onSelect={onSelect}/>);
    const link = screen.getByRole('treeitem', { name: 'Research notes' });
    const modified = fireEvent.click(link, { ctrlKey: true, button: 0 });
    expect(modified).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(link, { button: 0 });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
