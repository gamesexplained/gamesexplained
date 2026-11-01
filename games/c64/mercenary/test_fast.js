#!/usr/bin/env node
'use strict';
// The Play tab's Fast CPU (site/lib/fast-cpu.js, with Mercenary's table in play.html's block
// "fast") as the page runs it, in node on the memory the page carries, from the crash site where
// the game hands over. A refresh is FastCPU.run for the real time since the last, as the page's
// tickFast calls it. The beat is the C64's video frame (line 224, where the C64 flips its buffers)
// and the pace follows the C64's: a shadow pass is the frames one of the C64's passes would take
// for the work the last loop did, and each loop takes its share of that pass's steps.
// - off means off: loaded but off, it changes nothing: the machine is the same, byte for byte and
//   cycle for cycle, as one without it, every 25 of 1,500 C64 video frames of random walking; off
//   again after a spell on, the port has the game's own plug-in points back;
// - the frame limiter: no beat starts more than one loop, every loop starts at line 224 of a frame,
//   no refresh runs more than the cap, and the time past the cap is dropped;
// - same keys, same game: 1,500 loops of planned stick moves leave the same memory every 25 loops
//   at 50, 60 and 144 refreshes a second, 4 to 40 ms apart, and at a refresh each quarter second;
// - the clock: 20 s of walking with Fast CPU on and off leave the game's own clock ($E2-$E4) and
//   the video frames within a frame of each other;
// - whole steps: walking straight and turning on foot, each shadow pass moves exactly as far as
//   one of the C64's passes;
// - the pace: walking and turning for 20 s on foot, and 10 s of level flight in the Dart, cover
//   the C64's distance and heading within 1 % or one of its passes' steps;
// - repeats: in the Dart, + held trims the thrust once a shadow pass, and a press of three video
//   frames trims it once;
// - stopping: on foot, a walk and a turn stop in the loop where the stick comes back;
// - three minutes of random play on foot and in the Dart, at random refresh intervals, with Fast
//   CPU switched now and then, throw nothing;
// - no frame behind: after each refresh that ran a loop, the machine is parked at that loop's end
//   and the bitmap on show ($C7) is the one its flip put up.
//   node games/c64/mercenary/test_fast.js [part: off, limiter, same, clock, whole, pace, repeats,
//     stopping, random, behind]
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('fast-cpu');
const PAGE = 'play.html', page = g.read(PAGE);
if (!page.includes('<script src="../../lib/fast-cpu.js"></script>')) { console.log('FAIL: play.html does not load ../../lib/fast-cpu.js'); process.exit(1); }
if (!page.includes('data-act="fast"')) { console.log('FAIL: play.html has no Fast CPU button'); process.exit(1); }
const { MERC_INSTALL } = g.run(PAGE, "the port: Mercenary's routines, each a function on the game's memory M, named by the listing's label", 'MERC_INSTALL');
const { makeRuntime } = g.run(PAGE, 'runtime', 'makeRuntime');
g.run(PAGE, 'modern', 'MercModern');
g.run(PAGE, 'fast', 'MERC_FAST');
const { FastCPU, MercModern, MERC_FAST: T } = globalThis;
const ui = g.block(PAGE, 'ui').text;
const ORIGINAL_7009 = /const ORIGINAL_7009 = \[([^\]]*)\]/.exec(ui)[1].split(',').map(Number);
const image = g.listing().ram;
const FRAME = 19656, HZ = 985248, FRAME_MS = 1000 * FRAME / HZ, BEAT = 224 * 63;

const ONLY = process.argv[2] || '', part = name => !ONLY || ONLY === name;
let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const hash = rt => crypto.createHash('md5').update(rt.M).update(rt.colour).digest('hex') + ':' + rt.t;
const pos = M => ({ x: M[0x72] | M[0x73] << 8 | M[0x74] << 16, y: M[0x78] | M[0x79] << 8 | M[0x7A] << 16, head: (M[0x2C] | M[0x2D] << 8) & 1023 });
const turned = (a, b) => ((b - a + 512) & 1023) - 512;   // the heading is 1,024 steps round
const s24 = v => ((v << 8) >> 8);
const dist = (a, b) => Math.hypot(s24(b.x - a.x), s24(b.y - a.y));
const clock = M => (M[0xE3] + 256 * M[0xE4]) * 50 + M[0xE2];
let seed = 0x2545F491;
const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
const STICK = [0x1F, 0x1E, 0x1B, 0x17, 0x1A, 0x16, 0x1F, 0x1E];   // none, up, left, right, up-left, up-right
const UP = 1, LEFT = 4, RIGHT = 8;

