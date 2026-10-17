#!/usr/bin/env node
// Hold what the page runs on the kit's 6502 against the game's routines called on it directly.
// index.html's storm-machine block (stormCore, the simulator as the page sets it up, and stormRooms,
// stormEnergy and stormObjects built on it) runs the game's own routines over the bytes the page
// reads (listing.json); the same calls made here on the kit's simulator over the same bytes must
// leave every byte of memory the same, outside the stack page:
// - every room drawn whole, and with each of its five lists left out (draw_floor ... draw_objects),
// - 2,000 passes of the main loop's monster work (move_monster, spawn) in each room the monster
//   widget offers, comparing after every pass,
// - lose_energy for both players over every armour from 0 to 12, 18 drains, 15 energies and the
//   three warning states, with what it returns,
// - draw_object for each of the 28 object types,
// - touch_damage for every kind byte a monster can have,
// - room 0 drawn as the file holds it, before reset_walls and reset_objects.
// It exits 1 on any difference.
//   node games/c64/storm/test_machine.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game, differ } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'index.html';
g.lib('cpu6502');                   // the 6502 the storm-machine block runs on, as the page loads it
const { stormRooms, roomRecords, monsterRooms, stormEnergy, stormObjects, stormTouch } =
  g.run(page, 'storm-machine', 'stormRooms', 'roomRecords', 'monsterRooms', 'stormEnergy', 'stormObjects', 'stormTouch');

// The bytes the page has: every byte of listing.json, which it fetches whole
const ram = g.listing().ram.slice();
let bad = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
const OUTSIDE_STACK = [[0x0000, 0x00FF], [0x0200, 0xFFFF]];
function sim(m, extra) {
  const io = {
    read(a) {
      if (a >= 0xD800 && a < 0xDC00) return m[a];
      if (extra && extra[a] !== undefined) return extra[a];
      throw new Error('read $' + a.toString(16));
    },
    write(a, v) { if (a >= 0xD800 && a < 0xDC00) { m[a] = v; return; } throw new Error('write $' + a.toString(16)); },
  };
  return new CPU(m, { port: { dir: 0x2F, data: 0x37 }, io });
}
const quiet = { 0x5645: (c) => { c.rts(); } };
// stormCore starts each call with A, X and Y 0 and every flag clear; so does the simulator here
const Z = { a: 0, x: 0, y: 0, n: 0, v: 0, d: 0, z: 0, c: 0 };

// Rooms
const R = stormRooms(ram), ref = ram.slice(), cpu = sim(ref, { 0xD012: 0xF0, 0xDC00: 0xFF, 0xDC01: 0xFF });
cpu.call(0x7EA2, Z); cpu.call(0x7EFF, Z);
const start = ref.slice();
function refRoom(r, layers) {
  ref.set(start); ref[0x8118] = r;
  for (const a of [0x814C, 0x8141, 0x8142, 0x8143, 0x8145, 0x8147, 0x8107, 0x8125]) ref[a] = 0;
  ref.fill(0, 0x8742, 0x874C); ref[0x8643] = ref[0x863F] = 0xFF;
  cpu.call(0x5938, Z);    // clear_screen
  [0x5984, 0x5A21, 0x5AD1, 0x5BF8, 0x5CD1].forEach((e, i) => { if (!layers || layers[i]) cpu.call(e, Z); });
}
let drawn = 0;
for (let r = 0; r < 100; r++) {
  for (const off of [-1, 0, 1, 2, 3, 4]) {
    const layers = off < 0 ? null : [0, 1, 2, 3, 4].map((i) => i !== off);
    R.room(r, layers); refRoom(r, layers); drawn++;
    const at = differ(R.m, ref, OUTSIDE_STACK);
    if (at >= 0) fail('room', r, off < 0 ? 'whole' : 'without list ' + off, 'at $' + at.toString(16));
  }
  if (roomRecords(R.m, r).text.length < 10) fail('room', r, 'has a short description');
}

// Monsters
const rooms = monsterRooms(R);
let passes = 0, spawned = 0;
for (const r of rooms) {
  R.enter(r); refRoom(r);
  ref[0x8106] = 0; ref[0x8137] = 1; cpu.call(0x65C2, Z); cpu.call(0x65E1, Z);
  let at = differ(R.m, ref, OUTSIDE_STACK);
  if (at >= 0) { fail('room', r, 'entered, at $' + at.toString(16)); continue; }
  for (let p = 0; p < 2000; p++) {
    R.pass();
    ref[0x8149] = ref[0x814A] = 0; cpu.call(0x5FB6, Z, { hooks: quiet }); cpu.call(0x5E11, Z, { hooks: quiet });
    passes++;
    at = differ(R.m, ref, OUTSIDE_STACK);
    if (at >= 0) { fail('room', r, 'pass', p, 'at $' + at.toString(16)); break; }
  }
  spawned += R.m[0x8142];
}

