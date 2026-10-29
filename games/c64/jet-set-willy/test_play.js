#!/usr/bin/env node
// Hold the Play tab's port of the whole game (reference/jsw-port.js) against the game's own code, in
// the kit's lockstep (kit/c64/lockstep.js). The game runs on the kit's C64 from the bytes in the
// committed listing, started where the crackers' start-up begins ($080D), with the KERNAL banked in as
// the game keeps it: its raster interrupts come in through the KERNAL's entry and the vector at $0314,
// the title's leaves through the KERNAL's exit at $FEBC, and the one KERNAL call it makes, CHROUT at
// the title and at the start of a game, does nothing here or in the port. The game's machine finds
// the sprite collisions with the kit's model of them (machine.js's collide option, site/lib/collide.js),
// the one the Play tab uses, and the port reads them from the game's machine where the game reads them. Each pass is one turn of the
// main loop ($30FF). At the start of every pass all of RAM is compared, and so are colour RAM and the
// registers written to the video chip and the SID; the stack page is left out as for every lockstep.
//
// The input, from a fixed seed: the title's Return, then a player who walks, jumps and stands at
// random, now and then pauses, turns the tune off or on, changes the volume or gives up with RUN/STOP,
// until the game is over, and the next game after it. To reach more of the house than a random walk
// does, in one room in two the test sends every exit of the room it has just entered to another room
// picked at random, on both sides at once, and the player heads for the rope or the items. With
// --plain the player only wanders and never pauses, and no exit is sent elsewhere: fewer rooms, and
// more passes in each, which is where the game's races with its interrupt show.
//   node games/c64/jet-set-willy/test_play.js [passes] [--cost] [--plain]
// With --cost it also measures the Play tab's pacing and writes it into reference/jsw-play.js (COST):
// what each of the port's routines costs, measured on the game's own code as it runs (below, "the
// pacing"), checked pass by pass on the odd passes. The machine then runs without the video chip's
// cycles, which the page takes as the machine does.
const path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const fs = require('fs');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine, KEY, LINE, LINES } = require(path.join(ROOT, 'kit/c64/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/c64/lockstep.js'));
const g = game(__dirname);
const { JSWPort } = g.run('reference/jsw-port.js', 'jsw-port', 'JSWPort');
const { JSWPlay } = g.run('reference/jsw-play.js', 'jsw-play', 'JSWPlay');
const args = process.argv.slice(2);
const plainAt = args.indexOf('--plain'), PLAIN = plainAt >= 0 && !!args.splice(plainAt, 1);
const costAt = args.indexOf('--cost'), costFile = costAt >= 0 ? (args.splice(costAt, 1), path.join(__dirname, 'reference/jsw-play.js')) : null;
const PASSES = +args[0] || 40000;

// The game's interrupts go through the KERNAL, as the machine takes them when it is banked in: $FF48
// saves the registers and jumps through $0314; the play interrupt leaves by its own PLA TAY PLA TAX
// PLA RTI, the title's by the KERNAL's at $FEBC. The collisions are the machine's own (collide),
// worked out as the raster moves and before each write to the video chip, so that a sprite moved in
// the middle of a frame is found where it was drawn.
class JSWMachine extends Machine {
  constructor(o) { super(Object.assign({ collide: true }, o)); this.setup(); }
  setup() {
    this.hooks[0xFFD2] = (c) => { c.cycles += 40; c.rts(); };       // CHROUT $08: nothing kept of it
  }
  static restore(s, o) {
    const m = Machine.restore(s, o);
    Object.setPrototypeOf(m, JSWMachine.prototype);
    m.setup();
    return m;
  }
}
const m = new JSWMachine({ ram: g.listing().ram, pc: 0x080D, passAt: 0x30FF, dma: !costFile });
const R = m.ram;
const P = JSWPort.create(new Uint8Array(65536), {});
// The port reads a collision register where the game stands at its LDA (the checkpoints $3392, $1C52
// and $1B37), and gets what the game's read will give: from a copy of the machine run on to the read,
// since an interrupt may come first and the beam draw more lines before it. The reads the game throws
// away give what the register holds, in the LDA's last cycle, three after its first.
const USED = new Set([0x3392, 0x1C52, 0x1B37]);
P.io.collide = (r) => {
  if (!USED.has(m.cpu.pc)) return m.collide.peek(r, m.cpu.cycles + 3);
  const c = JSWMachine.restore(m.save());
  let v = -1;
  c.ioRead = function (a) {
    const x = JSWMachine.prototype.ioRead.call(this, a);
    if (v < 0 && a >= 0xD000 && a < 0xD400 && (a & 0x3F) === r) { v = x; this.stopFlag = true; }
    return x;
  };
  for (let n = 0; v < 0 && n < 10; n++) c.runCycles(LINE * LINES);
  if (v < 0) throw new Error('the game did not read $D0' + r.toString(16).toUpperCase() + ' after $' + m.cpu.pc.toString(16));
  return v;
};

