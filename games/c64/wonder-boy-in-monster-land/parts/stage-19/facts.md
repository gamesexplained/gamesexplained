# Load 19 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 19's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 19's map has 29 rows of 63 cells, stored 128 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$94F1`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 19's sound pointers at `$7F58–$7F5D` select voice lists at `$B44F`, `$B455` and `$B45B`, whose records name five distinct patterns: `$B461`, `$B518`, `$B579`, `$B66F` and `$B6D5`. Voice 2's list also holds a pointer to `$B600`, but its low byte is zero, so the sequencer reads it as the end of the list and that pattern never plays. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names nine six-byte trigger records at `$985C` (count at `$7F54`) and three sixteen-byte stage-object records at `$98AE` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. Eight trigger records, at every other column from 23 to 37 of row 7, name the resident callback `$72AB`; the ninth, with a count of 3, names the money-bag callback `$5BE1`. Stage-object record 1 names the panel `$A278` in its bytes 10 and 11. Record 2 names the shop entry `$9A4C` in bytes 10 and 11, the stage prices 22 and 8 in bytes 8 and 9, and the callbacks `$9A15` and `$991B`, which the shop's second- and first-price paths call, in bytes 4–7. Record 3 names `$98DE`, the result callback `$9917` and the resident alternate update loop `$073F` in bytes 6–11.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$9851`, inside the eight-page character source at `$94F1`. The code there stores 6 in `$4DCB,X` for the selected player and jumps to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 2,200 input bytes to `$EB40–$FFBF` and 7,745 to `$7EDF–$BFCB`. The decoder stops at the second stream's end marker, 215 bytes before the end of the file.

Load 19 has 17 LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$989F`, `$995C`, `$998A`, `$99B6`, `$99EB`, `$9A1C`, `$9F46`, `$9E08`, `$9E2A`, `$A3C0`, `$A40A`, `$BC70`, `$BCA5`, `$BCF0`, `$BD20`, `$BDED` and `$BE27`. Another 15 pairs load a record's address and jump to `$9B4F`, `$9C2F`, `$9D3C`, `$A31C` or `$A3A8`, each of which calls `$77E0`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$9D8B` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$A152` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$9CF7` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$9BC7`/`$9BCD` and `$9BDF`/`$9BE5` from offsets 2 and 3, and `$9D25`/`$9D2B` from offsets 4 and 5.

The offset-4 targets are routines at `$A212`–`$A277`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`.

The offset-2 targets are drawing routines at `$A106`–`$A150`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$9CEC` buys the first item (`$9E01`) when the incoming `$9DFC` is negative and the second (`$9E02`) otherwise. It charges the item's packed-decimal price through `$9CF7` and, with too little gold, goes back to the wait loop at `$9C3C`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$9E2A` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$9CC3` reads `$9DFB` first: when it is nonzero it passes `$9DFC` to the stage-price choice at `$9ADF`. Otherwise a nonzero `$9DFC` goes to the item purchase at `$9CEC`, and a zero `$9DFC` passes message `$9E65` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$9E4E` when bit 1 is set.

The shop input choice at `$9C60` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$9DFC`; when the new mode is nonzero and `$9DFB` is zero they pass the item now chosen to the message selector `$9D8B`, and both call the cursor helper `$9D73`.

The shop initializer at `$9C32` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$9DFC`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$9C3C` and `$9C4F` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$9C6F` then jumps to `$9B66` when `$9DFB` is nonzero, or stores `$FF` in `$4753,X` and passes message `$9E3D`.

The load's type-$01 and type-$16 entity vectors select a dispatcher at `$B765`, whose three state-table pairs point to `$B77D`, `$B7E2` and `$B819`. The type's own code stores only 0 to 2 in its state. It is load 2's type-$01 handler, moved.

Type-$01 state 0 at `$B77D` can select state 1 or 2 based on carry from `$732A` and the sign of `$1A6D,X`. Its other active paths update `$1AD3,X`, `$1AE4,X` and a frame byte and set `$1A7E,X` if clear; when `$1A29,X` is zero it only sets that flag if clear.

Type-$01 state 1 at `$B7E2` returns to state 0 when `$1A8F,X` is zero; otherwise it calls `$45BC` or `$4574` according to `$1B28,X` and updates the frame. State 2 at `$B819` decrements `$1B17,X`, uses the same frame update when the result is nonzero, and calls `$4B0E` before jumping to `$5DB9` when it is zero.

The load's type-$02 entity vector selects a dispatcher at `$B828`, whose three state-table pairs point to `$B840`, `$B90A` and `$B944`. The type's own code stores only 0 to 2 in its state. It is load 1's type-$02 handler, moved.

Type-$02 state 2 at `$B944` computes a frame based on whether `$1AD3,X` equals `$80`, decrements `$1AE4,X` and can call `$4B0E` and `$5DB9`.

