# Load 18 — verified technical facts

The resident draw loop at `$6D41–$6D63` uses load 18's four tables at `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use its attribute table at `$80CF`.

Load 18's map has 15 rows of 83 cells, stored 128 bytes apart from `$8671`; the row pointers are split between `$85CF` and `$8620`. The byte after the last row, `$8DF1`, is the character source named at `$7F41`. The downward scroll check uses the row count at `$7F4C` as its boundary.

Load 18's sound pointers at `$7F58–$7F5D` select voice lists at `$9FCE`, `$9FD4` and `$9FDA`, whose records name six distinct patterns: `$9FE0`, `$A097`, `$A0F8`, `$A17F`, `$A1EE` and `$A254`. `test_stage_sound_patterns.js` checks the pointers and the pattern boundaries.

The load's descriptor names one six-byte trigger record at `$916D` (count at `$7F54`) and one sixteen-byte stage-object record at `$9173` (count at `$7F57`). `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions. The trigger record (column 22, row 6, count 1, argument `$CB`) names the resident callback `$72AB`, which puts the count back and can start a recoil or make a temporary type-$2B entity at the trigger. The stage-object record names the shop's second entry `$9186` in its bytes 10 and 11 and the items `$15` (8 Bombs) and `$16` (Tornado Magic) in bytes 4 and 5, which that entry reads from fields 7 and 8.

The resident jump at `$0450`, `JMP ($7F3F)`, enters `$9151`, inside the eight-page character source at `$8DF1`. The code there stores 6 in `$4DCB,X` for the selected player and jumps to `$0732` when `$6F3C` is `$51` and `$6F3D` is below 6, otherwise to `$0200`.

The resident loader `$7A6E` unpacks the load's file as two compressed streams: 992 input bytes to `$EB40–$F53F` and 4,355 to `$7EDF–$A553`. The decoder stops at the second stream's end marker, 241 bytes before the end of the file.

Load 18 has three LDX/LDY pairs that load a message record's address with a call or jump to `$77E0` a few bytes later; they name `$967D`, `$953F` and `$9561`. Another ten pairs load a record's address and jump to `$9286`, `$9366` or `$9473`, each of which calls `$77E0`. `$77E0` copies each of the record's three zero-terminated lines into the message buffers, turning spaces into glyph zero. Glyph `$60`, a downward-pointing triangle, is the marker that the resident routine at `$6DDE` blinks while it waits for Fire.
The item-message selector at `$94C2` multiplies A by eight and adds 6, and passes the pointer at bytes 6 and 7 of that row of the item table at `$9889` to `$77E0`. The table's 24 rows name 21 distinct three-line records, the item names among them.

The price selector at `$942E` sends the first two bytes of an eight-byte item row to `$7901` as a packed-decimal amount. `$7901` subtracts it from the selected player's gold when there is enough; otherwise it restores the balance and returns carry clear. Item 4 selects the Winged Boots message and costs 30.

The two pointer pairs at offsets 2–5 of each item row are operands for subroutine calls. Three selectors copy them into JSR instructions: `$92FE`/`$9304` and `$9316`/`$931C` from offsets 2 and 3, and `$945C`/`$9462` from offsets 4 and 5.

The offset-4 targets are routines at `$9949`–`$99AE`. They call the helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of the selected player's fields `$4DD5`, `$4DD9` and `$4DD7`, or pass fixed A/X pairs (0/5, 1/8, 3/3 and 2/5) to `$536F`.

The offset-2 targets are drawing routines at `$983D`–`$9887`. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride.

The purchase path at `$9423` buys the first item (`$9538`) when the incoming `$9533` is negative and the second (`$9539`) otherwise. It charges the item's packed-decimal price through `$942E` and, with too little gold, goes back to the wait loop at `$9373`. On success it decrements `$4753,X`, takes the item's routine from row offsets 4 and 5, calls it with the item index plus 1, passes message `$9561` to `$77E0` and waits while `$4D6B` is nonzero.

The shop gate at `$93FA` reads `$9532` first: when it is nonzero it passes `$9533` to the stage-price choice at `$9216`. Otherwise a nonzero `$9533` goes to the item purchase at `$9423`, and a zero `$9533` passes message `$959C` to `$77E0` when `$4753,X` is negative or has bit 1 clear, or `$9585` when bit 1 is set.

The shop input choice at `$9397` tests active-low Fire, left and right in that order. Its direction handlers decrement or increment the mode byte at `$9533`; when the new mode is nonzero and `$9532` is zero they pass the item now chosen to the message selector `$94C2`, and both call the cursor helper `$94AA`.

The shop initializer at `$9369` sets the mode byte to 0 and its countdown to `$DC`. The left handler stops at `$FF` and the right handler at 1, and no other instruction writes `$9533`, so the mode stays among `$FF`, 0 and 1.

