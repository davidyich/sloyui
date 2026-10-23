import { BLACK, WHITE, composite, contrast } from '../color-engine.mjs';

export const neutralSurfaces = ['Shell', 'Workspace', 'Content', 'Overlay', 'Invert', 'Glass'];
const themes = ['Light', 'Dark'];
const defaultBases = { Light: .025, Dark: .9 };
const clamp = value => Math.max(0, Math.min(1, value));
const position = (value, fallback) => Number.isFinite(value) ? clamp(value) : fallback;
const surfaceName = value => neutralSurfaces.find(name => name.toLowerCase() === String(value).toLowerCase()) ?? 'Workspace';
const themeName = value => String(value).toLowerCase() === 'dark' ? 'Dark' : 'Light';

/** Positions survive changes to the number of palette steps. No generated colors are persisted. */
export function createNeutralSettings() {
  return { bases: { ...defaultBases }, overrides: {} };
}

export function normalizeNeutralSettings(input) {
  const result = createNeutralSettings();
  for (const theme of themes) {
    result.bases[theme] = position(input?.bases?.[theme], defaultBases[theme]);
    for (const surface of neutralSurfaces) {
      const value = input?.overrides?.[theme]?.[surface];
      if (Number.isFinite(value)) (result.overrides[theme] ??= {})[surface] = clamp(value);
    }
  }
  return result;
}

/** Import validation is strict; normalization remains suitable for older or partial saved state. */
export function validateNeutralSettings(input) {
  if (!input || typeof input !== 'object' || !input.bases || typeof input.bases !== 'object') throw new Error('Нужны основы нейтральной палитры для Light и Dark.');
  for (const theme of themes) {
    const base = input.bases[theme];
    if (!Number.isFinite(base) || base < 0 || base > 1) throw new Error(`Основа ${theme} должна быть позицией от 0 до 1.`);
  }
  if (input.overrides != null && (typeof input.overrides !== 'object' || Array.isArray(input.overrides))) throw new Error('Некорректные настройки поверхностей.');
  for (const [theme, overrides] of Object.entries(input.overrides ?? {})) {
    if (!themes.includes(theme) || !overrides || typeof overrides !== 'object' || Array.isArray(overrides)) throw new Error('Неизвестная тема нейтральных поверхностей.');
    for (const [surface, value] of Object.entries(overrides)) {
      if (!neutralSurfaces.includes(surface) || !Number.isFinite(value) || value < 0 || value > 1) throw new Error('Настройка поверхности должна быть позицией от 0 до 1.');
    }
  }
  return normalizeNeutralSettings(input);
}

export function setNeutralBase(settings, theme, value) {
  const next = normalizeNeutralSettings(settings), key = themeName(theme);
  next.bases[key] = position(value, next.bases[key]);
  return next;
}

export function setNeutralSurface(settings, theme, surface, value) {
  const next = normalizeNeutralSettings(settings), key = themeName(theme);
  if (!Number.isFinite(value)) return next;
  (next.overrides[key] ??= {})[surfaceName(surface)] = clamp(value);
  return next;
}

export function resetNeutralSurface(settings, theme, surface) {
  const next = normalizeNeutralSettings(settings), key = themeName(theme);
  if (next.overrides[key]) {
    delete next.overrides[key][surfaceName(surface)];
    if (!Object.keys(next.overrides[key]).length) delete next.overrides[key];
  }
  return next;
}

export function resetNeutralTheme(settings, theme) {
  const next = normalizeNeutralSettings(settings), key = themeName(theme);
  next.bases[key] = defaultBases[key];
  delete next.overrides[key];
  return next;
}

export function neutralStepAt(steps, requested) {
  if (!Array.isArray(steps) || !steps.length) throw new Error('Нейтральная палитра пуста.');
  const target = position(requested, 0);
  return steps.reduce((best, step) => Math.abs(step.position - target) < Math.abs(best.position - target) ? step : best);
}

