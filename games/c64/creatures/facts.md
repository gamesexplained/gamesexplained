# Creatures — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`.

The game is in fifteen parts (`orientation.md`, "The parts"): the title
(`intro`), the engine, which stays in memory from the first load to the
last, the attract sequence and the witch's shop, which take turns in one
block of the engine's memory, six levels, three torture chambers, the
ending, and a picture on side A that the game never loads. What is true
of one part is in that part's own `parts/<id>/facts.md`, with that part's
addresses; the engine's facts hold the play mechanics, the display, the
sound and the loader. This file holds what spans the parts, and names the
part beside every address it gives: "engine `$14AF`" is the engine's
routine at `$14AF`.

## Build

- The Thalamus release, on both sides of one disk, PAL. The title's
  copyright line reads "(C) MCMXC THALAMUS SOFTWARE" (intro `$992A`) and
  the attract sequence's "COPYRIGHT THALAMUS 1990" (attract
  `credit_text`, `$EB2C`); the collection the image comes from names the
  release 1991.
- Credits: "PROGRAMMED BY JOHN ROWLANDS" and "GRAPHICS & MUSIC BY STEVE
  ROWLANDS" on the title (part `intro`), "PROGRAMMING : JOHN ROWLANDS"
  and "GRAPHIX, SONIX : STEVE ROWLANDS" in the attract sequence, "AN APEX
  COMPUTER PRODUCTION", and in the title's scroller "ADDITIONAL WORK BY
  ANDY SMITH, MILES BARRY AND ANDY ROBERTS".
- No version number or build date was found in any part. The eight
  starting high scores belong to APEX, JAZ, STUD, ANDY, DAVE, ATFR, MTB
  and ZZAP, from 3000 down to 1600 (engine `hiscore_names`, `$FB42`;
  `hiscore_scores`, `$FB1E`).

## How the parts connect

- Side A's `BOOT` loads `2`, a fast loader, which loads `MENU`, the title
  (part `intro`). Fire on the title copies a mover to `$0190` and loads
  `GAME`, which the mover spreads over `$0200-$FFFF` before jumping to
  engine `$1000` (`orientation.md`, "The loader, in a paragraph").
- From then on the engine loads every other file itself, from side B,
  with its own fast loader (engine `fast_loader`, `$BD00`, run at
  `$4800`). The stage number (engine `$12A2`) picks the file: its first
  letter from `stage_file_letters` (`$BF3B`) and its second `$40` plus
  the stage, its first and last pages from `load_start_pages` and
  `load_end_pages` (engine `loading_setup`, `$F889`). A file the drive
  does not find brings up "INSERT SIDE B AND PRESS FIRE TO START" (engine
  `insert_side_prompt`, `$159A`), which is how the first load asks for
  side B.

| Stage | File | Part | Loads to | Started at |
|---|---|---|---|---|
| 0 | `1@` | `attract` (a copy) | `$5800-$69FF`, swapped to `$E000` | loads stage 1 at once |
| 1 | `LA` | `level-1-1` | `$5800-$ABFF` | attract `$E500` |
| 2 | `LB` | `level-1-2`, `shop` | `$8700-$ABFF` | shop `$E500` |
| 3 | `TC` | `torture-1` | `$5800-$ABFF` | `$8051` |
| 4 | `LD` | `level-2-1` | `$5800-$ABFF` | shop `$E500` |
| 5 | `LE` | `level-2-2` | `$8700-$99FF` | shop `$E500` |
| 6 | `TF` | `torture-2` | `$5800-$ABFF` | `$8051` |
| 7 | `LG` | `level-3-1` | `$5800-$ABFF` | shop `$E500` |
| 8 | `LH` | `level-3-2` | `$8700-$99FF` | shop `$E500` |
| 9 | `TI` | `torture-3` | `$5800-$ABFF` | `$8051` |
| 10 | `CJ` | `ending` | `$5800-$8CFF` | `$7D6A` |

- Every load ends in engine `loader_hand_over` (`$BDF3`), which chooses
  the entry by the file's first letter and the stage: a chamber's "T" at
  `$8051`, the ending's stage 10 at `$7D6A`, any level at `$E500`. Which
  program answers at `$E500` depends on what is in `$E000-$F1FF`: the
  attract block for level 1.1, whose `$E500` is engine `level_enter`'s
  way into the attract sequence and the high-score table, and the shop
  for every later level.
