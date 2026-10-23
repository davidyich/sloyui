// Read-only body. Prefix const SLOY_AUDIT={pageName,rootIds,masterIds};
const auditPage=figma.root.children.find(p=>p.name===SLOY_AUDIT.pageName);
if(!auditPage)throw Error('Missing audit page');
await figma.setCurrentPageAsync(auditPage);
const auditRoots=[];for(const id of [...SLOY_AUDIT.rootIds,...(SLOY_AUDIT.masterIds||[])]){const n=await figma.getNodeByIdAsync(id);if(!n)throw Error('Stale audit root '+id);auditRoots.push(n);}
const auditAll=[...new Map(auditRoots.flatMap(n=>[n,...n.findAll(()=>true)]).map(n=>[n.id,n])).values()];
function auditVisible(node){let n=node;while(n&&n.type!=='PAGE'){if(n.visible===false)return false;n=n.parent;}return true;}
const auditOverflow=[];
for(const n of auditAll)if(auditVisible(n)&&n.parent&&['FRAME','COMPONENT'].includes(n.parent.type)&&n.layoutPositioning!=='ABSOLUTE'){
 const p=n.parent;if(n.x<-.75||n.y<-.75||n.x+n.width>p.width+.75||n.y+n.height>p.height+.75)auditOverflow.push({id:n.id,name:n.name,parentId:p.id,parent:p.name,bounds:[n.x,n.y,n.width,n.height],parentSize:[p.width,p.height]});
}
const auditTexts=auditAll.filter(n=>n.type==='TEXT');
const auditFamilies=[...new Set(auditTexts.flatMap(t=>t.getStyledTextSegments(['fontName']).map(s=>s.fontName.family)))];
return{page:auditPage.name,roots:auditRoots.map(n=>({id:n.id,name:n.name,width:n.width,height:n.height})),nodeCount:auditAll.length,instanceCount:auditAll.filter(n=>n.type==='INSTANCE').length,textCount:auditTexts.length,fontFamilies:auditFamilies,missingFonts:auditTexts.filter(n=>n.hasMissingFont).map(n=>({id:n.id,name:n.name})),overflow:auditOverflow,screenFrames:auditAll.filter(n=>n.type==='FRAME'&&/^(Сегодня|Библиотека) · (Light|Dark)$/.test(n.name)).map(n=>({id:n.id,name:n.name,width:n.width,height:n.height,modes:n.explicitVariableModes})),createdNodeIds:[],mutatedNodeIds:[]};
