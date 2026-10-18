# Level 3.2 — verified technical facts

The file `LH`, loaded as stage 8 to `$8700-$99FF` over level 3.1, whose
character set, sprites, tiles, code (the broomstick, the spikes) and
tunes it runs on (part `level-3-1`). Unless marked *live*, a fact comes
from the code and data in `work/entry.vsf`.

## The stage

- "STAGE 3.2", "DINGY DUNGEONS LEADING TO / THE FINAL CONFLICT"
  (`stage_name`, `stage_line_1`, `stage_line_2`).
- 182 map columns, the longest of the six (`level_end`, `$8B95`), 500
  on the timer (`time_limit`, `$8CE5`), five sections.
- 136 spawn records from `$9000`, the most of the six: twenty waving
  ghosts, sixteen bats, ten flames with faces, nine fireballs, claws,
  snapping heads, horned demons, melting hearts and two broomsticks.
  Fourteen Magic Potion Creatures and four extra lives are in plain
  view.
- Two hidden records (type 55), records 6 and 81, become extra lives.
- The end creature is a waving ghost, slot 4 (`end_slot`).
- The spikes, characters `$5F` and `$F2`, are in the castle at map
  columns 22-30 and 143-147; on foot they kill Clyde at once, spare hit
  or not (level 3.1's `level_player`).

## For the shop

- The clues are torture chamber 3's, as in level 3.1's file; the
  greeting warns Clyde with fewer than 3 lives (`shop_lives_mark`).

## Leftovers

- 36 bytes of `$66` at `$8FDA` that nothing reads, where level 3.1's
  file has zeros (`pad_8FDA`).
