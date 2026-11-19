# Load 4 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 4's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 4's map has 31 rows of 70 cells, stored 70 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8EEB`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 4's sound pointers at `$7F58–$7F5D` select voice lists at `$AEAD`, `$AEB9` and `$AEBD`, whose records name eight distinct patterns: `$AED3`, `$AF15`, `$AF37`, `$AF59`, `$AFCA`, `$AFD5`, `$AFDF` and `$AFEF`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names five six-byte trigger records at `$9504` (count at `$7F54`) and three sixteen-byte stage-object records at `$9522` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$947B`, inside the eight-page character source at `$8EEB`. The code there stores 2 in `$4DCB,X` for the selected player and jumps to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 1,901 input bytes to `$EB40–$FFBF` and 7,660 to `$7EDF–$B7BD`. The decoder stops at the second stream's end marker, before the file's last bytes.

The load's type-$04 entity vector selects a dispatcher at `$B0CB`, whose six state-table pairs point to `$B0E9`, `$B116`, `$B1A9`, `$B1C8`, `$B14E` and `$B17C`.

Type-$04 state 0 at `$B0E9` sets `$1AD3,X` to `$00` or `$FC` from either the sign returned by `$3020` or a comparison of `$6F3C` with the X returned by `$71DB`, depending on `$19B2,X`. It calls `$B208`, sets the state to 1 and returns.

The shared routine at `$B208` increments `$1AC2,X`, then adds bit 1 of the result, `$19E5,X`, 4 and `$1AD3,X`, carrying between the additions, and stores the low byte at `$19C3,X`. Its callers include type-$04 state 0.

Type-$04 state 2 at `$B1A9` selects state 1 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to the sign of `$1AD3,X` and updates the frame. State 3 at `$B1C8` decrements `$1AE4,X` and either sets `$1AD3,X` to 4 and updates the frame or calls `$4B0E` and jumps to `$5DB9`.

The type-$04 helpers at `$B1DF` and `$B1E8` set `$1A7E,X` to 1 only when it was zero, and clear it, respectively. The helper at `$B1EE` toggles `$1AD3,X` with exclusive-OR `$FC` before falling through to `$B1F6`, which updates the frame and chooses `$4574` or `$45BC` from its sign with A=2.

Type-$04 state 1 at `$B116` selects a direction toggle or state 4 when its movement helper returns carry set. On clear carry it indexes a four-entry split table: entries 0 and 1 select the direction toggle and state-5 setup, while entries 2 and 3 return.

Type-$04 state 4 at `$B14E` selects state 1 when `$1B28,X` is 6; otherwise it increments that field and passes the byte it indexes in the table at `$B166` (6, 5, 4, 3, 2, 1) to `$4342`, then enters movement with A=1. State 5 at `$B17C` increments the same field, uses different movement paths below 7 and at 7 or above, and selects state 1 at 11. The code that enters each state, at `$B12B` and `$B170`, clears `$1B28,X` first, so state 4 reads only the first six bytes of its table.

The type-$04 event check at `$B21D` returns when `$1A29,X` is zero. Otherwise, depending on carry returned by `$732A` and `$7227`, and the sign of `$1A6D,X`, it selects state 2 or 3 or calls `$5D7A` and toggles direction. On the state-3 path, a nonzero `$1AF5,X` supplies an alternate index for a decrement.

The load's type-$01 entity vector selects a dispatcher at `$B006`, whose three state-table pairs point to `$B01E`, `$B083` and `$B0BA`.

Type-$01 state 1 at `$B083` returns to state 0 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to `$1B28,X` and updates the frame. State 2 at `$B0BA` decrements `$1B17,X`, uses the same frame update when the result is nonzero, and calls `$4B0E` before jumping to `$5DB9` when it is zero.

Type-$01 state 0 at `$B01E` can select state 1 or 2 based on carry from `$732A` and the sign of `$1A6D,X`. Its other active paths update `$1AD3,X`, `$1AE4,X` and a frame byte and set `$1A7E,X` if clear; when `$1A29,X` is zero it only sets that flag if clear.

The load's type-$05 entity vector selects a dispatcher at `$B25F`, whose six state-table pairs point to `$B27D`, `$B30B`, `$B3B9`, `$B405`, `$B444` and `$B467`.

Type-$05 state 4 at `$B444` decrements `$1AC2,X`; a negative result copies `$1AE4,X` into the state. Otherwise it calls `$4574` or `$45BC` according to carry from `$72FC` and leaves the state alone only when the callback result masked by 6 equals 2.

