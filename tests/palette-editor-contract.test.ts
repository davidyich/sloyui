import { describe, expect, it } from 'vitest';
import { colors } from '../src';
import { createAccent, createNeutralSystem, defaultRules, generateContext, generatePalette, presets, schema, validateProject, fromHex, toOklch, composite, primaryPair, contrast } from '../figma/color-system-v2/editor/model.mjs';
import source from '../figma/color-system-v2/source.json';
import resolved from '../figma/token-system-v4/palette-contexts.json';

const rules = { ...defaultRules, balanceSecondary: true };
const neutral = createNeutralSystem();

describe('Canonical accents and authored Palette Lab projects', () => {
  it('offers the seven kit families while retaining imported custom palettes and authored backgrounds', () => {
    expect(colors).toEqual(['neutral', 'blue', 'green', 'yellow', 'orange', 'red', 'pink', 'purple']);
    expect(presets.map(preset => preset.name)).toEqual(colors.slice(1));
    const authored = createAccent('customer-brand', '#8453B9');
    const project = validateProject({ schema, accents: [authored], backgrounds: { Light: '#E53E3E', Dark: '#7955F6' }, rules, neutral });
    expect(project.accents[0]).toMatchObject({ name: authored.name, hex: authored.hex });
    expect(project.backgrounds).toEqual({ Light: '#E53E3E', Dark: '#7955F6' });
  });

  it('keeps Yellow and Orange as independent authored ramps with recognizable seeds', () => {
    const yellow = presets.find(preset => preset.name === 'yellow')!;
    const orange = presets.find(preset => preset.name === 'orange')!;
    expect(yellow.hex).toBe('#FFE500');
    expect(orange.hex).toBe('#F56918');
    const yellowAccent = createAccent(yellow.name, yellow.hex);
    const orangeAccent = createAccent(orange.name, orange.hex);
    expect(yellowAccent.hue).toBeGreaterThan(85);
    expect(yellowAccent.hue).toBeLessThan(105);
    expect(yellowAccent.hue - orangeAccent.hue).toBeGreaterThan(50);
    expect(generatePalette(yellowAccent)[0].steps).toHaveLength(41);
    expect(generatePalette(yellowAccent)[0].steps.every(step => step.name.startsWith('yellow/') && step.value.a === 1)).toBe(true);
  });

  it('makes the new Yellow seed and soft fills cleaner without rewriting saved Yellow projects', () => {
    const previous = createAccent('yellow', '#E5B900');
    const next = createAccent('yellow', presets.find(preset => preset.name === 'yellow')!.hex);
    expect(previous.softChroma).toBe(1.4);
    expect(next.softChroma).toBe(2);
    expect(next.lightnessDark).toBe(.9);
    const darkPair = primaryPair(next, 'Dark');
    expect(darkPair.foreground).toEqual(fromHex('#000000'));
    expect(toOklch(darkPair.normal).l).toBeGreaterThan(.88);
    for (const fill of [darkPair.normal, darkPair.active]) expect(contrast(darkPair.foreground, fill)).toBeGreaterThanOrEqual(4.5);
    const vividStep = generatePalette(next)[0].steps[7].value;
    expect(toOklch(vividStep).c).toBeGreaterThan(.17);
    expect(vividStep.b).toBeLessThan(.01);
    expect(vividStep.r).toBeGreaterThan(.8);
    expect(vividStep.g).toBeGreaterThan(.65);
    const oldContext = generateContext(previous, 'Light', 'Standard', 'Content', source, resolved, undefined, rules, undefined, 'Content', neutral);
    const nextContext = generateContext(next, 'Light', 'Standard', 'Content', source, resolved, undefined, rules, undefined, 'Content', neutral);
    const rendered = (context: typeof nextContext, role: string) => toOklch(composite(context.fills[role], context.bg));
    for (const role of ['secondary/normal', 'secondary/active']) {
      expect(rendered(nextContext, role).c).toBeGreaterThan(rendered(oldContext, role).c * 1.5);
      expect(rendered(nextContext, role).h).toBeGreaterThan(99);
      expect(rendered(nextContext, role).h).toBeLessThan(106);
    }
    expect(nextContext.issues).toEqual([]);
    const pair = primaryPair(next, 'Light');
    expect(pair.foreground).toEqual(fromHex('#FFFFFF'));
    for (const fill of [pair.normal, pair.active]) expect(contrast(pair.foreground, fill)).toBeGreaterThanOrEqual(4.5);
    // Saved projects carry their exact parameters and anchors, even when their
    // accent is named yellow. Only newly added presets use the new defaults.
    const saved = { ...previous, softChroma: 1.1, paletteEdits: { interpolate: false, anchors: [{ scale: 'ramp', position: .5, hex: '#C0A040' }] } };
    const loaded = validateProject({ schema, accents: [saved], rules });
    expect(loaded.accents[0]).toMatchObject({ hex: '#E5B900', seedHex: '#E5B900', hue: previous.hue, primaryChroma: previous.primaryChroma, lightnessDark: .76, softChroma: 1.1, paletteEdits: saved.paletteEdits });
  });

  it('preserves the actual custom backing and verifies text after compositing on it', () => {
    const accent = createAccent('blue', '#087BE9');
    for (const hex of ['#E53E3E', '#7955F6', '#777777']) {
      const context = generateContext(accent, 'Light', 'Standard', 'Custom', source, resolved, { Light: hex, Dark: hex }, rules, undefined, 'Custom', neutral);
      expect(context.bg).toEqual(fromHex(hex));
      expect(context.neutralContext?.references['surface/bg']).toBe('custom/light');
      expect(context.minimumText).toBeGreaterThanOrEqual(4.5);
      expect(context.checks.every(check => check.pass)).toBe(true);
      // Mid-tone backings may be feasible after the solver chooses a different
      // fill direction. Report actual limitations, not an unconditional warning.
      if (context.appearanceChecks.some(check => !check.pass)) expect(context.issues.length).toBeGreaterThan(0);
    }
  });

  it('selects existing pigments and whole-percent opacity in both themes, including Light Invert', () => {
    for (const preset of presets) {
      const accent = createAccent(preset.name, preset.hex);
      const palette = generatePalette(accent)[0].steps;
      for (const theme of ['Light', 'Dark']) for (const surface of ['Content', 'Invert', 'Glass']) {
        const context = generateContext(accent, theme, 'Standard', surface, source, resolved, undefined, rules, undefined, surface, neutral);
        expect(context.checks.every(check => check.pass), `${preset.name}/${theme}/${surface}`).toBe(true);
        expect(context.issues, `${preset.name}/${theme}/${surface}`).toEqual([]);
        if (theme === 'Light' && surface === 'Invert') expect(context.effectiveTheme).toBe('Dark');
        for (const fills of Object.values(context.layerFills)) for (const value of Object.values(fills)) {
          expect(value.a * 100).toBeCloseTo(Math.round(value.a * 100), 10);
          expect(palette.some(step => ['r', 'g', 'b'].every(channel => step.value[channel as 'r' | 'g' | 'b'] === value[channel as 'r' | 'g' | 'b']))).toBe(true);
        }
      }
    }
  // This exhaustive correctness matrix is not a timing benchmark; shared CI
  // runners take 10–16 seconds for the same seven-hue/context search.
  }, 30000);
});
