import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, IconButton, Tag, ButtonGroup, ActionBar, SplitButton, Input, Select, MultiSelect, TagInput, IconPicker, Dialog, Drawer } from '../src';

describe('XL controls keep the interactive contract', () => {
 it('keeps Outline activation, loading and disabled semantics', async () => {
  const click=vi.fn();
  const {rerender}=render(<Button size="xl" variant="outline" onClick={click}>Save</Button>);
  const button=screen.getByRole('button',{name:'Save'}); button.focus();
  await userEvent.keyboard('{Enter} '); expect(click).toHaveBeenCalledTimes(2);
  rerender(<Button size="xl" variant="outline" loading onClick={click}>Save</Button>);
  expect(button).toBeDisabled(); expect(button).toHaveAttribute('aria-busy','true');
  await userEvent.click(button); expect(click).toHaveBeenCalledTimes(2);
  rerender(<Button size="xl" variant="outline" disabled onClick={click}>Save</Button>);
  await userEvent.click(button); expect(click).toHaveBeenCalledTimes(2);
 });
 it('keeps roving focus and split menu restore across an XL toolbar with an explicit nested override', async () => {
  const select=vi.fn();
  render(<ActionBar label="Tools" size="xl"><ButtonGroup label="View" prefix={99}><IconButton icon="list" label="List"/><IconButton icon="grid" label="Grid"/></ButtonGroup><ButtonGroup label="Compact" size="sm"><Button>Compact</Button></ButtonGroup><SplitButton label="Create" variant="outline" items={[{id:'note',label:'Note',onSelect:select}]}/></ActionBar>);
  screen.getByRole('button',{name:'List'}).focus(); await userEvent.keyboard('{ArrowRight}'); expect(screen.getByRole('button',{name:'Grid'})).toHaveFocus();
  await userEvent.keyboard('{End}{ArrowDown}{Enter}'); expect(select).toHaveBeenCalledOnce();
  expect(screen.getByRole('button',{name:'Create: дополнительные действия'})).toHaveFocus();
 });
 it('preserves field labels, clearing, selection and native submitted values at XL', async () => {
  render(<form aria-label="Fields"><Input label="Search" type="search" size="xl" labelPlacement="inside" defaultValue="Notes" name="query"/><Select label="Type" size="xl" name="type" defaultValue="note" options={[{value:'note',label:'Note'},{value:'project',label:'Project'}]}/></form>);
  await userEvent.click(screen.getByRole('button',{name:'Очистить поиск'})); expect(screen.getByRole('searchbox',{name:'Search'})).toHaveValue('');
  await userEvent.click(screen.getByRole('combobox',{name:'Type'})); await userEvent.click(screen.getByRole('option',{name:'Project'}));
  expect(new FormData(screen.getByRole('form',{name:'Fields'}) as HTMLFormElement).get('type')).toBe('project');
 });
 it('retains independent selection and remove actions with larger tag slots', async () => {
  const remove=vi.fn();
  render(<><Tag size="xl" count="999+" onRemove={remove}>Research</Tag><MultiSelect size="xl" label="Projects" options={[{value:'a',label:'Alpha'}]} defaultValue={['a']}/><TagInput size="xl" label="Keywords" defaultValue={['One']}/></>);
  await userEvent.click(screen.getByRole('button',{name:'Удалить тег Research'})); expect(remove).toHaveBeenCalledOnce();
  await userEvent.click(screen.getByRole('button',{name:'Удалить Alpha'})); expect(screen.queryByRole('button',{name:'Удалить Alpha'})).not.toBeInTheDocument();
  await userEvent.type(screen.getByRole('textbox',{name:'Keywords'}),'Two{Enter}'); expect(screen.getByRole('button',{name:'Удалить Two'})).toBeInTheDocument();
 });
 it('allows the XL grid icon picker to search and select without changing the value API', async () => {
  const choose=vi.fn();render(<IconPicker size="xl" variant="grid" options={[{name:'folder',icon:'folder'},{name:'page',icon:'page'}]} onValueChange={choose}/>);
  await userEvent.type(screen.getByRole('searchbox',{name:'Найти иконку'}),'page');
  await userEvent.click(screen.getByRole('radio',{name:'page'})); expect(choose).toHaveBeenCalledWith('page');
 });
 for(const Component of [Dialog,Drawer]) it(`retains focus containment and dismissal in XL ${Component.name}`, async () => {
  const close=vi.fn();render(<Component title="Details" size="xl" open onOpenChange={close}><Button>Inside</Button></Component>);
  const dialog=screen.getByRole('dialog'); expect(dialog).toHaveAttribute('data-size','xl');
  within(dialog).getByRole('button',{name:'Inside'}).focus(); await userEvent.keyboard('{Escape}'); expect(close).toHaveBeenCalledWith(false);
 });
});
