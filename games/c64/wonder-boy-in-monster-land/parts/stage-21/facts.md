# Load 21 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 21's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 21's map has 13 rows of 82 cells, stored 99 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8B78`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 21's sound pointers at `$7F58–$7F5D` select voice lists at `$919B`, `$91A1` and `$91A7`, whose records name six distinct patterns: `$91AD`, `$9264`, `$92C5`, `$934C`, `$93BB` and `$9421`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names seven six-byte trigger records at `$916D` (count at `$7F54`) and no stage-object records: the count at `$7F57` is 0, so `$4655` returns without reading the pointer `$9197`. `$7979` copies the trigger fields, and `test_stage_records.js` checks the copies and descriptions. All seven trigger records name the hidden-money-bag callback `$5BE1`, with the bag's reward byte as argument; they sit at columns 11, 19, 34, 43, 51, 68 and 77, and the last has a count of 3, the others 1.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$9158`, inside the eight-page character source at `$8B78`. The code there stores 7 in `$4DCB,X` for the selected player and jumps to `$0732`, which loads the next part, when `$6F3D` is 12, otherwise to `$0200`. The character source runs to `$9377`, so it also takes in the trigger records, the four bytes at `$9197`, the voice lists and the first four sound patterns, the fourth only in part.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 638 input bytes to `$EB40–$F4BF` and 2,762 to `$7EDF–$973D`. The decoder stops at the second stream's end marker, 156 bytes before the end of the file.

The load's type-$09 and type-$1C entity vectors select a dispatcher at `$952E`, whose four state-table pairs point to `$9548`, `$9581`, `$9679` and `$969D`. The type's own code stores only 0 to 3 in its state. It is load 5's type-$09 handler, moved; loads 7, 13, 22 and 24 hold it too.

Type-$09 state 0 at `$9548` initializes fields from the X and Y returned by `$71DB`, calls `$3020` twice for a signed step (3 or -3) and a low nibble, increments the state byte and falls through to state 1.

The shared type-$09 animation routine at `$96BE` updates the frame and a signed countdown on even visits. If its nonnegative-phase addition of 8 wraps to zero, it returns carry set at `$96F4` before storing a frame or decrementing that countdown.

Type-$09 state 2 at `$9679` returns to state 1 when `$1A8F,X` is zero; otherwise it calls the shared routine and chooses `$4574` or `$45BC` from the sign of `$1B06,X`. State 3 at `$969D` returns on clear carry, or on set carry adds score by entity type (`$4B20` with `$30` for type `$1C`, `$4B0E` with `$50` otherwise) and jumps to `$5DB9`.

Type-$09 state 1 at `$9581` updates a signed step and frame, calls the contact routines and selects later states from their carry and the sign of `$1A6D,X`. Its direction helper at `$9657` stores `$F0` or `$10` in `$1AF5,X`: `$F0` when the column is at or beyond the map width `$7F4B`, or when the column minus 8, wrapping in eight bits, is still at or above the anchor `$1AC2,X`; `$10` when the column is below the anchor; otherwise the sign of a `$3020` result chooses. Its 103 instructions are the same, moved, in the other five loads.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8B78`) to `$717C`, which copies 2,048 bytes from `$8B78–$9377` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

Load 21's split row-pointer tables hold 81 pairs, all 99 bytes apart from `$8671`, the last at `$A561`; the map's 13 rows use the first 13. `test_later_row_pointer_tails.js` checks all pairs.

Load-21 entry `$94FC` passes the encoded stream at `$9507` to the resident repeating-motion reader `$6A3A`, which yields 36 values before resetting. Entity record 1 at `$970B`, a moving platform, names the entry in its bytes 7 and 9. `test_later_motion_streams.js` checks the decoded sequence.

30 of the 38 distinct handler addresses are one-byte RTS entries: `$9526–$952D` and `$96F5–$970A`. 36 of the 48 types select one of them. Type $0A's vector names `$96F4`, the RTS that ends the type-$09 animation routine.

