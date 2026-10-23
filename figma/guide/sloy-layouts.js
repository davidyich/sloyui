const {page:sloyLayoutPage,root:sloyLayoutRoot}=await sroot('04 · Layouts','Слой · Today and Library');
await sgtext(sloyLayoutRoot,'Слой · сегодня и сохранённое',1504,'title');
await sgtext(sloyLayoutRoot,'Примеры двух mini-apps с общей навигацией и быстрым вводом. Материалы взяты из документации Sloy; задачи — демонстрация пунктов плана приёмки.',1504,'body','content/secondary/neutral');
async function sapp(theme,destination){
  const screen=gframe(sloyLayoutRoot,destination+' · '+theme,'HORIZONTAL',1504);gmode(screen,'Theme',theme);gmode(screen,'Surface','Shell');gmode(screen,'Accent','Blue');gfill(screen,'surface/bg');sborder(screen);sradius(screen,'xl');screen.minHeight=900;
  const rail=gframe(screen,'Persistent icon rail','VERTICAL',64);rail.paddingTop=rail.paddingBottom=12;rail.paddingLeft=rail.paddingRight=10;rail.itemSpacing=12;rail.layoutSizingVertical='FILL';gmode(rail,'Surface','Shell');gfill(rail,'surface/bg');
  const brand=gframe(rail,'Sloy logo','VERTICAL',44);brand.paddingTop=brand.paddingBottom=10;brand.counterAxisAlignItems='CENTER';await sicon(brand,'Layers','content/primary/neutral',24);
  await sinstance(rail,'RailItem',{Icon:siconId('CalendarDays'),Label:'Сегодня'},{State:destination==='Сегодня'?'Selected':'Default'});
  await sinstance(rail,'RailItem',{Icon:siconId('BookOpen'),Label:'Библиотека'},{State:destination==='Библиотека'?'Selected':'Default'});
  const spacer=gframe(rail,'Navigation separation','VERTICAL',44);spacer.resize(44,100);spacer.layoutSizingVertical='FILL';spacer.minHeight=100;
  await sinstance(rail,'RailItem',{Icon:siconId('SlidersHorizontal'),Label:'Редактировать интерфейс'},{State:'Default'});
  await sinstance(rail,'RailItem',{Icon:siconId('Settings'),Label:'Настройки'},{State:'Default'});await sinstance(rail,'RailItem',{Icon:siconId('MoreHorizontal'),Label:'Вид и аккаунт'},{State:'Default'});
  const workspace=gframe(screen,'Workspace','VERTICAL',1440);workspace.layoutSizingHorizontal='FILL';workspace.itemSpacing=0;gmode(workspace,'Surface','Workspace');gfill(workspace,'surface/bg');
  const header=gframe(workspace,'Shared location and search','HORIZONTAL',1440);header.paddingTop=16;header.paddingBottom=16;header.paddingLeft=32;header.paddingRight=32;header.itemSpacing=16;header.counterAxisAlignItems='CENTER';
  const location=gframe(header,'Location','HORIZONTAL',820);location.itemSpacing=10;location.counterAxisAlignItems='CENTER';await sgtext(location,'Слой',64,'label');await sicon(location,'ChevronRight','content/muted/neutral',16);await sgtext(location,destination,180,'body');
  const search=await sinstance(header,'input',{'Show label':false,'Show hint':false,Value:'Найти в Слое','Show leading icon':true,'Leading icon':siconId('Search')},{Size:'md',State:'Default'});search.resize(460,search.height);search.layoutSizingVertical='HUG';await siconButton(header,'Plus','Быстрый ввод','md');
  const body=gframe(workspace,destination+' workspace','VERTICAL',1440);body.paddingTop=24;body.paddingBottom=24;body.paddingLeft=32;body.paddingRight=32;body.itemSpacing=24;body.layoutSizingHorizontal='FILL';gmode(body,'Surface','Content');gfill(body,'surface/bg');
  return{workspace,body};
}
async function scapture(workspace){
  const dock=gframe(workspace,'Persistent capture dock','HORIZONTAL',1440);dock.paddingTop=dock.paddingBottom=16;dock.paddingLeft=dock.paddingRight=24;dock.itemSpacing=12;dock.counterAxisAlignItems='CENTER';gmode(dock,'Surface','Overlay');gfill(dock,'surface/bg');
  const field=await sinstance(dock,'textarea',{'Show label':false,'Show hint':false,Value:'Ссылка, мысль или новая идея…'},{Size:'md',State:'Default'});field.resize(1280,field.height);field.layoutSizingVertical='HUG';const control=field.findOne(n=>n.type==='FRAME'&&n.name==='Control');if(control){control.setBoundVariable('height',null);control.resize(1280,44);control.layoutSizingVertical='FIXED';}
  await sfonts(field);for(const text of field.findAllWithCriteria({types:['TEXT']}))if(text.name==='Value')gfill(text,'content/muted/neutral');
  await siconButton(dock,'Plus','Прикрепить файл','md');await sinstance(dock,'iconButtonGhost',{Icon:siconId('ArrowUp')},{Size:'md',State:'Disabled'});
}
for(const theme of ['Light','Dark']){
  const {workspace,body}=await sapp(theme,'Сегодня');
  const hero=gframe(body,'DailyHeader composition','HORIZONTAL',1376);hero.itemSpacing=24;hero.counterAxisAlignItems='CENTER';const date=gframe(hero,'Local date','VERTICAL',1260);date.itemSpacing=6;await sgtext(date,SLOY_DATA.dateLabel,1260,'title');await sgtext(date,'Сегодня',1260,'caption','content/secondary/neutral');await siconButton(hero,'Clock','Обновить день');
  await sinstance(body,'Tabs/3',{'Label 1':'Обзор','Label 2':'Задачи · 3','Label 3':'Заметки · 1'},{Active:'1'});
  const columns=gframe(body,'Overview main and companion flow','HORIZONTAL',1376);columns.itemSpacing=32;columns.counterAxisAlignItems='MIN';
  const main=gframe(columns,'Next actions and notes','VERTICAL',832);main.itemSpacing=24;
  const heading=gframe(main,'Next actions heading','HORIZONTAL',832);heading.itemSpacing=20;await sgtext(heading,'Следующие шаги',640,'label');await sinstance(heading,'secondaryButton',{Label:'Задача'},{Size:'sm',State:'Default'});
  const focus=gcard(main,'Current task',832);await sgtext(focus,'Начать с этого',784,'caption','content/secondary/neutral');await sgtext(focus,SLOY_DATA.tasks[0].title,784,'title');await sgtext(focus,SLOY_DATA.tasks[0].description,784,'body','content/secondary/neutral');const actions=gframe(focus,'Independent complete and open','HORIZONTAL',784);actions.itemSpacing=12;await sinstance(actions,'primaryButton',{Label:'Готово'},{Size:'md',State:'Default'});await sinstance(actions,'secondaryButton',{Label:'Открыть задачу'},{Size:'md',State:'Default'});
  for(const task of SLOY_DATA.tasks.slice(1))await sinstance(main,'TaskRow',{Title:task.title,Meta:task.meta},{State:'Default'});
  await sgtext(main,'Заметки',832,'label');await sinstance(main,'NoteCard',{Title:'Принципы личного пространства',Excerpt:SLOY_DATA.noteExcerpt,Meta:'Из документации Sloy','Show export status':false},{State:'Default'});
  const companion=gframe(columns,'Agenda and meeting summaries','VERTICAL',512);companion.itemSpacing=24;
  await sgtext(companion,'Расписание',512,'label');await sinstance(companion,'WeekStrip',{}, {Selected:SLOY_DATA.selectedWeekDay});
  await sgtext(companion,'Сегодня',512,'label');await sgtext(companion,'В расписании свободно',512,'body','content/secondary/neutral');await sgtext(companion,'События появятся после первой успешной синхронизации.',512,'caption','content/muted/neutral');
  await sgtext(companion,'Записи встреч',512,'label');const meeting=gframe(companion,'Voice Notes state','HORIZONTAL',512);meeting.itemSpacing=12;await sicon(meeting,'Mic','content/muted/neutral',20);const copy=gframe(meeting,'Source connection hint','VERTICAL',468);copy.itemSpacing=6;await sgtext(copy,'Voice Notes',468,'body');await sgtext(copy,'Подключите источник для загрузки записей.',468,'caption','content/muted/neutral');
  await scapture(workspace);
}
for(const theme of ['Light','Dark']){
  const {workspace,body}=await sapp(theme,'Библиотека');
  const title=gframe(body,'Library heading','HORIZONTAL',1376);title.itemSpacing=24;const copy=gframe(title,'Library purpose','VERTICAL',1260);copy.itemSpacing=6;await sgtext(copy,'Библиотека',1260,'title');await sgtext(copy,'Ссылки, мысли и файлы в одном месте.',1260,'body','content/secondary/neutral');await siconButton(title,'Clock','Обновить библиотеку');
  const collections=gframe(body,'Collections controls','HORIZONTAL',1376);collections.itemSpacing=12;collections.counterAxisAlignItems='CENTER';await sicon(collections,'Layers','content/muted/neutral',16);await sgtext(collections,'Коллекции',160,'caption','content/secondary/neutral');await sinstance(collections,'secondaryButton',{Label:'Создать коллекцию'},{Size:'sm',State:'Default'});
  const split=gframe(body,'Library list and persistent reader','HORIZONTAL',1376);split.itemSpacing=24;split.counterAxisAlignItems='MIN';
  const inbox=gframe(split,'Inbox list','VERTICAL',628);inbox.itemSpacing=20;await sinstance(inbox,'Tabs/5',{}, {Active:'1'});
  const toolbar=gframe(inbox,'Library search filters and view','HORIZONTAL',628);toolbar.itemSpacing=12;toolbar.counterAxisAlignItems='CENTER';const search=await sinstance(toolbar,'input',{'Show label':false,'Show hint':false,Value:'Найти среди сохранённого…','Show leading icon':true,'Leading icon':siconId('Search')},{Size:'md',State:'Default'});search.resize(470,search.height);search.layoutSizingVertical='HUG';await siconButton(toolbar,'Filter','Фильтры');await siconButton(toolbar,'Grid2X2','Показать сеткой');const list=await siconButton(toolbar,'List','Показать списком');gfill(list,'surface/tertiary/neutral-active');
  await sgtext(inbox,'Сохранено для вас',628,'label');await sgtext(inbox,SLOY_DATA.materials.length+' материала',628,'caption','content/secondary/neutral');
  for(let index=0;index<SLOY_DATA.materials.length;index++){const material=SLOY_DATA.materials[index];await sinstance(inbox,'ContentCard',{Title:material.title,Excerpt:material.excerpt,Meta:material.path+' · '+(index===0?'Открыто':'Файл'),'Show description':false},{Layout:'List',State:index===0?'Selected':'Default'});}
  await sinstance(split,'ReaderPanel',{Title:SLOY_DATA.materials[0].title,Source:SLOY_DATA.materials[0].path,Body:SLOY_DATA.materialBody,Summary:SLOY_DATA.materialExcerpt},{View:'Content'});
  await scapture(workspace);
}
return greport(sloyLayoutPage,sloyLayoutRoot,{screens:['Today Light','Today Dark','Library Light','Library Dark'],sampleSource:'Real Sloy repository excerpts and acceptance-plan demonstration tasks; no live provider state or server material records claimed',navigation:'Left rail switches /today and /library; local tabs stay within the mini-app',sloyComponentIds:SLOY_IDS.sloy});
