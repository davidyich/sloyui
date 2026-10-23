import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { CatalogPageBoundary } from '../demo/CatalogPageBoundary';

it('keeps navigation available after a page failure and retries its content', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const reload = vi.fn();
  vi.stubGlobal('location', { reload });
  let failed = true;
  function Page() { if (failed) throw new Error('Page load failed'); return <h1>Цвета</h1>; }
  try {
    const { rerender } = render(<><nav>Каталог</nav><CatalogPageBoundary key="failed"><Page/></CatalogPageBoundary></>);
    expect(screen.getByRole('navigation')).toHaveTextContent('Каталог');
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось открыть страницу');
    await userEvent.click(screen.getByRole('button', { name: 'Обновить страницу' }));
    expect(reload).toHaveBeenCalledOnce();
    failed = false;
    rerender(<><nav>Каталог</nav><CatalogPageBoundary key="next-route"><Page/></CatalogPageBoundary></>);
    expect(screen.getByRole('heading', { name: 'Цвета' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  } finally { error.mockRestore(); vi.unstubAllGlobals(); }
});
