#!/usr/bin/env node
// Hold the pages' sound players against the game's own code. The block rp-music (createDriver), the
// same on every page that carries it, runs the game's music driver and sound effects on the kit's
// 6502 over RP_DRIVER_RANGES. Here the same calls are made on the kit's simulator over the whole
// listing, and both must write the same values to the same SID registers in the same order, frame
// by frame, for every button of the four lists:
// - RP_TUNES and RP_LOST: start_tune ($AD0B), or $AD0D with the tune in X for a button that keeps
//   the caller's tune, then music_play ($0200) once a frame; 7,500 frames a button. A solo button
//   has its second and third voices' pointers ($F9-$FC, $0229-$022C) put on the 0 that ends tune
//   0's first voice, and must stop on the frame its first voice's pointer ($F7) reaches $0AFF, the
//   last byte before the scenery. Its first voice's registers must be those of the same tune
//   played with all three voices.
// - RP_EFFECTS: start_sound ($822F) with the effect in A and the voice in X, then nothing: the
//   button must run 150 frames.
// - RP_EFFECTS_SWEPT: the same with the three sfx_time counters ($8211) cleared first and
//   update_sound ($82AC) once a frame from the frame after the start: the button must run 50
//   frames more after the frame on which the voice's counter returns to 0.
// Every button must open a voice's gate and leave the volume above 0. createDriver is made here
// from its source text alone, in a context of its own, as the player's AudioWorklet makes it.
// It exits 1 on any difference.
//   node games/c64/rampage/test_music.js
'use strict';
const path = require('path'), vm = require('vm'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const same = g.sameBlock('rp-music');
const B = g.run(same.pages[0], 'rp-music', 'createDriver', 'RP_TUNES', 'RP_LOST', 'RP_EFFECTS', 'RP_EFFECTS_SWEPT', 'RP_DRIVER_RANGES');
const createDriver = vm.runInNewContext('(' + B.createDriver.toString() + ')', {});
const L = g.listing();
const mem = B.RP_DRIVER_RANGES.map(([a, b]) => [a, Array.from(L.ram.subarray(a, b + 1))]);
const FRAMES = 7500;
let bad = 0, frames = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const notes = [];

function reference(c) {
  const m = L.ram.slice(), frame = { w: [] };
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a < 0xD419) frame.w.push(a - 0xD400, v); else if (a < 0xD400 || a > 0xD41C) throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: 0x35, io });
  const call = (a, regs) => cpu.call(a, regs || {}, { maxSteps: 200000 });
  if (c.sfx === undefined) {
    call(c.skip ? 0xAD0D : 0xAD0B, { x: c.tune });
    if (c.solo) for (const x of [2, 4]) { m[0xF7 + x] = m[0x0227 + x] = 0x1B; m[0xF8 + x] = m[0x0228 + x] = 0x07; }
  } else {
    if (c.sweep) m[0x8211] = m[0x8212] = m[0x8213] = 0;
    call(0x822F, { a: c.sfx, x: c.voice });
  }
  let first = true;
  return { m, frame, play() { frame.w = []; if (c.sfx === undefined) call(0x0200); else if (c.sweep && !first) call(0x82AC); first = false; } };
}

for (const [set, list] of [['RP_TUNES', B.RP_TUNES], ['RP_LOST', B.RP_LOST], ['RP_EFFECTS', B.RP_EFFECTS], ['RP_EFFECTS_SWEPT', B.RP_EFFECTS_SWEPT]]) list.forEach((c, t) => {
  const R = reference(c), whole = c.solo ? reference({ tune: c.tune, skip: c.skip }) : null;
  const drv = createDriver({ mem, list }, kit);
  drv.init(t);
  if (R.frame.w.join() !== drv.writes.join()) fail(set, c.name, 'start', R.frame.w.join(), '|', drv.writes.join());
  let gate = R.frame.w.some((v, i) => !(i & 1) && [4, 11, 18].includes(v) && R.frame.w[i + 1] & 1), f = 0, quiet = -1;
  for (; f < FRAMES && drv.playing(); f++) {
    R.play(); drv.play();
    if (R.frame.w.join() !== drv.writes.join()) fail(set, c.name, 'frame ' + f, R.frame.w.join(), '|', drv.writes.join());
    for (let i = 0; i < R.frame.w.length; i += 2) if ([4, 11, 18].includes(R.frame.w[i]) && R.frame.w[i + 1] & 1) gate = true;
    if (whole) {
      whole.play();
      const first = (w) => { const o = []; for (let i = 0; i < w.length; i += 2) if (w[i] < 7) o.push(w[i], w[i + 1]); return o.join(); };
      if (first(whole.frame.w) !== first(R.frame.w)) fail(set, c.name, 'frame ' + f, 'first voice alone', first(R.frame.w), 'in the whole tune', first(whole.frame.w));
      const p = R.m[0xF7] | R.m[0xF8] << 8;
      if ((p >= 0x0AFF) === drv.playing()) fail(set, c.name, 'frame ' + f, 'pointer', p.toString(16), 'page', drv.playing() ? 'playing' : 'stopped');
    }
    if (c.sweep && quiet < 0 && !R.m[0x8211 + c.voice]) quiet = f;
    frames++;
  }
  if (!gate) fail(set, c.name, 'never opens a gate');
  if (!(drv.sid[24] & 15)) fail(set, c.name, 'volume 0');
  if (c.sfx !== undefined && !c.sweep && f !== 150) fail(set, c.name, 'ran', f, 'frames, not 150');
  if (c.sweep && f !== quiet + 51) fail(set, c.name, 'ran', f, 'frames; the counter reached 0 on frame', quiet);
  if (c.sfx === undefined && !c.solo && f !== FRAMES) fail(set, c.name, 'stopped after', f);
  notes.push(c.solo ? 'the lone voice ends after ' + f + ' frames' : c.sweep ? 'swept effect ' + c.sfx + ' ' + f : null);
});
console.log(`rampage sound (${same.pages.join(', ')}): ${frames} frames: ` + (bad ? bad + ' differences' : 'every write matches the game\'s code; ' + notes.filter(Boolean).join(', ')));
process.exit(bad ? 1 : 0);
