// The controls: the four readers the options offer, the waits for a key, the ROM's KEY-SCAN, the
// game's delay loops and its sound effects.
(function (root) {
'use strict';
const G = root.LSGroups = root.LSGroups || {};
G.input = P => {
  const M = P.M;
  const IN = port => P.io.in(port & 0xFFFF) & 0xFF;

  // The readers, picked by the control option in $B0C7 through the table at $B0E0. Each gives the
  // controls in A, a bit each, 0 for held: fire in bit 0, up 1, down 2, right 3, left 4; bits 5 to 7
  // set.
  // $B0E8: the Sinclair joysticks, keys 6 to 0 (left, right, down, up, fire) and 1 to 5 (left, right,
  // down, up, fire), the second's bits reversed into the first's order.
  const sinclair = r => {
    const e = IN(0xEFFE);
    let a = IN(0xF7FE), c = r.c || 0;
    for (let i = 0; i < 5; i++) { c = (c << 1 | a & 1) & 255; a >>= 1; }
    return { a: c & e | 0xE0, e, b: 0, c };
  };
  // $B0FD: the Kempston joystick, port $1F, bits set when held: right, left, down, up, fire.
  const kempston = r => {
    const v = IN((r.a << 8) | 0x1F);
    const b = (v & 2 ? 16 : 0) | (v & 1 ? 8 : 0) | (v & 4 ? 4 : 0) | (v & 8 ? 2 : 0) | (v & 16 ? 1 : 0);
    return { a: ~b & 255 | 0xE0, b };
  };
  // $B117: the cursor keys, 5 (left), 6 (down), 7 (up), 8 (right) and 0 (fire); and SPACE fires.
  const cursor = () => {
    let e = IN(0xF7FE) | 0xEF;
    const d = IN(0xEFFE);
    e &= d | 0xFE;
    let a = d | 0xE7; a = ((a >> 2) | (a << 6)) & 255; e &= a;
    a = d | 0xFB; a = ((a << 1) | (a >> 7)) & 255; e &= a;
    return space(e);
  };
  // $B136: the keyboard, Q (up), A (down), O (left), P (right) and SPACE (fire).
  const keys = () => {
    let e = (IN(0xFDFE) | 0xFE) << 1 & 255 | 1;
    let a = (IN(0xFBFE) | 0xFE) & e; e = (a << 1 | a >> 7) & 255;
    a = IN(0xDFFE) | 0xFC; for (let i = 0; i < 3; i++) a = (a << 1 | a >> 7) & 255;
    e &= a;
    return space(e);
  };
  // $B153, the end of both: SPACE fires too.
  const space = e => ({ a: (IN(0x7FFE) | 0xFE) & e, e, b: 0x7F, c: 0xFE });
  const READERS = { 0xB0E8: sinclair, 0xB0FD: kempston, 0xB117: cursor, 0xB136: keys };

  // $B0C8: read the controls by the option chosen, into $5D2A. The checkpoint where every turn of
  // the game's loops that steer play begins.
  P.def(0xB0C8, 'readControls', function* () {
    yield { cp: 0xB0C8 };
    const at = P.w(0xB0E0 + 2 * M[0xB0C7] & 0xFFFF);
    const f = READERS[at];
    if (!f) throw new Error('readControls: no reader at $' + at.toString(16));
    const r = f({ a: 2 * M[0xB0C7] & 255, c: 0 });
    P.count('reader' + (M[0xB0C7] & 3));
    M[0x5D2A] = r.a;
    return Object.assign(r, { h: at >> 8, l: at & 255, hl: at, d: 0xB0, e: r.e === undefined ? 0xDC : r.e });
  });

  // The ROM's KEY-SCAN ($028E), which the menus call: E is the key held (0 to $27, by half-row and
  // bit), $FF for none; D the shift held. The game calls it at $6A74 and $A290: a checkpoint.
  P.keyScan = function* () {
    yield { cp: 0x028E };
    let l = 0x2F, d = 0xFF, e = 0xFF, b = 0xFE;
    for (;;) {
      let a = ~IN(b << 8 | 0xFE) & 0x1F;
      if (a) {
        let h = a; a = l;
        for (;;) {
          d = d + 1 & 255;
          if (d) return { d, e, l, a, zf: false };          // three keys: NZ
          do { a = a - 8 & 255; const c = h & 1; h >>= 1; if (c) break; } while (true);
          d = e; e = a;
          if (!h) break;
        }
      }
      l = l - 1 & 255;
      const c = b >> 7; b = (b << 1 | c) & 255;
      if (!c) break;
    }
    let a = d + 1 & 255;
    if (!a) return { d, e, l, a, zf: true };
    if (a === 0x28 || a === 0x19) return { d, e, l, a, zf: true };
    a = e; e = d; d = a;
    return { d, e, l, a, zf: a === 0x18, cf: a < 0x18 };
  };

  // $62DA, $62DF, $62E4, $62E9: wait 3, 1, 40 or 200 turns of a loop of 255 (3,351 T-states a
  // turn), spent on the port's clock. BC is kept.
  const loops = n => 45 + 3351 * n;
  for (const [a, name, n] of [[0x62DA, 'delay3', 3], [0x62DF, 'delay1', 1], [0x62E4, 'delay40', 40], [0x62E9, 'delay200', 200]]) {
    P.def(a, name, () => { P.spend(loops(n)); return {}; });
  }
  P.loops = loops;

  // $6A6D: wait until no key and no control is held (KEY-SCAN, then the controls), but not in the
  // computer's turn ($5DF7 set). Each turn of the loop counts in $5D9C, which the random numbers
  // mix in.
  P.def(0x6A6D, 'waitRelease', function* (r) {
    if (M[0x5DF7]) return {};
    for (;;) {
      const k = yield* P.keyScan();
      P.count('releaseTurn');
      M[0x5D9C] = M[0x5D9C] + 1 & 255;
      if (k.e !== 0xFF) continue;
      yield* P.readControls();
      P.count('releaseReadTurn');
      if (M[0x5D2A] === 0xFF) break;
    }
    return {};
  });

  // $6B08: wait for any key (port $FE read with all the half-rows, port $00FE), counting the turns in
  // $5D9C, then sound effect 0.
  P.def(0x6B08, 'waitKey', function* () {
    for (;;) {
      yield { cp: 0x6B08 };
      P.count('keyTurn');
      M[0x5D9C] = M[0x5D9C] + 1 & 255;
      if (((IN(0x00FE) | 0xE0) + 1 & 255) !== 0) break;
    }
    return P.sound({ a: 0 });
  });

  // $66D1: auto-repeat. With no control held, clear $5CFB and return at once; otherwise wait up to
  // 110 turns (the first time, $5CFB clear) or 40 (while it repeats) of a short delay and a read of
  // the controls, returning early when they are let go. $5CFB is set.
  P.def(0x66D1, 'repeatDelay', function* () {
    if (M[0x5D2A] === 0xFF) { M[0x5CFB] = 0; return { a: 0 }; }
    let b = M[0x5CFB] ? 0x28 : 0x6E;
    M[0x5CFB] = 1;
    while (b--) {
      if (M[0x5D2A] === 0xFF) return {};
      P.delay3();
      yield* P.readControls();
      P.count('repeatTurn');
    }
    return { b: 0 };
  });

  // $77F7: in a player's turn, wait for fire, counting the turns in $5D9C; then sound effect 0.
  // BC is kept.
  P.def(0x77F7, 'waitFire', function* () {
    if (M[0x5DF7]) return {};
    do {
      yield* P.readControls();
      P.count('fireTurn');
      M[0x5D9C] = M[0x5D9C] + 1 & 255;
    } while (M[0x5D2A] & 1);
    return P.sound({ a: 0 });
  });

  // $B5BE: sound effect A, its ten bytes from $B531 + 10 x A copied to $B5B3; $B5D5 plays the effect
  // there: ($B5B3) times ($B5B4) passes over four tones, each a wait of its pitch byte (at $B5B6,
  // $B5B8, $B5BA, $B5BC) and then a toggle of the speaker's bit in $B5BD; after each of the ($B5B3)
  // each pitch moves on by the byte before it.
  P.def(0xB5BE, 'sound', r => {
    const from = 0xB531 + 10 * r.a & 0xFFFF;
    for (let i = 0; i < 10; i++) M[0xB5B3 + i] = M[from + i & 0xFFFF];
    P.spend(4 + 7 + 33 + 11 + 4 + 7 + 22 + 10 + 10 + 10 + 9 * 21 + 16);
    return P.playSound();
  });
  // The T-states are the routine's own: a tone of pitch n waits 63 x n - 5 before its OUT, and the
  // port's clock gives each OUT its time (P.io.out's third argument).
  P.def(0xB5D5, 'playSound', () => {
    let t = 17;
    for (let o = M[0xB5B3] || 256; o > 0; o--) {
      t += 28;
      for (let m = M[0xB5B4] || 256; m > 0; m--) {
        t += 38;
        for (let v = 0; v < 4; v++) {
          const n = M[0xB5B6 + 2 * v] || 256;
          t += 18 + 63 * n - 5 + 33 + 11;
          M[0xB5BD] ^= 0x10;
          P.io.out(0xFE, M[0xB5BD], P.T + t);
          t += 21 + (v < 3 ? 13 : 8);
        }
        t += 10 + (m > 1 ? 13 : 8);
      }
      t += 27 + 4 * 46 - 5;
      for (let v = 0; v < 4; v++) M[0xB5B6 + 2 * v] = M[0xB5B6 + 2 * v] + M[0xB5B5 + 2 * v] & 255;
      t += 10 + (o > 1 ? 13 : 8);
    }
    P.spend(t + 10);
    return { b: 0, a: M[0xB5BC], hl: 0xB5BD, de: 2 };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
