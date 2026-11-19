# Load 29 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 29's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 29's map has 14 rows of 48 cells, stored 48 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8911`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 29's sound pointers at `$7F58–$7F5D` select voice lists at `$A15F`, `$A163` and `$A167`, each naming one pattern: `$A16B`, `$A1EA` and `$A268`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names one six-byte trigger record at `$8F1A` (count at `$7F54`) and two sixteen-byte stage-object records at `$8F20` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. The trigger record holds column `$FF`, row `$FF`, count `$FF` and callback `$0000`. Both stage-object records lie at column 5, row 8: record 1, on screen 1, names the quest step `$8F40` in its bytes 10 and 11, and record 2, on screen 2, names the shop's item entry `$908D` and items `$15` and `$16` (8 bombs and tornado magic) in its bytes 4 and 5.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$8EF9`, inside the eight-page character source at `$8911`, which runs to `$9110` and so also takes in the trigger and stage-object records, the quest step `$8F40` and its messages and the start of the shop code. The entry stores 16 in `$4DCB,X` for the selected player, lowers `$4DB5` to 4 when it is 5 or more, and jumps to `$0732`, which loads the next part, when the player's tile column `$6F3C` is `$2E`, and to `$0200` otherwise.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 673 input bytes to `$EB40–$F43F` and 5,448 to `$7EDF–$A622`. The second stream's end marker is the file's last byte. The file holds other bytes at `$A3CF–$A3D1`: after the transfer, the resident patch routine `$2A90`, which `$7B04` calls, writes `JSR $2A7D` there for load 29 (`$2AF0–$2B00`).

The load's type-$0C entity vector selects a dispatcher at `$A2E6`. Its four state-table pairs point to `$A300`, `$A324`, `$A33D` and `$A35B`; the type's own code stores only 0, 1 and 2 (at `$A320`) and 3 (at `$A3B3`) in the state, and the entity-record loader starts each entity at 0, so the index stays within the table. Load 29's entity records at `$A5E6` include five of type `$0C`. It is load 8's type-$0C handler, moved.

Type-$0C states 0, 1 and 2 at `$A300`, `$A324` and `$A33D` call an event helper and, if it returns, increment a counter, count down a field or count it back up. State 0 selects state 1 at counter 10, state 1 selects state 2 when the field is negative, and state 2 returns to state 0 when the field equals its saved target.

Type-$0C state 3 at `$A35B` uses `$1AC2,X` as a positive countdown or a negative phase and chooses a callback from the sign of `$A3C4`; at the end of the phase it calls `$4B0E` with A=`$20` and jumps to `$5DB9`. The event helper at `$A395` can select state 3 and remove its own return address so that it skips the rest of the calling handler.

Load 29 has six LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$8FF2`, `$9028`, `$9062`, `$9584`, `$9446` and `$9468`. Another ten pairs load a record's address and jump to `$918D`, `$926D` or `$937A`, each of which calls `$77E0`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$93C9` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$9790` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$9335` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$9205`/`$920B` and `$921D`/`$9223` from offsets 2 and 3, and `$9363`/`$9369` from offsets 4 and 5.

The offset-4 targets are routines at `$9850`–`$98B5`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`. The `$4DD7` routine at `$987D` also calls the routine whose address the current stage-object record holds in its bytes 7 and 8, through the JSR it patches at `$9894`.

The offset-2 targets are drawing routines at `$9744`–`$978E`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$932A` buys the first item (`$943F`) when the incoming `$943A` is negative and the second (`$9440`) otherwise. It charges the item's packed-decimal price through `$9335` and, with too little gold, goes back to the wait loop at `$927A`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$9468` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$9301` reads `$9439` first: when it is nonzero it passes `$943A` to the stage-price choice at `$911D`. Otherwise a nonzero `$943A` goes to the item purchase at `$932A`, and a zero `$943A` passes message `$94A3` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$948C` when bit 1 is set.

The shop input choice at `$929E` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$943A`; when the new mode is nonzero and `$9439` is zero they pass the item now chosen to the message selector `$93C9`, and both call the cursor helper `$93B1`.

The shop initializer at `$9270` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$943A`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$927A` and `$928D` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$92AD` then jumps to `$91A4` when `$9439` is nonzero, or stores `$FF` in `$4753,X` and passes message `$947B`.

The type-$0F entity dispatcher at `$A3C7` returns when `$1A8F,X` is positive. Otherwise it calls `$2A7D`, through the `JSR $2A7D` that the resident patch writes at `$A3CF` after the load, which returns the state in Y clamped to 4, and its five table pairs select `$A3EB`, `$A404`, `$A479`, `$A4CB` and `$A4D1`. It is load 10's type-$0F handler, moved.

