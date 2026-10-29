#!/usr/bin/env node
// Hold the Play tab's port of the whole game (reference/en-core.js and its groups, en-g*.js, loaded
// as play.html loads them) against the game's own code, in the kit's lockstep (kit/c64/lockstep.js),
// and its page runtime (reference/en-play.js) against the game's pace.
//
// The game runs on the kit's C64 from the bytes in the committed listing, started at the loader's
// hand-over ($0810, $01 = $05, the title picture's chip bytes set: orientation.md, "The loader"). Its
// interrupts come in through the KERNAL's entry and the vector at $0314 while the KERNAL is banked
// in, and leave through the KERNAL's exit at $EA31 or $EA34, which reads $DC0D. The port has no
// stand-ins: every routine, stage and interrupt handler is its own, and a call of the game's code
// would throw. Each pass is one turn of the main loop ($4871); at the start of every pass all of RAM
// is compared (the stack page aside), and so are colour RAM and the registers written to the video
// chip and the SID. Out of play nothing counts as a pass, so the attract screens, the selects, the
// briefing and the end screens are compared at one checkpoint in 16 as well.
//
// The input, from fixed seeds. In play, a player who searches the floor for the squares it has seen
// least, a pickup or a pass for the lift first, and fires at a figure or a closed chest ahead (below,
// "the explorer"); now and then SPACE pauses the game, and SPACE, the stick or fire lets it go on;
// and now and then the next of the four ends of the main loop is forced at the start of a pass, in
// the game and the port alike: the lift ($02C8 = 2), a prisoner home ($02E9 = 1), the castle
// destroyed ($02E9 = 2) and the game over ($02D3 = $FF), so that each session goes through them in
// turn and the two together meet all four. Out of play, the attract loop goes round for
// a while and then fire; on the other screens the stick is held up, down, still or on fire for spans
// chosen at random. In the second session the mission's prisoner is put on the floor play starts
// on, and moved beside the player now and then, so the prisoner's own code runs: normal play rarely
// meets one.
//
// The pace: the page's runtime and the game, from the hand-over, each given the same stick and the
// same SPACE frame by frame, must play within 2 % of the same passes a frame in play; every stretch
// and interrupt the page met must have a cost. A stretch with none would leave the page's clock
// where it was, and a loop that waits on the interrupt, as the pause does, would wait for ever.
//   node games/c64/into-the-eagles-nest/test_play.js [frames] [--cost]
// frames is each lockstep session's length (default 1500). With --cost it measures the costs the
// page's clock runs on and writes them into reference/en-play.js (COST): for each stretch between
// two of the port's checkpoints the average of the game's cycles over it, its interrupts taken out,
// beyond the cycles the port's own yields named on the way; and for the interrupts a base for each
// state one begins in (EaglePlay.irqKey) and a cost for each call of one of P's routines, fitted
// non-negative to the cycles the game's handlers took. Averages and fits rather than medians: the
// pace is the total, which a median does not keep, and what a handler does in one state depends on
// the play.
const path = require('path'), fs = require('fs'), ROOT = path.resolve(__dirname, '../../..');
const { Machine, loadListing } = require(path.join(ROOT, 'kit/c64/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/c64/lockstep.js'));
const args = process.argv.slice(2);
const costAt = args.indexOf('--cost'), COSTING = costAt >= 0 && !!args.splice(costAt, 1);
const FRAMES = +args[0] || 1500;
let failed = 0;
const check = (name, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + name); if (!ok) failed++; };

// ---- the page's scripts, as play.html loads them
globalThis.C64Sid = null; globalThis.C64 = null;
const page = fs.readFileSync(path.join(__dirname, 'play.html'), 'utf8');
const srcs = [...page.matchAll(/<script src="(reference\/en-[^"]+\.js)"><\/script>/g)].map((x) => x[1]);
const onDisk = fs.readdirSync(path.join(__dirname, 'reference')).filter((f) => /^en-g.*\.js$/.test(f)).sort().map((f) => 'reference/' + f);
check('play.html loads en-core.js, every group in reference/ in order (' + onDisk.length + '), and en-play.js',
  JSON.stringify(srcs) === JSON.stringify(['reference/en-core.js', ...onDisk, 'reference/en-play.js']));
