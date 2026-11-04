#!/usr/bin/env node
'use strict';
// The Graphics tab. Its jl-gfx block says which sprites the lander shows for each thruster, how fast
// the main flame flickers, and how the explosion steps its pictures and colours. This runs the game
// from listing.json on the kit's machine model, starts a game from the attract screen with the fire
// button, and checks the block against what the game does:
// - the shapes are at JL_BASE, the first one labelled the lander, and shapes $FC-$FF are empty;
// - on each pass, for each thruster held, sprite enable, pointers, colours and expansion are what
//   jlStack gives, flame_phase flipping every pass, in the wide view and in a close-up;
// - a pass takes JL_PASS cycles, give or take two per cent;
// - when the lander falls into the rock, every colour step of the explosion is jlExplosion's, the
//   steps are JL_FLASH cycles apart on average, and the sprite goes off after the last.
//   node games/c64/jupiter-lander/test_graphics.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine } = require(path.join(ROOT, 'kit/c64/machine.js'));
const g = game(__dirname);
const { JL_PASS, JL_FLASH, JL_BASE, jlStack, jlExplosion } =
  g.run('graphics.html', 'jl-gfx', 'JL_PASS', 'JL_FLASH', 'JL_BASE', 'jlStack', 'jlExplosion');
const L = g.listing();
let bad = 0;
const fail = (...w) => { bad++; console.log('FAIL', ...w); };
const h2 = (n) => '$' + n.toString(16).toUpperCase().padStart(2, '0');

// the shapes
if (L.names.get(JL_BASE) !== 'sprite_lander') fail('JL_BASE', JL_BASE.toString(16), 'is', L.names.get(JL_BASE), 'not sprite_lander');
if (L.bytes(JL_BASE + 12 * 64, 4 * 64).some((b) => b)) fail('shapes $FC-$FF are not empty');
if (!L.bytes(JL_BASE, 12 * 64).every((b, i) => L.has[JL_BASE + i])) fail('the listing does not hold shapes $F0-$FB');

// The game, started as the machine starts it. The listing stops at $F451; the vectors at $FFFA are
// the ones facts.md gives (reset and NMI $E037, IRQ $EB39), and the attract screen needs the IRQ's.
const ram = L.ram;
ram.set([0x37, 0xE0, 0x37, 0xE0, 0x39, 0xEB], 0xFFFA);
const M = new Machine({ ram, pc: 0xE037, port: { dir: 0x2F, data: 0x35 }, passAt: 0xE12C, dma: true, cia: true, collide: true });
M.cpu.i = 1;
const STICK = 0x1F, FIRE = 0x10, LEFT = 0x04, RIGHT = 0x08;
M.runFrames(300); M.joy1 = STICK & ~FIRE; M.runFrames(20); M.joy1 = STICK;
if (!M.runPasses(5, 2000)) fail('no game started from the attract screen');

// Sprites as the video chip has them: back to front, as jlStack lists them.
function onScreen() {
  const s = [];
  for (const n of [3, 2, 1]) if (M.vic[0x15] & (1 << n)) s.push({ n, ptr: ram[0x07F8 + n], colour: M.vic[0x27 + n] & 15 });
  return s;
}
const hold = (up, side, close) => {
  // The ship is held still: over the x2 plateau for a close-up, high over the canyon for the wide view.
  ram[0x09] = 0x70; ram[0x0A] = 0x01; ram[0x0E] = close ? 0x80 : 0x50; ram[0x0F] = 0;
  for (const a of [0x0B, 0x0C, 0x10, 0x11]) ram[a] = 0;
  ram[0x12] = ram[0x13] = 0xFF;
};
for (const close of [false, true]) for (const [up, side] of [[0, 0], [1, 0], [0, 1], [0, 2], [1, 1], [1, 2]]) {
  const what = (close ? 'close-up' : 'wide view') + ', ' + (up ? 'fire' : '') + (side ? ['', ' left', ' right'][side] : '') + (up || side ? '' : 'nothing held');
  M.joy1 = STICK & ~(up ? FIRE : 0) & ~(side === 1 ? LEFT : side === 2 ? RIGHT : 0);
  hold(up, side, close); M.runPasses(3);
  let c0 = M.cpu.cycles, phase = ram[0x2B], total = 0, i = 0;
  const N = 24;
  for (; i < N; i++) {
    hold(up, side, close); M.runPasses(1);
    total += M.cpu.cycles - c0; c0 = M.cpu.cycles;
    phase ^= 1;
    if (ram[0x2B] !== phase) { fail(what, 'flame_phase did not flip on pass', i); break; }
    const want = jlStack(up, side, phase, close), got = onScreen();
    if ((ram[0x1C] !== 0) !== close) { fail(what, 'view', ram[0x1C]); break; }
    if (M.vic[0x15] !== want.enable) { fail(what, 'pass', i, '$D015', h2(M.vic[0x15]), 'the tab', h2(want.enable)); break; }
    if (M.vic[0x17] !== want.expand || M.vic[0x1D] !== want.expand) { fail(what, '$D017/$D01D', h2(M.vic[0x17]), h2(M.vic[0x1D]), 'the tab', h2(want.expand)); break; }
    const a = JSON.stringify(got), b = JSON.stringify(want.sprites);
    if (a !== b) { fail(what, 'pass', i, 'the game shows', a, 'the tab', b); break; }
  }
  const mean = total / N;
  if (i === N && Math.abs(mean - JL_PASS) > JL_PASS * 0.02) fail(what, 'a pass takes', mean.toFixed(0), 'cycles, the tab', JL_PASS);
}

// The explosion: let the lander fall into the rock with nothing held.
M.joy1 = STICK;
const steps = [];
let boomed = false, off = null;
M.hooks[0xE4FF] = () => { steps.push({ at: M.cpu.cycles, ptr: ram[0x07F9], colour: M.cpu.a & 15, enable: M.vic[0x15] }); };
M.hooks[0xE44B] = () => { boomed = true; };
M.hooks[0xE48D] = () => { if (off === null) off = M.vic[0x15]; };
ram[0x09] = 0x50; ram[0x0A] = 0; ram[0x0E] = 0x6A; ram[0x0F] = 0;
for (let i = 0; i < 400 && off === null; i++) M.runFrames(10);
if (!boomed) fail('the lander never hit the rock');
else {
  const want = jlExplosion(), got = steps.slice(0, want.length);
  if (steps.length < want.length) fail('the explosion had', steps.length, 'colour steps, the tab', want.length);
  for (let i = 0; i < got.length; i++) {
    if (got[i].ptr !== want[i].ptr || got[i].colour !== want[i].colour || got[i].enable !== 0x02) {
      fail('explosion step', i, 'the game shows', h2(got[i].ptr), got[i].colour, '$D015', h2(got[i].enable), 'the tab', h2(want[i].ptr), want[i].colour);
      break;
    }
  }
  const mean = (got[got.length - 1].at - got[0].at) / (got.length - 1);
  if (Math.abs(mean - JL_FLASH) > JL_FLASH * 0.01) fail('a colour step takes', mean.toFixed(0), 'cycles, the tab', JL_FLASH);
  if (off !== 0) fail('the sprites are not off after the explosion: $D015', off === null ? 'never written' : h2(off));
}

if (bad) { console.log(bad, 'failed'); process.exit(1); }
console.log('ok: the lander, its flames and the explosion are as the game draws them');
