import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { LocaleProvider } from '../src/components/locale';
import { RichTextEditor, createRichTextBlock, richTextPlainText, type RichTextDocument, type RichTextPreset } from '../src/components/rich-text-editor';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function Editor({ initial = { blocks: [createRichTextBlock()] }, presets, readOnly = false }: { initial?: RichTextDocument; presets?: RichTextPreset[]; readOnly?: boolean }) {
  const [value, setValue] = useState(initial);
  return <><RichTextEditor label="Заметка" showToolbar value={value} onValueChange={setValue} presets={presets} readOnly={readOnly}/><output data-testid="model">{JSON.stringify(value)}</output></>;
}
const model = () => JSON.parse(screen.getByTestId('model').textContent ?? '{}') as RichTextDocument;

it('edits serializable blocks, splits with Enter, reorders and undoes a structural change', async () => {
  const user = userEvent.setup(); render(<Editor/>);
  const first = screen.getByRole('textbox', { name: 'Заметка, блок 1' });
  await user.click(first); await user.type(first, 'Alpha{Enter}Beta');
  expect(model().blocks.map(block => block.content?.map(run => run.text).join(''))).toEqual(['Alpha', 'Beta']);
  expect(richTextPlainText(model())).toBe('Alpha\nBeta');
  await user.click(screen.getByRole('button', { name: 'Действия с блоком 2' }));
  await user.click(screen.getByRole('menuitem', { name: 'Переместить вверх' }));
  expect(richTextPlainText(model())).toBe('Beta\nAlpha');
  await user.click(screen.getByRole('button', { name: 'Отменить' }));
  expect(richTextPlainText(model())).toBe('Alpha\nBeta');
});

it('searches slash commands and converts the current block', async () => {
  const user = userEvent.setup(); render(<Editor/>);
  const textbox = screen.getByRole('textbox', { name: 'Заметка, блок 1' });
  await user.click(textbox); await user.type(textbox, '/h2');
  expect(screen.getByRole('listbox', { name: 'Тип блока' })).toBeInTheDocument();
  expect(document.querySelector('.cap-rich-editor')).not.toContainElement(screen.getByRole('listbox', { name: 'Тип блока' }));
  await user.keyboard('{Enter}');
  expect(model().blocks[0]).toMatchObject({ type: 'heading2', content: [] });
  expect(screen.getByRole('textbox', { name: 'Заметка, блок 1' })).toHaveAttribute('data-block-type', 'heading2');
  expect(screen.getByRole('textbox', { name: 'Заметка, блок 1' }).tagName).toBe('DIV');
});

it('dismisses a portaled slash menu with Escape and preserves the editor focus', async () => {
  const user = userEvent.setup(); render(<Editor/>);
  const textbox = screen.getByRole('textbox', { name: 'Заметка, блок 1' });
  await user.click(textbox); await user.type(textbox, '/');
  expect(await screen.findByRole('listbox', { name: 'Тип блока' })).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('listbox', { name: 'Тип блока' })).not.toBeInTheDocument();
  expect(textbox).toHaveFocus();
});

it('groups continuous typing into one undo step and supports redo', async () => {
  const user = userEvent.setup(); render(<Editor/>);
  const textbox = screen.getByRole('textbox', { name: 'Заметка, блок 1' });
  await user.click(textbox); await user.type(textbox, 'Draft');
  await user.click(screen.getByRole('button', { name: 'Отменить' }));
  expect(richTextPlainText(model())).toBe('');
  await user.click(screen.getByRole('button', { name: 'Повторить' }));
  expect(richTextPlainText(model())).toBe('Draft');
});

it('only pastes text and stores no HTML, including unsafe markup', async () => {
  render(<Editor/>);
  const textbox = screen.getByRole('textbox', { name: 'Заметка, блок 1' });
  textbox.focus();
  const clipboardData = { getData: (type: string) => type === 'text/plain' ? 'safe text' : '<img src=x onerror=alert(1)>' };
  fireEvent.paste(textbox, { clipboardData });
  expect(richTextPlainText(model())).toBe('safe text');
  expect(screen.getByTestId('model').textContent).not.toContain('<img');
  expect(textbox.querySelector('img')).toBeNull();
});

