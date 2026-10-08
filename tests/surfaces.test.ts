import { describe, expect, it } from 'vitest';
import surfaces from '../source/surface-rules.json';
import palettes from '../src/tokens/accents.json';
import graph from '../src/tokens/figma-modes.json';

// Vitest omits CSS imports even with ?raw. Read this generated artifact in Node
// without requiring Node ambient types in the consumer-facing TS configuration.
const fsModule = 'node:fs';
const { readFileSync } = await import(/* @vite-ignore */ fsModule) as { readFileSync: (path: string, encoding: 'utf8') => string };
const css = readFileSync('src/styles/tokens.css', 'utf8');

type RGB = readonly [number, number, number];
type Theme = 'light' | 'dark';
type Scope = { surface: string; theme: Theme; borders: 'on' | 'off'; accent: string };
function splitOutsideFunctions(value: string, separator: ',' | ' '): string[] {
  let depth = 0, start = 0;
  const parts: string[] = [];
  for (let index = 0; index < value.length; index++) {
    if (value[index] === '(') depth++;
    else if (value[index] === ')') depth--;
    else if (!depth && value[index] === separator) { const part = value.slice(start, index).trim(); if (part) parts.push(part); start = index + 1; }
  }
  const last = value.slice(start).trim(); if (last) parts.push(last);
  return parts;
}
function cssVariables(scope: Scope): Map<string, string> {
  const attributes: Record<string, string> = { 'data-surface': scope.surface, 'data-theme': scope.theme, 'data-accent': scope.accent, 'data-borders': scope.borders };
  const variables = new Map<string, string>();
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const matches = selectors.split(',').some(selector => {
      selector = selector.replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (selector === ':root') return true;
      const attribute = /^\[(data-[\w-]+)(?:="([^"]+)")?\]$/.exec(selector);
      return !!attribute && attribute[1] in attributes && (attribute[2] === undefined || attribute[2] === attributes[attribute[1]]);
    });
    if (matches) for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) variables.set(name, value.trim());
  }
  return variables;
}
function resolveColor(scope: Scope) {
  const variables = cssVariables(scope), seen = new Set<string>();
  const percent = (value: string): number => {
    const expanded = value.replace(/var\((--[\w-]+)\)/g, (_, name) => {
      const result = variables.get(name); if (!result) throw new Error(`Missing percentage variable ${name}`); return result;
    }).replace(/^calc\((.*)\)$/, '$1').replaceAll(' ', '');
    const pieces = expanded.match(/[+-]?(?:\d+(?:\.\d+)?|\.\d+)%/g);
    if (!pieces || pieces.join('') !== expanded) throw new Error(`Unsupported percentage: ${value}`);
    return pieces.reduce((total, piece) => total + parseFloat(piece), 0) / 100;
  };
  const evaluate = (expression: string): RGB => {
    expression = expression.trim();
    if (expression.startsWith('var(')) {
      const name = expression.slice(4, -1), value = variables.get(name);
      if (!value || seen.has(name)) throw new Error(`Missing or circular variable ${name}`);
      seen.add(name); const result = evaluate(value); seen.delete(name); return result;
    }
    if (expression.startsWith('light-dark(')) return evaluate(splitOutsideFunctions(expression.slice(11, -1), ',')[scope.theme === 'light' ? 0 : 1]);
    if (expression.startsWith('color-mix(')) {
      const [space, first, second] = splitOutsideFunctions(expression.slice(10, -1), ',');
      if (space !== 'in srgb') throw new Error(`Unsupported interpolation ${space}`);
      const a = splitOutsideFunctions(first, ' '), b = splitOutsideFunctions(second, ' ');
      const weightA = a.length === 2 ? percent(a[1]) : b.length === 2 ? 1 - percent(b[1]) : .5;
      const weightB = b.length === 2 ? percent(b[1]) : 1 - weightA;
      const colorA = evaluate(a[0]), colorB = evaluate(b[0]);
      return colorA.map((channel, index) => (channel * weightA + colorB[index] * weightB) / (weightA + weightB)) as unknown as RGB;
    }
    if (/^#[\da-f]{3}$/i.test(expression)) expression = '#' + [...expression.slice(1)].map(character => character + character).join('');
    if (/^#[\da-f]{6}$/i.test(expression)) return [1, 3, 5].map(index => parseInt(expression.slice(index, index + 2), 16) / 255) as unknown as RGB;
    if(expression.startsWith('rgb(')) return expression.slice(4,-1).split(' / ')[0].split(' ').map(Number).map(n=>n/255) as unknown as RGB;
    throw new Error(`Unsupported generated color ${expression}`);
  };
  return (role: string) => evaluate(`var(--cap-${role})`);
}
function luminance(color: RGB) {
  return color.map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
    .reduce((total, channel, index) => total + channel * [.2126, .7152, .0722][index], 0);
}
function contrast(foreground: RGB, background: RGB) {
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
const contexts = Object.keys(surfaces).flatMap(surface => (['light', 'dark'] as const).map(theme => ({ surface, theme })));

describe('Contextual surfaces: normal-text readability', () => {
  it.each(contexts)('$surface / $theme: secondary and muted text remain AA on surfaces and interactive fills', ({ surface, theme }) => {
    const failures: string[] = [];
    for (const borders of ['off', 'on'] as const) {
      const color = resolveColor({ surface, theme, borders, accent: 'neutral' });
      for (const foreground of ['content-secondary', 'content-muted']) for (const background of ['surface-current', 'control-bg', 'control-hover', 'control-active']) {
        const ratio = contrast(color(foreground), color(background));
        if (ratio < 4.5) failures.push(`borders=${borders}: ${foreground} on ${background} = ${ratio.toFixed(3)}:1`);
      }
    }
    expect(failures, 'Small UI text requires contrast >= 4.5:1, including hover/active controls.').toEqual([]);
  });

  it.each(contexts)('$surface / $theme: all accent modes keep ink and text AA on contextual fills', ({ surface, theme }) => {
    const failures: string[] = [];
    for (const accent of graph.modes) {
      const color = resolveColor({ surface, theme, borders: 'off', accent });
      for (const foreground of ['accent-ink', 'accent-text']) for (const background of ['accent-normal', 'accent-hover', 'accent-pressed']) {
        const ratio = contrast(color(foreground), color(background));
        if (ratio < 4.5) failures.push(`${accent}: ${foreground} on ${background} = ${ratio.toFixed(3)}:1`);
      }
    }
    for(const accent of graph.modes){const color=resolveColor({surface,theme,borders:'off',accent});expect(contrast(color('disabled-text'),color('disabled-background'))).toBeGreaterThanOrEqual(4.5);expect(new Set(['accent-normal','accent-hover','accent-pressed'].map(n=>JSON.stringify(color(n)))).size).toBe(3);}
    expect(failures, 'Shared accent modes must remain readable on every declared surface.').toEqual([]);
  });
});

it('lifts dark floating surfaces above Raised and changes ButtonGroup fills with the real surface',()=>{
 for(const theme of ['light','dark'] as const){
  const fill=(surface:string)=>resolveColor({surface,theme,borders:'off',accent:'blue'});
  const different=['base','canvas','raised'].map(surface=>JSON.stringify(fill(surface)('group-background')));
  expect(new Set(different).size).toBe(3);
  for(const surface of Object.keys(surfaces)){
   const color=fill(surface);
   expect(contrast(color('content-caption'),color('surface-current'))).toBeGreaterThanOrEqual(4.5);
   expect(contrast(color('control-text'),color('group-background'))).toBeGreaterThanOrEqual(4.5);
  }
 }
 const dark=(surface:string)=>resolveColor({surface,theme:'dark',borders:'off',accent:'blue'});
 expect(luminance(dark('floating')('surface-current'))).toBeGreaterThan(luminance(dark('raised')('surface-current')));
});

it.each(contexts)('$surface / $theme: group reactions contrast against the actual group fill and remain readable',({surface,theme})=>{
 for(const borders of ['off','on'] as const){
  const color=resolveColor({surface,theme,borders,accent:'neutral'});
  expect(contrast(color('group-background'),color('surface-current'))).toBeGreaterThanOrEqual(1.12);
  expect(contrast(color('group-hover'),color('group-background'))).toBeGreaterThanOrEqual(1.12);
  expect(contrast(color('group-pressed'),color('group-hover'))).toBeGreaterThanOrEqual(1.12);
  for(const role of ['group-background','group-prefix','group-hover','group-pressed'])expect(contrast(color('group-text'),color(role))).toBeGreaterThanOrEqual(4.5);
 }
});

it.each(contexts)('$surface / $theme: CSS accent roles resolve the same colors as independent Figma modes',({surface,theme})=>{
 const resolve=(path:string):RGB=>{
  const [collectionName,...segments]=path.split('/');
  const collection=graph.collections.find(value=>value.name===collectionName)!;
  const mode=collectionName==='Primitives'?'Value':collectionName==='Theme'?(theme==='dark'?'Dark':'Light'):surface[0].toUpperCase()+surface.slice(1);
  const values=collection.modes as unknown as Record<string,Record<string,{alias:string}|{components:number[]}>>;
  const value=values[mode][segments.join('/')];
  return 'alias' in value?resolve(value.alias):value.components as unknown as RGB;
 };
 for(const accent of graph.modes){
  const cssColor=resolveColor({surface,theme,borders:'off',accent});
  for(const role of ['normal','hover','pressed','disabled','text','disabled-text']){
   const web=cssColor('accent-'+role),figma=resolve(`Semantic/element/${accent}/${role}`);
   for(let channel=0;channel<3;channel++)expect(web[channel],`${theme}/${surface}/${accent}/${role}`).toBeCloseTo(figma[channel],8);
  }
 }
});
