'use strict';
const assert=require('assert/strict'),path=require('path'),fs=require('fs');
const ROOT=path.resolve(__dirname,'../../..');
const {start}=require(path.join(ROOT,'kit/scripts/play_browser.js'));

async function check(browser,base,out=null) {
  const ctx=await browser.newContext({viewport:{width:1280,height:900}}),page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('fonts.googleapis'))errors.push(m.text());});
  const url=file=>`${base}/c16/cuthbert-in-the-cooler/${file}.html`;
  async function go(file){await page.goto(url(file));await page.waitForFunction(()=>globalThis.coolerReady===true);}
  async function range(id,value){await page.locator('#'+id).evaluate((el,n)=>{el.value=n;el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
  async function nonblank() {
    assert(await page.locator('main canvas').count()>0);
    for(const canvas of await page.locator('main canvas').all()) {
      const drawn=await canvas.evaluate(el=>{const d=el.getContext('2d').getImageData(0,0,el.width,el.height).data;for(let i=4;i<d.length;i+=4)if(d[i]!==d[0]||d[i+1]!==d[1]||d[i+2]!==d[2])return true;return false;});
      assert(drawn,'a visible canvas is blank');
    }
  }
  async function photos(file) {
    if(!out)return;
    fs.mkdirSync(out,{recursive:true});
    for(const section of await page.locator('main section').all()) {
      await section.scrollIntoViewIfNeeded();
      const id=await section.getAttribute('id');
      await section.screenshot({path:path.join(out,`${file}-${id}.png`)});
    }
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(out,`${file}-desktop.png`)});
  }
  await go('index');
  await range('ct-packet',23);assert.match(await page.locator('#ct-packet-readout').textContent(),/24\/24/);
  await page.locator('#ct-packet-next').click();assert.match(await page.locator('#ct-packet-readout').textContent(),/1\/24/);
  await page.locator('#ct-packet-prev').click();
  await page.locator('#ct-grid').check();await page.locator('#ct-grid').uncheck();
  await page.locator('#ct-move-right').click();assert.match(await page.locator('#ct-move-status').textContent(),/Position 37/);
  await page.locator('#ct-wall').check();await page.locator('#ct-move-right').click();assert.match(await page.locator('#ct-move-status').textContent(),/blocks/);
  await page.locator('#ct-move-left').click();assert.match(await page.locator('#ct-move-status').textContent(),/Position 36/);
  await page.locator('#ct-move-reset').click();
  await range('ct-inventory',0);assert.match(await page.locator('#ct-inventory-value').textContent(),/0 icons/);
  await range('ct-inventory',9);assert.match(await page.locator('#ct-inventory-value').textContent(),/5 icons/);
  await page.locator('#ct-ai-state').selectOption('2');
  await range('ct-ai-first',219);assert.match(await page.locator('#ct-ai-result').textContent(),/left.*retained/);
  await range('ct-ai-first',220);await range('ct-ai-fresh',44);
  assert.match(await page.locator('#ct-ai-result').textContent(),/Idle.*state 49/);
  await range('ct-ai-fresh',45);assert.match(await page.locator('#ct-ai-result').textContent(),/down.*fresh/);
  await page.locator('#ct-ai-roll').click();assert.match(await page.locator('#ct-ai-values').textContent(),/First timer read \d+ · fresh read \d+/);
  for(const name of ['Walking','Bomb and detonation','Held fire at the exit'])await page.getByRole('button',{name:new RegExp(name)}).click();
  const stop=page.getByRole('button',{name:/stop/i});if(await stop.count())await stop.last().click();
  await nonblank();await photos('index');

  await go('discoveries');
  await page.locator('#ct-add-pickup').click();assert.equal(await page.locator('#ct-score').textContent(),'001000');
  await page.locator('#ct-score-start').evaluate(el=>{el.value=900;el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#ct-pickup-type').selectOption('2');
  await page.locator('#ct-add-pickup').click();assert.equal(await page.locator('#ct-score').textContent(),'001000');
  await page.locator('#ct-seven-apples').click();assert.equal(await page.locator('#ct-score').textContent(),'001900');
  await page.locator('#ct-score-reset').click();
  await page.locator('#ct-last-safe').click();assert.match(await page.locator('#ct-life-value').textContent(),/208 attempts/);
  await page.locator('#ct-next-life').click();assert(await page.locator('#ct-overflow-image').isVisible());
  await range('ct-awards',0);assert.match(await page.locator('#ct-life-value').textContent(),/5 attempts/);
  for(let i=0;i<12;i++)await page.locator('#ct-route-next').click();
  assert.match(await page.locator('#ct-route-value').textContent(),/5 deaths · 0 attempts/);
  await range('ct-route-step',0);await photos('discoveries');

  await go('levels');
  assert.equal(await page.locator('#ct-level option').count(),256);
  await page.locator('#ct-level').evaluate(el=>{for(let n=0;n<256;n++){el.value=n;el.dispatchEvent(new Event('change'));}});
  assert.match(await page.locator('#ct-level-description').textContent(),/^Level 255/);
  await page.locator('#ct-level-next').click();assert.match(await page.locator('#ct-level-description').textContent(),/^Level 0:/);
  await page.locator('#ct-level-prev').click();
  await page.locator('#ct-inactive').check();await page.locator('#ct-inactive').uncheck();
  await page.locator('#ct-show-spawns').uncheck();await page.locator('#ct-show-spawns').check();
  await page.locator('#ct-level').selectOption('1');
  assert.equal(await page.locator('#ct-layout-table tr').count(),10);
  await nonblank();await photos('levels');

  await go('graphics');await page.locator('#ct-animate').uncheck();
  const count=await page.locator('#ct-cast option').count();assert.equal(count,15);
  for(let i=0;i<count;i++){await page.locator('#ct-cast').selectOption(String(i));await page.locator('#ct-frame-step').click();}
  await page.locator('#ct-cast-prev').click();await page.locator('#ct-cast-next').click();
  await page.locator('#ct-cast').selectOption('0');await nonblank();await photos('graphics');
  for(const width of [375,768]) {
    await page.setViewportSize({width,height:900});
    for(const file of ['index','discoveries','levels','graphics']) {
      await go(file);
      const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
      assert(size.scroll<=size.viewport+1,`${file} overflows at ${width}: ${JSON.stringify(size)}`);
      if(out)await page.screenshot({path:path.join(out,`${file}-${width}.png`)});
    }
  }
  assert.deepEqual(errors,[],'browser errors');
  console.log('OK — four tabs, every level/shape, all controls, audible-player buttons, nonblank canvases, and 375/768px layouts');
  await ctx.close();
}

(async()=>{
  const args=process.argv.slice(2),at=args.indexOf('--cdp');
  if(at>=0){const pw=require('playwright-core');const browser=await pw.chromium.connectOverCDP(args[at+1]);try{await check(browser,args[at+2]||'http://127.0.0.1:8017',args[at+3]||null);}finally{await browser.close();}}
  else {const session=await start(args);try{await check(session.browser,session.base);}finally{await session.stop();}}
})().catch(e=>{console.error(e);process.exitCode=1;});
