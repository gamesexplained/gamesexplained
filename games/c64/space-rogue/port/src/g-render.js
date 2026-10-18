// The 3D view: MAIN's draw list ($3E2C-$3FF3), objects and the camera ($6400-$6812), models,
// clipping and the polygon fill ($7C21-$8637), the 2D objects and the span drawer ($8810-$8FC8),
// and SEG0's clears of the view ($B788-$BC62).
//
// A frame is drawn from the farthest object in the draw list to the nearest. A model's points
// are placed in the camera's frame in log form at $FB00 (9 bytes each), projected to $FC20 (4
// bytes each: x and y, 16 bits), and each polygon is clipped against the wedge of the view (the
// planes y = 4z and y = -4z) and then against the window, and filled row by row with spans of
// the colour's two patterns, one for even rows and one for odd. The span drawer's table
// addresses are its own operands, which set_window points at the window: they are game memory,
// and the port reads them there, as it reads and writes the branch offsets and opcodes the
// fill patches.
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
G.render = function (P) {
  const M = P.M;
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const at = (zp, i) => M[(ptr(zp) + i) & 0xFFFF];
  const put = (zp, i, v) => { M[(ptr(zp) + i) & 0xFFFF] = v & 255; };
  const w16 = a => M[a] | M[a + 1] << 8;
  const nine = i => M[0x0846 + i];                                  // 9 i, its low byte
  const point = i => 0xFB00 + nine(i) + (M[0x086E + i] << 8);        // a point's 9 bytes
  // a byte of 16-bit arithmetic: the pair at a/a+1 plus d
  const add16 = (a, d) => { const v = (w16(a) + d) & 0xFFFF; M[a] = v & 255; M[a + 1] = v >> 8; };
  // the bitmap and screen writes: straight to RAM when $01 has no I/O or ROM in, else through
  // the processor's map
  const writer = () => ((M[1] & 3) ? P.wr : (a, v) => { M[a] = v; });
  const reader = () => ((M[1] & 3) ? P.rd : a => M[a]);

  // ---- the draw list
  // Every object in use tested against the view; those that are in it and large go in the list
  // (14 at most), the small are drawn at once. Then the list is drawn farthest first, each
  // object followed by the docking test.
  P.build_draw_list = function* (r) {
    for (let y = 0x13; y >= 0; y--) M[0x0621 + y] = 0;
    M[0x0D3D] = 0;
    M[0x5C] = 0x13;
    do {
      const y = M[0x5C];
      if (M[0x0649 + y]) {
        P.slot_pos_ptr({ y });
        const x = (M[0x060D + y] << 1) & 255;
        M[0x0D3E] = M[0x0A63 + x]; M[0x0D3F] = M[0x0A64 + x];
        if (P.in_view().c) {
          M[0x0D3D] = (M[0x0D3D] + 1) & 255;
          if (M[0x0D3D] === 0x0E) break;
        }
      }
      M[0x5C] = (M[0x5C] - 1) & 255;
    } while (!(M[0x5C] & 0x80));
    const n = (M[0x0D3D] - 1) & 255;
    if (n & 0x80) return {};
    M[0x3EB7] = n; M[0x3E82] = n;
    do {
      M[0x80] = 0; M[0x81] = 0;
      for (let x = M[0x3E82]; ; x = (x - 1) & 255) {
        const y = M[0x0D7E + x];
        if (!(y & 0x80) && y >= M[0x81] && (y !== M[0x81] || M[0x80] < M[0x0D70 + x])) {
          M[0x80] = M[0x0D70 + x]; M[0x81] = y; M[0x0D3D] = x;
        }
        if (((x - 1) & 0x80)) break;
      }
      P.draw_object({ c: 1 });
      const d = yield* P.dock_check();
      if (d.unwind) return d;
      M[0x0D7E + M[0x0D3D]] = 0xFF;
      M[0x3EB7] = (M[0x3EB7] - 1) & 255;
    } while (!(M[0x3EB7] & 0x80));
    return {};
  };
  // Whether the object at ($74) is in the view of the camera at ($58), oriented by ($5A): its
  // distance along the view's axis within its radius ($0D3E) of the front, and its y and x
  // within the edges. Its view coordinates go to $FF05 + 9 n for the list's entry n, its
  // distance and slot to the list, its size on screen by screen_size; one under 11 is drawn at
  // once (draw_object with the carry clear) and left out. The carry set: keep it in the list.
  P.in_view = function (r) {
    const no = { c: 0 };
    setp(0x78, 0x089F); M[0x76] = M[0x58]; M[0x77] = M[0x59];
    P.vec_sub_to_log();
    setp(0x74, ptr(0x5A) + 0x12); setp(0x76, 0x089F);
    P.vec_dot();
    // $5F/$60 less a/b is below 0
    const below = (a, b) => ((M[0x60] - b - (M[0x5F] < a ? 1 : 0)) & 0x80) !== 0;
    if (!(M[0x61] & 0x80) && !below(M[0x0D3E], M[0x0D3F])) return no;
    const y9 = nine(M[0x0D3D]);
    M[0x94] = y9;
    M[0xFF0B + y9] = M[0x5F]; M[0xFF0C + y9] = M[0x60]; M[0xFF0D + y9] = M[0x61];
    const edge = (a, b, c, d) => {          // the radius plus the edge's slope, less its offset
      const s = M[0x0D3E] + M[a];
      M[0x62] = s & 255; M[0x63] = (M[0x0D3F] + M[a + 1] + (s >> 8)) & 255;
      P.log_add_mag();
      const t = M[0x5F] - M[c];
      M[0x65] = t & 255; M[0x66] = (M[0x60] - M[d] - (t < 0 ? 1 : 0)) & 255;
    };
    edge(0x0D6E, 0, 0x0D6A, 0x0D6B);
    setp(0x74, ptr(0x74) - 9);
    P.vec_dot();
    if (!below(M[0x65], M[0x66])) return no;
    M[0xFF08 + y9] = M[0x5F]; M[0xFF09 + y9] = M[0x60]; M[0xFF0A + y9] = M[0x61];
    M[0x5F] = M[0xFF0B + y9]; M[0x60] = M[0xFF0C + y9]; M[0x61] = M[0xFF0D + y9];
    edge(0x0D6C, 0, 0x0D68, 0x0D69);
    M[0x74] = M[0x5A]; M[0x75] = M[0x5B];
    P.vec_dot();
    if (!below(M[0x65], M[0x66])) return no;
    M[0xFF05 + y9] = M[0x5F]; M[0xFF06 + y9] = M[0x60]; M[0xFF07 + y9] = M[0x61];
    setp(0x74, 0x089F);
    P.vec_length();
    const x = M[0x0D3D];
    M[0x0D7E + x] = M[0x60];
    if (M[0x60] & 0x80) return no;
    const slot = M[0x5C];
    M[0x0621 + slot] = M[0x60];
    M[0x0D70 + x] = M[0x5F];
    M[0x0D9A + x] = slot;
    const s = M[0x5F] - M[0x0D3E];
    M[0x5F] = s & 255; M[0x60] = (M[0x60] - M[0x0D3F] - (s < 0 ? 1 : 0)) & 255;
    const a = P.screen_size().a;
    M[0x0D8C + M[0x0D3D]] = a;
    if (a >= 0x0B) return { c: 1 };
    P.draw_object({ c: 0 });
    return no;
  };

  // After each object of the list is drawn: when it is the one the player touched ($0837), a
  // face that points at the player ($7062) and a dockable type at a speed below 21 docks; any
  // other touch is a collision. Either takes the place of the rest of the draw list (the
  // game's code drops build_draw_list's return), so unwind tells the list to stop.
  P.dock_check = function* (r) {
    if (M[0x5C] !== M[0x0837]) return { a: M[0x5C] };
    const f = P.facing_face();
    if (f.n) return f;
    if (f.z && (M[0x08D5 + M[0x5D]] & 1) && P.speed_of({ y: 0 }).a < 0x15) return Object.assign({ unwind: true }, yield* P.dock());
    return Object.assign({ unwind: true }, yield* P.collide({ x: 0, y: M[0x0837] }));
  };

  // ---- objects
  // Draws list entry $0D3D. With the carry set, an object in one of the first seven slots
  // (ships) gets its orientation in the camera's frame at $0D40 and its position at $0D5B;
  // others only their position, linear, at $0D5B, with $0DCC as their orientation. Then its
  // type's draw routine runs with ($74) its view coordinates, ($76) its draw data, $5F/$60 its
  // scale and $4D its size; a 2D one is projected first, its colour set from the draw data, and
  // left out when behind. With the carry clear, a model is drawn as a dot.
  P.draw_object = function (r) {
    const c = r && r.c;
    let x = M[0x0D3D], y = M[0x0D9A + x];
    M[0x5C] = y;
    M[0x5D] = M[0x060D + y];
    if (c && y < 7) {
      P.slot_pos_ptr({ y });
      M[0x76] = M[0x58]; M[0x77] = M[0x59]; setp(0x78, 0x089F);
      P.vec_sub_to_log();
      y = M[0x5C];
      setp(0x74, 0x089F);
      setp(0x76, 0x044B + M[0x083C + y]);
      M[0x7A] = M[0x76]; M[0x7B] = M[0x77];
      setp(0x78, 0x0D5B);
      P.mat_times_vec();
      setp(0x74, 0x0D5B);
      P.vec_log_to_lin();
      M[0x74] = M[0x7A]; M[0x75] = M[0x7B];
      M[0x76] = M[0x5A]; M[0x77] = M[0x5B];
      setp(0x78, 0x0D40);
      P.mat_times_mat();
      setp(0x78, 0x0D40);
    } else {
      P.slot_pos_ptr({ y });
      M[0x76] = M[0x58]; M[0x77] = M[0x59]; setp(0x78, 0x0D5B);
      P.vec_sub_lin();
      setp(0x78, 0x0DCC);
    }
    x = M[0x0D3D];
    setp(0x74, 0xFF05 + nine(x));
    y = (M[0x5D] << 1) & 255;
    M[0x76] = M[0x0999 + y]; M[0x77] = M[0x099A + y];
    M[0x5F] = M[0x0A63 + y]; M[0x60] = M[0x0A64 + y];
    M[0x94] = M[0x08F8 + y]; M[0x95] = M[0x08F9 + y];
    M[0x4D] = M[0x0D8C + x];
    let flat = !(M[0x08D5 + M[0x5D]] & 0x80);
    if (!c && !flat) {
      M[0x4D] = ((M[0x4D] >> 1) + 1) & 255;
      setp(0x76, 0x6518);
      setp(0x94, 0x8834);
      flat = true;
    }
    if (flat) {
      if (!(at(0x74, 8) & 0x80)) return {};
      P.set_colour({ x: at(0x76, 0) });
      P.project();
    }
    return P.draw_at(ptr(0x94));
  };
  // The draw routines a type's entry at $08F8 names, and the models load_model puts in memory:
  // each begins by pointing $7A at its 36-byte header and jumping to draw_model
  const DRAW = { 0x692A: 'model_sunracer', 0x6813: 'model_missile', 0x8834: 'draw_disc', 0x88E4: 'draw_ring',
    0x89CF: 'draw_burst', 0x8A08: 'draw_annulus', 0x8A29: 'draw_ragged', 0x8B1B: 'draw_sparks', 0x8BEF: 'draw_flicker' };
  P.draw_at = function (a) {
    if (DRAW[a]) return P[DRAW[a]]();
    // a loaded model's prologue: LDA #lo, STA $7A, LDA #hi, STA $7B, JMP draw_model
    if (M[a] === 0xA9 && M[a + 2] === 0x85 && M[a + 3] === 0x7A && M[a + 4] === 0xA9 && M[a + 6] === 0x85 &&
        M[a + 7] === 0x7B && M[a + 8] === 0x4C && M[a + 9] === 0x61 && M[a + 10] === 0x7C) {
      M[0x7A] = M[a + 1]; M[0x7B] = M[a + 5];
      return P.draw_model();
    }
    throw new Error('draw_object: no draw routine at $' + a.toString(16));
  };
  P.model_missile = () => { setp(0x7A, 0x681E); return P.draw_model(); };
  P.model_sunracer = () => { setp(0x7A, 0x6935); return P.draw_model(); };

  // ($74) at slot Y's position, $065D + 9 Y
  P.slot_pos_ptr = function (r) {
    setp(0x74, 0x065D + nine(r.y));
    return { a: M[0x75], x: r.x, y: r.y };
  };
  // ($74) at model point A, $FB00 + 9 A
  P.point_ptr = function (r) {
    setp(0x74, 0xFB00 + nine(r.a));
    return { a: M[0x75], x: r.a, y: r.y };
  };
  // Slot Y's speed: the length of its velocity times 16, as a whole number
  P.speed_of = function (r) {
    setp(0x74, 0x0545 + nine(r.y));
    setp(0x78, 0x0896);
    P.vec_lin_to_log();
    setp(0x74, 0x0896);
    P.vec_length();
    M[0x60] = (M[0x60] + 4) & 255;
    P.log_to_lin();
    return { a: M[0x60] };
  };

  // ---- the camera
  // An object's size on screen from its log depth in $5F/$60: the antilog of the scale less it
  P.screen_size = function (r) {
    const s = M[0x0D64] - M[0x5F];
    M[0x5F] = s & 255;
    M[0x60] = (M[0x0D65] - M[0x60] - (s < 0 ? 1 : 0)) & 255;
    P.log_to_lin();
    return { a: M[0x61] ? 0xFF : M[0x60], x: M[0x61] };
  };
  // The projection from the zoom in $5F/$60 and the window: the scales of x and y (the log of
  // the width, and of the height less 0.19), the slope of the window's top edge and the edges'
  // log(sqrt(1 + slope^2)) for in_view
  P.set_projection = function (r) {
    M[0x0D68] = M[0x5F]; M[0x0D69] = M[0x60];
    M[0x60] = M[0x41]; M[0x61] = 0;
    const u1 = P.uint16_to_log(r);
    M[0x84] = M[0x5F]; M[0x85] = M[0x60];
    M[0x60] = M[0x42]; M[0x61] = 0;
    const u2 = P.uint16_to_log(u1);
    M[0x86] = M[0x5F]; M[0x87] = M[0x60];
    let s = M[0x0D68] + M[0x84];
    M[0x0D64] = s & 255; M[0x0D65] = (M[0x0D69] + M[0x85] + (s >> 8)) & 255;
    s = M[0x0D64] + 0xCF;
    M[0x0D66] = s & 255; M[0x0D67] = (M[0x0D65] + 0xFF + (s >> 8)) & 255;
    s = M[0x0D66] - M[0x86];
    M[0x0D6A] = s & 255; M[0x0D6B] = (M[0x0D67] - M[0x87] - (s < 0 ? 1 : 0)) & 255;
    M[0x5F] = M[0x0D68]; M[0x60] = M[0x0D69];
    const h1 = P.log_hypot1(u2);
    M[0x0D6C] = M[0x5F]; M[0x0D6D] = M[0x60];
    M[0x5F] = M[0x0D6A]; M[0x60] = M[0x0D6B];
    const h2 = P.log_hypot1(h1);
    M[0x0D6E] = M[0x5F]; M[0x0D6F] = M[0x60];
    return { a: M[0x0D6F], x: h2.x, y: h2.y };
  };
  // log2 sqrt(1 + v v) for v in $5F/$60
  P.log_hypot1 = function (r) {
    const w = (w16(0x5F) << 1) & 0xFFFF;
    M[0x5F] = w & 255; M[0x60] = w >> 8;
    M[0x62] = 0; M[0x63] = 0;
    const o = P.log_add_mag(r);
    const a = (M[0x60] << 1) & 255;
    M[0x5F] = (M[0x5F] >> 1) | ((M[0x60] & 1) << 7);
    M[0x60] = (M[0x60] >> 1) | (M[0x60] & 0x80);
    return { a, x: o.x, y: o.y };
  };
  // The point in log form at ($74) on the screen: x and y each over twice z, scaled; when the
  // larger whole part is above 13, both are brought down by the excess. $51/$52 and $53/$54.
  P.project = function (r) {
    M[0x62] = at(0x74, 6);
    M[0x63] = (at(0x74, 7) + 1) & 255;
    let s = at(0x74, 0) - M[0x62];
    M[0x5F] = s & 255;
    M[0x60] = (at(0x74, 1) - M[0x63] - (s < 0 ? 1 : 0)) & 255;
    M[0x67] = at(0x74, 2);
    s = M[0x5F] + M[0x0D64];
    M[0x65] = s & 255; M[0x66] = (M[0x60] + M[0x0D65] + (s >> 8)) & 255;
    s = at(0x74, 3) - M[0x62];
    M[0x5F] = s & 255;
    M[0x60] = (at(0x74, 4) - M[0x63] - (s < 0 ? 1 : 0)) & 255;
    M[0x61] = at(0x74, 5);
    s = M[0x5F] + M[0x0D66];
    M[0x5F] = s & 255; M[0x60] = (M[0x60] + M[0x0D67] + (s >> 8)) & 255;
    let a = M[0x60];
    if ((a - M[0x66]) & 0x80) a = M[0x66];
    if (!(a & 0x80) && !((a - 13) & 0x80)) {
      const e = (a - 13) & 255;
      M[0x80] = e;
      M[0x60] = (M[0x60] - e) & 255;
      M[0x66] = (M[0x66] - e) & 255;
    }
    P.log_to_lin_signed();
    s = M[0x60] + M[0x57];
    M[0x53] = s & 255; M[0x54] = (M[0x61] + (s >> 8)) & 255;
    M[0x5F] = M[0x65]; M[0x60] = M[0x66]; M[0x61] = M[0x67];
    P.log_to_lin_signed();
    s = M[0x60] + M[0x56];
    M[0x51] = s & 255; M[0x52] = (M[0x61] + (s >> 8)) & 255;
    return {};
  };
  // The outside views' camera, from the main loop. Chase: the camera is pulled toward a point
  // behind the ship, by its distance's log less 7, halved. Cinematic: put back ahead of the
  // ship once more than 100 away. Both then aim along the offset, with the ship's up ($0DB1).
  P.update_camera = function (r) {
    const v = M[0x0D3C];
    if (!v) return {};
    if (v === 1) {
      P.camera_offset();
      M[0x61] = 0xFF;
      M[0x62] = 0x95; M[0x63] = 0x03; M[0x64] = 0;
      P.log_add();
      M[0x5F] = (M[0x5F] >> 1) | ((M[0x60] & 1) << 7);
      M[0x60] = (M[0x60] >> 1) | (M[0x60] & 0x80);
      M[0x60] = (M[0x60] - 7) & 255;
      setp(0x78, 0x0896);
      P.vec_scale_signed();
      setp(0x74, 0x0896);
      P.vec_log_to_lin();
      setp(0x78, 0x668B); setp(0x76, 0x668B);
      P.vec_add_lin();
    } else {
      P.camera_offset();
      if (!((M[0x60] - 0x06 - (M[0x5F] < 0xA4 ? 1 : 0)) & 0x80)) P.place_camera();
    }
    setp(0x74, 0x006B); setp(0x78, 0x66A6);
    P.copy9();
    setp(0x74, 0x0DB1); setp(0x78, 0x669D);
    P.copy9();
    setp(0x78, 0x6694);
    return P.mat_orthonormal();
  };
  // The view mode in $0D3C: the cockpit's camera is the player's own position and orientation;
  // the outside views have their own, put ahead of the ship. Then the view's name is shown.
  P.set_view = function* (r) {
    if (!M[0x0D3C]) {
      M[0x0649] = 0;
      setp(0x58, 0x065D); setp(0x5A, 0x044B);
    } else {
      M[0x0649] = 1;
      setp(0x5A, 0x6694); setp(0x58, 0x668B);
      P.place_camera();
    }
    const y = (M[0x0D3C] << 1) & 255;
    return yield* P.print_message({ x: M[0x665E + y], a: M[0x665F + y], y });
  };
  // The outside camera 80 ahead of the ship along its velocity, and 10/256 to the side
  P.place_camera = function (r) {
    setp(0x74, 0x0545); setp(0x78, 0x668B);
    P.vec_lin_to_log();
    setp(0x74, 0x668B);
    P.vec_normalise();
    M[0x5F] = 0x52; M[0x60] = 0x06;
    P.vec_scale();
    P.vec_log_to_lin();
    add16(0x668C, 0x0A);
    setp(0x76, 0x065D);
    return P.vec_add_lin();
  };
  // The camera's offset from the ship in log form at $6B, its length in $5F/$60
  P.camera_offset = function (r) {
    setp(0x74, 0x668B); setp(0x76, 0x065D); setp(0x78, 0x006B);
    P.vec_sub_to_log();
    setp(0x74, 0x006B);
    return P.vec_length();
  };

  // ---- models
  // A model's header to $9A-$BD; on its first use its axis vectors are scaled and its
  // reference points and normals made; then its points are placed and projected, the faces'
  // signs found, and its polygons drawn. ($74) is its position, ($78) its orientation, and
  // ($76), when its high byte is not 0, colours that replace the model's own.
  P.draw_model = function (r) {
    M[0x98] = M[0x74]; M[0x99] = M[0x75]; M[0x96] = M[0x78]; M[0x97] = M[0x79];
    for (let y = 0x23; y >= 0; y--) M[0x9A + y] = at(0x7A, y);
    if (M[0x77]) { M[0xB5] = M[0x77]; M[0xB4] = M[0x76]; }
    if (!M[0x9A]) { put(0x7A, 0, 1); P.prepare_model(); }
    P.place_points();
    P.face_signs();
    return P.draw_polygons();
  };
  // A model's first use: its axis vectors' logs gain the type's scale less $06A4; its points
  // are placed in its own frame (the identity at $0DA8, from the origin $0DAB), its reference
  // points made linear and negated, and each normal the cross product of two of the edges of
  // its first polygon
  P.prepare_model = function (r) {
    let s = M[0x5F] - 0xA4;
    M[0x5F] = s & 255; M[0x60] = (M[0x60] - 0x06 - (s < 0 ? 1 : 0)) & 255;
    let x = (M[0x9F] * 3) & 255, y = 0;
    do {
      y = (y + 1) & 255;
      if (!((at(0xA4, y) - 0xF6) & 0x80)) {
        s = at(0xA4, y - 1) + M[0x5F]; put(0xA4, (y - 1) & 255, s);
        put(0xA4, y, at(0xA4, y) + M[0x60] + (s >> 8));
      }
      y = (y + 2) & 255;
      x = (x - 1) & 255;
    } while (x);
    const keep = [M[0x96], M[0x97], M[0x98], M[0x99]];
    setp(0x96, 0x0DA8); setp(0x98, 0x0DAB);
    P.place_points();
    [M[0x96], M[0x97], M[0x98], M[0x99]] = keep;
    if (!M[0x9C]) return {};
    M[0x95] = (M[0x9C] - 1) & 255;
    do {
      const k = M[0x95];
      P.point_ptr({ a: at(0xA0, k) });
      setp(0x78, ptr(0xA8) + nine(k));
      P.vec_log_to_lin();
      M[0x74] = M[0x78]; M[0x75] = M[0x79];
      P.vec_neg_lin();
      M[0x95] = (M[0x95] - 1) & 255;
    } while (!(M[0x95] & 0x80));
    M[0x94] = 0; M[0x95] = 0;
    do {
      let k = M[0x95];
      P.point_ptr({ a: at(0xB6, k) });
      setp(0x76, 0xFB00 + nine(at(0xB6, (k + 1) & 255)));
      setp(0x78, 0x089F);
      P.vec_sub_log();
      k = M[0x95];
      P.point_ptr({ a: at(0xB6, (k + 2) & 255) });
      setp(0x76, 0xFB00 + nine(at(0xB6, (k + 1) & 255)));
      setp(0x78, 0x08A8);
      P.vec_sub_log();
      setp(0x74, 0x089F); setp(0x76, 0x08A8);
      setp(0x78, ptr(0xAA) + nine(M[0x94]));
      P.vec_cross();
      M[0x95] = (M[0x95] + at(0xB8, M[0x94])) & 255;
      M[0x94] = (M[0x94] + 1) & 255;
    } while (M[0x94] !== M[0x9D]);
    return {};
  };
  // The model's points: its axis vectors turned by the orientation at ($96) into $FA52; each
  // point is its parent (or the position at ($98)) plus or minus one of them; those in front
  // are projected to $FC20
  P.place_points = function (r) {
    M[0x95] = (M[0x9F] - 1) & 255;
    do {
      const y = M[0x95];
      setp(0x74, ptr(0xA4) + nine(y));
      M[0x76] = M[0x96]; M[0x77] = M[0x97];
      setp(0x78, 0xFA52 + nine(y));
      P.vec_times_rows();
      M[0x95] = (M[0x95] - 1) & 255;
    } while (!(M[0x95] & 0x80));
    M[0x95] = 0;
    let y = 0;
    for (;;) {
      setp(0x78, 0xFB00 + nine(y));
      const p = at(0xA6, y);
      if (p & 0x80) { M[0x74] = M[0x98]; M[0x75] = M[0x99]; } else P.point_ptr({ a: p });
      const a = at(0xA2, y);
      if (a & 0x80) {
        setp(0x76, 0xFA52 + nine((((a ^ 0xFF) + 1) & 0x7F)));
        P.vec_sub_log();
      } else {
        setp(0x76, 0xFA52 + nine(a));
        P.vec_add_log();
      }
      P.point_ptr({ a: M[0x95] });
      if (at(0x74, 8) & 0x80) {
        P.project();
        const x = (M[0x95] << 2) & 255;
        M[0xFC20 + x] = M[0x51]; M[0xFC21 + x] = M[0x52]; M[0xFC22 + x] = M[0x53]; M[0xFC23 + x] = M[0x54];
      }
      M[0x95] = (M[0x95] + 1) & 255;
      y = M[0x95];
      if (y === M[0x9B]) return {};
    }
  };
  // Each reference point's offset from the viewer ($0D5B) into $FA00; each normal's dot product
  // with its reference point's offset: the sign, at $FA36, says which way the face looks
  P.face_signs = function (r) {
    M[0x94] = M[0x9C];
    if (!M[0x94]) return {};
    M[0x74] = M[0xA8]; M[0x75] = M[0xA9];
    setp(0x76, 0x0D5B); setp(0x78, 0xFA00);
    do {
      P.vec_sub_to_log();
      setp(0x74, ptr(0x74) + 9);
      setp(0x78, ptr(0x78) + 9);
      M[0x94] = (M[0x94] - 1) & 255;
    } while (M[0x94]);
    M[0x95] = (M[0x9D] - 1) & 255;
    do {
      const y = M[0x95];
      setp(0x74, ptr(0xAA) + nine(y));
      setp(0x76, 0xFA00 + nine(at(0xAC, y)));
      P.vec_dot();
      M[0xFA36 + M[0x95]] = M[0x61];
      M[0x95] = (M[0x95] - 1) & 255;
    } while (!(M[0x95] & 0x80));
    return {};
  };
  // The polygons in three passes for a painter's order: those behind their plane's face, those
  // on no plane, then those in front. A plane number below 0 is the other side of a plane.
  P.draw_polygons = function (r) {
    const sign = a => M[0xFA36 + ((a & 0x80) ? (((a ^ 0xFF) + 1) & 255) : a)] & 0x80;
    const pass = test => {
      M[0x95] = 0;
      let y = 0;
      do {
        const a = at(0xAE, y);
        if (test(a)) P.draw_polygon({ y });
        M[0x95] = (M[0x95] + 1) & 255;
        y = M[0x95];
      } while (y !== M[0x9E]);
    };
    pass(a => a !== 0 && ((a & 0x80) ? !sign(a) : !!sign(a)));
    pass(a => a === 0);
    pass(a => a !== 0 && ((a & 0x80) ? !!sign(a) : !sign(a)));
    return { y: M[0x9E] };
  };
  // Polygon Y in its front colour or its back one by its normal's sign ($FF: not drawn); its
  // vertex numbers are found from the counts before it, and it is clipped and filled
  P.draw_polygon = function (r) {
    let y = r.y;
    M[0x80] = y;
    let a = (M[0xFA36 + at(0xB0, y)] & 0x80) ? at(0xB2, y) : at(0xB4, y);
    if (a === 0xFF) return {};
    P.set_colour({ x: a });
    y = M[0x80];
    M[0x55] = at(0xB8, y);
    a = 0; let c = 0;
    for (;;) {
      y = (y - 1) & 255;
      if (y & 0x80) break;
      const s = a + at(0xB8, y) + c;
      a = s & 255; c = s >> 8;
      if (!a) break;
    }
    const s = a + M[0xB6] + c;
    M[0x74] = s & 255; M[0x75] = (M[0xB7] + (s >> 8)) & 255;
    return clipPolygon();
  };

  // ---- clipping to the view's wedge
  // The polygon's vertex numbers to $FD40; one with no vertex in front of the viewer is
  // dropped, one with all in front filled as it is; otherwise it is clipped against y = 4z and
  // y = -4z, the new vertices ($1C on) made and projected, and it is filled.
  function clipPolygon() {
    M[0x85] = 0x1C;
    for (let y = (M[0x55] - 1) & 255; ; y = (y - 1) & 255) { M[0xFD40 + y] = at(0x74, y); if ((y - 1) & 0x80) break; }
    const n = P.count_in_front();
    if (n === 'none') return {};
    if (n === 'some') {
      M[0x86] = 0xFF;
      if (!clipEdges()) return {};
      M[0x86] = 0;
      if (!clipEdges()) return {};
      M[0x84] = 0;
      do {
        const x = M[0xFD50 + M[0x84]];
        if (x >= 0x1C) {
          M[0x81] = x;
          setp(0x74, point(x));
          P.project();
          const i = (M[0x81] << 2) & 255;
          M[0xFC20 + i] = M[0x51]; M[0xFC21 + i] = M[0x52]; M[0xFC22 + i] = M[0x53]; M[0xFC23 + i] = M[0x54];
        }
        M[0x84] = (M[0x84] + 1) & 255;
      } while (M[0x84] < M[0x55]);
    }
    return toScreen();
  }
  P.clip_polygon = r => clipPolygon();
  // How many of the polygon's vertices have z below 0 (in front), counted in $60
  P.count_in_front = function () {
    M[0x84] = (M[0x55] - 1) & 255;
    M[0x60] = 0;
    do {
      const v = M[0xFD40 + M[0x84]];
      if (M[0xFB08 + nine(v)] & 0x80) M[0x60] = (M[0x60] + 1) & 255;
      M[0x84] = (M[0x84] - 1) & 255;
    } while (!(M[0x84] & 0x80));
    return !M[0x60] ? 'none' : M[0x60] === M[0x55] ? 'all' : 'some';
  };
  // The vertices' screen coordinates to $FD00 in order, and the fill
  function toScreen() {
    M[0x84] = (M[0x55] - 1) & 255;
    do {
      const y = (M[0xFD40 + M[0x84]] << 2) & 255, x = (M[0x84] << 2) & 255;
      for (let k = 0; k < 4; k++) M[0xFD00 + x + k] = M[0xFC20 + y + k];
      M[0x84] = (M[0x84] - 1) & 255;
    } while (!(M[0x84] & 0x80));
    return P.fill_polygon();
  }
  // One plane ($86 negative: y = 4z, else y = -4z): the vertices inside kept, an edge that
  // crosses it given a new vertex there; the list built at $FD50 and copied back to $FD40.
  // False when nothing is left.
  function clipEdges() {
    M[0x84] = M[0x55];
    M[0x55] = 0;
    P.plane_side({ y: 0 });
    do {
      M[0x80] = M[0x81]; M[0x82] = M[0x83];
      P.plane_side({ y: (M[0x84] - 1) & 255 });
      if (!M[0x83]) {
        if (M[0x82]) P.new_vertex({ x: M[0x80], y: M[0x81] });
      } else {
        if (!M[0x82]) P.new_vertex({ x: M[0x81], y: M[0x80] });
        M[0xFD50 + M[0x55]] = M[0x81];
        M[0x55] = (M[0x55] + 1) & 255;
      }
      M[0x84] = (M[0x84] - 1) & 255;
    } while (M[0x84]);
    if (!M[0x55]) return false;
    for (let x = (M[0x55] - 1) & 255; ; x = (x - 1) & 255) { M[0xFD40 + x] = M[0xFD50 + x]; if ((x - 1) & 0x80) break; }
    return true;
  }
  P.clip_edges = r => (clipEdges() ? {} : { dropped: true });
  // The crossing of the edge from point X to point Y with the plane: point $85, the next new one
  P.new_vertex = function (r) {
    setp(0x74, point(r.x)); setp(0x76, point(r.y));
    if (M[0x86] & 0x80) P.intersect_pos(); else P.intersect_neg();
    setp(0x74, point(M[0x85]));
    for (let y = 8; y >= 0; y--) put(0x74, y, M[0x6B + y]);
    M[0xFD50 + M[0x55]] = M[0x85];
    M[0x85] = (M[0x85] + 1) & 255;
    M[0x55] = (M[0x55] + 1) & 255;
    return {};
  };
  // Which side of the plane vertex Y of $FD40 is on, in $83 (1 inside), its number in $81: y's
  // log against z's plus 2, signs taken into account; the test's branch, BPL or BMI, patched in
  P.plane_side = function (r) {
    const neg = !!(M[0x86] & 0x80);
    M[0x61] = neg ? 0 : 0xFF;
    M[0x8146] = neg ? 0x30 : 0x10;
    M[0x83] = 1;
    const x = M[0xFD40 + r.y];
    M[0x81] = x;
    setp(0x74, point(x));
    M[0x5F] = at(0x74, 6);
    M[0x60] = (at(0x74, 7) + 2) & 255;
    M[0x61] ^= at(0x74, 8);
    let a = M[0x61];
    if (!((a ^ at(0x74, 5)) & 0x80)) {
      const hi = (M[0x60] - at(0x74, 4) - (M[0x5F] < at(0x74, 3) ? 1 : 0)) & 255;
      if (hi & 0x80) a = M[0x61] ^ 0xFF;
    }
    const taken = M[0x8146] === 0x10 ? !(a & 0x80) : !!(a & 0x80);
    if (!taken) M[0x83] = (M[0x83] - 1) & 255;
    return {};
  };
  P.intersect_neg = function (r) {
    M[0x68] = 0; M[0x69] = 2; M[0x6A] = 0xFF;
    const a = P.intersect_core().a;
    M[0x73] = a ^ 0xFF;
    return { a: M[0x73] };
  };
  P.intersect_pos = function (r) {
    M[0x68] = 0; M[0x69] = 2; M[0x6A] = 0;
    return P.intersect_core();
  };
  // Where the edge from ($74) to ($76) meets the plane through $68-$6A: by similar triangles,
  // the new point's x and y found from the edge's, its z four times y
  P.intersect_core = function (r) {
    setp(0x78, 0x006B);
    P.vec_sub_log();
    M[0x6D] ^= 0xFF; M[0x70] ^= 0xFF; M[0x73] ^= 0xFF;
    const sum = (lo, mid, sg, a, b, c) => {     // a log-form product into $5F-$61
      const s = lo + a;
      M[0x5F] = s & 255; M[0x60] = (mid + b + (s >> 8)) & 255; M[0x61] = sg ^ c;
    };
    const arg = i => { M[0x62] = at(0x74, i); M[0x63] = at(0x74, i + 1); M[0x64] = at(0x74, i + 2); };
    sum(M[0x68], M[0x69], M[0x6A], at(0x74, 6), at(0x74, 7), at(0x74, 8));
    arg(3);
    P.log_sub();
    M[0x65] = M[0x5F]; M[0x66] = M[0x60]; M[0x67] = M[0x61];
    M[0x5F] = M[0x6E]; M[0x60] = M[0x6F]; M[0x61] = M[0x70];
    let s = M[0x68] + M[0x71];
    M[0x62] = s & 255; M[0x63] = (M[0x69] + M[0x72] + (s >> 8)) & 255; M[0x64] = M[0x6A] ^ M[0x73];
    P.log_sub();
    s = M[0x65] - M[0x5F];
    M[0x65] = s & 255; M[0x66] = (M[0x66] - M[0x60] - (s < 0 ? 1 : 0)) & 255; M[0x67] ^= M[0x61];
    sum(M[0x65], M[0x66], M[0x67], M[0x6B], M[0x6C], M[0x6D]);
    arg(0);
    P.log_add();
    M[0x6B] = M[0x5F]; M[0x6C] = M[0x60]; M[0x6D] = M[0x61];
    sum(M[0x65], M[0x66], M[0x67], M[0x6E], M[0x6F], M[0x70]);
    arg(3);
    P.log_add();
    M[0x6E] = M[0x5F]; M[0x6F] = M[0x60]; M[0x70] = M[0x61];
    M[0x71] = M[0x6E]; M[0x72] = (M[0x6F] - 2) & 255; M[0x73] = M[0x70];
    return { a: M[0x70] };
  };

  // ---- the fill
  // The polygon of $55 vertices (2 to 8) at $FD00: clipped to the window when any vertex is
  // outside it, then filled
  P.fill_polygon = function (r) {
    const n = M[0x55];
    if (n < 2 || n >= 9) return {};
    M[0x86] = (n << 2) & 255;
    let out = false;
    for (let x = (M[0x86] - 1) & 255; !(x & 0x80); x = (x - 2) & 255) if (M[0xFD00 + x]) { out = true; break; }
    if (!out) {
      for (let x = (M[0x86] - 2) & 255; ;) {
        if (M[0xFD00 + x] >= M[0x44]) { out = true; break; }
        x = (x - 2) & 255;
        if (M[0xFD00 + x] >= M[0x43]) { out = true; break; }
        x = (x - 2) & 255;
        if (x & 0x80) break;
      }
    }
    if (out) {
      P.close_polygon({ x: M[0x86] });
      M[0x81] = 2;
      if (!clipSide(0x30, M[0x44], M[0x42])) return {};
      if (!clipSide(0x10, 0, 0)) return {};
      M[0x81] = 0;
      if (!clipSide(0x10, 0, 0)) return {};
      if (!clipSide(0x30, M[0x43], M[0x41])) return {};
      M[0x55] = M[0x86] >> 2;
    }
    return scanFill();
  };
  // One side of the window: x ($81 = 0) or y ($81 = 2) against $85 by the patched branch (BMI:
  // below it is inside; BPL: at or above). Vertices inside are kept, an edge that crosses gets
  // a new vertex on the side ($84 its value); the list is built at $FD80 and copied back.
  function clipSide(op, x, y) {
    M[0x8320] = op; M[0x8343] = op;
    M[0x85] = x; M[0x84] = y;
    if (!M[0x86]) return false;
    M[0x87] = 0;
    const outside = i => {
      const hi = (M[0xFD01 + i] - (M[0xFD00 + i] < M[0x85] ? 1 : 0)) & 255;
      const taken = M[0x8320] === 0x10 ? !(hi & 0x80) : !!(hi & 0x80);
      return taken ? 0 : 0xFF;
    };
    M[0x83] = outside((M[0x86] + M[0x81]) & 255);
    M[0x86] = (M[0x86] - 4) & 255;
    do {
      M[0x82] = M[0x83];
      M[0x83] = outside((M[0x86] + M[0x81]) & 255);
      let keep = false;
      if (!(M[0x83] | M[0x82])) keep = true;
      else if (M[0x83] ^ M[0x82]) {
        if (M[0x83]) P.clip_point({ x: (M[0x86] + 4) & 255, y: M[0x86] });
        else { P.clip_point({ x: M[0x86], y: (M[0x86] + 4) & 255 }); keep = true; }
      }
      if (keep) {
        const s = M[0x86], d = M[0x87];
        for (let k = 0; k < 4; k++) M[0xFD80 + ((d + k) & 255)] = M[0xFD00 + ((s + k) & 255)];
        M[0x87] = (M[0x87] + 4) & 255;
      }
      M[0x86] = (M[0x86] - 4) & 255;
    } while (!(M[0x86] & 0x80));
    M[0x86] = M[0x87];
    if (!M[0x86]) return false;
    for (let x = (M[0x86] - 1) & 255; ; x = (x - 1) & 255) { M[0xFD00 + x] = M[0xFD80 + x]; if ((x - 1) & 0x80) break; }
    P.close_polygon({ x: M[0x86] });
    return true;
  }
  P.clip_side = r => (clipSide(r.a, r.x, r.y) ? {} : { dropped: true });
  // Where the edge from vertex X to vertex Y crosses the side: the other coordinate found from
  // the edge's slope in log form, (side - x1) dy / dx, added to the first vertex's
  P.clip_point = function (r) {
    for (let k = 0; k < 4; k++) { M[0x88 + k] = M[0xFD00 + ((r.x + k) & 255)]; M[0x8C + k] = M[0xFD00 + ((r.y + k) & 255)]; }
    const diff = (a, b, hiA) => {             // a 16-bit difference to log form
      const s = a - M[b];
      M[0x60] = s & 255; M[0x61] = (hiA - M[b + 1] - (s < 0 ? 1 : 0)) & 255;
      P.int16_to_log();
    };
    const toArg = () => { M[0x62] = M[0x5F]; M[0x63] = M[0x60]; M[0x64] = M[0x61]; };
    const subArg = () => {
      const s = M[0x62] - M[0x5F];
      M[0x62] = s & 255; M[0x63] = (M[0x63] - M[0x60] - (s < 0 ? 1 : 0)) & 255; M[0x64] ^= M[0x61];
    };
    const addArg = () => {
      const s = M[0x5F] + M[0x62];
      M[0x5F] = s & 255; M[0x60] = (M[0x60] + M[0x63] + (s >> 8)) & 255; M[0x61] ^= M[0x64];
    };
    const x = M[0x87];
    // on an x side the new x is the side, y found; on a y side the other way round
    const [c, o] = M[0x81] ? [2, 0] : [0, 2];
    M[0xFD80 + x + c] = M[0x84]; M[0xFD81 + x + c] = 0;
    diff(M[0x8C + o], 0x88 + o, M[0x8D + o]); toArg();
    diff(M[0x8C + c], 0x88 + c, M[0x8D + c]); subArg();
    diff(M[0x84], 0x88 + c, 0); addArg();
    P.log_to_lin_signed();
    const s = M[0x60] + M[0x88 + o];
    M[0xFD80 + ((M[0x87] + o) & 255)] = s & 255;
    M[0xFD81 + ((M[0x87] + o) & 255)] = (M[0x61] + M[0x89 + o] + (s >> 8)) & 255;
    M[0x87] = (M[0x87] + 4) & 255;
    return {};
  };
  // Vertex 0 again after the last, at X
  P.close_polygon = function (r) {
    for (let k = 0; k < 4; k++) M[0xFD00 + ((r.x + k) & 255)] = M[0xFD00 + k];
    return { a: M[0xFD03], x: r.x };
  };
  // Row by row from the lowest vertex (the greatest y) up: each side follows its edges, its x
  // stepped by Bresenham's method with the step (INX or DEX) patched into the code, and a
  // span drawn between them on each row
  function scanFill() {
    M[0x8A] = M[0x55];
    M[0x55] = (M[0x55] << 2) & 255;
    let a = 0;
    M[0x88] = 0;
    for (let x = (M[0x55] - 4) & 255; !(x & 0x80); x = (x - 4) & 255) {
      if (a < M[0xFD02 + x]) { a = M[0xFD02 + x]; M[0x88] = x; }
    }
    const x0 = M[0x88];
    M[0x89] = x0;
    M[0x8D] = M[0x91] = M[0xFD00 + x0];
    M[0x8C] = M[0xFD02 + x0];
    if (!P.left_edge().more) return {};
    if (!P.right_edge().more) return {};
    for (;;) {
      let x = M[0x8B];
      let s = M[0x86] - M[0x82];
      if (s < 0) {
        s += 256;
        const step = M[0x854C] === 0xE8 ? 1 : -1;
        do { x = (x + step) & 255; s += M[0x83]; } while (s < 256);
        s -= 256;
      }
      M[0x86] = s; M[0x8B] = x;
      x = M[0x8F];
      s = M[0x87] - M[0x84];
      if (s < 0) {
        s += 256;
        const step = M[0x855D] === 0xE8 ? 1 : -1;
        do { x = (x + step) & 255; s += M[0x85]; } while (s < 256);
        s -= 256;
      }
      M[0x87] = s; M[0x8F] = x;
      let right;
      if (M[0x8B] < M[0x8F]) { M[0x45] = M[0x8B]; right = M[0x8F]; } else { right = M[0x8B]; M[0x45] = M[0x8F]; }
      P.span({ x: right, y: M[0x8C] });
      M[0x8C] = (M[0x8C] - 1) & 255;
      if (M[0x8C] === M[0x8E]) {
        if (!P.left_edge().more) return {};
        if (M[0x8C] === M[0x92] && !P.right_edge().more) return {};
      } else if (M[0x8C] === M[0x92]) {
        if (!P.right_edge().more) return {};
      }
    }
  }
  P.scan_fill = r => scanFill();
  // The next edge of one side: its far vertex, its height ($83 or $85, edges of no height
  // skipped), its width ($82 or $84) and the step's direction, the error term ($86 or $87) the
  // larger of the two halved. more is false when the polygon's edges are used up.
  const edge = (vi, xl, xn, yn, h, w, err, op, back) => {
    for (;;) {
      M[0x8A] = (M[0x8A] - 1) & 255;
      if (M[0x8A] & 0x80) return { more: false };
      let v;
      if (back) { v = (M[vi] - 4) & 255; if (v & 0x80) v = (v + M[0x55]) & 255; }
      else { v = (M[vi] + 4) & 255; if (v >= M[0x55]) v = (v - M[0x55]) & 255; }
      M[vi] = v;
      M[xl] = M[xn];
      M[xn] = M[0xFD00 + v];
      M[yn] = M[0xFD02 + v];
      const d = M[0x8C] - M[yn];
      M[h] = d & 255;
      if (d > 0) break;
    }
    let s = M[xn] - M[xl], x = 0xE8;
    if (!s) { M[w] = 0; return { more: true }; }
    if (s < 0) { x = 0xCA; s = -s; }
    M[op] = x;
    M[w] = s;
    M[err] = (s < M[h] ? M[h] : s) >> 1;
    return { more: true };
  };
  P.left_edge = r => edge(0x88, 0x8B, 0x8D, 0x8E, 0x83, 0x82, 0x86, 0x854C, true);
  P.right_edge = r => edge(0x89, 0x8F, 0x91, 0x92, 0x85, 0x84, 0x87, 0x855D, false);

  // ---- spans
  // One row of a fill, from x $45 to X on window row Y, in the colour's patterns: the screen
  // cells it covers take the colour's cell value, the bitmap's bytes the pattern of the row's
  // parity (whole bytes in the middle, masked at the ends). With a cell value (multicolour
  // cells) the ends are kept to whole pairs of pixels.
  P.span = function (r) {
    let x = r.x, y = r.y;
    const rd = reader(), wr = writer();
    const op = a => M[a] | M[a + 1] << 8;
    M[0x38] = rd(op(0x8C9D) + y);
    M[0x39] = rd(op(0x8CA2) + y) ^ M[0x3A];
    M[0x80] = y;
    const ty = rd(op(0x8CAB) + y);
    M[0x19] = rd(0xEBC8 + ty);
    M[0x1A] = rd(0xEBE1 + ty) ^ M[0x3A];
    const odd = y & 1;
    M[0x8D14] = M[0x8E11 + odd]; M[0x8D5A] = M[0x8E13 + odd]; M[0x8DFC] = M[0x8E15 + odd];
    y = M[0x45];
    const xo = rd(op(0x8CD4) + y);
    let s = (xo & 0xF8) + M[0x38];
    M[0x38] = s & 255;
    M[0x39] = ((rd(op(0x8CDE) + y) & 7) + M[0x39] + (s >> 8)) & 255;
    s = rd(op(0x8CE7) + y) + M[0x19];
    M[0x19] = s & 255; M[0x1A] = (M[0x1A] + (s >> 8)) & 255;
    if (M[0x18]) { x |= 1; y &= 0xFE; }
    const cells = (rd(op(0x8D01) + x) - rd(op(0x8D05) + y)) & 255;
    const bm = (M[0x38] | M[0x39] << 8), cp = (M[0x19] | M[0x1A] << 8);
    const cell = i => { const a = (cp + i) & 0xFFFF; wr(a, (rd(a) & M[0x17]) | M[0x18]); };
    const blend = (i, pat, mask) => { const a = (bm + i) & 0xFFFF, b = rd(a); wr(a, ((b ^ pat) & mask) ^ b); };
    const pattern = (at, even, odd) => {
      if (M[at] === even) return M[0x3D];
      if (M[at] === odd) return M[0x3E];
      throw new Error('span: a branch offset of $' + M[at].toString(16) + ' at $' + at.toString(16));
    };
    if (!cells) {
      const mask = rd(op(0x8D0A) + x) & rd(op(0x8D0D) + y);
      M[0x80] = mask;
      cell(0);
      blend(0, pattern(0x8D14, 0, 0x13), mask);
      return {};
    }
    M[0x80] = cells;
    for (let i = cells; !(i & 0x80); i = (i - 1) & 255) cell(i);
    if (cells > 31) throw new Error('span: ' + cells + ' cells');
    M[0x8D74] = (0x7C - 4 * cells) & 255;
    // the right end's partial byte, the whole bytes between, the left end's partial byte
    const pr = pattern(0x8D5A, 0, 0x0D);
    blend(cells * 8, pr, M[0x8D5A] ? rd(op(0x8D6B) + x) : rd(op(0x8D5E) + x));
    for (let i = (cells - 1) * 8; i > 0; i -= 8) wr((bm + i) & 0xFFFF, pr);
    x = M[0x45];
    if (M[0x18]) x &= 0xFE;
    blend(0, pattern(0x8DFC, 0, 0x0A), M[0x8DFC] ? rd(op(0x8E0A) + x) : rd(op(0x8E00) + x));
    return {};
  };
  // The span from x $47/$48 to $49/$4A on row $4B/$4C, clipped to the window: nothing for a
  // row past its height or a span off either side, the right end held back to its last x
  P.span_clipped = function (r) {
    if (M[0x4C]) return {};
    return P.s_8C79({ y: M[0x4B] });
  };
  P.s_8C79 = function (r) {
    const y = r.y;
    if (y >= M[0x8C7A]) return {};
    if (M[0x4A] & 0x80) return {};
    let x;
    if (M[0x4A]) x = M[0x8C8A];
    else { x = M[0x49]; if (x >= M[0x8C86]) x = M[0x8C8A]; }
    if (M[0x48] & 0x80) M[0x45] = 0;
    else if (M[0x48]) return {};
    else { if (M[0x47] >= M[0x8C94]) return {}; M[0x45] = M[0x47]; }
    return P.span({ x, y });
  };
  // A bar 8 rows high (four rows into each buffer) at row Y from x X to X + A
  P.draw_bar = function (r) {
    M[0x45] = r.x; M[0x4B] = r.y;
    M[0x46] = (r.a + r.x) & 255;
    P.flip_draw_buffer();
    P.span({ x: M[0x46], y: r.y });
    for (let k = 0; k < 3; k++) { M[0x4B] = (M[0x4B] + 1) & 255; P.span({ x: M[0x46], y: M[0x4B] }); }
    P.flip_draw_buffer();
    P.span({ x: M[0x46], y: M[0x4B] });
    for (let k = 0; k < 3; k++) { M[0x4B] = (M[0x4B] - 1) & 255; P.span({ x: M[0x46], y: M[0x4B] }); }
    return {};
  };
  // The drawing window: Y its bottom row, A/X its left x, $41/$42 its width and height. The
  // span drawer's table operands are pointed at the window, and its limits and centre set.
  P.set_window = function (r) {
    M[0x82] = r.y; M[0x80] = r.x; M[0x81] = r.a;
    const set = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
    set(0x8C9D, 0xEB00 + r.y); set(0x8CA2, 0xEC00 + r.y); set(0x8CAB, 0xECC8 + r.y);
    const left = r.a << 8 | r.x;
    for (const a of [0x8CD4, 0x8CDE]) set(a, 0xEE08 + left);
    for (const a of [0x8CE7, 0x8D01, 0x8D05]) set(a, 0xECC8 + left);
    for (const a of [0x8D0A, 0x8D5E, 0x8D6B]) set(a, 0xF088 + left);
    for (const a of [0x8D0D, 0x8E00, 0x8E0A]) set(a, 0xEF48 + left);
    const y = (M[0x42] + 1) & 255;
    M[0x44] = y; M[0x8C7A] = y; M[0x57] = y >> 1;
    M[0x8C8A] = M[0x41];
    const x = (M[0x41] + 1) & 255;
    M[0x43] = x; M[0x8C86] = x; M[0x8C94] = x; M[0x56] = x >> 1;
    return { a: x >> 1, x, y };
  };
  P.window_full = function (r) { M[0x41] = 0x3F; M[0x42] = 0xC7; P.set_window({ a: 0, x: 0, y: 0 }); return {}; };
  P.window_right = function (r) { M[0x41] = 0x9F; M[0x42] = 0xC7; P.set_window({ a: 0, x: 0xA0, y: 0 }); return {}; };
  // The 3D view: 251 by 102 pixels from x 34, row 73 ($87FE)
  P.window_view = function (r) { M[0x41] = 0xFB; M[0x42] = 0x66; return P.set_window({ a: 0, x: 0x22, y: 0x49 }); };

  // ---- the buffers
  // The end of a frame: colour 1 set (its clear byte the clears use), the buffer just drawn
  // shown, the other's view cleared, and drawing moved to it
  P.flip_buffers = function (r) {
    P.set_colour({ x: 1 });
    if (M[0x3A]) { P.show_bank1(); P.view_clear_c000(); }
    else { P.show_bank3(); P.view_clear_4000(); }
    return P.flip_draw_buffer();
  };
  P.flip_draw_buffer = function (r) { M[0x3A] ^= 0x80; return r || {}; };
  const showBank = bits => function (r) {
    M[1] = (M[1] & 0xFC) | 1;
    P.wr(0xDD02, P.rd(0xDD02) | 3);
    P.wr(0xDD00, (P.rd(0xDD00) & 0xFC) | bits);
    M[1] &= 0xFC;
    return r || {};
  };
  P.show_bank3 = showBank(0);
  P.show_bank1 = showBank(2);
  P.copy_to_bank1 = function (r) {
    M[0x80] = 0x00; M[0x81] = 0xC0; M[0x82] = 0x00; M[0x83] = 0x40; M[0x84] = 0x00; M[0x85] = 0x24;
    return P.copy_memory();
  };
  // The 3D view of one buffer (character rows 3-15, columns 4-35) cleared to the byte in $3B,
  // but the last pixel row, and its screen cells to $CC
  const clearView = (bitmap, screen) => function (r) {
    const wr = writer(), v = M[0x3B];
    for (let x = 0x1F, y = 0; x >= 0; x--, y += 8) {
      for (let k = 0; k < 13; k++) for (let b = 0; b < (k === 12 ? 7 : 8); b++) wr(bitmap + k * 0x140 + b + y, v);
      for (let k = 0; k < 13; k++) wr(screen + k * 0x28 + x, 0xCC);
    }
    return { a: 0xCC, x: 0xFF, y: 0xF8 };
  };
  P.view_clear_c000 = clearView(0xC3E0, 0xE07C);
  P.view_clear_4000 = clearView(0x43E0, 0x607C);
  // The TAC display's area of the $C000 buffer (rows 18-23, columns 14-23, from its second
  // pixel row to its second last) to the byte in $3B, its cells to $CC; and that area copied
  // to the $4000 buffer
  const TAC = [[0xD6F1, 7], [0xD830, 8], [0xD970, 8], [0xDAB0, 8], [0xDBF0, 8], [0xDD30, 7]];
  P.tac_fill = function (r) {
    const wr = writer(), v = M[0x3B];
    for (let x = 9, y = 0; x >= 0; x--, y += 8) {
      for (const [a, n] of TAC) for (let b = 0; b < n; b++) wr(a + b + y, v);
      for (let k = 0; k < 6; k++) wr(0xE2DE + k * 0x28 + x, 0xCC);
    }
    return { a: 0xCC, x: 0xFF, y: 0x48 };
  };
  P.tac_copy = function (r) {
    const wr = writer(), rd = reader();
    for (let x = 9, y = 0; x >= 0; x--, y += 8) {
      for (const [a, n] of TAC) for (let b = 0; b < n; b++) wr(a - 0x8000 + b + y, rd(a + b + y));
      for (let k = 0; k < 6; k++) wr(0x62DE + k * 0x28 + x, rd(0xE2DE + k * 0x28 + x));
    }
    return { a: rd(0xE3A6), x: 0xFF, y: 0x48 };
  };

  // ---- colours
  // Colour code X: below $13 through the palette at $F1E6, others their low three bits plus 1;
  // its patterns for even and odd rows, its clear byte, and its screen cells' mask and value
  // The whole drawing window in the colour set, a span for each row from the top ($42) down
  P.fill_window = function (r) {
    let y = M[0x42];
    M[0x4B] = y; M[0x45] = 0; M[0x46] = M[0x41];
    do {
      P.span({ x: M[0x46], y });
      M[0x4B] = (M[0x4B] - 1) & 255;
      y = M[0x4B];
    } while (y !== 0xFF);
    return { y: 0xFF };
  };
  P.set_colour = function (r) {
    let x = r.x;
    M[0x8FC9] = x;
    x = x < 0x13 ? M[0xF1E6 + x] : (x & 7) + 1;
    M[0x3D] = M[0xF1C8 + x]; M[0x3E] = M[0xF1D2 + x]; M[0x3B] = M[0xF1DC + x];
    const a = M[0x8FC9];
    x = a < 0x13 ? M[0x8FCA + a] : a >> 3;
    M[0x17] = M[0x8FDD + x]; M[0x18] = M[0x8FFD + x];
    return { a: M[0x18], x };
  };
  P.set_flash_colour = function (r) {
    const a = M[0x3A] ? 0x70 : 0x80;
    M[0x9002] = a;
    return { a, x: M[0x3A] };
  };
  // A random spark's patterns: one of three pairs, or of the next three when the clear byte's
  // first entry is negative
  P.spark_pattern = function (r) {
    let a = P.random_upto({ a: 2 }).a;
    if (M[0xF1DC] & 0x80) a += 3;
    M[0x3D] = M[0x8F74 + a]; M[0x3E] = M[0x8F7A + a];
    return {};
  };

  // ---- the 2D objects, centred on the projected point $51-$54, of size $4D
  // A filled disc, by the midpoint circle method, each row's span mirrored above and below
  P.draw_disc = function (r) {
    const size = M[0x4D];
    if (size < 2) {
      M[0x4B] = M[0x53]; M[0x4C] = M[0x54];
      M[0x47] = M[0x49] = M[0x51]; M[0x48] = M[0x4A] = M[0x52];
      return P.span_clipped();
    }
    const h = size >> 1;
    M[0x8A] = M[0x88] = h; M[0x87] = h ^ 0xFF; M[0x89] = 0;
    M[0x4C] = M[0x86] = M[0x54]; M[0x4B] = M[0x85] = M[0x53];
    setp(0x49, w16(0x51) + h); setp(0x47, w16(0x51) - h);
    if (!(size & 1)) { add16(0x47, 1); add16(0x85, 1); }
    else P.span_clipped();
    for (;;) {
      M[0x89] = (M[0x89] + 1) & 255;
      add16(0x4B, 1);
      add16(0x85, -1);
      let a = (M[0x87] + M[0x89]) & 255;
      if (!(a & 0x80)) {
        let c = 1;
        do {
          const s = a - M[0x88] - (1 - c);
          c = s >= 0 ? 1 : 0; a = s & 255;
          M[0x88] = (M[0x88] - 1) & 255;
          add16(0x49, -1); add16(0x47, 1);
        } while (c);
      }
      M[0x87] = a;
      P.span_clipped();
      if (!M[0x86]) P.s_8C79({ y: M[0x85] });
      if (M[0x89] === M[0x8A]) return {};
      if (!(M[0x89] & 1)) M[0x87] = (M[0x87] + 1) & 255;
    }
  };
  // A circle's outline: the two ends of each other row plotted, the top and bottom rows whole
  P.draw_ring = function (r) {
    const size = M[0x4D];
    if (size >= 0xFA) return {};
    const h = size >> 1;
    M[0x88] = M[0x86] = h; M[0x85] = h ^ 0xFF; M[0x87] = 0;
    M[0x82] = M[0x84] = M[0x54]; M[0x81] = M[0x83] = M[0x53];
    setp(0x8C, w16(0x51) + h); setp(0x8A, w16(0x51) - h);
    if (!M[0x82]) P.s_899B({ y: M[0x81] });
    for (;;) {
      M[0x87] = (M[0x87] + 1) & 255;
      add16(0x81, 1); add16(0x83, -1);
      let a = (M[0x85] + M[0x87]) & 255;
      if (!(a & 0x80)) {
        let c = 1;
        do {
          const s = a - M[0x86] - (1 - c);
          c = s >= 0 ? 1 : 0; a = s & 255;
          M[0x86] = (M[0x86] - 1) & 255;
          add16(0x8C, -1); add16(0x8A, 1);
        } while (c);
      }
      M[0x85] = a;
      if (M[0x87] === M[0x88]) {
        M[0x47] = M[0x8A]; M[0x48] = M[0x8B]; M[0x49] = M[0x8C]; M[0x4A] = M[0x8D];
        M[0x4B] = M[0x81]; M[0x4C] = M[0x82];
        P.span_clipped();
        M[0x4B] = M[0x83]; M[0x4C] = M[0x84];
        return P.span_clipped();
      }
      if (M[0x87] & 1) continue;
      M[0x85] = (M[0x85] + 1) & 255;
      if (!M[0x82]) P.s_899B({ y: M[0x81] });
      if (M[0x84]) continue;
      P.s_899B({ y: M[0x83] });
    }
  };
  // draw_ring's two ends of row Y, a pixel pair each
  P.s_899B = function (r) {
    M[0x89] = r.y;
    M[0x47] = M[0x8A]; M[0x48] = M[0x8B];
    setp(0x49, w16(0x47) + 1);
    P.s_8C79({ y: r.y });
    M[0x49] = M[0x8C]; M[0x4A] = M[0x8D];
    setp(0x47, w16(0x49) - 1);
    return P.s_8C79({ y: M[0x89] });
  };
  // A ragged disc with, below size 4, a full disc in colour 2 over it; from 4 up, a disc an
  // eighth smaller in colour $DE (or $D6), and one smaller again in colour 2
  P.draw_burst = function (r) {
    P.draw_ragged();
    P.set_colour({ x: M[0x8FC9] === 0xD9 ? 0xDE : 0xD6 });
    if (M[0x4D] >= 4) {
      M[0x94] = ((M[0x4D] >> 3) + 1) & 255;
      M[0x4D] = (M[0x4D] - M[0x94]) & 255;
      P.draw_disc();
      M[0x4D] = (M[0x4D] - M[0x94]) & 255;
    }
    P.set_colour({ x: 2 });
    return P.draw_disc();
  };
  // A disc in the colour code at $99, and from size 4 up one three-quarters its size in colour 0
  P.draw_annulus = function (r) {
    P.set_colour({ x: M[0x99] });
    P.draw_disc();
    const q = M[0x4D] >> 2;
    if (!q) return {};
    M[0x94] = q;
    M[0x4D] = (M[0x4D] - q) & 255;
    P.set_colour({ x: 0 });
    return P.draw_disc();
  };
  // Below size 12 a plain disc; otherwise a disc whose rows are each widened by 0 to 2 from a
  // table of 16, a row further each time
  P.draw_ragged = function (r) {
    const size = M[0x4D];
    if (size < 0x0C) return P.draw_disc();
    M[0x8D] = (size - 1) & 255;
    const h = M[0x8D] >> 1;
    M[0x88] = M[0x86] = h; M[0x85] = h ^ 0xFF; M[0x87] = 0;
    M[0x82] = M[0x84] = M[0x54]; M[0x81] = M[0x83] = M[0x53];
    setp(0x8B, w16(0x51) + h); setp(0x89, w16(0x51) - h);
    if (M[0x8D] & 1) {
      if (!M[0x54]) {
        M[0x47] = M[0x89]; M[0x48] = M[0x8A]; M[0x49] = M[0x8B]; M[0x4A] = M[0x8C];
        P.s_8C79({ y: M[0x53] });
      }
    } else { add16(0x89, 1); add16(0x83, 1); }
    for (;;) {
      M[0x87] = (M[0x87] + 1) & 255;
      add16(0x81, 1); add16(0x83, -1);
      let a = (M[0x85] + M[0x87]) & 255;
      if (!(a & 0x80)) {
        let c = 1;
        do {
          const s = a - M[0x86] - (1 - c);
          c = s >= 0 ? 1 : 0; a = s & 255;
          M[0x86] = (M[0x86] - 1) & 255;
          add16(0x8B, -1); add16(0x89, 1);
        } while (c);
      }
      M[0x85] = a;
      M[0x8B0A] = (M[0x8B0A] + 1) & 255;
      const d = M[0x8B0B + (M[0x8B0A] & 15)];
      setp(0x47, w16(0x89) - d); setp(0x49, w16(0x8B) + d);
      if (!M[0x82]) P.s_8C79({ y: M[0x81] });
      if (!M[0x84]) P.s_8C79({ y: M[0x83] });
      if (M[0x87] === M[0x88]) return {};
      if (!(M[0x87] & 1)) M[0x85] = (M[0x85] + 1) & 255;
    }
  };
  P.draw_sparks = () => P.spray_triangles({ a: M[0x4D], x: 1, y: 7 });
  // Y small triangles of size A about the projected point, the shift X making them smaller
  P.spray_triangles = function (r) {
    M[0xA2] = r.y; M[0x4D] = r.a;
    M[0xA4] = r.a >> 1;
    let a = M[0xA4] >> 1;
    for (let x = r.x; ; ) { a >>= 1; x = (x - 1) & 255; if (x & 0x80) break; }
    M[0xA3] = a;
    do { P.spray_triangle(); M[0xA2] = (M[0xA2] - 1) & 255; } while (M[0xA2]);
    return {};
  };
  // One of them: a corner at a random offset, the other two either side of the point, across
  // or along by the offset's slope, filled in a random spark pattern
  P.spray_triangle = function (r) {
    const offset = (lo, hi) => {
      const o = P.random_upto({ a: M[0x4D] });
      const a = (o.a - M[0xA4] - (1 - o.c)) & 255;
      M[lo] = a; M[hi] = a & 0x80 ? 0xFF : 0;
    };
    offset(0x9E, 0x9F);
    offset(0xA0, 0xA1);
    const put16 = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };
    const sx = w16(0x51), sy = w16(0x53), d = M[0xA3];
    put16(0xFD00, sx + w16(0x9E)); put16(0xFD02, sy + w16(0xA0));
    if ((M[0xA0] - M[0x9E]) & 0x80) {
      put16(0xFD04, sx); put16(0xFD06, sy + d);
      put16(0xFD08, sx); put16(0xFD0A, sy - d);
    } else {
      put16(0xFD04, sx + d); put16(0xFD06, sy);
      put16(0xFD08, sx - d); put16(0xFD0A, sy);
    }
    P.spark_pattern();
    M[0x55] = 3;
    return P.fill_polygon();
  };
  // A triangle with its corners at random offsets from the point, up to the size
  P.draw_flicker = function (r) {
    M[0x8C] = 0; M[0x8A] = 0x0A;
    do {
      M[0x8B] = P.random_upto({ a: M[0x4D] }).a;
      M[0x8C] ^= 2;
      const x = M[0x8C], y = M[0x8A];
      const s = M[0x51 + x] + M[0x8B];
      M[0xFD00 + y] = s & 255; M[0xFD01 + y] = (M[0x52 + x] + (s >> 8)) & 255;
      M[0x8A] = (M[0x8A] - 2) & 255;
    } while (!(M[0x8A] & 0x80));
    M[0x55] = 3;
    return P.fill_polygon();
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
