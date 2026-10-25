// The view's picture ($4B24-$4E04, $61A8-$6216, $827A-$82B9, $8367-$8571): the sky and the floor
// laid in the linear buffer before the faces (the horizon from the pitch; the Wilderness's
// distant scenery, a 16-byte strip that turns with the yaw; the lightning's streak), the buffer
// copied to the bitmap at $1237/$1238 (15 character rows of 30 cells), the view's colours, the
// centre reticle, and one step of the viewport's opening or closing.
//
// The bitmap is RAM under the KERNAL ($E528 on), the buffer RAM at $87CC-$95FA, so both are P.M;
// colour RAM and the video chip go through P.io.
(function (root) {
'use strict';
const G = root.CMGroups = root.CMGroups || {};
G.view = function (P) {
  const M = P.M, io = P.io;
  const ptr = zp => M[zp] | M[zp + 1] << 8;
  const setp = (zp, v) => { M[zp] = v & 255; M[zp + 1] = (v >> 8) & 255; };
  const at = (zp, y) => (ptr(zp) + y) & 0xFFFF;
  const op = a => M[a] | M[a + 1] << 8;
  const setop = (a, v) => { M[a] = v & 255; M[a + 1] = (v >> 8) & 255; };

  // BLIT_LINEAR_VIEWPORT_TO_VIC_BITMAP: a deferred sound started first ($105E); then each of 15
  // character rows: 240 bytes of the buffer, read down from $94EC, put eight lines a cell (the
  // STAs' operands at $4B4F and $4B52 are the routine's pointers).
  P.BLIT_LINEAR_VIEWPORT_TO_VIC_BITMAP = function (r) {
    if (M[0x105E]) P.SID_INITIALIZE_IF_ENABLED({ a: M[0x105E], x: r.x, y: r.y });
    M[0xB1] = 0x0F;
    setop(0x4B4F, 0x94EC);
    M[0x4B52] = M[0x1237]; M[0x4B53] = M[0x1238];
    let c = 0;
    do {
      const src = op(0x4B4F), dst = op(0x4B52);
      let x = 0xEF;
      for (let y0 = 0; y0 < 8; y0++) for (let y = y0; y < 0xF0; y += 8, x = (x - 1) & 255) M[(dst + y) & 0xFFFF] = M[(src + x) & 0xFFFF];
      setop(0x4B52, dst + 0x140);
      c = M[0x4B4F] >= 0xF0 ? 1 : 0;
      setop(0x4B4F, src - 0xF0);
      M[0xB1]--;
    } while (M[0xB1]);
    return { a: M[0x4B4F], x: 0xFF, y: 8, c };
  };

  // DRAW_SKY_FLOOR_BACKGROUND: in an area with a sky ($2464: sky colour high, floor low; 0 has
  // none), the floor's rows below the horizon and the sky's above, the horizon at 11 rows a step
  // of pitch from row 64, clamped to the view. The Wilderness (area 1) has an 18-row strip of
  // scenery on its horizon. While the lightning flashes ($2459 = 1) a streak is drawn down from the
  // sky, and the flash's countdown taken to 0.
  P.DRAW_SKY_FLOOR_BACKGROUND = function (r) {
    M[0x4B89] = 0; M[0x4B8A] = 0; M[0x4B8B] = 0; M[0x4B8C] = 0;
    let a = M[0x2464], x = r.x, y = r.y;
    if (!a) return { a: 0, x, y };
    M[0x4B8E] = a & 0x0F;
    M[0x4B8D] = a >> 4;
    draw: {
      const allFloor = () => { y = 0x78; x = 0; M[0x4B89] = 0; };
      const allSky = () => { y = 0; M[0x4B89] = 0; x = 0x78; };
      if (!M[0x4B8D]) { allFloor(); break draw; }
      if (!M[0x4B8E]) { allSky(); break draw; }
      a = M[0x2410];
      if (!((a - 0x08) & 0x80)) {
        if ((a - 0x1D) & 0x80) { allSky(); break draw; }
        if ((a - 0x3D) & 0x80) { allFloor(); break draw; }
        a = (a - 0x48) & 255;
      }
      P.MUL_S8_S8_TO_S16({ x: a, y: 0x0B });
      // plug-in point: a pitch between two steps, the horizon 11 rows a step
      const part = Math.round(0x0B * P.plug.frac(0x2410));
      if (part) { const v = (M[0x82] | M[0x83] << 8) + part; M[0x82] = v & 255; M[0x83] = (v >> 8) & 255; }
      let s = 0x40 + M[0x82]; M[0x82] = s & 255; x = M[0x82];
      M[0x83] = (M[0x83] + (s >> 8)) & 255;
      if (M[0x83] & 0x80) x = 0;
      else if (x >= 0x78) { x = 0x78; y = 0; break draw; }
      // plug-in point: the streak kept on show for longer than the loop that shows it
      if (P.plug.held(0x2459, P.irqByte(0x2459)) === 1) {
        s = 0x5F + M[0x82]; const yy = s & 255;
        const hi = (M[0x83] + (s >> 8)) & 255;
        if (!(hi & 0x80)) {
          M[0x4B8B] = yy;
          if (yy >= 0x56) {
            M[0x4B8B] = 0x55;
            if (yy >= 0x79) {
              M[0x83] = x;
              let v = 0x78 - x; let b = v < 0 ? 1 : 0; v &= 255;
              M[0x83] = 0x0A; v = v - 0x0A - b; v &= 255;
              if (v & 0x80) v = 0;
              M[0x4B8B] = v;
              M[0x4B8C] = (0x55 - v) & 255;
            }
          }
        }
      }
      a = M[0x82]; M[0x82] = x;
      let rows;
      if (a & 0x80) { a = (a + 0x12) & 255; rows = (a & 0x80) ? -1 : a; } else rows = (a + 0x12) & 255;
      if (rows >= 0) {
        M[0x4B89] = rows;
        if (rows >= 0x13) {
          M[0x4B89] = 0x12;
          if (rows >= 0x79) {
            M[0x4B89] = (0x78 - M[0x82]) & 255;
            M[0x4B8A] = (0x12 - M[0x4B89]) & 255;
            y = 0; break draw;
          }
        }
      }
      let v = 0x78 - M[0x82]; const b = v < 0 ? 1 : 0;
      y = (v - M[0x4B89] - b) & 255;
    }
    M[0x7A] = 0xBE; M[0x7B] = 0x95;
    const sky = x;
    if (y) P.FILL_BACKGROUND_ROWS_WITH_PATTERN({ a: M[0x4B8E], x, y });
    if (M[0x4B89]) P.FILL_LOWER_BACKGROUND_ROWS({});
    if (M[0x4B8B]) P.APPLY_LIGHTNING_STREAK_MASK({});
    let o = { a: sky, x: sky, y };
    if (sky) o = P.FILL_BACKGROUND_ROWS_WITH_PATTERN({ a: M[0x4B8D], x: sky, y: sky });
    a = P.irqByte(0x2459);
    if (a === 1) M[0x2459] = (P.irqByte(0x2459) - 1) & 255;
    return { a, x: o.x, y: o.y };
  };

  // FILL_BACKGROUND_ROWS_WITH_PATTERN: Y rows up from ($7A), 30 bytes each, in colour A's dither
  // (four bytes from $9D06, by the row's count mod 4).
  P.FILL_BACKGROUND_ROWS_WITH_PATTERN = function (r) {
    let x = ((r.a - 1) << 2) & 255;
    for (let y = 4; y > 0; y--, x = (x + 1) & 255) M[0xB0 + y] = M[0x9D06 + x];
    x = r.y;
    let c = 1;
    do {
      const v = M[0xB1 + (x & 3)];
      for (let y = 0x1D; y >= 0; y--) M[at(0x7A, y)] = v;
      c = M[0x7A] >= 0x1E ? 1 : 0;
      setp(0x7A, ptr(0x7A) - 0x1E);
      x = (x - 1) & 255;
    } while (x);
    return { a: M[0x7A], x: 0, y: 0xFF, c };
  };

  // FILL_LOWER_BACKGROUND_ROWS: $4B89 rows of the floor's colour, but in the Wilderness its
  // scenery: rows of 16 bytes from $21FA ($4B8A rows in when the strip is cut by the view's top),
  // each laid repeating across the 30 bytes from the yaw's offset.
  P.FILL_LOWER_BACKGROUND_ROWS = function (r) {
    if (M[0x2429] !== 1) return P.FILL_BACKGROUND_ROWS_WITH_PATTERN({ a: M[0x4B8E], x: r.x, y: M[0x4B89] });
    const keep = M[0x4B89];
    setp(0x7C, 0x21FA);
    // plug-in point: a yaw between two steps, the scenery 8 pixels (two bytes) a step
    M[0x82] = (((M[0x2411] & 7) << 1) + Math.floor(2 * P.plug.frac(0x2411))) & 15;
    for (let y = M[0x4B8A]; y; y--) setp(0x7C, ptr(0x7C) + 0x10);
    let x, y;
    do {
      y = 0x1D; x = M[0x82];
      for (const a of [0x4D49, 0x4D5A, 0x4D68]) { M[a] = M[0x7C]; M[a + 1] = M[0x7D]; }
      const strip = ptr(0x7C);
      do { M[at(0x7A, y)] = M[(strip + x) & 0xFFFF]; y = (y - 1) & 255; x++; } while (x !== 0x10);
      for (;;) {
        x = 0;
        if (y < 0x11) break;
        do { M[at(0x7A, y)] = M[(strip + x) & 0xFFFF]; y = (y - 1) & 255; x++; } while (x !== 0x10);
      }
      do { M[at(0x7A, y)] = M[(strip + x) & 0xFFFF]; x++; y = (y - 1) & 255; } while (!(y & 0x80));
      setp(0x7C, ptr(0x7C) + 0x10);
      setp(0x7A, ptr(0x7A) - 0x1E);
      M[0x4B89]--;
    } while (M[0x4B89]);
    M[0x4B89] = keep;
    return { a: keep, x, y };
  };

  // APPLY_LIGHTNING_STREAK_MASK: the streak's picture ($20F8, three bytes a row from $4B8C) ORed
  // into $4B8B rows of the buffer, at a column the clock picks (0-26 bytes in).
  P.APPLY_LIGHTNING_STREAK_MASK = function (r) {
    // plug-in point: the column kept while the streak is kept on show
    let a = P.plug.held(0x1C64, P.irqByte(0x1C64));
    while (a >= 0x1B) a -= 0x1B;
    M[0x4B8F] = a;
    const keep = ptr(0x7A);
    a = M[0x4B89] >= 8 ? M[0x4B89] - 8 : 0;
    P.MUL_S8_S8_TO_S16({ x: (a + M[0x4B8B]) & 255, y: 0x1E });
    setp(0x7A, ptr(0x7A) + (M[0x82] | M[0x83] << 8));
    setp(0x7A, ptr(0x7A) + M[0x4B8F]);
    let x = (M[0x4B8C] * 3) & 255, y;
    do {
      for (y = 2; y >= 0; y--) { const p = at(0x7A, y); M[p] = ((M[p] ^ 0xFF) & M[0x20F8 + x]) | M[p]; x = (x + 1) & 255; }
      setp(0x7A, ptr(0x7A) - 0x1E);
      M[0x4B8B]--;
    } while (M[0x4B8B]);
    setp(0x7A, keep);
    return { a: M[0x7B], x, y: 0xFF };
  };

  // UPDATE_VIEWPORT_COLOR_CELLS: the area's colours taken up ($2435-$2438 to $2431-$2434): colour
  // RAM and the screen's colours for the view's 15 rows of 30 cells, and the border and background.
  P.UPDATE_VIEWPORT_COLOR_CELLS = function (r) {
    M[1] = 0x35;
    M[0x61A6] = 0x0F;
    M[0x1064] = 0;
    for (let x = 4; x > 0; x--) M[0x2430 + x] = M[0x2434 + x];
    setop(0x61EF, 0xC4A5); setop(0x61E9, 0xD8A5);
    M[0x61A7] = ((M[0x2432] << 4) | M[0x2433]) & 255;
    do {
      const col = op(0x61E9), scr = op(0x61EF);
      for (let x = 0x1D; x >= 0; x--) { io.colourWrite((col + x - 0xD800) & 0x3FF, M[0x2434]); M[scr + x] = M[0x61A7]; }
      const s = M[0x61E9] + 0x28;
      M[0x61E9] = M[0x61EF] = s & 255;
      if (s > 255) { M[0x61EA]++; M[0x61F0]++; }
      M[0x61A6]--;
    } while (M[0x61A6]);
    io.vicWrite(0x20, M[0x2431]); io.vicWrite(0x21, M[0x2431]);
    return { a: M[0x2431], x: 0xFF, y: r.y };
  };

  // XOR_CENTER_RETICLE_IN_LINEAR_VIEWPORT: the small cross at the view's centre, XORed in.
  P.XOR_CENTER_RETICLE_IN_LINEAR_VIEWPORT = function (r) {
    setp(0x7A, (M[0x10A0] | M[0x10A1] << 8) + 0x06BD);
    let y = 0, a;
    const x_ = (yy, v) => { const p = at(0x7A, yy); a = M[p] ^ v; M[p] = a; };
    for (let k = 0; k < 3; k++) { x_(y, 0x01); y = (y + 0x1E) & 255; }
    x_(y, 0x14); y--; x_(y, 0x50); y++;
    for (let k = 0; k < 3; k++) { y = (y + 0x1E) & 255; x_(y, 0x01); }
    return { a, x: 0, y };
  };

  // APPLY_VERTICAL_BITMAP_TRANSITION_STEP: the viewport drawn to step X of its opening (rows from
  // the top: the frame's patterns at $82D7, three bytes repeated across, in the order the step's
  // count picks, and the buffer's rows with a border at both edges), and the rows the last step
  // covered and this one does not ($82BD - X) copied back from the buffer. Y is kept.
  P.APPLY_VERTICAL_BITMAP_TRANSITION_STEP = function (r) {
    M[0x82BB] = r.x;
    M[0x82BE] = 0;
    if (M[0x82BD] >= M[0x82BB]) M[0x82BE] = (M[0x82BD] - M[0x82BB]) & 255;
    M[0x82BD] = M[0x82BB];
    M[0x82C0] = M[0x1237]; M[0x82C1] = M[0x1238];
    M[0x7E] = 0xBE; M[0x7F] = 0x95;
    const nextLine = () => {
      M[0x82C0]++;
      if (!(M[0x82C0] & 7)) { const s = 0x38 + M[0x82C0]; M[0x82C0] = s & 255; M[0x82C1] = (M[0x82C1] + 1 + (s >> 8)) & 255; }
      setp(0x7E, ptr(0x7E) - 0x1E);
    };
    let a = M[0x82BB], x = r.x, y;
    if (a) {
      if (a < 0x10) { M[0x82BC] = a; y = 0x0C; a = 4; }
      else if (a < 0x14) {
        M[0x82BC] = a - 0x0F; y = 0; a = (4 - M[0x82BC]) & 255;
        if (a) { for (x = a; x; x--) y += 3; a = 3; }
      } else {
        a -= 0x13;
        while (a >= 0x19) a -= 0x18;
        if (a >= 0x15) {
          M[0x82BC] = a - 0x14; y = 0; a = (4 - M[0x82BC]) & 255;
          if (a) { for (x = a; x; x--) y += 3; a = 1; }
        } else { M[0x82BC] = a; y = 0x0C; a = 2; }
      }
      M[0x82BA] = a; M[0x82BF] = y;
      do {
        a = M[0x82BA];
        const dst = op(0x82C0);
        if (a === 1 || a === 3) {
          for (const o of [0x8433, 0x843F, 0x844B]) setop(o, dst);
          x = 0;
          do {
            y = M[0x82BF];
            for (let k = 0; k < 3; k++) { M[(dst + x) & 0xFFFF] = M[0x82D7 + y]; x = (x + 8) & 255; y++; }
          } while (x !== 0xF0);
          M[0x82BC]--;
          if (M[0x82BC]) M[0x82BF] += 3;
          else {
            if (M[0x82BA] === 1) { M[0x82BA] = 2; M[0x82BC] = 0x14; } else { M[0x82BA] = 4; M[0x82BC] = 0x0F; }
            M[0x82BF] = 0x0C;
          }
        } else {
          for (const o of [0x84AB, 0x84B6, 0x84C5]) setop(o, dst);
          y = 0x1D; x = 0;
          do {
            M[(dst + x) & 0xFFFF] = (M[at(0x7E, y)] & 0x3F) | 0x40; x = (x + 8) & 255; y = (y - 1) & 255;
            M[(dst + x) & 0xFFFF] = M[at(0x7E, y)]; x = (x + 8) & 255; y = (y - 1) & 255;
            M[(dst + x) & 0xFFFF] = (M[at(0x7E, y)] & 0xFC) | 0x03; x = (x + 8) & 255; y = (y - 1) & 255;
          } while (x !== 0xF0);
          M[0x82BC]--;
          if (!M[0x82BC]) {
            M[0x82BC] = 4; M[0x82BA] = M[0x82BB] >= 0x15 ? 1 : 3; M[0x82BF] = 0;
          }
        }
        nextLine();
        P.N.vline++;
        M[0x82BB]--;
      } while (M[0x82BB]);
    }
    while (M[0x82BE]) {
      const dst = op(0x82C0);
      setop(0x8536, dst);
      y = 0x1D; x = 0;
      do { M[(dst + x) & 0xFFFF] = M[at(0x7E, y)]; x = (x + 8) & 255; y = (y - 1) & 255; } while (x !== 0xF0);
      nextLine();
      P.N.vclear++;
      M[0x82BE]--;
    }
    return { a: r.y, x, y: r.y };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
