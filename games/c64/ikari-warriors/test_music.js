'use strict';
// Holds music.html's two players, the game's own music driver on the kit's 6502 as sid.js hands it
// to createDriver and createEffectDriver, against that code run on the kit's simulator directly
// over the listing's memory: each of the three tunes, started by start_tune ($E09A), and each of
// the 23 sound effects, started by play_effect ($2E2B) with the music off, then music_tick ($E000)
// once a frame, every SID write compared in order.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const kit = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createDriver, IKARI_TUNES } = g.run('music.html', 'createDriver', 'createDriver', 'IKARI_TUNES');
const { createEffectDriver, IKARI_EFFECTS } = g.run('music.html', 'createEffectDriver', 'createEffectDriver', 'IKARI_EFFECTS');
const ram = g.listing().ram;
let bad = 0;
function check(name, make, start, frames, ended) {
  const d = make({ ram: ram.slice() }, kit), m = ram.slice();
  let w = [];
  const cpu = new CPU(m, { port: 0x35, io: { read: () => 0,
    write: (a, v) => { if (a >= 0xD400 && a <= 0xD418) w.push(a - 0xD400, v); else throw new Error('write ' + a.toString(16)); } } });
  d.init(); start(cpu, m);
  for (let f = 0; f < frames; f++) {
    if (f) w = [];
    cpu.call(0xE000, {}, { maxSteps: 1e6 });
    d.play();
    const a = d.writes.join(','), b = w.join(',');
    if (a !== b) { console.log(`${name}: frame ${f} differs\n port ${a}\n game ${b}`); bad++; return; }
    if (d.playing() === ended(m)) { console.log(`${name}: frame ${f}: the player and the game disagree on the end`); bad++; return; }
    if (!d.playing()) { console.log(`${name}: ${f + 1} frames agree, and both end there`); return; }
  }
  console.log(`${name}: ${frames} frames agree`);
}
// Every voice sounds: each tune writes a non-zero frequency to all three voices' registers. The
// offsets come from voice_regs ($E5B9), loaded with the game; with them missing from the listing
// all three voices would write voice 1's registers and the other two would stay silent.
IKARI_TUNES.forEach((name, n) => {
  const d = createDriver({ ram: ram.slice() }, kit), heard = [0, 0, 0];
  d.init(n);
  for (let f = 0; f < 1000; f++) { d.play(); const w = d.writes; for (let i = 0; i < w.length; i += 2) if (w[i] % 7 === 1 && w[i] < 21 && w[i + 1]) heard[Math.floor(w[i] / 7)] = 1; }
  if (heard.join() !== '1,1,1') { console.log(`${name}: voices heard ${heard}`); bad++; } else console.log(`${name}: all three voices sound`);
});
IKARI_TUNES.forEach((name, n) => check(name, (M, K) => { const d = createDriver(M, K), i = d.init; d.init = () => i(n); return d; },
  cpu => cpu.call(0xE09A, { a: n }, { maxSteps: 1e6 }), 3000, m => m[0xE00A] === 0));
IKARI_EFFECTS.forEach((name, n) => check(name, (M, K) => { const d = createEffectDriver(M, K), i = d.init; d.init = () => i(n); return d; },
  (cpu, m) => { cpu.call(0xE12B, {}, { maxSteps: 1e6 }); m[0x9C] = 0x80; cpu.call(0x2E2B, { a: n }, { maxSteps: 1e6 }); }, 300,
  m => !(m[0xE5FE] | m[0xE5FF] | m[0xE600])));
process.exit(bad ? 1 : 0);
