// The Play page's machine: the port (src/) run as the C64 would run the game, on chips of its own.
// It runs in the browser and in node (test_play.js), and refers to nothing but AEPort, AEKernal
// (the KERNAL and the drive, port/src/kernal.js) and the data it is given.
//
//   const rt = AEPage.create({ data, cost, saved, onSave, onRestart })
//     data     what scripts/pack-data.js keeps: { state: the machine at the loader's hand-over (kit/
//              c64/machine.js's save(), its memory without the program), files: { NAME: base64 },
//              the files the game reads as it plays, the start and life objects in MAP1 without
//              their program, glyphs: the character ROM's glyphs the game copies, as 4 KB }
//     cost     the program's costs, measured on the game (scripts/profile.js, cost.json): { seg:
//              { 'from>to': cycles }, call, pass, wait: { routine: cycles } (pass also
//              'routine>child': a loop round the wait for a key by the routine it calls), unit: { routine:
//              [the place of the argument that counts, cycles for each] }, readers: [routine],
//              stack: [routine], turn, irq }
//     saved    optional: { NAME: Uint8Array }, saved games the browser kept, put on the disk
//     onSave   optional: (name, bytes) when the game writes a file (a saved game, its slots)
//     onRestart optional: (why) when the game quits or stops and the page starts it again
//     dice     optional, for a test: a function whose values the SID's noise reads give in turn
//   rt.runFrame()      one frame of time: the program runs until the clock reaches the frame's end;
//                      returns the frame due at that moment, for C64.renderFrame
//   rt.input           { keys: Set of key names (kit/c64/machine.js's), joy: port 2, active low }
//   rt.onSid(f)        f(register, value, cycle) for every write to the SID
//   rt.target          the clock at the end of the frame runFrame last ran to (null before the first)
//   rt.missing         the stretches the program ran that the cost has nothing for, as 'from>to'
//   rt.passes          the calls of GETIN ($6DFA) so far, each counted once the clock has paid
//                      the stretch that leads to it
//   rt.shown           the frame runFrame last returned; rt.ahead, the frames finished after it
//
// The clock. A PAL machine: 312 lines of 63 cycles. The game's interrupt is the KERNAL's, CIA 1's
// timer A running out (every 16,422 cycles as the KERNAL sets it); the arrow's motion is hooked in
// front of it at $4229, and with the KERNAL banked out the vector under it takes the interrupt to
// the bridge at $414A. The program moves the clock on by what the game spends in each routine the
// port runs, measured on the game (each routine's own cycles a call, a turn of the wait for a key
// in the loop round it, and a wait for the raster or the arrow), and the interrupts that fall due
// on the way run where they fall, their own time added. A turn of a polling loop (a wait for the arrow to arrive, for
// the raster) moves the clock to the next line, and a turn of the game's delay loop costs
// cost.turn.
//
// The disk. Every side is in the drive at once, as the port's drive model holds them, so a request
// for another side is met by any key; a record comes the moment the game asks for it, where the
// 1541 takes about a tenth of a second.
//
// The game's way out. QUIT on the RUN/STOP menu resets the machine ($FCE2) and a fault returns to
// BASIC: the page starts the game again from the hand-over, with the disk as it was left.
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
const b64 = s => (typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), c => c.charCodeAt(0)));

