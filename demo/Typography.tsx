import { useState, type CSSProperties } from 'react';
import { SegmentedControl, useTranslate } from '../src';
import './foundations-v10.css';

const typeScale = [
  { name: '4xl', size: 36, interfaceHeight: 44, proseHeight: 48 },
  { name: '3xl', size: 28, interfaceHeight: 36, proseHeight: 40 },
  { name: '2xl', size: 22, interfaceHeight: 30, proseHeight: 34 },
  { name: 'xl', size: 18, interfaceHeight: 26, proseHeight: 32 },
  { name: 'lg', size: 16, interfaceHeight: 24, proseHeight: 28 },
  { name: 'base', size: 14, interfaceHeight: 20, proseHeight: 24 },
  { name: 'sm', size: 13, interfaceHeight: 18, proseHeight: 23 },
  { name: 'xs', size: 12, interfaceHeight: 16, proseHeight: 20 },
] as const;
type TypographyMode = 'interface' | 'prose';

export default function Typography() {
  const t = useTranslate();
  const [mode, setMode] = useState<TypographyMode>('interface');
  const interfaceSamples = [
    t('Место для новых идей', 'A place for new ideas'),
    t('Структура помогает думать', 'Structure helps you think'),
    t('Заголовок раздела', 'Section heading'),
    t('Детали, к которым возвращаются', 'Details worth returning to'),
    t('Рабочее пространство команды', 'The team workspace'),
    t('Содержимое заметки и основной текст интерфейса.', 'Note content and primary interface text.'),
    t('Компактные элементы и подписи.', 'Compact controls and labels.'),
    t('Обновлено сегодня · 12 объектов', 'Updated today · 12 objects'),
  ];
  const proseSamples = [
    t('Идеи обретают форму', 'Ideas take shape'),
    t('От наблюдения к замыслу', 'From observation to intention'),
    t('Пространство для размышления', 'Room for reflection'),
    t('Хороший текст помогает увидеть связи между идеями. Свободный межстрочный интервал поддерживает спокойный ритм чтения.', 'Good writing helps reveal connections between ideas. Generous line spacing supports a steady reading rhythm.'),
    t('Запишите наблюдение, сохраните источник и вернитесь к мысли позже. Постепенно отдельные заметки складываются в понятную историю.', 'Write down an observation, keep its source and return to the thought later. Individual notes gradually become a coherent story.'),
    t('У текста есть собственный ритм. Короткие абзацы, ясная иерархия и удобная длина строки помогают следить за мыслью автора.', 'Text has its own rhythm. Short paragraphs, clear hierarchy and a comfortable line length help readers follow the author’s thought.'),
    t('Пояснение дополняет основной текст: раскрывает деталь, даёт контекст и оставляет место для следующей мысли.', 'A supporting note expands the main text: it reveals a detail, adds context and leaves room for the next thought.'),
    t('Подпись к иллюстрации или примечание к источнику.', 'An image caption or a source note.'),
  ];
  return <div className="cap-typography-page">
    <header className="page-intro"><h1>{t('Типографика', 'Typography')}</h1><p>{t('Inter для интерфейса и текста, Overpass Mono для кода. Основные веса — 400, 500 и 600. Две шкалы межстрочного интервала используют общие размеры шрифта.', 'Inter for interfaces and text, Overpass Mono for code. The core weights are 400, 500 and 600. Two line-height scales share the same font sizes.')}</p></header>
    <div className="cap-typography-family-grid">
      <div data-surface="raised" className="cap-typography-family cap-surface-boundary"><span>Inter</span><p>{t('Аа Бб 0123', 'Aa Bb 0123')}</p><small>400 · 500 · 600</small></div>
      <div data-surface="raised" className="cap-typography-family cap-typography-code cap-surface-boundary"><span>Overpass Mono</span><p>{t('Аа Бб 0123', 'Aa Bb 0123')}</p><small>const ideas = 12;</small></div>
    </div>
    <section aria-label={t('Шкала типографики', 'Typography scale')}>
      <div className="cap-typography-heading"><div><h2>{mode === 'interface' ? 'Interface' : 'Prose'}</h2><p>{mode === 'interface' ? t('Компактный ритм для контролов, меню, подписей и рабочих экранов.', 'Compact spacing for controls, menus, labels and workspaces.') : t('Больше воздуха для статей, заметок и длинного чтения. Рекомендуемая длина строки — до 70 символов.', 'More room for articles, notes and sustained reading. Keep lines within about 70 characters.')}</p></div><SegmentedControl label={t('Назначение типографики', 'Typography purpose')} size="sm" value={mode} onValueChange={value => setMode(value as TypographyMode)} options={[{ value:'interface', label:'Interface' }, { value:'prose', label:'Prose' }]}/></div>
      <div className="cap-typography-scale" data-typography={mode}>{typeScale.map((item,index) => {
        const lineHeightToken = mode === 'prose' ? `--cap-prose-line-height-${item.name}` : `--cap-line-height-${item.name}`;
        const style: CSSProperties = { fontSize:`var(--cap-font-size-${item.name})`, lineHeight:`var(${lineHeightToken})`, maxWidth: mode === 'prose' ? '70ch' : undefined };
        return <div className="cap-typography-row" key={item.name}><div className="cap-typography-meta"><strong>{item.name}</strong><span>{item.size} / {mode === 'prose' ? item.proseHeight : item.interfaceHeight} px</span><code>{lineHeightToken}</code></div><p style={style}>{mode === 'prose' ? proseSamples[index] : interfaceSamples[index]}</p></div>;
      })}</div>
      {mode === 'prose' && <article data-surface="raised" className="cap-typography-prose cap-surface-boundary"><h3>{t('Пример длинного текста', 'A longer reading sample')}</h3><p>{t('Каждая заметка начинается с небольшого наблюдения. Не обязательно сразу искать окончательную формулировку: достаточно сохранить мысль так, чтобы к ней было легко вернуться.', 'Every note begins with a small observation. There is no need to find the final wording immediately: just keep the thought in a form that is easy to return to.')}</p><p>{t('Когда похожие идеи встречаются рядом, между ними появляются связи. Чёткая структура и спокойный ритм текста помогают замечать эти связи, сравнивать детали и находить следующий шаг.', 'When related ideas sit together, connections begin to emerge. Clear structure and a steady reading rhythm help you notice those connections, compare details and find the next step.')}</p></article>}
    </section>
  </div>;
}
