# Load 22 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 22's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 22's map has 14 rows of 84 cells, stored 112 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8C91`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 22's sound pointers at `$7F58–$7F5D` select voice lists at `$9E5A`, `$9E64` and `$9E78`, whose records name eleven distinct patterns: `$9E8C`, `$9E99`, `$9ED3`, `$9F3D`, `$9F92`, `$9FB4`, `$9FD7`, `$9FF9`, `$A03E`, `$A058` and `$A072`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names three six-byte trigger records at `$9324` (count at `$7F54`) and two sixteen-byte stage-object records at `$9430` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. Trigger record 1 (column 0, row 1) names the message callback `$9336`; record 2 (column 29, row 10) names the resident `$7960`, which clears the selected player's flag `$40` and the game status `$5284` when the flag is set and otherwise puts the record's count back; record 3 (column 78, row 4, count 2) names the flute gate `$9373`. Stage-object record 1 names the initializer `$9450`, the result callback `$94A6` and the alternate update loop `$073F`; record 2 names `$94AA` in its bytes 10 and 11.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$9319`, inside the eight-page character source at `$8C91`. The code there stores 7 in `$4DCB,X` for the selected player and jumps to `$0200`. The character source runs to `$9490`, so it also takes in the trigger records, the trigger callbacks `$9336` and `$9373` with their messages, the stage-object records and all but the last byte of the initializer `$9450`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 2,379 input bytes to `$EB40–$FDBF` and 5,228 to `$7EDF–$A531`. The decoder stops at the second stream's end marker, 13 bytes before the end of the file.

The load's type-$09 and type-$1C entity vectors select a dispatcher at `$A094`, whose four state-table pairs point to `$A0AE`, `$A0E7`, `$A1DF` and `$A203`. The type's own code stores only 0 to 3 in its state. It is load 5's type-$09 handler, moved; loads 7, 13, 21 and 24 hold it too. Load 22's entity records include three of type $09 and four of type $1C.

Type-$09 state 0 at `$A0AE` initializes fields from the X and Y returned by `$71DB`, calls `$3020` twice for a signed step (3 or -3) and a low nibble, increments the state byte and falls through to state 1.

The shared type-$09 animation routine at `$A224` updates the frame and a signed countdown on even visits. If its nonnegative-phase addition of 8 wraps to zero, it returns carry set at `$A25A` before storing a frame or decrementing that countdown.

Type-$09 state 2 at `$A1DF` returns to state 1 when `$1A8F,X` is zero; otherwise it calls the shared routine and chooses `$4574` or `$45BC` from the sign of `$1B06,X`. State 3 at `$A203` returns on clear carry, or on set carry adds score by entity type (`$4B20` with `$30` for type `$1C`, `$4B0E` with `$50` otherwise) and jumps to `$5DB9`.

Type-$09 state 1 at `$A0E7` updates a signed step and frame, calls the contact routines and selects later states from their carry and the sign of `$1A6D,X`. Its direction helper at `$A1BD` stores `$F0` or `$10` in `$1AF5,X`: `$F0` when the column is at or beyond the map width `$7F4B`, or when the column minus 8, wrapping in eight bits, is still at or above the anchor `$1AC2,X`; `$10` when the column is below the anchor; otherwise the sign of a `$3020` result chooses. Its 103 instructions are the same, moved, in the other five loads.

