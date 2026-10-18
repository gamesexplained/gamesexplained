'use strict';
// The Play page's machine (page/runtime.js) on the disk the page carries, whose files of code have
// every instruction blanked (scripts/pack-data.js), beside the same machine on the whole disk. The
// port must read none of the game's code: anything it reads there that matters shows as a
// difference in the rest of memory, the chips, the clock or the program, or as a throw. Two runs:
//   - from power-on: the title, a new game through the story (the page's Skip to the cockpit), then
//     flight with keys and the stick, Navigation Control, and flight again;
//   - from each moment of flight, of a fight and of docking (work/states), with the code of each
//     file in memory there blanked as the page's copy of that file has it, and random input.
// Each frame of the two must agree. Then the pace: from each moment of flight and of a fight, the
// main loop's passes in 20 seconds of the game's time, with the stick and keys left alone, on the
// game (kit/c64/c64run.js) and on the page, within 5 % of each other.
// With KIT_REQUIRE_TOOLS set, a missing disk fails the test.
//   node t-page.js [frames per moment] [moment filter]
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { loadPort } = require('./lockstep.js');
const { pack, CODE } = require('../scripts/pack-data.js');
require(path.join(lib.REPO, 'site/lib/c64.js'));
loadPort();
require(path.join(lib.GAME, 'port/page/runtime.js'));
const { SRPage } = globalThis;

if (!fs.existsSync(path.join(lib.WORK, 'disk.json'))) {
  console.log((process.env.KIT_REQUIRE_TOOLS ? 'FAIL' : 'skip') + ': no work/disk.json (the game\'s own disk; see test/lib.js)');
  process.exit(process.env.KIT_REQUIRE_TOOLS ? 1 : 0);
}
const FRAMES = +process.argv[2] || 600, FILTER = process.argv[3] || '';
const cost = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'port/cost.json'), 'utf8'));
const full = lib.readDisk(), packed = pack();
const make = files => SRPage.create({ disk: { files: Object.assign({}, files), sectors: full.sectors }, cost });

// The addresses of each file of code's instructions, as pack-data.js blanks them
const blankedIn = {};
for (const name of Object.keys(CODE)) {
  const [to] = CODE[name], f = full.files[name], b = packed.files[name], set = [];
  for (let i = 2; i < f.length; i++) if (b[i] === 0 && f[i] !== 0) set.push(to + i - 2);
  blankedIn[name] = set;
}
const BLANK = new Uint8Array(0x10000);
for (const set of Object.values(blankedIn)) for (const a of set) BLANK[a] = 1;

let fails = 0;
const hex = n => '$' + n.toString(16).toUpperCase().padStart(4, '0');
// The two machines after a frame: the program and the clock, then every byte of memory the page's
// copy did not blank, colour RAM, and the chips
function compare(what, f, A, B) {
  const d = [];
  if (A.program !== B.program) d.push('program ' + A.program + ' / ' + B.program);
  if (A.t !== B.t) d.push('clock ' + A.t + ' / ' + B.t);
  for (let a = 0; a < 0x10000 && d.length < 8; a++) if (A.M[a] !== B.M[a] && !BLANK[a]) d.push(hex(a) + ' ' + A.M[a] + ' / ' + B.M[a]);
  for (let i = 0; i < 0x400 && d.length < 8; i++) if (A.colour[i] !== B.colour[i]) d.push('colour ' + i);
  for (let r = 0; r < 0x40; r++) if (A.vic[r] !== B.vic[r]) d.push('VIC ' + r);
  for (let r = 0; r < 0x20; r++) if (A.sidw[r] !== B.sidw[r]) d.push('SID ' + r);
  if (!d.length) return true;
  console.log('FAIL ' + what + ', frame ' + f + ': ' + d.join(', '));
  fails++;
  return false;
}
// one frame on both with the same input; a throw in one and not the other is a difference
function frame(what, f, A, B, keys, joy) {
  const e = [];
  for (const R of [A, B]) {
    R.input.keys = new Set(keys); R.input.joy = joy;
    try { R.runFrame(); e.push(null); } catch (x) { e.push(x.message); }
  }
  if (e[0] || e[1]) {
    if (e[0] !== e[1]) { console.log('FAIL ' + what + ', frame ' + f + ': the whole disk ' + (e[0] || 'ran') + ' / the page\'s ' + (e[1] || 'ran')); fails++; }
    else console.log(what + ', frame ' + f + ': both threw ' + e[0]);
    return false;
  }
  return compare(what, f, A, B);
}

