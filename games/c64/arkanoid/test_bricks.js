#!/usr/bin/env node
// Hold levels.html's brick table and silver-brick port (the block ak-bricks) to the game's code in
// listing.json, run on the kit's 6502.
// - The table. A wall holding one brick of every type 1-15 is drawn with draw_wall $F40E. For each
//   entry of AK_BRICKS: its types draw its two characters in its colour RAM, and add to the
//   bricks-left count $0455 when it can break. Each brick is then hit through brick_hit $B108, with
//   silver_shine $AB55 run 40 frames between hits, until it breaks or 12 hits have been made: the
//   points added to the score $0927 must be the entry's, and the hits it took must be the entry's
//   (silver: silver_hits_by_round $F52A + 1 in each of the four round groups; gold: never).
// - The port. akSilver(count, phase) against the game's routines for one silver brick: random runs
//   of frames and hits from each phase of the four-frame divider $0225, compared frame by frame
//   (left character, counter $0355, broken).
// It exits 1 on any difference.
//   node games/c64/arkanoid/test_bricks.js
'use strict';
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { AK_BRICKS, akSilver } = g.run('levels.html', 'ak-bricks', 'AK_BRICKS', 'akSilver');
const ram = g.listing().ram;
let bad = 0;
const check = (what, got, want) => { if (got !== want) { bad++; console.log('DIFFERS', what, got, 'want', want); } };

// A machine with the game in memory, round index `round`, one player, and a wall drawn from `map`
// (160 bytes) or the round's own.
function machine(round, map) {
  const mem = new Uint8Array(0x10000); mem.set(ram);
  const cpu = new C64Cpu.CPU(mem, { port: 0x35, io: { read: (a) => mem[a], write: (a, v) => { mem[a] = v; } } });
  const call = (e, r = {}) => cpu.call(e, r, { maxSteps: 500000 });
  mem[0x0938] = 0; mem[0x093D] = round; mem[0x0455] = 0; mem[0x0456] = 0;
  mem.fill(0x40, 0xC000, 0xC400);
  const src = 0x8000 + (round & 31) * 160;
  if (map) mem.set(map, src);
  mem[0x11] = src & 255; mem[0x12] = src >> 8;
  call(0xF40E);
  mem[0x0216] = 1; mem[0x0237] = 1;        // no sounds; a capsule already falling, so none starts
  return { mem, call };
}
const score = (mem) => { let v = 0; for (const a of [0x0929, 0x0928, 0x0927]) v = v * 100 + (mem[a] >> 4) * 10 + (mem[a] & 15); return v * 10; };
// brick_hit on the brick whose left half is at screen address a
function hit(m, a) {
  const { mem, call } = m, row = (a - 0xC000) / 40 | 0, col = (a - 0xC000) % 40, rs = 0xC000 + row * 40;
  mem[0x0D] = rs & 255; mem[0x0E] = rs >> 8; mem[0x0F] = rs & 255; mem[0x10] = (rs >> 8) - 0xC0 + 0xD8;
  mem[0x0218] = row - 1; mem[0x0219] = col - 1;
  call(0xB108, { x: 0, y: col });
}

// row 0: types 1-14 in columns 0-13; row 1: type 15 in column 0
const map = new Uint8Array(160);
map[0] = 0xFF; map[1] = 0xFC;
for (let t = 1; t <= 14; t++) map[2 + ((t - 1) >> 1)] |= (t - 1) & 1 ? t : t << 4;
map[10] = 0x80; map[12] = 0xF0;
const cell = (t) => t <= 14 ? 0xC029 + 2 * (t - 1) : 0xC029 + 40;
const typesSeen = new Set();
for (const b of AK_BRICKS) {
  for (const t of b.types) {
    typesSeen.add(t);
    for (const round of [0, 8, 16, 24]) {
      const m = machine(round, map), { mem, call } = m, a = cell(t);
      check(b.name + ' type ' + t + ' characters', mem[a] + ',' + mem[a + 1], b.chars.join());
      check(b.name + ' type ' + t + ' colour RAM', mem[a - 0xC000 + 0xD800], b.colour);
      for (let k = 0; k < 40; k++) call(0xAB55);
      const left = mem[0x0455], s0 = score(mem);
      let n = 0;
      while (mem[a] & 0x80 && n < 12) { hit(m, a); n++; for (let k = 0; k < 40; k++) call(0xAB55); }
      const broke = !(mem[a] & 0x80);
      const want = b.hits === 'never' ? 'never' : b.hits === '1' ? '1' : String(ram[0xF52A + round] + 1);
      check(b.name + ' type ' + t + ' round ' + (round + 1) + ' hits', broke ? String(n) : 'never', want);
      check(b.name + ' type ' + t + ' points', score(mem) - s0, b.points);
      check(b.name + ' type ' + t + ' leaves the bricks-left count', left - mem[0x0455], broke ? 1 : 0);
    }
  }
}
check('wall types covered', [...typesSeen].sort((x, y) => x - y).join(), '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15');
check('silver hits by round group', [0, 8, 16, 24].map((r) => ram[0xF52A + r] + 1).join(), '2,3,4,5');

// the port against the game, frame by frame
let seed = 12345;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return seed % n; };
let runs = 0;
for (const round of [0, 9, 16, 24]) for (let phase = 0; phase < 4; phase++) for (let r = 0; r < 25; r++) {
  const m = machine(round), { mem, call } = m;
  let a = -1; for (let i = 0xC000; i < 0xC400; i++) if (mem[i] === 0x85) { a = i; break; }
  if (a < 0) continue;
  let e = -1; for (let i = 1; i <= mem[0x0456]; i++) if ((mem[0x03AA + 2 * i] | mem[0x03AB + 2 * i] << 8) === a) e = i;
  mem[0x0225] = phase;
  const P = akSilver(mem[0x0355 + e], phase);
  runs++;
  for (let f = 0; f < 400; f++) {
    if (rnd(r < 12 ? 6 : 14) === 0 && (mem[a] & 0x80)) { hit(m, a); P.hit(); }
    call(0xAB55); P.frame();
    const game = (mem[a] & 0x80) ? mem[a].toString(16) + '/' + mem[0x0355 + e] : 'broken';
    const port = P.s.broken ? 'broken' : P.s.left.toString(16) + '/' + P.s.count;
    if (game !== port) { check('round ' + (round + 1) + ' phase ' + phase + ' run ' + r + ' frame ' + f, port, game); break; }
  }
}
check('port runs', runs, 400);

console.log(bad ? bad + ' difference(s)' : 'arkanoid bricks: the table matches the game for all 15 wall types in four round groups, and the silver port matches in ' + runs + ' runs');
process.exit(bad ? 1 : 0);
