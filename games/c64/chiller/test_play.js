#!/usr/bin/env node
// Hold the Play tab's port of the whole game against the game's own code, pass by pass, on a clean
// checkout. The page carries the port's sources whole (port/scripts/build-play.js writes each file
// of port/src into play.html as a script of its own), so the test first finds every one of them in
// the page and stops if a block differs from its file: what runs below is then the page's port.
// For each of the ten levels it then makes a moment of play the way port/scripts/gen-states.js does,
// with nothing from work/: the game from the committed listing on the kit's C64 with what it uses
// of the KERNAL (port/machine.js), from the loader's hand-over, taken to the level as finishing
// each level before it does (port/jump.js), then played a while with a random stick. From there
// port/test/lockstep.js runs the port beside the game with another random stick, comparing all of
// RAM, colour RAM and the registers written to the video chip and the SID at the start of every
// pass, with the sprite collisions the game read handed to the port in turn. Any difference, or
// the two falling out of step, fails the test.
//   node games/c64/chiller/test_play.js [passes per level]
const fs = require('fs'), path = require('path');
const { describe } = require('../../../kit/c64/lockstep.js');
const PORT = path.join(__dirname, 'port');
const page = fs.readFileSync(path.join(__dirname, 'play.html'), 'utf8');
let bad = 0;
for (const f of fs.readdirSync(path.join(PORT, 'src')).filter(f => f.endsWith('.js')).sort()) {
  const m = new RegExp('<script>\\n/\\* port/src/' + f.replace('.', '\\.') + ' \\*/\\n([\\s\\S]*?)</script>').exec(page);
  const want = fs.readFileSync(path.join(PORT, 'src', f), 'utf8').replace(/<\/script/gi, '<\\/script');
  if (!m) { bad++; console.log(`FAIL play.html carries no port/src/${f}`); }
  else if (m[1] !== want) { bad++; console.log(`FAIL play.html's port/src/${f} differs from the file: run port/scripts/build-play.js`); }
}
if (bad) process.exit(1);

// Compositing must distinguish a black foreground pixel from a background pixel,
// and preserve a black sprite too. Asking for the mask must leave the frame identical.
require(path.join(PORT, 'src/screen.js'));
{
  const assert = require('assert'), M = new Uint8Array(65536), v = new Uint8Array(64);
  const colour = new Uint8Array(1024), a = new Uint8Array(384 * 272), b = a.slice(), mask = a.slice(), visible = a.slice();
  v[0x11] = 0x1B; v[0x16] = 8; v[0x18] = 0x12; v[0x21] = 0;
  M[0x800] = 0x80; // black high-resolution character, first pixel set
  ChillerScreen.draw(M, v, colour, a);
  ChillerScreen.draw(M, v, colour, b, mask, visible);
  assert.deepStrictEqual(a, b);
  assert.strictEqual(mask[51 * 384 + 32], 0);
  assert.strictEqual(mask[51 * 384 + 33], 1);
  assert.strictEqual(mask[0], 0); // the border is opaque
  assert.strictEqual(visible.reduce((sum, value) => sum + value, 0), 0);
  v[0x15] = 1; v[0] = 32; v[1] = 66; M[0x7F8] = 0x80; M[0x2000] = 0x80;
  ChillerScreen.draw(M, v, colour, b, mask, visible);
  assert.strictEqual(mask[51 * 384 + 40], 0); // visible black sprite
  assert.strictEqual(visible[51 * 384 + 40], 1);
  assert.strictEqual(visible[51 * 384 + 32], 0); // character, not a sprite
  console.log('backdrop mask preserves black characters, sprites and the border');
}

