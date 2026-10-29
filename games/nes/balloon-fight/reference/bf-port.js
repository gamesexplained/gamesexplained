/* bf-port.js */
// Balloon Fight, ported: the game's logic written again in JavaScript, one function for each
// routine of the listing (symbols.json), on the game's own 64 KB at the game's addresses
// (kit/skills/core/70-minisite, "Play"). Nothing here runs the game's program: the page carries the
// game's data (the tables, the layouts, the tunes) and this code, and only the sound driver runs
// as the game's own bytes, on the kit's 6502, as the skill allows a music driver.
//
//   const P = BalloonFight.create(M, io, { CPU })
//     M      Uint8Array(65536): the RAM at $0000-$07FF, the data at $C000-$FFFF (the listing's bytes
//            at every data address; the code may be zero)
//     io     the chips: read(a), write(a, v) for $2000-$2007, $4014, $4016-$4017 and the APU; a
//            page gives it its NES.ppu and its APU model, the tests the lockstep's
//     CPU    the kit's 6502 (C64Cpu.CPU on a page), for the sound driver
//   P.program()      the whole game from the reset vector, a generator: it yields { cp: address }
//                    where the game's code reaches a checkpoint (kit/nes/lockstep.js), and bare
//                    where it waits for the frame; P.CHECKPOINTS lists them, P.PASS the pass
//   P.nmi()          the NMI handler, run once a frame at the vertical blank
//   P.<routine>(r)   each routine, named as in the listing, taking and returning registers
//                    ({ a, x, y, c, n, z }); one that waits for a frame is a generator
// Checked against the game's own code by test_play.js (the lockstep) and, routine by routine, by
// the pool check in work/port/check.js.
const BalloonFight = (function () {
  'use strict';
  const V = {
    ppuctrl_shadow: 0x0000, ppumask_shadow: 0x0001, frame_flag: 0x0002, score_p1: 0x0003, score_p1_hundreds: 0x0004,
    score_p1_thousands: 0x0005, score_p1_tenthousands: 0x0006, score_p1_hundredthousands: 0x0007, score_p2: 0x0008,
    score_top: 0x000D, tmp12: 0x0012, tmp13: 0x0013, tmp14: 0x0014, tmp15: 0x0015, game_mode: 0x0016,
    trip_scroll_x: 0x0017, trip_nametable: 0x0018, frame_counter: 0x0019, random: 0x001B, random_hi: 0x001C,
    ptr1: 0x001D, ptr1_hi: 0x001E, ptr2: 0x001F, ptr2_hi: 0x0020, ptr3: 0x0021, ptr3_hi: 0x0022,
    platform_left_ptr: 0x0023, platform_left_ptr_hi: 0x0024, platform_right_ptr: 0x0025,
    platform_right_ptr_hi: 0x0026, platform_top_ptr: 0x0027, platform_top_ptr_hi: 0x0028, platform_bottom_ptr: 0x0029,
    platform_bottom_ptr_hi: 0x002A, mul_a: 0x002B, mul_a_hi: 0x002C, mul_b: 0x002D, mul_result: 0x002E,
    mul_result_mid: 0x002F, mul_result_hi: 0x0030, buttons: 0x0031, demo_flag: 0x003A, phase_index: 0x003B,
    phase_counter: 0x003C, phase_text_timer: 0x003D, scoring_player: 0x003E, title_option: 0x003F,
    two_players: 0x0040, lives: 0x0041, lives_p2: 0x0042, score_add: 0x0043, score_add_hundreds: 0x0044,
    score_add_thousands: 0x0045, status_request: 0x0046, score_extra_thousands: 0x0047, score_extra_hundreds: 0x0048,
    trip_rank_units: 0x0049, trip_rank_tens: 0x004A, collision_flag: 0x004B, stars_to_twinkle: 0x004C,
    star_index: 0x004F, ppu_addr_lo: 0x0050, ppu_addr_hi: 0x0051, ppu_queue_read: 0x0052, ppu_queue_write: 0x0053,
    text_col: 0x0054, text_row: 0x0055, text_len: 0x0056, text_buf: 0x0057, text_buf_1: 0x0058, text_buf_2: 0x0059,
    text_buf_3: 0x005A, text_buf_4: 0x005B, text_buf_5: 0x005C, text_buf_6: 0x005D, phase_text_tens: 0x0060,
    phase_text_digits: 0x0061, super_bonus_digits: 0x0068, super_bonus_units: 0x0069, bonus_total_p2: 0x006B,
    bonus_palette: 0x0072, actor_action: 0x007F, actor_action_p2: 0x0080, actor_action_birds: 0x0081,
    fish_state: 0x0087, actor_balloons: 0x0088, actor_balloons_p2: 0x0089, actor_balloons_birds: 0x008A,
    fish_balloons: 0x0090, actor_x: 0x0091, actor_x_p2: 0x0092, actor_x_birds: 0x0093, fish_x: 0x0099,
    actor_y: 0x009A, actor_y_p2: 0x009B, actor_y_birds: 0x009C, fish_y: 0x00A2, cloud_count: 0x00A3,
    lightning_cloud: 0x00A4, lightning_cloud_copy: 0x00A5, cloud_attr_tl: 0x00A6, cloud_attr_tr: 0x00A9,
    cloud_attr_bl: 0x00AC, cloud_attr_br: 0x00AF, cloud_x: 0x00B2, cloud_y: 0x00B5, lightning_timer: 0x00B8,
    spark_speed_level: 0x00BA, splash_frame: 0x00BB, splash_x: 0x00BC, invulnerable: 0x00BD, invulnerable_p2: 0x00BE,
    invulnerable_timer: 0x00BF, spark_hit: 0x00C1, respawn_timer: 0x00C3, trip_scroll_pause: 0x00C5,
    enemy_inflate_rate: 0x00C6, enemy_launch_delay: 0x00C7, no_enemies: 0x00C8, trip_progress: 0x00C9,
    trip_difficulty: 0x00CA, landed_flag: 0x00CB, collision_bits: 0x00CC, platform_count: 0x00CD,
    snd_counters: 0x00D0, snd_counter_sq2: 0x00D1, snd_counter_tri: 0x00D2, snd_counter_noise: 0x00D3,
    snd_note_lengths: 0x00D4, snd_repeats: 0x00D8, snd_volume_sq1: 0x00DC, snd_volume_sq2: 0x00DD,
    snd_tri_linear: 0x00DE, snd_tempo: 0x00DF, snd_channel_ptr: 0x00E0, snd_channel_ptr_hi: 0x00E1,
    snd_positions: 0x00E8, snd_position_sq2: 0x00E9, snd_position_tri: 0x00EA, snd_position_noise: 0x00EB,
    snd_loop_positions: 0x00EC, sfx_request_a: 0x00F0, sfx_request_b: 0x00F1, music_request: 0x00F2,
    sfx_request_c: 0x00F3, sfx_state_a: 0x00F4, sfx_state_b: 0x00F5, music_playing: 0x00F6, sfx_state_c: 0x00F7,
    sfx_data_ptr: 0x00F9, sfx_data_ptr_hi: 0x00FA, sfx_src_ptr: 0x00FB, sfx_src_ptr_hi: 0x00FC,
    snd_channel_offset: 0x00FD, snd_stream_ptr: 0x00FE, snd_stream_ptr_hi: 0x00FF, sprite_table: 0x0200,
    sprite_tile_0: 0x0201, sprite_attr_0: 0x0202, sprite_x_0: 0x0203, sprite_y_1: 0x0204, sprite_tile_1: 0x0205,
    sprite_attr_1: 0x0206, sprite_x_1: 0x0207, sprite_y_2: 0x0208, sprite_tile_2: 0x0209, sprite_attr_2: 0x020A,
    sprite_x_2: 0x020B, sprite_y_3: 0x020C, sprite_tile_3: 0x020D, sprite_attr_3: 0x020E, sprite_x_3: 0x020F,
    sprite_y_4: 0x0210, sprite_y_5: 0x0214, sprite_bubbles: 0x0250, sprite_bubbles_tile: 0x0251,
    sprite_bubbles_attr: 0x0252, sprite_bubbles_x: 0x0253, sprite_bubbles_y2: 0x0254, sprite_bubbles_tile2: 0x0255,
    sprite_bubbles_attr2: 0x0256, sprite_bubbles_x2: 0x0257, sprite_bubbles_y3: 0x0258, sprite_bubbles_tile3: 0x0259,
    sprite_bubbles_attr3: 0x025A, sprite_bubbles_x3: 0x025B, sprite_sparks: 0x02B0, sprite_sparks_tile: 0x02B1,
    sprite_sparks_attr: 0x02B2, sprite_sparks_x: 0x02B3, sprite_bolt: 0x02E0, sprite_bolt_tile: 0x02E1,
    sprite_bolt_attr: 0x02E2, sprite_bolt_x: 0x02E3, sprite_bolt_y2: 0x02E4, sprite_bolt_tile2: 0x02E5,
    sprite_bolt_attr2: 0x02E6, sprite_bolt_x2: 0x02E7, sprite_bolt_y3: 0x02E8, sprite_bolt_tile3: 0x02E9,
    sprite_bolt_attr3: 0x02EA, sprite_bolt_x3: 0x02EB, sprite_popups: 0x02F0, sprite_popups_tile: 0x02F1,
    sprite_popups_attr: 0x02F2, sprite_popups_x: 0x02F3, sprite_popups_y2: 0x02F4, sprite_popups_tile2: 0x02F5,
    sprite_popups_attr2: 0x02F6, sprite_popups_x2: 0x02F7, ppu_queue: 0x0300, actor_x_frac: 0x0400,
    actor_y_frac: 0x0409, actor_vy_lo: 0x0412, actor_vy_hi: 0x041B, actor_vx_lo: 0x0424, actor_vx_hi: 0x042D,
    actor_frame: 0x0436, actor_frame_timer: 0x043F, actor_frame_timer_birds: 0x0441, actor_facing: 0x0448,
    fish_facing: 0x0450, actor_type: 0x0451, actor_type_birds: 0x0453, fish_type: 0x0459, actor_timer: 0x045A,
    actor_vx_target_lo: 0x0463, actor_vx_target_hi: 0x046C, actor_hit_cooldown: 0x0475, actor_was_hit: 0x047E,
    kicked_flag: 0x0487, trip_platform_x: 0x0488, fish_rising: 0x0489, fish_sinking: 0x048A, fish_target: 0x048B,
    fish_caught: 0x048C, fish_timer: 0x048D, fish_flags: 0x048E, fish_flags_2: 0x048F, spark_x: 0x0490,
    spark_y: 0x04A4, spark_x_frac: 0x04B8, spark_y_frac: 0x04CC, spark_vx_hi: 0x04E0, spark_vy_hi: 0x04F4,
    spark_vx_lo: 0x0508, spark_vy_lo: 0x051C, spark_state: 0x0530, spark_state_1: 0x0531, spark_bolt_phase: 0x0544,
    bonus_round: 0x0558, bonus_value: 0x0559, balloon_rise_speed: 0x055A, perfect_tens: 0x055B, perfect_units: 0x055C,
    balloon_state: 0x055D, balloon_state_1: 0x055E, balloon_x: 0x0567, balloon_x_1: 0x0568, balloon_x_frac: 0x0571,
    balloon_y: 0x057B, balloon_y_1: 0x057C, balloon_y_frac: 0x0585, balloon_vx_hi: 0x058F, balloon_vx_lo: 0x0599,
    balloon_unused: 0x05A3, balloon_sway_lo: 0x05B7, balloon_sway_hi: 0x05C1, balloons_to_launch: 0x05CB,
    balloon_spawn_timer: 0x05CC, balloons_popped: 0x05CD, balloons_popped_p2: 0x05CE, propeller_count: 0x05D1,
    propeller_x: 0x05D2, propeller_y: 0x05DC, propeller_addr_lo: 0x05E6, propeller_addr_hi: 0x05F0,
    propeller_phase: 0x05FA, propeller_spinning: 0x0604, propeller_spin_timer: 0x060E, popup_timer: 0x0618,
    popup_timer_2: 0x0619, popup_kind: 0x061A, joypad: 0x061C, joypad_last: 0x061E, flap_latch: 0x0620,
    top_scores: 0x0629, top_score_trip_2: 0x0634, trip_ranking: 0x0700, snd_var_e0: 0x07E0, snd_spark_hit_len: 0x07E1,
    snd_plop_count: 0x07E4, snd_music_loop: 0x07E8, snd_request_b_last: 0x07E9, snd_tri_flag: 0x07F0,
    snd_lightning_step: 0x07F1, snd_lightning_count: 0x07F3, snd_pending_hit: 0x07F5, snd_landing_count: 0x07F6,
    snd_hit_count: 0x07F7, snd_bounce_count: 0x07F9, ram_signature: 0x07FA, snd_fall_count: 0x07FB,
    snd_fish_count: 0x07FC, snd_fish_period2: 0x07FD, snd_fish_period1: 0x07FE, ram_signature_text: 0xC082,
    initial_top_scores: 0xC085, trip_handlers: 0xC3B5, trip_handlers_hi: 0xC3B6, trip_handler_order: 0xC3BF,
    trip_spark_speeds: 0xC43A, trip_layout: 0xC4AD, fish_frames_rising: 0xC5B7, fish_frames_sinking: 0xC5BB,
    fish_victim_types: 0xC6B8, spark_speed_by_phase: 0xC748, lightning_delays: 0xC761, cloud_flash_attrs: 0xC88B,
    spark_dir_flip_x: 0xC88F, spark_dir_flip_y: 0xC893, spark_dir_dx: 0xC897, spark_dir_dy: 0xC89B,
    spark_base_speeds: 0xC89F, spark_vx_hi_by_level: 0xC8A5, spark_vy_by_level: 0xC8AB, spark_vy_hi_by_level: 0xC8B1,
    spark_tiles: 0xC9DD, bolt_dx1: 0xC9E5, bolt_dy1: 0xC9F5, bolt_dy_step: 0xCA05, bolt_tiles1: 0xCA15,
    bolt_tiles2: 0xCA1F, bolt_tiles3: 0xCA29, bolt_attrs: 0xCA33, unused_rts: 0xCB1B, propeller_tiles: 0xCD26,
    propeller_tiles_2: 0xCD2A, propeller_tiles_3: 0xCD2E, propeller_tiles_4: 0xCD32, propeller_tiles_5: 0xCD36,
    propeller_tiles_6: 0xCD3A, propeller_tiles_7: 0xCD3E, propeller_tiles_8: 0xCD42, propeller_tiles_9: 0xCD46,
    chimney_x: 0xCEAE, balloon_palettes: 0xCEB2, balloon_bottom_tiles: 0xCEB5, balloon_bottom_flips: 0xCEBD,
    bonus_values: 0xD10D, bonus_rise_speeds: 0xD112, perfect_tens_table: 0xD117, perfect_units_table: 0xD11C,
    bonus_result_palette: 0xD12B, bonus_result_text: 0xD13E, bonus_result_attrs1: 0xD15A, bonus_result_attrs2: 0xD165,
    perfect_text: 0xD170, super_bonus_text: 0xD184, bonus_player_y: 0xD19E, base_palette: 0xD437,
    phase_bg_palettes: 0xD45A, bonus_palette_ptrs: 0xD46A, bonus_palette_ptrs_hi: 0xD46F, bonus_palettes: 0xD474,
    cloud_tiles: 0xD493, attr_quadrant_masks: 0xD564, attr_quadrant_values: 0xD568, star_tiles: 0xD64C,
    star_tiles_next: 0xD64D, star_addresses: 0xD65C, star_addresses_hi: 0xD65D, top_score_ptrs: 0xD779,
    gameover_text_rev: 0xD84B, rank_text_rev: 0xD86C, popup_tiles: 0xD8D1, popup_tiles2: 0xD8D7,
    title_block_list: 0xD92C, title_blocks: 0xD930, title_next_option: 0xDB05, title_cursor_y: 0xDB27,
    phase_layouts: 0xDB2A, phase_layouts_hi: 0xDB3A, phase_layout_1: 0xDB4A, phase_layout_2: 0xDB59,
    bonus_layout: 0xDB6C, phase_layout_4: 0xDB77, phase_layout_5: 0xDB88, phase_layout_7: 0xDB99,
    phase_layout_10: 0xDBAD, phase_layout_9: 0xDBCA, phase_layout_6: 0xDBE1, phase_layout_3: 0xDBF2,
    phase_layout_8: 0xDC03, phase_layout_11: 0xDC17, common_blocks: 0xDC2B, trip_water_attrs: 0xDCAE,
    bonus_blocks: 0xDCCA, phase_blocks: 0xDD39, platform_tables: 0xDE7A, bird_lists: 0xDF96, actor_sprite_dy: 0xE03D,
    actor_sprite_dx: 0xE043, actor_sprite_dx_left: 0xE079, sprite_layouts: 0xE0AF, player_layout_ptrs: 0xE24C,
    player_layout_ptrs_hi: 0xE298, player_flash_ptrs: 0xE2E4, player_flash_ptrs_hi: 0xE2EC, bird_layout_ptrs: 0xE2F4,
    bird_layout_ptrs_hi: 0xE320, player_layout_base: 0xE34C, player_flash_base: 0xE34F, bird_layout_base: 0xE352,
    fish_layouts: 0xE355, fish_layout_ptrs: 0xE384, fish_layout_ptrs_hi: 0xE38B, actor_sprite_slots: 0xE392,
    actor_sprite_slots_alt: 0xE39B, splash_frame_ptrs: 0xE5C5, splash_frame_ptrs_hi: 0xE5CA, splash_frames: 0xE5CF,
    gravity_by_type: 0xE601, flap_strength: 0xE60D, run_accel: 0xE619, air_accel: 0xE625, max_vx_lo: 0xE631,
    max_vx_hi: 0xE63D, max_vx_left_lo: 0xE649, max_vx_left_hi: 0xE655, max_vy_lo: 0xE661, max_vy_hi: 0xE66D,
    max_vy_up_lo: 0xE679, max_vy_up_hi: 0xE685, bird_decision_masks: 0xE762, bird_decision_bases: 0xE765,
    relaunch_types: 0xECAE, player_burst_actions: 0xF053, hit_next_type: 0xF05E, hit_scores: 0xF06A,
    hit_scores_kicked: 0xF076, hit_popups: 0xF082, player_start_x: 0xF3AE, enemy_inflate_rates: 0xF3BA,
    enemy_launch_delays: 0xF3C3, phase_text_block: 0xF3F5, phase_text_blank: 0xF400, gameover_block_ptrs: 0xF43B,
    gameover_block_ptrs_hi: 0xF43D, gameover_rows: 0xF43F, gameover_block: 0xF442, gameover_attr_block: 0xF455,
    unused_fill: 0xF4C5, bird_plop_sfx: 0xF5FC, note_periods: 0xF600, note_periods_lo: 0xF601, note_lengths: 0xF660,
    flap_sfx: 0xF6E5, footstep_sfx: 0xF6E9, lightning_sfx: 0xF6ED, hit_sfx: 0xF6F1, fall_sfx: 0xF6F5,
    spark_hit_sfx: 0xF6F9, noise_periods: 0xF700, noise_periods_1: 0xF701, noise_periods_2: 0xF702,
    pop_sfx_regs: 0xF9CD, fall_sfx_regs: 0xF9D1, fish_rise_sfx_regs: 0xF9D5, bounce_sfx_regs: 0xF9DD,
    tick_sfx_regs: 0xF9E1, bird_flap_sfx_regs: 0xFA8A, landing_sfx_regs: 0xFA8E, tune_headers: 0xFBCA,
    bubble_tune_sq2: 0xFC38, bubble_tune_tri: 0xFC49, life_lost_sq1: 0xFC59, life_lost_sq2: 0xFC72,
    life_lost_tri: 0xFC8C, trip_music_sq1: 0xFCA5, trip_music_sq2: 0xFD0A, trip_music_tri: 0xFD98,
    trip_music_noise: 0xFDE0, pause_sq1: 0xFE0D, pause_tri: 0xFE13, gameover_sq1: 0xFE18, gameover_sq2: 0xFE2A,
    gameover_tri: 0xFE65, gameover_noise: 0xFE86, pumping_sq2: 0xFE92, pumping_tri: 0xFEA1, fish_sq1: 0xFEB2,
    fish_tri: 0xFEC5, parachute_sq2: 0xFED7, parachute_tri: 0xFEED, clear_sq1: 0xFF02, clear_sq2: 0xFF0B,
    clear_tri: 0xFF1E, clear_noise: 0xFF31, fanfare_sq1: 0xFF38, fanfare_sq2: 0xFF5A, fanfare_tri: 0xFF79,
    fanfare_noise: 0xFF94, perfect_sq1: 0xFFB3, perfect_sq2: 0xFFC9, perfect_tri: 0xFFDA, perfect_noise: 0xFFEF,
    vectors: 0xFFFA,
  };
  const ROUTINES = {
    reset: 0xC000, nmi: 0xC094, irq_hang: 0xC0F7, nmi_off: 0xC0FA, nmi_on: 0xC104, screen_off: 0xC10A,
    screen_on: 0xC115, queue_text: 0xC119, queue_block_from_text: 0xC12D, queue_block: 0xC131,
    queue_text_header: 0xC154, flush_ppu_queue: 0xC17C, flush_ppu_queue_loop: 0xC188, trip_start: 0xC1C5,
    trip_loop: 0xC209, jmp_trip_handler: 0xC3B2, trip_stream_reader: 0xC3C9, trip_gen_balloon_and_sparks: 0xC3F7,
    trip_gen_rare_bubble: 0xC43E, trip_gen_nothing: 0xC45E, trip_gen_sparks_only: 0xC45F, trip_spawn_balloon: 0xC46B,
    trip_spawn_spark: 0xC486, set_balloon_value: 0xC527, find_trip_rank: 0xC539, insert_trip_rank: 0xC579,
    fish_draw: 0xC5C3, fish_find_target: 0xC614, fish_swim: 0xC64B, fish_rise: 0xC658, fish_check_target: 0xC6C4,
    fish_update: 0xC6F9, lightning_init: 0xC716, lightning_set_phase: 0xC726, pick_lightning_cloud: 0xC77A,
    lightning_countdown: 0xC790, cloud_flash: 0xC831, j_C856: 0xC856, queue_text_buf: 0xC883, sparks_update: 0xC8B7,
    spark_move: 0xC9B6, spark_flip_vx_sound: 0xCA37, spark_flip_vx: 0xCA3D, spark_flip_vy_sound: 0xCA4F,
    spark_flip_vy: 0xCA55, spark_platforms: 0xCA67, spark_hit_players: 0xCB1C, propellers_update: 0xCB74,
    propeller_push: 0xCBA8, request_bounce_sound: 0xCC33, propeller_touch: 0xCC3A, propeller_stand: 0xCCBF,
    propeller_draw: 0xCCCB, queue_propeller_row: 0xCD0F, balloons_clear: 0xCD4A, balloon_spawn: 0xCD5A,
    balloons_update: 0xCDAA, balloon_draw: 0xCE2F, balloon_hit_players: 0xCECE, bonus_round_play: 0xCF13,
    set_bonus_round_values: 0xD0E2, check_perfect: 0xD121, bonus_show_totals: 0xD1A0, queue_two_digits: 0xD1C9,
    add_value_to_digits: 0xD1DC, count_down_into_score: 0xD213, clear_screen: 0xD246, fill_nametable: 0xD275,
    build_phase_screen: 0xD293, load_palette: 0xD3ED, advance_platform_ptr: 0xD48C, draw_block_lists: 0xD497,
    read_level_byte: 0xD4E5, read_block_byte: 0xD4F0, set_ppu_addr_from_tile_xy: 0xD4FB,
    attr_addr_and_quadrant: 0xD51C, set_attr_quadrant_palette1: 0xD53C, draw_propeller_now: 0xD56C,
    build_trip_screen: 0xD572, write_trip_attrs: 0xD593, write_repeated: 0xD5B1, write_water_rows: 0xD5B8,
    write_tile_cycle: 0xD5C9, draw_stars: 0xD5D9, draw_star_if_blank: 0xD5F1, twinkle_stars: 0xD60D,
    star_addr: 0xD651, add_score_zero: 0xD6DC, add_score: 0xD6DE, divide: 0xD77C, mod10: 0xD78F,
    status_bar_update: 0xD798, draw_lives_or_gameover: 0xD826, show_popup: 0xD871, popups_countdown: 0xD8DD,
    popups_clear: 0xD8FF, draw_title_screen: 0xD90F, draw_title_cursor: 0xDB08, draw_actor: 0xE3A4,
    draw_actor_bubble: 0xE4D5, draw_splash: 0xE587, actors_update: 0xE691, steer_actor: 0xE6E9, read_joypads: 0xE768,
    read_joypad_x: 0xE76A, actor_move_control: 0xE796, actor_sway: 0xE7B1, actor_ground_state: 0xE983,
    actor_animate: 0xEA18, actor_physics: 0xEA58, actor_move_x: 0xEB8E, actor_move_y: 0xEBA0,
    actor_move_x_yreg: 0xEBB2, actor_move_y_yreg: 0xEBBB, actor_think: 0xEBC4, actor_bubble_update: 0xECBA,
    actor_platforms: 0xED28, actors_collide: 0xEE25, resolve_hit: 0xEF37, abs: 0xF08E, vx_diff: 0xF098,
    vy_diff: 0xF0A6, swap_xy: 0xF0B4, both_birds_flying: 0xF0BD, negate_vx: 0xF0DE, negate_vy: 0xF107,
    multiply_signed: 0xF119, scale_vx_80pct: 0xF172, scale_vy_80pct: 0xF18C, shift_right_4: 0xF1A6,
    next_random: 0xF1B3, main: 0xF1D4, start_game: 0xF1F2, phase_start: 0xF213, game_over_wait: 0xF36A,
    player_place: 0xF386, actor_init_player: 0xF3B0, phase_text: 0xF3CC, show_game_over: 0xF40B,
    wait_20_frames: 0xF45C, wait_x_frames: 0xF45E, wait_frame: 0xF465, wait_frame_pause: 0xF470,
    phase_vars_init: 0xF4A5, music_play: 0xF504, sfx_set_registers: 0xF683, sfx_set_tri: 0xF687,
    sfx_set_noise: 0xF68B, sfx_set_sq2: 0xF68F, music_start: 0xF6A8, sfx_reset_sweeps: 0xF712,
    set_music_volumes: 0xF71A, bird_plop_sfx_update: 0xF725, sound_frame: 0xF758, footstep_sfx_start: 0xF77C,
    music_ended: 0xF78F, silence_music: 0xF798, sfx_stop_update: 0xF824, spark_bounce_sfx_start: 0xF8A6,
    spark_bounce_sfx_update: 0xF8BF, sfx_squares_off: 0xF8CA, sfx_update_a: 0xF90A, sfx_update_b: 0xFA38,
    sfx_update_c: 0xFAAC, music_update: 0xFB25, music_start_tune: 0xFBA5, music_start_fanfare: 0xFBC1,
    nmi_sound_entry: 0xFFF7,
  };
  // The lockstep's checkpoints: every JSR inside a routine that waits for the frame, and the pass,
  // the instruction after wait_frame's loop ($F46D, the DEC: the RTS after it is a branch target
  // too), which every frame of the game passes.
  const PASS = 0xF46D;
  const CHECKPOINTS = [0xC045, 0xC04C, 0xC069, 0xC10D, 0xC1C9, 0xC1CC, 0xC1E6, 0xC1F7, 0xC209, 0xC20C, 0xC213, 0xC29D, 0xC2CD, 0xC2D7, 0xC2EA, 0xC2EF,
    0xC300, 0xC30A, 0xC311, 0xC314, 0xC353, 0xC35E, 0xC361, 0xC368, 0xC3A1, 0xC3A8, 0xCF17, 0xCF1A, 0xCF23, 0xCF34, 0xCF39, 0xCF3C, 0xCF44, 0xCF47,
    0xCF5D, 0xCF64, 0xCF6B, 0xCF72, 0xCF79, 0xCF90, 0xCF93, 0xCFB5, 0xCFBB, 0xCFD7, 0xCFE5, 0xCFE8, 0xD005, 0xD010, 0xD01D, 0xD029, 0xD02E, 0xD034,
    0xD037, 0xD03E, 0xD047, 0xD04A, 0xD061, 0xD06A, 0xD06D, 0xD076, 0xD079, 0xD084, 0xD08B, 0xD094, 0xD0AA, 0xD0AD, 0xD0C0, 0xD0CB, 0xD246, 0xD249,
    0xD256, 0xD259, 0xD25C, 0xD25F, 0xD293, 0xD296, 0xD2AC, 0xD2B1, 0xD2BA, 0xD2C1, 0xD2E1, 0xD2EA, 0xD2F3, 0xD2FC, 0xD305, 0xD308, 0xD327, 0xD330,
    0xD335, 0xD354, 0xD35F, 0xD362, 0xD369, 0xD370, 0xD377, 0xD382, 0xD387, 0xD3BA, 0xD3BF, 0xD3C4, 0xD3CC, 0xD3D3, 0xD3DA, 0xD3E1, 0xD3E4, 0xD3E7,
    0xD576, 0xD57D, 0xD584, 0xD58B, 0xD90F, 0xD912, 0xD915, 0xD918, 0xD923, 0xD926, 0xDAC1, 0xDAC4, 0xDACB, 0xDAD2, 0xDAD5, 0xDAFC, 0xF1D4, 0xF1E4,
    0xF20D, 0xF278, 0xF27E, 0xF281, 0xF28E, 0xF291, 0xF2A2, 0xF2B9, 0xF2C2, 0xF2C5, 0xF2C8, 0xF2CB, 0xF2CE, 0xF2D1, 0xF2D4, 0xF2D7, 0xF2DA, 0xF2DD,
    0xF2F6, 0xF303, 0xF306, 0xF31C, 0xF355, 0xF372, 0xF375, 0xF378, 0xF40B, 0xF416, 0xF434, 0xF45E, 0xF470, 0xF477, 0xF489, 0xF48C];
  // Routines that wait for the frame: generators, checked in the lockstep rather than alone.
  const WAITS = ['reset', 'main', 'title_loop', 'draw_title_screen', 'start_game', 'phase_start', 'phase_loop', 'phase_cleared', 'game_over',
    'game_over_wait', 'show_game_over', 'trip_start', 'trip_loop', 'bonus_round_play', 'clear_screen', 'build_phase_screen', 'build_trip_screen',
    'screen_off', 'screen_on', 'wait_frame', 'wait_x_frames', 'wait_20_frames', 'wait_frame_pause', 'program'];
  // Registers a routine leaves that no caller reads, left out of the pool check (work/port/check.js).
  const IGNORE_REGS = {
    nmi: ['a', 'x', 'y', 'n', 'z', 'c'], flush_ppu_queue_loop: ['a', 'x', 'y', 'n', 'z', 'c'], twinkle_stars: ['a', 'x', 'y', 'n', 'z', 'c'],
    status_bar_update: ['a', 'x', 'y', 'n', 'z', 'c'], draw_lives_or_gameover: ['a', 'x', 'n', 'z', 'c'], status_rank: ['a', 'y', 'n', 'z', 'c'],
    queue_text: ['a', 'x', 'y', 'n', 'z', 'c'], queue_text_header: ['a', 'n', 'z', 'c'], queue_block: ['a', 'y', 'n', 'z', 'c'],
    queue_block_from_text: ['a', 'y', 'n', 'z', 'c'], fill_nametable: ['a', 'x', 'n', 'z', 'c'], draw_block_lists: ['a', 'x', 'y', 'n', 'z', 'c'],
    read_level_byte: ['y', 'n', 'z', 'c'], read_block_byte: ['y', 'n', 'z', 'c'], set_ppu_addr_from_tile_xy: ['n', 'z', 'c'],
    attr_addr_and_quadrant: ['n', 'z', 'c'], set_attr_quadrant_palette1: ['a', 'y', 'n', 'z', 'c'], write_trip_attrs: ['a', 'x', 'n', 'z', 'c'],
    write_repeated: ['x', 'n', 'z', 'c'], write_water_rows: ['a', 'x', 'n', 'z', 'c'], write_tile_cycle: ['a', 'x', 'n', 'z', 'c'],
    draw_stars: ['a', 'x', 'y', 'n', 'z', 'c'], draw_star_if_blank: ['a', 'y', 'n', 'z', 'c'], star_addr: ['a', 'n', 'z', 'c'],
    load_palette: ['a', 'x', 'y', 'n', 'z', 'c'], advance_platform_ptr: ['n', 'z'], nmi_off: ['a', 'n', 'z', 'c'], nmi_on: ['a', 'n', 'z', 'c'],
    phase_text: ['a', 'x', 'y', 'n', 'z', 'c'], player_place: ['a', 'y', 'n', 'z', 'c'], actor_init_player: ['a', 'n', 'z', 'c'],
    phase_vars_init: ['a', 'x', 'n', 'z', 'c'], popups_clear: ['a', 'x', 'n', 'z', 'c'], popups_countdown: ['a', 'x', 'y', 'n', 'z', 'c'],
    read_joypads: ['y', 'c'], read_joypad_x: ['y', 'c'], next_random: ['n', 'z', 'c'], add_score: ['a', 'x', 'y', 'n', 'z', 'c'],
    add_score_zero: ['a', 'x', 'y', 'n', 'z', 'c'], divide: ['x', 'n', 'z', 'c'], mod10: ['n', 'z'], set_bonus_round_values: ['a', 'x', 'n', 'z', 'c'],
    check_perfect: ['n'], bonus_show_totals: ['a', 'x', 'y', 'n', 'z', 'c'], queue_two_digits: ['a', 'x', 'y', 'n', 'z', 'c'],
    add_value_to_digits: ['a', 'x', 'y', 'n', 'z', 'c'], blank_leading_zeros: ['a', 'x', 'y', 'n', 'z', 'c'], count_down_into_score: ['a', 'x', 'y', 'n', 'z', 'c'],
    trip_stream_reader: ['a', 'x', 'y', 'n', 'z', 'c'], trip_gen_balloon_and_sparks: ['a', 'x', 'y', 'n', 'z', 'c'], trip_gen_sparks: ['a', 'x', 'y', 'n', 'z', 'c'],
    trip_gen_rare_bubble: ['a', 'x', 'y', 'n', 'z', 'c'], trip_gen_nothing: [], trip_gen_sparks_only: ['a', 'x', 'y', 'n', 'z', 'c'],
    trip_spawn_balloon: ['a', 'x', 'n', 'z', 'c'], trip_spawn_spark: ['a', 'x', 'n', 'z', 'c'], jmp_trip_handler: ['a', 'x', 'y', 'n', 'z', 'c'],
    // the actors: their callers read no register but vx_diff's and vy_diff's N, both_birds_flying's C, abs's A and actor_move_y's A
    both_birds_flying: ['a', 'n', 'z'], multiply_signed: ['a', 'n', 'z'], multiply_unsigned: ['a', 'n', 'z'], shift_right_4: ['a', 'y', 'n', 'z'],
    actor_move_x_yreg: ['n', 'z'], actor_move_y_yreg: ['n', 'z'], actor_sway: ['a', 'y', 'n', 'z', 'c'], steer_actor: ['a', 'y', 'n', 'z', 'c'],
    actor_move_control: ['a', 'y', 'n', 'z', 'c'], actor_ground_state: ['a', 'y', 'n', 'z', 'c'], actor_animate: ['a', 'y', 'n', 'z', 'c'],
    actor_physics: ['a', 'y', 'n', 'z', 'c'], actor_think: ['a', 'y', 'n', 'z', 'c'], actor_controls: ['a', 'y', 'n', 'z', 'c'],
    actor_bubble_update: ['a', 'y', 'n', 'z', 'c'], actor_platforms: ['a', 'y', 'n', 'z', 'c'], actors_collide: ['a', 'x', 'y', 'n', 'z', 'c'],
    resolve_hit: ['a', 'n', 'z', 'c'], actors_update: ['a', 'x', 'y', 'n', 'z'],
    draw_actor: ['a', 'y', 'n', 'z'], draw_actor_bubble: ['a', 'y', 'n', 'z'], draw_splash: ['a', 'x', 'y', 'n', 'z', 'c'],
    balloons_clear: ['a', 'x', 'n', 'z', 'c'], balloon_spawn: ['a', 'x', 'y', 'n', 'z', 'c'], balloons_update: ['a', 'x', 'y', 'n', 'z', 'c'],
    balloon_draw: ['a', 'y', 'n', 'z', 'c'], balloon_hit_players: ['a', 'y', 'n', 'z', 'c'], spark_move: ['n', 'z', 'c'],
    spark_flip_vx: ['a', 'n', 'z', 'c'], spark_flip_vy: ['a', 'n', 'z', 'c'], spark_flip_vx_sound: ['a', 'n', 'z', 'c'], spark_flip_vy_sound: ['a', 'n', 'z', 'c'],
    spark_hit_players: ['a', 'y', 'n', 'z', 'c'], spark_platforms: ['a', 'y', 'n', 'z', 'c'], sparks_update: ['a', 'x', 'y', 'n', 'z'],
    request_bounce_sound: ['n', 'z', 'c'], propellers_update: ['a', 'x', 'y', 'n', 'z', 'c'], propeller_push: ['a', 'y', 'n', 'z', 'c'],
    propeller_touch: ['a', 'y', 'n', 'z', 'c'], propeller_stand: ['a', 'n', 'z', 'c'], queue_propeller_row: ['a', 'n', 'z', 'c'], propeller_draw: ['a', 'y', 'n', 'z', 'c'],
    set_balloon_value: ['n', 'z', 'c'], find_trip_rank: ['a', 'x', 'y', 'n', 'z', 'c'], insert_trip_rank: ['a', 'x', 'y', 'n', 'z', 'c'],
    fish_draw: ['a', 'x', 'y', 'n', 'z', 'c'], fish_find_target: ['a', 'x', 'n', 'z', 'c'], fish_swim: ['a', 'n', 'z', 'c'], fish_rise: ['a', 'x', 'y', 'n', 'z', 'c'],
    fish_check_target: ['a', 'x', 'n', 'z', 'c'], fish_update: ['a', 'x', 'y', 'n', 'z', 'c'], queue_text_buf: ['a', 'y', 'n', 'z', 'c'], j_C856: ['a', 'x', 'y', 'n', 'z'],
    pick_lightning_cloud: ['a', 'x', 'n', 'z', 'c'], lightning_set_phase: ['a', 'x', 'y', 'n', 'z', 'c'], lightning_init: ['a', 'x', 'y', 'n', 'z', 'c'],
    lightning_countdown: ['a', 'x', 'y', 'n', 'z', 'c'], cloud_flash: ['a', 'x', 'y', 'n', 'z'], draw_title_cursor: ['a', 'x', 'y', 'n', 'z', 'c'],
    draw_propeller_now: ['a', 'x', 'y', 'n', 'z', 'c'],
  };
  const SOUND_FRAME = 0xF758;
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const MAP = { ioPages: [...range(0x08, 0x3F), 0x40], romPages: range(0x80, 0xFF) };   // the NES's map on the kit's 6502
  const C = a => ({ cp: a });

  function create(M, chips, opts = {}) {
    const P = { M, io: chips, V, ROUTINES, PASS, CHECKPOINTS, WAITS, IGNORE_REGS };
    const io = { read: a => P.io.read(a), write: (a, v) => P.io.write(a, v) };   // P.io as it stands when a routine runs
    // A byte the NMI handler writes, read by the main program: frame_counter and stars_to_twinkle.
    // In the lockstep the read gets what the game's read got, on a frame the handler fell inside
    // (kit/nes/lockstep.js, irqBytes); on a page it is the byte itself.
    const irq = a => (P.io.irqByte ? P.io.irqByte(a) : M[a]);
    const b = v => v & 0xFF;
    const w = (a, v) => { M[a] = v & 0xFF; };
    // the registers a routine returns; one left undefined is one the routine does not change
    const out = (a, x, y, more) => {
      const o = {};
      if (a !== undefined) { o.a = a & 0xFF; o.n = (a >> 7) & 1; o.z = (a & 0xFF) === 0 ? 1 : 0; }
      if (x !== undefined) o.x = x & 0xFF;
      if (y !== undefined) o.y = y & 0xFF;
      return Object.assign(o, more);
    };
    const PPUCTRL = 0x2000, PPUMASK = 0x2001, PPUSTATUS = 0x2002, OAMADDR = 0x2003, PPUADDR = 0x2006, PPUDATA = 0x2007, OAMDMA = 0x4014, JOY1 = 0x4016, SND_CHN = 0x4015;
    const ppuWrite = (r, v) => io.write(r, v);
    const ppuRead = r => io.read(r);
    const setAddr = (hi, lo) => { io.write(PPUADDR, hi); io.write(PPUADDR, lo); };
    const data = v => io.write(PPUDATA, v);
    const readData = () => io.read(PPUDATA);

    // --- the sound driver, the game's own bytes on the kit's 6502 ($F500-$FBC9 with its tables)
    let cpu = null;
    P.nmi_sound_entry = function (r) {
      if (!cpu) {
        if (!opts.CPU) throw new Error('BalloonFight.create: no CPU for the sound driver (the kit\'s 6502: C64Cpu.CPU)');
        cpu = new opts.CPU(M, { io: { read: a => io.read(a), write: (a, v) => io.write(a, v) }, ...MAP });
      }
      cpu.call(SOUND_FRAME, { a: r ? r.a : 0, x: r ? r.x : 0, y: r ? r.y : 0 }, { maxSteps: 50000 });
      return out(cpu.a, cpu.x, cpu.y);
    };

    // --- the NMI handler ($C094) ---------------------------------------------------------------
    P.nmi = function () {
      io.write(OAMADDR, 0); io.write(OAMDMA, 0x02);
      if (M[V.ppu_queue_read] !== M[V.ppu_queue_write]) P.flush_ppu_queue();
      P.twinkle_stars();
      P.status_bar_update();
      w(V.frame_counter, M[V.frame_counter] + 1);
      setAddr(0x20, 0x00);
      io.write(0x2005, 0); io.write(0x2005, 0);
      P.nmi_sound_entry();
      w(V.frame_flag, 1);
      if (M[V.game_mode]) {
        while (ppuRead(PPUSTATUS) & 0x80);                  // the end of the vertical blank
        // a delay of about 35 lines (4 by 198 turns), then the scroll for the play area: the
        // page draws the band from here with these registers (P.split)
        if (P.onSplit) P.onSplit(3970);
        io.write(PPUCTRL, M[V.trip_nametable] | M[V.ppuctrl_shadow]);
        io.write(0x2005, M[V.trip_scroll_x]); io.write(0x2005, 0);
      }
    };
    P.nmi_off = function () { const a = M[V.ppuctrl_shadow] & 0x7F; io.write(PPUCTRL, a); w(V.ppuctrl_shadow, a); return out(a); };
    P.nmi_on = function () { const a = M[V.ppuctrl_shadow] | 0x80; io.write(PPUCTRL, a); w(V.ppuctrl_shadow, a); return out(a); };

    // --- waits ($F45C-$F4A4, $C10A) ---------------------------------------------------------------
    P.wait_frame = function* () {
      w(V.frame_flag, 0);
      while (M[V.frame_flag] === 0) yield;
      yield C(PASS);
      w(V.frame_flag, M[V.frame_flag] - 1);
    };
    P.wait_x_frames = function* (r) {
      let x = r.x & 0xFF;
      do { yield C(0xF45E); yield* P.wait_frame(); x = b(x - 1); } while (x !== 0);
      return out(0, 0, 0);
    };
    P.wait_20_frames = function* () { return yield* P.wait_x_frames({ x: 0x14 }); };
    P.wait_frame_pause = function* () {
      yield C(0xF470);
      while (M[V.frame_flag] === 0) yield;                   // b_F469: the flag is not cleared first
      yield C(PASS);
      w(V.frame_flag, M[V.frame_flag] - 1);
      if (M[V.demo_flag]) return;
      yield C(0xF477);
      if (!(P.read_joypads().a & 0x10)) return;
      w(V.music_request, 0x04);
      io.write(PPUMASK, M[V.ppumask_shadow] & 0xEF);
      for (;;) {
        yield C(0xF489); yield* P.wait_frame();
        yield C(0xF48C); if (P.read_joypads().a & 0x10) break;
      }
      io.write(PPUMASK, M[V.ppumask_shadow]);
      w(V.music_request, (M[V.no_enemies] | M[V.game_mode]) ? 0x20 : 0x04);
    };
    P.screen_off = function* () { yield C(0xC10D); yield* P.wait_frame(); io.write(PPUMASK, 0); };
    P.screen_on = function* () {
      const a = M[V.ppumask_shadow];
      if (a === 0) return;                                  // bne b_C10C: a shadow of 0 waits for nothing
      yield C(0xC10D); yield* P.wait_frame(); io.write(PPUMASK, a);
    };

    // --- the PPU queue ($C119-$C1C4) -------------------------------------------------------------
    P.queue_text_header = function () {
      let x = M[V.ppu_queue_write];
      const row = M[V.text_row], hi = 0x20 | ((row >> 3) & 3), lo = ((row << 5) & 0xFF) | M[V.text_col];
      w(V.tmp12, (row >> 3) & 3);
      w(V.ppu_queue + x, hi); x = b(x + 1);
      w(V.ppu_queue + x, lo); x = b(x + 1);
      w(V.ppu_queue + x, M[V.text_len]); x = b(x + 1);
      return out(M[V.text_len], x);
    };
    P.queue_text = function () {
      let x = P.queue_text_header().x, y = 0;
      do { w(V.ppu_queue + x, M[V.text_buf + y]); x = b(x + 1); y = b(y + 1); } while (y !== M[V.text_len]);
      w(V.ppu_queue_write, x);
      return out(0, x, y);
    };
    P.queue_block = function (r) {
      const addr = (r.a & 0xFF) | ((r.y & 0xFF) << 8);
      w(V.ptr3, r.a); w(V.ptr3_hi, r.y);
      const count = b(M[(addr + 2) & 0xFFFF] + 3);
      w(V.tmp12, count);
      let x = M[V.ppu_queue_write], y = 0;
      do { w(V.ppu_queue + x, M[(addr + y) & 0xFFFF]); x = b(x + 1); y = b(y + 1); } while (y !== count);
      w(V.ppu_queue_write, x);
      return out(0, r.x, y);
    };
    P.queue_block_from_text = function (r) { return P.queue_block({ a: 0x57, y: 0x00, x: r ? r.x : 0 }); };
    P.flush_ppu_queue = function (r) { P.flush_ppu_queue_loop(); return out(r ? r.y : 0); };   // X and Y kept; A is Y, from the restore
    P.flush_ppu_queue_loop = function () {
      let x = M[V.ppu_queue_read];
      do {
        const first = M[V.ppu_queue + x]; x = b(x + 1);
        w(V.ppu_addr_lo, first); io.write(PPUADDR, first);
        io.write(PPUADDR, M[V.ppu_queue + x]); x = b(x + 1);
        let y = M[V.ppu_queue + x]; x = b(x + 1);
        do { data(M[V.ppu_queue + x]); x = b(x + 1); y = b(y - 1); } while (y !== 0);
        if (first === 0x3F) { setAddr(0x3F, 0x00); setAddr(0x00, 0x00); }
        w(V.ppu_queue_read, x);
      } while (x !== M[V.ppu_queue_write]);
      return out(0, x);
    };

    // --- stars and the status bar, in the NMI ($D5D9-$D65B, $D798-$D870) ---------------------
    P.star_addr = function (r) {
      const x = r.x & 0xFF;
      w(V.ppu_addr_lo, M[V.star_addresses + x]); w(V.ppu_addr_hi, M[V.star_addresses_hi + x]);
      return out(M[V.ppu_addr_hi], x, r.y || 0);
    };
    P.twinkle_stars = function () {
      if (M[V.stars_to_twinkle] === 0) return out(0, 0, 0);
      w(V.stars_to_twinkle, M[V.stars_to_twinkle] - 1);
      const x = (M[V.star_index] + 2) & 0x3F;
      w(V.star_index, x);
      P.star_addr({ x });
      setAddr(M[V.ppu_addr_hi], M[V.ppu_addr_lo]);
      readData(); const a = readData();
      for (let y = 3; y >= 0; y--) if (a === M[V.star_tiles + y]) { P.j_D63B({ y }); break; }
      return out(a, x, 0);
    };
    P.j_D63B = function (r) {
      setAddr(M[V.ppu_addr_hi], M[V.ppu_addr_lo]);
      data(M[V.star_tiles_next + (r.y & 0xFF)]);
    };
    P.draw_stars = function () {
      for (let x = 0; x < 0x80; x += 2) {
        P.star_addr({ x }); P.draw_star_if_blank({ x });
        w(V.ppu_addr_hi, M[V.ppu_addr_hi] | 0x04);
        P.draw_star_if_blank({ x });
      }
      return out(0, 0x80, 0);
    };
    P.draw_star_if_blank = function (r) {
      setAddr(M[V.ppu_addr_hi], M[V.ppu_addr_lo]);
      readData(); const a = readData();
      if (a !== 0x24) return out(a, r.x, 0);
      const y = r.x & 3;
      P.j_D63B({ y });
      return out(a, r.x, y);
    };
    P.status_bar_update = function () {
      const req = M[V.status_request];
      if (req === 0) return;
      if (req === 1) {
        setAddr(0x20, 0x43); data(0x8E);
        for (let x = 4; x >= 0; x--) data(M[V.score_p1 + x]);
        data(0); data(0x24); data(0x24); data(0x8C); data(0x8D);
        for (let x = 4; x >= 0; x--) data(M[V.score_top + x]);
        data(0); data(0x24); data(0x24);
        if (M[V.game_mode]) return P.status_rank();
        if (M[V.two_players]) {
          data(0x8F);
          for (let x = 4; x >= 0; x--) data(M[V.score_p2 + x]);
          data(0);
        }
        w(V.status_request, M[V.status_request] - 1);
        return;
      }
      w(V.status_request, M[V.status_request] - 1);
      setAddr(0x20, 0x62);
      P.draw_lives_or_gameover({ a: M[V.lives] });
      if (M[V.two_players] === 0) return;
      setAddr(0x20, 0x75);
      P.draw_lives_or_gameover({ a: M[V.lives_p2] });
    };
    P.draw_lives_or_gameover = function (r) {
      let a = r.a & 0xFF;
      if (a & 0x80) {
        if (M[V.two_players]) {
          for (let x = 8; x >= 0; x--) data(M[V.gameover_text_rev + x]);
          return out(M[V.gameover_text_rev], 0xFF, r.y || 0);
        }
        a = M[V.two_players];                               // lda two_players: 0, so every cell is blank
      }
      w(V.ppu_addr_lo, a);
      for (let x = 6; x >= 0; x--) data(x >= a ? 0x24 : 0x2A);
      return out(0x24, 0xFF, r.y || 0);
    };
    P.status_rank = function () {
      for (let y = 4; y >= 0; y--) data(M[V.rank_text_rev + y]);
      data(M[V.trip_rank_tens]); data(M[V.trip_rank_units]);
      w(V.status_request, M[V.status_request] - 1);
    };

    // --- the screen builders ($D246-$D5D8) -------------------------------------------------------
    P.fill_nametable = function () {
      for (let i = 0; i < 960; i++) data(0x24);
      for (let i = 0; i < 64; i++) data(0x00);
      return out(0, 0);
    };
    P.clear_screen = function* () {
      yield C(0xD246); yield* P.screen_off();
      yield C(0xD249); P.nmi_off();
      setAddr(0x20, 0x00);
      yield C(0xD256); P.fill_nametable();
      yield C(0xD259); P.fill_nametable();
      yield C(0xD25C); P.nmi_on();
      yield C(0xD25F); yield* P.screen_on();
      w(V.stars_to_twinkle, 0);
      for (let y = 0; y < 256; y += 4) w(V.sprite_table + y, 0xF0);
    };
    P.read_level_byte = function () {
      const p = M[V.ptr1] | (M[V.ptr1_hi] << 8), a = M[p];
      w(V.ptr1, p + 1); if (((p + 1) & 0xFF) === 0) w(V.ptr1_hi, M[V.ptr1_hi] + 1);
      return out(a, undefined, 0);
    };
    P.read_block_byte = function () {
      const p = M[V.ptr2] | (M[V.ptr2_hi] << 8), a = M[p];
      w(V.ptr2, p + 1); if (((p + 1) & 0xFF) === 0) w(V.ptr2_hi, M[V.ptr2_hi] + 1);
      return out(a, undefined, 0);
    };
    P.draw_block_lists = function () {
      for (;;) {
        w(V.ptr2, P.read_level_byte().a);
        const hi = P.read_level_byte().a; w(V.ptr2_hi, hi);
        if (hi === 0) return out(hi, hi, 0);
        for (;;) {
          const x = P.read_block_byte().a;
          if (x === 0) break;
          io.write(PPUADDR, x & 0x7F);
          io.write(PPUADDR, P.read_block_byte().a);
          let n = P.read_block_byte().a; w(V.tmp12, n);
          io.write(PPUCTRL, ((x & 0x80) >> 5) | M[V.ppuctrl_shadow]);
          if (x & 0x40) { const v = P.read_block_byte().a; do { data(v); n = b(n - 1); } while (n !== 0); }
          else do { data(P.read_block_byte().a); n = b(n - 1); } while (n !== 0);
          w(V.tmp12, 0);
        }
      }
    };
    P.set_ppu_addr_from_tile_xy = function () {
      const row = M[V.text_row], hi = 0x20 | ((row >> 3) & 3), lo = ((row << 5) & 0xFF) | M[V.text_col];
      w(V.tmp12, (row << 5) & 0xFF);
      io.write(PPUADDR, hi); w(V.tmp13, hi);
      io.write(PPUADDR, lo);
      return out(lo);
    };
    P.attr_addr_and_quadrant = function () {
      const row = M[V.text_row], col = M[V.text_col];
      w(V.tmp12, ((row & 0xFC) << 1) & 0xFF);
      const a = (col >> 2) | M[V.tmp12] | 0xC0;
      w(V.tmp12, row & 2);
      const y = ((col & 2) >> 1) | M[V.tmp12];
      return out(a, undefined, y);
    };
    P.set_attr_quadrant_palette1 = function () {
      io.write(PPUADDR, 0x23);
      let q = P.attr_addr_and_quadrant();
      io.write(PPUADDR, q.a);
      readData(); const v = (readData() & M[V.attr_quadrant_masks + q.y]) | M[V.attr_quadrant_values + q.y];
      io.write(PPUADDR, 0x23);
      q = P.attr_addr_and_quadrant();
      io.write(PPUADDR, q.a);
      data(v);
      return out(v, undefined, q.y);
    };
    P.advance_platform_ptr = function (r) {
      const s = (r.a & 0xFF) + M[V.platform_count] + 1;
      return out(s, r.x, (r.y & 0xFF) + (s > 0xFF ? 1 : 0), { c: s > 0xFF ? 1 : 0 });
    };
    P.draw_propeller_now = function (r) { const q = P.propeller_draw({ x: r.x, a: r.a, y: r.y }); return Object.assign({}, q, P.flush_ppu_queue(q)); };
    P.load_palette = function () {
      for (let x = 0x22; x >= 0; x--) w(V.text_buf + x, M[V.base_palette + x]);
      if (M[V.no_enemies] === 0) {
        let y = (M[V.phase_index] & 0x0C) | 3;
        for (let x = 3; x >= 0; x--, y--) w(V.text_buf_3 + x, M[V.phase_bg_palettes + y]);
        return P.queue_block_from_text();
      }
      const x = M[V.bonus_round];
      w(V.ptr1, M[V.bonus_palette_ptrs + x]); w(V.ptr1_hi, M[V.bonus_palette_ptrs_hi + x]);
      const p = M[V.ptr1] | (M[V.ptr1_hi] << 8);
      for (let i = 3, y = 7; i >= 0; i--, y--) w(V.bonus_palette + i, M[p + y]);
      if (M[V.game_mode] === 0) for (let y = 3; y >= 0; y--) w(V.text_buf_3 + y, M[p + y]);
      return P.queue_block_from_text();
    };
    P.build_phase_screen = function* () {
      yield C(0xD293); yield* P.screen_off();
      yield C(0xD296); P.nmi_off();
      if (M[V.game_mode]) return yield* P.build_trip_screen();
      const i = M[V.phase_index];
      w(V.ptr1, M[V.phase_layouts + i]); w(V.ptr1_hi, M[V.phase_layouts_hi + i]);
      yield C(0xD2AC); P.draw_block_lists();
      let x = 0;
      for (;;) {                                            // the clouds
        yield C(0xD2B1); const a = P.read_level_byte().a;
        if (a === 0xFF) break;
        w(V.text_col, a);
        yield C(0xD2BA); w(V.text_row, P.read_level_byte().a);
        for (let y = 3; y >= 0; y--) {
          yield C(0xD2C1); P.set_ppu_addr_from_tile_xy();
          w(V.tmp12, 4);
          let t = M[V.cloud_tiles + y];
          do { data(t); t = b(t + 4); w(V.tmp12, M[V.tmp12] - 1); } while (M[V.tmp12] !== 0);
          w(V.text_row, M[V.text_row] + 1);
        }
        w(V.text_row, M[V.text_row] - 4);
        yield C(0xD2E1); w(V.cloud_attr_tl + x, P.attr_addr_and_quadrant().a);
        w(V.text_col, M[V.text_col] + 2);
        yield C(0xD2EA); w(V.cloud_attr_tr + x, P.attr_addr_and_quadrant().a);
        w(V.text_row, M[V.text_row] + 2);
        yield C(0xD2F3); w(V.cloud_attr_br + x, P.attr_addr_and_quadrant().a);
        w(V.text_col, M[V.text_col] - 2);
        yield C(0xD2FC); w(V.cloud_attr_bl + x, P.attr_addr_and_quadrant().a);
        w(V.lightning_cloud, x);
        yield C(0xD305); P.j_C856({ a: 3, x });
        yield C(0xD308); P.flush_ppu_queue();
        x = M[V.lightning_cloud];
        w(V.cloud_x + x, (M[V.text_col] << 3) + 0x10);
        w(V.cloud_y + x, M[V.text_row] << 3);
        x = b(x + 1);
      }
      w(V.cloud_count, b(x - 1));
      x = 0;
      for (;;) {                                            // the propellers
        yield C(0xD327); const a = P.read_level_byte().a;
        if (a === 0xFF) break;
        w(V.text_col, a);
        yield C(0xD330); w(V.text_row, P.read_level_byte().a);
        yield C(0xD335); w(V.propeller_phase + x, P.read_level_byte().a);
        let v = M[V.text_col] << 3; w(V.propeller_x + x, (v & 0xFF) + 0x0C + (v >> 8 & 1));
        v = M[V.text_row] << 3; w(V.propeller_y + x, (v & 0xFF) + 0x0C + (v >> 8 & 1));
        w(V.propeller_spinning + x, 0);
        yield C(0xD354); w(V.propeller_addr_lo + x, P.set_ppu_addr_from_tile_xy().a);
        w(V.propeller_addr_hi + x, M[V.tmp13]);
        yield C(0xD35F); P.draw_propeller_now({ x });
        yield C(0xD362); P.set_attr_quadrant_palette1();
        w(V.text_col, M[V.text_col] + 2);
        yield C(0xD369); P.set_attr_quadrant_palette1();
        w(V.text_row, M[V.text_row] + 2);
        yield C(0xD370); P.set_attr_quadrant_palette1();
        w(V.text_col, M[V.text_col] - 2);
        yield C(0xD377); P.set_attr_quadrant_palette1();
        x = b(x + 1);
      }
      w(V.propeller_count, b(x - 1));
      yield C(0xD382); w(V.ptr2, P.read_level_byte().a);
      yield C(0xD387); w(V.ptr2_hi, P.read_level_byte().a);
      const p = M[V.ptr2] | (M[V.ptr2_hi] << 8);            // the bird list
      let n = M[p];
      if (n === 0) w(V.no_enemies, M[V.no_enemies] + 1);
      else {
        let y = 1;
        for (let k = n - 1; k >= 0; k--) {
          w(V.actor_x_birds + k, M[p + y++]); w(V.actor_y_birds + k, M[p + y++]); w(V.actor_type_birds + k, M[p + y++]);
          w(V.actor_action_birds + k, 2); w(V.actor_balloons_birds + k, 1); w(V.actor_frame_timer_birds + k, M[V.enemy_inflate_rate]);
        }
      }
      yield C(0xD3BA); w(V.platform_count, P.read_level_byte().a);
      yield C(0xD3BF); w(V.platform_left_ptr, P.read_level_byte().a);
      yield C(0xD3C4); let hi = P.read_level_byte().a; w(V.platform_left_ptr_hi, hi);
      let q = { a: M[V.platform_left_ptr], y: hi };
      yield C(0xD3CC); q = P.advance_platform_ptr(q); w(V.platform_right_ptr, q.a); w(V.platform_right_ptr_hi, q.y);
      yield C(0xD3D3); q = P.advance_platform_ptr(q); w(V.platform_top_ptr, q.a); w(V.platform_top_ptr_hi, q.y);
      yield C(0xD3DA); q = P.advance_platform_ptr(q); w(V.platform_bottom_ptr, q.a); w(V.platform_bottom_ptr_hi, q.y);
      yield* P.j_D3E1();
    };
    P.j_D3E1 = function* () {                               // the tail of build_phase_screen, shared with Balloon Trip's
      yield C(0xD3E1); P.draw_stars();
      yield C(0xD3E4); P.load_palette();
      yield C(0xD3E7); P.nmi_on();
      yield* P.screen_on();
    };
    P.write_repeated = function (r) { let x = r.x & 0xFF; do { data(r.a); x = b(x - 1); } while (x !== 0); return out(r.a, 0, r.y || 0); };
    P.write_trip_attrs = function (r) {
      io.write(PPUADDR, r.y); io.write(PPUADDR, r.a);
      for (let x = 0; x < 8; x++) data(M[V.trip_water_attrs + x]);
      P.write_repeated({ a: 0x00, x: 0x28 });
      P.write_repeated({ a: 0xAA, x: 0x10 });
      return out(0xAA, 0, r.y);
    };
    P.write_tile_cycle = function (r) {
      let x = r.x & 0xFF; w(V.tmp12, r.a);
      do { data(((x & 3) ^ 3) | M[V.tmp12]); x = b(x - 1); } while (x !== 0);
      return out(0, 0, r.y || 0);
    };
    P.write_water_rows = function (r) {
      io.write(PPUADDR, r.y); io.write(PPUADDR, r.a);
      P.write_tile_cycle({ a: 0x58, x: 0x20 });
      return P.write_tile_cycle({ a: 0x5C, x: 0x40, y: r.y });
    };
    P.build_trip_screen = function* () {
      yield C(0xD576); P.write_trip_attrs({ a: 0xC0, y: 0x23 });
      yield C(0xD57D); P.write_trip_attrs({ a: 0xC0, y: 0x27 });
      yield C(0xD584); P.write_water_rows({ a: 0x60, y: 0x23 });
      yield C(0xD58B); P.write_water_rows({ a: 0x60, y: 0x27 });
      w(V.no_enemies, M[V.no_enemies] + 1);
      yield* P.j_D3E1();
    };

    // --- the title ($D90F-$DB26) ------------------------------------------------------------------
    P.draw_title_screen = function* () {
      yield C(0xD90F); yield* P.clear_screen();
      yield C(0xD912); yield* P.screen_off();
      yield C(0xD915); yield* P.wait_frame();
      yield C(0xD918); P.nmi_off();
      w(V.ptr1, 0x2C); w(V.ptr1_hi, 0xD9);
      yield C(0xD923); P.draw_block_lists();
      yield C(0xD926); P.nmi_on();
      yield* P.screen_on();
    };
    P.title_loop = function* () {
      for (;;) {
        if (P.onTitle) P.onTitle();
        yield C(0xDAC1); P.nmi_on();
        yield C(0xDAC4); yield* P.draw_title_screen();
        w(V.frame_counter, 0);
        for (;;) {
          yield C(0xDACB); yield* P.wait_frame();
          if (irq(V.frame_counter) === 0) break;              // the demonstration
          yield C(0xDAD2); P.draw_title_cursor();
          yield C(0xDAD5); const a = P.read_joypads().a;
          if (a & 0x10) return out(a, a, 0);
          if (a & 0x20) {
            w(V.frame_counter, 0);
            w(V.title_option, M[V.title_next_option + M[V.title_option]]);
          }
        }
        w(V.demo_flag, M[V.demo_flag] + 1);
        w(V.two_players, M[V.two_players] + 1);
        io.write(SND_CHN, 0);
        w(V.game_mode, 0);
        yield C(0xDAFC); yield* P.start_game({ a: 0 });
        w(V.demo_flag, 0);
      }
    };

    // --- the game ($F1D4-$F386) ------------------------------------------------------------------
    P.main = function* () {
      yield C(0xF1D4); yield* P.title_loop();
      for (let x = 9; x >= 0; x--) w(V.score_p1 + x, 0);
      w(V.scoring_player, 0);
      w(V.lives, M[V.lives] + 1);
      yield C(0xF1E4); P.add_score({ a: 0 });
      io.write(SND_CHN, 0x0F);
      w(V.sfx_request_a, 0x01);
      return yield* P.start_game({ a: 2 });
    };
    // start_game ($F1F2) through phase_start and the loops: 'over' when the game ends, 'demo' when
    // the demonstration does.
    P.start_game = function* (r) {
      w(V.lives, r.a);
      w(V.lives_p2, M[V.two_players] ? r.a : 0xFF);
      w(V.trip_platform_x, 0); w(V.phase_index, 0); w(V.phase_counter, 0); w(V.bonus_round, 0);
      w(V.actor_balloons_p2, 0xFF);
      for (let x = M[V.two_players]; x >= 0; x--) { yield C(0xF20D); P.actor_init_player({ x }); }
      for (;;) {
        const where = yield* P.phase_start();
        let r2;
        if (where === 'trip') return yield* P.trip_start();
        if (where === 'bonus') r2 = yield* P.bonus_round_play();
        else r2 = yield* P.phase_loop();
        if (r2 !== 'cleared') return r2;
      }
    };
    P.phase_start = function* () {
      if (P.onPhaseStart) P.onPhaseStart();                 // a page's level picker sets the phase here
      w(V.no_enemies, 0);
      let a = M[V.phase_counter] >> 2;
      if (a >= 8) a = 8;
      w(V.enemy_inflate_rate, M[V.enemy_inflate_rates + a]);
      w(V.enemy_launch_delay, M[V.enemy_launch_delays + a]);
      if (M[V.phase_counter] < 2) { w(V.enemy_inflate_rate, 3); w(V.enemy_launch_delay, 3); }
      for (let x = 7; x >= 0; x--) {
        for (const k of ['actor_facing', 'actor_hit_cooldown', 'actor_was_hit', 'actor_vx_lo', 'actor_vx_hi', 'actor_vy_lo', 'actor_vy_hi',
          'actor_vx_target_lo', 'actor_vx_target_hi', 'actor_x_frac', 'actor_y_frac']) w(V[k] + x, 0);
        w(V.actor_frame_timer + x, 1); w(V.actor_timer + x, 1); w(V.actor_frame + x, 3);
      }
      for (let x = 5; x >= 0; x--) w(V.actor_balloons_birds + x, 0xFF);
      for (let x = M[V.two_players]; x >= 0; x--) { yield C(0xF278); P.player_place({ x }); }
      yield C(0xF27E); yield* P.clear_screen();
      yield C(0xF281); yield* P.build_phase_screen();
      if (M[V.enemy_inflate_rate] < 0x10) w(V.enemy_inflate_rate, 0x58);
      yield C(0xF28E); P.phase_vars_init();
      yield C(0xF291); P.popups_clear();
      if (M[V.game_mode]) return 'trip';
      if (M[V.no_enemies]) return 'bonus';
      yield C(0xF2A2); P.lightning_init();
      if ((M[V.phase_index] & 3) === 0) {
        w(V.music_request, 0x08);
        if (M[V.demo_flag]) return 'phase';
      }
      w(V.phase_text_timer, 0xFF);
      w(V.phase_counter, M[V.phase_counter] + 1);
      return 'phase';
    };
    P.phase_loop = function* () {
      for (;;) {
        yield C(0xF2B9); yield* P.wait_frame_pause();
        if (M[V.phase_text_timer]) { w(V.phase_text_timer, M[V.phase_text_timer] - 1); yield C(0xF2C2); P.phase_text(); }
        yield C(0xF2C5); P.next_random({ x: 0 });
        yield C(0xF2C8); P.actors_update();
        yield C(0xF2CB); P.fish_update();
        yield C(0xF2CE); P.lightning_countdown();
        yield C(0xF2D1); const fl = P.cloud_flash();
        yield C(0xF2D4); P.sparks_update({ c: fl.c });
        yield C(0xF2D7); P.popups_countdown();
        yield C(0xF2DA); P.draw_splash();
        yield C(0xF2DD); P.propellers_update();
        w(V.stars_to_twinkle, irq(V.stars_to_twinkle) + 1);
        let birds = false;                                  // b_F327 reached from the respawn countdown
        for (let x = M[V.two_players]; x >= 0; x--) {
          if (!(M[V.actor_balloons + x] & 0x80)) continue;
          if (M[V.demo_flag]) return 'demo';
          if (M[V.lives + x] & 0x80) continue;
          w(V.respawn_timer + x, M[V.respawn_timer + x] - 1);
          if (M[V.respawn_timer + x] !== 0) { birds = true; break; }
          yield C(0xF2F6); P.lightning_set_phase();
          w(V.lives + x, M[V.lives + x] - 1);
          w(V.status_request, 2);
          if (M[V.lives + x] & 0x80) continue;
          yield C(0xF303); P.player_place({ x });
          yield C(0xF306); P.actor_init_player({ x });
          w(V.music_request, 0x80);
        }
        if (!birds) {
          if ((M[V.lives] & 0x80) && (M[V.lives_p2] & 0x80)) return yield* P.game_over();
          if (M[V.demo_flag]) {
            yield C(0xF31C); P.read_joypads();
            if ((M[V.joypad] & 0x30) === 0) continue;
            return 'demo';
          }
        }
        let flying = false;
        for (let x = 5; x >= 0; x--) { const v = M[V.actor_balloons_birds + x]; if (v !== 0 && !(v & 0x80)) { flying = true; break; } }
        if (flying) continue;
        if (!(M[V.splash_frame] & 0x80)) continue;
        let again = false;
        for (let x = M[V.two_players]; x >= 0; x--) {
          if (M[V.actor_balloons + x] >= 1 && !(M[V.actor_balloons + x] & 0x80)) continue;
          if (M[V.lives + x] & 0x80) continue;
          w(V.actor_balloons + x, 0xFF); w(V.respawn_timer + x, 1); again = true; break;
        }
        if (again) continue;
        w(V.music_request, 0x02);
        return yield* P.phase_cleared();
      }
    };
    P.phase_cleared = function* () {                       // j_F353: the wait, then the next layout
      yield C(0xF355); yield* P.wait_x_frames({ x: 0x96 });
      let x = b(M[V.phase_index] + 1);
      if (x === 0x10) x = 4;
      w(V.phase_index, x);
      return 'cleared';
    };
    P.game_over = function* () { if (P.onGameOver) P.onGameOver(); w(V.music_request, 0x01); return yield* P.game_over_wait(); };
    P.game_over_wait = function* () {
      w(V.trip_scroll_x, 0); w(V.trip_nametable, 0); w(V.tmp15, 0);
      yield C(0xF372); yield* P.show_game_over();
      for (;;) {
        yield C(0xF375); yield* P.wait_frame();
        yield C(0xF378); if (P.read_joypads().a & 0x30) break;
        w(V.tmp15, M[V.tmp15] - 1);
        if (M[V.tmp15] === 0) break;
      }
      return 'over';
    };
    P.show_game_over = function* () {
      yield C(0xF40B); yield* P.wait_frame();
      for (let x = 1; x >= 0; x--) { yield C(0xF416); P.queue_block({ a: M[V.gameover_block_ptrs + x], y: M[V.gameover_block_ptrs_hi + x], x }); }
      for (let x = 0x0F; x >= 0; x--) w(V.text_buf_3 + x, 0x24);
      w(V.text_buf_2, 0x10); w(V.text_buf, 0x21);
      for (let x = 2; x >= 0; x--) { w(V.text_buf_1, M[V.gameover_rows + x]); yield C(0xF434); P.queue_block_from_text({ x }); }
    };
    P.player_place = function (r) {
      const x = r.x & 0xFF;
      if (M[V.lives + x] & 0x80) return out(M[V.lives + x], x, r.y || 0);
      w(V.actor_x + x, M[V.player_start_x + x]);
      w(V.actor_y + x, 0xB8); w(V.invulnerable + x, 0xB8);
      w(V.invulnerable_timer + x, 0xC8);
      w(V.respawn_timer + x, 0x5A);
      w(V.spark_hit + x, 0); w(V.actor_vx_hi + x, 0); w(V.actor_vx_lo + x, 0);
      return out(0, x, M[V.lives + x]);
    };
    P.actor_init_player = function (r) { w(V.actor_type + r.x, 3); w(V.actor_balloons + r.x, 2); return out(2, r.x, r.y || 0); };
    P.phase_text = function () {
      if (M[V.phase_text_timer] & 0x20) {
        for (let x = 0x0A; x >= 0; x--) w(V.text_buf + x, M[V.phase_text_block + x]);
        w(V.score_add, M[V.phase_counter]);
        w(V.phase_text_tens, P.divide({ y: 0x0A }).a);
        w(V.phase_text_digits, M[V.score_add]);
        return P.queue_block_from_text({ x: 0xFF });
      }
      return P.queue_block({ a: 0x00, y: 0xF4, x: 0 });
    };
    P.phase_vars_init = function () {
      w(V.fish_flags, 1); w(V.fish_flags_2, 1);
      w(V.splash_frame, 0xFF); w(V.fish_state, 0xFF); w(V.fish_caught, 0xFF);
      w(V.fish_type, 1); w(V.fish_balloons, 1);
      w(V.status_request, 2);
      w(V.fish_x, 0x40);
      return out(0x40, 2);
    };

    // --- scores ($D6DC-$D797) --------------------------------------------------------------------
    P.add_score_zero = function (r) { return P.add_score({ a: 0, x: r ? r.x : 0, y: r ? r.y : 0 }); };
    P.add_score = function (r) {
      w(V.score_add, r.a);
      if (M[V.demo_flag]) return;
      let x = M[V.scoring_player];
      if (x >= 2) return;
      if (M[V.lives + x] & 0x80) return;
      let a = P.divide({ y: 0x64 }).a;
      a = b(a + M[V.score_extra_hundreds]);
      w(V.score_add_thousands, a);
      w(V.score_add_hundreds, P.divide({ y: 0x0A }).a);
      w(V.ptr3, M[V.top_score_ptrs + M[V.title_option]]); w(V.ptr3_hi, 0x06);
      const top = M[V.ptr3] | 0x0600;
      x = M[V.scoring_player] * 5;
      let c = 0;
      const digit = (i, add) => { const s = M[V.score_p1 + x + i] + add + c; c = s >= 10 ? 1 : 0; w(V.score_p1 + x + i, c ? s - 10 : s); };
      digit(0, M[V.score_add]); digit(1, M[V.score_add_hundreds]); digit(2, M[V.score_add_thousands]); digit(3, M[V.score_extra_thousands]); digit(4, 0);
      let record = true;
      for (let i = 4; i >= 0; i--) {
        const s = M[V.score_p1 + x + i], t = M[top + i];
        if (s < t) { record = false; break; }
        if (s > t) break;
      }
      if (record) for (let i = 0; i < 5; i++) w(top + i, M[V.score_p1 + x + i]);
      for (let y = 4; y >= 0; y--) w(V.score_top + y, M[top + y]);
      w(V.status_request, M[V.status_request] + 1);
      if (M[V.game_mode]) P.find_trip_rank();
    };
    P.divide = function (r) {
      w(V.tmp12, r.y);
      let x = -1, a = M[V.score_add];
      do { a -= M[V.tmp12]; x++; } while (a >= 0);
      a += M[V.tmp12];
      w(V.score_add, a);
      return out(x, x, r.y, { c: 0 });
    };
    P.mod10 = function (r) { const a = r.a & 0xFF; return a >= 10 ? out(a - 10, r.x, r.y, { c: 1 }) : out(a, r.x, r.y, { c: 0 }); };

    // --- the controllers and the random number ($E768, $F1B3) ------------------------------------
    P.read_joypads = function () { return P.read_joypad_x({ x: 0 }); };
    P.read_joypad_x = function (r) {
      const x = r.x & 1;
      io.write(JOY1, 1); io.write(JOY1, 0);
      let v = M[V.joypad + x];
      for (let i = 0; i < 8; i++) { const p = io.read(JOY1 + x); w(V.tmp12, p); v = b((v << 1) | ((p | (p >> 1)) & 1)); }
      w(V.joypad + x, v);
      const y = M[V.joypad_last + x];
      w(V.joypad_last + x, v);
      return out((y ^ v) & v, x, y);
    };
    P.next_random = function (r) {
      let a = r.x & 0xFF, c = 0, lo = M[V.random], hi = M[V.random_hi];
      for (let x = 11; x > 0; x--) {
        c = lo >> 7; lo = b(lo << 1);
        const c2 = hi >> 7; hi = b((hi << 1) | c); c = c2;
        let t = a >> 7; a = b((a << 1) | c); c = t;
        t = a >> 7; a = b((a << 1) | c); c = t;
        a ^= lo;
        t = a >> 7; a = b((a << 1) | c); c = t;
        a ^= lo;
        a >>= 1; c = a & 1; a >>= 1;
        a = (a ^ 0xFF) & 1;
        a |= lo; lo = a;
      }
      w(V.random, lo); w(V.random_hi, hi);
      return out(lo, r.x, undefined, { c });
    };

    // --- the score popups ($D8DD-$D90E) ----------------------------------------------------------
    P.popups_countdown = function () {
      for (let x = 1; x >= 0; x--) {
        if (M[V.popup_kind + x] & 0x80) continue;
        w(V.popup_timer + x, M[V.popup_timer + x] - 1);
        if (M[V.popup_timer + x]) continue;
        w(V.popup_kind + x, 0xFF);
        const y = x * 8;
        w(V.sprite_popups + y, 0xF0); w(V.sprite_popups_y2 + y, 0xF0);
      }
      return out(0xFF, 0xFF, 0);
    };
    P.popups_clear = function () { for (let x = 1; x >= 0; x--) { w(V.popup_timer + x, 0); w(V.popup_kind + x, 0xFF); } return out(0xFF, 0xFF); };

    // --- the bonus round ($CF13-$D245) -----------------------------------------------------------
    P.set_bonus_round_values = function () {
      const x = M[V.bonus_round];
      w(V.bonus_value, M[V.bonus_values + x]); w(V.balloon_rise_speed, M[V.bonus_rise_speeds + x]);
      w(V.perfect_tens, M[V.perfect_tens_table + x]); w(V.perfect_units, M[V.perfect_units_table + x]);
      if (x < 4) w(V.bonus_round, x + 1);
      w(V.balloons_popped, 0); w(V.balloons_popped_p2, 0);
      return out(0, x);
    };
    P.check_perfect = function (r) {
      const a = b(M[V.balloons_popped] + M[V.balloons_popped_p2]);
      return out(a, r ? r.x : 0, r ? r.y : 0, { c: a >= 0x14 ? 1 : 0, z: a === 0x14 ? 1 : 0, n: ((a - 0x14) >> 7) & 1 });
    };
    P.queue_two_digits = function (r) {
      let a = r.a & 0xFF, y = 0;
      while (a >= 10) { y++; a -= 10; }
      w(V.text_buf_3, y); w(V.text_buf_4, a);
      return P.queue_text();
    };
    P.add_value_to_digits = function (r) {
      const x = r.x & 0xFF;
      for (let y = r.y & 0xFF; y > 0; y--) {
        let a = b(M[V.bonus_value] + M[V.text_buf_2 + x]);
        if (a >= 10) { a -= 10; w(V.text_buf_1 + x, M[V.text_buf_1 + x] + 1); }
        w(V.text_buf_2 + x, a);
        a = M[V.text_buf_1 + x];
        if (a >= 10) { a -= 10; w(V.text_buf + x, M[V.text_buf + x] + 1); w(V.text_buf_1 + x, a); }
      }
      return P.blank_leading_zeros({ x });
    };
    P.blank_leading_zeros = function (r) {
      let x = r.x & 0xFF;
      for (let y = 0; y < 4; y++, x++) {
        const a = M[V.text_buf + x];
        if (a !== 0 && a !== 0x24) break;
        w(V.text_buf + x, 0x24);
      }
      return out(0, x, 0);
    };
    P.count_down_into_score = function (r) {
      const x = r.x & 0xFF;
      const tick = () => {
        let a = M[V.text_buf_2 + x];
        if (a === 0x24) return;
        if (a === 0) {
          a = M[V.text_buf_1 + x];
          if (a === 0x24) return;
          if (a === 0) {
            if (M[V.text_buf + x] === 0x24) return;
            w(V.text_buf_1 + x, 0x0A); w(V.text_buf + x, M[V.text_buf + x] - 1);
          }
          w(V.text_buf_2 + x, 0x0A); w(V.text_buf_1 + x, M[V.text_buf_1 + x] - 1);
        }
        w(V.text_buf_2 + x, M[V.text_buf_2 + x] - 1);
        P.add_score({ a: 0x0A });
      };
      tick();
      return P.blank_leading_zeros({ x });
    };
    P.bonus_show_totals = function () {
      for (let x = 0x1C; x >= 0; x--) w(V.text_buf + x, M[V.bonus_result_text + x]);
      P.add_value_to_digits({ x: 4, y: M[V.balloons_popped] });
      P.add_value_to_digits({ x: 0x12, y: M[V.balloons_popped_p2] });
      P.queue_block_from_text();
      if (M[V.two_players]) P.queue_block({ a: 0x65, y: 0x00 });
    };
    P.bonus_round_play = function* () {
      w(V.music_request, 0x20);
      yield C(0xCF17); P.set_bonus_round_values();
      yield C(0xCF1A); P.balloons_clear();
      for (let x = M[V.two_players]; x >= 0; x--) { if (M[V.lives + x] & 0x80) continue; yield C(0xCF23); P.actor_init_player({ x }); }
      w(V.invulnerable, 0); w(V.invulnerable_p2, 0);
      w(V.balloons_to_launch, 0x14);
      for (;;) {
        yield C(0xCF34); yield* P.wait_frame_pause();
        w(V.stars_to_twinkle, irq(V.stars_to_twinkle) + 1);
        yield C(0xCF39); P.popups_countdown();
        yield C(0xCF3C); const upd = P.actors_update();
        if (M[V.balloons_to_launch]) { yield C(0xCF44); P.balloon_spawn({ c: upd.c }); }
        yield C(0xCF47); P.balloons_update();
        if (M[V.balloons_to_launch]) continue;
        let up = false;
        for (let x = 9; x >= 0; x--) if (!(M[V.balloon_state + x] & 0x80)) { up = true; break; }
        if (up) continue;
        if (irq(V.frame_counter)) continue;
        break;
      }
      yield C(0xCF5D); yield* P.clear_screen();
      w(V.status_request, 2);
      yield C(0xCF64); yield* P.wait_x_frames({ x: 2 });
      yield C(0xCF6B); P.queue_block({ a: 0x2B, y: 0xD1 });
      yield C(0xCF72); P.queue_block({ a: 0x5A, y: 0xD1 });
      yield C(0xCF79); P.queue_block({ a: 0x65, y: 0xD1 });
      for (let x = M[V.two_players]; x >= 0; x--) {
        w(V.actor_x + x, 0x20); w(V.actor_y + x, M[V.bonus_player_y + x]);
        w(V.actor_action + x, 3); w(V.actor_facing + x, 1);
        yield C(0xCF90); P.actor_init_player({ x });
        yield C(0xCF93); P.draw_actor({ x });
      }
      w(V.balloon_x, 0x44); w(V.balloon_x_1, 0x44);
      w(V.balloon_y, 0x54); w(V.balloon_y_1, 0x74);
      w(V.balloon_state, 1); w(V.balloon_state_1, 1);
      for (let x = M[V.two_players]; x >= 0; x--) { yield C(0xCFB5); P.balloon_draw({ x }); }
      yield C(0xCFBB); yield* P.wait_20_frames();
      w(V.text_buf, 0x2B); w(V.text_buf_1, 0x24); w(V.text_buf_2, 0x24);
      w(V.text_col, 0x0C); w(V.text_row, 0x0B); w(V.text_len, 0x05);
      yield C(0xCFD7); P.queue_two_digits({ a: M[V.balloons_popped] });
      if (M[V.two_players]) { w(V.text_row, 0x0F); yield C(0xCFE5); P.queue_two_digits({ a: M[V.balloons_popped_p2] }); }
      yield C(0xCFE8); yield* P.wait_20_frames();
      w(V.text_buf, M[V.bonus_value]); w(V.text_buf_1, 0); w(V.text_buf_2, 0);
      w(V.text_col, 0x08); w(V.text_row, 0x0B); w(V.text_len, 0x03);
      yield C(0xD005); P.queue_text();
      if (M[V.two_players]) { w(V.text_row, 0x0F); yield C(0xD010); P.queue_text(); }
      w(V.balloon_state, 0xFF); w(V.balloon_state_1, 0xFF);
      for (let x = M[V.two_players]; x >= 0; x--) { yield C(0xD01D); P.balloon_draw({ x }); }
      w(V.sfx_request_a, 0x02);
      yield C(0xD029); yield* P.wait_x_frames({ x: 2 });
      for (let x = M[V.two_players]; x >= 0; x--) { yield C(0xD02E); P.balloon_draw({ x }); }
      yield C(0xD034); P.bonus_show_totals();
      yield C(0xD037); yield* P.wait_20_frames();
      w(V.sfx_request_a, 0x01);
      yield C(0xD03E);
      if (P.check_perfect().z) {
        yield C(0xD047); P.queue_block({ a: 0x70, y: 0xD1 });
        yield C(0xD04A); yield* P.wait_frame();
        for (let x = 0x1A; x >= 0; x--) w(V.text_buf + x, M[V.super_bonus_text + x]);
        w(V.super_bonus_digits, M[V.perfect_tens]); w(V.super_bonus_units, M[V.perfect_units]);
        yield C(0xD061); P.queue_block_from_text();
        w(V.music_request, 0x10);
      }
      yield C(0xD06A); yield* P.wait_x_frames({ x: 0x78 });
      yield C(0xD06D); P.bonus_show_totals();
      for (;;) {
        w(V.scoring_player, 0);
        yield C(0xD076); P.count_down_into_score({ x: 4 });
        yield C(0xD079); P.queue_block_from_text();
        if (M[V.two_players]) {
          w(V.scoring_player, M[V.scoring_player] + 1);
          yield C(0xD084); P.count_down_into_score({ x: 0x12 });
          yield C(0xD08B); P.queue_block({ a: 0x65, y: 0x00 });
        }
        w(V.sfx_request_b, 0x01);
        yield C(0xD094); yield* P.wait_x_frames({ x: 2 });
        if (M[V.text_buf_6] !== 0x24) continue;
        if (M[V.two_players] && M[V.bonus_total_p2] !== 0x24) continue;
        break;
      }
      yield C(0xD0AA); yield* P.wait_x_frames({ x: 0x0A });
      yield C(0xD0AD);
      if (P.check_perfect().z) {
        w(V.score_extra_thousands, M[V.perfect_tens]); w(V.score_extra_hundreds, M[V.perfect_units]);
        w(V.scoring_player, M[V.two_players]);
        do { yield C(0xD0C0); P.add_score_zero(); w(V.scoring_player, M[V.scoring_player] - 1); } while (!(M[V.scoring_player] & 0x80));
        w(V.sfx_request_b, 0x01);
        yield C(0xD0CB); yield* P.wait_20_frames();
      }
      w(V.score_extra_thousands, 0); w(V.score_extra_hundreds, 0);
      for (let x = 1; x >= 0; x--) if (M[V.lives + x] & 0x80) w(V.actor_balloons + x, M[V.lives + x]);
      return yield* P.phase_cleared();
    };

    // --- Balloon Trip ($C1C5-$C526) ---------------------------------------------------------------
    P.trip_start = function* () {
      w(V.music_request, 0x20);
      yield C(0xC1C9); P.set_balloon_value();
      yield C(0xC1CC); P.find_trip_rank();
      w(V.platform_count, 0xFF);
      w(V.platform_left_ptr, 0xAD); w(V.platform_left_ptr_hi, 0xC4);
      w(V.actor_x, 0x80); w(V.trip_platform_x, 0x80);
      w(V.actor_y, 0x70);
      yield C(0xC1E6); P.balloons_clear();
      w(V.lives, 0); w(V.trip_progress, 0); w(V.trip_difficulty, 0); w(V.spark_speed_level, 0); w(V.trip_scroll_pause, 0); w(V.no_enemies, 0);
      yield C(0xC1F7); P.phase_vars_init();
      for (let x = 0x13; x >= 0; x--) { w(V.spark_state + x, 0xFF); w(V.spark_y + x, 0xF0); }
      return yield* P.trip_loop();
    };
    P.trip_loop = function* () {
      for (;;) {
        yield C(0xC209); yield* P.wait_frame_pause();
        yield C(0xC20C); P.actors_update();
        if (M[V.trip_scroll_pause] === 0) { yield C(0xC213); P.fish_update(); }
        scroll: if (irq(V.frame_counter) & 1) {
          if (M[V.trip_scroll_pause]) { w(V.trip_scroll_pause, M[V.trip_scroll_pause] - 1); break scroll; }
          if (M[V.trip_scroll_x] === 0) w(V.trip_nametable, M[V.trip_nametable] ^ 1);
          w(V.trip_scroll_x, M[V.trip_scroll_x] - 1);
          if (M[V.trip_platform_x]) {
            w(V.trip_platform_x, M[V.trip_platform_x] + 1);
            if (M[V.trip_platform_x] >= 0xF0) w(V.trip_platform_x, 0);
            if (M[V.invulnerable]) w(V.actor_x, M[V.actor_x] + 1);
          }
          for (let x = 7; x >= 0; x--) {
            if (M[V.balloon_state + x] & 0x80) continue;
            w(V.balloon_x + x, M[V.balloon_x + x] + 1);
            if (M[V.balloon_x + x] !== 0xF8) continue;
            w(V.balloon_state + x, 0xFF); w(V.balloon_y + x, 0xF0); w(V.balloons_popped_p2, 0);
          }
          for (let x = 0x13; x >= 0; x--) {
            if (M[V.spark_state + x] & 0x80) continue;
            w(V.spark_x + x, M[V.spark_x + x] + 1);
            if (M[V.spark_x + x] < 0xF8) continue;
            w(V.spark_y + x, 0xF0); w(V.spark_state + x, 0xF0);
          }
          if (M[V.trip_scroll_x] & 7) break scroll;
          if (M[V.actor_balloons] === 0 || (M[V.actor_balloons] & 0x80)) break scroll;   // dex; bmi: balloons 0 or $FF
          w(V.scoring_player, 0);
          yield C(0xC29D); P.add_score({ a: 1 });
          w(V.trip_progress, M[V.trip_progress] + 1);
          if ((M[V.trip_progress] & 0x1F) === 0) {
            w(V.trip_difficulty, M[V.trip_difficulty] + 1);
            if (M[V.trip_difficulty] === 0x0A) {
              w(V.trip_difficulty, 2);
              w(V.spark_speed_level, (M[V.spark_speed_level] + 1) & 3);
            }
          }
          const y = M[V.trip_handler_order + M[V.trip_difficulty]] << 1;
          w(V.platform_right_ptr, M[V.trip_handlers + y]); w(V.platform_right_ptr_hi, M[V.trip_handlers_hi + y]);
          yield C(0xC2CD); P.jmp_trip_handler();
        }
        for (let x = 7; x >= 0; x--) {
          if (!(M[V.balloon_state + x] & 0x80)) {
            yield C(0xC2D7); P.balloon_hit_players({ x });
            if (M[V.balloons_popped]) {
              w(V.balloons_popped, M[V.balloons_popped] - 1);
              w(V.balloons_popped_p2, M[V.balloons_popped_p2] + 1);
              yield C(0xC2EA); P.add_score({ a: M[V.bonus_value] });
            }
          }
          yield C(0xC2EF); P.balloon_draw({ x });
        }
        for (let x = 0x13; x >= 0; x--) {
          if (!(M[V.spark_state + x] & 0x80)) {
            if (M[V.trip_scroll_pause] === 0) {
              yield C(0xC300); P.spark_move({ x });
              let a = M[V.spark_y + x];
              if (a < 2) { yield C(0xC30A); a = P.spark_flip_vy_sound({ x, a }).a; }
              if (a >= 0xD8) { yield C(0xC311); P.spark_flip_vy_sound({ x, a }); }
            }
            yield C(0xC314); P.spark_hit_players({ x });
          }
          const tile = M[V.spark_tiles + ((irq(V.frame_counter) & 7) >> 1)];
          let slot = x;
          if (irq(V.frame_counter) & 1) { w(V.tmp12, x); slot = b(0x13 - x); }
          const y = b(slot << 2);
          w(V.sprite_sparks_tile + y, tile);
          w(V.sprite_sparks + y, M[V.spark_y + x]); w(V.sprite_sparks_x + y, M[V.spark_x + x]); w(V.sprite_sparks_attr + y, 0);
        }
        if (M[V.balloons_popped_p2] >= 0x14) {
          w(V.score_extra_thousands, M[V.score_extra_thousands] + 1);
          yield C(0xC353); P.add_score({ a: 0 });
          w(V.score_extra_thousands, M[V.score_extra_thousands] - 1);
          w(V.music_request, 0x10);
          w(V.no_enemies, M[V.no_enemies] + 1);
          yield C(0xC35E); P.load_palette();
          yield C(0xC361); P.set_balloon_value();
          w(V.no_enemies, M[V.no_enemies] - 1);
          yield C(0xC368); yield* P.wait_x_frames({ x: 0x64 });
          w(V.music_request, 0x20);
        }
        const px = M[V.trip_platform_x], y0 = px ? 0x88 : 0xF0;
        w(V.sprite_table, y0); w(V.sprite_y_1, y0);
        w(V.sprite_x_0, px); w(V.sprite_x_1, px + 8);
        w(V.sprite_attr_0, irq(V.frame_counter) & 3); w(V.sprite_attr_1, irq(V.frame_counter) & 3);
        w(V.sprite_tile_0, 0xE3); w(V.sprite_tile_1, 0xE4);
        if (!(M[V.actor_balloons] & 0x80)) continue;
        yield C(0xC3A1); P.insert_trip_rank();
        w(V.sfx_request_a, 0x01);
        yield C(0xC3A8); yield* P.wait_frame();
        w(V.music_request, 0x02);
        return yield* P.game_over_wait();
      }
    };
    P.jmp_trip_handler = function () {
      const a = M[V.platform_right_ptr] | (M[V.platform_right_ptr_hi] << 8);
      const name = { 0xC3C9: 'trip_stream_reader', 0xC3F7: 'trip_gen_balloon_and_sparks', 0xC43E: 'trip_gen_rare_bubble', 0xC45F: 'trip_gen_sparks_only', 0xC45E: 'trip_gen_nothing' }[a];
      if (!name) throw new Error('jmp_trip_handler: no generator at $' + a.toString(16));
      return P[name]({});
    };
    P.trip_stream_reader = function () {
      for (;;) {
        const p = M[V.platform_left_ptr] | (M[V.platform_left_ptr_hi] << 8), x = M[p];
        w(V.platform_left_ptr, p + 1); if (((p + 1) & 0xFF) === 0) w(V.platform_left_ptr_hi, M[V.platform_left_ptr_hi] + 1);
        if (x === 0) return out(0, 0, 0);
        w(V.tmp15, (x << 3) & 0xFF); w(V.tmp14, 0);
        const k = x & 0xC0;
        if (k === 0x80) P.trip_spawn_balloon();
        else if (k === 0) P.trip_spawn_spark();
        else return out(k, x, 0);
      }
    };
    P.trip_gen_balloon_and_sparks = function () {
      let a = P.next_random({ x: 0 }).a & 0x7F;
      if (a >= 4 && a < 0x18) { w(V.tmp15, (a << 3) & 0xFF); P.trip_spawn_balloon(); }
      return P.trip_gen_sparks();
    };
    P.trip_gen_sparks = function () {
      for (;;) {
        let a = P.next_random({ x: 0 }).a & 0x3F;
        if (a < 2 || a >= 0x18) return out(a, 0, 0);
        w(V.tmp15, (a << 3) & 0xFF);
        const q = P.next_random({ x: 0 });
        w(V.tmp14, (q.a & 0x3F) + M[V.trip_spark_speeds + M[V.spark_speed_level]] + q.c);
        const x = P.trip_spawn_spark().x;
        a = P.next_random({ x }).a;
        if (a & 1) P.spark_flip_vy_sound({ x });
      }
    };
    P.trip_gen_rare_bubble = function () {
      const a = P.next_random({ x: 0 }).a;
      if ((a & 0xCF) === 0 && M[V.actor_balloons_p2] === 0xFF) {
        w(V.actor_y_p2, 0xE6);
        w(V.actor_x_p2, (M[V.random] & 0x7F) + 0x40);
        w(V.actor_balloons_p2, 0x80); w(V.actor_action_p2, 0);
        return out(0, 0, 0);
      }
      return P.trip_gen_balloon_and_sparks();
    };
    P.trip_gen_nothing = function () {};
    P.trip_gen_sparks_only = function () {
      const r = P.trip_gen_sparks();
      const a = P.next_random({ x: r.x }).a & 0x7F;
      w(V.spark_vx_lo + r.x, a);
      return out(a, r.x, 0);
    };
    P.trip_spawn_balloon = function () {
      for (let x = 7; x >= 0; x--) {
        if (!(M[V.balloon_state + x] & 0x80)) continue;
        w(V.balloon_state + x, 1); w(V.balloon_x + x, 0); w(V.balloon_y + x, M[V.tmp15]);
        return out(M[V.tmp15], x, 0);
      }
      return out(0, 0xFF, 0);
    };
    P.trip_spawn_spark = function () {
      for (let x = 0x13; x >= 0; x--) {
        if (!(M[V.spark_state + x] & 0x80)) continue;
        w(V.spark_state + x, 0); w(V.spark_x + x, 0); w(V.spark_vy_hi + x, 0); w(V.spark_vx_lo + x, 0); w(V.spark_vx_hi + x, 0);
        w(V.spark_vy_lo + x, M[V.tmp14]); w(V.spark_y + x, M[V.tmp15]);
        return out(M[V.tmp15], x, 0);
      }
      return out(0, 0xFF, 0);
    };

    // --- the actors ($E691-$F1B2) ----------------------------------------------------------------
    const sbyte = v => (v & 0x80) ? v - 256 : v;
    const neg = v => (-v) & 0xFF;
    P.abs = function (r) { const a = r.a & 0xFF; return out((a & 0x80) ? neg(a) : a); };
    const absv = a => (a & 0x80) ? neg(a) : (a & 0xFF);
    // Y's velocity minus X's, as the game compares them: A the high byte, with N and C
    const diff = (lo, hi, x, y) => {
      const bl = M[lo + y] < M[lo + x] ? 1 : 0, h = M[hi + y] - M[hi + x] - bl;
      return out(h & 0xFF, undefined, undefined, { c: h >= 0 ? 1 : 0 });
    };
    P.vx_diff = function (r) { return diff(V.actor_vx_lo, V.actor_vx_hi, r.x & 0xFF, r.y & 0xFF); };
    P.vy_diff = function (r) { return diff(V.actor_vy_lo, V.actor_vy_hi, r.x & 0xFF, r.y & 0xFF); };
    P.swap_xy = function (r) { w(V.tmp12, r.x); w(V.tmp13, r.y); return out(undefined, r.y, r.x); };
    P.both_birds_flying = function (r) {
      const x = r.x & 0xFF, y = r.y & 0xFF;
      if (x < 2) return out(undefined, undefined, undefined, { c: 0 });
      if (M[V.actor_action + x] < 2) return out(M[V.actor_action + x], undefined, undefined, { c: 0 });
      if (M[V.actor_balloons + x] <= 1) return out(1, undefined, undefined, { c: 1 });
      if (y < 2) return out(1, undefined, undefined, { c: 0 });
      if (M[V.actor_action + y] < 2) return out(M[V.actor_action + y], undefined, undefined, { c: 0 });
      return out(1, undefined, undefined, { c: M[V.actor_balloons + y] <= 1 ? 1 : 0 });
    };
    const neg16 = (lo, hi, x) => { const l = neg(M[lo + x]); w(hi + x, (0 - M[hi + x] - (M[lo + x] ? 1 : 0)) & 0xFF); w(lo + x, l); };
    P.negate_vx = function (r) {
      const x = r.x & 0xFF;
      neg16(V.actor_vx_lo, V.actor_vx_hi, x); neg16(V.actor_vx_target_lo, V.actor_vx_target_hi, x);
      w(V.buttons + x, M[V.buttons + x] & 0x40);
      return out(M[V.buttons + x]);
    };
    P.negate_vy = function (r) { neg16(V.actor_vy_lo, V.actor_vy_hi, r.x & 0xFF); return out(M[V.actor_vy_hi + (r.x & 0xFF)]); };
    P.multiply_unsigned = function () {
      w(V.mul_result, 0); w(V.mul_result_mid, 0); w(V.mul_result_hi, 0);
      for (let i = 0; i < 8; i++) {
        let res = (M[V.mul_result_hi] << 16) | (M[V.mul_result_mid] << 8) | M[V.mul_result];
        res = (res << 1) & 0xFFFFFF;
        const c = M[V.mul_b] >> 7; w(V.mul_b, M[V.mul_b] << 1);
        if (c) res = (res + ((M[V.mul_a_hi] << 8) | M[V.mul_a])) & 0xFFFFFF;
        w(V.mul_result, res); w(V.mul_result_mid, res >> 8); w(V.mul_result_hi, res >> 16);
      }
      return out(M[V.mul_result_hi]);
    };
    P.multiply_signed = function (r) {
      w(V.mul_b, r.a);
      if (!(M[V.mul_a_hi] & 0x80)) return P.multiply_unsigned();
      neg16(V.mul_a, V.mul_a_hi, 0);
      P.multiply_unsigned();
      const res = (0x1000000 - ((M[V.mul_result_hi] << 16) | (M[V.mul_result_mid] << 8) | M[V.mul_result])) & 0xFFFFFF;
      w(V.mul_result, res); w(V.mul_result_mid, res >> 8); w(V.mul_result_hi, res >> 16);
      return out(M[V.mul_result_hi]);
    };
    const scale80 = (lo, hi, x) => {
      w(V.mul_a, M[lo + x]); w(V.mul_a_hi, M[hi + x]);
      P.multiply_signed({ a: 0xCD });
      w(lo + x, M[V.mul_result_mid]); w(hi + x, M[V.mul_result_hi]);
      return out(M[V.mul_result_hi]);
    };
    P.scale_vx_80pct = function (r) { return scale80(V.actor_vx_lo, V.actor_vx_hi, r.x & 0xFF); };
    P.scale_vy_80pct = function (r) { return scale80(V.actor_vy_lo, V.actor_vy_hi, r.x & 0xFF); };
    P.shift_right_4 = function () {
      let v = sbyte(M[V.tmp13]) * 256 + M[V.tmp12];
      v >>= 4;
      w(V.tmp12, v); w(V.tmp13, v >> 8);
      return out(M[V.tmp13] << 1, undefined, 0);
    };
    P.actor_move_x = function (r) {
      const x = r.x & 0xFF, s = M[V.actor_x_frac + x] + M[V.actor_vx_lo + x];
      w(V.actor_x_frac + x, s);
      w(V.actor_x + x, M[V.actor_x + x] + M[V.actor_vx_hi + x] + (s > 0xFF ? 1 : 0));
      return out(M[V.actor_x + x]);
    };
    P.actor_move_y = function (r) {
      const x = r.x & 0xFF, s = M[V.actor_y_frac + x] + M[V.actor_vy_lo + x];
      w(V.actor_y_frac + x, s);
      w(V.actor_y + x, M[V.actor_y + x] + M[V.actor_vy_hi + x] + (s > 0xFF ? 1 : 0));
      return out(M[V.actor_y + x]);
    };
    P.actor_move_x_yreg = function (r) { P.swap_xy(r); const q = P.actor_move_x({ x: r.y }); return Object.assign(q, P.swap_xy({ x: r.y, y: r.x })); };
    P.actor_move_y_yreg = function (r) { P.swap_xy(r); const q = P.actor_move_y({ x: r.y }); return Object.assign(q, P.swap_xy({ x: r.y, y: r.x })); };
    P.actor_sway = function (r) {
      const x = r.x & 0xFF;
      w(V.tmp12, M[V.actor_vx_lo + x]); w(V.tmp13, M[V.actor_vx_hi + x]);
      P.shift_right_4();
      let s = M[V.actor_vx_target_lo + x] + M[V.tmp12];
      w(V.actor_vx_target_lo + x, s); w(V.tmp12, s);
      s = M[V.actor_vx_target_hi + x] + M[V.tmp13] + (s > 0xFF ? 1 : 0);
      w(V.actor_vx_target_hi + x, s); w(V.tmp13, s);
      P.shift_right_4();
      s = M[V.actor_vx_lo + x] - M[V.tmp12];
      w(V.actor_vx_lo + x, s);
      w(V.actor_vx_hi + x, M[V.actor_vx_hi + x] - M[V.tmp13] - (s < 0 ? 1 : 0));
      return out(M[V.actor_vx_hi + x]);
    };
    P.steer_actor = function (r) {
      const x = r.x & 0xFF;
      if (x < 2) {
        if ((irq(V.frame_counter) & 0x0F) === 0) w(V.buttons + x, P.next_random({ x }).a);
        if (!M[V.demo_flag]) {
          P.read_joypad_x({ x });
          w(V.buttons + x, M[V.joypad + x]);
          return out(M[V.buttons + x]);
        }
        // the demonstration: a player is steered like a bird, from here on
      }
      if (M[V.actor_y + x] >= 0xA0) { w(V.buttons + x, M[V.buttons + x] | 0x40); return out(M[V.buttons + x]); }
      w(V.actor_timer + x, M[V.actor_timer + x] - 1);
      if (M[V.actor_timer + x]) return out(M[V.actor_timer + x]);
      const q = P.next_random({ x }), t = M[V.actor_type + x];
      w(V.actor_timer + x, (q.a & M[V.bird_decision_masks + t]) + M[V.bird_decision_bases + t] + q.c);
      w(V.tmp12, x);
      const y = ((irq(V.frame_counter) >> 7) ^ x) & 1;
      let chase = true;
      if (M[V.actor_balloons + y] & 0x80) chase = false;
      else if (M[V.invulnerable + y]) chase = false;
      if (chase) {
        w(V.buttons + x, 0);
        if (((M[V.actor_y + y] - 4) & 0xFF) < M[V.actor_y + x]) w(V.buttons + x, 0x40);
      } else w(V.buttons + x, 0x40);
      if (M[V.actor_x + x] >= M[V.actor_x + y]) w(V.buttons + x, M[V.buttons + x] | 0x02);
      else w(V.buttons + x, M[V.buttons + x] | 0x01);
      return out(M[V.buttons + x], undefined, y);
    };
    P.actor_move_control = function (r) {
      const x = r.x & 0xFF, A = V.actor_action + x, B = V.buttons + x, F = V.actor_facing + x;
      const a = M[V.actor_balloons + x];
      if (a === 0) { w(V.actor_vx_lo + x, 0); w(V.actor_vx_hi + x, 0); return out(0); }
      if (a !== 2 && x >= 2) {
        if (M[A] >= 2) { w(V.actor_vx_lo + x, 0); w(V.actor_vx_hi + x, 0); return out(0); }
        return P.actor_sway({ x });
      }
      if (M[A] >= 6) return out(M[A]);
      if (M[A] === 4) {                                       // skidding: turning round against the stick
        if (M[B] & 2) { if (M[F]) w(A, 5); }
        else if ((M[B] & 1) && !M[F]) w(A, 5);
      }
      if (M[A] === 2) {                                       // running: the stick against the facing, or let go
        let v = -1;
        if (M[B] & 2) v = 0; else if (M[B] & 1) v = 1;
        if (v < 0 || v !== M[F]) w(A, 4);
      }
      if (M[A] >= 4) {                                        // skidding or turning: the stick with the facing runs again
        if (M[B] & 2) { if (!M[F]) w(A, 2); }
        else if ((M[B] & 1) && M[F]) w(A, 2);
      }
      if (M[A] === 3 && (M[B] & 3)) w(A, 2);                 // standing: the stick runs
      if (M[A] < 4) { if (M[B] & 2) w(F, 0); else if (M[B] & 1) w(F, 1); }
      const t = M[V.actor_type + x];
      const addVx = (d) => { const s = M[V.actor_vx_lo + x] + d; w(V.actor_vx_lo + x, s); w(V.actor_vx_hi + x, M[V.actor_vx_hi + x] + (s > 0xFF ? 1 : 0)); };
      const subVx = (d) => { const s = M[V.actor_vx_lo + x] - d; w(V.actor_vx_lo + x, s); w(V.actor_vx_hi + x, M[V.actor_vx_hi + x] - (s < 0 ? 1 : 0)); };
      if (M[A] >= 4 && M[V.actor_frame + x] === 1) {
        if (M[F]) subVx(M[V.air_accel + t]); else addVx(M[V.air_accel + t]);
      } else if (M[A] === 0 || M[A] === 3) {
        if (M[V.actor_frame + x] === 1) {
          if (M[B] & 2) subVx(M[V.run_accel + t]); else if (M[B] & 1) addVx(M[V.run_accel + t]);
        }
      } else if (M[A] === 2) {
        if (M[V.actor_frame + x] === 1) {
          let moved = false;
          if (M[B] & 2) { subVx(M[V.air_accel + t]); moved = true; } else if (M[B] & 1) { addVx(M[V.air_accel + t]); moved = true; }
          if (moved && (M[B] & 3) && x < 2) w(V.sfx_request_a, M[V.sfx_request_a] | 0x08);
        }
      }
      if (M[A] < 4) return out(M[A]);
      if (!M[F]) { if (M[V.actor_vx_hi + x] & 0x80) return out(M[V.actor_vx_hi + x]); }
      else if (!(M[V.actor_vx_hi + x] & 0x80)) return out(M[V.actor_vx_hi + x]);
      if (M[A] === 5) w(F, M[F] ^ 1);
      w(A, 3); w(V.actor_vx_lo + x, 0); w(V.actor_vx_hi + x, 0);
      return out(0);
    };
    P.actor_ground_state = function (r) {
      const x = r.x & 0xFF, A = V.actor_action + x;
      let landed = M[V.landed_flag] !== 0;
      if (!landed && M[V.invulnerable + x] && M[V.trip_platform_x]) {
        if (absv(M[V.trip_platform_x] - M[V.actor_x + x]) < 5) landed = true;
      }
      if (!landed) {
        if (x >= 2 && M[V.actor_balloons + x] !== 2) return out(M[V.actor_balloons + x]);
        if (M[A] < 2 || M[A] >= 6) return out(M[A]);
        w(A, 1); w(V.actor_timer + x, 1);
        return out(1);
      }
      w(V.actor_vy_lo + x, 0); w(V.actor_vy_hi + x, 0); w(V.actor_y_frac + x, 0); w(V.landed_flag, 0);
      if (x >= 2) {
        const b2 = M[V.actor_balloons + x];
        if (b2 === 2) { w(A, 0); w(V.actor_timer + x, 1); return out(1); }
        if (b2 !== 1) return out(b2);
        if (M[A] >= 2) return out(M[A]);
        w(A, 2); w(V.actor_frame_timer + x, M[V.enemy_inflate_rate]);
        w(V.actor_vx_lo + x, 0); w(V.actor_vx_hi + x, 0); w(V.actor_vx_target_lo + x, 0); w(V.actor_vx_target_hi + x, 0);
        w(V.sfx_request_b, 0x40);
        return out(0x40);
      }
      if (M[A] !== 1) return out(M[A]);
      w(A, (M[V.actor_vx_lo + x] | M[V.actor_vx_hi + x]) ? 2 : 3);
      return out(M[A]);
    };
    P.actor_animate = function (r) {
      const x = r.x & 0xFF, A = V.actor_action + x, F = V.actor_frame + x, fc = irq(V.frame_counter);
      let step;
      if (x < 2) {
        if (M[V.invulnerable + x]) step = true;
        else if (M[A] === 1 || M[A] === 3) step = (fc & 7) === 0;
        else step = true;
      } else if (M[A] === 1) step = (fc & 7) === 0;
      else if (M[A] < 3) step = true;
      else step = (fc & 3) === 0;
      if (step) w(F, M[F] + 1);
      w(F, M[F] & 3);
      if (M[F] === 0 && M[A] === 0) w(A, 1);
      return out(M[F] ? M[F] : M[A]);
    };
    P.actor_physics = function (r) {
      const x = r.x & 0xFF, A = V.actor_action + x;
      if (M[V.actor_hit_cooldown + x]) w(V.actor_hit_cooldown + x, M[V.actor_hit_cooldown + x] - 1);
      if (x < 2 && M[V.spark_hit + x]) {
        if (!(irq(V.frame_counter) & 1)) return out(irq(V.frame_counter) >> 1);
        w(V.actor_frame + x, (M[V.actor_frame + x] + 1) & 3);
        w(A, 1);
        w(V.actor_timer + x, M[V.actor_timer + x] - 1);
        if (M[V.actor_timer + x]) return out(1);
        w(V.spark_hit + x, 0); w(A, 0); w(V.sfx_request_a, 0x20);
        return out(0x20);
      }
      const t = M[V.actor_type + x];
      const s = M[V.actor_vy_lo + x] + M[V.gravity_by_type + t];
      w(V.actor_vy_lo + x, s); if (s > 0xFF) w(V.actor_vy_hi + x, M[V.actor_vy_hi + x] + 1);
      const clamp = (lo, hi, maxLo, maxHi, down) => {
        const h = M[hi + x], mh = M[maxHi + t], ml = M[maxLo + t];
        if (down) { if (h < mh) return; if (h === mh && M[lo + x] < ml) return; }
        else { if (h > mh) return; if (h === mh && M[lo + x] >= ml) return; }
        w(lo + x, ml); w(hi + x, mh);
      };
      if (!(M[V.actor_vy_hi + x] & 0x80)) clamp(V.actor_vy_lo, V.actor_vy_hi, V.max_vy_lo, V.max_vy_hi, true);
      else clamp(V.actor_vy_lo, V.actor_vy_hi, V.max_vy_up_lo, V.max_vy_up_hi, false);
      const y = P.actor_move_y({ x }).a;
      if (y < 0xF8 && y >= 0xE8) {                            // the water
        w(V.actor_balloons + x, 0xFF); w(V.splash_frame, 4); w(V.splash_x, M[V.actor_x + x]);
        if (x >= 2) { w(V.actor_balloons + x, 0x80); w(A, 0); w(V.sfx_request_c, 1); }
        else if (M[V.no_enemies] === 0) w(V.sfx_request_a, 0x40);
      }
      if (!(M[V.actor_vx_hi + x] & 0x80)) clamp(V.actor_vx_lo, V.actor_vx_hi, V.max_vx_lo, V.max_vx_hi, true);
      else clamp(V.actor_vx_lo, V.actor_vx_hi, V.max_vx_left_lo, V.max_vx_left_hi, false);
      P.actor_move_x({ x });
      if (M[V.game_mode]) {
        let a = M[V.actor_x + x];
        if (a < 0x10) a = 0x10;
        if (a >= 0xE0) a = 0xE0;
        w(V.actor_x + x, a);
      }
      if (M[V.no_enemies] === 0) return out(0);
      if (M[V.actor_balloons + x]) return out(M[V.actor_balloons + x]);
      if (M[V.actor_y + x] < 0xC8) return out(M[V.actor_y + x]);
      w(V.actor_y + x, 0xC7);
      if (M[V.actor_type + x] === 0x0B) {
        w(V.actor_type + x, 0x0A);
        P.negate_vy({ x });
        return P.scale_vy_80pct({ x });
      }
      w(V.actor_balloons + x, 2); w(V.actor_type + x, 3);
      return out(3);
    };
    P.actor_think = function (r) {
      const x = r.x & 0xFF, A = V.actor_action + x;
      if (x < 2) {
        if (M[V.actor_balloons + x] === 0 && M[V.actor_frame + x] === 0) { w(A, 0); return out(0); }
        if (M[A] < 6) return P.actor_controls({ x });
        w(A, 1); w(V.actor_balloons + x, M[V.actor_balloons + x] - 1);
        return out(1);
      }
      if (M[V.actor_balloons + x] === 2) return P.actor_controls({ x });
      if (M[V.actor_frame + x]) return out(M[V.actor_frame + x]);
      if (M[V.actor_balloons + x] === 0) { w(A, 0); return out(0); }
      if (M[A] === 0) { w(A, 1); return out(0); }
      if (M[A] < 2) return out(M[A]);
      w(V.actor_timer + x, M[V.actor_timer + x] - 1);
      if (M[V.actor_timer + x]) return out(M[V.actor_timer + x]);
      w(V.actor_timer + x, M[V.enemy_launch_delay]);
      w(A, M[A] + 1);
      if (M[A] < 7) return out(M[A]);
      w(V.actor_balloons + x, 2); w(A, 0);
      let a = M[V.relaunch_types + M[V.actor_type + x]];
      if (M[V.actor_was_hit + x] === 0) { w(V.actor_was_hit + x, 0xFF); a = M[V.actor_type + x] & 3; }
      w(V.actor_type + x, a);
      w(V.actor_vy_hi + x, 0xFE);
      return out(0xFE);
    };
    P.actor_controls = function (r) {
      const x = r.x & 0xFF, A = V.actor_action + x, B = V.buttons + x;
      P.steer_actor({ x });
      if ((M[B] & 0xC3) && x < 2) w(V.invulnerable + x, 0);
      if (!(M[B] & 0x40)) {
        if (!(M[B] & 0x80)) { w(V.flap_latch + x, 0); return out(0); }
        if (M[V.flap_latch + x]) return out(M[V.flap_latch + x]);
      }
      const a = M[A];
      if (a >= 2) { w(V.actor_y + x, M[V.actor_y + x] - 2); w(V.actor_vy_lo + x, 0); w(V.actor_vy_hi + x, 0); }
      else if (a !== 1 && M[V.actor_frame + x]) return out(M[V.actor_frame + x]);
      w(A, 0); w(V.actor_frame + x, 1); w(V.flap_latch + x, 1);
      const req = x < 2 ? V.sfx_request_a : V.sfx_request_b;
      w(req, M[req] | 0x10);
      const s = M[V.actor_vy_lo + x] - M[V.flap_strength + M[V.actor_type + x]];
      w(V.actor_vy_lo + x, s);
      if (s < 0) w(V.actor_vy_hi + x, M[V.actor_vy_hi + x] - 1);
      return out(M[V.actor_vy_lo + x], undefined, M[V.actor_type + x]);
    };
    P.actor_bubble_update = function (r) {
      const x = r.x & 0xFF;
      if (M[V.actor_action + x]) return out(M[V.actor_action + x]);
      P.actor_sway({ x }); P.actor_move_x({ x });
      const s = M[V.actor_y_frac + x] - 0x60;
      w(V.actor_y_frac + x, s);
      w(V.actor_y + x, M[V.actor_y + x] - (s < 0 ? 1 : 0));
      if (M[V.actor_y + x] >= 0xF1) w(V.actor_balloons + x, 0xFF);
      for (let y = 1; y >= 0; y--) {
        const b2 = M[V.actor_balloons + y];
        if (b2 === 0 || (b2 & 0x80)) continue;
        if (absv(M[V.actor_y + x] - M[V.actor_y + y]) >= 0x18) continue;
        if (absv(M[V.actor_x + x] - M[V.actor_x + y]) >= 0x10) continue;
        w(V.actor_action + x, 0xFF); w(V.actor_timer + x, 3); w(V.trip_scroll_pause, 0x78); w(V.sfx_request_a, 2);
        w(V.scoring_player, y);
        P.add_score({ a: 0x32 });
        const q = P.show_popup({ a: 1, x: M[V.scoring_player], y });
        return out(q.a, x, q.y);
      }
      return out(undefined, x, 0xFF);
    };
    P.show_popup = function (r) {
      const kind = r.a & 0xFF, actor = r.x & 0xFF;
      w(V.tmp12, kind); w(V.tmp13, actor); w(V.tmp14, r.y);
      let x = -1;
      for (let i = 1; i >= 0; i--) if (M[V.popup_kind + i] & 0x80) { x = i; break; }
      if (x < 0) x = M[V.popup_timer_2] < M[V.popup_timer] ? 1 : 0;
      w(V.popup_timer + x, 0x64); w(V.popup_kind + x, kind);
      const s = x << 3;
      w(V.sprite_popups_tile + s, M[V.popup_tiles + kind]); w(V.sprite_popups_tile2 + s, M[V.popup_tiles2 + kind]);
      w(V.sprite_popups + s, M[V.actor_y + actor] - 8); w(V.sprite_popups_y2 + s, M[V.actor_y + actor] - 8);
      w(V.sprite_popups_x + s, M[V.actor_x + actor]); w(V.sprite_popups_x2 + s, M[V.actor_x + actor] + 8);
      w(V.sprite_popups_attr + s, M[V.scoring_player]); w(V.sprite_popups_attr2 + s, M[V.scoring_player]);
      return out(kind, actor, r.y);
    };
    // The platform tables: platform_count platforms, the four tables at the pointers.
    const plat = (ptr, y) => M[(M[ptr] | (M[ptr + 1] << 8)) + y];
    P.actor_platforms = function (r) {
      const x = r.x & 0xFF, X = M[V.actor_x + x], Y = M[V.actor_y + x];
      if (M[V.actor_balloons + x] === 0 || (M[V.actor_balloons + x] & 0x80)) return out(undefined, undefined, (M[V.actor_balloons + x] - 1) & 0xFF);
      let y;
      if (Y >= 0xF9) {
        if (!(M[V.actor_vy_hi + x] & 0x80)) return out(M[V.actor_vy_hi + x]);
        w(V.collision_bits, 0);
        return bounceAt(0, x, -1);
      }
      y = M[V.platform_count];
      if (y & 0x80) return out(undefined, undefined, y);
      for (;; y--) {
        w(V.collision_bits, 0);
        const top = (plat(V.platform_top_ptr, y) - 0x18) & 0xFF;
        let sides = false;
        if (top < Y) {
          if (((top + 3) & 0xFF) >= Y) w(V.collision_bits, 1);
          else {
            const bottom = plat(V.platform_bottom_ptr, y);
            if (bottom >= Y) { if (((bottom - 3) & 0xFF) >= Y) sides = true; else w(V.collision_bits, 2); }
          }
          if (!sides && M[V.collision_bits] !== 0 || (!sides && top < Y && M[V.collision_bits] === 0 && plat(V.platform_bottom_ptr, y) >= Y)) {
            // b_ED69: the vertical bit holds only between the platform's left - 12 and right - 4
            const left = plat(V.platform_left_ptr, y), right = plat(V.platform_right_ptr, y);
            let clear = false;
            if (left !== 0x10 && ((left - 0x0C) & 0xFF) >= X) clear = true;
            else if (right !== 0xFF && ((right - 4) & 0xFF) < X) clear = true;
            if (clear) w(V.collision_bits, 0);
          }
          if (M[V.collision_bits] !== 0 || sides || plat(V.platform_bottom_ptr, y) >= Y) {
            // b_ED89: the sides
            const left = (plat(V.platform_left_ptr, y) - 0x10) & 0xFF;
            let side = -1;
            if (left === 0) side = 0;
            else if (left < X) { if (((left + 4) & 0xFF) >= X) side = 4; else side = 0; }
            if (side === 0) {
              const right = plat(V.platform_right_ptr, y);
              if (right !== 0xFF && right >= X && ((right - 4) & 0xFF) < X) side = 8;
              else side = -1;
            }
            if (side > 0) w(V.collision_bits, M[V.collision_bits] | side);
          }
        }
        if (M[V.collision_bits]) break;
        if (y === 0) return out(M[V.collision_bits], undefined, 0xFF);
      }
      // the collision found with platform y
      let bits = M[V.collision_bits];
      w(V.collision_bits, bits >> 1);
      if ((bits & 1) && !(M[V.actor_vy_hi + x] & 0x80)) {
        w(V.actor_y + x, (plat(V.platform_top_ptr, y) - 0x18 + 1) & 0xFF);
        w(V.landed_flag, 1);
      }
      bits = M[V.collision_bits]; w(V.collision_bits, bits >> 1);
      if ((bits & 1) && (M[V.actor_vy_hi + x] & 0x80)) return bounceAt(plat(V.platform_bottom_ptr, y), x, y);
      return sideBounce(x);
    };
    // j_EDE1: the head hits a platform's underside at Y a (or the top of the screen), then the sides
    function bounceAt(a, x, y) {
      w(V.actor_y + x, a);
      P.negate_vy({ x }); P.scale_vy_80pct({ x });
      if (x < 2) P.request_bounce_sound({ x, y });
      if (M[V.landed_flag]) return out(M[V.landed_flag]);
      return sideBounce(x);
    }
    function sideBounce(x) {
      let bits = M[V.collision_bits]; w(V.collision_bits, bits >> 1);
      let hit = false;
      if ((bits & 1) && !(M[V.actor_vx_hi + x] & 0x80)) hit = true;
      else {
        bits = M[V.collision_bits]; w(V.collision_bits, bits >> 1);
        if (!(bits & 1)) return out(M[V.collision_bits]);
        if (!(M[V.actor_vx_hi + x] & 0x80)) return out(M[V.actor_vx_hi + x]);
        hit = true;
      }
      if (!hit) return out(0);
      P.negate_vx({ x }); P.scale_vx_80pct({ x });
      if ((M[V.actor_vx_hi + x] | M[V.actor_vx_lo + x]) === 0) return out(0);
      w(V.actor_facing + x, M[V.actor_facing + x] ^ 1);
      w(V.sfx_request_b, M[V.sfx_request_b] | 2);
      return out(M[V.sfx_request_b]);
    }
    P.actors_collide = function () {
      for (let x = 7; x >= 0; x--) {
        w(V.tmp12, x);
        for (let y = x - 1; y >= 0; y--) {
          const bx = M[V.actor_balloons + x], by = M[V.actor_balloons + y];
          if ((bx & 0x80) || bx === 0 || (by & 0x80) || by === 0) continue;
          w(V.collision_bits, 0);
          const Xx = M[V.actor_x + x], Xy = M[V.actor_x + y], Yx = M[V.actor_y + x], Yy = M[V.actor_y + y];
          if (absv(Yy - Yx) < 0x18) {
            let vert = 0;
            w(V.tmp12, (Yx + 0x18) & 0xFF);
            if (absv(((Yy + 7) & 0xFF) - M[V.tmp12]) < 4) vert = 1;
            else if (absv(((Yy + 0x11) & 0xFF) - Yx) < 4) vert = 2;
            if (vert) { w(V.collision_bits, vert); if (absv(Xy - Xx) >= 0x10) w(V.collision_bits, 0); }
            w(V.tmp12, (Xx + 0x10) & 0xFF);
            let horiz = 0;
            if (absv(((Xy + 7) & 0xFF) - M[V.tmp12]) < 4) horiz = 4;
            else if (absv(((Xy + 9) & 0xFF) - Xx) < 4) horiz = 8;
            if (horiz) w(V.collision_bits, M[V.collision_bits] | horiz);
          }
          w(V.collision_flag, 0);
          let bits = M[V.collision_bits], bounceY = false;
          w(V.collision_bits, bits >> 1);
          if ((bits & 1) && (P.vy_diff({ x, y }).n)) bounceY = true;
          else {
            bits = M[V.collision_bits]; w(V.collision_bits, bits >> 1);
            if ((bits & 1) && !(P.vy_diff({ x, y }).n)) bounceY = true;
          }
          if (bounceY) {
            if (!P.both_birds_flying({ x, y }).c) {
              P.negate_vy({ x }); P.scale_vy_80pct({ x }); P.swap_xy({ x, y });
              P.negate_vy({ x: y }); P.scale_vy_80pct({ x: y }); P.swap_xy({ x: y, y: x });
            }
            w(V.collision_flag, 1);
          }
          bits = M[V.collision_bits]; w(V.collision_bits, bits >> 1);
          let bounceX = false;
          if ((bits & 1) && (P.vx_diff({ x, y }).n)) bounceX = true;
          else {
            bits = M[V.collision_bits]; w(V.collision_bits, bits >> 1);
            if ((bits & 1) && !(P.vx_diff({ x, y }).n)) bounceX = true;
          }
          if (bounceX) {
            if (!P.both_birds_flying({ x, y }).c) {
              P.negate_vx({ x }); P.scale_vx_80pct({ x }); P.swap_xy({ x, y });
              P.negate_vx({ x: y }); P.scale_vx_80pct({ x: y }); P.swap_xy({ x: y, y: x });
            }
            w(V.collision_flag, 1);
          }
          P.resolve_hit({ x, y }); P.swap_xy({ x, y });
          P.resolve_hit({ x: y, y: x }); P.swap_xy({ x: y, y: x });
        }
      }
      return out(undefined, 0xFF, 0xFF);
    };
    P.resolve_hit = function (r) {
      const x = r.x & 0xFF, y = r.y & 0xFF;
      const tail = () => {
        if (M[V.actor_type + x] === 0x0B && M[V.no_enemies] === 0) w(V.sfx_request_a, 0x20);
        return out(M[V.actor_type + x], x, y);
      };
      if (x >= 2 && y >= 2) return tail();
      w(V.kicked_flag, 0);
      if (M[V.actor_hit_cooldown + x]) return tail();
      if (!M[V.collision_flag]) return tail();
      let heightTest = true;
      if (x < 2) { if (M[V.invulnerable + x]) return tail(); }
      else if (M[V.actor_balloons + x] === 1) {
        if (M[V.actor_action + x] >= 2) heightTest = false;
        else w(V.kicked_flag, 1);
      }
      if (heightTest && ((M[V.actor_y + y] + 4) & 0xFF) >= M[V.actor_y + x]) return tail();
      w(V.actor_hit_cooldown + x, 0x14); w(V.actor_frame + x, 0);
      if (y >= 2 && M[V.actor_balloons + y] !== 2) return tail();
      w(V.sfx_request_a, M[V.sfx_request_a] | 2);
      if (M[V.actor_balloons + x] === 2 && x < 2) {
        w(V.tmp12, y);
        const a = M[V.player_burst_actions + M[V.actor_action + x]];
        if (a === 0) return tail();
        w(V.actor_action + x, a); w(V.actor_frame + x, 0);
      } else {
        w(V.actor_balloons + x, M[V.actor_balloons + x] - 1);
        if (M[V.actor_balloons + x] === 0) { w(V.actor_vy_hi + x, 0xFF); w(V.actor_vy_lo + x, 0); }
        w(V.actor_action + x, 0); w(V.actor_vx_lo + x, 0); w(V.actor_vx_hi + x, 0);
        w(V.actor_vx_target_hi + x, (M[V.actor_x + x] & 0x80) ? 0 : 0xFF);
        w(V.actor_vx_target_lo + x, 0x80);
      }
      w(V.tmp12, y);
      w(V.actor_type + x, M[V.hit_next_type + M[V.actor_type + x]]);
      w(V.actor_was_hit + x, 1);
      if (y >= 2) return tail();
      const t = M[V.actor_type + x];
      if (t !== 7 && t >= 8) w(V.sfx_request_b, M[V.sfx_request_b] | 0x80);
      w(V.tmp13, M[V.hit_scores + t]);
      if (M[V.kicked_flag]) w(V.tmp13, M[V.hit_scores_kicked + t]);
      w(V.tmp14, M[V.hit_popups + t] + M[V.kicked_flag]);
      w(V.scoring_player, M[V.tmp12]);
      const score = M[V.tmp13];
      P.show_popup({ a: M[V.tmp14], x, y: M[V.tmp12] });
      P.add_score({ a: score });
      return tail();
    };
    P.actors_update = function () {
      P.actors_collide();
      let last = { c: 0 };
      for (let x = 7; x >= 0; x--) {
        const bl = M[V.actor_balloons + x];
        if (bl & 0x80) { if (bl !== 0xFF) P.actor_bubble_update({ x }); }
        else {
          if (x >= 2 && bl === 1 && M[V.actor_action + x] < 2) w(V.sfx_request_b, M[V.sfx_request_b] | 0x20);
          w(V.actor_frame_timer + x, M[V.actor_frame_timer + x] - 1);
          if (M[V.actor_frame_timer + x] === 0) {
            w(V.actor_frame_timer + x, 3);
            if (x < 2) { w(V.invulnerable_timer + x, M[V.invulnerable_timer + x] - 1); if (M[V.invulnerable_timer + x] === 0) w(V.invulnerable + x, 0); }
            P.actor_animate({ x });
            w(V.scoring_player, x);
            P.actor_think({ x });
            P.actor_move_control({ x });
          }
          P.actor_physics({ x }); P.actor_platforms({ x }); P.actor_ground_state({ x });
        }
        last = P.draw_actor({ x });
      }
      return out(undefined, 0xFF, undefined, { c: last.c });
    };

    // --- drawing the actors ($E3A4-$E5C4) --------------------------------------------------------
    P.draw_actor = function (r) {
      const x = r.x & 0xFF;
      w(V.ptr2, (irq(V.frame_counter) & 1) ? M[V.actor_sprite_slots_alt + x] : M[V.actor_sprite_slots + x]);
      w(V.ptr2_hi, 2);
      const slot = M[V.ptr2] | 0x0200, bl = M[V.actor_balloons + x];
      if (bl & 0x80) {
        if (bl !== 0xFF) return P.draw_actor_bubble({ x });
        for (let y = 0x14; y >= 0; y -= 4) w(slot + y, 0xF0);
        return out(0xF0, x, 0xFC, { c: 1 });
      }
      let n;
      if (x === 8) {
        const y = M[V.actor_action + x];
        if (y & 0x80) { for (let k = 0x14; k >= 0; k -= 4) w(slot + k, 0xF0); return out(0xF0, x, 0xFC, { c: 1 }); }
        w(V.ptr1, M[V.fish_layout_ptrs + y]); w(V.ptr1_hi, M[V.fish_layout_ptrs_hi + y]);
      } else {
        let a = ((M[V.actor_action + x] << 2) + M[V.actor_frame + x]) & 0xFF;
        if (x < 2) {
          let y = (a + M[V.player_layout_base + bl]) & 0xFF;
          w(V.ptr1, M[V.player_layout_ptrs + y]); w(V.ptr1_hi, M[V.player_layout_ptrs_hi + y]);
          if (M[V.invulnerable + x]) {
            y = (M[V.player_flash_base + bl] + M[V.actor_frame + x]) & 0xFF;
            w(V.ptr1, M[V.player_flash_ptrs + y]); w(V.ptr1_hi, M[V.player_flash_ptrs_hi + y]);
          }
        } else {
          const y = (a + M[V.bird_layout_base + bl]) & 0xFF;
          w(V.ptr1, M[V.bird_layout_ptrs + y]); w(V.ptr1_hi, M[V.bird_layout_ptrs_hi + y]);
        }
      }
      w(V.tmp15, M[V.actor_x + x]); w(V.tmp12, M[V.actor_y + x]);
      let a = x === 0 ? 0 : x === 1 ? 1 : (M[V.actor_type + x] + 2) & 3;
      if (M[V.actor_facing + x]) a |= 0x40;
      if (M[V.actor_balloons + x] === 2 && M[V.actor_action + x] === 5) a ^= 0x40;
      if (M[V.actor_y + x] >= 0xC9 || x === 9) a |= 0x20;
      w(V.tmp14, a);
      w(V.ptr3, M[V.actor_facing + x] ? 0x79 : 0x43); w(V.ptr3_hi, 0xE0);
      let p1 = M[V.ptr1] | (M[V.ptr1_hi] << 8);
      n = M[p1]; p1 = (p1 + 1) & 0xFFFF;
      // ptr3 += n * 6, with the shifts' carries as the 6502 folds them
      let t = (n << 1) & 0xFF, c1 = n >> 7; w(V.tmp13, t);
      let a2 = (t << 1) & 0xFF, c2 = t >> 7;
      let s = a2 + M[V.tmp13] + c2; a2 = s & 0xFF; const c3 = s > 0xFF ? 1 : 0;
      s = a2 + M[V.ptr3] + c3; w(V.ptr3, s); if (s > 0xFF) w(V.ptr3_hi, M[V.ptr3_hi] + 1);
      let p3 = M[V.ptr3] | (M[V.ptr3_hi] << 8), carry = 0;
      for (let i = 5, o = 0; i >= 0; i--, o += 4) {
        w(V.tmp12, M[V.tmp12] + M[V.actor_sprite_dy + i]);
        w(slot + o, M[V.tmp12]);
        w(slot + o + 1, M[p1]); p1 = (p1 + 1) & 0xFFFF;
        w(slot + o + 2, M[V.tmp14]);
        s = M[V.tmp15] + M[p3]; carry = s > 0xFF ? 1 : 0;
        w(slot + o + 3, s); p3 = (p3 + 1) & 0xFFFF;
        w(V.tmp13, o + 3);
      }
      w(V.ptr1, p1); w(V.ptr1_hi, p1 >> 8); w(V.ptr3, p3); w(V.ptr3_hi, p3 >> 8);
      return out(M[slot + 23], x, 24, { c: carry, c1 });
    };
    P.draw_actor_bubble = function (r) {
      const x = r.x & 0xFF, y = M[V.ptr2], S = V.sprite_table + y;
      w(S, M[V.actor_y + x]); w(S + 4, M[V.actor_y + x]); w(S + 8, M[V.actor_y + x] + 8); w(S + 12, M[V.actor_y + x] + 8);
      w(S + 16, 0xF0); w(S + 20, 0xF0);
      w(S + 3, M[V.actor_x + x]); w(S + 11, M[V.actor_x + x]); w(S + 7, M[V.actor_x + x] + 8); w(S + 15, M[V.actor_x + x] + 8);
      const c = M[V.actor_y + x] >= 0xD0 ? 1 : 0;
      w(S + 2, c ? 0x23 : 0x03);
      if (M[V.actor_action + x] === 0) {
        w(S + 6, M[S + 2]); w(S + 10, M[S + 2]); w(S + 14, M[S + 2]);
        w(S + 1, 0xDA); w(S + 5, 0xDB); w(S + 9, 0xDC); w(S + 13, 0xDD);
        if (irq(V.frame_counter) & 0x20) {
          if (irq(V.frame_counter) & 0x40) { w(S + 3, M[S + 3] + 1); w(S + 11, M[S + 11] + 1); }
          else { w(S, M[S] + 1); w(S + 4, M[S + 4] + 1); }
        }
        return out(undefined, x, y, { c });
      }
      w(S + 6, M[S + 2] | 0x40); w(S + 14, M[S + 2] | 0xC0); w(S + 10, (M[S + 2] | 0xC0) & 0xBF);
      w(S + 1, 0xDE); w(S + 5, 0xDE); w(S + 9, 0xDE); w(S + 13, 0xDE);
      w(V.actor_timer + x, M[V.actor_timer + x] - 1);
      if (M[V.actor_timer + x] & 0x80) { w(V.actor_balloons + x, 0xFF); w(V.actor_y + x, 0xF0); w(V.sfx_request_b, 0x04); }
      return out(undefined, x, y, { c });
    };
    P.draw_splash = function () {
      const f = M[V.splash_frame];
      if (f & 0x80) return out(undefined, f);
      w(V.ptr1, M[V.splash_frame_ptrs + f]); w(V.ptr1_hi, M[V.splash_frame_ptrs_hi + f]);
      const p = M[V.ptr1] | (M[V.ptr1_hi] << 8);
      for (let y = 0, x = 0; x !== 0x10; ) {
        const a = M[p + y]; w(V.sprite_bolt + x, a); y++; x++;
        if (a === 0xF0) x += 3;
      }
      for (let y = 0x0F; y >= 0; y -= 4) w(V.sprite_bolt + y, M[V.sprite_bolt + y] + M[V.splash_x]);
      if ((irq(V.frame_counter) & 3) === 0) w(V.splash_frame, M[V.splash_frame] - 1);
      return out(undefined, 0x10, 0xFF);
    };

    // --- the balloons of the bonus round and Balloon Trip ($CD4A-$CF12) -----------------------
    P.balloons_clear = function () { for (let x = 9; x >= 0; x--) { w(V.balloon_state + x, 0xFF); w(V.balloon_y + x, 0xF0); } return out(0xF0, 0xFF); };
    P.balloon_spawn = function (r) {
      w(V.balloon_spawn_timer, M[V.balloon_spawn_timer] - 1);
      if (M[V.balloon_spawn_timer]) return out(undefined, undefined, undefined, { c: r ? r.c : 0 });
      w(V.balloon_spawn_timer, (M[V.random] & 0x3F) + 0x28 + ((r && r.c) ? 1 : 0));
      let x = -1;
      for (let i = 9; i >= 0; i--) if (M[V.balloon_state + i] & 0x80) { x = i; break; }
      if (x < 0) return out(undefined, 0xFF);
      w(V.balloon_state + x, 0); w(V.balloon_vx_lo + x, 0); w(V.balloon_vx_hi + x, 0);
      w(V.balloon_x_frac + x, 0x80); w(V.balloon_y_frac + x, 0x80); w(V.balloon_y + x, 0xD0);
      const y = P.next_random({ x }).a & 3;
      w(V.balloon_x + x, M[V.chimney_x + y]);
      w(V.balloon_sway_lo + x, M[V.random]); w(V.balloon_sway_hi + x, (M[V.random] & 0x80) ? 0xFF : 0);
      w(V.balloons_to_launch, M[V.balloons_to_launch] - 1);
      return out(M[V.balloon_sway_hi + x], x, M[V.balloon_sway_hi + x]);
    };
    P.balloons_update = function () {
      for (let x = 9; x >= 0; x--) {
        const st = M[V.balloon_state + x];
        if (!(st & 0x80)) {
          if (st !== 0) {
            w(V.tmp12, M[V.balloon_vx_lo + x]); w(V.tmp13, M[V.balloon_vx_hi + x]);
            P.shift_right_4();
            let s = M[V.balloon_sway_lo + x] + M[V.tmp12];
            w(V.balloon_sway_lo + x, s); w(V.tmp12, s);
            s = M[V.balloon_sway_hi + x] + M[V.tmp13] + (s > 0xFF ? 1 : 0);
            w(V.balloon_sway_hi + x, s); w(V.tmp13, s);
            P.shift_right_4();
            s = M[V.balloon_vx_lo + x] - M[V.tmp12];
            w(V.balloon_vx_lo + x, s);
            w(V.balloon_vx_hi + x, M[V.balloon_vx_hi + x] - M[V.tmp13] - (s < 0 ? 1 : 0));
            s = M[V.balloon_x_frac + x] + M[V.balloon_vx_lo + x];
            w(V.balloon_x_frac + x, s);
            w(V.balloon_x + x, M[V.balloon_x + x] + M[V.balloon_vx_hi + x] + (s > 0xFF ? 1 : 0));
          }
          const s = M[V.balloon_y_frac + x] - M[V.balloon_rise_speed];
          w(V.balloon_y_frac + x, s);
          if (s < 0) w(V.balloon_y + x, M[V.balloon_y + x] - 1);
          if (M[V.balloon_y + x] === 0xF0) w(V.balloon_state + x, 0xFF);
          else if (M[V.balloon_y + x] < 0xA8) w(V.balloon_state + x, 1);
        }
        P.balloon_draw({ x }); P.balloon_hit_players({ x });
      }
      return out(undefined, 0xFF);
    };
    P.balloon_draw = function (r) {
      const x = r.x & 0xFF, st = M[V.balloon_state + x];
      w(V.tmp13, M[V.balloon_palettes + ((st + 1) & 0xFF)]);
      w(V.tmp12, x);
      const y = (x * 12) & 0xFF;
      w(V.sprite_bubbles + y, M[V.balloon_y + x]); w(V.sprite_bubbles_y2 + y, M[V.balloon_y + x]); w(V.sprite_bubbles_y3 + y, M[V.balloon_y + x] + 8);
      w(V.sprite_bubbles_x + y, M[V.balloon_x + x]); w(V.sprite_bubbles_x3 + y, M[V.balloon_x + x] + 4); w(V.sprite_bubbles_x2 + y, M[V.balloon_x + x] + 8);
      w(V.sprite_bubbles_attr + y, M[V.tmp13]); w(V.sprite_bubbles_attr2 + y, M[V.tmp13]); w(V.sprite_bubbles_attr3 + y, M[V.tmp13]);
      if (st & 0x80) {
        w(V.balloon_y + x, 0xF0);
        w(V.sprite_bubbles_tile + y, 0xAC); w(V.sprite_bubbles_tile2 + y, 0xAD); w(V.sprite_bubbles_tile3 + y, 0xFC);
        return out(0xFC, x, y);
      }
      w(V.sprite_bubbles_tile + y, 0xA8); w(V.sprite_bubbles_tile2 + y, 0xA9);
      const i = (irq(V.frame_counter) >> 4) & 7;
      w(V.tmp13, x);
      w(V.sprite_bubbles_tile3 + y, M[V.balloon_bottom_tiles + i]);
      w(V.sprite_bubbles_attr3 + y, M[V.sprite_bubbles_attr3 + y] ^ M[V.balloon_bottom_flips + i]);
      return out(M[V.sprite_bubbles_attr3 + y], x, y);
    };
    P.balloon_hit_players = function (r) {
      const x = r.x & 0xFF;
      for (let y = 1; y >= 0; y--) {
        const bl = M[V.actor_balloons + y];
        if ((bl & 0x80) || bl === 0) continue;
        if (M[V.balloon_state + x] & 0x80) return out(M[V.balloon_state + x], x, y);
        if (M[V.actor_y + y] >= 0xC0) continue;
        if (absv(M[V.actor_y + y] - M[V.balloon_y + x]) >= 0x18) continue;
        if (absv(M[V.actor_x + y] - M[V.balloon_x + x]) >= 0x10) continue;
        w(V.balloon_state + x, 0xFF);
        w(V.balloons_popped + y, M[V.balloons_popped + y] + 1);
        w(V.sfx_request_a, 2);
        return out(2, x, y);
      }
      return out(undefined, x, 0xFF);
    };

    // --- the sparks ($C8B7-$CB73) ---------------------------------------------------------------
    P.spark_move = function (r) {
      const x = r.x & 0xFF;
      let s = M[V.spark_vx_lo + x] + M[V.spark_x_frac + x];
      w(V.spark_x_frac + x, s); w(V.spark_x + x, M[V.spark_vx_hi + x] + M[V.spark_x + x] + (s > 0xFF ? 1 : 0));
      s = M[V.spark_vy_lo + x] + M[V.spark_y_frac + x];
      w(V.spark_y_frac + x, s); w(V.spark_y + x, M[V.spark_vy_hi + x] + M[V.spark_y + x] + (s > 0xFF ? 1 : 0));
      return out(M[V.spark_y + x], x);
    };
    P.spark_flip_vx = function (r) { neg16(V.spark_vx_lo, V.spark_vx_hi, r.x & 0xFF); return out(M[V.spark_vx_hi + (r.x & 0xFF)], r.x); };
    P.spark_flip_vy = function (r) { neg16(V.spark_vy_lo, V.spark_vy_hi, r.x & 0xFF); return out(M[V.spark_vy_hi + (r.x & 0xFF)], r.x); };
    P.spark_flip_vx_sound = function (r) { w(V.sfx_request_c, M[V.sfx_request_c] | 0x80); return P.spark_flip_vx(r); };
    P.spark_flip_vy_sound = function (r) { w(V.sfx_request_c, M[V.sfx_request_c] | 0x80); return P.spark_flip_vy(r); };
    P.spark_hit_players = function (r) {
      const x = r.x & 0xFF;
      for (let y = 1; y >= 0; y--) {
        const bl = M[V.actor_balloons + y];
        if ((bl & 0x80) || bl === 0 || M[V.invulnerable + y]) continue;
        if (absv(M[V.spark_x + x] - M[V.actor_x + y]) >= 8) continue;
        if (absv(M[V.spark_y + x] - M[V.actor_y + y] - 8) >= 0x0C) continue;
        w(V.actor_balloons + y, 0); w(V.actor_action + y, 1); w(V.spark_hit + y, 1); w(V.actor_type + y, 0x0B); w(V.actor_timer + y, 0x20);
        w(V.sfx_request_a, M[V.sfx_request_a] | 0x80);
        w(V.spark_y + x, 0xF0); w(V.spark_state + x, 0xFF);
      }
      return out(undefined, x, 0xFF);
    };
    P.spark_platforms = function (r) {
      const x = r.x & 0xFF, SX = M[V.spark_x + x], SY = M[V.spark_y + x];
      for (let y = M[V.platform_count]; !(y & 0x80); y--) {
        w(V.collision_bits, 0);
        const top = (plat(V.platform_top_ptr, y) - 8) & 0xFF;
        let go = 'end';
        if (top < SY) {
          if (((top + 3) & 0xFF) >= SY) { w(V.collision_bits, 1); go = 'inside'; }
          else {
            const bottom = plat(V.platform_bottom_ptr, y);
            if (bottom >= SY) { if (((bottom - 3) & 0xFF) >= SY) go = 'sides'; else { w(V.collision_bits, 2); go = 'inside'; } }
          }
        }
        if (go === 'inside') {
          const left = plat(V.platform_left_ptr, y);
          let clear = false;
          if (left !== 0x10 && ((left - 4) & 0xFF) >= SX) clear = true;
          else if (plat(V.platform_right_ptr, y) < SX) clear = true;
          if (clear) w(V.collision_bits, 0);
          go = 'sides';
        }
        if (go === 'sides') {
          const left = plat(V.platform_left_ptr, y);
          let side = 'right';
          if (left !== 0x10) {
            const l8 = (left - 8) & 0xFF;
            if (l8 >= SX) side = 'end';
            else if (((l8 + 3) & 0xFF) >= SX) { w(V.collision_bits, M[V.collision_bits] | 4); side = 'end'; }
          }
          if (side === 'right') {
            const right = plat(V.platform_right_ptr, y);
            if (right !== 0xFF && right >= SX && right < 3) w(V.collision_bits, M[V.collision_bits] | 8);
          }
        }
        if (M[V.collision_bits]) {
          let bits = M[V.collision_bits];
          w(V.collision_bits, bits >> 1); if ((bits & 1) && !(M[V.spark_vy_hi + x] & 0x80)) P.spark_flip_vy_sound({ x });
          bits = M[V.collision_bits]; w(V.collision_bits, bits >> 1); if ((bits & 1) && (M[V.spark_vy_hi + x] & 0x80)) P.spark_flip_vy_sound({ x });
          bits = M[V.collision_bits]; w(V.collision_bits, bits >> 1); if ((bits & 1) && !(M[V.spark_vx_hi + x] & 0x80)) P.spark_flip_vx_sound({ x });
          bits = M[V.collision_bits]; w(V.collision_bits, bits >> 1); if ((bits & 1) && (M[V.spark_vx_hi + x] & 0x80)) P.spark_flip_vx_sound({ x });
        }
      }
      return out(undefined, x, 0xFF);
    };
    // sparks_update takes the carry its caller leaves (the bolt's first sprite adds with it)
    P.sparks_update = function (r) {
      let c = (r && r.c) ? 1 : 0;
      for (let x = 1; x >= 0; x--) {
        if (M[V.spark_state + x] & 0x80) continue;
        const ph = M[V.spark_bolt_phase + x];
        let drawn = false;
        if (!(ph & 0x80)) {
          const y = ph, k = M[V.lightning_cloud_copy];
          let s = M[V.cloud_x + k] + M[V.bolt_dx1 + y] + c; c = s > 0xFF ? 1 : 0;
          w(V.sprite_bolt_x, s); w(V.sprite_bolt_x2, s); w(V.sprite_bolt_x3, s);
          s = M[V.cloud_y + k] + M[V.bolt_dy1 + y] + c; c = s > 0xFF ? 1 : 0; w(V.sprite_bolt, s);
          s = (s & 0xFF) + M[V.bolt_dy_step + y] + c; c = s > 0xFF ? 1 : 0; w(V.sprite_bolt_y2, s);
          s = (s & 0xFF) + M[V.bolt_dy_step + y] + c; c = s > 0xFF ? 1 : 0; w(V.sprite_bolt_y3, s);
          const dir = y & 3;
          let fr = y >> 2;
          if (!((irq(V.frame_counter) >> 1) & 1)) fr += 5;
          w(V.sprite_bolt_tile, M[V.bolt_tiles1 + fr]); w(V.sprite_bolt_tile2, M[V.bolt_tiles2 + fr]); w(V.sprite_bolt_tile3, M[V.bolt_tiles3 + fr]);
          w(V.sprite_bolt_attr, M[V.bolt_attrs + dir]); w(V.sprite_bolt_attr2, M[V.bolt_attrs + dir]); w(V.sprite_bolt_attr3, M[V.bolt_attrs + dir]);
          c = (irq(V.frame_counter) >> 1) & 1;
          if ((irq(V.frame_counter) & 7) === 0) {
            w(V.spark_bolt_phase + x, M[V.spark_bolt_phase + x] + 4);
            c = M[V.spark_bolt_phase + x] >= 0x14 ? 1 : 0;
            if (c) w(V.spark_bolt_phase + x, 0xFF);
          }
          if (M[V.spark_bolt_phase + x] < 0x10) { c = 0; continue; }
          c = 1;
        }
        P.spark_move({ x });
        if (M[V.spark_x + x] < 2) P.spark_flip_vx_sound({ x });
        if (M[V.spark_x + x] >= 0xF7) P.spark_flip_vx_sound({ x });
        if (M[V.spark_y + x] < 2) P.spark_flip_vy_sound({ x });
        if (M[V.spark_y + x] >= 0xE0) { w(V.spark_state + x, 0xFF); w(V.spark_y + x, 0xF0); c = 1; continue; }
        P.spark_platforms({ x }); P.spark_hit_players({ x });
        w(V.spark_state + x, (M[V.spark_state + x] + 1) & 7);
        w(V.tmp12, M[V.spark_tiles + M[V.spark_state + x]]);
        const y = x << 2;
        c = M[V.spark_y + x] >= 0xD0 ? 1 : 0;
        w(V.sprite_table + y, M[V.spark_y + x]); w(V.sprite_x_0 + y, M[V.spark_x + x]); w(V.sprite_tile_0 + y, M[V.tmp12]);
        w(V.sprite_attr_0 + y, c ? 0x20 : 0);
        drawn = true;
      }
      return out(undefined, 0xFF, undefined, { c });
    };

    // --- the propellers ($CB74-$CD25) ------------------------------------------------------------
    P.request_bounce_sound = function (r) { w(V.sfx_request_b, M[V.sfx_request_b] | 2); return out(M[V.sfx_request_b], r ? r.x : undefined, r ? r.y : undefined); };
    P.propellers_update = function () {
      for (let x = M[V.propeller_count]; !(x & 0x80); x--) {
        P.propeller_push({ x, y: 7 });
        if (!M[V.propeller_spinning + x]) continue;
        if ((x ^ irq(V.frame_counter)) & 1) continue;
        w(V.propeller_phase + x, (M[V.propeller_phase + x] + 1) & 3);
        P.propeller_draw({ x });
        if (M[V.propeller_phase + x] !== 1) continue;
        w(V.propeller_spin_timer + x, M[V.propeller_spin_timer + x] - 1);
        if (M[V.propeller_spin_timer + x] === 0) w(V.propeller_spinning + x, M[V.propeller_spinning + x] - 1);
      }
      return out(undefined, 0xFF);
    };
    P.propeller_push = function (r) {
      const x = r.x & 0xFF;
      if (!M[V.propeller_spinning + x]) return P.propeller_touch({ x, y: 7 });
      for (let y = 7; y >= 0; y--) {
        const bl = M[V.actor_balloons + y];
        if ((bl & 0x80) || bl === 0) continue;
        if (y >= 2 && bl === 1) continue;
        w(V.tmp12, M[V.actor_x + y] + 8 - M[V.propeller_x + x]);
        if (absv(M[V.tmp12]) >= 0x12) continue;
        w(V.tmp13, M[V.actor_y + y] + 0x0C - M[V.propeller_y + x]);
        if (absv(M[V.tmp13]) >= 0x12) continue;
        let a = M[V.tmp12], up = a & 0x80;                  // below the propeller: pushed up; above: down
        if (!up) {
          if (a >= 3) {
            w(V.actor_vy_hi + y, 2); P.request_bounce_sound({ x, y });
            a = P.actor_move_y_yreg({ x, y }).a;
            // bne b_CC0B after the move: the swap's LDY tmp12 set Z from the actor's index, so
            // actor 0 is also pushed up when its new Y is under $FD
            if (y === 0) up = true;
          }
        }
        if (up && a < 0xFD) { w(V.actor_vy_hi + y, 0xFE); P.actor_move_y_yreg({ x, y }); P.request_bounce_sound({ x, y }); }
        a = M[V.tmp13];                                     // after a move through the Y register, this is the propeller's index
        if (!(a & 0x80)) {
          if (a < 3) continue;
          w(V.actor_vx_hi + y, 2); P.actor_move_x_yreg({ x, y }); P.request_bounce_sound({ x, y });
          continue;
        }
        if (a >= 0xFD) continue;
        w(V.actor_vx_hi + y, 0xFE); P.actor_move_x_yreg({ x, y }); P.request_bounce_sound({ x, y });
      }
      return out(undefined, x, 0xFF);
    };
    P.propeller_touch = function (r) {
      const x = r.x & 0xFF;
      for (let y = r.y & 0xFF; !(y & 0x80); y--) {
        const bl = M[V.actor_balloons + y];
        if ((bl & 0x80) || bl === 0) continue;
        if (y >= 2 && M[V.propeller_phase + x] === 3) {
          const px = (M[V.propeller_x + x] - 0x0A) & 0xFF, py = (M[V.propeller_y + x] - 0x1C) & 0xFF;
          if (px < M[V.actor_x + y] && ((px + 4) & 0xFF) >= M[V.actor_x + y] && py < M[V.actor_y + y] && ((py + 4) & 0xFF) >= M[V.actor_y + y]) P.propeller_stand({ x, y });
        }
        w(V.tmp12, absv(M[V.actor_x + y] + 8 - M[V.propeller_x + x]));
        w(V.tmp13, absv(M[V.actor_y + y] + 0x0C - M[V.propeller_y + x]));
        if (M[V.propeller_phase + x] !== 3) { const t = M[V.tmp12]; w(V.tmp12, M[V.tmp13]); w(V.tmp13, t); }
        if (M[V.tmp12] >= 0x14 || M[V.tmp13] >= 0x0B) continue;
        w(V.propeller_spinning + x, 1); w(V.propeller_spin_timer + x, 0x32);
      }
      return out(undefined, x, 0xFF);
    };
    P.propeller_stand = function (r) { w(V.landed_flag, M[V.landed_flag] + 1); const q = P.actor_ground_state({ x: r.y }); return out(q.a, r.x, r.y); };
    P.queue_propeller_row = function (r) {
      P.queue_block({ a: 0x57, y: 0, x: r.x });
      const s = M[V.text_buf_1] + 0x20;
      w(V.text_buf_1, s); if (s > 0xFF) w(V.text_buf, M[V.text_buf] + 1);
      return out(undefined, r.x, r.y);
    };
    P.propeller_draw = function (r) {
      const x = r.x & 0xFF, y = M[V.propeller_phase + x];
      w(V.text_buf, M[V.propeller_addr_hi + x]); w(V.text_buf_1, M[V.propeller_addr_lo + x]); w(V.text_buf_2, 3);
      w(V.text_buf_3, M[V.propeller_tiles + y]); w(V.text_buf_4, M[V.propeller_tiles_2 + y]); w(V.text_buf_5, M[V.propeller_tiles_3 + y]);
      P.queue_propeller_row({ x, y });
      w(V.text_buf_3, M[V.propeller_tiles_4 + y]); w(V.text_buf_4, M[V.propeller_tiles_5 + y]); w(V.text_buf_5, M[V.propeller_tiles_6 + y]);
      P.queue_propeller_row({ x, y });
      w(V.text_buf_3, M[V.propeller_tiles_7 + y]); w(V.text_buf_4, M[V.propeller_tiles_8 + y]); w(V.text_buf_5, M[V.propeller_tiles_9 + y]);
      return P.queue_propeller_row({ x, y });
    };

    // --- the fish and Balloon Trip's ranking ($C527-$C715) -------------------------------------
    P.set_balloon_value = function () {
      const x = P.set_bonus_round_values().x;
      w(V.bonus_value, M[V.bonus_value] << 1);
      let a = M[V.bonus_value], c = a >> 7; a = (a << 1) & 0xFF;
      c = a >> 7; a = (a << 1) & 0xFF;
      const s = a + M[V.bonus_value] + c;
      w(V.bonus_value, s);
      return out(s, x, undefined, { c: s > 0xFF ? 1 : 0 });
    };
    P.find_trip_rank = function () {
      w(V.tmp12, 0);
      for (;;) {
        const p = 0x0700 | (M[V.tmp12] * 5);
        w(V.ptr1, p); w(V.ptr1_hi, 7);
        let better = true, y;
        for (y = 4; y >= 0; y--) {
          if (M[p + y] < M[V.score_p1 + y]) break;
          if (M[p + y] > M[V.score_p1 + y]) { better = false; break; }
        }
        if (better) break;
        w(V.tmp12, M[V.tmp12] + 1);
        if (M[V.tmp12] !== 0x32) continue;
        w(V.tmp12, 0x31);
        break;
      }
      w(V.tmp12, M[V.tmp12] + 1);
      const rank = M[V.tmp12];
      w(V.score_add, rank);
      w(V.trip_rank_tens, P.divide({ y: 10 }).a);
      w(V.trip_rank_units, M[V.score_add]);
      w(V.tmp12, rank);
      return out(rank);
    };
    P.insert_trip_rank = function () {
      P.find_trip_rank();
      w(V.tmp12, M[V.tmp12] - 1);
      w(V.tmp13, 0x31 - M[V.tmp12]);
      let y = (M[V.tmp13] * 5) & 0xFF;
      w(V.ptr1, M[V.tmp12] * 5); w(V.ptr2, M[V.tmp12] * 5 + 5); w(V.ptr1_hi, 7); w(V.ptr2_hi, 7);
      const p1 = M[V.ptr1] | 0x0700, p2 = M[V.ptr2] | 0x0700;
      if (y !== 0) { for (y = y - 1; y > 0; y--) w(p2 + y, M[p1 + y]); w(p2, M[p1]); }
      for (y = 4; y >= 0; y--) w(p1 + y, M[V.score_p1 + y]);
      return out(M[V.score_p1], undefined, 0xFF);
    };
    P.fish_draw = function () {
      const i = M[V.fish_timer] >> 3;
      w(V.fish_state, M[V.fish_sinking] ? M[V.fish_frames_sinking + i] : M[V.fish_frames_rising + i]);
      P.draw_actor({ x: 8 });
      if (M[V.fish_caught] === 0) return out(0, 8);
      const x = M[V.fish_target];
      if (M[V.fish_timer] === 0x20) { w(V.actor_balloons + x, 0xFF); return P.draw_actor({ x }); }
      if (M[V.fish_timer] > 0x20) return out(M[V.fish_timer], x);
      w(V.actor_x + x, M[V.fish_facing] ? M[V.fish_x] - 4 : M[V.fish_x] + 4);
      w(V.actor_y + x, M[V.fish_y] - 0x0A);
      return P.draw_actor({ x });
    };
    P.fish_find_target = function () {
      w(V.fish_target, 0xFF);
      for (let x = 7; x >= 0; x--) {
        if (M[V.actor_balloons + x] & 0x80) continue;
        if (M[V.actor_y + x] < 0xB4) continue;
        if (M[V.actor_x + x] !== M[V.fish_x]) continue;
        w(V.fish_target, x); w(V.fish_facing, M[V.actor_facing + x]);
        w(V.fish_sinking, 0); w(V.fish_timer, 0); w(V.fish_caught, 0); w(V.fish_rising, 0);
        w(V.fish_y, 0xDC);
        return out(0xDC, x);
      }
      return out(undefined, 0xFF);
    };
    P.fish_swim = function () { w(V.fish_x, M[V.fish_x] + 1); if (M[V.fish_x] >= 0xB1) w(V.fish_x, 0x40); return out(M[V.fish_x]); };
    P.fish_rise = function () {
      if (!M[V.fish_rising]) {
        w(V.fish_y, M[V.fish_y] - 1);
        if (M[V.fish_y] < 0xC4) { w(V.fish_y, M[V.fish_y] + 1); w(V.fish_sinking, M[V.fish_sinking] + 1); w(V.fish_rising, M[V.fish_rising] + 1); }
      } else w(V.fish_y, M[V.fish_y] + 1);
      w(V.fish_timer, M[V.fish_timer] + 1);
      if (M[V.fish_timer] === 0x18) {
        const x = M[V.fish_target];
        if (!(M[V.actor_balloons + x] & 0x80) && ((M[V.actor_y + x] + 0x10) & 0xFF) >= M[V.fish_y]) {
          w(V.actor_type + x, M[V.fish_victim_types + M[V.actor_type + x]]);
          w(V.actor_action + x, 0); w(V.actor_balloons + x, 0);
          w(V.music_request, M[V.music_request] | 0x40);
          w(V.fish_caught, M[V.fish_caught] + 1);
        }
      }
      if (M[V.fish_sinking] && (M[V.fish_timer] === 0x28 || M[V.fish_timer] === 0x30)) w(V.fish_y, 0xCC);
      return out(undefined, M[V.fish_target]);
    };
    P.fish_check_target = function () {
      if (M[V.fish_rising]) return out(M[V.fish_rising]);
      const x = M[V.fish_target];
      let follow = false;
      if (!(M[V.actor_balloons + x] & 0x80) && M[V.actor_y + x] >= 0xB4 && M[V.actor_x + x] >= 0x40 && M[V.actor_x + x] < 0xB1) follow = true;
      if (follow) { w(V.fish_x, M[V.actor_x + x]); w(V.fish_facing, M[V.actor_facing + x]); return out(M[V.fish_facing], x); }
      w(V.fish_timer, 0x30 - M[V.fish_timer]); w(V.fish_rising, M[V.fish_rising] + 1);
      return out(M[V.fish_timer], x);
    };
    P.fish_update = function () {
      if (M[V.fish_state] & 0x80) {
        P.fish_swim(); P.fish_find_target();
        if (M[V.fish_target] & 0x80) return out(M[V.fish_target], 0xFF);
        w(V.sfx_request_c, 0x40);
      }
      P.fish_check_target(); P.fish_rise();
      return P.fish_draw();
    };

    // --- the lightning and the clouds ($C716-$C8B6) ---------------------------------------------
    P.queue_text_buf = function (r) { return P.queue_block({ a: 0x57, y: 0, x: r ? r.x : 0 }); };
    P.j_C856 = function (r) {
      const i = r.a & 3;
      w(V.text_buf_3, M[V.cloud_flash_attrs + i]);
      const x = M[V.lightning_cloud];
      if (x & 0x80) return out(x, x, undefined, { c: 1 });
      w(V.text_buf, 0x23); w(V.text_buf_1, M[V.cloud_attr_tl + x]); w(V.text_buf_2, 1);
      P.queue_text_buf({ x });
      w(V.text_buf_1, M[V.cloud_attr_tr + x]); P.queue_text_buf({ x });
      w(V.text_buf_1, M[V.cloud_attr_bl + x]); P.queue_text_buf({ x });
      w(V.text_buf_1, M[V.cloud_attr_br + x]);
      return Object.assign(P.queue_text_buf({ x }), { c: 1 });
    };
    P.pick_lightning_cloud = function () {
      const n = M[V.cloud_count];
      if (n & 0x80) { w(V.lightning_cloud, n); return out(n); }
      let a = P.next_random({ x: 0 }).a;
      while (a > n) a = (a - n - 1) & 0xFF;
      w(V.lightning_cloud, a);
      return out(a);
    };
    P.lightning_set_phase = function () {
      let x = M[V.phase_counter];
      if (x >= 0x18) x = 0x18;
      w(V.spark_speed_level, M[V.spark_speed_by_phase + x]); w(V.lightning_timer, M[V.lightning_delays + x]);
      w(V.sprite_bolt, 0xF0); w(V.sprite_bolt_y2, 0xF0); w(V.sprite_bolt_y3, 0xF0);
      return P.j_C856({ a: 3 });
    };
    P.lightning_init = function () {
      for (let x = 1; x >= 0; x--) { w(V.spark_state + x, 0xFF); w(V.spark_bolt_phase + x, 0xFF); }
      P.pick_lightning_cloud();
      return P.lightning_set_phase();
    };
    P.lightning_countdown = function () {
      if (irq(V.frame_counter) & 0x7F) return out(irq(V.frame_counter) & 0x7F);
      w(V.lightning_timer, M[V.lightning_timer] - 1);
      if (M[V.lightning_timer]) return out(M[V.lightning_timer]);
      let x = 0;
      if (!(M[V.spark_state] & 0x80)) { x = 1; if (!(M[V.spark_state_1] & 0x80)) { w(V.lightning_timer, 1); return out(1, x); } }
      let y = M[V.lightning_cloud];
      w(V.lightning_cloud_copy, y);
      if (y & 0x80) return out(y, x, y);
      w(V.spark_x_frac + x, 0x80); w(V.spark_y_frac + x, 0x80); w(V.spark_state + x, 0);
      w(V.spark_x + x, M[V.cloud_x + y]); w(V.spark_y + x, M[V.cloud_y + y]);
      y = M[V.spark_speed_level];
      const q = P.next_random({ x });
      w(V.spark_vx_lo + x, (q.a & 0x1F) + M[V.spark_base_speeds + y] + q.c);
      w(V.spark_vy_lo + x, M[V.spark_vy_by_level + y]); w(V.spark_vx_hi + x, M[V.spark_vx_hi_by_level + y]); w(V.spark_vy_hi + x, M[V.spark_vy_hi_by_level + y]);
      y = P.next_random({ x }).a & 3;
      w(V.spark_bolt_phase + x, y);
      w(V.spark_x + x, M[V.spark_x + x] + M[V.spark_dir_dx + y]); w(V.spark_y + x, M[V.spark_y + x] + M[V.spark_dir_dy + y]);
      if (M[V.spark_dir_flip_x + y]) P.spark_flip_vx({ x });
      if (M[V.spark_dir_flip_y + y]) P.spark_flip_vy({ x });
      if (M[V.spark_speed_level] < 5) w(V.spark_speed_level, M[V.spark_speed_level] + 1);
      w(V.lightning_timer, 6 - M[V.spark_speed_level]);
      w(V.sfx_request_a, M[V.sfx_request_a] | 4);
      return P.pick_lightning_cloud();
    };
    P.cloud_flash = function () {
      const t = M[V.lightning_timer];
      if (t !== 1) return out(t, undefined, undefined, { c: t >= 1 ? 1 : 0 });
      if (!(M[V.spark_state] & 0x80) && !(M[V.spark_state_1] & 0x80)) { w(V.lightning_timer, 2); return out(2, undefined, undefined, { c: 1 }); }
      const a = irq(V.frame_counter) & 0x7F;
      if (a < 0x40) return out(a, undefined, undefined, { c: 0 });
      if (a === 0x40) w(V.sfx_request_b, M[V.sfx_request_b] | 8);
      return P.j_C856({ a: a === 0x40 ? M[V.sfx_request_b] : a });
    };
    P.draw_title_cursor = function () {
      w(V.game_mode, M[V.title_option] >> 1); w(V.two_players, M[V.title_option] & 1);
      w(V.balloon_y, M[V.title_cursor_y + M[V.title_option]]); w(V.balloon_x, 0x2C);
      w(V.balloon_state, 0);
      return P.balloon_draw({ x: 0 });
    };

    P.irq_hang = function () { throw new Error('irq_hang: the game never enables an interrupt source'); };   // $C0F7

    // --- the whole program, from the reset vector ($C000) ----------------------------------------
    P.reset = function* () {
      io.write(PPUCTRL, 0); io.write(PPUMASK, 0);
      while (!(io.read(PPUSTATUS) & 0x80)) yield;
      while (io.read(PPUSTATUS) & 0x80) yield;
      while (!(io.read(PPUSTATUS) & 0x80)) yield;
      for (let x = 0x12; x < 0x100; x++) w(x, 0);
      let kept = true;
      for (let x = 2; x >= 0; x--) if (M[V.ram_signature + x] !== M[V.ram_signature_text + x]) { kept = false; break; }
      if (!kept) {
        for (let x = 0; x < 0x100; x++) { w(x, 0); w(V.trip_ranking + x, 0); }
        w(V.tmp15, 0x32);
        do {
          yield C(0xC045); P.add_score({ a: 0x32 });
          w(V.status_request, 0);
          yield C(0xC04C); P.insert_trip_rank();
          w(V.tmp15, M[V.tmp15] - 1);
        } while (M[V.tmp15] !== 0);
        for (let x = 0x0E; x >= 0; x--) w(V.top_scores + x, M[V.initial_top_scores + x]);
        for (let x = 4; x >= 0; x--) w(V.score_p1 + x, 0);
        yield C(0xC069); P.add_score({ a: 0 });
        for (let x = 2; x >= 0; x--) w(V.ram_signature + x, M[V.ram_signature_text + x]);
      }
      w(V.ppumask_shadow, 0x1E); w(V.ppuctrl_shadow, 0x90);
    };
    P.program = function* () {
      yield* P.reset();
      for (;;) yield* P.main();
    };
    return P;
  }
  return { create, V, ROUTINES, PASS, CHECKPOINTS, WAITS, IGNORE_REGS, MAP, SOUND_FRAME };
})();
if (typeof module === 'object' && module.exports) module.exports = { BalloonFight };
// end of bf-port.js