const load = (f) => require(path.join(__dirname, f));
load('reference/en-core.js');
const groups = onDisk.map(load);
const EaglePlay = load('reference/en-play.js');
const RAM = loadListing(path.join(__dirname, 'listing.json'));

// ---- the game: the kit's C64 with the KERNAL's interrupt as the game depends on it: the machine
// takes it through the KERNAL's entry while the KERNAL is banked in, and the exits at $EA31 and $EA34
// read $DC0D, which acknowledges CIA 1, and cost 62 cycles with their RTI
class EagleMachine extends Machine {
  constructor(o) { super(o); this.setup(); }
  setup() { this.hooks[0xEA31] = this.hooks[0xEA34] = () => { this.ioRead(0xDC0D); this.leave(62); return false; }; }
  static restore(s, o) { const m = Machine.restore(s, o); Object.setPrototypeOf(m, EagleMachine.prototype); m.setup(); return m; }
}
function machine() {
  const vic = { regs: new Array(64).fill(0), irq: 0 };
  vic.regs[0x11] = 0x3B; vic.regs[0x16] = 0xD8; vic.regs[0x18] = 0x38;
  return new EagleMachine({ ram: RAM.slice(), pc: 0x0810, port: { dir: 0x2F, data: 0x05 }, vic, cia: true, passAt: 0x4871 });
}
const port = () => globalThis.EagleCore.makePort(new Uint8Array(65536), groups);
// every handler the game points $0314 at: the plaque's, the title's, the high score table's, play's,
// the wipe's, and the KERNAL's own exits
const HANDLERS = [0x085A, 0x0E6A, 0x0F95, 0x4AA7, 0x4C22, 0xEA31, 0xEA34];
{
  const P = port();
  check('the port has its own handler for every interrupt the game installs', HANDLERS.every((a) => typeof P.irqs[a] === 'function'));
}

