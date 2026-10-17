// The Play page's machine: the port (src/) run as the C64 would run the game, on chips of its own.
// It runs in the browser and in node (test/t-page.js, ../test_play.js), and refers to nothing but
// CMPort, the port's groups, site/lib/c64.js (the frames) and site/lib/sid.js (the SID's bus).
//
//   const rt = CMPage.create({ data, cost, files, onSave })
//     data     the machine as the loader leaves it when it jumps to the game ($473B), in the form
//              kit/c64/machine.js saves a machine: memory, colour RAM, the chips and the clock;
//              scripts/pack-data.js makes it from the snapshot, every instruction of the game left
//              out
//     cost     the main program's costs, fitted on the game (scripts/fit-cost.js, cost.json): { seg:
//              { 'from>to': cycles }, call: { routine: cycles, '#count': cycles } }
//     files    optional: the saved games the page keeps, { name: Uint8Array }
//     onSave   optional: (name, bytes) when the game saves one
//   rt.runFrame()      one frame of time: the program runs until the clock reaches the frame's end;
//                      returns the frame that ends there, for C64.renderFrame
//   rt.shown           that frame's number: the clock can be ahead of it (below)
//   rt.input           { keys: Set of key names (kit/c64/machine.js's), joy: port 2, active low }
//   rt.onSid(f)        f(register, value, cycle) for every write to the SID
//   rt.target          the clock at the end of the frame runFrame last ran to (null before the first)
//   rt.restore(state, entry)   a machine saved by the tests (kit/c64/machine.js's save()), and the
//                      program started at entry(P), a generator (test/t-page.js)
//
// The clock. A PAL machine: 312 lines of 63 cycles. Each stretch of the program moves the clock on
// by its cost, and the interrupts that fall due on the way run there, their own time added; a turn
// of a polling loop moves it to the next line. A stretch costs what it cost the game: the cycles
// of the stretch itself (seg, by the checkpoints it runs between), each routine the port called in
// it at its own cycles, and each count of the work inside them (P.N: rows, bytes, steps along an
// edge) at the cycles of one (call), fitted on 7,700 passes of the game (scripts/fit-cost.js).
// The clock moves as the routines are called, not once at the stretch's end: drawing a view takes
// the game a second or two, and its picture goes to the screen at the end of that time (the view
// is drawn off screen and copied in), not at its start; the interrupts fall where they fall. The
// port runs a stretch at once, so the clock can stand up to a view's drawing ahead of the frame the
// page is at: the frames it has finished are kept (AHEAD) and each shown when its time comes.
//
// The interrupts. The game enables none on the video chip: CIA 1's timer A, as the KERNAL left it
// (60 times a second), is the only source. Its handler looks at the video chip's latch first, which
// the beam sets each frame on line $28 whether or not it is enabled: when it is set, the handler
// plays the music's frame and leaves the timer's interrupt waiting, so it runs again at once for
// the timer's own work. So the music has a frame each 50th of a second and the clock its tick each
// 60th, as on the C64.
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
// The interrupt's own cycles, from the processor taking it to its RTI, measured on the game's code
// over 1,500 frames from moments of play: the music's frame (the latch's branch) 1,040 on
// average; the timer's 250, and 4,950 more each time a sensor's flash fills the view's colours
const IRQ_MUSIC = 1040, IRQ_TIMER = 250, IRQ_FILL = 4950;
// the frames kept ahead of the one shown: more than the longest stretch, the start's (about 1.7
// million cycles, 90 frames)
const AHEAD = 160;
// the least a stretch between two checkpoints costs (step())
const MIN_STRETCH = 10;

