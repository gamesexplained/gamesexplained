#!/usr/bin/env node
'use strict';
// The Play tab's Fast CPU (site/lib/fast-cpu.js, with Stunt Car Racer's table and plug-in points in
// play.html's block port/page/fast-table.js) as the page runs it, in node on the memory the page
// carries, from the loader's hand-over. A refresh is FastCPU.run for the real time since the last,
// as the page's tick calls it. The beat is the C64's video frame (line 55, before the interrupt at
// line 61 puts the last pass's view on show) and the speed follows the C64's: a shadow pass is the
// frames one of the C64's passes would take over the work the last pass did, at most seven, and
// each pass takes its share of that pass's steps.
// - off means off: loaded, and on for a spell in the menus, it changes nothing: the machine is the
//   same, byte for byte and cycle for cycle, as one without it, every 25 of 6,000 frames of the
//   menus and a practice race; off again after a spell on in the race, the port has the game's own
//   plug-in points back and a frame of the C64 runs a frame of time;
// - the frame limiter: every pass of the race starts at line 55 of a frame, no frame starts two,
//   and a refresh of a quarter of a second runs the cap of four and drops the rest;
// - same keys, same game: from the same moment of a race, 1,200 passes of planned driving leave
//   the same memory every 25 passes at 50, 60 and 144 refreshes a second, 4 to 40 ms apart, and a
//   refresh each quarter second;
// - the clock: on Fast CPU the race's clocks keep real time, within 2 %, where the C64's fall
//   behind (its passes take longer than the seven frames the clocks count for each);
// - the speed: the car's speed and the piece of track it is on, against the race's clock, are the
//   C64's, within 3 % of the speed and one piece, accelerating along Little Ramp;
// - the C64's speed followed: while the crane lowers the car (the C64 takes ten frames over a pass)
//   each shadow pass takes seven passes, and as the car falls off the track (about five frames on
//   the C64) five, the C64's own;
// - once a pass: in a practice race and a league race, every byte that changes only on a shadow
//   pass's first pass is one listed as meant to (ONCE, with the reason for each);
// - the pause: P stops the race with Fast CPU on and O sets it going;
// - three minutes of random driving, at random refresh intervals, with Fast CPU switched now and
//   then, throw nothing and keep the clock to the time owed.
//   node games/c64/stunt-car-racer/test_fast.js [part: off, limiter, same, clock, speed, follow,
//     once, pause, random]
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64'); g.lib('fast-cpu');
const PAGE = 'play.html', page = g.read(PAGE);
if (!page.includes('<script src="../../lib/fast-cpu.js"></script>')) { console.log('FAIL: play.html does not load ../../lib/fast-cpu.js'); process.exit(1); }
if (!page.includes('data-act="fast"')) { console.log('FAIL: play.html has no Fast CPU button'); process.exit(1); }
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
if (!blocks.includes('port/page/fast-table.js')) { console.log('FAIL: play.html has no port/page/fast-table.js'); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'SCRPort');
const { SCRPage, FastCPU, SCR_FAST: T, SCRFast } = globalThis;
const cost = JSON.parse(/^window\.SCR_COST = (.*);$/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="scr-data">([^<]*)<\/script>/.exec(page)[1]);
const { FRAME, LINE } = SCRPage, FRAME_MS = 1000 * FRAME / T.hz, BEAT = 55 * LINE;

const ONLY = process.argv[2] || '', part = name => !ONLY || ONLY === name;
let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const hash = rt => crypto.createHash('md5').update(rt.M).update(rt.colour).digest('hex') + ':' + rt.t;
let seed = 0x2545F491;
const rnd = n => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed % n; };
const bcd = v => (v >> 4) * 10 + (v & 15);
const clock = M => bcd(M[0x8398]) * 6000 + bcd(M[0x82B0]) * 100 + bcd(M[0x8298]);   // the player's lap clock, in hundredths
const speed = M => (M[0x0159] << 24 >> 16) | M[0x0156];                               // along the road

