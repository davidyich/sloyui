const {page: layoutPage, root: layoutRoot} = await ginit('04 · Layouts', 'Layouts · project board and settings');
await gtext(layoutRoot, 'Workspaces from linked instances', 1264, 'title');
await gtext(layoutRoot, 'Project board и Settings собраны из настоящих компонентов. Внешний фрейм задаёт Theme; боковая панель Light + Invert меняет только Surface. Карточки рисуют block и сохраняют контекст области.', 1120);
const screenModes = [{name: 'Light', theme: 'Light', sidebar: 'Workspace'}, {name: 'Dark', theme: 'Dark', sidebar: 'Workspace'}, {name: 'Light + Invert sidebar', theme: 'Light', sidebar: 'Invert'}];
async function sidebar(parent, surface) {
  const side = gcard(parent, 'Sidebar · ' + surface, 220, surface); side.layoutSizingVertical = 'FILL'; side.minHeight = 520;
  await gtext(side, 'Studio workspace', 172, 'label');
  await ginstance(side, 'NavItem', {Label: 'Projects'}, {State: 'Selected'});
  await ginstance(side, 'NavItem', {Label: 'Library'}, {State: 'Default'});
  await ginstance(side, 'NavItem', {Label: 'Team'}, {State: 'Default'});
  await ginstance(side, 'NavItem', {Label: 'Settings'}, {State: 'Default'});
  const note = gframe(side, 'Local block', 'VERTICAL', 172); gspace(note, 'sm'); gradius(note); gfill(note, 'surface/block');
  await gtext(note, 'Design system', 156, 'label');
  await gtext(note, 'Theme · Auto\nSurface · ' + surface, 156, 'caption', 'content/secondary/neutral');
  return side;
}
async function screen(title, config) {
  const section = await gsection(layoutRoot, title + ' · ' + config.name, null);
  const shell = gframe(section, title + ' / ' + config.name, 'HORIZONTAL', 1264); shell.itemSpacing = 0;
  shell.minHeight = 560; gmode(shell, 'Theme', config.theme); gmode(shell, 'Surface', 'Shell'); gfill(shell, 'surface/bg'); gradius(shell, 'lg'); gstroke(shell, 'border/subtle');
  await sidebar(shell, config.sidebar);
  const main = gcard(shell, title + ' content', 1044, 'Content'); main.layoutSizingHorizontal = 'FILL'; main.minHeight = 560;
  return {shell, main};
}
const taskData = [
  ['Plan', [['Palette audit', 'Check shared roles across the five surfaces.', 'Research', 'Purple'], ['Content taxonomy', 'Define a compact naming system for the library.', 'Planning', 'Blue']]],
  ['In progress', [['Control states', 'Review default, focus and disabled examples.', 'UI kit', 'Orange'], ['Custom backgrounds', 'Generate exact pairs for the project export.', 'Colors', 'Pink']]],
  ['Review', [['Documentation', 'Review practical recipes with the team.', 'Ready', 'Green']]]
];
for (const config of screenModes) {
  const {main} = await screen('Project board', config);
  const header = gframe(main, 'Board header', 'HORIZONTAL', 996); header.itemSpacing = 24; header.counterAxisAlignItems = 'CENTER';
  const heading = gframe(header, 'Heading', 'VERTICAL', 760); heading.itemSpacing = 8;
  await gtext(heading, 'Design system', 760, 'title');
  await gtext(heading, 'Five tasks · Shared team workspace', 760, 'body', 'content/secondary/neutral');
  const add = await ginstance(header, 'primaryButton', {Label: 'New task'}, {Size: 'md', State: 'Default'}); gmode(add, 'Accent', 'Blue');
  const columns = gframe(main, 'Board columns', 'HORIZONTAL', 996); columns.itemSpacing = 16; columns.counterAxisAlignItems = 'MIN';
  for (const [name, tasks] of taskData) {
    const column = gframe(columns, name, 'VERTICAL', 314); column.itemSpacing = 16;
    await gtext(column, name + ' · ' + tasks.length, 314, 'label');
    for (const [title, description, label, hue] of tasks) {
      const card = await ginstance(column, 'Card', {Title: title, Description: description, Meta: 'Today · Team'}, {Appearance: 'Default'}); gmode(card, 'Accent', hue);
      const tag = card.findOne(n => n.type === 'INSTANCE' && n.name === 'Status');
      if (tag) { const key = Object.keys(tag.componentProperties).find(key => key.startsWith('Label#')); if (key) tag.setProperties({[key]: label}); }
    }
  }
  await ginstance(main, 'Alert', {Title: 'Shared workspace', Message: 'Changes are saved in the project and ready for review.'}, {Tone: 'Info'});
}
for (const config of screenModes) {
  const {main} = await screen('Settings', config);
  await gtext(main, 'Workspace settings', 996, 'title');
  await gtext(main, 'Identity and notifications for your team.', 996, 'body', 'content/secondary/neutral');
  const fields = gframe(main, 'Editable workspace identity', 'HORIZONTAL', 996); fields.itemSpacing = 24;
  for (const [label, value] of [['Workspace name', 'Studio workspace'], ['Contact email', 'team@example.com']]) {
    const field = await ginstance(fields, 'input', {Label: label, Value: value, 'Show hint': false}, {Size: 'md', State: 'Default'}); field.resize(460, field.height);
  }
  const preferences = gcard(main, 'Notification preferences', 996);
  await gtext(preferences, 'Notifications', 948, 'label');
  for (const [label, description, selected] of [['Review requests', 'When a teammate needs your feedback.', true], ['Weekly digest', 'A summary of completed and upcoming work.', false]]) {
    const row = gframe(preferences, label, 'HORIZONTAL', 948); row.itemSpacing = 24; row.counterAxisAlignItems = 'CENTER';
    const copy = gframe(row, 'Preference text', 'VERTICAL', 800); copy.itemSpacing = 4;
    await gtext(copy, label, 800, 'label'); await gtext(copy, description, 800, 'body', 'content/secondary/neutral');
    const control = await ginstance(row, 'switch', {'Show label': false}, {Value: selected ? 'On' : 'Off', State: 'Default'}); gmode(control, 'Accent', 'Blue');
  }
  await ginstance(main, 'Alert', {Title: 'Saved on this workspace', Message: 'Notification preferences apply to your account.'}, {Tone: 'Neutral'});
  const footer = gframe(main, 'Settings actions', 'HORIZONTAL', 996); footer.itemSpacing = 12;
  const save = await ginstance(footer, 'primaryButton', {Label: 'Save changes'}, {Size: 'md', State: 'Default'}); gmode(save, 'Accent', 'Blue');
}
await glabel(layoutRoot, 'Примеры используют instances; текст и настройки можно менять в свойствах. Prototype-переходы и drag-and-drop здесь не настраиваются. Для фактического поведения используйте web API кита.');
return greport(layoutPage, layoutRoot, {layouts: ['Project board', 'Settings'], contexts: screenModes, instanceSources: {...guideComponentIds, ...guideControlIds}, status: 'Constructed; native render acceptance is a separate check'});
