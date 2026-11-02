// The sound effects ($9574-$97A3): the beeper toggled from timing loops with the interrupts off.
// Each effect gives its writes to port $FE through P.io.out(port, value, T), T the T-states the
// port has counted (P.T) when the OUT starts, exactly as the game's loops take them on an
// uncontended 48K: the page plays the edges at those times, and P.N.beep adds up the T-states the
// effects take, in which no interrupt is taken.
(function (root) {
'use strict';
const G = root.DRGroups = root.DRGroups || {};

G.sound = function (P) {
  const M = P.M;
  P.T = P.T || 0;
  // DEC r / JR NZ with r = n (0 is 256): 16 T-states a turn, 11 for the last
  const decLoop = n => ((n & 255) || 256) * 16 - 5;
  // DJNZ with B = n (0 is 256): 13 a turn, 8 for the last
  const djnz = n => ((n & 255) || 256) * 13 - 5;
  const out = v => { P.io.out(0xFE, v & 255, P.T); P.T += 11; };
  const spend = t => { P.T += t; };

  // play_sound ($9574): effect A (1-21) by the table at $954A, its address written into the CALL at
  // $958F; the interrupts are off while it plays and back on after it unless A is 2, the effect
  // the interrupt itself plays. Every register kept.
  P.def(0x9574, 'play_sound', r => {
    const t0 = P.T;
    const a = r.a & 255, at = (0x954A + 2 * ((a - 1) & 255)) & 0xFFFF;
    M[0x9590] = M[at]; M[0x9591] = M[(at + 1) & 0xFFFF];
    spend(4 * 15 + 4 * 11 + 4 + 4 + 4 + 7 + 10 + 11 + 11 + 7 + 13 + 6 + 7 + 13 + 17);
    P.jump(P.w(0x9590), {});
    spend(10 + 7 + (a === 2 ? 12 : 7 + 4) + 10 + 10 + 10 + 14 + 14 + 10);
    P.N.beep = (P.N.beep || 0) + (P.T - t0);
    return {};
  });
  // the entries that play nothing
  P.def(0x95A0, 'sound_none', () => { spend(10); return {}; });

  // tone ($9768): DE + 1 cycles of a square wave whose half-period is set by HL: H turns of 63 of a
  // delay loop plus L / 4 turns plus L mod 4 NOPs, the high half one turn of the loop longer. The
  // first edge raises the speaker (the border colour at $886A with MIC set).
  P.def(0x9768, 'tone', r => {
    let de = r.de & 0xFFFF;
    const L = r.hl & 255, H = (r.hl >> 8) & 255, nops = L & 3, Ls = L >> 2;
    const delay = c => 4 * nops + 8 + decLoop(c) + 21 + H * (decLoop(63) + 21);
    let a = M[0x886A] | 8;
    spend(91 + 12 + 8 + decLoop(((~L) & 3) + 1) + 21);
    for (;;) {
      a ^= 0x10; spend(7);
      out(a);
      if (a & 0x10) { spend(44); spend(delay(Ls + 2)); continue; }
      if (!de) { spend(53); return {}; }
      de = (de - 1) & 0xFFFF;
      spend(60); spend(delay(Ls + 1));
    }
  });
  const tone = (de, hl) => { spend(10 + 10 + 17); P.tone({ de, hl }); };

  // sweep ($95AF): DE pulses with the border colour in A, each a delay of C turns, the speaker raised,
  // C and then 256 turns of DJNZ, the speaker lowered; C goes up by 9 a pulse from 1
  P.def(0x95AF, 'sweep', r => {
    let de = r.de & 0xFFFF, c = 1;
    const l = r.a & 255;
    spend(7 + 4);
    for (;;) {
      spend(4 + decLoop(c) + 4 + 7);
      out(l | 0x10);
      spend(4 + djnz(c) + djnz(0) + 7);
      out(l & 0x0F);
      c = (c + 9) & 255; de = (de - 1) & 0xFFFF;
      spend(7 + 4 + 4 + 16 + 6 + 4 + 4);
      if (!de) { spend(7 + 10); return {}; }
      spend(12);
    }
  });
  P.def(0x95A1, 'sound_1', () => { spend(10 + 13 + 12); return P.sweep({ de: 0x60, a: M[0x886A] }); });
  P.def(0x95A9, 'sound_2', () => { spend(10 + 13); return P.sweep({ de: 0x18, a: M[0x886B] }); });
  P.def(0x95D2, 'sound_3', () => { tone(0x0C, 0x07A6); tone(0x0A, 0x093C); spend(10); return {}; });
  P.def(0x95E5, 'sound_4', () => { tone(0x0C, 0x07A6); tone(0x0E, 0x066A); spend(10); return {}; });
  P.def(0x95F8, 'sound_6', () => { tone(0x29, 0x01F0); spend(10); return {}; });
  // a rising run of single cycles, from 0 by $14 below the limit
  const run = (from, step, below) => {
    spend(10);
    for (let hl = from; ;) {
      spend(10 + 11 + 17); P.tone({ de: 1, hl });
      hl += step;
      spend(10 + 10 + 11 + 11 + 10 + 4 + 15 + 10);
      if (hl >= below) { spend(7 + 10); return {}; }
      spend(12);
    }
  };
  P.def(0x9602, 'sound_7', () => run(0, 0x14, 0x0C00));
  P.def(0x973A, 'sound_20', () => run(0, 0x14, 0x1900));
  // sound_21 ($9754): falling, from $300 by 10 while the subtraction does not borrow
  P.def(0x9754, 'sound_21', () => {
    spend(10);
    for (let hl = 0x300; ;) {
      spend(10 + 11 + 17); P.tone({ de: 1, hl });
      spend(10 + 10 + 4 + 15);
      hl -= 10;
      if (hl < 0) { spend(7 + 10); return {}; }
      spend(12);
    }
  });
  // sound_5 ($9653): eight runs of six cycles at 0, $32 ... $FA
  P.def(0x9653, 'sound_5', () => {
    spend(7);
    for (let b = 8; b > 0; b--) {
      spend(11 + 10);
      for (let hl = 0; ;) {
        spend(10 + 11 + 17); P.tone({ de: 6, hl });
        hl += 0x32;
        spend(10 + 10 + 11 + 11 + 10 + 4 + 15 + 10);
        if (hl >= 0x100) { spend(7); break; }
        spend(12);
      }
      spend(10 + (b > 1 ? 13 : 8));
    }
    spend(10);
    return {};
  });
  // sound_8 ($961C): $800 pulses, a fixed high and a low that shortens with E
  P.def(0x961C, 'sound_8', () => {
    let a = M[0x886A], d = 8, e = 0;
    spend(10 + 13);
    for (;;) {
      a |= 0x18; spend(7); out(a);
      spend(7 + djnz(0x18));
      a &= 0x0F; spend(7); out(a);
      spend(4 + djnz(e) + 7 + 4);
      e = (e - 1) & 255;
      if (e) { spend(12); continue; }
      spend(7 + 4);
      d = (d - 1) & 255;
      if (d) { spend(12); continue; }
      spend(7 + 10);
      return {};
    }
  });
  // sound_9 ($963A): 256 pulses, high and low each E turns, E falling from 256
  P.def(0x963A, 'sound_9', () => {
    let a = M[0x886A], e = 0;
    spend(7 + 13);
    for (;;) {
      a |= 0x18; spend(7); out(a);
      spend(4 + djnz(e));
      a &= 0x0F; spend(7); out(a);
      spend(4 + djnz(e) + 6 + 4 + 4);
      e = (e - 1) & 255;
      if (e) { spend(12); continue; }
      spend(7 + 10);
      return {};
    }
  });
  // sound_11 ($9673): $600 pulses; the wait before each is D OR E turns (C on the first), the high C
  // then 256 turns, C going up
  P.def(0x9673, 'sound_11', () => {
    const l = M[0x886A];
    let c = 1, de = 0x600, h = c;
    spend(13 + 4 + 7 + 10 + 4);
    for (;;) {
      spend(4 + decLoop(h) + 4 + 7);
      out(l | 0x18);
      spend(4 + djnz(c) + djnz(0) + 7);
      out((l | 0x18) & 0x0F);
      c = (c + 1) & 255; de = (de - 1) & 0xFFFF;
      h = (de >> 8) | (de & 255);
      spend(4 + 6 + 4 + 4);
      if (!h) { spend(7 + 10); return {}; }
      spend(12);
    }
  });
  // sound_12 ($9696): $100 pulses: a wait of C turns, high for C and then E turns, C going up
  P.def(0x9696, 'sound_12', () => {
    const l = M[0x886A];
    let c = 1, de = 0x100;
    spend(13 + 4 + 7 + 10);
    for (;;) {
      spend(4 + decLoop(c) + 4 + 7);
      out(l | 0x18);
      spend(4 + djnz(c) + 4 + djnz(de & 255) + 7);
      out((l | 0x18) & 0x0F);
      c = (c + 1) & 255; de = (de - 1) & 0xFFFF;
      spend(4 + 6 + 4 + 4);
      if (!de) { spend(7 + 10); return {}; }
      spend(12);
    }
  });
  // sound_13 ($96B9): $E8 edges, each half a wait that the last one's length sets through a little
  // arithmetic on H; the speaker left at the border colour
  P.def(0x96B9, 'sound_13', () => {
    let a = M[0x886A], h = 0;
    spend(13 + 7 + 7);
    for (let b = 0xE8; ;) {
      out(a);
      a ^= 0x10;
      let hl = (h << 8) - h;
      const c1 = hl < 0 ? 1 : 0;
      hl &= 0xFFFF;
      hl = (hl - h - c1) & 0xFFFF;
      hl = (hl + 0xFE) & 0xFFFF;
      let x = (hl & 255) - (hl >> 8);
      const cy = x < 0;
      x &= 255;
      spend(7 + 11 + 4 + 4 + 4 + 4 + 15 + 15 + 10 + 11 + 4 + 4);
      if (cy) spend(12); else { x = (x - 1) & 255; spend(7 + 4); }
      h = x;
      spend(4 + decLoop(x) + 10 + 4);
      b = (b - 1) & 255;
      if (b) { spend(12); continue; }
      spend(7 + 13);
      out(M[0x886A]);
      spend(10);
      return {};
    }
  });
  // sound_14 ($96E4): 255 pulses, high and low each E turns, E rising from 1
  P.def(0x96E4, 'sound_14', () => {
    let a = M[0x886A], e = 1;
    spend(7 + 13);
    for (;;) {
      a |= 0x18; spend(7); out(a);
      spend(4 + djnz(e));
      a &= 0x0F; spend(7); out(a);
      spend(4 + djnz(e) + 6 + 4 + 4);
      e = (e + 1) & 255;
      if (e) { spend(12); continue; }
      spend(7 + 10);
      return {};
    }
  });
  // sound_15 ($96FD): $300 pulses, high for E turns and low for C, E falling and C rising
  P.def(0x96FD, 'sound_15', () => {
    let a = M[0x886A], c = 1, d = 3, e = 0;
    spend(7 + 10 + 13);
    for (;;) {
      a |= 0x18; spend(7); out(a);
      spend(4 + djnz(e));
      a &= 0x0F; spend(7); out(a);
      spend(4 + djnz(c) + 4 + 6 + 4 + 4);
      c = (c + 1) & 255;
      e = (e - 1) & 255;
      if (e) { spend(12); continue; }
      spend(7 + 4);
      d = (d - 1) & 255;
      if (d) { spend(12); continue; }
      spend(7 + 10);
      return {};
    }
  });
  P.def(0x971D, 'sound_17', () => { tone(0x09, 0x1A02); tone(0x12, 0x2707); spend(10); return {}; });
  P.def(0x9730, 'sound_19', () => { tone(0x04, 0x149E); spend(10); return {}; });
};
})(typeof window !== 'undefined' ? window : globalThis);
