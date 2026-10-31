// The library the rest of the game is built on: the inline arguments every routine takes
// (inline_args, $7125), the rectangle and address arithmetic ($715F-$7345), fill and copy_block, the
// waits ($734C, $828B, $841D-$8441), the controls (key_down to read_keys, $50F1-$51A1), the random
// number ($7BAE), divide16, and the border trap the script engine falls into on a bad command.
(function (root) {
'use strict';
const G = root.AMGroups = root.AMGroups || {};
root.AMPort.gen(`wait_frames wait_fire_up wait_press wait_fire_or_time wait_fire_moving wait_fire_off
  border_until_fire halt_with_border`);
G.lib = function (P) {
  const M = P.M, io = P.io;
  // The waits on delay_count start where the game's do (wait_frames, wait_fire_or_time): each wait's
  // first read of the byte is then the first of its stretch, the one P.irqByte gives.
  P.CHECKPOINTS.push(0x734C, 0x7354, 0x828B, 0x829C, 0x8440, 0x8436, 0x52EC);
  const w = P.w, setw = P.setw;
  // the zero page the library keeps: the inline bytes from $1F, the rectangle at $2C-$31 (column,
  // row, width, height, value), the cell pointer $2A/$2B and its copy $88/$89
  const IB = 0x1F;
  P.N.fill = 0; P.N.copy = 0; P.N.rect = 0;

  // inline_args ($7125): copies n bytes from after the JSR at jsr (the caller's call) into $1F on,
  // as the routine whose `jsr inline_args` is at own asked. What it leaves: $04 the count, $07/$08
  // and the operand of its return jump ($715D) its own return address plus one, $09/$0A the last
  // byte taken. The caller goes on past the bytes, which the port's caller does by itself.
  P.inline_args = function (n, jsr, own) {
    M[0x04] = n;
    const back = (own + 3) & 0xFFFF;
    M[0x07] = back & 255; M[0x08] = back >> 8;
    M[0x715D] = back & 255; M[0x715E] = back >> 8;
    let p = (jsr + 2) & 0xFFFF;
    for (let x = 0; x < n; x++) { p = (p + 1) & 0xFFFF; M[IB + x] = M[p]; }
    M[0x09] = p & 255; M[0x0A] = p >> 8;
    return { a: M[0x09], x: n, y: 0 };
  };
  // rect_args ($715F): the inline bytes as a rectangle, $1F-$23 to $2C, $2E, $2F, $30, $31;
  // rect_origin ($716B) the position only
  P.rect_args = function () {
    M[0x2F] = M[0x21]; M[0x30] = M[0x22]; M[0x31] = M[0x23];
    return P.rect_origin();
  };
  P.rect_origin = function () {
    M[0x2C] = M[IB]; M[0x2E] = M[0x20];
    return { a: M[0x20] };
  };
  // io_in ($7174) and io_out ($7179): the chips in ($01 = $05) and out ($04)
  P.io_in = () => { M[1] = 0x05; return { a: 0x05 }; };
  P.io_out = () => { M[1] = 0x04; return { a: 0x04 }; };

  // cell_address ($719C): column $2C, row $2E's colour cell, from screen_rows ($4FD3), into
  // $2A/$2B and $88/$89. The carry into the add is the row's top bit, from the asl, which no row
  // has.
  P.cell_address = function () {
    const y = (M[0x2E] << 1) & 255;
    const lo = M[0x4FD3 + y] + M[0x2C] + (M[0x2E] >> 7);
    const hi = (M[0x4FD4 + y] + (lo >> 8)) & 255;
    M[0x2A] = M[0x88] = lo & 255; M[0x2B] = M[0x89] = hi;
    return { a: hi, y };
  };
  // cell_address_84 ($71B7): the same for column $84 and row $85
  P.cell_address_84 = function () {
    const y = (M[0x85] << 1) & 255;
    const lo = M[0x4FD3 + y] + M[0x84] + (M[0x85] >> 7);
    const hi = (M[0x4FD4 + y] + (lo >> 8)) & 255;
    M[0x2A] = M[0x88] = lo & 255; M[0x2B] = M[0x89] = hi;
    return { a: hi, y };
  };
  // pixel_address ($71F6): the bitmap byte of pixel x $84, y $85 in $2A/$2B and $88/$89, and the
  // pixel's place in its byte in A
  P.pixel_address = function () {
    let p = (M[0x84] & 0xF8) + (M[0x85] & 7);
    const y = (M[0x85] >> 2) & 0xFE;
    p = (p + (M[0x4F9F + y] | M[0x4FA0 + y] << 8)) & 0xFFFF;
    setw(0x2A, p); setw(0x88, p);
    return { a: M[0x84] & 7, y };
  };
  // cell_bitmap_address ($72FF): column $2C, row $2E's first bitmap byte, from bitmap_rows ($4F9F)
  P.cell_bitmap_address = function () {
    // three shifts of the column, only the last one's carry kept as the high byte
    let a = (M[0x2C] << 2) & 255;
    const hi8 = a >> 7;
    a = (a << 1) & 255;
    M[0x2A] = a; M[0x2B] = hi8;
    const x = (M[0x2E] << 1) & 255;
    const lo = M[0x4F9F + x] + a + (M[0x2E] >> 7);
    const hi = (M[0x4FA0 + x] + hi8 + (lo >> 8)) & 255;
    M[0x2A] = M[0x88] = lo & 255; M[0x2B] = M[0x89] = hi;
    return { a: hi, x, y: hi8 };
  };
  P.cell_bitmap_84 = function () {
    M[0x2C] = M[0x84]; M[0x2E] = M[0x85];
    return P.cell_bitmap_address();
  };
  // next_cell_row ($7331): ($2A) on 320 bytes; next_screen_row ($7345) on 40; add_to_pointer ($73CC) on A
  P.next_cell_row = function () { setw(0x2A, w(0x2A) + 0x140); return { a: M[0x2B] }; };
  P.add_to_pointer = function (r) {
    const s = M[0x2A] + (r.a & 255);
    M[0x2A] = s & 255;
    if (s > 255) M[0x2B] = (M[0x2B] + 1) & 255;
    return { a: s & 255 };
  };
  P.next_screen_row = function () { return P.add_to_pointer({ a: 0x28 }); };

  // fill_cells ($717E): five inline bytes, a rectangle of colour cells and the value to fill it with
  P.fill_cells = function (r) {
    P.inline_args(5, r.at, 0x7180);
    P.rect_args();
    return P.fill_rect();
  };
  // fill_rect ($7186): the rectangle at $2C-$31 filled in the colour cells, a row at a time
  P.fill_rect = function () {
    P.cell_address();
    let x = M[0x30], y = 0;
    do {
      const p = w(0x2A);
      y = (M[0x2F] - 1) & 255;
      do { M[(p + y) & 0xFFFF] = M[0x31]; P.N.rect++; y = (y - 1) & 255; } while (y < 0x80);
      P.next_screen_row();
      x = (x - 1) & 255;
    } while (x);
    return { a: M[0x2A], x: 0, y };
  };
  // print_glyph ($7286): frame glyph A (frame_glyphs, $72B7) into the bitmap at ($2A),Y, the glyph's
  // address written into the copy's own operand ($72AC); Y moves on 8
  P.print_glyph = function (r) {
    const g = 0x72B7 + ((r.a & 255) << 3);
    M[0x72AC] = g & 255; M[0x72AD] = g >> 8;
    let y = r.y & 255;
    const p = w(0x2A);
    for (let x = 0; x < 8; x++) { M[(p + y) & 0xFFFF] = M[g + x]; y = (y + 1) & 255; }
    P.N.glyph8 = (P.N.glyph8 || 0) + 1;
    return { a: M[g + 7], x: 8, y };
  };

  // fill ($70D5): five inline bytes, a count of bytes, a count of pages, the value and the start;
  // the whole pages first, then the odd bytes
  P.fill = function (r) {
    P.inline_args(5, r.at, 0x70D7);
    const v = M[0x21];
    let y = 0;
    if (M[0x20]) {
      do {
        const p = w(0x22);
        for (let i = 0; i < 256; i++) M[(p + i) & 0xFFFF] = v;
        P.N.fill += 256;
        M[0x23] = (M[0x23] + 1) & 255;
        M[0x20] = (M[0x20] - 1) & 255;
      } while (M[0x20]);
    }
    y = M[IB];
    if (y) {
      const p = w(0x22);
      for (let i = y - 1; i >= 0; i--) M[(p + i) & 0xFFFF] = v;
      P.N.fill += y;
      y = 0xFF;
    }
    return { a: v, y };
  };
  // fill_screen_colour ($6370): every colour cell at $DC00 set to X, by fill with the value written
  // into its own inline bytes
  P.fill_screen_colour = function (r) {
    M[0x6378] = r.x & 255;
    P.fill({ at: 0x6373 });
    return {};
  };
  // copy_block ($73A3): six inline bytes, from, to, a count of bytes and a count of pages; the pages
  // first, then the odd bytes, from the last down
  P.copy_block = function (r) {
    P.inline_args(6, r.at, 0x73A5);
    let y = 0;
    while (M[0x24]) {
      const s = w(IB), d = w(0x21);
      for (let i = 0; i < 256; i++) M[(d + i) & 0xFFFF] = M[(s + i) & 0xFFFF];
      P.N.copy += 256;
      M[0x20] = (M[0x20] + 1) & 255; M[0x22] = (M[0x22] + 1) & 255;
      M[0x24] = (M[0x24] - 1) & 255;
    }
    y = M[0x23];
    if (y) {
      const s = w(IB), d = w(0x21);
      for (let i = y - 1; i >= 0; i--) M[(d + i) & 0xFFFF] = M[(s + i) & 0xFFFF];
      P.N.copy += y;
      y = 0xFF;
    }
    return { y };
  };
  // divide16 ($50AD): $76/$77 divided by $74/$75, the quotient back in $76/$77 and the remainder in
  // $78/$79, a bit at a time (the quotient's bits come in through the carry of each subtraction)
  P.divide16 = function () {
    let q = w(0x76), rem = 0, c = 0;
    const d = w(0x74);
    for (let x = 16; x; x--) {
      const t = (q << 1) | c; q = t & 0xFFFF;
      rem = ((rem << 1) | (t >> 16)) & 0x1FFFF;
      const top = rem >> 16; rem &= 0xFFFF;
      const s = rem - d;
      // the subtraction's carry: set when it does not borrow; the shift's own carry out is lost
      c = s >= 0 ? 1 : 0;
      if (c) rem = s;
      void top;
    }
    q = ((q << 1) | c) & 0xFFFF;
    setw(0x76, q); setw(0x78, rem);
    return {};
  };

  // ---- the controls
  // key_bit ($5111): the next nibble of $04, high first, as a select byte from clear_masks ($4F55)
  P.key_bit = function () {
    const n = M[0x04] >> 4;
    M[0x04] = (M[0x04] << 4) & 255;
    return { a: M[0x4F55 + n], x: 0, y: n };
  };
  // key_down ($50F1): is the key at matrix position X (column high, row low) down? The carry says.
  // The chips are banked in round the test and $01 put back, which leaves its old value in A.
  P.key_down = function (r) {
    const save = M[1];
    P.io_in();
    M[0x04] = r.x & 255;
    io.ciaWrite(0x00, P.key_bit().a);
    const k = P.key_bit();
    const down = ((k.a ^ 0xFF) & io.ciaRead(0x01)) === 0;
    M[1] = save;
    return { a: save, x: 0, y: k.y, c: down ? 1 : 0 };
  };
  // read_joystick ($515E): port 2's five bits, active low, the port made an input for the read
  P.read_joystick = function () {
    io.ciaWrite(0x02, 0x00);
    const x = io.ciaRead(0x00);
    io.ciaWrite(0x02, 0xFF);
    return { a: x & 0x1F, x };
  };
  // read_keys ($516F): SPACE, M, N, Z and A as the joystick's five bits
  P.read_keys = function () {
    M[0x51A2] = 0;
    for (const k of [0x74, 0x44, 0x47, 0x14, 0x12]) {
      const d = P.key_down({ x: k });
      M[0x51A2] = ((M[0x51A2] << 1) | d.c) & 255;
    }
    return { a: M[0x51A2] ^ 0x1F, x: 0 };
  };
  // read_controls ($5120): the control the options panel chose, through the call it rewrote
  // ($512C), as X (-1, 0, 1), Y (-1, 0, 1), A (the five bits, set when pressed) and the carry and
  // fire_pressed ($8E30) for fire
  P.read_controls = function () {
    const save = M[1];
    P.io_in();
    M[0x8E30] = 0;
    const dev = M[0x512C] | M[0x512D] << 8;
    let a;
    if (dev === 0x515E) a = P.read_joystick().a;
    else if (dev === 0x516F) a = P.read_keys().a;
    else throw new Error('read_controls: no reader at $' + dev.toString(16));
    a ^= 0x1F;
    let x = 0, y = 0, c = 0;
    if (a & 1) y = 0xFF;
    if (a & 2) y = (y + 1) & 255;
    if (a & 4) x = 0xFF;
    if (a & 8) x = (x + 1) & 255;
    if (a & 0x10) { M[0x8E30] = (M[0x8E30] + 1) & 255; c = 1; }
    M[0x04] = a;
    M[1] = save;
    return { a, x, y, c };
  };

  // ---- the waits
  // wait_frames ($734C): A frames, counted down by the interrupt in delay_count ($734B)
  P.wait_frames = function* (r) {
    yield { cp: 0x734C };
    M[0x734B] = r.a & 255;
    // delay_count read as the game's loop first read it, and from M once a turn has passed, where
    // the interrupts the lockstep runs at each yield leave it
    let polled = false;
    while (polled ? M[0x734B] : P.irqByte(0x734B)) { polled = true; yield; }
    yield { cp: 0x7354 };
    return { a: 0 };
  };
  // wait_fire_up ($8438): until fire is not pressed; A kept
  P.wait_fire_up = function* (r) {
    for (;;) {
      const c = P.read_controls();
      if (!(c.a & 0x10)) { yield { cp: 0x8440 }; return { a: r.a, x: c.x, y: c.y }; }
      yield;
    }
  };
  // wait_press ($842B): fire let go, then pressed; A kept
  P.wait_press = function* (r) {
    yield* P.wait_fire_up({});
    for (;;) {
      const c = P.read_controls();
      if (c.a & 0x10) { yield { cp: 0x8436 }; return { a: r.a, x: c.x, y: c.y }; }
      yield;
    }
  };
  // wait_fire_or_time ($828B): 20 frames or fire, whichever comes first
  P.wait_fire_or_time = function* () {
    yield { cp: 0x828B };
    M[0x734B] = 0x14;
    let polled = false;
    for (;;) {
      const c = P.read_controls();
      if (c.a & 0x10) { yield { cp: 0x829C }; return { a: 0x10, x: c.x, y: c.y }; }
      if (!(polled ? M[0x734B] : P.irqByte(0x734B))) { yield { cp: 0x829C }; return { a: 0, x: c.x, y: c.y }; }
      polled = true;
      yield;
    }
  };
  // wait_fire_moving ($841D): the cursor moved a frame at a time until fire is pressed
  P.wait_fire_moving = function* () {
    for (;;) {
      yield* P.wait_frames({ a: 1 });
      P.move_cursor();
      if (M[0x8E30]) return { a: M[0x8E30] };
    }
  };
  // wait_fire_off ($77DB): wait_fire_up
  P.wait_fire_off = function* (r) { return yield* P.wait_fire_up(r); };

  // border_until_fire ($52CA): fire let go, the border set to colour A, fire pressed and let go, the
  // border black again
  P.border_until_fire = function* (r) {
    M[0x52C9] = r.a & 255;
    yield* P.wait_fire_up({});
    const save = M[1];
    P.io_in(); io.vicWrite(0x20, M[0x52C9]); M[1] = save;
    yield* P.wait_fire_up({});
    for (;;) {
      P.read_controls();
      if (M[0x8E30]) break;
      yield;
    }
    yield { cp: 0x52EC };
    const s2 = M[1];
    P.io_in(); io.vicWrite(0x20, 0); M[1] = s2;
    return { a: s2 };
  };
  // halt_with_border ($52BD): never returns: the border in colour A until fire, again and again.
  // set_countries jumps here (P.jump('halt'), with A) for a country A of 16 or more.
  P.halt_with_border = function* (r) {
    M[0x52BC] = r.a & 255;
    for (;;) yield* P.border_until_fire({ a: M[0x52BC] });
  };

  // ---- the random number
  // random ($7BAE): the first state byte rotated right three times, plus the other two, rotated
  // left twice, is the number; the state shifts down one with it on the end. $0D/$0E are borrowed
  // and put back, and $04 keeps the number.
  P.random = function () {
    let a = M[0x7BAB];
    for (let i = 0; i < 3; i++) a = (a >> 1) | ((a & 1) << 7);
    const s1 = M[0x7BAC], s2 = M[0x7BAD];
    let t = a + s1;
    t = (t & 255) + s2 + (t >> 8);
    a = t & 255;
    for (let i = 0; i < 2; i++) a = ((a << 1) & 255) | (a >> 7);
    M[0x7BAA] = a;
    M[0x7BAB] = s1; M[0x7BAC] = s2; M[0x7BAD] = a;
    M[0x04] = a;
    return { a, z: a === 0 ? 1 : 0, n: a >> 7 };
  };
  // random_init ($7BFF): 0, $AD, $CE and twice the raster line
  P.random_init = function () {
    M[0x7BAA] = 0; M[0x7BAB] = 0xAD; M[0x7BAC] = 0xCE;
    const save = M[1];
    P.io_in();
    const y = io.vicRead(0x12);
    M[1] = save;
    M[0x7BAD] = (y << 1) & 255;
    return { a: M[0x7BAD], y };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
