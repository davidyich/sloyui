import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const out = path.resolve(option('--out', 'artifacts/consolidation/figma-guide'));
const primaryButton = option('--primary-button', null);
const input = option('--input', null);
const switchId = option('--switch', null);
const componentMapPath = option('--component-map', null);
const componentMapSource = componentMapPath ? JSON.parse(fs.readFileSync(componentMapPath, 'utf8')) : {};
const componentMap = Object.fromEntries(Object.entries(componentMapSource.componentSets || componentMapSource).map(([key,value]) => [key, typeof value === 'string' ? value : value.id]));
const sample = JSON.parse(fs.readFileSync(path.join(dir, 'custom-example.json'), 'utf8'));
const needed = ['surface/bg', 'surface/secondary/purple-normal', 'surface/secondary/green-normal', 'surface/primary/blue-normal', 'content/on-primary-blue', 'content/primary/neutral', 'content/secondary/neutral', 'content/primary/purple', 'content/primary/green'];
const compact = {name: sample.name, backgrounds: sample.backgrounds, contexts: {}};
for (const theme of ['Light', 'Dark']) {
  const context = sample.contexts[theme];
  assert(context, 'Custom example context missing: ' + theme);
  for (const role of needed) assert(context.roles[role], 'Custom example role missing: ' + theme + '/' + role);
  compact.contexts[theme] = {roles: Object.fromEntries(needed.map(role => [role, context.roles[role]])), minimumTextContrast: context.minimumTextContrast};
}
const controlMap = Object.fromEntries(Object.entries({primaryButton, input, switch: switchId}).filter(([,value]) => value));
const common = fs.readFileSync(path.join(dir, 'common.js'), 'utf8')
  .replace('const guideControlIds = {};', 'const guideControlIds = ' + JSON.stringify(controlMap) + ';')
  .replace('const guideComponentIds = {};', 'const guideComponentIds = ' + JSON.stringify(componentMap) + ';');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
fs.mkdirSync(out, {recursive: true});
for (const [name, prelude] of [['colors', ''], ['custom-backgrounds', 'const guideCustomSample = ' + JSON.stringify(compact) + ';\n'], ['start', ''], ['components', fs.readFileSync(path.join(dir, 'variant-helper.js'), 'utf8')], ['layouts', ''], ['parity-components', ''], ['parity-buttons', ''], ['parity-layouts', '']]) {
  const code = common + '\n' + prelude + fs.readFileSync(path.join(dir, name + '.js'), 'utf8');
  new AsyncFunction(code);
  fs.writeFileSync(path.join(out, name + '.js'), code);
}
console.log(JSON.stringify({out, scripts: ['colors.js', 'custom-backgrounds.js', 'start.js', 'components.js', 'layouts.js', 'parity-components.js', 'parity-buttons.js', 'parity-layouts.js'], customBackgrounds: compact.backgrounds, primaryButtonIncluded: Boolean(primaryButton)}));
