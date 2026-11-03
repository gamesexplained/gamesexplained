'use strict';
// The Play tab's Fast CPU (site/lib/fast-cpu.js, with Driller's table in port/page/fast-table.js) as
// the page runs it, in node on the memory the page carries. Each machine starts from one moment:
// the hand-over, the security question answered, ENTER at the control options, a pass of play in
// Amethyst, and the program put back at the main loop as the next pass begins. A refresh is
// FastCPU.run for the real time since the last, as the page's tick calls it; K is the Speed's
// ticks to a Spectrum step.
// - off means off: loaded but off, it changes nothing: the machine is the same, byte for byte and
//   T-state for T-state, as one without it, every 25 of 1,600 Spectrum frames of play;
// - the frame limiter: no tick starts more than one loop, a loop each tick real time reaches, no
//   refresh runs more than the cap, and the time past the cap is dropped;
// - same keys, same game: 1,500 loops of planned presses leave the same memory every 25 loops at 60
//   refreshes a second, at 144, 4 to 40 ms apart, on a computer that manages a loop in four ticks,
//   and at a refresh each quarter second; at 1x and at 4x;
// - the clock's jobs: with a turn held, the game's clock (the interrupt's) changes at the same
//   moments with Fast CPU on and off, and on, a minute of it runs the scripts at the minute;
// - whole steps: at every Speed, K loops of a walk, a turn, a look and a roll end exactly where one
//   Spectrum pass of it ends;
// - speeds: at every Speed, six steps of a walk and a turn all the way round take K ticks a step,
//   within 1 % or 3 ticks; the crosshair goes 60 pixels in the Spectrum's time, within 5 %;
// - switches: at every Speed, a tap of U turns round once, held 4 s still once; the laser held
//   fires at the press and every K loops, and no less often than the Spectrum fires;
// - stopping: at every Speed, a walk, a turn and a look stop in the loop where the key comes up;
// - away: the demonstration plays its recording at the Spectrum's speed with Fast CPU on;
// - three minutes of random play, Fast CPU and the Speed switched now and then, throw nothing and
//   leave every angle in the game's range;
// - once a step: with each way of moving held, no byte of the state a saved game keeps changes
//   only once every K ticks, a step among frames that glide, unless listed as meant; a walk given
//   whole once a step is caught;
// - no frame behind: a key down before a refresh changes that refresh's screen.
//   node games/spectrum/driller/test_fast.js [part: off, limiter, same, clock, whole, speeds,
//     switches, stopping, away, random, once, behind]
const path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const g = game(__dirname);
globalThis.window = globalThis;                    // the page's scripts hand over on window
g.lib('fast-cpu');
const PAGE = 'play.html', page = g.read(PAGE);
const blocks = [...page.matchAll(/^\/\* (port\/\S+\.js) \*\/$/gm)].map(m => m[1]);
if (!page.includes('<script src="../../lib/fast-cpu.js"></script>')) { console.log('FAIL: play.html does not load ../../lib/fast-cpu.js'); process.exit(1); }
if (!blocks.includes('port/page/fast-table.js')) { console.log('FAIL: play.html has no port/page/fast-table.js'); process.exit(1); }
for (const b of blocks) g.run(PAGE, b, 'DRPort');
const { DRPage, FastCPU, DR_FAST: T } = globalThis;
const cost = JSON.parse(/^window\.DR_COST = ([\s\S]*?);\n<\/script>/m.exec(page)[1]);
const data = JSON.parse(/<script type="application\/json" id="dr-data">([^<]*)<\/script>/.exec(page)[1]);
const HZ = T.hz, TICK_MS = 1000 * T.tick / HZ, REFRESH = 1000 / 60, FRAME = DRPage.FRAME;
const SPEEDS = T.speeds.map((s, i) => Object.assign({ i }, s));

const ONLY = process.argv[2] || '', part = name => !ONLY || ONLY === name;
let fails = 0;
const fail = (...w) => { fails++; console.log('FAIL', ...w); };
const s16 = v => (v << 16) >> 16;
const tape = { save() { return true; }, load() { return null; } };
const hash = rt => crypto.createHash('md5').update(rt.M).digest('hex') + ':' + rt.t + ':' + rt.border;
const rand = seed => () => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return seed / 0x7FFFFFFF; };

