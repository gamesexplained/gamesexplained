'use strict';
// The Play tab's Fast CPU (site/lib/fast-cpu.js, with Castle Master's table in port/page/fast-table.js)
// as the page runs it, in node on the memory the page carries, from the loader's jump. A refresh is
// FastCPU.run for the real time since the last, as the page's tick calls it; K is the Speed's ticks
// to a C64 step.
// - off means off: loaded but off, it changes nothing: the machine is the same, byte for byte and
//   cycle for cycle, as one without it, every 25 of 1,840 C64 video frames of play;
// - the frame limiter: no tick starts more than one loop, a loop each tick real time reaches, no
//   refresh runs more than the cap, and the time past the cap is dropped;
// - same keys, same game: 1,500 loops of planned presses leave the same memory every 25 loops at 60
//   refreshes a second, at 144, 4 to 40 ms apart, on a computer that manages a loop in four ticks,
//   and at a refresh each quarter second; at 1× and at 5×;
// - the clock's jobs: in an area with a sensor, the scripts' ten-second timer and the strength the
//   sensor takes change at the same moments with Fast CPU on and off, and on, the loop sees the
//   timer's event within a tick;
// - whole steps: at every Speed, K loops of a walk, a turn and a look end exactly where one C64 loop
//   of it ends;
// - speeds: at every Speed, walking 1,200 units and turning all the way round take the C64's loops
//   for them at K ticks a loop, within 1 % or 3 ticks; the pointer goes 30 pixels in the C64's
//   time, within 5 %;
// - switches: at every Speed, a tap of U turns about once, held 4 s still once, and a quarter turn
//   (the Commodore key and X) held 4 s turns again every K ticks exactly;
// - stopping: at every Speed, a walk, a turn and a look stop in the loop where the key comes up;
// - messages: under a message play goes on, and the area's name comes back 50 ticks after it, as
//   on the C64;
// - five minutes of random play in many areas, Fast CPU and the Speed switched now and then, throw
//   nothing and leave every angle in the game's range;
// - no frame behind: after each refresh the machine has run nothing past its last loop, the view on
//   show is that loop's copy to the screen, a key down before a refresh changes that refresh's
//   view, and at the game's own angles the C64-pixel renderer paints the game's frame (the mark
//   test_modern.js holds it to).
// port/test/fast-browser.js checks the page in Chromium.
//   node games/c64/castle-master/test_fast.js [part: off, limiter, same, clock, whole, speeds, switches,
//     stopping, messages, random, behind]
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('c64'); g.lib('sid'); g.lib('cpu6502'); g.lib('fast-cpu');
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
if (!page.includes('<script src="../../lib/fast-cpu.js"></script>')) { console.log('FAIL: play.html does not load ../../lib/fast-cpu.js'); process.exit(1); }
if (!blocks.includes('port/page/fast-table.js')) { console.log('FAIL: play.html has no port/page/fast-table.js'); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'CMPort');
const { CMPage, CMModern, FastCPU, CM_FAST: T } = globalThis;
const cost = JSON.parse(/^window\.CM_COST = (.*);$/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="cm-data">([^<]*)<\/script>/.exec(page)[1]);
const HZ = T.hz, TICK_MS = 1000 * T.tick / HZ, REFRESH = 1000 / 60, SPEEDS = T.speeds.map((s, i) => Object.assign({ i }, s));

const ONLY = process.argv[2] || '', part = name => !ONLY || ONLY === name;
let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const s16 = v => (v << 16) >> 16;
const hash = rt => crypto.createHash('md5').update(rt.M).update(rt.colour).digest('hex') + ':' + rt.t;
// where the player stands and faces, the angles with their share of a step
const pose = (M, P) => ({
  x: s16(M[0x2407] | M[0x2408] << 8), y: s16(M[0x2409] | M[0x240A] << 8), z: s16(M[0x240B] | M[0x240C] << 8),
  yaw: M[0x2411] + P.plug.frac(0x2411), pitch: M[0x2410] + P.plug.frac(0x2410),
});
const same = (a, b) => a.x === b.x && a.y === b.y && a.z === b.z && a.yaw === b.yaw && a.pitch === b.pitch;
const show = p => '(' + p.x + ', ' + p.y + ', ' + p.z + ') facing ' + +p.yaw.toFixed(3) + ', ' + +p.pitch.toFixed(3);

