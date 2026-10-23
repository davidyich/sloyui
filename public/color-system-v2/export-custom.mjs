import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createAccent, createNeutralSystem, generateContext, generatePalette, presets, defaultRules } from './editor/model.mjs';
import { BLACK, WHITE, fromHex, composite, contrast } from './color-engine.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(fs.readFileSync(path.join(dir, 'source.json')));
const resolved = JSON.parse(fs.readFileSync(path.join(dir, '../token-system-v4/palette-contexts.json')));
const hues = ['blue', 'green', 'orange', 'red', 'pink', 'purple'];
const clone = value => structuredClone(value);
const css = value => `rgb(${[value.r, value.g, value.b].map(n => Number((n * 255).toFixed(8))).join(' ')} / ${value.a})`;

/** Explicit project scope. Arbitrary custom RGB stays exact; it is never snapped
 * into the kit's neutral ramp and never appended to the core native graph. */
export function generateCustomScope({ light = '#F1EEF8', dark = '#221D2C', name = 'Project', minimumContrast = 4.5 } = {}) {
  assert(typeof name === 'string' && name.trim() && name.length <= 80, 'A project name of 1–80 characters is required.');
  assert(Number.isFinite(minimumContrast) && minimumContrast >= 4.5 && minimumContrast <= 7, 'Contrast must be between 4.5 and 7.');
  const backgrounds = { Light: light.toUpperCase(), Dark: dark.toUpperCase() };
  Object.values(backgrounds).forEach(fromHex);
  const neutral = createNeutralSystem(), rules = { ...defaultRules, minimumContrast, balanceSecondary: true };
  const contexts = {};
  for (const theme of ['Light', 'Dark']) {
    const roles = {}, diagnostics = [], modelChecks = [];
    const make = accent => generateContext(accent, theme, 'Standard', 'Custom', source, resolved, backgrounds, rules, generatePalette(accent, rules), 'Custom', neutral);
    const neutralContext = make(neutral.accent);
    roles['surface/bg'] = neutralContext.bg;
    for (const [role, value] of Object.entries(neutralContext.neutral)) roles[`surface/${role.split('/')[0]}/neutral-${role.split('/')[1]}`] = value;
    for (const state of source.states) roles[`surface/primary/neutral-${state}`] = neutralContext.fills['primary/' + state];
    for (const [role, value] of Object.entries(neutralContext.neutralContext.content)) roles[`content/${role}/neutral`] = value;
    roles['content/muted/neutral'] = neutralContext.neutralContext.content.secondary;
    roles['content/on-primary'] = neutralContext.primary.foreground;
    roles['border/neutral'] = neutralContext.neutralContext.border;
    const all = [neutralContext];
    for (const hue of hues) {
      const preset = presets.find(value => value.name === hue); assert(preset, 'Missing canonical accent: ' + hue);
      const context = make(createAccent(hue, preset.hex)); all.push(context);
      for (const [role, value] of Object.entries(context.fills)) roles[`surface/${role.split('/')[0]}/${hue}-${role.split('/')[1]}`] = value;
      for (const [role, value] of Object.entries(context.content)) roles[role === 'on-primary' ? `content/on-primary-${hue}` : `content/${role}/${hue}`] = value;
      roles['border/' + hue] = context.border;
    }
    for (const context of all) {
      diagnostics.push(...context.issues.map(issue => ({ accent: context.accent, issue })));
      modelChecks.push(...context.checks.map(check => ({ accent: context.accent, ...check })));
    }
    const base = roles['surface/bg'];
    const neutralBackings = [base, ...['secondary', 'tertiary'].flatMap(family => source.states.map(state => composite(roles[`surface/${family}/neutral-${state}`], base)))];
    const focusBackings = [...neutralBackings, ...hues.flatMap(hue => ['secondary', 'tertiary'].flatMap(family => source.states.flatMap(state => neutralBackings.map(backing => composite(roles[`surface/${family}/${hue}-${state}`], backing)))) )];
    const candidates = [BLACK, WHITE, ...generatePalette(neutral.accent, rules)[0].steps.map(step => step.value)];
    const focus = candidates.map(value => ({ value, minimum: Math.min(...focusBackings.map(backing => contrast(value, backing))) })).sort((a, b) => b.minimum - a.minimum)[0];
    roles['border/focus'] = focus.value;
    if (focus.minimum < 3.2) diagnostics.push({ accent: 'neutral', issue: `Focus contrast target 3.2:1 is unattainable with one shared ring on the declared fills; measured maximum ${focus.minimum}. Use a two-color focus ring.` });
    contexts[theme] = { background: clone(base), effectiveTheme: neutralContext.effectiveTheme, roles, minimumTextContrast: Math.min(...all.map(context => context.minimumText)), modelChecks, issues: diagnostics, minimumFocusContrast: focus.minimum };
  }
  const roleNames = Object.keys(contexts.Light.roles);
  assert.deepEqual(roleNames, Object.keys(contexts.Dark.roles));
  const collection = { key: 'custom', name: `Sloy UI · Custom · ${name.trim()}`, modes: ['Light', 'Dark'], hidden: false, variables: roleNames.map(role => ({ name: role, type: 'COLOR', values: Object.fromEntries(['Light', 'Dark'].map(theme => [theme, clone(contexts[theme].roles[role])])), scopes: role.startsWith('content/') ? ['TEXT_FILL', 'SHAPE_FILL'] : role.startsWith('border/') ? ['STROKE_COLOR'] : ['FRAME_FILL', 'SHAPE_FILL'], description: 'Generated for this project background. Regenerate the complete scope after editing a background.' })) };
  return { schemaVersion: 1, name: name.trim(), generator: 'figma/color-system-v2/export-custom.mjs', backgrounds, accents: hues, minimumContrast, contexts, collections: [collection], boundary: 'Explicit generation for declared solid backgrounds. Editing a frame fill does not recalculate variables. This project scope is separate from the canonical native library.' };
}

