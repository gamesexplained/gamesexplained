#!/usr/bin/env node
// Hold the Play tab's port of the whole game (reference/sq-port.js, loaded as play.html loads it)
// against the game's own code, in the kit's lockstep (kit/c64/lockstep.js), and its page runtime
// (reference/sq-play.js) against the game's pace.
//
// The game runs on the kit's C64 from the bytes in the committed listing, started where its BASIC
// line's SYS 15133 hands over ($3B1D), with the chips as the KERNAL leaves them after RUN: the video
// chip's modes at $1B, $C8 and $15, and CIA 1's timer A counting a jiffy, 16,422 cycles, and
// interrupting. Its interrupts come in through the KERNAL's entry and the vector at $0314, and both
// of the game's handlers end in the KERNAL's own at $EA31. The kit's machine has no ROM, so a hook
// there runs SquirmPort.kernal, the same stand-in the port's own handlers end in, and charges the
// cycles it says the ROM's handler takes, with its exit. The stand-in was checked against the ROM
// itself (agent-history.md). The port has no other stand-ins: every routine and both of the game's
// interrupt handlers are its own. Each pass is one turn of the main loop ($3BF6); at the start of
// every pass all of RAM is compared (the stack page aside), and so are colour RAM, the registers
// written to the video chip and the SID, and CIA 1's port A.
//
// The input, from fixed seeds. In play, a stick held a random way for a random number of passes,
// and now and then F1, the pause, with the stick let go; in the pause, fire alone goes on. On the
// screens with no pass (the title, the bonus run, the level's jingle, a life lost, the high-score
// table and its name entry), the stick is held a random way for a random number of frames, changed
// only while the game polls, where it reads it. Every so often the game is forced, in the game and
// the port alike, at the start of a pass: one egg short of the 255 that end a level ($2690 = $FE),
// with an egg in the space the stick steps into, so that the pass ends the level; the level
// counter on the status line at 9, so that the next level is 10; the treasure in the space the
// stick steps into; the creatures' state ($2688), which the levels go round; the step delay
// ($2689) at $FF, $FD, $FA, $02 or $00, as later levels have it, the last two with no wait at all;
// and one life left, with a score that climbs the high-score table or has no place in it. The
// table starts with no score in it, so every game that scores enters a name.
//   node games/c64/squirm/test_play.js [frames] [--cost]
// frames is each lockstep session's length (default 4000; every routine must run at 4000 or more).
// With --cost it measures the costs the page's clock runs on and writes them into
// reference/sq-play.js (COST): for each stretch between two of the port's checkpoints a base, and
// for each of P's routines a cost a call, fitted non-negative to the game's cycles over each
// stretch with its interrupts and the time in its polling loops taken out (the page runs a wait
// itself, to the interrupt that ends it); the start, from the hand-over to the title's first wait,
// measured on its own; and for each interrupt state the average of the handler's cycles before the
// KERNAL's.
const path = require('path'), fs = require('fs'), ROOT = path.resolve(__dirname, '../../..');
const { Machine, loadListing } = require(path.join(ROOT, 'kit/c64/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/c64/lockstep.js'));
const args = process.argv.slice(2);
const costAt = args.indexOf('--cost'), COSTING = costAt >= 0 && !!args.splice(costAt, 1);
const FRAMES = +args[0] || 4000;
let failed = 0;
const check = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) failed++; };

// ---- the page's scripts, as play.html loads them
globalThis.C64Sid = null; globalThis.C64 = null;
const page = fs.readFileSync(path.join(__dirname, 'play.html'), 'utf8');
const srcs = [...page.matchAll(/<script src="(reference\/sq-[^"]+\.js)"><\/script>/g)].map((x) => x[1]);
check('play.html loads reference/sq-port.js, then reference/sq-play.js', JSON.stringify(srcs) === JSON.stringify(['reference/sq-port.js', 'reference/sq-play.js']));
const load = (f) => require(path.join(__dirname, f));
const SquirmPort = load('reference/sq-port.js');
const SquirmPlay = load('reference/sq-play.js');
const RAM = loadListing(path.join(__dirname, 'listing.json'));

