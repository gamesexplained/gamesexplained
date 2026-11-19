# Load 15 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 15's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 15's map has 15 rows of 123 cells, stored 123 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8DA6`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 15's sound pointers at `$7F58–$7F5D` select voice lists at `$A2B1`, `$A2B9` and `$A2C1`, whose records name six distinct patterns: `$A2C9`, `$A2FF`, `$A34F`, `$A382`, `$A3D2` and `$A41A`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names two six-byte trigger records at `$94D2` (count at `$7F54`) and one sixteen-byte stage-object record at `$9501` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. The trigger records name the message callback `$94DE` and the hidden-coin callback `$5C2A`. The stage-object record names the shop entry `$9572` in its bytes 10 and 11, the stage prices 10 and 5 in bytes 8 and 9, and the message callbacks `$9546` and `$9511`, which the shop's two price paths call, in bytes 4–7.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$94B6`, inside the eight-page character source at `$8DA6`. The code there stores 5 in `$4DCB,X` for the selected player and jumps to `$0732` when `$6F3D` is `$0E` and `$6F3C` is `$38`, otherwise to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 633 input bytes to `$EB40–$F2BF` and 6,089 to `$7EDF–$AB9F`. The decoder stops at the second stream's end marker, 136 bytes before the end of the file.

The load's type-$05 and type-$15 entity vectors select a dispatcher at `$A7F5`, whose six state-table pairs point to `$A813`, `$A8A1`, `$A94F`, `$A99B`, `$A9DA` and `$A9FD`. The type's own code stores only 0 to 5 in its state. It is load 2's type-$05 handler, moved.

Type-$05 state 4 at `$A9DA` decrements `$1AC2,X`; a negative result copies `$1AE4,X` into the state. Otherwise it calls `$4574` or `$45BC` according to carry from `$72FC` and leaves the state alone only when the callback result masked by 6 equals 2.

The type-$05 frame helper at `$AA27` adds 6 to A when the working byte at `$AA7D` is negative, clears carry again, adds `$19E5,X` and stores the low byte at `$19C3,X`. Two four-byte offset tables follow it: `$AA7F` (2, 2, 0, 0), which states 2 and 3 read by `$1AF5,X`, and `$AA83` (4, 4, 2, 2), which state 5 reads by `$1AD3,X`. Each state wraps its index at 4, and the paths into those states clear it first.

Type-$05 state 5 at `$A9FD` decrements `$1AC2,X` and, if it is negative, calls `$4B0E` and jumps to `$5DB9`. Otherwise it uses `$1AD3,X` to read a frame-offset table, calls the frame helper and advances the index, replacing values of 4 or above with 0 after the read. The event helper clears `$1AD3,X` when it selects state 5, so the index stays below 4.

Type-$05 states 2 and 3 at `$A94F` and `$A99B` call an event helper and, if it returns, update a frame using `$1AF5,X` before decrementing `$1AD3,X`. Depending on that result and a movement callback's result, state 2 can toggle bit 7 of `$1B17,X` and select state 3; state 3 can select state 0.

The type-$05 event helper at `$AA37` selects state 4 or 5 on set carry from `$732A`. In those paths it pulls the helper's return address off the stack and returns past the calling handler. On clear carry it can return to the handler or tail-call `$5D7A`.

Type-$05 state 0 at `$A813` uses a returned position and `$6F3C` to choose between state 1, state 2 or a return, when its event helper returns normally. The state-2 path patches the immediate operand at `$A989` from its loaded value `$FF` to `$0A`, and state 2 then uses that operand.

Type-$05 state 1 at `$A8A1` updates direction and frame, calls the event helper, then uses `$1AF5,X` and `$1B06,X` to choose a countdown, calls to `$4342` or `$4368`, or an allocation attempt at `$A8F0`. On set carry from `$190B`, it initializes another slot as a type-$22 entity using data from the original; either way it then restores the original index and selects state 0.

Load 15 has six LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$94EB`, `$9518`, `$954D`, `$9A6C`, `$992E` and `$9950`. Another ten pairs load a record's address and jump to `$9675`, `$9755` or `$9862`, each of which calls `$77E0`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$98B1` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$9C78` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$981D` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$96ED`/`$96F3` and `$9705`/`$970B` from offsets 2 and 3, and `$984B`/`$9851` from offsets 4 and 5.

The offset-4 targets are routines at `$9D38`–`$9D9D`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`.

The offset-2 targets are drawing routines at `$9C2C`–`$9C76`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$9812` buys the first item (`$9927`) when the incoming `$9922` is negative and the second (`$9928`) otherwise. It charges the item's packed-decimal price through `$981D` and, with too little gold, goes back to the wait loop at `$9762`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$9950` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$97E9` reads `$9921` first: when it is nonzero it passes `$9922` to the stage-price choice at `$9605`. Otherwise a nonzero `$9922` goes to the item purchase at `$9812`, and a zero `$9922` passes message `$998B` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$9974` when bit 1 is set.

The shop input choice at `$9786` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$9922`; when the new mode is nonzero and `$9921` is zero they pass the item now chosen to the message selector `$98B1`, and both call the cursor helper `$9899`.

The shop initializer at `$9758` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$9922`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$9762` and `$9775` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$9795` then jumps to `$968C` when `$9921` is nonzero, or stores `$FF` in `$4753,X` and passes message `$9963`.

The load's type-$03 entity vector selects a dispatcher at `$A693`, whose three state-table pairs point to `$A6AB`, `$A7B0` and `$A7EA`. The type's own code stores only 0 to 2 in its state. It is load 1's type-$03 handler, moved.

