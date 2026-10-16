// TITLE ($2000-$2F7B), the lift-off: BOOT's loader jumps to its start. It loads SPACE and ROGUE
// (the backdrops, packed), SHIP (the shapes, at $6800) and CREDITS, then shows the Sunracer lifting
// off over and over until a key, and loads INTRO. A frame is drawn in the hidden buffer over a
// backdrop unpacked again each time, then the buffers flip; key_waiting ($2BE7) follows each
// frame, each stage and each pause of the credits, and is where the port yields its checkpoint.
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
const PROGRAMS = root.SRPrograms = root.SRPrograms || {};
PROGRAMS.title = {
  gen: `title_start title_loop title_showing stage_engine stage_rise stage_legs stage_climb show_credits
    frame_first`.split(/\s+/),
  start: 'title_start', checkpoints: [0x2BE7], passAt: 0x2BE7, exits: [0x6800],
};
G.title = function (P) {
  root.SRScreens(P, 'title');
  const M = P.M;
  const KEY = 0x3C, DRAW = 0x1E, LEFT_ = 0x4D;
  const w16 = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
  const add16 = (a, d) => w16(a, (M[a] | M[a + 1] << 8) + d);
  P.CHECKPOINTS.push(0x2BE7, P.addr(0x20E5));

  P.title_start = function* () {
    P.setup_irq();
    P.build_line_table();
    for (const p of [0x2009, 0x2014, 0x201F, 0x2029]) P.load_inline(p);
    P.clear_4000();
    P.bitmap_mode();
    P.show_4000_colours();
    P.white_colours();
    return yield* P.title_loop();
  };
  // Z clear when a key is waiting
  P.key_waiting = function () { const a = P.irqByte(KEY); P.spend(13); return { a, z: a === 0xFF ? 1 : 0, c: a >= 0xFF ? 1 : 0 }; };
  // key_waiting, called after each frame: true when a key is waiting
  const key = function* () { yield { cp: 0x2BE7, cycles: P.take() }; return !P.key_waiting().z; };
  P.title_loop = function* () {
    P.clear_key();
    for (;;) if (yield* P.title_showing()) return P.title_exit();
  };
  // One showing, true when a key ended it: everything back at its starting line, the engine's note
  // at zero and full level; the first frame dissolved in, then the stages and the credits
  P.title_showing = function* () {
    w16(0x42, 0x48); w16(0x40, 0x78); w16(0x44, 0x88); w16(0x46, 0x90); w16(0x48, 0x60); w16(0x4A, 0x90);
    M[0x4C] = 0; M[0x74] = 0; M[0x75] = 0; M[0x72] = 0; M[0x73] = 0; M[0x76] = 0xFF;
    P.spend(90);
    yield* P.frame_first();
    if (yield* key()) return true;
    for (const stage of ['stage_engine', 'stage_rise', 'stage_legs', 'stage_climb', 'show_credits']) {
      yield* P[stage]();
      if (yield* key()) return true;
    }
    return false;
  };
  // The engine's note one step higher, to $FF at most; its level two steps lower, to 0 at least
  const louder = () => { if (M[0x73] !== 0xFF) M[0x73]++; P.spend(10); };
  const quieter = () => { for (let i = 0; i < 2; i++) if (M[0x76]) M[0x76]--; P.spend(16); };
  // n frames: before each, move(); then the frame, and a key ends it
  const frames = function* (n, move, frame) {
    M[LEFT_] = n;
    do {
      move();
      P[frame]();
      if (yield* key()) return true;
      M[LEFT_] = (M[LEFT_] - 1) & 255;
      P.spend(10);
    } while (M[LEFT_]);
    return false;
  };
  // Six frames standing; then the engine on and twelve frames of dust, the note rising
  P.stage_engine = function* () {
    if (yield* frames(6, () => {}, 'frame_still')) return;
    M[0x71] = 0xFF;
    yield* frames(0x0C, louder, 'frame_dust');
  };
  // 24 frames, the ship and the legs up a line each
  P.stage_rise = function* () {
    yield* frames(0x18, () => { louder(); quieter(); add16(0x48, -1); add16(0x46, -1); }, 'frame_dust');
  };
  // 12 frames, the ship up two lines and the legs four
  P.stage_legs = function* () {
    yield* frames(0x0C, () => { louder(); quieter(); add16(0x48, -2); add16(0x46, -4); }, 'frame_dust');
  };
  // Over ROGUE: the ship up two lines a frame, the scenery down one for 12 frames, two for 12 and
  // three for 48
  P.stage_climb = function* () {
    for (const [n, d] of [[0x0C, 1], [0x0C, 2], [0x30, 3]]) {
      const move = () => { louder(); quieter(); add16(0x48, -2); for (const a of [0x42, 0x40, 0x44, 0x4A]) add16(a, d); };
      if (yield* frames(n, move, 'frame_logo')) return;
    }
  };
  // CREDITS dissolved in and left up for 24 pauses, faded out, then 6 pauses of black
  P.show_credits = function* () {
    M[0x71] = 0;
    P.unpack_picture({ a: 0x30 });
    yield* P.dissolve_in_matrix();
    if (yield* key()) return;
    for (M[LEFT_] = 0x18; M[LEFT_]; M[LEFT_] = (M[LEFT_] - 1) & 255) {
      yield* P.pause({ a: 0 });
      if (yield* key()) return;
    }
    yield* P.dissolve_out();
    if (yield* key()) return;
    for (M[LEFT_] = 6; M[LEFT_]; M[LEFT_] = (M[LEFT_] - 1) & 255) {
      yield* P.pause({ a: 0 });
      if (yield* key()) return;
    }
  };

  // ---- the frames, over SPACE ($B700) or ROGUE ($AC00)
  P.frame_first = function* () {
    P.unpack_picture({ a: 0xB7 });
    P.draw_scenery(); P.draw_legs(); P.draw_ship();
    return yield* P.dissolve_in_matrix();
  };
  P.frame_still = function () {
    P.unpack_picture({ a: 0xB7 });
    P.draw_scenery(); P.draw_legs();
    return P.show_drawn(P.draw_ship());
  };
  P.frame_dust = function () {
    P.unpack_picture({ a: 0xB7 });
    P.draw_scenery(); P.draw_legs(); P.draw_dust_small(); P.draw_ship();
    return P.show_drawn(P.draw_dust_big());
  };
  P.frame_logo = function () {
    P.unpack_picture({ a: 0xAC });
    P.draw_scenery(); P.draw_dust_small(); P.draw_ship();
    return P.show_drawn(P.draw_dust_big());
  };
  // A shape: its lines at data, its mask at mask, its colours at colours, w cells by h lines, in
  // mode (bit 7 through the mask, bit 6 with its colours), at column x and the line in ($zp)
  const shape = (data, mask, colours, w, h, mode, x, zp) => {
    w16(0x60, data); w16(0x62, mask); w16(0x10, colours);
    M[0x64] = w; M[0x67] = h; M[0x4E] = mode;
    P.spend(60);
    return P.draw_shape({ x, y: M[zp], a: M[zp + 1] });
  };
  P.draw_scenery = function () {
    M[0x60] = 0x00; M[0x61] = 0x68; M[0x62] = 0x70; M[0x63] = 0x70; M[0x10] = 0x80; M[0x11] = 0x6F;
    M[0x64] = 0x28; M[0x67] = 0x30; M[0x4E] = 0xC0;
    P.spend(60);
    P.draw_shape({ x: 0, y: M[0x42], a: M[0x43] });
    M[0x60] = 0xF0; M[0x61] = 0x77; M[0x10] = 0x70; M[0x11] = 0x84;
    M[0x64] = 0x28; M[0x67] = 0x50; M[0x4E] = 0x40;
    P.spend(40);
    return P.draw_shape({ x: 0, y: M[0x40], a: M[0x41] });
  };
  P.draw_legs = () => shape(0xA453, 0xA67B, 0xA67B, 0x17, 0x18, 0x80, 9, 0x46);
  P.draw_ship = () => shape(0x9320, 0x9C3B, 0x9B38, 0x25, 0x38, 0xC0, 1, 0x48);
  // The dust's frames: the count (0-7) stepped for the small cloud, the big one at the same count
  const dust = (order, frames, colours, w, x, zp) => {
    const y = M[order + M[0x4C]], f = M[frames + y] | M[frames + 1 + y] << 8;
    return shape(f, f, M[colours + y] | M[colours + 1 + y] << 8, w, 0x20, 0x80, x, zp);
  };
  P.draw_dust_small = function () {
    M[0x4C] = (M[0x4C] + 1) & 7;
    return dust(0x2ECD, 0x2ED5, 0x2EDB, 0x0A, 0x0F, 0x44);
  };
  P.draw_dust_big = () => dust(0x2F46, 0x2F4E, 0x2F54, 0x19, 0x08, 0x4A);
  // The shape in ($60), w ($64) bytes a line and h ($67) lines, at column X and line A × 256 + Y
  // of the drawing buffer: the lines above the screen skipped (its colours' rows with them), the
  // lines below line 200 and the rows below row 25 left out; its colours stamped on the screen
  // matrix when bit 6 of $4E is set, and drawn through the mask at ($62) when bit 7 is
  P.draw_shape = function (r) {
    M[0x4F] = r.x; M[0x50] = r.y; M[0x51] = r.a;
    P.column_offset_of({ a: r.x });
    M[0x65] = M[0x64]; M[0x68] = M[0x67];
    M[0x15] = ((M[0x67] + 7) & 255) >> 3;
    const back = { a: M[0x67], x: r.x, y: r.y };
    P.spend(50);
    while (M[0x51] & 0x80) {
      const a = M[0x51];
      M[0x50] = (M[0x50] + 1) & 255; if (!M[0x50]) M[0x51] = (M[0x51] + 1) & 255;
      M[0x68] = (M[0x68] - 1) & 255;
      P.spend(40);
      if (!M[0x68]) return { a, x: back.x, y: back.y };
      add16(0x60, M[0x64]); add16(0x62, M[0x64]);
      if (!(M[0x50] & 7)) { M[0x15] = (M[0x15] - 1) & 255; add16(0x10, M[0x64]); P.spend(25); }
    }
    if (M[0x51]) return { a: M[0x51], x: back.x, y: back.y };
    let a = (0xC8 - M[0x50]) & 255;
    if (!a || M[0x50] > 0xC8) return { a, x: back.x, y: back.y };
    if (a < M[0x68]) M[0x68] = a;
    M[0x52] = M[0x50] >> 3;
    a = 0x19 - M[0x52];
    if (a <= 0) M[0x15] = 0;
    else if (a < M[0x15]) M[0x15] = a;
    P.spend(60);
    if (M[0x4E] & 0x40) {
      M[0x66] = M[0x64]; M[0x14] = M[0x65];
      if (M[0x15]) P.put_matrix_block({ x: M[0x4F], y: M[0x52] });
    }
    return M[0x4E] & 0x80 ? P.masked_lines() : P.plain_lines();
  };
  // A line's address in the drawing buffer at the shape's column: the line table's, plus the
  // column's offset, with the buffer's page ORed in; c the carry out of the high byte's add
  const lineAt = x => {
    const s = M[0xEB00 + x] + M[0x34], h = M[0xEC00 + x] + M[0x35] + (s >> 8);
    return { lo: s & 255, hi: (h | M[DRAW]) & 255, c: h >> 8 };
  };
  P.plain_lines = function () {
    let x, y = 0;
    do {
      x = M[0x50];
      if (!M[0x51] && x < 0xC8) {
        const l = lineAt(x);
        M[0x2AE3] = l.lo; M[0x2AE4] = l.hi;
        const src = M[0x60] | M[0x61] << 8;
        let c = l.c;
        x = 0; y = 0;
        do {
          P.wr(((M[0x2AE4] << 8 | M[0x2AE3]) + x) & 0xFFFF, P.rd((src + y) & 0xFFFF));
          const s = x + 8 + c; x = s & 255;
          if (s > 255) M[0x2AE4] = (M[0x2AE4] + 1) & 255;
          y = (y + 1) & 255; c = 0;
          P.spend(27);
        } while (y < M[0x65]);
        P.spend(40);
      }
      add16(0x60, M[0x64]);
      M[0x50] = (M[0x50] + 1) & 255; if (!M[0x50]) M[0x51] = (M[0x51] + 1) & 255;
      M[0x68] = (M[0x68] - 1) & 255;
      P.spend(30);
    } while (M[0x68]);
    return { a: M[0x60], x, y };
  };
  P.masked_lines = function () {
    let x, y = 0;
    do {
      x = M[0x50];
      if (!M[0x51] && x < 0xC8) {
        const l = lineAt(x);
        M[0x2B35] = M[0x2B3A] = l.lo; M[0x2B36] = M[0x2B3B] = l.hi;
        const src = M[0x60] | M[0x61] << 8, mask = M[0x62] | M[0x63] << 8;
        let c = l.c;
        x = 0; y = 0;
        do {
          const rd = ((M[0x2B36] << 8 | M[0x2B35]) + x) & 0xFFFF, wr = ((M[0x2B3B] << 8 | M[0x2B3A]) + x) & 0xFFFF;
          P.wr(wr, ((P.rd((mask + y) & 0xFFFF) ^ 0xFF) & P.rd(rd)) | P.rd((src + y) & 0xFFFF));
          const s = x + 8 + c; x = s & 255;
          if (s > 255) { M[0x2B36] = (M[0x2B36] + 1) & 255; M[0x2B3B] = (M[0x2B3B] + 1) & 255; }
          y = (y + 1) & 255; c = 0;
          P.spend(38);
        } while (y < M[0x65]);
        P.spend(50);
      }
      add16(0x62, M[0x64]); add16(0x60, M[0x64]);
      M[0x50] = (M[0x50] + 1) & 255; if (!M[0x50]) M[0x51] = (M[0x51] + 1) & 255;
      M[0x68] = (M[0x68] - 1) & 255;
      P.spend(40);
    } while (M[0x68]);
    return { a: M[0x60], x, y };
  };
  // A key: the engine off, CREDITS shown at once while INTRO loads over SHIP, and on to INTRO
  P.title_exit = function () {
    M[0x71] = 0;
    P.unpack_picture({ a: 0x30 });
    P.show_drawn({});
    P.load_inline(0x2F69);
    throw new P.Goto(0x6800);
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
