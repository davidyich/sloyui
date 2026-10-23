import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Button, Input, Select, SegmentedControl, Tabs, ScrollArea, Switch, Tag, colors, useTranslate, type Color } from '../src';
import { TokenCollections, TokenDownloads, TokenGraphInspector } from './TokenSystemV4';
import { defaultTokenModes, formatTokenValue, tokenColor, surfacePurposes as surfaces, tokenGraph } from './token-v4-data';
import './palette-layout.css';
import './foundations-v10.css';
import './token-system-v4.css';
const states = ['normal', 'hover', 'pressed', 'disabled'] as const;
const paletteNames: Color[] = ['neutral', ...colors.filter(color => color !== 'neutral' && color !== 'gray')];
type PaletteView = 'rows' | 'columns';

function ColorsV2({ accent, copy }: { accent: Color; copy: (value: string) => void }) {
  const [lastAction, setLastAction] = useState('');
  const copyState = useCallback((kind: 'control' | 'accent', state: typeof states[number], context: string) => {
    const token = state === 'disabled' ? '--cap-disabled-background' : `--cap-${kind}-${state}`;
    copy(`var(${token})`); setLastAction(`${context} · ${state} · var(${token})`);
  }, [copy]);
  return <div className="cap-foundations-colors cap-v4-page">
    <header className="page-intro"><h1>Цвета</h1><p>Шесть акцентов используют общие шкалы Palette Lab. Surface выбирает Shell, Workspace, Content, Overlay, Invert или Glass. Одна роль сохраняет имя при смене темы и поверхности.</p></header>
    <section className="cap-v4-section"><div className="cap-v4-section-heading"><h2>Выберите роль по задаче</h2><p>Заливка — surface, текст и иконки — content, граница — border. Для secondary используйте заливку, контент и границу одного оттенка.</p></div><div className="cap-v4-role-guide">{[
      ['Фон и блок', 'surface/bg · surface/block', 'Блок выделяется внутри области и сохраняет её Surface.'],
      ['Secondary', 'surface/secondary/<hue>-normal', 'Текст: content/<hue>. Граница: border/<hue>-normal.'],
      ['Primary', 'surface/primary/<hue>-normal', 'Текст: content/on-primary/<hue>; для neutral — content/on-primary.'],
      ['Постоянный цвет', 'stable/neutral · accent · alpha', 'RGBA не меняется между Light и Dark; alpha зависит от фона.'],
    ].map(([title, path, description]) => <div key={title}><h3>{title}</h3><code>{path}</code><p>{description}</p></div>)}</div></section>
    <section className="cap-v4-section"><div className="cap-v4-section-heading"><h2>Secondary на шести поверхностях</h2><p>Сравните нейтральную и акцентную пару. Каждая область задаёт Surface по назначению. Переключите тему и схему в общей панели.</p></div><div className="cap-v4-surface-grid">{surfaces.map(surface => <section className="cap-v4-surface cap-surface-boundary" key={surface.name} data-surface={surface.name.toLowerCase()} data-accent={accent}><h3>{surface.name}</h3><p>{surface.purpose}</p><div className="cap-v4-block"><small>surface/block</small><span>{surface.example}</span></div><div className="cap-v4-accent-comparison" aria-label={`Сравнение оттенков · ${surface.name}`}><Tag color="neutral">Neutral</Tag><Tag color="blue">Blue</Tag><Tag color="purple">Violet</Tag></div>{states.map(state => <div className="cap-v4-state-row" key={state} data-audit-state={state}><small>{state}</small><div><Button size="sm" variant="secondary" data-state={state} disabled={state === 'disabled'} onClick={() => copyState('control', state, surface.name)}>Neutral</Button><Button size="sm" variant="accent-secondary" data-state={state} disabled={state === 'disabled'} onClick={() => copyState('accent', state, surface.name)}>{accent}</Button><Tag data-state={state} disabled={state === 'disabled'} interactive onClick={() => copyState('accent', state, surface.name)}>Tag</Tag></div></div>)}</section>)}</div><p className="cap-v4-copy-status" role="status">{lastAction ? `Скопировано: ${lastAction}` : 'Нажмите компонент, чтобы скопировать CSS-роль заливки.'}</p></section>
    <section className="cap-v4-section"><a className="cap-v4-palette-link" href={`${import.meta.env.BASE_URL}palette-lab/`}>Открыть Palette Lab →</a><p>Создайте акцент, настройте шкалы и проверьте роли на всех поверхностях.</p></section><StableColors/><TokenGraphInspector copy={copy}/>
    <DeferredFoundation label="Все акценты · четыре состояния" estimatedHeight={860}><AllAccentStates copyState={copyState}/></DeferredFoundation>
    <DeferredFoundation label="Базовые шкалы" estimatedHeight={2000}><FullPalettes copy={copy}/></DeferredFoundation>
    <TokenCollections/><TokenDownloads/>
  </div>;
}
type CopyState=(kind: 'control'|'accent',state:typeof states[number],context:string)=>void;
const AllAccentStates=memo(function AllAccentStates({copyState}:{copyState:CopyState}){
 const t=useTranslate();
 const [surfaceName,setSurfaceName]=useState('Shell');
 const visibleSurfaces=surfaces.filter(surface=>surface.name===surfaceName);
 return <section className="v2-color-section"><div className="cap-foundation-section-heading"><h2>{t('Все акценты · четыре состояния', 'All accents · four states')}</h2><p>{t('Шесть акцентов и neutral на выбранной поверхности: вторичная кнопка и Tag в каждом состоянии. Нейтральная кнопка использует общую control-пару, цветная — локальную accent-пару. Переключите тему, схему поверхностей и обводки в общей панели.', 'Six accents and neutral on the selected surface: a secondary button and Tag in every state. Neutral buttons use the shared control pair; colored buttons use the local accent pair. Change theme, surface scheme and borders in the global toolbar.')}</p></div><Tabs label={t('Поверхность матрицы','Matrix surface')} value={surfaceName} onValueChange={setSurfaceName} items={surfaces.map(surface=>({value:surface.name,label:surface.name,content:null}))} variant="line"/><ScrollArea className="cap-foundation-matrix-scroll" label={t('Акценты на шести поверхностях', 'Accents on six surfaces')} axis="horizontal" scrollbar="auto"><div className="cap-foundation-surface-matrix cap-foundation-tag-matrix cap-foundation-active-surface">{visibleSurfaces.map(surface => <section key={surface.name.toLowerCase()} data-surface={surface.name.toLowerCase()} className="cap-foundation-state-surface cap-surface-boundary"><h3>{surface.name}</h3><div className="tag-matrix-header">{states.map(state => <small key={state}>{state}</small>)}</div>{paletteNames.map(color => <div className="tag-matrix-row" key={color} data-audit-color={color} data-accent={color}>{states.map(state => <div className="cap-secondary-state-pair" key={state} data-audit-state={state}><Button size="xs" variant={color === 'neutral' ? 'secondary' : 'accent-secondary'} data-state={state} disabled={state === 'disabled'} onClick={() => copyState(color === 'neutral' ? 'control' : 'accent', state, `${surface.name} · ${color}`)}>{color}</Button><Tag interactive data-state={state} disabled={state === 'disabled'} onClick={() => copyState('accent', state, `${surface.name} · ${color} · Tag`)}>{color}</Tag></div>)}</div>)}</section>)}</div></ScrollArea></section>;
});
const FullPalettes=memo(function FullPalettes({copy}:{copy:(value:string)=>void}){
 const t=useTranslate();
 const [paletteView,setPaletteView]=useState<PaletteView>('rows');
 const [wrapPalettes,setWrapPalettes]=useState(true);
 const [selectedShade,setSelectedShade]=useState<string|null>(null);
 const copyToken=(token:string)=>copy(`var(${token})`);
  const renderPalette = (paletteName: Color) => {
    const prefix=paletteName==='neutral'?'gray/':`${paletteName}/`;
    const scale = tokenGraph.collections.find(collection => collection.key === 'Palette')!.variables.filter(variable => variable.name.startsWith(prefix) && /^\d+$/.test(variable.name.slice(prefix.length))).map(variable => [variable.name.slice(prefix.length), formatTokenValue(variable.values.Value)] as const);
    return <div className="cap-v2-palette" data-palette={paletteName} data-orientation={paletteView} key={paletteName}>
      <h3>{paletteName === 'neutral' ? 'Neutral' : paletteName}</h3>
      <div className="cap-v2-palette-swatches" style={{ '--cap-palette-count': scale.length, '--cap-palette-min-width': `${scale.length * 34}px` } as CSSProperties}>{scale.map(([step, value]) => <button type="button" key={step} className="cap-v2-palette-swatch" aria-pressed={selectedShade === `${paletteName}-${step}`} onClick={() => { setSelectedShade(`${paletteName}-${step}`); copyToken(`--cap-v4-palette-${paletteName === 'neutral' ? 'gray' : paletteName}-${step}`); }} aria-label={`${t('Скопировать', 'Copy')} ${paletteName} ${step}, ${value}`}>
        <span className="cap-v2-palette-chip" style={{ background: value }}/><strong>{step}</strong><small>{value}</small>
      </button>)}</div>
    </div>;
  };
 return <section className="v2-color-section cap-v2-palettes" data-wrap={wrapPalettes}>
      <div className="section-heading cap-v2-palettes-heading"><div><h2>{t('Базовые шкалы', 'Base scales')} · 41</h2><p className="muted">{t('По одной шкале из 41 ступени для каждого акцента и нейтральных цветов. Заливки, текст и границы выбирают цвета из этих шкал; прозрачность задаётся отдельно.', 'One 41-step ramp for each accent and neutral colors. Fills, text and borders select colors from these ramps; opacity is separate.')}</p></div><div className="cap-v2-palette-controls">
        <SegmentedControl label={t('Вид палитр', 'Palette view')} value={paletteView} onValueChange={value => setPaletteView(value as PaletteView)} size="sm" options={[{ value: 'rows', label: t('Строки', 'Rows') }, { value: 'columns', label: t('Столбцы', 'Columns') }]}/>
        <Switch label={t('Перенос', 'Wrap')} size="sm" variant="neutral" checked={wrapPalettes} onChange={event => setWrapPalettes(event.target.checked)}/>
      </div></div>
      <ScrollArea key={`${paletteView}-${wrapPalettes}`} className="cap-v2-palette-scroll" label={t('Все цветовые палитры', 'All color palettes')} axis="horizontal" scrollbar="auto"><div className={`cap-v2-palette-${paletteView}`}>{paletteNames.map(renderPalette)}</div></ScrollArea>
      <div className="cap-foundation-extremes">{(['black', 'white'] as const).map(name => <button type="button" key={name} onClick={() => copyToken(`--cap-palette-${name}`)} aria-label={`${t('Скопировать', 'Copy')} --cap-palette-${name}`}><span className="cap-foundation-extreme-swatch" style={{ background: `var(--cap-palette-${name})` }}/><code>{name}</code></button>)}</div>
    </section>;
});
export default memo(ColorsV2);