// The security question's word, looked up in the game's table at $ABC1 (test_play.js)
function answer(M) {
  const num = a => +String.fromCharCode(M[a], M[a + 1]).trim();
  const [pg, line, word] = [num(0xCB38), num(0xCB52), num(0xCB6C)];
  if (!pg || !line || !word) return null;
  for (let a = 0xABC1; M[a]; a += M[a] + 4) {
    if (M[a + 1] - 0x40 !== pg || M[a + 2] !== line || M[a + 3] - 0x20 !== word) continue;
    let w = '';
    for (let i = 0; i < M[a]; i++) w += String.fromCharCode(((M[a + 4 + i] & 0xBF) | 0x80) >> 1);
    return w.toUpperCase();
  }
  return null;
}
// The moment every machine starts from: play reached from the hand-over, a turn taken, and the
// memory and the clock as the next pass's take_commands begins
const START = (() => {
  const rt = DRPage.create({ data, cost, tape });
  const run = (n, keys = []) => { rt.input.keys = new Set(keys); for (let i = 0; i < n; i++) rt.runFrame(); };
  let w = null, n = 0;
  while (!(rt.M[0xCB6F] === 0x23 && (w = answer(rt.M))) && n++ < 3000) run(1);
  if (!w) { console.log('FAIL: no security question in 3000 frames'); process.exit(1); }
  for (const ch of w.split('').concat('ENTER')) { run(8, [ch]); run(8); }
  run(100); run(10, ['ENTER']); run(300);
  let s = null;
  const tc = rt.P.take_commands;
  rt.P.take_commands = function* (r) {
    if (!s) s = { ram: Buffer.from(rt.M).toString('base64'), from: 0, border: rt.border, cpu: { tstates: rt.t, iff1: 1 } };
    return yield* tc.call(this, r);
  };
  run(2, ['W']);
  for (n = 0; !s && n < 200; n++) run(1);
  if (!s || rt.M[0x8862] !== 1) { console.log('FAIL: no pass of play in Amethyst to start from'); process.exit(1); }
  return s;
})();

// where the probe stands and faces: x, height and z, the pitch, heading and roll with their share
// of a step
const pose = (M, frac) => ({
  x: s16(M[0x8762] | M[0x8763] << 8), y: s16(M[0x8764] | M[0x8765] << 8), z: s16(M[0x8766] | M[0x8767] << 8),
  pitch: M[0x876C] + frac(0x876C), heading: M[0x876D] + frac(0x876D), roll: M[0x876E] + frac(0x876E),
});
const same = (a, b) => ['x', 'y', 'z', 'pitch', 'heading', 'roll'].every(k => a[k] === b[k]);
// the areas and entrances the game's own scripts jump to (opcode $12)
const JUMPS = [[1, 27], [4, 20], [6, 13], [7, 7], [10, 38], [14, 22], [15, 27], [32, 6], [32, 7]];
const show = p => '(' + p.x + ', ' + p.y + ', ' + p.z + ') at ' + [p.pitch, p.heading, p.roll].map(v => +v.toFixed(3)).join(', ');

// a machine at the moment above, with Fast CPU loaded (off) as the page loads it, unless bare
function machine(bare) {
  const rt = DRPage.create({ data, cost, tape });
  rt.restore(START, p => p.program(false));
  const fx = bare ? null : FastCPU.attach(rt, T);
  const M = rt.M, P = rt.P;
  const frac = a => (fx && fx.on ? fx.plug.frac(a) : 0);
  const press = (keys = []) => { rt.input.keys = new Set(keys); rt.input.joy = 0; };
  const run = (n, keys, each) => { press(keys); for (let i = 0; i < n; i++) { rt.runFrame(); if (each) each(); } press(); };
  // refreshes ms apart for secs of real time, the keys held
  const refresh = (secs, keys, each, ms = REFRESH) => {
    press(keys);
    for (let i = 0, n = Math.round(secs * 1000 / ms); i < n; i++) FastCPU.run(fx, ms, each);
    press();
  };
  // fn as each pass's take_commands begins (null for none); the commands each pass carries out
  const hooks = { pass: null, moves: 0, shots: [] };
  const tc = P.take_commands, mc = P.move_command, ac = P.aim_command;
  P.take_commands = function* (r) { if (hooks.pass) hooks.pass(); return yield* tc.call(this, r); };
  P.move_command = function* (r) { hooks.moves++; return yield* mc.call(this, r); };
  P.aim_command = function* (r) { if ((r.a & 255) === 0x16) hooks.shots.push({ t: rt.t, tick: rt.ticks, loops: fx ? fx.loops : 0 }); return yield* ac.call(this, r); };
  // the scripts' own jump to an area (opcode $12: area, entrance), at the end of the next pass's
  // scripts, as a script would make it
  let jump = null;
  const rs = P.run_scripts;
  P.run_scripts = function* (r) {
    const v = yield* rs.call(this, r);
    if (jump) {
      M[0x8A1F] = 0x0A; M[0x8862] = jump[0]; M[0x8911] = jump[1];
      P.set_start({}); P.setw(0x8920, 0xFFFC);
      jump = null;
    }
    return v;
  };
  const go = to => { jump = to; };
  return { rt, fx, M, P, frac, press, run, refresh, hooks, go, pose: () => pose(M, frac) };
}
// a machine with Fast CPU on at a Speed, its loop waiting for a key
function fastMachine(speed) {
  const m = machine();
  FastCPU.set(m.fx, true, speed.i);
  m.refresh(1);
  return m;
}

