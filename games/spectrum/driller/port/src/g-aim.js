// Lines, the crosshair and the laser ($A803-$AB12, $B153-$B31E), and copying the finished view to
// the screen ($9BF7, $AB25).
(function (root) {
'use strict';
const G = root.DRGroups = root.DRGroups || {};

G.aim = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const sgn16 = v => (v & 0x8000) !== 0;
  const plot = (c, b) => P.plot({ c: c & 255, b: b & 255 });

  // draw_line ($A803): a line from ($8A0E, $8A0F) to ($8A10, $8A11) by Bresenham's method, each
  // point flipped by plot; the longer axis ($8A12) steps every point, the shorter ($8A14) when the
  // running error reaches the longer, from half of it. The steps are at $8A16-$8A19. Every
  // register kept.
  P.def(0xA803, 'draw_line', () => {
    let b = 0, c = 0;
    let dx = (M[0x8A10] - M[0x8A0E]) & 0xFFFF;
    if (dx) { b = 1; if (sgn16(dx)) { b = 0xFF; dx = (-dx) & 255; } }
    let dy = (M[0x8A11] - M[0x8A0F]) & 0xFFFF;
    if (dy) { c = 1; if (sgn16(dy)) { c = 0xFF; dy = (-dy) & 255; } }
    let major;
    if (!sgn16((dy - dx) & 0xFFFF)) {
      setw(0x8A12, dy); setw(0x8A14, dx);
      M[0x8A16] = 0; M[0x8A19] = 0; M[0x8A18] = b; M[0x8A17] = c;
      major = dy;
    } else {
      setw(0x8A12, dx); setw(0x8A14, dy);
      M[0x8A17] = 0; M[0x8A18] = 0; M[0x8A16] = b; M[0x8A19] = c;
      major = dx;
    }
    let x = M[0x8A0E], y = M[0x8A0F], n = (major + 1) & 255, de = (major & 255) >> 1;
    do {
      P.N.linePoints = (P.N.linePoints || 0) + 1;
      M[0x8A1A] = n;
      plot(x, y);
      x = (x + M[0x8A16]) & 255; y = (y + M[0x8A17]) & 255;
      const hl = (w(0x8A14) + de) & 0xFFFF;
      if (sgn16((hl - w(0x8A12)) & 0xFFFF)) de = hl;
      else {
        de = (hl - w(0x8A12)) & 0xFFFF;
        x = (x + M[0x8A18]) & 255; y = (y + M[0x8A19]) & 255;
      }
      n = (M[0x8A1A] - 1) & 255;
    } while (n);
    return {};
  });

  // find_object ($A8BA): object $8916 of area A (0 for the area the probe is in: the shared list at
  // $87A5 first, then the area's at ($8864)): IX at it and A = 0, or A = 1 when there is none. The
  // areas are found through the table of offsets at ($8914), $CF3E of them, from ($8912).
  P.def(0xA8BA, 'find_object', r => {
    const id = M[0x8916];
    let ix, n;
    if (!(r.a & 255)) {
      ix = 0x87A5;
      for (let b = M[0x890F] || 256; b > 0; b--) {
        if (M[(ix + 7) & 0xFFFF] === id) return { a: 0, ix };
        ix = (ix + M[(ix + 8) & 0xFFFF]) & 0xFFFF;
      }
      ix = w(0x8864); n = M[0x8863];
    } else {
      let hl = w(0x8914), found = false;
      ix = 0;
      for (let b = M[0xCF3E] || 256; b > 0; b--) {
        ix = (w(0x8912) + w(hl)) & 0xFFFF;
        hl = (hl + 2) & 0xFFFF;
        if ((r.a & 255) === M[(ix + 2) & 0xFFFF]) { found = true; break; }
      }
      if (!found) return { a: 1, ix };
      n = M[(ix + 1) & 0xFFFF];
      ix = (ix + 0x19) & 0xFFFF;
    }
    for (let b = n; b > 0; b--) {
      if (M[(ix + 7) & 0xFFFF] === id) return { a: 0, ix };
      ix = (ix + M[(ix + 8) & 0xFFFF]) & 0xFFFF;
    }
    return { a: 1, ix };
  });

  // plot ($A926): flips the pixel at x = C - 1 on the row B of the screen table at ($8A1B). Every
  // register kept.
  P.def(0xA926, 'plot', r => {
    const x = (r.c - 1) & 255, row = w((w(0x8A1B) + 2 * (r.b & 255)) & 0xFFFF);
    const a = (row + (x >> 3)) & 0xFFFF;
    M[a] ^= 0x80 >> (x & 7);
    return {};
  });

  // aim_command ($A95C): commands $15-$1E. $1E swaps the keys' two meanings ($88AC: turning or
  // moving the crosshair), redrawing the key panel and showing the crosshair; $15 shows or hides
  // the crosshair ($88AD); each with a pause of 9 frames. With the crosshair shown ($88A2), $17-$1A
  // move it a pixel within the view, and $16 fires the laser at it: four lines from the view's
  // corners drawn, sound 1, rubbed out, then the object under the crosshair found (pick_object).
  P.def(0xA95C, 'aim_command', function* (r) {
    const a = r.a & 255;
    const centre = () => { M[0x88A0] = M[0x88D9]; M[0x88A1] = M[0x88DA]; P.crosshair({}); };
    const pause = function* () { M[0x8FC2] = 9; yield* P.until0(0x8FC2, 0xFF, 29); };
    if (a === 0x1E) {
      M[0x88AC] ^= 0xFF;
      const hl = w(0x8920);
      setw(0x8920, 1);
      P.update_panel({});
      setw(0x8920, hl);
      P.play_sound({ a: 0x13 });
      if (M[0x88AC]) {
        if (!M[0x88A2]) { M[0x88A2] = 0xFF; centre(); }
      } else {
        if (M[0x88A2]) P.crosshair({});
        M[0x88A2] = M[0x88AD];
        if (M[0x88A2]) centre();
      }
      yield* pause();
      return {};
    }
    if (a === 0x15) {
      if (M[0x88AC]) return {};
      M[0x88AD] ^= 0xFF;
      M[0x88A2] = M[0x88AD];
      if (M[0x88A2]) centre(); else P.crosshair({});
      yield* pause();
      return {};
    }
    if (!M[0x88A2]) return {};
    // a pixel a pass; plug-in point: the pixels of it this pass takes
    const moveBy = f => { for (let n = P.plug.step(a, 1); n > 0; n--) { P.crosshair({}); f(); P.crosshair({}); P.N.delay = (P.N.delay || 0) + 1; } };
    if (a === 0x18) moveBy(() => { if (M[0x88A0] !== 1) M[0x88A0]--; });
    else if (a === 0x17) moveBy(() => { if (((M[0x88D9] * 2) & 255) !== M[0x88A0]) M[0x88A0]++; });
    else if (a === 0x1A) moveBy(() => { if (((M[0x88DA] * 2) & 255) !== M[0x88A1]) M[0x88A1]++; });
    else if (a === 0x19) moveBy(() => { if (M[0x88A1] !== 1) M[0x88A1]--; });
    else if (a === 0x16) {
      M[0x8A10] = M[0x88A0]; M[0x8A11] = M[0x88A1];
      const right = (M[0x88D9] * 2) & 255;
      for (let b = 2; ; ) {
        M[0x8A0E] = 1; M[0x8A0F] = 5; P.draw_line({});
        M[0x8A0E] = right; P.draw_line({});
        M[0x8A0E] = 5; M[0x8A0F] = 1; P.draw_line({});
        M[0x8A0E] = (right - 5) & 255; P.draw_line({});
        if (!--b) break;
        P.play_sound({ a: 1 });
      }
      P.pick_object({});
      M[0x8A64] = 1; M[0x8BF1] = 1;
    }
    return {};
  });

  // crosshair ($AAA0): flips the crosshair at ($88A0, $88A1): two pixels on each side of the
  // centre, a pixel's gap from it, fewer where the view's edge comes first. BC and AF kept.
  P.def(0xAAA0, 'crosshair', () => {
    let x = M[0x88A0], y = M[0x88A1], a;
    a = (x - 2) & 255;
    if (x !== 1 && x !== 2) {
      if (a === 1) plot(x - 2, y); else { plot(x - 2, y); plot(x - 3, y); }
    }
    a = (M[0x88D9] * 2) & 255;
    if (a !== x) {
      a = (a - 1 - x) & 255;
      if (a) { if (a === 1) plot(x + 2, y); else { plot(x + 2, y); plot(x + 3, y); } }
    }
    a = (M[0x88DA] * 2) & 255;
    if (a !== y) {
      a = (a - 1 - y) & 255;
      if (a) { if (a === 1) plot(x, y + 2); else { plot(x, y + 2); plot(x, y + 3); } }
    }
    if (y && y !== 1) {
      if (((y - 1) & 255) === 1) plot(x, y - 2); else { plot(x, y - 2); plot(x, y - 3); }
    }
    return {};
  });

  // copy_view ($9BF7): the view buffer at ($8A95) to the screen, a row of ($88DD) bytes at a time
  // to the rows of the table at ($8A1B), from the top row down (the buffer holds the top row first), all but the bottom one; then the
  // sound queued in $8A1F. Every register kept.
  P.def(0x9BF7, 'copy_view', () => {
    let ix = (w(0x8A1B) + 2 * ((w(0x88DB) - 1) & 0xFFFF)) & 0xFFFF, hl = w(0x8A95);
    const bc = w(0x88DD);
    for (let n = ((M[0x88DB] - 1) & 255) || 256; n > 0; n--) {
      let de = w(ix);
      ix = (ix - 2) & 0xFFFF;
      for (let k = bc || 0x10000; k > 0; k--) { M[de] = M[hl]; de = (de + 1) & 0xFFFF; hl = (hl + 1) & 0xFFFF; }
    }
    P.N.copied = (P.N.copied || 0) + 1;
    if (M[0x8A1F]) P.play_sound({ a: M[0x8A1F] });
    M[0x8A1F] = 0;
    return {};
  });

  // dissolve ($AB25): copy_view's copy in four passes, each every fourth byte of every row from an
  // offset that steps through the pattern at $AB15 row by row, so the new view dissolves in; then
  // the sound queued in $8A1F. Every register kept.
  P.def(0xAB25, 'dissolve', () => {
    for (let pass = 4; pass > 0; pass--) {
      const pat = (0xAB15 + ((pass - 1) << 2)) & 0xFFFF;
      setw(0xAB13, pat);
      const bc = (w(0x88DB) - 1) & 0xFFFF;
      let ix = (w(0x8A1B) + 2 * bc) & 0xFFFF, hl = w(0x8A95);
      let rows = (M[0x88DB] - 1) & 255;
      let iy = (pat + ((bc & 0xFF00) | (rows & 3))) & 0xFFFF;
      for (;;) {
        const off = M[iy];
        let de = (w(ix) + off) & 0xFFFF, src = (hl + off) & 0xFFFF;
        ix = (ix - 2) & 0xFFFF;
        const width = M[0x88DD];
        let n = width >> 2;
        const r4 = (width & 3) - off;
        if (r4 !== 0 && !((r4 & 0x80))) n++;
        for (let k = (n & 255) || 256; k > 0; k--) { M[de] = M[src]; src = (src + 4) & 0xFFFF; de = (de + 4) & 0xFFFF; }
        hl = (hl + width) & 0xFFFF;
        rows = (rows - 1) & 255;
        if (!rows) break;
        iy = (iy + 1) & 0xFFFF;
        if (!(rows & 3)) iy = w(0xAB13);
      }
    }
    P.N.copied = (P.N.copied || 0) + 1;
    if (M[0x8A1F]) P.play_sound({ a: M[0x8A1F] });
    M[0x8A1F] = 0;
    return {};
  });

  // pick_object ($B153): the object under the crosshair, its number to $8A69: the faces drawn, from
  // the nearest (the end of the list at ($8A9D)) back; a face whose count has bit 7 set is the
  // object at once; otherwise each polygon whose corners lie both sides of the crosshair (or on its
  // row or column) has its edges crossed with the crosshair's row, up to five crossings kept at
  // $B14E, and it is hit when one is the crosshair's column or they lie both sides of it. Every
  // register kept.
  P.def(0xB153, 'pick_object', () => {
    const faces = M[0x8918];
    if (!faces) return {};
    let iy = (w(0x8A9D) + 4 * ((faces - 1) & 255)) & 0xFFFF;
    const cx = M[0x88A0], cy = M[0x88A1];
    const cmp = (v, to) => { const d = (v - to) & 0xFFFF; return d === 0 ? 0 : sgn16(d) ? -1 : 1; };
    for (let fb = faces; fb > 0; fb--, iy = (iy - 4) & 0xFFFF) {
      let hl = w(iy);
      const id = M[hl], cnt = M[(hl + 1) & 0xFFFF];
      if (!cnt) continue;
      if (cnt & 0x80) { M[0x8A69] = id; return {}; }
      let ix = (hl + 2) & 0xFFFF;
      for (let pb = cnt; pb > 0; pb--) {
        setw(0xB14B, ix);
        const pts = M[ix] & 0x0F;
        ix = (ix + 1) & 0xFFFF;
        let a = 0;
        for (let k = pts || 256; k > 0; k--) {
          const sx = cmp(M[ix], cx), sy = cmp(M[(ix + 1) & 0xFFFF], cy);
          a |= sx === 0 ? 4 : sx > 0 ? 2 : 1;
          a |= sy === 0 ? 0x20 : sy > 0 ? 0x10 : 8;
          ix = (ix + 2) & 0xFFFF;
        }
        if (!(a & 0x20) && (!(a & 0x10) || !(a & 8))) continue;
        if (!(a & 4) && (!(a & 2) || !(a & 1))) continue;
        if (hitPolygon(cx, cy)) { M[0x8A69] = id; return {}; }
      }
    }
    return {};
  });
  // the edges of the polygon at ($B14B) against the crosshair's row; true when it is hit
  function hitPolygon(cx, cy) {
    const at = w(0xB14B), n = M[at] & 0x0F;
    for (let k = 0; k < 2 * n; k++) M[(0x8A6B + k) & 0xFFFF] = M[(at + 1 + k) & 0xFFFF];
    let edges = n;
    const end = (0x8A6B + 2 * n) & 0xFFFF;
    if (n === 2) edges = 1;
    else { M[end] = M[(at + 1) & 0xFFFF]; M[(end + 1) & 0xFFFF] = M[(at + 2) & 0xFFFF]; }
    M[0xB14D] = 0;
    let iy = 0x8A6B;
    for (let eb = edges || 256; eb > 0; eb--, iy = (iy + 2) & 0xFFFF) {
      const x0 = M[iy], y0 = M[iy + 1], x1 = M[iy + 2], y1 = M[iy + 3];
      const d0 = (y0 - cy) & 0xFFFF, d1 = (y1 - cy) & 0xFFFF;
      if (d0 && d1) {
        const f = (sgn16(d0) ? 1 : 2) | (sgn16(d1) ? 1 : 2);
        if (f !== 3) continue;
      }
      if (y0 === y1) return true;
      let x;
      if (x0 === x1) x = x0;
      else {
        const dx = (x1 - x0) & 0xFFFF;
        // (y1 - y0) x 128 as 24 bits, divided by dx
        const dy = ((y1 - y0) << 7) & 0xFFFFFF;
        const q = P.div_24_16({ a: dy >> 16, hl: dy & 0xFFFF, de: dx });
        const qhl = q.hl & 0xFFFF;
        const m = P.mul_16x8({ hl: qhl, a: x0 });
        const t = ((cy - y0) << 7) & 0xFFFFFF;
        const lo = ((m.hl & 0xFFFF) + (t & 0xFFFF));
        const top = ((m.a & 255) + (t >> 16) + (lo > 0xFFFF ? 1 : 0)) & 255;
        const r = P.div_24_16({ a: top, hl: lo & 0xFFFF, de: qhl });
        x = r.l & 255;
      }
      const k = (M[0xB14D] + 1) & 255;
      if (k !== 6) { M[0xB14D] = k; M[(0xB14D + k) & 0xFFFF] = x; }
    }
    const k = M[0xB14D];
    if (!k) return false;
    let a = 0;
    for (let j = 0; j < k; j++) {
      const d = (M[(0xB14E + j) & 0xFFFF] - cx) & 0xFFFF;
      if (!d) return true;
      a |= sgn16(d) ? 1 : 2;
    }
    return a === 3;
  }
};
})(typeof window !== 'undefined' ? window : globalThis);
