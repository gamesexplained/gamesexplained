#!/usr/bin/env node
// Hold the page's port of the sound effects against the game's own. index.html's clowns-sound block
// (createEffects) runs beside sound_bounce ($F33B), sound_pop ($F34E), sound_fall ($F358) and
// sound_tick ($F36B) on the kit's 6502 simulator, over the bytes of the committed listing, with the
// game's sound flag ($4F) on. Each effect is started alone and ticked 60 times; then 2,000 random
// sequences start effects on random ticks, over each other, for 200 ticks each. The SID writes of
// the start and of every tick must be the port's, in order. It exits 1 on any difference.
//   node games/c64/clowns/test_sound.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { createEffects } = g.run(page, 'clowns-sound', 'createEffects');
const image = g.listing().ram;
const DATA = { pitches: Array.from(image.slice(0xFFA3, 0xFFD3)), sid: Array.from(image.slice(0xF74C, 0xF762)) };
const START = [0xF33B, 0xF34E, 0xF358];
let bad = 0, ticks = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };

function machine() {
  const m = image.slice(); m[0x4F] = 0xFF;
  let w = [];
  const io = {
    read(a) { throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD400 && a <= 0xD418) w.push(a - 0xD400, v); else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0xE5 }, io });
  return { call(a) { cpu.call(a, {}); }, take() { const t = w; w = []; return t; } };
}
// a run: starts[t] is the effect started before tick t, or undefined
function run(label, starts, n) {
  const M = machine(), drv = createEffects(DATA);
  let pending = [];
  for (let t = 0; t < n; t++) {
    const e = starts[t];
    if (e !== undefined) { M.call(START[e]); drv.init(e); }
    M.call(0xF36B); drv.play(); ticks++;
    const a = M.take(), b = drv.writes;
    if (a.join() !== b.join()) { fail(label, 'tick', t, a.join(), '|', b.join()); return; }
  }
}
for (let e = 0; e < 3; e++) run('effect ' + e, { 0: e }, 60);
let seed = 7;
const rnd = (k) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % k; };
for (let r = 0; r < 2000; r++) {
  const starts = {};
  for (let t = 0; t < 200; t++) if (rnd(12) === 0) starts[t] = rnd(3);
  run('sequence ' + r, starts, 200);
}
console.log(`${ticks} ticks, ${bad ? bad + ' differences' : 'every write matches'}`);
process.exit(bad ? 1 : 0);
