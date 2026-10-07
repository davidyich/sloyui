import { useState } from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { Button, Icon, Tag, Tabs, Textarea } from '../src';
import { RichTextEditor, createRichTextBlock, type RichTextDocument, type RichTextPreset } from '../src/components/rich-text-editor';
import { MarkdownRichTextEditor } from '../src/components/markdown-rich-text-editor';
import { StorySection } from './stories-controls';

const initial: RichTextDocument = { blocks: [
  createRichTextBlock('heading1', [{ text: 'Сад идей' }]),
  createRichTextBlock('paragraph', [{ text: 'Свободный редактор для заметок, ' }, { text: 'набросков', marks: ['bold'] }, { text: ' и структурированных блоков.' }]),
  createRichTextBlock('heading2', [{ text: 'Следующие шаги' }]),
  createRichTextBlock('bullet', [{ text: 'Собрать важные наблюдения' }]),
  createRichTextBlock('bullet', [{ text: 'Сгруппировать их по темам' }]),
  createRichTextBlock('quote', [{ text: 'Мысль получает форму во время записи.' }]),
] };

const presets: RichTextPreset[] = [{
  type: 'callout', label: 'Врезка', keywords: ['note', 'callout'], icon: Info,
  create: () => ({ data: { tone: 'info', text: 'Важная заметка' } }),
  render: ({ block, disabled, readOnly, onDataChange }) => {
    const data = block.data as { tone: 'info' | 'warning'; text: string } | undefined;
    const tone = data?.tone ?? 'info';
    return <div className="cap-surface-boundary" data-accent={tone === 'warning' ? 'amber' : 'blue'} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: 12, borderRadius: 'var(--cap-radius-base)', background: 'var(--cap-accent-normal)', color: 'var(--cap-accent-text)' }}>
      <Icon name={tone === 'warning' ? TriangleAlert : Info}/>
      <span>{data?.text ?? 'Врезка'}</span>
      <Tag interactive={false} size="xs">{tone === 'warning' ? 'Предупреждение' : 'Заметка'}</Tag>
      {!disabled && !readOnly && <Button variant="ghost" size="xs" onClick={() => onDataChange({ tone: tone === 'info' ? 'warning' : 'info', text: data?.text ?? 'Врезка' })}>Сменить тон</Button>}
    </div>;
  },
}];

export function RichTextEditorStory() {
  const [value, setValue] = useState(initial);
  const [markdown, setMarkdown] = useState('# Инструкции\n\nОбычный **текст** и `код`.\n\n```ts\nconst ready = true;\n```\n\n| Ключ | Значение |\n| --- | --- |\n| mode | rich |\n');
  const [mode, setMode] = useState('rich');
  return <>
    <StorySection title="Редактирование блоков">
      <p className="catalog-muted">Наберите / в пустом блоке, чтобы выбрать тип. Выделите текст для форматирования; перетащите блок за появляющуюся слева ручку. Клик по ручке открывает тип, формат и удаление; Alt+↑/↓ на ручке или Ctrl/Cmd+Shift+↑/↓ в тексте меняет порядок. Escape отменяет перетаскивание.</p>
      <RichTextEditor label="Заметка проекта" value={value} onValueChange={setValue} presets={presets} toolbarSize="sm"/>
    </StorySection>
    <StorySection title="Markdown без потери исходника"><p className="catalog-muted">Простые блоки редактируются визуально; таблицы, ссылки и сложная разметка остаются блоками исходного Markdown. Нетронутые блоки сохраняются дословно.</p><Tabs label="Режим Markdown-примера" variant="segment" value={mode} onValueChange={setMode} items={[{value:'rich',label:'Rich edit',content:null},{value:'markdown',label:'Markdown',content:null}]}/>{mode === 'rich' ? <MarkdownRichTextEditor label="Инструкции проекта" value={markdown} onValueChange={setMarkdown}/> : <Textarea label="Markdown инструкций" value={markdown} onChange={event => setMarkdown(event.target.value)} rows={12}/>}</StorySection>
    <StorySection title="Только чтение"><RichTextEditor label="Опубликованная заметка" value={value} onValueChange={setValue} presets={presets} readOnly/></StorySection>
  </>;
}