// ---- the game: the kit's C64 from the hand-over, the KERNAL's handler at $EA31 run by the stand-in
// on the machine's own memory and chips, and its cycles charged, with the 22 of its exit
class SquirmMachine extends Machine {
  constructor(o) { super(Object.assign({ cia: true }, o)); this.setup(); }
  setup() {
    this.hooks[0xEA31] = (c) => {
      const cycles = SquirmPort.kernal((a) => c.rd(a), (a, v) => c.wr(a, v));
      this.leave(22 + cycles); return false;
    };
  }
  static restore(s, o) { const m = Machine.restore(s, o); Object.setPrototypeOf(m, SquirmMachine.prototype); m.setup(); return m; }
}
function machine() {
  const vic = { regs: new Array(64).fill(0), irq: 0 };
  vic.regs[0x11] = 0x1B; vic.regs[0x16] = 0xC8; vic.regs[0x18] = 0x15;
  const m = new SquirmMachine({ ram: RAM.slice(), pc: 0x3B1D, vic, passAt: 0x3BF6 });
  // CIA 1's timer A as the KERNAL leaves it: $4025, continuous, its interrupt on
  m.ioWrite(0xDC0D, 0x7F); m.ioWrite(0xDC04, 0x25); m.ioWrite(0xDC05, 0x40); m.ioWrite(0xDC0D, 0x81); m.ioWrite(0xDC0E, 0x11);
  return m;
}
{
  const P = SquirmPort.create(new Uint8Array(65536));
  check('the port has its own handler for every interrupt the game installs, and the KERNAL\'s',
    [0x3CB3, 0x3D27, 0xEA31].every((a) => typeof P.irqs[a] === 'function'));
}

// every loop in which the game polls (the jiffy clock's low byte, the stick, the bonus timer): the
// first and last address of each, where a change of input is read by both at once
const LOOPS = [[0x30AE, 0x30B1], [0x3120, 0x3123], [0x329A, 0x329D], [0x32B4, 0x32B7], [0x32C5, 0x32CE],
  [0x37A2, 0x37A5], [0x37AF, 0x37B2], [0x37D6, 0x37D9], [0x384C, 0x3859], [0x38C2, 0x38C5], [0x38E4, 0x38E7],
  [0x38F1, 0x38F4], [0x3A9E, 0x3AA1], [0x3AE2, 0x3AE5], [0x3B03, 0x3B06], [0x3BC4, 0x3BC7], [0x3C5B, 0x3C5E],
  [0x3C7C, 0x3C7F], [0x3C80, 0x3C86], [0x3D4F, 0x3D52], [0x3D82, 0x3D85]];
const polling = (pc) => LOOPS.some(([a, b]) => pc >= a && pc <= b);
const inPause = (pc) => pc >= 0x3C73 && pc <= 0x3C8C;

// ---- the costs, gathered while the lockstep runs when --cost is given
const stretches = new Map(), handlers = new Map(), samples = [];
const push = (map, k, v) => { if (!map.has(k)) map.set(k, []); map.get(k).push(v); };

