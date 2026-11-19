# Load 28 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 28's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 28's map has 16 rows of 65 cells, stored 122 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8E11`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 28's sound pointers at `$7F58–$7F5D` select voice lists at `$A3C9`, `$A3D3` and `$A3E7`, whose records name eleven distinct patterns: `$A3FB`, `$A408`, `$A442`, `$A4AC`, `$A501`, `$A523`, `$A546`, `$A568`, `$A5AD`, `$A5C7` and `$A5E1`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names two six-byte trigger records at `$9605` (count at `$7F54`) and one sixteen-byte stage-object record at `$9611` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. Trigger record 1, at column 51 of row 10, names `$5CCB`, which places a hidden heart drawn with sprite `$D5`; record 2, at column 63 of row 10 with a count of 3, names `$5C2A`, which places a hidden coin with the argument `$16`. The stage-object record names the shop's price entry `$9B9D` in its bytes 10 and 11, the two prices `$22` and `$05` in bytes 8 and 9, and the routines `$9621` and `$9653` that the shop's second-price and first-price paths call, in bytes 4–5 and 6–7.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$95E9`, inside the eight-page character source at `$8E11`, which runs to `$9610` and so also takes in the two trigger records. The entry stores 16 in `$4DCB,X` for the selected player and jumps to `$0732`, which loads the next part, when the player's tile is column `$37`, row `$0E`, and to `$0200` otherwise.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 1,183 input bytes to `$EB40–$FABF` and 5,977 to `$7EDF–$AB2B`. The second stream's end marker is the file's last byte. The file holds other bytes at `$A7BE–$A7C0`: after the transfer, the resident patch routine `$2A90`, which `$7B04` calls, writes `JSR $2A7D` there for load 28 (`$2ADD–$2AED`).

Load 28 has five LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$9628`, `$965A`, `$A097`, `$9F59` and `$9F7B`. Another ten pairs load a record's address and jump to `$9CA0`, `$9D80` or `$9E8D`, each of which calls `$77E0`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$9EDC` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$A2A3` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$9E48` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$9D18`/`$9D1E` and `$9D30`/`$9D36` from offsets 2 and 3, and `$9E76`/`$9E7C` from offsets 4 and 5.

The offset-4 targets are routines at `$A363`–`$A3C8`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`. The `$4DD7` routine at `$A390` also calls the routine whose address the current stage-object record holds in its bytes 7 and 8, through the JSR it patches at `$A3A7`.

The offset-2 targets are drawing routines at `$A257`–`$A2A1`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$9E3D` buys the first item (`$9F52`) when the incoming `$9F4D` is negative and the second (`$9F53`) otherwise. It charges the item's packed-decimal price through `$9E48` and, with too little gold, goes back to the wait loop at `$9D8D`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$9F7B` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$9E14` reads `$9F4C` first: when it is nonzero it passes `$9F4D` to the stage-price choice at `$9C30`. Otherwise a nonzero `$9F4D` goes to the item purchase at `$9E3D`, and a zero `$9F4D` passes message `$9FB6` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$9F9F` when bit 1 is set.

The shop input choice at `$9DB1` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$9F4D`; when the new mode is nonzero and `$9F4C` is zero they pass the item now chosen to the message selector `$9EDC`, and both call the cursor helper `$9EC4`.

The shop initializer at `$9D83` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$9F4D`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$9D8D` and `$9DA0` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$9DC0` then jumps to `$9CB7` when `$9F4C` is nonzero, or stores `$FF` in `$4753,X` and passes message `$9F8E`.

The type-$0F entity dispatcher at `$A7B6` returns when `$1A8F,X` is positive. Otherwise it calls `$2A7D`, through the `JSR $2A7D` that the resident patch writes at `$A7BE` after the load, which returns the state in Y clamped to 4, and its five table pairs select `$A7DA`, `$A7F3`, `$A868`, `$A8BA` and `$A8C0`. It is load 10's type-$0F handler, moved.

For type-$0F state 0, after two helpers return, `$1B28,X` increments; reaching `$14` changes it to 7 and increments `$1AB1,X`. State 3 sets `$1AB1,X` to zero.

