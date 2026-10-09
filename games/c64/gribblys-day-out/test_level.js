#!/usr/bin/env node
// Hold How it works' port of level_result (nextLevel in index.html, the level-choice widget)
// against the game's own routine at $64F3, run in kit/c64/cpu6502.js on the bytes of the committed
// listing.json: every performance (0-14), saved count (0-8) and every seventh random byte, from
// levels 0, 3 and 15, on 45 sets of levels done (all, none, all but the first, all but the last,
// only the first, and 40 random). The next level, the performance, the sixteen done flags and
// whether the 6,809-point bonus was given must agree. The SID's random read at $D41B is the test's;
// print_string, delay and game_over are stubbed. Needs no snapshot and no emulator. Exits 1 on any
// difference.
//   node games/c64/gribblys-day-out/test_level.js
'use strict';
const fs = require('fs'), path = require('path');
const GAME = __dirname, ROOT = path.resolve(GAME, '../../..');
globalThis.fetch = async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(GAME, url), 'utf8')) });
require(path.join(ROOT, 'site/lib/c64.js'));
const { CPU } = require(path.join(ROOT, 'kit/c64/cpu6502.js'));

const html = fs.readFileSync(path.join(GAME, 'index.html'), 'utf8');
const a = html.indexOf('function nextLevel(s, r)'), b = html.indexOf('// end of nextLevel');
if (a < 0 || b < a) { console.log('index.html: no nextLevel block'); process.exit(1); }
const nextLevel = new Function(html.slice(a, b) + '\nreturn nextLevel;')();

(async () => {
  const base = (await C64.load('listing.json')).ram;
  let rnd8 = 0;
  const io = { read(addr) { if (addr === 0xD41B) return rnd8; throw new Error('read ' + addr.toString(16)); },
               write(addr) { throw new Error('write ' + addr.toString(16)); } };
  const cpu = new CPU(Uint8Array.from(base), { port: { dir: 0x2F, data: 0x25 }, io });    // start_game's $01
  const hooks = { 0x41F8: c => c.rts(), 0x725B: c => { c.y = 0; c.rts(); }, 0x5FCB: c => c.rts() };
  let seed = 7, n = 0, fail = 0;
  const rnd = k => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % k; };
  const sets = [Array(16).fill(0), Array(16).fill(1), [0].concat(Array(15).fill(1)), Array(15).fill(1).concat([0]),
    [1].concat(Array(15).fill(0))];
  for (let k = 0; k < 40; k++) sets.push(Array.from({ length: 16 }, () => rnd(2)));
  for (const done of sets) for (let perf = 0; perf <= 14; perf++) for (let saved = 0; saved <= 8; saved++)
    for (let r = 0; r < 256; r += 7) for (const level of [0, 3, 15]) {
      cpu.m.set(base);
      cpu.m[0x3C] = level; cpu.m[0x5C] = saved; cpu.m[0x5D] = perf; cpu.m[0x77] = n & 1 ? 0xFF : 0;
      for (let i = 0; i < 16; i++) cpu.m[0x0216 + i] = done[i];
      const score = [cpu.m[0x24], cpu.m[0x26]];
      rnd8 = r;
      cpu.call(0x64F3, {}, { hooks });
      const p = nextLevel({ level, saved, perf, done }, r);
      n++;
      const got = [cpu.m[0x3C], cpu.m[0x5D]].concat(Array.from(cpu.m.slice(0x0216, 0x0226)));
      const want = [p.level, p.perf].concat(p.done);
      const bonus = cpu.m[0x24] !== score[0] || cpu.m[0x26] !== score[1];
      if (got.join() !== want.join() || bonus !== (p.why === 'complete')) {
        if (fail++ < 5) console.log('DIFFERS', { level, saved, perf, r, done: done.join('') }, got.join(), want.join(), p.why);
      }
    }
  console.log(`${n} cases; ${fail ? fail + ' FAILED' : 'all match'}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log(e.stack || e); process.exit(1); });