// a machine at the first view of the Wilderness, with the page's modern view and Fast CPU loaded
// (off), as the page loads them, unless bare
function machine(bare) {
  const rt = CMPage.create({ data, cost });
  const st = bare ? null : CMModern.attach(rt), fx = bare ? null : FastCPU.attach(rt, T);
  const M = rt.M, P = rt.P;
  const press = (keys = [], joy = 0) => { rt.input.keys = new Set(keys); rt.input.joy = 0x1F & ~joy; };
  const run = (n, keys, joy, each) => { press(keys, joy); for (let i = 0; i < n; i++) { rt.runFrame(); if (each) each(); } press(); };
  const tap = (k, hold, after) => { run(hold, [k]); run(after); };
  run(60); tap('1', 6, 54); tap('RETURN', 6, 54); tap('2', 6, 54); tap('RETURN', 6, 454); tap('SPACE', 6, 300);
  // refreshes ms apart for secs of real time, the keys held
  const refresh = (secs, keys, joy, each, ms = REFRESH) => {
    press(keys, joy);
    for (let i = 0, n = Math.round(secs * 1000 / ms); i < n; i++) { FastCPU.run(fx, ms); if (each) each(); }
    press();
  };
  // fn at the start of each loop, as UPDATE_FRAME_INPUT_EVENTS ($47F0) begins (null for none)
  let hook = null;
  const onLoop = fn => {
    if (!hook) {
      const up = P.UPDATE_FRAME_INPUT_EVENTS;
      P.UPDATE_FRAME_INPUT_EVENTS = function* (r) { if (hook.fn) hook.fn(); return yield* up.call(this, r); };
      hook = {};
    }
    hook.fn = fn;
  };
  // the loops that read the controls (READ_CONTROL_INPUT): the one that shows the lightning's
  // streak does not, on the C64 or with Fast CPU
  const reads = { n: 0 };
  const read = P.READ_CONTROL_INPUT;
  P.READ_CONTROL_INPUT = function (r) { reads.n++; return read.call(this, r); };
  // the keys held for one whole C64 loop, from the start of the next
  const once = (keys, joy) => {
    let n = 0;
    onLoop(() => { n++; press(n === 1 ? keys : [], n === 1 ? joy : 0); });
    while (n < 2) rt.runFrame();
    onLoop(null);
  };
  // the scripts' own jump to an area (token $12: area, entrance), run from the next loop's scripts
  let jump = null;
  const go = to => {
    if (!jump) {
      const cond = P.DISPATCH_FRAME_CONDITIONS;
      P.DISPATCH_FRAME_CONDITIONS = function* (r) {
        if (jump && jump.to) {
          const keep = Array.from(M.subarray(0x33C, 0x33F));
          M.set([0x12, jump.to[0], jump.to[1]], 0x33C); M[0x1084] |= 1; M[0x7C] = 0x3C; M[0x7D] = 0x03;
          jump.to = null;
          yield* P.EXECUTE_FCL_STREAM({ a: 3 });
          M.set(keep, 0x33C);
        }
        return yield* cond.call(this, r);
      };
      jump = {};
    }
    jump.to = to;
  };
  return { rt, st, fx, M, P, press, run, tap, refresh, onLoop, once, go, reads };
}
// a machine with Fast CPU on at a Speed, at the start of a loop
function fastMachine(speed) {
  const m = machine();
  FastCPU.set(m.fx, true, speed.i);
  m.refresh(0.2);
  return m;
}

// ---- off means off
if (part('off')) {
  const trace = bare => {
    const m = machine(bare), out = [];
    if (!bare) FastCPU.set(m.fx, false, SPEEDS.length - 1);
    let f = 0;
    const each = () => { if (f++ % 25 === 0) out.push(hash(m.rt)); };
    for (const [n, keys, joy] of [[300, [], 1], [200, [], 8], [100, ['P']], [200, [], 1], [100, ['U']], [200, [], 5], [50, ['R']], [300, [], 1], [60, ['SPACE']], [100, [], 8], [30, [], 16], [200]]) m.run(n, keys, joy, each);
    return out;
  };
  const a = trace(true), b = trace(false);
  const i = a.findIndex((h, k) => h !== b[k]);
  if (i >= 0 || a.length !== b.length) fail('off means off: with Fast CPU loaded and off, the machine differs at sample ' + i + ' of ' + a.length);
  else console.log('off means off: ' + a.length + ' samples over 1,840 C64 video frames of play, the same machine with Fast CPU loaded and off');
}

