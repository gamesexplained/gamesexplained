#!/usr/bin/env node
'use strict';
// The Play tab's Fast CPU (site/lib/fast-cpu.js, with Space Rogue's table, port/page/fast-table.js)
// as the page runs it, in node on the data the page carries. A machine goes from power-on to the
// cockpit as Skip to the cockpit does and is kept where a pass of flight starts (rt.snapshot); each
// part starts from there. A refresh is FastCPU.run for the real time since the last, as the page's
// tick calls it. The beat is the C64's video frame (line 60, just after the interrupt) and the pace
// follows the C64's, held to the game's own three frames a pass: a shadow pass is the frames one of
// the C64's passes would take for the work the last pass did, and each pass of Fast CPU's takes its
// share of that pass's steps.
// - off means off: loaded but off, it changes nothing: the machine is the same, byte for byte and
//   cycle for cycle, as one without it, every 25 of 1,500 C64 video frames of flight on the stick;
//   off again after a spell on, the port has the game's own plug-in points back;
// - the frame limiter: no beat starts more than one pass, every pass starts at line 60 of a frame,
//   no refresh runs more than the cap, and the time past the cap is dropped;
// - same stick, same game: 1,500 passes of planned stick moves leave the same memory every 25 at
//   50, 60 and 144 refreshes a second, 4 to 40 ms apart, and at a refresh each quarter second;
// - the clock: 20 s of flight with Fast CPU on and off take the same video frames, to within one;
// - whole steps: flying straight, each shadow pass moves the ship exactly as far as one of the
//   C64's passes, its velocity;
// - glide: every ship and missile that moves, moves on every pass of Fast CPU's, not once a shadow
//   pass, and a turn of the stick turns the view on every pass;
// - once a pass: every byte of the game's state (what a save keeps, $0403-$0801) that changes only
//   on a shadow pass's first pass, in at least a quarter of them, is one listed as meant to;
// - the pace: 20 s of flight cover the game's planned 16.7 passes a second, 50.12 / 3, to within
//   0.5 %, never fewer than the C64's own, at its velocity each;
// - the beam: the player's beam, fired with the stick, is drawn on each pass of the rest of its
//   shadow pass, before the buffer goes on show, as the C64 shows it until its pass's drawing ends;
// - the keys: a turn of the stick and the view key show sooner than on the C64 (measured);
// - away: Navigation Control, opened from flight, runs in the C64's time with the game's own
//   plug-in points, and COCKPIT on its menu brings back Fast CPU's passes;
// - three minutes of random flight, at random refresh intervals, with Fast CPU switched now and
//   then and the view and target keys pressed, throw nothing;
// - no frame behind: after each refresh that ran a pass, the machine is parked at that pass's end,
//   and the screen shown (rt.fastFrame) is the buffer its flip put up.
// With the moments the port's tests save in work/states (a contributor's, port/test/lib.js), the
// cap: in each fight the C64 falls behind and Fast CPU keeps 16.7, no shadow pass longer than three.
//   node games/c64/space-rogue/test_fast.js [part: off, limiter, same, clock, whole, glide, once,
//     pace, beam, keys, away, random, behind, cap]
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64');
g.lib('fast-cpu');
const PAGE = 'play.html', page = g.read(PAGE);
if (!page.includes('<script src="../../lib/fast-cpu.js"></script>')) { console.log('FAIL: play.html does not load ../../lib/fast-cpu.js'); process.exit(1); }
if (!page.includes('data-act="fast"')) { console.log('FAIL: play.html has no Fast CPU button'); process.exit(1); }
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
if (!blocks.includes('port/page/fast-table.js')) { console.log('FAIL: play.html has no port/page/fast-table.js'); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'SRPort');
const { SRPage, FastCPU, SR_FAST: T, C64 } = globalThis;
const cost = JSON.parse(/^window\.SR_COST = (.*);$/m.exec(page)[1]);
const disk = JSON.parse(/<script type="application\/json" id="sr-disk">([^<]*)<\/script>/.exec(page)[1]);
const b64 = s => Uint8Array.from(Buffer.from(s, 'base64'));
const FRAME = SRPage.FRAME, HZ = 985248, FRAME_MS = 1000 * FRAME / HZ, BEAT = 60 * 63;