// the menus as test_play.js plays them: a name, Practise, Little Ramp; or the league and its first race
const J = { none: 0x1F, up: 0x1E, down: 0x1D, left: 0x1B, right: 0x17, fire: 0x0F };
const tap = (joy, hold = 8, after = 40) => [{ frames: hold, joy }, { frames: after, joy: J.none }];
const type = k => [{ frames: 8, keys: [k] }, { frames: 30 }];
const NAME = [...type('A'), ...type('C'), ...type('E'), ...type('RETURN')];
const MENUS = [{ frames: 400 }, ...tap(J.fire), { frames: 300 }, ...NAME, { frames: 200 }, ...tap(J.fire), { frames: 100 }];
const TO_RACE = {
  practice: [...MENUS, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 100 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 600 }],
  season: [...MENUS, ...tap(J.down), { frames: 60 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 300 }, ...tap(J.fire), { frames: 300 }],
};
// driving, as frames of real time: forward, a turn each way, braking, the boost
const DRIVE = [{ frames: 180, joy: J.fire }, { frames: 500, joy: J.up }, { frames: 60, joy: J.up & J.left }, { frames: 300, joy: J.up },
  { frames: 60, joy: J.up & J.right }, { frames: 100, joy: J.down }, { frames: 400, joy: J.up }, { frames: 100, joy: J.up & J.fire }, { frames: 300, joy: J.up }, { frames: 2000, joy: J.up }];
const STRAIGHT = [{ frames: 180, joy: J.fire }, { frames: 2000, joy: J.up }];

// the page's machine from the hand-over, with Fast CPU loaded (off) as the page loads it, unless bare
function machine(bare) {
  const rt = SCRPage.create({ data, cost });
  const fx = bare ? null : SCRFast.extend(FastCPU.attach(rt, T));
  const set = s => { rt.input.keys = new Set(s.keys || []); rt.input.joy = s.joy === undefined ? J.none : s.joy; };
  let f = 0;
  // frames of the C64, or with Fast CPU refreshes ms apart over the same real time
  const frames = (script, each) => { for (const s of script) { set(s); for (let i = 0; i < s.frames; i++, f++) { rt.runFrame(); if (each) each(f); } } };
  const refresh = (script, ms = FRAME_MS, each) => {
    let owed = 0;
    for (const s of script) {
      set(s);
      owed += s.frames * FRAME_MS;
      while (owed >= ms) { const n = FastCPU.run(fx, ms); owed -= ms; if (each) each(n); }
    }
  };
  return { rt, fx, P: rt.P, M: rt.M, set, frames, refresh, get f() { return f; } };
}

// --- off means off ----------------------------------------------------------------------------
if (part('off')) {
  const a = machine(true), b = machine(false);
  const script = [...TO_RACE.practice, ...DRIVE].reduce((L, s) => (L.push(...Array(s.frames).fill(s)), L), []);
  let differ = 0, f = 0;
  for (; f < 6000; f++) {
    a.set(script[f]); b.set(script[f]);
    a.rt.runFrame();
    if (f === 1000) FastCPU.set(b.fx, true);       // on for a spell in the menus: the C64's own time
    if (f === 1500) FastCPU.set(b.fx, false);
    if (f >= 1000 && f < 1500) FastCPU.run(b.fx, FRAME_MS); else b.rt.runFrame();
    if (f % 25 === 24 && hash(a.rt) !== hash(b.rt)) { if (!differ++) fail('loaded and off, the machine differs from one without Fast CPU at frame', f + 1); }
  }
  const own = b.P.plug;
  FastCPU.set(b.fx, true);
  b.refresh([{ frames: 100, joy: J.up }]);
  if (!b.rt.inLoop && b.P.plug !== own) fail('on, between passes, the port does not have its own plug-in points');
  let fastSeen = false;
  const c = b.P.CONTROLS; b.P.CONTROLS = function (...x) { if (b.P.plug !== own) fastSeen = true; return c.apply(this, x); };
  b.refresh([{ frames: 50, joy: J.up }]);
  if (!fastSeen) fail('on, in a pass of the race, the port still has its own plug-in points');
  FastCPU.set(b.fx, false);
  fastSeen = false;
  b.frames([{ frames: 50, joy: J.up }]);
  if (fastSeen) fail('off again, the port does not have its own plug-in points back');
  const t0 = b.rt.t; b.rt.runFrame();
  if (Math.abs(b.rt.t - t0 - FRAME) > LINE * 2) fail('off again, a frame of the C64 runs ' + (b.rt.t - t0) + ' cycles');
  console.log(`off: ${f} frames of the menus and a race loaded and off, on for 500 frames of the menus, ${differ ? 'differing' : 'the same as without Fast CPU'} every 25; off again after a spell on, the game's own plug-in points`);
}

