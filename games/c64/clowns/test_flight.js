#!/usr/bin/env node
// Hold the page's port of the clown's flight against the game's own. index.html's clowns-flight
// block (clownTick, clownRandom) runs beside move_clown ($E63C) on the kit's 6502 simulator, over
// the bytes of the committed listing: the game's tables set by its own init_tables ($E444), an
// empty screen so that nothing is hit, and 3,000 random flights, each started falling towards the
// see-saw (two in three over its landing window) with a random position, speed, see-saw, tilt, speed level, counts and seed, and run for up
// to 400 ticks, until the clown is down, or until it climbs above y 24, where the ceiling would catch it. After every tick, every variable the flight keeps must be
// the port's: the seed, x, y, both speeds, the direction flags, the tilt, the fall flag, gravity and
// the bounce count. It exits 1 on any difference.
//   node games/c64/clowns/test_flight.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { clownTick } = g.run(page, 'clowns-flight', 'clownTick');
const image = g.listing().ram;
let seed = 2026;
const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
let bad = 0, ticks = 0, launches = 0, falls = 0, high = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };

function machine() {
  const m = image.slice(), vic = {};
  const io = {
    read(a) { if (a >= 0xD000 && a <= 0xD02E) return vic[a] || 0; throw new Error('read $' + a.toString(16)); },
    write(a, v) {
      if ((a >= 0xD000 && a <= 0xD02E) || (a >= 0xD400 && a <= 0xD418) || (a >= 0xD800 && a <= 0xDBFF)) { vic[a] = v; return; }
      throw new Error('write $' + a.toString(16));
    },
  };
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0xE5 }, io });
  m[0x02] = 0x00; m[0x03] = 0x02;                 // the software stack at $0200, as start leaves it
  cpu.call(0xE444, { y: 0x44 });                    // init_tables
  m.fill(0x20, 0x0400, 0x07E8);                     // an empty screen
  m[0x13] = 1; m[0x4F] = 0xFF; m[0x0213] = 0xFF;    // white text, sound on, a game in play
  return { m, tick() { m[0x02] = 0x00; m[0x03] = 0x02; cpu.call(0xE63C, { y: 0x44 }); } };
}
const tables = (m) => ({
  dxHi: [0, 1, 2, 3].map((z) => m[0x0229 + z]), dxLo: [0, 1, 2, 3].map((z) => m[0x022D + z]),
  dyHi: [0, 1, 2, 3].map((z) => m[0x0231 + z]), dyLo: [0, 1, 2, 3].map((z) => m[0x0235 + z]),
  pops: [0, 1, 2].map((l) => m[0x023C + l]), grav: [0, 1, 2].map((l) => m[0x0223 + l] << 8 | m[0x0226 + l]),
});
const read = (m) => ({
  seed: m[0x12] << 8 | m[0x11], x: m[0x0200] << 16 | m[0x0201] << 8 | m[0x0202], y: m[0x0203] << 8 | m[0x0204],
  dx: m[0x0205] << 8 | m[0x0206], dy: m[0x0207] << 8 | m[0x0208], level: m[0x0209], toGo: m[0x020A],
  right: m[0x020B], falling: m[0x020C], tilt: m[0x020E], saw: m[0x020F], down: m[0x0216],
  grav: m[0x0219] << 8 | m[0x021A], bounces: m[0x021B], rnd: m[0x021C],
});
const KEYS = ['seed', 'x', 'y', 'dx', 'dy', 'right', 'falling', 'tilt', 'down', 'grav', 'bounces'];
for (let n = 0; n < 3000 && bad < 10; n++) {
  const M = machine(), m = M.m;
  const level = rnd(3), saw = 17 + rnd(239), tilt = rnd(2) ? 0xFF : 0, aim = rnd(3) > 0;
  const s = {
    seed: rnd(65536), x: (aim ? saw + (tilt ? -6 : 21) + rnd(24) + 512 : saw + rnd(80) - 20 + 256) % 512 << 8 | rnd(256),
    y: (aim ? 168 + rnd(8) : 150 + rnd(30)) << 8 | rnd(256),
    dx: (rnd(2) ? rnd(aim ? 0x40 : 0x300) : 0x10000 - rnd(aim ? 0x40 : 0x300)) & 0xFFFF, dy: rnd(0x400), level, toGo: rnd(40),
    tilt, saw, down: 0, grav: [3, 11, 27][level], bounces: rnd(20), rnd: 1 + rnd(3),
  };
  m[0x11] = s.seed & 255; m[0x12] = s.seed >> 8;
  m[0x0200] = s.x >> 16; m[0x0201] = s.x >> 8 & 255; m[0x0202] = s.x & 255;
  m[0x0203] = s.y >> 8; m[0x0204] = s.y & 255; m[0x0205] = s.dx >> 8; m[0x0206] = s.dx & 255;
  m[0x0207] = s.dy >> 8; m[0x0208] = s.dy & 255; m[0x0209] = level; m[0x020A] = s.toGo;
  m[0x020E] = tilt; m[0x020F] = saw; m[0x0216] = 0; m[0x0219] = 0; m[0x021A] = s.grav;
  m[0x021B] = s.bounces; m[0x021C] = s.rnd;
  s.T = tables(m);
  for (let t = 0; t < 400; t++) {
    M.tick();
    const r = clownTick(s); ticks++;
    if (r === 'launch') launches++;
    const game = read(m);
    const diff = KEYS.filter((k) => game[k] !== s[k]);
    if (diff.length) { fail('flight', n, 'tick', t, diff.map((k) => `${k} ${game[k].toString(16)}|${s[k].toString(16)}`).join(' ')); break; }
    if (game.down) { falls++; break; }
    if (m[0x0203] < 24) { high++; break; }       // the ceiling (row 1) would have caught it: none here
  }
}
console.log(`${ticks} ticks, ${launches} launches, ${falls} falls, ${high} up to the ceiling, ${bad ? bad + ' differences' : 'every variable matches'}`);
process.exit(bad ? 1 : 0);
