'use strict';
// Holds graphics.html's unpacking of the packed athletes against the games' own routines: for every
// frame of High Jump (unpack_frame, $67CD), Show jumping (unpack_horse, $244E) and Triple Jump
// (draw_athlete from $AB3D, past its step table), the routine runs on the kit's simulator over the
// part's listing, and the sprites it writes and the offsets it points at must match unpackFrame's.
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { CPU } = require(path.resolve(__dirname, '../../../kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { unpackFrame, PACKED } = g.run('graphics.html', 'sg2-sprites', 'unpackFrame');
let bad = 0;
const SETS = [
  // part, routine, frame count, sprites, the frame's table, where the sprites land, setup, where the offsets end up
  { p: 'high-jump', at: 'unpack_frame', n: 50, spr: 5, lo: 0x4000, hi: 0x4064, add: 0x10, out: 0xC200,
    set: (m, f) => { m[0x3F] = f; m[0x1F] = 0; }, off: m => m[0x36] | m[0x37] << 8 },
  { p: 'equestrian', at: 'unpack_horse', n: 60, spr: 8, lo: 0x4600, hi: 0x463C, add: 0x36, out: 0xC200,
    set: (m, f) => { m[0x35] = f; m[0x2B] = 0; }, off: m => m[0x20] | m[0x21] << 8 },
  { p: 'triple-jump', at: 0xAB3D, n: 99, spr: 5, lo: 0x4000, hi: 0x4064, add: 0, out: 0xF800,
    set: () => {}, y: f => f, off: m => m[0x38] | m[0x39] << 8 },
];
for (const S of SETS) {
  const L = g.listing(`parts/${S.p}/listing.json`);
  const at = typeof S.at === 'number' ? S.at : L.byName.get(S.at);
  if (at === undefined) { console.log(S.p + ': no routine ' + S.at); bad++; continue; }
  let ok = 0;
  for (let f = 0; f < S.n; f++) {
    const m = L.ram.slice();
    const cpu = new CPU(m, { port: 0x35, io: { read: () => 0, write: () => {} } });
    S.set(m, f);
    cpu.call(at, { y: S.y ? S.y(f) : 0 }, { maxSteps: 1e6 });
    const port = unpackFrame(L.ram, L.ram[S.lo + f] | (((L.ram[S.hi + f] + S.add) & 0xFF) << 8), S.spr);
    let same = true;
    for (let s = 0; s < S.spr && same; s++) for (let i = 0; i < 63; i++) if (m[S.out + 64 * s + i] !== port.sprites[s][i]) { same = false; console.log(`${S.p} frame ${f} sprite ${s} byte ${i}: game ${m[S.out + 64 * s + i]}, port ${port.sprites[s][i]}`); break; }
    const o = S.off(m);
    for (let i = 0; i < 2 * S.spr && same; i++) if (m[o + i] !== port.off[i]) { same = false; console.log(`${S.p} frame ${f} offset ${i} differs`); }
    if (same) ok++; else bad++;
  }
  console.log(`${S.p}: ${ok} of ${S.n} frames agree`);
}
process.exit(bad ? 1 : 0);
