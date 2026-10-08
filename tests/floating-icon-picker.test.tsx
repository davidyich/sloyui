import { expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { IconPicker, ScrollArea, FloatingActionBar, Button, IconButton } from '../src';
import { iconOptions } from '../demo/icon-catalogue';

it('finds a canonical Lucide glyph by alias, selects by keyboard, and preserves selection on Escape',async()=>{
 const user=userEvent.setup();
 function Example(){const [value,setValue]=useState('folder');return <IconPicker label="Icon" variant="combobox" options={iconOptions} value={value} onValueChange={setValue}/>;}
 render(<Example/>);
 const input=screen.getByRole('combobox',{name:'Icon'});
 await user.click(input);await user.type(input,'x-circle');
 const option=screen.getByRole('option',{name:'CircleX'});expect(option.querySelector('svg')).not.toBeNull();
 expect(input).toHaveAttribute('aria-activedescendant',option.id);
 await user.keyboard('{Enter}');expect(input).toHaveValue('CircleX');expect(input).toHaveAttribute('aria-expanded','false');
 await user.click(input);await user.type(input,'NoSuchIconExists');expect(screen.getByRole('status')).toHaveTextContent('Иконки не найдены');
 await user.keyboard('{Escape}');expect(input).toHaveValue('CircleX');expect(input).toHaveFocus();
 await user.click(input);await user.type(input,'search');await user.keyboard('{ArrowDown}{Enter}');expect(input).not.toHaveValue('CircleX');
});

it('keeps local appearance on the combobox portal and supports pointer selection and Tab dismissal',async()=>{
 const user=userEvent.setup(),choose=vi.fn();
 render(<div data-theme="dark" data-accent="purple" data-borders="on"><IconPicker label="Icon" variant="combobox" options={iconOptions} onValueChange={choose}/><Button>Next</Button></div>);
 const input=screen.getByRole('combobox',{name:'Icon'});
 await user.click(input);await user.type(input,'lucidefolder');
 const popup=screen.getByRole('listbox').parentElement!;
 expect(popup).toHaveAttribute('data-theme','dark');expect(popup).toHaveAttribute('data-accent','purple');expect(popup).toHaveAttribute('data-surface','floating');
 await user.click(screen.getByRole('option',{name:/^folder$/}));expect(choose).toHaveBeenCalledWith('folder');
 await user.click(input);await user.tab();expect(input).toHaveAttribute('aria-expanded','false');expect(screen.getByRole('button',{name:'Next'})).toHaveFocus();
});

it('keeps floating controls outside the masked viewport, with independent actions and roving focus across slots',async()=>{
 const user=userEvent.setup(),save=vi.fn(),copy=vi.fn();
 render(<ScrollArea label="Notes" style={{height:240}} floating={<FloatingActionBar label="Actions" size="xl" position="static" leading={<IconButton label="Copy" icon="copy" onClick={copy}/>} trailing={<Button onClick={save}>Save</Button>}><IconButton label="Options" icon="sliders"/></FloatingActionBar>}><p>Scrollable note</p></ScrollArea>);
 const viewport=screen.getByRole('region',{name:'Notes'}),bar=screen.getByRole('toolbar',{name:'Actions'});
 expect(viewport).not.toContainElement(bar);expect(viewport.parentElement).toContainElement(bar);
 await user.click(within(bar).getByRole('button',{name:'Copy'}));expect(copy).toHaveBeenCalledOnce();expect(save).not.toHaveBeenCalled();
 await user.keyboard('{End}{Enter}');expect(save).toHaveBeenCalledOnce();expect(within(bar).getByRole('button',{name:'Save'})).toHaveFocus();
});

it('gives every fragmented child a divided section and keeps vertical actions icon-only',async()=>{
 const user=userEvent.setup(),save=vi.fn();
 const {container}=render(<FloatingActionBar label="Vertical sections" orientation="vertical" variant="divided" action={{label:'Save',icon:'check',onClick:save}}><><IconButton label="First" icon="folder"/><IconButton label="Second" icon="page"/></></FloatingActionBar>);
 const sections=container.querySelectorAll('.cap-floating-segment');
 expect(sections).toHaveLength(2);
 expect(within(sections[0] as HTMLElement).getByRole('button',{name:'First'})).toBeInTheDocument();
 const saveButton=screen.getByRole('button',{name:'Save'});expect(saveButton.textContent).toBe('');
 await user.click(screen.getByRole('button',{name:'First'}));await user.keyboard('{ArrowDown}');expect(screen.getByRole('button',{name:'Second'})).toHaveFocus();
 await user.keyboard('{End}{Enter}');expect(save).toHaveBeenCalledOnce();
});
