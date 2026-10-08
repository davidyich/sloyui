import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { Calendar, ContentCard, DailyHeader, KanbanBoard, MarkdownEditor, MarkdownPreview, TaskCard } from '../src/components/content.js';

describe('Content blocks', () => {
  it('builds a Monday-first six-week grid across leap-month boundaries and selects a local date', async () => {
    const change = vi.fn();
    render(<Calendar value="2024-02-29" today="2024-02-01" locale="en-US" onValueChange={change} />);
    const grid = screen.getByRole('grid');
    expect(within(grid).getAllByRole('gridcell')).toHaveLength(42);
    expect(within(grid).getAllByRole('columnheader')[0]).toHaveTextContent('Mon');
    expect(within(grid).getAllByRole('button')[0]).toHaveAttribute('data-date', '2024-01-29');
    await userEvent.click(screen.getByRole('button', { name: 'Friday, March 1, 2024' }));
    expect(change).toHaveBeenCalledWith('2024-03-01');
  });
  it('moves focus across months, clamps PageDown at month-end, and skips unavailable dates', async () => {
    render(<Calendar value="2024-01-31" today="2024-01-01" locale="en-US" onValueChange={() => {}} isDateUnavailable={date => date === '2024-03-01'} />);
    screen.getByRole('button', { name: 'Wednesday, January 31, 2024' }).focus();
    await userEvent.keyboard('{PageDown}');
    expect(screen.getByRole('button', { name: 'Thursday, February 29, 2024' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Saturday, March 2, 2024' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('button', { name: 'Monday, February 26, 2024' })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('button', { name: 'Sunday, March 3, 2024' })).toHaveFocus();
  });
  it('respects date bounds and filters the visible agenda', () => {
    render(<Calendar value="2026-09-25" today="2026-09-25" min="2026-09-20" max="2026-09-30" locale="en-US" onValueChange={() => {}} showAgenda events={[{ id: 'one', date: '2026-09-25', title: 'Daily' }, { id: 'two', date: '2026-09-26', title: 'Tomorrow' }]} />);
    expect(screen.getByRole('button', { name: 'Saturday, September 19, 2026' })).toBeDisabled();
    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.queryByText('Tomorrow')).not.toBeInTheDocument();
  });
  it('uses calm scoped month/year menus while retaining selected options and calendar navigation', async () => {
    const user = userEvent.setup();
    render(<Calendar value="2024-02-29" today="2024-02-01" locale="en-US" onValueChange={() => {}} />);
    const month = screen.getByRole('combobox', { name: 'Месяц' });
    expect(month).toHaveAttribute('data-variant', 'ghost');
    await user.click(month);
    const monthList = screen.getByRole('listbox', { name: 'Месяц' });
    expect(monthList).toHaveClass('cap-calendar-period-popup');
    expect(within(monthList).getByRole('option', { name: 'February' })).toHaveAttribute('aria-selected', 'true');
    await user.click(within(monthList).getByRole('option', { name: 'March' }));
    expect(screen.getByRole('grid')).toHaveAccessibleName('March 2024');
    await user.click(screen.getByRole('combobox', { name: 'Год' }));
    const yearList = screen.getByRole('listbox', { name: 'Год' });
    expect(screen.getByRole('combobox', { name: 'Год' }).tagName).toBe('INPUT');
    expect(within(yearList).getByRole('option', { name: '2024' })).toHaveAttribute('aria-selected', 'true');
  });
  it('renders a safe Markdown subset without evaluating raw HTML or unsafe links', () => {
    const { container } = render(<MarkdownPreview value={'# Title\n\n**Strong** and *soft* and `code`\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert) [Safe](https://example.com)\n\n- [x] Done\n- Plain\n\n```html\n<img src=x onerror=alert(1)>\n```'} />);
    expect(screen.getByRole('heading', { name: 'Title', level: 2 })).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Unsafe' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Safe' })).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByRole('checkbox', { name: 'Done' })).toHaveAttribute('aria-checked', 'true');
    expect(container.querySelector('strong')).toHaveTextContent('Strong');
  });
  it('wraps the actual editor selection, preserves it, and toggles a rendered preview', async () => {
    function Example() { const [value, setValue] = useState('hello world'); return <MarkdownEditor value={value} onValueChange={setValue} label="Note" />; }
    render(<Example />);
    const input = screen.getByRole('textbox', { name: 'Note' }) as HTMLTextAreaElement;
    input.focus(); input.setSelectionRange(0, 5);
    await userEvent.click(screen.getByRole('button', { name: 'Жирный текст' }));
    expect(input).toHaveValue('**hello** world');
    expect(input.selectionStart).toBe(2); expect(input.selectionEnd).toBe(7);
    await userEvent.click(screen.getByRole('radio', { name: 'Просмотр' }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Просмотр: Note' }).querySelector('strong')).toHaveTextContent('hello');
  });
  it('does not emit editor changes from formatting shortcuts when read-only', () => {
    const change = vi.fn(); render(<MarkdownEditor value="Read only" onValueChange={change} label="Locked" readOnly />);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'b', ctrlKey: true });
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Жирный текст' })).toBeDisabled();
  });
  it('separates card selection, opening, and task completion without nested buttons', async () => {
    const select = vi.fn(), open = vi.fn(), complete = vi.fn();
    const { container } = render(<><ContentCard title="Project" selected={false} onSelectedChange={select} onOpen={open} footer={<button type="button">Separate action</button>} /><TaskCard title="Task" onOpen={open} onCompletedChange={complete} /></>);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Выбрать Project' }));
    expect(select).toHaveBeenCalledWith(true); expect(open).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Project' })); expect(open).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Завершить: Task' })); expect(complete).toHaveBeenCalledWith(true);
    expect(container.querySelector('button button')).toBeNull();
  });
  it('moves a task to another column from the keyboard-accessible action menu', async () => {
    const move = vi.fn();
    render(<KanbanBoard label="Board" columns={[{ id: 'todo', title: 'Todo' }, { id: 'done', title: 'Done' }]} items={[{ id: 'task', title: 'Write docs', columnId: 'todo' }]} onMove={move} />);
    await userEvent.click(screen.getByRole('button', { name: 'Действия: Write docs' }));
    await userEvent.keyboard('{Enter}');
    expect(move).toHaveBeenCalledWith('task', 'done', 0);
    expect(screen.getByRole('region', { name: 'Board' })).toHaveAttribute('tabindex', '0');
  });
  it('keeps calendar, rendered Markdown, and independent card actions semantically accessible', async () => {
    const { container } = render(<main><Calendar value="2026-09-25" onValueChange={() => {}} /><MarkdownEditor label="Accessible note" value={'# Note\n\n- [x] Done'} onValueChange={() => {}} defaultMode="split" /><ContentCard title="Project" onOpen={() => {}} onSelectedChange={() => {}} /></main>);
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } });
    expect(result.violations.filter(violation => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  });
  it('calculates ISO week numbers around the year boundary', () => {
    render(<DailyHeader date="2021-01-01" locale="en-US" />);
    expect(screen.getByText('Неделя 53')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent('Jan 1, 2021');
  });
});
