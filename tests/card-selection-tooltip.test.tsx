import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentCard, Tooltip, Button } from '../src';

afterEach(cleanup);

it('keeps selection independent of hidden, replaced and reordered content blocks', async () => {
  const user = userEvent.setup(), selected = vi.fn(), opened = vi.fn();
  const { container, rerender } = render(<ContentCard title="Project" onOpen={opened} onSelectedChange={selected} cover="Cover" blockOrder={['title','cover']} hiddenBlocks={['header']} blocks={[{id:'header',content:'Custom header'}]}/>);
  const control = screen.getByRole('checkbox', {name:'Выбрать Project'});
  expect(control.closest('[data-card-block]')).toBeNull();
  expect(container.querySelector('.cap-content-card-header')).toBeNull();
  await user.tab();
  expect(control).toHaveFocus();
  await user.keyboard(' ');
  expect(selected).toHaveBeenCalledWith(true);
  expect(opened).not.toHaveBeenCalled();
  await user.tab();
  await user.keyboard('{Enter}');
  expect(opened).toHaveBeenCalledOnce();
  rerender(<ContentCard title="Project" onSelectedChange={selected} selected selectionPosition="top-end" hiddenBlocks={['title']}/>);
  expect(screen.getByRole('checkbox')).toBeChecked();
});

it('combines rich inverse tooltip text with existing descriptions and preserves its local portal context', async () => {
  const user = userEvent.setup();
  render(<><p id="existing">Existing hint.</p><div data-theme="dark" data-accent="rose" data-radius="rounded" data-borders="off"><Tooltip caption="Access" content="Private object" description="Only you can view it." shortcut={['⌘','P']} variant="inverse" arrow><Button aria-describedby="existing">Details</Button></Tooltip></div></>);
  await user.tab();
  const tip = screen.getByRole('tooltip');
  expect(tip).toHaveAttribute('data-surface','floating');
  expect(tip).toHaveAttribute('data-theme','dark');
  expect(tip).toHaveAttribute('data-accent','rose');
  expect(tip).toHaveAttribute('data-radius','rounded');
  expect(tip).toHaveAttribute('data-borders','off');
  expect(within(tip).getByText('Access')).toBeInTheDocument();
  expect(screen.getByRole('button')).toHaveAccessibleDescription('Existing hint. Access Private object Only you can view it. ⌘ P');
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('tooltip')).toBeNull();
  expect(screen.getByRole('button')).toHaveAttribute('aria-describedby','existing');
});