// the page's machine at the crash site, past the black flash, with the modern view and Fast CPU
// loaded (off), as the page loads them, unless bare
function machine(bare) {
  const M = image.slice();
  ORIGINAL_7009.forEach((v, i) => { M[0x7009 + i] = v; });
  const P = { M, byAddress: {} };
  for (const f of MERC_INSTALL) f(P);
  const rt = makeRuntime(P, {});
  if (!bare) rt.modern = MercModern.attach(rt);
  const fx = bare ? null : FastCPU.attach(rt, T);
  while (!rt.skipOpening(25));
  for (let i = 0; i < 160; i++) rt.runFrame();
  const press = (joy = 0, keys = []) => { rt.input.joy = 0x1F & ~joy; rt.input.keys = new Set(keys); };
  // C64 frames, or refreshes ms apart, for secs of real time with the stick and keys held
  const frames = (secs, joy, keys) => { press(joy, keys); for (let i = 0, n = Math.round(secs / FRAME_MS * 1000); i < n; i++) rt.runFrame(); press(); };
  const refresh = (secs, joy, keys, ms = 1000 / 60, each) => {
    press(joy, keys);
    for (let i = 0, n = Math.round(secs * 1000 / ms); i < n; i++) { const l = FastCPU.run(fx, ms); if (each) each(l); }
    press();
  };
  return { rt, M, P, fx, press, frames, refresh };
}
// the Dart, boarded: the player put beside object 1, B, then Y, then thrust (9) for a moment
function dart(m) {
  const { M } = m;
  M[0x72] = M[0x2881]; M[0x73] = M[0x2481]; M[0x74] = M[0x2541];
  M[0x78] = M[0x2901]; M[0x79] = (M[0x2501] + 1) & 255; M[0x7A] = M[0x25C1];
  m.frames(0.6, 0, [0x1C]); m.frames(1.2, 0);
  m.frames(0.6, 0, [0x19]); m.frames(1.2, 0);
  if (M[0xA9] !== 1) fail('the Dart was not boarded: motion mode $A9 =', M[0xA9]);
  m.frames(0.3, 0, [0x20]);
  m.frames(6, 0);
}

// --- off means off ----------------------------------------------------------------------------
if (part('off')) {
  const a = machine(true), b = machine(false);
  let differ = 0, f = 0, joy = 0x1F;
  for (; f < 1500; f++) {
    if (f % 8 === 0) joy = STICK[rnd(STICK.length)];
    a.rt.input.joy = b.rt.input.joy = joy;
    a.rt.runFrame(); b.rt.runFrame();
    if (f % 25 === 24 && hash(a.rt) !== hash(b.rt)) { if (!differ++) fail('loaded and off, the machine differs from one without Fast CPU at frame', f + 1); }
  }
  const game = b.P.plug;
  FastCPU.set(b.fx, true);
  if (b.P.plug === game) fail('on, the port still has its own plug-in points');
  b.refresh(2, UP);
  FastCPU.set(b.fx, false);
  if (b.P.plug !== game) fail('off again, the port does not have its own plug-in points back');
  const t0 = b.rt.t; b.rt.runFrame();
  if (b.rt.t - t0 < FRAME - 63) fail('off again, a frame of the C64 does not run a frame of time');
  console.log(`off: ${f} frames of random walking loaded and off, ${differ ? 'differing' : 'the same as without Fast CPU'} every 25; off again after a spell on, the game's own plug-in points`);
}