it('stores soft line breaks in code and paragraph blocks', async () => {
  const user = userEvent.setup();
  render(<Editor initial={{ blocks: [createRichTextBlock('code'), createRichTextBlock('paragraph')] }} />);
  const code = screen.getByRole('textbox', { name: 'Заметка, блок 1' });
  await user.click(code); await user.type(code, 'first{Enter}second');
  const paragraph = screen.getByRole('textbox', { name: 'Заметка, блок 2' });
  await user.click(paragraph); await user.type(paragraph, 'alpha');
  await user.keyboard('{Shift>}{Enter}{/Shift}'); await user.type(paragraph, 'beta');
  expect(model().blocks.map(block => block.content?.map(run => run.text).join(''))).toEqual(['first\nsecond', 'alpha\nbeta']);
});

it('applies a mark to selection and keeps read-only content static', async () => {
  const user = userEvent.setup();
  const initial = { blocks: [createRichTextBlock('paragraph', [{ text: 'Marked' }])] };
  const view = render(<Editor initial={initial}/>);
  const textbox = screen.getByRole('textbox', { name: 'Заметка, блок 1' });
  textbox.focus(); const range = document.createRange(); range.selectNodeContents(textbox);
  const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
  await user.click(screen.getByRole('button', { name: 'Полужирный' }));
  expect(model().blocks[0].content).toEqual([{ text: 'Marked', marks: ['bold'] }]);
  expect(textbox.querySelector('strong')).toHaveTextContent('Marked');
  view.rerender(<Editor initial={initial} readOnly/>);
  expect(screen.getByText('Marked').closest('p')).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Заметка, блок 1' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Полужирный' })).toBeDisabled();
});