// ---- off means off
if (part('off')) {
  const trace = bare => {
    const m = machine(bare), out = [];
    if (!bare) FastCPU.set(m.fx, false, SPEEDS.length - 1);
    let f = 0;
    const each = () => { if (f++ % 25 === 0) out.push(hash(m.rt)); };
    for (const [n, keys] of [[100, []], [150, ['O']], [100, ['W']], [60, ['P']], [60, ['L']], [100, ['K']], [40, ['U']], [100, []],
      [10, ['SPACE']], [80, ['Q']], [60, ['0']], [10, ['SPACE']], [60, ['R']], [60, ['F']], [80, ['N']], [80, ['M']], [60, ['0']], [400, ['Q', 'O']]]) m.run(n, keys, each);
    return out;
  };
  const a = trace(true), b = trace(false);
  const i = a.findIndex((h, k) => h !== b[k]);
  if (i >= 0 || a.length !== b.length) fail('off means off: with Fast CPU loaded and off, the machine differs at sample ' + i + ' of ' + a.length);
  else console.log('off means off: ' + a.length + ' samples over ' + 25 * a.length + ' Spectrum frames of play, the same machine with Fast CPU loaded and off');
}

// ---- the frame limiter
if (part('limiter')) {
  const m = fastMachine(SPEEDS[0]), rt = m.rt;
  // each loop: the tick it starts on, and the tick it ends on (later when a wait inside holds it)
  const recs = [];
  m.hooks.pass = () => recs.push({ s: rt.ticks, e: null });
  const ended = () => { const r = recs[recs.length - 1]; if (r && r.e === null) r.e = rt.ticks; };
  // ten seconds of 60 refreshes a second, turning
  let most = 0, loops = 0;
  m.press(['W']);
  FastCPU.run(m.fx, REFRESH, ended);
  recs.length = 0;
  const t0 = rt.ticks;
  for (let i = 0; i < 600; i++) { const n = FastCPU.run(m.fx, REFRESH, ended); most = Math.max(most, n); loops += n; }
  const done = recs.filter(r => r.e !== null), ticks = (done.length ? done[done.length - 1].e : t0) - t0;
  const waited = done.reduce((a, r) => a + r.e - r.s, 0);
  // a refresh a second late, then one on time: the clock moves on by the cap's loops, the rest dropped
  const c0 = rt.t, late = FastCPU.run(m.fx, 1000, ended), ran = rt.t - c0, next = FastCPU.run(m.fx, REFRESH, ended);
  // a refresh each quarter second
  let quarter = 0;
  for (let i = 0; i < 20; i++) quarter = Math.max(quarter, FastCPU.run(m.fx, 250, ended));
  m.press();
  const twice = done.filter((r, i) => i && r.s <= done[i - 1].s).length;
  const gaps = done.slice(1).filter((r, i) => r.s !== done[i].e + 1).length;
  if (twice) fail('the frame limiter: ' + twice + ' loops started on the tick of the loop before');
  else if (gaps || Math.abs(done.length + waited - ticks) > 1) fail('the frame limiter: ' + done.length + ' loops and ' + waited + ' ticks of waits in ' + ticks + ' ticks; ' + gaps + ' loops started later than the tick after the last ended');
  else if (most > 1 || late !== T.cap || quarter !== T.cap || next > 1 || ran > (T.cap + 1) * T.tick) fail('the frame limiter: ' + most + ' loops at most at 60 refreshes a second, ' + late + ' in a refresh a second late (' + (ran / T.tick).toFixed(2) + ' ticks of the clock), ' + next + ' in the next, ' + quarter + ' at most a quarter second apart');
  else console.log('the frame limiter: ' + loops + ' loops in ' + ticks + ' ticks, each on the tick after the last ended (' + waited + ' ticks of waits); a refresh a second late runs ' + late + ' and the clock ' + (ran / T.tick).toFixed(2) + ' ticks, the next ' + next + '; a quarter second apart, ' + quarter + ' a refresh');
}

