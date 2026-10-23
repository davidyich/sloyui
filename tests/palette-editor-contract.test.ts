import { describe, expect, it } from 'vitest';
import { colors } from '../src';
import { createAccent, createNeutralSystem, defaultRules, generateContext, generatePalette, presets, schema, validateProject, fromHex } from '../figma/color-system-v2/editor/model.mjs';
import source from '../figma/color-system-v2/source.json';
import resolved from '../figma/token-system-v4/palette-contexts.json';

const rules = { ...defaultRules, balanceSecondary: true };
const neutral = createNeutralSystem();

describe('Canonical accents and authored Palette Lab projects', () => {
  it('offers the six kit families while retaining imported custom palettes and authored backgrounds', () => {
    expect(colors).toEqual(['neutral', 'blue', 'green', 'orange', 'red', 'pink', 'purple']);
    expect(presets.map(preset => preset.name)).toEqual(colors.slice(1));
    const authored = createAccent('customer-brand', '#8453B9');
    const project = validateProject({ schema, accents: [authored], backgrounds: { Light: '#E53E3E', Dark: '#7955F6' }, rules, neutral });
    expect(project.accents[0]).toMatchObject({ name: authored.name, hex: authored.hex });
    expect(project.backgrounds).toEqual({ Light: '#E53E3E', Dark: '#7955F6' });
  });

  it('preserves the actual custom backing and verifies text after compositing on it', () => {
    const accent = createAccent('blue', '#087BE9');
    for (const hex of ['#E53E3E', '#7955F6', '#777777']) {
      const context = generateContext(accent, 'Light', 'Standard', 'Custom', source, resolved, { Light: hex, Dark: hex }, rules, undefined, 'Custom', neutral);
      expect(context.bg).toEqual(fromHex(hex));
      expect(context.neutralContext?.references['surface/bg']).toBe('custom/light');
      expect(context.minimumText).toBeGreaterThanOrEqual(4.5);
      expect(context.checks.every(check => check.pass)).toBe(true);
      // Mid-tone authored backings can make the requested fill hierarchy impossible.
      // Keep that evidence visible while preserving the authored background.
      expect(context.issues.length).toBeGreaterThan(0);
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
  // runners take 10–16 seconds for the same six-hue/context search.
  }, 30000);
});