const ONLY = process.argv[2] || '', part = name => !ONLY || ONLY === name;
let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const hash = rt => crypto.createHash('md5').update(rt.M).update(rt.colour).digest('hex') + ':' + rt.t;
let seed = 0x2545F491;
const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;
const STICK = [0, UP, DOWN, LEFT, RIGHT, UP | LEFT, DOWN | RIGHT, 0];
// a slot's position and velocity, three 24-bit numbers each (src/g-objects.js)
const s24 = (M, a) => ((M[a] | M[a + 1] << 8 | M[a + 2] << 16) << 8) >> 8;
const vec = (M, a) => [s24(M, a), s24(M, a + 3), s24(M, a + 6)];
const pos = (M, x) => vec(M, 0x065D + 9 * x), vel = (M, x) => vec(M, 0x0545 + 9 * x);
const rows = M => M.slice(0x044B, 0x044B + 27).join(',');

function bare() {
  const files = {}, sectors = {};
  for (const [k, v] of Object.entries(disk.files)) files[k] = b64(v);
  for (const [k, v] of Object.entries(disk.sectors)) sectors[k] = b64(v);
  return SRPage.create({ disk: { files, sectors }, cost });
}
// The cockpit, as Skip to the cockpit reaches it, then a second of cruising, kept where a pass
// starts: the start every part restores
function cockpit() {
  const rt = bare();
  const name = 'ROGUE', script = [[150, 'SPACE', 8], [400, 'N', 20]];
  name.split('').forEach((c, i) => script.push([500 + i * 15, c, 8]));
  script.push([500 + name.length * 15 + 40, 'RETURN', 10]);
  for (let f = 0, story = 0; ; f++) {
    for (const [at, k, d] of script) { if (f === at) rt.input.keys.add(k); if (f === at + d) rt.input.keys.delete(k); }
    if (rt.program === 'intro' && f > script[script.length - 1][0] + 60) {
      if (f % 120 === 0) rt.input.keys.add('SPACE'); else if (f % 120 === 8) rt.input.keys.delete('SPACE');
    }
    rt.runFrame();
    if (rt.program === 'main' && ++story > 50) { rt.input.keys.clear(); break; }
    if (f > 20000) throw new Error('the story did not end');
  }
  for (let i = 0; i < 50; i++) rt.runFrame();
  const fx = FastCPU.attach(rt.fast, T);
  FastCPU.set(fx, true);
  let guard = 0;
  while (!rt.parked && ++guard < 100) FastCPU.run(fx, FRAME_MS);
  if (!rt.parked) throw new Error('Fast CPU never parked at a pass of flight');
  return rt.snapshot();
}
const STATES = path.join(__dirname, 'work/states');
const START = cockpit();
// the page's machine at the start (or a saved moment), Fast CPU loaded and off, as the page loads
// it, unless bare
function machine(opts = {}) {
  const rt = bare();
  const s = opts.moment ? JSON.parse(fs.readFileSync(path.join(STATES, opts.moment + '.json'), 'utf8')).machine : START;
  rt.restore(s, P => P.main_loop());
  const fx = opts.bare ? null : FastCPU.attach(rt.fast, T);
  const M = rt.M, P = rt.fast.P;
  const press = (joy = 0, keys = []) => { rt.input.joy = 0x1F & ~joy; rt.input.keys = new Set(keys); };
  // C64 frames, or refreshes ms apart, for secs of real time with the stick and keys held
  const frames = (secs, joy, keys, each) => { press(joy, keys); for (let i = 0, n = Math.round(secs / FRAME_MS * 1000); i < n; i++) { rt.runFrame(); if (each) each(); } press(); };
  const refresh = (secs, joy, keys, ms = 1000 / 60, each) => {
    press(joy, keys);
    for (let i = 0, n = Math.round(secs * 1000 / ms); i < n; i++) { const l = FastCPU.run(fx, ms); if (each) each(l); }
    press();
  };
  return { rt, M, P, fx, press, frames, refresh };
}
// the C64's passes: frame_skip3 is called once each
function passCounter(P) {
  const c = { n: 0 }, f = P.frame_skip3;
  P.frame_skip3 = function (r) { c.n++; return f.call(this, r); };
  return c;
}

