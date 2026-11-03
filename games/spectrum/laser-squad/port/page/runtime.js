// The Play page's machine: the port (src/) run as a 48K Spectrum would run the game, on chips of
// its own. It runs in the browser and in node (../test_play.js, scripts/time-stretches.js), and
// refers to nothing but LSPort and the port's groups.
//
//   const rt = LSPage.create({ data, cost, tape, seed })
//     data     the machine at the engine's first instruction ($5E28): ram, the 48 KB from $4000
//              (from), as base64, every byte of the engine's code a zero but those the port keeps
//              state in (scripts/pack-data.js); blank, the runs of bytes left out, [[address,
//              length], ...]; and scenarios, each scenario's block as the cassette holds it, by
//              the scenario's number ($B622, the address of its computer player): { flag, bytes
//              (base64, its code left out the same way), blank }
//     cost     the pacing (scripts/fit-cost.js, cost.json): { seg: { 'from>to': T-states }, call:
//              { routine: T-states, '#count': T-states } }: each stretch's own, each routine's and
//              each count of the work inside them (P.N, src/core.js), fitted on the game
//     tape     the cassette: load(flag, length), which gives { flag, bytes } or null for none, and
//              save(flag, bytes)
//     seed     the noise's seed (optional: the time, otherwise)
//   rt.runFrame()      one frame of time: the program runs until the clock reaches the frame's end;
//                      returns the frame that ends there, { frame, screen (the 6,912 bytes shown),
//                      border, flash, at (the clock's time when the picture was taken) }
//   rt.shown           that frame's number: the clock can be ahead of it
//   rt.input           { keys: Set of key names (KEY, below), joy: the Kempston interface's bits
//                      (right, left, down, up and fire in bits 0 to 4, set when held), reads: how
//                      often the program has read the keyboard and the joystick, seen: the key
//                      names a read has found held, seenJoy: the stick's bits a read has found
//                      held (the page clears a key's when it goes down) }
//   rt.onBeep(f)       f(value, T-state) for each change of the beeper (bit 4 of the byte written
//                      to port $FE)
//   rt.onCheckpoint(f) f(address, T-state) as the clock reaches each checkpoint, its stretch paid
//   rt.onFrame(f)      f(frame number) as the clock finishes each frame, the memory as it is then:
//                      the clock runs ahead of the frame on show (rt.shown) while the program does
//                      not wait, as in the computer's turn
//   rt.missing         the stretches met that the cost model has no figure for, 'from>to' in hex
//   rt.blank           the bytes the page does not carry: 1 for each, the ROM's too
//
// The clock. A 48K: 312 lines of 224 T-states. The game turns the interrupts off at its first
// instruction and never on again, so nothing but the program moves it. A stretch of the program
// between two checkpoints costs what it cost the game: its own T-states (seg, by the checkpoints
// it runs between), each routine the port called in it at its own (call; the scenario's own
// routines too, countScenario), and each count of the work inside them (P.N: views drawn, lines
// of sight walked, words printed) at its own, fitted on the game's stretches (scripts/
// fit-cost.js). What the port spends on the game's clock (P.spend: the delay loops, the sound
// effects and the tape) is added as it is spent, and each edge of the beeper lands at the T-state
// the sound's loops give it. The clock moves as the routines are called, not once at the
// stretch's end, so a long stretch (the computer's half-turn) shows the screen as it changes. The
// one bare yield, the wait for SPACE to be let go after the tape, moves it to the next line.
//
// The random numbers. The game's add the refresh register (R, which no port can keep) to a byte
// at a pointer that walks through the whole of memory: on the page R is noise, and so is each
// byte the walk reads that the page does not carry (the ROM, the game's code, the stack).
(function (root) {
'use strict';
const LINE = 224, LINES = 312, FRAME = LINE * LINES;
// where the beam reaches the paper's first line, the T-state at which a frame's picture is taken
const PAPER = 64 * LINE;
// the keys by half-row and bit (half-row x 8 + bit), as kit/spectrum/machine.js names them
const KEY = {
  CAPS: 0x00, Z: 0x01, X: 0x02, C: 0x03, V: 0x04,
  A: 0x08, S: 0x09, D: 0x0A, F: 0x0B, G: 0x0C,
  Q: 0x10, W: 0x11, E: 0x12, R: 0x13, T: 0x14,
  '1': 0x18, '2': 0x19, '3': 0x1A, '4': 0x1B, '5': 0x1C,
  '0': 0x20, '9': 0x21, '8': 0x22, '7': 0x23, '6': 0x24,
  P: 0x28, O: 0x29, I: 0x2A, U: 0x2B, Y: 0x2C,
  ENTER: 0x30, L: 0x31, K: 0x32, J: 0x33, H: 0x34,
  SPACE: 0x38, SYMBOL: 0x39, M: 0x3A, N: 0x3B, B: 0x3C,
};
// the frames kept ahead of the one shown (a screen that has not changed is kept once), and the
// least a stretch between two checkpoints costs
const AHEAD = 4000, MIN_STRETCH = 10;
// the port's helpers, which are not routines of the game: neither the fit nor the page costs them
const HELPERS = new Set(['w', 'setw', 'def', 'defIn', 'jump', 'jumpGen', 'run', 'program', 'useScenario', 'scenarioId',
  'count', 'spend', 'take', 'restart', 'Restart', 'loops', 'at']);
const b64 = s => typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), c => c.charCodeAt(0));
const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
const wrap = (f, call) => f instanceof GENERATOR
  ? function* (...a) { call(); return yield* f.apply(this, a); }
  : function (...a) { call(); return f.apply(this, a); };

