// The Play page's machine: the port (src/) run as the 128 would run the game, on chips of its own.
// It runs in the browser and in node (test/t-page.js, ../test_play.js), and refers to nothing but
// WTPort and the port's groups.
//
//   const rt = WTPage.create({ data, cost })
//     data     the machine as the loader hands over ($8521), in the form kit/spectrum/machine.js
//              saves a 128: the eight banks of 16 KB, the paging, the AY, the border and the
//              clock; scripts/pack-data.js makes it from the listings, every instruction blanked
//              but those the game also reads as data; and rom, { from, bytes }, ROM 0's bytes the
//              game reads (../rom-excerpt.json)
//     cost     the pacing (scripts/fit-cost.js, cost.json): { seg: { 'from>to': T-states }, call:
//              { routine: T-states, '#count': T-states }, irq, copy }: each stretch's own, each
//              routine's and each count of the work inside them (P.N, src/core.js), fitted on the
//              game, and the interrupt's and the view's copy's, measured
//   rt.runFrame()      one frame of time: the program runs until the clock reaches the frame's end;
//                      returns the frame that ends there, { frame, screen (the 6,912 bytes shown),
//                      border, flash }
//   rt.shown           that frame's number: the clock can be ahead of it
//   rt.input           { keys: Set of key names (kit/spectrum/machine.js's), joy: the Kempston
//                      interface's bits (right, left, down, up and fire in bits 0 to 4, set when
//                      held) }
//   rt.onAY(f)         f(register, value, T-state) for each write to the AY and each change of the
//                      beeper (register 16, the value bit 4 of the byte written to port $FE)
//   rt.ay              the AY's registers as last written
//   rt.restore(state, entry)   a machine saved by the tests (kit/spectrum/machine.js's save()),
//                      and the program started at entry(P), a generator (test/t-page.js)
//
// The clock. A 128: 311 lines of 228 T-states, the interrupt at each frame's start. Each stretch of
// the program moves the clock on by its cost, and the interrupts that fall due on the way run
// there, their own time added; a turn of a polling loop moves it to the next line; a HALT to the
// next frame. A stretch costs what it cost the game: its own T-states (seg, by the checkpoints it
// runs between), each routine the port called in it at its own (call), and each count of the
// work inside them (P.N: bytes copied, a window's rows, a sprite's rows and shifts) at its own,
// fitted on the game's passes (scripts/fit-cost.js). The clock moves as the routines are called,
// not once at the stretch's end. The view's copy ($963B) runs with the interrupts off: it takes
// longer than a frame, so the interrupt that falls due meanwhile is lost, as on the 128 (the
// game's clock loses about one in five), and the copy plays the sound driver's pass itself at its
// end.
(function (root) {
'use strict';
const LINE = 228, LINES = 311, FRAME = LINE * LINES;
// where the beam reaches the paper's first line, the T-state at which a frame's picture is taken
const PAPER = 63 * LINE;
// the keys by half-row and bit (half-row x 8 + bit), as kit/spectrum/machine.js names them
const KEY = {
  CAPS: 0x00, Z: 0x01, X: 0x02, C: 0x03, V: 0x04,
  A: 0x08, S: 0x09, D: 0x0A, F: 0x0B, G: 0x0C,
  Q: 0x10, W: 0x11, E: 0x12, R: 0x13, T: 0x14,
  '1': 0x18, '2': 0x19, '3': 0x1A, '4': 0x1B, '5': 0x1C,
  '0': 0x20, '9': 0x21, '8': 0x22, '7': 0x23, '6': 0x24,
  P: 0x28, O: 0x29, I: 0x2A, U: 0x2B, Y: 0x2C,
  ENTER: 0x30, L: 0x31, K: 0x32, J: 0x33, H: 0x34,
  SPACE: 0x38, SYMBOL: 0x39, M: 0x3A, N: 0x3B, B: 0x3C,
};
// the bits each AY register keeps (kit/spectrum/machine.js)
const AY_MASK = [0xFF, 0x0F, 0xFF, 0x0F, 0xFF, 0x0F, 0x1F, 0xFF, 0x1F, 0x1F, 0x1F, 0xFF, 0xFF, 0x0F, 0xFF, 0xFF];
// the click ($C8C5) toggles the beeper once a turn of its loop: 686 T-states apart
const CLICK_TURN = 686;
// the frames kept ahead of the one shown, and the least a stretch between two checkpoints costs
const AHEAD = 200, MIN_STRETCH = 10;
const b64 = s => typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), c => c.charCodeAt(0));

