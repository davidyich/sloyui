import fs from 'node:fs';
const graph = JSON.parse(fs.readFileSync(new URL('../color-system-v2/native-graph.json', import.meta.url)));
const names = new Map(graph.collections.flatMap(c => c.variables.map(v => [c.key + '/' + v.name, c.name + '|' + (v.figmaName ?? v.name)])));
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
const normalized = value => value?.alias ? names.get(value.alias) : value && typeof value === 'object' ? ['r', 'g', 'b', 'a'].map(key => Math.round((value[key] ?? 1) * 1e5) / 1e5) : value;
const expected = Object.fromEntries(graph.collections.map(c => [c.name, { count: c.variables.length, hash: hash(JSON.stringify(c.variables.map(v => [v.figmaName ?? v.name, v.type, c.modes.map(mode => [mode, normalized(v.values[mode])])]).sort((a, b) => a[0].localeCompare(b[0])))) }]));
const palette = graph.collections.find(c => c.key === 'palette');
const paletteExpected = Object.fromEntries(palette.variables.map(v => [v.figmaName ?? v.name, { type: v.type, values: v.values }]));
console.log(`
const expected = ${JSON.stringify(expected)};
const paletteName = ${JSON.stringify(palette.name)};
const paletteExpected = ${JSON.stringify(paletteExpected)};
const colorTolerance = 1e-6;
const cs = await figma.variables.getLocalVariableCollectionsAsync();
const vs = await figma.variables.getLocalVariablesAsync();
const cmap = new Map(cs.map(c => [c.id, c]));
const vmap = new Map(vs.map(v => [v.id, v]));
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); }
function norm(value) {
  if (value?.type === 'VARIABLE_ALIAS') { const v = vmap.get(value.id); if (!v) throw Error('Broken alias ' + value.id); return cmap.get(v.variableCollectionId).name + '|' + v.name; }
  return value && typeof value === 'object' ? ['r', 'g', 'b', 'a'].map(key => Math.round((value[key] ?? 1) * 1e5) / 1e5) : value;
}
const reports = cs.map(collection => {
  const variables = vs.filter(v => v.variableCollectionId === collection.id);
  const actual = hash(JSON.stringify(variables.map(v => [v.name, v.resolvedType, collection.modes.map(mode => [mode.name, norm(v.valuesByMode[mode.modeId])])]).sort((a, b) => a[0].localeCompare(b[0]))));
  if (collection.name !== paletteName) return {name: collection.name, count: variables.length, hash: actual, match: expected[collection.name]?.hash === actual && expected[collection.name]?.count === variables.length};
  const mismatches = []; let maximumChannelDelta = 0;
  const expectedNames = Object.keys(paletteExpected);
  for (const name of expectedNames) {
    const input = paletteExpected[name], variable = variables.find(v => v.name === name);
    if (!variable) { mismatches.push({name, reason: 'Missing variable'}); continue; }
    if (variable.resolvedType !== input.type) mismatches.push({name, reason: 'Type mismatch'});
    const actualModes = collection.modes.map(mode => mode.name).sort(), expectedModes = Object.keys(input.values).sort();
    if (JSON.stringify(actualModes) !== JSON.stringify(expectedModes)) { mismatches.push({name, reason: 'Mode mismatch', actualModes, expectedModes}); continue; }
    for (const mode of collection.modes) {
      const actualValue = variable.valuesByMode[mode.modeId], expectedValue = input.values[mode.name];
      for (const channel of ['r', 'g', 'b', 'a']) {
        const value = actualValue?.[channel] ?? (channel === 'a' ? 1 : NaN), requested = expectedValue[channel] ?? 1;
        const delta = Math.abs(value - requested);
        if (Number.isFinite(delta)) maximumChannelDelta = Math.max(maximumChannelDelta, delta);
        if (!Number.isFinite(delta) || delta > colorTolerance) mismatches.push({name, mode: mode.name, channel, actual: value, expected: requested, delta});
      }
    }
  }
  for (const variable of variables) if (!paletteExpected[variable.name]) mismatches.push({name: variable.name, reason: 'Unexpected variable'});
  return {name: collection.name, count: variables.length, comparison: 'Expected RGBA with absolute tolerance', tolerance: colorTolerance, maximumChannelDelta, mismatchCount: mismatches.length, mismatches: mismatches.slice(0, 20), match: variables.length === expectedNames.length && mismatches.length === 0};
});
return {variables: vs.length, collections: reports, allMatch: reports.length === Object.keys(expected).length && reports.every(report => report.match), fractionalFloats: vs.filter(v => v.resolvedType === 'FLOAT' && Object.values(v.valuesByMode).some(value => typeof value === 'number' && !Number.isInteger(value))).map(v => v.name), badScopes: vs.filter(v => v.scopes.includes('ALL_SCOPES')).map(v => v.name), badCodeSyntax: vs.filter(v => !/^var\\(--.*\\)$/.test(v.codeSyntax.WEB ?? '')).map(v => v.name)};
`);