// The scenario's own routines, which are in P only while their scenario is loaded: each called
// gives called(name), 'ai.' and the name for the computer player's (g-ai.js, which call each other
// through their table), 'sc.' and the name for the rest (g-scenario.js).
function countScenario(P, called) {
  for (const id of Object.keys(P.SC)) {
    const S = P.SC[id], R = S.ai, own = new Set();
    if (R) for (const k of Object.keys(R)) {
      if (typeof R[k] !== 'function') continue;
      const f = R[k], name = 'ai.' + k;
      own.add(f);
      R[k] = wrap(f, () => called(name));
    }
    for (const [a, [name, f]] of S) {
      const key = (own.has(f) ? 'ai.' : 'sc.') + name;
      S.set(a, [name, wrap(f, () => called(key))]);
    }
  }
}

function runs(list, into, v = 1) { for (const [a, n] of list || []) into.fill(v, a, a + n); }

function create(o) {
  const D = root.LSPort;
  const M = new Uint8Array(0x10000);
  const input = { keys: new Set(), joy: 0, reads: 0, seen: new Set(), seenJoy: 0 }, beepers = [], checkpoints = [], framers = [];
  let border = 0, ear = 0;

  // ---- the noise: R, and the bytes the page does not carry
  let seed = (o.seed >>> 0) || ((Math.random() * 4294967296) >>> 0) || 1;
  const noise = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed >>> 24; };
  const blank = new Uint8Array(0x10000);
  const scenarios = {};
  for (const [id, s] of Object.entries(o.data.scenarios || {})) scenarios[id] = { flag: s.flag, bytes: b64(s.bytes), blank: s.blank };

  // ---- the clock, and the frames as the beam shows them
  let t = 0, frameIdx = 0, taken = false, cur = null, target = null, last = null;
  const done = [];
  // the screen as it is now: the same array as the frame before when nothing has changed
  function screenNow() {
    const s = M.subarray(0x4000, 0x5B00);
    if (last) { let k = 0; while (k < 6912 && last[k] === s[k]) k++; if (k === 6912) return last; }
    return (last = s.slice());
  }
  const frameNow = () => ({ frame: frameIdx, screen: screenNow(), border, flash: (frameIdx >> 4) & 1, at: t });
  function roll() {
    for (;;) {
      if (!taken && t >= frameIdx * FRAME + PAPER) { cur = frameNow(); taken = true; }
      if (t < (frameIdx + 1) * FRAME) break;
      if (!taken) cur = frameNow();
      done.push(cur); if (done.length > AHEAD) done.shift();
      for (const f of framers) f(cur.frame);
      frameIdx++; taken = false;
    }
  }
  function advance(dt) { t += dt; roll(); }

  // ---- the chips: the keyboard, the Kempston interface, the border and the beeper. A write the
  // port times (with the T-states it has counted, P.T) lands that far on from the clock's now.
  const io = {
    in(port) {
      input.reads++;
      if ((port & 0x20) === 0 && (port & 1)) { input.seenJoy |= input.joy; return input.joy & 0x1F; }
      if (port & 1) return 0xFF;
      const high = port >> 8;
      let v = 0x1F;
      for (const name of input.keys) {
        const k = KEY[name];
        if (k !== undefined && !(high & (1 << (k >> 3)))) { v &= ~(1 << (k & 7)); input.seen.add(name); }
      }
      return 0xA0 | v;
    },
    out(port, v, T) {
      if (port & 1) return;
      border = v & 7;
      const e = (v >> 4) & 1;
      if (e !== ear) {
        const at = t + owed + (T === undefined ? 0 : T - P.T);
        for (const f of beepers) f(e, at);
      }
      ear = e;
    },
    r: () => noise() & 0x7F,
    irqByte: () => noise(),
    walkByte: a => blank[a] ? noise() : M[a],
    get tape() { return o.tape || null; },
  };

  // ---- the program, and what its stretches cost
  const P = D.makePort(M, io, {});
  const model = o.cost || { seg: {}, call: {} };
  let owed = 0;
  for (const name of Object.keys(model.call)) {
    if (name[0] === '#' || HELPERS.has(name) || typeof P[name] !== 'function') continue;
    const c = model.call[name];
    P[name] = wrap(P[name], () => { owed += c; if (owed >= LINE) pay(); });
  }
  countScenario(P, name => { const c = model.call[name]; if (c) { owed += c; if (owed >= LINE) pay(); } });
  // what the port spends on the game's clock is paid as it is spent
  P.spend = n => { P.T += n; owed += n; if (owed >= LINE) pay(); };
  // the bytes of the scenario loaded that the page does not carry, by the scenario's number
  const use = P.useScenario;
  P.useScenario = id => {
    const got = use(id);
    blank.fill(0, 0xB621);
    const s = scenarios[P.w(0xB622)];
    if (s) runs(s.blank, blank); else blank.fill(1, 0xB621);
    return got;
  };
  function callsCost() {
    let c = owed;
    owed = 0;
    for (const k in P.N) { if (P.N[k]) c += (model.call['#' + k] || 0) * P.N[k]; P.N[k] = 0; }
    return c;
  }
  function pay() { const c = callsCost(); if (c > 0) advance(c); }
  // a stretch the fit never saw costs a line and its calls, so that it runs slow rather than not
  // at all: ../test_play.js fails on any it meets
  const missing = new Set();
  function cost(from, to) {
    const k = from.toString(16) + '>' + to.toString(16);
    if (!(k in model.seg)) missing.add(k);
    return (k in model.seg ? model.seg[k] : LINE) + callsCost();
  }

  let it = null, lastCp = null;
  function step() {
    const r = it.next();
    if (r.done) throw new Error('the program ended');
    const y = r.value;
    if (y && y.cp !== undefined) {
      const dt = lastCp === null ? 0 : Math.max(MIN_STRETCH, cost(lastCp, y.cp));
      lastCp = y.cp;
      advance(dt);
      for (const f of checkpoints) f(y.cp, t);
    } else if (y && y.tstates !== undefined) {
      pay(); advance(y.tstates);
    } else {
      // a turn of a polling loop: what the stretch has cost so far, then on to the next line
      pay(); advance(LINE - t % LINE);
    }
  }
  function runUntil(until) {
    let guard = 0;
    while (t < until) {
      step();
      if (++guard > 2e6) throw new Error('runUntil: no progress');
    }
  }
  function frameAt(n) {
    if (!done.length) return undefined;
    const i = n - done[0].frame;
    return done[Math.max(0, Math.min(done.length - 1, i))];
  }
  function runFrame() {
    if (target === null) target = t;
    target += FRAME;
    if (t < target) runUntil(target);
    return frameAt(Math.floor(target / FRAME) - 1);
  }

  // the machine at the engine's first instruction
  M.set(b64(o.data.ram), o.data.from || 0x4000);
  blank.fill(1, 0, 0x4000);
  runs(o.data.blank, blank);
  it = P.program(0x5E28);
  return {
    M, P, input, KEY, missing, blank,
    get t() { return t; }, get frame() { return frameIdx; },
    get shown() { return target === null ? frameIdx - 1 : Math.floor(target / FRAME) - 1; },
    get border() { return border; },
    runFrame, runUntil, lastFrame: () => (target === null ? done[done.length - 1] : frameAt(Math.floor(target / FRAME) - 1)),
    onBeep: f => beepers.push(f),
    onCheckpoint: f => checkpoints.push(f),
    onFrame: f => framers.push(f),
    scenarios,
  };
}
root.LSPage = { create, countScenario, HELPERS, LINE, LINES, FRAME, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
