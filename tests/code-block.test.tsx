import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeBlock } from '../src/components/code-block';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('keeps numbered multiline syntax, CRLF, trailing lines and copied source exact without rendering source HTML', async () => {
  const source = '/* first\r\n second */\r\nconst html = "<img onerror=alert(1)>";\r\n';
  const user = userEvent.setup(), writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const { container, rerender } = render(<CodeBlock filename="safe.ts" label="legacy.js" lineNumbers wrap>{source}</CodeBlock>);
  expect(container.querySelector('.cap-code-label')).toHaveTextContent('safe.ts');
  expect(container.querySelector('code')?.textContent).toBe(source);
  expect(container.querySelectorAll('.cap-code-line-number')).toHaveLength(4);
  expect(container.querySelector('.cap-code-gutter')).toHaveAttribute('aria-hidden', 'true');
  expect(container.querySelectorAll('.cap-code-comment')).toHaveLength(2);
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('.cap-code-numbered')).toHaveAttribute('aria-label', 'safe.ts');
  await user.click(screen.getByRole('button', { name: 'Копировать код' }));
  expect(writeText).toHaveBeenCalledWith(source);
  rerender(<CodeBlock lineNumbers showLanguageSelector={false} copyable={false}>{''}</CodeBlock>);
  expect(container.querySelectorAll('.cap-code-line-number')).toHaveLength(1);
  expect(container.querySelector('code')?.textContent).toBe('');
});

it('aligns numbers with wrapped source rows, disconnects the observer and preserves the editable slot', () => {
  let notify: ResizeObserverCallback | undefined;
  const disconnect = vi.fn(), observe = vi.fn();
  vi.stubGlobal('ResizeObserver', class { constructor(callback: ResizeObserverCallback) { notify = callback; } observe = observe; disconnect = disconnect; });
  const { container, rerender } = render(<CodeBlock filename="file.ts" lineNumbers wrap>{'const long = true;\nnext();'}</CodeBlock>);
  const rows = container.querySelectorAll<HTMLElement>('.cap-code-source-line');
  rows.forEach((row, index) => vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({ height: index ? 24 : 48 } as DOMRect));
  notify?.([], {} as ResizeObserver);
  expect(container.querySelector<HTMLElement>('.cap-code-line-number')?.style.height).toBe('48px');
  expect(observe).toHaveBeenCalledTimes(2);
  rerender(<CodeBlock lineNumbers editor={<textarea aria-label="Editable source" defaultValue="source"/>}>{'source'}</CodeBlock>);
  expect(disconnect).toHaveBeenCalledOnce();
  expect(container.querySelector('.cap-code-gutter')).toBeNull();
  expect(screen.getByRole('textbox', { name: 'Editable source' })).toHaveValue('source');
  vi.unstubAllGlobals();
});

it('supports controlled and default language selection with dependency-free syntax tokens', async () => {
  const user = userEvent.setup(), changed = vi.fn();
  const { rerender } = render(<CodeBlock label="example" defaultLanguage="js" onLanguageChange={changed}>{'const ready = true;'}</CodeBlock>);
  expect(screen.getByRole('combobox', { name: 'Язык кода' })).toHaveTextContent('JavaScript');
  expect(document.querySelector('.language-js .cap-code-keyword')).toHaveTextContent('const');
  await user.click(screen.getByRole('combobox', { name: 'Язык кода' }));
  await user.click(screen.getByRole('option', { name: 'JSON' }));
  expect(changed).toHaveBeenCalledWith('json');
  expect(document.querySelector('.language-json .cap-code-boolean')).toHaveTextContent('true');

  rerender(<CodeBlock label="controlled" language="tsx" onLanguageChange={changed}>{'<Card title="Safe" />'}</CodeBlock>);
  expect(document.querySelector('.language-tsx .cap-code-tag')).toHaveTextContent('<Card');
  await user.click(screen.getByRole('combobox', { name: 'Язык кода' }));
  await user.click(screen.getByRole('option', { name: 'TypeScript' }));
  expect(changed).toHaveBeenLastCalledWith('ts');
  expect(document.querySelector('.language-tsx')).toBeInTheDocument();
});

