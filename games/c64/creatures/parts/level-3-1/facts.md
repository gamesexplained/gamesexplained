# Level 3.1 — verified technical facts

The file `LG`, loaded to `$5800-$ABFF` as stage 7, with world 3's
character set, sprites, tiles, tunes and code at `$A300-$ABFF`, which
level 3.2 runs too (the game's `facts.md`, "How the parts connect").
Unless marked *live*, a fact comes from the code and data in
`work/entry.vsf`.

## The stage

- "STAGE 3.1", "GRUESOME GRAVEYARD FOLLOWED BY / THE CREEPY CASTLE"
  (`stage_name`, `stage_line_1`, `stage_line_2`).
- 173 map columns (`level_end`, `$8B95`), 500 on the timer
  (`time_limit`, `$8CE5`), five sections.
- 126 spawn records from `$9000`: twenty-three flapping bats and twelve
  small ones, waving ghosts, worms that curl up, ghouls rising from
  mounds, zombies, rolling bombs, a spider on its thread, lightning and
  four broomsticks. Eleven Magic Potion Creatures are in plain view.
- Ten hidden records (type 55) become five potion creatures and four
  extra lives when their groups die; the tenth, record 44, belongs to
  no group, so nothing kills it.
- The end creature is a patterned block, slot 10 (`end_slot`).
- Its tune is at `$9C82` and its end tune at `$9F22`, both shared with
  level 3.2.

## Harmless creatures

- From stage 6 on, the engine lets five sprite frames touch Clyde
  without harm (`harmless_frames`, `$A300`; engine `player_hit`): the
  striped block `$E4`, a zombie facing out `$D9`, a zombie still rising
  from the ground `$99` and `$98`, and the small star `$8E`.

## The broomstick

- Touching a broomstick (frame `$8F`) mounts it (`broom_mount`,
  `$A305`): the special state starts, the level's routines take over his
  flight, frames and fire, the panel's label becomes BROOM and its gauge
  is filled. *Live*: `reference/play-3-1-broom.png`.
- On the broom Clyde has no spare hit: `broom_mount` keeps it in
  `saved_hits` (`$A5DE`) and clears it, so any touch kills him, and
  `broom_off` gives it back.
- He flies in all four directions. Holding a direction raises its speed
  a step a frame, to 13 sideways and 14 up or down, through the steps
  1 0 1 1 0 1 1 1 2 1 2 2 1 2 2 pixels a frame, so the broom reaches 2
  pixels a frame within a quarter of a second; pushing against the way
  he flies brakes before it turns him (`level_jump`, `$A3C5`;
  `broom_climb`, `$A490`; `broom_speeds`, `$A38B`). Fire does nothing
  (`level_fire`, `$A537`).
- The BROOM gauge is the same code as world 2's OXYGEN bar: a pixel
  every 63 frames, the first 51 frames after mounting, and the 25th
  step, about 31 seconds after mounting, ends the ride (`broom_drain`,
  `$A54F`). Then he falls, with his spare hit back (`broom_off`,
  `$A58C`).

## Spikes

- On foot, `level_player` (`$A39A`) reads the character two rows and
  two columns from Clyde's cell; `$5F` or `$F2`, the spikes of level
  3.2's castle, kill him whatever hits he had, past the invulnerability
  test.

## The moving scenery

- `level_frame` (`$A95F`). On frames the landscape does not scroll only
  the wall torches flicker, characters `$74-$77` swapping two frames.
- Below scroll position `$90`, the graveyard, the distant graves behind
  the wall rotate at three paces: `$EC` on three frames in four,
  `$E0-$E3` on every other frame, `$E4-$EB` on one frame in four.
- From `$90` on, the castle, four strips of small arches by the floor
  rotate, each row at its own pace: the top strip's rows 0-4 every fifth
  frame and rows 5-7 every third, the second strip's rows 1-2 every
  other frame and rows 4-7 on two frames in three, the third and bottom
  strips on three frames in four.

## For the shop

- The clues are for torture chamber 3: "EARTH CREATURES AREN'T ALWAYS AS
  HARMLESS AS THEY APPEAR TO BE.", "USE THE JAR OF ACID TO PREVENT
  BLOODSHED." and "GIVE THE BALL A BIG RUN UP." (`shop_clue_1`,
  `$8F0D`; `shop_clue_2`, `$9908`, the address the shop uses from stage
  7 on; `shop_clue_3`, `$9932`). The greeting warns Clyde with fewer
  than 3 lives.

## Leftovers

- Ten spawn records after the list's end mark (`spare_records`,
  `$985E-$9907`) are level 3.2's records 126-135, byte for byte at the
  same addresses.
- `$9FFB-$9FFF` holds "S0:LH", the disk drive's command to scratch the
  file `LH`, level 3.2's (`scratch_lh`); nothing reads it.
