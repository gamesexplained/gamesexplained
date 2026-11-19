# Second load — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 2's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 2's map has 16 rows of 115 cells, stored 128 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8E71`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

### The type-$04 animation

Load 2's type-$04 entity records at `$BF4F`, `$BF59` and `$BF63` give the base frame `$C7`. The type's frame routine `$BB80` makes the primary frame from the base frame `$19E5,X`, plus 4, plus `$1AD3,X`, plus bit 1 of a counter it increments on each call; with `$1AD3,X` = `$FC`, which state 0 can set, the primary frame alternates between `$C7` and `$C9` every two calls. The resident display mapper at `$1CAB–$1D17` gives such an entity two display slots: the frame after the primary one, marked multicolour, and the primary frame, marked single-colour. In VIC bank 3 the frames `$C7`–`$CA` lie at `$F1C0`, `$F200`, `$F240` and `$F280`.

Load 2's sound pointers at `$7F58–$7F5D` select voice lists at `$B705`, `$B70F` and `$B719`, whose records name nine distinct patterns: `$B723`, `$B76A`, `$B7AE`, `$B7EE`, `$B831`, `$B872`, `$B8B4`, `$B8F7` and `$B93C`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names six six-byte trigger records at `$9676` (count at `$7F54`) and four sixteen-byte stage-object records at `$969A` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$9661`, inside the eight-page character source at `$8E71`. The last two characters of that source are code: it stores 2 in `$4DCB,X` for the selected player and jumps to `$0732` when `$6F3C` is `$70`, otherwise to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 1,376 input bytes to `$EB40–$F9BF` and 8,692 to `$7EDF–$BF81`. The decoder stops at the second stream's end marker, 92 bytes before the end of the file.

The load's type-$04 entity vector selects a dispatcher at `$BA43`, whose six state-table pairs point to `$BA61`, `$BA8E`, `$BB21`, `$BB40`, `$BAC6` and `$BAF4`.

Type-$04 state 0 at `$BA61` sets `$1AD3,X` to `$00` or `$FC` from either the sign returned by `$3020` or a comparison of `$6F3C` with the X returned by `$71DB`, depending on `$19B2,X`. It calls `$BB80`, sets the state to 1 and returns.

The shared routine at `$BB80` increments `$1AC2,X`, then adds bit 1 of the result, `$19E5,X`, 4 and `$1AD3,X`, carrying between the additions, and stores the low byte at `$19C3,X`. Its callers include type-$04 state 0.

Type-$04 state 2 at `$BB21` selects state 1 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to the sign of `$1AD3,X` and updates the frame. State 3 at `$BB40` decrements `$1AE4,X` and either sets `$1AD3,X` to 4 and updates the frame or calls `$4B0E` and jumps to `$5DB9`.

The type-$04 helpers at `$BB57` and `$BB60` set `$1A7E,X` to 1 only when it was zero, and clear it, respectively. The helper at `$BB66` toggles `$1AD3,X` with exclusive-OR `$FC` before falling through to `$BB6E`, which updates the frame and chooses `$4574` or `$45BC` from its sign with A=2.

Type-$04 state 1 at `$BA8E` selects a direction toggle or state 4 when its movement helper returns carry set. On clear carry it indexes a four-entry split table: entries 0 and 1 select the direction toggle and state-5 setup, while entries 2 and 3 return.

Type-$04 state 4 at `$BAC6` selects state 1 when `$1B28,X` is 6; otherwise it increments that field and passes the byte it indexes in the table at `$BADE` (6, 5, 4, 3, 2, 1) to `$4342`, then enters movement with A=1. State 5 at `$BAF4` increments the same field, uses different movement paths below 7 and at 7 or above, and selects state 1 at 11. The code that enters each state, at `$BAA3` and `$BAE8`, clears `$1B28,X` first, so state 4 reads only the first six bytes of its table.

The type-$04 event check at `$BB95` returns when `$1A29,X` is zero. Otherwise, depending on carry returned by `$732A` and `$7227`, and the sign of `$1A6D,X`, it selects state 2 or 3 or calls `$5D7A` and toggles direction. On the state-3 path, a nonzero `$1AF5,X` supplies an alternate index for a decrement.

The load's type-$01 entity vector selects a dispatcher at `$B97E`, whose three state-table pairs point to `$B996`, `$B9FB` and `$BA32`.

Type-$01 state 1 at `$B9FB` returns to state 0 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to `$1B28,X` and updates the frame. State 2 at `$BA32` decrements `$1B17,X`, uses the same frame update when the result is nonzero, and calls `$4B0E` before jumping to `$5DB9` when it is zero.

Type-$01 state 0 at `$B996` can select state 1 or 2 based on carry from `$732A` and the sign of `$1A6D,X`. Its other active paths update `$1AD3,X`, `$1AE4,X` and a frame byte and set `$1A7E,X` if clear; when `$1A29,X` is zero it only sets that flag if clear.

The load's type-$05 entity vector selects a dispatcher at `$BBD7`, whose six state-table pairs point to `$BBF5`, `$BC83`, `$BD31`, `$BD7D`, `$BDBC` and `$BDDF`.

Type-$05 state 4 at `$BDBC` decrements `$1AC2,X`; a negative result copies `$1AE4,X` into the state. Otherwise it calls `$4574` or `$45BC` according to carry from `$72FC` and leaves the state alone only when the callback result masked by 6 equals 2.

The type-$05 frame helper at `$BE09` adds 6 to A when the working byte at `$BE5F` is negative, clears carry again, adds `$19E5,X` and stores the low byte at `$19C3,X`. Two four-byte offset tables follow it, at `$BE61` (2, 2, 0, 0) and `$BE65` (4, 4, 2, 2).

