'use strict';
// The Play page's machine (page/runtime.js) on the memory the page carries, with every instruction
// blanked (scripts/pack-data.js), beside the same machine on the whole memory. The port must read
// none of the game's code: anything it reads there that matters shows as a difference in the rest
// of memory, the chips or the clock, or as a throw. Two runs:
//   - from the loader's jump: the title's menus in each language, the opening, then play with
//     random keys: walking, turning, looking, the pointer, shooting, the information screen;
//   - from each moment of play in work/states, with the same blanks, and random keys.
// Each frame of the two must agree. Then the pace: from moments of play, with a script of turns,
// walks and looks, the time the game (kit/c64/machine.js) and the page take for the same passes,
// within 5 % of each other.
// With KIT_REQUIRE_TOOLS set, missing snapshots fail the test.
//   node t-page.js [frames per moment] [moment filter]
const fs = require('fs'), path = require('path');
const lib = require('./lib.js');
const { loadPort } = require('./port.js');
const { pack } = require('../scripts/pack-data.js');
require(path.join(lib.REPO, 'site/lib/c64.js'));
require(path.join(lib.REPO, 'site/lib/sid.js'));
loadPort();
require(path.join(lib.GAME, 'port/page/runtime.js'));
const { CMPage } = globalThis;

if (!fs.existsSync(path.join(lib.WORK, 'entry.vsf'))) {
  console.log((process.env.KIT_REQUIRE_TOOLS ? 'FAIL' : 'skip') + ': no work/entry.vsf (the loader\'s jump; see test/lib.js)');
  process.exit(process.env.KIT_REQUIRE_TOOLS ? 1 : 0);
}
const FRAMES = +process.argv[2] || 600, FILTER = process.argv[3] || '';
const cost = JSON.parse(fs.readFileSync(path.join(lib.GAME, 'port/cost.json'), 'utf8'));
const whole = lib.machine('entry').save(), packed = pack().state;
const make = data => CMPage.create({ data, cost });

// the addresses the page's copy blanks
const BLANK = new Uint8Array(0x10000);
{
  const a = Buffer.from(whole.ram, 'base64'), b = Buffer.from(packed.ram, 'base64');
  for (let i = 0; i < 0x10000; i++) if (a[i] !== b[i]) BLANK[i] = 1;
}

let fails = 0;
const hex = n => '$' + n.toString(16).toUpperCase().padStart(4, '0');
// The two machines after a frame: the clock, then every byte of memory the page's copy did not
// blank, colour RAM, and the chips
function compare(what, f, A, B) {
  const d = [];
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
// one frame on both with the same input; a throw in either fails (the page would stop there)
function frame(what, f, A, B, keys) {
  const e = [];
  for (const R of [A, B]) {
    R.input.keys = new Set(keys);
    try { R.runFrame(); e.push(null); } catch (x) { e.push(x.message); }
  }
  if (e[0] || e[1]) {
    console.log('FAIL ' + what + ', frame ' + f + ': the whole memory ' + (e[0] || 'ran') + ' / the page\'s ' + (e[1] || 'ran'));
    fails++;
    return false;
  }
  return compare(what, f, A, B);
}

let seed = 7;
const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return Math.floor(seed / 4294967296 * n); };
const KEYS = ['UP', 'UP', '=', 'Z', 'X', 'Z', 'X', 'P', 'L', 'C', 'W', 'R', 'U', 'SPACE', 'A', 'F', 'LSHIFT', 'I', 'RETURN'];
// random input: a key held for a few frames, and now and then nothing
function randomInput() {
  let keys = [], left = 0;
  return () => {
    if (!left--) { left = 4 + rnd(30); keys = rnd(3) ? [KEYS[rnd(KEYS.length)]] : []; }
    return keys;
  };
}

