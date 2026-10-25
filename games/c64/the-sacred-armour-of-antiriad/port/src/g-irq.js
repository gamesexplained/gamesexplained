// The interrupt (irq_handler, $AE41): the video chip's raster interrupt at three lines a frame,
// which split the screen into bands, its two collision interrupts, and CIA 1's two timers, for the
// music and the sound. Every handler but the collisions' clears I before its long work, so the
// next interrupts come inside it; the port's run whole, each when it comes (src/core.js).
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.irq = function (P) {
  const M = P.M, io = P.io;
  // lda #bit : and vic_irq_enable : bit vic_irq_status
  const vicIrq = bit => (bit & io.vicRead(0x1A) & io.vicRead(0x19)) !== 0;

  // irq_handler ($AE41). A restart_game inside it never comes back (its stack is reset): the throw
  // ends the handler there, and the main program follows at its next checkpoint (P.cp).
  P.irq_handler = function () {
    P.inIrq++;
    try {
      if (vicIrq(0x01)) P.raster_bands();
      if (vicIrq(0x02)) P.latch_bg_hits();
      if (vicIrq(0x04)) P.latch_sprite_hits();
      const f = io.ciaRead(0x0D);
      if (f & 0x80) {
        M[0xA1] = f;                                       // zpa_A1
        if (f & 0x02) { P.cli(); P.music_tick(); }
        if (P.irqByte(0xA1) & 0x01) { P.cli(); P.sound_tick(); }
      }
      io.vicRead(0x1E); io.vicRead(0x1F);                  // the collisions read, to clear them
    } catch (e) {
      if (e !== P.RESTART) throw e;
      P.taken = true;
    } finally { P.inIrq--; }
  };

  // raster_bands ($AE92): which band the line begins.
  P.raster_bands = function () {
    if (!(io.vicRead(0x11) & 0x80)) {
      const line = io.vicRead(0x12);
      if (line < 0xFA) {
        if (line < 0xB2) {
          // line $32: the playfield; the message strip scrolled and the score rolled
          io.vicWrite(0x12, 0xB2);
          io.vicWrite(0x19, 0x01);
          P.cli();
          P.scroll_message();
          P.roll_score();
          return;
        }
        // line $B2: the panel
        io.vicWrite(0x12, 0xFA);
        io.vicWrite(0x1A, 0x03);
        io.vicWrite(0x19, 0x03);
        if (!(M[0xB0] & 0x80)) {                           // zp_title clear: a game is on
          io.vicWrite(0x18, 0x0C);
          io.vicWrite(0x22, 0x0B);
          io.vicWrite(0x23, 0x0E);
        }
        P.panel_power_up();
        P.panel_sprites();
        io.vicWrite(0x16, ((io.vicRead(0x16) & 0xEF) | M[0x4A]) & 0x18);   // zp_panel_mc
        io.vicRead(0x1E); io.vicRead(0x1F);
        if (M[0x67]) M[0x67] = (M[0x67] - 1) & 255;        // zp_fade_wait
        P.cli();
        P.next_message();
        P.flash_items();
        P.addon_message();
        return;
      }
    }
    // line $FA, the border: the playfield's band set up for the next frame, and the frame's tasks
    io.vicWrite(0x11, io.vicRead(0x11) & 0x7F);
    io.vicWrite(0x12, 0x32);
    io.vicWrite(0x1A, 0x07);
    io.vicWrite(0x19, 0x07);
    io.vicWrite(0x18, M[0x4C]);                            // zp_d018
    io.vicWrite(0x1B, 0x00);
    io.vicWrite(0x22, M[0x4D]);
    io.vicWrite(0x23, M[0x4E]);
    io.vicWrite(0x16, ((io.vicRead(0x16) & 0xEF) | M[0x4B]) & 0x18);       // zp_vic_ctrl2_play
    P.copy_sprite_shadows();
    if (M[0xAB] & 0x80) return;                            // the last frame's tasks still running
    M[0xAB] = 0x80;
    P.cli();
    if (!(M[0x6B] & 0x80)) {                               // no room change pending (zp_room_exit)
      P.count_timers();
      P.tal_control();
      P.run_paths();
      P.move_sprites();
      P.animate_sprites();
      P.sprite_effects();
      P.sprite_hits();
      P.tal_lives();
      P.suit_hover();
      P.power_centre();
      P.check_quit_key();
    }
    M[0xAB] = 0x00;
  };

  // latch_bg_hits ($AF68) and latch_sprite_hits ($AF77): the collision register kept until the
  // game has dealt with the last one, and the interrupt acknowledged.
  P.latch_bg_hits = function () {
    if (!M[0x6F]) M[0x6F] = io.vicRead(0x1F);
    io.vicWrite(0x19, 0x02);
  };
  P.latch_sprite_hits = function () {
    if (!M[0x70]) M[0x70] = io.vicRead(0x1E);
    io.vicWrite(0x19, 0x04);
  };

  // count_timers ($AF86): the eight animated tiles' waits and seven counters, each down to 0.
  const TIMERS = [0x93, 0x8C, 0x87, 0x8F, 0x91, 0x40, 0x68, 0x69];
  P.count_timers = function () {
    for (let x = 7; x >= 0; x--) if (M[0x0248 + x]) M[0x0248 + x]--;
    for (const a of TIMERS) if (M[a]) M[a]--;
  };

  // copy_sprite_shadows ($AE0C): the shadow sprite registers into the video chip.
  P.copy_sprite_shadows = function () {
    for (let x = 0x10; x >= 0; x--) io.vicWrite(x, M[0x0200 + x]);
    for (let x = 7; x >= 0; x--) {
      M[0x43F8 + x] = M[0x0278 + x];
      io.vicWrite(0x27 + x, M[0x0227 + x]);
    }
    io.vicWrite(0x15, M[0x0215]);
    io.vicWrite(0x17, M[0x0217]);
    io.vicWrite(0x1C, M[0x021C]);
    io.vicWrite(0x1D, M[0x021D]);
    return { a: M[0x021D], x: 0xFF };
  };

  // check_quit_key ($8B9B): Q alone on keyboard row 7, while a game is on, restarts.
  P.check_quit_key = function () {
    if (M[0xB0] & 0x80) return;                            // zp_title
    io.ciaWrite(0x00, 0x7F);
    if (io.ciaRead(0x01) === 0xBF) P.restart_game();
  };
  // restart_game ($8BAB): the playfield and the sprite slots cleared, then cold_start, with the
  // stack reset: thrown to P.main, or to irq_handler when the interrupt calls it.
  P.restart_game = function () {
    P.sei();
    P.clear_screen();
    P.clear_room_objects();
    throw P.RESTART;
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
