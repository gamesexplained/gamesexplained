# Load 5 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 5's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 5's map has 14 rows of 92 cells, stored 104 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8C21`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 5's sound pointers at `$7F58–$7F5D` select voice lists at `$91EA`, `$91F4` and `$9208`, whose records name eleven distinct patterns: `$921C`, `$9229`, `$9263`, `$92CD`, `$9322`, `$9344`, `$9367`, `$9389`, `$93CE`, `$93E8` and `$9402`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names one six-byte trigger record at `$91E4` (count at `$7F54`) and no stage-object records (the count at `$7F57` is 0). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$91D1`, inside the eight-page character source at `$8C21`. The code there stores 3 in `$4DCB,X` for the selected player and jumps to `$0732` when `$6F3C` is 0, otherwise to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 566 input bytes to `$EB40–$F33F` and 2,591 to `$7EDF–$961F`. The decoder stops at the second stream's end marker, 145 bytes before the end of the file.

The load's type-$09 entity vector selects a dispatcher at `$9424`, whose four state-table pairs point to `$943E`, `$9477`, `$956F` and `$9593`. The type's own code stores only 0 to 3 in its state. Loads 7, 13, 21, 22 and 24 hold the same handler, moved.

Type-$09 state 0 at `$943E` initializes fields from the X and Y returned by `$71DB`, calls `$3020` twice for a signed step (3 or -3) and a low nibble, increments the state byte and falls through to state 1.

The shared type-$09 animation routine at `$95B4` updates the frame and a signed countdown on even visits. If its nonnegative-phase addition of 8 wraps to zero, it returns carry set at `$95EA` before storing a frame or decrementing that countdown.

Type-$09 state 2 at `$956F` returns to state 1 when `$1A8F,X` is zero; otherwise it calls the shared routine and chooses `$4574` or `$45BC` from the sign of `$1B06,X`. State 3 at `$9593` returns on clear carry, or on set carry adds score by entity type (`$4B20` with `$30` for type `$1C`, `$4B0E` with `$50` otherwise) and jumps to `$5DB9`.

Type-$09 state 1 at `$9477` updates a signed step and frame, calls the contact routines and selects later states from their carry and the sign of `$1A6D,X`. Its direction helper at `$954D` stores `$F0` or `$10` in `$1AF5,X`: `$F0` when the column is at or beyond the map width `$7F4B`, or when the column minus 8, wrapping in eight bits, is still at or above the anchor `$1AC2,X`; `$10` when the column is below the anchor; otherwise the sign of a `$3020` result chooses. Its 103 instructions are the same, moved, in the other five loads.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8C21`) to `$717C`, which copies 2,048 bytes from `$8C21–$9420` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply view-origin values that the code at `$33F7–$3408` later changes.

Load 5's split row-pointer tables hold 81 pairs, all 104 bytes apart from `$8671`, the last at `$A6F1`; the map's 14 rows use the first 14. `test_later_row_pointer_tails.js` checks all pairs.

31 of the 38 distinct handler addresses are one-byte RTS entries: `$941C–$9423` and `$95EA–$9600`. 38 of the 48 types select one of them. `$95EA` among them is also the last instruction of the animation routine at `$95B4`.