let seed = 7;
const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return Math.floor(seed / 4294967296 * n); };
const KEYS = ['A', 'D', 'W', 'X', 'Z', 'C', 'S', '+', '-', 'T', 'V', 'R', 'I', 'SPACE'];
const DIRS = [0, 1, 2, 4, 8, 16, 5, 9, 6, 10];
// random input: a key or a stick direction held for a few frames, and now and then nothing
function randomInput(extra = []) {
  let keys = [], joy = 0x1F, left = 0;
  return () => {
    if (!left--) {
      left = 2 + rnd(20);
      const k = KEYS.concat(extra);
      keys = rnd(3) ? [] : [k[rnd(k.length)]];
      joy = rnd(3) ? 0x1F : 0x1F & ~DIRS[rnd(DIRS.length)];
    }
    return [keys, joy];
  };
}

// ---- from power-on
{
  const A = make(full.files), B = make(packed.files);
  const name = 'ROGUE', script = [[150, 'SPACE', 8], [400, 'N', 20]];
  name.split('').forEach((c, i) => script.push([500 + i * 15, c, 8]));
  script.push([500 + name.length * 15 + 40, 'RETURN', 10]);
  const held = new Set();
  let f = 0, ok = true, inMain = 0;
  const input = randomInput(['N', 'RETURN', '1', '2', '3']);
  for (; ok && f < 20000 && inMain < 3 * FRAMES; f++) {
    let keys, joy = 0x1F;
    if (A.program === 'main') {
      inMain++;
      [keys, joy] = input();
    } else {
      for (const [at, k, d] of script) { if (f === at) held.add(k); if (f === at + d) held.delete(k); }
      if (A.program === 'intro' && f > 700) { if (f % 120 === 0) held.add('SPACE'); else if (f % 120 === 8) held.delete('SPACE'); }
      keys = [...held];
    }
    ok = frame('from power-on', f, A, B, keys, joy);
  }
  console.log('from power-on: ' + f + ' frames, ' + inMain + ' of the main program' + (ok ? ', the same' : ''));
}

// ---- from the moments
// The files of code in a moment's memory: those whose instructions there are mostly the file's
function resident(ram) {
  const out = [];
  for (const name of Object.keys(CODE)) {
    const [to] = CODE[name], f = full.files[name], set = blankedIn[name];
    let same = 0;
    for (const a of set) if (ram[a] === f[a - to + 2]) same++;
    if (same > set.length * 0.9) out.push(name);
  }
  return out;
}
const BASE_PASS = 0xA4DF;
for (const st of lib.states(FILTER).filter(n => /^flight-/.test(n))) {
  const s = lib.readState(st).machine;
  const ram = new Uint8Array(Buffer.from(s.ram, 'base64'));
  const names = resident(ram), blank = ram.slice();
  // a byte the game has changed since the load (a self-modified operand) the page's port has
  // written too, so it stays
  for (const n of names) { const [to] = CODE[n], f = full.files[n]; for (const a of blankedIn[n]) if (blank[a] === f[a - to + 2]) blank[a] = 0; }
  const dock = /base/.test(st);
  const entry = dock ? P => (function* () { yield* P.dock(); yield* P.main_loop(); })() : P => P.main_loop();
  const A = make(full.files), B = make(packed.files);
  A.restore(s, entry);
  B.restore(Object.assign({}, s, { ram: Buffer.from(blank).toString('base64') }), entry);
  const input = randomInput(dock ? ['RETURN', '1', '2'] : ['N']);
  let f = 0, ok = true;
  for (; ok && f < FRAMES; f++) { const [k, j] = input(); ok = frame(st, f, A, B, k, j); }
  console.log(st + ': ' + names.join(' ') + ' blanked, ' + f + ' frames' + (ok ? ', the same' : ''));
}

// ---- the pace
const SECONDS = 20;
for (const st of lib.states(FILTER).filter(n => /^flight-(0|fight)/.test(n))) {
  const state = lib.readState(st);
  const S = lib.runner({ state });
  let game = 0;
  S.R.m.hooks[lib.FLIGHT_PASS] = () => { game++; return false; };
  S.run(SECONDS);
  const B = make(packed.files);
  let page = 0;
  B.restore(state.machine, P => (function* () { for (const y of P.main_loop()) { if (y && y.cp === lib.FLIGHT_PASS) page++; yield y; } })());
  for (let f = 0; f < SECONDS * 50; f++) B.runFrame();
  const off = (page - game) / game;
  if (Math.abs(off) > 0.05) { console.log('FAIL ' + st + ': ' + game + ' passes in ' + SECONDS + ' s on the game, ' + page + ' on the page'); fails++; }
  else console.log(st + ': ' + game + ' passes in ' + SECONDS + ' s on the game, ' + page + ' on the page (' + (off * 100).toFixed(1) + ' %)');
}
process.exitCode = fails ? 1 : 0;
