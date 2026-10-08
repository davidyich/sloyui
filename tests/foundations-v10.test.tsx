import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '../src';
import ColorsV2 from '../demo/ColorsV2';
import Typography from '../demo/Typography';

describe('foundation catalogue interactions', () => {
  it('keeps the user wrap choice available across both palette orientations and copies token references', async () => {
    const user = userEvent.setup();
    const copy = vi.fn();
    const { container } = render(<LocaleProvider locale="en"><ColorsV2 theme="light" accent="blue" copy={copy}/></LocaleProvider>);
    const wrap = screen.getByRole('switch', { name:'Wrap' });
    expect(wrap).toBeChecked();
    await user.click(wrap);
    await user.click(screen.getByRole('radio', { name:'Columns' }));
    expect(screen.getByRole('switch', { name:'Wrap' })).not.toBeChecked();
    expect(container.querySelector('.cap-v2-palettes')).toHaveAttribute('data-wrap', 'false');
    await user.click(screen.getByRole('switch', { name:'Wrap' }));
    await user.click(screen.getByRole('radio', { name:'Rows' }));
    expect(screen.getByRole('switch', { name:'Wrap' })).toBeChecked();
    await user.click(screen.getByRole('button', { name:'Copy --cap-surface-raised' }));
    expect(copy).toHaveBeenLastCalledWith('var(--cap-surface-raised)');
    expect(container.querySelectorAll('.cap-foundation-surface-matrix')).toHaveLength(2);
    expect(container.querySelector('.cap-foundation-surface-matrix')?.children[3]).toHaveAttribute('data-surface', 'floating');
  });

  it('switches between the unchanged interface scale and the expanded prose scale in both locales', async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(<LocaleProvider locale="en"><Typography/></LocaleProvider>);
    expect(screen.getByText('--cap-line-height-base')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name:'Prose' }));
    expect(screen.getByText('--cap-prose-line-height-base')).toBeInTheDocument();
    expect(screen.getByText('A longer reading sample')).toBeInTheDocument();
    expect(container.querySelector('.cap-typography-scale')).toHaveAttribute('data-typography','prose');
    rerender(<LocaleProvider locale="ru"><Typography/></LocaleProvider>);
    expect(screen.getByRole('heading',{name:'Типографика'})).toBeInTheDocument();
    expect(screen.getByText('Пример длинного текста')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name:'Interface' }));
    expect(screen.queryByText('--cap-prose-line-height-base')).not.toBeInTheDocument();
    expect(screen.getByText('--cap-line-height-base')).toBeInTheDocument();
  });
});
