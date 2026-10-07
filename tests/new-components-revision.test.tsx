import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BottomSheet } from '../src/components/bottom-sheet';
import { FileTree, type FileTreeNode } from '../src/components/file-tree';
import { PreviewRail, type PreviewRailItem } from '../src/components/preview-rail';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function pointer(target: HTMLElement, type: string, values: Record<string, unknown>) {
  const event = new Event(type, { bubbles:true });
  Object.entries(values).forEach(([key,value]) => Object.defineProperty(event,key,{value}));
  fireEvent(target,event);
}

describe('BottomSheet', () => {
  it('inherits one modal layer, keyboard snapping, Escape, inert background and opener restoration', async () => {
    const user = userEvent.setup();
    function Example() {
      const [open,setOpen]=useState(false);
      return <><button onClick={()=>setOpen(true)}>Open sheet</button><BottomSheet open={open} onOpenChange={setOpen} title="Sheet" snapPoints={[.4,.8]}><button>Inner action</button></BottomSheet></>;
    }
    const {container}=render(<Example/>), opener=screen.getByRole('button',{name:'Open sheet'});
    await user.click(opener);
    const dialog=screen.getByRole('dialog',{name:'Sheet'}), handle=screen.getByRole('slider');
    expect(document.querySelectorAll('.cap-modal-layer')).toHaveLength(1);
    expect(container.inert).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    expect(dialog.style.height).toBe('40dvh');
    handle.focus();
    await user.keyboard('{ArrowUp}');
    expect(handle).toHaveAttribute('aria-valuenow','2');
    expect(dialog.style.height).toBe('80dvh');
    await user.keyboard('{Home}');
    expect(handle).toHaveAttribute('aria-valuenow','1');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });
  it('drags only the handle, dismisses a downward pull and cancels abandoned gestures', () => {
    const change=vi.fn();
    render(<BottomSheet open onOpenChange={change} title="Draggable" snapPoints={[.5]}><button>Content action</button></BottomSheet>);
    const dialog=screen.getByRole('dialog'), handle=screen.getByRole('button',{name:/Высота панели/}), content=screen.getByRole('button',{name:'Content action'});
    pointer(content,'pointerdown',{pointerId:1,clientY:0,button:0});
    pointer(content,'pointermove',{pointerId:1,clientY:200});
    expect(dialog).not.toHaveAttribute('data-dragging');
    expect(change).not.toHaveBeenCalled();
    pointer(handle,'pointerdown',{pointerId:2,clientY:100,button:0});
    pointer(handle,'pointermove',{pointerId:2,clientY:140});
    expect(dialog.style.transform).toBe('translate3d(0,40px,0)');
    pointer(handle,'pointercancel',{pointerId:2});
    expect(dialog).not.toHaveAttribute('data-dragging');
    expect(dialog.style.transform).toBe('');
    pointer(handle,'pointerdown',{pointerId:3,clientY:100,button:0});
    pointer(handle,'pointermove',{pointerId:3,clientY:310});
    pointer(handle,'pointerup',{pointerId:3,clientY:310});
    expect(change).toHaveBeenCalledWith(false);
  });
  it('preserves inherited portal appearance and normalizes invalid snap fractions', () => {
    render(<section data-theme="dark" data-accent="teal" data-borders="on" data-radius="rounded"><BottomSheet open onOpenChange={()=>{}} title="Scoped" variant="inset" edgeGap={20} snapPoints={[-1,.5,2]} defaultSnap={1}>Content</BottomSheet></section>);
    const layer=screen.getByRole('dialog').closest<HTMLElement>('.cap-modal-layer')!;
    expect(layer).toHaveAttribute('data-theme','dark');
    expect(layer).toHaveAttribute('data-accent','teal');
    expect(layer).toHaveAttribute('data-radius','rounded');
    expect(layer).toHaveAttribute('data-borders','on');
    expect(layer.style.getPropertyValue('--cap-overlay-gutter')).toBe('20px');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax','3');
  });
});

