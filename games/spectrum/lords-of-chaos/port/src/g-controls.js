// The controls ($622B-$629A) and the ROM's KEY-SCAN ($028E), which the game calls for the file
// name and the designer's keys: the keyboard, the Kempston joystick and the Sinclair joysticks read
// as five bits, and the keyboard scanned for one key and a shift. Each is a checkpoint of the
// lockstep: the port yields there before it reads, then the T-states the read itself takes.
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.controls = function (P) {
  const M = P.M, def = P.def;
  const inp = port => P.io.in(port & 0xFFFF) & 255;
  // the rotates the readers use, on a byte and the carry
  const rra = (a, c) => [((a >> 1) | (c << 7)) & 255, a & 1];
  const rl = (b, c) => [((b << 1) | c) & 255, b >> 7];
  const rr = (b, c) => [((b >> 1) | (c << 7)) & 255, b & 1];
  const rlca = a => ((a << 1) | (a >> 7)) & 255;

  // read_sinclair: half-rows $EF (6 to 0) and $F7 (1 to 5), the second's first five bits reversed
  // (into C, whose bits move up) and the two combined.
  const sinclair = r => {
    const e = inp(0xEFFE);
    let a = inp(0xF7FE), c = r.c & 255, cy = 0;
    for (let i = 0; i < 5; i++) { [a, cy] = rra(a, cy); [c, cy] = rl(c, cy); }
    return { a: (c & e) | 0xE0, c, e, b: 0, t: 192 };
  };
  def(0x6247, 'read_sinclair', r => { const o = sinclair(r); delete o.t; return o; });

  // read_kempston: port $1F (A, here 2 x control_type, the high byte), its bits reordered into the
  // game's and inverted.
  const kempston = r => {
    let a = inp(((r.a & 255) << 8) | 0x1F), b = 0, cy = 0;
    [a, cy] = rra(a, cy); [b, cy] = rr(b, cy);
    [a, cy] = rra(a, cy); [b, cy] = rl(b, cy); [b, cy] = rl(b, cy);
    for (let i = 0; i < 3; i++) { [a, cy] = rra(a, cy); [b, cy] = rl(b, cy); }
    return { a: (~b & 255) | 0xE0, b, t: 111 };
  };
  def(0x625C, 'read_kempston', r => { const o = kempston(r); delete o.t; return o; });

  // read_keyboard: A ($FD), Q ($FB), P and O ($DF) and SPACE ($7F), as SPACE, Q, A, P, O in bits 0-4.
  const keyboard = () => {
    let e = rlca(inp(0xFDFE) | 0xFE);
    e = rlca((inp(0xFBFE) | 0xFE) & e);
    e = rlca(rlca(rlca(inp(0xDFFE) | 0xFC))) & e;
    const a = (inp(0x7FFE) | 0xFE) & e;
    return { a, e, bc: 0x7FFE, t: 161 };
  };
  def(0x6276, 'read_keyboard', r => { const o = keyboard(); delete o.t; return o; });

  // read_controls: the handler for control_type ($622A, through the table at $6241) into $5B13.
  def(0x622B, 'read_controls', function* (r) {
    yield { cp: 0x622B };
    const type = M[0x622A];
    const h = M[(0x6241 + 2 * type) & 0xFFFF] | M[(0x6242 + 2 * type) & 0xFFFF] << 8;
    const hr = Object.assign({}, r, { a: (2 * type) & 255 });
    let o;
    if (h === 0x6276) o = keyboard();
    else if (h === 0x625C) o = kempston(hr);
    else if (h === 0x6247) o = sinclair(hr);
    else { o = Object.assign({ t: 0 }, P.jump(h, hr)); }
    M[0x5B13] = o.a;
    yield { tstates: 148 + o.t };
    delete o.t;
    return Object.assign(o, { hl: h, de: 0x623D });
  });

  // KEY-SCAN, the ROM's ($028E): E the key pressed (its number, 8 x the half-row's place from the
  // top down plus the key's place along it), D a shift key held with it; $FF for none. Z clear when
  // three keys or more are held, or two that are not a shift and a key.
  def(0x028E, 'key_scan', function* (r) {
    yield { cp: 0x028E };
    let t = 27, l = 0x2F, d = 0xFF, e = 0xFF, b = 0xFE, out = null;
    for (let line = 0; line < 8 && !out; line++) {
      let a = (~inp(b << 8 | 0xFE)) & 0x1F;
      t += 12 + 4 + 7;
      if (a) {
        t += 7 + 4 + 4;
        let h = a;
        a = l;
        for (;;) {
          d = (d + 1) & 255; t += 4;
          if (d) { t += 11; out = { a, d, e, h, l, zf: false }; break; }
          t += 5;
          let cy;
          do { a = (a - 8) & 255; cy = h & 1; h >>= 1; t += 7 + 8 + (cy ? 7 : 12); } while (!cy);
          d = e; e = a; t += 8;
          if (h) { t += 12; continue; }
          t += 7;
          break;
        }
        if (out) break;
      } else t += 12;
      l = (l - 1) & 255;
      b = ((b << 1) | (b >> 7)) & 255;
      t += 4 + 8 + (line < 7 ? 12 : 7);
    }
    if (!out) {
      let a = (d + 1) & 255;
      t += 8;
      if (!a) { t += 11; out = { a, d, e, zf: true }; }
      else if (a === 0x28) { t += 5 + 7 + 11; out = { a, d, e, zf: true }; }
      else if (a === 0x19) { t += 5 + 7 + 5 + 7 + 11; out = { a, d, e, zf: true }; }
      else {
        t += 5 + 7 + 5 + 7 + 5 + 4 + 4 + 4 + 7 + 10;
        const k = e; e = d; d = k;
        out = { a: k, d, e, zf: k === 0x18, cf: k < 0x18 };
      }
    }
    yield { tstates: t };
    out.bc = (b << 8 | 0xFE) & 0xFFFF;
    return out;
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
