// Border-only idempotent delta. Apply via `node figma/controls/build.mjs fix-borders`.
// No mode pinning: the coordinator owns the global Borders default On.
const sets=page.children.filter(n=>n.type==='COMPONENT_SET');const before=allIds(sets),targets=[],families=[];
for(const set of sets){
 const button=/^(Button|IconButton)\/(Primary|Secondary|Outline|Ghost|Danger)$/.exec(set.name);
 const field=/^(Input|Select|Textarea)\/(Outside|Inside)$/.test(set.name)||['NumberField','ValueScrubber'].includes(set.name);
 const selection=['Switch','Radio','Checkbox'].includes(set.name);
 if(!button&&!field&&!selection&&set.name!=='Slider')continue;
 let count=0;
 for(const c of set.children){
  const {State:state,Value:value}=c.variantProperties;let target;
  if(button){target=c;buttonBorder(target,button[2],state);}
  else if(field){target=c.children.find(n=>n.name==='Control');if(!target)throw Error('Missing Control: '+set.name+'/'+c.name);border(target,state==='Error'?'content/red':'border/neutral-'+stateName(state));}
  else if(selection){target=c.children.find(n=>n.name==='Control');if(!target)throw Error('Missing selection Control');selectionBorder(target,value!=='Off',state);}
  else{target=c;border(target,'border/neutral-normal');}
  const layer=target.children.find(n=>n.name==='.Border');targets.push({id:target.id,borderId:layer.id,componentId:c.id,family:set.name,state});count++;
 }
 families.push({name:set.name,count});
}
const after=allIds(sets),afterSet=new Set(after),removedNodeIds=before.filter(id=>!afterSet.has(id));if(removedNodeIds.length)throw Error('Unexpected removed nodes');
return {mutatedNodeIds:targets.flatMap(t=>[t.id,t.borderId]),createdNodeIds:after.filter(id=>!before.includes(id)),removedNodeIds,preservedNodeCount:before.length,targetCount:targets.length,families,strokeWeight:.5,opacityBinding:'Borders/border/opacity',opacityPercent:{Off:0,On:100},bordersDefault:'Inherited; coordinator changes global collection default to On. No master or instance pins a mode.',focus:'Existing control contour only, no outside focus outline.'};