- The block at `$E000-$F1FF` changes hands twice a game. Before stage 2
  loads, engine `loading_screen` (`$F7CB`) swaps level 1.1's
  `$9A00-$ABFF` with the attract block at `$E000` (memory swap 8); `LB`
  then loads its own first part over `$8700-$99FF` and the shop over
  `$9A00-$ABFF`, and `loader_hand_over` swaps the two back, so level 1.2
  runs on level 1.1's code at `$9A00-$ABFF` with the shop at `$E000`. The
  attract block is gone from memory, so a game over or the ending sets
  the stage to `$FF` and reloads from stage 0: `1@`, a byte-for-byte copy
  of the attract block, is swapped into `$E000` (memory swap 7) and level
  1.1 loaded after it (engine `game_end`, `$1CBE`; ending
  `ending_exit`, `$7E6B`).
- The second stage of each level loads over the first (`$8700` up), so
  it shares the first stage's character set, sprites, tiles, colour
  table, code and tunes, all below `$8700` or above `$99FF` (parts
  `level-1-2`, `level-2-2`, `level-3-2`).
- Each new stage adds a life: `loader_hand_over` increments the lives
  (engine `$B7BF`, at `$BE36`) before it starts any stage but the
  reload after a game over or the ending. *Live*: the route from level
  1.1's play with 4 lives reached level 1.2's Get Ready screen with 5.
