# Toki — TODO

Tier: silver-claimed (Gold started 2026-10-25, section 04 The frame added; Euan to say what is dull). Was Silver (2026-10-25, kit/CHECKING.md). Coverage 100.0 %. Sample 7301: 13 of 60 wrong; full audit by Opus 5.5 (275 of 1,173 comments rewritten, facts.md 27 claims, 18 renames); sample 4417: 4 of 60 wrong, corrected. Open: 15 comments on cartridge banks (sprite shapes, object definitions) need the cartridge image or Euan's bank sources to check.

Next: later stages' handlers (table-2 indexes 7, 16, 17, 23, 24, 28 need snapshots of other stages), the remaining bare runs ($B259, $9443, $5108, $686D, $6D81, $442C; queue via coverage.py). Named 2026-10-24 (latest pass: bank record unpacker $059A, joystick read $4082, intro loop $4095, terrain probe $9C1E; before it: init_round_state $4EDD, map-row copy $4593, SID sound driver $66A9, object phase handlers $A990, char-block slots $AC4F, player tile probe $9D3C; before it: the view-scroll engine, recolour_screen $5BC2, player movement, nmi_frame and its stage patcher, the $95A4 sprite reuse handler, path_start_from_record, the stage-skip cheat).

For Silver:

- 50-coverage: the burn-down from 42.4 % (was 33.3 %). Named and commented on
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

## Open from the 28 October 2026 pass

- The Lemon64 page for the C64 game (credits, review table, readers' comments) was refused to automated fetches (HTTP 403), as was UVList. Save the page from a browser to add the Commodore Format review (issue 14, November 1991, 86%, by Steve Jarratt, which two search summaries gave and which has not been read) and the readers' views on difficulty.
- No scan of the C64 manual, the Commodore Format review, or a Computer and Video Games review was available. The story and controls on the pages come from the Zzap!64, Commodore Force, and Commodore Power scans and from the code.
- No interview with Al Dukes, Keith Tinman, or any of the three artists was found. Search results connected an Alastair Dukes to Rockstar Leeds, but nothing read says that he is the Ocean programmer, so the pages do not say so.
- Bottino says the conversion has "only 91 unique 2x2 tiles and a 256-character map". The 91 matches the block table of stage 1; the 256-character map has not been checked.
- A Solution tab was not written: it needs a run of the game for each stage, and the cartridge image was not available in the session.
- Maps: redrawn from the cartridge (the five stage blocks unpacked with the kit's simulator). Each row's first column follows from the row address table and closes at both ends of the row data (Maps tab). Still open: which of two possible placements a few shaft rows take was decided by eye (stages 2 and 3); stage 4 row 11 column 67 holds block 63 but the table has 61; the last cell of stage 3's last row is not in the data. Playing each stage to its edges would settle these.

