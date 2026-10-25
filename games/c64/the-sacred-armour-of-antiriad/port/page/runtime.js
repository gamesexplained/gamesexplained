// The Play page's machine: the port (src/) run as the C64 would run the game, on chips of its own.
// It runs in the browser and in node (../test_play.js), and refers to nothing but AntPort, the
// port's groups, site/lib/c64.js (the frames), site/lib/collide.js (the sprite collisions),
// site/lib/sid.js (the SID's bus) and the 6502 the sound driver runs on (site/lib/cpu6502.js on
// the page).
//
//   const rt = AntPage.create({ data, cost })
//     data     the machine at the game's first instruction ($8009), in the form kit/c64/machine.js
//              saves a machine: memory, colour RAM, the chips and the clock; scripts/pack-data.js
//              makes it from the listing, every instruction of the game but the sound driver's
//              left out
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
// with each count of the work inside them (P.N: a room's characters, a tile's bytes) at the cycles
// of one (call). An interrupt costs the routines it called, at the same cycles, and the sound
// driver's own cycles on its 6502 core as they come (P.NI.sound). The clock moves as the routines
// are called, not once at a stretch's end, so that a room drawn over several frames shows as the
// C64 draws it.
//
// The video chip's own cycles. Those are the processor's cycles; the clock gives the video chip
// the cycles it takes from the processor on top, as the beam passes the lines it takes them on,
// by kit/c64/machine.js's rule (dma): cycles 12-54 of a bad line, and five cycles from 55 + 2n on
// each of the 21 lines (42 Y-expanded) sprite n is fetched on. The game's cycles were measured
// with the same rule, and these left out (scripts/time-routines.js).
//
// The interrupts. Three a frame from the raster (lines $FA, $32 and $B2: irq_handler sets the next
// line each time), one from each sprite collision when the game enables them (site/lib/collide.js
// works them out as the beam draws, from memory as it stands), and CIA 1's timers A and B, for the
// sound and the music. The game's handler clears I before its long work, so the next interrupt
// due comes inside it; the port runs each handler whole when it comes, and then its time passes,
// in which the interrupts it let in are taken in turn. So the raster's bands come on their lines
// while the frame's tasks are under way, as they do on the C64. The sound driver runs on a 6502 of
// its own, and an interrupt that falls due inside it is taken between its instructions, as on the
// C64: the music's tick stops the sound's timer while it runs, so one that comes inside it holds
// the timer for as long as it takes. One thing the game reads of a handler under way: the frame's
// tasks set zpa_AB while they run, and an interrupt at line $FA that comes inside them sees it and
// leaves them to finish (the C64 loses a frame of play when a frame's work overruns). Run whole,
// the tasks have cleared it before the next one comes, so the page sets it for an interrupt that
// comes in their time.
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
// the frames kept ahead of the one shown: more than the longest stretch, a room's drawing
const AHEAD = 30;
// the least a stretch between two checkpoints costs
const MIN_STRETCH = 6;
// zpa_AB, the frame's tasks under way (raster_bands, src/g-irq.js)
const TASKS = 0xAB;

