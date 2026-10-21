'use strict';
// The scrolling, the pipe's pieces and the small animations, against the game's (lib.js).
const { check } = require('./lib.js');
const { Z, T } = globalThis.TexPort;
// a flag or a timer: mostly its own value, else 0, 1, 2 or any
const nudge = (M, rnd, ...names) => { for (const n of names) if (rnd(3) === 0) M[Z[n]] = [0, 1, 2, rnd(256)][rnd(4)]; };
check({ name: 'scroll_skyline', cases: 2000, setup: (M, rnd) => { nudge(M, rnd, 'paused', 'speed', 'half_rate'); M[Z.skyline_speed] = rnd(5); M[Z.skyline_scroll] = rnd(8); } });
check({ name: 'shift_skyline', setup: (M, rnd) => { M[Z.skyline_cols_left] = rnd(3); M[Z.last_skyline] = rnd(8); } });
check({ name: 'feed_skyline', setup: (M, rnd) => { M[Z.skyline_cols_left] = rnd(3); return { c: rnd(2) }; } });
check({ name: 'next_skyline_piece', cases: 2000, setup: (M, rnd) => { M[Z.last_skyline] = rnd(8); for (let a = Z.rnd0; a <= Z.rnd3; a++) M[a] = rnd(256); return { c: rnd(2) }; } });
check({ name: 'scroll_pipe', cases: 2000, setup: (M, rnd) => { nudge(M, rnd, 'paused'); M[Z.pipe_speed] = rnd(5); M[Z.pipe_scroll] = rnd(8); } });
check({ name: 'shift_pipe', cases: 2000, setup: (M, rnd) => { M[Z.piece_index] = (M[Z.piece_length] - 2 * rnd(2)) & 0xFF; } });
check({ name: 'feed_pipe', cases: 2000, setup: (M, rnd) => { M[Z.piece_index] = (M[Z.piece_length] - 2 * rnd(2)) & 0xFF; } });
const piece = (M, rnd) => {
  M[T.scene] = rnd(3); M[Z.refilling] = rnd(3) ? 0 : 1; M[Z.break_timer] = 1 + rnd(3); M[Z.roll3_count] = rnd(10);
  M[Z.break_parts] = 2 + rnd(2); for (let a = Z.rnd0; a <= Z.rnd3; a++) M[a] = rnd(256);
  for (let i = 0; i < 3; i++) M[0x25DB + i] = rnd(M[0x25DE + i] + 1);
};
check({ name: 'next_pipe_piece', cases: 4000, setup: piece });
check({ name: 'build_break', cases: 2000, setup: piece });
check({ name: 'refill_pipe', cases: 300, setup: piece });
check({ name: 'scroll_message', cases: 2000, setup: (M, rnd) => { nudge(M, rnd, 'paused'); M[Z.message_scroll] = rnd(8); } });
check({ name: 'animate_legs', cases: 2000, setup: (M, rnd) => { nudge(M, rnd, 'paused', 'legs_still', 'speed', 'leg_timer'); M[Z.leg_frame] = rnd(4); } });
check({ name: 'twinkle_star', setup: (M, rnd) => { M[Z.star_step] = rnd(7); } });
check({ name: 'menu_tick', cases: 2000, setup: (M, rnd) => { nudge(M, rnd, 'logo_timer', 'menu_anim_timer'); M[Z.star_step] = rnd(7); } });
check({ name: 'cycle_logo_colours', setup: (M, rnd) => { nudge(M, rnd, 'logo_timer'); } });
check({ name: 'animate_menu_chars', setup: (M, rnd) => { nudge(M, rnd, 'menu_anim_timer'); } });
