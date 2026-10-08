import { useState } from 'react';
import { MarkdownEditorV2 } from '../src/components/markdown-editor-v2.js';
import { useTranslate } from '../src/components/locale.js';
export function MarkdownEditorV2Example() {
  const t = useTranslate();
  const [value, setValue] = useState(t('# Небольшие идеи, ясные заметки\n\nВыделите несколько слов, чтобы открыть панель форматирования. Она появляется рядом с выделенным текстом.\n\n## Спокойное место для письма\n\nИспользуйте заголовки, списки, ссылки и цвет, чтобы сделать заметку понятнее.\n\n- Запишите идею\n- Дайте ей полезное название\n- Поделитесь, когда она будет готова\n', '# Small ideas, clear notes\n\nSelect a few words to format them. The toolbar follows your selection.\n\n## A calm place to write\n\nUse headings, lists, links and color to make the document easier to read.\n\n- Capture an idea\n- Give it a useful title\n- Share it when it is ready\n'));
  return <MarkdownEditorV2 label={t('Документ Markdown v2', 'Markdown document v2')} value={value} onValueChange={setValue}/>;
}
