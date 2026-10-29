#!/usr/bin/env node
// Hold the Play tab's port of the whole game (reference/storm-port.js) against the game's own code,
// in the kit's lockstep (kit/c64/lockstep.js). The game runs on the kit's C64 from the bytes in the
// committed listing, started where the loader hands over ($75AC), with the KERNAL banked in as the
// game keeps it: its raster interrupt comes in through the KERNAL's entry and the vector at $0314,
// and the one KERNAL call it makes, CHROUT at start-up, does nothing here or in the port. The
// character ROM the game copies from is the 458 bytes of it the port carries. Each pass is one turn
// of the main loop ($78D7). At the start of every pass all of RAM is compared, and so are colour
// RAM and the registers written to the video chip and the SID, except the three bytes where the
// game saves a register (save_y $8127, save_x $8129, sfx_save_x $58FE), which the port writes only
// where they are data; the stack page is left out as for every lockstep.
//
// The input, from a fixed seed: the title's fire button, one player or two in turn, the instructions
// read to the end every third game, then an autopilot for each player (below), until the game is
// over or Corrine is found, and the next game after it.
//   node games/c64/storm/test_play.js [passes] [--cost]
// With --cost it also measures the Play tab's pacing and writes it into reference/storm-play.js
// (COST): what each of the port's routines costs, measured on the game's own code as it runs
// (below, "the pacing"), checked pass by pass on the odd passes.
const fs = require('fs'), path = require('path'), ROOT = path.resolve(__dirname, '../../..');
const { game } = require(path.join(ROOT, 'kit/scripts/port_check.js'));
const { Machine } = require(path.join(ROOT, 'kit/c64/machine.js'));
const { Lockstep, describe } = require(path.join(ROOT, 'kit/c64/lockstep.js'));
const g = game(__dirname);
g.lib('cpu6502');                   // the 6502 the port's title music runs on, as play.html loads it
const { StormPort } = g.run('reference/storm-port.js', 'storm-port', 'StormPort');
const { StormGuide } = g.run('reference/storm-guide.js', 'storm-guide', 'StormGuide');
const { StormPlay } = g.run('reference/storm-play.js', 'storm-play', 'StormPlay');
const args = process.argv.slice(2);
const costAt = args.indexOf('--cost'), costFile = costAt >= 0 ? (args.splice(costAt, 1), path.join(__dirname, 'reference/storm-play.js')) : null;
const PASSES = +args[0] || 40000;

// The game's interrupt goes through the KERNAL, as the machine takes it with the KERNAL banked in:
// $FF48 saves the registers and jumps through $0314, and the handler leaves by its own PLA TAY PLA
// TAX PLA RTI.
const char = new Uint8Array(4096);
char.set(StormPort.FONT);
const m = new Machine({ ram: g.listing().ram, pc: 0x75AC, passAt: 0x78D7, port: { dir: 0x2F, data: 0x37 }, rom: { char } });
m.hooks[0xFFD2] = (c) => { c.cycles += 40; c.rts(); };            // CHROUT $08: nothing kept of it
const P = StormPort.create(new Uint8Array(65536), {});

const CPS = [0x762E, 0x7667, 0x76B7, 0x76C7, 0x76D7, 0x76EE, 0x6E2D, 0x6EEB, 0x7520, 0x752D, 0x74B6,
  0x78C4, 0x78D7, 0x78E0, 0x78ED, 0x78F0, 0x78F3, 0x78F6, 0x78F9, 0x78FC, 0x78FF, 0x792B, 0x79DF, 0x8092];
const stretches = [];
const ls = new Lockstep({
  machine: m, port: P, program: (p) => p.program(), checkpoints: CPS, waits: [0x593F, 0x6418, 0x7614],
  irqs: { 0x7D80: 'irq' }, ignore: [0x8127, 0x8129, 0x58FE], chips: ['colour', 'vic', 'sid'], maxFrames: 2000,
  timing: costFile ? (s) => {
    if (inLoop && m.cpu.pc === inLoop.exit) closeLoop(m.cpu);                     // stopped at a loop's exit
    stretches.push({ pass: s.pass, from: s.from, to: s.to, wait: s.wait, cycles: s.cycles, loop: loopCycles, irqCycles: s.irqCycles, calls: s.calls, polls: s.polls });
    loopCycles = 0;
  } : null,
});

