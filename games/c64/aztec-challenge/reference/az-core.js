/* az-core */
// Aztec Challenge, the Play tab's port: the frame its groups of routines install into. The port runs
// on the game's own 64 KB (P.M) and keeps every variable where the game keeps it; registers travel
// as plain values between routines that pass them, and the stack is not kept (the game's stack
// tricks, two PLAs and a JMP to $1300, become a return of the next stage's address).
// The processor port stays at $37 all game: the KERNAL, BASIC and the chips are always in, and the
// game never reads a ROM but calls four KERNAL routines, which the port runs as AztecCore.kernal
// does (below) on its own memory and chips.
//
// Chips are reached through P.io (vicRead, vicWrite, sidWrite, colourWrite, ciaRead...). Four
// kinds of read give a value the port cannot work out by itself: the CIA timers' low bytes ($DC04,
// $DD04), the sprite collisions ($D01E) and voice 3's oscillator ($D41B). For each the port yields
// the address of the game's instruction after the read, as a checkpoint, and then asks
// P.io.live(chip, reg), reg being the register the game loaded ('a' or 'x'): in the lockstep the
// game has just made the same read there, and the test hands its value over; on the page,
// az-play.js answers from its own chips. H.live(cp, chip, reg) does both: v = yield* H.live(...).
//
// AztecCore.makePort(M, groups) builds P from the group installers (window.AZ_GROUPS on the page,
// a list in node), each install(P, H, K). P.stages[address] is a generator for each place the game
// JMPs to and does not return from (the levels, the scorecard, the end of a level); it returns the
// address of the next stage, and P.program runs them one after another.
(function (root) {
  'use strict';
  // The four KERNAL routines the game calls, and the keyboard scan of its interrupt, as the test's machine runs them and the port does:
  // env is { M, colourWrite(i, v), keyDown(k) } (k a KERNAL key number: F1 4, F3 5, RUN/STOP 63).
  // Only what the game relies on is kept: the screen and colour cleared, the clock counted, the
  // STOP key's row kept in $91 and read back, the two function keys the menu waits for.
  const kernal = {
    // CHROUT ($FFD2), called only with $93: clear the screen to spaces, colour RAM to the cursor's
    // colour in $0286, as the KERNAL's clear-screen does
    chrout(env, a) {
      if (a !== 0x93) return;
      const M = env.M, c = M[0x0286] & 15;
      for (let i = 0; i < 1000; i++) { M[0x0400 + i] = 0x20; env.colourWrite(i, c); }
    },
    // UDTIM ($FFEA): the jiffy clock $A0-$A2 one on (to 24 hours, $4F1A01, then 0), and $91 the
    // STOP key's state ($7F held, $FF not), as the KERNAL leaves it after a keyboard row read
    udtim(env) {
      const M = env.M;
      if (++M[0xA2] > 255) M[0xA2] = 0;
      if (M[0xA2] === 0) { M[0xA1] = (M[0xA1] + 1) & 255; if (M[0xA1] === 0) M[0xA0] = (M[0xA0] + 1) & 255; }
      if (M[0xA0] === 0x4F && M[0xA1] === 0x1A && M[0xA2] === 0x01) M[0xA0] = M[0xA1] = M[0xA2] = 0;
      M[0x91] = env.keyDown(63) ? 0x7F : 0xFF;
    },
    // STOP ($FFE1): true (Z set) when $91 says RUN/STOP is held
    stop(env) { return env.M[0x91] === 0x7F; },
    // SCNKEY, which the KERNAL's interrupt runs at $EA31 (the game's own interrupt ends there too):
    // a key newly down since the last scan ($C5, 64 for none) goes into the keyboard buffer at $0277,
    // ten keys at most, counted in $C6. Function keys do not repeat. So F1 pressed during a preview
    // waits in the buffer, and the menu takes it when it comes back.
    scan(env) {
      const M = env.M, k = env.keyDown(4) ? 4 : env.keyDown(5) ? 5 : 64;
      if (k === M[0xC5]) return;
      M[0xC5] = k;
      if (k !== 64 && M[0xC6] < 10) M[0x0277 + M[0xC6]++] = k === 4 ? 0x85 : 0x86;
    },
    // GETIN ($FFE4): the first key in the buffer (F1 $85, F3 $86), or 0 when it is empty
    getin(env) {
      const M = env.M;
      if (!M[0xC6]) return 0;
      const a = M[0x0277];
      for (let i = 0; i < 9; i++) M[0x0277 + i] = M[0x0278 + i];
      M[0xC6]--;
      return a;
    },
  };

  // Input is taken the same way: the joystick ('joy', what $DC00 read) and the key GETIN gave ('getin'),
  // read by the game just before the checkpoint, before the lockstep changes the input there.
  // Every place the port yields as a checkpoint: the instruction after each read of a chip the port
  // takes from the game (H.live) or of the input, and after each KERNAL call the main loops make.
  const CHECKPOINTS = [
    0x109C, 0x10AA, 0x1335, 0x1A78, 0x1B9C, 0x1BB0, 0x1BD2, 0x1D82, 0x1DA6, 0x1E9C, 0x1EAB, 0x1FD5,
    0x61AD, 0x6364, 0x6376, 0x638D, 0x63BA, 0x650B, 0x670E, 0x6724, 0x673A, 0x6750, 0x6766, 0x677C,
    0x67AD, 0x67CD, 0x67F2, 0x680C, 0x6827, 0x6847, 0x6BE3, 0x6CF8, 0x7064, 0x7085, 0x708F, 0x70B0,
    0x70BA, 0x70E3, 0x7189, 0x74CF, 0x75FC, 0x783D, 0x7887, 0x78E3, 0x79F3, 0x7A05, 0x7AEB, 0x7BD3,
    0x7CF2, 0x7DD3, 0x7DF5, 0x7E85, 0x7E9E, 0x7F35, 0x7F5E, 0x7FCB, 0x73B0, 0x732D, 0x6DC1, 0x6DC9,
    0x1B1D, 0x121D,
    // before a write of a voice's pitch, which the music's interrupt writes too
    0x63D0, 0x63F3, 0x6470, 0x64F7, 0x74C2, 0x7523, 0x756E, 0x75A7, 0x7E1D,
    // the exit of the Vermin's raster wait (in the lockstep; on the page the port waits for the line)
    0x6648,
  ];
  // The raster waits' exits: the instruction after each loop that polls $D012.
  const WAITS = [0x6E97, 0x6F17, 0x6F87];
  function makePort(M, groups) {
    const P = { M, io: {}, stages: {}, irqs: {}, checkpoints: new Set(CHECKPOINTS), waits: WAITS, waited: 0 };
    const env = { M, colourWrite: (i, v) => P.io.colourWrite(i, v), keyDown: (k) => P.io.keyDown(k) };
    const K = {
      chrout: (a) => kernal.chrout(env, a),
      udtim: () => kernal.udtim(env),
      stop: () => kernal.stop(env),
      getin: () => kernal.getin(env),
      scan: () => kernal.scan(env),
    };
    const H = {
      // a read the port takes from the game (the lockstep) or its own chips (the page)
      live: function* (cp, chip, reg) { yield { cp: H.cp(cp) }; return P.io.live(chip, reg, cp) & 255; },
      // the joystick in port 2 as the game reads it: five bits, 0 for pressed
      joy: () => P.io.ciaRead(0) & 0x1F,
      // leave from deep inside routines to the stage at a (the game's PLAs and a JMP)
      jump: (a) => { throw { azJump: a }; },
      // a checkpoint of the list below
      cp: (a) => { if (!P.checkpoints.has(a)) throw new Error('$' + a.toString(16).toUpperCase() + ' is not in CHECKPOINTS'); return a; },
      // NMOS decimal-mode ADC: { a, c }
      adcD(a, b, c) {
        let al = (a & 15) + (b & 15) + c;
        if (al >= 10) al = ((al + 6) & 15) + 16;
        let s = (a & 0xF0) + (b & 0xF0) + al;
        if (s >= 0xA0) s += 0x60;
        return { a: s & 255, c: s >= 0x100 ? 1 : 0 };
      },
      // a delay loop of the game's: n cycles of nothing, named for the page's clock
      // (only on the page, P.clocked: in the lockstep the game runs only at checkpoints, and input
      // that changed at a yield the game was not stopped at would reach the two at different places)
      // (in the lockstep the cycles are added up in P.waited instead, for test_play.js's costs)
      wait: function* (n) { if (P.clocked) yield { cycles: n }; else P.waited += n; },
      // the cycles of the game's two kinds of delay: n turns of a DEY loop of 256 inside a DEX loop
      // (n = 0 is 256), and a DEC loop on a zero-page byte loaded with n inside another loaded the
      // same (LDA #n, STA, STA, DEC, BNE, DEC, BNE)
      dyx: (n) => (n || 256) * 1286 - 1,
      decLoop: (n) => (n || 256) * (8 * (n || 256) + 10) + 4,
      // the ninth bits of the sprites' X
      msb: () => P.io.vicRead(0x10),
      setMsb: (v) => P.io.vicWrite(0x10, v & 255),
    };
    P.H = H; P.K = K;
    for (const g of groups) g(P, H, K);
    P.program = function* () {
      let at = 0x1000;
      for (;;) {
        const s = P.stages[at];
        if (!s) throw new Error('not ported: the stage at $' + at.toString(16).toUpperCase());
        try { at = yield* s(); } catch (e) { if (e && e.azJump !== undefined) at = e.azJump; else throw e; }
      }
    };
    return P;
  }
  const AztecCore = { makePort, kernal, CHECKPOINTS, WAITS };
  if (typeof module !== 'undefined') module.exports = AztecCore;
  root.AztecCore = AztecCore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