export function verifyCustomScope(graph) {
  assert.deepEqual(graph.accents, hues);
  assert.equal(graph.collections.length, 1);
  const collection = graph.collections[0]; assert.deepEqual(collection.modes, ['Light', 'Dark']);
  const expectedRoles = Object.keys(graph.contexts.Light.roles); assert.equal(collection.variables.length, expectedRoles.length);
  assert.equal(new Set(collection.variables.map(v => v.name)).size, collection.variables.length);
  let textChecks = 0, minimumTextContrast = Infinity;
  const failures = [];
  const checkPair = (theme, hue, pair, foreground, backing) => { const value = contrast(composite(foreground, backing), backing); textChecks++; minimumTextContrast = Math.min(minimumTextContrast, value); if (value + 1e-7 < graph.minimumContrast) failures.push({ theme, hue, pair, contrast: value, minimum: graph.minimumContrast }); };
  for (const theme of collection.modes) {
    const context = graph.contexts[theme], roles = context.roles;
    assert.deepEqual(context.background, fromHex(graph.backgrounds[theme]), 'Exact requested background RGB');
    assert.deepEqual(roles['surface/bg'], context.background);
    for (const variable of collection.variables) {
      assert.equal(variable.type, 'COLOR'); const value = variable.values[theme];
      assert.deepEqual(value, roles[variable.name]);
      for (const channel of ['r', 'g', 'b', 'a']) assert(Number.isFinite(value[channel]) && value[channel] >= 0 && value[channel] <= 1);
      assert(Math.abs(value.a * 100 - Math.round(value.a * 100)) < 1e-6, 'Whole percent alpha');
    }
    const bg = roles['surface/bg'], backings = [bg, ...['secondary', 'tertiary'].flatMap(family => ['normal', 'active'].map(state => composite(roles[`surface/${family}/neutral-${state}`], bg)))];
    for (const role of ['primary', 'secondary', 'tertiary', 'muted']) for (const backing of backings) checkPair(theme, 'neutral', role, roles[`content/${role}/neutral`], backing);
    for (const hue of ['neutral', ...hues]) {
      for (const state of ['normal', 'active']) {
        const primary = roles[`surface/primary/${hue}-${state}`], foreground = roles[hue === 'neutral' ? 'content/on-primary' : `content/on-primary-${hue}`];
        checkPair(theme, hue, 'on-primary/' + state, foreground, primary);
        if (hue === 'neutral') continue;
        for (const backing of backings) {
          for (const textRole of ['primary', 'secondary']) checkPair(theme, hue, `${textRole}/bg`, roles[`content/${textRole}/${hue}`], backing);
          for (const family of ['secondary', 'tertiary']) {
            const fill = composite(roles[`surface/${family}/${hue}-${state}`], backing);
            for (const textRole of ['primary', 'secondary']) checkPair(theme, hue, `${textRole}/${family}/${state}`, roles[`content/${textRole}/${hue}`], fill);
          }
        }
      }
    }
    for (const check of context.modelChecks ?? []) if (/^(Primary|Content|Neutral content)/.test(check.label) && !check.pass) failures.push({ theme, hue: check.accent, pair: check.label, contrast: check.value, minimum: check.min });
  }
  return { result: failures.length ? 'unattainable' : 'pass', textResult: failures.length ? 'unattainable' : 'pass', appearanceResult: Object.values(graph.contexts).some(context => context.issues.length) ? 'limited' : 'pass', minimumFocusContrast: Math.min(...Object.values(graph.contexts).map(context => context.minimumFocusContrast)), exactBackgrounds: true, wholePercentAlpha: true, fractionalFloatVariables: 0, variables: collection.variables.length, collections: 1, textChecks, minimumTextContrast, failures, appearanceIssues: Object.fromEntries(collection.modes.map(theme => [theme, graph.contexts[theme].issues])), nativeCoreChanged: false };
}

