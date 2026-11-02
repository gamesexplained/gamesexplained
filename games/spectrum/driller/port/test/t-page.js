'use strict';
// The Play page's machine (page/runtime.js) on the memory the page carries, with every instruction
// blanked (scripts/pack-data.js), beside the same machine on the whole memory. The port must read
// none of the game's code: anything it reads there that matters shows as a difference in memory,
// the border or the clock, or as a throw. Then the page alone through every way out of play that
// lockstep.js forces, failing on a stretch the cost model has no figure for; and the pace, against
// the game on the 48K machine (lib.js).
//   - from the hand-over: the security question answered, ENTER at the control options, then play
//     with random keys: walks, turns, looks, the crosshair, shots, the drill;
//   - from moments of play in work/states, with the same blanks, and random keys;
//   - the scenarios of lockstep.js (the clock run out, the energy, the shield, the information
//     screen and abandoning from it) on the page alone: no stretch without a cost;
//   - the pace: from moments of play, with a plan of commands set as each pass begins, the time the
//     game and the page take for the same passes, within 5 % of each other; and from the hand-over,
//     with the same keys frame by frame, the time each takes to reach the first pass of play.
// With KIT_REQUIRE_TOOLS set, missing moments of play fail the test.
//   node t-page.js [frames per moment] [moment filter]
const path = require('path');
const lib = require('./lib.js');
const { loadPort } = require('./port.js');
const { pack } = require('../scripts/pack-data.js');
const { SCENARIOS } = require('./lockstep.js');
loadPort();
require(path.join(lib.GAME, 'port/page/runtime.js'));
const { DRPage } = globalThis;

const FRAMES = +process.argv[2] || 600, FILTER = process.argv[3] || '';
const PASS = lib.PASS_AT, FRAME = DRPage.FRAME;
const cost = require(path.join(lib.GAME, 'port/cost.json'));
const packed = pack(), whole = pack({ whole: true }).state, BLANK = packed.blank;
const make = data => DRPage.create({ data, cost });

let fails = 0;
const hex = n => '$' + n.toString(16).toUpperCase().padStart(4, '0');
// the two machines after a frame: the clock, the border and every byte the page's copy did not blank
function compare(what, f, A, B) {
  const d = [];
  if (A.t !== B.t) d.push('clock ' + A.t + ' / ' + B.t);
  if (A.border !== B.border) d.push('border ' + A.border + ' / ' + B.border);
  for (let i = 0x4000; i < 0x10000 && d.length < 8; i++) if (A.M[i] !== B.M[i] && !BLANK[i]) d.push(hex(i) + ' ' + A.M[i] + ' / ' + B.M[i]);
  if (!d.length) return true;
  console.log('FAIL ' + what + ', frame ' + f + ': ' + d.join(', '));
  fails++;
  return false;
}
// one frame on both with the same keys; a throw in either fails (the page would stop there)
function frame(what, f, A, B, keys) {
  const e = [];
  for (const R of [A, B]) {
    R.input.keys = new Set(keys); R.input.joy = 0;
    try { R.runFrame(); e.push(null); } catch (x) { e.push(x.message); }
  }
  if (e[0] || e[1]) {
    console.log('FAIL ' + what + ', frame ' + f + ': the whole memory ' + (e[0] || 'ran') + ' / the page\'s ' + (e[1] || 'ran'));
    fails++;
    return false;
  }
  return compare(what, f, A, B);
}

const rnd = lib.makeRnd(7);
// random keys in play: a command held a while, now and then the crosshair's swap, a shot or a drill
const PLAY = [['O'], ['O'], ['K'], ['Q'], ['W'], ['P'], ['L'], ['N'], ['M'], ['R'], ['F'], ['A'], ['Z'], ['S'], ['X'], ['U'], ['0'], ['SPACE'], ['D'], ['C'], ['B'], []];
function randomKeys() {
  let held = [], left = 0;
  return () => {
    if (!left--) { left = 4 + rnd(40); held = PLAY[rnd(PLAY.length)]; }
    return held;
  };
}
// The answer, typed once the question shows its prompt (the cursor at $CB6F), each letter held 6
// frames and let go 6; then ENTER at the control options. Keys by frame, from what the memory shows.
function starting() {
  let plan = null, i = 0;
  return M => {
    if (!plan && M[0xCB6F] === 0x23) {
      let w;
      try { w = lib.answer(M); } catch (e) { return []; }
      plan = [];
      for (const ch of w.toUpperCase()) { for (let k = 0; k < 6; k++) plan.push([ch]); for (let k = 0; k < 6; k++) plan.push([]); }
      for (let k = 0; k < 6; k++) plan.push(['ENTER']);
      for (let k = 0; k < 90; k++) plan.push([]);
      for (let k = 0; k < 6; k++) plan.push(['ENTER']);
    }
    return plan && i < plan.length ? plan[i++] : [];
  };
}

