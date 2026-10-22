'use strict';
// The Play tab's fast CPU (port/page/fast.js) as the page runs it, in node on the memory the page
// carries, from the loader's jump:
// - attached and off, it changes nothing: the machine is the same, byte for byte and cycle for
//   cycle, as without it, every 25 frames of a session that walks, turns, looks and aims;
// - on, the game runs a pass of its main loop for each tick of its timer, 60 a second;
// - walking for 10 seconds covers the ground the C64 covers in 10 seconds, turning for 20 seconds
//   turns as far, and the pointer moves as fast, each within a few per cent;
// - a press of U turns about once, and held, again each pass of the C64;
// - the same controls, pass for pass, make the same game drawn at 60 frames a second, at 144, at
//   uneven rates, and on a machine too slow to keep up; at 144 the view moves between passes;
// - five minutes of random play, with a jump to another area every 20 seconds and the switch
//   turned off and on every minute, throw nothing and leave the angles in the game's ranges.
//   node games/c64/castle-master/test_fast.js
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64'); g.lib('sid'); g.lib('cpu6502');
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
if (!blocks.includes('port/page/fast.js')) { console.log('FAIL: play.html has no port/page/fast.js'); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'CMPort');
const { CMPage, CMModern, CMFast } = globalThis;
const cost = JSON.parse(/^window\.CM_COST = (.*);$/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="cm-data">([^<]*)<\/script>/.exec(page)[1]);
const CYC = 985248;

let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const s16 = v => (v << 16) >> 16;
const at = M => ({ x: s16(M[0x2407] | M[0x2408] << 8), z: s16(M[0x240B] | M[0x240C] << 8) });

// a machine at the first view of the Wilderness, with the page's watchers when asked
function machine(watch) {
  const rt = CMPage.create({ data, cost });
  const st = watch ? CMModern.attach(rt) : null, fx = watch ? CMFast.attach(rt) : null;
  const run = (n, keys = [], joy = 0, each) => {
    rt.input.keys = new Set(keys); rt.input.joy = 0x1F & ~joy;
    for (let i = 0; i < n; i++) { rt.runFrame(); if (each) each(); }
    rt.input.keys = new Set(); rt.input.joy = 0x1F;
  };
  const tap = (k, hold, after) => { run(hold, [k]); run(after); };
  run(60); tap('1', 6, 54); tap('RETURN', 6, 54); tap('2', 6, 54); tap('RETURN', 6, 454); tap('SPACE', 6, 300);
  // the fast CPU's page, 60 frames a second: the passes real time has reached at each
  const fast = (secs, keys = [], joy = 0, each) => {
    rt.input.keys = new Set(keys); rt.input.joy = 0x1F & ~joy;
    for (let i = 0, n = Math.round(secs * 60); i < n; i++) { rt.runSteps(CYC / 60, 4); if (each) each(); }
    rt.input.keys = new Set(); rt.input.joy = 0x1F;
  };
  return { rt, st, fx, run, fast };
}

// ---- off, nothing changes
{
  const trace = watch => {
    const m = machine(watch), out = [];
    let f = 0;
    const each = () => { if (f++ % 25 === 0) out.push(crypto.createHash('md5').update(m.rt.M).update(m.rt.colour).digest('hex') + ':' + m.rt.t); };
    for (const [n, keys, joy] of [[300, [], 1], [200, [], 8], [100, ['P']], [200, [], 1], [100, ['U']], [200, [], 5], [50, ['R']], [300, [], 1], [60, ['SPACE']], [100, [], 8], [30, [], 16], [200]]) m.run(n, keys, joy, each);
    return out;
  };
  const a = trace(false), b = trace(true);
  const i = a.findIndex((h, k) => h !== b[k]);
  if (i >= 0 || a.length !== b.length) fail('with the fast CPU attached and off, the machine differs at sample ' + i + ' of ' + a.length);
  else console.log(a.length + ' samples over 1,840 frames of play: the same machine with the fast CPU attached and off');
}

