#!/usr/bin/env node
// The sound player's driver (pd-sound, index.html) against the game's own sound driver,
// sound_frame ($0500), on the listing's bytes in the kit's 6502: for each of the 32 buttons, the
// registers after the start and every write to the SID in 3,000 frames, with the noise channel's
// read of $D41B given the same random byte in both.
//   node games/c64/paradroid/test_sound.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('sid', 'cpu6502');
const { CPU } = C64Cpu;
const { createDriver, PD_SOUNDS } = g.run('index.html', 'pd-sound', 'createDriver', 'PD_SOUNDS');
const L = g.listing();
const mem = [[0x0500, L.ram.slice(0x0500, 0x0768)], [0xC610, L.ram.slice(0xC610, 0xC800)], [0xEAA0, L.ram.slice(0xEAA0, 0xEB00)]];
const Z = { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 };
const FRAMES = 3000;
let bad = 0, frames = 0;
const fail = (...w) => { if (bad++ < 20) console.log('FAIL', ...w); };
let seed = 12345;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) & 255; };

PD_SOUNDS.forEach((c, t) => {
  const m = L.ram.slice(), regs = new Uint8Array(25), w = [];
  const bus = C64Sid.engine().createBus('8580');
  let osc3 = 0;
  const io = {
    read(a, cpu) { if (a === 0xD41B) return osc3; if (a >= 0xD400 && a <= 0xD41F) return bus.read(a & 31, cpu.cycles, 0); throw new Error('sound_frame read $' + a.toString(16)); },
    write(a, v, cpu) { if (a >= 0xD400 && a <= 0xD418) { w.push(a - 0xD400, v); regs[a - 0xD400] = v; bus.write(v, cpu.cycles); } else throw new Error('sound_frame wrote $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io });
  m[0x47] = 5;
  if (c.title) { m[0x90] = 0; cpu.call(0x0500, Z); m[0x90] = 0x11; cpu.call(0x0500, Z); }
  else { m[0x90] = 0x12; cpu.call(0x0500, Z); m[0x91] = c.effect; }
  const drv = createDriver({ mem, tunes: PD_SOUNDS }, C64Cpu);
  drv.init(t);
  if ([...drv.sid].join() !== [...regs].join()) fail(`${c.name}: the registers differ at the start`);
  for (let f = 0; f < FRAMES; f++) {
    osc3 = rnd();
    drv.readback(0, osc3, 0);
    w.length = 0;
    cpu.call(0x0500, Z);
    drv.play();
    frames++;
    if (w.join() !== drv.writes.join()) { fail(`${c.name} frame ${f}: the game writes ${w.join()}, the page ${drv.writes.join()}`); break; }
  }
});
if (bad) { console.log(`test_sound: ${bad} failed`); process.exit(1); }
console.log(`test_sound: ${PD_SOUNDS.length} buttons, ${frames} frames, every SID write the game's`);
