// The Play page's machine: the port (src/) run as the C64 would run the game, on chips of its own.
// It runs in the browser and in node (test/t-page.js, ../test_play.js), and refers to nothing but
// SFPort, the port's groups, site/lib/c64.js (the frames), site/lib/sid.js (the SID's bus) and the
// 6502 the music driver runs on (site/lib/cpu6502.js on the page).
//
//   const rt = SFPage.create({ data, cost, files, onSave })
//     data     the machine at the game's first instruction ($4000), as the tape's stub leaves it, in
//              the form kit/c64/machine.js saves a machine: memory, colour RAM, the chips and the
//              clock; scripts/pack-data.js makes it from the listing, every instruction of the game
//              but the music driver's left out
//     cost     the pacing, fitted on the game (scripts/fit-cost.js, cost.json): { seg: { 'from>to':
//              cycles }, call: { routine or '#count': cycles }, irq: { routine or '#count': cycles } }
//     files    optional: the saved games the page keeps, { name: Uint8Array }, $CA00-$CFFE
//     onSave   optional: (name, bytes) when the game saves one
//   rt.runFrame()      one frame of time: the program runs until the clock reaches the frame's end;
//                      returns the frame that ends there, for C64.renderFrame
//   rt.shown           that frame's number: the clock can be ahead of it
//   rt.input           { keys: Set of key names (kit/c64/machine.js's), joy1: joystick port 1,
//                      active low, pen: the mouse's place { x, y } on the frame's pixels, or null,
//                      button: the mouse's button }: the mouse is the light pen and the analog
//                      joystick (the paddles), whichever the control menu chose
//   rt.nmi()           the RESTORE key: the NMI, which restarts the game while RUN/STOP is held
//   rt.onSid(f)        f(register, value, cycle) for every write to the SID
//   rt.restore(state, entry, from)   a machine saved by the tests (kit/c64/machine.js's save()),
//                      and the program started at entry(P), a generator, from the checkpoint at
//                      from (test/t-page.js)
//
// The clock. A PAL machine: 312 lines of 63 cycles. Each stretch of the main program moves the
// clock on by its cost, and the raster interrupt (line $F8, once a frame) runs on its line when it
// falls due, its own time added; a turn of a polling loop moves the clock to the next line, and a
// raster wait to its line. A stretch costs what it cost the game: its own cycles (seg, by the
// checkpoints it runs between), each routine the port called in it at its own cycles, and each
// count of the work inside them (P.N: bytes of a picture, glyphs of a text) at the cycles of one
// (call). The interrupt costs the same way (irq), with the music driver's own cycles on its 6502
// core as they come. The clock moves as the routines are called, not once at a stretch's end, so
// that a screen drawn over several frames shows as the C64 draws it.
//
// The video chip's own cycles. Those are the processor's cycles; the clock gives the video chip
// the cycles it takes from the processor on top, as the beam passes the lines it takes them on,
// by kit/c64/machine.js's rule (dma): cycles 12-54 of a bad line, and five cycles from 55 + 2n on
// each of the 21 lines (42 Y-expanded) sprite n is fetched on. The game's cycles were timed with
// the same rule, and these taken out (scripts/time-stretches.js).
//
// The interrupt flag. The game holds the raster's interrupt off (SEI) while it starts and
// restarts, while the screen shakes as Zoff V explodes, and round a few writes; the port says
// where (P.sei, P.cli), and the flag changes once the stretch before is paid for, as the C64's
// does at the instruction.
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
// the frames kept ahead of the one shown: more than the longest stretch, a screen's drawing
const AHEAD = 60;
// the least a stretch between two checkpoints costs
const MIN_STRETCH = 10;
// The mouse's place on the frame's pixels (C64.renderFrame: sprite X -8 on, raster line 16 on) as
// the light pen's latches and the paddles' pots, so that the game's own sums put the cursor's
// cell under the mouse. The game centres the cursor on a cell at column pair 4c + 4 ($68E5) and
// sprite Y 8r + 36, the cell's centre at pixel (36 + 8c, 39 + 8r); it takes the pen's X as $D013 -
// $11 and its Y as $D014 - 7 (input_lightpen), the paddles' Y as POT X / 2 + $64 and their X as
// POT Y (input_paddles).
const penX = x => (x + 6) >> 1, penY = y => y + 4;
const potX = y => Math.max(0, Math.min(255, (y - 103) * 2)), potY = x => Math.max(0, Math.min(255, (x - 28) >> 1));
// the input routines (at $54EF) that read the mouse: the light pen's and the paddles'
const MOUSE = new Set([0x54F1, 0x5526]);

