# Load 24 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 24's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 24's map has 72 rows of 25 cells, stored 25 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8D79`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 24's sound pointers at `$7F58–$7F5D` select voice lists at `$9230`, `$9238` and `$9240`, whose records name six distinct patterns: `$9248`, `$9288`, `$92DB`, `$931A`, `$936D` and `$939C`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names four six-byte trigger records at `$91B5` (count at `$7F54`) and one sixteen-byte stage-object record at `$91CD` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. Trigger records 1, 3 and 4 name the hidden-money-bag callback `$5BE1` and record 2 the hidden-coin callback `$5C2A`, each with its reward byte as argument; the last has a count of 3, the others 1. The stage-object record (column 14, row 55) names the initializer `$91E1`, the result callback `$91DD` and the alternate update loop `$073F`.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$9199`, inside the eight-page character source at `$8D79`. The code there stores 8 in `$4DCB,X` for the selected player and jumps to `$0732`, which loads the next part, when `$6F3C` is `$17` and `$6F3D` is at least `$43`, otherwise to `$0200`. The character source runs to `$9578`, so it also takes in the trigger and stage-object records, the object callbacks `$91DD` and `$91E1` with their message, the voice lists and the six sound patterns.

The type-$06 and type-$14 vectors select a dispatcher at `$99EF`, which calls `$792C`, then uses `$1AB1,X` to index split low/high tables at `$9A04/$9A0B`, patches the jump at `$9A01` and dispatches. The seven pairs target `$9A12`, `$9A4A`, `$9A7B`, `$9AA9`, `$9B22`, `$9B4D` and `$9B7D`; the type's own code stores only 0 to 6 in its state. State 0 stores the entity's tile column, which `$71DB` returns in X, at `$9A21` into the immediate operand of the comparison at `$9A28` (`$FF` in the load), so the comparison sets carry when the player's column `$6F3C` is at or right of the entity's. It is load 16's handler, moved, and `test_entity_code_copies.py` compares its 212 instructions with load 16's. The shared routine at `$9B9B` indexes the eight animation offsets at `$9BF1` with `$1AC2,X`, which it wraps from 8 to 0.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 2,078 input bytes to `$EB40–$FDBF` and 4,436 to `$7EDF–$A238`. The second stream's end marker is the file's last byte.

The load's type-$09 and type-$1C entity vectors select a dispatcher at `$9BFB`, whose four state-table pairs point to `$9C15`, `$9C4E`, `$9D46` and `$9D6A`. The type's own code stores only 0 to 3 in its state. It is load 5's type-$09 handler, moved; loads 7, 13, 21 and 22 hold it too.

Type-$09 state 0 at `$9C15` initializes fields from the X and Y returned by `$71DB`, calls `$3020` twice for a signed step (3 or -3) and a low nibble, increments the state byte and falls through to state 1.

The shared type-$09 animation routine at `$9D8B` updates the frame and a signed countdown on even visits. If its nonnegative-phase addition of 8 wraps to zero, it returns carry set at `$9DC1` before storing a frame or decrementing that countdown.

Type-$09 state 2 at `$9D46` returns to state 1 when `$1A8F,X` is zero; otherwise it calls the shared routine and chooses `$4574` or `$45BC` from the sign of `$1B06,X`. State 3 at `$9D6A` returns on clear carry, or on set carry adds score by entity type (`$4B20` with `$30` for type `$1C`, `$4B0E` with `$50` otherwise) and jumps to `$5DB9`.

Type-$09 state 1 at `$9C4E` updates a signed step and frame, calls the contact routines and selects later states from their carry and the sign of `$1A6D,X`. Its direction helper at `$9D24` stores `$F0` or `$10` in `$1AF5,X`: `$F0` when the column is at or beyond the map width `$7F4B`, or when the column minus 8, wrapping in eight bits, is still at or above the anchor `$1AC2,X`; `$10` when the column is below the anchor; otherwise the sign of a `$3020` result chooses. Its 103 instructions are the same, moved, in the other five loads.