// ---- from the loader's jump, in each language
for (const lang of ['1', '2', '3']) {
  const A = make(whole), B = make(packed);
  const script = [[60, lang, 6], [120, 'RETURN', 6], [180, '2', 6], [240, 'RETURN', 6], [700, 'SPACE', 6]];
  const input = randomInput();
  let f = 0, ok = true;
  for (; ok && f < 900 + 3 * FRAMES; f++) {
    let keys = [];
    if (f < 900) { for (const [at, k, d] of script) if (f >= at && f < at + d) keys.push(k); }
    else keys = input();
    ok = frame('from the jump, language ' + lang, f, A, B, keys);
  }
  console.log('from the jump, language ' + lang + ': ' + f + ' frames' + (ok ? ', the same' : ''));
}

// ---- from the moments
const states = lib.states(FILTER);
for (const st of states) {
  const s = lib.readState(st);
  const ram = new Uint8Array(Buffer.from(s.ram, 'base64'));
  for (let a = 0; a < 0x10000; a++) if (BLANK[a]) ram[a] = 0;
  const entry = P => P.main_loop({ c: s.cpu.p & 1 });
  const A = make(whole), B = make(packed);
  A.restore(s, entry);
  B.restore(Object.assign({}, s, { ram: Buffer.from(ram).toString('base64') }), entry);
  const input = randomInput();
  let f = 0, ok = true;
  for (; ok && f < FRAMES; f++) ok = frame(st, f, A, B, input());
  if (ok) console.log(st + ': ' + f + ' frames, the same');
}

// ---- the pace: a turn, a walk, a look about, the other turn, again and again, the keys set as
// each pass begins, so that the game and the page play the same passes and only their time
// differs: the clock at the start of the last pass both reach in 40 seconds of the game's time
const SECONDS = 40;
const plan = n => [['X'], ['UP'], ['P'], ['Z'], ['UP', 'X'], ['L']][Math.floor(n / 3) % 6];
const paced = states.filter((n, i) => /^(play|walk)-/.test(n) || i % 12 === 0);
let sum = 0;
for (const st of paced) {
  const state = lib.readState(st), t0 = state.cpu.cycles;
  const m = lib.restore(state);
  // the moment stands at a pass's start, which the machine counts as it goes on
  const game = [];
  m.skipOnce = false;
  m.onPass = mm => { mm.releaseAll(); for (const k of plan(game.length)) mm.press(k); game.push(mm.cpu.cycles - t0); return false; };
  m.runFrames(SECONDS * 50);
  const B = make(packed), page = [];
  B.restore(state, P => (function* () {
    for (const y of P.main_loop({ c: state.cpu.p & 1 })) { if (y && y.cp === lib.PASS) { B.input.keys = new Set(plan(page.length)); page.push(B.t - t0); } yield y; }
  })());
  for (let f = 0; f < SECONDS * 50; f++) B.runFrame();
  const n = Math.min(game.length, page.length) - 1;
  if (n < 1) { console.log('FAIL ' + st + ': ' + game.length + ' passes on the game, ' + page.length + ' on the page'); fails++; continue; }
  const off = (game[n] - page[n]) / page[n];
  sum += off;
  const said = st + ': ' + n + ' passes in ' + (game[n] / lib.FRAME / 50).toFixed(1) + ' s on the game, ' + (page[n] / lib.FRAME / 50).toFixed(1) + ' s on the page';
  if (Math.abs(off) > 0.05) { console.log('FAIL ' + said); fails++; }
  else console.log(said + ' (' + faster(off) + ')');
}
function faster(off) { return 'the page ' + Math.abs(off * 100).toFixed(1) + ' % ' + (off < 0 ? 'slower' : 'faster'); }
if (paced.length) console.log('the pace on ' + paced.length + ' moments: ' + faster(sum / paced.length) + ' than the game on average');

