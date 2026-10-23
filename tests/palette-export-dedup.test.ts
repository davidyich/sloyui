import { describe, expect, it } from 'vitest';
import { createAccent, createNeutralSystem, defaultRules, exportCSS, exportGraph, generateAll } from '../figma/color-system-v2/editor/model.mjs';
import source from '../figma/color-system-v2/source.json';
import resolved from '../figma/token-system-v4/palette-contexts.json';

type ExportVariable = { name: string; values: Record<string, any> };
type ExportCollection = { key: string; modes: string[]; variables: ExportVariable[] };
type ExportedGraph = { collections: ExportCollection[] };

describe('Palette Lab layer exports', () => {
  it.each([false, true])('inherits a shared paint without redundant layer roles (neutral=%s)', withNeutral => {
    const accent = createAccent('blue', '#087BE9');
    const rules = { ...defaultRules, balanceSecondary: true };
    const neutral = withNeutral ? createNeutralSystem() : undefined;
    const graph = exportGraph([accent], source, resolved, undefined, rules, neutral) as ExportedGraph;
    const css = exportCSS([accent], source, resolved, undefined, rules, neutral);
    expect(graph.collections.find(collection => collection.key === 'surface')?.variables.some(variable => variable.name.startsWith('on-layer/'))).toBe(false);
    expect(css).not.toContain('data-pl-layer=');
    expect(css).toContain('--pl-surface-secondary-normal-blue:');
    expect(css).toContain('data-pl-surface="Custom"');
  }, 30000);

  it('keeps legacy overrides complete and resolves their actual paint on every surface', () => {
    const accent = createAccent('blue', '#087BE9');
    const rules = { ...defaultRules, balanceSecondary: true, sharedAlpha: false };
    const contexts = generateAll(accent, source, resolved, undefined, rules);
    const graph = exportGraph([accent], source, resolved, undefined, rules) as ExportedGraph;
    const variables = new Map(graph.collections.flatMap(collection => collection.variables.map(variable => [collection.key + '/' + variable.name, { variable, collection }] as const)));
    const resolve = (key: string, context: Record<string, string>): unknown => {
      const entry = variables.get(key);
      if (!entry) throw Error('Missing export alias: ' + key);
      const value = entry.variable.values[context[entry.collection.key] ?? entry.collection.modes[0]];
      if (value?.alias) return resolve(value.alias, context);
      if (value?.color) return { ...(resolve(value.color.alias, context) as object), a: Number(resolve(value.opacity.alias, context)) / 100 };
      return value;
    };
    const layerRoles = graph.collections.find(collection => collection.key === 'surface')!.variables.filter(variable => variable.name.startsWith('on-layer/'));
    expect(layerRoles.length).toBeGreaterThan(0);
    for (const variable of layerRoles) for (const context of contexts) {
      const match = variable.name.match(/^on-layer\/(.+)\/surface\/(secondary|tertiary)\/blue-(normal|active)$/)!;
      expect(Object.keys(variable.values)).toEqual(graph.collections.find(collection => collection.key === 'surface')!.modes);
      expect(resolve('surface/' + variable.name, { theme: context.theme, scheme: context.scheme, surface: context.surface })).toEqual(context.layerFills[match[1]][match[2] + '/' + match[3]]);
    }
    expect(exportCSS([accent], source, resolved, undefined, rules)).toContain('data-pl-layer=');
  }, 30000);
});
