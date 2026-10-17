// The sprites ($A079-$AA6B): the actors and objects drawn into the screen not shown, back to
// front, each through a visibility mask that leaves out the scenery standing in front of it.
//
// A sprite's drawing is set up in $A054-$A05C: the screen address of its next row ($A054), its
// graphics and mask ($A056, $A058; a 16-pixel sprite has no mask and makes one), the visibility
// mask's next row ($A05A, in the 192 bytes at $8521: 4 bytes across by 48 rows) and the frame
// byte, whose bit 7 mirrors it ($A05C). The drawers are code the setting up rewrites: the row
// count, and whether each byte of a row is stored (LD (HL),A and INC L, or two NOPs, for a sprite
// cut off at the view's side).
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.sprite = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const lo = (a, n) => (a & 0xFF00) | ((a + n) & 255);
  const inc = a => (a + 1) & 0xFFFF;
  const neg = a => (-a) & 255;
  // memory as the processor sees it, whichever bank is paged in at $C000
  const rd = a => M[P.mem.alias(a)];
  const wr = (a, v) => { M[P.mem.alias(a)] = v; };
  // a byte's store in a drawer: written when it is LD (HL),A, and the screen address moved on
  // when INC L follows
  const store = (at, sp, v) => {
    const op = M[at], step = M[at + 1];
    if (op === 0x77) wr(sp, v); else if (op !== 0) throw new Error('drawer store $' + at.toString(16) + ' is $' + op.toString(16));
    if (step === 0x2C) return lo(sp, 1);
    if (step !== 0) throw new Error('drawer step $' + (at + 1).toString(16) + ' is $' + step.toString(16));
    return sp;
  };
  // the screen's next pixel row down from $A054
  const nextRow = () => {
    let hl = w(0xA054);
    hl = (hl + 0x100) & 0xFFFF;
    if (!((hl >> 8) & 7)) hl = (hl + ((hl & 255) >= 0xE0 ? 0xFF20 : 0xF820)) & 0xFFFF;
    setw(0xA054, hl);
  };
  // the banks a drawer pages: the sprite's, and the screen not shown (5 when bit 3 of $8D1E shows
  // bank 7, else 7), both written into its own OUTs' operands
  const banks = (c, spriteAt, screenAt) => {
    const sb = (M[0x8D1E] & 0xF8) | c;
    M[spriteAt] = sb;
    let a = (sb & 0xF8) | 5;
    if (!(a & 8)) a |= 7;
    M[screenAt] = a;
  };
  const rev = v => M[0x8000 + v];                  // the bits reversed, from the table at $8000

  // draw_sprite_24 ($A079) and draw_sprite_24_left ($A178): three bytes of graphics and three of
  // mask a row, shifted right 0 to 3 pixels into four bytes (or left 4 to 1 for pixel positions
  // 4 to 7), the mask filling with ones. Each screen byte keeps what its mask and the visibility
  // mask's zeros keep, and takes the graphics where the visibility mask is set.
  function draw24(c, pos) {
    const left = pos >= 4;
    const k = left ? pos - 4 : (~pos) & 3, off = (k * 7) & 255;
    const A = left ? { jr: [0xA1FA, 0xA1D7], sb: 0xA1A7, scr: 0xA1BD, rows: 0xA1A4, st: [0xA226, 0xA235, 0xA244, 0xA257] }
      : { jr: [0xA102, 0xA0E6], sb: 0xA0B6, scr: 0xA0D5, rows: 0xA0B3, st: [0xA127, 0xA136, 0xA145, 0xA158] };
    M[A.jr[0]] = off; M[A.jr[1]] = off;
    banks(c, A.sb, A.scr);
    let mp = w(0xA058), gp = w(0xA056);
    const shifts = left ? 4 - k : 3 - k;
    let rows = M[A.rows];
    do {
      P.N.row24++; P.N.shift24 += shifts;
      P.io.out(0x7FFD, M[A.sb]);
      let b = rd(gp), cc = rd(inc(gp)), e = rd((gp + 2) & 0xFFFF); gp = (gp + 3) & 0xFFFF;
      let mb = rd(mp), mc = rd(inc(mp)), me = rd((mp + 2) & 0xFFFF); mp = (mp + 3) & 0xFFFF;
      if (M[0xA05C] & 0x80) { [mb, mc, me] = [rev(me), rev(mc), rev(mb)]; [b, cc, e] = [rev(e), rev(cc), rev(b)]; }
      P.io.out(0x7FFD, M[A.scr]);
      let g, m;
      if (!left) {
        let gv = (b << 16 | cc << 8 | e) * 256, mv = (mb << 16 | mc << 8 | me) * 256 + 0xFF;
        for (let s = 0; s < shifts; s++) { gv = Math.floor(gv / 2); mv = Math.floor(mv / 2) + 0x80000000; }
        g = [gv >>> 24 & 255, gv >>> 16 & 255, gv >>> 8 & 255, gv & 255];
        m = [mv >>> 24 & 255, mv >>> 16 & 255, mv >>> 8 & 255, mv & 255];
      } else {
        let gv = b << 16 | cc << 8 | e, mv = (0xFF << 24 | mb << 16 | mc << 8 | me) >>> 0;
        for (let s = 0; s < shifts; s++) { gv = (gv * 2) % 0x100000000; mv = ((mv * 2) % 0x100000000) + 1; }
        g = [gv >>> 24 & 255, gv >>> 16 & 255, gv >>> 8 & 255, gv & 255];
        m = [mv >>> 24 & 255, mv >>> 16 & 255, mv >>> 8 & 255, mv & 255];
      }
      let vp = w(0xA05A), sp = w(0xA054);
      for (let i = 0; i < 4; i++) {
        const v = M[vp]; vp = lo(vp, 1);
        sp = store(A.st[i], sp, (rd(sp) & ((~v | m[i]) & 255)) | (g[i] & v));
      }
      setw(0xA05A, vp);
      nextRow();
      rows = (rows - 1) & 255;
    } while (rows);
    return {};
  }
  P.def(0xA079, 'draw_sprite_24', r => draw24(M[(r.iy + 0x1F) & 0xFFFF], M[(r.iy + 0x14) & 0xFFFF] & 7));
  P.def(0xA178, 'draw_sprite_24_left', r => draw24(r.c, r.a));
  // $A07F: the bank in C and the pixel position in A (the menu pointer's, draw_pointer)
  P.def(0xA07F, 'draw_sprite_24_a07f', r => draw24(r.c, r.a & 7));

  // draw_sprite_16 ($A277) and draw_sprite_16_left ($A379): two bytes of graphics a row and a
  // mask made from them by the tables at $8100 (the left byte) and $8200 (the right): paper
  // across the row between its first and last pixels and one pixel either side, kept by the
  // ends the shift fills in (a one, or none where the row's edge pixel is set)
  function draw16(c, pos) {
    const left = pos >= 4;
    const k = left ? pos - 4 : (~pos) & 3, off = (k * 5) & 255;
    const A = left ? { jr: [0xA40B, 0xA3F2], sb: 0xA3A2, scr: 0xA3DA, rows: 0xA39F, st: [0xA434, 0xA443, 0xA456] }
      : { jr: [0xA2FF, 0xA313], sb: 0xA2AE, scr: 0xA2E4, rows: 0xA2AB, st: [0xA337, 0xA346, 0xA359] };
    M[A.jr[0]] = off; M[A.jr[1]] = off;
    banks(c, A.sb, A.scr);
    let gp = w(0xA056);
    const shifts = left ? 4 - k : 3 - k;
    let rows = M[A.rows];
    do {
      P.N.row16++; P.N.shift16 += shifts;
      P.io.out(0x7FFD, M[A.sb]);
      let d = rd(gp), e = rd(inc(gp)); gp = (gp + 2) & 0xFFFF;
      if (M[0xA05C] & 0x80) [d, e] = [rev(e), rev(d)];
      let md = M[0x8100 + d];
      if (!d && e) md = (md - 1) & 255;
      let me = M[0x8200 + e];
      if (!e && d) me &= 0x7F;
      P.io.out(0x7FFD, M[A.scr]);
      let g, m;
      if (!left) {
        // RR D, RR E, RRA: the mask with A $FF ($7F when the right byte's last pixel is set) and
        // the carry set (clear when the left byte's first pixel is)
        let a = e & 1 ? 0x7F : 0xFF, cy = d & 0x80 ? 0 : 1;
        for (let s = 0; s < shifts; s++) {
          const c1 = md & 1; md = (cy << 7) | (md >> 1);
          const c2 = me & 1; me = (c1 << 7) | (me >> 1);
          const c3 = a & 1; a = (c2 << 7) | (a >> 1); cy = c3;
        }
        let gv = (d << 16 | e << 8);
        for (let s = 0; s < shifts; s++) gv >>>= 1;
        g = [gv >>> 16 & 255, gv >>> 8 & 255, gv & 255];
        m = [md, me, a];
      } else {
        let a = d & 0x80 ? 0xFE : 0xFF, cy = e & 1 ? 0 : 1;
        for (let s = 0; s < shifts; s++) {
          const c1 = me >> 7; me = ((me << 1) | cy) & 255;
          const c2 = md >> 7; md = ((md << 1) | c1) & 255;
          const c3 = a >> 7; a = ((a << 1) | c2) & 255; cy = c3;
        }
        let gv = d << 8 | e;
        for (let s = 0; s < shifts; s++) gv <<= 1;
        g = [gv >>> 16 & 255, gv >>> 8 & 255, gv & 255];
        m = [a, md, me];
      }
      let vp = w(0xA05A), sp = w(0xA054);
      for (let i = 0; i < 3; i++) {
        const v = M[vp]; vp = lo(vp, 1);
        if (i === 2) vp = lo(vp, 1);
        sp = store(A.st[i], sp, (rd(sp) & ((~v | m[i]) & 255)) | (g[i] & v));
      }
      setw(0xA05A, vp);
      nextRow();
      rows = (rows - 1) & 255;
    } while (rows);
    return {};
  }
  P.def(0xA277, 'draw_sprite_16', r => draw16(M[(r.iy + 0x1F) & 0xFFFF], M[(r.iy + 0x14) & 0xFFFF] & 7));
  P.def(0xA379, 'draw_sprite_16_left', r => draw16(r.c, r.a));
  P.def(0xA27D, 'draw_sprite_16_a27d', r => draw16(r.c, r.a & 7));
  // mirror_24 ($A476), mirror_16 ($A48B): a row's bytes swapped end for end and each reversed,
  // in both register sets for the 24-pixel sprite
  P.def(0xA476, 'mirror_24', r => ({ b: rev(r.e), c: rev(r.c), e: rev(r.b), bc_: rev(r.de_ & 255) << 8 | rev(r.bc_ & 255),
    de_: (r.de_ & 0xFF00) | rev(r.bc_ >> 8) }));
  P.def(0xA48B, 'mirror_16', r => ({ d: rev(r.e), e: rev(r.d) }));

  // coarse_position ($A5BB): $A03A-$A03E from the record's words from +$0E (HL): across plus 2,
  // and down, over 4; height, screen across and screen down over 8
  const coarse = hl => {
    const word = k => M[lo(hl, k)] | M[lo(hl, k + 1)] << 8;
    M[0xA03A] = ((word(0) + 2) >> 2) & 255;
    M[0xA03B] = (word(2) >> 2) & 255;
    for (let i = 0; i < 3; i++) M[0xA03C + i] = (word(4 + 2 * i) >> 3) & 255;
  };
  P.def(0xA5BB, 'coarse_position', r => { coarse(r.hl); return {}; });

  // clip_sprite ($A653): whether any of the sprite is in the view, 28 bytes across from column
  // $9633 and 144 rows down from $9637 plus the pixel row: zf set if it is, with B columns cut off
  // at the left, C columns shown, D rows cut off at the top and E rows shown
  P.def(0xA653, 'clip_sprite', r => {
    const iy = r.iy, no = (a, d, e) => ({ zf: false, a: a | 1, b, c, d, e });
    let c = M[0xA03D], b = M[0x9633];
    const right = (b + 0x1B) & 255;
    let a = (right - c) & 255;
    if (right < c) return no(a, r.d, r.e);
    const d = M[(iy + 0x1C) & 0xFFFF];
    if (a < d) { b = 0; c = (a + 1) & 255; }
    else {
      const t = (d + c) & 255;
      a = (t - b) & 255;
      if (t <= b) return no(a, d, r.e);
      if (a < d) { c = a; b = (d - a) & 255; }
      else { b = 0; c = d; }
    }
    const top = w(0x9637);
    let hl = (top + 0x90) & 0xFFFF;
    hl = (hl & 0xFF00) | ((M[0x9632] + hl) & 255);
    const down = w((iy + 0x16) & 0xFFFF);
    if (hl <= down) return no(hl & 255, down >> 8, down & 255);
    if ((hl - down) >> 8) return no((hl - down) >> 8, down >> 8, down & 255);
    a = (hl - down) & 255;
    const rows = M[(iy + 0x1D) & 0xFFFF];
    let dd, e;
    if (a < rows) { e = a; dd = 0; }
    else {
      const bottom = (rows + down) & 0xFFFF;
      const sum = M[0x9632] + (top & 255), cy = sum > 255 ? 1 : 0;
      const view = (top & 0xFF00) | (sum & 255);
      const diff = bottom - view - cy;
      if (diff <= 0) return no(sum & 255, view >> 8, view & 255);
      if (diff >> 8) return no(diff >> 8, view >> 8, view & 255);
      a = diff & 255;
      if (a < rows) { e = a; dd = (rows - a) & 255; }
      else { dd = 0; e = rows; }
    }
    return { zf: true, a: 0, b, c, d: dd, e };
  });

  // patch_drawers ($A5EF): the drawers of the sprite's width (+$1C: 3, or else 4) given E rows,
  // and their stores: none for the B columns cut off at the left, then C written, none after
  const patch = (three, r) => {
    let table, width;
    if (three) { M[0xA2AB] = r.e; M[0xA39F] = r.e; width = 3; table = 0xA05D; }
    else { M[0xA0B3] = r.e; M[0xA1A4] = r.e; width = 4; table = 0xA069; }
    M[0xA633] = width;
    let op, step, n;
    if (!r.b) { op = 0x77; step = 0x2C; n = r.c; } else { op = 0; step = 0; n = (width - r.c) & 255; }
    let t = table;
    for (let k = M[0xA633]; k > 0; k--) {
      for (let j = 0; j < 2; j++) { const at = w(t); M[at] = op; M[inc(at)] = step; t = (t + 2) & 0xFFFF; }
      n = (n - 1) & 255;
      if (!n) { op ^= 0x77; step ^= 0x2C; }
    }
    return { e: width };
  };
  P.def(0xA5EF, 'patch_drawers', r => patch(M[(r.iy + 0x1C) & 0xFFFF] === 3, r));
  // $A5F2: the width in A (the menu pointer's, draw_pointer)
  P.def(0xA5F2, 'patch_drawers_a5f2', r => patch(r.a === 3, r));

  // set_up_sprite ($A493): the drawing of the actor at IY (and HL) set up. Its bank (+$1F) is
  // paged in; at a half character its screen position across is 4 less; its frame (+$1B, bit 7
  // the mirror, into $A05C) picks six bytes from the list at +$19: the width into +$1C, the rows
  // into +$1D less what the swamp has sunk it by (the type's count, type_byte), and the graphics
  // and mask. Its screen position down is moved up by the rows while it is clipped and set up,
  // and put back. zf clear when nothing is drawn: off the view, or sunk out of sight (a type $0C
  // to $0F starts sinking again; another is removed through bank 3's record ($E492), and $8D09
  // is set when it was the leader).
  P.def(0xA493, 'set_up_sprite', r => {
    const iy = r.iy;
    let hl = r.hl;
    P.page_bank_a({ a: M[(iy + 0x1F) & 0xFFFF] });
    hl = lo(hl, 0x14);
    if (M[0x9631]) {
      const v = M[hl] - 4;
      M[hl] = v & 255;
      if (v < 0) M[lo(hl, 1)] = (M[lo(hl, 1)] - 1) & 255;
    }
    hl = lo(hl, 5);
    let de = M[hl] | M[lo(hl, 1)] << 8; hl = lo(hl, 2);
    const frame = M[hl];
    M[0xA05C] = frame;
    de = (de + ((frame * 6) & 255)) & 0xFFFF;
    hl = lo(hl, 1);                                // +$1C
    M[hl] = M[de]; de = inc(de); hl = inc(hl);     // LDI: the width; de the rows, hl +$1D
    let a;
    const type = M[iy];
    if (type === 0x20) a = M[de];
    else {
      const sunk = M[P.type_byte({ a: type }).bc];
      a = M[de] - sunk;
      if (a < 0) a = 0;
      if (!a) {
        const leader = M[0x8D0A] === type;
        if (leader) M[0x8D09] = (~type) & 255;
        if ((type & 0xFC) === 0x0C) { M[P.type_byte({ a: 0x0C }).bc] = 0; a = M[de]; }
        else {
          P.page_bank_3();
          let rec = P.record_of({ a: type }).hl;
          rec = inc(rec); M[rec] = 8; rec = inc(rec); M[rec] = 0;
          M[(iy + 1) & 0xFFFF] = 0xFF;
          return { zf: false, a: 0xFF };
        }
      }
    }
    M[hl] = a;                                     // the rows
    const gfx = inc(de);
    const rows = M[hl];
    const at16 = lo(hl, -7);
    const down = M[at16] | M[lo(at16, 1)] << 8;
    const up = (down - rows) & 0xFFFF;
    M[lo(at16, 1)] = up >> 8; M[at16] = up & 255;
    coarse(lo(at16, -8));
    for (let i = 0; i < 4; i++) M[0xA056 + i] = M[(gfx + i) & 0xFFFF];
    const clip = P.clip_sprite({ iy });
    if (!clip.zf) { M[(iy + 0x16) & 0xFFFF] = down & 255; M[(iy + 0x17) & 0xFFFF] = down >> 8; return { zf: false, a: clip.a }; }
    P.patch_drawers({ iy, b: clip.b, c: clip.c, e: clip.e });
    let scr;
    if (clip.d) scr = 0xC022;
    else {
      let h = (w((iy + 0x16) & 0xFFFF) - w(0x9637)) & 0xFFFF;
      h = (h & 0xFF00) | ((neg(M[0x9632]) + h) & 255);
      const t = ((h * 2) + 0x8D5D) & 0xFFFF;
      scr = M[t] | M[inc(t)] << 8;
    }
    const col = M[0xA03D] - M[0x9633];
    setw(0xA054, ((col < 0 ? 0 : col & 255) + scr) & 0xFFFF);
    setw(0xA05A, 0x8500 | ((((((M[(iy + 0x16) & 0xFFFF] & 7) + clip.d) & 255) * 4) + 0x21) & 255));
    let skip = 0;
    if (clip.d) { const per = (M[(iy + 0x1C) & 0xFFFF] - 1) & 255; let n = clip.d; do { skip = (skip + per) & 255; n = (n - 1) & 255; } while (n); }
    setw(0xA056, (w(0xA056) + skip) & 0xFFFF);
    setw(0xA058, (w(0xA058) + skip) & 0xFFFF);
    M[(iy + 0x16) & 0xFFFF] = down & 255; M[(iy + 0x17) & 0xFFFF] = down >> 8;
    return { zf: true, a: 0 };
  });

  // divide_8 ($A6DD): C:A plus 4, over 8, into A
  P.def(0xA6DD, 'divide_8', r => {
    const v = ((r.c << 8 | r.a) + 4) & 0xFFFF;
    return { a: (v >> 3) & 255, c: (v >> 11) & 255 };
  });

  // shift_mask_half ($A7ED): at a half character with a cut-out in the visibility mask ($A6F2),
  // the mask's 192 bytes 4 pixels left (RLD back from $85E0, the last byte taking A's low bits)
  P.def(0xA7ED, 'shift_mask_half', () => {
    if (!M[0x9631] || !M[0xA6F2]) return {};
    let n = M[0xA6F2] & 15;
    for (let a = 0x85E0, k = 0xC0; k > 0; k--, a = lo(a, -1)) { const v = M[a]; M[a] = ((v << 4) | n) & 255; n = v >> 4; }
    return {};
  });

  // build_mask ($A879): the visibility mask for the sprite set up. All set again if a cut-out was
  // left in it; then each box of the scenery in bank 4's list ($C000, $A6F3 of them) that the
  // sprite's coarse place overlaps on the screen and stands in front of it cuts its piece out
  // (cut_occluder)
  P.def(0xA879, 'build_mask', () => {
    P.page_bank_4();
    if (M[0xA6F2]) { M.fill(0xFF, 0x8521, 0x85E1); M[0xA6F2] = 0; }
    let n = M[0xA6F3];
    if (!n) return {};
    const e = M[0xA03D], d = M[0xA03E];
    let box = 0xC000;
    do {
      const B = k => M[(box + k) & 0xFFFF];
      let front = true;
      let a = (e - 1) & 255;
      if (a >= B(2)) front = false;
      else if (((a + 3) & 255) < B(1)) front = false;
      else {
        a = (d - 1) & 255;
        if (a >= B(4)) front = false;
        else if (((a + 6) & 255) < B(3)) front = false;
        else if (M[0xA03A] <= B(5)) front = false;
        else if (M[0xA03B] < B(6)) front = false;
        else {
          a = M[0xA03C];
          if (!(a & 0x80)) { if (a) a = (a - 1) & 255; if (a >= B(7)) front = false; }
        }
      }
      if (front) cutOccluder((box + 7) & 0xFFFF, d, e);
      box = (box + 8) & 0xFFFF;
      n = (n - 1) & 255;
    } while (n);
    return {};
  });

  // cut_occluder ($A8F3): the part of the box's scenery piece (its shape, from bank 4's table at
  // $FE28: its width in blocks, then its blocks, each 4 by 4 characters at $C2C0) that overlaps
  // the sprite's 4 bytes by 6 character rows, cut out of the visibility mask character by
  // character, each by its own mask of 8 bytes at $F678. $A6EC-$A6EF keep where the overlap
  // starts in the piece across and down and how far it goes; the shape's width is written into
  // the operand at $AA26.
  function cutOccluder(hl, d, e) {
    const at = k => (hl - 7 + k) & 0xFFFF;
    let c = e, a, b;
    if (e < M[at(1)]) {
      b = M[at(1)]; M[0xA6EC] = 0;
      c = (4 - ((b - c) & 255)) & 255;
      a = (M[at(2)] - b + 1) & 255;
      if (a >= c) a = c;
      M[0xA6EF] = a;
    } else {
      M[0xA6EC] = (e - M[at(1)]) & 255;
      a = (M[at(2)] - c) & 255;
      if (a >= 3) a = 3;
      M[0xA6EF] = (a + 1) & 255;
    }
    c = d;
    if (d < M[at(3)]) {
      b = M[at(3)]; M[0xA6ED] = 0;
      c = (6 - ((b - c) & 255)) & 255;
      a = (M[at(4)] - b + 1) & 255;
      if (a >= c) a = c;
      M[0xA6EE] = a;
    } else {
      M[0xA6ED] = (d - M[at(3)]) & 255;
      a = (M[at(4)] - c) & 255;
      if (a >= 5) a = 5;
      M[0xA6EE] = (a + 1) & 255;
    }
    let row = 0, col = 0;
    if (!M[0xA6ED]) row = (M[at(3)] - M[0xA03E]) & 255;
    if (!M[0xA6EC]) col = (M[at(1)] - M[0xA03D]) & 255;
    const shape = M[at(0)];
    setw(0xA6F0, 0x8500 | ((0x21 + ((((row << 5) & 255) + col) & 255)) & 255));
    let s = w((0xFE28 + ((shape * 2) & 255)) & 0xFFFF);
    const width = (M[s] >> 2) & 0x3F;
    M[0xAA26] = width;
    let skip = 0;
    const rowsIn = (M[0xA6ED] >> 2) & 0x3F;
    for (let k = rowsIn; k > 0; k--) skip = (skip + width) & 255;
    a = (((M[0xA6EC] >> 2) & 0x3F) + skip) & 255;
    s = inc(s);
    let de = (s + a) & 0xFFFF;
    const block = v => ((v * 16) + 0xC2C0) & 0xFFFF;
    let p = block(M[de]);
    p = (p & 0xFF00) | ((p + (M[0xA6ED] & 3) * 4 + (M[0xA6EC] & 3)) & 255);
    let mp = w(0xA6F0);
    let rows = M[0xA6EE];
    do {
      let cols = M[0xA6EF];
      const mrow = mp, prow = p, drow = de;
      do {
        const ch = M[p];
        P.N.mcell++;
        if (ch) { P.N.cut++; cutChar(ch, mp); }
        mp = lo(mp, 1);
        p = lo(p, 1);
        if (!(p & 3)) {
          const sub = ((p & 255) - 1) & 0x0C;
          de = inc(de);
          p = block(M[de]); p = (p & 0xFF00) | ((p | sub) & 255);
        }
        cols = (cols - 1) & 255;
      } while (cols);
      de = drow; p = prow;
      p = lo(p, 4);
      if (!(p & 0x0C)) {
        const sub = p & 3;
        de = (de & 0xFF00) | ((de + M[0xAA26]) & 255);
        if (((drow & 255) + M[0xAA26]) > 255) de = (de + 0x100) & 0xFFFF;
        p = block(M[de]); p = (p & 0xFF00) | ((p | sub) & 255);
      }
      mp = lo(mrow, 0x20);
      rows = (rows - 1) & 255;
    } while (rows);
  }
  P.def(0xA8F3, 'cut_occluder', r => { cutOccluder(r.hl, r.d, r.e); return {}; });
  // $AA3C: the character's 8 rows of mask ($F678 + 8 times A) ANDed into the visibility mask at
  // `at`, 4 bytes a row, and $A6F2 set
  function cutChar(ch, at) {
    let s = ((ch * 8) + 0xF678) & 0xFFFF;
    for (let i = 0; i < 8; i++) { M[at] &= M[s]; s = lo(s, 1); at = lo(at, 4); }
    M[0xA6F2] = 1;
  }

  // next_to_draw ($A802): the next actor, object or shot to draw, back to front. Of the records
  // at $8300 waiting to be drawn (bit 7 of +$18), the last whose place across (+$0E, plus $100)
  // and down (+$10) are both no less than the bounds so far (BC, and the other set's BC) becomes
  // IY, with HL; then bank 3's objects ($F689) and shots ($C3C7) may stand in front of it. An
  // object is made an actor at $8501 to be drawn ($F6D6); a shot is drawn there and then ($C58A)
  // and the drawing starts again (draw_actors, the return address dropped). zf when there is
  // nothing left. It ends with the register sets exchanged.
  const or = (v, d) => (v === undefined ? d : v);
  P.def(0xA802, 'next_to_draw', () => {
    P.page_bank_3();
    let bc = 0, bc_ = 0, iy = 0x8300;
    for (let l = 0x18; l < 0x100; l += 0x20) {
      const hl = 0x8300 | l;
      if (!(M[hl] & 0x80)) continue;
      const across = ((M[hl - 0x0A] | M[hl - 0x09] << 8) + 0x100) & 0xFFFF;
      if (across < bc) continue;
      const down = M[hl - 0x08] | M[hl - 0x07] << 8;
      if (down < bc_) continue;
      bc_ = down; bc = across; iy = hl - 0x18;
    }
    const o = P.next_object({ bc, bc_, iy });
    if (!o.zf) {
      P.draw_object({ hl: or(o.iy, iy) });
      return { zf: false, hl: 0x8501, iy: 0x8501 };
    }
    const s = P.next_shot({ bc: or(o.bc, bc), bc_: or(o.bc_, bc_), iy });
    if (!s.zf) {
      const at = w(0xC218);
      M[lo(at, 1)] |= 0x80;
      P.draw_any_shot({ hl: at });
      return P.draw_actors();
    }
    if (!or(s.bc, bc)) return { zf: true, iy };
    M[(iy + 0x18) & 0xFFFF] &= 0x7F;
    return { zf: false, hl: iy, iy };
  });

  // draw_actors ($A6F4): every actor and object, back to front, until next_to_draw finds none;
  // types $14 to $1B in two pieces (draw_two_pieces, which carries on from $A706 for the second).
  // From $A706 each is set up, its visibility mask built and moved at a half character, drawn by
  // the drawer of its width, and its screen position across put back; one not shown is passed by.
  const drawn = (iy, hl, keep) => {
    if (!P.set_up_sprite({ iy, hl }).zf) { if (keep) P.restore_screen_x({ iy }); return; }
    P.build_mask();
    P.shift_mask_half();
    if (M[(iy + 0x1C) & 0xFFFF] === 3) P.draw_sprite_16({ iy }); else P.draw_sprite_24({ iy });
    P.restore_screen_x({ iy });
  };
  P.def(0xA6F4, 'draw_actors', () => {
    for (;;) {
      const n = P.next_to_draw();
      if (n.zf) return { zf: true };
      const t = M[n.iy] & 0x3F;
      if (t >= 0x14 && t < 0x1C) return P.draw_two_pieces({ iy: n.iy, hl: n.hl });
      drawn(n.iy, n.hl, false);
    }
  });
  // draw_two_pieces ($A725): the actor copied to $8501 and drawn as two sprites: its frame picks
  // four bytes from its bank's $F26A (types under $18) or $E2EF: the first piece's frame, the
  // step across and down to the second (across the other way when mirrored), and the second's
  // frame. Between them the copy's position across (+$0E) or down (+$10), by the direction in
  // +$0D, moves 12 for directions 2 and 3, for types above $13. The second piece is drawn from
  // $A706, which goes on with draw_actors.
  P.def(0xA725, 'draw_two_pieces', r => {
    P.page_bank_a({ a: M[(r.iy + 0x1F) & 0xFFFF] });
    const type = M[r.hl];
    P.ldir(r.hl, 0x8501, 0x20);
    const frame = M[(r.iy + 0x1B) & 0xFFFF];
    const t = ((type < 0x18 ? 0xF26A : 0xE2EF) + ((frame * 4) & 255)) & 0xFFFF;
    M[0x851C] = rd(t) | (frame & 0x80);
    drawn(0x8501, 0x8501, true);
    if (M[0x8501] > 0x13) {
      const dir = M[0x850E] & 3, step = dir >= 2 ? 0x0C : 0;
      if (!(dir & 1)) setw(0x850F, (w(0x850F) + step) & 0xFFFF);
      else setw(0x8511, (w(0x8511) + step) & 0xFFFF);
    }
    P.page_bank_a({ a: M[0x8520] });
    const across = frame & 0x80 ? neg(rd(inc(t))) : rd(inc(t));
    const down = rd((t + 2) & 0xFFFF);
    setw(0x8515, (w(0x8515) + (across & 0x80 ? 0xFF00 | across : across)) & 0xFFFF);
    setw(0x8517, (w(0x8517) + (down & 0x80 ? 0xFF00 | down : down)) & 0xFFFF);
    M[0x851C] = (M[0x851C] & 0x80) | rd((t + 3) & 0xFFFF);
    drawn(0x8501, 0x8501, false);
    return P.draw_actors();
  });

  // type_byte ($9613): BC the byte for actor type A in the list at $A03F (how far the swamp has
  // sunk it), one byte at $A053 for the types from $14
  P.def(0x9613, 'type_byte', r => (r.a >= 0x14 ? { bc: 0xA053 } : { bc: 0xA03F + r.a, a: (0x3F + r.a) & 255 }));
  // times_four ($9623): BC = A times 4
  P.def(0x9623, 'times_four', r => ({ bc: (r.a * 4) & 0x3FF, a: (r.a * 4) & 255 }));

  // multiply ($AA5D): HL = A times E
  P.def(0xAA5D, 'multiply', r => {
    let hl = 0, a = r.a;
    for (let b = 8; b > 0; b--) {
      const c1 = hl > 0x7FFF ? 1 : 0; hl = (hl * 2) & 0xFFFF;
      const c2 = a >> 7; a = ((a << 1) | c1) & 255;
      if (c2) hl = (hl + (r.e & 255)) & 0xFFFF;
    }
    return { hl, a, b: 0, d: 0 };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