// ---- the explorer: the player's square is four tiles by four, its corner at the map address the
// game works out at $51CD (the room pointer $FA plus 128 bytes for every 8 pixels below y = $3A and
// one for every 8 pixels right of x = $20). A square can stand where none of its sixteen tiles is
// $2D or more (wall, furniture, a chest or a figure); a door ($43-$4A) counts as open with a key in
// hand, and the lift ($54/$55 under the square) as a target with a pass. Every so often it searches
// the floor breadth first for the nearest square it has seen least, a pickup first, and walks there
// a tile at a time, firing at a figure or a closed chest straight ahead.
function explorer(seed) {
  const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return (seed >>> 8) / 16777216; };
  const seen = new Uint16Array(128 * 128);
  let floor = -1, path = [], plan = 0, fireHeld = false, lastPos = -1, stuck = 0;
  const DIRS = [[0, -1, 0x1E], [0, 1, 0x1D], [-1, 0, 0x1B], [1, 0, 0x17]];   // up, down, left, right
  return function (R, f) {
    if (R[0x02A7] !== floor) { floor = R[0x02A7]; seen.fill(0); path = []; }
    if ((R[0x02AA] & 7) || R[0x02C9]) return 0x1F;                       // a room change or the pause
    const corner = ((R[0xFA] | R[0xFB] << 8) + 16 * (R[0x02E0] - 0x3A) + ((R[0x02DF] - 0x20) >> 3)) & 0xFFFF;
    const at = corner - 0x9000;
    if (at < 0 || at >= 0x4000) return 0x1F;
    const cx = at & 127, cy = at >> 7;
    seen[at] = Math.min(65535, seen[at] + 1);
    const keys = R[0x02AC], pass = R[0x02C8];
    const tile = (x, y) => (x < 0 || y < 0 || x > 127 || y > 127 ? 0xFF : R[0x9000 + y * 128 + x]);
    const open = (t) => t < 0x2D || (keys && t >= 0x43 && t <= 0x4A) || t === 0x55;
    const stand = (x, y) => { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (!open(tile(x + i, y + j))) return false; return true; };
    const pickup = (x, y) => { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const t = tile(x + i, y + j); if (t >= 0x08 && t < 0x2D && (t & 0x38)) return true; } return false; };
    const lift = (x, y) => pass && (tile(x + 2, y + 4) === 0x54 || tile(x + 2, y + 4) === 0x55);
    if (at === lastPos) stuck++; else stuck = 0;
    lastPos = at;
    if (!path.length || f >= plan || stuck > 16) {
      const prev = new Int32Array(128 * 128).fill(-1), queue = [at];
      prev[at] = at;
      let best = -1, bestScore = Infinity;
      for (let q = 0; q < queue.length && q < 6000; q++) {
        const p = queue[q], x = p & 127, y = p >> 7;
        const score = (lift(x, y) ? -1e6 : pickup(x, y) ? -1e5 : 0) + seen[p] * 400 + q + rnd() * 30;
        if (p !== at && score < bestScore) { bestScore = score; best = p; }
        for (const [dx, dy] of DIRS) {
          const nx = x + dx, ny = y + dy, n = ny * 128 + nx;
          if (nx < 0 || ny < 0 || nx > 124 || ny > 124 || prev[n] >= 0 || !stand(nx, ny)) continue;
          prev[n] = p; queue.push(n);
        }
      }
      path = [];
      for (let p = best; p >= 0 && p !== at; p = prev[p]) path.unshift(p);
      plan = f + 60 + Math.floor(rnd() * 120);
      if (stuck > 16) { path = path.slice(0, 1 + Math.floor(rnd() * 3)); stuck = 0; }
    }
    while (path.length && path[0] === at) path.shift();
    let dir = -1;
    if (path.length) {
      const nx = path[0] & 127, ny = path[0] >> 7;
      dir = DIRS.findIndex(([dx, dy]) => nx === cx + dx && ny === cy + dy);
      if (dir < 0) path = [];
    }
    let j = dir >= 0 ? DIRS[dir][2] : DIRS[Math.floor(rnd() * 4)][2];
    const face = R[0x02B0] - 1;
    let target = false;
    if (face >= 0 && face < 4) {
      const [dx, dy] = DIRS[face];
      for (let s = 1; s < 12 && !target; s++) for (let k = 0; k < 4 && !target; k++) {
        const t = tile(dx ? cx + (dx > 0 ? 3 + s : -s) : cx + k, dy ? cy + (dy > 0 ? 3 + s : -s) : cy + k);
        if ((t >= 0x76 && t <= 0xC0) || (t >= 0x5E && t <= 0x61)) target = true;
        else if (t >= 0x2D && !(t >= 0x43 && t <= 0x4A)) break;
      }
    }
    fireHeld = target && !fireHeld;
    if (fireHeld) j &= 0x0F;
    return j;
  };
}

// ---- the costs, gathered while the lockstep runs when --cost is given
const stretches = new Map(), samples = [];
let unpaired = 0;
const push = (map, k, v) => { if (!map.has(k)) map.set(k, []); map.get(k).push(v); };

