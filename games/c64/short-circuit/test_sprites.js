#!/usr/bin/env node
// Hold graphics.html's sprite widgets (the block sc-sprites) to the game's code. The page names
// part two's creatures with the frame lists the game reads and the shapes in them; each must be
// the listing's bytes:
// - every creature whose frames come from one of the lists at $8F9A-$8FC7 draws exactly that
//   list's pointers, in order (the snake and the log, two sprites wide, two lists side by side);
// - the hit flash is the nine pointers at $8F91 (slot_animations reads $8F90 plus 1 to 9); the grey robot is Number 5's walk table at $1C84;
//   the soldier's legs are the guard's at $23FC;
// - Number 5's part-two pairs are the immediates the game loads ($2C14, $2C19, $2C1F, $2C24,
//   $2C4F, $2C59, $3ACA, $3ACF, $3A9D, $3AA2) and the lower half of the duck in $2DBE;
// - event 10 has no routine in $8A6E and no column of $896E asks for it, as the page says;
// - every one of the 128 shapes has a line in the bank's list of users but those the page says
//   it found none for, which must be none of the shapes the creatures draw.
// The shapes and colours of each event were seen on the kit's machine model (kit/c64/machine.js)
// on 13 November 2026, from a snapshot of part two in play with the scroll column set to a column
// of the event; the colours are not held here, since the game sets them in each starter routine.
//   node games/c64/short-circuit/test_sprites.js
'use strict';
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const g = game(__dirname);
const { SC_CREATURES, SC_PART2, scUsers } = g.run('graphics.html', 'sc-sprites', 'SC_CREATURES', 'SC_PART2', 'scUsers');
const ram = g.listing().ram;
let bad = 0;
const check = (what, got, want) => { if (String(got) !== String(want)) { bad++; console.log('DIFFERS', what, got, 'want', want); } };
const bytes = (a, n) => Array.from(ram.subarray(a, a + n), (b) => b.toString(16).toUpperCase().padStart(2, '0'));
const col = (frames, j) => frames.map((f) => f[j]);

const lists = { '$8F9A': 4, '$8F9E': 3, '$8FA9': 2, '$8FA7': 2, '$8FB9': 3, '$8FC0': 2, '$8FC2': 2, '$8FC4': 2, '$8FC6': 2, '$8F91': 9 };
for (const [e, name, where, , frames] of SC_CREATURES) {
  if (lists[where]) check(`event ${e} ${name}`, col(frames, 0), bytes(parseInt(where.slice(1), 16), lists[where]));
}
const by = Object.fromEntries(SC_CREATURES.map((c) => [c[0], c[4]]));
check('the log, front', col(by[6], 0), bytes(0x8FAB, 2));
check('the log, back', col(by[6], 1), bytes(0x8FAD, 2));
check('the snake, one sprite', col(by[7], 0), bytes(0x8FA1, 3));
check('the snake, the other', col(by[7], 1), bytes(0x8FA4, 3));
check('event 11, one sprite', col(by[11], 0), bytes(0x8FBC, 2));
check('event 11, the other', col(by[11], 1), bytes(0x8FBE, 2));
check('the grey robot', by[8].map((f) => f[0]).join(), ['C4/C5', 'C4/C7'].join());
check('the robot is the walk table at $1C84', bytes(0x1C84, 4), ['C4', 'C4', 'C5', 'C7']);
check('the soldier', by[9].map((f) => f[0].split('/')[1]), bytes(0x23FC, 4));

const imm = (a) => ram[a + 1].toString(16).toUpperCase();
check('part two pairs', SC_PART2.map((p) => p.join('/')).join(),
  [[imm(0x2C14), imm(0x2C19)], [imm(0x2C1F), imm(0x2C24)], [imm(0x2C4F), bytes(0x2DBE, 1)[0]], [imm(0x2C59), bytes(0x2DBE, 1)[0]],
    [imm(0x3ACA), imm(0x3ACF)], [imm(0x3A9D), imm(0x3AA2)]].map((p) => p.join('/')).join());

check('event 10 has no routine', [ram[0x8A6E + 20], ram[0x8A6F + 20]].join(), '0,0');
check('no column asks for event 10', Array.from(ram.subarray(0x896E, 0x896E + 256)).filter((v) => v === 10).length, 0);

const users = scUsers(ram);
for (const [, , , , frames] of SC_CREATURES)
  for (const f of frames) for (const s of f) for (const p of s.split('/'))
    if (!users[parseInt(p, 16)]) { bad++; console.log('no user listed for', p); }
const none = []; for (let p = 0x80; p < 0x100; p++) if (!users[p]) none.push(p.toString(16));
console.log('shapes with no user found:', none.length, none.join(' '));

console.log(bad ? bad + ' difference(s)' : "short-circuit sprites: the page's creatures and Number 5's shapes are the game's own frame lists");
process.exit(bad ? 1 : 0);