// --- the frame limiter --------------------------------------------------------------------------
if (part('limiter')) {
  const m = machine(false);
  FastCPU.set(m.fx, true);
  const b0 = m.fx.loop.begin;
  let offBeat = 0, starts = 0;
  m.fx.loop.begin = () => { starts++; if ((m.rt.t - BEAT) % FRAME !== 0) offBeat++; b0(); };
  m.refresh(0.5, UP | LEFT);                       // the pass under way when it came on ends in the C64's time
  starts = 0;
  const t0 = m.rt.t, k0 = m.rt.ticks;
  let most = 0, loops = 0;
  m.refresh(10, UP | LEFT, [], 1000 / 60, l => { loops += l; most = Math.max(most, l); });
  const beats = Math.round((m.rt.t - t0) / FRAME);
  if (m.rt.ticks - k0 !== loops || starts !== loops) fail('beats and loops differ:', m.rt.ticks - k0, 'beats', loops, 'loops', starts, 'starts');
  if (loops > beats) fail(loops, 'loops in', beats, 'video frames: a beat started two');
  if (loops < beats - 1) fail('only', loops, 'loops in', beats, 'video frames of 10 s on foot');
  if (most > T.cap) fail('a 60 Hz refresh ran', most, 'loops, over the cap of', T.cap);
  if (offBeat > loops / 100) fail(offBeat, 'of', loops, 'loops started off line 224');
  // a refresh each quarter second runs the cap and drops the rest
  let over = 0;
  const t1 = m.rt.t;
  m.refresh(5, UP, [], 250, l => { if (l > T.cap) over++; });
  if (over) fail(over, 'refreshes of 250 ms ran more than the cap');
  const ran = (m.rt.t - t1) / HZ;
  if (ran > 5 * (T.cap + 1) * FRAME_MS / 250) fail(`5 s of quarter-second refreshes ran ${ran.toFixed(2)} s of the C64's time: the time past the cap was not dropped`);
  console.log(`limiter: ${loops} loops in ${beats} video frames at 60 Hz, at most ${most} a refresh, ${offBeat} off line 224; ` +
              `quarter-second refreshes run ${T.cap} loops and ${ran.toFixed(2)} s of the C64's time in 5 s`);
}

// --- same keys, same game -----------------------------------------------------------------------
if (part('same')) {
  const LOOPS = 1500;
  const plan = [];
  seed = 0x1234567;
  for (let i = 0, joy = 0x1F; i < LOOPS; i++) { if (rnd(10) === 0) joy = STICK[rnd(STICK.length)]; plan.push(joy); }
  const runs = [['60 Hz', () => 1000 / 60], ['50 Hz', () => 20], ['144 Hz', () => 1000 / 144],
    ['4-40 ms', () => 4 + rnd(37)], ['250 ms', () => 250]];
  const got = [];
  for (const [name, gap] of runs) {
    const m = machine(false);
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
    if (at >= 0 || marks.length !== ref.length) fail(`${name} refreshes differ from ${base} at loop ${(at + 1) * 25}`);
  }
  console.log(`same: ${LOOPS} loops of planned stick moves give the same memory every 25 loops at ${got.map(x => x[0]).join(', ')}`);
}

// --- the clock --------------------------------------------------------------------------------
if (part('clock')) {
  const a = machine(false), b = machine(false);
  FastCPU.set(b.fx, true);
  const c0 = clock(a.M), f0 = a.rt.frame;
  a.frames(20, UP | LEFT); b.refresh(20, UP | LEFT, [], 1000 / 60);
  const ca = clock(a.M) - c0, cb = clock(b.M) - c0, fa = a.rt.frame - f0, fb = b.rt.frame - f0;
  if (Math.abs(ca - cb) > 1) fail(`the game's clock ran ${ca} frames off and ${cb} on`);
  if (Math.abs(fa - fb) > 1) fail(`${fa} video frames off and ${fb} on`);
  console.log(`clock: 20 s of walking moves the game's clock ${ca} frames with Fast CPU off and ${cb} on (${fa} and ${fb} video frames)`);
}