// ---- the game's one race
// The title tune's driver runs in panel_band while title_mode is set (the title and the
// instructions), and keeps its pointers in $02-$05; $03/$04 is also where cell_address leaves the
// colour RAM address of the block put_block is drawing. When the interrupt falls in the middle of a
// block, the block's remaining colours go through the tune's pointer, to RAM the game does not use
// (a voice record's low byte, $AA, $CE or $F2, as the high byte), and its cells keep the colours they
// had. The port draws every block whole. Each colour store made through a pointer outside colour RAM
// is that race: the hook records the byte it writes and the cell it missed, and at the next pass
// both are taken from the game, so the comparison goes on over everything else. It is shown, not
// guessed: a store like it with title_mode clear stops the test.
const race = { stray: new Set(), cells: new Set(), count: 0 };
for (const at of [0x6481, 0x7C76]) {
  m.hooks[at] = (c) => {
    if (R[4] >= 0xD8 && R[4] <= 0xDB) return false;
    if (!R[0x8106]) throw new Error('a colour store at $' + at.toString(16) + ' through $' + (R[3] | R[4] << 8).toString(16) + ' outside the title');
    race.stray.add(((R[3] | R[4] << 8) + c.y) & 0xFFFF);
    race.cells.add(((R[0xFD] | R[0xFE] << 8) + c.y - 0x0400) & 0x3FF);
    race.count++;
    return false;
  };
}
const compare = ls.compare.bind(ls);
ls.compare = () => {
  for (const a of race.stray) P.M[a] = R[a];
  for (const i of race.cells) ls.chips.colour[i] = m.colour[i];
  race.stray.clear(); race.cells.clear();
  return compare();
};

// ---- the input
let seed = 0x5EED;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF; return (seed >> 8) % n; };
const R = m.ram;
let games = 0, rooms = new Set(), deaths = 0, endings = 0, inGame = false;
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;
const press = (b) => { m.joy = 0x1F & ~b; m.joy1 = 0x1F; };
// The menus, by where the game last stood: each question answered after a pause, the stick let go
// once the game has moved on.
let lastAt = -1, pause = 0;
function onFrame(f, mm, l) {
  if (inGame) return;
  if (l.last !== lastAt) { lastAt = l.last; pause = 5 + rnd(40); press(0); }
  if (pause > 0) { pause--; return; }
  const answer = { 0x7614: FIRE, 0x7667: games % 2 ? RIGHT : LEFT, 0x76B7: games % 3 === 1 ? UP : DOWN, 0x7520: FIRE }[lastAt];
  if (answer) press(answer);
}

