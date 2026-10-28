'use strict';
// The Play tab as the page runs it, on a clean checkout: the page's own blocks (the port, the page's
// machine and its pacing) run in node on the memory the page carries, from the start-up the
// depacker jumps to. The port's own tests hold each routine and the main loop to the game's code
// (port/test, with moments of play saved in work/); this one holds the page that is published,
// beside the game's own code on the kit's C64 (port/test/lib.js's machine, from listing.json), with
// nothing from work/. Each frame both are given the stick and keys of the test player (lib.bot), as
// it chooses them on the C64.
// - The memory the page carries, every instruction of the game but the sound driver's left out,
//   plays as the whole memory does: over 2,000 frames from the start-up, every byte the game keeps
//   outside its code and the stack is the same on each frame.
// - From the start-up, the title page, the intro and the first stage: the main loop's first pass on
//   the C64's frame, give or take two, and each life lost before the game's first 1,300 frames end
//   on the C64's frame, give or take two.
// - Moments of play made here on the C64 as port/scripts/gen-states.js makes them (the hero kept
//   alive while it plays to them, the game's code put back in each), every 2,500 frames through the
//   four stages and their fights: from each, for 400 frames, the hero's place on the page is the
//   C64's on the same frame or the one before or after it, but for at most three frames in a row;
//   each life lost, stage begun and fight begun or ended comes on the C64's frame, give or take two;
//   and the bytes the deaths in the fights and the Bridges won leave on the C64's stack are those
//   the page counts (it stops the game where they crash a C64).
// - The page alone, playing from the start-up: no frame throws, the status band's interrupt comes
//   once a frame, the clock keeps to the frames shown, and while the main loop runs the playfield
//   as play.html draws it only stands still or moves left one or two pixels from one frame to the
//   next, as the game scrolls it (a frame drawn over memory the game has moved on since jumps by a
//   character).
//   node games/c64/green-beret/test_play.js
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64'); g.lib('sid');
g.lib('cpu6502');                   // the 6502 the port's sound driver runs on, as play.html loads it
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
for (const b of ['port/src/core.js', 'port/src/names.js', 'port/page/runtime.js']) if (!blocks.includes(b)) { console.log('FAIL: play.html has no ' + b); process.exit(1); }
const GIVES = { 'port/src/core.js': 'GBPort', 'port/src/names.js': 'GBNames', 'port/page/runtime.js': 'GBPage' };
for (const b of blocks) g.run(PAGE, b, GIVES[b] || 'GBGroups');
const { GBPage, C64 } = globalThis;
const cost = JSON.parse(/^window\.GB_COST = (.*);$/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="gb-data">([^<]*)<\/script>/.exec(page)[1]);
const lib = require('./port/test/lib.js');
const { FRAME } = GBPage;
const CRASH = +/const CRASH = (\d+);/.exec(page)[1];

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
// the bytes the game keeps: stage, lives, the fight; the hero's place: the map's column, his X and Y
const T0 = Date.now(), took = () => ' (' + ((Date.now() - T0) / 1000).toFixed(0) + ' s)';
const STAGE = 0x03B1, LIVES = 0x03B3, BOSS_ON = 0x024C;
const events = r => [r[LIVES], r[STAGE], r[BOSS_ON]].join(',');
const place = r => [r[0x1B], r[0x1C], r[0x0181], r[0x60]].join(',');
// the test player's stick and keys, as it chose them on the C64, given to the page
const KEYN = Object.fromEntries(Object.entries(lib.KEY).map(([k, v]) => [v, k]));
function give(rt, m) { rt.input.joy = m.joy; rt.input.keys = new Set([...m.keys].map(k => KEYN[k])); }
// the page's view for the test player when it plays the page alone
const view = rt => ({ ram: rt.M, keys: { add: k => rt.input.keys.add(KEYN[k]), delete: k => rt.input.keys.delete(KEYN[k]) }, set joy(v) { rt.input.joy = v; } });

// ---- the memory the page carries, beside the whole memory: the same game
{
  const whole = lib.boot().save();
  const a = GBPage.create({ data, cost }), b = GBPage.create({ data, cost });
  b.restore(whole, p => p.main());
  const L = g.json('listing.json'), code = new Uint8Array(65536);
  for (const r of L.records) if (r.t === 'code') for (let i = 0; i < r.b.length; i++) code[r.a + i] = 1;
  const pa = lib.bot(5), pb = lib.bot(5), va = view(a), vb = view(b);
  let first = -1;
  for (let f = 0; f < 2000 && first < 0; f++) {
    pa(va); pb(vb);
    a.runFrame(); b.runFrame();
    for (let x = 2; x < 65536; x++) if (!code[x] && (x < 0x100 || x > 0x1FF) && a.M[x] !== b.M[x]) { first = f; fail('frame ' + f + ': $' + x.toString(16) + ' is ' + a.M[x] + ' on the memory the page carries, ' + b.M[x] + ' on the whole'); break; }
  }
  if (first < 0) console.log('the memory the page carries: 2,000 frames from the start-up as the whole memory plays them' + took());
}

