#!/usr/bin/env node
// Hold the How it works page's sound-effects player against the game's own code. index.html's az-sfx
// block (createSfxDriver) runs each effect's stretch of the game's code over the bytes in
// AZ_SFX_RANGES only. Here the same stretch runs on the kit's simulator over the whole listing: the
// start-up's sound set-up ($1000 to $103E), a level's start ($1CA0), the sprites and zero-page bytes
// the button sets, then the code from the effect's first instruction, a frame of 19,656 cycles at a
// time, until it reaches the effect's end (an RTS for a routine called as the game calls it, or the
// address where the game goes on to something else). The chips answer as on the page: the sprite
// registers as written, no collisions, and the same xorshift for the CIA 1 timer and voice 3's
// oscillator. Both must write the same SID registers with the same values in the same order in
// every frame, end on the same frame, and make sound: a voice gated on with a pitch and the volume up.
// It exits 1 on any difference.
//   node games/c64/aztec-challenge/test_sounds.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createSfxDriver, AZ_SFX, AZ_SFX_RANGES, AZ_FRAME_CYCLES } = g.run('index.html', 'az-sfx', 'createSfxDriver', 'AZ_SFX', 'AZ_SFX_RANGES', 'AZ_FRAME_CYCLES');
const L = g.listing();
// the driver made from its source text alone, as the player's AudioWorklet makes it: one that uses a
// name from the page's scope throws there, and the page is silent (site/lib/sid.js)
const isolated = require('vm').runInNewContext('(' + createSfxDriver + ')', {});
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
if (AZ_FRAME_CYCLES !== 312 * 63) fail('a frame is', AZ_FRAME_CYCLES, 'cycles');
const mem = AZ_SFX_RANGES.map(([a, b]) => [a, Array.from(L.ram.subarray(a, b + 1))]);
const report = [];
AZ_SFX.forEach((c, t) => {
  const m = L.ram.slice(), sid = new Uint8Array(25), vic = new Uint8Array(0x40);
  let w = [], seed = 0x2545F491;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 8) & 255; };
  const io = {
    read(a) {
      if (a >= 0xD000 && a < 0xD400) { const r = a & 0x3F; return r === 0x1E || r === 0x1F ? 0 : vic[r]; }
      if ((a & 0xFF1F) === 0xD41B || a === 0xDC04 || a === 0xDD04) return rnd();
      throw new Error('read $' + a.toString(16));
    },
    write(a, v) {
      if (a >= 0xD400 && a < 0xD800) { const r = (a - 0xD400) & 0x1F; if (r < 25) { sid[r] = v; w.push(r, v); } return; }
      if (a >= 0xD000 && a < 0xD400) { vic[a & 0x3F] = v; return; }
      if (a >= 0xD800 && a < 0xDC00) return;
      throw new Error('write $' + a.toString(16));
    },
  };
  const cpu = new CPU(m, { port: 0x37, io });
  cpu.pc = 0x1000; cpu.run({ until: 0x103E, hooks: { 0xFFD2: (k) => { k.rts(); } } });
  cpu.call(0x1CA0, {});
  for (const [r, v] of c.vic || []) vic[r] = v;
  for (const [a, v] of c.zp || []) m[a] = v;
  cpu.sp = 0xFF;
  if (c.call) { m[0x01FF] = 0xFF; m[0x01FE] = 0xFE; cpu.sp = 0xFD; }
  cpu.pc = c.at;
  const end = c.call ? 0xFFFF : c.until;
  const drv = isolated({ mem, list: AZ_SFX }, kit);
  drv.init(t);
  if (w.join() !== drv.writes.join()) fail(c.name, 'start');
  let f = 0, sounded = false;
  for (; f < 5000; f++) {
    w = [];
    let done = false;
    cpu.run({ until: end, cycles: AZ_FRAME_CYCLES });
    if (cpu.pc === end) { done = true; for (const r of [4, 11, 18]) { sid[r] &= 0xFE; w.push(r, sid[r]); } }
    drv.play();
    if (w.join() !== drv.writes.join()) fail(c.name, 'frame ' + f);
    for (const v of [0, 1, 2]) if ((sid[4 + 7 * v] & 1) && (sid[7 * v] | sid[1 + 7 * v] << 8) && (sid[24] & 15)) sounded = true;
    if (done !== !drv.playing()) fail(c.name, 'frame ' + f, done ? 'the game\'s code ended, the page plays on' : 'the page stopped early');
    if (done) break;
  }
  if (f >= 5000) fail(c.name, 'never ends');
  if (!sounded) fail(c.name, 'makes no sound');
  report.push(c.name + ' ' + (f + 1) + ' frames');
});
console.log(`${AZ_SFX.length} effects: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + report.join('; ')));
process.exit(bad ? 1 : 0);