// ---- one lockstep session
function session(name, seed, opts = {}) {
  let s = seed;
  const rnd = () => (s = (Math.imul(s, 1103515245) + 12345) & 0x7FFFFFFF) / 0x7FFFFFFF;
  const int = (n) => Math.floor(rnd() * n);
  const m = machine(), P = SquirmPort.create(new Uint8Array(65536));
  m.joy1 = 0x1F;
  if (COSTING) {
    // each interrupt the game takes: its state as it begins, and its cycles from there to the
    // KERNAL's handler at $EA31, which the page works out for itself
    const take = m.take;
    let t0 = -1, key = '';
    m.take = function (v) { key = SquirmPlay.irqKey(this.ram); t0 = this.cpu.cycles; return take.call(this, v); };
    const hook = m.hooks[0xEA31];
    m.hooks[0xEA31] = function (c) {
      if (t0 >= 0) { push(handlers, key, m.cpu.cycles - t0); t0 = -1; }
      return hook.call(this, c);
    };
    // the main program's cycles in its polling loops, from the first turn's read to the exit, its
    // interrupts out
    for (const [a, b] of LOOPS) {
      m.hooks[a] = () => { if (inLoop < 0) { inLoop = m.cpu.cycles; loopIrq = ls.irqCycles; } return false; };
      for (const x of b === 0x3859 ? [0x3853, b + 1] : [b + 1]) {
        m.hooks[x] = () => { if (inLoop >= 0) { looped += m.cpu.cycles - inLoop - (ls.irqCycles - loopIrq); inLoop = -1; } return false; };
      }
    }
  }
  let inLoop = -1, loopIrq = 0, looped = 0;
  const called = new Map(), forced = { level: 0, ten: 0, treasure: 0, state: 0, delay: 0, life: 0 };
  let pauses = 0, paused = 0;
  const ls = new Lockstep({
    machine: m, port: P, program: (p) => p.program(), checkpoints: P.CHECKPOINTS, irqs: P.irqs,
    irqBytes: P.irqBytes, chips: ['colour', 'vic', 'sid', 'cia'], maxFrames: 3000,
    timing: (t) => {
      for (const [k, n] of Object.entries(t.calls)) called.set(k, (called.get(k) || 0) + n);
      // the game's cycles over each stretch, its interrupts taken out, and with its polling loop's
      // when the port polled: the page's clock runs a wait itself, to the interrupt that ends it
      if (COSTING && t.from !== undefined && t.to !== undefined) {
        const key = SquirmPlay.stretch(t.from, t.to);
        stretches.set(key, (stretches.get(key) || 0) + 1);
        samples.push({ key, cycles: t.cycles - (t.polls ? looped : 0), calls: t.calls });
      }
      looped = 0;
    },
  });
  let span = 0, held = 0x1F, fspan = 0, fheld = 0x1F, pause = null, passes = 0;
  const WAYS = [0x1F, 0x1E, 0x1D, 0x1B, 0x17, 0x0F];
  // each forcing every so many passes in play, the first half way through
  const due = (every) => every && passes % every === every >> 1;
  const t0 = Date.now();
  const r = ls.run({
    passes: 1e9,
    onPass: (n, g) => {
      passes++;
      if (pause) {                                              // F1 held for a few passes at most
        if (pause.in || ++pause.passes > 4) { g.keys.delete(4); pause = null; } else return;
      }
      if (--span <= 0) { held = WAYS[int(6)]; span = 1 + int(10); }
      g.joy1 = held;
      const both = (a, v) => { g.ram[a] = v; P.M[a] = v; };
      if (due(opts.pauseEvery)) { pauses++; g.joy1 = held = 0x1F; g.keys.add(4); pause = { passes: 0, in: false, t: 0, fire: 0, hold: int(100) }; return; }
      if (due(opts.levelEvery)) {
        forced.level++; both(0x2690, 0xFE);
        if (opts.ten && !forced.ten) { forced.ten++; both(0x0424, 0xB9); both(0x2682, 2); }   // level 9, maze 2: the next is maze 3
        // and an egg in the space the stick steps into, so that this pass ends the level
        const at = (g.ram[0xFB] | g.ram[0xFC] << 8) + { 0x1E: -40, 0x1D: 40, 0x1B: -1, 0x17: 1 }[held === 0x1F || held === 0x0F ? (held = 0x17) : held];
        g.joy1 = held; span = 3;
        if (g.ram[at] === 0x20) both(at, 0x46);
      }
      // the treasure moved to the space the stick steps into, while it wanders (states 2 to 4)
      if (due(opts.treasureEvery) && g.ram[0x2688] >= 2 && !g.ram[0x268D]) {
        if (held === 0x1F || held === 0x0F) held = 0x1B;
        g.joy1 = held; span = 3;
        const at = (g.ram[0xFB] | g.ram[0xFC] << 8) + { 0x1E: -40, 0x1D: 40, 0x1B: -1, 0x17: 1 }[held];
        const was = g.ram[0x268A] | g.ram[0x268B] << 8;
        if (g.ram[at] === 0x20) {
          forced.treasure++;
          if (g.ram[was] === g.ram[0x268E]) both(was, 0x20);
          both(0x268A, at & 255); both(0x268B, at >> 8); both(at, g.ram[0x268E]);
        }
      }
      if (due(opts.stateEvery)) { forced.state++; both(0x2688, 1 + int(4)); }
      if (due(opts.delayEvery)) { const d = opts.delays || [0xFF, 0x00, 0x02, 0xFD]; forced.delay++; both(0x2689, d[int(d.length)]); }
      if (due(opts.lifeEvery) && g.ram[0x2685] > 1) {
        forced.life++; both(0x2685, 1);
        // and a score of up to 39,990, so that the table fills and each new score climbs it
        // (or none, the first time and one time in three after, so that a game also ends with no
        // place in the table)
        const none = forced.life === 1 || !int(3);
        if (opts.score) for (let x = 0; x < 4; x++) both(0x0414 + x, none ? 0xB0 : 0xB0 + (x ? int(10) : int(4)));
      }
    },
    onFrame: (f, g) => {
      if (f >= (opts.frames || FRAMES)) ls.stopped = true;
      const pc = g.cpu.pc;
      if (pause && inPause(pc)) {                               // F1 let go, a while, then fire alone
        if (!pause.in) { pause.in = true; paused++; }
        if (pause.t++ === 3) g.keys.delete(4);
        const t = pc >= 0x3C80 ? pause.fire++ : 0;              // the frames in the loop that waits for fire
        g.joy1 = t >= pause.hold && t < pause.hold + 5 ? 0x0F : 0x1F;
        return;
      }
      if (!polling(pc) || (pc >= 0x3C5B && pc <= 0x3C5E)) return;   // play's own wait: onPass's
      // fire alone more often where it leaves a screen: the title, a letter of a name, the table
      if (--fspan <= 0) { fheld = pc === 0x3BC4 || pc === 0x3BC6 || (pc >= 0x3120 && pc <= 0x3123) || pc >= 0x32C5 && pc <= 0x32CE ? [0x0F, 0x0F, 0x1B, 0x17, 0x1F][int(5)] : WAYS[int(6)]; fspan = 2 + int(30); }
      g.joy1 = fheld;
    },
  });
  // the routines the lockstep saw the port's main program call (the interrupts' calls are not counted)
  const IRQ_ONLY = ['irq_handler', 'bonus_irq', 'kernal_irq', 'rotate_spinner', 'start'];
  const missed = Object.keys(P).filter((k) => typeof P[k] === 'function' && !['program', 'sei', 'cli'].includes(k) && !called.has(k) && !IRQ_ONLY.includes(k));
  const ok = r.ok && m.frames >= (opts.frames || FRAMES);
  const n = (k) => called.get(k) || 0;
  check(`${name}: ${r.passes} passes in ${m.frames} frames, memory and chips the same at every pass; ${n('level_complete')} levels done` +
    (opts.ten ? ` (the first from level 9 and maze 2)` : '') + `, ${n('collect_treasure')} treasures, ${n('lose_life')} lives lost, ${n('enter_name')} high-score tables, ${n('save_hiscores')} names entered, ` +
    `${n('pause')} pauses; forced: a level's last egg ${forced.level}, the treasure ahead ${forced.treasure}, creatures' state ${forced.state}, step delay ${forced.delay}, last life ${forced.life}` +
    ` (${((Date.now() - t0) / 1000).toFixed(0)} s)`, ok);
  if (!r.ok) console.log((Array.isArray(describe(r)) ? describe(r) : [describe(r)]).join('\n'));
  return missed;
}
const missed = [session('random play', 3, { levelEvery: 400, treasureEvery: 30, stateEvery: 90, delayEvery: 70, lifeEvery: 600, pauseEvery: 250 }),
  session('the levels', 11, { levelEvery: 20, ten: true, delayEvery: 30, delays: [0xFF, 0xFD, 0xFA, 0x00], frames: FRAMES * 1.5 }),
  session('the high scores', 5, { lifeEvery: 100, score: true, pauseEvery: 70, stateEvery: 50 })].reduce((a, x) => a.filter((k) => x.includes(k)));
