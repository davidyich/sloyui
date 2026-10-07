import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tag } from '../src/components/primitives';
it('uses independent native tag actions and prevents both actions when disabled',async()=>{
 const user=userEvent.setup(),select=vi.fn(),remove=vi.fn();const view=render(<Tag onClick={select} onRemove={remove}>Blue</Tag>);
 const label=screen.getByRole('button',{name:'Blue'}),close=screen.getByRole('button',{name:'Удалить тег Blue'});expect(label.contains(close)).toBe(false);
 await user.click(label);await user.click(close);expect(select).toHaveBeenCalledTimes(1);expect(remove).toHaveBeenCalledTimes(1);
 label.focus();await user.keyboard('{Enter}');expect(select).toHaveBeenCalledTimes(2);
 view.rerender(<Tag onClick={select} onRemove={remove} disabled>Blue</Tag>);
 expect(label).toBeDisabled();expect(close).toBeDisabled();await user.click(label);await user.click(close);expect(select).toHaveBeenCalledTimes(2);expect(remove).toHaveBeenCalledTimes(1);
});
it('makes an explicitly static tag non-interactive even when handlers are supplied',async()=>{
 const user=userEvent.setup(),select=vi.fn(),remove=vi.fn();const view=render(<Tag interactive={false} onClick={select} onRemove={remove} count="99+" icon="book">Books</Tag>);
 expect(screen.queryAllByRole('button')).toHaveLength(0);await user.click(screen.getByText('Books'));await user.tab();await user.keyboard('{Enter}');expect(select).not.toHaveBeenCalled();expect(remove).not.toHaveBeenCalled();
 view.rerender(<Tag interactive onClick={select} onRemove={remove}>Books</Tag>);await user.click(screen.getByRole('button',{name:'Books'}));expect(select).toHaveBeenCalledTimes(1);expect(screen.getByRole('button',{name:'Удалить тег Books'})).toBeEnabled();
});
