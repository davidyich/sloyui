import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { graph as bridge, canonicalGraph, canonicalSelection, resolveCanonical } from './build.mjs';
import { figmaName } from './figma-names.mjs';

// Native designer library: preserve meaningful contexts, compile numeric alpha
// into sparse RGBA colors, and keep only graph nodes reachable from public roles.
const dir = path.dirname(fileURLToPath(import.meta.url));
const selectedAccents = ['blue', 'green', 'orange', 'red', 'pink', 'purple'];
const surfaces = ['Shell', 'Workspace', 'Content', 'Overlay', 'Invert'];
const stable = value => JSON.stringify(value, (_, item) => typeof item === 'number' ? Number(item.toFixed(10)) : item);
const ref = alias => ({ alias });
const clone = value => structuredClone(value);
const baseRoles = new Set(['surface/bg', 'surface/primary/normal', 'surface/primary/active', 'surface/secondary/normal', 'surface/secondary/active', 'surface/tertiary/normal', 'surface/tertiary/active', 'content/primary', 'content/secondary', 'content/tertiary', 'content/muted', 'content/disabled', 'content/on-primary', 'content/on-bright-primary', 'content/inverted', 'border/subtle', 'border/default', 'border/strong', 'stable/black', 'stable/white']);
const extraRoles = {
  'surface/block': 'surface/block', 'surface/disabled': 'surface/disabled', 'border/focus': 'border/focus',
  'border/neutral-normal': 'border/neutral-normal', 'border/neutral-hover': 'border/neutral-hover', 'border/neutral-pressed': 'border/neutral-pressed',
};
const isPublic = name => baseRoles.has(name) || /^(?:surface|content|border)\/accent\//.test(name) && selectedAccents.includes(name.split('/')[2]);

