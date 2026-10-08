import { useState, type CSSProperties } from 'react';
import { Button, IconBox, Input, SegmentedControl, ScrollArea, Switch, Tag, colors, useTranslate, type Color } from '../src';
import palettes from '../src/tokens/accents.json';
import './palette-layout.css';
import './foundations-v10.css';

const surfaces = ['canvas', 'base', 'raised', 'floating'] as const;
const states = ['normal', 'hover', 'pressed', 'disabled'] as const;
const paletteNames: Color[] = ['neutral', ...colors.filter(color => color !== 'neutral' && color !== 'gray')];
type PaletteView = 'rows' | 'columns';

export default function ColorsV2({ theme, accent, copy }: { theme: 'light' | 'dark'; accent: Color; copy: (value: string) => void }) {
  const t = useTranslate();
  const [paletteView, setPaletteView] = useState<PaletteView>('rows');
  const [wrapPalettes, setWrapPalettes] = useState(true);
  const [actions, setActions] = useState(0);
  const [selectedShade, setSelectedShade] = useState<string | null>(null);
  const copyToken = (token: string) => copy(`var(${token})`);
  const tokenList = (tokens: string[]) => <div className="cap-foundation-token-list">{tokens.map(token => <button type="button" key={token} onClick={() => copyToken(token)} aria-label={`${t('Скопировать', 'Copy')} ${token}`}><code>{token}</code></button>)}</div>;
  const renderPalette = (paletteName: Color) => {
    const scale = palettes[paletteName === 'gray' ? 'neutral' : paletteName];
    return <div className="cap-v2-palette" data-palette={paletteName} data-orientation={paletteView} key={paletteName}>
      <h3>{paletteName === 'neutral' ? 'Neutral' : paletteName}</h3>
      <div className="cap-v2-palette-swatches" style={{ '--cap-palette-count': Object.keys(scale).length, '--cap-palette-min-width': `${Object.keys(scale).length * 34}px` } as CSSProperties}>{Object.entries(scale).map(([step, value]) => <button type="button" key={step} className="cap-v2-palette-swatch" aria-pressed={selectedShade === `${paletteName}-${step}`} onClick={() => { setSelectedShade(`${paletteName}-${step}`); copyToken(`--cap-palette-${paletteName === 'neutral' ? 'gray' : paletteName}-${step}`); }} aria-label={`${t('Скопировать', 'Copy')} ${paletteName} ${step}, ${value}`}>
        <span className="cap-v2-palette-chip" style={{ background: value }}/><strong>{step}</strong><small>{value}</small>
      </button>)}</div>
    </div>;
  };
  return <div className="cap-foundations-colors">
    <header className="page-intro"><h1>{t('Цвета', 'Colors')}</h1><p>{t('417 самостоятельных цветов Sloy: 17 палитр по 22 оттенка, 41 нейтральный оттенок, чёрный и белый. Семантические роли выбирают нужные пары для темы, поверхности и локального акцента.', '417 independently authored Sloy colors: 17 palettes of 22 shades, 41 neutrals, black and white. Semantic roles select the right pairs for the theme, surface and local accent.')}</p></header>
    <section className="v2-color-section cap-v2-palettes" data-wrap={wrapPalettes}>
      <div className="section-heading cap-v2-palettes-heading"><div><h2>{t('Полные палитры', 'Full palettes')}</h2><p className="muted">{t('Нажмите на оттенок, чтобы скопировать ссылку на токен.', 'Click a shade to copy its token reference.')}</p></div><div className="cap-v2-palette-controls">
        <SegmentedControl label={t('Вид палитр', 'Palette view')} value={paletteView} onValueChange={value => setPaletteView(value as PaletteView)} size="sm" options={[{ value: 'rows', label: t('Строки', 'Rows') }, { value: 'columns', label: t('Столбцы', 'Columns') }]}/>
        <Switch label={t('Перенос', 'Wrap')} size="sm" variant="neutral" checked={wrapPalettes} onChange={event => setWrapPalettes(event.target.checked)}/>
      </div></div>
      <ScrollArea key={`${paletteView}-${wrapPalettes}`} className="cap-v2-palette-scroll" label={t('Все цветовые палитры', 'All color palettes')} axis="horizontal" scrollbar="auto">
        <div className={`cap-v2-palette-${paletteView}`}>{paletteNames.map(renderPalette)}</div>
      </ScrollArea>
      <div className="cap-foundation-extremes">{(['black', 'white'] as const).map(name => <button type="button" key={name} onClick={() => copyToken(`--cap-palette-${name}`)} aria-label={`${t('Скопировать', 'Copy')} --cap-palette-${name}`}><span className="cap-foundation-extreme-swatch" style={{ background: `var(--cap-palette-${name})` }}/><code>{name}</code></button>)}</div>
    </section>
    <section className="v2-color-section"><div className="cap-foundation-section-heading"><h2>{t('Семантические токены', 'Semantic tokens')}</h2><p>{t('Палитры задают исходные цвета. Эти роли описывают назначение и меняются вместе с контекстом. Нажмите на имя токена, чтобы скопировать его.', 'Palettes provide primitive colors. These roles describe their purpose and adapt to context. Click a token name to copy it.')}</p></div>
      <div className="cap-semantic-overview">
        <article className="cap-semantic-card"><h3>{t('Поверхности', 'Surfaces')}</h3><p>{t('Фон страницы, рабочей области, карточки и всплывающей панели.', 'Backgrounds for the page, workspace, card and floating panel.')}</p><div className="cap-semantic-surface-samples">{surfaces.map(surface => <div key={surface} data-surface={surface} className="cap-surface-boundary" style={{ background: 'var(--cap-surface-current)' }}>{surface}</div>)}</div>{tokenList(['--cap-surface-canvas', '--cap-surface-base', '--cap-surface-raised', '--cap-surface-floating'])}</article>
        <article className="cap-semantic-card"><h3>{t('Текст и иконки', 'Content')}</h3><p>{t('Иерархия от главного текста до тихих пояснений и названий групп.', 'A hierarchy from primary text to supporting details and group captions.')}</p><div className="cap-semantic-content-samples">{(['primary', 'secondary', 'muted', 'caption'] as const).map(role => <span key={role} style={{ color: `var(--cap-content-${role})` }}>{role === 'primary' ? t('Главная мысль', 'The main idea') : role === 'secondary' ? t('Дополнительная информация', 'Additional information') : role === 'muted' ? t('Обновлено сегодня', 'Updated today') : t('ГРУППА', 'GROUP')}</span>)}</div>{tokenList(['--cap-content-primary', '--cap-content-secondary', '--cap-content-muted', '--cap-content-caption'])}</article>
        <article className="cap-semantic-card"><h3>{t('Нейтральные контролы', 'Neutral controls')}</h3><p>{t('Последовательные состояния кнопок и полей на текущей поверхности.', 'Consistent button and field states on the current surface.')}</p><div className="cap-semantic-state-samples">{(['normal','hover','pressed'] as const).map(state => <span key={state} style={{ background: `var(--cap-control-${state})`, color: 'var(--cap-control-text)' }}>{state}</span>)}</div>{tokenList(['--cap-control-normal', '--cap-control-hover', '--cap-control-pressed', '--cap-control-text'])}</article>
        <article className="cap-semantic-card"><h3>{t('Акцент', 'Accent')}</h3><p>{t('Локальный цвет вторичных элементов и залитых действий.', 'The local color for secondary elements and filled actions.')}</p><div className="cap-semantic-actions"><Tag interactive={false}>{t('Метка', 'Label')}</Tag><Button variant="accent" size="sm" onClick={() => setActions(value => value + 1)}>{t('Действие', 'Action')}</Button><IconBox icon="cube" size="sm"/></div>{tokenList(['--cap-accent-normal', '--cap-accent-text', '--cap-accent-solid-normal', '--cap-accent-solid-text'])}</article>
        <article className="cap-semantic-card"><h3>{t('Структурные границы', 'Structural boundaries')}</h3><p>{t('Отделяют вложенные одинаковые поверхности; видны и при выключенных декоративных обводках.', 'Separate nested surfaces with the same role; remain visible when decorative borders are off.')}</p><div className="cap-semantic-boundary-preview cap-surface-boundary">{t('Вложенная поверхность', 'Nested surface')}</div>{tokenList(['--cap-border-subtle', '--cap-border-strong'])}</article>
        <article className="cap-semantic-card"><h3>{t('Обводки и фокус', 'Borders and focus')}</h3><p>{t('Декоративные контуры следуют Borders. Индикатор фокуса остаётся видимым.', 'Decorative outlines follow Borders. Focus indicators remain visible.')}</p><div className="cap-semantic-focus-preview"><span>{t('Контур панели', 'Panel outline')}</span><span>{t('Фокус', 'Focus')}</span></div>{tokenList(['--cap-panel-border', '--cap-control-border', '--cap-focus-ring'])}</article>
      </div>
    </section>
    <section className="v2-color-section"><div className="cap-foundation-section-heading"><h2>{t('Компоненты на каждой поверхности', 'Components on each surface')} · {theme}</h2><p>{t('Все четыре контекста расположены рядом. Переключите тему и акцент в общей панели, чтобы проверить пары. Disabled сохраняет читаемый текст и блокирует действия.', 'All four contexts sit side by side. Change the theme and accent in the global toolbar to inspect the pairs. Disabled keeps readable text and blocks actions.')}</p></div>
      <ScrollArea className="cap-foundation-matrix-scroll" label={t('Компоненты на четырёх поверхностях', 'Components on four surfaces')} axis="horizontal" scrollbar="auto"><div className="cap-foundation-surface-matrix">{surfaces.map(surface => <section className="cap-foundation-state-surface cap-surface-boundary" key={surface} data-surface={surface} data-accent={accent}><h3>{surface}</h3>{states.map(state => <div className="state-component-row" key={state} data-audit-state={state}><small>{state}</small><Button data-state={state} disabled={state === 'disabled'}>{t('Кнопка', 'Button')}</Button><Button variant="accent" data-state={state} disabled={state === 'disabled'}>{t('Действие', 'Action')}</Button><Input aria-label={`${surface} ${state}`} placeholder={t('Поле', 'Field')} data-state={state} disabled={state === 'disabled'}/><Tag data-state={state} disabled={state === 'disabled'} onClick={() => setActions(value => value + 1)} onRemove={() => setActions(value => value + 1)}>Tag</Tag></div>)}</section>)}</div></ScrollArea>
      <p className="cap-foundation-action-status" role="status">{t('Действия', 'Actions')}: {actions}</p>
    </section>
    <section className="v2-color-section"><div className="cap-foundation-section-heading"><h2>{t('Все акценты · четыре состояния', 'All accents · four states')}</h2><p>{t('Normal, hover, pressed и disabled для каждой поверхности. Цвет текста стабилен в активных состояниях; недоступное состояние использует общую нейтральную пару.', 'Normal, hover, pressed and disabled for each surface. Text color stays stable in active states; disabled uses a shared neutral pair.')}</p></div><ScrollArea className="cap-foundation-matrix-scroll" label={t('Акценты на четырёх поверхностях', 'Accents on four surfaces')} axis="horizontal" scrollbar="auto"><div className="cap-foundation-surface-matrix cap-foundation-tag-matrix">{surfaces.map(surface => <section key={surface} data-surface={surface} className="cap-foundation-state-surface cap-surface-boundary"><h3>{surface}</h3><div className="tag-matrix-header">{states.map(state => <small key={state}>{state}</small>)}</div>{paletteNames.map(color => <div className="tag-matrix-row" key={color} data-audit-color={color}>{states.map(state => <Tag interactive key={state} color={color} data-state={state} disabled={state === 'disabled'}>{color}</Tag>)}</div>)}</section>)}</div></ScrollArea></section>
  </div>;
}
