'use strict';
const assert=require('assert');
const slider=(page,sel,v)=>page.locator(sel).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},String(v));
const pixels=(page,sel)=>page.locator(sel).evaluate(c=>c.toDataURL());
// A picture that swaps between two states looks the same after any even number of swaps, so sample it inside the page for a while and count the different pictures seen.
const looks=(loc,ms=1200)=>loc.evaluate((c,ms)=>new Promise(done=>{const x=c.getContext('2d'),seen=new Set(),t0=performance.now();(function look(){const d=x.getImageData(0,0,c.width,c.height).data;let s=0;for(let i=0;i<d.length;i+=4)s=(s*31+d[i]+d[i+1]*7+d[i+2]*13)>>>0;seen.add(s);if(performance.now()-t0<ms)setTimeout(look,40);else done(seen.size);})();}),ms);
async function check(browser,base){const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const url=base+'/spectrum/ant-attack/';await page.goto(url+'index.html');
// The city map.
await page.waitForFunction(()=>document.querySelector('#round').options.length===10);assert.equal(await page.locator('#variant option').count(),1);let before=await pixels(page,'#city');await page.click('#rotate');assert.notEqual(await pixels(page,'#city'),before);await page.selectOption('#round','9');assert.equal(await page.locator('#variant option').count(),4);await page.selectOption('#variant','3');await page.check('#plan');await slider(page,'#cut',3);await page.locator('#city').click({position:{x:320,y:220}});assert((await page.locator('#cell-info').textContent()).includes('Column'));
// Every message button plays and turns into Stop.
const sounds=page.locator('[data-sound]');assert.equal(await sounds.count(),17);await sounds.nth(1).click();await page.waitForTimeout(100);assert.equal(await sounds.nth(1).textContent(),'Stop');assert.equal(await sounds.nth(1).getAttribute('aria-pressed'),'true');await sounds.nth(1).click();assert.notEqual(await sounds.nth(1).textContent(),'Stop');
// Hunting for the other person: walking moves you and colours SCAN; walking far enough finds them.
await page.locator('#hunt').scrollIntoViewIfNeeded();before=await pixels(page,'#hunt');await page.click('[data-move="1,0"]');assert.notEqual(await pixels(page,'#hunt'),before);assert(/squares away|Found them/.test(await page.locator('#hunt-info').textContent()));
await page.click('#hide-again');assert((await page.locator('#hunt-info').textContent()).includes('Somewhere'));
assert(await page.locator('#follow-rule').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===1&&v>150&&v<200)));
// The ant board runs on its own while it is on screen.
await page.locator('#ant-board').scrollIntoViewIfNeeded();await page.waitForTimeout(900);const turn=async()=>+((await page.locator('#ant-info').textContent()).match(/Turn (\d+)/)||[0,0])[1];const t1=await turn();await page.waitForTimeout(700);assert((await turn())>t1,'the ants keep moving');
await page.locator('#ant-board').click({position:{x:110,y:90}});
// Score, and the screen that flashes by itself.
await slider(page,'#score-round',10);assert((await page.locator('#score-info').textContent()).includes('5,000'));
await page.locator('#rebuilt').scrollIntoViewIfNeeded();assert((await looks(page.locator('#rebuilt')))>1,'the FLASH cells swap');
// Discoveries: the fuse keys add up, the race runs, the unused pictures are drawn.
await page.goto(url+'discoveries.html');for(const b of await page.locator('[data-mask]').all())if(await b.getAttribute('aria-pressed')==='false')await b.click();assert((await page.locator('#fuse-info').textContent()).includes('turn 31'));
await page.locator('#race').scrollIntoViewIfNeeded();await page.waitForFunction(()=>/Turn [1-9]/.test(document.querySelector('#race-info').textContent));await page.waitForTimeout(1200);const race=await page.locator('#race-info').textContent();const[,ant1,low]=race.match(/Ant 1 has moved (\d+) times\. The others have moved (\d+)/).map(Number);assert(ant1>low,race);await page.click('[data-sp="4"]');assert.equal(await page.locator('[data-sp="4"]').getAttribute('aria-pressed'),'true');
assert(await page.locator('#unused-pictures canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===0&&v===0)));
// The map tab.
await page.goto(url+'levels.html');await page.waitForFunction(()=>document.querySelector('#round').options.length===10);assert.equal(await page.locator('#locations tbody tr').count(),10);await page.click('#round-next');assert((await page.locator('#city-info').textContent()).includes('Rescue 2'));
// Graphics: every picture drawn at once, and the walking rows move with no button.
await page.goto(url+'graphics.html');const pics=page.locator('canvas.pics');await page.waitForFunction(()=>[...document.querySelectorAll('canvas.pics')].every(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===0&&v===0)));
let shown=0;for(const c of await pics.all())shown+=(await c.getAttribute('data-show')).split('|').flatMap(f=>f.split(' ')).filter((v,i,a)=>a.indexOf(v)===i).length;assert(shown>=60,`${shown} pictures`);assert.equal(await page.locator('main button').count(),0);
assert((await looks(page.locator('#ant-pictures canvas.pics').first()))>1,'the ants walk');
for(const file of['index','discoveries','levels','graphics']){await page.setViewportSize({width:390,height:844});await page.goto(url+file+'.html');await page.waitForTimeout(150);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert(!overflow,file+' overflows mobile width');}
assert.deepEqual(errors,[]);await page.close();console.log('PASS: four tabs; map, 17 message sounds, hunt, follow rule, ant board, score, flashing screen, fuse, race and every picture; mobile widths; no page errors.');}
module.exports={check};if(require.main===module){(async()=>{const{start}=require('../../../kit/scripts/play_browser.js');const s=await start(process.argv.slice(2));try{await check(s.browser,s.base);}finally{await s.stop();}})().catch(e=>{console.error(e);process.exit(1);});}
