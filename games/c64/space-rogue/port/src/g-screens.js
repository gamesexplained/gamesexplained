// The screens' library: the routines TITLE, INTRO and WON each carry a copy of, the same code at
// other addresses. Each of the three is a program of its own, with its own interrupt and its own
// routines of the same names as MAIN's (wait_key, print_char), so each is a port of its own:
// makePort(M, io, { program: 'title' }) installs the KERNAL's routines and that program's group,
// which calls SRScreens(P, program) for the library, and takes the program's GEN.
//
// The library's code is in three runs, at other places in each file: the loader, the text and
// the keyboard from io_in ($2042 in TITLE); the sound and the Morse from sound_init ($23C1); the
// copies, the buffers and the dissolves from copy_matrix's routine ($2623). The routines here name
// TITLE's addresses, and at() moves them to the program's. The wipes and scrolls are INTRO's and
// WON's only, named at INTRO's addresses.
//
// Pacing: none of the three waits for the raster. Their time is the code's own, so the port counts
// the cycles each loop takes (cy) and yields them where the screen changes in front of the player:
// after each flip of the two buffers and every 64 steps of a dissolve, as { cycles }, and with each
// turn of a loop that polls a key, as { cp, cycles } at the loop's head. A routine that yields only
// its cycles does not wait, but it is a generator, so GEN lists it with those that do.
(function (root) {
'use strict';
const PROGRAMS = root.SRPrograms = root.SRPrograms || {};
// each program's offsets: the loader's run, the sound's, the buffers', and the wipes' from INTRO's
const OFF = { title: [0, 0, 0, 0], intro: [0x47F6, 0x4E10, 0x47B4, 0], ending: [0x4801, 0x4E1B, 0x47BF, 0x0B] };
// The routines of the library that are generators
const GEN = `wait_key pause play_effect airlock_sound alarm_sound explosion_sound noise_burst rumble_sound
  distress_call morse_dot morse_dash morse_gap silence_18 silence_4 tone silence dissolve_in
  dissolve_in_matrix dissolve_out wipe_left wipe_right scroll_up scroll_down`.split(/\s+/);
PROGRAMS.library = { gen: GEN };

// The zero page the three share
const KEY = 0x3C, SHOWN = 0x3A, MATRIX = 0x12, DRAW = 0x1E, ROW = 0x20, COL = 0x21, LEFT = 0x22, RIGHT = 0x23;
// The interrupt's bytes the main program reads: the key, the frame count, and the effect's
// repeats, which play_effect polls for the end of a sound
const IRQ_BYTES = [KEY, 0x3D, 0x8C];

root.SRScreens = function (P, program) {
  const M = P.M, io = P.io, o = OFF[program];
  const R = (r, x) => Object.assign({}, r, x);
  const at = t => (t + (t >= 0x6800 ? o[3] : t >= 0x2623 ? o[2] : t >= 0x23C1 ? o[1] : o[0])) & 0xFFFF;
  const w16 = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
  let cy = 0;
  const take = (n = 0) => { const c = cy + n; cy = 0; return c; };
  P.spend = n => { cy += n; };
  P.take = take;
  P.IRQ_BYTES = IRQ_BYTES;
  P.addr = at;

  // ---- the loader
  P.io_in = function (r) { M[1] = (M[1] & 0xF8) | 6; cy += 23; return r || {}; };
  P.io_out = function (r) { M[1] = (M[1] & 0xF8) | 4; cy += 23; return r || {}; };
  // The file named in the bytes at p (a JSR's, after it): its load address, then the name and a
  // zero. It is loaded there whatever its own address, and asked for again until the KERNAL loads
  // it; the caller goes on at next, past the zero. $30/$31 are kept in two operands meanwhile.
  P.load_inline = function (p) {
    M[at(0x20C4)] = M[0x30]; M[at(0x20C8)] = M[0x31];
    M[at(0x20B8)] = M[p]; M[at(0x20BA)] = M[(p + 1) & 0xFFFF];
    let y = 1;
    do y = (y + 1) & 255; while (M[(p + y) & 0xFFFF]);
    const name = (p + 2) & 0xFFFF;
    M[at(0x20AD)] = (y - 2) & 255; M[at(0x20AF)] = name & 255; M[at(0x20B1)] = name >> 8;
    P.io_in();
    let r;
    for (let tries = 0; ; tries++) {
      P.kernal.SETLFS({ a: 1, x: 8, y: 0 });
      P.kernal.SETNAM({ a: (y - 2) & 255, x: name & 255, y: name >> 8 });
      r = P.kernal.LOAD({ a: 0, x: M[at(0x20B8)], y: M[at(0x20BA)] });
      if (!r.c) break;
      if (tries) throw new Error('load_inline: the disk has no file at $' + p.toString(16));
    }
    P.io_out();
    M[0x30] = M[at(0x20C4)]; M[0x31] = M[at(0x20C8)];
    cy += 150 + 12 * y;
    return { a: M[0x31], x: r.x, y: r.y, next: (p + y + 1) & 0xFFFF };
  };

  // ---- keys
  P.clear_key = function (r) { M[KEY] = 0xFF; cy += 11; return R(r, { a: 0xFF }); };
  // A key from the interrupt, waited for with any key before it cleared, and cleared once read
  P.wait_key = function* (r) {
    P.clear_key();
    let a;
    for (;;) {
      yield { cp: at(0x20CF), cycles: take(8) };
      if ((a = P.irqByte(KEY)) !== 0xFF) break;
    }
    P.clear_key();
    return R(r, { a, n: a >> 7, z: a ? 0 : 1 });
  };
  // About 0.86 seconds, ended by a key, which stays: a count of 255, 254 ... 1 turns of 26 cycles
  P.pause = function* (r) {
    P.clear_key();
    for (let n = 0xFF; ;) {
      for (let i = n; i; i = (i - 1) & 255) {
        yield { cp: at(0x20E5), cycles: take(26) };
        if (P.irqByte(KEY) < 0xFF) return R(r, { a: n, n: n >> 7, z: n ? 0 : 1 });
      }
      n = (n - 1) & 255; cy += 12;
      if (!n) return R(r, { a: 0, n: 0, z: 1 });
    }
  };

  // ---- text, in the drawing buffer from FONT at $F200
  // X and Y come back from the two operands they were kept in, which a call inside (rub_out's)
  // has set to its own
  P.print_char = function (r) {
    M[at(0x210A)] = r.y & 255; M[at(0x2108)] = r.x & 255;
    P.print_char_body(r);
    cy += 40;
    return R(r, { x: M[at(0x2108)], y: M[at(0x210A)] });
  };
  P.print_char_body = function (r) {
    const a = r.a & 0x7F;
    if (a === 0x0D) return P.new_line(R(r, { a }));
    if (a === 0x08 || a === 0x7F) return P.rub_out(R(r, { a }));
    let y = r.y;
    if (((M[COL] - 1) & 255) >= M[RIGHT]) y = P.new_line(R(r, { a })).y;
    const g = 0xF200 + a * 8;
    M[at(0x2178)] = g & 255; M[at(0x2179)] = g >> 8;
    const x2 = (M[ROW] << 1) & 255, lo = M[at(0x278D) + x2], hi = M[at(0x278E) + x2] | M[DRAW];
    M[at(0x216A)] = lo; M[at(0x2171)] = hi;
    P.column_offset_of({ a: M[COL] });
    const s = M[0x34] + lo, cell = (s & 255) | (((M[0x35] + hi + (s >> 8)) & 255) << 8);
    M[at(0x217B)] = cell & 255; M[at(0x217C)] = cell >> 8;
    let v = 0;
    for (let x = 7; x >= 0; x--) { v = P.rd((g + x) & 0xFFFF); P.wr((cell + x) & 0xFFFF, v); }
    M[COL] = (M[COL] + 1) & 255;
    cy += 110 + 8 * 16;
    return { a: v, x: 0xFF, y };
  };
  // A space at the cursor and another a column back, the cursor left a column back
  P.rub_out = function (r) {
    let o = P.print_char({ a: 0xA0, x: r.x, y: r.y });
    M[COL] = (M[COL] - 2) & 255;
    o = P.print_char({ a: 0xA0, x: o.x, y: o.y });
    M[COL] = (M[COL] - 1) & 255;
    cy += 30;
    return { a: 0xA0, x: o.x, y: o.y };
  };
  // The next row at the window's left; past row 24, rows 1-24 of the drawing buffer up a row and
  // 64 bytes of the bottom row cleared
  P.new_line = function (r) {
    M[COL] = M[LEFT];
    const a = (M[ROW] + 1) & 255;
    cy += 20;
    if (a < 0x19) { M[ROW] = a; return R(r, { a }); }
    const d = M[DRAW];
    M[at(0x21C6)] = 0x40; M[at(0x21C7)] = d | 1; M[at(0x21CA)] = d; M[at(0x2208)] = 0;
    let fh = d | 1, th = d, cnt = 0, y = 0x1E, x = 0;
    const tl = M[at(0x21C9)];
    for (;;) {
      P.wr(((th << 8 | tl) + x) & 0xFFFF, P.rd(((fh << 8 | 0x40) + x) & 0xFFFF));
      cy += 20;
      cnt = (cnt - 1) & 255;
      if (!cnt && !--y) break;
      x = (x + 1) & 255;
      if (!x) { fh = (fh + 1) & 255; th = (th + 1) & 255; if (!th) break; }
    }
    M[at(0x21C7)] = fh; M[at(0x21CA)] = th; M[at(0x2208)] = cnt;
    let ch = 0x1E | d;
    M[at(0x21F5)] = 0; M[at(0x21F6)] = ch; cnt = 0x40; y = 1; x = 0;
    for (;;) {
      P.wr((ch << 8) + x, 0);
      cy += 17;
      cnt = (cnt - 1) & 255;
      if (!cnt && !--y) break;
      x = (x + 1) & 255;
      if (!x) { ch = (ch + 1) & 255; M[at(0x21F6)] = ch; if (!ch) break; }
    }
    M[at(0x2208)] = cnt;
    return { a: 0, x, y };
  };

  // ---- the interrupt: entered through $FFFE with all RAM in (irq), or through the KERNAL's entry
  // and $0314 (irq_body). It acknowledges the raster, takes a new or repeating key, counts the
  // frame and plays the sound.
  P.setup_irq = function () {
    P.io_in();
    io.vicWrite(0x12, 0x50);
    io.vicWrite(0x11, io.vicRead(0x11) & 0x7F);
    io.vicWrite(0x1A, 1);
    io.ciaWrite(0x0D, 0x7F);
    const ign = at(0x2264), irq = at(0x2265), body = at(0x226A);
    w16(0x0318, ign); w16(0xFFFA, ign); w16(0x0316, ign); w16(0xFFFC, ign);
    w16(0x0314, body); w16(0xFFFE, irq);
    M[KEY] = 0xFF;
    P.sound_init();
    P.io_out();
    cy += 120;
    return { a: 0x0F, x: irq & 255, y: irq >> 8 };
  };
  P.irq_body = function () {
    const port = M[1];
    P.io_in();
    io.vicWrite(0x19, io.vicRead(0x19) & 1);
    const k = P.scan_keys();
    if (k.c) M[KEY] = k.a & 0x7F;
    M[0x3D] = (M[0x3D] + 1) & 255;
    P.sound_frame();
    M[1] = port;
  };
  P.irq = P.irq_body;
  // The keyboard, read by the program itself: C set with a key's code in A when a key is new, or
  // has been held 30 frames and then each 6; the first key held, row 7 down to row 0 and bit 7
  // down to bit 0, with CTRL and the SHIFTs read first and masked out of their rows
  P.scan_keys = function () {
    io.ciaWrite(2, 0xFF); io.ciaWrite(3, 0);
    io.ciaWrite(0, 0x7F); M[at(0x233E)] = io.ciaRead(1) & 0x04;
    io.ciaWrite(0, 0xBF); M[at(0x233F)] = io.ciaRead(1) & 0x10;
    io.ciaWrite(0, 0xFD); M[at(0x2340)] = io.ciaRead(1) & 0x80;
    let a = 0x7F, x = 0, y;
    for (;;) {
      io.ciaWrite(0, a);
      y = io.ciaRead(1);
      if (y !== 0xFF) { y |= M[at(0x2336) + x]; if (y !== 0xFF) break; }
      x++;
      const c = a & 1; a = (a >> 1) | 0x80;
      if (!c) { M[at(0x2333)] = y; io.ciaWrite(2, 0); return { a, x, y: 0, c: 0 }; }
    }
    x <<= 3;
    for (let v = y; v & 0x80; v = (v << 1) & 255) x++;
    io.ciaWrite(2, 0);
    if (x !== M[at(0x2333)]) {
      M[at(0x2333)] = x; M[at(0x2334)] = 0x1E; M[at(0x2335)] = 6;
    } else if (M[at(0x2334)]) {
      const d = M[at(0x2334)]--; return { a: d, x, y: 0, c: 0 };
    } else {
      M[at(0x2335)] = (M[at(0x2335)] - 1) & 255;
      if (M[at(0x2335)]) return { a: 0, x, y: 0, c: 0 };
      M[at(0x2335)] = 6;
    }
    a = M[at(0x233E)] ? 0xFF : 0x1F;
    const shift = !M[at(0x2340)] || !M[at(0x233F)];
    a &= M[(at(shift ? 0x2381 : 0x2341) + x) & 0xFFFF];
    return { a, x, y: M[at(0x2340)] ? M[at(0x233F)] : 0, c: 1 };
  };

  // ---- sound: effects 0-4 on voice 1 ($80-$8C), and between them the engine's drone
  P.sound_init = function (r) {
    M[0x8B] = 0; M[0x8C] = 0; M[0x70] = 0xFF; M[0x71] = 0;
    for (const s of [0, 1, 7, 8, 0x0E, 0x0F]) io.sidWrite(s, 0);
    io.sidWrite(0x17, 0); io.sidWrite(0x18, 0x0F);
    cy += 50;
    return R(r, { a: 0x0F, x: 0xFF });
  };
  const FX = [[0x80, 0x24E6], [0x81, 0x24EB], [0x82, 0x24F0], [0x83, 0x24F5], [0x86, 0x24FA], [0x87, 0x24FF], [0x88, 0x2504],
    [0x89, 0x2509], [0x8A, 0x250E], [0x8C, 0x2513]];
  P.start_effect = function (r) {
    const y = r.a & 255;
    cy += 10;
    if (y >= 5) return R(r, { c: 1 });
    for (const [z, t] of FX) M[z] = M[at(t) + y];
    M[0x8B] = 0;
    cy += 90;
    return R(r, { a: 0, y, c: 0 });
  };
  const drone = function () {
    if (M[0x74] !== M[0x72] || M[0x75] !== M[0x73]) {
      const s = M[0x74] + 2; M[0x74] = s & 255; if (s > 255) M[0x75] = (M[0x75] + 1) & 255;
    }
    if (M[0x8B]) return;
    if (!M[0x8C]) { M[0x8C] = 0xFF; M[0x88] = 0; }
    io.sidWrite(4, 8); io.sidWrite(4, 0);
    if (!((M[0x74] | M[0x75]) & M[0x70] & M[0x71])) return;
    io.sidWrite(0, M[0x74]); io.sidWrite(1, M[0x75]); io.sidWrite(5, 0); io.sidWrite(6, M[0x76] & 0xF0);
    M[0x88] ^= 0x81; io.sidWrite(4, M[0x88]);
  };
  P.sound_frame = function () {
    if (!M[0x8B]) {
      const n = M[0x8C];
      if (!n || n & 0x80) return drone();
      M[0x84] = M[0x80]; M[0x85] = M[0x81]; M[0x8B] = M[0x89]; M[0x8C] = (n - 1) & 255;
      io.sidWrite(4, 8); io.sidWrite(4, 0); io.sidWrite(5, M[0x86]); io.sidWrite(6, M[0x87]);
      io.sidWrite(3, 8); io.sidWrite(4, M[0x88]);
    }
    const s = M[0x84] + M[0x82];
    M[0x84] = s & 255; io.sidWrite(0, M[0x84] & M[0x70]);
    M[0x85] = (M[0x85] + M[0x83] + (s >> 8)) & 255; io.sidWrite(1, M[0x85] & M[0x70]);
    if (M[0x8B] === M[0x8A]) io.sidWrite(4, M[0x88] & 0xFE);
    M[0x8B] = (M[0x8B] - 1) & 255;
    if (!M[0x8B]) { io.sidWrite(0, 0); io.sidWrite(1, 0); }
    return drone();
  };
  // Effect A, waited for until its last note or a key; none when a key is waiting already
  P.play_effect = function* (r) {
    const k = P.irqByte(KEY);
    cy += 10;
    if (k !== 0xFF) return R(r, { x: k });
    const e = P.start_effect(r);
    let a;
    for (;;) {
      yield { cp: at(0x253E), cycles: take(13) };
      if ((a = P.irqByte(0x8C)) & 0x80) break;
      if ((a = P.irqByte(KEY)) !== 0xFF) break;
    }
    return { a, x: 0xFF, y: e.y };
  };
  P.airlock_sound = function* (r) { return yield* P.play_effect(R(r, { a: 3 })); };
  P.alarm_sound = function* (r) { return yield* P.play_effect(R(r, { a: 1 })); };
  P.rumble_sound = function* (r) { return yield* P.play_effect(R(r, { a: 2 })); };
  P.noise_burst = function* (r) { return yield* P.play_effect(R(r, { a: 0 })); };
  // a burst, two silences, and two bursts: the JSR to noise_burst runs on into it
  P.explosion_sound = function* (r) {
    let x = yield* P.noise_burst(r);
    x = yield* P.silence_18(x);
    x = yield* P.silence_18(x);
    x = yield* P.noise_burst(x);
    return yield* P.noise_burst(x);
  };
  // Effect 4 with its length A and its frequency set: a tone at $3864, or silence
  const note = function* (r, f) {
    M[at(0x250D)] = r.a & 255; M[at(0x24EA)] = f & 255; M[at(0x24EF)] = f >> 8;
    cy += 20;
    return yield* P.play_effect(R(r, { a: 4, x: f & 255, y: f >> 8 }));
  };
  P.tone = function* (r) { return yield* note(r, 0x3864); };
  P.silence = function* (r) { return yield* note(r, 0); };
  P.morse_dot = function* (r) { const x = yield* P.tone(R(r, { a: 2 })); return yield* P.silence(R(x, { a: 2 })); };
  P.morse_dash = function* (r) { const x = yield* P.tone(R(r, { a: 6 })); return yield* P.silence(R(x, { a: 2 })); };
  P.morse_gap = function* (r) { return yield* P.silence(R(r, { a: 6 })); };
  P.silence_18 = function* (r) { return yield* P.silence(R(r, { a: 0x12 })); };
  P.silence_4 = function* (r) { return yield* P.silence(R(r, { a: 4 })); };
  // The distress call: each of morse_text's characters looked up in morse_symbols and its
  // element's routine called through a patched JSR, until the zero or a key
  P.distress_call = function* (r) {
    const MORSE = {};
    for (const [t, f] of [[0x25ED, 'morse_dot'], [0x25F6, 'morse_dash'], [0x25FF, 'morse_gap'], [0x2603, 'silence_18'], [0x2607, 'silence_4']]) MORSE[at(t)] = f;
    let p = at(0x2587), x = r;
    for (;;) {
      M[at(0x2554)] = p & 255; M[at(0x2555)] = p >> 8;
      const ch = M[p];
      if (!ch) return R(x, { a: 0 });
      let i = 0, y = 0;
      while (M[(at(0x25DE) + i) & 0xFFFF] !== ch) { i = (i + 1) & 255; y = (y + 2) & 255; if (!y) break; }
      const lo = M[(at(0x25E3) + y) & 0xFFFF], hi = M[(at(0x25E4) + y) & 0xFFFF], f = MORSE[lo | hi << 8];
      M[at(0x2573)] = lo; M[at(0x2574)] = hi;
      if (!f) throw new Error('distress_call: no element at $' + (lo | hi << 8).toString(16));
      cy += 40 + 10 * i;
      x = yield* P[f](R(x, { a: lo, x: hi, y }));
      p = (p + 1) & 0xFFFF;
      M[at(0x2554)] = p & 255; M[at(0x2555)] = p >> 8;
      if (P.irqByte(KEY) !== 0xFF) return R(P.clear_key(x), {});
    }
  };

  // ---- the two picture buffers, $4000 and $C000: the bitmap, its screen matrix at +$2000 and its
  // colours at +$2400. $3A is the shown one's page, $12 its matrix's, $1E the drawing one's.
  // Page by page from page f to page t: n pages, through the operands at op (the source's high
  // byte; the destination's is 3 on)
  const pages = (f, t, n, op) => {
    const fl = M[op - 1], tl = M[op + 2];
    let v = 0;
    for (; n; n--) {
      M[op] = f; M[op + 3] = t;
      for (let x = 0; x < 256; x++) { v = P.rd(((f << 8 | fl) + x) & 0xFFFF); P.wr(((t << 8 | tl) + x) & 0xFFFF, v); }
      f = (f + 1) & 255; t = (t + 1) & 255;
      cy += 256 * 14 + 18;
    }
    M[op] = f; M[op + 3] = t;
    return { a: v, x: 0, y: 0 };
  };
  // The screen matrices and colours, 8 pages from page A ORed with $12, to the other buffer
  P.copy_matrix = function (r) { const f = (r.a | M[MATRIX]) & 255; cy += 20; return pages(f, f ^ 0x80, 8, at(0x2636)); };
  P.copy_shown = function () { const a = M[SHOWN]; cy += 20; return pages(a, a ^ 0x80, 0x28, at(0x2677)); };
  P.copy_4000_to_c000 = function () { cy += 20; return pages(0x40, 0xC0, 0x28, at(0x2677)); };
  P.copy_c000_to_4000 = function () { cy += 20; return pages(0xC0, 0x40, 0x28, at(0x2677)); };
  P.copy_shown_colours = function () { P.copy_shown(); return P.colours_to_ram(); };
  P.column_offset_of = function (r) {
    const a = r.a & 255;
    M[0x34] = (a << 3) & 255; M[0x35] = (a >> 5) & 1;
    cy += 22;
    return R(r, { a: M[0x35], c: (a >> 4) & 1 });
  };
  // Character row A's offset in the drawing buffer, low byte in A and high in Y; X kept in an
  // operand and put back
  P.row_address = function (r) {
    M[at(0x26A2)] = r.x & 255;
    const x2 = (r.a << 1) & 255;
    cy += 30;
    return { a: M[at(0x278D) + x2], x: M[at(0x26A2)], y: M[at(0x278E) + x2] | M[DRAW], c: (r.a >> 7) & 1 };
  };
  P.white_colours = function () {
    P.io_in();
    let pg = 0xD8;
    const lo = M[at(0x26B5)];
    for (let n = 4; n; n--) {
      M[at(0x26B6)] = pg;
      for (let x = 0; x < 256; x++) P.wr(((pg << 8 | lo) + x) & 0xFFFF, 1);
      pg = (pg + 1) & 255;
      cy += 256 * 10 + 13;
    }
    M[at(0x26B6)] = pg;
    P.io_out();
    return { a: 1, x: 0, y: 0 };
  };
  // A block of block_width by block_height bytes from ($10) into the drawing buffer's screen matrix
  // ($C000's when $1E is 0), at column X of row Y, the source stepping block_stride a row
  P.put_matrix_block = function (r) {
    const y2 = (r.y << 1) & 255;
    let s = r.x + M[at(0x27F1) + y2] + ((r.y >> 7) & 1);
    M[at(0x2730)] = s & 255;
    s = (M[DRAW] || 0xC0) + M[at(0x27F2) + y2] + (s >> 8);
    M[at(0x2731)] = s & 255;
    let c = s >> 8, x = M[0x15], y = 0, v = 0;
    do {
      const d = M[at(0x2730)] | M[at(0x2731)] << 8, src = M[0x10] | M[0x11] << 8;
      y = (M[0x14] - 1) & 255;
      do { v = P.rd((src + y) & 0xFFFF); P.wr((d + y) & 0xFFFF, v); y = (y - 1) & 255; cy += 16; } while (!(y & 0x80));
      s = M[0x10] + M[0x66] + c;
      if (s > 255) M[0x11] = (M[0x11] + 1) & 255;
      M[0x10] = s & 255; c = 0;
      s = M[at(0x2730)] + 0x28;
      if (s > 255) M[at(0x2731)] = (M[at(0x2731)] + 1) & 255;
      M[at(0x2730)] = s & 255;
      x = (x - 1) & 255;
      cy += 40;
    } while (x);
    return { a: M[at(0x2730)], x: 0, y };
  };
  // The pixel-line table at $EB00 and $EC00: each line's offset in a bitmap
  P.build_line_table = function () {
    let lo = 0, hi = 0, x = 0;
    do {
      for (let n = 8; n; n--) {
        P.wr(0xEB00 + x, lo); P.wr(0xEC00 + x, hi);
        lo = (lo + 1) & 255; if (!lo) hi = (hi + 1) & 255;
        x = (x + 1) & 255;
        cy += 32;
      }
      const s = lo + 0x38;
      lo = s & 255; hi = (hi + 1 + (s >> 8)) & 255;
      cy += 30;
    } while (x < 0xC8);
    M[at(0x278B)] = lo; M[at(0x278C)] = hi;
    return { a: hi, x, y: 0 };
  };
  P.bitmap_mode = function (r) {
    const port = M[1];
    P.io_in();
    io.vicWrite(0x11, io.vicRead(0x11) | 0x20);
    io.vicWrite(0x16, io.vicRead(0x16) | 0x10);
    io.vicWrite(0x18, 0x80);
    io.vicWrite(0x21, 0);
    M[1] = port;
    cy += 60;
    return r || {};
  };
  // The buffer at page A shown (CIA 2's bank: 3 for $C000, 1 for $4000), the other one to draw in
  const show = function (r, a) {
    const c = a >= 0xC0 ? 1 : 0, port = M[1];
    P.io_in();
    io.cia2Write(2, io.cia2Read(2) | 3);
    io.cia2Write(0, c ? io.cia2Read(0) & 0xFC : (io.cia2Read(0) & 0xFC) | 2);
    M[1] = port;
    M[SHOWN] = a; M[MATRIX] = (a | 0x20) & 255; M[DRAW] = a ^ 0x80;
    cy += 70;
    return R(r, { a: a ^ 0x80, c });
  };
  P.show_c000 = r => show(r, 0xC0);
  P.show_4000 = r => show(r, 0x40);
  P.show_drawn = r => show(r, M[DRAW]);
  P.show_4000_colours = function (r) { P.show_4000(r); return P.colours_to_ram(); };
  P.show_drawn_colours = function (r) { P.show_drawn(r); return P.colours_to_ram(); };
  // A buffer's bitmap cleared, 32 pages from page A
  const clear = function (a) {
    const lo = M[at(0x28C2)];
    for (let n = 0x20; n; n--) {
      M[at(0x28C3)] = a;
      for (let x = 0; x < 256; x++) P.wr(((a << 8 | lo) + x) & 0xFFFF, 0);
      a = (a + 1) & 255;
      cy += 256 * 10 + 13;
    }
    M[at(0x28C3)] = a;
    return { a: 0, x: 0, y: 0 };
  };
  P.clear_drawing = () => clear(M[DRAW]);
  P.clear_4000 = () => clear(0x40);
  // The 15-bit shift register of the dissolves: the high seven bits in $1D, the low eight in Y;
  // each step's pixel pair is byte (bits 0-4 of $1D) × 256 + Y of the bitmap, pair (bits 5-6)
  const lfsr = function (y) {
    const c = M[0x1D] & 1;
    M[0x1D] >>= 1;
    const f = y & 1;
    y = (y >> 1) | (c << 7);
    if (f) M[0x1D] ^= 0x60;
    return y;
  };
  P.dissolve_in = function* (r) { P.colours_to_ram(); return yield* P.dissolve_in_matrix(r); };
  // The drawing buffer's picture brought onto the shown one a pixel pair at a time, its screen
  // matrix copied over first ($E000's, whichever is shown)
  P.dissolve_in_matrix = function* () {
    P.copy_matrix({ a: M[DRAW] });
    const from = M[DRAW], to = from ^ 0x80;
    M[0x19] = from; M[0x31] = from; M[0x1B] = to; M[0x33] = to; M[0x30] = 0; M[0x32] = 0;
    P.wr(to << 8, P.rd(from << 8));
    M[0x1D] = 0x7F;
    let y = 0xFF, x = 0, n = 0;
    cy += 60;
    do {
      const a = M[0x1D];
      M[0x33] = (a & 0x1F) | M[0x1B]; M[0x31] = (a & 0x1F) | M[0x19];
      x = (a >> 5) & 3;
      const p = P.rd(((M[0x31] << 8 | M[0x30]) + y) & 0xFFFF) & M[at(0x292D) + x];
      M[at(0x2914)] = p;
      const d = ((M[0x33] << 8 | M[0x32]) + y) & 0xFFFF;
      P.wr(d, (P.rd(d) & M[at(0x2931) + x]) | p);
      cy += y & 1 ? 87 : 83;
      y = lfsr(y);
      if (!(++n & 63)) yield { cycles: take() };
    } while (M[0x1D] !== 0x7F || y !== 0xFF);
    return { a: 0x7F, x, y };
  };
  // The shown picture faded to black the same way
  P.dissolve_out = function* () {
    const to = M[DRAW] ^ 0x80;
    M[0x1B] = to; M[0x33] = to; M[0x32] = 0;
    P.wr(to << 8, 0);
    M[0x1D] = 0x7F;
    let y = 0xFF, x = 0, n = 0;
    cy += 40;
    do {
      const a = M[0x1D];
      M[0x33] = (a & 0x1F) | M[0x1B];
      x = (a >> 5) & 3;
      const d = ((M[0x33] << 8 | M[0x32]) + y) & 0xFFFF;
      P.wr(d, P.rd(d) & M[at(0x2975) + x]);
      cy += y & 1 ? 64 : 60;
      y = lfsr(y);
      if (!(++n & 63)) yield { cycles: take() };
    } while (M[0x1D] !== 0x7F || y !== 0xFF);
    return { a: 0x7F, x, y };
  };
  // The picture packed at page A into the drawing buffer: n < $80 then a byte, n of it; $80 + n
  // then n bytes ($80 alone, 256); a zero then the border's colour, which ends it
  P.unpack_picture = function (r) {
    M[0x31] = r.a & 255; M[0x30] = 0; M[0x32] = 0; M[0x33] = M[DRAW];
    let x = r.x & 255;
    for (;;) {
      const src = M[0x30] | M[0x31] << 8, dst = M[0x32] | M[0x33] << 8;
      let b = P.rd(src), y = 0, step;
      if (!b) {
        const v = P.rd((src + 1) & 0xFFFF);
        P.wr((dst + 1) & 0xFFFF, v);
        P.io_in(); io.vicWrite(0x20, v); P.io_out();
        cy += 40;
        return { a: v, x, y: 1 };
      }
      if (!(b & 0x80)) {
        const v = P.rd((src + 1) & 0xFFFF);
        x = b;
        do { P.wr((dst + y) & 0xFFFF, v); y = (y + 1) & 255; x = (x - 1) & 255; cy += 13; } while (x);
        step = 2;
      } else {
        x = b & 0x7F;
        const s = src + 1; M[0x30] = s & 255; M[0x31] = (s >> 8) & 255;
        do { P.wr((dst + y) & 0xFFFF, P.rd((s + y) & 0xFFFF)); y = (y + 1) & 255; x = (x - 1) & 255; cy += 18; } while (x);
        step = y;
      }
      const s = (M[0x30] | M[0x31] << 8) + step;
      M[0x30] = s & 255; M[0x31] = (s >> 8) & 255;
      const d = dst + y;
      M[0x32] = d & 255; M[0x33] = (d >> 8) & 255;
      cy += 50;
    }
  };
  // The shown buffer's colours (its +$2400) to the colour RAM, by way of $0C00
  P.colours_to_ram = function () {
    const f = (M[DRAW] ^ 0x80) | 0x24;
    pages(f, 0x0C, 4, at(0x29F3));
    P.io_in();
    pages(0x0C, 0xD8, 4, at(0x2A0A));
    const r = P.io_out({});
    cy += 40;
    return R(r, { a: M[0x0FFF], x: 0, y: 0 });
  };

  // ---- INTRO's and WON's wipes and scrolls of the window's rows, a step at a time, each shown
  // Rows $36 to $38 - 1 of the drawing buffer a cell along within the window, the cell left behind
  // cleared: to the left (d -8: the source a cell right) or to the right
  const wipeStep = function (r, right) {
    let row = M[0x36], x = r.x & 255, y = 0;
    M[0x37] = row;
    do {
      const o = P.row_address({ a: row, x });
      let s = o.a + M[0x34] + o.c;
      M[0x32] = s & 255;
      s = o.y + M[0x35] + (s >> 8);
      M[0x33] = s & 255;
      const dst = M[0x32] | M[0x33] << 8, src = right ? (dst - 8) & 0xFFFF : (dst + 8 + (s >> 8)) & 0xFFFF;
      M[0x30] = src & 255; M[0x31] = src >> 8;
      x = (M[RIGHT] - M[LEFT]) & 255;
      do {
        const a = M[0x30] | M[0x31] << 8, b = M[0x32] | M[0x33] << 8;
        for (y = 7; y >= 0; y--) P.wr((b + y) & 0xFFFF, P.rd((a + y) & 0xFFFF));
        M[0x32] = M[0x30]; M[0x33] = M[0x31];
        const n = right ? a - 8 : a + 8;
        M[0x30] = n & 255; M[0x31] = (n >> 8) & 255;
        x = (x - 1) & 255;
        cy += 165;
      } while (x);
      const b = M[0x32] | M[0x33] << 8;
      for (y = 7; y >= 0; y--) P.wr((b + y) & 0xFFFF, 0);
      row = M[0x37] = (M[0x37] + 1) & 255;
      cy += 180;
    } while (row < M[0x38]);
    return { a: row, x: 0, y: 0xFF };
  };
  P.wipe_left_step = r => wipeStep(r || {}, false);
  P.wipe_right_step = r => wipeStep(r || {}, true);
  // Rows X to Y wiped off: half the window's width of rounds, each a step shown in one buffer, two
  // in the other, which then shows, and one more
  const wipe = function* (r, right) {
    M[0x36] = r.x & 255; M[0x38] = (r.y + 1) & 255;
    P.column_offset_of({ a: M[right ? RIGHT : LEFT] });
    let a = ((M[RIGHT] - M[LEFT]) & 255) >> 1, x = r;
    const step = right ? P.wipe_right_step : P.wipe_left_step;
    cy += 30;
    do {
      x = step(x); P.show_drawn({}); yield { cycles: take() };
      x = step(x); x = step(x); P.show_drawn({}); yield { cycles: take() };
      x = step(x);
      a = (a - 1) & 255;
      cy += 20;
    } while (!(a & 0x80));
    return { a, x: x.x, y: x.y };
  };
  P.wipe_left = function* (r) { return yield* wipe(r, false); };
  P.wipe_right = function* (r) { return yield* wipe(r, true); };
  // Pixel line X of the window cleared in the drawing buffer
  P.clear_line = function (r) {
    const x = r.x & 255;
    let s = M[0xEB00 + x] + M[0x34];
    M[0x32] = s & 255;
    s = M[0xEC00 + x] + M[0x35] + (s >> 8);
    M[0x33] = (s | M[DRAW]) & 255;
    let n = M[0x39], y = 0, c = s >> 8;
    do {
      P.wr(((M[0x33] << 8 | M[0x32]) + y) & 0xFFFF, 0);
      s = y + 8 + c; y = s & 255; c = 0;
      if (s > 255) M[0x33] = (M[0x33] + 1) & 255;
      n = (n - 1) & 255;
      cy += 22;
    } while (n);
    return { a: y, x: 0, y };
  };
  // The window's pixel lines from line t (by the table at $EB00 + d: two lines on or two back) to
  // line `to`, a cell across at a time, for a scroll's step
  const lines = function (x, d, c) {
    let s = M[0xEB00 + x] + M[0x34] + c;
    M[0x32] = s & 255;
    s = M[0xEC00 + x] + M[0x35] + (s >> 8);
    M[0x33] = (s | M[DRAW]) & 255;
    s = M[(0xEB00 + d + x) & 0xFFFF] + M[0x34] + (s >> 8);
    M[0x30] = s & 255;
    s = M[(0xEC00 + d + x) & 0xFFFF] + M[0x35] + (s >> 8);
    M[0x31] = (s | M[DRAW]) & 255;
    c = s >> 8;
    let n = M[0x39], y = 0;
    do {
      P.wr(((M[0x33] << 8 | M[0x32]) + y) & 0xFFFF, P.rd(((M[0x31] << 8 | M[0x30]) + y) & 0xFFFF));
      s = y + 8 + c; y = s & 255; c = 0;
      if (s > 255) { M[0x33] = (M[0x33] + 1) & 255; M[0x31] = (M[0x31] + 1) & 255; }
      n = (n - 1) & 255;
      cy += 28;
    } while (n);
    cy += 60;
  };
  P.scroll_up_step = function () {
    let x = M[0x36], c = 0;
    M[0x37] = x;
    do {
      lines(x, 2, c);
      x = M[0x37] = (M[0x37] + 1) & 255;
      c = x >= M[0x38] ? 1 : 0;
    } while (x !== M[0x38]);
    P.clear_line({ x });
    return P.clear_line({ x: (M[0x37] - 1) & 255 });
  };
  P.scroll_down_step = function () {
    let x = M[0x36];
    M[0x38] = x;
    do {
      lines(x, -2, 0);
      x = M[0x38] = (M[0x38] - 1) & 255;
    } while (x !== M[0x37]);
    P.clear_line({ x });
    return P.clear_line({ x: (M[0x38] + 1) & 255 });
  };
  // Character rows X to Y scrolled away up, or down, two pixel lines a step: half the lines'
  // count of rounds, each a step shown with its colours and a step to catch the other buffer up
  const scroll = function* (r, down) {
    const a0 = (r.x << 3) & 255, b0 = ((((r.y + 1) & 255) << 3) - 1) & 255;
    if (down) { M[0x37] = a0; M[0x36] = b0; } else { M[0x36] = a0; M[0x38] = b0; }
    P.column_offset_of({ a: M[LEFT] });
    M[0x39] = (((M[RIGHT] - M[LEFT]) & 255) + 1) & 255;
    let a = (((down ? M[0x36] - M[0x37] : M[0x38] - M[0x36]) + 1) & 255) >> 1, x = {};
    const step = down ? P.scroll_down_step : P.scroll_up_step;
    cy += 60;
    do {
      step(); P.show_drawn_colours({}); yield { cycles: take() };
      x = step();
      a = (a - 1) & 255;
      cy += 20;
    } while (!(a & 0x80));
    return { a, x: x.x, y: x.y };
  };
  P.scroll_up = function* (r) { return yield* scroll(r, false); };
  P.scroll_down = function* (r) { return yield* scroll(r, true); };

  // ---- print_inline, the intro's ($7884) and the ending's ($743E): the text after the JSR (t its
  // first byte) printed at the cursor through a load whose operand (op) holds the address of each
  // byte in turn, and of the zero last; the caller goes on after the zero, A its address's low byte
  P.print_inline_at = function (op, t, r) {
    let p = t, x = r.x, y = r.y;
    for (;;) {
      M[op] = p & 255; M[op + 1] = p >> 8;
      const a = M[p];
      cy += 20;
      if (!a) break;
      const o = P.print_char({ a, x, y });
      x = o.x; y = o.y;
      p = (p + 1) & 0xFFFF;
    }
    return { a: p & 255, x, y };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
