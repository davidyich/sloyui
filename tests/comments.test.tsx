import { fireEvent, render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { CommentThread, InlineComments, type ThreadComment } from '../src/components/comments';

if(!window.PointerEvent)Object.defineProperty(window,'PointerEvent',{value:MouseEvent});
const me={id:'me',name:'Mina Park'},alex={id:'alex',name:'Alex Chen'};
const seed:ThreadComment[]=[{id:'c1',author:alex,body:'A useful comment',createdAt:'yesterday',replies:[]}];

describe('comment threads',()=>{
  it('declares floating context for local reaction and mention overlays',()=>{
    render(<CommentThread currentUser={me} defaultComments={seed} people={[alex]}/>);
    expect(screen.getByRole('region',{name:'Comments'})).toHaveAttribute('data-surface','raised');
    fireEvent.click(screen.getByRole('button',{name:'Add reaction'}));
    expect(screen.getByRole('group',{name:'Reactions'})).toHaveAttribute('data-surface','floating');
    fireEvent.change(screen.getByRole('textbox',{name:'Write a comment'}),{target:{value:'@Al'}});
    expect(screen.getByRole('listbox',{name:'People to mention'})).toHaveAttribute('data-surface','floating');
  });
  it('adds replies and reports the full updated tree',()=>{
    const change=vi.fn();render(<CommentThread currentUser={me} defaultComments={seed} onCommentsChange={change}/>);
    fireEvent.click(screen.getByRole('button',{name:'Reply'}));fireEvent.change(screen.getByLabelText('Write a comment'),{target:{value:'Thanks, I will update it.'}});fireEvent.click(screen.getByRole('button',{name:'Send'}));
    expect(change).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({id:'c1',replies:expect.arrayContaining([expect.objectContaining({body:'Thanks, I will update it.'})])})]),expect.objectContaining({type:'reply',parentId:'c1'}));
  });
  it('offers people for @mentions and supports editing own comments',()=>{
    render(<CommentThread currentUser={me} people={[alex]}/>);const composer=screen.getByLabelText('Write a comment');fireEvent.change(composer,{target:{value:'@Al'}});fireEvent.click(screen.getByRole('option',{name:'Alex Chen'}));expect(composer).toHaveValue('@Alex Chen ');fireEvent.change(composer,{target:{value:'My note'}});fireEvent.click(screen.getByRole('button',{name:'Send'}));fireEvent.click(screen.getByRole('button',{name:'Edit'}));const edit=screen.getByLabelText('Edit comment');fireEvent.change(edit,{target:{value:'Edited note'}});fireEvent.click(screen.getByRole('button',{name:'Save'}));expect(screen.getByText('Edited note')).toBeInTheDocument();
  });
  it('supports Cyrillic mentions with combobox navigation and preserves a deep reply',()=>{
    const anna={id:'anna',name:'Анна Ким'};
    let deep:ThreadComment={id:'deep-5',author:anna,body:'Глубокий ответ',createdAt:'сегодня'};
    for(let depth=4;depth>=0;depth--)deep={id:`deep-${depth}`,author:anna,body:`Ответ ${depth}`,createdAt:'сегодня',replies:[deep]};
    render(<CommentThread currentUser={me} people={[anna]} defaultComments={[deep]}/>);
    expect(screen.getByText('Глубокий ответ')).toBeInTheDocument();
    const composer=screen.getByLabelText('Write a comment');
    fireEvent.change(composer,{target:{value:'@Ан'}});
    expect(composer).toHaveAttribute('aria-autocomplete','list');
    expect(composer).toHaveAttribute('aria-controls');
    const option=screen.getByRole('option',{name:'Анна Ким'});
    expect(composer).toHaveAttribute('aria-activedescendant',option.id);
    fireEvent.click(option);
    expect(composer).toHaveValue('@Анна Ким ');
    fireEvent.click(screen.getByRole('button',{name:'Send'}));
    expect(document.querySelector('.cap-comment-mention')).toHaveTextContent('@Анна Ким');
  });
  it('toggles reactions and resolve/reopen state',()=>{
    const change=vi.fn(),resolved=vi.fn();render(<CommentThread currentUser={me} defaultComments={seed} onCommentsChange={change} onResolvedChange={resolved}/>);fireEvent.click(screen.getByRole('button',{name:'Add reaction'}));fireEvent.click(screen.getByRole('button',{name:'React with 👍'}));expect(change).toHaveBeenCalledWith(expect.any(Array),expect.objectContaining({type:'react',emoji:'👍',added:true}));fireEvent.click(screen.getByRole('button',{name:'Resolve'}));expect(resolved).toHaveBeenCalledWith(true);
  });
  it('keeps replies under a deleted comment and reports deletion',()=>{
    const change=vi.fn();render(<CommentThread currentUser={me} defaultComments={[{id:'mine',author:me,body:'Old note',createdAt:'yesterday',replies:[{id:'reply',author:alex,body:'Follow up',createdAt:'today'}]}]} onCommentsChange={change}/>);fireEvent.click(screen.getByRole('button',{name:'Delete'}));expect(screen.getByText('This comment was deleted.')).toBeInTheDocument();expect(screen.getByText('Follow up')).toBeInTheDocument();expect(change).toHaveBeenCalledWith(expect.any(Array),expect.objectContaining({type:'delete',id:'mine'}));
  });
  it('uses valid textarea semantics while mention suggestions are open',async()=>{
    const {container}=render(<CommentThread currentUser={me} people={[alex]}/>);
    fireEvent.change(screen.getByRole('textbox',{name:'Write a comment'}),{target:{value:'@Al'}});
    expect(screen.getByRole('option',{name:'Alex Chen'})).toBeInTheDocument();
    expect((await axe.run(container,{rules:{'color-contrast':{enabled:false}}})).violations).toEqual([]);
  });
});

