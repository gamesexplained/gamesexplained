# The Living Daylights — verified technical facts

Current truth for this game. The workflow lives in `kit/skills/`; how this
understanding developed lives in `agent-history.md`. Every fact names
the routine or table it comes from. Unless marked *live*, a fact comes
from reading the code in the snapshot named in `orientation.md`; the
listing is built from `play-gibraltar.vsf`, taken in play on Gibraltar
after `init_machine` has run.

## Build

- The PAL disk (Domark, 1987) is the build analysed. Its loader `GM1` carries
  the text "PROTECTION GRAEME ASHTON 87" and decrypts the program file `TLD1`
  in place with a key the routine in `TLD8` returns (`orientation.md`).
- The title screen credits David Barbour for Sculptured Software Inc, Richard
  Naylor (designer) and David Whittaker (music and effects), © Domark 1987.
- The NTSC disk (Melbourne House) holds the same game under other file names
  (`BOND`, `LOCD`, `GR`, `DE`, `LAST`, `HID`, `COLOR`, `PIC`); `DE` and `HID`
  differ from `TLD3` and `TLD5` (`orientation.md`, file table). Its code was not
  analysed.

## Memory layout

| Thing | Where |
|---|---|
| Packed screens 3 and 4 (The Mansion, The Fairground) | `$0200-$10FF`, read by `huff_decode` through `huff_src` |
| Game code, tables and text | `$1100-$3FCE` |
| Two screens drawn on in turn | `$4000` and `$4400` (`$0153`-`$0155` bit 4) |
| Sprite shapes, pointers `$20`-`$C1` | `$4800-$707F` |
| More code: hazards, hard hat, map drawing, scrolling, colour RAM | `$7080-$77D3` |
| Character set: font, holes, blast, status line | `$7800-$79FF` |
| Level buffer: the level's characters, map (23 rows of 160) and colours | `$7A00-$9CBF`, rebuilt by `unpack_screen` at each level |
| Huffman tree | `$9D00-$9FFF` (flags, left, right) |
| Music and sound driver | `$A000-$ACCE` |
| Packed screens 0-2 and 5-9 | `$ACD1-$FF45`, `$D000-$DFFF` under the I/O chips (copied there from `$8D00` by `init_machine`) |

The processor port `$01` is `$35` in play; `init_machine` and `unpack_screen`
set `$34` to reach the RAM under the I/O chips.

## Timing

- Four raster interrupts a frame, each setting the next through `irq_next`:
  `irq_middle` at line `$92`, `irq_bottom` at `$CA`, `irq_panel` at `$EA` and
  `irq_top` at `$FB`. `irq_top` sets the frame flag `$90` that the play loop
  waits for, so the game moves once a frame.
- The music driver is called once a frame (`music_irq`, from `irq_panel`
  and from `irq_plain` on the text screens). A tune reads its next notes
  every sixth frame (`music_frame`, speed `$A175`).

## Controls

- Joystick in port 2 (`read_joystick`, `$DC00`). Standing, the stick moves the
  crosshair (sprite 0); right starts Bond running (`crosshair_right` stops at
  `$0131 = $A4` and sets `$6D`). Fire released over the play area shoots;
  released with the crosshair in the status panel (`$0133 >= $E0`) opens the
  weapon menu. Fire held 15 frames turns up into a jump and down into a duck
  (`stick_vertical`); running, up jumps and down with right rolls.
- F7 starts a game from the title (`title_screen`, `$DC01 = $F7`).
- RESTORE does nothing: the NMI vector points at an RTI (`init_machine`, `$3B56`).

## Graphics

- Three layers scroll at different speeds (`scroll_fine`): the top (screen rows
  0-11) one pixel a frame, the middle (rows 12-18) two and the bottom (rows
  19-22) three. Each layer has its own column count into the map (`$56`, `$57`,
  `$58`, 0-159) and is drawn a column at a time into the screen not shown, then
  swapped by its raster interrupt.
- Ten packed screens (`$012D`): 0-7 the levels, 8 Q branch and the title
  graphics, 9 the title and ending. Each is Huffman coded (`huff_decode`), then
  run-length coded with `$27` as the escape (`unpack_rle`), with its colours
  packed two to a byte (`expand_nybbles`).