if (FRAMES >= 4000) check('every routine of the port\'s main program ran in a session' + (missed.length ? ': not ' + missed.join(', ') : ''), !missed.length);

if (COSTING) {
  const mean = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  // each stretch's cycles as a base for the stretch and a cost per call of each of P's routines,
  // fitted by least squares with every cost at least 0 (projected coordinate descent on the normal
  // equations): what a pass does depends on the creatures' state and on what the worms meet
  const cost = { '@yield': {}, '@fn': {}, '@irq': {} };
  const keys = [...stretches.keys()].sort(), fns = [...new Set(samples.flatMap((x) => Object.keys(x.calls)))].sort();
  const d = keys.length + fns.length, G = Array.from({ length: d }, () => new Float64Array(d)), h = new Float64Array(d);
  for (const x of samples) {
    const row = [[keys.indexOf(x.key), 1], ...Object.entries(x.calls).map(([n, c]) => [keys.length + fns.indexOf(n), c])];
    for (const [i, a] of row) { h[i] += a * x.cycles; for (const [j, b] of row) G[i][j] += a * b; }
  }
  const w = new Float64Array(d);
  for (let it = 0; it < 3000; it++) for (let i = 0; i < d; i++) {
    if (!G[i][i]) continue;
    let g = -h[i];
    for (let j = 0; j < d; j++) g += G[i][j] * w[j];
    w[i] = Math.max(0, w[i] - g / G[i][i]);
  }
  keys.forEach((k, i) => { cost['@yield'][k] = Math.round(w[i]); });
  fns.forEach((n, i) => { const c = Math.round(w[keys.length + i]); if (c) cost['@fn'][n] = c; });
  const fnCost = (x) => Object.entries(x.calls).reduce((t, [n, c]) => t + c * (cost['@fn'][n] || 0), 0);
  // the start: from the hand-over to the title's first wait, on the game, its interrupts out
  {
    const m = machine();
    let irq = 0, at = -1;
    m.onReturn = (g, v, c) => { irq += c; };
    m.hooks[0x3BC0] = () => { if (at < 0) at = m.cpu.cycles - irq; return false; };
    while (at < 0 && m.frames < 50) m.runFrames(1);
    const P = SquirmPort.create(RAM.slice()), calls = {};
    P.io = { read: () => 0xFF, write: () => {}, irqByte: (a) => P.M[a] };
    SquirmPlay.countCalls(P, (k) => { calls[k] = (calls[k] || 0) + 1; });
    P.program().next();
    cost['@yield'][SquirmPlay.stretch(0x3B1D, 0x3BC0)] = Math.max(0, at - fnCost({ calls }));
  }
  // a stretch or a state these sessions did not meet keeps the cost it had
  for (const k of Object.keys(SquirmPlay.COST['@yield'])) if (!(k in cost['@yield'])) cost['@yield'][k] = SquirmPlay.COST['@yield'][k];
  for (const [k, a] of [...handlers].sort()) cost['@irq'][k] = mean(a);
  for (const k of Object.keys(SquirmPlay.COST['@irq'])) if (!(k in cost['@irq'])) cost['@irq'][k] = SquirmPlay.COST['@irq'][k];
  const fit = (x) => cost['@yield'][x.key] + Object.entries(x.calls).reduce((t, [n, c]) => t + c * (cost['@fn'][n] || 0), 0);
  const got = samples.reduce((t, x) => t + x.cycles, 0), made = samples.reduce((t, x) => t + fit(x), 0);
  const err = samples.reduce((t, x) => t + Math.abs(fit(x) - x.cycles), 0) / samples.length;
  console.log(`     ${samples.length} stretches: the fit's total ${((made / got - 1) * 100).toFixed(2)} % from the game's, ${err.toFixed(0)} cycles out on average`);
  const file = path.join(__dirname, 'reference/sq-play.js');
  const src = fs.readFileSync(file, 'utf8');
  const out = src.replace(/  const COST = .*;\n/, '  const COST = ' + JSON.stringify(cost) + ';\n');
  check('the costs written into reference/sq-play.js: ' + Object.keys(cost['@yield']).length + ' stretches, ' + Object.keys(cost['@fn']).length + ' routines, ' + handlers.size + ' interrupt states', out !== src || src.includes(JSON.stringify(cost)));
  fs.writeFileSync(file, out);
  delete require.cache[require.resolve(file)];
}
const SP = COSTING ? load('reference/sq-play.js') : SquirmPlay;