function create(o) {
  const SF = root.SFPort;
  const M = new Uint8Array(new ArrayBuffer(0x10000));
  const colour = new Uint8Array(new ArrayBuffer(0x400));
  const vic = new Uint8Array(0x40), sidw = new Uint8Array(0x20), sidListeners = [];
  let cmp = 0, latch = 0, enable = 0;
  let pra = 0xFF, ddra = 0, ddrb = 0, pra2 = 0x97, ddra2 = 0x3F;
  const bus = root.C64Sid ? root.C64Sid.engine().createBus('8580') : null;
  const input = { keys: new Set(), joy1: 0x1F, pen: null, button: false };

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
  function keyboard() {
    let v = 0xFF;
    const rows = ddra ? pra | ~ddra : 0xFF;
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
      if (r === 0x13) return input.pen ? penX(input.pen.x) & 255 : vic[r];
      if (r === 0x14) return input.pen ? penY(input.pen.y) & 255 : vic[r];
      if (r === 0x19) { roll(); return latch | 0x70 | ((latch & enable) ? 0x80 : 0); }
      if (r === 0x1A) return enable | 0xF0;
      return vic[r];
    }
    if (a >= 0xD400 && a < 0xD800) {
      const r = a & 0x1F;
      if (r === 0x19) return input.pen ? potX(input.pen.y) : 0xFF;   // no paddles: $FF, as kit/c64/machine.js has it
      if (r === 0x1A) return input.pen ? potY(input.pen.x) : 0xFF;
      if (r === 0x1B || r === 0x1C) return 0;
      return bus ? bus.read(r, t, 0) : 0;
    }
    if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800] | 0xF0;
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15;
      if (r === 0) return (pra | ~ddra) & 0xFF;
      // the mouse's button is the pen's and the paddles' button, on the line the joystick's down
      // shares, while the game reads one of them
      if (r === 1) return keyboard() & (0xE0 | input.joy1) & (input.button && MOUSE.has(M[0x54EF] | M[0x54F0] << 8) ? ~2 : 0xFF) & 0xFF;
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

  // ---- the saved games, kept by name, on tape or disk alike: the name screen's letters, A to Z
  const files = Object.assign({}, o.files || {});
  const nameOf = codes => String.fromCharCode(...codes);
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
    files: {
      load: name => { const f = files[nameOf(name)]; return f ? f.slice() : null; },
      save: (name, device, bytes) => { const n = nameOf(name); files[n] = Uint8Array.from(bytes); if (o.onSave) o.onSave(n, files[n]); },
    },
  };

  // ---- the program, and what its stretches cost
  const P = SF.makePort(M, io);
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
  // a routine called: what was called before it is paid for once it comes to a line's time, up to
  // the end of the frame the clock runs to (lim), and the rest at the program's next yield
  let lim = Infinity;
  function called(name, c) {
    calls[name] = (calls[name] || 0) + 1;
    owed += c;
    if (owed >= LINE && t < lim) { const d = callsCost(); if (d >= 1) owed += advance(Math.round(d), false, lim); }
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
  // A byte the interrupt writes, read in the middle of a stretch: the clock first moves on by what
  // the stretch has cost so far, so that the interrupts due in that time have run
  function irqByte(a) {
    if (counting) { const c = callsCost(); if (c >= 1) advance(Math.round(c)); }
    return M[a];
  }
  // the interrupt flag, changed once what the stretch has cost so far is paid, up to the end of
  // the frame (an interrupt due after it runs once the flag lets it, as one held off does)
  function flag(on) {
    if (counting && t < lim) { const c = callsCost(); if (c >= 1) owed += advance(Math.round(c), false, lim); }
    irqsOn = on;
  }

  // ---- the interrupts: the raster's, while its latch and enable bits are set and the flag lets it
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
  // a raster wait under way ({ line, n }): on to the start of the line, again a frame on if an
  // interrupt took the clock past it, as the game's loop, which compares the line, would miss it;
  // no further than the clock's limit. True once the beam is on the line
  function waitLine(w, limit) {
    while (w.n < 4 && lineNow() % LINES !== w.line) {
      const ln = lineNow();
      let at = Math.floor(ln / LINES) * LINES + w.line;
      if (at <= ln) at += LINES;
      if (at * LINE > limit) { if (limit > t) advance(limit - t, true); return false; }
      advance(at * LINE - t, true);
      w.n++;
    }
    return true;
  }

  let it = null, lastCp = null;
  // What the program owes the clock at its last yield: the work's cycles (debt; -1, none to pay, not
  // even the interrupts due now), then a raster wait ({ line, n }) or the next line ({ next }). The
  // clock pays them up to the end of the frame it runs to and goes on with the rest in the next,
  // before the program goes on: so an interrupt in the next frame reads the controls as they are
  // then.
  let debt = -1, wait = null;
  // A Jump out of the NMI (RUN/STOP with RESTORE) starts the main program again there: the
  // restart, whose stretch to its wait (no session timed it) costs the routines it calls
  function startAt(at) {
    it = P.main({ at }); lastCp = null; calls = Object.create(null); owed = 0; debt = -1; wait = null;
    for (const k in P.N) P.N[k] = 0;
  }
  // the clock owed, paid up to limit: true once it is all paid
  function pay(limit) {
    if (debt >= 0) { debt = advance(debt, false, limit); if (debt > 0) return false; debt = -1; }
    if (!wait) return true;
    if (wait.next) wait = { clock: (lineNow() + 1) * LINE };
    if (wait.clock !== undefined) {
      if (wait.clock > limit) { if (limit > t) advance(limit - t, true); return false; }
      if (wait.clock > t) advance(wait.clock - t, true);
    } else if (!waitLine(wait, limit)) return false;
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
      debt = lastCp === null ? 0 : Math.max(MIN_STRETCH, cost(lastCp, y.cp));
      lastCp = y.cp;
    } else if (y && y.wait !== undefined) {
      // the work before the wait, then the wait
      const c = lastCp === null ? Math.round(callsCost()) : cost(lastCp, y.at);
      debt = c >= 1 ? c : -1;
      wait = { line: y.wait, n: 0 };
      lastCp = y.at !== undefined ? y.at : null;
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
  // RESTORE: the NMI between two steps of the program. With RUN/STOP held it restarts the game, the
  // flag left set by its RTI; without, the flag goes back as it was
  function nmi() {
    const was = irqsOn;
    counting = false;
    try { P.nmi({}); irqsOn = was; }
    catch (e) { if (!(e instanceof P.Jump)) throw e; startAt(e.to); }
    finally { counting = true; }
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
  restore(o.data, p => p.main(), 0x4000);
  return {
    M, colour, vic, sidw, input, KEY, P, files,
    get t() { return t; }, get frame() { return frameIdx; }, get target() { return target; },
    get shown() { return target === null ? frameIdx - 1 : Math.floor(target / FRAME) - 1; },
    get irqsOn() { return irqsOn; },
    runFrame, runUntil, restore, nmi, lastFrame: () => (target === null ? done[done.length - 1] : frameAt(Math.floor(target / FRAME) - 1)),
    onSid: f => sidListeners.push(f),
  };
}
root.SFPage = { create, LINE, LINES, FRAME, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