// The page and the C64 side by side from a moment, frame by frame, the C64's test player choosing
// the stick: the C64's memory as each frame begins, beside the page's frame's (what the page draws
// it from), and the changes in what each frame shows. A frame here is the clock's (19,656 cycles).
function beside(m, rt, frames, play, each) {
  const n0 = Math.floor(m.cpu.cycles / FRAME), A = [], B = [];
  let la = null, lb = null;
  for (let f = 1; f <= frames; f++) {
    play(m); give(rt, m);
    const n = n0 + f, at = n * FRAME;
    rt.runUntil(at);
    m.runCycles(at - m.cpu.cycles);
    const F = rt.frameAt(n);
    if (!F || F.frame !== n) throw new Error('the page kept no frame ' + n);
    const ka = events(F.mem), kb = events(m.ram);
    if (ka !== la) { A.push([f, ka]); la = ka; }
    if (kb !== lb) { B.push([f, kb]); lb = kb; }
    if (each) each(f, F.mem, m.ram);
  }
  return { A, B };
}
// The C64's changes beside the page's, each of lives, stage and fight on its own: the same values
// in order, each within two frames. A fight begun and ended within one pass shows on a frame's
// memory on one side only, where the pass spans the frame's start: left out.
function changes(E, k) {
  const out = [];
  for (const [f, v] of E) { const x = v.split(',')[k]; if (!out.length || out[out.length - 1][1] !== x) out.push([f, x]); }
  for (let i = 1; i + 1 < out.length; i++) if (out[i + 1][0] === out[i][0] + 1 && out[i + 1][1] === out[i - 1][1]) { out.splice(i, 2); i--; }
  for (let i = 1; i < out.length; i++) if (out[i][1] === out[i - 1][1]) { out.splice(i, 1); i--; }
  return out.slice(1);
}
function sameEvents(what, r) {
  let n = 0;
  for (const [k, name] of [[0, 'lives'], [1, 'stage'], [2, 'fight']]) {
    const a = changes(r.A, k), b = changes(r.B, k);
    const show = E => E.map(e => e[0] + ':' + e[1]).join(' ');
    if (a.map(e => e[1]).join(' ') !== b.map(e => e[1]).join(' ')) { fail(what + ': ' + name + ' on the page ' + show(a) + ', on the C64 ' + show(b)); return false; }
    const off = a.map((e, i) => e[0] - b[i][0]);
    if (off.some(o => Math.abs(o) > 2)) { fail(what + ': ' + name + ' on the page ' + off.join(', ') + ' frames from the C64'); return false; }
    n += a.length;
  }
  return n;
}

// ---- from the start-up: the title page, the intro and the first stage, with its first lives lost
{
  const m = lib.boot(), rt = GBPage.create({ data, cost });
  let pageFirst = -1, c64First = -1;
  const ml = rt.P.main_loop;
  rt.P.main_loop = function* () { if (pageFirst < 0) pageFirst = rt.frame; return yield* ml.apply(this, arguments); };
  m.onPass = mm => { if (c64First < 0) c64First = Math.floor(mm.cpu.cycles / FRAME); return false; };
  const r = beside(m, rt, 1300, lib.bot(5));
  if (c64First < 0) fail('from the start-up: the C64 never reaches the main loop in 1,300 frames');
  else if (pageFirst < 0 || Math.abs(pageFirst - c64First) > 2) fail('from the start-up: the main loop\'s first pass on the page on frame ' + pageFirst + ', on the C64 on ' + c64First);
  else {
    const n = sameEvents('from the start-up', r);
    if (n !== false) console.log('from the start-up: the main loop\'s first pass ' + (pageFirst - c64First) + ' frames from the C64 (frame ' + c64First + '), and ' + n + ' lives lost on its frames' + took());
  }
}

