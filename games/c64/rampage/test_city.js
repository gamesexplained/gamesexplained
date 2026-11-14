#!/usr/bin/env node
// Hold the pages' city to the game's data. The block rp-city (rpCity), the same on every page that
// carries it, runs the game's own code for a level on the kit's 6502. Here its results are checked
// against the listing read directly:
// - the 20 levels and the two table entries after them: each building's left and right columns,
//   height and strength against level_types ($A48E), level_columns ($A462) and the six types'
//   tables (blocks wide $905B, rows $9067, strength $906D);
// - the three names in the status texts ($9B11): GEORGE, LIZZY and RALPH, and RHONA, I LOVE and
//   YOU on level $12 with nobody joined, and on no other level;
// - a punch on a wall of the first building changes one block of its map and takes 1 from its
//   strength, and a building with no strength left sinks to nothing within 40 passes and leaves
//   the fine scroll ($D016) where the last pass put it;
// - a bullet in each monster's box (shot): the first and second monsters' flags for their own,
//   and the second monster's flag for the third's;
// - energy 0 for the first monster turns its texts to GAME and OVER and leaves the second
//   monster's eight letter colours all red (2) whatever its energy, where 50 gives seven white
//   (1) with the first monster in the game;
// - the file's own building maps (saved) differ from a new level's, and its strengths are 8, 11
//   and 8 where a new level has 10, 12 and 8: two punches on the first building and one on the
//   second.
// It exits 1 on any difference.
//   node games/c64/rampage/test_city.js
'use strict';
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const kit = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname), same = g.sameBlock('rp-city');
g.lib('c64');
const { rpCity } = g.run(same.pages[0], 'rp-city', 'rpCity');
const L = g.listing(), r = L.ram;
let bad = 0;
const check = (what, got, want) => { if (String(got) !== String(want)) { if (bad++ < 12) console.log('DIFFERS', what, String(got), 'want', String(want)); } };
const w = (a) => r[a] | r[a + 1] << 8;
// the names' alphabet: A is $09, space $01
const text = (m, a, n) => Array.from(m.subarray(a, a + n)).map((c) => c >= 0x09 && c <= 0x22 ? String.fromCharCode(65 + c - 9) : c === 0x01 ? ' ' : '?').join('').trim();
const names = (C) => [0, 8, 16].map((o) => text(C.mem, 0x9B11 + o, 6)).join('/');   // the six characters of each that the status line shows

let buildings = 0;
for (let lv = 0; lv < 22; lv++) {
  const types = w(0xA48E + 2 * lv), cols = w(0xA462 + 2 * lv), want = [];
  for (let i = 0; r[types + i] < 0x80; i++) { const t = r[types + i]; want.push([r[cols + i], r[cols + i] + 2 * r[0x905B + t] - 1, r[0x9067 + t], r[0x906D + t]].join(' ')); }
  const C = rpCity(r, kit, lv, false).draw();
  check('level ' + lv, C.buildings().map((q) => [q.left, q.right, q.height, q.strength].join(' ')).join(', '), want.join(', '));
  buildings += want.length;
  check('names, level ' + lv, names(C), 'GEORGE/LIZZY/RALPH');
  check('names in the demonstration, level ' + lv, names(rpCity(r, kit, lv, true).draw()), lv === 0x12 ? 'RHONA/I LOVE/YOU' : 'GEORGE/LIZZY/RALPH');
}

{ // a punch, and a fall
  const C = rpCity(r, kit, 0, false).draw(), b = C.buildings()[0], before = C.mem.slice(0x7500, 0x7680);
  check('a punch changes the map', C.punch(b.left + 2, 21 - 3), true);
  let changed = 0; for (let i = 0; i < 0x180; i++) if (C.mem[0x7500 + i] !== before[i]) changed++;
  check('blocks changed by one punch', changed, 1);
  check('strength after one punch', C.buildings()[0].strength, b.strength - 1);
  check('$D016 before a fall', C.vic[0x16], 0xD8);
  C.weaken(1);
  let passes = 0; while (C.buildings()[1].height && passes < 60) { C.pass(); passes++; }
  check('the second building is down within 40 passes', passes <= 40, true);
  const left = C.vic[0x16];
  check('the fall moves the fine scroll', left !== 0xD8, true);
  C.pass(); C.pass();
  check('$D016 stays as the fall left it', C.vic[0x16], left);
}

check('bullets', [0, 1, 2].map((k) => rpCity(r, kit, 0, false).shot(k).flags.join('')).join(' '), '100 010 010');

{ // the energy words
  const colours = (C) => [0, 8, 16].map((o) => Array.from(C.mem.subarray(0x9B29 + o, 0x9B31 + o)).join('')).join(' ');
  check('energy 56, 50, 20', colours(rpCity(r, kit, 0, false).energy([56, 50, 20])), '11111111 11111112 11122222');
  const C = rpCity(r, kit, 0, false).energy([0, 50, 20]);
  check('energy 0, 50, 20', colours(C).split(' ').slice(1).join(' '), '22222222 11122222');
  check('texts with the first monster out', names(C), 'GAME/LIZZY/RALPH');
}

{ // the maps the file holds
  const fresh = rpCity(r, kit, 0, false), C = rpCity(r, kit, 0, false).saved();
  const diff = [0, 1, 2].map((b) => { let n = 0; for (let i = 0; i < 64; i++) if (fresh.mem[0x7500 + 64 * b + i] !== C.mem[0x7500 + 64 * b + i]) n++; return n; });
  check('the file\'s three maps differ from a new level\'s', diff.every((n) => n > 0), true);
  check('strengths of a new level', fresh.buildings().map((q) => q.strength).join(' '), '10 12 8');
  check('strengths the file holds', C.buildings().map((q) => q.strength).join(' '), '8 11 8');
}

console.log(`rampage city (${same.pages.join(', ')}): ` + (bad ? bad + ' differences' : `${buildings} buildings of 22 levels match the level tables; names, punch, fall, bullets, energy words and the saved maps as the pages say`));
process.exit(bad ? 1 : 0);
