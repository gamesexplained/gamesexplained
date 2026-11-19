# Load 25 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 25's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 25's map has 15 rows of 90 cells, stored 128 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8DF1`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 25's sound pointers at `$7F58–$7F5D` select voice lists at `$9526`, `$9532` and `$9536`, whose records name eight distinct patterns: `$954C`, `$958E`, `$95B0`, `$95D2`, `$9643`, `$964E`, `$9658` and `$9668`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names three six-byte trigger records at `$94AE` (count at `$7F54`) and one sixteen-byte stage-object record at `$94C0` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. Trigger record 1 (column 15, row 5, count 3) names the hidden-coin callback `$5C2A`, record 2 (column 42, row 3, count 2) the hidden-money-bag callback `$5BE1`, and record 3 (column 84, row 12) the resident `$7960`, which clears the selected player's flag `$40` and the game status `$5284` when the flag is set and otherwise puts the record's count back. The stage-object record (column 62, row 9) names the initializer `$94D0`, the result callback `$9522` and the alternate update loop `$073F`.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$9479`, inside the eight-page character source at `$8DF1`. The character source runs to `$95F0`, so it also takes in the gate pattern, the trigger and stage-object records, the initializer `$94D0` with its message, the result callback `$9522`, the voice lists, the first three sound patterns and the start of the fourth.

The update entry at `$9479` stores 8 in `$4DCB,X` for the selected player and sets the horizontal-motion gate `$E1`. If both `$4DB6` and `$4DB3` are zero, it takes the next value of the six-byte pattern `$FF`, 0, 0, `$FF`, 0, 0 at `$94A8`, advancing the index at `$94A7`, which wraps 6 to 0; otherwise it writes `$FF` and leaves the index unchanged. The two resident speed-update paths at `$0E58` and `$0FF2` return early on a zero gate, so while both bytes are zero they run one call in three. The entry then jumps to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 2,508 input bytes to `$EB40–$FDBF` and 4,793 to `$7EDF–$A493`. The second stream's end marker is the file's last byte.