// ---- one lockstep session
function session(name, seed, opts = {}) {
  let s = seed;
  const rnd = () => (s = (Math.imul(s, 1103515245) + 12345) & 0x7FFFFFFF) / 0x7FFFFFFF;
  const int = (n) => Math.floor(rnd() * n);
  const m = machine(), P = port(), input = explorer(seed);
  m.joy = 0x1F;
  if (COSTING) {
    // each interrupt the game takes: its state and its handler's cycles, in the order the lockstep
    // runs them in the port, where the calls of P's routines each makes are counted
    const taken = [], take = m.take;
    m.take = function (v) {
      const key = EaglePlay.irqKey(this.ram), c0 = this.cpu.cycles;
      const r = take.call(this, v);
      taken.push({ key, cycles: this.cpu.cycles - c0 });
      return r;
    };
    let calls = null;
    EaglePlay.countCalls(P, (n) => { if (calls) calls.set(n, (calls.get(n) || 0) + 1); });
    var wrapIrq = (f) => function () {
      const key = EaglePlay.irqKey(P.M), game = taken.shift();
      calls = new Map();
      try { return f.apply(this, arguments); } finally {
        if (game && game.key === key) samples.push({ key, cycles: game.cycles, calls }); else unpaired++;
        calls = null;
      }
    };
  }
  const irqs = {};
  for (const a of HANDLERS) irqs[a] = COSTING ? wrapIrq(P.irqs[a]) : P.irqs[a];
  let k = 0, outCompared = 0;
  const ls = new Lockstep({
    machine: m, port: P, program: (p) => p.program(), passAt: 0x4871,
    checkpoints: [...P.checkpoints], irqs, irqBytes: [...P.irqBytes], chips: ['colour', 'vic', 'sid'], maxFrames: 5000,
    timing: (t) => {
      if (COSTING && t.from !== undefined && t.to !== undefined && !t.wait) push(stretches, EaglePlay.stretch(t.from, t.to), t.cycles - (t.estimate || 0));
      if (m.ram[0x0315] === 0x4A || (k++ & 15)) return;
      outCompared++;
      const d = ls.compare();
      if (d) { ls.res.diffs.push(Object.assign({ pass: ls.passes, frame: m.frames, cycle: m.cpu.cycles, at: t.to }, d)); ls.res.ok = false; ls.stopped = true; }
    },
  });
  const ENDS = [[0x02C8, 2], [0x02E9, 1], [0x02E9, 2], [0x02D3, 0xFF]];
  const forced = [0, 0, 0, 0];
  let span = 0, held = 0x1F, attract = 0, attractWait = opts.attract || int(500), last = -1, inPlay = 0, nextEnd = opts.firstEndAt || 100 + int(150);
  // with opts.script, the stick on each screen between attract and play goes still, up, still, down,
  // still and fire, so that a select's loop turns with the stick let go and with it held
  const SCRIPT = [[0x1F, 30], [0x1E, 8], [0x1F, 20], [0x1D, 8], [0x1F, 20], [0x0F, 6], [0x1F, 10]];
  let scriptAt = -1, scriptLeft = 0, other = false;
  const order = opts.order || [0, 1, 2, 3];
  let end = 0;
  let prisonerPut = 0, prisonerMoved = 0;
  // SPACE in play: held a few frames, the pause kept a while, then SPACE, the stick or fire to go on.
  // The main loop makes no pass while the game is paused, so each step is taken in onFrame
  let pauseAt = 100 + int(400), pause = null, pauses = 0;
  function pauseStep(g) {
    const p = pause, t = p.t++;
    if (t < p.press) { g.keys.add(60); g.joy = 0x1F; }
    else if (t < p.press + p.hold) { g.keys.delete(60); g.joy = 0x1F; }
    else if (t < p.press + p.hold + p.out) { if (p.how) g.joy = p.how; else g.keys.add(60); }
    else { g.keys.delete(60); g.joy = 0x1F; pause = null; }
  }
  const empty = (R, x, y) => { for (let dy = -1; dy < 5; dy++) for (let dx = -1; dx < 5; dx++) if (R[0x9000 + ((y + dy) & 127) * 128 + ((x + dx) & 127)]) return false; return true; };
  // the prisoner moved beside the player, where its sixteen tiles and a ring round them are empty
  function movePrisoner(g) {
    const px = g.ram[0x02CA], py = g.ram[0x02CB];
    for (const [dx, dy] of [[6, 0], [-8, 0], [0, 6], [0, -8], [6, 6], [-8, -8], [8, 0], [-10, 0], [0, 8], [0, -10]]) {
      const x = (px + dx) & 255, y = (py + dy) & 255;
      if (x > 120 || y > 120 || !empty(g.ram, x, y)) continue;
      const a = 0x9000 + y * 128 + x;
      for (const R of [g.ram, P.M]) { R[0x6027] = x; R[0x6028] = y; R[0x6029] = R[0x602C] = a & 255; R[0x602A] = R[0x602D] = a >> 8; R[0x6043] = 0; }
      prisonerMoved++; return;
    }
  }
  const t0 = Date.now();
  const r = ls.run({
    passes: 1e9,
    onPass: (n, g) => {
      if (g.frames !== last) {
        last = g.frames; inPlay++;
        if (pause) return;
        g.joy = input(g.ram, g.frames);
        if (opts.prisoner && inPlay % 400 === 200 && !g.ram[0x02E5] && !g.ram[0x02C9]) movePrisoner(g);
        if (--pauseAt <= 0 && !g.ram[0x02C9]) {
          pauseAt = 200 + int(600); pauses++;
          pause = { t: 0, press: 2 + int(5), hold: 10 + int(120), out: 2 + int(5), how: [0, 0x1E, 0x1B, 0x0F][int(4)] };
          return;
        }
        if (--nextEnd <= 0) {                                   // the four ends in turn
          nextEnd = opts.every || 120 + int(200);
          const e = order[end++ % order.length], [a, v] = ENDS[e];
          forced[e]++; g.ram[a] = v; P.M[a] = v;
        }
      }
    },
    onFrame: (f, g) => {
      if (f >= (opts.frames || FRAMES)) ls.stopped = true;
      const v = g.ram[0x0315];
      // the mission start, waiting for its window to shut before the play set-up reads $4010
      if (opts.prisoner && v === 0x4C && g.cpu.pc >= 0x4095 && g.cpu.pc < 0x40A0 && g.ram[0x4010] !== g.ram[0x02A7] && P.M[0x4010] === g.ram[0x4010]) {
        g.ram[0x4010] = P.M[0x4010] = g.ram[0x02A7]; prisonerPut++;
      }
      if (v === 0x4A) { other = false; if (pause) pauseStep(g); return; }
      if (pause) { g.keys.delete(60); pause = null; }
      if (v === 0x0E || v === 0x0F) {                           // the attract screens
        other = false;
        if (++attract > attractWait) { g.joy = 0x0F; if (attract > attractWait + 12) { attract = 0; attractWait = int(500); } }
        else g.joy = 0x1F;
        return;
      }
      attract = 0;
      if (opts.script && !other) { scriptAt = 0; scriptLeft = SCRIPT[0][1]; }
      other = true;
      if (scriptAt >= 0) {
        g.joy = SCRIPT[scriptAt][0];
        if (--scriptLeft <= 0 && ++scriptAt < SCRIPT.length) scriptLeft = SCRIPT[scriptAt][1];
        if (scriptAt >= SCRIPT.length) scriptAt = -1;
        return;
      }
      if (--span <= 0) { held = [0x1F, 0x1F, 0x1E, 0x1D, 0x1E, 0x1D, 0x0F][int(7)]; span = 3 + int(60); }
      g.joy = held;
    },
  });
  const d = describe(r);
  check(`${name}: ${r.passes} passes in ${m.frames} frames (${inPlay} in play), memory and chips the same at every pass and at ${outCompared} checkpoints out of play; forced: lift ${forced[0]}, prisoner home ${forced[1]}, castle ${forced[2]}, game over ${forced[3]}; paused ${pauses}` +
    (opts.prisoner ? `; prisoner put ${prisonerPut}, moved ${prisonerMoved}` : '') + ` (${((Date.now() - t0) / 1000).toFixed(0)} s)`, r.ok && m.frames >= FRAMES);
  if (!r.ok) console.log((Array.isArray(d) ? d : [d]).join('\n'));
  return forced;
}
// the third: the attract loop gone round whole before fire, then a lift ride and the game over, each
// soon, and each screen's loop between with the stick let go and held
const ends = [session('the explorer', 3), session('the prisoner', 11, { prisoner: true, order: [2, 3, 0, 1] }),
  session('the screens', 5, { attract: 1300, firstEndAt: 60, every: 60, order: [0, 3], script: true, frames: Math.max(2400, FRAMES * 1.6) })];
