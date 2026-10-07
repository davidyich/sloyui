import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from '../src/components/layout';
import { KanbanColumn } from '../src/components/content';
import { ButtonGroup } from '../src/components/workbench';

describe('workspace tabs and framed groups', () => {
  it('keeps disabled tabs out of keyboard navigation and makes overflow actions independently reachable', () => {
    function Scope() {
      const [value, setValue] = useState('first');
      return <Tabs label="Project" variant="workspace" value={value} onValueChange={setValue} trailing={<button>More</button>} items={[{ value: 'first', label: 'First', icon: 'page', content: 'First panel' }, { value: 'disabled', label: 'Disabled', disabled: true, content: null }, { value: 'last', label: 'Last', count: 5, content: 'Last panel' }]}/>;
    }
    render(<Scope/>);
    screen.getByRole('tab', { name: 'First' }).focus();
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: /Last/ })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Last panel');
    expect(screen.getByRole('button', { name: 'More' })).toBeEnabled();
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'Home' });
    expect(screen.getByRole('tab', { name: 'First' })).toHaveFocus();
  });
  it('shows an empty framed column with its neutral count and usable footer action', () => {
    const add = vi.fn();
    render(<KanbanColumn variant="framed" title="To do" count={0} icon="clock" footer={<button onClick={add}>Add task</button>}><p>Hidden card</p></KanbanColumn>);
    expect(screen.queryByText('Hidden card')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: /To do/ })).toHaveAttribute('data-surface', 'canvas');
    expect(screen.getByText('0')).toHaveAttribute('data-variant', 'plain');
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
    expect(add).toHaveBeenCalledOnce();
  });
  it('does not change default group and column variants', () => {
    render(<><ButtonGroup label="View"><button>List</button></ButtonGroup><KanbanColumn title="Backlog" count={1}><p>Task</p></KanbanColumn></>);
    expect(screen.getByRole('group', { name: 'View' })).toHaveAttribute('data-appearance', 'default');
    expect(screen.getByRole('group', { name: /Backlog/ })).toHaveAttribute('data-variant', 'default');
  });
});
