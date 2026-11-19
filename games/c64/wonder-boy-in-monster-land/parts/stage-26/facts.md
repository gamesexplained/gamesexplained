# Load 26 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 26's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 26's map has 15 rows of 82 cells, stored 128 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8DF1`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 26's sound pointers at `$7F58–$7F5D` select voice lists at `$A422`, `$A428` and `$A42E`, whose records name six distinct patterns: `$A434`, `$A4EB`, `$A54C`, `$A5D3`, `$A642` and `$A6A8`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names twelve six-byte trigger records at `$8FE1` (count at `$7F54`) and two sixteen-byte stage-object records at `$9029` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. All twelve trigger records lie on row 13, at columns 74, 71, 68, 65, 57, 54, 51, 48, 14, 8, 4 and 1, and name the resident callback `$72AB`, which puts the record's count back each time it runs. Both stage-object records name the shop's second entry `$9A2E` in their bytes 10 and 11 and a zero byte 4, so that byte 5 selects the items from the selected player's `$4DD7` (record 1, the shields) or `$4DD9` (record 2, the armour); record 1's bytes 7 and 8 also hold `$A257`, the routine that the shield purchase calls. No record names the shop's first entry `$9A2B`.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$8FA1`, inside the eight-page character source at `$8DF1`. The character source runs to `$95F0`, so it also takes in the gate pattern and the trigger and stage-object records.

The update entry at `$8FA1` stores 9 in `$4DCB,X` for the selected player and sets the horizontal-motion gate `$E1`. If both `$4DB6` and `$4DB3` are zero, it takes the next value of the six-byte pattern `$FF`, 0, 0, `$FF`, 0, 0 at `$8FD0`, advancing the index at `$8FCF`, which wraps 6 to 0; otherwise it writes `$FF` and leaves the index unchanged. The two resident speed-update paths at `$0E58` and `$0FF2` return early on a zero gate, so while both bytes are zero they run one call in three. The entry then jumps to `$0732`, which loads the next part, when `$6F3C` is zero, otherwise to `$0200`.

The type-$06 and type-$14 vectors select a dispatcher at `$A95F`, which calls `$792C`, then uses `$1AB1,X` to index split low/high tables at `$A974/$A97B`, patches the jump at `$A971` and dispatches. The seven pairs target `$A982`, `$A9BA`, `$A9EB`, `$AA19`, `$AA92`, `$AABD` and `$AAED`; the type's own code stores only 0 to 6 in its state. State 0 stores the entity's tile column, which `$71DB` returns in X, at `$A991` into the immediate operand of the comparison at `$A998` (`$FF` in the load), so the comparison sets carry when the player's column `$6F3C` is at or right of the entity's. It is load 16's handler, moved, and `test_entity_code_copies.py` compares its 212 instructions with load 16's. The shared routine at `$AB0B` indexes the eight animation offsets at `$AB61` with `$1AC2,X`, which it wraps from 8 to 0.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 2,098 input bytes to `$EB40–$FE3F` and 5,487 to `$7EDF–$ACB1`. The second stream's end marker is the file's last byte.

The load's type-$0C entity vector selects a dispatcher at `$AB6E`, whose four state-table pairs point to `$AB88`, `$ABAC`, `$ABC5` and `$ABE3`. The type's own code stores only 0 to 3 in its state. It is load 8's type-$0C handler, moved.

Type-$0C states 0, 1 and 2 at `$AB88`, `$ABAC` and `$ABC5` call an event helper and, if it returns, increment a counter, count down a field or count it back up. State 0 selects state 1 at counter 10, state 1 selects state 2 when the field is negative, and state 2 returns to state 0 when the field equals its saved target.

Type-$0C state 3 at `$ABE3` uses `$1AC2,X` as a positive countdown or a negative phase and chooses a callback from the sign of `$AC4C`; at the end of the phase it calls `$4B0E` with A=`$20` and jumps to `$5DB9`. The event helper at `$AC1D` can select state 3 and remove its own return address so that it skips the rest of the calling handler.

Load 26 has three LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$9F25`, `$9DE7` and `$9E09`. Another ten pairs load a record's address and jump to `$9B2E`, `$9C0E` or `$9D1B`, each of which calls `$77E0`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$9D6A` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$A131` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$9CD6` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$9BA6`/`$9BAC` and `$9BBE`/`$9BC4` from offsets 2 and 3, and `$9D04`/`$9D0A` from offsets 4 and 5.

The offset-4 targets are routines at `$A1F1`–`$A256`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`. The `$4DD7` routine at `$A21E` also calls the routine whose address the current stage-object record holds in its bytes 7 and 8, through the JSR it patches at `$A235`.

