// The command dispatcher and what it runs ($83C0-$9122): the video modes, the screen fills and
// copies, the text printer, the keyboard, the sound effects, and the jobs the 3D view and the
// dashboard hand it by number (commands $3C-$47).
(function (root) {
'use strict';
const G = root.SCRGroups = root.SCRGroups || {};
G.dispatch = P => {
  const M = P.M, io = P.io;
  const nz = v => ({ n: (v >> 7) & 1, z: (v & 255) === 0 ? 1 : 0 });
  // colour RAM as the processor reads it: four bits, the top four high as the kit's machine has
  // them (on the C64 they are whatever the video chip last fetched)
  const col = i => io.colourRead(i) | 0xF0;

  // DISPATCH ($8725): the command in A, its argument in X (and Y)
  P.DISPATCH = r => {
    switch (r.a & 255) {
      case 0x3C: return P.DRAWBRIDGE(r);
      case 0x3D: return P.COLUMN_LIMITS(r);
      case 0x3E: return P.FILL_ABOVE_EDGES(r);
      case 0x3F: return P.CRANE_CHAINS(r);
      case 0x40: return P.FRONT_WHEEL(r);
      case 0x41: return P.MARK_COLUMNS(r);
      case 0x42: return P.FILL_SPANS(r);
      case 0x43: return P.SPEED_BAR(r);
      case 0x44: return P.PIECE_TABLE(r);
      case 0x45: return P.CLEAR_VIEW(r);
      case 0x46: return P.SET_ROW_COLOURS(r);
      case 0x47: return P.DISK_COMMAND(r);
      case 0x01: M[0xFE] = 1; return P.VIDEO_HIRES(r);
      case 0x02: M[0xFE] = 2; return P.VIDEO_MULTICOLOUR(r);
      case 0x03: M[0xFE] = 2; return P.MENU_SCREEN(r);
      case 0x10: return P.COPY_VIEW_OR_CLEAR({ a: r.x & 255, x: r.x, y: r.y });
      case 0x20: M[0x85D0] = r.x & 255; return {};
      case 0x81: return P.KEY_SCAN(r);
      case 0x15: return P.CUT_EFFECT(r);
      case 0x32: return P.UNPACK_DASHBOARD(r);
      case 0x55: return P.FILL_ROWS(r);
      case 0x34: return P.SAVE_RESTORE_SCREEN(r);
    }
    return {};
  };

  // VIDEO_MULTICOLOUR ($83C0): multicolour on, the bitmap at $6000 and the screen at $5C00
  P.VIDEO_MULTICOLOUR = r => { P.wr(0xD016, P.rd(0xD016) | 0x10); return P.SET_VIDEO({ a: 0x78 }); };
  // VIDEO_HIRES ($83CC): multicolour off, the bitmap at $4000 and the screen at $7C00
  P.VIDEO_HIRES = r => { P.wr(0xD016, P.rd(0xD016) & 0xEF); return P.SET_VIDEO({ a: 0xF0 }); };
  // SET_VIDEO ($83D6): bank 1 at $4000, $D018 from A, the background black
  P.SET_VIDEO = r => {
    M[0xFA] = r.a & 255;
    P.wr(0xDD02, P.rd(0xDD02) | 3);
    P.wr(0xDD00, (P.rd(0xDD00) & 0xFC) | 2);
    P.wr(0xD018, M[0xFA]);
    P.wr(0xD021, 0);
    return { a: 0, z: 1, n: 0 };
  };
  // MENU_SCREEN ($83F7): the menus' screen, multicolour, its screen colours from X
  P.MENU_SCREEN = r => {
    M[0x8415] = r.x & 255;
    P.wr(0xD016, P.rd(0xD016) | 0x10);
    P.SET_VIDEO({ a: 0xF0 });
    P.FILL_SCREEN({ a: M[0x8415] | 0x0E });
    P.COPY_VIEW_OR_CLEAR({ a: 1 });
    return {};
  };
  // FILL_SCREEN ($8416): $5C00-$5FFF with A
  P.FILL_SCREEN = r => { M.fill(r.a & 255, 0x5C00, 0x6000); return { x: 0 }; };
  // COPY_VIEW_OR_CLEAR ($8428): A of 2 or more copies $6140-$77BF to $4140-$57BF; less clears
  // 20 rows from $4000 to $AA and 5 from $5900 to 0
  P.COPY_VIEW_OR_CLEAR = r => {
    if ((r.a & 255) < 2) {
      M[0x52] = 0x14; P.FILL_ROWS({ x: 0, y: 0x40, a: 0xAA });
      M[0x52] = 0x05; return P.FILL_ROWS({ x: 0, y: 0x59, a: 0 });
    }
    M[0xF4] = 0x40; M[0xF6] = 0x40; M[0xF5] = 0x77; M[0xF7] = 0x57;
    let y = 0x7F;
    for (;;) {
      const s = M[0xF4] | M[0xF5] << 8, d = M[0xF6] | M[0xF7] << 8;
      do { M[(d + y) & 0xFFFF] = M[(s + y) & 0xFFFF]; y = (y - 1) & 255; } while (y);
      M[(d + y) & 0xFFFF] = M[(s + y) & 0xFFFF]; y = (y - 1) & 255;
      M[0xF7]--; M[0xF5]--;
      if (M[0xF7] < 0x41) break;
    }
    return { a: M[0xF7], y, c: 0 };
  };
  // FILL_ROWS ($8921): $52 rows of 320 bytes from X (low) and Y (high) set to A
  P.FILL_ROWS = r => {
    M[0x1E] = r.x & 255; M[0x1F] = r.y & 255; M[0x14] = r.a & 255;
    let x = M[0x52];
    do {
      const a = M[0x1E] | M[0x1F] << 8;
      M.fill(M[0x14], a, Math.min(a + 0x140, 0x10000));
      M[0x1F]++;
      const t = M[0x1E] + 0x40;
      M[0x1E] = t & 255;
      if (t > 255) M[0x1F]++;
      x = (x - 1) & 255;
    } while (x);
    return { x: 0, y: 0xFF, a: M[0x1E] };
  };

  // PRINT_CHAR ($846F): PRINT_CHAR_RAW with A, X and Y kept
  P.PRINT_CHAR = r => { M[0x85C7] = r.a & 255; M[0x85C8] = r.x & 255; M[0x85C9] = r.y & 255; P.PRINT_CHAR_RAW({ a: r.a }); return { a: M[0x85C7], x: M[0x85C8], y: M[0x85C9] }; };
  // PRINT_CHAR_RAW ($8485): one character into the bitmap at $4000, seven pixels wide, at column
  // $85C5 and row $85C6; $1F takes the next two bytes as the column and the row, 9 moves a column
  // on, $7F rubs one out, $80 and up do nothing
  P.PRINT_CHAR_RAW = r => {
    let a = r.a & 255;
    if (M[0x846D]) {
      M[0x846E]++;
      if (M[0x846E] !== 2) { M[0x85C5] = a; return {}; }
      M[0x85C6] = a; M[0x846D] = 0; return {};
    }
    if (a === 0x1F) { M[0x846D] = a; M[0x846E] = 0; return {}; }
    if (a === 0x09) { M[0x85C5]++; return {}; }
    if (a >= 0x7F) {
      if (a !== 0x7F) return {};
      M[0x85C5]--;
      M[0x85D1] = 0x80; M[0x85C7] = 0x20;
      P.PRINT_CHAR_RAW({ a: 0x20 });
      M[0x85D1] >>= 1;
      M[0x85C5]--;
      return {};
    }
    // the character's eight bytes at $7FC0 + 8 x A
    let f1 = M[0xF1];
    for (let i = 0; i < 3; i++) { const c = a >> 7; a = (a << 1) & 255; f1 = ((f1 << 1) | c) & 255; }
    let t = a + 0xC0;
    M[0xF0] = t & 255;
    M[0xF1] = ((f1 & 7) + 0x7F + (t >> 8)) & 255;
    // the pixel column: seven a character, with $C3D9's bits added in
    const col = M[0x85C5];
    a = ((col << 3) & 255) | M[0xC3D9];
    let fb = ((M[0xFB] << 1) | ((col >> 5) & 1)) & 255;   // ROL $FB takes the third ASL's carry
    t = a - col;
    M[0xFA] = t & 255;
    if (t < 0) fb = (fb - 1) & 255;
    // LSR $FB, ROR A, LSR, LSR: the byte column
    let c = fb & 1; fb >>= 1;
    a = (((t & 255) >> 1) | (c << 7)) >> 2;
    M[0xFB] = fb;
    M[0x85CC] = a;
    M[0x85CD] = M[0xFA] & 7;
    // the row: 40 bytes a row, then eight bytes a byte
    // (ASL ASL CLC ADC: the carry out of the ASLs is lost, and the sum's too)
    let fa = (((M[0x85C6] << 2) & 255) + M[0x85C6]) & 255;
    let hi = 0;
    for (let i = 0; i < 3; i++) { c = fa >> 7; fa = (fa << 1) & 255; hi = (hi << 1) | c; }
    M[0xFA] = fa; M[0xFB] = hi;
    t = fa + M[0x85CC];
    let f4 = t & 255;
    let h = (hi + (t >> 8)) & 255;
    for (let i = 0; i < 3; i++) { c = f4 >> 7; f4 = (f4 << 1) & 255; h = ((h << 1) | c) & 255; }
    M[0xF5] = (h + 0x40) & 255;
    a = f4;
    if (M[0x85D0] & 0x80) { a = (a + 4) & 255; }
    M[0xF4] = a;
    t = a + 8;
    M[0xF6] = t & 255;
    M[0xF7] = (M[0xF5] + (t >> 8)) & 255;
    // the masks for the two bytes the character straddles
    let mL = 0, mR = 0xFF;
    for (let x = M[0x85CD]; x; x--) { c = mL & 1; mL = (mL >> 1) | 0x80; mR = (mR >> 1) | (c << 7); }
    M[0x85CB] = mR; M[0x85CA] = mL;
    for (let y = 0; y < 8; y++) {
      M[0xFB] = 0;
      let b = M[(M[0xF0] | M[0xF1] << 8) + y & 0xFFFF];
      for (let x = M[0x85CD]; x; x--) { c = b & 1; b >>= 1; M[0xFB] = (M[0xFB] >> 1) | (c << 7); }
      M[0xFA] = b;
      let p = (M[0xF4] | M[0xF5] << 8) + y & 0xFFFF;
      M[p] = (M[p] & M[0x85CA]) | M[0xFA];
      p = (M[0xF6] | M[0xF7] << 8) + y & 0xFFFF;
      M[p] = (M[p] & M[0x85CB]) | M[0xFB];
      if ((M[0x85D0] & 0x80) && y === 3) {
        for (let x = 2; x >= 0; x -= 2) {
          const s = M[0xF4 + x] + 0x38;
          M[0xF4 + x] = s & 255;
          M[0xF5 + x] = (M[0xF5 + x] + 1 + (s >> 8)) & 255;
        }
      }
    }
    t = M[0x85C5] + 1;
    M[0x85C5] = t >= 0x2D ? 0 : t;
    return {};
  };

  // KEY_SCAN ($85D2): the key X (its $DC00 bit in bits 0-2, its $DC01 bit in bits 3-5): X comes back
  // $FF with N set when it is held, 0 with Z set when not
  P.KEY_SCAN = r => {
    const x = r.x & 255;
    P.wr(0xDC02, 0xFF); P.wr(0xDC03, 0);
    P.wr(0xDC00, M[0x85FB + (x & 7)] ^ 0xFF);
    const y = x >> 3;
    const v = (P.rd(0xDC01) ^ 0xFF) & M[0x85FB + y];
    return v ? { x: 0xFF, y, a: v, n: 1, z: 0 } : { x: 0, y, a: 0, n: 0, z: 1 };
  };
  P.GEN.add('WAIT_KEY');
  // WAIT_KEY ($8603): waits for the last key read to be let go, then for a key, and gives its
  // character in A (from $9125, shifted with $40 added when neither shift key is held)
  P.WAIT_KEY = function* (r) {
    M[0x85C8] = r.x & 255; M[0x85C9] = r.y & 255;
    while (P.KEY_SCAN({ x: M[0x85CF] }).n) yield;
    for (;;) {
      M[0x85CE] = 0;
      if (!P.KEY_SCAN({ x: 0x39 }).n && !P.KEY_SCAN({ x: 0x26 }).n) M[0x85CE] = 0x40;
      for (let x = 0x3F; x >= 0; x--) {
        M[0xFA] = x;
        if (x === 0x39 || x === 0x26) continue;
        if (P.KEY_SCAN({ x }).n) {
          M[0x85CF] = M[0xFA];
          const k = M[0x85CF] | M[0x85CE];
          return { a: M[0x9125 + k], x: M[0x85C8], y: M[0x85C9], c: 0 };
        }
      }
      yield;
    }
  };

  // START_EFFECT ($8655): a sound effect from the seven bytes at X (low) and Y (high): its slot,
  // the control byte, attack and decay, sustain and release, the pitch, the pulse width with the
  // release time's index in its high bits, and how long it holds (frames of the interrupt)
  P.START_EFFECT = r => {
    M[0xF8] = r.x & 255; M[0xF9] = r.y & 255;
    const b = M[0xF8] | M[0xF9] << 8, rec = i => M[(b + i) & 0xFFFF];
    const slot = rec(0);
    M[0x86C6] = slot;
    M[0x86C8 + slot] = 0x80;
    const v = M[0x86DC + slot];
    P.wr(0xD404 + v, rec(1) & 0xFE);
    P.wr(0xD405 + v, rec(2));
    P.wr(0xD406 + v, rec(3));
    P.wr(0xD402 + v, 0);
    P.wr(0xD400 + v, 0);
    M[0x86C5] = rec(5);
    P.wr(0xD403 + v, rec(5) & 0x0F);
    P.wr(0xD401 + v, rec(4));
    P.wr(0xD404 + v, rec(1));
    const x = M[0x86C6];
    M[0x86D8 + x] = rec(1) & 0xFE;
    M[0x86CC + x] = rec(4);
    M[0x86D0 + x] = M[0x86DF + (rec(3) & 0x0F)];
    M[0x86C8 + x] = rec(6);
    return { x, y: 6, a: rec(6) };
  };
  // EFFECT_TICK ($86EF), from the interrupt: the second voice's effect, held for its count, then
  // let go (the gate off), then after its release time silenced
  P.EFFECT_TICK = r => {
    const x = 1;
    let a = M[0x86C8 + x];
    if (a) {
      if (a & 0x80) return { x };
      if (--M[0x86C8 + x]) return { x };
      P.wr(0xD404 + M[0x86DC + x], M[0x86D8 + x]);
      M[0x86D4 + x] = M[0x86D0 + x];
    }
    if (!M[0x86D4 + x]) return { x };
    if (--M[0x86D4 + x]) return { x };
    return P.CUT_EFFECT({ x });
  };
  // CUT_EFFECT ($8716): the effect in slot X stopped and its voice silenced
  P.CUT_EFFECT = r => {
    const x = r.x & 255, y = M[0x86DC + x];
    M[0x86C8 + x] = 0;
    P.wr(0xD406 + y, 0); P.wr(0xD404 + y, 0);
    return { a: 0, y, z: 1, n: 0 };
  };

  // UNPACK_DASHBOARD ($87C4): the dashboard put together from the table under the I/O area at
  // $D400 (13 runs of bytes, each a length and where it goes), its screen and colour bytes to $7C00
  // and colour RAM, and 17 rows from $4A00 cleared
  P.UNPACK_DASHBOARD = r => {
    P.wr(0xD01A, 0);
    M[1] = 0x34;
    M[0x1E] = 0x40; M[0x1F] = 0xD4;
    for (let x = 0; x !== 0x27; x += 3) {
      const n = M[0xD400 + x];
      M[0x08] = n;
      M[0x16] = n ? 0 : 1;
      M[0x20] = M[0xD401 + x]; M[0x21] = M[0xD402 + x];
      const s = M[0x1E] | M[0x1F] << 8, d = M[0x20] | M[0x21] << 8;
      let y = 0;
      do { M[(d + y) & 0xFFFF] = M[(s + y) & 0xFFFF]; y = (y + 1) & 255; } while (y !== M[0x08]);
      const t = M[0x1E] + M[0x08];
      M[0x1E] = t & 255;
      M[0x1F] = (M[0x1F] + M[0x16] + (t >> 8)) & 255;
    }
    let t = M[0x1E] + 0x40;
    M[0x20] = t & 255; M[0x21] = (M[0x1F] + 1 + (t >> 8)) & 255;
    let s = M[0x1E] | M[0x1F] << 8, s2 = M[0x20] | M[0x21] << 8;
    let y = 0;
    do { M[0x7C00 + y] = M[(s + y) & 0xFFFF]; M[0x0400 + y] = M[(s2 + y) & 0xFFFF]; y = (y - 1) & 255; } while (y);
    M[0x1F]++; M[0x21]++;
    s = M[0x1E] | M[0x1F] << 8; s2 = M[0x20] | M[0x21] << 8;
    for (y = 0x3F; y >= 0; y--) { M[0x7D00 + y] = M[(s + y) & 0xFFFF]; M[0x0500 + y] = M[(s2 + y) & 0xFFFF]; }
    M[0x52] = 0x11;
    P.FILL_ROWS({ x: 0, y: 0x4A, a: 0 });
    M[1] = 0x35;
    P.wr(0xD01A, 1);
    for (let x = 0; x < 256; x++) io.colourWrite(x, M[0x0400 + x]);
    for (let x = 0; x < 0x40; x++) io.colourWrite(0x100 + x, M[0x0500 + x]);
    return { x: 0xFF, a: M[0x0500], y: 0xFF };
  };

  // SAVE_RESTORE_SCREEN ($886A): with X below $80 the part of the bitmap at $62A0 that a menu
  // covers (eight rows of 256 bytes and a ninth of 64) goes to $57C0 and colour RAM to $6DE0; with
  // X of $80 or more both come back, and the tables under the I/O area at $D000-$D3FF and $DD00
  // are saved to $7C00 and $7B00
  P.SAVE_RESTORE_SCREEN = r => {
    M[0x16] = r.x & 255;
    const back = M[0x16] & 0x80;
    M[0x1F] = 0x57; M[0x1E] = 0xC0; M[0x21] = 0x62; M[0x20] = 0xA0;
    let x = 8, y = 0xFF;
    for (;;) {
      const a = M[0x1E] | M[0x1F] << 8, b = M[0x20] | M[0x21] << 8;
      do {
        if (back) M[(a + y) & 0xFFFF] = M[(b + y) & 0xFFFF];
        else M[(b + y) & 0xFFFF] = M[(a + y) & 0xFFFF];
        y = (y - 1) & 255;
      } while (y !== 0xFF);
      const t = M[0x20] + 0x40;
      M[0x20] = t & 255; M[0x21] = (M[0x21] + 1 + (t >> 8)) & 255;
      M[0x1F]++;
      x--;
      if (x < 0) break;
      if (x) { y = 0xFF; continue; }
      y = 0x3F;
    }
    if (!back) {
      for (let i = 0; i < 256; i++) {
        M[0x6DE0 + i] = col(i); M[0x6F20 + i] = col(0x100 + i);
        M[0x7060 + i] = col(0x200 + i); M[0x71A0 + i] = col(0x300 + i);
      }
      return { x: 0 };
    }
    for (let i = 0; i < 256; i++) {
      io.colourWrite(i, M[0x6DE0 + i]); io.colourWrite(0x100 + i, M[0x6F20 + i]);
      io.colourWrite(0x200 + i, M[0x7060 + i]); io.colourWrite(0x300 + i, M[0x71A0 + i]);
    }
    P.wr(0xD01A, 0);
    M[1] = 0x34;
    for (let i = 0; i < 256; i++) {
      M[0x7C00 + i] = M[0xD000 + i]; M[0x7D00 + i] = M[0xD100 + i];
      M[0x7E00 + i] = M[0xD200 + i]; M[0x7F00 + i] = M[0xD300 + i];
      M[0x7B00 + i] = M[0xDD00 + i];
    }
    M[1] = 0x35;
    P.wr(0xD01A, 1);
    return { x: 0, a: 1 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
