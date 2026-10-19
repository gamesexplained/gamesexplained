// The interrupt during play (irq_play), four raster interrupts a frame, and what it calls of its
// own: the scroll (scroll_view), the view copied to the screen (draw_view) and the sound effects
// (sound). irq_play clears the I flag at once, so the next raster interrupt can come in while it
// works: it yields { cp } at each of its calls, where the lockstep runs one that came.
(function (root) {
'use strict';
(root.PeteGroups = root.PeteGroups || {}).irq = function (P) {
const M = P.M, io = P.io;

// irq_play ($1991), entered through the KERNAL's vector at $0314.
P.irq_play = function* () {
  io.write(0xFF09, 0x02);
  io.cli();
  const state = M[0x04];
  if (state === 0) {                                       // line 0: the sky, the timers' sparkle, the sound
    io.write(0xFF07, M[0x03]);
    M[0x64] = (M[0x64] + 1) & 0xFF;
    if (M[0x64] === 0 && M[0xA8] !== 0) M[0xA0] = (M[0xA0] + 1) & 0x0F;
    const x = M[0xA0];
    io.write(0xFF15, M[0x1AFD + x]); io.write(0xFF16, M[0x1B0D + x]); io.write(0xFF17, M[0x1B1D + x]);
    io.write(0xFF0B, 0x1A);
    M[0x04] = (M[0x04] + 1) & 0xFF;
    for (let i = 0; i < 7; i++) M[0x1510 + i] = (io.read(0xFF01) | io.read(0xFF04)) & M[0x1511 + i];
    const s = io.read(0xFF00) + io.read(0xFF01) + 1;      // the carry from CPX #$07
    M[0x1517] = (s & 0xFF) ^ M[0x7A];
    yield { cp: 0x19EA }; P.sound({ c: s >> 8 });
    if ((M[0x64] & 0x03) === 0x03) { M[0x1379] = M[0x1378]; M[0x1378] ^= 0x3C; }   // the fuse flickers
    if (M[0x7B] !== 0) {                                   // b_1A00: the seconds that release creatures
      M[0x7E] = (M[0x7E] - 1) & 0xFF;
      if (M[0x7E] === 0) { M[0x7E] = M[0x7D]; M[0x7B] = (M[0x7B] - 1) & 0xFF; }
    }
    return;
  }
  if (state === 1) {                                       // b_1A14, line $1A: the mine's colours, the scroll, the controls
    io.write(0xFF15, 0x00); io.write(0xFF16, 0x41); io.write(0xFF17, 0x39);
    io.write(0xFF0B, 0xAC);
    yield { cp: 0x1A2C }; P.scroll_view();
    if (M[0xA7] >= 0x09) { yield { cp: 0x1A35 }; P.scroll_view(); }
    yield { cp: 0x1A38 }; P.read_controls();
    yield { cp: 0x1A3D }; M[0xBA] = P.read_key_row({ a: 0xBF }).a & M[0x2126];   // ESC
    M[0x04] = (M[0x04] + 1) & 0xFF;
    return;
  }
  if (state !== 2) {                                       // j_1AEE, line $BA: above the status line
    io.write(0xFF07, 0x98);
    io.write(0xFF0B, 0x00);
    M[0x04] = 0;
    return;
  }
  io.write(0xFF0B, 0xBA);                                  // b_1A50, line $AC: the view, then the moves
  M[0x04] = (M[0x04] + 1) & 0xFF;
  yield { cp: 0x1A57 }; P.stamp_figures();
  yield { cp: 0x1A5A }; P.draw_figures();
  yield { cp: 0x1A5D }; P.draw_view();
  yield { cp: 0x1A60 }; P.unstamp_figures();
  if (M[0xA8] === 0) return;
  if (M[0xBB] === 0) {                                     // Pete, every other frame (every frame from level 10)
    if (M[0x6D] === 0 && M[0x83] === 0) {
      M[0x6D]++;
      yield { cp: 0x1A75 }; P.move_pete();
      M[0x6D] = (M[0x6D] - 1) & 0xFF;
      M[0xBB] = M[0xA7] >= 0x09 ? 0x01 : 0x02;
      M[0xBB] = (M[0xBB] - 1) & 0xFF;
    }
  } else M[0xBB] = (M[0xBB] - 1) & 0xFF;
  if (M[0x82] === 0) {                                     // b_1A89: the creatures, faster at night
    if (M[0x6C] === 0) {
      M[0x6C]++;
      yield { cp: 0x1A93 }; yield* P.move_creatures();
      M[0x6C] = (M[0x6C] - 1) & 0xFF;
      M[0x82] = M[0xA0] >= 0x06 && M[0xA0] < 0x0A ? M[0xA2] : M[0x81];
      M[0x82] = (M[0x82] - 1) & 0xFF;
    }
  } else M[0x82] = (M[0x82] - 1) & 0xFF;
  if (M[0x6A] === 0) return;                               // b_1AAB: the water, once the flood has begun
  if (M[0x89] !== 0) {
    if (M[0x6B] !== 0) return;
    M[0x6B]++;                                             // b_1ABA: water let_water_in left for here
    M[0x5A] = M[0x86]; M[0x70] = M[0x87]; M[0x71] = M[0x88];
    M[0x5D] = 0; M[0x89] = 0;
    yield { cp: 0x1ACE }; P.add_water({ x: 0 });
    M[0x6B] = (M[0x6B] - 1) & 0xFF;
  }
  if (M[0x80] === 0) {                                     // b_1AD3
    if (M[0x6B] !== 0) return;
    M[0x6B]++;
    yield { cp: 0x1AE0 }; P.water_step();
    M[0x6B] = (M[0x6B] - 1) & 0xFF;
    M[0x80] = M[0x7F];
  }
  M[0x80] = (M[0x80] - 1) & 0xFF;                          // b_1AE9
};

// The view's scroll, a pixel a call, and when to start and stop it by Pete's column (scroll_view, $1B2D).
P.scroll_view = function () {
  const d = M[0x08];
  if (d !== 0) {
    if (d & 0x80) {                                        // left
      if ((M[0x03] & 0x07) !== 0x07) { M[0x03] = (M[0x03] + 1) & 0xFF; return; }
      if (M[0x02] !== 0x26) { M[0x02] = (M[0x02] - 1) & 0xFF; M[0x03] = 0x90; }
      else M[0x08] = 0;
    } else {                                               // b_1B52: right
      if ((M[0x03] & 0x07) !== 0) { M[0x03] = (M[0x03] - 1) & 0xFF; return; }
      if (M[0x02] !== 0x59) { M[0x02] = (M[0x02] + 1) & 0xFF; M[0x03] = 0x97; }
      else M[0x08] = 0;
    }
  }
  let s = M[0x02] - 0x0A; M[0x20] = s & 0xFF;              // b_1B67: ten columns in from each edge
  s = (s & 0xFF) - 0x12 - (s < 0 ? 1 : 0); M[0x1F] = s & 0xFF;
  const x = M[0x06];
  if (x < M[0x1F]) {
    if (M[0x02] < 0x27 && (M[0x03] & 0x07) !== 0) return;
    M[0x08] = 0xFF;
    return;
  }
  if (x >= M[0x20]) {                                      // b_1B8A
    if (M[0x02] >= 0x77 && (M[0x03] & 0x07) === 0x07) return;
    M[0x08] = 0x01;
    return;
  }
  const a = (x - M[0x1F]) & 0xFF;                          // b_1BA2: back in the middle?
  if (M[0x08] & 0x80 ? a < 0x09 : a >= 0x09) return;
  M[0x08] = 0;
};

// The view, 39 columns of the map ending at column $02, to the screen at $0C00 (draw_view, $1BB9).
P.draw_view = function () {
  const right = M[0x02];
  for (let row = 0; row < 23; row++) {
    const from = 0x37EA + row * 0x5A + right - 0x26, to = 0x0C00 + row * 40;
    for (let y = 0; y <= 0x26; y++) M[(to + y) & 0x3FFF] = M[(from + y) & 0x3FFF];
  }
  P.N.view++;
};

// The sound effects, the first that is going: the sticks' tones ($BD), the level's end ($C5), a
// pick-up ($BE), an explosion ($BF), Pete's death ($C1), a fuse ($C3), Pete digging ($4A). c is
// the carry irq_play leaves, which each random wobble adds (sound, $3689).
P.sound = function (r = {}) {
  const c = r.c || 0;
  const dec = () => P.rmw(0xFF11, v => v - 1), inc = () => P.rmw(0xFF11, v => v + 1);
  const wobble = () => (io.read(0xFF00) + io.read(0xFF1E) + c) & 0xFF;
  if (M[0xBD] !== 0) {
    dec();
    if (io.read(0xFF11) & 0x0F) return;
    M[0xBD] = (M[0xBD] - 1) & 0xFF;
    if (M[0xBD] === 0) return silence();
    io.write(0xFF11, M[0xBD] | 0x40);
    return;
  }
  if (M[0xC5] !== 0) {                                     // b_36A7
    if (M[0x64] & 1) return;
    const f = io.read(0xFF0E);
    io.write(0xFF0F, f); io.write(0xFF0E, f ^ 0x03);
    dec();
    if (io.read(0xFF11) === 0x30) return silence();
    return;
  }
  if (M[0xBE] !== 0) {                                     // b_36C6
    io.write(0xFF0E, (wobble() & 0x07) ^ io.read(0xFF0E));
    if (M[0xBE] & 0x80) {
      inc();
      const v = io.read(0xFF11);
      if (v !== 0x14) return;
      M[0xBE] = v; io.write(0xFF12, 0x0A);
      return;
    }
    dec();                                                 // b_36EF
    if (io.read(0xFF11) & 0x0F) return;
    M[0xBE] = (M[0xBE] - 1) & 0xFF;
    io.write(0xFF11, M[0xBE]);
    if (M[0xBE] & 0x0F) return;
    return silence();
  }
  if (M[0xBF] !== 0) {                                     // b_3708
    io.write(0xFF0F, (wobble() & 0x07) ^ io.read(0xFF0F));
    if (!(M[0xBF] & 0x80)) {
      dec();
      if (io.read(0xFF11) & 0x0F) return;
      M[0xBF] = 0xFF;
      io.write(0xFF10, 0x00); io.write(0xFF0F, 0x00); io.write(0xFF11, 0x4C);
      return;
    }
    M[0xC0] = (M[0xC0] + 1) & 0xFF;                        // b_3739
    if (!(M[0xC0] & 0x03)) return;
    dec();
    if (io.read(0xFF11) & 0x0F) return;
    return silence();
  }
  if (M[0xC1] !== 0) {                                     // b_374F
    io.write(0xFF0F, (wobble() & 0x07) ^ io.read(0xFF0F));
    if (!(M[0xC1] & 0x80)) {
      inc();
      if ((io.read(0xFF11) & 0x0F) !== M[0xC2]) return;
      M[0xC1] = 0xFF; io.write(0xFF0F, 0xF0);
      return;
    }
    dec();                                                 // b_377B
    if (io.read(0xFF11) & 0x0F) return;
    M[0xC0] = (M[0xC0] + 1) & 0xFF;
    if (!(M[0xC0] & 1)) {
      M[0xC2] = (M[0xC2] - 1) & 0xFF;
      if (M[0xC2] === 0) return silence();
    }
    M[0xC1] = 0x01; io.write(0xFF0F, 0xE0);                // b_3790
    return;
  }
  if (M[0xC3] !== 0) {                                     // b_379A
    io.write(0xFF0F, (wobble() | 0xAA) ^ io.read(0xFF0F));
    io.write(0xFF11, 0x41); io.write(0xFF10, 0x03);
    return;
  }
  if (M[0x4A] === 0) return silence();                     // b_37B7
  io.write(0xFF0F, wobble() ^ io.read(0xFF0F));
  io.write(0xFF10, 0x01);
  M[0xC4] = (M[0xC4] + 1) & 0x43;
  io.write(0xFF11, M[0xC4]);
};
function silence() {                                       // j_37D8
  io.write(0xFF11, 0x00);
  M[0xBE] = M[0xBF] = M[0xC1] = M[0xC3] = M[0xC5] = 0;
}
};
})(typeof window !== 'undefined' ? window : globalThis);
