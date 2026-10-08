import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const modules = ['overlays-v2','workbench','content','composition','code-block','rich-text-editor','comments','data-table','messages','feedback','bottom-sheet','file-tree','preview-rail','reorderable','charts'];

describe('Component radius context contract', () => {
  it.each(modules)('%s derives decorative radii from the local radius context', module => {
    const css = readFileSync(`src/styles/${module}.css`, 'utf8');
    for (const [, property, value] of css.matchAll(/(?:^|[;{])\s*(border-(?:radius|(?:start|end)-(?:start|end)-radius)|rx)\s*:\s*([^;}]+)/g)) {
      // Zero joins, inherited corners and explicit circles/pills have fixed geometry.
      if (/^(?:0|inherit|50%|9999?px)$/.test(value.trim())) continue;
      expect(value, `${module}: ${property}: ${value}`).toMatch(/var\(--cap-(?:(?:number-)?radius|tag-radius)/);
    }
  });
});
