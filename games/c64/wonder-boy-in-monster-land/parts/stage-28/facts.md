# Load 28 — verified technical facts

The resident draw loop at `$6D41–$6D63` ran 200 iterations in the first 200 frames after this forced load returned. Its four indexed reads use `$81CF`, `$82CF`, `$83CF` and `$84CF` to place a metatile's four character codes in a two-by-two block. The resident movement checks use the indexed attribute table at `$80CF`; the exact meanings of all its bit combinations remain open. This observation follows a forced transition and does not establish a route by ordinary play.

The entry snapshot has 16 row pointers in split tables at `$85CF` and `$8620`. They point to rows beginning at `$8671` and spaced 122 bytes apart; the address immediately after that storage is `$8E11`, the character-data pointer recorded at `$7F41`. The downward scroll check uses `$7F4C` as its vertical boundary. This does not establish that every stored cell is encountered during play.

The captured sound pointers select voice lists at $A3C9, $A3D3, $A3E7; their records name 11 distinct event patterns. In the captured selector-1 loop, the resident sequencer selected each pattern and reached its documented zero marker in the listing-based simulator. `test_stage_sound_patterns.js` checks the pointers, pattern boundaries and those visits. This observation does not establish when ordinary play selects the sound.

The captured descriptor names 2 six-byte trigger records at `$9605` and 1 sixteen-byte stage object records at `$9611`. `$7979` copies the trigger fields; `$4655` returns before reading the object pointer if its count is zero, otherwise it copies the fields and calls the map updater. `test_stage_records.js` checks the copies and descriptions, stubbing the map updater for the sixteen-byte records. These captured records do not establish that ordinary play activates them.

In the forced play capture, 2 stable 63-byte sprite bitmaps from this load were named by active display-slot entries in VIC bank 3. Their entry and play bytes match; non-stopping checkpoints saw no instruction entry into those bitmap ranges during the following 200 frames. The observation covers those captured states and does not establish all animation or ordinary-play behavior.

The loaded pointer at `$7F3F/$7F40` targets `$95E9`, inside the eight-page character-copy source at `$8E11`. The entry was observed in the 200-frame forced-play probe and monitor collection. The code and graphics uses overlap; `codemap.json` records only observed instruction starts in that source whose bytes still matched the load-entry snapshot.

Sampling the forced play capture every ten frames through frame 200 found 10 additional active sprite pointers in this load. Their bitmap bytes matched the entry snapshot at their first sampled frame, and execution checkpoints recorded no instruction entries in those ranges during the same 200-frame probe. The recorded display settings and first sampled frame are in `display-observations.json`; natural reachability remains open.

The supplied side B file with index $1C supplies two compressed streams. Executing the game’s decoder on those bytes in the 6502 simulator consumed 1183 and 5977 bytes and wrote $EB40–$FABF and $7EDF–$AB2B, respectively. The decoded output differed from the forced VICE load-entry snapshot at $A7BE–$A7C0; the resident selector-28 patch at $2A90 makes all output bytes match. This establishes these stream writes for the supplied image, not natural reachability or ownership of repeated data across loads.

Controlled record-copy, frame-restore and display-routine simulations selected 6 additional bitmap pointers in this load. Slot assignment, position, effect state and one colour were forced. The bitmaps match the load-entry and play captures; no instruction entered their ranges during a 200-frame probe. These examples do not establish natural reachability.

5 three-line message records in this load were identified from instruction sequences that load their addresses in X/Y before reaching $77E0. With selector $77E1 forced to zero, listing tests check the pointer and copy of every recorded line into the message buffers; spaces become glyph zero. Twelve controlled VICE calls check representative records from loads 2, 4, 9, 12, 19, 22, 29, 30 and 31 with the same selector. Glyph $60 is a downward-pointing triangle; its role and ordinary-play reachability remain open.
The item-message selector at $9EDC computes an eight-bit table offset from A with decimal mode clear and passes a selected pointer in X/Y to $77E0. Controlled inputs 0–23 select 24 pointer entries and 21 distinct three-line records, including item names. Listing tests check every selection and copy with selector $77E1 forced to zero; ten controlled VICE calls check representative selections in loads 2, 4, 9, 19, 27 and 30. The input range in play and ordinary-play reachability remain open.