function create(o) {
  const W = root.WTPort;
  const M = new Uint8Array(new ArrayBuffer(0x10000));
  const ay = { sel: 0, regs: new Uint8Array(16) }, ayListeners = [];
  const input = { keys: new Set(), joy: 0 };
  let mem = null, paging = 0, border = 7, ear = 0, beepAt = -Infinity;

  // ---- the clock, and the frames as the beam shows them
  let t = 0, nextInt = 1, frameIdx = 0, taken = false, cur = null, target = null;
  let irqsOn = true, di = false;
  const done = [];
  const frameNow = () => {
    const s = paging & 8 ? mem.bank(7) : M.subarray(0x4000, 0x8000);
    return { frame: frameIdx, screen: s.slice(0, 6912), border, flash: (frameIdx >> 4) & 1 };
  };
  // the frames the clock has finished, each with the picture as the beam reached the paper
  function roll() {
    for (;;) {
      if (!taken && t >= frameIdx * FRAME + PAPER) { cur = frameNow(); taken = true; }
      if (t < (frameIdx + 1) * FRAME) break;
      if (!taken) cur = frameNow();
      done.push(cur); if (done.length > AHEAD) done.shift();
      frameIdx++; taken = false;
    }
  }

  // ---- the chips: the keyboard, the Kempston interface, the paging, the AY, the border and beeper
  const io = {
    in(port) {
      if ((port & 0x20) === 0 && (port & 1)) return input.joy & 0x1F;
      if ((port & 0xC002) === 0xC000) return ay.sel < 14 ? ay.regs[ay.sel] : 0xFF;
      if (port & 1) return 0xFF;
      const high = port >> 8;
      let v = 0x1F;
      for (const name of input.keys) {
        const k = KEY[name];
        if (k !== undefined && !(high & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
      }
      return 0xA0 | (ear << 6) | v;
    },
    out(port, v) {
      v &= 255;
      if (!(port & 0x8002) && !(paging & 0x20)) { paging = v; mem.page(v & 7); }
      if ((port & 0xC002) === 0xC000) ay.sel = v & 15;
      else if ((port & 0xC002) === 0x8000) {
        const r = ay.sel;
        ay.regs[r] = v & AY_MASK[r];
        if (r < 14) for (const f of ayListeners) f(r, ay.regs[r], t);
      }
      if (port & 1) return;
      border = v & 7;
      const e = (v >> 4) & 1;
      if (e !== ear) {
        // the click's toggles come all at once from the port: each a turn of its loop after the last
        const at = Math.max(t, beepAt + CLICK_TURN);
        beepAt = at;
        for (const f of ayListeners) f(16, e, at);
      }
      ear = e;
    },
    irqByte: a => irqByte(a),
  };

  // ---- the program, and what its stretches cost
  const P = W.makePort(M, io, {});
  // ROM 0's bytes the game reads at $0000, past the end of area 14's grid and of a frame's mask
  const ROM = o.data.rom ? { from: o.data.rom.from, bytes: b64(o.data.rom.bytes) } : null;
  const model = o.cost || { seg: {}, call: {} };
  const IRQ = model.irq || 0, COPY = model.copy || 0;
  let calls = Object.create(null), counting = true, owed = 0;
  const GENERATOR = Object.getPrototypeOf(function* () {}).constructor;
  for (const name of Object.keys(model.call)) {
    const f = P[name];
    if (typeof f !== 'function') continue;
    const c = model.call[name];
    P[name] = f instanceof GENERATOR
      ? function* (...a) { if (counting) called(name, c); return yield* f.apply(this, a); }
      : function (...a) { if (counting) called(name, c); return f.apply(this, a); };
  }
  // a routine called: what was called before it is paid for once it comes to a line's time
  function called(name, c) {
    calls[name] = (calls[name] || 0) + 1;
    owed += c;
    if (owed >= LINE) pay();
  }
  // the routines called and the work counted since the clock last moved, at their cost
  function callsCost() {
    let c = owed;
    owed = 0; calls = Object.create(null);
    for (const k in P.N) { if (P.N[k]) c += (model.call['#' + k] || 0) * P.N[k]; P.N[k] = 0; }
    return c;
  }
  function pay() { const c = callsCost(); if (c >= 1) advance(Math.round(c)); }
  function cost(from, to) { return Math.round((model.seg[from.toString(16) + '>' + to.toString(16)] || 0) + callsCost()); }
  // A byte the interrupt writes, read in the middle of a stretch: the clock first moves on by what
  // the stretch has cost so far, so that the interrupts due in that time have run
  function irqByte(a) { if (counting) pay(); return M[a]; }
  // the view's copy: what came before it paid, then its own time with the interrupts off (one
  // falling due meanwhile is lost), then the copy itself, whose sound pass comes at its end
  const copy = P.show_view;
  P.show_view = function (r) {
    if (counting) { pay(); di = true; try { advance(COPY); } finally { di = false; } }
    return copy.call(this, r);
  };

  // ---- the interrupt: at each frame's start, the game's handler ($BEBE) unless the interrupts are
  // off; its own time added
  function advance(dt) {
    let end = t + dt;
    while (nextInt * FRAME <= end) {
      t = Math.max(t, nextInt * FRAME); nextInt++;
      roll();
      if (irqsOn && !di) {
        counting = false;
        try { P.interrupt({}); } finally { counting = true; }
        t += IRQ; end += IRQ;
      }
    }
    t = Math.max(t, end); roll();
  }

  let it = null, lastCp = null;
  function step() {
    const r = it.next();
    if (r.done) throw new Error('the program ended');
    const y = r.value;
    if (y && y.cp !== undefined) {
      // a stretch takes the game some T-states, whatever the fit gave it: a loop of nothing the
      // fit knows still lets the clock, and with it the keys, move on
      const dt = lastCp === null ? 0 : Math.max(MIN_STRETCH, cost(lastCp, y.cp));
      lastCp = y.cp;
      advance(dt);
    } else if (y && y.halt) {
      // a HALT: what came before it, then the next interrupt; the stretch after starts at its exit
      advance(cost(lastCp === null ? 0 : lastCp, y.at));
      lastCp = y.at;
      advance(nextInt * FRAME - t);
    } else if (y && y.tstates !== undefined) {
      pay(); advance(y.tstates);
    } else {
      // a turn of a polling loop: what the stretch has cost so far, then on to the next line
      pay(); advance(LINE - t % LINE);
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

  function restore(s, entry) {
    const banks = s.banks.map(b64);
    paging = s.paging; border = s.border & 7; ear = s.ear & 1; beepAt = -Infinity;
    const n = paging & 7;
    M.fill(0); M.set(banks[5], 0x4000); M.set(banks[2], 0x8000); M.set(banks[n], 0xC000);
    if (ROM) M.set(ROM.bytes, ROM.from);
    mem = new W.Banks(M, banks, n);
    P.mem = mem;
    ay.sel = s.ay.sel; ay.regs.set(s.ay.regs);
    t = s.cpu ? s.cpu.tstates : s.tstates || 0; target = null; di = false;
    frameIdx = Math.floor(t / FRAME); nextInt = frameIdx + 1; taken = t >= frameIdx * FRAME + PAPER;
    if (taken) cur = frameNow();
    done.length = 0;
    it = entry(P); lastCp = null; calls = Object.create(null); owed = 0;
    for (const k in P.N) P.N[k] = 0;
  }
  restore(o.data, p => p.program(true));
  return {
    M, P, input, KEY, ay: ay.regs, get mem() { return mem; },
    get t() { return t; }, get frame() { return frameIdx; }, get target() { return target; },
    get shown() { return target === null ? frameIdx - 1 : Math.floor(target / FRAME) - 1; },
    get paging() { return paging; }, get border() { return border; },
    runFrame, runUntil, restore, lastFrame: () => (target === null ? done[done.length - 1] : frameAt(Math.floor(target / FRAME) - 1)),
    onAY: f => ayListeners.push(f),
  };
}
root.WTPage = { create, LINE, LINES, FRAME, KEY };
})(typeof window !== 'undefined' ? window : globalThis);
