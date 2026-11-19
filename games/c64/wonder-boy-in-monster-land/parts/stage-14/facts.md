# Load 14 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 14's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 14's map has 14 rows of 102 cells, stored 102 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8C05`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 14's sound pointers at `$7F58–$7F5D` select voice lists at `$9EBC`, `$9EC0` and `$9EC4`, whose records name three distinct patterns: `$9EC8`, `$9F47` and `$9FC5`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names two six-byte trigger records at `$8F3A` (count at `$7F54`) and two sixteen-byte stage-object records at `$8F62` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. The trigger records name the message callback `$8F46` and the money-bag callback `$5BE1`. Stage-object record 1 names the shop's second entry `$9693` in its bytes 10 and 11; record 2 names `$8F82` and `$8FD3` in bytes 6–9 and the resident alternate update loop `$073F` in bytes 10 and 11.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$8F25`, inside the eight-page character source at `$8C05`. The code there stores 5 in `$4DCB,X` for the selected player and jumps to `$0732` when `$6F3C` is `$64`, otherwise to `$0200`.

Load 14's handler at `$A39C`, for entity types `$06` and `$14`, is a copy of load 16's handler at `$8EF0` moved up by `$14AC` bytes: its 212 instructions match once their internal addresses are moved, and so do its seven split-table targets and the eight animation offsets that follow. `test_entity_code_copies.py` checks this.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 1,899 input bytes to `$EB40–$FCBF` and 5,698 to `$7EDF–$A91D`. The decoder stops at the second stream's end marker, 23 bytes before the end of the file. After the transfer, `$7B04` calls the resident routine `$2A90`, which for this load writes `JSR $2A87` over `$9D4E–$9D50` in the shop's tile-drawing routine `$9D4B`; `$2A87` stores `$4F` in `$4777` and returns Y from `$4777,X`.

Load 14 has five LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$8F53`, `$8FC1`, `$9B8A`, `$9A4C` and `$9A6E`. Another ten pairs load a record's address and jump to `$9793`, `$9873` or `$9980`, each of which calls `$77E0`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$99CF` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$9D96` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$993B` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$980B`/`$9811` and `$9823`/`$9829` from offsets 2 and 3, and `$9969`/`$996F` from offsets 4 and 5.

The offset-4 targets are routines at `$9E56`–`$9EBB`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`.

The offset-2 targets are drawing routines at `$9D4A`–`$9D94`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$9930` buys the first item (`$9A45`) when the incoming `$9A40` is negative and the second (`$9A46`) otherwise. It charges the item's packed-decimal price through `$993B` and, with too little gold, goes back to the wait loop at `$9880`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$9A6E` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$9907` reads `$9A3F` first: when it is nonzero it passes `$9A40` to the stage-price choice at `$9723`. Otherwise a nonzero `$9A40` goes to the item purchase at `$9930`, and a zero `$9A40` passes message `$9AA9` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$9A92` when bit 1 is set.

The shop input choice at `$98A4` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$9A40`; when the new mode is nonzero and `$9A3F` is zero they pass the item now chosen to the message selector `$99CF`, and both call the cursor helper `$99B7`.

The shop initializer at `$9876` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$9A40`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$9880` and `$9893` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$98B3` then jumps to `$97AA` when `$9A3F` is nonzero, or stores `$FF` in `$4753,X` and passes message `$9A81`.

The load's type-$03 entity vector selects a dispatcher at `$A239`, whose three state-table pairs point to `$A251`, `$A356` and `$A390`. The type's own code stores only 0 to 2 in its state. It is load 1's type-$03 handler, moved.

Type-$03 state 1 at `$A356` chooses a movement callback by a signed field and updates two frames; when the first frame addition wraps to zero, it calls both movement callbacks. State 2 at `$A390` calls `$4B20` and `$5DB9` with A=2.

The type-$03 state-0 entry at `$A251` can return immediately, select state 1 or 2 based on callback carry and a signed field, or continue to the movement path.

The type-$03 state-0 movement tail at `$A30C` reads a signed byte from a 40-byte table at `$A32E`, calls `$4342` for negative values or `$4368` otherwise, and advances the returned Y with an equality wrap at 40.

The type-$03 state-0 frame path at `$A288` uses carry returned by `$72FC` and the parity of `$1B28,X` to update `$1AD3,X` and two frame bytes.

