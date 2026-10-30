import {t} from './Locale';
import React from 'react';
import { Button, Icon } from '../../../src/index';
import { css, generatePalette, toHex, type Accent, type Context, type Rules } from './model.mjs';
import { AccentSample, ContextIssues, backing, surfaceBackground, readable, PaletteStepHint } from './Views';

type CollectionProps = { accents: Accent[]; contexts: Context[]; rules: Rules; surface:string; onOpen: (accent: Accent, tab?: string, surface?: string) => void; onPick:(context:Context,role:string)=>void; onCopy:(value:string)=>void };

export function Overview({ accents, contexts, onOpen, onPick }: CollectionProps) {
  return <div className="cap-pl-overview">{accents.map(accent => {
    const samples = contexts.filter(c => c.accent === accent.name);
    return <article className="cap-pl-color-card" key={accent.id}>
      <button type="button" className="cap-pl-color-card-title" onClick={() => onOpen(accent)} aria-label={t(`Настроить ${accent.name}`)}><i style={{ background: accent.id==='neutral'?'#000000':accent.hex }}/><strong>{accent.id==='neutral'?'Neutral':accent.name}</strong><code>{accent.hex}</code><Icon name="chevron" size={16}/></button>
      <div className="cap-pl-card-themes">{!samples.length&&<div className="cap-pl-color-specimen cap-pl-context-placeholder" aria-hidden="true"><span className="cap-pl-specimen-meta"/><div className="cap-pl-color-sample-row"><span/><span/><span/></div></div>}{samples.map(c => <div key={c.theme} data-theme={c.theme.toLowerCase()} className="cap-pl-color-specimen" style={{ background: surfaceBackground(c), color: readable(backing(c)) }} aria-label={t(`${accent.name} · ${c.theme} · образцы`)}>
        <span className="cap-pl-specimen-meta"><span>{c.theme} · {c.surface}</span><span className="cap-pl-specimen-status">{c.minimumText.toFixed(2)}:1<ContextIssues c={c}/></span></span>
        <div className="cap-pl-color-sample-row">{['primary', 'secondary', 'tertiary'].map(role => <AccentSample key={role} c={c} role={role} onPick={onPick}/>)}</div>

      </div>)}</div>
    </article>;
  })}</div>;
}

export function PaletteCollection({ accents, contexts, rules, onOpen, onCopy }: CollectionProps) {
  return <div className="cap-pl-collection-ramps">{accents.map(accent => <section key={accent.id}>
    <button type="button" className="cap-pl-collection-title" onClick={() => onOpen(accent, 'palettes')}><strong>{accent.id==='neutral'?'Neutral':accent.name}</strong><span>{accent.paletteSteps}{t(" ступеней")}</span><Icon name="external" size={14}/></button>
    <div className="cap-pl-collection-palette">{generatePalette(accent,rules).map(scale=><div key={scale.id} className="cap-pl-ramp-strip">
      <div className="cap-pl-strip-cells">{scale.steps.map(step=><PaletteStepHint key={step.name} scale={scale} step={step} contexts={contexts.filter(c=>c.accent===accent.name)}><button type="button" className="cap-pl-strip-cell cap-pl-color-cell" aria-label={`${step.name} ${toHex(step.value)}`} style={{background:css(step.value),color:readable(step.value)}} onClick={()=>onCopy(toHex(step.value))}/></PaletteStepHint>)}</div>
    </div>)}</div>
  </section>)}</div>;
}

export function SurfaceCollection({ contexts, onPick }: CollectionProps) {
  const groups = [...new Set(contexts.map(c => c.theme + '/' + c.surface))];
  return <div className="cap-pl-surface-collection">{groups.map(key => {
    const group = contexts.filter(c => `${c.theme}/${c.surface}` === key), first = group[0];
    return <section key={key} data-theme={first.theme.toLowerCase()} className="cap-pl-surface-sheet" style={{ background: surfaceBackground(first), color: readable(backing(first)) }}><header><h2>{first.surface}</h2><span>{first.theme}</span></header><div className="cap-pl-tag-shelf">{group.map(c => <AccentSample key={c.accent} c={c} role="secondary" onPick={onPick} label={c.accent==='neutral'?'Neutral':c.accent}/> )}</div></section>;
  })}</div>;
}

type MaterialStudyProps = Pick<CollectionProps, 'contexts' | 'accents' | 'onOpen'> & { surface: Context['surface'] };

/** Paint the selected context once; only Glass adds a static backdrop blur. */
export function MaterialStudy({ contexts, accents, surface, onOpen }: MaterialStudyProps) {
  const selected = contexts.filter(c => c.surface === surface);
  const themes = [...new Set(selected.map(c => c.theme))];
  if (!selected.length) return <div className="cap-pl-materials"><p>{t("Для поверхности ")}{surface}{t(" нет образцов.")}</p></div>;
  return <div className="cap-pl-materials">{themes.map(theme => {
    const samples = selected.filter(c => c.theme === theme), first = samples[0];
    const isGlass = surface === 'Glass';
    const description = isGlass ? t('Текстура за защитным слоем. Заливки, текст и иконки используют выбранный материал.') : surface === 'Invert' ? t('Контрастная область сохраняет внешнюю тему. Заливки, текст и иконки используют локальную полярность.') : surface === 'Custom' ? t('Заливки, текст и иконки адаптированы к выбранному фону.') : t('Непрозрачная поверхность закрывает текстуру. Заливки, текст и иконки используют её контекст.');
    const paintLabel = isGlass ? t(`Защитная заливка ${Math.round(first.bg.a * 100)}%`) : first.bg.a < 1 ? t(`Прозрачность фона ${Math.round(first.bg.a * 100)}%`) : t(`Фон ${toHex(first.bg)}`);
    return <section key={theme} className="cap-pl-material-scene" data-theme={theme.toLowerCase()} data-pl-material-theme={theme} data-pl-material-surface={surface}>
      <div className="cap-pl-material-window" style={{ color: css(first.content.primary) }}>
        <span className="cap-pl-material-backdrop" aria-hidden="true" style={{ background: css(first.bg) }}/>
        <aside><strong>{surface}</strong><span>{t("Коллекции")}</span>{samples.slice(0, 6).map(c => <button type="button" key={c.accent} style={{ color: css(c.content.primary) }} onClick={() => onOpen(accents.find(a => a.name === c.accent)!, 'specimens', surface)}><i style={{ background: css(c.primary.normal) }}/><span className="cap-pl-color-name" title={c.accent}>{c.accent}</span></button>)}</aside>
        <div className="cap-pl-material-document"><span>{theme} · {surface}</span><h2>{isGlass ? t('Фон остаётся частью интерфейса') : t('Цвета в выбранной среде')}</h2><p style={{ color: css(first.content.secondary) }}>{description}</p><div className="cap-pl-tag-shelf">{samples.slice(0, 8).map(c => <span key={c.accent} style={{ background: css(c.fills['secondary/normal']), color: css(c.content.primary) }}>{c.accent}</span>)}</div><Button size="md" onClick={() => onOpen(accents.find(a => a.name === first.accent)!, 'specimens', surface)} style={{ background: css(first.primary.normal), color: css(first.primary.foreground) }}>{t("Проверить роли ")}<Icon name="external" size={14}/></Button></div>
      </div><p className="cap-pl-material-caption">{paintLabel}{t(" · минимальный контраст ")}{Math.min(...samples.map(c => c.minimumText)).toFixed(2)}:1</p>
    </section>;
  })}</div>;
}