function surfacePosition(settings, theme, scheme, surface) {
  const manual = settings.overrides[theme]?.[surface];
  if (manual !== undefined) return manual;
  if (surface === 'Invert') return settings.bases[theme === 'Light' ? 'Dark' : 'Light'];
  const dimmed = String(scheme).toLowerCase() === 'dimmed' || String(scheme).toLowerCase() === 'inverted';
  const offsets = theme === 'Light'
    ? { Shell: 0, Workspace: dimmed ? .05 : 0, Content: -.025, Overlay: -.025, Glass: -.025 }
    : dimmed
      ? { Shell: -.1, Workspace: 0, Content: .05, Overlay: -.075, Glass: .15 }
      : { Shell: .05, Workspace: 0, Content: -.05, Overlay: -.075, Glass: .15 };
  return clamp(settings.bases[theme] + offsets[surface]);
}

/** All returned paint is an exact palette step, optionally carrying a numeric alpha.
 * The two stable endpoints only protect Glass, whose readability is measured on both underlays.
 */
export function resolveNeutralSurface(input, steps, outerTheme, scheme = 'Standard', requestedSurface = 'Workspace', minimumContrast = 4.5) {
  const settings = normalizeNeutralSettings(input), theme = themeName(outerTheme), surface = surfaceName(requestedSurface);
  const chosen = neutralStepAt(steps, surfacePosition(settings, theme, scheme, surface));
  const glass = surface === 'Glass', customGlass = settings.overrides[theme]?.Glass !== undefined;
  const bg = glass ? { ...(customGlass ? chosen.value : theme === 'Light' ? WHITE : BLACK), a: theme === 'Light' ? .88 : .8 } : chosen.value;
  const bgReference = glass && !customGlass ? theme === 'Light' ? 'white' : 'black' : chosen.name;
  const bases = glass ? [composite(bg, BLACK), composite(bg, WHITE)] : [bg];
  const score = (value, backings = bases) => Math.min(...backings.map(base => contrast(composite(value, base), base)));
  const strongest = backings => steps.reduce((best, step) => score(step.value, backings) > score(best.value, backings) ? step : best);
  const pole = strongest(bases);
  const neutral = {}, references = { 'surface/bg': bgReference };
  for (const [role, alpha] of Object.entries({ 'tertiary/normal': .03, 'tertiary/active': .05, 'secondary/normal': .08, 'secondary/active': .12 })) {
    neutral[role] = { ...pole.value, a: alpha };
    references[`surface/${role}`] = pole.name;
  }
  const backings = bases.flatMap(base => [base, ...Object.values(neutral).map(paint => composite(paint, base))]);
  const ink = strongest(backings), maximum = score(ink.value, backings);
  const nearContrast = target => steps.reduce((best, step) => {
    const current = score(step.value, backings), previous = score(best.value, backings);
    if (current >= minimumContrast && previous < minimumContrast) return step;
    if (current < minimumContrast && previous >= minimumContrast) return best;
    return Math.abs(current - target) < Math.abs(previous - target) ? step : best;
  }, ink);
  const secondary = nearContrast(Math.max(minimumContrast + .1, maximum * .7)), tertiary = nearContrast(Math.max(minimumContrast, maximum * .5));
  const opposite = steps.reduce((best, step) => contrast(step.value, ink.value) > contrast(best.value, ink.value) ? step : best);
  const content = { primary: ink.value, secondary: secondary.value, tertiary: tertiary.value, inverted: opposite.value };
  for (const [role, step] of Object.entries({ primary: ink, secondary, tertiary, inverted: opposite })) references[`content/${role}`] = step.name;
  const borderStep = steps.reduce((best, step) => Math.abs(score(step.value) - 3.2) < Math.abs(score(best.value) - 3.2) ? step : best);
  references.border = borderStep.name;
  // Polarity follows the selected paint, including a dark base under Light.
  // Use the background's pole rather than a content choice measured on overlays.
  const effectiveTheme = contrast(pole.value, WHITE) < contrast(pole.value, BLACK) ? 'Dark' : 'Light';
  return { bg, neutral, content, border: borderStep.value, references, position: chosen.position, step: chosen, effectiveTheme };
}
