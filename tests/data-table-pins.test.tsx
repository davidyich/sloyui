import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type DataTableColumn } from '../src/components/data-table';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const rows = [{ id: 'a', name: 'Alpha', value: 8 }, { id: 'b', name: 'Beta', value: 2 }, { id: 'c', name: 'Gamma', value: 5 }, { id: 'd', name: 'Delta', value: 1 }];
const columns: DataTableColumn<typeof rows[number]>[] = [{ id: 'name', header: 'Name', value: row => row.name, pin: 'left', width: 180, footer: items => `${items.length} companies` }, { id: 'value', header: 'Value', value: row => row.value, pin: 'right', footer: items => items.reduce((sum, row) => sum + row.value, 0) }];
it('keeps pinned rows at page edges while sorting ordinary rows and retaining native summaries', async () => {
  const user = userEvent.setup();
  const { container } = render(<DataTable label="Pipeline" columns={columns} rows={rows} rowId={row => row.id} pinnedRows={{ top: ['a'], bottom: ['b'] }} maxHeight={300}/>);
  await user.click(screen.getByRole('button', { name: /Value/ }));
  expect([...container.querySelectorAll('tbody tr')].map(row => row.getAttribute('data-row-id'))).toEqual(['a', 'd', 'c', 'b']);
  expect(container.querySelector('tbody tr')?.getAttribute('data-row-pin')).toBe('top');
  expect(container.querySelector('tfoot')?.textContent).toContain('4 companies');
  expect(within(screen.getByRole('table')).getByText('16')).toBeInTheDocument();
  expect(screen.getByRole('region')).toHaveStyle({ maxHeight: '300px' });
  expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('data-pin', 'left');
});
it('pins only rows on the current page and selects that page after pin ordering', async () => {
  const user = userEvent.setup();
  const { container } = render(<DataTable label="Pipeline" columns={columns} rows={rows} rowId={row => row.id} selectable pageSize={2} pinnedRows={{ top: ['d'], bottom: ['a'] }}/>);
  expect([...container.querySelectorAll('tbody tr')].map(row => row.getAttribute('data-row-id'))).toEqual(['b', 'a']);
  await user.click(screen.getByRole('checkbox', { name: 'Выбрать все строки на странице' }));
  expect(screen.getByRole('checkbox', { name: 'Выбрать строку a' })).toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Следующая страница' }));
  expect([...container.querySelectorAll('tbody tr')].map(row => row.getAttribute('data-row-id'))).toEqual(['d', 'c']);
  expect(screen.getByRole('checkbox', { name: 'Выбрать строку d' })).not.toBeChecked();
});

it('recalculates stacked offsets when pin membership changes without changing row order', () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const height = this.tagName === 'TFOOT' ? 28 : this.parentElement?.tagName === 'THEAD' ? 40 : 32;
    return { x: 0, y: 0, left: 0, top: 0, right: 180, bottom: height, width: 180, height, toJSON: () => ({}) };
  });
  const { container, rerender } = render(<DataTable label="Pipeline" columns={columns} rows={rows} rowId={row => row.id}/>);
  rerender(<DataTable label="Pipeline" columns={columns} rows={rows} rowId={row => row.id} pinnedRows={{ top: ['a', 'b'], bottom: ['c', 'd'] }}/>);
  const offsets = [...container.querySelectorAll<HTMLTableRowElement>('tbody tr')].map(row => row.style.getPropertyValue('--cap-table-row-offset'));
  expect(offsets).toEqual(['40px', '72px', '60px', '28px']);
});
