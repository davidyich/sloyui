import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { EnvironmentControls } from '../figma/color-system-v2/editor/EnvironmentControls';
import { createAccent, createNeutralSystem, defaultRules, schema, validateProject } from '../figma/color-system-v2/editor/model.mjs';

it('edits exact Custom HEX values through kit pickers and retains both themes after project reload', async () => {
  const user = userEvent.setup(), editNeutrals = vi.fn();
  const neutral = createNeutralSystem();
  let saved = JSON.stringify({ schema, accents: [createAccent('blue', '#087BE9')], backgrounds: { Light: '#F1EEF8', Dark: '#221D2C' }, rules: defaultRules, neutral });
  function ProjectControls() {
    const [project, setProject] = useState(() => validateProject(JSON.parse(saved)));
    return <EnvironmentControls surface="Custom" onSurface={() => {}} themes="Light" onThemes={() => {}} scheme="Standard" onScheme={() => {}} density="default" onDensity={() => {}} radius="default" onRadius={() => {}} borders="off" onBorders={() => {}} onEditNeutrals={editNeutrals} backgrounds={project.backgrounds} onBackground={(theme, value) => setProject(previous => {
      const next = { ...previous, backgrounds: { ...previous.backgrounds, [theme]: value } };
      saved = JSON.stringify(next);
      return next;
    })}/>;
  }
  const first = render(<ProjectControls/>);
  await user.click(screen.getByRole('button', { name: 'Настройки среды' }));
  for (const [theme, hex] of [['Light', '#E53E3E'], ['Dark', '#7955F6']]) {
    await user.click(screen.getByRole('button', { name: `Фон ${theme}` }));
    const picker = screen.getByRole('dialog', { name: `Фон ${theme}: цвет` });
    const input = within(picker).getByRole('textbox', { name: `Фон ${theme}, формат HEX` });
    await user.clear(input);
    await user.type(input, hex);
    await user.keyboard('{Enter}');
    await user.click(within(picker).getByRole('button', { name: 'Готово' }));
  }
  const restored = validateProject(JSON.parse(saved));
  expect(restored.backgrounds).toEqual({ Light: '#E53E3E', Dark: '#7955F6' });
  expect(restored.neutral.settings).toEqual(neutral.settings);
  expect(editNeutrals).not.toHaveBeenCalled();
  first.unmount();
  render(<ProjectControls/>);
  await user.click(screen.getByRole('button', { name: 'Настройки среды' }));
  expect(screen.getByRole('button', { name: 'Фон Light' })).toHaveTextContent('#E53E3E');
  expect(screen.getByRole('button', { name: 'Фон Dark' })).toHaveTextContent('#7955F6');
});
