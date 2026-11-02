// Areas and rigs ($BCA6-$BEF3, $BEFA-$C2AE, $CD3B-$CDDB): the game's pointers set up, an area
// loaded, the probe kept clear of walls, the message line flashed, and the drilling rig placed,
// drilled and collected.
(function (root) {
'use strict';
const G = root.DRGroups = root.DRGroups || {};

G.area = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const sgn8 = v => (v & 0x80) !== 0;
  const sgn16 = v => (v & 0x8000) !== 0;

  // invert ($BCA6): inverts the text line whose record HL points at (a screen address, then the
  // count of characters), its eight pixel rows from the one above the address. Every register
  // kept.
  P.def(0xBCA6, 'invert', r => {
    const hl = r.hl & 0xFFFF;
    let a = (w(hl) - 0x100) & 0xFFFF;
    for (let n = M[(hl + 2) & 0xFFFF] || 256; n > 0; n--, a = (a + 1) & 0xFFFF) {
      for (let k = 0, b = a; k < 8; k++, b = (b + 0x100) & 0xFFFF) M[b] ^= 0xFF;
    }
    return {};
  });

  // enter_cell ($BCCB): keeps the probe's target ($88AF, $88B1, $88B3) at least $88D0 fine units
  // from the faces of its cell that have an object behind them: an axis whose target lies within
  // that of the cell's low or high face is tested with collide in that direction, and the target
  // is moved to the margin on each such axis when something is met. The object met goes to
  // $8A69, or to $BCCA when $8A69 already holds one. IX, HL, BC and AF kept.
  P.def(0xBCCB, 'enter_cell', () => {
    let c = 0;
    const h = M[0x88D0], l = (0x40 - h) & 255;
    const near = (a, lo, hi) => {
      const v = M[a] & 0x3F;
      if (sgn8(v - h)) c |= lo;
      else if (!sgn8(v - l)) c |= lo | hi;
    };
    near(0x88AF, 2, 1); near(0x88B1, 8, 4); near(0x88B3, 0x20, 0x10);
    const ix = M[0x8A69] ? 0xBCCA : 0x8A69;
    if (!c) return {};
    if (!(P.collide({ ix, a: c }).a & 255)) return {};
    const put = (a, mv, up) => { if (c & mv) M[a] = ((M[a] & 0xC0) + (c & up ? l : h)) & 255; };
    put(0x88AF, 2, 1); put(0x88B1, 8, 4); put(0x88B3, 0x20, 0x10);
    return {};
  });

  // init_game_data ($BD74): the pointers into the game's data (the areas at $CF3E, their table at
  // $D006, the colour patterns at $CF48, the font at $CDDC), the recorded demonstration's start,
  // the shared script, the probe's limits, the key repeat's delay and rate, the counters the
  // interrupt keeps, the message line and the clock's digits, and which vehicle the game starts
  // in with its shield and fuel.
  P.def(0xBD74, 'init_game_data', () => {
    setw(0x8912, 0xCF3E);
    setw(0x8A1B, w(0x8BE4));
    setw(0x8914, 0xD006);
    setw(0x891D, 0xCF48);
    setw(0x8A81, 0xCDDC);
    const de = w(0x8912);
    const demo = (w(0xCF84) + de) & 0xFFFF;
    setw(0x8924, demo); setw(0x8927, demo);
    M[0x8926] = 0;
    setw(0x8922, w(0xCF86) + de);
    M[0x8773] = M[0xCFFA]; M[0x8774] = M[0xCFFB]; M[0x8771] = M[0xCFFD];
    M[0x8FC3] = M[0xD002]; M[0x8FC4] = M[0xD003];
    setw(0x8A65, w(0xD004));
    for (let k = 0; k < 3; k++) M[0x8BF3 + k] = M[0xCFA4 + k];
    for (let k = 0; k < 8; k++) M[0x88A4 + k] = M[0xCFF2 + k];
    M[0x877A] = M[0xCFFF];
    if (M[0x877A]) { M[0x887E] |= 0x80; M[0x8875] = M[0x8876]; M[0x8878] = M[0x8879]; }
    else { M[0x887E] &= 0x7F; M[0x8875] = M[0x8877]; M[0x8878] = M[0x887A]; }
    return {};
  });

  // load_area ($BE18): area $8862 made current: its record found through the table at ($8914),
  // its objects ($8863 of them at ($8864)), its script at ($8868), its name at ($8866), its
  // colours ($886E-$8871) and the gas field's centre and size ($87A0-$87A2); the probe's scale
  // ($8779, from the area) sets the step, the fall and climb limits, the height and the most it
  // can stand up ($8768, $8777, $8778, $8776, $8775); the rig placed, and the area's colours
  // asked for ($8910).
  P.def(0xBE18, 'load_area', () => {
    M[0x88AE] = 0; M[0x889D] = 0;
    M[0x87FE] |= 0x40; M[0x880E] |= 0x40; M[0x881E] |= 0x40;
    M[0x8910] = 1; M[0x8BF0] = 1;
    let hl = w(0x8914), ix = -1;
    for (let b = M[0xCF3E] || 256; b > 0; b--) {
      const x = (w(0x8912) + w(hl)) & 0xFFFF;
      hl = (hl + 2) & 0xFFFF;
      if (M[0x8862] === M[(x + 2) & 0xFFFF]) { ix = x; break; }
    }
    if (ix < 0) return {};
    const o = k => M[(ix + k) & 0xFFFF];
    M[0x889F] = o(0); M[0x8863] = o(1);
    setw(0x8868, ix + (o(3) | o(4) << 8));
    const b = o(5);
    M[0x8779] = b;
    setw(0x8768, P.mul_16x8({ hl: M[0x876A], a: b }).hl);
    M[0x8777] = P.mul_s8({ h: M[0x8773], l: b }).l;
    M[0x8778] = P.mul_s8({ h: M[0x8774], l: b }).l;
    M[0x8776] = P.mul_s8({ h: M[0x8772], l: b }).l;
    M[0x8775] = P.mul_s8({ h: M[0x8771], l: b }).l;
    M[0x87A0] = o(0x0A); M[0x87A1] = o(0x0B); M[0x87A2] = o(0x0C);
    P.place_rig({});
    for (let k = 0; k < 4; k++) M[0x886E + k] = o(6 + k);
    setw(0x8866, ix + 4 + 9);
    setw(0x8864, ix + 4 + 9 + 0x0C);
    return {};
  });

  // place_rig ($CD3B): the five objects of the rig in the shared list ($87A5, $87C0, $87CE, $87DE,
  // $87EE) put where the area's rig stands ($882C, three bytes an area) and shown, the last two
  // only when it struck gas; all hidden in an area with no rig or none to drill (area $13 up).
  // Bit 6 of $887E says whether the area can have one. Every register kept.
  P.def(0xCD3B, 'place_rig', () => {
    M[0x887E] &= ~0x40;
    const area = M[0x8862];
    const show = (at, x, y, z) => { M[at] &= ~0x40; M[at + 1] = x & 255; M[at + 2] = y & 255; M[at + 3] = z & 255; };
    const hide = at => { M[at] |= 0x40; };
    let state = 0;
    if (sgn8(area - 0x13)) {
      M[0x887E] |= 0x40;
      state = M[(0x877B + area - 1) & 0xFFFF];
    }
    if (!state) { hide(0x87A5); hide(0x87C0); hide(0x87CE); hide(0x87DE); hide(0x87EE); return {}; }
    const at = (0x882C + 3 * ((area - 1) & 255)) & 0xFFFF;
    const x = M[at], y = M[at + 1], z = M[at + 2];
    show(0x87A5, x + 2, y, z + 2);
    show(0x87C0, x, y + 0x0A, z);
    show(0x87CE, x + 3, y + 0x0B, z + 3);
    if (state === 1) { hide(0x87DE); hide(0x87EE); return {}; }
    show(0x87DE, x + 5, y + 0x13, z + 5);
    show(0x87EE, x + 5, y + 0x14, z + 5);
    return {};
  });

  // show_message ($C29A): the text at IX on the line whose record HL points at (the message line,
  // $CFAD, as drill calls it), the line inverted, then inverted again with the text on it, and
  // left for 50 frames.
  const flash = function* (ix, hl = 0xCFAD) {
    M[0x8FC2] = 0x32;
    P.invert({ hl });
    P.print_text({ hl, ix });
    P.invert({ hl });
    yield* P.until0(0x8FC2, 0xFF, 29);
  };
  P.def(0xC29A, 'show_message', function* (r) { yield* flash(r.ix & 0xFFFF, r.hl & 0xFFFF); return {}; });

  // rig_redraw ($C259): the rig placed and the whole view redrawn (sound 5 queued) under the message
  // at $8C90 for 50 frames, as if the probe had moved ($8BF0 set meanwhile). Gives BC = $8920 as
  // it was.
  P.def(0xC259, 'rig_redraw', function* () {
    P.place_rig({});
    const bc = w(0x8920);
    setw(0x8920, 0x0404);
    P.print_text({ hl: 0xCFAD, ix: 0x8C90 });
    P.invert({ hl: 0xCFAD });
    M[0x8FC2] = 0x32;
    M[0x8A1F] = 5;
    const e = M[0x8BF0];
    M[0x8BF0] = 1;
    P.draw_view({});
    yield* P.process_sensors({});
    P.update_panel({});
    M[0x8BF0] = e;
    yield* P.until0(0x8FC2, 0xFF, 29);
    return { bc, b: bc >> 8, c: bc & 255 };
  });

  // drill ($BEFA): commands $28 (drill) and $2A (collect the rig), only when the key is pressed
  // alone. Each needs an area that can have a rig ($8862 below $13), the probe on the ground (not
  // the jet) and a shield of 5 or more, which each costs. Drilling places the rig in front of the
  // probe by its heading, on the floor or on top of a block, clear of every other object, and
  // rates the strike by the distance from the area's gas field: 100 - (distance x 100 / size), the
  // percentage; 50 or more makes the sector safe (18 safe sectors win the game). The score goes up
  // by the percentage times the gas the rig taps (the table at ($87A3), picked once a game from
  // the interrupt's frame count) times 10; collecting a rig takes that score back.
  P.def(0xBEFA, 'drill', function* (r) {
    const e = r.a & 255;
    if (M[0x8FBC] !== 1) return {};
    M[0x8A64] = 1;
    const area = M[0x8862], c = (area - 1) & 255;
    let ix = 0x8C12, ok = sgn8(area - 0x13);
    const state = M[(0x877B + c) & 0xFFFF];
    if (ok) {
      if (e === 0x28) { if (state) { ix = 0x8C9E; ok = false; } }
      else if (!state) { ix = 0x8CAC; ok = false; }
    }
    if (ok && M[0x877A]) { ix = 0x8C66; ok = false; }
    if (ok && sgn8(M[0x8875] - 5)) { ix = 0x8C58; ok = false; }
    let bc;
    if (ok && e !== 0x28) {
      // collect
      const pct = M[(0x878D + c) & 0xFFFF];
      M[(0x878D + c) & 0xFFFF] = 0;
      const gas = M[(w(0x87A3) + c) & 0xFFFF];
      const p = P.mul_16x8({ hl: P.mul_s8({ h: pct, l: gas }).hl, a: 0xF6 });
      setw(0xBEF7, p.hl); M[0xBEF9] = p.a & 255;
      yield* P.run_script({ ix: 0xBEF6, a: 4 });
      M[0x8875] = (M[0x8875] - 5) & 255;
      const was = M[(0x877B + c) & 0xFFFF];
      M[(0x877B + c) & 0xFFFF] = 0;
      if (was === 3) M[0x889E] = (M[0x889E] - 1) & 255;
      bc = (yield* P.rig_redraw({})).bc;
      yield* flash(0x8C82);
      return finish(bc);
    }
    if (ok) {
      // where the rig would stand: the probe's cell, moved by the heading
      let x = (w(0x8762) * 4 >> 8) & 255, z = (w(0x8766) * 4 >> 8) & 255;
      const hd = M[0x876D];
      const lt = n => sgn8(hd - n);
      if (lt(5)) x -= 6;
      else if (lt(0x0E)) { /* as it is */ }
      else if (lt(0x17)) z -= 6;
      else if (lt(0x20)) z -= 0x0C;
      else if (lt(0x29)) { x -= 6; z -= 0x0C; }
      else if (lt(0x32)) { x -= 0x0C; z -= 0x0C; }
      else if (lt(0x3B)) { x -= 0x0C; z -= 6; }
      else if (lt(0x44)) x -= 0x0C;
      else x -= 6;
      x &= 255; z &= 255;
      ix = 0x8C2E;
      ok = sgn8(((M[0x88E0] - 1) - x) & 255) && sgn8(((M[0x88E4] - 1) - z) & 255)
        && !sgn8(((M[0x88DF] - 0x0C) - x) & 255) && !sgn8(((M[0x88E3] - 0x0C) - z) & 255);
      let y = 0;
      if (ok) {
        y = (((w(0x8764) * 4) >> 8) - (M[0x8776] - 1)) & 255;
        if (y) {
          // on top of a block: one whose top is the rig's floor, under all of it
          ok = false;
          let iy = w(0x8864);
          const n = M[0x8863];
          for (let l = n; n && l > 0; l--) {
            const o = k => M[(iy + k) & 0xFFFF];
            if (!(o(0) & 0x40) && (o(0) & 0x0F) === 1 && ((o(2) + o(5)) & 255) === y) {
              let a = (o(1) - 6) & 255;
              if (sgn8(a - x)) {
                a = (a + o(4) - 1) & 255;
                if (!sgn8(a - x)) {
                  a = (o(3) - 6) & 255;
                  if (sgn8(a - z)) {
                    a = (a + o(6) - 1) & 255;
                    if (!sgn8(a - z)) { ok = true; break; }
                  }
                }
              }
            }
            iy = (iy + o(8)) & 0xFFFF;
          }
        }
      }
      if (ok) {
        // clear of every object
        let iy = w(0x8864);
        const n = M[0x8863];
        for (let l = n; n && l > 0; l--) {
          const o = k => M[(iy + k) & 0xFFFF];
          if (!(o(0) & 0x40)
            && !sgn8(((o(1) + o(4) - 1) - x) & 255) && !sgn8(((o(2) + o(5) - 1) - y) & 255)
            && !sgn8(((o(3) + o(6) - 1) - z) & 255) && !sgn8(((x + 0x0B) - o(1)) & 255)
            && !sgn8(((y + 0x16) - o(2)) & 255) && !sgn8(((z + 0x0B) - o(3)) & 255)) { ok = false; break; }
          iy = (iy + o(8)) & 0xFFFF;
        }
      }
      if (ok) {
        M[0x8875] = (M[0x8875] - 5) & 255;
        const at = (0x882C + 3 * ((area - 1) & 255)) & 0xFFFF;
        M[at] = x; M[at + 1] = y; M[at + 2] = z;
        const bx = (x + 6) & 255, bz = (z + 6) & 255;
        let dx = (M[0x87A0] - bx) & 255; if (sgn8(dx)) dx = (-dx) & 255;
        let dz = (M[0x87A1] - bz) & 255; if (sgn8(dz)) dz = (-dz) & 255;
        const d = P.mul_s8({ h: (dx + dz) & 255, l: 0x64 }).hl;
        const q = P.div_24_16({ a: 0, hl: d, de: M[0x87A2] });
        const left = (0x64 - (q.hl & 0xFFFF)) & 0xFFFF;
        if (sgn16(left) || !left) {
          // nothing struck
          M[(0x878D + c) & 0xFFFF] = 0;
          M[0xBEF4] = 0;
          M[(0x877B + c) & 0xFFFF] = 1;
          bc = (yield* P.rig_redraw({})).bc;
          yield* flash(0x8C20);
          yield* flash(0x8C74);
          return finish(bc);
        }
        const pct = left & 255;
        M[0xBEF4] = pct;
        if (!M[0x879F]) {
          M[0x879F] = 1;
          setw(0x87A3, 0x88EB + (P.irqByte(0x88A3) & 0x0F));
        }
        M[(0x878D + c) & 0xFFFF] = pct;
        let st = 2;
        if (!sgn8(pct - 0x32)) {
          st = 3;
          M[0x889E] = (M[0x889E] + 1) & 255;
          if (M[0x889E] === 0x12) M[0x8BF2] = 5;
        }
        M[(0x877B + c) & 0xFFFF] = st;
        const gas = M[(w(0x87A3) + c) & 0xFFFF];
        M[0xBEF5] = gas;
        const p = P.mul_16x8({ hl: P.mul_s8({ h: pct, l: gas }).hl, a: 0x0A });
        setw(0xBEF7, p.hl); M[0xBEF9] = p.a & 255;
        yield* P.run_script({ ix: 0xBEF6, a: 4 });
        P.write_number({ hl: gas, de: 0, ix: 0x8C3E, a: 2 });
        if (M[0x8C3E] === 0x30) M[0x8C3E] = 0x20;
        P.write_number({ hl: pct, de: 0, ix: 0x8C4B, a: 3 });
        for (let k = 0; k < 2 && M[0x8C4B + k] === 0x30; k++) M[0x8C4B + k] = 0x20;
        bc = (yield* P.rig_redraw({})).bc;
        yield* flash(0x8C20);
        yield* flash(0x8C3C);
        yield* flash(0x8C4A);
        return finish(bc);
      }
    }
    // refused: the reason flashed for 50 frames
    P.print_text({ hl: 0xCFAD, ix });
    P.invert({ hl: 0xCFAD });
    M[0x8FC2] = 0x32;
    yield* P.until0(0x8FC2, 0xFF, 29);
    P.invert({ hl: 0xCFAD });
    M[0x8921] |= 0x20;
    return {};
  });
  function finish(bc) {
    P.invert({ hl: 0xCFAD });
    setw(0x8920, bc | 0x2000);
    return {};
  }
};
})(typeof window !== 'undefined' ? window : globalThis);