// --- the frame limiter --------------------------------------------------------------------------
if (part('limiter')) {
  const m = machine(false);
  m.frames(TO_RACE.practice);
  FastCPU.set(m.fx, true);
  m.refresh([{ frames: 50, joy: J.up }]);          // the pass under way when it came on ends in the C64's time
  let offBeat = 0, starts = 0, twice = 0, lastFrame = -1, most = 0;
  const b0 = m.fx.loop.begin;
  m.fx.loop.begin = () => {
    starts++;
    if (m.rt.t % FRAME !== BEAT) offBeat++;
    const fr = Math.floor(m.rt.t / FRAME);
    if (fr === lastFrame) twice++;
    lastFrame = fr;
    b0();
  };
  m.refresh([{ frames: 500, joy: J.up }], 1000 / 60, n => { if (n > most) most = n; });
  if (offBeat) fail('limiter: ' + offBeat + ' of ' + starts + ' passes started off line 55');
  if (twice) fail('limiter: ' + twice + ' frames started two passes');
  if (most > 1) fail('limiter: a refresh at 60 a second ran ' + most + ' passes');
  // a quarter of a second owed: the cap, and the rest dropped
  const t0 = m.rt.t, n = FastCPU.run(m.fx, 250);
  if (n !== T.cap) fail('limiter: a refresh of 250 ms ran ' + n + ' passes, the cap is ' + T.cap);
  const n2 = FastCPU.run(m.fx, 1000 / 60);
  if (n2 > 1) fail('limiter: the refresh after the cap ran ' + n2 + ' passes: the time past the cap was kept');
  console.log(`limiter: ${starts} passes, each at line 55 of a frame of its own, one a refresh at 60 Hz; a 250 ms refresh ran ${n} (${Math.round((m.rt.t - t0) / FRAME)} frames) and dropped the rest`);
}

// --- same keys, same game -----------------------------------------------------------------------
if (part('same')) {
  // the driving by passes: the stick changes every 30 to 90 passes, as the pass before reads it
  seed = 0x1234567;
  const plan = [];
  for (let n = 0; n < 1200;) { const k = 30 + rnd(60); plan.push([n, [J.up, J.up & J.left, J.up & J.right, J.up, J.up & J.fire, J.down, J.none][rnd(7)]]); n += k; }
  const stick = n => { let j = J.none; for (const [at, v] of plan) if (at <= n) j = v; return j; };
  const run = msOf => {
    const m = machine(false);
    m.frames([...TO_RACE.practice, { frames: 180, joy: J.fire }]);
    FastCPU.set(m.fx, true);
    m.rt.input.joy = stick(0);
    const hashes = [];
    let i = 0;
    while (m.fx.loops < 1200) {
      FastCPU.run(m.fx, msOf(i++), () => {
        if (m.fx.loops % 25 === 0) hashes[m.fx.loops / 25] = hash(m.rt).split(':')[0];
        m.rt.input.joy = stick(m.fx.loops);
      });
      if (i > 2e5) { fail('same: no progress'); break; }
    }
    return hashes;
  };
  const ref = run(() => FRAME_MS);
  const ways = { '60 Hz': () => 1000 / 60, '144 Hz': () => 1000 / 144, '4-40 ms': () => 4 + rnd(37), '250 ms': () => 250 };
  for (const [name, ms] of Object.entries(ways)) {
    const h = run(ms);
    const at = h.findIndex((x, k) => x !== ref[k]);
    if (at >= 0) fail('same: at ' + name + ', the memory differs from 50 Hz\'s after ' + at * 25 + ' passes');
  }
  console.log(`same: 1,200 passes of planned driving leave the same memory every 25 passes at 50, 60 and 144 refreshes a second, 4 to 40 ms apart and 250 ms apart`);
}

