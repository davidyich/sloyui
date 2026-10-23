// Run with common.js. Fix the six layout shells' 2 px structural-border overflow.
const parityLayoutPage = figma.root.children.find(p => p.name === '04 · Layouts');
if (!parityLayoutPage) throw Error('Missing Layouts page');
await figma.setCurrentPageAsync(parityLayoutPage);
const parityLayoutRoot = await figma.getNodeByIdAsync('164:2');
if (!parityLayoutRoot || parityLayoutRoot.type !== 'FRAME') throw Error('Stale Layouts root');
const shells = parityLayoutRoot.findAll(n => n.type === 'FRAME' && /^(Project board|Settings) \/ /.test(n.name));
if (shells.length !== 6) throw Error('Expected six screen shells');
const changedLayouts = [];
for (const shell of shells) {
  const main = shell.children.find(n => n.type === 'FRAME' && / content$/.test(n.name));
  if (!main) throw Error('Missing screen content: ' + shell.name);
  shell.resize(1264, shell.height); shell.primaryAxisSizingMode = 'FIXED'; shell.layoutSizingHorizontal = 'FIXED'; shell.layoutSizingVertical = 'HUG';
  main.layoutSizingHorizontal = 'FILL'; changedLayouts.push(shell.id, main.id);
}
return {createdNodeIds: [], mutatedNodeIds: changedLayouts, screens: shells.map(n => ({id:n.id,name:n.name,width:n.width,children:n.children.map(c=>({id:c.id,name:c.name,width:c.width}))})), fix:'Fixed screen width with filling main content accounts for structural borders'};