export function customImportScript(graph) {
  // Standalone Figma Plugin API code. It updates only this named project scope.
  return `return await (async () => {\nconst spec = ${JSON.stringify(graph.collections[0])};\nconst collections = await figma.variables.getLocalVariableCollectionsAsync();\nlet collection = collections.find(c => c.name === spec.name);\nif (!collection) { collection = figma.variables.createVariableCollection(spec.name); collection.renameMode(collection.defaultModeId, 'Light'); }\nfor (const name of spec.modes) if (!collection.modes.some(mode => mode.name === name)) collection.addMode(name);\nconst variables = (await figma.variables.getLocalVariablesAsync()).filter(variable => variable.variableCollectionId === collection.id);\nconst updated = [];\nfor (const input of spec.variables) {\n  let variable = variables.find(value => value.name === input.name);\n  if (!variable) variable = figma.variables.createVariable(input.name, collection, 'COLOR');\n  variable.scopes = input.scopes; variable.description = input.description;\n  for (const mode of collection.modes) if (input.values[mode.name]) variable.setValueForMode(mode.modeId, input.values[mode.name]);\n  updated.push(variable.id);\n}\nreturn {collectionId: collection.id, collectionName: collection.name, modes: collection.modes, variableIds: updated, coreCollectionsChanged: false};\n})();\n`;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (!['--light', '--dark', '--name', '--out', '--minimum-contrast', '--sample'].includes(flag)) throw new Error('Unknown option: ' + flag);
    const value = argv[++index]; assert(value !== undefined, 'Missing value for ' + flag);
    options[flag.slice(2)] = value;
  }
  return options;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const graph = generateCustomScope({ light: args.light, dark: args.dark, name: args.name, minimumContrast: args['minimum-contrast'] ? Number(args['minimum-contrast']) : 4.5 });
  const audit = verifyCustomScope(graph); graph.audit = audit;
  const out = path.resolve(args.out || path.join(dir, '../../artifacts/custom-project'));
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'graph.json'), JSON.stringify(graph, null, 2) + '\n');
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(audit, null, 2) + '\n');
  if (audit.result === 'pass') fs.writeFileSync(path.join(out, 'import.js'), customImportScript(graph));
  else fs.rmSync(path.join(out, 'import.js'), { force: true });
  const lines = ['/* Explicit project background scope; regenerate when the background changes. */'];
  for (const theme of ['Light', 'Dark']) { lines.push(`[data-custom-theme="${theme.toLowerCase()}"] {`); for (const [role, value] of Object.entries(graph.contexts[theme].roles)) lines.push(`  --custom-${role.replaceAll('/', '-')}: ${css(value)};`); lines.push('}'); }
  fs.writeFileSync(path.join(out, 'tokens.css'), lines.join('\n') + '\n');
  if (args.sample) { fs.mkdirSync(path.dirname(path.resolve(args.sample)), { recursive: true }); fs.writeFileSync(path.resolve(args.sample), JSON.stringify({ ...graph, contexts: Object.fromEntries(Object.entries(graph.contexts).map(([theme, context]) => [theme, { ...context, modelChecks: undefined }])) }, null, 2) + '\n'); }
  console.log(JSON.stringify({ ...audit, appearanceIssues: Object.fromEntries(Object.entries(audit.appearanceIssues).map(([theme, issues]) => [theme, issues.length])), output: out, importScriptWritten: audit.result === 'pass', sample: args.sample || null, sha256: createHash('sha256').update(JSON.stringify(graph)).digest('hex') }, null, 2));
  if (audit.result !== 'pass') process.exitCode = 1;
}
