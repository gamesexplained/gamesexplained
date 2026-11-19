# Load 8 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 8's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 8's map has 15 rows of 122 cells, stored 122 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8D97`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 8's sound pointers at `$7F58–$7F5D` select voice lists at `$9515`, `$951D` and `$9525`, whose records name six distinct patterns: `$952D`, `$9563`, `$95B3`, `$95E6`, `$9636` and `$967E`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names eight six-byte trigger records at `$94E5` (count at `$7F54`) and no stage-object records (the count at `$7F57` is 0). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$9487`, inside the eight-page character source at `$8D97`. The code there stores 4 in `$4DCB,X` for the selected player and jumps to `$0732` when `$6F3C` is 0 and `$6F3D` is 5 or more, otherwise to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 862 input bytes to `$EB40–$F5BF` and 3,250 to `$7EDF–$9AA3`. The decoder stops at the second stream's end marker, before the file's last bytes.

The load's type-$0C entity vector selects a dispatcher at `$9701`, whose four state-table pairs point to `$971B`, `$973F`, `$9758` and `$9776`. The type's own code stores only 0 to 3 in its state.

Type-$0C states 0, 1 and 2 at `$971B`, `$973F` and `$9758` call an event helper and, if it returns, increment a counter, count down a field or count it back up. State 0 selects state 1 at counter 10, state 1 selects state 2 when the field is negative, and state 2 returns to state 0 when the field equals its saved target.

Type-$0C state 3 at `$9776` uses `$1AC2,X` as a positive countdown or a negative phase and chooses a callback from the sign of `$97DF`; at the end of the phase it calls `$4B0E` with A=`$20` and jumps to `$5DB9`. The event helper at `$97B0` can select state 3 and remove its own return address so that it skips the rest of the calling handler.

The load's type-$0D entity vector selects a dispatcher at `$97E0`, whose five state-table pairs point to `$97FD`, `$9807`, `$9888`, `$98EA` and `$990D`. The type's own code stores only 0 to 4 in its state.

Type-$0D state 0 at `$97FD` sets `$1AD3,X` to `$32`, selects state 1 and falls through. State 3 at `$98EA` counts down and computes a sign-dependent frame, while state 4 at `$990D` can call `$4454` for the child slot saved in `$1B17,X` before calling `$4B0E` and `$5DB9`.

The type-$0D event helper at `$9929` selects state 3 or 4 on set carry from `$732A`, then removes its own return address and returns past the calling handler. On clear carry it returns normally or tail-calls `$5D7A`.

Type-$0D state 1 at `$9807` counts down, can select state 2, and can allocate another slot and make it a type-$25 entity at the same position. State 2 at `$9888` uses a signed direction and a callback result to choose between state 0 and frame updates.

The type-$25 entity dispatcher at `$9986` jumps through `$1AB1,X` to `$999C` or `$9A02`. The type's own code stores only 1 in its state, at `$9A3C`, and a new type-$25 entity starts at state 0.

Type-$25 state 1 at `$9A02` increments `$1AC2,X` and computes `$19C3,X` from `$19E5,X` and twice the old value, unless `$1AC2,X` equals 2. In that case it decrements `$1B28` in the slot named by `$1AD3,X`, restores the original X through a patched immediate operand and jumps to `$4454`.

Type-$25 helper `$9A24` calls `$792C` and `$1179`, then may call `$7227` and `$5D7A`. Its transition at `$9A2C` sets `$1AC2,X`=0, adds 2 to `$19E5,X` and sets `$1AB1,X`=1, then discards a return address. State 0 also jumps to the transition directly when its countdown goes negative; there the address it discards is the return to `$2039` pushed by the resident JSR at `$2036`, so its RTS leaves the entity loop `$1FC3` early, skipping the remaining slots and the record load at `$3622` for that pass.

Type-$25 state 0 at `$999C` decrements `$1B28,X`, checks `$1A29,X` and calls its event helper. A negative countdown jumps directly to the transition. Other paths update a four-bit phase through `$3020` and `$35C1`, or at countdown `$7E` build four parameters at `$35BD–$35C0` before calling `$34EA` and `$35C1`.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8D97`) to `$717C`, which copies 2,048 bytes from `$8D97–$9596` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply view-origin values that the code at `$33F7–$3408` later changes.

Load 8's split row-pointer tables hold 81 pairs, all 122 bytes apart from `$8671`, the last at `$AC91`; the map's 15 rows use the first 15. `test_later_row_pointer_tails.js` checks all pairs.

Entity records 1 and 6 at `$9A53` and `$9A85` are moving platforms (type `$FF`) that name the motion entries `$94A1` and `$94C3` in their bytes 7 and 9, which `$68CB` patches into the JSR at `$68E5`. Each entry points `$54/$55` at a 23-byte stream (`$94AC` and `$94CE`) and jumps to the repeating-motion reader `$6A3A`. The streams lie inside the character source at `$8D97`. `later-motion-streams.json` holds the decoded sequences.

29 of the 38 distinct handler addresses are one-byte RTS entries: `$96F6–$9700`, `$9976–$9985` and `$9A51`, `$9A52`. 37 of the 48 types select one of them.

Two bytes are not used by any instruction. `$97FC` (`$60`) follows the type-$0D dispatcher's two five-entry tables at `$97F2` and `$97F7`; the dispatcher would read it only for a state of 5 or more, which the type never stores. Nothing names `$9A50` (`$35`), between the type-$25 helper and the RTS entries.