// The SID's third voice as the game reads it, its oscillator's top eight bits at $D41B: the
// game sets it running noise ($D40E-$D412) and takes its dice from it (read_sid_voice3_noise).
// The 24-bit accumulator adds the frequency each cycle; a rise of its bit 19 clocks the 23-bit
// noise register, whose bits 20, 18, 14, 11, 9, 5, 2 and 0 are the output (site/lib/sid.js's
// noiseBits); the test bit holds the register at all ones.
function voice3() {
  let acc = 0, lfsr = 0x7FFFF8, at = 0;
  function run(t, freq, ctrl) {
    let n = t - at; at = t;
    if (n <= 0) return;
    if (ctrl & 8) { lfsr = 0x7FFFFF; acc = 0; return; }
    if (!freq) return;
    // a step of the noise register for each rise of bit 19 in n cycles
    const before = acc;
    const total = before + freq * n;
    let steps = Math.floor(total / 0x100000) * 2 + ((total % 0x100000) >= 0x80000 ? 1 : 0)
      - (Math.floor(before / 0x100000) * 2 + ((before % 0x100000) >= 0x80000 ? 1 : 0));
    steps = Math.ceil(steps / 2);
    for (let i = 0; i < steps && i < 64; i++) {
      const bit = ((lfsr >> 22) ^ (lfsr >> 17)) & 1;
      lfsr = ((lfsr << 1) | bit) & 0x7FFFFF;
    }
    acc = total % 0x1000000;
  }
  function out(ctrl) {
    const r = lfsr;
    let v = ((r >> 20) & 1) << 7 | ((r >> 18) & 1) << 6 | ((r >> 14) & 1) << 5 | ((r >> 11) & 1) << 4 |
      ((r >> 9) & 1) << 3 | ((r >> 5) & 1) << 2 | ((r >> 2) & 1) << 1 | (r & 1);
    if (!(ctrl & 0x80)) v = (ctrl & 0x10) ? ((acc >> 16) & 0x80 ? ~(acc >> 15) : acc >> 15) & 0xFF : (ctrl & 0x20) ? (acc >> 16) & 0xFF : 0;
    return v & 0xFF;
  }
  return { read: (t, freq, ctrl) => { run(t, freq, ctrl); return out(ctrl); } };
}

