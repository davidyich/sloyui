import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const file = name => readFile(new URL(name, import.meta.url), 'utf8');
const [graphText, sourceText, css, auditText] = await Promise.all(['graph.json', 'source.json', 'tokens.css', '../../artifacts/token-system-v3/audit.json'].map(file));
const graph = JSON.parse(graphText), source = JSON.parse(sourceText), audit = JSON.parse(auditText);
const digest = text => createHash('sha256').update(text).digest('hex');
assert.equal(digest(graphText), audit.graphHash);
assert.equal(digest(sourceText), graph.sourceHash);
assert.equal(digest(css), audit.cssHash);
const collections = new Map(graph.collections.map(collection => [collection.key, collection]));
const tokens = new Map(graph.collections.flatMap(collection => collection.variables.map(token => [collection.key + '/' + token.name, { ...token, collection }])));
const resolve = (path, selection = {}, visited = []) => {
  assert(!visited.includes(path), 'Alias cycle: ' + path);
  const token = tokens.get(path);
  assert(token, 'Unknown token: ' + path);
  const value = token.values[selection[token.collection.key] || token.collection.modes[0]];
  assert.notEqual(value, undefined, 'Unknown mode: ' + path);
  return value?.alias ? resolve(value.alias, selection, [...visited, path]) : value;
};
const linear = n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
const luminance = color => [color.r, color.g, color.b].reduce((sum, n, index) => sum + linear(n) * [.2126, .7152, .0722][index], 0);
const contrast = (a, b) => { const first = luminance(a), second = luminance(b); return (Math.max(first, second) + .05) / (Math.min(first, second) + .05); };
const hex = color => '#' + [color.r, color.g, color.b].map(n => Math.round(n * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const hues = ['neutral', ...Object.keys(source.palette.hues)];
let checks = 0, pairs = 0, minimumContrast = Infinity, minimumFocusContrast = Infinity, disabledPairs = 0, focusBackgroundChecks = 0;
assert(!collections.has('Components'));
assert.equal(collections.get('Radius').modes[0], 'Default');
assert.equal(collections.get('Palette').variables.length, 417, 'Palette must contain only the original ramps.');
const paletteNames = new Set(['black', 'white', ...source.palette.neutralSteps.map(step => 'gray/' + step), ...Object.keys(source.palette.hues).flatMap(hue => source.palette.steps.map(step => hue + '/' + step))]);
assert.deepEqual(new Set(collections.get('Palette').variables.map(token => token.name)), paletteNames);
assert.deepEqual([...new Set(collections.get('Theme').variables.map(token => token.name.split('/')[0]))].sort(), ['border', 'content', 'primary', 'secondary', 'surface']);
assert([...new Set(collections.get('SurfaceScheme').variables.map(token => token.name.split('/')[0]))].every(root => ['border', 'content', 'primary', 'secondary', 'surface'].includes(root)));
assert(!/--sloy-[\w-]*background/.test(css), 'CSS identifiers use bg, not background.');
for (const [path, token] of tokens) {
  assert(!path.includes('background') && !token.css.includes('background'), 'Token names use bg: ' + path);
  assert.equal(token.css, '--sloy-' + path.replaceAll('/', '-').replaceAll('.', '_').toLowerCase());
  assert(css.includes(token.css + ': '), 'Missing CSS definition: ' + path);
  for (const value of Object.values(token.values)) {
    if (value?.alias) assert.equal(tokens.get(value.alias)?.type, token.type, 'Alias target type: ' + path);
    else if (token.type === 'COLOR') assert(['Palette', 'Theme'].includes(token.collection.key), 'Raw color outside Palette or Theme');
    if (['Semantic', 'SurfaceScheme'].includes(token.collection.key)) assert(value?.alias, token.collection.key + ' must contain aliases only.');
  }
  if (token.collection.key === 'Semantic') assert.equal(token.type, 'COLOR');
  checks++;
}
const themeNames = new Set(collections.get('Theme').variables.map(token => token.name));
for (const hue of hues) {
  assert(themeNames.has('primary/content/' + hue), 'Every primary hue keeps its content role: ' + hue);
  assert(themeNames.has('secondary/content/' + hue), 'Every secondary hue keeps its content role: ' + hue);
  for (const state of ['normal', 'hover', 'pressed']) {
    assert(themeNames.has(`primary/bg/${hue}-${state}`), 'Every primary hue keeps its states: ' + hue);
    for (const surface of ['shell', 'workspace', 'content', 'overlay']) {
      assert(themeNames.has(`secondary/bg/${hue}-${surface}-${state}`), 'Missing explicit secondary hue/surface state');
      assert(themeNames.has(`secondary/border/${hue}-${surface}-${state}`), 'Missing explicit secondary hue/surface border');
    }
  }
}
const paletteByColor = new Map(collections.get('Palette').variables.map(token => [JSON.stringify(token.values.Value), 'Palette/' + token.name]));
for (const token of collections.get('Theme').variables) {
  for (const value of Object.values(token.values)) {
    if (!value.alias) assert(!paletteByColor.has(JSON.stringify(value)), 'Exact palette matches must remain aliases: ' + token.name);
    if (token.name.endsWith('-inverted')) assert(value.alias?.startsWith('Theme/'), 'Inverted Theme must alias standard Theme values.');
  }
}
for (const Theme of ['Light', 'Dark']) for (const SurfaceScheme of ['Standard', 'Inverted']) for (const Semantic of ['Shell', 'Workspace', 'Content', 'Overlay']) {
  const selection = { Theme, SurfaceScheme, Semantic };
  const actual = SurfaceScheme === 'Inverted' && Theme === 'Dark' ? { Workspace: 'Content', Content: 'Workspace' }[Semantic] || Semantic : Semantic;
  const expected = source.surfaces[actual];
  const background = resolve('Semantic/surface/bg', selection), block = resolve('Semantic/surface/block', selection);
  assert.equal(hex(background), Theme === 'Dark' ? expected.dark : expected.light);
  assert.equal(hex(block), Theme === 'Dark' ? expected.blockDark : expected.blockLight);
  const focus = resolve('Semantic/focus/ring', selection);
  const assertFocusContrast = (fill, label) => {
    const focusContrast = contrast(focus, fill);
    minimumFocusContrast = Math.min(minimumFocusContrast, focusContrast);
    assert(focusContrast >= 3.1, 'Focus ring against ' + label + ' in ' + JSON.stringify(selection));
    focusBackgroundChecks++;
  };
  assertFocusContrast(background, 'surface');
  assertFocusContrast(block, 'block');
  for (const hue of hues) {
    const text = resolve(`Semantic/secondary/${hue}-content`, selection);
    assert(contrast(text, block) >= 4.5, `Block ink ${hue}`);
    let previous;
    for (const state of ['normal', 'hover', 'pressed']) {
      const fill = resolve(`Semantic/secondary/${hue}-${state}`, selection);
      assertFocusContrast(fill, hue + ' ' + state);
      const pairContrast = contrast(text, fill);
      minimumContrast = Math.min(minimumContrast, pairContrast);
      assert(pairContrast >= 4.5, 'Secondary contrast');
      assert.equal(fill.a, 1, 'Secondary fill must be opaque');
      assert.equal(text.a, 1, 'Secondary ink must be opaque');
      if (previous) assert(contrast(fill, previous) >= source.secondary.minimumStateContrast, 'State difference');
      previous = fill; pairs++;
    }
    const disabledContrast = contrast(resolve('Semantic/disabled/bg', selection), resolve('Semantic/disabled/content', selection));
    assert(disabledContrast >= 4.5, 'Shared disabled pair');
    disabledPairs++;
  }
  for (const role of ['primary', 'secondary', 'tertiary', 'muted', 'caption']) {
    const text = resolve('Semantic/content/' + role, selection);
    assert(contrast(text, background) >= 4.5);
    assert(contrast(text, block) >= 4.5);
  }
  for (const token of collections.get('Semantic').variables) { resolve('Semantic/' + token.name, selection); checks++; }
}
for (const Density of ['Default', 'Compact']) for (const Radius of ['Default', 'None', 'Compact', 'Rounded']) {
  const selection = { Density, Radius };
  assert.equal(resolve('Primitives/size/touch', selection), 44);
  assert.equal(resolve('Primitives/radius/pill', selection), 9999);
  assert.equal(resolve('Primitives/font/size/body', selection), 14);
  assert.equal(resolve('Primitives/font/line-height/body', selection), 20);
  assert.equal(resolve('Primitives/font/tracking/normal', selection), 0);
  assert.equal(resolve('Primitives/font/tracking/tight', selection), -.2);
  for (const [size, ratio] of Object.entries(source.radius.ratios)) assert.equal(resolve('Radius/radius/' + size, selection), Math.round(source.radius.modes[Radius] * ratio));
  assert.equal(resolve('Density/space/inset-md', selection), source.density[Density].unit * 3);
  assert.equal(resolve('Density/size/control-md', selection), 20 + 2 * Math.round(source.density[Density].unit * 1.5));
  for (const key of ['Density', 'Radius', 'Primitives']) for (const token of collections.get(key).variables) { resolve(key + '/' + token.name, selection); checks++; }
}
for (const [role, font] of Object.entries(source.fonts.family)) assert.equal(resolve('Primitives/font/family/' + role), font);
for (const role of ['normal', 'tight']) assert.deepEqual(tokens.get('Primitives/font/tracking/' + role).scopes, ['LETTER_SPACING']);

// Sharing is a semantic decision: only one role whose entire appearance pair
// matches on every surface may reuse a Theme variable across those surfaces.
const standardThemePath = (path, surface) => {
  const seen = new Set();
  while (!path.startsWith('Theme/')) {
    assert(!seen.has(path)); seen.add(path);
    const token = tokens.get(path), mode = token.collection.key === 'Semantic' ? surface : token.collection.key === 'SurfaceScheme' ? 'Standard' : token.collection.modes[0];
    assert(token.values[mode].alias);
    path = token.values[mode].alias;
  }
  return path;
};
const seenThemeRoles = new Map();
for (const token of collections.get('Semantic').variables.filter(token => !token.name.startsWith('status/'))) {
  const path = 'Semantic/' + token.name;
  const surfaces = collections.get('Semantic').modes;
  const sharedPair = new Set(surfaces.map(Semantic => JSON.stringify(['Light', 'Dark'].map(Theme => resolve(path, { Semantic, Theme, SurfaceScheme: 'Standard' }))))).size === 1;
  const themePaths = new Set(surfaces.map(surface => standardThemePath(path, surface)));
  assert.equal(themePaths.size, sharedPair ? 1 : 4, 'Partial or missing surface-role sharing: ' + path);
  for (const themePath of themePaths) {
    assert(!seenThemeRoles.has(themePath), 'Different roles merged by RGB: ' + path + ' / ' + seenThemeRoles.get(themePath));
    seenThemeRoles.set(themePath, path);
  }
}

// Local migration evidence is optional in a fresh checkout; when present it
// enables an exhaustive comparison rather than weakening everyday verification.
const baselineText = await file('../../artifacts/token-system-v3/refinement/graph-before.json').catch(error => {
  if (error.code === 'ENOENT') return null;
  throw error;
});
let refinement = { baselineAvailable: false };
if (baselineText) {
  const before = JSON.parse(baselineText);
  const oldCollections = new Map(before.collections.map(collection => [collection.key, collection]));
  const oldTokens = new Map(before.collections.flatMap(collection => collection.variables.map(token => [collection.key + '/' + token.name, { ...token, collection }])));
  const oldResolve = (path, selection, visited = []) => {
    assert(!visited.includes(path), 'Baseline alias cycle.');
    const token = oldTokens.get(path);
    assert(token, 'Baseline path missing: ' + path);
    const value = token.values[selection[token.collection.key] || token.collection.modes[0]];
    return value?.alias ? oldResolve(value.alias, selection, [...visited, path]) : value;
  };
  let semanticChecks = 0, geometryChecks = 0, paletteChecks = 0, combinations = 0;
  const semanticRenames = {};
  for (const token of oldCollections.get('Semantic').variables) {
    const oldPath = 'Semantic/' + token.name, newPath = oldPath.replaceAll('background', 'bg');
    assert(tokens.has(newPath));
    if (oldPath !== newPath) semanticRenames[oldPath] = newPath;
  }
  assert.equal(oldCollections.get('Semantic').variables.length, collections.get('Semantic').variables.length);
  const geometry = ['Primitives', 'Density', 'Radius', 'Borders'].flatMap(key => {
    assert.equal(collections.get(key).variables.length, oldCollections.get(key).variables.length, 'Geometry inventory changed: ' + key);
    return collections.get(key).variables.map(token => key + '/' + token.name);
  });
  for (const Theme of ['Light', 'Dark']) for (const SurfaceScheme of ['Standard', 'Inverted']) for (const Semantic of ['Shell', 'Workspace', 'Content', 'Overlay']) for (const Density of ['Default', 'Compact']) for (const Radius of ['Default', 'None', 'Compact', 'Rounded']) for (const Borders of ['Off', 'On']) {
    const selection = { Theme, SurfaceScheme, Semantic, Density, Radius, Borders }; combinations++;
    for (const token of oldCollections.get('Semantic').variables) {
      const oldPath = 'Semantic/' + token.name, newPath = oldPath.replaceAll('background', 'bg');
      assert.deepEqual(resolve(newPath, selection), oldResolve(oldPath, selection), 'Resolved semantic changed: ' + newPath + ' ' + JSON.stringify(selection));
      semanticChecks++;
    }
    for (const path of geometry) {
      assert.deepEqual(resolve(path, selection), oldResolve(path, selection), 'Geometry changed: ' + path);
      geometryChecks++;
    }
  }
  for (const token of collections.get('Palette').variables) {
    const path = 'Palette/' + token.name;
    assert.deepEqual(resolve(path), oldResolve(path, {}), 'Authored palette changed: ' + path); paletteChecks++;
  }
  const migration = JSON.parse(await file('../../artifacts/token-system-v3/refinement/migration-map.json'));
  assert.equal(migration.baselineHash, digest(baselineText));
  assert.equal(migration.graphHash, digest(graphText));
  assert.deepEqual(migration.semanticRenames, semanticRenames);
  for (const [key, field] of [['Theme', 'theme'], ['SurfaceScheme', 'surfaceScheme']]) {
    assert.equal(migration[field].length, collections.get(key).variables.length);
    assert.deepEqual(new Set(migration[field].map(entry => entry.newPath)), new Set(collections.get(key).variables.map(token => key + '/' + token.name)));
    for (const entry of migration[field]) {
      assert(entry.oldPaths.length > 0 && entry.usages.length > 0, 'Empty migration mapping: ' + entry.newPath);
      for (const path of entry.oldPaths) assert(oldTokens.has(path) && path.startsWith(key + '/'), 'Invalid migration candidate: ' + path);
    }
  }
  refinement = { baselineAvailable: true, combinations, semanticChecks, geometryChecks, paletteChecks, semanticRenames: Object.keys(semanticRenames).length, maximumColorDelta: 0, maximumGeometryDelta: 0 };
}
console.log(JSON.stringify({ result: 'pass', checks, activePairsAcrossBothSchemes: pairs, sharedDisabledPairsAcrossBothSchemes: disabledPairs, totalSecondaryStateChecks: pairs + disabledPairs, focusBackgroundChecks, minimumTextContrast: minimumContrast, minimumFocusToAllLocalBackgroundsContrast: minimumFocusContrast, refinement, sourceHash: graph.sourceHash }, null, 2));
