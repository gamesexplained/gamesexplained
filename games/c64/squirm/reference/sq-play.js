/* sq-play */
// The Play tab's C64: the port (sq-port.js) on a clock and chips of its own, for play.html and for
// test_play.js, which runs it beside the kit's machine and compares the pace.
//
// SquirmPlay.create({ M, cost, keep, onPass }) gives the machine. M is the game's 64 KB as the
// listing holds it; cost the measured costs (COST, below, by default); keep the object the page
// gives C64.drawFrame, whose record of the bytes the video chip reads narrows the memory compared
// (C64.videoMemory); onPass(S), if given, runs at the start of each pass of the main loop ($3BF6),
// once the clock has reached it, where a test sets the pass's input.
//   run(t)    runs the port until the clock reaches cycle t (a PAL frame is 19,656 cycles)
//   joy1      joystick port 1, the game's: five bits, 0 for pressed (up 1, down 2, left 4, right
//             8, fire 16)
//   keys      the C64's keys held, a Set of the KERNAL's numbers (row x 8 + column; F1 is 4)
//   reads     how often the game's main program has read the stick ($DC01) and the key code ($C5),
//             and how many interrupts have come, { stick, key, irq }: a page holds a key it was
//             given until the game has read it
//   shown     the last whole frame, for C64.drawFrame: { vic, cia2, writes, mem, colour }
//   sound     each frame's SID writes, in SLICES lists of [register, value, ...] by the part of
//             the frame they came in, until the page takes them
//   clock, frames, passes, vic, colour, sid, P
//
// The clock. Nothing here runs 6502 code: the port is JavaScript, so its main program moves the
// clock on by what the game took: at each checkpoint a base for the stretch from the one before
// (@yield, by the two addresses; a stretch no run measured costs a line), and for each call of one
// of P's routines on the way a cost of its own (@fn), the two fitted together, none below zero, to
// the game's cycles over test_play.js's runs, its interrupts and its polling loops' turns taken out;
// and at each turn of a polling loop to the start of the next line. The interrupt is CIA 1's timer A, every 16,422 cycles, held while the game has
// interrupts off (P.I); it moves the clock on by what the game's handler took before the KERNAL's
// (@irq, by handler and, for the play's, whether this is the seventh call that turns the
// animations) and by what the KERNAL's own takes, as SquirmPort.kernal works it out from the keys
// held. The game waits on the jiffy clock that the interrupt counts, so it keeps the C64's time
// as long as its work between two waits takes less than the wait.
//
// The chips. Each write to the video chip is kept with the line and cycle it came on, and memory
// and colour RAM as each frame began with every change after it where the game made it
// (site/lib/c64.js, videoMemory), for C64.drawFrame. The video chip's colour registers read with
// their top four bits set, as the chip has no more. The SID's writes go to the page's sound as they
// come; a read of one of its write-only registers gives the data bus as it fades (site/lib/sid.js,
// createBus), which a life lost does as it lowers the falling note. CIA 1 is the keyboard's matrix,
// its rows out on port A and its columns in on port B, which joystick port 1 pulls low as well;
// its timer A interrupts.
globalThis.SquirmPlay = (function () {
  'use strict';
  const LINE = 63, LINES = 312, FRAME = LINE * LINES, SLICES = 12;
  const TIMER = 0x4025 + 1;          // CIA 1's timer A as the KERNAL sets it: an interrupt each 16,422 cycles
  const POLL = LINE;                 // a turn of a polling loop in test_play.js's lockstep: one line
  const COST = {"@yield":{"30aa>30aa":24,"30aa>311c":40,"30aa>3296":571,"311c>30aa":0,"311c>311c":41,"3296>32b0":316,"32b0>3bc0":23691,"379e>37ab":11,"37ab>379e":34,"37ab>3d4b":28,"37d2>3835":242,"3835>3835":143,"3835>38be":531,"38be>38be":28,"38be>38e0":39,"38e0>38ed":11,"38ed>38e0":34,"38ed>3d7e":43,"3a9a>3a9a":60,"3a9a>3ade":90,"3ade>3ade":40,"3ade>3aff":50,"3aff>311c":14259,"3aff>3296":14181,"3aff>3c56":34,"3bc0>3bc0":37,"3bc0>3bf6":37087,"3bf6>379e":2438,"3bf6>3a9a":1103,"3bf6>3c56":1054,"3c56>3bf6":29,"3c56>3c78":37,"3c78>3bf6":20,"3d4b>37d2":168,"3d7e>3c56":38289,"3b1d>3bc0":22276},"@fn":{"add_score":23,"bonus_run":28,"cell_is_free":130,"cli":3,"collect_treasure":53,"draw_status_lines":2475,"fade_beep":185,"install_irq":3,"move_treasure":69,"next_worm_direction":20,"show_maze1":582,"show_maze3":204,"step_player":60,"step_treasure":63,"step_worm_a":505,"step_worm_b":324,"try_cell":36},"@irq":{"3cb3":55,"3cb3:turn":1656,"3d27":56}};

  // the interrupt's state as its cost is measured: the handler, by the vector at $0314, and for the
  // play's whether it turns the animations this time
  function irqKey(M) {
    const v = M[0x0314] | M[0x0315] << 8;
    return v.toString(16) + (v === 0x3CB3 && M[0x2683] === 6 ? ':turn' : '');
  }
  const stretch = (from, to) => from.toString(16) + '>' + to.toString(16);
  // every routine of P, wrapped to tell onCall its name each time it is called; the handlers in
  // P.irqs are the routines as create made them, so only the calls they make are told
  function countCalls(P, onCall) {
    for (const k of Object.keys(P)) {
      const f = P[k];
      if (typeof f !== 'function' || k === 'program' || k === 'sei' || k === 'cli') continue;
      P[k] = function (...a) { onCall(k); return f.apply(this, a); };
    }
  }

  function create(o) {
    const M = o.M, cost = o.cost || COST, IRQ = cost['@irq'] || {}, YIELD = cost['@yield'] || {}, FN = cost['@fn'] || {};
    const vic = new Uint8Array(64), colour = new Uint8Array(1024), sid = new Uint8Array(32);
    // the chips as the KERNAL leaves them after RUN (test_play.js's machine)
    vic[0x11] = 0x1B; vic[0x16] = 0xC8; vic[0x18] = 0x15;
    const cia = { pra: 0x7F, ddra: 0xFF, ddrb: 0 }, cia2 = [0x97, 0x3F];
    const keys = new Set(), reads = { stick: 0, key: 0, irq: 0 };
    const S = { clock: 0, frames: 0, passes: 0, shown: null, sound: [], keys, joy1: 0x1F, reads, vic, colour, sid, M };
    const bus = globalThis.C64Sid ? globalThis.C64Sid.engine().createBus('8580') : null;
    let done = -1, inIrq = false, owed = 0, pending = false, irqLeft = 0, due = TIMER;
    const vm = globalThis.C64 && globalThis.C64.videoMemory ? globalThis.C64.videoMemory(M, colour, { keep: o.keep }) : null;
    const begin = (n) => {
      const m = vm ? vm.begin() : {};
      return { frame: n, vic: Array.from(vic.subarray(0, 47)), cia2: cia2.slice(), writes: [], mem: m.mem, colour: m.colour };
    };
    const slices = () => Array.from({ length: SLICES }, () => []);
    let cur = begin(0), curSound = slices();
    const moved = () => { if (vm && irqLeft <= 0) vm.at(S.clock, cur.writes, 0); };
    const line = () => Math.floor((S.clock % FRAME) / LINE);
    const irqEnded = () => {
      if (!vm) return;
      const n = cur.writes.length, w = [line(), S.clock % LINE + 1];
      vm.at(S.clock, cur.writes, 0);
      for (let i = n; i < cur.writes.length; i++) { cur.writes[i][0] = w[0]; cur.writes[i][1] = w[1]; }
    };
    const record = (a, v) => cur.writes.push([line(), S.clock % LINE + 1, a, v]);
    // CIA 1's port B: the columns of the rows port A drives low that have a key held, and joystick
    // port 1's lines
    function columns() {
      let v = 0xFF;
      const rows = (cia.pra | ~cia.ddra) & 0xFF;
      for (const k of keys) if (!(rows & (1 << (k >> 3)))) v &= ~(1 << (k & 7));
      return v & (0xE0 | S.joy1);
    }
    const io = {
      read(a) {
        if (a < 0xD400) {
          const r = a & 0x3F;
          if (r === 0x11) return (vic[0x11] & 0x7F) | (line() & 0x100) >> 1;
          if (r === 0x12) return line() & 255;
          if (r >= 0x20 && r <= 0x2E) return vic[r] | 0xF0;
          return r > 0x2E ? 0xFF : vic[r];
        }
        if (a < 0xD800) {
          const r = a & 0x1F;
          if (r >= 0x19 && r <= 0x1C) return r === 0x1B || r === 0x1C ? 0 : 0xFF;
          return bus ? bus.read(r, S.clock, 0) : 0;
        }
        if (a < 0xDC00) return colour[a - 0xD800] | 0xF0;
        if (a < 0xDD00) {
          const r = a & 15;
          if (r === 0) return (cia.pra | ~cia.ddra) & 0xFF;
          if (r === 1) { if (!inIrq) reads.stick++; return columns(); }
          if (r === 2) return cia.ddra;
          if (r === 3) return cia.ddrb;
          return 0;                                      // $DC0D: the interrupt, acknowledged as it is taken
        }
        return 0xFF;
      },
      write(a, v) {
        if (a < 0xD400) { const r = a & 0x3F; vic[r] = v; record(0xD000 + r, v); }
        else if (a < 0xD800) {
          const r = a & 0x1F;
          sid[r] = v; if (bus) bus.write(v, S.clock);
          curSound[Math.floor((S.clock % FRAME) * SLICES / FRAME)].push(r, v);
        } else if (a < 0xDC00) colour[a - 0xD800] = v & 15;
        else if (a < 0xDD00) {
          const r = a & 15;
          if (r === 0) cia.pra = v; else if (r === 2) cia.ddra = v; else if (r === 3) cia.ddrb = v;
        }
      },
      irqByte(a) { if (a === 0xC5 && !inIrq) reads.key++; return M[a]; },
    };
    const P = globalThis.SquirmPort.create(M);
    P.io = io;
    countCalls(P, (k) => { if (!inIrq) owed += FN[k] || 0; });
    S.P = P;

    function newFrame(n) {
      S.shown = cur; S.frames = n;
      cur = begin(n);
      S.sound.push(curSound); curSound = slices();
      if (S.sound.length > 100) S.sound.splice(0, S.sound.length - 100);
    }
    // the interrupt, through the vector at $0314: what the game's handler took in that state, and
    // the KERNAL's handler it ends in
    function irq() {
      pending = false;
      reads.irq++;
      const f = P.irqs[M[0x0314] | M[0x0315] << 8];
      if (!f) return 0;
      const key = irqKey(M);
      inIrq = true;
      let k;
      try { k = f.call(P); } finally { inIrq = false; }
      const c = (IRQ[key] !== undefined ? IRQ[key] : 40) + 22 + (k || 0);
      irqLeft += c;
      return c;
    }
    // Run the processor through `work` cycles, taking the frames, the lines and the timer's
    // interrupts on the way; an interrupt's cycles while there is work to do are more work.
    function spend(work) {
      if (pending && !P.I) work += irq();
      for (;;) {
        const ls = (Math.floor(done / LINE) + 1) * LINE;
        const ie = irqLeft > 0 ? S.clock + irqLeft : Infinity;
        const e = Math.min(ls, ie, due), end = S.clock + work;
        if (e > end) { S.clock = end; done = end; moved(); return; }
        if (e > S.clock) {
          work = Math.max(0, work - (e - S.clock));
          if (irqLeft > 0 && (irqLeft -= e - S.clock) <= 0) { irqLeft = 0; S.clock = e; irqEnded(); }
          S.clock = e;
        }
        done = e;
        if (e === due) {
          due += TIMER;
          if (P.I || irqLeft > 0) pending = true; else work += irq();
        }
        if (e !== ls) continue;
        moved();
        if ((e % FRAME) === 0) newFrame(e / FRAME);
      }
    }

    const gen = P.program();
    let last = 0x3B1D;                 // the hand-over
    function step() {
      const r = gen.next();
      if (r.done) throw new Error('the program ended');
      const y = r.value;
      if (y && y.cp !== undefined) {
        const c = YIELD[stretch(last, y.cp)];
        owed += c !== undefined ? c : LINE;
        last = y.cp;
      }
      let work = Math.max(0, owed);
      owed -= work;
      if (!(y && y.cp !== undefined)) {                       // a turn of a polling loop: to the next line
        spend(work);
        work = (Math.floor(S.clock / LINE) + 1) * LINE - S.clock;
      }
      if (o.onYield) o.onYield(y, S.clock + work);
      spend(work);
      // a pass of the main loop, counted once the clock has reached it
      if (y && y.cp === 0x3BF6) { S.passes++; if (o.onPass) o.onPass(S); }
    }
    S.run = function (t) {
      for (let n = 0; S.clock < t; n++) {
        if (n > 400000) throw new Error('the port ran 400,000 yields without the clock reaching its target');
        step();
      }
    };
    S.step = step;
    spend(0);
    return S;
  }
  return { create, COST, irqKey, stretch, countCalls, LINE, LINES, FRAME, SLICES, TIMER, POLL };
})();
if (typeof module !== 'undefined') module.exports = globalThis.SquirmPlay;
