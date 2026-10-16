#!/usr/bin/env node
// Hold the How it works page's monster simulation against the game's own code. mechanics.html's
// gx-chase block runs level_build, generators_run ($B16A) and monsters_run ($BB2E) on a 6502 core
// of its own; this runs the same routines on the kit's 6502 simulator, over the same memory (every
// byte of listing.json, which the page fetches whole, the rest 0), with the same player
// and the same readings of the CIA timers, for 400 passes of each of the page's levels, and
// compares the monster table ($0400-$07FF), the colour and character maps ($2000-$3FFF), the
// players' health ($B92F-$B932) and monsters_run's own state after every pass. Everything it
// needs is committed.
//   node games/c64/gauntlet/test_chase.js [page.html]
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));
const g = game(__dirname), page = process.argv[2] ? path.resolve(process.argv[2]) : 'mechanics.html';
const { makeChase } = g.run(page, 'gx-chase', 'makeChase');
const html = g.read(page);
const lm = html.match(/const CHASE_LEVELS = (\[.*?\]);/);
if (!lm) { console.error('no CHASE_LEVELS in the page'); process.exit(1); }
const base = g.listing().ram.slice();
const levels = JSON.parse(lm[1]).map((s) => Uint8Array.from(Buffer.from(s, 'base64')));
const CMP = [[0x0400, 0x0800], [0x2000, 0x4000], [0xB92F, 0xB933], [0x824E, 0x824F], [0xBE6D, 0xBE6E], [0x9120, 0x9122]];
let bad = 0, passes = 0, steps = 0, moves = 0;
const fail = (...w) => { if (bad++ < 10) console.log('DIFFERS', ...w); };
levels.forEach((file, i) => {
  const page = makeChase(base);
  page.load(file);
  const m = page.m.slice();                         // the page's level and player, as the start
  let chance = 0;
  const io = {
    read(a) { if (a >= 0xDC04 && a <= 0xDC07) { chance = (chance + 0x3B) & 255; return chance; } throw new Error('read $' + a.toString(16)); },
    write(a) { throw new Error('write $' + a.toString(16)); },
  };
  // the start must be the game's too: build the level again here and compare
  const fresh = base.slice();
  for (let j = 0; j < 0x200; j++) fresh[0x0A00 + j] = j < file.length ? file[j] : 0;
  let c2 = 0;
  const build = new CPU(fresh, { port: { dir: 0x2F, data: 0x35 }, io: { read(a) { if (a >= 0xDC04 && a <= 0xDC07) { c2 = (c2 + 0x3B) & 255; return c2; } throw new Error('read'); }, write() { throw new Error('write'); } }, strict: true });
  for (const e of [0xC625, 0xCC60, 0xCBC2, 0xC00E]) build.call(e, {});
  for (let a = 0x2000; a < 0x4000; a++) if (fresh[a] !== m[a] && m[a] !== 0x5B) { fail('level', i + 1, 'built differently at $' + a.toString(16)); break; }
  const cpu = new CPU(m, { port: { dir: 0x2F, data: 0x35 }, io, strict: true });
  for (let p = 0; p < 400; p++) {
    const r = page.pass();
    m[0x824B] = (m[0x824B] + 1) & 255; m[0x8264] = 0;
    cpu.call(0xB16A, {}); cpu.call(0xBB2E, {});
    passes++; steps += r.visited.length; moves += r.moved.length;
    for (const [lo, hi] of CMP) for (let a = lo; a < hi; a++)
      if (m[a] !== page.m[a]) { fail('level', i + 1, 'pass', p, '$' + a.toString(16), 'game', m[a], 'page', page.m[a]); break; }
  }
});
console.log(`${levels.length} levels, ${passes} passes, ${steps} slots visited, ${moves} moves, ${bad ? bad + ' differ' : 'every byte matches'}`);
process.exit(bad ? 1 : 0);
