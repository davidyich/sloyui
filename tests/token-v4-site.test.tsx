import { act, render, screen, within } from '@testing-library/react';
import Layers from '../demo/Layers';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeometryV4, TokenGraphInspector, TokenSystemV4 } from '../demo/TokenSystemV4';
import { defaultTokenModes, resolveTokenChain, resolveTokenValue, tokenGraph, tokenIndex } from '../demo/token-v4-data';

afterEach(() => { document.documentElement.removeAttribute('data-theme'); document.documentElement.removeAttribute('data-surface-scheme'); });

describe('v4 foundation graph', () => {
  it('resolves actual cross-collection aliases with the current theme and surface scheme', () => {
    expect(tokenIndex.size).toBe(tokenGraph.collections.reduce((sum,collection)=>sum+collection.variables.length,0));expect(tokenGraph.collections.find(c=>c.key==='Opacity')).toBeDefined();
    const light = resolveTokenChain('Theme/surface/bg');
    const dark = resolveTokenChain('Theme/surface/bg', { ...defaultTokenModes, Theme: 'Dark' });
    expect(light.map(node => node.collection.key)).toEqual(['Theme', 'SurfaceScheme', 'Surface', 'Palette']);
    expect(dark.map(node => node.collection.key)).toEqual(['Theme', 'SurfaceScheme', 'Surface', 'Palette']);
    const standard = resolveTokenValue('Theme/surface/bg', { ...defaultTokenModes, Theme: 'Dark', Surface: 'Content', SurfaceScheme: 'Dimmed' });
    const inverted = resolveTokenValue('Theme/surface/bg', { ...defaultTokenModes, Theme: 'Dark', Surface: 'Content', SurfaceScheme: 'Inverted' });
    expect(inverted).toEqual(standard);
    for (const theme of tokenGraph.axes.Theme.values) for (const surface of tokenGraph.axes.Surface.values) for (const scheme of tokenGraph.axes.SurfaceScheme.values) {
      for (const collection of tokenGraph.collections) for (const variable of collection.variables) expect(() => resolveTokenChain(`${collection.key}/${variable.name}`, { ...defaultTokenModes, Theme: theme, Surface: surface, SurfaceScheme: scheme })).not.toThrow();
    }
  });
  it('searches a token, copies its semantic name and follows theme changes', async () => {
    const user=userEvent.setup(),copy=vi.fn();
    const {container}=render(<TokenGraphInspector copy={copy}/>);
    const picker=screen.getByRole('combobox',{name:'Токен'});
    await user.type(picker,'surface/bg');
    await user.click(screen.getByRole('option',{name:/^surface\/bg$/}));
    expect(container.querySelector('[data-token-node]')).toHaveAttribute('data-token-node','Theme/surface/bg');
    await user.click(screen.getByRole('button',{name:'Копировать имя'}));
    expect(copy).toHaveBeenCalledWith('Theme/surface/bg');
    await user.click(screen.getByText('Режимы и источник'));
    expect(screen.getByRole('list',{name:'Цепочка алиасов'})).toHaveTextContent('Palette');
    await act(async()=>document.documentElement.setAttribute('data-theme','dark'));
    expect(container.querySelector('.cap-v4-context-line')).toHaveTextContent('Dark');
    await user.type(picker,'no-such-token');
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
    expect(container.querySelector('[data-token-node]')).toHaveAttribute('data-token-node','Theme/surface/bg');
  });
  it('opens the chosen collection from the graph overview', async () => {
    const user = userEvent.setup();
    const { container } = render(<TokenSystemV4 copy={() => {}}/>);
    await user.click(container.querySelector<HTMLButtonElement>('[data-collection="Density"]')!);
    expect(container.querySelector('[data-token-node]')).toHaveAttribute('data-token-node', 'Density/adaptive/padding/xs');
    await user.click(screen.getByText('Режимы и источник'));
    expect(screen.getByRole('list', { name: 'Цепочка алиасов' })).toHaveTextContent('Primitives');
  });
  it('keeps fixed touch geometry unchanged and separates Radius from Density', () => {
    expect(resolveTokenValue('Density/fixed/size/touch', { ...defaultTokenModes, Density: 'Compact' })).toBe(44);
    expect(resolveTokenValue('Density/adaptive/padding/md')).toBe(12);
    expect(resolveTokenValue('Density/adaptive/padding/md', { ...defaultTokenModes, Density: 'Compact' })).toBe(9);
    expect(resolveTokenValue('Radius/radius/base', { ...defaultTokenModes, Density: 'Compact' })).toBe(8);
    const { container } = render(<GeometryV4/>);
    expect(container.querySelector('[data-token="fixed/size/touch"]')?.textContent).toContain('44 px44 px');
    expect(container.querySelector('.cap-v4-geometry-sample')).toHaveAttribute('data-density', 'default');
  });
  it('applies independent local playground axes, preserves fixed geometry and saves the live example', async () => {
    const user = userEvent.setup();
    const { container } = render(<GeometryV4/>);
    const sample = container.querySelector('.cap-v4-geometry-sample')!;
    await user.click(within(screen.getByRole('radiogroup', { name: 'Плотность примера' })).getByRole('radio', { name: 'Compact' }));
    await user.click(within(screen.getByRole('radiogroup', { name: 'Скругления примера' })).getByRole('radio', { name: 'None' }));
    await user.click(screen.getByRole('radio', { name: 'LG' }));
    expect(sample).toHaveAttribute('data-density', 'compact');
    expect(sample).toHaveAttribute('data-radius', 'none');
    expect(container.querySelector('.cap-geometry-metrics')).toHaveTextContent('9 px');
    expect(container.querySelector('.cap-geometry-metrics')).toHaveTextContent('32 px');
    expect(container.querySelector('.cap-geometry-metrics')).toHaveTextContent('0 px');
    expect(container.querySelector('.cap-geometry-metrics')).toHaveTextContent('44 px');
    await user.click(screen.getByRole('switch', { name: 'Показать вложение' }));
    expect(screen.queryByText('research-notes.pdf')).toBeNull();
    await user.clear(screen.getByRole('textbox', { name: 'Название' }));
    expect(screen.getByRole('button', { name: 'Сохранить' })).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Новая коллекция');
    expect(screen.getByRole('heading', { name: 'Новая коллекция' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));
    expect(screen.getByRole('status')).toHaveTextContent('Изменения сохранены');
    await user.click(screen.getByRole('button', { name: 'Вернуть контекст каталога' }));
    expect(sample).toHaveAttribute('data-density', 'default');
    expect(sample).toHaveAttribute('data-radius', 'default');
  });
  it('opens Off and On dialogues from their own border scope while inheriting the other axes', async () => {
    const user = userEvent.setup();
    render(<div data-theme="dark" data-accent="violet" data-surface-scheme="inverted" data-density="compact" data-radius="rounded" data-borders="on"><Layers/></div>);
    for (const borders of ['off', 'on']) {
      await user.click(screen.getByRole('button', { name: `Открыть диалог · ${borders}` }));
      const dialog = screen.getByRole('dialog', { name: `Настройки представления · ${borders}` });
      const layer = dialog.closest('.cap-modal-layer');
      expect(layer).toHaveAttribute('data-borders', borders);
      expect(layer).toHaveAttribute('data-theme', 'dark');
      expect(layer).toHaveAttribute('data-accent', 'violet');
      expect(layer).toHaveAttribute('data-surface-scheme', 'inverted');
      expect(layer).toHaveAttribute('data-density', 'compact');
      expect(layer).toHaveAttribute('data-radius', 'rounded');
      expect(layer).toHaveAttribute('data-surface', 'floating');
      await user.click(within(dialog).getByRole('button', { name: 'Готово' }));
    }
  });

});
