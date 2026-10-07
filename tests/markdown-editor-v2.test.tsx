import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarkdownEditorV2 } from '../src/components/markdown-editor-v2';
import { markdownToRichText, richTextToMarkdown } from '../src/components/rich-text-markdown';
import { createRichTextBlock, type RichTextDocument } from '../src/components/rich-text-editor';

function select(element: HTMLElement, start: number, end: number) {
  element.focus(); const range = document.createRange(); range.setStart(element.firstChild!, start); range.setEnd(element.firstChild!, end);
  act(() => {window.getSelection()!.removeAllRanges();window.getSelection()!.addRange(range);document.dispatchEvent(new Event('selectionchange'));});
}
function Fixture({ changed = () => {} }: { changed?: (value: string) => void }) {
  const [value, setValue] = useState('Hello clear world\n');
  return <MarkdownEditorV2 label="Note v2" value={value} onValueChange={next => {setValue(next);changed(next);}}/>;
}

describe('MarkdownEditorV2 contextual tools', () => {
  it('has no static toolbar and changes palettes in place while retaining selected text', async () => {
    const user = userEvent.setup(), changed = vi.fn(); render(<Fixture changed={changed}/>);
    expect(screen.queryByRole('toolbar')).toBeNull();
    select(screen.getByRole('textbox', {name: 'Note v2, блок 1'}), 6, 11);
    await user.click(screen.getByRole('button', {name: 'Цвет текста'}));
    expect(screen.getAllByRole('toolbar')).toHaveLength(1);
    expect(screen.queryByRole('button', {name: 'Полужирный (⌘/Ctrl+B)'})).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Текст: Красный'}));
    expect(changed).toHaveBeenLastCalledWith('Hello <span data-cap-color="red">clear</span> world\n');
    expect(screen.getByRole('button', {name: 'Текст: Красный'})).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', {name: 'Назад к форматированию'}));
    await user.click(screen.getByRole('button', {name: 'Полужирный (⌘/Ctrl+B)'}));
    expect(changed).toHaveBeenLastCalledWith('Hello <span data-cap-color="red">**clear**</span> world\n');
  });

  it('formats a selection spanning multiple editing hosts without changing unselected text', async () => {
    const user = userEvent.setup(), changed = vi.fn();
    function Multi() { const [value, setValue] = useState('First line\n\nSecond line\n'); return <MarkdownEditorV2 label="Multi" value={value} onValueChange={next => {setValue(next);changed(next);}}/>; }
    render(<Multi/>); const first = screen.getByRole('textbox',{name:'Multi, блок 1'}), second = screen.getByRole('textbox',{name:'Multi, блок 2'});
    first.focus(); const range = document.createRange(); range.setStart(first.firstChild!,6);range.setEnd(second.firstChild!,6);
    act(() => {window.getSelection()!.removeAllRanges();window.getSelection()!.addRange(range);document.dispatchEvent(new Event('selectionchange'));});
    await user.click(screen.getByRole('button',{name:'Полужирный (⌘/Ctrl+B)'}));
    expect(changed).toHaveBeenLastCalledWith('First **line**\n\n**Second** line\n');
    expect(window.getSelection()!.toString()).toContain('line');
  });

  it('inserts the keyboard-selected table and serializes edits as Markdown', async () => {
    const user = userEvent.setup(), changed = vi.fn(); render(<Fixture changed={changed}/>);
    select(screen.getByRole('textbox', {name: 'Note v2, блок 1'}), 0, 5);
    await user.click(screen.getByRole('button', {name: 'Вставить таблицу'}));
    const cell = screen.getByRole('button', {name: '2 × 2'}); cell.focus(); await user.keyboard('{ArrowRight}{Enter}');
    expect(screen.getAllByRole('cell')).toHaveLength(3); expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    const input = screen.getByRole('textbox', {name: 'Строка 1, столбец 1'}); fireEvent.change(input, {target:{value:'Name'}});
    expect(changed.mock.lastCall?.[0]).toContain('| Name |  |  |\n| --- | --- | --- |');
    expect(markdownToRichText(changed.mock.lastCall![0], {extensions:true}).blocks[1].type).toBe('table');
  });
});

describe('opt-in Markdown editor extensions', () => {
  it('reopens nested formatting, underline, links, text color and highlight without losing metadata', () => {
    const document: RichTextDocument = {blocks:[createRichTextBlock('paragraph', [{text:'clear', marks:['bold','italic','underline'], color:'red', highlight:'blue', link:'https://example.com'}])]};
    const source = richTextToMarkdown(document), reopened = markdownToRichText(source, {extensions:true});
    expect(reopened.blocks[0].type).toBe('paragraph');
    expect(reopened.blocks[0].content?.[0]).toMatchObject({text:'clear',color:'red',highlight:'blue',link:'https://example.com',marks:expect.arrayContaining(['bold','italic','underline'])});
    expect(richTextToMarkdown(reopened)).toBe(source);
    expect(markdownToRichText(source).blocks[0].type).toBe('markdown-source');
  });
  it('keeps an inserted table separate after a paragraph without a trailing newline', () => {
    const document = markdownToRichText('Final paragraph', {extensions:true});
    document.blocks.push({...createRichTextBlock('table'),data:{rows:[['Name'],['cell']]}});
    const source = richTextToMarkdown(document); expect(source).toContain('Final paragraph\n\n| Name |');
    expect(markdownToRichText(source,{extensions:true}).blocks.map(block => block.type)).toEqual(['paragraph','table']);
    expect(markdownToRichText('Final paragraph\n| Name |\n| --- |\n| cell |\n',{extensions:true}).blocks.map(block => block.type)).toEqual(['paragraph','table']);
  });
  it('preserves table alignment and escaped pipes after editing one cell', () => {
    const source = '| Left | Right |\r\n| :--- | ---: |\r\n| a\\|b | c |\r\n';
    const document = markdownToRichText(source, {extensions:true}); expect(richTextToMarkdown(document)).toBe(source);
    const data = document.blocks[0].data as {rows:string[][]}; expect(data.rows[1][0]).toBe('a|b'); data.rows[1][1] = 'changed';
    expect(richTextToMarkdown(document)).toBe(source.replace(' c |',' changed |'));
  });
  it.each(['toggle','callout','divider'])('reopens %s blocks produced by its block action', type => {
    const block = createRichTextBlock(type, [{text:'Note'}]);
    const source = richTextToMarkdown({blocks:[block]});
    expect(markdownToRichText(source, {extensions:true}).blocks[0].type).toBe(type);
  });
});
