// Moving the probe ($9DCF-$A802): a step into the next cell with its climbing and falling, a move
// along a straight line cell by cell, the movement commands, the test of a cell against the
// area's objects, and the area's colours.
//
// Positions: the probe's at $8762, $8764 and $8766 (x, height, z), in the fine units of which 64
// make a cell; the cell it stands in at $88B5-$88B7; a target at $88AF, $88B1 and $88B3.
(function (root) {
'use strict';
const G = root.DRGroups = root.DRGroups || {};

G.move = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const sgn8 = v => (v & 0x80) !== 0;
  // the cell of a fine coordinate: the word times 4, its high byte
  const cellOf = v => (((v << 2) & 0xFFFF) >> 8);
  // A cells as a fine coordinate: A x 64
  const fine = a => ((a & 255) << 6) & 0xFFFF;
  const collide = (ix, a) => P.collide({ ix, a }).a & 255;

  // step_to ($9DCF): the probe into the next cell in the directions of A (bits 1 and 0: x, and up;
  // 3 and 2: height; 5 and 4: z), after the test against the objects. Flying, a blocked cell
  // stops it (A = 1, $8A1E set). Walking, a blocked cell is climbed if a cell up to $8778 higher
  // is free and the probe's height ($8776) of cells above it too, the height then raised and
  // sound 4 queued; otherwise A = 1. Once in, it falls to the first cell with something under it,
  // sound 3 queued, and a fall of more than $8777 cells ends the game (code 4). A = 2 after a
  // climb or a fall, else 0.
  P.def(0x9DCF, 'step_to', r => {
    const c = r.a & 255;
    let b = r.b & 255, d, e, h, l;
    e = collide(0x8A69, c);
    const blocked = () => { M[0x8A1E] = 1; return { a: 1 }; };
    let climb = true;
    if (M[0x877A]) {
      if (e) return blocked();
      climb = false;
    } else if (e) { h = 0; l = 1; } else {
      h = 1;
      if (M[0x8776] === h) { b = 0; climb = false; } else l = 0;
    }
    if (climb) {
      d = 1;
      M[0x9DC9] = M[0x88B6];
      for (;;) {
        if (M[0x8776] === h) break;
        if (sgn8(M[0x8778] - l)) { M[0x88B6] = M[0x9DC9]; return blocked(); }
        d = (d + 1) & 255;
        if (M[0x88E1] === ((M[0x88B6] + 1) & 255)) { M[0x88B6] = M[0x9DC9]; return blocked(); }
        if (collide(0x9DCA, 0x0C)) { M[0x88B6] = M[0x9DC9]; return blocked(); }
        M[0x88B6] = (M[0x88B6] + 1) & 255;
        if (!collide(0x8A69, c)) h = (h + 1) & 255; else { h = 0; l = d; }
      }
      d = (d - M[0x8776]) & 255;
      M[0x88B6] = (M[0x9DC9] + d) & 255;
      b = 0;
      if (d) {
        setw(0x88B1, w(0x88B1) + fine(d));
        b = 2;
        M[0x8A1F] = 4;
      }
    }
    // the move itself
    if (c & 2) M[0x88B5] = (M[0x88B5] + (c & 1 ? 1 : -1)) & 255;
    if (c & 0x20) M[0x88B7] = (M[0x88B7] + (c & 0x10 ? 1 : -1)) & 255;
    if (M[0x877A]) {
      if (c & 8) M[0x88B6] = (M[0x88B6] + (c & 4 ? 1 : -1)) & 255;
      return { a: 0 };
    }
    if (M[0x88E2] === M[0x88B6]) return { a: b };
    d = 0;
    for (;;) {
      if (collide(0x8A69, 8)) break;
      d = (d + 1) & 255;
      M[0x88B6] = (M[0x88B6] - 1) & 255;
      if (M[0x88E2] === M[0x88B6]) break;
    }
    if (!d) return { a: b };
    M[0x8A1F] = 3;
    setw(0x88B1, w(0x88B1) - fine(d));
    if (!sgn8(M[0x8777] - d)) return { a: 2 };
    M[0x876E] = 0x12; M[0x876C] = 0; M[0x8BF2] = 4;
    return { a: 2 };
  });

  // move_to ($9F42): the probe from where it is towards the target, cell by cell: at each cell
  // boundary the line crosses first (x, then z, then height), where it crosses the others is
  // worked out from the line, and step_to takes it into the next cell. The area's walls and a
  // blocked step stop it at the boundary (just short of it when $88D0 is set); with $88D0 set the
  // position becomes the target or where it stopped, the cells it passes are checked for the
  // area's triggers (enter_cell) and A = 1 if it moved. HL, DE and BC kept.
  P.def(0x9F42, 'move_to', () => {
    let c = 0, a, b;
    b = cellOf(w(0x8762)); M[0x88B5] = b;
    a = cellOf(w(0x88AF)); M[0x9F33] = a;
    if (a !== b) { c |= 2; if (!sgn8(a - b)) c |= 1; }
    b = cellOf(w(0x8764)); M[0x88B6] = b;
    a = cellOf(w(0x88B1)); M[0x9F34] = a;
    if (a !== b) { c |= 8; if (!sgn8(a - b)) c |= 4; }
    b = cellOf(w(0x8766)); M[0x88B7] = b;
    a = cellOf(w(0x88B3)); M[0x9F35] = a;
    if (a !== b) { c |= 0x20; if (!sgn8(a - b)) c |= 0x10; }
    if (c) moveCells(c);
    if (!M[0x88D0]) return { a: 0 };
    P.enter_cell({});
    if (!M[0x877A]) {
      const n = (M[0x8776] - 1) & 255;
      for (let k = n; n && k > 0; k--) { M[0x88B6] = (M[0x88B6] + 1) & 255; P.enter_cell({}); }
    }
    a = 0;
    for (const [pos, tgt] of [[0x8762, 0x88AF], [0x8764, 0x88B1], [0x8766, 0x88B3]]) {
      if (w(pos) !== w(tgt)) { setw(pos, w(tgt)); a = 1; }
    }
    return { a };
  });
  // the point where the line from the probe to the target crosses the plane at fine coordinate v of
  // one axis: the others moved by their share, (v - from) x delta / (that axis's delta), rounded
  const across = (v, from, dOther, dAxis, base) => {
    const m = P.mul_16x16({ hl: (v - w(from)) & 0xFFFF, de: w(dOther) });
    const q = P.div_32_16({ hl: m.hl, de: m.de, bc: w(dAxis) });
    return (q.hl + w(base)) & 0xFFFF;
  };
  // whether the crossing at fine coordinate v of an axis is in the probe's cell of that axis
  // (cell at $88B5-$88B7) as the direction (up) would have it: it is when the cell is the same,
  // or one beyond moving up with v exactly on the boundary; 'other' is a cell other than the
  // probe's: the crossing is not this one
  const sameCell = (v, cell, up) => {
    const e = v & 255, h = cellOf(v);
    let x = M[cell];
    if (up) {
      x = (x - h) & 255;
      if (!x) return 'next';
      if (x !== 0xFF) return 'other';
      return (e & 0x3F) ? 'other' : 'both';
    }
    if (x !== h) return 'other';
    return (e & 0x3F) ? 'next' : 'both';
  };
  function moveCells(c) {
    setw(0x9F3C, w(0x88AF) - w(0x8762));
    setw(0x9F3E, w(0x88B1) - w(0x8764));
    setw(0x9F40, w(0x88B3) - w(0x8766));
    for (;;) {
      let b = -1;
      // x first
      if ((c & 3) && M[0x88B5] !== M[0x9F33]) {
        b = c & 3;
        const xv = fine(M[0x88B5] + (c & 1));
        setw(0x9F36, xv);
        setw(0x9F38, across(xv, 0x8762, 0x9F3E, 0x9F3C, 0x8764));
        setw(0x9F3A, across(xv, 0x8762, 0x9F40, 0x9F3C, 0x8766));
        let ok = true;
        if (c & 0x20) {
          const s = sameCell(w(0x9F3A), 0x88B7, c & 0x10);
          if (s === 'other') ok = false; else if (s === 'both') b |= 0x30 & c;
        }
        if (ok && (c & 8)) {
          const s = sameCell(w(0x9F38), 0x88B6, c & 4);
          if (s === 'other') ok = false; else if (s === 'both') b |= 0x0C & c;
        }
        if (!ok) b = -1;
      }
      // then z
      if (b < 0 && (c & 0x30) && M[0x88B7] !== M[0x9F35]) {
        b = c & 0x30;
        const zv = fine(M[0x88B7] + ((c >> 4) & 1));
        setw(0x9F3A, zv);
        setw(0x9F36, across(zv, 0x8766, 0x9F3C, 0x9F40, 0x8762));
        setw(0x9F38, across(zv, 0x8766, 0x9F3E, 0x9F40, 0x8764));
        if (c & 8) {
          const s = sameCell(w(0x9F38), 0x88B6, c & 4);
          if (s === 'other') b = -1; else if (s === 'both') b |= 0x0C & c;
        }
      }
      // then the height
      if (b < 0) {
        b = c & 0x0C;
        const yv = fine(M[0x88B6] + ((c >> 2) & 1));
        setw(0x9F38, yv);
        setw(0x9F36, across(yv, 0x8764, 0x9F3C, 0x9F3E, 0x8762));
        setw(0x9F3A, across(yv, 0x8764, 0x9F40, 0x9F3E, 0x8766));
      }
      // the area's walls, then the step
      let stop = 0;
      if ((b & 2) && (b & 1 ? M[0x88DF] === ((M[0x88B5] + 1) & 255) : M[0x88E0] === M[0x88B5])) stop = 1;
      else if ((b & 0x20) && (b & 0x10 ? M[0x88E3] === ((M[0x88B7] + 1) & 255) : M[0x88E4] === M[0x88B7])) stop = 1;
      else if ((b & 8) && (b & 4 ? M[0x88E1] === ((M[0x88B6] + 1) & 255) : M[0x88E2] === M[0x88B6])) stop = 1;
      else {
        const s = P.step_to({ a: b, b }).a & 255;
        if (s === 1) stop = 1;
        else if (s === 2) stop = 2;
        else if (M[0x88B5] === M[0x9F33] && M[0x88B7] === M[0x9F35] && M[0x88B6] === M[0x9F34]) return;
      }
      if (!stop) continue;
      // stopped at the crossing: there, or just short of it with $88D0 set
      const back = (v, cell) => (M[0x88D0] && cellOf(v) !== M[cell]) ? (v - 1) & 0xFFFF : v;
      if (stop === 1) setw(0x88B1, back(w(0x9F38), 0x88B6));
      setw(0x88AF, back(w(0x9F36), 0x88B5));
      setw(0x88B3, back(w(0x9F3A), 0x88B7));
      return;
    }
  }

  // move_command ($A279): commands 1-$14, those that move the probe or turn it. 1 and 2 up and
  // down: flying, by $8768; walking, the probe stands up or crouches by $8779 cells, up to $8771
  // and down to 1 ($8772). 3 and 4 forward and back by $8768 along the heading ($876D) and, flying,
  // the pitch ($876C); 5-$0A turn left and right, look up and down, roll, by the turn step
  // ($876F), in $48ths of a turn; $0D turns round; $0B and $0C the turn step from the table at
  // $88CA; $11 and $12 the walking step from the table at $88BF, as $8768 = step x $8779, each of
  // these with a pause of 7 frames. The bits of BC go into $8920 for the redraw.
  P.def(0xA279, 'move_command', function* (r) {
    const a = r.a & 255;
    let bc = 0;
    let wait = false, moved = true;
    const mulShift = (hl, x) => {
      const q = P.mul_16x8({ hl: hl & 0xFFFF, a: x & 255 });
      const p = ((q.a & 255) << 16) | ((q.h & 255) << 8) | (q.l & 255);
      return ((p << 2) & 0xFFFFFF) >> 8;
    };
    if (a === 1 || a === 2) {
      if (a === 1 || M[0x877A]) { setw(0x88AF, w(0x8762)); setw(0x88B3, w(0x8766)); }
      if (M[0x877A]) {
        setw(0x88B1, a === 1 ? w(0x8764) + w(0x8768) : w(0x8764) - w(0x8768));
        if (P.move_to({}).a & 255) bc = 0x14;
      } else if (a === 1) {
        if (!sgn8(M[0x8772] - M[0x8771])) moved = true;
        else {
          const old = w(0x8764);
          let hl = old;
          for (let n = M[0x8779] || 256; n > 0; n--) hl = (hl + 0x40) & 0xFFFF;
          setw(0x88B1, hl);
          M[0x877A] = 1;
          P.move_to({});
          M[0x877A] = 0;
          if (hl === w(0x88B1)) {
            M[0x8772] = (M[0x8772] + 1) & 255;
            M[0x8776] = (M[0x8776] + M[0x8779]) & 255;
            bc = 0x8014;
          } else setw(0x8764, old);
        }
      } else if (M[0x8772] !== 1) {
        M[0x8772] = (M[0x8772] - 1) & 255;
        let x = M[0x8776], hl = w(0x8764);
        for (let n = M[0x8779] || 256; n > 0; n--) { x = (x - 1) & 255; hl = (hl - 0x40) & 0xFFFF; }
        M[0x8776] = x; setw(0x8764, hl);
        bc = 0x8014;
      }
    } else if (a === 3 || a === 4) {
      if (M[0x8FBC] === 1) M[0x8BF0] = 1;
      const fwd = a === 3, sign = v => fwd ? v : (-v) & 0xFFFF;
      let hl = w(0x8768);
      if (M[0x877A]) {
        const ix = (0x8E78 + 2 * M[0x876C]) & 0xFFFF;
        hl = sign(mulShift(hl, -M[ix]));
        setw(0x88B1, w(0x8764) + hl);
        let x = M[ix + 1];
        if (x & 0x80) x = (-x) & 255;
        hl = mulShift(w(0x8768), x);
      }
      const step = hl;
      const iy = (0x8E78 + 2 * M[0x876D]) & 0xFFFF;
      setw(0x88B3, w(0x8766) + sign(mulShift(step, M[iy + 1])));
      setw(0x88AF, w(0x8762) + sign(mulShift(step, M[iy])));
      let de = 0;
      if (!M[0x877A]) {
        de = fine((M[0x8776] - 1) & 255);
        const y = (w(0x8764) - de) & 0xFFFF;
        setw(0x8764, y); setw(0x88B1, y);
      }
      if (P.move_to({}).a & 255) bc = 0x14;
      if (!M[0x877A]) setw(0x8764, w(0x8764) + de);
    } else if (a >= 5 && a <= 0x0A) {
      const [at, c, add] = { 5: [0x876D, 0x24, false], 6: [0x876D, 0x24, true], 7: [0x876C, 0x44, false],
        8: [0x876C, 0x44, true], 9: [0x876E, 4, true], 10: [0x876E, 4, false] }[a];
      bc = c;
      let x;
      if (add) { x = (M[at] + M[0x876F]) & 255; if (!sgn8(x - 0x48)) x = (x - 0x48) & 255; }
      else { x = (M[at] - M[0x876F]) & 255; if (sgn8(x)) x = (x + 0x48) & 255; }
      M[at] = x;
    } else if (a === 0x0D) {
      bc = 0x24;
      let x = (M[0x876D] + 0x24) & 255;
      if (!sgn8(x - 0x48)) x = (x - 0x48) & 255;
      M[0x876D] = x;
      if (M[0x877A] && M[0x876C]) { M[0x876C] = (-(M[0x876C] - 0x48)) & 255; bc = 0x64; }
    } else if (a === 0x0B || a === 0x0C) {
      moved = false;
      let x = null;
      if (a === 0x0B) { if (M[0x8770] !== ((M[0x88C9] - 1) & 255)) x = (M[0x8770] + 1) & 255; }
      else if (M[0x8770]) x = (M[0x8770] - 1) & 255;
      if (x !== null) {
        M[0x8770] = x; M[0x876F] = M[(0x88CA + x) & 0xFFFF];
        bc = 0x80; wait = true;
      }
    } else if (a === 0x11 || a === 0x12) {
      moved = false;
      let x = null;
      if (a === 0x11) { if (M[0x876B] !== ((M[0x88BE] - 1) & 255)) x = (M[0x876B] + 1) & 255; }
      else if (M[0x876B]) x = (M[0x876B] - 1) & 255;
      if (x !== null) {
        M[0x876B] = x;
        const s = M[(0x88BF + x) & 0xFFFF];
        M[0x876A] = s;
        setw(0x8768, P.mul_16x8({ hl: s, a: M[0x8779] }).hl);
        bc = 0x100; wait = true;
      }
    } else moved = false;
    if (wait) {
      M[0x8FC2] = 7;
      yield* P.until0(0x8FC2, 0xFF, 29);
    }
    if (moved) M[0x8A64] = 1;
    M[0x8920] |= bc & 255;
    M[0x8921] |= bc >> 8;
    return {};
  });

  // collide ($A597): whether the cell the probe is in ($88B5-$88B7) meets an object of the area's
  // lists, approached in the directions of A as step_to's: an object of type 3 or $0A up stops it
  // at once, its number at IX; another's number is kept and given at the end; A = 1 with a number,
  // else 0. Hidden objects are passed over.
  P.def(0xA597, 'collide', r => {
    const c = r.a & 255;
    M[0xA596] = 0;
    let hit = false;
    const scan = (iy, b) => {
      do {
        if (!(M[iy] & 0x40) && meets(iy, c)) {
          const e = M[(iy + 7) & 0xFFFF], t = M[iy] & 15;
          if (t === 3 || !sgn8(t - 0x0A)) { M[r.ix & 0xFFFF] = e; hit = true; return; }
          M[0xA596] = e;
        }
        iy = (iy + M[(iy + 8) & 0xFFFF]) & 0xFFFF;
        b = (b - 1) & 255;
      } while (b);
    };
    if (M[0x8863]) scan(w(0x8864), M[0x8863]);
    if (!hit) scan(0x87A5, M[0x890F]);
    if (hit) return { a: 1 };
    const id = M[0xA596];
    if (!id) return { a: 0 };
    M[r.ix & 0xFFFF] = id;
    return { a: 1 };
  });
  // Whether the probe's cell meets the object at iy in the directions of c: for each axis it moves
  // along (x, then height, then z), the face it moves towards is the object's near face, and on
  // the other two axes the cell is inside the object's extent or on a face it is moving across.
  // The game's own slips are kept: the height test of the x pass takes the cell from D, and the x
  // test of the height pass compares A, whichever value it holds.
  function meets(iy, c) {
    const o = k => M[(iy + k) & 0xFFFF];
    const P8 = [0x88B5, 0x88B6, 0x88B7];
    // on the axis k's near face moving up (dirBit), or its far face moving down
    const atFace = (k, up, x) => up ? ((x + 1) & 255) === o(1 + k) : ((o(1 + k) + o(4 + k)) & 255) === x;
    // inside axis k's extent, or at a face it moves across (move bits mb, up bit ub); the value
    // of A on the way out, for the game's slip; 'in' true when inside
    const inside = (k, mb, ub, slipA) => {
      const d = M[P8[k]];
      let a = d;
      if (!sgn8((d - o(1 + k)) & 255)) {
        a = (o(1 + k) + o(4 + k)) & 255;
        if (a !== d && !sgn8((a - d) & 255)) return true;
      }
      if (!(c & mb)) return false;
      if (c & ub) {
        const v = slipA ? a : d;
        return ((v + 1) & 255) === o(1 + k);
      }
      return ((o(1 + k) + o(4 + k)) & 255) === d;
    };
    if (c & 2) {
      if (atFace(0, c & 1, M[0x88B5]) && inside(1, 8, 4, false) && inside(2, 0x20, 0x10, false)) return true;
    }
    if (c & 8) {
      if (atFace(1, c & 4, M[0x88B6]) && inside(0, 2, 1, true) && inside(2, 0x20, 0x10, false)) return true;
    }
    if (c & 0x20) {
      if (atFace(2, c & 0x10, M[0x88B7]) && inside(0, 2, 1, false) && inside(1, 8, 4, false)) return true;
    }
    return false;
  }

  // set_area_colours ($A77A): the area's colours from $886E-$8871 made current ($886A-$886D), every
  // sensor's count reset to 2, the view window's attributes painted with the ink and paper of
  // $886C and $886D, and the border set.
  P.def(0xA77A, 'set_area_colours', () => {
    M[0x8910] = 0;
    setw(0x886A, w(0x886E)); setw(0x886C, w(0x8870));
    for (let k = 0; k < 5; k++) M[0x8A46 + 6 * k] = 2;
    const de = w(0xCF8F), e = de & 255, d = de >> 8;
    let hl = 0x5800 + (e & 0x1F) + 0x20 * (e >> 5);
    if (d !== 0x40) { hl += 0x100; if (d !== 0x48) hl += 0x100; }
    const attr = ((M[0x886C] << 3) | M[0x886D]) & 255, wid = M[0x88DD], skip = (0x20 - wid) & 255;
    for (let rows = (M[0x88DB] >> 3) || 256; rows > 0; rows--) {
      for (let n = wid || 256; n > 0; n--) { M[hl & 0xFFFF] = attr; hl++; }
      hl += skip;
    }
    P.io.out(0xFE, M[0x886A]);
    return {};
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
