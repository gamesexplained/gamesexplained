/* az-g3-temple */
// Group 3: level 3, the Temple ($75DB-$7AFB, without Hopaztec's $7724).
(function (root) {
  'use strict';
  function install(P, H, K) {
    const M = P.M, io = () => P.io;
    const vw = (r, v) => io().vicWrite(r, v & 255), vr = (r) => io().vicRead(r) & 255;
    const col = (i, v) => io().colourWrite(i, v);
    const inc = (r) => vw(r, vr(r) + 1), dec = (r) => vw(r, vr(r) - 1);
    const dyx = (x) => (x || 256) * (256 * 5 - 1 + 7) - 1;

    // $7600 temple
    P.stages[0x7600] = function* () {
      vw(0x20, 0x0B); vw(0x21, 0);
      M[0x07F8] = 0x90; M[0x07F9] = 0x91;
      vw(0x00, 0); vw(0x02, 0); vw(0x01, 0xC0); vw(0x03, 0xD5);
      vw(0x1C, 3); vw(0x25, 9); vw(0x26, 9); vw(0x27, 7); vw(0x28, 1);
      M[0x1A] = 1; M[0x17] = 8;
      P.temple_wall();
      for (let i = 0; i < 0x348; i++) col(i, 0x0F);
      M[0x1F] = 3;
      vw(0x15, 3);
      vw(0x18, (vr(0x18) & 0xF0) | 0x0C);
      vw(0x16, vr(0x16) | 0x10);
      M[0x10] = 0; M[0x12] = 0x25; M[0x11] = M[0x13] = 4;
      vw(0x22, 0x0C); vw(0x23, 0x0B);
      for (let x = 0x48; x < 0xE8; x++) { M[0x0700 + x] = 0x2A; col(0x300 + x, 0x0D); }
      for (let x = 0; ;) {                                  // $76AC: the two pillars, three wide
        let done = false;
        for (let y = 0; y < 3; y++) {
          M[(M[0x10] | M[0x11] << 8) + y] = M[0x4400 + x];
          M[(M[0x12] | M[0x13] << 8) + y] = M[0x4450 + x];
          x++;
          if (x === 0x42) { done = true; break; }
        }
        if (done) break;
        let v = M[0x10] + 0x28; M[0x10] = v & 255; if (v > 255) M[0x11]++;
        v = M[0x12] + 0x28; M[0x12] = v & 255; if (v > 255) M[0x13]++;
      }
      for (;;) {                                            // $76DB
        yield* P.temple_runner();
        yield* P.temple_trap();
        yield* H.wait(dyx(0x12));
        K.udtim();
        if (K.stop()) return 0x1000;
        // $79F0 temple_caught
        const c = yield* H.live(0x79F3, 'collide', 'a');
        M[0x1E] = c;
        if ((c & 3) === 2) return yield* P.temple_caught();
        yield* H.live(0x7A05, 'collide', 'a');
      }
    };
    // $7808 temple_wall
    P.temple_wall = function () {
      K.chrout(0x93);
      for (let x = 0; x < 256; x++) { M[0x0528 + x] = M[0x4200 + x]; M[0x0628 + x] = M[0x4300 + x]; col(0x128 + x, 8); col(0x228 + x, 8); }
      vw(0x10, 0); M[0x69] = 0; M[0x45] = 0;
    };
    // $7700 temple_runner
    P.temple_runner = function* () {
      const s = M[0x17];
      if (s && s < 3) return yield* jump(s);
      const a = H.joy() ^ 0x1F;
      if (!a) return yield* run();
      if (a < 8) return;                                    // $7723: any other input stops the runner
      M[0x17] = 1;
      return yield* jump(1);
    };
    // $77B0: the jump
    function* jump(a) {
      if (a === 1) {
        M[0x07F8] = 0x96; M[0x07F9] = 0x97;
        for (let x = 0; x < 4; x++) { dec(0x01); dec(0x03); }
        if (vr(0x03) < 0xA8) M[0x17] = 2;
      } else {
        M[0x07F8] = 0x98; M[0x07F9] = 0x99;
        for (let x = 0; x < 4; x++) { inc(0x03); inc(0x01); }
        if (vr(0x03) >= 0xD5) { M[0x17] = 8; M[0x07F8] = 0x90; M[0x07F9] = 0x91; }
      }
      return yield* forward();
    }
    // $7732: the legs every fourth call, then $7758
    function* run() {
      M[0x1F] = (M[0x1F] - 1) & 255;
      if (!M[0x1F]) {
        M[0x1F] = 4;
        M[0x07F8] = (M[0x07F8] + 2) & 255; M[0x07F9] = (M[0x07F9] + 2) & 255;
        if (M[0x07F8] >= 0x96) { M[0x07F8] = 0x90; M[0x07F9] = 0x91; }
      }
      return yield* forward();
    }
    // $7758: 3 pixels right, the ninth X bits carried; off the right side the room is done
    function* forward() {
      for (let x = 2; x >= 0; x--) {
        inc(0x00); inc(0x02);
        if (vr(0x00) === 0) {
          H.setMsb((H.msb() & 3) ? H.msb() & 0xFC : H.msb() | 3);
          inc(0x00); inc(0x02);
        }
      }
      if (!(H.msb() & 3) || vr(0x00) < 0x50) return;
      let x = 0;
      for (let y = 0; y < 4; y++) { x = M[0x19]; vw(0x20 + y, M[0x44A0 + x]); M[0x19] = (M[0x19] + 1) & 255; }
      if (x >= 0x1C) M[0x19] = 0;
      // $75DB temple_room_done
      M[0x68] = (M[0x68] + 1) & 255;
      M[0x69] = (M[0x69] + 1) & 255;
      if (M[0x69] === M[0x56]) {
        M[0x69] = 0; M[0x45] = (M[0x45] + 1) & 255;
        P.music_stage();
        if (M[0x45] === 9) H.jump(0x1300);
      }
      yield* H.live(0x75FC, 'collide', 'a');
      // $7835 temple_new_room
      vw(0x15, 3);
      let t;
      do t = yield* H.live(0x783D, 'cia1', 'a'); while (!(t & 1));
      M[0x1A] = t & 7;
      vw(0x00, 0x10); vw(0x02, 0x10); vw(0x10, 0); vw(0x17, 0); vw(0x1D, 0);
    }
    // $785B temple_trap
    P.temple_trap = function* () {
      const s = M[0x1A];
      if (s === 1 || s === 5) {
        for (let x = 5; x >= 0; x--) { M[0x07FA + x] = s === 1 ? 0xB9 : 0xAB; vw(0x29 + x, s === 1 ? 1 : 7); }
        // $7870 temple_fallers
        M[0x1B] = 0; vw(0x10, 0);
        for (let x = 0; x < 0x0C; x++) vw(0x04 + x, 0);
        M[0x1C] = 4;
        yield* H.live(0x7887, 'cia1', 'a');
        M[0x1A] = (M[0x1A] + 1) & 255;
        vw(0x15, 0xFF);
        return;
      }
      if (s === 2 || s === 6) {
        // $78AC temple_fall
        const x = M[0x1B];
        for (let y = 8; y >= 0; y--) {
          inc(0x05 + x);
          if (vr(0x05 + x) >= 0xEA) {
            M[0x07FA + (x >> 1)] = (M[0x07FA + (x >> 1)] + 1) & 255;
            M[0x1B] = (M[0x1B] + 2) & 255; M[0x1C] = (M[0x1C] << 1) & 255;
            const n = M[0x1B];
            if (n === 0x0C) { M[0x1B] = 0; vw(0x10, 0); M[0x1C] = 4; M[0x1A] = (M[0x1A] - 1) & 255; return; }
            const a = yield* H.live(0x78E3, 'cia1', 'a');
            if (a < 0x40) H.setMsb(H.msb() | M[0x1C]);
            vw(0x04 + n, a);
            return;
          }
        }
        return;
      }
      if (s === 3) {
        M[0x07FA] = M[0x07FB] = M[0x07FC] = 0xBD;
        H.setMsb(H.msb() & 3);
        vw(0x05, 0xFF); vw(0x07, 0xFF); vw(0x09, 0xFF);
        vw(0x04, 0x50); vw(0x06, 0xA0); vw(0x08, 0xFF);
        vw(0x15, 0x1F);
        M[0x1A] = (M[0x1A] + 1) & 255;
        return;
      }
      if (s === 4) {
        if (vr(0x05) >= 0xD5) { for (let k = 0; k < 3; k++) dec(0x05); return; }
        if (vr(0x07) >= 0xD5) { for (let k = 0; k < 4; k++) dec(0x07); return; }
        if (vr(0x09) >= 0xD5) { for (let k = 0; k < 4; k++) dec(0x09); return; }
        return;
      }
      if (s === 7) {
        vw(0x29, 0); vw(0x2A, 0); vw(0x2B, 0);
        M[0x07FA] = M[0x07FB] = M[0x07FC] = 0xBE;
        vw(0x17, 0x1C);
        vw(0x04, 0x60); vw(0x06, 0xC0); vw(0x08, 0x20);
        vw(0x10, 0x10);
        vw(0x05, 0xDA); vw(0x07, 0xDA); vw(0x09, 0xDA);
        M[0x1A] = (M[0x1A] + 1) & 255;
        M[0x1D] = 0x10;
        return;
      }
      if (s === 8) {
        M[0x1D] = (M[0x1D] - 1) & 255;
        if (M[0x1D]) return;
        M[0x1D] = 0x20;
        const e = vr(0x15);
        if (!(e & 4)) vw(0x15, 7);
        else if (!(e & 8)) vw(0x15, 0x0F);
        else if (!(e & 0x10)) vw(0x15, 0x1F);
      }
    };
    // $7A08 temple_caught
    P.temple_caught = function* () {
      const s = M[0x1A];
      if (s === 4) {
        while (vr(0x03) < 0xD5) { inc(0x03); inc(0x01); yield* H.wait(256 * 5); }
        M[0x07F8] = 0x8C; M[0x07F9] = 0x8D;
      } else if (s === 8) {
        const c = M[0x1E], x = vr((c & 4) ? 0x04 : (c & 8) ? 0x06 : 0x08);
        vw(0x00, x); vw(0x02, x);
        do { inc(0x03); inc(0x01); yield* H.wait(256 * 5); } while (vr(0x01) !== 0);
      } else {
        while (vr(0x03) < 0xD5) { inc(0x03); inc(0x01); yield* H.wait(256 * 5); }
        for (let r = 0x0F; r > 3; r -= 2) if (vr(r) < 0xE0) vw(r, 0xE0);
        vw(0x01, 0xD5); vw(0x03, 0xD5);
        const v = vr(0x02) + 0x18;
        vw(0x00, v);
        if (v > 255) H.setMsb(H.msb() | 1);
        M[0x07F9] = 0x9F; M[0x07F8] = 0xA0;
      }
      // $7AC7
      for (M[0x1F] = 0; M[0x1F] < 4; M[0x1F]++) yield* H.wait(dyx(0));
      vw(0x10, 0); vw(0x17, 0); vw(0x15, 0);
      M[0x1E] = 0;
      yield* H.live(0x7AEB, 'collide', 'a');
      M[0x02] = (M[0x02] + 1) & 255;
      if (M[0x02] === 5) return 0x1300;
      P.music_reset();
      return 0x7600;
    };
  }
  (root.AZ_GROUPS = root.AZ_GROUPS || []).push(install);
  if (typeof module !== 'undefined') module.exports = install;
})(typeof globalThis !== 'undefined' ? globalThis : this);