// --- the clock, and the speed against it ------------------------------------------------------------
// the race's first lap from the line, on the C64 and on Fast CPU: [frame of real time, clock, speed, piece]
function laps(fast, script) {
  const m = machine(false);
  m.frames(TO_RACE.practice);
  if (fast) FastCPU.set(m.fx, true);
  const rows = [];
  let f = 0;
  const each = () => { f++; if (m.M[0xC378] === 1) rows.push([f, clock(m.M), speed(m.M), m.M[0xC374], m.M[0x6A]]); };
  if (fast) m.refresh(script, FRAME_MS, () => each()); else m.frames(script, each);
  return rows;
}
let C64LAP = null, FASTLAP = null;
const straight = () => { if (!C64LAP) { C64LAP = laps(false, STRAIGHT); FASTLAP = laps(true, STRAIGHT); } };
if (part('clock')) {
  straight();
  // from the line to the car leaving the road at the jump
  const span = R => { const end = R.findIndex(r => !r[4] && r[1] > 300); const e = R[end > 0 ? end : R.length - 1]; return [(e[0] - R[0][0]) * FRAME_MS / 10, e[1] - R[0][1]]; };
  const [realF, clockF] = span(FASTLAP), [realC, clockC] = span(C64LAP);
  const errF = clockF / realF - 1, errC = clockC / realC - 1;
  if (Math.abs(errF) > 0.02) fail('clock: on Fast CPU the race\'s clock ran ' + clockF + ' hundredths in ' + Math.round(realF) + ' of real time');
  if (errC > -0.02) fail('clock: on the C64 the race\'s clock ran ' + clockC + ' hundredths in ' + Math.round(realC) + ': it was expected to fall behind');
  console.log(`clock: on Fast CPU the race's clock ran ${(clockF / 100).toFixed(2)} s in ${(realF / 100).toFixed(2)} s of real time (${(errF * 100).toFixed(1)} %), on the C64 ${(clockC / 100).toFixed(2)} s in ${(realC / 100).toFixed(2)} s (${(errC * 100).toFixed(1)} %)`);
}
if (part('speed')) {
  straight();
  // the C64's speed and piece at a clock's value, between its passes
  const at = (R, c) => { let i = R.findIndex(r => r[1] >= c); if (i <= 0) return null; const a = R[i - 1], b = R[i], k = (c - a[1]) / ((b[1] - a[1]) || 1); return [a[2] + (b[2] - a[2]) * k, a[3], b[3]]; };
  let worst = 0, pieceOff = 0, n = 0, top = 0, was = -1;
  for (const r of FASTLAP) {
    const fresh = r[1] !== was;                    // the clock moved on: a shadow pass's first pass
    was = r[1];
    if (!fresh || r[1] < 100 || !r[4]) continue;   // from a second past the line, wheels on the road
    if (r[1] > 1300) break;                        // to the jump
    const c = at(C64LAP, r[1]);
    if (!c) continue;
    n++; top = Math.max(top, c[0]);
    const e = Math.abs(r[2] - c[0]) / Math.max(256, Math.abs(c[0]));
    if (e > worst) worst = e;
    if (r[3] < Math.min(c[1], c[2]) - 1 || r[3] > Math.max(c[1], c[2]) + 1) pieceOff++;
  }
  if (n < 60) fail('speed: only ' + n + ' passes to compare');
  if (worst > 0.03) fail('speed: the car\'s speed is ' + (worst * 100).toFixed(1) + ' % off the C64\'s at the same time on the race\'s clock');
  if (pieceOff) fail('speed: on ' + pieceOff + ' passes the car is more than a piece from the C64\'s');
  console.log(`speed: accelerating along Little Ramp to ${(top / 256).toFixed(1)}, the car's speed within ${(worst * 100).toFixed(1)} % of the C64's at the same time on the race's clock, on its piece, over ${n} of the C64's passes`);
}

// --- the C64's speed followed, held to seven frames a pass --------------------------------------
if (part('follow')) {
  const m = machine(false);
  m.frames(TO_RACE.practice.slice(0, -1));
  FastCPU.set(m.fx, true);
  const K = { crane: new Map(), fall: new Map(), road: new Map() };
  let over = 0;
  const b0 = m.fx.loop.begin;
  m.fx.loop.begin = () => {
    b0();
    if (!m.fx.first) return;
    if (m.fx.K > T.most) over++;
    const w = m.M[0x2F] ? K.crane : m.M[0x6A] ? K.road : K.fall;
    w.set(m.fx.K, (w.get(m.fx.K) || 0) + 1);
  };
  m.refresh([{ frames: 600 }, ...STRAIGHT]);
  const show = w => [...w].sort((a, b) => a[0] - b[0]).map(([k, v]) => v + ' of ' + k).join(', ');
  if (over) fail('follow: ' + over + ' shadow passes took more than ' + T.most);
  if (!K.crane.size || [...K.crane.keys()].some(k => k !== 7)) fail('follow: the crane\'s shadow passes took ' + show(K.crane));
  if (!K.fall.get(5)) fail('follow: as the car fell, the shadow passes took ' + show(K.fall));
  console.log(`follow: shadow passes with the crane ${show(K.crane)}; on the road ${show(K.road)}; falling ${show(K.fall)}`);
}

