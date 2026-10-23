const name='Slider';if(page.findOne(n=>n.type==='COMPONENT_SET'&&n.name===name))return {existing:true};
const {componentSet:set,variants}=await createComponentWithVariants({name,description:'Palette Lab ParameterSlider: one filled row with editable label at the start, value and unit at the end, and a slim handle at the selected fill boundary. Default value is 50. State, Theme and Surface inherit independently. Focus changes fill without an outline.',variantAxes:{Value:['50','0','25','75','100'],State:states},baseProps:{width:280,height:32,fills:[],layoutMode:'VERTICAL'},page});
const keys={label:prop(set,'Label','TEXT','Opacity'),unit:prop(set,'Unit','TEXT','%'),showLabel:prop(set,'Show label','BOOLEAN',true),showValue:prop(set,'Show value','BOOLEAN',true)};
for(const c of variants)await layoutParameterSlider(c,keys);
placeSet(set);createdRoots.push(set);return report();
