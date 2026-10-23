for(const {kind,appearance} of BUTTON_KINDS){
 const name=kind+'/'+appearance;if(page.findOne(n=>n.type==='COMPONENT_SET'&&n.name===name))continue;
 const {componentSet:set,variants}=await createComponentWithVariants({name,description:kind+' with inherited Accent modes. Neutral is the default. Size and State are native variants; labels and icons stay editable. Use Danger only for destructive actions.',variantAxes:{Size:sizes,State:states},baseProps:{width:144,height:32,fills:[],layoutMode:'HORIZONTAL'},page});
 const keys={};if(kind==='Button')keys.label=prop(set,'Label','TEXT','Button');
 keys.leading=prop(set,'Icon','INSTANCE_SWAP',page.findOne(n=>n.type==='COMPONENT'&&n.name==='.Icons/'+(kind==='IconButton'?'Plus':'Plus')).id);
 if(kind==='Button'){keys.show=prop(set,'Show icon','BOOLEAN',false);keys.trailing=prop(set,'Trailing icon','INSTANCE_SWAP',page.findOne(n=>n.type==='COMPONENT'&&n.name==='.Icons/ArrowRight').id);keys.showTrailing=prop(set,'Show trailing icon','BOOLEAN',false);keys.loading=prop(set,'Loading','BOOLEAN',false);}
 for(const c of variants){const {Size:size,State:state}=c.variantProperties;c.clipsContent=false;geometry(c,size);c.primaryAxisSizingMode='AUTO';c.counterAxisSizingMode='FIXED';const s=stateName(state);let bg,ink,group='Accent';
 if(state==='Disabled'){bg='surface/disabled';ink='content/disabled';group='Theme';}
 else if(['Outline','Ghost'].includes(appearance)){bg='surface/tertiary/neutral-active';ink='content/primary';group='Theme';}
 else if(appearance==='Danger'){bg='surface/secondary/red-'+s;ink='content/red';group='Theme';}
 else {bg='surface/'+(appearance==='Primary'?'primary':'secondary')+'-'+s;ink=appearance==='Primary'?'on-primary':'content';}
 if(['Ghost','Outline'].includes(appearance)&&state==='Default')c.fills=[];else fill(c,bg,group);
 buttonBorder(c,appearance,state);
 const leading=icon('Plus');c.appendChild(leading);leading.componentPropertyReferences={mainComponent:keys.leading,...(keys.show?{visible:keys.show}:{})};leading.visible=kind==='IconButton';recolorIcon(leading,ink,group);if(size==='xl')leading.resize(20,20);
 if(kind==='Button'){
  const spinner=icon('LoaderCircle');spinner.name='Loading indicator';c.appendChild(spinner);spinner.componentPropertyReferences={visible:keys.loading};spinner.visible=false;recolorIcon(spinner,ink,group);
  const label=await textNode('Button',textStyle(size),ink,group);label.name='Label';c.appendChild(label);label.componentPropertyReferences={characters:keys.label};
  const trailing=icon('ArrowRight');trailing.name='Trailing icon';c.appendChild(trailing);trailing.componentPropertyReferences={mainComponent:keys.trailing,visible:keys.showTrailing};trailing.visible=false;recolorIcon(trailing,ink,group);if(size==='xl')trailing.resize(20,20);
 }else {c.paddingLeft=0;c.paddingRight=0;c.setBoundVariable('paddingLeft',null);c.setBoundVariable('paddingRight',null);c.primaryAxisSizingMode='FIXED';bind(c,'width','adaptive/control/height-'+size);}
 }
 placeSet(set);createdRoots.push(set);
}
return report();