it('tokenizes JSON, CSS, and Bash according to their syntax and keeps source as text', () => {
  const { container, rerender } = render(<CodeBlock language="json" showLanguageSelector={false}>{'{"title":"<img>","active":true,"count":3}'}</CodeBlock>);
  expect(container.querySelectorAll('.cap-code-property')).toHaveLength(3);
  expect(container.querySelector('.cap-code-boolean')).toHaveTextContent('true');
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('code')).toHaveTextContent('{"title":"<img>","active":true,"count":3}');

  rerender(<CodeBlock language="css" showLanguageSelector={false}>{'.panel { color: #fff; }'}</CodeBlock>);
  expect(container.querySelector('.cap-code-selector')).toHaveTextContent('.panel');
  expect(container.querySelector('.cap-code-property')).toHaveTextContent('color');
  expect(container.querySelector('.cap-code-number')).toHaveTextContent('#fff');

  rerender(<CodeBlock language="bash" showLanguageSelector={false}>{'#!/bin/bash\n# build\nnpm run test'}</CodeBlock>);
  expect(container.querySelectorAll('.cap-code-comment')).toHaveLength(2);
  expect(container.querySelector('.cap-code-command')).toHaveTextContent('npm');
});

it('uses separate language rules for identical tokens and keeps Bash paths out of comment styling', () => {
  const { container, rerender } = render(<CodeBlock language="js" showLanguageSelector={false}>{'// server/path'}</CodeBlock>);
  expect(container.querySelector('.cap-code-comment')).toHaveTextContent('// server/path');

  rerender(<CodeBlock language="bash" showLanguageSelector={false}>{'// server/path'}</CodeBlock>);
  expect(container.querySelector('.cap-code-comment')).toBeNull();
  expect(container.querySelector('code')).toHaveTextContent('// server/path');

  rerender(<CodeBlock language="js" showLanguageSelector={false}>{'true'}</CodeBlock>);
  expect(container.querySelector('.cap-code-keyword')).toHaveTextContent('true');
  expect(container.querySelector('.cap-code-boolean')).toBeNull();

  rerender(<CodeBlock language="json" showLanguageSelector={false}>{'true'}</CodeBlock>);
  expect(container.querySelector('.cap-code-boolean')).toHaveTextContent('true');
  expect(container.querySelector('.cap-code-keyword')).toBeNull();

  rerender(<CodeBlock language="js" showLanguageSelector={false}>{'<Card title="Safe" />'}</CodeBlock>);
  expect(container.querySelector('.cap-code-tag')).toBeNull();

  rerender(<CodeBlock language="tsx" showLanguageSelector={false}>{'<Card title="Safe" />'}</CodeBlock>);
  expect(container.querySelector('.cap-code-tag')).toHaveTextContent('<Card');
});

it('omits the filename when only the language selector identifies the language', () => {
  render(<CodeBlock defaultLanguage="tsx" showLanguageSelector>{'<Card />'}</CodeBlock>);
  expect(screen.queryByText('Код')).not.toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Язык кода' })).toHaveTextContent('TSX');
});

