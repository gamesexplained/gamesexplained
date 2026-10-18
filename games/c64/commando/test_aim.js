#!/usr/bin/env node
// Hold the page's aim() and fires() against the game's own code. index.html's commando-aim block
// runs beside the facing routine ($310A) and the rifle's shot ($33B2) on the kit's 6502 simulator,
// over the bytes of the committed listing: for every pair of soldier and player on a grid of the
// values where the comparisons turn (x 30 and 60 apart, y 20 and 40, the wrap at 256 and both
// sides of x 256), and for 50,000 random pairs, the heading $310A sets (or leaves alone) must be
// aim()'s, and $33B2 must fire, from every facing, exactly when fires() says, along that heading.
// Everything it needs is committed. It exits 1 on any difference.
//   node games/c64/commando/test_aim.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
const { aim, fires } = g.run(page, 'commando-aim', 'aim', 'fires');
const m = g.listing().ram;
const io = { read(a) { throw new Error('read $' + a.toString(16)); }, write(a) { throw new Error('write $' + a.toString(16)); } };
const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x36 }, io });

let bad = 0, cases = 0, shots = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
// Enemy 0 is slot 5: x $0422, x-high $0412, y $0432, facing $04AC, timer $04B7, behaviour $0492.
// The player is slot 0: x $041D, x-high $040D, y $042D.
function place(e, p) {
  m[0x0422] = e.x; m[0x0412] = e.xh; m[0x0432] = e.y;
  m[0x041D] = p.x; m[0x040D] = p.xh; m[0x042D] = p.y;
}
function check(e, p, f) {
  cases++;
  place(e, p);
  m[0x04AC] = 0xFF;
  cpu.call(0x310A, { x: 0 });
  const turned = m[0x04AC] === 0xFF ? -1 : m[0x04AC], want = aim(e, p);
  if (turned !== want) fail('$310A', JSON.stringify(e), JSON.stringify(p), 'game', turned, 'port', want);
  place(e, p);
  m[0x04AC] = f; m[0x04B7] = 0; m[0x0504] = 0x3F;           // a frame on which he may fire
  m[0x0492] = 5; m[0x0493] = 0;                             // the shooter, then a free slot
  for (let i = 0x0494; i <= 0x049C; i++) m[i] = 5;
  cpu.call(0x33B2, { x: 0 });
  const shot = m[0x0493] === 8;
  if (shot) shots++;
  if (shot !== fires(e, p, f)) fail('$33B2', JSON.stringify(e), JSON.stringify(p), 'facing', f, 'game', shot, 'port', !shot);
  else if (shot && m[0x04AC] !== want) fail('$33B2 heading', JSON.stringify(e), JSON.stringify(p), m[0x04AC], want);
}
const XS = [0, 1, 2, 28, 29, 30, 31, 32, 58, 59, 60, 61, 62, 100, 127, 128, 200, 224, 225, 226, 227, 254, 255];
const YS = [0, 1, 19, 20, 21, 39, 40, 41, 100, 214, 215, 216, 234, 235, 236, 254, 255];
const HS = [0, 0xFF];
let n = 0;
for (const exh of HS) for (const pxh of HS) for (const ex of XS) for (const px of XS)
  for (const ey of YS) for (const py of YS) check({ x: ex, xh: exh, y: ey }, { x: px, xh: pxh, y: py }, (n++ * 7) & 15);
let s = 20261010;
const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) & 255; };
for (let i = 0; i < 50000; i++)
  check({ x: rnd(), xh: rnd() & 1 ? 0xFF : 0, y: rnd() }, { x: rnd(), xh: rnd() & 1 ? 0xFF : 0, y: rnd() }, rnd() & 15);
console.log(`${cases} pairs, ${shots} shots, ${bad ? bad + ' differ' : 'every heading and shot matches'}`);
process.exit(bad ? 1 : 0);
