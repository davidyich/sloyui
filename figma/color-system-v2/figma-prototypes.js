await figma.setCurrentPageAsync(await figma.getNodeByIdAsync('23:11'));
if(figma.currentPage.children.some(n=>n.name==='01 · Workspace / Light Standard'))return {existing:true,roots:figma.currentPage.children.map(n=>({id:n.id,name:n.name}))};
const workspace=await figma.getNodeByIdAsync('29:2'),commerce=await figma.getNodeByIdAsync('30:2'),material=await figma.getNodeByIdAsync('30:108');
const boards=[];
function review(name,x,y,theme,scheme,component,caption){
 const board=box(figma.currentPage,name,1344,'VERTICAL',32,20,'surface/surface/bg');board.x=x;board.y=y;mode(board,'theme',theme);mode(board,'scheme',scheme);mode(board,'surface','Content');
 txt(board,name,'Heading');txt(board,caption,'Body','surface/content/secondary',1280);
 const inst=instance(board,component,'Editable reference prototype');
 boards.push({id:board.id,name:board.name,instanceId:inst.id,width:board.width,height:board.height});return board;
}
for(const [index,[theme,scheme]] of [['Light','Standard'],['Dark','Standard'],['Light','Dimmed'],['Dark','Dimmed']].entries())review(`${String(index+1).padStart(2,'0')} · Workspace / ${theme} ${scheme}`,240+(index%2)*1480,240+Math.floor(index/2)*1240,theme,scheme,workspace,'Shell → Workspace → Content, with Overlay and Glass. Inspired by Ace Studio, Synara, Linear and the supplied nested-surface prototype.');
review('05 · Mixed shell / Commerce',240,2760,'Light','Standard',commerce,'Black navigation around a white working document. The inverted citation has a local Dark context; the assistant remains Light.');
review('06 · Glass workspace / Light',1720,2760,'Light','Standard',material,'Translucent command palette and assistant. Inspired by Raycast, Synara and the airy assistant reference; every panel is editable.');
review('07 · Glass workspace / Dark',3200,2760,'Dark','Dimmed',material,'The same Glass composition in Dark. Neutral and tinted alpha fills adapt together; stable colors retain their literal meaning.');
return report({boards});
