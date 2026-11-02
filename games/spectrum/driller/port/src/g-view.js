// The 3D view ($6B12-$8761): the area's objects culled, turned through the view matrix, clipped,
// projected, sorted for the painter's method and filled into the view buffer row by row.
(function (root) {
'use strict';
const G = root.DRGroups = root.DRGroups || {};

G.view = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const neg = v => (-v) & 0xFFFF;
  const sgn16 = v => (v & 0x8000) !== 0;          // the sign flag of a word result
  const sgn8 = v => (v & 0x80) !== 0;             // the sign flag of a byte result
  const copy = (src, dst, n) => { for (let i = 0; i < n; i++) M[(dst + i) & 0xFFFF] = M[(src + i) & 0xFFFF]; };
  // a routine called with r, its registers after: what it gives back over what it was given
  const call = (f, r) => Object.assign({}, r, f(r));

  // draw_view: the 3D view when bit 2 of $8920 asks for a redraw, the last one again when bit 3
  // of $8921 does.
  P.def(0x6B12, 'draw_view', () => {
    M[(w(0x8BF3) + 1) & 0xFFFF] = M[0x8A65];
    if (M[0x8920] & 4) {
      P.bound_view_box({});
      P.make_view_matrix({});
      P.make_multipliers({});
      M[0x8A24] = 0;
      setw(0x8A62, 0x8A26);
      if (M[0x8863]) P.draw_object_list({ ix: w(0x8864), a: M[0x8863] });
      P.draw_object_list({ ix: 0x87A5, a: M[0x890F] });
      M[(w(0x8BF3) + 2) & 0xFFFF] = M[0x8A65];
      P.sort_faces({});
      M[(w(0x8BF3) + 3) & 0xFFFF] = M[0x8A65];
      P.draw_faces({});
    } else if (M[0x8921] & 8) P.draw_faces({});
    return {};
  });

  // draw_object_list: A objects from IX, each culled against the view's box and handed to its
  // drawer with its corners in the object buffer.
  P.def(0x6B7C, 'draw_object_list', r => {
    let ix = r.ix & 0xFFFF, n = r.a & 255;
    do {
      setw(0x8BE2, ix);
      const t = M[ix] & 15;
      let draw = t !== 0;
      if (draw && t !== 2) {
        if (M[ix] & 0x40) draw = false;
        else {
          let hl = 0x88E5;
          for (let k = 0; k < 3; k++) {
            let a = M[(ix + 1 + k) & 0xFFFF];
            const d = (a - M[hl]) & 255;
            if (d !== 0 && !sgn8(d)) { draw = false; break; }
            a = (a + M[(ix + 4 + k) & 0xFFFF]) & 255;
            hl++;
            if (sgn8(a - M[hl])) { draw = false; break; }
            hl++;
          }
        }
      }
      if (draw) {
        let de = w(0x8BDE), a = 0;
        for (let k = 0; k < 3; k++) {
          const bc = w(0x8762 + 2 * k);
          let hl = ((M[(ix + 1 + k) & 0xFFFF] << 6) - bc) & 0xFFFF;
          if (hl !== 0 && !sgn16(hl)) a |= 0x40;
          a >>= 1;
          setw(de, hl); de = (de + 2) & 0xFFFF;
          hl = (hl + (M[(ix + 4 + k) & 0xFFFF] << 6)) & 0xFFFF;
          if (sgn16(hl)) a |= 0x40;
          a >>= 1;
          setw(de, hl); de = (de + 2) & 0xFFFF;
        }
        M[0x5E62] = a;
        M[0x8916] = M[(ix + 7) & 0xFFFF];
        M[0x5E61] = t;
        if (t === 1) P.draw_cuboid({});
        else if (t === 2) P.draw_sensor({});
        else if (t === 3) P.draw_rectangle({});
        else if (sgn8(t - 10)) P.draw_pyramid({});
        else P.draw_polygon({});
      }
      const at = w(0x8BE2);
      ix = (at + M[(at + 8) & 0xFFFF]) & 0xFFFF;
      n = (n - 1) & 255;
    } while (n !== 0);
    return { a: 0 };
  });

  // bound_view_box: the limits of the area's box ($88DF-$88E4) that bound what can be seen, by
  // the octants of the view's four corners, to $88E5-$88EA.
  P.def(0x6C53, 'bound_view_box', () => {
    for (let i = 0; i < 6; i++) M[0x88E5 + i] = 0xFF;
    let b = 0, c = 0;
    const half = () => M[0x88D7];
    for (let k = 4; k > 0; k--) {
      if (k === 1 || k === 2) { let a = (M[0x876D] + half()) & 255; if (!sgn8(a - 0x48)) a = (a - 0x48) & 255; b = a; }
      if (k === 1 || k === 3) { let a = (M[0x876C] + half()) & 255; if (!sgn8(a - 0x48)) a = (a - 0x48) & 255; c = a; }
      if (k === 3 || k === 4) { let a = (M[0x876D] - half()) & 255; if (sgn8(a)) a = (a + 0x48) & 255; b = a; }
      if (k === 2 || k === 4) { let a = (M[0x876C] - half()) & 255; if (sgn8(a)) a = (a + 0x48) & 255; c = a; }
      let d;
      if (sgn8(b - 0x12)) d = 1; else if (sgn8(b - 0x24)) d = 3; else if (sgn8(b - 0x36)) d = 5; else d = 7;
      if (sgn8(c - 0x12)) d = (d + 1) & 255;
      else if (sgn8(c - 0x24)) { let a = (5 + d) & 255; if (!sgn8(a - 9)) a = (a - 8) & 255; d = a; }
      else if (sgn8(c - 0x36)) { let a = (4 + d) & 255; if (!sgn8(a - 9)) a = (a - 8) & 255; d = a; }
      const set = (dst, src) => { M[dst] = M[src]; };
      switch (d) {
        case 1: set(0x88E5, 0x88DF); set(0x88E7, 0x88E1); set(0x88E9, 0x88E3); break;
        case 2: set(0x88E5, 0x88DF); set(0x88E8, 0x88E2); set(0x88E9, 0x88E3); break;
        case 3: set(0x88E5, 0x88DF); set(0x88E7, 0x88E1); set(0x88EA, 0x88E4); break;
        case 4: set(0x88E5, 0x88DF); set(0x88E8, 0x88E2); set(0x88EA, 0x88E4); break;
        case 5: set(0x88E6, 0x88E0); set(0x88E7, 0x88E1); set(0x88EA, 0x88E4); break;
        case 6: set(0x88E6, 0x88E0); set(0x88E8, 0x88E2); set(0x88EA, 0x88E4); break;
        case 7: set(0x88E6, 0x88E0); set(0x88E7, 0x88E1); set(0x88E9, 0x88E3); break;
        default: set(0x88E6, 0x88E0); set(0x88E8, 0x88E2); set(0x88E9, 0x88E3); break;
      }
    }
    for (let k = 0; k < 3; k++) {
      const h = ((w(0x8762 + 2 * k) * 4) & 0xFFFF) >> 8, lo = 0x88E5 + 2 * k;
      if (M[lo] === 0xFF) M[lo] = (h + 1) & 255;
      else if (M[lo + 1] === 0xFF) M[lo + 1] = h;
    }
    return {};
  });

  // make_multipliers: a multiply routine for each entry of the view matrix, written as Z80 code
  // into the buffer ($8A97 points to it), its address into the table at $8A83.
  P.def(0x6E25, 'make_multipliers', () => {
    let hl = 0x8A83, ix = w(0x8A97);
    for (let e = 0; e < 9; e++) {
      setw(hl, ix); hl += 2;
      let c = M[0x5E55 + e];
      const put = (...bytes) => { for (const b of bytes) { M[ix] = b; ix = (ix + 1) & 0xFFFF; } };
      if (c === 0) { put(0xC3, 0x81, 0x79); continue; }
      put(0x21, 0, 0, 0xAF, 0x0E);
      if (c & 0x80) { put(0xFF); c = (-c) & 255; } else put(0);
      let k = 8;
      while (k > 0) { const cy = c & 0x80; c = (c << 1) & 255; if (cy) break; k--; }
      if (k > 0) {
        put(0x19, 0xCE, 0x00);
        for (k--; k > 0; k--) {
          put(0x29, 0x17);
          const cy = c & 0x80; c = (c << 1) & 255;
          if (cy) put(0x19, 0xCE, 0x00);
        }
      }
      put(0xC3, 0x5E, 0x79);
    }
    return {};
  });

  // mul_matrix: the view matrix at $5E55 times the rotation at $5E4C, as R x V, into $5E55;
  // the nine sums are words at $5EEB, then divided by 64 and rounded.
  P.def(0x7896, 'mul_matrix', () => {
    let out = 0x5EEB;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        let de = 0;
        for (let k = 0; k < 3; k++) de = (de + P.mul_s8({ h: M[0x5E4C + 3 * i + k], l: M[0x5E55 + 3 * k + j] }).hl) & 0xFFFF;
        setw(out, de); out += 2;
      }
    }
    setw(0x5EFD, out);
    for (let e = 0; e < 9; e++) {
      const a = 0x5EEB + 2 * e;
      let lo = M[a], d = M[a + 1];
      for (let s = 0; s < 2; s++) { const cy = lo >> 7; lo = (lo << 1) & 255; d = ((d << 1) | cy) & 255; }
      M[a] = lo;
      if (lo & 0x80) d = (d + 1) & 255;
      M[0x5E55 + e] = d;
    }
    return {};
  });

  // make_view_matrix: the identity, turned by the pitch, the heading and the roll, then scaled
  // by $88D2-$88D4; then the buffers' pointers are reset for a new picture.
  P.def(0x6EE4, 'make_view_matrix', () => {
    copy(0x6EDB, 0x5E55, 9);
    const turn = (angle, cosAt, sinAt, negAt) => {
      const a = M[angle];
      if (!a) return;
      copy(0x6EDB, 0x5E4C, 9);
      const iy = 0x8E78 + 2 * a;
      M[cosAt[0]] = M[iy + 1]; M[cosAt[1]] = M[iy + 1];
      M[sinAt] = M[iy];
      M[negAt] = (-M[iy]) & 255;
      P.mul_matrix({});
    };
    turn(0x876D, [0x5E4C, 0x5E54], 0x5E52, 0x5E4E);
    turn(0x876C, [0x5E50, 0x5E54], 0x5E51, 0x5E53);
    turn(0x876E, [0x5E4C, 0x5E50], 0x5E4D, 0x5E4F);
    copy(0x6EDB, 0x5E4C, 9);
    M[0x5E4C] = M[0x88D2]; M[0x5E50] = M[0x88D3]; M[0x5E54] = M[0x88D4];
    P.mul_matrix({});
    setw(0x8BDE, w(0x8A9B));
    setw(0x8BDC, w(0x8A99));
    setw(0x8BE0, w(0x8A9D));
    M[0x8918] = 0; M[0x8A6A] = 0;
    return {};
  });

  // The routine make_multipliers wrote at a: the entry's magnitude and sign, read from its code,
  // and how many adds and doublings it runs (ops), which the page's clock counts.
  function readMultiplier(a) {
    if (M[a] === 0xC3) {
      if (w(a + 1) !== 0x7981) throw new Error('rotate_vertices: a multiply routine at $' + a.toString(16) + ' that jumps to $' + w(a + 1).toString(16));
      return null;
    }
    if (M[a] !== 0x21 || M[a + 3] !== 0xAF || M[a + 4] !== 0x0E) throw new Error('rotate_vertices: no multiply routine at $' + a.toString(16));
    const sign = M[a + 5];
    let p = a + 6, m = 0;
    for (let n = 0; n < 40; n++) {
      if (M[p] === 0x19 && M[p + 1] === 0xCE && M[p + 2] === 0) { m += 1; p += 3; }
      else if (M[p] === 0x29 && M[p + 1] === 0x17) { m *= 2; p += 2; }
      else if (M[p] === 0xC3 && w(p + 1) === 0x795E) return { m, sign, ops: n };
      else throw new Error('rotate_vertices: a multiply routine at $' + a.toString(16) + ' with $' + M[p].toString(16) + ' at $' + p.toString(16));
    }
    throw new Error('rotate_vertices: a multiply routine at $' + a.toString(16) + ' that does not end');
  }

  // rotate_vertices: the $8A7F vertices at $5E63 through the multiply routines into $5E9F.
  P.def(0x7915, 'rotate_vertices', () => {
    const n = M[0x8A7F];
    let cnt = (((n * 2) & 255) * 3 - 1) & 255;
    M[0x5E9F] = 0;
    copy(0x5E9F, 0x5EA0, cnt || 0x10000);
    const mul = [];
    for (let e = 0; e < 9; e++) mul.push(readMultiplier(w(0x8A83 + 2 * e)));
    let vin = 0x5E63, out = 0x5E9F;
    for (let v = n || 256; v > 0; v--) {
      for (let row = 0; row < 3; row++) {
        for (let k = 0; k < 3; k++) {
          const f = mul[row * 3 + k];
          if (!f) continue;
          P.N.mulOps = (P.N.mulOps || 0) + f.ops + 1;
          let de = w(vin + 2 * k), b = 0;
          if (de & 0x8000) { b = 0xFF; de = neg(de); }
          let acc = (f.m * de) % 0x1000000;
          acc = (acc * 4) % 0x1000000;
          let r = acc >> 8 & 0xFFFF;
          if (b !== f.sign) r = neg(r);
          setw(out, w(out) + r);
        }
        out = (out + 2) & 0xFFFF;
      }
      vin = (vin + 6) & 0xFFFF;
    }
    setw(0x5EFF, out);
    setw(0x5F01, vin);
    return {};
  });

  // clip_edge: the vertex before IX moved along the edge to IX onto the clip plane $5EDB.
  P.def(0x799E, 'clip_edge', r => {
    const ix = r.ix & 0xFFFF;
    const g = d => w((ix + d) & 0xFFFF), s = (d, v) => setw((ix + d) & 0xFFFF, v);
    const mul2 = (hl, t1, t2) => { const m = call(P.mul_16x16, { hl, de: t1 }); return call(P.div_32_16, { hl: m.hl, de: m.de, bc: t2 }).hl; };
    const p = M[0x5EDB];
    // prev x, y, z at -6, -4, -2; this x, y, z at 0, 2, 4
    if (p === 1 || p === 2) {
      const a = p === 1 ? -6 : -4, ac = p === 1 ? 0 : 2, o = p === 1 ? -4 : -6, oc = p === 1 ? 2 : 0;
      const t1 = (g(a) + g(-2)) & 0xFFFF;
      const t2 = (g(a) - g(ac) - g(4) + g(-2)) & 0xFFFF;
      const t3 = (g(4) - g(-2)) & 0xFFFF;
      const z = (mul2(t3, t1, t2) + g(-2)) & 0xFFFF;
      s(-2, z);
      s(a, neg(z));
      const t4 = (g(oc) - g(o)) & 0xFFFF;
      s(o, (mul2(t4, t1, t2) + g(o)) & 0xFFFF);
    } else if (p === 3 || p === 4) {
      const a = p === 3 ? -6 : -4, ac = p === 3 ? 0 : 2, o = p === 3 ? -4 : -6, oc = p === 3 ? 2 : 0;
      const t1 = (g(-2) - g(a)) & 0xFFFF;
      const t2 = (g(ac) - g(a) - g(4) + g(-2)) & 0xFFFF;
      const t3 = (g(4) - g(-2)) & 0xFFFF;
      const z = (mul2(t3, t1, t2) + g(-2)) & 0xFFFF;
      s(-2, z);
      s(a, z);
      const t4 = (g(oc) - g(o)) & 0xFFFF;
      s(o, (mul2(t4, t1, t2) + g(o)) & 0xFFFF);
    } else {
      const t1 = g(-2);
      const t2 = (g(-2) - g(4)) & 0xFFFF;
      M[(ix - 1) & 0xFFFF] = 0; M[(ix - 2) & 0xFFFF] = 0;
      const t3 = (g(0) - g(-6)) & 0xFFFF;
      s(-6, (mul2(t3, t1, t2) + g(-6)) & 0xFFFF);
      const t4 = (g(2) - g(-4)) & 0xFFFF;
      s(-4, (mul2(t4, t1, t2) + g(-4)) & 0xFFFF);
    }
    return {};
  });

  // clip_classify: A = 0 when the vertex at IX is inside the clip plane $5EDB, 1 outside, $FF on it.
  P.def(0x7C37, 'clip_classify', r => {
    const ix = r.ix & 0xFFFF, z = w(ix + 4), p = M[0x5EDB];
    let hl;
    if (p === 1 || p === 2) hl = (w(ix + (p === 1 ? 0 : 2)) + z) & 0xFFFF;
    else if (p === 3 || p === 4) hl = (z - w(ix + (p === 3 ? 0 : 2))) & 0xFFFF;
    else return { a: sgn16(z) ? 1 : z === 0 ? 0xFF : 0 };
    return { a: hl === 0 ? 0xFF : sgn16(hl) ? 1 : 0 };
  });

  // project_vertices: the $8A7F turned vertices at $5E9F to screen points (x, y bytes) at $8A6B.
  P.def(0x7C9D, 'project_vertices', () => {
    let ix = 0x5E9F, hl = 0x8A6B;
    const cx = M[0x88D9], cy = M[0x88DA];
    const one = (v, z, c) => {
      if (sgn16(v)) {
        if (sgn16((v + z - 1) & 0xFFFF)) return 0;
      } else if (!sgn16((v - z) & 0xFFFF)) return (c * 2) & 255;
      const m = call(P.mul_16x8, { hl: v, a: c });
      const q = call(P.div_24_16, { a: m.a, hl: m.hl, de: z, l: m.hl & 255 });
      return (c + q.l) & 255;
    };
    for (let n = M[0x8A7F] || 256; n > 0; n--) {
      const z = w(ix + 4);
      if (z === 0) { M[hl++] = cx; M[hl++] = cy; }
      else { M[hl++] = one(w(ix), z, cx); M[hl++] = one(w(ix + 2), z, cy); }
      ix += 6;
    }
    return {};
  });

  // transform_vertices: rotate_vertices, then for each clip plane from $8A80 down to 1 whether
  // every vertex is outside it. $5E5F = 1 when none is, $5E5E = 1 when some vertex was outside
  // one of the planes tested.
  P.def(0x7D46, 'transform_vertices', () => {
    P.rotate_vertices({});
    M[0x5E5E] = 0;
    let l = M[0x8A80], a = l;
    for (;;) {
      M[0x5EDB] = a;
      let c = 0, ix = 0x5E9F;
      for (let n = M[0x8A7F] || 256; n > 0; n--) {
        const k = P.clip_classify({ ix }).a;
        if (k !== 1) c = 1; else M[0x5E5E] = k;
        ix += 6;
      }
      if (!c) { a = 0; break; }
      l = (l - 1) & 255; a = l;
      if (!l) { a = 1; break; }
    }
    M[0x5E5F] = a;
    return {};
  });

  // The six bytes before a and before b the same.
  const same6 = (a, b) => { for (let i = 1; i <= 6; i++) if (M[(a - i) & 0xFFFF] !== M[(b - i) & 0xFFFF]) return false; return true; };

  // clip_polygon: the $8A7F turned vertices at $5E9F clipped against each plane from $8A80 down
  // to 1, Sutherland and Hodgman's way, through $5F03; $8A7F the corners left (0 when fewer than
  // two).
  P.def(0x7D8C, 'clip_polygon', () => {
    M[0x5EDB] = M[0x8A80];
    for (;;) {
      let ix = 0x5E9F, iy = 0x5F40, h = 0, l = 0;
      const n = M[0x8A7F];
      for (let k = n || 256; k > 0; k--) {
        const a = P.clip_classify({ ix }).a;
        M[iy] = a;
        if (a === 0) l = (l + 1) & 255; else if (a !== 0xFF) h = (h + 1) & 255;
        iy++; ix += 6;
      }
      if (h !== 0) {
        if (l === 0) { M[0x8A7F] = 0; return {}; }
        ix = 0x5E9F; iy = 0x5F40;
        M[0x5F3F] = 0;
        if (n !== 2) copy(0x5E9F, (0x5E9F + ((((n * 2) & 255) * 3) & 255)) & 0xFFFF, 6);
        let de = 0x5F03;
        for (let k = n || 256, first = true; k > 0; k--, first = false) {
          if (!first) {
            const a = M[iy], b = M[(iy - 1) & 0xFFFF];
            if (a !== b && a !== 0xFF && b !== 0xFF) {
              P.clip_edge({ ix });
              if (!(M[0x5F3F] && same6(de, ix))) {
                copy((ix - 6) & 0xFFFF, de, 6); de = (de + 6) & 0xFFFF;
                M[0x5F3F] = (M[0x5F3F] + 1) & 255;
              }
            }
          }
          if (M[iy] !== 1) {
            if (!(M[0x5F3F] && same6(de, ix + 6))) {
              copy(ix, de, 6); de = (de + 6) & 0xFFFF;
              M[0x5F3F] = (M[0x5F3F] + 1) & 255;
            }
          }
          ix += 6; iy++;
        }
        if (M[0x8A7F] !== 2) {
          const a = M[0x5F40], b = M[(iy - 1) & 0xFFFF];
          if (a !== b && a !== 0xFF && b !== 0xFF) {
            P.clip_edge({ ix });
            if (M[0x5F3F] && !same6(de, ix)) {
              copy((ix - 6) & 0xFFFF, de, 6); de = (de + 6) & 0xFFFF;
              M[0x5F3F] = (M[0x5F3F] + 1) & 255;
            }
          }
        }
        const m = M[0x5F3F];
        M[0x8A7F] = m;
        if (sgn8(m - 2)) { M[0x8A7F] = 0; return {}; }
        copy(0x5F03, 0x5E9F, (((m * 2) & 255) * 3) & 255 || 0x10000);
      }
      M[0x5EDB] = (M[0x5EDB] - 1) & 255;
      if (!M[0x5EDB]) return {};
    }
  });

  // face_side: which way round the three screen points at HL go, by the third against the line
  // through the first two: 0 or 1 by side, 1 when they are in a line.
  P.def(0x7EE5, 'face_side', r => {
    const ix = (r.hl !== undefined ? r.hl : (r.h << 8 | r.l)) & 0xFFFF;
    const b = i => M[(ix + i) & 0xFFFF];
    const flip = a => (-((a - 1) & 255)) & 255;
    if (b(0) === b(2)) {
      if (b(0) === b(4)) return { a: 1 };
      let a = sgn16(b(1) - b(3)) ? 0 : 1;
      if (sgn16(b(4) - b(2))) return { a };
      return { a: flip(a) };
    }
    if (b(1) === b(3)) {
      if (b(1) === b(5)) return { a: 1 };
      let a = sgn16(b(0) - b(2)) ? 0 : 1;
      if (sgn16(b(3) - b(5))) return { a };
      return { a: flip(a) };
    }
    M[0x5F4C] = 0;
    const swap = () => {
      for (let i = 0; i < 6; i += 2) { const t = M[(ix + i) & 0xFFFF]; M[(ix + i) & 0xFFFF] = M[(ix + i + 1) & 0xFFFF]; M[(ix + i + 1) & 0xFFFF] = t; }
    };
    const dx = (b(2) - b(0)) & 0xFFFF, adx = sgn16(dx) ? (b(0) - b(2)) & 0xFFFF : dx;
    const dy = (b(3) - b(1)) & 0xFFFF, ady = sgn16(dy) ? (b(1) - b(3)) & 0xFFFF : dy;
    let num = dy, den = dx;
    if (!sgn16((ady - adx) & 0xFFFF)) {
      swap();
      M[0x5F4C] = 1;
      num = dx; den = dy;
    }
    // the slope, num x 2048 / den, as a word
    const n24 = ((num << 8) * 8) % 0x1000000;
    const slope = call(P.div_24_16, { a: n24 >> 16, hl: n24 & 0xFFFF, de: den }).hl;
    setw(0x5F4A, slope);
    const low24 = m => (((m.de & 255) << 16) | m.hl) >>> 0;
    const m0 = call(P.mul_16x16, { hl: slope, de: b(0) });
    const by = (b(1) * 2048) % 0x1000000;
    const icpt = (by - low24(m0) + 0x1000000) % 0x1000000;
    const m2 = call(P.mul_16x16, { hl: slope, de: b(4) });
    const t = (low24(m2) + icpt) % 0x1000000;
    const d = ((b(5) * 2048) % 0x1000000 - t + 0x1000000) % 0x1000000;
    let res;
    if (d === 0) {
      res = 1;
      if (M[0x5F4C]) swap();
      return { a: res };
    }
    const hb = d >> 16;
    let a = sgn16(b(1) - b(3)) ? 0 : 1;
    if (hb & 0x80) a = flip(a);
    let bb = a;
    const sy = sgn16(b(3) - b(1)) ? 1 : 0, sx = sgn16(b(2) - b(0)) ? 1 : 0;
    if (sy !== sx) bb = flip(bb);
    if (!M[0x5F4C]) return { a: bb };
    bb = flip(bb);
    swap();
    return { a: bb };
  });

  // fill_face: the span table at $8A9F from row $8919 up to $891B filled into the view buffer in
  // the pattern of colour $8917, four rows to a pattern.
  P.def(0x80C0, 'fill_face', () => {
    let a = M[0x8919];
    let iy = (w(0x8A9F) + 3 * a) & 0xFFFF;
    const off = P.mul_s8({ h: (M[0x88DB] - 1 - a) & 255, l: M[0x88DD] }).hl;
    let hl = (w(0x8A95) + off) & 0xFFFF;
    const pat = (w(0x891D) + ((((M[0x8917] - 1) & 255) * 4) & 255)) & 0xFFFF;
    const N = P.N;
    for (;;) {
      N.fillRows = (N.fillRows || 0) + 1;
      const px = M[(pat + (a & 3)) & 0xFFFF];
      let p = hl;
      const st = M[iy];
      if (st) {
        M[iy] = 0;
        let e = M[(iy + 1) & 0xFFFF], d = 0, b;
        let run = true;
        if (st === 1) { b = 1; }
        else {
          const l = (M[(iy + 2) & 0xFFFF] - e) & 0xFFFF;
          let aa = l & 255;
          if (sgn16(l)) { e = M[(iy + 2) & 0xFFFF]; aa = (-aa) & 255; }
          b = (aa + 1) & 255;
        }
        let skipPartial = false;
        if (e === 0) {
          b = (b - 1) & 255;
          if (b === 0) run = false; else skipPartial = true;
        }
        if (run) {
          if (!skipPartial) {
            e = (e - 1) & 255;
            const bit = e & 7;
            p = (p + (e >> 3)) & 0xFFFF;
            if (bit) {
              let t = 0x80B9 + bit - 1, c = bit;
              for (;;) {
                N.fillBits = (N.fillBits || 0) + 1;
                d |= M[t]; t++;
                b = (b - 1) & 255;
                if (b === 0) break;
                c++;
                if (c === 8) break;
              }
              M[p] = (M[p] & ~d & 255) | (px & d);
              p = (p + 1) & 0xFFFF;
            }
          }
          const c = b;
          N.fillBytes = (N.fillBytes || 0) + (b >> 3);
          for (let k = b >> 3; k > 0; k--) { M[p] = px; p = (p + 1) & 0xFFFF; }
          const rem = c & 7;
          if (rem) {
            const mask = M[0x80B2 + rem - 1];
            M[p] = (M[p] & ~mask & 255) | (px & mask);
          }
        }
      }
      if (a === M[0x891B]) break;
      hl = (hl + w(0x88DD)) & 0xFFFF;
      a = (a - 1) & 255;
      iy = (iy - 3) & 0xFFFF;
    }
    return {};
  });

  // Record the object whose faces went to the list at ($8BDC), up to hl: its entry in the draw
  // list ($8BE0) points at them and at its corners ($8BDE), and the corners move on.
  const recordObject = hl => {
    const de = w(0x8BDC);
    setw(0x8BDC, hl);
    let e = w(0x8BE0);
    setw(e, de); e += 2;
    const o = w(0x8BDE);
    setw(e, o); e += 2;
    setw(0x8BE0, e);
    setw(0x8BDE, (o + 12) & 0xFFFF);
    M[0x8918] = (M[0x8918] + 1) & 255;
  };
  // The colour and corner count byte of a face, by $5E60: as it is (0), only when its corners go
  // one way round (1), or with the colour of the side seen (2); null when it is not drawn.
  const faceByte = (c, hl) => {
    const mode = M[0x5E60];
    if (mode === 0) return c;
    if (mode === 1) return P.face_side({ hl }).a ? null : c;
    c &= 0x0F;
    const side = P.face_side({ hl }).a, col = M[0x8917];
    if (side) { const a = col & 0xF0; return a ? a | c : null; }
    const a = col & 0x0F;
    return a ? ((a << 4) & 255) | c : null;
  };

  // draw_face_list: the faces at IY of an object wholly in front, projected, into the face list.
  P.def(0x81B6, 'draw_face_list', r => {
    let iy = r.iy & 0xFFFF;
    P.project_vertices({});
    M[0x5E5F] = 0;
    let hl = w(0x8BDC);
    M[hl] = M[0x8916]; M[(hl + 1) & 0xFFFF] = 0; hl = (hl + 2) & 0xFFFF;
    let n = M[iy]; iy = (iy + 1) & 0xFFFF;
    do {
      const col = M[iy], b = M[(iy + 1) & 0xFFFF];
      iy = (iy + 2) & 0xFFFF;
      if (col === 0) iy = (iy + b) & 0xFFFF;
      else {
        let c = ((col << 4) & 255) | b;
        let de = (hl + 1) & 0xFFFF;
        for (let k = b || 256; k > 0; k--) {
          const i = (M[iy] << 1) & 255; iy = (iy + 1) & 0xFFFF;
          copy(0x8A6B + i, de, 2); de = (de + 2) & 0xFFFF;
        }
        const fc = faceByte(c, (hl + 1) & 0xFFFF);
        if (fc !== null) {
          M[0x5E5F] = 1;
          const cnt = (w(0x8BDC) + 1) & 0xFFFF;
          M[cnt] = (M[cnt] + 1) & 255;
          M[hl] = fc;
          hl = (hl + ((b << 1) & 255) + 1) & 0xFFFF;
        }
      }
      n = (n - 1) & 255;
    } while (n !== 0);
    if (M[0x5E5F]) recordObject(hl);
    return {};
  });

  // clip_face_list: the faces at IY of an object some corner of which is outside a clip plane,
  // each clipped (clip_polygon) and projected, into the face list. A four-cornered face that
  // fills the whole view ends the object there and is flagged (bit 7 of its count, $8A6A).
  P.def(0x828D, 'clip_face_list', r => {
    let iy = r.iy & 0xFFFF;
    copy(0x5E9F, 0x5E63, (((M[0x8A7F] * 2) & 255) * 3) & 255 || 0x10000);
    M[0x5E5F] = 0;
    let hl = w(0x8BDC);
    M[hl] = M[0x8916]; M[(hl + 1) & 0xFFFF] = 0; hl = (hl + 2) & 0xFFFF;
    let n = M[iy]; iy = (iy + 1) & 0xFFFF;
    let full = false;
    do {
      const col = M[iy], b0 = M[(iy + 1) & 0xFFFF];
      iy = (iy + 2) & 0xFFFF;
      if (col === 0) iy = (iy + b0) & 0xFFFF;
      else {
        let c = ((col << 4) & 255) | b0;
        M[0x8A7F] = b0;
        let de = 0x5E9F;
        for (let k = b0 || 256; k > 0; k--) {
          const i = (M[iy] * 6) & 255; iy = (iy + 1) & 0xFFFF;
          copy(0x5E63 + i, de, 6); de = (de + 6) & 0xFFFF;
        }
        P.clip_polygon({});
        const b = M[0x8A7F];
        if (b) {
          c = (c & 0xF0) | b;
          P.project_vertices({});
          const fc = faceByte(c, 0x8A6B);
          if (fc !== null) {
            M[0x5E5F] = 1;
            const cnt = (w(0x8BDC) + 1) & 0xFFFF;
            M[cnt] = (M[cnt] + 1) & 255;
            M[hl] = fc; hl = (hl + 1) & 0xFFFF;
            copy(0x8A6B, hl, (b << 1) & 255 || 0x10000);
            hl = (hl + ((b << 1) & 255)) & 0xFFFF;
            if (M[0x8A7F] === 4) {
              let p = (hl - 8) & 0xFFFF, cc = 0, ok = true;
              const dd = (M[0x88DA] * 2) & 255, ee = (M[0x88D9] * 2) & 255;
              for (let k = 0; k < 4 && ok; k++) {
                const x = M[p];
                if (x === 0) {
                  p = (p + 1) & 0xFFFF;
                  const y = M[p];
                  if (y === 0) cc |= 1; else if (y === dd) cc |= 2; else ok = false;
                } else if (x === ee) {
                  p = (p + 1) & 0xFFFF;
                  const y = M[p];
                  if (y === dd) cc |= 4; else if (y === 0) cc |= 8; else ok = false;
                } else ok = false;
                p = (p + 1) & 0xFFFF;
              }
              if (ok && cc === 0x0F) {
                M[0x8A6A] = (M[0x8A6A] + 1) & 255;
                M[cnt] |= 0x80;
                full = true;
                break;
              }
            }
          }
        }
      }
      n = (n - 1) & 255;
    } while (n !== 0);
    if (full || M[0x5E5F]) recordObject(hl);
    return {};
  });

  // prepare_polygon: the $8A7F screen corners at IX of a face, edge by edge, into the span table
  // ($8A9F: per row a count, 0 to 2, and the x of each end); $8919 and $891B its lowest and
  // highest rows. IX moves past the corners.
  P.def(0x83FC, 'prepare_polygon', r => {
    let ix = r.ix & 0xFFFF;
    const n = M[0x8A7F], len = (n << 1) & 255;
    copy(ix, 0x8A6B, len || 0x10000);
    const de0 = (0x8A6B + (len || 0x10000)) & 0xFFFF;
    M[de0] = M[ix]; M[(de0 + 1) & 0xFFFF] = M[(ix + 1) & 0xFFFF];
    const next = (ix + len) & 0xFFFF;
    P.N.corners = (P.N.corners || 0) + (n || 256);
    let p = 0x8A6B;
    setw(0x8919, M[0x8A6C]); setw(0x891B, M[0x8A6C]);
    for (let k = n || 256; k > 0; k--) {
      const y = M[(p + 3) & 0xFFFF];
      if (sgn16((w(0x8919) - y) & 0xFFFF)) setw(0x8919, y);
      else if (!sgn16((w(0x891B) - y) & 0xFFFF)) setw(0x891B, y);
      p += 2;
    }
    const plot = (iy, x) => {
      const a = (M[iy] + 1) & 255;
      if (a === 1) { M[iy] = 1; M[(iy + 1) & 0xFFFF] = x; }
      else if (a === 2 && M[(iy + 1) & 0xFFFF] !== x) { M[iy] = 2; M[(iy + 2) & 0xFFFF] = x; }
    };
    p = 0x8A6B;
    for (let k = n || 256; k > 0; k--) {
      const x0 = M[p], y0 = M[p + 1], x1 = M[p + 2], y1 = M[p + 3];
      if (y1 === y0) {
        if ((M[0x8919] === y0 || M[0x891B] === y0) && x0 !== x1) {
          const iy = (w(0x8A9F) + 3 * y0) & 0xFFFF;
          M[iy] = 2; M[(iy + 1) & 0xFFFF] = x0; M[(iy + 2) & 0xFFFF] = x1;
        }
      } else if (x0 === x1) {
        let e = y0, bb = (y1 - y0) & 255;
        if (sgn16((y1 - y0) & 0xFFFF)) { e = y1; bb = (-bb) & 255; }
        let iy = (w(0x8A9F) + 3 * e) & 0xFFFF;
        P.N.edgeRowsV = (P.N.edgeRowsV || 0) + (bb || 256);
        for (let j = bb || 256; j > 0; j--) { plot(iy, x1); iy = (iy + 3) & 0xFFFF; }
      } else {
        let b = 1, c = 1, adx = (x1 - x0) & 0xFFFF;
        if (sgn16(adx)) { adx = (-adx) & 255; b = 0xFF; }
        let e = y0, ady = (y1 - y0) & 0xFFFF;
        if (sgn16(ady)) { ady = (-ady) & 255; c = 0xFF; b = (-b) & 255; e = y1; }
        let iy = (w(0x8A9F) + 3 * e) & 0xFFFF;
        const step = b;
        let x = c === 0xFF ? x1 : x0;
        if (!sgn16((ady - adx) & 0xFFFF)) {
          // a steep edge: a row each step
          setw(0x83F8, ady); setw(0x83FA, adx);
          let err = ady >> 1;
          P.N.edgeRows = (P.N.edgeRows || 0) + (ady || 256);
          for (let j = ady || 256; j > 0; j--) {
            plot(iy, x);
            const s = (w(0x83FA) + (err & 255)) & 0xFFFF;
            const d = (s - w(0x83F8)) & 0xFFFF;
            if (!sgn16(d)) { err = d; x = (x + step) & 255; } else err = s;
            iy = (iy + 3) & 0xFFFF;
          }
        } else {
          // a shallow edge: x steps until the error passes, a row's first x plotted
          setw(0x83FA, ady); setw(0x83F8, adx);
          let err = (adx & 255) >> 1;
          P.N.edgeRowsH = (P.N.edgeRowsH || 0) + (ady || 256);
          for (let j = ady || 256; j > 0; j--) {
            plot(iy, x);
            for (;;) {
              P.N.edgeSteps = (P.N.edgeSteps || 0) + 1;
              x = (x + step) & 255;
              const s = (w(0x83FA) + (err & 255)) & 0xFFFF;
              const d = (s - w(0x83F8)) & 0xFFFF;
              if (!sgn16(d)) { err = d; break; }
              err = s;
            }
            iy = (iy + 3) & 0xFFFF;
          }
        }
      }
      p += 2;
    }
    return { ix: next };
  });

  // prepare_line: the two screen points at IX into the span table, each row from the top end to
  // the bottom one plotted; $8919 and $891B its rows. IX moves past them.
  P.def(0x85FF, 'prepare_line', r => {
    const ix = r.ix & 0xFFFF;
    const x0 = M[ix], y0 = M[(ix + 1) & 0xFFFF], x1 = M[(ix + 2) & 0xFFFF], y1 = M[(ix + 3) & 0xFFFF];
    const row = y => (w(0x8A9F) + 3 * y) & 0xFFFF;
    if (y0 === y1) {
      const iy = row(y0);
      setw(0x891B, y0); setw(0x8919, y0);
      M[iy] = 2; M[(iy + 1) & 0xFFFF] = x0; M[(iy + 2) & 0xFFFF] = x1;
    } else if (x0 === x1) {
      let lo = y0, hi = y1, b = (y1 - y0) & 255;
      if (sgn16((y1 - y0) & 0xFFFF)) { lo = y1; hi = y0; b = (-b) & 255; }
      let iy = row(lo);
      setw(0x891B, lo); setw(0x8919, hi);
      P.N.lineSteps = (P.N.lineSteps || 0) + ((b + 1) & 255 || 256);
      for (let j = (b + 1) & 255 || 256; j > 0; j--) { M[iy] = 1; M[(iy + 1) & 0xFFFF] = x1; iy = (iy + 3) & 0xFFFF; }
    } else {
      let b = 1, c = 1, adx = (x1 - x0) & 0xFFFF;
      if (sgn16(adx)) { adx = (-adx) & 255; b = 0xFF; }
      let e = y0, ady = (y1 - y0) & 0xFFFF;
      setw(0x8919, y1);
      if (sgn16(ady)) { ady = (-ady) & 255; c = 0xFF; b = (-b) & 255; setw(0x8919, y0); e = y1; }
      let iy = row(e);
      setw(0x891B, e);
      const step = b;
      let a = c === 0xFF ? x1 : x0;
      if (!sgn16((ady - adx) & 0xFFFF)) {
        setw(0x85FB, ady); setw(0x85FD, adx);
        let err = ady >> 1;
        M[iy] = 1; M[(iy + 1) & 0xFFFF] = a;
        P.N.lineSteps = (P.N.lineSteps || 0) + (ady || 256);
        for (let j = ady || 256; j > 0; j--) {
          const s = (w(0x85FD) + err) & 0xFFFF;
          const d = (s - w(0x85FB)) & 0xFFFF;
          if (!sgn16(d)) { err = d; a = (a + step) & 255; } else err = s;
          iy = (iy + 3) & 0xFFFF;
          M[iy] = 1; M[(iy + 1) & 0xFFFF] = a;
        }
      } else {
        setw(0x85FD, ady); setw(0x85FB, adx);
        let err = adx >> 1;
        M[iy] = 1; M[(iy + 1) & 0xFFFF] = a;
        P.N.lineSteps = (P.N.lineSteps || 0) + (adx || 256);
        for (let j = adx || 256; j > 0; j--) {
          a = (a + step) & 255;
          const s = (w(0x85FD) + err) & 0xFFFF;
          const d = (s - w(0x85FB)) & 0xFFFF;
          if (sgn16(d)) { err = s; continue; }
          err = d;
          a = (a - step) & 255;
          M[iy] = 2; M[(iy + 2) & 0xFFFF] = a;
          a = (a + step) & 255;
          iy = (iy + 3) & 0xFFFF;
          M[iy] = 1; M[(iy + 1) & 0xFFFF] = a;
        }
        M[iy] = 2; M[(iy + 2) & 0xFFFF] = a;
      }
    }
    return { ix: (ix + 4) & 0xFFFF };
  });

  // draw_cuboid: an object of type 1, its eight corners from the object buffer, the faces the
  // player can see coloured from the object's nibbles, drawn from the face list at $8961.
  P.def(0x6FC2, 'draw_cuboid', () => {
    const iy = w(0x8BDE), o = k => w((iy + 2 * k) & 0xFFFF);
    const put = (list, v) => { for (const a of list) setw(a, v); };
    put([0x5E63, 0x5E75, 0x5E7B, 0x5E8D], o(0));
    put([0x5E69, 0x5E6F, 0x5E81, 0x5E87], o(1));
    put([0x5E65, 0x5E6B, 0x5E7D, 0x5E83], o(2));
    put([0x5E71, 0x5E77, 0x5E89, 0x5E8F], o(3));
    put([0x5E67, 0x5E6D, 0x5E73, 0x5E79], o(4));
    put([0x5E7F, 0x5E85, 0x5E8B, 0x5E91], o(5));
    M[0x8A7F] = 8;
    P.transform_vertices({});
    if (!M[0x5E5F]) return {};
    let ob = w(0x8BE2), hl = 0x8962;
    M[0x5E5F] = 0;
    let c = M[0x5E62];
    for (let k = 0; k < 3; k++) {
      let cy = c & 1; c = (c >> 1) | (c & 0x80);
      if (!cy) M[hl] = 0;
      else { const a = M[(ob + 9) & 0xFFFF] & 0x0F; M[hl] = a; if (a) M[0x5E5F] = 1; }
      hl += 6;
      cy = c & 1; c = (c >> 1) | (c & 0x80);
      if (!cy) M[hl] = 0;
      else { const a = (M[(ob + 9) & 0xFFFF] & 0xF0) >> 4; M[hl] = a; if (a) M[0x5E5F] = 1; }
      hl += 6;
      ob = (ob + 1) & 0xFFFF;
    }
    if (!M[0x5E5F]) return {};
    M[0x5E60] = 0;
    if (!M[0x5E5E]) P.draw_face_list({ iy: 0x8961 }); else P.clip_face_list({ iy: 0x8961 });
    return {};
  });

  // The pyramids' and prisms' corners, type by type: [corner word, object buffer word, offset].
  const PYR = {
    4: [[0x5E63, 0], [0x5E69, 0], [0x5E6F, 0], [0x5E75, 0], [0x5E7B, 2], [0x5E81, 2], [0x5E87, 2], [0x5E8D, 2], [0x5E67, 10], [0x5E79, 10], [0x5E6D, 8], [0x5E73, 8], [0x5E85, 8, 0x5EDE], [0x5E8B, 8, 0x5EDE], [0x5E7F, 8, 0x5EE2], [0x5E91, 8, 0x5EE2], [0x5E71, 6], [0x5E77, 6], [0x5E65, 4], [0x5E6B, 4], [0x5E7D, 4, 0x5EDC], [0x5E89, 4, 0x5EDC], [0x5E83, 4, 0x5EE0], [0x5E8F, 4, 0x5EE0]],
    5: [[0x5E7B, 0], [0x5E81, 0], [0x5E87, 0], [0x5E8D, 0], [0x5E63, 2], [0x5E69, 2], [0x5E6F, 2], [0x5E75, 2], [0x5E6D, 10], [0x5E73, 10], [0x5E67, 8], [0x5E79, 8], [0x5E7F, 8, 0x5EDE], [0x5E91, 8, 0x5EDE], [0x5E85, 8, 0x5EE2], [0x5E8B, 8, 0x5EE2], [0x5E71, 6], [0x5E77, 6], [0x5E65, 4], [0x5E6B, 4], [0x5E7D, 4, 0x5EDC], [0x5E89, 4, 0x5EDC], [0x5E83, 4, 0x5EE0], [0x5E8F, 4, 0x5EE0]],
    6: [[0x5E6F, 2], [0x5E75, 2], [0x5E63, 0], [0x5E69, 0], [0x5E7B, 0, 0x5EDC], [0x5E87, 0, 0x5EDC], [0x5E81, 0, 0x5EE0], [0x5E8D, 0, 0x5EE0], [0x5E65, 4], [0x5E6B, 4], [0x5E71, 4], [0x5E77, 4], [0x5E7D, 6], [0x5E83, 6], [0x5E89, 6], [0x5E8F, 6], [0x5E6D, 10], [0x5E73, 10], [0x5E67, 8], [0x5E79, 8], [0x5E7F, 8, 0x5EDE], [0x5E91, 8, 0x5EDE], [0x5E85, 8, 0x5EE2], [0x5E8B, 8, 0x5EE2]],
    7: [[0x5E63, 2], [0x5E69, 2], [0x5E6F, 0], [0x5E75, 0], [0x5E81, 0, 0x5EDC], [0x5E8D, 0, 0x5EDC], [0x5E7B, 0, 0x5EE0], [0x5E87, 0, 0x5EE0], [0x5E7D, 4], [0x5E83, 4], [0x5E89, 4], [0x5E8F, 4], [0x5E65, 6], [0x5E6B, 6], [0x5E71, 6], [0x5E77, 6], [0x5E6D, 10], [0x5E73, 10], [0x5E67, 8], [0x5E79, 8], [0x5E7F, 8, 0x5EDE], [0x5E91, 8, 0x5EDE], [0x5E85, 8, 0x5EE2], [0x5E8B, 8, 0x5EE2]],
    8: [[0x5E65, 6], [0x5E77, 6], [0x5E6B, 4], [0x5E71, 4], [0x5E83, 4, 0x5EDE], [0x5E89, 4, 0x5EDE], [0x5E7D, 4, 0x5EE2], [0x5E8F, 4, 0x5EE2], [0x5E67, 8], [0x5E6D, 8], [0x5E73, 8], [0x5E79, 8], [0x5E7F, 10], [0x5E85, 10], [0x5E8B, 10], [0x5E91, 10], [0x5E6F, 2], [0x5E75, 2], [0x5E63, 0], [0x5E69, 0], [0x5E7B, 0, 0x5EDC], [0x5E87, 0, 0x5EDC], [0x5E81, 0, 0x5EE0], [0x5E8D, 0, 0x5EE0]],
    9: [[0x5E6B, 6], [0x5E71, 6], [0x5E65, 4], [0x5E77, 4], [0x5E7D, 4, 0x5EDE], [0x5E8F, 4, 0x5EDE], [0x5E83, 4, 0x5EE2], [0x5E89, 4, 0x5EE2], [0x5E7F, 8], [0x5E85, 8], [0x5E8B, 8], [0x5E91, 8], [0x5E67, 10], [0x5E6D, 10], [0x5E73, 10], [0x5E79, 10], [0x5E6F, 2], [0x5E75, 2], [0x5E63, 0], [0x5E69, 0], [0x5E7B, 0, 0x5EDC], [0x5E87, 0, 0x5EDC], [0x5E81, 0, 0x5EE0], [0x5E8D, 0, 0x5EE0]],
  };

  // draw_pyramid: an object of types 4 to 9, a base face and an opposite face whose extent is
  // set by +12 to +15 of its record; the face list by the opposite face's shape.
  P.def(0x70B7, 'draw_pyramid', () => {
    let ix = w(0x8BE2);
    let iy, n;
    if (M[(ix + 12) & 0xFFFF] !== M[(ix + 14) & 0xFFFF]) {
      if (M[(ix + 13) & 0xFFFF] === M[(ix + 15) & 0xFFFF]) { iy = 0x89A1; n = 6; } else { iy = 0x89DB; n = 8; }
    } else if (M[(ix + 13) & 0xFFFF] !== M[(ix + 15) & 0xFFFF]) { iy = 0x89BE; n = 6; } else { iy = 0x8986; n = 5; }
    M[0x8A7F] = n;
    for (let k = 0; k < 4; k++) setw(0x5EDC + 2 * k, (M[(ix + 12 + k) & 0xFFFF] << 6) & 0xFFFF);
    const ob = w(0x8BDE);
    const t = M[0x5E61];
    const list = PYR[t] || PYR[9];
    for (const [dst, src, add] of list) setw(dst, (w((ob + src) & 0xFFFF) + (add ? w(add) : 0)) & 0xFFFF);
    P.transform_vertices({});
    if (!M[0x5E5F]) return {};
    ix = w(0x8BE2);
    let b = M[iy], f = (iy + 1) & 0xFFFF;
    for (;;) {
      M[f] = M[(ix + 9) & 0xFFFF] & 0x0F;
      f = (f + M[(f + 1) & 0xFFFF] + 2) & 0xFFFF;
      b = (b - 1) & 255;
      if (b === 0) break;
      M[f] = (M[(ix + 9) & 0xFFFF] & 0xF0) >> 4;
      f = (f + M[(f + 1) & 0xFFFF] + 2) & 0xFFFF;
      ix = (ix + 1) & 0xFFFF;
      b = (b - 1) & 255;
      if (b === 0) break;
    }
    M[0x5E60] = 1;
    if (!M[0x5E5E]) P.draw_face_list({ iy }); else P.clip_face_list({ iy });
    return {};
  });

  // draw_polygon: an object of types 10 to 14, a line or a flat polygon of its own corners.
  P.def(0x742B, 'draw_polygon', () => {
    let ix = w(0x8BE2);
    const n = (M[0x5E61] - 8) & 255;
    M[0x8A7F] = n;
    const col = M[(ix + 9) & 0xFFFF];
    let iy = 0x5E63;
    for (let v = n || 256; v > 0; v--) {
      for (let k = 0; k < 3; k++) {
        const hl = ((M[(ix + 10) & 0xFFFF] << 6) - w(0x8762 + 2 * k)) & 0xFFFF;
        setw(iy, hl); iy = (iy + 2) & 0xFFFF;
        ix = (ix + 1) & 0xFFFF;
      }
    }
    P.transform_vertices({});
    if (!M[0x5E5F]) return {};
    M[0x8A02] = M[0x8A7F];
    if (M[0x8A7F] !== 2) { M[0x8917] = col; M[0x8A01] = 1; M[0x5E60] = 2; }
    else { M[0x8A01] = col & 0x0F; M[0x5E60] = 0; }
    if (!M[0x5E5E]) P.draw_face_list({ iy: 0x8A00 }); else P.clip_face_list({ iy: 0x8A00 });
    return {};
  });

  // draw_rectangle: an object of type 3, a cuboid with one size 0: one face, coloured by the side
  // the player is on.
  P.def(0x74B7, 'draw_rectangle', () => {
    const ix = w(0x8BDE), o = k => w((ix + 2 * k) & 0xFFFF);
    setw(0x5E63, o(0)); setw(0x5E75, o(0));
    setw(0x5E69, o(1)); setw(0x5E6F, o(1));
    setw(0x5E65, o(2)); setw(0x5E6B, o(2));
    setw(0x5E71, o(3)); setw(0x5E77, o(3));
    const iy = w(0x8BE2);
    setw(0x5E67, o(4)); setw(0x5E73, o(5));
    let b;
    if (!M[(iy + 4) & 0xFFFF]) { setw(0x5E6D, o(5)); setw(0x5E79, o(4)); b = 1; }
    else { setw(0x5E6D, o(4)); setw(0x5E79, o(5)); b = M[(iy + 5) & 0xFFFF] ? 3 : 2; }
    M[0x8A7F] = 4;
    P.transform_vertices({});
    if (!M[0x5E5F]) return {};
    M[0x8A02] = 4;
    let c = M[0x5E62];
    if (b === 3) c >>= 4; else if (b === 2) c >>= 2;
    let a = M[(iy + 9) & 0xFFFF];
    if (c & 1) { a &= 0x0F; if (!a) return {}; }
    else { a &= 0xF0; if (!a) return {}; a >>= 4; }
    M[0x8A01] = a;
    M[0x5E60] = 0;
    if (!M[0x5E5E]) P.draw_face_list({ iy: 0x8A00 }); else P.clip_face_list({ iy: 0x8A00 });
    return {};
  });

  // draw_sensor: an object of type 2: a record in the sensor list at ($8A62), and a point drawn
  // when it is in reach.
  P.def(0x7592, 'draw_sensor', () => {
    M[0x8A24] = (M[0x8A24] + 1) & 255;
    let iy = w(0x8A62), ix = w(0x8BE2);
    M[iy] = M[(ix + 7) & 0xFFFF];
    M[(iy + 1) & 0xFFFF] = M[(ix + 10) & 0xFFFF];
    let state = 0;
    if (!(M[ix] & 0x40) && (M[0x5E62] & M[(ix + 13) & 0xFFFF])) {
      const ob = w(0x8BDE);
      setw(0x5E63, w(ob)); setw(0x5E69, w(ob));
      setw(0x5E65, w((ob + 4) & 0xFFFF)); setw(0x5E6B, w((ob + 4) & 0xFFFF));
      let hl = w((ob + 8) & 0xFFFF);
      setw(0x5E67, hl); setw(0x5E6D, hl);
      if (hl & 0x8000) hl = neg(hl);
      let de = w(0x5E63);
      hl = (de & 0x8000) ? (hl - de) & 0xFFFF : (hl + de) & 0xFFFF;
      de = w(0x5E65);
      hl = (de & 0x8000) ? (hl - de) & 0xFFFF : (hl + de) & 0xFFFF;
      ix = w(0x8BE2);
      if (sgn16((hl - w((ix + 11) & 0xFFFF)) & 0xFFFF)) {
        M[0x8A7F] = 2;
        P.transform_vertices({});
        state = 2;
        if (M[0x5E5F]) {
          M[0x8A0A] = M[(ix + 9) & 0xFFFF] & 0x0F;
          M[0x5E60] = 0;
          P.draw_face_list({ iy: 0x8A09 });
          const f = w(0x8BDC);
          const x = M[(f - 2) & 0xFFFF];
          if (x) {
            M[(iy + 4) & 0xFFFF] = x;
            M[(iy + 5) & 0xFFFF] = M[(f - 1) & 0xFFFF];
            state = 1;
          }
        }
      }
    }
    M[(iy + 3) & 0xFFFF] = state;
    setw(0x8A62, (iy + 6) & 0xFFFF);
    return {};
  });

  // sort_faces: the draw list ($8918 entries at ($8A9D)) sorted by the bounding boxes of the
  // objects, pairs of neighbours compared axis by axis and swapped, pass after pass.
  P.def(0x767E, 'sort_faces', () => {
    let passes = M[0x8918];
    for (;;) {
      passes = (passes - 1) & 255;
      if (passes === 0 || sgn8(passes)) return {};
      P.N.sortPasses = (P.N.sortPasses || 0) + 1;
      let ix = w(0x8A9D);
      M[0x5EE5] = 0;
      for (let k = (M[0x8918] - 1) & 255 || 256; k > 0; k--) {
        P.N.sortSteps = (P.N.sortSteps || 0) + 1;
        const bi = w((ix + 2) & 0xFFFF), bj = w((ix + 6) & 0xFFFF);
        setw(0x5EE6, bi); setw(0x5EE8, bj);
        let a = 0;
        for (let ax = 0; ax < 3; ax++) {
          a = (a << 1) & 255;
          const i = (bi + 4 * ax) & 0xFFFF, j = (bj + 4 * ax) & 0xFFFF;
          if (sgn16((w(i) - w(j + 2)) & 0xFFFF) && sgn16((w(j) - w(i + 2)) & 0xFFFF)) a |= 1;
        }
        let c = a;
        M[0x5EE4] = 0;
        for (let ax = 0; ax < 3; ax++) {
          M[0x5EE4] = (M[0x5EE4] << 2) & 255;
          c = (c << 1) & 255;
          if (c & 8) continue;
          const i = (bi + 4 * ax) & 0xFFFF, j = (bj + 4 * ax) & 0xFFFF;
          const side = p => ((M[(p + 3) & 0xFFFF] & 0x80) ? 1 : 0) | ((M[(p + 1) & 0xFFFF] & 0x80) ? 2 : 0);
          let r;
          let s = side(i);
          if (s === 1 || s === 2) r = 1;
          else {
            s = side(j);
            if (s === 1 || s === 2) r = 2;
            else {
              s = (s & 2) | ((M[(i + 1) & 0xFFFF] & 0x80) ? 1 : 0);
              if (s === 1 || s === 2) r = 0;
              else {
                const d = (w(j) - w(i)) & 0xFFFF;
                if (d !== 0) {
                  if (d & 0x8000) s |= 4;
                  r = (s === 0 || s === 7) ? 1 : 2;
                } else {
                  let t = 0;
                  const hj = w((j + 2) & 0xFFFF), hi = w((i + 2) & 0xFFFF);
                  if (hj & 0x8000) t |= 2;
                  if (hi & 0x8000) t |= 1;
                  if (((hj - hi) & 0xFFFF) & 0x8000) t |= 4;
                  r = (t === 0 || t === 7) ? 1 : 2;
                }
              }
            }
          }
          if (r) M[0x5EE4] |= r;
        }
        const code = M[0x5EE4];
        if ([0x20, 0x08, 0x02, 0x28, 0x0A, 0x22, 0x2A].includes(code)) ix = (ix + 4) & 0xFFFF;
        else {
          M[0x5EE5] = 1;
          P.N.sortSwaps = (P.N.sortSwaps || 0) + 1;
          for (let q = 0; q < 4; q++) { const t = M[ix]; M[ix] = M[(ix + 4) & 0xFFFF]; M[(ix + 4) & 0xFFFF] = t; ix = (ix + 1) & 0xFFFF; }
        }
      }
      if (!M[0x5EE5]) return {};
    }
  });

  // draw_faces: the sorted draw list into the view buffer, farthest first.
  P.def(0x7803, 'draw_faces', () => {
    let d = M[0x8918], iy;
    if (M[0x8A6A]) {
      M[0x5EEA] = M[0x8A6A];
      iy = w(0x8A9D);
      for (;;) {
        const a = M[(w(iy) + 1) & 0xFFFF];
        if (a && (a & 0x80)) {
          M[0x5EEA] = (M[0x5EEA] - 1) & 255;
          if (!M[0x5EEA]) break;
        }
        d = (d - 1) & 255;
        if (!d) return {};
        iy = (iy + 4) & 0xFFFF;
      }
    } else {
      iy = w(0x8A9D);
      if (M[0x889F]) {
        const hl = w(0x8A95);
        M[hl] = 0;
        copy(hl, (hl + 1) & 0xFFFF, 0x0A8F);
      }
    }
    while (d) {
      const rec = w(iy);
      const cnt = M[(rec + 1) & 0xFFFF];
      if (cnt) {
        let ix = (rec + 2) & 0xFFFF;
        for (let b = cnt & 0x7F || 256; b > 0; b--) {
          const c = M[ix]; ix = (ix + 1) & 0xFFFF;
          M[0x8917] = c >> 4;
          M[0x8A7F] = c & 0x0F;
          ix = (c & 0x0F) !== 2 ? P.prepare_polygon({ ix }).ix : P.prepare_line({ ix }).ix;
          P.fill_face({});
        }
      }
      iy = (iy + 4) & 0xFFFF;
      d = (d - 1) & 255;
    }
    return {};
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
