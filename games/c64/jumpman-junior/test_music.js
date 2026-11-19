'use strict';
// Holds music.html's player, the game's own sound code on the kit's 6502 as sid.js hands it to
// createDriver, against that code run on the kit's simulator directly over the listing's memory,
// each sound started the way the game's own call starts it (the death and title tunes through
// $90D8, the others through tune_play $90FE, the effects through sound_play $89E5), then
// sound_task ($88F2) once a frame until $5F reads 0: every SID write compared in order, and
// each sound's length checked against the frames the page's tables state.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const kit = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createDriver } = g.run('music.html', 'createDriver', 'createDriver');
const { JJ_TUNES, JJ_FX } = g.run('music.html', 'JJ_SOUNDS', 'JJ_TUNES', 'JJ_FX');
const ram = g.listing().ram;
let bad = 0;
for (const list of [JJ_TUNES, JJ_FX]) list.forEach((t, n) => {
  const d = createDriver({ ram: ram.slice(), list }, kit);
  const m = ram.slice();
  let w = [];
  const cpu = new CPU(m, { port: 0x35, io: { read: a => { throw new Error('read ' + a.toString(16)); },
    write: (a, v) => { if (a >= 0xD400 && a <= 0xD418) w.push(a - 0xD400, v); else throw new Error('write ' + a.toString(16)); } } });
  cpu.call(0x808A, {}, { maxSteps: 1e6, hooks: { 0x80BB: c => c.rts() } });   // the note table at $1200
  m.fill(0, 0x0940, 0x0956); m[0x5F] = 0; m[0x3B] = 0;
  d.init(n);
  w = [24, 15];
  if (t.tune) {
    const via = (t.from === 0xA5AA || t.from === 0x96E4) ? 0x90D8 : 0x90FE;
    for (const o of t.tune) cpu.call(via, { a: o }, { maxSteps: 1e5 });
  } else { m[0x3A] = t.at & 255; m[0x3B] = t.at >> 8; cpu.call(0x89E5, { a: t.pri }, { maxSteps: 1e5 }); }
  if (w.length !== 2) { console.log(`${t.name}: the start wrote to the SID`); bad++; return; }
  let f = 0;
  for (; f < 5000 && m[0x5F] !== 0 || f === 0; f++) {
    if (f) w = [];
    cpu.call(0x88F2, { a: 0 }, { maxSteps: 1e5 });
    d.play();
    const a = d.writes.join(','), b = w.join(',');
    if (a !== b) { console.log(`${t.name}: frame ${f} differs\n port ${a}\n game ${b}`); bad++; return; }
    if (d.playing() !== (m[0x5F] !== 0)) { console.log(`${t.name}: frame ${f}: the port says ${d.playing() ? 'playing' : 'ended'}`); bad++; return; }
  }
  if (f !== t.frames) { console.log(`${t.name}: lasts ${f} frames, the page says ${t.frames}`); bad++; return; }
  console.log(`${t.name}: ${f} frames agree`);
});
process.exit(bad ? 1 : 0);