describe('inline comments overlay',()=>{
  it('keeps the thread and its fields in the floating context of the popup',()=>{
    render(<div data-theme="dark" data-accent="purple" data-borders="off"><InlineComments currentUser={me} defaultAnchors={[{id:'a',x:.4,y:.5,comments:seed}]}><div>Canvas</div></InlineComments></div>);
    fireEvent.click(screen.getByRole('button',{name:'Open comment 1'}));
    const dialog=screen.getByRole('dialog',{name:'Inline comment 1'});
    expect(dialog).toHaveAttribute('data-surface','floating');
    expect(dialog).toHaveAttribute('data-theme','dark');
    expect(dialog).toHaveAttribute('data-accent','purple');
    expect(screen.getByRole('textbox',{name:'Write a comment'}).closest('[data-surface]')).toHaveAttribute('data-surface','floating');
  });
  it('creates normalized comment pins without dispatching placement to children',()=>{
    const bounds=vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockReturnValue({left:10,top:20,width:100,height:100,right:110,bottom:120,x:10,y:20,toJSON:()=>({})} as DOMRect),save=vi.fn(),child=vi.fn();render(<InlineComments currentUser={me} onAnchorsChange={save}><button type="button" onClick={child}>Edit underlying content</button></InlineComments>);fireEvent.click(screen.getByRole('button',{name:'Add comment'}));const layer=screen.getByRole('button',{name:'Choose where to comment'});fireEvent.pointerDown(layer,{clientX:60,clientY:70,pointerId:1});expect(child).not.toHaveBeenCalled();expect(save).toHaveBeenCalledWith([expect.objectContaining({x:.5,y:.5,comments:[]})]);expect(screen.getByRole('dialog',{name:'Inline comment 1'})).toBeInTheDocument();bounds.mockRestore();
  });
  it('opens and dismisses an existing anchor by keyboard',()=>{
    render(<InlineComments currentUser={me} defaultAnchors={[{id:'a',x:.4,y:.5,comments:seed,title:'Details'}]}><div>Canvas</div></InlineComments>);fireEvent.click(screen.getByRole('button',{name:'Open comment 1'}));expect(screen.getByRole('dialog',{name:'Inline comment 1'})).toBeInTheDocument();act(()=>{fireEvent.keyDown(document,{key:'Escape'})});expect(screen.queryByRole('dialog',{name:'Inline comment 1'})).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Open comment 1'}));fireEvent.pointerDown(document.body,{clientX:0,clientY:0,pointerId:2});expect(screen.queryByRole('dialog',{name:'Inline comment 1'})).not.toBeInTheDocument();
  });
  it('keeps a closing inline thread inert until its exit completes',()=>{
    vi.useFakeTimers();
    try {
      render(<InlineComments currentUser={me} defaultAnchors={[{id:'a',x:.4,y:.5,comments:seed}]}><div>Canvas</div></InlineComments>);
      fireEvent.click(screen.getByRole('button',{name:'Open comment 1'}));
      const dialog=screen.getByRole('dialog',{name:'Inline comment 1'});
      fireEvent.click(screen.getByRole('button',{name:'Close comment thread'}));
      expect(dialog).toHaveAttribute('data-state','closed');
      expect(dialog).toHaveAttribute('inert');
      act(()=>vi.advanceTimersByTime(200));
      expect(dialog).not.toBeInTheDocument();
    } finally { vi.useRealTimers(); }
  });
});
