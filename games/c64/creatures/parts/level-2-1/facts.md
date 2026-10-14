# Level 2.1 — verified technical facts

The file `LD`, loaded to `$5800-$ABFF` as stage 4, with world 2's
character set, sprites, tiles, tunes and code at `$A300-$ABFF`, which
level 2.2 runs too (the game's `facts.md`, "How the parts connect").
Unless marked *live*, a fact comes from the code and data in
`work/entry.vsf`.

## The stage

- "STAGE 2.1", "MANIC MEADOWS LEADING TO / PIRANHA PONDS"
  (`stage_name`, `stage_line_1`, `stage_line_2`).
- 161 map columns (`level_end`, `$8B95`), 750 on the timer
  (`time_limit`, `$8CE5`), five sections.
- 96 spawn records from `$9000`: seventeen fuzzy imps, piranhas, slugs,
  shrimps, walking trees, stretching creatures, hooded figures and,
  three times, rising bubbles. Eight Magic Potion Creatures, no extra
  life and no hidden record.
- The end creature is a crescent that splatters, slot 5 (`end_slot`).
- Its tune is at `$9C30` and its end tune at `$A9C6`, both shared with
  level 2.2.

## Swimming

- Pond water is character `$D0`. `level_player` (`$A334`) tests the
  four cells under Clyde's feet; stepping into water starts the special
  state, so the level's routines take over his up and down, his frames
  and his fire, his shots and flame stop, and the panel shows the OXYGEN
  bar (`swim_start`, `$A34D`). *Live*: `reference/play-2-1-swimming.png`.
- In the water up and down move him a pixel a frame, stopped by solid
  cells above or below; up, where the cell beside his head is the empty
  sky over the pond (`$FE`), jumps him out (`level_jump`, `$A36C`;
  `swim_sink`, `$A3B3`).
- He swims in four strokes, a step every sixth frame, wearing a diving
  helmet (frame `$8A`, shot sprite 1) with bubbles rising from it (shot
  sprite 2, frames `$88-$85`, a step every eighth frame), and fire does
  nothing (`level_anim`, `$A3C6`; `level_fire`, `$A3FD`).
- The OXYGEN bar, six byte columns of the panel's sprite blocks 2 and 3
  under the score, loses a two-bit pixel every 63 frames, right to left;
  24 steps empty it, and the 25th, about 31 seconds of swimming from a
  full bar, drowns him (`oxygen_drain`, `$A47F`; `oxygen_wait`,
  `$A301`). Stages 4 to 6 start with the first step 51 frames away
  (engine `stage_main_setup`).
- Touching the rising bubbles refills the bar (engine
  `player_hit_world2`, then `oxygen_refill`, `$A302`); coming up for air
  does not.

## The moving scenery

- `level_frame` (`$A8C3`): every sixth frame the ponds' surface,
  character `$D1`, takes the next of eight frames of ripples.
- While the landscape scrolls, five strips of four characters rotate a
  pixel right, against the scroll: the black grass tops `$E4-$E7` and
  the woods' four strips `$E8-$F7` every other frame, the green grass
  `$E0-$E3` every fourth. Moving more slowly than the landscape, they
  read as further away.

## For the shop

- The clues sold after this file loads are for torture chamber 2: "USE
  THE SWITCH TO CHANGE THE DIRECTION OF THE CONVEYOR BELT.", "SLEEPY
  EARTH CREATURES MUST BE WOKEN UP." and "RATS CAN'T RESIST BOXES OF
  NUTS." (`shop_clue_1`, `shop_clue_2`, `shop_clue_3`). The greeting
  warns Clyde with fewer than 7 lives (`shop_lives_mark`).

## Leftovers

- Thirty spawn records after the list's end mark (`spare_records`,
  `$9660-$985D`), which nothing reads, and five movement scripts no
  table names (`spare_moves`, `$8F8B`), the first byte for byte level
  1.1's x script 31.
- 86 bytes of music no tune reaches (`tune_leftover`, `$9F9D`), a
  stray movement script (`spare_move_AACB`) and 298 bytes of filler to
  the end of the file (`pad_AAD6`).