// ---- moments of play through the four stages, made on the C64 as gen-states.js makes them
{
  const GOD = [0x0C21, 0x3C76], EVERY = 2500, UNTIL = 37500, HOLD = 400;
  const m = lib.boot(), play = lib.bot(7);
  const orig = GOD.map(a => m.ram[a]);
  for (const a of GOD) m.ram[a] = 0x60;
  const moments = [];
  for (let f = 0; f <= UNTIL; f++) {
    if (m.ram[LIVES] < 3) m.ram[LIVES] = 3;
    play(m);
    m.runFrames(1);
    if (f >= EVERY && f % EVERY === 0) {
      const c = lib.restore(m.save());
      c.onPass = () => true;
      if (!c.runUntilPass(() => true, 600)) continue;
      GOD.forEach((a, i) => { c.ram[a] = orig[i]; });
      moments.push([f, c.save()]);
    }
  }
  const NAMES = ['the Missile Base', 'the Harbour', 'the Bridge', 'the Prison Camp'];
  let held = 0, evs = 0, leaks = 0;
  const stages = new Set();
  for (const [f, s] of moments) {
    const c = lib.restore(s), rt = GBPage.create({ data, cost });
    rt.restore(s, p => p.resume());
    const here = NAMES[c.ram[STAGE]] + (c.ram[BOSS_ON] ? '\'s fight' : '');
    const what = 'the moment at frame ' + f + ', ' + here;
    stages.add(here);
    // the stack pointer at each pass of the C64's main loop, against the bytes the page counts
    let sp = s.cpu.sp;
    c.onPass = cc => { sp = cc.cpu.sp; return false; };
    const PA = [], PB = [];
    let r;
    try { r = beside(c, rt, HOLD, lib.bot(7919 + f), (k, a, b) => { PA.push(place(a)); PB.push(place(b)); }); }
    catch (e) { fail(what + ': ' + e.message); continue; }
    let run = 0, lasting = -1;
    for (let k = 0; k < PA.length; k++) {
      if (PA[k] !== PB[k] && PA[k] !== PB[k - 1] && PA[k] !== PB[k + 1]) { if (++run > 3 && lasting < 0) lasting = k - 3; } else run = 0;
    }
    let ok = true;
    if (lasting >= 0) { fail(what + ': the hero\'s place apart from the C64\'s from frame ' + lasting); ok = false; }
    const n = sameEvents(what, r);
    if (n === false) ok = false; else evs += n;
    const left = s.cpu.sp - sp;
    if (left !== rt.P.leak) { fail(what + ': the C64\'s stack has ' + left + ' bytes left on it by deaths in the fights and Bridges won, the page counts ' + rt.P.leak); ok = false; }
    leaks += left;
    if (ok) held++;
  }
  console.log(held + ' of ' + moments.length + ' moments of play (' + [...stages].join(', ') + ') held for ' + HOLD + ' frames: the hero in step, ' + evs + ' lives, stages and fights on the C64\'s frames, ' + leaks + ' bytes left on the stack by deaths in the fights and Bridges won, as the page counts them' + took());
}

// ---- the page alone, from the start-up: no frame throws, the status band once a frame, the clock
// keeps to the frames shown, and the playfield as drawn moves only as the game scrolls it
{
  const N = 6000, DRAW = 3000, rt = GBPage.create({ data, cost }), play = lib.bot(11), v = view(rt);
  let threw = null, bands = 0, inPlay = false, drawn = 0, moved = 0, jumps = 0, ahead = 0;
  const rs = rt.P.irq_status;
  rt.P.irq_status = function () { bands++; return rs.apply(this, arguments); };
  // the frame each part of the program was last entered on: the main loop, or a death, a stage's
  // end and start, a fight, or a new game, which draw the screen afresh
  let entered = 0;
  for (const name of ['main_loop', 'lose_life', 'stage_complete', 'stage_start', 'new_game', 'stage_end_dispatch']) {
    const f = rt.P[name];
    rt.P[name] = function* () { inPlay = name === 'main_loop'; entered = rt.frame; return yield* f.apply(this, arguments); };
  }
  let prev = null;
  for (let f = 0; f < N && !threw; f++) {
    play(v);
    let F;
    try { F = rt.runFrame(); } catch (e) { threw = e; fail('the page alone, frame ' + rt.shown + ': ' + e.message); break; }
    ahead = Math.max(ahead, rt.t / FRAME - (rt.shown + 1));
    if (f >= DRAW) continue;
    // the playfield, every third of raster lines 76-243, as play.html draws it
    const steady = inPlay && entered < F.frame - 1;
    const p = C64.renderFrame(F).px, rows = [];
    for (let y = 60; y < 228; y += 3) rows.push(p.subarray(y * 384 + 40, y * 384 + 344).slice());
    if (prev && steady) {
      let best = 0, bestErr = Infinity, still = 0;
      for (let d = -16; d <= 16; d++) {
        let err = 0;
        for (let i = 0; i < rows.length && (d === 0 || err < bestErr); i++) for (let x = 20; x < 284; x++) if (rows[i][x] !== prev[i][x + d]) err++;
        if (d === 0) still = err;
        if (err < bestErr) { bestErr = err; best = d; }
      }
      drawn++;
      if (best > 0) moved++;
      if ((best < 0 || best > 2) && bestErr < still) { jumps++; if (jumps <= 3) fail('the page alone, frame ' + F.frame + ': the playfield moves ' + (best < 0 ? -best + ' pixels right' : best + ' pixels left') + ' from the frame before'); }
    }
    prev = steady ? rows : null;
  }
  if (Math.abs(bands - N) > N / 50) fail(bands + ' status bands in ' + N + ' frames');
  if (ahead > 40) fail('the clock ' + ahead.toFixed(1) + ' frames ahead of the frame shown');
  if (!drawn || !moved) fail('the page alone: the playfield never scrolled in ' + DRAW + ' frames');
  if (!threw) console.log(N + ' frames of the page alone, none threw; ' + bands + ' status bands; the clock at most ' + ahead.toFixed(1) +
    ' frames ahead; the playfield drawn ' + drawn + ' times in play, moving left on ' + moved + (jumps ? '' : ', never further than two pixels or right') + took());
}
if (CRASH !== 46) fail('play.html stops the game at ' + CRASH + ' bytes on the stack, where the C64 crashes at 46 (23 deaths in the fights or Bridges won)');
console.log(fails ? 'FAIL: ' + fails : 'ok');
process.exitCode = fails ? 1 : 0;
