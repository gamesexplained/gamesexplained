// Test of site/lib/crt.js, the CRT screen every Play tab offers: each Play page with a canvas
// loads it, gives it a "CRT screen" button and attaches it; a browser without WebGL2 never shows
// the button; switched on, it lays its own canvas over the game's, draws the game's frame again
// each time the page draws one (from the source canvas, at the page's pixel size), keeps the
// viewer's choice for every Play tab, and tells the page so that it can turn off what cannot be
// drawn through it. The shader keeps the defaults of Lottes's public-domain one.
//   node kit/scripts/test_crt_screen.js
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const LIB = path.join(ROOT, 'site', 'lib', 'crt.js');

let failed = 0;
const check = (ok, what) => { if (!ok) { failed++; console.log('FAIL ' + what); } };

// --- every Play page with a canvas offers the CRT screen
const games = path.join(ROOT, 'games');
for (const platform of fs.readdirSync(games)) {
  const dir = path.join(games, platform);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const slug of fs.readdirSync(dir)) {
    const p = path.join(dir, slug, 'play.html');
    if (!fs.existsSync(p)) continue;
    const page = fs.readFileSync(p, 'utf8'), name = `games/${platform}/${slug}/play.html`;
    if (!/<canvas\b/.test(page)) continue;
    check(page.includes('<script src="../../lib/crt.js"></script>'), name + ' loads ../../lib/crt.js');
    check((page.match(/<button\b[^>]*\bdata-crt\b[^>]*>CRT screen<\/button>/g) || []).length === 1, name + ' has one "CRT screen" button with data-crt');
    check(/\bCRT\.attach\(/.test(page), name + ' calls CRT.attach');
  }
}

// --- a page in node: a game canvas in a parent, a button, storage and animation frames
function element(tag) {
  const listeners = {};
  return { tagName: tag, style: {}, attrs: {}, listeners, width: 0, height: 0,
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; },
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
    click() { for (const f of listeners.click || []) f({}); } };
}
function glStub(log) {
  return new Proxy({}, { get(t, k) {
    if (typeof k !== 'string') return undefined;
    if (/^[A-Z0-9_]+$/.test(k)) return k;                    // a constant: its own name, for the log
    if (k === 'getShaderParameter' || k === 'getProgramParameter') return () => true;
    if (k === 'isContextLost') return () => false;
    if (k === 'getUniformLocation') return (p, n) => n;
    return (...a) => { log.push([k, ...a]); return {}; };
  } });
}
function page(opts) {
  const log = [], frames = [], store = new Map(opts.stored ? [['gamesexplained.crt', opts.stored]] : []);
  globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  globalThis.requestAnimationFrame = f => frames.push(f);
  globalThis.devicePixelRatio = 2;
  globalThis.addEventListener = () => {};
  globalThis.getComputedStyle = () => ({ position: 'static', borderRadius: '6px' });
  globalThis.ResizeObserver = class { observe() {} };
  if (opts.webgl2) globalThis.WebGL2RenderingContext = function () {}; else delete globalThis.WebGL2RenderingContext;
  const made = [];
  globalThis.document = { createElement(tag) {
    const e = element(tag); made.push(e);
    e.getContext = kind => (kind === 'webgl2' ? glStub(log) : null);
    return e;
  } };
  const parent = element('div');
  Object.assign(parent, { clientLeft: 1, clientTop: 1, scrollLeft: 0, scrollTop: 0, getBoundingClientRect: () => ({ left: 100, top: 200, width: 900, height: 700 }) });
  const cv = element('canvas');
  Object.assign(cv, { width: opts.w || 384, height: opts.h || 272, parentElement: parent,
    getBoundingClientRect: () => ({ left: 104, top: 205.5, width: 890, height: 629.25 }),
    insertAdjacentElement(where, e) { cv.inserted = [where, e]; } });
  const ctx = { putImageData() { log.push(['put']); }, drawImage() { log.push(['image']); } };
  cv.getContext = kind => (kind === '2d' ? ctx : null);
  const button = element('button');
  delete require.cache[require.resolve(LIB)];
  require(LIB);
  const changes = [];
  const crt = globalThis.CRT.attach(cv, Object.assign({ button, onChange: on => changes.push(on) }, opts.attach || {}));
  const run = () => { const fs = frames.splice(0); for (const f of fs) f(); return fs.length; };
  return { crt, cv, ctx, button, log, store, changes, run, made, parent };
}

// no WebGL2: the switch is hidden and the screen stays off
{
  const p = page({ webgl2: false });
  check(p.button.style.display === 'none', 'without WebGL2 the button is hidden');
  check(p.crt.on === false, 'without WebGL2 the screen starts off');
  p.ctx.putImageData();
  check(p.run() === 0, 'without WebGL2 a frame drawn asks for no CRT frame');
}