// --- off means off ----------------------------------------------------------------------------
if (part('off')) {
  const a = machine({ bare: true }), b = machine();
  let differ = 0, f = 0, joy = 0;
  for (; f < 1500; f++) {
    if (f % 40 === 0) joy = STICK[rnd(STICK.length)];
    a.press(joy); b.press(joy);
    a.rt.runFrame(); b.rt.runFrame();
    if (f % 25 === 24 && hash(a.rt) !== hash(b.rt)) { if (!differ++) fail('loaded and off, the machine differs from one without Fast CPU at frame', f + 1); }
  }
  const own = b.P.plug;
  FastCPU.set(b.fx, true);
  b.refresh(2, LEFT);
  FastCPU.set(b.fx, false);
  if (b.P.plug !== own) fail('off again, the port does not have its own plug-in points back');
  const t0 = b.rt.t; b.rt.runFrame();
  if (b.rt.t - t0 < FRAME - 63) fail('off again, a frame of the C64 does not run a frame of time');
  console.log(`off: ${f} frames of flight on the stick loaded and off, ${differ ? 'differing' : 'the same as without Fast CPU'} every 25; off again after a spell on, the game's own plug-in points`);
}

// --- the frame limiter --------------------------------------------------------------------------
if (part('limiter')) {
  const m = machine();
  FastCPU.set(m.fx, true);
  const b0 = m.fx.loop.begin;
  let offBeat = 0, starts = 0;
  m.fx.loop.begin = () => { starts++; if ((m.rt.t - BEAT) % FRAME !== 0) offBeat++; b0(); };
  const t0 = m.rt.t, k0 = m.rt.ticks;
  let most = 0, loops = 0;
  m.refresh(10, UP | LEFT, [], 1000 / 60, l => { loops += l; most = Math.max(most, l); });
  const beats = Math.round((m.rt.t - t0) / FRAME);
  if (m.rt.ticks - k0 !== loops || starts !== loops) fail('beats and passes differ:', m.rt.ticks - k0, 'beats', loops, 'passes', starts, 'starts');
  if (loops > beats + 1) fail(loops, 'passes in', beats, 'video frames: a beat started two');
  if (loops < beats - 1) fail('only', loops, 'passes in', beats, 'video frames of 10 s of flight');
  if (most > T.cap) fail('a 60 Hz refresh ran', most, 'passes, over the cap of', T.cap);
  if (offBeat) fail(offBeat, 'of', loops, 'passes started off line 60');
  // a refresh each quarter second runs the cap and drops the rest
  let over = 0;
  const t1 = m.rt.t;
  m.refresh(5, UP, [], 250, l => { if (l > T.cap) over++; });
  if (over) fail(over, 'refreshes of 250 ms ran more than the cap');
  const ran = (m.rt.t - t1) / HZ;
  if (ran > 5 * (T.cap + 1) * FRAME_MS / 250) fail(`5 s of quarter-second refreshes ran ${ran.toFixed(2)} s of the C64's time: the time past the cap was not dropped`);
  console.log(`limiter: ${loops} passes in ${beats} video frames at 60 Hz, at most ${most} a refresh, ${offBeat} off line 60; ` +
              `quarter-second refreshes run ${T.cap} passes and ${ran.toFixed(2)} s of the C64's time in 5 s`);
}

