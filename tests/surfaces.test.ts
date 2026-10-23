import {expandCSSVariables} from './css-variable-resolver';
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
    const matches = selectors.replace(/\/\*[\s\S]*?\*\//g, '').split(',').some(selector => {
      selector = selector.trim();
      if (selector === ':root') return true;
      if(selector.startsWith(':root:not(')) {
        const missing=[...selector.matchAll(/:not\(\[(data-[\w-]+)\]\)/g)].map(match=>match[1]);
        return missing.length>0&&missing.every(attribute=>!(attribute in attributes));
      }
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
  const evaluate = (expression: string, backing?: RGB): RGB => {
    expression = expandCSSVariables(expression,name=>variables.get(name)).trim().replace(/calc\(([\d.]+)\s*\/\s*100\)/g,(_,n)=>String(Number(n)/100));
    if (expression.startsWith('var(')) {
      const name = expression.slice(4, -1), value = variables.get(name);
      if (!value || seen.has(name)) throw new Error(`Missing or circular variable ${name}`);
      seen.add(name); const result = evaluate(value,backing); seen.delete(name); return result;
    }
    if (expression.startsWith('light-dark(')) return evaluate(splitOutsideFunctions(expression.slice(11, -1), ',')[scope.theme === 'light' ? 0 : 1],backing);
    if (expression.startsWith('color-mix(')) {
      const [space, first, second] = splitOutsideFunctions(expression.slice(10, -1), ',');
      if (space !== 'in srgb') throw new Error(`Unsupported interpolation ${space}`);
      const a = splitOutsideFunctions(first, ' '), b = splitOutsideFunctions(second, ' ');
      const weightA = a.length === 2 ? percent(a[1]) : b.length === 2 ? 1 - percent(b[1]) : .5;
      const weightB = b.length === 2 ? percent(b[1]) : 1 - weightA;
      const colorA = evaluate(a[0],backing), colorB = evaluate(b[0],backing);
      return colorA.map((channel, index) => (channel * weightA + colorB[index] * weightB) / (weightA + weightB)) as unknown as RGB;
    }
    if (/^#[\da-f]{3}$/i.test(expression)) expression = '#' + [...expression.slice(1)].map(character => character + character).join('');
    if (/^#[\da-f]{6}$/i.test(expression)) return [1, 3, 5].map(index => parseInt(expression.slice(index, index + 2), 16) / 255) as unknown as RGB;
    if(expression.startsWith('rgb(')){const [channels,alphaValue]=expression.slice(4,-1).split(' / ');const rgb=channels.split(' ').map(Number).map(n=>n/255) as unknown as RGB;if(!alphaValue)return rgb;const a=Number(alphaValue.replace(/calc\(([\d.]+)\s*\/\s*100\)/,(_,n)=>String(Number(n)/100)));if(a===1)return rgb;const base=backing??evaluate('var(--cap-surface-current)');return rgb.map((c,i)=>c*a+base[i]*(1-a)) as unknown as RGB;}
    throw new Error(`Unsupported generated color ${expression}`);
  };
  return (role: string,backing?:RGB) => evaluate(`var(--cap-${role})`,backing);
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
        const backing=color(background),ratio=contrast(color(foreground,backing),backing);
        if (ratio < 4.5) failures.push(`borders=${borders}: ${foreground} on ${background} = ${ratio.toFixed(3)}:1`);
      }
    }
    expect(failures, 'Small UI text requires contrast >= 4.5:1, including hover/active controls.').toEqual([]);
  });

  it.each(contexts)('$surface / $theme: all accent modes keep ink and text AA on contextual fills', ({ surface, theme }) => {
    const failures: string[] = [];
    for (const accent of graph.modes) {
      const color = resolveColor({ surface, theme, borders: 'off', accent });
      for (const foreground of ['accent-ink', 'accent-text', 'accent-text-secondary']) for (const background of ['accent-normal', 'accent-hover', 'accent-pressed']) {
        const backing=color(background),ratio=contrast(color(foreground,backing),backing);
        if (ratio < 4.5) failures.push(`${accent}: ${foreground} on ${background} = ${ratio.toFixed(3)}:1`);
      }
    }
    for(const accent of graph.modes){const color=resolveColor({surface,theme,borders:'off',accent});expect(contrast(color('disabled-text'),color('disabled-background'))).toBeGreaterThanOrEqual(4.5);expect(new Set(['accent-normal','accent-hover','accent-pressed'].map(n=>JSON.stringify(color(n)))).size).toBe(accent==='neutral'?3:2);}
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
  const surfaceColor=color('surface-current');
  // A group can sit directly on the region or on a local block/card. Its
  // child's hover/pressed paints replace each other over the painted group.
  for(const underlay of [surfaceColor,color('surface-block',surfaceColor)]){
   const background=color('group-background',underlay),prefix=color('group-prefix',underlay);
   const hover=color('group-hover',background),pressed=color('group-pressed',background);
   expect(contrast(background,underlay)).toBeGreaterThanOrEqual(1.045);
   expect(contrast(hover,background)).toBeGreaterThanOrEqual(1.045);
   expect(contrast(pressed,hover)).toBeGreaterThanOrEqual(1.045);
   // A framed group's prefix is a distinct count section over the outer fill.
   const framedPrefix=color('group-prefix',background);
   for(const backing of [background,prefix,framedPrefix,hover,pressed])expect(contrast(color('group-text',backing),backing)).toBeGreaterThanOrEqual(4.5);
  }
 }
});

it.each(contexts)('$surface / $theme: CSS accent roles resolve the same colors as independent Figma modes',({surface,theme})=>{
 const architecture=graph as unknown as {legacyPaths:Record<string,string>;surfaceModes:Record<string,string>};
 const resolve=(path:string):RGB=>{
  path=architecture.legacyPaths[path]??path;
  const [collectionName,...segments]=path.split('/');
  const collection=graph.collections.find(value=>value.name===collectionName)!;
  const mode=collectionName==='Theme'?(theme==='dark'?'Dark':'Light'):collectionName==='Semantic'?architecture.surfaceModes[surface]:Object.keys(collection.modes)[0];
  const values=collection.modes as unknown as Record<string,Record<string,{alias:string}|{components:number[];alpha:number}>>;
  const value=values[mode][segments.join('/')];
  if('alias' in value)return resolve(value.alias);if(value.alpha===1)return value.components as unknown as RGB;const base=resolve('Semantic/surface/current');return value.components.map((c,i)=>c*value.alpha+base[i]*(1-value.alpha)) as unknown as RGB;
 };
 for(const accent of graph.modes){
  const cssColor=resolveColor({surface,theme,borders:'off',accent});
  for(const role of ['normal','hover','pressed','disabled','text','disabled-text']){
   const web=cssColor('accent-'+role),figma=resolve(`Semantic/element/${accent}/${role}`);
   for(let channel=0;channel<3;channel++)expect(web[channel],`${theme}/${surface}/${accent}/${role}`).toBeCloseTo(figma[channel],8);
  }
 }
});
