import { legacyColorPath, resolveV4, toRuntimeColor, surfaceCompatibility } from './runtime-v4-model.mjs';
import { attachDensity } from './density-architecture.mjs';

const routeSurfaceValues = values => {
  if (new Set(Object.values(values)).size === 1) return values.base;
  return Object.entries(values).map(([surface,value])=>`var(--cap-route-${surface}, ${value})`).join(' ');
};

/** Select exact authored colors; the surface scheme changes only the dark branch. */
export function surfaceSchemeCSSRoute(values, surfaceSchemes, invertedValues) {
  const standard = routeSurfaceValues(values);
  const inverted = routeSurfaceValues(invertedValues || Object.fromEntries(Object.keys(values).map(surface => [surface, values[surfaceSchemes.inverted.dark[surface]]])));
  return standard === inverted ? standard : `light-dark(${standard}, var(--cap-route-standard, ${standard}) var(--cap-route-inverted, ${inverted}))`;
}

/** Public design API over the exact authored color model. No color fitting or resampling. */
export function buildTokenArchitecture(legacy, runtimeCSS, surfaceSchemes, densitySource) {
  const source = new Map(legacy.collections.map(collection => [collection.name, collection]));
  const raw = source.get('Primitives').modes.Value;
  const surfaceModes = { base: 'Page', canvas: 'Inset', raised: 'Panel', floating: 'Overlay' };
  const palette = {}, primitives = {}, theme = { Light: {}, Dark: {} };
  const scheme = Object.fromEntries(Object.values(surfaceSchemes).map(value => [value.label, {}]));
  const semantic = Object.fromEntries(Object.values(surfaceModes).map(mode => [mode, {}]));
  const components = {}, metadata = {}, legacyPaths = {}, publicRoles = [], rawTargets = {};
  const cssName = name => '--cap-' + name.replaceAll('/', '-').replaceAll('.', '_');
  const alias = path => ({ alias: path });
  const stateName = role => role === 'text' ? 'content' : role === 'disabled-text' ? 'disabled/content'
    : role.startsWith('border') ? 'border/' + (role.slice(7) || 'normal') : 'background/' + role;
  const colorName = name => {
    if (name === 'surface/current') return 'surface/background';
    if (name === 'disabled/text') return 'disabled/content';
    if (name.startsWith('control/')) return 'secondary/neutral/' + stateName(name.split('/')[1]);
    if (name.startsWith('element/')) { const [, hue, role] = name.split('/'); return `color/${hue}/secondary/${stateName(role)}`; }
    if (name.startsWith('action/') || name.startsWith('action-vivid/')) {
      const [family, hue, role] = name.split('/');
      return family === 'action' && hue === 'neutral' ? 'primary/' + stateName(role)
        : `color/${hue}/${family === 'action' ? 'solid' : 'vivid'}/${stateName(role)}`;
    }
    if (name.startsWith('feedback/')) { const [, tone, role] = name.split('/'); return `status/${tone}/${stateName(role)}`; }
    if (name === 'overlay/dim') return 'overlay/scrim';
    return name;
  };
  const publicSource = new Set([
    'surface/current', ...['primary', 'secondary', 'tertiary', 'muted', 'caption'].map(role => 'content/' + role),
    ...['normal', 'hover', 'pressed', 'text'].map(role => 'control/' + role),
    ...['normal', 'hover', 'pressed', 'text'].map(role => 'action/neutral/' + role),
    ...['subtle', 'default', 'strong'].map(role => 'border/' + role), 'focus/ring',
    ...['danger', 'success', 'warning', 'info'].flatMap(tone => ['normal', 'text'].map(role => `feedback/${tone}/${role}`)),
    'reaction/hover', 'reaction/pressed', 'overlay/dim', 'disabled/background', 'disabled/text',
  ]);
  const descriptions = {
    surface: 'Фон контейнера. Выберите Page, Inset, Panel или Overlay на самом контейнере.',
    content: 'Цвет содержимого на текущей поверхности.',
    secondary: 'Нейтральный secondary: отдельная непрозрачная пара для текущей поверхности и состояния.',
    primary: 'Контрастное нейтральное основное действие.',
    border: 'Структурная граница; не отключается вместе с декоративными обводками.',
    focus: 'Видимый индикатор клавиатурного фокуса.',
    status: 'Смысловой статус. Используйте соответствующие друг другу фон, содержимое и границу.',
    reaction: 'Реакция вложенного действия поверх существующей заливки.',
    overlay: 'Затемнение за модальным содержимым.',
    disabled: 'Общая нейтральная пара недоступного состояния.',
  };
  const addMeta = (path, original, extra = {}) => {
    metadata[path] = { ...original, visibility: 'internal', scopes: [], ...extra };
    if (!metadata[path].css) delete metadata[path].css;
  };
  let extraCSS = '\n/* Token architecture v2: public roles and exact component contracts. */\n:root {\n';
  for (const [name, value] of Object.entries(raw)) {
    const original = legacy.metadata['Primitives/' + name];
    if (name.startsWith('palette/')) {
      const target = 'Palette/' + name.slice(8);
      palette[name.slice(8)] = value;
      legacyPaths['Primitives/' + name] = target;
      addMeta(target, original);
      continue;
    }
    if (original.type === 'COLOR') continue; // Context-dependent colors are values of Theme, never primitives.
    let primitiveName;
    if (original.type === 'STRING') primitiveName = 'font-family/' + value.toLowerCase().replaceAll(' ', '-');
    else if (name.startsWith('number/opacity/')) primitiveName = 'opacity/' + name.split('/').at(-1);
    else if (original.unit === 'ms') primitiveName = 'duration/' + value;
    else if (name.startsWith('font/weight/')) primitiveName = 'weight/' + value;
    else primitiveName = (original.unit === 'px' ? 'dimension/' : 'ratio/') + value;
    // DTCG reserves periods in token names for alias path separators.
    primitiveName = primitiveName.replaceAll('.', '_');
    const target = 'Primitives/' + primitiveName;
    rawTargets['Primitives/' + name] = target;
    if (!(primitiveName in primitives)) {
      primitives[primitiveName] = value;
      const css = cssName('primitive/' + primitiveName);
      addMeta(target, original, { css });
      extraCSS += `  ${css}: ${typeof value === 'string' ? JSON.stringify(value) : value + (original.unit === 'px' || original.unit === 'ms' ? original.unit : '')};\n`;
    }
    let collection = 'Semantic', role;
    if (name.startsWith('number/inline-counter-size/')) { collection = 'Components'; role = 'counter/height/' + name.split('/').at(-1); }
    else if (name.startsWith('number/selection-size/')) { collection = 'Components'; role = 'selection/size/' + name.split('/').at(-1); }
    else if (name.startsWith('number/slider-')) { collection = 'Components'; role = name.replace('number/slider-', 'slider/'); }
    else if (name.startsWith('number/elevation/')) { collection = 'Components'; role = name.slice(7); }
    else if (name.startsWith('number/control-size/')) role = name.replace('number/control-size/', 'size/control/');
    else if (name.startsWith('number/spacing/')) role = name.replace('number/spacing/', 'space/');
    else if (name.startsWith('number/duration/')) role = name.replace('number/duration/', 'motion/duration/');
    else if (name.startsWith('font/')) role = name.replace('font/', 'typography/');
    else role = name.slice(7);
    const rolePath = collection + '/' + role;
    if (collection === 'Components') components[role] = alias(target);
    else for (const values of Object.values(semantic)) values[role] = alias(target);
    addMeta(rolePath, original, { scopes: collection === 'Semantic' ? original.scopes : [] });
    legacyPaths['Primitives/' + name] = rolePath;
  }
  extraCSS += '}\n';
  const density=attachDensity({source:densitySource,primitives,semantic,components,metadata,rawTargets,legacyPaths,legacy,cssName});
  // A repeated theme pair is a shared implementation value, while role names retain their meaning.
  const themeByValue = new Map();
  const themePair = (pair, proposed, original) => {
    const signature = JSON.stringify(pair);
    const name = themeByValue.get(signature) || proposed;
    if (!themeByValue.has(signature)) {
      themeByValue.set(signature, name);
      for (const mode of ['Light', 'Dark']) theme[mode][name] = pair[mode];
      addMeta('Theme/' + name, original, { css: undefined });
    }
    return 'Theme/' + name;
  };
  for (const oldName of Object.keys(source.get('Theme').modes.Light)) {
    const proposed = oldName.startsWith('context/')
      ? oldName.replace(/^context\/([^/]+)\/(.*)$/, (_, surface, role) => `context/${surfaceModes[surface].toLowerCase()}/${colorName(role)}`)
      : colorName(oldName);
    const pair = {};
    for (const mode of ['Light', 'Dark']) {
      const value = source.get('Theme').modes[mode][oldName];
      const primitive = value.alias?.slice('Primitives/'.length);
      pair[mode] = primitive?.startsWith('palette/') ? alias(legacyPaths[value.alias])
        : rawTargets[value.alias] ? alias(rawTargets[value.alias]) : value.alias ? raw[primitive] : value;
    }
    legacyPaths['Theme/' + oldName] = themePair(pair, proposed, legacy.metadata['Theme/' + oldName]);
  }
  const legacySemantic = source.get('Semantic');
  const schemeByValue = new Map();
  const contextualTarget = (oldName, surface) => {
    const oldMode = surface[0].toUpperCase() + surface.slice(1);
    const standard = legacyPaths[legacySemantic.modes[oldMode][oldName].alias];
    const absolute = /^surface\/(base|canvas|raised|floating)$/.exec(oldName)?.[1];
    const role = absolute ? 'Theme/surface/bg' : legacyColorPath(oldName);
    const targetSurface = surfaceCompatibility[absolute || surface];
    if (!role) return standard;
    const standardKey = standard.slice('Theme/'.length);
    const pair = Object.fromEntries(['Light','Dark'].map(Theme => [Theme, toRuntimeColor(resolveV4(role,{Theme,Surface:targetSurface,SurfaceScheme:'Dimmed'}))]));
    if (JSON.stringify(theme.Light[standardKey])===JSON.stringify(pair.Light) && JSON.stringify(theme.Dark[standardKey])===JSON.stringify(pair.Dark)) return standard;
    const proposed = absolute ? 'surface/' + surfaceModes[absolute].toLowerCase() : 'context/' + surfaceModes[surface].toLowerCase() + '/' + colorName(oldName);
    const dimmed = themePair(pair, 'scheme/dimmed/' + proposed, legacy.metadata['Semantic/' + oldName]);
    const modes = { Standard: alias(standard), Inverted: alias(dimmed), Dimmed: alias(dimmed) }, signature = JSON.stringify(modes);
    let name = schemeByValue.get(signature);
    if (!name) {
      name = proposed;
      schemeByValue.set(signature, name);
      for (const [mode, value] of Object.entries(modes)) scheme[mode][name] = value;
      addMeta('SurfaceScheme/' + name, legacy.metadata['Semantic/' + oldName], { css: undefined, description: 'Standard / Dimmed по каноническому графу v4. Inverted — совместимое имя Dimmed.' });
    }
    return 'SurfaceScheme/' + name;
  };
  const disabledPath = old => /(^control\/|^element\/[^/]+\/|^feedback\/[^/]+\/)(disabled|disabled-text)$/.test(old)
    ? 'Semantic/disabled/' + (old.endsWith('disabled-text') ? 'content' : 'background') : null;
  for (const oldName of Object.keys(legacySemantic.modes.Base)) {
    const oldPath = 'Semantic/' + oldName;
    if (disabledPath(oldName)) { legacyPaths[oldPath] = disabledPath(oldName); continue; }
    // Absolute surfaces are implementation helpers. The public surface always paints its selected context.
    if (/^surface\/(base|canvas|raised|floating)$/.test(oldName)) {
      legacyPaths[oldPath] = contextualTarget(oldName, 'base');
      continue;
    }
    const name = colorName(oldName), path = 'Semantic/' + name, original = legacy.metadata[oldPath];
    legacyPaths[oldPath] = path;
    for (const [surface, mode] of Object.entries(surfaceModes)) {
      semantic[mode][name] = alias(contextualTarget(oldName, surface));
    }
    let css = original.css;
    if (oldName.startsWith('action/neutral/')) css = '--cap-action-' + oldName.split('/').at(-1);
    if (/^(element|action|action-vivid)\//.test(oldName) && !oldName.startsWith('action/neutral/')) css = cssName(name);
    if (oldName === 'surface/current') css = '--cap-surface-background';
    if (oldName === 'shadow/contact' || oldName === 'shadow/ambient' || oldName === 'reaction/normal-opacity') css = undefined;
    const visible = publicSource.has(oldName);
    const scopes = original.scopes.includes('TEXT_FILL') ? ['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR'] : original.scopes;
    addMeta(path, original, { css, visibility: visible ? 'public' : 'internal', scopes: visible ? scopes : [], description: descriptions[name.split('/')[0]] || 'Внутренняя роль компонента; наследует тему и поверхность.' });
    if (visible) publicRoles.push({ name, css, group: name.split('/')[0], description: metadata[path].description, scopes: metadata[path].scopes });
  }
  // Status borders are explicit roles, even when a status currently shares a palette with a tag.
  const cssAliases = { '--cap-surface-background': '--cap-surface-current' };
  for (const [tone, hue] of Object.entries({ danger: 'red', success: 'green', warning: 'orange', info: 'blue' })) {
    const name = `status/${tone}/border`, path = 'Semantic/' + name, css = `--cap-status-${tone}-border`;
    for (const values of Object.values(semantic)) values[name] = alias(`Semantic/color/${hue}/secondary/border/normal`);
    addMeta(path, { type: 'COLOR' }, { css, visibility: 'public', scopes: ['STROKE_COLOR'], description: descriptions.status });
    publicRoles.push({ name, css, group: 'status', description: descriptions.status, scopes: ['STROKE_COLOR'] });
    cssAliases[css] = `--cap-color-${hue}-secondary-border-normal`;
  }
  const component = (name, semanticPath, cssTarget) => {
    const path = 'Components/' + name, target = metadata[semanticPath];
    components[name] = alias(semanticPath);
    const css = cssName('component/' + name);
    addMeta(path, target, { css, visibility: 'internal', scopes: [], description: `Компонентная роль ${name}.` });
    cssAliases[css] = cssTarget || target.css;
  };
  for (const state of ['normal', 'hover', 'pressed']) {
    component(`button/secondary/background/${state}`, `Semantic/secondary/neutral/background/${state}`);
    component(`button/primary/background/${state}`, `Semantic/primary/background/${state}`);
    component(`input/background/${state}`, `Semantic/secondary/neutral/background/${state}`);
  }
  component('button/secondary/content', 'Semantic/secondary/neutral/content');
  component('button/primary/content', 'Semantic/primary/content');
  component('input/content', 'Semantic/content/primary');
  component('card/background', 'Semantic/surface/block');
  for (const family of ['button', 'input', 'tag']) {
    component(`${family}/disabled/background`, 'Semantic/disabled/background');
    component(`${family}/disabled/content`, 'Semantic/disabled/content');
  }
  for (const hue of legacy.modes) {
    for (const state of ['normal', 'hover', 'pressed']) {
      component(`tag/${hue}/background/${state}`, `Semantic/color/${hue}/secondary/background/${state}`);
      component(`button/accent-secondary/${hue}/background/${state}`, `Semantic/color/${hue}/secondary/background/${state}`);
      component(`tag/${hue}/border/${state}`, `Semantic/color/${hue}/secondary/border/${state}`);
    }
    component(`tag/${hue}/content`, `Semantic/color/${hue}/secondary/content`);
    component(`button/accent-secondary/${hue}/content`, `Semantic/color/${hue}/secondary/content`);
  }
  // Inheriting runtime slots are selected by data-accent; fixed hue Figma slots have exact WEB syntax.
  for (const state of ['normal', 'hover', 'pressed']) {
    cssAliases[`--cap-component-tag-background-${state}`] = `--cap-accent-${state}`;
    cssAliases[`--cap-component-button-accent-secondary-background-${state}`] = `--cap-accent-${state}`;
  }
  cssAliases['--cap-component-tag-content'] = '--cap-accent-text';
  cssAliases['--cap-component-button-accent-secondary-content'] = '--cap-accent-text';
  const borders = { Off: { 'border/width': alias(legacyPaths['Primitives/number/border/none']) }, On: { 'border/width': alias(legacyPaths['Primitives/number/border/width']) } };
  legacyPaths['Borders/border/width'] = 'Borders/border/width';
  addMeta('Borders/border/width', legacy.metadata['Borders/border/width'], { description: 'Независимая декоративная граница; не влияет на focus или структурные разделители.' });
  // Fixed hue roles do not depend on the chosen accent, radius, borders or shadow.
  // Keep them inherited at accent-only nodes instead of expanding every hue again.
  extraCSS += ':root, [data-theme], [data-surface], [data-surface-scheme] {\n';
  const route = values => surfaceSchemeCSSRoute(values, surfaceSchemes);
  for (const oldName of Object.keys(legacySemantic.modes.Base).filter(name => /^(element|action|action-vivid)\//.test(name))) {
    const path = legacyPaths['Semantic/' + oldName], css = metadata[path]?.css;
    if (!css?.startsWith('--cap-color-')) continue;
    const values = Object.fromEntries(Object.keys(surfaceModes).map(surface => {
      const oldMode = surface[0].toUpperCase() + surface.slice(1);
      const themeRef = legacySemantic.modes[oldMode][oldName].alias.slice('Theme/'.length);
      const refs = ['Light', 'Dark'].map(mode => source.get('Theme').modes[mode][themeRef].alias.slice('Primitives/'.length));
      return [surface, `light-dark(var(${cssName(refs[0])}), var(${cssName(refs[1])}))`];
    }));
    extraCSS += `  ${css}: ${route(values)};\n`;
  }
  extraCSS += '}\n:root, [data-theme], [data-accent], [data-color], [data-surface], [data-surface-scheme], [data-borders], [data-shadow], [data-radius], [data-density] {\n';
  for (const [name, target] of Object.entries(cssAliases)) {
    if (!target) throw new Error(`Missing runtime target for ${name}`);
    extraCSS += `  ${name}: var(${target});\n`;
  }
  extraCSS += '  --cap-decoration-width: calc(var(--cap-border-width) * var(--cap-borders-enabled));\n}\n';
  extraCSS += ':root, [data-borders="off"] { --cap-borders-enabled:0; }\n[data-borders="on"] { --cap-borders-enabled:1; }\n';
  extraCSS += '.cap-surface { background:var(--cap-surface-background); color:var(--cap-content-primary); }\n';
  for (const [oldSurface, mode] of Object.entries(surfaceModes)) {
    const name = mode.toLowerCase();
    extraCSS += `[data-surface="${name}"] { ${Object.keys(surfaceModes).map(surface=>`--cap-route-${surface}:${surface===oldSurface?'initial':' '};`).join(' ')} }\n`;
  }
  const collections = [
    { name: 'Palette', modes: { Value: palette } }, { name: 'Primitives', modes: { Value: primitives } },
    { name: 'Theme', modes: theme }, { name: 'SurfaceScheme', modes: scheme }, density.collection, { name: 'Semantic', modes: semantic },
    { name: 'Components', modes: { Default: components } }, { name: 'Borders', modes: borders },
  ];
  const css = runtimeCSS + extraCSS + density.css;
  const declarations = new Set([...css.matchAll(/(--cap-[\w-]+)\s*:/g)].map(match => match[1]));
  for (const [path, entry] of Object.entries(metadata)) if (entry.css && !declarations.has(entry.css)) throw new Error(`Undefined WEB syntax ${path}: ${entry.css}`);
  const graph = { ...legacy, schemaVersion: 2, collections, metadata, legacyPaths, surfaceModes, surfaceSchemes, publicRoles: publicRoles.map(role => 'Semantic/' + role.name), note: 'Palette → Theme/SurfaceScheme → Semantic → Components; raw Primitives → Density → Semantic/Components. Theme and SurfaceScheme are internal routing. Standard and Dimmed resolve the canonical v4 region contexts in both themes. Inverted aliases Dimmed.' };
  const tokenContract = { schemaVersion: 2, source: 'source/foundation.json', publicColorCount: publicRoles.length, publicColors: publicRoles, surfaces: surfaceModes,
    contexts: { theme: ['light', 'dark'], accent: legacy.modes, surface: Object.values(surfaceModes).map(name => name.toLowerCase()), surfaceScheme: Object.keys(surfaceSchemes), borders: ['off', 'on'], radius:['none','compact','default','rounded'], density:['default','compact'] },
    density: {source:'source/density.json',defaultMode:densitySource.defaultMode,modes:Object.keys(densitySource.modes),roleCount:Object.keys(densitySource.modes[densitySource.defaultMode]).length,componentBindings:densitySource.componentBindings,preservesTypography:true,touchTarget:44},
    surfaceSchemes,
    secondary: { states: ['normal', 'hover', 'pressed', 'disabled'], interactiveStates: ['normal', 'hover', 'pressed'], semanticPattern: 'Semantic/color/{accent}/secondary/background/{state}', contentPattern: 'Semantic/color/{accent}/secondary/content', runtime: { background: '--cap-accent-{state}', content: '--cap-accent-text' }, disabled: { background: 'Semantic/disabled/background', content: 'Semantic/disabled/content', runtime: { background: '--cap-disabled-background', content: '--cap-disabled-text' } }, requiredContext: ['data-theme', 'data-surface', 'data-accent'] },
    componentStates: { interactive: ['normal', 'hover', 'pressed'], disabledPattern: 'Components/{component}/disabled/{slot}', disabledComponents: ['button', 'input', 'tag'], disabledSlots: ['background', 'content'] },
    componentPatterns: ['Components/button/secondary/background/{state}', 'Components/button/accent-secondary/{accent}/background/{state}', 'Components/input/background/{state}', 'Components/tag/{accent}/background/{state}', 'Components/card/background'],
    migration: { legacyPaths, writesExistingFigmaDocument: false, rawComputedColors: 'Generated values in Theme; not palette or primitive variables.' },
  };
  return { graph, css, publicRoles, tokenContract };
}
