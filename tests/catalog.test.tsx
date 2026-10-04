import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { componentCatalog, componentNames, resolveRoute } from '../demo/catalog';

describe('Isolated component catalogue', () => {
  it.each(componentNames)('%s has a working dedicated route and initial story', name => {
    expect(resolveRoute(`#${name}`)).toBe(name);
    const Story = componentCatalog[name].render;
    const { container } = render(<Story notify={() => {}} />);
    expect(container.querySelector('[class^="cap-"], [class*=" cap-"], svg')).not.toBeNull();
  });
  it('keeps existing links usable and rejects malformed or inherited object keys', () => {
    for (const [hash, route] of Object.entries({ '#workbench': 'ActionBar', '#forms': 'Input', '#content-blocks': 'Calendar', '#overlays': 'Dialog', '#floating-field': 'FloatingField', '#button': 'Button', '#%E0%A4%A': 'Button', '#constructor': 'Button', '#toString': 'Button', '#__proto__': 'Button', '#missing': 'Button' })) expect(resolveRoute(hash)).toBe(route);
  });
});