// --- same stick, same game ----------------------------------------------------------------------
if (part('same')) {
  const LOOPS = 1500;
  const plan = [];
  seed = 0x1234567;
  for (let i = 0, joy = 0; i < LOOPS; i++) { if (rnd(10) === 0) joy = STICK[rnd(STICK.length)]; plan.push(0x1F & ~joy); }
  const runs = [['60 Hz', () => 1000 / 60], ['50 Hz', () => 20], ['144 Hz', () => 1000 / 144],
    ['4-40 ms', () => 4 + rnd(37)], ['250 ms', () => 250]];
  const got = [];
  for (const [name, gap] of runs) {
    const m = machine();
    FastCPU.set(m.fx, true);
    let n = 0, guard = 0;
    const marks = [];
    m.rt.input.joy = plan[0];
    const between = () => { n++; if (n % 25 === 0) marks.push(hash(m.rt)); if (n < LOOPS) m.rt.input.joy = plan[n]; };
    seed = 0x9E3779B9;
    while (n < LOOPS && ++guard < 1e6) FastCPU.run(m.fx, gap(), between);
    got.push([name, marks]);
  }
  const [base, ref] = got[0];
  for (const [name, marks] of got.slice(1)) {
    const at = marks.findIndex((h, i) => h !== ref[i]);
    if (at >= 0 || marks.length !== ref.length) fail(`${name} refreshes differ from ${base} at pass ${(at + 1) * 25}`);
  }
  console.log(`same: ${LOOPS} passes of planned stick moves give the same memory every 25 passes at ${got.map(x => x[0]).join(', ')}`);
}

// --- the clock --------------------------------------------------------------------------------
if (part('clock')) {
  const a = machine(), b = machine();
  FastCPU.set(b.fx, true);
  const f0 = a.rt.frame;
  a.frames(20, UP | LEFT); b.refresh(20, UP | LEFT, [], 1000 / 60);
  const fa = a.rt.frame - f0, fb = b.rt.frame - f0;
  if (Math.abs(fa - fb) > 1) fail(`${fa} video frames off and ${fb} on`);
  console.log(`clock: 20 s of flight take ${fa} video frames with Fast CPU off and ${fb} on`);
}

// --- whole steps --------------------------------------------------------------------------------
if (part('whole')) {
  const m = machine(), { M, fx } = m;
  FastCPU.set(fx, true);
  m.refresh(1, 0);
  let last = null, n = 0, off = 0, first = null;
  const b0 = fx.loop.begin;
  fx.loop.begin = () => {
    b0();
    if (!fx.first) return;
    const p = pos(M, 0), v = vel(M, 0);
    if (last && last.K === fx.K) {
      n++;
      const d = p.map((x, i) => (x - last.p[i]) << 8 >> 8);
      if (d.some((x, i) => x !== last.v[i])) { if (!off++) first = `moved ${d.join(',')} for a velocity of ${last.v.join(',')}`; }
    }
    last = { p, v, K: fx.K };
  };
  m.refresh(6, 0);
  if (!n) fail('whole: no two shadow passes of the same length');
  if (!vel(M, 0).some(x => x)) fail('whole: the ship stood still');
  if (off) fail(`whole: ${off} of ${n} shadow passes moved the ship other than by its velocity: ${first}`);
  console.log(`whole: flying straight, ${n - off} of ${n} shadow passes of ${fx.K} passes each move the ship by its velocity, one of the C64's passes' step`);
}

// --- glide --------------------------------------------------------------------------------------
if (part('glide')) {
  const m = machine(), { M, fx } = m;
  FastCPU.set(fx, true);
  m.refresh(1, 0);
  let could = 0, still = 0, turns = 0, stuck = 0, prev = null;
  const between = () => {
    const now = { p: [], r: rows(M), on: [] };
    for (let x = 0; x < 0x14; x++) { now.on.push(M[0x05F9 + x]); now.p.push(pos(M, x)); }
    if (prev) {
      for (let x = 0; x < 0x14; x++) {
        // a slot in use on both passes, of a moving type (flag bit 4), fast enough for a share
        if (!now.on[x] || !prev.on[x] || !(M[0x08D5 + M[0x060D + x]] & 0x10)) continue;
        const v = vel(M, x);
        if (Math.max(...v.map(Math.abs)) < 3 * fx.K) continue;
        could++;
        if (now.p[x].every((c, i) => c === prev.p[x][i])) still++;
      }
      // the player's turn rate, in 1,024ths of a turn a C64 pass: at least one a pass when it is K
      if (Math.abs((M[0x0516] << 24) >> 24) >= fx.K) { turns++; if (now.r === prev.r) stuck++; }
    }
    prev = now;
  };
  for (const joy of [LEFT, LEFT | UP, RIGHT, 0, DOWN]) { m.press(joy); for (let i = 0; i < 180; i++) FastCPU.run(fx, 1000 / 60, between); }
  m.press();
  if (!could) fail('glide: nothing moved');
  if (still) fail(`glide: ${still} of ${could} times a moving object stood still for a pass`);
  if (!turns) fail('glide: the stick never turned the ship');
  if (stuck) fail(`glide: ${stuck} of ${turns} passes turning on the stick left the view where it was`);
  console.log(`glide: moving objects moved on all ${could - still} of ${could} passes; turning on the stick, the view turned on ${turns - stuck} of ${turns}`);
}

