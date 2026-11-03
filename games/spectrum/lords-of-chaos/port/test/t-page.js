'use strict';
// The Play page's machine (page/runtime.js) against the game, on sessions the player plays on the
// 48K machine (replay.js: the keys at every read of the controls and of the keyboard, the random
// numbers' bytes, the cassette rewound), from the hand-over (through SELECT CONTROLS and a
// scenario's load into play, and through the wizard designer) and from moments of play in
// work/states:
//   - the page on the memory it carries, every instruction blanked (scripts/pack-data.js), beside
//     the same page on the whole memory, frame by frame: the port must read none of the game's
//     code, and anything it reads there that matters shows as a difference in memory, the border or
//     the clock, or as a throw;
//   - the page reads the controls where the game did, every one of them, and draws as many random
//     numbers;
//   - the pace: the time of each read on the page against the game's, from the start; at the last
//     read both reach, within 5 % of each other, and every wait of more than a second (a computer
//     player's turn, a spell, a battle) within 10 %;
//   - no stretch without a cost.
// With KIT_REQUIRE_TOOLS set, missing moments of play fail the test.
//   node t-page.js [frames per session] [moment filter] [every nth moment]
const path = require('path');
const lib = require('./lib.js');
const { loadPort } = require('./port.js');
const { pack, named, codeOf } = require('../scripts/pack-data.js');
const { record, start } = require('./replay.js');
loadPort();
require(path.join(lib.GAME, 'port/page/runtime.js'));
const { LOCPage } = globalThis;

const FRAMES = +process.argv[2] || 3000, FILTER = process.argv[3] || '', EVERY = +process.argv[4] || 6;
const FRAME = LOCPage.FRAME, SECOND = 50 * FRAME;
const cost = require(path.join(lib.GAME, 'port/cost.json'));
const packed = pack(), whole = pack({ whole: true }).state, CODE = packed.code;
const make = data => io => LOCPage.create({ data, cost, io });
const tapeOf = state => lib.Tape.from({ pos: 0, blocks: state.tape });
// a moment's cassette as the page holds it: each of the game's files with its code blanked, as the
// page's own cassette has it; what was saved, as it is
const tapeBlanked = s => {
  const t = lib.Tape.from(s.tape);
  t.blocks = t.blocks.map(b => {
    const j = whole.tape.findIndex(w => w.flag === b.flag && w.bytes === Buffer.from(b.bytes).toString('base64'));
    return j < 0 ? b : { flag: b.flag, bytes: Buffer.from(packed.state.tape[j].bytes, 'base64') };
  });
  return t;
};

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const hex = n => '$' + n.toString(16).toUpperCase().padStart(4, '0');

// A moment with the page's blanks: the code it still holds as its part's listing has it. A byte of
// code the game has since written over (an operand it keeps a count in) is the game's data now,
// and stays.
const keep = named();
const handOver = Buffer.from(whole.ram, 'base64');
const UPPER = { 0: 'designer', 1: 'scenario-1', 2: 'scenario-2', 3: 'scenario-3' };
const masks = {};
function blanked(s) {
  const a = new Uint8Array(Buffer.from(s.ram, 'base64')), from = s.from || 0;
  const full = new Uint8Array(0x10000); full.set(a, from);
  const part = lib.partOf(full), up = UPPER[part];
  if (!masks[up]) masks[up] = { code: codeOf(up), M: lib.listing(up).M };
  for (let i = 0x4000; i < 0x10000; i++) {
    if (keep.has(i)) continue;
    const blank = i < 0xD003 ? packed.blank[i] && full[i] === handOver[i - 0x4000] : masks[up].code[i] && full[i] === masks[up].M[i];
    if (blank) a[i - from] = 0;
  }
  return Object.assign({}, s, { ram: Buffer.from(a).toString('base64') });
}

// the two page machines after a frame: the clock, the border and every byte that is not code
function compare(what, f, A, B) {
  const d = [];
  if (A.t !== B.t) d.push('clock ' + A.t + ' / ' + B.t);
  if (A.border !== B.border) d.push('border ' + A.border + ' / ' + B.border);
  for (let i = 0x4000; i < 0x10000 && d.length < 8; i++) if (A.M[i] !== B.M[i] && !CODE[i]) d.push(hex(i) + ' ' + A.M[i] + ' / ' + B.M[i]);
  if (!d.length) return true;
  fail(what + ', frame ' + f + ': the whole memory / the page\'s: ' + d.join(', '));
  return false;
}

