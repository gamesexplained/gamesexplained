'use strict';
// The rules the Discoveries page carries (the block loc-finds) against the game's own code, run on
// the kit's Z80 from the committed listings:
// - find_file ($C675) given a tape of headers, for every pairing of a wanted name with a tape of
//   names, against LOCFinds.find: the header the game stops at;
// - drink ($73D0) from a vial of every strength, for every potion consumption from 1 to 12, against
//   LOCFinds.potionTurns: the turns in the creature record's byte 3;
// - design_exit's arithmetic ($E17E-$E18A) on every experience total from 0 to 1023, against
//   LOCFinds.keep: the score it keeps in byte 69 of the record;
// - scenario 2's lava hook ($E1F0), which hurts only a creature a human moves;
// - computer_choose_target ($9992) on scenario 2's route 0, whose waypoint 28 is a square of rock;
// - computer_pick_up ($A0F0) on a pile of fifteen objects: list_objects_at lists ten, and the search
//   for the twelfth runs past the list and marks the entry named by the byte before its first match.
//   node games/spectrum/lords-of-chaos/test_discoveries.js
const path = require('path');
const { game } = require(path.resolve(__dirname, '../../../kit/scripts/port_check.js'));
const { memory, call } = require('./port/test/game.js');
const g = game(__dirname);
g.sameBlock('loc-finds');
const { LOCFinds } = g.run('discoveries.html', 'loc-finds', 'LOCFinds');

let fails = 0, cases = 0;
const fail = msg => { if (fails++ < 8) console.log('FAIL ' + msg); };
const ret = (c, M) => { c.pc = M[c.sp] | M[c.sp + 1] << 8; c.sp += 2; return true; };

// find_file: tape_load ($C5E5) gives the next header in found_name ($C6B2) with carry clear;
// KEY-SCAN ($028E, in the ROM) says no key; the game prints what it finds as it goes.
const names = ['MERLIN1 .WIZ', 'MORDRED2.WIZ', 'GAME    .SVG', 'GANDALF3.WIZ', '1       .GAM', 'DESIGNER.   '];
const tapes = [];
for (let a = 0; a < names.length; a++) for (let b = 0; b < names.length; b++) if (a !== b)
  tapes.push([names[a], names[b]]);
for (const want of names) for (const tape of tapes) {
  const M = memory(1);
  for (let i = 0; i < 12; i++) M[0xC637 + i] = want.charCodeAt(i);
  let next = 0;
  call(M, 0xC675, {}, { hooks: {
    0xC5E5: (c, M) => {
      if (next === tape.length) { next++; c.pc = 0; return true; }      // the tape has run out
      const h = tape[next++];
      for (let i = 0; i < 12; i++) M[0xC6B2 + i] = h.charCodeAt(i);
      c.f &= ~1; return ret(c, M);
    },
    0x028E: (c, M) => { c.e = 0xFF; return ret(c, M); },
  }, limit: 5e6 });
  const game = next > tape.length ? -1 : next - 1, page = LOCFinds.find(want, tape);
  cases++;
  if (game !== page) fail(`find_file wanting ${want} on ${tape.join(', ')}: game ${game}, page ${page}`);
}

// drink: a vial ($73) of strength s in use by a creature whose type has consumption k (byte 9)
for (let k = 1; k <= 12; k++) for (let s = 0; s < 256; s++) {
  const M = memory(1);
  const ent = 0x5B5A + 6 * 20, type = 0xF000, rec = 0xF100;
  M[ent + 2] = 0x73; M[ent + 5] = s; M[0xD0DB] = ent & 255; M[0xD0DC] = ent >> 8; M[0x5B57] = 0x73;
  M.fill(0, type, type + 12); M[type + 9] = k; M[0x5B52] = type & 255; M[0x5B53] = type >> 8;
  M.fill(40, rec, rec + 3); M[rec + 3] = 0; M[rec + 4] = 0; M[0x5B50] = rec & 255; M[0x5B51] = rec >> 8;
  M[0x5B54] = 0x8C;
  call(M, 0x73D0, {}, { hooks: { 0x6DBA: ret, 0xC84E: ret } });
  cases++;
  const want = (1 << 5) | LOCFinds.potionTurns(s, k);
  if (M[rec + 3] !== want) fail(`drink, strength ${s}, consumption ${k}: game $${M[rec + 3].toString(16)}, page $${want.toString(16)}`);
}

// design_exit: experience_points ($DC7F) into the score, byte 69 of the record at IY
for (let x = 0; x < 1024; x++) {
  const M = memory(0);
  M[0xDC7F] = x & 255; M[0xDC80] = x >> 8;
  const rec = 0xF000;
  call(M, 0xE17E, { iy: rec, f: 0 }, { hooks: { 0xE18D: c => { c.pc = 0; return true; } } });
  cases++;
  if (M[rec + 69] !== LOCFinds.keep(x).score) fail(`design_exit with ${x} points: game ${M[rec + 69]}, page ${LOCFinds.keep(x).score}`);
}

// scenario 2's hook after a step ($E1F0): a SPECTRE stepping into each terrain from $16 to $1F,
// moved by a human ($D063 0) and by the computer ($D063 1); the lava, $18 to $1D, takes 7 points of
// constitution, and only from the human's creature
for (const moving of [0, 1]) for (let t = 0x16; t < 0x20; t++) {
  const M = memory(2);
  const ent = 0x5B5A + 6 * 8;
  M.set([21, 6, 0xA7, t, 0xFF, 0], ent);
  M.set([30, 50, 40, 0, 0], 0x5EC0);
  M[0x5B4F] = 8; M[0xFF91] = t; M[0xD063] = moving; M[0xD066] = 1; M[0xD202] = 40;
  call(M, 0xE1F0, {}, { hooks: { 0x798B: ret } });
  cases++;
  const want = !moving && t >= 0x18 && t <= 0x1D ? 33 : 40;
  if (M[0x5EC2] !== want) fail(`lava hook, terrain $${t.toString(16)}, computer moving ${moving}: constitution ${M[0x5EC2]}, expected ${want}`);
}

