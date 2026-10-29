// The Play page's machine: the port (src/) run as the C64 would run the game, on chips of its own.
// It runs in the browser and in node (../test_play.js), and refers to nothing but GBPort, the
// port's groups, site/lib/c64.js (the frames), site/lib/sid.js (the SID's bus) and the 6502 the
// sound driver runs on (site/lib/cpu6502.js on the page).
//
//   const rt = GBPage.create({ data, cost })
//     data     the machine at the start-up the depacker jumps to ($4000), in the form
//              kit/c64/machine.js saves a machine: memory, colour RAM, the chips and the clock;
//              scripts/pack-data.js makes it from the listing, every instruction of the game but
//              the sound driver's left out
//     cost     the pacing, measured on the game (scripts/time-routines.js, cost.json): { call:
//              { routine or '#count': cycles }, seg: { 'from>to': cycles } }
//   rt.runFrame()      one frame of time: the program runs until the clock reaches the frame's end;
//                      returns the frame that ends there, for C64.renderFrame
//   rt.shown           that frame's number: the clock can be ahead of it
//   rt.input           { keys: Set of key names (kit/c64/machine.js's), joy: the joystick in port 2,
//                      active low }
//   rt.onSid(f)        f(register, value, cycle) for every write to the SID
//   rt.restore(state, entry)   a machine saved by the tests (kit/c64/machine.js's save()), and the
//                      program started at entry(P), a generator
//   rt.frameAt(n)      frame n, under way or among the last finished, with its memory as it began
//
// The clock. A PAL machine: 312 lines of 63 cycles. Each stretch of the main program moves the
// clock on by its cost, and the interrupts run when they fall due, their own time added; a turn of
// a polling loop moves the clock to the next line. A stretch costs what it cost the game: its own
// cycles between its checkpoints (seg) and each routine the port called in it at its own cycles,
// with each count of the work inside them (P.N, P.NI) at the cycles of one (call). The sound
// driver's cycles are counted on its 6502 core as they come (P.N.sound, P.NI.sound). The clock
// moves as the routines are called, not once at a stretch's end, so that a stage drawn a column a
// frame shows as the C64 draws it.
//
// The video chip's own cycles. Those are the processor's cycles; the clock gives the video chip
// the cycles it takes from the processor on top, as the beam passes the lines it takes them on,
// by kit/c64/machine.js's rule (dma): cycles 12-54 of a bad line, and five cycles from 55 + 2n on
// each of the 21 lines sprite n is fetched on. The game's cycles were measured with the same rule,
// and these left out (scripts/time-routines.js).
//
// The interrupts. The raster's only (irq_start lets in no other): the status band at line $F6, the
// playfield's at $46, then the multiplexer's bands down the playfield, each set by the one before.
// The port runs a handler whole when it comes and then its time passes; a read of the raster line
// in it, and a write to a chip, are placed as far into the handler as the routines it has called
// so far, and the sprites it has placed (P.NI.mux), have taken: so the multiplexer's next band is
// set from the line the beam is on as it gets there, and a sprite moved for the next band moves
// where the beam is then.
//
// CIA 2's serial port. The start-up sets timer A to two cycles and the serial port to output, and
// writes it a byte; once a frame the hero's frame (cia2_serial_check) reads the interrupt data,
// stops the machine (a JAM) unless bit 3 says a byte has been shifted out, and writes the next. A
// byte takes 16 of the timer's underflows, as kit/c64/machine.js has it.
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
// the frames kept ahead of the one shown: more than the longest stretch, a block swap
const AHEAD = 30;
// the least a stretch between two checkpoints costs
const MIN_STRETCH = 6;