const missing = new Map();
const faster = off => 'the page ' + Math.abs(off * 100).toFixed(1) + ' % ' + (off < 0 ? 'slower' : 'faster');
let paceSum = 0, paced = 0;
function session(what, o) {
  const rec = record(Object.assign({ frames: FRAMES }, o));
  const A = start(rec, make(whole), o.state ? {} : { data: whole, tape: () => tapeOf(whole) });
  const B = start(rec, make(packed.state), o.state ? { blank: blanked, tape: tapeBlanked } : { data: packed.state, tape: () => tapeOf(packed.state) });
  let ok = true;
  // as long as the game ran, and on while the page has reads still to make (a page a little slower
  // than the game reaches its last reads after the game's last frame), up to a sixth longer
  // (once either page draws past the game's last random number, it plays a game of its own: the
  // two pages are compared up to there, and the reads up to the read it had reached)
  const more = f => f < A.frames || (B.reads.length < rec.reads.length && B.past === null && f < A.frames * 7 / 6 + 50);
  for (let f = 0; more(f) && ok; f++) {
    const e = [];
    for (const R of [A, B]) { try { R.rt.runFrame(); e.push(null); } catch (x) { e.push(x.message); } }
    if (e[0] || e[1]) { fail(what + ', frame ' + f + ': the whole memory ' + (e[0] || 'ran') + ' / the page\'s ' + (e[1] || 'ran')); ok = false; break; }
    if (A.past === null && B.past === null) ok = compare(what, f, A.rt, B.rt);
  }
  for (const k of B.rt.missing) missing.set(k, (missing.get(k) || []).concat(what));
  if (!ok) return;
  // the reads: the same places, as many, and every random number drawn
  const ahead = B.past !== null, n = Math.min(rec.reads.length, B.reads.length, ahead ? B.past : Infinity);
  let i = 0;
  while (i < n && rec.reads[i][0] === B.reads[i]) i++;
  if (i < n || (!ahead && B.reads.length < rec.reads.length)) { fail(what + ': the page read ' + (i < n ? hex(B.reads[i]) + ' where the game read ' + hex(rec.reads[i][0]) + ', read ' + i : B.reads.length + ' times, the game ' + rec.reads.length)); return; }
  if (!ahead && B.drawsLeft) { fail(what + ': the page drew ' + (rec.R.length - B.drawsLeft) + ' random numbers, the game ' + rec.R.length); return; }
  // the pace: at the last read both made, and over each wait of more than a second
  const last = n - 1;
  if (last < 1) { fail(what + ': ' + rec.reads.length + ' reads on the game'); return; }
  const g = rec.times[last], p = B.times[last], off = (g - p) / p;
  paceSum += off; paced++;
  const waits = [];
  for (let k = 1; k <= last; k++) {
    const dg = rec.times[k] - rec.times[k - 1], dp = B.times[k] - B.times[k - 1];
    if (dg > SECOND) waits.push((dg - dp) / dp);
  }
  const bad = waits.filter(x => Math.abs(x) > 0.10);
  const said = what + ': ' + n + ' reads in ' + (g / SECOND).toFixed(1) + ' s on the game, ' + (p / SECOND).toFixed(1) + ' s on the page (' + faster(off) + ')' +
    (waits.length ? '; ' + waits.length + ' waits of over a second, the worst ' + faster(waits.reduce((w, x) => (Math.abs(x) > Math.abs(w) ? x : w), 0)) : '');
  if (Math.abs(off) > 0.05 || bad.length) fail(said + (bad.length ? ', ' + bad.length + ' over 10 %' : ''));
  else console.log(said);
}

// ---- from the hand-over: into a scenario, and through the designer
for (const seed of [1, 2]) session('from the hand-over, seed ' + seed, { seed });
session('the designer, seed 4', { seed: 4, designer: true });
session('the designer, saving and loading a wizard, seed 5', { seed: 5, designer: 'load' });

// ---- from the moments
const states = lib.states(FILTER).filter(st => /^s\d-/.test(st) && lib.readState(st).cpu.pc === 0x61E6);
if (!states.length) {
  console.log((process.env.KIT_REQUIRE_TOOLS ? 'FAIL' : 'skip') + ': no moments of play in work/states (test/sessions.js saves them)');
  if (process.env.KIT_REQUIRE_TOOLS) fails++;
}
for (const st of states.filter((n, i) => i % EVERY === 0)) session(st, { state: st, seed: 11 });

if (missing.size) fail(missing.size + ' stretch(es) with no cost: ' + [...missing].map(([k, v]) => k + ' (' + [...new Set(v)].slice(0, 3).join(', ') + ')').join(', '));
if (paced) console.log('the pace over ' + paced + ' sessions: ' + faster(paceSum / paced) + ' than the game on average');
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
