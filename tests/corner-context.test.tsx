import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { Menu } from '../src/components/overlays';
import { Input } from '../src/components/forms';

it('keeps the nearest corner shape live across a portal, including reset and removal', async () => {
  const { container } = render(<div data-corner-shape="squircle"><div data-corner-shape="round"><Menu label="Actions" items={[{ id: 'copy', label: 'Copy' }]} /></div></div>);
  const outer = container.firstElementChild!, local = outer.firstElementChild!;
  await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
  const menu = screen.getByRole('menu');
  expect(menu.parentElement).toBe(document.body);
  expect(menu).toHaveAttribute('data-corner-shape', 'round');
  act(() => local.removeAttribute('data-corner-shape'));
  await waitFor(() => expect(menu).toHaveAttribute('data-corner-shape', 'squircle'));
  act(() => outer.removeAttribute('data-corner-shape'));
  await waitFor(() => expect(menu).not.toHaveAttribute('data-corner-shape'));
});

it('shares a field-local corner shape with its labeled wrapper', () => {
  render(<Input label="Name" data-corner-shape="squircle" />);
  expect(screen.getByRole('textbox').closest('.cap-labeled-field')).toHaveAttribute('data-corner-shape', 'squircle');
});
