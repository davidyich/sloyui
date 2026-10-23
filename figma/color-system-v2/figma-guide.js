await figma.setCurrentPageAsync(await figma.getNodeByIdAsync('23:10'));
if(figma.currentPage.children.some(n=>['06 · Apply the color system','06 · Кратко: применение Surface'].includes(n.name)))return {existing:true};
const b=box(figma.currentPage,'06 · Apply the color system',2352,'VERTICAL',32,24,'surface/surface/bg');b.x=240;b.y=3940;mode(b,'theme','Light');mode(b,'scheme','Standard');mode(b,'surface','Content');
txt(b,'Build with roles, switch the context','Title');
txt(b,'Sloy UI V2 · independent color exploration · five surfaces / five accents / two fill states','Body','surface/content/secondary');
const columns=box(b,'Contract and optional interaction',2288,'HORIZONTAL',0,32);columns.counterAxisAlignItems='MIN';
const contract=box(columns,'Context contract',1356,'VERTICAL',24,24,'surface/surface/tertiary/normal');rad(contract,'large');
for(const [title,body] of [
 ['01  Set the axes on a region','Theme: Light / Dark. Scheme: Standard / Dimmed. Surface: Shell / Workspace / Content / Overlay / Glass. Leave unchanged child axes on Auto. Hues are named variables, available together; they are not modes.'],
 ['02  Bind the public role','Use V2 · Surface: surface/secondary contains neutral-normal, blue-normal, blue-active and the other hues together. Content follows the same role-first grouping. surface/primary also contains bg and invert-normal / invert-active.'],
 ['03  Pair fill and content','Primary → content/on-primary/neutral. Invert → content/on-invert/neutral. Colored Primary → content/on-primary/<hue>. Soft colored fills → content/primary/<hue> or content/secondary/<hue>. Content primary is vivid; secondary is quieter. Inverted is the opposite neutral foreground.'],
 ['04  Preserve the two states','Normal is rest. Active is hover or a persistent selected/emphasized state chosen by the component. Focus uses a separate strong boundary; pressing adds the optional reaction layer.'],
 ['05  Soft fills follow the backing','Accent Secondary / Tertiary are translucent. Place them directly on bg or neutral Secondary / Tertiary; inherit Surface. Glass keeps its white 88% / black 80% protective base and 24 px blur. Do not lower the whole element opacity.'],
 ['06  Compose color and opacity aliases','Translucent colors combine a pigment alias and a V2 · Opacity number alias (0–100%). Adaptive Ink / Canvas swap only with Theme. Stable white / black and their alpha steps never change.']
]){const g=box(contract,title,1308,'VERTICAL',0,8);txt(g,title,'Heading');txt(g,body,'Body','surface/content/secondary',1308);}
const reactions=box(columns,'Optional reactions',900,'VERTICAL',24,20,'surface/surface/bg');stroke(reactions);rad(reactions,'large');
txt(reactions,'Reactions · Off by default','Heading');
txt(reactions,'A separate 5% layer expands from the press point for 420 ms. A quieter 3% role is available. Reduced motion removes expansion.','Body','surface/content/secondary',852);
const c=await figma.getNodeByIdAsync('37:2');
for(const state of ['Off','On']){txt(reactions,state,'Label','surface/content/secondary');const n=instance(reactions,c,'Reactions / '+state);mode(n,'reactions',state);}
txt(reactions,'Native Figma samples show the optional layer. The companion preview.html verifies pointer origin, toggling, keyboard input and reduced motion.','Body','surface/content/secondary',852);
return report({boardId:b.id,width:b.width,height:b.height});
