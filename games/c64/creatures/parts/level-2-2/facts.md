# Level 2.2 — verified technical facts

The file `LE`, loaded as stage 5 to `$8700-$99FF` over level 2.1, whose
character set, sprites, tiles, code (swimming and the OXYGEN bar) and
tunes it runs on (part `level-2-1`). Unless marked *live*, a fact comes
from the code and data in `work/entry.vsf`.

## The stage

- "STAGE 2.2", "PIRANHA PONDS LEADING TO / THE BLACK FOREST OF GATEAU"
  (`stage_name`, `stage_line_1`, `stage_line_2`).
- 158 map columns (`level_end`, `$8B95`), 600 on the timer
  (`time_limit`, `$8CE5`), five sections.
- 113 spawn records from `$9000`: twenty-five fuzzy imps, piranhas,
  shrimps, walking trees that rise from the ground, fireballs, hooded
  figures and, three times, the rising bubbles that refill the oxygen.
  Twelve Magic Potion Creatures are in plain view.
- One hidden record (type 55), record 102 in group 7, becomes an extra
  life.
- The end creature is a stone that flips over, slot 2 (`end_slot`).

## For the shop

- The clues are torture chamber 2's, as in level 2.1's file; the
  greeting warns Clyde with fewer than 3 lives (`shop_lives_mark`).

## Leftovers

- One spawn record after the list's end mark (`spare_record`, `$9781`)
  and level 1.1's x script 31 (`spare_move_8FE5`), which nothing reads.
- `$9792-$987F` holds the same copy of memory at `$DF92-$E07F` as level
  1.2's file (`leftover_9792`).
