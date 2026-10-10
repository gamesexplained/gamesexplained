# Qix — features

Read this before annotating code. What the game is documented to do, with
verification status against the binary. Statuses: **open** (documented,
not found yet), **traced** (in the code, could not be exercised; say what
was tried), **confirmed** (in the code, consistent with the emulator),
**live** (observed directly in the emulator), **differs** (the code does
something else). "Absent" is not a status.

Sources:

- Taito America, *Qix: Loading & Game Play Instructions*, the Apple IIGS
  manual of the 1989 series (04-0009-13), OCR text at
  https://archive.org/details/Qix-Manual, read 10 October 2026. No C64
  manual was found; this one is for another machine of the same series,
  so its keys and screen layout are not the C64's, and every row taken
  from it says so.
- Internet Archive item `d64_Qix_1989_Taito` (its MobyGames
  description only; no file was downloaded),
  https://archive.org/details/d64_Qix_1989_Taito, read 10 October 2026:
  developed by Taito America, published by Taito, 1989; slow and fast
  draw, Sparx, the Fuse.
- Internet Archive item `tim-follin-qix-c64`, a recording of the C64
  music credited to Tim Follin and dated July 1989,
  https://archive.org/details/tim-follin-qix-c64, read 10 October 2026.
  Only its catalogue record was read.
- C64-Wiki has no page for Qix (404, 10 October 2026). Lemon64 refused
  the fetch (403), and the Wayback Machine's copy of it could not be
  reached (connection reset) on the same day; MobyGames refused (403).
- The game's own screens: the loading screen (Alien Technology Group),
  the title picture, the menu, the play screen.

## Features

| Feature | Status | Where |
|---|---|---|
| The player's marker (the Stix) moves along the edges; holding fire and pushing away from the edge starts a slow draw (IIGS manual) | live | from `play-round1.vsf`: fire and up for 120 frames drew a line about 30 pixels long, the marker a white diamond |
| Releasing fire while drawing starts a fast draw (IIGS manual) | live | fire for 10 frames then up alone for 110 drew about 58 pixels, the marker red |
| A closed shape is filled and claimed; a slow draw scores twice a fast draw (IIGS manual; the demonstration says SLOW 500, FAST 250) | confirmed | finish_line, fill_find_side, fill_column; score_fill halves the pixel count and doubles it unless the line ended with fire released |
| Required claim: 65 % on level 1, rising with the level (IIGS manual) | live | lvl_tables at $11F9: 65 % on levels 1-4, 70 % on 5-6, 75 % on 7-8, 80 % from 9; claim_check compares; a poked 1 % requirement ended the level at a 6 % claim |
| 1,000 bonus points per percent claimed over the requirement (IIGS manual) | confirmed | claim_check adds $03E8 per percent over |
| Three lives per player (IIGS manual) | live | lives ($026E) = 3 at the start of a game, from $1567; at most 5 ($1566) |
| A life is lost when the Qix touches an unfinished line, or a Fuse, Sparx or Spritz touches the marker (IIGS manual) | confirmed | pixel_op (Qix on colour 1), place_enemy_sprite (walkers on the marker), fuse_advance, roam_probe (a roamer on the line) all set the hit flag $1E; check_death runs life_lost |
| Sparx travel the edges; two new Sparx each time the timer runs out ("the line disappears"); on higher levels Sparx follow the marker up its line once the alarm rings (IIGS manual) | confirmed | three walker pairs (walker_pair_a/b/c) released by timer runs per level (lvl_tables); pair B chases up the line from level 3 (chaser_b1_step); sound 5 when they speed up (timer_bar_empty) |
| The Sparx timer shrinks during play; the IIGS manual puts it above the play area | live (C64 differs in layout) | on the C64 it is the vertical bar to the right of the play area, between the field and the panel; it shrinks from the top |
| The Fuse travels along the line being drawn when the marker stops (archive description) | confirmed | fuse_tick starts it when the marker stops while drawing; fuse_advance burns the line to colour 2 behind it and kills at the marker |
| Spritz: a sub-virus; trapping one in a fill is worth 500 points and turns later fast fills into slow points until the player dies (IIGS manual) | confirmed in part | roamers start at a Qix (spritz_step, roam2_step); a trapped one sets $154D, which makes every line score and fill as slow until life_lost clears it. The 500 points were not found as a constant: open |
| Splitting two Qix multiplies the points of later fills (IIGS manual) | differs | split_test ends the level and counts $0291; score_fill doubles points once per split for the rest of the game, but the doubling adds only the low byte to itself, so from 256 points on it falls short of double |
| An extra life every 50,000 points (IIGS manual) | confirmed | extra_life_p1/p2: threshold from 50,000, raised by 50,000, up to 5 lives |
| High-score table, "the QIX Hall of Fame", initials typed in (IIGS manual) | differs | the C64 keeps one high score ($5DF0-$5DF2), set by reload_alien and shown as " HI SCORE " in the attract demonstration; no initials and no table were found (searched: every reader of $5DF0, the string sweep) |
| One player, two players, or a one-player practice game, chosen with the stick and fire (IIGS manual; the C64 menu reads `1 PLAYER`, `2 PLAYER`, `PRACTICE`, `USE JOYSTICK TO SELECT OPTION`) | live | the menu after the title |
| Pause (ESC on the IIGS); restart and reboot keys (IIGS manual) | live | RUN/STOP pauses, any stick movement resumes (pause_check). No restart key: the only other key read is RUN/STOP (read_runstop); RESTORE is disabled (nmi_rti) |
| Status panel: lives, required claim, completed claim, level (IIGS manual) | live | right of the field: `QIX` logo, `CLM` and the requirement, the claim, `LVL` and the level (draw_status); lives as diamonds at the top right (draw_lives) |
| Score at the top of the screen (IIGS manual) | live | `PLAYER 1 0` |
| Title music by Tim Follin (archive recording's catalogue record) | traced | the music player at $E000 plays eleven tunes; nothing in the program names a composer |

## Beyond the documentation

| Feature | Status | Where |
|---|---|---|
| An attract demonstration: the program plays a game by script, naming the enemies and drawing a spiral death trap | live | attract_demo, after the title tune (74 s on the title) |
| Hints at the end of levels 2 and 4 ("SPLITTING QIXS MULTIPLIES POINTS", "CAPTURE SPRITZ FOR EXTRA POINTS") | traced | level_messages |
| The same music tempo on PAL and NTSC | live | music_frame skips one frame in six on NTSC |
| Either joystick port works | traced | read_stick EORs both ports |
| The Qix drifts towards the marker's side, harder on later levels | traced | qix_step, $6D/$6E from lvl_tables |
| A C128 is held at 1 MHz | traced | $D030 cleared every frame |
| The game's own crash screen ("ERROR" and "ADDRS") | traced | fatal_error, when a search runs out of room |

## Open questions

- What the files `TITLE1` and `TITLE2` hold: both load at `$7F00`-`$A7xx`
  during boot and are overwritten by `ALIEN` before the game's entry.
- Why the game loads `TAITO` between levels when nothing runs it (a disk
  check is a guess).
- The 500 points for trapping a Spritz were not found as a constant.
