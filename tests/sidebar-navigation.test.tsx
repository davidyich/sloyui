import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { SidebarItem, SidebarPanel, Tabs, IconButton, FloatingActionBar } from '../src';

it('keeps footer actions and their keyboard toolbar behavior when alignment changes', async () => {
  const user = userEvent.setup(), action = vi.fn();
  const example = (footerAlign: 'start' | 'end' | 'stretch') => <SidebarPanel label="Space" header="My space" footerAlign={footerAlign} footer={<><span>Updated today</span><FloatingActionBar label="Tools" position="static"><IconButton label="Create" icon="plus" onClick={action}/><IconButton label="Settings" icon="settings"/></FloatingActionBar></>}><SidebarItem count={0}>Notes</SidebarItem></SidebarPanel>;
  const { rerender } = render(example('start'));
  const create = screen.getByRole('button', { name: 'Create' });
  create.focus();
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
  rerender(example('end'));
  expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
  await user.keyboard('{ArrowLeft}{Enter}');
  expect(action).toHaveBeenCalledOnce();
  rerender(example('stretch'));
  expect(screen.getByRole('button', { name: 'Notes 0' })).toBeInTheDocument();
});

it('preserves tab keyboard selection and skips disabled colored tabs with counters', async () => {
  const user = userEvent.setup();
  function Example() {
    const [value, setValue] = useState('a');
    return <Tabs label="Sections" value={value} onValueChange={setValue} variant="segment" items={[{value:'a',label:'Notes',count:0,color:'purple',content:'Note content'},{value:'b',label:'Locked',count:5,color:'red',disabled:true,content:'Hidden'},{value:'c',label:'Projects',count:123,color:'blue',content:'Project content'}]}/>;
  }
  render(<Example/>);
  screen.getByRole('tab', { name: 'Notes 0' }).focus();
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('tab', { name: 'Projects 123' })).toHaveFocus();
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Project content');
  await user.keyboard('{Home}');
  expect(screen.getByRole('tabpanel')).toHaveTextContent('Note content');
  expect(screen.getByRole('tab', { name: 'Locked 5' })).toBeDisabled();
});

it('keeps disabled sidebar actions inert with accent and zero counts', async () => {
  const action = vi.fn(), user = userEvent.setup();
  render(<SidebarItem color="blue" count={0} active disabled onClick={action}>Projects</SidebarItem>);
  const item = screen.getByRole('button', { name: 'Projects 0' });
  await user.click(item);
  expect(action).not.toHaveBeenCalled();
  expect(item).toHaveAttribute('aria-current', 'page');
});
