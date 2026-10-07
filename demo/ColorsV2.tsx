import { useCatalogText } from './catalog-locale';
import { useState, type CSSProperties } from 'react';
import { Badge, Button, IconBox, SegmentedControl, ScrollArea, Switch, Tag, TypeLabel, colors, type Color } from '../src';
import { Input } from '../src/components/forms';
import palettes from '../src/tokens/accents.json';
import './palette-layout.css';
const surfaces = ['canvas', 'base', 'raised', 'floating'] as const;
const states = ['normal', 'hover', 'pressed', 'disabled'] as const;
const paletteNames: Color[] = ['neutral', ...colors.filter(color => color !== 'neutral' && color !== 'gray')];
type PaletteView = 'rows' | 'columns';
export default function ColorsV2({ theme, accent, copy }: { theme: 'light' | 'dark'; accent: Color; copy: (value: string) => void }) { const c=useCatalogText();
  const [paletteView, setPaletteView] = useState<PaletteView>('rows');
  const [wrapPalettes, setWrapPalettes] = useState(true);
  const [actions, setActions] = useState(0);
  const [selectedShade, setSelectedShade] = useState<string | null>(null);
  const copyShade = (paletteName: Color, step: string) => copy(`var(--cap-palette-${paletteName === 'neutral' || paletteName === 'gray' ? 'gray' : paletteName}-${step})`);
  const renderPalette = (paletteName: Color, orientation: PaletteView) => {
    const scale = palettes[paletteName === 'gray' ? 'neutral' : paletteName];
    return <div className="cap-v2-palette" data-palette={paletteName} data-orientation={orientation} key={paletteName}>
      <h3>{paletteName === 'neutral' ? 'Neutral' : paletteName}</h3>
      <div className="cap-v2-palette-swatches" style={{ '--cap-palette-count': Object.keys(scale).length, '--cap-palette-min-width': `${Object.keys(scale).length * 34}px` } as CSSProperties}>{Object.entries(scale).map(([step, value]) => <button type="button" key={step} className="cap-v2-palette-swatch" aria-pressed={selectedShade === `${paletteName}-${step}`} onClick={() => { setSelectedShade(`${paletteName}-${step}`); copyShade(paletteName, step); }} aria-label={`${c("Скопировать ")}${paletteName} ${step}, ${value}`}>
        <span className="cap-v2-palette-chip" style={{ background: value }}/><strong>{step}</strong><small>{value}</small>
      </button>)}</div>
    </div>;
  };
  return <><header className="page-intro"><div className="eyebrow">{c("ОСНОВЫ / ЦВЕТ")}</div><h1>{c("Полные палитры и состояния")}</h1><p>{c("417 исходных цветов. 17 акцентных растяжек по 22 оттенка, 41 оттенок gray и black / white. Вторичные элементы подобраны по относительной яркости для четырёх поверхностей в двух темах.")}</p></header>
    <section className="v2-color-section cap-v2-palettes" data-wrap={wrapPalettes}>
      <div className="section-heading cap-v2-palettes-heading"><div><h2>{c("Полные палитры")}</h2><p className="muted">{c("Все оттенки рядом. Нажмите на образец, чтобы скопировать ссылку на токен.")}</p></div></div>
      <div className="cap-v2-palette-controls">
        <SegmentedControl label={c("Вид палитр")} value={paletteView} onValueChange={value => setPaletteView(value as PaletteView)} size="sm" options={[{ value: 'rows', label: c('Строки') }, { value: 'columns', label: c('Столбцы') }]}/>
        <Switch label={c("Переносить по ширине")} size="sm" variant="neutral" checked={wrapPalettes} onChange={event => setWrapPalettes(event.target.checked)}/>
      </div>
      <ScrollArea key={`${paletteView}-${wrapPalettes}`} className="cap-v2-palette-scroll" label={`${c("Все цветовые палитры по ")}${paletteView === 'rows' ? c('строкам') : c('столбцам')}`} axis="horizontal" scrollbar="hidden">
        <div className={`cap-v2-palette-${paletteView}`}>{paletteNames.map(name => renderPalette(name, paletteView))}</div>
      </ScrollArea>
    </section>
    <section className="v2-color-section"><h2>{c("Компоненты на каждой поверхности · ")}{theme}</h2><p className="muted">{c("Эти семантические роли используют все компоненты. Переключите тему в плавающей панели, чтобы проверить вторую половину матрицы. Disabled сохраняет читаемый текст и блокирует действия.")}</p><div className="v3-surface-comparison">{surfaces.map(surface => <section className="state-surface" key={surface} data-surface={surface} data-accent={accent} style={{background:'var(--cap-surface-current)',color:'var(--cap-content-primary)',padding:20,borderRadius:'var(--cap-radius-md)'}}><h3>{surface}</h3>{states.map(state => <div className="state-component-row" key={state} data-audit-state={state}><small>{state}</small><Button data-state={state} disabled={state === 'disabled'}>Secondary</Button><Button variant="accent" data-state={state} disabled={state === 'disabled'}>Action</Button><Button variant="danger" data-state={state} disabled={state === 'disabled'}>Danger</Button><Input aria-label={`${surface} ${state}`} placeholder={c("Поле")} data-state={state} disabled={state === 'disabled'}/><Tag data-state={state} disabled={state === 'disabled'} onClick={() => setActions(n=>n+1)} onRemove={() => setActions(n=>n+1)}>Tag</Tag></div>)}<div className="demo-row"><Badge>Badge</Badge><TypeLabel>TypeLabel</TypeLabel><IconBox icon="cube"/></div></section>)}</div><p role="status">{c("Действия тегов: ")}{actions}</p></section>
    <section className="v2-color-section"><h2>{c("Все акценты · четыре состояния")}</h2><p className="muted">{c("Столбцы: normal, hover, pressed, disabled. Цветной текст сохраняется в трёх активных состояниях; disabled получает общую нейтральную пару.")}</p><div className="tag-matrix-grid" role="region" aria-label={c("Акценты на четырёх поверхностях")} tabIndex={0}>{surfaces.map(surface => <section key={surface} data-surface={surface} className="state-surface" style={{background:'var(--cap-surface-current)',color:'var(--cap-content-primary)',padding:20,borderRadius:'var(--cap-radius-md)'}}><h3>{surface}</h3><div className="tag-matrix-header">{states.map(s=><small key={s}>{s}</small>)}</div>{colors.map(color=><div className="tag-matrix-row" key={color} data-audit-color={color}>{states.map(state=><Tag interactive key={state} color={color} data-state={state} disabled={state==='disabled'}>{color}</Tag>)}</div>)}</section>)}</div></section>
    <section className="v2-color-section"><h2>{c("Коллекции Figma")}</h2><p><strong>Primitives</strong>{c(": palette, number и font. Размеры контролов объединены в number/control-size; семейства, размеры, межстрочные интервалы и веса шрифтов разделены на подгруппы.")}</p><p><strong>Semantic</strong>{c(": surface, content, control, element, action, feedback, disabled, border и focus. Независимые оси: Theme Light / Dark и Semantic Canvas / Base / Raised / Floating. Все рабочие цвета ссылаются на полную палитру. Исходные роли сохранены в source для сверки.")}</p><p><strong>Borders</strong>{c(": служебная коллекция Off / On для независимого переключения обводок на родительском фрейме.")}</p></section>
  </>;
}