// ---- the frame limiter
if (part('limiter')) {
  const m = fastMachine(SPEEDS[0]), rt = m.rt;
  // the tick each loop starts on, and the tick its wait (if any) ended on
  const starts = [], ends = [];
  m.onLoop(() => starts.push(rt.ticks));
  const ended = () => ends.push(rt.ticks);
  // ten seconds of 60 refreshes a second, turning: a loop on each tick, but for a wait's
  let most = 0, loops = 0;
  const t0 = rt.ticks;
  m.press([], 8);
  for (let i = 0; i < 600; i++) { const n = FastCPU.run(m.fx, REFRESH, ended); most = Math.max(most, n); loops += n; }
  const ticks = rt.ticks - t0, waited = ends.reduce((a, e, i) => a + e - starts[i], 0);
  // a refresh a second late, then one on time: the clock moves on by the cap's loops, the rest dropped
  const c0 = rt.t, late = FastCPU.run(m.fx, 1000, ended), ran = rt.t - c0, next = FastCPU.run(m.fx, REFRESH, ended);
  // a refresh each quarter second
  let quarter = 0;
  for (let i = 0; i < 20; i++) quarter = Math.max(quarter, FastCPU.run(m.fx, 250, ended));
  m.press();
  const twice = starts.filter((s, i) => i && s <= starts[i - 1]).length;
  // the next loop starts on the first tick after the last one ends
  const gaps = starts.slice(1, loops).filter((s, i) => s !== ends[i] + 1).length;
  if (twice) fail('the frame limiter: ' + twice + ' loops started on the tick of the loop before');
  else if (gaps || Math.abs(loops + waited - ticks) > 1) fail('the frame limiter: ' + loops + ' loops and ' + waited + ' ticks of waits in ' + ticks + ' ticks; ' + gaps + ' loops started later than the tick after the last ended');
  else if (most > 1 || late !== T.cap || quarter !== T.cap || next > 1 || ran > (T.cap + 1) * T.tick) fail('the frame limiter: ' + most + ' loops at most at 60 refreshes a second, ' + late + ' in a refresh a second late (' + (ran / T.tick).toFixed(2) + ' ticks of the clock), ' + next + ' in the next, ' + quarter + ' at most a quarter second apart');
  else console.log('the frame limiter: ' + loops + ' loops in ' + ticks + ' ticks, each on the tick after the last ended (' + waited + ' ticks of waits); a refresh a second late runs ' + late + ' and the clock ' + (ran / T.tick).toFixed(2) + ' ticks, the next ' + next + '; a quarter second apart, ' + quarter + ' a refresh');
}

// ---- same keys, same game
if (part('same')) {
  // the controls by the loop, round again every 600: walks forward and back, turns, a curve, turns
  // about, looks, the run and the walk, the pointer moved, face forward; out and back, so that at
  // 5× too the player stays on the Wilderness's grass
  const PLAN = [[0, 1], [40, 2], [80, 4], [140, 8], [230, 0, 'U'], [240, 1], [270, 0, 'U'], [280, 1], [310, 0, 'P'], [330, 9],
    [370, 6], [410, 0, 'L'], [430, 0, 'R'], [440, 1], [460, 0, 'W'], [470, 2], [500, 0, 'SPACE'], [510, 8], [560, 0, 'SPACE'],
    [570, 0, 'F'], [580, 0]];
  const N = 1500;
  // gap(n): the real time to the next refresh, after one that ran n loops
  const play = (speed, gap) => {
    const m = fastMachine(speed), rt = m.rt;
    const out = [];
    let k = 0;
    const controls = () => {
      const c = k % 600;
      let p = 0;
      while (p + 1 < PLAN.length && PLAN[p + 1][0] <= c) p++;
      m.press(PLAN[p][2] && c - PLAN[p][0] < 6 ? [PLAN[p][2]] : [], PLAN[p][1]);
    };
    controls();
    for (let n = 1, r = 0; k < N && r < 20000; r++) n = FastCPU.run(m.fx, gap(n), () => {
      k++;
      if (k % 25 === 0 && k <= N) out.push(hash(rt));
      controls();
    });
    if (k < N || m.M[0x109B]) fail('same keys, same game, ' + speed.name + ': ' + k + ' loops, the session ended for reason ' + m.M[0x109B]);
    return out;
  };
  let seed = 11;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return seed / 0x7FFFFFFF; };
  for (const speed of [SPEEDS[0], SPEEDS[SPEEDS.length - 1]]) {
    const runs = {
      '60 refreshes a second': play(speed, () => REFRESH),
      '144 refreshes a second': play(speed, () => 1000 / 144),
      'refreshes 4 to 40 ms apart': play(speed, () => 4 + 36 * rnd()),
      'a computer that manages a loop in four ticks': play(speed, n => Math.max(REFRESH, 4 * n * TICK_MS)),
      'a refresh each quarter second': play(speed, () => 250),
    };
    const [first, ...rest] = Object.keys(runs);
    let ok = true;
    for (const r of rest) {
      const i = runs[r].findIndex((h, k) => h !== runs[first][k]);
      if (i >= 0 || runs[r].length !== runs[first].length) { ok = false; fail('same keys, same game, ' + speed.name + ', ' + r + ': the game differs from ' + first + ' at loop ' + 25 * (i + 1)); }
    }
    if (ok) console.log('same keys, same game, ' + speed.name + ': ' + N + ' loops of walking, turning, looking and aiming leave the same memory, every 25 loops, at ' + Object.keys(runs).join(', '));
  }
}

