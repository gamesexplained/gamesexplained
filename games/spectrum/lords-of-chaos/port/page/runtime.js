// The Play page's machine: the port (src/) run as a 48K Spectrum would run the game, on chips of
// its own. It runs in the browser and in node (test/t-page.js, ../test_play.js), and refers to
// nothing but LOCPort and the port's groups.
//
//   const rt = LOCPage.create({ data, cost })
//     data     the machine as the loader hands over ($E1ED): ram, the 48 KB from $4000 (from), as
//              base64, every instruction blanked but those the port also reads as data
//              (scripts/pack-data.js); border; rom, { from, bytes }, the ROM's font the game prints
//              with (../rom-excerpt.json); and tape, the game's files as side one of the cassette
//              holds them after the program, [{ flag, bytes }], their instructions blanked too
//     cost     the pacing (scripts/fit-cost.js, cost.json): { seg: { 'from>to': T-states }, call:
//              { routine: T-states, '#count': T-states }, irq, irqCall }: each stretch's own, each
//              routine's and each count of the work inside them (P.N, src/core.js), measured or
//              fitted on the game; the interrupt's own (irq) and each routine's inside it (irqCall)
//     io       (the tests) readR and readAt in place of the page's own: a seeded refresh register,
//              and the bytes random_below reads as it walks through memory
//   rt.runFrame()      one frame of time: the program runs until the clock reaches the frame's end;
//                      returns the frame that ends there, { frame, screen (the 6,912 bytes shown),
//                      border, flash, at (the clock's time when the picture was taken) }
//   rt.shown           that frame's number: the clock can be ahead of it
//   rt.input           { keys: Set of key names (kit/spectrum/machine.js's), joy: the Kempston
//                      interface's bits (right, left, down, up and fire in bits 0 to 4, set when
//                      held) }
//   rt.tape            the cassette: blocks ({ flag, bytes }), the game's files and then whatever
//                      is saved or added, and pos, the next to play; add(blocks) puts blocks at the
//                      end, onSave(f) calls f(block) for each block the game saves
//   rt.onBeep(f)       f(value, T-state) for each change of the speaker (bit 4 of the byte written
//                      to port $FE)
//   rt.missing         the stretches met that the cost model has no figure for, 'from>to' in hex
//   rt.restore(state, entry)   a machine saved by the tests (kit/spectrum/machine.js's save()),
//                      and the program started at entry(P), a generator (test/t-page.js)
//
// The clock. A 48K: 312 lines of 224 T-states, the interrupt at each frame's start while the game
// has its own handler in place (interrupt mode 2, P.IM) and the interrupts on (P.IFF); in mode 1,
// in the file panels, the game keeps them off. Each stretch of the program moves the clock on by
// its cost, and the interrupts that fall due on the way run there, their own time added: a HALT
// waits for the next; a turn of a polling loop moves the clock to the next line; a wait on a
// counter the interrupt moves ({ tstates }) moves it by that turn's T-states. A stretch costs what
// it cost the game: its own T-states (seg, by the checkpoints it runs between, the HALT's exit
// among them), each routine the port called in it at its own (call), and each count of the work
// inside them (P.N: squares and maps drawn, random numbers drawn) at its own, measured or fitted on
// the game (scripts/fit-cost.js). The interrupt costs its own and each routine called inside it its
// own (irqCall).
// The T-states the port counts itself (P.T: the delay loops and the sounds, src/g-sound.js) move
// the clock by as many, and each edge of the speaker sounds at its own T-state. The clock moves as
// the routines are called, not once at the stretch's end.
//
// The cassette. A load plays the next block; past the last it goes back to the first, as a player
// rewinding to look for a file. A search that has read more blocks than the cassette holds since a
// file last loaded (a name no file on it starts with) stops at the end of the tape, and the ROM's
// wait for a signal comes, until SPACE is held; the tape is then wound back to its start. A save
// puts its block at the end.
//
// The refresh register, which random_below reads ($A738), counts the instructions the processor
// has run: no port can know it, so the page draws a byte of its own each time.
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
// the frames kept ahead of the one shown (the longest stretch the game runs with no read of the
// controls and no HALT, the start of a game, lasts some nine seconds, and is shown frame by frame as
// the clock went through it), and the least a stretch between two checkpoints costs
const AHEAD = 1000, MIN_STRETCH = 10;
// the one HALT's exit, in the summoning animation: a checkpoint of the stretches
const HALT_AT = 0x829B;
const b64 = s => typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), c => c.charCodeAt(0));