- The witch's shop is entered after every level file loads, so it
  comes before levels 1.2, 2.1, 2.2, 3.1 and 3.2. Its clues for the next
  torture chamber come from the level just loaded (level `shop_clue_1`,
  `$8F0D`, and the two others the shop's code names), so each world's
  levels carry their world's chamber clues.

## Memory layout

During play, with the ROMs banked out (`$01` = `$35`):

| Range | What |
|---|---|
| `$0334-$0CFF` | the music player and the sound effects (engine) |
| `$1000-$3FFF` | engine: start, interrupts, play, objects, Get Ready screen, text |
| `$1200-$12FF` | engine variables: the frame flags, the stage number `$12A2`, Clyde's state |
| `$4000-$7FFF` | the VIC bank: screens at `$4400` and `$4800`, panel sprites from `$4000`; from `$5800` the stage's file |
| `$5800-$ABFF` | the stage's file (level, chamber or ending), with its own code at `$A300-$ABFF` |
| `$AC00-$C0FF` | engine: Clyde's death, the timer, the panel, the fast loader, tunes |
| `$C000-$CFFF` | engine: the objects' tables and routines, the weapons |
| `$D000-$DFFF` | RAM under the I/O chips: the text character set and the shop's, swapped in when shown |
| `$E000-$F1FF` | the attract block or the shop |
| `$F200-$FFFF` | engine: the drive code, the loading screen, the high scores |

Each part's facts give its own map.

## Timing

- PAL only. Engine `timing_check` (`$CF4C`), called once a frame from the
  Get Ready screen's and the title's interrupts, reads CIA 2's timer B and
  restarts it: the time between two frames must be `$B340-$B34F`, a PAL
  frame of 19,656 cycles less the routine's own. Anything else, an NTSC
  machine or a game frozen and restarted, jumps to engine `memory_wipe`
  (`$AF6A`), which clears memory upward without end.
- Every level, chamber and ending file starts at `$8000` with the KERNAL's
  cartridge signature, both vectors pointing at `memory_wipe`: a reset
  while a stage is in memory erases the game. *Live*: a VICE reset from
  chamber 1 stopped at `$AF6A`.
- The stage timer counts down once a second, every 50 frames (engine
  `timer_tick`, `$B71E`). *Live*: on level 1.1 it fell by 40 in 2,000
  frames, with a control checkpoint on engine `raster_bottom` hit 2,000
  times. A level's limit is its `time_limit` (`$8CE5`): 600 seconds for
  level 1.1, 800 for 1.2, 750 for 2.1, 600 for 2.2 and 500 for 3.1 and
  3.2.

## Controls

- Joystick in port 2 (engine `joy2_read`, `$11AF`). Up jumps, left and
  right walk, fire shoots, fire held for 36 frames and released breathes
  the flame, down with fire opens the weapons tablet (engine
  `player_control`, `player_fire`).
- RUN/STOP with the joystick centred pauses, any joystick movement
  resumes, and Q while paused quits to the attract sequence (engine
  `raster_bottom`, `game_frame_end`). Each chamber has its own copy of the
  pause (chamber `paused`).
- On the Get Ready screen, left and right turn the in-game music off and
  on (engine `raster_ready_icons`).
- RESTORE does nothing: the NMI vector points at an RTI in every part.

## Mechanics

- Lives: 4 at a new game (engine `game_new`, `$1865`), one more at each
  new stage and for each extra life collected, one fewer for each death;
  the game ends when a life is taken at 0 (engine `game_frame_end`,
  `$1C66`).
- Clyde has a spare hit in each life: engine `stage_start`, which runs
  after every Get Ready screen, sets `$12A0` to 1; the first touch stops
  him for 40 frames and then gives him 127 frames of invulnerability, and
  the second touch kills (engine `player_hurt`, `player_dead`,
  `player_dying_wait`). Water kills at once (`player_dead` skips the
  spare hit there), and level 3.2's spikes, the time-out and any touch
  while Clyde rides level 3's broomstick clear the spare hit first. *Live*,
  14 October 2026: walking into level 1.1's creatures, the first touch
  took `$12A0` from 1 to 0 with the lives still 4, the second cost a life.
- The Magic Potion Creatures, collected in the levels, are the shop's
  money: three kinds, counted at engine `$B8A0-$B8A2` with the total at
  `potions_total` (`$B89F`) (engine `player_hit_object`, `potion_add`).
  Each chamber's rescue pays six more, two of each kind, one at a time
  (chamber `potion_award`, torture-1 `$9FE0`), through the same
  `potion_add`, whose ADC operand (engine `$B8B4`) only a pickup writes
  (engine `player_hit_object`, `$3C80`): 1, or 5 for a creature on a
  double-height sprite. When the last potion creature collected before a
  chamber was double height, the rescue pays ten of each kind, thirty in
  all. Levels 1.2, 2.2 and 3.2 each have one double-height potion
  creature in plain view (records 97, 41 and 55).
- An object whose spawn record's hit response (byte 7) has both low
  bits set animates only when shot: engine `object_spawn` clears its
  `obj_anim_on` (`$20EE`), and each hit (`hit_response_3`, `$BEE6`) sets
  it to `$FF`, one turn of the script. World 2's swelling balls (type 10)
  and level 2.1's end creature (type 36) are spawned this way, so each
  shot moves their scripts on a byte.
- A stage's spawn records, 17 bytes each from `$9000` in its level
  file, are read in order by engine `object_spawn` (`$1FC6`), each once
  the landscape has scrolled the distance in byte 16 of the record
  before. Its counter (`$1FC2`) goes down by the scroll speed once a pass
  of the main loop, and the interrupt scrolls the landscape once a frame,
  so the two keep step while a pass takes a frame. A record read when the
  stage has scrolled S pixels finds the screen's left edge at map pixel
  S - 312, so its creature, at sprite x 256 + byte 5, comes in at map
  pixel S + byte 5 - 80. A column of the map whose top byte has bit 7
  set is a command and takes no room on the screen (engine
  `scroll_column`, `$26ED`); with bit 6 too it brings in the next set of
  band colours (`level_colours_next`, `$269D`). *Live*, 14 October 2026,
  in a run of each of the six stages with the landscape kept scrolling
  (below): every record was read with the left edge at S - 312, within a
  pixel once the opening run was over and up to seven pixels behind
  during it, with the band colours of the map's set for the column at
  the right edge.
- The shop sells eight weapons in three grades and clues for the next
  chamber (part `shop`); the weapons tablet chooses among the weapons
  bought (engine `weapons_tablet`).
- In the torture chambers a touch kills at once: each chamber's Get
  Ready screen clears the spare hit (`retry_screen`, at torture-1
  `$9D06`) and its touch handler jumps into engine `player_hurt` at
  `$3CEC`, past the invulnerability test. The chamber's own puzzle decides
  the outcome (parts `torture-1`, `torture-2`, `torture-3`).
- The game's cheat, CTRL and 2 on the high-score table once the title
  tune has ended, writes three NOPs over the DEC of the lives at engine
  `$1CA0` and lasts one game (attract `title_cheat_input`, `$F119`); the
  ending reads the same bytes to decide whether to suggest it (ending
  `$7DE6`).
- The high scores are not saved: every file is opened for reading
  (engine `kernal_open_file`, secondary address 0), the only drive
  commands are the fast loader's M-W and M-E, and no part calls the
  KERNAL's SAVE.

## Sound

- One music driver serves the title, the game and the ending: the
  engine's is at `$0334-$0A67` (engine `music_update`), and the title
  moves its own copy, the same code assembled `$CC` higher, to `$0400`
  (part `intro`). Every tune in every part is in its format: a header of
  two voice offsets, three voices of two-byte commands, and sections the
  voices call.
- The tunes: the title's (intro `$3800`); the Get Ready screen's, a lost
  life's and the hurry-up tune at 15 seconds left (engine `$B97F`,
  `$BC2B`, `$AE80`); each world's level tune and end tune (in the level
  files); each chamber's tune and the rescue screen's, which is the same
  bytes in all three chambers; the shop's (engine `$F300`); the name
  entry's (engine `$FC85`) and the attract sequence's (engine `$CA2D`);
  and the ending's (ending
  `$88C5`).
- Sound effects: 29, on three channels by priority, two while the music
  plays (engine `sfx_request`, `sfx_play_pending`).

