/* az-g6-piranha */
// Group 6: level 6, the Piranha ($7E98-$7FE4), with its routines in the engine's block: the edge and
// bite checks ($1AB8, $1EA0), the eaten swimmer ($1B80-$1BFA, $1EAF-$1FE4), the colour swap ($1CC0),
// the fish ($1D00-$1DD1) and the stick ($1DE0-$1E91).
(function (root) {
  'use strict';
  function install(P, H, K) {
    const M = P.M, io = () => P.io;
    const sid = (r, v) => io().sidWrite(r, v);
    const vw = (r, v) => io().vicWrite(r, v & 255), vr = (r) => io().vicRead(r) & 255;
    const inc = (r) => vw(r, vr(r) + 1), dec = (r) => vw(r, vr(r) - 1);
    const orV = (r, b) => vw(r, vr(r) | b), andV = (r, b) => vw(r, vr(r) & b);
    const water = function* (cp) {                          // a row of 40 random water characters
      for (let y = 0x27; y >= 0; y--) {
        const x = (yield* H.live(cp, 'cia1', 'a')) & 7;
        M[((M[0x18] | M[0x19] << 8) + y) & 0xFFFF] = M[0x4FF0 + x];
        yield* H.wait(H.decLoop(2)); M[0x20] = M[0x21] = 0;   // $7F61
      }
    };

    // $7E98 piranha: the colours, then $7E9B, where a lost life restarts the level
    P.stages[0x7E98] = function* () { P.piranha_colours(); return 0x7E9B; };
    P.stages[0x7E9B] = function* () {
      yield* H.live(0x7E9E, 'collide', 'a');
      for (let x = 7; x >= 0; x--) { M[0x07F8 + x] = 0xB1; vw(0x27 + x, M[0x5E]); }
      for (let x = 0; x < 0x10; x++) vw(x, M[0x41E0 + x]);
      M[0x17] = M[0x13] = M[0x2B] = 2;
      M[0x14] = M[0x11] = M[0x2E] = 0;
      vw(0x10, 0xE0);
      M[0x07F8] = 0xA1; M[0x07F9] = 0xA2;
      vw(0x27, 1); vw(0x28, 1); vw(0x23, 1);
      vw(0x15, 0xFF); vw(0x1C, 3); vw(0x25, 9); vw(0x26, 7);
      M[0x37] = 0;
      P.colour_white();
      vw(0x21, M[0x5F]); vw(0x22, 3);
      vw(0x18, (vr(0x18) & 0xF0) | 0x0C);
      orV(0x16, 0x10);
      vw(0x1B, 0xFE);
      for (;;) {                                            // $7F24
        M[0x18] = 0; M[0x19] = 4; M[0x12] = 0x18;
        for (;;) {                                          // $7F30
          yield* water(0x7F35);
          M[0x12] = (M[0x12] - 1) & 255;
          if (M[0x12] & 0x80) break;
          const v = M[0x18] + 0x28; M[0x18] = v & 255; if (v > 255) M[0x19] = (M[0x19] + 1) & 255;
          yield* P.piranha_swimmer();
          yield* P.piranha_fish();
          yield* P.piranha_edge();
          yield* H.live(0x7F5E, 'collide', 'a');
        }
      }
    };
    // $1CC0 piranha_colours
    P.piranha_colours = function () {
      if (M[0x5E] !== 0x0B) { M[0x5E] = 0x0B; M[0x5F] = 0; } else { M[0x5E] = 9; M[0x5F] = 6; }
    };
    // $7F70 piranha_swimmer, $7FC4 piranha_read, $1DE0 piranha_stick
    P.piranha_swimmer = function* () {
      M[0x17] = (M[0x17] - 1) & 255;
      if (!M[0x17]) {
        M[0x17] = 0x40;
        if (M[0x07F8] === 0xA1) { M[0x07F8] = 0xBB; M[0x07F9] = 0xBC; } else { M[0x07F8] = 0xA1; M[0x07F9] = 0xA2; }
        return;
      }
      let a;
      if (M[0x07]) a = (yield* H.live(0x7FCB, 'sid', 'a')) & 0x0F;
      else {
        M[0x2B] = (M[0x2B] - 1) & 255;
        if (M[0x2B]) return;
        M[0x2B] = 2;
        M[0x37] = H.joy() ^ 0x1F;
        a = H.joy() ^ 0x1F;
      }
      if (!a) { vw(0x1B, 0xFE); vw(0x25, 9); M[0x16] = 0; return; }             // $7FB5
      if (a === 0x10) {                                                         // $7F9D
        vw(0x1B, 0xFF); vw(0x25, 0x0B);
        M[0x16] = (M[0x16] + 1) & 255;
        if (M[0x16] === 0x50) { yield { cp: H.cp(0x1BD2) }; H.jump(yield* P.piranha_lost()); }   // $7FAF: held under too long
        return;
      }
      const up = () => { dec(0x01); dec(0x03); }, down = () => { inc(0x01); inc(0x03); };
      if (a === 1) up();
      else if (a === 2) down();
      else if (a === 4) left();
      else if (a === 8) right();
      else if (a === 5) { left(); up(); }
      else if (a === 6) { left(); down(); }
      else if (a === 9) { right(); up(); }
      else if (a === 0x0A) { right(); down(); }
    };
    // $1E14 swim_left, $1E3F swim_right
    function left() {
      if (vr(0x00) < 0x10 && !(H.msb() & 3)) return;
      for (;;) { dec(0x00); dec(0x02); if (vr(0x02) !== 0) break; andV(0x10, 0xFC); }
    }
    function right() {
      if (vr(0x00) >= 0x40 && (H.msb() & 3)) return;
      for (;;) { inc(0x00); inc(0x02); if (vr(0x02) !== 0) break; orV(0x10, 3); }
    }
    // $1D00 piranha_fish
    P.piranha_fish = function* () {
      M[0x14] = (M[0x14] - 1) & 255;
      if (M[0x14]) return;
      M[0x14] = M[0x59];
      for (const [y, b, nb, x, toRight] of [[1, 4, 0xFB, 0, 1], [3, 8, 0xF7, 2, 1], [2, 0x10, 0xEF, 4, 1],
        [3, 0x20, 0xDF, 0, 0], [1, 0x40, 0xBF, 2, 0], [2, 0x80, 0x7F, 4, 0]]) {
        M[0x28] = b; M[0x29] = nb;
        if (toRight) yield* fishRight(x, y); else yield* fishLeft(x, y);
      }
    };
    const flip = () => { if (!(H.msb() & M[0x28])) orV(0x10, M[0x28]); else andV(0x10, M[0x29]); };   // $1DB9
    function* fishRight(x, y) {                             // $1D64
      for (; y >= 0; y--) {
        inc(0x04 + x);
        if (vr(0x04 + x) === 0) flip();
        if (vr(0x04 + x) >= 0x60 && (H.msb() & M[0x28])) {
          vw(0x04 + x, 0);
          vw(0x05 + x, yield* H.live(0x1D82, 'cia1', 'a'));
          andV(0x10, M[0x29]);
          return;
        }
      }
    }
    function* fishLeft(x, y) {                              // $1D92
      for (; y >= 0; y--) {
        dec(0x0A + x);
        if (vr(0x0A + x) !== 0) continue;
        if (!(H.msb() & M[0x28])) {
          vw(0x0A + x, 0x60);
          vw(0x0B + x, yield* H.live(0x1DA6, 'cia1', 'a'));
          orV(0x10, M[0x28]);
          return;
        }
        flip();
      }
    }
    // $1AB8 piranha_edge, then $1EA0 piranha_bite
    P.piranha_edge = function* () {
      const y = vr(0x01);
      if (y >= 0x34 && y < 0xE0) { M[0x2E] = 0; return yield* bite(); }
      if (M[0x2E]) return;
      M[0x2E] = (M[0x2E] + 1) & 255;
      if (M[0x37] === 2) return;
      M[0x68] = (M[0x68] + 1) & 255;
      if (M[0x68] & 1) return;
      M[0x45] = (M[0x45] + 1) & 255;
      P.music_stage();
      if (M[0x45] === 9) H.jump(0x1300);
    };
    function* bite() {
      if (!(H.joy() & 0x10)) {                              // $1E97: fire held, the latch emptied
        for (let x = 0; x < 129; x++) yield* H.live(0x1E9C, 'collide', 'a');
        return;
      }
      if (!((yield* H.live(0x1EAB, 'collide', 'a')) & 1)) return;
      H.jump(yield* P.piranha_eaten());
    }
    // $1EAF: the fish close in, $1F9D the cloud, $1B80 the whirl; returns the stage after $1BD2
    P.piranha_eaten = function* () {
      for (;;) {
        M[0x29] = 2; M[0x2A] = 0xFD;
        for (let x = 0; ; ) {
          const ty = vr(0x01), tx = vr(0x00);
          if (vr(0x03 + x) !== ty) { if (vr(0x03 + x) > ty) dec(0x03 + x); else inc(0x03 + x); }
          const fx = vr(0x02 + x);
          if (!(H.msb() & 3)) {
            if (fx !== tx) {
              if (fx < tx) {
                if (!(H.msb() & M[0x29])) inc(0x02 + x);
                else { dec(0x02 + x); if (vr(0x02 + x) === 0) andV(0x10, M[0x2A]); }
              } else {
                if (!(H.msb() & M[0x29])) dec(0x02 + x);
                else { inc(0x02 + x); if (vr(0x02 + x) === 0) andV(0x10, M[0x2A]); }
              }
            }
          } else if (fx !== tx) {
            if (fx < tx || !(H.msb() & M[0x29])) { inc(0x02 + x); if (vr(0x02 + x) === 0) orV(0x10, M[0x29]); }
            else dec(0x02 + x);
          }
          M[0x29] = (M[0x29] << 1) & 255;
          M[0x2A] = ((M[0x2A] << 1) | 1) & 255;
          x += 2;
          if (x === 0x0E) break;
          yield* H.wait(H.decLoop(6)); M[0x20] = M[0x21] = 0;  // $1F8E
        }
        M[0x28] = 0;
        for (let x = 2; x < 0x10; x += 2) {
          if (vr(x) !== vr(0)) M[0x28] = (M[0x28] + 1) & 255;
          if (vr(x + 1) !== vr(1)) M[0x28] = (M[0x28] + 1) & 255;
        }
        if (!M[0x28]) break;
      }
      for (let x = 7; x >= 0; x--) { M[0x07F8 + x] = 0xBF; vw(0x27 + x, 3); }
      vw(0x17, 0xFF); vw(0x1D, 0xFF); vw(0x1C, 0);
      M[0x28] = 0xC0; M[0x29] = 6;
      sid(0x04, 0x81); sid(0x0B, 0x81); sid(0x12, 0x81);
      do {                                                  // $1B8B
        M[0x18] = 0; M[0x19] = 4; M[0x12] = 0x18;
        for (;;) {
          yield* water(0x1B9C);
          yield* fishJiggle();
          const a = yield* H.live(0x1BB0, 'sid', 'a');
          sid(0x01, a); sid(0x08, a); sid(0x0F, a);
          M[0x12] = (M[0x12] - 1) & 255;
          if (M[0x12] & 0x80) break;
          const v = M[0x18] + 0x28; M[0x18] = v & 255; if (v > 255) M[0x19] = (M[0x19] + 1) & 255;
        }
        M[0x28] = (M[0x28] + 1) & 255;
      } while (M[0x28]);
      yield* H.live(0x1BD2, 'collide', 'a');
      return yield* P.piranha_lost();
    };
    // $1FC6 fish_jiggle
    function* fishJiggle() {
      M[0x29] = (M[0x29] - 1) & 255;
      if (M[0x29]) return;
      M[0x29] = 6;
      for (let x = 0x0F; x >= 0; x--) {
        if ((yield* H.live(0x1FD5, 'cia1', 'a')) & 2) { inc(x); if (vr(x) !== 0) continue; }
        dec(x);
      }
    }
    // $1BD2 piranha_lost: returns the stage to go on to
    P.piranha_lost = function* () {
      P.music_reset();
      M[0x02] = (M[0x02] + 1) & 255;
      if (M[0x02] === 5) return 0x1300;
      vw(0x15, 0); vw(0x17, 0); vw(0x1D, 0); vw(0x10, 0);
      yield* H.wait(H.dyx(0));
      return 0x7E9B;
    };
  }
  (root.AZ_GROUPS = root.AZ_GROUPS || []).push(install);
  if (typeof module !== 'undefined') module.exports = install;
})(typeof globalThis !== 'undefined' ? globalThis : this);