it('uses valid textbox/list semantics while editing and restores semantic headings and lists when read-only', async () => {
  const initial = { blocks: [
    createRichTextBlock('heading1', [{ text: 'Heading' }]),
    createRichTextBlock('bullet', [{ text: 'List item' }]),
    createRichTextBlock('numbered', [{ text: 'Numbered item' }]),
  ] };
  const view = render(<Editor initial={initial}/>);
  const headingEditor = screen.getByRole('textbox', { name: 'Заметка, блок 1' });
  const bulletEditor = screen.getByRole('textbox', { name: 'Заметка, блок 2' });
  const numberEditor = screen.getByRole('textbox', { name: 'Заметка, блок 3' });
  expect(headingEditor.tagName).toBe('DIV');
  expect(bulletEditor.closest('li')?.parentElement?.tagName).toBe('UL');
  expect(numberEditor.closest('li')?.parentElement?.tagName).toBe('OL');
  expect(headingEditor.closest('h1')).toBeNull();
  expect((await axe.run(view.container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
  view.rerender(<Editor initial={initial} readOnly/>);
  expect(screen.getByRole('heading', { level: 1, name: 'Heading' })).toBeInTheDocument();
  expect(screen.getByText('List item').closest('li')?.parentElement?.tagName).toBe('UL');
  expect(screen.getByText('Numbered item').closest('li')?.parentElement?.tagName).toBe('OL');
  expect(document.querySelector('[contenteditable="true"]')).toBeNull();
  expect((await axe.run(view.container, { rules: { 'color-contrast': { enabled: false } } })).violations).toEqual([]);
});

it('shows floating selection actions and applies marks to the saved text range', async () => {
  const user = userEvent.setup();
  const initial = { blocks: [createRichTextBlock('paragraph', [{ text: 'Select this text' }])] };
  render(<Editor initial={initial}/>);
  const textbox = screen.getByRole('textbox', { name: 'Заметка, блок 1' });
  textbox.focus(); const range = document.createRange(); range.selectNodeContents(textbox);
  const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
  fireEvent(document, new Event('selectionchange'));
  const floating = await screen.findByLabelText('Заметка: выделенный текст');
  expect(floating).toBeInTheDocument();
  const bold = floating.querySelector<HTMLButtonElement>('button[aria-label="Полужирный"]')!;
  await user.click(bold);
  expect(model().blocks[0].content).toEqual([{ text: 'Select this text', marks: ['bold'] }]);
  fireEvent.pointerDown(document.body, { pointerId: 1 });
  expect(screen.queryByLabelText('Заметка: выделенный текст')).not.toBeInTheDocument();
});

it('renders consumer presets with serializable data and updates through the contract', async () => {
  const user = userEvent.setup();
  const presets: RichTextPreset[] = [{ type: 'callout', label: 'Врезка', keywords: ['note'], create: () => ({ data: { tone: 'info' } }), render: ({ block, onDataChange }) => <button type="button" onClick={() => onDataChange({ tone: 'warning' })}>Тон: {(block.data as { tone: string })?.tone}</button> }];
  render(<Editor presets={presets}/>);
  const textbox = screen.getByRole('textbox', { name: 'Заметка, блок 1' });
  await user.click(textbox); await user.type(textbox, '/note{Enter}');
  expect(model().blocks[0].data).toEqual({ tone: 'info' });
  await user.click(screen.getByRole('button', { name: 'Тон: info' }));
  expect(model().blocks[0].data).toEqual({ tone: 'warning' });
});

it('uses a custom preset seed when a slash command replaces its query', async () => {
  const user = userEvent.setup();
  const presets: RichTextPreset[] = [{ type: 'notice', label: 'Notice', create: () => ({ content: [{ text: 'Prepared content' }], data: { tone: 'info' } }), render: ({ block }) => <p>{block.content?.map(run => run.text).join('')}</p> }];
  render(<Editor presets={presets}/>);
  const textbox = screen.getByRole('textbox', { name: 'Заметка, блок 1' });
  await user.click(textbox); await user.type(textbox, '/notice{Enter}');
  expect(model().blocks[0]).toMatchObject({ type: 'notice', content: [{ text: 'Prepared content' }], data: { tone: 'info' } });
  expect(screen.getByText('Prepared content')).toBeInTheDocument();
});

const documentWithThreeBlocks = (): RichTextDocument => ({ blocks: [
  { id: 'a', type: 'paragraph', content: [{ text: 'Alpha', marks: ['bold'] }] },
  { id: 'b', type: 'paragraph', content: [{ text: 'Beta' }] },
  { id: 'c', type: 'callout', content: [{ text: 'Custom' }], data: { tone: 'info', nested: [1, 2] } },
] });
function pointer(target: HTMLElement, name: string, y: number, x = 10) {
  fireEvent(target, new MouseEvent(name, { bubbles: true, button: 0, clientX: x, clientY: y }));
}
function measureRows() {
  document.querySelectorAll<HTMLElement>('.cap-rich-editor-row').forEach((row, i) => {
    vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({ top: i * 40, bottom: i * 40 + 30, height: 30, left: 0, right: 200, width: 200, x: 0, y: i * 40, toJSON() {} });
  });
}

it('only drags from the grip, previews the insertion point, preserves IDs/data and commits once on drop', async () => {
  const user = userEvent.setup(), initial = documentWithThreeBlocks();
  render(<Editor initial={initial}/>); measureRows();
  const text = screen.getByRole('textbox', { name: 'Заметка, блок 1' });
  pointer(text, 'pointerdown', 5); pointer(text, 'pointermove', 120); pointer(text, 'pointerup', 120);
  expect(model()).toEqual(initial); expect(screen.queryByTestId('block-drop-marker')).toBeNull();
  const handle = screen.getByRole('button', { name: 'Действия с блоком 1' });
  pointer(handle, 'pointerdown', 5); pointer(handle, 'pointermove', 120);
  expect(screen.getByTestId('block-drop-marker')).toHaveAttribute('data-position', 'end'); expect(model()).toEqual(initial);
  pointer(handle, 'pointerup', 120);
  expect(model().blocks).toEqual([initial.blocks[1], initial.blocks[2], initial.blocks[0]]);
  expect(screen.queryByTestId('block-drop-marker')).toBeNull(); expect(screen.queryByRole('menu')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Отменить' })); expect(model()).toEqual(initial);
  await user.click(screen.getByRole('button', { name: 'Повторить' })); expect(model().blocks.map(block => block.id)).toEqual(['b', 'c', 'a']);
});

it('cancels pointer moves with Escape, pointercancel and lost capture without history changes', () => {
  const initial = documentWithThreeBlocks(); render(<Editor initial={initial}/>); measureRows();
  const handle = screen.getByRole('button', { name: 'Действия с блоком 1' });
  for (const cancel of ['Escape', 'pointercancel', 'lostpointercapture']) {
    pointer(handle, 'pointerdown', 5); pointer(handle, 'pointermove', 120);
    if (cancel === 'Escape') fireEvent.keyDown(document, { key: 'Escape' }); else pointer(handle, cancel, 120);
    pointer(handle, 'pointerup', 120);
    expect(model()).toEqual(initial); expect(screen.queryByTestId('block-drop-marker')).toBeNull();
    expect(screen.getByRole('button', { name: 'Отменить' })).toBeDisabled();
  }
});

it('opens the menu on a single grip click and provides type, block formatting, movement and delete', async () => {
  const user = userEvent.setup(); render(<Editor initial={documentWithThreeBlocks()}/>);
  const handle = screen.getByRole('button', { name: 'Действия с блоком 2' });
  await user.click(handle);
  expect(screen.getByRole('menu', { name: 'Действия с блоком' })).toBeInTheDocument();
  await user.click(screen.getByRole('menuitem', { name: 'Иерархия' })); await user.click(screen.getByRole('menuitemradio', { name: 'Заголовок 2' }));
  expect(model().blocks[1]).toMatchObject({ id: 'b', type: 'heading2', content: [{ text: 'Beta' }] });
  await user.click(handle); await user.click(screen.getByRole('menuitem', { name: 'Формат' })); await user.click(screen.getByRole('menuitem', { name: 'Курсив' }));
  expect(model().blocks[1].content).toEqual([{ text: 'Beta', marks: ['italic'] }]);
  await user.click(handle); await user.click(screen.getByRole('menuitem', { name: 'Удалить блок' }));
  expect(model().blocks.map(block => block.id)).toEqual(['a', 'c']);
  await user.click(screen.getByRole('button', { name: 'Отменить' })); expect(model().blocks[1].id).toBe('b');
});

it('formats only a saved selection from the block menu and keeps it after reordering', async () => {
  const user = userEvent.setup(); render(<Editor initial={documentWithThreeBlocks()}/>); measureRows();
  const textbox = screen.getByRole('textbox', { name: 'Заметка, блок 2' }); textbox.focus();
  const selection = window.getSelection()!, range = document.createRange(); range.setStart(textbox.firstChild!, 1); range.setEnd(textbox.firstChild!, 3); selection.removeAllRanges(); selection.addRange(range);
  const handle = screen.getByRole('button', { name: 'Действия с блоком 2' });
  await user.click(handle); expect(screen.getByRole('group', { name: 'Формат выделения' })).toBeInTheDocument();
  await user.click(screen.getByRole('menuitem', { name: 'Формат' })); await user.click(screen.getByRole('menuitem', { name: 'Курсив' }));
  expect(model().blocks[1].content).toEqual([{ text: 'B' }, { text: 'et', marks: ['italic'] }, { text: 'a' }]);
  pointer(handle, 'pointerdown', 45); pointer(handle, 'pointermove', 0); pointer(handle, 'pointerup', 0);
  expect(model().blocks[0].id).toBe('b'); expect(selection.toString()).toBe('et');
});

it('supports keyboard grip moves, menu navigation, Escape focus restore and local portal context', async () => {
  const user = userEvent.setup();
  render(<div data-theme="dark" data-accent="purple" data-borders="on" data-radius="rounded"><Editor initial={documentWithThreeBlocks()}/></div>);
  const handle = screen.getByRole('button', { name: 'Действия с блоком 2' }); handle.focus();
  await user.keyboard('{Alt>}{ArrowUp}{/Alt}'); expect(model().blocks.map(block => block.id)).toEqual(['b', 'a', 'c']); expect(handle).toHaveFocus();
  await user.keyboard('{Enter}');
  const menu = screen.getByRole('menu'); expect(menu).toHaveAttribute('data-theme', 'dark'); expect(menu).toHaveAttribute('data-accent', 'purple'); expect(menu).toHaveAttribute('data-surface', 'floating'); expect(menu).toHaveAttribute('data-radius', 'rounded');
  await user.keyboard('{End}'); expect(screen.getByRole('menuitem', { name: 'Удалить блок' })).toHaveFocus();
  await user.keyboard('{Home}'); expect(screen.getByRole('menuitem', { name: 'Иерархия' })).toHaveFocus();
  await user.keyboard('{Escape}'); expect(screen.queryByRole('menu')).toBeNull(); expect(handle).toHaveFocus();
});

it('keeps literal slash text when converting via menu, supports empty documents and hides read-only handles', async () => {
  const user = userEvent.setup();
  const view = render(<Editor initial={{ blocks: [] }}/>);
  const textbox = screen.getByRole('textbox', { name: 'Заметка, блок 1' }); await user.click(textbox); await user.type(textbox, '/literal'); await user.keyboard('{Escape}');
  expect(richTextPlainText(model())).toBe('/literal');
  await user.click(screen.getByRole('button', { name: 'Действия с блоком 1' })); await user.click(screen.getByRole('menuitem', { name: 'Иерархия' })); await user.click(screen.getByRole('menuitemradio', { name: 'Заголовок 1' }));
  expect(model().blocks[0].content).toEqual([{ text: '/literal' }]);
  view.rerender(<Editor readOnly/>); expect(screen.queryByRole('button', { name: /Действия с блоком/ })).toBeNull();
});

it('does not reseed a custom block when its existing type is chosen', async () => {
  const user = userEvent.setup(), initial = documentWithThreeBlocks();
  const create = vi.fn(() => ({ data: { reset: true } }));
  const presets: RichTextPreset[] = [{ type: 'callout', label: 'Врезка', create, render: ({ block }) => <div>{JSON.stringify(block.data)}</div> }];
  render(<Editor initial={initial} presets={presets}/>);
  await user.click(screen.getByRole('button', { name: 'Действия с блоком 3' }));
  await user.click(screen.getByRole('menuitemradio', { name: 'Врезка' }));
  expect(model()).toEqual(initial); expect(screen.getByRole('button', { name: 'Действия с блоком 3' })).toHaveFocus();
  expect(create).not.toHaveBeenCalled();
});

it('can set the first block type before typing into an empty controlled document', async () => {
  const user = userEvent.setup(); render(<Editor initial={{ blocks: [] }}/>);
  await user.click(screen.getByRole('button', { name: 'Действия с блоком 1' }));
  await user.click(screen.getByRole('menuitem', { name: 'Иерархия' })); await user.click(screen.getByRole('menuitemradio', { name: 'Заголовок 2' }));
  expect(model().blocks).toHaveLength(1); expect(model().blocks[0].type).toBe('heading2');
  expect(screen.getByRole('textbox', { name: 'Заметка, блок 1' })).toHaveFocus();
});


it('keeps the static toolbar opt-in and localizes built-in text without changing consumer labels', () => {
  const value = { blocks: [createRichTextBlock()] };
  const view = render(<LocaleProvider locale="en"><RichTextEditor label="Моя заметка" value={value} onValueChange={() => {}}/></LocaleProvider>);
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  expect(screen.getByRole('textbox', { name: 'Моя заметка, block 1' })).toHaveAttribute('data-placeholder', 'Start writing or type /');
  expect(screen.getByRole('button', { name: 'Add block' })).toBeInTheDocument();
  view.rerender(<LocaleProvider locale="en"><RichTextEditor showToolbar label="Моя заметка" value={value} onValueChange={() => {}}/></LocaleProvider>);
  expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
});

it('selects multiple blocks across text boundaries, copies plain text and replaces selection on paste', () => {
  render(<Editor initial={{ blocks: [createRichTextBlock('paragraph', [{ text: 'Alpha' }]), createRichTextBlock('paragraph', [{ text: 'Beta' }])] }}/>);
  const [first, second] = screen.getAllByRole('textbox'); first.focus();
  const range = document.createRange(); range.setStart(first.firstChild!, 2); range.setEnd(second.firstChild!, 2);
  const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
  fireEvent(document, new Event('selectionchange'));
  expect(document.querySelectorAll('.cap-rich-editor-row[data-selected]')).toHaveLength(2);
  const setData = vi.fn(); fireEvent.copy(first, { clipboardData: { setData } });
  expect(setData).toHaveBeenCalledWith('text/plain', 'pha\nBe');
  fireEvent.paste(first, { clipboardData: { getData: () => '!' } });
  expect(richTextPlainText(model())).toBe('Al!ta'); expect(model().blocks).toHaveLength(1);
});

it('deletes a cross-block selection as one history action and restores it with undo', () => {
  const initial = { blocks: [createRichTextBlock('paragraph', [{ text: 'Alpha' }]), createRichTextBlock('paragraph', [{ text: 'Beta' }])] };
  render(<Editor initial={initial}/>);
  const [first, second] = screen.getAllByRole('textbox'); first.focus();
  const range = document.createRange(); range.setStart(first.firstChild!, 2); range.setEnd(second.firstChild!, 2);
  const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range); fireEvent(document, new Event('selectionchange'));
  fireEvent.keyDown(first, { key: 'Backspace' }); expect(richTextPlainText(model())).toBe('Alta');
  fireEvent.keyDown(first, { key: 'z', ctrlKey: true }); expect(model()).toEqual(initial);
});


it('replaces a cross-block selection through native beforeinput typing', () => {
  render(<Editor initial={{ blocks: [createRichTextBlock('paragraph', [{ text: 'Alpha' }]), createRichTextBlock('paragraph', [{ text: 'Beta' }])] }}/>);
  const [first, second] = screen.getAllByRole('textbox'); first.focus();
  const range = document.createRange(); range.setStart(first.firstChild!, 2); range.setEnd(second.firstChild!, 2);
  const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range); fireEvent(document, new Event('selectionchange'));
  fireEvent(first, new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: '!' }));
  expect(richTextPlainText(model())).toBe('Al!ta');
});


