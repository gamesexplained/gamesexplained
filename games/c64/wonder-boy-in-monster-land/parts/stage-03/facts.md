# Load 3 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 3's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 3's map has 14 rows of 102 cells, stored 102 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8C05`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 3's sound pointers at `$7F58–$7F5D` select voice lists at `$970F`, `$9717` and `$971F`, whose records name six distinct patterns: `$9727`, `$9767`, `$97BA`, `$97F9`, `$984C` and `$987B`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names three six-byte trigger records at `$8FCC` (count at `$7F54`) and two sixteen-byte stage-object records at `$900F` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$8F95`, inside the eight-page character source at `$8C05`. The code there stores 2 in `$4DCB,X` for the selected player and jumps to `$0732` when `$6F3C` is `$64`, otherwise to `$0200`.

Load 3's handler at `$998C`, for entity types `$06` and `$14`, is a copy of load 16's handler at `$8EF0` moved up by `$A9C` bytes: its 212 instructions match once their internal addresses are moved, and so do its seven split-table targets and the eight animation offsets that follow. `test_entity_code_copies.py` checks this.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 2,232 input bytes to `$EB40–$FEBF` and 4,191 to `$7EDF–$9F50`. The decoder stops at the second stream's end marker, 181 bytes before the end of the file.

Load 3 has seven LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$8FEB`, `$9071`, `$9155`, `$9183`, `$91B7`, `$91E3` and `$9211`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.

The load's type-$01 entity vector selects a dispatcher at `$98C5`, whose three state-table pairs point to `$98DD`, `$9942` and `$9979`. It is load 2's type-$01 handler moved to this address.

Type-$01 state 0 at `$98DD` can select state 1 or 2 based on carry from `$732A` and the sign of `$1A6D,X`. Its other active paths update `$1AD3,X`, `$1AE4,X` and a frame byte and set `$1A7E,X` if clear; when `$1A29,X` is zero it only sets that flag if clear.

Type-$01 state 1 at `$9942` returns to state 0 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to `$1B28,X` and updates the frame. State 2 at `$9979` decrements `$1B17,X`, uses the same frame update when the result is nonzero, and calls `$4B0E` before jumping to `$5DB9` when it is zero.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8C05`) to `$717C`, which copies 2,048 bytes from `$8C05–$9404` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

Load 3's split row-pointer tables hold 81 pairs, all 102 bytes apart from `$8671`, the last at `$A651`; the map's 14 rows use the first 14. `test_later_row_pointer_tails.js` checks all pairs.

Entity record 6 at `$9F3C`, a moving platform (type `$FF`), names the motion entry `$8FAA` in its bytes 7 and 9, which `$68CB` patches into the JSR at `$68E5`. `$8FAA` points `$54/$55` at the 23-byte stream at `$8FB5` and jumps to the repeating-motion reader `$6A3A`; the `$80` at `$8FCB` makes the reader start the stream again. The stream also lies inside the character source at `$8C05`. `later-motion-streams.json` holds the decoded sequence.

Stage-object record 2 at `$901F` names the initializer `$902F`, which makes the entity in slot X a type-$07 entity with base frame `$C9`, sets its attributes, places it at screen X `$0100`, Y `$78`, and passes message `$9071` to `$77E0`. `test_later_object_inits.js` checks the field writes and the pointer.

Stage-object record 2 at `$901F` also names the result callback `$9085`, which returns A=`$0A` with carry clear.

Trigger record 2 at `$8FD2` names the message callback `$8FDE`, which passes `$8FEB` to `$77E0` and restores X through the operand it patches at `$8FE9`. `test_later_trigger_messages.js` checks the pointer and X.

Load 3 entity types `$07` and `$24` have state dispatchers at `$9B96` and `$9E28`, with seven and four targets. Type `$07` stores only 0 to 6 in its state, and type `$24` only 0 to 3. The first dispatcher lies in the bytes that visual-resource selector 2 copies as characters from `$9443`.

The type-$24 state-3 handler at `$9EB1` checks contact, decrements an entity timer and moves the frame back by 2 while the result is nonnegative. On expiry it decrements `$1AE4` of the parent slot that `$1AD3,X` names, then jumps to `$4454` with its own X restored.

The type-$24 state-0 handler at `$9E42` calls the detection and contact checks, selects a direction from the sign of `$1AE4,X` and can enter state 3 at `$9E99`.

Type-$24 state 1 calls the detection, contact and downward movement checks. State 2 calls state 0 and then state 1 even if state 0 changes the state, provided it returns normally.

Type-$07 states 3 and 4 at `$9CE0` and `$9D01` use `$1AD3,X` and `$1AF5,X` to control transitions; the first can fall through to the second.

Helper `$9D18` jumps to `$4342` for a zero `$19A1,X` or a value of `$50` or more, and returns for values `$01–$4F`. Helper `$9D25` selects one of two sources for `$7D` according to `$7A`.

Type-$07 state 5 at `$9DB6` branches on `$1A8F,X` and the sign of `$9E27`, selects a movement call and writes two frame numbers.

Type-$07 state 6 at `$9DE1` decrements `$1AC2,X` and either returns or calls `$4B20` and jumps to `$5DB9` with A=2.

Helper `$9DF1` checks two callback carry results. A set carry from `$732A` changes entity state and removes the helper's return address, skipping the rest of its caller; a clear carry leads to `$7227` and can call `$5D7A` and jump to `$9CD6`.

Type-$07 state 1 at `$9C80` checks a signed phase byte and either decrements it and jumps to `$4368` with A=8 or changes to state 2 and falls through. The helper `$9DF1` that it calls first can skip the rest of it.

Type-$07 state 2 at `$9C9A` calls the hit check and movement, then compares the player's X with the entity's through `$72FC`. When that carry differs from the sign of `$9E27` it resets the phase byte and enters state 3; otherwise it increments `$1B06,X` while it is below `$10`.

The phase calculation at `$9C5A` uses two subtract-with-borrow checks, divides a nonnegative remainder by eight, and stores a second value two less modulo 256.

The first part of type-$07 state 0 at `$9BB6` stores a callback carry as a sign bit, tests `$1AE4,X`, selects two frames, and branches at random-byte value `$BE`. These instructions lie in bytes that visual-resource selector 2 copies as characters.

The second part of type-$07 state 0 at `$9BEA` sets `$1AE4,X` to 3, runs the allocation loop three times from a counter of 2, and writes two direction-dependent frame numbers. These instructions also lie in bytes that visual-resource selector 2 copies as characters.

The child initializers `$9D38` and `$9D5C` make type-$24 entities. They add one of three offsets at `$9E24` (5, 20, 15), chosen by the parent's loop counter 2, 1 or 0, and share setup at `$9D8E`; both patch an immediate operand to restore Y.

28 of the 38 distinct handler addresses are one-byte RTS entries: `$9988–$998B` and `$9EF2–$9F09`. 34 of the 48 types select one of them.

