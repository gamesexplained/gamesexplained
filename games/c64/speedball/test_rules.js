#!/usr/bin/env node
// Hold the widgets that run the game's own routines to what the pages say they show, and test
// those claims again by other routes. From discoveries.html's sb-rules block: sbLeagueWeeks must
// give 11 weeks more than each menu choice says (22 for TEN WEEKS to 121 for ONE HUNDRED);
// sbKnockout's computer side must play with the figures of the template held by the record that
// the named template's number points at (record named, not record round + 1), wrong in eight
// rounds of ten or more, falling a template a round with at most one wrap from 1 to 10; sbPairs
// must find pairs 4-12 and 18-21 never seen to touch, nine of them opponents, and pairs 0-3 also
// acting on the pairs that read their cell, and the same must hold with the other players placed
// at random; with the four reads of $F290 pointed at $F29D, every pair must act on itself alone. From index.html's sb-tiles block: sbTileCounts must never choose E (7) or M (9), and J
// (10) only in a two player game. Then the two tests the pages state without a widget run here:
// tile_choose ($A994) with random_range (hooked) giving each number it can, and
// tackle_resolve's slide test ($8EBC and $9051) with random_next ($949E, hooked) giving each byte:
// the victim goes down when the byte is at least his side's tackle figure, whatever the
// slider's. It exits 1 on any difference.
//   node games/c64/speedball/test_rules.js
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const C64Cpu = require(path.join(ROOT, 'kit/cpu/cpu6502.js'));
const g = game(__dirname);
const { sbKnockout, sbLeagueWeeks, sbPairs } = g.run('discoveries.html', 'sb-rules', 'sbKnockout', 'sbLeagueWeeks', 'sbPairs');
const { sbTileCounts } = g.run('index.html', 'sb-tiles', 'sbTileCounts');
const L = g.listing(), ram = L.ram, at = (n) => L.sym(n);
let bad = 0, checks = 0;
const check = (ok, ...w) => { checks++; if (!ok && bad++ < 20) console.log('DIFFERS', ...w); };
const quiet = { read: () => 0, write: () => {} };
const cpuOn = (m) => new C64Cpu.CPU(m, { port: 0x30, io: quiet });
let seed = 20261030;
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };

// The league: weeks for each menu choice.
for (let c = 0; c < 10; c++) { const w = sbLeagueWeeks(ram, C64Cpu, c); check(w === 11 * (c + 2), 'league choice', c, w + ' weeks'); }

// The knockout: which template's figures each round plays with.
const template = (r) => { const t = []; for (let k = 1; k <= 10; k++) if (ram[0xBA0B + k] === r.stamina && ram[0xBA21 + k] === r.tackle) t.push(k); return t; };
let worst = 10;
for (let n = 0; n < 200; n++) {
  const s = Math.floor(rnd() * 65536), rows = sbKnockout(ram, C64Cpu, s);
  const played = rows.map((r) => template(r));
  if (!played.every((t) => t.length === 1)) { check(false, 'knockout seed', s, 'figures matching no single template'); continue; }
  const p = played.map((t) => t[0]), named = rows.map((r) => r.named);
  check([...named].sort((a, b) => a - b).join() === '1,2,3,4,5,6,7,8,9,10', 'knockout seed', s, 'names', named.join());
  check(p.every((t, r) => t === named[named[r] - 1]), 'knockout seed', s, 'played', p.join(), 'named', named.join());
  const wrong = p.filter((t, r) => t !== named[r]).length;
  worst = Math.min(worst, wrong);
  let wraps = 0;
  for (let r = 1; r < 10; r++) { if (p[r] === p[r - 1] - 1) continue; if (p[r - 1] === 1 && p[r] === 10) wraps++; else wraps = 9; }
  check(wraps <= 1, 'knockout seed', s, 'played', p.join(), 'does not fall a template a round');
}
check(worst >= 8, 'knockout: a draw with only', worst, 'rounds wrong');

