# Toki — TODO

Tier: Bronze (2026-10-08). Coverage 23.5 % of the play snapshot's ledger (2026-10-22).

For Silver:

- 50-coverage: the burn-down from 23.5 %. Named and commented on
  2026-10-22: `stage_load`, `stage_start`, `sound_frame`, the main loop
  (`main_loop`, `round_start`, `stage_begin`, `wait_nmi`, `wait_frame`),
  and the two panel interrupts (`irq_panel`, `irq_panel_on`). Also named
  the ten game updates `main_loop` calls (`update_objects`,
  `update_temp_objects`, `update_player`, `set_view_window`,
  `player_effect_tick`, `place_player_sprites`,
  `object_sprites_and_hits`, `place_third_sprite`,
  `copy_sprites_to_tables`, `scroll_draw_edge`) and the variables they
  use. Next: the routines they call that are still unnamed ($9400,
  $A88E, $B207, $B1F7, $AF34, $98F3, $9F05, $92DF), what `player_mode`
  0-2 mean, the stage skip (`cheat_flag` $08F9) in `cheats.md`,
  `nmi_frame`, the alternative raster handler $95A4 (when $6B is set),
  which object property each pointer table in the stage block holds
  (`facts.md`, "Packed entries" and "After a stage loads"), and
  confirming in VICE that directory entry 11 is never copied. The
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