Load 25 has one LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$950F`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.

The load's type-$22 entity vector selects a dispatcher at `$A37D`, whose three state-table pairs point to `$A395`, `$A3C8` and `$A40E`. The type's own code stores only 1 and 2 in its state, and the type-$05 allocation at `$9D7F` makes each type-$22 entity after `$447A` has cleared the slot's state, so it starts at 0. It is load 2's type-$22 handler, moved.

Type-$22 state 2 at `$A40E` increments a counter and updates a frame while the counter is below 2; otherwise it clears `$1B28` in the slot that `$1AD3,X` names and jumps to `$4454` with the original X.

Type-$22 state 1 at `$A3C8` can call a sign-selected movement routine, then uses carry from `$44DE` to increment a counter or initialize state 2.

Type-$22 state 0 at `$A395` enters the alternate-slot cleanup when `$1A29,X` is zero; otherwise it calls the collision helper and chooses a movement callback by a sign byte, and the callback's carry moves it to state 1.

The type-$22 collision helper at `$A432` returns directly or enters state-2 setup after either of two carry checks. State-2 setup returns to the helper's caller, so a state-0 call continues after it.

The load's type-$05 and type-$15 entity vectors select a dispatcher at `$9C84`, whose six state-table pairs point to `$9CA2`, `$9D30`, `$9DDE`, `$9E2A`, `$9E69` and `$9E8C`. The type's own code stores only 0 to 5 in its state; state 4 restores the state 0 to 3 that the event helper saved in `$1AE4,X`. It is load 17's type-$05 handler, moved; load 24 holds it too.

Type-$05 state 4 at `$9E69` decrements `$1AC2,X` and copies `$1AE4,X` to the state when the result is negative or when the movement callback, `$4574` or `$45BC` by the carry from `$72FC`, returns a value whose bits 1–2 are not 2.

Type-$05 state 5 at `$9E8C` decrements `$1AC2,X`. A negative result calls `$4B0E` with A=`$50` and jumps to `$5DB9` with A=`$14`; otherwise it reads the four frame offsets 4, 4, 2, 2 at `$9F12` by `$1AD3,X`, sets `$19C3,X` through `$9EB6` and advances `$1AD3,X`, wrapping at 4. The event helper clears `$1AD3,X` when it selects state 5.

Type-$05 helper `$9EC6` copies `$1B17,X` to `$9F0C` and calls `$792C` and `$732A`. Carry set from `$732A` selects state 4 for positive `$1A6D,X` or state 5 otherwise, sets `$1AC2,X` to 10 and discards one return address; the positive path also saves the previous state in `$1AE4,X` and sets the frame, and the other clears `$1AD3,X`. Carry clear calls `$7227` and may tail-jump to `$5D7A` with A=4.

Type-$05 states 2 and 3 at `$9DDE` and `$9E2A` call the event helper, set the frame from the four offsets 2, 2, 0, 0 at `$9F0E` by `$1AF5,X`, which wraps at 4 and which state 0 clears before selecting state 2, then decrement `$1AD3,X` and move by 4 through `$4574` or `$45BC`. A negative countdown or a callback result with bits 1–2 other than 2 triggers a transition: state 2 loads the timer from a patchable immediate byte (`$FF` in the load, set to 10 by state 0's far path), toggles bit 7 of `$1B17,X` and selects state 3; state 3 selects state 0.

Type-$05 state 0 at `$9CA2` calls the event helper and sets bit 7 of `$1B17,X` when `$72FC` returns carry clear, or clears it on carry set. It then selects state 1 when the X that `$71DB` returns differs from `$6F3C` by less than 20 and `$1B28,X` is zero, and state 2 otherwise, unless `$1A29,X` is zero, when it stays in state 0. Its state-2 path sets `$1AD3,X`=10 and patches the immediate byte at `$9E18`, which state 2 later loads, to 10.

Type-$05 state 1 at `$9D30` updates direction and frame, calls the event helper, then uses `$1AF5,X` and `$1B06,X` to choose a countdown, calls to `$4342` or `$4368`, or an allocation attempt at `$9D7F`. On set carry from `$190B`, it makes the new slot a type-$22 entity at the parent's position, stores the parent's slot in its `$1AD3` and sets the parent's `$1B28` to 1; either way it then restores the original index and selects state 0.

The type-$1E entity vector selects a dispatcher at `$9F28`, whose six state-table pairs point to `$9F46`, `$9FDB`, `$A07B`, `$A0C7`, `$A106` and `$A129`. The type's own code stores only 0 to 5 in its state; state 4 restores the state 0 to 3 that the event helper saved in `$1AE4,X`. Entity records 5 to 7 are type `$1E`.

Type-$1E state 4 at `$A106` decrements `$1AC2,X` and copies `$1AE4,X` to the state when the result is negative or when the movement callback, `$4574` or `$45BC` by the carry from `$72FC`, returns a value whose bits 1–2 are not 2.

Type-$1E state 5 at `$A129` decrements `$1AC2,X`. A negative result calls `$4B0E` with A=`$80` and jumps to `$5DB9`; otherwise it reads the four frame offsets 6, 6, 8, 8 at `$A1AD` by `$1AD3,X`, sets `$19C3,X` through `$A151` and advances `$1AD3,X`, wrapping at 4. The event helper clears `$1AD3,X` when it selects state 5.

Type-$1E helper `$A161` copies `$1B17,X` to `$A1A7` and calls `$792C` and `$732A`. Carry set from `$732A` selects state 4 for positive `$1A6D,X` or state 5 otherwise, sets `$1AC2,X` to 10 and discards one return address; the positive path also saves the previous state in `$1AE4,X` and sets the frame, and the other clears `$1AD3,X`. Carry clear calls `$7227` and may tail-jump to `$5D7A` with A=4.

Type-$1E states 2 and 3 at `$A07B` and `$A0C7` call the event helper, set the frame from the four offsets 2, 2, 4, 4 at `$A1A9` by `$1AF5,X`, which wraps at 4 and which state 0 clears before selecting state 2, then decrement `$1AD3,X` and move by 4 through `$4574` or `$45BC`. A negative countdown or a callback result with bits 1–2 other than 2 triggers a transition: state 2 loads the timer from a patchable immediate byte (`$FF` in the load, set to 10 by state 0's far path), toggles bit 7 of `$1B17,X` and selects state 3; state 3 selects state 0.

Type-$1E state 0 at `$9F46` calls the event helper and sets bit 7 of `$1B17,X` when `$72FC` returns carry clear, or clears it on carry set. It then selects state 1 when the X that `$71DB` returns differs from `$6F3C` by less than 20 and `$1B28,X` is zero or negative, and state 2 otherwise, unless `$1A29,X` is zero, when it stays in state 0. Its state-2 path sets `$1AD3,X`=10 and patches the immediate byte at `$A0B5`, which state 2 later loads, to 10.

Type-$1E state 1 at `$9FDB` calls its event helper, counts down `$1AF5,X` and then hops: it moves up by `$1B06,X` while counting it down from 6, calls the spawn helper `$A019` when it reaches zero, then moves down by its low seven bits while counting it up from `$80` to `$86`, and selects state 0.

The type-$1E spawn helper at `$A019` calls `$190B` and, when no slot is free, returns with X restored from Y. Otherwise it calls `$447A`, copies the position from slot Y into slot X, stores the parent's `$1B17` with bit 7 flipped in its `$1AE4`, makes it a type-$2D entity, stores the parent's slot in its `$1AD3` and sets the parent's `$1B28` to 1 before returning with X restored from Y.

The type-$2D dispatcher at `$A1B1` has one table pair, for state 0 at `$A1C5`, and nothing in the type changes the state. The handler removes the entity when `$1179` returns carry set, or when `$7227` does, after calling the player-damage routine `$5D7A` with A=8. Otherwise it rises and falls through `$4342` and `$44DE` on the counter `$1AC2,X`, and moves sideways through `$45BC` or `$4574` by the sign of `$1AE4,X` at a speed `$1AF5,X` that drops by one every eleven calls from 7; it reverses on a collision, and is removed after a move without one that leaves the speed at zero. Removal decrements `$1B28` in the slot that `$1AD3,X` names, the type-$1E parent, and jumps to `$4454`. The type-$1E spawn helper makes these entities.

The type-$1F entity dispatcher at `$A248` jumps through `$1AB1,X` to `$A260`, `$A280` or `$A30C`. The type's own code stores only 0 to 2 in its state: state 0 stores 0 and increments it, the event check stores 2 and saves the state 1 it interrupts in `$1B17,X`, and state 2 restores that. Stage-object record 1's initializer `$94D0` makes the type-$1F entity.

Type-$1F state 2 at `$A30C` sets the frames through `$A340`, moves the entity 8 to the right while `$1B28,X` is negative or 8 to the left otherwise, decrements `$1B28,X` and restores the state from `$1B17,X` when its low seven bits reach zero. The three frame helpers at `$A333`, `$A340` and `$A350` set the primary and secondary frames `$19C3,X` and `$19D4,X` from a base that `$72FC`'s carry selects, with different offsets.

Type-$1F state 0 at `$A260` stores a random countdown, with a random direction in bit 7, in `$1AD3,X` and a random hop flag in `$1AE4,X`, both from `$3020`, sets `$1AF5,X` to 7 and falls into state 1. State 1 at `$A280` either hops, while `$1AE4,X` is nonzero, or walks 10 a call in the direction bit 7 of `$1AD3,X` gives and returns to state 0 when that countdown runs out. Its event check then, on carry set from `$732A`, selects state 2 when `$1A6D,X` is positive, or adds score through `$4B20` and jumps to `$5DB9` when it is zero or negative; on carry clear it calls `$5D7A` with A=8 when `$7227` returns carry set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8DF1`) to `$717C`, which copies 2,048 bytes from `$8DF1–$95F0` to RAM at `$D000–$D7FF` as the stage character set.

