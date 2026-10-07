import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RichTextEditor, type RichTextEditorProps, type RichTextDocument, type RichTextPreset } from './rich-text-editor.js';
import { markdownToRichText, richTextToMarkdown } from './rich-text-markdown.js';
import { Input } from './forms.js';
import { ChevronRight, Info, Minus, Table2 } from 'lucide-react';
import { useTranslate } from './locale.js';

export interface MarkdownEditorV2Props extends Omit<RichTextEditorProps, 'value' | 'onValueChange' | 'presets' | 'showToolbar' | 'uiVariant'> {
  value: string;
  onValueChange: (value: string) => void;
}
function TableCell({header,children}:{header:boolean;children:ReactNode}) {return header ? <th scope="col">{children}</th> : <td>{children}</td>;}

/** Contextual selection tools over the shared source-preserving Markdown engine. */
export function MarkdownEditorV2({ value, onValueChange, toolbarSize = 'xs', ...props }: MarkdownEditorV2Props) {
  const t = useTranslate();
  const [document, setDocument] = useState(() => markdownToRichText(value, { extensions: true }));
  const [generation, setGeneration] = useState(0);
  const knownValue = useRef(value);
  useEffect(() => { if (value !== knownValue.current) {knownValue.current = value;setDocument(markdownToRichText(value, { extensions: true }));setGeneration(n => n + 1);} }, [value]);
  const presets: RichTextPreset[] = [
    { type: 'toggle', icon: ChevronRight, label: t('Сворачиваемый блок', 'Toggle') },
    { type: 'callout', icon: Info, label: t('Выноска', 'Callout') },
    { type: 'divider', icon: Minus, label: t('Разделитель', 'Divider'), render: () => <hr className="cap-markdown-v2-rule"/> },
    { type: 'table', icon: Table2, label: t('Таблица', 'Table'), render: ({ block, readOnly, disabled, onDataChange }) => {
      const rows = (block.data as { rows?: string[][] } | undefined)?.rows ?? [['']];
      return <div className="cap-markdown-v2-table-scroll"><table className="cap-markdown-v2-table"><tbody>{rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <TableCell key={c} header={r === 0}>{readOnly || disabled ? cell : <Input size="sm" aria-label={`${t('Строка', 'Row')} ${r + 1}, ${t('столбец', 'column')} ${c + 1}`} variant="ghost" value={cell} onChange={event => onDataChange({...(block.data && typeof block.data === 'object' && !Array.isArray(block.data) ? block.data : {}), rows: rows.map((current, i) => i === r ? current.map((text, j) => j === c ? event.target.value : text) : current)})}/>}</TableCell>)}</tr>)}</tbody></table></div>;
    } },
  ];
  const change = (next: RichTextDocument) => { const markdown = richTextToMarkdown(next);knownValue.current = markdown;setDocument(next);onValueChange(markdown); };
  return <RichTextEditor key={generation} {...props} value={document} onValueChange={change} uiVariant="context" toolbarSize={toolbarSize} presets={presets}/>;
}
