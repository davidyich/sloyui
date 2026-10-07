import { useEffect, useRef, useState } from 'react';
import { RichTextEditor, type RichTextEditorProps, type RichTextDocument } from './rich-text-editor.js';
import { markdownToRichText, richTextToMarkdown } from './rich-text-markdown.js';

export interface MarkdownRichTextEditorProps extends Omit<RichTextEditorProps, 'value' | 'onValueChange' | 'presets'> {
  value: string;
  onValueChange: (value: string) => void;
}
/** Source-preserving Markdown adapter around the canonical block editor. */
export function MarkdownRichTextEditor({ value, onValueChange, ...props }: MarkdownRichTextEditorProps) {
  const [document, setDocument] = useState(() => markdownToRichText(value));
  const [generation, setGeneration] = useState(0);
  const knownValue = useRef(value);
  useEffect(() => {
    if (value === knownValue.current) return;
    knownValue.current = value; setDocument(markdownToRichText(value)); setGeneration(item => item + 1);
  }, [value]);
  const change = (next: RichTextDocument) => {
    const markdown = richTextToMarkdown(next);
    knownValue.current = markdown; setDocument(next); onValueChange(markdown);
  };
  return <RichTextEditor key={generation} {...props} value={document} onValueChange={change}/>;
}
