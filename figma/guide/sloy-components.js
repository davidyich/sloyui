const {page:sloyComponentPage,root:sloyComponentRoot}=await sroot('03 · Components','Sloy · daily workspace components');
await sset(sloyComponentPage,'RailItem',{State:['Default','Selected']},44,async(set,variants)=>{
  const icon=sproperty(set,'Icon','INSTANCE_SWAP',siconId('CalendarDays'));const label=sproperty(set,'Label','TEXT','Сегодня');const show=sproperty(set,'Show label','BOOLEAN',false);
  for(const v of variants){v.layoutMode='VERTICAL';v.counterAxisAlignItems='CENTER';v.paddingTop=v.paddingBottom=10;v.paddingLeft=v.paddingRight=10;v.itemSpacing=4;sradius(v);if(v.variantProperties.State==='Selected')gfill(v,'surface/secondary-normal','Accent');
    await sicon(v,'CalendarDays',v.variantProperties.State==='Selected'?'content':'content/muted/neutral',24,icon,v.variantProperties.State==='Selected'?'Accent':'Surface');
    const text=await stext(v,'Сегодня',56,label,'caption');sshow(text,show,false);
  }
});
for(const count of [3,5])await sset(sloyComponentPage,'Tabs/'+count,{Active:Array.from({length:count},(_,i)=>String(i+1))},count===3?800:620,async(set,variants)=>{
  const defaults=count===3?['Обзор','Задачи','Заметки']:['Входящие','Все материалы','Избранное','Просмотрено','Архив'];const keys=defaults.map((label,i)=>sproperty(set,'Label '+(i+1),'TEXT',label));
  for(const v of variants){v.layoutMode='HORIZONTAL';v.primaryAxisSizingMode='FIXED';v.counterAxisSizingMode='AUTO';v.layoutSizingHorizontal='FIXED';v.layoutSizingVertical='HUG';v.counterAxisAlignItems='CENTER';v.itemSpacing=8;
    for(let i=0;i<count;i++){const item=gframe(v,'Tab '+(i+1),'VERTICAL');item.paddingTop=10;item.paddingBottom=10;item.paddingLeft=8;item.paddingRight=8;item.itemSpacing=8;const t=await stext(item,defaults[i],count===3?112:98,keys[i],'label','content/secondary/neutral');if(v.variantProperties.Active===String(i+1))gfill(t,'content','Accent');t.textAutoResize='WIDTH_AND_HEIGHT';t.layoutSizingHorizontal='HUG';
      const line=figma.createRectangle();item.appendChild(line);line.name='Selected indicator';line.resize(count===3?112:98,2);gfill(line,'content','Accent');line.visible=v.variantProperties.Active===String(i+1);
    }
  }
});
await sset(sloyComponentPage,'Segmented',{Active:['1','2']},220,async(set,variants)=>{
  const labels=['Список','Доска'];const keys=labels.map((t,i)=>sproperty(set,'Label '+(i+1),'TEXT',t));const icons=[sproperty(set,'Icon 1','INSTANCE_SWAP',siconId('List')),sproperty(set,'Icon 2','INSTANCE_SWAP',siconId('Grid2X2'))];
  for(const v of variants){v.layoutMode='HORIZONTAL';v.primaryAxisSizingMode='FIXED';v.counterAxisSizingMode='AUTO';v.layoutSizingHorizontal='FIXED';v.layoutSizingVertical='HUG';v.paddingTop=v.paddingBottom=v.paddingLeft=v.paddingRight=4;v.itemSpacing=4;sradius(v);gfill(v,'surface/tertiary/neutral-normal');
    for(let i=0;i<2;i++){const item=gframe(v,'Choice '+(i+1),'HORIZONTAL',102);item.paddingTop=item.paddingBottom=6;item.paddingLeft=item.paddingRight=8;item.itemSpacing=6;item.counterAxisAlignItems='CENTER';sradius(item);if(v.variantProperties.Active===String(i+1))gfill(item,'surface/block');await sicon(item,i?'Grid2X2':'List','content/primary/neutral',16,icons[i]);await stext(item,labels[i],64,keys[i],'caption');}
  }
});
await sset(sloyComponentPage,'TaskRow',{State:['Default','Overdue','Complete']},800,async(set,variants)=>{
  const title=sproperty(set,'Title','TEXT','Проверить библиотеку компонентов');const meta=sproperty(set,'Meta','TEXT','Сегодня');const show=sproperty(set,'Show status','BOOLEAN',false);
  for(const v of variants){v.layoutMode='HORIZONTAL';v.primaryAxisSizingMode='FIXED';v.counterAxisSizingMode='AUTO';v.layoutSizingHorizontal='FIXED';v.layoutSizingVertical='HUG';v.counterAxisAlignItems='CENTER';v.paddingTop=v.paddingBottom=8;v.paddingLeft=v.paddingRight=8;v.itemSpacing=12;sradius(v);
    await sinstance(v,'checkbox',{'Show label':false},{Value:v.variantProperties.State==='Complete'?'On':'Off',State:'Default'});
    const copy=gframe(v,'Task content','VERTICAL',688);copy.layoutSizingHorizontal='FILL';copy.itemSpacing=4;const text=await stext(copy,'Проверить библиотеку компонентов',688,title,'body',v.variantProperties.State==='Complete'?'content/muted/neutral':'content/primary/neutral');text.textDecoration='NONE';
    await stext(copy,v.variantProperties.State==='Overdue'?'Просрочено':'Сегодня',688,meta,'caption',v.variantProperties.State==='Overdue'?'content/primary/red':'content/secondary/neutral');
    const tag=await sinstance(copy,'Tag',{Label:'В работе'},{Appearance:'Plain',State:'Default'});sshow(tag,show,false);await siconButton(v,'MoreHorizontal','Изменить задачу');
  }
});
await sset(sloyComponentPage,'ContentCard',{Layout:['List','Grid'],State:['Default','Selected']},600,async(set,variants)=>{
  const title=sproperty(set,'Title','TEXT','Sloy product composition');const excerpt=sproperty(set,'Excerpt','TEXT',SLOY_DATA.materialExcerpt);const meta=sproperty(set,'Meta','TEXT','DESIGN.md · Файл');const show=sproperty(set,'Show description','BOOLEAN',false);const cover=sproperty(set,'Cover icon','INSTANCE_SWAP',siconId('FileText'));
  for(const v of variants){const grid=v.variantProperties.Layout==='Grid';v.resize(grid?286:600,32);gspace(v,'md','stack-sm');sradius(v,'xl');gfill(v,'surface/block');sborder(v,'border/subtle');if(v.variantProperties.State==='Selected')sborder(v,'border/normal','Accent');
    if(grid){const preview=gframe(v,'16:10 type preview','VERTICAL',256);preview.resize(256,160);preview.layoutSizingVertical='FIXED';preview.primaryAxisSizingMode='FIXED';preview.primaryAxisAlignItems='CENTER';preview.layoutSizingHorizontal='FILL';preview.counterAxisAlignItems='CENTER';gfill(preview,'surface/tertiary/neutral-normal');sradius(preview);await sicon(preview,'FileText','content/muted/neutral',32,cover);const typeLabel=await sgtext(preview,'Документ',160,'caption','content/muted/neutral');typeLabel.textAlignHorizontal='CENTER';}
    const row=gframe(v,'Record','HORIZONTAL',grid?256:568);row.itemSpacing=12;row.counterAxisAlignItems='CENTER';row.layoutSizingHorizontal='FILL';if(!grid)await sicon(row,'FileText','content/muted/neutral',32,cover);
    const text=gframe(row,'Material text','VERTICAL',grid?256:512);text.layoutSizingHorizontal='FILL';text.itemSpacing=4;await stext(text,'Sloy product composition',grid?256:512,title,'label');await stext(text,'DESIGN.md · Файл',grid?256:512,meta,'caption','content/secondary/neutral');
    const description=await stext(v,SLOY_DATA.materialExcerpt,grid?256:568,excerpt,'body','content/secondary/neutral');sshow(description,show,grid);
    if(grid){const footer=gframe(v,'Independent actions','HORIZONTAL',256);footer.itemSpacing=8;await siconButton(footer,'Heart','В избранное');await siconButton(footer,'Check','Отметить просмотренным');}
  }
});
await sset(sloyComponentPage,'WeekStrip',{Selected:['1','2','3','4','5','6','7']},488,async(set,variants)=>{
  const days=['пн','вт','ср','чт','пт','сб','вс'];const numberKeys=days.map((_,i)=>sproperty(set,'Day '+(i+1),'TEXT',SLOY_DATA.weekDays[i]));const dots=days.map((_,i)=>sproperty(set,'Event dot '+(i+1),'BOOLEAN',false));
  for(const v of variants){v.layoutMode='HORIZONTAL';v.primaryAxisSizingMode='FIXED';v.counterAxisSizingMode='AUTO';v.layoutSizingHorizontal='FIXED';v.layoutSizingVertical='HUG';v.itemSpacing=6;for(let i=0;i<7;i++){const day=gframe(v,'Day '+(i+1),'VERTICAL',64);day.paddingTop=8;day.paddingBottom=8;day.itemSpacing=4;day.counterAxisAlignItems='CENTER';sradius(day);const selected=v.variantProperties.Selected===String(i+1);if(selected)gfill(day,'surface/primary-normal','Accent');const ink='content/primary/neutral';const weekday=await sgtext(day,days[i],48,'caption',ink);weekday.textAlignHorizontal='CENTER';if(selected)gfill(weekday,'on-primary','Accent');const number=await stext(day,SLOY_DATA.weekDays[i],48,numberKeys[i],'label',ink);number.textAlignHorizontal='CENTER';if(selected)gfill(number,'on-primary','Accent');const dot=figma.createEllipse();day.appendChild(dot);dot.name='Has events';dot.resize(3,3);gfill(dot,selected?'on-primary':'content','Accent');sshow(dot,dots[i],false);}}
});
await sset(sloyComponentPage,'AgendaItem',{State:['Default','All day']},488,async(set,variants)=>{
  const title=sproperty(set,'Title','TEXT','Обсудить сохранённые материалы');const time=sproperty(set,'Time','TEXT','09:30');const end=sproperty(set,'End','TEXT','до 10:00');
  for(const v of variants){v.layoutMode='HORIZONTAL';v.primaryAxisSizingMode='FIXED';v.counterAxisSizingMode='AUTO';v.layoutSizingHorizontal='FIXED';v.layoutSizingVertical='HUG';v.paddingTop=v.paddingBottom=8;v.itemSpacing=12;v.counterAxisAlignItems='CENTER';const times=gframe(v,'Time','VERTICAL',72);times.itemSpacing=4;await stext(times,v.variantProperties.State==='All day'?'Весь день':'09:30',72,time,'caption');await stext(times,v.variantProperties.State==='All day'?'':'до 10:00',72,end,'caption','content/secondary/neutral');const eventTitle=await stext(v,'Обсудить сохранённые материалы',344,title,'body');eventTitle.layoutSizingHorizontal='FILL';await siconButton(v,'Plus','Создать задачу к событию');}
});
await sset(sloyComponentPage,'NoteCard',{State:['Default','Exported']},800,async(set,variants)=>{
  const title=sproperty(set,'Title','TEXT','Принципы личного пространства');const body=sproperty(set,'Excerpt','TEXT',SLOY_DATA.noteExcerpt);const meta=sproperty(set,'Meta','TEXT','Заметка');const status=sproperty(set,'Export status','TEXT','Отправлено в Capacities');const show=sproperty(set,'Show export status','BOOLEAN',false);
  for(const v of variants){gspace(v,'lg','stack-sm');sradius(v,'lg');gfill(v,'surface/block');await stext(v,'Принципы личного пространства',752,title,'label');await stext(v,SLOY_DATA.noteExcerpt,752,body,'body','content/secondary/neutral');await stext(v,'Заметка',752,meta,'caption','content/muted/neutral');const text=await stext(v,'Отправлено в Capacities',752,status,'caption','content/muted/neutral');sshow(text,show,v.variantProperties.State==='Exported');}
});
await sset(sloyComponentPage,'ReaderPanel',{View:['Content','Notes','Details']},724,async(set,variants)=>{
  const title=sproperty(set,'Title','TEXT','Sloy product composition');const source=sproperty(set,'Source','TEXT','DESIGN.md');const body=sproperty(set,'Body','TEXT',SLOY_DATA.materialBody);const summary=sproperty(set,'Summary','TEXT',SLOY_DATA.materialExcerpt);
  for(const v of variants){gspace(v,'lg','stack-md');gmode(v,'Surface','Content');gfill(v,'surface/bg');sborder(v);const tools=gframe(v,'Source and actions','HORIZONTAL',676);tools.itemSpacing=12;await stext(tools,'DESIGN.md',500,source,'caption','content/secondary/neutral');await siconButton(tools,'Heart','В избранное');await siconButton(tools,'Check','Отметить просмотренным');await siconButton(tools,'MoreHorizontal','Действия с материалом');await stext(v,'Sloy product composition',676,title,'title');
    const tabs=await sinstance(v,'Tabs/3',{'Label 1':'Материал','Label 2':'Заметка','Label 3':'Детали'},{Active:v.variantProperties.View==='Content'?'1':v.variantProperties.View==='Notes'?'2':'3'});tabs.resize(676,tabs.height);tabs.layoutSizingVertical='HUG';
    if(v.variantProperties.View==='Content'){await sgtext(v,'Кратко',676,'label');await stext(v,SLOY_DATA.materialExcerpt,676,summary,'body','content/secondary/neutral');await stext(v,SLOY_DATA.materialBody,676,body,'body');}
    if(v.variantProperties.View==='Notes'){await sgtext(v,'Что стоит запомнить?',676,'label');await sgtext(v,'Сохраните вывод, цитату или собственную мысль рядом с материалом.',676,'body','content/secondary/neutral');await sinstance(v,'secondaryButton',{Label:'Добавить заметку'},{Size:'md',State:'Default'});}
    if(v.variantProperties.View==='Details'){await sgtext(v,'Организация',676,'label');await sgtext(v,'Теги · Не добавлены\nКоллекции · Без коллекции',676,'body','content/secondary/neutral');await sgtext(v,'О материале',676,'label');await sgtext(v,'Формат · Файл\nИсточник · DESIGN.md\nСодержимое · Документация проекта',676,'body','content/secondary/neutral');}
  }
});
await sgtext(sloyComponentRoot,'Слой · ежедневная работа и сохранённое',1504,'title');
await sgtext(sloyComponentRoot,'Компоненты для Today и Library: наследуемые контексты, редактируемые данные и независимые действия. Примеры используют материалы из документации Sloy.',1504);
const showRow=gframe(sloyComponentRoot,'Record examples','HORIZONTAL',1504);showRow.itemSpacing=32;
await sinstance(showRow,'ContentCard',{}, {Layout:'List',State:'Selected'});await sinstance(showRow,'ContentCard',{'Show description':true},{Layout:'Grid',State:'Default'});
await sinstance(sloyComponentRoot,'TaskRow');await sinstance(sloyComponentRoot,'NoteCard');await sinstance(sloyComponentRoot,'WeekStrip',{}, {Selected:SLOY_DATA.selectedWeekDay});await sinstance(sloyComponentRoot,'AgendaItem');
return greport(sloyComponentPage,sloyComponentRoot,{sloySets:scomponentMap(),dataSource:'Sloy repository DESIGN.md / approved plan; demonstration data, not server records',requiredControls:Object.keys(SLOY_IDS.controls),status:'Created; native readback/render acceptance remains separate'});