function create(o) {
  const GP = root.GBPort;
  const M = new Uint8Array(new ArrayBuffer(0x10000));
  const colour = new Uint8Array(new ArrayBuffer(0x400));
  const vic = new Uint8Array(0x40), sidw = new Uint8Array(0x20), sidListeners = [];
  let cmp = 0, latch = 0, enable = 0;
  let pra = 0x7F, ddra = 0xFF, ddrb = 0, pra2 = 0x3F, ddra2 = 0x3F;
  // CIA 2's timer A and serial port, as kit/c64/machine.js keeps them (cia[1]): latch, counter,
  // control, interrupt data, the underflows left of the byte shifting out (sp) and whether
  // another follows it (spNext)
  let cia2 = { lat: 0xFFFF, cnt: 0xFFFF, cr: 0, icr: 0, mask: 0, sp: 0, spNext: false }, cia2At = 0;
  const bus = root.C64Sid ? root.C64Sid.engine().createBus(o.data.sid || '8580') : null;
  const input = { keys: new Set(), joy: 0x1F };

  // ---- the clock, and the frames as the beam draws them
  let t = 0, lastLine = -1, irqsOn = false;
  // the video chip's next look at its registers (cycle 12 or 55 of a line), whether line 48 saw the
  // display on, the lines left of each sprite's fetches, and the holds it has set
  let dma = { at: -1, holds: [], bad: false, rows: [0, 0, 0, 0, 0, 0, 0, 0] };
  const bank = () => 3 - ((pra2 | ~ddra2) & 3);
  const keep = {};
  const vm = root.C64 ? root.C64.videoMemory(M, colour, { keep, frames: AHEAD + 2 }) : null;
  let frameIdx = 0, cur = null;
  const done = [];
  function begin() {
    const f = vm ? vm.begin() : { mem: M.slice(), colour: colour.slice() };
    cur = { frame: frameIdx, vic: Array.from(vic.subarray(0, 47)), cia2: [pra2, ddra2], writes: [], mem: f.mem, colourMem: f.colour, keep };
  }
  // the lines the clock has passed (the raster latch set on the compare's) and the frames it has
  // finished
  function roll() {
    const ln = Math.floor(t / LINE);
    while (lastLine < ln) { lastLine++; if (lastLine % LINES === cmp) latch |= 1; }
    if (vm) vm.at(t, cur.writes, bank());
    while (t >= (frameIdx + 1) * FRAME) {
      done.push(cur); if (done.length > AHEAD) done.shift();
      frameIdx++;
      begin();
    }
  }
  // Where the beam is for what the program reads or writes now: in a handler, as far in as the
  // work it has done so far took, but not past the frame under way
  function beam() {
    if (!depth) return t;
    return Math.min(t + Math.round(handlerSoFar()), (frameIdx + 1) * FRAME - 1);
  }

  // The video chip's next look at its registers or the start of its next hold, as a cycle
  function dmaNext() {
    const d = dma;
    if (d.at < 0) {
      const o = t % LINE;
      d.at = t - o + (o <= 11 ? 11 : o <= 54 ? 54 : LINE + 11);
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

  // ---- CIA 2's timer A and its serial port, counting the clock's cycles (kit/c64/machine.js, cia)
  function cia2CatchUp() {
    const now = beam(), dt = now - cia2At;
    if (dt <= 0) return;
    cia2At = now;
    const c = cia2;
    if (!(c.cr & 1)) return;
    let left = dt;
    while (left > 0) {
      if (c.cnt >= left) { c.cnt -= left; break; }
      left -= c.cnt + 1; c.cnt = c.lat; c.icr |= 1;
      if (c.sp && (c.cr & 0x40) && --c.sp === 0) {   // a byte shifted out
        c.icr |= 8;
        if (c.spNext) { c.spNext = false; c.sp = 16; }
      }
      if (c.cr & 8) { c.cr &= ~1; break; }
      // with no byte shifting, the rest of the time only counts the timer down
      if (!c.sp) { const n = c.lat + 1; left %= n; if (left > c.cnt) { left -= c.cnt + 1; c.cnt = c.lat; } c.cnt -= left; break; }
    }
  }
  function cia2Read(r) {
    cia2CatchUp();
    const c = cia2;
    if (r === 4) return c.cnt & 255;
    if (r === 5) return c.cnt >> 8;
    if (r === 13) { const v = c.icr | ((c.icr & c.mask) ? 0x80 : 0); c.icr = 0; return v; }
    if (r === 14) return c.cr;
    return 0;
  }
  function cia2Write(r, v) {
    cia2CatchUp();
    const c = cia2;
    if (r === 4 || r === 5) {
      c.lat = r === 5 ? (c.lat & 255) | (v << 8) : (c.lat & 0xFF00) | v;
      if (r === 5 && !(c.cr & 1)) c.cnt = c.lat;
    } else if (r === 12) { if (c.cr & 0x40) { if (c.sp) c.spNext = true; else c.sp = 16; } }
    else if (r === 13) { if (v & 0x80) c.mask |= v & 0x1F; else c.mask &= ~v & 0x1F; }
    else if (r === 14) { if (v & 0x10) c.cnt = c.lat; c.cr = v & 0xEF; }
  }

  // ---- the chips
  function ioRead(a) {
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F, ln = Math.floor(beam() / LINE) % LINES;
      if (r === 0x12) return ln & 255;
      if (r === 0x11) return (vic[0x11] & 0x7F) | ((ln >> 8) << 7);
      if (r === 0x19) { roll(); return latch | 0x70 | ((latch & enable) ? 0x80 : 0); }
      if (r === 0x1A) return enable | 0xF0;
      if (r === 0x1E || r === 0x1F) return 0;              // the game never reads the collisions
      return vic[r];
    }
    if (a >= 0xD400 && a < 0xD800) {
      const r = a & 0x1F;
      if (r === 0x19 || r === 0x1A) return 0xFF;            // no paddles, as kit/c64/machine.js has it
      if (r === 0x1B || r === 0x1C) return 0;
      return bus ? bus.read(r, beam(), 0) : 0;
    }
    if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800] | 0xF0;
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15, joy = input.joy;
      if (r === 0) return (ddra ? (pra | ~ddra) & 0xFF : 0xE0 | joy) & (0xE0 | joy);
      if (r === 1) {
        let v = 0xFF;
        const rows = ddra ? pra & ddra : 0xFF;
        for (const name of input.keys) {
          const k = KEY[name];
          if (k !== undefined && !(rows & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
        }
        return v;
      }
      if (r === 2) return ddra;
      if (r === 3) return ddrb;
      return 0;                                             // CIA 1's timers are never started
    }
    if (a >= 0xDD00 && a < 0xDE00) {
      const r = a & 15;
      if (r === 0) return (pra2 | ~ddra2) & 0xFF;
      if (r === 2) return ddra2;
      return cia2Read(r);
    }
    return 0;
  }
  function ioWrite(a, v) {
    v &= 255;
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F, b = beam();
      if (r < 47 && r !== 0x19 && r !== 0x1A) cur.writes.push([Math.floor(b / LINE) % LINES, b % LINE + 1, 0xD000 + r, v]);
      if (r === 0x12) cmp = (cmp & 0x100) | v;
      else if (r === 0x11) {
        cmp = (cmp & 0xFF) | ((v & 0x80) << 1); vic[r] = v;
        if ((v & 0x10) && Math.floor(t / LINE) % LINES === 48) dma.bad = true;
      }
      else if (r === 0x19) { roll(); latch &= ~v & 0x0F; }
      else if (r === 0x1A) enable = v & 0x0F;
      else vic[r] = v;
      return;
    }
    if (a >= 0xD400 && a < 0xD800) {
      const b = beam();
      sidw[a & 0x1F] = v;
      if (bus) bus.write(v, b);
      for (const f of sidListeners) f(a & 0x1F, v, b);
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
        const b = beam();
        if (r === 0) pra2 = v; else ddra2 = v;
        cur.writes.push([Math.floor(b / LINE) % LINES, b % LINE + 1, a & 0xFFFF, v]);
      } else cia2Write(r, v);
    }
  }
  const io = {
    read: ioRead, write: ioWrite,
    vicRead: r => ioRead(0xD000 | (r & 0x3F)), vicWrite: (r, v) => ioWrite(0xD000 | (r & 0x3F), v),
    sidRead: r => ioRead(0xD400 | (r & 0x1F)), sidWrite: (r, v) => ioWrite(0xD400 | (r & 0x1F), v),
    colourRead: i => colour[i & 0x3FF], colourWrite: (i, v) => ioWrite(0xD800 | (i & 0x3FF), v),
    ciaRead: r => ioRead(0xDC00 | (r & 0x0F)), ciaWrite: (r, v) => ioWrite(0xDC00 | (r & 0x0F), v),
    cia2Read: r => ioRead(0xDD00 | (r & 0x0F)), cia2Write: (r, v) => ioWrite(0xDD00 | (r & 0x0F), v),
    irqByte: a => irqByte(a),
    sei: () => flag(false), cli: () => flag(true), iflag: () => (irqsOn ? 0 : 1),
  };

  // ---- the program, and what its stretches cost
  const P = GP.makePort(M, io);
  const model = o.cost || { call: {}, seg: {} };
  let calls = Object.create(null), counting = true, owed = 0, depth = 0, icalls = Object.create(null);
  const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
  for (const name of Object.keys(model.call)) {
    const f = P[name];
    if (typeof f !== 'function' || name[0] === '#' || f instanceof GENERATOR) continue;
    const c = model.call[name];
    P[name] = function (...a) { if (counting) called(name, c); else icalls[name] = (icalls[name] || 0) + 1; return f.apply(this, a); };
  }
  // a routine called: its cycles, and what was called before it, are paid for once they come to a
  // line's time, before it runs, all of them: so a routine's work is done when the game's is, and
  // the interrupts in its time see the memory as they would
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
  function cost(from, to) {
    return Math.round((model.seg[from.toString(16) + '>' + to.toString(16)] || 0) + callsCost());
  }
  // A byte an interrupt writes, read in the middle of a stretch: the clock first moves on by what
  // the stretch has cost so far, so that the interrupts due in that time have run
  function irqByte(a) {
    if (counting) { const c = callsCost(); if (c >= 1) advance(Math.round(c)); }
    return M[a];
  }
  // the interrupt flag, changed once what the stretch has cost so far is paid. In a handler, its
  // CLI: the interrupts due in its time are let in.
  function flag(on) {
    if (counting) { const c = callsCost(); if (c >= 1) advance(Math.round(c)); }
    irqsOn = on;
  }

  // ---- the raster's interrupt, while its latch and enable bits are set and the flag lets it
  const pending = () => (latch & enable & 0x01) !== 0;
  function runIrq() {
    const was = irqsOn, wasCounting = counting;
    irqsOn = false;                        // the processor sets I as it takes the interrupt
    counting = false; depth++; icalls = Object.create(null);
    for (const k in P.NI) P.NI[k] = 0;
    let c;
    try {
      P.irq();
      c = handlerSoFar();
      icalls = Object.create(null);
      for (const k in P.NI) P.NI[k] = 0;
    } finally { depth--; }
    // the handler's time, in which the interrupts its CLI let in come; then its RTI, the flag as
    // the interrupt found it
    try { advance(Math.max(1, Math.round(c))); }
    finally { counting = wasCounting; irqsOn = was; }
  }
  // the handler's cycles so far, not yet paid: the routines it called, and the work counted in them
  function handlerSoFar() {
    let c = 0;
    for (const k in icalls) c += (model.call[k] || 0) * icalls[k];
    for (const k in P.NI) c += (model.call['#' + k] || 0) * P.NI[k];
    return c;
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
      roll();
      if (irqsOn && pending()) { runIrq(); continue; }
      own = spend(own, Math.min(nextIrq(), end));
      if (own <= 0 || t >= end) { roll(); return own; }
    }
  }

  let it = null, lastCp = null;
  // What the program owes the clock at its last yield: the work's cycles (debt; -1, none to pay, not
  // even the interrupts due now), then the next line (wait). The clock pays them up to the end of
  // the frame it runs to and goes on with the rest in the next, before the program goes on: so an
  // interrupt in the next frame reads the controls as they are then.
  let debt = -1, wait = null;
  // the clock owed, paid up to limit: true once it is all paid
  function pay(limit) {
    if (debt >= 0) { debt = advance(debt, false, limit); if (debt > 0) return false; debt = -1; }
    if (!wait) return true;
    if (wait.next) wait = { clock: (Math.floor(t / LINE) + 1) * LINE };
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
      debt = lastCp === null ? Math.round(callsCost()) : Math.max(MIN_STRETCH, cost(lastCp, y.cp));
      lastCp = y.cp;
    } else {
      // a turn of a polling loop: what the stretch has cost so far, then on to the next line
      const c = callsCost();
      debt = c >= 1 ? Math.round(c) : -1;
      wait = { next: true };
    }
    pay(limit);
  }
  let target = null;
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
  function restore(s, entry) {
    M.set(b64(s.ram)); colour.set(b64(s.colour).subarray(0, 0x400));
    M[0] = s.cpu.pdir; M[1] = s.cpu.pdata;
    for (let r = 0; r < 0x40; r++) vic[r] = s.vic[r];
    for (let r = 0; r < 0x20; r++) sidw[r] = s.sidw ? s.sidw[r] : 0;
    if (bus && s.sidBus) bus.load(s.sidBus);
    cmp = s.cmp; latch = s.latch; enable = s.enable;
    pra = s.pra; ddra = s.ddra; ddrb = s.ddrb;
    if (s.pra2 !== undefined) { pra2 = s.pra2; ddra2 = s.ddra2; }
    t = s.cpu.cycles; lastLine = s.lastLine; target = null;
    const c2 = s.cia && s.cia[1];
    cia2 = c2 ? { lat: c2.lat[0], cnt: c2.cnt[0], cr: c2.cr[0], icr: c2.icr, mask: c2.mask, sp: c2.sp || 0, spNext: !!c2.spNext }
      : { lat: 0xFFFF, cnt: 0xFFFF, cr: 0, icr: 0, mask: 0, sp: 0, spNext: false };
    cia2At = s.lastCycles !== undefined ? s.lastCycles : t;
    dma = s.dma ? JSON.parse(JSON.stringify(s.dma)) : { at: -1, holds: [], bad: false, rows: [0, 0, 0, 0, 0, 0, 0, 0] };
    irqsOn = !(s.cpu.p & 4);
    depth = 0; counting = true;
    frameIdx = Math.floor(t / FRAME);
    if (vm) vm.at(-1, [], 0);
    done.length = 0; begin();
    it = entry(P); lastCp = null; calls = Object.create(null); owed = 0; debt = -1; wait = null;
    for (const k in P.N) P.N[k] = 0;
    P.inIrq = 0; P.leak = 0;
  }
  restore(o.data, p => p.main());
  return {
    M, colour, vic, sidw, input, KEY, P,
    get t() { return t; }, get frame() { return frameIdx; }, get target() { return target; },
    get shown() { return target === null ? frameIdx - 1 : Math.floor(target / FRAME) - 1; },
    get irqsOn() { return irqsOn; },
    runFrame, runUntil, restore, lastFrame: () => (target === null ? done[done.length - 1] : frameAt(Math.floor(target / FRAME) - 1)),
    frameAt: n => (n === frameIdx ? cur : frameAt(n)),
    onSid: f => sidListeners.push(f),
  };
}
root.GBPage = { create, LINE, LINES, FRAME, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
