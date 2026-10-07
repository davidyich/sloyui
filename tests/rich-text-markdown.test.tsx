import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { markdownToRichText, richTextToMarkdown, preserveMarkdownSourceEdit } from '../src/components/rich-text-markdown';
import { MarkdownRichTextEditor } from '../src/components/markdown-rich-text-editor';
import { createRichTextBlock } from '../src/components/rich-text-editor';

describe('Markdown source bridge', () => {
  it.each([
    '', '\n\r\n', '# Title\r\n\r\nParagraph with **bold** and `code`.\r\n',
    '\n  ## Heading ##\n\n+ first\n2. second\n> quote\n\n',
    '```rust\nfn main() {}\n```\n\n', '~~~js\nconst value = 1;\n~~~',
    '```js\nunclosed\n', '[link](https://example.com)\n\n![image](asset.png)\n',
    'Column | Column\n--- | ---\ncell | cell\n', '<details>\n<summary>Raw HTML</summary>\n</details>\n',
    '- [x] done\n  - nested\n\n[ref]: https://example.com\n', 'Title\n=====\n\nText  \nnext\n',
    '---\ntitle: Draft\n---\n\nEscaped \\*text\\*\n',
  ])('round-trips every untouched byte in %j', source => {
    expect(richTextToMarkdown(markdownToRichText(source))).toBe(source);
  });

  it('edits a supported block without rewriting adjacent unsupported source or separators', () => {
    const source = '# Title\r\n\r\n| Left | Right |\r\n| --- | --- |\r\n| a | b |\r\n\r\n[ref]: https://example.com\r\n';
    const document = markdownToRichText(source);
    document.blocks[0].content = [{ text: 'Updated' }];
    expect(richTextToMarkdown(document)).toBe(source.replace('# Title', '# Updated'));
    expect(document.blocks.filter(block => block.type === 'markdown-source')).toHaveLength(2);
  });

  it('preserves unknown fence languages and grows a fence to safely contain edited delimiters', () => {
    const document = markdownToRichText('~~~rust\nfn main() {}\n~~~\n');
    document.blocks[0].content = [{ text: '~~~\nchanged' }];
    expect(richTextToMarkdown(document)).toBe('~~~~rust\n~~~\nchanged\n~~~~\n');
    document.blocks[0].data = { codeLanguage: 'ts' };
    expect(richTextToMarkdown(document)).toContain('~~~~ts\n');
  });

  it('serializes inserted rich marks and code without interpreting HTML', () => {
    const document = { blocks: [createRichTextBlock('paragraph', [{ text: '<safe>' }, { text: 'bold', marks: ['bold'] }]), createRichTextBlock('code', [{ text: '```\nconst x = 1;' }])] };
    expect(richTextToMarkdown(document)).toBe('\\<safe\\>**bold**\n\n````\n```\nconst x = 1;\n````\n');
  });
});

it('edits source-backed code through CodeBlock and retains exact untouched blocks', async () => {
  const user = userEvent.setup(), changed = vi.fn();
  function Editor() { const [value, setValue] = useState('# Note\n\n```js\nconst x = 1;\n```\n\n[ref]: /exact\n'); return <MarkdownRichTextEditor label="Markdown note" value={value} onValueChange={next => {setValue(next);changed(next);}}/>; }
  const { container } = render(<Editor/>);
  const textbox = screen.getByRole('textbox', { name: 'Markdown note, блок 2' });
  expect(textbox.closest('.cap-code')).toBeTruthy();
  textbox.textContent = 'const x = 2;'; fireEvent.input(textbox);
  expect(changed).toHaveBeenLastCalledWith('# Note\n\n```js\nconst x = 2;\n```\n\n[ref]: /exact\n');
  await user.click(container.querySelector('.cap-code-actions button[aria-label="Действия с кодом"]')!);
  await user.click(screen.getByRole('menuitem', { name: 'Переносить строки' }));
  expect(textbox.closest('.cap-code')).toHaveAttribute('data-wrap');
});


it('preserves mixed original line endings around textarea source edits', () => {
  const previous = '# Old\r\n\r\nParagraph\n\nEnd\r';
  expect(preserveMarkdownSourceEdit(previous, '# New\n\nParagraph\n\nEnd\n')).toBe(previous.replace('Old', 'New'));
  expect(preserveMarkdownSourceEdit(previous, '# Old\n\nParagraph\n\nEnd\n')).toBe(previous);
});


it('keeps reordered unterminated source blocks separate', () => {
  const document = markdownToRichText('# First\n\n# Last');
  document.blocks.reverse();
  expect(richTextToMarkdown(document)).toBe('\n# Last\n\n# First\n');
});

it('escapes new paragraph block markers rather than creating unintended headings or lists', () => {
  expect(richTextToMarkdown({ blocks: [createRichTextBlock('paragraph', [{ text: '# literal\n2. literal' }])] })).toBe('\\# literal\n2\\. literal\n');
});
