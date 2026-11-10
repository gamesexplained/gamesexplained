/* az-g2-stairs */
// Group 2: level 2, the Stairs ($6CF5-$71FB).
(function (root) {
  'use strict';
  function install(P, H, K) {
    const M = P.M, io = () => P.io;
    const vw = (r, v) => io().vicWrite(r, v & 255), vr = (r) => io().vicRead(r) & 255;
    const col = (i, v) => io().colourWrite(i, v);
    const inc = (r) => vw(r, vr(r) + 1), dec = (r) => vw(r, vr(r) - 1);
    const dyx = (x) => (x || 256) * (256 * 5 - 1 + 7) - 1;
    const rollPtr = (a) => { M[a] = (M[a] + 1) & 255; if (M[a] === 0xAE) M[a] = 0xAB; };

    // $6CF5 stairs
    P.stages[0x6CF5] = function* () {
      yield* H.live(0x6CF8, 'collide', 'a');
      K.chrout(0x93);
      P.colour_white();
      P.stairs_rows(0x0400, 8, 0x07C0, 0x28, 0);
      M[0x07FC] = 0xA3; M[0x07FD] = 0xA4;
      vw(0x2B, 1); vw(0x2C, 1); vw(0x15, 0x37);
      vw(0x08, 0x90); vw(0x0A, 0x90); vw(0x09, 0x9B); vw(0x0B, 0xB0);
      vw(0x1C, 0x30); vw(0x25, 9); vw(0x26, 7); vw(0x21, 0x0C);
      // $6D40: meant to colour the screen light grey, each loop stops after one cell: from X = $FF a
      // DEX gives $FE, which BPL takes for negative
      for (const i of [0xFF, 0x1FF, 0x2FF, 0x3E7]) col(i, 0x0F);
      M[0x45] = M[0x69] = M[0x11] = M[0x6A] = 0;
      vw(0x18, (vr(0x18) & 0xF0) | 0x0E);
      vw(0x16, vr(0x16) | 0x10);
      vw(0x22, 0x0C); vw(0x23, 0x0F);
      M[0x07F8] = M[0x07F9] = M[0x07FA] = 0xAB;
      vw(0x28, 1); vw(0x29, 1); vw(0x2A, 1);
      vw(0x01, 0); vw(0x03, 0); vw(0x05, 0);
      vw(0x00, 0x30); vw(0x02, 0x60); vw(0x04, 0xA0);
      vw(0x17, 7); vw(0x1D, 7);
      M[0x12] = 0; M[0x10] = 1;
      vw(0x11, (yield* H.live(0x6DC1, 'd011', 'a')) & 0xF0);   // $6DBE: the raster's ninth bit as the game read it
      for (;;) {
        do {                                                 // $6DC6: a line of fine scroll
          // INC $D011 reads the raster's ninth bit as it is then and writes it back as the compare's:
          // the port takes the register as the game left it
          vw(0x11, yield* H.live(0x6DC9, 'd011inc', 'a'));
          yield* H.wait(dyx(0x0C));
          yield* P.stairs_blocks();
        } while ((vr(0x11) & 7) !== 7);
        P.stairs_legs();
        M[0x10] = (M[0x10] + 1) & 255;
        if (M[0x10] === 1) yield* P.stairs_rows_a();
        else if (M[0x10] === 2) yield* P.stairs_rows_b();
        else { M[0x10] = 0; yield* P.stairs_rows_c(); }
        K.udtim();
        if (K.stop()) return 0x1000;
      }
    };
    // $6E10 stairs_legs
    P.stairs_legs = function () {
      if (!M[0x11]) {
        M[0x07FC] = (M[0x07FC] + 2) & 255; M[0x07FD] = (M[0x07FD] + 2) & 255;
        if (M[0x07FC] === 0xA9) M[0x11] = (M[0x11] + 1) & 255;
      } else {
        M[0x07FC] = (M[0x07FC] - 2) & 255; M[0x07FD] = (M[0x07FD] - 2) & 255;
        if (M[0x07FC] === 0xA3) M[0x11] = 0;
      }
    };
    // $6E70 colour_white (the Piranha uses it too)
    P.colour_white = function () { for (let i = 0; i < 0x3E8; i++) col(i, 1); };
    // three rows from $4800 drawn `copies` times from `at` on, then `tail` bytes of them at `tailAt`,
    // and the first row at $0400 when `top` is set
    P.stairs_rows = function (at, copies, tailAt, tail, top) {
      for (let k = 0; k < copies; k++) for (let x = 0x77; x >= 0; x--) M[at + 0x78 * k + x] = M[0x4800 + x];
      for (let x = tail - 1; x >= 0; x--) M[tailAt + x] = M[0x4800 + x];
      if (top) for (let x = 0x27; x >= 0; x--) M[0x0400 + x] = M[0x4800 + x];
    };
    const rowsWait = function* (at) { yield { wait: 0xF5, at }; vw(0x11, vr(0x11) & 0xF0); };
    // $6E90 stairs_rows_a, $6F10 stairs_rows_b, $6F80 stairs_rows_c
    P.stairs_rows_a = function* () { yield* rowsWait(0x6E97); P.stairs_rows(0x0400, 8, 0x07C0, 0x28, 0); };
    P.stairs_rows_b = function* () { yield* rowsWait(0x6F17); P.stairs_rows(0x0428, 8, 0, 0, 0); };
    P.stairs_rows_c = function* () { yield* rowsWait(0x6F87); P.stairs_rows(0x0450, 7, 0x0798, 0x50, 1); };

    // $7000 stairs_blocks
    P.stairs_blocks = function* () {
      M[0x12] = (M[0x12] - 1) & 255;
      if (M[0x12]) return yield* P.stairs_hit();
      M[0x12] = 3;
      for (let x = M[0x53]; x >= 0 && x < 0x80; x--) inc(0x01);
      for (let x = M[0x54]; x >= 0 && x < 0x80; x--) inc(0x03);
      for (let x = M[0x55]; x >= 0 && x < 0x80; x--) inc(0x05);
      rollPtr(0x07F8); rollPtr(0x07F9); rollPtr(0x07FA);
      if (vr(0x01) >= 0xF0) {
        const x = vr(0x08); vw(0x00, x);
        if (x < 0x50 && !((yield* H.live(0x7064, 'cia1', 'a')) & 4)) H.setMsb(H.msb() | 1);
        else H.setMsb(H.msb() & 0xFE);
      }
      if (vr(0x03) >= 0xF0) {
        const x = yield* H.live(0x7085, 'cia1', 'a'); vw(0x02, x);
        if (x < 0x50 && !((yield* H.live(0x708F, 'cia1', 'a')) & 8)) H.setMsb(H.msb() | 2);
        else H.setMsb(H.msb() & 0xFD);
      }
      if (vr(0x05) >= 0xF0) {
        const x = yield* H.live(0x70B0, 'cia2', 'a'); vw(0x04, x);
        if (x < 0x50 && !((yield* H.live(0x70BA, 'cia1', 'a')) & 2)) H.setMsb(H.msb() | 4);
        else H.setMsb(H.msb() & 0xFB);
      }
      // $6E45 stairs_progress
      M[0x69] = (M[0x69] + 1) & 255;
      if (M[0x69] === 0x80) {
        M[0x69] = 0; M[0x6A] = (M[0x6A] + 1) & 255; M[0x45] = (M[0x45] + 1) & 255;
        P.music_stage();
        if (M[0x6A] === 8) H.jump(0x1300);
        M[0x68] = (M[0x68] + 1) & 255;
      } else if (!(M[0x69] & 0x0F)) M[0x68] = (M[0x68] + 1) & 255;
      return yield* P.stairs_hit();
    };
    // $70E0 stairs_hit
    P.stairs_hit = function* () {
      if (!((yield* H.live(0x70E3, 'collide', 'a')) & 0x10)) return P.stairs_stick();
      M[0x07FC] = 0xAE; M[0x07FD] = 0xAF;
      const fall = (y, p) => { for (let k = 0; k < 9; k++) inc(y); rollPtr(p); };
      do {
        if (vr(0x01) < 0xF8) fall(0x01, 0x07F8);
        if (vr(0x03) < 0xF8) fall(0x03, 0x07F9);
        if (vr(0x05) < 0xF8) fall(0x05, 0x07FA);
        yield* H.wait(dyx(0x30));
      } while (vr(0x01) < 0xF8 || vr(0x03) < 0xF8 || vr(0x05) < 0xF8);
      yield* H.wait(dyx(0));
      M[0x02] = (M[0x02] + 1) & 255;
      if (M[0x02] === 5) { M[0x68] >>= 1; H.jump(0x1300); }
      yield* H.live(0x7189, 'collide', 'a');
      M[0x69] = 0; M[0x45] = 0; vw(0x10, 0);
      P.music_reset();
      H.jump(0x6CF5);
    };
    // $71A0 stairs_stick
    P.stairs_stick = function () {
      const a = H.joy() ^ 0x1F;
      if (!a) return;
      if (a < 7) {
        if (vr(0x08) < 0x34 && !(H.msb() & 0x10)) return;
        for (let x = 3; x >= 0;) {
          dec(0x08); dec(0x0A);
          if (vr(0x0A) === 0) { H.setMsb(H.msb() & 0xCF); continue; }
          x--;
        }
        return;
      }
      if (vr(0x08) >= 0x2A && (H.msb() & 0x10)) return;
      for (let x = 3; x >= 0;) {
        inc(0x08); inc(0x0A);
        if (vr(0x0A) === 0) { H.setMsb(H.msb() | 0x30); continue; }
        x--;
      }
    };
  }
  (root.AZ_GROUPS = root.AZ_GROUPS || []).push(install);
  if (typeof module !== 'undefined') module.exports = install;
})(typeof globalThis !== 'undefined' ? globalThis : this);
