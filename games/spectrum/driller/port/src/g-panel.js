// The keys, the sensors, the scripts, the panel and the interrupt ($943C-$9549, $9841-$9989,
// $B320-$BCA5): what is pressed, which sensors see the probe, the areas' little programs, the
// console's numbers, needles and bars, and the frame interrupt's clock and laser beams.
(function (root) {
'use strict';
const G = root.DRGroups = root.DRGroups || {};

G.panel = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const sgn8 = v => (v & 0x80) !== 0;
  // a call that keeps the registers the game's caller keeps: r takes what the routine gives back
  const call = (f, r) => Object.assign(r, f(r) || {});

  // read_keys ($943C): the eight half-rows of the keyboard scanned into $9404-$940B, and up to five
  // keys held turned into the game's codes ($9414, five to a half-row) at $8FBD, $8FBC of them, the
  // Kempston stick's after the keys' when it is chosen ($8FC5 = 2). No key: A = 0, carry clear.
  // Keys other than those of the last call: A = the first, carry set. The same keys: they repeat,
  // the first time after $8FC3 frames and then every $8FC4, the counter at $8FC2 run down by the
  // interrupt; until then the scan goes round again. IX, HL, DE and BC kept.
  P.def(0x943C, 'read_keys', function* () {
    for (;;) {
      for (let k = 0, b = 0xFE; k < 8; k++, b = ((b << 1) | (b >> 7)) & 255) M[0x9404 + k] = ~P.io.in(b << 8 | 0xFE) & 0x1F;
      M[0x8FBC] = 0;
      let de = 0x8FBD, full = false;
      rows: for (let row = 0; row < 8; row++) {
        const hl = 0x9404 + row;
        for (let a = M[hl]; a; a = M[hl]) {
          let c = a, idx = 0, e = 0xFE;
          for (let b = 8; b > 0; b--) { const cy = c & 1; c >>= 1; if (cy) break; idx++; e = (e << 1) & 255; }
          M[de] = M[0x9414 + ((5 * row + idx) & 255)];
          M[0x8FBC] = (M[0x8FBC] + 1) & 255;
          if (M[0x8FBC] === 5) { full = true; break rows; }
          de++;
          M[hl] &= e;
        }
      }
      if (!full && M[0x8FC5] === 2) {
        const v = P.io.in(0x001F);
        for (const [bit, code] of [[4, 0x95], [3, 0x91], [2, 0x92], [1, 0x93], [0, 0x94]]) {
          if (!(v >> bit & 1)) continue;
          M[de] = code;
          M[0x8FBC] = (M[0x8FBC] + 1) & 255;
          if (M[0x8FBC] === 5) { full = true; break; }
          de++;
        }
      }
      const n = M[0x8FBC];
      if (!full && !n) { M[0x940D] = 0; return { a: 0, cf: false }; }
      let same = M[0x940D] === n;
      for (let k = 0; same && k < n; k++) if (M[0x940E + k] !== M[0x8FBD + k]) same = false;
      if (same) {
        if (!M[0x940C]) {
          M[0x940C] = 1;
          M[0x9413] = M[0x8FC3];
          M[0x8FC2] = M[0x8FC3];
          yield;
          continue;
        }
        if (P.irqByte(0x8FC2)) { yield; continue; }
        M[0x8FC2] = M[0x8FC4];
        return { a: M[0x8FBD], cf: true };
      }
      M[0x940C] = 0;
      M[0x940D] = n;
      for (let k = 0; k < n; k++) M[0x940E + k] = M[0x8FBD + k];
      return { a: M[0x8FBD], cf: true };
    }
  });

  // process_sensors ($9841): each sensor in the view's list ($8A26, $8A24 of them, six bytes each:
  // the object, the frames between shots, the count, how it fires, where it is on the screen) is
  // checked for a line to the probe: one that shoots on sight (1) by what the crosshair would pick
  // at its place on the screen, one that shoots through walls (2) by the probe's move to it, with
  // the step's margin off and as if flying; one that cannot see the probe stops (0). Then, once the
  // interrupt is not drawing a beam ($8A21 bit 0) and told to leave the list alone (bit 2), the
  // list goes to the interrupt's ($8A44), each count kept, and the new view is shown: the area's
  // colours if asked for, dissolved in or copied, the crosshair over it.
  P.def(0x9841, 'process_sensors', function* () {
    const n = M[0x8A24];
    let ix = 0x8A26;
    for (let b = n; b > 0; b--, ix = (ix + 6) & 0xFFFF) {
      const st = M[ix + 3];
      if (st === 1) {
        const d = M[0x88A0], e = M[0x88A1];
        M[0x8A69] = 0;
        M[0x88A0] = M[ix + 4]; M[0x88A1] = M[ix + 5];
        P.pick_object({});
        M[0x88A0] = d; M[0x88A1] = e;
        if (M[0x8A69] !== M[ix]) M[ix + 3] = 0;
      } else if (st === 2) {
        M[0x8916] = M[ix];
        const o = P.find_object({ a: 0 }).ix & 0xFFFF;
        M[0x983F] = M[0x877A];
        M[0x9840] = M[0x88D0];
        M[0x877A] = 1;
        M[0x88D0] = 0;
        for (const [k, t, s] of [[1, 0x88AF, 0x9839], [2, 0x88B1, 0x983B], [3, 0x88B3, 0x983D]]) {
          const v = (M[(o + k) & 0xFFFF] << 6) & 0xFFFF;
          setw(t, v); setw(s, v);
        }
        P.move_to({});
        if (w(0x9839) !== w(0x88AF) || w(0x983B) !== w(0x88B1) || w(0x983D) !== w(0x88B3)) M[ix + 3] = 0;
        M[0x88D0] = M[0x9840];
        M[0x877A] = M[0x983F];
      }
    }
    M[0x8A21] |= 4;
    yield* P.until0(0x8A21, 1, 24);
    M[0x8A25] = M[0x8A24];
    // the interrupt's counts, which it may have moved on in the frame that ended the wait
    for (let k = 0; k < 5; k++) {
      const a = P.irqByte(0x8A46 + 6 * k);
      M[0x8A28 + 6 * k] = !a || a === 1 ? 2 : a;
    }
    for (let k = 0; k < 0x1E; k++) M[0x8A44 + k] = M[0x8A26 + k];
    if (M[0x8910]) P.set_area_colours({});
    // dissolve keeps the flags its caller had, so the copy follows only when $8BF0 is 0
    if (M[0x8BF0]) P.dissolve({}); else P.copy_view({});
    if (M[0x88A2]) P.crosshair({});
    M[0x8A21] &= ~4;
    return {};
  });

  // run_script ($B320): the script at IX, A bytes long, one instruction after another, each as
  // long as its entry in $8939 says. An instruction with bit 7 set runs only when the script was
  // started by a shot ($8BF1 set), one without only when it was not. A test that fails, or an
  // instruction the game does not know, ends the script.
  P.def(0xB320, 'run_script', function* (r) {
    let ix = r.ix & 0xFFFF, c = r.a & 255;
    for (;;) {
      const b = M[ix], op = b & 0x7F;
      M[0xB31F] = op;
      if (M[0x8BF1] ? (b & 0x80) : !(b & 0x80)) {
        const go = yield* instruction(op, ix);
        if (!go) return {};
      }
      const e = M[(0x8939 + M[0xB31F]) & 0xFFFF];
      ix = (ix + e) & 0xFFFF;
      c = (c - e) & 255;
      if (!c || sgn8(c)) return {};
    }
  });
  // One instruction; false ends the script.
  function* instruction(op, ix) {
    const at = k => M[(ix + k) & 0xFFFF];
    if (op === 1) {
      // add to the score, kept between 0 and $7FFFFF
      let v = (M[0x8872] | M[0x8873] << 8 | M[0x8874] << 16) + (at(1) | at(2) << 8 | at(3) << 16);
      if (v & 0x800000) v = at(3) & 0x80 ? 0 : 0x7FFFFF;
      M[0x8872] = v & 255; M[0x8873] = (v >> 8) & 255; M[0x8874] = (v >> 16) & 255;
      M[0x8921] |= 2;
      return true;
    }
    if (op === 2 || op === 0x13) {
      // add to the energy (2) or the shield ($13), at most $3F; below 0 ends the game
      const [v, out, bit] = op === 2 ? [0x8875, 3, 4] : [0x8878, 1, 0x10];
      let a = (M[v] + at(1)) & 255;
      if (sgn8(a)) { M[0x8BF2] = out; a = 0; } else if (!sgn8(a - 0x3F)) a = 0x3F;
      M[v] = a;
      M[0x8921] |= bit;
      return true;
    }
    if ([3, 4, 5, 0x10, 0x1E, 0x1F].includes(op)) return yield* objectHere(op, at(1));
    if ([6, 7, 8, 0x11, 0x20, 0x21].includes(op)) {
      // an object of another area: toggle, show, hide, destroy, or test whether shown or hidden
      M[0x8916] = at(2);
      const f = P.find_object({ a: at(1) });
      if (f.a & 255) return true;
      const o = f.ix & 0xFFFF;
      if (op === 0x20) return !(M[o] & 0x40);
      if (op === 0x21) return !!(M[o] & 0x40);
      if (M[o] & 0x20) return true;
      if (op === 0x11) { M[o] |= 0x20; M[o] |= 0x40; }
      else if (op === 7 || (op === 6 && (M[o] & 0x40))) M[o] &= ~0x40;
      else M[o] |= 0x40;
      return true;
    }
    if ([9, 0x0A, 0x0B, 0x14].includes(op)) {
      // the variables at $887F: add one, take one, test, set
      const v = (0x887F + ((at(1) - 1) & 255)) & 0xFFFF;
      if (op === 9) M[v] = (M[v] + 1) & 255;
      else if (op === 0x0A) M[v] = (M[v] - 1) & 255;
      else if (op === 0x14) M[v] = at(2);
      else if (at(2) !== M[v]) return false;
      return true;
    }
    if ([0x0C, 0x0D, 0x0E, 0x1D].includes(op)) {
      // the flags at $887B, eight to a byte: set, clear, test, toggle
      let hl = 0x887B, a = (at(1) - 1) & 255;
      for (let k = 0; k < 3 && !sgn8(a - 8); k++) { a = (a - 8) & 255; hl++; }
      let d = 1;
      for (let n = a; n > 0; n--) d = (d << 1) & 255;
      const e = M[hl];
      if (op === 0x0C || (op === 0x1D && !(d & e))) M[hl] = d | e;
      else if (op === 0x0D || op === 0x1D) M[hl] = ~d & e & 255;
      else if (((d & e) ? 1 : 0) !== at(2)) return false;
      return true;
    }
    if (op === 0x0F || op === 0x1C) {
      // a sound: at once ($F), or ($1C) left for the view's copy when the view is to be redrawn
      if (op === 0x1C && ((M[0x8920] & 4) || (M[0x8921] & 8))) M[0x8A1F] = at(1);
      else P.play_sound({ a: at(1) });
      return true;
    }
    if (op === 0x12) {
      // to another area, at one of its entrances
      M[0x8A1F] = 0x0A;
      M[0x8862] = at(1);
      M[0x8911] = at(2);
      P.set_start({});
      setw(0x8920, 0xFFFC);
      return true;
    }
    if (op === 0x15) {
      // the probe into the jet or out of it, each with its own energy and shield
      if (!M[0x877A]) {
        M[0x887E] |= 0x80; M[0x877A] = 1;
        M[0x8877] = M[0x8875]; M[0x887A] = M[0x8878];
        M[0x8875] = M[0x8876]; M[0x8878] = M[0x8879];
      } else {
        M[0x877A] = 0; M[0x887E] &= 0x7F;
        M[0x8876] = M[0x8875]; M[0x8879] = M[0x8878];
        M[0x8875] = M[0x8877]; M[0x8878] = M[0x887A];
      }
      M[0x8921] |= 0x94; M[0x8920] |= 0x08;
      return true;
    }
    if (op === 0x19) {
      // the area's colours: one copied over another, or (any of bits 2, 3, 6, 7) the area's own back
      let hl = (w(0x8866) - 7) & 0xFFFF;
      const x = at(1);
      if (x & 0xCC) for (let k = 0; k < 4; k++) M[0x886E + k] = M[(hl + k) & 0xFFFF];
      else M[0x886E + ((x & 0x30) >> 4)] = M[(hl + (x & 3)) & 0xFFFF];
      P.set_area_colours({});
      return true;
    }
    if (op === 0x1A) {
      // the view drawn and shown now
      P.draw_view({});
      yield* P.process_sensors({});
      P.update_panel({});
      setw(0x8920, 0);
      return true;
    }
    if (op === 0x1B) {
      // a pause of at(1) frames
      M[0x8FC2] = at(1);
      yield* P.until0(0x8FC2, 0xFF, 29);
      return true;
    }
    return false;
  }
  // An object of the area the probe is in ($8916 = its number): toggle (3), show (4), hide (5),
  // destroy ($10), or test whether shown ($1E) or hidden ($1F). A destroyed object is left as it
  // is; hiding a sensor stops its beam once the interrupt has none drawn ($8A21 bit 0), and hiding
  // any object takes it off the view's list.
  function* objectHere(op, id) {
    M[0x8916] = id;
    const f = P.find_object({ a: 0 });
    if (f.a & 255) return true;
    const o = f.ix & 0xFFFF;
    if (op === 0x1E) return !(M[o] & 0x40);
    if (op === 0x1F) return !!(M[o] & 0x40);
    if (M[o] & 0x20) return true;
    M[0x8BF0] = 1;
    if (op === 0x10) M[o] |= 0x20;
    else if (op === 4 || (op === 3 && (M[o] & 0x40))) { M[o] &= ~0x40; M[0x8920] |= 4; return true; }
    M[o] |= 0x40;
    if ((M[o] & 0x0F) === 2 && M[0x8A25]) {
      let iy = 0x8A44;
      for (let b = M[0x8A25]; b > 0; b--, iy = (iy + 6) & 0xFFFF) {
        if (M[iy] !== M[(o + 7) & 0xFFFF]) continue;
        yield* P.until0(0x8A21, 1, 24);
        M[iy + 3] = 0;
        M[(iy - 0x1B) & 0xFFFF] = 0;
        break;
      }
    }
    if (M[0x8918]) {
      let iy = w(0x8A9D);
      for (let b = M[0x8918]; b > 0; b--, iy = (iy + 4) & 0xFFFF) {
        let hl = w(iy);
        if (M[hl] !== M[0x8916]) continue;
        hl = (hl + 1) & 0xFFFF;
        if (M[hl] & 0x80) M[0x8A6A] = (M[0x8A6A] - 1) & 255;
        M[hl] = 0;
        M[0x8921] |= 8;
        break;
      }
    }
    return true;
  }

  // panel_copy ($B93C): B rows of the bytes at HL (a count, then the rows) to the screen addresses
  // listed at IX.
  P.def(0xB93C, 'panel_copy', r => {
    let hl = r.hl & 0xFFFF, ix = r.ix & 0xFFFF, de = 0;
    const c = M[hl];
    hl = (hl + 1) & 0xFFFF;
    for (let n = (r.b & 255) || 256; n > 0; n--) {
      de = w(ix); ix = (ix + 2) & 0xFFFF;
      for (let k = c || 0x10000; k > 0; k--) { M[de] = M[hl]; de = (de + 1) & 0xFFFF; hl = (hl + 1) & 0xFFFF; }
    }
    return { hl, h: hl >> 8, l: hl & 255, de, d: de >> 8, e: de & 255, ix, b: 0, c, bc: c };
  });

  // needle ($B979): a dial's needle drawn (by XOR, so drawing it again takes it off) at angle A in
  // $48ths of a turn, in the panel at IX: two lines from the dial's edge, $88D8 either side of the
  // angle, to its centre ($B951), the edge's points from the quarter-turn table at $B953.
  P.def(0xB979, 'needle', r => {
    setw(0x8A1B, r.ix & 0xFFFF);
    setw(0x8A10, w(0xB951));
    const c = r.a & 255;
    let a = (c - M[0x88D8]) & 255;
    if (sgn8(a)) a = (a + 0x48) & 255;
    for (let b = 2; b > 0; b--) {
      const cx = M[0xB951], cy = M[0xB952];
      const t = (e, k) => M[(0xB953 + 2 * e + k) & 0xFFFF];
      if (sgn8(a - 0x13)) { M[0x8A0E] = (t(a, 0) + cx) & 255; M[0x8A0F] = (cy - t(a, 1)) & 255; }
      else if (sgn8(a - 0x25)) { const e = (0x24 - a) & 255; M[0x8A0E] = (t(e, 0) + cx) & 255; M[0x8A0F] = (t(e, 1) + cy) & 255; }
      else if (sgn8(a - 0x37)) { const e = (a - 0x24) & 255; M[0x8A0E] = (cx - t(e, 0)) & 255; M[0x8A0F] = (t(e, 1) + cy) & 255; }
      else { const e = (0x48 - a) & 255; M[0x8A0E] = (cx - t(e, 0)) & 255; M[0x8A0F] = (cy - t(e, 1)) & 255; }
      P.draw_line({});
      a = (M[0x88D8] + c) & 255;
      if (!sgn8(a - 0x48)) a = (a - 0x48) & 255;
    }
    setw(0x8A1B, w(0x8BE4));
    return {};
  });

  // bar ($BA1E): a bar of the panel at IX (its screen address, then the cell its right end is in)
  // moved from L to H, a pixel a step, six rows deep.
  P.def(0xBA1E, 'bar', r => {
    const h = r.h & 255, l = r.l & 255;
    M[0xBA1C] = h; M[0xBA1D] = l;
    const ix = r.ix & 0xFFFF;
    let hl = (w(ix) + ((M[(ix + 2) & 0xFFFF] - (l >> 3) - 1) & 255)) & 0xFFFF;
    const fill = a => { for (let k = 0, p = hl; k < 6; k++, p = (p + 0x100) & 0xFFFF) M[p] = a; };
    let a = l;
    if (a === h) return {};
    if (sgn8(a - h)) {
      a &= 7;
      for (;;) {
        let v = 0;
        for (let b = a + 1; b > 0; b--) v = ((v << 1) | 1) & 255;
        fill(v);
        M[0xBA1D] = (M[0xBA1D] + 1) & 255;
        if (M[0xBA1D] === h) break;
        a = M[0xBA1D] & 7;
        if (!a) hl = (hl - 1) & 0xFFFF;
      }
    } else {
      for (;;) {
        a = M[0xBA1D] & 7;
        let v;
        if (!a) { hl = (hl + 1) & 0xFFFF; v = 0x7F; }
        else { v = 0; for (let b = a - 1; b > 0; b--) v = ((v << 1) | 1) & 255; }
        fill(v);
        M[0xBA1D] = (M[0xBA1D] - 1) & 255;
        if (M[0xBA1D] === h) break;
      }
    }
    return {};
  });

  // update_panel ($B72B): the parts of the console that $8920 and $8921 ask for: the score, the
  // area's name, the message line, the step, the turn angle, the position, the heading's and the
  // pitch's dials, the energy and shield bars, the height, the crosshair's and the vehicle's
  // pictures. Every register kept.
  P.def(0xB72B, 'update_panel', () => {
    const R = { ix: 0, hl: 0, de: 0, a: 0, b: 0, c: 0 };
    const num = (hl, de, a) => { R.hl = hl; R.de = de; R.a = a; R.ix = 0xB71C; call(P.write_number, R); };
    const text = (hl, ix) => { R.hl = hl; if (ix !== undefined) R.ix = ix; call(P.print_text, R); };
    if (M[0x891F] === 1) {
      if (M[0x8921] & 2) { num(w(0x8872), M[0x8874], M[0xCFAC]); text(0xCFAA); }
      if (M[0x8921] & 0x40) text(0xCFBF, w(0x8866));
    }
    let a = M[0x8921];
    if (a & 0x20) {
      const area = M[0x8862];
      let ix;
      if (!sgn8(area - 0x13)) ix = 0x8C12;
      else ix = M[(0x877B + area - 1) & 0xFFFF] === 3 ? 0x8BF6 : 0x8C04;
      text(0xCFAD, ix);
      a = M[0x8921];
    }
    if (a & 1) { num(M[0x876A], 0, M[0xCFB2]); text(0xCFB0); }
    a = M[0x8920];
    if (a & 0x80) { const s = M[0x876F]; num((s * 5) & 255, 0, M[0xCFB5]); text(0xCFB3); a = M[0x8920]; }
    if (a & 0x10) {
      R.c = M[0x8779];
      for (const [src, digits, rec] of [[0x8762, 0xCFB8, 0xCFB6], [0x8766, 0xCFBB, 0xCFB9], [0x8764, 0xCFBE, 0xCFBC]]) {
        R.hl = w(src); R.e = R.c; R.d = 0; R.de = R.c; R.a = 0;
        call(P.div_24_16, R);
        R.de = 0; R.a = M[digits]; R.ix = 0xB71C;
        call(P.write_number, R);
        text(rec);
      }
    }
    a = M[0x8920];
    if (a & 0x20) {
      const area = M[0x8862];
      if (area === 0x0D || area === 0x12) a = area;
      else {
        M[0x88D8] = 8;
        const ix = w(0x8BE6);
        if (M[0x88C8] !== 0xFF) P.needle({ a: M[0x88C8], ix });
        M[0x88C8] = M[0x876D];
        P.needle({ a: M[0x876D], ix });
        a = M[0x8920];
      }
    }
    if (a & 0x40) {
      M[0x88D8] = 5;
      const ix = w(0x8BE8);
      const turn = v => { v = (v + 0x12) & 255; return sgn8(v - 0x48) ? v : (v - 0x48) & 255; };
      if (M[0x88C7] !== 0xFF) P.needle({ a: turn(M[0x88C7]), ix });
      M[0x88C7] = M[0x876C];
      P.needle({ a: turn(M[0x876C]), ix });
    }
    a = M[0x8921];
    if (a & 4) {
      const l = M[0x8A67], h = M[0x8875];
      M[0x8A67] = h;
      P.bar({ ix: 0xCFCE, h, l });
      a = M[0x8921];
    }
    if (a & 0x10) {
      const l = M[0x8A68], h = M[0x8878];
      M[0x8A68] = h;
      P.bar({ ix: 0xCFD1, h, l });
      a = M[0x8921];
    }
    if (a & 0x80) {
      if (M[0x877A]) { R.ix = 0xB71C; M[0xB71C] = 0x4A; }
      else num((M[0x8772] - 1) & 255, 0, M[0xCFCD]);
      text(0xCFCB);
    }
    a = M[0x8920];
    if (a & 1) {
      P.panel_copy({ b: M[0xCFA9], ix: w(0x8BEE), hl: M[0x88AC] ? 0x90E6 : 0x90BE });
      a = M[0x8920];
    }
    if (a & 8) P.panel_copy({ b: M[0xCFA3], hl: M[0x877A] ? 0x9069 : 0x9014, ix: w(0x8BEA) });
    return {};
  });

  // install_interrupt ($BAB1): the frame interrupt in IM 2, through a table of $FD at $FE00-$FF00
  // to a jump at $FDFD to $BAE6; the beam state and the clock's frame count cleared, and the
  // frame counter ($8A1D) started from the ROM's FRAMES ($5C78). Every register kept.
  P.def(0xBAB1, 'install_interrupt', () => {
    M[0x8A21] = 0; M[0x88A3] = 0;
    M[0x8A1D] = M[0x5C78];
    M.fill(0xFD, 0xFE00, 0xFF01);
    M[0xFDFD] = 0xC3; setw(0xFDFE, 0xBAE6);
    return {};
  });

  // interrupt ($BAE6): every frame, the frame counter ($8A1D) on and the wait counter ($8FC2) down;
  // while the game is on ($8BF2 = 0), the clock ($88A4-$88AB, counted down from the time the game
  // gives) by a second every 50 frames, the energy a unit a minute (out at 0); and, unless the main
  // program is changing the list (bit 2 of $8A21 with no beam drawn), each sensor's count on: one
  // that shoots on sight draws its beam to the probe (XOR, on at 1 and off at 0), each flashes the
  // border, and at 0 it hits: sound 2 and a unit of shield (out at 0).
  P.def(0xBAE6, 'interrupt', () => {
    M[0x8A1D] = (M[0x8A1D] + 1) & 255;
    if (M[0x8FC2]) M[0x8FC2]--;
    if (!M[0x8BF2]) {
      M[0x88A3] = (M[0x88A3] + 1) & 255;
      if (M[0x88A3] === 0x32) {
        M[0x88A3] = 0;
        clock();
      }
    }
    const f = M[0x8A21];
    if (!(f & 1) && (f & 4)) return {};
    M[0x8A21] = f & 0xFE;
    if (!M[0x8A25]) return {};
    let ix = 0x8A44;
    for (let b = M[0x8A25]; b > 0; b--, ix = (ix + 6) & 0xFFFF) {
      M[ix + 2] = (M[ix + 2] + 1) & 255;
      if (M[ix + 2] === M[ix + 1]) M[ix + 2] = 0;
      if (!M[ix + 3]) continue;
      let c, act = 0;                // 0 next, 1 the border, 2 the beam and the border
      if (!M[ix + 2]) {
        M[0x8A21] |= 1;
        c = M[0x886B];
        act = (M[0x8A21] & 2) || M[ix + 3] !== 1 ? 1 : 2;
      } else {
        c = M[0x886A];
        if (M[ix + 3] === 1 && !(M[0x8A21] & 2)) act = M[ix + 2] === 1 ? 2 : 0;
        else if (M[ix + 2] === 2) act = 1;
        else if (M[ix + 2] === 1) M[0x8A21] |= 1;
      }
      if (!act) continue;
      if (act === 2) beam(ix);
      P.io.out(0xFE, c, P.T);
      if (M[ix + 2]) continue;
      P.play_sound({ a: 2 });
      if (M[0x8878]) {
        const n = (M[0x8878] - 1) & 255, l = M[0x8A68];
        M[0x8878] = n; M[0x8A68] = n;
        P.bar({ ix: 0xCFD1, h: n, l });
      } else M[0x8BF2] = 1;
    }
    return {};
  });
  // The clock a second on: the digits count down, 59 seconds after 00; a minute costs a unit of
  // energy, and the time running out ends the game ($8BF2 = 2) before the last digits are shown.
  function clock() {
    let hl = 0x88AB, a = (M[hl] - 1) & 255;
    const next = () => { a = (M[hl] - 1) & 255; return a === 0x2F; };
    if (a === 0x2F) {
      M[hl] = 0x39; hl--;
      if (next()) {
        const s = M[0x8875];
        if (s) {
          M[0x889C] = (M[0x889C] + 1) & 255; M[0x889D] = (M[0x889D] + 1) & 255;
          const n = (s - 1) & 255, l = M[0x8A67];
          M[0x8875] = n; M[0x8A67] = n;
          P.bar({ ix: 0xCFCE, h: n, l });
        } else M[0x8BF2] = 3;
        M[hl] = 0x35; hl -= 2;
        if (next()) {
          M[hl] = 0x39; hl--;
          if (next()) {
            M[hl] = 0x35; hl -= 2;
            if (next()) {
              M[hl] = 0x39; hl--;
              if (next()) { M[0x8BF2] = 2; return; }
            }
          }
        }
      }
    }
    M[hl] = a;
    P.print_text({ ix: 0x88A4, hl: 0xCFC8 });
  }
  // A sensor's beam: four lines from it on the screen to the corners of a strip down the view's
  // middle, drawn on the view as it is shown ($8BE4), the line routine's own bytes kept at $BAA2
  // meanwhile.
  function beam(ix) {
    M.copyWithin(0xBAA2, 0x8A0E, 0x8A1D);
    setw(0x8A0E, w(ix + 4));
    setw(0x8A1B, w(0x8BE4));
    M[0x8A10] = (M[0x88D9] - 3) & 255; M[0x8A11] = 0;
    P.draw_line({});
    M[0x8A10] = (M[0x88D9] + 3) & 255;
    P.draw_line({});
    M[0x8A11] = (M[0x88DA] * 2) & 255;
    P.draw_line({});
    M[0x8A10] = (M[0x88D9] - 3) & 255;
    P.draw_line({});
    M.copyWithin(0x8A0E, 0xBAA2, 0xBAB1);
  }
};
})(typeof window !== 'undefined' ? window : globalThis);