// --- once a pass ---------------------------------------------------------------------------------
// A byte of the game's state that changes only on the first pass of a shadow pass is set once one
// of the C64's passes. That is meant for what counts passes; anything that moves on screen would
// step once a pass while the rest glides. Each range that does is listed here, with why; a byte
// outside them fails
const MEANT = {
  "the computer ships' minds, every 17th pass, and the count after a ram ($0403-$0426)": [0x0403, 0x0426],
  "the turn rates: a computer ship's, set by its mind and counted down a step a pass, and the player's, from the stick eased toward where it is held ($0508-$051C)": [0x0508, 0x051C],
  "the lifetimes, counted down in the armour of missiles, explosions and debris ($051D-$0544)": [0x051D, 0x0544],
  "the slots, as a ship's mind launches a missile or a lifetime ends ($05F9-$065C)": [0x05F9, 0x065C],
};
const meant = a => Object.values(MEANT).some(([lo, hi]) => a >= lo && a <= hi);
const listOnce = (m, secs, found, keys) => {
  const { M, fx } = m;
  const first = new Uint32Array(0x0802), later = new Uint32Array(0x0802), prev = M.slice(0, 0x0802);
  let shadows = 0;
  const between = () => {
    if (fx.K >= 2) {
      const f = fx.first;
      if (f) shadows++;
      for (let a = 0x0403; a < 0x0802; a++) if (M[a] !== prev[a]) (f ? first : later)[a]++;
    }
    prev.set(M.subarray(0, 0x0802));
  };
  const STICKS = [0, UP, DOWN, LEFT, RIGHT, UP | LEFT, DOWN | RIGHT, FIRE, LEFT | FIRE];
  for (let i = 0, n = 60 * secs; i < n; i++) {
    if (i % 20 === 0) { m.rt.input.joy = 0x1F & ~STICKS[rnd(STICKS.length)]; m.rt.input.keys = new Set(keys && rnd(8) === 0 ? [keys[rnd(keys.length)]] : []); }
    FastCPU.run(fx, 1000 / 60, between);
  }
  m.press();
  for (let a = 0x0403; a < 0x0802; a++) if (first[a] >= shadows / 4 && !later[a]) found.set(a, (found.get(a) || 0) + first[a]);
  return shadows;
};
if (part('once')) {
  const found = new Map();
  seed = 12345;
  const m = machine();
  FastCPU.set(m.fx, true);
  m.refresh(1, 0);
  let shadows = listOnce(m, 40, found, ['A', 'D', 'W', 'X', 'C', 'Z', '+', '-']);
  const moments = fs.existsSync(STATES) ? fs.readdirSync(STATES).filter(f => /^flight-fight-0[1-4]\.json$/.test(f)).map(f => f.slice(0, -5)) : [];
  for (const moment of moments) {
    const f = machine({ moment });
    FastCPU.set(f.fx, true);
    f.refresh(1, 0);
    shadows += listOnce(f, 20, found);
  }
  const hex = a => '$' + a.toString(16).toUpperCase().padStart(4, '0');
  const stray = [...found.keys()].filter(a => !meant(a));
  if (stray.length) fail(`set only on a shadow pass's first pass, and not listed as meant: ${stray.map(hex).join(' ')}`);
  console.log(`once: in ${shadows} shadow passes of flight${moments.length ? ' and ' + moments.length + ' fights' : ''}, ${found.size} bytes of the game's state change only on a shadow pass's first pass, ${stray.length ? stray.length + ' not listed' : 'each in a range listed as meant'}`);
}

