#!/usr/bin/env node
// Hold the Discoveries tab's spirit meter against the game's code. discoveries.html's cm-meter
// block (castleMeter) gives the meter for a clock and a number of spirits destroyed; the game's own
// MUL_S8_S8_TO_S16 ($2643) and DIV_S24_BY_S16 ($259F), called as $7286-$72A4 calls them, run on the
// kit's simulator over the listing's memory, must give the same low byte of the quotient, which
// $72A7-$72A9 compares with $40, for every clock value 0-255 and every count of spirits 0-21:
// 5,632 cases. It also checks the endings the page reports: with 11 and 12 destroyed the game
// ends at a clock of 128, and with 13 or more at none of the 256.
// It exits 1 on any difference.
//   node games/c64/castle-master/test_meter.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'discoveries.html';
const { castleMeter } = g.run(page, 'cm-meter', 'castleMeter');
const L = g.listing();
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
let bad = 0, cases = 0;
const ends = [];
if (L.ram[0x9D49] !== 21) { console.log('DIFFERS: $9D49 is', L.ram[0x9D49], 'where the page takes 21'); bad++; }
for (let d = 0; d <= 21; d++) {
  let first = null;
  for (let e = 0; e < 256; e++) {
    const cpu = new CPU(L.ram.slice(), { port: { dir: 0x2F, data: 0x35 }, io }), m = cpu.m;
    cpu.call(0x2643, { a: 0, x: e, y: (21 - d) & 255 });            // $728C-$7294: Y = 21 - destroyed, X = the clock
    m[0x8C] = 21; m[0x8D] = 0;                                        // $7297-$72A2
    cpu.call(0x259F, { a: m[0x82], x: m[0x83], y: 0 });
    const game = m[0x88], port = castleMeter(e, d);
    cases++;
    if (game !== port && bad++ < 10) console.log('DIFFERS: clock', e, 'destroyed', d, 'game', game, 'page', port);
    if (first === null && e >= 32 && game >= 0x40) first = e;
    if (d >= 13 && game >= 0x40 && bad++ < 20) console.log('DIFFERS: with', d, 'destroyed a clock of', e, 'ends the game');
  }
  ends.push(first);
}
const want = (d, e) => { if (ends[d] !== e && bad++ < 20) console.log('DIFFERS: with', d, 'destroyed the game ends at clock', ends[d], 'not', e); };
want(0, 64); want(10, 123); want(11, 128); want(12, 128);
for (let d = 13; d <= 21; d++) want(d, null);
console.log(`${cases} cases through $2643 and $259F; the game ends at clock ${ends.map((e, d) => d + ': ' + (e === null ? 'never' : e)).join(', ')}`);
if (bad) { console.log(bad + ' differ'); process.exit(1); }
console.log('the page works the meter out as the game does');
