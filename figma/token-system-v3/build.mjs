import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Standalone Figma source. This does not import or overwrite the web kit graph.
const directory = new URL('./', import.meta.url);
const auditDirectory = new URL('../../artifacts/token-system-v3/', import.meta.url);
const sourceText = await readFile(new URL('source.json', directory), 'utf8');
const source = JSON.parse(sourceText);
const hash = value => createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(value);
const round = value => Number(value.toFixed(10));
const linear = value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
const encode = value => value <= .0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - .055;
const Y = color => .2126 * linear(color.r) + .7152 * linear(color.g) + .0722 * linear(color.b);
const contrast = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
const color = (r, g, b, a = 1) => ({ r: round(r), g: round(g), b: round(b), a: round(a) });
const fromHex = hex => color(...hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255));
const toHex = c => '#' + [c.r, c.g, c.b].map(value => Math.round(value * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
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
function colorAtLuminance(hue, targetY, chromaMultiplier = 1) {
  if (hue === 'neutral') return gray(targetY);
  const at = L => {
    const t = Math.max(0, Math.min(1, (1 - L) / (1 - source.palette.lightnessFloor)));
    const C = source.palette.chromaPeak * Math.sin(Math.PI * t) ** source.palette.chromaExponent * chromaMultiplier;
    return gamutColor(L, C, source.palette.hues[hue]);
  };
  let low = 0, high = 1;
  for (let index = 0; index < 42; index++) {
    const middle = (low + high) / 2;
    if (Y(at(middle)) < targetY) low = middle;
    else high = middle;
  }
  return at((low + high) / 2);
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
  const value = { name, type, values, scopes, css: cssName(path), description, ...options };
  owner.variables.push(value); variables.set(path, value); return path;
}
collection('Palette', ['Value'], true, 'Exactly 417 immutable authored colors: 17 hue ramps, the 41-step gray ramp, black and white. No contextual derived values.');
collection('Primitives', ['Value'], false, 'Fixed dimensions and a separate font group. These values never change with Density or Radius.');
collection('Theme', ['Light', 'Dark'], true, 'Purpose-first contextual appearance values: exact Palette aliases when available, otherwise exact computed RGBA. Semantic roles and hues retain their own variables.');
collection('SurfaceScheme', ['Standard', 'Inverted'], true, 'Internal independent scheme. Only Dark Workspace and Content are swapped, including all paired secondary colors.');
collection('Semantic', ['Shell', 'Workspace', 'Content', 'Overlay'], false, 'Reusable contextual colors. Set the surface on the painted frame; children inherit it.');
collection('Density', ['Default', 'Compact'], false, source.density.formula);
collection('Radius', ['Default', 'None', 'Compact', 'Rounded'], false, source.radius.formula);
collection('Borders', ['Off', 'On'], false, 'Decorative boundary width. Focus and structural separators remain visible independently.');

const rawColors = new Map();
function palette(name, value, description = '') {
  const path = variable('Palette', name, 'COLOR', { Value: value }, [], description);
  rawColors.set(path, value); return path;
}
for (const [hue, angle] of Object.entries(source.palette.hues)) {
  for (const step of source.palette.steps) {
    const t = step / 1000, L = 1 - (1 - source.palette.lightnessFloor) * t;
    const C = source.palette.chromaPeak * Math.sin(Math.PI * t) ** source.palette.chromaExponent;
    palette(`${hue}/${step}`, gamutColor(L, C, angle), 'Authored analytic OKLCH ramp; gamut mapped by reducing chroma.');
  }
}
for (const step of source.palette.neutralSteps) {
  const luminance = Math.max(0, 1.05 * Math.exp(-Math.log(source.palette.neutralContrastSpan) * step / 1000) - .05);
  palette('gray/' + step, gamutColor(Math.cbrt(luminance), 0, 0), 'Original 41-step neutral ramp.');
}
palette('black', color(0, 0, 0)); palette('white', color(1, 1, 1));
const authoredPaletteCount = rawColors.size;
assert(authoredPaletteCount === 417, 'Original 417-color palette must remain intact.');

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

const densityRoles = {};
function adaptive(name, formula, scopes = ['GAP']) {
  const values = {};
  for (const mode of byKey.get('Density').modes) {
    const value = formula(source.density[mode].unit);
    assert(Number.isInteger(value) && value >= 0, 'Noninteger density value: ' + name);
    values[mode] = alias(fixedNumber(value));
  }
  densityRoles[name] = Object.fromEntries(Object.entries(values).map(([mode, ref]) => [mode, variables.get(ref.alias).values.Value]));
  variable('Density', name, 'FLOAT', values, scopes, source.density.formula, { unit: 'px' });
}
for (const count of [0, .5, 1, 2, 3, 4, 6, 8, 10, 12, 16]) adaptive('space/step-' + String(count).replace('.', '_'), unit => Math.round(unit * count));
for (const [family, ratios] of Object.entries({ inset: { xs: 1, sm: 2, md: 3, lg: 4, xl: 6 }, gap: { xs: .5, sm: 1, md: 2, lg: 3, xl: 4 }, stack: { sm: 2, md: 4, lg: 6, xl: 8 } })) {
  for (const [size, ratio] of Object.entries(ratios)) adaptive(`space/${family}-${size}`, unit => Math.round(unit * ratio));
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

const hues = ['neutral', ...Object.keys(source.palette.hues)];
const states = ['normal', 'hover', 'pressed'];
const themes = ['Light', 'Dark'];
const surfaceNames = Object.keys(source.surfaces);
const contexts = {};
const secondaryAudit = [];
const primaryAudit = [];
const focusAudit = [];
const baselineInks = {};
const paletteByColor = new Map([...rawColors].map(([path, value]) => [stable(value), path]));
for (const hue of hues.filter(value => value !== 'neutral')) {
  const candidates = [...rawColors].filter(([path]) => path.startsWith('Palette/' + hue + '/')).map(([path, value]) => ({ path, value, y: Y(value) }));
  candidates.sort((a, b) => Math.abs(Math.log((a.y + .05) / (.72 + .05))) - Math.abs(Math.log((b.y + .05) / (.72 + .05))));
  baselineInks[hue] = candidates[0];
}
for (const surface of surfaceNames) {
  contexts[surface] = {};
  for (const theme of themes) {
    const dark = theme === 'Dark', spec = source.surfaces[surface], roles = {};
    const surfaceColor = fromHex(dark ? spec.dark : spec.light), blockColor = fromHex(dark ? spec.blockDark : spec.blockLight);
    const surfaceY = Y(surfaceColor), blockY = Y(blockColor);
    const put = (role, value) => roles[role] = value;
    put('surface/bg', surfaceColor, spec.usage);
    put('surface/block', blockColor, 'Static local block on the selected surface. Does not change the surface context.');
    const baseRatio = contrast(surfaceY, blockY);
    const targets = source.secondary.stateContrastMultipliers.map(multiplier => dark ? (surfaceY + .05) * baseRatio * multiplier - .05 : (surfaceY + .05) / (baseRatio * multiplier) - .05);
    const maxFillY = dark ? Math.max(...targets) : Math.min(...targets);
    const focusBackgrounds = [surfaceColor, blockColor];
    for (const hue of hues) {
      const backgrounds = targets.map((target, index) => hue === 'neutral' && index === 0 ? blockColor : colorAtLuminance(hue, target, dark ? source.secondary.darkChromaMultiplier : source.secondary.lightChromaMultiplier));
      focusBackgrounds.push(...backgrounds);
      const textTarget = dark ? Math.max(source.secondary.darkContentLuminance, (Math.max(...backgrounds.map(Y)) + .05) * source.secondary.minimumTextContrast - .05) : Math.min(source.secondary.lightContentLuminance, (Math.min(...backgrounds.map(Y)) + .05) / source.secondary.minimumTextContrast - .05);
      const content = colorAtLuminance(hue, textTarget, 1);
      assert(contrast(Y(content), blockY) >= source.secondary.minimumTextContrast, `Secondary content on block failed: ${surface}/${theme}/${hue}`);
      put(`secondary/${hue}-content`, content, 'Paired text and icon color for all three secondary states.');
      for (const [index, state] of states.entries()) {
        const bg = backgrounds[index], fillY = Y(bg), borderRatio = 1.18 + index * .06;
        const borderY = dark ? (fillY + .05) * borderRatio - .05 : (fillY + .05) / borderRatio - .05;
        put(`secondary/${hue}-${state}`, bg, 'Opaque surface-specific secondary fill; pair with the matching hue-content.');
        put(`secondary/${hue}-border-${state}`, colorAtLuminance(hue, borderY, dark ? source.secondary.darkChromaMultiplier : source.secondary.lightChromaMultiplier), 'Optional boundary paired to the same secondary state.');
        const pairContrast = contrast(fillY, Y(content));
        secondaryAudit.push({ surface, theme, hue, state, background: toHex(bg), content: toHex(content), contrast: round(pairContrast), surfaceContrast: round(contrast(surfaceY, fillY)), contentLuminance: round(Y(content)), previousStateContrast: index ? round(contrast(fillY, Y(backgrounds[index - 1]))) : null });
        assert(pairContrast >= source.secondary.minimumTextContrast - 1e-7, `Secondary contrast failed: ${surface}/${theme}/${hue}/${state}`);
        if (index) assert(contrast(fillY, Y(backgrounds[index - 1])) >= source.secondary.minimumStateContrast, `State distinction failed: ${surface}/${theme}/${hue}/${state}`);
      }
      const primaryTargets = hue === 'neutral' ? dark ? [.90, .78, .66] : [.018, .03, .045] : dark ? [.50, .60, .70] : [.10, .075, .05];
      const primaryBackgrounds = primaryTargets.map(target => colorAtLuminance(hue, target));
      const primaryContent = dark ? color(0, 0, 0) : color(1, 1, 1);
      put(`primary/${hue}-content`, primaryContent, 'Paired content color for the matching primary hue in every state.');
      for (const [index, state] of states.entries()) {
        put(`primary/${hue}-${state}`, primaryBackgrounds[index], 'Opaque primary action fill. Use matching primary hue-content.');
        const pairContrast = contrast(Y(primaryBackgrounds[index]), Y(primaryContent));
        primaryAudit.push({ surface, theme, hue, state, contrast: round(pairContrast) });
        assert(pairContrast >= 4.5 - 1e-7, 'Primary contrast failed: ' + [surface, theme, hue, state].join('/'));
      }
    }
    const textTargets = dark ? { primary: .96, secondary: .82, tertiary: .71, muted: .62, caption: .56 } : { primary: .012, secondary: .035, tertiary: .055, muted: .075, caption: .09 };
    for (const [name, target] of Object.entries(textTargets)) {
      const readable = dark ? Math.max(target, (maxFillY + .05) * 4.5 - .05) : Math.min(target, (maxFillY + .05) / 4.5 - .05);
      assert(contrast(readable, blockY) >= 4.5, `Content on block failed: ${surface}/${theme}/${name}`);
      assert(contrast(readable, surfaceY) >= 4.5, `Content on surface failed: ${surface}/${theme}/${name}`);
      put('content/' + name, gray(readable), 'Neutral content on the current surface, its block and secondary fills.');
    }
    for (const [name, ratio] of Object.entries({ subtle: 1.15, default: 1.3, strong: 1.65 })) {
      put('border/' + name, gray(dark ? (surfaceY + .05) * ratio - .05 : (surfaceY + .05) / ratio - .05), 'Decorative or structural boundary color on the selected surface.');
    }
    const focusWorstY = dark ? Math.max(...focusBackgrounds.map(Y)) : Math.min(...focusBackgrounds.map(Y));
    const focusColor = gray(dark ? (focusWorstY + .05) * 3.2 - .05 : (focusWorstY + .05) / 3.2 - .05);
    assert(focusBackgrounds.every(background => contrast(Y(focusColor), Y(background)) >= 3.1), 'Focus contrast across local backgrounds failed: ' + surface + '/' + theme);
    focusAudit.push({ surface, theme, backgrounds: focusBackgrounds.length, minimumContrast: Math.min(...focusBackgrounds.map(background => contrast(Y(focusColor), Y(background)))) });
    put('focus/ring', focusColor, 'Keyboard focus indicator with at least 3.1:1 contrast to the surface, local block and every secondary state.');
    put('disabled/bg', colorAtLuminance('neutral', dark ? (surfaceY + .05) * 1.10 - .05 : (surfaceY + .05) / 1.05 - .05), 'Neutral unavailable control fill.');
    put('disabled/content', gray(dark ? .46 : .13), 'Neutral unavailable content. Disabled controls are not interactive.');
    put('overlay/scrim', color(0, 0, 0, dark ? .58 : .32), 'Translucent modal scrim; semantic alias remains paired with the selected theme.');
    for (const [tone, hue] of Object.entries({ danger: 'red', success: 'green', warning: 'amber', info: 'blue' })) {
      roles[`status/${tone}-bg`] = roles[`secondary/${hue}-normal`];
      roles[`status/${tone}-content`] = roles[`secondary/${hue}-content`];
      roles[`status/${tone}-border`] = roles[`secondary/${hue}-border-normal`];
    }
    contexts[surface][theme] = roles;
  }
}
const semanticRoles = Object.keys(contexts.Shell.Light);
for (const surface of surfaceNames) for (const theme of themes) assert(Object.keys(contexts[surface][theme]).join('|') === semanticRoles.join('|'), 'Context role mismatch.');
const publicRoutes = Object.fromEntries(surfaceNames.map(surface => [surface, {}]));
const standardRoutes = Object.fromEntries(surfaceNames.map(surface => [surface, {}]));
const sharedRolePairs = new Map();
const statusHues = { danger: 'red', success: 'green', warning: 'amber', info: 'blue' };
function canonicalRole(role) {
  const match = /^status\/(danger|success|warning|info)-(bg|content|border)$/.exec(role);
  return match ? `secondary/${statusHues[match[1]]}-${{ bg: 'normal', content: 'content', border: 'border-normal' }[match[2]]}` : role;
}
const canonicalRoles = [...new Set(semanticRoles.map(canonicalRole))];
for (const role of canonicalRoles) {
  sharedRolePairs.set(role, new Set(surfaceNames.map(surface => stable(themes.map(theme => contexts[surface][theme][role])))).size === 1);
}
function purposeName(role, surface, shared = sharedRolePairs.get(role)) {
  const local = shared ? '' : '-' + surface.toLowerCase();
  const chromatic = /^(primary|secondary)\/([a-z]+)-(border-(normal|hover|pressed)|normal|hover|pressed|content)$/.exec(role);
  if (chromatic) {
    const [, family, hue, state, borderState] = chromatic;
    if (state === 'content') return `${family}/content/${hue}${local}`;
    if (borderState) return `${family}/border/${hue}${local}-${borderState}`;
    return `${family}/bg/${hue}${local}-${state}`;
  }
  if (role === 'surface/bg') return 'surface/bg/' + surface.toLowerCase();
  if (role === 'surface/block') return 'surface/block/' + surface.toLowerCase();
  if (role.startsWith('content/')) return role + local;
  if (role.startsWith('border/')) return role + local;
  if (role === 'focus/ring') return 'border/' + (shared ? '' : surface.toLowerCase() + '-') + 'focus';
  if (role === 'disabled/bg') return 'secondary/bg/disabled' + local;
  if (role === 'disabled/content') return 'content/disabled' + local;
  if (role === 'overlay/scrim') return 'surface/bg/scrim' + local;
  throw new Error('Unmapped contextual role: ' + role);
}
function themeValue(value) {
  const exactPalette = paletteByColor.get(stable(value));
  return exactPalette ? alias(exactPalette) : value;
}
// Reuse only the same semantic role across all four surfaces when the entire
// Light/Dark pair matches. Equal colors never merge different roles or hues.
for (const role of canonicalRoles) {
  let sharedPath;
  for (const surface of surfaceNames) {
    if (sharedRolePairs.get(role) && sharedPath) { standardRoutes[surface][role] = sharedPath; continue; }
    const name = purposeName(role, surface);
    const values = Object.fromEntries(themes.map(theme => [theme, themeValue(contexts[surface][theme][role])]));
    const path = variable('Theme', name, 'COLOR', values, [], 'Contextual ' + role + (sharedRolePairs.get(role) ? '; the same Light/Dark pair on every surface.' : '; exact pair for ' + surface + '.'));
    standardRoutes[surface][role] = path;
    if (sharedRolePairs.get(role)) sharedPath = path;
  }
}
for (const surface of surfaceNames) {
  for (const role of canonicalRoles) {
    const standard = standardRoutes[surface][role];
    publicRoutes[surface][role] = standard;
    if (surface !== 'Workspace' && surface !== 'Content') continue;
    const swapped = surface === 'Workspace' ? 'Content' : 'Workspace';
    if (stable(contexts[surface].Dark[role]) === stable(contexts[swapped].Dark[role])) continue;
    const name = purposeName(role, surface);
    const inverse = variable('Theme', name + '-inverted', 'COLOR', { Light: alias(standard), Dark: alias(standardRoutes[swapped][role]) }, [], 'Inverted routing aliases standard Theme values: Light keeps ' + surface + ', Dark uses ' + swapped + '.');
    publicRoutes[surface][role] = variable('SurfaceScheme', name, 'COLOR', { Standard: alias(standard), Inverted: alias(inverse) }, [], 'Independent surface scheme for ' + role + ' on ' + surface + '.');
  }
  for (const role of semanticRoles) publicRoutes[surface][role] = publicRoutes[surface][canonicalRole(role)];
}
function roleScopes(role) {
  if (role.includes('content') || role.startsWith('content/')) return ['TEXT_FILL', 'SHAPE_FILL'];
  if (role.includes('border') || role.startsWith('focus/')) return ['STROKE_COLOR'];
  return ['FRAME_FILL', 'SHAPE_FILL'];
}
for (const role of semanticRoles) {
  const values = Object.fromEntries(surfaceNames.map(surface => [surface, alias(publicRoutes[surface][role])]));
  const description = role.startsWith('surface/') ? role === 'surface/bg' ? 'Paints the currently selected Shell, Workspace, Content or Overlay surface. Set the mode on this painted container.' : 'Static block fill relative to the current surface. Keeps the parent context; use secondary hue states for interactive objects.' : role.startsWith('secondary/') ? 'Reusable secondary role. Hue and state are in the leaf name; inherits Theme, SurfaceScheme and Semantic surface.' : 'Universal semantic role, independent of component names.';
  variable('Semantic', role, 'COLOR', values, roleScopes(role), description);
}

const graph = {
  schemaVersion: 3,
  name: source.name,
  sourceHash: hash(sourceText),
  axes: { Theme: { default: 'Light', values: themes }, SurfaceScheme: { default: 'Standard', values: ['Standard', 'Inverted'] }, Semantic: { default: 'Shell', values: surfaceNames }, Density: { default: 'Default', values: ['Default', 'Compact'] }, Radius: { default: 'Default', values: byKey.get('Radius').modes }, Borders: { default: 'Off', values: ['Off', 'On'] } },
  collections,
  conventions: { aliases: '{ alias: "CollectionKey/variable/name" }', color: '{r,g,b,a}, sRGB channels 0..1', fontRoles: source.fonts.family, stateNames: states, semanticOnlyColors: true, componentCollection: false, densityFormula: source.density.formula, radiusFormula: source.radius.formula, surfaces: source.surfaces, cssScope: '.sloy-v3', inheritance: 'Select modes on the parent and leave descendants on Auto unless they establish another painted surface. Every axis inherits independently.', staticBlock: 'surface/block paints a block while keeping its parent Semantic mode; it is not a fifth surface.' },
};

function resolve(path, selection = {}, seen = []) {
  assert(!seen.includes(path), 'Alias cycle: ' + [...seen, path].join(' → '));
  const token = variables.get(path);
  assert(token, 'Missing alias: ' + path);
  const key = path.split('/')[0], owner = byKey.get(key), mode = selection[key] || graph.axes[key]?.default || owner.modes[0];
  const value = token.values[mode];
  assert(value !== undefined, 'Missing mode: ' + path + '/' + mode);
  return value && typeof value === 'object' && value.alias ? resolve(value.alias, selection, [...seen, path]) : value;
}
const matrix = [];
let aliasCount = 0, aliasResolutionCount = 0;
for (const owner of collections) for (const token of owner.variables) {
  for (const value of Object.values(token.values)) {
    if (value && typeof value === 'object' && value.alias) {
      aliasCount++;
      assert(variables.has(value.alias), 'Unknown alias target: ' + value.alias);
      assert(variables.get(value.alias).type === token.type, 'Alias type mismatch: ' + owner.key + '/' + token.name);
    } else if (token.type === 'COLOR') assert(['Palette', 'Theme'].includes(owner.key), 'Raw color outside Palette or Theme: ' + owner.key + '/' + token.name);
  }
}
for (const Theme of themes) for (const SurfaceScheme of ['Standard', 'Inverted']) for (const Semantic of surfaceNames) {
  const selection = { Theme, SurfaceScheme, Semantic };
  const expectedSurface = Theme === 'Dark' && SurfaceScheme === 'Inverted' && ['Workspace', 'Content'].includes(Semantic) ? Semantic === 'Workspace' ? 'Content' : 'Workspace' : Semantic;
  for (const role of semanticRoles) {
    const resolved = resolve('Semantic/' + role, selection); aliasResolutionCount++;
    const expected = contexts[expectedSurface][Theme][role];
    assert(stable(resolved) === stable(expected), 'Surface scheme routing mismatch: ' + stable(selection) + '/' + role);
  }
  matrix.push({ ...selection, bg: toHex(resolve('Semantic/surface/bg', selection)), block: toHex(resolve('Semantic/surface/block', selection)), expectedSurface });
}
for (const Density of ['Default', 'Compact']) for (const Radius of Object.keys(source.radius.modes)) {
  for (const owner of ['Primitives', 'Density', 'Radius', 'Borders']) for (const token of byKey.get(owner).variables) { resolve(owner + '/' + token.name, { Density, Radius }); aliasResolutionCount++; }
  assert(resolve('Primitives/size/touch', { Density, Radius }) === 44, 'Touch target must stay fixed.');
  for (const [size, geometry] of Object.entries(controlGeometry)) {
    assert(resolve('Density/size/control-' + size, { Density, Radius }) === geometry.lineHeight + 2 * resolve('Density/space/control-inset-y-' + size, { Density, Radius }), 'Control height arithmetic mismatch.');
  }
}
const brighterInk = [];
for (const hue of hues.filter(value => value !== 'neutral')) {
  const previous = baselineInks[hue], current = resolve('Semantic/secondary/' + hue + '-content', { Theme: 'Dark' });
  assert(Y(current) > previous.y, 'Dark secondary content is not brighter: ' + hue);
  brighterInk.push({ hue, previousPaletteInk: previous.path, previous: toHex(previous.value), previousLuminance: round(previous.y), current: toHex(current), currentLuminance: round(Y(current)), improvement: round(Y(current) - previous.y) });
}

// CSS mirrors the same alias graph. Inherited sentinel selectors keep all six
// axes independent even when only one attribute is overridden on a descendant.
const cssLines = ['/* Generated by figma/token-system-v3/build.mjs; independent from the web kit. */', '.sloy-v3 {'];
const axisAttributes = { Theme: 'theme', SurfaceScheme: 'surface-scheme', Semantic: 'surface', Density: 'density', Radius: 'radius', Borders: 'borders' };
function gate(key, mode) { return '--sloy-route-' + key.toLowerCase() + '-' + mode.toLowerCase(); }
for (const [key, axis] of Object.entries(graph.axes)) {
  for (const mode of axis.values) cssLines.push(`  ${gate(key, mode)}: ${mode === axis.default ? 'initial' : ' '};`);
}
cssLines.push('}');
for (const [key, axis] of Object.entries(graph.axes)) {
  for (const mode of axis.values) {
    cssLines.push(`.sloy-v3[data-${axisAttributes[key]}="${mode.toLowerCase()}"], .sloy-v3 [data-${axisAttributes[key]}="${mode.toLowerCase()}"] {`);
    for (const candidate of axis.values) cssLines.push(`  ${gate(key, candidate)}: ${candidate === mode ? 'initial' : ' '};`);
    cssLines.push('}');
  }
}
function cssValue(value, token) {
  if (value && typeof value === 'object' && value.alias) return `var(${variables.get(value.alias).css})`;
  if (token.type === 'COLOR') return `rgb(${[value.r, value.g, value.b].map(channel => Number((channel * 255).toFixed(8))).join(' ')} / ${value.a})`;
  if (token.type === 'STRING') return JSON.stringify(value);
  return String(value) + (token.unit === 'number' ? '' : 'px');
}
// Raw primitive declarations inherit unchanged from the scope root.
cssLines.push('.sloy-v3 {');
for (const owner of collections.filter(value => value.modes.length === 1)) for (const token of owner.variables) cssLines.push(`  ${token.css}: ${cssValue(token.values[owner.modes[0]], token)};`);
cssLines.push('}');
const contextSelectors = Object.values(axisAttributes).map(attribute => `.sloy-v3 [data-${attribute}]`);
cssLines.push(['.sloy-v3', ...contextSelectors].join(',\n') + ' {');
for (const owner of collections.filter(value => value.modes.length > 1)) {
  for (const token of owner.variables) {
    const values = owner.modes.map(mode => cssValue(token.values[mode], token));
    const expression = new Set(values).size === 1 ? values[0] : owner.modes.map((mode, index) => `var(${gate(owner.key, mode)}, ${values[index]})`).join(' ');
    cssLines.push(`  ${token.css}: ${expression};`);
  }
}
cssLines.push('}', '.sloy-v3 .sloy-surface, .sloy-v3.sloy-surface { background: var(--sloy-semantic-surface-bg); color: var(--sloy-semantic-content-primary); }', '.sloy-v3 .sloy-block { background: var(--sloy-semantic-surface-block); }', '');
const css = cssLines.join('\n');
const declarations = new Set([...css.matchAll(/(--sloy-[\w-]+)\s*:/g)].map(match => match[1]));
for (const [path, token] of variables) assert(declarations.has(token.css), 'Unimplemented CSS syntax: ' + path);
assert(![...variables].some(([path, token]) => path.includes('background') || token.css.includes('background')), 'Token names must use bg.');
assert(!/--sloy-[\w-]*background/.test(css), 'CSS token names must use bg.');

// ID migration is derived from semantic usage, never guessed from equal RGB.
// The optional local baseline is a receipt, not a source of token values.
const refinementDirectory = new URL('refinement/', auditDirectory);
const baselineText = await readFile(new URL('graph-before.json', refinementDirectory), 'utf8').catch(error => {
  if (error.code === 'ENOENT') return null;
  throw error;
});
let migration = null;
if (baselineText) {
  const before = JSON.parse(baselineText);
  const oldOwners = new Map(before.collections.map(owner => [owner.key, owner]));
  const oldVariables = new Map(before.collections.flatMap(owner => owner.variables.map(token => [owner.key + '/' + token.name, token])));
  function trace(path, selection, entries, owners) {
    const chain = [], seen = new Set();
    for (;;) {
      assert(!seen.has(path), 'Migration alias cycle: ' + path); seen.add(path);
      const token = entries.get(path), key = path.split('/')[0], owner = owners.get(key);
      assert(token && owner, 'Missing migration variable: ' + path);
      const mode = selection[key] || owner.modes[0], value = token.values[mode];
      assert(value !== undefined, 'Missing migration mode: ' + path + '/' + mode);
      chain.push({ path, mode });
      if (!value?.alias) return { chain, value };
      path = value.alias;
    }
  }
  const semanticRenames = {};
  const entries = new Map(['Theme', 'SurfaceScheme'].flatMap(key => byKey.get(key).variables.map(token => [key + '/' + token.name, { newPath: key + '/' + token.name, oldPaths: new Set(), usages: [] }])));
  let equivalenceChecks = 0;
  const oldSemantic = oldOwners.get('Semantic').variables;
  assert(oldSemantic.length === semanticRoles.length, 'Semantic role count changed during refinement.');
  for (const token of oldSemantic) {
    const oldPath = 'Semantic/' + token.name, newPath = oldPath.replaceAll('background', 'bg');
    assert(variables.has(newPath), 'Missing refined semantic role: ' + newPath);
    if (oldPath !== newPath) semanticRenames[oldPath] = newPath;
    for (const Theme of themes) for (const SurfaceScheme of ['Standard', 'Inverted']) for (const Semantic of surfaceNames) {
      const selection = { Theme, SurfaceScheme, Semantic };
      const oldTrace = trace(oldPath, selection, oldVariables, oldOwners), newTrace = trace(newPath, selection, variables, byKey);
      assert(stable(oldTrace.value) === stable(newTrace.value), 'Refinement changed resolved color: ' + newPath + ' ' + stable(selection));
      equivalenceChecks++;
      for (const step of newTrace.chain) {
        const entry = entries.get(step.path);
        if (!entry) continue;
        const key = step.path.split('/')[0];
        const oldPaths = oldTrace.chain.filter(item => item.path.startsWith(key + '/')).map(item => item.path);
        for (const path of oldPaths) entry.oldPaths.add(path);
        entry.usages.push({ semanticPath: newPath, oldSemanticPath: oldPath, surface: Semantic, theme: Theme, scheme: SurfaceScheme, oldPaths });
      }
    }
  }
  const serializeEntries = key => [...entries.values()].filter(entry => entry.newPath.startsWith(key + '/')).map(entry => {
    assert(entry.oldPaths.size > 0 && entry.usages.length > 0, 'Unmapped migration variable: ' + entry.newPath);
    return { ...entry, oldPaths: [...entry.oldPaths].sort() };
  });
  migration = {
    schemaVersion: 1,
    baseline: 'artifacts/token-system-v3/refinement/graph-before.json',
    baselineHash: hash(baselineText),
    graphHash: hash(JSON.stringify(graph, null, 2) + '\n'),
    semanticRenames,
    theme: serializeEntries('Theme'),
    surfaceScheme: serializeEntries('SurfaceScheme'),
    resolvedSemanticEquivalenceChecks: equivalenceChecks,
    note: 'oldPaths are candidates selected by matching semantic role, surface, theme and scheme usage. The prior graph merged distinct roles by RGB, so one old ID can appear as a candidate for multiple new variables. Reuse each old ID at most once and rebind consumers through their semantic role; do not merge new variables by equal RGB.',
  };
}

const audit = {
  schemaVersion: 3,
  result: 'pass',
  sourceHash: graph.sourceHash,
  graphHash: hash(JSON.stringify(graph, null, 2) + '\n'),
  cssHash: hash(css),
  collections: collections.map(owner => ({ key: owner.key, modes: owner.modes, variables: owner.variables.length, hidden: owner.hidden })),
  totalVariables: variables.size,
  authoredPaletteColors: authoredPaletteCount,
  derivedPaletteColors: rawColors.size - authoredPaletteCount,
  aliases: aliasCount,
  aliasResolutionChecks: aliasResolutionCount,
  secondaryPairs: secondaryAudit.length,
  minimumSecondaryTextContrast: Math.min(...secondaryAudit.map(pair => pair.contrast)),
  minimumSecondaryStateContrast: Math.min(...secondaryAudit.filter(pair => pair.previousStateContrast !== null).map(pair => pair.previousStateContrast)),
  primaryPairs: primaryAudit.length,
  minimumPrimaryTextContrast: Math.min(...primaryAudit.map(pair => pair.contrast)),
  minimumFocusToAllLocalBackgroundsContrast: Math.min(...focusAudit.map(context => context.minimumContrast)),
  focusBackgroundChecks: focusAudit.reduce((sum, context) => sum + context.backgrounds, 0),
  focusContexts: focusAudit,
  rawColorsOutsidePaletteOrTheme: 0,
  themeRawColorValues: byKey.get('Theme').variables.flatMap(token => Object.values(token.values)).filter(value => !value.alias).length,
  themeRoots: [...new Set(byKey.get('Theme').variables.map(token => token.name.split('/')[0]))].sort(),
  migrationBaselineAvailable: Boolean(migration),
  refinementSemanticEquivalenceChecks: migration?.resolvedSemanticEquivalenceChecks || 0,
  componentsCollection: false,
  semanticColorOnly: true,
  cssDeclarationsVerified: variables.size,
  surfaceMatrix: matrix,
  density: densityRoles,
  radius: Object.fromEntries(Object.keys(source.radius.modes).map(Radius => [Radius, Object.fromEntries(byKey.get('Radius').variables.map(token => [token.name, resolve('Radius/' + token.name, { Radius })]))])),
  brighterDarkAccentInks: brighterInk,
  disclaimer: 'Generated artifact verification only. Native Figma values, aliases, bindings and mode switching require separate live readback. CSS declarations match the graph; browser computed-style verification is recorded separately.',
};
await writeFile(new URL('graph.json', directory), JSON.stringify(graph, null, 2) + '\n');
await writeFile(new URL('tokens.css', directory), css);
await mkdir(auditDirectory, { recursive: true });
await writeFile(new URL('audit.json', auditDirectory), JSON.stringify(audit, null, 2) + '\n');
await writeFile(new URL('secondary-audit.json', auditDirectory), JSON.stringify(secondaryAudit, null, 2) + '\n');
if (migration) {
  await mkdir(refinementDirectory, { recursive: true });
  await writeFile(new URL('migration-map.json', refinementDirectory), JSON.stringify(migration, null, 2) + '\n');
}
console.log(JSON.stringify({ result: audit.result, variables: audit.totalVariables, collections: audit.collections, secondaryPairs: audit.secondaryPairs, minimumContrast: audit.minimumSecondaryTextContrast, minimumStateContrast: audit.minimumSecondaryStateContrast, brighterDarkHues: brighterInk.length, sourceHash: audit.sourceHash }, null, 2));
