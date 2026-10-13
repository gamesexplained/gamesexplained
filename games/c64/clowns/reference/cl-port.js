/* cl-port.js */
// Clowns, ported routine by routine from the cartridge (listing.json), for the Play tab and for
// test_play.js, which runs it beside the game's own code in the kit's lockstep. The port runs on the
// game's 64 KB (M), and keeps every variable where the game keeps it: the globals at $0200-$0243,
// the machine-code library's zero page, the screen, sprite 0's shape at $03C0. What it does not
// keep is the compiled program's own machinery: the software stack's frames ($0244 on) and the
// runtime's scratch bytes ($02-$10), where the compiled code passes arguments and builds its truth
// values; the port passes them as JavaScript values.
//
// ClownsPort.create(M, io) gives P, whose P.program() is the whole program from the cold start as a
// generator. It yields once a tick, where wait_tick ($F711) restarts the timer (INC $DC0E at
// $F717): { cp: 0xF717 }, with P.site naming the loop the tick belongs to. io is the chips:
// read(a) and write(a, v) at the chips' addresses ($D000-$DFFF), and paddle(n), the reading of
// paddle n (0 or 1) of control port 1.
globalThis.ClownsPort = (function () {
  'use strict';
  const TICK = { cp: 0xF717 };

  function create(M, io) {
    const P = { M, io, site: 'start' };
    const rd = (a) => P.io.read(a), wr = (a, v) => P.io.write(a, v & 255);
    const w16 = (a) => M[a] | M[a + 1] << 8;

    // ---- the runtime the compiler linked in
    function random(n) {                                          // $E03A: 1 to n
      const s = ((M[0x12] << 8 | M[0x11]) * 125 + 1) & 0xFFFF;
      M[0x11] = s & 255; M[0x12] = s >> 8;
      return ((n * M[0x12]) >> 8) + 1 & 255;
    }
    function putChar(a) {                                         // $E22E, device 1: the screen
      M[0x16] = a;
      const codes = [0x9D, 0x1D, 0x91, 0x11, 0x13, 0x0D, 0x93];
      const k = codes.indexOf(a);
      if (k >= 0) { [left, advance, up, down, home, ret, clear][k](); return; }
      M[0x16] = a & 0x80 ? (a & 0x3F) | 0x40 : a & 0x3F;         // $E31E
      const row = M[0x18], col = M[0x17];
      M[0x14] = M[0xE2EC + 2 * row]; M[0x15] = M[0xE2ED + 2 * row];
      const at = w16(0x14) + col;
      M[at & 0xFFFF] = M[0x16];
      M[0x15] = (M[0x15] + 0xD4) & 255;
      wr((w16(0x14) + col) & 0xFFFF, M[0x13]);
      advance();
    }
    function advance() { if (++M[0x17] === 40) { M[0x17] = 0; down(); } }
    function down() { if (++M[0x18] === 25) M[0x18] = 0; }
    function left() { M[0x17] = (M[0x17] - 1) & 255; if (M[0x17] & 0x80) { M[0x17] = 0x27; up(); } }
    function up() { M[0x18] = (M[0x18] - 1) & 255; if (M[0x18] & 0x80) M[0x18] = 0x18; }
    function home() { M[0x17] = 0; M[0x18] = 0; }
    function ret() { M[0x17] = 0; down(); }
    function clear() {
      for (let x = 0; x < 256; x++) { M[0x0400 + x] = M[0x0500 + x] = M[0x0600 + x] = M[0x06E8 + x] = 0x20; }
      for (let x = 0; x < 1024; x++) wr(0xD800 + x, 1);
      home();
    }
    const print = (a) => { for (let i = a; M[i]; i++) putChar(M[i]); };     // print_inline's text
    const cursor = (c, r) => { M[0x17] = c; M[0x18] = r; };

    // ---- the machine-code library
    function* tick(site) { P.site = site; yield TICK; }
    function drawClown(a, x, y) {                                 // $F034
      M[0x30] = a >> 7; M[0x3B] = a & 0x7F; M[0x2E] = x; M[0x2F] = y;
      for (let i = 0x7A; i <= 0xC1; i++) M[i] = 0;
      const src = 0xFCBF + 32 * M[0x3B];
      M[0x2A] = src & 255; M[0x2B] = src >> 8;
      let sx = 0x2E;
      for (let i = 0x1F; i >= 0; i--) {
        const v = M[src + i];
        M[i < 16 ? 0x7A + i : 0x82 + i] = v;
        M[0x03C0 + sx] = v; sx -= 3; if (sx < 0) sx = 0x2D;
      }
      for (let n = M[0x2E] & 7; n > 0; n--)
        for (let r = 0; r < 16; r++) {
          const a0 = M[0x7A + r], b = M[0x92 + r], c = M[0xAA + r];
          M[0x7A + r] = a0 >> 1; M[0x92 + r] = (b >> 1) | (a0 & 1) << 7; M[0xAA + r] = (c >> 1) | (b & 1) << 7;
        }
      const dn = M[0x2F] & 7;
      if (dn) {
        for (let r = 15; r >= 0; r--) { M[0x7A + r + dn] = M[0x7A + r]; M[0x92 + r + dn] = M[0x92 + r]; M[0xAA + r + dn] = M[0xAA + r]; }
        for (let r = dn - 1; r >= 0; r--) { M[0x7A + r] = 0; M[0x92 + r] = 0; M[0xAA + r] = 0; }
      }
      const sxv = M[0x2E] + 0x18;
      wr(0xD000, sxv);
      M[0x2C] = (M[0x30] + (sxv >> 8)) & 255;
      wr(0xD010, (rd(0xD010) & 0xFE) | M[0x2C]);
      wr(0xD001, M[0x2F] + 0x32);
      wr(0xD015, rd(0xD015) | 1);
      cellOfSprite();
      M[0x33] = 8;                                                 // $F143: the nine cells
      for (;;) {
        const k = M[0x33];
        M[0x44 + k] = 0; M[0x2B] = 0;
        const code = M[(w16(0x26) + M[0xFE51 + k]) & 0xFFFF];
        M[0x2C] = code;
        const g = code * 8;
        M[0x2A] = g & 255; M[0x2B] = ((g >> 8) + 0xF8) & 255;
        const base = w16(0x2A);
        for (let i = 0; i < 8; i++) if (M[(base + i) & 0xFFFF] & M[0x7A + k * 8 + i]) { M[0x44 + k] = M[0x2C]; break; }
        M[0x33] = (k - 1) & 255;
        if (M[0x33] & 0x80) break;
      }
    }
    function cellOfSprite() {                                     // $F634
      M[0x31] = ((M[0x30] ? 0x80 : 0) | M[0x2E] >> 1) >> 2;
      M[0x32] = M[0x2F] >> 3;
      screenAddress();
    }
    function screenAddress() {                                    // $F64A
      const r = M[0x32], lo = M[0xFE1F + r] + M[0x31];
      M[0x26] = M[0x28] = lo & 255;
      M[0x27] = (M[0xFE38 + r] + (lo >> 8)) & 255;
      M[0x29] = (M[0x27] + 0xD4) & 255;
    }
    function moveClownSprite(a, x, y) {                           // $F27D: routine 0
      M[0x2C] = (a & 1) << 7;
      let f;
      if (a & 0x80) f = 4;
      else {
        if (M[0x3C]) M[0x3C]--; else { M[0x3C] = 0x0A; M[0x3D] = (M[0x3D] + 1) & 255; }
        M[0x3D] &= 3; f = M[0x3D];
      }
      M[0x3A] = f;
      drawClown(f | M[0x2C], x, y);
      M[0x20] = M[0x21] = M[0x22] = 0;
      for (M[0x33] = 8; ; ) {
        const k = M[0x33], c = M[0x44 + k];
        if (c < 0x5A) { if (c >= M[0x20]) M[0x20] = c; }
        else if (c >= 0x60) {
          M[0x20] = 0x60;
          const row = ((M[0x32] + M[0xFE60 + k] - 3) & 255) >> 1;
          let col = (M[0x31] + M[0xFE69 + k]) & 255;
          col = col - M[0x53 + row]; if (col < 0) col = (col & 255) + 0x24 & 255; else col &= 255;
          const b = (M[0xFE69 + col] + M[0xFE5A + row]) & 255;
          if (M[0x56 + b]) {
            M[0x21] = (M[0xFE5D + row] + M[0x21]) & 255; M[0x56 + b] = 0; M[0x22]++;
            soundPop();
          }
        }
        M[0x33] = (k - 1) & 255;
        if (M[0x33] & 0x80) break;
      }
      for (let r = 2; r >= 0; r--) {                              // $F305: the rows emptied
        const b = M[0xFE5A + r];
        let v = 0;
        for (let i = 0; i < 12; i++) v |= M[0x56 + b + i];
        M[0x33] = 0;
        M[0x23 + r] = v ^ 0xFF;
        if (M[0x23 + r]) refillRow(r);
      }
    }
    function refillRow(r) { const b = M[0xFE5A + r]; for (let i = 0; i < 12; i++) M[0x56 + b + i] = 0xFF; }
    function paddleSeesaw(y, x) {                                 // $F189: routine 1
      M[0x4D] = x;
      let a = 0xC8 - io_paddle(y);
      if (a < 0) a = 0;
      M[0x2C] = a;
      a = ((a >> 2) + M[0x2C]) & 255;
      smooth(a);
      M[0x20] = M[0xFF];
      drawSeesaw(M[0xFF], x, true);
    }
    function io_paddle(y) { return P.io.paddle((((0x19 + y) & 0x1F) - 0x19) & 1) & 255; }
    function smooth(a) {                                          // $F7E7
      let c = 0, carry = 0;
      for (let i = 0; i < 3; i++) { const s = a + M[0xFF]; carry = s >> 8; a = s & 255; c += carry; }
      const total = (c << 8 | a) >> 2;
      M[0x2C] = (a & 1) << 7 | carry << 6;
      M[0xFF] = total & 255;
    }
    function drawSeesaw(a, x, stored) {                           // $F1A7 (routine 22), $F1A9 from $F189
      if (!stored) M[0x4D] = x;
      if (a < 0x11) a = 0x11;
      const s1 = a + 0x18, s2 = a + 0x30;
      wr(0xD002, s1);
      let d = rd(0xD010) & 0xF9;
      if (s1 > 255) d |= 2;
      wr(0xD004, s2);
      if (s2 > 255) d |= 4;
      wr(0xD010, d);
      const p = 0xEF + ((M[0x4D] & 1) << 1);
      M[0x07F9] = p; M[0x07FA] = p + 1;
      wr(0xD015, rd(0xD015) | 6);
    }
    function scrollBalloons() {                                   // $F1E7: routine 9
      M[0x32] = 7; M[0x31] = 0; M[0x38] = 2;
      if (M[0x41]) { M[0x41]--; if (M[0x41]) return; }
      M[0x41] = 3;
      for (;;) {
        screenAddress();
        M[0x2C] = 0x0C;
        const r = M[0x38];
        if (r === 1) {
          M[0x50 + r] = (M[0x50 + r] - 1) & 7;
          if (M[0x50 + r] === 7) { let c = (M[0x53 + r] - 1) & 255; if (c === 1) c = 0x25; M[0x53 + r] = c; }
        } else {
          M[0x50 + r] = (M[0x50 + r] + 1) & 7;
          if (!M[0x50 + r]) { let c = (M[0x53 + r] + 1) & 255; if (c === 0x26) c = 2; M[0x53 + r] = c; }
        }
        M[0x39] = (M[0x50 + r] * 3 + 0x60) & 255;
        let y = M[0x53 + r], x = M[0xFE5A + r];
        const base = w16(0x26);
        for (; ;) {
          M[0x33] = 3;
          let a = M[0x56 + x] ? M[0x39] : 0x20;
          for (;;) {
            M[(base + y) & 0xFFFF] = a;
            y++; if (y === 0x26) y = 2;
            if (a !== 0x20) a = (a + 1) & 255;
            if (!--M[0x33]) break;
          }
          x++;
          if (!--M[0x2C]) break;
        }
        M[0x32] = (M[0x32] - 2) & 255;
        M[0x38] = (M[0x38] - 1) & 255;
        if (M[0x38] & 0x80) break;
      }
    }
    function soundBounce() { if (M[0x4F]) { M[0x3E] = 0x20; wr(0xD40C, 0); wr(0xD40B, 0x41); } }
    function soundPop() { if (M[0x4F]) wr(0xD412, 0x81); }
    function soundFall() { if (M[0x4F]) { M[0x3F] = 0x30; wr(0xD40C, 0xA0); wr(0xD40B, 0x41); } }
    function soundTick() {                                        // $F36B: routine 13
      wr(0xD412, 0x80);
      if (M[0x3E]) { M[0x3E]--; wr(0xD407, M[0x3E] << 1); wr(0xD408, 2); wr(0xD40B, 0x40); return; }
      if (M[0x3F]) {
        M[0x3F]--;
        const x = M[0x3F] & 0xFE;
        wr(0xD407, M[0xFFA3 + x]);
        const hi = M[0xFFA4 + x]; wr(0xD408, hi);
        if (!hi) wr(0xD40B, 0x40);
      }
    }
    function* playTune(t) {                                       // $F3AA: routine 15
      let x = M[0xFFA0 + t];
      for (;;) {
        const lo = M[0xFF17 + x];
        if (!lo) return;
        wr(0xD400, lo); wr(0xD401, M[0xFF18 + x]);
        let y = M[0xFF73 + (x >> 1)];
        x = (x + 2) & 255;
        do {
          if (y === 1) { wr(0xD400, 0); wr(0xD401, 0); }
          soundTick();
          yield* tick('tune');
          y = (y - 1) & 255;
        } while (y);
      }
    }
    function* showBonus(r) {                                      // $F3DE: routine 16
      let x = r * 2;
      for (let y = 0; y < 4; y++, x++) M[0x0645 + y] = y < 2 ? M[0xFEFE + x] : 0x30;
      for (let i = 4; i >= 0; i--) M[0x063F + i] = M[0xFEF4 + i];
      yield* playTune(1);
      for (let i = 9; i >= 0; i--) { M[0x05EF + i] = 0x20; M[0x063F + i] = 0x20; }
    }
    function* showBonusJump() {                                   // $F413: routine 17
      for (let i = 9; i >= 0; i--) M[0x05EF + i] = M[0xFEF4 + i];
      yield* playTune(0);
    }
    function* fallAnimation(a, x, y) {                            // $F423: routine 18
      soundFall();
      M[0x40] = 0x30;
      for (;;) {
        scrollBalloons();
        drawClown(((y & 0x80) ? 0x80 : 0) | M[0x3A], (y << 1) & 255, 0xB8);
        soundTick();
        yield* tick('fall');
        M[0x40]--;
        if (!M[0x40]) break;
        if (!(M[0x40] & 0x0F)) M[0x3A] = (M[0x3A] + 1) & 255;
      }
      if (M[0x4F]) {
        showHighScore(a, x);
        yield* playTune(2);
        for (let i = 0x0F; i >= 0; i--) M[0x063C + i] = 0x20;
      }
    }
    function soundOn() { wr(0xD418, 0x1F); M[0x4F] = 0xFF; }
    function soundOff() { wr(0xD418, 0x10); M[0x4F] = 0; }
    function blinkGameOver() {                                    // $F47F: routine 24
      if (M[0x43]) { M[0x43]--; return; }
      M[0x43] = 0x32;
      if (M[0x05EF] !== 0x20) { for (let i = 8; i >= 0; i--) M[0x05EF + i] = 0x20; }
      else for (let i = 8; i >= 0; i--) M[0x05EF + i] = M[0xFF0E + i];
    }
    function readKeys() {                                         // $F4A6: routine 5
      let r;
      wr(0xDC00, 0xFF);
      const v = rd(0xDC01);
      if (!(v & 4)) r = 1;
      else if (!(v & 8)) r = 3;
      else {
        wr(0xDC00, 0xFE);
        const k = rd(0xDC01);
        r = !(k & 0x10) ? 1 : !(k & 0x20) ? 3 : 0;
      }
      M[0x20] = r;
      wr(0xDC00, 0x7F);
      return r;
    }
    function* waitKey() {                                         // $F4DB: routine 23
      do yield* tick('key'); while (readKeys());
      do yield* tick('key'); while (!readKeys());
      return M[0x20];
    }
    function drawPlayfieldTwice(a) { drawPlayfield(a); swapBalloons(); drawPlayfield(a); }   // $F4EE: routine 7
    function drawPlayfield(a) {                                   // $F4F6
      if (!a) for (let y = 0x27; y >= 0; y--) M[0x7A + y] = M[0x0400 + y];
      putChar(0x93);
      for (let y = 0x27; y >= 0; y--) { M[0x0400 + y] = M[0xFEC0 + y]; wr(0xD800 + y, 3); }
      if (!a) for (let x = 0x27; x >= 0; x--) M[0x0400 + x] = M[0x7A + x];
      for (let x = 0; M[0xFE8D + x] < 0x80; x += 5) {
        M[0x31] = M[0xFE8D + x]; M[0x32] = M[0xFE8E + x]; M[0x2C] = M[0xFE8F + x];
        screenAddress();
        do {
          M[w16(0x26)] = M[0xFE90 + x];
          wr(w16(0x28), 3);
          const s = M[0xFE91 + x];
          let v = M[0x26] + s; M[0x26] = v & 255; if (v > 255) M[0x27] = (M[0x27] + 1) & 255;
          v = M[0x28] + s; M[0x28] = v & 255; if (v > 255) M[0x29] = (M[0x29] + 1) & 255;
          M[0x2C]--;
        } while (M[0x2C]);
      }
      for (let x = 0x23; x >= 0; x--) { wr(0xD87A + x, 6); wr(0xD8CA + x, 5); wr(0xD91A + x, 7); }
      for (let y = 2; y >= 0; y--) { refillRow(y); M[0x50 + y] = 1; M[0x53 + y] = 2; }
    }
    function* platformRun(flags, xa, ya) {                        // $F58E: routine 8
      M[0x4E] = flags;
      if (!(flags & 0x80)) {
        for (let i = 9; i >= 0; i--) M[0x06B7 + i] = 0x20;
        if (flags & 0x40) for (let i = 9; i >= 0; i--) M[0x06B7 + i] = M[0xFEE8 + i];
        M[0x066F] = 0x31 + (flags & 1);
        for (let i = 5; i >= 0; i--) M[0x0668 + i] = M[0xFEEE + i];
      }
      for (let i = 0x2E; i <= 0x4C; i++) M[i] = 0;
      let px;
      if (!xa) { px = 0x11; M[0x42] = 1; M[0x3A] = 7; } else { px = 0x25; M[0x42] = 0xFF; M[0x3A] = 0x89; }
      M[0x3C] = 0x0D;
      do {
        M[0x3D] = 0x0A;
        do {
          scrollBalloons();
          if (M[0x4E] & 0x80) blinkGameOver(); else paddleSeesaw(M[0x4E], M[0x4D]);
          yield* tick('run');
        } while (--M[0x3D]);
        drawClown(M[0x3A], px, ya);
        if (M[0x3A] & 1) M[0x3A]++; else M[0x3A]--;
        M[0x3A] &= 255;
        px = (px + M[0x42]) & 255;
      } while (--M[0x3C]);
      for (let i = 7; i >= 0; i--) M[0x0668 + i] = 0x20;
    }
    function showStatusNumber(a, x, y) {                          // $F668: routine 4
      M[0x2C] = a; M[0x37] = 1;
      M[0x36] = y & 0x80 ? 0x22 : 8;
      printDigits(M[0x2C], x);
      M[0x0417] = ((y & 0x7F) + 0x40) & 255;
    }
    function showHighScore(a, x) {                                // $F688: routine 19
      for (let i = 0; i < 10; i++) putChar(M[0xFF04 + i]);
      M[0x37] = 0;
      printDigits(a, x);
    }
    function printDigits(a, x) {                                  // $F69B
      M[0x35] = 0;
      let v = (x << 8 | a) & 0xFFFF;
      for (let y = 5; y >= 0; y--) {
        const d = M[0xFFD0 + y] | M[0xFFD5 + y] << 8;
        M[0x2C] = 0;
        while (v >= d) { v -= d; M[0x2C]++; }
        let ch;
        if (M[0x2C] || M[0x35] || y === 0) { ch = M[0x2C] | 0x30; M[0x35]++; } else ch = 0x20;
        statusPut(ch);
      }
    }
    function statusPut(a) {                                       // $F6E9
      M[0x34] = a;
      if (!M[0x37]) { putChar(a); return; }
      const x = M[0x36]; M[0x36] = (x + 1) & 255;
      M[0x0400 + x] = a === 0x20 ? 0x50 : (a + 0x10) & 255;
    }
    function swapBalloons() {                                     // $F71B: routine 6
      for (let x = 0x29; x >= 0; x--) { const t = M[0x50 + x]; M[0x50 + x] = M[0xC2 + x]; M[0xC2 + x] = t; }
      for (let x = 0x23; x >= 0; x--) M[0x065A + x] = 0x20;
    }
    function coldStart() {                                        // $F766
      for (let i = 0x1D; i >= 0; i--) wr(0xD011 + i, M[0xF733 + i]);
      rd(0xD01E); rd(0xD01F);
      wr(0xD003, 0xEA); wr(0xD005, 0xEA);
      for (let i = 0x15; i >= 0; i--) wr(0xD400 + i, M[0xF74C + i]);
      wr(0xDC0D, 0x7F); wr(0xDC0F, 0); wr(0xDC03, 0); wr(0xDC02, 0xFF);
      M[1] = 0xE5; M[0] = 0x2F;
      wr(0xDC04, 0x10); wr(0xDC05, 0x27); wr(0xDC0E, 0x18);
      M[0x07F8] = 0x0F;
      for (let i = 2; i < 256; i++) M[i] = 0;
      for (let i = 0x0200; i < 0x0400; i++) M[i] = 0;
      drawPlayfieldTwice(0xFF);
      showStatusNumber(0, 0, 0);
      showStatusNumber(0, 0, 0x80);
    }

    // ---- the compiled program
    const G = {                                                   // the globals, by the listing's names
      xHi: 0x0200, x: 0x0201, xFr: 0x0202, y: 0x0203, yFr: 0x0204, dxHi: 0x0205, dxLo: 0x0206, dyHi: 0x0207, dyLo: 0x0208,
      level: 0x0209, toGo: 0x020A, right: 0x020B, falling: 0x020C, player: 0x020D, tilt: 0x020E, saw: 0x020F,
      two: 0x0210, hiHi: 0x0211, hiLo: 0x0212, playing: 0x0213, tA: 0x0214, hit: 0x0215, down: 0x0216, tB: 0x0217,
      gHi: 0x0219, gLo: 0x021A, bounces: 0x021B, rnd: 0x021C, scHi: 0x021D, scLo: 0x021F, jumps: 0x0221,
      bonus: 0x023F,
    };
    function initTables() {                                       // $E444
      const T = [[0x022D, 0x80], [0x0229, 2], [0x0231, 6], [0x022E, 0x80], [0x022A, 1], [0x0236, 0x60], [0x0232, 6],
        [0x022F, 0xC0], [0x022B, 1], [0x0237, 0x28], [0x0233, 6], [0x022C, 0xFE], [0x0238, 0x80], [0x0234, 5],
        [0x0226, 3], [0x0227, 0x0B], [0x0228, 0x1B], [0x023C, 3], [0x023D, 0x0A], [0x023E, 0x32], [0x023B, 1],
        [0x0239, 1], [0x023A, 2], [0x0241, 0x64], [0x0242, 0x32], [0x0243, 0x14]];
      for (const [a, v] of T) M[a] = v;
    }
    const negDx = () => { const v = (0x10000 - (M[G.dxHi] << 8 | M[G.dxLo])) & 0xFFFF; M[G.dxHi] = v >> 8; M[G.dxLo] = v & 255; };
    const negDy = () => { const v = (0x10000 - (M[G.dyHi] << 8 | M[G.dyLo])) & 0xFFFF; M[G.dyHi] = v >> 8; M[G.dyLo] = v & 255; };
    function showScore() {                                        // $EC67
      if (!M[G.playing]) return;
      const p = M[G.player];
      showStatusNumber(M[G.scLo + p], M[G.scHi + p], ((p & 1) << 7) + M[G.jumps + p]);
    }
    function addScore(v) {                                        // $EF55
      const p = M[G.player], s = M[G.scLo + p] + v;
      M[G.scLo + p] = s & 255; M[G.scHi + p] = (M[G.scHi + p] + (s >> 8)) & 255;
      showScore();
    }
    function updateSeesaw() {                                     // $EC3C
      paddleSeesaw(M[G.player], M[G.tilt]);
      M[G.saw] = M[0x20];
    }
    function* delay(n) {                                          // $EE90
      M[G.tB] = 1;
      for (;;) { yield* tick('delay'); if (M[G.tB] >= n) break; M[G.tB]++; }
    }
    function* newGame() {                                         // $E4CA
      drawPlayfieldTwice(M[G.playing]);
      M[G.player] = M[G.two] & 1;
      for (;;) {
        const p = M[G.player];
        M[G.jumps + p] = 5; M[G.bonus + p] = 0xFF;
        showScore();
        if (!M[G.player]) break;
        M[G.player]--;
      }
      M[G.tilt] = 0;
      M[0x13] = 1;
      if (M[G.playing]) { M[0x3A] = 4; drawClown(4, 0x9B, 0x96); yield* playTune(0); }
    }
    function* newJump() {                                         // $E55A
      for (const a of [G.bounces, G.dyHi, G.dxHi, G.yFr, G.xFr, G.down, G.level]) M[a] = 0;
      M[G.x] = (random(2) * 7 + 0x10) & 255;
      M[G.xHi] = M[G.x] & 1;
      M[G.y] = (random(2) * 0x20 + 0x51) & 255;
      M[G.dyLo] = M[G.dxLo] = 0x3C;
      if (M[G.xHi] && M[G.dxHi] < 0x80) negDx();
      showScore();
      updateSeesaw();
      M[G.rnd] = random(3);
      M[G.toGo] = (M[0x023C] - M[G.rnd]) & 255;
      M[G.gLo] = M[0x0226]; M[G.gHi] = M[0x0223];
      const p = M[G.player];
      if (M[G.bonus + p] & M[G.two] & M[G.playing]) swapBalloons();
      const flags = ((M[G.playing] ^ 0xFF) & 0x80) | ((M[G.bonus + p] ^ 0xFF) & 0x40) | p;
      yield* platformRun(flags, M[G.xHi], M[G.y]);
      M[G.bonus + p] = 0xFF;
    }
    function* moveClown() {                                       // $E63C
      // the physics
      let v = M[G.xFr] + M[G.dxLo]; M[G.xFr] = v & 255;
      v = M[G.x] + M[G.dxHi] + (v >> 8); M[G.x] = v & 255;
      M[G.xHi] = (M[G.xHi] + (v >> 8)) & 255;
      M[G.right] = M[G.dxHi] < 0x80 ? 0xFF : 0;
      M[G.xHi] = (M[G.xHi] + (M[G.right] ^ 0xFF)) & 255;
      v = M[G.yFr] + M[G.dyLo]; M[G.yFr] = v & 255;
      M[G.y] = (M[G.y] + M[G.dyHi] + (v >> 8)) & 255;
      M[G.falling] = M[G.dyHi] < 0x80 ? 0xFF : 0;
      v = M[G.dyLo] + M[G.gLo]; M[G.dyLo] = v & 255;
      M[G.dyHi] = (M[G.dyHi] + M[G.gHi] + (v >> 8)) & 255;
      if (M[G.y] >= 0xB0 && M[G.falling]) {
        let off = (M[G.xHi] << 8 | M[G.x]) - M[G.saw];
        M[G.tA] = off & 255; M[G.tB] = (off >> 8) & 255;
        off = (M[G.tB] << 8 | M[G.tA]) + (M[G.tilt] ? 6 : -0x15);
        M[G.tA] = off & 255; M[G.tB] = (off >> 8) & 255;
        if (!M[G.tB] && M[G.tA] < 0x18) {
          yield* launch();
        } else {
          M[G.down] = M[G.y] >= 0xB9 ? 0xFF : 0;
        }
      }
      if (!M[G.down]) {
        const low = M[G.falling] && M[G.y] >= 0x97 ? 0x80 : 0;
        moveClownSprite(low | M[G.xHi], M[G.x], M[G.y]);
      }
      yield* collide();
    }
    function* launch() {                                          // $E6C2-$E895
      const z = M[G.tilt] ? (M[G.tA] / 6 | 0) : (3 - (M[G.tA] / 6 | 0)) & 255;
      M[G.tA] = z;
      M[G.dxLo] = (random(0x2D) + M[0x022D + z]) & 255;
      M[G.dxHi] = M[0x0229 + z];
      const k = (M[0x023C + M[G.level]] + (M[G.level] === 0 ? 3 : 0) - M[G.toGo] + M[G.bounces] - M[G.rnd]) & 255;
      const p = k * ((random(0x0B) + 0x0F) & 255);
      const lo = (p & 255) + M[0x0235 + z];
      M[G.dyLo] = lo & 255;
      M[G.dyHi] = (((p >> 8) & 1) + M[0x0231 + z] + (lo >> 8)) & 255;
      negDy();
      const n = 2 - M[G.level];
      if (n) {
        for (M[G.tB] = 1; ; M[G.tB]++) {
          const h = M[G.dxHi];
          M[G.dxHi] = (h >> 1) | (h & 0x80); M[G.dxLo] = (M[G.dxLo] >> 1) | (h & 1) << 7;
          const yh = M[G.dyHi];
          M[G.dyHi] = (yh >> 1) | 0x80; M[G.dyLo] = (M[G.dyLo] >> 1) | (yh & 1) << 7;
          if (M[G.tB] >= n) break;
        }
      }
      if (M[G.dyHi] < 0xFA) M[G.dyHi] = 0xFA;
      const nx = (M[G.tilt] & 1) * 0x25 + M[G.saw];
      M[G.x] = nx & 255; M[G.xHi] = nx >> 8;
      if (M[G.tilt]) negDx();
      M[G.y] = 0xB0;
      M[G.tilt] ^= 0xFF;
      addScore(1);
      M[G.bounces] = (M[G.bounces] + 1) & 255;
      M[G.gLo] = M[0x0226 + M[G.level]]; M[G.gHi] = M[0x0223 + M[G.level]];
      soundBounce();
    }
    function* collide() {                                         // $E8E9
      const c = M[G.hit] = M[0x20];
      if (c === 0x55 && !M[G.right]) { if (M[G.dxHi] & 0x80) negDx(); return; }
      if (c === 0x56 && M[G.right]) { if (M[G.dxHi] < 0x80) negDx(); return; }
      if (c === 0x57 && !M[G.falling]) { if (M[G.dyHi] & 0x80) negDy(); return; }
      if (c === 0x59 && M[G.falling]) { M[G.dyHi] = 0xFF; M[G.dyLo] = (random(0x32) + 0x64) & 255; return; }
      if (c !== 0x60) return;
      M[G.tA] = M[0x22];                                          // pop_balloons, $E9B8
      if (M[G.bounces]) {
        M[G.tB] = M[G.toGo];
        M[G.toGo] = (M[G.toGo] - M[G.tA]) & 255;
        if (M[G.toGo] > M[G.tB]) {
          M[G.level] = M[0x0239 + M[G.level]];
          M[G.rnd] = random(2);
          M[G.toGo] = (M[0x023C + M[G.level]] - M[G.rnd]) & 255;
          M[G.bounces] = 0;
        }
      }
      if (M[G.tA] & 1) { negDx(); negDy(); }
      let v = M[G.dxLo] + random(0x5A); M[G.dxLo] = v & 255; M[G.dxHi] = (M[G.dxHi] + (v >> 8)) & 255;
      v = (M[G.dxHi] << 8 | M[G.dxLo]) - 0x2D; M[G.dxLo] = v & 255; M[G.dxHi] = (v >> 8) & 255;
      for (M[G.tA] = 0; ; M[G.tA]++) {
        const i = M[G.tA];
        if (M[0x23 + i] & M[G.playing]) {
          const p = M[G.player];
          if (i === 0 && M[G.bonus + p]) { yield* showBonusJump(); M[G.bonus + p] = 0; }
          yield* showBonus(i);
          if (!M[G.falling]) M[G.dyHi] = 0;
          addScore(M[0x0241 + M[G.tA]]);
        }
        if (M[G.tA] >= 2) break;
      }
      addScore(M[0x21]);
    }
    function* fly() {                                             // $EB4D
      do {
        updateSeesaw();
        scrollBalloons();
        soundTick();
        yield* moveClown();
        yield* tick('fly');
      } while (!M[G.down]);
      cursor(12, 14);
      yield* fallAnimation(M[G.hiLo], M[G.hiHi], ((M[G.xHi] & 1) << 7) | (M[G.x] >> 1));
      const p = M[G.player];
      if (!M[G.bonus + p]) return;
      M[G.jumps + p] = (M[G.jumps + p] - 1) & 255;
      showScore();
      if (!(M[0x0222] & M[G.two])) return;
      if (!M[0x0221]) {
        cursor(11, 15); M[0x08] = 1; print(0xEC13);
        yield* delay(0xFF);
      }
      M[G.player] ^= 1;
    }
    function* titleScreen() {                                     // $ECAD
      M[G.two] = 0; M[G.playing] = 0;
      soundOff();
      yield* newGame();
      cursor(11, 14); M[0x08] = 1; print(0xECDF);
      cursor(12, 16);
      showHighScore(M[G.hiLo], M[G.hiHi]);
      M[0x08] = 1; putChar(0x0D); print(0xED23);
      for (;;) {
        yield* newJump();
        for (;;) {                                                // $ED4E
          if (M[G.saw] < 0x10) M[G.saw] = 0x10;
          let d = (M[G.xHi] << 8 | M[G.x]) - ((M[G.tilt] ^ 0xFF) & 1) * 0x25;
          M[G.tB] = d & 255; M[G.tA] = (d >> 8) & 255;
          d = (M[G.tA] << 8 | M[G.tB]) - M[G.saw];
          M[G.tB] = d & 255; M[G.tA] = (d >> 8) & 255;
          if (M[G.tB] | M[G.tA]) {
            if (M[G.tA] < 0x80) { const s = M[G.saw] + 2; M[G.saw] = s > 255 ? 0xFF : s; }
            else M[G.saw] = (M[G.saw] - 2) & 255;
          }
          drawSeesaw(M[G.saw], M[G.tilt], false);
          yield* moveClown();
          scrollBalloons();
          blinkGameOver();
          if (readKeys() === 1) return;
          yield* tick('attract');
          if (M[G.down]) {
            yield* fallAnimation(0, 0, ((M[G.xHi] & 1) << 7) | (M[G.x] >> 1));
            break;
          }
        }
      }
    }
    function* playerMenu() {                                      // $EEBC
      M[0x13] = 7;
      cursor(15, 12); M[0x08] = 1; print(0xEEE1);
      putChar(0x0D); print(0xEEF1);
      const k = yield* waitKey();
      M[G.two] = k === 3 ? 0xFF : 0;
    }
    function* main() {                                            // $E000, $E34A
      M[0x08] = M[0x08];
      initTables();
      for (;;) {
        yield* titleScreen();
        yield* playerMenu();
        M[G.playing] = 0xFF;
        soundOn();
        M[0x021E] = M[0x0220] = M[0x021D] = M[0x021F] = 0;
        yield* newGame();
        do { yield* newJump(); yield* fly(); } while (M[0x0221] | M[0x0222]);
        cursor(15, 15); M[0x08] = 1; print(0xE3AF);
        yield* delay(0xFF);
        for (M[G.tA] = 0; ; M[G.tA]++) {
          const i = M[G.tA], hi = M[G.scHi + i], lo = M[G.scLo + i];
          if ((hi === M[G.hiHi] && lo > M[G.hiLo]) || hi > M[G.hiHi]) { M[G.hiHi] = hi; M[G.hiLo] = lo; }
          if (M[G.tA] >= 1) break;
        }
      }
    }
    P.program = function* () { coldStart(); yield* main(); };
    Object.assign(P, { random, putChar, drawClown, moveClownSprite, paddleSeesaw, scrollBalloons, readKeys, showStatusNumber });
    return P;
  }
  return { create, TICK };
})();
