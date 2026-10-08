import { useCatalogText, localizeCatalogueFixture } from './catalog-locale';
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

const presets = (ct:(text:string)=>string): RichTextPreset[] => [{
  type: 'callout', label: ct('Врезка'), keywords: ['note', 'callout'], icon: Info,
  create: () => ({ data: { tone: 'info', text: ct('Важная заметка') } }),
  render: ({ block, disabled, readOnly, onDataChange }) => {
    const data = block.data as { tone: 'info' | 'warning'; text: string } | undefined;
    const tone = data?.tone ?? 'info';
    return <div className="cap-surface-boundary" data-accent={tone === 'warning' ? 'amber' : 'blue'} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: 12, borderRadius: 'var(--cap-radius-base)', background: 'var(--cap-accent-normal)', color: 'var(--cap-accent-text)' }}>
      <Icon name={tone === 'warning' ? TriangleAlert : Info}/>
      <span>{data?.text ?? ct('Врезка')}</span>
      <Tag interactive={false} size="xs">{tone === 'warning' ? ct('Предупреждение') : ct('Заметка')}</Tag>
      {!disabled && !readOnly && <Button variant="ghost" size="xs" onClick={() => onDataChange({ tone: tone === 'info' ? 'warning' : 'info', text: data?.text ?? ct('Врезка') })}>{ct("Сменить тон")}</Button>}
    </div>;
  },
}];

export function RichTextEditorStory() {
 const ct=useCatalogText();

  const [value, setValue] = useState(localizeCatalogueFixture(initial,ct));
  const [markdown, setMarkdown] = useState('# Инструкции\n\nОбычный **текст** и `код`.\n\n```ts\nconst ready = true;\n```\n\n| Ключ | Значение |\n| --- | --- |\n| mode | rich |\n');
  const [mode, setMode] = useState('rich');
  return <>
    <StorySection title={ct("Редактирование блоков")}>
      <p className="catalog-muted">{ct("Наберите / в пустом блоке, чтобы выбрать тип. Выделите текст для форматирования; перетащите блок за появляющуюся слева ручку. Клик по ручке открывает тип, формат и удаление; Alt+↑/↓ на ручке или Ctrl/Cmd+Shift+↑/↓ в тексте меняет порядок. Escape отменяет перетаскивание.")}</p>
      <RichTextEditor label={ct("Заметка проекта")} value={value} onValueChange={setValue} presets={presets(ct)} toolbarSize="sm"/>
    </StorySection>
    <StorySection title={ct("Markdown без потери исходника")}><p className="catalog-muted">{ct("Простые блоки редактируются визуально; таблицы, ссылки и сложная разметка остаются блоками исходного Markdown. Нетронутые блоки сохраняются дословно.")}</p><Tabs label={ct("Режим Markdown-примера")} variant="segment" value={mode} onValueChange={setMode} items={[{value:'rich',label:'Rich edit',content:null},{value:'markdown',label:'Markdown',content:null}]}/>{mode === 'rich' ? <MarkdownRichTextEditor label={ct("Инструкции проекта")} value={markdown} onValueChange={setMarkdown}/> : <Textarea label={ct("Markdown инструкций")} value={markdown} onChange={event => setMarkdown(event.target.value)} rows={12}/>}</StorySection>
    <StorySection title={ct("Только чтение")}><RichTextEditor label={ct("Опубликованная заметка")} value={value} onValueChange={setValue} presets={presets(ct)} readOnly/></StorySection>
  </>;
}
