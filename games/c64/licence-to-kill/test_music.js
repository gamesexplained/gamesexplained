'use strict';
// Holds music.html's player, the game's own sound code on the kit's 6502 as sid.js hands it to
// createDriver, against that code run on the kit's simulator directly over the listing's memory:
// each of the five tunes started by play_tune ($C000), and each of the 24 effects by start_effect
// ($C5F6), with the volume $C118 at 15 as the game sets it, then sound_frame ($C127) once a frame
// for 3,000 frames, every SID write compared in order. It also prints how long each tune runs.
const path = require('path'), vm = require('vm');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const kit = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const got = g.run('music.html', 'createDriver', 'createDriver', 'LTK_TUNES', 'LTK_FX');
const createDriver = vm.runInNewContext('(' + got.createDriver + ')', {});
const ram = g.listing('listing.json').ram;
const FRAMES = 3000;
let bad = 0;
function check(name, n, fx) {
  const d = createDriver({ ram: ram.slice(), fx }, kit);
  const m = ram.slice();
  let w = [];
  const cpu = new CPU(m, { port: 0x35, io: { read: a => { throw new Error('read ' + a.toString(16)); },
    write: (a, v) => { if (a >= 0xD400 && a <= 0xD418) w.push(a - 0xD400, v); else throw new Error('write ' + a.toString(16)); } } });
  m[0xC118] = 15;
  d.init(n); cpu.call(fx ? 0xC5F6 : 0xC000, { a: n }, { maxSteps: 1e6 });
  const flag = fx ? 0xC117 : 0xC116;
  let ended = -1, gated = false;
  for (let f = 0; f < FRAMES; f++) {
    const start = f === 0 ? w : []; if (f) w = [];
    if (m[flag]) cpu.call(0xC127, {}, { maxSteps: 1e6 }); else if (ended < 0) ended = f;
    d.play();
    const b = f === 0 ? start : w;
    for (let i = 0; i < b.length; i += 2) if ([4, 11, 18].includes(b[i]) && (b[i + 1] & 1)) gated = true;
    if (d.writes.join(',') !== b.join(',')) { console.log(`${name}: frame ${f} differs`); bad++; return; }
    if (d.playing() !== !!m[flag]) { console.log(`${name}: frame ${f}: the port says ${d.playing() ? 'playing' : 'ended'}`); bad++; return; }
    if (m[0xC118] === 0 && gated) { console.log(`${name}: a voice gated on at volume 0`); bad++; return; }
  }
  if (!gated) { console.log(`${name}: no voice was ever gated on`); bad++; return; }
  console.log(`${name}: ${FRAMES} frames agree` + (ended >= 0 ? `, ends at frame ${ended}` : ', still playing'));
}
got.LTK_TUNES.forEach((name, n) => check(name, n, false));
got.LTK_FX.forEach(([n]) => check('Effect ' + n, n, true));
process.exit(bad ? 1 : 0);
