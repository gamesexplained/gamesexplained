// The port run as the machine would run it, for the page: a virtual PAL clock that the port's
// work moves on (each stretch between two yields costs what the game's code takes for it, from
// the fitted costs in COST), the KERNAL's 60 Hz interrupt on that clock, the chips the port
// reads and writes, and a jump to any level.
//
// const rt = ChillerRuntime.create(ram, { cost });   // ram: the listing's 64 KB (copied)
// rt.runTo(cycles)  run the port until the clock reaches cycles
// rt.frame, rt.cycles, rt.chips (vic, colour, sidw, keys, joy), rt.P, rt.onSid(fn(r, v, t))
// rt.jump(n)        a fresh game taken to level n (0-9) as finishing each level before it does;
//                   the caller runs it fast (rt.busy is true until the level has started)
// rt.cheats         { energy, ghosts } switched on and off by the page; rt.skip() ends the level
(function (root) {
'use strict';
const LINE = 63, LINES = 312, FRAME = LINE * LINES, TIMER = 0x4025 + 1;
const K = () => root.ChillerKernal;
// the video chip as the KERNAL leaves it at start-up, the character set at $1000
const VIC0 = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0x1B,0x37,0,0,0,0x08,0,0x15,0x0F,0,0,0,0,0,0,
  0x0E,0x06,0x01,0x02,0x03,0x04,0x00,0x01,0x02,0x03,0x04,0x05,0x06,0x07];

// The chips the game uses: the video chip's registers (the raster from the clock, the collision
// registers latched as the lines are drawn and cleared by a read), colour RAM, the SID's
// registers (each write passed to onSid with the time), CIA 1's keyboard and joystick.
function Chips(rt) {
  const c = {
    vic: new Uint8Array(0x40), colour: new Uint8Array(0x400), sidw: new Uint8Array(0x20),
    pra: 0x7F, ddra: 0xFF, keys: new Set(), joy: 0x1F, coll: [0, 0], cmp: 0, onSid: null,
    get line() { return Math.floor(rt.cycles / LINE) % LINES; },
    read(a) {
      if (a >= 0xD000 && a < 0xD400) {
        const r = a & 0x3F;
        if (r === 0x12) return c.line & 255;
        if (r === 0x11) return (c.vic[0x11] & 0x7F) | ((c.line >> 8) << 7);
        if (r === 0x1E || r === 0x1F) { const v = c.coll[r - 0x1E]; c.coll[r - 0x1E] = 0; return v; }
        if (r === 0x19) return 0x70;
        if (r === 0x1A) return 0xF0;
        return c.vic[r];
      }
      if (a >= 0xD400 && a < 0xD800) return 0;
      if (a >= 0xD800 && a < 0xDC00) return c.colour[a - 0xD800] | 0xF0;
      if (a >= 0xDC00 && a < 0xDD00) {
        const r = a & 15;
        if (r === 0) return (c.ddra ? (c.pra | ~c.ddra) & 0xFF : 0xE0 | c.joy) & (0xE0 | c.joy);
        if (r === 1) {
          let v = 0xFF;
          const rows = c.ddra ? c.pra & c.ddra : 0xFF;
          for (const k of c.keys) if (!(rows & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
          return v & 0xFF;
        }
        if (r === 2) return c.ddra;
        return 0;
      }
      return 0;
    },
    write(a, v) {
      v &= 255;
      if (a >= 0xD000 && a < 0xD400) { c.vic[a & 0x3F] = v; return; }
      if (a >= 0xD400 && a < 0xD800) { c.sidw[a & 0x1F] = v; if (c.onSid) c.onSid(a & 0x1F, v, rt.cycles); return; }
      if (a >= 0xD800 && a < 0xDC00) { c.colour[a - 0xD800] = v & 15; return; }
      if (a >= 0xDC00 && a < 0xDD00) { const r = a & 15; if (r === 0) c.pra = v; else if (r === 2) c.ddra = v; }
    },
  };
  c.io = {
    read: a => c.read(a & 0xFFFF), write: (a, v) => c.write(a & 0xFFFF, v),
    vicRead: r => c.read(0xD000 | (r & 0x3F)), vicWrite: (r, v) => c.write(0xD000 | (r & 0x3F), v),
    sidRead: r => 0, sidWrite: (r, v) => c.write(0xD400 | (r & 0x1F), v),
    colourRead: i => c.colour[i & 0x3FF], colourWrite: (i, v) => { c.colour[i & 0x3FF] = v & 15; },
    ciaRead: r => c.read(0xDC00 | (r & 0x0F)), ciaWrite: (r, v) => c.write(0xDC00 | (r & 0x0F), v),
    cia2Read: r => 0, cia2Write: (r, v) => {},
  };
  c.vic.set(VIC0);
  return c;
}

function create(image, opts = {}) {
  const M = new Uint8Array(image);
  const rt = { cycles: 0, frame: 0, busy: false, level: null };
  const chips = rt.chips = Chips(rt);
  const P = rt.P = root.ChillerPort.makePort(M, chips.io);
  K().boot(M);
  // the routines' calls since the last yield, for the cost of the stretch
  const COST = opts.cost || {};
  let spent = 0;
  const GENF = Object.getPrototypeOf(function* () {}).constructor;
  for (const name of Object.keys(P)) {
    const f = P[name], w = COST[name] || 0;
    if (typeof f !== 'function' || !w) continue;
    P[name] = f instanceof GENF ? function* (...a) { spent += w; return yield* f.apply(this, a); }
      : function (...a) { spent += w; return f.apply(this, a); };
  }
  const base = COST['@yield'] || 30, IRQ = COST['@irq'] || 0;
  let nextIrq = TIMER, lastLine = 0, due = false;
  // The loader hands over with interrupts off; the game first allows them in music_start (its
  // SEI ... CLI round the vector, which it leaves at music_irq), and an underflow of the timer
  // while they were off is taken then.
  rt.irqOn = false;
  function irq() {
    if ((M[0x0314] | (M[0x0315] << 8)) === 0x60F5) P.music_irq({ a: 0, x: 0, y: 0, c: 0 });   // the KERNAL's entry leaves A = 0
    else K().irqTail(P.k);
  }
  // the clock to t: the lines drawn on the way latch the collisions, the timer's interrupts run;
  // for the port's work (work true) an interrupt's own cycles put the end later, as on the C64
  function advance(t, work) {
    while (rt.cycles < t) {
      const step = Math.min(t, nextIrq, (lastLine + 1) * LINE);
      rt.cycles = step;
      while ((lastLine + 1) * LINE <= rt.cycles) {
        lastLine++;
        const l = lastLine % LINES;
        if (l === 0) rt.frame++;
        const hit = K().collideLine(M, chips.vic, chips.colour, l);
        chips.coll[0] |= hit[0]; chips.coll[1] |= hit[1];
      }
      if (rt.cycles >= nextIrq) { nextIrq += TIMER; due = true; }
      if (!rt.irqOn && M[0x0314] === 0xF5 && M[0x0315] === 0x60) rt.irqOn = true;
      if (due && rt.irqOn) { due = false; irq(); if (work) t += IRQ; }
    }
  }
  // The page's cheats, each through the game's own variables and routines. energy: energy_down
  // takes nothing off the bar, so the energy never runs out (the only way the game ends). ghosts:
  // a ghost's touch (sprite_touch, girl_touch) adds no poison; a toadstool still does. skip(): at
  // the next pass, crosses_left with one cross to go, as taking the last cross does.
  rt.cheats = { energy: false, ghosts: false };
  let touching = 0, skip = false;
  const down = P.energy_down, padd = P.poison_add;
  P.energy_down = function (r) { return rt.cheats.energy ? P.find_bar_end(r) : down.call(this, r); };
  P.poison_add = function* (r) { if (rt.cheats.ghosts && touching) return r; return yield* padd.call(this, r); };
  for (const name of ['sprite_touch', 'girl_touch']) {
    const f = P[name];
    P[name] = function* (r) { touching++; try { return yield* f.call(this, r); } finally { touching--; } };
  }
  rt.skip = () => { skip = true; };
  // The crosses of the level being left, taken as a player takes them (a space, $A0, in each cell
  // listed at +$5E of its settings), so that the copy next_screen stores for the way home has none
  // left, as it would after play.
  function takeCrosses() {
    const rec = M[0x11] | (M[0x12] << 8);
    for (let k = 0; k < 10; k++) {
      const a = M[rec + 0x5E + 2 * k] | (M[rec + 0x5F + 2 * k] << 8);
      if (a >= 0x0400 && a < 0x07E8) M[a] = 0xA0;
    }
  }
  let jumpTo = null;
  function* driver() {
    for (;;) {
      const it = P.program('game_entry');
      for (;;) {
        const y = it.next().value;
        if (y && y.cp === 0xCA00 && jumpTo !== null) {
          const n = jumpTo; jumpTo = null;
          for (let i = 0; i < n; i++) {
            takeCrosses();
            const x = M[(M[0x11] | (M[0x12] << 8)) + 0x73];
            yield* P.next_screen({ a: 0, x: x === 0x12 ? 0xFE : x, y: 0 });
          }
          rt.busy = false;
        }
        if (y && y.cp === 0xCA00 && skip) {
          skip = false;
          takeCrosses();
          M[0x5A15] = 1;
          yield* P.crosses_left({ a: 0, x: 0, y: 0 });
        }
        yield y;
      }
    }
  }
  const it = driver();
  // one yield of the port: its stretch's cost, then the time it waits
  function step() {
    spent = 0;
    const y = it.next().value;
    advance(rt.cycles + base + spent, true);
    if (y && y.wait !== undefined) {
      const now = Math.floor(rt.cycles / LINE) % LINES;
      advance(rt.cycles + ((y.wait - now + LINES) % LINES) * LINE + 1);
    } else if (y && y.cycles !== undefined) advance(rt.cycles + y.cycles, true);
    else if (!y || y.cp === undefined) advance(rt.cycles + LINE);
  }
  rt.runTo = function (t) { while (rt.cycles < t) step(); };
  rt.onSid = fn => { chips.onSid = fn; };
  rt.jump = function (n) { jumpTo = n; rt.busy = n > 0; };
  rt.M = M; rt.FRAME = FRAME;
  return rt;
}
root.ChillerRuntime = { create, FRAME, LINE, LINES };
})(typeof window !== 'undefined' ? window : globalThis);
