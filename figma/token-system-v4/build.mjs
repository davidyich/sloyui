import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { selectPaletteColors } from './palette-selection.mjs';
import { createAccent, presets, generatePalette, generateContext } from '../color-system-v2/editor/model.mjs';
import { composite as compositeColor, contrast as colorContrast } from '../color-system-v2/color-engine.mjs';

// Authoritative graph shared with Figma and the web runtime adapter.
const directory = new URL('./', import.meta.url);
const auditDirectory = new URL('../../artifacts/token-system-v4/', import.meta.url);
const sourceText = await readFile(new URL('source.json', directory), 'utf8');
const source = JSON.parse(sourceText);
const labSource = JSON.parse(await readFile(new URL('../color-system-v2/source.json', directory), 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(value,(_,entry)=>typeof entry==='number'?Number(entry.toFixed(10)):entry);
const round = value => Number(value.toFixed(10));
const linear = value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
const encode = value => value <= .0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - .055;
const Y = color => .2126 * linear(color.r) + .7152 * linear(color.g) + .0722 * linear(color.b);
const contrast = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
const color = (r, g, b, a = 1) => ({ r: round(r), g: round(g), b: round(b), a: round(a) });
const fromHex = hex => color(...hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255));
const gray = luminance => color(...Array(3).fill(encode(Math.max(0, Math.min(1, luminance)))));
const cssName = path => '--sloy-' + path.replaceAll('/', '-').replaceAll('.', '_').toLowerCase();
const alias = path => ({ alias: path });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function oklchLinear(L, C, hue) {
  const a = C * Math.cos(hue * Math.PI / 180), b = C * Math.sin(hue * Math.PI / 180);
  const l = (L + .3963377774 * a + .2158037573 * b) ** 3;
  const m = (L - .1055613458 * a - .0638541728 * b) ** 3;
  const s = (L - .0894841775 * a - 1.2914855480 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.7076147010 * s];
}
function gamutColor(L, C, hue) {
  const inGamut = rgb => rgb.every(channel => channel >= 0 && channel <= 1);
  let rgb = oklchLinear(L, C, hue);
  if (!inGamut(rgb)) {
    let low = 0, high = C;
    for (let index = 0; index < 32; index++) {
      const middle = (low + high) / 2;
      if (inGamut(oklchLinear(L, middle, hue))) low = middle;
      else high = middle;
    }
    rgb = oklchLinear(L, low, hue);
  }
  return color(...rgb.map(channel => encode(Math.max(0, Math.min(1, channel)))));
}
const collections = [];
const byKey = new Map();
const variables = new Map();
function collection(key, modes, hidden = false, description = '') {
  const value = { key, name: key, modes, hidden, description, variables: [] };
  collections.push(value); byKey.set(key, value); return value;
}
function variable(key, name, type, values, scopes = [], description = '', options = {}) {
  const owner = byKey.get(key), path = key + '/' + name;
  assert(owner && !variables.has(path), 'Duplicate or unknown variable: ' + path);
  assert(Object.keys(values).join('|') === owner.modes.join('|'), 'Mode mismatch: ' + path);
  const legacyHue = Object.keys(source.accentSystem.legacyAliases).some(hue => new RegExp('(^|/)' + hue + '(-|/|$)').test(name));
  const value = { name, type, values, scopes: legacyHue && key !== 'Palette' ? [] : scopes, css: cssName(path), description: descriptionRu(key, name, type), ...(legacyHue && key !== 'Palette' ? { hiddenFromPublishing: true } : {}), ...options };
  owner.variables.push(value); variables.set(path, value); return path;
}
collection('Palette', ['Value'], true, 'Одна непрозрачная растяжка на оттенок, независимо от темы и назначения. Семантические коллекции выбирают ступень и Opacity.');
collection('Primitives', ['Value'], false, 'Неизменяемые числа, геометрия и параметры шрифтов.');
collection('Opacity', ['Value'], false, 'Числовая прозрачность цвета; ссылается на Primitives и применяется к алиасу пигмента.');
collection('Surface', Object.keys(source.surfaces), true, 'Внутренний выбор точных цветов по поверхности.');
const schemeModes = ['Standard', 'Dimmed', 'Inverted'];
collection('SurfaceScheme', schemeModes, true, 'Standard / Dimmed: полные контексты по референсу. Inverted — совместимое имя Dimmed.');
collection('Theme', ['Light', 'Dark'], false, 'Публичные цвета по назначению. Тема, поверхность и схема наследуются независимо.');
collection('Density', ['Default', 'Compact'], false, 'Адаптивные отступы и размеры, а также фиксированные размеры.');
collection('Radius', ['Default', 'None', 'Compact', 'Rounded'], false, 'Независимые скругления: база 8 / 0 / 4 / 16 px.');
collection('Borders', ['Off', 'On'], false, 'Ширина декоративных границ. Фокус и структурные линии независимы.');

const rawColors = new Map();
function palette(name, value, description = '') {
  assert(value.a === 1, 'Palette contains only opaque colors: ' + name);
  const path = variable('Palette', name, 'COLOR', { Value: value }, [], description);
  rawColors.set(path, value); return path;
}
const accentRules = source.accentSystem.rules;
const selectedPresets = source.accentSystem.accents.map(name => { const preset = presets.find(item => item.name === name); assert(preset, "Missing canonical accent: " + name); return preset; });
const accents = selectedPresets.map(preset => ({ ...createAccent(preset.name, source.accentSystem.overrides[preset.name]?.hex ?? preset.hex), paletteSteps: source.accentSystem.paletteSteps, ...source.accentSystem.overrides[preset.name] }));
const accentAliases = source.accentSystem.legacyAliases;
const accentNames = [...accents.map(accent => accent.name), ...Object.keys(accentAliases)];
const palettes = new Map();
for (const accent of accents) {
  const scales = generatePalette(accent, accentRules);
  assert(scales.length === 1, 'Exactly one palette per hue: ' + accent.name);
  palettes.set(accent.name, scales);
  for (const step of scales[0].steps) palette(step.name, step.value);
}
for (const step of source.palette.neutralSteps) {
  const luminance = Math.max(0, 1.05 * Math.exp(-Math.log(source.palette.neutralContrastSpan) * step / 1000) - .05);
  palette('gray/' + step, gamutColor(Math.cbrt(luminance), 0, 0), 'Original 41-step neutral ramp.');
}
palette('black', color(0, 0, 0)); palette('white', color(1, 1, 1));
const authoredPaletteCount = rawColors.size;
assert(authoredPaletteCount === source.paletteSelection.opaqueCount, 'Unexpected primitive count.');

const primitiveNumbers = new Map();
function fixedNumber(value) {
  if (!primitiveNumbers.has(value)) {
    const name = 'number/' + String(value).replaceAll('.', '_');
    primitiveNumbers.set(value, variable('Primitives', name, 'FLOAT', { Value: value }, [], 'Immutable raw number, used by adaptive aliases.', { unit: 'px' }));
  }
  return primitiveNumbers.get(value);
}
function fixedRole(name, value, scopes, description, unit = 'px') {
  return variable('Primitives', name, typeof value === 'string' ? 'STRING' : 'FLOAT', { Value: value }, scopes, description, { unit });
}
for (const value of [0, 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 40, 44, 48, 64, 96, 128]) {
  fixedRole('space/fixed-' + value, value, ['GAP', 'WIDTH_HEIGHT'], 'Fixed ' + value + ' px: unchanged across density modes.');
}
fixedRole('size/touch', 44, ['WIDTH_HEIGHT'], 'Minimum touch target remains 44 px in both density modes.');
fixedRole('radius/none', 0, ['CORNER_RADIUS'], 'Fixed square corner, independent of Radius.');
fixedRole('radius/pill', 9999, ['CORNER_RADIUS'], 'Fixed pill or circle geometry, independent of Radius.');
fixedRole('stroke/structural', 1, ['STROKE_FLOAT'], 'Always-visible structural separator width.');
fixedRole('stroke/focus', 2, ['STROKE_FLOAT'], 'Keyboard focus width; independent of Borders.');
for (const [name, value] of Object.entries(source.fonts.family)) fixedRole('font/family/' + name, value, ['FONT_FAMILY'], 'Semantic family role ' + name + '; changing the font does not change the token name.', 'fontFamily');
for (const [name, value] of Object.entries(source.fonts.size)) fixedRole('font/size/' + name, value, ['FONT_SIZE'], 'Fixed typography size; density does not scale type.');
for (const [name, value] of Object.entries(source.fonts.lineHeight)) fixedRole('font/line-height/' + name, value, ['LINE_HEIGHT'], 'Fixed line height; density changes the surrounding whitespace.');
for (const [name, value] of Object.entries(source.fonts.weight)) fixedRole('font/weight/' + name, value, ['FONT_WEIGHT'], 'Fixed typography weight.', 'number');
for (const [name, value] of Object.entries(source.fonts.tracking)) fixedRole('font/tracking/' + name, value, ['LETTER_SPACING'], 'Fixed letter spacing; density does not change tracking.');

const densityRoles = {}, densityRenames = {};
function densityName(name) {
  if (name.startsWith('space/step-')) return name.replace('space/step-', 'adaptive/scale/step-');
  if (name.startsWith('space/inset-')) return name.replace('space/inset-', 'adaptive/padding/');
  if (name.startsWith('space/gap-')) return name.replace('space/gap-', 'adaptive/gap/inline-');
  if (name.startsWith('space/stack-')) return name.replace('space/stack-', 'adaptive/gap/stack-');
  if (name.startsWith('space/control-inset-x-')) return name.replace('space/control-inset-x-', 'adaptive/control/padding-x-');
  if (name.startsWith('space/control-inset-y-')) return name.replace('space/control-inset-y-', 'adaptive/control/padding-y-');
  if (name.startsWith('size/control-')) return name.replace('size/control-', 'adaptive/control/height-');
  throw new Error('Unknown density role: ' + name);
}
function adaptive(name, formula, scopes = ['GAP']) {
  densityRenames['Density/' + name] = 'Density/' + densityName(name);
  name = densityName(name);
  const values = {};
  for (const mode of byKey.get('Density').modes) {
    const value = formula(source.density[mode].unit);
    assert(Number.isInteger(value) && value >= 0, 'Noninteger density value: ' + name);
    values[mode] = alias(fixedNumber(value));
  }
  densityRoles[name] = Object.fromEntries(Object.entries(values).map(([mode, ref]) => [mode, variables.get(ref.alias).values.Value]));
  variable('Density', name, 'FLOAT', values, scopes, source.density.formula, { unit: 'px' });
}
// Preserve immutable primitive IDs, while the public adaptive layer exposes
// only purpose-based roles that actually change in Compact.
for (const count of [0, .5, 1, 2, 3, 4, 6, 8, 10, 12, 16]) for (const mode of ['Default', 'Compact']) fixedNumber(Math.round(source.density[mode].unit * count));
for (const [family, ratios] of Object.entries({ inset: { xs: 1, sm: 2, md: 3, lg: 4, xl: 6 }, gap: { xs: .5, sm: 1, md: 2, lg: 3, xl: 4 }, stack: { sm: 2, md: 4, lg: 6, xl: 8 } })) {
  for (const [size, ratio] of Object.entries(ratios)) {
    if (family === 'gap' && size === 'xs') continue;
    adaptive(`space/${family}-${size}`, unit => Math.round(unit * ratio));
  }
}
const controlGeometry = { sm: { lineHeight: 16, vertical: 1, horizontal: 2 }, md: { lineHeight: 20, vertical: 1.5, horizontal: 3 }, lg: { lineHeight: 20, vertical: 2, horizontal: 4 }, xl: { lineHeight: 20, vertical: 3, horizontal: 5 } };
for (const [size, geometry] of Object.entries(controlGeometry)) {
  adaptive('space/control-inset-x-' + size, unit => Math.round(unit * geometry.horizontal));
  adaptive('space/control-inset-y-' + size, unit => Math.round(unit * geometry.vertical));
  adaptive('size/control-' + size, unit => geometry.lineHeight + 2 * Math.round(unit * geometry.vertical), ['WIDTH_HEIGHT']);
}
for (const [size, ratio] of Object.entries({ base: 1, ...source.radius.ratios })) {
  variable('Radius', 'radius/' + size, 'FLOAT', Object.fromEntries(byKey.get('Radius').modes.map(mode => [mode, alias(fixedNumber(Math.round(source.radius.modes[mode] * ratio)))])), ['CORNER_RADIUS'], source.radius.formula, { unit: 'px' });
}
variable('Borders', 'border/width', 'FLOAT', { Off: alias(fixedNumber(0)), On: alias(fixedNumber(1)) }, ['STROKE_FLOAT'], 'Decorative boundaries only. Structural strokes and focus use fixed Primitives.', { unit: 'px' });

const states = ['normal', 'hover', 'pressed'];
const themes = ['Light', 'Dark'];
const canonicalSurfaces = Object.keys(source.surfaces);
const regionSurfaces = ['Shell', 'Workspace', 'Content', 'Overlay'];
const contextSpecs = Object.fromEntries(['Standard','Dimmed'].flatMap(scheme => regionSurfaces.map(surface => [scheme==='Standard'?surface:surface+'Dimmed', {...source.surfaces[surface], ...Object.fromEntries(['light','dark'].map(theme => [theme, source.surfaceSchemes[scheme][surface][theme]]))}])));
let surfaceNames = Object.keys(contextSpecs);
const contexts = {};
const secondaryAudit = [];
const primaryAudit = [];
const focusAudit = [];
// Resolve neutral surface/control targets first. The shared Palette Lab solver
// selects all accent roles later, using these actual neutral backings.
for (const surface of surfaceNames) {
  contexts[surface] = {};
  for (const theme of themes) {
    const dark = theme === 'Dark', spec = contextSpecs[surface], roles = {};
    const surfaceColor = color(...Array(3).fill(dark ? spec.dark : spec.light)), blockColor = fromHex(dark ? spec.blockDark : spec.blockLight);
    const surfaceY = Y(surfaceColor), blockY = Y(blockColor);
    const put = (role, value) => roles[role] = value;
    put('surface/bg', surfaceColor, spec.usage);
    put('surface/block', blockColor, 'Static local block on the selected surface. Does not change the surface context.');
    const baseRatio = contrast(surfaceY, blockY);
    const targets = source.secondary.stateContrastMultipliers.map(multiplier => dark ? (surfaceY + .05) * baseRatio * multiplier - .05 : (surfaceY + .05) / (baseRatio * multiplier) - .05);
    const maxFillY = dark ? Math.max(...targets) : Math.min(...targets);
    const focusBackgrounds = [surfaceColor, blockColor];
    {
      const backgrounds = targets.map((target, index) => index === 0 ? blockColor : gray(target));
      focusBackgrounds.push(...backgrounds);
      const textTarget = dark ? Math.max(source.secondary.darkContentLuminance, (Math.max(...backgrounds.map(Y)) + .05) * source.secondary.minimumTextContrast - .05) : Math.min(source.secondary.lightContentLuminance, (Math.min(...backgrounds.map(Y)) + .05) / source.secondary.minimumTextContrast - .05);
      const content = gray(textTarget);
      assert(contrast(Y(content), blockY) >= source.secondary.minimumTextContrast, `Neutral secondary content on block failed: ${surface}/${theme}`);
      put('secondary/neutral-content', content, 'Paired neutral text and icon color for all three secondary states.');
      for (const [index, state] of states.entries()) {
        const bg = backgrounds[index], fillY = Y(bg), borderRatio = 1.18 + index * .06;
        const borderY = dark ? (fillY + .05) * borderRatio - .05 : (fillY + .05) / borderRatio - .05;
        put(`secondary/neutral-${state}`, bg, 'Opaque neutral secondary fill.');
        put(`secondary/neutral-border-${state}`, gray(borderY), 'Optional neutral boundary paired to the same secondary state.');
        const pairContrast = contrast(fillY, Y(content));
        assert(pairContrast >= source.secondary.minimumTextContrast - 1e-7, `Neutral secondary contrast failed: ${surface}/${theme}/${state}`);
        if (index) assert(contrast(fillY, Y(backgrounds[index - 1])) >= source.secondary.minimumStateContrast, `Neutral state distinction failed: ${surface}/${theme}/${state}`);
      }
      const primaryTargets = dark ? [.90, .78, .66] : [.018, .03, .045];
      const primaryBackgrounds = primaryTargets.map(gray);
      const primaryContent = dark ? color(0, 0, 0) : color(1, 1, 1);
      put('primary/neutral-content', primaryContent, 'Paired content color for every neutral primary state.');
      for (const [index, state] of states.entries()) {
        put(`primary/neutral-${state}`, primaryBackgrounds[index], 'Opaque neutral primary action fill.');
        const pairContrast = contrast(Y(primaryBackgrounds[index]), Y(primaryContent));
        assert(pairContrast >= 4.5 - 1e-7, 'Neutral primary contrast failed: ' + [surface, theme, state].join('/'));
      }
    }
    const textTargets = dark ? { primary: .96, secondary: .82, tertiary: .71, muted: .62, caption: .56 } : { primary: .012, secondary: .035, tertiary: .055, muted: .075, caption: .09 };
    for (const [name, target] of Object.entries(textTargets)) {
      const readable = dark ? Math.max(target, (maxFillY + .05) * 4.5 - .05) : Math.min(target, (maxFillY + .05) / 4.5 - .05);
      assert(contrast(readable, blockY) >= 4.5, `Content on block failed: ${surface}/${theme}/${name}`);
      assert(contrast(readable, surfaceY) >= 4.5, `Content on surface failed: ${surface}/${theme}/${name}`);
      put('content/' + name, gray(readable), 'Neutral content on the current surface, its block and neutral secondary fills. Use matching hue content on chromatic fills.');
    }
    for (const [name, ratio] of Object.entries({ subtle: 1.15, default: 1.3, strong: 1.65 })) {
      put('border/' + name, gray(dark ? (surfaceY + .05) * ratio - .05 : (surfaceY + .05) / ratio - .05), 'Decorative or structural boundary color on the selected surface.');
    }
    const focusWorstY = dark ? Math.max(...focusBackgrounds.map(Y)) : Math.min(...focusBackgrounds.map(Y));
    const focusColor = gray(dark ? (focusWorstY + .05) * 3.2 - .05 : (focusWorstY + .05) / 3.2 - .05);
    assert(focusBackgrounds.every(background => contrast(Y(focusColor), Y(background)) >= 3.1), 'Focus contrast across local backgrounds failed: ' + surface + '/' + theme);
    put('focus/ring', focusColor, 'Keyboard focus indicator with at least 3.1:1 contrast to the surface, local block and every secondary state.');
    put('disabled/bg', gray(dark ? (surfaceY + .05) * 1.10 - .05 : (surfaceY + .05) / 1.05 - .05), 'Neutral unavailable control fill.');
    put('disabled/content', gray(dark ? .46 : .13), 'Neutral unavailable content. Disabled controls are not interactive.');
    put('overlay/scrim', color(0, 0, 0, dark ? .58 : .32), 'Translucent modal scrim; semantic alias remains paired with the selected theme.');
    contexts[surface][theme] = roles;
  }
}

function descriptionRu(key, name, type) {
  if (key === 'Palette') return 'Непрозрачный цвет шкалы. Имя не зависит от темы, поверхности или состояния. Прозрачность применяется к алиасу в семантической роли.';
  if (key === 'Primitives') {
    if (name.startsWith('font/family/')) return 'Смысловая роль шрифта. При замене гарнитуры имя сохраняется.';
    if (name.startsWith('font/')) return 'Неизменяемый параметр типографики.';
    return type === 'STRING' ? 'Неизменяемое значение.' : 'Неизменяемое число. Плотность и скругления его не меняют.';
  }
  if (key === 'Opacity') return 'Числовая прозрачность цветового алиаса, проценты.';
  if (key === 'Surface') return 'Внутренняя пара цветов для выбранной поверхности.';
  if (key === 'SurfaceScheme') return 'Standard / Dimmed: полный контекст области. Inverted — совместимое имя Dimmed.';
  if (key === 'Density') return name.startsWith('fixed/') ? 'Фиксированный размер, одинаковый в Default и Compact.' : 'Адаптивная геометрия: единица 4 px в Default и 3 px в Compact.';
  if (key === 'Radius') return 'Скругление от независимой базы 0 / 4 / 8 / 16 px.';
  if (key === 'Borders') return 'Только декоративная граница. Фокус и структурные линии остаются видимыми.';
  if (name.startsWith('adaptive/alpha/')) return 'Прозрачный белый/чёрный зависит только от Theme, независимо от Surface. Base — белый в Light, чёрный в Dark; contrast — обратная пара.';
  if (name.startsWith('stable/')) return 'Постоянный цвет. Не меняется от темы, поверхности или схемы.';
  if (name === 'surface/bg') return 'Фон выбранной поверхности. Режим Surface задаётся на окрашенном контейнере.';
  if (name === 'surface/block') return 'Локальный блок на текущей поверхности. Контекст поверхности сохраняется.';
  if (name.startsWith('content/')) return 'Цвет текста или иконки. Наследует тему и текущую поверхность.';
  if (name === 'border/focus') return 'Индикатор фокуса: контраст не ниже 3.1:1 на фоне, блоке и secondary.';
  if (name.startsWith('border/')) return 'Цвет границы на текущей поверхности.';
  return 'Заливка по назначению. Наследует тему, поверхность и её схему.';
}

// Exact RGBA deduplication is appropriate only in the raw palette. Public
// semantic roles retain their names independently of equal color values.
const colorKey = value => JSON.stringify([value.r, value.g, value.b, value.a]);
const exactPalette = new Map([...rawColors].map(([path, value]) => [colorKey(value), path]));
const stableRoles = {};
for (const shade of ['white', 'black']) stableRoles['stable/neutral/' + shade] = 'Palette/' + shade;
for (const step of [100, 300, 500, 700, 900]) stableRoles['stable/neutral/gray-' + step] = 'Palette/gray/' + step;


// Select existing ramp entries jointly; never materialize computed intermediates.
const selection = selectPaletteColors({ contexts, rawColors, source });
Object.assign(contexts, selection.contexts);
assert(rawColors.size === authoredPaletteCount, 'Context selection must not add palette colors.');
// Surface targets are requests, not extra colors. Joint selection above chooses
// existing neutral steps while preserving the hierarchy of surfaces and controls.
// Invert is a complete surface context; it does not change the inherited Theme.
// Glass protects a bounded underlay range. Its content is checked at both ends.
contexts.Invert = { Light: structuredClone(contexts.Content.Dark), Dark: structuredClone(contexts.Content.Light) };
contexts.Invert.Light['surface/bg'] = rawColors.get('Palette/black');
contexts.Invert.Dark['surface/bg'] = rawColors.get('Palette/white');
contexts.Glass = { Light: structuredClone(contexts.Content.Light), Dark: structuredClone(contexts.Content.Dark) };
for (const theme of themes) {
  const dark = theme === 'Dark', roles = contexts.Glass[theme], pigment = rawColors.get(dark ? 'Palette/black' : 'Palette/white');
  roles['surface/bg'] = { ...pigment, a: source.surfaces.Glass[dark ? 'opacityDark' : 'opacityLight'] / 100 };
  const overlay = rawColors.get(dark ? 'Palette/white' : 'Palette/black');
  roles['surface/block'] = { ...overlay, a: dark ? .08 : .04 };
  for (const [i,state] of states.entries()) roles['secondary/neutral-'+state] = { ...overlay, a: (dark ? [.10,.14,.18] : [.06,.10,.14])[i] };
}
surfaceNames = Object.keys(contexts);
const hues = ['neutral', ...accentNames];
const opaqueBackings = (surface, roles) => surface === 'Glass' ? ['Palette/black','Palette/white'].map(path => compositeColor(roles['surface/bg'],rawColors.get(path))) : [roles['surface/bg']];
const localBackings = (surface, roles) => opaqueBackings(surface,roles).flatMap(bg => [bg, compositeColor(roles['surface/block'],bg), ...states.map(state => compositeColor(roles['secondary/neutral-'+state],bg))]);
const grayCandidates = [...rawColors].filter(([path]) => /^Palette\/(gray\/\d+|black|white)$/.test(path)).map(([,value])=>value);
const chooseGray = (target, backings, threshold=4.5) => {
  const passing = grayCandidates.filter(value=>backings.every(bg=>colorContrast(value,bg)>=threshold));
  assert(passing.length, 'No neutral ink for protected surface');
  return passing.sort((a,b)=>Math.abs(Y(a)-Y(target))-Math.abs(Y(b)-Y(target)))[0];
};
for (const surface of surfaceNames) for (const theme of themes) {
  const roles = contexts[surface][theme], effectiveTheme = surface === 'Invert' ? (theme === 'Light' ? 'Dark' : 'Light') : theme;
  const dark = effectiveTheme === 'Dark', bases = localBackings(surface,roles);
  // Refit only the translucent surface's neutral hierarchy to its worst underlay.
  if (surface === 'Glass' || surface.endsWith('Dimmed')) {
    const contentRoles=['primary','secondary','tertiary','muted','caption'];
    const candidates=grayCandidates.filter(value=>bases.every(bg=>colorContrast(value,bg)>=4.5)).sort((a,b)=>dark?Y(b)-Y(a):Y(a)-Y(b));
    const unique=candidates.filter((value,i)=>!i||Math.abs(Y(value)-Y(candidates[i-1]))>1e-9);let cursor=0;
    for(const [i,role] of contentRoles.entries()) {
      const available=unique.slice(cursor,unique.length-(contentRoles.length-i-1));
      assert(available.length,'Glass neutral hierarchy '+theme+'/'+role);
      const target=roles['content/'+role], chosen=available.sort((a,b)=>Math.abs(Y(a)-Y(target))-Math.abs(Y(b)-Y(target)))[0];
      roles['content/'+role]=chosen;cursor=unique.indexOf(chosen)+1;
    }
    roles['secondary/neutral-content']=rawColors.get(dark?'Palette/white':'Palette/black');
  }
  const neutral = {
    'surface/bg':roles['surface/bg'],
    'surface/secondary/normal':roles['surface/block'],
    'surface/secondary/active':roles['secondary/neutral-pressed'],
    'surface/tertiary/normal':roles['secondary/neutral-normal'],
    'surface/tertiary/active':roles['secondary/neutral-hover'],
  };
  for (const accent of accents) {
    const labSurface = surface === 'Glass' ? 'Glass' : 'Content';
    const context = generateContext(accent,effectiveTheme,'Standard',labSurface,labSource,{[`${effectiveTheme}/Standard/${labSurface}`]:neutral},undefined,accentRules,palettes.get(accent.name),surface.replace(/Dimmed$/,''));
    for (const hue of [accent.name,...Object.keys(accentAliases).filter(key=>accentAliases[key]===accent.name)]) {
      for (const state of states) {
        const labState=source.accentSystem.states[state];
        roles[`secondary/${hue}-${state}`]=context.fills['secondary/'+labState];
        roles[`tertiary/${hue}-${state}`]=context.fills['tertiary/'+labState];
        roles[`primary/${hue}-${state}`]=context.fills['primary/'+labState];
        roles[`secondary/${hue}-border-${state}`]=context.border;
      }
      roles[`secondary/${hue}-content`]=context.content.primary;
      roles[`content/secondary/${hue}`]=context.content.secondary;
      roles[`primary/${hue}-content`]=context.content['on-primary'];
    }
    assert(context.checks.every(check=>check.pass), 'Shared accent contrast: '+surface+'/'+theme+'/'+accent.name+' '+context.issues.join('; '));
  }
  roles['content/inverted']=dark?rawColors.get('Palette/black'):rawColors.get('Palette/white');
  const allBackings=opaqueBackings(surface,roles).flatMap(base=>[base,compositeColor(roles['surface/block'],base),...hues.flatMap(hue=>states.map(state=>compositeColor(roles[`secondary/${hue}-${state}`],base)))]);
  roles['focus/ring']=chooseGray(roles['focus/ring'],allBackings,3.2);
  for (const [tone,hue] of Object.entries({danger:'red',success:'green',warning:'amber',info:'blue'})) {
    roles[`status/${tone}-bg`]=roles[`secondary/${hue}-normal`];roles[`status/${tone}-content`]=roles[`secondary/${hue}-content`];roles[`status/${tone}-border`]=roles[`secondary/${hue}-border-normal`];
  }
}
for (const themeContexts of Object.values(contexts)) for (const roles of Object.values(themeContexts)) for (const value of Object.values(roles)) value.a=Number(value.a.toFixed(8));
for (const accent of accents) stableRoles['stable/accent/'+accent.name]='Palette/'+palettes.get(accent.name)[0].steps[Math.floor((accent.paletteSteps-1)/2)].name;
for (const [legacy,hue] of Object.entries(accentAliases)) stableRoles['stable/accent/'+legacy]=stableRoles['stable/accent/'+hue];
const opacityValues = new Map();
function colorReference(value) {
  const opaque={...value,a:1}, path=exactPalette.get(colorKey(value.a===1?value:opaque));
  assert(path, 'Missing hue-preserving primitive for '+JSON.stringify(value));
  if(value.a===1)return alias(path);
  const percent=Math.round(value.a*100),name=String(percent);
  assert(Math.abs(value.a*100-percent)<1e-6, 'Color solver must select whole-percent alpha before compilation: '+value.a);
  if(!opacityValues.has(percent)) {
    const primitive=variable('Primitives','opacity/'+name,'FLOAT',{Value:percent},[],'Неизменяемый процент прозрачности.',{unit:'number'});
    const opacity=variable('Opacity',name,'FLOAT',{Value:alias(primitive)},['COLOR_OPACITY'],'Прозрачность, применённая к цветовому алиасу.',{unit:'number'});
    opacityValues.set(percent,opacity);
  }
  return {color:alias(path),opacity:alias(opacityValues.get(percent))};
}

for (const shade of ['white','black']) for (const percent of source.alphaSteps) stableRoles[`stable/alpha/${shade}-${percent}`]=colorReference({...rawColors.get('Palette/'+shade),a:percent/100});
for (const surface of surfaceNames) for (const theme of themes) {
  const roles = contexts[surface][theme], bases=opaqueBackings(surface,roles), backgrounds=localBackings(surface,roles);
  for (const hue of hues) for (const [index,state] of states.entries()) {
    const fill=roles[`secondary/${hue}-${state}`],content=roles[`secondary/${hue}-content`], paints=bases.map(base=>compositeColor(fill,base));
    backgrounds.push(...paints);
    secondaryAudit.push({surface,theme,hue,state,contrast:Math.min(...paints.map(bg=>colorContrast(compositeColor(content,bg),bg))),previousStateContrast:index?Math.min(...bases.map(base=>colorContrast(compositeColor(fill,base),compositeColor(roles[`secondary/${hue}-${states[index-1]}`],base)))):null});
    primaryAudit.push({surface,theme,hue,state,contrast:colorContrast(roles[`primary/${hue}-${state}`],roles[`primary/${hue}-content`])});
  }
  focusAudit.push({surface,theme,backgrounds:backgrounds.length,minimumContrast:Math.min(...backgrounds.map(bg=>colorContrast(bg,roles['focus/ring'])))});
}

const fixedDensity = {};
fixedDensity['fixed/gap/inline-xs'] = fixedNumber(2);
for (const value of [0, 2, 4, 8, 12, 16, 24, 32, 48, 64]) fixedDensity['fixed/space/' + value] = 'Primitives/space/fixed-' + value;
for (const [name, value] of Object.entries({ 'icon-sm': 16, 'icon-md': 20, 'icon-lg': 24 })) fixedDensity['fixed/size/' + name] = fixedNumber(value);
fixedDensity['fixed/size/touch'] = 'Primitives/size/touch';
for (const [name, path] of Object.entries(fixedDensity)) variable('Density', name, 'FLOAT', { Default: alias(path), Compact: alias(path) }, /^fixed\/(space|gap)\//.test(name) ? ['GAP', 'WIDTH_HEIGHT'] : ['WIDTH_HEIGHT'], '', { unit: 'px' });

const legacyRoles = Object.keys(contexts.Shell.Light);
const statusHues = { danger: 'red', success: 'green', warning: 'amber', info: 'blue' };
function canonicalLegacyRole(role) {
  const match = /^status\/(danger|success|warning|info)-(bg|content|border)$/.exec(role);
  return match ? `secondary/${statusHues[match[1]]}-${{ bg: 'normal', content: 'content', border: 'border-normal' }[match[2]]}` : role;
}
function publicRole(role) {
  role = canonicalLegacyRole(role);
  const match = /^(primary|secondary|tertiary)\/([a-z]+)-(border-(normal|hover|pressed)|normal|hover|pressed|content)$/.exec(role);
  if (match) {
    const [, family, hue, state, borderState] = match;
    if (state === 'content') return family === 'primary' ? (hue === 'neutral' ? 'content/on-primary' : 'content/on-primary/' + hue) : 'content/' + hue;
    if (borderState) return 'border/' + hue + '-' + borderState;
    return `surface/${family}/${hue}-${state}`;
  }
  return ({ 'focus/ring': 'border/focus', 'disabled/bg': 'surface/disabled', 'disabled/content': 'content/disabled', 'overlay/scrim': 'surface/scrim' })[role] || role;
}
const publicContexts = Object.fromEntries(surfaceNames.map(surface => [surface, Object.fromEntries(themes.map(theme => [theme, {}]))]));
const oldToNew = {};
for (const role of legacyRoles) {
  const name = publicRole(role);
  oldToNew['Semantic/' + role] = 'Theme/' + name;
  for (const surface of surfaceNames) for (const theme of themes) {
    const value = contexts[surface][theme][role], target = publicContexts[surface][theme];
    if (target[name]) assert(stable(target[name]) === stable(value), 'Merged public roles have different values: ' + name);
    target[name] = value;
  }
}
const coreRoles = Object.keys(publicContexts.Shell.Light);

function colorScopes(name) {
  if (name.startsWith('stable/')) return ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR'];
  if (name.startsWith('adaptive/alpha/')) return ['FRAME_FILL', 'SHAPE_FILL', 'STROKE_COLOR'];
  if (name.startsWith('content/')) return ['TEXT_FILL', 'SHAPE_FILL'];
  if (name.startsWith('border/')) return ['STROKE_COLOR'];
  return ['FRAME_FILL', 'SHAPE_FILL'];
}
for (const role of coreRoles) {
  const values = {};
  for (const theme of themes) {
    const branches = {}, branchPaths = new Map();
    for (const scheme of ['Standard','Dimmed']) {
      const paths = Object.fromEntries(canonicalSurfaces.map(surface => [surface, colorReference(publicContexts[scheme==='Dimmed' && regionSurfaces.includes(surface)?surface+'Dimmed':surface][theme][role])]));
      const signature=stable(paths);
      branches[scheme] = branchPaths.get(signature) || (new Set(Object.values(paths).map(stable)).size===1 ? paths.Shell : alias(variable('Surface', role+'-'+theme.toLowerCase()+(scheme==='Dimmed'?'-dimmed':''), 'COLOR', paths, [])));
      branchPaths.set(signature,branches[scheme]);
    }
    if (stable(branches.Standard)===stable(branches.Dimmed)) values[theme]=branches.Standard;
    else values[theme]=alias(variable('SurfaceScheme', role+'-'+theme.toLowerCase(), 'COLOR', {Standard:branches.Standard,Dimmed:branches.Dimmed,Inverted:branches.Dimmed}, []));
  }
  variable('Theme', role, 'COLOR', values, colorScopes(role));
}
for (const [role, path] of Object.entries(stableRoles)) {const ref=typeof path==='string'?alias(path):path;variable('Theme',role,'COLOR',{Light:ref,Dark:ref},colorScopes(role));}
for (const family of ['base','contrast']) for (const percent of source.alphaSteps) {const light=family==='base'?'white':'black',dark=family==='base'?'black':'white';variable('Theme',`adaptive/alpha/${family}-${percent}`,'COLOR',{Light:colorReference({...rawColors.get('Palette/'+light),a:percent/100}),Dark:colorReference({...rawColors.get('Palette/'+dark),a:percent/100})},colorScopes('adaptive/alpha/'+family));}


// Recreate the v3 path vocabulary from the same math, without importing its
// graph or any local refinement receipt. Every old color path maps to intent.
const canonicalLegacy = [...new Set(legacyRoles.map(canonicalLegacyRole))];
function v3PurposeName(role, surface, shared) {
  const local = shared ? '' : '-' + surface.toLowerCase();
  const match = /^(primary|secondary|tertiary)\/([a-z]+)-(border-(normal|hover|pressed)|normal|hover|pressed|content)$/.exec(role);
  if (match) {
    const [, family, hue, state, borderState] = match;
    if (state === 'content') return `${family}/content/${hue}${local}`;
    if (borderState) return `${family}/border/${hue}${local}-${borderState}`;
    return `${family}/bg/${hue}${local}-${state}`;
  }
  if (role === 'surface/bg' || role === 'surface/block') return role + '/' + surface.toLowerCase();
  if (role.startsWith('content/') || role.startsWith('border/')) return role + local;
  if (role === 'focus/ring') return 'border/' + (shared ? '' : surface.toLowerCase() + '-') + 'focus';
  if (role === 'disabled/bg') return 'secondary/bg/disabled' + local;
  if (role === 'disabled/content') return 'content/disabled' + local;
  if (role === 'overlay/scrim') return 'surface/bg/scrim' + local;
  throw new Error('Unmapped v3 role: ' + role);
}
for (const role of canonicalLegacy) {
  const shared = new Set(surfaceNames.map(surface => stable(themes.map(theme => contexts[surface][theme][role])))).size === 1;
  for (const surface of surfaceNames) {
    const name = v3PurposeName(role, surface, shared), target = 'Theme/' + publicRole(role);
    oldToNew['Theme/' + name] = target;
    if (!['Workspace', 'Content'].includes(surface)) continue;
    const swapped = surface === 'Workspace' ? 'Content' : 'Workspace';
    if (stable(contexts[surface].Dark[role]) === stable(contexts[swapped].Dark[role])) continue;
    oldToNew['Theme/' + name + '-inverted'] = target;
    oldToNew['SurfaceScheme/' + name] = target;
  }
}
for (const key of ['Palette', 'Primitives', 'Radius', 'Borders']) for (const token of byKey.get(key).variables) {
  if (key === 'Palette' && !/^([a-z]+\/\d+|black|white)$/.test(token.name)) continue;
  oldToNew[key + '/' + token.name] = key + '/' + token.name;
}
Object.assign(oldToNew, densityRenames);
oldToNew['Density/space/gap-xs'] = 'Density/fixed/gap/inline-xs';
const retiredScaleMapping = { '0': 'Primitives/number/0', '0_5': 'Primitives/number/2', '1': 'Density/adaptive/padding/xs', '2': 'Density/adaptive/padding/sm', '3': 'Density/adaptive/padding/md', '4': 'Density/adaptive/padding/lg', '6': 'Density/adaptive/padding/xl', '8': 'Density/adaptive/gap/stack-xl', '10': 'Primitives/number/40', '12': 'Primitives/number/48', '16': 'Primitives/number/64' };
for (const [step, path] of Object.entries(retiredScaleMapping)) oldToNew['Density/space/step-' + step] = path;

const graph = {
  schemaVersion: 4,
  name: source.name,
  sourceHash: hash(sourceText),
  axes: { Theme: { default: 'Light', values: themes }, SurfaceScheme: { default: 'Standard', values: schemeModes }, Surface: { default: 'Shell', values: canonicalSurfaces }, Density: { default: 'Default', values: ['Default', 'Compact'] }, Radius: { default: 'Default', values: byKey.get('Radius').modes }, Borders: { default: 'Off', values: ['Off', 'On'] } },
  collections,
  conventions: { aliases: '{ alias: "CollectionKey/variable/name" }', color: '{r,g,b,a}, exact sRGB channels 0..1', publicCollection: 'Theme', contextualColorCount: coreRoles.length, adaptiveAlphaCount:source.alphaSteps.length*2, stableColorCount: Object.keys(stableRoles).length, accents: accents.map(accent => accent.name), legacyAccentAliases: source.accentSystem.legacyAliases, rawColorsCollection: 'Palette', aliasDirection: 'Theme → SurfaceScheme → Surface → Palette, with direct shortcuts for invariant values', crossCollectionAliasesOnly: true, fontRoles: source.fonts.family, densityFormula: source.density.formula, radiusFormula: source.radius.formula, cssScope: '.sloy-v4', inheritance: 'Тема, поверхность, схема, плотность, скругления и границы наследуются независимо.', staticBlock: 'surface/block сохраняет контекст родительской поверхности.', paletteNaming: source.paletteSelection },
};
function resolve(path, selection = {}, seen = []) {
  assert(!seen.includes(path), 'Alias cycle: ' + path);
  const token = variables.get(path), key = path.split('/')[0], owner = byKey.get(key);
  assert(token && owner, 'Missing variable: ' + path);
  const value = token.values[selection[key] || graph.axes[key]?.default || owner.modes[0]];
  assert(value !== undefined, 'Missing mode: ' + path);
  return value?.alias ? resolve(value.alias, selection, [...seen, path]) : value?.color ? {...resolve(value.color.alias, selection, [...seen,path]), a:resolve(value.opacity.alias,selection,[...seen,path])/100} : value;
}
let aliasValues = 0;
for (const owner of collections) for (const token of owner.variables) {
  assert(Object.keys(token.values).join('|') === owner.modes.join('|'), 'Incomplete modes: ' + token.name);
  for (const value of Object.values(token.values)) {
    if (value?.alias) {
      aliasValues++;
      assert(value.alias.split('/')[0] !== owner.key, 'Same-collection alias: ' + owner.key + '/' + token.name);
      assert(variables.get(value.alias)?.type === token.type, 'Alias type or target mismatch: ' + value.alias);
    } else if (value?.color) {
      for (const [part,type] of [['color','COLOR'],['opacity','FLOAT']]) { const target=value[part]?.alias; aliasValues++; assert(target && target.split('/')[0] !== owner.key && variables.get(target)?.type===type, 'Invalid composed color alias: '+owner.key+'/'+token.name); }
    } else if (token.type === 'COLOR') assert(owner.key === 'Palette', 'Raw color outside Palette.');
    if (owner.key === 'Primitives') assert(!value?.alias, 'Primitives must be raw.');
  }
}
let contextChecks = 0;
for (const Theme of themes) for (const SurfaceScheme of schemeModes) for (const Surface of canonicalSurfaces) {
  const target = SurfaceScheme !== 'Standard' && regionSurfaces.includes(Surface) ? Surface+'Dimmed' : Surface;
  const selection = { Theme, SurfaceScheme, Surface };
  for (const role of coreRoles) { assert(stable(resolve('Theme/' + role, selection)) === stable(publicContexts[target][Theme][role]), 'Context route mismatch: ' + role); contextChecks++; }
  for (const [role, path] of Object.entries(stableRoles)) {const expected=typeof path==='string'?resolve(path):{...resolve(path.color.alias),a:resolve(path.opacity.alias)/100};assert(stable(resolve('Theme/' + role, selection)) === stable(expected), 'Stable color changed.');contextChecks++;}
}

const axisAttributes = { Theme: 'theme', SurfaceScheme: 'surface-scheme', Surface: 'surface', Density: 'density', Radius: 'radius', Borders: 'borders' };
const gate = (key, mode) => '--sloy-route-' + key.toLowerCase() + '-' + mode.toLowerCase();
const cssLines = ['/* Generated by figma/token-system-v4/build.mjs. */', '.sloy-v4 {'];
for (const [key, axis] of Object.entries(graph.axes)) for (const mode of axis.values) cssLines.push(`  ${gate(key, mode)}: ${mode === axis.default ? 'initial' : ' '};`);
cssLines.push('}');
for (const [key, axis] of Object.entries(graph.axes)) for (const mode of axis.values) {
  cssLines.push(`.sloy-v4[data-${axisAttributes[key]}="${mode.toLowerCase()}"], .sloy-v4 [data-${axisAttributes[key]}="${mode.toLowerCase()}"] {`);
  for (const candidate of axis.values) cssLines.push(`  ${gate(key, candidate)}: ${candidate === mode ? 'initial' : ' '};`);
  cssLines.push('}');
}
function cssValue(value, token) {
  if (value?.alias) return `var(${variables.get(value.alias).css})`;
  if (value?.color) return `rgb(from var(${variables.get(value.color.alias).css}) r g b / calc(var(${variables.get(value.opacity.alias).css}) / 100))`;
  if (token.type === 'COLOR') return `rgb(${[value.r, value.g, value.b].map(channel => Number((channel * 255).toFixed(8))).join(' ')} / ${value.a})`;
  if (token.type === 'STRING') return JSON.stringify(value);
  return value + (token.unit === 'number' ? '' : 'px');
}
cssLines.push('.sloy-v4 {');
for (const owner of collections.filter(owner => owner.modes.length === 1)) for (const token of owner.variables) cssLines.push(`  ${token.css}: ${cssValue(token.values[owner.modes[0]], token)};`);
cssLines.push('}');
cssLines.push(['.sloy-v4', ...Object.values(axisAttributes).map(attribute => `.sloy-v4 [data-${attribute}]`)].join(',\n') + ' {');
for (const owner of collections.filter(owner => owner.modes.length > 1)) for (const token of owner.variables) {
  const values = owner.modes.map(mode => cssValue(token.values[mode], token));
  const expression = new Set(values).size === 1 ? values[0] : owner.modes.map((mode, index) => `var(${gate(owner.key, mode)}, ${values[index]})`).join(' ');
  cssLines.push(`  ${token.css}: ${expression};`);
}
cssLines.push('}', '.sloy-v4 .sloy-surface, .sloy-v4.sloy-surface { background: var(--sloy-theme-surface-bg); color: var(--sloy-theme-content-primary); }', '.sloy-v4 .sloy-block { background: var(--sloy-theme-surface-block); }', '');
const css = cssLines.join('\n');
assert(!/--sloy-[\w-]*background/.test(css), 'Use bg in token identifiers.');
const declarations = new Set([...css.matchAll(/(--sloy-[\w-]+)\s*:/g)].map(match => match[1]));
for (const [path, token] of variables) assert(declarations.has(token.css), 'Missing CSS: ' + path);

const mapping = { schemaVersion: 1, from: 'v3', to: 'v4', oldToNew, publicColors: Object.fromEntries(Object.entries(oldToNew).filter(([path]) => path.startsWith('Semantic/'))), retiredAdaptiveScales: ['Density/space/step-10', 'Density/space/step-12', 'Density/space/step-16'], axes: { Semantic: 'Surface', Theme: 'Theme', SurfaceScheme: 'SurfaceScheme', Density: 'Density', Radius: 'Radius', Borders: 'Borders' }, note: 'Цветовые привязки переносятся на публичный Theme. Плотность использует purpose-based adaptive/fixed роли. Удалённые общие step-10/12/16 переводятся в фиксированное значение Default; их прежнее изменение в Compact не сохраняется. Имена внутренних коллекций не являются публичным API.' };
assert(rawColors.size === authoredPaletteCount, 'Semantic generation must never add raw colors.');
const audit = {
  schemaVersion: 4, result: 'pass', sourceHash: graph.sourceHash, graphHash: hash(JSON.stringify(graph, null, 2) + '\n'), cssHash: hash(css), mappingHash: hash(JSON.stringify(mapping, null, 2) + '\n'),
  collections: collections.map(owner => ({ key: owner.key, modes: owner.modes, variables: owner.variables.length, hidden: owner.hidden })),
  totalVariables: variables.size, authoredPaletteColors: authoredPaletteCount, paletteColors: rawColors.size, extraOpaqueColors: rawColors.size - authoredPaletteCount, alphaColors: byKey.get('Palette').variables.filter(token => token.values.Value.a !== 1).length,
  paletteSelection: selection.diagnostics, contextualColorRoles: coreRoles.length, stableColorRoles: Object.keys(stableRoles).length,
  aliasValues, contextChecks, crossCollectionAliasesOnly: true, rawColorsOutsidePalette: 0, semanticDuplicatesRemoved: 29,
  secondaryPairs: secondaryAudit.length, minimumSecondaryTextContrast: Math.min(...secondaryAudit.map(pair => pair.contrast)), minimumSecondaryStateContrast: Math.min(...secondaryAudit.filter(pair => pair.previousStateContrast !== null).map(pair => pair.previousStateContrast)),
  minimumFocusToAllLocalBackgroundsContrast: Math.min(...focusAudit.map(context => context.minimumContrast)), focusContexts: focusAudit,
  adaptiveDensity: densityRoles, fixedDensity: Object.fromEntries(Object.entries(fixedDensity).map(([name, path]) => [name, resolve(path)])), mappingPaths: Object.keys(oldToNew).length,
  note: 'Проверка файлов. Нативные привязки, режимы и внешний вид Figma проверяются отдельно.',
};
await mkdir(auditDirectory, { recursive: true });
// Palette Lab consumes the same resolved region and neutral backing contexts.
// Keep the bridge separate from the legacy v2 resolved.json and its old surface math.
const paletteContexts = {};
for (const Theme of themes) for (const SurfaceScheme of ['Standard','Dimmed']) for (const Surface of canonicalSurfaces) {
  const selection={Theme,SurfaceScheme,Surface};
  paletteContexts[`${Theme}/${SurfaceScheme}/${Surface}`]=Object.fromEntries(Object.entries({
    'surface/bg':'surface/bg',
    'surface/secondary/normal':'surface/block',
    'surface/secondary/active':'surface/secondary/neutral-pressed',
    'surface/tertiary/normal':'surface/secondary/neutral-normal',
    'surface/tertiary/active':'surface/secondary/neutral-hover',
  }).map(([name,role])=>[name,resolve('Theme/'+role,selection)]));
}
await writeFile(new URL('palette-contexts.json', directory), JSON.stringify(paletteContexts,null,2)+'\n');
await writeFile(new URL('graph.json', directory), JSON.stringify(graph, null, 2) + '\n');
await writeFile(new URL('tokens.css', directory), css);
await writeFile(new URL('build-audit.json', auditDirectory), JSON.stringify(audit, null, 2) + '\n');
await writeFile(new URL('mapping.json', auditDirectory), JSON.stringify(mapping, null, 2) + '\n');
console.log(JSON.stringify({ result: audit.result, collections: audit.collections, totalVariables: audit.totalVariables, publicTheme: byKey.get('Theme').variables.length, palette: audit.paletteColors, extraOpaqueColors: rawColors.size - authoredPaletteCount, mappingPaths: audit.mappingPaths }, null, 2));