// ---- the speeds, against the C64's in the same place
{
  // the C64: the distance and the turn between the starts of the first and the last pass of the
  // walk, over the time between them
  const c64 = (joy, keys, frames) => {
    const m = machine(true), starts = [];
    const up = m.rt.P.UPDATE_FRAME_INPUT_EVENTS;
    m.rt.P.UPDATE_FRAME_INPUT_EVENTS = function* (r) { starts.push({ t: m.rt.t, p: at(m.rt.M), yaw: m.rt.M[0x2411], aim: m.rt.M[0x2465] }); return yield* up.call(this, r); };
    m.run(frames, keys, joy);
    const moved = starts.filter((s, i) => i && (s.p.x !== starts[i - 1].p.x || s.p.z !== starts[i - 1].p.z || s.yaw !== starts[i - 1].yaw || s.aim !== starts[i - 1].aim));
    const a = starts[0], b = moved[moved.length - 1], secs = (b.t - a.t) / CYC;
    let turned = 0;
    for (let i = 1; i < starts.length && starts[i].t <= b.t; i++) { let d = starts[i].yaw - starts[i - 1].yaw; d -= 72 * Math.round(d / 72); turned += d; }
    return { speed: Math.hypot(b.p.x - a.p.x, b.p.z - a.p.z) / secs, turn: turned / secs, aim: (b.aim - a.aim) / secs };
  };
  const fast = (joy, keys, secs, pointer) => {
    const m = machine(true);
    if (pointer) { m.run(10, ['SPACE']); m.run(120); }
    CMFast.set(m.fx, true);
    const a = at(m.rt.M), x0 = m.rt.M[0x2465], n0 = m.fx.n;
    let yaw = m.fx.yaw, turned = 0;
    m.fast(secs, keys, joy, () => { let d = m.fx.yaw - yaw; d -= 72 * Math.round(d / 72); turned += d; yaw = m.fx.yaw; });
    const b = at(m.rt.M);
    return { speed: Math.hypot(b.x - a.x, b.z - a.z) / secs, turn: turned / secs, aim: (m.rt.M[0x2465] - x0) / secs, passes: (m.fx.n - n0) / secs };
  };
  const near = (what, got, want, tol) => {
    const r = got / want - 1;
    if (!(Math.abs(r) <= tol)) fail(what + ': ' + got.toFixed(2) + ' a second with the fast CPU, ' + want.toFixed(2) + ' on the C64');
    else console.log(what + ': ' + got.toFixed(2) + ' a second with the fast CPU, ' + want.toFixed(2) + ' on the C64 (' + (100 * r).toFixed(1) + ' %)');
  };
  const walk = fast(1, [], 10), walkC = c64(1, [], 600);
  if (Math.abs(walk.passes - CYC / 16422) > 0.5) fail('the fast CPU ran ' + walk.passes.toFixed(1) + ' passes a second, the timer ticks ' + (CYC / 16422).toFixed(1));
  else console.log('the fast CPU: ' + walk.passes.toFixed(1) + ' passes of the main loop a second, one each tick of the timer');
  near('walking, in the game\'s units', walk.speed, walkC.speed, 0.05);
  near('turning, in steps of 72 to a turn', -fast(4, [], 20).turn, -c64(4, [], 1200).turn, 0.05);
  near('the pointer, in pixels', fast(8, [], 0.5, true).aim, pointerC64(), 0.12);
}
// the C64's pointer, on (Space) and moved right for 30 frames: a pixel each pass that moves it
function pointerC64() {
  const m = machine(true);
  m.run(10, ['SPACE']); m.run(120);
  const x0 = m.rt.M[0x2465], t0 = m.rt.t;
  m.run(30, [], 8);
  return (m.rt.M[0x2465] - x0) / ((m.rt.t - t0) / CYC);
}

// ---- a press that sets an action off: once, and again each pass of the C64 it is held for
{
  const m = machine(true);
  CMFast.set(m.fx, true);
  m.fast(1);
  const y0 = m.rt.M[0x2411];
  let y = y0, turns = [];
  const each = () => { if (m.rt.M[0x2411] !== y) turns.push({ t: m.rt.t, D: m.fx.D.draw }); y = m.rt.M[0x2411]; };
  m.fast(0.1, ['U'], 0, each); m.fast(2, [], 0, each);
  if (turns.length !== 1 || (m.rt.M[0x2411] - y0 + 72) % 72 !== 36) fail('U tapped for 0.1 s turned the view ' + turns.length + ' times');
  else console.log('U tapped for 0.1 s turns about once');
  turns = [];
  m.fast(4, ['U'], 0, each);
  const early = turns.filter((r, i) => i && r.t - turns[i - 1].t < 0.95 * r.D);
  if (turns.length < 2 || early.length) fail('U held for 4 s turned the view ' + turns.length + ' times, ' + early.length + ' sooner than a pass of the C64 after the last');
  else console.log('U held for 4 s turns about ' + turns.length + ' times, each a pass of the C64 after the last');
}