The price selector at $9E48 sends the first two bytes of an eight-byte item row to $7901 as a packed-decimal amount. The game subtracts that amount from the selected player’s gold when funds suffice; otherwise it restores the balance and returns clear carry. Listing tests cover all 24 captured prices at zero, one below the price, the exact price and 9,999 gold (where distinct), and ten controlled VICE calls check representative deductions. Item index 4 selects the Winged Boots message and has a price of 30 in these captured tables; ordinary-play reachability remains open.

The two pointer pairs at offsets 2–5 in each item row supply subroutine-call operands. Three selectors copy these pairs into JSR instructions; listing tests check all 24 captured rows at each selector, and eleven controlled VICE calls check representative patches. Ordinary-play reachability remains open.

The item-row targets at offset 4 select routines at $A363–$A3C8. Controlled item inputs call helpers for Wing Boots, Helmet, Gauntlet or Revival Medicine, update one of three selected-player fields, or pass fixed A/X values to $536F. Listing tests cover all 24 item paths for both player indices with external routines stubbed; sixteen controlled VICE calls check representative paths. Natural purchase reachability and the external callbacks’ remaining effects remain open.

The item-row targets at offset 2 select drawing routines at $A257–$A2A1. Depending on the target, they return or write a 4-by-3 or 4-by-4 block of consecutive tile bytes using a 40-byte row stride. Listing tests check all 24 item targets in 17 loads with decimal mode clear; eleven controlled VICE calls check representative tile writes. Natural shop contexts remain open.

2 simple eight-row glyphs in the character-copy source are referenced by metatiles in the captured map. Listing tests reconstruct their map references and run the $717C copy; seven controlled VICE reads check representative destination glyphs in loads 2, 20, 27 and 31. These observations do not establish ordinary-play reachability or exclude other possible code uses.

The purchase path at $9E3D selects an item index, charges its packed-decimal price and branches away on insufficient funds. On success it decrements $4753,X, selects an effect target, calls it with the item index plus 1, passes a message pointer to $77E0 and waits while $4D6B is nonzero. Listing tests cover 68 controlled purchase paths across 17 loads and eight VICE calls check representative paths, with effect and message callbacks stubbed. The gate at $9E14 supplies that flag from $9F4D on one path; other entry paths and ordinary-play purchase reachability remain open.

The shop gate at $9E14 can branch to the purchase choice using the sign of $9F4D, or pass one of two message pointers according to $4753,X. Listing tests check 102 controlled gate cases and the extended purchase paths across 17 loads; eight VICE calls check gate cases and eight check purchases. The gate byte’s role, the mode’s possible values and natural reachability remain open.

The shop input choice at $9DB1 tests active-low fire, left and right in that order. Its direction handlers decrement or increment the mode byte at $9F4D, can pass the corresponding item index to the message selector, and call another helper. Listing tests check 204 controlled input and mode cases across 17 loads with callbacks stubbed; eleven VICE calls check representative paths. Ordinary-play timing, mode ranges and callback effects remain open.

The shop initializer at $9D83 sets the mode byte to 0 and its countdown to $DC. Starting from 0, the traced left and right handlers keep the mode among $FF, $00 and $01 if no other code changes it. Listing tests check initialization and every transition among those three values in 17 loads; ten controlled VICE calls check representative cases with callbacks stubbed. Other possible writes and ordinary-play timing remain open.

The shop wait paths at $9D8D and $9DA0 call $3C2A and decrement the countdown. Starting from $DC, controlled paths reach zero after 220 calls; the timeout then either branches on the gate byte or marks $4753,X and passes a message pointer. Listing tests check both wait paths and timeout branches in 17 loads with callbacks stubbed; eight controlled VICE calls check representative paths. Seconds, ordinary-play timing and other exits remain open.