// --- whole steps --------------------------------------------------------------------------------
if (part('whole')) {
  // the C64's step a pass, walking straight and turning on foot
  const steps = (m, joy, fast) => {
    const seen = [];
    let last = null;
    const mark = K => { const p = pos(m.M); if (last) seen.push({ dx: s24(p.x - last.p.x), dy: s24(p.y - last.p.y), dh: turned(last.p.head, p.head), K: last.K, K2: K }); last = { p, K }; };
    if (fast) {
      FastCPU.set(m.fx, true);
      const b0 = m.fx.loop.begin;
      m.fx.loop.begin = () => { b0(); if (m.fx.first) mark(m.fx.K); };
      m.refresh(1, joy); seen.length = 0; last = null;
      m.refresh(6, joy);
    } else {
      m.frames(1, joy);
      m.rt.onPass(() => mark(0));
      m.frames(6, joy);
    }
    return seen.slice(1);
  };
  for (const [what, joy, key] of [['walking', UP, s => s.dx + ',' + s.dy], ['turning', LEFT, s => String(s.dh)]]) {
    const c64 = steps(machine(false), joy, false), fast = steps(machine(false), joy, true);
    const want = new Set(c64.map(key));
    const steady = fast.filter(s => s.K === s.K2);
    const off = steady.filter(s => !want.has(key(s)));
    if (want.size !== 1) fail(`${what}: the C64's own step changes from pass to pass: ${[...want].join(' ')}`);
    if (!steady.length) fail(`${what}: no two shadow passes of the same length`);
    if (off.length) fail(`${what}: ${off.length} of ${steady.length} shadow passes moved ${key(off[0])}, the C64's pass ${[...want][0]}`);
    console.log(`whole: ${what}, ${steady.length} shadow passes of 1 to ${Math.max(...fast.map(s => s.K))} loops each move ${[...want][0]}, the C64's step a pass`);
  }
}

// --- the pace -----------------------------------------------------------------------------------
if (part('pace')) {
  const run = (fast, setup, secs, joy, keys) => {
    const m = machine(false);
    if (setup) setup(m);
    if (fast) FastCPU.set(m.fx, true);
    const p0 = pos(m.M), s0 = fast ? m.fx.shadow : m.rt.passes;
    let h = p0.head, dh = 0;
    const each = () => { const n = pos(m.M).head; dh += turned(h, n); h = n; };
    if (fast) m.refresh(secs, joy, keys, 1000 / 60, each);
    else { m.press(joy, keys); for (let i = 0, n = Math.round(secs / FRAME_MS * 1000); i < n; i++) { m.rt.runFrame(); each(); } m.press(); }
    const p1 = pos(m.M);
    return { d: dist(p0, p1), dh: Math.abs(dh), passes: (fast ? m.fx.shadow : m.rt.passes) - s0 };
  };
  // within tol, or one of the C64's steps (slack): a pass is a sizeable share of 20 s
  const within = (what, a, b, tol, slack = 0) => {
    const e = Math.abs(b - a) / Math.abs(a);
    if (!(e <= tol || Math.abs(b - a) <= slack)) fail(`${what}: the C64 ${a.toFixed(0)}, Fast CPU ${b.toFixed(0)}, ${(100 * e).toFixed(2)} % apart`);
    return (100 * e).toFixed(2) + ' %';
  };
  const wa = run(false, null, 20, UP), wb = run(true, null, 20, UP);
  const ta = run(false, null, 20, LEFT), tb = run(true, null, 20, LEFT);
  const fa = run(false, dart, 10, 0), fb = run(true, dart, 10, 0);
  console.log(`pace: walking 20 s ${wa.d.toFixed(0)} and ${wb.d.toFixed(0)} units (${within('walking', wa.d, wb.d, 0.01, 80)}), ` +
              `in ${wa.passes} C64 passes and ${wb.passes} shadow passes; turning 20 s ${ta.dh} and ${tb.dh} (${within('turning', ta.dh, tb.dh, 0.01, 16)}); ` +
              `flying 10 s ${fa.d.toFixed(0)} and ${fb.d.toFixed(0)} (${within('flying', fa.d, fb.d, 0.01)})`);
}

