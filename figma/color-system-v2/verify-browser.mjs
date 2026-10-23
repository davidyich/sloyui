import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const report={url:'http://127.0.0.1:4339/preview.html',checks:[],errors:[]};
const page=await browser.newPage({viewport:{width:1280,height:1100}});
page.on('pageerror',e=>report.errors.push(e.message));
const check=name=>report.checks.push(name);
try{
 await page.goto(report.url);await page.locator('.target').first().waitFor();
 const target=page.getByRole('button',{name:'Shell Primary',exact:true});
 await target.click({position:{x:15,y:17}});assert.equal(await page.locator('.ripple').count(),0);check('Default Off preserves activation without a ripple');
 await page.locator('#reaction').click();
 const box=await target.boundingBox();await page.mouse.move(box.x+15,box.y+17);await page.mouse.down();
 let m=await target.locator('.ripple').evaluate(n=>({left:parseFloat(n.style.left),top:parseFloat(n.style.top),width:parseFloat(n.style.width),color:getComputedStyle(n).backgroundColor}));
 assert.equal(m.left,15);assert.equal(m.top,17);assert.ok(m.width>=Math.hypot(box.width-15,box.height-17)*2-.1);assert.ok(m.color.includes('0.05'));await page.mouse.up();check('Pointer origin, farthest-corner coverage and 5% layer');
 await page.waitForTimeout(520);assert.equal(await page.locator('.ripple').count(),0);check('Animation completes and removes its layer');
 await target.focus();await page.keyboard.down('Enter');m=await target.locator('.ripple').evaluate(n=>({left:parseFloat(n.style.left),top:parseFloat(n.style.top)}));assert.equal(m.left,box.width/2);assert.equal(m.top,box.height/2);await page.keyboard.up('Enter');check('Keyboard reaction starts at center');
 await page.locator('#reaction').click();assert.equal(await page.locator('.ripple').count(),0);check('Switching Off immediately removes a running reaction');
 await page.locator('#reaction').click();await page.emulateMedia({reducedMotion:'reduce'});await target.focus();await page.keyboard.down(' ');
 m=await target.locator('.ripple').evaluate(n=>({name:getComputedStyle(n).animationName,transform:getComputedStyle(n).transform}));assert.equal(m.name,'reaction-fade');assert.equal(m.transform,'none');await page.keyboard.up(' ');check('Reduced motion fades without expanding');
 await target.locator('.ripple').waitFor({state:'detached',timeout:700});
 await page.emulateMedia({reducedMotion:'no-preference'});
 const light=await target.evaluate(n=>getComputedStyle(n).backgroundColor);await page.locator('#theme').click();const dark=await target.evaluate(n=>getComputedStyle(n).backgroundColor);assert.notEqual(light,dark);check('Theme updates live consumer colors');
 const standard=await page.locator('[data-v2-surface="Shell"].card').evaluate(n=>getComputedStyle(n).backgroundColor);await page.locator('#scheme').click();const dimmed=await page.locator('[data-v2-surface="Shell"].card').evaluate(n=>getComputedStyle(n).backgroundColor);assert.notEqual(standard,dimmed);check('Scheme updates independently of Theme');
 const accent=page.getByRole('button',{name:'Shell Accent',exact:true});const blue=await accent.evaluate(n=>getComputedStyle(n).backgroundColor);await page.locator('#accent').click();const green=await accent.evaluate(n=>getComputedStyle(n).backgroundColor);assert.notEqual(blue,green);check('Sample hue picker binds an explicit named color');
 for(const surface of ['Shell','Workspace','Content','Overlay','Glass']){const button=page.getByRole('button',{name:`${surface} Accent`,exact:true});await button.click({position:{x:12,y:12}});assert.equal(await button.locator('.ripple').count(),1);}
 check('All five surfaces support the same reaction behavior');
 await page.waitForTimeout(520);await page.screenshot({path:'artifacts/color-system-v2/reaction-desktop.png',fullPage:true});
 for(const width of [1280,390]){await page.setViewportSize({width,height:1100});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}`);}check('No document overflow at 1280 or 390 pixels');
 await page.screenshot({path:'artifacts/color-system-v2/reaction-mobile.png',fullPage:true});
 assert.equal(report.errors.length,0);check('No browser exceptions');
}catch(error){report.errors.push(error.message);throw error;}finally{await browser.close();await fs.writeFile('artifacts/color-system-v2/browser-verification.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