The shop wait paths at `$9373` and `$9386` call `$3C2A`, which waits until the interrupt counter `$526C` reaches 3, and decrement the countdown, so from `$DC` the shop times out after 220 calls. The timeout at `$93A6` then jumps to `$929D` when `$9532` is nonzero, or stores `$FF` in `$4753,X` and passes message `$9574`.

The load's type-$03 entity vector selects a dispatcher at `$A385`, whose three state-table pairs point to `$A39D`, `$A4A2` and `$A4DC`. The type's own code stores only 0 to 2 in its state. It is load 1's type-$03 handler, moved.

Type-$03 state 1 at `$A4A2` chooses a movement callback by a signed field and updates two frames; when the first frame addition wraps to zero, it calls both movement callbacks. State 2 at `$A4DC` calls `$4B20` and `$5DB9` with A=2.

The type-$03 state-0 entry at `$A39D` can return immediately, select state 1 or 2 based on callback carry and a signed field, or continue to the movement path.

The type-$03 state-0 movement tail at `$A458` reads a signed byte from a 40-byte table at `$A47A`, calls `$4342` for negative values or `$4368` otherwise, and advances the returned Y with an equality wrap at 40.

The type-$03 state-0 frame path at `$A3D4` uses carry returned by `$72FC` and the parity of `$1B28,X` to update `$1AD3,X` and two frame bytes.

The type-$03 horizontal calculation at `$A426` subtracts 6 from negative magnitudes but 5 from nonnegative values before deciding whether to call a movement routine. The difference comes from carry left clear by ADC 1 on the negative path.

The 48 low and high entity-handler bytes at `$7EDF–$7F3E` pair into 38 distinct addresses. The resident dispatcher at `$2027–$2036` copies the pair for an entity's positive type into the operand of the JSR at `$2036`; nothing limits the type to 47.

The 42 bytes at `$7F58–$7F81` hold the sound pointers (`$7F58–$7F5D`), reward and item values, map replacements, sampled-map comparisons and, at `$7F81`, the visual-resource selector that `$06A1` reads.

The bytes at `$7F43–$7F49` supply initial colour shadows, player frame and position; `$7F4D/$7F4E` supply the view origin, which `$33EC–$3408` replaces with the current view's left and top while `$6D17` redraws the screen and then restores.

The price formatter at `$94EF` splits an item's two packed price bytes into four digit values at `$952D`–`$9530` and blanks leading zeros. The routine at `$94D4` then writes the four cells, each through the digit writer `$94E6` with colour 1 in colour RAM.

Shop helper `$9497` samples the inputs through `$3C4C` and returns carry set while Fire (`$70`), left (`$73`) or right (`$74`) is held. `$94AA` adds one to the mode `$9533`, takes the cursor position from `$9534` at that index and passes it to `$719E` with Y = `$82`.

The shop conditional-item resolver at `$9482` changes item `$13` to `$14` when the selected player has flag `$10`; other inputs pass through.

Load 18 holds the same 34 message records as load 1, byte for byte, at `$953F–$983C`.

Load 18's split row-pointer tables hold 81 pairs, all 128 bytes apart from `$8671`, the last at `$AE71`; the map's 15 rows use the first 15. `test_later_row_pointer_tails.js` checks all pairs.

Load-18 entries `$A32F` and `$A359` pass the encoded streams at `$A33A` and `$A364`, which hold the same bytes, to the resident repeating-motion reader `$6A3A`; each yields 36 values before resetting. Entity records 3 and 4 at `$A517` and `$A521`, both moving platforms, name `$A32F` in their bytes 7 and 9; no record or instruction in load 18 names `$A359`. `test_later_motion_streams.js` checks the decoded sequences.

The shop entry at `$9183` jumps to `$9189`, which writes the screen page plus one into `$94E8` and `$9532`, formats the two stage prices from `$4783,X` and `$4789,X`, and branches on the selected player's balance and on `$4753,X`. `test_later_shop_entries.js` checks these paths. No record or instruction in load 18 names `$9183`; the stage-object record names the second entry, `$9186`. The shop code from `$9183` to `$95F0` is also the end of the character source that `$717C` copies.

The shop choice code at `$9216` branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. `test_later_shop_choices.js` checks these paths. The shop timeout enters `$929D`, which decrements `$4753,X` and passes message `$963E`.

The second shop entry at `$92A9` selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. `test_later_shop_pairs.js` checks both paths for both players.

The shop drawing setup at `$92F7` selects two pointer-table entries, calls the second and first item targets with A=`$E4` and `$D0`, and fills three rows of colour RAM. `test_later_shop_draw_setup.js` checks the target selection and colour writes.

The shop label code at `$9346` passes two selected item bytes to the formatter and calls the display routine with Y=`$73` and `$87`, then passes the choice prompt `$953F` to `$77E0`. `test_later_shop_labels.js` checks the call arguments.

31 of the 38 distinct handler addresses are one-byte RTS entries: `$A383`, `$A384` and `$A4E6–$A502`. 39 of the 48 types select one of them.