// Energy
const E = stormEnergy(ram), eref = ram.slice(), ecpu = sim(eref);
const bcd = (n) => ((n / 10 | 0) % 10) << 4 | n % 10;
const DRAINS = [1, 2, 3, 4, 5, 8, 9, 10, 12, 13, 16, 20, 24, 30, 38, 41, 60, 99];
const ENERGIES = [0, 1, 2, 23, 99, 100, 499, 500, 501, 999, 1000, 1001, 2000, 2500, 9999];
let cases = 0, deaths = 0, warnings = 0;
for (const who of [0, 1]) for (let arm = 0; arm <= 12; arm++) for (const drain of DRAINS) for (const nrg of ENERGIES) for (const warn of [0, 1, 2]) {
  const s = { who, arm, nrg, warn }, got = E.take(s, drain);
  eref[0x8138] = who; eref[0x861A] = 0; eref[0x8120] = bcd(arm); eref[0x814B] = bcd(drain);
  eref[0x8616] = bcd(nrg % 100); eref[0x8617] = bcd(nrg / 100 | 0); eref[0x861D] = warn;
  let died = false, sound = false;
  ecpu.call(0x7FB6, Z, { hooks: { 0x5645: (c) => { sound = true; c.rts(); }, 0x804E: () => { died = true; return true; } } });
  cases++; if (died) deaths++; if (sound) warnings++;
  const at = differ(E.m, eref, OUTSIDE_STACK);
  if (at >= 0 || died !== got.died || sound !== got.sound) fail('lose_energy', JSON.stringify(s), 'drain', drain, at >= 0 ? 'at $' + at.toString(16) : 'returns');
  const dec = (b) => (b >> 4) * 10 + (b & 15);
  if (!died && got.nrg !== dec(eref[0x8617]) * 100 + dec(eref[0x8616])) fail('lose_energy', JSON.stringify(s), 'energy read back');
}

// Objects
const O = stormObjects(ram), oref = ram.slice(), ocpu = sim(oref, { 0xD012: 0xF0 });
for (let t = 0; t < 28; t++) {
  O.draw(t);
  ocpu.call(0x5938, Z);
  oref[0x8124] = 0x42; oref[0x8131] = 8; oref[0x6513] = 0x65; oref[0x6514] = 0x86;
  oref[0x810D] = t; oref[0x8115] = 1; oref[0x8116] = 1;
  ocpu.call(0x5D67, Z);
  const at = differ(O.m, oref, OUTSIDE_STACK);
  if (at >= 0) fail('object', t, 'at $' + at.toString(16));
}

// Touches: every kind with its animation bits (mon_kind)
const T = stormTouch(ram), tref = ram.slice(), tcpu = sim(tref);
const KINDS = [0x01, 0x02, 0x82, 0x03, 0x04, 0x84, 0x05, 0x15, 0x25, 0x35, 0x06];
for (const k of KINDS) {
  const got = T.damage(k);
  tref[0x812A] = 0; tref[0x876A] = k; tref[0x8125] = 0x3A; tref[0x8149] = 0;
  tcpu.call(0x62A4, Z);
  const at = differ(T.m, tref, OUTSIDE_STACK);
  if (at >= 0 || got !== (tref[0x8149] >> 4) * 10 + (tref[0x8149] & 15)) fail('touch_damage, kind byte', k.toString(16));
}

// Room 0 as the file holds it
{
  const A = stormRooms(ram, true), aref = ram.slice(), acpu = sim(aref, { 0xD012: 0xF0 });
  A.room(0);
  aref[0x8118] = 0;
  for (const a of [0x814C, 0x8141, 0x8142, 0x8143, 0x8145, 0x8147, 0x8107, 0x8125]) aref[a] = 0;
  aref.fill(0, 0x8742, 0x874C); aref[0x8643] = aref[0x863F] = 0xFF;
  for (const e of [0x5938, 0x5984, 0x5A21, 0x5AD1, 0x5BF8, 0x5CD1]) acpu.call(e, Z);
  const at = differ(A.m, aref, OUTSIDE_STACK);
  if (at >= 0) fail('room 0 as loaded, at $' + at.toString(16));
}

console.log(`${drawn} room drawings; ${passes} monster passes in ${rooms.length} rooms (${spawned} monsters out at the end); ` +
  `${cases} lose_energy cases (${deaths} deaths, ${warnings} warnings); 28 objects; ${KINDS.length} kind bytes; room 0 as loaded: ${bad ? bad + ' differences' : 'every byte matches'}`);
process.exit(bad ? 1 : 0);
