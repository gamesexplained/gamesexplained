/* loc-gfx */
// The Graphics page's drawing, on a 64 KB memory M laid out as the game's (the block loc-map draws
// the squares). Everything here writes into M's own screen or its things table, the way the game's
// routines do, so test_graphics.js can hold each to the game's own code run on the kit's Z80.
//   LOCGfx.tick(M)               one working frame of the interrupt's animation (interrupt_work
//                                $A8B2-$A8CF, next_frame $A936): each of the 170 things whose count
//                                is not $FF counts down, and at 0 takes graphic, colour set, count
//                                and next frame from the frame table
//   LOCGfx.cycle(M, v, next)     the frames thing v shows from its entry as it stands (or, given
//                                next, from that frame on): [{ frame, graphic, colours, count }],
//                                frame null for the entry itself, ending before the first frame seen
//                                twice or after a count of $FF
//   LOCGfx.sparkle(M)            starts the sparkle on thing $4F as the game does (show_hit $79DF,
//                                summon_display $8447): its next frame becomes $A5
//   LOCGfx.CURSORS               the cursor's four looks, [graphic, colour set, what it means]: drawn
//                                by draw_map ($A997) in character set 0 from $FF86 and $FF87
//   LOCGfx.cursor(M, row, col, k) draws cursor k at character row and column
//   LOCGfx.deathStep(M, type, f, k) step k (0-9) of frame f (0-6) of a wizard's death
//                                (death_animation_frame $8C6A): wizard type's figure as it stands,
//                                in colour set f, at the eight places k characters out from the
//                                middle of the window
//   LOCGfx.hitStep(M, row, col, k) graphic k (0-2) of the burst draw_hit ($AEC2) draws at a
//                                square's character row and column: graphic $53 + k, colour set 0,
//                                character set 1 ($BE3C)
//   LOCGfx.hitPlace(M, e, d)     the character row and column draw_hit works out for square E, D
//   LOCGfx.SHAPES                the missile shapes as shapes ($AD4E) lists them, [line, column]
//   LOCGfx.shape(M, s, y, x, attr) plots shape s with its middle at pixel line y, column x of the map
//                                window as draw_shape ($AD1D) does: a point is skipped unless both
//                                its line and column, in eight bits, are below $A8; plot ($ACC9)
//                                sets the pixel and, when attr is not $FF, gives the cell attr
//   LOCGfx.styles(M)             the seven missile styles, eight bytes each from missile_styles
//                                ($B60E): shape, pixels a frame, tail, reach, attribute, combat,
//                                magic, sound
//   LOCGfx.DEATH_T, HIT_T        T-states from each step's sound to the next (the last to the map's
//                                redraw), measured on the game's code on the kit's Z80
var LOCGfx = (function () {
  const w = (M, a) => M[a] | M[(a + 1) & 0xFFFF] << 8;
  const pix = (r, c, k) => 0x4000 + ((r & 0x18) << 8) + ((r & 7) << 5) + (k << 8) + c;
  function tick(M) {
    const T = w(M, 0xD032), F = w(M, 0xD034);
    for (let v = 0; v < 170; v++) {
      const e = (T + 5 * v + 3) & 0xFFFF;
      if (M[e] === 0xFF) continue;
      M[e] = (M[e] - 1) & 255;
      if (M[e] === 0) {
        const f = (F + 4 * M[e + 1]) & 0xFFFF;
        for (let i = 0; i < 4; i++) M[e - 2 + i] = M[(f + i) & 0xFFFF];
      }
    }
  }
  function cycle(M, v, next) {
    const T = w(M, 0xD032) + 5 * v, F = w(M, 0xD034), out = [];
    let count;
    if (next === undefined) {
      out.push({ frame: null, graphic: M[T + 1], colours: M[T + 2], count: M[T + 3] });
      count = M[T + 3]; next = M[T + 4];
    } else count = 0;
    const seen = new Set();
    while (count !== 0xFF && !seen.has(next)) {
      seen.add(next);
      const f = F + 4 * next;
      out.push({ frame: next, graphic: M[f], colours: M[f + 1], count: M[f + 2] });
      count = M[f + 2]; next = M[f + 3];
    }
    return out;
  }
  function sparkle(M) { M[(w(M, 0xD032) + 0x18F) & 0xFFFF] = 0xA5; }
  const CURSORS = [[1, 0, 'looking round'], [2, 3, 'a creature on the ground selected'],
                   [4, 2, 'a creature in the air selected'], [3, 1, 'choosing a target']];
  function cursor(M, row, col, k) { LOCMap.block(M, 0, row, col, 0, CURSORS[k][0], CURSORS[k][1]); }
  function deathStep(M, type, f, k) {
    const t = LOCMap.thing(M, type);
    const at = [[9 - k, 9], [9 - k, k + 9], [9, k + 9], [k + 9, k + 9],
                [k + 9, 9], [k + 9, 9 - k], [9, 9 - k], [9 - k, 9 - k]];
    for (const [r, c] of at) LOCMap.block(M, type, r, c, t.set, t.graphic, f);
  }
  function hitPlace(M, e, d) {
    let r = (e - M[0xD0C8]) & 255; if (e < M[0xD0C8]) r = (r + 0x24) & 255;
    let c = (d - M[0xD0C9]) & 255; if (d < M[0xD0C9]) c = (c + 0x24) & 255;
    return [(3 * r) & 255, (3 * c) & 255];
  }
  function hitStep(M, row, col, k) { LOCMap.block(M, 0, row, col, 1, 0x53 + k, 0); }
  const SHAPES = [[[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]],
                  [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2], [3, 3], [-3, -3], [3, -3], [-3, 3],
                   [4, 0], [-4, 0], [0, 4], [0, -4]]];
  function shape(M, s, y, x, attr) {
    for (const [dy, dx] of SHAPES[s]) {
      const py = (y + dy) & 255, px = (x + dx) & 255;
      if (py >= 0xA8 || px >= 0xA8) continue;
      const a = pix(py >> 3, px >> 3, py & 7);
      if (attr !== undefined && attr !== 0xFF) M[0x5800 + 32 * (py >> 3) + (px >> 3)] = attr;
      M[a] |= 0x80 >> (px & 7);
    }
  }
  function styles(M) {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const b = Array.from(M.slice(0xB60E + 8 * i, 0xB616 + 8 * i));
      out.push({ shape: b[0], speed: b[1], tail: b[2], reach: b[3], attr: b[4], combat: b[5], magic: b[6], sound: b[7] });
    }
    return out;
  }
  const DEATH_T = [97463, 59813, 60563, 61313, 62063, 62813, 63563, 64313, 65063, 65914,
                   66563, 67313, 68063, 68813, 69563, 70313, 71063, 71813, 72563, 73414,
                   74063, 74813, 62763, 63513, 64263, 65013, 65763, 66513, 67263, 68114,
                   68763, 69513, 70263, 71013, 71763, 72513, 73263, 74013, 74763, 75614,
                   76263, 77013, 77763, 65713, 66463, 67213, 67963, 68713, 69463, 70314,
                   70963, 71713, 72463, 73213, 73963, 74713, 75463, 76213, 76963, 77814,
                   78463, 79213, 79963, 80713, 81463, 69413, 70163, 70913, 71663, 14324];
  const HIT_T = [139601, 213226, 196667];
  return { tick, cycle, sparkle, CURSORS, cursor, deathStep, hitPlace, hitStep, SHAPES, shape, styles, DEATH_T, HIT_T };
})();
// end of loc-gfx
