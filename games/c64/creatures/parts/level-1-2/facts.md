# Level 1.2 — verified technical facts

The file `LB`, loaded as stage 2 to `$8700-$ABFF` over level 1.1. Its
`$8700-$99FF` is this part; its `$9A00-$ABFF` is the witch's shop, which
the engine swaps up to `$E000`, so that level 1.2 runs on level 1.1's
character set, sprites, tiles, code and tunes (part `shop`; the game's
`facts.md`, "How the parts connect"). Unless marked *live*, a fact comes
from the code and data in `work/entry.vsf`.

## The stage

- "STAGE 1.2", "CREEPY CAVES FOLLOWED BY / WATERY FALLS" (`stage_name`,
  `stage_line_1`, `stage_line_2`). `reference/get-ready-1-2.png`.
- 172 map columns (`level_end`, `$8B95`), 800 on the timer
  (`time_limit`, `$8CE5`), five sections.
- The animation, colour-cycle and movement tables are byte for byte
  level 1.1's; the map, colours, sections, strings, spawn list and
  timer are its own.
- 114 spawn records from `$9000`: twenty-two owls, fourteen flattening
  discs, big-eyed worms, hooded hoppers, snakes. Fifteen Magic Potion
  Creatures and an extra life are in plain view.
- Four hidden records (type 55): records 33 and 36, in group 1, become
  an extra life and a potion creature of the third kind; record 78, in
  group 7, a potion creature of the second kind; record 101, in group 2,
  an extra life.
- The end creature is a double frog, slot 10 (`end_slot`); records 106
  to 113, the creatures at the end, wait asleep (wake delay `$FE`)
  until the scroll stops.
- The waterfall drops of world 1's code land here at three fixed
  heights in turn, y `$60`, `$80` and `$A0` (level 1.1's `fall_heights`,
  counted by `$1267`); on level 1.1 he lands on the first `$FB` he
  reaches at y `$96` or lower.

## For the shop

- The shop that runs after this file loads reads its texts from here:
  with fewer than 6 lives (`shop_lives_mark`, `$8EFB`) it greets Clyde
  with "YOU BETTER BE MORE CAREFUL".
- The three clues it sells are for torture chamber 1: "USE THE CANNON TO
  STOP THE JACK AND SAVE YOUR BUDDY CHIP.", "BE CAREFUL WHEN ATTACKING
  INNOCENT LITTLE EARTH CREATURES." and "REMEMBER THAT THE CANNON WILL
  NOT FIRE UNLESS IT HAS BEEN LIT." (`shop_clue_1`, `$8F0D`;
  `shop_clue_2`, `$9880`; `shop_clue_3`, `$98BB`).

## Leftovers

- `$9792-$987F`, where level 1.1 keeps its hidden message, holds a copy
  of memory at `$DF92-$E07F`, the end of the shop's character set and
  the start of the attract block, which nothing reads.
