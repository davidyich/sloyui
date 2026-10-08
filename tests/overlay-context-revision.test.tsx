import { useRef, useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { OverlayPortal, Popover, useOverlayScope } from '../src/components/overlays';
import { Input } from '../src/components/forms';

function ScopeProbe({ replacement = false }: { replacement?: boolean }) {
  const anchor = useRef<HTMLSpanElement>(null), panel = useRef<HTMLDivElement>(null);
  const scope = useOverlayScope(anchor);
  return <><span ref={anchor} key={String(replacement)} data-testid="scope-anchor" />
    <OverlayPortal anchor={anchor} panel={panel}><div ref={panel} data-testid="scope-panel" {...scope} /></OverlayPortal></>;
}

describe('Live independent portal context', () => {
  it('reads each nearest axis independently and removes expired local overrides', async () => {
    const { container } = render(<div data-theme="dark" data-accent="rose" data-radius="rounded" data-borders="on" data-shadow="soft">
      <div data-theme="light" data-color="blue"><div data-borders="off" data-radius="compact" data-shadow="compact" data-accent="inherit" data-color="inherit"><ScopeProbe /></div></div>
    </div>);
    const panel = screen.getByTestId('scope-panel'), inner = container.querySelector('[data-borders="off"]')!;
    expect(panel).toHaveAttribute('data-theme', 'light');
    expect(panel).toHaveAttribute('data-color', 'blue');
    expect(panel).not.toHaveAttribute('data-accent');
    expect(panel).toHaveAttribute('data-radius', 'compact');
    expect(panel).toHaveAttribute('data-borders', 'off');
    expect(panel).toHaveAttribute('data-shadow', 'compact');
    act(() => { inner.removeAttribute('data-radius'); inner.removeAttribute('data-borders'); inner.setAttribute('data-shadow', 'soft'); container.querySelector('[data-theme="light"]')!.removeAttribute('data-theme'); });
    await waitFor(() => expect(panel).toHaveAttribute('data-radius', 'rounded'));
    expect(panel).toHaveAttribute('data-theme', 'dark');
    expect(panel).toHaveAttribute('data-borders', 'on');
    expect(panel).toHaveAttribute('data-shadow', 'soft');
    expect(panel).toHaveAttribute('data-surface', 'floating');
  });

  it('follows a moved anchor and subscribes to its new ancestors even when modes initially match', async () => {
    const { container } = render(<><div data-testid="before" data-radius="default" data-theme="dark"><ScopeProbe /></div><div data-testid="after" data-radius="default" data-theme="dark" /></>);
    const anchor = screen.getByTestId('scope-anchor'), original = anchor.parentElement!, destination = screen.getByTestId('after'), panel = screen.getByTestId('scope-panel');
    try {
      await act(async () => { destination.append(anchor); });
      act(() => { destination.setAttribute('data-radius', 'rounded'); destination.setAttribute('data-borders', 'on'); destination.setAttribute('data-color', 'teal'); });
      await waitFor(() => expect(panel).toHaveAttribute('data-radius', 'rounded'));
      expect(panel).toHaveAttribute('data-borders', 'on');
      expect(panel).toHaveAttribute('data-color', 'teal');
      expect(panel).toHaveAttribute('data-theme', 'dark');
      expect(panel).toHaveAttribute('data-surface', 'floating');
      act(() => { container.querySelector('[data-testid="before"]')!.setAttribute('data-radius', 'compact'); });
      expect(panel).toHaveAttribute('data-radius', 'rounded');
    } finally { await act(async () => { original.append(anchor); }); }
  });

  it('captures context when an anchor ref is replaced during a commit', async () => {
    function Fixture() {
      const [replacement, setReplacement] = useState(false);
      return <div data-radius={replacement ? 'rounded' : 'compact'}><button onClick={() => setReplacement(true)}>Replace anchor</button><ScopeProbe replacement={replacement} /></div>;
    }
    render(<Fixture />);
    const oldAnchor = screen.getByTestId('scope-anchor');
    await userEvent.click(screen.getByRole('button', { name: 'Replace anchor' }));
    const anchor = screen.getByTestId('scope-anchor');
    expect(anchor).not.toBe(oldAnchor);
    act(() => { anchor.setAttribute('data-shadow', 'compact'); });
    await waitFor(() => expect(screen.getByTestId('scope-panel')).toHaveAttribute('data-shadow', 'compact'));
    expect(screen.getByTestId('scope-panel')).toHaveAttribute('data-radius', 'rounded');
  });

  it('renders an accessible icon-only Popover trigger and restores keyboard focus', async () => {
    render(<Popover label="Filter components" triggerIcon="filter" size="sm"><Input aria-label="Search filters" /></Popover>);
    const trigger = screen.getByRole('button', { name: 'Filter components' });
    expect(trigger.querySelectorAll('svg')).toHaveLength(1);
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('data-size', 'sm');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('textbox', { name: 'Search filters' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });
});
