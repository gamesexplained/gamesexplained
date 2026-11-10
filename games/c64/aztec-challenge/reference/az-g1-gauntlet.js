/* az-g1-gauntlet */
// Group 1: level 1, the Gauntlet ($6000-$652E), and the music's stage changer ($6530), which every
// level but Hopaztec calls. The game leaves its routines from deep inside with two or four PLAs and a
// JMP (a spear's hit, $63C4; the temple complete, $6347); here those throw H.jump(address), which
// the program catches and runs the stage at that address.
(function (root) {
  'use strict';
  function install(P, H, K) {
    const M = P.M, io = () => P.io;
    const sid = (r, v) => io().sidWrite(r, v);
    const vw = (r, v) => io().vicWrite(r, v & 255), vr = (r) => io().vicRead(r) & 255;
    const col = (i, v) => io().colourWrite(i, v);
    const inc = (r) => vw(r, vr(r) + 1), dec = (r) => vw(r, vr(r) - 1);
    const dyx = (x, y) => (x || 256) * ((y || 256) * 5 - 1 + 7) - 1;

    // $6000 gauntlet
    P.stages[0x6000] = function* () {
      K.chrout(0x93);
      for (let x = 0; x < 0x300; x++) { M[0x0400 + x] = 0; col(x, M[0x5E]); }
      for (let x = 0; x < 0xE8; x++) col(0x300 + x, 8);
      vw(0x21, M[0x5F]);
      M[0x07F8] = 0x80; M[0x07F9] = 0x81;
      vw(0x01, 0xC8); vw(0x03, 0xDC); vw(0x00, 0xA8); vw(0x02, 0xA8);
      vw(0x15, 0x0F); vw(0x1C, 0x0F); vw(0x25, 9); vw(0x26, 1); vw(0x27, 1); vw(0x28, 1);
      M[0x40] = M[0x42] = 0xB8; M[0x41] = 0x05; M[0x43] = 0xD9; M[0x44] = 0x78; M[0x47] = M[0x48] = 0;
      P.music_reset();
      M[0x46] = 0x58; M[0x49] = 4;
      P.temple_grow();
      M[0x07FA] = 0x8A; M[0x07FB] = 0x8B;
      vw(0x06, 0x60); vw(0x04, 0xE0); vw(0x29, 0); vw(0x2A, 0);
      vw(0x1B, 0x0C); vw(0x10, 0x0C); vw(0x1D, 0x0C);
      M[0x16] = 1; M[0x12] = 1;
      vw(0x18, (vr(0x18) & 0xF0) | 0x0E);
      vw(0x16, vr(0x16) | 0x10);
      vw(0x22, 9); vw(0x23, 1);
      for (;;) {                                            // $60E3
        for (const [k, src] of [0x5000, 0x50F0, 0x51E0, 0x52D0, 0x53C0].entries()) {
          for (let x = 0; x < 0xF0; x++) { M[0x0630 + x] = M[src + x]; col(0x230 + x, 8); }
          if (k < 4) yield* P.gauntlet_frame();
        }
        yield* P.gauntlet_spears();
        P.music_stage();
        if (H.joy() === 0x1F) M[0x4B] = 0;
        else { M[0x4B] = (M[0x4B] + 1) & 255; if (M[0x4B] === 8) return 0x6470; }
      }
    };

    // $616B gauntlet_frame
    P.gauntlet_frame = function* () {
      // 44 spear steps, a delay after each: $10 counts them down, and $11 is loaded with what the
      // spears routine left in A ($2C the first time), then counted down to 0
      let a = 0x2C;
      for (M[0x10] = 0x2C; M[0x10]; M[0x10] = (M[0x10] - 1) & 255) {
        M[0x11] = a;
        a = yield* P.gauntlet_spears();
        yield* H.wait((M[0x11] || 256) * 8 - 1);
        M[0x11] = 0;
      }
      for (const [to, from] of [[0x07C0, 0x0798], [0x0798, 0x0770], [0x0770, 0x0748], [0x0748, 0x0720]])
        for (let x = 0x27; x >= 0; x--) M[to + x] = M[from + x];
      for (let x = 0x27; x >= 0; x--) {
        const a = yield* H.live(0x61AD, 'cia1', 'a');
        M[0x0720 + x] = a < 0x30 ? 0x79 : a < 0x70 ? 0x7A : 0x7B;
      }
      M[0x38] = 0x9D; M[0x3A] = 0xC5; M[0x39] = M[0x3B] = 0x07; M[0x3C] = 0x1D;
      do {                                                  // $61DF: the ground comes forward
        const s = M[0x38] | M[0x39] << 8, d = M[0x3A] | M[0x3B] << 8;
        for (let y = M[0x3C]; y >= 0; y--) M[(d + y) & 0xFFFF] = M[(s + y) & 0xFFFF];
        let v = M[0x38] - 0x26; M[0x38] = v & 255; if (v < 0) M[0x39] = (M[0x39] - 1) & 255;
        v = M[0x3A] - 0x26; M[0x3A] = v & 255; if (v < 0) M[0x3B] = (M[0x3B] - 1) & 255;
        M[0x3C] = (M[0x3C] - 2) & 255;
      } while (M[0x38] !== 0x6D);
      if (M[0x45] !== 9) {
        M[0x46] = (M[0x46] - 1) & 255;
        if (M[0x46] === 0) { M[0x46] = 0x58; P.temple_grow(); }
      }
      if (M[0x47]) return P.gauntlet_jump();
      if (!(H.joy() & 1)) { M[0x47] = 1; M[0x07F8] = 0x84; M[0x07F9] = 0x85; return P.gauntlet_jump(); }
      if (M[0x48]) return P.gauntlet_duck();
      if (!(H.joy() & 2)) { M[0x48] = 1; return P.gauntlet_duck(); }
      P.gauntlet_run();
    };
    // $6250 gauntlet_jump
    P.gauntlet_jump = function () {
      if (M[0x47] !== 2) {
        for (let x = 0; x < 9; x++) { dec(0x01); dec(0x03); }
        if (vr(0x01) < 0xA8) { M[0x47] = 2; M[0x07F8] = 0x80; M[0x07F9] = 0x81; }
        return;
      }
      for (let x = 0; x < 9; x++) { inc(0x01); inc(0x03); }
      if (vr(0x01) >= 0xC8) M[0x47] = 0;
    };
    // $6290 gauntlet_duck
    P.gauntlet_duck = function () {
      if (M[0x07F8] === 0x86) { M[0x07F8] = 0x88; M[0x07F9] = 0x89; } else { M[0x07F8] = 0x86; M[0x07F9] = 0x87; }
      M[0x49] = (M[0x49] - 1) & 255;
      if (M[0x49] === 0) { M[0x49] = 4; M[0x48] = 0; }
    };
    // $62C0 gauntlet_run
    P.gauntlet_run = function () {
      if (M[0x07F8] === 0x80) { M[0x07F8] = 0x82; M[0x07F9] = 0x83; } else { M[0x07F8] = 0x80; M[0x07F9] = 0x81; }
    };
    // $62E0 temple_grow; at stage 8 the level is won ($6347: four PLAs, JMP $1300)
    P.temple_grow = function () {
      if (M[0x45] === 8) H.jump(0x1300);
      const src = (M[0x45] & 1) ? 0x5600 : 0x5500;
      const at = M[0x40] | M[0x41] << 8, cat = M[0x42] | M[0x43] << 8;
      for (let y = 0; y < M[0x44]; y++) { M[(at + y) & 0xFFFF] = M[src + y]; col(cat + y - 0xD800, M[0x5E]); }
      M[0x45] = (M[0x45] + 1) & 255;
      if (src === 0x5500) return;
      if (M[0x45] === 8) {
        for (let x = 0; x < 4; x++) { M[0x061A + x] = 0xFA + x; col(0x21A + x, 8); }
        M[0x3D] = 0xFE;
        return;
      }
      M[0x44] = (M[0x44] + 0x28) & 255;
      const v = M[0x40] - 0x28;
      M[0x40] = M[0x42] = v & 255;
      if (v < 0) { M[0x41] = (M[0x41] - 1) & 255; M[0x43] = (M[0x43] - 1) & 255; }
    };
    // $634E gauntlet_spears; returns what the game leaves in A: 0 while it waits to throw, $81 the
    // pass it throws, $20 while a spear flies between its steps, the collision bits after a step
    P.gauntlet_spears = function* () {
      let a = M[0x20];
      if (!M[0x20]) {
        M[0x15] = (M[0x15] - 1) & 255; if (M[0x15]) return 0;
        M[0x16] = (M[0x16] - 1) & 255; if (M[0x16]) return 0;
        M[0x15] = M[0x16] = M[0x50];
        const t = yield* H.live(0x6364, 'cia1', 'a');
        if (!(t & 1)) {
          M[0x20] = 1;
          vw(0x05, ((yield* H.live(0x638D, 'sid', 'a')) & 8) ? 0xE0 : 0xCE);
        } else {
          M[0x20] = 2;
          vw(0x07, ((yield* H.live(0x6376, 'sid', 'a')) & 4) ? 0xE0 : 0xCE);
        }
        M[0x14] = 0xF0; sid(0x04, 0x81);
        a = 0x81;
      }
      M[0x12] = (M[0x12] - 1) & 255;
      if (M[0x12]) { M[0x13] = 0; return a; }
      M[0x12] = M[0x51];
      yield* P.spear_move();
      const c = (yield* H.live(0x63BA, 'collide', 'a')) & 0x0F;
      if (c < 0x0C && c >= 0x05) H.jump(0x6470);
      return c;
    };
    // $63D0 spear_move. Voice 1's pitch is written by the music's interrupt as well, so a checkpoint
    // comes before each write of it here, and the interrupts the game took run in the port first
    P.spear_move = function* () {
      yield { cp: H.cp(0x63D0) };
      sid(0x01, M[0x14]);
      if (M[0x20] & 1) {
        for (let x = M[0x52]; x >= 0 && x < 0x80; x--) {
          inc(0x04);
          if (vr(0x04) === 0) { H.setMsb(H.msb() ^ 0x04); inc(0x04); }
          if (vr(0x04) === 0x60 && (H.msb() & 4)) return yield* P.spear_done();
        }
      } else {
        for (let x = M[0x52]; x >= 0 && x < 0x80; x--) {
          dec(0x06);
          if (vr(0x06) === 0) { H.setMsb(H.msb() ^ 0x08); dec(0x06); }
          if (vr(0x06) === 0xE0 && (H.msb() & 8)) return yield* P.spear_done();
        }
      }
      M[0x14] = (M[0x14] - 1) & 255;
    };
    // $63F3: the spear is past the runner
    P.spear_done = function* () { yield { cp: H.cp(0x63F3) }; M[0x20] = 0; sid(0x01, 0); sid(0x04, 0x21); M[0x68] = (M[0x68] + 1) & 255; };

    // $6470 gauntlet_fall
    P.stages[0x6470] = function* () {
      yield { cp: H.cp(0x6470) };
      sid(0x04, 0x81); sid(0x01, 1);
      M[0x4B] = 0;
      M[0x07F8] = 0x8C; M[0x07F9] = 0x8D;
      if (M[0x20] === 1) {
        for (let x = 0x10; x >= 0; x--) {
          for (const r of [0x00, 0x02, 0x04, 0x00, 0x02, 0x04, 0x01, 0x03, 0x05]) inc(r);
          yield* H.wait(dyx(0x28, 0x28));
        }
      } else {
        for (let x = 0x10; x >= 0; x--) {
          for (const r of [0x00, 0x02, 0x06, 0x00, 0x02, 0x06]) dec(r);
          for (const r of [0x01, 0x03, 0x07]) inc(r);
          yield* H.wait(dyx(0x28, 0x28));
        }
      }
      M[0x10] = M[0x11] = 0;                                 // $6520 counts its delay in $10 and $11
      M[0x07F8] = 0x8E; M[0x07F9] = 0x8F;
      yield* H.wait(dyx(0, 0));
      yield { cp: H.cp(0x64F7) };
      sid(0x01, 0); vw(0x04, 0); vw(0x06, 0);
      M[0x20] = M[0x47] = M[0x48] = 0;
      yield* H.live(0x650B, 'collide', 'a');
      M[0x02] = (M[0x02] + 1) & 255;
      if (M[0x02] === 5) return 0x1300;
      P.music_reset();
      return 0x6000;
    };

    // $6530 music_stage
    P.music_stage = function () {
      const s = M[0x45];
      if (s === 2) { M[0x30] = 0x30; sid(0x0B, 0x21); return; }
      if (s === 3) { M[0x30] = 0; M[0x31] = 0x57; sid(0x12, 0x11); M[0x36] = 8; return; }
      if (s === 4) { M[0x31] = 0x49; M[0x36] = 0x0A; sid(0x12, 0x10); return; }
      if (s === 5) { sid(0x12, 0x11); return; }
      if (s === 6) { sid(0x12, 0x21); return; }
      if (s === 1) { sid(0x04, 0x21); sid(0x0B, 0x21); sid(0x12, 0x21); }
    };
  }
  (root.AZ_GROUPS = root.AZ_GROUPS || []).push(install);
  if (typeof module !== 'undefined') module.exports = install;
})(typeof globalThis !== 'undefined' ? globalThis : this);