// ---- the clock's jobs
if (part('clock')) {
  // in area 6 (a sensor) by the scripts' jump, the moments in the C64's cycles that the ten-second
  // timer ($246D) and strength ($2455) change, and that the loop takes the timer's event ($246C)
  const watch = on => {
    const m = machine(), M = m.M, rt = m.rt;
    m.go([6, 215]); m.run(300);
    const seen = { timer: [], strength: [], event: [] }, was = { timer: M[0x246D], strength: M[0x2455], event: M[0x246C] };
    const each = () => {
      for (const [k, a] of [['timer', 0x246D], ['strength', 0x2455], ['event', 0x246C]]) {
        if (M[a] !== was[k]) { seen[k].push({ v: M[a], t: rt.t }); was[k] = M[a]; }
      }
    };
    if (on) { FastCPU.set(m.fx, true, 0); m.refresh(32, [], 0, each); }
    else m.run(Math.round(32 * HZ / CMPage.FRAME), [], 0, each);
    return { seen, sensors: M[0x109A] };
  };
  const off = watch(false), on = watch(true);
  // the same moments within a tenth of a second: without Fast CPU the page's C64 serves an
  // interrupt at the end of the stretch of the game's code it falls in, up to a few ticks late
  const near = (a, b) => a.length === b.length && a.every((x, i) => x.v === b[i].v && Math.abs(x.t - b[i].t) <= HZ / 10);
  const most = (a, b) => Math.max(...a.map((x, i) => Math.abs(x.t - b[i].t))) / T.tick;
  // with Fast CPU on, ten seconds of ticks apart
  const apart = on.seen.timer.slice(1).every((x, i) => Math.abs(x.t - on.seen.timer[i].t - 600 * T.tick) < T.tick);
  const late = on.seen.timer.map((x, i) => on.seen.event[i] ? on.seen.event[i].t - x.t : Infinity);
  if (!off.sensors || off.seen.timer.length < 3 || off.seen.strength.length < 3) fail('the clock\'s jobs: ' + off.sensors + ' sensors, ' + off.seen.timer.length + ' timer events and ' + off.seen.strength.length + ' points of strength lost in 32 s');
  else if (!near(off.seen.timer, on.seen.timer) || !near(off.seen.strength, on.seen.strength) || !apart) fail('the clock\'s jobs: off, the timer at ' + off.seen.timer.map(x => x.t).join(', ') + ' and strength at ' + off.seen.strength.map(x => x.t).join(', ') + '; on, at ' + on.seen.timer.map(x => x.t).join(', ') + ' and ' + on.seen.strength.map(x => x.t).join(', '));
  else if (late.some(d => d > 2 * T.tick)) fail('the clock\'s jobs: with Fast CPU on, the loop took the timer\'s event ' + late.map(d => (d / T.tick).toFixed(1)).join(', ') + ' ticks after it');
  else console.log('the clock\'s jobs: in an area with a sensor, ' + on.seen.timer.length + ' ten-second timer events and ' + on.seen.strength.length + ' points of strength lost at the same moments with Fast CPU on and off, within ' + Math.max(most(off.seen.timer, on.seen.timer), most(off.seen.strength, on.seen.strength)).toFixed(1) + ' ticks; on, 600 ticks apart, and the loop takes each event ' + (Math.max(...late) < T.tick ? 'in the tick it is raised' : 'within ' + Math.max(...late.map(d => Math.ceil(d / T.tick))) + ' ticks'));
}