Load 24 has one LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$9220`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.

The load's type-$03 entity vector selects a dispatcher at `$95FB`, whose three state-table pairs point to `$9613`, `$9718` and `$9752`. The type's own code stores only 0 to 2 in its state. It is load 1's type-$03 handler, moved.

Type-$03 state 1 at `$9718` chooses a movement callback by a signed field and updates two frames; when the first frame addition wraps to zero, it calls both movement callbacks. State 2 at `$9752` calls `$4B20` and `$5DB9` with A=2.

The type-$03 state-0 entry at `$9613` can return immediately, select state 1 or 2 based on callback carry and a signed field, or continue to the movement path.

The type-$03 state-0 movement tail at `$96CE` reads a signed byte from a 40-byte table at `$96F0`, calls `$4342` for negative values or `$4368` otherwise, and advances the returned Y with an equality wrap at 40.

The type-$03 state-0 frame path at `$964A` uses carry returned by `$72FC` and the parity of `$1B28,X` to update `$1AD3,X` and two frame bytes.

The type-$03 horizontal calculation at `$969C` subtracts 6 from negative magnitudes but 5 from nonnegative values before deciding whether to call a movement routine. The difference comes from carry left clear by ADC 1 on the negative path.

The load's type-$22 entity vector selects a dispatcher at `$A0FA`, whose three state-table pairs point to `$A112`, `$A145` and `$A18B`. The type's own code stores only 1 and 2 in its state, and the type-$05 allocation at `$9858` makes each type-$22 entity after `$447A` has cleared the slot's state, so it starts at 0. It is load 2's type-$22 handler, moved.

Type-$22 state 2 at `$A18B` increments a counter and updates a frame while the counter is below 2; otherwise it clears `$1B28` in the slot that `$1AD3,X` names and jumps to `$4454` with the original X.

Type-$22 state 1 at `$A145` can call a sign-selected movement routine, then uses carry from `$44DE` to increment a counter or initialize state 2.

Type-$22 state 0 at `$A112` enters the alternate-slot cleanup when `$1A29,X` is zero; otherwise it calls the collision helper and chooses a movement callback by a sign byte, and the callback's carry moves it to state 1.

The type-$22 collision helper at `$A1AF` returns directly or enters state-2 setup after either of two carry checks. State-2 setup returns to the helper's caller, so a state-0 call continues after it.

The load's type-$05 and type-$15 entity vectors select a dispatcher at `$975D`, whose six state-table pairs point to `$977B`, `$9809`, `$98B7`, `$9903`, `$9942` and `$9965`. The type's own code stores only 0 to 5 in its state; state 4 restores the state 0 to 3 that the event helper saved in `$1AE4,X`. It is load 17's type-$05 handler, moved; load 25 holds it too.

Type-$05 state 4 at `$9942` decrements `$1AC2,X` and copies `$1AE4,X` to the state when the result is negative or when the movement callback, `$4574` or `$45BC` by the carry from `$72FC`, returns a value whose bits 1–2 are not 2.

Type-$05 state 5 at `$9965` decrements `$1AC2,X`. A negative result calls `$4B0E` with A=`$50` and jumps to `$5DB9` with A=`$14`; otherwise it reads the four frame offsets 4, 4, 2, 2 at `$99EB` by `$1AD3,X`, sets `$19C3,X` through `$998F` and advances `$1AD3,X`, wrapping at 4. The event helper clears `$1AD3,X` when it selects state 5.

Type-$05 helper `$999F` copies `$1B17,X` to `$99E5` and calls `$792C` and `$732A`. Carry set from `$732A` selects state 4 for positive `$1A6D,X` or state 5 otherwise, sets `$1AC2,X` to 10 and discards one return address; the positive path also saves the previous state in `$1AE4,X` and sets the frame, and the other clears `$1AD3,X`. Carry clear calls `$7227` and may tail-jump to `$5D7A` with A=4.

Type-$05 states 2 and 3 at `$98B7` and `$9903` call the event helper, set the frame from the four offsets 2, 2, 0, 0 at `$99E7` by `$1AF5,X`, which wraps at 4 and which state 0 clears before selecting state 2, then decrement `$1AD3,X` and move by 4 through `$4574` or `$45BC`. A negative countdown or a callback result with bits 1–2 other than 2 triggers a transition: state 2 loads the timer from a patchable immediate byte (`$FF` in the load, set to 10 by state 0's far path), toggles bit 7 of `$1B17,X` and selects state 3; state 3 selects state 0.

Type-$05 state 0 at `$977B` calls the event helper and sets bit 7 of `$1B17,X` when `$72FC` returns carry clear, or clears it on carry set. It then selects state 1 when the X that `$71DB` returns differs from `$6F3C` by less than 20 and `$1B28,X` is zero, and state 2 otherwise, unless `$1A29,X` is zero, when it stays in state 0. Its state-2 path sets `$1AD3,X`=10 and patches the immediate byte at `$98F1`, which state 2 later loads, to 10.

Type-$05 state 1 at `$9809` updates direction and frame, calls the event helper, then uses `$1AF5,X` and `$1B06,X` to choose a countdown, calls to `$4342` or `$4368`, or an allocation attempt at `$9858`. On set carry from `$190B`, it makes the new slot a type-$22 entity at the parent's position, stores the parent's slot in its `$1AD3` and sets the parent's `$1B28` to 1; either way it then restores the original index and selects state 0.

The type-$17 handler at `$9DCB` counts down a timer and sets its frame from it, and can allocate a type-$2C slot when its decremented timer is `$FC`. That timer resets to 20 even when the active-slot check skips allocation. Its event helper can call `$4B0E` and jump to `$5DB9`.

The type-$2C handler at `$9E7E` initializes parameters when `$1B28,X` is zero, aiming the entity at the position its type-$17 parent stored in `$1AC2,X` and `$1AD3,X`, or updates a position and frame before returning or jumping to `$4454` when it is nonzero. The type-$17 handler sets up the type-$2C slots: its `STA $1919,X` at `$9E0A` is the only one in load 24 that stores `$2C`.

The type-$1D dispatcher at `$9EF3` jumps through two table pairs to `$9F09` and `$9F63`; stage-object record 1's initializer `$91E1` makes the type-$1D entity. State 0 at `$9F09` saves X in the operand at `$9F1A`, calls `$190B` and `$4454` and makes the slot X they leave a type-$2F entity 24 pixels left of and 8 below the parent, whose `$1B28` keeps that slot; it then puts a random countdown in `$1AC2,X` and falls into state 1. It does not test the allocator's carry: when all 17 slots are in use, `$190B` returns X=`$FF` and each store lands `$FF` bytes past its array. State 1 sets a frame facing the player, calls the contact helper and, unless `$1A8F,X` is nonzero, moves the entity 2 pixels a frame in the direction bit 7 of `$1AC2,X` gives, reversing at screen X `$1F` and `$11F`; each move stores the signed step in the child's `$1B28`. When the low seven bits of `$1AC2,X` reach zero at the check, it draws a new countdown.

The type-$2F handler at `$A05F` builds a contact box from its display slot and tests it through `$1179` and `$7227`, which can call `$5D7A` with A=4. It then adds the signed step its type-$1D parent left in `$1B28,X` to its screen X and clears it, and adds a signed byte from `$56A8,Y` to the screen X while subtracting `$5778,Y` from its screen Y, where Y is `$80` plus half of `$1AB1,X`, modulo 16, and `$1AB1,X` counts up by one each call. It patches the immediate operand at `$A0E5` with 0 or `$FF` to extend the sign. Type $1D's state 0 makes the type-$2F entity.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8D79`) to `$717C`, which copies 2,048 bytes from `$8D79–$9578` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 39 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