it('keeps the chooser optional, color-scoped and copy feedback accessible', async () => {
  const user = userEvent.setup(), writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const { container, rerender } = render(<CodeBlock label="Notes" color="purple" variant="outline" showLanguageSelector={false}>{'Read me'}</CodeBlock>);
  expect(screen.queryByRole('combobox', { name: 'Язык кода' })).not.toBeInTheDocument();
  expect(container.querySelector('.cap-code')).toHaveAttribute('data-color', 'purple');
  expect(container.querySelector('.cap-code')).toHaveAttribute('data-variant', 'outline');
  expect(screen.getByRole('button', { name: 'Копировать код' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Копировать код' }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith('Read me'));
  expect(screen.getByRole('status')).toHaveTextContent('Скопировано');

  rerender(<CodeBlock label="Plain text" defaultLanguage="text" color="inherit">{'No highlighting'}</CodeBlock>);
  expect(within(container).getByRole('combobox', { name: 'Язык кода' })).toHaveTextContent('Plain text');
  expect(container.querySelector('.cap-code')).toHaveAttribute('data-color', 'inherit');
  expect(container.querySelector('.language-text .cap-code-keyword')).toBeNull();
});

it('keeps header actions independent, preserves exact copied source when wrapped, and reports clipboard failure', async () => {
  const user = userEvent.setup(), action = vi.fn(), writeText = vi.fn().mockRejectedValue(new Error('Denied'));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const code = 'const value = "<safe>";\n  // indentation\n';
  const { container, rerender } = render(<CodeBlock label="safe.ts" wrap actions={<button onClick={action}>Run</button>}>{code}</CodeBlock>);
  expect(container.querySelector('code')?.textContent).toBe(code);
  await user.click(screen.getByRole('button', { name: 'Run' }));
  expect(action).toHaveBeenCalledOnce();
  await user.click(screen.getByRole('button', { name: 'Копировать код' }));
  expect(writeText).toHaveBeenCalledWith(code);
  expect(screen.getByRole('status')).toHaveTextContent('Не удалось скопировать');
  rerender(<CodeBlock showLanguageSelector={false} copyable={false}>{'Changed'}</CodeBlock>);
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  expect(container.querySelector('figcaption')).toBeNull();
});

it('changes language with the keyboard without changing source text', async () => {
  const user = userEvent.setup();
  render(<CodeBlock defaultLanguage="tsx">{'<Tag count={3}>Project</Tag>'}</CodeBlock>);
  await user.tab();
  expect(screen.getByRole('combobox')).toHaveFocus();
  await user.keyboard('{Enter}{End}{Enter}');
  expect(screen.getByRole('combobox')).toHaveTextContent('Bash');
  expect(document.querySelector('code')?.textContent).toBe('<Tag count={3}>Project</Tag>');
});


it('inherits the effective local accent and radius in the language popup', async () => {
  const user = userEvent.setup();
  render(<div data-theme="dark" data-accent="rose" data-radius="rounded" data-borders="on"><CodeBlock color="inherit">{'text'}</CodeBlock></div>);
  await user.click(screen.getByRole('combobox'));
  const popup = screen.getByRole('listbox');
  expect(popup).toHaveAttribute('data-accent','rose');
  expect(popup).toHaveAttribute('data-theme','dark');
  expect(popup).toHaveAttribute('data-radius','rounded');
  expect(popup).toHaveAttribute('data-borders','on');
  expect(popup).toHaveAttribute('data-surface','floating');
});

it('offers labelled contextual actions beside copy with keyboard restoration and an explicit filled outline', async () => {
  const user = userEvent.setup(), custom = vi.fn();
  const { container } = render(<div data-theme="dark" data-accent="rose" data-radius="rounded" data-borders="off"><CodeBlock color="inherit" variant="filled-outline" contextActions={[{ id:'run', label:'Выполнить', onSelect:custom }]}>{'x'.repeat(80)}</CodeBlock></div>);
  expect(container.querySelector('.cap-code')).toHaveAttribute('data-variant','filled-outline');
  expect(container.querySelector('.cap-code-label')).toBeNull();
  const trigger = screen.getByRole('button', { name:'Действия с кодом' });
  trigger.focus(); await user.keyboard('{ArrowDown}');
  expect(screen.getByRole('menu')).toHaveAttribute('data-theme','dark');
  expect(screen.getByRole('menu')).toHaveAttribute('data-accent','rose');
  expect(screen.getByRole('menu')).toHaveAttribute('data-radius','rounded');
  expect(screen.getByRole('menu')).toHaveAttribute('data-surface','floating');
  await user.keyboard('{Enter}');
  expect(container.querySelector('.cap-code')).toHaveAttribute('data-wrap');
  expect(trigger).toHaveFocus();
  await user.click(trigger); await user.click(screen.getByRole('menuitem',{name:'Выполнить'}));
  expect(custom).toHaveBeenCalledOnce();
});