// ---- the pace: the page's runtime and the game from the hand-over, given the same input pass by
// pass, play the same game, so the clock at each pass is compared. Fire starts the game from the
// title at frame 100; in play the stick follows a pattern by the pass's number. Then the same with
// the step delay at $00 from the first pass, as on the levels from 25 on, where nothing waits and
// the pace is the cost of the work alone
const missingCost = new Set();
const watch = (o, pre) => new Proxy(o, { get: (t, k) => { if (typeof k === 'string' && !(k in t)) missingCost.add(pre + k); return t[k]; } });
const pageCost = () => ({ '@yield': watch(SP.COST['@yield'], ''), '@irq': watch(SP.COST['@irq'], 'irq '), '@fn': SP.COST['@fn'] });
function pace(name, opts) {
  const N = opts.passes;
  const stick = (n) => n === 0 ? 0x1F : [0x1F, 0x1E, 0x1B, 0x1D, 0x17][(n >> 4) % 5];
  const times = (run) => {
    const t = [];
    run((clock, M) => { t.push(clock); if (t.length === 1 && opts.delay !== undefined) M[0x2689] = opts.delay; return stick(t.length); });
    return t;
  };
  const LIMIT = 40000;
  const a = times((pass) => {
    const m = machine();
    let joy = 0x1F;
    m.onPass = (g) => { joy = pass(g.cpu.cycles, g.ram); g.joy1 = joy; };
    for (let f = 0; f < LIMIT && m.passes < N; f++) { if (!m.passes) m.joy1 = f >= 100 && f < 130 ? 0x0F : 0x1F; m.runFrames(1); }
  });
  const b = times((pass) => {
    const S = SP.create({ M: RAM.slice(), cost: pageCost(), onPass: (S) => { S.joy1 = pass(S.clock, S.M); } });
    for (let f = 0; f < LIMIT && S.passes < N; f++) { if (!S.passes) S.joy1 = f >= 100 && f < 130 ? 0x0F : 0x1F; S.run((f + 1) * SP.FRAME); }
  });
  const n = Math.min(a.length, b.length) - 1, F = SP.FRAME;
  const first = (b[0] - a[0]) / F, rate = (b[n] - b[0]) / (a[n] - a[0]);
  check(`the pace, ${name}: the page and the game reach the first pass at frames ${(b[0] / F).toFixed(1)} and ${(a[0] / F).toFixed(1)}, and pass ${n + 1} ` +
    `${((b[n] - b[0]) / F).toFixed(0)} and ${((a[n] - a[0]) / F).toFixed(0)} frames after it (${((rate - 1) * 100).toFixed(2)} %)`,
    n + 1 >= N && Math.abs(first) < 2 && Math.abs(rate - 1) < opts.within);
}
pace('waiting on the jiffy clock', { passes: 300, within: 0.01 });
pace('with no wait', { passes: 300, delay: 0, within: 0.03 });
check('every stretch and interrupt state the pace met has a cost' + (missingCost.size ? ': missing ' + [...missingCost].slice(0, 12).join(', ') : ''), !missingCost.size);

