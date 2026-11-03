// The sounds and the delays ($94CF-$9530, $C83A-$C892): the sixteen sounds, each groups of three
// clicks of the speaker after delay loops whose lengths change from group to group, and the empty
// loops the game waits in. The T-states are the game's own on an uncontended 48K: the sounds give
// each write to port $FE at P.T, the T-states the port has counted when the OUT starts, so the page
// plays the edges at those times; a delay adds its T-states to P.T (P.clock).
(function (root) {
'use strict';
const G = root.LOCGroups = root.LOCGroups || {};

G.sound = function (P) {
  const M = P.M, def = P.def, H = P.H = P.H || {};
  // DJNZ with B = n (0 is 256), 13 a turn and 8 for the last; with three NOPs in the loop, 25 and 20
  const djnz = n => ((n & 255) || 256) * 13 - 5;
  const nopLoop = n => ((n & 255) || 256) * 25 - 5;
  const spend = t => { P.T += t; };

  // delay_2, delay_20, delay_255, delay_8: 255 turns of an empty loop, that many times; delay_50,
  // the same entered past its jump. With the CALL, each is 3,351 T-states a time and 62 more (45
  // more for delay_50, which has no JR).
  H.delayT = (n, jr) => (jr === false ? 18 : 30) + ((n & 255) || 256) * 3351 - 5 + 20 + 17;
  for (const [a, name, n] of [[0x9510, 'delay_2', 2], [0x9515, 'delay_20', 0x14], [0x951A, 'delay_255', 0xFF], [0x951F, 'delay_8', 8]])
    def(a, name, r => { P.clock(H.delayT(n)); return {}; });

  // key_repeat, key_repeat_slow: while a control is held ($5B13 not $FF), a wait between moves of a
  // menu bar: $5B09 polls the first time ($5B1E clear), $5B08 after, each a short delay and a read of
  // the controls, ending early when the control is let go. Let go, $5B1E is cleared.
  function* repeat(first, after) {
    M[0x5B08] = first; M[0x5B09] = after;
    if (M[0x5B13] === 0xFF) { M[0x5B1E] = 0; return { a: 0, zf: true }; }
    let b = M[0x5B1E] ? M[0x5B08] : M[0x5B09];
    M[0x5B1E] = 1;
    do {
      if (M[0x5B13] === 0xFF) return { a: 0, zf: true, b };
      yield { tstates: H.delayT(2) };
      yield* P.read_controls({});
      b = (b - 1) & 255;
    } while (b);
    return { b: 0, a: M[0x5B13] };
  }
  def(0x94CF, 'key_repeat_slow', function* (r) { return yield* repeat(0x5A, 0xDC); });
  def(0x94DB, 'key_repeat', function* (r) { return yield* repeat(0x14, 0x32); });

  // set_sound: sound A, its eight bytes ($C7B0 on) into sound_steps.
  def(0xC83A, 'set_sound', r => {
    const s = (0xC7B0 + 8 * (r.a & 255)) & 0xFFFF;
    for (let i = 0; i < 8; i++) M[0xC830 + i] = M[(s + i) & 0xFFFF];
    return { hl: (s + 8) & 0xFFFF, de: 0xC838, bc: 0 };
  });
  // start_sound, sound_0: sound A set and played at once, unless the turn is hidden ($D066).
  def(0xC84E, 'start_sound', r => { P.set_sound(r); if (M[0xD066]) return { a: M[0xD066], zf: false }; return P.play_sound({}); });
  def(0xC84D, 'sound_0', r => P.start_sound({ a: 0 }));

  // play_sound: sound_steps groups; in each, sound_repeats times the three notes (each a delay loop of
  // its delay, then the speaker's bit flipped and sent); after each group every delay moves on by its
  // change.
  def(0xC856, 'play_sound', r => {
    const t0 = P.T;
    let steps = M[0xC830];
    spend(17);
    do {
      spend(28);
      let reps = M[0xC831];
      do {
        spend(38);
        for (let k = 0; k < 3; k++) {
          spend(18 + nopLoop(M[0xC833 + 2 * k]) + 33);
          M[0xC838] ^= 0x10;
          P.io.out(0xFE, M[0xC838], P.T);
          spend(11 + 10 + 11 + (k < 2 ? 13 : 8));
        }
        reps = (reps - 1) & 255;
        spend(10 + (reps ? 13 : 8));
      } while (reps);
      spend(27);
      for (let k = 0; k < 3; k++) {
        M[0xC833 + 2 * k] = (M[0xC833 + 2 * k] + M[0xC832 + 2 * k]) & 255;
        spend(33 + (k < 2 ? 13 : 8));
      }
      steps = (steps - 1) & 255;
      spend(10 + (steps ? 13 : 8));
    } while (steps);
    spend(10);
    P.N.beep = (P.N.beep || 0) + (P.T - t0);
    return { a: M[0xC838], b: 0, hl: 0xC838, de: 2 };
  });
};
})(typeof window !== 'undefined' ? window : globalThis);
