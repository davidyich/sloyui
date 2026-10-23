for(const kind of NUMBER_KINDS){
 if(page.findOne(n=>n.type==='COMPONENT_SET'&&n.name===kind))continue;
 const {componentSet:set,variants}=await createComponentWithVariants({name:kind,description:kind+' with editable numeric value and unit. Change the number through the Value text property. Theme, Accent, Density, Radius and Borders inherit.',variantAxes:kind==='NumberField'?{Size:sizes,State:[...states,'Error']}:{State:states},baseProps:{width:160,height:60,fills:[],layoutMode:'VERTICAL'},page});
 const keys={label:prop(set,'Label','TEXT',kind==='NumberField'?'Width':'Rotation'),value:prop(set,'Value','TEXT',kind==='NumberField'?'128':'0'),unit:prop(set,'Unit','TEXT',kind==='NumberField'?'px':'°'),showLabel:prop(set,'Show label','BOOLEAN',true),showUnit:prop(set,'Show unit','BOOLEAN',true)};
 for(const c of variants){const {State:state}=c.variantProperties;const size=c.variantProperties.Size||'md';c.primaryAxisSizingMode='AUTO';c.counterAxisSizingMode='FIXED';c.counterAxisAlignItems='MIN';gap(c,'stack-sm');c.clipsContent=false;
 const label=await textNode(kind==='NumberField'?'Width':'Rotation','Label','content/secondary');label.name='Label';c.appendChild(label);label.componentPropertyReferences={characters:keys.label,visible:keys.showLabel};
 const control=frame('Control','HORIZONTAL');c.appendChild(control);control.resize(160,32);control.layoutSizingHorizontal='FILL';control.layoutSizingVertical='FIXED';control.counterAxisAlignItems='CENTER';control.primaryAxisAlignItems='CENTER';geometry(control,size,true);fill(control,state==='Disabled'?'surface/disabled':'surface/secondary/neutral-'+stateName(state));border(control,'border/neutral-'+stateName(state));
 if(state==='Error')border(control,'content/red');
 const ink=state==='Disabled'?'content/disabled':'content/primary';
 if(kind==='NumberField'){const minus=icon('Minus');control.appendChild(minus);minus.name='Decrease';recolorIcon(minus,ink);bind(control,'paddingLeft','adaptive/padding/sm');bind(control,'paddingRight','adaptive/padding/sm');}
 const display=frame('Value and unit','HORIZONTAL');control.appendChild(display);display.layoutSizingHorizontal='FILL';display.primaryAxisAlignItems='CENTER';display.counterAxisAlignItems='CENTER';display.itemSpacing=2;
 const value=await textNode(kind==='NumberField'?'128':'0',textStyle(size,'Body'),ink);value.name='Value';display.appendChild(value);value.componentPropertyReferences={characters:keys.value};
 const unit=await textNode(kind==='NumberField'?'px':'°','Caption',state==='Disabled'?'content/disabled':'content/muted');unit.name='Unit';display.appendChild(unit);unit.componentPropertyReferences={characters:keys.unit,visible:keys.showUnit};
 if(kind==='NumberField'){const plus=icon('Plus');control.appendChild(plus);plus.name='Increase';recolorIcon(plus,ink);}
 }
 placeSet(set,kind==='NumberField'?6:5);createdRoots.push(set);
}
return report();