function DeferredFoundation({children,label,estimatedHeight}:{children:ReactNode;label:string;estimatedHeight:number}){
 const [ready,setReady]=useState(()=>typeof IntersectionObserver==='undefined'),anchor=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(ready||!anchor.current)return;const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setReady(true);observer.disconnect();}},{root:anchor.current.closest('.catalog-main'),rootMargin:'320px'});observer.observe(anchor.current);return()=>observer.disconnect();},[ready]);
 return <div ref={anchor} className="catalog-deferred-foundation" style={ready?undefined:{minHeight:estimatedHeight}}>{ready?children:<section className="v2-color-section" aria-label={label}><h2>{label}</h2></section>}</div>;
}

function StableColors() {
  const [path, setPath] = useState('Theme/stable/accent/blue');
  const variables = tokenGraph.collections.find(collection => collection.key === 'Theme')!.variables.filter(variable => variable.name.startsWith('stable/')||variable.name.startsWith('adaptive/alpha/'));
  return <section className="cap-v4-section"><div className="cap-v4-section-heading"><h2>Stable и Adaptive Alpha</h2><p>Stable сохраняет цвет и прозрачность в обеих темах. Adaptive Alpha меняет белый/чёрный по теме и не зависит от Surface. Для каждой пары доступны 20 процентов от 3 до 96.</p></div><Select label="Постоянный цвет" value={path} onValueChange={setPath} options={variables.map(variable => ({ value: `Theme/${variable.name}`, label: variable.name }))}/><div className="cap-v4-stable-grid">{(['Light', 'Dark'] as const).map(theme => <div key={theme} className="cap-v4-surface cap-surface-boundary" data-surface="content" data-theme={theme.toLowerCase()}><strong>{theme}</strong><div className="cap-v4-stable-swatch" style={{ background: tokenColor(path, { ...defaultTokenModes, Theme: theme }) }}/><code>{tokenColor(path, { ...defaultTokenModes, Theme: theme })}</code></div>)}</div></section>;
}
