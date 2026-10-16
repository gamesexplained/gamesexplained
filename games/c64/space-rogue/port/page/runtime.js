// The Play page's machine: the port (src/) run as the C64 would run the game, on chips of its own.
// It runs in the browser and in node (test/t-page.js), and refers to nothing but SRPort, the
// port's groups and the disk it is given.
//
//   const rt = SRPage.create({ disk, cost, onSave, onQuestion })
//     disk     { files: { NAME: Uint8Array }, sectors: { 't,s': Uint8Array } }: what
//              scripts/pack-data.js keeps, the game's data with its program left out
//     cost     the main program's costs, fitted on the game (scripts/fit-cost.js, cost.json): { seg:
//              { 'from>to': cycles }, call: { routine: cycles } }
//     onSave   optional: (name, bytes) when the game saves (CTRL-S: SAVED)
//     onQuestion  optional: ({ page, paragraph, sentence, word, answer }) when the intro asks the
//              manual's question before an old game, with the word it takes (its first four
//              letters are enough)
//   rt.runFrame()      one frame of time: the program runs until the clock reaches the frame's end;
//                      returns the frame just finished, for C64.renderFrame
//   rt.input           { keys: Set of key names (kit/c64/machine.js's), joy: port 2, active low }
//   rt.onSid(f)        f(register, value, cycle) for every write to the SID
//   rt.program         'title', 'intro', 'main' or 'ending'
//   rt.target          the clock at the end of the frame runFrame last ran to (null before the first)
//   rt.restore(machine, entry)   the machine of a moment saved by the tests (kit/c64/machine.js's
//                      state: its memory, chips and clock), and the main program started at
//                      entry(P), a generator (test/t-page.js)
//
// The clock. A PAL machine: 312 lines of 63 cycles. Each stretch of the program moves the clock on
// by its cost, and the raster interrupts that fall due on the way run on their lines, their own
// time added; a turn of a polling loop moves it to the next line. The title, the intro and the
// ending count their own cycles ({ cycles } with each yield); the main program's checkpoints
// carry none. A stretch of the main program costs what it cost the game: the cycles of the
// stretch itself (seg, from the checkpoint before), and each routine the port called in it its
// own cycles (call), the routines it calls not included (scripts/fit-cost.js, on 26,600 passes
// of flight, fights and docking timed on the game). test/t-page.js holds the page's passes in 20
// seconds to the game's from each moment of flight and of a fight.
//
// The programs. Each is a port of its own on the same memory and chips (src/core.js): the title,
// the intro and the ending (src/g-screens.js), and the main program, SR with everything it loads.
// A P.Goto thrown by one starts the next, as the game's JMP does: $2000 the title, $6800 the
// intro after the title and the ending after SR, $0400 SR with the carry set for a saved game,
// $E972 the death screen.
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
// The interrupt's own cycles: the screens' (the keyboard scanned by the program itself, the sound)
// and the main program's (the KERNAL's entry, the keyboard into the buffer, the sound)
// (the main program's measured: 620 cycles in flight, 550 at a base)
const IRQ_COST = 600;