The type-$05 frame helper at `$B491` adds 6 to A when the working byte at `$B4E7` is negative, clears carry again, adds `$19E5,X` and stores the low byte at `$19C3,X`. Two four-byte offset tables follow it, at `$B4E9` (2, 2, 0, 0) and `$B4ED` (4, 4, 2, 2).

Type-$05 state 5 at `$B467` decrements `$1AC2,X` and, if it is negative, calls `$4B0E` and jumps to `$5DB9`. Otherwise it uses `$1AD3,X` to read a frame-offset table, calls the frame helper and advances the index, replacing values of 4 or above with 0 after the read.

Type-$05 states 2 and 3 at `$B3B9` and `$B405` call an event helper and, if it returns, update a frame using `$1AF5,X` before decrementing `$1AD3,X`. Depending on that result and a movement callback's result, state 2 can toggle bit 7 of `$1B17,X` and select state 3; state 3 can select state 0.

The type-$05 event helper at `$B4A1` selects state 4 or 5 on set carry from `$732A`. In those paths it pulls the helper's return address off the stack and returns past the calling handler. On clear carry it can return to the handler or tail-call `$5D7A`.

Type-$05 state 0 at `$B27D` uses a returned position and `$6F3C` to choose between state 1, state 2 or a return, when its event helper returns normally. The state-2 path patches the immediate operand at `$B3F3` from its loaded value `$FF` to `$0A`, and state 2 then uses that operand.

Type-$05 state 1 at `$B30B` updates direction and frame, calls the event helper, then uses `$1AF5,X` and `$1B06,X` to choose a countdown, calls to `$4342` or `$4368`, or an allocation attempt at `$B35A`. On set carry from `$190B`, it initializes another slot as a type-$22 entity using data from the original; either way it then restores the original index and selects state 0.

Load 4 has seven LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$9592`, `$A5EC`, `$A5D7`, `$A621`, `$AB7B`, `$AA3D` and `$AA5F`. Another 13 pairs load a record's address and jump to a shared `JSR $77E0` at `$A5BF`, `$A864` and `$A971`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$A9C0` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$AD87` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$A92C` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$A7FC`/`$A802` and `$A814`/`$A81A` from offsets 2 and 3, and `$A95A`/`$A960` from offsets 4 and 5.

The offset-4 targets are routines at `$AE47`–`$AEAC`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`.

The offset-2 targets are drawing routines at `$AD3B`–`$AD85`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$A921` buys the first item (`$AA36`) when the incoming `$AA31` is negative and the second (`$AA37`) otherwise. It charges the item's packed-decimal price through `$A92C` and, with too little gold, goes back to the wait loop at `$A871`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$AA5F` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$A8F8` reads `$AA30` first: when it is nonzero it passes `$AA31` to the stage-price choice at `$A714`. Otherwise a nonzero `$AA31` goes to the item purchase at `$A921`, and a zero `$AA31` passes message `$AA9A` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$AA83` when bit 1 is set.

The shop input choice at `$A895` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$AA31`; when the new mode is nonzero and `$AA30` is zero they pass the item now chosen to the message selector `$A9C0`, and both call the cursor helper `$A9A8`.

The shop initializer at `$A867` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$AA31`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$A871` and `$A884` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$A8A4` then jumps to `$A79B` when `$AA30` is nonzero, or stores `$FF` in `$4753,X` and passes message `$AA72`.

The load's type-$22 entity vector selects a dispatcher at `$B6A6`, whose three state-table pairs point to `$B6BE`, `$B6F1` and `$B737`.

Type-$22 state 2 at `$B737` increments a counter and updates a frame while the counter is below 2; otherwise it clears `$1B28` in the slot that `$1AD3,X` names and jumps to `$4454` with the original X.

Type-$22 state 1 at `$B6F1` can call a sign-selected movement routine, then uses carry from `$44DE` to increment a counter or initialize state 2.

Type-$22 state 0 at `$B6BE` enters the alternate-slot cleanup when `$1A29,X` is zero; otherwise it calls the collision helper and chooses a movement callback by a sign byte, and the callback's carry moves it to state 1.

The type-$22 collision helper at `$B75B` returns directly or enters state-2 setup after either of two carry checks. State-2 setup returns to the helper's caller, so a state-0 call continues after it.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8EEB`) to `$717C`, which copies 2,048 bytes from `$8EEB–$96EA` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply view-origin values that the code at `$33F7–$3408` later changes.

Stage-object record 2 at `$9532` names the counter panel `$A48F` in its bytes 10 and 11. The panel's code lies in bytes that visual-resource selector 2 also copies as characters, from `$A0EC`.

