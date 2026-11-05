#!/usr/bin/env node
'use strict';
// The Opponents tab (opponents.html) on a clean checkout:
// - the port's files it carries (/* port/src/<file> */) and the Chase cam renderer
//   (/* port/page/chase.js */) are play.html's, the same text;
// - the data its widgets draw from (op-data) is what opponents-data.js makes from the Play tab's
//   machine: the tracks as BUILD_TRACK leaves them, the first race of a season on Little Ramp, and
//   the computer's car over that track's banked bend and its jump, at the game's run-up and five
//   others;
// - its racing lines: in that race, at every pass OPPONENT_LINE ($1D25) ran, the page's OPS.line,
//   given what the game's routine read, aims the computer's car where the game aimed it ($2C) and
//   leaves it where the game left it ($B0); and over a grid of drivers, gaps, places across and
//   bends, the page's OPS.line leaves the machine as the game's own OPPONENT_LINE leaves it, run on
//   listing.json's bytes in the kit's 6502 simulator, every rule the map colours among them;
// - the drivers' table: names, habits and lines are the bytes at $AE01 and $AEE0, what each row
//   says the driver does follows its bits, its swerves are the chances the port's SWERVE ($158E)
//   gives over all 256 of RANDOM's values, and the drivers it says bounce are those whose front
//   wheel the port's OPP_WHEELS kicks up over 1,000 passes standing;
// - the top speeds' table: every value OPP_PICK ($1F06) draws, in the league and the Super League.
//   node games/c64/stunt-car-racer/test_opponents.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game, differ } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64'); g.lib('fast-cpu'); g.lib('cpu6502');
const PAGE = 'opponents.html', page = g.read(PAGE);
let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// the port's blocks: play.html's own text, then run as the page runs them
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const want of ['port/src/core.js', 'port/src/g-opponent.js', 'port/page/chase.js'])
  if (!blocks.includes(want)) { console.log('FAIL: opponents.html carries no ' + want); process.exit(1); }
for (const b of blocks) {
  const { pages } = g.sameBlock(b);
  if (!pages.includes('play.html')) fail(b + ': play.html does not carry it');
}
console.log('ok   the ' + blocks.length + ' port blocks opponents.html carries are play.html\'s');
for (const b of blocks) g.run(PAGE, b, 'SCRPort');
const { OPS } = g.run(PAGE, 'opponents-sim', 'OPS');
const L = g.listing(), ram = L.ram;

// the data, and the race's states for the racing lines
const { opponents } = require('./port/scripts/opponents-data.js');
const made = opponents(__dirname);
const carried = JSON.parse(/<script type="application\/json" id="op-data">([^<]*)<\/script>/.exec(page)[1]);
if (!same(carried, made.data)) fail('op-data differs from what opponents-data.js makes: run port/scripts/build-opponents.js');
else console.log('ok   op-data is opponents-data.js\'s: ' + carried.tracks.length + ' tracks, a race of ' + carried.race.passes.length + ' passes and the car over the jump at ' + carried.moves.jump.length + ' run-ups');