// The pairs: which touches tackles_check acts on.
const P = sbPairs(ram, C64Cpu), range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const missed = range(0, 44).filter((j) => !P[j].acts.includes(j));
check(missed.join() === [...range(4, 12), ...range(18, 21)].join(), 'pairs never seen', missed.join());
check(missed.filter((j) => P[j].a < 5 && P[j].b >= 5).length === 9, 'opponent pairs never seen');
P.forEach((p, j) => check(p.acts.join() === range(0, 44).filter((i) => P[i].from === j).join(), 'pair', j, 'acts on', p.acts.join()));
check(P[0].acts.join() === '0,4,7,19', 'pair 0 acts on', P[0].acts.join());
// The fix the page states: the only four reads of $F290 in memory, pointed at $F29D, make every
// pair act on itself alone.
const reads = [];
for (let i = 0; i < 0xFFFE; i++) if (ram[i + 1] === 0x90 && ram[i + 2] === 0xF2) reads.push(i);
check(reads.map((r) => r.toString(16) + ':' + ram[r].toString(16)).join() === '8de6:be,8dff:be,8e44:be,b05e:be', 'reads of $F290', reads.map((r) => r.toString(16)).join());
const fixed = ram.slice();
reads.forEach((r) => { fixed[r + 1] = 0x9D; });
sbPairs(fixed, C64Cpu).forEach((p, j) => check(p.acts.join() === String(j), 'with the fix, pair', j, 'acts on', p.acts.join()));
const tackles = (pos) => {
  const m = ram.slice(), cpu = cpuOn(m);
  pos.forEach(([x, y], i) => { m[0x1E09 + i] = x & 0xFF; m[0x1E19 + i] = x >> 8; m[0x1E29 + i] = y & 0xFF; m[0x1E39 + i] = y >> 8; });
  m[0x1EAF] = 0xFF;
  cpu.call(0xB038, { a: 0, x: 0, y: 0 }, { maxSteps: 100000 });
  const acts = [], act = (c) => { acts.push(c.m[0x18]); c.rts(); };
  cpu.call(0x8DD6, { a: 0, x: 0, y: 0 }, { maxSteps: 100000, hooks: { 0x8EF5: act, 0x8E83: act, 0x8E6A: act } });
  return acts.sort((a, b) => a - b).join();
};
const apart = (p, q) => Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1])) > 0x14;
for (let n = 0; n < 300; n++) {
  const j = Math.floor(rnd() * 45), { a, b } = P[j], d = Math.floor(rnd() * 0x12), pos = [];
  for (let i = 0; i < 10; i++) {
    if (i === b) { pos.push(null); continue; }
    let p;
    do p = [0x20 + Math.floor(rnd() * 0xE0), 0x30 + Math.floor(rnd() * 0x1F0)]; while (!pos.every((q) => !q || apart(p, q)));
    pos.push(p);
  }
  pos[b] = [pos[a][0] + d, pos[a][1] + 0x11 - d];
  if (!pos.every((q, i) => i === a || i === b || apart(q, pos[b]))) { n--; continue; }
  const got = tackles(pos);
  check(got === P[j].acts.join(), 'pair', j, 'touching at random: acts on', got, 'not', P[j].acts.join());
}

// The tiles: tile_choose a few thousand times, and with each number random_range could give.
for (const two of [false, true]) {
  const c = sbTileCounts(ram, C64Cpu, two, 4000, 0x1234);
  check(!c[7] && !c[9], 'tiles: E or M chosen', c.join());
  check(two ? c[10] > 0 : !c[10], 'tiles: J', two ? 'never chosen in a two player game' : 'chosen in a one player game', c.join());
  const top = two ? 20 : 19, seen = new Set();
  for (let v = 0; v <= top; v++) {
    const m = ram.slice(), cpu = cpuOn(m);
    m[0x1EAF] = two ? 0 : 0xFF;
    cpu.call(0xA994, { a: 0, x: 0, y: 0 }, { maxSteps: 100000, hooks: { [at('random_range')]: (k) => { check(k.x === top && k.y === 0, 'tile_choose asks for', k.y, 'to', k.x); k.a = v; k.rts(); } } });
    check(m[0x68] === ram[0xBB21 + Math.max(0, v - 10)], 'tile for number', v, m[0x68]);
    seen.add(m[0x68]);
  }
  check([...seen].sort((a, b) => a - b).join() === (two ? '0,1,2,3,4,5,6,8,10' : '0,1,2,3,4,5,6,8'), 'tile types', [...seen].join());
}

// The slide test: side 0's player 1 slides into side 1's player 6, and the other way.
const pair16 = range(0, 44).find((i) => ram[0xF243 + i] === 1 && ram[0xF270 + i] === 6);
for (const [slider, victim] of [[1, 6], [6, 1]]) for (const fv of [1, 31, 128, 207, 255]) for (const fs of [31, 207]) for (let r = 0; r < 256; r += 3) {
  const m = ram.slice(), cpu = cpuOn(m);
  m[0x18] = pair16; m[0x1D9B + slider] = 4; m[0x1CFB + slider] &= ~0x10; m[0x1D9B + victim] = 2; m[0x1CFB + victim] &= ~0x10; m[0x6B] = 0;
  m[victim < 5 ? 0x1EB9 : 0x1EBA] = fv; m[slider < 5 ? 0x1EB9 : 0x1EBA] = fs;
  let asked = 0;
  cpu.call(0x8EF5, { a: 0, x: 0, y: 0 }, { maxSteps: 100000, hooks: { [at('random_next')]: (k) => { asked++; k.a = r; k.rts(); } } });
  check(asked === 1 && (m[0x1D9B + victim] === 5) === (r >= fv), 'slide', slider, 'into', victim, 'figure', fv, 'slider', fs, 'byte', r, 'down', m[0x1D9B + victim] === 5, 'asked', asked);
}
console.log(`${checks} checks: ` + (bad ? bad + ' differ' : 'every widget and claim holds'));
process.exit(bad ? 1 : 0);
