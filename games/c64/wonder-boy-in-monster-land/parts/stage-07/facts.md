# Load 7 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 7's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 7's map has 16 rows of 70 cells, stored 70 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8AD1`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 7's sound pointers at `$7F58–$7F5D` select voice lists at `$9845`, `$984F` and `$9863`, whose records name eleven distinct patterns: `$9877`, `$9884`, `$98BE`, `$9928`, `$997D`, `$999F`, `$99C2`, `$99E4`, `$9A29`, `$9A43` and `$9A5D`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names one six-byte trigger record at `$914C` (count at `$7F54`) and one sixteen-byte stage-object record at `$9152` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$9141`, inside the eight-page character source at `$8AD1`. The code there stores 3 in `$4DCB,X` for the selected player and jumps to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 2,207 input bytes to `$EB40–$FC3F` and 4,285 to `$7EDF–$9EFE`. The decoder stops at the second stream's end marker, 112 bytes before the end of the file.

The load's type-$09 entity vector selects a dispatcher at `$9A7F`, whose four state-table pairs point to `$9A99`, `$9AD2`, `$9BCA` and `$9BEE`. The type's own code stores only 0 to 3 in its state. It is the type-$09 handler of loads 5, 7, 13, 21, 22 and 24, moved.

Type-$09 state 0 at `$9A99` initializes fields from the X and Y returned by `$71DB`, calls `$3020` twice for a signed step (3 or -3) and a low nibble, increments the state byte and falls through to state 1.

The shared type-$09 animation routine at `$9C0F` updates the frame and a signed countdown on even visits. If its nonnegative-phase addition of 8 wraps to zero, it returns carry set at `$9C45` before storing a frame or decrementing that countdown.

Type-$09 state 2 at `$9BCA` returns to state 1 when `$1A8F,X` is zero; otherwise it calls the shared routine and chooses `$4574` or `$45BC` from the sign of `$1B06,X`. State 3 at `$9BEE` returns on clear carry, or on set carry adds score by entity type (`$4B20` with `$30` for type `$1C`, `$4B0E` with `$50` otherwise) and jumps to `$5DB9`.

Type-$09 state 1 at `$9AD2` updates a signed step and frame, calls the contact routines and selects later states from their carry and the sign of `$1A6D,X`. Its direction helper at `$9BA8` stores `$F0` or `$10` in `$1AF5,X`: `$F0` when the column is at or beyond the map width `$7F4B`, or when the column minus 8, wrapping in eight bits, is still at or above the anchor `$1AC2,X`; `$10` when the column is below the anchor; otherwise the sign of a `$3020` result chooses.

Load 7 has one LDX/LDY pair that loads a message record's address with a call or jump to `$77E0` a few bytes later; it names `$91A1`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.

The type-$0B entity dispatcher at `$9C46` calls `$9E53` and then jumps through `$1AB1,X` to one of seven targets: `$9C69`, `$9C91`, `$9D2D`, `$9D6B`, `$9DA6`, `$9DDA` and `$9E10`. The type's own code stores only 1 to 6 in the state (1 at `$9C8E` and `$9DC7`, 2 at `$9D2A`, 3 at `$9CDC`, 4 at `$9D60`, 5 or 6 at `$9E80`) and at `$9E0C` restores the state the helper saved at `$9E76`. The load's one type-$0B object is set up by `$9162`, which bytes 6 and 7 of its stage record at `$9152` name. The alternate loop at `$073F` calls `$447A`, which clears the state, before it calls `$9162`, so the object starts at state 0.

The type-$0B helper at `$9E53` rotates a working byte through carry from `$72FC` and copies it to `$1AC2,X`. With `$1A8F,X` zero, carry set from `$732A` selects state 5 for positive `$1A6D,X` or state 6 otherwise, before the dispatcher reads the state. Other paths call `$7227` and may tail-jump to `$5D7A` with A=4. The indexed write at `$9E76` that saves the state uses the entity slot in X, 0 to 16, within the seventeen bytes at `$9EAE`.

Type-$0B state 5 at `$9DDA` decrements `$1B28,X` and either restores the state from an indexed working location or sets the two sprite frames `$19C3,X` and `$19D4,X` and tail-calls a direction-selected movement routine. State 6 at `$9E10` decrements `$1AC2,X` and on a negative result calls `$4B20` with A=3 before jumping to `$5DB9` with A=2. On the pass that selects state 6 it decrements the 10 the helper has just stored there; on every later pass the helper has first overwritten `$1AC2,X` with the rotated direction byte.

Type-$0B state 4 at `$9DA6` decrements `$1AE4,X` and, if it becomes negative, sets the two sprite frames, selects state 1, sets a five-count delay and conditionally jumps according to `$3020`.

Type-$0B state 3 at `$9D6B` copies an indexed direction byte and handles positive, zero and negative `$1AE4,X` values through `$4342` or `$4368` before jumping to another handler path or tail-calling a direction-selected movement routine. The indexed direction byte at `$9E9D`,X is the one state 1 stores at `$9CD7` just before it selects state 3.

Type-$0B state 2 at `$9D2D` decrements `$1AF5,X`, tail-calls a direction-selected movement routine, or updates a second countdown and either reverses direction or selects state 4 and sets the two sprite frames.

Type-$0B state 0 at `$9C69` sets `$1AD3,X` according to `$19F6,X`, initializes a direction and the two sprite frames, selects state 1 and falls through into it.

Type-$0B state 1 at `$9C91` compares a direction-dependent difference with `$14`, then may call a movement routine, select state 3, or enter a close-range branch that selects state 4 or initializes state 2 and falls through.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8AD1`) to `$717C`, which copies 2,048 bytes from `$8AD1–$92D0` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply view-origin values that the code at `$33F7–$3408` later changes.

Load 7's split row-pointer tables hold 81 pairs, all 70 bytes apart from `$8671`, the last at `$9C51`; the map's 16 rows use the first 16. `test_later_row_pointer_tails.js` checks all pairs.

Stage-object record 1 at `$9152` names the initializer `$9162` in its bytes 6 and 7. It makes the entity in slot X a type-$0B entity with base frame `$C5`, places it at screen X `$00C8`, Y `$AE`, and passes message `$91A1` to `$77E0`. `test_later_object_inits.js` checks the field writes and the pointer.

Stage-object record 1 at `$9152` also names the result callback `$91B4`, which returns A=`$00` with carry clear.

30 of the 38 distinct handler addresses are one-byte RTS entries: `$9A77–$9A7E`, `$9C45` and `$9EC1–$9ED5`. 37 of the 48 types select one of them. `$9C45` among them is also the last instruction of the animation routine at `$9C0F`.