{
  const m = OPS.machine(ram), seen = {};
  let bad = 0;
  made.states.forEach(({ line: s }, i) => {
    const q = { driver: s.driver, gap: s.behind ? -s.gap : s.gap, opp: s.opp, you: s.you, road: s.road, wheels: s.wheels,
      steer: s.steer, ahead: s.ahead };
    const r = OPS.line(m, q);
    if (r.aim !== s.aim || r.after !== s.after) {
      if (bad++ < 5) fail('pass ' + i + ' (' + JSON.stringify(q) + '): the page aims at ' + r.aim + ' and leaves the car at ' + r.after +
        ', the game ' + s.aim + ' and ' + s.after);
    }
    const k = OPS.rule(m, q, r).k;
    seen[k] = (seen[k] || 0) + 1;
  });
  const names = Object.entries(seen).map(([k, n]) => k + ' ' + n).join(', ');
  if (!bad) console.log('ok   at all ' + made.states.length + ' passes of the race the page aims the car as OPPONENT_LINE did (' + names + ')');
  else fail(bad + ' of ' + made.states.length + ' passes differ');
}
// the game's own OPPONENT_LINE on the 6502, from the same memory, over a grid of the map's inputs
{
  const m = OPS.machine(ram), cpu = new C64Cpu.CPU(Uint8Array.from(m.M)), C = cpu.m;
  const rts = c => { c.rts(); };
  const hooks = { [L.sym('EFFECT')]: rts, [L.sym('OPP_CORNERS')]: rts };   // as OPS.machine stubs them
  const KEEP = [0x2C, 0xB0, 0xC308, 0xC369, 0xE0, 0x017F, 0x0180, 0x0181, 0x0182, 0x0183, 0x0184];
  const seen = {};
  let n = 0, bad = 0;
  for (const bend of [0, 1]) for (let d = 0; d < 11; d++) for (const you of [0x30, 0x80, 0xC8]) for (let gap = -80; gap < 208; gap += 4) for (let opp = 0x20; opp <= 0xE0; opp += 16) {
    const q = { driver: d, gap, opp, you, road: 0x80, wheels: 1, steer: 0, ahead: [bend, 0] };
    const r = OPS.line(m, q);
    const g8 = Math.abs(gap);
    C[0xC773] = d; C[0x39] = g8 & 255; C[0x3A] = g8 >> 8; C[0xC36A] = gap < 0 ? 0x80 : 0; C[0xB0] = opp; C[0x2B] = you;
    C[0xB7] = 0x80; C[0xB8] = 0; C[0xC9] = 1; C[0xC357] = 0; C[0xC37C] = 1; C[0xC764] = 2; C[0xC375] = 0; C[0x0400] = bend; C[0x0401] = 0;
    cpu.call(L.sym('OPPONENT_LINE'), {}, { hooks, maxSteps: 20000 });
    const k = OPS.rule(m, q, r);
    seen[k.k] = (seen[k.k] || 0) + 1; if (k.bump) seen.bump = (seen.bump || 0) + 1;
    const off = KEEP.find(a => C[a] !== m.M[a]);
    if (off !== undefined || (++n % 1009 === 0 && differ(C, m.M, [[0, 0x01BF], [0x0200, 0xFFFF]]) >= 0)) {
      if (bad++ < 5) fail('OPPONENT_LINE with ' + JSON.stringify(q) + ': $' + (off !== undefined ? off : differ(C, m.M, [[0, 0x01BF], [0x0200, 0xFFFF]])).toString(16).toUpperCase() +
        ' differs from the game\'s');
      C.set(m.M);
    }
  }
  const names = Object.entries(seen).map(([k, v]) => k + ' ' + v).join(', ');
  if (!bad) console.log('ok   OPS.line leaves the machine as the game\'s own OPPONENT_LINE does, at ' + n + ' places on the map (' + names + ')');
  for (const k of ['own', 'middle', 'block', 'clear', 'pass', 'aside', 'round', 'bump'])
    if (!seen[k]) fail('the grid never met the rule ' + k);
  for (const k of Object.keys(seen))
    if (k !== 'bump' && !new RegExp('--z-' + k + ':').test(page)) fail('the map has no colour for the rule ' + k);
}

