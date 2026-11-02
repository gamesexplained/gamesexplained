// The Play page's machine: the port (src/) run as a 48K Spectrum would run the game, on chips of
// its own. It runs in the browser and in node (test/t-page.js, ../test_play.js), and refers to
// nothing but DRPort and the port's groups.
//
//   const rt = DRPage.create({ data, cost, tape })
//     data     the machine as the loader hands over ($97A4): ram, the 48 KB from $4000 (from), as
//              base64, every instruction blanked but those the game also reads as data
//              (scripts/pack-data.js); border; and rom, { from, bytes }, the ROM's bytes the game
//              reads (../rom-excerpt.json)
//     cost     the pacing (scripts/fit-cost.js, cost.json): { seg: { 'from>to': T-states }, call:
//              { routine: T-states, '#count': T-states }, irq }: each stretch's own, each routine's
//              and each count of the work inside them (P.N, src/core.js), fitted on the game, and
//              the interrupt's (irq), with each count of its own work (irqN: P.NI, the sensors'
//              beams), fitted on the game's interrupts
//     tape     the cassette, as src/g-menu.js's info screen uses it: save(flag, bytes) and
//              load(flag, length), which gives { flag, bytes }, null for none, or undefined while
//              the page waits for the player to pick a file
//   rt.runFrame()      one frame of time: the program runs until the clock reaches the frame's end;
//                      returns the frame that ends there, { frame, screen (the 6,912 bytes shown),
//                      border, flash, at (the clock's time when the picture was taken) }
//   rt.shown           that frame's number: the clock can be ahead of it
//   rt.input           { keys: Set of key names (kit/spectrum/machine.js's), joy: the Kempston
//                      interface's bits (right, left, down, up and fire in bits 0 to 4, set when
//                      held) }
//   rt.onBeep(f)       f(value, T-state) for each change of the beeper (bit 4 of the byte written
//                      to port $FE)
//   rt.missing         the stretches met that the cost model has no figure for, 'from>to' in hex
//   rt.wiped           true once three wrong answers to the security question have wiped memory and
//                      reset the machine, as the game does: the program has stopped
//   rt.restore(state, entry)   a machine saved by the tests (kit/spectrum/machine.js's save()),
//                      and the program started at entry(P), a generator (test/t-page.js)
//
// The clock. A 48K: 312 lines of 224 T-states, the interrupt at each frame's start once the game
// has set up its own (install_interrupt), unless the interrupts are off. Each stretch of the
// program moves the clock on by its cost, and the interrupts that fall due on the way run there,
// their own time added; a turn of a polling loop moves it to the next line, and a turn of a tight
// wait on a counter the interrupt moves ({ tstates }) by that turn's T-states. A stretch costs what
// it cost the game: its own T-states (seg, by the checkpoints it runs between), each routine the
// port called in it at its own (call), and each count of the work inside them (P.N: rows and bytes
// of a face filled, rows and steps of an edge, characters printed) at its own, fitted on the
// game's passes (scripts/fit-cost.js). The clock moves as the routines are called, not once at the
// stretch's end. A sound effect plays with the interrupts off: the clock moves on by the
// T-states its loops take, each edge of the beeper at its own T-state, and the interrupts that
// fall due meanwhile are lost, as on the Spectrum (the game's clock loses them too). The sensors'
// hit, which the interrupt itself plays, lengthens that interrupt by its sound, and a beam it draws
// by the beam's cost.
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
// the frames kept ahead of the one shown, and the least a stretch between two checkpoints costs
const AHEAD = 200, MIN_STRETCH = 10;
const b64 = s => typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), c => c.charCodeAt(0));