// scenario 2's routes: computer_choose_target ($9992) for a creature of the computer's (plan entry
// at $D182) on route 0 at step 9, which names waypoint 28; the turn is before the portal opens
{
  const route0 = [0, 13, 14, 16, 1, 8, 2, 17, 14, 28, 3, 4];
  const M0 = memory(2);
  const wp = M0[0xD013] | M0[0xD014] << 8, map = M0[0xD030] | M0[0xD031] << 8;
  const sq = [M0[wp + 56], M0[wp + 57]], v = M0[map + 36 * sq[0] + sq[1]];
  cases++;
  if (String(sq) !== '8,7' || M0[0xD208 + 5 * v] !== 255) fail(`waypoint 28 of scenario 2 is ${sq}, terrain $${v.toString(16)}, step ${M0[0xD208 + 5 * v]}`);
  for (const [at, step, target] of [[[8, 8], 9, [8, 7]], [[9, 8], 9, [8, 7]], [[8, 7], 10, [26, 9]]]) {
    const M = memory(2);
    M.set([8, 0, 9, 0], 0xF000); M[0xD182] = 0x00; M[0xD183] = 0xF0;
    M[0xD1BC] = 0; M[0xD1BA] = 0; M[0xD065] = 1; M[0xD062] = 200;
    M[0x5B55] = at[0]; M[0x5B56] = at[1];
    call(M, 0x9992, {}, { hooks: { 0x9AB3: ret, 0x9ADC: ret } });
    cases++;
    if (M[0xF002] !== step || M[0xD1B6] !== target[0] || M[0xD1B7] !== target[1])
      fail(`computer_choose_target at ${at}: step ${M[0xF002]}, target ${M[0xD1B6]},${M[0xD1B7]}; expected ${step}, ${target}`);
  }
  // the route as the scenario has it
  const ra = M0[0xD00F] | M0[0xD010] << 8;
  cases++;
  if (String([...M0.slice(ra + 1, ra + (M0[ra] & 0x7F))]) !== String(route0)) fail('scenario 2 route 0 is not ' + route0);
}

// a pile of fifteen objects on row 24, column 17, and a computer creature (entry 1) on it wanting the
// twelfth: list_objects_at ($67A7, called at $A13A) lists ten, and the search from $D1D5 has no end.
// On the memory as it loads, and with $FF, $81 put at $D1F0 (entry 255, as in the game that hung):
// entry 255's bytes 3 and 4 are $6157-$6158, the operand of LD HL,$5B11 in the turn loop ($6156)
for (const plant of [false, true]) {
  const M = memory(1);
  for (let i = 0; i < 0x91; i++) M[0x5B5A + 6 * i + 2] = 0xFF;                 // nothing on the map
  const types = [0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x80, 0x81, 0x82, 0x83, 0x84];
  types.forEach((t, k) => M.set([24, 0x80 | 17, t, 0, 0xFF, 0], 0x5B5A + 6 * (0x20 + k)));
  if (plant) { M[0xD1F0] = 0xFF; M[0xD1F1] = 0x81; }
  M[0x5B55] = 24; M[0x5B56] = 17; M[0x5B4F] = 1; M[0x5B2F] = 0xFF; M[0xD1FB] = 20; M[0xD19B] = 0x81;
  const before = M.slice();
  let listed = null;
  call(M, 0xA0F0, {}, { hooks: {
    0x984A: (c, M) => { c.f |= 0x40; return ret(c, M); },                         // on the target square
    0x7156: (c, M) => { c.f &= ~0x40; return ret(c, M); },                        // no partner there
    0x6DBA: ret, 0x6741: ret,
    0xA13D: (c, M) => { listed = [...M.slice(0xD1D4, 0xD1D4 + 2 * M[0xD0DD])]; return false; },
    0xA16B: c => { c.pc = 0; return true; },                                      // the marks are made
  } });
  cases++;
  const want = []; for (let k = 0; k < 10; k++) want.push(0x20 + k, types[k]);
  if (String(listed) !== String(want)) fail(`list_objects_at on fifteen objects: ${listed}`);
  let a = 0xD1D5;
  while (M[a] !== 0x81) a += 2;
  const e = M[a - 1], at = (0x5B5A + 6 * e) & 0xFFFF;
  const own = i => (i >= 0x5B2C && i <= 0x5B2E) || i === 0x5B57 || (i >= 0xD0DD && i <= 0xD1FB);   // its variables
  const changed = [];
  for (let i = 0x4000; i < 0xFE00; i++) if (M[i] !== before[i] && !own(i)) changed.push(i);
  cases++;
  if (a < 0xD1E8 || String(changed) !== String([at + 3, at + 4]) || M[at + 3] !== (before[at + 3] | 0x80) || M[at + 4] !== 1)
    fail(`computer_pick_up wanting the twelfth: stopped at $${a.toString(16)}, entry ${e}, changed ${changed.map(x => '$' + x.toString(16))}`);
  cases++;
  if (plant && (M[0x6157] | M[0x6158] << 8) !== 0x0191) fail(`the turn loop's LD HL operand is $${(M[0x6157] | M[0x6158] << 8).toString(16)}`);
}

console.log(fails ? `FAIL: ${fails} of ${cases} cases differ` : `ok - ${cases} cases of find_file, drink, design_exit, scenario 2's lava, its route into rock and the pile of fifteen worked out as the game works them`);
process.exit(fails ? 1 : 0);