The captured map references 91 additional described glyphs through its tile-quadrant tables. Their source bytes match the copied character RAM in the play capture, and `test_map_glyphs_expanded.js` checks each map reference and runs the $717C copy. Controlled VICE reads of 18 glyphs in loads 2, 9, 16, 20, 27 and 31 agree with the captures. Ordinary-play reachability and other uses remain open.

The type-$0F entity dispatcher at $A7B6 returns when $1A8F,X is positive. Otherwise $2A7D clamps the state index to 4, and five captured table pairs select $A7DA, $A7F3, $A868, $A8BA, $A8C0. VICE checked the five states and out-of-range indices in loads 10, 28 and 29; ordinary-play reachability and the handlers remain open.

For type-$0F state 0, after two helpers return, $1B28,X increments; reaching $14 changes it to 7 and increments $1AB1,X. State 3 sets $1AB1,X to zero. VICE checked timer boundaries and state 3 with the two state-0 helpers replaced by returns in loads 10, 28 and 29. Helper effects and ordinary-play reachability remain open.

Type-$0F state 4 decrements $1AC2,X. A nonnegative result sets $19C3,X from $19E5,X plus 4 or 10 according to the sign of $1AE4,X; a negative result calls $4B0E with A=$40 and jumps to $5DB9. VICE checked both outcomes and both position offsets in loads 10, 28 and 29, stubbing $4B0E to record its argument. Ordinary-play reachability remains open.

Type-$0F helper $A8E0 calls $792C and $732A. Carry set from $732A with positive $1A6D,X discards the helper return address and returns from the calling state; with zero or negative $1A6D,X it sets $1AC2,X=10, $1A8F,X=$FF and $1AB1,X=4. Other returning paths call $7227 and tail-jump to $5D7A with A=8 if carry is set. VICE checked five forced cases with callbacks stubbed in loads 10, 28 and 29; ordinary-play reachability remains open.

Type-$0F state 2 calls its event and frame helpers. If both return and $1B28,X equals 8, it clears the timer and state; otherwise it calls $4368 with the timer and increments it. The frame helper selects $1AE4,X from the carry returned by $72FC, adds 6, $19E5,X and $1B17,X with carry propagation, and toggles bit 1 of $1B17,X when $1B06,X increments to 4. VICE checked four cases for each routine in loads 10, 28 and 29 with callbacks stubbed. Ordinary-play reachability remains open.

Type-$0F state 1 calls its event and frame helpers. If they return and $1B28,X is nonzero, it calls $4342 and decrements the timer. Otherwise it advances the state after optionally calling $190B; when that call returns carry set, it calls $447A and initializes a type-$23 slot from the Y slot. VICE checked timer, skip, failure and successful allocation paths with callbacks stubbed in loads 10, 28 and 29. Callback effects and ordinary-play reachability remain open.

The type-$23 entity dispatcher at $AA3E uses $1AB1,X without a local bounds check. Two captured table pairs select $AA54, $AACC; VICE checked both in loads 10, 28 and 29. The type-$0F state-1 allocation path initializes this entity type, but ordinary-play reachability and index bounds remain open.

Type-$23 state 1 calls $792C and $7227, optionally calls $5D7A with A=8, and decrements $1AC2,X. A nonnegative result subtracts 2 from $19C3,X; a negative result decrements $1AC2 in the slot named by $1AD3,X, restores the original X through a patched immediate operand and jumps to $4454. VICE checked four forced cases in loads 10, 28 and 29 with callbacks stubbed. Ordinary-play reachability remains open.

Type-$23 state 0 can transition to state 1 after carry from $7227 or a zero-countdown call to $44DE. Its other paths update $1AC2,X, a motion countdown and $1AE4,X according to callback results. VICE checked eight forced cases in loads 10, 28 and 29 with callbacks stubbed; callback effects and ordinary-play reachability remain open.

The type-$0A entity dispatcher at $A62E uses $1AB1,X without a local bounds check. Five captured table pairs select $A64A, $A667, $A6B9, $A714, $A735; VICE checked all five in loads 6, 19 and 28. Ordinary-play reachability and index bounds remain open.