Load 24's split row-pointer tables hold 81 pairs, all 25 bytes apart from `$8671`, the last at `$8E41`; the map's 72 rows use the first 72. `test_later_row_pointer_tails.js` checks all pairs.

Stage-object record 1 at `$91CD` names `$91E1`, inside the character source, in its bytes 6 and 7, and the resident alternate update loop `$073F`, which the record names in bytes 10 and 11, calls it through the patched JSR at `$0778` with X the free slot that `$190B` found. It makes that slot a type-$1D entity (sprite base `$EB`, parameter `$78`, screen X `$00D2`, Y `$AD`) and passes message `$9220` ("Demon!") to `$77E0`. `test_later_object_inits.js` checks its field writes and message pointer.

Stage-object record 1 at `$91CD` names the result callback `$91DD` in its bytes 8 and 9; it returns A=`$0A` with carry clear. `test_later_object_results.js` checks the return.

23 of the 39 distinct handler addresses are one-byte RTS entries: `$95F9–$95FA`, `$975C`, `$9BF9–$9BFA`, `$9DC2–$9DCA`, `$9EF1–$9EF2`, `$A0F7–$A0F9` and `$A1C6–$A1C9`. 27 of the 48 types select one of them. Types $0A and $19 select `$9DC1`, the RTS that ends the type-$09 animation routine.

