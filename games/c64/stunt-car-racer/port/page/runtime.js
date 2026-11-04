// The Play page's machine: the port (src/) run as the C64 would run the game, on chips of its own.
// It runs in the browser and in node (../test_play.js), and refers to nothing but SCRPort, the
// port's groups and site/lib/c64.js (the frames).
//
//   const rt = SCRPage.create({ data, cost, files })
//     data     the machine at the loader's hand-over ($3FFB, the start-up), in the form
//              kit/c64/machine.js saves a machine: memory, colour RAM, the chips and the clock;
//              scripts/pack-data.js makes it from the snapshot with every instruction of the game
//              left out but the few the port reads
//     cost     the pacing, fitted on the game (scripts/fit-cost.js, cost.json): { seg: { 'from>to':
//              cycles }, call: { routine or '#count': cycles }, irq: { band: { c, w } } }
//     files    the disc a save goes to and a load comes from (src/kernal.js's store: load, save,
//              remove, list)
//   rt.runFrame()      one frame of time: the program runs until the clock reaches the frame's end;
//                      returns the frame that ends there, for C64.renderFrame
//   rt.input           { keys: Set of key names (kit/c64/machine.js's), joy: the joystick in port 2,
//                      active low; and as the game reads them, joyReads: its reads of the
//                      joystick's port, rowReads: for each row of the keyboard, its reads of the
//                      keys with that row selected }
//   rt.onSid(f)        f(register, value, cycle) for every write to the SID
//   rt.restore(state, entry, from)   a machine saved by the tests (kit/c64/machine.js's save()),
//                      and the program started at entry(P), a generator, from the checkpoint at
//                      from
//   rt.runTicks(cycles, loop), rt.ticks, rt.leave()   Fast CPU's clock (below, and
//                      site/lib/fast-cpu.js); rt.inLoop says whether a pass of the race is under
//                      way on it
//
// The clock. A PAL machine: 312 lines of 63 cycles. Each stretch of the main program moves the
// clock on by its cost, and the raster's interrupts run on their lines when they fall due, their
// own time added; a turn of a polling loop (a key's wait) moves the clock to the next line. A
// stretch costs what it cost the game: its own cycles (seg, by the checkpoints it runs between),
// each routine the port called in it at its own cycles, each count of the line drawer's work (P.N:
// the pixels it tests and draws, the steps off the view) at the cycles of one (call), and the
// busy loops' cycles as the port counts them ({ cycles }). The clock moves as the routines are
// called, not once at a stretch's end, so that the interrupts in the stretch see the memory as
// they would: the race's main loop never waits for the screen, and asks the interrupt to show
// each view it has drawn (FLIP_IF_READY reads $C37B in the middle of the physics).
//
// The video chip's own cycles. Those are the processor's cycles; the clock gives the video chip
// the cycles it takes from the processor on top, as the beam passes the lines it takes them on,
// by kit/c64/machine.js's rule (dma): cycles 12-54 of a bad line, and five cycles from 55 + 2n on
// each of the 21 lines (42 Y-expanded) sprite n is fetched on. The game's cycles were timed with
// the same rule, and these taken out (scripts/time-stretches.js).
//
// The interrupts. The raster's, through the vector at $FFFE (IRQ, $CDAA), each band setting the
// line of the next. Each runs whole when it comes, and its writes to the chips land as far into
// it as the game's do in that band, on average (cost.json's irq: the band is $3DF8 and the
// compare line), so that the bitmaps, the sprites and the colours split where the game splits
// them; its length is the band's own. The game turns the raster's interrupt off ($D01A) whenever
// it banks the chips out or the KERNAL in, so one that came then would find no handler of the
// game's: it is acknowledged and left.
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
// the frames kept ahead of the one shown
const AHEAD = 12;
// the least a stretch between two checkpoints costs
const MIN_STRETCH = 6;
// the start of the loader's hand-over, where the page's machine begins (STARTUP)
const ENTRY = 0x3FFB;
// an interrupt in a band the fit never saw: about what the menus' take
const IRQ_DEFAULT = { c: 90, w: [] };

