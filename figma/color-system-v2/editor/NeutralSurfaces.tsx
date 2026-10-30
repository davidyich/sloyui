import {t} from './Locale';
import React, { useId } from 'react';
import { Accordion, Button, Select } from '../../../src/index';
import { css, toHex, type PaletteStep } from './model.mjs';
import { neutralStepAt, neutralSurfaces, normalizeNeutralSettings, resetNeutralSurface, resetNeutralTheme, resolveNeutralSurface, setNeutralBase, setNeutralSurface, type NeutralSettings, type NeutralTheme } from './neutral-system.mjs';
import './neutral-surfaces.css';

type NeutralSurfacesProps = {
  settings: NeutralSettings;
  steps: PaletteStep[];
  theme: string;
  scheme?: string;
  minimumContrast?: number;
  onChange: (settings: NeutralSettings) => void;
};

/** The global theme owns the editor context; each theme retains its own base and overrides. */
export function NeutralSurfaces({ settings: input, steps, theme: requestedTheme, scheme = 'Standard', minimumContrast = 4.5, onChange }: NeutralSurfacesProps) {
  const id = useId(), theme: NeutralTheme = requestedTheme.toLowerCase() === 'dark' ? 'Dark' : 'Light';
  const settings = normalizeNeutralSettings(input);
  if (!steps.length) return <p className="cap-pl-view-note">{t("Добавьте нейтральную палитру, чтобы настроить поверхности.")}</p>;
  const options = steps.map(step => ({ value: String(step.position), label: `${String(step.index).padStart(2, '0')} · ${toHex(step.value)}`, meta: <i className="cap-pl-neutral-option-swatch" style={{ background: css(step.value) }} aria-hidden="true"/> }));
  const base = neutralStepAt(steps, settings.bases[theme]);
  const previews = neutralSurfaces.map(surface => ({ surface, resolved: resolveNeutralSurface(settings, steps, theme, scheme, surface, minimumContrast) }));
  return <section className="cap-pl-neutral-surfaces" aria-labelledby={`${id}-title`}>
    <div className="cap-pl-neutral-heading"><h2 id={`${id}-title`}>{t("Нейтральные поверхности")}</h2><span>{theme} · {scheme}</span></div>
    <div className="cap-pl-neutral-preview-strip" role="region" aria-label={t(`Образцы нейтральных поверхностей ${theme}`)} tabIndex={0}>
      {previews.map(({ surface, resolved: c }) => <article className="cap-pl-neutral-preview" key={surface} data-pl-neutral-surface={surface} data-glass={surface === 'Glass' || undefined}>
        <div className="cap-pl-neutral-preview-paint" style={{ background: css(c.bg), color: css(c.content.primary) }}>
          <strong>{surface}</strong>
          <span className="cap-pl-neutral-preview-body">{t("Основной текст")}</span>
          <span style={{ color: css(c.content.secondary) }}>{t("Второй уровень")}</span>
          <span style={{ color: css(c.content.tertiary) }}>{t("Третий уровень")}</span>
          <span className="cap-pl-neutral-preview-control" style={{ background: css(c.neutral['secondary/normal']), color: css(c.content.primary) }}>{t("Нейтральный слой")}</span>
          <code style={{ color: css(c.content.secondary) }}>{toHex(c.bg)}{c.bg.a < 1 ? ` · ${Math.round(c.bg.a * 100)}%` : ''}</code>
        </div>
      </article>)}
    </div>
    <div className="cap-pl-neutral-settings cap-surface" data-surface="overlay">
      <div className="cap-pl-neutral-base">
        <Select className="cap-pl-neutral-select" appearance="parameter" size="md" label={t(`Цвет основы · ${theme}`)} value={String(base.position)} options={options} onValueChange={value => onChange(setNeutralBase(settings, theme, Number(value)))}/>
        <p className="cap-pl-view-note">{t("Фоны и нейтральные роли выбираются из этой растяжки. Для другой темы сохранена своя основа.")}</p>
      </div>
      <Accordion className="cap-pl-neutral-details" title={t("Отдельные поверхности")}>
        <div className="cap-pl-neutral-overrides">{previews.map(({ surface, resolved }) => {
          const override = settings.overrides[theme]?.[surface];
          const automatic = override === undefined ? resolved : resolveNeutralSurface(resetNeutralSurface(settings, theme, surface), steps, theme, scheme, surface, minimumContrast);
          return <div className="cap-pl-neutral-override" key={surface}>
            <Select className="cap-pl-neutral-select" appearance="parameter" size="md" label={surface} value={override === undefined ? 'auto' : String(neutralStepAt(steps, override).position)} options={[{ value: 'auto', label: t(`Авто · ${toHex(automatic.bg)}`), meta: <i className="cap-pl-neutral-option-swatch" style={{ background: css(automatic.bg) }} aria-hidden="true"/> }, ...options]} onValueChange={value => onChange(value === 'auto' ? resetNeutralSurface(settings, theme, surface) : setNeutralSurface(settings, theme, surface, Number(value)))}/>
            <Button className="cap-pl-neutral-reset" variant="ghost" size="md" disabled={override === undefined} aria-label={t(`Сбросить ${surface} в теме ${theme}`)} onClick={() => onChange(resetNeutralSurface(settings, theme, surface))}>{t("Сбросить")}</Button>
          </div>;
        })}</div>
      </Accordion>
      <Button className="cap-pl-neutral-theme-reset" variant="ghost" size="md" onClick={() => onChange(resetNeutralTheme(settings, theme))}>{t("Сбросить поверхности ")}{theme}</Button>
    </div>
  </section>;
}