## The listing's error rate

Seed 20261014, population 5,198 comments over every part: 3,751 written
by hand and 1,447 generated from the levels' tables (the spawn records,
animation and movement scripts). A sample of 60 hand-written and 20
generated comments was checked against the bytes by an agent that wrote
none of them, on claude-opus-5-5 (`work/reports/`): 11 were wrong,
13.8 % (Wilson 95 % interval 7.9 % to 23.0 %; 13.4 % weighted by the
strata's sizes, the hand-written 10 in 60 and the generated 1 in 20), a
lower bound on the true rate, since a checker misses some. What was
wrong: two counts off by one (chamber 1's big worm and green ball burst
on their 36th and 51st hits, the counts running from 35 and 50 to below
zero; the loop that draws the loading bar's last cell runs three to six
times, not once); level 1.1's two pairs of waterfall characters given
each other's rates, $F1-$F2 changing every fourth frame and $F3-$F4
every other; two settings misnamed (a music command's $08AE is the
attack waveform's length, not a release point; `sfx_request` stores the
effect's definition, not its number); `stage_main_setup` described
without world 2's oxygen set-up and its call of `music_hooks_ingame`,
and as setting both screens' sprite pointers where it sets Clyde's
alone; the fast loader's `$FF00` put down to the running copy where it
is the file's own operand; level 3.1's branch at `$A9E2` said to skip a
whole strip of arches where it skips two rows; chamber 2's cable
character placed in rows 15-17 where it runs from row 2; chamber 3's
`burst_lead` said to be read, and with it `hanger_dead` said to be
raised, where the burst stops one step short and the flag is never set;
and the generator's wording for a spawn record that waits one pixel of
scrolling, which said the next record is read in the next frame. All
eleven were corrected, with the 123 comments that said the same things:
98 spawn records with the same wait, the tables, operands and characters
behind level 1.1's waterfalls (renamed `f1_*` and `f3_*` after the
characters they feed), the other three counts and flags of chamber 1's
worm and ball, the five comments that built on `hanger_dead`, three on
the sound effects' definitions and one more of chamber 2's cables. No
audit was made, and no second sample drawn.

## Live tests

All in VICE 3.9 through `kit/c64/vice.py`, from the snapshots named in
`orientation.md`, between 13 and 14 October 2026.

- Booting side A, the title, the attract sequence, the side B prompt and
  level 1.1's Get Ready screen and play (`reference/`).
- The music toggle on the Get Ready screen, the pause and resume, the
  quit, the jump, a shot, the flame's charge and the weapons tablet
  (`features.md`).
- The spare hit: walking into level 1.1's creatures (above).
- The timer's rate: 40 counts in 2,000 frames, against a control
  checkpoint (above).
- A lost life with POKE 7328,173 (lives kept at 4) and with the
  C64-Wiki's 7328,208 (the game hung at the first lost life)
  (`cheats.md`).
- The title cheat: CTRL and 2 on the high-score table turned the fuzzies
  grey and wrote three NOPs at engine `$1CA0`, still there after the next
  Get Ready screen (part `attract`).
- Each part's snapshot was reached through engine `stage_next` with the
  stage number poked, which loads the files from side B as the game does
  (`orientation.md`); the lives rose by one from level 1.1 to 1.2.
- Chamber 1: the rescue with the boulder falling and the fuse lit, and
  the death when the jack reaches the top (part `torture-1`).
- Level 2.1's swimming and oxygen, level 3.1's broomstick
  (`reference/play-2-1-swimming.png`, `reference/play-3-1-broom.png`).
- Each stage's map: a run of each of the six stages from its Get Ready
  snapshot, with Clyde kept alive (RTS at engine `$3CDD`), the timer
  stopped (RTS at `$B71E`) and the landscape scrolling on every pass (the
  BNE at `$1B18` made two NOPs), stopped at every record `object_spawn`
  reads: all 699 records, read in order, where the map puts them (above),
  and 61 screens taken on the way holding the map's characters
  (`test_maps.js`, `test_maps.json`). The runs from world 2 and 3 first
  made the writes chamber 1's exit makes, and level 3.2's switched its
  spikes off (`orientation.md`).
- The ending's text and its three scenes, and its return to the
  high-score check (part `ending`).
- The witch's shop before level 1.2, entered with 5 lives: the greeting,
  its boxes and four presses of INFORMATION, read at every pass of
  `shop_loop` (part `shop`, `test_shop.js`, `test_shop.json`).
- The ending from its hand-over with fire on the text screen: every pass
  of the scenes' frame loops, 2,452, and five whole frames with VICE's
  pictures of them (part `ending`, `test_end.js`, `test_end.json`).
- A VICE reset from chamber 1 stopping at engine `memory_wipe`.