Type-$0F state 4 decrements `$1AC2,X`. A nonnegative result sets `$19C3,X` from `$19E5,X` plus 4 or 10 according to the sign of `$1AE4,X`; a negative result calls `$4B0E` with A=`$40` and jumps to `$5DB9`.

Type-$0F helper `$A8E0` calls `$792C` and `$732A`. Carry set from `$732A` with positive `$1A6D,X` discards the helper return address and returns from the calling state; with zero or negative `$1A6D,X` it sets `$1AC2,X`=10, `$1A8F,X`=`$FF` and `$1AB1,X`=4. Other returning paths call `$7227` and tail-jump to `$5D7A` with A=8 if carry is set.

Type-$0F state 2 calls its event and frame helpers. If both return and `$1B28,X` equals 8, it clears the timer and state; otherwise it calls `$4368` with the timer and increments it. The frame helper selects `$1AE4,X` from the carry returned by `$72FC`, adds 6, `$19E5,X` and `$1B17,X` with carry propagation, and toggles bit 1 of `$1B17,X` when `$1B06,X` increments to 4.

Type-$0F state 1 calls its event and frame helpers. If they return and `$1B28,X` is nonzero, it calls `$4342` and decrements the timer. Otherwise, when `$1AC2,X` is zero, it increments it and calls `$190B`; on carry set it calls `$447A` and initializes the free slot as a type-$23 entity from this one, and in either case, or when `$1AC2,X` was already nonzero, it jumps to `$A7EF` to increment `$1AB1,X`. When `$190B` finds no free slot it returns X=`$FF`, so that increment lands on `$1BB0`, the offset of the `BCS` at `$1BAF` in the resident display code, and the entity stays in state 1 until its next call.

The type-$23 entity dispatcher at `$AA3E` jumps through `$1AB1,X` to `$AA54` or `$AACC`. The type-$0F state-1 allocation path sets up this entity type after `$447A` has cleared the slot's state at `$A814`, and the type's own code stores only 1, by the increment at `$AA92`, so the state is 0 or 1.

Type-$23 state 1 calls `$792C` and `$7227`, optionally calls `$5D7A` with A=8, and decrements `$1AC2,X`. A nonnegative result subtracts 2 from `$19C3,X`; a negative result decrements `$1AC2` in the slot named by `$1AD3,X`, the type-$0F entity that spawned it, restores the original X through a patched immediate operand and jumps to `$4454`.

Type-$23 state 0 moves to state 1, through the transition at `$AA80`, when `$7227` returns carry set or when `$44DE` does. It moves the entity up by a positive `$1AC2,X` and decrements it; a zero `$1AC2,X` becomes `$80`, and for that or a negative value it passes the low seven bits to `$44DE` as a downward step. Its other paths update `$1AC2,X`, a motion countdown and `$1AE4,X` according to callback results.

The type-$0A and type-$19 entity vectors select a dispatcher at `$A62E`, which jumps through `$1AB1,X` to `$A64A`, `$A667`, `$A6B9`, `$A714` or `$A735`. The handler's own code keeps the state between 0 and 4: 1 at `$A664`, 2 or 0 at `$A6B1`, 0 at `$A710`, 3 or 4 at `$A791`, and at `$A731` the state 0, 1 or 2 that the event helper saved in `$1B28,X`; the entity-record loader and `$447A` clear it to 0, and load 28's entity records include two of type `$0A`. It is load 6's type-$0A handler, moved.

Type-$0A state 3 decrements `$1B17,X` and either tail-calls a direction-selected callback or toggles bit 7 of `$1AD3,X` and restores the state from `$1B28,X`. State 4 decrements `$1AC2,X` and on a negative result calls `$4B0E` with A=`$50` and jumps to `$5DB9`.

Type-$0A helper `$A769` saves the state in `$1B28,X` and calls `$792C` and `$732A`. Carry set from `$732A` selects state 3 for positive `$1A6D,X` or state 4 otherwise, then discards one return address. The positive path rotates a working byte through carry from `$72FC`; the other sets `$1A8F,X`=`$FF` and `$1AC2,X`=10. Carry clear calls `$7227` and may tail-jump to `$5D7A` with A=4.

