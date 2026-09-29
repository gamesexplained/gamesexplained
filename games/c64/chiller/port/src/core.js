// The port's frame: P, the game's routines on the game's memory. Each group of routines is a
// file of its own that adds its functions to P (ChillerGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the game's 64 KB, read and written at the game's addresses, self-modified operands
//   included; P.io the chips (kit/c64/lockstep.js lists its functions); P.k the same chips and
//   memory for the KERNAL stand-ins (kernal.js).
// - A routine is P.<its listing label>(r): r holds the registers it is entered with ({ a, x, y,
//   c }, those it reads), and it returns the registers it leaves ({ a, x, y }, and c, z or n
//   where a caller reads them). That is the kit's standIn's form, so the game's own code can
//   stand in for any routine not yet written, and a routine of one group calls another's as P.x.
// - A routine that waits (for the raster, for the interrupt, or in a delay loop), or calls one
//   that does, is a generator: it yields where time passes, as kit/c64/lockstep.js describes
//   ({ wait: line } for a raster wait, a bare yield for each turn of a loop that polls memory an
//   interrupt changes, { cycles: n } for a delay loop), and is called with yield*.
// - A JMP to a place that never returns to its caller (main_loop, restart_screen, start_game,
//   game_over and the like) throws a Goto, which the main program catches.
(function (root) {
'use strict';
const G = root.ChillerGroups = root.ChillerGroups || {};
// The routines that are generators: those whose code can reach a wait. Callers use yield*.
const GEN = new Set(`
  b_2A29 b_CDDE boy_first card_and_border card_apostrophe card_wait collect_check cross_count
  cross_touch crosses_left delay enemy_pass enemy_setup enemy_step energy_tick fall_blocked
  fall_step flash_border game_entry game_over game_over_wait girl_touch hud_and_music hud_reset
  hud_restore hud_save j_2A57 j_2EE3 j_5B8D j_5DA9 j_75E0 j_7673 j_C144 j_C6E0 j_CDFA
  jump_colour_step jump_step level_banner level_up main_loop next_screen place_boy player_input
  player_step player_swap poison_add poison_tick reset_players respawn_check respawn_timer
  restart_screen score_reset screen_done screen_exit scroll_nudge scroll_timer scroll_wait
  setup_screen show_card show_forest_card show_level_card spawn_enemy sprite_touch start_game
  swap_sprites switch_allowed switch_request tick_border tile_touch_a tile_touch_b title_start
  to_switch_allowed try_move unused_end_sound unused_shot_hit unused_sound_player wait_fire
  wait_line16
`.trim().split(/\s+/));
class Goto { constructor(to, r) { this.to = to; this.r = r || {}; } }
function makePort(M, io, opts = {}) {
  const P = { M, Goto };
  // P.io is one object for good, so that a routine may keep it (const io = P.io): giving P a
  // new set of chips (the lockstep does) replaces its members
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.k = {
    M,
    colourRead: i => IO.colourRead(i), colourWrite: (i, v) => IO.colourWrite(i, v),
    vicRead: r => IO.vicRead(r), vicWrite: (r, v) => IO.vicWrite(r, v),
    ciaRead: r => IO.ciaRead(r), ciaWrite: (r, v) => IO.ciaWrite(r, v),
  };
  // A byte the interrupt keeps (the jiffy clock $A2, the keyboard's $C5 and $028D), as the main
  // program reads it: the lockstep replaces this with what the game's code read there, since
  // where an interrupt falls inside a stretch of code is the game's own race.
  P.irq_byte = a => M[a];
  if (opts.standIn) {
    for (const [label, a] of opts.labels) {
      const f = opts.standIn(P, a);
      P[label] = GEN.has(label) ? function* (r) { return f(r); } : f;
    }
  }
  for (const name of Object.keys(G)) if (!opts.only || opts.only.includes(name)) G[name](P);
  return P;
}
root.ChillerPort = { makePort, Goto, GEN };
})(typeof window !== 'undefined' ? window : globalThis);
