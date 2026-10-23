await figma.setCurrentPageAsync(await figma.getNodeByIdAsync('23:10'));
const existing=figma.currentPage.children.filter(n=>n.name.startsWith('Гайд · '));
if(existing.length) return {existing:existing.map(n=>({id:n.id,name:n.name})),createdNodeIds:[],mutatedNodeIds:[]};
await Promise.all(['Regular','Medium','Semi Bold'].map(style=>figma.loadFontAsync({family:'Inter',style})));
const cols=await figma.variables.getLocalVariableCollectionsAsync();
const all=await figma.variables.getLocalVariablesAsync();
const cs=Object.fromEntries(cols.map(c=>[c.name.replace('V2 · ','').toLowerCase(),c]));
const colors=Object.fromEntries(all.filter(v=>v.variableCollectionId===cs.surface.id).map(v=>[v.name,v]));
const geometry=Object.fromEntries(all.filter(v=>v.variableCollectionId===cs.geometry.id).map(v=>[v.name,v]));
const createdNodeIds=[],mutatedNodeIds=[];
const track=n=>(createdNodeIds.push(n.id),n);
function paint(role){if(!colors[role])throw new Error('Missing public role '+role);return figma.variables.setBoundVariableForPaint({type:'SOLID',color:{r:0,g:0,b:0}},'color',colors[role]);}
function fill(n,role){n.fills=role?[paint(role)]:[];}
function stroke(n,role='border/subtle'){n.strokes=[paint(role)];n.strokeWeight=1;n.strokeAlign='INSIDE';}
function radius(n,key='medium'){for(const p of ['topLeftRadius','topRightRadius','bottomLeftRadius','bottomRightRadius'])n.setBoundVariable(p,geometry['radius/'+key]);}
function mode(n,key,name){const c=cs[key],m=c.modes.find(x=>x.name===name);if(!m)throw new Error('Missing mode '+name);n.setExplicitVariableModeForCollection(c,m.modeId);}
function box(parent,name,width,direction='VERTICAL',padding=0,spacing=16,role=''){
 const n=track(figma.createAutoLayout(direction));n.name=name;parent.appendChild(n);n.resize(width,100);n.clipsContent=false;fill(n,role);
 n.paddingTop=n.paddingBottom=n.paddingLeft=n.paddingRight=padding;n.itemSpacing=spacing;
 if(direction==='VERTICAL'){n.primaryAxisSizingMode='AUTO';n.counterAxisSizingMode='FIXED';}
 else {n.primaryAxisSizingMode='FIXED';n.counterAxisSizingMode='AUTO';n.counterAxisAlignItems='MIN';}
 return n;
}
function text(parent,value,width,size=14,role='content/primary/neutral',weight='Regular'){
 const n=track(figma.createText());n.name=value.slice(0,65);n.fontName={family:'Inter',style:weight};n.fontSize=size;n.lineHeight={unit:'PIXELS',value:size===28?36:size===20?28:21};parent.appendChild(n);n.textAutoResize='HEIGHT';n.resize(width,28);n.characters=value;if(value.includes('\n')){n.textAutoResize='NONE';n.resize(width,value.split('\n').length*(size===28?36:size===20?28:21));}fill(n,role);return n;
}
function heading(parent,title,width){return text(parent,title,width,20,'content/primary/neutral','Semi Bold');}
function paragraph(parent,body,width){return text(parent,body,width);}
function button(parent,label,bg,fg,width=180){const n=box(parent,label,width,'HORIZONTAL',12,0,bg);n.primaryAxisAlignItems='CENTER';n.counterAxisAlignItems='CENTER';radius(n,'small');const labelNode=text(n,label,width-24,14,fg,'Medium');labelNode.textAlignHorizontal='CENTER';return n;}
function line(parent,width){const n=track(figma.createRectangle());parent.appendChild(n);n.name='Разделитель';n.resize(width,1);fill(n,'border/subtle');}
const right=Math.max(...figma.currentPage.children.map(n=>n.x+n.width))+160;
function board(name,x,width=1280){const n=box(figma.currentPage,name,width,'VERTICAL',32,24,'surface/bg');n.x=x;n.y=240;mode(n,'theme','Light');mode(n,'scheme','Standard');mode(n,'surface','Content');return n;}