if (FRAMES >= 1500) check('each of the four ends of a mission forced in a session', [0, 1, 2, 3].every((e) => ends.some((f) => f[e])));

if (COSTING) {
  const mean = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  // a stretch or a state these sessions did not meet keeps the cost it had: dropped, it would cost
  // nothing on the page, and a wait along it would stand the clock still
  const cost = { '@yield': {}, '@irq': {}, '@fn': {} };
  for (const [k, a] of [...stretches].sort()) cost['@yield'][k] = mean(a);
  for (const k of Object.keys(EaglePlay.COST['@yield'])) if (!(k in cost['@yield'])) cost['@yield'][k] = EaglePlay.COST['@yield'][k];
  // each interrupt's cycles as a base for its state and a cost per call of each routine, fitted
  // by least squares with every cost at least 0 (projected coordinate descent on the normal
  // equations)
  const keys = [...new Set(samples.map((x) => x.key))].sort();
  const fns = [...new Set(samples.flatMap((x) => [...x.calls.keys()]))].sort();
  const d = keys.length + fns.length, G = Array.from({ length: d }, () => new Float64Array(d)), h = new Float64Array(d);
  for (const x of samples) {
    const row = [[keys.indexOf(x.key), 1], ...[...x.calls].map(([n, c]) => [keys.length + fns.indexOf(n), c])];
    for (const [i, a] of row) { h[i] += a * x.cycles; for (const [j, b] of row) G[i][j] += a * b; }
  }
  const w = new Float64Array(d);
  for (let it = 0; it < 3000; it++) for (let i = 0; i < d; i++) {
    if (!G[i][i]) continue;
    let g = -h[i];
    for (let j = 0; j < d; j++) g += G[i][j] * w[j];
    w[i] = Math.max(0, w[i] - g / G[i][i]);
  }
  keys.forEach((k, i) => { cost['@irq'][k] = Math.round(w[i]); });
  for (const k of Object.keys(EaglePlay.COST['@irq'])) if (!(k in cost['@irq'])) cost['@irq'][k] = EaglePlay.COST['@irq'][k];
  fns.forEach((n, i) => { const c = Math.round(w[keys.length + i]); if (c) cost['@fn'][n] = c; });
  const fit = (x) => cost['@irq'][x.key] + [...x.calls].reduce((t, [n, c]) => t + c * (cost['@fn'][n] || 0), 0);
  const got = samples.reduce((t, x) => t + x.cycles, 0), made = samples.reduce((t, x) => t + fit(x), 0);
  const err = samples.reduce((t, x) => t + Math.abs(fit(x) - x.cycles), 0) / samples.length;
  console.log(`     ${samples.length} interrupts (${unpaired} unpaired): the fit's total ${((made / got - 1) * 100).toFixed(2)} % from the game's, ${err.toFixed(0)} cycles out on average`);
  const file = path.join(__dirname, 'reference/en-play.js');
  const src = fs.readFileSync(file, 'utf8');
  const out = src.replace(/  const COST = .*;\n/, '  const COST = ' + JSON.stringify(cost) + ';\n');
  check('the costs written into reference/en-play.js: ' + stretches.size + ' stretches, ' + keys.length + ' interrupt states, ' + Object.keys(cost['@fn']).length + ' routines', out !== src || src.includes(JSON.stringify(cost)));
  fs.writeFileSync(file, out);
  delete require.cache[require.resolve(file)];
}