// The port's checkpoints (jsw-port.js): the title's loop and its end, the game's start, the room's
// build step by step, the main loop's calls, the player update's start and its collision reads, the
// death and the game over, and the reads and writes of $D010 that race with the play interrupt.
const CPS = [0xA7D3, 0xA7E0, 0x2000, 0x2DC6, 0x2E07, 0x2E20, 0x2E23, 0x2E26, 0x2E29, 0x2E45, 0x2E4A, 0x2E4F, 0x2E52, 0x2E55, 0x2E7C, 0x2E9C, 0x2F28, 0x2F5A, 0x2FCD, 0x30A8, 0x30D9, 0x30E1, 0x30FF, 0x310C, 0x310F, 0x313F, 0x3349, 0x334F, 0x3392,
  0x1C52, 0x1B37, 0x38EF, 0x383B, 0x386D, 0x38C1, 0x38D1, 0x38E7,
  0x16C0, 0x16C5, 0x3064, 0x306C, 0x3072, 0x3227, 0x322C, 0x3231, 0x3236, 0x3270, 0x3275, 0x3294, 0x3299, 0x370A, 0x3712, 0x3718];
const ls = new Lockstep({
  machine: m, port: P, program: (p) => p.program(), checkpoints: CPS,
  irqs: { 0xA801: 'title_irq', 0x33E1: 'game_irq' },
  irqBytes: [0x37, 0x38, 0x43, 0x44, 0x49, 0x4A, 0x4B, 0x50, 0x51, 0x5F, 0xFB, 0xFE],
  chips: ['colour', 'vic', 'sid'], maxFrames: 2000,
  timing: costFile ? (t) => {
    stretches.push({ pass: t.pass, key: JSWPlay.stretch(t.from, t.to, R, fromState), cycles: t.cycles, estimate: t.estimate, list: calls });
    calls = []; fromState = R[0x33];
  } : null,
});