Type-$03 state 1 at `$A7B0` chooses a movement callback by a signed field and updates two frames; when the first frame addition wraps to zero, it calls both movement callbacks. State 2 at `$A7EA` calls `$4B20` and `$5DB9` with A=2.

The type-$03 state-0 entry at `$A6AB` can return immediately, select state 1 or 2 based on callback carry and a signed field, or continue to the movement path.

The type-$03 state-0 movement tail at `$A766` reads a signed byte from a 40-byte table at `$A788`, calls `$4342` for negative values or `$4368` otherwise, and advances the returned Y with an equality wrap at 40.

The type-$03 state-0 frame path at `$A6E2` uses carry returned by `$72FC` and the parity of `$1B28,X` to update `$1AD3,X` and two frame bytes.

The type-$03 horizontal calculation at `$A734` subtracts 6 from negative magnitudes but 5 from nonnegative values before deciding whether to call a movement routine. The difference comes from carry left clear by ADC 1 on the negative path.

The load's type-$22 entity vector selects a dispatcher at `$AA9C`, whose three state-table pairs point to `$AAB4`, `$AAE7` and `$AB2D`. The type's own code stores only 1 and 2 in its state, and the type-$05 allocation at `$A8F0` makes each type-$22 entity after `$447A` has cleared the slot's state, so it starts at 0. It is load 2's type-$22 handler, moved.

Type-$22 state 2 at `$AB2D` increments a counter and updates a frame while the counter is below 2; otherwise it clears `$1B28` in the slot that `$1AD3,X` names and jumps to `$4454` with the original X.

Type-$22 state 1 at `$AAE7` can call a sign-selected movement routine, then uses carry from `$44DE` to increment a counter or initialize state 2.

Type-$22 state 0 at `$AAB4` enters the alternate-slot cleanup when `$1A29,X` is zero; otherwise it calls the collision helper and chooses a movement callback by a sign byte, and the callback's carry moves it to state 1.

The type-$22 collision helper at `$AB51` returns directly or enters state-2 setup after either of two carry checks. State-2 setup returns to the helper's caller, so a state-0 call continues after it.

The load's type-$01 and type-$16 entity vectors select a dispatcher at `$A492`, whose three state-table pairs point to `$A4AA`, `$A50F` and `$A546`. The type's own code stores only 0 to 2 in its state. It is load 2's type-$01 handler, moved.

Type-$01 state 0 at `$A4AA` can select state 1 or 2 based on carry from `$732A` and the sign of `$1A6D,X`. Its other active paths update `$1AD3,X`, `$1AE4,X` and a frame byte and set `$1A7E,X` if clear; when `$1A29,X` is zero it only sets that flag if clear.

Type-$01 state 1 at `$A50F` returns to state 0 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to `$1B28,X` and updates the frame. State 2 at `$A546` decrements `$1B17,X`, uses the same frame update when the result is nonzero, and calls `$4B0E` before jumping to `$5DB9` when it is zero.

The load's type-$02 entity vector selects a dispatcher at `$A555`, whose three state-table pairs point to `$A56D`, `$A637` and `$A671`. The type's own code stores only 0 to 2 in its state. It is load 1's type-$02 handler, moved.

Type-$02 state 2 at `$A671` computes a frame based on whether `$1AD3,X` equals `$80`, decrements `$1AE4,X` and can call `$4B0E` and `$5DB9`.

Type-$02 state 1 at `$A637` decrements a timer, chooses a movement callback by a signed byte, and either resets to state 0 or updates a frame.

The type-$02 helper at `$A612` toggles bit 7 of `$1AD3,X`. The frame helper at `$A61B` patches an immediate operand to 0 or 8 and combines it with a timer bit and `$19E5,X`.

The type-$02 state-0 entry at `$A56D` can select state 1 or 2 or continue to the timer path.

The type-$02 state-0 timer path at `$A5B0` can update a frame, select a movement callback, or reset a timer and toggle two direction bits.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

The price formatter at `$98DE` splits an item's two packed price bytes into four digit values at `$991C`–`$991F` and blanks leading zeros. The routine at `$98C3` then writes the four cells, each through the digit writer `$98D5` with colour 1 in colour RAM.

Shop helper `$9886` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$9899` adds one to the mode `$9922`, takes the cursor position from `$9923` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$9871` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 15 holds the same 34 message records as load 1, byte for byte, at `$992E–$9C2B`.

Load 15's split row-pointer tables hold 81 pairs, all 123 bytes apart from `$8671`, the last at `$ACE1`; the map's 15 rows use the first 15. `test_later_row_pointer_tails.js` checks all pairs.

Stage-object record 1 at `$9501` names the message callback `$9511` in its bytes 6 and 7, and the shop's first-price path calls it through the patched JSR at `$9667`, once, since it clears the high byte first. `$9511` passes `$9518` ("When you fight the Dragon, aim at its head") to `$77E0`. `test_later_object_messages.js` checks the pointer.

Trigger record 1 at `$94D2` (column 23, row 11, count 1) names the message callback `$94DE`, which passes `$94EB` ("THE MAM DESERT.") to `$77E0` and restores X through the operand it patches at `$94E9`. `test_later_trigger_messages.js` checks the pointer and X.

The shop entry at `$9572` jumps to `$9578`, which writes the screen page plus one into `$98D7` and `$9921`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths. Its first 52 bytes, `$9572–$95A5`, are also the last bytes of the character source that `$717C` copies.

The shop choice code at `$9605` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths. The shop timeout enters `$968C`, which decrements `$4753,X` and passes message `$9A2D`.

The second shop entry at `$9698` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$96E6` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$9735` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$992E` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

27 of the 38 distinct handler addresses are one-byte RTS entries: `$A7F4`, `$AA87–$AA9B` and `$AB68–$AB6C`. 33 of the 48 types select one of them.