require(path.join(PORT, 'src/parallax.js'));
{
  const assert = require('assert'), M = new Uint8Array(65536), v = new Uint8Array(64);
  v[0x18] = 0x1C; v[0x11] = 0x1B;
  const d = new Uint8ClampedArray(384 * 272 * 4), visible = new Uint8Array(384 * 272);
  const ctx = { getImageData: () => ({data:d}), putImageData() {} };
  const cell = 961, at = (227 * 384 + 42) * 4;
  M[0x400 + cell] = 0x55;
  ChillerParallax.paintItems(ctx, M, v, visible);
  assert.deepStrictEqual(Array.from(d.slice(at, at + 3)), [255,65,99]);
  d.fill(0); visible[227 * 384 + 42] = 1;
  ChillerParallax.paintItems(ctx, M, v, visible);
  assert.strictEqual(d[at + 3], 0, 'the boy stays in front of item art');
  d.fill(0); M[0x400 + cell] = 0xA0;
  ChillerParallax.paintItems(ctx, M, v, visible);
  assert.strictEqual(d.some(x => x !== 0), false, 'collected items disappear');
  for (const cell of ChillerParallax.BRIDGE_CELLS) {
    for (const code of [0x4D,0x4E,0x4F,0x50,0x51,0x52,0x53,0xA0])
      assert(ChillerParallax.bridgeCell(cell, code), 'reserve bridge space after erosion too');
  }
  visible.fill(0); M[0x400 + cell] = 0x57; d.fill(0);
  ChillerParallax.paintItems(ctx, M, v, visible, 0, true); const cross0 = d.slice();
  d.fill(0); ChillerParallax.paintItems(ctx, M, v, visible, 24, true);
  assert.notDeepStrictEqual(d, cross0, 'the cross highlight and halo follow game time');
  d.fill(0); ChillerParallax.paintItems(ctx, M, v, visible, 0, false); const still0 = d.slice();
  d.fill(0); ChillerParallax.paintItems(ctx, M, v, visible, 24, false);
  assert.deepStrictEqual(d, still0, 'reduced motion keeps icons still');
  M[0x400 + cell] = 0x56; d.fill(0);
  ChillerParallax.paintItems(ctx, M, v, visible, 0, true); const coin0 = d.slice();
  d.fill(0); ChillerParallax.paintItems(ctx, M, v, visible, 8, true);
  assert.notDeepStrictEqual(d, coin0, 'bonus coins rotate');
  for (const frame of ChillerParallax.coinFrames) {
    const points = [];
    frame.forEach((row,y) => [...row].forEach((pixel,x) => { if (pixel !== '.') points.push([x,y]); }));
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    assert.strictEqual(Math.min(...xs) + Math.max(...xs), 9, 'the coin centre stays fixed');
    assert.strictEqual(Math.min(...ys), 1, 'the coin top stays fixed');
    assert.strictEqual(Math.max(...ys), 8, 'the coin bottom stays fixed');
  }
  const rects = [], bridgeCtx = {fillRect: (...r) => rects.push(r)};
  M.fill(0); const bridge = ChillerParallax.BRIDGE_CELLS[0];
  M[0x400 + bridge] = 0x4D; M[0x3000 + 0x4D * 8] = 255;
  ChillerParallax.paintBridge(bridgeCtx, M, v, new Uint8Array(1024));
  assert(rects.length > 0, 'a live deck has a visible edge and underside');
  rects.length = 0; M[0x400 + bridge] = 0xA0;
  ChillerParallax.paintBridge(bridgeCtx, M, v, new Uint8Array(1024));
  assert.strictEqual(rects.length, 0, 'an eroded deck leaves no painted plank');
  console.log('painted items retain sprite priority and disappear when collected; bridge holes stay open');
}

const { boot } = require(path.join(PORT, 'machine.js'));
const { toLevel } = require(path.join(PORT, 'jump.js'));
const { run } = require(path.join(PORT, 'test/lockstep.js'));
const PASSES = +process.argv[2] || 3000;
let seed = 7;
const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
const DIRS = [0, 1, 2, 4, 8, 16, 5, 9, 6, 10, 17, 20, 24, 4, 8, 4, 8];
let total = 0;
for (let n = 0; n < 10; n++) {
  const m = boot();
  m.runUntilPass(() => true);
  toLevel(m, n);
  if (n === 0) {
    const assert = require('assert'), cells = [];
    for (let i = 80; i < 1000; i++) if (m.ram[0x400 + i] >= 0x4D && m.ram[0x400 + i] <= 0x53) cells.push(i);
    assert.deepStrictEqual(cells, ChillerParallax.BRIDGE_CELLS);
  }
  for (let i = 0; i < 4; i++) {                    // a while on the level, as gen-states.js plays it
    m.joy = 0x1F & ~DIRS[Math.floor(rnd() * DIRS.length)];
    const f0 = m.frames, hold = 10 + Math.floor(rnd() * 60);
    m.runUntilPass(mm => mm.frames >= f0 + hold, 2000);
  }
  const out = run({ state: m.save(), passes: PASSES, seed: n + 1 });
  const d = describe(out.res).split('\n');
  total += out.res.passes;
  if (!out.res.ok) bad++;
  console.log(`level ${n + 1}: ` + (out.res.ok ? d[d.length - 1] : 'FAIL ' + d.slice(0, 3).join(' / ')) +
              (out.stuck ? ' (then the game over, waiting for fire)' : ''));
}
console.log(`${total} passes on ten levels, ${bad ? bad + ' out of step' : 'every one identical'}`);
process.exit(bad ? 1 : 0);
