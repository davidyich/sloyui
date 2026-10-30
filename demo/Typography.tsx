import { useState } from 'react';
import { SegmentedControl, Tag, useTranslate, type Surface } from '../src';
import { formatTokenValue, resolveTokenValue, tokenGraph } from './token-v4-data';
import './foundations-v10.css';
import './token-system-v4.css';

const fontRoles = [
  { role: 'base', roles: 'base / heading', css: '--cap-font-sans', purpose: 'Интерфейс и заголовки', en: 'Interface and headings', sample: 'Заметки, идеи, связи', sampleEn: 'Notes, ideas, connections' },
  { role: 'code', roles: 'code / pair', css: '--cap-font-code', purpose: 'Код и технические значения', en: 'Code and technical values', sample: 'const ideas = 12;', sampleEn: 'const ideas = 12;' },
];
export default function Typography({surface='content'}:{surface?:Surface}) {
  const t = useTranslate();
  const [mode, setMode] = useState('interface');
  const [weight, setWeight] = useState('400');
  const sizes = tokenGraph.collections.find(collection => collection.key === 'Primitives')!.variables.filter(variable => variable.name.startsWith('font/size/')).slice().reverse();
  return <div className="cap-typography-page cap-v4-page">
    <header className="page-intro"><h1>{t('Типографика', 'Typography')}</h1><p>{t('Чёткая иерархия, спокойный ритм и две гарнитуры. Посмотрите, как текст работает в интерфейсе и при длинном чтении.', 'Clear hierarchy, a steady rhythm and two font families. See how text works in an interface and in longer reading.')}</p></header>
    <section className="cap-typography-specimen cap-surface-boundary" data-surface={surface} aria-label={t('Живой пример типографики', 'Live typography sample')}>
      <div className="cap-typography-specimen-controls"><SegmentedControl label={t('Назначение типографики', 'Typography purpose')} size="sm" value={mode} onValueChange={setMode} options={[{ value: 'interface', label: 'Interface' }, { value: 'prose', label: 'Prose' }]}/><SegmentedControl label={t('Насыщенность примера', 'Sample font weight')} size="sm" value={weight} onValueChange={setWeight} options={[{ value: '400', label: '400' }, { value: '500', label: '500' }, { value: '600', label: '600' }]}/></div>
      <div className="cap-typography-specimen-copy" data-typography={mode} style={{ fontWeight: Number(weight) }}><Tag size="sm" color="neutral" interactive={false}>{t('РАБОЧИЕ ЗАМЕТКИ', 'WORKING NOTES')}</Tag><h2>{t('Место для ясных мыслей', 'Room for clear thinking')}</h2><p>{t('Сохраните наблюдение, найдите связь и вернитесь к идее. Хорошая типографика помогает увидеть главное и спокойно следовать за текстом.', 'Keep an observation, find a connection and return to an idea. Good typography helps readers see what matters and follow the text comfortably.')}</p><span className="cap-typography-specimen-caption">{t('Сегодня · 12 заметок · 4 минуты чтения', 'Today · 12 notes · 4 minute read')}</span></div>
    </section>
    <section className="cap-v4-section"><div className="cap-typography-heading"><div><h2>{t('Семейства шрифтов', 'Font families')}</h2><p>{t('Семантические роли хранятся в Primitives/font и не зависят от Density.', 'Semantic roles live in Primitives/font and do not depend on Density.')}</p></div></div><div className="cap-typography-font-grid">{fontRoles.map(font => <article className="cap-typography-font-card cap-surface-boundary" key={font.role} data-font-role={font.role}><header><strong>{font.roles}</strong><span>{formatTokenValue(resolveTokenValue(`Primitives/font/family/${font.role}`))}</span></header><p className="cap-typography-font-sample" style={{ fontFamily: `var(${font.css})` }}>{t(font.sample, font.sampleEn)}</p><p className="cap-typography-font-purpose">{t(font.purpose, font.en)}</p><code>Primitives/font/family/{font.role}</code></article>)}</div></section>
    <section className="cap-v4-section"><div className="cap-typography-heading"><div><h2>{t('Шкала и ритм чтения', 'Type scale and reading rhythm')}</h2><p>{t('400 / 500 / 600 — обычные веса. Compact меняет отступы и контролы, сохраняя размер текста и строку. Prose добавляет межстрочный интервал для длинного чтения.', '400 / 500 / 600 are the core weights. Compact changes spacing and controls while retaining text size and line height. Prose adds line spacing for sustained reading.')}</p></div></div>
      <div className="cap-typography-scale" data-typography={mode}>{sizes.map(variable => {
        const role = variable.name.split('/').at(-1)!;
        const size = resolveTokenValue(`Primitives/${variable.name}`) as number;
        const height = resolveTokenValue(`Primitives/font/line-height/${role}`) as number;
        const sample = role === 'caption' ? t('Обновлено сегодня · 12 записей', 'Updated today · 12 entries') : size >= 24 ? t('Идеи обретают форму', 'Ideas take shape') : t('Запишите наблюдение и сохраните источник. Чёткая структура помогает вернуться к мысли.', 'Write down an observation and keep its source. Clear structure helps you return to the idea.');
        return <div className="cap-typography-row" key={role}><div className="cap-typography-meta"><strong>{role}</strong><span>{size} / {mode === 'prose' ? height + 4 : height} px</span><code>Primitives/{variable.name}</code></div><p style={{ fontSize: `${size}px`, lineHeight: `${mode === 'prose' ? height + 4 : height}px`, fontWeight: Number(weight) }}>{sample}</p></div>;
      })}</div>
      {mode === 'prose' && <article className="cap-typography-prose cap-surface-boundary"><h3>{t('Пример длинного текста', 'A longer reading sample')}</h3><p>{t('Каждая заметка начинается с наблюдения. Сохраните мысль так, чтобы к ней было легко вернуться. Короткие абзацы, ясная иерархия и спокойный ритм помогают следить за текстом.', 'Every note starts with an observation. Keep the idea in a form that is easy to return to. Short paragraphs, clear hierarchy and steady spacing help readers follow the text.')}</p><p>{t('Не нужно записывать всё сразу. Оставьте место для следующей мысли, а источник сохраните рядом: контекст делает заметку полезной спустя время.', 'There is no need to capture everything at once. Leave room for the next thought and keep the source close: context makes a note useful over time.')}</p></article>}
    </section>
  </div>;
}
