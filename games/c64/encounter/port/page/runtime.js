// The Play page's machine: the port (src/) run as the C64 would run the game, on chips of its own.
// It runs in the browser and in node (../test_play.js), and refers to nothing but EncPort, the
// port's groups, site/lib/c64.js (the frames) and site/lib/collide.js (the sprite collisions).
//
//   const rt = EncPage.create({ data, cost })
//     data     the machine at the game's first instruction ($9C3E, where a reset enters it), in the
//              form kit/c64/machine.js saves a machine: memory, colour RAM, the chips and the clock;
//              scripts/pack-data.js makes it from the listing, every instruction of the game left
//              out
//     cost     the pacing, fitted on the game (scripts/fit-cost.js, cost.json): { seg: { 'from>to':
//              cycles }, call: { routine or '#count': cycles } }
//   rt.runFrame()      one frame of time: the program runs until the clock reaches the frame's end;
//                      returns the frame that ends there, for C64.renderFrame
//   rt.shown           that frame's number: the clock can be ahead of it
//   rt.input           { keys: Set of key names (kit/c64/machine.js's), joy: the joystick in port 2,
//                      active low; and as the game reads them, joyReads: its reads of the
//                      joystick's port, rowReads: for each row of the keyboard, its reads of the
//                      keys with that row selected }
//   rt.onSid(f)        f(register, value, cycle) for every write to the SID
//   rt.restore(state, entry, from)   a machine saved by the tests (kit/c64/machine.js's save()),
//                      and the program started at entry(P), a generator, from the checkpoint at
//                      from
//
// The clock. A PAL machine: 312 lines of 63 cycles. Each stretch of the main program moves the
// clock on by its cost, and the raster's interrupts run on their lines when they fall due, their
// own time added; a turn of a polling loop (the PAL check) moves the clock to the next line, and
// the main loop's raster wait to the first line it lets the program on from. A stretch costs what
// it cost the game: its own cycles (seg, by the checkpoints it runs between), each routine the
// port called in it at its own cycles, each count of the work inside them (P.N: a shape's bytes, a
// row's cells) at the cycles of one (call), and the busy loops' cycles as the port counts them
// ({ cycles }). The clock moves as the routines are called, not once at a stretch's end, so that
// the interrupts in the stretch see the memory as they would.
//
// The video chip's own cycles. Those are the processor's cycles; the clock gives the video chip
// the cycles it takes from the processor on top, as the beam passes the lines it takes them on,
// by kit/c64/machine.js's rule (dma): cycles 12-54 of a bad line, and five cycles from 55 + 2n on
// each of the 21 lines (42 Y-expanded) sprite n is fetched on. The game's cycles were timed with
// the same rule, and these taken out (scripts/time-stretches.js).
//
// The interrupts. Seven a frame from the raster, each handler setting the next one's line and
// address ($0314), none clearing I. Each runs whole when it comes, its chip writes on the cycles
// of their line the C64's land on (io.cycle, src/g-irq.js), so that the sky, the horizon's bands
// and the console split where the game splits them; its length is the handler's own, counted
// (P.irqCycles). The game holds them off (SEI) while it starts and restarts and round the death's
// flash; the port says where (P.sei, P.cli), and the flag changes once the stretch before is paid
// for, as the C64's does at the instruction.
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
// the raster's handlers, by the address $0314 holds
const IRQS = { 0xB2FE: 'irq_status_band', 0xB31D: 'irq_view_top_sky', 0xB34E: 'irq_horizon_band1',
  0xB374: 'irq_horizon_band2', 0xB39A: 'irq_horizon_band3', 0xB3C0: 'irq_ground_mirror_charset',
  0xB3EA: 'irq_console_and_frame_tick' };
// the frames kept ahead of the one shown
const AHEAD = 12;
// the least a stretch between two checkpoints costs
const MIN_STRETCH = 6;
// the main loop's raster wait (wait_raster_192, src/g-main.js): it reads the line until its low
// byte is $C0 or more, lines 192-255, and exits at $A188
const WAIT_FROM = 0xC0, WAIT_TO = 0xFF, WAIT_AT = 0xA188;

