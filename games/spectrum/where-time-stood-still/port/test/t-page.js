'use strict';
// The Play page's machine (page/runtime.js) on the memory the page carries, with every instruction
// blanked (scripts/pack-data.js), beside the same machine on the whole memory. The port must read
// none of the game's code: anything it reads there that matters shows as a difference in the rest
// of the banks, the chips or the clock, or as a throw. Two runs:
//   - from the hand-over: the title, the control selection (Kempston), then play with random
//     input: walks, runs, shots, the menus;
//   - from each moment of play in work/states, with the same blanks, and random input.
// Each frame of the two must agree. Then the pace: from moments of play, with a plan of walks and
// runs set as each pass begins, the time the game (the 128K machine, test/lib.js) and the page take
// for the same passes, within 5 % of each other; and from the hand-over, with the same keys on
// the control selection, the time each takes to reach the first pass of play.
// With KIT_REQUIRE_TOOLS set, missing moments of play fail the test.
//   node t-page.js [frames per moment] [moment filter]
const path = require('path');
const lib = require('./lib.js');
const { loadPort } = require('./port.js');
const { pack } = require('../scripts/pack-data.js');
loadPort();
require(path.join(lib.GAME, 'port/page/runtime.js'));
const { WTPage } = globalThis;

const FRAMES = +process.argv[2] || 600, FILTER = process.argv[3] || '';
const PASS = 0x86A2, FRAME = WTPage.FRAME;
const cost = require(path.join(lib.GAME, 'port/cost.json'));
const packed = pack(), whole = pack({ whole: true }).state, BLANK = packed.blank;
const make = data => WTPage.create({ data, cost });
// Bytes the two may hold differently: the input routine the control selection copies to $6811
// (bank 5) from the code at $B0D7's addresses, which the page's copy has blanked but for the three
// bytes at each routine's start, all the port reads of it (input_routine, src/g-main.js)
const SKIP = BLANK.map(b => Uint8Array.from(b));
SKIP[5].fill(1, 0x6814 - 0x4000, 0x6858 - 0x4000);