// The autopilot, one player at a time: the Play tab's guide (reference/storm-guide.js) gives the way,
// in one game in four to the nearest brooch it can reach or to Corrine, in the next to fluid and the
// special keys, in the last now and then to the doors (with a key or without), and otherwise to a
// room on the map picked at random; the pilot turns to face the next cell and walks, firing now and then. A
// pilot with no way to go heads for an exit of the room. Now and then it turns at random, or uses a
// mask, an amulet or a scroll.
const G = StormGuide.create(StormPort);
const mp = G.map(R), places = mp.place.map((r, i) => r >= 0 ? i : -1).filter((i) => i >= 0);
const pilot = [{ room: -1, plan: null, age: 0, hold: 0, act: 0, goal: -1 }, { room: -1, plan: null, age: 0, hold: 0, act: 0, goal: -1 }];
// fluid and the special keys; the doors, the special keys' among them
const RARE = [0x01, 0x07, 0x08], DOORS = [0x0F, 0x1A, 0x0D, 0x1B];
const EXIT_CELL = { 8: [8, 0], 4: [8, 0x10], 2: [0, 8], 1: [0x10, 8] };
function steer(n) {
  const p = pilot[n], base = n ? 0x861E : 0x8629, x = R[base], y = R[base + 1], d = R[base + 2];
  if (x & 0x80 || R[n ? 0x8619 : 0x8618]) return 0;
  if (p.hold > 0) { p.hold--; return p.act; }
  const r = rnd(100);
  if (r < 2) { p.act = DOWN; p.hold = 2; return DOWN; }                         // a mask
  if (r < 4) { p.act = DOWN | FIRE; p.hold = 2; return DOWN | FIRE; }           // an amulet or a scroll
  if (r < 12) { p.act = [LEFT, RIGHT, UP][rnd(3)] | (rnd(2) ? FIRE : 0); p.hold = rnd(6); return p.act; }
  if (p.room !== R[0x8118] || ++p.age > 60) {
    p.room = R[0x8118]; p.age = 0;
    if (games % 4 === 0) p.plan = G.plan(R, n);                                 // the guide's way, one game in four
    else if (games % 4 === 1) p.plan = G.plan(R, n, { types: RARE });           // fluid and the special keys
    else if (games % 4 === 3 && rnd(2)) p.plan = G.plan(R, n, { types: DOORS }); // the doors, with a key or without
    if (games % 4 && !p.plan) {                                                  // else a room picked at random
      const here = mp.at[R[0x8118]];
      for (let tries = 0; tries < 6; tries++) {
        if (p.to === undefined || p.to === here || tries) p.to = places[rnd(places.length)];
        p.plan = G.plan(R, n, p.to);
        if (p.plan) break;
      }
    }
    const e = R[0x8119], list = [8, 4, 2, 1].filter((b) => e & b);
    p.goal = list.length ? list[rnd(list.length)] : -1;
  }
  let want = -1;
  const path = p.plan && p.plan.path;
  if (path) {
    const i = path.findIndex(([px, py]) => px === x && py === y);
    if (i >= 0 && i + 1 < path.length) {
      const [nx, ny] = path[i + 1];
      want = nx < x ? 3 : nx > x ? 1 : ny < y ? 0 : 2;
    } else if (i < 0) p.age = 1000;                                              // off the way: ask again
  }
  if (want < 0 && p.goal >= 0) {
    const [gx, gy] = EXIT_CELL[p.goal];
    want = Math.abs(gx - x) > Math.abs(gy - y) || gy === y ? (gx > x ? 1 : 3) : (gy > y ? 2 : 0);
  }
  let b = want < 0 || want === d ? UP : ((want - d) & 3) === 1 ? RIGHT : LEFT;
  if (rnd(3) === 0) b |= FIRE;
  return b;
}
function onPass() {
  if (!inGame) {
    if (R[0x8106]) return;
    inGame = true;
  }
  rooms.add(R[0x8118]);
  m.joy1 = 0x1F & ~steer(0);
  m.joy = R[0x8137] === 2 ? 0x1F & ~steer(1) : 0x1F;
}
// A game ends when the title comes back.
const at = { over: 0 };
const was = m.hooks[0x75AF];
m.hooks[0x75AF] = (c) => { if (inGame) { inGame = false; games++; press(0); } return was ? was(c) : false; };
m.hooks[0x7983] = () => { at.over++; return false; };
m.hooks[0x804E] = () => { deaths++; return false; };
m.hooks[0x78A6] = () => { endings++; return false; };

// ---- the pacing (--cost)
// What the page's clock charges, measured on the game as it runs (none of it is fitted):
// - each of the port's routines: the game's own routine's cycles from its entry to its RTS, its
//   mean over the run, less its interrupts', less the routines of the port's it called (a routine
//   the port folds into its caller stays in the caller's) and less its turns of a polling loop;
//   for the routines the page keys (StormPlay.KEY), the mean for each key too (name#key);
// - the polling loops (LOOPS, head and exit: the raster waits, frame_flag, $D011's top bit, the
//   fire button) are the page clock's own time, a raster line for each of the port's bare yields
//   and the wait's line for a { wait };
// - @yield: what the main program's own code adds to each stretch between two of the port's
//   yields, the mean of what the routines leave;
// - each interrupt band's own cycles (@irq), the mean, by the band irq_list gives it ($7DAB-$7DAC
//   once irq has run; StormPlay.bandOf), less the routines it called, measured as the main
//   program's are.
// A routine whose own code waits or polls (AFTER) spends its own cycles after the wait; the page
// charges it when it returns, and every other routine when it is called. A routine that never
// returns (the main loop, the program) or was not run has no cost: @yield is its own code.
const bands = {}, measured = {}, entered = {};
const LOOPS = [[0x5938, 0x593F], [0x6411, 0x6418], [0x760D, 0x7614], [0x64A1, 0x64A6], [0x64A6, 0x64AB],
  [0x75B2, 0x75B7], [0x75B7, 0x75BC], [0x788E, 0x7893], [0x7893, 0x7898], [0x7624, 0x762E]];