it('extends keyboard text selection across block boundaries and keeps native selection', () => {
  render(<Editor initial={{ blocks: [createRichTextBlock('paragraph', [{ text: 'Alpha' }]), createRichTextBlock('paragraph', [{ text: 'Beta' }])] }}/>);
  const [first] = screen.getAllByRole('textbox'); first.focus();
  const range = document.createRange(); range.setStart(first.firstChild!, 2); range.collapse(true);
  const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
  fireEvent.keyDown(first, { key: 'ArrowDown', shiftKey: true });
  expect(document.querySelectorAll('.cap-rich-editor-row[data-selected]')).toHaveLength(2);
  expect(selection.toString()).toContain('pha');
});


it('extends a mouse drag across separate editable hosts using the pointer caret', async () => {
  render(<Editor initial={{ blocks: [createRichTextBlock('paragraph', [{ text: 'Alpha' }]), createRichTextBlock('paragraph', [{ text: 'Beta' }])] }}/>);
  const [first, second] = screen.getAllByRole('textbox');
  const range = document.createRange(); range.setStart(first.firstChild!, 2); range.collapse(true);
  Object.defineProperty(document, 'caretRangeFromPoint', { configurable: true, value: vi.fn(() => range) });
  fireEvent(first, new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 5, clientY: 5 }));
  range.setStart(second.firstChild!, 2);
  fireEvent(second, new MouseEvent('pointermove', { bubbles: true, button: 0, clientX: 5, clientY: 35 }));
  expect(document.querySelectorAll('.cap-rich-editor-row[data-selected]')).toHaveLength(2);
  expect(window.getSelection()?.toString()).toBe('phaBe');
  fireEvent(second, new MouseEvent('pointerup', { bubbles: true, button: 0, clientX: 5, clientY: 35 }));
  Reflect.deleteProperty(document, 'caretRangeFromPoint');
});


