// The party's needs and the conversation window (bank 3, $D5C3-$D9A4): energy, water, food and
// patience rising and falling every 32 passes, the complaints they queue, resting, death and a
// character leaving the party; then the queue's messages shown one at a time in the small font.
//
// Each character has eight need bytes at $D5C3 and eight limits at $D5E3 (+1 energy, +2 water,
// +3 food, +6 patience are the ones that move). A message is a byte string from the table at
// $7B7D: the window's height, then letters of the game's alphabet two to a byte across, $F8 to $FE
// for the codes at $D8B1 and $FF to end.
(function (root) {
'use strict';
const G = root.WTGroups = root.WTGroups || {};
G.needs = function (P) {
  const M = P.M, w = P.w, setw = P.setw;
  const lo = (a, n) => (a & 0xFF00) | ((a + n) & 255);

  // need_up ($D691): the need byte at HL raised, to $FF at most
  const up = a => { if (M[a] !== 0xFF) M[a]++; };
  P.def(0xD691, 'need_up', r => { up(r.hl); return {}; });
  // need_down ($D69A): the need byte at HL lowered unless it is 0; for character C (not $FF) message
  // B queued when it comes to 32 above its limit at DE, B+1 at 16 above, and B left one more
  const down = (hl, de, b, c) => {
    if (!M[hl]) return b;
    M[hl]--;
    if (c === 0xFF) return b;
    const d = (M[hl] - M[de]) & 255;
    if (d === 0x20) P.queue_message({ b, c });
    b = (b + 1) & 255;
    if (d === 0x10) P.queue_message({ b, c });
    return b;
  };
  P.def(0xD69A, 'need_down', r => ({ b: down(r.hl, r.de, r.b, r.c) }));

  // needs_pass ($D603): every 32 passes, for each of the party (type under 4) whose state (+1) is
  // under 8 ($D623): energy up while resting (state +$0D 8 to $0B; no complaints when the action
  // is $0A), down while wading (4 to 7), then up when the action is 0 and down when it is not
  // (messages $15 and $16); water and food down ($17, $19); patience up unless the leader rests,
  // and down while he does if food is $40 or more ($1B)
  const needs = (t, actor) => {
    let hl = 0xD5C4 + t * 8, de = 0xD5E4 + t * 8, c = t, b = 0x15;
    const state = M[actor + 0x0D] & 0xFC;
    let a = state;
    if (state === 8) {
      if (M[actor + 0x0C] === 0x0A) c = 0xFF;
      a = 0;
      up(hl);
    }
    if (a === 4) b = down(hl, de, b, c);
    if (!M[actor + 0x0C]) up(hl); else b = down(hl, de, b, c);
    b = 0x17; hl++; de++; down(hl, de, b, c);
    b = 0x19; hl++; de++; down(hl, de, b, c);
    hl += 3; de += 3; b = 0x1B;
    if ((M[0x830D] & 0xFC) !== 8) return up(hl);
    if (M[hl - 3] < 0x40) return;
    down(hl, de, b, c);
  };
  P.def(0xD603, 'needs_pass', () => {
    const a = M[0x8D1C] & 0x1F;
    if (a) return { a, zf: false };
    for (let hl = 0x8300; hl < 0x8400; hl += 0x20) {
      if (M[hl] < 4 && M[hl + 1] < 8) needs(M[hl], hl);
    }
    return {};
  });

  // runner_noise ($D6BA): for an actor of type A, $27 to $2C, at HL: sound effect $10 every fourth
  // pass, and a walk (action 1 to 4) made its run (6 to 9) while the state (+$0D) is under $0C
  P.def(0xD6BA, 'runner_noise', r => {
    if (r.a >= 0x2D) return { a: r.a, cf: false };
    if (!(M[0x8D1C] & 3)) M[0x7006] = 0x10;
    let hl = lo(r.hl, 0x0D);
    if (M[hl] >= 0x0C) return { hl };
    hl = lo(hl, -1);
    const a = M[hl] & 0x7F;
    if (!a || a >= 5) return { hl, a };
    M[hl] = a + 5;
    return { hl, a: a + 5 };
  });

  // thirst_starve ($D6DD): every 32 passes Jarret's energy ($D5C4) down two more with no water and
  // one more with no food; at 0 he dies (action $8B, state $48)
  P.def(0xD6DD, 'thirst_starve', () => {
    const a = M[0x8D1C] & 0x1F;
    if (a) return { a, zf: false };
    const hl = 0xD5C4;
    const die = () => { M[0x830C] = 0x8B; M[0x8301] = 0x48; return { a: 0x48, hl }; };
    if (!M[0xD5C5]) {
      if (!M[hl]) return die();
      M[hl]--;
      if (!M[hl]) return die();
      M[hl]--;
      if (!M[hl]) return die();
    }
    if (M[0xD5C6]) return { a: M[0xD5C6], zf: false, hl };
    if (!M[hl]) return die();
    M[hl]--;
    if (M[hl]) return { a: 0, zf: false, hl };
    return die();
  });

  // needs_check ($D70A): the actor at HL (IY) once a pass. Types $27 up are runners ($D6BA); for
  // the party with state (+1, low five bits) under 2: no energy is death; energy below its limit
  // sets him or her resting (action $80 when sitting already, else, more than 32 below, message 5
  // and action $8A); no water and no food each cost energy; patience at its limit or over sets the
  // state to 1, and more than two below it makes him or her leave ($D795)
  P.def(0xD70A, 'needs_check', r => {
    let hl = r.hl;
    const iy = r.iy, t = M[hl];
    if (t >= 0x27) return P.runner_noise({ a: t, hl });
    if (t >= 4) return { a: t, cf: false };
    hl = lo(hl, 1);
    if ((M[hl] & 0x1F) >= 2) return { a: M[hl] & 0x1F, cf: false };
    hl = lo(hl, 0x0C);
    const de = 0xD5C4 + t * 8, lim = 0xD5E4 + t * 8;
    if (!M[de]) { M[(iy + 0x0C) & 0xFFFF] = 0x8B; M[(iy + 1) & 0xFFFF] = 0x48; return { a: 0, zf: true }; }
    if (M[de] < M[lim]) {
      const diff = (M[de] - M[lim]) & 255, st = M[hl];
      hl = lo(hl, -1);
      if ((st & 0xFC) === 8) M[hl] = 0x80;
      else if (diff < 0xE0) { P.queue_message({ b: 5, c: M[iy] }); M[hl] = 0x8A; }
    }
    if (!M[de + 1] && M[de]) M[de]--;
    if (!M[de + 2] && M[de]) M[de]--;
    const p = M[de + 5], pl = M[lim + 5];
    if (p >= pl) { M[(iy + 1) & 0xFFFF] = 1; return { a: (p - pl) & 255, cf: false }; }
    const a = (p - pl) & 255;
    if (a < 0xFE) return P.leave_party({ a, iy });
    return { a, cf: false };
  });

  // leave_party ($D795): the character at IY, unless his or her state (+1) is 0, goes off: message
  // 6 when patience (A) is three below its limit, then state 0 and the nearest point of a route to
  // the area's place at $DB07 (+2 the route, +3 the point)
  P.def(0xD795, 'leave_party', r => {
    const hl = lo(r.iy, 1);
    if (!M[hl]) return { a: 0, zf: true, hl };
    if (r.a === 0xFD) P.queue_message({ b: 6, c: M[r.iy] });
    const o = P.nearest_route_e253({ a: M[0x8D1F], hl: 0xDB07 });
    const d = o.de >> 8, e = o.de & 255;
    M[hl] = 0; M[lo(hl, 1)] = d; M[lo(hl, 2)] = e;
    return { hl: lo(hl, 2), de: o.de, d, e };
  });

  // next_message ($D7B9): with no conversation window up ($8D25 0) and a message waiting at
  // $8D28, it is shown, the queue moved up two, and the window started ($8D25 $48, sound effect
  // $11 on channel C)
  P.def(0xD7B9, 'next_message', () => {
    if (M[0x8D25]) return { a: M[0x8D25], zf: false };
    if ((w(0x8D39) & 255) === 0x28) return { a: 0x28, zf: true };
    P.show_message({ a: M[0x8D28], c: M[0x8D29] });
    P.ldir(0x8D28, 0x8D26, 0x10);
    setw(0x8D39, (w(0x8D39) - 2) & 0xFFFF);
    M[0x8D25] = 0x48;
    M[0x7038] = 0x11;
    return { a: 0x11 };
  });

  // --- the window's text: a string at HL printed at DE (the byte across in the window) until $FF;
  // the codes call their routine through the CALL at $D8AA, whose address they set ---
  const print = (hl, de) => {
    for (;;) {
      let a = M[hl];
      if (a === 0xFF) return { a, zf: true, hl, de };
      if (a & 0x80) {
        const t = (0xD8B1 + (((a - 0xF8) * 2) & 255)) & 0xFFFF;
        M[0xD8AB] = M[t]; M[0xD8AC] = M[t + 1];
        const o = P.jump(w(0xD8AB), { a: (a - 0xF8) & 255, de });
        if (o.de !== undefined) de = o.de;
        hl = (hl + 1) & 0xFFFF;
        continue;
      }
      // $D84A: a JR to print_letter for the party; NOPs into $D84C's NEG, ADD A,$2C for anyone else
      if (a && a !== 0x23 && !(M[0xD84A] === 0x18 && M[0xD84B] === 0x04)) a = (0x2C - a) & 255;
      de = letter(a, de, de);
      hl = (hl + 1) & 0xFFFF;
    }
  };
  // print_letter ($D850): letter A of the small font ($DA8A, three bytes) ORed into the window at
  // DE, the left or right four pixels of the byte as $D5C0 toggles; after the right, the next byte
  const letter = (a, scr, de) => {
    let font = (0xDA8A + 3 * a) & 0xFFFF;
    const half = M[0xD5C0] ^ 1;
    M[0xD5C0] = half;
    for (let b = 3; b > 0; b--) {
      const v = M[font];
      scr = row(scr, half ? v >> 4 : v & 0xF0);
      scr = row(scr, half ? v & 0x0F : (v << 4) & 0xF0);
      font = (font + 1) & 0xFFFF;
    }
    return half ? (de + 1) & 0xFFFF : de;
  };
  // or_letter_row ($D912): A ORed into HL, and HL a row down: 12 bytes, or 21 while the end screen
  // has put $15 in the ADD at $D916
  const row = (hl, a) => { M[hl] |= a; return (hl + M[0xD916]) & 0xFFFF; };
  P.def(0xD912, 'or_letter_row', r => {
    const hl = row(r.hl, r.a);
    return { hl, a: hl & 255 };
  });
  // print_letter is entered with the second register set in: the string and its place in the first
  P.def(0xD850, 'print_letter', r => {
    const de = letter(r.a, r.de, r.de_);
    return print((r.hl_ + 1) & 0xFFFF, de);
  });

  // $D838: the string at HL printed at DE (the end screen's texts)
  P.def(0xD838, 'show_message_d838', r => print(r.hl, r.de));

  // code_he_said ($D8BF, $FA): HE SAID ($7FBE) when the window is at column 8
  P.def(0xD8BF, 'code_he_said', r => (M[0xAA80] !== 8 ? { a: M[0xAA80], zf: false, de: r.de } : print(0x7FBE, r.de)));
  // the B-th name after $FF from HL (B 0 is 256)
  const nth = (b, hl) => {
    do { while (M[hl++] !== 0xFF); hl &= 0xFFFF; b = (b - 1) & 255; } while (b);
    return hl;
  };
  // code_name ($D8CB, $FB): the name of character $8D0C
  P.def(0xD8CB, 'code_name', r => print(nth((M[0x8D0C] + 1) & 255, 0x7FA0), r.de));
  // $D8E3: the name of character A
  P.def(0xD8E3, 'code_name_d8e3', r => print(nth((r.a + 1) & 255, 0x7FA0), r.de));
  // code_exclamation ($D8D0, $F8): the speaker's exclamation from $7FC5
  P.def(0xD8D0, 'code_exclamation', r => print(nth((M[0xD5C2] + 1) & 255, 0x7FC5), r.de));
  // code_leader ($D8DA, $FC): the leader's name ($8D0A), or nothing when the leader speaks
  P.def(0xD8DA, 'code_leader', r => {
    const a = M[0x8D0A];
    if (a === M[0xD5C2]) return { a, zf: true, de: r.de };
    return print(nth((a + 1) & 255, 0x7FA0), r.de);
  });
  // new_line ($D8F3, $FE): the next of the window's lines, eight rows of 12 bytes down from $61AA,
  // starting on the left of a byte
  P.def(0xD8F3, 'new_line', () => {
    M[0xD5C0] = 1;
    M[0xD5C1] = (M[0xD5C1] + 1) & 255;
    const hl = P.multiply({ a: 0x0C, e: (M[0xD5C1] * 8) & 255 }).hl;
    return { de: (hl + 0x61AA) & 0xFFFF, hl: 0x61AA, a: 0x0C, b: 0, zf: true };
  });
  // $D909 ($F9): nothing
  P.def(0xD909, 'new_line_d909', r => ({ de: r.de }));
  // new_line_back ($D90A, $FD): a new line, four bytes back
  P.def(0xD90A, 'new_line_back', () => {
    const o = P.new_line();
    return Object.assign(o, { de: (o.de - 4) & 0xFFFF });
  });

  // show_message ($D7EC): message A for character C: the window's column four times C ($AA80), its
  // height the message's first byte ($AA84), the record copied ($AA7E), the frame and portrait
  // ($D91B), then the text from the window's first line, mirrored for a speaker not of the party
  P.def(0xD7EC, 'show_message', r => {
    const c = r.c & 255;
    M[0xD5C2] = c;
    const jr = c < 4 ? 0x0418 : 0;
    M[0xD84A] = jr & 255; M[0xD84B] = jr >> 8;
    M[0xAA80] = (c * 4) & 255;
    let hl = w((0x7B7D + ((r.a * 2) & 255)) & 0xFFFF);
    M[0xAA84] = M[hl];
    hl = (hl + 1) & 0xFFFF;
    M[0xD5C0] = 1; M[0xD5C1] = 1;
    P.copy_window({ hl: 0xAA7E });
    P.message_frame({ a: c });
    return print(hl, (0x61A5 + ((M[0xAA75] * 8 + 5) & 255)) & 0xFFFF);
  });

  // message_frame ($D91B): the speaker A's nine portrait characters (from $D1DC, ten bytes each)
  // put in the frame list at $DA50, the lists made as tall as the window ($AA76), the frame drawn
  // at $61A5 ($D9AB) and the colours, a count with bit 7 before a repeated byte, into $64A5
  P.def(0xD91B, 'message_frame', r => {
    let hl = (0xD1DC + ((r.a * 10) & 255) + 1) & 0xFFFF;
    P.ldir(hl, 0xDA50, 3); P.ldir(hl + 3, 0xDA59, 3); P.ldir(hl + 6, 0xDA61, 3);
    let de = 0xDA71, de2 = 0xDA2D;
    for (let n = (M[0xAA76] - 6) & 3; n > 0; n--) {
      P.ldir(0xDA4C, de, 4); de += 4;
      P.ldir(0xDA45, de2, 4); de2 += 4;
    }
    P.ldir(0xDA3C, de, 9);
    P.ldir(0xDA45, de2, 7);
    P.draw_menu_frame_d9ab({ b: 0x0C, c: 8, bc: 0x0C08, hl: 0xDA50, de: 0x61A5 });
    M[0xAA82] = 3;
    hl = 0xDA0D; de = 0x64A5;
    for (let a = M[hl]; a; a = M[hl]) {
      let b = 1;
      if (a >= 0x80) { b = a & 0x7F || 0x100; hl++; a = M[hl]; }
      for (; b > 0; b--) M[de++] = a;
      hl++;
    }
    return { a: 0, zf: true, hl, de };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