- Bond is three sprites of the bottom half: sprite 6 his head and body, and
  sprites 4 and 5 the two halves of his legs, side by side below it
  (`bond_init`, `bond_run_anim`). The
  sprites are written twice a frame from two sets of shadows, `$15`-`$32` for
  the top half (`sprites_top`) and `$24`-`$4E` for the bottom (`sprites_bottom`).
- The hard hat is drawn into 25 of Bond's sprite shapes by EOR (`hard_hat_step`,
  one shape a frame) and taken off the same way at the next level
  (`hard_hat_remove`).

## Mechanics

- Five lives (`$0150`) and `$77` energy (`$012F`) at the start (`new_game`).
  A life is lost when the energy runs out (`draw_energy`); the energy is
  filled again for the next try.
- Eight levels (`$012E`): Gibraltar, Concert Hall, The Pipeline, The Mansion,
  The Fairground, Tangiers, Afghanistan and Whittakers House (`level_names`;
  "GIBRALTER" is spelt so at `$439E` on the status line).
- After each of the first six levels, Q branch offers four of the weapons and
  gives four counts of 90 frames to choose (`main`, `q_branch_choose`); the chosen
  one is the second weapon, with the Walther PPK. Losing a life replays the
  level; losing the last starts a new game (`main`).
- Weapons (`weapon_names`): Walther PPK, paint gun, crossbow, bazooka, sleep dart
  gun, grenade, ghetto blaster, missile pen, cigarette, bomb, dynamite, mortar,
  infra sight and hard hat. Weapons 5 and up are single use (`fire`).
- Gibraltar: the soldiers fire paint, and one at a time a soldier is the agent
  with live ammunition (`enemy_slot_init`, `$016F`, colour `$0B`); knocking him
  down ends the level (`enemy_hit_anim`).
- The Concert Hall's infra sight colours the enemies red and the other figures
  light red for 60 frames (`infra_sight_on`).
- The Pipeline: a pipe worker throws things from the gantry (`worker_update`,
  10 energy unless Bond jumps, rolls or wears the hard hat), and at three map
  columns something comes along the pipe (`pig_update`, 4 energy unless he rolls).
- The Mansion: a helicopter bombs the ground; each crater becomes an obstacle
  (`bomb_mark`, `obstacle_check`).
- The Fairground: 20 balloons (`fairground_init`, `$0129`); with none left and the
  door done the level ends (`door_clear`).
- Whittakers House: Whittaker's door is in reach at once and needs 27 hits of the
  Walther PPK (`level_start_specials`, `$010F = $1B`).

## Data tables

- `level_params` (`$1BC1`), `enemy_params` (`$1C90`) and `obstacle_params`
  (`$233F`) copy each level's settings from per-level tables.
- `q_item_ptr` (`$2B6A`) gives each weapon's Q branch picture; `$2B4A` the four
  weapons offered on each level.

## Sound

- David Whittaker's driver at `$A000`: five tunes in `tune_table` (`$A700`),
  three voices each reading an order list of patterns. `music_start` is called
  with tune 0 (title), 1 (Q branch), 2 (level complete) and 3 (Bond killed);
  nothing starts tune 4.
- Seventeen sound effects of 20 bytes each (`sfx_table`, `sfx_data`) on voices 1
  and 3; the helicopter's beat on voice 2 (`helicopter_sound_on`).

## The listing's error rate

Sample `sample-2617` (seed 2617): 60 of the listing's 790 comments, drawn
after the annotation and checked by one checker agent on claude-opus-5-5
that wrote none of them. Each finding was then read against the code, and
all 16 held: 16 of 60 wrong (26.7 %, 95 % interval 17.1 % to 39.0 %).
One was wrong outright (`$00A2` called a busy marker and cool-down a use
count); 15 had a wrong detail. The commonest kind was Bond's sprites: the
comments called sprites 4, 5 and 6 his head, body and legs, where sprite 6
is his head and body and 4 and 5 are the halves of his legs. Others named
the wrong score digit (the helicopter is worth 1000, not 100), took an x
held in two-pixel units for pixels (the helicopter's hit window and
sprite spacing), called a highest-first search the first, and gave sound
effects too narrow a use. All 16 were corrected, with the 14 other
comments that said the same things (the rest of Bond's sprite shadows and
pose tables, the helicopter's offsets and movement). The sample is over
the mark of 2 in 60, and an audit of every comment is recommended
(`TODO.md`).

## Live tests

- *live*: each level reached by poking `$012E` at the `$110C` checkpoint and
  screenshotted (`reference/level-1.png` to `level-8.png`).
