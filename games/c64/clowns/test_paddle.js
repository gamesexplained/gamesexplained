#!/usr/bin/env node
// Hold the page's port of the paddle routine against the game's own. index.html's clowns-paddle
// block (seesawTick) runs beside read_paddle_seesaw ($F189) on the kit's 6502 simulator, over the
// bytes of the committed listing: every paddle reading from every smoothed position (65,536 single
// ticks), then 20,000 ticks of random readings in a row, for each paddle and tilt. The position the
// routine keeps ($FF) and returns ($20) and the two sprites' x it writes must be the port's. It
// exits 1 on any difference.
//   node games/c64/clowns/test_paddle.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { seesawTick } = g.run(page, 'clowns-paddle', 'seesawTick');
const image = g.listing().ram;
let bad = 0, n = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };

function machine(player, paddle) {
  const m = image.slice(), vic = {};
  const io = {
    read(a) {
      if (a === 0xD419 + player) return paddle.value;
      if (a === 0xD010 || a === 0xD015) return vic[a] || 0;
      throw new Error('read $' + a.toString(16));
    },
    write(a, v) { if (a >= 0xD000 && a <= 0xD015) vic[a] = v; else throw new Error('write $' + a.toString(16)); },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0xE5 }, io });
  return { m, vic, tick(tilt) { cpu.call(0xF189, { a: player, x: tilt }); } };
}
function check(M, r, label) {
  n++;
  if (M.m[0xFF] !== r.pos || M.m[0x20] !== r.pos) fail(label, 'position', M.m[0xFF], M.m[0x20], '|', r.pos);
  if (M.vic[0xD002] !== r.s1 || M.vic[0xD004] !== r.s2 || ((M.vic[0xD010] >> 1) & 1) !== r.s1x9 || ((M.vic[0xD010] >> 2) & 1) !== r.s2x9)
    fail(label, 'sprites', M.vic[0xD002], M.vic[0xD004], M.vic[0xD010], '|', JSON.stringify(r));
}
const paddle = { value: 0 };
const one = machine(0, paddle);
for (let last = 0; last < 256; last++) for (let v = 0; v < 256; v++) {
  one.m[0xFF] = last; paddle.value = v; one.tick(0);
  check(one, seesawTick(v, last), `last ${last} reading ${v}`);
}
let seed = 99;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) & 255; };
for (const player of [0, 1]) for (const tilt of [0, 1]) {
  const M = machine(player, paddle);
  let last = 0;
  for (let t = 0; t < 20000; t++) {
    paddle.value = t % 50 < 25 ? rnd() : paddle.value;
    M.tick(tilt);
    const r = seesawTick(paddle.value, last);
    check(M, r, `paddle ${player} tilt ${tilt} tick ${t}`);
    last = r.pos;
    const ptr = 0xEF + 2 * (tilt & 1);
    if (M.m[0x07F9] !== ptr || M.m[0x07FA] !== ptr + 1) fail('sprite pointers', tilt, M.m[0x07F9], M.m[0x07FA]);
  }
}
console.log(`${n} ticks, ${bad ? bad + ' differences' : 'every one matches'}`);
process.exit(bad ? 1 : 0);
