'use strict';
// The Play tab's fast CPU (port/page/fast.js) as the page runs it, in node on the memory the page
// carries, from the loader's jump:
// - attached and off, it changes nothing: the machine is the same, byte for byte and cycle for
//   cycle, as without it, every 25 frames of a session that walks, turns, looks and aims;
// - on, the game runs a pass of its main loop for each tick of its timer, 60 a second;
// - at each pace (a step a second, half a second, a fifth), walking 1,200 units and turning a
//   whole turn take the C64's rounds for them at the pace each, whatever is in view, within 1 % or
//   the three ticks a press takes to show;
//   moving the pointer 30 pixels takes the time it takes the C64, within 5 %;
// - a press of U turns about once, and held for four seconds, still once; a quarter turn held with
//   the control key turns again each second;
// - the same controls, pass for pass, make the same game drawn at 60 frames a second, at 144, at
//   uneven rates, and on a machine too slow to keep up, at the first pace and the last; at 144
//   the view moves between passes;
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

// ---- the speeds, against the C64's from the same place: the time each takes to walk 1,200 units
// and to turn a whole turn, against the C64's rounds for them at the pace each, and to move the
// pointer 30 pixels, against the C64's time. (A C64 round lasts from a fifth of a second to three by
// what is in view; the fast CPU takes a step each pace in any view.)
{
  // what each move has done so far: the distance from where it began, the turn, the pointer's travel
  const progress = m => {
    const M = m.rt.M, p0 = at(M), x0 = M[0x2465];
    let yaw = m.fx.on ? m.fx.yaw : M[0x2411], turned = 0;
    return () => {
      const p = at(M), y = m.fx.on ? m.fx.yaw : M[0x2411];
      let d = y - yaw; d -= 72 * Math.round(d / 72); turned += Math.abs(d); yaw = y;
      return { walk: Math.hypot(p.x - p0.x, p.z - p0.z), turn: turned, aim: M[0x2465] - x0 };
    };
  };
  // the seconds until a series first reaches v, from the start of the first round or pass that moved
  const reach = (s, k, v) => {
    let i0 = 0;
    while (i0 + 1 < s.length && s[i0 + 1][k] === s[0][k]) i0++;
    for (let i = i0 + 1; i < s.length; i++) if (s[i][k] >= v) { const a = s[i - 1], b = s[i]; return (a.t + (b.t - a.t) * (v - a[k]) / (b[k] - a[k]) - s[i0].t) / CYC; }
    return Infinity;
  };
  // the C64: at the start of each round; the fast CPU: after each pass
  const c64 = (joy, frames, pointer) => {
    const m = machine(true), out = [];
    if (pointer) { m.run(10, ['SPACE']); m.run(120); }
    const now = progress(m), up = m.rt.P.UPDATE_FRAME_INPUT_EVENTS;
    m.rt.P.UPDATE_FRAME_INPUT_EVENTS = function* (r) { out.push(Object.assign({ t: m.rt.t }, now())); return yield* up.call(this, r); };
    m.run(frames, [], joy);
    return out;
  };
  const fast = (joy, secs, pointer, pace = CMFast.PACES[0]) => {
    const m = machine(true), out = [];
    if (pointer) { m.run(10, ['SPACE']); m.run(120); }
    CMFast.pace(m.fx, pace); CMFast.set(m.fx, true);
    const now = progress(m), n0 = m.fx.n, t0 = m.rt.t;
    out.push(Object.assign({ t: m.rt.t }, now()));
    m.fast(secs, [], joy, () => out.push(Object.assign({ t: m.rt.t }, now())));
    out.passes = (m.fx.n - n0) / ((m.rt.t - t0) / CYC);
    return out;
  };
  // the C64's rounds, a pace's time each
  const paced = (c, K) => c.map((r, i) => Object.assign({}, r, { t: i * K }));
  const same = (what, k, v, f, c, tol, K) => {
    const tf = reach(f, k, v), tc = reach(K ? paced(c, K) : c, k, v), r = tf / tc - 1;
    const line = what + ': ' + tf.toFixed(2) + ' s with the fast CPU, ' + (K ? (tc * CYC / K).toFixed(2) + ' rounds (' + reach(c, k, v).toFixed(2) + ' s) on the C64' : tc.toFixed(2) + ' s on the C64');
    // a press shows two or three ticks on, which at the fastest pace is more than 1 % of a walk
    if (!(Math.abs(r) <= tol || (K && Math.abs(tf - tc) <= 3 * 16422 / CYC))) fail(line);
    else console.log(line + ' (' + (100 * r).toFixed(1) + ' %)');
  };
  const c64walk = c64(1, 700), c64turn = c64(4, 1000);
  for (const pace of CMFast.PACES) {
    const K = pace * 16422, walk = fast(1, 6 * K / CYC, false, pace);
    if (pace === CMFast.PACES[0]) {
      if (Math.abs(walk.passes - CYC / 16422) > 0.5) fail('the fast CPU ran ' + walk.passes.toFixed(1) + ' passes a second, the timer ticks ' + (CYC / 16422).toFixed(1));
      else console.log('the fast CPU: ' + walk.passes.toFixed(1) + ' passes of the main loop a second, one each tick of the timer');
    }
    same('pace ' + pace + ' ticks: walking 1,200 of the game\'s units', 'walk', 1200, walk, c64walk, 0.01, K);
    same('pace ' + pace + ' ticks: turning a whole turn', 'turn', 72, fast(4, 24 * K / CYC + 2, false, pace), c64turn, 0.01, K);
  }
  same('moving the pointer 30 pixels', 'aim', 30, fast(8, 0.8, true), c64(8, 40, true), 0.05);
}