// --- repeats --------------------------------------------------------------------------------------
if (part('repeats')) {
  const trims = (fast, secs, keys) => {
    const m = machine(false);
    dart(m);
    let n = 0;
    const k0 = m.P.key_speed_trim;
    m.P.key_speed_trim = function (r) { n++; return k0.call(this, r); };
    if (fast) { FastCPU.set(m.fx, true); m.refresh(1, 0); }   // the pass under way when it came on ends in the C64's time
    const s0 = fast ? m.fx.shadow : m.rt.passes, K = fast ? m.fx.K : 0;
    if (fast) m.refresh(secs, 0, keys); else m.frames(secs, 0, keys);
    const held = (fast ? m.fx.shadow : m.rt.passes) - s0;
    if (fast) m.refresh(1, 0); else m.frames(1, 0);
    return { n, held, K };
  };
  const a = trims(false, 3, [0x28]), b = trims(true, 3, [0x28]);
  if (Math.abs(b.n - b.held) > 1) fail(`+ held 3 s trimmed ${b.n} times in ${b.held} shadow passes`);
  if (Math.abs(b.n - a.n) > 2) fail(`+ held 3 s trimmed ${a.n} times on the C64 and ${b.n} with Fast CPU`);
  const tap = trims(true, 3 * FRAME_MS / 1000, [0x28]);
  if (tap.n !== 1) fail(`a press of + for three video frames trimmed ${tap.n} times, at ${tap.K} loops a shadow pass`);
  console.log(`repeats: + held 3 s trims ${a.n} times on the C64 and ${b.n} in ${b.held} shadow passes; a press of three video frames, ${tap.n} at ${tap.K} loops a shadow pass`);
}

// --- stopping ---------------------------------------------------------------------------------
if (part('stopping')) {
  let moved = 0, tries = 0;
  for (const [what, joy] of [['walk', UP], ['turn', LEFT]]) {
    for (const after of [7, 18, 31, 44]) {
      const m = machine(false);
      FastCPU.set(m.fx, true);
      let n = 0, at = null;
      m.rt.input.joy = 0x1F & ~joy;
      const between = () => {
        n++;
        if (n === after) { m.rt.input.joy = 0x1F; at = pos(m.M); }
        if (n === after + 1) { const p = pos(m.M); tries++; if (p.x !== at.x || p.y !== at.y || p.head !== at.head) { moved++; fail(`the ${what} let go after loop ${after} moved on in the next`); } }
      };
      while (n < after + 1) FastCPU.run(m.fx, 1000 / 60, between);
    }
  }
  console.log(`stopping: ${tries - moved} of ${tries} walks and turns stop in the loop where the stick comes back`);
}

// --- random play --------------------------------------------------------------------------------
if (part('random')) {
  seed = 0xC0FFEE;
  let secs = 0, toggles = 0, threw = 0;
  for (const where of ['on foot', 'in the Dart']) {
    const m = machine(false);
    if (where === 'in the Dart') dart(m);
    let fast = false, joy = 0x1F;
    try {
      for (let ms = 0; ms < 90000;) {
        if (rnd(400) === 0) { fast = !fast; FastCPU.set(m.fx, fast); toggles++; }
        if (rnd(10) === 0) joy = STICK[rnd(STICK.length)] & (rnd(6) ? 0x1F : 0x0F);
        m.rt.input.joy = joy;
        const gap = 4 + rnd(40);
        if (fast) FastCPU.run(m.fx, gap); else { if (rnd(3) === 0) m.rt.runFrame(); }
        ms += fast ? gap : FRAME_MS / 3;
      }
      secs += 90;
    } catch (e) { threw++; fail(`random play ${where} threw: ${e.message}`); }
  }
  console.log(`random: ${secs} s of random play on foot and in the Dart, Fast CPU switched ${toggles} times, ${threw ? threw + ' threw' : 'nothing thrown'}`);
}

// --- no frame behind ----------------------------------------------------------------------------
if (part('behind')) {
  const m = machine(false);
  FastCPU.set(m.fx, true);
  let shown = null, bad = 0, refreshes = 0;
  const f0 = m.P.flip_buffers;
  m.P.flip_buffers = function* (r) { const v = yield* f0.call(this, r); shown = m.M[0xC7]; return v; };
  m.refresh(10, UP | LEFT, [], 1000 / 60, l => {
    if (!l) return;
    refreshes++;
    if (!m.rt.parked || m.M[0xC7] !== shown) bad++;
  });
  if (bad) fail(`${bad} of ${refreshes} refreshes ended away from their last loop's flip`);
  console.log(`behind: ${refreshes - bad} of ${refreshes} refreshes end parked at their last loop's end, its flipped bitmap on show`);
}

console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