// ---- the menus' pace: the time the game and the page take to reach each of the menus' stops, the
// keys pressed a while after each is reached; within 5 % of each other, and the same name typed. The
// name's prompt takes a letter each time round its loop, so a key held across two goes types it
// twice, on the C64 and on the page alike.
// stops: [address, keys pressed there, frames after reaching it, frames held], in order. A stop is
// reached at its time on each one's clock: the page runs a long routine in one go, ahead of the
// frame it shows, and the keys it reads after that are those of the frame its clock has reached.
function stops(what, list, startGame, startPage, until, read) {
  const at = t => ({ t, f: Math.floor(t / lib.FRAME) });
  const runOne = (step, seenOf) => {
    const seen = {};
    let f = 0;
    const keys = () => {
      for (const [a, k, after, hold] of list) if (seen[a] && f >= seen[a].f + after && f < seen[a].f + after + hold) return [k];
      return [];
    };
    seenOf(seen);
    for (; f < 1500 && !(seen[until] && f > seen[until].f + 60); f++) step(keys());
    return seen;
  };
  let mm, t0 = 0;
  const g = runOne(keys => { mm.releaseAll(); for (const k of keys) mm.press(k); mm.runFrames(1); }, seen => {
    mm = startGame(); t0 = mm.cpu.cycles;
    for (const [a] of list.concat([[until]])) {
      const note = () => { if (!seen[a]) seen[a] = at(mm.cpu.cycles - t0); return false; };
      if (a === lib.PASS) { mm.skipOnce = false; mm.onPass = note; } else mm.hooks[a] = note;
    }
  });
  let B, b0 = 0;
  const p = runOne(keys => { B.input.keys = new Set(keys); B.runFrame(); }, seen => {
    const watch = new Set(list.map(l => l[0]).concat([until]));
    B = make(packed);
    startPage(B, it => (function* () {
      for (const y of it) { if (y && watch.has(y.cp) && !seen[y.cp]) seen[y.cp] = at(B.t - b0); yield y; }
    })());
    b0 = B.t;
  });
  const said = [];
  for (const a of [...new Set(list.map(l => l[0]).concat([until]))]) {
    if (g[a] && p[a] && !g[a].t && !p[a].t) continue;              // where both start
    if (!g[a] || !p[a]) { console.log('FAIL ' + what + ': ' + hex(a) + (g[a] ? '' : ' not reached on the game') + (p[a] ? '' : ' not reached on the page')); fails++; return; }
    const off = (g[a].t - p[a].t) / p[a].t;
    said.push(hex(a) + ' at ' + (g[a].t / lib.FRAME / 50).toFixed(2) + ' s, ' + faster(off));
    if (Math.abs(off) > 0.05) { console.log('FAIL ' + what + ': ' + said.join('; ')); fails++; return; }
  }
  if (read) {
    const a = read(mm.ram), b = read(B.M);
    said.push('typed "' + a + '" and "' + b + '"');
    if (a !== b) { console.log('FAIL ' + what + ': ' + said.join('; ')); fails++; return; }
  }
  console.log(what + ': ' + said.join('; '));
}
// the title's menus from the loader's jump: English, the princess, the view opened
stops('the title', [[0x9B1C, '1', 20, 3], [0x9B1C, 'RETURN', 40, 3], [0x9C97, '2', 20, 3], [0x9C97, 'RETURN', 40, 3], [0x8333, 'SPACE', 20, 3]],
  () => lib.machine('entry'), (B, wrap) => B.restore(packed, P => wrap(P.start())), lib.PASS);
// the information screen from moments of play: S, D, and T held for ten frames
const name = M => { let s = ''; for (let a = 0x7AF5; M[a] !== 0x23 && M[a] !== 0x20 && s.length < 6; a++) s += String.fromCharCode(M[a]); return s; };
for (const st of states.filter((n, i) => i % 25 === 0)) {
  const state = lib.readState(st);
  stops('the information screen, ' + st, [[lib.PASS, 'I', 0, 3], [0x794E, 'S', 20, 3], [0x7B39, 'D', 20, 3], [0x7BAF, 'T', 20, 10]],
    () => lib.restore(state), (B, wrap) => B.restore(state, P => wrap(P.main_loop({ c: state.cpu.p & 1 }))), 0x7BAF, name);
}
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