// ---- from the hand-over
{
  const A = make(whole), B = make(packed.state);
  const start = starting(), input = randomKeys();
  let f = 0, ok = true;
  for (; ok && f < 1200 + 3 * FRAMES; f++) ok = frame('from the hand-over', f, A, B, f < 1200 ? start(A.M) : input());
  console.log('from the hand-over: ' + f + ' frames' + (ok ? ', the same' : ''));
}

// ---- from the moments
const states = lib.states(FILTER).filter(st => lib.readState(st).cpu.pc === PASS);
if (!states.length) {
  console.log((process.env.KIT_REQUIRE_TOOLS ? 'FAIL' : 'skip') + ': no moments of play in work/states (test/sessions.js saves them)');
  if (process.env.KIT_REQUIRE_TOOLS) fails++;
}
// A moment with the page's blanks: the code it still holds as the loader left it. A byte of code
// the game has since written over (the view's first instruction, which the question mends) is the
// game's data now, and stays.
const handOver = Buffer.from(whole.ram, 'base64');
const blanked = s => {
  const a = new Uint8Array(Buffer.from(s.ram, 'base64'));
  for (let i = 0x4000; i < 0x10000; i++) if (BLANK[i] && a[i] === handOver[i - 0x4000]) a[i] = 0;
  return Object.assign({}, s, { ram: Buffer.from(a).toString('base64') });
};
const entry = P => P.program(false);
for (const st of states.filter((n, i) => i % 8 === 0)) {
  const s = lib.readState(st);
  const A = make(whole), B = make(packed.state);
  A.restore(s, entry); B.restore(blanked(s), entry);
  const input = randomKeys();
  let f = 0, ok = true;
  for (; ok && f < FRAMES; f++) ok = frame(st, f, A, B, input());
  if (ok) console.log(st + ': ' + f + ' frames, the same');
}

// ---- the scenarios on the page alone: each step waits for its moment (a pass count, a mark the
// page reached since the last step began, or frames since the last step ended), then holds its keys
// and the stick for its frames or until a mark. Marks: the control options and the information
// screen as the port enters them, and the game over as it shows area $7F.
const missing = new Map();
for (const [name, sc] of Object.entries(SCENARIOS)) {
  const s = lib.readState(sc.state + '.json');
  const ram = new Uint8Array(Buffer.from(s.ram, 'base64'));
  if (sc.poke) sc.poke(ram);
  const R = make(packed.state);
  const seen = {}, log = [];
  let f = 0, passes = 0;
  const mark = k => { seen[k] = f; log.push(k + ' at frame ' + f); };
  const opt = R.P.control_options, info = R.P.info_screen;
  R.P.control_options = function* (r) { mark('options'); return yield* opt.call(this, r); };
  R.P.info_screen = function* (r) { mark('info'); return yield* info.call(this, r); };
  R.restore(blanked(Object.assign({}, s, { ram: Buffer.from(ram).toString('base64') })),
    P => (function* () { for (const y of P.program(false)) { if (y && y.cp === PASS) passes++; yield y; } })());
  const input = randomKeys();
  let i = 0, hold = 0, from = 0, began = 0, over = false;
  const steps = sc.steps;
  let threw = null;
  for (; f < 12000 && !threw; f++) {
    if (!over && R.M[0x8862] === 0x7F) { over = true; mark('gameOver ' + R.M[0x8BF2]); seen.gameOver = f; }
    if (R.M[0x8862] !== 0x7F) over = false;
    let keys = [], joy = 0;
    if (hold) {
      const st = steps[i];
      keys = st.keys || []; joy = st.joy || 0;
      if (!--hold || (st.until && seen[st.until] >= from)) { hold = 0; i++; from = f; keys = []; joy = 0; }
    } else if (i < steps.length) {
      const st = steps[i];
      const ready = st.pass !== undefined ? passes >= st.pass : st.mark ? seen[st.mark] >= began : f - from >= (st.after || 0);
      if (ready) {
        if (st.keys || st.joy || st.frames) { keys = st.keys || []; joy = st.joy || 0; hold = st.frames || 1; from = began = f; }
        else { i++; from = began = f; }
      }
    } else if (passes >= sc.passes) break;
    else keys = input();
    R.input.keys = new Set(keys); R.input.joy = joy;
    try { R.runFrame(); } catch (e) { threw = e; }
  }
  if (threw) { console.log('FAIL scenario ' + name + ', frame ' + f + ': ' + threw.message); fails++; continue; }
  for (const k of R.missing) missing.set(k, (missing.get(k) || []).concat(name));
  const ok = i >= steps.length;
  console.log('scenario ' + name + ': ' + f + ' frames, ' + passes + ' passes; ' + log.join(', ') + (ok ? '' : '; NOT every step taken: stopped at step ' + i));
  if (!ok) fails++;
}
if (missing.size) {
  console.log('FAIL ' + missing.size + ' stretch(es) with no cost: ' + [...missing].map(([k, v]) => k + ' (' + [...new Set(v)].join(', ') + ')').join(', '));
  fails++;
}