Type-$0A state 0 calls the event helper, stores masked results from two `$3020` calls, sets `$1AE4,X`=4 and state 1, and falls through to state 1. If the second helper call returns normally, state 1 decrements `$1AE4,X` to 3.

After its initial delay, type-$0A state 1 decrements `$1AC2,X`. A nonnegative result calls its frame helper and a direction-selected callback, and returns when the callback result masked with 6 is 2. Otherwise, and when the countdown goes negative, it calls `$3020` and selects state 0 or, for a negative result, calls it again and selects state 2.

The type-$0A frame helper at `$A743` increments `$1B06,X`, resetting it for values at least 3, and uses twice that value plus a direction-dependent offset and `$19E5,X` to set `$19C3,X`.

Type-$0A state 2 calls its event helper and, after a delay, updates `$1AF5,X` and either selects state 0 or calls the frame helper and a direction-selected callback. Negative `$1AF5,X` values below `$8C` increment before returning to the frame update; values at least `$8C` remain unchanged.

The type-$17 handler at `$A910` counts down a timer and sets its frame from it, and can allocate a type-$2C slot when its decremented timer is `$FC`. That timer resets to 20 even when the active-slot check skips allocation. Its event helper can call `$4B0E` and jump to `$5DB9`.

The type-$2C handler at `$A9C3` initializes parameters when `$1B28,X` is zero, aiming the entity at the position its type-$17 parent stored in `$1AC2,X` and `$1AD3,X`, or updates a position and frame before returning or jumping to `$4454` when it is nonzero. The type-$17 handler sets up the type-$2C slots: its `STA $1919,X` at `$A94F` is the only one in load 28 that stores `$2C`.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8E11`) to `$717C`, which copies 2,048 bytes from `$8E11–$9610` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

The price formatter at `$9F09` splits an item's two packed price bytes into four digit values at `$9F47`–`$9F4A` and blanks leading zeros. The routine at `$9EEE` then writes the four cells, each through the digit writer `$9F00` with colour 1 in colour RAM.

Shop helper `$9EB1` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$9EC4` adds one to the mode `$9F4D`, takes the cursor position from `$9F4E` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$9E9C` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 28 holds the same 34 message records as load 1, byte for byte, at `$9F59–$A256`.

Load 28's split row-pointer tables hold 81 pairs, all 122 bytes apart from `$8671`, the last at `$AC91`; the map's 16 rows use the first 16. `test_later_row_pointer_tails.js` checks all pairs.

Load-28 entry `$A5FB` passes the encoded stream at `$A606` to the resident repeating-motion reader `$6A3A`, which yields 60 values before resetting. Entity record 4 at `$AB17`, a moving platform, names the entry in its bytes 7 and 9. `test_later_motion_streams.js` checks the decoded sequence.

Stage-object record 1 at `$9611` names `$9653` in its bytes 6 and 7; the shop's first-price path calls it once through the JSR it patches at `$9C92`, and it passes message `$965A` ("The Great Eal lives at the bottom of the sea.") to `$77E0`. The record's bytes 4 and 5 name `$9621`, which the second-price path calls the same way at `$9C51`, and which passes message `$9628` ("A riddle is hidden in the sea bed store."). `test_later_object_messages.js` checks the pointer sequence.

The shop entry at `$9B9D` jumps to `$9BA3`, which writes the screen page plus one into `$9F02` and `$9F4C`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths. Stage-object record 1 names `$9B9D` in its bytes 10 and 11, with the prices `$22` and `$05` in its bytes 8 and 9.

The shop choice code at `$9C30` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths. The shop timeout enters `$9CB7` when the layout gate `$9F4C` is nonzero; it decrements `$4753,X` and passes message `$A058`.

The second shop entry at `$9CC3` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$9D11` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$9D60` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$9F59` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

27 of the 38 distinct handler addresses are one-byte RTS entries: `$A625–$A62D`, `$A7B2–$A7B5`, `$A90C–$A90F`, `$AA36–$AA3D` and `$AAF7–$AAF8`. 34 of the 48 types select one of them.

The byte at `$A7B1`, `$55`, lies between the type-$0A direction byte at `$A7B0` and the type-$0B return at `$A7B2`. No instruction in load 28 or the resident part names it or reaches it through an index.