function create(o) {
  const AE = root.AEPort, K = root.AEKernal;
  const data = o.data, model = o.cost || { seg: {}, call: {} };
  const TURN = model.turn || 120, IRQ_COST = model.irq || 160;
  const M = new Uint8Array(new ArrayBuffer(0x10000));
  const colour = new Uint8Array(0x400), vic = new Uint8Array(0x40), sidw = new Uint8Array(0x20);
  const glyphs = b64(data.glyphs);
  const sidListeners = [];
  const input = { keys: new Set(), joy: 0x1F, joy1: 0x1F };
  // the disk: the files the game reads, the browser's saves over them
  const files = {};
  for (const [k, v] of Object.entries(data.files)) files[k] = b64(v);
  if (o.saved) for (const [k, v] of Object.entries(o.saved)) files[k] = v;
  let drive = K.drive({ files });
  const missing = new Set();

  // ---- the chips, as the hand-over leaves them (start)
  let cmp = 0, latch = 0, enable = 0, pra = 0xFF, ddra = 0, ddrb = 0, pra2 = 0x97, ddra2 = 0x3F;
  let cia1 = null, cia2 = null, noise = voice3();
  let t = 0, frameIdx = 0, cur = null, target = null, nextIrq = Infinity;
  const keep = {};
  const vm = root.C64 ? root.C64.videoMemory(M, colour, { keep }) : null;
  const lineNow = () => Math.floor(t / LINE);
  const bank = () => 3 - ((pra2 | ~ddra2) & 3);
  // The frames. The clock runs ahead of the frames on show while the game is busy: a stretch the
  // C64 takes seconds over (a scene's text drawn into the bitmap, a stage read from the disk) runs
  // here at once, its frames kept until each is due. A frame keeps the memory that changed since
  // the last one began, and the frames are shown in turn, each change put into a copy of the
  // memory as it is shown (shown), so the frames waiting cost only their changes
  const queue = [], base = { mem: new Uint8Array(0x10000), colour: new Uint8Array(0x400) };
  const shown = { mem: new Uint8Array(0x10000), colour: new Uint8Array(0x400) };
  const words = a => new Uint32Array(a.buffer, a.byteOffset, a.length >> 2);
  const liveW = words(M), baseW = words(base.mem);
  let last = null;
  function begin() {
    const diff = [], cdiff = [];
    for (let x = 0; x < 0x4000; x++) if (liveW[x] !== baseW[x]) {
      baseW[x] = liveW[x];
      for (let a = x * 4; a < x * 4 + 4; a++) diff.push(a, M[a]);
    }
    for (let a = 0; a < 0x400; a++) if (colour[a] !== base.colour[a]) { base.colour[a] = colour[a]; cdiff.push(a, colour[a]); }
    if (vm) vm.begin();
    cur = { frame: frameIdx, vic: Array.from(vic.subarray(0, 47)), cia2: [pra2, ddra2], writes: [], diff, cdiff, keep };
  }
  // the frames the clock has finished: each kept until it is due, and the next begun
  function rollFrames() {
    if (vm) vm.at(t, cur.writes, bank());
    while (t >= (frameIdx + 1) * FRAME) {
      queue.push(cur);
      frameIdx++;
      begin();
    }
  }

  // CIA 1's timer A, the interrupt's source: the count left, the latch it reloads from, its
  // control (bit 0 running, bit 3 one-shot), the interrupt mask and flags. The clock it was last
  // brought up to is t0
  function timerAt(c) {
    const dt = t - c.t0; c.t0 = t;
    if (!(c.cr & 1) || dt <= 0) return;
    let left = dt;
    while (left > 0) {
      if (c.cnt >= left) { c.cnt -= left; break; }
      left -= c.cnt + 1; c.cnt = c.lat; c.icr |= 1;
      if (c.cr & 8) { c.cr &= ~1; break; }
    }
  }
  // the cycle of timer A's next underflow, if it raises an interrupt
  function irqDue() {
    const c = cia1;
    timerAt(c);
    if (c.icr & c.mask & 1) return t;
    if (!(c.cr & 1) || !(c.mask & 1)) return Infinity;
    return t + c.cnt + 1;
  }

  function ioRead(a) {
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F, ln = lineNow() % LINES;
      if (r === 0x12) return ln & 255;
      if (r === 0x11) return (vic[0x11] & 0x7F) | ((ln >> 8) << 7);
      if (r === 0x19) return latch | 0x70 | ((latch & enable) ? 0x80 : 0);
      if (r === 0x1A) return enable | 0xF0;
      if (r === 0x1E || r === 0x1F) return 0;
      return vic[r];
    }
    if (a >= 0xD400 && a < 0xD800) {
      const r = a & 0x1F;
      if (r === 0x1B) return o.dice ? o.dice() & 255 : noise.read(t, sidw[0x0E] | sidw[0x0F] << 8, sidw[0x12]);
      return 0;
    }
    if (a >= 0xD800 && a < 0xDC00) return colour[a - 0xD800] | 0xF0;
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15;
      if (r === 0) return (ddra ? (pra | ~ddra) & 0xFF : 0xE0 | input.joy) & (0xE0 | input.joy);
      if (r === 1) {
        let v = 0xFF;
        const rows = ddra ? pra & ddra : 0xFF;
        for (const name of input.keys) {
          const k = KEY[name];
          if (k !== undefined && !(rows & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
        }
        return v & (0xE0 | input.joy1) & 0xFF;
      }
      if (r === 2) return ddra;
      if (r === 3) return ddrb;
      return ciaRead(cia1, r);
    }
    if (a >= 0xDD00 && a < 0xDE00) {
      const r = a & 15;
      if (r === 0) return (pra2 | ~ddra2) & 0xFF;
      if (r === 2) return ddra2;
      return ciaRead(cia2, r);
    }
    return 0;
  }
  function ciaRead(c, r) {
    timerAt(c);
    if (r === 4) return c.cnt & 255;
    if (r === 5) return c.cnt >> 8;
    if (r === 13) { const v = c.icr | ((c.icr & c.mask) ? 0x80 : 0); c.icr = 0; return v; }
    if (r === 14) return c.cr;
    return 0;
  }
  function ciaWrite(c, r, v) {
    timerAt(c);
    if (r === 4) c.lat = (c.lat & 0xFF00) | v;
    else if (r === 5) { c.lat = (c.lat & 0xFF) | (v << 8); if (!(c.cr & 1)) c.cnt = c.lat; }
    else if (r === 13) { if (v & 0x80) c.mask |= v & 0x1F; else c.mask &= ~v & 0x1F; }
    else if (r === 14) { if (v & 0x10) c.cnt = c.lat; c.cr = v & 0xEF; }
    if (c === cia1) nextIrq = irqDue();
  }
  function ioWrite(a, v) {
    v &= 255;
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F;
      if (r < 47 && r !== 0x19 && r !== 0x1A) cur.writes.push([lineNow() % LINES, t % LINE + 1, 0xD000 + r, v]);
      if (r === 0x12) cmp = (cmp & 0x100) | v;
      else if (r === 0x11) { cmp = (cmp & 0xFF) | ((v & 0x80) << 1); vic[r] = v; }
      else if (r === 0x19) latch &= ~v & 0x0F;
      else if (r === 0x1A) enable = v & 0x0F;
      else vic[r] = v;
      return;
    }
    if (a >= 0xD400 && a < 0xD800) {
      const r = a & 0x1F;
      if (r === 0x0E || r === 0x0F || r === 0x12) noise.read(t, sidw[0x0E] | sidw[0x0F] << 8, sidw[0x12]);
      sidw[r] = v;
      for (const f of sidListeners) f(r, v, t);
      return;
    }
    if (a >= 0xD800 && a < 0xDC00) { colour[a - 0xD800] = v & 15; return; }
    if (a >= 0xDC00 && a < 0xDD00) {
      const r = a & 15;
      if (r === 0) pra = v; else if (r === 2) ddra = v; else if (r === 3) ddrb = v;
      else ciaWrite(cia1, r, v);
      return;
    }
    if (a >= 0xDD00 && a < 0xDE00) {
      const r = a & 15;
      if (r === 0 || r === 2) {
        if (r === 0) pra2 = v; else ddra2 = v;
        cur.writes.push([lineNow() % LINES, t % LINE + 1, a & 0xFFFF, v]);
      } else ciaWrite(cia2, r, v);
    }
  }
  const io = {
    read: ioRead, write: ioWrite,
    vicRead: r => ioRead(0xD000 | (r & 0x3F)), vicWrite: (r, v) => ioWrite(0xD000 | (r & 0x3F), v),
    sidRead: r => ioRead(0xD400 | (r & 0x1F)), sidWrite: (r, v) => ioWrite(0xD400 | (r & 0x1F), v),
    colourRead: i => colour[i & 0x3FF], colourWrite: (i, v) => ioWrite(0xD800 | (i & 0x3FF), v),
    ciaRead: r => ioRead(0xDC00 | (r & 0x0F)), ciaWrite: (r, v) => ioWrite(0xDC00 | (r & 0x0F), v),
    cia2Read: r => ioRead(0xDD00 | (r & 0x0F)), cia2Write: (r, v) => ioWrite(0xDD00 | (r & 0x0F), v),
    // the bytes the KERNAL's interrupt fills, read and written where they are
    irqByte: a => M[a], store: (a, v) => { M[a] = v & 255; },
  };

  // ---- the program's costs, measured on the game (port/scripts/profile.js): each routine the
  // port calls outside the interrupt moves the clock on by its own cycles a call (call), as it
  // returns, or, for one that waits, as it starts; by its own cycles a turn of the loop round the
  // wait for a key (pass), at each call of GETIN, for the loop and the routines reading the key in
  // it (readers); by its own cycles between its waits (wait), at the first turn of each
  // (P.FIRST); and, for one that fills, copies or reads a count of bytes it is given, by its own
  // cycles a byte (unit), as it returns. A few lines' worth at a time, so that the interrupts fall inside a long stretch and
  // its frames show what the game has drawn by then
  const CHUNK = 4 * LINE;
  let owed = 0, counting = true;
  const stack = [], readers = new Set(model.readers || []);
  function counted(P) {
    const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
    const pass = model.pass || {}, wait = model.wait || {}, unit = model.unit || {};
    for (const name of new Set(Object.keys(model.call).concat(model.stack || [], Object.keys(unit)))) {
      const f = P[name], c = model.call[name] || 0, u = unit[name];
      if (typeof f !== 'function') continue;
      P[name] = f instanceof GENERATOR
        ? function* (...a) {
          if (counting) charge(c);
          stack.push(name);
          try { return yield* f.apply(this, a); } finally { stack.pop(); }
        }
        : function (...a) { const r = f.apply(this, a); if (counting) charge(c + (u ? u[1] * (a[u[0]] & 0xFFFF) : 0)); return r; };
    }
    // a call of GETIN: a turn of the innermost loop and of the readers inside it; the loop's cost
    // by the routine it calls there (name>child), where its routine waits in more than one loop
    perPass = () => {
      let d = 0;
      for (let i = stack.length - 1; i >= 0; i--) {
        if (readers.has(stack[i])) { d += pass[stack[i]] || 0; continue; }
        const k = i < stack.length - 1 ? stack[i] + '>' + stack[i + 1] : stack[i];
        d += pass[k] !== undefined ? pass[k] : pass[stack[i]] || 0;
        break;
      }
      return d;
    };
    perWait = () => (stack.length ? wait[stack[stack.length - 1]] || 0 : 0);
    return P;
  }
  let perPass = () => 0, perWait = () => 0;
  function charge(c) {
    owed += c;
    if (owed >= CHUNK) { const d = owed; owed = 0; advance(d); }
  }
  function callsCost() { const d = owed; owed = 0; return d; }

  // ---- the program, from the hand-over
  let P = null, it = null, lastCp = null, passes = 0;
  function start() {
    const st = data.state;
    M.set(b64(st.ram)); colour.set(b64(st.colour).subarray(0, 0x400));
    for (let r = 0; r < 0x40; r++) vic[r] = st.vic[r] || 0;
    for (let r = 0; r < 0x20; r++) sidw[r] = (st.sidw && st.sidw[r]) || 0;
    cmp = st.cmp; latch = st.latch; enable = st.enable;
    pra = st.pra; ddra = st.ddra; ddrb = st.ddrb; pra2 = st.pra2; ddra2 = st.ddra2;
    const cia = n => ({ lat: st.cia[n].lat[0], cnt: st.cia[n].cnt[0], cr: st.cia[n].cr[0], mask: st.cia[n].mask, icr: st.cia[n].icr, t0: t });
    if (target === null) { t = st.cpu.cycles; frameIdx = Math.floor(t / FRAME); begin(); }
    cia1 = cia(0); cia2 = cia(1);
    noise = voice3();
    M[0] = st.cpu.pdir; M[1] = st.cpu.pdata;
    drive = K.copyDrive(K.drive({ files: Object.assign({}, drive.files) }));
    P = counted(AE.create(M, io, { charRom: glyphs, drive, cpuPort: st.cpu.pdata, cpuDir: st.cpu.pdir }));
    it = P.native_startup_enter_vm(); lastCp = 0x4000; owed = 0; stack.length = 0;
    nextIrq = irqDue();
  }
  // the files the game wrote, handed to the page as they change
  let written = new Map();
  function noteFiles() {
    for (const [k, v] of Object.entries(drive.files)) {
      if (written.get(k) !== v && files[k] !== v) { written.set(k, v); if (o.onSave) o.onSave(k, v); }
    }
  }

  // ---- the interrupt: CIA 1's timer, through the KERNAL's entry and $0314 while the KERNAL is
  // banked in, through the processor's own vector at $FFFE otherwise
  function runIrq() {
    const cfg = (P.cpuPort | ~P.cpuDir) & 7;
    const v = cfg & 2 ? M[0x0314] | M[0x0315] << 8 : M[0xFFFE] | M[0xFFFF] << 8;
    counting = false;
    try {
      if (v === 0x4229) P.irq_sprite();
      else if (v === 0xEA31) P.irq_kernal();
      else if (v === 0x414A) P.irq_dispatch_bridge();
      else throw new Error('the interrupt went to $' + v.toString(16));
    } finally { counting = true; }
    cia1.icr &= ~1;                    // the KERNAL's read of $DC0D: taken
    t += IRQ_COST;
    rollFrames();
    nextIrq = irqDue();
  }
  function advance(dt) {
    const end = t + Math.max(0, dt);
    let owed = end - t;
    for (;;) {
      if (nextIrq > t + owed) break;
      const at = Math.max(t, nextIrq);
      owed -= at - t; t = at; rollFrames();
      runIrq();
    }
    t += owed; rollFrames();
    nextIrq = irqDue();
  }
  function cost(from, to) {
    const k = from.toString(16) + '>' + to.toString(16);
    const seg = model.seg[k];
    if (seg === undefined) missing.add(k);
    return Math.round((seg || 0) + callsCost());
  }
  function step() {
    let r;
    try { r = it.next(); }
    catch (e) {
      if (e instanceof AE.Reset || e instanceof AE.Basic || e instanceof AE.Exit) { restart(e.message || 'the game stopped'); return; }
      throw e;
    }
    noteFiles();
    if (r.done) { restart('the game ended'); return; }
    const y = r.value;
    if (y && y.cp !== undefined) {
      let dt = cost(lastCp, y.cp) + (y.cycles || 0) + (y.cp === 0x6DFA ? perPass() : 0);
      // a stretch no session measured: a line, so that a loop along it runs slow, never stands still
      if (!dt) dt = LINE;
      lastCp = y.cp;
      advance(dt);
      if (y.cp === 0x6DFA) passes++;
    } else if (y && y.delay) advance(callsCost() + (y.cycles || 0) + y.delay * TURN);
    else if (y && y.cycles !== undefined) advance(callsCost() + y.cycles);
    else {                                             // a turn of a polling loop: to the next line
      if (y === P.FIRST) charge(perWait());
      advance(callsCost() + LINE - t % LINE);
    }
  }
  function restart(why) {
    if (o.onRestart) o.onRestart(why);
    start();
  }
  function runUntil(until) {
    let guard = 0;
    while (t < until) {
      step();
      if (++guard > 2e6) throw new Error('runUntil: no progress');
    }
  }
  function runFrame() {
    if (target === null) target = t;
    target += FRAME;
    if (t < target) runUntil(target);
    // the frame due at the target, the one that ended at or before it, and the ones before it that
    // were not shown, their changes taken in turn
    const due = Math.floor(target / FRAME) - 1;
    let F = null;
    while (queue.length && queue[0].frame <= due) {
      F = queue.shift();
      for (let i = 0; i < F.diff.length; i += 2) shown.mem[F.diff[i]] = F.diff[i + 1];
      for (let i = 0; i < F.cdiff.length; i += 2) shown.colour[F.cdiff[i]] = F.cdiff[i + 1];
    }
    if (F) { F.mem = shown.mem; F.colourMem = shown.colour; last = F; }
    return last;
  }

  start();
  return {
    M, colour, vic, sidw, input, KEY, missing,
    get t() { return t; }, get frame() { return frameIdx; }, get P() { return P; }, get target() { return target; },
    get passes() { return passes; },
    // the frame last shown, and how many frames the clock has run ahead of it
    get shown() { return last ? last.frame : -1; }, get ahead() { return queue.length; },
    get drive() { return drive; },
    runFrame, runUntil, step, lastFrame: () => last,
    onSid: f => sidListeners.push(f),
  };
}
root.AEPage = { create, LINE, LINES, FRAME, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
