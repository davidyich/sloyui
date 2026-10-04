import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { srgb } from './token-utils.mjs';
const read = async p => JSON.parse(await readFile(new URL('../' + p, import.meta.url), 'utf8'));
const sources = { light: await read('source/light-css.json'), dark: await read('source/dark-css.json') };
const rules = await read('source/token-rules.json');
const surfaces = await read('source/surface-rules.json');
const { version } = await read('package.json');
const base = rules.find(r => r.selector === ':root, :host' && r.context === ' theme').variables;
const prefix = name => name.replace(/^--/, '--cap-');
const replaceRefs = value => value.replace(/var\((--[\w-]+)/g, (_, name) => `var(${prefix(name)}`);
const foundations = Object.fromEntries(Object.entries(base).filter(([k]) => /^--(font-|line-height-|radius-|shadow|default-transition|spacing$)/.test(k)));
for (const [k, v] of Object.entries(sources.dark.declared)) if (/^--(el-|border-radius)/.test(k)) foundations[k] = v;
const space = { 0: '0px', 1: '.25rem', 2: '.5rem', 3: '.75rem', 4: '1rem', 5: '1.25rem', 6: '1.5rem', 8: '2rem', 10: '2.5rem', 12: '3rem', 16: '4rem' };
for (const [k, v] of Object.entries(space)) foundations[`--space-${k}`] = v;
foundations['--radius-full'] = '9999px';
// V2 has two independent axes: appearance and locally inherited accent.
const steps = Array.from({ length: 12 }, (_, i) => i + 1);
const hues = 'neutral rose pink fuchsia purple violet indigo blue sky cyan teal emerald green lime yellow amber orange red'.split(' ');
const sampled = [50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const neutralHex = ['#ffffff', '#fafafa', '#f0f0f0', '#e5e5e5', '#d4d4d4', '#a3a3a3', '#666666', '#525252', '#343434', '#242424', '#181818', '#101010'];
const palettes = Object.fromEntries(hues.map(h => [h, Object.fromEntries(steps.map((step, i) => [step, h === 'neutral' ? neutralHex[i] : sources.light.declared[`--colors-${h}-${sampled[i]}`]]))]));
const neutral = Object.fromEntries(steps.map((step, i) => [`neutral/${step}`, srgb(neutralHex[i])]));
const appearance = {
  'surface/canvas': [3, 12], 'surface/base': [2, 11], 'surface/raised': [1, 10],
  'surface/hover': [3, 10], 'surface/active': [4, 9], 'surface/input': [1, 11],
  'content/primary': [10, 2], 'content/secondary': [8, 5], 'content/muted': [7, 6],
  'border/default': [4, 9], 'border/strong': [5, 8], 'focus/ring': [8, 5],
  'action/solid': [9, 4], 'action/hover': [8, 3], 'action/on-solid': [1, 12],
};
const accentRoles = { soft: [1, 12], bg: [2, 11], block: [3, 10], border: [4, 9], text: [11, 2], ink: [10, 3], solid: [10, 4], 'solid-hover': [11, 3], 'on-solid': [1, 12] };
const roleCSS = name => '--cap-' + name.replaceAll('/', '-');
const alias = path => ({ alias: path });
const appearances = Object.fromEntries(['light', 'dark'].map((theme, i) => [theme, {
  ...Object.fromEntries(Object.entries(appearance).map(([name, pair]) => [name, alias(`Neutral/neutral/${pair[i]}`)])),
  ...Object.fromEntries(Object.entries(accentRoles).map(([name, pair]) => [`accent/${name}`, alias(`Accent/accent/${pair[i]}`)])),
}]));
const collections = [
  { name: 'Neutral', modes: { Base: neutral } },
  { name: 'Accent', modes: Object.fromEntries(hues.map(h => [h, Object.fromEntries(steps.map(s => [`accent/${s}`, h === 'neutral' ? alias(`Neutral/neutral/${s}`) : srgb(palettes[h][s])]))])) },
  { name: 'Appearance', modes: { Light: appearances.light, Dark: appearances.dark } },
];
const dtcg = value => ({ $type: 'color', $value: value.alias ? `{${value.alias.replaceAll('/', '.')}}` : value });
for (const [mode, values] of Object.entries(appearances)) await writeFile(`src/tokens/${mode}.json`, JSON.stringify(Object.fromEntries(Object.entries(values).map(([name, value]) => [name, dtcg(value)])), null, 2) + '\n');
await writeFile('src/tokens/neutral.json', JSON.stringify(Object.fromEntries(Object.entries(neutral).map(([name, value]) => [name, dtcg(value)])), null, 2) + '\n');
await writeFile('src/tokens/accents.json', JSON.stringify(palettes, null, 2) + '\n');
const graph = { version, steps, modes: hues, collections, note: 'Appearance controls light/dark. Accent overrides a subtree with the identical 12-step scale. Neutral remains fixed. Aliases cross collections.' };
await writeFile('src/tokens/figma-modes.json', JSON.stringify(graph, null, 2) + '\n');
Object.assign(foundations, { '--duration-fast': '120ms', '--duration-normal': '180ms', '--duration-slow': '260ms', '--ease-standard': 'cubic-bezier(.2, 0, 0, 1)', '--ease-out': 'cubic-bezier(.16, 1, .3, 1)', '--overlay-gutter': '12px', '--overlay-padding': '8px', '--focus-width': '2px', '--focus-offset': '3px', '--touch-target': '44px' });
const block = obj => Object.entries(obj).map(([k, v]) => `  ${prefix(k)}: ${replaceRefs(v)};`).join('\n');
let css = `/* Generated V3. 12 steps, 18 accent modes, 24 appearance roles. */\n:root { color-scheme: light; }\n[data-theme="light"] { color-scheme: light; }\n[data-theme="dark"] { color-scheme: dark; }\n:root, [data-theme] {\n${block(foundations)}\n${steps.map(s => `  --cap-neutral-${s}: ${palettes.neutral[s]};`).join('\n')}\n}\n`;
css += ':root, [data-accent="neutral"], [data-color="neutral"], [data-color="gray"] {\n' + steps.map(s => `  --cap-accent-${s}: var(--cap-neutral-${s});`).join('\n') + '\n}\n';
for (const hue of hues.filter(h => h !== 'neutral')) css += `[data-accent="${hue}"], [data-color="${hue}"] {\n${steps.map(s => `  --cap-accent-${s}: ${palettes[hue][s]};`).join('\n')}\n}\n`;
// Surface context is explicit and inherited; it never samples the DOM background.
for (const [name, surface] of Object.entries(surfaces)) {
  css += `${name === 'base' ? ':root, ' : ''}[data-surface="${name}"] {\n`;
  for (const [key, pair] of Object.entries(surface)) for (const [i, mode] of ['light', 'dark'].entries()) css += `  --cap-context-${key}-${mode}: ${pair[i]}${typeof pair[i] === 'number' ? '%' : ''};\n`;
  css += '}\n';
}
css += ':root, [data-borders="off"] { --cap-outline-opacity: 0%; --cap-control-outline-light: 0%; --cap-control-outline-dark: 0%; }\n[data-borders="on"] { --cap-outline-opacity: 100%; --cap-control-outline-light: 75%; --cap-control-outline-dark: 45%; }\n';
// Re-declare aliases on each scope: inherited CSS aliases otherwise freeze to their parent's accent.
css += ':root, [data-theme], [data-accent], [data-color], [data-surface], [data-borders] {\n';
for (const [name, pair] of Object.entries(appearance)) css += `  ${roleCSS(name)}: light-dark(var(--cap-neutral-${pair[0]}), var(--cap-neutral-${pair[1]}));\n`;
for (const [name, pair] of Object.entries(accentRoles)) css += `  --cap-accent-${name}: light-dark(var(--cap-accent-${pair[0]}), var(--cap-accent-${pair[1]}));\n`;
const surfaceMix = (key, dark) => `color-mix(in srgb, ${dark ? '#fff' : '#000'} var(--cap-context-${key}-${dark ? 'dark' : 'light'}), var(--cap-context-background-${dark ? 'dark' : 'light'}))`;
css += `  --cap-surface-current: light-dark(var(--cap-context-background-light), var(--cap-context-background-dark));\n`;
for (const role of ['secondary', 'muted']) css += `  --cap-content-${role}: light-dark(var(--cap-context-${role}-light), var(--cap-context-${role}-dark));\n`;
for (const [role, key] of [['hover','hover'], ['active','active']]) css += `  --cap-control-${role}: light-dark(${surfaceMix(key, false)}, ${surfaceMix(key, true)});\n`;
// Outlined controls have quieter fills; switching outlines changes the surface as well.
css += '  --cap-control-bg: light-dark(color-mix(in srgb, var(--cap-context-background-light) var(--cap-control-outline-light), ' + surfaceMix('fill', false) + '), color-mix(in srgb, var(--cap-context-background-dark) var(--cap-control-outline-dark), ' + surfaceMix('fill', true) + '));\n';
for (const [role, source] of [['control-border','border-default'], ['panel-border','border-default'], ['control-border-strong','border-strong']]) css += `  --cap-${role}: color-mix(in srgb, var(--cap-${source}) var(--cap-outline-opacity), transparent);\n`;
for (const [role, delta] of [['soft',0],['bg',3],['block',6]]) css += `  --cap-accent-${role}: light-dark(color-mix(in srgb, var(--cap-accent-9) calc(var(--cap-context-accent-light) + ${delta}%), var(--cap-context-background-light)), color-mix(in srgb, var(--cap-accent-4) calc(var(--cap-context-accent-dark) + ${delta}%), var(--cap-context-background-dark)));\n`;
css += '  --cap-accent-border: color-mix(in srgb, light-dark(var(--cap-accent-4), var(--cap-accent-9)) var(--cap-outline-opacity), transparent);\n';
// Stable fixed feedback semantics. They do not follow an object's accent.
for (const [tone, hue] of Object.entries({ danger: 'red', success: 'green', warning: 'amber', info: 'blue' })) {
  css += `  --cap-status-${tone}-bg: light-dark(${palettes[hue][1]}, ${palettes[hue][12]});\n  --cap-status-${tone}-text: light-dark(${palettes[hue][11]}, ${palettes[hue][2]});\n`;
}
const compat = {
  'bg-base': 'surface-base', 'bg-back': 'surface-canvas', 'bg-front': 'surface-raised', 'bg-el': 'control-active', 'bg-el-strong': 'control-active', 'bg-el-subtle': 'control-bg',
  'bg-base-hover': 'control-hover', 'bg-back-hover': 'control-hover', 'bg-front-hover': 'control-hover', 'bg-el-hover': 'control-hover', 'bg-el-active': 'control-active', 'bg-el-subtle-hover': 'control-hover', 'bg-el-subtle-active': 'control-active',
  'bg-input': 'control-bg', 'bg-input-hover': 'control-hover', 'bg-input-active': 'control-bg',
  'text-primary': 'content-primary', 'text-secondary': 'content-secondary', 'text-muted': 'content-muted', 'text-subtle': 'content-muted', 'input-placeholder': 'content-muted',
  'bg-button-primary': 'action-solid', 'bg-button-primary-hover': 'action-hover', 'text-button-primary': 'action-on-solid', 'text-button-primary-hover': 'action-on-solid', 'border-button-primary': 'action-solid', 'border-button-primary-hover': 'action-hover',
  'border-base': 'panel-border', 'border-back': 'panel-border', 'border-front': 'panel-border', 'border-el-subtle': 'control-border', 'border-base-strong': 'control-border-strong', 'border-back-strong': 'control-border-strong', 'border-front-strong': 'control-border-strong', 'border-el': 'control-border-strong', 'border-el-hover': 'focus-ring', 'border-el-subtle-hover': 'control-border-strong', 'border-state-active': 'focus-ring', 'ring-state-active': 'focus-ring',
  'code-bg': 'surface-canvas', 'code-border': 'panel-border', 'code-text': 'content-primary',
};
for (const [old, role] of Object.entries(compat)) css += `  --cap-${old}: var(--cap-${role});\n`;
css += '  --cap-bg-text-selection: color-mix(in srgb, var(--cap-accent-6) 32%, transparent);\n  --cap-overlay-dim: light-dark(#00000050, #00000094);\n}\n';
await writeFile('src/styles/tokens.css', css);
await writeFile('src/tokens/surfaces.json', JSON.stringify(surfaces, null, 2) + '\n');
// Source snapshots remain a separate opt-in, excluded from the default API and explorer.
await writeFile('src/styles/source-tokens.css', Object.entries(sources).map(([mode, source]) => `${mode === 'light' ? ':root, ' : ''}[data-theme="${mode}"] {\n${block(source.declared)}\n}`).join('\n'));
const catalog = Object.entries(appearance).map(([name, pair]) => ({ name: roleCSS(name), original: name, group: name.split('/')[0], light: palettes.neutral[pair[0]], dark: palettes.neutral[pair[1]], runtime: true }));
for (const [name, pair] of Object.entries(accentRoles)) catalog.push({ name: `--cap-accent-${name}`, original: `accent/${name}`, group: 'accent', light: palettes.neutral[pair[0]], dark: palettes.neutral[pair[1]], runtime: true });
await writeFile('src/tokens/catalog.json', JSON.stringify(catalog));
const foundationTokens = Object.fromEntries(Object.entries(foundations).filter(([k, v]) => !v.includes('var(') && /^(--(space-|radius-|el-|border-radius-|font-size-))/.test(k)).map(([k, v]) => [k.slice(2), { $type: 'dimension', $value: { value: parseFloat(v), unit: v.endsWith('rem') ? 'rem' : 'px' } }]));
for (const family of ['sans', 'serif', 'mono', 'code']) foundationTokens[`font-${family}`] = { $type: 'fontFamily', $value: foundations[`--font-${family}`].split(',').map(s => s.trim().replaceAll('"', '')) };
for (const [k, v] of Object.entries(foundations)) if (k.startsWith('--font-weight-')) foundationTokens[k.slice(2)] = { $type: 'fontWeight', $value: Number(v) };
for (const name of ['fast', 'normal', 'slow']) foundationTokens[`duration-${name}`] = { $type: 'duration', $value: { value: parseFloat(foundations[`--duration-${name}`]), unit: 'ms' } };
await writeFile('src/tokens/foundations.json', JSON.stringify(foundationTokens, null, 2));
await mkdir('docs', { recursive: true });
await writeFile('docs/token-validation.json', JSON.stringify({ version: graph.version, appearanceRoles: catalog.length, neutralSteps: steps.length, accentSteps: steps.length, accentModes: hues.length, figmaCollections: collections.length, figmaVariables: collections.reduce((n,c) => n + Object.keys(Object.values(c.modes)[0]).length, 0), crossCollectionAliases: true, matchingModes: true }, null, 2));
console.log(`V3: ${steps.length} neutral steps, ${hues.length} accent modes × ${steps.length} shared steps, ${catalog.length} appearance roles.`);