// ---- same keys, same game
if (part('same')) {
  // the keys in twelfths of a step (K/12 loops each), round again every 600: walks forward and
  // back, turns, a turn round, looks, rolls, the crosshair moved and fired, a rise and a fall, a
  // walk and a turn together; a key held all the while, so that every loop reads one
  const PLAN = [[0, ['O']], [40, ['K']], [80, ['Q']], [140, ['W']], [230, ['U']], [240, ['O']], [270, ['U']], [280, ['O']],
    [310, ['P']], [330, ['O', 'W']], [370, ['K', 'Q']], [410, ['L']], [430, ['N']], [450, ['M']], [470, ['SPACE']],
    [480, ['W']], [510, ['Q']], [530, ['0']], [540, ['SPACE']], [550, ['0']], [560, ['R']], [570, ['F']], [580, ['W']]];
  const N = 1500;
  // gap(n): the real time to the next refresh, after one that ran n loops
  const play = (speed, gap) => {
    const m = fastMachine(speed), rt = m.rt;
    const out = [];
    let k = 0;
    const keys = () => {
      const c = Math.floor(k * 12 / speed.K) % 600;
      let p = 0;
      while (p + 1 < PLAN.length && PLAN[p + 1][0] <= c) p++;
      m.press(PLAN[p][1]);
    };
    keys();
    for (let n = 1, r = 0; k < N && r < 40000; r++) n = FastCPU.run(m.fx, gap(n), () => {
      k++;
      if (k % 25 === 0 && k <= N) out.push(hash(rt));
      keys();
    });
    if (k < N || m.M[0x8BF2]) fail('same keys, same game, ' + speed.name + ': ' + k + ' loops, the game ended for reason ' + m.M[0x8BF2]);
    return out;
  };
  const rnd = rand(11);
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
    if (ok) console.log('same keys, same game, ' + speed.name + ': ' + N + ' loops of walking, turning, looking, rolling, aiming and firing leave the same memory, every 25 loops, at ' + Object.keys(runs).join(', '));
  }
}

// ---- the clock's jobs
if (part('clock')) {
  // the moments in T-states that the interrupt changes the game's clock ($88A4-$88AB), with a turn
  // held for 66 seconds; and with Fast CPU on, the moments the loop has taken the clock's minute
  // ($889D, which take_commands copies to $88AE, and runs the scripts for)
  const watch = on => {
    const m = machine(), M = m.M, rt = m.rt, P = m.P;
    const seen = [], minute = [];
    let was = M.slice(0x88A4, 0x88AC).join(), mw = M[0x889D];
    // the clock as each interrupt leaves it, at the interrupt's moment
    const irq = P.interrupt;
    P.interrupt = function (r) {
      const t = rt.t, v = irq.call(this, r), c = M.slice(0x88A4, 0x88AC).join();
      if (c !== was) { seen.push({ c, t }); was = c; }
      if (M[0x889D] !== mw) { minute.push({ at: t, took: null }); mw = M[0x889D]; }
      return v;
    };
    const each = () => {
      const last = minute[minute.length - 1];
      if (last && last.took === null && M[0x88AE] === M[0x889D]) last.took = rt.t;
    };
    if (on) { FastCPU.set(m.fx, true, 0); m.refresh(66, ['W'], each); }
    else m.run(Math.round(66 * HZ / FRAME), ['W'], each);
    return { seen, minute };
  };
  const off = watch(false), on = watch(true);
  // the changes both saw: the two runs end within a tick of each other
  const both = Math.min(off.seen.length, on.seen.length);
  const near = (a, b) => Math.abs(a.length - b.length) <= 1 && a.slice(0, both).every((x, i) => x.c === b[i].c && Math.abs(x.t - b[i].t) <= HZ / 10);
  const most = Math.max(...off.seen.slice(0, both).map((x, i) => Math.abs(x.t - on.seen[i].t))) / T.tick;
  const late = on.minute.map(x => (x.took === null ? Infinity : x.took - x.at));
  if (off.seen.length < 60) fail('the clock\'s jobs: the clock changed ' + off.seen.length + ' times in 66 s');
  else if (!near(off.seen, on.seen)) fail('the clock\'s jobs: the clock changed ' + off.seen.length + ' times with Fast CPU off and ' + on.seen.length + ' on, ' + most.toFixed(1) + ' ticks apart at most');
  else if (!on.minute.length || late.some(d => d > 2 * T.tick)) fail('the clock\'s jobs: with Fast CPU on, ' + on.minute.length + ' minutes, the loop took them ' + late.map(d => (d / T.tick).toFixed(1)).join(', ') + ' ticks after');
  else console.log('the clock\'s jobs: with a turn held 66 s, the clock changed ' + both + ' times at the same moments with Fast CPU on and off, within ' + most.toFixed(1) + ' ticks; on, the scripts ran for the minute ' + late.map(d => (d / T.tick).toFixed(1)).join(', ') + ' ticks after it');
}