// ---- whole steps in open space
if (part('whole')) {
  const keysOf = { 'a walk': [[], 1], 'a turn': [[], 8], 'a look up': [['P'], 0] };
  // one C64 loop with the key held, from the Wilderness's first view
  const c64 = what => {
    const m = machine(true), [keys, joy] = keysOf[what];
    let loops = 0, after = null;
    m.onLoop(() => { loops++; if (loops === 2) after = pose(m.M, m.P); m.press(loops === 1 ? keys : [], loops === 1 ? joy : 0); });
    while (loops < 3) m.rt.runFrame();
    return after;
  };
  // K loops of it with Fast CPU on, each reading the keys
  const fast = (what, speed) => {
    const m = fastMachine(speed), [keys, joy] = keysOf[what], r0 = m.reads.n;
    let after = null, later = null, n = 0;
    m.press(keys, joy);
    while (n < 4) FastCPU.run(m.fx, REFRESH, () => {
      if (after) { if (++n === 3) later = pose(m.M, m.P); }
      else if (m.reads.n - r0 === speed.K) { after = pose(m.M, m.P); m.press(); }
    });
    return { after, later };
  };
  const start = pose(machine(true).M, { plug: { frac: () => 0 } });
  for (const what of Object.keys(keysOf)) {
    const want = c64(what);
    if (same(want, start)) { fail('whole steps: ' + what + ' did not move on the C64'); continue; }
    const bad = SPEEDS.map(s => [s, fast(what, s)]).filter(([, f]) => !same(f.after, want) || !same(f.later, want));
    if (bad.length) bad.forEach(([s, f]) => fail('whole steps, ' + s.name + ': ' + s.K + ' loops of ' + what + ' end at ' + show(f.after) + ', the C64\'s loop at ' + show(want)));
    else console.log('whole steps: ' + what + ', ' + SPEEDS.map(s => s.K).join(', ') + ' loops at ' + SPEEDS.map(s => s.name).join(', ') + ' end exactly where one C64 loop ends, ' + show(want));
  }
}

// ---- speeds
if (part('speeds')) {
  // what each move has done so far: the distance from where it began, the turn, the pointer's travel
  const progress = m => {
    const M = m.M, p0 = pose(M, m.P), x0 = M[0x2465];
    let yaw = p0.yaw, turned = 0;
    return () => {
      const p = pose(M, m.P);
      let d = p.yaw - yaw; d -= 72 * Math.round(d / 72); turned += Math.abs(d); yaw = p.yaw;
      return { walk: Math.hypot(p.x - p0.x, p.z - p0.z), turn: turned, aim: M[0x2465] - x0 };
    };
  };
  // the seconds until a series first reaches v, from the start of the first loop that moved
  const reach = (s, k, v) => {
    let i0 = 0;
    while (i0 + 1 < s.length && s[i0 + 1][k] === s[0][k]) i0++;
    for (let i = i0 + 1; i < s.length; i++) if (s[i][k] >= v) { const a = s[i - 1], b = s[i]; return (a.t + (b.t - a.t) * (v - a[k]) / (b[k] - a[k]) - s[i0].t) / HZ; }
    return Infinity;
  };
  // the C64: at the start of each loop; Fast CPU: after each refresh
  // the lightning put off (its countdown in seconds, $2459), which would take a loop and its flash
  // out of a move on either machine
  const c64 = (joy, frames, pointer) => {
    const m = machine(), out = [];
    if (pointer) { m.run(10, ['SPACE']); m.run(120); }
    m.M[0x2459] = 200;
    const now = progress(m);
    m.onLoop(() => out.push(Object.assign({ t: m.rt.t }, now())));
    m.run(frames, [], joy);
    return out;
  };
  const fast = (joy, secs, pointer, speed) => {
    const m = machine(), out = [];
    if (pointer) { m.run(10, ['SPACE']); m.run(120); }
    FastCPU.set(m.fx, true, speed.i);
    m.refresh(0.2);
    m.M[0x2459] = 200;
    const now = progress(m);
    out.push(Object.assign({ t: m.rt.t }, now()));
    m.refresh(secs, [], joy, () => out.push(Object.assign({ t: m.rt.t }, now())));
    return out;
  };
  // the C64's loops, K ticks each
  const paced = (c, K) => c.map((r, i) => Object.assign({}, r, { t: i * K * T.tick }));
  const check = (what, k, v, f, c, tol, K) => {
    const tf = reach(f, k, v), tc = reach(K ? paced(c, K) : c, k, v), r = tf / tc - 1;
    const line = what + ': ' + tf.toFixed(2) + ' s with Fast CPU, ' + (K ? (tc * HZ / (K * T.tick)).toFixed(2) + ' C64 loops (' + reach(c, k, v).toFixed(2) + ' s on the C64)' : tc.toFixed(2) + ' s on the C64');
    // a press shows a tick on, which at the fastest Speed is more than 1 % of a walk
    if (!(Math.abs(r) <= tol || (K && Math.abs(tf - tc) <= 3 * TICK_MS / 1000))) fail('speeds, ' + line);
    else console.log('speeds, ' + line + ' (' + (100 * r).toFixed(1) + ' %)');
  };
  const c64walk = c64(1, 700), c64turn = c64(8, 1600);
  for (const speed of SPEEDS) {
    check(speed.name + ', walking 1,200 units', 'walk', 1200, fast(1, 7 * speed.K / 60, false, speed), c64walk, 0.01, speed.K);
    check(speed.name + ', turning all the way round', 'turn', 72, fast(8, 25 * speed.K / 60 + 1, false, speed), c64turn, 0.01, speed.K);
  }
  check('the pointer moving 30 pixels', 'aim', 30, fast(8, 0.8, true, SPEEDS[0]), c64(8, 40, true), 0.05);
}