// WebGL2: switched on, drawn on every frame the page draws, switched off again
{
  const p = page({ webgl2: true });
  check(p.button.style.display !== 'none' && p.button.attrs['aria-pressed'] === 'false', 'with WebGL2 the button shows, not pressed');
  check(p.crt.on === false, 'the screen starts off');
  p.ctx.putImageData();
  check(p.run() === 0, 'while off, a frame drawn asks for no CRT frame');
  p.button.click();
  const screen = p.made.find(e => e.className === 'crt-screen');
  check(p.crt.on && p.button.attrs['aria-pressed'] === 'true', 'a click switches the screen on and presses the button');
  check(screen && p.cv.inserted && p.cv.inserted[0] === 'afterend' && p.cv.inserted[1] === screen, 'the CRT canvas goes straight after the game canvas');
  check(screen && screen.style.pointerEvents === 'none' && screen.style.display === 'block', 'the CRT canvas shows and lets clicks through');
  check(screen && screen.style.left === '3px' && screen.style.top === '4.5px' && screen.style.width === '890px' && screen.style.height === '629.25px', 'the CRT canvas covers the game canvas exactly, inside the parent\'s border');
  check(p.parent.style.position === 'relative', 'a static parent is made relative, so the CRT canvas can sit over the game');
  check(p.store.get('gamesexplained.crt') === '1', 'the choice is stored for every Play tab');
  check(p.changes.join() === 'true', 'the page is told the screen went on');
  screen.width = 1780; screen.height = 1260;                  // what the resize observer would set
  p.log.length = 0; p.run();
  p.ctx.putImageData(); p.ctx.drawImage(); p.ctx.putImageData();
  check(p.run() === 1, 'three draws in one frame ask for one CRT frame');
  const tex = p.log.find(l => l[0] === 'texImage2D');
  check(tex && tex[3] === 'SRGB8_ALPHA8' && tex[6] === p.cv, 'the game canvas is read as an sRGB texture, so the shader works in linear light');
  check(p.log.some(l => l[0] === 'uniform2i' && l[1] === 'uSize' && l[2] === 384 && l[3] === 272), 'the shader is told the C64 picture is 384 x 272');
  check(p.log.some(l => l[0] === 'uniform2f' && l[1] === 'uOut' && l[2] === 1780 && l[3] === 1260), 'the shader draws at the CRT canvas\'s device pixels');
  check(p.log.some(l => l[0] === 'drawArrays'), 'a CRT frame is drawn');
  p.log.length = 0; p.ctx.putImageData(); p.run();
  check(p.log.some(l => l[0] === 'texSubImage2D') && !p.log.some(l => l[0] === 'texImage2D'), 'later frames update the texture in place');
  p.button.click();
  check(!p.crt.on && screen.style.display === 'none' && p.button.attrs['aria-pressed'] === 'false', 'a second click switches it off and hides the CRT canvas');
  check(p.store.get('gamesexplained.crt') === '0' && p.changes.join() === 'true,false', 'switching off is stored and told');
  p.ctx.putImageData();
  check(p.run() === 0, 'once off, a frame drawn asks for no CRT frame');
}

// the viewer's choice from another Play tab: on from the start, without telling the page
{
  const p = page({ webgl2: true, stored: '1' });
  check(p.crt.on && p.button.attrs['aria-pressed'] === 'true', 'a stored choice starts the screen on');
  check(p.changes.length === 0, 'a stored choice is not told as a change');
  p.crt.set(false);
  check(p.changes.join() === 'false', 'set(false) from the page is told');
}

// a page that scales its picture into the canvas it shows, and one drawn at twice size
{
  const off = { width: 384, height: 272 };
  const p = page({ webgl2: true, w: 1152, h: 816, attach: { source: off } });
  p.button.click(); p.made.find(e => e.className === 'crt-screen').width = 100; p.made.find(e => e.className === 'crt-screen').height = 70;
  p.log.length = 0; p.ctx.drawImage(); p.run();
  const tex = p.log.find(l => l[0] === 'texImage2D');
  check(tex && tex[6] === off, 'with source, the texture is read from the source canvas');
  check(p.log.some(l => l[0] === 'uniform2i' && l[1] === 'uSize' && l[2] === 384), 'with source, the picture is the source\'s size');
}
{
  const p = page({ webgl2: true, w: 768, h: 544, attach: { pixel: 2 } });
  p.button.click(); p.made.find(e => e.className === 'crt-screen').width = 100; p.made.find(e => e.className === 'crt-screen').height = 70;
  p.log.length = 0; p.ctx.putImageData(); p.run();
  check(p.log.some(l => l[0] === 'uniform2i' && l[1] === 'uSize' && l[2] === 384 && l[3] === 272), 'with pixel 2, a 768 x 544 canvas is a 384 x 272 picture');
  check(p.log.some(l => l[0] === 'uniform1i' && l[1] === 'uPixel' && l[2] === 2), 'with pixel 2, the shader reads every second texel');
}

// Lottes's defaults (crt-lottes.glsl, the libretro preset)
{
  const FS = globalThis.CRT.FS;
  for (const d of ['hardScan = -8.0', 'hardPix = -3.0', 'warpX = 0.031', 'warpY = 0.041', 'maskDark = 0.5', 'maskLight = 1.5',
    'hardBloomPix = -1.5', 'hardBloomScan = -2.0', 'bloomAmount = 0.15']) check(FS.includes(d), 'the shader keeps Lottes\'s ' + d);
}

if (failed) { console.log(failed + ' failed'); process.exit(1); }
console.log('crt.js: every check passed');