// --- once a pass ---------------------------------------------------------------------------------
// The bytes meant to change once a pass, on a shadow pass's first: what the C64 does each pass to
// what keeps its time in passes, and the high byte of a move of a whole unit a pass
const ONCE = {
  0x0010: 'the engine\'s note\'s step, which the interrupt adds each video frame (ENGINE_SOUND)',
  0x0011: 'the engine\'s note\'s step, its high byte',
  0x8298: 'the player\'s lap clock, 0.14 s a pass (TICK_CLOCK)',
  0x8299: 'the opponent\'s lap clock',
  0x82B0: 'the player\'s lap clock\'s seconds',
  0x82B1: 'the opponent\'s lap clock\'s seconds',
  0xC30C: 'the count of passes (RACE)',
  0xC3DF: 'the crane\'s chains\' top, its high byte: the swing moves it $100 a pass, its low byte ($34) a share each pass (CRANE_SWING)',
};
// the lap clock's digits in the dashboard's sprites, drawn as its seconds go on (DRAW_TIME)
for (let a = 0x4080; a < 0x40A0; a++) ONCE[a] = 'the lap clock\'s digits in the dashboard\'s sprites (DRAW_TIME)';
if (part('once')) {
  for (const race of ['practice', 'season']) {
    const m = machine(false);
    m.frames(TO_RACE[race]);
    FastCPU.set(m.fx, true);
    const prev = new Uint8Array(0x10000), first = new Uint32Array(0x10000), other = new Uint32Array(0x10000);
    let have = false, firsts = 0;
    const between = () => {
      if (have) { const A = m.fx.first ? first : other; for (let a = 0; a < 0x10000; a++) if (m.M[a] !== prev[a]) A[a]++; }
      if (m.fx.first) firsts++;
      prev.set(m.M); have = true;
    };
    let owed = 0;
    for (const s of DRIVE) { m.set(s); owed += s.frames * FRAME_MS; while (owed >= FRAME_MS) { FastCPU.run(m.fx, FRAME_MS, between); owed -= FRAME_MS; } }
    const found = [];
    for (let a = 0; a < 0x10000; a++) if (first[a] >= 10 && other[a] <= first[a] / 20 && !ONCE[a]) found.push('$' + a.toString(16).toUpperCase().padStart(4, '0') + ' (' + first[a] + ' first passes, ' + other[a] + ' others)');
    if (found.length) fail('once: in the ' + race + ' race, bytes that change only on a shadow pass\'s first pass: ' + found.join(', '));
    else console.log(`once: in the ${race} race, over ${firsts} shadow passes, the bytes that change only on their first passes are the ones listed`);
  }
}

// --- the pause ---------------------------------------------------------------------------------
if (part('pause')) {
  const m = machine(false);
  m.frames([...TO_RACE.practice, { frames: 180, joy: J.fire }]);
  FastCPU.set(m.fx, true);
  m.refresh([{ frames: 200, joy: J.up }]);
  m.refresh([{ frames: 6, keys: ['P'], joy: J.up }]);
  const l0 = m.fx.loops;
  m.refresh([{ frames: 300, joy: J.up }]);
  const still = m.fx.loops - l0;
  m.refresh([{ frames: 6, keys: ['O'], joy: J.up }, { frames: 200, joy: J.up }]);
  const going = m.fx.loops - l0 - still;
  if (still > 2) fail('pause: ' + still + ' passes ran while paused');
  if (going < 150) fail('pause: O set ' + going + ' passes going in 4 s');
  else console.log(`pause: P held the race for 300 frames, O set it going: ${going} passes in 206 frames`);
}

// --- random driving ------------------------------------------------------------------------------
if (part('random')) {
  seed = 0xBADC0DE;
  const m = machine(false);
  m.frames(TO_RACE.season);
  let real = 0, on = false, err = null, behind = 0;
  const sticks = [J.none, J.up, J.up & J.left, J.up & J.right, J.down, J.up & J.fire, J.left, J.right];
  try {
    while (real < 180000) {
      if (rnd(200) === 0) { on = !on; FastCPU.set(m.fx, on); }
      if (rnd(20) === 0) m.rt.input.joy = sticks[rnd(sticks.length)];
      const ms = 4 + rnd(37);
      if (on) FastCPU.run(m.fx, ms); else m.rt.runFrame();
      real += on ? ms : FRAME_MS;
      if (m.rt.t > m.rt.target + FRAME) behind++;
    }
  } catch (e) { err = e; }
  if (err) fail('random: ' + err.stack);
  else if (behind) fail('random: the clock ran past the time owed on ' + behind + ' refreshes');
  else console.log(`random: three minutes of random driving at random refreshes, Fast CPU switched now and then, ${m.fx.loops} passes on it`);
}

console.log(fails ? fails + ' failed' : 'all passed');
process.exitCode = fails ? 1 : 0;