// --- the pace -----------------------------------------------------------------------------------
if (part('pace')) {
  const run = fast => {
    const m = machine(), passes = passCounter(m.P);
    m.frames(3, 0);                                 // up to the speed set
    if (fast) { FastCPU.set(m.fx, true); m.refresh(0.2, 0); }
    const p0 = pos(m.M, 0), s0 = fast ? m.fx.shadow : passes.n, f0 = m.rt.frame;
    if (fast) m.refresh(20, 0); else m.frames(20, 0);
    const p1 = pos(m.M, 0), v = vel(m.M, 0);
    const d = Math.hypot(...p1.map((x, i) => (x - p0[i]) << 8 >> 8)), step = Math.hypot(...v);
    return { rate: ((fast ? m.fx.shadow : passes.n) - s0) / (m.rt.frame - f0) * 50.12, d, step };
  };
  const a = run(false), b = run(true), want = 50.12 / T.most;
  if (Math.abs(b.rate - want) > 0.005 * want) fail(`pace: Fast CPU ${b.rate.toFixed(2)} of the C64's passes a second, not the game's ${want.toFixed(2)}`);
  if (b.rate < a.rate * 0.995) fail(`pace: Fast CPU ${b.rate.toFixed(2)} passes a second, slower than the C64's ${a.rate.toFixed(2)}`);
  const per = b.d / (b.rate * 20);
  if (Math.abs(per - b.step) > 0.005 * b.step) fail(`pace: Fast CPU moved ${per.toFixed(0)} a shadow pass for a velocity of ${b.step.toFixed(0)}`);
  console.log(`pace: 20 s of flight, the C64 ${a.rate.toFixed(2)} passes a second over ${(a.d / 256).toFixed(0)} units, Fast CPU ${b.rate.toFixed(2)} (the game's ${want.toFixed(2)}) over ${(b.d / 256).toFixed(0)}, ${(per / 256).toFixed(2)} units a shadow pass at a velocity of ${(b.step / 256).toFixed(2)}`);
}

// --- the beam ------------------------------------------------------------------------------------
if (part('beam')) {
  const m = machine(), { M, P, fx } = m;
  FastCPU.set(fx, true);
  m.refresh(1, 0);
  // each fire of the player's beam, and on which passes of its shadow pass the guns are drawn: the
  // drawing through the plug-in point shown, made again at again($0E1C), before the flip
  let fires = 0, short = 0, late = 0, drawnLoops = 0, cur = null;
  const s0 = fx.plug.shown, a0 = fx.plug.again;
  fx.plug.shown = (at, draw, mine) => {
    if (mine) { fires++; cur = { left: fx.left, n: 0 }; const d = draw; draw = () => { if (flipped) late++; cur.n++; drawnLoops++; d(); }; }
    return s0(at, draw, mine);
  };
  let flipped = false;
  fx.plug.again = at => { flipped = false; return a0(at); };
  const f0 = P.flip_buffers;
  P.flip_buffers = function (r) { flipped = true; return f0.call(this, r); };
  const between = () => { if (cur && fx.left === 0) { if (cur.n !== cur.left + 1) short++; cur = null; } };
  if (M[0x0D3C]) fail('beam: not in the cockpit view');
  for (let i = 0; i < 8; i++) { m.refresh(0.2, FIRE, [], 1000 / 60, between); m.refresh(1.3, 0, [], 1000 / 60, between); }
  if (!fires) fail('beam: the stick fired no beam');
  if (short) fail(`beam: ${short} of ${fires} beams were not drawn on every pass left in their shadow pass`);
  if (late) fail(`beam: drawn ${late} times after the flip`);
  console.log(`beam: ${fires} beams fired with the stick, each drawn on the ${drawnLoops / Math.max(1, fires)} passes left in its shadow pass, before the flip that shows them`);
}