const start=board('Гайд · 01 Начните с Surface',right);
text(start,'Цвета для макета',1216,28,'content/primary/neutral','Semi Bold');
paragraph(start,'Рабочая коллекция — V2 · Surface. Внутри каждой роли все цвета вместе: сначала neutral, затем акценты. Отдельных папок цветов нет.',1216);
const steps=box(start,'Пять шагов',1216,'VERTICAL',24,16,'surface/secondary/neutral-normal');radius(steps,'large');
for(const [title,body] of [
 ['1. Настройте фрейм','Theme: Light / Dark. Scheme: Standard / Dimmed. Surface: Content для основной области.'],
 ['2. Нарисуйте фон области','Заливка → V2 · Surface → surface/bg. Для боковой панели установите Workspace, для меню — Overlay.'],
 ['3. Назначьте роли объектам','Кнопка, поле и карточка берут заливку из surface, текст из content, обводку из border.'],
 ['4. Сохраните наследование','У обычных дочерних объектов режимы остаются Auto. Карточка внутри Content не становится новой поверхностью.'],
 ['5. Проверьте переключения','Поменяйте тему и схему на внешнем фрейме. Токены на слоях остаются прежними. Проверьте Normal, Active и видимый focus.']
 ]){heading(steps,title,1168);paragraph(steps,body,1168);}
heading(start,'Роль → цвет → состояние',1216);
const tree=box(start,'Дерево выбора',1216,'HORIZONTAL',0,32);
const treeA=box(tree,'Заливки',592,'VERTICAL',20,12,'surface/tertiary/neutral-normal');radius(treeA);
paragraph(treeA,'surface / primary / neutral-normal\nsurface / primary / neutral-active\n\nsurface / primary / blue-normal\nsurface / primary / blue-active\n\nsecondary: все цвета в одной группе\ntertiary: все цвета в одной группе',552);
const treeB=box(tree,'Парный контент',592,'VERTICAL',20,12,'surface/tertiary/neutral-normal');radius(treeB);
paragraph(treeB,'Primary → content/on-primary\nСветлый Primary → content/on-bright-primary\nSecondary / Tertiary blue → content/primary/blue\nТихий цветной текст → content/secondary/blue\n\nОбычный текст → content/primary/neutral\nПодпись → content/muted/neutral\nГраница → border/subtle, default или <цвет>',552);
heading(start,'Как выбрать цвет',1216);
paragraph(start,'Neutral — поля, карточки, подписи и обычные действия. Один акцент проекта — главное действие, выбор и ссылки. В примерах это blue. Red — ошибка/опасность, green — успех, amber — предупреждение. Для категорий закрепите постоянное соответствие цвету.',1216);
paragraph(start,'Primary — сильный непрозрачный акцент. Цветной Secondary — мягкая заметная заливка, Tertiary — более спокойная. У neutral Secondary — локальный блок, а Tertiary — обычный контрол.',1216);
heading(start,'Чем отличаются шесть поверхностей',1216);
paragraph(start,'Shell — оболочка приложения. Workspace — рабочая панель или список. Content — документ или форма. Overlay — меню и диалог. Invert — намеренно противоположная по светлоте область. Glass — защищённая полупрозрачная область над изображением.',1216);
line(start,1216);
paragraph(start,'Palette, Theme и Scheme — внутреннее устройство. Их color scopes пусты: они не предлагаются как обычная заливка или текст. Менеджер переменных всё равно показывает всю систему. Dimmed выбирается режимом фрейма; внутренние имена с dimmed не нужно применять к объектам.',1216);
paragraph(start,'Alpha и stable — специальные наложения. Для обычных компонентов берите готовые роли Surface и оставляйте opacity слоя 100%.',1216);