The type-$03 horizontal calculation at `$A2DA` subtracts 6 from negative magnitudes but 5 from nonnegative values before deciding whether to call a movement routine. The difference comes from carry left clear by ADC 1 on the negative path.

The load's type-$22 entity vector selects a dispatcher at `$A733`, whose three state-table pairs point to `$A74B`, `$A77E` and `$A7C4`. The type's own code stores only 1 and 2 in its state, and the type-$12 helper `$A6DA` makes each type-$22 entity after `$447A` has cleared the slot's state, so it starts at 0. It is load 2's type-$22 handler, moved.

Type-$22 state 2 at `$A7C4` increments a counter and updates a frame while the counter is below 2; otherwise it clears `$1B28` in the slot that `$1AD3,X` names and jumps to `$4454` with the original X.

Type-$22 state 1 at `$A77E` can call a sign-selected movement routine, then uses carry from `$44DE` to increment a counter or initialize state 2.

Type-$22 state 0 at `$A74B` enters the alternate-slot cleanup when `$1A29,X` is zero; otherwise it calls the collision helper and chooses a movement callback by a sign byte, and the callback's carry moves it to state 1.

The type-$22 collision helper at `$A7E8` returns directly or enters state-2 setup after either of two carry checks. State-2 setup returns to the helper's caller, so a state-0 call continues after it.

The load's type-$01 entity vector selects a dispatcher at `$A038`, whose three state-table pairs point to `$A050`, `$A0B5` and `$A0EC`. The type's own code stores only 0 to 2 in its state. It is load 2's type-$01 handler, moved.

Type-$01 state 0 at `$A050` can select state 1 or 2 based on carry from `$732A` and the sign of `$1A6D,X`. Its other active paths update `$1AD3,X`, `$1AE4,X` and a frame byte and set `$1A7E,X` if clear; when `$1A29,X` is zero it only sets that flag if clear.

Type-$01 state 1 at `$A0B5` returns to state 0 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to `$1B28,X` and updates the frame. State 2 at `$A0EC` decrements `$1B17,X`, uses the same frame update when the result is nonzero, and calls `$4B0E` before jumping to `$5DB9` when it is zero.

The load's type-$02 entity vector selects a dispatcher at `$A0FB`, whose three state-table pairs point to `$A113`, `$A1DD` and `$A217`. The type's own code stores only 0 to 2 in its state. It is load 1's type-$02 handler, moved.

Type-$02 state 2 at `$A217` computes a frame based on whether `$1AD3,X` equals `$80`, decrements `$1AE4,X` and can call `$4B0E` and `$5DB9`.

Type-$02 state 1 at `$A1DD` decrements a timer, chooses a movement callback by a signed byte, and either resets to state 0 or updates a frame.

The type-$02 helper at `$A1B8` toggles bit 7 of `$1AD3,X`. The frame helper at `$A1C1` patches an immediate operand to 0 or 8 and combines it with a timer bit and `$19E5,X`.

The type-$02 state-0 entry at `$A113` can select state 1 or 2 or continue to the timer path.

The type-$02 state-0 timer path at `$A156` can update a frame, select a movement callback, or reset a timer and toggle two direction bits.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8C05`) to `$717C`, which copies 2,048 bytes from `$8C05–$9404` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

The price formatter at `$99FC` splits an item's two packed price bytes into four digit values at `$9A3A`–`$9A3D` and blanks leading zeros. The routine at `$99E1` then writes the four cells, each through the digit writer `$99F3` with colour 1 in colour RAM.

Shop helper `$99A4` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$99B7` adds one to the mode `$9A40`, takes the cursor position from `$9A41` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$998F` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 14 holds the same 34 message records as load 1, byte for byte, at `$9A4C–$9D49`.

Load 14's split row-pointer tables hold 81 pairs, all 102 bytes apart from `$8671`, the last at `$A651`; the map's 14 rows use the first 14. `test_later_row_pointer_tails.js` checks all pairs.

Stage-object record 2 at `$8F72` names `$8F82`, inside the character source, in its bytes 6 and 7, and the resident alternate update loop `$073F`, which the record names in bytes 10 and 11, calls it through the patched JSR at `$0778` with X the free slot that `$190B` found. It makes that slot a type-$13 entity (sprite base `$C3`, parameter `$40`, screen X `$00D2`, Y `$AD`) and passes message `$8FC1` ("Giant Cong!") to `$77E0`. `test_later_object_inits.js` checks its field writes and message pointer.

Stage-object record 2 at `$8F72` names the result callback `$8FD3` in its bytes 8 and 9; it returns A=`$0A` with carry clear. `test_later_object_results.js` checks the return.

Trigger record 1 at `$8F3A` (column 66, row 9, count 1) names the message callback `$8F46`, which passes `$8F53` ("Oh?") to `$77E0` and restores X through the operand it patches at `$8F51`. `test_later_trigger_messages.js` checks the pointer and X.

The shop entry at `$9690` jumps to `$9696`, which writes the screen page plus one into `$99F5` and `$9A3F`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths.

The shop choice code at `$9723` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths. The shop timeout enters `$97AA`, which decrements `$4753,X` and passes message `$9B4B`.

The second shop entry at `$97B6` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$9804` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$9853` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$9A4C` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

