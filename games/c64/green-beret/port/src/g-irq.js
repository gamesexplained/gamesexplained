// The raster interrupt (irq, $CEA9) and its three phases: the multiplexer, which shares the eight
// hardware sprites among the 21 virtual ones down the playfield, irq_status at the bottom of the
// screen (the hero's frame, the frame counters, the status line's bank), and irq_playfield where
// the playfield begins (the fine scroll). Then the main program's side of the sprites: their sort
// (sprites_sort) and the hand-over to the multiplexer (sprites_to_irq).
(function (root) {
'use strict';
const G = root.GBGroups = root.GBGroups || {};
G.irq = function (P) {
  const M = P.M, B = P.B, io = P.io, N = root.GBNames;
  const { irq_phase, irq_phases, mux_raster, mux_next, mux_order, mux_y, mux_xlo, mux_xhi, mux_hw, mux_sprite_y,
    mux_frames, spr_colour, spr_shape, bit_set_masks, bit_clear_masks, frame_flag, frame_counters, idle_lo,
    idle_time, stage, difficulty_rates, difficulty_frac, difficulty, difficulty_caps, status_d018, status_dd00,
    fine_scroll, player_frozen, player_pose, order_changed, spr_y, spr_xlo, spr_xhi, sprite_order, sort_sprite,
    sort_pos, sort_stop, scroll_pending, scroll_step } = N;

  // irq ($CEA9): the VIC's interrupt acknowledged, the current phase (the JSR's operand at $CEB5)
  // run; then the next phase's address written there, 0, 1, 2 and round again. The multiplexer
  // leaves early (mux_wait) with the phase as it was, for another band.
  const PHASES = { 0xC474: 'multiplexer', 0x394E: 'irq_status', 0x39A7: 'irq_playfield' };
  P.irq = function () {
    P.inIrq++;
    try {
      io.vicWrite(0x19, 0xFF);
      const at = M[0xCEB5] | M[0xCEB6] << 8;
      const phase = PHASES[at];
      if (!phase) throw new Error('irq: no phase at $' + at.toString(16));
      const r = P[phase]();
      if (r && r.early) return;
      let p = (M[irq_phase] + 1) & 255;
      if (p === 3) p = 0;
      M[irq_phase] = p;
      const x = (p << 1) & 255;
      M[0xCEB5] = M[irq_phases + x]; M[0xCEB6] = M[irq_phases + x + 1];
    } finally { P.inIrq--; }
  };
  // irq_start ($CE88): the vector at $FFFE pointed at irq, only the raster interrupt let in (CIA 1's
  // turned off and acknowledged), phase 0, the I/O in; then mux_done.
  P.irq_start = function () {
    P.sei();
    M[0xFFFE] = 0xA9; M[0xFFFF] = 0xCE;
    io.vicWrite(0x1A, 1);
    io.ciaWrite(0x0D, 1);
    io.ciaRead(0x0D);
    M[irq_phase] = 0;
    M[1] = 0x35;
    return P.mux_done();
  };
  // multiplexer ($C474): the band's threshold 14 lines on; then each virtual sprite in the order
  // whose Y is above the threshold is placed in the next hardware sprite (7 down to 0 and round
  // again): its colour, its shape in the screen's pointers ($43F8), its X's high bit, its Y and X.
  // When all are placed, mux_done; when the next is not due, mux_wait.
  P.multiplexer = function () {
    M[mux_raster] = (M[mux_raster] + 0x0E) & 255;
    P.cli();
    for (;;) {
      P.count('mux');
      const x = M[mux_order + M[mux_next]];
      const yv = M[mux_y + x];
      if (yv >= M[mux_raster]) return P.mux_wait({ a: yv });
      P.count('mux_place');
      M[mux_sprite_y] = yv;
      const h = M[mux_hw];
      io.vicWrite(0x27 + h, M[spr_colour + x]);
      M[0x43F8 + h] = M[spr_shape + x];
      const msb = io.vicRead(0x10);
      io.vicWrite(0x10, M[mux_xhi + x] ? msb | M[bit_set_masks + h] : msb & M[bit_clear_masks + h]);
      io.vicWrite(0x01 + 2 * h, M[mux_sprite_y]);
      io.vicWrite(0x00 + 2 * h, M[mux_xlo + x]);
      const n = (M[mux_next] - 1) & 255;
      M[mux_next] = n;
      if (n & 0x80) return P.mux_done();
      const k = (M[mux_hw] - 1) & 255;
      M[mux_hw] = k & 0x80 ? 7 : k;
    }
  };
  // mux_done ($C4CF): back to hardware sprite 7, mux_frames on, the next interrupt at raster $F6
  // (irq_status) and the threshold at $32.
  P.mux_done = function () {
    M[mux_hw] = 7;
    M[mux_frames] = (M[mux_frames] + 1) & 255;
    io.vicWrite(0x12, 0xF6);
    M[mux_raster] = 0x32;
    return { a: 0x32 };
  };
  // mux_wait ($C4E0): the next interrupt 14 lines above the next sprite's Y (A), or two lines after
  // the line the beam is on when that has passed (three when it is that line), and the threshold
  // with it; the interrupt ends there.
  P.mux_wait = function (r) {
    let a = (r.a - 0x0E) & 255;                     // C is set (the BCS that came here)
    const line = io.vicRead(0x12);
    let c;
    if (a > line) c = 1;
    else {
      c = a === line ? 1 : 0;
      const s = io.vicRead(0x12) + 2 + c;
      a = s & 255; c = s > 255 ? 1 : 0;
    }
    a = (a + c) & 255;
    io.vicWrite(0x12, a);
    M[mux_raster] = a;
    return { early: true };
  };
  // irq_status ($394E): the hero's frame (irq_player), the frame flag and the six frame counters
  // up; every 256 frames idle_time up (to $FF at most) and the stage's rate added to
  // difficulty_frac, its carry raising the difficulty below the stage's cap; then the status line's
  // registers: no fine scroll, its screen and characters (status_d018), its bank (status_dd00),
  // and the next interrupt at raster $46.
  P.irq_status = function () {
    P.irq_player();
    M[frame_flag] = (M[frame_flag] + 1) & 255;
    for (let x = 5; x >= 0; x--) M[frame_counters + x] = (M[frame_counters + x] + 1) & 255;
    M[idle_lo] = (M[idle_lo] + 1) & 255;
    if (!M[idle_lo]) {
      const t = M[idle_time] + 1;
      let c = t > 255 ? 1 : 0;
      if (!c) M[idle_time] = t;
      const y = M[stage];
      const f = M[difficulty_rates + y] + M[difficulty_frac] + c;
      M[difficulty_frac] = f & 255;
      if (f > 255) {
        const d = (M[difficulty] + 1) & 255;
        if (d < M[difficulty_caps + y]) M[difficulty] = d;
      }
    }
    io.vicWrite(0x16, 0x10);
    io.vicWrite(0x18, M[status_d018]);
    io.cia2Write(0x00, M[status_dd00]);
    io.vicWrite(0x12, 0x46);
    return { a: 0x46 };
  };
  // irq_playfield ($39A7): the fine scroll into $D016, every hardware sprite's Y 0, the playfield's
  // screen and characters ($0F) in bank 1 ($92), and the next interrupt on the line after this one
// (an INC, which writes the line it read before the line after it).
  P.irq_playfield = function () {
    io.vicWrite(0x16, (io.vicRead(0x16) & 0x10) | M[fine_scroll]);
    for (let h = 0; h < 8; h++) io.vicWrite(0x01 + 2 * h, 0);
    io.vicWrite(0x18, 0x0F);
    io.cia2Write(0x00, 0x92);
    const line = io.vicRead(0x12);
    io.vicWrite(0x12, line);
    io.vicWrite(0x12, (line + 1) & 255);
    return {};
  };
  // irq_player ($0778): the stick read (read_joystick); unless key 1 is held or the hero is frozen,
  // his move, his pose, his knife and the copy protection's check; the topmost sprite; the sound
  // driver's three effect players.
  P.irq_player = function () {
    P.read_joystick();
    if ((io.ciaRead(0x01) & 0x01) && !M[player_frozen]) {
      P.player_move();
      P.player_animate();
      P.player_stab_check();
      P.cia2_serial_check();
    }
    P.find_top_sprite();
    P.v1_effects();
    P.v2_effects();
    return P.v3_effects();
  };
  // player_stab_check ($079F): a stab (bit 4 of the pose) runs the knife's hit test.
  P.player_stab_check = function () {
    if (!(M[player_pose] & 0x10)) return { a: 0 };
    return P.knife_hit_test({ a: M[player_pose] });
  };
  // cia2_serial_check ($0100): CIA 2's interrupt data read (LAX); without the serial port's "byte
  // out" bit the processor stops (the JAM at $010B), as it never does on a C64 that ran the
  // start-up; with it, a byte written to the serial port again (A & X, SAX).
  P.cia2_serial_check = function () {
    const v = io.cia2Read(0x0D);
    const a = (v & 0x08) >> 1;
    if (!a) throw new Error('cia2_serial_check: the serial port\'s flag is clear, and the C64 stops at the JAM at $010B');
    io.cia2Write(0x0C, a & v);
    return { a, x: v };
  };

  // sprites_to_irq ($C444): the virtual sprites' Y, X low and X high copied to the multiplexer's
  // lists, and the order too when the last sort changed it.
  P.sprites_to_irq = function () {
    const order = M[order_changed];
    for (let x = 0x14; x >= 0; x--) {
      M[mux_y + x] = B(spr_y + x);
      M[mux_xlo + x] = B(spr_xlo + x);
      M[mux_xhi + x] = M[spr_xhi + x];
      if (order) M[mux_order + x] = M[sprite_order + x];
    }
    return { x: 0xFF };
  };
  // sprites_sort ($CED7): the order sorted by Y, highest first, by insertion; order_changed counts
  // the moves. Then the scroll the interrupt counted less the step this pass took (scroll_pending),
  // with the interrupt held off.
  P.sprites_sort = function () {
    M[order_changed] = 0;
    let x = 1, y;
    do {
      const prevY = B(spr_y + M[sprite_order - 1 + x]);
      y = M[sprite_order + x];
      const curY = B(spr_y + y);
      if (prevY < curY) {
        const a = B(spr_y + y);
        M[sort_sprite] = y;
        M[sort_pos] = x;
        let k = x - 1;
        for (;;) {
          P.count('sort_scan');
          k--;
          if (k < 0) break;
          y = M[sprite_order + k];
          const v = B(spr_y + y);
          if (a <= v) break;
        }
        k++;
        M[order_changed] = (M[order_changed] + 1) & 255;
        M[sort_stop] = k;
        let j = M[sort_pos];
        do { P.count('sort_move'); M[sprite_order + j] = M[sprite_order - 1 + j]; j--; } while (j !== M[sort_stop]);
        M[sprite_order + j] = M[sort_sprite];
        x = M[sort_pos];
      }
      x++;
    } while (x !== 0x15);
    const i = P.iflag();
    P.sei();
    const p = B(scroll_pending), s = M[scroll_step];
    const a = M[scroll_pending] = p === s ? 0 : (p - s) & 255;
    if (!i) P.cli();
    return { a, x, y };
  };
  // sprite_order_reset ($C564): the order back to 0-20, the sixteen position registers 0, the
  // interrupt held off; the sprites handed over and sorted.
  P.sprite_order_reset = function () {
    for (let y = 0x14; y >= 0; y--) { M[sprite_order + y] = y; io.vicWrite(y & 0x0F, 0); }
    P.sei();
    P.sprites_to_irq();
    return P.sprites_sort();
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