// ---- whole steps
const MOVES = { 'a walk': ['O'], 'a turn': ['W'], 'a look up': ['P'], 'a roll': ['N'] };
if (part('whole')) {
  // one Spectrum pass with the key held: down while the pass waits for a key, up as the next begins
  const spectrum = keys => {
    const m = machine(true);
    m.run(60);
    let after = null;
    m.hooks.pass = () => { if (!after) { after = m.pose(); m.press(); } };
    m.press(keys);
    for (let n = 0; !after && n < 200; n++) m.rt.runFrame();
    m.run(60);
    return { after, later: m.pose() };
  };
  // K loops of it with Fast CPU on, each reading the key; up as the K-th takes it
  const fast = (keys, speed) => {
    const m = fastMachine(speed);
    let after = null;
    const m0 = m.hooks.moves;
    m.press(keys);
    for (let n = 0; !after && n < 600; n++) FastCPU.run(m.fx, REFRESH, () => { if (!after && m.hooks.moves - m0 >= speed.K) { after = m.pose(); m.press(); } });
    m.refresh(1);
    return { after, later: m.pose() };
  };
  const start = machine(true).pose();
  for (const [what, keys] of Object.entries(MOVES)) {
    const want = spectrum(keys);
    if (!want.after || same(want.after, start) || !same(want.after, want.later)) { fail('whole steps: ' + what + ' on the Spectrum went ' + show(start) + ' to ' + (want.after && show(want.after)) + ', then ' + show(want.later)); continue; }
    const bad = SPEEDS.map(s => [s, fast(keys, s)]).filter(([, f]) => !f.after || !same(f.after, want.after) || !same(f.later, want.after));
    if (bad.length) bad.forEach(([s, f]) => fail('whole steps, ' + s.name + ': ' + s.K + ' loops of ' + what + ' end at ' + (f.after && show(f.after)) + ', then ' + show(f.later) + '; the Spectrum\'s pass at ' + show(want.after)));
    else console.log('whole steps: ' + what + ', ' + SPEEDS.map(s => s.K).join(', ') + ' loops at ' + SPEEDS.map(s => s.name).join(', ') + ' end exactly where one Spectrum pass ends, ' + show(want.after));
  }
}

// ---- speeds
if (part('speeds')) {
  // what each move has done so far: the distance from where it began, the turn, the crosshair's travel
  const progress = m => {
    const p0 = m.pose(), x0 = m.M[0x88A0];
    let heading = p0.heading, turned = 0;
    return () => {
      const p = m.pose();
      let d = p.heading - heading; d -= 72 * Math.round(d / 72); turned += Math.abs(d); heading = p.heading;
      return { walk: Math.hypot(p.x - p0.x, p.z - p0.z), turn: turned, aim: m.M[0x88A0] - x0 };
    };
  };
  // the seconds until a series first reaches v, from the last sample before it first moved
  const reach = (s, k, v) => {
    let i0 = 0;
    while (i0 + 1 < s.length && s[i0 + 1][k] === s[0][k]) i0++;
    for (let i = i0 + 1; i < s.length; i++) if (s[i][k] >= v) { const a = s[i - 1], b = s[i]; return (a.t + (b.t - a.t) * (v - a[k]) / (b[k] - a[k]) - s[i0].t) / HZ; }
    return Infinity;
  };
  const fast = (keys, secs, aim, speed) => {
    const m = aim ? machine() : null, f = m || fastMachine(speed);
    if (aim) { m.run(60); m.run(4, ['SPACE']); m.run(60); FastCPU.set(m.fx, true, speed.i); m.refresh(0.5); }
    const now = progress(f), out = [Object.assign({ t: f.rt.t }, now())];
    f.refresh(secs, keys, () => out.push(Object.assign({ t: f.rt.t }, now())));
    return { out, step: f.M[0x8768] | f.M[0x8769] << 8, turn: f.M[0x876F] };
  };
  const spectrum = (keys, frames) => {
    const m = machine(true);
    m.run(60); m.run(4, ['SPACE']); m.run(60);
    const now = progress(m), out = [Object.assign({ t: m.rt.t }, now())];
    m.run(frames, keys, () => out.push(Object.assign({ t: m.rt.t }, now())));
    return out;
  };
  for (const speed of SPEEDS) {
    // six steps of a walk, and 72 seventy-seconds of a turn: steps of K ticks each
    const walk = fast(['O'], 8 * speed.K / 60, false, speed), turn = fast(['W'], (72 / 3 + 2) * speed.K / 60, false, speed);
    for (const [what, r, k, v, steps] of [['walking six steps', walk, 'walk', 6 * walk.step, 6], ['turning all the way round', turn, 'turn', 72, 72 / turn.turn]]) {
      const tf = reach(r.out, k, v), want = steps * speed.K * TICK_MS / 1000;
      const line = speed.name + ', ' + what + ': ' + tf.toFixed(3) + ' s with Fast CPU, ' + steps + ' steps of ' + speed.K + ' ticks ' + want.toFixed(3) + ' s';
      if (!(Math.abs(tf / want - 1) <= 0.01 || Math.abs(tf - want) <= 3 * TICK_MS / 1000)) fail('speeds, ' + line);
      else console.log('speeds, ' + line);
    }
  }
  // the crosshair (W, in its keys' mode) at the Spectrum's own speed
  const tf = reach(fast(['W'], 1.2, true, SPEEDS[0]).out, 'aim', 60), tc = reach(spectrum(['W'], 80), 'aim', 60);
  const line = 'the crosshair moving 60 pixels: ' + tf.toFixed(3) + ' s with Fast CPU, ' + tc.toFixed(3) + ' s on the Spectrum';
  if (!(Math.abs(tf / tc - 1) <= 0.05)) fail('speeds, ' + line);
  else console.log('speeds, ' + line);
}