describe('FileTree', () => {
  it('selects files through tree keyboard navigation and keeps selected-file actions outside row buttons', async () => {
    const user=userEvent.setup(), open=vi.fn();
    const nodes:FileTreeNode[]=[{id:'root',name:'app',type:'folder',children:[{id:'locked',name:'Locked.tsx',type:'file',disabled:true},{id:'file',name:'Button.tsx',type:'file',description:'Primary action',preview:<p>Button source</p>,actions:[{id:'open',label:'Open file',onSelect:open}]}]}];
    render(<FileTree label="Files" nodes={nodes} defaultExpandedIds={['root']}/>);
    screen.getByRole('treeitem',{name:'app'}).focus();
    await user.keyboard('{ArrowDown}{Enter}');
    const selected=screen.getByRole('treeitem',{name:'Button.tsx'});
    expect(selected).toHaveAttribute('aria-selected','true');
    expect(screen.getByRole('region',{name:'Files: предпросмотр'})).toHaveTextContent('Button source');
    expect(selected.querySelector('button,a')).toBeNull();
    const action=screen.getByRole('button',{name:'Open file'});
    expect(action.closest('[role=tree]')).toBeNull();
    await user.click(action);
    expect(open).toHaveBeenCalledWith(nodes[0].children![1]);
  });
  it('renders empty data and empty folders without inventing a file selection', () => {
    const {rerender}=render(<FileTree label="Empty files" nodes={[]} showPreview={false}/>);
    expect(screen.getByText('Нет файлов')).toBeInTheDocument();
    rerender(<FileTree label="Empty files" nodes={[{id:'empty',name:'assets',type:'folder',children:[]}]}/>);
    expect(screen.getByRole('treeitem',{name:'assets'})).toBeInTheDocument();
    expect(screen.getByText('Выберите файл')).toBeInTheDocument();
  });
});

const railItems:PreviewRailItem[]=[{id:'a',label:'Alpha',description:'Alpha detail'},{id:'b',label:'Beta',description:'Beta detail'},{id:'locked',label:'Locked',disabled:true},{id:'c',label:'Charlie',description:'Charlie detail'}];
describe('PreviewRail', () => {
  it('previews on hover with a transform-only neighbor pyramid while committed selection stays independent', () => {
    const selected=vi.fn();
    render(<PreviewRail label="Sections" items={railItems} defaultValue="a" onValueChange={selected}/>);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    const beta=screen.getByRole('button',{name:'Beta'});
    pointer(beta,'pointerover',{pointerType:'mouse',buttons:0,pointerId:1});
    expect(screen.getByRole('region',{name:'Sections: предпросмотр'})).toHaveTextContent('Beta detail');
    expect(beta.querySelector<HTMLElement>('.cap-preview-rail-mark')?.style.transform).toBe('scaleX(1)');
    expect(screen.getByRole('button',{name:'Alpha'}).querySelector<HTMLElement>('.cap-preview-rail-mark')?.style.transform).toBe('scaleX(0.68)');
    expect(screen.getByRole('button',{name:'Charlie'}).querySelector<HTMLElement>('.cap-preview-rail-mark')?.style.transform).toBe('scaleX(0.44)');
    expect(screen.getByRole('button',{name:'Alpha'})).toHaveAttribute('aria-pressed','true');
    expect(selected).not.toHaveBeenCalled();
  });
  it('supports keyboard selection and skips disabled destinations', async () => {
    const user=userEvent.setup();
    function Example(){const [value,setValue]=useState('b');return <PreviewRail label="Sections" items={railItems} orientation="horizontal" value={value} onValueChange={setValue}/>;}
    render(<Example/>);
    act(()=>screen.getByRole('button',{name:'Beta'}).focus());
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button',{name:'Charlie'})).toHaveFocus();
    expect(screen.getByRole('button',{name:'Charlie'})).toHaveAttribute('aria-pressed','true');
    expect(screen.getByRole('region')).toHaveTextContent('Charlie detail');
    await user.keyboard('{Home}');
    expect(screen.getByRole('button',{name:'Alpha'})).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
  it('pins the first touch preview without navigating, then permits the second link tap and outside dismissal', () => {
    const choose=vi.fn();
    render(<><PreviewRail label="Links" items={[{id:'docs',label:'Docs',href:'#docs',description:'Read docs'}]} onItemSelect={choose}/><button>Outside</button></>);
    const link=screen.getByRole('link',{name:'Docs'});
    const tap=()=>{pointer(link,'pointerdown',{pointerType:'touch',pointerId:1,buttons:1});const event=new MouseEvent('click',{bubbles:true,cancelable:true});fireEvent(link,event);return event;};
    expect(tap().defaultPrevented).toBe(true);
    expect(screen.getByRole('region')).toHaveTextContent('Read docs');
    expect(choose).not.toHaveBeenCalled();
    expect(tap().defaultPrevented).toBe(false);
    expect(choose).toHaveBeenCalledOnce();
    pointer(screen.getByRole('button',{name:'Outside'}),'pointerdown',{pointerType:'touch',pointerId:2});
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
  it('renders empty items and keeps disabled destinations unavailable', async () => {
    const user=userEvent.setup(), choose=vi.fn();
    const {rerender}=render(<PreviewRail label="Empty rail" items={[]}/>);
    expect(screen.getByText('Нет элементов для просмотра')).toBeInTheDocument();
    rerender(<PreviewRail label="Empty rail" items={[{id:'locked',label:'Locked',disabled:true}]} onItemSelect={choose}/>);
    await user.click(screen.getByRole('button',{name:'Locked'}));
    expect(choose).not.toHaveBeenCalled();
  });
});
