# Load 16 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 16's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 16's map has 14 rows of 21 cells, stored 21 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8797`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 16's sound pointers at `$7F58–$7F5D` select voice lists at `$8D0B`, `$8D13` and `$8D1B`, whose records name six distinct patterns: `$8D23`, `$8D63`, `$8DB6`, `$8DF5`, `$8E48` and `$8E77`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names one six-byte trigger record at `$8D01` (count at `$7F54`); its stage-object count at `$7F57` is 0, so `$4655` returns without reading the object pointer `$8D07`. `$7979` copies the trigger fields, and `test_stage_records.js` checks the copies and descriptions. The trigger record (column 113, row 7, count 1, argument 3) names the hidden-coin callback `$5C2A`; its column lies outside the map's 21 columns.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$8CE7`, inside the eight-page character source at `$8797`. The code there stores 5 in `$4DCB,X` for the selected player and jumps to `$0732` when `$6F3D` is zero and bit 6 of the player's flags `$4DE2,X` is set, otherwise to `$0200`. The character source runs to `$8F96`, so it also takes in the trigger record, the voice lists, the sound patterns, the motion stream and the first part of the entity handler at `$8EF0`.

The type-$06 and type-$14 vectors select a dispatcher at `$8EF0`, which calls `$792C`, then uses `$1AB1,X` to index split low/high tables at `$8F05/$8F0C`, patches the jump at `$8F02` and dispatches. The seven pairs target `$8F13`, `$8F4B`, `$8F7C`, `$8FAA`, `$9023`, `$904E` and `$907E`; the type's own code stores only 0 to 6 in its state. State 0 stores the entity's tile column, which `$71DB` returns in X, at `$8F22` into the immediate operand of the comparison at `$8F29` (`$FF` in the load), so the comparison sets carry when the player's column `$6F3C` is at or right of the entity's. Load 14 holds the same handler, moved, at `$A39C`. `test_stage16_patches.js` checks the table dispatch and the comparison.

The seven dispatch targets at `$8F13–$909B` implement different entity-state paths: initialization, a position-window check, movement and turning, position restoration, an effect path and a finishing countdown. Their exact field writes and calls are described at each entry in the listing. `test_stage16_handlers.js` checks representative branches.

The shared routine at `$909C` increments `$1AC2,X`, wrapping 8 to 0, uses it to index eight animation offsets at `$90F2` and updates the primary frame. When `$1A29,X` is nonzero it calls `$732A`: on carry set it chooses state 5 for a positive `$1A6D,X` or state 6 otherwise, and pops two stack bytes before returning, bypassing a caller continuation. On carry clear it calls `$7227` and, on carry set, `$5D7A` before jumping to `$8FFF`. `test_stage16_shared.js` checks representative paths. The index is 0 to 7 at the read: `$4494` clears `$1AC2,X` when the slot is set up, state 5 clears it again after holding `$19F6,X` there, and state 6, which counts it down from 10, never calls this routine.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 979 input bytes to `$EB40–$F43F` and 1,999 to `$7EDF–$9178`. The decoder stops at the second stream's end marker, 70 bytes before the end of the file.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

Load 16's split row-pointer tables hold 81 pairs, all 21 bytes apart from `$8671`, the last at `$8D01`; the map's 14 rows use the first 14. `test_later_row_pointer_tails.js` checks all pairs.

Load-16 entry `$8EC1` passes the encoded stream at `$8ECC` to the resident repeating-motion reader `$6A3A`, which yields 80 values before resetting. The stream's bytes, `$8ECC–$8EEA`, are also part of the copied character source. Entity records 6 to 10 at `$9146–$916E`, all moving platforms, name the entry in their bytes 7 and 9. `test_later_motion_streams.js` checks the decoded sequence.

31 of the 38 distinct handler addresses are one-byte RTS entries: `$8EEB–$8EEF` and `$90FA–$9113`. 38 of the 48 types select one of them.

