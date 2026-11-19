# Load 6 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 6's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 6's map has 45 rows of 49 cells, stored 49 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8F0E`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 6's sound pointers at `$7F58–$7F5D` select voice lists at `$AEA5`, `$AEAF` and `$AEC3`, whose records name eleven distinct patterns: `$AED7`, `$AEE4`, `$AF1E`, `$AF88`, `$AFDD`, `$AFFF`, `$B022`, `$B044`, `$B089`, `$B0A3` and `$B0BD`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names six six-byte trigger records at `$95AA` (count at `$7F54`) and three sixteen-byte stage-object records at `$95EA` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$958E`, inside the eight-page character source at `$8F0E`. The code there stores 3 in `$4DCB,X` for the selected player and jumps to `$0732` when `$6F3C` is `$2F` and `$6F3D` is below 7, otherwise to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 1,395 input bytes to `$EB40–$FCBF` and 7,898 to `$7EDF–$BA15`. The decoder stops at the second stream's end marker, 105 bytes before the end of the file.

The load's type-$04 entity vector selects a dispatcher at `$B0DA`, whose six state-table pairs point to `$B0F8`, `$B125`, `$B1B8`, `$B1D7`, `$B15D` and `$B18B`.

Type-$04 state 0 at `$B0F8` sets `$1AD3,X` to `$00` or `$FC` from either the sign returned by `$3020` or a comparison of `$6F3C` with the X returned by `$71DB`, depending on `$19B2,X`. It calls `$B217`, sets the state to 1 and returns.

The shared routine at `$B217` increments `$1AC2,X`, then adds bit 1 of the result, `$19E5,X`, 4 and `$1AD3,X`, carrying between the additions, and stores the low byte at `$19C3,X`. Its callers include type-$04 state 0.

Type-$04 state 2 at `$B1B8` selects state 1 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to the sign of `$1AD3,X` and updates the frame. State 3 at `$B1D7` decrements `$1AE4,X` and either sets `$1AD3,X` to 4 and updates the frame or calls `$4B0E` and jumps to `$5DB9`.

The type-$04 helpers at `$B1EE` and `$B1F7` set `$1A7E,X` to 1 only when it was zero, and clear it, respectively. The helper at `$B1FD` toggles `$1AD3,X` with exclusive-OR `$FC` before falling through to `$B205`, which updates the frame and chooses `$4574` or `$45BC` from its sign with A=2.

Type-$04 state 1 at `$B125` selects a direction toggle or state 4 when its movement helper returns carry set. On clear carry it indexes a four-entry split table: entries 0 and 1 select the direction toggle and state-5 setup, while entries 2 and 3 return.

Type-$04 state 4 at `$B15D` selects state 1 when `$1B28,X` is 6; otherwise it increments that field and passes the byte it indexes in the table at `$B175` (6, 5, 4, 3, 2, 1) to `$4342`, then enters movement with A=1. State 5 at `$B18B` increments the same field, uses different movement paths below 7 and at 7 or above, and selects state 1 at 11. The code that enters each state, at `$B13A` and `$B17F`, clears `$1B28,X` first, so state 4 reads only the first six bytes of its table.

The type-$04 event check at `$B22C` returns when `$1A29,X` is zero. Otherwise, depending on carry returned by `$732A` and `$7227`, and the sign of `$1A6D,X`, it selects state 2 or 3 or calls `$5D7A` and toggles direction. On the state-3 path, a nonzero `$1AF5,X` supplies an alternate index for a decrement.

The load's type-$05 entity vector selects a dispatcher at `$B26E`, whose six state-table pairs point to `$B28C`, `$B31A`, `$B3C8`, `$B414`, `$B453` and `$B476`.

Type-$05 state 4 at `$B453` decrements `$1AC2,X`; a negative result copies `$1AE4,X` into the state. Otherwise it calls `$4574` or `$45BC` according to carry from `$72FC` and leaves the state alone only when the callback result masked by 6 equals 2.

The type-$05 frame helper at `$B4A0` adds 6 to A when the working byte at `$B4F6` is negative, clears carry again, adds `$19E5,X` and stores the low byte at `$19C3,X`. Two four-byte offset tables follow it, at `$B4F8` (2, 2, 0, 0) and `$B4FC` (4, 4, 2, 2).

Type-$05 state 5 at `$B476` decrements `$1AC2,X` and, if it is negative, calls `$4B0E` and jumps to `$5DB9`. Otherwise it uses `$1AD3,X` to read a frame-offset table, calls the frame helper and advances the index, replacing values of 4 or above with 0 after the read.

Type-$05 states 2 and 3 at `$B3C8` and `$B414` call an event helper and, if it returns, update a frame using `$1AF5,X` before decrementing `$1AD3,X`. Depending on that result and a movement callback's result, state 2 can toggle bit 7 of `$1B17,X` and select state 3; state 3 can select state 0.

The type-$05 event helper at `$B4B0` selects state 4 or 5 on set carry from `$732A`. In those paths it pulls the helper's return address off the stack and returns past the calling handler. On clear carry it can return to the handler or tail-call `$5D7A`.