// the drivers' table
{
  const names = Array.from({ length: 11 }, (_, i) => String.fromCharCode(...ram.subarray(0xAE01 + 16 * i, 0xAE01 + 16 * i + 12)).trim());
  const rows = [...page.matchAll(/<tr><td>([^<]+)<\/td><td class="op-m">\$([0-9A-F]{2})<\/td><td><svg class="op-road"[^>]*aria-label="its line, (\d+) of 255 across"><rect[^>]*\/><rect[^>]*\/><circle cx="([\d.]+)"[^>]*\/><\/svg><span class="op-n">\$([0-9A-F]{2})<\/span><\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><td><span class="op-bar"><i style="width:([\d.]+)%"><\/i><\/span><span class="op-n">(\d+) in 32<\/span><\/td><td>([^<]+)<\/td><\/tr>/g)];
  let bad = 0;
  if (rows.length !== 11) { fail('the drivers\' table has ' + rows.length + ' rows'); bad++; }
  const chance = d => {                              // SWERVE's start over all of RANDOM's values
    const m = OPS.machine(ram);
    let n = 0;
    for (let v = 0; v < 256; v++) { m.P.RANDOM = () => ({ a: v }); if (OPS.swerveStart(m, { driver: d, kind: 0 }).started) n++; }
    return n / 8;
  };
  const bounces = d => {                             // a thousand passes standing, from a drop
    const m = OPS.machine(ram, 7 * d + 1);
    OPS.drop(m, { driver: d });
    let n = 0;
    for (let i = 0; i < 1000; i++) if (OPS.wheels(m).jolted) n++;
    return n;
  };
  rows.forEach((r, d) => {
    const f = ram[0xAEE0 + d];
    let line = f & 8 ? 0x6E : 0x40;
    if (d & 1) line ^= 0xFF;
    const sw = chance(d), hops = bounces(d);
    const want = [names[d], f, line, (line / 255 * 100).toFixed(1), line, f & 2 ? 'blocks you' : 'moves aside', f & 0x20 ? 'moves aside' : '-',
      f & 8 ? 'keeps its line' : 'goes round', (sw / 32 * 100).toFixed(1), sw, hops ? 'yes' : '-'];
    const got = [r[1], parseInt(r[2], 16), +r[3], r[4], parseInt(r[5], 16), r[6], r[7], r[8], r[9], +r[10], r[11]];
    if (!same(want, got)) { bad++; fail('the drivers\' table, row ' + (d + 1) + ': ' + JSON.stringify(got) + ', the game gives ' + JSON.stringify(want)); }
    if (!!hops !== !!(f & 4)) { bad++; fail(names[d] + ': ' + hops + ' hops in 1,000 passes with bit 2 ' + (f & 4 ? 'set' : 'clear')); }
  });
  if (!bad) console.log('ok   the drivers\' table is the bytes at $AE01 and $AEE0, its swerves SWERVE\'s chances and its bounces OPP_WHEELS\'s');
}

// each track's top speeds: every value OPP_PICK can draw, in the league and the Super League
{
  const { SCRPage, data, cost } = require('./port/scripts/page-machine.js').load(__dirname);
  const rt = SCRPage.create({ data, cost }), M = rt.M, P = rt.P, real = P.RANDOM;
  const TRACK = { 'Little Ramp': 0, 'Stepping Stones': 1, 'Hump Back': 2, 'Big Ramp': 3, 'Ski Jump': 4, 'Draw Bridge': 5, 'High Jump': 6, 'Roller Coaster': 7 };
  const speeds = [...page.matchAll(/<tr><td>([A-Za-z ]+)<\/td><td>(\d+) to (\d+)<\/td><td>(\d+) to (\d+)<\/td><\/tr>/g)];
  let bad = 0;
  if (speeds.length !== 8) { fail('the top speeds\' table has ' + speeds.length + ' rows'); bad++; }
  for (const m of speeds) {
    for (const sl of [0, 1]) {
      let lo = 255, hi = 0;
      for (let v = 0; v < 256; v++) {
        let k = 0;
        P.RANDOM = () => ({ a: k++ < 256 ? 0 : v });
        M[0x31A1] = 0; M[0xC77D] = TRACK[m[1]]; M[0xC71A] = sl;
        P.OPP_PICK({});
        lo = Math.min(lo, M[0x2099]); hi = Math.max(hi, M[0x2099]);
      }
      if (lo !== +m[2 + 2 * sl] || hi !== +m[3 + 2 * sl]) { bad++; fail(m[1] + (sl ? ', Super League' : '') + ': the page says ' + m[2 + 2 * sl] + ' to ' + m[3 + 2 * sl] + ', OPP_PICK draws ' + lo + ' to ' + hi); }
    }
  }
  P.RANDOM = real;
  if (!bad) console.log('ok   the top speeds are every value OPP_PICK draws on each of the 8 tracks');
}
console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
