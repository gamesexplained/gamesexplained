// The raster interrupt: seven stages a frame, each setting the next one's line and handler
// ($0314): the status row's colour (line 16), the view's screen and character set and the sky
// (66), three bands of the horizon (121, 125, 128), the ground's mirror set (130), and the
// console's screen with the frame's own work (194): the engine's sound on voice 1, the hum on
// voice 3, the frame counters and the view's colours, alternate frames in each nibble of the
// scene's colour bytes. Each is entered through the KERNAL's IRQ entry ($FF48, which pushes A, X
// and Y) and leaves by pulling them back; none clears I.
(function (root) {
'use strict';
const G = root.EncGroups = root.EncGroups || {};
G.irq = function (P) {
  const M = P.M;
  const io = P.io;
  const vic = (r, v) => io.vicWrite(r, v);
  // The cycles the handlers' chip writes land on, counted from the start of the line the interrupt
  // fell due on, the processor's own (the video chip's are on top): the interrupt is taken a cycle
  // in, as the instruction under way ends, then come its seven cycles and the KERNAL's entry
  // ($FF48, 29), so the handler's first instruction starts on cycle 37; a store writes on its last
  // cycle. The page's video chip takes each write on its cycle (io.cycle, which the lockstep does
  // not define), so the colours split where the C64's do, and P.irqCycles is the whole handler's,
  // the KERNAL's exit (PLA TAY PLA TAX PLA RTI, 22) among them. port/test/t-irq.js checks both on
  // the game.
  const at = n => { if (io.cycle) io.cycle(n); };
  const EXIT = 22;
  // a store whose instruction starts on cycle c
  const st = (r, v, c) => { at(c + 3); vic(r, v); return c + 4; };
  // the next stage, from cycle c: its handler and its line, and this one's latch acknowledged
  // (LDA #, STA four times); the cycle after
  const next = (h, line, c) => {
    M[0x0314] = h & 255; M[0x0315] = h >> 8;
    at(c + 17); vic(0x12, line);
    at(c + 23); vic(0x19, 1);
    return c + 24;
  };

  P.irq_status_band = function () {
    const c = st(0x21, 0x0B, 37 + 2);
    P.irqCycles = next(0xB31D, 0x42, c) + EXIT;
  };
  P.irq_view_top_sky = function () {
    // four NOPs, LDX zp, LDA #
    let c = st(0x18, M[0x1A], 37 + 8 + 3 + 2);
    c = st(0x16, 0x18, c);
    c = st(0x21, M[0xBB], c + 3);
    M[0xAA] = 0xFF;
    P.irqCycles = next(0xB34E, 0x79, c + 2 + 3) + EXIT;
  };
  // seven NOPs, LDA zp
  const band = (a, h, line) => {
    const c = st(0x21, M[a], 37 + 14 + 3);
    P.irqCycles = next(h, line, c) + EXIT;
  };
  P.irq_horizon_band1 = function () { band(0xBC, 0xB374, 0x7D); };
  P.irq_horizon_band2 = function () { band(0xBD, 0xB39A, 0x80); };
  P.irq_horizon_band3 = function () { band(0xBE, 0xB3C0, 0x82); };
  P.irq_ground_mirror_charset = function () {
    // four NOPs, LDA zp, ORA #
    let c = st(0x18, M[0x1A] | 2, 37 + 8 + 3 + 2);
    c = st(0x21, M[0xAD], c + 3);
    P.irqCycles = next(0xB3EA, 0xC2, c) + EXIT;
  };
  // irq_console_and_frame_tick ($B3EA), with irq_frame_tick_voice1 ($B415), irq_frame_tick_voice3
  // ($B444) and irq_frame_counter_colour_flip ($B45F)
  P.irq_console_and_frame_tick = function () {
    // six NOPs, LDA #
    let c = st(0x18, 0x8E, 37 + 12 + 2);
    c = st(0x16, 0x08, c + 2);
    c = st(0x21, 0x00, c + 2);
    M[0xAA] = 0;
    c = next(0xB2FE, 0x10, c + 3);
    const sid = (r, v) => { at(c + 3); io.sidWrite(r, v); c += 4; };
    // LDA abs,X: a cycle more where the index takes it into the next page
    const abx = (base, x) => { c += 4 + (((base & 255) + x) > 255 ? 1 : 0); return M[base + x]; };
    // voice 1: while $1D counts down a sound plays there; at its end, and after, the engine's
    // pitch loop ($80C8 from $93, stepped by $94), or the gate closed when $93 is 0
    let a = M[0x1D];
    let engine = true;
    c += 3;
    if (!a) c += 3;
    else {
      c += 2 + 5;
      M[0x1D] = (a - 1) & 255;
      if (M[0x1D]) { engine = false; c += 3; }
      else { c += 2 + 3 + 3 + 2; M[0x94] = M[0x93]; sid(0x05, 0); }
    }
    if (engine) {
      a = 1;
      c += 2 + 3;
      if (!M[0x93]) c += 3;
      else {
        c += 2 + 5 + 3;
        M[0x94] = (M[0x94] + 1) & 255;
        let v = abx(0x80C8, M[0x94]);
        if (v) c += 3;
        else { c += 2 + 3 + 3; M[0x94] = M[0x93]; v = abx(0x80C8, M[0x94]); }
        sid(0x01, v);
        a = 0x81;
        c += 2;
      }
      sid(0x04, a);
    }
    // voice 3, the hum: $48's pitch loop ($80A0, stepped by $49)
    c += 3;
    if (M[0x5A]) { c += 2 + 5; M[0x5A] = (M[0x5A] - 1) & 255; } else c += 3;
    const y = M[0x48];
    c += 3;
    if (!y) c += 3;
    else {
      c += 2 + 5 + 3;
      M[0x49] = (M[0x49] + 1) & 255;
      let v = abx(0x80A0, M[0x49]);
      if (v) c += 3;
      else { c += 2 + 3; M[0x49] = y; v = abx(0x80A0, y); }
      sid(0x0F, v);
    }
    // the counters, and the colours: even frames the low nibbles, odd frames the high
    c += 5 + 3;
    M[0x1B] = (M[0x1B] + 1) & 255;
    if (M[0x1B]) c += 3; else { c += 2 + 5; M[0x58] = (M[0x58] + 1) & 255; }
    const odd = M[0x1B] & 1, sh = odd ? 4 : 0;
    c += 2 + 3 + (odd ? 3 + 8 : 2);
    c = st(0x23, M[0xA7] >> sh, c);
    c = st(0x22, M[0xAB] >> sh, c + 3 + (odd ? 8 : 0));
    M[0xBB] = M[0xAC] >> sh; M[0xBC] = M[0xB2] >> sh; M[0xBD] = M[0xB3] >> sh; M[0xBE] = M[0xB4] >> sh;
    P.irqCycles = c + 4 * (odd ? 3 + 8 + 3 : 3 + 3) + EXIT;
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
