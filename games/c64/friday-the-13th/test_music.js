'use strict';
// Holds music.html's music player, the game's own music code on the kit's 6502 as sid.js hands it
// to createDriver, against that code run on the kit's simulator directly over the listing's
// memory: each of the seven tunes, started by play_tune ($C4D8) as the game starts it, then
// irq_music ($C604) once a frame for 3,000 frames, every SID write compared in order.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const kit = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createDriver, FRIDAY_TUNES } = g.run('music.html', 'createDriver', 'createDriver', 'FRIDAY_TUNES');
const ram = g.listing('parts/game/listing.json').ram;
const FRAMES = 3000;
let bad = 0;
FRIDAY_TUNES.forEach((name, n) => {
  const d = createDriver({ ram: ram.slice() }, kit);
  const m = ram.slice();
  let w = [];
  const cpu = new CPU(m, { port: 0x36, io: { read: a => { if (a === 0xD011) return 0x80; throw new Error('read ' + a.toString(16)); },
    write: (a, v) => { if (a >= 0xD400 && a <= 0xD418) w.push(a - 0xD400, v); else throw new Error('write ' + a.toString(16)); } } });
  m[0x0314] = 0x1B; m[0x0315] = 0xA7;      // irq_play, the play screen's interrupt
  d.init(n); cpu.call(0xC4D8, { a: n }, { maxSteps: 1e6 });
  let ended = -1;
  for (let f = 0; f < FRAMES; f++) {
    const start = f === 0 ? w : []; if (f) w = [];
    if (m[0x0315] === 0xC6) cpu.call(0xC604, {}, { maxSteps: 1e6, hooks: { 0xA723: c => c.rts(), 0xA7A1: c => c.rts() } });
    else if (ended < 0) ended = f;
    d.play();
    const a = d.writes.join(','), b = (f === 0 ? start : w).join(',');
    if (a !== b) { console.log(`${name}: frame ${f} differs\n port ${a}\n game ${b}`); bad++; return; }
    if (d.playing() !== (m[0x0315] === 0xC6)) { console.log(`${name}: frame ${f}: the port says ${d.playing() ? 'playing' : 'ended'}`); bad++; return; }
  }
  console.log(`${name}: ${FRAMES} frames agree` + (ended >= 0 ? `, the tune ends at frame ${ended}` : ', still playing'));
});
process.exit(bad ? 1 : 0);