it('cuts all cross-host partial ranges even when browser selection text only includes the first host', () => {
  const initial = { blocks: [createRichTextBlock('paragraph', [{ text: 'Alpha' }]), createRichTextBlock('paragraph', [{ text: 'Beta' }])] };
  render(<Editor initial={initial}/>);
  const [first, second] = screen.getAllByRole('textbox'); first.focus();
  const range = document.createRange(); range.setStart(first.firstChild!, 2); range.setEnd(second.firstChild!, 2);
  const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
  fireEvent(document, new Event('selectionchange'));
  vi.spyOn(selection, 'toString').mockReturnValue('pha');
  const copy = vi.fn(), cut = vi.fn();
  fireEvent.copy(first, { clipboardData: { setData: copy } });
  fireEvent.cut(first, { clipboardData: { setData: cut } });
  expect(copy).toHaveBeenCalledWith('text/plain', 'pha\nBe');
  expect(cut).toHaveBeenCalledWith('text/plain', 'pha\nBe');
  expect(richTextPlainText(model())).toBe('Alta');
  fireEvent.keyDown(first, { key: 'z', ctrlKey: true }); expect(model()).toEqual(initial);
});

it('opens only submenus with ArrowRight and keeps root menu captions hidden', async () => {
  const user = userEvent.setup(); render(<Editor initial={documentWithThreeBlocks()}/>);
  await user.click(screen.getByRole('button', { name: 'Действия с блоком 2' }));
  const menu = screen.getByRole('menu', { name: 'Действия с блоком' });
  expect(menu.querySelector('.cap-rich-editor-menu-caption')).toBeNull();
  expect(screen.getByRole('group', { name: 'Тип блока' })).toBeInTheDocument();
  const remove = screen.getByRole('menuitem', { name: 'Удалить блок' }); remove.focus();
  await user.keyboard('{ArrowRight}');
  expect(model().blocks).toHaveLength(3); expect(remove).toHaveFocus(); expect(menu).toBeInTheDocument();
  screen.getByRole('menuitem', { name: 'Иерархия' }).focus(); await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('menuitemradio', { name: 'Заголовок 1' })).toBeInTheDocument();
  expect(menu.querySelector('.cap-rich-editor-menu-caption')).toHaveTextContent('Иерархия');
});
