// Run with common.js. Neutral Outline/Ghost match web intent; no token mutations.
const parityControls = figma.root.children.find(p => p.name === '02 · Controls');
if (!parityControls) throw Error('Missing Controls page');
await figma.setCurrentPageAsync(parityControls);
const parityButtonSets = parityControls.findAllWithCriteria({types: ['COMPONENT_SET']}).filter(n => ['Button/Outline','Button/Ghost','IconButton/Ghost'].includes(n.name));
if (parityButtonSets.length !== 3) throw Error('Expected three Outline/Ghost sets');
const parityButtonTexts = parityButtonSets.flatMap(set => set.findAllWithCriteria({types: ['TEXT']}));
const parityButtonFonts = new Map(parityButtonTexts.flatMap(t => t.getStyledTextSegments(['fontName'])).map(s => [JSON.stringify(s.fontName),s.fontName]));
await Promise.all([...parityButtonFonts.values()].map(font => figma.loadFontAsync(font)));
const changedButtons = new Set();
const createdBorders = [];
for (const set of parityButtonSets) {
  const outline = set.name === 'Button/Outline';
  set.description = 'Neutral '+(outline?'Outline':'Ghost')+' button. Accent mode does not recolor the control. Maps to the same named neutral web variant. Editable slots and state variants are presentation, not prototype behavior.';
  changedButtons.add(set.id);
  for (const v of set.children) {
    const state = v.variantProperties.State;
    const ink = state === 'Disabled' ? 'content/disabled/neutral' : 'content/primary/neutral';
    if (state === 'Disabled') gfill(v, 'surface/disabled');
    else if (state === 'Hover' || state === 'Pressed' || state === 'Focus') gfill(v, 'surface/tertiary/neutral-active');
    else v.fills = [];
    const hadBorder = v.children.some(n => n.name === '.Border');
    const boundary = gstroke(v, outline ? 'border/strong' : 'border/neutral-normal');
    if (!hadBorder) createdBorders.push(boundary.id);
    changedButtons.add(boundary.id);
    changedButtons.add(v.id);
    for (const n of v.findAll(() => true)) {
      if (n.name === '.Border') continue;
      if (n.type === 'TEXT') { gfill(n, ink); changedButtons.add(n.id); }
      else if (['VECTOR','ELLIPSE','RECTANGLE','LINE','BOOLEAN_OPERATION'].includes(n.type)) {
        if ('strokes' in n && n.strokes.some(p => p.visible !== false)) { n.strokes = [gp(ink)]; changedButtons.add(n.id); }
        if ('fills' in n && n.fills !== figma.mixed && n.fills.some(p => p.visible !== false)) { n.fills = [gp(ink)]; changedButtons.add(n.id); }
      }
    }
  }
}
return {createdNodeIds: createdBorders, mutatedNodeIds: [...changedButtons], sets: parityButtonSets.map(n => ({id:n.id,name:n.name})), fix: 'Outline/Ghost stay neutral independently of inherited Accent; contours inherit Borders'};