The counter panel at `$A48F` writes its price digits, compares the selected player's gold and meter, and then waits in two input loops. In the first, Fire takes the first choice at `$A58F` and right moves the cursor to the second; in the second, Fire takes the second choice at `$A573` and left returns to the cursor setup at `$A536`.

The completion path at `$A58F` charges the selected player through `$7889`, converts the meter to score through `$6097`, sets the hourglass countdown `$4B0D` to `$8C` and redraws the hourglass, increments the player's count at `$528C`, stores `$FF` in `$4753,X` and waits on message `$A621`.

Seven message records serve this panel: `$A5D7`, `$A5EC`, `$A603`, `$A621`, `$A634`, `$A644` and `$A658`. They keep the game's spelling and punctuation.

The price formatter at `$A9ED` splits an item's two packed price bytes into four digit values at `$AA2B`–`$AA2E` and blanks leading zeros. The routine at `$A9D2` then writes the four cells, each through the digit writer `$A9E4` with colour 1 in colour RAM.

Shop helper `$A995` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$A9A8` adds one to the mode `$AA31`, takes the cursor position from `$AA32` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$A980` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 4 holds the same 34 message records as load 1, byte for byte, at `$AA3D–$AD3A`.

Load 4's split row-pointer tables hold 81 pairs, all 70 bytes apart from `$8671`, the last at `$9C51`; the map's 31 rows use the first 31. `test_later_row_pointer_tails.js` checks all pairs.

Entity records 1, 2 and 3 at `$B777`, `$B781` and `$B78B` are moving platforms (type `$FF`) that name the motion entries `$9491`, `$9486` and `$949C` in their bytes 7 and 9, which `$68CB` patches into the JSR at `$68E5`. Each entry points `$54/$55` at a 31-byte stream (`$94C6`, `$94E5` and `$94A7`) and jumps to the repeating-motion reader `$6A3A`. The streams lie inside the character source at `$8EEB`. `later-motion-streams.json` holds the decoded sequences.

Stage-object record 3 at `$9542` names the initializer `$9552`, which makes the entity in slot X a type-$08 entity with base frame `$E7`, places it at screen X `$00C8`, Y `$A8`, and passes message `$9592` to `$77E0`. `test_later_object_inits.js` checks the field writes and the pointer.

Stage-object record 3 at `$9542` also names the result callback `$95A7`, which returns A=`$09` with carry set.

The shop entry at `$A681` jumps to `$A687`, which writes the screen page plus one into `$A9E6` and `$AA30`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths.

The shop choice code at `$A714` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths.

The second shop entry at `$A7A7` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$A7F5` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$A844` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$AA3D` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

27 of the 38 distinct handler addresses are one-byte RTS entries: `$B0C9`, `$B0CA`, `$B4F1`, `$B4F2`, `$B694–$B6A5` and `$B772–$B776`. 33 of the 48 types select one of them.

The type-$08 entity vector selects the dispatcher at `$B4F3`, whose five state-table pairs point to `$B50F`, `$B530`, `$B5B4`, `$B5F2` and `$B619`. The type's own code stores only 0 to 4 in its state.

Type-$08 states 3 and 4 at `$B5F2` and `$B619` set frames and branch by direction or timer; when state 4's timer runs out it calls `$4B20` with A=2 and jumps to `$5DB9`.

Type-$08 state 0 at `$B50F` calls `$3020` twice and uses the second result's low two bits to set `$1B06,X` to 4–7 before incrementing the state.

The type-$08 shared movement at `$B5D0` selects `$4574` or `$45BC` by the sign of `$1AC2,X` and flips that sign bit if the callback returns carry set.

Type-$08 state 2 at `$B5B4` uses an unsigned phase comparison at 5 and an exact match at 11 to select callbacks or return to state 0.

Helper `$B636` computes two frame bytes with a three-addition carry chain.

The type-$08 helper `$B646` changes state and removes its return address when `$732A` returns carry set. A clear result leads to `$7227` and can negate `$1AC2,X` and call `$5D7A`.

Type-$08 state 1 at `$B530` uses a phase and count to select callbacks and can set up a second slot as a type-$04 entity with base frame `$C7`. The code calls `$447A` immediately after `$190B` without testing carry.

When all 17 entity slots are full, `$190B` scans down to X = `$FF` and returns carry clear. State 1 does not test the carry, so `$447A` and the setup stores from `$B579` run with X = `$FF` and land 255 bytes past the start of each slot array: the type `$04` goes to `$1A18`, and the parent's slot number to `$1BF4`.