The offset-2 targets are drawing routines at `$A0E5`–`$A12F`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$9CCB` buys the first item (`$9DE0`) when the incoming `$9DDB` is negative and the second (`$9DE1`) otherwise. It charges the item's packed-decimal price through `$9CD6` and, with too little gold, goes back to the wait loop at `$9C1B`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$9E09` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$9CA2` reads `$9DDA` first: when it is nonzero it passes `$9DDB` to the stage-price choice at `$9ABE`. Otherwise a nonzero `$9DDB` goes to the item purchase at `$9CCB`, and a zero `$9DDB` passes message `$9E44` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$9E2D` when bit 1 is set.

The shop input choice at `$9C3F` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$9DDB`; when the new mode is nonzero and `$9DDA` is zero they pass the item now chosen to the message selector `$9D6A`, and both call the cursor helper `$9D52`.

The shop initializer at `$9C11` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$9DDB`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$9C1B` and `$9C2E` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$9C4E` then jumps to `$9B45` when `$9DDA` is nonzero, or stores `$FF` in `$4753,X` and passes message `$9E1C`.

The load's type-$03 entity vector selects a dispatcher at `$A7FC`, whose three state-table pairs point to `$A814`, `$A919` and `$A953`. The type's own code stores only 0 to 2 in its state. It is load 1's type-$03 handler, moved.

Type-$03 state 1 at `$A919` chooses a movement callback by a signed field and updates two frames; when the first frame addition wraps to zero, it calls both movement callbacks. State 2 at `$A953` calls `$4B20` and `$5DB9` with A=2.

The type-$03 state-0 entry at `$A814` can return immediately, select state 1 or 2 based on callback carry and a signed field, or continue to the movement path.

The type-$03 state-0 movement tail at `$A8CF` reads a signed byte from a 40-byte table at `$A8F1`, calls `$4342` for negative values or `$4368` otherwise, and advances the returned Y with an equality wrap at 40.

The type-$03 state-0 frame path at `$A84B` uses carry returned by `$72FC` and the parity of `$1B28,X` to update `$1AD3,X` and two frame bytes.

The type-$03 horizontal calculation at `$A89D` subtracts 6 from negative magnitudes but 5 from nonnegative values before deciding whether to call a movement routine. The difference comes from carry left clear by ADC 1 on the negative path.

The load's type-$01 and type-$16 entity vectors select a dispatcher at `$A738`, whose three state-table pairs point to `$A750`, `$A7B5` and `$A7EC`. The type's own code stores only 0 to 2 in its state. It is load 2's type-$01 handler, moved.

Type-$01 state 0 at `$A750` can select state 1 or 2 based on carry from `$732A` and the sign of `$1A6D,X`. Its other active paths update `$1AD3,X`, `$1AE4,X` and a frame byte and set `$1A7E,X` if clear; when `$1A29,X` is zero it only sets that flag if clear.

Type-$01 state 1 at `$A7B5` returns to state 0 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to `$1B28,X` and updates the frame. State 2 at `$A7EC` decrements `$1B17,X`, uses the same frame update when the result is nonzero, and calls `$4B0E` before jumping to `$5DB9` when it is zero.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8DF1`) to `$717C`, which copies 2,048 bytes from `$8DF1–$95F0` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

The price formatter at `$9D97` splits an item's two packed price bytes into four digit values at `$9DD5`–`$9DD8` and blanks leading zeros. The routine at `$9D7C` then writes the four cells, each through the digit writer `$9D8E` with colour 1 in colour RAM.

Shop helper `$9D3F` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$9D52` adds one to the mode `$9DDB`, takes the cursor position from `$9DDC` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$9D2A` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 26 holds the same 34 message records as load 1, byte for byte, at `$9DE7–$A0E4`.

Stage-object record 1 holds `$A257` in its bytes 7 and 8, and the shield purchase routine `$A21E` calls it through the JSR it patches at `$A235`. It sets the processor port `$01` to `$30`, so that the RAM beneath I/O shows, copies ten blocks of player sprite rows into the sprite slots `$66–$73` at `$D98F–$DCF5`, the first two blocks three times each, calls `$2086` seven times to mirror the slot pairs `$66/$67` to `$72/$73` into `$74/$75` to `$80/$81`, and sets `$01` back to `$35`. It is load 23's routine at `$9D8A`, moved.

Load 26's split row-pointer tables hold 81 pairs, all 128 bytes apart from `$8671`, the last at `$AE71`; the map's 15 rows use the first 15. `test_later_row_pointer_tails.js` checks all pairs.

The shop entry at `$9A2B` jumps to `$9A31`, which writes the screen page plus one into `$9D90` and `$9DDA`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths. No stage-object record in this load names `$9A2B`.

The shop choice code at `$9ABE` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths. The shop timeout enters `$9B45`, which decrements `$4753,X` and passes message `$9EE6`.

The second shop entry at `$9B51` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$9B9F` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$9BEE` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$9DE7` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

28 of the 38 distinct handler addresses are one-byte RTS entries: `$A7FB`, `$A95D–$A95E`, `$AB69–$AB6D` and `$AC4D–$AC60`. 34 of the 48 types select one of them.

