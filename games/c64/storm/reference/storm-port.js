/* storm-port */
// Storm, ported routine by routine from the listing (listing.json), for the Play tab and for
// test_play.js, which runs it beside the game's own code in the kit's lockstep. The port runs on the
// game's 64 KB (M) and keeps every variable where the game keeps it: the counters at $8106-$8154,
// the players' records at $860C-$864B, the monsters' and generators' tables, the rooms' lists
// (walls removed and objects taken are marked in them), the save buffers, the characters it builds
// at $0800-$0FFF, the screen, and the operands the game patches in its own code (the save buffer
// restore_bg reads at $641B, compose's shape, mask and destination at $6585-$658F, the message
// pointer at $7E61, the instruction text pointer at $74F6 ...). Each routine is one function on P,
// named as the listing names it. What it does not keep are the processor's registers: where the
// game saves one in memory (save_x $8129, save_y $8127, sfx_save_x $58FE) the port writes it only
// where it is data. David Whittaker's title music is the one part not ported: its own code
// ($9000-$99C1, from the listing) runs on the small 6502 at the end of this file, as the How it
// works page's player runs it.
//
// StormPort.create(M, io) gives P. P.program() is the whole program from the loader's hand-over
// ($75AC) as a generator, which yields where the game's code has got to: { cp: a } at the calls in
// its loops (the main loop's at $78D7-$792B, each wait for a frame in the menus, the instructions,
// the death and the end), { wait: 0xF0 } where the game polls the raster for line $F0 (exits $593F,
// $6418, $7614), and a bare yield for each turn of a polling loop (frame_flag, $D011's bit 7, the
// fire button on the title). P.irq() is the raster interrupt ($7D80), to be run on its lines.
// io is the chips: vicRead(r), vicWrite(r, v), sidWrite(r, v), colourWrite(i, v), ciaRead(r),
// ciaWrite(r, v), cia2Read(r), cia2Write(r, v), and read(a), write(a, v) by address.
globalThis.StormPort = (function () {
  'use strict';
  // The character ROM's first 512 bytes, $D000-$D1FF: Commodore's chargen 901225-01, offsets
  // $000-$1FF, the upper-case set's characters 0-$3F (@, the letters, the digits, the punctuation).
  // copy_rom_font copies the first 458 of them to $0D00 and $0E00 for the title and the
  // instructions, game_over takes the letters of GAME OVER from them, and the panel and the message
  // line are shown in them, through the video chip's view of the ROM at $1000.
  const FONT_B64 = 'PGZubmBiPAAYPGZ+ZmZmAHxmZnxmZnwAPGZgYGBmPAB4bGZmZmx4AH5gYHhgYH4AfmBgeGBgYAA8ZmBuZmY8AGZmZn5mZmYAPBgYGBgYPAAeDAwMDGw4AGZseHB4bGYAYGBgYGBgfgBjd39rY2NjAGZ2fn5uZmYAPGZmZmZmPAB8ZmZ8YGBgADxmZmZmPA4AfGZmfHhsZgA8ZmA8BmY8AH4YGBgYGBgAZmZmZmZmPABmZmZmZjwYAGNjY2t/d2MAZmY8GDxmZgBmZmY8GBgYAH4GDBgwYH4APDAwMDAwPAAMEjB8MGL8ADwMDAwMDDwAABg8fhgYGBgAEDB/fzAQAAAAAAAAAAAAGBgYGAAAGABmZmYAAAAAAGZm/2b/ZmYAGD5gPAZ8GABiZgwYMGZGADxmPDhnZj8ABgwYAAAAAAAMGDAwMBgMADAYDAwMGDAAAGY8/zxmAAAAGBh+GBgAAAAAAAAAGBgwAAAAfgAAAAAAAAAAABgYAAADBgwYMGAAPGZudmZmPAAYGDgYGBh+ADxmBgwwYH4APGYGHAZmPAAGDh5mfwYGAH5gfAYGZjwAPGZgfGZmPAB+ZgwYGBgYADxmZjxmZjwAPGZmPgZmPAAAABgAABgAAAAAGAAAGBgwDhgwYDAYDgAAAH4AfgAAAHAYDAYMGHAAPGYGDBgAGAA=';
  const FONT = (() => {
    const s = typeof atob === 'function' ? atob(FONT_B64) : Buffer.from(FONT_B64, 'base64').toString('binary');
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  })();

  // NMOS decimal-mode arithmetic, as the 6510 does it (Bruce Clark, "Decimal Mode", 6502.org,
  // appendix A), for the game's SED stretches: the result | the carry << 8. Kinds and counts that
  // are not decimal digits (a monster kind of $15, say) go through the same steps the chip takes.
  function adcD(a, b, c) {
    let al = (a & 15) + (b & 15) + c;
    if (al >= 10) al = ((al + 6) & 15) + 16;
    let s = (a & 0xF0) + (b & 0xF0) + al;
    if (s >= 0xA0) s += 0x60;
    return (s & 255) | (s >= 0x100 ? 0x100 : 0);
  }
  function sbcD(a, b, c) {
    let al = (a & 15) - (b & 15) + c - 1;
    if (al < 0) al = ((al - 6) & 15) - 16;
    let s = (a & 0xF0) - (b & 0xF0) + al;
    if (s < 0) s -= 0x60;
    return (s & 255) | (a - b - (1 - c) >= 0 ? 0x100 : 0);
  }
  // LSR A, ROR A, ROR A: a direction 0-3 times 64, as the shape tables are laid out.
  function lsrRorRor(v) {
    const c1 = v & 1, a1 = v >> 1, c2 = a1 & 1, a2 = (a1 >> 1) | (c1 << 7);
    return (a2 >> 1) | (c2 << 7);
  }

  function create(M, io) {
    const P = { M, io };
    const vr = (r) => P.io.vicRead(r), vw = (r, v) => P.io.vicWrite(r, v & 255);
    const sw = (r, v) => P.io.sidWrite(r, v & 255);
    const cw = (i, v) => P.io.colourWrite(i & 0x3FF, v & 15);
    const joys = () => P.io.ciaRead(0) & P.io.ciaRead(1);          // LDA $DC00, AND $DC01
    const IO = (a) => a >= 0xD000 && a < 0xE000;
    const rb = (a) => { a &= 0xFFFF; return IO(a) ? P.io.read(a) : M[a]; };
    const wb = (a, v) => { a &= 0xFFFF; if (IO(a)) P.io.write(a, v & 255); else M[a] = v & 255; };
    const w16 = (a) => M[a] | M[a + 1] << 8;
    const scr = () => M[0xFD] | M[0xFE] << 8;                       // ($FD): the screen address
    const col = () => M[0x03] | M[0x04] << 8;                       // ($03): its colour RAM
    const inc = (a) => { M[a] = (M[a] + 1) & 255; };
    const dec = (a) => { M[a] = (M[a] - 1) & 255; };
    // a message on the message line: its address into the scroller's LDA ($7E61), then clear_message
    const show = (hi, lo) => { M[0x7E62] = hi; M[0x7E61] = lo; P.clear_message(); };

    // ---- sound effects ($5632-$5937)
    P.sfx_reset = function () {                                     // $5632
      M[0x58FF] = 0;
      for (let r = 0x17; r >= 0; r--) sw(r, 0);
      sw(0x18, 0x0F);
    };
    P.sfx_start = function (n) {                                    // $5645
      M[0x58FF] = 0; M[0x5900] = 0; M[0x5901] = 0;
      const i = (n << 1) & 255;
      M[0x5664] = M[0x56CF + i]; M[0x5665] = M[0x56D0 + i];
      const rec = w16(0x5664);
      for (let k = 0x13; k >= 0; k--) M[0x5902 + k] = M[(rec + k) & 0xFFFF];
      M[0x5916] = M[0x5903];
      M[0x5917] = M[0x5904];
      sw(0x05, M[0x5908]); sw(0x13, M[0x5909]);
      M[0x5917] = M[0x5904]; sw(0x00, M[0x5904]);
      M[0x5918] = M[0x5905]; sw(0x01, M[0x5905]);
      M[0x5919] = M[0x5906]; sw(0x0E, M[0x5906]);
      M[0x591A] = M[0x5907]; sw(0x0F, M[0x5907]);
      sw(0x03, M[0x590C]); sw(0x11, M[0x590D]);
      sw(0x04, M[0x590A]); sw(0x04, M[0x590A] + 1);
      sw(0x12, M[0x590B]); sw(0x12, M[0x590B] + 1);
      inc(0x58FF);
    };
    P.sfx_stop = function () {                                      // $5819
      M[0x58FF] = 0;
      sw(0x00, 0); sw(0x01, 0); sw(0x0E, 0); sw(0x0F, 0);
      M[0x5900] = 1; M[0x5901] = 1;
    };
    // sfx_update ($5830) takes the carry play_band leaves, which random adds in.
    P.sfx_update = function (c) {
      if (!M[0x58FF]) return;
      if (!M[0x5902]) { P.sfx_stop(); return; }
      c = P.random(c);
      dec(0x5902);
      if (!M[0x5916]) {
        if (!M[0x5914]) return;
        dec(0x5914);
        M[0x5916] = M[0x5903];
        M[0x5917] = M[0x5904]; sw(0x00, M[0x5904]);
        let a = M[0x5905];
        if (M[0x5915]) a = (a + M[0x5934] + c) & 255;               // no CLC: random's carry comes in
        M[0x5918] = a; sw(0x01, a);
        M[0x5919] = M[0x5906]; sw(0x0E, M[0x5906]);
        M[0x591A] = M[0x5907]; sw(0x0F, M[0x5907]);
      }
      dec(0x5916);
      sweep(0x5912, 0x5917, 0x590E, 0x00);
      sweep(0x5913, 0x5919, 0x5910, 0x0E);
    };
    function sweep(dirAt, cur, by, reg) {
      const d = M[dirAt];
      if (!d) return;
      if (d & 0x80) {
        const s = M[cur] - M[by];
        M[cur] = s & 255; sw(reg, s & 255);
        const h = (M[cur + 1] - M[by + 1] - (s < 0 ? 1 : 0)) & 255;
        sw(reg + 1, h); M[cur + 1] = h;
      } else {
        const s = M[cur] + M[by];
        M[cur] = s & 255; sw(reg, s & 255);
        const h = (M[cur + 1] + M[by + 1] + (s >> 8)) & 255;
        sw(reg + 1, h); M[cur + 1] = h;
      }
    }
    P.random = function (c) {                                       // $591B: gives back the carry out
      const t = ((M[0x5934] & 0x48) + 0x38 + c) & 255;
      c = (t >> 6) & 1;                                             // ASL, ASL
      for (const r of [0x5937, 0x5936, 0x5935, 0x5934]) { const v = M[r]; M[r] = ((v << 1) | c) & 255; c = v >> 7; }
      return c;
    };

    // ---- the screen
    P.clear_screen = function* () {                                 // $5938
      yield { wait: 0xF0 };
      for (let x = 0; x < 256; x++) { M[0x0400 + x] = 0; M[0x0500 + x] = 0; M[0x0600 + x] = 0; M[0x0700 + x] = 0; }
      P.clear_panel(0xEF);
    };
    P.clear_panel = function (x) {                                  // $5957, entered with X
      do { M[0x0400 + x] = 0x20; cw(x, 1); x = (x - 1) & 255; } while (x);
      cw(0, 1); M[0x0400] = 0x20;
      P.clear_message();
    };
    P.clear_message = function () {                                 // $596C
      M[0x8135] = 0; M[0x8136] = 0;
      for (let x = 0; x < 0x28; x++) { cw(0xC8 + x, 1); M[0x04C8 + x] = 0x20; }
    };
    P.cell_address = function () {                                  // $6445
      P.col_address((M[0x8115] << 1) & 255, (M[0x8116] << 1) & 255);
    };
    P.col_address = function (a, x) {                               // $6451: column A, row X / 2
      const s = a + M[0x8570 + x], t = M[0x8571 + x] + (s >> 8), h = t & 255;
      M[0xFD] = s & 255; M[0x03] = s & 255;
      M[0xFE] = h; M[0x04] = (h & 3) + 0xD8 + (t >> 8);
    };
    P.put_block = function () {                                     // $646A
      const b = scr(), c = col(), h = M[0x8113];
      let y = 0, x = M[0x812F];
      M[0x810E] = M[0x810D];
      if (M[0x8111] > 7) throw new Error('put_block: a block ' + M[0x8111] + ' characters wide never ends');
      for (;;) {
        wb(b + y, M[0x810E]); wb(c + y, M[0x8594 + x]); x = (x + 1) & 255;
        if (M[0x810E]) inc(0x810E);
        y = (y + 1) & 255;
        if ((y & 7) !== M[0x8111]) continue;
        y = 0x28; dec(0x8113);
        if (!M[0x8113]) break;
      }
      M[0x8113] = h;
    };
    // restore_bg ($640E) puts back blk_w by blk_h characters from the save buffer at $641B (row one)
    // and $6435 (row two), from offset x; it waits for line $F0 first. Gives back X.
    P.restore_bg = function* (x) {
      P.cell_address();
      yield { wait: 0xF0 };
      const s1 = w16(0x641B), s2 = w16(0x6435), b = scr();
      let y = 0;
      do { wb(b + y, rb(s1 + x)); y = (y + 1) & 255; x = (x + 1) & 255; } while (y < M[0x8111]);
      if (M[0x8113] === 1) return x;
      const w = M[0x8111];
      y = 0x28;
      do { wb(b + y, rb(s2 + x)); y = (y + 1) & 255; x = (x + 1) & 255; dec(0x8111); } while (M[0x8111]);
      M[0x8111] = w;
      return x;
    };
    P.wait_frame = function* () {                                   // $64A1
      while (!M[0x8133]) yield;
      while (M[0x8133]) yield;
    };
    P.delay = function () {};                                       // $64AC: a busy wait; its time is the clock's
    P.chars_address = function () {                                 // $64C3
      const t = 0x0800 + M[0x8124] * 8;
      M[0x658E] = t & 255; M[0x658F] = t >> 8;
    };
    // compose's inner loop ($6584): the 8 bytes of one character, the shape ANDed with the mask
    // for the background character and ORed with the background's own pattern.
    function build(sy) {
      const shape = w16(0x6585), mask = w16(0x6588), bg = w16(0x658B), dst = w16(0x658E);
      for (let k = 0; k < 8; k++) { wb(dst + sy, (rb(shape + sy) & rb(mask + k)) | rb(bg + k)); sy = (sy + 1) & 255; }
      return sy;
    }
    P.compose_one = function () {                                   // $64E9
      M[0x810F] = 1; M[0x810B] = 1;
      M[0x8128] = build(0);
      M[0x810B] = M[0x8111];
      M[0x810F] = 0;
    };
    P.compose = function () {                                       // $64FA
      const w = M[0x8111], b = scr(), save = w16(0x6513);
      let y = 0, x = 0;
      M[0x810B] = w; M[0x810F] = M[0x8113];
      for (;;) {                                                    // the background, into the save buffer
        let v = rb(b + y); if (v >= 0xFE) v = 0;
        wb(save + x, v); x = (x + 1) & 255; y = (y + 1) & 255;
        dec(0x810B);
        if (M[0x810B]) continue;
        y = 0x28; M[0x810B] = w; dec(0x810F);
        if (!M[0x810F]) break;
      }
      y = 0; M[0x8128] = 0; M[0x810B] = w; M[0x810F] = M[0x8113];
      for (;;) {                                                    // the actor's characters over it
        const ch = rb(b + y), t = ch * 8;
        M[0x810D] = t & 255;
        M[0x658B] = t & 255; M[0x658C] = (t >> 8) + 8;
        const m = ch === 0 ? 0 : ch >= 0xFE ? 0 : (((ch - 0x11) & 255) << 3) & 255, s = m + 0xCE;
        M[0x6588] = s & 255; M[0x6589] = 0x87 + (s >> 8);
        y = (y + 1) & 255;
        M[0x8128] = build(M[0x8128]);
        dec(0x810B);
        if (M[0x810B]) continue;
        M[0x810B] = w; y = 0x28; dec(0x810F);
        if (!M[0x810F]) break;
      }
    };
    P.put_actor = function () {                                     // $65B1
      M[0x810D] = M[0x8124];
      M[0x8124] = (M[0x8124] + M[0x8131]) & 255;
      P.put_block();
    };
    P.draw_actor = function () { P.chars_address(); P.draw_saved(); };                  // $5E04
    P.draw_saved = function () { P.cell_address(); P.compose(); P.put_actor(); };       // $5E07

    // ---- drawing a room
    // a room's list from a pointer table (room number times two), its address left at $FB/$FC
    const list = () => M[0xFB] | M[0xFC] << 8;
    function roomList(table) {
      const i = (M[0x8118] << 1) & 255;
      M[0xFB] = M[table + i]; M[0xFC] = M[table + 1 + i];
      return list();
    }
    P.draw_floor = function () {                                    // $5984
      const L = roomList(0x244F);
      M[0x810A] = 5; M[0x8111] = 4; M[0x8113] = 2;
      let y = 0;
      for (;;) {
        const a = rb(L + y);
        if (!a) return;
        M[0x8115] = a >> 4; M[0x8116] = a & 15;
        y = (y + 1) & 255;
        M[0x810D] = ((((rb(L + y) - 0x27) & 255) << 3) + 0x12) & 255;
        y = (y + 1) & 255;
        const b = rb(L + y);
        M[0x810B] = b >> 4; M[0x810C] = b & 15;
        y = (y + 1) & 255; M[0x8127] = y;
        P.floor_run();
        dec(0x810A);
        if (!M[0x810A]) return;
      }
    };
    function stepCell(d, n) {                                       // one step of n cells in direction d
      if (d === 0) M[0x8116] = (M[0x8116] - n) & 255;
      else if (d === 1) M[0x8115] = (M[0x8115] + n) & 255;
      else if (d === 2) M[0x8116] = (M[0x8116] + n) & 255;
      else M[0x8115] = (M[0x8115] - n) & 255;
    }
    P.floor_run = function () {                                     // $59E7
      do { P.cell_address(); P.put_block(); stepCell(M[0x810C], 2); dec(0x810B); } while (M[0x810B]);
    };
    P.draw_walls = function () {                                    // $5A21
      const L = roomList(0x1000);
      M[0x8151] = M[0xFB]; M[0x8152] = M[0xFC];
      M[0x810A] = 10; M[0x813A] = 0; M[0x8111] = 2; M[0x8113] = 1;
      let y = 0;
      for (;;) {
        const a = rb(L + y);
        if (!a) return;
        M[0x8115] = a >> 4; M[0x8116] = a & 15;
        y = (y + 1) & 255;
        const b = rb(L + y);
        M[0x810B] = b >> 4; M[0x810C] = b & 15;
        y = (y + 1) & 255;
        const c = rb(L + y);
        M[0x810D] = ((c & 0x70) >> 3) + 1;
        M[0x812F] = (M[0x810D] & 4) << 1;
        M[0x8117] = c & 15;
        y = (y + 1) & 255; M[0x8127] = y;
        if (!(c & 0x80)) { P.wall_run(); inc(0x813A); }
        dec(0x810A);
        if (!M[0x810A]) return;
      }
    };
    P.wall_run = function () {                                      // $5AA0
      do { P.cell_address(); P.door_record(); P.put_block(); stepCell(M[0x810C], 1); dec(0x810B); } while (M[0x810B]);
    };
    P.draw_border = function () {                                   // $5AD1
      M[0x8117] = 0; M[0x8111] = 2; M[0x8113] = 1;
      M[0x810C] = 1; M[0x8115] = 0; M[0x8116] = 0; M[0x810B] = 0x12; P.wall_run();
      M[0x810C] = 2; M[0x8115] = 0x11; M[0x8116] = 1; M[0x810B] = 0x10; P.wall_run();
      M[0x810C] = 3; M[0x810B] = 0x12; M[0x8115] = 0x11; P.wall_run();
      M[0x810C] = 0; M[0x8115] = 0; M[0x810B] = 0x10; M[0x8116] = 0x10; P.wall_run();
      const r = M[0x8118], e = M[0x179B + (r >> 1)];
      M[0x8119] = (r & 1 ? e : e >> 4) & 15;
      M[0x810D] = 0;
      P.open_exits();
    };
    P.open_exits = function () {                                    // $5B49
      M[0x8111] = 2; M[0x8113] = 1;
      const run = (x, y, d) => { M[0x8115] = x; M[0x8116] = y; M[0x810B] = 2; M[0x810C] = d; P.wall_run(); };
      if (M[0x8119] & 8) run(8, 0, 1);
      if (M[0x8119] & 4) run(8, 0x11, 1);
      if (M[0x8119] & 2) run(0, 8, 2);
      if (M[0x8119] & 1) run(0x11, 8, 2);
    };
    P.door_record = function () {                                   // $5BCC
      if (M[0x8117] !== 4) return;
      let x = M[0x8141] & 0x7F;
      if (!rb(scr())) return;
      M[0x86C3 + x] = M[0x8115]; x = (x + 1) & 255;
      M[0x86C3 + x] = M[0x8116]; x = (x + 1) & 255;
      M[0x86C3 + x] = rb(scr()); x = (x + 1) & 255;
      M[0x8141] = x;
    };
    P.draw_generators = function () {                               // $5BF8
      roomList(0x1E8E);
      M[0x8153] = M[0xFB]; M[0x8154] = M[0xFC];
      M[0x813B] = 0; M[0x810A] = 5; M[0x8131] = 6; M[0x8124] = 0x82;
      let y = 0;
      for (;;) {
        const L = list(), a = rb(L + y);
        if (!a) return;
        M[0x8115] = a >> 4; M[0x8116] = a & 15;
        y = (y + 1) & 255;
        const b = rb(L + y);
        M[0x812B] = b >> 4; M[0x810D] = b & 15;
        y = (y + 1) & 255;
        const c = rb(L + y);
        M[0x8117] = c >> 4; M[0x812C] = c & 15;
        y = (y + 1) & 255; M[0x8127] = y;
        M[0x812F] = 0; M[0x8111] = 3; M[0x8113] = 2;
        const g = M[0x813B];
        M[0x864C + g] = 5; M[0x8651 + g] = M[0x810D]; M[0x8656 + g] = M[0x8115]; M[0x865B + g] = M[0x8116];
        M[0x8660 + g] = M[0x8144];
        if (M[0x812B] === 1) { M[0x6586] = 0x50; M[0x6585] = 0xE2; } else { M[0x6586] = 0x51; M[0x6585] = 0x12; }
        const g2 = (g << 1) & 255, s1 = ((g2 << 1) & 255) + g2, s2 = (s1 & 255) + 0xA5 + (s1 >> 8);
        M[0x8129] = g2;
        M[0x6513] = s2 & 255; M[0x6514] = 0x86 + (s2 >> 8);
        P.draw_actor();
        inc(0x813B);
        dec(0x810A);
        if (!M[0x810A]) return;
      }
    };
    P.draw_objects = function () {                                  // $5CD1
      const L = roomList(0x17CD);
      M[0x814F] = M[0xFB]; M[0x8150] = M[0xFC];
      M[0x813C] = 0; M[0x810A] = 8; M[0x8131] = 8; M[0x8124] = 0x42;
      M[0x6514] = 0x86; M[0x6513] = 0x65;
      let y = 0;
      for (;;) {
        const a = rb(L + y);
        if (!a) return;
        M[0x8115] = a >> 4; M[0x8116] = a & 15;
        y = (y + 1) & 255;
        M[0x810D] = rb(L + y);
        y = (y + 1) & 255;
        const c = rb(L + y);
        M[0x812D] = c >> 4; M[0x812E] = c & 15;
        y = (y + 1) & 255; M[0x8127] = y;
        if (M[0x810D] & 0x80) M[0x8124] = (M[0x8124] + M[0x8131]) & 255;   // taken: its characters are skipped
        else {
          const t = ((((8 - M[0x810A]) & 255) << 3) & 255) + 0x65;
          M[0x6513] = t & 255; M[0x6514] = 0x86 + (t >> 8);
          P.draw_object();
          inc(0x813C);
        }
        dec(0x810A);
        if (!M[0x810A]) return;
      }
    };
    P.draw_object = function () {                                   // $5D67
      M[0x8111] = 2; M[0x8113] = 2;
      const t = M[0x810D];
      let c;
      if (t < 2) c = 8;
      else {
        M[0x8111] = 3;
        if (t < 4) c = 0; else if (t < 8) c = 8; else if (t < 9) c = 0x28;
        else {
          M[0x8111] = 4;
          c = t < 0x0D ? 0 : t < 0x16 ? 8 : t < 0x19 ? 0x10 : t === 0x19 ? 0x70 : t === 0x1A ? 0x18 : 0x20;
        }
      }
      M[0x812F] = c;
      const i = (t << 1) & 255;
      M[0x6585] = M[0x47DC + i]; M[0x6586] = M[0x47DD + i];
      P.draw_actor();
    };

    // ---- monsters
    P.spawn = function () {                                         // $5E11
      M[0x8113] = 2; M[0x8111] = 4;
      inc(0x8145);
      if (M[0x8145] !== M[0x8146]) return;
      const g = M[0x8147];
      M[0x812A] = g; M[0x8145] = 0;
      if (M[0x864C + g] && M[0x8142] < 10) {
        let free = false;
        for (const test of [P.spawn_up, P.spawn_right, P.spawn_down, P.spawn_left]) {
          P.gen_cell(); test();
          if (!(M[0x810D] & 0x80)) { free = true; break; }
        }
        if (free) {
          inc(0x8142);
          let y = 0;
          while (M[0x8742 + y]) { if (y === 9) return; y++; }
          M[0x874C + y] = M[0x8115]; M[0x8756 + y] = M[0x8116]; M[0x8760 + y] = M[0x8144];
          M[0x8774 + g] = 0;                                        // STA mon_dir,X: X is the generator's number
          const k = M[0x8651 + g];
          M[0x876A + y] = k;
          M[0x8742 + y] = k >= 4 ? (k - 2) & 255 : k;
          const shape = { 1: [0x4F82, 0], 2: [0x5082, 0x10, 3], 3: [0x51C2, 0], 4: [0x52C2, 8, 3], 5: [0x5532, 0x10] }[k] || [0x5432, 0x30];
          M[0x6585] = shape[0] & 255; M[0x6586] = shape[0] >> 8; M[0x812F] = shape[1];
          if (shape[2]) M[0x8111] = shape[2];
          const y8 = (y << 3) & 255, t = y8 + 0x7E + ((y >> 5) & 1);
          M[0x6513] = t & 255; M[0x6514] = 0x87 + (t >> 8);
          M[0x8124] = (y8 + 0xA0) & 255;
          P.draw_actor();
        }
      }
      let x = (M[0x8147] + 1) & 255;
      if (x === M[0x813B]) x = 0;
      M[0x8147] = x;
    };
    P.gen_cell = function () { const x = M[0x812A]; M[0x8115] = M[0x8656 + x]; M[0x8116] = M[0x865B + x]; };   // $5F61
    P.mon_cell = function () { const x = M[0x812A]; M[0x8115] = M[0x874C + x]; M[0x8116] = M[0x8756 + x]; };   // $5F71
    P.distance = function () {                                      // $5F81
      P.mon_cell();
      const ax = M[0x8115], tx = M[0x813F], ay = M[0x8116], ty = M[0x8140];
      M[0x810F] = (ax >= tx ? ax - tx : tx - ax) & 255;
      return ((ay >= ty ? ay - ty : ty - ay) + M[0x810F]) & 255;
    };
    P.move_monster = function* () {                                 // $5FB6
      const x = M[0x8143];
      M[0x641C] = 0x87; M[0x6436] = 0x87; M[0x641B] = 0x7E; M[0x6435] = 0x7E;
      M[0x8113] = 2; M[0x8114] = 2;
      M[0x812A] = x; M[0x810F] = 0;
      M[0x810C] = M[0x8774 + x];
      if (!M[0x8742 + x]) { P.delay(); P.next_monster(); return; }
      M[0x813F] = M[0x8629]; M[0x8140] = M[0x862A];
      const da = P.distance();
      M[0x8128] = da;
      if (M[0x8137] === 2) {
        M[0x813F] = M[0x861E]; M[0x8140] = M[0x861F];
        if (P.distance() < da) { P.load_b(); yield* P.step_monster(); P.save_b(); return; }
      }
      P.load_a(); yield* P.step_monster(); P.save_a();
    };
    P.next_monster = function () {                                  // $6129
      const x = M[0x812A];
      M[0x8774 + x] = M[0x810C];
      const n = (x + 1) & 255;
      M[0x8143] = n === 10 ? 0 : n;
    };
    P.step_monster = function* () {                                 // $602B
      P.mon_cell();
      const moved = (d) => { M[0x810F] = 0xFF; M[0x810C] = d; };
      const cy = M[0x8116], py = M[0x8635];
      if (cy > py) {
        dec(0x8116); P.row_test(); P.touch_damage();
        if (!M[0x8124]) moved(0); else inc(0x8116);
      } else if (cy < py) {
        M[0x8116] = (M[0x8116] + 2) & 255; P.row_test(); P.touch_damage();
        if (!M[0x8124]) { dec(0x8116); moved(2); } else M[0x8116] = (M[0x8116] - 2) & 255;
      }
      const ny = M[0x8116], cx = M[0x8115], px = M[0x8634];
      if (cx > px) {
        dec(0x8115); P.column_test(); P.touch_damage();
        if (!M[0x8124]) moved(3); else inc(0x8115);
      } else if (cx < px) {
        M[0x8115] = (M[0x8115] + 2) & 255; P.column_test(); P.touch_damage();
        if (!M[0x8124]) { dec(0x8115); moved(1); } else M[0x8115] = (M[0x8115] - 2) & 255;
      }
      M[0x8140] = ny; M[0x813F] = M[0x8115];
      const x = M[0x812A];
      M[0x8115] = M[0x874C + x]; M[0x8116] = M[0x8756 + x];
      const k = M[0x876A + x] & 7;
      yield* (k === 1 ? P.draw_kind1() : k === 2 ? P.draw_kind2() : k === 3 ? P.draw_kind3()
        : k === 4 ? P.draw_kind4() : k === 5 ? P.draw_kind5() : P.draw_kind6());
      P.next_monster();
    };
    P.redraw_monster = function* () {                               // $6141
      const n = M[0x812A], x = (n << 3) & 255, t = x + 0x7E;
      M[0x6513] = t & 255; M[0x6514] = 0x87 + (t >> 8);
      M[0x8124] = (x + 0xA0) & 255;
      P.chars_address();
      yield* P.restore_bg(x);
      M[0x8111] = M[0x8112]; M[0x8113] = M[0x8114];
      M[0x874C + n] = M[0x813F]; M[0x8115] = M[0x813F];
      M[0x8756 + n] = M[0x8140]; M[0x8116] = M[0x8140];
      P.draw_saved();
    };
    function kindShape(w, colour, base) {
      M[0x8111] = w; M[0x8112] = w; M[0x812F] = colour;
      if (base !== undefined) { M[0x6585] = base & 255; M[0x6586] = base >> 8; }
    }
    function facing(lo, hi) {                                       // base + 64 * direction
      const t = lsrRorRor(M[0x810C]) + lo;
      M[0x6585] = t & 255; M[0x6586] = hi + (t >> 8);
    }
    function flip(a, b) {                                           // kinds 2 and 4: bit 7 of mon_kind alternates
      const x = M[0x812A], k = M[0x876A + x];
      if (!(k & 0x80)) { M[0x876A + x] = k | 0x80; M[0x6585] = a & 255; M[0x6586] = a >> 8; }
      else { M[0x876A + x] = k & 7; M[0x6585] = b & 255; M[0x6586] = b >> 8; }
    }
    P.draw_kind1 = function* () { kindShape(4, 0); facing(0x82, 0x4F); yield* P.redraw_monster(); };           // $6187
    P.draw_kind2 = function* () { kindShape(3, 0x10); flip(0x50B2, 0x5082); yield* P.redraw_monster(); };      // $61AB
    P.draw_kind3 = function* () { kindShape(4, 0); facing(0xC2, 0x51); yield* P.redraw_monster(); };           // $61E6
    P.draw_kind4 = function* () { kindShape(3, 8); flip(0x52C2, 0x52F2); yield* P.redraw_monster(); };         // $620A
    P.draw_kind5 = function* () {                                   // $6245
      kindShape(4, 0x10);
      const x = M[0x812A];
      let a = (M[0x876A + x] + 0x10) & 255;
      if (a >= 0x40) a = 5;
      M[0x876A + x] = a;
      const t = (((a & 0xF0) << 2) & 255) + 0x32;
      M[0x6585] = t & 255; M[0x6586] = 0x55 + (t >> 8);
      yield* P.redraw_monster();
    };
    P.draw_kind6 = function* () {                                   // $6279
      kindShape(4, (((M[0x810C] << 3) & 255) + 0x30) & 255);
      facing(0x32, 0x54);
      yield* P.redraw_monster();
    };
    P.touch_damage = function () {                                  // $62A4
      const h = M[0x8125];
      if (!h) return;
      const d = P.mon_damage(), at = h >= 0x3A ? 0x8149 : 0x814A;
      M[at] = adcD(d & 255, M[at], d >> 8) & 255;
    };
    P.mon_damage = function () {                                    // $62C4: in decimal, result | carry << 8
      const k = M[0x876A + M[0x812A]], s = adcD(k, k, 0);
      M[0x8125] = s & 255;
      return adcD(s & 255, s & 255, s >> 8);
    };
    P.blocked_flag = function () { if (M[0x8124]) M[0x810D] = 0xFF; };                                   // $62D6
    P.spawn_down = function () {                                    // $62E1
      M[0x810D] = 0;
      M[0x8116] = (M[0x8116] + 3) & 255;
      if (M[0x8116] >= 0x11) { M[0x810D] = 0xFF; return; }
      P.row_test(); P.blocked_flag(); dec(0x8116); P.row_test(); P.blocked_flag();
    };
    P.spawn_left = function () {                                    // $6306
      M[0x810D] = 0;
      dec(0x8115);
      if (M[0x8115] < 2) { M[0x810D] = 0xFF; return; }
      P.column_test(); P.blocked_flag(); dec(0x8115); P.column_test(); P.blocked_flag();
    };
    P.spawn_right = function () {                                   // $632B
      M[0x810D] = 0;
      M[0x8115] = (M[0x8115] + 3) & 255;
      if (M[0x8115] >= 0x11) { M[0x810D] = 0xFF; return; }
      P.column_test(); P.blocked_flag(); dec(0x8115); P.column_test(); P.blocked_flag();
    };
    P.spawn_up = function () {                                      // $6353
      M[0x810D] = 0;
      dec(0x8116);
      if (M[0x8116] < 2) { M[0x810D] = 0xFF; return; }
      P.row_test(); P.blocked_flag(); dec(0x8116); P.row_test(); P.blocked_flag();
    };
    P.obj_width = function (y) {                                    // $6372: the type at ($FB),y
      M[0x8111] = 2; M[0x8113] = 2;
      const t = rb(list() + y);
      if (t >= 2) M[0x8111] = t >= 9 ? 4 : 3;
    };
    // row_test ($6391) and column_test ($63C9): what is in the way, in actor_char ($FF for a wall, a
    // monster, a generator or a player, whose character is left in player_hit; an object's own
    // character; 0 for nothing but floor).
    function stepTest(offsets) {
      P.cell_address();
      M[0x8124] = 0; M[0x8125] = 0;
      const b = scr();
      for (const y of offsets) {
        const a = rb(b + y);
        if (a === 0 || (a >= 0x12 && a < 0x32)) continue;
        if (a >= 0x32 && a < 0x42) { M[0x8125] = a; M[0x8124] = 0xFF; return; }
        if (a < 0x42 || a >= 0x82) { M[0x8124] = 0xFF; return; }
        M[0x8124] = a;
      }
    }
    P.row_test = function () { stepTest([0, 1, 2, 3]); };
    P.column_test = function () { stepTest([0, 1, 0x28, 0x29]); };

    // ---- the players
    P.start_places = function () {                                  // $65C2
      M[0x8629] = 7; M[0x862A] = 7; M[0x862B] = 0;
      M[0x861E] = 9; M[0x861F] = 7; M[0x8620] = 0;
    };
    P.draw_players = function () {                                  // $65E1
      if (!M[0x8618]) { P.load_a(); M[0x8113] = 2; M[0x8111] = 4; P.put_player(); P.save_a(); }
      if (M[0x8137] !== 2 || M[0x8619]) return;
      P.load_b(); M[0x8113] = 2; M[0x8111] = 4; P.put_player(); P.save_b();
    };
    P.redraw_player = function* () {                                // $661A
      M[0x8113] = 2; M[0x8111] = 4;
      M[0x641C] = 0x86; M[0x6436] = 0x86; M[0x641B] = 0x37; M[0x6435] = 0x37;
      yield* P.restore_bg(0);
      P.put_player();
    };
    P.put_player = function () {                                    // $6639
      M[0x8124] = M[0x663A];
      M[0x8115] = M[0x8634]; M[0x8116] = M[0x8635];
      P.cell_address();
      const b = scr();
      for (let x = 0; x < 4; x++) M[0x8637 + x] = rb(b + x);
      for (let x = 4; x < 8; x++) M[0x8637 + x] = rb(b + 0x24 + x);
      M[0x812F] = M[0x8138] ? (((M[0x8636] << 3) & 255) + 0x50) & 255 : 8;
      const t = lsrRorRor(M[0x8636]) + M[0x668A];
      M[0x6585] = t & 255; M[0x6586] = (M[0x668F] + (t >> 8)) & 255;
      M[0x6513] = 0x37; M[0x6514] = 0x86;
      P.draw_actor();
    };
    // load_a and load_b ($66A3, $678A) copy a player's record into the work copy at $8610-$864B;
    // save_a and save_b ($671B, $6802) copy it back.
    const REC = [
      // player A, player B
      { pos: 0x8629, save: 0x862C, shot: 0x863F, score: 0x860C, armour: 0x811E, energy: 0x8612, dead: 0x8618, warn: 0x861B,
        lo: 0x22, hi: 0x53, first: 0x3A, port: 1, shotChar: 0xFE },
      { pos: 0x861E, save: 0x8621, shot: 0x8643, score: 0x860E, armour: 0x811F, energy: 0x8614, dead: 0x8619, warn: 0x861C,
        lo: 0x82, hi: 0x4E, first: 0x32, port: 0, shotChar: 0xFF },
    ];
    function load(n) {
      const r = REC[n];
      for (let i = 2; i >= 0; i--) M[0x8634 + i] = M[r.pos + i];
      for (let i = 7; i >= 0; i--) M[0x8637 + i] = M[r.save + i];
      M[0x668A] = r.lo; M[0x668F] = r.hi; M[0x663A] = r.first; M[0x8138] = n;
      M[0x8139] = P.io.ciaRead(r.port);
      for (let i = 0; i < 4; i++) M[0x8647 + i] = M[r.shot + i];
      M[0x864B] = r.shotChar;
      M[0x8610] = M[r.score]; M[0x8611] = M[r.score + 1];
      M[0x8120] = M[r.armour];
      M[0x8616] = M[r.energy]; M[0x8617] = M[r.energy + 1];
      M[0x861A] = M[r.dead];
      M[0x861D] = M[r.warn];
    }
    function save(n) {
      const r = REC[n];
      for (let i = 2; i >= 0; i--) M[r.pos + i] = M[0x8634 + i];
      for (let i = 7; i >= 0; i--) M[r.save + i] = M[0x8637 + i];
      for (let i = 0; i < 4; i++) M[r.shot + i] = M[0x8647 + i];
      if (M[0x8610] !== M[r.score]) P.print_score();
      if (M[0x8611] !== M[r.score + 1]) P.print_score();
      M[r.score] = M[0x8610]; M[r.score + 1] = M[0x8611];
      M[r.armour] = M[0x8120];
      M[r.energy] = M[0x8616]; M[r.energy + 1] = M[0x8617];
      M[r.warn] = M[0x861D];
      M[r.dead] = M[0x861A];
    }
    P.load_a = function () { load(0); };
    P.save_a = function () { save(0); };
    P.load_b = function () { load(1); };
    P.save_b = function () { save(1); };
    P.players_update = function* () {                               // $6871
      if (M[0x814C]) dec(0x814C);
      if (!(M[0x8629] & 0x80) && !M[0x8618]) { P.load_a(); yield* P.control(); P.save_a(); }
      if (M[0x8137] !== 2 || (M[0x861E] & 0x80) || M[0x8619]) return;
      P.load_b(); yield* P.control(); P.save_b();
    };
    P.control = function* () {                                      // $68A9
      yield* P.joystick();
      const j = M[0x8139];
      if ((j & 0x10) || !(j & 2) || !(M[0x8647] & 0x80)) return;    // fire without down, no shot in flight
      P.sfx_start(6);
      M[0x8648] = (M[0x8634] << 1) & 255; M[0x8649] = M[0x8635];
      const d = M[0x8636];
      M[0x8647] = d;
      if (d === 0) { M[0x8648] = (M[0x8648] + 2) & 255; dec(0x8649); }
      else if (d === 1) { M[0x8648] = (M[0x8648] + 4) & 255; inc(0x8649); }
      else if (d === 2) { M[0x8649] = (M[0x8649] + 2) & 255; inc(0x8648); }
      else dec(0x8648);
      yield* P.shot_step();
    };
    P.joystick = function* () {                                     // $6913
      M[0x8115] = M[0x8634]; M[0x8116] = M[0x8635];
      const j = M[0x8139];
      if (!(j & 4) || !(j & 8)) {                                   // left or right: a quarter turn
        if (M[0x814C]) return;
        M[0x814C] = 2;
        M[0x8636] = (M[0x8636] + (j & 4 ? 1 : -1)) & 3;
        yield* P.redraw_player();
        return;
      }
      if (!(j & 1)) { yield* P.walk(); return; }
      if (j & 2) return;
      if (j & 0x10) {                                               // down: Agravain's mask
        if (M[0x8138] || !M[0x8122]) return;
        dec(0x8122);
        let y = 0;
        do {
          if (M[0x864C + y]) { M[0x864C + y] = 0; yield* P.erase_generator(y); }
          y = (y + 1) & 255;
        } while (y !== M[0x813B]);
        P.sfx_start(7);
        return;
      }
      if (M[0x8138]) { if (!M[0x8121]) return; dec(0x8121); }     // down and fire: an amulet or a scroll
      else { if (!M[0x8123]) return; dec(0x8123); }
      if (!M[0x8142]) return;
      let x = 0;
      do {
        if (M[0x8742 + x]) { M[0x8742 + x] = 0; yield* P.erase_monster(x, (x << 3) & 255); }
        x = (x + 1) & 255;
      } while (x !== M[0x8142]);
      M[0x8142] = 0; M[0x8143] = 0; M[0x8145] = 0; M[0x8147] = 0;
      P.sfx_start(7);
    };
    P.walk = function* () {                                         // $69F7
      const d = M[0x8636];
      if (d === 0) dec(0x8116); else if (d === 1) M[0x8115] = (M[0x8115] + 2) & 255;
      else if (d === 2) M[0x8116] = (M[0x8116] + 2) & 255; else dec(0x8115);
      if (d === 0 || d === 2) P.row_test(); else P.column_test();
      const a = M[0x8124];
      if (a === 0xFF) return;
      if (a && !(yield* P.touch_object())) return;
      if (d === 0 || d === 2) { M[0x8116] = M[0x8635]; M[0x8635] = (M[0x8635] + (d ? 1 : -1)) & 255; }
      else { M[0x8115] = M[0x8634]; M[0x8634] = (M[0x8634] + (d === 1 ? 1 : -1)) & 255; }
      yield* P.redraw_player();
    };
    // touch_object ($6A8A): true when the player goes on into the cell; false where the game pulls
    // walk's return address off the stack and returns to control (a solid object, a locked door).
    P.touch_object = function* () {
      const o = ((M[0x8124] - 0x42) & 255) & 0xF8;
      M[0x8108] = o;
      const q = o >> 2;
      M[0x8124] = q;
      const r = ((q >> 1) + q) & 255;
      M[0x8127] = r;
      M[0xFB] = M[0x814F]; M[0xFC] = M[0x8150];
      const L = list(), cls = rb(L + ((r + 2) & 255)) & 0xF0;
      if (cls === 0x20) return false;
      const sx = M[0x8115], sy = M[0x8116];
      if (cls !== 0x10) { show(0x82, 0x54); yield* P.trap_fire(sx, sy); return true; }
      const a = rb(L + r);
      M[0x8115] = a >> 4; M[0x8116] = a & 15;
      const y = (r + 1) & 255, t = rb(L + y);
      M[0x810D] = t; M[0x8124] = t;
      const refuse = (lo) => { show(0x83, lo); P.sfx_start(0); return false; };
      if (t === 0x0D) { if (!M[0x811A]) return refuse(0x84); dec(0x811A); }
      else if (t === 0x0F) { if (!M[0x811B]) return refuse(0x84); }
      else if (t === 0x1A) { if (!M[0x811C]) return refuse(0x84); }
      else if (t === 0x1B) { if (M[0x811D] !== 3) return refuse(0xA8); }
      P.obj_width(y);
      wb(L + y, rb(L + y) | 0x80);
      M[0x641C] = 0x86; M[0x6436] = 0x86; M[0x641B] = 0x65; M[0x6435] = 0x65;
      yield* P.restore_bg(M[0x8108]);
      P.obj_effect();
      M[0x8116] = sy; M[0x8115] = sx;
      return true;
    };
    P.obj_effect = function () {                                    // $6B89
      const t = M[0x8124];
      if (t === 0x19 || t === 0x16) { show(0x81, 0x55); P.sfx_start(3); M[0x8617] = adcD(M[0x8617], 2, 0) & 255; return; }
      if (t === 0x02) {
        show(0x81, 0x76); P.sfx_start(2);
        const a = M[0x8120];
        if (a >= 0x0D) return;
        const s = adcD(a, 2, 0);
        M[0x8120] = adcD(s & 255, M[0x8138], s >> 8) & 255;
        return;
      }
      if (t === 0x13) { show(0x81, 0xD0); P.sfx_start(2); M[0x8611] = adcD(M[0x8611], 0x10, 0) & 255; return; }
      if (t === 0x01) { show(0x81, 0x91); P.sfx_start(0x0D); M[0x8617] = adcD(M[0x8617], 5, 0) & 255; return; }
      const gain = { 0x09: [0x82, 0xBB, 4, 0x8121], 0x04: [0x82, 0xFE, 8, 0x8122], 0x00: [0x82, 0xE2, 4, 0x8123],
        0x03: [0x82, 0x72, 0x0C, 0x811A], 0x07: [0x83, 0x5B, 0x0C, 0x811B], 0x08: [0x83, 0x5B, 0x0C, 0x811C],
        0x17: [0x83, 0x19, 9, 0x811D] }[t];
      if (!gain) return;
      show(gain[0], gain[1]); P.sfx_start(gain[2]); inc(gain[3]);
    };
    P.trap_fire = function* (sx, sy) {                              // $6CF8
      P.sfx_start(0x0B);
      const bh = M[0x8113], bw = M[0x8111];
      M[0x8111] = 2; M[0x8113] = 1;
      M[0xFB] = M[0x8151]; M[0xFC] = M[0x8152];
      M[0x810A] = 0;
      let y = 0;
      do {
        y = (y + 2) & 255;
        if (rb(list() + y) & 4) P.trap_wall(y);
        y = (y + 1) & 255;
        inc(0x810A);
      } while (M[0x810A] !== M[0x813A]);
      let x = 0;
      while (x !== M[0x8141]) {
        M[0x8115] = M[0x86C3 + x]; x = (x + 1) & 255;
        M[0x8116] = M[0x86C3 + x];
        P.cell_address();
        x = (x + 1) & 255;
        const a = M[0x86C3 + x];
        wb(scr(), a); x = (x + 1) & 255;
        wb(scr() + 1, a + 1);
      }
      M[0x810A] = 0;
      M[0xFB] = M[0x814F]; M[0xFC] = M[0x8150];
      y = 0;
      do {
        y = (y + 1) & 255;
        if (!(rb(list() + y) & 0x80)) {
          y = (y + 1) & 255;
          if (rb(list() + y) & 4) yield* P.trap_object(y);
          y = (y - 1) & 255;
        }
        y = (y + 2) & 255;
        inc(0x810A);
      } while (M[0x810A] !== M[0x813C]);
      M[0x8111] = bw; M[0x8113] = bh; M[0x8116] = sy; M[0x8115] = sx;
    };
    P.trap_object = function* (y) {                                 // $6D9F
      const L = list(), a = rb(L + ((y - 2) & 255)), t = (y - 1) & 255;
      M[0x8115] = a >> 4; M[0x8116] = a & 15;
      P.obj_width(t);
      wb(L + t, rb(L + t) | 0x80);
      M[0x641C] = 0x86; M[0x6436] = 0x86; M[0x641B] = 0x65; M[0x6435] = 0x65;
      yield* P.restore_bg((M[0x810A] << 3) & 255);
    };
    P.trap_wall = function (y) {                                    // $6DDE
      const L = list(), a = rb(L + ((y - 2) & 255)), b = rb(L + ((y - 1) & 255));
      M[0x8115] = a >> 4; M[0x8116] = a & 15;
      M[0x810B] = b >> 4; M[0x810C] = b & 15;
      wb(L + y, rb(L + y) | 0x80);
      M[0x810D] = 0;
      P.wall_run();
    };

    // ---- the instructions
    P.instructions = function* () {                                 // $6E15
      vw(0x11, vr(0x11) & 0x6F);
      yield* P.clear_screen();
      yield* P.ins_clear();
      M[0x74F7] = 0x6E; M[0x74F6] = 0xF7;
      yield { cp: 0x6E2D }; yield* P.wait_frame();
      vw(0x11, (vr(0x11) & 0x7F) | 0x10);
      yield* P.show_pages();
      M[0x8116] = 3; M[0x8115] = 8; M[0x812F] = 8; M[0x8124] = 0x82; M[0x8111] = 4; M[0x8113] = 2;
      M[0x6513] = 0xA5; M[0x6514] = 0x86; M[0x6586] = 0x53; M[0x6585] = 0x22;
      P.draw_actor();
      yield* P.show_pages();
      M[0x8116] = 3; M[0x8115] = 8; M[0x812F] = 0x50; M[0x8124] = 0x8A; M[0x6586] = 0x4E; M[0x6585] = 0x82;
      P.draw_actor();
      yield* P.show_pages();
      M[0x8115] = 7;
      let x = 0;
      for (;;) {
        const w = M[0x7482 + x];
        if (w === 0) { x = (x + 1) & 255; yield* P.show_pages(); M[0x8115] = 7; M[0x8124] = 0x82; continue; }
        if (w === 0xFF) break;
        M[0x8111] = w; M[0x812F] = M[0x74A9 + x]; M[0x6585] = M[0x748F + x]; M[0x6586] = M[0x749C + x];
        P.draw_actor();
        x = (x + 1) & 255;
        M[0x8115] = 0x0A; M[0x8124] = 0x8A;
      }
      yield* P.show_pages();
      yield { cp: 0x6EEB }; yield* P.wait_frame();
      vw(0x11, vr(0x11) & 0x6F);
    };
    P.ins_clear = function* () {                                    // $74B6
      yield { cp: 0x74B6 }; yield* P.wait_frame();
      for (let x = 0; x < 256; x++) { M[0x04F0 + x] = 0; M[0x05F0 + x] = 0; M[0x0600 + x] = 0; M[0x0700 + x] = 0; }
      for (let x = 0x19; x >= 0; x--) M[0x0457 + x] = M[0x7468 + x] & 0x3F;
    };
    P.show_pages = function* () {                                   // $74DD
      for (;;) {
        M[0x7576] = 0x05; M[0x7575] = 0xE1; M[0x757B] = 0xD9; M[0x757A] = 0xE1;
        let x = 0, y = 0;
        for (;;) {
          const p = w16(0x74F6), a = rb(p + x);
          if (a === 0) break;
          if (a === 0xFF) { const q = (p + 1) & 0xFFFF; M[0x74F6] = q & 255; M[0x74F7] = q >> 8; return; }
          if (a === 0x0D) {
            const s = M[0x7575] + 0x28;
            M[0x7575] = s & 255; M[0x757A] = s & 255;
            const t = M[0x7576] + (s >> 8);
            M[0x7576] = t & 255;
            M[0x757B] = (M[0x7576] + 0xD4 + (t >> 8)) & 255;
            y = 0;
          } else {
            wb(w16(0x7575) + y, (a & 0x3F) + 0xA0);
            wb(w16(0x757A) + y, 1);
            y = (y + 1) & 255;
          }
          x = (x + 1) & 255;
        }
        x = (x + 1) & 255;                                          // a page ends: PRESS FIRE TO CONTINUE
        const s = x + M[0x74F6];
        M[0x74F6] = s & 255; M[0x74F7] = (M[0x74F7] + (s >> 8)) & 255;
        for (let k = 0x16; k >= 0; k--) { M[0x0778 + k] = (M[0x7451 + k] & 0x3F) + 0xA0; cw(0x378 + k, 1); }
        do { yield { cp: 0x7520 }; yield* P.wait_frame(); } while (joys() & 0x10);
        do { yield { cp: 0x752D }; yield* P.wait_frame(); } while (!(joys() & 0x10));
        yield* P.ins_clear();
      }
    };
    P.copy_rom_font = function () {                                 // $7581
      for (let i = 0; i < 0x100; i++) M[0x0D00 + i] = FONT[i];
      for (let i = 0; i < 0xCA; i++) M[0x0E00 + i] = FONT[0x100 + i];
    };

    // ---- the title, a game, the main loop
    const copyText = (to, from, last) => { for (let x = last; x >= 0; x--) M[to + x] = M[from + x] & 0x3F; };
    P.program = function* () {
      yield* P.setup_vectors();
      for (;;) yield* P.title();
    };
    P.setup_vectors = function* () {                                // $80AE
      M[0x0318] = 0xDE; M[0xFFFA] = 0xF6; M[0x0319] = 0x80; M[0xFFFB] = 0x80;
      P.io.ciaWrite(0x0D, 0); P.io.ciaWrite(0x0E, 0); P.io.cia2Write(0x0D, 0); P.io.cia2Write(0x0E, 0);
      P.io.ciaRead(0x0D); P.io.cia2Read(0x0D);
      P.chrout(0x08);                                               // the KERNAL's CHROUT: case switching off
    };
    P.chrout = function () {};
    P.title = function* () {                                        // $75AF
      let v;
      while (!((v = vr(0x11)) & 0x80)) yield;
      while ((v = vr(0x11)) & 0x80) yield;
      vw(0x11, v & 0x6F);
      P.copy_rom_font();
      M[0x8137] = 2; M[0x8106] = 1;
      yield* P.game_init();
      M[0x7E61] = 0xDA; M[0x814D] = 0xDA; M[0x7E62] = 0x83; M[0x814E] = 0x83;
      P.clear_message();
      copyText(0x0433, 0x8494, 0x10); copyText(0x0459, 0x84A5, 0x14); copyText(0x0482, 0x84BA, 0x12);
      yield { wait: 0xF0 };
      vw(0x11, (vr(0x11) & 0x7F) | 0x10);
      P.sfx_reset();
      P.music_init();
      while (joys() & 0x10) yield;
      do { yield { cp: 0x762E }; yield* P.wait_frame(); } while (!(joys() & 0x10));
      P.clear_panel(0xEF);
      copyText(0x0430, 0x8513, 0x17); copyText(0x0457, 0x852B, 0x19); copyText(0x0484, 0x8545, 0x0C);
      for (;;) {
        yield { cp: 0x7667 }; yield* P.wait_frame();
        const s = joys();
        M[0x810F] = s;
        if (!(s & 4)) { M[0x8137] = 1; break; }
        if (!(s & 8)) { M[0x8137] = 2; break; }
      }
      P.clear_panel(0xEF);
      copyText(0x0430, 0x84CD, 0x18); copyText(0x0456, 0x84E6, 0x1C); copyText(0x0484, 0x8503, 0x0F);
      for (;;) {
        yield { cp: 0x76B7 }; yield* P.wait_frame();
        const s = joys();
        M[0x810F] = s;
        if (!(s & 1)) { yield { cp: 0x76C7 }; yield* P.wait_frame(); yield* P.instructions(); break; }
        if (!(s & 2)) break;
      }
      do { yield { cp: 0x76D7 }; yield* P.wait_frame(); } while ((joys() & 3) !== 3);
      M[0x8106] = 0;
      P.music_stop();
      yield { cp: 0x76EE }; yield* P.wait_frame();
      vw(0x11, vr(0x11) & 0x6F);
      let r = yield* P.game_init();
      for (;;) {                                                    // a game: rooms until the end
        if (r === 'title') return;
        r = yield* P.main_loop();
        if (r === 'over') { yield* P.game_over(); return; }
        r = yield* P.enter_room();
      }
    };
    P.game_init = function* () {                                    // $76F9
      P.reset_walls(); P.reset_objects(); P.start_places();
      vw(0x15, 0);
      for (const a of [0x860C, 0x860D, 0x860E, 0x860F, 0x8618, 0x8619, 0x861B, 0x861C, 0x811E, 0x811F, 0x8148]) M[a] = 0;
      for (let x = 7; x >= 0; x--) { M[0x862C + x] = 0; M[0x8621 + x] = 0; }
      P.io.cia2Write(0x0D, 0); P.io.cia2Write(0x0E, 0); P.io.ciaWrite(0x0D, 0); P.io.ciaWrite(0x0E, 0);
      M[0x8135] = 0; M[0x8136] = 0;
      P.io.cia2Read(0x0D); P.io.ciaRead(0x0D);
      M[0x0315] = 0x7D; M[0x0314] = 0x80;                           // the raster interrupt, irq
      M[0x8132] = 0;
      vw(0x12, 0);
      vw(0x11, vr(0x11) & 0x7F);
      vw(0x16, vr(0x16) & 0xF7);
      vw(0x19, 1); vw(0x1A, 1);
      M[0x8134] = 7;
      vw(0x18, (vr(0x18) & 0xF0) | 2);
      vw(0x16, vr(0x16) | 0x10);
      vw(0x21, 0); vw(0x20, 0); vw(0x22, 8); vw(0x23, 7);
      M[0x8109] = 0x46; M[0x8146] = 0x32;
      M[0x8612] = 0; M[0x8614] = 0; M[0x8613] = 0x20;
      M[0x8615] = M[0x8137] === 2 ? 0x25 : 0;
      P.sfx_reset();
      return yield* P.enter_room();
    };
    // enter_room ($77CC) draws the room at map_index. On the title it returns ('title'); in play it
    // turns the screen on and goes into the main loop ('play'), or, in Corrine's room, plays the
    // ending and goes back to the title ('title').
    P.enter_room = function* () {
      vw(0x11, vr(0x11) & 0x6F);
      M[0x8643] = 0xFF; M[0x863F] = 0xFF;
      yield* P.clear_screen();
      const v = M[0x471C + M[0x8109]];
      let a = 0;
      for (let t = v >> 4; t > 0; t--) a = (a + 10) & 255;
      const r = ((v & 15) + a) & 255;
      M[0x8118] = r;
      const i = (r << 1) & 255;
      M[0x7E61] = M[0x294E + i]; M[0x814D] = M[0x294E + i];
      M[0x7E62] = M[0x294F + i]; M[0x814E] = M[0x294F + i];
      for (const z of [0x814C, 0x8141, 0x8142, 0x8143, 0x8145, 0x8147, 0x8107, 0x8125]) M[z] = 0;
      for (let k = 0; k < 10; k++) M[0x8742 + k] = 0;
      P.draw_floor(); P.draw_walls(); P.draw_border(); P.draw_generators(); P.draw_objects(); P.draw_players();
      if (M[0x8106]) return 'title';
      P.load_a(); P.print_score(); P.load_b(); P.print_score();
      for (let x = 0x0D; x >= 0; x--) { const c = M[0x8552 + x] & 0x3F; M[0x0452 + x] = c; M[0x0468 + x] = c; }
      M[0x040C] = 0x31; M[0x0422] = 0x32;
      for (let x = 6; x >= 0; x--) { const c = M[0x8560 + x] & 0x3F; M[0x0405 + x] = c; M[0x041B + x] = c; }
      let s;
      while (!((s = vr(0x11)) & 0x80)) yield;
      while ((s = vr(0x11)) & 0x80) yield;
      vw(0x11, (s & 0x7F) | 0x10);
      if (M[0x8118] !== 0x63) return 'play';
      M[0x7E62] = 0x84; M[0x814E] = 0x84; M[0x7E61] = 0x52; M[0x814D] = 0x52;   // Corrine
      P.clear_message();
      P.sfx_start(0x0E);
      for (let n = 5; n > 0; n--) {
        for (let k = 0; k < 256; k++) { yield { cp: 0x78C4 }; yield* P.wait_frame(); }
        P.sfx_start(0x0E);
      }
      return 'title';
    };
    P.main_loop = function* () {                                    // $78D7: 'room' for the next room, 'over' at the end
      for (;;) {
        yield { cp: 0x78D7 };
        M[0x8149] = 0; M[0x814A] = 0;
        yield { cp: 0x78E0 }; yield* P.wait_frame();
        inc(0x8107);
        if (!(M[0x8107] & 1)) { yield { cp: 0x78ED }; yield* P.players_update(); }
        yield { cp: 0x78F0 }; yield* P.shots_update();
        yield { cp: 0x78F3 }; yield* P.move_monster();
        yield { cp: 0x78F6 }; P.spawn();
        yield { cp: 0x78F9 }; yield* P.wait_frame();
        yield { cp: 0x78FC }; yield* P.shots_update();
        yield { cp: 0x78FF };
        if (yield* P.room_exits()) return 'room';
        if (M[0x8149]) { M[0x814B] = M[0x8149]; P.load_a(); yield* P.lose_energy(); P.save_a(); }
        if (M[0x8137] === 2 && M[0x814A]) { M[0x814B] = M[0x814A]; P.load_b(); yield* P.lose_energy(); P.save_b(); }
        yield { cp: 0x792B }; P.print_energies();
        inc(0x8144);
        if (M[0x8144] === 6) {
          M[0x8144] = 1;
          inc(0x8148);
          if (M[0x8148] === 5) {                                    // hunger
            M[0x8148] = 0;
            P.load_a(); M[0x814B] = 2; yield* P.lose_energy(); P.save_a();
            if (M[0x8137] !== 2) { if (M[0x8618]) return 'over'; continue; }
            P.load_b(); M[0x814B] = 1; yield* P.lose_energy(); P.save_b();
          }
        }
        if (M[0x8137] === 2 && !M[0x8619]) continue;
        if (M[0x8618]) return 'over';
      }
    };
    P.game_over = function* () {                                    // $7983
      for (let x = 7; x >= 0; x--) {
        M[0x0990 + x] = FONT[0x38 + x]; M[0x0998 + x] = FONT[0x08 + x]; M[0x09A0 + x] = FONT[0x68 + x];
        M[0x09A8 + x] = FONT[0x28 + x]; M[0x09D0 + x] = FONT[0x28 + x];
        M[0x09B0 + x] = FONT[0x100 + x]; M[0x09B8 + x] = FONT[0x100 + x];
        M[0x09C0 + x] = FONT[0x78 + x]; M[0x09C8 + x] = FONT[0xB0 + x]; M[0x09D8 + x] = FONT[0x90 + x];
      }
      for (let x = 9, y = 0x3B; x >= 0; x--, y--) { cw(0x23F + x, 1); M[0x063F + x] = y; }
      let x = 0x96;
      do { yield { cp: 0x79DF }; yield* P.wait_frame(); if (!(joys() & 0x10)) break; x--; } while (x);
    };
    // room_exits ($79F2): true when the players have left the room and map_index has moved on, where
    // the game jumps to enter_room.
    P.room_exits = function* () {
      if (!M[0x8618]) {
        P.load_a(); yield* P.edge_check(); P.save_a();
        if (M[0x8137] !== 2) return (M[0x8629] & 0x80) ? P.next_room() : false;
      }
      if (M[0x8619]) return (M[0x8629] & 0x80) ? P.next_room() : false;
      P.load_b(); yield* P.edge_check(); P.save_b();
      if (!M[0x8618] && !(M[0x8629] & 0x80)) return false;
      return (M[0x861E] & 0x80) ? P.next_room() : false;
    };
    P.next_room = function () {                                     // $7A31
      M[0x8109] = (M[0x8109] + M[0x813E]) & 255;
      if (!M[0x8618]) M[0x8629] &= 0x0F;
      if (!M[0x8619]) M[0x861E] &= 0x0F;
      return true;
    };
    P.edge_check = function* () {                                   // $7A58
      const px = M[0x8634], py = M[0x8635], across = M[0x8138] === 1 ? 7 : 9;
      let e;
      if (px === 0) e = [0x0D, 0xFF, 0x0F, across];
      else if (px === 0x10) e = [0x0E, 0x01, 0x01, across];
      else if (py === 0) e = [0x07, 0xF0, across, 0x0F];
      else if (py === 0x10) e = [0x0B, 0x10, across, 0x01];
      else return;
      M[0x813D] = e[0]; M[0x813E] = e[1]; M[0x813F] = e[2]; M[0x8140] = e[3];
      M[0x641C] = 0x86; M[0x6436] = 0x86; M[0x641B] = 0x37; M[0x6435] = 0x37;
      M[0x8111] = 4;
      M[0x8115] = px; M[0x8116] = py;
      yield* P.restore_bg(0);
      M[0x810D] = 3; M[0x812F] = 0x30;
      const exits = M[0x8119];
      M[0x8119] = M[0x813D];
      P.sfx_start(1);
      show(0x82, 0x8A);
      P.open_exits();
      M[0x8119] = exits;
      M[0x8634] = M[0x813F] | 0x80; M[0x8635] = M[0x8140];
    };

    // ---- shots
    P.shot_unplot = function () {                                   // $7B64
      if (M[0x864A] >= 0xFE) return;
      P.col_address(M[0x8648], (M[0x8649] << 1) & 255);
      const v = rb(scr());
      if (v < 0xFE && v >= 0xA0) return;
      wb(scr(), M[0x864A]);
    };
    P.shots_update = function* () {                                 // $7B8A
      if (!(M[0x8629] & 0x80)) { P.load_a(); yield* P.shot_move(); P.save_a(); }
      if (M[0x8137] !== 2 || (M[0x861E] & 0x80)) return;
      P.load_b(); yield* P.shot_move(); P.save_b();
    };
    P.shot_move = function* () {                                    // $7BB0
      const d = M[0x8647];
      if (d & 0x80) return;
      P.shot_unplot();
      if (d === 0) dec(0x8649); else if (d === 1) inc(0x8648); else if (d === 2) inc(0x8649); else dec(0x8648);
      yield* P.shot_step();
    };
    P.shot_step = function* () {                                    // $7BDB
      const c = M[0x8648], r = M[0x8649];
      if ((c & 0x80) || c === 0 || c >= 0x22 || (r & 0x80) || r === 0 || r >= 0x11) { P.shot_end(); return; }
      P.col_address(c, (r << 1) & 255);
      const a = rb(scr());
      if (a >= 0x82 && a < 0xFE) { yield* P.shot_hit(a); return; }
      if (a && a < 0x82 && (a < 0x12 || a >= 0x32)) { P.shot_end(); return; }
      // empty, floor or a shot: the shot's character built over it ($FE's Z flag takes the empty path)
      const m = (a === 0 || a === 0xFE) ? a : (((a - 0x11) & 255) << 3) & 255, s = m + 0xCE;
      M[0x6588] = s & 255; M[0x6589] = 0x87 + (s >> 8);
      M[0x864A] = a; M[0x8124] = a;
      P.chars_address();
      M[0x658B] = M[0x658E]; M[0x658C] = M[0x658F];
      M[0x6585] = 0x38; M[0x6586] = 0x08;
      M[0x658E] = M[0x864B] === 0xFF ? 0xF8 : 0xF0; M[0x658F] = 0x0F;
      P.compose_one();
      wb(scr(), M[0x864B]); wb(col(), 0x0A);
    };
    P.shot_end = function () { M[0x8647] = 0xFF; };                // $7C79
    P.shot_hit = function* (a) {                                    // $7C7F
      if (a >= 0xA0) {                                              // a monster
        const c = (a - 0xA0) & 255, y = c & 0xF8, n = y >> 3;
        M[0x8124] = c;
        dec(0x8742 + n);
        if (M[0x8742 + n]) { P.shot_end(); return; }
        yield* P.erase_monster(n, y);
        P.sfx_start(7);
        const s = adcD(M[0x8610], 1, 0);
        M[0x8610] = s & 255; M[0x8611] = adcD(M[0x8611], 0, s >> 8) & 255;
        dec(0x8142);
        P.shot_end();
        return;
      }
      const c = (a - 0x82) & 255, g = Math.floor(c / 6);           // a generator
      M[0x8124] = c;
      const h = M[0x864C + g];
      if (h & 0x80) { P.shot_end(); return; }
      M[0x864C + g] = (h - 1) & 255;
      if (M[0x864C + g]) { P.shot_end(); return; }
      yield* P.erase_generator(g);
      show(0x82, 0x26); P.sfx_start(7);
      P.shot_end();
    };
    P.erase_generator = function* (g) {                             // $7CC3
      const c2 = (g << 1) & 255;
      M[0x810D] = c2;
      const x = (((c2 << 1) & 255) + c2) & 255, y = (g + c2) & 255;
      M[0xFB] = M[0x8153]; M[0xFC] = M[0x8154];
      const a = rb(list() + y);
      M[0x8115] = a >> 4; M[0x8116] = a & 15;
      M[0x641C] = 0x86; M[0x6436] = 0x86; M[0x641B] = 0xA5; M[0x6435] = 0xA5;
      M[0x8111] = 3; M[0x8113] = 2;
      yield* P.restore_bg(x);
    };
    P.erase_monster = function* (n, y) {                            // $7D42
      M[0x8115] = M[0x874C + n]; M[0x8116] = M[0x8756 + n];
      M[0x641C] = 0x87; M[0x6436] = 0x87; M[0x641B] = 0x7E; M[0x6435] = 0x7E;
      const k = M[0x876A + n] & 7;
      M[0x8111] = k === 2 || k === 4 ? 3 : 4; M[0x8113] = 2;
      yield* P.restore_bg(y);
    };

    // ---- the raster interrupt ($7D80) and its four bands
    P.irq = function () {
      vw(0x19, vr(0x19) & 1);
      let x = M[0x8132], hi = M[0x7DB3 + x];
      if (!hi) { x = 0; hi = M[0x7DB3]; }
      M[0x7DAC] = hi; x++;
      M[0x7DAB] = M[0x7DB3 + x]; x++;
      vw(0x12, M[0x7DB3 + x]); x++;
      M[0x8132] = x;
      const at = w16(0x7DAB), band = { 0x7DC0: P.message_band, 0x7DE7: P.play_band, 0x7E16: P.frame_mark, 0x7E1C: P.panel_band }[at];
      if (!band) throw new Error('irq: no band at $' + at.toString(16));
      band();
    };
    P.message_band = function () {                                  // $7DC0, line $58
      vw(0x21, 6);
      const old = vr(0x16);
      vw(0x16, (old & 0xF0) | M[0x8134]);
      M[0x8134] = old;
      vw(0x18, (vr(0x18) & 0xF0) | 4);
    };
    P.play_band = function () {                                     // $7DE7, line $60
      const old = vr(0x16);
      vw(0x16, (M[0x8134] & 0xF7) | 0x10);
      M[0x8134] = (old - 2) & 7;
      vw(0x18, (vr(0x18) & 0xF0) | 2);
      vw(0x21, 0);
      P.sfx_update(old >= 2 ? 1 : 0);
    };
    P.frame_mark = function () { M[0x8133] = 1; };                  // $7E16, line $E8
    P.panel_band = function () {                                    // $7E1C, line $FF
      M[0x8133] = 0;
      vw(0x18, (vr(0x18) & 0xF0) | 4);
      vw(0x21, 2);
      if (M[0x8106]) P.music_play();
      if (M[0x8134] !== 7) return;
      for (let x = 0; x < 0x27; x++) M[0x04C8 + x] = M[0x04C9 + x];   // the message line moves a character on
      let x = M[0x8135], a;
      for (;;) {
        if (x !== (M[0x8106] ? 0x77 : 0x50)) { a = rb(w16(0x7E61) + x); if (a) break; }
        if (M[0x8136] !== 0x78) { M[0x04EF] = 0x20; inc(0x8136); return; }
        x = 0; M[0x8136] = 0;                                       // the room's own message again
        M[0x7E61] = M[0x814D]; M[0x7E62] = M[0x814E];
        a = rb(w16(0x7E61));
        if (a) break;
        M[0x04EF] = 0x20; inc(0x8136); return;
      }
      if (a !== 0x20 && a >= 0x41) a = (a - 0x40) & 255;
      M[0x04EF] = a;
      M[0x8135] = (x + 1) & 255;
      inc(0x8136);
    };

    // ---- scores and energy
    P.reset_walls = function () { resetLists(0x1000, 0x7EC4, 10, 2); };       // $7EA2
    P.reset_objects = function () { resetLists(0x17CD, 0x7F21, 8, 1); };      // $7EFF
    // Walks the 100 rooms' lists end to end from room 0's, clearing bit 7 of each record's byte at
    // offset `at`: the walls' removed mark, the objects' taken mark. The list address is patched into
    // three instructions (at op, op + 7 and op + 12 for the walls; op, op + 6, op + 11 for the objects).
    function resetLists(table, op, per, at) {
      const ops = at === 2 ? [op, op + 7, op + 12] : [op, op + 6, op + 11];
      const put = (lo, hi) => { for (const o of ops) { M[o] = lo; M[o + 1] = hi; } };
      M[0x810A] = 0;
      put(M[table], M[table + 1]);
      do {
        const p = w16(op);
        let x = 0, y = per;
        for (;;) {
          if (!M[(p + x) & 0xFFFF]) break;
          x = (x + at) & 255;
          M[(p + x) & 0xFFFF] &= 0x7F;
          x = (x + 3 - at) & 255;
          if (!--y) { x = (x - 1) & 255; break; }
        }
        x = (x + 1) & 255;
        const s = x + M[op];
        put(s & 255, (M[op + 1] + (s >> 8)) & 255);
        inc(0x810A);
      } while (M[0x810A] !== 0x64);
    }
    P.print_score = function () {                                   // $7F5C
      const s = (M[0x8138] ? 0x16 : 0) + 0x7A;
      M[0xFD] = s & 255; M[0xFE] = 0x04 + (s >> 8);
      P.print_bcd(M[0x8611], 0); P.print_bcd(M[0x8610], 2);
    };
    P.print_bcd = function (a, y) {                                 // $7F7D
      wb(scr() + y, (a >> 4) + 0x30); wb(scr() + y + 1, (a & 15) + 0x30);
    };
    P.print_energies = function () {                                // $7F91
      M[0xFE] = 0x04; M[0xFD] = 0x82;
      P.print_bcd(M[0x8613], 0); P.print_bcd(M[0x8612], 2);
      P.print_bcd(M[0x8615], 0x16); P.print_bcd(M[0x8614], 0x18);
    };
    P.lose_energy = function* () {                                  // $7FB6
      if (M[0x861A]) return;
      const drain = M[0x814B];
      if (M[0x8120]) {
        if (M[0x8120] > drain) return;                              // armour above the drain: nothing lost
        M[0x8120] = sbcD(M[0x8120], 1, 1) & 255;
      }
      const l = sbcD(drain, M[0x8120], 1) & 255;
      M[0x8110] = l;
      const s1 = sbcD(M[0x8616], l, 1), s2 = sbcD(M[0x8617], 0, s1 >> 8);
      M[0x8616] = s1 & 255; M[0x8617] = s2 & 255;
      if (!(s2 >> 8)) { yield* P.player_dies(); return; }
      const hi = s2 & 255;
      if (hi >= 0x10) { M[0x861D] = 0; return; }
      if (hi < 5) { if (M[0x861D] >= 2) return; inc(0x861D); P.warn(); return; }
      if (M[0x861D]) { M[0x861D] = 1; return; }
      inc(0x861D); P.warn();
    };
    P.warn = function () {                                          // $8025
      P.sfx_start(0x0E);
      if (M[0x8138]) show(0x82, 0x0F); else show(0x81, 0xF4);
    };
    P.player_dies = function* () {                                  // $804E
      M[0x8616] = 0; M[0x8617] = 0; M[0x861A] = 1;
      P.sfx_start(0x0A);
      M[0x641C] = 0x86; M[0x6436] = 0x86; M[0x641B] = 0x37; M[0x6435] = 0x37;
      M[0x8111] = 4;
      if (!(M[0x8634] & 0x80)) { M[0x8115] = M[0x8634]; M[0x8116] = M[0x8635]; yield* P.restore_bg(0); }
      M[0x8634] = 0xFF; M[0x8635] = 0xFF;
      for (let x = 0x50; x > 0; x--) { yield { cp: 0x8092 }; yield* P.wait_frame(); vw(0x20, vr(0x20) + 1); }
      vw(0x20, 0);
    };

    // ---- the title music: the driver's own code on a small 6502
    const core = musicCore(M, (r, v) => sw(r, v));
    P.music_init = function () { core.call(0x9000); };
    P.music_play = function () { core.call(0x911B); };
    P.music_stop = function () { core.call(0x9227); };
    return P;
  }

  // A 6502 for the music driver ($9000-$99C1): its documented instructions on m, a write to
  // $D400-$D7FF going to the SID (sid(register, value)); the driver reads no chip. call(entry) runs
  // the routine to its return, with A, X and Y 0 and the flags clear.
  function musicCore(m, sid) {
    let a = 0, x = 0, y = 0, sp = 0xFF, pc = 0, n = 0, v = 0, z = 0, c = 0, d = 0;
    const rd = (ad) => m[ad];
    const wr = (ad, val) => { if (ad >= 0xD400 && ad < 0xD800) sid(ad & 0x1F, val); else m[ad] = val; };
    const nz = (r) => { n = r & 0x80; z = r === 0 ? 1 : 0; return r; };
    const push = (b) => { m[0x100 + sp] = b; sp = (sp - 1) & 255; };
    const pull = () => { sp = (sp + 1) & 255; return m[0x100 + sp]; };
    const flags = () => (n ? 0x80 : 0) | (v ? 0x40 : 0) | 0x30 | (d ? 8 : 0) | 4 | (z ? 2 : 0) | (c ? 1 : 0);
    const setf = (p) => { n = p & 0x80; v = p & 0x40; d = p & 8; z = p & 2; c = p & 1; };
    const adc = (b) => {
      if (d) { const r = adcD(a, b, c ? 1 : 0); z = ((a + b + (c ? 1 : 0)) & 255) === 0 ? 1 : 0; c = r >> 8; a = r & 255; n = a & 0x80; return; }
      const s = a + b + (c ? 1 : 0); v = (~(a ^ b) & (a ^ s) & 0x80); c = s > 255 ? 1 : 0; a = nz(s & 255);
    };
    const sbc = (b) => {
      if (d) { const r = sbcD(a, b, c ? 1 : 0); nz((a - b - (c ? 0 : 1)) & 255); c = r >> 8; a = r & 255; return; }
      adc(b ^ 255);
    };
    const cmp = (r, b) => { const s = r - b; c = s >= 0 ? 1 : 0; nz(s & 255); };
    function step() {
      const op = m[pc], b1 = m[(pc + 1) & 0xFFFF], b2 = m[(pc + 2) & 0xFFFF], w = b1 | b2 << 8;
      const zpx = (b1 + x) & 255, zpy = (b1 + y) & 255;
      const izx = m[zpx] | m[(zpx + 1) & 255] << 8, izy = ((m[b1] | m[(b1 + 1) & 255] << 8) + y) & 0xFFFF;
      const abx = (w + x) & 0xFFFF, aby = (w + y) & 0xFFFF;
      const g = op & 3, mode = (op >> 2) & 7;
      let ea, len;
      if (g === 1) { ea = [izx, b1, -2, w, izy, zpx, aby, abx][mode]; len = (mode === 3 || mode >= 6) ? 3 : 2; }
      else { ea = [-2, b1, -2, w, -1, (op === 0x96 || op === 0xB6) ? zpy : zpx, -1, (op === 0xBE) ? aby : abx][mode]; len = (mode === 3 || mode === 7) ? 3 : 2; }
      const M = () => (ea === -2 ? b1 : rd(ea));
      switch (op) {
        case 0x01: case 0x05: case 0x09: case 0x0D: case 0x11: case 0x15: case 0x19: case 0x1D: a = nz(a | M()); break;
        case 0x21: case 0x25: case 0x29: case 0x2D: case 0x31: case 0x35: case 0x39: case 0x3D: a = nz(a & M()); break;
        case 0x41: case 0x45: case 0x49: case 0x4D: case 0x51: case 0x55: case 0x59: case 0x5D: a = nz(a ^ M()); break;
        case 0x61: case 0x65: case 0x69: case 0x6D: case 0x71: case 0x75: case 0x79: case 0x7D: adc(M()); break;
        case 0x81: case 0x85: case 0x8D: case 0x91: case 0x95: case 0x99: case 0x9D: wr(ea, a); break;
        case 0xA1: case 0xA5: case 0xA9: case 0xAD: case 0xB1: case 0xB5: case 0xB9: case 0xBD: a = nz(M()); break;
        case 0xC1: case 0xC5: case 0xC9: case 0xCD: case 0xD1: case 0xD5: case 0xD9: case 0xDD: cmp(a, M()); break;
        case 0xE1: case 0xE5: case 0xE9: case 0xED: case 0xF1: case 0xF5: case 0xF9: case 0xFD: sbc(M()); break;
        case 0x06: case 0x0E: case 0x16: case 0x1E: { const t = rd(ea); c = t >> 7; wr(ea, nz((t << 1) & 255)); break; }
        case 0x26: case 0x2E: case 0x36: case 0x3E: { const t = rd(ea), r = ((t << 1) | (c ? 1 : 0)) & 255; c = t >> 7; wr(ea, nz(r)); break; }
        case 0x46: case 0x4E: case 0x56: case 0x5E: { const t = rd(ea); c = t & 1; wr(ea, nz(t >> 1)); break; }
        case 0x66: case 0x6E: case 0x76: case 0x7E: { const t = rd(ea), r = (t >> 1) | (c ? 0x80 : 0); c = t & 1; wr(ea, nz(r)); break; }
        case 0xC6: case 0xCE: case 0xD6: case 0xDE: wr(ea, nz((rd(ea) - 1) & 255)); break;
        case 0xE6: case 0xEE: case 0xF6: case 0xFE: wr(ea, nz((rd(ea) + 1) & 255)); break;
        case 0x0A: c = a >> 7; a = nz((a << 1) & 255); len = 1; break;
        case 0x2A: { const r = ((a << 1) | (c ? 1 : 0)) & 255; c = a >> 7; a = nz(r); len = 1; break; }
        case 0x4A: c = a & 1; a = nz(a >> 1); len = 1; break;
        case 0x6A: { const r = (a >> 1) | (c ? 0x80 : 0); c = a & 1; a = nz(r); len = 1; break; }
        case 0xA2: case 0xA6: case 0xAE: case 0xB6: case 0xBE: x = nz(M()); break;
        case 0xA0: case 0xA4: case 0xAC: case 0xB4: case 0xBC: y = nz(M()); break;
        case 0x86: case 0x8E: case 0x96: wr(ea, x); break;
        case 0x84: case 0x8C: case 0x94: wr(ea, y); break;
        case 0xE0: case 0xE4: case 0xEC: cmp(x, M()); break;
        case 0xC0: case 0xC4: case 0xCC: cmp(y, M()); break;
        case 0x24: case 0x2C: { const t = rd(ea); n = t & 0x80; v = t & 0x40; z = (a & t) === 0 ? 1 : 0; break; }
        case 0xAA: x = nz(a); len = 1; break; case 0xA8: y = nz(a); len = 1; break;
        case 0x8A: a = nz(x); len = 1; break; case 0x98: a = nz(y); len = 1; break;
        case 0xBA: x = nz(sp); len = 1; break; case 0x9A: sp = x; len = 1; break;
        case 0xE8: x = nz((x + 1) & 255); len = 1; break; case 0xCA: x = nz((x - 1) & 255); len = 1; break;
        case 0xC8: y = nz((y + 1) & 255); len = 1; break; case 0x88: y = nz((y - 1) & 255); len = 1; break;
        case 0x18: c = 0; len = 1; break; case 0x38: c = 1; len = 1; break;
        case 0x58: case 0x78: case 0xEA: len = 1; break;
        case 0xB8: v = 0; len = 1; break; case 0xD8: d = 0; len = 1; break; case 0xF8: d = 1; len = 1; break;
        case 0x48: push(a); len = 1; break; case 0x68: a = nz(pull()); len = 1; break;
        case 0x08: push(flags()); len = 1; break; case 0x28: setf(pull()); len = 1; break;
        case 0x10: case 0x30: case 0x50: case 0x70: case 0x90: case 0xB0: case 0xD0: case 0xF0: {
          const f = [n, v, c, z][op >> 6], take = (op & 0x20) ? !!f : !f;
          pc = (pc + 2 + (take ? (b1 < 128 ? b1 : b1 - 256) : 0)) & 0xFFFF; return;
        }
        case 0x4C: pc = w; return;
        case 0x6C: pc = m[w] | m[(w & 0xFF00) | ((w + 1) & 255)] << 8; return;
        case 0x20: { const r = (pc + 2) & 0xFFFF; push(r >> 8); push(r & 255); pc = w; return; }
        case 0x60: { const lo = pull(); pc = ((pull() << 8 | lo) + 1) & 0xFFFF; return; }
        default: throw new Error('music: opcode $' + op.toString(16) + ' at $' + pc.toString(16));
      }
      pc = (pc + len) & 0xFFFF;
    }
    function call(entry) {
      a = 0; x = 0; y = 0; n = v = d = z = c = 0; sp = 0xFD; m[0x1FF] = 0xFF; m[0x1FE] = 0xFE; pc = entry;
      for (let i = 0; i < 1e6; i++) { if (pc === 0xFFFF) return; step(); }
      throw new Error('music: runaway at $' + pc.toString(16));
    }
    return { call };
  }

  return { create, FONT, adcD, sbcD };
})();