// --- the keys ------------------------------------------------------------------------------------
// From a press, the time until the screen shows it: until the end of the frame (the C64) or the
// refresh (Fast CPU) in which the first flip after the view has turned (the stick) or changed (V)
// came, each of them the page's next drawing
if (part('keys')) {
  const delay = (fast, what) => {
    const m = machine(), { M, P, fx, rt } = m;
    if (fast) { FastCPU.set(fx, true); m.refresh(0.5, 0); } else m.frames(0.5, 0);
    let flips = [];
    const f0 = P.flip_buffers;
    P.flip_buffers = function (r) { flips.push({ t: rt.t, r: rows(M), v: M[0x0D3C] }); return f0.call(this, r); };
    const out = [];
    seed = 99;
    for (let i = 0; i < 12; i++) {
      const wait = 0.7 + rnd(40) / 100;
      if (fast) m.refresh(wait, 0); else m.frames(wait, 0);
      flips = [];
      const r0 = rows(M), v0 = M[0x0D3C], t0 = rt.target;
      const joy = what === 'stick' ? LEFT : 0, keys = what === 'stick' ? [] : ['V'];
      for (let k = 0; k < 40; k++) {
        if (fast) m.refresh(1000 / 60 / 1000, joy, keys); else m.frames(FRAME_MS / 1000, joy, keys);
        const f = flips.find(x => (what === 'stick' ? x.r !== r0 : x.v !== v0));
        if (f) { out.push((rt.target - t0) / HZ * 1000); break; }
      }
      if (fast) m.refresh(0.5, 0); else m.frames(0.5, 0);
      if (what === 'stick') { if (fast) m.refresh(0.4, RIGHT); else m.frames(0.4, RIGHT); }
    }
    return out.length ? out.reduce((a, b) => a + b, 0) / out.length : NaN;
  };
  const res = {};
  for (const what of ['stick', 'view']) {
    const a = delay(false, what), b = delay(true, what);
    if (!(b < a)) fail(`keys: the ${what} shows after ${b.toFixed(0)} ms with Fast CPU and ${a.toFixed(0)} ms on the C64`);
    res[what] = `${a.toFixed(0)} ms on the C64, ${b.toFixed(0)} ms with Fast CPU`;
  }
  console.log(`keys: the stick turning the view ${res.stick}; V changing the view ${res.view}`);
}

// --- away from flight -------------------------------------------------------------------------------
// Navigation Control, opened from flight with N, runs in the C64's time with the game's plug-in
// points; COCKPIT on its menu brings flight back, in Fast CPU's passes
if (part('away')) {
  const m = machine(), { fx, P } = m, own = fx.game;
  FastCPU.set(fx, true);
  m.refresh(1, 0);
  let starts = 0, ownPlug = 0, checks = 0;
  const b0 = fx.loop.begin;
  fx.loop.begin = () => { starts++; b0(); };
  const each = () => { checks++; if (P.plug === own) ownPlug++; };
  m.refresh(0.1, 0, ['N']);
  m.refresh(0.5, 0);
  starts = 0; checks = 0; ownPlug = 0;
  m.refresh(3, 0, [], 1000 / 60, each);
  const inNav = starts, plugNav = ownPlug, navChecks = checks;
  for (let i = 0; i < 5; i++) { m.refresh(0.15, DOWN); m.refresh(0.3, 0); }
  m.refresh(0.15, FIRE); m.refresh(1, 0);
  starts = 0;
  m.refresh(3, 0);
  if (inNav) fail(`away: ${inNav} passes of flight started in 3 s of Navigation Control`);
  if (plugNav !== navChecks) fail(`away: in Navigation Control the port had Fast CPU's plug-in points at ${navChecks - plugNav} of ${navChecks} refreshes`);
  if (starts < 140) fail(`away: back in the cockpit, only ${starts} passes of Fast CPU's in 3 s`);
  console.log(`away: in Navigation Control ${inNav} passes of flight in 3 s, the game's plug-in points at ${plugNav} of ${navChecks} refreshes; back in the cockpit, ${starts} passes in 3 s`);
}

