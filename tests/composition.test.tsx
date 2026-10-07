import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Badge, Tag, TypeLabel, Counter, TextAction, CodeBlock, ContentLayout, IconPicker } from '../src';
it('unifies legacy labels and keeps count/action independent',async()=>{
 const user=userEvent.setup(),select=vi.fn(),remove=vi.fn();
 const {container}=render(<><Badge>Ready</Badge><TypeLabel>Page</TypeLabel><Tag icon="folder" count={5} onClick={select} action={{icon:'close',label:'Remove project',onClick:remove}}>Project</Tag><Counter value={128} max={99}/></>);
 expect(container.querySelectorAll('.cap-tag')).toHaveLength(3);expect(container.querySelector('.cap-type-label,.cap-badge')).toBeNull();
 await user.click(screen.getByRole('button',{name:'Project 5'}));await user.click(screen.getByRole('button',{name:'Remove project'}));expect(select).toHaveBeenCalledTimes(1);expect(remove).toHaveBeenCalledTimes(1);expect(screen.getByLabelText('128')).toHaveTextContent('99+');
});
it('preserves link navigation and native action disabled behavior',async()=>{
 const user=userEvent.setup(),action=vi.fn();render(<><TextAction href="#Tag">Tags</TextAction><TextAction onClick={action}>Apply</TextAction><TextAction disabled onClick={action}>Unavailable</TextAction></>);
 expect(screen.getByRole('link',{name:'Tags'})).toHaveAttribute('href','#Tag');await user.click(screen.getByRole('button',{name:'Apply'}));await user.click(screen.getByRole('button',{name:'Unavailable'}));expect(action).toHaveBeenCalledTimes(1);
});
it('resizes independent panes with the keyboard and preserves the other pane when closed',async()=>{
 const user=userEvent.setup();function Example(){const [open,setOpen]=useState(true);return <ContentLayout left={{label:'Left',content:'Left content',open,onOpenChange:setOpen,defaultWidth:200,minWidth:180,maxWidth:300}} right={{label:'Right',content:'Right content'}}>Document</ContentLayout>}
 render(<Example/>);const left=screen.getByRole('separator',{name:'Ширина: Left'}),right=screen.getByRole('separator',{name:'Ширина: Right'});
 left.focus();await user.keyboard('{ArrowRight}');expect(left).toHaveAttribute('aria-valuenow','210');await user.keyboard('{Home}');expect(left).toHaveAttribute('aria-valuenow','180');await user.keyboard('{End}');expect(left).toHaveAttribute('aria-valuenow','300');expect(right).toHaveAttribute('aria-valuenow','280');
 await user.click(screen.getByRole('button',{name:'Закрыть: Left'}));expect(screen.queryByRole('region',{name:'Left'})).toBeNull();expect(screen.getByRole('region',{name:'Right'})).toHaveTextContent('Right content');expect(screen.getByRole('region',{name:'Контент'})).toHaveTextContent('Document');
});
it('filters and selects icons without losing disabled behavior',async()=>{
 const user=userEvent.setup(),change=vi.fn();const view=render(<IconPicker onValueChange={change} options={[{name:'Book',icon:'book'},{name:'Folder',icon:'folder'}]}/>);
 await user.type(screen.getByRole('searchbox',{name:'Найти иконку'}),'book');expect(screen.queryByRole('radio',{name:'Folder'})).toBeNull();await user.click(screen.getByRole('radio',{name:'Book'}));expect(change).toHaveBeenCalledWith('Book');
 view.rerender(<IconPicker disabled onValueChange={change} options={[{name:'Book',icon:'book'}]}/>);expect(screen.getByRole('radio',{name:'Book'})).toBeDisabled();
});
it('escapes code, labels the language and copies exact source',async()=>{
 const user=userEvent.setup(),source='const value = "<script>alert(1)</script>";';const {container}=render(<CodeBlock language="tsx" label="example.tsx">{source}</CodeBlock>);
 expect(container.querySelector('script')).toBeNull();expect(container.querySelector('code')).toHaveTextContent(source);expect(container.querySelector('.cap-code-keyword')).toHaveTextContent('const');await user.click(screen.getByRole('button',{name:'Копировать код'}));expect(await navigator.clipboard.readText()).toBe(source);expect(screen.getByRole('status')).toHaveTextContent('Скопировано');
});
it('keeps string counts intact and preserves the full capped count for assistive technology',()=>{
 const {rerender}=render(<Counter value="99+" shape="rounded" variant="white" max={9}/>);expect(screen.getByText('99+')).not.toHaveAttribute('aria-label');
 rerender(<Counter value={1001} max={99}/>);expect(screen.getByLabelText('1001')).toHaveTextContent('99+');
 rerender(<Counter value={0}/>);expect(screen.getByText('0')).toBeVisible();
});