// ---- switches
if (part('switches')) {
  // the Spectrum's laser held: the time between shots
  const sm = machine(true);
  sm.run(60); sm.run(250, ['0']);
  const sShots = sm.hooks.shots, sGap = (sShots[sShots.length - 1].t - sShots[1].t) / (sShots.length - 2) / HZ;
  for (const speed of SPEEDS) {
    const m = fastMachine(speed), M = m.M;
    const h0 = M[0x876D];
    let h = h0, turns = 0;
    const each = () => { if (M[0x876D] !== h) turns++; h = M[0x876D]; };
    m.refresh(0.1, ['U'], each); m.refresh(1, [], each);
    const tap = turns, about = (M[0x876D] - h0 + 72) % 72;
    turns = 0;
    m.refresh(4, ['U'], each); m.refresh(1, [], each);
    const held = turns;
    m.hooks.shots.length = 0;
    m.refresh(4, ['0']);
    const shots = m.hooks.shots, apart = shots.slice(1).map((s, i) => s.loops - shots[i].loops);
    const gap = (shots[shots.length - 1].t - shots[0].t) / (shots.length - 1) / HZ;
    if (tap !== 1 || about !== 36) fail('switches, ' + speed.name + ': U tapped for 0.1 s turned the view ' + tap + ' times, by ' + about);
    else if (held !== 1) fail('switches, ' + speed.name + ': U held for 4 s turned the view ' + held + ' times');
    else if (shots.length < 4 || apart.some(d => d !== speed.K) || gap > sGap * 1.01) fail('switches, ' + speed.name + ': the laser held 4 s fired ' + shots.length + ' times, ' + [...new Set(apart)].join(', ') + ' loops apart, a shot each ' + gap.toFixed(3) + ' s against the Spectrum\'s ' + sGap.toFixed(3) + ' s');
    else console.log('switches, ' + speed.name + ': U tapped turns round once, held 4 s still once; the laser held 4 s fires ' + shots.length + ' times, ' + speed.K + ' loops apart, a shot each ' + gap.toFixed(3) + ' s (the Spectrum ' + sGap.toFixed(3) + ' s)');
  }
}

// ---- stopping
if (part('stopping')) {
  const bad = [];
  for (const speed of SPEEDS) for (const [what, keys] of Object.entries(MOVES).slice(0, 3)) {
    const m = fastMachine(speed), m0 = m.hooks.moves;
    // held for a loop short of two steps, so it comes up partway through one: where each loop that
    // took the key left the probe, and each refresh after
    const H = 2 * speed.K - 1, held = [], after = [];
    m.press(keys);
    for (let n = 0; after.length < 30 && n < 600; n++) {
      FastCPU.run(m.fx, REFRESH, () => {
        if (held.length < H && m.hooks.moves - m0 > held.length) { held.push(m.pose()); if (held.length === H) m.press(); }
      });
      if (held.length === H) after.push(m.pose());
    }
    const last = held[H - 1];
    if (!last || same(last, held[H - 2]) || !after.every(p => same(p, last))) bad.push(speed.name + ', ' + what + ': ' + (last ? show(held[H - 2]) + ', ' + show(last) : held.length + ' loops') + ' as the key comes up, then ' + after.slice(-1).map(show).join(', '));
  }
  if (bad.length) bad.forEach(b => fail('stopping, ' + b));
  else console.log('stopping: at ' + SPEEDS.map(s => s.name).join(', ') + ', a walk, a turn and a look move in the last loop that takes the key and not in the loops after it comes up');
}