Type-$02 state 1 at `$B90A` decrements a timer, chooses a movement callback by a signed byte, and either resets to state 0 or updates a frame.

The type-$02 helper at `$B8E5` toggles bit 7 of `$1AD3,X`. The frame helper at `$B8EE` patches an immediate operand to 0 or 8 and combines it with a timer bit and `$19E5,X`.

The type-$02 state-0 entry at `$B840` can select state 1 or 2 or continue to the timer path.

The type-$02 state-0 timer path at `$B883` can update a frame, select a movement callback, or reset a timer and toggle two direction bits.

The type-$0A entity dispatcher at `$B966` jumps through `$1AB1,X` to one of five targets: `$B982`, `$B99F`, `$B9F1`, `$BA4C` and `$BA6D`. The type's own code stores only 0 to 4 in its state. The vectors for types `$03`–`$0A`, `$14`, `$15`, `$19` and `$1C` select it, and entity records 2, 3, 13 and 14 are types `$0A` and `$19`. It is load 6's type-$0A handler, moved.

Type-$0A state 3 at `$BA4C` decrements `$1B17,X` and either tail-calls a direction-selected callback or toggles bit 7 of `$1AD3,X` and restores the state from `$1B28,X`. State 4 at `$BA6D` decrements `$1AC2,X` and on a negative result calls `$4B0E` with A=`$50` and jumps to `$5DB9`.

Type-$0A helper `$BAA1` saves the state in `$1B28,X` and calls `$792C` and `$732A`. Carry set from `$732A` selects state 3 for positive `$1A6D,X` or state 4 otherwise, then discards one return address. The positive path rotates a working byte through carry from `$72FC`; the other sets `$1A8F,X`=`$FF` and `$1AC2,X`=10. Carry clear calls `$7227` and may tail-jump to `$5D7A` with A=4.

Type-$0A state 0 at `$B982` calls the event helper, stores masked results from two `$3020` calls, sets `$1AE4,X`=4 and state 1, and falls through to state 1. If the second helper call returns normally, state 1 decrements `$1AE4,X` to 3.

After its initial delay, type-$0A state 1 decrements `$1AC2,X`. A nonnegative result calls its frame helper and a direction-selected callback, and returns when the callback result masked with 6 equals 2. A negative count, or any other callback result, calls `$3020` and selects state 0 or, for a negative result, calls it again and selects state 2.

The type-$0A frame helper at `$BA7B` increments `$1B06,X`, resetting it for values at least 3, and uses twice that value plus a direction-dependent offset and `$19E5,X` to set `$19C3,X`.

Type-$0A state 2 at `$B9F1` calls its event helper and, after a delay, updates `$1AF5,X` and either selects state 0 or calls the frame helper and a direction-selected callback. Negative `$1AF5,X` values below `$8C` increment before returning to the frame update; values at least `$8C` remain unchanged.

The type-$17 handler at `$BAEA` counts down a timer and sets its frame from it, and can allocate a type-$2C slot when its decremented timer is `$FC`. That timer resets to 20 even when the active-slot check skips allocation. Its event helper can call `$4B0E` and jump to `$5DB9`.

The type-$2C handler at `$BB9D` initializes parameters when `$1B28,X` is zero, aiming the entity at the position its type-$17 parent stored in `$1AC2,X` and `$1AD3,X`, or updates a position and frame before returning or jumping to `$4454` when it is nonzero. The type-$17 handler sets up the type-$2C slots: its `STA $1919,X` at `$BB29` is the only one in load 19 that stores `$2C`.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 12 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47. None of them is a one-byte RTS; the vectors for 14 types point at `$BF3F`, where the entity records begin.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

Stage-object record 1 at `$98AE` names the counter panel `$A278` in its bytes 10 and 11. The panel first patches the page byte of its character writer at `$A3B7` with the screen page plus one, then writes four character cells and their colours.

The counter panel at `$A278` writes the two digits of the selected player's price byte `$A462,X`, compares the player's gold, shifted right four bits, with that price and the meter `$4DCD` with its limit `$4DCF`, and chooses one of four messages: "Sorry, but you short of money." (`$A441`) or "You are O.K." (`$A42D`), each after decrementing the stage field `$4753,X`, or the prompt "Next, Please." (`$A3C0`) or "Wow, how nice guy!" (`$A3D5`) by bit 1 of `$4753,X`.

The panel then waits in two input loops. In the first, Fire takes the first choice at `$A378` and right moves the cursor to the second; in the second, Fire takes the second choice at `$A35C` and left returns to the cursor setup at `$A31F`.

The completion path at `$A378` charges the selected player through `$7889`, converts the meter to score through `$6097`, sets the hourglass countdown `$4B0D` to `$8C` and redraws the hourglass, increments the player's count at `$528C`, stores `$FF` in `$4753,X` and waits on message `$A40A`.

