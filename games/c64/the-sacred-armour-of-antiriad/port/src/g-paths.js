// The sprites' movement paths: lists of four-byte steps (direction bits, step sizes, frame count,
// command) that slots 2-7 follow, one frame at a time, from the interrupt.
(function (root) {
'use strict';
const G = root.AntGroups = root.AntGroups || {};
G.paths = function (P) {
  const M = P.M, R = P.irqByte;
  const w = a => M[a] | M[a + 1] << 8;
  const at = (zp, y) => (w(zp) + y) & 0xFFFF;
  const dec = a => (M[a] = (R(a) - 1) & 255);

  // run_paths ($A8A0): each of slots 2-7 with a path, neither dissolving nor materialising, a
  // frame along it; one without a path has no direction.
  P.run_paths = function () {
    for (let x = 2; x < 8; x++) {
      if (R(0x02D8 + x) & 0x80) {
        if (!((R(0x0290 + x) | R(0x02A8 + x)) & 0x80)) P.path_step({ x });
      } else M[0x02C8 + x] = 0;
    }
    return { x: 8 };
  };
  // path_step ($A8C0): one frame of slot X's path (path_ptrs, $C683). While a step's frames last
  // ($02E0), its delayed sizes count their delays ($0300 vertical, $0308 horizontal) down, moving
  // a pixel when one reaches 0; at a step's end, its command ($02E8): 0 the next step, 1 another
  // path and animation, 2 another path, 3 a jump within the path, more the chase.
  P.path_step = function (r) {
    const x = r.x;
    for (;;) {
      const yy = (R(0x02D8 + x) << 1) & 255;
      M[0x1C] = M[0xC683 + yy]; M[0x1D] = M[0xC684 + yy];
      if (R(0x02E0 + x)) {
        let d1;
        const d0 = R(0x0300 + x);
        if (!(d0 & 0x80)) {
          if (!d0) P.load_path_step({ x, y: (R(0x02D0 + x) - 2) & 255 });
          else {
            dec(0x0300 + x);
            M[0x02F8 + x] = 0;
            d1 = R(0x0308 + x);
            if (d1 & 0x80) return {};
            return horizontal(x, d1);
          }
        }
        d1 = R(0x0308 + x);
        if (d1 & 0x80) { dec(0x02E0 + x); return {}; }
        return horizontal(x, d1);
      }
      const cmd = R(0x02E8 + x);
      if (cmd === 0) {
        M[0x0308 + x] = 0x80; M[0x0300 + x] = 0x80;
        const p = (R(0x02D0 + x) + 4) & 255;
        M[0x02D0 + x] = p;
        M[0x02E8 + x] = M[at(0x1C, (p - 1) & 255)];
        M[0x02E0 + x] = M[at(0x1C, (p - 2) & 255)];
        P.load_path_step({ x, y: (p - 2) & 255 });
        return {};
      }
      if (cmd === 1) {
        let y = R(0x02D0 + x);
        M[0x02D8 + x] = M[at(0x1C, y)] | 0x80;
        y = (y + 1) & 255;
        M[0x0260 + x] = M[at(0x1C, y)];
        P.reset_slot_path({ x });
        M[0x02C8 + x] = 0; M[0x0268 + x] = 0;
        M[0x0270 + x] = 2;
        return {};
      }
      if (cmd === 2) {
        M[0x02D8 + x] = M[at(0x1C, R(0x02D0 + x))] | 0x80;
        P.reset_slot_path({ x });
        continue;
      }
      if (cmd === 3) {
        M[0x02D0 + x] = (M[at(0x1C, R(0x02D0 + x))] << 2) & 255;
        M[0x02E0 + x] = 0; M[0x02E8 + x] = 0;
        M[0x0308 + x] = 0x80; M[0x0300 + x] = 0x80;
        continue;
      }
      return P.path_chase({ x });
    }
  };
  // the horizontal delay's turn (b_A8FC): counted down, or at 0 the step loaded again and its
  // frame counted
  function horizontal(x, d1) {
    if (d1) { dec(0x0308 + x); M[0x02F0 + x] = 0; return {}; }
    P.load_path_step({ x, y: (R(0x02D0 + x) - 2) & 255 });
    dec(0x02E0 + x);
    return {};
  }
  // load_path_step ($A935): the step before path position Y into slot X: its sizes, a nibble of 8
  // or more giving 1 with a delay of n & 7, and its direction; its frame counted when neither size
  // is delayed.
  P.load_path_step = function (r) {
    const x = r.x;
    let y = (r.y - 1) & 255;
    M[0x57] = M[at(0x1C, y)];
    let v = M[0x57] & 0x0F;
    if (v >= 8) { M[0x0300 + x] = v & 7; v = 1; }
    M[0x02F8 + x] = v;
    v = R(0x57) >> 4;
    if (v >= 8) { M[0x0308 + x] = v & 7; v = 1; }
    M[0x02F0 + x] = v;
    y = (y - 1) & 255;
    M[0x02C8 + x] = M[at(0x1C, y)];
    if ((R(0x0308 + x) & 0x80) && (R(0x0300 + x) & 0x80) && R(0x02E0 + x)) dec(0x02E0 + x);
    return { y };
  };
  // path_chase ($A9CF): the chase: slot X's direction towards Tal, by the sprites' 9-bit X and
  // its Y less 10 against his, its horizontal speed a pixel every n + 1 frames.
  P.path_chase = function (r) {
    const x = r.x;
    const d1 = R(0x0308 + x);
    if (!(d1 & 0x80)) {
      if (d1) { dec(0x0308 + x); M[0x02F0 + x] = 0; }
      else { M[0x0308 + x] = (M[at(0x1C, (R(0x02D0 + x) - 3) & 255)] >> 4) & 7; M[0x02F0 + x] = 1; }
    }
    const y = (x << 1) & 255;
    M[0xA2] = 4; M[0xA4] = 1;
    if (!(R(0x0210) & M[0xF118 + x])) M[0xA4] = 0;
    const tal = R(0x0210) & 1;
    if (tal === M[0xA4]) {
      const s = R(0x0200 + y), t = R(0x0200);
      if (s === t) M[0xA2] = 0;
      else if (s < t) M[0xA2] = 8;
    } else if (tal > M[0xA4]) M[0xA2] = 8;
    M[0xA3] = 1;
    const v = (R(0x0201 + y) - 0x0A) & 255, u = R(0x0201);
    if (v === u) M[0xA3] = 0;
    else if (v < u) M[0xA3] = 2;
    const a = M[0xA2] | M[0xA3];
    M[0x02C8 + x] = a;
    return { a, y };
  };
  // reset_slot_path ($AA54): slot X's path state cleared, both delays off; A = 0, which callers
  // store as the next field.
  P.reset_slot_path = function (r) {
    const x = r.x;
    M[0x0308 + x] = 0x80; M[0x0300 + x] = 0x80;
    M[0x02E0 + x] = 0; M[0x02E8 + x] = 0; M[0x02D0 + x] = 0;
    return { a: 0 };
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
