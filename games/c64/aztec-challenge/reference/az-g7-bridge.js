/* az-g7-bridge */
// Group 7: level 7, the Bridge ($7B00-$7E96), with its colour swap in the engine's block ($1CDA).
(function (root) {
  'use strict';
  function install(P, H, K) {
    const M = P.M, io = () => P.io;
    const sid = (r, v) => io().sidWrite(r, v);
    const vw = (r, v) => io().vicWrite(r, v & 255), vr = (r) => io().vicRead(r) & 255;
    const col = (i, v) => io().colourWrite(i, v);
    const inc = (r) => vw(r, vr(r) + 1), dec = (r) => vw(r, vr(r) - 1);
    const orV = (r, b) => vw(r, vr(r) | b), andV = (r, b) => vw(r, vr(r) & b);

    // $7B00 bridge: the colours, then $7B03, where a lost life restarts the level
    P.stages[0x7B00] = function* () { P.bridge_colours(); return 0x7B03; };
    P.stages[0x7B03] = function* () {
      M[0x07F8] = 0x90; M[0x07F9] = 0x91;
      vw(0x00, 0x70); vw(0x02, 0x70); vw(0x01, 0x58); vw(0x03, 0x6D);
      vw(0x1C, 3); vw(0x25, 9); vw(0x26, 9); vw(0x28, 1);
      M[0x1F] = 1;
      vw(0x27, 7); vw(0x1D, 0xFC); vw(0x20, 0);
      M[0x69] = M[0x6A] = 0;
      vw(0x18, (vr(0x18) & 0xF0) | 0x0C);
      K.chrout(0x93);
      const cell = (i) => {                                 // bit 7 set: the night's colour, else white
        const c = M[0x4C00 + i];
        if (c & 0x80) { M[0x0400 + i] = c & 0x7F; col(i, M[0x5F]); } else { M[0x0400 + i] = c; col(i, 9); }
      };
      for (let x = 0; x < 256; x++) { cell(x); cell(0x100 + x); cell(0x200 + x); }
      for (let x = 0; x < 0xE8; x++) cell(0x300 + x);
      for (let x = 0; x < 0xE8; x++) {                      // $7BC7: the water, three random characters
        if (M[0x0700 + x] !== 0x20) continue;
        let a;
        do a = yield* H.live(0x7BD3, 'cia1', 'a'); while (a < 0xE2 || a >= 0xE5);
        M[0x0700 + x] = a; col(0x300 + x, 8);
      }
      for (let x = 5; x >= 0; x--) { M[0x07FA + x] = 0xB3; vw(0x29 + x, M[0x5E]); }
      M[0x2A] = 0xFF; vw(0x15, 0xFF);
      vw(0x04, 0x34); vw(0x06, 0x68); vw(0x08, 0x9C); vw(0x0A, 0xD0);
      vw(0x10, 0xC0); vw(0x0C, 4); vw(0x0E, 0x38);
      for (let x = 5; x < 0x11; x += 2) vw(x, 0x70);
      M[0x10] = 4; M[0x11] = 0x34; M[0x12] = 4; M[0x13] = 0xFB; M[0x14] = 4;
      M[0x15] = M[0x16] = 0;
      for (;;) {                                            // $7C48
        yield* P.bridge_planks();
        yield* P.bridge_runner();
        yield* H.wait(H.dyx(M[0x5A]));
        if (M[0x2A] === 0xA6) return 0x1300;
        if (M[0x2A] === 0x73) { P.music_reset(); return 0x7B03; }
        M[0x69] = (M[0x69] + 1) & 255;
        if (M[0x69]) continue;
        M[0x6A] = (M[0x6A] + 1) & 255;
        if (M[0x6A] !== 4) continue;
        M[0x6A] = 0;
        M[0x45] = (M[0x45] + 1) & 255;
        P.music_stage();
        if (M[0x45] === 9) return 0x1300;
      }
    };
    // $1CDA bridge_colours
    P.bridge_colours = function () {
      if (M[0x5E] !== 0x0B) { M[0x5F] = 0; M[0x5E] = 0x0B; vw(0x21, 0x0B); }
      else { M[0x5F] = 3; M[0x5E] = 5; vw(0x21, 1); }
    };
    // $7C8A bridge_planks: the six planks one pixel left; every $34 calls one goes back to the right
    P.bridge_planks = function* () {
      for (let x = 4; x < 0x10; x += 2) {
        dec(x);
        if (vr(x) === 0) { if (H.msb() & M[0x12]) andV(0x10, M[0x13]); else orV(0x10, M[0x12]); }
        M[0x12] = (M[0x12] << 1) & 255;
        M[0x13] = ((M[0x13] << 1) | 1) & 255;
      }
      M[0x12] = 4; M[0x13] = 0xFB;
      M[0x11] = (M[0x11] - 1) & 255;
      if (M[0x11]) return;
      M[0x11] = 0x34;
      vw(M[0x10], 0x38);                                    // $7CCA
      orV(0x10, M[0x14]);
      const x = M[0x10] >> 1;
      let rotten = false;
      if (M[0x15] < 3) rotten = !((yield* H.live(0x7CF2, 'cia1', 'a')) & 1);
      if (rotten) { M[0x07F8 + x] = 0xB4; M[0x15] = (M[0x15] + 1) & 255; }
      else { M[0x15] = 0; M[0x07F8 + x] = 0xB3; }
      M[0x10] = (M[0x10] + 2) & 255;
      M[0x14] = (M[0x14] << 1) & 255;
      if (M[0x10] === 0x10) { M[0x10] = 4; M[0x14] = 4; }
    };
    // $7D10 bridge_runner
    P.bridge_runner = function* () {
      if (M[0x16]) return yield* air();
      M[0x1F] = (M[0x1F] - 1) & 255;
      if (!M[0x1F]) {
        M[0x1F] = 8;
        M[0x07F8] = (M[0x07F8] + 2) & 255; M[0x07F9] = (M[0x07F9] + 2) & 255;
        if (M[0x07F8] >= 0x96) { M[0x07F8] = 0x90; M[0x07F9] = 0x91; }
      }
      yield* P.bridge_check();
      const a = H.joy() ^ 0x1F;
      if (!a || a === 0x10) return yield* P.bridge_check();
      M[0x68] = (M[0x68] + 1) & 255;
      const len = a === 2 ? 0x5B : a === 4 ? 0x5C : a === 1 ? 0x5D : 0;
      if (!len) return;
      M[0x16] = (M[0x16] + 1) & 255;
      M[0x17] = M[0x18] = M[len];
      M[0x19] = 2;
    };
    // $7D86: up for $17 steps, then ($16 bit 7 set) down as many, a step every second call
    function* air() {
      M[0x19] = (M[0x19] - 1) & 255;
      if (M[0x19]) return;
      M[0x19] = 2;
      if (M[0x16] & 0x80) {
        M[0x07F8] = 0x98; M[0x07F9] = 0x99;
        inc(0x03); inc(0x01);
        M[0x17] = (M[0x17] - 1) & 255;
        if (M[0x17]) return;
        M[0x16] = 0;
        return yield* P.bridge_check();
      }
      M[0x07F8] = 0x96; M[0x07F9] = 0x97;
      dec(0x01); dec(0x03);
      M[0x17] = (M[0x17] - 1) & 255;
      if (!M[0x17]) { M[0x17] = M[0x18]; M[0x16] = (M[0x16] >> 1) | 0x80; }
      return yield* P.bridge_check();
    }
    // $7DD0 bridge_check: the runner on a rotten plank, and that plank alone, falls
    P.bridge_check = function* () {
      const c = yield* H.live(0x7DD3, 'collide', 'a');
      M[0x1E] = c;
      M[0x24] = 4;
      for (let x = 0; x < 6; x++) {
        if ((c & M[0x24]) && M[0x07FA + x] === 0xB4) return yield* fall();
        M[0x24] = (M[0x24] << 1) & 255;
      }
      yield* H.live(0x7DF5, 'collide', 'a');
    };
    // $7DF6: the fall, its whistle on voice 1 a step slower each time
    function* fall() {
      const a = M[0x1E] & 0xFC;
      if (a !== 4 && a !== 8 && a !== 0x10 && a !== 0x20 && a !== 0x40 && a !== 0x80) {
        yield* H.live(0x7DF5, 'collide', 'a');
        return;
      }
      M[0x1C] = M[0x44] = 0x40;
      for (;;) {                                            // $7E1B
        yield { cp: H.cp(0x7E1D) };
        sid(0x01, M[0x44]);
        M[0x44] = (M[0x44] - 1) & 255;
        inc(0x03); inc(0x01);
        const y = vr(0x01);
        if (y === 0x80) { M[0x07F8] = 0xB0; vw(0x17, 1); andV(0x15, 0xFD); }
        else if (y === 0xB0) vw(0x17, 0);
        else if (y === 0xFF) { andV(0x15, 0xFC); break; }
        yield* H.wait(8 * ((M[0x1C] || 256) * 5 + 6) + 1);
        M[0x1C] = (M[0x1C] + 1) & 255;
      }
      M[0x1D] = 0;                                          // $7E6E: five long delays counted in $1D
      for (let k = 0; k < 5; k++) { yield* H.wait(H.dyx(0)); M[0x1D] = (M[0x1D] + 1) & 255; }
      yield* H.live(0x7E85, 'collide', 'a');
      M[0x02] = (M[0x02] + 1) & 255;
      M[0x2A] = M[0x02] === 5 ? 0xA6 : 0x73;
    }
  }
  (root.AZ_GROUPS = root.AZ_GROUPS || []).push(install);
  if (typeof module !== 'undefined') module.exports = install;
})(typeof globalThis !== 'undefined' ? globalThis : this);
