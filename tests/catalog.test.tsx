import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Playground } from '../demo/Playground';
import { componentCatalog, catalogueComponentNames, resolveRoute } from '../demo/catalog';

describe('Isolated component catalogue', () => {
  it.each(catalogueComponentNames)('%s has a working dedicated route and initial story', name => {
    expect(resolveRoute(`#${name}`)).toBe(name);
    const Story = componentCatalog[name].render;
    const { container, unmount } = render(<Story notify={() => {}} />);
    expect(container.querySelector('[class^="cap-"], [class*=" cap-"], svg')).not.toBeNull();
    unmount();
    const playground=render(<Playground name={name} notify={()=>{}}/>);
    expect(playground.getByRole('group',{name:`Параметры ${name}`})).toBeInTheDocument();
    expect(playground.container.querySelector('.playground-preview')?.children.length).toBeGreaterThan(0);
  });
  it('keeps existing links usable and rejects malformed or inherited object keys', () => {
    for (const [hash, route] of Object.entries({ '#workbench': 'ActionBar', '#forms': 'Input', '#content-blocks': 'Calendar', '#overlays': 'Dialog', '#floating-field': 'Input', '#button': 'Button', '#%E0%A4%A': 'Button', '#constructor': 'Button', '#toString': 'Button', '#__proto__': 'Button', '#missing': 'Button' })) expect(resolveRoute(hash)).toBe(route);
  });
});