// ---- away: the demonstration at the Spectrum's speed
if (part('away')) {
  // I, then 1 at the information screen: the game abandoned; its end, held thirteen times 75
  // frames, then the demonstration, a command of its recording each pass. The passes it plays in
  // 20 s, with Fast CPU off and on
  const demo = on => {
    const m = machine();
    m.run(60);
    if (on) FastCPU.set(m.fx, true, SPEEDS.length - 1);
    const go = (secs, keys) => (on ? m.refresh(secs, keys, null, 1000 * FRAME / HZ) : m.run(Math.round(secs * HZ / FRAME), keys));
    go(0.2, ['I']); go(2); go(0.2, ['1']);
    let n = 0;
    for (; m.M[0x891F] !== 3 && n < 60; n++) go(1);
    const passes = { n: 0 }, t0 = m.rt.t;
    m.hooks.pass = () => passes.n++;
    go(20);
    return { reached: n, passes: passes.n, secs: (m.rt.t - t0) / HZ, on: m.M[0x891F] === 3 };
  };
  const off = demo(false), on = demo(true);
  if (!off.on || !on.on || off.reached >= 60) fail('away: no demonstration ' + off.reached + ' and ' + on.reached + ' s after abandoning the game');
  else if (Math.abs(on.passes - off.passes) > 1) fail('away: the demonstration played ' + off.passes + ' passes in 20 s with Fast CPU off, ' + on.passes + ' on');
  else console.log('away: the game\'s end held ' + off.reached + ' s with Fast CPU off, ' + on.reached + ' s on; the demonstration played ' + off.passes + ' passes in 20 s off, ' + on.passes + ' on');
}

// ---- random play
if (part('random')) {
  const rnd = rand(7), pick = a => a[Math.floor(rnd() * a.length)];
  const m = machine(), rt = m.rt, M = m.M, P = m.P;
  FastCPU.set(m.fx, true, 0);
  const GOTO = JUMPS;
  const KEYS = ['O', 'K', 'Q', 'W', 'P', 'L', 'N', 'M', 'R', 'F', 'U', 'A', 'Z', 'S', 'X', 'SPACE', '0', 'B', 'D', 'C', 'O', 'W', 'Q'];
  const areas = new Set(), bad = new Set();
  let next = 0, threw = null, loops = 0;
  const angles = () => {
    for (const a of [0x876C, 0x876D, 0x876E]) {
      const f = m.fx.on ? m.fx.plug.frac(a) : 0;
      if (M[a] >= 72) bad.add('angle $' + a.toString(16) + ' at ' + M[a]);
      if (f < 0 || f >= 1) bad.add('a share of a step of ' + f);
    }
  };
  for (let k = 0; k < 180 * 60 && !threw; k++) {
    const t = k / 60;
    if (t >= next) {
      const keys = new Set(); if (rnd() < 0.7) keys.add(pick(KEYS)); if (rnd() < 0.2) keys.add(pick(KEYS));
      // at a game's end, ENTER for a new game and its control options
      if (M[0x8862] === 0x7F || M[0x891F] === 3) keys.add('ENTER');
      m.press([...keys]); next = t + 0.2 + 1.8 * rnd();
    }
    if (k % 1200 === 600) m.go(pick(GOTO));
    if (k % 3600 === 3599) FastCPU.set(m.fx, !m.fx.on);
    if (k % 1800 === 900) FastCPU.set(m.fx, m.fx.on, Math.floor(rnd() * SPEEDS.length));
    try {
      if (m.fx.on) loops += FastCPU.run(m.fx, REFRESH, angles);
      else rt.runFrame();
    } catch (e) { threw = e; fail('random play, ' + t.toFixed(1) + ' s: ' + e.message); }
    areas.add(M[0x8862]);
    angles();
  }
  if (bad.size) fail('random play left: ' + [...bad].slice(0, 4).join(', '));
  else if (!threw) console.log('random play: three minutes in ' + areas.size + ' areas, ' + loops + ' loops with Fast CPU on: nothing thrown, every angle in the game\'s range');
}

