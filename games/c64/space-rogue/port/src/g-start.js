// A game's start and its end in flight: SR's start-up ($0400, $0DE7, $14CB), which loads INIT to
// $E900 and runs it; INIT ($E900-$EACD), which loads the rest of the resident program and sets up
// a new game or a saved one; and the death screen, in END (INIT's bytes, loaded again over a
// base's at $E900), which ends at the title.
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
G.start = function (P) {
  const M = P.M, io = P.io;
  const R = (r, o) => Object.assign({}, r, o);
  const load = (x, y, to) => { M[0x80] = 0; M[0x81] = to; return P.load_file({ x, y }); };

  // ---- SR's start: entered at $0400 with the carry set for a saved game, clear for a new one
  P.sr_start = function* (r) { return yield* P.sr_init(r); };
  P.sr_init = function* (r) {
    yield* P.sr_setup(r);
    return yield* P.main_loop();
  };
  // The machine set up for play, the KERNAL's zero page swapped in, and INIT loaded and run
  P.sr_setup = function* (r) {
    P.setup_irq();
    P.swap_kernal_zp();
    load(0xC2, 0x07, 0xE9);
    return yield* P.init_game(r);
  };

  // ---- INIT. A new game takes the name typed at the title ($BF00); then zero page from $38 is
  // cleared and the resident files loaded. A saved game is SAVED loaded over $0403-$0801 and its
  // objects' models; a new one is the player's ship alone, the system map and the first sector.
  // Both end in the cockpit with the hum on.
  P.init_game = function* (r) {
    if (!r.c) for (let y = 0x0B; y >= 0; y--) M[0x0711 + y] = M[0xBF00 + y];
    for (let y = 0; y < 0xC8; y++) M[0x38 + y] = 0;
    P.load_resident();
    if (r.c) { M[0x80] = 0x03; M[0x81] = 0x04; P.load_file({ x: 0xE3, y: 0x07 }); }
    P.prompt_data_disk();
    P.load_seg0();
    M[0x5F] = 0; M[0x60] = 0;
    P.set_projection({});
    if (r.c) {
      P.copy_ship_stats();
      P.load_slot_models();
    } else {
      P.start_game_objects();
      P.load_nav_tiles();
      P.load_system_map();
      P.enter_sector();
    }
    P.mirror_text_on();
    P.restore_after_disk();
    M[0x1E] = 0xFF;
    return yield* P.set_view();
  };
  // MAIN to $6400, SPB to $BD00, EXTERN to $EB00 and FONT to $F200; then the display: the $C000
  // bitmap cleared and shown in multicolour, its screen at $E000, the border and background
  // black, the colour RAM white, and the view's window
  P.load_resident = function () {
    load(0xC7, 0x07, 0x64);
    load(0xCC, 0x07, 0xBD);
    load(0xD0, 0x07, 0xEB);
    load(0xD7, 0x07, 0xF2);
    M[0x0D03] = 1;
    M[0x3A] = 0;
    P.clear_bitmap_c000();
    P.bank_io_in();
    io.vicWrite(0x11, io.vicRead(0x11) | 0x20);
    io.vicWrite(0x16, io.vicRead(0x16) | 0x10);
    io.vicWrite(0x18, 0x80);
    P.bank_all_ram();
    P.show_bank3();
    P.bank_io_in();
    io.vicWrite(0x20, 0); io.vicWrite(0x21, 0);
    for (let x = 0; x < 256; x++) for (let p = 0; p < 0x400; p += 0x100) io.colourWrite(p + x, 1);
    P.bank_all_ram();
    P.mirror_text_off();
    P.window_view();
    return P.select_window({ y: 0 });
  };
  // The $C000 bitmap cleared, and the border black
  P.clear_bitmap_c000 = function () {
    for (let i = 0; i < 0x2000; i++) M[0xC000 + i] = 0;
    M[0x74] = 0; M[0x75] = 0xE0;
    const o = P.set_border({ a: 0 });
    return R(o, { x: 0, y: 0 });
  };

  // ---- the death screen: what killed the player, by the type in $0835 (a negative one picks
  // a text counted back from $CEAF), then a key and the title
  const KILLERS = { 0x09: 0x6A, 0x0A: 0x6A, 0x0B: 0x69, 0x0E: 0x6C, 0x0D: 0x6C, 0x0F: 0x6B, 0x1A: 0x68,
    0x15: 0x6D, 0x1C: 0x6E, 0x1D: 0x6E };
  P.game_over = function* () {
    M[0x1E] = 0;
    P.mirror_text_off();
    M[0x3A] = 0;
    P.show_bank1();
    P.clear_bitmap_c000();
    P.select_window({ y: 5 });
    P.show_bank3();
    const k = M[0x0835];
    let x, a;
    if (k & 0x80) { const s = ((k ^ 0xFF) + 0xAF); x = s & 255; a = 0xCE + (s >> 8); }
    else { x = KILLERS[k] || 0x67; a = 0xCF; }
    yield* P.print_wrapped({ x, a });
    yield* P.print_wrapped({ x: 0x6F, a: 0xCF });
    P.get_key();
    yield* P.wait_key();
    P.select_window({ y: 1 });
    P.prompt_boot_disk();
    load(0xBC, 0x07, 0x20);
    P.swap_kernal_zp();
    throw new P.Goto(0x2000);
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