// ---- switches
if (part('switches')) for (const speed of SPEEDS) {
  const m = fastMachine(speed), M = m.M, rt = m.rt;
  const y0 = M[0x2411];
  let y = y0, turns = [];
  const each = () => { if (M[0x2411] !== y) turns.push(rt.ticks); y = M[0x2411]; };
  const hold = (secs, keys, joy) => { m.press(keys, joy); for (let i = 0, n = Math.round(secs * 60); i < n; i++) FastCPU.run(m.fx, REFRESH, each); m.press(); };
  hold(0.1, ['U']); hold(2, []);
  const tap = turns.length, about = (M[0x2411] - y0 + 72) % 72;
  turns = [];
  hold(4, ['U']); hold(1, []);
  const held = turns.length;
  turns = [];
  hold(4, ['CBM'], 8);
  const off = turns.filter((t, i) => i && t - turns[i - 1] !== speed.K);
  if (tap !== 1 || about !== 36) fail('switches, ' + speed.name + ': U tapped for 0.1 s turned the view ' + tap + ' times, by ' + about);
  else if (held !== 1) fail('switches, ' + speed.name + ': U held for 4 s turned the view ' + held + ' times');
  else if (turns.length < Math.floor(240 / speed.K) || off.length) fail('switches, ' + speed.name + ': a quarter turn held for 4 s turned ' + turns.length + ' times, ' + off.length + ' other than ' + speed.K + ' ticks after the last');
  else console.log('switches, ' + speed.name + ': U tapped turns about once, held 4 s still once; a quarter turn held 4 s turns ' + turns.length + ' times, ' + speed.K + ' ticks apart');
}

// ---- stopping
if (part('stopping')) {
  const bad = [];
  for (const speed of SPEEDS) for (const [what, keys, joy] of [['a walk', [], 1], ['a turn', [], 8], ['a look up', ['P'], 0]]) {
    const m = fastMachine(speed), r0 = m.reads.n;
    // held for a loop short of two steps, so it comes up partway through one: where each loop that
    // read the key left the player, and each loop after
    const H = 2 * speed.K - 1, held = [], after = [];
    m.press(keys, joy);
    while (after.length < 4) FastCPU.run(m.fx, REFRESH, () => {
      if (held.length < H) { if (m.reads.n - r0 > held.length) held.push(pose(m.M, m.P)); if (held.length === H) m.press(); }
      else after.push(pose(m.M, m.P));
    });
    const last = held[H - 1];
    if (same(last, held[H - 2]) || !after.every(p => same(p, last))) bad.push(speed.name + ', ' + what + ': ' + show(held[H - 2]) + ', ' + show(last) + ' as the key comes up, then ' + after.map(show).join(', '));
  }
  if (bad.length) bad.forEach(b => fail('stopping, ' + b));
  else console.log('stopping: at ' + SPEEDS.map(s => s.name).join(', ') + ', a walk, a turn and a look move in the last loop that reads the key and not in the loops after it comes up');
}

