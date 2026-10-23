// Append to figma-helpers.js; uses the existing editable nested specimen.
await figma.setCurrentPageAsync(await figma.getNodeByIdAsync('23:10'));
if(figma.currentPage.children.some(n=>n.name==='07 · Nested accents / Light / Standard'))return {existing:true};
const specimen=await figma.getNodeByIdAsync('60:2');
const startY=Math.max(...figma.currentPage.children.map(n=>n.y+n.height))+160;
const boards=[];
for(const [index,[theme,scheme]] of [['Light','Standard'],['Dark','Standard'],['Light','Dimmed'],['Dark','Dimmed']].entries()){
 const board=box(figma.currentPage,`${String(index+7).padStart(2,'0')} · Nested accents / ${theme} / ${scheme}`,2352,'VERTICAL',32,24,'surface/surface/bg');
 board.x=240+(index%2)*2512;board.y=startY+Math.floor(index/2)*1400;mode(board,'theme',theme);mode(board,'scheme',scheme);mode(board,'surface','Content');
 txt(board,'Sloy UI  /  Nested neutral surfaces','Label','surface/content/secondary');
 txt(board,`${theme} · ${scheme}  /  Accent layers`,'Display');
 txt(board,'The same Secondary / Tertiary accent fills on five actual backings. Each pair: normal on the left, active on the right.','Body','surface/content/secondary');
 const row=box(board,'Five surface contexts',2288,'HORIZONTAL',0,32);
 const instances=[];
 for(const sf of ['Shell','Workspace','Content','Overlay','Glass']){
  let parent=row;
  if(sf==='Glass'){parent=box(row,'Photographic backdrop / Glass',432,'VERTICAL',0,0);parent.fills=[{type:'IMAGE',imageHash:'a4ef60d415df03436059c637d20d74c39c721792',scaleMode:'FILL'}];rad(parent,'large');parent.clipsContent=true;}
  const inst=instance(parent,specimen,sf+' · nested accents');inst.setProperties({'Surface#60:0':sf});mode(inst,'surface',sf);if(sf==='Glass')glass(inst);instances.push(inst.id);
 }
 boards.push({id:board.id,name:board.name,x:board.x,y:board.y,width:board.width,height:board.height,instances});
}
figma.currentPage.selection=[await figma.getNodeByIdAsync(boards[0].id)];figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection);
return report({boards,instanceCount:20});
