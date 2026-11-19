# Load 10 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 10's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 10's map has 14 rows of 48 cells, stored 48 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8911`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 10's sound pointers at `$7F58–$7F5D` select voice lists at `$9D7B`, `$9D7F` and `$9D83`, whose records name three distinct patterns: `$9D87`, `$9E06` and `$9E84`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names one six-byte trigger record at `$8F1A` (count at `$7F54`) and one sixteen-byte stage-object record at `$8F20` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. The trigger record holds `$FF` in its column, row, count and argument, outside the map's 48 columns and 14 rows, and `$0000` as its callback. The stage-object record names `$9552` in its bytes 10 and 11, and `$9552` jumps to the shop's item-pair entry `$9675`.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$8EF9`, inside the eight-page character source at `$8911`. The code there stores 4 in `$4DCB,X` for the selected player, lowers `$4DB5` to 4 when it is 5 or more, and jumps to `$0732` when `$6F3C` is `$2E`, otherwise to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 652 input bytes to `$EB40–$F43F` and 4,789 to `$7EDF–$A23E`. The decoder stops at the second stream's end marker, 147 bytes before the end of the file. After the transfer, `$7B04` calls the resident routine `$2A90`, which for this load writes `JSR $2A7D` over `$9FEB–$9FED` in the type-$0F dispatcher.

The load's type-$0C entity vector selects a dispatcher at `$9F02`, whose four state-table pairs point to `$9F1C`, `$9F40`, `$9F59` and `$9F77`. The type's own code stores only 0 to 3 in its state. It is load 8's type-$0C handler, moved.

Type-$0C states 0, 1 and 2 at `$9F1C`, `$9F40` and `$9F59` call an event helper and, if it returns, increment a counter, count down a field or count it back up. State 0 selects state 1 at counter 10, state 1 selects state 2 when the field is negative, and state 2 returns to state 0 when the field equals its saved target.

Type-$0C state 3 at `$9F77` uses `$1AC2,X` as a positive countdown or a negative phase and chooses a callback from the sign of `$9FE0`; at the end of the phase it calls `$4B0E` with A=`$20` and jumps to `$5DB9`. The event helper at `$9FB1` can select state 3 and remove its own return address so that it skips the rest of the calling handler.

Load 10 has three LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$9A49`, `$990B` and `$992D`. Another ten pairs load a record's address and jump to a shared `JSR $77E0`: nine to `$9732` and `$983F`, and the one at `$960B`, with A = 4, to `$9652`, which `$964C` also falls into. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$988E` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$9C55` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$97FA` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$96CA`/`$96D0` and `$96E2`/`$96E8` from offsets 2 and 3, and `$9828`/`$982E` from offsets 4 and 5.

The offset-4 targets are routines at `$9D15`–`$9D7A`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`.

The offset-2 targets are drawing routines at `$9C09`–`$9C53`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$97EF` buys the first item (`$9904`) when the incoming `$98FF` is negative and the second (`$9905`) otherwise. It charges the item's packed-decimal price through `$97FA` and, with too little gold, goes back to the wait loop at `$973F`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$992D` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$97C6` reads `$98FE` first: when it is nonzero it passes `$98FF` to the stage-price choice at `$95E2`. Otherwise a nonzero `$98FF` goes to the item purchase at `$97EF`, and a zero `$98FF` passes message `$9968` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$9951` when bit 1 is set.

The shop input choice at `$9763` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$98FF`; when the new mode is nonzero and `$98FE` is zero they pass the item now chosen to the message selector `$988E`, and both call the cursor helper `$9876`.

The shop initializer at `$9735` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$98FF`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$973F` and `$9752` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$9772` then jumps to `$9669` when `$98FE` is nonzero, or stores `$FF` in `$4753,X` and passes message `$9940`.

The type-$0F entity dispatcher at `$9FE3` returns when `$1A8F,X` is positive. Otherwise it calls `$2A7D`, which clamps the state index to 4, and jumps through five table pairs to `$A007`, `$A020`, `$A095`, `$A0E7` and `$A0ED`. The type's own code stores only 0 to 4 in its state.

Type-$0F state 0 at `$A007` calls its event and frame helpers; if both return, `$1B28,X` increments, and reaching `$14` changes it to 7 and increments `$1AB1,X`. State 3 at `$A0E7` sets `$1AB1,X` to zero.

Type-$0F state 4 at `$A0ED` decrements `$1AC2,X`. A nonnegative result sets `$19C3,X` from `$19E5,X` plus 4 or 10 according to the sign of `$1AE4,X`; a negative result calls `$4B0E` with A=`$40` and jumps to `$5DB9`.