const recipes=board('Гайд · 02 Рецепты компонентов',right+1440);
text(recipes,'Какой токен взять',1216,28,'content/primary/neutral','Semi Bold');
paragraph(recipes,'Все образцы ниже — редактируемые слои с реальными переменными V2 · Surface. Это примеры цветовых пар; геометрию и полное поведение берите из контракта компонента.',1216);
const specs=[
 {title:'Основная кнопка',kind:'primary',body:'Главное действие. Один сильный акцент в пределах задачи.',bg:'surface/primary/blue-normal',active:'surface/primary/blue-active',fg:'content/on-primary',note:'On-primary переключает белый и чёрный. Для светлых amber, yellow, lime, mint и turquoise используйте on-bright-primary.'},
 {title:'Мягкая кнопка',kind:'secondary',body:'Акцентное действие без доминирующей заливки.',bg:'surface/secondary/blue-normal',active:'surface/secondary/blue-active',fg:'content/primary/blue',note:'При необходимости добавьте border/blue. Цвет заливки и текста совпадает по семье.'},
 {title:'Tag / IconBox',kind:'tag',body:'Категория или статус. Статичный тег остаётся Normal.',bg:'surface/secondary/green-normal',fg:'content/primary/green',note:'Active нужен только интерактивному тегу. Chip и выбранные значения MultiSelect остаются neutral.'},
 {title:'Карточка / блок',kind:'card',body:'Выделенный локальный блок внутри текущей области.',bg:'surface/secondary/neutral-normal',fg:'content/primary/neutral',note:'Подпись: content/muted/neutral. Граница: border/subtle. Режимы дочерней карточки — Auto.'},
 {title:'Input / Select',kind:'field',body:'Нейтральный контрол. Значение и placeholder имеют разные роли.',bg:'surface/tertiary/neutral-normal',active:'surface/tertiary/neutral-active',fg:'content/primary/neutral',note:'Placeholder: content/muted/neutral. Граница: border/default. Focus показывайте отдельным заметным кольцом.'},
 {title:'Выбранная строка',kind:'row',body:'Выбор имеет заливку и дополнительный признак.',bg:'surface/secondary/blue-active',fg:'content/primary/blue',note:'Добавьте галочку или маркер. Невыбранная строка может быть без заливки.'},
 {title:'Предупреждение',kind:'alert',body:'Цвет поддерживает смысл сообщения и его иконку.',bg:'surface/secondary/amber-normal',fg:'content/primary/amber',note:'Для ошибки используйте red, для успеха green, для информации blue. Всегда добавляйте понятный текст.'},
 {title:'Меню / popover',kind:'menu',body:'Сам контейнер устанавливает Surface → Overlay.',bg:'surface/bg',fg:'content/primary/neutral',note:'Рамка: border/default. Пункты наследуют Overlay и используют обычные роли строки.'}
];
for(let i=0;i<specs.length;i+=2){
 const row=box(recipes,'Рецепты '+(i/2+1),1216,'HORIZONTAL',0,32);
 for(const s of specs.slice(i,i+2)){
  const card=box(row,s.title,592,'VERTICAL',24,16);stroke(card);radius(card,'large');
  heading(card,s.title,544);paragraph(card,s.body,544);
  const demo=box(card,'Пример · '+s.title,544,'VERTICAL',16,12,'surface/bg');radius(demo);
  if(s.kind==='primary'||s.kind==='secondary'){
   const r=box(demo,'Normal и Active',512,'HORIZONTAL',0,16);
   button(r,'Normal',s.bg,s.fg,248);button(r,'Active',s.active,s.fg,248);
  }else if(s.kind==='tag'){
   const r=box(demo,'Категории',512,'HORIZONTAL',0,12);button(r,'Готово',s.bg,s.fg,140);button(r,'Дизайн','surface/secondary/blue-normal','content/primary/blue',140);
  }else if(s.kind==='card'){
   const n=box(demo,'Карточка',512,'VERTICAL',16,8,s.bg);radius(n);stroke(n);text(n,'Название документа',480,14,s.fg,'Medium');text(n,'Обновлён сегодня',480,14,'content/muted/neutral');
  }else if(s.kind==='field'){
   text(demo,'Название проекта',512,14,'content/primary/neutral','Medium');const n=box(demo,'Input',512,'VERTICAL',12,0,s.bg);radius(n,'small');stroke(n,'border/default');text(n,'Введите название…',488,14,'content/muted/neutral');
  }else if(s.kind==='row'){
   const n=box(demo,'Selected row',512,'VERTICAL',14,0,s.bg);radius(n,'small');text(n,'✓  Документ выбран',484,14,s.fg,'Medium');
  }else if(s.kind==='alert'){
   const n=box(demo,'Alert',512,'VERTICAL',16,8,s.bg);radius(n);text(n,'Проверьте данные перед отправкой',480,14,s.fg,'Medium');text(n,'В двух полях остались незаполненные значения.',480,14,'content/secondary/amber');
  }else{
   const n=box(demo,'Меню · Overlay',512,'VERTICAL',12,8,s.bg);mode(n,'surface','Overlay');radius(n);stroke(n,'border/default');text(n,'Открыть документ',488);const r=box(n,'Hovered item',488,'VERTICAL',10,0,'surface/tertiary/neutral-active');radius(r,'small');text(r,'Создать копию',468);text(n,'Переместить…',488);
  }
  paragraph(card,'Заливка: '+s.bg+'\nКонтент: '+s.fg+(s.active?'\nActive: '+s.active:''),544);
  text(card,s.note,544,14,'content/secondary/neutral');
 }
}