// ---- messages
if (part('messages')) {
  // W (the walk: the mode's word in the panel, the countdown at $1063 set to 50 ticks) pressed at
  // the start of a loop, looking up at the sky, where a C64 loop takes less than the countdown; the
  // ticks to the area's name ($2419) back in the panel
  const said = on => {
    const m = machine(), M = m.M, P = m.P, rt = m.rt;
    m.once(['CBM', 'P']); m.once([]);
    const words = [];
    let loops = 0, moved = null;
    const text = P.DRAW_TEXT_TO_BITMAP;
    P.DRAW_TEXT_TO_BITMAP = function (r) { words.push({ name: (M[0x7E] | M[0x7F] << 8) === 0x2419, tick: rt.ticks, loops }); return text.call(this, r); };
    const p0 = pose(M, P);
    if (on) {
      // W for a loop, then a turn under the message
      FastCPU.set(m.fx, true, 0);
      m.refresh(0.2);
      m.press(['W']);
      for (let i = 0; i < 120; i++) FastCPU.run(m.fx, REFRESH, () => { loops++; m.press([], loops < 6 ? 0 : 8); });
      m.press();
      moved = pose(M, P).yaw - p0.yaw;
    } else {
      m.onLoop(() => { loops++; m.press(loops === 1 ? ['W'] : []); });
      m.run(250);
    }
    const w = words.find(x => !x.name), back = w && words.find(x => x.name && x.tick > w.tick);
    return { ticks: back ? back.tick - w.tick : null, loops: back ? back.loops - w.loops : 0, moved };
  };
  const off = said(false), on = said(true);
  if (off.ticks === null || on.ticks === null) fail('messages: no message and name back, ' + off.ticks + ' and ' + on.ticks + ' ticks');
  else if (Math.abs(on.ticks - 50) > 1 || Math.abs(off.ticks - 50) > 1) fail('messages: the area\'s name back ' + on.ticks + ' ticks after the message with Fast CPU, ' + off.ticks + ' on the C64');
  else if (on.loops < on.ticks - 1 || !on.moved) fail('messages: under the message ' + on.loops + ' loops ran in ' + on.ticks + ' ticks, the view turned ' + on.moved);
  else console.log('messages: the area\'s name back ' + on.ticks + ' ticks after the message with Fast CPU, ' + off.ticks + ' on the C64; under it ' + on.loops + ' loops ran and the view turned ' + +on.moved.toFixed(2) + ' steps');
}

// ---- random play
if (part('random')) {
  let seed = 7;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return seed / 0x7FFFFFFF; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const m = machine(), rt = m.rt, M = m.M, P = m.P;
  FastCPU.set(m.fx, true, 0);
  const GOTO = [[4, 216], [2, 7], [6, 215], [9, 224], [13, 219], [22, 222], [11, 19], [16, 214], [8, 226], [15, 7], [17, 222], [21, 216], [3, 174], [5, 164], [10, 221], [14, 215], [19, 226], [24, 2]];
  const KEYS = ['W', 'R', 'C', 'U', 'F', 'P', 'L', 'A', 'SPACE', '+', 'Z', 'X', 'CBM'], JOY = [0, 1, 2, 4, 8, 5, 9, 1, 1, 16];
  const areas = new Set(), bad = new Set();
  let next = 0, threw = null, loops = 0;
  const angles = () => {
    const yaw = M[0x2411], pitch = M[0x2410], fy = P.plug.frac(0x2411), fp = P.plug.frac(0x2410);
    if (yaw >= 72) bad.add('yaw ' + yaw);
    if (pitch > 18 && pitch < 54) bad.add('pitch ' + pitch);
    if (fy < 0 || fy >= 1 || fp < 0 || fp >= 1) bad.add('a share of a step of ' + fy + ', ' + fp);
    if (pitch === 18 && fp) bad.add('pitch past 18 by ' + fp);
  };
  for (let k = 0; k < 300 * 60 && !threw; k++) {
    const t = k / 60;
    if (t >= next) {
      const keys = new Set(); if (rnd() < 0.4) keys.add(pick(KEYS)); if (rnd() < 0.1) keys.add('CBM');
      m.press([...keys], pick(JOY)); next = t + 0.2 + 1.8 * rnd();
    }
    if (k % 1200 === 600) m.go(pick(GOTO));
    if (k % 3600 === 3599) FastCPU.set(m.fx, !m.fx.on);
    if (k % 1800 === 900) FastCPU.set(m.fx, m.fx.on, Math.floor(rnd() * SPEEDS.length));
    try {
      if (m.fx.on) { loops += FastCPU.run(m.fx, REFRESH, angles); CMModern.between(m.st, rt.P, true); }
      else rt.runFrame();
    } catch (e) { threw = e; fail('random play, ' + t.toFixed(1) + ' s: ' + e.message); }
    areas.add(M[0x2429]);
    angles();
  }
  if (bad.size) fail('random play left: ' + [...bad].slice(0, 4).join(', '));
  else if (!threw) console.log('random play: five minutes in ' + areas.size + ' areas, ' + loops + ' loops with Fast CPU on: nothing thrown, every angle in the game\'s range');
}