Type-$0F helper `$A10D` calls `$792C` and `$732A`. Carry set from `$732A` with positive `$1A6D,X` discards the helper return address and returns from the calling state; with zero or negative `$1A6D,X` it sets `$1AC2,X`=10, `$1A8F,X`=`$FF` and `$1AB1,X`=4. Other returning paths call `$7227` and tail-jump to `$5D7A` with A=8 if carry is set.

Type-$0F state 2 at `$A095` calls its event and frame helpers. If both return and `$1B28,X` equals 8, it clears the timer and the state; otherwise it calls `$4368` with the timer in A and increments the timer. The frame helper at `$A0B4` sets `$1AE4,X` to `$F9` when `$72FC` returns carry set and to 0 otherwise, adds 6, `$19E5,X` and `$1B17,X` with carry propagation to make the frame, and each time `$1B06,X` counts up to 4 resets it and toggles bit 1 of `$1B17,X`.

Type-$0F state 1 at `$A020` calls its event and frame helpers. If they return and `$1B28,X` is nonzero, it calls `$4342` and decrements the timer. When the timer is zero and `$1AC2,X` is nonzero, it advances the state. Otherwise it increments `$1AC2,X` and calls `$190B`. With a free slot (carry set) it calls `$447A`, makes a type-$23 entity at its own position and direction with frame `$AD`, stores its own slot in the new entity's `$1AD3`, and advances its state. With no free slot `$190B` returns X=`$FF`, so the increment at `$A01C` lands on `$1BB0`, the offset byte of the branch at `$1BAF` in the resident display code, instead of the state; the entity advances on its next pass, because `$1AC2,X` is now nonzero.

The type-$23 entity dispatcher at `$A146` jumps through `$1AB1,X` to `$A15C` or `$A1D4`. The type's own code stores only 1 in its state, at `$A19A`, and type-$0F state 1 makes each type-$23 entity after `$447A` has cleared the slot's state, so it starts at 0.

Type-$23 state 1 at `$A1D4` calls `$792C` and `$7227`, calls `$5D7A` with A=8 when `$7227` returns carry set, and decrements `$1AC2,X`. A nonnegative result subtracts 2 from `$19C3,X`; a negative result decrements `$1AC2` in the slot named by `$1AD3,X`, the type-$0F entity that made it, restores the original X through a patched immediate operand and jumps to `$4454`.

Type-$23 state 0 at `$A15C` calls `$792C` and `$7227`; on carry set it calls `$5D7A` with A=8 and enters the transition at `$A188`. Otherwise a positive `$1AC2,X` is passed to `$4342` and decremented; zero (replaced by `$80`) or a negative value passes its low seven bits to `$44DE`, and carry set from `$44DE` also enters the transition, which sets `$1AC2,X` to 2, the frame to `$AB`, `$1A07,X` to 7 and the state to 1. On the other paths `$1AC2,X` counts up to `$88` after a `$44DE` call, and while `$1AF5,X` is nonzero the entity moves sideways through `$45BC` or `$4574` by the sign of `$1AE4,X`, reversing on carry; `$1AF5,X` counts down once every three passes.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8911`) to `$717C`, which copies 2,048 bytes from `$8911–$9110` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

The price formatter at `$98BB` splits an item's two packed price bytes into four digit values at `$98F9`–`$98FC` and blanks leading zeros. The routine at `$98A0` then writes the four cells, each through the digit writer `$98B2` with colour 1 in colour RAM.

Shop helper `$9863` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$9876` adds one to the mode `$98FF`, takes the cursor position from `$9900` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$984E` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 10 holds the same 34 message records as load 1, byte for byte, at `$990B–$9C08`.

Load 10's split row-pointer tables hold 81 pairs, all 48 bytes apart from `$8671`, the last at `$9571`; the map's 14 rows use the first 14. `test_later_row_pointer_tails.js` checks all pairs.

The shop entry at `$954F` jumps to `$9555`, which writes the screen page plus one into `$98B4` and `$98FE`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths.

The shop choice code at `$95E2` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths.

The second shop entry at `$9675` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$96C3` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$9712` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$990B` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

29 of the 38 distinct handler addresses are one-byte RTS entries: `$9EF7–$9F01`, `$9FE1`, `$9FE2`, `$A139–$A145` and `$A1FF–$A201`. 37 of the 48 types select one of them.

