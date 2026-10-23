await figma.setCurrentPageAsync(await figma.getNodeByIdAsync('23:12'));
const existing=figma.currentPage.findOne(n=>n.type==='COMPONENT'&&n.name==='V2 / Workspace prototype');if(existing)return {existing:existing.id};
const c=mainComponent('V2 / Workspace prototype',1280);c.x=800;c.y=240;pad(c,20);gap(c,16);rad(c,'large');mode(c,'surface','Shell');fill(c,'surface/surface/bg');
c.description='Reference-derived composition: Shell navigation, Workspace sidebar, Content document, Overlay menu and Glass over the source photo. Change Theme and Scheme on an instance; no recoloring required.';
const header=box(c,'Application toolbar',1240,'HORIZONTAL',0,16,null,40);
const logo=track(figma.createNodeFromSvg('<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 5H9a5 5 0 0 0 0 10h6a2 2 0 0 1 0 4H4v4h11a6 6 0 0 0 0-12H9a1 1 0 0 1 0-2h11V5Z" fill="#000"/></svg>'));header.appendChild(logo);for(const v of logo.findAllWithCriteria({types:['VECTOR']})){createdNodeIds.push(v.id);fill(v,'surface/content/primary');}
txt(header,'Sloy Studio','Body medium');txt(header,'/','Body','surface/content/muted');txt(header,'Product team','Body','surface/content/secondary');
const headSpacer=box(header,'Toolbar space',470,'HORIZONTAL');
pill(header,'Search anything   ⌘K','surface/surface/tertiary/normal','surface/content/muted',220,34);pill(header,'Share','surface/surface/secondary/normal','surface/content/primary',72,34);pill(header,'DD','surface/surface/invert/normal','surface/content/on-invert',34,34);
const body=box(c,'Application regions',1240,'HORIZONTAL',0,16);body.counterAxisAlignItems='MIN';
const sidebar=box(body,'Workspace · navigation',196,'VERTICAL',12,12,'surface/surface/bg');mode(sidebar,'surface','Workspace');rad(sidebar,'medium');sidebar.layoutSizingVertical='FILL';
txt(sidebar,'WORKSPACE','Caption','surface/content/muted');
for(const [label,path,selected] of [
 ['Overview','M3 10 12 3l9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10 M9 21v-8h6v8',true],
 ['Inbox','M4 4h16v16H4z M4 13h5l2 3h2l2-3h5',false],
 ['Projects','M3 7V5h7l2 2h9v13H3V7',false],
 ['Activity','M3 12h4l3-8 4 16 3-8h4',false],
 ['Members','M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',false]
]) {const row=box(sidebar,label,172,'HORIZONTAL',8,8,selected?'surface/surface/secondary/active':null,36);rad(row,'small');icon(row,label,path,selected?'surface/content/primary':'surface/content/secondary');txt(row,label,'Body',selected?'surface/content/primary':'surface/content/secondary');}
line(sidebar,172);txt(sidebar,'PROJECTS','Caption','surface/content/muted');
for(const [title,hue] of [['Website launch','blue'],['Design system','green'],['Customer research','orange']]){const row=box(sidebar,title,172,'HORIZONTAL',8,8);const dot=track(figma.createEllipse());row.appendChild(dot);dot.resize(7,7);fill(dot,`surface/content/accent/${hue}/primary`);txt(row,title,'Label','surface/content/secondary');}
box(sidebar,'Breathing room',172,'VERTICAL',0,0,null,210);
const projectCard=box(sidebar,'Team plan',172,'VERTICAL',12,8,'surface/surface/tertiary/normal');rad(projectCard,'small');txt(projectCard,'Team workspace','Label');txt(projectCard,'8 of 12 seats used','Caption','surface/content/secondary');pill(projectCard,'Manage team','surface/surface/invert/normal','surface/content/on-invert',148,32);
const main=box(body,'Content · project overview',1028,'VERTICAL',24,20,'surface/surface/bg');mode(main,'surface','Content');rad(main,'medium');
const titleRow=box(main,'Page heading',980,'HORIZONTAL',0,12);titleRow.primaryAxisAlignItems='SPACE_BETWEEN';txt(titleRow,'Website launch','Title');pill(titleRow,'Create task','surface/surface/accent/blue/primary/normal','surface/content/accent/blue/on-primary',120,36);
txt(main,'A clear picture of what is moving, what is ready, and what needs your team.','Body','surface/content/secondary');
const tabs=box(main,'View navigation',980,'HORIZONTAL',0,8);for(const [label,selected] of [['Overview',true],['Tasks',false],['Files',false],['Activity',false]])pill(tabs,label,selected?'surface/surface/secondary/active':'surface/surface/tertiary/normal','surface/content/'+(selected?'primary':'secondary'),90,32);
const columns=box(main,'Overview columns',980,'HORIZONTAL',0,20);columns.counterAxisAlignItems='MIN';
const left=box(columns,'Project content',640,'VERTICAL',0,20);
const metrics=box(left,'Project metrics',640,'HORIZONTAL',0,8);
for(const [label,value,caption,hue] of [['Completed','24','+8 this week','green'],['In progress','08','Across 3 teams','blue'],['Needs review','03','Ready for feedback','orange']]){
 const card=box(metrics,label,208,'VERTICAL',16,8,'surface/surface/tertiary/normal');rad(card,'medium');txt(card,label,'Label','surface/content/secondary');txt(card,value,'Title');txt(card,caption,'Label',`surface/content/accent/${hue}/primary`);
}
const tasks=box(left,'This week · controlled list',640,'VERTICAL',16,12);stroke(tasks);rad(tasks,'medium');
const th=box(tasks,'List heading',608,'HORIZONTAL',0,12);th.primaryAxisAlignItems='SPACE_BETWEEN';txt(th,'This week','Heading');txt(th,'View all →','Label','surface/content/accent/blue/primary');
for(const [title,hue,status,date] of [['Review homepage designs','orange','In review','Today'],['Publish component library','blue','In progress','Oct 16'],['Check checkout flow','red','Blocked','Oct 17'],['Prepare launch assets','green','Complete','Oct 18']]){
 const row=box(tasks,title,608,'HORIZONTAL',8,12,'surface/surface/tertiary/normal',48);rad(row,'small');
 icon(row,'Task status',hue==='green'?'M5 12l4 4L19 6':'M4 4h16v16H4z','surface/content/secondary',16);txt(row,title,'Body','surface/content/primary',300);pill(row,status,`surface/surface/accent/${hue}/secondary/normal`,`surface/content/accent/${hue}/primary`,112,28);txt(row,date,'Caption','surface/content/muted');
}
const update=box(left,'Team update',640,'VERTICAL',16,12,'surface/surface/tertiary/normal');rad(update,'medium');txt(update,'Latest update','Label','surface/content/secondary');txt(update,'Ready for the next review','Heading');txt(update,'The design team has finished the core flows. We are checking the last details before sharing the launch build.','Body','surface/content/secondary',608);
const ur=box(update,'Update actions',608,'HORIZONTAL',0,8);pill(ur,'Read update','surface/surface/secondary/normal','surface/content/primary',112,32);pill(ur,'12 comments','surface/surface/invert/normal','surface/content/on-invert',112,32);
const right=box(columns,'Supporting regions',320,'VERTICAL',0,20);
const photo=box(right,'Photo · original reference asset',320,'VERTICAL',16,16,null,340);photo.primaryAxisAlignItems='SPACE_BETWEEN';photo.fills=[{type:'IMAGE',imageHash:'a4ef60d415df03436059c637d20d74c39c721792',scaleMode:'FILL'}];rad(photo,'medium');photo.clipsContent=true;
pill(photo,'Inspiration board','surface/stable/white','surface/stable/black',144,30);
const material=box(photo,'Glass · image caption',288,'VERTICAL',16,12,'surface/surface/bg');mode(material,'surface','Glass');rad(material,'medium');glass(material);stroke(material);txt(material,'A place for new ideas','Heading','surface/content/primary',256);txt(material,'12 references saved by the team','Label','surface/content/secondary',256);
const mrow=box(material,'Image actions',256,'HORIZONTAL',0,8);pill(mrow,'Open board','surface/surface/primary/normal','surface/content/on-primary',124,34);pill(mrow,'Save','surface/surface/secondary/normal','surface/content/primary',124,34);
const overlay=box(right,'Overlay · quick actions',320,'VERTICAL',12,8,'surface/surface/bg');mode(overlay,'surface','Overlay');rad(overlay,'medium');shadow(overlay);stroke(overlay);txt(overlay,'QUICK ACTIONS','Caption','surface/content/muted');
for(const [name,key,selected] of [['Change view','⌘1',true],['Share workspace','⌘S',false],['Export summary','⌘E',false]]){
 const row=box(overlay,name,296,'HORIZONTAL',12,12,selected?'surface/surface/secondary/active':'surface/surface/tertiary/normal',40);rad(row,'small');row.primaryAxisAlignItems='SPACE_BETWEEN';txt(row,name,'Body');txt(row,key,'Caption','surface/content/muted');
}
line(overlay,296);txt(overlay,'Available to everyone on the team','Caption','surface/content/secondary');
return report({componentId:c.id,width:c.width,height:c.height,nodeCount:c.findAll(()=>true).length+1});