function create(o) {
  const SP = root.SCRPort;
  const M = new Uint8Array(new ArrayBuffer(0x10000));
  const colour = new Uint8Array(new ArrayBuffer(0x400));
  const vic = new Uint8Array(0x40), sidw = new Uint8Array(0x20), sidListeners = [];
  let cmp = 0, latch = 0, enable = 0;
  let pra = 0x7F, ddra = 0xFF, ddrb = 0, pra2 = 0x3F, ddra2 = 0x3F;
  const input = { keys: new Set(), joy: 0x1F, joyReads: 0, rowReads: [0, 0, 0, 0, 0, 0, 0, 0] };

  // ---- the clock, and the frames as the beam draws them
  let t = 0, lastLine = -1, irqsOn = true;
  // the video chip's next look at its registers (cycle 12 or 55 of a line), whether line 48 saw the
  // display on, the lines left of each sprite's fetches, and the holds it has set
  let dma = { at: -1, holds: [], bad: false, rows: [0, 0, 0, 0, 0, 0, 0, 0] };
  const lineNow = () => Math.floor(t / LINE);
  const bank = () => 3 - ((pra2 | ~ddra2) & 3);
  const keep = {};
  const vm = root.C64 ? root.C64.videoMemory(M, colour, { keep, frames: AHEAD + 2 }) : null;
  let frameIdx = 0, cur = null;
  const done = [];
  function begin() {
    const f = vm ? vm.begin() : { mem: null, colour: null };
    cur = { frame: frameIdx, vic: Array.from(vic.subarray(0, 47)), cia2: [pra2, ddra2], writes: [], mem: f.mem, colourMem: f.colour, keep };
  }
  // the lines the clock has passed (the raster latch set on the compare's), and the frames it has
  // finished
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

  // ---- the chips
  function ioRead(a) {
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F, ln = lineNow() % LINES;
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
      return 0;
    }
    if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800] | 0xF0;
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15, joy = input.joy;
      if (r === 0) { input.joyReads++; return (ddra ? (pra | ~ddra) & 0xFF : 0xE0 | joy) & (0xE0 | joy); }
      if (r === 1) {
        let v = 0xFF;
        const rows = ddra ? pra & ddra : 0xFF;
        for (let k = 0; k < 8; k++) if (!(rows & (1 << k))) input.rowReads[k]++;
        for (const name of input.keys) {
          const k = KEY[name];
          if (k !== undefined && !(rows & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
        }
        return v;
      }
      if (r === 2) return ddra;
      if (r === 3) return ddrb;
      return 0;                                            // the game turns the CIAs' interrupts off
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
    if (irqBase >= 0) irqWrite();
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
  const io = {
    read: ioRead, write: ioWrite,
    colourRead: i => colour[i & 0x3FF], colourWrite: (i, v) => ioWrite(0xD800 | (i & 0x3FF), v),
    irqByte: a => irqByte(a),
    files: o.files || null,
  };

  // ---- the program, and what its stretches cost
  const P = SP.makePort(M, io);
  // the plug-in points (src/core.js): Fast CPU's, once it plugs them in, while a pass of the race
  // is under way on its clock; the game's own the rest of the time
  const gamePlug = P.plug;
  let fastPlug = null;
  Object.defineProperty(P, 'plug', {
    get: () => (fastPlug && free ? fastPlug : gamePlug),
    set: v => { fastPlug = v === gamePlug ? null : v; },
  });
  // The start-up's checksum sums the game's code, which the page does not carry: the page's
  // machine leaves the zero page as the sum over the whole game leaves it (pack-data.js), and goes
  // on as the game does when the sum is right. Its time is the start-up's stretch's, from the
  // hand-over to the first checkpoint, which the fit measured with the sum in it (cost(ENTRY, cp))
  if (o.data && o.data.checksum) {
    const k = o.data.checksum;
    P.CHECKSUM = function* () {
      for (let i = 0; i < 4; i++) M[0xFB + i] = k.zp[i];
      return { a: M[0xFC], x: 0xFC, y: M[0x42AB] };
    };
  }
  const model = o.cost || { seg: {}, call: {}, irq: {} };
  let calls = Object.create(null), counting = true, owed = 0;
  const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
  for (const name of Object.keys(model.call)) {
    const f = P[name];
    if (typeof f !== 'function' || name[0] === '#') continue;
    const c = model.call[name];
    P[name] = f instanceof GENERATOR
      ? function* (...a) { if (counting) called(name, c); return yield* f.apply(this, a); }
      : function (...a) { if (counting) called(name, c); return f.apply(this, a); };
  }
  // a routine called: what was called before it is paid for once it comes to a line's time, up to
  // the end of the frame the clock runs to (lim), and the rest at the program's next yield
  let lim = Infinity;
  function called(name, c) {
    calls[name] = (calls[name] || 0) + 1;
    owed += c;
    if (owed >= LINE && t < lim && !free) { const d = whole(callsCost()); if (d >= 1) unpaid(advance(d, lim)); }
  }
  // cycles as whole ones, the fractions the costs leave carried on to the next; work counts them
  // (machineBeats, below), and a cost the clock could not pay yet goes back to be counted again
  let frac = 0, work = 0;
  function whole(c) { const v = c + frac, n = Math.floor(v); frac = v - n; work += n; return n; }
  function unpaid(c) { owed += c; work -= c; }
  // the routines called and the work counted since the clock last moved, at their cost
  function callsCost() {
    let c = owed;
    owed = 0;
    calls = Object.create(null);
    for (const k in P.N) { if (P.N[k]) c += (model.call['#' + k] || 0) * P.N[k]; P.N[k] = 0; }
    return c;
  }
  // a stretch's cost; one the fit never measured costs at least a line, so that a loop along it
  // runs slow rather than standing the clock still, and is named in missing
  const missing = new Set();
  function cost(from, to) {
    const k = from.toString(16) + '>' + to.toString(16);
    if (k in model.seg) return whole(model.seg[k] + callsCost());
    missing.add(k);
    return Math.max(LINE, whole(callsCost()));
  }
  // A byte the interrupt writes, read in the middle of a stretch: the clock first moves on by what
  // the stretch has cost so far, so that the interrupts due in that time have run
  function irqByte(a) {
    if (counting && !free) { const c = whole(callsCost()); if (c >= 1) unpaid(advance(c, lim)); }
    return M[a];
  }

  // ---- the interrupts: the raster's, while its latch and enable bits are set
  const pending = () => (latch & enable & 0x0F) !== 0;
  // a handler under way: the cycle it began on, its band, its writes so far and its own cycles
  // spent so far
  let irqBase = -1, band = null, irqWrites = 0, irqSpent = 0;
  // the handler's next write to the chips lands where the game's does in the band
  function irqWrite() {
    const n = band.w[irqWrites++];
    if (n === undefined || n <= irqSpent) return;
    spend(n - irqSpent, Infinity); irqSpent = n;
    roll();
  }
  function runIrq() {
    irqsOn = false;                        // the processor sets I as it takes the interrupt
    // the handler the processor goes to: the game's, at $FFFE, with the chips in and the KERNAL out
    const game = (M[1] & 3) === 1 && (M[1] & 4) && (M[0xFFFE] | M[0xFFFF] << 8) === 0xCDAA;
    band = game ? (model.irq[M[0x3DF8].toString(16) + ':' + cmp] || IRQ_DEFAULT) : IRQ_DEFAULT;
    counting = false; irqBase = t; irqWrites = 0; irqSpent = 0;
    try {
      if (game) P.IRQ();
      else ioWrite(0xD019, 0x0F);          // no handler of the game's: the latch acknowledged
    } finally { counting = true; irqBase = -1; }
    if (band.c > irqSpent) spend(band.c - irqSpent, Infinity);
    irqsOn = true;                         // its RTI
    roll();
  }
  // the clock at which the beam next reaches the compare's line, or Infinity
  function nextIrq() {
    if (!(enable & 1) || cmp >= LINES) return Infinity;
    let L = Math.floor((lastLine + 1) / LINES) * LINES + cmp;
    if (L <= lastLine) L += LINES;
    return L * LINE;
  }
  // dt of the processor's cycles: the interrupts that fall due and the video chip's holds take
  // their time on top; no further than the clock's limit. Returns what is left of dt
  function advance(dt, limit = Infinity) {
    let own = dt;
    for (;;) {
      if (irqsOn && pending()) { runIrq(); continue; }
      own = spend(own, Math.min(nextIrq(), limit));
      roll();
      if (own <= 0 || t >= limit) return own;
    }
  }
  // the clock moved on to cycle `to`, whatever runs on the way
  function until(to) {
    for (;;) {
      if (irqsOn && pending()) { runIrq(); continue; }
      if (t >= to) return;
      spend(Infinity, Math.min(nextIrq(), to));
      roll();
    }
  }

  let it = null, lastCp = null;
  // What the program owes the clock at its last yield: the work's cycles (debt; -1, none to pay,
  // not even the interrupts due now), then for a poll the next line. The clock pays them up to the
  // end of the frame it runs to and goes on with the rest in the next, before the program goes on:
  // so an interrupt in the next frame reads the controls as they are then.
  let debt = -1, next = null;
  function pay(limit) {
    if (debt >= 0) { debt = advance(debt, limit); if (debt > 0) return false; debt = -1; }
    if (next === null) return true;
    if (next === true) next = (lineNow() + 1) * LINE;
    if (next > limit) { if (limit > t) until(limit); return false; }
    until(next);
    next = null;
    return true;
  }
  function step(limit) {
    if (!pay(limit)) return;
    lim = limit;
    let r;
    try { r = it.next(); } finally { lim = Infinity; }
    if (r.done) throw new Error('the program ended');
    const y = r.value;
    if (y && y.cp !== undefined) {
      // a checkpoint: the stretch to it, and a busy loop's cycles that end there
      debt = (lastCp === null ? whole(callsCost()) : Math.max(MIN_STRETCH, cost(lastCp, y.cp))) + (y.cycles || 0);
      lastCp = y.cp;
      if (y.cp === PASS) { passWork = work; work = 0; known = !loop || free; }
      if (loop) checkpoint(y.cp);
    } else if (y && y.cycles !== undefined) {
      // a busy loop: what the stretch has cost so far and its own cycles, and with at a checkpoint
      // it ends at
      if (y.at !== undefined) { debt = (lastCp === null ? whole(callsCost()) : cost(lastCp, y.at)) + y.cycles; lastCp = y.at; }
      else debt = Math.max(1, whole(callsCost()) + y.cycles);
      if (free) debt = Math.max(1, y.cycles);           // in a loop of Fast CPU's, the wait alone
    } else {
      // a turn of a polling loop: what the stretch has cost so far, then on to the next line
      const c = whole(callsCost());
      debt = c >= 1 && !free ? c : -1;
      next = true;
    }
    pay(limit);
  }
  let target = null;
  function runUntil(to) {
    let guard = 0;
    while (t < to) {
      step(to);
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
    if (loop) offTicks();
    if (target === null) target = t;
    target += FRAME;
    if (t < target) runUntil(target);
    return frameAt(Math.floor(target / FRAME) - 1);
  }

  // ---- Fast CPU's clock (site/lib/fast-cpu.js): the real time owed, in cycles. The race's passes
  // go round once a beat, at line 55 of each video frame, and their own work takes no time, as on a
  // processor fast enough to finish it at once: the controls, the step of the world and the
  // engine's note at the beat, just before the interrupt at line 61 puts on show the frame the last
  // pass drew; the drawing and the rest of the pass from line 62, once it has. The game's own
  // handshake with the interrupt needs that order: the last frame's colours set (FLIP_DONE, in the
  // step) between the interrupt at line 197, which sees the flip asked for, and the one at line 61,
  // which makes it, and the next flip asked for after that. A wait inside a pass (the pause, the
  // wait for fire at the race's end), the restart after a wreck (plug-in point leave) and the
  // program outside the race take the machine's time. loop.cap is the most passes one call runs
  // (time owed past them is dropped), loop.begin() is called as each starts, loop.between() after
  // it and loop.fresh() as the first pass after the machine's time comes to its start. Returns the
  // passes run; ticks counts the beats.
  const PASS = 0x3D08, DRAW = 0x3D11, BEAT = 55 * LINE, SHOWN = 62 * LINE;
  // the checkpoints inside a pass: the race loop's, and the wheels' sprites' read of the chips
  const IN_PASS = new Set([0x3D08, 0x3D0B, 0x3D0E, 0x3D11, 0x3D14, 0x3D17, 0x3D1A, 0x3D1D, 0x3D20, 0x3D23, 0x3D26, 0x3D29, 0x3D2C, 0x3D2F, 0x152D]);
  let loop = null, free = false, parked = false, ticks = 0, lastBeat = -Infinity;
  // the beats the C64 would take over the last pass's work: its cost (the program's own cycles, as
  // the clock counts them), over the share of a frame's cycles the interrupts and the video chip
  // leave the program in a race (PROGRAM, measured on the page with Fast CPU off); unknown
  // (Infinity) when the last pass was not a whole one on Fast CPU's clock
  const PROGRAM = 0.883;
  let passWork = 0, known = false;
  function machineBeats() { return known ? passWork / (PROGRAM * FRAME) : Infinity; }
  function checkpoint(cp) {
    if (cp === PASS) {
      // a pass starts here: the one before it is over, and this one waits for the beat
      if (free) { debt = -1; if (loop.between) loop.between(); }
      else if (loop.fresh) loop.fresh();               // the first pass since the machine's time
      free = false; parked = true;
    } else if (!free) return;
    else if (cp === DRAW) { debt = -1; next = Math.floor(t / FRAME) * FRAME + SHOWN; if (next < t) next = t; }
    else if (IN_PASS.has(cp)) debt = -1;
    else free = false;                                 // the race over: the machine's time again
  }
  // the restart after a wreck, in the machine's time
  function leave() { if (free) { free = false; if (loop && loop.between) loop.between(); } }
  function nextBeat() {
    let b = Math.floor(t / FRAME) * FRAME + BEAT;
    if (b < t) b += FRAME;
    if (b <= lastBeat) b = lastBeat + FRAME;
    return b;
  }
  function runTicks(cycles, o) {
    if (loop !== o) { loop = o; free = false; parked = false; }
    if (target === null) target = t;
    target += cycles;
    let loops = 0, guard = 0;
    for (;;) {
      if (++guard > 2e6) throw new Error('runTicks: no progress');
      if (!parked) {
        // a pass's own work goes on whatever the time; a wait, or the program outside the race,
        // as far as real time is owed
        if (t >= target && !(free && debt < 0 && next === null)) break;
        step(target);
        continue;
      }
      if (debt >= 0 || next !== null) { if (!pay(target)) break; }
      const at = nextBeat();
      if (at > target) { until(target); break; }
      if (loops === o.cap) { target = t; break; }
      until(at);
      lastBeat = at; ticks++; loops++;
      parked = false; free = true;
      if (o.begin) o.begin();
    }
    return loops;
  }
  // off: the clock as it was, a pass parked at its start going on in the machine's time
  function offTicks() { loop = null; free = false; parked = false; }

  const b64 = s => typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), c => c.charCodeAt(0));
  function restore(s, entry, from) {
    M.set(b64(s.ram)); colour.set(b64(s.colour).subarray(0, 0x400));
    M[0] = s.cpu.pdir; M[1] = s.cpu.pdata;
    for (let r = 0; r < 0x40; r++) vic[r] = s.vic[r];
    for (let r = 0; r < 0x20; r++) sidw[r] = s.sidw ? s.sidw[r] : 0;
    cmp = s.cmp; latch = s.latch; enable = s.enable;
    pra = s.pra; ddra = s.ddra; ddrb = s.ddrb;
    if (s.pra2 !== undefined) { pra2 = s.pra2; ddra2 = s.ddra2; }
    t = s.cpu.cycles; lastLine = s.lastLine; target = null;
    dma = s.dma ? JSON.parse(JSON.stringify(s.dma)) : { at: -1, holds: [], bad: false, rows: [0, 0, 0, 0, 0, 0, 0, 0] };
    irqsOn = !(s.cpu.p & 4);
    irqBase = -1; counting = true; frac = 0;
    frameIdx = Math.floor(t / FRAME);
    if (vm) vm.at(-1, [], 0);
    done.length = 0; begin();
    it = entry(P); lastCp = from === undefined ? null : from; calls = Object.create(null); owed = 0; debt = -1; next = null;
    free = false; parked = false; lastBeat = -Infinity; work = 0; passWork = 0; known = false;
    for (const k in P.N) P.N[k] = 0;
  }
  restore(o.data, p => p.STARTUP({}), ENTRY);
  return {
    M, colour, vic, sidw, input, KEY, P, missing,
    get t() { return t; }, get frame() { return frameIdx; }, get target() { return target; },
    get shown() { return target === null ? frameIdx - 1 : Math.floor(target / FRAME) - 1; },
    runFrame, runUntil, restore, runTicks, leave, machineBeats, get ticks() { return ticks; }, get inLoop() { return free; },
    lastFrame: () => (target === null ? done[done.length - 1] : frameAt(Math.floor(target / FRAME) - 1)),
    frameAt: n => (n === frameIdx ? cur : frameAt(n)),
    onSid: f => sidListeners.push(f),
  };
}
root.SCRPage = { create, LINE, LINES, FRAME, KEY, ENTRY };
})(typeof window !== 'undefined' ? window : globalThis);
