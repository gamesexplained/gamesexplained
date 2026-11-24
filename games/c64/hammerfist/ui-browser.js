'use strict';
// Exercise the published controls and all stored choices in the built minisite.
const {start,watchErrors}=require('../../../kit/scripts/play_browser.js');
/* exerciseHammerfist */
async function exerciseHammerfist(page,base){
 const errors=watchErrors(page,base);
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
 }
 await page.click('#hf-g-play');await page.click('#hf-g-step');await page.selectOption('#hf-g-palette','1,1');
 await page.locator('#hf-raster').uncheck();await page.locator('#hf-raster').check();
 await page.goto(root+'levels.html');
 for(let part=0;part<4;part++){
  await page.selectOption('#hf-map-part',String(part));
  for(const value of await page.locator('#hf-map-room option').evaluateAll(os=>os.map(o=>o.value))){await page.selectOption('#hf-map-room',value);choices++;}
 }
 await page.click('#hf-map-prev');await page.click('#hf-map-next');await page.locator('#hf-grid').check();await page.locator('#hf-map').click({position:{x:30,y:30}});
 await page.goto(root+'discoveries.html');
 for(let i=0;i<4;i++)await page.click('#hf-charge-0');if(!(await page.locator('#hf-out-0').textContent()).includes('Explodes'))throw Error('Recharge overflow UI');
 for(let i=0;i<4;i++)await page.click('#hf-charge-1');if(!(await page.locator('#hf-out-1').textContent()).includes('Stays full'))throw Error('Final room recharge UI');
 await page.click('#hf-reset-0');if(!(await page.locator('#hf-out-0').textContent()).startsWith('Energy 218'))throw Error('Recharge reset');
 await page.locator('#hf-unused-music [data-tune="0"]').click();await page.waitForTimeout(200);await page.locator('#hf-unused-music [data-stop]').click();
 await page.goto(root+'index.html');
 await page.locator('canvas.hf-msg').first().click();
 await page.locator('#hf-music [data-tune="1"]').click();await page.waitForTimeout(200);await page.locator('#hf-music [data-stop]').click();
 await page.locator('#hf-effects [data-tune="1"]').click();await page.waitForTimeout(200);await page.locator('#hf-effects [data-stop]').click();
 for(const file of ['index.html','discoveries.html','graphics.html','levels.html']){
  await page.goto(root+file);const canvases=page.locator('main canvas[id^="hf-"], main canvas.hf-msg');
  // A message canvas clears and types itself again when it scrolls into view, so give it time to draw.
  for(let i=0;i<await canvases.count();i++){const c=canvases.nth(i);await c.scrollIntoViewIfNeeded();let distinct=0;
   for(let t=0;t<40&&distinct<2;t++){await page.waitForTimeout(100);distinct=await c.evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,s=new Set();for(let i=0;i<d.length;i+=4)s.add(d[i]+d[i+1]*256+d[i+2]*65536);return s.size;});}
   if(distinct<2)throw Error(file+' blank canvas '+(await c.getAttribute('id')||i));}
 }
 if(errors.length)throw Error(errors.join('\n'));return {choices,errors};
}
// end of exerciseHammerfist
async function main(){const {browser,base,stop}=await start(process.argv.slice(2));try{const page=await browser.newPage();console.log(await exerciseHammerfist(page,base));}finally{await stop();}}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={exerciseHammerfist};
