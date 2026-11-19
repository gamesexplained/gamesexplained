# Load 12 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 12's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 12's map has 16 rows of 76 cells, stored 128 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8E71`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 12's sound pointers at `$7F58–$7F5D` select voice lists at `$A072`, `$A07A` and `$A082`, whose records name six distinct patterns: `$A08A`, `$A0C0`, `$A110`, `$A143`, `$A193` and `$A1DB`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names three six-byte trigger records at `$9269` (count at `$7F54`) and one sixteen-byte stage-object record at `$927B` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. The trigger records name the hidden-coin callback `$5C2A` twice and the money-bag callback `$5BE1` once. The stage-object record names the shop entry `$9846` in its bytes 10 and 11, the stage prices 8 and 5 in bytes 8 and 9, and the message callbacks `$928B` and `$92DA`, which the shop's two price paths call, in bytes 4–7.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$9249`, inside the eight-page character source at `$8E71`. The code there stores 5 in `$4DCB,X` for the selected player and jumps to `$0732` when `$6F3D` is 9 and `$6F3C` is 9, 10 or 11, otherwise to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 1,593 input bytes to `$EB40–$FB3F` and 4,834 to `$7EDF–$A6CF`. The decoder stops at the second stream's end marker, 177 bytes before the end of the file.

The load's type-$01 entity vector selects a dispatcher at `$A253`, whose three state-table pairs point to `$A26B`, `$A2D0` and `$A307`. The type's own code stores only 0 to 2 in its state. It is load 2's type-$01 handler, moved.

Type-$01 state 1 at `$A2D0` returns to state 0 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to `$1B28,X` and updates the frame. State 2 at `$A307` decrements `$1B17,X`, uses the same frame update when the result is nonzero, and calls `$4B0E` before jumping to `$5DB9` when it is zero.

Type-$01 state 0 at `$A26B` can select state 1 or 2 based on carry from `$732A` and the sign of `$1A6D,X`. Its other active paths update `$1AD3,X`, `$1AE4,X` and a frame byte and set `$1A7E,X` if clear; when `$1A29,X` is zero it only sets that flag if clear.

Load 12 has seven LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$9299`, `$92C6`, `$92E8`, `$931D`, `$9D40`, `$9C02` and `$9C24`. Another ten pairs load a record's address and jump to `$9949`, `$9A29` or `$9B36`, each of which calls `$77E0`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$9B85` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$9F4C` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$9AF1` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$99C1`/`$99C7` and `$99D9`/`$99DF` from offsets 2 and 3, and `$9B1F`/`$9B25` from offsets 4 and 5.

The offset-4 targets are routines at `$A00C`–`$A071`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`.

The offset-2 targets are drawing routines at `$9F00`–`$9F4A`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$9AE6` buys the first item (`$9BFB`) when the incoming `$9BF6` is negative and the second (`$9BFC`) otherwise. It charges the item's packed-decimal price through `$9AF1` and, with too little gold, goes back to the wait loop at `$9A36`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$9C24` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$9ABD` reads `$9BF5` first: when it is nonzero it passes `$9BF6` to the stage-price choice at `$98D9`. Otherwise a nonzero `$9BF6` goes to the item purchase at `$9AE6`, and a zero `$9BF6` passes message `$9C5F` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$9C48` when bit 1 is set.

The shop input choice at `$9A5A` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$9BF6`; when the new mode is nonzero and `$9BF5` is zero they pass the item now chosen to the message selector `$9B85`, and both call the cursor helper `$9B6D`.

The shop initializer at `$9A2C` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$9BF6`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$9A36` and `$9A49` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$9A69` then jumps to `$9960` when `$9BF5` is nonzero, or stores `$FF` in `$4753,X` and passes message `$9C37`.

The type-$26 entity dispatcher at `$A5BB` jumps through `$1AB1,X` to `$A5D1` or `$A64E`. The type's own code changes its state only at `$A614`, from 0 to 1, and the type-$11 spawn helper makes each type-$26 entity after `$447A` has cleared the slot's state, so it starts at 0.

Type-$26 state 1 at `$A64E` calls `$792C` and `$1179` and may call `$7227` and `$5D7A`, then decrements `$1AC2,X`. A nonnegative result subtracts 2 from `$19C3,X`; a negative result decrements `$1B28` in the slot named by `$1AD3,X`, the type-$11 entity that made it, restores the original X through a patched immediate operand and jumps to `$4454`.

Type-$26 state 0 at `$A5D1` calls `$792C` and `$1179` and enters the transition at `$A602` when `$1179` returns carry set; otherwise it calls `$7227`, and on carry set calls `$5D7A` with A=8 and enters the transition. Otherwise a positive `$1AC2,X` is passed to `$4342` and decremented; zero (replaced by `$80`) or a negative value passes its low seven bits to `$44DE`, and carry set from `$44DE` also enters the transition, which sets `$1AC2,X` to 2, the frame to `$AB`, `$1A07,X` to 7 and the state to 1. On the other paths `$1AC2,X` counts up to `$88` after a `$44DE` call, and while `$1AF5,X` is nonzero the entity moves sideways through `$45BC` or `$4574` by the sign of `$1AE4,X`, reversing on carry; `$1AF5,X` counts down once every three passes.