// ---- the page alone, driven as a player would: a stick that changes every few passes, F1 now and
// then and fire to go on, and the level ends, the treasure and the last life forced in turn, as in
// the lockstep. It must never stop, and every stretch and interrupt state it meets must have a cost
{
  const SOAK = Math.max(20000, FRAMES * 5);
  missingCost.clear();
  let seed = 19, passes = 0, span = 0, held = 0x1F, stopped = '', f1 = 0, levels = 0;
  const int = (n) => Math.floor(((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7FFFFFFF) / 0x7FFFFFFF) * n);
  const S = SP.create({ M: RAM.slice(), cost: pageCost(), onPass: (S) => {
    const M = S.M;
    passes++; S.keys.delete(4);
    if (--span <= 0) { held = [0x1F, 0x1E, 0x1D, 0x1B, 0x17, 0x0F][int(6)]; span = 1 + int(10); }
    S.joy1 = held;
    if (passes % 300 === 150) { S.joy1 = 0x1F; S.keys.add(4); f1++; }
    if (passes % 200 === 100) { M[0x2690] = 0xFE; levels++; }
    if (passes % 90 === 45) M[0x2689] = [0xFF, 0x00, 0x02, 0xFD, 0xFA][int(5)];
    if (passes % 500 === 250 && M[0x2685] > 1) M[0x2685] = 1;
  } });
  let fspan = 0, last = 0;
  for (let f = 0; f < SOAK && !stopped; f++) {
    if (S.passes === last && --fspan <= 0) { S.joy1 = [0x1F, 0x0F, 0x1B, 0x17, 0x1E][int(5)]; fspan = 2 + int(30); }
    last = S.passes;
    try { S.run((f + 1) * SP.FRAME); } catch (e) { stopped = `at frame ${f}: ${e.message}`; }
  }
  check(`the page alone over ${SOAK} frames (${passes} passes, ${f1} F1, ${levels} last eggs forced): ` +
    (stopped ? 'stopped ' + stopped : 'never stopped') + (missingCost.size ? '; no cost for ' + [...missingCost].slice(0, 12).join(', ') : ''), !stopped && !missingCost.size);
}
process.exit(failed ? 1 : 0);
