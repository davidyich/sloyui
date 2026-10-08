// Optional browser regression: PLAYWRIGHT_MODULE points to an existing Playwright installation.
// Start the isolated catalogue on 4327 first. No dependency installation is needed.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true});
const out='artifacts/size-check'; await mkdir(out,{recursive:true});
const report={outline:[],geometry:[],mobile:[],modals:[],errors:[]};
const accents=['neutral','rose','pink','fuchsia','purple','violet','indigo','blue','sky','cyan','teal','emerald','green','lime','yellow','amber','orange','red'];
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
page.on('pageerror',error=>report.errors.push(error.message));
const base=process.env.SIZE_CHECK_URL || 'http://127.0.0.1:4327';
const metrics=locator=>locator.evaluate(el=>{const r=el.getBoundingClientRect(),c=getComputedStyle(el),svg=el.querySelector('svg');return {height:r.height,width:r.width,font:parseFloat(c.fontSize),padding:parseFloat(c.paddingLeft),icon:svg?.getBoundingClientRect().width,bg:c.backgroundColor,border:c.borderTopColor,borderWidth:parseFloat(c.borderTopWidth),outline:parseFloat(c.outlineWidth)};});
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<.1,`${message}: expected ${b}, got ${a}`);
try {
 await page.goto(`${base}/tests/browser/control-sizes.html`);await page.waitForSelector('#outline');await page.evaluate(()=>document.fonts.ready);
 // Actual pointer hover/press and keyboard focus, not synthetic data-state attributes.
 if(!process.argv.includes('--sizes-only')) for(const theme of ['light','dark']) for(const surface of ['base','canvas','raised','floating']) for(const borders of ['off','on']) for(const accent of accents) {
  await page.evaluate(context=>{const el=document.getElementById('outline-scope');Object.assign(el.dataset,context);}, {theme,surface,borders,accent});
  await page.mouse.move(1,1);await page.waitForTimeout(20);
  const button=page.locator('#outline'),normal=await metrics(button),secondary=await metrics(page.locator('#secondary'));
  assert.equal(normal.bg,'rgba(0, 0, 0, 0)',JSON.stringify({theme,surface,borders,accent,normal}));
  assert.notEqual(normal.bg,secondary.bg);assert.ok(normal.borderWidth>0);assert.ok(!normal.border.endsWith('/ 0)')&&normal.border!=='rgba(0, 0, 0, 0)');
  await button.hover();await page.waitForTimeout(20);const hover=await metrics(button);
  await page.mouse.down();await page.waitForTimeout(20);const pressed=await metrics(button);await page.mouse.up();
  assert.notEqual(hover.bg,normal.bg);assert.notEqual(pressed.bg,hover.bg);assert.equal(hover.border,normal.border);assert.equal(pressed.border,normal.border);
  const disabled=await metrics(page.locator('#disabled-outline'));assert.ok(disabled.borderWidth>0);assert.ok(!disabled.border.endsWith('/ 0)'));
  report.outline.push({theme,surface,borders,accent,normal,hover,pressed,disabled});
 }
 if(report.outline.length){await writeFile(`${out}/outline-report.json`,JSON.stringify(report.outline,null,2));console.log(`Outline: ${report.outline.length} contexts passed`);}
 await page.evaluate(()=>document.documentElement.dataset.theme='light');
 await page.locator('#outline').focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
 assert.ok((await metrics(page.locator('#outline'))).outline>0,'Outline keyboard focus is visible');
 const before=await page.locator('#clicks').textContent(),disabledRect=await page.locator('#disabled-outline').boundingBox();
 await page.mouse.click(disabledRect.x+disabledRect.width/2,disabledRect.y+disabledRect.height/2);assert.equal(await page.locator('#clicks').textContent(),before,'Disabled cannot activate');
 for(const size of ['xs','sm','md','lg','xl']) {
  const root=page.locator(`#size-${size}`),target={xs:22,sm:28,md:32,lg:36,xl:44}[size];
  const button=await metrics(page.locator(`#button-${size}`));near(button.height,target,`${size} Button`);
  near((await metrics(page.locator(`#icon-${size}`))).width,target,`${size} IconButton`);
  for(const label of [`${size} input`,`${size} select`,`${size} combo`]) near((await metrics(page.getByLabel(label,{exact:true}))).height,target,label);
  near((await metrics(root.locator('.cap-tag').first())).height,target,`${size} Tag`);
  near((await metrics(root.getByRole('group',{name:`${size} group`,exact:true}))).height,target,`${size} ButtonGroup`);
  near((await metrics(page.getByRole('button',{name:`${size} toolbar icon`,exact:true}))).height,target,`${size} ActionBar child`);
  near((await metrics(page.getByRole('button',{name:`${size} overridden icon`,exact:true}))).height,24,`${size} nested SM override`);
  near((await metrics(page.getByRole('button',{name:`${size} floating icon`,exact:true}))).height,target,`${size} FloatingActionBar child`);
  const all=await root.evaluate(el=>Array.from(el.querySelectorAll('.cap-button,.cap-input,.cap-tag,.cap-counter,.cap-avatar,.cap-icon-box,.cap-checkbox,.cap-radio,.cap-switch,.cap-slider,.cap-number-field,.cap-color-trigger,.cap-tree-item,.cap-segment,.cap-tab-list button,.cap-icon-option')).map(n=>({class:n.className,label:n.getAttribute('aria-label'),height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width,font:getComputedStyle(n).fontSize})));
  report.geometry.push({size,target,controls:all});
 }
 const xl=page.locator('#size-xl');
 const familyChecks=[['.cap-avatar',48],['.cap-icon-box',64],['.cap-counter[data-size="xl"]:not(.cap-tag .cap-counter)',32],['.cap-checkbox',24],['.cap-radio',24],['.cap-switch',32],['.cap-slider',44],['.cap-number-field',44],['.cap-color-trigger',44],['.cap-multiselect-box',44],['.cap-tree-item',48],['.cap-segment > span',44],['.cap-tab-list button',44],['.cap-navigation-items > a',44]];
 for(const radius of ['compact','default','rounded']) {
  await page.evaluate(radius=>document.documentElement.dataset.radius=radius,radius);
  const selectInsets=await page.getByLabel('xl select',{exact:true}).evaluate(el=>{const a=el.getBoundingClientRect(),b=el.querySelector('svg').getBoundingClientRect();return {right:a.right-b.right,top:b.top-a.top,bottom:a.bottom-b.bottom}});assert.ok(Math.abs(selectInsets.right-selectInsets.top)<=.51&&Math.abs(selectInsets.bottom-selectInsets.top)<=.1,`XL Select inset in ${radius}: ${JSON.stringify(selectInsets)}`);
  const insideGap=await page.getByLabel('xl inside select',{exact:true}).evaluate(el=>el.querySelector('svg').getBoundingClientRect().left-el.querySelector('span').getBoundingClientRect().right);assert.ok(insideGap>=8,`XL inside Select text clears arrow in ${radius}: ${insideGap}`);
  const pill=await xl.locator('.cap-tag[data-shape="pill"]').evaluate(el=>({radius:parseFloat(getComputedStyle(el).borderRadius),height:el.getBoundingClientRect().height}));assert.ok(pill.radius>=pill.height/2,`Pill remains round in ${radius}`);
 }
 await page.evaluate(()=>document.documentElement.dataset.radius='default');
 const groupOutline=await metrics(page.locator('#group-outline'));assert.notEqual(groupOutline.border,'rgba(0, 0, 0, 0)');assert.ok(!groupOutline.border.endsWith('/ 0)'),'Attached Outline keeps its edge');
 for(const [selector,height]of familyChecks) near((await metrics(xl.locator(selector).first())).height,height,`XL ${selector}`);
 for(const selector of ['.cap-button[data-size="xl"] > svg','.cap-tag[data-size="xl"] svg','.cap-select-trigger > svg','.cap-combobox-leading','.cap-number-field button svg'])near(await xl.locator(selector).first().evaluate(el=>el.getBoundingClientRect().width),20,selector);
 const rects=await xl.locator('.cap-labeled-control:has(input[type="search"])').first().evaluate(el=>{const inp=el.querySelector('input'),label=el.querySelector('label'),icon=el.querySelector('.cap-field-leading svg'),clear=el.querySelector('.cap-field-trailing');return {input:inp.getBoundingClientRect().toJSON(),label:label.getBoundingClientRect().toJSON(),icon:icon.getBoundingClientRect().toJSON(),clear:clear.getBoundingClientRect().toJSON(),start:parseFloat(getComputedStyle(inp).paddingLeft),end:parseFloat(getComputedStyle(inp).paddingRight)}});
 assert.ok(rects.input.x+rects.start>=rects.icon.right+6,'Input text clears leading icon');assert.ok(rects.input.right-rects.end<=rects.clear.x,'Input text clears trailing action');assert.ok(rects.label.x>=rects.icon.right+6,'Inside label clears leading icon');
 await page.getByRole('button',{name:'xl popover',exact:true}).click();const popupButton=page.getByRole('button',{name:'Popup action',exact:true});near((await metrics(popupButton)).height,28,'Popup content keeps its own SM size');await page.keyboard.press('Escape');
 for(const modal of ['dialog','left drawer','right drawer','bottom drawer']) {
  await page.getByRole('button',{name:`Open XL ${modal}`,exact:true}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();
  near((await metrics(dialog)).width,modal==='left drawer'||modal==='right drawer'?768:1024,`Desktop XL ${modal}`);await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 }
 for(const theme of ['light','dark']) {
  await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
  await xl.screenshot({path:`${out}/xl-${theme}.png`});
  for(const width of [390,320]) {
   await page.mouse.click(1,1);await page.setViewportSize({width,height:844});await page.waitForTimeout(200);
   const over=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(over.scroll<=width,`Fixture overflows at ${width}: ${over.scroll}; ${await page.evaluate(()=>JSON.stringify(Array.from(document.querySelectorAll('body *')).filter(el=>el.getBoundingClientRect().right>innerWidth+1).map(el=>({class:el.className,role:el.getAttribute('role'),right:el.getBoundingClientRect().right})).slice(0,12)))}`);report.mobile.push({theme,...over});
   for(const modal of ['dialog','left drawer','right drawer','bottom drawer']) {
    await page.getByRole('button',{name:`Open XL ${modal}`,exact:true}).click();const dialog=page.getByRole('dialog');await dialog.waitFor();
    const r=await dialog.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width+.1,`${modal} fits ${width}`);report.modals.push({theme,width,modal,...r});await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   }
   await xl.screenshot({path:`${out}/xl-${theme}-${width}.png`});
  }
  await page.setViewportSize({width:1440,height:1000});
 }
 // A touch viewport has larger minimum targets; XL stays 44px, groups reserve their inset.
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 await mobile.goto(`${base}/tests/browser/control-sizes.html`);await mobile.waitForSelector('#button-xl');
 near((await metrics(mobile.locator('#button-xl'))).height,44,'Touch XL button');
 near((await metrics(mobile.getByRole('group',{name:'xl group',exact:true}))).height,48,'Touch attached group includes padding');
 near((await metrics(mobile.getByRole('button',{name:'xl grouped icon',exact:true}))).height,44,'Touch grouped hit target');
 const touchOverflow=await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(touchOverflow,false,'No touch overflow');await mobile.close();
 // Real catalogue XL setting, separate from the exhaustive fixture.
 await page.goto(`${base}/#Button`);await page.getByRole('combobox',{name:'Размер',exact:true}).click();await page.getByRole('option',{name:'xl',exact:true}).click();
 await page.getByRole('combobox',{name:'Стиль',exact:true}).click();await page.getByRole('option',{name:'outline',exact:true}).click();
 await page.screenshot({path:`${out}/catalogue-outline-xl.png`});
 assert.equal(report.errors.length,0,report.errors.join('\n'));
 console.log('Size geometry, Light/Dark, mobile, modal and catalogue checks passed');
} catch(error) {report.errors.push(error.stack);throw error;} finally {await writeFile(`${out}/browser-report.json`,JSON.stringify(report,null,2));await browser.close();}