function create(o) {
  const SR = root.SRPort, PROGRAMS = root.SRPrograms;
  const M = new Uint8Array(new ArrayBuffer(0x10000));
  const colour = new Uint8Array(0x400);
  // ---- the machine as BOOT leaves it when it jumps to TITLE: the KERNAL's vectors, its last
  // load's zero page, the screen cleared, the video chip's start-up registers (TITLE itself is put
  // in below, with the disk)
  M[0] = 0x2F; M[1] = 0x37;
  M[0x90] = 0x40; M[0xB7] = 5; M[0xB8] = 1; M[0xBA] = 8; M[0xC4] = 0x20; M[0xAF] = 0x30;
  M.set([0x31, 0xEA, 0x66, 0xFE, 0x47, 0xFE], 0x0314);
  M.fill(0x20, 0x0400, 0x07E8);
  colour.fill(0x0E);
  const vic = new Uint8Array(0x40);
  vic[0x11] = 0x1B; vic[0x16] = 0xC8; vic[0x18] = 0x15; vic[0x20] = 0x0E; vic[0x21] = 0x06;
  let cmp = 0, latch = 0, enable = 0;
  let pra = 0xFF, ddra = 0, ddrb = 0, pra2 = 0x97, ddra2 = 0x3F;
  const sidw = new Uint8Array(0x20), sidListeners = [];
  const input = { keys: new Set(), joy: 0x1F, joy1: 0x1F };

  // ---- the clock, and the frames as the beam draws them
  let t = 0, lastTrigger = -1;
  const lineNow = () => Math.floor(t / LINE);
  // what C64.renderFrame keeps from frame to frame (F.keep), and the memory it reads as each frame
  // began with the changes after (site/lib/c64.js, videoMemory)
  const keep = {};
  const vm = root.C64 ? root.C64.videoMemory(M, colour, { keep }) : null;
  let frameIdx = 0, cur = null;
  const done = [];
  const bank = () => 3 - ((pra2 | ~ddra2) & 3);
  function begin() {
    const f = vm ? vm.begin() : { mem: M.slice(), colour: colour.slice() };
    cur = { frame: frameIdx, vic: Array.from(vic.subarray(0, 47)), cia2: [pra2, ddra2], writes: [], mem: f.mem, colourMem: f.colour, keep };
  }
  // the frames the clock has finished: each kept for the page to draw, and the next begun
  function rollFrames() {
    if (vm) vm.at(t, cur.writes, bank());
    while (t >= (frameIdx + 1) * FRAME) {
      done.push(cur); if (done.length > 2) done.shift();
      frameIdx++;
      begin();
    }
  }
  begin();

  // ---- the chips
  function ioRead(a) {
    if (a >= 0xD000 && a < 0xD400) {
      const r = a & 0x3F, ln = lineNow() % LINES;
      if (r === 0x12) return ln & 255;
      if (r === 0x11) return (vic[0x11] & 0x7F) | ((ln >> 8) << 7);
      if (r === 0x19) return latch | 0x70 | ((latch & enable) ? 0x80 : 0);
      if (r === 0x1A) return enable | 0xF0;
      return vic[r];
    }
    if (a >= 0xD400 && a < 0xD800) return 0;
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
      else if (r === 0x19) latch &= ~v & 0x0F;
      else if (r === 0x1A) enable = v & 0x0F;
      else vic[r] = v;
      // bitmap_mode's hang (Discoveries): a compare past the frame's last line is never met, and
      // the game would stop. The page moves it back into the frame, as the runner the port is
      // checked against does
      if ((r === 0x11 || r === 0x12 || r === 0x1A) && cmp >= LINES && (enable & 1)) cmp &= 0xFF;
      return;
    }
    if (a >= 0xD400 && a < 0xD800) { sidw[a & 0x1F] = v; for (const f of sidListeners) f(a & 0x1F, v, t); return; }
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

  // ---- the disk, as the 1541's DOS finds a name
  const files = Object.assign({}, o.disk.files), sectors = o.disk.sectors;
  // BOOT's last act: TITLE at $2000, and a jump to it
  M.set(files.TITLE.subarray(2), 0x2000);
  const bare = name => name.replace(/^@?\d?:/, '');
  function find(name) {
    const n = bare(name);
    if (files[n]) return n;
    const re = new RegExp('^' + n.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*.*$/, '.*').replace(/\?/g, '.') + '$');
    for (const k of Object.keys(files)) if (re.test(k)) return k;
    return null;
  }
  let target = null;
  const b64 = s => typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const io = {
    read: ioRead, write: ioWrite,
    vicRead: r => ioRead(0xD000 | (r & 0x3F)), vicWrite: (r, v) => ioWrite(0xD000 | (r & 0x3F), v),
    sidRead: r => ioRead(0xD400 | (r & 0x1F)), sidWrite: (r, v) => ioWrite(0xD400 | (r & 0x1F), v),
    colourRead: i => colour[i & 0x3FF], colourWrite: (i, v) => ioWrite(0xD800 | (i & 0x3FF), v),
    ciaRead: r => ioRead(0xDC00 | (r & 0x0F)), ciaWrite: (r, v) => ioWrite(0xDC00 | (r & 0x0F), v),
    cia2Read: r => ioRead(0xDD00 | (r & 0x0F)), cia2Write: (r, v) => ioWrite(0xDD00 | (r & 0x0F), v),
    irqByte: a => irqByte(a),
    load: name => { const f = find(name); return f ? files[f].slice() : null; },
    block: (tr, s) => sectors[tr + ',' + s] || null,
    save: (name, bytes) => { files[bare(name)] = bytes.slice(); if (o.onSave) o.onSave(bare(name), bytes); },
  };

  // ---- the programs
  const ports = {};
  const port = name => ports[name] || (ports[name] = name === 'main' ? counted(SR.makePort(M, io, {})) : name === 'intro' ? asking(SR.makePort(M, io, { program: name })) : SR.makePort(M, io, { program: name }));
  // the manual's question: find_question leaves the page, paragraph, sentence and word at $2C-$2F
  // and the word's address at $2A/$2B
  function asking(P) {
    const f = P.find_question;
    P.find_question = function (r) {
      const out = f.call(P, r);
      if (o.onQuestion) {
        let answer = '';
        for (let a = M[0x2A] | M[0x2B] << 8; M[a] && answer.length < 20; a++) answer += String.fromCharCode(M[a] & 0x7F);
        o.onQuestion({ page: M[0x2C], paragraph: M[0x2D], sentence: M[0x2E], word: M[0x2F], answer });
      }
      return out;
    };
    return P;
  }
  // the main program's routines that have a cost, counted when they are called outside the interrupt
  const model = o.cost || { seg: {}, call: {} };
  let calls = Object.create(null), counting = true;
  function counted(P) {
    const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
    for (const name of Object.keys(model.call)) {
      const f = P[name];
      if (typeof f !== 'function') continue;
      P[name] = f instanceof GENERATOR
        ? function* (...a) { if (counting) calls[name] = (calls[name] || 0) + 1; return yield* f.apply(this, a); }
        : function (...a) { if (counting) calls[name] = (calls[name] || 0) + 1; return f.apply(this, a); };
    }
    return P;
  }
  // the routines called since the clock last moved, at their cost
  function callsCost() {
    let c = 0;
    for (const k in calls) c += model.call[k] * calls[k];
    calls = Object.create(null);
    return c;
  }
  function cost(from, to) {
    return Math.round((model.seg[from.toString(16) + '>' + to.toString(16)] || 0) + callsCost());
  }
  // A byte the interrupt writes, read in the middle of a stretch of the main program: the clock
  // first moves on by what the stretch has cost so far, so that the interrupts due in that time
  // have run. On the C64 the frame count draw_frame reads at its end includes the frames the
  // drawing took, and the main loop skips the drawing of the passes after a slow one by it
  // (frame_skip3); read at the stretch's start, it would never skip, and a busy view would run at
  // half the game's passes.
  function irqByte(a) {
    if (program === 'main' && counting) { const c = callsCost(); if (c >= 1) advance(Math.round(c)); }
    return M[a];
  }
  let program = null, P = null, it = null, lastCp = null;
  function start(name, entry) {
    program = name; P = port(name); it = entry(P); lastCp = null; calls = Object.create(null);
  }
  function goto(g) {
    const from = program;
    if (g.to === 0x2000) start('title', p => p.title_start());
    else if (g.to === 0x6800) {
      if (from === 'title') start('intro', p => p.intro_start());
      else start('ending', p => p.ending_start());
    }
    else if (g.to === 0x0400) start('main', p => p.sr_start(g.r));
    else if (g.to === 0xE972) start('main', p => p.game_over());
    else throw new Error('the port went to $' + g.to.toString(16) + ' from ' + from);
  }
  start('title', p => p.title_start());
  function restore(s, entry) {
    M.set(b64(s.ram)); colour.set(b64(s.colour).subarray(0, 0x400));
    M[0] = s.cpu.pdir; M[1] = s.cpu.pdata;
    for (let r = 0; r < 0x40; r++) vic[r] = s.vic[r];
    cmp = s.cmp; latch = s.latch; enable = s.enable;
    pra = s.pra; ddra = s.ddra; ddrb = s.ddrb; pra2 = s.pra2; ddra2 = s.ddra2;
    for (let r = 0; r < 0x20; r++) sidw[r] = s.sidw[r];
    t = s.cpu.cycles; frameIdx = Math.floor(t / FRAME); lastTrigger = Math.floor(t / LINE); target = null;
    if (vm) vm.at(-1, [], 0);
    done.length = 0; begin();
    program = 'main'; P = port('main'); it = entry(P); lastCp = null; calls = Object.create(null);
  }

  // ---- the interrupts: through the KERNAL's entry and $0314 while the KERNAL is banked in, through
  // the processor's own vector at $FFFE otherwise
  function nextTrigger() {
    if (!(enable & 1) || cmp >= LINES) return Infinity;
    const from = Math.max(lineNow() + 1, lastTrigger + 1);
    let L = Math.floor(from / LINES) * LINES + cmp;
    if (L < from) L += LINES;
    return L;
  }
  function runIrq(L) {
    lastTrigger = L;
    latch |= 1;
    const kernal = (M[1] | ~M[0]) & 2;
    const name = kernal ? 'irq_body' : program === 'main' ? 'irq_entry' : 'irq';
    counting = false;
    try { P[name](); } finally { counting = true; }
    const c = IRQ_COST;
    t += c;
    rollFrames();
    return c;
  }
  function advance(dt) {
    let end = t + dt;
    for (;;) {
      const L = nextTrigger();
      if (L * LINE > end) break;
      t = Math.max(t, L * LINE); rollFrames();
      end += runIrq(L);
    }
    t = Math.max(t, end); rollFrames();
  }
  function step() {
    let r;
    try { r = it.next(); } catch (e) { if (e instanceof SR.Goto) { goto(e); return; } throw e; }
    if (r.done) throw new Error('the ' + program + ' program ended');
    const y = r.value;
    if (y && y.cp !== undefined) {
      let dt = y.cycles;
      if (dt === undefined) dt = lastCp === null ? 0 : cost(lastCp, y.cp);
      else calls = Object.create(null);
      lastCp = y.cp;
      advance(dt);
    } else if (y && y.cycles !== undefined) advance(y.cycles);
    else advance(LINE - t % LINE);                    // a turn of a polling loop: to the next line
  }
  function runUntil(until) {
    let guard = 0;
    while (t < until) {
      step();
      if (++guard > 2e6) throw new Error('runUntil: no progress in the ' + program + ' program');
    }
  }

  function runFrame() {
    if (target === null) target = t;
    target += FRAME;
    if (t < target) runUntil(target);
    return done[done.length - 1];
  }
  return {
    M, colour, vic, sidw, input, KEY,
    get t() { return t; }, get frame() { return frameIdx; }, get program() { return program; }, get P() { return P; },
    get target() { return target; },
    runFrame, runUntil, restore, lastFrame: () => done[done.length - 1],
    onSid: f => sidListeners.push(f),
    files,
  };
}
root.SRPage = { create, LINE, LINES, FRAME, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
