// Apply with `node figma/controls/build.mjs fix-states` through use_figma.
// Existing component sets, variants, editable text and instance IDs are retained.
const sets=page.children.filter(n=>n.type==='COMPONENT_SET');
const updated=[],missing=[];const before=allIds(sets);
function restoreComponent(c){
 c.setBoundVariable('opacity',null);c.opacity=1;
 for(const n of c.findAll(n=>!n.id.startsWith('I')&&n.name!=='.Border')){
  if('opacity' in n){n.setBoundVariable('opacity',null);n.opacity=1;}
  if('strokes' in n&&n.strokes.some(p=>p.visible!==false)){n.setBoundVariable('strokeWeight',null);n.strokeWeight=0.5;n.strokeAlign='INSIDE';}
 }
}
function restoreContents(c,role,group='Theme'){
 for(const n of c.findAll(n=>!n.id.startsWith('I')&&(n.type==='TEXT'||n.type==='INSTANCE')))restoreInk(n,role,group);
}
for(const set of sets){
 const button=/^(Button|IconButton)\/(Primary|Secondary|Outline|Ghost|Danger)$/.exec(set.name);
 const field=/^(Input|Select|Textarea)\/(Outside|Inside)$/.exec(set.name);
 if(!button&&!field&&!['NumberField','ValueScrubber','Switch','Radio','Checkbox','Slider'].includes(set.name))continue;
 for(const c of set.children){
  const state=c.variantProperties.State,s=stateName(state),disabled=state==='Disabled';restoreComponent(c);
  if(button){
   const appearance=button[2];let bg,ink,group='Accent';
   if(disabled){bg='surface/disabled';ink='content/disabled';group='Theme';}
   else if(['Outline','Ghost'].includes(appearance)){bg='surface/tertiary/neutral-active';ink='content/primary';group='Theme';}
   else if(appearance==='Danger'){bg='surface/secondary/red-'+s;ink='content/red';group='Theme';}
   else{bg='surface/'+(appearance==='Primary'?'primary':'secondary')+'-'+s;ink=appearance==='Primary'?'on-primary':'content';}
   if(['Ghost','Outline'].includes(appearance)&&state==='Default')c.fills=[];else fill(c,bg,group);
   buttonBorder(c,appearance,state);
   restoreContents(c,ink,group);
   const label=c.children.find(n=>n.type==='TEXT'&&n.name==='Label');if(label)label.visible=true;
  }else if(field||['NumberField','ValueScrubber'].includes(set.name)){
   const control=c.children.find(n=>n.name==='Control');if(!control)throw Error('Missing Control in '+set.name+'/'+c.name);
   fill(control,disabled?'surface/disabled':'surface/secondary/neutral-'+s);
   border(control,state==='Error'?'content/red':'border/neutral-'+s);
   for(const n of c.findAll(n=>n.type==='TEXT'&&!n.id.startsWith('I'))){
    const role=disabled?'content/disabled':n.name==='Label'?'content/secondary':n.name==='Hint'?(state==='Error'?'content/red':'content/muted'):n.name==='Unit'?'content/muted':'content/primary';restoreInk(n,role);
   }
   for(const n of c.findAll(n=>n.type==='INSTANCE'&&!n.id.startsWith('I')))restoreInk(n,disabled?'content/disabled':'content/muted');
  }else if(set.name==='Slider'){
   await layoutParameterSlider(c);
  }else{
   const selected=c.variantProperties.Value!=='Off';const track=c.children.find(n=>n.name==='Control');if(!track)throw Error('Missing selection Control');
   if(disabled)fill(track,'surface/disabled');else if(selected)fill(track,'surface/primary-'+s,'Accent');else fill(track,'surface/secondary/neutral-'+(set.name==='Switch'&&state==='Default'?'pressed':s));
   selectionBorder(track,selected,state);
   for(const n of c.children.filter(n=>n.type==='TEXT'))restoreInk(n,disabled?'content/disabled':'content/primary');
   for(const n of track.children.filter(n=>['Thumb','Mark'].includes(n.name))){const role=disabled?'content/disabled':selected?'on-primary':'content/primary';if(n.type==='INSTANCE')restoreInk(n,role,selected&&!disabled?'Accent':'Theme');else fill(n,role,selected&&!disabled?'Accent':'Theme');}
  }
  updated.push(c.id);
 }
 if(set.name==='Slider'){set.description='Palette Lab ParameterSlider: a filled row with editable label at the start, value and unit at the end, and a slim handle at the fill boundary. Default value is 50; focus changes the handle ink without an outline.';const center=set.children.find(c=>c.variantProperties.Value==='50'&&c.variantProperties.State==='Default');if(center)set.insertChild(0,center);const order=['50','0','25','75','100'];for(const v of set.children){v.x=40+states.indexOf(v.variantProperties.State)*(v.width+32);v.y=40+order.indexOf(v.variantProperties.Value)*(v.height+32);}set.resizeWithoutConstraints(80+5*(set.children[0].width+32)-32,80+5*(set.children[0].height+32)-32);}
}
for(const name of ['Select/Outside','Select/Inside'])if(!sets.some(s=>s.name===name))missing.push(name);
const after=new Set(allIds(sets));const removed=before.filter(id=>!after.has(id));if(removed.length)throw Error('Unexpected removed node IDs: '+removed.join(','));
return {mutatedNodeIds:allIds(sets.filter(s=>s.children.some(c=>updated.includes(c.id)))),preservedNodeCount:before.length,removedNodeIds:removed,createdNodeIds:[...after].filter(id=>!before.includes(id)),missingSets:missing,sliderRecipe:'Palette Lab FillSlider / ParameterSlider',strokeWeight:0.5};
