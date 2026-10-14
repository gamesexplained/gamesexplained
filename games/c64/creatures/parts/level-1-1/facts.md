# Level 1.1 — verified technical facts

The file `LA`, loaded to `$5800-$ABFF` as stage 1 (the game's
`facts.md`, "How the parts connect"). It holds the level's character set
(`$5800`), sprites (`$6000`), tiles, map, colour and band tables, its
Get Ready screen's strings and strip, its spawn records (`$9000`), its
tunes, and the code of world 1 at `$A300-$ABFF`, which level 1.2 runs
too. The engine reads the tables at fixed addresses and calls the code
through five hooks (engine `level_begin`, and its `facts.md`, "The
level interface"). Unless marked *live*, a fact comes from the code and
data in `work/entry.vsf`.

## The stage

- The Get Ready screen calls it "STAGE 1.1", "LILLY LAKES LEADING TO /
  THE CAVES OF SLIME" (`stage_name`, `stage_line_1`, `stage_line_2`;
  the spelling is the file's). `reference/get-ready-1-1.png`.
- 177 map columns long (`level_end`, `$8B95`), with 600 on the timer
  (`time_limit`, `$8CE5`) and five sections to restart from after a
  life is lost (`section_ends`, `section_scroll`).
- 114 spawn records from `$9000` place its creatures as the landscape
  scrolls: fourteen owls, flattening discs, walking devils, red worms,
  hooded hoppers, balloons, a dragon at the end. Fifteen Magic Potion
  Creatures and an extra life are in plain view.
- The end creature is the green dragon, slot 5 (`end_slot`, `$8F0C`),
  asleep until the scroll stops at the end.
- Four records are of type 55, the hidden kind (engine `facts.md`,
  "Objects"): records 46, 47 and 48, at x 432 and y 158, become a potion
  creature of each kind when the flattening disc of their group dies
  (group 4, record 49); record 104 only puffs into smoke.
- Its tune is at `$9C7E` and its end tune, which starts within three
  columns of the end, at `$9F00` (`tune_addr`, `end_tune_addr`).

## Water

- Five characters are water that drowns Clyde on foot: `$FB`, `$F1`,
  `$FC`, `$E4` and `$E5` (`water_chars`, `$A300`). `level_player`
  (`$A305`) tests the four cells under his feet each frame; on foot over
  one of them he drowns with "GULP!" and no spare hit saves him
  (`level_player_water`, `$A33C`; engine `player_hurt`).
- A raft or lily pad carries him instead: on the first frame he is
  carried over water the special state `$122B` starts, and from then on
  the level's own routines stand in for the engine's jump, frames and
  fire (`level_jump`, `level_anim`, `level_fire`). He cannot fire while
  he rides (`level_fire` is an RTS).
- Pushing left or right he paddles: an oar on shot sprite 1, redrawn
  every other frame from four strokes, behind him; at rest he faces out
  with the oar put away (`level_anim`, `$A46C`).
- Up jumps him off what carries him (`level_jump`, `$A369`).
- Over character `$F4` the raft drops with him: the object carrying him
  is hidden, shot sprite 1 shows the raft as they fall, and where he
  reaches `$FB` again object 14 is put under him and carries him on
  (`level_jump_fall`, `$A3AD`; `level_jump_held`, `$A3FE`).

## The animated water

- `level_frame` (`$A8BA`) runs every frame. Every sixth frame the next
  of four frames goes into the water characters `$E4-$E7` and into
  `$35`; on every other frame the top three rows of `$FB` rotate a pixel
  right, and rows 0-3 of `$FC` every fourth frame and rows 4-7 every
  fifth.
- While the scroll position is in the first of the two ranges
  `world1_ranges` sets (engine `$CF9D`; columns `$5A-$64` here), the
  waterfall's characters run too: `$F8` and `$F9` take one of their
  eight and four frames each frame, `$F3-$F4` the next of four every
  other frame and `$F1-$F2` every fourth (`f3_lo`, `f1_lo`).
- With the music off, the water roars: `level_sound` (`$A9E2`) raises
  the sustain of sound effect 7 through one range of columns (`$4C-$5A`)
  and lowers it through the next (`$64-$72`), from the engine's ramps at
  `$CFC4` and `$CFD3`.

## Leftovers

- `$9792-$983A` holds a message nothing reads or prints: "THIS GAME
  TOOK 1 WEEK AND 10,000 CALLORIES TO MASTER AND TURNED US INTO
  VEGETABLES. SO, IT'S THANKS TO ABLEX FOR THEIR HOSPITALITY AND
  SUPPORT (AND ALL THE FREE FOOD)." (`hidden_message`).
- The shop's tables in this file (`shop_text_lo`, `shop_lives_mark`, the
  clues) are never read: the shop runs only after levels 1.2 to 3.2
  load, by which time level 1.2's file has replaced them (engine
  `loader_hand_over`).