// ---- the input
let seed = 0x1A55;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return (seed >> 8) % n; };
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;
const PAUSE = [KEY.A, KEY.S, KEY.D, KEY.F, KEY.G];
const inGame = () => R[0x0315] === 0x33;
let act = { joy: 0, keys: [], left: 0 }, wait = 0, games = 0, aborts = 0;
// Toward a cell: walk at it, jumping now and then, and jump once below or beside it.
function toward(x, y) {
  const dx = x - R[0x4F], dy = y - (R[0x1C] >> 3), way = dx < 0 ? LEFT : dx > 0 ? RIGHT : 0;
  if (Math.abs(dx) > 2) return rnd(4) ? way : way | FIRE;
  return dy < 0 || rnd(3) === 0 ? way | FIRE : way;
}
// The room's first item not yet taken, as [column, row], or null.
function item() {
  for (let p = 0x22C3; p < 0x2403; p += 4) if (R[p] === R[0x0E] && !R[p + 3]) return [R[p + 1], R[p + 2]];
  return null;
}
let mode = 'random';
function choose() {
  if (!PLAIN && mode !== 'random' && rnd(4)) {
    const at = mode === 'rope' && R[0x0402] ? [((m.vic[0x0A] | (m.vic[0x10] & 0x20) << 3) - 0x38) >> 3, 2] : mode === 'item' ? item() : null;
    if (at && R[0x33] !== 6) { act = { joy: toward(at[0], at[1]), keys: [], left: 6 + rnd(18) }; return; }
  }
  const r = rnd(1000);
  let joy = 0, keys = [], left = 6 + rnd(60);
  if (r < 150) joy = 0;
  else if (r < 400) joy = LEFT;
  else if (r < 650) joy = RIGHT;
  else if (r < 750) joy = LEFT | FIRE;
  else if (r < 850) joy = RIGHT | FIRE;
  else if (r < 950) joy = FIRE;
  else if (r < 965 && !PLAIN) { keys = [PAUSE[rnd(PAUSE.length)]]; left = 3; }            // pause, then any key goes on
  else if (r < 980) { keys = [KEY.RETURN]; left = 2; }                           // the tune off or on
  else if (r < 995) { keys = [rnd(2) ? KEY['+'] : KEY['-']]; left = 20; }        // the volume
  else if (r < 997) { keys = [[KEY.Q, KEY.W, KEY.Z][rnd(3)]]; left = 12; }       // left, right, jump by key
  else if (r === 999 && rnd(4) === 0) { keys = [KEY.STOP]; left = 2; aborts++; } // give up
  act = { joy, keys, left };
}
function onFrame() {
  m.keys.clear();
  if (!inGame()) {                                                               // the title: Return after a while
    m.joy = 0x1F;
    if (wait === 0) wait = 50 + rnd(400);
    if (--wait < 4) m.keys.add(KEY.RETURN);
    if (wait <= 0) wait = 0;
    return;
  }
  wait = 0;
  if (act.left-- <= 0) choose();
  m.joy = 0x1F & ~act.joy;
  for (const k of act.keys) m.keys.add(k);
}
// one room in two: every exit of the room just entered leads to a room picked at random, a room with
// a rope one time in two. On entering a room the player heads for the rope (three times in four) or for
// the room's items (half the other times), or wanders.
const record = (r) => (r < 0x1E ? r + 0xB0 : r + 0xC2) << 8;
const ROPES = [];
for (let r = 0; r < 60; r++) if (R[record(r) + 0xE2]) ROPES.push(r);
// Now and then, on both sides at once: 79 items taken, so that the next makes 80 and sends Maria to
// bed; or the clock at 11:59:50, so that noon ends the game. And after 1,500 passes in one room, Willy
// at the bottom of it, falling, with the exit below sending him to another.
function poke(a, vs) { vs.forEach((v, i) => { R[a + i] = v; P.M[a + i] = v; }); }
let room = -1;
const rooms = new Set(), states = new Array(8).fill(0);
let teleports = 0, maxItems = 0;
const pokes = { items: 0, clock: 0, drops: 0 };
let stay = 0;
function onPass() {
  // stuck in one room: he drops through the floor into one of the rooms with a rope, or any
  if (inGame() && ++stay > 1500 && R[0x33] === 0) {
    poke(0x1E, [rnd(2) ? ROPES[rnd(ROPES.length)] : rnd(60)]);
    poke(0x1C, [0x70]); poke(0x33, [2]); poke(0x51, [0]);
    stay = 0; pokes.drops++;
  }
  if (R[0x0E] !== room) {
    room = R[0x0E]; stay = 0;
    rooms.add(room);
    mode = R[0x0402] && rnd(4) ? 'rope' : rnd(2) ? 'item' : 'random';
    if (!PLAIN && rnd(2) === 0) {
      const t = rnd(2) ? ROPES[rnd(ROPES.length)] : rnd(60);
      for (let a = 0x1D; a <= 0x20; a++) { R[a] = t; P.M[a] = t; }
      teleports++;
    }
  }
  states[R[0x33] & 7]++;
  if (rnd(8000) === 0) { poke(0x0401, [0x79]); pokes.items++; }
  if (rnd(12000) === 0) { poke(0x37, [0x31, 0x31, 0x35, 0x39, 0x35, 0x30]); pokes.clock++; }
  maxItems = Math.max(maxItems, (R[0x0401] >> 4) * 10 + (R[0x0401] & 15));
}
// what the game did, counted on its own side
const seen = { deaths: 0, hits: 0, noon: 0, over: 0, items: 0, ropes: 0, offrope: 0, title: 0 };
const count = (a, k) => { const prev = m.hooks[a]; m.hooks[a] = (c) => { seen[k]++; return prev ? prev(c) : false; }; };
count(0x38F4, 'deaths'); count(0x33A7, 'hits'); count(0x33AF, 'hits'); count(0x33B8, 'hits'); count(0x33CD, 'noon');
count(0x1BA3, 'offrope'); count(0x3843, 'over'); count(0x164F, 'items'); count(0x1C7C, 'ropes'); count(0xA744, 'title');
const was = m.hooks[0xA744];
m.hooks[0xA744] = (c) => { if (seen.title > 0) games++; return was ? was(c) : false; };

