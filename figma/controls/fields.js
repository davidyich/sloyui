for(const kind of FIELD_KINDS)for(const placement of ['Outside','Inside']){
 const name=kind+'/'+placement;if(page.findOne(n=>n.type==='COMPONENT_SET'&&n.name===name))continue;
 const {componentSet:set,variants}=await createComponentWithVariants({name,description:kind+' with editable label, value, helper text and icon slots. Width follows the parent. Theme, Accent, Density, Radius and Borders inherit independently. Error uses the fixed red status color.',variantAxes:{Size:sizes,State:[...states,'Error']},baseProps:{width:280,height:96,fills:[],layoutMode:'VERTICAL'},page});
 const key={label:prop(set,'Label','TEXT',kind==='Select'?'Category':kind==='Textarea'?'Description':'Name'),value:prop(set,'Value','TEXT',kind==='Select'?'Select an option':kind==='Textarea'?'Write a description…':'Enter a value…'),hint:prop(set,'Hint','TEXT','Supporting text'),showLabel:prop(set,'Show label','BOOLEAN',true),showHint:prop(set,'Show hint','BOOLEAN',true)};
 if(kind==='Input'){key.leading=prop(set,'Leading icon','INSTANCE_SWAP',page.findOne(n=>n.type==='COMPONENT'&&n.name==='.Icons/Search').id);key.showLeading=prop(set,'Show leading icon','BOOLEAN',false);key.trailing=prop(set,'Trailing icon','INSTANCE_SWAP',page.findOne(n=>n.type==='COMPONENT'&&n.name==='.Icons/X').id);key.showTrailing=prop(set,'Show trailing icon','BOOLEAN',false);}
 for(const c of variants){const {Size:size,State:state}=c.variantProperties;c.counterAxisSizingMode='FIXED';c.primaryAxisSizingMode='AUTO';c.counterAxisAlignItems='MIN';gap(c,'stack-sm');c.clipsContent=false;
 const ink=state==='Disabled'?'content/disabled':'content/primary';const s=stateName(state);
 const label=await textNode(kind==='Select'?'Category':kind==='Textarea'?'Description':'Name',placement==='Inside'?'Caption':'Label',state==='Disabled'?'content/disabled':'content/secondary');label.name='Label';
 const control=frame('Control',kind==='Textarea'?'VERTICAL':'HORIZONTAL');control.resize(280,32);c.appendChild(control);control.layoutSizingHorizontal='FILL';control.layoutSizingVertical='FIXED';control.counterAxisAlignItems=kind==='Textarea'?'MIN':'CENTER';control.primaryAxisAlignItems='MIN';geometry(control,size);fill(control,state==='Disabled'?'surface/disabled':'surface/secondary/neutral-'+s);border(control,'border/neutral-'+s);
 if(state==='Error'){border(control,'content/red');}
 let valueParent=control;
 if(placement==='Outside'){c.insertChild(0,label);}else{const stack=frame('Label and value');control.appendChild(stack);stack.layoutSizingHorizontal='FILL';stack.itemSpacing=2;stack.appendChild(label);valueParent=stack;control.setBoundVariable('height',null);control.resize(280,{sm:44,md:52,lg:56,xl:64}[size]);}
 label.componentPropertyReferences={characters:key.label,visible:key.showLabel};
 if(kind==='Input'){
  const leading=icon('Search');control.insertChild(0,leading);leading.componentPropertyReferences={mainComponent:key.leading,visible:key.showLeading};leading.visible=false;recolorIcon(leading,'content/muted');
 }
 const value=await textNode(kind==='Select'?'Select an option':kind==='Textarea'?'Write a description…':'Enter a value…',textStyle(size,'Body'),ink);value.name='Value';valueParent.appendChild(value);value.componentPropertyReferences={characters:key.value};value.textAutoResize='HEIGHT';value.resize(240,value.height);value.layoutSizingHorizontal='FILL';
 if(kind==='Textarea'){control.setBoundVariable('height',null);control.resize(280,placement==='Inside'?128:104);bind(control,'paddingTop','adaptive/padding/md');bind(control,'paddingBottom','adaptive/padding/md');}
 if(kind==='Select'){const chev=icon('ChevronDown');control.appendChild(chev);chev.name='Chevron';recolorIcon(chev,state==='Disabled'?'content/disabled':'content/muted');}
 if(kind==='Input'){const trailing=icon('X');control.appendChild(trailing);trailing.componentPropertyReferences={mainComponent:key.trailing,visible:key.showTrailing};trailing.visible=false;recolorIcon(trailing,'content/muted');}
 const hint=await textNode(state==='Error'?'Enter a valid value':'Supporting text','Caption',state==='Error'?'content/red':'content/muted');hint.name='Hint';c.appendChild(hint);hint.textAutoResize='HEIGHT';hint.resize(280,hint.height);hint.layoutSizingHorizontal='FILL';hint.componentPropertyReferences={characters:key.hint,visible:key.showHint};hint.visible=true;
 }
 placeSet(set,6);createdRoots.push(set);
}
return report();