function create(o) {
  const D = root.LOCPort;
  const M = new Uint8Array(0x10000);
  const input = { keys: new Set(), joy: 0 }, beepers = [];
  let border = 7, ear = 0;

  // ---- the clock, and the frames as the beam shows them
  let t = 0, nextInt = 1, frameIdx = 0, taken = false, cur = null, target = null;
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

  // ---- the cassette
  // run counts the blocks played since a file's data last loaded (a load asking for a data block,
  // flag $C8, that got one); ended, the tape at its end, makes pos the end, where the port's LD-BYTES
  // waits for SPACE, and SPACE held (io.in) winds it back to the start.
  const tape = {
    blocks: (o.data.tape || []).map(b => ({ flag: b.flag, bytes: b64(b.bytes) })),
    at: 0, saved: [], run: 0, ended: false,
    get pos() {
      if (!this.blocks.length) return 0;
      if (this.run > this.blocks.length) this.ended = true;
      return this.ended ? this.blocks.length : this.at % this.blocks.length;
    },
    set pos(v) { this.at = v; },
    load(flag) {
      if (!this.blocks.length) return null;
      const at = this.at % this.blocks.length, b = this.blocks[at];
      this.at = (at + 1) % this.blocks.length;
      if (flag === 0xC8 && b.flag === 0xC8) this.run = 0; else this.run++;
      return b;
    },
    save(flag, bytes) {
      const b = { flag, bytes: Uint8Array.from(bytes) };
      this.blocks.push(b); this.at = 0; this.run = 0; this.ended = false;
      for (const f of this.saved) f(b);
      return true;
    },
    rewind() { this.at = 0; this.run = 0; this.ended = false; },
    add(list) { for (const b of list) this.blocks.push({ flag: b.flag, bytes: Uint8Array.from(b.bytes) }); },
    onSave(f) { this.saved.push(f); },
  };

  // ---- the chips: the keyboard, the Kempston interface, the border and the speaker. A write the
  // port times (with the T-states it has counted, P.T) lands that far on from where the clock last
  // took P.T; any other, now.
  let lastT = 0;
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
      // SPACE held at the end of the tape: the player stops the search and winds the tape back to
      // its start, so that the next search reads each file's header before its data
      if (tape.ended && !(high & 0x80) && !(v & 1)) tape.rewind();
      return 0xA0 | v;
    },
    out(port, v, T) {
      if (port & 1) return;
      v &= 255;
      border = v & 7;
      const e = (v >> 4) & 1;
      if (e !== ear) {
        const at = T !== undefined ? t + Math.max(0, T - lastT) : t;
        for (const f of beepers) f(e, at);
      }
      ear = e;
    },
    irqByte: a => irqByte(a),
    readAt: a => M[a],
    readR: () => (Math.random() * 256) | 0,
    tape,
  };
  Object.assign(io, o.io || {});

  // ---- the program, and what its stretches cost
  const P = D.makePort(M, io, {});
  const ROM = o.data.rom ? { from: o.data.rom.from, bytes: b64(o.data.rom.bytes) } : null;
  const model = o.cost || { seg: {}, call: {} };
  const IRQ = model.irq || 0, irqCall = model.irqCall || {};
  let counting = true, owed = 0, irqOwed = 0;
  const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
  for (const name of new Set(Object.keys(model.call).concat(Object.keys(irqCall)))) {
    const f = P[name];
    if (typeof f !== 'function' || name[0] === '#') continue;
    const c = model.call[name] || 0, ci = irqCall[name] || 0;
    P[name] = f instanceof GENERATOR
      ? function* (...a) { if (counting) called(c); else irqOwed += ci; return yield* f.apply(this, a); }
      : function (...a) { if (counting) called(c); else irqOwed += ci; return f.apply(this, a); };
  }
  // a routine called: what was called before it is paid for once it comes to a line's time
  function called(c) {
    owed += c;
    if (owed >= LINE) pay();
  }
  // the routines called and the work counted since the clock last moved, at their cost
  function callsCost() {
    let c = owed;
    owed = 0;
    for (const k in P.N) { if (P.N[k] && k !== 'beep') c += (model.call['#' + k] || 0) * P.N[k]; P.N[k] = 0; }
    return c;
  }
  // what the stretch has cost so far: the calls, and the T-states the port counted itself
  function pay() {
    const c = callsCost() + (P.T - lastT);
    lastT = P.T;
    if (c >= 1) advance(Math.round(c));
  }
  // a stretch the fit never saw costs only its calls: test/t-page.js fails on any it meets
  const missing = new Set();
  function cost(from, to) {
    const k = from.toString(16) + '>' + to.toString(16);
    if (!(k in model.seg)) missing.add(k);
    const c = (model.seg[k] || 0) + callsCost() + (P.T - lastT);
    lastT = P.T;
    return Math.round(c);
  }
  // A byte the interrupt writes, read in the middle of a stretch: the clock first moves on by what
  // the stretch has cost so far, so that the interrupts due in that time have run
  function irqByte(a) { if (counting) pay(); return M[a]; }

  // ---- the interrupt: at each frame's start, the game's handler ($A879, through the vector at
  // $FFFF) while it is in place and the interrupts are on; its own time added, with its routines'
  // and the T-states its sounds count. What it counts of the work (P.N) is its own, not the
  // stretch's.
  function advance(dt) {
    let end = t + dt, handled = 0;
    while (nextInt * FRAME <= end) {
      t = Math.max(t, nextInt * FRAME); nextInt++;
      roll();
      if (P.IFF && P.IM === 2) {
        // a page that stops with a message is better than a tab that freezes
        if (++handled > 1e5) throw new Error('the interrupt ran 100,000 times in one stretch');
        counting = false; irqOwed = 0;
        const T0 = P.T, before = lastT, N0 = Object.assign({}, P.N);
        lastT = T0;
        try { P.interrupt({}); } finally { counting = true; }
        for (const k in P.N) {
          const d = (P.N[k] || 0) - (N0[k] || 0);
          if (d) { irqOwed += (irqCall['#' + k] || 0) * d; P.N[k] = N0[k] || 0; }
        }
        const len = Math.round(IRQ + irqOwed + (P.T - T0));
        lastT = before + (P.T - T0);
        t += len; end += len;
        // a frame start that passes while the handler runs is missed: the handler runs with the
        // interrupts off, and the ULA holds its interrupt for only 32 T-states
        while (nextInt * FRAME < t) nextInt++;
      }
    }
    t = Math.max(t, end); roll();
  }

  // spinning: the program has gone into a loop it never leaves (P.Hang); from then on only the
  // clock and the interrupt go on, as on the Spectrum
  let it = null, lastCp = null, spinning = false;
  function step() {
    if (spinning) { advance(LINE - t % LINE); return; }
    let r;
    try { r = it.next(); } catch (e) { if (!(e instanceof P.Hang)) throw e; spinning = true; return; }
    if (r.done) throw new Error('the program ended');
    const y = r.value;
    if (y && y.cp !== undefined) {
      // a stretch takes the game some T-states, whatever the fit gave it: a loop of nothing the
      // fit knows still lets the clock, and with it the keys, move on
      const dt = lastCp === null ? 0 : Math.max(MIN_STRETCH, cost(lastCp, y.cp));
      lastCp = y.cp;
      advance(dt);
    } else if (y && y.halt) {
      // the HALT: the stretch to it paid, then on to the next frame's start, where the interrupt runs
      advance(lastCp === null ? 0 : cost(lastCp, HALT_AT));
      lastCp = HALT_AT;
      advance(Math.max(1, nextInt * FRAME - t));
    } else if (y && y.tstates !== undefined) {
      // a wait's turn: counted on P.T already when clocked
      if (y.clocked) pay(); else { pay(); advance(y.tstates); }
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
    t = s.cpu ? s.cpu.tstates : s.tstates || 0; target = null;
    P.IFF = s.cpu ? !!s.cpu.iff1 : false;
    P.IM = s.cpu ? s.cpu.im : 1;
    frameIdx = Math.floor(t / FRAME); nextInt = frameIdx + 1; taken = t >= frameIdx * FRAME + PAPER;
    if (taken) cur = frameNow();
    done.length = 0;
    it = entry(P); lastCp = null; owed = 0; lastT = P.T; spinning = false;
    for (const k in P.N) P.N[k] = 0;
  }
  restore(o.data, p => { p.part = 0; return p.run(0xE1ED); });
  return {
    M, P, input, KEY, tape,
    get t() { return t; }, get frame() { return frameIdx; }, get target() { return target; },
    get shown() { return target === null ? frameIdx - 1 : Math.floor(target / FRAME) - 1; },
    get border() { return border; }, missing,
    runFrame, runUntil, restore, lastFrame: () => (target === null ? done[done.length - 1] : frameAt(Math.floor(target / FRAME) - 1)),
    onBeep: f => beepers.push(f),
  };
}
root.LOCPage = { create, LINE, LINES, FRAME, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
