// The raster interrupt (irq) and its five bands, a frame's work shared among them; the controls
// (read_controls, read_keys, demo_controls, test_key and the keys check_play_keys and menu_keys
// read); the random numbers (seed_random, random, random_byte); and the sound effects.
(function (root) {
'use strict';
(root.TexGroups = root.TexGroups || {}).irq = function (P) {
const M = P.M, io = P.io, Z = P.Z, T = P.T, B = P.irqByte;
const at = (z, y) => ((M[z] | M[(z + 1) & 0xFF] << 8) + y) & 0x3FFF;

// irq ($18A9), entered through the KERNAL's vector at $0314 at each of the five raster lines in
// raster_lines: the flag acknowledged, the band stepped on, its work, the next line set. It never
// clears the I flag itself; only tex_death's call of refill_pipe does, which can let the next
// interrupt in, at the checkpoints irq_field and the way out yield.
P.irq = function* () {
  io.write(0xFF09, io.read(0xFF09));
  let x = (M[Z.irq_band] + 1) & 0xFF;
  if (x === 0x05) x = 0;
  M[Z.irq_band] = x;
  const band = M[Z.irq_band];
  if (band === 0) P.irq_frame();
  else if (band === 1) P.irq_skyline();
  else if (band === 2) yield* P.irq_field({ c: 1 });     // the carry from CMP #$02, equal
  else if (band === 3) P.irq_pipe();
  else if (band === 4) P.irq_scroller();
  yield { cp: 0x18DD };                                    // b_18DD, every band's way out
  io.write(0xFF0B, M[(T.raster_lines + M[Z.irq_band]) & 0x3FFF]);
};

// Line 204, below the message row: the HUD's colours and character set for the top of the next
// frame, the three scrolls, then the HUD's bars and the enemies drawn, the bullet moved and the
// keys read (in play), or the menu's keys and animation.
P.irq_frame = function () {
  io.write(0xFF07, (io.read(0xFF07) & 0x60) | 0x18);
  io.write(0xFF15, 0x70); io.write(0xFF19, 0x70);
  io.write(0xFF16, 0x51); io.write(0xFF17, 0x31);
  P.scroll_pipe(); P.scroll_skyline(); P.scroll_message();
  io.write(0xFF13, 0x3C);
  if (M[Z.menu_on] === 0) {
    P.draw_pressure_bar(); P.draw_completed_bar(); P.draw_explosion(); P.draw_arrow(); P.draw_jet();
    P.draw_bouncy_bomb(); P.draw_explosive(); P.move_bullet(); P.check_play_keys();
  } else { P.menu_keys(); P.menu_tick(); }
};
// Line 23, the skyline: its scroll, the RAM characters and its colours, after a wait to the line's
// end (LDX #$24, DEX, BPL); then Tex's legs.
P.irq_skyline = function () {
  io.write(0xFF07, (io.read(0xFF07) & 0x70) | 0x80 | M[Z.skyline_scroll]);
  io.write(0xFF13, 0x10);
  io.write(0xFF15, M[Z.skyline_bg]); io.write(0xFF16, M[Z.skyline_colour1]); io.write(0xFF17, M[Z.skyline_colour2]);
  P.animate_legs();
};
// Line 65, the play field: its colours, then the random numbers stirred (with the carry irq
// leaves, 1 from the CMP #$02 that chose the band), Tex moved, his death, the explosion and two
// enemies moved.
P.irq_field = function* (r = {}) {
  io.write(0xFF15, M[Z.field_bg]);
  io.write(0xFF07, io.read(0xFF07) & 0x78);
  io.write(0xFF13, 0x3C);
  io.write(0xFF16, M[Z.field_colour1]); io.write(0xFF17, M[Z.field_colour2]);
  P.random({ c: r.c });
  P.move_tex();
  yield* P.tex_death();
  P.tick_explosion();
  P.move_arrow_and_jet();
};
// Line 176, the pipe: its colours and scroll, then the controls read.
P.irq_pipe = function () {
  io.write(0xFF16, M[Z.pipe_colour1]); io.write(0xFF17, M[Z.pipe_colour2]);
  io.write(0xFF07, (io.read(0xFF07) & 0x78) | 0x80 | M[Z.pipe_scroll]);
  io.write(0xFF13, 0x10);
  io.write(0xFF15, M[Z.pipe_bg]);
  P.read_controls();
};
// Line 192, the message row: its scroll and the ROM-less character set, the sounds stepped, and the
// star twinkled every fourth frame.
P.irq_scroller = function () {
  io.write(0xFF07, (io.read(0xFF07) & 0x78) | M[Z.message_scroll]);
  io.write(0xFF13, 0x3C);
  P.tick_sounds();
  M[Z.star_timer] = (M[Z.star_timer] - 1) & 0xFF;
  if (M[Z.star_timer] === 0) { M[Z.star_timer] = 0x04; P.twinkle_star(); }
};

// Points the KERNAL's vector at irq and starts the raster interrupt at the first band's line, once
// (install_irq, $1885).
P.install_irq = function () {
  if (M[0x0314] === 0xA9) return;
  io.sei();
  M[0x0314] = 0xA9; M[0x0315] = 0x18;
  io.write(0xFF0A, 0x02);
  io.write(0xFF0B, M[T.raster_lines]);
  M[Z.irq_band] = 0;
  io.cli();
};

// The controls into $07-$0B, bit 7 each (read_controls, $182D): the demo's, the keyboard's, or the
// joystick in port 2, else port 1. Each control's byte takes the new bit in at the top and keeps
// the old ones shifted down, as ROR does. The instruction at $1878 is rewritten before each read:
// LSR for port 2, whose fire is bit 7, NOP for port 1, whose fire is bit 6.
P.read_controls = function () {
  if (M[T.demo_mode] !== 0) return P.demo_controls();
  if (M[T.joystick_mode] === 0) return P.read_keys();
  io.write(0xFF08, 0xFD);
  M[T.controls_fire_shift] = 0x4A;
  let a = io.read(0xFF08) ^ 0xFF;
  if (a === 0) {
    io.write(0xFF08, 0xFA);
    M[T.controls_fire_shift] = 0xEA;
    a = io.read(0xFF08) ^ 0xFF;
    if (a === 0) { for (let x = 4; x >= 0; x--) M[Z.ctl_left + x] = 0; return; }
  }
  const take = (z, bit) => { M[z] = bit << 7 | M[z] >> 1; };
  take(Z.ctl_up, a & 1); take(Z.ctl_down, a >> 1 & 1); take(Z.ctl_left, a >> 2 & 1); take(Z.ctl_right, a >> 3 & 1);
  take(Z.ctl_fire, M[T.controls_fire_shift] === 0x4A ? a >> 7 & 1 : a >> 6 & 1);
  M[Z.ctl_any] = 0x01;
};
// The keys in key_columns and key_rows for the five controls (read_keys, $35B0).
P.read_keys = function () {
  M[Z.ctl_any] = 0;
  for (let x = 4; x >= 0; x--) {
    const c = P.test_key({ a: M[0x35D8 + x], y: M[0x35DD + x] }).c, z = (Z.ctl_left + x) & 0xFF;
    M[z] = c << 7 | M[z] >> 1;
  }
};
// One key: the row Y selected, the column bits A tested; the carry set when it is held
// (test_key, $35C5).
P.test_key = function (r) {
  io.write(0xFD30, r.y);
  io.write(0xFF08, r.y);
  if ((r.a & io.read(0xFF08)) === 0) { M[Z.ctl_any] = 0x01; return { c: 1 }; }
  return { c: 0 };
};
// The demo's player (demo_controls, $3B1E): right until Tex reaches column 16, then left now and
// then near the right edge, right now and then, fire now and then, and a jump when the pipe two
// rows under his feet shows the start of a break.
P.demo_controls = function () {
  for (let x = 4; x >= 0; x--) M[Z.ctl_left + x] = 0;
  if (M[Z.demo_ran] === 0) {
    M[Z.ctl_right] = 0x80;
    if (M[Z.tex_cell] !== 0xB8) return;
    M[Z.demo_ran] = 0x01;
  }
  if (M[Z.tex_cell] >= 0xB4 && M[Z.rnd1] < 0x20) M[Z.ctl_left] = 0x80;
  else if (M[Z.rnd0] >= 0xE0) M[Z.ctl_right] = 0x80;
  if (M[Z.rnd3] < 0x10) M[Z.ctl_fire] = 0x80;
  const ch = M[at(Z.tex_cell, 0xCB)];
  if (ch < 0xDD && ch >= 0xD6) M[Z.ctl_up] = 0x80;
};
// ESC quits; SPACE pauses and C= goes on (check_play_keys, $35E2).
P.check_play_keys = function () {
  if (M[Z.menu_on] !== 0) return;
  if (M[Z.tex_hit] !== 0) return;
  if (P.test_key({ a: 0x10, y: 0xBF }).c) { M[Z.quit_pressed] = 0x01; return; }
  if (M[Z.paused] === 0) { if (P.test_key({ a: 0x10, y: 0x7F }).c) M[Z.paused] = 0x01; return; }
  if (P.test_key({ a: 0x20, y: 0x7F }).c) M[Z.paused] = 0;
};
// J for the joystick and K for the keyboard at the menu, and the icon beside them (menu_keys, $353C).
P.menu_keys = function () {
  if (P.test_key({ a: 0x04, y: 0xEF }).c) M[T.joystick_mode] = 0x01;
  if (P.test_key({ a: 0x20, y: 0xEF }).c) M[T.joystick_mode] = 0;
  const x = (M[T.joystick_mode] << 5) & 0xFF;
  for (let y = 0; y < 0x20; y++) M[0x3CD8 + y] = M[0x3570 + ((x + y) & 0xFF)];
};

// The random bytes rnd0 to rnd3 from TED's raster compare register, and the character set from RAM
// (seed_random, $18EB).
P.seed_random = function () {
  io.write(0xFF12, io.read(0xFF12) & 0xFB);
  for (let x = 3; x >= 0; x--) M[Z.rnd0 + x] = io.read(0xFF0B);
};
// The random bytes stirred (random, $18FE): a byte from two of TED's timers, with the carry the
// caller leaves, shifts its bit 6 into the four bytes as one 32-bit number, then each byte becomes
// the sum of itself and the one before (the first with $29), carrying on.
P.random = function (r = {}) {
  const s = (io.read(0xFF00) & 0x48) + io.read(0xFF02) + (r.c || 0);
  let c = (s & 0xFF) >> 6 & 1;
  for (let i = 3; i >= 0; i--) { const v = B(Z.rnd0 + i); M[Z.rnd0 + i] = (v << 1 | c) & 0xFF; c = v >> 7; }
  let y = 0x29, a = 0;
  c = 0;
  for (let i = 0; i < 4; i++) {
    const z = Z.rnd0 + i, old = y;
    y = B(z);
    const t = old + B(z) + c;
    a = t & 0xFF; c = t >> 8;
    M[z] = a;
  }
  return { a, x: 0, y, c };
};
// One of the four random bytes, chosen by timer 1 (random_byte, $25F9).
P.random_byte = function () {
  const x = io.read(0xFF00) & 0x03;
  return { a: B(Z.rnd0 + x), x };
};

// The sounds, once a frame from irq_scroller, while SOUND is on (tick_sounds, $361B).
P.tick_sounds = function () {
  if (M[T.sound_on] === 0) return;
  P.tick_shot_sound(); P.tick_hit_sound();
};
// A shot: voice 1 from $301 falling (shot_sound, $3628).
P.shot_sound = function () {
  if (M[T.sound_on] === 0) return;
  M[Z.shot_freq_hi] = 0x03;
  io.write(0xFF12, 0x03 | io.read(0xFF12));
  io.write(0xFF0E, 0x01);
  M[Z.shot_frames] = 0x14;
  M[Z.shot_playing] = 0x01;
  io.write(0xFF11, 0x1F | io.read(0xFF11));
};
// The shot's fall, 8 a frame for 20 frames; its high bits go into voice 2's register, $FF10
// (tick_shot_sound, $364E).
P.tick_shot_sound = function () {
  if (M[Z.shot_playing] !== 0) {
    M[Z.shot_frames] = (M[Z.shot_frames] - 1) & 0xFF;
    if (M[Z.shot_frames] !== 0) {
      const d = io.read(0xFF0E) - 0x08;
      io.write(0xFF0E, d & 0xFF);
      if (d < 0) {
        M[Z.shot_freq_hi] = (M[Z.shot_freq_hi] - 1) & 0xFF;
        io.write(0xFF10, (M[Z.shot_freq_hi] & 0x03) | io.read(0xFF10));
      }
      return;
    }
    M[Z.shot_playing] = 0;
  }
  io.write(0xFF11, 0xEF & io.read(0xFF11));
};
// A hit: voice 2 from $3FF, with noise (hit_sound, $367B).
P.hit_sound = function () {
  if (M[T.sound_on] === 0) return;
  io.write(0xFF10, 0x03);
  io.write(0xFF0F, 0xFF);
  io.write(0xFF11, io.read(0xFF11) | 0x4F);
  M[Z.hit_playing] = 0x01;
};
// The hit's fall, 14 a frame until it passes 0 (tick_hit_sound, $3698).
P.tick_hit_sound = function () {
  if (M[Z.hit_playing] === 0) return;
  const d = io.read(0xFF0F) - 0x0E;
  io.write(0xFF0F, d & 0xFF);
  if (d >= 0) return;
  io.write(0xFF11, io.read(0xFF11) & 0x9F);
  M[Z.hit_playing] = 0;
};
};
})(typeof window !== 'undefined' ? window : globalThis);