const AFTER = ['clear_screen', 'restore_bg', 'wait_frame'];
const stacks = [[], []], TRACE = process.env.COST_TRACE ? {} : null;     // the main program's routines, the interrupt's
let irqDepth = 0, irqTotal = 0, irqChild = 0, inLoop = null, loopCycles = 0;
function closeLoop(cpu) {
  const n = cpu.cycles - inLoop.c0 - (irqTotal - inLoop.irq0), frames = stacks[0];
  loopCycles += n; inLoop = null;
  if (frames.length) frames[frames.length - 1].child += n;
}
const add = (k, n) => { const t = measured[k] = measured[k] || [0, 0]; t[0] += n; t[1]++; if (TRACE) (TRACE[k] = TRACE[k] || []).push(n); };
// An RTS returns from the routines entered at its depth, and from those deeper still (one that
// pulled its caller's bytes off the stack before it returned). A routine left without one (the
// title's TXS, say) is gone when the next one is entered above it, and is not measured.
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
  let step = 0;
  m.onInterrupt = () => { step = R[0x8136]; irqDepth++; irqChild = 0; stacks[1] = []; };
  m.onReturn = (mm, v, n) => {
    irqDepth--;
    const k = StormPlay.bandOf(R, R[0x7DAB] | R[0x7DAC] << 8, R[0x8136] !== step);
    const b = bands[k] = bands[k] || [0, 0];
    b[0] += n - irqChild; b[1]++;
    irqTotal += n;
  };
  // where each of the port's routines begins: the address its line names, else its label
  const src = fs.readFileSync(path.join(__dirname, 'reference/storm-port.js'), 'utf8');
  const byName = new Map(JSON.parse(fs.readFileSync(path.join(__dirname, 'symbols.json'))).symbols.map((s) => [s.name, s.address]));
  const BANDS = new Set(['irq', 'message_band', 'play_band', 'frame_mark', 'panel_band']);
  const hook = (a, fn) => { const prev = m.hooks[a]; m.hooks[a] = (cpu) => { fn(cpu); return prev ? prev(cpu) : false; }; };
  for (const [, name, rest] of src.matchAll(/^\s*P\.(\w+) = function\*?\s*\([^)]*\)(.*)$/gm)) {
    const c = /\/\/ \$([0-9A-F]{4})/.exec(rest), a = c ? parseInt(c[1], 16) : byName.get(name), key = StormPlay.KEY[name];
    if (a === undefined || BANDS.has(name)) continue;
    hook(a, (cpu) => {
      close(cpu, cpu.sp, 0);                                                     // deeper ones are gone
      const frames = stacks[irqDepth ? 1 : 0], top = frames[frames.length - 1];
      if (top && top.sp === cpu.sp && top.name === name) return;                 // a loop back to its head
      frames.push({ name, c0: cpu.cycles, sp: cpu.sp, irq0: irqTotal, child: 0, key: key ? key(R) : undefined });
      if (!irqDepth) entered[name] = (entered[name] || 0) + 1;
    });
  }
  // every RTS of the game's code returns from the routines entered at its depth
  for (let a = 0x0800; a < 0xA000; a++) if (R[a] === 0x60) hook(a, (cpu) => { if (cpu.m[cpu.pc] === 0x60) close(cpu, cpu.sp, cpu.cycles + 6); });
  // the polling loops last, so that their hooks run first: a loop's exit is closed before the
  // next loop opens there or the routine returns there
  for (const [h, e] of LOOPS) hook(h, (cpu) => { if (!irqDepth && !inLoop) inLoop = { exit: e, c0: cpu.cycles, irq0: irqTotal }; });
  for (const [, e] of LOOPS) hook(e, (cpu) => { if (!irqDepth && inLoop && inLoop.exit === e) closeLoop(cpu); });
}
function fitCost() {
  const cost = {};
  for (const [k, [s, n]] of Object.entries(measured)) cost[k] = Math.max(0, Math.round(s / n));
  const work = (s) => s.cycles - s.loop;
  const known = (s) => Object.entries(s.calls).reduce((t, [k, c]) => t + (cost[k] || 0) * c, 0);
  const even = stretches.filter((s) => s.pass % 2 === 0), odd = stretches.filter((s) => s.pass % 2);
  cost['@yield'] = Math.max(0, Math.round(even.reduce((t, s) => t + work(s) - known(s), 0) / even.length));
  const est = (s) => known(s) + cost['@yield'];
  // checked pass by pass on the odd passes: the game's own work in each, against the cost charged
  const pass = new Map();
  for (const s of odd) { const p = pass.get(s.pass) || [0, 0]; p[0] += work(s); p[1] += est(s); pass.set(s.pass, p); }
  const err = [...pass.values()].map(([g, e]) => e - g).sort((a, b) => a - b);
  const game = [...pass.values()].reduce((t, [g]) => t + g, 0), model = [...pass.values()].reduce((t, [, e]) => t + e, 0);
  console.log(`checked on the ${pass.size} odd passes: the game's work ${game} cycles, the cost charged ${model} (${(100 * (model - game) / game).toFixed(2)} %); ` +
    `a pass's error ${err[Math.floor(err.length * 0.01)]} to ${err[Math.floor(err.length * 0.99)]} cycles for 98 % of them, ${err[0]} to ${err[err.length - 1]} at most`);
  // the port's calls against the game's entries, for every routine measured
  const calls = {};
  for (const s of stretches) for (const [k, c] of Object.entries(s.calls)) calls[k] = (calls[k] || 0) + c;
  const off = Object.keys(measured).filter((k) => Math.abs((calls[k] || 0) - entered[k]) > Math.max(2, entered[k] / 100));
  if (off.length) console.log('called a different number of times by the port and the game: ' + off.map((k) => `${k} ${calls[k] || 0}/${entered[k]}`).join(', '));
  const none = Object.keys(calls).filter((k) => !(k in cost));
  if (none.length) console.log("called by the port, never returned from in the game: " + none.map((k) => `${k} ${calls[k]}/${entered[k] || 0}`).join(", "));
  if (TRACE) {
    const rows = Object.entries(TRACE).map(([k, v]) => {
      const n = v.length, mean = v.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
      const h = {}; for (const x of v) h[x] = (h[x] || 0) + 1;
      const top = Object.entries(h).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([x, c]) => x + 'x' + c).join(' ');
      return [k, n, mean, sd, Math.min(...v), Math.max(...v), top];
    }).sort((a, b) => b[3] * Math.sqrt(b[1]) - a[3] * Math.sqrt(a[1]));
    for (const r of rows.slice(0, 30)) console.log(r[0].padEnd(16), String(r[1]).padStart(7), 'mean', r[2].toFixed(0).padStart(6), 'sd', r[3].toFixed(0).padStart(6), 'min', r[4], 'max', r[5], ' ', r[6]);
  }
  cost['@after'] = AFTER;
  cost['@irq'] = {};
  for (const [k, [s, n]] of Object.entries(bands)) cost['@irq'][k] = Math.round(s / n);
  return cost;
}

const r = ls.run({ passes: PASSES, onPass, onFrame });
const out = describe(r);
console.log(Array.isArray(out) ? out.join('\n') : out);
console.log(`${r.passes} passes, ${games} games played to the end (${at.over} game over), ${deaths} deaths, ${rooms.size} rooms, ${endings} endings, ${race.count} colours caught by the title tune`);
if (costFile && r.ok) {
  const cost = fitCost(), src = fs.readFileSync(costFile, 'utf8'), line = /^  const COST = .*;$/m;
  if (!line.test(src)) throw new Error('reference/storm-play.js has no line const COST = ...;');
  fs.writeFileSync(costFile, src.replace(line, () => '  const COST = ' + JSON.stringify(cost) + ';'));
  console.log('costs written to reference/storm-play.js:', JSON.stringify(cost));
}
process.exit(r.ok ? 0 : 1);
