// Concatenate this file with exactly one page script before use_figma.
// Uses native-graph.json figmaName paths; no collection or variable mutations.
const guideCreatedRoots = [];
const guideVariables = await figma.variables.getLocalVariablesAsync();
const guideCollections = await figma.variables.getLocalVariableCollectionsAsync();
const guideCollectionMap = new Map(guideCollections.map(c => [c.name, c]));
const guideVariableMap = new Map(guideVariables.map(v => [v.variableCollectionId + '|' + v.name, v]));
const guideFonts = await figma.listAvailableFontsAsync();
const guideInter = guideFonts.filter(f => f.fontName.family === 'Inter').map(f => f.fontName);
const guideRegular = guideInter.find(f => f.style === 'Regular');
const guideMedium = guideInter.find(f => f.style === 'Medium') || guideRegular;
if (!guideRegular) throw Error('Inter Regular is required');
await Promise.all([guideRegular, guideMedium].map(font => figma.loadFontAsync(font)));
function gv(group, name) {
  const col = guideCollectionMap.get('V2 · ' + group);
  const variable = col && guideVariableMap.get(col.id + '|' + name);
  if (!variable) throw Error('Missing native variable: ' + group + '/' + name);
  return variable;
}
function gp(name, group = 'Surface') {
  return figma.variables.setBoundVariableForPaint({type: 'SOLID', color: {r: 0, g: 0, b: 0}}, 'color', gv(group, name));
}
function gfill(node, name, group = 'Surface') { node.fills = [gp(name, group)]; node.opacity = 1; }
function gbind(node, field, name, group = 'Density') { node.setBoundVariable(field, gv(group, name)); }
function gmode(node, group, name) {
  const col = guideCollectionMap.get('V2 · ' + group);
  const mode = col?.modes.find(m => m.name === name);
  if (!mode) throw Error('Missing native mode: ' + group + '/' + name);
  node.setExplicitVariableModeForCollection(col, mode.modeId);
}
function gframe(parent, name, direction = 'VERTICAL', width) {
  const node = figma.createAutoLayout(direction);
  node.name = name; node.fills = []; node.clipsContent = false;
  parent.appendChild(node);
  if (width) node.resize(width, 10);
  node.primaryAxisSizingMode = width && direction === 'HORIZONTAL' ? 'FIXED' : 'AUTO';
  node.counterAxisSizingMode = width && direction === 'VERTICAL' ? 'FIXED' : 'AUTO';
  node.layoutSizingVertical = 'HUG';
  if (width) node.layoutSizingHorizontal = 'FIXED';
  node.opacity = 1;
  return node;
}
function gspace(node, size = 'md', gap = 'stack-md') {
  for (const edge of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) gbind(node, edge, 'adaptive/padding/' + size);
  gbind(node, 'itemSpacing', 'adaptive/gap/' + gap);
}
function gradius(node, role = 'md') { gbind(node, 'cornerRadius', 'radius/' + role, 'Radius'); }
function gstroke(node, name = 'border/default') { node.strokes = [gp(name)]; node.strokeWeight = 1; node.strokeAlign = 'INSIDE'; }
async function gtext(parent, value, width, kind = 'body', role = 'content/primary/neutral') {
  const node = figma.createText(); node.fontName = kind === 'label' || kind === 'title' ? guideMedium : guideRegular;
  node.characters = value; node.name = value.slice(0, 96);
  const typography = kind === 'title' ? 'title' : kind === 'label' ? 'label' : kind === 'caption' ? 'caption' : 'body';
  gbind(node, 'fontSize', 'font/size/' + typography, 'Primitives');
  gbind(node, 'lineHeight', 'font/line-height/' + typography, 'Primitives');
  parent.appendChild(node); node.textAutoResize = 'HEIGHT'; node.resize(width, node.height);
  node.layoutSizingHorizontal = 'FIXED'; node.layoutSizingVertical = 'HUG';
  gfill(node, role);
  return node;
}
async function gsection(parent, title, subtitle, width = 1264) {
  const section = gframe(parent, title, 'VERTICAL', width);
  gbind(section, 'itemSpacing', 'adaptive/gap/stack-md');
  await gtext(section, title, width, 'label');
  if (subtitle) await gtext(section, subtitle, width, 'body', 'content/secondary/neutral');
  return section;
}
function gcard(parent, name, width, surface) {
  const card = gframe(parent, name, 'VERTICAL', width); gspace(card, 'lg'); gradius(card, 'lg');
  if (surface) { gmode(card, 'Surface', surface); gfill(card, 'surface/bg'); }
  else gfill(card, 'surface/block');
  gstroke(card, 'border/subtle');
  return card;
}
async function ginit(pageName, rootName) {
  const page = figma.root.children.find(p => p.name === pageName);
  if (!page) throw Error('Missing guide page: ' + pageName);
  await figma.setCurrentPageAsync(page); // exactly one switch per call
  if (page.children.some(n => n.name === rootName)) throw Error('Guide already exists; inspect its ID before retrying');
  const root = gframe(page, rootName, 'VERTICAL', 1360);
  root.x = page.children.filter(n => n.id !== root.id).reduce((x, n) => Math.max(x, n.x + n.width + 100), 80); root.y = 80;
  root.paddingTop = root.paddingRight = root.paddingBottom = root.paddingLeft = 48; root.itemSpacing = 40;
  gmode(root, 'Theme', 'Light'); gmode(root, 'Scheme', 'Standard'); gmode(root, 'Surface', 'Content');
  gmode(root, 'Accent', 'Neutral'); gmode(root, 'Density', 'Default'); gmode(root, 'Radius', 'Default'); gmode(root, 'Borders', 'Off');
  gfill(root, 'surface/bg'); guideCreatedRoots.push(root);
  return {page, root};
}
async function gsample(parent, name, fillRole, textRole, width = 150) {
  const sample = gframe(parent, name, 'VERTICAL', width); gspace(sample, 'md', 'stack-sm'); gradius(sample);
  gfill(sample, fillRole);
  await gtext(sample, name, width - 24, 'label', textRole);
  return sample;
}
async function glabel(parent, label, width = 1264) { return gtext(parent, label, width, 'caption', 'content/secondary/neutral'); }
function greport(page, root, extra = {}) {
  const roots = [...new Set([root, ...guideCreatedRoots])];
  const nodes = [...new Map(roots.flatMap(n => [n, ...n.findAll(() => true)]).map(n => [n.id, n])).values()];
  return {createdNodeIds: nodes.map(n => n.id), mutatedNodeIds: [page.id], root: {id: root.id, name: root.name, width: root.width, height: root.height}, ...extra};
}