const contexts=board('Гайд · 03 Проверка контекста',right+2880);
text(contexts,'Один набор ролей, четыре контекста',1216,28,'content/primary/neutral','Semi Bold');
paragraph(contexts,'Внутри каждой панели назначены одинаковые роли Surface. Различаются только Theme и Scheme на родительском фрейме. Выделите панель и меняйте режимы — привязки дочерних объектов остаются прежними.',1216);
for(const scheme of ['Standard','Dimmed']){
 const row=box(contexts,scheme,1216,'HORIZONTAL',0,32);
 for(const theme of ['Light','Dark']){
  const panel=box(row,theme+' / '+scheme+' · Content',592,'VERTICAL',24,16,'surface/bg');mode(panel,'theme',theme);mode(panel,'scheme',scheme);mode(panel,'surface','Content');stroke(panel);radius(panel,'large');
  heading(panel,theme+' / '+scheme,544);
  const workspace=box(panel,'Workspace · список',544,'VERTICAL',16,8,'surface/bg');mode(workspace,'surface','Workspace');radius(workspace);text(workspace,'Workspace · список документов',512,14,'content/primary/neutral','Medium');
  const selected=box(workspace,'Выбранный документ',512,'VERTICAL',12,0,'surface/secondary/blue-active');radius(selected,'small');text(selected,'✓  Цветовая система',488,14,'content/primary/blue');
  const card=box(panel,'Карточка · наследует Content',544,'VERTICAL',16,8,'surface/secondary/neutral-normal');radius(card);stroke(card);text(card,'Карточка наследует Content',512,14,'content/primary/neutral','Medium');text(card,'Подпись использует content/muted/neutral.',512,14,'content/muted/neutral');
  const field=box(panel,'Поле',544,'VERTICAL',12,0,'surface/tertiary/neutral-normal');radius(field,'small');stroke(field,'border/default');text(field,'Значение поля',520);
  const actions=box(panel,'Действия',544,'HORIZONTAL',0,16);button(actions,'Сохранить','surface/primary/blue-normal','content/on-primary',264);button(actions,'Дополнительно','surface/secondary/blue-normal','content/primary/blue',264);
 }
}
heading(contexts,'Что проверить перед передачей макета',1216);
paragraph(contexts,'1. Primary: общий on-primary; светлые заливки: on-bright-primary.\n2. Цветной Secondary/Tertiary сочетается с content/primary того же цвета.\n3. Выбранное состояние имеет галочку или другой признак, focus — отдельное кольцо.\n4. На цветных объектах и их родителях нет дополнительного общего opacity.\n5. Карточки наследуют контекст, меню устанавливает Overlay.',1216);
heading(contexts,'Если цвет не нужен проекту',1216);
paragraph(contexts,'Необязательно использовать все 20 цветов. В Palette Lab сохраните JSON проекта, затем удалите ненужный цвет через «Удалить цвет». Это меняет проект редактора. В общей библиотеке сначала проверяют привязки и обновляют весь набор его ролей; удаление одной заливки Primary не удаляет остальные зависимости.',1216);