The type-$11 entity vector selects a dispatcher at `$A325`, whose six state-table pairs point to `$A343`, `$A3D6`, `$A478`, `$A4C4`, `$A503` and `$A526`. The type's own code stores only 0 to 5 in its state. Load 23 holds the same handler, moved.

Type-$11 state 4 at `$A503` decrements `$1AC2,X` and copies `$1AE4,X` to the state when the result is negative or when the movement callback, `$4574` or `$45BC` by the carry from `$72FC`, returns a value whose bits 1–2 are not 2.

Type-$11 state 5 at `$A526` decrements `$1AC2,X`. A negative result calls `$4B0E` with A=`$60` and jumps to `$5DB9`; otherwise it reads the four frame offsets 6, 6, 8, 8 at `$A5AA` by `$1AD3,X`, sets `$19C3,X` through `$A54E` and advances `$1AD3,X`, wrapping at 4. The event helper clears `$1AD3,X` when it selects state 5.

Type-$11 helper `$A55E` copies `$1B17,X` to `$A5A4` and calls `$792C` and `$732A`. Carry set from `$732A` selects state 4 for positive `$1A6D,X` or state 5 otherwise, sets `$1AC2,X` to 10 and discards one return address; the positive path also saves the previous state in `$1AE4,X` and sets the frame, and the other clears `$1AD3,X`. Carry clear calls `$7227` and may tail-jump to `$5D7A` with A=4.

Type-$11 states 2 and 3 at `$A478` and `$A4C4` call the event helper, set the frame from the four offsets 2, 2, 4, 4 at `$A5A6` by `$1AF5,X`, which wraps at 4 and which state 0 clears before selecting state 2, then decrement `$1AD3,X` and move by 4 through `$4574` or `$45BC`. A negative countdown or a callback result with bits 1–2 other than 2 triggers a transition: state 2 loads the timer from a patchable immediate byte (`$FF` in the load, set to 10 by state 0's far path), toggles bit 7 of `$1B17,X` and selects state 3; state 3 selects state 0.

Type-$11 state 1 at `$A3D6` calls its event helper, counts down `$1AF5,X` and uses `$1B06,X` to choose a movement callback, a spawn call or the return to state 0.

The type-$11 spawn helper at `$A414` calls `$190B` and returns if carry is clear. On carry set it calls `$447A`, copies the position from slot Y into slot X, initializes a type-$26 entity, stores the parent's slot in its `$1AD3` and sets `$1B28,Y`=1 before returning with X restored from Y.

Type-$11 state 0 at `$A343` selects state 1 when the X that `$71DB` returns differs from `$6F3C` by less than 20 and `$1B28,X` is zero, and state 2 otherwise, unless `$1A29,X` is zero. Its state-2 path sets `$1AD3,X`=10 and patches the immediate byte used by a later state-2 transition to 10.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8E71`) to `$717C`, which copies 2,048 bytes from `$8E71–$9670` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

The price formatter at `$9BB2` splits an item's two packed price bytes into four digit values at `$9BF0`–`$9BF3` and blanks leading zeros. The routine at `$9B97` then writes the four cells, each through the digit writer `$9BA9` with colour 1 in colour RAM.

Shop helper `$9B5A` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$9B6D` adds one to the mode `$9BF6`, takes the cursor position from `$9BF7` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$9B45` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 12 holds the same 34 message records as load 1, byte for byte, at `$9C02–$9EFF`.

Load 12's split row-pointer tables hold 81 pairs, all 128 bytes apart from `$8671`, the last at `$AE71`; the map's 16 rows use the first 16. `test_later_row_pointer_tails.js` checks all pairs.

Stage-object record 1 at `$927B` names the message callback `$92DA` in its bytes 6 and 7, and the shop's first-price path calls it through the patched JSR at `$993B`, once, since it clears the high byte first. `$92DA` passes `$92E8`, then `$931D`, to `$77E0`. `test_later_object_messages.js` checks the pointer sequence.

The shop entry at `$9846` jumps to `$984C`, which writes the screen page plus one into `$9BAB` and `$9BF5`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths.

The shop choice code at `$98D9` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths. The shop timeout enters `$9960`, which decrements `$4753,X` and passes message `$9D01`.

The second shop entry at `$996C` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$99BA` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$9A09` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$9C02` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

29 of the 38 distinct handler addresses are one-byte RTS entries: `$A316–$A324`, `$A5AE–$A5BA` and `$A67E`. 36 of the 48 types select one of them.

