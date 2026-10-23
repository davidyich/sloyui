// Read-only structure only: no variable graph, context matrix, writes or resize.
const page=figma.root.children.find(n=>n.name==='02 · Controls');
await figma.setCurrentPageAsync(page);
const borderCollection=(await figma.variables.getLocalVariableCollectionsAsync()).find(c=>c.name==='V2 · Borders');
const borderDefault=borderCollection?.modes.find(m=>m.modeId===borderCollection.defaultModeId)?.name;
const borderOpacity=borderCollection&&await figma.variables.getVariableByIdAsync(borderCollection.variableIds[0]);
const borderOpacityId=borderOpacity?.name==='border/opacity'?borderOpacity.id:null;
const sets=page.children.filter(n=>n.type==='COMPONENT_SET');
const components=sets.flatMap(s=>s.children.filter(n=>n.type==='COMPONENT').map(n=>({node:n,set:s.name,props:n.variantProperties})));
const issues={focusOutside:[],disabledInvisible:[],slider:[],emptyBorder:[],missingControlBorder:[],directControlStroke:[],pinnedBordersMode:[],bordersDefault:[],borderRenderedOpacity:[]};let focusVariants=0,disabledVariants=0,emptyBorders=0;
if(borderDefault!=='On')issues.bordersDefault.push({actual:borderDefault??null,expected:'On'});
for(const {node:c,set,props}of components){
 const button=/^(Button|IconButton)\//.test(set),field=/^(Input|Select|Textarea)\//.test(set)||['NumberField','ValueScrubber','Switch','Radio','Checkbox'].includes(set);
 const target=button||set==='Slider'?c:field?c.children.find(n=>n.name==='Control'):null;
 if(button||field||set==='Slider'){
  const layer=target?.children.find(n=>n.name==='.Border'&&n.visible);
  if(!target||!layer||!layer.visible||layer.boundVariables?.opacity?.id!==borderOpacityId)issues.missingControlBorder.push({id:c.id,family:set,error:'Applicable control lacks visible Borders-bound .Border'});
  if(target?.strokes?.some(p=>p.visible!==false))issues.directControlStroke.push({id:target.id,family:set,error:'Direct stroke bypasses Borders toggle'});
  for(const n of [c,c.parent,target].filter(Boolean))if(borderCollection.id in (n.explicitVariableModes??{}))issues.pinnedBordersMode.push({id:n.id,error:'Control pins Borders mode instead of inheriting'});
 }
 if(props.State==='Focus'){
  focusVariants++;const outside=[c,...c.findAll(n=>['FRAME','RECTANGLE','ELLIPSE','VECTOR'].includes(n.type))].filter(n=>n.visible!==false&&n.strokeAlign==='OUTSIDE'&&Array.isArray(n.strokes)&&n.strokes.some(p=>p.visible!==false));
  for(const n of outside)issues.focusOutside.push({id:n.id,variant:c.id,name:n.name});
 }
 if(props.State==='Disabled'){
  disabledVariants++;if(c.opacity!==1)issues.disabledInvisible.push({id:c.id,error:'Component opacity is not 1'});
  if(set.startsWith('Button/')){const label=c.children.find(n=>n.type==='TEXT'&&n.name==='Label');if(!label||!label.visible||label.opacity!==1||!label.characters.trim())issues.disabledInvisible.push({id:c.id,error:'Button label is missing, hidden, empty or faded'});}
 }
 // Hidden obsolete geometry is not rendered and is outside this paint check.
 for(const n of c.findAll(n=>n.name==='.Border'&&n.visible)){
  emptyBorders++;const alias=n.boundVariables?.opacity;
  if(n.fills.length||n.strokeWeight!==.5||n.strokeAlign!=='INSIDE'||alias?.id!==borderOpacityId)issues.emptyBorder.push({id:n.id,error:'Empty border exception does not meet geometry/binding contract'});
  const modeId=n.resolvedVariableModes?.[borderCollection.id]??borderCollection.defaultModeId;
  const mode=borderCollection.modes.find(m=>m.modeId===modeId)?.name,expected=mode==='On'?1:mode==='Off'?0:null;
  // Read rendered normalized opacity, not resolveForConsumer's 0/100 FLOAT value.
  if(expected===null||Math.abs(n.opacity-expected)>1e-6)issues.borderRenderedOpacity.push({id:n.id,mode,expected,actual:n.opacity,error:'Rendered border opacity differs from Borders percent semantics'});
 }
}
const slider=sets.find(n=>n.name==='Slider');const sliderRows=[];
if(!slider)issues.slider.push({error:'Missing Slider'});else{
 const initial=slider.defaultVariant.variantProperties;if(initial.Value!=='50'||initial.State!=='Default')issues.slider.push({id:slider.id,error:'Default is not 50 / Default'});
 for(const c of slider.children){
  const value=Number(c.variantProperties.Value),control=c.children.find(n=>n.name==='Slider control'),heading=c.children.find(n=>n.name==='Heading'),thumb=c.findOne(n=>n.name==='Thumb'),rail=c.findOne(n=>n.name==='Track');
  const segments=rail?.children.filter(n=>/^Track [1-4]$/.test(n.name))??[];
  const a=thumb?.absoluteBoundingBox,b=c.absoluteBoundingBox;const offset=a&&b?(a.x+a.width/2-b.x)-b.width*value/100:null;
  if(!thumb||thumb.width!==2||thumb.height!==14||thumb.strokes.length||!control||control.constraints.horizontal!=='STRETCH'||segments.length!==4||segments.some(n=>n.layoutSizingHorizontal!=='FILL')||heading?.layoutSizingVertical!=='FILL'||Math.abs(offset??0)>2)issues.slider.push({id:c.id,value,offset,error:'Filled row, handle, percentage or resize-chain mismatch'});
  sliderRows.push({id:c.id,value,state:c.variantProperties.State,width:c.width,handleOffset:offset});
 }
}
const counts=Object.fromEntries(Object.entries(issues).map(([k,v])=>[k,v.length]));
return {readOnly:true,result:Object.values(counts).every(n=>n===0)?'pass':'fail',sets:sets.length,variants:components.length,focusVariants,disabledVariants,emptyBorders,bordersDefault:borderDefault,counts,issues,sliderRows,resize:'Current bounds and FILL/STRETCH constraints only; no node resized.',opacityException:'Only an empty 0.5 px .Border layer may bind opacity to the integer border/opacity percent switch (Off=0, On=100; rendered node.opacity=0/1). Text/fills/whole controls remain opacity 1.'};
