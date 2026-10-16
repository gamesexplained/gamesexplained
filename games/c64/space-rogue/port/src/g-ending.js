// WON ($6800-$7DAA), which SR loads over MAIN when the ship docks in the Manchi system with the
// queen's egg: the landing, the truce and the Emperor's medal over three pictures, F1-F3, a page
// a key, then TITLE again. Every piece of text goes through print_inline ($743E), which is where
// the port yields its checkpoint, the passes' start.
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
const PROGRAMS = root.SRPrograms = root.SRPrograms || {};
const STORY = `story_landing story_patrol story_egg story_where story_interpreter story_plot story_truce
  story_journey story_honored story_sunburst story_amulet story_cheers`.split(/\s+/);
PROGRAMS.ending = { gen: ['ending_start', 'story_end'].concat(STORY), start: 'ending_start', checkpoints: [0x743E], passAt: 0x743E,
  exits: [0x2000] };
G.ending = function (P) {
  root.SRScreens(P, 'ending');
  const M = P.M;
  const R = (r, x) => Object.assign({}, r, x);
  const ROW = 0x20, COL = 0x21, LEFT = 0x22, RIGHT = 0x23;
  P.CHECKPOINTS.push(0x743E, P.addr(0x20CF), P.addr(0x20E5));
  const at = (c, w) => { M[COL] = c; M[ROW] = w; P.spend(10); };

  P.ending_start = function* () {
    let r = P.setup_irq();
    r = P.build_line_table(r);
    for (const p of [0x6809, 0x6813, 0x681F, 0x682B]) r = P.load_inline(p);
    r = P.clear_4000(r);
    r = P.bitmap_mode(r);
    r = P.show_4000_colours(r);
    r = P.white_colours(r);
    for (const s of STORY) r = yield* P[s](r);
    return yield* P.story_end(r);
  };
  P.print_inline = (t, r) => P.print_inline_at(0x744F, t, r);
  const text = function* (t, r) { yield { cp: 0x743E, cycles: P.take() }; return P.print_inline(t, r); };
  // the page drawn shown (sdc), and copied to the other buffer (csc)
  const sdc = r => P.show_drawn_colours(r), csc = r => P.copy_shown_colours(r);

  // F1 into the drawing buffer and the landing from row 16, columns 1-38 (the cursor's first
  // place, row 3, is never used)
  P.story_landing = function* (r) {
    r = P.unpack_picture(R(r, { a: 0x84 }));
    at(1, 3); M[LEFT] = 1; M[RIGHT] = 0x26;
    at(1, 0x10);
    return yield* text(0x7482, r);
  };
  // after a key, rows x-y wiped (wipe_right, wipe_left) or scrolled away (scroll_up, scroll_down),
  // and the next text at column 1 of row w
  const away = function* (r, how, x, y, w) {
    r = yield* P.wait_key(r);
    r = yield* P[how](R(r, { x, y }));
    return r;
  };
  P.story_patrol = function* (r) {
    r = csc(sdc(r));
    r = yield* away(r, 'wipe_right', 0x10, 0x16);
    at(1, 0x11);
    return yield* text(0x7592, r);
  };
  P.story_egg = function* (r) {
    r = sdc(r);
    r = P.unpack_picture(R(r, { a: 0x92 }));
    M[LEFT] = 0x18; at(0x18, 3);
    return yield* text(0x767A, r);
  };
  P.story_where = function* (r) {
    r = yield* P.wait_key(r);
    r = yield* P.dissolve_out(r);
    r = yield* P.dissolve_in(r);
    r = csc(r);
    M[LEFT] = 1; at(1, 0x10);
    return yield* text(0x771B, r);
  };
  // the pause takes no length: clear_key leaves A at $FF before it counts
  P.story_interpreter = function* (r) {
    r = yield* P.pause(r);
    r = csc(sdc(r));
    return yield* text(0x7757, r);
  };
  P.story_plot = function* (r) {
    r = yield* P.pause(r);
    r = csc(sdc(r));
    r = yield* away(r, 'scroll_down', 0x10, 0x16);
    at(1, 0x10);
    return yield* text(0x7812, r);
  };
  // the row only: the plot's six full lines left the column past the window's edge
  P.story_truce = function* (r) {
    r = csc(sdc(r));
    r = yield* away(r, 'scroll_down', 0x10, 0x15);
    M[ROW] = 0x10; P.spend(5);
    return yield* text(0x790E, r);
  };
  P.story_journey = function* (r) {
    r = sdc(r);
    r = P.unpack_picture(R(r, { a: 0xA1 }));
    at(1, 1);
    return yield* text(0x7994, r);
  };
  P.story_honored = function* (r) {
    r = yield* P.wait_key(r);
    r = yield* P.dissolve_out(r);
    r = csc(sdc(r));
    r = yield* away(r, 'scroll_up', 1, 5);
    at(1, 1);
    return yield* text(0x7A72, r);
  };
  P.story_sunburst = function* (r) {
    r = csc(sdc(r));
    r = yield* away(r, 'wipe_left', 1, 6);
    at(1, 1);
    return yield* text(0x7B70, r);
  };
  P.story_amulet = function* (r) {
    r = csc(sdc(r));
    r = yield* away(r, 'wipe_right', 1, 5);
    r = R(r, { x: 1, y: 5 });
    at(1, 1);
    return yield* text(0x7C2C, r);
  };
  P.story_cheers = function* (r) {
    r = csc(sdc(r));
    r = yield* away(r, 'scroll_down', 1, 6);
    at(1, 2);
    return yield* text(0x7D1A, r);
  };
  // the last page shown, a key, and TITLE again
  P.story_end = function* (r) {
    r = sdc(r);
    yield* P.wait_key(r);
    throw new P.Goto(0x2000, P.load_inline(0x7D98));
  };
};
})(typeof window !== 'undefined' ? window : globalThis);