// ---- the same controls, pass for pass, make the same game at any rate the page is drawn at
{
  // the controls by the pass: walk, turn, look, aim, a turn about, a run, the pointer moved
  const PLAN = [[0, 1], [150, 1, 'R'], [240, 4], [330, 5], [420, 8], [480, 0, 'U'], [490, 1], [600, 2], [700, 0, 'P'],
    [760, 9], [860, 0, 'L'], [900, 1, 'W'], [1000, 0, 'SPACE'], [1010, 8], [1100, 0, 'SPACE'], [1110, 6], [1300, 1]];
  const N = 1500;
  const play = (frames, onFrame) => {
    const m = machine(true), rt = m.rt;
    CMFast.set(m.fx, true);
    const out = [];
    let k = 0, p = 0;
    const controls = () => {
      while (p + 1 < PLAN.length && PLAN[p + 1][0] <= k) p++;
      rt.input.joy = 0x1F & ~PLAN[p][1]; rt.input.keys = new Set(PLAN[p][2] && k - PLAN[p][0] < 6 ? [PLAN[p][2]] : []);
    };
    controls();
    for (let i = 0; k < N; i++) {
      rt.runSteps(frames(i) * CYC / 1000, 4, () => {
        k++;
        if (k % 25 === 0 && k <= N) out.push(crypto.createHash('md5').update(rt.M).update(rt.colour).digest('hex') + ':' + rt.t);
        controls();
      });
      if (onFrame) onFrame(m);
    }
    return out;
  };
  let seed = 11;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return seed / 0x7FFFFFFF; };
  let between = 0, frames144 = 0;
  const runs = {
    '60 frames a second': play(() => 1000 / 60),
    '144 frames a second': play(() => 1000 / 144, m => { frames144++; const v = CMFast.latest(m.fx, m.st); if (v && v.phi % 1) between++; }),
    'frames 4 to 40 ms apart': play(() => 4 + 36 * rnd()),
    'a machine that keeps up with a pass in four, a frame each quarter second': play(() => 250),
  };
  const [first, ...rest] = Object.keys(runs);
  let same = true;
  for (const r of rest) {
    const i = runs[r].findIndex((h, k) => h !== runs[first][k]);
    if (i >= 0 || runs[r].length !== runs[first].length) { same = false; fail(r + ': the game differs from ' + first + ' at pass ' + 25 * (i + 1)); }
  }
  if (same) console.log(N + ' passes of walking, turning, looking and aiming: the same game, byte for byte, at ' + Object.keys(runs).join(', '));
  if (between < frames144 / 3) fail('at 144 frames a second, ' + between + ' of ' + frames144 + ' frames showed a view between two passes');
  else console.log('at 144 frames a second, ' + between + ' of ' + frames144 + ' frames show the view between two passes');
}

// ---- random play
{
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return seed / 0x7FFFFFFF; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const m = machine(true), rt = m.rt, M = rt.M, P = rt.P;
  CMFast.set(m.fx, true);
  // the scripts' own jump to an area (token $12: area, entrance), run from a pass's scripts
  const GOTO = [[4, 216], [2, 7], [6, 215], [9, 224], [13, 219], [22, 222], [11, 19], [16, 214], [8, 226], [15, 7], [17, 222], [21, 216], [3, 174], [5, 164], [10, 221], [14, 215], [19, 226], [24, 2]];
  let jump = null;
  const cond = P.DISPATCH_FRAME_CONDITIONS;
  P.DISPATCH_FRAME_CONDITIONS = function* (r) {
    if (jump) {
      const keep = Array.from(M.subarray(0x33C, 0x33F));
      M.set([0x12, jump[0], jump[1]], 0x33C); M[0x1084] |= 1; M[0x7C] = 0x3C; M[0x7D] = 0x03;
      jump = null;
      yield* P.EXECUTE_FCL_STREAM({ a: 3 });
      M.set(keep, 0x33C);
    }
    return yield* cond.call(this, r);
  };
  const KEYS = ['W', 'R', 'C', 'U', 'F', 'P', 'L', 'A', 'SPACE', '-', 'Z', 'X', 'CTRL'], JOY = [0, 1, 2, 4, 8, 5, 9, 1, 1, 16];
  const areas = new Set(), bad = new Set();
  let next = 0, threw = null;
  for (let k = 0; k < 300 * 60 && !threw; k++) {
    const t = k / 60;
    if (t >= next) {
      rt.input.joy = 0x1F & ~pick(JOY);
      const keys = new Set(); if (rnd() < 0.4) keys.add(pick(KEYS)); if (rnd() < 0.1) keys.add('CTRL');
      rt.input.keys = keys; next = t + 0.2 + 1.8 * rnd();
    }
    if (k % 1200 === 600) jump = pick(GOTO);
    if (k % 3600 === 3599) CMFast.set(m.fx, !m.fx.on);
    try { if (m.fx.on) { rt.runSteps(CYC / 60, 4); CMFast.latest(m.fx, m.st); } else rt.runFrame(); }
    catch (e) { threw = e; fail('random play, ' + t.toFixed(1) + ' s: ' + e.message); }
    areas.add(M[0x2429]);
    if (M[0x2411] >= 72) bad.add('yaw $' + M[0x2411].toString(16));
    if (M[0x2410] > 18 && M[0x2410] < 54) bad.add('pitch $' + M[0x2410].toString(16));
    if (m.fx.on && P.angles() && ((Math.round(m.fx.yaw) % 72) + 72) % 72 !== M[0x2411]) bad.add('the fine yaw ' + m.fx.yaw.toFixed(2) + ' at $2411 = ' + M[0x2411]);
  }
  if (bad.size) fail('random play left: ' + [...bad].slice(0, 4).join(', '));
  else if (!threw) console.log('five minutes of random play in ' + areas.size + ' areas, ' + m.fx.n + ' passes: nothing thrown, the angles in the game\'s ranges');
}

if (fails) { console.log(fails + ' failed'); process.exit(1); }
console.log('ok');
