'use strict';
const assert=require('assert'),{start}=require('../../../kit/scripts/play_browser.js');
(async()=>{const {browser,base,stop}=await start(process.argv.slice(2));try{for(const width of [1280,390]){
 const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/c64/wonder-boy-in-monster-land/index.html`,{waitUntil:'load'});
 const section=page.locator('#sphinx');assert.equal(await section.locator('tbody tr').count(),4);const text=await section.innerText();
 for(const word of ['CHICKEN','SARAD','KARAOKE','GOLF'])assert(text.includes(word));
 for(const a of await section.locator('a').all())assert((await a.getAttribute('href')).startsWith('source-stage-19.html#'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.goto(`${base}/c64/wonder-boy-in-monster-land/discoveries.html`,{waitUntil:'load'});
 for(const id of ['reversal','contact-patch','counter-price','trigger-opcode','two-player','add-credits'])assert.equal(await page.locator('#'+id).count(),1,id);
 assert((await page.locator('#trigger-opcode').innerText()).includes('DANGER! KEEP OUT'));
 for(const id of ['sphinx','entity-slots','full-slots','gauntlet','pool-time'])assert.equal(await page.locator('main #'+id).count(),0,id);
 for(const img of await page.locator('main img').all())assert(await img.evaluate(i=>i.complete&&i.naturalWidth>0),await img.getAttribute('src'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 assert.deepEqual(errors,[]);await page.close();}
 console.log('OK - Sphinx table on How it works and six discoveries, on desktop and mobile');}finally{await stop();}})().catch(e=>{console.error(e);process.exitCode=1;});
