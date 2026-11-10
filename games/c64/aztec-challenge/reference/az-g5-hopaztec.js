/* az-g5-hopaztec */
// Group 5: level 5, Hopaztec ($7200-$75DA, $7724), with its routines in the engine's block: the
// preview's stick ($1A70), the hop out through the door ($1A80) and the trap check ($1FE8).
(function (root) {
  'use strict';
  function install(P, H, K) {
    const M = P.M, io = () => P.io;
    const sid = (r, v) => io().sidWrite(r, v);
    const vw = (r, v) => io().vicWrite(r, v & 255), vr = (r) => io().vicRead(r) & 255;
    const col = (i, v) => io().colourWrite(i, v);
    const inc = (r) => vw(r, vr(r) + 1), dec = (r) => vw(r, vr(r) - 1);
    const orV = (r, b) => vw(r, vr(r) | b), andV = (r, b) => vw(r, vr(r) & b);

    // $7200 hopaztec
    P.stages[0x7200] = function* () {
      vw(0x20, 0);
      vw(0x18, (vr(0x18) & 0xF0) | 0x0C);
      orV(0x16, 0x10);
      vw(0x22, 0x0D); vw(0x23, 5);
      for (let x = 0; x < 0x3E8; x++) {
        const c = M[0x5800 + x];
        M[0x0400 + x] = c;
        col(x, c >= 0xE9 && c <= 0xEC ? 7 : 8);
      }
      const a = P.door_colour(M[0x5F]);
      for (const i of [0x4E, 0x75, 0x76, 0x9D, 0x9E, 0xC5, 0xC6]) col(i, a);
      P.hop_start();
      yield* P.hop_traps();
      for (;;) {                                            // $72FD
        P.hop_start();
        for (;;) {                                          // $7300: a polling loop on the stick
          yield* P.hop_stick();
          if (M[0x15] === 0xAA) break;
          if (M[0x16] === 0x2C) return yield* P.hop_exit();
        }
        yield* P.hop_speared();
        M[0x15] = 0;
        M[0x02] = (M[0x02] + 1) & 255;
        if (M[0x02] === 5) { vw(0x15, 0); return 0x1300; }
      }
    };
    // $7724 door_colour: cyan, or black in the night's colour 11; A back
    P.door_colour = function (a) { a = a === 0x0B ? 0 : 3; col(0x4D, a); return a; };
    // $73F0 hop_start
    P.hop_start = function () {
      M[0x07F8] = 0xB5; M[0x07F9] = 0xB6;
      vw(0x27, 1); vw(0x28, 1);
      M[0x16] = 9; vw(0x25, 9);
      vw(0x26, 7); vw(0x15, 3); vw(0x1C, 3);
      vw(0x00, 0x2A); vw(0x02, 0x2A); vw(0x01, 0xC6); vw(0x03, 0xDB);
      vw(0x10, 0);
    };
    // $74C2 hop_traps
    P.hop_traps = function* () {
      yield { cp: H.cp(0x74C2) };
      sid(0x0E, 0x80); sid(0x12, 0x80);
      for (let x = 0; ;) {
        const a = yield* H.live(0x74CF, 'sid', 'a');
        if (a >= 0x43 || (a >= 0x3C && a < 0x3F)) continue;
        M[0x5C28 + x] = a;
        yield* H.wait(H.decLoop(0x80));
        M[0x10] = M[0x11] = 0;                              // $74EC counts its delay in $10 and $11
        x++;
        if (x === M[0x58]) break;
      }
      sid(0x12, 0x11);
    };
    // $732A hop_stick, and $1A70 for a preview's random hops. The loop it is called from only polls,
    // and each turn with the stick up or down counts in $68, hop or no hop, so each read of the stick
    // is a checkpoint, where the game's turns and the port's are the same turns
    P.hop_stick = function* () {
      let a = ((yield* H.live(0x732D, 'joy', 'a')) & 0x1F) ^ 0x1F;
      if (!a) {
        if (!M[0x07]) return;
        a = (yield* H.live(0x1A78, 'sid', 'a')) & 0x0F;
      }
      if (a === 1) { M[0x68] = (M[0x68] + 1) & 255; yield* P.hop_check_up(); }
      else if (a === 2) { M[0x68] = (M[0x68] - 1) & 255; yield* P.hop_check_down(); }
      else if (a === 4) yield* P.hop_check_left();
      else if (a === 8) yield* P.hop_check_right();
    };
    const tab = (a, n, v) => { for (let x = n - 1; x >= 0; x--) if (M[a + x] === v) return true; return false; };
    const pair = (xs) => { for (let x = 8; x >= 0; x--) if (vr(0x01) === M[0x5BF8 + x] && vr(0x00) === M[xs + x]) return true; return false; };
    const shapes = () => { M[0x07F8] = 0xB7; M[0x07F9] = 0xB8; };
    // $7430, $7450, $7470, $7493: the four checks, each a hop when the edge lets it
    // each true when it hopped
    P.hop_check_up = function* () {
      if (vr(0x01) === 0x46 && tab(0x5BE8, 6, vr(0x00))) return false;
      shapes(); M[0x16] = (M[0x16] + 1) & 255;
      yield* hop(() => { inc(0x00); dec(0x01); inc(0x02); dec(0x03); }, 0x10);
      return true;
    };
    P.hop_check_down = function* () {
      if (vr(0x01) === 0xC6 && tab(0x5BF0, 8, vr(0x00))) return false;
      shapes(); M[0x16] = (M[0x16] - 1) & 255;
      yield* hop(() => { dec(0x00); inc(0x01); dec(0x02); inc(0x03); }, 0x10);
      return true;
    };
    P.hop_check_left = function* () {
      if (pair(0x5C08)) return false;
      shapes(); M[0x16] = (M[0x16] - 9) & 255;
      yield* hop(() => { dec(0x00); dec(0x02); }, 0x28);
      return true;
    };
    P.hop_check_right = function* () {
      if (pair(0x5C18)) return false;
      shapes(); M[0x16] = (M[0x16] + 9) & 255;
      yield* hop(() => { inc(0x00); inc(0x02); }, 0x28);
      return true;
    };
    // $7356-$7395: the hop, n steps each followed by $73BE; then $73A3 hop_land and $1FE8 hop_trap
    function* hop(step, n) {
      for (let x = 0; x < n; x++) {
        step();
        yield* H.wait(H.decLoop(0x20));
        M[0x20] = M[0x21] = 0;                              // $73BE counts its delay in $20 and $21
        if (vr(0x00) === 0) H.setMsb((H.msb() & 3) ? H.msb() & 0xFC : H.msb() | 3);
      }
      M[0x07F8] = 0xB5; M[0x07F9] = 0xB6;
      // $73AD: until the stick is let go, each read a checkpoint, where the game and the port meet after
      // the hop's delays
      while (((yield* H.live(0x73B0, 'joy', 'a')) & 0x1F) !== 0x1F);
      yield* H.wait(256 * 5);
      P.hop_trap();
    }
    // $1FE8 hop_trap: X from $58 down to 0, one entry more than the list holds
    P.hop_trap = function () {
      const a = M[0x16];
      if (a === 0x2C) return;
      for (let x = M[0x58]; x >= 0 && x < 0x80; x--) if (M[0x5C28 + x] === a) { M[0x15] = 0xAA; return; }
    };
    // $7502 hop_speared. Voice 1's pitch is written by the music's interrupt as well, so each of its
    // loops starts at a checkpoint, before its write of the pitch
    P.hop_speared = function* () {
      M[0x14] = 0xA0; sid(0x04, 0x81);
      M[0x07FA] = 0x8A; vw(0x29, 0); vw(0x04, 0); vw(0x05, vr(0x01)); vw(0x15, 7);
      const step = function* () { yield* H.wait(H.decLoop(0x10)); M[0x10] = M[0x11] = 0; };   // $75CC
      for (;;) {                                            // $7523: a spear from the left
        yield { cp: H.cp(0x7523) };
        sid(0x01, M[0x14]);
        inc(0x04);
        if (vr(0x04) === 0) orV(0x10, 4);
        yield* step();
        M[0x14] = (M[0x14] - 1) & 255;
        if (vr(0x04) !== vr(0x00)) continue;
        if (!(H.msb() & 3)) break;
        if (H.msb() & 4) break;
      }
      M[0x07F8] = 0x8C; M[0x07F9] = 0x8D;
      vw(0x04, 0x60); M[0x14] = 0xA0; orV(0x10, 4);
      M[0x07FA] = (M[0x07FA] + 1) & 255;
      for (;;) {                                            // $756E: one from the right
        yield { cp: H.cp(0x756E) };
        sid(0x01, M[0x14]);
        dec(0x04);
        if (vr(0x04) === 0) andV(0x10, 0xFB);
        M[0x14] = (M[0x14] - 1) & 255;
        yield* step();
        if (vr(0x04) !== vr(0x00)) continue;
        if (H.msb() & 3) break;
        if (!(H.msb() & 4)) break;
      }
      M[0x07F8] = 0x88; M[0x07F9] = 0x89;
      for (let x = 0x80; x >= 0; x--) {                     // $75A7: the rumble
        yield { cp: H.cp(0x75A7) };
        sid(0x01, 1);
        yield* step();
      }
      sid(0x04, 0x11);
      M[0x07F8] = 0x8E; M[0x07F9] = 0x8F;
      for (let x = 0; x < 256; x++) yield* step();
    };
    // $1A80 hop_exit: up and right into the doorway, behind the scenery from the 17th step
    P.hop_exit = function* () {
      M[0x07F8] = 0xB7; M[0x07F9] = 0xB8;
      for (let x = 0x40; x >= 0; x--) {
        inc(0x00); inc(0x02); dec(0x01); dec(0x03);
        yield* H.wait(H.decLoop(0x20));
        M[0x20] = M[0x21] = 0;
        if (x === 0x30) vw(0x1B, 3);
      }
      return 0x1300;
    };
  }
  (root.AZ_GROUPS = root.AZ_GROUPS || []).push(install);
  if (typeof module !== 'undefined') module.exports = install;
})(typeof globalThis !== 'undefined' ? globalThis : this);
