const createdStyles=[];
for(const [name,role,weight,size] of [['Body','body','Regular'],['Label','label','Medium'],['Caption','caption','Regular'],['Subtitle','subtitle','Semi Bold'],['Title','title','Semi Bold'],['Body large','body','Regular','number/16'],['Label large','label','Medium','number/16']]) {
 const styleName='Sloy UI / '+(name.includes('large')?'Controls / ':'Base / ')+name;
 let s=styles.find(s=>s.name===styleName);
 if(!s){s=figma.createTextStyle();s.name=styleName;s.fontName={family:'Inter',style:weight};s.fontSize=14;s.lineHeight={unit:'PIXELS',value:20};s.setBoundVariable('fontFamily',V('Primitives','font/family/base'));s.setBoundVariable('fontSize',V('Primitives',size??'font/size/'+role));s.setBoundVariable('lineHeight',V('Primitives','font/line-height/'+role));s.setBoundVariable('fontWeight',V('Primitives','font/weight/'+(weight==='Regular'?'regular':weight==='Medium'?'medium':'semibold')));createdStyles.push(s.id);}
}
const icons={};
for(const [name,svg] of Object.entries(ICON_SVGS)){let c=page.findOne(n=>n.type==='COMPONENT'&&n.name==='.Icons/'+name);if(!c){c=figma.createComponent();c.name='.Icons/'+name;c.resize(16,16);c.fills=[];c.clipsContent=false;const glyph=figma.createNodeFromSvg(svg);glyph.name=name;glyph.resize(16,16);c.appendChild(glyph);glyph.x=0;glyph.y=0;glyph.constraints={horizontal:'SCALE',vertical:'SCALE'};recolorIcon(glyph,'content/primary');c.x=40+Object.keys(icons).length*56;c.y=-140;c.description='Lucide '+name+'; editable vector icon for instance swaps.';createdRoots.push(c);}icons[name]=c.id;}
return {...report(),createdStyles,icons};