// ---- once a step
// With Fast CPU on, the moves glide a share each loop. A byte of the game's state that changes only
// once every K ticks while a key is held steps once a step: right for what the game counts in its
// own passes, but what is drawn from it jumps among frames that glide. The state is what a saved
// game keeps, the 333 bytes from $8762, and the areas' objects with their flags from $CF3E: every
// view is drawn afresh from it and the angles' shares. In five areas, each way of moving held for
// three seconds at 1x and 2x, this lists every byte of it that changed in at least a third of the
// steps, three times in four a whole number of steps after the last; each must be listed here
// with why, and a byte that joins them fails. And the listing must catch a walk given whole once
// a step
if (part('once')) {
  const MEANT = {};
  const meant = new Set(Object.values(MEANT).flat());
  const STATE = [[0x8762, 0x88AE], [0xCF3E, 0xFFFF]];
  const AREAS = [[1, 27], [4, 20], [6, 13], [10, 38], [14, 22]];
  const WAYS = { 'walking': ['O'], 'backing': ['K'], 'turning left': ['Q'], 'turning right': ['W'], 'looking up': ['P'],
    'looking down': ['L'], 'rolling': ['N'], 'walking and turning': ['O', 'W'] };
  const N = { loops: 0, windows: 0, left: 0 };
  const listing = (m, K, keys) => {
    const M = m.M, prev = M.slice(), area = M[0x8862];
    m.press(keys);
    for (let i = 0; i < 18; i++) FastCPU.run(m.fx, REFRESH);
    const at = new Int32Array(65536), n = new Uint16Array(65536), stepped = new Uint16Array(65536);
    for (const [lo, hi] of STATE) prev.set(M.subarray(lo, hi + 1), lo);
    for (let i = 0; i < 180; i++) FastCPU.run(m.fx, REFRESH, () => {
      N.loops++;
      const t = m.rt.ticks;
      for (const [lo, hi] of STATE) for (let a = lo; a <= hi; a++) if (M[a] !== prev[a]) {
        if (n[a] && (t - at[a]) % K === 0) stepped[a]++;
        at[a] = t; n[a]++; prev[a] = M[a];
      }
    });
    m.press(); m.refresh(0.5);
    if (M[0x8862] !== area || M[0x8BF2]) { N.left++; return null; }
    N.windows++;
    const out = [];
    for (let a = 0; a < 65536; a++) if (n[a] >= 180 / K / 3 && stepped[a] * 4 >= (n[a] - 1) * 3) out.push(a);
    return out;
  };
  const found = new Map();
  for (const speed of SPEEDS.filter(s => s.K >= 4)) {
    for (const area of AREAS) {
      const m = fastMachine(speed);
      m.go(area); m.refresh(0.5, ['W']); m.refresh(1);
      for (const [what, keys] of Object.entries(WAYS)) {
        for (const a of listing(m, speed.K, keys) || []) {
          if (!found.has(a)) found.set(a, new Set());
          found.get(a).add(what + ' in area ' + area[0] + ' at ' + speed.name);
        }
      }
    }
  }
  const hex = a => '$' + a.toString(16).toUpperCase().padStart(4, '0');
  const stray = [...found.keys()].filter(a => !meant.has(a));
  if (stray.length) fail('set only once a step, and not listed as meant: ' + stray.map(a => hex(a) + ' (' + [...found.get(a)].slice(0, 3).join(', ') + (found.get(a).size > 3 ? ', ...' : '') + ')').join(' '));
  const seen = Object.assign({}, N);
  // the control: backing away from the first view of Amethyst, the step given whole in the first
  // loop of each K ticks and none in the others
  const speed = SPEEDS[0], m = fastMachine(speed), step = m.fx.plug.step, steps = {};
  m.fx.plug.step = (key, v) => { step(key, v); const p = Math.floor(m.rt.ticks / speed.K); if (steps[key] === p) return 0; steps[key] = p; return v; };
  const caught = (listing(m, speed.K, ['K']) || []).filter(a => a >= 0x8762 && a <= 0x8767);
  if (!caught.length) fail('once a step: a walk given whole once a step at ' + speed.name + ' moved the probe without the listing finding it');
  console.log('once a step: in ' + seen.windows + ' moves held 3 s (' + seen.loops + ' loops; ' + seen.left + ' more left out, into another area or the game\'s end), ' + found.size + ' bytes change only once a step, ' + (stray.length ? stray.length + ' not listed' : 'each listed as meant') + '; a walk given whole once a step is found, at ' + caught.map(hex).join(' '));
}

// ---- no frame behind
if (part('behind')) {
  // turns started and stopped at random, refreshes 4 to 40 ms apart: a key down before a refresh
  // whose loops take it changes that refresh's screen
  const m = fastMachine(SPEEDS[0]), rt = m.rt;
  const rnd = rand(3);
  let held = false, last = rt.now().screen, pressed = 0, unchanged = 0;
  for (let i = 0; i < 900; i++) {
    const was = held;
    if (rnd() < 0.08) held = !held;
    m.press(held ? ['W'] : []);
    const m0 = m.hooks.moves;
    FastCPU.run(m.fx, 4 + 36 * rnd());
    const s = rt.now().screen;
    if (held && !was && m.hooks.moves > m0) { pressed++; if (Buffer.compare(Buffer.from(s), Buffer.from(last)) === 0) unchanged++; }
    last = s;
  }
  if (!pressed || unchanged) fail('no frame behind: ' + unchanged + ' of ' + pressed + ' turns pressed before a refresh left its screen as it was');
  else console.log('no frame behind: ' + pressed + ' turns pressed before a refresh each change its screen');
}

if (fails) { console.log(fails + ' failed'); process.exit(1); }
console.log('ok');