Type-$05 state 0 at `$B28C` uses a returned position and `$6F3C` to choose between state 1, state 2 or a return, when its event helper returns normally. The state-2 path patches the immediate operand at `$B402` from its loaded value `$FF` to `$0A`, and state 2 then uses that operand.

Type-$05 state 1 at `$B31A` updates direction and frame, calls the event helper, then uses `$1AF5,X` and `$1B06,X` to choose a countdown, calls to `$4342` or `$4368`, or an allocation attempt at `$B369`. On set carry from `$190B`, it initializes another slot as a type-$22 entity using data from the original; either way it then restores the original index and selects state 0.

Load 6 has seven LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$95DB`, `$9621`, `$9658`, `$9682`, `$AB73`, `$AA35` and `$AA57`. Another nine pairs load a record's address and jump to a shared `JSR $77E0` at `$A85C` and `$A969`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$A9B8` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$AD7F` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$A924` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$A7F4`/`$A7FA` and `$A80C`/`$A812` from offsets 2 and 3, and `$A952`/`$A958` from offsets 4 and 5.

The offset-4 targets are routines at `$AE3F`–`$AEA4`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`.

The offset-2 targets are drawing routines at `$AD33`–`$AD7D`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$A919` buys the first item (`$AA2E`) when the incoming `$AA29` is negative and the second (`$AA2F`) otherwise. It charges the item's packed-decimal price through `$A924` and, with too little gold, goes back to the wait loop at `$A869`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$AA57` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$A8F0` reads `$AA28` first: when it is nonzero it passes `$AA29` to the stage-price choice at `$A70C`. Otherwise a nonzero `$AA29` goes to the item purchase at `$A919`, and a zero `$AA29` passes message `$AA92` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$AA7B` when bit 1 is set.

The shop input choice at `$A88D` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$AA29`; when the new mode is nonzero and `$AA28` is zero they pass the item now chosen to the message selector `$A9B8`, and both call the cursor helper `$A9A0`.

The shop initializer at `$A85F` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$AA29`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$A869` and `$A87C` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$A89C` then jumps to `$A793` when `$AA28` is nonzero, or stores `$FF` in `$4753,X` and passes message `$AA6A`.

The load's type-$22 entity vector selects a dispatcher at `$B912`, whose three state-table pairs point to `$B92A`, `$B95D` and `$B9A3`.

Type-$22 state 2 at `$B9A3` increments a counter and updates a frame while the counter is below 2; otherwise it clears `$1B28` in the slot that `$1AD3,X` names and jumps to `$4454` with the original X.

Type-$22 state 1 at `$B95D` can call a sign-selected movement routine, then uses carry from `$44DE` to increment a counter or initialize state 2.

Type-$22 state 0 at `$B92A` enters the alternate-slot cleanup when `$1A29,X` is zero; otherwise it calls the collision helper and chooses a movement callback by a sign byte, and the callback's carry moves it to state 1.

The type-$22 collision helper at `$B9C7` returns directly or enters state-2 setup after either of two carry checks. State-2 setup returns to the helper's caller, so a state-0 call continues after it.

The type-$0A entity dispatcher at `$B504` jumps through `$1AB1,X` to one of five targets: `$B520`, `$B53D`, `$B58F`, `$B5EA` and `$B60B`. The type's own code stores only 0 to 4 in its state.

Type-$0A state 3 at `$B5EA` decrements `$1B17,X` and either tail-calls a direction-selected callback or toggles bit 7 of `$1AD3,X` and restores the state from `$1B28,X`. State 4 at `$B60B` decrements `$1AC2,X` and on a negative result calls `$4B0E` with A=`$50` and jumps to `$5DB9`.

Type-$0A helper `$B63F` saves the state in `$1B28,X` and calls `$792C` and `$732A`. Carry set from `$732A` selects state 3 for positive `$1A6D,X` or state 4 otherwise, then discards one return address. The positive path rotates a working byte through carry from `$72FC`; the other sets `$1A8F,X`=`$FF` and `$1AC2,X`=10. Carry clear calls `$7227` and may tail-jump to `$5D7A` with A=4.

Type-$0A state 0 at `$B520` calls the event helper, stores masked results from two `$3020` calls, sets `$1AE4,X`=4 and state 1, and falls through to state 1. If the second helper call returns normally, state 1 decrements `$1AE4,X` to 3.

After its initial delay, type-$0A state 1 decrements `$1AC2,X`. A nonnegative result calls its frame helper and a direction-selected callback, and returns when the callback result masked with 6 equals 2. A negative count, or any other callback result, calls `$3020` and selects state 0 or, for a negative result, calls it again and selects state 2.

The type-$0A frame helper at `$B619` increments `$1B06,X`, resetting it for values at least 3, and uses twice that value plus a direction-dependent offset and `$19E5,X` to set `$19C3,X`.