const updates={
 '37:4335':'Применяйте роли Surface, меняйте контекст',
 '37:4336':'Sloy UI · 20 цветов · 6 поверхностей · подробные рецепты справа на трёх досках «Гайд»',
 '37:4340':'01  Настройте контекст фрейма',
 '37:4341':'Theme: Light / Dark. Scheme: Standard / Dimmed. Surface: Shell / Workspace / Content / Overlay / Invert / Glass. У обычных дочерних объектов оставьте Auto.',
 '37:4343':'02  Выбирайте цвета из V2 · Surface',
 '37:4344':'Одна группа на роль: neutral-normal, neutral-active, blue-normal, blue-active. Аналогично secondary и tertiary. Фон области — surface/bg. Theme и Scheme не назначаются объектам как цвет.',
 '37:4346':'03  Берите парный контент',
 '37:4347':'Primary blue → content/on-primary. Мягкие blue-заливки → content/primary/blue. Обычный текст → content/primary/neutral, подпись → content/muted/neutral.',
 '37:4349':'04  Явно задавайте состояния',
 '37:4350':'Normal — покой. Active — усиленная заливка для состояния, выбранного компонентом. Выбор дополняется маркером, focus — отдельным кольцом. Статичный тег остаётся Normal.',
 '37:4352':'05  Сохраняйте рассчитанную прозрачность',
 '37:4353':'Цветные Secondary/Tertiary уже полупрозрачны. Не уменьшайте opacity всей группы. Glass получает одну защитную заливку surface/bg; blur задаётся отдельно.',
 '37:4355':'06  Внутренние коллекции — для генератора',
 '37:4356':'Palette, Theme и Scheme скрыты из обычного выбора цвета через scopes. Менеджер переменных показывает их для настройки системы. В макете используйте Surface.'
};
for(const [id,value]of Object.entries(updates)){const n=await figma.getNodeByIdAsync(id);if(!n||n.type!=='TEXT')throw new Error('Missing guide text '+id);for(const seg of n.getStyledTextSegments(['fontName']))await figma.loadFontAsync(seg.fontName);n.characters=value;mutatedNodeIds.push(n.id);}
const oldGuide=await figma.getNodeByIdAsync('37:4334');oldGuide.name='06 · Кратко: применение Surface';mutatedNodeIds.push(oldGuide.id);
const bounds=[start,recipes,contexts].map(n=>({id:n.id,name:n.name,x:n.x,y:n.y,width:n.width,height:n.height}));
const issues=[];for(const root of [start,recipes,contexts])for(const n of root.findAllWithCriteria({types:['TEXT']})){if(n.width<1||n.height<1)issues.push(n.id+' has empty bounds');if(n.parent.type!=='PAGE'&&n.x+n.width>n.parent.width+.1)issues.push(n.id+' overflows horizontally');}
if(issues.length)throw new Error(JSON.stringify(issues));
return {createdNodeIds,mutatedNodeIds,boards:bounds,allSamplesUsePublicSurface:true,issues};