Type-$0A state 3 decrements $1B17,X and either tail-calls a direction-selected callback or toggles bit 7 of $1AD3,X and restores the state from $1B28,X. State 4 decrements $1AC2,X and on a negative result calls $4B0E with A=$50 and jumps to $5DB9. VICE checked seven forced cases in loads 6, 19 and 28 with callbacks stubbed. Ordinary-play reachability remains open.

Type-$0A helper $A769 saves the state in $1B28,X and calls $792C and $732A. Carry set from $732A selects state 3 for positive $1A6D,X or state 4 otherwise, then discards one return address. The positive path rotates a working byte through carry from $72FC; the other sets $1A8F,X=$FF and $1AC2,X=10. Carry clear calls $7227 and may tail-jump to $5D7A with A=4. VICE checked six forced cases in loads 6, 19 and 28 with callbacks stubbed. Ordinary-play reachability remains open.

Type-$0A state 0 calls the event helper, stores masked results from two $3020 calls, sets $1AE4,X=4 and state 1, and falls through to state 1. If the second helper call returns normally, state 1 decrements $1AE4,X to 3. VICE checked three forced $3020 values in loads 6, 19 and 28 with callbacks stubbed. Ordinary-play reachability remains open.

After its initial delay, type-$0A state 1 decrements $1AC2,X. A nonnegative result calls its frame helper and a direction-selected callback, and selects state 0 when the callback result masked with 6 differs from 2. A negative result calls $3020 and selects state 0 or, for a negative result, calls it again and selects state 2. VICE checked six forced cases in loads 6, 19 and 28 with callbacks stubbed. Ordinary-play reachability remains open.

The type-$0A frame helper at $A743 increments $1B06,X, resetting it for values at least 3, and uses twice that value plus a direction-dependent offset and $19E5,X to set $19C3,X. VICE checked four forced cases in loads 6, 19 and 28. Ordinary-play reachability remains open.

Type-$0A state 2 calls its event helper and, after a delay, updates $1AF5,X and either selects state 0 or calls the frame helper and a direction-selected callback. Negative $1AF5,X values below $8C increment before returning to the frame update; values at least $8C remain unchanged. VICE checked eight forced cases in loads 6, 19 and 28 with callbacks stubbed. Ordinary-play reachability remains open.

The type-$17 handler at $A910 updates a timer and position and can allocate a type-$2C slot when its decremented timer is $FC. That timer resets to 20 even when the active-slot check skips allocation. Its event helper can call $4B0E and jump to $5DB9. VICE checked six handler cases and five event cases in loads 19, 24 and 28 with callbacks stubbed. Callback effects and ordinary-play reachability remain open.

The type-$2C handler at $A9C3 initializes parameters when $1B28,X is zero, or updates a position and frame before returning or jumping to $4454 when it is nonzero. Type-$17 can initialize a type-$2C slot. VICE checked six forced cases in loads 19, 24 and 28 with callbacks stubbed and cleanup paths stopped at $4454. Callback effects, indexed-value bounds and ordinary-play reachability remain open.

A forced $717C call copied all 2,048 bytes from the entry character source to RAM at $D000–$D7FF. The selected bytes matched the captured play snapshot, and a 200-frame play capture recorded no instruction entry into those selected ranges. 158 eight-byte characters before the nearest discovered code entry or update pointer were described from their row patterns; whether each is displayed and other possible code uses remain open.

The captured 48 low and high entity-handler bytes at $7EDF–$7F3E pair into 38 distinct addresses. The listing test runs the instructions from $2027 up to the call at $2036 for every index in this load. VICE checked indices 0, 1 and 47 in loads 2, 24 and 31 before the call. The code does not locally bound the index, and individual target reachability remains open.

The 42 captured bytes at $7F58–$7F81 supply sound pointers, reward and item values, map replacements, sampled-map comparisons and a visual-resource selector. The listing test checks the bytes and exercises the sound-pointer and visual-selector reads for this load; VICE checked those reads in loads 2, 24 and 31. Other fields are tied to their documented resident readers; their ordinary-play reachability remains open.

