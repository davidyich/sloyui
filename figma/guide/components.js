const {page: componentPage, root: componentRoot} = await ginit('03 · Components', 'Components · instance showcase');
const kitSets = {};
function cprop(set, name, value) { return set.addComponentProperty(name, 'TEXT', value); }
function ctextProp(node, key) { node.componentPropertyReferences = {characters: key}; }
async function cset(name, axes, width, build) {
  if (componentPage.children.some(n => n.type === 'COMPONENT_SET' && n.name === name)) throw Error('Component set already exists: ' + name);
  const {componentSet: set, variants} = await createComponentWithVariants({name, description: name + ' · editable composition primitive bound to the native Surface graph. Theme, Surface and Accent inherit from its containing frame.', variantAxes: axes, baseProps: {width, height: 32, fills: [], layoutMode: 'VERTICAL'}, page: componentPage});
  guideCreatedRoots.push(set);
  for (const variant of variants) { variant.primaryAxisSizingMode = 'AUTO'; variant.counterAxisSizingMode = 'FIXED'; variant.clipsContent = false; variant.opacity = 1; }
  await build(set, variants);
  for (const variant of variants) if (!variant.children.some(n => n.name === ".Border")) gstroke(variant, "border/subtle");
  let y = 32; let maxWidth = 0;
  for (const variant of variants) { variant.x = 32; variant.y = y; y += variant.height + 24; maxWidth = Math.max(maxWidth, variant.width); }
  set.resizeWithoutConstraints(maxWidth + 64, y + 8); set.fills = []; set.clipsContent = false;
  set.x = 1600 + Object.keys(kitSets).length * 480; set.y = 80;
  kitSets[name] = set; guideComponentIds[name] = set.id;
  return set;
}
await cset('Tag', {Appearance: ['Soft', 'Plain'], State: ['Default', 'Active']}, 120, async (set, variants) => {
  const label = cprop(set, 'Label', 'Research');
  for (const v of variants) {
    v.layoutMode = 'HORIZONTAL'; v.primaryAxisSizingMode = 'AUTO'; v.counterAxisSizingMode = 'AUTO'; v.counterAxisAlignItems = 'CENTER';
    for (const edge of ['paddingLeft', 'paddingRight']) gbind(v, edge, 'fixed/space/8');
    for (const edge of ['paddingTop', 'paddingBottom']) gbind(v, edge, 'fixed/space/4');
    gradius(v, 'sm');
    if (v.variantProperties.Appearance === 'Soft') gfill(v, 'surface/secondary-' + (v.variantProperties.State === 'Active' ? 'hover' : 'normal'), 'Accent');
    const t = await gtext(v, 'Research', 88, 'caption'); t.textAutoResize = 'WIDTH_AND_HEIGHT'; t.layoutSizingHorizontal = 'HUG'; t.fontName = guideMedium; if (v.variantProperties.Appearance === 'Plain') gfill(t, 'content/primary/neutral'); else gfill(t, 'content', 'Accent'); ctextProp(t, label);
  }
});
await cset('Card', {Appearance: ['Default', 'Subtle']}, 286, async (set, variants) => {
  const title = cprop(set, 'Title', 'Palette guidelines'); const description = cprop(set, 'Description', 'Define roles and review examples.'); const meta = cprop(set, 'Meta', 'Updated today');
  for (const v of variants) {
    v.counterAxisAlignItems = 'MIN'; gspace(v, 'lg', 'stack-md'); gradius(v, 'xl'); gfill(v, v.variantProperties.Appearance === 'Subtle' ? 'surface/bg' : 'surface/block'); gstroke(v, 'border/subtle');
    ctextProp(await gtext(v, 'Palette guidelines', 238, 'label'), title);
    ctextProp(await gtext(v, 'Define roles and review examples.', 238, 'body', 'content/secondary/neutral'), description);
    const tag = await ginstance(v, 'Tag', {Label: 'Research'}, {Appearance: 'Soft', State: 'Default'}); tag.name = 'Status';
    ctextProp(await gtext(v, 'Updated today', 238, 'caption', 'content/secondary/neutral'), meta);
  }
});
await cset('EmptyState', {Appearance: ['Default']}, 286, async (set, variants) => {
  const title = cprop(set, 'Title', 'No archived projects'); const description = cprop(set, 'Description', 'Completed projects will appear here.');
  for (const v of variants) {
    gspace(v, 'lg', 'stack-md'); gradius(v); gfill(v, 'surface/bg'); v.counterAxisAlignItems = 'CENTER';
    const heading = await gtext(v, 'No archived projects', 238, 'label'); heading.textAlignHorizontal = 'CENTER'; ctextProp(heading, title);
    const body = await gtext(v, 'Completed projects will appear here.', 238, 'body', 'content/muted/neutral'); body.textAlignHorizontal = 'CENTER'; ctextProp(body, description);
  }
});
await cset('NavItem', {State: ['Default', 'Hover', 'Selected', 'Disabled']}, 180, async (set, variants) => {
  const label = cprop(set, 'Label', 'Projects');
  for (const v of variants) {
    v.layoutMode = 'HORIZONTAL'; v.counterAxisAlignItems = 'CENTER';
    for (const edge of ['paddingLeft', 'paddingRight']) gbind(v, edge, 'adaptive/control/padding-x-md');
    for (const edge of ['paddingTop', 'paddingBottom']) gbind(v, edge, 'adaptive/control/padding-y-md');
    gradius(v); const state = v.variantProperties.State;
    if (state === 'Selected' || state === 'Hover') gfill(v, 'surface/secondary/neutral-' + (state === 'Selected' ? 'active' : 'normal'));
    ctextProp(await gtext(v, 'Projects', 148, 'body', state === 'Disabled' ? 'content/disabled/neutral' : 'content/primary/neutral'), label);
  }
});
await cset('Alert', {Tone: ['Neutral', 'Info', 'Success', 'Warning', 'Danger']}, 920, async (set, variants) => {
  const title = cprop(set, 'Title', 'Workspace changes saved'); const message = cprop(set, 'Message', 'Your team can continue from the latest version.');
  const hueForTone = {Neutral: 'neutral', Info: 'blue', Success: 'green', Warning: 'orange', Danger: 'red'};
  for (const v of variants) {
    gspace(v, 'lg', 'stack-sm'); gradius(v); gfill(v, 'surface/tertiary/neutral-normal');
    const header = gframe(v, 'Status and title', 'HORIZONTAL', 872); header.itemSpacing = 8; header.counterAxisAlignItems = 'CENTER';
    const dot = figma.createEllipse(); header.appendChild(dot); dot.name = 'Status indicator'; dot.resize(8,8); gfill(dot, 'content/primary/' + hueForTone[v.variantProperties.Tone]);
    ctextProp(await gtext(header, 'Workspace changes saved', 850, 'label'), title);
    ctextProp(await gtext(v, 'Your team can continue from the latest version.', 872, 'body', 'content/secondary/neutral'), message);
  }
});
await gtext(componentRoot, 'Composition primitives', 1264, 'title');
await gtext(componentRoot, 'Редактируемые мастер-компоненты для сборки макетов. Они используют текущие Surface/Accent роли и наследуют контекст. Рабочие варианты контролов находятся на странице Controls.', 1120);
for (const theme of ['Light', 'Dark']) {
  const section = await gsection(componentRoot, 'Theme · ' + theme, null);
  const panel = gcard(section, theme + ' components', 1264, 'Content'); gmode(panel, 'Theme', theme); gmode(panel, 'Accent', 'Blue');
  const row = gframe(panel, 'Cards and empty state', 'HORIZONTAL', 1216); row.itemSpacing = 24;
  await ginstance(row, 'Card', {Title: 'Design system', Description: 'Review color roles and components.', Meta: '8 tasks · Updated today'});
  await ginstance(row, 'EmptyState');
  const nav = gcard(row, 'Navigation example', 240, 'Workspace');
  await ginstance(nav, 'NavItem', {Label: 'Projects'}, {State: 'Selected'});
  await ginstance(nav, 'NavItem', {Label: 'Library'}, {State: 'Default'});
  await ginstance(nav, 'Tag', {Label: 'Team workspace'}, {Appearance: 'Soft', State: 'Default'});
  await ginstance(panel, 'Alert', {Title: 'Changes saved', Message: 'Your workspace is up to date.'}, {Tone: 'Success'});
}
await glabel(componentRoot, 'Card сохраняет Surface родителя и рисует block. EmptyState может обходиться без декоративной иконки. Alert сохраняет нейтральную оболочку; статус окрашивает только индикатор.');
return greport(componentPage, componentRoot, {componentSets: Object.fromEntries(Object.entries(kitSets).map(([name, set]) => [name, {id: set.id, variants: set.children.length, properties: Object.keys(set.componentPropertyDefinitions)}])), status: 'Constructed; native render acceptance is a separate check'});
