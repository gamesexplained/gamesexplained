#!/usr/bin/env node
// The sound effects player's driver (sp-sound, index.html), which starts each effect with the game's
// own instructions on the listing's bytes in the kit's 6502 and then runs raster_irq ($7066) once a
// frame. Checks what the page says about each effect against the game's tables and routines:
//   - every effect writes only the SID, plays for its length and stops;
//   - the jingle steps voice 1's pitch through jingle_pitches ($721B) for 80 frames;
//   - each switch beeps on voice 2 at its pitch in switch_pitches ($8912);
//   - noise_sound ($88BE) plays from a pitch of 7 and is silent below it (the walls' bounce);
//   - raster_irq moves voice 3's pitch between two values every frame.
//   node games/c64/spindizzy/test_sound.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
g.lib('cpu6502');
const { createDriver } = g.run('index.html', 'sp-sound', 'createDriver');
const page = g.read('index.html');
const L = g.listing();
let bad = 0;
const fail = (...w) => { bad++; console.log('FAIL', ...w); };

const effects = [{ kind: 'jewel', frames: 90 }, { kind: 'trampoline', frames: 60 }, { kind: 'inhabitant', frames: 50 },
  { kind: 'lift', level: 3, frames: 30 }, { kind: 'noise', a: 6, frames: 30 }, { kind: 'noise', a: 7, frames: 30 }, { kind: 'noise', a: 15, frames: 60 }];
for (let n = 0; n < 12; n++) effects.push({ kind: 'switch', n, frames: 20 });
const d = createDriver({ mem: L.ram, effects }, C64Cpu);
const runs = effects.map((e, t) => {
  d.init(t);
  const frames = [];
  while (d.playing()) { d.play(); frames.push(d.writes.slice()); }
  if (frames.length !== e.frames) fail(`${JSON.stringify(e)}: played ${frames.length} frames`);
  for (const w of frames) for (let i = 0; i < w.length; i += 2) if (w[i] > 24) fail(`${e.kind}: wrote SID register ${w[i]}`);
  return frames;
});
const regs = (frames, r) => frames.map((w) => { const v = []; for (let i = 0; i < w.length; i += 2) if (w[i] === r) v.push(w[i + 1]); return v; });

const jingle = Array.from(L.ram.slice(0x721B, 0x7223));
const v1 = regs(runs[0], 1), withPitch = v1.filter((v) => v.length).length;
if (withPitch !== 80) fail(`the jingle set voice 1's pitch in ${withPitch} frames, not 80`);
if (!v1.flat().every((v) => jingle.includes(v))) fail('the jingle used a pitch not in jingle_pitches');
if (new Set(v1.flat()).size !== new Set(jingle).size) fail('the jingle did not use every pitch in jingle_pitches');

for (let n = 0; n < 12; n++) {
  const hi = regs(runs[7 + n], 8)[0];
  if (hi.length !== 1 || hi[0] !== L.ram[0x8912 + n]) fail(`switch ${n}: voice 2's pitch ${hi} is not switch_pitches[${n}] = ${L.ram[0x8912 + n]}`);
}
const gate3 = (frames) => regs(frames, 18).flat().some((v) => v & 1);
if (gate3(runs[4])) fail('noise_sound played with a pitch of 6');
if (!gate3(runs[5])) fail('noise_sound was silent with a pitch of 7');
const hum = regs(runs[1], 15).slice(1).map((v) => v[v.length - 1]);
if (new Set(hum).size !== 2 || hum.some((v, i) => i && v === hum[i - 1])) fail(`voice 3's pitch did not alternate every frame: ${hum.slice(0, 6)}`);

// the page's list of effects names the effects tested here
for (const want of ["kind: 'jewel', frames: 90", "kind: 'noise', a: 7,", "kind: 'noise', a: 15,"]) if (!page.includes(want)) fail('index.html lost the effect ' + want);
if (bad) { console.log(`test_sound: ${bad} failed`); process.exit(1); }
console.log(`test_sound: ${effects.length} effects, each from the game's own code, as the page describes them`);
