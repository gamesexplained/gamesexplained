#!/usr/bin/env node
// Hold the pages' monster pictures to the game's data. The block rp-monster (rpMonsters), the same
// on every page that carries it, runs the game's build_monster_frame ($B3F6) and compose_0 ($B520)
// on the kit's 6502 and reads the picture back from the six sprite shapes. Here every picture is
// worked out a second way, straight from the listing: the frame's 36 tile numbers from the
// character's frame table (frame_table_lo/hi, $B4B6/$B4B0) and each tile's 8 bytes from the
// character's set of 256 ($4000 + $800 for each set). For the 228 pictures (three characters, two
// facings, 38 frames) the two must agree in every pixel but one byte: the fourth byte of the
// second line in frames $18 and $19 facing left, which compose_0 reads from the wrong place
// ($B556; discoveries.html, "a raised fist with a notch"). RP_FRAMES must name 38 frames and leave
// exactly the four unnamed that nothing in the code sets.
// It exits 1 on any difference.
//   node games/c64/rampage/test_monsters.js
'use strict';
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), same = g.sameBlock('rp-monster');
const { rpMonsters, RP_SET, RP_FRAMES } = g.run(same.pages[0], 'rp-monster', 'rpMonsters', 'RP_SET', 'RP_FRAMES');
const L = g.listing(), r = L.ram, M = rpMonsters(r, kit);
let bad = 0, known = 0, pictures = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
for (let ch = 0; ch < 3; ch++) for (const right of [false, true]) for (let f = 0; f < 38; f++) {
  const set = RP_SET[ch] + (right ? 3 : 0), table = r[0xB4B6 + set] | r[0xB4B0 + set] << 8, tiles = 0x4000 + 0x800 * set;
  const P = M.picture(ch, right, f);
  pictures++;
  for (let row = 0; row < 48; row++) for (let b = 0; b < 6; b++) {
    const want = r[tiles + r[table + 36 * f + (row >> 3) * 6 + b] * 8 + (row & 7)];
    let got = 0; for (let i = 0; i < 4; i++) got = got << 2 | P.px[row * 24 + b * 4 + i];
    if (got === want) continue;
    if (!right && (f === 0x18 || f === 0x19) && row === 1 && b === 3) known++;
    else fail('character', ch, right ? 'right' : 'left', 'frame', f, 'row', row, 'byte', b, got, 'want', want);
  }
}
if (known !== 6) fail('the known slip shows in', known, 'bytes, not 6');
if (RP_FRAMES.length !== 38) fail('RP_FRAMES names', RP_FRAMES.length);
const unnamed = RP_FRAMES.map((n, i) => n ? -1 : i).filter((i) => i >= 0).join();
if (unnamed !== '3,14,29,30') fail('unnamed frames', unnamed);
console.log(`rampage monsters (${same.pages.join(', ')}): ` + (bad ? bad + ' differences' : `${pictures} pictures match their tiles, but for the one byte compose_0 misreads in ${known} of them`));
process.exit(bad ? 1 : 0);
