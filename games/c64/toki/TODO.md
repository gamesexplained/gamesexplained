# Toki — TODO

Tier: Bronze (2026-10-08). Coverage 33.3 % of the play snapshot's ledger (2026-10-22).

For Silver:

- 50-coverage: the burn-down from 33.3 %. Named and commented on
  2026-10-22: `stage_load`, `stage_start`, `sound_frame`, the main loop
  (`main_loop`, `round_start`, `stage_begin`, `wait_nmi`, `wait_frame`),
  and the two panel interrupts (`irq_panel`, `irq_panel_on`). Also named
  the ten game updates `main_loop` calls (`update_objects`,
  `update_temp_objects`, `update_player`, `set_view_window`,
  `player_effect_tick`, `place_player_sprites`,
  `object_sprites_and_hits`, `place_third_sprite`,
  `copy_sprites_to_tables`, `scroll_draw_edge`) and the variables they
  use. Then named, in the same pass: `player_fire`, `player_animate`,
  `set_idle_aim`, `track_stage_section` (with `load_section_record`,
  `point_in_section`), `block_property_at`, `object_run_type_handler`,
  `object_run_script_handler`, `object_script_step`, and what `player_mode`
  0-2 do. Then, on 2026-10-22, the handlers behind the tables at $A87A and
  $B382 (the first stage's; table-2 indexes 7, 16, 17, 23, 24, and 28 point
  into later stages' code, and 19, 22, 26, 27, and 29 enter other routines
  part-way). Next: the later stages' handlers (needs their snapshots), the jump targets of `player_mode_step` ($8603, $89A9, $9025, $919E, $8E88),
  what the section record's settings (`load_section_record`) mean, the
  stage skip (`cheat_flag` $08F9) in `cheats.md`, `nmi_frame`, the
  alternative raster handler $95A4 (when $6B is set), which object
  property each pointer table in the stage block holds (`facts.md`,
  "Packed entries" and "After a stage loads"), and confirming in VICE that
  directory entry 11 is never copied. The
  routines in bank 0 (`unpack` $8DA2, `stage_sets` $8127) need the bank
  parts below.
- Treat the cartridge's banks as `kit/skills/c64/c64-reference`,
  "Bank-switched cartridges", says: make the play snapshot's analysis a
  part (`parts.py add ... --adopt`), then a part for each of the 16 banks
  over it (`kit/c64/crt.py parts`), and exclude from each bank what is
  copied into RAM. Each stage is likely copied in from the cartridge
  (`stage_load`), which would make each stage a part as well
  (`15-parts`).
- Text: the game reads its strings from bank 0 in place. They go in
  bank 0's listing, and the code that prints them takes their names
  through a `"banks"` row in its part's `part.json` (the same section).
- 20-features: every page fetch was refused in this session; read the
  manual and C64 reviews (Zzap!64 issue 80) when a session can.
- Explain the data the ledger does not see ($D000-$DFFF RAM and seven
  stretches `listing.py` names).
- 60-verify, 70-minisite (the full page), 80-retro.
