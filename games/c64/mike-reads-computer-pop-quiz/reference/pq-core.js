/* pq-core */
// Mike Read's Computer Pop Quiz, the Play tab's port: the frame its groups of routines install into. The port runs
// on the game's own 64 KB (P.M) and keeps every variable where the game keeps it, the operands the game writes into
// its own instructions included (they are memory too, and the lockstep compares them). Registers travel between
// routines as a plain object r = { a, x, y, c, z, n, v } that a routine takes and returns; the stack is not kept.
//
// The groups. Each file pq-g<n>-<name>.js holds a group of routines, one function per listing label, named as the
// listing names it (P.print_text, P.irq_frame ...), and installs them with install(P, H, K). A routine that lets
// time pass (it polls a byte an interrupt writes, or the raster) is a generator, called r = yield* P.name(r); the
// others are plain functions. Interrupt handlers are plain functions in P.irqs, by the address the game's vector
// points to.
//
// Time, as the lockstep (kit/c64/lockstep.js) and the page's clock read it: the main program yields
//   { cp: a }    at a checkpoint: a, the address of an instruction of the game's main program (a JSR the main
//                program makes, or the head of a stage); every such address is declared with H.checkpoint(a)
//   (bare)       at each turn of a loop that polls what an interrupt writes or the raster: one raster line
//   { cycles }   the game's own work, for the page's clock (H.work)
//
// Memory and chips. The game switches the processor port ($01) between $25/$35 (I/O in, ROMs out), $34 (all RAM),
// $36/$37 and $27 (the KERNAL in, for its calls). H.rd(a) and H.wr(a, v) read and write as the game's instruction
// would with the port as the game last set it (H.setPort): $D000-$DFFF are the chips while I/O is in and RAM when it
// is not, $00/$01 the processor port. A routine whose addresses are never under the I/O area reads P.M directly.
// The chips are P.io (the lockstep sets it; on the page, pq-play.js): vicRead(r), vicWrite(r, v), sidRead(r),
// sidWrite(r, v), colourRead(i), colourWrite(i, v), ciaRead(r), ciaWrite(r, v), cia2Read(r), cia2Write(r, v),
// read(a), write(a, v), irqByte(a) and store(a, v) (the lockstep's header says what these two are for).
//
// The sound. The music driver ($4C00-$4EFF with its tail at $4F00-$53FF) and the sound-effects code a question
// block loads ($4F00-$532E) run on the kit's 6502 over P.M, as the game calls them (H.driver): a music driver run on
// the kit's processor counts as a port (kit/skills/core/70-minisite, "The sound").
//
// The KERNAL. The game calls IOINIT ($FF84) at start-up and SETMSG, SETLFS, SETNAM and LOAD ($FF90, $FFBA, $FFBD,
// $FFD5) to load a question block from the tape, through Novaload (its LOAD at $033C). The port does what those
// leave behind (K below), with the block's files from opts.files: { name: [load address, Uint8Array] }.
(function (root) {
  'use strict';
  const kernal = {
    ioinit() {},
    setmsg() {},
    setlfs() {},
    setnam(env, len, lo, hi) { let s = ''; for (let i = 0; i < len; i++) s += String.fromCharCode(env.M[(hi << 8 | lo) + i]); env.state.name = s; },
    // LOAD through Novaload: the file's bytes at its load address, then Novaload's exit ($03BD-$03D3): $01 = $37,
    // the motor flag $C0 = $37, X/Y the end address, carry clear, IOINIT with $DD00 kept, CLI
    load(env) {
      const f = env.files[env.state.name];
      if (!f) throw new Error('LOAD of an unknown file ' + JSON.stringify(env.state.name));
      const [at, bytes] = f;
      env.M.set(bytes, at);
      env.state.loads.push(env.state.name);
      env.setPort(0x37); env.M[0xC0] = 0x37;
      const end = at + bytes.length;
      return { x: end & 255, y: end >> 8, c: 0 };
    },
  };

  function makePort(M, groups, opts) {
    opts = opts || {};
    const P = { M, io: {}, irqs: {}, stages: {}, checkpoints: new Set(), cpuPort: 0x27, clocked: false, cpu: null };
    const state = { name: '', loads: [] };
    P.kstate = state;
    const env = { M, state, files: opts.files || {}, setPort: (v) => { P.cpuPort = v; } };
    const K = {
      ioinit: () => kernal.ioinit(env),
      setmsg: () => kernal.setmsg(env),
      setlfs: () => kernal.setlfs(env),
      setnam: (len, lo, hi) => kernal.setnam(env, len, lo, hi),
      load: () => kernal.load(env),
    };
    const ioIn = () => (P.cpuPort & 3) !== 0 && (P.cpuPort & 4) !== 0;     // $01 bits: CHAREN set and not all RAM
    const H = {
      // a checkpoint: declared once, yielded as { cp: a }
      checkpoint(...as) { for (const a of as) P.checkpoints.add(a); },
      cp(a) { if (!P.checkpoints.has(a)) throw new Error('$' + a.toString(16).toUpperCase() + ' is not a declared checkpoint'); return { cp: a }; },
      // the game's own work, for the page's clock only (the lockstep times stretches by the game's cycles)
      work: function* (n) { if (P.clocked) yield { cycles: n }; },
      setPort(v) { P.cpuPort = v & 255; },
      rd(a) {
        // $00 reads the processor port's data direction, $2F as the KERNAL leaves it (the game never writes it;
        // the menu's first text_print reads text_ptr $0000 there)
        if (a === 0) return 0x2F;
        if (a === 1) return P.cpuPort;
        if (a >= 0xD000 && a < 0xE000 && ioIn()) return P.io.read(a) & 255;
        return M[a];
      },
      wr(a, v) {
        v &= 255;
        if (a === 1) { P.cpuPort = v; return; }
        if (a >= 0xD000 && a < 0xE000 && ioIn()) { P.io.write(a, v); return; }
        M[a] = v;
      },
      // NMOS decimal-mode ADC and SBC: { a, c }
      adcD(a, b, c) {
        let al = (a & 15) + (b & 15) + c;
        if (al >= 10) al = ((al + 6) & 15) + 16;
        let s = (a & 0xF0) + (b & 0xF0) + al;
        if (s >= 0xA0) s += 0x60;
        return { a: s & 255, c: s >= 0x100 ? 1 : 0 };
      },
      sbcD(a, b, c) {
        let al = (a & 15) - (b & 15) - (1 - c), s;
        if (al < 0) al = ((al - 6) & 15) - 16;
        s = (a & 0xF0) - (b & 0xF0) + al;
        if (s < 0) s -= 0x60;
        return { a: s & 255, c: s >= 0 ? 1 : 0 };
      },
      // the sound code on the kit's 6502 over P.M: call(entry, regs), its chip writes going to P.io
      driver(entry, regs) {
        if (!P.cpu) {
          const C = typeof C64Cpu !== 'undefined' ? C64Cpu : opts.cpu;
          P.cpu = new C.CPU(M, { port: 0x35, io: { read: (a) => P.io.read(a), write: (a, v) => P.io.write(a, v) } });
        }
        const c = P.cpu;
        c.call(entry, Object.assign({ sp: 0xFF }, regs || {}), { maxSteps: 200000 });
        return { a: c.a, x: c.x, y: c.y, c: c.c };
      },
    };
    P.H = H; P.K = K;
    for (const g of groups) g(P, H, K);
    // the main program: stages, each a generator that returns the address of the next (the game's JMPs)
    P.program = function* () {
      let at = 0x40E2;
      for (;;) {
        const s = P.stages[at];
        if (!s) throw new Error('not ported: the stage at $' + at.toString(16).toUpperCase());
        at = yield* s.call(P);
      }
    };
    return P;
  }
  const PopQuizCore = { makePort, kernal };
  if (typeof module !== 'undefined') module.exports = PopQuizCore;
  root.PopQuizCore = PopQuizCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