Type-$05 state 5 at `$BDDF` decrements `$1AC2,X` and, if it is negative, calls `$4B0E` and jumps to `$5DB9`. Otherwise it uses `$1AD3,X` to read a frame-offset table, calls the frame helper and advances the index, replacing values of 4 or above with 0 after the read.

Type-$05 states 2 and 3 at `$BD31` and `$BD7D` call an event helper and, if it returns, update a frame using `$1AF5,X` before decrementing `$1AD3,X`. Depending on that result and a movement callback's result, state 2 can toggle bit 7 of `$1B17,X` and select state 3; state 3 can select state 0.

The type-$05 event helper at `$BE19` selects state 4 or 5 on set carry from `$732A`. In those paths it pulls the helper's return address off the stack and returns past the calling handler. On clear carry it can return to the handler or tail-call `$5D7A`.

Type-$05 state 0 at `$BBF5` uses a returned position and `$6F3C` to choose between state 1, state 2 or a return, when its event helper returns normally. The state-2 path patches the immediate operand at `$BD6B` from its loaded value `$FF` to `$0A`, and state 2 then uses that operand.

Type-$05 state 1 at `$BC83` updates direction and frame, calls the event helper, then uses `$1AF5,X` and `$1B06,X` to choose a countdown, calls to `$4342` or `$4368`, or an allocation attempt at `$BCD2`. On set carry from `$190B`, it initializes another slot as a type-$22 entity using data from the original; either way it then restores the original index and selects state 0.

Load 2 has seven LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$96E8`, `$971B`, `$974D`, `$9779`, `$B3D3`, `$B295` and `$B2B7`. Another nine pairs load a record's address and jump to a shared `JSR $77E0` at `$B0BC` and `$B1C9`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$B218` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$B5DF` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$B184` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$B054`/`$B05A` and `$B06C`/`$B072` from offsets 2 and 3, and `$B1B2`/`$B1B8` from offsets 4 and 5.

The offset-4 targets are routines at `$B69F–$B704`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`.

The offset-2 targets are drawing routines at `$B593–$B5DD`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$B179` buys the first item (`$B28E`) when the incoming `$B289` is negative and the second (`$B28F`) otherwise. It charges the item's packed-decimal price through `$B184` and, with too little gold, goes back to the wait loop at `$B0C9`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$B2B7` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$B150` reads `$B288` first: when it is nonzero it passes `$B289` to the stage-price choice at `$AF6C`. Otherwise a nonzero `$B289` goes to the item purchase at `$B179`, and a zero `$B289` passes message `$B2F2` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$B2DB` when bit 1 is set.

The shop input choice at `$B0ED` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$B289`; when the new mode is nonzero and `$B288` is zero they pass the item now chosen to the message selector `$B218`, and both call the cursor helper `$B200`.

The shop initializer at `$B0BF` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$B289`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$B0C9` and `$B0DC` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$B0FC` then jumps to `$AFF3` when `$B288` is nonzero, or stores `$FF` in `$4753,X` and passes message `$B2CA`.

The load's type-$22 entity vector selects a dispatcher at `$BE7E`, whose three state-table pairs point to `$BE96`, `$BEC9` and `$BF0F`.

Type-$22 state 2 at `$BF0F` increments a counter and updates a frame while the counter is below 2; otherwise it clears `$1B28` in the slot that `$1AD3,X` names and jumps to `$4454` with the original X.

Type-$22 state 1 at `$BEC9` can call a sign-selected movement routine, then uses carry from `$44DE` to increment a counter or initialize state 2.

Type-$22 state 0 at `$BE96` enters the alternate-slot cleanup when `$1A29,X` is zero; otherwise it calls the collision helper and chooses a movement callback by a sign byte, and the callback's carry moves it to state 1.

The type-$22 collision helper at `$BF33` returns directly or enters state-2 setup after either of two carry checks. State-2 setup returns to the helper's caller, so a state-0 call continues after it.

The resident routine at `$34DD` passes the pointer at `$7F41` (`$8E71`) to `$717C`, which copies 2,048 bytes from `$8E71–$9670` to RAM at `$D000–$D7FF` as the stage character set.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply view-origin values that the code at `$33F7–$3408` later changes.

The price formatter at `$B245` splits an item's two packed price bytes into four digit values at `$B283–$B286` and blanks leading zeros. The routine at `$B22A` then writes the four cells, each through the digit writer `$B23C` with colour 1 in colour RAM.

Shop helper `$B1ED` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$B200` adds one to the mode `$B289`, takes the cursor position from `$B28A` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$B1D8` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 2 holds the same 34 message records as load 1, byte for byte, at `$B295–$B592`.

The graphics setup at `$AD0E` sets `$01` to `$30`, copies ten source blocks of player sprite rows into RAM beneath I/O (two of them to three places each), calls the mirror routine `$2086` seven times from X = `$66` and Y = `$74`, and sets `$01` back to `$35`.

Load 2's split row-pointer tables hold 81 pairs, all 128 bytes apart from `$8671`, the last at `$AE71`; the map's 16 rows use the first 16. `test_later_row_pointer_tails.js` checks all pairs.

Stage-object record 2 at `$96AA` names the message callback `$96DA`, which passes `$96E8` and then `$971B` to `$77E0`. `test_later_object_messages.js` checks the pointer sequence.

The shop entry at `$AED9` jumps to `$AEDF`, which writes the screen page plus one into `$B23E` and `$B288`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths.

The shop choice code at `$AF6C` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths.

The second shop entry at `$AFFF` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$B04D` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$B09C` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$B295` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

28 of the 38 distinct handler addresses are one-byte RTS entries: `$BA41`, `$BA42`, `$BE69–$BE7D` and `$BF4A–$BF4E`. 34 of the 48 types select one of them.