// Compare complete resolved functions, not the spelling of intermediate aliases.
// Surface/Accent identities stay public; only the internal factorization changes.
export function optimizeNativeColorRouting(graph) {
  const owners = new Map(graph.collections.map(c => [c.key, c]));
  const source = new Map(graph.collections.flatMap(c => c.variables.map(v => [c.key + '/' + v.name, { ...v, collection: c }])));
  const contexts = graph.axes.theme.flatMap(theme => graph.axes.scheme.map(scheme => ({ theme, scheme })));
  const colorSignature = value => JSON.stringify([value.r, value.g, value.b, value.a]);
  function resolve(key, context, nodes = source, seen = new Set()) {
    assert(!seen.has(key), 'Routing alias cycle: ' + key);
    const token = nodes.get(key); assert(token, 'Missing routing token: ' + key);
    const value = token.values[context[token.collection.key] || token.collection.modes[0]];
    assert(value !== undefined, 'Missing routing mode: ' + key);
    return value?.alias ? resolve(value.alias, context, nodes, new Set([...seen, key])) : value;
  }
  const signature = (key, nodes = source) => JSON.stringify(contexts.map(context => colorSignature(resolve(key, context, nodes))));
  const paletteByColor = new Map();
  for (const v of owners.get('palette').variables) {
    const color = colorSignature(v.values.Value);
    if (!paletteByColor.has(color)) paletteByColor.set(color, 'palette/' + v.name);
  }
  const reusableNames = Object.fromEntries(['theme', 'scheme'].map(key => {
    const names = new Map();
    for (const v of owners.get(key).variables) {
      const semantic = signature(key + '/' + v.name);
      if (!names.has(semantic)) names.set(semantic, v.name);
    }
    return [key, names];
  }));
  function candidate(order) {
    const routes = Object.fromEntries(['theme', 'scheme'].map(key => [key, { ...owners.get(key), variables: [] }]));
    const nodes = new Map(owners.get('palette').variables.map(v => ['palette/' + v.name, { ...v, collection: owners.get('palette') }]));
    const interned = { theme: new Map(), scheme: new Map() }, usedNames = { theme: new Set(), scheme: new Set() };
    function intern(axis, values, route) {
      const choices = Object.values(values);
      if (choices.every(value => value.alias === choices[0].alias)) return choices[0];
      const vector = JSON.stringify(values);
      if (interned[axis].has(vector)) return ref(interned[axis].get(vector));
      const owner = routes[axis], temporaryKey = axis + '/__candidate__';
      nodes.set(temporaryKey, { type: 'COLOR', values, collection: owner });
      const semantic = signature(temporaryKey, nodes);
      nodes.delete(temporaryKey);
      let name = reusableNames[axis].get(semantic) || 'compiled/' + route;
      if (usedNames[axis].has(name)) name = 'compiled/' + route;
      assert(!usedNames[axis].has(name), 'Conflicting generated routing name: ' + axis + '/' + name);
      usedNames[axis].add(name);
      const previous = owners.get(axis).variables.find(v => v.name === name);
      const v = { name, figmaName: previous?.figmaName ?? figmaName(axis, name), css: previous?.css ?? `--sloy-v2-${axis}-${name.replaceAll('/', '-')}`, type: 'COLOR', values, scopes: [], description: 'Internal exact RGBA route; public Surface roles and independent modes remain unchanged.' };
      owner.variables.push(v); nodes.set(axis + '/' + name, { ...v, collection: owner });
      interned[axis].set(vector, axis + '/' + name);
      return ref(axis + '/' + name);
    }
    function compile(role, region, index, context) {
      if (index === order.length) {
        const value = resolve('surface/' + role, { ...context, surface: region });
        const target = paletteByColor.get(colorSignature(value));
        assert(target, 'Unmaterialized routing color: ' + role);
        return ref(target);
      }
      const axis = order[index];
      const values = Object.fromEntries(graph.axes[axis].map(mode => [mode, compile(role, region, index + 1, { ...context, [axis]: mode })]));
      const fixedModes = Object.values(context).map(mode => mode.toLowerCase());
      return intern(axis, values, [...fixedModes, region.toLowerCase(), role].join('/'));
    }
    const publicValues = new Map();
    for (const v of owners.get('surface').variables) publicValues.set(v.name, Object.fromEntries(owners.get('surface').modes.map(region => [region, compile(v.name, region, 0, {})])));
    return { order, routes, publicValues, count: routes.theme.variables.length + routes.scheme.variables.length };
  }
  // Stable tie-break: retain the historical Surface -> Scheme -> Theme order.
  const candidates = [candidate(['scheme', 'theme']), candidate(['theme', 'scheme'])];
  const winner = candidates.reduce((best, next) => next.count < best.count ? next : best);
  const sourceReachable = new Set();
  function visitSource(key) {
    if (sourceReachable.has(key)) return;
    sourceReachable.add(key);
    for (const value of Object.values(source.get(key).values)) if (value?.alias) visitSource(value.alias);
  }
  for (const v of owners.get('surface').variables) visitSource('surface/' + v.name);
  const before = [...sourceReachable].filter(key => /^(theme|scheme)\//.test(key)).length;
  for (const key of ['theme', 'scheme']) owners.get(key).variables = winner.routes[key].variables;
  for (const v of owners.get('surface').variables) v.values = winner.publicValues.get(v.name);
  // Independently prove every public color in every reachable color context.
  const result = new Map(graph.collections.flatMap(c => c.variables.map(v => [c.key + '/' + v.name, { ...v, collection: c }])));
  let exactComparisons = 0;
  for (const context of contexts) for (const region of owners.get('surface').modes) for (const v of owners.get('surface').variables) {
    const ctx = { ...context, surface: region }, key = 'surface/' + v.name;
    assert.deepEqual(resolve(key, ctx, result), resolve(key, ctx), 'Routing changed exact RGBA: ' + key + '/' + JSON.stringify(ctx));
    exactComparisons++;
  }
  return { policy: 'minimum-internal-variables-exact-rgba', axisOrder: winner.order, tieBreak: ['scheme', 'theme'], candidates: candidates.map(c => ({ axisOrder: c.order, theme: c.routes.theme.variables.length, scheme: c.routes.scheme.variables.length, routingVariables: c.count })), beforeRoutingVariables: before, afterRoutingVariables: winner.count, exactPublicContextComparisons: exactComparisons };
}

export function buildNativeGraph({ optimizeRouting = true } = {}) {
  const graph = clone(bridge);
  graph.name = 'Sloy UI V2 · Native'; graph.version = '1.0.0';
  graph.accents = selectedAccents;
  graph.axes = { theme: ['Light', 'Dark'], scheme: ['Standard', 'Dimmed'], surface: surfaces, accent: ['Neutral', 'Blue', 'Green', 'Orange', 'Red', 'Pink', 'Purple'], density: ['Default', 'Compact'], radius: ['Default', 'None', 'Compact', 'Rounded'], borders: ['On', 'Off'] };
  const cols = new Map(graph.collections.map(c => [c.key, c]));
  const surface = cols.get('surface'), theme = cols.get('theme'), scheme = cols.get('scheme'), palette = cols.get('palette');
  surface.modes = surfaces;
  surface.variables = surface.variables.filter(v => isPublic(v.name));
  assert.equal(surface.variables.length, 80, 'Six-hue public role inventory');
  for (const variable of surface.variables) variable.values = Object.fromEntries(surfaces.map(mode => [mode, variable.values[mode]]));
  for (const [name, canonicalRole] of Object.entries(extraRoles)) {
    for (const preset of scheme.modes) for (const region of surfaces) {
      const route = `${preset.toLowerCase()}/${region.toLowerCase()}/${name}`;
      theme.variables.push({ name: route, type: 'COLOR', values: Object.fromEntries(theme.modes.map(mode => [mode, canonicalSelection('Theme/' + canonicalRole, { Theme: mode, Surface: region, SurfaceScheme: preset })])), scopes: [] });
    }
    for (const region of surfaces) scheme.variables.push({ name: `${region.toLowerCase()}/${name}`, type: 'COLOR', values: Object.fromEntries(scheme.modes.map(mode => [mode, ref(`theme/${mode.toLowerCase()}/${region.toLowerCase()}/${name}`)])), scopes: [] });
    surface.variables.push({ name, figmaName: name, type: 'COLOR', values: Object.fromEntries(surfaces.map(mode => [mode, ref(`scheme/${mode.toLowerCase()}/${name}`)])), scopes: name.startsWith('border/') ? ['STROKE_COLOR'] : ['FRAME_FILL', 'SHAPE_FILL'] });
  }
  let byKey = new Map(graph.collections.flatMap(c => c.variables.map(v => [c.key + '/' + v.name, v])));
  function raw(key) {
    const value = byKey.get(key)?.values.Value;
    assert(value !== undefined, 'Missing raw leaf: ' + key);
    return value?.alias ? raw(value.alias) : value;
  }
  const colors = new Map(palette.variables.map(v => [JSON.stringify(v.values.Value), 'palette/' + v.name]));
  function materialize(value) {
    if (!value?.color) return value;
    const pigment = raw(value.color.alias), percent = raw(value.opacity.alias);
    assert(Number.isInteger(percent), 'Native alpha must be whole-percent: ' + percent);
    if (percent === 100) return clone(value.color);
    const rgba = { ...pigment, a: percent / 100 }, signature = JSON.stringify(rgba);
    if (!colors.has(signature)) {
      const step = value.color.alias.slice('palette/'.length);
      const name = `alpha/${step.replaceAll('/', '-')}-${percent}`;
      palette.variables.push({ name, type: 'COLOR', values: { Value: rgba }, scopes: [], description: `Referenced ${step} pigment at ${percent}% opacity. Regenerate from the canonical source.` });
      colors.set(signature, 'palette/' + name);
    }
    return ref(colors.get(signature));
  }
  for (const c of graph.collections) for (const v of c.variables) v.values = Object.fromEntries(Object.entries(v.values).map(([mode, value]) => [mode, materialize(value)]));
  function rewrite(value, mappings) { return value?.alias && mappings.has(value.alias) ? clone(mappings.get(value.alias)) : value; }
  // Theme is below Scheme in the graph. Compile complete vectors in that order.
  for (const key of ['theme', 'scheme']) {
    const owner = cols.get(key), signatures = new Map(), mappings = new Map();
    for (const v of owner.variables) {
      const values = Object.values(v.values), signature = stable({ type: v.type, values: v.values });
      if (values.every(value => stable(value) === stable(values[0]))) mappings.set(key + '/' + v.name, values[0]);
      else if (signatures.has(signature)) mappings.set(key + '/' + v.name, ref(key + '/' + signatures.get(signature)));
      else signatures.set(signature, v.name);
    }
    for (const c of graph.collections) for (const v of c.variables) v.values = Object.fromEntries(Object.entries(v.values).map(([mode, value]) => [mode, rewrite(value, mappings)]));
    owner.variables = owner.variables.filter(v => !mappings.has(key + '/' + v.name));
  }
  const routingOptimization = optimizeRouting ? optimizeNativeColorRouting(graph) : null;
  // Geometry is copied from the same v4 source, independently of color routing.
  graph.collections = graph.collections.filter(c => ['palette', 'theme', 'scheme', 'surface'].includes(c.key));
  const geometryKeys = { Primitives: 'primitives', Density: 'density', Radius: 'radius', Borders: 'borders' };
  const renameGeometry = value => value?.alias ? ref(value.alias.replace(/^([^/]+)\//, (_, key) => (geometryKeys[key] || key) + '/')) : value;
  for (const [sourceKey, key] of Object.entries(geometryKeys)) {
    const original = canonicalGraph.collections.find(c => c.key === sourceKey);
    const owner = { key, name: `V2 · ${sourceKey}`, modes: clone(original.modes), hidden: key === 'primitives', variables: original.variables.filter(v => sourceKey !== 'Primitives' || !v.name.startsWith('opacity/')).map(v => ({ ...clone(v), values: Object.fromEntries(Object.entries(v.values).map(([mode, value]) => [mode, renameGeometry(value)])) })) };
    if (key === 'borders') {
      owner.modes = graph.axes.borders;
      // Figma's variable-bound opacity uses percent (100), unlike node.opacity (1).
      // Keep a single native toggle; the runtime width role remains unchanged.
      owner.variables = [{ name: 'border/opacity', figmaName: 'border/opacity', type: 'FLOAT',
        values: { On: ref('primitives/number/100'), Off: ref('primitives/number/0') },
        scopes: ['OPACITY'], css: '--sloy-borders-border-opacity', unit: 'number',
        description: 'Empty 0.5 px border overlay only: On 100%, Off 0%. Content opacity stays at 100%.' }];
    }
    if (key === 'primitives') owner.variables.push({name: 'number/100', figmaName: 'number/100', type: 'FLOAT', values: {Value: 100}, scopes: [], css: '--sloy-primitives-number-100', unit: 'number', description: 'Whole-percent native border visibility switch.'});
    if (key === 'primitives') for (const v of owner.variables) if (v.type === 'FLOAT') assert(Number.isInteger(v.values.Value), 'Whole-pixel native primitive: ' + v.name);
    graph.collections.push(owner);
  }
  const accent = { key: 'accent', name: 'V2 · Accent', modes: graph.axes.accent, hidden: false, variables: [] };
  const primaryPath = (hue, state) => hue === 'neutral' ? `surface/primary/${state}` : `surface/accent/${hue}/primary/${state}`;
  const secondaryPath = (hue, state) => hue === 'neutral' ? `surface/secondary/${state}` : `surface/accent/${hue}/secondary/${state}`;
  const accentSpecs = [
    ...['primary', 'secondary'].flatMap(family => ['normal', 'hover', 'pressed'].map(state => ({ name: `surface/${family}-${state}`, role: hue => (family === 'primary' ? primaryPath : secondaryPath)(hue, state === 'normal' ? 'normal' : 'active'), scopes: ['FRAME_FILL', 'SHAPE_FILL'] }))),
    { name: 'content', role: hue => hue === 'neutral' ? 'content/primary' : `content/accent/${hue}/primary`, scopes: ['TEXT_FILL', 'SHAPE_FILL'] },
    { name: 'on-primary', role: hue => hue === 'neutral' ? 'content/on-primary' : `content/accent/${hue}/on-primary`, scopes: ['TEXT_FILL', 'SHAPE_FILL'] },
    ...['normal', 'hover', 'pressed'].map(state => ({ name: `border/${state}`, role: hue => hue === 'neutral' ? `border/neutral-${state}` : `border/accent/${hue}`, scopes: ['STROKE_COLOR'] })),
  ];
  for (const spec of accentSpecs) accent.variables.push({ name: spec.name, type: 'COLOR', values: Object.fromEntries(accent.modes.map(mode => [mode, ref('surface/' + spec.role(mode.toLowerCase()))])), scopes: spec.scopes, description: 'Component accent; inherit from its nearest frame. Neutral is the default.' });
  graph.collections.push(accent);
  // Public colors/geometry plus typography are roots; sparse Palette/Primitives
  // and routing variables are retained only when actually reachable.
  byKey = new Map(graph.collections.flatMap(c => c.variables.map(v => [c.key + '/' + v.name, v])));
  const roots = graph.collections.flatMap(c => ['surface', 'accent', 'density', 'radius', 'borders'].includes(c.key) ? c.variables.map(v => c.key + '/' + v.name) : c.key === 'primitives' ? c.variables.filter(v => v.name.startsWith('font/') || v.name.startsWith('stroke/') || v.name.startsWith('radius/')).map(v => c.key + '/' + v.name) : []);
  const reachable = new Set();
  function visit(key) {
    if (reachable.has(key)) return;
    const variable = byKey.get(key); assert(variable, 'Missing alias: ' + key); reachable.add(key);
    for (const value of Object.values(variable.values)) if (value?.alias) visit(value.alias);
  }
  roots.forEach(visit);
  for (const owner of graph.collections) {
    owner.variables = owner.variables.filter(v => reachable.has(owner.key + '/' + v.name));
    owner.hidden = ['palette', 'theme', 'scheme', 'primitives'].includes(owner.key);
    owner.name = `V2 · ${owner.key[0].toUpperCase() + owner.key.slice(1)}`;
    for (const v of owner.variables) {
      v.figmaName ??= figmaName(owner.key, v.name);
      v.scopes ??= [];
      v.description ??= owner.key === 'surface' ? 'Public contextual color; modes establish region purpose independently of Theme.' : 'Generated internal alias; edit the canonical source.';
      if (owner.key === 'surface') v.description = 'Contextual color compiled into a sparse RGBA palette; alpha belongs to the paint, not the layer. Theme, Scheme and Surface modes inherit independently.';
      if (owner.hidden) v.scopes = [];
      v.css ??= `--sloy-v2-${owner.key}-${v.name.replaceAll('/', '-')}`;
    }
  }
  graph.native = { schemaVersion: 1, generatedFrom: 'figma/token-system-v4/source.json', sourceHash: canonicalGraph.sourceHash, palette: 'Only referenced opaque ramp entries and integer-percent RGBA paints.', publicColorCollection: 'surface', cssFile: 'native.css', custom: 'Generate an explicit local scope for a specified backdrop; native variables do not detect or solve arbitrary background changes.', excludedSurfaces: ['Glass'], noOpacityNumberVariables: true, publicRoleCount: surface.variables.length, accentRoleCount: accent.variables.length, controlRoleMap: Object.fromEntries(Object.entries(extraRoles).map(([role]) => [role, 'surface/' + role])), routingOptimization };
  return graph;
}

/** The same independent-axis gates as the canonical adapter. Re-declaring
 * contextual aliases at axis boundaries makes nested inherited axes resolve
 * together, while Palette and fixed geometry remain immutable. */
export function nativeCSS(graph) {
  const tokens = new Map(graph.collections.flatMap(c => c.variables.map(v => [c.key + '/' + v.name, v])));
  const gate = (key, mode) => '--sloy-native-route-' + key + '-' + mode.toLowerCase();
  const attrs = Object.keys(graph.axes);
  const lines = ['/* Generated by figma/color-system-v2/build-native.mjs. */', '.sloy-native {'];
  for (const [key, modes] of Object.entries(graph.axes)) for (const mode of modes) lines.push(`  ${gate(key, mode)}: ${mode === modes[0] ? 'initial' : ' '};`);
  lines.push('}');
  for (const [key, modes] of Object.entries(graph.axes)) for (const mode of modes) {
    lines.push(`.sloy-native[data-native-${key}="${mode.toLowerCase()}"], .sloy-native [data-native-${key}="${mode.toLowerCase()}"] {`);
    for (const candidate of modes) lines.push(`  ${gate(key, candidate)}: ${candidate === mode ? 'initial' : ' '};`);
    lines.push('}');
  }
  const valueCSS = (value, token) => value?.alias ? `var(${tokens.get(value.alias).css})` : token.type === 'COLOR' ? `rgb(${[value.r, value.g, value.b].map(n => Number((n * 255).toFixed(8))).join(' ')} / ${value.a})` : token.type === 'STRING' ? JSON.stringify(value) : String(value) + (token.unit === 'px' ? 'px' : '');
  lines.push('.sloy-native {');
  for (const c of graph.collections.filter(c => c.modes.length === 1)) for (const v of c.variables) lines.push(`  ${v.css}: ${valueCSS(v.values[c.modes[0]], v)};`);
  lines.push('}');
  lines.push(['.sloy-native', ...attrs.map(key => `.sloy-native [data-native-${key}]`)].join(',\n') + ' {');
  for (const c of graph.collections.filter(c => c.modes.length > 1)) for (const v of c.variables) {
    const values = c.modes.map(mode => valueCSS(v.values[mode], v));
    const expression = new Set(values).size === 1 ? values[0] : c.modes.map((mode, index) => `var(${gate(c.key, mode)}, ${values[index]})`).join(' ');
    lines.push(`  ${v.css}: ${expression};`);
  }
  const compat = { '--cap-surface-current': 'surface/surface/bg', '--cap-surface-bg': 'surface/surface/bg', '--cap-surface-block': 'surface/surface/block', '--cap-content-primary': 'surface/content/primary', '--cap-content-secondary': 'surface/content/secondary', '--cap-content-muted': 'surface/content/muted', '--cap-control-bg': 'surface/surface/tertiary/normal', '--cap-control-hover': 'surface/surface/tertiary/active', '--cap-control-active': 'surface/surface/tertiary/active', '--cap-accent-solid-normal': 'accent/surface/primary-normal', '--cap-accent-solid-hover': 'accent/surface/primary-hover', '--cap-accent-solid-pressed': 'accent/surface/primary-pressed', '--cap-accent-solid-text': 'accent/on-primary', '--cap-accent-normal': 'accent/surface/secondary-normal', '--cap-accent-hover': 'accent/surface/secondary-hover', '--cap-accent-pressed': 'accent/surface/secondary-pressed', '--cap-accent-text': 'accent/content', '--cap-panel-border': 'surface/border/default', '--cap-control-border': 'surface/border/neutral-normal' };
  for (const [name, key] of Object.entries(compat)) lines.push(`  ${name}: var(${tokens.get(key).css});`);
  lines.push('}', '.sloy-native.sloy-native-surface, .sloy-native .sloy-native-surface { background: var(--cap-surface-current); color: var(--cap-content-primary); }', '');
  const output = lines.join('\n');
  for (const v of tokens.values()) assert(output.includes(v.css + ':'), 'Every native code syntax has an emitted declaration: ' + v.name);
  return output;
}

export function verifyNativeGraph(graph) {
  const byKey = new Map(graph.collections.flatMap(c => c.variables.map(v => [c.key + '/' + v.name, { ...v, collection: c }])));
  const resolve = (key, context = {}, seen = []) => {
    assert(!seen.includes(key), 'Alias cycle: ' + key); const token = byKey.get(key); assert(token, 'Missing: ' + key);
    const value = token.values[context[token.collection.key] || token.collection.modes[0]];
    assert(value !== undefined, 'Incomplete mode: ' + key);
    return value?.alias ? resolve(value.alias, context, [...seen, key]) : value;
  };
  for (const c of graph.collections) {
    assert.equal(new Set(c.variables.map(v => v.name)).size, c.variables.length, 'Unique logical names: ' + c.key);
    assert.equal(new Set(c.variables.map(v => v.figmaName ?? v.name)).size, c.variables.length, 'Unique native names: ' + c.key);
  }
  for (const c of graph.collections) for (const v of c.variables) {
    assert.deepEqual(Object.keys(v.values), c.modes);
    for (const value of Object.values(v.values)) {
      assert(!value?.color, 'No composed alpha-number values in native graph');
      if (value?.alias) { assert.notEqual(value.alias.split('/')[0], c.key, 'No same-collection alias'); assert.equal(byKey.get(value.alias)?.type, v.type); }
      else if (v.type === 'FLOAT') assert(Number.isInteger(value), 'Every native FLOAT is whole');
      else if (v.type === 'COLOR') { assert.equal(c.key, 'palette'); assert(Math.abs(value.a * 100 - Math.round(value.a * 100)) < 1e-8, 'Whole-percent RGBA alpha'); }
    }
  }
  const borders = graph.collections.find(c => c.key === 'borders');
  assert.deepEqual(borders.modes, ['On', 'Off'], 'Native Borders default is On');
  const borderOpacity = borders.variables.find(v => v.name === 'border/opacity');
  assert.deepEqual(borderOpacity.scopes, ['OPACITY']);
  assert.equal(resolve('borders/border/opacity', { borders: 'On' }), 100);
  assert.equal(resolve('borders/border/opacity', { borders: 'Off' }), 0);
  let comparisons = 0, accentComparisons = 0;
  const bridgeByKey = new Map(bridge.collections.flatMap(c => c.variables.map(v => [c.key + '/' + v.name, { ...v, collection: c }])));
  const bridgeResolve = (key, context) => { const token = bridgeByKey.get(key); const value = token.values[context[token.collection.key] || token.collection.modes[0]]; return value?.alias ? bridgeResolve(value.alias, context) : value?.color ? { ...bridgeResolve(value.color.alias, context), a: bridgeResolve(value.opacity.alias, context) / 100 } : value; };
  for (const theme of graph.axes.theme) for (const scheme of graph.axes.scheme) for (const surface of surfaces) {
    const ctx = { theme, scheme, surface };
    for (const v of graph.collections.find(c => c.key === 'surface').variables) {
      const actual = resolve('surface/' + v.name, ctx);
      const expected = extraRoles[v.name] ? resolveCanonical('Theme/' + extraRoles[v.name], { Theme: theme, Surface: surface, SurfaceScheme: scheme }) : bridgeResolve('surface/' + v.name, ctx);
      assert.deepEqual(actual, expected, 'Exact compiled context: ' + v.name + '/' + JSON.stringify(ctx));
      comparisons++;
    }
    const bg = resolve('surface/surface/bg', ctx);
    if (surface === 'Invert') assert.deepEqual(bg, theme === 'Light' ? { r: 0, g: 0, b: 0, a: 1 } : { r: 1, g: 1, b: 1, a: 1 });
    for (const mode of graph.axes.accent) for (const v of graph.collections.find(c => c.key === 'accent').variables) {
      assert.deepEqual(resolve('accent/' + v.name, { ...ctx, accent: mode }), resolve(v.values[mode].alias, ctx), 'Exact Accent context: ' + v.name + '/' + mode);
      accentComparisons++;
    }
  }
  const reachable = new Set();
  const visit = key => { if (reachable.has(key)) return; reachable.add(key); for (const value of Object.values(byKey.get(key).values)) if (value?.alias) visit(value.alias); };
  for (const [key, token] of byKey) if (['surface', 'accent', 'density', 'radius', 'borders'].includes(token.collection.key) || token.collection.key === 'primitives' && /^(font|stroke|radius)\//.test(token.name)) visit(key);
  assert.equal(reachable.size, byKey.size, 'No unreachable native variables');
  const linear = value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  const y = c => .2126 * linear(c.r) + .7152 * linear(c.g) + .0722 * linear(c.b);
  const contrast = (a, b) => (Math.max(y(a), y(b)) + .05) / (Math.min(y(a), y(b)) + .05);
  const composite = (a, b) => ({ r: a.r * a.a + b.r * (1 - a.a), g: a.g * a.a + b.g * (1 - a.a), b: a.b * a.a + b.b * (1 - a.a), a: 1 });
  let pairChecks = 0, minimumTextContrast = Infinity;
  for (const theme of graph.axes.theme) for (const scheme of graph.axes.scheme) for (const surface of surfaces) {
    const context = { theme, scheme, surface }, get = role => resolve('surface/' + role, context);
    const bg = get('surface/bg'), backings = [bg, composite(get('surface/block'), bg), ...['normal', 'active'].flatMap(state => ['secondary', 'tertiary'].map(family => composite(get(`surface/${family}/${state}`), bg)))];
    for (const hue of selectedAccents) {
      const ink = get(`content/accent/${hue}/primary`), muted = get(`content/accent/${hue}/secondary`), onPrimary = get(`content/accent/${hue}/on-primary`);
      for (const state of ['normal', 'active']) {
        const primary = get(`surface/accent/${hue}/primary/${state}`), ratio = contrast(composite(onPrimary, primary), primary);
        assert(ratio >= 4.5 - 1e-7, 'Native primary contrast: ' + [theme, surface, hue, state].join('/')); pairChecks++; minimumTextContrast = Math.min(minimumTextContrast, ratio);
        for (const family of ['secondary', 'tertiary']) {
          const paint = get(`surface/accent/${hue}/${family}/${state}`);
          for (const base of backings) for (const text of [ink, muted]) {
            const fill = composite(paint, base), value = contrast(composite(text, fill), fill);
            assert(value >= 4.5 - 1e-7, 'Native composited text contrast: ' + [theme, surface, hue, family, state, value].join('/')); pairChecks++; minimumTextContrast = Math.min(minimumTextContrast, value);
          }
        }
      }
    }
  }
  const counts = graph.collections.map(c => ({ key: c.key, modes: c.modes, variables: c.variables.length }));
  return { result: 'pass', totalVariables: byKey.size, collections: counts, exactContextComparisons: comparisons, exactAccentContextComparisons: accentComparisons, pairChecks, minimumTextContrast, unreachableVariables: 0, fractionalFloatVariables: 0, paletteAlphaIsWholePercent: true, nativeBordersPercent: { On: 100, Off: 0 }, routingOptimization: graph.native.routingOptimization ?? null, sourceHash: graph.native.sourceHash, sha256: createHash('sha256').update(JSON.stringify(graph, null, 2) + '\n').digest('hex') };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const graph = buildNativeGraph(), audit = verifyNativeGraph(graph);
  fs.writeFileSync(path.join(dir, 'native-graph.json'), JSON.stringify(graph, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'native.css'), nativeCSS(graph));
  fs.mkdirSync(path.join(dir, '../../artifacts/consolidation'), { recursive: true });
  fs.writeFileSync(path.join(dir, '../../artifacts/consolidation/native-build-audit.json'), JSON.stringify(audit, null, 2) + '\n');
  console.log(JSON.stringify(audit, null, 2));
}
