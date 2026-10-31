// The Play page's machine: the port (src/) run as the C64 would run the game, on chips of its own.
// It runs in the browser and in node (../test_play.js), and refers to nothing but AMPort, the
// port's groups, site/lib/c64.js (the frames), site/lib/sid.js (the SID's bus) and the 6502 the
// sound driver runs on (site/lib/cpu6502.js on the page).
//
//   const rt = AMPage.create({ data, cost })
//     data     the machine where the loader hands over (game_start, $4E96), in the form
//              kit/c64/machine.js saves a machine: memory, colour RAM, the chips and the clock;
//              scripts/pack-data.js makes it from the listing, every instruction of the game but
//              the sound driver's left out
//     cost     the pacing, fitted on the game (scripts/fit-cost.js, cost.json): { seg: { 'from>to':
//              cycles }, call: { routine or '#count': cycles }, irq: { routine or '#count': cycles } }
//   rt.runFrame()      one frame of time: the program runs until the clock reaches the frame's end;
//                      returns the frame that ends there, for C64.renderFrame
//   rt.shown           that frame's number: the clock can be ahead of it
//   rt.runUntil(t)     the program run until the clock reaches t; rt.frameAt(n), frame n, under
//                      way or among the last finished, with its memory as it began (the tests)
//   rt.input           { keys: Set of key names (kit/c64/machine.js's), joy: the joystick in port 2,
//                      active low }
//   rt.onSid(f)        f(register, value, cycle) for every write to the SID
//   rt.restore(state, entry, from)   a machine saved by the tests (kit/c64/machine.js's save()),
//                      and the program started at entry(P), a generator, from the checkpoint at
//                      from
//
// The clock. A PAL machine: 312 lines of 63 cycles. Each stretch of the main program moves the
// clock on by its cost, and the raster interrupt (line $EB, once a frame) runs on its line when it
// falls due, its own time added; a turn of a polling loop moves the clock to the next line. A
// stretch costs what it cost the game: its own cycles (seg, by the checkpoints it runs between),
// each routine the port called in it at its own cycles, and each count of the work inside them
// (P.N: bytes filled and copied, characters drawn, cells of a window saved) at the cycles of one
// (call). The interrupt costs the same way (irq), with the sound driver's own cycles on its 6502
// core as they come. The clock moves as the routines are called, not once at a stretch's end, so
// that a window drawn over several frames shows as the C64 draws it.
//
// The video chip's own cycles. Those are the processor's cycles; the clock gives the video chip
// the cycles it takes from the processor on top, as the beam passes the lines it takes them on,
// by kit/c64/machine.js's rule (dma): cycles 12-54 of a bad line, and five cycles from 55 + 2n on
// each of the 21 lines (42 Y-expanded) sprite n is fetched on. The game's cycles were timed with
// the same rule, and these taken out (scripts/time-stretches.js).
//
// The interrupt flag. The game holds the raster's interrupt off (SEI) while it starts, and round
// the writes of the interrupt's hook; the port says where (P.sei, P.cli), and the flag changes
// once the stretch before is paid for, as the C64's does at the instruction.
(function (root) {
'use strict';
const LINE = 63, LINES = 312, FRAME = LINE * LINES;
// the keys by the KERNAL's numbers (row x 8 + column), as kit/c64/machine.js names them
const KEY = {
  DEL: 0x00, RETURN: 0x01, RIGHT: 0x02, F7: 0x03, F1: 0x04, F3: 0x05, F5: 0x06, DOWN: 0x07,
  '3': 0x08, W: 0x09, A: 0x0A, '4': 0x0B, Z: 0x0C, S: 0x0D, E: 0x0E, LSHIFT: 0x0F,
  '5': 0x10, R: 0x11, D: 0x12, '6': 0x13, C: 0x14, F: 0x15, T: 0x16, X: 0x17,
  '7': 0x18, Y: 0x19, G: 0x1A, '8': 0x1B, B: 0x1C, H: 0x1D, U: 0x1E, V: 0x1F,
  '9': 0x20, I: 0x21, J: 0x22, '0': 0x23, M: 0x24, K: 0x25, O: 0x26, N: 0x27,
  '+': 0x28, P: 0x29, L: 0x2A, '-': 0x2B, '.': 0x2C, ':': 0x2D, '@': 0x2E, ',': 0x2F,
  '£': 0x30, '*': 0x31, ';': 0x32, HOME: 0x33, RSHIFT: 0x34, '=': 0x35, UP: 0x36, '/': 0x37,
  '1': 0x38, LEFT: 0x39, CTRL: 0x3A, '2': 0x3B, SPACE: 0x3C, CBM: 0x3D, Q: 0x3E, STOP: 0x3F,
};
// the frames kept ahead of the one shown: more than the longest stretch, a week's end at about
// 38 frames, with room to spare
const AHEAD = 90;
// the least a stretch between two checkpoints costs
const MIN_STRETCH = 10;
// where the loader hands over, the checkpoint the first stretch runs from
const START = 0x4E96;

function create(o) {
  const AM = root.AMPort;
  const M = new Uint8Array(new ArrayBuffer(0x10000));
  const colour = new Uint8Array(new ArrayBuffer(0x400));
  const vic = new Uint8Array(0x40), sidw = new Uint8Array(0x20), sidListeners = [];
  let cmp = 0, latch = 0, enable = 0;
  let pra = 0xFF, ddra = 0, ddrb = 0, pra2 = 0x97, ddra2 = 0x3F;
  const bus = root.C64Sid ? root.C64Sid.engine().createBus('8580') : null;
  const input = { keys: new Set(), joy: 0x1F };

  // ---- the clock, and the frames as the beam draws them
  let t = 0, lastLine = -1, irqsOn = false;
  // the video chip's next look at its registers (cycle 12 or 55 of a line), whether line 48 saw the
  // display on, the lines left of each sprite's fetches, and the holds it has set
  let dma = { at: -1, holds: [], bad: false, rows: [0, 0, 0, 0, 0, 0, 0, 0] };
  const lineNow = () => Math.floor(t / LINE);
  const keep = {};
  const vm = root.C64 ? root.C64.videoMemory(M, colour, { keep, frames: AHEAD + 2 }) : null;
  let frameIdx = 0, cur = null;
  const done = [];
  const bank = () => 3 - ((pra2 | ~ddra2) & 3);
  function begin() {
    const f = vm ? vm.begin() : { mem: M.slice(), colour: colour.slice() };
    cur = { frame: frameIdx, vic: Array.from(vic.subarray(0, 47)), cia2: [pra2, ddra2], writes: [], mem: f.mem, colourMem: f.colour, keep };
  }
  // the lines the clock has passed (the latch set on the compare's), and the frames it has finished
  function roll() {
    const ln = lineNow();
    while (lastLine < ln) { lastLine++; if (lastLine % LINES === cmp) latch |= 1; }
    if (vm) vm.at(t, cur.writes, bank());
    while (t >= (frameIdx + 1) * FRAME) {
      done.push(cur); if (done.length > AHEAD) done.shift();
      frameIdx++;
      begin();
    }
  }

  // The video chip's next look at its registers or the start of its next hold, as a cycle
  function dmaNext() {
    const d = dma;
    if (d.at < 0) {
      const off = t % LINE;
      d.at = t - off + (off <= 11 ? 11 : off <= 54 ? 54 : LINE + 11);
      d.bad = (vic[0x11] & 0x10) !== 0;
    }
    return d.holds.length ? Math.min(d.at, d.holds[0][0]) : d.at;
  }
  // the hold or the look due by now: a hold moves the clock on by its length
  function dmaEvent() {
    const d = dma;
    if (d.holds.length && d.holds[0][0] === dmaNext()) {
      const [first, last] = d.holds.shift();
      t += last - first + 1;
      return;
    }
    const ls = d.at - d.at % LINE, ln = (ls / LINE) % LINES;
    if (d.at % LINE === 11) {
      if (ln === 0) d.bad = false;
      if (ln === 48 && (vic[0x11] & 0x10)) d.bad = true;
      if (d.bad && ln >= 48 && ln <= 247 && (ln & 7) === (vic[0x11] & 7)) d.holds.push([ls + 11, ls + 53]);
      d.at = ls + 54;
    } else {
      let hold = null;
      for (let n = 0; n < 8; n++) {
        if (!d.rows[n] && (vic[0x15] >> n & 1) && vic[1 + 2 * n] === (ln & 255)) d.rows[n] = vic[0x17] >> n & 1 ? 42 : 21;
        if (!d.rows[n]) continue;
        d.rows[n]--;
        const first = ls + 54 + 2 * n, last = first + 4;
        if (hold && first <= hold[1]) hold[1] = last;
        else { if (hold) d.holds.push(hold); hold = [first, last]; }
      }
      if (hold) d.holds.push(hold);
      d.at = ls + LINE + 11;
    }
  }
  // The processor's own cycles, at most own of them, until the clock reaches limit: the video
  // chip's holds on the way are added. Returns the own cycles left.
  function spend(own, limit) {
    for (;;) {
      const e = dmaNext();
      if (e <= t) { dmaEvent(); continue; }
      if (own <= 0 || t >= limit) return own;
      const s = Math.min(own, e - t, limit - t);
      t += s; own -= s;
    }
  }

  // ---- the chips
  // the keyboard's columns on port B, for the rows port A selects (kit/c64/machine.js's rule)
  function keyboard() {
    let v = 0xFF;
    const rows = ddra ? pra & ddra : 0xFF;
    for (const name of input.keys) {
      const k = KEY[name];
      if (k !== undefined && !(rows & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
    }
    return v;
  }
  function ioRead(a) {
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F, ln = lineNow() % LINES;
      if (r === 0x12) return ln & 255;
      if (r === 0x11) return (vic[0x11] & 0x7F) | ((ln >> 8) << 7);
      if (r === 0x19) { roll(); return latch | 0x70 | ((latch & enable) ? 0x80 : 0); }
      if (r === 0x1A) return enable | 0xF0;
      return vic[r];
    }
    if (a >= 0xD400 && a < 0xD800) {
      const r = a & 0x1F;
      if (r === 0x19 || r === 0x1A) return 0xFF;   // no paddles
      return bus ? bus.read(r, t, 0) : 0;
    }
    if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800] | 0xF0;
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15;
      // the joystick in port 2 on port A, the keyboard on port B
      if (r === 0) return (ddra ? (pra | ~ddra) & 0xFF : 0xE0 | input.joy) & (0xE0 | input.joy);
      if (r === 1) return keyboard();
      if (r === 2) return ddra;
      if (r === 3) return ddrb;
      return 0;
    }
    if (a >= 0xDD00 && a < 0xDE00) {
      const r = a & 15;
      if (r === 0) return (pra2 | ~ddra2) & 0xFF;
      if (r === 2) return ddra2;
      return 0;
    }
    return 0;
  }
  function ioWrite(a, v) {
    v &= 255;
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F;
      if (r < 47 && r !== 0x19 && r !== 0x1A) cur.writes.push([lineNow() % LINES, t % LINE + 1, 0xD000 + r, v]);
      if (r === 0x12) cmp = (cmp & 0x100) | v;
      else if (r === 0x11) { cmp = (cmp & 0xFF) | ((v & 0x80) << 1); vic[r] = v; }
      else if (r === 0x19) { roll(); latch &= ~v & 0x0F; }
      else if (r === 0x1A) enable = v & 0x0F;
      else vic[r] = v;
      return;
    }
    if (a >= 0xD400 && a < 0xD800) {
      sidw[a & 0x1F] = v;
      if (bus) bus.write(v, t);
      for (const f of sidListeners) f(a & 0x1F, v, t);
      return;
    }
    if (a >= 0xD800 && a < 0xDC00) { colour[a - 0xD800] = v & 15; return; }
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15;
      if (r === 0) pra = v; else if (r === 2) ddra = v; else if (r === 3) ddrb = v;
      return;
    }
    if (a >= 0xDD00 && a < 0xDE00) {
      const r = a & 15;
      if (r === 0 || r === 2) {
        if (r === 0) pra2 = v; else ddra2 = v;
        cur.writes.push([lineNow() % LINES, t % LINE + 1, a & 0xFFFF, v]);
      }
    }
  }

  let target = null;
  const io = {
    read: ioRead, write: ioWrite,
    vicRead: r => ioRead(0xD000 | (r & 0x3F)), vicWrite: (r, v) => ioWrite(0xD000 | (r & 0x3F), v),
    sidRead: r => ioRead(0xD400 | (r & 0x1F)), sidWrite: (r, v) => ioWrite(0xD400 | (r & 0x1F), v),
    colourRead: i => colour[i & 0x3FF], colourWrite: (i, v) => ioWrite(0xD800 | (i & 0x3FF), v),
    ciaRead: r => ioRead(0xDC00 | (r & 0x0F)), ciaWrite: (r, v) => ioWrite(0xDC00 | (r & 0x0F), v),
    cia2Read: r => ioRead(0xDD00 | (r & 0x0F)), cia2Write: (r, v) => ioWrite(0xDD00 | (r & 0x0F), v),
    irqByte: a => irqByte(a),
    sei: () => flag(false), cli: () => flag(true),
  };

  // ---- the program, and what its stretches cost
  const P = AM.makePort(M, io);
  const model = o.cost || { seg: {}, call: {}, irq: {} };
  const irqModel = model.irq || {};
  let calls = Object.create(null), counting = true, owed = 0, inIrq = false, icalls = Object.create(null);
  const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
  for (const name of new Set(Object.keys(model.call).concat(Object.keys(irqModel)))) {
    const f = P[name];
    if (typeof f !== 'function' || name[0] === '#') continue;
    const c = model.call[name] || 0;
    P[name] = f instanceof GENERATOR
      ? function* (...a) { if (counting) called(name, c); else if (inIrq) icalls[name] = (icalls[name] || 0) + 1; return yield* f.apply(this, a); }
      : function (...a) { if (counting) called(name, c); else if (inIrq) icalls[name] = (icalls[name] || 0) + 1; return f.apply(this, a); };
  }
  // a routine called: what was called before it is paid for once it comes to a line's time, past
  // the end of the frame the clock runs to if the stretch is long: the frames it passes are
  // finished as the C64 would finish them, a window drawn over several of them as it draws, and the
  // page shows them as their time comes. Nothing the interrupt does reads the controls, so running
  // it ahead of the real time changes nothing it does.
  function called(name, c) {
    calls[name] = (calls[name] || 0) + 1;
    owed += c;
    if (owed >= LINE) { const d = callsCost(); if (d >= 1) advance(Math.round(d)); }
  }
  // the routines called and the work counted since the clock last moved, at their cost
  function callsCost() {
    let c = owed;
    owed = 0;
    calls = Object.create(null);
    for (const k in P.N) { if (P.N[k]) c += (model.call['#' + k] || 0) * P.N[k]; P.N[k] = 0; }
    return c;
  }
  // the stretches met that the fit has no cost for (the tests list them)
  const unpriced = new Set();
  function cost(from, to) {
    const k = from.toString(16) + '>' + to.toString(16);
    if (!(k in model.seg)) unpriced.add(k);
    return Math.round((model.seg[k] || 0) + callsCost());
  }
  // A byte the interrupt writes, read in the middle of a stretch: the clock first moves on by what
  // the stretch has cost so far, so that the interrupts due in that time have run
  function irqByte(a) {
    if (counting) { const c = callsCost(); if (c >= 1) advance(Math.round(c)); }
    return M[a];
  }
  // the interrupt flag, changed once what the stretch has cost so far is paid
  function flag(on) {
    if (counting) { const c = callsCost(); if (c >= 1) advance(Math.round(c)); }
    irqsOn = on;
  }

  // ---- the interrupt: the raster's, while its latch and enable bits are set and the flag lets it
  function pending() { return latch & enable & 1; }
  function runIrq() {
    counting = false; inIrq = true; icalls = Object.create(null);
    try { P.irq(); } finally { counting = true; inIrq = false; }
    let c = irqModel['#irq'] || 0;
    for (const k in icalls) c += (irqModel[k] || 0) * icalls[k];
    for (const k in P.NI) c += (irqModel['#' + k] || 0) * P.NI[k];
    spend(Math.max(1, Math.round(c)), Infinity); roll();
  }
  // the clock at which the beam next reaches the compare's line, or Infinity
  function nextIrq() {
    if (!(enable & 1) || cmp >= LINES) return Infinity;
    let L = Math.floor((lastLine + 1) / LINES) * LINES + cmp;
    if (L <= lastLine) L += LINES;
    return L * LINE;
  }
  // dt of the processor's cycles: the interrupts that fall due and the video chip's holds take
  // their time on top; but for a wait (to), dt on the clock, which ends there whatever runs on the
  // way. No further than the clock's limit: what is left of dt
  function advance(dt, to, limit = Infinity) {
    let own = to ? Infinity : dt;
    const end = Math.min(to ? t + dt : Infinity, limit);
    for (;;) {
      if (irqsOn && pending()) { runIrq(); continue; }
      own = spend(own, Math.min(nextIrq(), end));
      roll();
      if (own <= 0 || t >= end) return own;
    }
  }

  let it = null, lastCp = null;
  // What the program owes the clock at its last yield: the work's cycles (debt; -1, none to pay, not
  // even the interrupts due now), then the next line ({ next }) for a turn of a polling loop. The
  // clock pays them up to the end of the frame it runs to and goes on with the rest in the next,
  // before the program goes on: so an interrupt in the next frame reads the controls as they are
  // then.
  let debt = -1, wait = null;
  // the clock owed, paid up to limit: true once it is all paid
  function pay(limit) {
    if (debt >= 0) { debt = advance(debt, false, limit); if (debt > 0) return false; debt = -1; }
    if (!wait) return true;
    if (wait.next) wait = { clock: (lineNow() + 1) * LINE };
    if (wait.clock > limit) { if (limit > t) advance(limit - t, true); return false; }
    if (wait.clock > t) advance(wait.clock - t, true);
    wait = null;
    return true;
  }
  function step(limit) {
    if (!pay(limit)) return;
    const r = it.next();
    if (r.done) throw new Error('the program ended');
    const y = r.value;
    if (y && y.cp !== undefined) {
      debt = lastCp === null ? 0 : Math.max(MIN_STRETCH, cost(lastCp, y.cp));
      lastCp = y.cp;
    } else if (y && y.cycles !== undefined) {
      debt = Math.round(callsCost()) + y.cycles;
    } else {
      // a turn of a polling loop: what the stretch has cost so far, then on to the next line
      const c = callsCost();
      debt = c >= 1 ? Math.round(c) : -1;
      wait = { next: true };
    }
    pay(limit);
  }
  function runUntil(until) {
    let guard = 0;
    while (t < until) {
      step(until);
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

  const b64 = s => typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), c => c.charCodeAt(0));
  function restore(s, entry, from) {
    M.set(b64(s.ram)); colour.set(b64(s.colour).subarray(0, 0x400));
    M[0] = s.cpu.pdir; M[1] = s.cpu.pdata;
    for (let r = 0; r < 0x40; r++) vic[r] = s.vic[r];
    for (let r = 0; r < 0x20; r++) sidw[r] = s.sidw ? s.sidw[r] : 0;
    if (bus && s.sidBus) bus.load(s.sidBus);
    cmp = s.cmp; latch = s.latch; enable = s.enable;
    pra = s.pra; ddra = s.ddra; ddrb = s.ddrb;
    if (s.pra2 !== undefined) { pra2 = s.pra2; ddra2 = s.ddra2; }
    t = s.cpu.cycles; lastLine = s.lastLine; target = null;
    dma = s.dma ? JSON.parse(JSON.stringify(s.dma)) : { at: -1, holds: [], bad: false, rows: [0, 0, 0, 0, 0, 0, 0, 0] };
    irqsOn = !(s.cpu.p & 4);
    frameIdx = Math.floor(t / FRAME);
    if (vm) vm.at(-1, [], 0);
    done.length = 0; begin();
    it = entry(P); lastCp = from === undefined ? null : from; calls = Object.create(null); owed = 0; debt = -1; wait = null;
    for (const k in P.N) P.N[k] = 0;
  }
  restore(o.data, p => p.main(), START);
  return {
    M, colour, vic, sidw, input, KEY, P,
    get t() { return t; }, get frame() { return frameIdx; }, get target() { return target; },
    get shown() { return target === null ? frameIdx - 1 : Math.floor(target / FRAME) - 1; },
    get irqsOn() { return irqsOn; },
    runFrame, runUntil, restore, lastFrame: () => (target === null ? done[done.length - 1] : frameAt(Math.floor(target / FRAME) - 1)),
    frameAt: n => (n === frameIdx ? cur : frameAt(n)), unpriced,
    onSid: f => sidListeners.push(f),
  };
}
root.AMPage = { create, LINE, LINES, FRAME, KEY, START, AHEAD };
})(typeof window !== 'undefined' ? window : globalThis);
