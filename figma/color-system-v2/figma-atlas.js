await figma.setCurrentPageAsync(await figma.getNodeByIdAsync('23:10'));
if(figma.currentPage.children.some(n=>n.name==='01 · Light / Standard'))return {existing:true,roots:figma.currentPage.children.map(n=>({id:n.id,name:n.name}))};
const specimen=await figma.getNodeByIdAsync('27:9');
const boards=[];
for(const [index,[theme,scheme]] of [['Light','Standard'],['Dark','Standard'],['Light','Dimmed'],['Dark','Dimmed']].entries()){
 const board=box(figma.currentPage,`${String(index+1).padStart(2,'0')} · ${theme} / ${scheme}`,2352,'VERTICAL',32,24,'surface/surface/bg');
 board.x=240+(index%2)*2512;board.y=240+Math.floor(index/2)*1400;mode(board,'theme',theme);mode(board,'scheme',scheme);mode(board,'surface','Content');
 txt(board,'Sloy UI  /  Contextual color','Label','surface/content/secondary');
 txt(board,`${theme} · ${scheme}`,'Display');
 txt(board,scheme==='Standard'?'Five contexts, one set of roles. Backgrounds, fills and content change together.':'The same instances in Dimmed. Dark layers become deeper toward Content; Overlay stays lifted.','Body','surface/content/secondary');
 const row=box(board,'Five surface contexts',2288,'HORIZONTAL',0,32);
 for(const sf of ['Shell','Workspace','Content','Overlay','Glass']){
  let parent=row;
  if(sf==='Glass'){parent=box(row,'Photographic backdrop / Glass',432,'VERTICAL',0,0);parent.fills=[{type:'IMAGE',imageHash:'a4ef60d415df03436059c637d20d74c39c721792',scaleMode:'FILL'}];rad(parent,'large');parent.clipsContent=true;}
  const inst=instance(parent,specimen,sf+' · contextual specimen');inst.setProperties({'Surface#27:0':sf});mode(inst,'surface',sf);if(sf==='Glass')glass(inst);
 }
 boards.push({id:board.id,name:board.name,width:board.width,height:board.height});
}
const alphaBoard=box(figma.currentPage,'05 · Adaptive & stable alpha',2352,'VERTICAL',32,24,'surface/surface/bg');alphaBoard.x=240;alphaBoard.y=3100;mode(alphaBoard,'theme','Light');mode(alphaBoard,'surface','Content');
txt(alphaBoard,'Alpha is a material, not another theme','Title');
txt(alphaBoard,'20 opacity steps · 3 / 5 / 8 / 10 / 12 / 15 / 16 / 20 / 24 / 30 / 32 / 40 / 48 / 60 / 64 / 72 / 80 / 88 / 92 / 96%','Body','surface/content/secondary');
const alphaColumns=box(alphaBoard,'Light and Dark alpha',2288,'HORIZONTAL',0,24);
for(const theme of ['Light','Dark']){
 const card=box(alphaColumns,theme,1132,'VERTICAL',24,20,'surface/surface/bg');mode(card,'theme',theme);mode(card,'surface','Workspace');rad(card,'large');
 txt(card,theme,'Heading');
 for(const [name,token,background] of [['Adaptive · Ink','alpha/adaptive/ink',theme==='Light'?'white':'black'],['Adaptive · Canvas','alpha/adaptive/canvas',theme==='Light'?'black':'white'],['Stable · Black','alpha/stable/black','white'],['Stable · White','alpha/stable/white','black']]){
  const group=box(card,name,1084,'VERTICAL',0,8);txt(group,name,'Label','surface/content/secondary');
  const row=box(group,'20 alpha steps',1084,'HORIZONTAL',0,8);
  for(const opacity of [3,5,8,10,12,15,16,20,24,30,32,40,48,60,64,72,80,88,92,96]){
   const tile=box(row,opacity+'%',46,'VERTICAL',0,4);
   const bg=box(tile,'Contrast backing',46,'VERTICAL',0,0,'surface/stable/'+background,32);rad(bg,'small');
   const swatch=box(bg,token+'/'+opacity,46,'VERTICAL',0,0,'surface/'+token+'/'+opacity,32);rad(swatch,'small');
   txt(tile,String(opacity),'Caption','surface/content/secondary');
  }
 }
}
txt(alphaBoard,'Ink = black in Light, white in Dark. Canvas = the opposite. Stable white / black never follow any context.','Body','surface/content/secondary');
boards.push({id:alphaBoard.id,name:alphaBoard.name,width:alphaBoard.width,height:alphaBoard.height});
return report({boards,instanceCount:20});
