'use strict';
// Holds index.html's port of the game's drawing routine ($0640), litFromCells, to the chip's own
// picture: the game, rebuilt from listing.json, runs on the kit's SM5A through the clock, Game A and
// Game B and the bonus's blinking, and on every screen it draws the port must light the same
// segments from the same cells. Also the page's own frame, its recorded cells against its segments.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
const { litFromCells } = g.run('index.html', 'draw-from-cells', 'litFromCells');
g.lib('sm5a'); const SM5A = globalThis.SM5A;
const L = g.listing(), step = pl => ((pl >> 1 ^ pl) & 1 ? 0 : 0x20) | (pl >> 1 & 0x1f);
const order = []; let pl = 0; for (let i = 0; i < 63; i++) { order.push(pl); pl = step(pl); }
const rom = new Uint8Array(0x740), phys = [];
for (let page = 0; page < 29; page++) for (let i = 0; i < 64; i++) {
  const p = page * 64 + (i < 63 ? order[i] : 0x3f); rom[p] = L.ram[page * 64 + i]; phys[page * 64 + i] = p;
}
const m = new SM5A(rom);
let frames = 0, bad = 0, first = null, blinking = 0;
m.hooks[phys[0x0676]] = () => {          // the drawing's last instruction: both commons hold the picture
  frames++;
  if (m.ram[0x42] & 1) blinking++;
  const a = litFromCells(m.ram).sort().join(), b = m.lit().sort().join();
  if (a !== b) { bad++; if (!first) first = { cycles: m.cycles, port: a, chip: b }; }
};
const HZ = 16384, run = s => m.run(Math.round(s * HZ));
const press = (bit, s) => { m.rows[2] |= bit; run(s); m.rows[2] &= ~bit; run(0.3); };
let seed = 7; const rnd = n => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed % n; };
const play = s => { const end = m.cycles + s * HZ; while (m.cycles < end) { const a = rnd(3); m.alpha = a === 0 ? 1 : 0; m.beta = a === 1 ? 1 : 0; run(0.08); m.alpha = m.beta = 0; run(0.1 + rnd(30) / 100); } };
run(1); press(1, 0.3); run(20);           // Time: the clock and its demo
press(8, 0.3); run(3); press(1, 0.3);     // the alarm's setting
press(4, 0.3); play(80);                  // Game A
press(2, 0.3); play(80);                  // Game B
press(4, 0.3); run(1);                    // Game A again, the bonus at 200 with a spare lost
m.ram[0x15] = 1; m.ram[0x16] = 9; m.ram[0x17] = 9; m.ram[0x04] &= ~2; m.ram[0x0b] |= 1; run(8);
const rec = JSON.parse(g.read('index.html').match(/const REC = (\{.*\});\n/)[1]);
const okPage = litFromCells(rec.cells).sort().join() === rec.frameLit.slice().sort().join();
console.log(frames + ' screens drawn (' + blinking + ' with the bonus blinking), ' + bad + ' differ; the page\'s own frame ' + (okPage ? 'agrees' : 'DIFFERS'));
if (first) console.log('first difference at cycle ' + first.cycles + '\n port ' + first.port + '\n chip ' + first.chip);
if (bad || !okPage || frames < 300 || blinking < 4) process.exit(1);
