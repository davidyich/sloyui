// Run with common.js. Targeted post-build parity repair; never touches variables.
const parityPage = figma.root.children.find(p => p.name === '03 · Components');
if (!parityPage) throw Error('Missing Components page');
await figma.setCurrentPageAsync(parityPage);
const parityIds = new Set();
const tagSet = await figma.getNodeByIdAsync('163:7');
const emptySet = await figma.getNodeByIdAsync('163:26');
const cardSet = await figma.getNodeByIdAsync('163:14');
for (const [set, name] of [[tagSet,'Tag'],[emptySet,'EmptyState'],[cardSet,'Card']]) if (!set || set.type !== 'COMPONENT_SET' || set.name !== name) throw Error('Stale '+name+' set ID');
const parityTexts = [tagSet,emptySet,cardSet].flatMap(set => set.findAllWithCriteria({types: ['TEXT']}));
const parityFonts = new Map(parityTexts.flatMap(t => t.getStyledTextSegments(['fontName'])).map(s => [JSON.stringify(s.fontName),s.fontName]));
await Promise.all([...parityFonts.values()].map(font => figma.loadFontAsync(font)));
for (const variant of tagSet.children) {
  for (const text of variant.findAllWithCriteria({types: ['TEXT']})) {
    text.fontName = guideMedium;
    if (variant.variantProperties.Appearance === 'Plain') gfill(text, 'content/primary/neutral');
    parityIds.add(text.id);
  }
}
for (const variant of emptySet.children) {
  variant.counterAxisAlignItems = 'CENTER'; parityIds.add(variant.id);
  for (const text of variant.findAllWithCriteria({types: ['TEXT']})) {
    text.textAlignHorizontal = 'CENTER';
    if (text.componentPropertyReferences?.characters?.startsWith('Description#')) gfill(text, 'content/muted/neutral');
    parityIds.add(text.id);
  }
}
for (const variant of cardSet.children) { gradius(variant, 'xl'); parityIds.add(variant.id); }
tagSet.description = 'Static label recipe. Soft inherits Accent; Plain uses local neutral content without a resting fill. Appearance/State map to presentation, not prototype interactions.';
emptySet.description = 'Centered zero-state with optional icon omitted (web icon=false), editable title and description. Action slot may be composed outside this minimal recipe.';
cardSet.description = 'Composed Card recipe with editable Title, Description and Meta plus nested Tag. The web Card API is a neutral children container; pass this composition as children. Surface is inherited and Default paints block.';
for (const set of [tagSet,emptySet,cardSet]) parityIds.add(set.id);
return {createdNodeIds: [], mutatedNodeIds: [...parityIds], fixes: ['Plain Tag neutral ink and medium weight', 'Centered EmptyState and muted description', 'Card xl radius and honest recipe descriptions']};