function create(o) {
  const CM = root.CMPort;
  const M = new Uint8Array(new ArrayBuffer(0x10000));
  const colour = new Uint8Array(new ArrayBuffer(0x400));
  const vic = new Uint8Array(0x40), sidw = new Uint8Array(0x20), sidListeners = [];
  let cmp = 0, latch = 0, enable = 0;
  let pra = 0xFF, ddra = 0, ddrb = 0, pra2 = 0x97, ddra2 = 0x3F;
  // CIA 1's timer A, the only timer the game counts on
  const ta = { lat: 0xFFFF, cnt: 0xFFFF, cr: 0, mask: 0, icr: 0 };
  const bus = root.C64Sid ? root.C64Sid.engine().createBus('8580') : null;
  const input = { keys: new Set(), joy: 0x1F, joy1: 0x1F };

  // ---- the clock, and the frames as the beam draws them
  let t = 0, lastLine = -1, ciaAt = 0, irqsOn = false;
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
  // the timer moved on to the clock, as kit/c64/machine.js moves it
  function ciaCatchUp() {
    let left = t - ciaAt; ciaAt = t;
    if (!(ta.cr & 1) || left <= 0) return;
    while (left > 0) {
      if (ta.cnt >= left) { ta.cnt -= left; break; }
      left -= ta.cnt + 1; ta.cnt = ta.lat; ta.icr |= 1;
      if (ta.cr & 8) { ta.cr &= ~1; break; }
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
      return vic[r];
    }
    if (a >= 0xD400 && a < 0xD800) return bus ? bus.read(a & 0x1F, t, 0) : 0;
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
      ciaCatchUp();
      if (r === 4) return ta.cnt & 255;
      if (r === 5) return ta.cnt >> 8;
      if (r === 13) { const v = ta.icr | ((ta.icr & ta.mask) ? 0x80 : 0); ta.icr = 0; return v; }
      if (r === 14) return ta.cr;
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
      else {
        ciaCatchUp();
        if (r === 4) ta.lat = (ta.lat & 0xFF00) | v;
        else if (r === 5) { ta.lat = (ta.lat & 255) | (v << 8); if (!(ta.cr & 1)) ta.cnt = ta.lat; }
        else if (r === 13) { if (v & 0x80) ta.mask |= v & 0x1F; else ta.mask &= ~v & 0x1F; }
        else if (r === 14) { if (v & 0x10) ta.cnt = ta.lat; ta.cr = v & 0xEF; }
      }
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

  // ---- the saved games, kept by name ("@0:" left off); a load finds a name as the 1541's DOS
  // does (? any letter, * the rest), and an empty name, the tape's next file, gives the last saved
  const files = Object.assign({}, o.files || {});
  let lastSaved = Object.keys(files).pop() || null;
  function find(name) {
    if (!name) return lastSaved;
    if (files[name]) return name;
    const re = new RegExp('^' + name.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*.*$/, '.*').replace(/\?/g, '.') + '$');
    for (const k of Object.keys(files)) if (re.test(k)) return k;
    return null;
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
    load: name => { const f = find(name); return f ? files[f].slice() : null; },
    save: (name, bytes) => { files[name] = bytes.slice(); lastSaved = name; if (o.onSave) o.onSave(name, bytes); },
  };

  // ---- the program, and what its stretches cost
  const P = CM.makePort(M, io);
  // interrupts are off from the loader's jump until the game installs its own (the CLI at $737D)
  const install = P.INSTALL_RUNTIME_VECTORS;
  P.INSTALL_RUNTIME_VECTORS = function (r) { const v = install.call(this, r); irqsOn = true; return v; };
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
  // a routine called: what was called before it is paid for once it comes to a line's time
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
  // A byte the interrupt writes, read in the middle of a stretch: the clock first moves on by what
  // the stretch has cost so far, so that the interrupts due in that time have run
  function irqByte(a) {
    if (counting) { const c = callsCost(); if (c >= 1) advance(Math.round(c)); }
    return M[a];
  }

  // ---- the interrupts: the timer's underflow (or the video chip's, were it enabled) runs the
  // handler, again while a source is left waiting
  function pending() { return (ta.icr & ta.mask) || (latch & enable & 1); }
  function runIrqs() {
    for (let n = 0; n < 4 && pending(); n++) {
      const music = latch & 1;
      counting = false;
      try { P.IRQ_DISPATCH(); } finally { counting = true; }
      const c = music ? IRQ_MUSIC : IRQ_TIMER + IRQ_FILL * P.NI.fill;
      P.NI.fill = 0;
      t += c; roll(); ciaCatchUp();
    }
  }
  // the clock at which the next interrupt falls due, or Infinity
  function nextIrq() {
    if (!irqsOn) return Infinity;
    let at = Infinity;
    if ((ta.cr & 1) && (ta.mask & 1)) at = ciaAt + ta.cnt + 1;
    if (enable & 1 && cmp < LINES) {
      let L = Math.floor((lastLine + 1) / LINES) * LINES + cmp;
      if (L <= lastLine) L += LINES;
      at = Math.min(at, L * LINE);
    }
    return at;
  }
  // the clock's cycles by what took them: the main program's work, its waits, the interrupts
  const spent = { work: 0, wait: 0, irq: 0 };
  function advance(dt, wait) {
    spent[wait ? 'wait' : 'work'] += dt;
    let end = t + dt;
    for (;;) {
      ciaCatchUp();
      if (irqsOn && pending()) { const t0 = t; runIrqs(); end += t - t0; spent.irq += t - t0; continue; }
      const at = nextIrq();
      if (at > end) break;
      t = Math.max(t, at); roll();
    }
    t = Math.max(t, end); roll(); ciaCatchUp();
  }

  let it = null, lastCp = null;
  function step() {
    const r = it.next();
    if (r.done) throw new Error('the program ended');
    const y = r.value;
    if (y && y.cp !== undefined) {
      // a stretch takes the game some cycles, whatever the fit gave it: a loop of nothing the fit
      // knows still lets the clock, and with it the keys, move on
      const dt = lastCp === null ? 0 : Math.max(MIN_STRETCH, cost(lastCp, y.cp));
      lastCp = y.cp;
      advance(dt);
    } else {
      // a turn of a polling loop: what the stretch has cost so far, then on to the next line
      const c = callsCost();
      if (c >= 1) advance(Math.round(c));
      advance(LINE - t % LINE, true);
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

  const b64 = s => typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), c => c.charCodeAt(0));
  function restore(s, entry) {
    M.set(b64(s.ram)); colour.set(b64(s.colour).subarray(0, 0x400));
    M[0] = s.cpu.pdir; M[1] = s.cpu.pdata;
    for (let r = 0; r < 0x40; r++) vic[r] = s.vic[r];
    for (let r = 0; r < 0x20; r++) sidw[r] = s.sidw ? s.sidw[r] : 0;
    if (bus && s.sidBus) bus.load(s.sidBus);
    cmp = s.cmp; latch = s.latch; enable = s.enable;
    pra = s.pra; ddra = s.ddra; ddrb = s.ddrb; pra2 = s.pra2; ddra2 = s.ddra2;
    const c = s.cia[0];
    Object.assign(ta, { lat: c.lat[0], cnt: c.cnt[0], cr: c.cr[0], mask: c.mask, icr: c.icr });
    t = s.cpu.cycles; lastLine = s.lastLine; ciaAt = s.lastCycles; target = null;
    irqsOn = !(s.cpu.p & 4);
    frameIdx = Math.floor(t / FRAME);
    if (vm) vm.at(-1, [], 0);
    done.length = 0; begin();
    it = entry(P); lastCp = null; calls = Object.create(null); owed = 0;
    for (const k in P.N) P.N[k] = 0;
    P.NI.fill = 0;
  }
  restore(o.data, p => p.start());
  return {
    M, colour, vic, sidw, input, KEY, P, files, spent,
    get t() { return t; }, get frame() { return frameIdx; }, get target() { return target; },
    get shown() { return target === null ? frameIdx - 1 : Math.floor(target / FRAME) - 1; },
    runFrame, runUntil, restore, lastFrame: () => (target === null ? done[done.length - 1] : frameAt(Math.floor(target / FRAME) - 1)),
    onSid: f => sidListeners.push(f),
  };
}
root.CMPage = { create, LINE, LINES, FRAME, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