Load 14's type-$12 and type-$21 vectors select a dispatcher at `$A5B1`, which sets `$1A07,X` to 12, returns while `$1A8F,X` is nonzero and otherwise jumps through three table pairs to `$A5D4`, `$A5EA` and `$A66F`; the type's own code stores only 0 to 2 in its state. The type-$13 vector selects a dispatcher at `$A7FF`, which only writes the frames through `$A8B4` with A=8 while `$1A8F,X` is positive, and otherwise calls the frame counter `$A8AC` and jumps through its one table pair to state 0 at `$A822`; the type's own code never writes its state.

Load-14 type-$12 state 0 at `$A5D4` sets the timer `$1AC2,X` to 10 and stores twice the low two bits of the `$3020` result in `$1AE4,X`, then falls through to state 1.

Load-14 type-$12 state 1 at `$A5EA` counts down its timer, reversing direction and restarting the count at 20 when it runs out; each time the count passes 10 it decrements `$1AE4,X` and selects state 2 when that goes negative. Otherwise it moves 4 left or right by the sign of `$1AD3,X`, sets the collision box at `$762E–$7631` from its display slot and calls `$732A`: carry set with `$1A6D,X` zero or negative calls `$4B0E` with A=`$60` and jumps to `$5DB9`; otherwise it calls `$7227` and, on carry, `$5D7A` with A=4.

Load-14 type-$12 state 2 at `$A66F` increments a per-slot counter at `$A6C0,X` and, on even counts, rotates the carry of one `$72FC` call into the working byte `$A6BF` and uses the carry of a second to choose a frame offset of 2 or 10, to which it adds `$19E5,X` and the entry of the ten-byte table at `$A6D0` for its timer `$1AC2,X`. Its second addition retains carry from the first. It counts the timer down from 9, calls the spawn helper `$A6DA` at 5 and returns to state 0 when it goes negative.

Load-14 helper `$A6DA` calls `$190B` and, on a set carry, makes the free slot a type-$22 entity at the position of the incoming Y slot, with its direction from `$A6BF`, stores the parent's slot in its `$1AD3` and sets the parent's `$1B28` to 1, before restoring X from Y.

Load-14 type-$13 frame helper `$A8AC` decrements a counter and selects bit 2; `$A8B4` adds that value or an incoming A to the base frame, then adds 2 while retaining carry.

Load-14 type-$13 contact helper `$A88A` calls `$792C` and `$732A`. Carry set with `$1A6D,X` zero or negative calls `$4B20` with A=3 and jumps to `$5DB9`; otherwise it calls `$7227` and, on carry set, jumps to `$5D7A` with A=8.

Load-14 type-$13 state 0 at `$A822` calls the contact helper, then counts down `$1AC2,X`; each time it runs out it restarts at 12, reverses the direction bit 7 of `$1AD3,X` and, when `$3020` returns a nonnegative value, starts a hop. It moves 8 left or right each pass, and during a hop moves up by `$1AF5,X` while counting it down from 5, then down while counting it up to 6.

25 of the 38 distinct handler addresses are one-byte RTS entries: `$A39A`, `$A39B`, `$A5A6–$A5B0` and `$A8C1–$A8CC`. 30 of the 48 types select one of them.