// The coordinator fills this map with read-back IDs after controls are built.
const guideControlIds = {};
async function gbutton(parent, label, accent = 'Blue') {
  if (!guideControlIds.primaryButton) return null;
  const set = await figma.getNodeByIdAsync(guideControlIds.primaryButton);
  if (!set || set.type !== 'COMPONENT_SET') throw Error('Primary Button set ID is stale');
  const component = set.children.find(c => c.type === 'COMPONENT' && c.variantProperties?.Size === 'md' && c.variantProperties?.State === 'Default') || set.defaultVariant;
  const instance = component.createInstance(); instance.name = label; parent.appendChild(instance);
  const key = Object.keys(set.componentPropertyDefinitions).find(key => key.startsWith('Label#'));
  if (key) instance.setProperties({[key]: label});
  gmode(parent, 'Accent', accent);
  return instance;
}

const guideComponentIds = {};
async function ginstance(parent, key, properties = {}, variants = {}) {
  const id = guideComponentIds[key] || guideControlIds[key];
  if (!id) throw Error('Missing read-back component ID: ' + key);
  const owner = await figma.getNodeByIdAsync(id);
  if (!owner || !['COMPONENT_SET', 'COMPONENT'].includes(owner.type)) throw Error('Stale component ID: ' + key);
  const component = owner.type === 'COMPONENT_SET' ? owner.children.find(c => c.type === 'COMPONENT' && Object.entries(variants).every(([k,v]) => c.variantProperties?.[k] === v)) || owner.defaultVariant : owner;
  const instance = component.createInstance(); instance.name = key; parent.appendChild(instance);
  const definitions = owner.componentPropertyDefinitions;
  const updates = {};
  for (const [name, value] of Object.entries(properties)) {
    const fullKey = Object.keys(definitions).find(key => key === name || key.startsWith(name + '#'));
    if (fullKey) updates[fullKey] = value;
  }
  if (Object.keys(updates).length) instance.setProperties(updates);
  return instance;
}
