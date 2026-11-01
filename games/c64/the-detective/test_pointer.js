#!/usr/bin/env node
// Hold the How it works page's menu pointer against the game's own code. index.html's td-pointer block
// (tdPointerNew, tdPointerStep, tdIconUnder) moves the investigation menu's pointer. Here the game's own
// movement code, state3_menu from $3185 to $3249, runs on the kit's simulator over the whole listing for
// one frame at a time, reading the stick from $DC00, with the pointer's state in $013B-$0142; the page's
// step runs beside it. 40 runs of 3,000 frames each, with the stick held in a random direction (or none)
// for a random 1 to 60 frames at a time, from the state the menu opens with ($3308) and from random
// states, must leave the same position, speed and frame counters after every frame. Then
// icon_under_pointer ($33A3) runs for every position the pointer can take and every icon count 1-9,
// against tdIconUnder. It exits 1 on any difference.
//   node games/c64/the-detective/test_pointer.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { tdPointerNew, tdPointerStep, tdIconUnder } = g.run('index.html', 'td-pointer', 'tdPointerNew', 'tdPointerStep', 'tdIconUnder');
const L = g.listing();
let bad = 0, frames = 0, seed = 20261101;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 8) % n; };
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const s8 = (b) => (b & 0x80 ? b - 256 : b);
let stick = 0xFF;
const io = { read(a) { if (a === 0xDC00) return stick; throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
const STICKS = [0xFF, 0xFE, 0xFD, 0xFB, 0xF7, 0xFA, 0xF6, 0xF9, 0xF5, 0x7F, 0xEF];
for (let run = 0; run < 40; run++) {
  const m = L.ram.slice(), cpu = new CPU(m, { port: 0x35, io });
  let s = tdPointerNew();
  if (run > 0) s = { x: 0xF4 + rnd(0x131 - 0xF4 + 1), y: 0xC0 + rnd(0xE1 - 0xC0 + 1), vx: rnd(16) - 8, vy: rnd(16) - 8, t4: 1 + rnd(4), t6: 1 + rnd(6) };
  const put = () => { m[0x13B] = s.x & 0xFF; m[0x13C] = s.x >> 8; m[0x13D] = s.y; m[0x13E] = s.vx & 0xFF; m[0x13F] = s.vy & 0xFF; m[0x141] = s.t4; m[0x142] = s.t6; };
  put();
  let hold = 0;
  for (let f = 0; f < 3000; f++) {
    if (hold-- <= 0) { stick = STICKS[rnd(STICKS.length)]; hold = 1 + rnd(60); }
    cpu.pc = 0x3185; cpu.sp = 0xF0;
    cpu.run({ until: 0x3249, maxSteps: 1000 });
    s = tdPointerStep(s, stick);
    const game = { x: m[0x13B] | ((m[0x13C] & 1) << 8), y: m[0x13D], vx: s8(m[0x13E]), vy: s8(m[0x13F]), t4: m[0x141], t6: m[0x142] };
    for (const k of Object.keys(game)) if (game[k] !== s[k]) { fail('run', run, 'frame', f, k, 'game', game[k], 'page', s[k]); s = game; put(); break; }
    frames++;
  }
}
let places = 0;
for (let x = 0xF4; x <= 0x131; x++) for (let y = 0xC0; y <= 0xE1; y++) for (let count = 1; count <= 9; count++) {
  const m = L.ram.slice(), cpu = new CPU(m, { port: 0x35, io });
  m[0x13B] = x & 0xFF; m[0x13C] = x >> 8; m[0x13D] = y; m[0x148] = count;
  cpu.call(0x33A3, {});
  const game = s8(m[0x147]), page = tdIconUnder({ x, y }, count);
  if (game !== page) fail('icon under x', x, 'y', y, 'count', count, 'game', game, 'page', page);
  places++;
}
console.log(frames + ' frames and ' + places + ' pointer places: ' + (bad ? bad + ' differences' : 'every one matches the game\'s own code'));
process.exit(bad ? 1 : 0);
