'use strict';
// Holds music.html's player, the game's own sound code on the kit's 6502 as sid.js hands it to
// createDriver, against that code run on the kit's simulator directly over the main part's
// listing: each of the sixteen tunes started by play_tune ($F087) with the sound switch $F4 set,
// then music_play ($E9E1) once a frame for 6,000 frames, every SID write compared in order. A read
// of a SID register gives the last value written to it, in both. It also prints when each ends.
const path = require('path'), vm = require('vm');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const kit = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const got = g.run('music.html', 'createDriver', 'createDriver', 'SPY_TUNES');
const createDriver = vm.runInNewContext('(' + got.createDriver + ')', {});
const ram = g.listing('parts/main/listing.json').ram;
const FRAMES = 6000;
let bad = 0;
function check(name, n) {
  const d = createDriver({ ram: ram.slice() }, kit);
  const m = ram.slice(), sid = new Uint8Array(25);
  let w = [];
  const cpu = new CPU(m, { port: 0x35, io: {
    read: a => { if (a >= 0xD400 && a <= 0xD418) return sid[a - 0xD400]; throw new Error('read ' + a.toString(16)); },
    write: (a, v) => { if (a >= 0xD400 && a <= 0xD418) { sid[a - 0xD400] = v; w.push(a - 0xD400, v); } else throw new Error('write ' + a.toString(16)); } } });
  m[0xF4] = 1;
  d.init(n); cpu.call(0xF087, { a: n }, { maxSteps: 1e6 });
  let ended = -1, gated = false;
  for (let f = 0; f < FRAMES; f++) {
    const start = f === 0 ? w : []; if (f) w = [];
    if (m[0xE962]) cpu.call(0xE9E1, {}, { maxSteps: 1e6 }); else if (ended < 0) ended = f;
    d.play();
    const b = f === 0 ? start : w;
    for (let i = 0; i < b.length; i += 2) if ([4, 11, 18].includes(b[i]) && (b[i + 1] & 1)) gated = true;
    if (d.writes.join(',') !== b.join(',')) { console.log(`${name}: frame ${f} differs`); bad++; return; }
    if (d.playing() !== !!m[0xE962]) { console.log(`${name}: frame ${f}: the port says ${d.playing() ? 'playing' : 'ended'}`); bad++; return; }
  }
  if (!gated) { console.log(`${name}: no voice was ever gated on`); bad++; return; }
  console.log(`${name}: ${FRAMES} frames agree` + (ended >= 0 ? `, ends at frame ${ended}` : ', still playing'));
}
got.SPY_TUNES.forEach((name, n) => check('Tune ' + name, n));
process.exit(bad ? 1 : 0);