function create(o) {
  const EP = root.EncPort;
  const M = new Uint8Array(new ArrayBuffer(0x10000));
  const colour = new Uint8Array(new ArrayBuffer(0x400));
  const vic = new Uint8Array(0x40), sidw = new Uint8Array(0x20), sidListeners = [];
  let cmp = 0, latch = 0, enable = 0;
  let pra = 0x7F, ddra = 0xFF, ddrb = 0, pra2 = 0x3F, ddra2 = 0x3F;
  const input = { keys: new Set(), joy: 0x1F, joyReads: 0, rowReads: [0, 0, 0, 0, 0, 0, 0, 0] };

  // ---- the clock, and the frames as the beam draws them
  let t = 0, lastLine = -1, irqsOn = false;
  // the video chip's next look at its registers (cycle 12 or 55 of a line), whether line 48 saw the
  // display on, the lines left of each sprite's fetches, and the holds it has set
  let dma = { at: -1, holds: [], bad: false, rows: [0, 0, 0, 0, 0, 0, 0, 0] };
  const lineNow = () => Math.floor(t / LINE);
  const bank = () => 3 - ((pra2 | ~ddra2) & 3);
  // the byte the video chip reads at a in its bank: the character ROM, at $1000-$1FFF of banks 0
  // and 2, is never shown by the game (bank 1), and collides with nothing here
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
  // the lines the clock has passed (the raster latch set on the compare's), the collisions brought
  // up to it, and the frames it has finished
  function roll() {
    const ln = lineNow();
    while (lastLine < ln) { lastLine++; if (lastLine % LINES === cmp) latch |= 1; }
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
      return 0;                                            // the game turns CIA 1's interrupts off
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
    if (collide && ((a >= 0xD000 && a < 0xD400) || a === 0xDD00 || a === 0xDD02)) collide.to(t + 1);
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
    vicRead: r => ioRead(0xD000 | (r & 0x3F)), vicWrite: (r, v) => ioWrite(0xD000 | (r & 0x3F), v),
    sidRead: r => ioRead(0xD400 | (r & 0x1F)), sidWrite: (r, v) => ioWrite(0xD400 | (r & 0x1F), v),
    colourRead: i => colour[i & 0x3FF], colourWrite: (i, v) => ioWrite(0xD800 | (i & 0x3FF), v),
    ciaRead: r => ioRead(0xDC00 | (r & 0x0F)), ciaWrite: (r, v) => ioWrite(0xDC00 | (r & 0x0F), v),
    cia2Read: r => ioRead(0xDD00 | (r & 0x0F)), cia2Write: (r, v) => ioWrite(0xDD00 | (r & 0x0F), v),
    irqByte: a => irqByte(a),
    sei: () => flag(false), cli: () => flag(true),
    cycle: n => irqCycle(n),
    // the line the main loop's LDA $D012 reads, n cycles into it, as the C64's does
    rasterIn: n => Math.floor((t + n) / LINE) % LINES & 255,
  };

  // ---- the program, and what its stretches cost
  const P = EP.makePort(M, io);
  const model = o.cost || { seg: {}, call: {} };
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
    if (owed >= LINE && t < lim) { const d = whole(callsCost()); if (d >= 1) owed += advance(d, false, lim); }
  }
  // cycles as whole ones, the fractions the costs leave carried on to the next, so that they add
  // up to what the game's do over the title's thousands of passes
  let frac = 0;
  function whole(c) { const v = c + frac, n = Math.floor(v); frac = v - n; return n; }
  // the routines called and the work counted since the clock last moved, at their cost
  function callsCost() {
    let c = owed;
    owed = 0;
    calls = Object.create(null);
    for (const k in P.N) { if (P.N[k]) c += (model.call['#' + k] || 0) * P.N[k]; P.N[k] = 0; }
    return c;
  }
  function cost(from, to) {
    return whole((model.seg[from.toString(16) + '>' + to.toString(16)] || 0) + callsCost());
  }
  // A byte the interrupts write, read in the middle of a stretch: the clock first moves on by what
  // the stretch has cost so far, so that the interrupts due in that time have run
  function irqByte(a) {
    if (counting) { const c = whole(callsCost()); if (c >= 1) advance(c); }
    return M[a];
  }
  // the interrupt flag, changed once what the stretch has cost so far is paid, up to the end of
  // the frame (an interrupt due after it runs once the flag lets it, as one held off does)
  function flag(on) {
    if (counting && t < lim) { const c = whole(callsCost()); if (c >= 1) owed += advance(c, false, lim); }
    irqsOn = on;
  }

  // ---- the interrupts: the raster's, while its latch and enable bits are set and the flag lets it
  const pending = () => (latch & enable & 0x0F) !== 0;
  // a handler under way: the cycle its line began on, and its own cycles spent so far
  let irqBase = -1, irqSpent = 0;
  // the handler's next chip write lands n cycles into its line (src/g-irq.js): the clock moves there
  function irqCycle(n) {
    if (irqBase < 0 || n <= irqSpent) return;
    spend(n - irqSpent, Infinity); irqSpent = n;
    roll();
  }
  function runIrq() {
    const name = IRQS[M[0x0314] | M[0x0315] << 8];
    irqsOn = false;                        // the processor sets I as it takes the interrupt
    counting = false; irqBase = t; irqSpent = 0; P.irqCycles = 0;
    try {
      if (name) P[name]();
      else ioWrite(0xD019, 0x0F);          // no handler of the game's: the latch acknowledged
    } finally { counting = true; }
    // the rest of the handler's cycles, less the one the instruction under way took as it came
    const total = name ? P.irqCycles - 1 : 60;
    if (total > irqSpent) spend(total - irqSpent, Infinity);
    irqBase = -1;
    irqsOn = true;                         // its RTI: none of the handlers clears I, so it was clear
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
  // their time on top; but for a wait (to), dt on the clock, which ends there whatever runs on the
  // way (a hold the beam is in at the end holds it on). No further than the clock's limit: what is
  // left of dt
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
  // the main loop's raster wait under way: on to line 192, a frame on if the beam has passed line
  // 255; no further than the clock's limit. True once the beam is on a line it lets the program on
  // from
  function waitBand(limit) {
    for (let n = 0; n < 4; n++) {
      const ln = lineNow(), low = ln % LINES;
      if (low >= WAIT_FROM && low <= WAIT_TO) return true;
      let at = Math.floor(ln / LINES) * LINES + WAIT_FROM;
      if (at <= ln) at += LINES;
      if (at * LINE > limit) { if (limit > t) advance(limit - t, true); return false; }
      advance(at * LINE - t, true);
    }
    return true;
  }

  let it = null, lastCp = null;
  // What the program owes the clock at its last yield: the work's cycles (debt; -1, none to pay, not
  // even the interrupts due now), then the raster wait ({ band }) or the next line ({ next }). The
  // clock pays them up to the end of the frame it runs to and goes on with the rest in the next,
  // before the program goes on: so an interrupt in the next frame reads the controls as they are
  // then.
  let debt = -1, wait = null;
  // the clock owed, paid up to limit: true once it is all paid
  function pay(limit) {
    if (debt >= 0) { debt = advance(debt, false, limit); if (debt > 0) return false; debt = -1; }
    if (!wait) return true;
    if (wait.next) wait = { clock: (lineNow() + 1) * LINE };
    if (wait.clock !== undefined) {
      if (wait.clock > limit) { if (limit > t) advance(limit - t, true); return false; }
      if (wait.clock > t) advance(wait.clock - t, true);
    } else if (!waitBand(limit)) return false;
    wait = null;
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
      debt = lastCp === null ? whole(callsCost()) : Math.max(MIN_STRETCH, cost(lastCp, y.cp));
      lastCp = y.cp;
    } else if (y && y.wait !== undefined) {
      // the work before the wait, then the wait
      const c = lastCp === null ? whole(callsCost()) : cost(lastCp, WAIT_AT);
      debt = c >= 1 ? c : -1;
      wait = { band: true };
      lastCp = WAIT_AT;
    } else if (y && y.cycles !== undefined) {
      // a busy loop: what the stretch has cost so far and its own cycles, and with at a checkpoint
      // it ends at
      if (y.at !== undefined) { debt = (lastCp === null ? whole(callsCost()) : cost(lastCp, y.at)) + y.cycles; lastCp = y.at; }
      else debt = Math.max(1, whole(callsCost()) + y.cycles);
    } else {
      // a turn of a polling loop: what the stretch has cost so far, then on to the next line
      const c = whole(callsCost());
      debt = c >= 1 ? c : -1;
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
    if (collide) { if (s.collide) collide.load(s.collide); else collide.at(t); }
    irqsOn = !(s.cpu.p & 4);
    irqBase = -1; counting = true; frac = 0;
    frameIdx = Math.floor(t / FRAME);
    if (vm) vm.at(-1, [], 0);
    done.length = 0; begin();
    it = entry(P); lastCp = from === undefined ? null : from; calls = Object.create(null); owed = 0; debt = -1; wait = null;
    for (const k in P.N) P.N[k] = 0;
  }
  restore(o.data, p => p.main(), 0x9C3E);
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
root.EncPage = { create, LINE, LINES, FRAME, KEY, IRQS };
})(typeof window !== 'undefined' ? window : globalThis);