let fails = 0;
const hex = n => '$' + n.toString(16).toUpperCase().padStart(4, '0');
// The two machines after a frame: the clock, every byte of each bank the page's copy did not blank,
// the paging, the border and the AY
function compare(what, f, A, B) {
  const d = [];
  if (A.t !== B.t) d.push('clock ' + A.t + ' / ' + B.t);
  if (A.paging !== B.paging) d.push('paging ' + A.paging + ' / ' + B.paging);
  if (A.border !== B.border) d.push('border ' + A.border + ' / ' + B.border);
  for (let r = 0; r < 16; r++) if (A.ay[r] !== B.ay[r]) d.push('AY ' + r);
  for (let n = 0; n < 8 && d.length < 8; n++) {
    const a = A.mem.bank(n), b = B.mem.bank(n);
    for (let i = 0; i < 0x4000 && d.length < 8; i++) if (a[i] !== b[i] && !SKIP[n][i]) d.push('bank ' + n + ' +' + hex(i) + ' ' + a[i] + ' / ' + b[i]);
  }
  if (!d.length) return true;
  console.log('FAIL ' + what + ', frame ' + f + ': ' + d.join(', '));
  fails++;
  return false;
}
// one frame on both with the same input; a throw in either fails (the page would stop there)
function frame(what, f, A, B, [keys, joy]) {
  const e = [];
  for (const R of [A, B]) {
    R.input.keys = new Set(keys); R.input.joy = joy;
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
const J = lib.JOY;
const STICK = [J.UP, J.DOWN, J.LEFT, J.RIGHT, J.UP | J.LEFT, J.DOWN | J.RIGHT, J.UP | J.FIRE, J.LEFT | J.FIRE, J.FIRE, 0];
// random input: the stick held for a while, now and then fire alone or SPACE for the menus
function randomInput() {
  let held = [[], 0], left = 0;
  return () => {
    if (!left--) { left = 4 + rnd(40); held = rnd(12) ? [[], STICK[rnd(STICK.length)]] : [['SPACE'], 0]; }
    return held;
  };
}
// the control selection: Kempston (2), then 0 and Y, each held 8 frames
const SELECT = [[30, '2'], [70, '0'], [110, 'Y']];
const selecting = f => { for (const [at, k] of SELECT) if (f >= at && f < at + 8) return [[k], 0]; return [[], 0]; };

// ---- from the hand-over
{
  const A = make(whole), B = make(packed.state);
  const input = randomInput();
  let f = 0, ok = true;
  for (; ok && f < 300 + 3 * FRAMES; f++) ok = frame('from the hand-over', f, A, B, f < 300 ? selecting(f) : input());
  console.log('from the hand-over: ' + f + ' frames' + (ok ? ', the same' : ''));
}

// ---- from the moments
const states = lib.states(FILTER);
if (!states.length) {
  console.log((process.env.KIT_REQUIRE_TOOLS ? 'FAIL' : 'skip') + ': no moments of play in work/states (test/sessions.js saves them)');
  if (process.env.KIT_REQUIRE_TOOLS) fails++;
}
// A moment with the page's blanks: the code it still holds as the loader left it. A byte of code
// the game has since written over is the game's data now, and stays. The view's buffer ($AE10 to
// $BEAF, the title's code before play) stays whole: the view is drawn there before it is shown (the
// run from the hand-over checks that), and a byte drawn with the title's own value could not be
// told from code by its value.
const handOver = whole.banks.map(b => new Uint8Array(Buffer.from(b, 'base64')));
const VIEW = [0xAE10 - 0x8000, 0xBEB0 - 0x8000];
const blanked = s => Object.assign({}, s, { banks: s.banks.map((b, n) => {
  const a = new Uint8Array(Buffer.from(b, 'base64'));
  for (let i = 0; i < 0x4000; i++) {
    if (n === 2 && i >= VIEW[0] && i < VIEW[1]) continue;
    if (BLANK[n][i] && a[i] === handOver[n][i]) a[i] = 0;
  }
  return Buffer.from(a).toString('base64');
}) });
const entry = P => P.program(false);
for (const st of states.filter((n, i) => i % 4 === 0)) {
  const s = lib.readState(st);
  const A = make(whole), B = make(packed.state);
  A.restore(s, entry); B.restore(blanked(s), entry);
  const input = randomInput();
  let f = 0, ok = true;
  for (; ok && f < FRAMES; f++) ok = frame(st, f, A, B, input());
  if (ok) console.log(st + ': ' + f + ' frames, the same');
}

// ---- the pace: walks and runs the four ways, set as each pass begins, so that the game and the
// page play the same passes and only their time differs: the clock at the start of the last pass
// both reach in 30 seconds of the game's time
const SECONDS = 30;
const plan = n => [J.UP, J.RIGHT, J.DOWN | J.FIRE, J.LEFT, 0, J.RIGHT | J.FIRE, J.FIRE][Math.floor(n / 8) % 7];
const faster = off => 'the page ' + Math.abs(off * 100).toFixed(1) + ' % ' + (off < 0 ? 'slower' : 'faster');
let sum = 0, paced = 0;
for (const st of states.filter((n, i) => i % 6 === 0)) {
  const state = lib.readState(st), t0 = state.cpu.tstates;
  const m = lib.restore(state);
  const game = [];
  m.skipOnce = false;
  m.onPass = mm => { mm.joy = plan(game.length); game.push(mm.cpu.tstates - t0); return false; };
  m.runFrames(SECONDS * 50);
  const B = make(packed.state), page = [];
  B.restore(blanked(state), P => (function* () {
    for (const y of P.program(false)) { if (y && y.cp === PASS) { B.input.joy = plan(page.length); page.push(B.t - t0); } yield y; }
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

// ---- the title's pace: the same keys on the control selection, frame by frame, on the game and
// the page, and the time each takes from the hand-over to the first pass of play
{
  const m = lib.boot(), t0 = m.cpu.tstates;
  let gameAt = null;
  m.onPass = mm => { if (gameAt === null) gameAt = mm.cpu.tstates - t0; return true; };
  for (let f = 0; f < 1500 && gameAt === null; f++) {
    const [keys] = selecting(f);
    m.releaseAll(); for (const k of keys) m.press(k);
    m.runFrames(1);
  }
  const B = make(packed.state);
  let pageAt = null;
  B.restore(packed.state, P => (function* () {
    for (const y of P.program(true)) { if (y && y.cp === PASS && pageAt === null) pageAt = B.t - t0; yield y; }
  })());
  for (let f = 0; f < 1500 && pageAt === null; f++) { B.input.keys = new Set(selecting(f)[0]); B.runFrame(); }
  if (gameAt === null || pageAt === null) { console.log('FAIL the title: play reached ' + (gameAt === null ? 'not on the game' : '') + (pageAt === null ? ' not on the page' : '')); fails++; }
  else {
    const off = (gameAt - pageAt) / pageAt;
    const said = 'the title: the first pass of play ' + (gameAt / FRAME / 50).toFixed(2) + ' s from the hand-over on the game, ' + (pageAt / FRAME / 50).toFixed(2) + ' s on the page';
    if (Math.abs(off) > 0.05) { console.log('FAIL ' + said); fails++; } else console.log(said + ' (' + faster(off) + ')');
  }
}
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