// ---- no frame behind
if (part('behind')) {
  const m = fastMachine(SPEEDS[0]), st = m.st, M = m.M, rt = m.rt;
  let seed = 3;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return seed / 0x7FFFFFFF; };
  const N = { refreshes: 0, ahead: 0, behind: 0, notGame: 0, pressed: 0, unchanged: 0, whole: 0, px: 0, pxBad: 0 };
  // a refresh as the page's tick makes one: the loops owed, then the view over the screen; the
  // copies to the screen counted (st.n) when it began, as its last loop began, and as that ended
  const refresh = ms => {
    const r = { before: st.n, last: st.n, end: st.n };
    r.n = FastCPU.run(m.fx, ms, () => { r.last = r.end; r.end = st.n; });
    if (!r.n) return null;
    N.refreshes++;
    if (st.n !== r.end) N.ahead++;
    r.view = CMModern.between(st, rt.P, true); r.f = CMModern.latest(st);
    if (r.f && r.f.pic && (!r.view || r.view.shown !== r.f)) N.behind++;
    if (r.view && (!st.flips.includes(r.view.shown) || !r.view.shown.pic || r.view.shown.t > rt.t)) N.notGame++;
    return r;
  };
  // turns started and stopped at random, refreshes 4 to 40 ms apart: a key down before a refresh
  // changes that refresh's view
  let last = null, held = 0;
  for (let i = 0; i < 900; i++) {
    const was = held;
    if (rnd() < 0.08) held = held ? 0 : [8, 4][Math.floor(rnd() * 2)];
    m.press([], held);
    const r0 = m.reads.n, r = refresh(4 + 36 * rnd());
    if (!r || !r.view) continue;
    // a refresh whose loops read the keys (not only the lightning's streak)
    const yaw = r.view.scene.pose.yaw;
    if (held && !was && last !== null && m.reads.n > r0) { N.pressed++; if (yaw === last) N.unchanged++; }
    last = yaw;
  }
  // at the game's own angles (a walk, and turns of K loops), each refresh whose last loop copied the
  // view: the C64-pixel renderer against the game's own buffer as its drawing of the objects left it
  // (before the sight goes on), two bits a pixel, as test_modern.js compares them
  const K = SPEEDS[0].K, draw = m.P.DRAW_SORTED_VISIBLE_QUEUE;
  m.P.DRAW_SORTED_VISIBLE_QUEUE = function (r) {
    const v = draw.call(this, r), pic = st.pending;
    if (pic) pic.gameBuffer = M.slice(pic.buffer, pic.buffer + 3600);
    return v;
  };
  const whole = (loops, keys, joy) => {
    let left = loops;
    m.press(keys, joy);
    while (left > 0) {
      const r = refresh(REFRESH);
      if (!r) continue;
      left -= r.n;
      if (left <= 0) m.press();
      const f = r.f;
      if (!f || !f.pic || !f.pic.gameBuffer || f.n <= r.last || !Number.isInteger(f.pic.pose.yaw) || !Number.isInteger(f.pic.pose.pitch)) continue;
      const buf = CMModern.paintBuffer(r.view.scene);
      let d = 0;
      for (let k = 0; k < 3600; k++) { const x = f.pic.gameBuffer[k] ^ buf[k]; if (x) for (let q = 0; q < 8; q += 2) if ((x >> q) & 3) d++; }
      N.whole++; N.px += 14400; N.pxBad += d;
    }
  };
  // in the Wilderness, a turn back to the game's own angles, then a walk, turns and looks of whole
  // steps; then the same in three areas inside, reached by the scripts' jump
  const frac = m.P.plug.frac(0x2411);
  if (frac) whole(Math.round((1 - frac) * K / m.M[0x9D4C]), [], 8);
  for (const to of [null, [2, 7], [11, 19], [13, 219]]) {
    if (to) { m.go(to); m.refresh(3); }
    for (const [loops, keys, joy] of [[60, [], 1], [K, [], 8], [60, [], 1], [2 * K, [], 4], [K, ['L'], 0], [60, [], 2], [K, ['P'], 0]]) whole(loops, keys, joy);
  }
  const pc = (a, b) => (100 * a / b).toFixed(2) + ' %';
  if (N.ahead || N.behind || N.notGame) fail('no frame behind: of ' + N.refreshes + ' refreshes, ' + N.ahead + ' ran past their last loop, ' + N.behind + ' showed an older copy, ' + N.notGame + ' a view the game did not copy');
  else if (!N.pressed || N.unchanged) fail('no frame behind: ' + N.unchanged + ' of ' + N.pressed + ' turns pressed before a refresh left its view as it was');
  else if (N.whole < 20 || N.pxBad > N.px / 50) fail('no frame behind: at the game\'s own angles, ' + N.whole + ' views, the renderer paints the game\'s pixels in ' + pc(N.px - N.pxBad, N.px));
  else console.log('no frame behind: ' + N.refreshes + ' refreshes each show the copy of their last loop and run nothing past it; ' + N.pressed + ' turns pressed before a refresh each change its view; at the game\'s own angles the renderer paints ' + pc(N.px - N.pxBad, N.px) + ' of the game\'s pixels in ' + N.whole + ' views');
}

if (fails) { console.log(fails + ' failed'); process.exit(1); }
console.log('ok');