function create(o) {
  const D = root.DRPort;
  const M = new Uint8Array(0x10000);
  const input = { keys: new Set(), joy: 0 }, beepers = [];
  let border = 7, ear = 0;

  // ---- the clock, and the frames as the beam shows them
  let t = 0, nextInt = 1, frameIdx = 0, taken = false, cur = null, target = null;
  let irqsOn = false, di = false, wiped = false;
  const done = [];
  const frameNow = () => ({ frame: frameIdx, screen: M.slice(0x4000, 0x4000 + 6912), border, flash: (frameIdx >> 4) & 1, at: t });
  // the frames the clock has finished, each with the picture as the beam reached the paper
  function roll() {
    for (;;) {
      if (!taken && t >= frameIdx * FRAME + PAPER) { cur = frameNow(); taken = true; }
      if (t < (frameIdx + 1) * FRAME) break;
      if (!taken) cur = frameNow();
      done.push(cur); if (done.length > AHEAD) done.shift();
      frameIdx++; taken = false;
    }
  }

  // ---- the chips: the keyboard, the Kempston interface, the border and the beeper. A write the
  // sound effects time (with the T-states the port has counted, P.T) lands that far into the
  // effect; any other, now.
  let sound = null;                                 // { t, T }: where the effect playing began
  const io = {
    in(port) {
      if ((port & 0x20) === 0 && (port & 1)) return input.joy & 0x1F;
      if (port & 1) return 0xFF;
      const high = port >> 8;
      let v = 0x1F;
      for (const name of input.keys) {
        const k = KEY[name];
        if (k !== undefined && !(high & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
      }
      return 0xA0 | v;
    },
    out(port, v, T) {
      if (port & 1) return;
      v &= 255;
      border = v & 7;
      const e = (v >> 4) & 1;
      if (e !== ear) {
        const at = sound && T !== undefined ? sound.t + (T - sound.T) : t;
        for (const f of beepers) f(e, at);
      }
      ear = e;
    },
    irqByte: a => irqByte(a),
    get tape() { return o.tape || null; },
  };

  // ---- the program, and what its stretches cost
  const P = D.makePort(M, io, {});
  P.T = P.T || 0;
  const ROM = o.data.rom ? { from: o.data.rom.from, bytes: b64(o.data.rom.bytes) } : null;
  const model = o.cost || { seg: {}, call: {} };
  const IRQ = model.irq || 0, IRQN = model.irqN || {};
  let calls = Object.create(null), counting = true, owed = 0;
  const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
  for (const name of Object.keys(model.call)) {
    const f = P[name];
    if (typeof f !== 'function') continue;
    const c = model.call[name];
    P[name] = f instanceof GENERATOR
      ? function* (...a) { if (counting) called(name, c); return yield* f.apply(this, a); }
      : function (...a) { if (counting) called(name, c); return f.apply(this, a); };
  }
  // a routine called: what was called before it is paid for once it comes to a line's time
  function called(name, c) {
    calls[name] = (calls[name] || 0) + 1;
    owed += c;
    if (owed >= LINE) pay();
  }
  // the routines called and the work counted since the clock last moved, at their cost
  function callsCost() {
    let c = owed;
    owed = 0; calls = Object.create(null);
    for (const k in P.N) { if (P.N[k]) c += (model.call['#' + k] || 0) * P.N[k]; P.N[k] = 0; }
    return c;
  }
  function pay() { const c = callsCost(); if (c >= 1) advance(Math.round(c)); }
  // a stretch the fit never saw costs only its calls: test/t-page.js fails on any it meets
  const missing = new Set();
  function cost(from, to) {
    const k = from.toString(16) + '>' + to.toString(16);
    if (!(k in model.seg)) missing.add(k);
    return Math.round((model.seg[k] || 0) + callsCost());
  }
  // A byte the interrupt writes, read in the middle of a stretch: the clock first moves on by what
  // the stretch has cost so far, so that the interrupts due in that time have run
  function irqByte(a) { if (counting) pay(); return M[a]; }
  // a sound effect: what came before it paid, then its edges from now, then its length with the
  // interrupts off
  const play = P.play_sound;
  P.play_sound = function (r) {
    if (!counting) return play.call(this, r);       // the interrupt's own, timed with it
    pay();
    sound = { t, T: P.T };
    let res;
    try { res = play.call(this, r); } finally { const len = P.T - sound.T; sound = null; di = true; try { advance(len); } finally { di = false; } }
    return res;
  };
  // the game's interrupt is set up by install_interrupt: before it the interrupts are off
  const install = P.install_interrupt;
  P.install_interrupt = function (r) { const res = install.call(this, r); irqsOn = true; return res; };

  // ---- the interrupt: at each frame's start, the game's handler ($BAE6) unless the interrupts are
  // off; its own time added, and the sensors' hit it plays
  function advance(dt) {
    let end = t + dt;
    while (nextInt * FRAME <= end) {
      t = Math.max(t, nextInt * FRAME); nextInt++;
      roll();
      if (irqsOn && !di) {
        counting = false;
        const T0 = P.T, outer = sound;
        sound = { t, T: T0 };
        for (const k in P.NI) P.NI[k] = 0;
        try { P.interrupt({}); } finally { counting = true; sound = outer; }
        let len = IRQ + (P.T - T0);
        for (const k in P.NI) if (k !== 'beep' && P.NI[k]) len += Math.round((IRQN['#' + k] || 0) * P.NI[k]);
        t += len; end += len;
      }
    }
    t = Math.max(t, end); roll();
  }

  let it = null, lastCp = null;
  function step() {
    let r;
    try { r = it.next(); } catch (e) {
      if (e === D.RESET) { wiped = true; irqsOn = false; it = null; return; }
      throw e;
    }
    if (r.done) throw new Error('the program ended');
    const y = r.value;
    if (y && y.cp !== undefined) {
      // a stretch takes the game some T-states, whatever the fit gave it: a loop of nothing the
      // fit knows still lets the clock, and with it the keys, move on
      const dt = lastCp === null ? 0 : Math.max(MIN_STRETCH, cost(lastCp, y.cp));
      lastCp = y.cp;
      advance(dt);
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
      if (!it) { advance(until - t); break; }      // wiped: the clock runs on, the screen as it is
      step();
      if (++guard > 2e6) throw new Error('runUntil: no progress');
    }
  }
  // the finished frame numbered n, or the nearest kept
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

  // a machine: the hand-over (data) or a test's moment, the program started at entry(P)
  function restore(s, entry) {
    const ram = b64(s.ram);
    M.fill(0); M.set(ram, s.from || 0);
    if (ROM) M.set(ROM.bytes, ROM.from);
    border = (s.border || 0) & 7; ear = (s.ear || 0) & 1;
    t = s.cpu ? s.cpu.tstates : s.tstates || 0; target = null; di = false; sound = null; wiped = false;
    irqsOn = s.cpu ? !!s.cpu.iff1 : false;
    frameIdx = Math.floor(t / FRAME); nextInt = frameIdx + 1; taken = t >= frameIdx * FRAME + PAPER;
    if (taken) cur = frameNow();
    done.length = 0;
    it = entry(P); lastCp = null; calls = Object.create(null); owed = 0;
    for (const k in P.N) P.N[k] = 0;
  }
  restore(o.data, p => p.program(true));
  return {
    M, P, input, KEY,
    get t() { return t; }, get frame() { return frameIdx; }, get target() { return target; },
    get shown() { return target === null ? frameIdx - 1 : Math.floor(target / FRAME) - 1; },
    get border() { return border; }, get wiped() { return wiped; }, missing,
    runFrame, runUntil, restore, lastFrame: () => (target === null ? done[done.length - 1] : frameAt(Math.floor(target / FRAME) - 1)),
    onBeep: f => beepers.push(f),
  };
}
root.DRPage = { create, LINE, LINES, FRAME, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
