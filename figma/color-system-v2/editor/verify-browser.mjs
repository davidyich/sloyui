// Execute only through the authorized CUA browser handles: verify(tab, browser).
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=new URL('../../../artifacts/unified-palette-browser/',import.meta.url);
export async function verify(tab,browser){
 const report={checkedAt:new Date().toISOString(),flows:[],viewports:[],errors:[]};
 const ok=name=>report.flows.push(name);
 const radio=name=>tab.playwright.getByRole('radio',{name,exact:true});
 const button=name=>tab.playwright.getByRole('button',{name,exact:true});
 const tabItem=name=>tab.playwright.getByRole('tab',{name,exact:true});
 const select=async(name,value)=>{await tab.playwright.getByRole('combobox',{name,exact:true}).click();await tab.playwright.getByRole('option',{name:value,exact:true}).click();};
 const setTheme=async theme=>{const current=await tab.playwright.locator('html').getAttribute('data-theme');if(current!==theme.toLowerCase())await button(theme==='Dark'?'Включить тёмную тему':'Включить светлую тему').click();};
 const setSurface=async value=>{await button('Поверхность').click();await tab.playwright.getByRole('option',{name:value,exact:true}).click();};
 const viewport=await browser.capabilities.get('viewport');
 const setViewport=async(width,height)=>{let w=width,h=height;for(let i=0;i<3;i++){await viewport.set({width:w,height:h});const actual=await tab.playwright.evaluate(()=>({width:innerWidth,height:innerHeight}));if(Math.abs(actual.width-width)<=1&&Math.abs(actual.height-height)<=1)return;w=Math.round(w*width/actual.width);h=Math.round(h*height/actual.height);}};
 const panels=()=>tab.playwright.evaluate(()=>[...document.querySelectorAll('aside,main')].filter(e=>e.getBoundingClientRect().width).map(e=>({className:e.className,width:e.clientWidth,scrollWidth:e.scrollWidth,height:e.clientHeight,scrollHeight:e.scrollHeight})));
 const paletteColors=()=>tab.playwright.evaluate(()=>[...document.querySelectorAll('.cap-pl-base-step')].map(e=>({name:e.getAttribute('aria-label'),paint:getComputedStyle(e).backgroundColor})));
 await fs.mkdir(out,{recursive:true});
 try{
  await setViewport(1440,900);await tab.reload();await setTheme('Light');await button('Все цвета').click();
  assert.equal(await tab.playwright.locator('.cap-pl-properties').count(),0);assert.equal(await tab.playwright.getByRole('tablist').count(),0);
  const count=await tab.playwright.locator('.cap-pl-color-card').count();assert.ok(count>=1);assert.equal(await tab.playwright.locator('.cap-pl-color-specimen').count(),count);
  ok('Overview shows each project color in the selected environment');
  await tab.playwright.locator('.cap-pl-color-list').getByRole('button',{name:'purple',exact:true}).click();assert.equal(await tab.playwright.locator('.cap-pl-properties').count(),1);assert.equal(await tab.playwright.getByRole('tab').count(),5);
  await tabItem('Палитра').click();await radio('Растяжка').check();assert.equal(await tab.playwright.locator('.cap-pl-base-ramp').count(),1);
  for(const steps of ['21','25','33','41','49']){await select('Ступени',steps);assert.equal(await tab.playwright.locator('.cap-pl-base-step').count(),Number(steps));}
  await select('Ступени','41');
  const lightPalette=await paletteColors();await setTheme('Dark');assert.deepEqual(await paletteColors(),lightPalette);await setSurface('Invert');assert.deepEqual(await paletteColors(),lightPalette);await setSurface('Content');await setTheme('Light');
  ok('Exactly one ramp supports 21/25/33/41/49 steps; theme and surface preserve every RGB');
  await fs.writeFile(new URL('unified-palette.jpg',out),await tab.screenshot({fullPage:false}));
  const first=tab.playwright.locator('.cap-pl-base-step').first();await first.click();await tab.playwright.getByRole('status').filter({hasText:/Скопировано|Буфер обмена недоступен/}).waitFor({state:'visible'});const copyFeedback=await tab.playwright.getByRole('status').innerText();report.clipboard=copyFeedback;assert.equal(await tab.playwright.getByRole('dialog').count(),0);await first.press('Tab');assert.ok(await tab.playwright.getByRole('tooltip').count()>=1);await first.press('Escape');ok(copyFeedback==='Скопировано.'?'Swatch copies on click and explains on focus':'Swatch reports unavailable browser clipboard and explains on focus');
  await tabItem('Правки').click();assert.equal(await tab.playwright.locator('.cap-pl-overrides-step').count(),41);assert.equal(await tab.playwright.locator('.cap-pl-overrides').getByRole('combobox').count(),0);
  await button('Редактировать ступень 20').click();await tab.playwright.getByRole('textbox',{name:'HEX',exact:true}).fill('#7854E8');await button('Сохранить точку').click();assert.equal(await tab.playwright.getByRole('textbox',{name:'HEX',exact:true}).getAttribute('value'),'#7854E8');await setTheme('Dark');assert.equal(await tab.playwright.getByRole('textbox',{name:'HEX',exact:true}).getAttribute('value'),'#7854E8');await button('Отменить изменение').click();ok('A manual anchor edits the shared ramp without a scale or theme selector');
  await tabItem('Палитра').click();
  const left=tab.playwright.getByRole('separator',{name:'Ширина меню',exact:true}),right=tab.playwright.getByRole('separator',{name:'Ширина параметров',exact:true});
  for(const separator of [left,right])for(const key of ['Home','End']){await separator.press(key);assert.ok((await panels()).every(p=>p.scrollWidth<=p.width),JSON.stringify(await panels()));}
  const before=await panels();await tab.reload();const after=await panels();assert.ok(before.every((p,i)=>Math.abs(p.width-after[i].width)<=1));ok('Panel widths persist and keyboard limits contain content');
  await tabItem('Образцы').click();await setTheme('Light');assert.equal(await tab.playwright.locator('.cap-pl-preview').count(),1);await setSurface('Invert');assert.equal(await tab.playwright.locator('html').getAttribute('data-theme'),'light');assert.equal(await tab.playwright.locator('.cap-pl-preview').getAttribute('aria-label'),'Light Invert preview');
  const lightInvert=await tab.playwright.locator('.cap-pl-preview').evaluate(e=>getComputedStyle(e).backgroundColor);await setTheme('Dark');const darkInvert=await tab.playwright.locator('.cap-pl-preview').evaluate(e=>getComputedStyle(e).backgroundColor);assert.notEqual(lightInvert,darkInvert);await setSurface('Content');ok('Theme and surface change semantic previews while palette colors stay shared');
  await tabItem('Палитра').click();await radio('Роли').check();assert.equal(await tab.playwright.locator('.cap-pl-ramp-row').count(),70);ok('Contextual roles stay separate from the shared palette');
  await button('Палитры').click();assert.equal(await tab.playwright.locator('.cap-pl-properties').count(),0);assert.equal(await tab.playwright.locator('.cap-pl-ramp-strip').count(),count);await button('Поверхности').click();assert.equal(await tab.playwright.locator('.cap-pl-surface-sheet').count(),7);await button('Материалы').click();assert.equal(await tab.playwright.locator('.cap-pl-material-window').count(),1);ok('Collection palette has exactly one ramp per hue');
  await tab.playwright.locator('.cap-pl-color-list').getByRole('button',{name:'purple',exact:true}).click();await tabItem('Палитра').click();await radio('Растяжка').check();
  for(const [width,height]of [[320,568],[390,620],[760,600],[1100,700],[1440,900],[720,450]]){
   await setViewport(width,height);const m=await tab.playwright.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}));assert.equal(m.scrollWidth,m.width);assert.equal(m.scrollHeight,m.height);const measurements=await panels();assert.ok(measurements.every(p=>p.scrollWidth<=p.width),JSON.stringify(measurements));report.viewports.push({requestedWidth:width,requestedHeight:height,...m,panels:measurements});
  }ok('Shared palette reflows on narrow and short screens without document overflow');
  await setViewport(390,844);await fs.writeFile(new URL('unified-palette-mobile.jpg',out),await tab.screenshot({fullPage:false}));await button('Параметры').click();
  const fields=await tab.playwright.evaluate(()=>[...document.querySelectorAll('[role=dialog] input')].filter(e=>['number','text'].includes(e.type)&&e.getBoundingClientRect().height>2&&!e.closest('[inert]')).map(e=>({font:getComputedStyle(e).fontSize,height:e.getBoundingClientRect().height})));assert.ok(fields.every(e=>parseFloat(e.font)>=16&&e.height>=43.9),JSON.stringify(fields));
  await tab.playwright.getByRole('textbox',{name:'Имя токена',exact:true}).press('Escape');assert.equal(await tab.playwright.evaluate(()=>document.activeElement?.textContent),'Параметры');ok('Mobile inspector keeps accessible fields and restores focus');
  await setViewport(1440,900);report.errors=(await tab.dev.logs({levels:['error'],limit:20})).map(x=>x.message);assert.equal(report.errors.length,0);
 }catch(e){report.errors.push(e.message);throw e;}finally{await fs.writeFile(new URL('editor-browser-verification.json',out),JSON.stringify(report,null,2)+'\n');}
 return report;
}