// ---- the pace: the page's runtime and the game on the same stick, frame by frame
{
  const EP = COSTING ? load('reference/en-play.js') : EaglePlay;
  const PACE = Math.max(4000, FRAMES * 2);
  function stick(seed) {
    const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7FFFFFFF) / 0x7FFFFFFF;
    const WAYS = [0x1F, 0x1E, 0x1D, 0x1B, 0x17, 0x0F, 0x1A, 0x16];
    let j = 0x1F;
    return (R, f) => {
      if (R[0x0315] !== 0x4A) { const t = f % 300; return t < 40 ? 0x1D : t >= 200 && t < 210 ? 0x0F : 0x1F; }
      if (f % 12 === 0) j = WAYS[Math.floor(rnd() * WAYS.length)];
      return f % 700 < 72 ? 0x1F : j;
    };
  }
  // SPACE in play every 700 frames: the pause, a second with the stick let go, and SPACE again
  const space = (R, f) => R[0x0315] === 0x4A && (f % 700 < 4 || (f % 700 >= 64 && f % 700 < 68));
  function run(frame) {
    const input = stick(5);
    let play = 0, first = -1;
    for (let f = 0; f < PACE; f++) if (frame(input, f)) { play++; if (first < 0) first = f; }
    return { play, first };
  }
  const press = (keys, on) => { if (on) keys.add(60); else keys.delete(60); };
  const m = machine();
  const a = run((input, f) => { m.joy = input(m.ram, f); press(m.keys, space(m.ram, f)); m.runFrames(1); return m.ram[0x0315] === 0x4A; });
  a.passes = m.passes;
  // the costs looked up, and those missing named
  const missing = new Set(), C = EP.COST;
  const watch = (o, pre) => new Proxy(o, { get: (t, k) => { if (typeof k === 'string' && !(k in t)) missing.add(pre + k); return t[k]; } });
  const S = EP.create({ M: RAM.slice(), groups, cost: { '@yield': watch(C['@yield'], ''), '@irq': watch(C['@irq'], 'irq '), '@fn': C['@fn'] } });
  const b = run((input, f) => { S.joy = input(S.M, f); press(S.keys, space(S.M, f)); S.run((f + 1) * EP.FRAME); return S.M[0x0315] === 0x4A; });
  b.passes = S.passes;
  const pa = a.passes / Math.max(1, a.play), pb = b.passes / Math.max(1, b.play);
  check(`the page and the game over ${PACE} frames: play from frame ${b.first} and ${a.first}, ${b.passes} and ${a.passes} passes in ${b.play} and ${a.play} frames of play, ` +
    `${pb.toFixed(2)} and ${pa.toFixed(2)} passes a frame (${((pb / pa - 1) * 100).toFixed(2)} %)`, a.play > 1000 && b.play > 1000 && Math.abs(pb / pa - 1) < 0.02);
  check('every stretch and interrupt state the page met has a cost' + (missing.size ? ': missing ' + [...missing].slice(0, 12).join(', ') : ''), missing.size === 0);
}
// ---- the page alone, driven as a player would: the explorer in play, SPACE now and then, the four
// ends of a mission in turn, and RESTORE, which the lockstep has no way to give both. It must never
// stop, and every stretch and interrupt state it meets must have a cost
{
  const SOAK = Math.max(20000, FRAMES * 8), EP = COSTING ? load('reference/en-play.js') : EaglePlay;
  const missing = new Set(), C = EP.COST;
  const watch = (o, pre) => new Proxy(o, { get: (t, k) => { if (typeof k === 'string' && !(k in t)) missing.add(pre + k); return t[k]; } });
  const S = EP.create({ M: RAM.slice(), groups, cost: { '@yield': watch(C['@yield'], ''), '@irq': watch(C['@irq'], 'irq '), '@fn': C['@fn'] } });
  const input = explorer(7), ENDS = [[0x02C8, 2], [0x02E9, 1], [0x02E9, 2], [0x02D3, 0xFF]];
  let seed = 19, inPlay = 0, end = 0, nextEnd = 300, pauseAt = 150, pause = -1, restores = 0, ends = 0, pauses = 0, stopped = '';
  const int = (n) => Math.floor(((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7FFFFFFF) / 0x7FFFFFFF) * n);
  let held = 0x1F, span = 0;
  for (let f = 0; f < SOAK && !stopped; f++) {
    const M = S.M, play = M[0x0315] === 0x4A;
    S.keys.clear();
    if (play) {
      inPlay++;
      if (pause >= 0) { pause++; S.joy = 0x1F; if (pause < 4 || (pause >= 60 && pause < 64)) S.keys.add(60); if (pause >= 70) pause = -1; }
      else {
        S.joy = input(M, f);
        if (--pauseAt <= 0 && !M[0x02C9]) { pauseAt = 400 + int(600); pause = 0; pauses++; }
        else if (--nextEnd <= 0 && !M[0x02C9]) { nextEnd = 300 + int(500); const [a, v] = ENDS[end++ % 4]; M[a] = v; ends++; }
      }
    } else {
      pause = -1;
      if (--span <= 0) { held = [0x1F, 0x1F, 0x1E, 0x1D, 0x0F][int(5)]; span = 5 + int(60); }
      S.joy = held;
    }
    if (f % 2500 === 2499) { S.restore(); restores++; }
    try { S.run((f + 1) * EP.FRAME); } catch (e) { stopped = `at frame ${f}: ${e.message}`; }
  }
  check(`the page alone over ${SOAK} frames (${inPlay} in play, ${pauses} pauses, ${ends} ends forced, ${restores} RESTOREs): ` +
    (stopped ? 'stopped ' + stopped : 'never stopped') + (missing.size ? '; no cost for ' + [...missing].slice(0, 12).join(', ') : ''), !stopped && !missing.size);
}
process.exit(failed ? 1 : 0);
