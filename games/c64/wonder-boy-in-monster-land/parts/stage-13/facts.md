# Load 13 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 13's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 13's map has 44 rows of 22 cells, stored 22 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8A39`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 13's sound pointers at `$7F58–$7F5D` select voice lists at `$8FA8`, `$8FB2` and `$8FC6`, whose records name eleven distinct patterns: `$8FDA`, `$8FE7`, `$9021`, `$908B`, `$90E0`, `$9102`, `$9125`, `$9147`, `$918C`, `$91A6` and `$91C0`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names one six-byte trigger record at `$8F9E` (count at `$7F54`) and no sixteen-byte stage-object records (count at `$7F57`; the pointer names `$8FA4`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. The trigger record is six zero bytes: its remaining count is zero, so the dispatcher at `$48BF` skips it.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$8F89`, inside the eight-page character source at `$8A39`. The code there stores 5 in `$4DCB,X` for the selected player and jumps to `$0732` when `$6F3D` is `$2B`, the map's last row, otherwise to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 619 input bytes to `$EB40–$F43F` and 1,888 to `$7EDF–$973C`. The decoder stops at the second stream's end marker, 33 bytes before the end of the file.

The load's type-$09 entity vector selects a dispatcher at `$9541`, whose four state-table pairs point to `$955B`, `$9594`, `$968C` and `$96B0`. The type's own code stores only 0 to 3 in its state. It is the type-$09 handler of loads 5, 7, 21, 22 and 24, moved.

Type-$09 state 0 at `$955B` initializes fields from the X and Y returned by `$71DB`, calls `$3020` twice for a signed step (3 or -3) and a low nibble, increments the state byte and falls through to state 1.

The shared type-$09 animation routine at `$96D1` updates the frame and a signed countdown on even visits. If its nonnegative-phase addition of 8 wraps to zero, it returns carry set at `$9707` before storing a frame or decrementing that countdown.

Type-$09 state 2 at `$968C` returns to state 1 when `$1A8F,X` is zero; otherwise it calls the shared routine and chooses `$4574` or `$45BC` from the sign of `$1B06,X`. State 3 at `$96B0` returns on clear carry, or on set carry adds score by entity type (`$4B20` with `$30` for type `$1C`, `$4B0E` with `$50` otherwise) and jumps to `$5DB9`.

Type-$09 state 1 at `$9594` updates a signed step and frame, calls the contact routines and selects later states from their carry and the sign of `$1A6D,X`. Its direction helper at `$966A` stores `$F0` or `$10` in `$1AF5,X`: `$F0` when the column is at or beyond the map width `$7F4B`, or when the column minus 8, wrapping in eight bits, is still at or above the anchor `$1AC2,X`; `$10` when the column is below the anchor; otherwise the sign of a `$3020` result chooses. Its 103 instructions are the same, moved, in the other five loads.

The load's type-$03 entity vector selects a dispatcher at `$93DB`, whose three state-table pairs point to `$93F3`, `$94F8` and `$9532`. The type's own code stores only 0 to 2 in its state. It is load 1's type-$03 handler, moved.

Type-$03 state 1 at `$94F8` chooses a movement callback by a signed field and updates two frames; when the first frame addition wraps to zero, it calls both movement callbacks. State 2 at `$9532` calls `$4B20` and `$5DB9` with A=2.

The type-$03 state-0 entry at `$93F3` can return immediately, select state 1 or 2 based on callback carry and a signed field, or continue to the movement path.

The type-$03 state-0 movement tail at `$94AE` reads a signed byte from a 40-byte table at `$94D0`, calls `$4342` for negative values or `$4368` otherwise, and advances the returned Y with an equality wrap at 40.

The type-$03 state-0 frame path at `$942A` uses carry returned by `$72FC` and the parity of `$1B28,X` to update `$1AD3,X` and two frame bytes.

The type-$03 horizontal calculation at `$947C` subtracts 6 from negative magnitudes but 5 from nonnegative values before deciding whether to call a movement routine. The difference comes from carry left clear by ADC 1 on the negative path.

The load's type-$01 entity vector selects a dispatcher at `$91DA`, whose three state-table pairs point to `$91F2`, `$9257` and `$928E`. The type's own code stores only 0 to 2 in its state. It is load 2's type-$01 handler, moved.

Type-$01 state 0 at `$91F2` can select state 1 or 2 based on carry from `$732A` and the sign of `$1A6D,X`. Its other active paths update `$1AD3,X`, `$1AE4,X` and a frame byte and set `$1A7E,X` if clear; when `$1A29,X` is zero it only sets that flag if clear.

Type-$01 state 1 at `$9257` returns to state 0 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to `$1B28,X` and updates the frame. State 2 at `$928E` decrements `$1B17,X`, uses the same frame update when the result is nonzero, and calls `$4B0E` before jumping to `$5DB9` when it is zero.

The load's type-$02 entity vector selects a dispatcher at `$929D`, whose three state-table pairs point to `$92B5`, `$937F` and `$93B9`. The type's own code stores only 0 to 2 in its state. It is load 1's type-$02 handler, moved.

Type-$02 state 2 at `$93B9` computes a frame based on whether `$1AD3,X` equals `$80`, decrements `$1AE4,X` and can call `$4B0E` and `$5DB9`.

Type-$02 state 1 at `$937F` decrements a timer, chooses a movement callback by a signed byte, and either resets to state 0 or updates a frame.

The type-$02 helper at `$935A` toggles bit 7 of `$1AD3,X`. The frame helper at `$9363` patches an immediate operand to 0 or 8 and combines it with a timer bit and `$19E5,X`.

The type-$02 state-0 entry at `$92B5` can select state 1 or 2 or continue to the timer path.

The type-$02 state-0 timer path at `$92F8` can update a frame, select a movement callback, or reset a timer and toggle two direction bits.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8A39`) to `$717C`, which copies 2,048 bytes from `$8A39–$9238` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

Load 13's split row-pointer tables hold 81 pairs, all 22 bytes apart from `$8671`, the last at `$8D51`; the map's 44 rows use the first 44. `test_later_row_pointer_tails.js` checks all pairs.

28 of the 38 distinct handler addresses are one-byte RTS entries: `$953C–$9540` and `$9707–$971D`. 34 of the 48 types select one of them. `$9707` among them is also the last instruction of the animation routine at `$96D1`.