// --- random flight --------------------------------------------------------------------------------
if (part('random')) {
  seed = 0xC0FFEE;
  let secs = 0, toggles = 0, threw = 0;
  const m = machine();
  let fast = false, joy = 0;
  try {
    for (let ms = 0; ms < 180000;) {
      if (rnd(400) === 0) { fast = !fast; FastCPU.set(m.fx, fast); toggles++; }
      if (rnd(10) === 0) joy = STICK[rnd(STICK.length)] | (rnd(6) ? 0 : FIRE);
      m.press(joy, rnd(200) === 0 ? [['V', 'T', 'A', 'D', '+', '-'][rnd(6)]] : []);
      const gap = 4 + rnd(40);
      if (fast) FastCPU.run(m.fx, gap); else if (rnd(3) === 0) m.rt.runFrame();
      ms += fast ? gap : FRAME_MS / 3;
    }
    secs += 180;
  } catch (e) { threw++; fail(`random flight threw: ${e.message}`); }
  console.log(`random: ${secs} s of random flight, Fast CPU switched ${toggles} times, ${threw ? threw + ' threw' : 'nothing thrown'}, the program ${m.rt.program}`);
}

// --- no frame behind ----------------------------------------------------------------------------
if (part('behind')) {
  const m = machine(), { M, P, fx, rt } = m;
  FastCPU.set(fx, true);
  let bank = null, bad = 0, refreshes = 0, wrong = 0;
  const f0 = P.flip_buffers;
  P.flip_buffers = function (r) { const v = f0.call(this, r); bank = rt.fast.P.M[0x3A] & 0x80 ? 3 : 1; return v; };
  m.refresh(10, UP | LEFT, [], 1000 / 60, l => {
    if (!l) return;
    refreshes++;
    const F = rt.fastFrame();
    if (!rt.parked || !F) { bad++; return; }
    if (3 - ((F.cia2[0] | ~F.cia2[1]) & 3) !== bank) wrong++;
  });
  if (bad) fail(`${bad} of ${refreshes} refreshes ended away from their last pass's end`);
  if (wrong) fail(`${wrong} of ${refreshes} refreshes would show a bank other than the one the last flip put up`);
  const px = C64.renderFrame(rt.fastFrame()).px;
  if (!px.some(c => c !== px[0])) fail('behind: the frame shown is blank');
  console.log(`behind: ${refreshes - bad - wrong} of ${refreshes} refreshes end parked at their last pass's end, the bank its flip put up on show`);
}

// --- the cap, in the fights a contributor's moments hold -------------------------------------------
if (part('cap') && fs.existsSync(STATES)) {
  const out = [];
  for (const moment of fs.readdirSync(STATES).filter(f => /^flight-fight-\d+\.json$/.test(f)).map(f => f.slice(0, -5))) {
    const a = machine({ moment }), passes = passCounter(a.P), f0 = a.rt.frame;
    a.frames(10, 0);
    const c64 = passes.n / (a.rt.frame - f0) * 50.12;
    const b = machine({ moment });
    FastCPU.set(b.fx, true);
    let most = 0;
    const b0 = b.fx.loop.begin;
    b.fx.loop.begin = () => { b0(); if (b.fx.first) most = Math.max(most, b.fx.K); };
    const s0 = b.fx.shadow, g0 = b.rt.frame;
    b.refresh(10, 0);
    const fast = (b.fx.shadow - s0) / (b.rt.frame - g0) * 50.12;
    if (most > T.most) fail(`${moment}: a shadow pass took ${most} passes, more than the cap's ${T.most}`);
    if (fast < c64 * 0.995 || Math.abs(fast - 50.12 / T.most) > 0.01 * 50.12 / T.most) fail(`${moment}: Fast CPU ${fast.toFixed(2)} passes a second, the C64 ${c64.toFixed(2)}`);
    out.push(`${moment} ${c64.toFixed(1)} / ${fast.toFixed(1)}`);
  }
  console.log('cap: passes a second in each fight, the C64 / Fast CPU: ' + out.join(', '));
}

console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
