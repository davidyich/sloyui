const {page: startPage, root: startRoot} = await ginit('00 · Start', 'Sloy UI · 0.17.0 · Start');
await gtext(startRoot, 'Sloy UI', 1264, 'title');
await gtext(startRoot, '0.17.0 · Tokens, components and workspace layouts', 1264, 'label', 'content/secondary/neutral');
const intro = await gcard(startRoot, 'Start with context', 1264);
await gtext(intro, 'Start with the frame. Let instances inherit.', 1216, 'title');
await gtext(intro, 'Choose Theme, Scheme, Surface and Accent on the containing frame. Keep child modes on Auto. Density, Radius and Borders stay independent.', 1040);
const map = await gsection(startRoot, 'Usage map', null);
for (const [name, purpose] of [
  ['01 · Colors', 'Pick semantic Surface roles. Compare Normal / Active and Light / Dark.'],
  ['02 · Controls', 'Use editable buttons, fields, selection controls, sliders and property rows.'],
  ['03 · Components', 'Compose with linked Tag, Card, EmptyState, NavItem and Alert instances.'],
  ['04 · Layouts', 'Start from project boards and settings in Light, Dark and local Invert.'],
  ['05 · Custom backgrounds', 'Declare exact Light / Dark backgrounds, regenerate, then apply a project export.']
]) {
  const row = gframe(map, name, 'HORIZONTAL', 1264); row.itemSpacing = 24;
  await gtext(row, name, 240, 'label'); await gtext(row, purpose, 1000, 'body', 'content/secondary/neutral');
}
const context = await gsection(startRoot, 'Context at a glance', null);
const contextRow = gframe(context, 'Surface example', 'HORIZONTAL', 1264); contextRow.itemSpacing = 24;
for (const [surface, label, body] of [
  ['Workspace', 'Workspace', 'Lists, sidebars and tools.'],
  ['Content', 'Content', 'Documents, editors and local blocks.'],
  ['Invert', 'Local Invert', 'Opposite local polarity. Theme stays Light.']
]) { const card = gcard(contextRow, label, 405, surface); await gtext(card, label, 357, 'label'); await gtext(card, body, 357, 'body', 'content/secondary/neutral'); await gsample(card, 'Project workspace', 'surface/secondary/blue-normal', 'content/primary/blue', 357); }
await glabel(startRoot, 'Neutral is the default accent. Blue · Green · Orange · Red · Pink · Purple. Color alpha belongs to paint; keep layer opacity at 100%.');
await glabel(startRoot, 'Design references are editable. Variant states describe appearance; interaction prototypes and release verification are recorded separately.');
return greport(startPage, startRoot, {versionLabel: '0.17.0', purpose: 'Usage map; no validation claims'});