Type-$0A state 2 at `$B58F` calls its event helper and, after a delay, updates `$1AF5,X` and either selects state 0 or calls the frame helper and a direction-selected callback. Negative `$1AF5,X` values below `$8C` increment before returning to the frame update; values at least `$8C` remain unchanged.

The type-$0B entity dispatcher at `$B688` calls `$B895` and then jumps through `$1AB1,X` to one of seven targets: `$B6AB`, `$B6D3`, `$B76F`, `$B7AD`, `$B7E8`, `$B81C` and `$B852`. The type's own code stores only 1 to 6 in the state (1 at `$B6D0` and `$B809`, 2 at `$B76C`, 3 at `$B71E`, 4 at `$B7A2`, 5 or 6 at `$B8C2`) and at `$B84E` restores the state the helper saved at `$B8B8`. No type-$0B object is set up in load 6: none of its entity records (types `$04`, `$0A`, `$0A`, `$04` and `$05`) is type `$0B`, and no instruction in load 6 or the resident part stores `$0B` as a type.

The type-$0B helper at `$B895` rotates a working byte through carry from `$72FC` and copies it to `$1AC2,X`. With `$1A8F,X` zero, carry set from `$732A` selects state 5 for positive `$1A6D,X` or state 6 otherwise, before the dispatcher reads the state. Other paths call `$7227` and may tail-jump to `$5D7A` with A=4. The indexed write at `$B8B8` that saves the state uses the entity slot in X, 0 to 16, within the seventeen bytes at `$B8F0`.

Type-$0B state 5 at `$B81C` decrements `$1B28,X` and either restores the state from an indexed working location or sets the two sprite frames `$19C3,X` and `$19D4,X` and tail-calls a direction-selected movement routine. State 6 at `$B852` decrements `$1AC2,X` and on a negative result calls `$4B20` with A=3 before jumping to `$5DB9` with A=2. On the pass that selects state 6 it decrements the 10 the helper has just stored there; on every later pass the helper has first overwritten `$1AC2,X` with the rotated direction byte.

Type-$0B state 4 at `$B7E8` decrements `$1AE4,X` and, if it becomes negative, sets the two sprite frames, selects state 1, sets a five-count delay and conditionally jumps according to `$3020`.

Type-$0B state 3 at `$B7AD` copies an indexed direction byte and handles positive, zero and negative `$1AE4,X` values through `$4342` or `$4368` before jumping to another handler path or tail-calling a direction-selected movement routine. The indexed direction byte at `$B8DF,X` is the one state 1 stores at `$B719` just before it selects state 3.

Type-$0B state 2 at `$B76F` decrements `$1AF5,X`, tail-calls a direction-selected movement routine, or updates a second countdown and either reverses direction or selects state 4 and sets the two sprite frames.

Type-$0B state 0 at `$B6AB` sets `$1AD3,X` according to `$19F6,X`, initializes a direction and the two sprite frames, selects state 1 and falls through into it.

Type-$0B state 1 at `$B6D3` compares a direction-dependent difference with `$14`, then may call a movement routine, select state 3, or enter a close-range branch that selects state 4 or initializes state 2 and falls through.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8F0E`) to `$717C`, which copies 2,048 bytes from `$8F0E–$970D` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply view-origin values that the code at `$33F7–$3408` later changes.

The price formatter at `$A9E5` splits an item's two packed price bytes into four digit values at `$AA23`–`$AA26` and blanks leading zeros. The routine at `$A9CA` then writes the four cells, each through the digit writer `$A9DC` with colour 1 in colour RAM.

Shop helper `$A98D` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$A9A0` adds one to the mode `$AA29`, takes the cursor position from `$AA2A` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$A978` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 6 holds the same 34 message records as load 1, byte for byte, at `$AA35–$AD32`.

Load 6's split row-pointer tables hold 81 pairs, all 49 bytes apart from `$8671`, the last at `$95C1`; the map's 45 rows use the first 45. `test_later_row_pointer_tails.js` checks all pairs.

Stage-object record 1 at `$95EA` names the message callback `$961A` in its bytes 6 and 7, and `$961A` passes `$9621` to `$77E0`. `test_later_object_messages.js` checks the pointer.

Trigger record 6 at `$95C8` names the message callback `$95CE`, which passes `$95DB` to `$77E0` and restores X through the operand it patches at `$95D9`. `test_later_trigger_messages.js` checks the pointer and X.

The shop entry at `$A679` jumps to `$A67F`, which writes the screen page plus one into `$A9DE` and `$AA28`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths.

The shop choice code at `$A70C` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths.

The second shop entry at `$A79F` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$A7ED` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$A83C` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$AA35` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

27 of the 38 distinct handler addresses are one-byte RTS entries: `$B0D7–$B0D9`, `$B500–$B503`, `$B903–$B911` and `$B9DE–$B9E2`. 33 of the 48 types select one of them.

No instruction in load 6, load 1 or the resident part names the byte at `$B687` (`$69`), which lies between the type-$0A working byte `$B686` and the type-$0B dispatcher at `$B688`. What it is for is unknown.
