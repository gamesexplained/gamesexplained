// Space Rogue's port: P, the game's routines on the game's memory. Each group of routines is a file
// of its own that adds its functions to P (SRGroups); this makes P and installs them.
//
// The conventions every routine keeps:
// - P.M is the game's 64 KB, read and written at the game's addresses, self-modified operands
//   included. M[1] holds the processor port's data register, which the game reads and writes as
//   $01 (zp_port); RAM under it is never used. P.io is the chips (kit/c64/lockstep.js lists its
//   functions), and the disk: P.io.load(name) gives a file's bytes with its two-byte address
//   first, or null; P.io.block(track, sector) a sector the game reads by block; P.io.save(name,
//   bytes) keeps a file.
// - A routine is P.<its listing label>(r): r holds the registers it is entered with ({ a, x, y,
//   c }, those it reads), and it returns the registers it leaves ({ a, x, y }, and c, z or n where
//   a caller reads them). That is the kit's standIn's form, so the game's own code can stand in
//   for any routine not yet written (in the tests only), and a routine of one group calls
//   another's as P.x.
// - A routine that waits (for a key, for the interrupt's frame count, in a delay loop), or calls
//   one that does, is a generator: it yields where time passes, as kit/c64/lockstep.js describes
//   (a bare yield for each turn of a loop that polls memory the interrupt changes, { cycles: n }
//   for a delay loop, { cp: a } at a checkpoint), and is called with yield*. GEN lists them, and
//   P.CHECKPOINTS the places a routine yields { cp }, which each group adds to. A routine that
//   prints may wait: print_char waits for a key when a line ends at the bottom of a window that
//   is full. test/t-gen.js holds GEN to the closure of the game's calls.
// - A byte the interrupt writes and the main program reads (the frame count $16, the keyboard
//   buffer $03-$15) is read through P.irqByte(a): on the page that is M[a]; in the lockstep it is
//   what the game's code read there, since where an interrupt falls inside a stretch is the
//   game's own race.
// - P.at maps a load address to the name of the file last loaded there ($A500: SEG0 or SEG1;
//   $E400: a model or SEG1A), for the routines of an overlay.
(function (root) {
'use strict';
const G = root.SRGroups = root.SRGroups || {};
const GEN = new Set(`
  main_loop
  sr_start sr_init frame_update do_key key_jettison key_tac_mode key_view key_escape key_navigation
  key_save destroy_object kill_reward key_next_target key_fire target_status key_next_weapon
  print_date print_time fire_beam beam_hit joystick_flight joystick_speed navigation nav_menu
  nav_scan nav_cockpit nav_status draw_chart_cursor nav_helm nav_chart nav_cursor_info helm_step_time
  helm_encounter nav_query back_to_cockpit print_disk_text_cf9c update_cockpit draw_tac draw_speed
  draw_weapon tac_data tac_name tac_label tac_range tac_tactic tac_armour tac_systems
  tac_system_letter print_ship_label ship_ai ai_fire key_surrender merchant_surrender ask_agree
  build_draw_list set_view check_collisions on_contact collide hit_shard ram gate_contact
  missile_hit hazard_hit blow_up damage dock_check dock gate_jump wormhole_step gravity gravity_pull
  menu menu_choose menu_select menu_draw menu_blank print_message print_wrapped print_text
  print_number print_signed print_char scroll_window s_A1BD clear_window s_A240 wait_ticks wait_key
  wait_fire_up draw_frame station_run sr_setup init_game game_over
  station_view base_screen arrival_message base_step base_act player_act base_menu do_action act_notice
  act_ship act_alarm_plate act_hive act_read talk_to status_pages status_ship status_onboard
  status_person print_standing print_system_ok cargo_merchant cargo_buy cargo_sell sell_one buy_one
  pick_line shop_anything_else shop_bought shop_short shop_good_day list_goods outfitter buy_laser
  buy_shield buy_ecm laser_bought shield_bought ecm_bought buy_special shield_price shop_refuse
  shop_no_room repair_shop buy_ordnance fix_armour fix_system find_adjacent act_lock use_card
  pick_lock act_safe safe_loot lock_menu guards_check act_item act_coil show_credits bartender
  talk_script talk_say talk_do talk_next talk_answer talk_menu talk_give_credits talk_take_credits
  type_line hive_start hive_menu hive_quit hive_game hive_game_over hive_clear_view hive_drop
  hive_raise_mound hive_mound_frame hive_shoot hive_show_mounds
`.trim().split(/\s+/));
class Goto { constructor(to, r) { this.to = to; this.r = r || {}; } }
// A program of its own (the title, the intro, the ending: src/g-screens.js) is made with
// opts.program, and has only the KERNAL's routines and its own group, and its own GEN: the
// library's generators and those its gen names; the main program has every other group.
function makePort(M, io, opts = {}) {
  const PROGRAMS = root.SRPrograms || {}, prog = opts.program ? PROGRAMS[opts.program] : null;
  if (opts.program && !prog) throw new Error('makePort: no program ' + opts.program);
  const P = { M, Goto, GEN: prog ? new Set(PROGRAMS.library.gen.concat(prog.gen)) : GEN, at: {}, CHECKPOINTS: [] };
  // P.io is one object for good, so that a routine may keep it (const io = P.io): giving P a new
  // set of chips (the lockstep does) replaces its members
  const IO = Object.assign({}, io);
  Object.defineProperty(P, 'io', { enumerable: true, get: () => IO,
    set: v => { for (const k of Object.keys(IO)) delete IO[k]; Object.assign(IO, v); } });
  P.irqByte = a => (IO.irqByte ? IO.irqByte(a) : M[a]);
  // A read and a write through the processor's map as $01 has it, for the few routines whose
  // accesses go either way (a load's bytes, a save's): the I/O at $D000-$DFFF when its bits say so.
  // The port has no ROMs: reading one is an error, as it would be a byte the port cannot know.
  const ioIn = () => { const c = M[1] & 7; return (c & 3) !== 0 && (c & 4) !== 0; };
  P.rd = a => {
    const c = M[1] & 7;
    if (a >= 0xD000 && a < 0xE000 && (c & 3)) {
      if (c & 4) return IO.read(a);
      throw new Error('the port read the character ROM at $' + a.toString(16));
    }
    if ((a >= 0xE000 && (c & 2)) || (a >= 0xA000 && a < 0xC000 && (c & 3) === 3)) throw new Error('the port read a ROM at $' + a.toString(16));
    return M[a];
  };
  P.wr = (a, v) => { if (a >= 0xD000 && a < 0xE000 && ioIn()) IO.write(a, v); else M[a] = v; };
  const only = opts.only || (prog ? ['kernal', opts.program] : null);
  for (const name of Object.keys(G)) if (only ? only.includes(name) : !PROGRAMS[name]) G[name](P);
  if (opts.standIn) opts.standIn(P);
  return P;
}
root.SRPort = { makePort, Goto, GEN };
})(typeof window !== 'undefined' ? window : globalThis);
