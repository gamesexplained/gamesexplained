#!/usr/bin/env node
// Hold the page's port of the collision test against the game's own. index.html's clowns-collide
// block (clownHits) runs beside draw_clown ($F034) on the kit's 6502 simulator, over the bytes of
// the committed listing: 4,000 random screens of the playfield's characters (spaces, letters, the
// walls, ceiling and platforms 85-89, the balloon glyphs 96-119), with a random frame 0-10 and a
// random position whose nine cells lie on the screen. The nine codes the routine leaves at
// $44-$4C, the sprite it builds at $03C0 and the position it gives sprite 0 must be the port's.
// It exits 1 on any difference.
//   node games/c64/clowns/test_collide.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { clownHits } = g.run(page, 'clowns-collide', 'clownHits');
const image = g.listing().ram;
let seed = 0x1234567;
const rnd = (n) => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; };
const CODES = [32, 32, 32, 1, 5, 18, 85, 86, 87, 88, 89, ...Array.from({ length: 24 }, (_, i) => 96 + i)];
let bad = 0, hits = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (let n = 0; n < 4000; n++) {
  const screen = new Uint8Array(1000);
  for (let i = 0; i < 1000; i++) screen[i] = CODES[rnd(CODES.length)];
  const f = rnd(11), x = rnd(320), y = rnd(176);
  const m = image.slice(), vic = {};
  m.set(screen, 0x0400);
  const io = {
    read(a) { if (a === 0xD010 || a === 0xD015) return vic[a] || 0; throw new Error('read $' + a.toString(16)); },
    write(a, v) { if (a >= 0xD000 && a <= 0xD015) vic[a] = v; else throw new Error('write $' + a.toString(16)); },
  };
  new CPU(m, { port: { dir: 0x2F, data: 0xE5 }, io }).call(0xF034, { a: f | (x >> 8) << 7, x: x & 255, y });
  const r = clownHits(image, screen, f, x, y);
  const codes = Array.from(m.slice(0x44, 0x4D));
  if (codes.join() !== r.codes.join()) fail('frame', f, 'at', x, y, 'codes', codes.join(), '|', r.codes.join());
  if (Array.from(m.slice(0x03C0, 0x0400)).join() !== Array.from(r.sprite).join()) fail('frame', f, 'at', x, y, 'sprite');
  if (vic[0xD000] !== r.d000 || (vic[0xD010] & 1) !== r.x9 || vic[0xD001] !== r.d001) fail('frame', f, 'at', x, y, 'position');
  hits += codes.filter((c) => c).length;
}
console.log(`4000 cases, ${hits} cells hit, ${bad ? bad + ' differences' : 'every case matches'}`);
process.exit(bad ? 1 : 0);
