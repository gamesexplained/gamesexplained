// The Play page's machine: the port (src/) run as the Commodore 16 runs the game, on a TED of its
// own. It runs in the browser and in node (../test_play.js), and needs PetePort and its groups,
// and site/lib/c16.js for TED's beam.
//
//   const rt = PetePage.create({ ram, cost })
//     ram    the game's memory as the loader leaves it at $1800, a Uint8Array of 64 KB: listing.json's
//            bytes (C16.load), to which this adds the few the listing lacks (PetePort.MISSING)
//     cost   what the program's stretches cost, fitted on the game (scripts/fit-cost.js, cost.json)
//   rt.runFrame()   runs the program until the clock reaches the end of the next frame, and returns
//                   that frame: { n, bands, sound }, bands for C16.renderBands and sound the writes
//                   to TED's sound registers in it, [tick in the frame, register, value, ...], for
//                   TEDSound's host
//   rt.input        { keys: Set of key numbers (kit/c16/machine.js's KEY), joy: port 2's stick,
//                   active low: 1 up, 2 down, 4 left, 8 right, 16 fire }
//   rt.M, rt.ted, rt.P, rt.beam, rt.t (the clock), rt.frame (the frame the clock is in),
//   rt.passes (the main loop's passes, at $1852)
//
// The clock is TED's: 312 lines of 114 ticks of the double clock a frame, the processor's cycles
// placed on them as TED gives them (C16.timing.Beam: the single clock on the display's lines, the
// bad lines' holds). Each stretch of the program between two checkpoints moves it on by what the
// stretch cost the game (cost: its own cycles, by the checkpoints it runs between, and each
// routine called and each count of work in it at its own), and a turn of a polling loop moves it to
// the start of the next line. TED raises its raster interrupt as the beam reaches the compare line
// ($FF0B, with $FF0A's bit 0); the processor takes it when its interrupt flag is clear, at the
// port's next yield: the handler the KERNAL's vector at $0314 names runs then, its own stretches
// costed the same way. irq_play lets interrupts in again at once (CLI), as the game's does, so the
// next raster interrupt can come in at one of its own checkpoints.
//
// What the page shows is made as the beam goes: the memory as each row of the screen begins, and
// TED's registers line by line, a write taking effect on the line after the one it was made on.
// The timers count at the single clock (the game reads them only as random numbers, as it does
// the beam's place, $FF1D and $FF1E), and only the raster interrupt is modelled: the game enables
// no other.
(function (root) {
'use strict';
const LINE = 114, LINES = 312, FRAME = LINE * LINES;
const RASTER_AT = 1, HPOS_AT = 97;      // as kit/c16/machine.js has them, measured on plus4emu
// TED's registers as the KERNAL leaves them, and the bits that read 1 whatever was written
// (kit/c16/machine.js, KERNAL_TED and READ_ONES)
const KERNAL_TED = [0xE1, 0x01, 0x71, 0x7E, 0x80, 0x7E, 0x1B, 0x08, 0xFF, 0x7D, 0x02, 0xCC, 0xFC, 0xA0, 0x00, 0x00,
  0x7C, 0x00, 0x04, 0xD0, 0x08, 0x71, 0x5B, 0x75, 0x77, 0x6E, 0xFC, 0x00, 0xFE, 0x00, 0xC6, 0xA8];
const READ_ONES = new Uint8Array(0x20);
Object.assign(READ_ONES, { 0x0A: 0xA0, 0x0C: 0xFC, 0x10: 0x7C, 0x12: 0xC0, 0x14: 0x07, 0x15: 0x80, 0x16: 0x80,
  0x17: 0x80, 0x18: 0x80, 0x19: 0x80, 0x1A: 0xFC, 0x1F: 0x80 });
// the registers the picture is drawn from
const SHOWN = new Set([0x06, 0x07, 0x0C, 0x0D, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19]);
// the handlers, by the address the vector at $0314 holds
const HANDLERS = { 0x1991: 'irq_play', 0x3080: 'irq_title' };
// the least a stretch costs, for one the fit never saw
const MIN_STRETCH = 10;
// the start of a pass of the main loop
const PASS = 0x1852;
// the frames kept after the clock has passed them, for the one shown
const KEPT = 4;

function create(o) {
  const C16 = root.C16, Beam = C16.timing.Beam;
  const M = new Uint8Array(new ArrayBuffer(0x10000));
  M.set(o.ram);
  for (const [a, b] of Object.entries(root.PetePort.MISSING)) M.set(b, +a);
  const ted = Uint8Array.from(KERNAL_TED);
  const beam = new Beam({ ff06: ted[0x06] });
  const input = { keys: new Set(), joy: 0x1F };
  let t = 0, lineSeen = 0, rasterSeen = -1, rasterMatch = false, flags = ted[0x09] & 0x5E;
  let keyLatch = 0xFF, ff08 = 0xFF, passes = 0;
  // the timers: a count at tick t0, running or not
  const timers = [0, 1, 2].map(i => ({ count: ted[2 * i] | ted[2 * i + 1] << 8, latch: ted[0] | ted[1] << 8, t0: 0, run: true }));
  const timerAt = (i, x = t) => {
    const T = timers[i];
    if (!T.run) return T.count;
    const n = Math.floor((x - T.t0) / 2), c = T.count;
    if (i > 0) return ((c - n) % 0x10000 + 0x10000) % 0x10000;
    if (n <= c) return c - n;
    const P = T.latch || 0x10000;
    return P - 1 - ((n - c - 1) % P);
  };

  // ---- the frames as the beam draws them: TED's registers as each began and the writes after,
  // the memory as each of the screen's 25 rows began, and the writes to the sound registers
  const pool = [];
  function newFrame(n) {
    const f = pool.pop() || { rows: Array.from({ length: 25 }, () => new Uint8Array(0x4000)) };
    f.n = n; f.ted0 = ted.slice(0, 0x20); f.writes = []; f.sound = []; f.got = 0; f.bands = null;
    return f;
  }
  let cur = newFrame(0);
  const done = [];
  function lineStart(L) {
    const y = L % LINES;
    if (y === 0) {
      done.push(cur);
      while (done.length > KEPT) pool.push(done.shift());
      cur = newFrame(L / LINES);
      beam.frame();
    }
    // the rows begin at lines 4, 12 ... 196 (25 rows with the vertical scroll at 3)
    if (y >= 4 && y < 204 && (y - 4) % 8 === 0) { cur.rows[(y - 4) >> 3].set(M.subarray(0, 0x4000)); cur.got |= 1 << ((y - 4) >> 3); }
  }
  const compare = () => ted[0x0B] | (ted[0x0A] & 1) << 8;
  function rasterCheck(line) {
    const m = line === compare();
    if (m && !rasterMatch) flags |= 0x02;
    rasterMatch = m;
  }
  const nextEvent = () => Math.min((lineSeen + 1) * LINE, (rasterSeen + 1) * LINE + RASTER_AT);
  // TED up to tick u: the lines begun, the raster flag raised as the count reaches the compare line
  function events(u) {
    for (;;) {
      const a = (lineSeen + 1) * LINE, b = (rasterSeen + 1) * LINE + RASTER_AT;
      if (Math.min(a, b) > u) return;
      if (a <= b) { lineSeen++; lineStart(lineSeen); } else { rasterSeen++; rasterCheck(rasterSeen % LINES); }
    }
  }

  // ---- the chips
  function keyboard(w) {
    let v = 0xFF;
    for (const k of input.keys) if (!(keyLatch & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
    if (!(w & 0x02)) v &= 0x70 | (input.joy & 0x0F) | (input.joy & 0x10 ? 0x80 : 0) | 0x40;
    return v & 0xFF;
  }
  // The tick a read of the timers or the beam's place sees: the clock moved on by what the run
  // owes so far (the routines it has called since its last checkpoint) and by the reads of TED it
  // has made since then, four cycles each, so that a loop that draws random numbers from them
  // (find_space, swap_face) sees them change from turn to turn, as the game does.
  const now = () => { const run = top(), n = Math.round(run.owe + run.seen); return n > 0 ? beam.after(t, n) : t; };
  function read(a) {
    if (a < 0xFF00 || a >= 0xFF40) return 0xFF;               // the ACIA, the 6529: nothing there
    const r = a & 0x3F;
    if (r >= 0x20) return 0xFF;
    top().seen += 4;
    if (r <= 5) { const v = timerAt(r >> 1, now()); return r & 1 ? v >> 8 : v & 0xFF; }
    if (r === 0x08) return ff08;
    if (r === 0x09) { const f = flags | 0x25; return f | ((f & ted[0x0A] & 0x5E) ? 0x80 : 0); }
    if (r === 0x13) return (ted[0x13] & 0xFE) | 1;
    if (r === 0x1C || r === 0x1D) { const L = (Math.floor((now() - RASTER_AT) / LINE) % LINES + LINES) % LINES; return r === 0x1D ? L & 0xFF : 0xFE | (L >> 8); }
    if (r === 0x1E) return (((now() + HPOS_AT) % LINE) * 2) & 0xFF;
    return ted[r] | READ_ONES[r];
  }
  function write(a, v) {
    v &= 0xFF;
    if (a >= 0xFD30 && a < 0xFD40) { keyLatch = v; return; }
    if (a < 0xFF00 || a >= 0xFF20) return;
    const r = a & 0x1F;
    if (r <= 5) {
      const i = r >> 1, T = timers[i];
      T.count = timerAt(i); T.t0 = t;
      if (r & 1) { T.count = (T.count & 0xFF) | v << 8; if (i === 0) T.latch = (T.latch & 0xFF) | v << 8; T.run = true; }
      else { T.count = (T.count & 0xFF00) | v; if (i === 0) T.latch = (T.latch & 0xFF00) | v; T.run = false; }
      ted[r] = v;
      return;
    }
    if (r === 0x08) { ff08 = keyboard(v); ted[r] = v; return; }
    if (r === 0x09) { flags &= ~(v & 0x5E); return; }
    ted[r] = v;
    if (r === 0x06) beam.ff06 = v;
    if (r === 0x0A || r === 0x0B) rasterCheck((rasterSeen % LINES + LINES) % LINES);
    if (r >= 0x0E && r <= 0x12) cur.sound.push(t - cur.n * FRAME, 0xFF00 | r, v);
    if (SHOWN.has(r)) cur.writes.push([Math.floor(t / LINE) % LINES, r, v]);
  }

  // ---- the program: the main program and the interrupts it lets in, a stack of runs, each a
  // generator with its interrupt flag, the checkpoint it last passed, and the cycles it owes
  const io = { read, write, irqByte: a => M[a], sei: () => { top().I = 1; }, cli: () => { top().I = 0; } };
  const P = root.PetePort.makePort(M, io);
  const model = o.cost || { seg: {}, call: {} };
  const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
  const stack = [];
  const top = () => stack[stack.length - 1];
  for (const name of Object.keys(model.call)) {
    const f = P[name];
    if (typeof f !== 'function') continue;
    const c = model.call[name];
    P[name] = f instanceof GENERATOR
      ? function* (...a) { top().owe += c; return yield* f.apply(this, a); }
      : function (...a) { top().owe += c; return f.apply(this, a); };
  }
  // the stretch to checkpoint to: its own cycles, with the routines called in it (owed as they
  // were called) and the counts of work since the last
  function stretch(run, to) {
    const key = (run.at ? run.at.toString(16) + ':' : '') + run.cp + '>' + to;
    let c = model.seg[key];
    if (c === undefined) c = MIN_STRETCH;
    for (const k in P.N) { if (P.N[k]) c += (model.call['#' + k] || 0) * P.N[k]; P.N[k] = 0; }
    run.cp = to;
    return c;
  }
  const canTake = () => (flags & ted[0x0A] & 0x02) !== 0 && top().I === 0;
  // the clock on to tick u, or to the tick an interrupt can be taken on, if that comes first
  function runTo(u) {
    for (;;) {
      const ev = nextEvent();
      if (ev > u) { if (u > t) t = u; return true; }
      if (ev > t) t = ev;
      events(t);
      if (canTake()) return false;
    }
  }
  // the cycles a run owes, paid on the clock a line at a time (the display switched off or on
  // changes the cycles a line gives from the next frame): false when an interrupt came first
  function pay(run) {
    for (;;) {
      if (run.owe < 0.5) { run.owe = 0; return true; }
      const ev = nextEvent(), u = beam.after(t, Math.round(run.owe));
      if (u <= ev) { if (u > t) t = u; run.owe = 0; return true; }
      run.owe -= beam.cycles(t, ev); t = ev; events(t);
      if (canTake()) return false;
    }
  }
  function take() {
    const v = M[0x0314] | M[0x0315] << 8, name = HANDLERS[v];
    if (!name) throw new Error('an interrupt with the vector at $' + v.toString(16).toUpperCase() + ', which the port has no handler for');
    const f = P[name];
    const gen = f instanceof GENERATOR ? f.call(P) : (function* () { f.call(P); })();
    stack.push({ gen, at: v, I: 1, cp: 'in', owe: 0, seen: 0, done: false, poll: false, until: -1 });
  }
  function step() {
    const run = top();
    if (run.owe > 0) { if (!pay(run)) take(); return; }
    if (run.poll) {                                         // a turn of a polling loop: to the next line
      if (run.until < 0) run.until = (Math.floor(t / LINE) + 1) * LINE;
      if (runTo(run.until)) { run.poll = false; run.until = -1; } else take();
      return;
    }
    if (run.done) { stack.pop(); return; }
    if (canTake()) { take(); return; }
    const r = run.gen.next();
    if (r.done) {
      if (!run.at) throw new Error('the program ended');
      run.done = true; run.owe += stretch(run, 'out');
      return;
    }
    const y = r.value;
    run.seen = 0;
    if (y && y.cp !== undefined) { run.owe += stretch(run, y.cp.toString(16)); if (y.cp === PASS) passes++; }
    else if (y && y.cycles !== undefined) run.owe += y.cycles;
    else run.poll = true;                                   // the routines called in the turn are paid first
  }
  stack.push({ gen: P.program(), at: 0, I: 1, cp: 'start', owe: 0, seen: 0, done: false, poll: false, until: -1 });

  let target = 0;
  // one frame of time: the program runs until the clock reaches the frame's end
  function runFrame() {
    target += FRAME;
    let guard = 0;
    while (t < target) { step(); if (++guard > 5e6) throw new Error('runFrame: no progress'); }
    return frameAt(target / FRAME - 1);
  }
  // the frame numbered n, its bands for C16.renderBands, or the nearest kept
  function frameAt(n) {
    let f = done.find(x => x.n === n) || done[done.length - 1];
    if (!f) return null;
    if (!f.bands) f.bands = bands(f);
    return f;
  }
  // the frame's lines in bands, each with the memory its row began with and TED's registers then
  function bands(f) {
    const out = [], regs = f.ted0.slice();
    let w = 0, start = 0, mem = null;
    const rowOf = y => { const r = Math.min(24, y >> 3); return f.got & (1 << r) ? f.rows[r] : M; };
    for (let y = 0; y < 200; y++) {
      const L = y + 4;
      let changed = false;
      while (w < f.writes.length && f.writes[w][0] < L) { regs[f.writes[w][1]] = f.writes[w][2]; w++; changed = true; }
      const m = rowOf(y);
      if (y && (changed || m !== mem)) { out[out.length - 1].y1 = y - 1; start = y; }
      if (!y || changed || m !== mem) out.push({ y0: start = y, y1: 199, mem: m, ted: regs.slice() });
      mem = m;
    }
    return out;
  }
  return { M, ted, input, P, beam, runFrame, frameAt, get t() { return t; }, get frame() { return Math.floor(t / FRAME); }, get passes() { return passes; } };
}
root.PetePage = { create, LINE, LINES, FRAME };
})(typeof window !== 'undefined' ? window : globalThis);