Load 22 has seven LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$9343`, `$93FC`, `$940F`, `$9492`, `$955C`, `$9590` and `$95C3`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.

The type-$0B entity dispatcher at `$A25B` calls `$A468` and then jumps through `$1AB1,X` to one of seven targets: `$A27E`, `$A2A6`, `$A342`, `$A380`, `$A3BB`, `$A3EF` and `$A425`. The type's own code stores only 1 to 6 in the state (1 at `$A2A3` and `$A3DC`, 2 at `$A33F`, 3 at `$A2F1`, 4 at `$A375`, 5 or 6 at `$A495`) and at `$A421` restores the state the helper saved at `$A48B`. The load's one type-$0B object is set up by `$9450`, which bytes 6 and 7 of its stage record at `$9430` name. The alternate loop at `$073F` calls `$447A`, which clears the state, before it calls `$9450`, so the object starts at state 0.

The type-$0B helper at `$A468` rotates a working byte through carry from `$72FC` and copies it to `$1AC2,X`. With `$1A8F,X` zero, carry set from `$732A` selects state 5 for positive `$1A6D,X` or state 6 otherwise, before the dispatcher reads the state. Other paths call `$7227` and may tail-jump to `$5D7A` with A=4. The indexed write at `$A48B` that saves the state uses the entity slot in X, 0 to 16, within the seventeen bytes at `$A4C3`.

Type-$0B state 5 at `$A3EF` decrements `$1B28,X` and either restores the state from an indexed working location or sets the two sprite frames `$19C3,X` and `$19D4,X` and tail-calls a direction-selected movement routine. State 6 at `$A425` decrements `$1AC2,X` and on a negative result calls `$4B20` with A=3 before jumping to `$5DB9` with A=2. On the pass that selects state 6 it decrements the 10 the helper has just stored there; on every later pass the helper has first overwritten `$1AC2,X` with the rotated direction byte.

Type-$0B state 4 at `$A3BB` decrements `$1AE4,X` and, if it becomes negative, sets the two sprite frames, selects state 1, sets a five-count delay and conditionally jumps according to `$3020`.

Type-$0B state 3 at `$A380` copies an indexed direction byte and handles positive, zero and negative `$1AE4,X` values through `$4342` or `$4368` before jumping to another handler path or tail-calling a direction-selected movement routine. The indexed direction byte at `$A4B2`,X is the one state 1 stores at `$A2EC` just before it selects state 3.

Type-$0B state 2 at `$A342` decrements `$1AF5,X`, tail-calls a direction-selected movement routine, or updates a second countdown and either reverses direction or selects state 4 and sets the two sprite frames.

Type-$0B state 0 at `$A27E` sets `$1AD3,X` according to `$19F6,X`, initializes a direction and the two sprite frames, selects state 1 and falls through into it.

Type-$0B state 1 at `$A2A6` compares a direction-dependent difference with `$14`, then may call a movement routine, select state 3, or enter a close-range branch that selects state 4 or initializes state 2 and falls through.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8C91`) to `$717C`, which copies 2,048 bytes from `$8C91–$9490` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

Load 22's split row-pointer tables hold 81 pairs, all 112 bytes apart from `$8671`, the last at `$A971`; the map's 14 rows use the first 14. `test_later_row_pointer_tails.js` checks all pairs.

Stage-object record 1 at `$9430` names `$9450`, inside the character source, in its bytes 6 and 7, and the resident alternate update loop `$073F`, which the record names in bytes 10 and 11, calls it through the patched JSR at `$0778` with X the free slot that `$190B` found. It makes that slot a type-$0B entity (sprite base `$C5`, parameter `$30`, screen X `$00C8`, Y `$AE`) and passes message `$9492` ("BLUE KNIGHT!") to `$77E0`. `test_later_object_inits.js` checks its field writes and message pointer.

Stage-object record 1 at `$9430` names the result callback `$94A6` in its bytes 8 and 9; it returns A=`$F7` with carry set. `test_later_object_results.js` checks the return.

Trigger record 1 at `$9324` (column 0, row 1, count 1) names the message callback `$9336`, which passes `$9343` ("The Southern Island of Pororo.") to `$77E0` and restores X through the operand it patches at `$9341`. `test_later_trigger_messages.js` checks the pointer and X.

29 of the 38 distinct handler addresses are one-byte RTS entries: `$A08C–$A093` and `$A4D6–$A4EA`. 35 of the 48 types select one of them. Type $0A's vector names `$A25A`, the RTS that ends the type-$09 animation routine.

Trigger record 3 names `$9373`, which tests the selected player's flags `$4DE2,Y` masked by 7. For any value but 2 it shows "Nice View." (`$93FC`) and clears the trigger's remaining count `$487F,X`. For 2 it puts the count back when the map's width `$7F4B` already equals its row stride `$7F4A`; otherwise it copies the stride into the width, which opens the map's last 28 columns, shows "You tried playing the flute..." (`$940F`) and scrolls the view right a pixel a frame, moving the player with it, until the player's X is below `$AB`. Stage-object record 2 names `$94AA` in its bytes 10 and 11. For a flag value of 2 it changes the low three bits to 3, shows the charm messages `$955C`, `$9590` and `$95C3`, clears the message, and copies 72 glyph bytes from `$9514` to `$CCD0–$CD17` and nine colour bytes to the status panel's colour cells; for any other value it shows built-in message 22.