function create(o) {
  const AP = root.AntPort;
  const M = new Uint8Array(new ArrayBuffer(0x10000));
  const colour = new Uint8Array(new ArrayBuffer(0x400));
  const vic = new Uint8Array(0x40), sidw = new Uint8Array(0x20), sidListeners = [];
  let cmp = 0, latch = 0, enable = 0;
  let pra = 0x7F, ddra = 0xFF, ddrb = 0, pra2 = 0x3F, ddra2 = 0x3F;
  // CIA 1's timers, as kit/c64/machine.js keeps them (cia[0]): latches, counters, control, mask, flags
  let cia = { lat: [0xFFFF, 0xFFFF], cnt: [0xFFFF, 0xFFFF], cr: [0, 0], mask: 0, icr: 0 }, ciaAt = 0;
  const bus = root.C64Sid ? root.C64Sid.engine().createBus('8580') : null;
  const input = { keys: new Set(), joy: 0x1F };

  // ---- the clock, and the frames as the beam draws them
  let t = 0, lastLine = -1, irqsOn = false;
  // the video chip's next look at its registers (cycle 12 or 55 of a line), whether line 48 saw the
  // display on, the lines left of each sprite's fetches, and the holds it has set
  let dma = { at: -1, holds: [], bad: false, rows: [0, 0, 0, 0, 0, 0, 0, 0] };
  const lineNow = () => Math.floor(t / LINE);
  const bank = () => 3 - ((pra2 | ~ddra2) & 3);
  // the byte the video chip reads at a in its bank: the character ROM, at $1000-$1FFF of banks 0
  // and 2, is never read by the game's screens (bank 1), and collides with nothing here
  const vmem = a => (!(bank() & 1) && a >= 0x1000 && a < 0x2000 ? 0 : M[bank() << 14 | a]);
  const collide = root.C64Collide ? root.C64Collide.create(vic, vmem, i => colour[i]) : null;
  const keep = {};
  const vm = root.C64 ? root.C64.videoMemory(M, colour, { keep, frames: AHEAD + 2 }) : null;
  let frameIdx = 0, cur = null;
  const done = [];
  function begin() {
    const f = vm ? vm.begin() : { mem: M.slice(), colour: colour.slice() };
    cur = { frame: frameIdx, vic: Array.from(vic.subarray(0, 47)), cia2: [pra2, ddra2], writes: [], mem: f.mem, colourMem: f.colour, keep };
  }
  // the lines the clock has passed (the raster latch set on the compare's), the timers and the
  // collisions brought up to it, and the frames it has finished
  function roll() {
    const ln = lineNow();
    while (lastLine < ln) { lastLine++; if (lastLine % LINES === cmp) latch |= 1; }
    ciaCatchUp();
    if (collide) latch |= collide.irq(t);
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

  // The sound driver's accesses to the chips, as far into its routines as they fall (io.within,
  // src/g-sound.js): the routine runs whole, and its cycles are spent after it, with those of the
  // driver's routines run before it in the same interrupt
  let sub = 0;
  const chipT = () => t + sub;

  // ---- CIA 1's timers, counting the clock's cycles (kit/c64/machine.js, cia)
  function ciaCatchUp() {
    const now = chipT(), dt = now - ciaAt;
    if (dt <= 0) return;
    ciaAt = now;
    const c = cia;
    for (let k = 0; k < 2; k++) {
      if (!(c.cr[k] & 1)) continue;
      let left = dt;
      while (left > 0) {
        if (c.cnt[k] >= left) { c.cnt[k] -= left; break; }
        left -= c.cnt[k] + 1; c.cnt[k] = c.lat[k]; c.icr |= 1 << k;
        if (c.cr[k] & 8) { c.cr[k] &= ~1; break; }
      }
    }
  }
  // the clock at the next underflow, or Infinity
  function ciaNext() {
    let best = Infinity;
    for (let k = 0; k < 2; k++) if (cia.cr[k] & 1) best = Math.min(best, ciaAt + cia.cnt[k] + 1);
    return best;
  }
  function ciaRead(r) {
    ciaCatchUp();
    const c = cia;
    if (r >= 4 && r <= 7) { const k = (r - 4) >> 1; return r & 1 ? c.cnt[k] >> 8 : c.cnt[k] & 255; }
    if (r === 13) { const v = c.icr | ((c.icr & c.mask) ? 0x80 : 0); c.icr = 0; return v; }
    if (r === 14 || r === 15) return c.cr[r - 14];
    return 0;
  }
  function ciaWrite(r, v) {
    ciaCatchUp();
    const c = cia;
    if (r >= 4 && r <= 7) {
      const k = (r - 4) >> 1;
      c.lat[k] = r & 1 ? (c.lat[k] & 255) | (v << 8) : (c.lat[k] & 0xFF00) | v;
      if ((r & 1) && !(c.cr[k] & 1)) c.cnt[k] = c.lat[k];   // a stopped timer loads on the high byte
    } else if (r === 13) { if (v & 0x80) c.mask |= v & 0x1F; else c.mask &= ~v & 0x1F; }
    else if (r === 14 || r === 15) { const k = r - 14; if (v & 0x10) c.cnt[k] = c.lat[k]; c.cr[k] = v & 0xEF; }
  }

  // ---- the chips
  function ioRead(a) {
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F, ln = lineNow() % LINES;
      if (collide && (r === 0x1E || r === 0x1F)) return collide.read(r, t);
      if (r === 0x12) return ln & 255;
      if (r === 0x11) return (vic[0x11] & 0x7F) | ((ln >> 8) << 7);
      if (r === 0x19) { roll(); return latch | 0x70 | ((latch & enable) ? 0x80 : 0); }
      if (r === 0x1A) return enable | 0xF0;
      return vic[r];
    }
    if (a >= 0xD400 && a < 0xD800) {
      const r = a & 0x1F;
      if (r === 0x19 || r === 0x1A) return 0xFF;            // no paddles, as kit/c64/machine.js has it
      if (r === 0x1B || r === 0x1C) return 0;
      return bus ? bus.read(r, chipT(), 0) : 0;
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
      return ciaRead(r);
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
    if (collide && ((a >= 0xD000 && a < 0xD400) || a === 0xDD00 || a === 0xDD02)) collide.to(t);
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F;
      if (r < 47 && r !== 0x19 && r !== 0x1A) cur.writes.push([lineNow() % LINES, t % LINE + 1, 0xD000 + r, v]);
      if (r === 0x12) cmp = (cmp & 0x100) | v;
      else if (r === 0x11) {
        cmp = (cmp & 0xFF) | ((v & 0x80) << 1); vic[r] = v;
        if ((v & 0x10) && lineNow() % LINES === 48) dma.bad = true;
      }
      else if (r === 0x19) { roll(); latch &= ~v & 0x0F; }
      else if (r === 0x1A) enable = v & 0x0F;
      else vic[r] = v;
      return;
    }
    if (a >= 0xD400 && a < 0xD800) {
      sidw[a & 0x1F] = v;
      if (bus) bus.write(v, chipT());
      for (const f of sidListeners) f(a & 0x1F, v, chipT());
      return;
    }
    if (a >= 0xD800 && a < 0xDC00) { colour[a - 0xD800] = v & 15; return; }
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15;
      if (r === 0) pra = v; else if (r === 2) ddra = v; else if (r === 3) ddrb = v;
      else ciaWrite(r, v);
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
  const io = {
    read: ioRead, write: ioWrite,
    vicRead: r => ioRead(0xD000 | (r & 0x3F)), vicWrite: (r, v) => ioWrite(0xD000 | (r & 0x3F), v),
    sidRead: r => ioRead(0xD400 | (r & 0x1F)), sidWrite: (r, v) => ioWrite(0xD400 | (r & 0x1F), v),
    colourRead: i => colour[i & 0x3FF], colourWrite: (i, v) => ioWrite(0xD800 | (i & 0x3FF), v),
    ciaRead: r => ioRead(0xDC00 | (r & 0x0F)), ciaWrite: (r, v) => ioWrite(0xDC00 | (r & 0x0F), v),
    cia2Read: r => ioRead(0xDD00 | (r & 0x0F)), cia2Write: (r, v) => ioWrite(0xDD00 | (r & 0x0F), v),
    irqByte: a => irqByte(a),
    within: n => { sub = n === null ? 0 : n + (depth ? (P.NI.sound || 0) : 0); },
    between: n => between(n),
    pay: () => { if (counting) { const c = callsCost(); if (c >= 1) advance(Math.round(c)); } },
    sei: () => flag(false), cli: () => flag(true),
  };

  // ---- the program, and what its stretches cost
  const P = AP.makePort(M, io);
  const model = o.cost || { call: {}, seg: {} };
  let calls = Object.create(null), counting = true, owed = 0, depth = 0, icalls = Object.create(null);
  const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
  for (const name of Object.keys(model.call)) {
    const f = P[name];
    if (typeof f !== 'function' || name[0] === '#' || f instanceof GENERATOR) continue;
    const c = model.call[name];
    P[name] = function (...a) { if (counting) called(name, c); else icalls[name] = (icalls[name] || 0) + 1; return f.apply(this, a); };
  }
  // the frame's tasks: whether the band at line $FA ran them (zpa_AB clear as it came)
  let ranTasks = false;
  const bands = P.raster_bands;
  P.raster_bands = function (...a) {
    const was = M[TASKS];
    const r = bands.apply(this, a);
    if (cmp === 0x32 && !(was & 0x80)) ranTasks = true;
    return r;
  };
  // a routine called: its cycles, and what was called before it, are paid for once they come to a
  // line's time, before it runs, all of them: so a routine's work is done when the game's is, and
  // the interrupts in its time see the memory as they would, though the clock goes on past the
  // frame it runs to (a room drawn over three frames, which the frame's tasks wait for)
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
  // the interrupt flag, changed once what the stretch has cost so far is paid, all of it: the
  // flag changes when the game's does, though the clock goes on past the frame it runs to (the
  // title turns the interrupts on at the end of a copy that takes most of two frames). In a
  // handler, its CLI: the interrupts due in its time are let in.
  function flag(on) {
    if (counting) { const c = callsCost(); if (c >= 1) advance(Math.round(c)); }
    irqsOn = on;
  }

  // ---- the interrupts: the raster's and the collisions', while their latch and enable bits are
  // set, and CIA 1's timers', while the mask lets them; each while the flag lets it
  const pending = () => (latch & enable & 0x0F) !== 0 || (cia.icr & cia.mask) !== 0;
  // the frame's tasks of the handlers under way, which an interrupt in their time sees as running
  let tasksBusy = 0;
  function runIrq() {
    const was = irqsOn, wasCounting = counting;
    irqsOn = false;                        // the processor sets I as it takes the interrupt
    counting = false; depth++; icalls = Object.create(null);
    for (const k in P.NI) P.NI[k] = 0;
    const busy = tasksBusy > 0 && !(M[TASKS] & 0x80);
    if (busy) M[TASKS] = 0x80;
    ranTasks = false;
    let c;
    try {
      P.irq_handler();
      c = (model.call['#irq'] || 0);
      for (const k in icalls) c += (model.call[k] || 0) * icalls[k];
      for (const k in P.NI) { c += (model.call['#' + k] || 0) * P.NI[k]; P.NI[k] = 0; }
      icalls = Object.create(null);
    } finally { if (busy) M[TASKS] = 0; }
    const tasks = ranTasks;
    // the handler's time, in which the interrupts its CLI let in come
    if (tasks) tasksBusy++;
    // and its RTI, the flag as the interrupt found it; but a restart_game in it (P.taken) never
    // returns, and the game goes to cold_start with the flag set
    try { advance(Math.max(1, Math.round(c))); }
    finally { if (tasks) tasksBusy--; depth--; counting = wasCounting; irqsOn = P.taken ? false : was; }
  }
  // the handler's cycles so far, not yet paid: the routines it called, and the work counted in them
  function handlerSoFar() {
    let c = 0;
    for (const k in icalls) c += (model.call[k] || 0) * icalls[k];
    for (const k in P.NI) c += (model.call['#' + k] || 0) * P.NI[k];
    return c;
  }
  // The sound driver n cycles into a routine, in a handler that has cleared I: an interrupt due by
  // then is taken there, as on the C64, once the handler's time to here is paid. The music's tick
  // stops the sound's timer while it runs, so a band of the raster that comes inside it holds the
  // timer for as long as it takes.
  function between(n) {
    if (!depth || !irqsOn) return false;
    const c = handlerSoFar() + n;
    if (!pending() && nextIrq() > t + c) return false;
    const was = ranTasks;
    sub = 0;
    icalls = Object.create(null);
    for (const k in P.NI) P.NI[k] = 0;
    advance(Math.max(1, Math.round(c)));
    icalls = Object.create(null);
    for (const k in P.NI) P.NI[k] = 0;
    ranTasks = was;
    return true;
  }
  // the clock at which the beam next reaches the compare's line, or Infinity
  function nextRaster() {
    if (!(enable & 1) || cmp >= LINES) return Infinity;
    let L = Math.floor((lastLine + 1) / LINES) * LINES + cmp;
    if (L <= lastLine) L += LINES;
    return L * LINE;
  }
  // the clock at which an interrupt could next fall due: the raster's line, a timer's underflow, a
  // line on while a collision could raise one
  function nextIrq() {
    let n = Math.min(nextRaster(), ciaNext());
    if (collide && (enable & 6 & collide.armed())) n = Math.min(n, t + LINE - t % LINE);
    return n;
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
    cia = s.cia ? JSON.parse(JSON.stringify(s.cia[0])) : { lat: [0xFFFF, 0xFFFF], cnt: [0xFFFF, 0xFFFF], cr: [0, 0], mask: 0, icr: 0 };
    ciaAt = s.lastCycles !== undefined ? s.lastCycles : t;
    dma = s.dma ? JSON.parse(JSON.stringify(s.dma)) : { at: -1, holds: [], bad: false, rows: [0, 0, 0, 0, 0, 0, 0, 0] };
    if (collide) { if (s.collide) collide.load(s.collide); else collide.at(t); }
    irqsOn = !(s.cpu.p & 4);
    tasksBusy = 0; depth = 0; counting = true;
    frameIdx = Math.floor(t / FRAME);
    if (vm) vm.at(-1, [], 0);
    done.length = 0; begin();
    it = entry(P); lastCp = null; calls = Object.create(null); owed = 0; debt = -1; wait = null;
    for (const k in P.N) P.N[k] = 0;
    P.taken = false; P.inIrq = 0;
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
root.AntPage = { create, LINE, LINES, FRAME, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
