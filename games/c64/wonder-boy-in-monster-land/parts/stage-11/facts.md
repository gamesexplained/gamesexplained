# Load 11 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 11's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 11's map has 16 rows of 54 cells, stored 122 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8E11`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 11's sound pointers at `$7F58–$7F5D` select voice lists at `$9C59`, `$9C61` and `$9C69`, whose records name six distinct patterns: `$9C71`, `$9CA7`, `$9CF7`, `$9D2A`, `$9D7A` and `$9DC2`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names one six-byte trigger record at `$9638` (count at `$7F54`) and one sixteen-byte stage-object record at `$963E` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. The trigger record (column 1, row 12, count 1, argument `$FF`) names the resident callback `$7960`. The stage-object record names `$964E` in its bytes 6 and 7, `$969F` in bytes 8 and 9 and the resident alternate update loop `$073F` in bytes 10 and 11.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$95E9`, inside the eight-page character source at `$8E11`. The code there stores 4 in `$4DCB,X` for the selected player and jumps to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 1,679 input bytes to `$EB40–$FABF` and 4,393 to `$7EDF–$A111`. The decoder stops at the second stream's end marker, 24 bytes before the end of the file.

Load 11 has one LDX/LDY pair that loads a message record's address and jumps to `$77E0` a few bytes later: `$9686` names `$968D`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.

The type-$0E entity vector selects a dispatcher at `$9E47`, whose six state-table pairs point to `$9E65`, `$9E85`, `$9EB2`, `$9EC9`, `$9EFF` and `$9F1D`. The type's own code stores only 0 to 5 in its state. It is load 9's type-$0E handler, moved; load 20 holds it too.

Type-$0E state 4 at `$9EFF` counts down and either selects state 0 or calls a sign-selected movement routine. State 5 at `$9F1D` counts down and can call `$4B0E` and `$5DB9`.

Type-$0E state 1 at `$9E85` chooses a movement callback by the sign of `$1B28,X` and either updates a frame or sets a timer, increments the state, updates the frame and reverses direction.

Type-$0E states 2 and 3 at `$9EB2` and `$9EC9` update `$1AD3,X` and select the next state or a shared frame update; state 2 moves on when its count reaches zero, and state 3 counts up to 8.

Type-$0E state 0 at `$9E65` uses values returned by `$71DB` and compares `$6F3C` against the returned X to choose `$FA` or 0, then advances state and updates a frame. Its movement helper at `$9EEC` chooses a callback by the sign of `$1B28,X` and reverses it on carry.

The type-$0E shared collision check at `$9F40` can return normally, tail-call `$5D7A`, or select state 4 or 5 and discard its own return address so the calling handler returns immediately.

The load-11 type-$10 dispatcher at `$9FAB` jumps through two table pairs to `$9FC4` and `$A042`, after calling the frame helper `$A0BE`, which adds 6 to the frame when `$72FC` finds the entity at or right of the player and alternates the lower frame through a countdown in `$1AE4,X`. State 1 decrements `$1B28,X` and calls `$4B20` with A=3 before jumping to `$5DB9` with A=1 only when it reaches zero. `$447A` clears the state when `$964E` makes the entity, and the type's own code changes it only at `$A034`, from 0 to 1.

Type-$10 state 0 reads signed movement bytes from a 74-byte table at `$A052` and a 34-byte table at `$A09C`, selects callbacks by sign and wraps the indices `$1AC2,X` and `$1AD3,X` after reading at `$49` and `$21`; `$447A` clears both when the entity is made. It can select state 1 and set a 16-count timer when `$732A` returns carry set and `$1A6D,X` is zero or negative.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8E11`) to `$717C`, which copies 2,048 bytes from `$8E11–$9610` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

Load 11's split row-pointer tables hold 81 pairs, all 122 bytes apart from `$8671`, the last at `$AC91`; the map's 16 rows use the first 16. `test_later_row_pointer_tails.js` checks all pairs.

Stage-object record 1 at `$963E` names `$964E` in its bytes 6 and 7, and the resident alternate update loop `$073F` calls it through the patched JSR at `$0778` with X the free slot that `$190B` found. It makes that slot a type-$10 entity (sprite base `$D7`, parameter `$14`, screen X `$00FA`, Y `$96`) and passes message `$968D` ("KRAKEN!") to `$77E0`. `test_stage11_kraken_init.js` checks the fields and pointer.

Load-11 entries at `$95F4` and `$9616` pass the encoded streams at `$95FF` and `$9621` to the resident repeating-motion reader `$6A3A`. Each yields 38 values before resetting. The first stream's first 18 bytes, `$95FF–$9610`, are also the last bytes of the copied character source. Entity records 1 and 2 at `$A0F3` and `$A0FD`, both moving platforms, name the two entries in their bytes 7 and 9. `test_stage11_motion.js` checks literal, repeated and reset values.

Stage-object record 1 at `$963E` names the result callback `$969F` in its bytes 8 and 9; it returns A=`$F7` with carry set. `test_later_object_results.js` checks the return.

30 of the 38 distinct handler addresses are one-byte RTS entries: `$9E3A–$9E46`, `$9FAA` and `$A0E3–$A0F2`. 37 of the 48 types select one of them.