// ---- the pace: commands set as each pass begins, so that the game and the page play the same
// passes and only their time differs: the clock at the start of the last pass both reach in 30
// seconds of the game's time. The page's pass counts once its clock has paid the stretch to it.
const SECONDS = 30;
const plan = lib.pacePlan;
const faster = off => 'the page ' + Math.abs(off * 100).toFixed(1) + ' % ' + (off < 0 ? 'slower' : 'faster');
let sum = 0, paced = 0;
for (const st of states.filter((n, i) => i % 10 === 0)) {
  const state = lib.readState(st), t0 = state.cpu.tstates;
  const m = lib.restore(state);
  const game = [];
  m.skipOnce = false;
  m.onPass = mm => { mm.releaseAll(); for (const k of plan(game.length)) mm.press(k); game.push(mm.cpu.tstates - t0); return false; };
  m.runFrames(SECONDS * 50);
  const B = make(packed.state), page = [];
  B.restore(blanked(state), P => (function* () {
    for (const y of P.program(false)) {
      const pass = y && y.cp === PASS;
      if (pass) B.input.keys = new Set(plan(page.length));
      yield y;
      if (pass) page.push(B.t - t0);
    }
  })());
  for (let f = 0; f < SECONDS * 50; f++) B.runFrame();
  const n = Math.min(game.length, page.length) - 1;
  if (n < 1) { console.log('FAIL ' + st + ': ' + game.length + ' passes on the game, ' + page.length + ' on the page'); fails++; continue; }
  const off = (game[n] - page[n]) / page[n];
  sum += off; paced++;
  const said = st + ': ' + n + ' passes in ' + (game[n] / FRAME / 50).toFixed(1) + ' s on the game, ' + (page[n] / FRAME / 50).toFixed(1) + ' s on the page';
  if (Math.abs(off) > 0.05) { console.log('FAIL ' + said); fails++; }
  else console.log(said + ' (' + faster(off) + ')');
}
if (paced) console.log('the pace on ' + paced + ' moments: ' + faster(sum / paced) + ' than the game on average');

// ---- the start's pace: the same keys frame by frame on the game and the page, and the time each
// takes from the hand-over to the first pass of play
{
  const m = lib.boot(), t0 = m.cpu.tstates;
  let gameAt = null;
  m.onPass = mm => { if (gameAt === null) gameAt = mm.cpu.tstates - t0; return true; };
  const startG = starting();
  for (let f = 0; f < 3000 && gameAt === null; f++) {
    m.releaseAll(); for (const k of startG(m.ram)) m.press(k);
    m.runFrames(1);
  }
  const B = make(packed.state), startP = starting();
  let pageAt = null;
  B.restore(packed.state, P => (function* () {
    for (const y of P.program(true)) { const pass = y && y.cp === PASS; yield y; if (pass && pageAt === null) pageAt = B.t - t0; }
  })());
  for (let f = 0; f < 3000 && pageAt === null; f++) { B.input.keys = new Set(startP(B.M)); B.runFrame(); }
  if (gameAt === null || pageAt === null) { console.log('FAIL the start: play reached ' + (gameAt === null ? 'not on the game' : '') + (pageAt === null ? ' not on the page' : '')); fails++; }
  else {
    const off = (gameAt - pageAt) / pageAt;
    const said = 'the start: the first pass of play ' + (gameAt / FRAME / 50).toFixed(2) + ' s from the hand-over on the game, ' + (pageAt / FRAME / 50).toFixed(2) + ' s on the page';
    if (Math.abs(off) > 0.05) { console.log('FAIL ' + said); fails++; } else console.log(said + ' (' + faster(off) + ')');
  }
}
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