// ---- a press that sets an action off: once, and again each second it is held for when it repeats
{
  const m = machine(true);
  CMFast.set(m.fx, true);
  m.fast(1);
  const y0 = m.rt.M[0x2411];
  let y = y0, turns = [];
  const each = () => { if (m.rt.M[0x2411] !== y) turns.push({ t: m.rt.goal }); y = m.rt.M[0x2411]; };
  m.fast(0.1, ['U'], 0, each); m.fast(2, [], 0, each);
  if (turns.length !== 1 || (m.rt.M[0x2411] - y0 + 72) % 72 !== 36) fail('U tapped for 0.1 s turned the view ' + turns.length + ' times');
  else console.log('U tapped for 0.1 s turns about once');
  turns = [];
  m.fast(4, ['U'], 0, each); m.fast(1, [], 0, each);
  if (turns.length !== 1) fail('U held for 4 s turned the view ' + turns.length + ' times');
  else console.log('U held for 4 s turns about once');
  turns = [];
  m.fast(4, ['CBM', 'X'], 0, each);
  const off = turns.filter((r, i) => i && r.t - turns[i - 1].t !== m.fx.K);
  if (turns.length < 4 || off.length) fail('a quarter turn held for 4 s turned the view ' + turns.length + ' times, ' + off.length + ' other than a second after the last');
  else console.log('a quarter turn held for 4 s turns ' + turns.length + ' times, each a second after the last');
}

// ---- the same controls, pass for pass, make the same game at any rate the page is drawn at
{
  // the controls by the pass: walk, turn, look, aim, a turn about, a run, the pointer moved
  const PLAN = [[0, 1], [150, 1, 'R'], [240, 4], [330, 5], [420, 8], [480, 0, 'U'], [490, 1], [600, 2], [700, 0, 'P'],
    [760, 9], [860, 0, 'L'], [900, 1, 'W'], [1000, 0, 'SPACE'], [1010, 8], [1100, 0, 'SPACE'], [1110, 6], [1300, 1]];
  const N = 1500;
  const play = (frames, onFrame, pace = CMFast.PACES[0]) => {
    const m = machine(true), rt = m.rt;
    CMFast.pace(m.fx, pace); CMFast.set(m.fx, true);
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
  // at 144 frames a second, the frames whose view is between two passes
  let between = 0, frames144 = 0;
  const watch = m => { frames144++; const v = CMFast.latest(m.fx, m.st); if (v && v.phi % 1) between++; };
  const check = (runs, what) => {
    const [first, ...rest] = Object.keys(runs);
    let same = true;
    for (const r of rest) {
      const i = runs[r].findIndex((h, k) => h !== runs[first][k]);
      if (i >= 0 || runs[r].length !== runs[first].length) { same = false; fail(what + ', ' + r + ': the game differs from ' + first + ' at pass ' + 25 * (i + 1)); }
    }
    if (same) console.log(what + ': ' + N + ' passes of walking, turning, looking and aiming, the same game, byte for byte, at ' + Object.keys(runs).join(', '));
  };
  check({
    '60 frames a second': play(() => 1000 / 60),
    '144 frames a second': play(() => 1000 / 144, watch),
    'frames 4 to 40 ms apart': play(() => 4 + 36 * rnd()),
    'a machine that keeps up with a pass in four, a frame each quarter second': play(() => 250),
  }, 'a step a second');
  const last = CMFast.PACES[CMFast.PACES.length - 1];
  check({ '60 frames a second': play(() => 1000 / 60, null, last), '144 frames a second': play(() => 1000 / 144, null, last) }, 'a step each ' + last + ' ticks');
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
