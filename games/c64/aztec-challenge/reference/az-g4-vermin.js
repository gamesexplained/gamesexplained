/* az-g4-vermin */
// Group 4: level 4, the Vermin ($6595-$6CEB).
(function (root) {
  'use strict';
  function install(P, H, K) {
    const M = P.M, io = () => P.io;
    const vw = (r, v) => io().vicWrite(r, v & 255), vr = (r) => io().vicRead(r) & 255;
    const col = (i, v) => io().colourWrite(i, v);
    const inc = (r) => vw(r, vr(r) + 1), dec = (r) => vw(r, vr(r) - 1);
    const orV = (r, b) => vw(r, vr(r) | b), andV = (r, b) => vw(r, vr(r) & b);
    const dyx = (x) => (x || 256) * (256 * 5 - 1 + 7) - 1;

    // $6595 vermin
    P.stages[0x6595] = function* () {
      K.chrout(0x93);
      P.fill_wall();
      M[0x07F8] = 0x90; M[0x07F9] = 0x91;
      vw(0x00, 0x60); vw(0x02, 0x60); vw(0x01, 0x9B); vw(0x03, 0xB0);
      vw(0x1C, 3); vw(0x25, 9); vw(0x26, 9); vw(0x27, 7); vw(0x28, 1);
      M[0x45] = M[0x69] = M[0x17] = 0;
      vw(0x15, 3);
      M[0x1F] = 1;
      vw(0x18, (vr(0x18) & 0xF0) | 0x0E);
      orV(0x16, 0x10);
      vw(0x22, 6); vw(0x23, 0x0B);
      M[0x16] = 0;
      for (let x = 0; x < 256; x++) { M[0x0658 + x] = 0x7E; col(0x258 + x, 0x0A); }
      for (let x = 0; x < 0x90; x++) { M[0x0758 + x] = 0x7E; col(0x358 + x, 0x0A); }
      vw(0x16, (vr(0x16) & 0xF7) | 7);
      for (;;) {
        do {                                                 // $662C: a pixel of fine scroll
          dec(0x16);
          yield* H.wait(dyx(7));
          yield* P.vermin_step();
        } while (vr(0x16) & 7);
        // $6643: the raster's low byte at 0, on line 0 or 256. An interrupt can cover the whole of a line,
        // and the game then leaves a frame later, so in the lockstep the loop's exit is a checkpoint,
        // the game running until it leaves; on the page the port waits for the next such line
        if (P.clocked) { const ln = vr(0x12) | (vr(0x11) & 0x80) << 1; yield { wait: (ln & 255) === 0 ? ln : ln < 256 ? 256 : 0, at: 0x6648 }; }
        else yield { cp: H.cp(0x6648) };
        M[0x18] = 0x58; M[0x1A] = 0x59; M[0x19] = M[0x1B] = 6;
        for (let k = 0; k < 9; k++) {                        // rows 15-23 a character left
          const d = M[0x18] | M[0x19] << 8, s = M[0x1A] | M[0x1B] << 8;
          for (let y = 0x26; y >= 0; y--) M[d + y] = M[s + y];
          if (k === 8) break;
          let v = M[0x18] + 0x28; M[0x18] = v & 255; if (v > 255) M[0x19]++;
          v = M[0x1A] + 0x28; M[0x1A] = v & 255; if (v > 255) M[0x1B]++;
        }
        M[0x1C] = 0x7F; M[0x1D] = 6;
        do {
          M[M[0x1C] | M[0x1D] << 8] = 0x7E;
          const v = M[0x1C] + 0x28; M[0x1C] = v & 255; if (v > 255) M[0x1D]++;
        } while (M[0x1C] !== 0x0F);
        orV(0x16, 7);
        K.udtim();
        if (K.stop()) return 0x1000;
        // $6AF1 vermin_progress
        M[0x69] = (M[0x69] + 1) & 255;
        if (M[0x69] === 0x70) {
          M[0x69] = 0; M[0x45] = (M[0x45] + 1) & 255;
          P.music_stage();
          if (M[0x45] === 9) { M[0x68] >>= 2; return 0x1300; }
        }
      }
    };
    // $6CD0 fill_wall
    P.fill_wall = function () {
      for (let x = 0; x < 256; x++) for (const p of [0, 0x100, 0x200]) { M[0x0400 + p + x] = 0x67; col(p + x, 3); }
    };
    // $66AA vermin_step
    P.vermin_step = function* () {
      M[0x1E] = (M[0x1E] - 1) & 255;
      if (M[0x1E]) return;
      M[0x1E] = 3;
      yield* P.vermin_spawn();
      P.vermin_jump();
      yield* P.vermin_bite();
      if (M[0x16]) H.jump(yield* P.vermin_bitten());
      if (M[0x17]) return;
      M[0x1F] = (M[0x1F] - 1) & 255;
      if (M[0x1F]) return;
      M[0x1F] = 3;
      M[0x07F8] = (M[0x07F8] + 2) & 255; M[0x07F9] = (M[0x07F9] + 2) & 255;
      if (M[0x07F8] >= 0x96) { M[0x07F8] = 0x90; M[0x07F9] = 0x91; }
    };
    // $6700 vermin_spawn, the six placers ($67A0-$683A) and the movers ($68F0)
    P.vermin_spawn = function* () {
      M[0x14] = (M[0x14] - 1) & 255;
      if (M[0x14]) return P.vermin_move();
      M[0x14] = M[0x57];
      const SPAWN = [
        [0x670E, 0x01, 0x01, function* () { M[0x07FA] = 0x9A; vw(0x29, 8); vw(0x04, yield* H.live(0x67AD, 'cia1', 'a')); vw(0x05, 0xB6); orV(0x10, 4); P.vermin_move(); }],
        [0x6724, 0x02, 0x02, function* () { M[0x07FB] = 0x9B; vw(0x2A, 1); vw(0x06, yield* H.live(0x67CD, 'cia1', 'a')); vw(0x07, 0xB3); orV(0x10, 8); P.vermin_move(); }],
        [0x673A, 0x04, 0x04, function* () { M[0x07FC] = 0x9B; vw(0x2B, 7); vw(0x09, 0x10); vw(0x08, yield* H.live(0x67F2, 'cia1', 'a')); P.vermin_move(); }],
        [0x6750, 0x08, 0x08, function* () { M[0x07FD] = 0x9D; vw(0x2C, 0x0A); vw(0x0B, 0x10); vw(0x0A, yield* H.live(0x680C, 'cia1', 'a')); orV(0x17, 0x20); P.vermin_move(); }],
        [0x6766, 0x10, 0x00, function* () { M[0x07FE] = 0x9C; vw(0x2D, 5); vw(0x0C, yield* H.live(0x6827, 'cia1', 'a')); vw(0x0D, 0xAD); orV(0x10, 0x40); P.vermin_move(); }],
        [0x677C, 0x20, 0x20, function* () { M[0x07FF] = 0x9E; vw(0x2E, 0x0C); vw(0x0E, yield* H.live(0x6847, 'cia1', 'a')); vw(0x0F, 0xAA); orV(0x10, 0x80); orV(0x1D, 0x80); }],
      ];
      for (const [cp, bit, mark, place] of SPAWN) {
        const t = yield* H.live(cp, 'cia1', 'a');
        if (!(t & bit) || (M[0x2A] & bit)) continue;
        M[0x2A] |= mark;                                    // creature E's is ORA #$00 ($6772)
        yield* place();
      }
      P.vermin_move();
    };
    // $68F0 vermin_move
    P.vermin_move = function () {
      const s = M[0x2A];
      if (s & 0x01) moveLeft(0x04, 0x04, 0x01);             // A, $6930
      if (s & 0x02) moveB();                               // B, $6965
      if (s & 0x04) moveC();                               // C, $69E0
      if (s & 0x08) moveD();                               // D, $6A30
      if (s & 0x10) moveLeft(0x0C, 0x40, 0x10);            // E, $6A80 (never: its bit is never set)
      if (s & 0x20) moveLeft(0x0E, 0x80, 0x20);            // F, $6AC0
    };
    // A, E and F: three pixels left, carrying the ninth bit; off the left edge the creature is gone
    function moveLeft(r, sb, bit) {
      orV(0x15, sb);
      for (let x = 2; x >= 0; x--) {
        dec(r);
        if (vr(r) !== 0) continue;
        if (!(H.msb() & sb)) { M[0x2A] &= ~bit & 255; andV(0x15, ~sb); return; }
        H.setMsb(H.msb() & ~sb);
      }
    }
    function moveB() {
      orV(0x15, 8);
      for (let x = 2; x >= 0; x--) {
        dec(0x06);
        if (vr(0x06) === 0) {
          if (!(H.msb() & 8)) { M[0x2A] &= 0xFD; andV(0x15, 0xF7); return; }
          H.setMsb(H.msb() & 0xF7);
        }
        if (!M[0x2B]) { dec(0x07); if (vr(0x07) < 0x90) { M[0x2B] = (M[0x2B] + 1) & 255; return; } }
        else { inc(0x07); if (vr(0x07) >= 0xB0) { M[0x2B] = 0; return; } }
      }
    }
    function moveC() {
      orV(0x15, 0x10);
      if (!M[0x2C]) {
        for (let x = 3; x >= 0; x--) { inc(0x09); if (vr(0x09) >= 0xB0) { M[0x2C] = (M[0x2C] + 1) & 255; return; } dec(0x08); }
        return;
      }
      for (let x = 2; x >= 0; x--) { dec(0x08); if (vr(0x08) === 0) { M[0x2A] &= 0xFB; andV(0x15, 0xEF); M[0x2C] = 0; return; } }
    }
    function moveD() {
      orV(0x15, 0x20);
      if (!M[0x2D]) {
        for (let x = 4; x >= 0; x--) {
          inc(0x0B);
          if (vr(0x0B) >= 0xB0) { M[0x2D] = (M[0x2D] + 1) & 255; M[0x07FD] = 0x9C; andV(0x17, 0xDF); return; }
        }
        return;
      }
      for (let x = 2; x >= 0; x--) { dec(0x0A); if (vr(0x0A) === 0) { M[0x2A] &= 0xF7; andV(0x15, 0xDF); M[0x2D] = 0; return; } }
    }
    // $6B10 vermin_jump
    P.vermin_jump = function () {
      if (!M[0x17]) {
        if (!(H.joy() & 1)) M[0x17] = 2;
        else if (!(H.joy() & 2)) M[0x17] = 1;
        else return;
      }
      const s = M[0x17];
      const up = (n, top, next) => {
        M[0x07F8] = 0x96; M[0x07F9] = 0x97;
        for (let x = 0; x < n; x++) { dec(0x01); dec(0x03); }
        if (vr(0x03) < top) M[0x17] = next;
      };
      const down = (n) => {
        M[0x07F8] = 0x98; M[0x07F9] = 0x99;
        for (let x = 0; x < n; x++) { inc(0x03); inc(0x01); }
        if (vr(0x03) >= 0xB0) { M[0x17] = 0; M[0x07F8] = 0x90; M[0x07F9] = 0x91; }
      };
      if (s === 1) up(4, 0x90, 3);
      else if (s === 2) up(5, 0x70, 4);
      else if (s === 3) down(4);
      else if (s === 4) down(6);
    };
    // $6BE0 vermin_bite
    P.vermin_bite = function* () {
      if (!((yield* H.live(0x6BE3, 'collide', 'a')) & 2)) { M[0x15] = 0; return; }
      M[0x15] = (M[0x15] + 1) & 255; M[0x68] = (M[0x68] + 1) & 255;
      if (M[0x15] === 8) { M[0x16] = (M[0x16] + 1) & 255; M[0x15] = 0; }
    };
    // $6C40 vermin_bitten, then $6C00 vermin_lost; returns the stage to go on to
    P.vermin_bitten = function* () {
      M[0x07F8] = 0x8C; M[0x07F9] = 0x8D;
      do {
        inc(0x01); inc(0x03);
        if (M[0x2A] & 4) inc(0x09);
        if (M[0x2A] & 8) inc(0x0B);
        yield* H.wait(dyx(0x18));
      } while (vr(0x03) < 0xB8);
      M[0x07F8] = 0xA0; M[0x07F9] = 0x9F;
      vw(0x00, vr(0x02) + 0x18);
      vw(0x01, 0xB0); vw(0x03, 0xB0);
      M[0x17] = 1;
      for (;;) {                                            // $6C92
        if (vr(0x09) < 0xB0) inc(0x09);
        if (vr(0x0B) < 0xB0) inc(0x0B);
        else if (vr(0x09) >= 0xB0) break;
        yield* H.wait(dyx(8));
      }
      yield* H.wait(dyx(0));
      yield* H.wait(dyx(0));                                // $6C00
      M[0x2A] = 0; vw(0x15, 0);
      M[0x02] = (M[0x02] + 1) & 255;
      if (M[0x02] === 5) { andV(0x16, 0xC8); M[0x68] >>= 2; return 0x1300; }
      M[0x69] = 0;
      P.music_reset();
      return 0x6595;
    };
  }
  (root.AZ_GROUPS = root.AZ_GROUPS || []).push(install);
  if (typeof module !== 'undefined') module.exports = install;
})(typeof globalThis !== 'undefined' ? globalThis : this);