The captured bytes at $7F43–$7F49 supply initial colour shadows, player frame and position; $7F4D/$7F4E supply view-origin values that later code can change. A listing test checks their initialization paths for this load. VICE checked both paths in loads 2, 24 and 31 with the HUD callback stubbed. Ordinary-play reachability remains open.

13 stable 63-byte ranges match shapes verified in other loads and lie at VIC bank-3 sprite-slot boundaries. VICE read the entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares each range with its source shape and the graphics gallery. Display use in this load and other possible code uses remain open.

7 stable 63-byte aligned ranges form one-bit patterns that recur in other loads. VICE checked their entry bytes and observed no instruction entry into those ranges during a 200-frame play capture. The listing test compares every matching range and the viewer. Display use, actual colours and other possible code uses remain open.

Controlled visual-resource selections copied 114 additional eight-byte character patterns from their captured sources. VICE checked each copy and recorded no instruction entry into the selected bytes during 200 frames of captured play; a listing test repeats the copies. Display use, other possible code uses and ordinary-play reachability remain open.

A forced call to the price formatter at $9F09 and digit writer at $9EEE converts packed price bytes into four character and colour cells. VICE and a listing test check both calls in this load. Input bounds, other values and ordinary-play reachability remain open.

Shop helpers at $9EB1 and $9EC4 test sampled input and choose a cursor position. Five forced VICE cases and a listing test checked both helpers in this load, with the sampler stubbed and display initialization stopped. The adjacent layout, selection, timeout and item bytes are read or written by the separately tested shop paths. Physical control mapping, other indexes and ordinary-play reachability remain open.

The shop conditional-item resolver at $9E9C changes item $13 to $14 when the selected player has flag $10; other inputs pass through. Three forced VICE cases and a listing test check it in this load. Other callers and ordinary-play reachability remain open.

The captured shop message bank contains the same 34 records as the decoded first-load bank. VICE matched the complete message bytes in this load; listing tests check all record hashes and decode the first-load fields. Selection of each record in ordinary play and other overlapping uses remain open.

The captured split row-pointer tables contain 81 pairs. All follow a 122-byte stride from $8671; the first 16 correspond to the map rows described here. VICE compared the remaining table bytes to the entry snapshot, and `test_later_row_pointer_tails.js` checks all pairs. Whether gameplay uses the extra entries and the uses of their targets remain open.

This load has 1 captured motion-reader entry and encoded streams documented in `later-motion-streams.json`. Forced VICE calls checked each first value and reset; the listing test checks full decoded sequences. Ordinary-play reachability remains open.

The object record at $9611 contains message callback $9653, which supplies $965A to $77E0. A forced VICE call and `test_later_object_messages.js` check the pointer sequence with intermediate display calls stubbed. Display effects and ordinary-play reachability remain open.

The shop entry at $9B9D configures two screen-page bytes, formats two stage prices and branches on the selected player’s balance and stage category. Five forced VICE cases and `test_later_shop_entries.js` check formatting, insufficient and sufficient balance, and message selection with display and gate callbacks stubbed. Some bytes also occur in captured character or graphics sources; ordinary-play contexts remain open.

The shop choice code at $9C30 branches on incoming negative and zero flags, selects one of two stage prices, can reject insufficient balance, and follows either a stage callback or a message path before passing 4 or 8 to the meter routine and decrementing the stage field. Six forced VICE cases and `test_later_shop_choices.js` check these paths with payment, meter, message and optional callbacks stubbed. Ordinary-play flag inputs, callback effects and the separate entry at $9CB7 remain open.

The second shop entry at $9CC3 selects an item pair from explicit stage fields through the conditional-item resolver, or from a patched player-state read plus a table value. Four forced VICE cases and `test_later_shop_pairs.js` check both paths and both selected players using the real resolver. Index bounds, carry edge cases and later drawing remain open.

The shop drawing setup at $9D11 selects two pointer-table entries, calls the second and first item targets with A=$E4 and $D0, and fills three rows of colour RAM. Two forced VICE cases and `test_later_shop_draw_setup.js` check the target selection and colour writes with both item targets replaced by stubs. The actual drawing effects, index bounds and ordinary-play contexts remain open.
