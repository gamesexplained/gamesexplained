// The screens over the view ($C3DC-$C831, $C86D-$C91C, $C9C6-$CAA5, $CB7A-$CD3A): the
// information screen with the game saved and loaded, the file name typed, the control options,
// and the security question.
//
// The tape. The game saves and loads through the ROM (SA-BYTES at $04C6, LD-BYTES at $0562),
// which the port does not have: P.io.tape stands in for the cassette, as blocks in the .tap
// file's form, each a flag byte and its data. P.io.tape.save(flag, bytes) records a block and
// gives true, or false for BREAK. P.io.tape.load(flag, length) gives the next block's
// { flag, bytes }, null for none (a failed load: with SPACE held, BREAK), or undefined while it
// waits (a page waiting for a file), when the port polls; LD-BYTES's own test (the flag and the length the game asks for, and the
// block's parity, which a block in this form always passes) decides whether it loaded.
(function (root) {
'use strict';
const G = root.DRGroups = root.DRGroups || {};

G.menu = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const sgn8 = v => (v & 0x80) !== 0;
  const frames = function* (n) { M[0x8FC2] = n; yield* P.until0(0x8FC2, 0xFF, 29); };
  const waitBeam = function* () { M[0x8A21] |= 4; yield* P.until0(0x8A21, 1, 24); };
  const keys = function* () { for (;;) { const k = yield* P.read_keys({}); if (k.cf) return k.a & 255; yield; } };
  const blank = (at, n) => { for (let k = 0; k < n; k++) M[(at + k) & 0xFFFF] = 0x20; };
  const copy = (from, to, n) => { for (let k = 0; k < n; k++) M[(to + k) & 0xFFFF] = M[(from + k) & 0xFFFF]; };
  // the rows of the view's buffer cleared, from the bottom: all but the top one, or all (rows),
  // with each row's address seen by look(address, index) on the way
  const clearRows = (all, look) => {
    let c = M[0x88DB], hl = (w(0x8BE4) + 2 * c) & 0xFFFF;
    if (!all) c = (c - 1) & 255;
    for (let n = c || 256; n > 0; n--, c = (c - 1) & 255) {
      hl = (hl - 2) & 0xFFFF;
      let de = w(hl);
      if (look) look(de, c);
      for (let b = M[0x88DD] || 256; b > 0; b--, de = (de + 1) & 0xFFFF) M[de] = 0;
    }
  };
  // a number of `digits` digits at ix, its leading zeros (up to `zeros` of them) shown as spaces
  const number = (v, hi, ix, digits, zeros) => {
    P.write_number({ hl: v & 0xFFFF, de: hi & 0xFFFF, ix, a: digits });
    for (let k = 0; k < zeros && M[(ix + k) & 0xFFFF] === 0x30; k++) M[(ix + k) & 0xFFFF] = 0x20;
  };
  // lines of text, 26 characters each from ix, on the view's rows 8 apart, but for the lines the
  // game leaves blank (skip), by a record at rec (its screen address put there in turn)
  const lines = (ix, rec, skip) => {
    let hl = (w(0x8BE4) + 2 * ((M[0x88DB] - 1) & 255)) & 0xFFFF;
    for (let a = 1; a !== 0x0C; a++) {
      hl = (hl - 15) & 0xFFFF;
      const d = M[hl];
      hl = (hl - 1) & 0xFFFF;
      if (skip.includes(a)) continue;
      M[rec] = M[hl]; M[rec + 1] = d;
      P.print_text({ hl: rec, ix });
      ix = (ix + 0x1A) & 0xFFFF;
    }
  };

  // info_screen ($C3DC): with its key pressed alone, the information screen over the view: the
  // area, its rig and gas (struck as thousands of cubic feet and the percentage of the field
  // tapped, or the gas in hand), the safe sectors. A key then: S or L saves or loads the game
  // under a name typed (filename) and redraws the view, 1 abandons the game ($8BF2 stays 6), any
  // other dissolves the view back in.
  P.def(0xC3DC, 'info_screen', function* () {
    if (M[0x8FBC] !== 1) return {};
    yield* waitBeam();
    M[0x8BF2] = 6;
    M[0x8FC2] = 0x19;
    const keep = w(0x8870);
    setw(0x8870, 0x0600);
    P.set_area_colours({});
    setw(0x8870, keep);
    clearRows(false);
    for (let k = 1; k <= 5; k++) blank(0xC2B2 + 13 * (2 * k - 1), 13);
    copy(w(0x8866), 0xC2BF, 12);
    const area = M[0x8862];
    let status = -1;
    if (!sgn8(area - 0x13)) {
      copy(0xC39C, 0xC2B7, 6);
      status = 0xC3A8;
    } else {
      copy(0xC3A2, 0xC2B7, 6);
      const c = (area - 1) & 255, st = M[(0x877B + c) & 0xFFFF];
      if (!st) status = 0xC3B4;
      else {
        if (sgn8(st - 2)) {
          copy(0xC3CA, 0xC2F3, 4); copy(0xC3CA, 0xC327, 4); copy(0xC3CE, 0xC30D, 4);
        } else {
          const gas = (w(0x87A3) + c) & 0xFFFF, pct = (0x878D + c) & 0xFFFF;
          number(M[gas], 0, 0xC2F3, 2, 1);
          M[0xC2F5] = M[0xC2F6] = M[0xC2F7] = 0x30;
          M[0xC2F9] = 0x43; M[0xC2FA] = 0x46; M[0xC2FB] = 0x54;
          number(M[pct], 0, 0xC30F, 3, 2);
          M[0xC313] = 0x25;
          const t = P.mul_16x8({ hl: P.mul_s8({ h: 0x0A, l: M[pct] }).hl, a: M[gas] });
          number(t.hl, t.a & 255, 0xC327, 5, 4);
          M[0xC32D] = 0x43; M[0xC32E] = 0x46; M[0xC32F] = 0x54;
        }
        copy(0xC3C0, 0xC2D9, 10);
      }
    }
    if (status >= 0) {
      copy(status, 0xC2D9, 12);
      M[0xC2F3] = M[0xC30D] = M[0xC327] = 0x2D;
    }
    number(M[0x889E], 0, 0xC361, 2, 1);
    lines(0xC2B2, 0xC2AF, [6, 9]);
    yield* P.until0(0x8FC2, 0xFF, 29);
    let a;
    for (;; yield) {
      a = yield* keys();
      if (a !== 0x53 && a !== 0x4C) break;
      M[0xC3D2] = a;
      if (M[0x8FBC] === 1) break;
    }
    let end = 0;
    if (a === 0x53 || a === 0x4C) {
      const name = yield* P.filename({});
      M[0xC3D3] = name.a & 255;
      setw(0xC3D4, name.hl);
      if (M[0xC3D2] === 0x53) yield* save();
      else if (yield* load()) {
        P.io.out(0xFE, M[0x886A], P.T);
        yield* P.security({});
        end = 2;
      }
      if (!end) {
        P.io.out(0xFE, M[0x886A], P.T);
        yield* frames(0x32);
      }
      setw(0x8920, 0xFFFD);
      M[0x8910] = 1; M[0x8BF0] = 1;
      P.draw_view({});
      yield* P.process_sensors({});
      P.update_panel({});
    } else {
      if (a === 0x31) return {};
      M[0x8FC2] = 0x0B;
      P.set_area_colours({});
      P.dissolve({});
      if (M[0x88A2]) P.crosshair({});
      yield* P.until0(0x8FC2, 0xFF, 29);
    }
    M[0x8BF2] = 0;
    M[0x8A21] = 0;
    return {};
  });

  // The game's state: the 333 bytes from $8762, then each object's type byte, area by area.
  const state = (each) => {
    let iy = w(0x8914);
    for (let c = M[0xCF3E] || 256; c > 0; c--) {
      let ix = (w(0x8912) + w(iy)) & 0xFFFF;
      iy = (iy + 2) & 0xFFFF;
      const n = M[(ix + 1) & 0xFFFF];
      ix = (ix + 0x19) & 0xFFFF;
      for (let b = n || 256; b > 0; b--) { each(ix); ix = (ix + M[(ix + 8) & 0xFFFF]) & 0xFFFF; }
    }
  };
  // The save: the state in the buffer at ($8A95), its checksum, and a header (a $1B, the name, the
  // length, the game's own number at $CF3F, the checksum) after it; the messages; a key; the
  // header and, 50 frames later, the state, each through SA-BYTES.
  function* save() {
    const buf = w(0x8A95);
    copy(0x8762, buf, 0x14D);
    let hl = (buf + 0x14D) & 0xFFFF;
    state(ix => { M[hl] = M[ix]; hl = (hl + 1) & 0xFFFF; });
    setw(0xC3D8, hl);
    const len = (hl - buf) & 0xFFFF;
    setw(0xC3D6, len);
    const sum = P.checksum({ de: buf, hl: len }).bc;
    setw(0xC3DA, sum);
    let de = hl;
    M[de] = 0x1B; de = (de + 1) & 0xFFFF;
    copy(w(0xC3D4), de, 12); de = (de + 12) & 0xFFFF;
    setw(de, len); setw(de + 2, w(0xCF3F)); setw(de + 4, sum);
    P.print_text({ hl: 0xCFD7, ix: 0x8F1C });
    P.print_text({ hl: 0xCFDA, ix: 0x8F6C });
    for (;;) { if (!(yield* P.read_keys({})).cf) break; yield; }
    for (;;) { if ((yield* P.read_keys({})).cf) break; yield; }
    P.print_text({ hl: 0xCFDA, ix: 0x8F08 });
    P.print_text({ hl: 0xCFD7, ix: 0x8F80 });
    const tape = P.io.tape;
    if (!tape || !tape.save(0, M.slice(hl, hl + 0x13))) return;
    yield* frames(0x32);
    tape.save(0xFF, M.slice(buf, buf + len));
  }
  // A block loaded as LD-BYTES would (flag and length as asked): true when it did, false when it
  // did not, null for BREAK (SPACE held as it returns). No block (the tape's null) is a load that
  // failed, as LD-BYTES stopped by BREAK is; the page holds SPACE for it.
  function* block(flag, at, len) {
    const tape = P.io.tape;
    let b = null;
    while (tape && (b = tape.load(flag, len)) === undefined) yield;
    const ok = !!b && b.flag === flag && b.bytes.length === len;
    if (ok) for (let k = 0; k < len; k++) M[(at + k) & 0xFFFF] = b.bytes[k];
    if (!(P.io.in(0x7FFE) & 1)) return null;
    return ok;
  }
  // The load: headers until one of this game's with the name typed (or any, with none typed), then
  // its state, checked by its checksum, over the game's.
  function* load() {
    P.print_text({ hl: 0xCFD7, ix: 0x8FA8 });
    for (;;) {
      const buf = w(0x8A95);
      const h = yield* block(0, buf, 0x13);
      if (h === null) return false;
      if (!h || M[buf] !== 0x1B) continue;
      copy((buf + 1) & 0xFFFF, 0x8F9C, 12);
      P.print_text({ hl: 0xCFD7, ix: 0x8F94 });
      let ix = buf;
      if (!M[0xC3D3]) ix = (ix + 0x0D) & 0xFFFF;
      else {
        ix = (ix + 1) & 0xFFFF;
        let same = true;
        for (let k = 0, hl = w(0xC3D4); k < 12; k++) if (M[(ix + k) & 0xFFFF] !== M[(hl + k) & 0xFFFF]) { same = false; break; }
        if (!same) continue;
        ix = (ix + 12) & 0xFFFF;
      }
      const len = w(ix);
      setw(0xC3D6, len);
      if ((len >> 8) & 0xF0 || w(ix + 2) !== w(0xCF3F)) { P.print_text({ hl: 0xCFDA, ix: 0x8F30 }); return false; }
      setw(0xC3DA, w(ix + 4));
      P.print_text({ hl: 0xCFDA, ix: 0x8F58 });
      const d = yield* block(0xFF, w(0x8A95), len);
      if (d === null) return false;
      if (!d) { P.print_text({ hl: 0xCFDA, ix: 0x8F44 }); return false; }
      if (P.checksum({ de: w(0x8A95), hl: w(0xC3D6) }).bc !== w(0xC3DA)) { P.print_text({ hl: 0xCFDA, ix: 0x8F30 }); return false; }
      let hl = w(0x8A95);
      copy(hl, 0x8762, 0x14D);
      hl = (hl + 0x14D) & 0xFFFF;
      state(o => { M[o] = M[hl]; hl = (hl + 1) & 0xFFFF; });
      return true;
    }
  }

  // checksum ($C814): the bytes at DE, HL of them, folded into BC: the even ones XORed into B, the
  // odd ones into C, then BC turned two bits to the left.
  P.def(0xC814, 'checksum', r => {
    let de = r.de & 0xFFFF, hl = r.hl & 0xFFFF, b = 0, c = 0;
    for (;;) {
      b ^= M[de]; de = (de + 1) & 0xFFFF; hl = (hl - 1) & 0xFFFF;
      if (!hl) break;
      c ^= M[de]; de = (de + 1) & 0xFFFF; hl = (hl - 1) & 0xFFFF;
      if (!hl) break;
    }
    let cy = b >> 7; b = (b << 1) & 255;
    let n = c >> 7; c = ((c << 1) | cy) & 255; cy = n;
    n = b >> 7; b = ((b << 1) | cy) & 255; cy = n;
    c = ((c << 1) | cy) & 255;
    return { a: 0, b, c, bc: b << 8 | c, de, d: de >> 8, e: de & 255, hl: 0, h: 0, l: 0 };
  });

  // filename ($C86D): the view cleared, and a name of up to 12 characters typed on its 17th row
  // (space to Z; CAPS SHIFT and 0 rubs out; ENTER ends it), the keys repeating after 35 frames and
  // then every 5. Gives A = its length and HL = $C855, where it is.
  P.def(0xC86D, 'filename', function* () {
    const keep = w(0x8FC3);
    setw(0x8FC3, 0x0523);
    M[0x8FC2] = 0x19;
    clearRows(false, (de, c) => { if (((M[0x88DB] - c) & 255) === 0x11) setw(0xC835, de); });
    yield* P.until0(0x8FC2, 0xFF, 29);
    copy(0xC861, 0xC855, 12);
    P.print_text({ hl: 0xC835, ix: 0xC849 });
    const n = yield* type(0xC855, 0x0C, 0x20, 0xC835, 0xC849);
    setw(0x8FC3, keep);
    return { a: n, hl: 0xC855, h: 0xC8, l: 0x55 };
  });
  // Typing at iy, up to most characters from lo to Z, each shown by the record at rec with the text
  // at ix; ENTER ends it, giving the count.
  function* type(iy, most, lo, rec, ix) {
    let b = 0;
    for (;;) {
      const a = yield* keys();
      if (a === 0x0D) return b;
      if (a === 0x7F) {
        if (M[0x8FBC] !== 2 || M[0x8FBE] !== 0x30) continue;
        if (b) { b--; iy = (iy - 1) & 0xFFFF; M[iy] = 0x20; }
      } else {
        if (sgn8(a - lo) || !sgn8(a - 0x5B)) continue;
        if (b !== most) { b++; M[iy] = a; iy = (iy + 1) & 0xFFFF; }
      }
      P.print_text({ hl: rec, ix });
    }
  }

  // control_options ($C9C6): the view cleared under ink 6, the options listed, the chosen one
  // ($8FC5) inverted; 1-4 choose (keyboard, Sinclair, Kempston, cursor), ENTER begins, the keys of
  // the four directions put in the table at $8FC8 for the Sinclair stick's 9 8 6 7 or the cursor
  // keys' 7 6 5 8. Every register and the flags kept.
  P.def(0xC9C6, 'control_options', function* () {
    attrs();
    clearRows(true);
    let hl = 0xC91D;
    for (const ix of [0xC932, 0xC942, 0xC958, 0xC96E, 0xC984, 0xC99A, 0xC9AE]) {
      P.print_text({ hl, ix });
      hl = (hl + 3) & 0xFFFF;
    }
    let rec = (0xC920 + 3 * M[0x8FC5]) & 0xFFFF;
    P.invert({ hl: rec });
    // a key held repeats at once when play's rate ($8FC4) is 0: each turn of the loop takes the
    // game its time, a line here
    for (;; yield) {
      const a = yield* keys();
      if (a === 0x0D) break;
      if (sgn8(a - 0x31) || !sgn8(a - 0x35)) continue;
      M[0x8FC5] = (a - 0x31) & 255;
      P.invert({ hl: rec });
      rec = (0xC920 + 3 * M[0x8FC5]) & 0xFFFF;
      P.invert({ hl: rec });
      P.play_sound({ a: 6 });
    }
    const v = M[0x8FC5] === 1 ? [0x39, 0x38, 0x36, 0x37] : [0x37, 0x36, 0x35, 0x38];
    v.forEach((k, i) => { M[0x8FC8 + 9 * i] = k; });
    P.play_sound({ a: 6 });
    return {};
  });
  // the attributes of the view's 26 x 13 cells from $5843 made ink 6 on black
  const attrs = () => { for (let r = 0; r < 13; r++) M.fill(6, 0x5843 + 32 * r, 0x5843 + 32 * r + 26); };

  // security ($CB7A): the question from the manual: a page, a line and a word picked by the frame
  // counter ($8A1D) from the table at $ABC1 (each record: the word's length, the page + $40, the
  // line, the word + $20, the letters, each doubled), the word typed (A to Z, up to ten letters),
  // three tries; the right word mends the view's routine (the PUSH IX at $6B12 that the question
  // spoils) and goes on; three wrong words wipe memory and reset the machine.
  P.def(0xCB7A, 'security', function* () {
    const keep = w(0x8FC3);
    setw(0x8FC3, 0x0523);
    attrs();
    P.clear_view({});
    M[0xCAA6] = 0;
    P.play_sound({ a: 6 });
    for (;;) {
      let iy = 0xABC1;
      const n = P.irqByte(0x8A1D) & 0x7F;
      for (let b = n; b > 0; b--) iy = (iy + ((M[iy] + 4) & 255)) & 0xFFFF;
      M[0x6B12] = 0xDD;
      number((M[(iy + 1) & 0xFFFF] - 0x40) & 255, 0, 0xCB38, 2, 1);
      number(M[(iy + 2) & 0xFFFF], 0, 0xCB52, 2, 1);
      number((M[(iy + 3) & 0xFFFF] - 0x20) & 255, 0, 0xCB6C, 2, 1);
      M[0xCB6F] = 0x23;
      blank(0xCB70, 9);
      lines(0xCAAA, 0xCAA7, [3, 6, 8]);
      const b = yield* type(0xCB6F, 0x0A, 0x41, 0xCAA7, 0xCB60);
      M[0xCAA6] = (M[0xCAA6] + 1) & 255;
      let ok = M[iy] === b;
      for (let k = 0; ok && k < b; k++) {
        if ((((M[(iy + 4 + k) & 0xFFFF] & 0xBF) | 0x80) >> 1) !== M[0xCB6F + k]) ok = false;
      }
      if (ok) break;
      P.play_sound({ a: 0x11 });
      if (M[0xCAA6] === 3) {
        M.fill(0, 0x5CBC, 0xCD0A);
        M.fill(0, 0xCD1E, 0xFFFF);
        throw P.RESET;
      }
    }
    M[0x6B13] = 0xE5;
    P.play_sound({ a: 6 });
    P.clear_view({});
    setw(0x8FC3, keep);
    return {};
  });

  // clear_view ($CD1E): the rows of the view's buffer cleared, but its top one.
  P.def(0xCD1E, 'clear_view', () => { clearRows(false); return {}; });
};
})(typeof window !== 'undefined' ? window : globalThis);