Load 25's split row-pointer tables hold 81 pairs, all 128 bytes apart from `$8671`, the last at `$AE71`; the map's 15 rows use the first 15. `test_later_row_pointer_tails.js` checks all pairs.

Stage-object record 1 at `$94C0` names `$94D0`, inside the character source, in its bytes 6 and 7, and the resident alternate update loop `$073F`, which the record names in bytes 10 and 11, calls it through the patched JSR at `$0778` with X the free slot that `$190B` found. It makes that slot a type-$1F entity (sprite base `$D9`, parameter `$6E`, screen X `$00D2`, Y `$AD`) and passes message `$950F` ("HOB GOBLIN!") to `$77E0`. `test_later_object_inits.js` checks its field writes and message pointer.

Stage-object record 1 at `$94C0` names the result callback `$9522` in its bytes 8 and 9; it returns A=`$09` with carry set. `test_later_object_results.js` checks the return.

27 of the 38 distinct handler addresses are one-byte RTS entries: `$9C80–$9C83`, `$9F16–$9F27`, `$A37C` and `$A449–$A44C`. 34 of the 48 types select one of them.

Type-$1E state 3 at `$A0C7` advances its frame-offset index and selects state 0 when the countdown is negative or the movement callback returns a value whose bits 1–2 differ from 2. State 4 at `$A106` decrements its timer and can copy the saved state at `$1AE4,X` back to `$1AB1,X`. The event helper's alternate path, for a zero or negative `$1A6D,X`, discards one return address; its carry-clear path tail-calls `$5D7A` only on carry from `$7227`.

The four platform records at `$A44D`, `$A457`, `$A461` and `$A46B` (type `$FF`) name `$9C35` in their bytes 7 and 9, and the resident platform handler `$68CB` calls it through the JSR at `$68E5` and moves the platform down by the value it returns, or up by one for `$FF`, carrying a player who stands on it. While the player stands on the platform (`$4DB8` nonzero and `$4DB9` equal to X), the routine waits two calls on `$1AC2,X`, then raises the speed `$1AD3,X` by one a call up to 8, adds it to the distance `$1AB1,X` and returns it. Once the player has left, it counts `$1AC2,X` back down while still sinking, then clears the speed and returns `$FF` each call until the distance is back to 0.