// ---- the pacing (--cost)
// What the page's clock charges, measured on the game as it runs (none of it is fitted):
// - each of the port's routines: the game's own routine's cycles from its entry to its RTS, its mean
//   over the run, less its interrupts' and less the routines of the port's it called (a routine the
//   port folds into its caller stays in the caller's); for the routines the page keys (JSWPlay.KEY),
//   the mean for each key too (name#key), and less the cycles the port's routine says it took where
//   it yields them (the sound sweeps). The player update's routines, which it leaves by jumps, are
//   taken as returning there; a routine the game leaves by a jump elsewhere (the room build's
//   steps) is never returned from and has no cost of its own;
// - @yield: what the game's code adds to each stretch between two of the port's checkpoints, by the
//   two (JSWPlay.stretch), the mean of what the routines and the sweeps' own cycles leave, less than
//   nothing where a routine charged in the stretch it begins in runs on past it;
// - each interrupt half's own cycles (@irq), the mean, less the routines it called, measured as the
//   main program's are.
const bands = {}, measured = {}, entered = {}, stretches = [], yielded = {};
let calls = [], fromState = 0;
const stacks = [[], []];
let irqDepth = 0, irqTotal = 0, irqChild = 0;
const add = (k, n) => { const t = measured[k] = measured[k] || [0, 0]; t[0] += n; t[1]++; };
// An RTS returns from the routines entered at its depth, and from those deeper still (one that
// pulled its caller's bytes off the stack before it returned). A routine left without one, and not
// by the player update's jumps, is gone when the next one is entered above it.
function close(cpu, sp, at) {
  const frames = stacks[irqDepth ? 1 : 0];
  while (frames.length && frames[frames.length - 1].sp < sp + (at ? 1 : 0)) {
    const f = frames.pop(), all = at - f.c0 - (irqDepth ? 0 : irqTotal - f.irq0);
    if (at && frames.length) frames[frames.length - 1].child += all;
    else if (at && irqDepth) irqChild += all;
    if (!at) continue;
    add(f.name, all - f.child);
    if (f.key !== undefined) add(f.name + '#' + f.key, all - f.child);
  }
}
if (costFile) {
  let band = 0;
  m.onInterrupt = () => { band = JSWPlay.bandOf(R, m.line); irqDepth++; irqChild = 0; stacks[1] = []; };
  m.onReturn = (mm, v, n) => {
    irqDepth--;
    const b = bands[band] = bands[band] || [0, 0];
    b[0] += n - irqChild; b[1]++;
    irqTotal += n;
  };
  // where each of the port's routines begins: the address its line names, else its label
  const src = fs.readFileSync(path.join(__dirname, 'reference/jsw-port.js'), 'utf8');
  const IRQS = new Set(['title_irq', 'game_irq']);
  const hook = (a, fn) => { const prev = m.hooks[a]; m.hooks[a] = (cpu) => { fn(cpu); return prev ? prev(cpu) : false; }; };
  for (const [, name, rest] of src.matchAll(/^\s*P\.(\w+) = function\*?\s*\([^)]*\)(.*)$/gm)) {
    const c = /\/\/ \$([0-9A-F]{4})/.exec(rest), key = JSWPlay.KEY[name];
    if (!c || IRQS.has(name)) continue;
    hook(parseInt(c[1], 16), (cpu) => {
      close(cpu, cpu.sp, 0);                                                     // deeper ones are gone
      const frames = stacks[irqDepth ? 1 : 0], top = frames[frames.length - 1];
      if (top && top.sp === cpu.sp && top.name === name) return;                 // a loop back to its head
      frames.push({ name, c0: cpu.cycles, sp: cpu.sp, irq0: irqTotal, child: 0, key: key ? key(R) : undefined });
      if (!irqDepth) entered[name] = (entered[name] || 0) + 1;
    });
  }
  for (let a = 0x0800; a < 0xB000; a++) if (R[a] === 0x60) hook(a, (cpu) => { if (cpu.m[cpu.pc] === 0x60) close(cpu, cpu.sp, cpu.cycles + 6); });
  // The player update leaves its routines by a jump, through its vectors or back to its dispatch
  // (the port's throws): there each routine it has entered is left, as if it had returned.
  const leave = (cpu) => {
    const frames = stacks[0], base = frames.findIndex((f) => f.name === 'reset_stack_and_enter_player_tick');
    if (irqDepth || base < 0) return;
    while (frames.length > base + 1) {
      const f = frames.pop(), all = cpu.cycles - f.c0 - (irqTotal - f.irq0);
      frames[frames.length - 1].child += all;
      add(f.name, all - f.child);
      if (f.key !== undefined) add(f.name + '#' + f.key, all - f.child);
    }
  };
  for (const a of [0x101E, 0x1021, 0x1027, 0x102A, 0x107B, 0x107E]) hook(a, leave);
  // the port's calls in each stretch, keyed as the page keys them, its interrupts' left out, and
  // the cycles each says it took
  const within = [];
  for (const name of Object.keys(P)) {
    const f = P[name], key = JSWPlay.KEY[name];
    if (typeof f !== 'function' || IRQS.has(name)) continue;
    const note = () => { const k = key ? name + '#' + key(P.M) : name; if (!ls.replaying) calls.push(k); return k; };
    if (Object.getPrototypeOf(f) !== Object.getPrototypeOf(function* () {})) { P[name] = function (...a) { note(); return f.apply(this, a); }; continue; }
    P[name] = function* (...a) {
      const k = note();
      within.push(k);
      try {
        const it = f.apply(this, a);
        for (let r = it.next(); ; ) {
          if (r.done) return r.value;
          if (r.value && r.value.cycles !== undefined && within[within.length - 1] === k) for (const n of [name, k]) yielded[n] = (yielded[n] || 0) + r.value.cycles;
          r = it.next(yield r.value);
        }
      } finally { within.pop(); }
    };
  }
}
function fitCost() {
  const cost = {};
  for (const [k, [s, n]] of Object.entries(measured)) cost[k] = Math.max(0, Math.round((s - (yielded[k] || 0)) / n));
  const of = (k) => (cost[k] !== undefined ? cost[k] : cost[k.split('#')[0]] || 0);
  const known = (s) => s.list.reduce((t, k) => t + of(k), 0) + s.estimate;
  const even = stretches.filter((s) => s.pass % 2 === 0), odd = stretches.filter((s) => s.pass % 2);
  const sum = {};
  for (const s of even) { const t = sum[s.key] = sum[s.key] || [0, 0]; t[0] += s.cycles - known(s); t[1]++; }
  cost['@yield'] = {};
  for (const [k, [t, n]] of Object.entries(sum)) cost['@yield'][k] = Math.round(t / n);
  const est = (s) => known(s) + (cost['@yield'][s.key] || 0);
  // checked pass by pass on the odd passes: the game's own work in each, against the cost charged
  const pass = new Map();
  for (const s of odd) { const p = pass.get(s.pass) || [0, 0]; p[0] += s.cycles; p[1] += est(s); pass.set(s.pass, p); }
  const err = [...pass.values()].map(([a, e]) => e - a).sort((a, b) => a - b);
  const game = [...pass.values()].reduce((t, [a]) => t + a, 0), model = [...pass.values()].reduce((t, [, e]) => t + e, 0);
  console.log(`checked on the ${pass.size} odd passes: the game's work ${game} cycles, the cost charged ${model} (${(100 * (model - game) / game).toFixed(2)} %); ` +
    `a pass's error ${err[Math.floor(err.length * 0.01)]} to ${err[Math.floor(err.length * 0.99)]} cycles for 98 % of them, ${err[0]} to ${err[err.length - 1]} at most`);
  const unseen = [...new Set(odd.map((s) => s.key))].filter((k) => !(k in cost['@yield']));
  if (unseen.length) console.log('stretches only on the odd passes: ' + unseen.join(', '));
  cost['@irq'] = {};
  for (const [k, [t, n]] of Object.entries(bands)) cost['@irq'][k] = Math.round(t / n);
  return cost;
}

const r = ls.run({ passes: PASSES, onPass, onFrame });
const out = describe(r);
console.log(Array.isArray(out) ? out.join('\n') : out);
console.log(`${r.passes} passes in ${r.frames} frames, ${games} games played to the end (${aborts} given up), ${seen.deaths} deaths, ` +
  `${rooms.size} rooms (${teleports} sent on), ${seen.items} items taken (${maxItems} at most in a game), ${seen.ropes} ropes caught (${seen.offrope} knocked off by a wall), ` +
  `${seen.hits} deaths by a guardian, ${seen.noon} games ended at noon (${pokes.clock} clocks and ${pokes.items} item counts set, ${pokes.drops} drops); ` +
  `passes by Willy's state: ${states.slice(0, 7).join(' ')}`);
if (costFile && r.ok) {
  const cost = fitCost(), src = fs.readFileSync(costFile, 'utf8'), line = /^  const COST = .*;$/m;
  if (!line.test(src)) throw new Error('reference/jsw-play.js has no line const COST = ...;');
  fs.writeFileSync(costFile, src.replace(line, () => '  const COST = ' + JSON.stringify(cost) + ';'));
  console.log('costs written to reference/jsw-play.js');
}
process.exit(r.ok ? 0 : 1);
