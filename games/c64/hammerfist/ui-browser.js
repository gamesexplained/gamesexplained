'use strict';
// Exercise the published controls and all stored choices in the built minisite.
/* exerciseHammerfist */
async function exerciseHammerfist(page,base){
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const root=base+'/c64/hammerfist/';let choices=0;
 await page.goto(root+'graphics.html');
 for(let part=0;part<4;part++){
  await page.selectOption('#hf-g-part',String(part));
  for(const kind of ['player','actor','effect','descriptor','shape']){
   await page.selectOption('#hf-g-kind',kind);
   const values=await page.locator('#hf-g-choice option').evaluateAll(os=>os.map(o=>o.value));
   for(const value of values){await page.selectOption('#hf-g-choice',value);choices++;}
  }
  await page.locator('#hf-g-facing').check();await page.locator('#hf-g-facing').uncheck();
  await page.locator('#hf-piece').fill(await page.locator('#hf-piece').getAttribute('max'));await page.locator('#hf-piece').dispatchEvent('input');
  await page.click('#hf-piece-prev');await page.click('#hf-piece-next');
 }
 await page.click('#hf-g-play');await page.click('#hf-g-step');await page.selectOption('#hf-g-palette','1,1');
 for(const font of ['world','status','retained'])await page.selectOption('#hf-font-kind',font);
 await page.goto(root+'levels.html');
 for(let part=0;part<4;part++){
  await page.selectOption('#hf-map-part',String(part));
  for(const value of await page.locator('#hf-map-room option').evaluateAll(os=>os.map(o=>o.value))){await page.selectOption('#hf-map-room',value);choices++;}
  for(const value of await page.locator('#hf-map-animation option').evaluateAll(os=>os.map(o=>o.value))){await page.selectOption('#hf-map-animation',value);choices++;}
 }
 await page.click('#hf-map-prev');await page.click('#hf-map-next');await page.locator('#hf-grid').check();await page.click('#hf-map-play');await page.click('#hf-map-step');await page.locator('#hf-map').click({position:{x:30,y:30}});
 await page.goto(root+'discoveries.html');await page.locator('#hf-initials').fill('YAY');await page.click('#hf-initials-test');if(!(await page.locator('#hf-cheat-out').textContent()).includes('stays $F0'))throw Error('Negative initials case');await page.locator('#hf-initials').fill('YCY');await page.click('#hf-initials-test');
 await page.goto(root+'index.html');await page.locator('#hf-energy').fill('224');await page.locator('#hf-energy').dispatchEvent('input');await page.click('#hf-charge');if(!(await page.locator('#hf-energy-out').textContent()).includes('Explosion'))throw Error('Recharge overflow UI');
 await page.locator('#hf-final-room').check();await page.locator('#hf-energy').fill('224');await page.click('#hf-charge');if(!(await page.locator('#hf-energy-out').textContent()).includes('Capped safely'))throw Error('Final room recharge UI');
 await page.locator('#hf-raster').uncheck();await page.locator('#hf-raster').check();
 await page.locator('#hf-music [data-tune="7"]').click();await page.waitForTimeout(200);await page.locator('#hf-music [data-stop]').click();
 await page.locator('#hf-effects [data-tune="1"]').click();await page.waitForTimeout(200);await page.locator('#hf-effects [data-stop]').click();
 for(const file of ['index.html','graphics.html','levels.html']){
  await page.goto(root+file);const canvases=page.locator('main canvas[id^="hf-"]');
  for(let i=0;i<await canvases.count();i++){const c=canvases.nth(i);await c.scrollIntoViewIfNeeded();const distinct=await c.evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,s=new Set();for(let i=0;i<d.length;i+=4)s.add(d[i]+d[i+1]*256+d[i+2]*65536);return s.size;});if(distinct<2)throw Error(file+' blank canvas '+await c.getAttribute('id'));}
 }
 if(errors.length)throw Error(errors.join('\n'));return {choices,errors};
}
// end of exerciseHammerfist
async function main(){const {start}=require('../../../kit/scripts/play_browser.js'),{browser,base,stop}=await start(process.argv.slice(2));try{const page=await browser.newPage();console.log(await exerciseHammerfist(page,base));}finally{await stop();}}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={exerciseHammerfist};