Seven message records serve this panel: `$A3C0`, `$A3D5`, `$A3EC`, `$A40A`, `$A41D`, `$A42D` and `$A441`. They keep the game's spelling and punctuation.

The price formatter at `$9DB8` splits an item's two packed price bytes into four digit values at `$9DF6`–`$9DF9` and blanks leading zeros. The routine at `$9D9D` then writes the four cells, each through the digit writer `$9DAF` with colour 1 in colour RAM.

Shop helper `$9D60` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$9D73` adds one to the mode `$9DFC`, takes the cursor position from `$9DFD` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$9D4B` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 19 holds the same 34 message records as load 1, byte for byte, at `$9E08–$A105`.

The wrong-answer path at `$BE38` passes "Fool!!" (`$BE27`) to `$77E0` and moves the type-$1A entity whose index state 2 saved at `$BE95` to state 3, setting `$1B28,X` to `$1E` and `$1B17,X` to 1 and clearing `$1AC2`, `$1AD3`, `$1AE4`, `$1AF5` and `$1B06`. `$BE61` waits for a frame, updates the HUD, sets colour 3 across `$D887–$D89A` and then colour 1 across the cursor mode's range: `$D887–$D88C`, `$D88D–$D893` or `$D894–$D89A`.

State 3 of the type-$1A handler, at `$BE96`, branches on a countdown, collision and contact results, and selects frames or one of two X coordinates, `$0028` and `$010A`.

State 4 of the type-$1A handler, at `$BF18`, sets the two frames to the base plus 8 and 10; while `$1A8F,X` is nonzero it moves the entity 8 right or left by bit 7 of `$1B17,X`, and otherwise it returns to state 3.

The load-19 question code at `$BD50` starts at cursor mode `$FF`, allows changes toward 0 or 1, and checks an answer either on Fire or when its message countdown `$4D6B` reaches zero. A negative mode follows the wrong-answer path; otherwise the former mode bit 0 is compared with bit 0 of `$9A4B`.

The load-19 state dispatcher at `$BC10`, which type `$1A` selects, picks one of five handlers by the entity's state byte. Its first handler increments the state and sets `$9A4B` to the low two bits of either its existing negative value or the result of `$3020`. The quiz later compares the low bit.

The Sphinx state at `$BCDC` chooses the question using bit 1 of `$9A4B`: clear enters the question at `$BD50`, set displays the hobby question at `$BCF0` and joins the common setup.

Load 19's split row-pointer tables hold 81 pairs, all 128 bytes apart from `$8671`, the last at `$AE71`; the map's 29 rows use the first 29. `test_later_row_pointer_tails.js` checks all pairs.

Stage-object record 3 at `$98CE` names `$98DE`, inside the character source, in its bytes 6 and 7, and the resident alternate update loop `$073F`, which the record names in bytes 10 and 11, calls it through the patched JSR at `$0778` with X the free slot that `$190B` found. It makes that slot a type-$1A entity, the Sphinx (sprite base `$EF`, parameter `$7F`, screen X `$00A0`, Y `$AE`). `test_later_object_inits.js` checks its field writes.

The load-19 object callback at `$991B`, which the shop's first-price path calls, takes two low bits from `$3020`, stores them with bit 7 set at `$9A4B`, and selects one of four hint messages. If the `$BC2C` state then runs, its negative-byte branch preserves those two low bits: bit 1 chooses the quiz question and bit 0 chooses its accepted cursor mode. `test_sphinx_choice.js` checks the hint pointers and the retention.

Stage-object record 3 at `$98CE` names the result callback `$9917` in its bytes 8 and 9; it returns A=0 with carry set. `test_later_object_results.js` checks the return.

When the hint callback at `$991B` is followed by the `$BC2C` quiz state, its four seeds pair the chicken hint with middle choice CHICKEN, the dieting hint with right choice SARAD, the night-noise hint with middle choice KARAOKE, and the breaking-windows hint with right choice GOLF. The cursor-colour ranges identify the left, middle and right options. `test_sphinx_solutions.js` checks the stored option strings and the selection logic.

The shop entry at `$9A4C` jumps to `$9A52`, which writes the screen page plus one into `$9DB1` and `$9DFB`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths. The shop code from `$9A4C` to `$9CF0` is also the end of the character source that `$717C` copies.

The shop choice code at `$9ADF` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths. The shop timeout enters `$9B66`, which decrements `$4753,X` and passes message `$9F07`.

The second shop entry at `$9B72` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$9BC0` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$9C0F` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$9E08` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

No instruction in load 19 names the byte at `$BAE9` (`$BB`), which lies between the type-$0A working byte `$BAE8` and the type-$17 handler at `$BAEA`. What it is for is unknown.
