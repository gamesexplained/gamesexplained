'use strict';
// Holds index.html's scream player, a port of play_scream ($3600) called once a bit, against the
// game's routine run on the kit's 6502 over the listing's memory: every write to the sound chip,
// in order, and the number of bits. Also says how many cycles the game's loop takes between
// volume writes, which the page's SCREAM_PERIOD is the average of.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const kit = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js')), { CPU } = kit;
const g = game(__dirname);
const { createScreamDriver, SCREAM_PERIOD } = g.run('index.html', 'createScreamDriver', 'createScreamDriver', 'SCREAM_PERIOD');
const ram = g.listing('parts/game/listing.json').ram;
const m = ram.slice(), game_w = [], vol = [];
const cpu = new CPU(m, { port: 0x36, io: { read: a => { throw new Error('read ' + a.toString(16)); },
  write: (a, v) => { if (a >= 0xD400 && a <= 0xD418) { game_w.push(a - 0xD400, v); if (a === 0xD418) vol.push(cpu.cycles); } else throw new Error('write ' + a.toString(16)); } } });
cpu.call(0x3600, {}, { maxSteps: 1e8 });
const d = createScreamDriver({ sample: ram.slice(0x36A0, 0x3FA1), period: SCREAM_PERIOD });
const port_w = [];
d.init();
let calls = 0;
while (d.playing() && calls < 100000) { d.play(); port_w.push(...d.writes); calls++; }
let bad = 0;
if (port_w.join(',') !== game_w.join(',')) {
  const i = port_w.findIndex((v, k) => v !== game_w[k]);
  console.log(`writes differ at ${i}: port ${port_w.slice(i, i + 8)} game ${game_w.slice(i, i + 8)}`); bad++;
} else console.log(`${calls} bits, ${game_w.length / 2} writes agree`);
const gaps = vol.slice(2, -1).map((t, i) => t - vol[i + 1]);
const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
console.log(`gaps between volume writes: ${Math.min(...gaps)} to ${Math.max(...gaps)} cycles, mean ${mean.toFixed(1)}`);
if (Math.round(mean) !== SCREAM_PERIOD) { console.log(`SCREAM_PERIOD is ${SCREAM_PERIOD}, the mean ${Math.round(mean)}`); bad++; }
process.exit(bad ? 1 : 0);
