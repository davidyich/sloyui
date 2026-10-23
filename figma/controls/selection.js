for(const kind of SELECTION_KINDS){
 const name=kind;if(page.findOne(n=>n.type==='COMPONENT_SET'&&n.name===name))continue;
 const values=kind==='Checkbox'?['Off','On','Mixed']:['Off','On'];
 const {componentSet:set,variants}=await createComponentWithVariants({name,description:kind+' for parameter panels. Selection and State are native variants. The label is optional; the selected mark and fill inherit Accent mode. Default geometry is md.',variantAxes:{Value:values,State:states},baseProps:{width:160,height:32,fills:[],layoutMode:'HORIZONTAL'},page});
 const labelKey=prop(set,'Label','TEXT',kind==='Switch'?'Enable option':'Option');const showLabel=prop(set,'Show label','BOOLEAN',true);
 for(const c of variants){const {Value:value,State:state}=c.variantProperties;const selected=value!=='Off';const disabled=state==='Disabled';const s=stateName(state);c.primaryAxisSizingMode='AUTO';c.counterAxisSizingMode='FIXED';c.counterAxisAlignItems='CENTER';bind(c,'height','adaptive/control/height-md');gap(c);c.clipsContent=false;
 const track=frame('Control','HORIZONTAL');c.appendChild(track);track.resize(kind==='Switch'?42:18,kind==='Switch'?24:18);track.layoutSizingHorizontal='FIXED';track.layoutSizingVertical='FIXED';track.primaryAxisAlignItems=kind==='Switch'?(selected?'MAX':'MIN'):'CENTER';track.counterAxisAlignItems='CENTER';
 if(kind==='Switch'||kind==='Radio')bind(track,'cornerRadius','radius/pill','Primitives');else radius(track,'sm');
 if(disabled)fill(track,'surface/disabled');else if(selected)fill(track,'surface/primary-'+s,'Accent');else fill(track,'surface/secondary/neutral-'+(kind==='Switch'&&state==='Default'?'pressed':s));
 selectionBorder(track,selected,state);
 if(kind==='Switch'){
  track.paddingLeft=3;track.paddingRight=3;const thumb=figma.createEllipse();thumb.name='Thumb';thumb.resize(18,18);track.appendChild(thumb);fill(thumb,disabled?'content/disabled':selected?'on-primary':'content/primary',selected&&!disabled?'Accent':'Theme');
 }else if(kind==='Radio'){
  const dot=figma.createEllipse();dot.name='Mark';dot.resize(8,8);track.appendChild(dot);fill(dot,disabled?'content/disabled':'on-primary',disabled?'Theme':'Accent');dot.visible=selected;
 }else{
  const mark=icon(value==='Mixed'?'Minus':'Check');mark.name='Mark';track.appendChild(mark);mark.resize(13,13);recolorIcon(mark,disabled?'content/disabled':'on-primary',disabled?'Theme':'Accent');mark.visible=selected;
 }
 const label=await textNode(kind==='Switch'?'Enable option':'Option','Body',disabled?'content/disabled':'content/primary');label.name='Label';c.appendChild(label);label.componentPropertyReferences={characters:labelKey,visible:showLabel};
 }
 placeSet(set);createdRoots.push(set);
}
return report();