For type-$0F state 0, after two helpers return, `$1B28,X` increments; reaching `$14` changes it to 7 and increments `$1AB1,X`. State 3 sets `$1AB1,X` to zero.

Type-$0F state 4 decrements `$1AC2,X`. A nonnegative result sets `$19C3,X` from `$19E5,X` plus 4 or 10 according to the sign of `$1AE4,X`; a negative result calls `$4B0E` with A=`$40` and jumps to `$5DB9`.

Type-$0F helper `$A4F1` calls `$792C` and `$732A`. Carry set from `$732A` with positive `$1A6D,X` discards the helper return address and returns from the calling state; with zero or negative `$1A6D,X` it sets `$1AC2,X`=10, `$1A8F,X`=`$FF` and `$1AB1,X`=4. Other returning paths call `$7227` and tail-jump to `$5D7A` with A=8 if carry is set.

Type-$0F state 2 calls its event and frame helpers. If both return and `$1B28,X` equals 8, it clears the timer and state; otherwise it calls `$4368` with the timer and increments it. The frame helper selects `$1AE4,X` from the carry returned by `$72FC`, adds 6, `$19E5,X` and `$1B17,X` with carry propagation, and toggles bit 1 of `$1B17,X` when `$1B06,X` increments to 4.

Type-$0F state 1 calls its event and frame helpers. If they return and `$1B28,X` is nonzero, it calls `$4342` and decrements the timer. Otherwise, when `$1AC2,X` is zero, it increments it and calls `$190B`; on carry set it calls `$447A` and initializes the free slot as a type-$23 entity from this one, and in either case, or when `$1AC2,X` was already nonzero, it jumps to `$A400` to increment `$1AB1,X`. When `$190B` finds no free slot it returns X=`$FF`, so that increment lands on `$1BB0`, the offset of the `BCS` at `$1BAF` in the resident display code, and the entity stays in state 1 until its next call.

The type-$23 entity dispatcher at `$A52A` jumps through `$1AB1,X` to `$A540` or `$A5B8`. The type-$0F state-1 allocation path sets up this entity type after `$447A` has cleared the slot's state at `$A425`, and the type's own code stores only 1, by the increment at `$A57E`, so the state is 0 or 1.

Type-$23 state 1 calls `$792C` and `$7227`, optionally calls `$5D7A` with A=8, and decrements `$1AC2,X`. A nonnegative result subtracts 2 from `$19C3,X`; a negative result decrements `$1AC2` in the slot named by `$1AD3,X`, the type-$0F entity that spawned it, restores the original X through a patched immediate operand and jumps to `$4454`.

Type-$23 state 0 moves to state 1, through the transition at `$A56C`, when `$7227` returns carry set or when `$44DE` does. It moves the entity up by a positive `$1AC2,X` and decrements it; a zero `$1AC2,X` becomes `$80`, and for that or a negative value it passes the low seven bits to `$44DE` as a downward step. Its other paths update `$1AC2,X`, a motion countdown and `$1AE4,X` according to callback results.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8911`) to `$717C`, which copies 2,048 bytes from `$8911–$9110` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

The price formatter at `$93F6` splits an item's two packed price bytes into four digit values at `$9434`–`$9437` and blanks leading zeros. The routine at `$93DB` then writes the four cells, each through the digit writer `$93ED` with colour 1 in colour RAM.

Shop helper `$939E` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$93B1` adds one to the mode `$943A`, takes the cursor position from `$943B` at that index and passes it to `$719E` with Y = `$82`. The sampler at `$3C4C` reads joystick port 2 active-low into `$73` (left), `$74` (right) and `$70` (fire), and the cursor index, the selection byte plus one, stays 0 to 2 because the selection stays among `$FF`, 0 and 1.

The shop conditional-item resolver at `$9389` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 29 holds the same 34 message records as load 1, byte for byte, at `$9446–$9743`.

Load 29's split row-pointer tables hold 81 pairs, all 48 bytes apart from `$8671`, the last at `$9571`; the map's 14 rows use the first 14. `test_later_row_pointer_tails.js` checks all pairs.

The shop entry at `$908A` jumps to `$9090`, which writes the screen page plus one into `$93EF` and `$9439`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths. No stage-object record in this load names `$908A`.

The shop choice code at `$911D` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths. The shop timeout enters `$91A4` when the layout gate `$9439` is nonzero; it decrements `$4753,X` and passes message `$9545`.

The second shop entry at `$91B0` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$91FE` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$924D` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$9446` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

29 of the 38 distinct handler addresses are one-byte RTS entries: `$A2DB–$A2E5`, `$A3C5–$A3C6`, `$A51D–$A529` and `$A5E3–$A5E5`. 37 of the 48 types select one of them.

